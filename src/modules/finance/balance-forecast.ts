import { query } from "@/server/db/pool";
import { buildBalanceForecast, type BalanceForecastData } from "./balance-forecast-model";
export type { BalanceForecastPoint, MonthlyFlowPoint, BalanceForecastData } from "./balance-forecast-model";

export async function getBalanceForecastData(months = 12): Promise<BalanceForecastData> {
  const asOf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [balanceResult, monthlyResult] = await Promise.all([
    query<{ total: string; missing_dates: string; earliest_date: string | null; latest_date: string | null; no_history: string }>(
      `select coalesce(sum(a.balance), 0)::text as total,
         count(*) filter (where a.balance_date is null)::text as missing_dates,
         to_char(min(a.balance_date), 'YYYY-MM-DD') as earliest_date,
         to_char(max(a.balance_date), 'YYYY-MM-DD') as latest_date,
         count(*) filter (where not exists (select 1 from transactions t where t.account_id = a.id))::text as no_history
       from accounts a where a.archived_at is null`,
    ),
    query<{ month: string; net: string }>(
      `with coverage as (
         select max(first_month) as first_month from (
           select a.id, date_trunc('month', min(t.booked_at)) as first_month
           from accounts a join transactions t on t.account_id = a.id
           where a.archived_at is null and t.booked_at <= $1::date group by a.id
         ) account_history
       )
       select to_char(t.booked_at, 'YYYY-MM') as month, sum(t.amount)::text as net
       from transactions t join accounts a on a.id = t.account_id
       where a.archived_at is null and t.booked_at <= $1::date
         and (date_trunc('month', t.booked_at) > (select first_month from coverage)
           or to_char(t.booked_at, 'YYYY-MM') = left($1::text, 7))
       group by to_char(t.booked_at, 'YYYY-MM') order by month`,
      [asOf],
    ),
  ]);
  const model = buildBalanceForecast(
    Number(balanceResult.rows[0]?.total ?? 0),
    monthlyResult.rows.map((row) => ({ month: row.month, net: Number(row.net) })),
    asOf,
    months,
  );
  const quality = balanceResult.rows[0];
  if (Number(quality?.missing_dates ?? 0) > 0) model.dataWarnings.push("Bij sommige rekeningstanden ontbreekt een peildatum.");
  if (Number(quality?.no_history ?? 0) > 0) model.dataWarnings.push("Voor sommige actieve rekeningen ontbreekt transactiehistorie.");
  if (quality?.earliest_date && quality.latest_date && quality.earliest_date !== quality.latest_date) {
    model.dataWarnings.push("De rekeningstanden hebben verschillende peildatums. Controleer de actuele standen.");
  }
  if (quality?.earliest_date && Date.parse(asOf) - Date.parse(quality.earliest_date) > 7 * 86_400_000) {
    model.dataWarnings.push("Ten minste één rekeningstand is meer dan zeven dagen oud.");
  }
  if (quality?.latest_date && quality.latest_date > asOf) model.dataWarnings.push("Een rekeningstand heeft een peildatum in de toekomst.");
  return model;
}
