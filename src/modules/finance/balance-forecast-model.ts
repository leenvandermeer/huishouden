import { backtestMonthlyBaseline, median } from "./forecast-validation";

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
  method: "mean" | "median";
  validation: ReturnType<typeof backtestMonthlyBaseline>;
  dataWarnings: string[];
}

/** Historical cash-flow baseline; not an event-based spending recommendation. */
export function buildBalanceForecast(currentBalance: number, flows: MonthlyFlowPoint[], asOf: string, months = 12): BalanceForecastData {
  const currentMonth = asOf.slice(0, 7);
  const dataWarnings: string[] = [];
  // Train only on completed months; absent calendar months remain visible as zero.
  const completed = flows.filter((flow) => flow.month < currentMonth);
  const monthlyFlows: MonthlyFlowPoint[] = [];
  if (completed.length) {
    const first = completed[0].month;
    const [year, month] = currentMonth.split("-").map(Number);
    for (let offset = months; offset >= 1; offset--) {
      const key = new Date(Date.UTC(year, month - 1 - offset, 1)).toISOString().slice(0, 7);
      if (key >= first) monthlyFlows.push({ month: key, net: completed.find((flow) => flow.month === key)?.net ?? 0 });
    }
  }
  const recentNets = monthlyFlows.map((f) => f.net);
  const meanMonthlyNet = recentNets.length ? recentNets.reduce((s, n) => s + n, 0) / recentNets.length : 0;
  const validation = backtestMonthlyBaseline(recentNets);
  // Keep the simpler baseline unless six historical evaluations favour the alternative by 10%.
  const method = validation.folds >= 6 && validation.medianAbsoluteError! < validation.meanAbsoluteError! * 0.9 ? "median" : "mean";
  const avgMonthlyNet = method === "median" ? median(recentNets) : meanMonthlyNet;
  if (monthlyFlows.some((flow) => !completed.some((observed) => observed.month === flow.month))) {
    dataWarnings.push("Maanden zonder transacties zijn als nul gerekend. Controleer of alle bankbestanden zijn geïmporteerd.");
  }
  const variance = recentNets.length > 1
    ? recentNets.reduce((s, n) => s + (n - meanMonthlyNet) ** 2, 0) / (recentNets.length - 1)
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

  // Indicative spread, not a calibrated probability interval.
  const forecast: BalanceForecastPoint[] = [];
  let projected = currentBalance;
  const [asOfYear, asOfMonth, asOfDay] = asOf.split("-").map(Number);
  const daysInCurrentMonth = new Date(Date.UTC(asOfYear, asOfMonth, 0)).getUTCDate();
  const remainingFraction = asOfDay ? (daysInCurrentMonth - asOfDay) / daysInCurrentMonth : 0;
  const forecastMonths = recentNets.length >= 3 ? 6 : 0;
  const lastMonth = history[history.length - 1].month;
  for (let i = 1; i <= forecastMonths; i++) {
    const [y, m] = lastMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    projected = currentBalance + avgMonthlyNet * (i + remainingFraction);
    const spread = volatility * Math.sqrt(i + remainingFraction);
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
    method,
    validation,
    dataWarnings,
  };
}
