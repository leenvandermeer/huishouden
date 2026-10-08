import type {
  TransactionConfidenceFilter,
  TransactionKindFilter,
  TransactionPatternFilter,
  TransactionSearchFilters,
  TransactionSortField,
} from "./repository";

type SearchValue = string | string[] | undefined;

export function parseTransactionFilters(params: Record<string, SearchValue>): TransactionSearchFilters {
  return {
    query: single(params.q),
    month: single(params.month),
    accountId: single(params.accountId),
    counterAccountKey: single(params.counterAccountKey),
    categoryId: single(params.categoryId),
    kind: parseKind(single(params.kind)),
    minAmount: parseAmount(single(params.minAmount)),
    maxAmount: parseAmount(single(params.maxAmount)),
    review: single(params.mode) === "review",
    pattern: parsePattern(single(params.pattern)),
    confidence: parseConfidence(single(params.confidence)),
    sortBy: parseSortField(single(params.sortBy)),
    sortDirection: single(params.sortDirection) === "asc" ? "asc" : "desc",
    page: parsePositiveInt(single(params.page)),
    pageSize: 50,
  };
}

export function transactionFiltersToParams(filters: TransactionSearchFilters, includePage = false) {
  const params = new URLSearchParams();
  set(params, "q", filters.query);
  set(params, "month", filters.month, "alle");
  set(params, "accountId", filters.accountId, "alle");
  set(params, "counterAccountKey", filters.counterAccountKey, "alle");
  set(params, "categoryId", filters.categoryId, "alle");
  set(params, "kind", filters.kind, "alle");
  if (filters.minAmount != null) params.set("minAmount", String(filters.minAmount));
  if (filters.maxAmount != null) params.set("maxAmount", String(filters.maxAmount));
  if (filters.review) params.set("mode", "review");
  set(params, "pattern", filters.pattern, "alle");
  set(params, "confidence", filters.confidence, "alle");
  set(params, "sortBy", filters.sortBy, "date");
  set(params, "sortDirection", filters.sortDirection, "desc");
  if (includePage && (filters.page ?? 1) > 1) params.set("page", String(filters.page));
  return params;
}

function set(params: URLSearchParams, key: string, value?: string, defaultValue?: string) {
  if (value && value !== defaultValue) params.set(key, value);
}

function single(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parseKind(value?: string): TransactionKindFilter {
  if (value === "inkomen" || value === "vaste_last" || value === "variabele_uitgave" || value === "reservering" || value === "interne_overboeking" || value === "uitgaven") return value;
  return "alle";
}

function parsePattern(value?: string): TransactionPatternFilter {
  return value === "terugkerend" || value === "afwijking" ? value : "alle";
}

function parseConfidence(value?: string): TransactionConfidenceFilter {
  return value === "high" || value === "medium" || value === "low" ? value : "alle";
}

function parseSortField(value?: string): TransactionSortField {
  return value === "amount" || value === "counterparty" || value === "account" || value === "category" ? value : "date";
}

function parseAmount(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseFloat(value.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.abs(parsed) : undefined;
}

function parsePositiveInt(value?: string) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
