import { NextResponse } from "next/server";
import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { getExportSnapshot, toExportJson, toTransactionCsv } from "@/modules/finance/export";
import { writeAuditLog } from "@/modules/finance/repository";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") {
    const response = NextResponse.json({ error: "Alleen eigenaar of beheerder mag exporteren." }, { status: 403 });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    return response;
  }
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const snapshot = await getExportSnapshot(format);
  const stamp = snapshot.manifest.exportedAt.slice(0, 10);

  await writeAuditLog({
    actorUserId: user.id,
    eventType: "export.created",
    entityType: "export",
    entityId: format,
    details: { format, tables: snapshot.manifest.tables },
  });

  if (format === "csv") {
    return noStoreResponse(toTransactionCsv(snapshot), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="huishouden-transacties-${stamp}.csv"`,
      },
    });
  }

  return noStoreResponse(toExportJson(snapshot), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="huishouden-backup-${stamp}.json"`,
    },
  });
}
