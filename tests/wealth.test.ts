import assert from "node:assert/strict";
import test from "node:test";
import type { Account } from "../src/modules/finance/types";
import { buildWealthOverview } from "../src/modules/finance/wealth";
import { toWealthCsv } from "../src/modules/finance/csv-product-contract";

const accounts: Account[] = [
  account("pay", "Dagelijkse rekening", "betaalrekening", 500),
  account("save", "Buffer", "spaarrekening", 500),
  account("invest", "Indexfonds", "beleggingsrekening", 2500),
  account("debt", "Studieschuld", "schuld", -1000),
];

test("netto vermogen is exact herleidbaar tot alle rekeningstanden", () => {
  const wealth = buildWealthOverview({ accounts, asOf: "2026-09-21" });
  assert.equal(wealth.directAvailable, 500);
  assert.equal(wealth.reserved, 500);
  assert.equal(wealth.longTerm, 2500);
  assert.equal(wealth.debt, 1000);
  assert.equal(wealth.netWorth, 2500);
});

test("interne overboeking verschuift geld maar verandert totaalvermogen niet", () => {
  const wealth = buildWealthOverview({
    accounts: accounts.slice(0, 2),
    asOf: "2026-09-21",
    historyMonths: 2,
    monthlyMovements: [
      { month: "2026-09", accountId: "pay", amount: -500 },
      { month: "2026-09", accountId: "save", amount: 500 },
    ],
  });
  assert.deepEqual(wealth.history.map((row) => row.netWorth), [1000, 1000]);
  assert.equal(wealth.history[0].direct, 1000);
  assert.equal(wealth.history[0].reserved, 0);
  assert.equal(wealth.history[1].direct, 500);
  assert.equal(wealth.history[1].reserved, 500);
});

test("rekeningkwaliteit toont saldoverschil en ontbrekende periode", () => {
  const stale = { ...account("stale", "Oude rekening", "betaalrekening", 25), balanceDate: "2026-07-01", lastImportAt: "2026-07-01T09:00:00.000Z" };
  const wealth = buildWealthOverview({
    accounts: [stale, accounts[0]],
    asOf: "2026-09-21",
    evidenceByAccount: new Map([
      ["stale", { balanceDifference: 0, lastTransactionOn: "2026-07-01" }],
      ["pay", { balanceDifference: 12.34, lastTransactionOn: "2026-09-20" }],
    ]),
  });
  assert.equal(wealth.accounts.find((item) => item.id === "stale")?.quality.status, "stale");
  assert.equal(wealth.accounts.find((item) => item.id === "pay")?.quality.label, "Saldoverschil");
});

test("van import uitgesloten rekeningen doen nergens mee in het vermogensoverzicht", () => {
  const excluded = { ...account("excluded", "Rabobank 6537", "betaalrekening", 137.15), excluded_from_import: true };
  const wealth = buildWealthOverview({
    accounts: [accounts[0], excluded],
    asOf: "2026-09-21",
    historyMonths: 2,
    evidenceByAccount: new Map([["excluded", { balanceDifference: 137.15, lastTransactionOn: "2026-09-06" }]]),
    monthlyMovements: [{ month: "2026-09", accountId: "excluded", amount: 137.15 }],
  });

  assert.deepEqual(wealth.accounts.map((item) => item.id), ["pay"]);
  assert.equal(wealth.directAvailable, 500);
  assert.equal(wealth.assets, 500);
  assert.equal(wealth.netWorth, 500);
  assert.equal(wealth.attentionCount, 0);
  assert.deepEqual(wealth.history.map((row) => row.netWorth), [500, 500]);
  assert.doesNotMatch(toWealthCsv(wealth), /Rabobank 6537|137,15/);
});

test("Vermogen-CSV sluit exact aan op het schermmodel", () => {
  const wealth = buildWealthOverview({ accounts, asOf: "2026-09-21" });
  const csv = toWealthCsv(wealth, "2026-09-21T12:00:00.000Z");
  assert.match(csv, /"# report_type";"wealth_overview"/);
  assert.match(csv, /"summary";"Netto vermogen";2500/);
  assert.match(csv, /"Dagelijkse rekening";"Betaalrekening"/);
});

function account(id: string, name: string, type: Account["type"], balance: number): Account {
  return {
    id,
    name,
    iban: `NL00TEST${id.toUpperCase()}`,
    bank: "Testbank",
    type,
    balance,
    balanceDate: "2026-09-21",
    balanceSource: "manual",
    ownAccount: true,
    excluded_from_import: false,
    lastImportAt: "2026-09-21T08:00:00.000Z",
  };
}
