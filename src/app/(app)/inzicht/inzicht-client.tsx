"use client";

import Link from "next/link";
import * as echarts from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import { BarChart, LineChart } from "echarts/charts";
import type { AriaComponentOption, GridComponentOption, LegendComponentOption, TooltipComponentOption, DataZoomComponentOption } from "echarts/components";
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, PageHeader, StatusBadge } from "@/components/ui";
import { ReportNavigation, type ReportDestinationId } from "@/components/finance/report-navigation";
import { downloadCsvFile, encodeExcelCsv } from "@/lib/csv";
import { observeTheme, readChartTheme, type ChartTheme } from "@/lib/chart-theme";
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

/** Chart colours come from CSS tokens so SVG charts follow the theme without re-rendering. */
const chartVar = (index: 1 | 2 | 3 | 4 | 5) => `var(--chart-${index})`;
const cardClass = "border border-border bg-[var(--color-panel-strong)] p-5 md:p-6";
const labelClass = "text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
const chartFont = "Montserrat";

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
  const spendableNet = selectedRow?.spendableNet ?? 0;

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
    <>
      <PageHeader
        eyebrow="Rapporten"
        title="Rapporten"
        description={`Bekijk ${monthLabel}, ontwikkelingen door de tijd en wat je kunt verwachten.`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={spendableNet >= 0 ? "success" : "warning"}>{resultStatus(spendableNet)}</StatusBadge>
            <Button size="sm" variant="secondary" onClick={() => setSelectedMonth(insight.balanceSeries[Math.max(0, selectedIndex - 1)]?.month ?? selectedMonth)} aria-label="Vorige maand">
              <ArrowLeft aria-hidden="true" size={14} />
            </Button>
            <span className="inline-flex min-h-8 items-center justify-center border border-[var(--color-border-strong)] px-2.5 text-[0.66rem] uppercase tracking-[0.1em] text-[var(--color-text)] sm:min-w-[9rem] sm:px-3 sm:tracking-[0.18em]">{monthLabel}</span>
            <Button size="sm" variant="secondary" onClick={() => setSelectedMonth(insight.balanceSeries[Math.min(insight.balanceSeries.length - 1, selectedIndex + 1)]?.month ?? selectedMonth)} aria-label="Volgende maand">
              <ArrowRight aria-hidden="true" size={14} />
            </Button>
          </div>
        }
        stats={[
          { label: resultLabel(spendableNet), value: formatSignedCurrency(spendableNet), detail: `${formatCurrency(selectedRow?.income ?? 0)} binnen, ${formatCurrency((selectedRow?.spendableExpenses ?? 0) + (selectedRow?.savings ?? 0) + (selectedRow?.investments ?? 0))} eruit`, lead: true, tone: spendableNet < 0 ? "risk" : undefined },
          { label: "Vrij na gewone uitgaven", value: formatSignedCurrency(netAfterNormalExpenses), detail: "Voor sparen, beleggen of buffer", tone: netAfterNormalExpenses < 0 ? "risk" : undefined },
          { label: "Totaal saldo", value: formatCurrency(selectedRow?.totalBalance ?? insight.totalBalance), detail: `Betaal ${formatCurrency(selectedRow?.paymentBalance ?? insight.paymentBalance)} · spaar ${formatCurrency(selectedRow?.savingsBalance ?? insight.savingsBalance)}` },
          { label: "6 mnd verwachting", value: forecast.forecast.length ? formatCurrency(forecast.forecastEnd) : "—", detail: forecast.forecast.length ? `Historisch tempo ${formatSignedCurrency(forecast.avgMonthlyNet)} per maand` : "Minimaal drie afgeronde maanden nodig", tone: forecast.forecast.length && forecast.trendDirection === "down" ? "risk" : undefined },
        ]}
      />

      <ReportNavigation active={activeReport} onSelect={selectReport} />

      <section className="mb-10" aria-labelledby="decision-insights-title">
        <div className="section-head">
          <h2 id="decision-insights-title">Vier antwoorden</h2>
          <p>Wat ertoe doet voor je volgende beslissing. Alle bedragen gebruiken hetzelfde rekencontract.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {decisionInsights.map((item) => (
            <article key={item.id} className={`flex flex-col border border-border bg-[var(--color-panel-strong)] p-5 ${item.tone === "attention" ? "border-t-2 border-t-[var(--color-warning)]" : item.tone === "positive" ? "border-t-2 border-t-[var(--color-success)]" : ""}`}>
              <p className={`${labelClass} flex items-center gap-2`}>
                {item.tone !== "neutral" ? <span aria-hidden="true" className="h-1.5 w-1.5" style={{ backgroundColor: item.tone === "attention" ? "var(--color-warning)" : "var(--color-success)" }} /> : null}
                {item.tone === "attention" ? "Let op" : item.tone === "positive" ? "Op koers" : "Ter info"}
              </p>
              <h3 className="mt-3 text-base font-normal leading-6 text-[var(--color-text)]">{item.question}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--color-text-muted)]">{item.conclusion}</p>
              <Link href={item.href} className="mt-4 inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--color-text)] hover:underline">{item.action} <ArrowRight aria-hidden="true" size={13} /></Link>
            </article>
          ))}
        </div>
      </section>

      {activeReport === "overview" ? (
        <section id="overzicht" className="mb-10">
          <div className="section-head">
            <h2>Deze maand in één beeld</h2>
            <p>Hoe het geld van {monthLabel} binnenkwam en weer uitging.</p>
          </div>
          {selectedRow ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.7fr)_minmax(18rem,0.75fr)]">
              <section className={cardClass}>
                <CardHead label="Geldstroom" title={`Geld in ${monthLabel}`} aside={<StatusBadge tone={selectedRow.spendableNet >= 0 ? "success" : "warning"}>{formatSignedCurrency(selectedRow.spendableNet)}</StatusBadge>} />
                <CashflowWaterfall row={selectedRow} />
              </section>
              <section className={cardClass}>
                <CardHead label="Maanddruk" title="Uitgaven en inkomen" aside={<StatusBadge tone={selectedRow.spendableNet >= 0 ? "success" : "warning"}>{selectedRow.spendableNet >= 0 ? "ruimte" : "druk"}</StatusBadge>} />
                <MonthPressureGauge row={selectedRow} />
              </section>
              <section className={cardClass}>
                <CardHead label="Top 5" title="Grootste uitgaven" />
                <SpendingDonut rows={selectedCategories.slice(0, 5)} month={selectedRow.month} />
              </section>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeReport === "trends" ? (
        <section id="trends" className="mb-10">
          <div className="section-head">
            <h2>Wat verandert er?</h2>
            <p>Vergelijk maanden en ontdek welke uitgaven opvallen.</p>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <section className={cardClass}>
              <CardHead
                label="Koers"
                title="Blijft je financiële ruimte op koers?"
                description={`${decisionInsights[0]?.conclusion ?? ""} Kies een maand voor de details.`}
                aside={
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 6, 12].map((months) => (
                      <Button key={months} size="sm" variant={visibleMonths === months ? "primary" : "secondary"} onClick={() => setVisibleMonths(months as 3 | 6 | 12)}>{months} mnd</Button>
                    ))}
                    <Button size="sm" variant={visibleMonths === "all" ? "primary" : "secondary"} onClick={() => setVisibleMonths("all")}>Alles</Button>
                  </div>
                }
              />
              <BalanceAndResultChart rows={visibleRows} selectedMonth={selectedRow?.month} onSelect={setSelectedMonth} />
            </section>

            <section className={cardClass}>
              <CardHead label={monthLabel} title="Deze maand" aside={<StatusBadge tone={savingsShare >= 10 ? "success" : "info"}>{savingsShare}% naar spaar/beleggen</StatusBadge>} />
              <div className="border-t border-border">
                <FlowRow label={moneyFlowLabels.income} value={selectedRow?.income ?? 0} tone="positive" />
                <FlowRow label={moneyFlowLabels.savingsOut} value={selectedRow?.withdrawals ?? 0} tone="positive" />
                <FlowRow label={moneyFlowLabels.expenses} value={selectedRow?.spendableExpenses ?? 0} />
                <FlowRow label={moneyFlowLabels.savingsIn} value={selectedRow?.savings ?? 0} />
                <FlowRow label={moneyFlowLabels.investmentsIn} value={selectedRow?.investments ?? 0} />
              </div>
              <div className="mt-5">
                <p className={labelClass}>Kort uitgelegd</p>
                <p className="mt-2 font-[family-name:var(--font-serif-house)] text-sm leading-6 text-[var(--color-text-muted)]">
                  {selectedRow && selectedRow.spendableNet >= 0
                    ? `Deze maand bleef ${formatCurrency(selectedRow.spendableNet)} over na gewone uitgaven, sparen en beleggen.`
                    : `Deze maand ging er ${formatCurrency(Math.abs(selectedRow?.spendableNet ?? 0))} meer uit dan er beschikbaar was.`}
                  {topOutlier ? ` Grootste afwijking: ${topOutlier.label} (${formatSignedCurrency(topOutlier.delta)} t.o.v. recente maanden).` : ""}
                </p>
              </div>
            </section>
          </div>

          <section className={`${cardClass} mb-4`}>
            <CardHead label="Afwijkingen" title="Welke uitgaven wijken af?" description="Bedrag deze maand tegenover het gemiddelde van de vorige maanden." />
            <CategoryBenchmark rows={categoryBenchmark} month={selectedRow?.month} />
          </section>

          <section className={cardClass}>
            <CardHead label="12 maanden" title="Welke uitgaven veranderen structureel?" description="Volg je grootste categorieën over 12 maanden. Klik via de categorieverschillen door naar de brontransacties." />
            <CategoryTrendChart rows={insight.categorySeries} months={insight.balanceSeries.slice(-12).map((row) => row.month)} />
          </section>
        </section>
      ) : null}

      {activeReport === "year" ? (
        <section id="jaar" className="mb-10">
          <div className="section-head">
            <h2>Heel {year} naast elkaar</h2>
            <p>Bekijk iedere maand en het totaal van het jaar.</p>
          </div>
          <section className={cardClass}>
            <CardHead
              label={`${yearRows.months.length} maanden`}
              title={`Het jaar ${year}`}
              description="Bedragen per maand en het totaal van het jaar."
              aside={
                <Button size="sm" variant="secondary" onClick={() => downloadYearCsv(yearRows, year)}>
                  <Download aria-hidden="true" size={14} />
                  Download CSV
                </Button>
              }
            />
            <YearMatrix rows={yearRows.rows} months={yearRows.months} />
          </section>
        </section>
      ) : null}

      {activeReport === "forecast" ? (
        <section id="verwachting" className="mb-10">
          <div className="section-head">
            <h2>Wat komt eraan?</h2>
            <p>Een vooruitblik op basis van je vaste lasten, buffer en recente maanden.</p>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-3">
            <FixedCostDashboard fixedExpenses={fixedExpenses} monthlyTotal={fixedMonthlyTotal} selectedRow={selectedRow} />
            <BufferDashboard selectedRow={selectedRow} insight={insight} health={health} />
            <BudgetDashboard budgetGroups={budgetGroups} selectedMonth={selectedRow?.month} />
          </div>

          <section className={cardClass}>
            <CardHead
              label="Saldoraming"
              title="Waar kan je saldo over zes maanden uitkomen?"
              description={forecast.forecast.length ? `Op basis van afgeronde maanden: ${forecast.method === "median" ? "mediaan" : "gemiddeld"} ${formatSignedCurrency(forecast.avgMonthlyNet)} per maand, raming einde maand ${formatCurrency(forecast.forecastEnd)}. Het restant van deze maand telt naar tijd mee. De spreiding is indicatief en biedt geen kansgarantie.` : "Er zijn minimaal drie afgeronde kalendermaanden nodig voor een saldoraming."}
              aside={<StatusBadge tone={health.bufferStatus === "critical" ? "warning" : health.bufferStatus === "warning" ? "info" : "success"}>{health.label}</StatusBadge>}
            />
            {forecast.dataWarnings.length > 0 ? <div className="mb-4 border border-border border-l-2 border-l-[var(--color-warning)] p-3 text-xs leading-5 text-[var(--color-text)]">{forecast.dataWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
            <p className="mb-3 text-xs leading-5 text-[var(--color-text-muted)]">Historische saldi zijn teruggerekend uit de huidige standen. {forecast.validation.folds > 0 ? `Getoetst op ${forecast.validation.folds} historische maandstappen; gemiddelde absolute fout ${formatCurrency((forecast.method === "median" ? forecast.validation.medianAbsoluteError : forecast.validation.meanAbsoluteError) ?? 0)}. Dit bewijst geen nauwkeurigheid voor de komende zes maanden.` : "Nog onvoldoende historie om de voorspellingsfout te toetsen."}</p>
            <ForecastChart forecast={forecast} />
          </section>
        </section>
      ) : null}
    </>
  );
}

