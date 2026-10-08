import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { getFinanceDataset } from "@/modules/finance/data-source";
import { toReportCsv } from "@/modules/finance/report-export";
import { getAvailableReportPeriods, parseReportReferenceWindow, type ReportPeriodType } from "@/modules/finance/reporting";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreResponse("Alleen eigenaar of beheerder mag exporteren.", { status: 403 });

  const url = new URL(request.url);
  const requestedType = url.searchParams.get("periodType");
  const periodType: ReportPeriodType = requestedType === "quarter" || requestedType === "year" ? requestedType : "month";
  const dataset = await getFinanceDataset();
  const availablePeriods = getAvailableReportPeriods(dataset.transactions, periodType);
  const requestedPeriod = url.searchParams.get("period");
  const period = requestedPeriod && availablePeriods.includes(requestedPeriod) ? requestedPeriod : availablePeriods[0];
  const referenceWindow = parseReportReferenceWindow(url.searchParams.get("referencePeriods"));

  if (!period) {
    return noStoreResponse("Er zijn nog geen gegevens om te exporteren.", { status: 404 });
  }

  return noStoreResponse(toReportCsv(dataset, period, periodType, referenceWindow), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="huishouden-rapport-${period}.csv"`,
    },
  });
}
