"use client";

import Link from "next/link";
import { ArrowDownUp, CheckSquare, ChevronLeft, ChevronRight, Columns3, Download } from "lucide-react";
import { flexRender } from "@tanstack/react-table";
import { getCoreRowModel, useLegacyTable as useReactTable, type LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, FieldLabel, Select, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CategoryCorrectionForm } from "@/components/finance/category-correction-form";
import { TransactionFilterForm } from "@/components/finance/transaction-filter-form";
import { bulkChangeTransactionCategory, saveTransactionColumns } from "@/modules/finance/actions";
import { getCategoryName } from "@/modules/finance/reporting";
import type { SavedFilter, TransactionOptionalColumn, TransactionSearchFilters, TransactionSearchResult } from "@/modules/finance/repository";
import { transactionFiltersToParams } from "@/modules/finance/transaction-query";
import type { Account, Category, Transaction, TransactionKind } from "@/modules/finance/types";

interface TransactionSearchProps {
  accounts: Account[];
  canEdit?: boolean;
  categories: Category[];
  columnPreferences: TransactionOptionalColumn[];
  counterAccounts: Array<{ key: string; value: string; count: number }>;
  filters: TransactionSearchFilters;
  months: string[];
  result: TransactionSearchResult;
  savedFilters?: SavedFilter[];
}

type KindFilter = "alle" | TransactionKind | "uitgaven";

