import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { toForwardCsv } from "@/modules/finance/csv-product-contract";
import { getForwardPlanningFromDatabase } from "@/modules/finance/forward-planning-service";
import { writeAuditLog } from "@/modules/finance/repository";
import { FORECAST_STATUS_LABELS } from "@/modules/finance/forecast-evidence";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreResponse("Alleen eigenaar of beheerder mag exporteren.", { status: 403 });
  const url = new URL(request.url);
  const horizonDays = url.searchParams.get("days") === "60" ? 60 : url.searchParams.get("days") === "90" ? 90 : 30;
  const { model } = await getForwardPlanningFromDatabase(horizonDays);
  const events = model.events.map((event) => ({
    date: event.date,
    label: event.label,
    amount: event.direction === "income" ? event.amount : -event.amount,
    direction: event.direction === "income" ? "inkomen" as const : "uitgave" as const,
    frequency: event.frequency ?? "eenmalig" as const,
    status: FORECAST_STATUS_LABELS[event.status],
    confidence: event.confidence,
    estimated: event.estimated,
    source: `${event.sourceType}:${event.sourceId}`,
  }));
  const exportedAt = new Date().toISOString();
  await writeAuditLog({ actorUserId: user.id, eventType: "export.forward_schedule", entityType: "export", entityId: "csv-1.0", details: { rows: events.length, asOf: model.asOf, horizonDays } });
  return noStoreResponse(toForwardCsv(events, model.asOf, exportedAt), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="huishouden-vooruit-${model.asOf}-${horizonDays}-dagen.csv"`,
    },
  });
}
