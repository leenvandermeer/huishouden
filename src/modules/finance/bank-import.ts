import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { defaultCategories } from "./default-categories";
import type { Account, Category, Transaction, TransactionKind } from "./types";

export interface FinanceDataset {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  importInfo?: {
    filename: string;
    fileHash: string;
    transactionCount: number;
    accountCount: number;
    sourceBank?: string;
  };
}

interface BankImportOptions {
  filename: string;
  accountIdentifier?: string;
  accountName?: string;
  accountType?: Account["type"];
  sourceBank?: string;
  columnMapping?: Partial<Record<ImportField, string>>;
}

export type ImportField = "account" | "date" | "amount" | "balance" | "counterAccount" | "counterparty" | "description" | "sequence";

export interface CsvInspection {
  filename: string;
  headers: string[];
  detectedMapping: Partial<Record<ImportField, string>>;
  requiresMapping: boolean;
  sampleRows: string[][];
}

interface NormalizedRow {
  account: string;
  date: string;
  sequence: string;
  counterAccount: string;
  counterparty: string;
  description: string;
  amount: number;
  balance?: number;
}

type TransactionDraft = Transaction & {
  candidateInternalTransfer: boolean;
  ownIban: string;
  counterAccount: string;
};

const rabobankHeaders = [
  "IBAN/BBAN",
  "Munt",
  "BIC",
  "Volgnr",
  "Datum",
  "Rentedatum",
  "Bedrag",
  "Saldo na trn",
  "Tegenrekening IBAN/BBAN",
  "Naam tegenpartij",
  "Omschrijving-1",
  "Omschrijving-2",
  "Omschrijving-3",
];

const genericColumns = {
  account: ["iban/bban", "iban", "account", "account iban", "rekening", "rekeningnummer", "account number", "nr v/d rekening"],
  date: ["datum", "date", "booked_at", "booking date", "transactiedatum", "transaction date", "boekhdk. datum"],
  sequence: ["volgnr", "sequence", "id", "transaction id", "transactie id", "referentie", "nr v/d verrichting", "ref. v/d verrichting"],
  amount: ["bedrag", "amount", "mutatie", "waarde", "transaction amount", "bedrag v/d verrichting"],
  balance: ["saldo na trn", "balance", "saldo", "balance after transaction"],
  counterAccount: ["tegenrekening iban/bban", "tegenrekening", "counter account", "counter iban", "rekening tegenpartij"],
  counterparty: ["naam tegenpartij", "naam v/d tegenpartij", "tegenpartij", "counterparty", "name", "naam", "payee", "payer"],
  description: ["omschrijving", "description", "beschrijving", "mededeling", "mededeling 1", "details", "memo", "omschrijving-1"],
};

const categoryRules: Array<{ categoryId: string; kind: TransactionKind; patterns: string[] }> = [
  { categoryId: "salaris", kind: "inkomen", patterns: ["salaris", "loon", "werkgever"] },
  { categoryId: "boodschappen", kind: "variabele_uitgave", patterns: ["albert heijn", "ah ", "jumbo", "lidl", "aldi", "plus ", "picnic"] },
  { categoryId: "energie", kind: "vaste_last", patterns: ["vattenfall", "eneco", "essent", "greenchoice", "energie"] },
  { categoryId: "wonen", kind: "vaste_last", patterns: ["hypotheek", "huur", "vve", "woon"] },
  { categoryId: "verzekeringen", kind: "vaste_last", patterns: ["verzekering", "zorgverzekeraar", "interpolis", "a.s.r", "centraal beheer"] },
  { categoryId: "bankkosten", kind: "vaste_last", patterns: ["rabo standaard", "rabo comfort", "rabo totaalpakket", "rabo directpakket", "betaalpas", "wereldpas", "kaartnummer", "bankkosten"] },
  { categoryId: "parkeren", kind: "variabele_uitgave", patterns: ["q-park", "parkeren"] },
  { categoryId: "vervoer", kind: "variabele_uitgave", patterns: ["shell", "bp ", "esso", "tank", "ns ", "ovpay"] },
  { categoryId: "vakantie", kind: "reservering", patterns: ["vakantie"] },
  { categoryId: "sparen", kind: "reservering", patterns: ["spaar", "reservering"] },
];

export function loadBankCsv(path: string): FinanceDataset | undefined {
  if (!existsSync(path)) return undefined;
  return parseBankCsv(readFileSync(path), { filename: basename(path) });
}

export function loadRabobankCsv(path: string): FinanceDataset | undefined {
  return loadBankCsv(path);
}

