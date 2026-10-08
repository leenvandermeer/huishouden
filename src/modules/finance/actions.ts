"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMutableUser, requireUser } from "@/modules/auth/service";
import type { AccountType, Frequency } from "@/modules/finance/types";
import {
  applyAllCategorizationRules,
  addAccountAlias,
  archiveRecurringIncome,
  archiveCategorizationRule,
  archiveCategory,
  archiveFixedExpense,
  bulkUpdateTransactionCategory,
  classifyFixedExpenseTransactions,
  copyBudgetPlan,
  createAccountRecord,
  DEFAULT_TRANSACTION_COLUMNS,
  deleteBudgetRecord,
  deleteAnnualBudgetRecord,
  getSavedFiltersFromDatabase,
  getBudgetsFromDatabase,
  getFinanceDatasetFromDatabase,
  installMarketMappingPreset,
  ignoreFixedExpenseCandidate,
  ignoreRecurringIncomeCandidate,
  mergeAccountRecords,
  resolveCounterAccountKeyFromDatabase,
  saveCategorizationRule,
  saveCategoryRecord,
  saveTransactionColumnsToDatabase,
  savePlannedCashEvent,
  deletePlannedCashEvent,
  skipForecastEvent,
  restoreForecastEvent,
  toggleAccountImportExclusion,
  updateAccountDetails,
  updateAccountBalance,
  undoImport,
  upsertBudget,
  upsertAnnualBudget,
  upsertBudgetPlan,
  upsertFixedExpense,
  upsertRecurringIncome,
  upsertMonthClosure,
  upsertReportSignalStatus,
  updateTransactionCategory,
  writeAuditLog,
  type TransactionKindFilter,
  type TransactionOptionalColumn,
  type TransactionSearchFilters,
} from "./repository";
import type { CategorizationRuleScope, Category } from "./types";
import { getBudgetSuggestions, isReportPeriodType, isValidReportPeriod, parseBudgetSuggestionWindow } from "./reporting";

