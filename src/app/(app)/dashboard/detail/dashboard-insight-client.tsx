"use client";

import Link from "next/link";
import * as echarts from "echarts/core";
import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from "echarts/charts";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import type {
  AriaComponentOption,
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  ToolboxComponentOption,
} from "echarts/components";
import { AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ArrowLeft, ArrowRight, Maximize2, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, StatusBadge } from "@/components/ui";
import { observeTheme, readChartTheme, withAlpha, type ChartTheme } from "@/lib/chart-theme";
import { formatCurrency, formatMonthLabel, formatShortMonth } from "@/lib/format";
import type { DashboardInsight } from "@/modules/finance/repository";
import { moneyFlowLabels, resultLabel, resultStatus } from "@/modules/finance/ux-labels";

type InsightRow = DashboardInsight["balanceSeries"][number];
type CategoryRow = DashboardInsight["categorySeries"][number];
type ChartMode = "saldo" | "maand";
type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | AriaComponentOption
  | DataZoomComponentOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | ToolboxComponentOption
>;

const zoomOptions = [3, 6, 12] as const;
const chartFont = "Montserrat";
const labelClass = "text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
const cardClass = "border border-border bg-[var(--color-panel-strong)]";

echarts.use([BarChart, LineChart, PieChart, AriaComponent, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, ToolboxComponent, CanvasRenderer]);

