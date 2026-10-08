"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronDown, ListChecks, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, FieldLabel, Input, Select } from "@/components/ui";
import { Autocomplete } from "@/components/ui/autocomplete";
import { saveTransactionFilter } from "@/modules/finance/actions";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import type { SavedFilter, TransactionSearchFilters, TransactionSearchResult } from "@/modules/finance/repository";
import type { Account, Category } from "@/modules/finance/types";

interface TransactionFilterFormProps {
  accounts: Account[];
  categories: Category[];
  counterAccounts: Array<{ key: string; value: string; count: number }>;
  filters: TransactionSearchFilters;
  months: string[];
  result: TransactionSearchResult;
  savedFilters?: SavedFilter[];
}

export function TransactionFilterForm({ accounts, categories, counterAccounts, filters, months, result, savedFilters = [] }: TransactionFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [filters.month, filters.accountId, filters.counterAccountKey, filters.categoryId, filters.kind && filters.kind !== "alle" ? filters.kind : undefined, filters.pattern && filters.pattern !== "alle" ? filters.pattern : undefined, filters.confidence && filters.confidence !== "alle" ? filters.confidence : undefined, filters.minAmount, filters.maxAmount].filter(Boolean).length;
  const debouncedUpdateQuery = useDebouncedCallback((nextQuery: string) => updateFilters({ q: nextQuery }), 900);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" })),
    [categories],
  );

  useEffect(() => {
    if (query === (filters.query ?? "")) return;
    debouncedUpdateQuery.run(query);
    return debouncedUpdateQuery.cancel;
  }, [query, filters.query, debouncedUpdateQuery]);

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      const trimmed = value.trim();
      if (!trimmed || trimmed === "alle") {
        params.delete(key);
      } else {
        params.set(key, trimmed);
      }
    }
    params.delete("page");
    const nextQuery = params.toString();
    if (nextQuery === searchParams.toString()) return;
    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  }

  function submitFilters(formData: FormData) {
    updateFilters({
      q: String(formData.get("q") ?? ""),
      month: String(formData.get("month") ?? ""),
      accountId: String(formData.get("accountId") ?? ""),
      counterAccountKey: String(formData.get("counterAccountKey") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      minAmount: String(formData.get("minAmount") ?? ""),
      maxAmount: String(formData.get("maxAmount") ?? ""),
      pattern: String(formData.get("pattern") ?? ""),
      confidence: String(formData.get("confidence") ?? ""),
      sortBy: String(formData.get("sortBy") ?? ""),
      sortDirection: String(formData.get("sortDirection") ?? ""),
    });
  }

  function clearFilters() {
    debouncedUpdateQuery.cancel();
    setQuery("");
    updateFilters({
      q: "",
      month: "",
      accountId: "",
      counterAccountKey: "",
      categoryId: "",
      kind: "",
      minAmount: "",
      maxAmount: "",
      pattern: "",
      confidence: "",
      sortBy: "",
      sortDirection: "",
    });
  }

  return (
    <form action={submitFilters} className={`surface-panel command-filter rounded-[var(--radius-lg)] p-3 ${filtersOpen ? "filters-open" : ""}`}>
      <nav aria-label="Transactiewerkruimte" className="mb-3 flex w-fit rounded-lg border border-border bg-white p-1 text-xs font-semibold">
        <Link href="/transacties" className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 ${!filters.review ? "bg-[var(--color-brand-subtle)] text-brand" : "text-[var(--color-text-muted)]"}`}><Rows3 aria-hidden="true" size={14} /> Alle transacties</Link>
        <Link href="/transacties?mode=review" className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 ${filters.review ? "bg-[var(--color-warning-subtle)] text-amber-900" : "text-[var(--color-text-muted)]"}`}><ListChecks aria-hidden="true" size={14} /> Te controleren</Link>
      </nav>
      <div className="filter-primary-grid grid gap-3 lg:grid-cols-[minmax(18rem,1.4fr)_repeat(5,minmax(9rem,1fr))_auto] lg:items-end">
        <div>
          <FieldLabel htmlFor="zoek">Zoeken</FieldLabel>
          <Autocomplete
            id="zoek"
            name="q"
            value={query}
            onChange={setQuery}
            placeholder="Omschrijving, tegenpartij, rekening, bedrag"
            suggestions={counterAccounts.map((item) => ({ label: item.value, value: item.key, count: item.count }))}
          />
        </div>
        <button type="button" className="mobile-filter-toggle flex min-h-11 items-center justify-between rounded-[var(--radius-md)] border border-border bg-white px-3 text-sm font-semibold text-brand lg:hidden" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
          <span className="flex items-center gap-2"><SlidersHorizontal aria-hidden="true" size={17} /> Filters {activeFilterCount ? `(${activeFilterCount})` : ""}</span>
          <ChevronDown aria-hidden="true" size={17} className={filtersOpen ? "rotate-180 transition" : "transition"} />
        </button>
        <div>
          <FieldLabel htmlFor="periode">Periode</FieldLabel>
          <Select id="periode" name="month" defaultValue={filters.month ?? "alle"} onChange={(event) => updateFilters({ month: event.target.value })}>
            <option value="alle">Alle maanden</option>
            {months.map((item) => <option key={item} value={item}>{formatMonthLabel(item)}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="rekening">Rekening</FieldLabel>
          <Select id="rekening" name="accountId" defaultValue={filters.accountId ?? "alle"} onChange={(event) => updateFilters({ accountId: event.target.value })}>
            <option value="alle">Alle rekeningen</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} - {account.iban}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="tegenrekening">Van of naar</FieldLabel>
          <Select id="tegenrekening" name="counterAccountKey" defaultValue={filters.counterAccountKey ?? "alle"} onChange={(event) => updateFilters({ counterAccountKey: event.target.value })}>
            <option value="alle">Alle andere rekeningen</option>
            {counterAccounts.map((item) => <option key={item.key} value={item.key}>{item.value} ({item.count})</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="categorie">Categorie</FieldLabel>
          <Select id="categorie" name="categoryId" defaultValue={filters.categoryId ?? "alle"} onChange={(event) => updateFilters({ categoryId: event.target.value })}>
            <option value="alle">Alle categorieen</option>
            <option value="geen">Geen categorie</option>
            {sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <Select id="type" name="kind" defaultValue={filters.kind ?? "alle"} onChange={(event) => updateFilters({ kind: event.target.value })}>
            <option value="alle">Alles</option>
            <option value="uitgaven">Uitgaven</option>
            <option value="inkomen">Inkomsten</option>
            <option value="vaste_last">Vaste lasten</option>
            <option value="variabele_uitgave">Variabel</option>
            <option value="reservering">Reservering</option>
            <option value="interne_overboeking">Tussen eigen rekeningen</option>
          </Select>
        </div>
        <Button type="button" variant="ghost" className="lg:mb-0" onClick={clearFilters}>
          <X aria-hidden="true" size={14} /> Wissen
        </Button>
        <SaveFilterButton filters={filters} />
      </div>
      <div className="filter-secondary-grid mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_9rem_minmax(0,1fr)] lg:items-end">
        <div>
          <FieldLabel htmlFor="minAmount">Min. bedrag</FieldLabel>
          <Input id="minAmount" name="minAmount" defaultValue={filters.minAmount != null ? String(filters.minAmount).replace(".", ",") : ""} inputMode="decimal" placeholder="0,00" />
        </div>
        <div>
          <FieldLabel htmlFor="maxAmount">Max. bedrag</FieldLabel>
          <Input id="maxAmount" name="maxAmount" defaultValue={filters.maxAmount != null ? String(filters.maxAmount).replace(".", ",") : ""} inputMode="decimal" placeholder="500,00" />
        </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <SummaryPill label="Gevonden" value={String(result.total)} muted={isPending ? "Filteren..." : `${result.pageSize} per pagina`} />
            <SummaryPill label="Inkomsten" value={formatCurrency(result.totals.income)} />
            <SummaryPill label="Uitgaven" value={formatCurrency(result.totals.expenses)} />
          <SummaryPill label="Beleggingen" value={formatCurrency(result.totals.investments)} />
          <SummaryPill label="Overboekingen" value={formatCurrency(result.totals.internal)} />
        </div>
      </div>
      <div className="advanced-filter-grid mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_12rem_12rem_10rem_minmax(0,1fr)] xl:items-end">
        <div>
          <FieldLabel htmlFor="pattern">Patroon</FieldLabel>
          <Select id="pattern" name="pattern" defaultValue={filters.pattern ?? "alle"} onChange={(event) => updateFilters({ pattern: event.target.value })}>
            <option value="alle">Alle patronen</option>
            <option value="terugkerend">Terugkerend</option>
            <option value="afwijking">Afwijking</option>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="confidence">Zekerheid</FieldLabel>
          <Select id="confidence" name="confidence" defaultValue={filters.confidence ?? "alle"} onChange={(event) => updateFilters({ confidence: event.target.value })}>
            <option value="alle">Alle zekerheid</option>
            <option value="high">Hoog</option>
            <option value="medium">Gemiddeld</option>
            <option value="low">Laag</option>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="sortBy">Sorteren op</FieldLabel>
          <Select id="sortBy" name="sortBy" defaultValue={filters.sortBy ?? "date"} onChange={(event) => updateFilters({ sortBy: event.target.value })}>
            <option value="date">Datum</option>
            <option value="amount">Bedrag</option>
            <option value="counterparty">Tegenpartij</option>
            <option value="account">Rekening</option>
            <option value="category">Categorie</option>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="sortDirection">Volgorde</FieldLabel>
          <Select id="sortDirection" name="sortDirection" defaultValue={filters.sortDirection ?? "desc"} onChange={(event) => updateFilters({ sortDirection: event.target.value })}>
            <option value="desc">Aflopend</option>
            <option value="asc">Oplopend</option>
          </Select>
        </div>
        <p className="text-[0.68rem] leading-5 text-[var(--color-text-subtle)]">Patronen gebruiken dezelfde tegenpartij, richting en transactiesoort over meerdere maanden.</p>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          <Search aria-hidden="true" size={14} /> Zoeken
        </Button>
      </div>
      {savedFilters.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-1 text-[0.68rem] font-semibold text-[var(--color-text-subtle)]">
            <BookmarkCheck aria-hidden="true" size={12} /> Opgeslagen filters:
          </span>
          {savedFilters.map((sf) => (
            <button
              key={sf.id}
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(sf.filters)) {
                  if (value) params.set(key, value);
                }
                startTransition(() => {
                  router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
                });
              }}
              className="inline-flex min-h-7 items-center gap-1 rounded-md border border-border bg-white/80 px-2 text-[0.68rem] font-semibold text-brand transition hover:border-brand hover:bg-[var(--color-brand-subtle)]"
            >
              <Bookmark aria-hidden="true" size={11} /> {sf.name}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function SummaryPill({ label, value, muted }: { label: string; value: string; muted?: string }) {
  return (
    <div className="rounded-md border border-border bg-white/72 px-2.5 py-2 shadow-[0_8px_24px_rgb(19_58_99_/_0.05)]">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-brand">{value}</p>
      {muted ? <p className="mt-0.5 text-[0.65rem] text-[var(--color-text-subtle)]">{muted}</p> : null}
    </div>
  );
}

function SaveFilterButton({ filters }: { filters: TransactionSearchFilters }) {
  const [showInput, setShowInput] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  function handleSave() {
    if (!filterName.trim()) return;
    const formData = new FormData();
    formData.set("name", filterName.trim());
    if (filters.query) formData.set("q", filters.query);
    if (filters.month) formData.set("month", filters.month);
    if (filters.accountId) formData.set("accountId", filters.accountId);
    if (filters.counterAccountKey) formData.set("counterAccountKey", filters.counterAccountKey);
    if (filters.categoryId) formData.set("categoryId", filters.categoryId);
    if (filters.kind) formData.set("kind", filters.kind);
    if (filters.minAmount != null) formData.set("minAmount", String(filters.minAmount));
    if (filters.maxAmount != null) formData.set("maxAmount", String(filters.maxAmount));
    if (filters.review) formData.set("mode", "review");
    if (filters.pattern && filters.pattern !== "alle") formData.set("pattern", filters.pattern);
    if (filters.confidence && filters.confidence !== "alle") formData.set("confidence", filters.confidence);
    if (filters.sortBy) formData.set("sortBy", filters.sortBy);
    if (filters.sortDirection) formData.set("sortDirection", filters.sortDirection);
    startTransition(async () => {
      await saveTransactionFilter(formData);
      setFilterName("");
      setShowInput(false);
      router.refresh();
    });
  }

  if (showInput) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="Naam filter..."
          className="h-7 w-36 rounded-md border border-border px-2 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowInput(false); }}
          autoFocus
        />
        <Button type="button" size="sm" variant="primary" disabled={isPending || !filterName.trim()} onClick={handleSave}>
          Opslaan
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowInput(false)}>
          Annuleer
        </Button>
      </span>
    );
  }

  return (
    <Button type="button" variant="ghost" onClick={() => setShowInput(true)}>
      <Bookmark aria-hidden="true" size={14} /> Filter opslaan
    </Button>
  );
}