export async function changeTransactionCategory(formData: FormData) {
  const user = await requireMutableUser();
  const transactionId = String(formData.get("transactionId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const saveRule = formData.get("saveRule") === "on";
  const rulePattern = String(formData.get("rulePattern") ?? "").trim();
  const ruleScope = parseRuleScope(formData.get("ruleScope"));
  if (!transactionId || !categoryId) return;

  await updateTransactionCategory(transactionId, categoryId, { saveRule, rulePattern, ruleScope });
  await writeAuditLog({ actorUserId: user.id, eventType: "transaction.category_changed", entityType: "transaction", entityId: transactionId, details: { categoryId, saveRule, rulePattern, ruleScope } });
  revalidatePath("/");
  revalidatePath("/transacties");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
  revalidatePath("/categoriseren");
}

export async function bulkChangeTransactionCategory(formData: FormData) {
  const user = await requireMutableUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const applyToAllFiltered = formData.get("applyToAllFiltered") === "on";
  const returnTo = parseTransactionReturnPath(formData.get("returnTo"));
  if (!categoryId) return;

  const filters = await parseTransactionFiltersFromForm(formData);
  const updated = await bulkUpdateTransactionCategory(
    applyToAllFiltered
      ? { categoryId, filters }
      : { categoryId, transactionIds: formData.getAll("transactionId").map((value) => String(value)) },
  );

  await writeAuditLog({
    actorUserId: user.id,
    eventType: "transaction.category_bulk_changed",
    entityType: "transaction",
    entityId: applyToAllFiltered ? "filtered-selection" : "selected-transactions",
    details: {
      categoryId,
      updated,
      scope: applyToAllFiltered ? "filtered" : "selected",
      filters: applyToAllFiltered ? sanitizeTransactionFiltersForAudit(filters) : undefined,
    },
  });
  revalidatePath("/transacties");
  revalidatePath("/categoriseren");
  redirect(returnTo);
}

export async function saveBudget(formData: FormData) {
  const user = await requireMutableUser();
  const month = String(formData.get("month") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const planned = parseAmount(formData.get("planned"));
  const rollover = formData.get("rollover") === "on";
  const metadataProvided = formData.has("note") || formData.has("exceptionAccepted");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const exceptionAccepted = formData.get("exceptionAccepted") === "on";
  if (!month || !categoryId || planned <= 0) return;

  await upsertBudget({ month, categoryId, planned, rollover, note: note || null, exceptionAccepted, metadataProvided });
  await writeAuditLog({ actorUserId: user.id, eventType: "budget.saved", entityType: "budget", entityId: `${month}:${categoryId}`, details: { month, categoryId, planned, rollover, note: note || null, exceptionAccepted } });
  revalidatePath("/");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
}

export async function saveAnnualBudget(formData: FormData) {
  const user = await requireMutableUser();
  const year = Number(formData.get("year"));
  const categoryId = String(formData.get("categoryId") ?? "");
  const planned = parseAmount(formData.get("planned"));
  if (!Number.isInteger(year) || year < 2000 || year > 2200 || !categoryId || planned <= 0) return;

  await upsertAnnualBudget({ year, categoryId, planned });
  await writeAuditLog({ actorUserId: user.id, eventType: "annual_budget.saved", entityType: "annual_budget", entityId: `${year}:${categoryId}`, details: { year, categoryId, planned } });
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
  redirect(`/budgetten?view=jaar&year=${year}`);
}

export async function deleteAnnualBudget(formData: FormData) {
  const user = await requireMutableUser();
  const year = Number(formData.get("year"));
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!Number.isInteger(year) || !categoryId) return;

  await deleteAnnualBudgetRecord({ year, categoryId });
  await writeAuditLog({ actorUserId: user.id, eventType: "annual_budget.deleted", entityType: "annual_budget", entityId: `${year}:${categoryId}`, details: { year, categoryId } });
  revalidatePath("/budgetten");
  redirect(`/budgetten?view=jaar&year=${year}`);
}

export async function applyBudgetSuggestions(formData: FormData) {
  const user = await requireMutableUser();
  const month = String(formData.get("month") ?? "");
  const suggestionMonths = parseBudgetSuggestionWindow(formData.get("suggestionMonths"));
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const [dataset, budgets] = await Promise.all([getFinanceDatasetFromDatabase(), getBudgetsFromDatabase(month)]);
  const existing = new Set(budgets.filter((budget) => budget.planned > 0).map((budget) => budget.categoryId));
  const variableCategoryIds = new Set(dataset.categories.filter((category) => !category.validTo && category.kind === "variabele_uitgave").map((category) => category.id));
  const proposals = getBudgetSuggestions(dataset.transactions, dataset.categories, month, suggestionMonths)
    .filter((suggestion) => variableCategoryIds.has(suggestion.categoryId) && !existing.has(suggestion.categoryId))
    .map((suggestion) => ({ month, categoryId: suggestion.categoryId, planned: suggestion.amount, rollover: false }));
  const applied = await upsertBudgetPlan(proposals);

  await writeAuditLog({
    actorUserId: user.id,
    eventType: "budget.suggestions_applied",
    entityType: "budget",
    entityId: month,
    details: { month, suggestionMonths, applied },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/budgetten");
  redirect(`/budgetten?month=${month}&applied=${applied}&suggestionMonths=${suggestionMonths}`);
}

export async function deleteBudget(formData: FormData) {
  const user = await requireMutableUser();
  const month = String(formData.get("month") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!month || !categoryId) return;

  await deleteBudgetRecord({ month, categoryId });
  await writeAuditLog({ actorUserId: user.id, eventType: "budget.deleted", entityType: "budget", entityId: `${month}:${categoryId}`, details: { month, categoryId } });
  revalidatePath("/");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
}

export async function copyBudget(formData: FormData) {
  const user = await requireMutableUser();
  const sourceMonth = String(formData.get("sourceMonth") ?? "");
  const targetMonth = String(formData.get("targetMonth") ?? "");
  const suggestionMonths = parseBudgetSuggestionWindow(formData.get("suggestionMonths"));
  if (!sourceMonth || !targetMonth || sourceMonth === targetMonth || formData.get("confirmCopy") !== "yes") return;

  const result = await copyBudgetPlan({ sourceMonth, targetMonth });
  await writeAuditLog({
    actorUserId: user.id,
    eventType: "budget.copied",
    entityType: "budget",
    entityId: `${sourceMonth}:${targetMonth}`,
    details: { sourceMonth, targetMonth, copied: result.copied },
  });
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
  redirect(`/budgetten?month=${targetMonth}&view=instellingen&copied=${result.copied}&source=${sourceMonth}&suggestionMonths=${suggestionMonths}`);
}

export async function saveMonthClosure(formData: FormData) {
  const user = await requireMutableUser();
  const month = String(formData.get("month") ?? "");
  const view = String(formData.get("view") ?? "begroting");
  const periodType = String(formData.get("periodType") ?? "month");
  const closed = formData.get("closed") === "on";
  const note = String(formData.get("note") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  await upsertMonthClosure({ month, closed, note });
  await writeAuditLog({ actorUserId: user.id, eventType: closed ? "month.closed" : "month.reopened", entityType: "month", entityId: month, details: { month, note } });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
  redirect(`/rapportages?periodType=${periodType}&period=${month}&view=${view}`);
}

export async function setReportSignalStatus(formData: FormData) {
  const user = await requireMutableUser();
  const signalId = String(formData.get("signalId") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const periodTypeValue = String(formData.get("periodType") ?? "month");
  const statusValue = String(formData.get("status") ?? "open");
  const referencePeriods = ["3", "6", "12"].includes(String(formData.get("referencePeriods"))) ? String(formData.get("referencePeriods")) : "3";
  const periodType = isReportPeriodType(periodTypeValue) ? periodTypeValue : "month";
  const status = statusValue === "resolved" || statusValue === "dismissed" ? statusValue : "open";
  if (!signalId || signalId.length > 500 || !isValidReportPeriod(period, periodType)) return;

  await upsertReportSignalStatus({ signalId, period, periodType, status, userId: user.id });
  await writeAuditLog({ actorUserId: user.id, eventType: "report_signal.status_changed", entityType: "report_signal", entityId: signalId, details: { period, periodType, status } });
  revalidatePath("/rapportages");
  redirect(`/rapportages?periodType=${periodType}&period=${encodeURIComponent(period)}&view=acties&referencePeriods=${referencePeriods}`);
}

export async function rollbackImport(formData: FormData) {
  const user = await requireMutableUser();
  const importId = String(formData.get("importId") ?? "");
  if (!importId) return;
  if (formData.get("confirmRollback") !== "on") {
    redirect("/importeren?status=bevestig-terugdraaien");
  }

  const result = await undoImport(importId);
  if (!result) {
    redirect("/importeren?status=import-niet-gevonden");
  }

  await writeAuditLog({ actorUserId: user.id, eventType: "import.rolled_back", entityType: "import", entityId: importId, details: result });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/importeren");
  revalidatePath("/transacties");
  revalidatePath("/categoriseren");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
  revalidatePath("/rekeningen");
  revalidatePath("/vermogen");
  revalidatePath("/sparen");
  redirect(`/importeren?status=import-teruggedraaid&deleted=${result.deletedTransactions}`);
}

export async function saveFixedExpense(formData: FormData) {
  const user = await requireMutableUser();
  const id = String(formData.get("fixedExpenseId") ?? "") || undefined;
  const supplier = String(formData.get("supplier") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const amount = parseAmount(formData.get("amount"));
  const frequency = parseFrequency(formData.get("frequency"));
  const dueDateMode = String(formData.get("dueDateMode") ?? (formData.get("nextDueOn") ? "manual" : "automatic"));
  const nextDueOn = dueDateMode === "manual" ? parseOptionalDate(formData.get("nextDueOn")) : undefined;
  if (!supplier || !categoryId || amount <= 0) return;
  if (dueDateMode === "manual" && !nextDueOn) return;

  await upsertFixedExpense({ id, supplier, categoryId, amount, frequency, nextDueOn });
  if (formData.get("updateTransactions") === "on") {
    await classifyFixedExpenseTransactions({ supplier, categoryId });
  }
  await writeAuditLog({ actorUserId: user.id, eventType: "fixed_expense.saved", entityType: "fixed_expense", entityId: id ?? supplier, details: { id, supplier, categoryId, amount, frequency, nextDueOn, updateTransactions: formData.get("updateTransactions") === "on" } });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/transacties");
  revalidatePath("/budgetten");
  revalidatePath("/vaste-lasten");
  revalidatePath("/rapportages");
}

export async function deleteFixedExpense(formData: FormData) {
  const user = await requireMutableUser();
  const fixedExpenseId = String(formData.get("fixedExpenseId") ?? "");
  if (!fixedExpenseId) return;

  await archiveFixedExpense(fixedExpenseId);
  await writeAuditLog({ actorUserId: user.id, eventType: "fixed_expense.archived", entityType: "fixed_expense", entityId: fixedExpenseId });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/vaste-lasten");
  revalidatePath("/rapportages");
}

export async function saveRecurringIncome(formData: FormData) {
  const user = await requireMutableUser();
  const id = String(formData.get("recurringIncomeId") ?? "") || undefined;
  const label = String(formData.get("label") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const frequency = parseFrequency(formData.get("frequency"));
  const nextExpectedOn = parseOptionalDate(formData.get("nextExpectedOn"));
  if (!label || amount <= 0 || !nextExpectedOn) return;

  await upsertRecurringIncome({ id, label, amount, frequency, nextExpectedOn });
  await writeAuditLog({
    actorUserId: user.id,
    eventType: "recurring_income.saved",
    entityType: "recurring_income",
    entityId: id ?? label,
    details: { id, label, amount, frequency, nextExpectedOn },
  });
  revalidatePath("/dashboard");
  revalidatePath("/vaste-lasten");
}

export async function deleteRecurringIncome(formData: FormData) {
  const user = await requireMutableUser();
  const recurringIncomeId = String(formData.get("recurringIncomeId") ?? "");
  if (!recurringIncomeId) return;

  await archiveRecurringIncome(recurringIncomeId);
  await writeAuditLog({ actorUserId: user.id, eventType: "recurring_income.archived", entityType: "recurring_income", entityId: recurringIncomeId });
  revalidatePath("/dashboard");
  revalidatePath("/vaste-lasten");
}

export async function rejectRecurringIncomeCandidate(formData: FormData) {
  const user = await requireMutableUser();
  const candidateId = String(formData.get("candidateId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!candidateId || !label) return;

  await ignoreRecurringIncomeCandidate({ candidateId, label });
  await writeAuditLog({ actorUserId: user.id, eventType: "recurring_income_candidate.ignored", entityType: "ignored_suggestion", entityId: candidateId, details: { label } });
  revalidatePath("/dashboard");
  revalidatePath("/vaste-lasten");
}

export async function rejectFixedExpenseCandidate(formData: FormData) {
  const user = await requireMutableUser();
  const candidateId = String(formData.get("candidateId") ?? "");
  const supplier = String(formData.get("supplier") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!candidateId || !supplier) return;

  await ignoreFixedExpenseCandidate({ candidateId, supplier, reason });
  await writeAuditLog({ actorUserId: user.id, eventType: "fixed_expense_candidate.ignored", entityType: "ignored_suggestion", entityId: candidateId, details: { supplier, reason } });
  revalidatePath("/");
  revalidatePath("/beheer");
  revalidatePath("/vaste-lasten");
}

export async function saveCategory(formData: FormData) {
  const user = await requireMutableUser();
  const id = String(formData.get("categoryId") ?? "") || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const parent = String(formData.get("parent") ?? "").trim() || undefined;
  const kind = String(formData.get("kind") ?? "variabele_uitgave") as Category["kind"];
  if (!name) return;

  await saveCategoryRecord({ id, name, parent, kind });
  await writeAuditLog({ actorUserId: user.id, eventType: "category.saved", entityType: "category", entityId: id ?? name, details: { id, name, parent, kind } });
  revalidatePath("/");
  revalidatePath("/categorieen");
  revalidatePath("/transacties");
  revalidatePath("/budgetten");
  revalidatePath("/vaste-lasten");
}

export async function deleteCategory(formData: FormData) {
  const user = await requireMutableUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return;

  await archiveCategory(categoryId);
  await writeAuditLog({ actorUserId: user.id, eventType: "category.archived", entityType: "category", entityId: categoryId });
  revalidatePath("/");
  revalidatePath("/categorieen");
  revalidatePath("/transacties");
  revalidatePath("/budgetten");
  revalidatePath("/vaste-lasten");
}

export async function saveRule(formData: FormData) {
  const user = await requireMutableUser();
  const id = String(formData.get("ruleId") ?? "") || undefined;
  const pattern = String(formData.get("pattern") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const matchScope = parseRuleScope(formData.get("matchScope"));
  if (!pattern || !categoryId) return;

  await saveCategorizationRule({ id, pattern, categoryId, matchScope });
  await writeAuditLog({ actorUserId: user.id, eventType: "rule.saved", entityType: "categorization_rule", entityId: id ?? pattern, details: { id, pattern, categoryId, matchScope } });
  revalidatePath("/mappingregels");
  revalidatePath("/categorieen");
}

export async function deleteRule(formData: FormData) {
  const user = await requireMutableUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId) return;

  await archiveCategorizationRule(ruleId);
  await writeAuditLog({ actorUserId: user.id, eventType: "rule.archived", entityType: "categorization_rule", entityId: ruleId });
  revalidatePath("/mappingregels");
  revalidatePath("/categorieen");
}

export async function applyRules() {
  const user = await requireMutableUser();
  await applyAllCategorizationRules();
  await writeAuditLog({ actorUserId: user.id, eventType: "rules.applied", entityType: "categorization_rule" });
  revalidatePath("/");
  revalidatePath("/mappingregels");
  revalidatePath("/categorieen");
  revalidatePath("/transacties");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
}

export async function applyMarketPreset() {
  const user = await requireMutableUser();
  const result = await installMarketMappingPreset();
  await writeAuditLog({
    actorUserId: user.id,
    eventType: "rules.market_preset_applied",
    entityType: "categorization_rule",
    details: result,
  });
  revalidatePath("/");
  revalidatePath("/mappingregels");
  revalidatePath("/categorieen");
  revalidatePath("/transacties");
  revalidatePath("/budgetten");
  revalidatePath("/vaste-lasten");
  revalidatePath("/rapportages");
}

export async function saveAccountBalance(formData: FormData) {
  const user = await requireMutableUser();
  const accountId = String(formData.get("accountId") ?? "");
  const accountIban = String(formData.get("accountIban") ?? "");
  const balance = parseAmount(formData.get("balance"));
  const balanceDate = String(formData.get("balanceDate") ?? "");
  if (!accountId || !accountIban || !balanceDate) return;

  await updateAccountBalance({ accountId, accountIban, balance, balanceDate });
  await writeAuditLog({ actorUserId: user.id, eventType: "account.balance_saved", entityType: "account", entityId: accountId, details: { accountIban, balance, balanceDate } });
  revalidatePath("/");
  revalidatePath("/rekeningen");
  revalidatePath("/vermogen");
  revalidatePath("/transacties");
  revalidatePath("/categoriseren");
  revalidatePath("/rapportages");
}

export async function saveAccountDetails(formData: FormData) {
  const user = await requireMutableUser();
  const accountId = String(formData.get("accountId") ?? "");
  const accountIban = String(formData.get("accountIban") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = parseAccountType(formData.get("type"));
  const ownAccount = true;
  const balance = parseAmount(formData.get("balance"));
  const balanceDate = String(formData.get("balanceDate") ?? "");
  if (!accountId || !accountIban || !name) return;

  await updateAccountDetails({ accountId, accountIban, name, type, ownAccount });
  if (balanceDate) {
    await updateAccountBalance({ accountId, accountIban, balance, balanceDate });
  }
  await writeAuditLog({ actorUserId: user.id, eventType: "account.saved", entityType: "account", entityId: accountId, details: { accountIban, name, type, ownAccount, balance, balanceDate } });
  revalidatePath("/");
  revalidatePath("/rekeningen");
  revalidatePath("/vermogen");
  revalidatePath("/rapportages");
}

export async function createAccount(formData: FormData) {
  const user = await requireMutableUser();
  const name = String(formData.get("name") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim();
  const bank = String(formData.get("bank") ?? "Bank").trim() || "Bank";
  const type = parseAccountType(formData.get("type"));
  const balance = parseAmount(formData.get("balance"));
  const balanceDate = String(formData.get("balanceDate") ?? "");
  const ownAccount = true;
  if (!name || !iban || !balanceDate) return;

  const accountId = await createAccountRecord({ name, iban, bank, type, balance, balanceDate, ownAccount });
  await writeAuditLog({ actorUserId: user.id, eventType: "account.created", entityType: "account", entityId: accountId, details: { name, iban, bank, type, balance, balanceDate, ownAccount } });
  revalidatePath("/");
  revalidatePath("/rekeningen");
  revalidatePath("/vermogen");
  revalidatePath("/rapportages");
  redirect("/rekeningen");
}

function parseAccountType(value: FormDataEntryValue | null): AccountType {
  const type = String(value ?? "betaalrekening");
  return type === "spaarrekening" || type === "beleggingsrekening" || type === "schuld" ? type : "betaalrekening";
}

export async function saveAccountAlias(formData: FormData) {
  const user = await requireMutableUser();
  const accountId = String(formData.get("accountId") ?? "");
  const alias = String(formData.get("alias") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || undefined;
  if (!accountId || !alias) return;

  await addAccountAlias({ accountId, alias, label });
  await writeAuditLog({ actorUserId: user.id, eventType: "account.alias_saved", entityType: "account", entityId: accountId, details: { alias, label } });
  revalidatePath("/rekeningen");
  revalidatePath("/transacties");
  revalidatePath("/categoriseren");
  revalidatePath("/importeren");
}

export async function mergeAccounts(formData: FormData) {
  const user = await requireMutableUser();
  const sourceAccountId = String(formData.get("sourceAccountId") ?? "");
  const targetAccountId = String(formData.get("targetAccountId") ?? "");
  if (!sourceAccountId || !targetAccountId || sourceAccountId === targetAccountId) return;

  const moved = await mergeAccountRecords({ sourceAccountId, targetAccountId });
  await writeAuditLog({ actorUserId: user.id, eventType: "account.merged", entityType: "account", entityId: targetAccountId, details: { sourceAccountId, targetAccountId, moved } });
  revalidatePath("/");
  revalidatePath("/rekeningen");
  revalidatePath("/vermogen");
  revalidatePath("/transacties");
  revalidatePath("/rapportages");
}

function parseAmount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function parseRuleScope(value: FormDataEntryValue | null): CategorizationRuleScope {
  if (
    value === "counterparty" ||
    value === "description" ||
    value === "counter_account" ||
    value === "counterparty_description" ||
    value === "counterparty_counter_account" ||
    value === "description_counter_account" ||
    value === "all"
  ) return value;
  return "all";
}

async function parseTransactionFiltersFromForm(formData: FormData): Promise<TransactionSearchFilters> {
  const counterAccountKey = nonEmptyString(formData.get("counterAccountKey"));
  const pattern = String(formData.get("pattern") ?? "");
  const confidence = String(formData.get("confidence") ?? "");
  return {
    query: nonEmptyString(formData.get("q")),
    month: nonEmptyString(formData.get("month")),
    accountId: nonEmptyString(formData.get("accountId")),
    counterAccountKey,
    counterAccount: counterAccountKey ? await resolveCounterAccountKeyFromDatabase(counterAccountKey) : undefined,
    categoryId: nonEmptyString(formData.get("filterCategoryId")),
    kind: parseTransactionKindFilter(formData.get("kind")),
    minAmount: parseOptionalAmount(formData.get("minAmount")),
    maxAmount: parseOptionalAmount(formData.get("maxAmount")),
    review: formData.get("mode") === "review",
    pattern: pattern === "terugkerend" || pattern === "afwijking" ? pattern : "alle",
    confidence: confidence === "high" || confidence === "medium" || confidence === "low" ? confidence : "alle",
  };
}

function sanitizeTransactionFiltersForAudit(filters: TransactionSearchFilters): TransactionSearchFilters {
  const safeFilters = { ...filters };
  delete safeFilters.counterAccount;
  return safeFilters;
}

function parseTransactionKindFilter(value: FormDataEntryValue | null): TransactionKindFilter {
  if (value === "inkomen" || value === "vaste_last" || value === "variabele_uitgave" || value === "reservering" || value === "interne_overboeking" || value === "uitgaven") return value;
  return "alle";
}

function parseOptionalAmount(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = parseAmount(text);
  return parsed > 0 ? Math.abs(parsed) : undefined;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : undefined;
}

function parseFrequency(value: FormDataEntryValue | null): Frequency {
  if (value === "vierwekelijks" || value === "kwartaal" || value === "jaarlijks") return value;
  return "maandelijks";
}

function nonEmptyString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function parseTransactionReturnPath(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  return text.startsWith("/transacties") ? text : "/transacties";
}

export async function saveTransactionFilter(formData: FormData) {
  const user = await requireMutableUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const filters: Record<string, string> = {};
  for (const key of ["q", "month", "accountId", "counterAccountKey", "categoryId", "kind", "minAmount", "maxAmount", "mode", "pattern", "confidence", "sortBy", "sortDirection"]) {
    const value = String(formData.get(key) ?? "").trim();
    if (value && value !== "alle") filters[key] = value;
  }

  const { saveFilterToDatabase } = await import("./repository");
  await saveFilterToDatabase({ userId: user.id, name, filters });
  revalidatePath("/transacties");
}

export async function saveTransactionColumns(formData: FormData) {
  const user = await requireUser();
  const requested = formData.getAll("column").map(String);
  const columns = DEFAULT_TRANSACTION_COLUMNS.filter((column) => requested.includes(column)) as TransactionOptionalColumn[];
  await saveTransactionColumnsToDatabase(user.id, columns);
  revalidatePath("/transacties");
}

export async function saveOneOffCashEvent(formData: FormData) {
  const user = await requireMutableUser();
  const label = String(formData.get("label") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const direction = formData.get("direction") === "income" ? "income" : "expense";
  const dueOn = parseOptionalDate(formData.get("dueOn"));
  const accountId = nonEmptyString(formData.get("accountId"));
  if (!label || amount <= 0 || !dueOn) return;
  const id = await savePlannedCashEvent({ label, amount, direction, dueOn, accountId });
  await writeAuditLog({ actorUserId: user.id, eventType: "planned_event.saved", entityType: "planned_cash_event", entityId: id, details: { label, amount, direction, dueOn, accountId } });
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function removeOneOffCashEvent(formData: FormData) {
  const user = await requireMutableUser();
  const id = String(formData.get("eventId") ?? "");
  if (!id) return;
  await deletePlannedCashEvent(id);
  await writeAuditLog({ actorUserId: user.id, eventType: "planned_event.deleted", entityType: "planned_cash_event", entityId: id, details: {} });
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function skipOneForecastOccurrence(formData: FormData) {
  const user = await requireMutableUser();
  const eventKey = String(formData.get("eventKey") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const occurrenceDate = parseOptionalDate(formData.get("occurrenceDate"));
  if (!eventKey || !label || !occurrenceDate) return;
  await skipForecastEvent({ eventKey, label, occurrenceDate });
  await writeAuditLog({ actorUserId: user.id, eventType: "forecast_event.skipped", entityType: "forecast_event", entityId: eventKey, details: { label, occurrenceDate } });
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function makeForecastEventOneOff(formData: FormData) {
  const user = await requireMutableUser();
  const sourceType = String(formData.get("sourceType") ?? "");
  const sourceId = String(formData.get("sourceId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const direction = formData.get("direction") === "income" ? "income" : "expense";
  const dueOn = parseOptionalDate(formData.get("dueOn"));
  if (!sourceId || !label || amount <= 0 || !dueOn || (sourceType !== "income" && sourceType !== "expense")) return;
  const plannedId = await savePlannedCashEvent({ label, amount, direction, dueOn });
  if (sourceType === "income") await ignoreRecurringIncomeCandidate({ candidateId: sourceId, label });
  if (sourceType === "expense") await archiveFixedExpense(sourceId);
  await writeAuditLog({ actorUserId: user.id, eventType: "forecast_event.made_one_off", entityType: "planned_cash_event", entityId: plannedId, details: { sourceType, sourceId, label, amount, direction, dueOn } });
  revalidatePath("/planning");
  revalidatePath("/dashboard");
  revalidatePath("/vaste-lasten");
}

export async function undoSkippedForecastOccurrence(formData: FormData) {
  const user = await requireMutableUser();
  const eventKey = String(formData.get("eventKey") ?? "");
  if (!eventKey) return;
  await restoreForecastEvent(eventKey);
  await writeAuditLog({ actorUserId: user.id, eventType: "forecast_event.restored", entityType: "forecast_event", entityId: eventKey, details: {} });
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function deleteTransactionFilter(formData: FormData) {
  const user = await requireMutableUser();
  const filterId = String(formData.get("filterId") ?? "").trim();
  if (!filterId) return;

  const { deleteSavedFilter } = await import("./repository");
  await deleteSavedFilter({ filterId, userId: user.id });
  revalidatePath("/transacties");
}

export async function toggleAccountExcludeFromImport(formData: FormData) {
  const user = await requireMutableUser();
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return;

  const result = await toggleAccountImportExclusion(accountId);
  await writeAuditLog({
    eventType: "account.toggle_exclude_import",
    entityType: "account",
    entityId: accountId,
    details: result ? { excluded: result.excluded, deletedTransactions: result.deletedTransactions } : {},
    actorUserId: user.id,
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/rekeningen");
  revalidatePath("/transacties");
  revalidatePath("/categoriseren");
  revalidatePath("/budgetten");
  revalidatePath("/rapportages");
  revalidatePath("/sparen");
}
