import { requireEnvironment } from "./environment";
import assert from "node:assert/strict";
import { getPool, query } from "../src/server/db/pool";
import { getBalanceForecastData } from "../src/modules/finance/balance-forecast";
import { getDashboardSummaryFromDatabase } from "../src/modules/finance/repository";
import { toTodayCalculationCsv } from "../src/modules/finance/csv-product-contract";
import { calculateSafeToSpend, FINANCIAL_CONTRACT_VERSION } from "../src/modules/finance/financial-contract";

async function main() {
  requireEnvironment("DATABASE_URL");
  // Applies to every pool connection, including concurrent repository queries.
  process.env.PGOPTIONS = `${process.env.PGOPTIONS ?? ""} -c default_transaction_read_only=on`;
  try {
    const mode = await query<{ default_transaction_read_only: string }>("show default_transaction_read_only");
    assert.equal(mode.rows[0].default_transaction_read_only, "on");
    const [balance, dashboard] = await Promise.all([getBalanceForecastData(), getDashboardSummaryFromDatabase()]);
    const today = dashboard.cashflowForecast;
    assert.ok([today.paymentBalance, today.scheduledExpenses, today.expectedBudgetExpenses,
      today.explicitReservations, today.uncertaintyMargin, today.availableToSpend,
      balance.currentBalance, balance.forecastEnd, balance.avgMonthlyNet, balance.volatility].every(Number.isFinite));
    const recomputed = calculateSafeToSpend(today);
    assert.equal(today.availableToSpend, recomputed.safeToSpend);
    assert.equal(today.calculationVersion, FINANCIAL_CONTRACT_VERSION);
    assert.equal(balance.history.at(-1)?.balance, balance.currentBalance);
    assert.ok(balance.monthlyFlows.every((point) => point.month < today.asOf.slice(0, 7)));
    assert.ok(balance.forecast.every((point) => Number.isFinite(point.balance) && point.lowerBound! <= point.balance && point.balance <= point.upperBound!));
    const csv = toTodayCalculationCsv(today);
    const csvResult = csv.split(/\r?\n/).find((line) => line.startsWith('"result";'));
    assert.ok(csvResult);
    assert.equal(Number(csvResult.split(";")[3].replaceAll('"', "").replace(",", ".")), today.availableToSpend);
    // Deliberately emit only anonymous counts and pass/fail flags, never household amounts or sources.
    console.log(JSON.stringify({
      contractVersion: FINANCIAL_CONTRACT_VERSION, readOnly: true, reconciliation: "passed", csv: "passed",
      trainingMonths: balance.monthlyFlows.length, forecastMonths: balance.forecast.length,
      backtestFolds: balance.validation.folds, method: balance.method, dataWarnings: balance.dataWarnings.length,
      inferredSources: today.incomeSources.filter((source) => source.estimated).length,
      lowConfidenceSources: today.incomeSources.filter((source) => source.confidence === "low").length,
      historicalBudgetAdjustmentApplied: today.budgetHistoryAdjustment > 0,
    }, null, 2));
  } finally {
    await getPool().end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Forecastcontrole mislukt");
  process.exitCode = 1;
});
