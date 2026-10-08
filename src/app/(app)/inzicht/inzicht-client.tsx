"use client";

import Link from "next/link";
import * as echarts from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import { BarChart, LineChart } from "echarts/charts";
import type { AriaComponentOption, GridComponentOption, LegendComponentOption, TooltipComponentOption, DataZoomComponentOption } from "echarts/components";
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ArrowLeft, ArrowRight, BarChart3, CircleDollarSign, Download, Landmark, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, StatusBadge } from "@/components/ui";
import { ReportNavigation, type ReportDestinationId } from "@/components/finance/report-navigation";
import { downloadCsvFile, encodeExcelCsv } from "@/lib/csv";
import { getReportDestination, parseReportSlug } from "@/lib/report-destinations";
import { formatCurrency, formatMonthLabel, formatShortMonth } from "@/lib/format";
import type { BalanceForecastData } from "@/modules/finance/balance-forecast";
import type { FinancialHealthData } from "@/modules/finance/health-score";
import type { DashboardInsight } from "@/modules/finance/repository";
import type { Budget, FixedExpense } from "@/modules/finance/types";
import { moneyFlowLabels, resultLabel, resultStatus } from "@/modules/finance/ux-labels";
import { getExpenseCategoryBenchmark, getExpenseCategoryRows, getExpenseCategoryTrend } from "@/modules/finance/insight-category-series";
import { buildDecisionInsights } from "@/modules/finance/decision-insights";

type BalanceRow = DashboardInsight["balanceSeries"][number];
type CategoryRow = DashboardInsight["categorySeries"][number];
type BudgetGroup = { month: string; budgets: Budget[] };
type EChartsOption = echarts.ComposeOption<BarSeriesOption | LineSeriesOption | AriaComponentOption | GridComponentOption | LegendComponentOption | TooltipComponentOption | DataZoomComponentOption>;

const brandColor = "#173f3a";
const incomeColor = "#287767";
const expenseColor = "#d95738";
const savingsColor = "#6c5a8d";
const investColor = "#68736d";
const mutedColor = "#59615d";

