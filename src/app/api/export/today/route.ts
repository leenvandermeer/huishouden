import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { toTodayCalculationCsv } from "@/modules/finance/csv-product-contract";
import { getDashboardSummaryFromDatabase, writeAuditLog } from "@/modules/finance/repository";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreResponse("Alleen eigenaar of beheerder mag exporteren.", { status: 403 });
  const forecast = (await getDashboardSummaryFromDatabase()).cashflowForecast;
  const exportedAt = new Date().toISOString();
  await writeAuditLog({ actorUserId: user.id, eventType: "export.today_calculation", entityType: "export", entityId: "csv-1.0", details: { asOf: forecast.asOf, horizon: forecast.horizon, result: forecast.availableToSpend } });
  return noStoreResponse(toTodayCalculationCsv(forecast, exportedAt), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="huishouden-vandaag-${forecast.asOf}.csv"`,
    },
  });
}
