import assert from "node:assert/strict";
import test from "node:test";
import { detectBankFormat, parseBankFile, parseCamt053, parseMt940 } from "../src/modules/finance/bank-import-camt";

test("CAMT.053 wordt server-side herkend en gelezen", () => {
  const xml = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt><Acct><Id><IBAN>NL01TEST0123456789</IBAN></Id><Nm>Betaalrekening</Nm></Acct><Bal><Amt Ccy="EUR">125.50</Amt><Dt><Dt>2026-09-23</Dt></Dt></Bal><Ntry><Amt Ccy="EUR">12.34</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-09-22</Dt></BookgDt><AcctSvcrSeq>7</AcctSvcrSeq><NtryDtls><TxDtls><RltdPties><Cdtr><Nm>Supermarkt</Nm></Cdtr><CdtrAcct><Id><IBAN>NL02TEST9876543210</IBAN></Id></CdtrAcct></RltdPties><RmtInf><Ustrd>Boodschappen</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>`;
  assert.equal(detectBankFormat(xml), "camt053");
  const result = parseCamt053(xml, "statement.xml");
  assert.equal(result?.accounts[0]?.balance, 125.5);
  assert.equal(result?.transactions[0]?.amount, -12.34);
  assert.equal(result?.transactions[0]?.counterparty, "Supermarkt");
  assert.equal(result?.transactions[0]?.description, "Boodschappen");
});

test("MT940 inclusief :62F: eindsaldo wordt gelezen", () => {
  const mt940 = `:20:START\n:25:NL01TEST0123456789\n:61:260922D12,34NTRF//NL02TEST9876543210\n:86:Supermarkt\n:62F:C260923125,50`;
  assert.equal(detectBankFormat(mt940), "mt940");
  const result = parseMt940(mt940, "statement.sta");
  assert.equal(result?.accounts[0]?.balance, 125.5);
  assert.equal(result?.transactions[0]?.amount, -12.34);
  assert.equal(result?.transactions[0]?.counterparty, "Supermarkt");
});

test("de gedeelde importflow kiest CAMT en MT940 zonder CSV-instellingen", () => {
  const mt940 = Buffer.from(`:20:START\n:25:NL01TEST0123456789\n:61:260922C10,00NTRF//NL02TEST9876543210\n:86:Teruggave\n:62F:C260923135,50`);
  const result = parseBankFile(mt940, { filename: "bankafschrift.sta" });
  assert.equal(result?.importInfo?.sourceBank, "MT940");
  assert.equal(result?.transactions.length, 1);
});
