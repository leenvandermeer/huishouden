"use client";

import * as echarts from "echarts/core";
import type { LineSeriesOption } from "echarts/charts";
import { LineChart } from "echarts/charts";
import type { AriaComponentOption, GridComponentOption, LegendComponentOption, TooltipComponentOption } from "echarts/components";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { formatCurrency, formatShortMonth } from "@/lib/format";
import { observeTheme, readChartTheme, withAlpha } from "@/lib/chart-theme";
import type { WealthHistoryRow } from "@/modules/finance/wealth";

type WealthChartOption = echarts.ComposeOption<LineSeriesOption | AriaComponentOption | GridComponentOption | LegendComponentOption | TooltipComponentOption>;

echarts.use([LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export function WealthHistoryChart({ rows }: { rows: WealthHistoryRow[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = chartRef.current;
    if (!element || !rows.length) return;
    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    const applyTheme = () => {
      const theme = readChartTheme(element);
      const series = [
        { name: "Netto vermogen", values: rows.map((row) => row.netWorth), color: theme.series[0], width: 2, type: "solid" as const },
        { name: "Direct beschikbaar", values: rows.map((row) => row.direct), color: theme.series[1], width: 1.5, type: "dashed" as const },
        { name: "Gereserveerd", values: rows.map((row) => row.reserved), color: theme.series[2], width: 1.5, type: "solid" as const },
        { name: "Lange termijn", values: rows.map((row) => row.longTerm), color: theme.series[3], width: 1.5, type: "dotted" as const },
      ].filter((item) => item.name === "Netto vermogen" || item.values.some((value) => Math.abs(value) >= 0.01));
      const option: WealthChartOption = {
        aria: { enabled: true, decal: { show: false }, description: "Ontwikkeling van het netto vermogen, direct beschikbaar geld, reserveringen en langetermijnvermogen per maand." },
        animationDuration: 420,
        color: series.map((item) => item.color),
        grid: { left: 16, right: 20, top: 58, bottom: 18, containLabel: true },
        legend: { top: 4, left: 4, itemWidth: 14, itemHeight: 2, icon: "rect", textStyle: { color: theme.muted, fontFamily: "Montserrat", fontSize: 11 } },
        tooltip: { trigger: "axis", backgroundColor: theme.panel, borderColor: theme.border, borderWidth: 1, padding: 12, textStyle: { color: theme.text, fontFamily: "Montserrat" }, valueFormatter: (value) => formatCurrency(Number(value)) },
        xAxis: { type: "category", data: rows.map((row) => formatShortMonth(row.month)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: theme.muted, fontFamily: "Montserrat", fontSize: 10 } },
        yAxis: { type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: theme.grid } }, axisLabel: { color: theme.muted, formatter: compactCurrency, fontFamily: "Montserrat", fontSize: 10 } },
        series: series.map((item) => ({ name: item.name, type: "line", data: item.values, smooth: 0.25, symbol: "circle", symbolSize: 4, showSymbol: rows.length <= 12, lineStyle: { width: item.width, type: item.type }, itemStyle: { color: item.color, borderWidth: 0 }, areaStyle: item.name === "Netto vermogen" ? { color: withAlpha(theme.series[0], 0.06) } : undefined })),
      };
      chart.setOption(option, true);
    };
    applyTheme();
    const stopObservingTheme = observeTheme(applyTheme);
    const resize = () => chart.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    return () => { stopObservingTheme(); observer.disconnect(); window.removeEventListener("resize", resize); chart.dispose(); };
  }, [rows]);

  return <div ref={chartRef} className="h-[20rem] w-full md:h-[25rem]" data-testid="wealth-history-chart" role="img" aria-label="Interactieve grafiek van de vermogensontwikkeling per maand." />;
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}
