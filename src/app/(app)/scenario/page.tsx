import { requireUser } from "@/modules/auth/service";
import { getForwardPlanningFromDatabase } from "@/modules/finance/forward-planning-service";
import { getDashboardSummaryFromDatabase } from "@/modules/finance/repository";
import { ScenarioClient } from "./scenario-client";

export default async function ScenarioPage() {
  const [user, planning, dashboard] = await Promise.all([requireUser(), getForwardPlanningFromDatabase(90), getDashboardSummaryFromDatabase()]);
  return <ScenarioClient planning={planning.model} safeToSpend={dashboard.cashflowForecast.availableToSpend} safeThrough={dashboard.cashflowForecast.horizon.date} canExport={user.role !== "readonly"} />;
}
