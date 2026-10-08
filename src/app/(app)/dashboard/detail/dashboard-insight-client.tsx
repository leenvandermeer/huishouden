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
import { ArrowLeft, ArrowRight, Maximize2, Minus, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, StatusBadge } from "@/components/ui";
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
const brandColor = "#173f3a";
const paymentColor = "#d95738";
const savingsColor = "#6c5a8d";
const mutedColor = "#59615d";

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
    <div className="grid gap-3">
      <section className="surface-panel header-panel rounded-[var(--radius-lg)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-brand">Analyse {monthLabel}</h2>
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

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Kpi label="Totaal saldo" value={selectedRow?.totalBalance ?? insight.totalBalance} />
          <Kpi label={resultLabel(selectedRow?.spendableNet ?? 0)} value={selectedRow?.spendableNet ?? 0} signed tone={(selectedRow?.spendableNet ?? 0) >= 0 ? "positive" : "warning"} />
          <Kpi label="Betaalrekeningen" value={selectedRow?.paymentBalance ?? insight.paymentBalance} />
          <Kpi label="Spaarrekeningen" value={selectedRow?.savingsBalance ?? insight.savingsBalance} />
        </div>
      </section>

      <section className="surface-panel rounded-[var(--radius-lg)]">
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

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <MonthFlowPanel row={selectedRow} />
        <CategoryPanel rows={selectedCategories} month={selectedRow?.month} />
      </section>
    </div>
  );
}

