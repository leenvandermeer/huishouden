import assert from "node:assert/strict";
import test from "node:test";
import { buildAccountBalanceHistory } from "../src/modules/finance/account-balance-history";

test("saldoverloop gebruikt import- en handmatige peilpunten als ankers", () => {
  const rows = buildAccountBalanceHistory(
    [
      { date: "2026-01-10", amount: 100 },
      { date: "2026-02-05", amount: -40 },
      { date: "2026-02-20", amount: 10 },
      { date: "2026-03-10", amount: -25 },
    ],
    [
      { date: "2026-01-31", balance: 1100, source: "import" },
      { date: "2026-02-15", balance: 1060, source: "manual" },
    ],
    1045,
  );

  assert.deepEqual(rows.map((row) => row.estimatedBalance), [1100, 1070, 1045]);
  assert.equal(rows[0]?.observationSource, "import");
  assert.equal(rows[1]?.observationSource, "manual");
});

test("maanden voor het eerste peilpunt worden vanaf dat peilpunt teruggerekend", () => {
  const rows = buildAccountBalanceHistory(
    [{ date: "2026-01-10", amount: 100 }, { date: "2026-02-05", amount: -40 }],
    [{ date: "2026-02-28", balance: 1060, source: "import" }],
    1060,
  );

  assert.deepEqual(rows.map((row) => row.estimatedBalance), [1100, 1060]);
});
