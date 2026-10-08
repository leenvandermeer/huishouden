import assert from "node:assert/strict";
import test from "node:test";
import { inspectBankCsv, parseBankCsv } from "../src/modules/finance/bank-import";

const nibcCsv = Buffer.from([
  "Nr v/d rekening :;NL89 DNIB 2045 5405 45;",
  "Nr v/d verrichting;Boekhdk. datum;Beschrijving;Bedrag v/d verrichting;Munt;Valutadatum;Rekening tegenpartij;Naam v/d tegenpartij :;Mededeling 1 :;Mededeling 2 :;Ref. v/d verrichting",
  "0000001;30-01-2025;Inkomende overboeking;1.000,00;EUR;30-01-2025;NL60 RABO 0322 4813 92;L.J. van der Meer eo;Sparen; ;C5A30XM001000988",
  "0000002;31-01-2025;Renteuitkering;12,34;EUR;31-01-2025;NL89 DNIB 2045 5405 45; ;Jaarlijkse rente; ;C5A31IN0000A001A",
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
  assert.equal(parsed.accounts[0].iban, "NL89 DNIB 2045 5405 45");
  assert.equal(parsed.accounts[0].type, "spaarrekening");
  assert.equal(parsed.accounts[0].balance, 1012.34);
  assert.equal(parsed.accounts[0].balanceDate, "2025-01-31");
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.transactions[0].date, "2025-01-31");
  assert.equal(parsed.transactions[0].amount, 12.34);
  assert.equal(parsed.transactions[1].amount, 1000);
  assert.match(parsed.transactions[1].description, /Inkomende overboeking · Sparen/);
});