export function DashboardInsightClient({ insight }: { insight: DashboardInsight }) {
  const [visibleMonths, setVisibleMonths] = useState<number | "all">(Math.min(12, Math.max(insight.balanceSeries.length, 1)));
  const [selectedMonth, setSelectedMonth] = useState(insight.latestMonth ?? insight.balanceSeries.at(-1)?.month ?? "");
  const [chartMode, setChartMode] = useState<ChartMode>("saldo");
  const selectedIndex = Math.max(0, insight.balanceSeries.findIndex((row) => row.month === selectedMonth));
  const selectedRow = insight.balanceSeries[selectedIndex] ?? insight.balanceSeries.at(-1);
  const windowSize = visibleMonths === "all" ? insight.balanceSeries.length : visibleMonths;
  const start = Math.max(0, Math.min(selectedIndex - windowSize + 1, insight.balanceSeries.length - windowSize));
  const visibleRows = insight.balanceSeries.slice(start, start + windowSize);
  const selectedCategories = useMemo(
    () => insight.categorySeries.filter((row) => row.month === selectedRow?.month),
    [insight.categorySeries, selectedRow?.month],
  );
  const monthLabel = selectedRow ? formatMonthLabel(selectedRow.month) : "Geen maand";

  return (
    <div className="grid gap-4">
      <section className={`${cardClass} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-normal text-[var(--color-text)]">Analyse {monthLabel}</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {insight.transactionCount} transacties, {insight.balanceSeries.length} maanden.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setSelectedMonth(insight.balanceSeries[Math.max(0, selectedIndex - 1)]?.month ?? selectedMonth)} aria-label="Vorige maand">
              <ArrowLeft aria-hidden="true" size={14} />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setSelectedMonth(insight.balanceSeries[Math.min(insight.balanceSeries.length - 1, selectedIndex + 1)]?.month ?? selectedMonth)} aria-label="Volgende maand">
              <ArrowRight aria-hidden="true" size={14} />
            </Button>
            <Button size="sm" variant={chartMode === "saldo" ? "primary" : "secondary"} onClick={() => setChartMode("saldo")}>Saldo</Button>
            <Button size="sm" variant={chartMode === "maand" ? "primary" : "secondary"} onClick={() => setChartMode("maand")}>Maand</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Kpi label="Totaal saldo" value={selectedRow?.totalBalance ?? insight.totalBalance} />
          <Kpi label={resultLabel(selectedRow?.spendableNet ?? 0)} value={selectedRow?.spendableNet ?? 0} signed tone={(selectedRow?.spendableNet ?? 0) >= 0 ? "positive" : "warning"} />
          <Kpi label="Betaalrekeningen" value={selectedRow?.paymentBalance ?? insight.paymentBalance} />
          <Kpi label="Spaarrekeningen" value={selectedRow?.savingsBalance ?? insight.savingsBalance} />
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setVisibleMonths((current) => (current === "all" ? 12 : Math.max(3, current - 3)))} aria-label="Inzoomen">
              <Plus aria-hidden="true" size={14} />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setVisibleMonths((current) => (current === "all" ? "all" : Math.min(insight.balanceSeries.length, current + 3)))} aria-label="Uitzoomen">
              <Minus aria-hidden="true" size={14} />
            </Button>
            <Button size="sm" variant={visibleMonths === "all" ? "primary" : "secondary"} onClick={() => setVisibleMonths("all")} aria-label="Alles tonen">
              <Maximize2 aria-hidden="true" size={14} />
            </Button>
            {zoomOptions.map((option) => (
              <Button key={option} size="sm" variant={visibleMonths === option ? "primary" : "secondary"} onClick={() => setVisibleMonths(option)}>
                {option} mnd
              </Button>
            ))}
          </div>
          <StatusBadge tone={(selectedRow?.spendableNet ?? 0) >= 0 ? "success" : "warning"}>{resultStatus(selectedRow?.spendableNet ?? 0)}</StatusBadge>
        </div>
        <InsightChart
          rows={visibleRows}
          selectedMonth={selectedRow?.month}
          mode={chartMode}
          onSelect={setSelectedMonth}
          dataZoomStart={visibleRows.length ? Math.max(0, Math.round((start / insight.balanceSeries.length) * 100)) : 0}
          dataZoomEnd={visibleRows.length ? Math.round(((start + visibleRows.length) / insight.balanceSeries.length) * 100) : 100}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <MonthFlowPanel row={selectedRow} />
        <CategoryPanel rows={selectedCategories} month={selectedRow?.month} />
      </section>
    </div>
  );
}

function Kpi({ label, value, signed = false, tone = "neutral" }: { label: string; value: number; signed?: boolean; tone?: "neutral" | "positive" | "warning" }) {
  const valueClass = tone === "positive" ? "text-[var(--color-success)]" : tone === "warning" ? "text-[var(--color-warning)]" : "text-[var(--color-text)]";
  return (
    <article className="border-t border-border pt-3">
      <p className={labelClass}>{label}</p>
      <strong className={`mt-1 block truncate text-2xl font-extralight tabular-nums ${valueClass}`}>{signed ? formatSignedCurrency(value) : formatCurrency(value)}</strong>
    </article>
  );
}

function InsightChart({
  rows,
  selectedMonth,
  mode,
  onSelect,
  dataZoomStart,
  dataZoomEnd,
}: {
  rows: InsightRow[];
  selectedMonth?: string;
  mode: ChartMode;
  onSelect: (month: string) => void;
  dataZoomStart: number;
  dataZoomEnd: number;
}) {
  if (!rows.length) return <div className="grid min-h-80 place-items-center text-xs text-[var(--color-text-muted)]">Geen data.</div>;

  const labels = rows.map((row) => formatShortMonth(row.month));
  const selectedIndex = rows.findIndex((row) => row.month === selectedMonth);
  const option = (theme: ChartTheme): EChartsOption => ({
    color: mode === "saldo" ? [theme.series[0], theme.series[1], theme.series[2], theme.series[3]] : [theme.series[0], theme.series[1], theme.series[3], theme.series[2], theme.series[4]],
    textStyle: { fontFamily: chartFont },
    animationDuration: 450,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: theme.border } },
      backgroundColor: theme.panel,
      borderColor: theme.border,
      textStyle: { color: theme.text, fontFamily: chartFont, fontSize: 12 },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    legend: {
      top: 8,
      left: 12,
      textStyle: { color: theme.muted, fontFamily: chartFont, fontSize: 11 },
      icon: "rect",
      itemWidth: 14,
      itemHeight: 2,
    },
    toolbox: {
      right: 12,
      top: 4,
      iconStyle: { borderColor: theme.muted },
      feature: {
        dataZoom: { yAxisIndex: "none", title: { zoom: "Zoom", back: "Terug" } },
        restore: { title: "Herstel" },
        saveAsImage: { title: "Download" },
      },
    },
    grid: { left: 72, right: 28, top: 58, bottom: 78 },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: true,
      axisLabel: { color: theme.muted, fontFamily: chartFont, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: theme.muted, fontFamily: chartFont, fontSize: 10, formatter: (value: number) => formatCompactCurrency(value) },
      splitLine: { lineStyle: { color: theme.grid } },
    },
    dataZoom: [
      { type: "inside", start: dataZoomStart, end: dataZoomEnd, zoomOnMouseWheel: "shift", moveOnMouseWheel: true, moveOnMouseMove: true },
      { type: "slider", start: dataZoomStart, end: dataZoomEnd, height: 20, bottom: 24, borderColor: theme.border, backgroundColor: "transparent", fillerColor: withAlpha(theme.series[2], 0.15), dataBackground: { lineStyle: { color: theme.series[3] }, areaStyle: { color: "transparent" } }, handleStyle: { color: theme.series[1], borderColor: theme.series[1] }, textStyle: { color: theme.muted, fontSize: 10 } },
    ],
    series:
      mode === "saldo"
        ? [
            smoothLine("Totaal saldo", rows.map((row) => row.totalBalance), theme.series[0]),
            smoothLine("Betaalrekeningen", rows.map((row) => row.paymentBalance), theme.series[1]),
            smoothLine("Spaarrekeningen", rows.map((row) => row.savingsBalance), theme.series[2]),
            monthBar("Maandruimte", rows.map((row) => row.spendableNet), theme),
          ]
        : [
            smoothLine("Binnengekomen", rows.map((row) => row.income), theme.series[0]),
            smoothLine("Echte uitgaven", rows.map((row) => row.spendableExpenses), theme.series[1]),
            monthBar("Maandruimte", rows.map((row) => row.spendableNet), theme),
            smoothLine("Naar spaarrekening", rows.map((row) => row.savings), theme.series[2]),
            smoothLine("Naar beleggingen", rows.map((row) => row.investments), theme.series[3]),
            smoothLine("Uit spaarrekening", rows.map((row) => row.withdrawals), theme.series[4]),
          ],
    graphic:
      selectedIndex >= 0
        ? [
            {
              type: "rect",
              left: `${Math.max(5, (selectedIndex / Math.max(rows.length - 1, 1)) * 84 + 8)}%`,
              top: 58,
              shape: { width: 2, height: 220 },
              style: { fill: theme.series[0], opacity: 0.25 },
              silent: true,
            },
          ]
        : undefined,
  });

  return (
    <div className="overflow-hidden">
      <div className="grid gap-2 p-3 md:hidden">
        {rows.map((row) => (
          <button key={row.month} type="button" onClick={() => onSelect(row.month)} className={row.month === selectedMonth ? "border border-[var(--color-text)] bg-[var(--color-surface)] p-3 text-left" : "border border-border bg-[var(--color-panel-strong)] p-3 text-left"}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--color-text)]">{formatMonthLabel(row.month)}</span>
              <span className={row.spendableNet >= 0 ? "text-xs tabular-nums text-[var(--color-success)]" : "text-xs tabular-nums text-[var(--color-warning)]"}>{formatSignedCurrency(row.spendableNet)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[0.68rem]">
              <Mini label="In" value={row.income} />
              <Mini label="Uit" value={row.spendableExpenses} />
              <Mini label="Saldo" value={row.totalBalance} />
            </div>
          </button>
        ))}
      </div>
      <EChartsPanel className="hidden h-[24rem] md:block" option={option} onDataPointClick={(index) => onSelect(rows[index]?.month ?? selectedMonth ?? "")} />
    </div>
  );
}

function MonthFlowPanel({ row }: { row?: InsightRow }) {
  if (!row) return null;
  const items = [
    { label: moneyFlowLabels.income, value: row.income, tone: "positive" as const },
    { label: moneyFlowLabels.savingsOut, value: row.withdrawals, tone: "positive" as const },
    { label: moneyFlowLabels.expenses, value: row.spendableExpenses, tone: "neutral" as const },
    { label: moneyFlowLabels.savingsIn, value: row.savings, tone: "neutral" as const },
    { label: moneyFlowLabels.investmentsIn, value: row.investments, tone: "neutral" as const },
  ];

  return (
    <section className={`${cardClass} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-normal text-[var(--color-text)]">Maandopbouw</h2>
        <span className={row.spendableNet >= 0 ? "text-sm tabular-nums text-[var(--color-success)]" : "text-sm tabular-nums text-[var(--color-warning)]"}>{formatSignedCurrency(row.spendableNet)}</span>
      </div>
      <div className="border-t border-border">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-xs">
            <span className="text-[var(--color-text-muted)]">{item.label}</span>
            <span className={item.tone === "positive" ? "tabular-nums text-[var(--color-success)]" : "tabular-nums text-[var(--color-text)]"}>{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryPanel({ rows, month }: { rows: CategoryRow[]; month?: string }) {
  const expenseRows = rows
    .filter((row) => ["vaste_last", "reservering", "variabele_uitgave"].includes(row.kind))
    .filter((row) => row.categoryId !== "sparen" && row.categoryId !== "beleggen")
    .sort((a, b) => b.amount - a.amount);
  const max = Math.max(...expenseRows.map((row) => row.amount), 1);

  return (
    <section className={`${cardClass} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-normal text-[var(--color-text)]">Uitgaven per categorie</h2>
        <StatusBadge tone="info">{month ? formatMonthLabel(month) : "Geen maand"}</StatusBadge>
      </div>
      <CategoryDonut rows={expenseRows.slice(0, 8)} />
      <div className="grid border-t border-border">
        {expenseRows.slice(0, 10).map((row) => (
          <Link key={`${row.kind}-${row.categoryId ?? row.label}`} href={`/transacties?categoryId=${row.categoryId ?? "geen"}&month=${month ?? "alle"}&kind=uitgaven`} className="grid gap-1.5 border-b border-border py-2.5 text-xs transition-colors hover:bg-[var(--color-surface)]">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[var(--color-text)]">{row.label}</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(row.amount)}</span>
            </div>
            <div className="h-1 overflow-hidden bg-[var(--chart-grid)]">
              <div className="h-full" style={{ backgroundColor: "var(--chart-2)", width: `${Math.max(4, Math.round((row.amount / max) * 100))}%` }} />
            </div>
          </Link>
        ))}
        {expenseRows.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">Geen uitgaven in deze maand.</p> : null}
      </div>
    </section>
  );
}

function CategoryDonut({ rows }: { rows: CategoryRow[] }) {
  if (!rows.length) return null;

  const option = (theme: ChartTheme): EChartsOption => ({
    color: [...theme.series, theme.muted, theme.border, theme.grid],
    textStyle: { fontFamily: chartFont },
    animationDuration: 450,
    tooltip: {
      trigger: "item",
      backgroundColor: theme.panel,
      borderColor: theme.border,
      textStyle: { color: theme.text, fontFamily: chartFont, fontSize: 12 },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: 8,
      bottom: 8,
      icon: "rect",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: theme.muted, fontFamily: chartFont, fontSize: 11 },
      pageTextStyle: { color: theme.muted },
    },
    series: [
      {
        name: "Categorie",
        type: "pie",
        radius: ["58%", "70%"],
        itemStyle: { borderColor: theme.panel, borderWidth: 1 },
        center: ["34%", "50%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b}", color: theme.muted, fontFamily: chartFont, fontSize: 10 },
        labelLine: { length: 10, length2: 8, lineStyle: { color: theme.border } },
        data: rows.map((row) => ({ name: row.label, value: row.amount })),
      },
    ],
  });

  return <EChartsPanel className="mb-4 h-64" option={option} />;
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="block text-[var(--color-text-subtle)]">{label}</span>
      <strong className="block truncate font-normal text-[var(--color-text)] tabular-nums">{formatCompactCurrency(value)}</strong>
    </span>
  );
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function EChartsPanel({
  option,
  className,
  onDataPointClick,
}: {
  option: (theme: ChartTheme) => EChartsOption;
  className?: string;
  onDataPointClick?: (dataIndex: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
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

  return <div ref={containerRef} className={className} data-testid="financial-chart" role="img" aria-label="Interactieve financiële grafiek; dezelfde gegevens staan ook in tekst op deze pagina." />;
}

function smoothLine(name: string, data: number[], color: string): LineSeriesOption {
  return {
    name,
    type: "line",
    data,
    smooth: true,
    showSymbol: true,
    symbol: "circle",
    symbolSize: 4,
    lineStyle: { width: 1.5, color },
    itemStyle: { color },
    emphasis: { focus: "series" },
  };
}

function monthBar(name: string, data: number[], theme: ChartTheme): BarSeriesOption {
  return {
    name,
    type: "bar",
    data,
    barMaxWidth: 18,
    itemStyle: {
      borderRadius: 0,
      opacity: 0.55,
      color: (params) => (Number(params.value) >= 0 ? theme.success : theme.error),
    },
  };
}