export function TransactionSearch({ accounts, canEdit = true, categories, columnPreferences, counterAccounts, filters, months, result, savedFilters = [] }: TransactionSearchProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safePage = Math.min(result.page, result.pageCount);
  const visible = result.transactions;
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" })), [categories]);
  const visibleEditableIds = useMemo(() => visible.filter((transaction) => transaction.kind !== "interne_overboeking").map((transaction) => transaction.id), [visible]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [applyToAllFiltered, setApplyToAllFiltered] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = visibleEditableIds.length > 0 && visibleEditableIds.every((id) => selectedSet.has(id));
  const targetCount = applyToAllFiltered ? result.total : selectedIds.length;
  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  function toggleVisible(checked: boolean) {
    setApplyToAllFiltered(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleEditableIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return Array.from(next);
    });
  }

  function toggleTransaction(transactionId: string, checked: boolean) {
    setApplyToAllFiltered(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(transactionId);
      } else {
        next.delete(transactionId);
      }
      return Array.from(next);
    });
  }

  return (
    <section className="space-y-3">
      <TransactionFilterForm key={transactionFilterKey(filters)} accounts={accounts} categories={categories} counterAccounts={counterAccounts} filters={filters} months={months} result={result} savedFilters={savedFilters} />

      <section className="surface-panel rounded-[var(--radius-lg)]">
        {canEdit ? (
          <form action={bulkChangeTransactionCategory} className="grid gap-3 border-b border-border px-3 py-3 lg:grid-cols-[auto_auto_minmax(12rem,18rem)_auto_1fr] lg:items-end">
            {selectedIds.map((id) => <input key={id} type="hidden" name="transactionId" value={id} />)}
            {applyToAllFiltered ? <input type="hidden" name="applyToAllFiltered" value="on" /> : null}
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="q" value={filters.query ?? ""} />
            <input type="hidden" name="month" value={filters.month ?? ""} />
            <input type="hidden" name="accountId" value={filters.accountId ?? ""} />
            <input type="hidden" name="counterAccountKey" value={filters.counterAccountKey ?? ""} />
            <input type="hidden" name="filterCategoryId" value={filters.categoryId ?? ""} />
            <input type="hidden" name="kind" value={filters.kind ?? ""} />
            <input type="hidden" name="minAmount" value={filters.minAmount != null ? String(filters.minAmount) : ""} />
            <input type="hidden" name="maxAmount" value={filters.maxAmount != null ? String(filters.maxAmount) : ""} />
            <input type="hidden" name="mode" value={filters.review ? "review" : ""} />
            <input type="hidden" name="pattern" value={filters.pattern ?? ""} />
            <input type="hidden" name="confidence" value={filters.confidence ?? ""} />
            <label className="flex min-h-8 items-center gap-2 rounded-md border border-border bg-white/80 px-2.5 text-xs font-semibold text-brand">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={allVisibleSelected}
                disabled={visibleEditableIds.length === 0}
                onChange={(event) => toggleVisible(event.target.checked)}
              />
              Pagina
            </label>
            <label className="flex min-h-8 items-center gap-2 rounded-md border border-border bg-white/80 px-2.5 text-xs font-semibold text-brand">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={applyToAllFiltered}
                disabled={result.total === 0}
                onChange={(event) => {
                  setApplyToAllFiltered(event.target.checked);
                  if (event.target.checked) setSelectedIds([]);
                }}
              />
              Alle {result.total}
            </label>
            <div>
              <FieldLabel htmlFor="bulk-category">Categorie</FieldLabel>
              <Select id="bulk-category" name="categoryId" defaultValue="">
                <option value="" disabled>Kies categorie</option>
                {sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
            </div>
            <BulkSubmitButton disabled={targetCount === 0} />
            <p className="text-[0.68rem] text-[var(--color-text-subtle)]">
              {targetCount > 0 ? `${targetCount} transacties worden bijgewerkt binnen deze selectie.` : "Selecteer regels op deze pagina of kies alle gevonden transacties."}
            </p>
          </form>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div>
            <h2 className="text-xs font-semibold text-brand">Transacties</h2>
            <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-subtle)]">Pagina {safePage} van {result.pageCount}, maximaal {result.pageSize} regels per pagina.</p>
          </div>
          <div className="flex items-center gap-2">
            <details className="group relative">
              <summary className="inline-flex min-h-7 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border bg-white px-2 text-xs font-semibold text-brand marker:content-none"><Columns3 aria-hidden="true" size={14} /> Kolommen</summary>
              <form action={saveTransactionColumns} className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-lg)]">
                <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">Optionele kolommen</p>
                {([['account', 'Rekening'], ['counterAccount', 'Tegenrekening'], ['status', 'Status'], ['correction', 'Correctie']] as Array<[TransactionOptionalColumn, string]>).map(([value, label]) => <label key={value} className="flex min-h-8 items-center gap-2 text-xs text-brand"><input type="checkbox" name="column" value={value} defaultChecked={columnPreferences.includes(value)} /> {label}</label>)}
                <Button type="submit" size="sm" variant="secondary" className="mt-2 w-full">Bewaren</Button>
              </form>
            </details>
            {canEdit ? <Link href={`/api/export/transactions?${transactionFiltersToParams(filters).toString()}`} className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-2 text-xs font-semibold text-brand transition hover:border-brand hover:bg-[var(--color-brand-subtle)]"><Download aria-hidden="true" size={14} /> Exporteer CSV</Link> : null}
            <PaginationLink disabled={safePage <= 1} href={transactionHref(filters, safePage - 1)}>
              <ChevronLeft aria-hidden="true" size={14} /> Vorige
            </PaginationLink>
            <PaginationLink disabled={safePage >= result.pageCount} href={transactionHref(filters, safePage + 1)}>
              Volgende <ChevronRight aria-hidden="true" size={14} />
            </PaginationLink>
          </div>
        </div>
        <div className="grid gap-2 p-3 md:hidden">
          {visible.map((transaction) => (
            <article key={transaction.id} className="flow-card rounded-[var(--radius-lg)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
                  {canEdit && transaction.kind !== "interne_overboeking" ? (
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5"
                      aria-label={`Selecteer transactie ${formatDate(transaction.date)} ${transaction.counterparty}`}
                      checked={selectedSet.has(transaction.id)}
                      onChange={(event) => toggleTransaction(transaction.id, event.target.checked)}
                    />
                  ) : <span />}
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold text-[var(--color-text-subtle)]">{formatDate(transaction.date)} - {transaction.accountName ?? accounts.find((account) => account.id === transaction.accountId)?.name ?? "Onbekende rekening"}</p>
                    <strong className="mt-1 block truncate text-sm text-brand">{transaction.counterparty}</strong>
                    <span className="mt-1 block truncate text-[0.68rem] font-semibold text-[var(--color-text-subtle)]">{counterInfoLabel(transaction)}</span>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{transaction.description}</p>
                    {transaction.sourceFile ? <p className="mt-1 truncate text-[0.65rem] text-[var(--color-text-subtle)]" title={transaction.sourceFile}>Bronbestand: {transaction.sourceFile}</p> : null}
                  </div>
                </div>
                <strong className={cn("shrink-0 text-sm tabular-nums", transaction.amount < 0 ? "text-[var(--color-text)]" : "text-emerald-700")}>{formatCurrency(transaction.amount)}</strong>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone="info">{getCategoryName(categories, transaction.categoryId)}</StatusBadge>
                <KindBadge kind={transaction.kind} />
                {transaction.recurrencePattern ? <PatternBadge transaction={transaction} /> : null}
              </div>
              <div className="mt-3">
                {!canEdit ? (
                  <p className="rounded-md bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text-muted)]">Alleen lezen</p>
                ) : transaction.kind === "interne_overboeking" ? (
                  <p className="rounded-md bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text-muted)]">Kruispost, telt niet mee.</p>
                ) : (
                  <CategoryCorrectionForm
                    compact
                    transactionId={transaction.id}
                    categories={sortedCategories}
                    defaultCategoryId={suggestedCategory(transaction)}
                    defaultRulePattern={suggestRule(transaction).pattern}
                    defaultRuleScope={suggestRule(transaction).scope}
                    suggestionScore={showCategorySuggestion(transaction) ? transaction.categorySuggestionScore : undefined}
                    suggestionReason={transaction.categorySuggestionReason}
                  />
                )}
              </div>
            </article>
          ))}
          {visible.length === 0 ? (
            <p className="rounded-md bg-[var(--color-surface)] px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">Geen transacties gevonden voor deze filters.</p>
          ) : null}
        </div>
        <ModernTransactionTable
          accounts={accounts}
          allVisibleSelected={allVisibleSelected}
          canEdit={canEdit}
          categories={categories}
          columnPreferences={columnPreferences}
          filters={filters}
          onToggleTransaction={toggleTransaction}
          onToggleVisible={toggleVisible}
          selectedSet={selectedSet}
          sortedCategories={sortedCategories}
          transactions={visible}
          visibleEditableCount={visibleEditableIds.length}
        />
      </section>
    </section>
  );
}