export function parseBankCsv(buffer: Buffer, options: BankImportOptions): FinanceDataset | undefined {
  const text = decodeCsvBuffer(buffer);
  const document = parseCsvDocument(text);
  if (!document) return undefined;

  const { headers, dataRows, accountIdentifier } = document;
  const sourceBank = options.sourceBank?.trim() || detectSourceBank(headers, options.filename, accountIdentifier);
  const normalizedRows = dataRows
    .map((row, index) => normalizeRow(headers, row, index, options, accountIdentifier))
    .filter((row) => row.account && row.date);
  if (!normalizedRows.length) {
    throw new Error("Geen herkenbare transacties gevonden. Gebruik minimaal kolommen voor datum, bedrag, rekening en omschrijving.");
  }

  const ownAccounts = new Set(normalizedRows.map((row) => row.account));
  const latestBalanceByAccount = new Map<string, { balance: number; date: string; sequence: string }>();

  const transactionDrafts: TransactionDraft[] = normalizedRows.map((row) => {
    const candidateInternalTransfer = ownAccounts.has(row.counterAccount);
    const category = inferCategory(row.counterparty, row.description, row.amount);
    const hashInput = [
      row.account,
      row.sequence,
      row.date,
      row.amount.toFixed(2),
      row.counterAccount,
      row.counterparty,
      row.description,
    ].join("|");

    const currentLatest = latestBalanceByAccount.get(row.account);
    if (row.balance !== undefined && (!currentLatest || `${row.date}-${row.sequence}` > `${currentLatest.date}-${currentLatest.sequence}`)) {
      latestBalanceByAccount.set(row.account, { balance: row.balance, date: row.date, sequence: row.sequence });
    }

    return {
      id: stableId("txn", hashInput),
      date: row.date,
      accountId: stableId("acct", row.account),
      counterparty: row.counterparty,
      counterAccount: row.counterAccount,
      description: row.description,
      amount: row.amount,
      categoryId: category.categoryId,
      kind: category.kind,
      internalTransferGroup: undefined,
      ruleApplied: category.ruleApplied,
      candidateInternalTransfer,
      ownIban: row.account,
    };
  });

  reconcileDraftTransfers(transactionDrafts);
  const transactions: Transaction[] = transactionDrafts.map(({ candidateInternalTransfer, ownIban, ...transaction }) => transaction);
  const accounts: Account[] = Array.from(ownAccounts).map((account) => {
    const importedBalance = latestBalanceByAccount.get(account);
    const nibcRows = sourceBank === "NIBC" ? normalizedRows.filter((row) => row.account === account) : [];
    const inferredNibcBalance = !importedBalance && nibcRows.length
      ? {
          balance: Math.round(nibcRows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100,
          date: nibcRows.reduce((latest, row) => row.date > latest ? row.date : latest, nibcRows[0].date),
        }
      : undefined;
    const balancePoint = importedBalance ?? inferredNibcBalance;
    const displayAccount = looksLikeIban(account) ? formatIban(account) : account;
    const accountLabel = ownAccounts.size === 1 && options.accountName?.trim() ? options.accountName.trim() : defaultAccountLabel(account, sourceBank);
    return {
      id: stableId("acct", account),
      name: accountLabel,
      iban: displayAccount,
      bank: sourceBank,
      type: options.accountType ?? inferAccountType(account),
      balance: balancePoint?.balance ?? 0,
      balanceDate: balancePoint?.date,
      ownAccount: true,
      excluded_from_import: false,
      lastImportAt: new Date().toISOString(),
    };
  });

  return {
    accounts,
    categories: defaultCategories,
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    importInfo: {
      filename: options.filename,
      fileHash: sha256(buffer),
      transactionCount: transactions.length,
      accountCount: accounts.length,
      sourceBank,
    },
  };
}

export function inspectBankCsv(buffer: Buffer, filename: string): CsvInspection | undefined {
  const document = parseCsvDocument(decodeCsvBuffer(buffer));
  if (!document) return undefined;
  const { headers, dataRows, accountIdentifier } = document;
  const detectedMapping = detectColumnMapping(headers);
  return {
    filename,
    headers,
    detectedMapping,
    requiresMapping: !isRabobankFormat(headers) && (!(detectedMapping.account || accountIdentifier) || !detectedMapping.date || !detectedMapping.amount),
    sampleRows: dataRows.slice(0, 3),
  };
}

function normalizeRow(headers: string[], row: string[], rowIndex: number, options: BankImportOptions, documentAccount?: string): NormalizedRow {
  if (isRabobankFormat(headers)) return normalizeRabobankRow(headers, row);
  if (isNibcFormat(headers)) return normalizeNibcRow(headers, row, options.accountIdentifier || documentAccount || "");

  const account = normalizeAccount(findMappedValue(headers, row, "account", options) || options.accountIdentifier || documentAccount || "");
  const counterAccount = normalizeAccount(findMappedValue(headers, row, "counterAccount", options));
  const counterparty = findMappedValue(headers, row, "counterparty", options) || counterAccount || "Onbekend";
  const description = findMappedValue(headers, row, "description", options) || counterparty;

  return {
    account,
    date: normalizeDate(findMappedValue(headers, row, "date", options)),
    sequence: findMappedValue(headers, row, "sequence", options) || String(rowIndex + 1),
    counterAccount,
    counterparty,
    description,
    amount: parseAmount(findMappedValue(headers, row, "amount", options)),
    balance: parseOptionalAmount(findMappedValue(headers, row, "balance", options)),
  };
}

function normalizeNibcRow(headers: string[], row: string[], accountIdentifier: string): NormalizedRow {
  const value = (header: string) => findValue(headers, row, [header]);
  const counterAccount = normalizeAccount(value("Rekening tegenpartij"));
  const counterparty = value("Naam v/d tegenpartij") || counterAccount || "Onbekend";
  const description = [value("Beschrijving"), value("Mededeling 1"), value("Mededeling 2")]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ") || counterparty;

  return {
    account: normalizeAccount(accountIdentifier),
    date: normalizeDate(value("Boekhdk. datum")),
    sequence: value("Ref. v/d verrichting") || value("Nr v/d verrichting"),
    counterAccount,
    counterparty,
    description,
    amount: parseAmount(value("Bedrag v/d verrichting")),
  };
}

function normalizeRabobankRow(headers: string[], row: string[]): NormalizedRow {
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
  const account = normalizeAccount(get(row, headerIndex, "IBAN/BBAN"));
  const counterAccount = normalizeAccount(get(row, headerIndex, "Tegenrekening IBAN/BBAN"));
  const counterparty = get(row, headerIndex, "Naam tegenpartij") || counterAccount || "Onbekend";
  const description = [
    get(row, headerIndex, "Omschrijving-1"),
    get(row, headerIndex, "Omschrijving-2"),
    get(row, headerIndex, "Omschrijving-3"),
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ") || counterparty;

  return {
    account,
    date: normalizeDate(get(row, headerIndex, "Datum")),
    sequence: get(row, headerIndex, "Volgnr"),
    counterAccount,
    counterparty,
    description,
    amount: parseAmount(get(row, headerIndex, "Bedrag")),
    balance: parseOptionalAmount(get(row, headerIndex, "Saldo na trn")),
  };
}

function reconcileDraftTransfers(transactionDrafts: TransactionDraft[]) {
  const transferGroups = new Map<string, TransactionDraft[]>();
  for (const transaction of transactionDrafts) {
    if (!transaction.candidateInternalTransfer) continue;
    const groupId = stableId("int", [transaction.date, Math.abs(transaction.amount).toFixed(2), [transaction.ownIban, transaction.counterAccount].sort().join("-")].join("|"));
    transferGroups.set(groupId, [...(transferGroups.get(groupId) ?? []), transaction]);
  }

  for (const [groupId, group] of transferGroups) {
    const total = group.reduce((sum, transaction) => sum + transaction.amount, 0);
    const accountCount = new Set(group.map((transaction) => transaction.accountId)).size;
    if (group.length === 2 && accountCount === 2 && Math.abs(total) < 0.005) {
      for (const transaction of group) {
        transaction.internalTransferGroup = groupId;
        classifyOwnAccountTransfer(transaction);
      }
    }
  }
}

function isRabobankFormat(headers: string[]) {
  return rabobankHeaders.every((header) => headers.includes(header));
}

function isNibcFormat(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  return normalized.includes(normalizeHeader("Nr v/d verrichting"))
    && normalized.includes(normalizeHeader("Boekhdk. datum"))
    && normalized.includes(normalizeHeader("Bedrag v/d verrichting"));
}

function detectSourceBank(headers: string[], filename: string, accountIdentifier?: string) {
  if (isRabobankFormat(headers) || /rabo/i.test(filename)) return "Rabobank";
  if (isNibcFormat(headers) || /nibc/i.test(filename) || /DNIB/i.test(accountIdentifier ?? "")) return "NIBC";
  return "Bank";
}

function findValue(headers: string[], row: string[], candidates: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const index = candidates.map(normalizeHeader).map((candidate) => normalizedHeaders.indexOf(candidate)).find((candidateIndex) => candidateIndex >= 0);
  return index === undefined ? "" : row[index] ?? "";
}

function findMappedValue(headers: string[], row: string[], field: ImportField, options: BankImportOptions) {
  const mappedHeader = options.columnMapping?.[field];
  if (mappedHeader) {
    const index = headers.map(normalizeHeader).indexOf(normalizeHeader(mappedHeader));
    if (index >= 0) return row[index] ?? "";
  }
  return findValue(headers, row, genericColumns[field]);
}

function detectColumnMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const mapping: Partial<Record<ImportField, string>> = {};
  for (const field of Object.keys(genericColumns) as ImportField[]) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const index = genericColumns[field].map(normalizeHeader).map((candidate) => normalizedHeaders.indexOf(candidate)).find((candidateIndex) => candidateIndex >= 0);
    if (index !== undefined) mapping[field] = headers[index];
  }
  return mapping;
}

