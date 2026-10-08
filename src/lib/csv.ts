export type CsvValue = string | number | boolean | null | undefined;

export function encodeExcelCsv(rows: CsvValue[][]) {
  return `\uFEFFsep=;\r\n${rows.map((row) => row.map(encodeCsvCell).join(";")).join("\r\n")}`;
}

export function encodeCsvCell(value: CsvValue) {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return new Intl.NumberFormat("nl-NL", { useGrouping: false, maximumFractionDigits: 20 }).format(value);
  }
  if (typeof value === "boolean") return value ? "WAAR" : "ONWAAR";
  const text = protectExcelFormula(String(value));
  return `"${text.replaceAll('"', '""')}"`;
}

export function protectExcelFormula(value: string) {
  return /^[\s]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}

export function downloadCsvFile(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
