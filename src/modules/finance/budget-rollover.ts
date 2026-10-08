export function calculateBudgetCarryover(previous?: { planned: number; actual: number; rollover: boolean }) {
  if (!previous?.rollover || !Number.isFinite(previous.planned) || !Number.isFinite(previous.actual)) return 0;
  return roundMoney(Math.max(previous.planned - previous.actual, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
