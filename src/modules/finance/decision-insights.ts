export interface DecisionMonth {
  month: string;
  income: number;
  spendableExpenses: number;
  spendableNet: number;
}

export interface DecisionInsight {
  id: "runway" | "spending" | "structure" | "period";
  question: string;
  conclusion: string;
  href: string;
  action: string;
  tone: "positive" | "attention" | "neutral";
}

export function buildDecisionInsights(input: {
  rows: DecisionMonth[];
  selectedMonth?: string;
  safeToSpend: number;
  lowestBalance: number;
  fixedMonthlyTotal: number;
}): DecisionInsight[] {
  const index = Math.max(0, input.rows.findIndex((row) => row.month === input.selectedMonth));
  const selected = input.rows[index] ?? input.rows.at(-1);
  const previous = input.rows.slice(Math.max(0, index - 3), index);
  const averageExpenses = average(previous.map((row) => row.spendableExpenses));
  const spendingDifference = selected ? money(selected.spendableExpenses - averageExpenses) : 0;
  const incidental = selected ? Math.max(0, money(selected.spendableExpenses - input.fixedMonthlyTotal)) : 0;
  const quarter = input.rows.slice(Math.max(0, index - 2), index + 1);
  const quarterNet = money(quarter.reduce((sum, row) => sum + row.spendableNet, 0));
  return [
    {
      id: "runway",
      question: "Blijft je geld de komende tijd boven nul?",
      conclusion: input.lowestBalance < 0
        ? `Nee. Het laagste verwachte saldo is ${formatEuro(input.lowestBalance)}; veilig te besteden is nu ${formatEuro(input.safeToSpend)}.`
        : `Ja. Je laagste verwachte saldo is ${formatEuro(input.lowestBalance)} en je kunt nu ${formatEuro(input.safeToSpend)} veilig besteden.`,
      href: "/planning?days=90",
      action: "Bekijk geldmomenten",
      tone: input.lowestBalance < 0 ? "attention" : "positive",
    },
    {
      id: "spending",
      question: "Geef je meer uit dan gewoonlijk?",
      conclusion: !selected || !previous.length
        ? "Er zijn nog te weinig eerdere maanden voor een betrouwbare vergelijking."
        : spendingDifference > 0
          ? `Ja. ${formatMonth(selected.month)} ligt ${formatEuro(spendingDifference)} boven het gemiddelde van de vorige ${previous.length} maanden.`
          : `Nee. ${formatMonth(selected.month)} ligt ${formatEuro(Math.abs(spendingDifference))} onder het recente gemiddelde.`,
      href: `/transacties?month=${selected?.month ?? "alle"}&kind=uitgaven`,
      action: "Bekijk uitgaven",
      tone: spendingDifference > 0 ? "attention" : previous.length ? "positive" : "neutral",
    },
    {
      id: "structure",
      question: "Welk deel van je uitgaven ligt al vast?",
      conclusion: selected
        ? `${formatEuro(Math.min(input.fixedMonthlyTotal, selected.spendableExpenses))} is als vaste maandlast beheerd; ongeveer ${formatEuro(incidental)} bestaat uit overige uitgaven.`
        : "Er is nog geen maand met uitgaven beschikbaar.",
      href: "/vaste-lasten",
      action: "Controleer vaste lasten",
      tone: "neutral",
    },
    {
      id: "period",
      question: "Wat bleef er dit kwartaal over?",
      conclusion: quarter.length
        ? `Over ${quarter.length} beschikbare maand${quarter.length === 1 ? "" : "en"} is de gezamenlijke ruimte ${formatEuro(quarterNet)}.`
        : "Er zijn nog geen maanden om samen te vergelijken.",
      href: "/rapportages?periodType=quarter",
      action: "Open kwartaalrapport",
      tone: quarterNet < 0 ? "attention" : "positive",
    },
  ];
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
}
