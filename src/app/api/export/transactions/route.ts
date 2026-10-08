import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect, noStoreResponse } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { toFilteredTransactionsCsv } from "@/modules/finance/csv-product-contract";
import { exportTransactionsFromDatabase, getFinanceMetadataFromDatabase, resolveCounterAccountKeyFromDatabase, writeAuditLog } from "@/modules/finance/repository";
import { parseTransactionFilters } from "@/modules/finance/transaction-query";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreResponse("Alleen eigenaar of beheerder mag exporteren.", { status: 403 });

  const url = new URL(request.url);
  const filters = parseTransactionFilters(Object.fromEntries(url.searchParams.entries()));
  if (filters.counterAccountKey) filters.counterAccount = await resolveCounterAccountKeyFromDatabase(filters.counterAccountKey);
  const [{ accounts, categories }, transactions] = await Promise.all([
    getFinanceMetadataFromDatabase(),
    exportTransactionsFromDatabase(filters),
  ]);
  const exportedAt = new Date().toISOString();
  const asOf = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const auditFilters = { ...filters };
  delete auditFilters.counterAccount;
  await writeAuditLog({ actorUserId: user.id, eventType: "export.filtered_transactions", entityType: "export", entityId: "csv-1.0", details: { rows: transactions.length, filters: auditFilters } });
  return noStoreResponse(toFilteredTransactionsCsv({ transactions, filters, accounts, categories, exportedAt, asOf }), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="huishouden-transacties-selectie-${exportedAt.slice(0, 10)}.csv"`,
    },
  });
}
