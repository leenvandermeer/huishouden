export function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "percent", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatMonthLabel(month: string) {
  return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
}

export function formatShortMonth(month: string) {
  return new Intl.DateTimeFormat("nl-NL", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T00:00:00`));
}
