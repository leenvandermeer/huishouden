import { query } from "@/server/db/pool";

export interface BalanceForecastPoint {
  month: string;
  balance: number;
  isForecast: boolean;
  lowerBound?: number;
  upperBound?: number;
}

export interface MonthlyFlowPoint {
  month: string;
  net: number;
}

export interface BalanceForecastData {
  history: BalanceForecastPoint[];
  forecast: BalanceForecastPoint[];
  monthlyFlows: MonthlyFlowPoint[];
  avgMonthlyNet: number;
  volatility: number;
  currentBalance: number;
  forecastEnd: number;
  trendDirection: "up" | "down" | "stable";
}

export async function getBalanceForecastData(months = 12): Promise<BalanceForecastData> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [balanceResult, monthlyResult] = await Promise.all([
    query<{ total: string }>(
      `select coalesce(sum(balance), 0)::text as total from accounts where archived_at is null`,
    ),
    query<{ month: string; net: string }>(
      `select
         to_char(booked_at, 'YYYY-MM') as month,
         coalesce(sum(amount), 0)::text as net
       from transactions
       group by to_char(booked_at, 'YYYY-MM')
       order by month`,
    ),
  ]);

  const currentBalance = Number(balanceResult.rows[0]?.total ?? 0);
  const flows = monthlyResult.rows.map((row) => ({
    month: row.month,
    net: Number(row.net),
  }));

  const monthlyFlows = flows.slice(-months);
  const recentNets = monthlyFlows.map((f) => f.net);
  const avgMonthlyNet = recentNets.length ? recentNets.reduce((s, n) => s + n, 0) / recentNets.length : 0;
  const variance = recentNets.length > 1
    ? recentNets.reduce((s, n) => s + (n - avgMonthlyNet) ** 2, 0) / (recentNets.length - 1)
    : 0;
  const volatility = Math.sqrt(variance);

  // Bouw historisch saldo terug vanaf huidige bankstand.
  // Saldo einde maand M = saldo einde maand M+1 minus netto van maand M+1.
  const history: BalanceForecastPoint[] = [];
  let running = currentBalance;
  const currentMonthFlow = flows.find((f) => f.month === currentMonth);
  if (currentMonthFlow) running -= currentMonthFlow.net;

  for (let i = monthlyFlows.length - 1; i >= 0; i--) {
    const flow = monthlyFlows[i];
    if (flow.month === currentMonth) {
      history.unshift({ month: flow.month, balance: currentBalance, isForecast: false });
      continue;
    }
    history.unshift({ month: flow.month, balance: Math.round(running * 100) / 100, isForecast: false });
    running -= flow.net;
  }
  if (!history.length || history[history.length - 1].month !== currentMonth) {
    history.push({ month: currentMonth, balance: currentBalance, isForecast: false });
  }

  // Voorspelling: gemiddelde netto per maand met betrouwbaarheidsband op basis van volatiliteit
  const forecast: BalanceForecastPoint[] = [];
  let projected = currentBalance;
  const forecastMonths = 6;
  const lastMonth = history[history.length - 1].month;
  for (let i = 1; i <= forecastMonths; i++) {
    const [y, m] = lastMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    projected += avgMonthlyNet;
    const spread = volatility * Math.sqrt(i) * 0.8;
    forecast.push({
      month: monthKey,
      balance: Math.round(projected * 100) / 100,
      isForecast: true,
      lowerBound: Math.round((projected - spread) * 100) / 100,
      upperBound: Math.round((projected + spread) * 100) / 100,
    });
  }

  const trendDirection: "up" | "down" | "stable" =
    avgMonthlyNet > 100 ? "up" : avgMonthlyNet < -100 ? "down" : "stable";

  return {
    history,
    forecast,
    monthlyFlows,
    avgMonthlyNet: Math.round(avgMonthlyNet * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    currentBalance,
    forecastEnd: forecast[forecast.length - 1]?.balance ?? currentBalance,
    trendDirection,
  };
}
