import { getBalanceForecastData } from "@/modules/finance/balance-forecast";
import { getBudgets, getFixedExpenses } from "@/modules/finance/data-source";
import { getFinancialHealthData } from "@/modules/finance/health-score";
import { getDashboardInsightFromDatabase } from "@/modules/finance/repository";
import { getDashboardSummaryFromDatabase } from "@/modules/finance/repository";
import { getForwardPlanningFromDatabase } from "@/modules/finance/forward-planning-service";
import { requireUser } from "@/modules/auth/service";
import { InzichtClient } from "./inzicht-client";
import { parseReportSlug } from "@/lib/report-destinations";

export default async function InsightPage({ searchParams }: { searchParams?: Promise<{ rapport?: string }> }) {
  const params = (await searchParams) ?? {};
  const user = await requireUser();
  const [health, forecast, insight, fixedExpenses, dashboard, planning] = await Promise.all([
    getFinancialHealthData(user.id),
    getBalanceForecastData(),
    getDashboardInsightFromDatabase(),
    getFixedExpenses(),
    getDashboardSummaryFromDatabase(),
    getForwardPlanningFromDatabase(90),
  ]);
  const latestYear = (insight.latestMonth ?? new Date().toISOString().slice(0, 7)).slice(0, 4);
  const yearMonths = Array.from({ length: 12 }, (_, index) => `${latestYear}-${String(index + 1).padStart(2, "0")}`);
  const budgetGroups = await Promise.all(yearMonths.map(async (month) => ({ month, budgets: await getBudgets(month) })));

  return <InzichtClient health={health} forecast={forecast} insight={insight} fixedExpenses={fixedExpenses} budgetGroups={budgetGroups} year={latestYear} initialReport={parseReportSlug(params.rapport)} safeToSpend={dashboard.cashflowForecast.availableToSpend} lowestBalance={planning.model.lowestBalance} />;
}