function inferCategory(counterparty: string, description: string, amount: number): { categoryId?: string; kind: TransactionKind; ruleApplied?: string } {
  const haystack = `${counterparty} ${description}`.toLowerCase();
  const rule = categoryRules.find((candidate) => candidate.patterns.some((pattern) => haystack.includes(pattern)));
  if (rule) {
    return { categoryId: rule.categoryId, kind: rule.kind, ruleApplied: `${rule.patterns[0].toUpperCase()} -> ${rule.categoryId}` };
  }
  if (amount > 0) return { kind: "inkomen" };
  return { kind: "variabele_uitgave" };
}

function knownSavingsAccounts() {
  const configured = process.env.RABOBANK_SAVINGS_IBANS?.trim() || "";
  return new Set(configured.split(":").map(normalizeAccount).filter(Boolean));
}

function defaultAccountLabel(account: string, sourceBank: string) {
  const normalized = normalizeAccount(account);
  if (knownSavingsAccounts().has(normalized)) return `Spaarrekening ${account.slice(-4)}`;
  return `${sourceBank} ${account.slice(-4)}`;
}

function inferAccountType(account: string) {
  if (/^[A-Z]{2}\d{2}DNIB/.test(normalizeAccount(account))) return "spaarrekening";
  if (knownSavingsAccounts().has(normalizeAccount(account))) return "spaarrekening";
  return "betaalrekening";
}