function ModernTransactionTable({
  accounts,
  allVisibleSelected,
  canEdit,
  categories,
  columnPreferences,
  filters,
  onToggleTransaction,
  onToggleVisible,
  selectedSet,
  sortedCategories,
  transactions,
  visibleEditableCount,
}: {
  accounts: Account[];
  allVisibleSelected: boolean;
  canEdit: boolean;
  categories: Category[];
  columnPreferences: TransactionOptionalColumn[];
  filters: TransactionSearchFilters;
  onToggleTransaction: (id: string, checked: boolean) => void;
  onToggleVisible: (checked: boolean) => void;
  selectedSet: Set<string>;
  sortedCategories: Category[];
  transactions: Transaction[];
  visibleEditableCount: number;
}) {
  const accountNames = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns: ColumnDef<Transaction>[] = ([
    {
      id: "select",
      size: 34,
      header: () => canEdit ? (
        <input type="checkbox" className="h-3.5 w-3.5" aria-label="Selecteer alle zichtbare transacties" checked={allVisibleSelected} disabled={visibleEditableCount === 0} onChange={(event) => onToggleVisible(event.target.checked)} />
      ) : null,
      cell: ({ row }) => canEdit && row.original.kind !== "interne_overboeking" ? (
        <input type="checkbox" className="h-3.5 w-3.5" aria-label={`Selecteer transactie ${formatDate(row.original.date)} ${row.original.counterparty}`} checked={selectedSet.has(row.original.id)} onChange={(event) => onToggleTransaction(row.original.id, event.target.checked)} />
      ) : null,
    },
    {
      accessorKey: "date",
      header: () => <SortHeader field="date" filters={filters}>Datum</SortHeader>,
      size: 82,
      cell: ({ getValue }) => formatDate(String(getValue())),
    },
    {
      id: "account",
      header: () => <SortHeader field="account" filters={filters}>Rekening</SortHeader>,
      size: 90,
      cell: ({ row }) => <span className="block truncate font-medium text-brand">{row.original.accountName ?? accountNames.get(row.original.accountId) ?? "Onbekende rekening"}</span>,
    },
    {
      id: "description",
      header: () => <SortHeader field="counterparty" filters={filters}>Omschrijving</SortHeader>,
      size: 190,
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate font-semibold text-[var(--color-text)]">{row.original.counterparty}</span>
          <span className="block truncate text-[var(--color-text-subtle)]">{row.original.description}</span>
          <span className="mt-0.5 block truncate text-[0.68rem] text-[var(--color-text-subtle)]">{counterInfoLabel(row.original)}</span>
          {row.original.sourceFile ? <span className="mt-0.5 block truncate text-[0.65rem] text-[var(--color-text-subtle)]" title={row.original.sourceFile}>Bron: {row.original.sourceFile}</span> : null}
        </div>
      ),
    },
    {
      id: "counterAccount",
      header: "Tegenrekening",
      size: 135,
      cell: ({ row }) => {
        const account = row.original.counterAccount || extractIban(row.original.description);
        return <span className="block truncate font-medium tabular-nums text-[var(--color-text-muted)]" title={account || "Geen tegenrekening beschikbaar"}>{account || "—"}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: () => <SortHeader field="amount" filters={filters} align="right">Bedrag</SortHeader>,
      size: 85,
      cell: ({ row }) => <strong className={cn("block text-right tabular-nums", row.original.amount < 0 ? "text-[var(--color-text)]" : "text-emerald-700")}>{formatCurrency(row.original.amount)}</strong>,
    },
    {
      id: "status",
      header: () => <SortHeader field="category" filters={filters}>Status</SortHeader>,
      size: 100,
      cell: ({ row }) => (
        <div>
          <CategoryBadge label={getCategoryName(categories, row.original.categoryId)} categorized={Boolean(row.original.categoryId)} />
          <div className="mt-1"><KindBadge kind={row.original.kind} /></div>
          {row.original.recurrencePattern ? <div className="mt-1"><PatternBadge transaction={row.original} /></div> : null}
        </div>
      ),
    },
    {
      id: "correction",
      header: "Correctie",
      size: 418,
      cell: ({ row }) => !canEdit ? (
        <span className="text-[0.7rem] text-[var(--color-text-subtle)]">Alleen lezen</span>
      ) : row.original.kind === "interne_overboeking" ? (
        <span className="text-[0.7rem] text-[var(--color-text-subtle)]">Kruispost, telt niet mee</span>
      ) : (
        <CategoryCorrectionForm dense transactionId={row.original.id} categories={sortedCategories} defaultCategoryId={suggestedCategory(row.original)} defaultRulePattern={suggestRule(row.original).pattern} defaultRuleScope={suggestRule(row.original).scope} suggestionScore={showCategorySuggestion(row.original) ? row.original.categorySuggestionScore : undefined} suggestionReason={row.original.categorySuggestionReason} />
      ),
    },
  ] as ColumnDef<Transaction>[]).filter((column) => {
    const id = "id" in column ? column.id : undefined;
    return !id || !(["account", "counterAccount", "status", "correction"] as string[]).includes(String(id)) || columnPreferences.includes(id as TransactionOptionalColumn);
  });
  const table = useReactTable({ data: transactions, columns, getCoreRowModel: getCoreRowModel() });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [transactions]);

  return (
    <div ref={scrollRef} className="transaction-table-scroll hidden md:block">
      <table className="data-table-modern w-full min-w-[70rem] table-fixed text-left text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => <th key={header.id} className="px-3 py-2.5" style={{ width: header.getSize() }}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-2.5 align-top">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
            </tr>
          ))}
          {!transactions.length ? <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-xs text-[var(--color-text-muted)]">Geen transacties gevonden voor deze filters.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function BulkSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={disabled || pending}>
      <CheckSquare aria-hidden="true" size={14} /> {pending ? "Bezig..." : "Toepassen"}
    </Button>
  );
}

