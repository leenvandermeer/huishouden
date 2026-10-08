import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { toScenarioCsv } from "@/modules/finance/csv-product-contract";
import { getForwardPlanningFromDatabase } from "@/modules/finance/forward-planning-service";
import { getDashboardSummaryFromDatabase } from "@/modules/finance/repository";
import { buildScenarioComparison, type ScenarioType } from "@/modules/finance/scenario";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreResponse("Alleen eigenaar of beheerder mag exporteren.", { status: 403 });
  const url = new URL(request.url);
  const [planning, dashboard] = await Promise.all([getForwardPlanningFromDatabase(90), getDashboardSummaryFromDatabase()]);
  const comparison = buildScenarioComparison({
    planning: planning.model,
    safeToSpend: dashboard.cashflowForecast.availableToSpend,
    safeThrough: dashboard.cashflowForecast.horizon.date,
    scenario: {
      type: parseType(url.searchParams.get("type")),
      amount: parseAmount(url.searchParams.get("amount")),
      startDate: parseDate(url.searchParams.get("date"), planning.model.asOf),
      label: (url.searchParams.get("label") ?? "").slice(0, 120),
    },
  });
  return noStoreResponse(toScenarioCsv(comparison), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="huishouden-scenario-${comparison.asOf}.csv"` },
  });
}

function parseType(value: string | null): ScenarioType {
  return value === "monthly_expense" || value === "extra_reservation" || value === "income_change" ? value : "one_off_expense";
}

function parseAmount(value: string | null) {
  const amount = Number(String(value ?? "250").replace(",", "."));
  return Number.isFinite(amount) ? Math.max(-1_000_000, Math.min(1_000_000, amount)) : 250;
}

function parseDate(value: string | null, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}