echarts.use([BarChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

export function InzichtClient({ health, forecast, insight, fixedExpenses, budgetGroups, year, safeToSpend, lowestBalance, initialReport = "overview" }: { health: FinancialHealthData; forecast: BalanceForecastData; insight: DashboardInsight; fixedExpenses: FixedExpense[]; budgetGroups: BudgetGroup[]; year: string; safeToSpend: number; lowestBalance: number; initialReport?: Exclude<ReportDestinationId, "month"> }) {
  const [selectedMonth, setSelectedMonth] = useState(insight.latestMonth ?? insight.balanceSeries.at(-1)?.month ?? "");
  const [visibleMonths, setVisibleMonths] = useState<3 | 6 | 12 | "all">(6);
  const [activeReport, setActiveReport] = useState<Exclude<ReportDestinationId, "month">>(initialReport);
  const selectedIndex = Math.max(0, insight.balanceSeries.findIndex((row) => row.month === selectedMonth));
  const selectedRow = insight.balanceSeries[selectedIndex] ?? insight.balanceSeries.at(-1);
  const windowSize = visibleMonths === "all" ? insight.balanceSeries.length : visibleMonths;
  const start = Math.max(0, Math.min(selectedIndex - windowSize + 1, Math.max(0, insight.balanceSeries.length - windowSize)));
  const visibleRows = insight.balanceSeries.slice(start, start + windowSize);
  const selectedCategories = useMemo(() => getExpenseCategoryRows(insight.categorySeries, selectedRow?.month), [insight.categorySeries, selectedRow?.month]);
  const categoryBenchmark = useMemo(() => getExpenseCategoryBenchmark(insight.categorySeries, selectedRow?.month), [insight.categorySeries, selectedRow?.month]);
  const monthLabel = selectedRow ? formatMonthLabel(selectedRow.month) : "Geen maand";
  const netAfterNormalExpenses = selectedRow ? selectedRow.income + selectedRow.withdrawals - selectedRow.spendableExpenses : 0;
  const savingsShare = selectedRow && selectedRow.income > 0 ? Math.round(((selectedRow.savings + selectedRow.investments) / selectedRow.income) * 100) : 0;
  const topOutlier = categoryBenchmark[0];
  const yearRows = useMemo(() => buildYearRows(insight.balanceSeries, insight.categorySeries, year), [insight.balanceSeries, insight.categorySeries, year]);
  const fixedMonthlyTotal = fixedExpenses.reduce((sum, expense) => sum + monthlyFixedAmount(expense), 0);
  const decisionInsights = useMemo(() => buildDecisionInsights({ rows: insight.balanceSeries, selectedMonth: selectedRow?.month, safeToSpend, lowestBalance, fixedMonthlyTotal }), [insight.balanceSeries, selectedRow?.month, safeToSpend, lowestBalance, fixedMonthlyTotal]);

  useEffect(() => {
    const syncReportWithHash = () => {
      const section = new URLSearchParams(window.location.search).get("rapport") ?? window.location.hash.slice(1);
      setActiveReport(parseReportSlug(section));
    };
    syncReportWithHash();
    window.addEventListener("hashchange", syncReportWithHash);
    window.addEventListener("popstate", syncReportWithHash);
    return () => {
      window.removeEventListener("hashchange", syncReportWithHash);
      window.removeEventListener("popstate", syncReportWithHash);
    };
  }, []);

  function selectReport(report: Exclude<ReportDestinationId, "month">) {
    setActiveReport(report);
    window.history.pushState(null, "", getReportDestination(report).href);
  }

  return (
    <div className="cockpit-canvas grid gap-3">
      <section className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-accent">Rapporten</span>
              <StatusBadge tone={(selectedRow?.spendableNet ?? 0) >= 0 ? "success" : "warning"}>{resultStatus(selectedRow?.spendableNet ?? 0)}</StatusBadge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-brand-strong)] sm:text-4xl">Rapporten</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              Bekijk deze maand, ontwikkelingen door de tijd en wat je kunt verwachten.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setSelectedMonth(insight.balanceSeries[Math.max(0, selectedIndex - 1)]?.month ?? selectedMonth)} aria-label="Vorige maand">
              <ArrowLeft aria-hidden="true" size={14} />
            </Button>
            <span className="min-h-8 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-brand">{monthLabel}</span>
            <Button size="sm" variant="secondary" onClick={() => setSelectedMonth(insight.balanceSeries[Math.min(insight.balanceSeries.length - 1, selectedIndex + 1)]?.month ?? selectedMonth)} aria-label="Volgende maand">
              <ArrowRight aria-hidden="true" size={14} />
            </Button>
          </div>
        </div>
      </section>

      <ReportNavigation active={activeReport} onSelect={selectReport} />

      <section aria-labelledby="decision-insights-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Beslissen</p><h2 id="decision-insights-title" className="mt-1 text-2xl font-semibold text-brand">Vier antwoorden die ertoe doen</h2></div><span className="text-xs text-[var(--color-text-muted)]">Alle bedragen gebruiken hetzelfde rekencontract.</span></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {decisionInsights.map((item) => <article key={item.id} className={`rounded-[var(--radius-lg)] border p-3 ${item.tone === "attention" ? "border-amber-200 bg-amber-50" : item.tone === "positive" ? "border-emerald-200 bg-emerald-50" : "border-border bg-white"}`}><h3 className="text-sm font-semibold leading-5 text-brand">{item.question}</h3><p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{item.conclusion}</p><Link href={item.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">{item.action} <ArrowRight aria-hidden="true" size={13} /></Link></article>)}
        </div>
      </section>

      {activeReport === "overview" ? (
      <>
      <ReportSectionHeading id="overzicht" eyebrow="Overzicht" title={`Deze maand in één beeld`} description={`De belangrijkste bedragen van ${monthLabel}.`} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightKpi icon={<CircleDollarSign aria-hidden="true" size={17} />} label={resultLabel(selectedRow?.spendableNet ?? 0)} value={formatSignedCurrency(selectedRow?.spendableNet ?? 0)} tone={(selectedRow?.spendableNet ?? 0) >= 0 ? "positive" : "warning"} detail={`${formatCurrency(selectedRow?.income ?? 0)} binnen, ${formatCurrency((selectedRow?.spendableExpenses ?? 0) + (selectedRow?.savings ?? 0) + (selectedRow?.investments ?? 0))} eruit`} />
        <InsightKpi icon={<WalletCards aria-hidden="true" size={17} />} label="Vrij na gewone uitgaven" value={formatSignedCurrency(netAfterNormalExpenses)} tone={netAfterNormalExpenses >= 0 ? "positive" : "warning"} detail="Voor sparen, beleggen of bufferkeuzes." />
        <InsightKpi icon={<Landmark aria-hidden="true" size={17} />} label="Totaal saldo" value={formatCurrency(selectedRow?.totalBalance ?? insight.totalBalance)} detail={`Betaal ${formatCurrency(selectedRow?.paymentBalance ?? insight.paymentBalance)} / spaar ${formatCurrency(selectedRow?.savingsBalance ?? insight.savingsBalance)}`} />
        <InsightKpi icon={(forecast.trendDirection === "down" ? <TrendingDown aria-hidden="true" size={17} /> : <TrendingUp aria-hidden="true" size={17} />)} label="6 mnd verwachting" value={formatCurrency(forecast.forecastEnd)} tone={forecast.trendDirection === "down" ? "warning" : "positive"} detail={`Gemiddeld ${formatSignedCurrency(forecast.avgMonthlyNet)} per maand`} />
      </section>

      {selectedRow ? (
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.7fr)_minmax(18rem,0.75fr)]">
          <section className="surface-panel rounded-[var(--radius-lg)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand">Geld in {monthLabel}</h2>
              <StatusBadge tone={selectedRow.spendableNet >= 0 ? "success" : "warning"}>{formatSignedCurrency(selectedRow.spendableNet)}</StatusBadge>
            </div>
            <CashflowWaterfall row={selectedRow} />
          </section>

          <section className="surface-panel rounded-[var(--radius-lg)] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand">Uitgaven en inkomen</h2>
              <StatusBadge tone={selectedRow.spendableNet >= 0 ? "success" : "warning"}>{selectedRow.spendableNet >= 0 ? "ruimte" : "druk"}</StatusBadge>
            </div>
            <MonthPressureGauge row={selectedRow} />
          </section>

          <section className="surface-panel rounded-[var(--radius-lg)] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand">Grootste uitgaven</h2>
              <StatusBadge tone="info">top 5</StatusBadge>
            </div>
            <SpendingDonut rows={selectedCategories.slice(0, 5)} month={selectedRow.month} />
          </section>
        </section>
      ) : null}
      </>
      ) : null}

      {activeReport === "trends" ? (
      <>
      <ReportSectionHeading id="trends" eyebrow="Trends" title="Wat verandert er?" description="Vergelijk maanden en ontdek welke uitgaven opvallen." />

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <section className="surface-panel rounded-[var(--radius-lg)] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-brand">Blijft je financiële ruimte op koers?</h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{decisionInsights[0]?.conclusion} Kies een maand voor de details.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[3, 6, 12].map((months) => (
                <Button key={months} size="sm" variant={visibleMonths === months ? "primary" : "secondary"} onClick={() => setVisibleMonths(months as 3 | 6 | 12)}>{months} mnd</Button>
              ))}
              <Button size="sm" variant={visibleMonths === "all" ? "primary" : "secondary"} onClick={() => setVisibleMonths("all")}>Alles</Button>
            </div>
          </div>
          <BalanceAndResultChart rows={visibleRows} selectedMonth={selectedRow?.month} onSelect={setSelectedMonth} />
        </section>

        <section className="surface-panel rounded-[var(--radius-lg)] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand">Deze maand</h2>
            <StatusBadge tone={savingsShare >= 10 ? "success" : "info"}>{savingsShare}% naar spaar/beleggen</StatusBadge>
          </div>
          <div className="grid gap-2">
            <FlowRow label={moneyFlowLabels.income} value={selectedRow?.income ?? 0} tone="positive" />
            <FlowRow label={moneyFlowLabels.savingsOut} value={selectedRow?.withdrawals ?? 0} tone="positive" />
            <FlowRow label={moneyFlowLabels.expenses} value={selectedRow?.spendableExpenses ?? 0} />
            <FlowRow label={moneyFlowLabels.savingsIn} value={selectedRow?.savings ?? 0} />
            <FlowRow label={moneyFlowLabels.investmentsIn} value={selectedRow?.investments ?? 0} />
          </div>
          <div className="mt-3 rounded-md border border-border bg-white p-3 text-xs">
            <p className="font-semibold text-brand">Kort uitgelegd</p>
            <p className="mt-1 leading-5 text-[var(--color-text-muted)]">
              {selectedRow && selectedRow.spendableNet >= 0
                ? `Deze maand bleef ${formatCurrency(selectedRow.spendableNet)} over na gewone uitgaven, sparen en beleggen.`
                : `Deze maand ging er ${formatCurrency(Math.abs(selectedRow?.spendableNet ?? 0))} meer uit dan er beschikbaar was.`}
              {topOutlier ? ` Grootste afwijking: ${topOutlier.label} (${formatSignedCurrency(topOutlier.delta)} t.o.v. recente maanden).` : ""}
            </p>
          </div>
        </section>
      </section>

      <section className="surface-panel rounded-[var(--radius-lg)] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand">Welke uitgaven wijken af?</h2>
          <BarChart3 aria-hidden="true" className="text-[var(--color-text-subtle)]" size={18} />
        </div>
        <CategoryBenchmark rows={categoryBenchmark} month={selectedRow?.month} />
      </section>

      <section className="surface-panel rounded-[var(--radius-lg)] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-brand">Welke uitgaven veranderen structureel?</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Volg je grootste categorieën over 12 maanden. Klik via de categorieverschillen door naar de brontransacties.</p>
          </div>
          <StatusBadge tone="neutral">12 mnd</StatusBadge>
        </div>
        <CategoryTrendChart rows={insight.categorySeries} months={insight.balanceSeries.slice(-12).map((row) => row.month)} />
      </section>
      </>
      ) : null}

      {activeReport === "year" ? (
      <>
      <ReportSectionHeading id="jaar" eyebrow="Jaar" title={`Heel ${year} naast elkaar`} description="Bekijk iedere maand en het totaal van het jaar." />

      <section className="surface-panel rounded-[var(--radius-lg)] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-brand">Het jaar {year}</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Bedragen per maand en het totaal van het jaar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">{yearRows.months.length} maanden</StatusBadge>
            <Button size="sm" variant="secondary" onClick={() => downloadYearCsv(yearRows, year)}>
              <Download aria-hidden="true" size={14} />
              Download CSV
            </Button>
          </div>
        </div>
        <YearMatrix rows={yearRows.rows} months={yearRows.months} />
      </section>
      </>
      ) : null}

      {activeReport === "forecast" ? (
      <>
      <ReportSectionHeading id="verwachting" eyebrow="Verwachting" title="Wat komt eraan?" description="Een vooruitblik op basis van je vaste lasten, buffer en recente maanden." />

      <section className="grid gap-3 xl:grid-cols-3">
        <FixedCostDashboard fixedExpenses={fixedExpenses} monthlyTotal={fixedMonthlyTotal} selectedRow={selectedRow} />
        <BufferDashboard selectedRow={selectedRow} insight={insight} health={health} />
        <BudgetDashboard budgetGroups={budgetGroups} selectedMonth={selectedRow?.month} />
      </section>

      <section className="surface-panel rounded-[var(--radius-lg)] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-brand">Waar kan je saldo over zes maanden uitkomen?</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Bij een gemiddeld maandverschil van {formatSignedCurrency(forecast.avgMonthlyNet)} komt de middenraming uit op {formatCurrency(forecast.forecastEnd)}.</p>
          </div>
          <StatusBadge tone={health.bufferStatus === "critical" ? "warning" : health.bufferStatus === "warning" ? "info" : "success"}>{health.label}</StatusBadge>
        </div>
        <ForecastChart forecast={forecast} />
      </section>
      </>
      ) : null}
    </div>
  );
}

function ReportSectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description: string }) {
  return (
    <header id={id} className="report-section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{description}</span>
    </header>
  );
}

function BalanceAndResultChart({ rows, selectedMonth, onSelect }: { rows: BalanceRow[]; selectedMonth?: string; onSelect: (month: string) => void }) {
  if (!rows.length) return <EmptyChart />;
  const option: EChartsOption = {
    color: [brandColor, savingsColor, "#94a3b8"],
    animationDuration: 400,
    tooltip: { trigger: "axis", valueFormatter: (value) => formatCurrency(Number(value)) },
    legend: { top: 4, left: 8, textStyle: { color: mutedColor, fontSize: 11, fontWeight: 600 } },
    grid: { left: 72, right: 22, top: 48, bottom: 42 },
    xAxis: { type: "category", data: rows.map((row) => formatShortMonth(row.month)), axisLabel: { color: mutedColor, fontWeight: 600 } },
    yAxis: { type: "value", axisLabel: { color: mutedColor, formatter: (value: number) => compactEuro(value) }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } } },
    series: [
      { name: "Totaal saldo", type: "line", smooth: true, data: rows.map((row) => row.totalBalance), lineStyle: { width: 3 }, symbolSize: 7 },
      { name: "Spaarrekening", type: "line", smooth: true, data: rows.map((row) => row.savingsBalance), lineStyle: { width: 2 }, symbolSize: 6 },
      {
        name: "Onder aan de streep",
        type: "bar",
        data: rows.map((row) => row.spendableNet),
        barMaxWidth: 26,
        itemStyle: { borderRadius: 5, color: (params) => (Number(params.value) >= 0 ? "rgba(4,120,87,0.32)" : "rgba(180,83,9,0.36)") },
      },
    ],
  };
  return (
    <>
      <EChartsPanel className="hidden h-80 md:block" option={option} onDataPointClick={(index) => onSelect(rows[index]?.month ?? selectedMonth ?? "")} />
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <button key={row.month} type="button" onClick={() => onSelect(row.month)} className={row.month === selectedMonth ? "rounded-md border border-brand bg-[var(--color-brand-subtle)] p-3 text-left" : "rounded-md border border-border bg-white p-3 text-left"}>
            <div className="flex items-center justify-between gap-2">
              <strong className="text-brand">{formatMonthLabel(row.month)}</strong>
              <span className={row.spendableNet >= 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-amber-800"}>{formatSignedCurrency(row.spendableNet)}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Saldo {formatCurrency(row.totalBalance)}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function CashflowWaterfall({ row }: { row: BalanceRow }) {
  const items = [
    { label: "Inkomen", value: row.income, color: incomeColor },
    { label: "Uit sparen", value: row.withdrawals, color: "#5b43b7" },
    { label: "Uitgaven", value: -row.spendableExpenses, color: brandColor },
    { label: "Sparen", value: -row.savings, color: "#2563eb" },
    { label: "Beleggen", value: -row.investments, color: investColor },
  ];
  const steps = items.reduce<Array<{ label: string; value: number; start: number; end: number; color: string }>>((acc, item) => {
    const start = acc.at(-1)?.end ?? 0;
    acc.push({ ...item, start, end: start + item.value });
    return acc;
  }, []);
  const result = {
    label: resultLabel(row.spendableNet),
    value: row.spendableNet,
    start: 0,
    end: row.spendableNet,
    color: row.spendableNet >= 0 ? incomeColor : expenseColor,
  };
  const chartRows = [...steps, result];
  const width = 780;
  const height = 330;
  const padding = { top: 28, right: 24, bottom: 62, left: 58 };
  const values = chartRows.flatMap((item) => [item.start, item.end]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const y = (value: number) => padding.top + ((max - value) / span) * (height - padding.top - padding.bottom);
  const plotWidth = width - padding.left - padding.right;
  const slot = plotWidth / chartRows.length;
  const barWidth = Math.min(66, slot * 0.58);
  const zeroY = y(0);

  return (
    <div className="overflow-hidden rounded-md bg-gradient-to-b from-[#f0f7fb] to-white">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Maandmotor cashflow" className="h-auto w-full">
        <rect x={padding.left} y={padding.top} width={plotWidth} height={height - padding.top - padding.bottom} rx="10" fill="rgba(231,240,247,0.78)" />
        {[max, 0, min].map((tick, index) => (
          <g key={`${tick}-${index}`}>
            <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} stroke="white" strokeWidth="1" />
            <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {compactEuro(tick)}
            </text>
          </g>
        ))}
        <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke="#b9c8d6" strokeWidth="1.5" />
        {chartRows.map((item, index) => {
          const x = padding.left + slot * index + (slot - barWidth) / 2;
          const top = y(Math.max(item.start, item.end));
          const bottom = y(Math.min(item.start, item.end));
          const heightValue = Math.max(5, bottom - top);
          const isResult = index === chartRows.length - 1;
          const labelY = item.value >= 0 ? top - 9 : bottom + 18;
          const connectorY = y(item.end);
          const nextX = padding.left + slot * (index + 1) + (slot - barWidth) / 2;
          return (
            <g key={`${item.label}-${index}`}>
              {!isResult && index < steps.length - 1 ? <line x1={x + barWidth} x2={nextX} y1={connectorY} y2={connectorY} stroke="#8aa0b5" strokeDasharray="4 5" strokeWidth="1.2" /> : null}
              <rect x={x} y={top} width={barWidth} height={heightValue} rx="8" fill={item.color} opacity={isResult ? "0.96" : "0.86"} />
              <text x={x + barWidth / 2} y={Math.max(14, Math.min(height - 18, labelY))} textAnchor="middle" fontSize="12" fontWeight="800" fill={item.color}>
                {compactEuro(item.value)}
              </text>
              <text x={x + barWidth / 2} y={height - 34} textAnchor="middle" fontSize="12" fontWeight={isResult ? "800" : "650"} fill={brandColor}>
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MonthPressureGauge({ row }: { row: BalanceRow }) {
  const inflow = row.income + row.withdrawals;
  const committed = row.spendableExpenses + row.savings + row.investments;
  const pressure = inflow > 0 ? committed / inflow : 0;
  const capped = Math.min(Math.max(pressure, 0), 1);
  const excess = Math.min(Math.max(pressure - 1, 0), 1);
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * capped;
  const excessProgress = circumference * excess;
  const tone = pressure <= 0.88 ? incomeColor : pressure <= 1 ? "#d97706" : expenseColor;

  return (
    <div className="grid items-center gap-3 sm:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-1">
      <svg viewBox="0 0 220 220" role="img" aria-label="Maanddruk meter" className="mx-auto h-auto w-full max-w-[13rem]">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="#dfe9f1" strokeWidth="20" />
        <circle cx="110" cy="110" r={radius} fill="none" stroke={tone} strokeWidth="20" strokeLinecap="round" strokeDasharray={`${progress} ${circumference - progress}`} transform="rotate(-90 110 110)" />
        {excess > 0 ? <circle cx="110" cy="110" r="50" fill="none" stroke={expenseColor} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${excessProgress * 0.68} ${circumference}`} transform="rotate(-90 110 110)" opacity="0.82" /> : null}
        <text x="110" y="102" textAnchor="middle" fontSize="28" fontWeight="800" fill={brandColor}>{Math.round(pressure * 100)}%</text>
        <text x="110" y="126" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="2" fill="#6f7f91">DRUK</text>
      </svg>
      <div className="grid gap-2 text-xs">
        <GaugeLine label="Binnen" value={inflow} color={incomeColor} />
        <GaugeLine label="Vastgelegd" value={committed} color={tone} />
        <GaugeLine label={resultLabel(row.spendableNet)} value={row.spendableNet} color={row.spendableNet >= 0 ? incomeColor : expenseColor} signed />
      </div>
    </div>
  );
}

function GaugeLine({ label, value, color, signed = false }: { label: string; value: number; color: string; signed?: boolean }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-white/80 px-2.5 py-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate font-semibold text-[var(--color-text-muted)]">{label}</span>
      <strong className="tabular-nums text-brand">{signed ? formatSignedCurrency(value) : formatCurrency(value)}</strong>
    </div>
  );
}

function SpendingDonut({ rows, month }: { rows: CategoryRow[]; month?: string }) {
  if (!rows.length) return <EmptyChart label="Geen categorie-uitgaven in deze maand." />;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const colors = [brandColor, expenseColor, incomeColor, savingsColor, investColor];
  const segments = rows.map((row, index) => {
    const start = total > 0 ? rows.slice(0, index).reduce((sum, item) => sum + item.amount, 0) / total : 0;
    const fraction = total > 0 ? row.amount / total : 0;
    return { ...row, start, fraction, color: colors[index % colors.length] };
  });

  return (
    <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-1">
      <div className="relative mx-auto aspect-square w-full max-w-[12rem]">
        <svg viewBox="0 0 220 220" role="img" aria-label="Uitgavenmix top 5" className="h-full w-full">
          <circle cx="110" cy="110" r="74" fill="none" stroke="#e6edf4" strokeWidth="28" />
          {segments.map((segment) => (
            <circle
              key={segment.categoryId ?? segment.label}
              cx="110"
              cy="110"
              r="74"
              fill="none"
              stroke={segment.color}
              strokeWidth="28"
              strokeDasharray={`${segment.fraction * 465} ${465 - segment.fraction * 465}`}
              strokeDashoffset={-segment.start * 465}
              strokeLinecap="butt"
              transform="rotate(-90 110 110)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <strong className="block text-xl tabular-nums text-brand">{compactEuro(total)}</strong>
            <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">top mix</span>
          </div>
        </div>
      </div>
      <div className="grid gap-2 text-xs">
        {segments.map((row) => (
          <Link key={row.categoryId ?? row.label} href={`/transacties?categoryId=${row.categoryId ?? "geen"}&month=${month ?? "alle"}&kind=uitgaven`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-white/80 px-2.5 py-2 transition hover:border-brand">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="min-w-0 truncate font-semibold text-[var(--color-text-muted)]">{row.label}</span>
            <strong className="tabular-nums text-brand">{formatCurrency(row.amount)}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryBenchmark({ rows, month }: { rows: Array<CategoryRow & { average: number; delta: number }>; month?: string }) {
  if (!rows.length) return <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-[var(--color-text-muted)]">Nog geen categoriegegevens.</p>;
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <div className="grid gap-2">
      {rows.slice(0, 10).map((row) => (
        <Link key={row.categoryId ?? row.label} href={`/transacties?categoryId=${row.categoryId ?? "geen"}&month=${month ?? "alle"}&kind=uitgaven`} className="grid gap-1 rounded-md border border-border bg-white p-2 text-xs transition hover:border-brand">
          <div className="flex items-center justify-between gap-3">
            <strong className="min-w-0 truncate text-brand">{row.label}</strong>
            <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(row.amount)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, Math.round((row.amount / max) * 100))}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[0.68rem] text-[var(--color-text-subtle)]">
            <span>Gem. vorige maanden {formatCurrency(row.average)}</span>
            <span className={row.delta > 0 ? "font-semibold text-amber-800" : "font-semibold text-emerald-700"}>{formatSignedCurrency(row.delta)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function YearMatrix({ rows, months }: { rows: YearMatrixRow[]; months: string[] }) {
  return (
    <div className="table-responsive">
      <table className="w-full min-w-[72rem] border-collapse text-xs">
        <thead className="border-b border-border text-[var(--color-text-subtle)]">
          <tr>
            <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left">Post</th>
            {months.map((month) => (
              <th key={month} className="px-2 py-2 text-right">{formatShortMonth(month)}</th>
            ))}
            <th className="px-2 py-2 text-right">Jaar/eind</th>
            <th className="py-2 pl-2 text-right">Gem.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.label} className={row.strong ? "bg-[var(--color-surface)] font-semibold" : undefined}>
              <td className="sticky left-0 z-10 bg-inherit py-2 pr-3 text-left font-semibold text-brand">{row.label}</td>
              {row.values.map((value, index) => (
                <td key={`${row.label}-${months[index]}`} className={cellClass(value, row.invertTone)}>{formatMatrixCurrency(value)}</td>
              ))}
              <td className={cellClass(row.total, row.invertTone, true)}>{formatMatrixCurrency(row.total)}</td>
              <td className={cellClass(row.average, row.invertTone, true)}>{formatMatrixCurrency(row.average)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixedCostDashboard({ fixedExpenses, monthlyTotal, selectedRow }: { fixedExpenses: FixedExpense[]; monthlyTotal: number; selectedRow?: BalanceRow }) {
  const ratio = selectedRow && selectedRow.income > 0 ? Math.round((monthlyTotal / selectedRow.income) * 100) : 0;
  const top = [...fixedExpenses].sort((a, b) => monthlyFixedAmount(b) - monthlyFixedAmount(a)).slice(0, 5);
  return (
    <section className="surface-panel rounded-[var(--radius-lg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand">Vaste lasten</h2>
        <StatusBadge tone={ratio > 50 ? "warning" : "info"}>{ratio}% van inkomen</StatusBadge>
      </div>
      <InsightKpi icon={<Landmark aria-hidden="true" size={17} />} label="Maandbasis" value={formatCurrency(monthlyTotal)} detail={`${fixedExpenses.length} beheerde vaste lasten`} />
      <div className="mt-3 grid gap-2">
        {top.map((expense) => (
          <FlowRow key={expense.id} label={expense.supplier} value={monthlyFixedAmount(expense)} />
        ))}
        {!top.length ? <p className="text-xs text-[var(--color-text-muted)]">Nog geen vaste lasten beheerd.</p> : null}
      </div>
      <Link href="/vaste-lasten" className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline">Vaste lasten beheren</Link>
    </section>
  );
}

function BufferDashboard({ selectedRow, insight, health }: { selectedRow?: BalanceRow; insight: DashboardInsight; health: FinancialHealthData }) {
  const cashBuffer = selectedRow?.paymentBalance ?? insight.paymentBalance;
  const savings = selectedRow?.savingsBalance ?? insight.savingsBalance;
  const netSavingsMovement = (selectedRow?.savings ?? 0) - (selectedRow?.withdrawals ?? 0);
  return (
    <section className="surface-panel rounded-[var(--radius-lg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand">Buffer en sparen</h2>
        <StatusBadge tone={health.bufferStatus === "critical" ? "warning" : health.bufferStatus === "warning" ? "info" : "success"}>{roundMoney(health.bufferMonths)} mnd</StatusBadge>
      </div>
      <div className="grid gap-2">
        <FlowRow label="Betaalbuffer" value={cashBuffer} tone="positive" />
        <FlowRow label="Spaarrekening" value={savings} tone="positive" />
        <FlowRow label="Netto spaarbeweging maand" value={netSavingsMovement} tone={netSavingsMovement >= 0 ? "positive" : "neutral"} />
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">Potjes en weekgeld zijn tijdelijke buffers; de bankstand op de spaarrekening blijft leidend.</p>
    </section>
  );
}

function BudgetDashboard({ budgetGroups, selectedMonth }: { budgetGroups: BudgetGroup[]; selectedMonth?: string }) {
  const selected = budgetGroups.find((group) => group.month === selectedMonth) ?? budgetGroups.find((group) => group.budgets.length) ?? budgetGroups[0];
  const planned = selected?.budgets.reduce((sum, budget) => sum + budget.planned, 0) ?? 0;
  const actual = selected?.budgets.reduce((sum, budget) => sum + budget.actual, 0) ?? 0;
  const delta = planned - actual;
  return (
    <section className="surface-panel rounded-[var(--radius-lg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand">Budget vs werkelijk</h2>
        <StatusBadge tone={delta >= 0 ? "success" : "warning"}>{selected ? formatShortMonth(selected.month) : "Geen budget"}</StatusBadge>
      </div>
      <div className="grid gap-2">
        <FlowRow label="Gepland" value={planned} />
        <FlowRow label="Werkelijk" value={actual} />
        <FlowRow label="Resterend" value={delta} tone={delta >= 0 ? "positive" : "neutral"} />
      </div>
      <Link href={`/budgetten${selected?.month ? `?month=${selected.month}` : ""}`} className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline">Budgetten bekijken</Link>
    </section>
  );
}

function CategoryTrendChart({ rows, months }: { rows: DashboardInsight["categorySeries"]; months: string[] }) {
  const categories = getExpenseCategoryTrend(rows, months);
  if (!months.length || !categories.length) return <EmptyChart label="Nog geen categorie-trends beschikbaar." />;
  const option: EChartsOption = {
    color: [brandColor, expenseColor, incomeColor, savingsColor, investColor, "#db2777"],
    animationDuration: 400,
    tooltip: { trigger: "axis", valueFormatter: (value) => formatCurrency(Number(value)) },
    legend: { top: 4, left: 8, type: "scroll", textStyle: { color: mutedColor, fontSize: 11, fontWeight: 600 } },
    grid: { left: 72, right: 22, top: 58, bottom: 38 },
    xAxis: { type: "category", data: months.map(formatShortMonth), axisLabel: { color: mutedColor, fontWeight: 600 } },
    yAxis: { type: "value", axisLabel: { color: mutedColor, formatter: (value: number) => compactEuro(value) }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } } },
    series: categories.map((category): LineSeriesOption => ({
      name: category.label,
      type: "line",
      smooth: true,
      symbolSize: 5,
      data: category.values,
    })),
  };
  return <EChartsPanel className="h-80" option={option} />;
}

function ForecastChart({ forecast }: { forecast: BalanceForecastData }) {
  const rows = [...forecast.history, ...forecast.forecast];
  if (rows.length < 2) return <EmptyChart label="Nog te weinig historie voor een vooruitblik." />;
  const option: EChartsOption = {
    color: [brandColor, investColor, "#c4b5fd"],
    animationDuration: 400,
    tooltip: { trigger: "axis", valueFormatter: (value) => formatCurrency(Number(value)) },
    legend: { top: 4, left: 8, textStyle: { color: mutedColor, fontSize: 11, fontWeight: 600 } },
    grid: { left: 72, right: 22, top: 48, bottom: 38 },
    xAxis: { type: "category", data: rows.map((row) => formatShortMonth(row.month)), axisLabel: { color: mutedColor, fontWeight: 600 } },
    yAxis: { type: "value", axisLabel: { color: mutedColor, formatter: (value: number) => compactEuro(value) }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } } },
    series: [
      { name: "Werkelijk", type: "line", smooth: true, data: rows.map((row) => (row.isForecast ? null : row.balance)), lineStyle: { width: 3 }, symbolSize: 7 },
      { name: "Verwachting", type: "line", smooth: true, data: rows.map((row) => row.balance), lineStyle: { width: 2, type: "dashed" }, symbolSize: 5 },
      { name: "Bandbreedte hoog", type: "line", smooth: true, data: rows.map((row) => row.upperBound ?? null), lineStyle: { opacity: 0.45 }, symbol: "none" },
      { name: "Bandbreedte laag", type: "line", smooth: true, data: rows.map((row) => row.lowerBound ?? null), lineStyle: { opacity: 0.45 }, symbol: "none" },
    ],
  };
  return <EChartsPanel className="h-80" option={option} />;
}

function InsightKpi({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "neutral" | "positive" | "warning" }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "warning" ? "text-amber-800" : "text-brand";
  return (
    <article className="surface-panel rounded-[var(--radius-lg)] p-3">
      <div className="mb-2 flex items-center gap-2 text-[var(--color-text-subtle)]">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-surface)] text-brand">{icon}</span>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <strong className={`block truncate text-2xl tabular-nums ${valueClass}`}>{value}</strong>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{detail}</p>
    </article>
  );
}

function FlowRow({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "positive" }) {
  return (
    <div className="metric-surface flex items-center justify-between gap-3 rounded-md px-3 py-2 text-xs">
      <span className="font-semibold text-[var(--color-text-muted)]">{label}</span>
      <strong className={tone === "positive" ? "tabular-nums text-emerald-700" : "tabular-nums text-brand"}>{formatCurrency(value)}</strong>
    </div>
  );
}

function EChartsPanel({ option, className, onDataPointClick }: { option: EChartsOption; className?: string; onDataPointClick?: (dataIndex: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(element);
    chart.setOption({ aria: { enabled: true, decal: { show: true } }, ...option }, true);
    if (onDataPointClick) {
      chart.on("click", (params) => {
        if (typeof params.dataIndex === "number") onDataPointClick(params.dataIndex);
      });
    }
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [onDataPointClick, option]);
  return <div ref={ref} className={className} data-testid="financial-chart" role="img" aria-label="Interactieve financiële grafiek; dezelfde gegevens staan ook in tekst op deze pagina." />;
}

interface YearMatrixRow {
  label: string;
  values: Array<number | null>;
  total: number | null;
  average: number | null;
  strong?: boolean;
  invertTone?: boolean;
}

function buildYearRows(rows: BalanceRow[], categoryRows: DashboardInsight["categorySeries"], year: string) {
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const monthsWithData = new Set([...rows.map((row) => row.month), ...categoryRows.map((row) => row.month)]);
  const categoryAmount = (month: string, kind: CategoryRow["kind"]) => categoryRows.filter((row) => row.month === month && row.kind === kind).reduce((sum, row) => sum + row.amount, 0);
  const specs = [
    { label: "Inkomsten", type: "flow", get: (row?: BalanceRow) => row?.income ?? 0 },
    { label: "Vaste lasten", type: "flow", get: (_row: BalanceRow | undefined, month: string) => categoryAmount(month, "vaste_last") },
    { label: "Variabele uitgaven", type: "flow", get: (_row: BalanceRow | undefined, month: string) => categoryAmount(month, "variabele_uitgave") },
    { label: "Reserveringen", type: "flow", get: (_row: BalanceRow | undefined, month: string) => categoryAmount(month, "reservering") },
    { label: "Gewone uitgaven totaal", type: "flow", get: (row?: BalanceRow) => row?.spendableExpenses ?? 0 },
    { label: "Naar sparen", type: "flow", get: (row?: BalanceRow) => row?.savings ?? 0 },
    { label: "Uit sparen/buffer", type: "flow", get: (row?: BalanceRow) => row?.withdrawals ?? 0 },
    { label: "Beleggen", type: "flow", get: (row?: BalanceRow) => row?.investments ?? 0 },
    { label: "Onder aan de streep", type: "flow", get: (row?: BalanceRow) => row?.spendableNet ?? 0, strong: true, invertTone: true },
    { label: "Saldo betaalrekeningen", type: "balance", get: (row?: BalanceRow) => row?.paymentBalance ?? 0, strong: true, invertTone: true },
    { label: "Saldo spaarrekeningen", type: "balance", get: (row?: BalanceRow) => row?.savingsBalance ?? 0, strong: true, invertTone: true },
    { label: "Totaal saldo", type: "balance", get: (row?: BalanceRow) => row?.totalBalance ?? 0, strong: true, invertTone: true },
  ];
  const matrixRows = specs.map((spec) => {
    const values = months.map((month) => (monthsWithData.has(month) ? roundMoney(spec.get(byMonth.get(month), month)) : null));
    const knownValues = values.filter((value): value is number => value !== null);
    const total = knownValues.length ? roundMoney(spec.type === "balance" ? knownValues.at(-1) ?? 0 : knownValues.reduce((sum, value) => sum + value, 0)) : null;
    const average = total === null ? null : roundMoney(knownValues.reduce((sum, value) => sum + value, 0) / Math.max(1, knownValues.length));
    return { label: spec.label, values, total, average, strong: spec.strong, invertTone: spec.invertTone };
  });
  return { months, rows: matrixRows };
}

function downloadYearCsv(yearData: ReturnType<typeof buildYearRows>, year: string) {
  const headers = ["Post", ...yearData.months.map((month) => formatMonthLabel(month)), "Jaartotaal / eindsaldo", "Gemiddelde"];
  const rows = yearData.rows.map((row) => [row.label, ...row.values, row.total, row.average]);
  downloadCsvFile(`huishouden-jaaroverzicht-${year}.csv`, encodeExcelCsv([headers, ...rows]));
}

function cellClass(value: number | null, invertTone = false, strong = false) {
  if (value === null) return `px-2 py-2 text-right tabular-nums ${strong ? "font-semibold" : "font-medium"} text-[var(--color-text-subtle)]`;
  const tone = value < 0 ? (invertTone ? "text-amber-800" : "text-emerald-700") : value > 0 && invertTone ? "text-emerald-700" : "text-[var(--color-text)]";
  return `px-2 py-2 text-right tabular-nums ${strong ? "font-semibold" : "font-medium"} ${tone}`;
}

function formatMatrixCurrency(value: number | null) {
  return value === null ? "-" : formatCurrency(value);
}

function monthlyFixedAmount(expense: FixedExpense) {
  if (expense.frequency === "vierwekelijks") return roundMoney(expense.amount * 13 / 12);
  if (expense.frequency === "jaarlijks") return roundMoney(expense.amount / 12);
  if (expense.frequency === "kwartaal") return roundMoney(expense.amount / 3);
  return expense.amount;
}

function monthMonitorBarClass(tone: "positive" | "negative" | "neutral" | "invest" | "resultPositive" | "resultNegative") {
  if (tone === "positive" || tone === "resultPositive") return "bg-emerald-600";
  if (tone === "negative" || tone === "resultNegative") return "bg-amber-600";
  if (tone === "invest") return "bg-violet-600";
  return "bg-brand";
}

function monthMonitorValueClass(tone: "positive" | "negative" | "neutral" | "invest" | "resultPositive" | "resultNegative") {
  if (tone === "positive" || tone === "resultPositive") return "shrink-0 tabular-nums text-emerald-700";
  if (tone === "negative" || tone === "resultNegative") return "shrink-0 tabular-nums text-amber-800";
  if (tone === "invest") return "shrink-0 tabular-nums text-[var(--color-invest)]";
  return "shrink-0 tabular-nums text-brand";
}

function EmptyChart({ label = "Geen data beschikbaar." }: { label?: string }) {
  return <div className="grid h-64 place-items-center rounded-md border border-dashed border-border text-xs text-[var(--color-text-muted)]">{label}</div>;
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function compactEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