function suggestRule(transaction: Transaction) {
  const counterparty = normalizeRuleText(transaction.counterparty);
  const counterAccount = normalizeRuleText(transaction.counterAccount ?? "");
  const description = normalizeRuleText(transaction.description);
  if (isPersonLikeCounterparty(counterparty) && counterAccount) return { pattern: `${counterparty} ${counterAccount}`.slice(0, 110), scope: "counterparty_counter_account" as const };
  if (isPersonLikeCounterparty(counterparty) && description) return { pattern: `${counterparty} ${description}`.slice(0, 110), scope: "counterparty_description" as const };
  const merchant = counterparty.replace(/\s+\d{2,}$/g, "").trim();
  return { pattern: merchant || description.slice(0, 110), scope: counterparty ? "counterparty" as const : "description" as const };
}

function normalizeRuleText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s*"+\s*$/g, "").trim();
}

function isPersonLikeCounterparty(value: string) {
  return /\b(?:van der|van den|de|van)\s+[A-Z][a-z]+/.test(value) || /^[A-Z]\.?\s*[A-Z]?\.?\s+/.test(value);
}

function counterInfoLabel(transaction: Transaction) {
  if (transaction.counterAccount) return `Van/naar ${transaction.counterAccount}`;
  const potName = extractNamedTransferLabel(transaction.description);
  if (transaction.internalTransferGroup && potName) return `Eigen rekening ${potName}`;
  if (potName) return `Rekening onbekend · ${potName}`;
  return "Rekening onbekend";
}

