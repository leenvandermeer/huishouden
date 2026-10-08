"use client";

import * as echarts from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import { BarChart, LineChart } from "echarts/charts";
import type { AriaComponentOption, GridComponentOption, LegendComponentOption, TooltipComponentOption } from "echarts/components";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatCurrency, formatShortMonth } from "@/lib/format";
import { observeTheme, readChartTheme, withAlpha } from "@/lib/chart-theme";

type AccountChartOption = echarts.ComposeOption<BarSeriesOption | LineSeriesOption | AriaComponentOption | GridComponentOption | LegendComponentOption | TooltipComponentOption>;

interface BalanceChartRow {
  month: string;
  income: number;
  expenses: number;
  net: number;
  estimatedBalance: number;
  observationSource?: "import" | "manual";
  observationDate?: string;
}

echarts.use([BarChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export function BalanceHistoryChart({ rows, accountId }: { rows: BalanceChartRow[]; accountId: string }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = chartRef.current;
    if (!element || !rows.length) return;
    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    const applyTheme = () => {
      const theme = readChartTheme(element);
      const option: AccountChartOption = {
      aria: {
        enabled: true,
        decal: { show: false },
        description: "Maandelijks saldo, inkomsten en uitgaven voor deze rekening.",
      },
      animationDuration: 420,
      color: [theme.success, theme.accent, theme.primary],
      grid: { left: 16, right: 20, top: 54, bottom: 18, containLabel: true },
      legend: {
        top: 4,
        left: 4,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: theme.muted, fontFamily: "Instrument Sans", fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.panel,
        borderColor: theme.border,
        borderWidth: 1,
        padding: 12,
        textStyle: { color: theme.text, fontFamily: "Instrument Sans" },
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      xAxis: {
        type: "category",
        data: rows.map((row) => formatShortMonth(row.month)),
        axisLine: { lineStyle: { color: theme.border } },
        axisTick: { show: false },
        axisLabel: { color: theme.muted, fontFamily: "Instrument Sans", fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          splitLine: { lineStyle: { color: theme.subtle, type: "dashed" } },
          axisLabel: { color: theme.muted, formatter: compactCurrency, fontFamily: "Instrument Sans", fontSize: 10 },
        },
        {
          type: "value",
          splitLine: { show: false },
          axisLine: { show: false },
          axisLabel: { color: theme.primary, formatter: compactCurrency, fontFamily: "Instrument Sans", fontSize: 10 },
        },
      ],
      series: [
        {
          name: "Inkomsten",
          type: "bar",
          data: rows.map((row) => row.income),
          barMaxWidth: 18,
          itemStyle: { borderRadius: [5, 5, 0, 0], opacity: 0.72 },
        },
        {
          name: "Uitgaven",
          type: "bar",
          data: rows.map((row) => row.expenses),
          barMaxWidth: 18,
          itemStyle: { borderRadius: [5, 5, 0, 0], opacity: 0.65 },
        },
        {
          name: "Saldo",
          type: "line",
          yAxisIndex: 1,
          data: rows.map((row) => ({
            value: row.estimatedBalance,
            symbolSize: row.observationSource ? 11 : 7,
            itemStyle: row.observationSource ? { borderColor: theme.panel, borderWidth: 3 } : { borderColor: theme.panel, borderWidth: 2 },
          })),
          symbol: "circle",
          symbolSize: 7,
          showSymbol: rows.length <= 12,
          smooth: 0.28,
          lineStyle: { width: 3 },
          itemStyle: { borderColor: theme.panel, borderWidth: 2 },
          areaStyle: { color: withAlpha(theme.primary, 0.12) },
        },
      ],
      };
      chart.setOption(option, true);
    };
    applyTheme();
    const stopObservingTheme = observeTheme(applyTheme);
    const resize = () => chart.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    return () => {
      stopObservingTheme();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [rows]);

  if (!rows.length) {
    return <div className="grid min-h-72 place-items-center rounded-2xl bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">Nog geen saldodata voor deze rekening.</div>;
  }

  return (
    <div>
      <div ref={chartRef} className="h-[21rem] w-full md:h-[25rem]" data-testid="account-history-chart" role="img" aria-label="Interactieve grafiek met het saldo, de inkomsten en de uitgaven per maand." />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-[var(--color-text-muted)]">
        <span>Grotere saldopunten zijn verankerd op een import- of handmatige peildatum.</span>
        <Link href={`/transacties?accountId=${accountId}`} className="font-semibold text-brand hover:underline">Alle transacties bekijken →</Link>
      </div>
    </div>
  );
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}