function Kpi({ label, value, signed = false, tone = "neutral" }: { label: string; value: number; signed?: boolean; tone?: "neutral" | "positive" | "warning" }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "warning" ? "text-amber-800" : "text-brand";
  return (
    <article className="metric-surface rounded-md px-3 py-2">
      <p className="text-[0.62rem] font-bold uppercase text-[var(--color-text-subtle)]">{label}</p>
      <strong className={`mt-1 block truncate text-lg tabular-nums ${valueClass}`}>{signed ? formatSignedCurrency(value) : formatCurrency(value)}</strong>
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
  const option: EChartsOption = {
    color: mode === "saldo" ? [brandColor, paymentColor, savingsColor, mutedColor] : [savingsColor, paymentColor, brandColor, "#5b43b7", mutedColor],
    animationDuration: 450,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross", label: { backgroundColor: brandColor } },
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    legend: {
      top: 8,
      left: 12,
      textStyle: { color: mutedColor, fontSize: 11, fontWeight: 600 },
      itemWidth: 12,
      itemHeight: 8,
    },
    toolbox: {
      right: 12,
      top: 4,
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
      axisLabel: { color: mutedColor, fontWeight: 600 },
      axisLine: { lineStyle: { color: "#d8e0ea" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: mutedColor, formatter: (value: number) => formatCompactCurrency(value) },
      splitLine: { lineStyle: { color: "#eef2f7" } },
    },
    dataZoom: [
      { type: "inside", start: dataZoomStart, end: dataZoomEnd, zoomOnMouseWheel: "shift", moveOnMouseWheel: true, moveOnMouseMove: true },
      { type: "slider", start: dataZoomStart, end: dataZoomEnd, height: 24, bottom: 24, borderColor: "#d8e0ea", fillerColor: "rgba(23,63,115,0.14)", handleStyle: { color: brandColor } },
    ],
    series:
      mode === "saldo"
        ? [
            smoothLine("Totaal saldo", rows.map((row) => row.totalBalance), brandColor),
            smoothLine("Betaalrekeningen", rows.map((row) => row.paymentBalance), paymentColor),
            smoothLine("Spaarrekeningen", rows.map((row) => row.savingsBalance), savingsColor),
            monthBar("Maandruimte", rows.map((row) => row.spendableNet)),
          ]
        : [
            smoothLine("Binnengekomen", rows.map((row) => row.income), savingsColor),
            smoothLine("Echte uitgaven", rows.map((row) => row.spendableExpenses), paymentColor),
            monthBar("Maandruimte", rows.map((row) => row.spendableNet)),
            smoothLine("Naar spaarrekening", rows.map((row) => row.savings), brandColor),
            smoothLine("Naar beleggingen", rows.map((row) => row.investments), "#7c3aed"),
            smoothLine("Uit spaarrekening", rows.map((row) => row.withdrawals), "#5b43b7"),
          ],
    graphic:
      selectedIndex >= 0
        ? [
            {
              type: "rect",
              left: `${Math.max(5, (selectedIndex / Math.max(rows.length - 1, 1)) * 84 + 8)}%`,
              top: 58,
              shape: { width: 2, height: 220 },
              style: { fill: brandColor, opacity: 0.35 },
              silent: true,
            },
          ]
        : undefined,
  };

  return (
    <div className="overflow-hidden">
      <div className="grid gap-2 p-3 md:hidden">
        {rows.map((row) => (
          <button key={row.month} type="button" onClick={() => onSelect(row.month)} className={row.month === selectedMonth ? "rounded-md border border-brand bg-[var(--color-brand-subtle)] p-3 text-left" : "rounded-md border border-border bg-white p-3 text-left"}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <strong className="text-sm text-brand">{formatMonthLabel(row.month)}</strong>
              <span className={row.spendableNet >= 0 ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-amber-800"}>{formatSignedCurrency(row.spendableNet)}</span>
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
    { label: moneyFlowLabels.income, value: row.income, tone: "positive" as const, icon: TrendingUp },
    { label: moneyFlowLabels.savingsOut, value: row.withdrawals, tone: "positive" as const, icon: TrendingUp },
    { label: moneyFlowLabels.expenses, value: row.spendableExpenses, tone: "neutral" as const, icon: TrendingDown },
    { label: moneyFlowLabels.savingsIn, value: row.savings, tone: "neutral" as const, icon: Wallet },
    { label: moneyFlowLabels.investmentsIn, value: row.investments, tone: "neutral" as const, icon: TrendingDown },
  ];

  return (
    <section className="surface-panel rounded-[var(--radius-lg)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand">Maandopbouw</h2>
        <strong className={row.spendableNet >= 0 ? "text-sm tabular-nums text-emerald-700" : "text-sm tabular-nums text-amber-800"}>{formatSignedCurrency(row.spendableNet)}</strong>
      </div>
      <div className="grid gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="metric-surface grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-3 py-2 text-xs">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white/88 text-brand"><Icon aria-hidden="true" size={14} /></span>
              <span className="font-semibold text-[var(--color-text-muted)]">{item.label}</span>
              <strong className={item.tone === "positive" ? "tabular-nums text-emerald-700" : "tabular-nums text-brand"}>{formatCurrency(item.value)}</strong>
            </div>
          );
        })}
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
    <section className="surface-panel rounded-[var(--radius-lg)] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand">Uitgaven per categorie</h2>
        <StatusBadge tone="info">{month ? formatMonthLabel(month) : "Geen maand"}</StatusBadge>
      </div>
      <CategoryDonut rows={expenseRows.slice(0, 8)} />
      <div className="grid gap-2">
        {expenseRows.slice(0, 10).map((row) => (
          <Link key={`${row.kind}-${row.categoryId ?? row.label}`} href={`/transacties?categoryId=${row.categoryId ?? "geen"}&month=${month ?? "alle"}&kind=uitgaven`} className="grid gap-1 rounded-md border border-border p-2 text-xs transition hover:border-brand">
            <div className="flex items-center justify-between gap-3">
              <strong className="min-w-0 truncate text-brand">{row.label}</strong>
              <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(row.amount)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, Math.round((row.amount / max) * 100))}%` }} />
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

  const option: EChartsOption = {
    color: [brandColor, paymentColor, savingsColor, "#5b43b7", "#7c3aed", "#db2777", "#ca8a04", "#475569"],
    animationDuration: 450,
    tooltip: {
      trigger: "item",
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: 8,
      bottom: 8,
      textStyle: { color: mutedColor, fontSize: 11, fontWeight: 600 },
    },
    series: [
      {
        name: "Categorie",
        type: "pie",
        radius: ["48%", "72%"],
        center: ["34%", "50%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b}", color: "#334155", fontSize: 11, fontWeight: 600 },
        labelLine: { length: 10, length2: 8 },
        data: rows.map((row) => ({ name: row.label, value: row.amount })),
      },
    ],
  };

  return <EChartsPanel className="mb-3 h-64 rounded-md bg-[var(--color-surface)]" option={option} />;
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="block text-[var(--color-text-subtle)]">{label}</span>
      <strong className="block truncate text-brand tabular-nums">{formatCompactCurrency(value)}</strong>
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
  option: EChartsOption;
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

  return <div ref={containerRef} className={className} data-testid="financial-chart" role="img" aria-label="Interactieve financiële grafiek; dezelfde gegevens staan ook in tekst op deze pagina." />;
}

function smoothLine(name: string, data: number[], color: string): LineSeriesOption {
  return {
    name,
    type: "line",
    data,
    smooth: true,
    showSymbol: true,
    symbolSize: 7,
    lineStyle: { width: 3, color },
    itemStyle: { color },
    emphasis: { focus: "series" },
  };
}

function monthBar(name: string, data: number[]): BarSeriesOption {
  return {
    name,
    type: "bar",
    data,
    barMaxWidth: 24,
    itemStyle: {
      borderRadius: 5,
      color: (params) => (Number(params.value) >= 0 ? "rgba(4,120,87,0.28)" : "rgba(180,83,9,0.28)"),
    },
  };
}
