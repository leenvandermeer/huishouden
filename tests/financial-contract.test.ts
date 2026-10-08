import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSafeToSpend,
  calculateForecastUncertaintyMargin,
  compareForecastEvents,
  FINANCIAL_CONTRACT_VERSION,
  isInvestmentCategory,
  isSavingsTransferCategory,
  isStructuralIncomeCategory,
  resolveForecastHorizon,
} from "../src/modules/finance/financial-contract";

test("veilig te besteden reconcileert tot op de cent", () => {
  const result = calculateSafeToSpend({
    paymentBalance: 684.74,
    scheduledExpenses: 110.09,
    expectedBudgetExpenses: 178,
  });

  assert.equal(result.contractVersion, FINANCIAL_CONTRACT_VERSION);
  assert.equal(result.safeToSpend, 396.65);
  assert.equal(result.paymentBalance - result.scheduledExpenses - result.expectedBudgetExpenses - result.explicitReservations - result.uncertaintyMargin, result.safeToSpend);
});

test("onzekerheidsbuffer dekt onzekere vaste lasten en een mogelijke latere inkomensdag", () => {
  const margin = calculateForecastUncertaintyMargin({
    estimatedExpenses: [{ amount: 100, confidence: "low" }, { amount: 200, confidence: "medium" }, { amount: 300, confidence: "high" }],
    expectedBudgetExpenses: 150,
    daysUntilHorizon: 3,
    incomeConfidence: "low",
  });
  assert.equal(margin, 120);
});

test("betalingen gaan op dezelfde dag vóór inkomen", () => {
  const events = [
    { date: "2026-09-24", type: "income" as const },
    { date: "2026-09-24", type: "expense" as const },
  ].sort(compareForecastEvents);
  assert.equal(events[0]?.type, "expense");
});

test("aftrekposten kunnen de veilige ruimte negatief maken maar nooit zelf negatief zijn", () => {
  const result = calculateSafeToSpend({ paymentBalance: 50, scheduledExpenses: 80, expectedBudgetExpenses: -10, explicitReservations: 5 });
  assert.equal(result.expectedBudgetExpenses, 0);
  assert.equal(result.safeToSpend, -35);
});

test("horizon is volgend inkomen of anders het einde van de maand", () => {
  assert.deepEqual(resolveForecastHorizon("2026-09-21", "2026-09-24"), { date: "2026-09-24", reason: "next_income" });
  assert.deepEqual(resolveForecastHorizon("2024-02-20"), { date: "2024-02-29", reason: "end_of_month" });
});

test("categoriecontract houdt inkomen, sparen en beleggen uit elkaar", () => {
  assert.equal(isStructuralIncomeCategory("salaris"), true);
  assert.equal(isStructuralIncomeCategory("inkomsten-onderneming"), true);
  assert.equal(isStructuralIncomeCategory("overig-inkomen"), false);
  assert.equal(isSavingsTransferCategory("ontsparen"), true);
  assert.equal(isInvestmentCategory("beleggen"), true);
});
