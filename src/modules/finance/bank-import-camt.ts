import { parseBankCsv, type FinanceDataset, type ImportField } from "./bank-import";

export interface BankFileOptions {
  filename: string;
  accountIdentifier?: string;
  accountName?: string;
  accountType?: "betaalrekening" | "spaarrekening" | "beleggingsrekening" | "schuld";
  sourceBank?: string;
  columnMapping?: Partial<Record<ImportField, string>>;
}

export function parseBankFile(buffer: Buffer, options: BankFileOptions): FinanceDataset | undefined {
  const content = buffer.toString("utf-8");
  const format = detectBankFormat(content);
  if (format === "camt053") return parseCamt053(content, options.filename);
  if (format === "mt940") return parseMt940(content, options.filename);
  return parseBankCsv(buffer, options);
}

/**
 * Parse CAMT.053 (ISO 20022) XML bank statement.
 * Common format for Rabobank, ING, ABN AMRO exports.
 */
export function parseCamt053(xml: string, filename: string): FinanceDataset | undefined {
  if (!/<(?:\w+:)?Stmt[\s>]/i.test(xml)) return undefined;
  const stmts = xml.match(/<(?:\w+:)?Stmt\b[^>]*>[\s\S]*?<\/(?:\w+:)?Stmt>/gi) ?? [];

  const accounts: Map<string, { name: string; iban: string; balance: number; balanceDate: string }> = new Map();
  const transactions: Array<{ date: string; amount: number; counterparty: string; counterAccount: string; description: string; iban: string; sequence: string; balance?: number }> = [];

  for (const stmt of stmts) {
    const account = xmlBlock(stmt, "Acct") ?? "";
    const iban = xmlText(xmlBlock(account, "Id") ?? account, "IBAN") ?? xmlText(account, "Id") ?? "";
    const stmtName = xmlText(account, "Nm") ?? iban;
    const balance = xmlBlock(stmt, "Bal") ?? "";
    const balAmt = xmlText(balance, "Amt");
    const balDate = xmlText(balance, "Dt");

    if (iban && balAmt) {
      accounts.set(iban, {
        name: stmtName || iban,
        iban,
        balance: parseAmount(balAmt),
        balanceDate: balDate ?? new Date().toISOString().slice(0, 10),
      });
    }

    const entries = stmt.match(/<(?:\w+:)?Ntry\b[^>]*>[\s\S]*?<\/(?:\w+:)?Ntry>/gi) ?? [];
    for (const entry of entries) {
      const amtTag = entry.match(/<(?:\w+:)?Amt\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?Amt>/i);
      const amt = amtTag ? decodeXml(amtTag[2]).trim() : undefined;
      const ccy = amtTag?.[1].match(/Ccy=["']([^"']+)["']/i)?.[1] ?? "EUR";
      if (!amt || ccy !== "EUR") continue;

      const creditDebit = xmlText(entry, "CdtDbtInd");
      const amount = parseAmount(amt);
      const signedAmount = creditDebit === "CRDT" ? amount : -amount;

      const dateStr = xmlText(xmlBlock(entry, "BookgDt") ?? "", "Dt") ?? xmlText(xmlBlock(entry, "ValDt") ?? "", "Dt") ?? "";
      const entryBal = xmlText(xmlBlock(entry, "AcctSvcrBal") ?? "", "Amt");
      const txDtls = xmlBlock(xmlBlock(entry, "NtryDtls") ?? entry, "TxDtls") ?? "";
      const relatedParties = xmlBlock(txDtls, "RltdPties") ?? "";
      const counterparty = xmlText(xmlBlock(relatedParties, "Dbtr") ?? "", "Nm") ?? xmlText(xmlBlock(relatedParties, "Cdtr") ?? "", "Nm") ?? "";
      const counterAccount = xmlText(xmlBlock(relatedParties, "DbtrAcct") ?? "", "IBAN") ?? xmlText(xmlBlock(relatedParties, "CdtrAcct") ?? "", "IBAN") ?? "";
      const description = xmlText(txDtls, "AddtlNtryInf") ?? xmlText(xmlBlock(txDtls, "RmtInf") ?? "", "Ustrd") ?? "";
      const sequence = xmlText(entry, "AcctSvcrSeq") ?? String(transactions.length);

      transactions.push({
        date: dateStr,
        amount: signedAmount,
        counterparty,
        counterAccount,
        description,
        iban,
        sequence,
        balance: entryBal ? parseAmount(entryBal) : undefined,
      });
    }
  }

  if (!transactions.length) return undefined;

  return {
    accounts: Array.from(accounts.values()).map((a) => ({
      id: `acct_${hashString(a.iban)}`,
      name: a.name,
      iban: formatIbanDisplay(a.iban),
      bank: "Bank",
      type: "betaalrekening" as const,
      balance: a.balance,
      balanceDate: a.balanceDate,
      ownAccount: true,
      excluded_from_import: false,
      lastImportAt: new Date().toISOString(),
    })),
    categories: [],
    transactions: transactions.map((t) => ({
      id: `txn_${hashString(`${t.iban}|${t.date}|${t.amount.toFixed(2)}|${t.counterAccount}|${t.sequence}`)}`,
      date: t.date,
      accountId: `acct_${hashString(t.iban)}`,
      counterparty: t.counterparty,
      counterAccount: t.counterAccount,
      description: t.description,
      amount: t.amount,
      categoryId: "",
      kind: "variabele_uitgave" as const,
      internalTransferGroup: undefined,
    })),
    importInfo: {
      filename,
      fileHash: hashString(xml),
      transactionCount: transactions.length,
      accountCount: accounts.size,
      sourceBank: "CAMT.053",
    },
  };
}

