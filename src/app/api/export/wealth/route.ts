import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { toWealthCsv } from "@/modules/finance/csv-product-contract";
import { writeAuditLog } from "@/modules/finance/repository";
import { getWealthOverviewFromDatabase } from "@/modules/finance/wealth-service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreResponse("Alleen eigenaar of beheerder mag exporteren.", { status: 403 });
  const wealth = await getWealthOverviewFromDatabase();
  const exportedAt = new Date().toISOString();
  await writeAuditLog({ actorUserId: user.id, eventType: "export.wealth", entityType: "export", entityId: "csv-1.0", details: { asOf: wealth.asOf, netWorth: wealth.netWorth, accounts: wealth.accounts.length } });
  return noStoreResponse(toWealthCsv(wealth, exportedAt), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="huishouden-vermogen-${wealth.asOf}.csv"`,
    },
  });
}
