import type { Category } from "./types";

export const defaultCategories: Category[] = [
  { id: "inkomen", name: "Inkomen", kind: "inkomen" },
  { id: "salaris", name: "Salaris", parent: "Inkomen", kind: "inkomen" },
  { id: "boodschappen", name: "Boodschappen", kind: "variabele_uitgave" },
  { id: "wonen", name: "Wonen", kind: "vaste_last" },
  { id: "energie", name: "Energie", parent: "Wonen", kind: "vaste_last" },
  { id: "vervoer", name: "Vervoer", kind: "variabele_uitgave" },
  { id: "verzekeringen", name: "Verzekeringen", kind: "vaste_last" },
  { id: "gezin", name: "Gezin", kind: "variabele_uitgave" },
  { id: "zakgeld", name: "Zakgeld", parent: "Gezin", kind: "variabele_uitgave" },
  { id: "financien", name: "Financien", kind: "reservering" },
  { id: "bankkosten", name: "Bankkosten", parent: "Financien", kind: "vaste_last" },
  { id: "vakantie", name: "Vakantie", kind: "reservering" },
  { id: "sparen", name: "Naar spaarrekening", parent: "Financien", kind: "reservering" },
  { id: "potje-opname", name: "Uit spaarrekening", parent: "Financien", kind: "interne_overboeking" },
  { id: "ontsparen", name: "Uit spaarrekening", parent: "Financien", kind: "inkomen" },
  { id: "intern", name: "Interne overboeking", kind: "interne_overboeking" },
  { id: "overig", name: "Overig", kind: "variabele_uitgave" },
  { id: "overig-inkomen", name: "Overig inkomen", parent: "Inkomen", kind: "inkomen" },
];
