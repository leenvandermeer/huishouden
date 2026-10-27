import assert from "node:assert/strict";
import test from "node:test";
import { inferRecurringIncomes } from "../src/modules/finance/repository";

test("herkent salaris en ondernemingsinkomen als aparte terugkerende bronnen", () => {
  const rows = [
    income("t3", "Werkgever Voorbeeld", 2900, "2026-08-24", "salaris"),
    income("t2", "Werkgever Voorbeeld", 2800, "2026-07-24", "salaris"),
    income("t1", "Werkgever Voorbeeld", 3100, "2026-06-24", "salaris"),
    income("v6", "Onderneming Voorbeeld", 1000, "2026-08-30", "inkomsten-onderneming"),
    income("v5", "Onderneming Voorbeeld", 750, "2026-08-15", "inkomsten-onderneming"),
    income("v4", "Onderneming Voorbeeld", 250, "2026-08-06", "inkomsten-onderneming"),
    income("v3", "Onderneming Voorbeeld", 8000, "2026-07-28", "inkomsten-onderneming"),
    income("v2", "Onderneming Voorbeeld", 1000, "2026-07-09", "inkomsten-onderneming"),
    income("v1", "Onderneming Voorbeeld", 250, "2026-07-09", "inkomsten-onderneming"),
  ];

  const result = inferRecurringIncomes(rows, "2026-09-25");

  assert.equal(result.length, 2);
  assert.equal(result[0]?.label, "Onderneming Voorbeeld");
  assert.equal(result[0]?.date, "2026-09-30");
  assert.equal(result[0]?.amount, 5625);
  assert.equal(result[0]?.frequency, "maandelijks");
  assert.equal(result[0]?.status, "provisional_estimate");
  assert.equal(result[0]?.minimumAmount, 2000);
  assert.equal(result[0]?.maximumAmount, 9250);
  assert.equal(result[1]?.label, "Werkgever Voorbeeld");
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
  assert.equal(result[0]?.confidence, "low");
});

function income(id: string, label: string, amount: number, booked_on: string, category_id: string) {
  return { id, label, amount: String(amount), booked_on, category_id };
}

test("inkomensdatum behoudt de brondag bij doorschuiven over februari", () => {
  const result = inferRecurringIncomes([
    income("j", "Werkgever", 3000, "2026-01-31", "salaris"),
    income("d", "Werkgever", 3000, "2025-12-31", "salaris"),
  ], "2026-03-01");
  assert.equal(result[0]?.date, "2026-03-31");
});


test("vierwekelijks inkomen gebruikt een bedrag per betaling, ook bij twee betalingen in januari", () => {
  const result = inferRecurringIncomes([
    income("a", "Werkgever", 1000, "2026-01-02", "salaris"),
    income("b1", "Werkgever", 600, "2026-01-30", "salaris"),
    income("b2", "Werkgever", 400, "2026-01-30", "salaris"),
    income("c", "Werkgever", 1000, "2026-02-27", "salaris"),
  ], "2026-03-01");
  assert.equal(result[0]?.frequency, "vierwekelijks");
  assert.equal(result[0]?.amount, 1000);
  assert.equal(result[0]?.minimumAmount, 1000);
  assert.equal(result[0]?.maximumAmount, 1000);
  assert.equal(result[0]?.evidenceCount, 3);
  assert.equal(result[0]?.date, "2026-03-27");
});

test("toekomstige inkomsten mogen een historische peildatum niet beïnvloeden", () => {
  const past = [income("a", "Werkgever", 1000, "2026-01-24", "salaris"), income("b", "Werkgever", 1000, "2026-02-24", "salaris")];
  assert.deepEqual(inferRecurringIncomes([...past, income("future", "Werkgever", 99999, "2026-04-24", "salaris")], "2026-03-01"), inferRecurringIncomes(past, "2026-03-01"));
});

test("wisselende inkomensbedragen krijgen ook met veel historie lage zekerheid", () => {
  const rows = [1000, 3000, 1000, 3000, 1000, 3000].map((amount, i) => income(String(i), "Onderneming", amount, `2026-${String(i + 1).padStart(2, "0")}-24`, "inkomsten-onderneming"));
  assert.equal(inferRecurringIncomes(rows, "2026-07-01")[0]?.confidence, "low");
});
