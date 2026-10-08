export const moneyFlowLabels = {
  income: "Binnengekomen",
  savingsOut: "Uit spaarrekening",
  expenses: "Uitgegeven",
  savingsIn: "Naar spaarrekening",
  investmentsIn: "Naar beleggingen",
  result: "Over/tekort",
  surplus: "Over",
  shortage: "Tekort",
  paid: "Over",
  notPaid: "Tekort",
  savingsAccount: "Spaarrekening",
  savingsAccounts: "Spaarrekeningen",
} as const;

export function resultLabel(value: number) {
  return value >= 0 ? moneyFlowLabels.surplus : moneyFlowLabels.shortage;
}

export function resultStatus(value: number) {
  return value >= 0 ? moneyFlowLabels.paid : moneyFlowLabels.notPaid;
}
