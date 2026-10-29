import { redirect } from "next/navigation";
import { TransactionSearch } from "@/components/finance/transaction-search";
import { requireUser } from "@/modules/auth/service";
import { PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { getFinanceMetadataFromDatabase, getSavedFiltersFromDatabase, getTransactionColumnsFromDatabase, getTransactionCounterAccountsFromDatabase, getTransactionMonthsFromDatabase, searchTransactionsFromDatabase } from "@/modules/finance/repository";
import { parseTransactionFilters } from "@/modules/finance/transaction-query";

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const parsedFilters = parseTransactionFilters(params);
  const user = await requireUser();
  const [{ accounts, categories }, months, counterAccounts, savedFilters, transactionColumns] = await Promise.all([
    getFinanceMetadataFromDatabase(),
    getTransactionMonthsFromDatabase(),
    getTransactionCounterAccountsFromDatabase(),
    getSavedFiltersFromDatabase(user.id),
    getTransactionColumnsFromDatabase(user.id),
  ]);
  const rawCounterAccount = single(params.counterAccount);
  if (rawCounterAccount) {
    redirect(counterAccountRedirectPath(params, counterAccounts.find((account) => account.value === rawCounterAccount)?.key));
  }
  const filters = {
    ...parsedFilters,
    counterAccount: counterAccounts.find((account) => account.key === parsedFilters.counterAccountKey)?.value,
  };
  const result = await searchTransactionsFromDatabase(filters);
  return (
    <>
      <PageHeader
        eyebrow={filters.review ? "Controleren" : "Transacties"}
        title={filters.review ? "Te controleren" : "Transacties"}
        description={filters.review ? "Werk onduidelijke categorieën af in dezelfde transactiewerkruimte." : "Zoek een betaling of pas de categorie aan."}
        stats={[
          { label: "Selectie", value: result.total.toLocaleString("nl-NL"), detail: result.total === 1 ? "transactie gevonden" : "transacties gevonden", lead: true },
          { label: "Inkomsten", value: formatCurrency(result.totals.income), tone: "positive" },
          { label: "Gewone uitgaven", value: formatCurrency(result.totals.expenses) },
          { label: "Beleggingen", value: formatCurrency(result.totals.investments) },
          { label: "Overboekingen", value: formatCurrency(result.totals.internal), detail: "intern, telt niet mee" },
        ]}
      />
      <TransactionSearch accounts={accounts} canEdit={user.role !== "readonly"} categories={categories} columnPreferences={transactionColumns} counterAccounts={counterAccounts} filters={filters} months={months} result={result} savedFilters={savedFilters} />
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function counterAccountRedirectPath(params: Record<string, string | string[] | undefined>, counterAccountKey?: string) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "counterAccount") continue;
    const text = single(value);
    if (text) next.set(key, text);
  }
  if (counterAccountKey) next.set("counterAccountKey", counterAccountKey);
  const query = next.toString();
  return query ? `/transacties?${query}` : "/transacties";
}