/**
 * Parse MT940 (SWIFT) bank statement.
 * Text-based format used by many European banks.
 */
export function parseMt940(text: string, filename: string): FinanceDataset | undefined {
  const lines = text.split(/\r?\n/);
  if (!lines.some((line) => line.startsWith(":20:") || line.startsWith(":25:"))) return undefined;

  const accounts: Map<string, { name: string; iban: string; balance: number; balanceDate: string }> = new Map();
  const transactions: Array<{ date: string; amount: number; counterparty: string; counterAccount: string; description: string; iban: string; sequence: string; balance?: number }> = [];

  let currentIban = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith(":25:")) {
      currentIban = line.slice(4).replace(/[^A-Z0-9]/g, "");
    }
    if (line.startsWith(":61:")) {
      const data = line.slice(4);
      const dateStr = data.slice(0, 6);
      const year = dateStr.slice(0, 2);
      const month = dateStr.slice(2, 4);
      const day = dateStr.slice(4, 6);
      const date = `20${year}-${month}-${day}`;

      const rest = data.slice(6);
      const amountMatch = rest.match(/([CD])(\d+[,.]?\d*)/);
      if (!amountMatch) continue;

      const sign = amountMatch[1] === "C" ? 1 : -1;
      const amount = sign * parseAmount(amountMatch[2]);

      const info = rest.slice(amountMatch[0].length).trim();
      const parts = info.split("//");
      const counterAccount = parts[0]?.replace(/[^A-Z0-9]/g, "") ?? "";
      const description = parts[1]?.trim() ?? "";

      const nextLine = lines[i + 1]?.trim();
      let counterparty = "";
      if (nextLine?.startsWith(":86:")) {
        counterparty = nextLine.slice(4).trim();
      }

      transactions.push({
        date,
        amount,
        counterparty,
        counterAccount: counterAccount.length > 10 ? counterAccount : "",
        description,
        iban: currentIban,
        sequence: String(transactions.length),
      });
    }
    if (line.startsWith(":62:") || line.startsWith(":62F:") || line.startsWith(":62M:")) {
      const data = line.replace(/^:62[FM]?:/, "");
      const creditDebit = data.slice(0, 1);
      const dateStr = data.slice(1, 7);
      const year = dateStr.slice(0, 2);
      const month = dateStr.slice(2, 4);
      const day = dateStr.slice(4, 6);
      const date = `20${year}-${month}-${day}`;

      const amount = parseAmount(data.slice(7).replace(/^[A-Z]{3}/, ""));
      const balance = creditDebit === "C" ? amount : -amount;

      if (currentIban && !accounts.has(currentIban)) {
        accounts.set(currentIban, {
          name: currentIban,
          iban: currentIban,
          balance,
          balanceDate: date,
        });
      }
    }
  }

  if (!transactions.length) return undefined;

  return {
    accounts: Array.from(accounts.values()).map((a) => ({
      id: `acct_${hashString(a.iban)}`,
      name: a.name,
      iban: formatIbanDisplay(a.iban),
      bank: "Bank",
      type: "betaalrekening" as const,
      balance: a.balance,
      balanceDate: a.balanceDate,
      ownAccount: true,
      excluded_from_import: false,
      lastImportAt: new Date().toISOString(),
    })),
    categories: [],
    transactions: transactions.map((t) => ({
      id: `txn_${hashString(`${t.iban}|${t.date}|${t.amount.toFixed(2)}|${t.counterAccount}|${t.sequence}`)}`,
      date: t.date,
      accountId: `acct_${hashString(t.iban)}`,
      counterparty: t.counterparty,
      counterAccount: t.counterAccount,
      description: t.description,
      amount: t.amount,
      categoryId: "",
      kind: "variabele_uitgave" as const,
      internalTransferGroup: undefined,
    })),
    importInfo: {
      filename,
      fileHash: hashString(text),
      transactionCount: transactions.length,
      accountCount: accounts.size,
      sourceBank: "MT940",
    },
  };
}

/**
 * Detect if a file is CAMT.053 or MT940 based on content.
 */
export function detectBankFormat(content: string): "camt053" | "mt940" | undefined {
  const trimmed = content.trim();
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<Document") || trimmed.includes("camt.053")) return "camt053";
  if (trimmed.includes(":20:") && trimmed.includes(":61:")) return "mt940";
  return undefined;
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d,.\-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function xmlBlock(xml: string, tag: string) {
  return xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"))?.[1];
}

function xmlText(xml: string, tag: string) {
  const value = xmlBlock(xml, tag);
  return value == null ? undefined : decodeXml(value.replace(/<[^>]+>/g, "")).trim();
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function formatIbanDisplay(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
