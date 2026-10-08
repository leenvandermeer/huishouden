import type { FinanceDataset } from "./bank-import";
import { getPrivateExpenseReport, getReportPeriodLabel, type ReportPeriodType, type ReportReferenceWindow } from "./reporting";
import { encodeExcelCsv } from "@/lib/csv";
import { FINANCIAL_CONTRACT_VERSION } from "./financial-contract";
import { CSV_PRODUCT_VERSION } from "./csv-product-contract";

export function toReportCsv(dataset: FinanceDataset, period: string, periodType: ReportPeriodType, referenceWindow: ReportReferenceWindow = 3) {
  const report = getPrivateExpenseReport(dataset.transactions, dataset.categories, period, referenceWindow, periodType);
  const referenceLabel = `Gemiddelde vorige ${report.referenceMonths.length} ${report.referenceMonths.length === 1 ? "periode" : "periodes"}`;
  const rows: Array<Array<string | number | null>> = [
    ["Rapport", reportName(periodType)],
    ["Periode", getReportPeriodLabel(period, periodType)],
    ["Gegenereerd op", new Date().toISOString()],
    ["Rekencontract", FINANCIAL_CONTRACT_VERSION],
    ["CSV-productcontract", CSV_PRODUCT_VERSION],
    ["Referentieperiodes", report.referenceMonths.join(", ") || "Geen eerdere periodes beschikbaar"],
    [],
    ["Onderdeel", "Categorie", "Bedrag", referenceLabel, "Verschil", "Aantal boekingen"],
    ["Samenvatting", "Inkomsten", report.totals.income, null, null, null],
    ["Samenvatting", "Overige inkomsten", report.totals.incomingAdjustments, null, null, null],
    ["Samenvatting", "Gewone uitgaven", report.totals.spendableExpenses, null, null, null],
    ["Samenvatting", "Naar sparen", report.totals.savings, null, null, null],
    ["Samenvatting", "Uit sparen/buffer", report.totals.withdrawals, null, null, null],
    ["Samenvatting", "Beleggen", report.totals.investments, null, null, null],
    ["Samenvatting", "Onder aan de streep", report.totals.spendableNet, null, null, null],
    ...report.sections.flatMap((section) =>
      section.rows.map((row) => [section.title, row.label, row.amount, row.referenceAmount, row.delta, row.count]),
    ),
  ];

  return encodeExcelCsv(rows);
}

function reportName(periodType: ReportPeriodType) {
  if (periodType === "quarter") return "Huishouden kwartaalrapport";
  if (periodType === "year") return "Huishouden jaarrapport";
  return "Huishouden maandrapport";
}
