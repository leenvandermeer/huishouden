import assert from "node:assert/strict";
import test from "node:test";
import { inspectBankCsv, parseBankCsv } from "../src/modules/finance/bank-import";

const nibcCsv = Buffer.from([
  "Nr v/d rekening :;NL00 DNIB 0000 0000 00;",
  "Nr v/d verrichting;Boekhdk. datum;Beschrijving;Bedrag v/d verrichting;Munt;Valutadatum;Rekening tegenpartij;Naam v/d tegenpartij :;Mededeling 1 :;Mededeling 2 :;Ref. v/d verrichting",
  "0000001;30-01-2025;Inkomende overboeking;1.000,00;EUR;30-01-2025;NL00 TEST 0000 0000 01;Testpersoon;Sparen; ;TEST-TRANSFER-001",
  "0000002;31-01-2025;Renteuitkering;12,34;EUR;31-01-2025;NL00 DNIB 0000 0000 00; ;Jaarlijkse rente; ;TEST-INTEREST-002",
].join("\n"));

test("NIBC CSV gebruikt rekeningmetadata boven de echte kolomkoppen", () => {
  const inspection = inspectBankCsv(nibcCsv, "Overview.CSV");
  assert.ok(inspection);
  assert.equal(inspection.requiresMapping, false);
  assert.equal(inspection.headers[0], "Nr v/d verrichting");

  const parsed = parseBankCsv(nibcCsv, { filename: "Overview.CSV" });
  assert.ok(parsed);
  assert.equal(parsed.importInfo?.sourceBank, "NIBC");
  assert.equal(parsed.accounts.length, 1);
  assert.equal(parsed.accounts[0].iban, "NL00 DNIB 0000 0000 00");
  assert.equal(parsed.accounts[0].type, "spaarrekening");
  assert.equal(parsed.accounts[0].balance, 1012.34);
  assert.equal(parsed.accounts[0].balanceDate, "2025-01-31");
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.transactions[0].date, "2025-01-31");
  assert.equal(parsed.transactions[0].amount, 12.34);
  assert.equal(parsed.transactions[1].amount, 1000);
  assert.match(parsed.transactions[1].description, /Inkomende overboeking · Sparen/);
});

test("spaarrekeningherkenning gebruikt uitsluitend de eigen omgevingsconfiguratie", () => {
  const previous = process.env.RABOBANK_SAVINGS_IBANS;
  const csv = Buffer.from(nibcCsv.toString().replaceAll("NL00 DNIB 0000 0000 00", "NL00 TEST 0000 0000 00"));
  try {
    delete process.env.RABOBANK_SAVINGS_IBANS;
    const unconfigured = parseBankCsv(csv, { filename: "test.csv" });
    assert.equal(unconfigured?.accounts[0].type, "betaalrekening");
    process.env.RABOBANK_SAVINGS_IBANS = "NL00TEST0000000000";
    const configured = parseBankCsv(csv, { filename: "test.csv" });
    assert.equal(configured?.accounts[0].type, "spaarrekening");
  } finally {
    if (previous === undefined) delete process.env.RABOBANK_SAVINGS_IBANS;
    else process.env.RABOBANK_SAVINGS_IBANS = previous;
  }
});
