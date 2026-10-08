import assert from "node:assert/strict";
import test from "node:test";
import { inferRecurringIncomes } from "../src/modules/finance/repository";

test("herkent salaris en ondernemingsinkomen als aparte terugkerende bronnen", () => {
  const rows = [
    income("t3", "STICHTING TIMON", 2928.39, "2026-08-24", "salaris"),
    income("t2", "STICHTING TIMON", 2824.35, "2026-07-24", "salaris"),
    income("t1", "STICHTING TIMON", 3120.06, "2026-06-24", "salaris"),
    income("v6", "Vdmeer Consultancy", 1000, "2026-08-30", "inkomsten-onderneming"),
    income("v5", "Vdmeer Consultancy", 750, "2026-08-15", "inkomsten-onderneming"),
    income("v4", "Vdmeer Consultancy", 250, "2026-08-06", "inkomsten-onderneming"),
    income("v3", "Vdmeer Consultancy", 8000, "2026-07-28", "inkomsten-onderneming"),
    income("v2", "Vdmeer Consultancy", 1000, "2026-07-09", "inkomsten-onderneming"),
    income("v1", "Vdmeer Consultancy", 250, "2026-07-09", "inkomsten-onderneming"),
  ];

  const result = inferRecurringIncomes(rows, "2026-09-25");

  assert.equal(result.length, 2);
  assert.equal(result[0]?.label, "Vdmeer Consultancy");
  assert.equal(result[0]?.date, "2026-09-30");
  assert.equal(result[0]?.amount, 5625);
  assert.equal(result[0]?.frequency, "maandelijks");
  assert.equal(result[0]?.status, "provisional_estimate");
  assert.equal(result[0]?.minimumAmount, 2000);
  assert.equal(result[0]?.maximumAmount, 9250);
  assert.equal(result[1]?.label, "STICHTING TIMON");
  assert.equal(result[1]?.date, "2026-10-24");
  assert.equal(result[1]?.confidence, "medium");
  assert.equal(result[1]?.sourceTransactionIds.length, 3);
});

test("markeert een recente grote inkomensafwijking als afwijking", () => {
  const result = inferRecurringIncomes([
    income("a5", "Werkgever", 5200, "2026-09-24", "salaris"),
    income("a4", "Werkgever", 3000, "2026-08-24", "salaris"),
    income("a3", "Werkgever", 3000, "2026-07-24", "salaris"),
    income("a2", "Werkgever", 3000, "2026-06-24", "salaris"),
    income("a1", "Werkgever", 3000, "2026-05-24", "salaris"),
  ], "2026-09-25");

  assert.equal(result[0]?.status, "deviation");
  assert.equal(result[0]?.confidence, "high");
});

function income(id: string, label: string, amount: number, booked_on: string, category_id: string) {
  return { id, label, amount: String(amount), booked_on, category_id };
}
