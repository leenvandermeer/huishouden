export interface ChartTheme {
  accent: string;
  border: string;
  info: string;
  invest: string;
  muted: string;
  panel: string;
  primary: string;
  subtle: string;
  success: string;
  text: string;
}

export function readChartTheme(element: Element): ChartTheme {
  const styles = getComputedStyle(element);
  const color = (name: string) => styles.getPropertyValue(name).trim();
  return {
    accent: color("--color-accent"),
    border: color("--color-border"),
    info: color("--color-info"),
    invest: color("--color-invest"),
    muted: color("--color-text-muted"),
    panel: color("--color-panel-strong"),
    primary: color("--color-brand-strong"),
    subtle: color("--color-surface-alt"),
    success: color("--color-success"),
    text: color("--color-text"),
  };
}

export function observeTheme(change: () => void) {
  const observer = new MutationObserver(change);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function withAlpha(color: string, alpha: number) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return color;
  return `rgba(${Number.parseInt(match[1], 16)}, ${Number.parseInt(match[2], 16)}, ${Number.parseInt(match[3], 16)}, ${alpha})`;
}
