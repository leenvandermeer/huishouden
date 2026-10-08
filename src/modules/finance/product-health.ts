import { randomUUID } from "node:crypto";
import { PRODUCT_RELEASE } from "@/lib/product";
import { query } from "@/server/db/pool";

export const PRODUCT_EVENT_TYPES = ["client.error", "source.missing_income", "source.estimated"] as const;
export type ProductEventType = (typeof PRODUCT_EVENT_TYPES)[number];

export interface ProductHealth {
  release: string;
  errorsLast7Days: number;
  missingSourceSignalsLast7Days: number;
  estimatedSourceSignalsLast7Days: number;
  correctionsLast30Days: number;
  lastSignalAt?: string;
}

export function isProductEventType(value: unknown): value is ProductEventType {
  return typeof value === "string" && PRODUCT_EVENT_TYPES.includes(value as ProductEventType);
}

export function normalizeProductPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/onbekend";
  return value.split(/[?#]/, 1)[0].slice(0, 120) || "/onbekend";
}

export async function recordProductEvent(input: { userId: string; eventType: ProductEventType; path: string }) {
  await query(
    `insert into product_events (id, user_id, event_type, path, release_version)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, event_type, path, event_day) do nothing`,
    [`pev_${randomUUID()}`, input.userId, input.eventType, normalizeProductPath(input.path), PRODUCT_RELEASE],
  );
}

export async function getProductHealth(): Promise<ProductHealth> {
  const [signals, corrections] = await Promise.all([
    query<{ event_type: ProductEventType; count: string; last_at: Date | string | null }>(
      `select event_type, count(*)::text as count, max(created_at) as last_at
       from product_events
       where created_at >= now() - interval '7 days'
       group by event_type`,
    ),
    query<{ count: string }>(
      `select count(*)::text as count
       from audit_log
       where created_at >= now() - interval '30 days'
         and event_type in (
           'transaction.category_changed', 'transaction.category_bulk_changed',
           'fixed_expense.saved', 'fixed_expense_candidate.ignored',
           'recurring_income.saved', 'recurring_income_candidate.ignored',
           'account.balance_saved', 'budget.saved'
         )`,
    ),
  ]);
  const counts = new Map(signals.rows.map((row) => [row.event_type, Number(row.count)]));
  const lastSignalAt = signals.rows
    .map((row) => row.last_at)
    .filter((value): value is Date | string => Boolean(value))
    .map((value) => value instanceof Date ? value.toISOString() : String(value))
    .sort()
    .at(-1);
  return {
    release: PRODUCT_RELEASE,
    errorsLast7Days: counts.get("client.error") ?? 0,
    missingSourceSignalsLast7Days: counts.get("source.missing_income") ?? 0,
    estimatedSourceSignalsLast7Days: counts.get("source.estimated") ?? 0,
    correctionsLast30Days: Number(corrections.rows[0]?.count ?? 0),
    lastSignalAt,
  };
}
