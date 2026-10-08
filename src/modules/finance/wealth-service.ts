import { query } from "@/server/db/pool";
import { getAccountSummariesFromDatabase, getFinanceMetadataFromDatabase } from "./repository";
import { buildWealthOverview, type WealthOverview } from "./wealth";

export async function getWealthOverviewFromDatabase(asOf = amsterdamDateString()): Promise<WealthOverview> {
  const [{ accounts }, summaries, movementResult, evidenceResult] = await Promise.all([
    getFinanceMetadataFromDatabase(),
    getAccountSummariesFromDatabase(),
    query<{ month: string; account_id: string; amount: string }>(
      `select to_char(booked_at, 'YYYY-MM') as month, account_id, sum(amount)::text as amount
       from transactions
       where booked_at >= ($1::date - interval '12 months')
       group by to_char(booked_at, 'YYYY-MM'), account_id
       order by month, account_id`,
      [asOf],
    ),
    query<{ account_id: string; last_transaction_on: string | null }>(
      `select a.id as account_id, to_char(max(t.booked_at), 'YYYY-MM-DD') as last_transaction_on
       from accounts a
       left join transactions t on t.account_id = a.id
       where a.archived_at is null
       group by a.id`,
    ),
  ]);
  const lastTransactionByAccount = new Map(evidenceResult.rows.map((row) => [row.account_id, row.last_transaction_on ?? undefined]));
  const evidenceByAccount = new Map(accounts.map((account) => [account.id, {
    balanceDifference: summaries.get(account.id)?.balanceDifference ?? 0,
    lastTransactionOn: lastTransactionByAccount.get(account.id),
  }]));
  return buildWealthOverview({
    accounts,
    evidenceByAccount,
    monthlyMovements: movementResult.rows.map((row) => ({ month: row.month, accountId: row.account_id, amount: Number(row.amount) })),
    asOf,
  });
}

function amsterdamDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
