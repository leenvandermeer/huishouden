import { query } from "@/server/db/pool";

export interface FinancialHealthData {
  score: number;
  trend: number;
  label: string;
  explanation: string;
  currentBalance: number;
  paymentBalance: number;
  savingsBalance: number;
  bufferMonths: number;
  bufferStatus: "healthy" | "warning" | "critical";
  forecastTomorrow: number;
  forecastNextWeek: number;
  forecastEndMonth: number;
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  previousIncome?: number;
  previousExpenses?: number;
  trendDescription: string;
}

export async function getFinancialHealthData(userId: string): Promise<FinancialHealthData> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const [balanceResult, cashflowResult, prevCashflowResult, expensesResult] = await Promise.all([
    query<{ total: string; payment: string; savings: string }>(
      `select
         coalesce(sum(balance), 0)::text as total,
         coalesce(sum(balance) filter (where type = 'betaalrekening'), 0)::text as payment,
         coalesce(sum(balance) filter (where type = 'spaarrekening'), 0)::text as savings
       from accounts where archived_at is null`,
    ),
    query<{ income: string; expenses: string; savings: string; investments: string }>(
      `select
         coalesce(sum(amount) filter (
           where amount > 0
             and kind <> 'interne_overboeking'
             and category_id is distinct from 'sparen'
             and category_id is distinct from 'potje-opname'
             and category_id is distinct from 'ontsparen'
             and category_id is distinct from 'beleggen'
         ), 0)::text as income,
         coalesce(sum(abs(amount)) filter (where amount < 0 and kind <> 'interne_overboeking' and category_id is distinct from 'sparen' and category_id is distinct from 'potje-opname' and category_id is distinct from 'ontsparen' and category_id is distinct from 'beleggen'), 0)::text as expenses,
         coalesce(sum(abs(amount)) filter (where amount < 0 and category_id = 'sparen'), 0)::text as savings,
         coalesce(sum(abs(amount)) filter (where amount < 0 and category_id = 'beleggen'), 0)::text as investments
       from transactions
       where to_char(booked_at, 'YYYY-MM') = $1`,
      [currentMonth],
    ),
    query<{ income: string; expenses: string }>(
      `select
         coalesce(sum(amount) filter (
           where amount > 0
             and kind <> 'interne_overboeking'
             and category_id is distinct from 'sparen'
             and category_id is distinct from 'potje-opname'
             and category_id is distinct from 'ontsparen'
             and category_id is distinct from 'beleggen'
         ), 0)::text as income,
         coalesce(sum(abs(amount)) filter (where amount < 0 and kind <> 'interne_overboeking' and category_id is distinct from 'sparen' and category_id is distinct from 'potje-opname' and category_id is distinct from 'ontsparen' and category_id is distinct from 'beleggen'), 0)::text as expenses
       from transactions
       where to_char(booked_at, 'YYYY-MM') = $1`,
      [prevMonth],
    ),
    query<{ avg_daily: string }>(
      `select coalesce(sum(abs(amount)) / nullif(extract(day from date_trunc('month', now()) + interval '1 month - 1 day'), 0), 0)::text as avg_daily
       from transactions
       where to_char(booked_at, 'YYYY-MM') = $1
         and amount < 0 and kind <> 'interne_overboeking'
         and category_id is distinct from 'sparen'
         and category_id is distinct from 'potje-opname'
         and category_id is distinct from 'ontsparen'
         and category_id is distinct from 'beleggen'`,
      [currentMonth],
    ),
  ]);

  const balance = balanceResult.rows[0];
  const cashflow = cashflowResult.rows[0];
  const prevCashflow = prevCashflowResult.rows[0];
  const expensesData = expensesResult.rows[0];

  const totalBalance = Number(balance?.total ?? 0);
  const paymentBalance = Number(balance?.payment ?? 0);
  const savingsBalance = Number(balance?.savings ?? 0);
  const income = Number(cashflow?.income ?? 0);
  const expenses = Number(cashflow?.expenses ?? 0);
  const savings = Number(cashflow?.savings ?? 0);
  const investments = Number(cashflow?.investments ?? 0);
  const prevIncome = Number(prevCashflow?.income ?? 0);
  const prevExpenses = Number(prevCashflow?.expenses ?? 0);
  const avgDailyExpenses = Number(expensesData?.avg_daily ?? 0);

  const bufferMonths = avgDailyExpenses > 0 ? paymentBalance / (avgDailyExpenses * 30) : paymentBalance > 0 ? 12 : 0;
  const bufferStatus: "healthy" | "warning" | "critical" = bufferMonths >= 2 ? "healthy" : bufferMonths >= 1 ? "warning" : "critical";

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const remainingDays = daysInMonth - dayOfMonth;
  const projectedExpenses = avgDailyExpenses * remainingDays;
  const forecastEndMonth = paymentBalance + income - expenses - projectedExpenses;
  const forecastTomorrow = paymentBalance + (income / daysInMonth) - avgDailyExpenses;
  const forecastNextWeek = paymentBalance + (income / daysInMonth) * 7 - avgDailyExpenses * 7;

  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const debtRatio = totalBalance > 0 ? 0 : 0;

  let score = 50;
  if (savingsRate >= 20) score += 20;
  else if (savingsRate >= 10) score += 10;
  else if (savingsRate < 0) score -= 20;

  if (bufferMonths >= 3) score += 15;
  else if (bufferMonths >= 2) score += 10;
  else if (bufferMonths >= 1) score += 5;
  else score -= 15;

  if (income > expenses) score += 10;
  else score -= 10;

  if (savings > 0) score += 5;
  if (investments > 0) score += 5;

  score = Math.max(0, Math.min(100, score));

  const prevSavingsRate = prevIncome > 0 ? Math.round(((prevIncome - prevExpenses) / prevIncome) * 100) : 0;
  const trend = savingsRate - prevSavingsRate;

  let label = "";
  let explanation = "";
  if (score >= 80) {
    label = "Uitstekend";
    explanation = `Je financiele situatie is uitstekend. Je spaarquote ligt boven het gemiddelde en je vaste lasten zijn gedekt.`;
  } else if (score >= 60) {
    label = "Goed";
    explanation = `Je financiele situatie is goed. Je spaarquote is redelijk en je buffer is voldoende.`;
  } else if (score >= 40) {
    label = "Gemiddeld";
    explanation = `Je financiele situatie is gemiddeld. Er is ruimte voor verbetering in je spaarquote of buffer.`;
  } else {
    label = "Aandacht nodig";
    explanation = `Je financiele situatie vraagt aandacht. Je spaarquote is laag of je buffer is ontoereikend.`;
  }

  const trendDescription = trend > 5
    ? `Je spaarquote is gestegen van ${prevSavingsRate}% naar ${savingsRate}%. Goed bezig!`
    : trend < -5
    ? `Je spaarquote is gedaald van ${prevSavingsRate}% naar ${savingsRate}%. Let op je uitgaven.`
    : `Je spaarquote is stabiel rond ${savingsRate}%.`;

  return {
    score,
    trend,
    label,
    explanation,
    currentBalance: totalBalance,
    paymentBalance,
    savingsBalance,
    bufferMonths,
    bufferStatus,
    forecastTomorrow,
    forecastNextWeek,
    forecastEndMonth,
    income,
    expenses,
    savings,
    investments,
    previousIncome: prevIncome || undefined,
    previousExpenses: prevExpenses || undefined,
    trendDescription,
  };
}