function classifyOwnAccountTransfer(transaction: TransactionDraft) {
  const ownType = inferAccountType(transaction.ownIban);
  const counterType = inferAccountType(transaction.counterAccount);

  if (ownType === "betaalrekening" && counterType === "spaarrekening") {
    if (transaction.amount < 0) {
      transaction.categoryId = "sparen";
      transaction.kind = "reservering";
      transaction.ruleApplied = "Sparen naar eigen spaarrekening";
      return;
    }
    transaction.categoryId = "potje-opname";
    transaction.kind = "interne_overboeking";
    transaction.ruleApplied = "Uit spaarrekening";
    return;
  }

  transaction.categoryId = "intern";
  transaction.kind = "interne_overboeking";
  transaction.ruleApplied = ownType === "spaarrekening" && counterType === "betaalrekening"
    ? "Spaarrekeningzijde van sparen"
    : "Kruispost tussen eigen rekeningen";
}

function parseCsv(text: string) {
  const delimiter = detectDelimiter(text);
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => parseCsvLine(line, delimiter));
}

function parseCsvDocument(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) return undefined;
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map((header) => header.trim());
    const mapping = detectColumnMapping(headers);
    return isRabobankFormat(headers) || Boolean(mapping.date && mapping.amount && (mapping.account || mapping.sequence || mapping.description));
  });
  if (headerIndex < 0) return undefined;

  const preamble = rows.slice(0, headerIndex);
  const accountRow = preamble.find((row) => normalizeHeader(row[0] ?? "").replace(/\s*:\s*$/, "") === "nr v/d rekening");
  const accountIdentifier = accountRow?.slice(1).find((value) => value.trim())?.trim();
  return {
    headers: rows[headerIndex].map((header) => header.trim()),
    dataRows: rows.slice(headerIndex + 1).filter((row) => row.some((value) => value.trim().length > 0)),
    accountIdentifier,
  };
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"" && line[index + 1] === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  return firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
}

function get(row: string[], headerIndex: Record<string, number>, header: string) {
  return row[headerIndex[header]] ?? "";
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s*:\s*$/, "").replace(/\s+/g, " ");
}

function normalizeAccount(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

function looksLikeIban(value: string) {
  return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(value);
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dutch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dutch) return `${dutch[3]}-${dutch[2].padStart(2, "0")}-${dutch[1].padStart(2, "0")}`;
  return trimmed;
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\+/g, "").replace(/\s/g, "");
  const withoutThousands = normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, "");
  const parsed = Number.parseFloat(withoutThousands);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function parseOptionalAmount(value: string) {
  if (!value.trim()) return undefined;
  return parseAmount(value);
}

function decodeCsvBuffer(buffer: Buffer) {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD")) return utf8;
  return buffer.toString("latin1");
}

function stableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