function CardHead({ label, title, description, aside }: { label?: string; title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {label ? <p className={labelClass}>{label}</p> : null}
        <h3 className="mt-1.5 text-base font-normal leading-6 text-[var(--color-text)]">{title}</h3>
        {description ? <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/** Shared recessive chart chrome: muted 10px labels, grid lines only, no axis lines. */
function chartBase(theme: ChartTheme) {
  return {
    textStyle: { fontFamily: chartFont },
    tooltip: { backgroundColor: theme.panel, borderColor: theme.border, borderWidth: 1, padding: 10, textStyle: { color: theme.text, fontFamily: chartFont, fontSize: 12 } },
    legend: { top: 0, left: 0, icon: "rect", itemWidth: 14, itemHeight: 2, itemGap: 16, textStyle: { color: theme.muted, fontFamily: chartFont, fontSize: 11 } },
    xAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted, fontFamily: chartFont, fontSize: 10 } },
    yAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted, fontFamily: chartFont, fontSize: 10, formatter: (value: number) => compactEuro(value) }, splitLine: { lineStyle: { color: theme.grid } } },
  } as const;
}

function BalanceAndResultChart({ rows, selectedMonth, onSelect }: { rows: BalanceRow[]; selectedMonth?: string; onSelect: (month: string) => void }) {
  if (!rows.length) return <EmptyChart />;
  const option = (theme: ChartTheme): EChartsOption => {
    const base = chartBase(theme);
    return {
      color: [theme.series[0], theme.series[2], theme.series[3]],
      animationDuration: 400,
      textStyle: base.textStyle,
      tooltip: { ...base.tooltip, trigger: "axis", valueFormatter: (value) => formatCurrency(Number(value)) },
      legend: base.legend,
      grid: { left: 64, right: 12, top: 40, bottom: 28 },
      xAxis: { ...base.xAxis, type: "category", data: rows.map((row) => formatShortMonth(row.month)) },
      yAxis: { ...base.yAxis, type: "value" },
      series: [
        { name: "Totaal saldo", type: "line", smooth: 0.25, data: rows.map((row) => row.totalBalance), lineStyle: { width: 2 }, symbol: "circle", symbolSize: 4 },
        { name: "Spaarrekening", type: "line", smooth: 0.25, data: rows.map((row) => row.savingsBalance), lineStyle: { width: 1.5 }, symbol: "circle", symbolSize: 4 },
        {
          name: "Onder aan de streep",
          type: "bar",
          data: rows.map((row) => row.spendableNet),
          barMaxWidth: 18,
          itemStyle: { borderRadius: 0, opacity: 0.55, color: (params) => (Number(params.value) >= 0 ? theme.success : theme.error) },
        },
      ],
    };
  };
  return (
    <>
      <EChartsPanel className="hidden h-80 md:block" option={option} onDataPointClick={(index) => onSelect(rows[index]?.month ?? selectedMonth ?? "")} />
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <button key={row.month} type="button" onClick={() => onSelect(row.month)} className={row.month === selectedMonth ? "border border-[var(--color-text)] bg-[var(--color-surface)] p-3 text-left" : "border border-border bg-[var(--color-panel-strong)] p-3 text-left"}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--color-text)]">{formatMonthLabel(row.month)}</span>
              <span className={row.spendableNet >= 0 ? "text-sm tabular-nums text-[var(--color-success)]" : "text-sm tabular-nums text-[var(--color-warning)]"}>{formatSignedCurrency(row.spendableNet)}</span>
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
    { label: "Inkomen", value: row.income, color: chartVar(2) },
    { label: "Uit sparen", value: row.withdrawals, color: chartVar(2) },
    { label: "Uitgaven", value: -row.spendableExpenses, color: chartVar(3) },
    { label: "Sparen", value: -row.savings, color: chartVar(4) },
    { label: "Beleggen", value: -row.investments, color: chartVar(4) },
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
    color: row.spendableNet >= 0 ? "var(--color-success)" : "var(--color-error)",
  };
  const chartRows = [...steps, result];
  const width = 780;
  const height = 330;
  const padding = { top: 28, right: 12, bottom: 70, left: 58 };
  const values = chartRows.flatMap((item) => [item.start, item.end]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const y = (value: number) => padding.top + ((max - value) / span) * (height - padding.top - padding.bottom);
  const plotWidth = width - padding.left - padding.right;
  const slot = plotWidth / chartRows.length;
  const barWidth = Math.min(56, slot * 0.5);
  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Maandmotor cashflow" className="h-auto w-full">
      {[max, min].map((tick, index) => (
        <g key={`${tick}-${index}`}>
          <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} style={{ stroke: "var(--chart-grid)" }} strokeWidth="1" />
          <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--color-text-muted)" }}>
            {compactEuro(tick)}
          </text>
        </g>
      ))}
      <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} style={{ stroke: "var(--color-border-strong)" }} strokeWidth="1" />
      <text x={padding.left - 10} y={zeroY + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--color-text-muted)" }}>
        {compactEuro(0)}
      </text>
      {chartRows.map((item, index) => {
        const x = padding.left + slot * index + (slot - barWidth) / 2;
        const top = y(Math.max(item.start, item.end));
        const bottom = y(Math.min(item.start, item.end));
        const heightValue = Math.max(2, bottom - top);
        const isResult = index === chartRows.length - 1;
        const labelY = item.value >= 0 ? top - 8 : bottom + 16;
        const connectorY = y(item.end);
        const nextX = padding.left + slot * (index + 1) + (slot - barWidth) / 2;
        return (
          <g key={`${item.label}-${index}`}>
            {!isResult && index < steps.length - 1 ? <line x1={x + barWidth} x2={nextX} y1={connectorY} y2={connectorY} style={{ stroke: "var(--color-border-strong)" }} strokeDasharray="3 4" strokeWidth="1" /> : null}
            <rect x={x} y={top} width={barWidth} height={heightValue} style={{ fill: item.color }} />
            <text x={x + barWidth / 2} y={Math.max(14, Math.min(height - 36, labelY))} textAnchor="middle" fontSize="11" fontWeight="500" style={{ fill: isResult ? item.color : "var(--color-text)" }}>
              {compactEuro(item.value)}
            </text>
            <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" fontSize="11" letterSpacing="0.5" style={{ fill: isResult ? "var(--color-text)" : "var(--color-text-muted)" }}>
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
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
  // Slate while there is room; status colours only once the month comes under pressure.
  const tone = pressure <= 0.88 ? chartVar(2) : pressure <= 1 ? "var(--color-warning)" : "var(--color-error)";

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-1">
      <svg viewBox="0 0 220 220" role="img" aria-label="Maanddruk meter" className="mx-auto h-auto w-full max-w-[12rem]">
        <circle cx="110" cy="110" r={radius} fill="none" style={{ stroke: "var(--chart-grid)" }} strokeWidth="12" />
        <circle cx="110" cy="110" r={radius} fill="none" style={{ stroke: tone }} strokeWidth="12" strokeDasharray={`${progress} ${circumference - progress}`} transform="rotate(-90 110 110)" />
        {excess > 0 ? <circle cx="110" cy="110" r="58" fill="none" style={{ stroke: "var(--color-error)" }} strokeWidth="3" strokeDasharray={`${excessProgress * 0.78} ${circumference}`} transform="rotate(-90 110 110)" /> : null}
        <text x="110" y="112" textAnchor="middle" fontSize="32" fontWeight="200" style={{ fill: "var(--color-text)" }}>{Math.round(pressure * 100)}%</text>
        <text x="110" y="134" textAnchor="middle" fontSize="9" letterSpacing="2.4" style={{ fill: "var(--color-text-muted)" }}>DRUK</text>
      </svg>
      <div className="border-t border-border text-xs">
        <GaugeLine label="Binnen" value={inflow} color={chartVar(1)} />
        <GaugeLine label="Vastgelegd" value={committed} color={tone} />
        <GaugeLine label={resultLabel(row.spendableNet)} value={row.spendableNet} color={row.spendableNet >= 0 ? "var(--color-success)" : "var(--color-error)"} signed />
      </div>
    </div>
  );
}

function GaugeLine({ label, value, color, signed = false }: { label: string; value: number; color: string; signed?: boolean }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border py-2.5">
      <span className="h-2 w-2" style={{ backgroundColor: color }} />
      <span className="truncate text-[var(--color-text-muted)]">{label}</span>
      <span className="tabular-nums text-[var(--color-text)]">{signed ? formatSignedCurrency(value) : formatCurrency(value)}</span>
    </div>
  );
}

function SpendingDonut({ rows, month }: { rows: CategoryRow[]; month?: string }) {
  if (!rows.length) return <EmptyChart label="Geen categorie-uitgaven in deze maand." />;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const colors = [chartVar(1), chartVar(2), chartVar(3), chartVar(4), chartVar(5)];
  const segments = rows.map((row, index) => {
    const start = total > 0 ? rows.slice(0, index).reduce((sum, item) => sum + item.amount, 0) / total : 0;
    const fraction = total > 0 ? row.amount / total : 0;
    return { ...row, start, fraction, color: colors[index % colors.length] };
  });

  return (
    <div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-1">
      <div className="relative mx-auto aspect-square w-full max-w-[12rem]">
        <svg viewBox="0 0 220 220" role="img" aria-label="Uitgavenmix top 5" className="h-full w-full">
          <circle cx="110" cy="110" r="74" fill="none" style={{ stroke: "var(--chart-grid)" }} strokeWidth="16" />
          {segments.map((segment) => (
            <circle
              key={segment.categoryId ?? segment.label}
              cx="110"
              cy="110"
              r="74"
              fill="none"
              style={{ stroke: segment.color }}
              strokeWidth="16"
              strokeDasharray={`${Math.max(0, segment.fraction * 465 - 1.5)} ${465 - Math.max(0, segment.fraction * 465 - 1.5)}`}
              strokeDashoffset={-segment.start * 465}
              strokeLinecap="butt"
              transform="rotate(-90 110 110)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <span className="block text-2xl font-extralight tabular-nums text-[var(--color-text)]">{compactEuro(total)}</span>
            <span className="text-[0.58rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">top mix</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border text-xs">
        {segments.map((row) => (
          <Link key={row.categoryId ?? row.label} href={`/transacties?categoryId=${row.categoryId ?? "geen"}&month=${month ?? "alle"}&kind=uitgaven`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border py-2.5 transition-colors hover:bg-[var(--color-surface)]">
            <span className="h-2 w-2" style={{ backgroundColor: row.color }} />
            <span className="min-w-0 truncate text-[var(--color-text-muted)]">{row.label}</span>
            <span className="tabular-nums text-[var(--color-text)]">{formatCurrency(row.amount)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CategoryBenchmark({ rows, month }: { rows: Array<CategoryRow & { average: number; delta: number }>; month?: string }) {
  if (!rows.length) return <p className="border border-dashed border-border p-4 text-center text-xs text-[var(--color-text-muted)]">Nog geen categoriegegevens.</p>;
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <div className="grid border-t border-border md:grid-cols-2 md:gap-x-8">
      {rows.slice(0, 10).map((row) => (
        <Link key={row.categoryId ?? row.label} href={`/transacties?categoryId=${row.categoryId ?? "geen"}&month=${month ?? "alle"}&kind=uitgaven`} className="grid gap-1.5 border-b border-border py-3 text-xs transition-colors hover:bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[var(--color-text)]">{row.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--color-text)]">{formatCurrency(row.amount)}</span>
          </div>
          <div className="h-1 overflow-hidden bg-[var(--chart-grid)]">
            <div className="h-full" style={{ width: `${Math.max(4, Math.round((row.amount / max) * 100))}%`, backgroundColor: "var(--chart-2)" }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[0.68rem] text-[var(--color-text-subtle)]">
            <span>Gem. vorige maanden {formatCurrency(row.average)}</span>
            <span className={row.delta > 0 ? "tabular-nums text-[var(--color-warning)]" : "tabular-nums text-[var(--color-success)]"}>{formatSignedCurrency(row.delta)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function YearMatrix({ rows, months }: { rows: YearMatrixRow[]; months: string[] }) {
  return (
    <div className="table-responsive">
      <table className="data-table-modern w-full min-w-[72rem] border-collapse text-xs">
        <thead className="border-b border-border text-[var(--color-text-muted)]">
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--color-panel-strong)] py-2 pr-3 text-left">Post</th>
            {months.map((month) => (
              <th key={month} className="px-2 py-2 text-right">{formatShortMonth(month)}</th>
            ))}
            <th className="px-2 py-2 text-right">Jaar/eind</th>
            <th className="py-2 pl-2 text-right">Gem.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.label} className={row.strong ? "bg-[var(--color-surface)]" : "bg-[var(--color-panel-strong)]"}>
              <td className="sticky left-0 z-10 bg-inherit py-2 pr-3 text-left text-[var(--color-text)]">{row.label}</td>
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
    <section className={cardClass}>
      <CardHead label="Vaste lasten" title="Wat ligt al vast" aside={<StatusBadge tone={ratio > 50 ? "warning" : "info"}>{ratio}% van inkomen</StatusBadge>} />
      <InsightFigure label="Maandbasis" value={formatCurrency(monthlyTotal)} detail={`${fixedExpenses.length} beheerde vaste lasten`} />
      <div className="mt-4 border-t border-border">
        {top.map((expense) => (
          <FlowRow key={expense.id} label={expense.supplier} value={monthlyFixedAmount(expense)} />
        ))}
        {!top.length ? <p className="py-2.5 text-xs text-[var(--color-text-muted)]">Nog geen vaste lasten beheerd.</p> : null}
      </div>
      <Link href="/vaste-lasten" className="mt-4 inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--color-text)] hover:underline">Vaste lasten beheren <ArrowRight aria-hidden="true" size={13} /></Link>
    </section>
  );
}

function BufferDashboard({ selectedRow, insight, health }: { selectedRow?: BalanceRow; insight: DashboardInsight; health: FinancialHealthData }) {
  const cashBuffer = selectedRow?.paymentBalance ?? insight.paymentBalance;
  const savings = selectedRow?.savingsBalance ?? insight.savingsBalance;
  const netSavingsMovement = (selectedRow?.savings ?? 0) - (selectedRow?.withdrawals ?? 0);
  return (
    <section className={cardClass}>
      <CardHead label="Buffer" title="Buffer en sparen" aside={<StatusBadge tone={health.bufferStatus === "critical" ? "warning" : health.bufferStatus === "warning" ? "info" : "success"}>{roundMoney(health.bufferMonths)} mnd</StatusBadge>} />
      <div className="border-t border-border">
        <FlowRow label="Betaalbuffer" value={cashBuffer} tone="positive" />
        <FlowRow label="Spaarrekening" value={savings} tone="positive" />
        <FlowRow label="Netto spaarbeweging maand" value={netSavingsMovement} tone={netSavingsMovement >= 0 ? "positive" : "neutral"} />
      </div>
      <p className="mt-4 font-[family-name:var(--font-serif-house)] text-xs leading-5 text-[var(--color-text-muted)]">Potjes en weekgeld zijn tijdelijke buffers; de bankstand op de spaarrekening blijft leidend.</p>
    </section>
  );
}

function BudgetDashboard({ budgetGroups, selectedMonth }: { budgetGroups: BudgetGroup[]; selectedMonth?: string }) {
  const selected = budgetGroups.find((group) => group.month === selectedMonth) ?? budgetGroups.find((group) => group.budgets.length) ?? budgetGroups[0];
  const planned = selected?.budgets.reduce((sum, budget) => sum + budget.planned, 0) ?? 0;
  const actual = selected?.budgets.reduce((sum, budget) => sum + budget.actual, 0) ?? 0;
  const delta = planned - actual;
  return (
    <section className={cardClass}>
      <CardHead label="Budgetten" title="Budget vs werkelijk" aside={<StatusBadge tone={delta >= 0 ? "success" : "warning"}>{selected ? formatShortMonth(selected.month) : "Geen budget"}</StatusBadge>} />
      <div className="border-t border-border">
        <FlowRow label="Gepland" value={planned} />
        <FlowRow label="Werkelijk" value={actual} />
        <FlowRow label="Resterend" value={delta} tone={delta >= 0 ? "positive" : "neutral"} />
      </div>
      <Link href={`/budgetten${selected?.month ? `?month=${selected.month}` : ""}`} className="mt-4 inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.18em] text-[var(--color-text)] hover:underline">Budgetten bekijken <ArrowRight aria-hidden="true" size={13} /></Link>
    </section>
  );
}

function CategoryTrendChart({ rows, months }: { rows: DashboardInsight["categorySeries"]; months: string[] }) {
  const categories = getExpenseCategoryTrend(rows, months);
  if (!months.length || !categories.length) return <EmptyChart label="Nog geen categorie-trends beschikbaar." />;
  const option = (theme: ChartTheme): EChartsOption => {
    const base = chartBase(theme);
    return {
      color: [...theme.series, theme.muted],
      animationDuration: 400,
      textStyle: base.textStyle,
      tooltip: { ...base.tooltip, trigger: "axis", valueFormatter: (value) => formatCurrency(Number(value)) },
      legend: { ...base.legend, type: "scroll", pageTextStyle: { color: theme.muted } },
      grid: { left: 64, right: 12, top: 44, bottom: 28 },
      xAxis: { ...base.xAxis, type: "category", data: months.map(formatShortMonth) },
      yAxis: { ...base.yAxis, type: "value" },
      series: categories.map((category, index): LineSeriesOption => ({
        name: category.label,
        type: "line",
        smooth: 0.25,
        smoothMonotone: "x",
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: index === 0 ? 2 : 1.5 },
        data: category.values,
      })),
    };
  };
  return <EChartsPanel className="h-80" option={option} />;
}

function ForecastChart({ forecast }: { forecast: BalanceForecastData }) {
  const rows = [...forecast.history, ...forecast.forecast];
  if (rows.length < 2) return <EmptyChart label="Nog te weinig historie voor een vooruitblik." />;
  const option = (theme: ChartTheme): EChartsOption => {
    const base = chartBase(theme);
    return {
      color: [theme.series[0], theme.series[1], theme.series[3], theme.series[3]],
      animationDuration: 400,
      textStyle: base.textStyle,
      tooltip: { ...base.tooltip, trigger: "axis", valueFormatter: (value) => formatCurrency(Number(value)) },
      legend: base.legend,
      grid: { left: 64, right: 12, top: 44, bottom: 28 },
      xAxis: { ...base.xAxis, type: "category", data: rows.map((row) => formatShortMonth(row.month)) },
      yAxis: { ...base.yAxis, type: "value" },
      series: [
        { name: "Teruggerekend / actueel", type: "line", smooth: false, data: rows.map((row) => (row.isForecast ? null : row.balance)), lineStyle: { width: 2 }, symbol: "circle", symbolSize: 4 },
        { name: "Verwachting", type: "line", smooth: false, data: rows.map((row) => row.balance), lineStyle: { width: 1.5, type: "dashed" }, symbol: "circle", symbolSize: 4 },
        { name: "Indicatieve bovengrens", type: "line", smooth: false, data: rows.map((row) => row.upperBound ?? null), lineStyle: { width: 1, type: "dotted" }, symbol: "none" },
        { name: "Indicatieve ondergrens", type: "line", smooth: false, data: rows.map((row) => row.lowerBound ?? null), lineStyle: { width: 1, type: "dotted" }, symbol: "none" },
      ],
    };
  };
  return <EChartsPanel className="h-80" option={option} />;
}

function InsightFigure({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <span className="mt-2 block truncate text-3xl font-extralight tabular-nums text-[var(--color-text)]">{value}</span>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}

function FlowRow({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "positive" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-xs">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className={tone === "positive" ? "tabular-nums text-[var(--color-success)]" : "tabular-nums text-[var(--color-text)]"}>{formatCurrency(value)}</span>
    </div>
  );
}

function EChartsPanel({ option, className, onDataPointClick }: { option: (theme: ChartTheme) => EChartsOption; className?: string; onDataPointClick?: (dataIndex: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(element);
    const applyTheme = () => chart.setOption({ aria: { enabled: true, decal: { show: false } }, ...option(readChartTheme(element)) }, true);
    applyTheme();
    const stopObservingTheme = observeTheme(applyTheme);
    if (onDataPointClick) {
      chart.on("click", (params) => {
        if (typeof params.dataIndex === "number") onDataPointClick(params.dataIndex);
      });
    }
    return () => {
      stopObservingTheme();
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
  if (value === null) return `px-2 py-2 text-right tabular-nums ${strong ? "font-medium" : "font-normal"} text-[var(--color-text-subtle)]`;
  const tone = value < 0 ? (invertTone ? "text-[var(--color-warning)]" : "text-[var(--color-success)]") : value > 0 && invertTone ? "text-[var(--color-success)]" : "text-[var(--color-text)]";
  return `px-2 py-2 text-right tabular-nums ${strong ? "font-medium" : "font-normal"} ${tone}`;
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

function EmptyChart({ label = "Geen data beschikbaar." }: { label?: string }) {
  return <div className="grid h-64 place-items-center border border-dashed border-border text-xs text-[var(--color-text-muted)]">{label}</div>;
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

/** Deterministic compact euro ("€ 70,1K"): Intl compact notation differs between Node and browsers and broke hydration. */
function compactEuro(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const [scaled, suffix] = abs >= 1_000_000 ? [abs / 1_000_000, "M"] : abs >= 1_000 ? [abs / 1_000, "K"] : [abs, ""];
  const rounded = Math.round(scaled * 10) / 10;
  const text = suffix ? String(rounded).replace(".", ",") : String(Math.round(scaled));
  return `${sign}€ ${text}${suffix}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
