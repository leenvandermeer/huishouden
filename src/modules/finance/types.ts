export type AccountType = "betaalrekening" | "spaarrekening" | "beleggingsrekening" | "schuld";
export type TransactionKind = "inkomen" | "vaste_last" | "variabele_uitgave" | "reservering" | "interne_overboeking";
export type CategorizationRuleScope = "counterparty" | "description" | "counter_account" | "counterparty_description" | "counterparty_counter_account" | "description_counter_account" | "all";
export type Frequency = "maandelijks" | "vierwekelijks" | "kwartaal" | "jaarlijks";

export interface Account {
  id: string;
  name: string;
  iban: string;
  bank: string;
  type: AccountType;
  balance: number;
  openingBalance?: number;
  openingBalanceDate?: string;
  balanceDate?: string;
  balanceCheckedAt?: string;
  balanceSource?: "import" | "manual";
  ownAccount: boolean;
  excluded_from_import: boolean;
  lastImportAt: string;
}

export interface Category {
  id: string;
  name: string;
  parent?: string;
  kind: TransactionKind;
  validTo?: string;
}

export interface CategorizationRule {
  id: string;
  pattern: string;
  matchScope: CategorizationRuleScope;
  categoryId: string;
  kind: TransactionKind;
  active: boolean;
  matchCount: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  accountName?: string;
  counterparty: string;
  counterAccount?: string;
  description: string;
  amount: number;
  categoryId?: string;
  kind: TransactionKind;
  internalTransferGroup?: string;
  ruleApplied?: string;
  sourceFile?: string;
  recurrencePattern?: "terugkerend" | "afwijking";
  recurrenceConfidence?: "high" | "medium" | "low";
  recurrenceEvidenceCount?: number;
  suggestedCategoryId?: string;
  categorySuggestionScore?: number;
  categorySuggestionReason?: string;
}

export interface Budget {
  id: string;
  month: string;
  categoryId: string;
  planned: number;
  basePlanned?: number;
  carriedAmount?: number;
  actual: number;
  rollover: boolean;
  note?: string;
  exceptionAccepted?: boolean;
}

export interface AnnualBudget {
  id: string;
  year: number;
  categoryId: string;
  planned: number;
  actual: number;
}

export interface SavingsPot {
  id: string;
  accountId?: string;
  name: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  monthlyReservation?: number;
  movementCount?: number;
  movementBalance?: number;
  firstMovementAt?: string;
  lastMovementAt?: string;
}

export interface FixedExpense {
  id: string;
  supplier: string;
  categoryId: string;
  amount: number;
  frequency: Frequency;
  previousAmount?: number;
  nextDueOn?: string;
  estimatedNextDueOn?: string;
  dueDateConfidence?: "high" | "medium" | "low";
  dueDateEvidenceCount?: number;
  dueDateWeekendAdjusted?: boolean;
  dueDateReason?: string;
  manualDueDateExpired?: boolean;
}

export interface RecurringIncome {
  id: string;
  label: string;
  amount: number;
  frequency: Frequency;
  nextExpectedOn: string;
}

export interface FixedExpenseCandidate {
  id: string;
  supplier: string;
  categoryId: string;
  categoryName: string;
  frequency: Frequency;
  amount: number;
  previousAmount?: number;
  transactionCount: number;
  monthsSeen: number;
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  reason: string;
  alreadyManaged: boolean;
  duplicateOf?: Array<{ id: string; supplier: string; amount: number }>;
}