function extractNamedTransferLabel(description: string) {
  return description.match(/\b(?:naar|van):\s*([^"]+)/i)?.[1]?.replace(/\s+/g, " ").trim();
}

function extractIban(description: string) {
  const compact = description.replace(/\s+/g, "");
  return compact.match(/\b[A-Z]{2}\d{2}[A-Z]{4}\d{10}\b/i)?.[0]?.toUpperCase();
}

function KindBadge({ kind }: { kind: TransactionKind }) {
  const tone = kind === "interne_overboeking" ? "info" : kind === "inkomen" ? "success" : kind === "vaste_last" ? "warning" : "neutral";
  const label = kind === "interne_overboeking" ? "eigen overboeking" : kind.replaceAll("_", " ");
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

function CategoryBadge({ label, categorized }: { label: string; categorized: boolean }) {
  return (
    <span className={cn("block truncate rounded-md px-2 py-1 text-[0.72rem] font-bold", categorized ? "bg-[var(--color-brand-subtle)] text-brand" : "bg-[var(--color-warning-subtle)] text-amber-900")}>
      {label}
    </span>
  );
}

function PatternBadge({ transaction }: { transaction: Transaction }) {
  const label = transaction.recurrencePattern === "afwijking" ? "Afwijking" : `Terugkerend · ${confidenceLabel(transaction.recurrenceConfidence)}`;
  return <StatusBadge tone={transaction.recurrencePattern === "afwijking" ? "warning" : "info"}>{label}</StatusBadge>;
}

function confidenceLabel(confidence?: Transaction["recurrenceConfidence"]) {
  return confidence === "high" ? "hoog" : confidence === "medium" ? "gemiddeld" : "laag";
}

function showCategorySuggestion(transaction: Transaction) {
  return Boolean(transaction.suggestedCategoryId && (!transaction.categoryId || transaction.categoryId === "overig" || transaction.categoryId === "overig-inkomen"));
}

function suggestedCategory(transaction: Transaction) {
  return showCategorySuggestion(transaction) ? transaction.suggestedCategoryId : transaction.categoryId;
}

function SortHeader({ field, filters, children, align }: { field: NonNullable<TransactionSearchFilters["sortBy"]>; filters: TransactionSearchFilters; children: React.ReactNode; align?: "right" }) {
  const active = (filters.sortBy ?? "date") === field;
  const nextDirection = active && filters.sortDirection !== "asc" ? "asc" : "desc";
  const params = transactionFiltersToParams({ ...filters, sortBy: field, sortDirection: nextDirection });
  return <Link href={`/transacties?${params.toString()}`} className={cn("inline-flex items-center gap-1 hover:text-brand", align === "right" && "w-full justify-end", active && "text-brand")}><span>{children}</span><ArrowDownUp aria-hidden="true" size={11} /></Link>;
}

function PaginationLink({ children, disabled, href }: { children: React.ReactNode; disabled: boolean; href: string }) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-2 text-xs font-semibold text-[var(--color-text-subtle)] opacity-45">
        {children}
      </span>
    );
  }

  return (
    <Link className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-2 text-xs font-semibold text-brand transition-colors duration-200 hover:border-brand hover:bg-[var(--color-brand-subtle)]" href={href}>
      {children}
    </Link>
  );
}

function transactionHref(filters: TransactionSearchFilters, page: number) {
  const params = transactionFiltersToParams(filters);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/transacties?${query}` : "/transacties";
}

function transactionFilterKey(filters: TransactionSearchFilters) {
  return [
    filters.month ?? "alle",
    filters.accountId ?? "alle",
    filters.counterAccountKey ?? "alle",
    filters.categoryId ?? "alle",
    filters.kind ?? "alle",
    filters.minAmount ?? "",
    filters.maxAmount ?? "",
    filters.review ? "review" : "all",
    filters.pattern ?? "alle",
    filters.confidence ?? "alle",
    filters.sortBy ?? "date",
    filters.sortDirection ?? "desc",
    filters.query ?? "",
  ].join("|");
}
