import assert from "node:assert/strict";
import test from "node:test";
import { mergeActionSignalStatuses } from "../src/modules/finance/report-signal-status";
import { getActionSignals, type ActionSignal } from "../src/modules/finance/reporting";

const signals: ActionSignal[] = [
  { id: "uncategorized:geen", type: "uncategorized", title: "Categorie nog kiezen", detail: "1 transactie", amount: 25, count: 1, tone: "warning", href: "/transacties?mode=review", actionLabel: "Controleren" },
  { id: "budget-overspent:food", type: "budget_overspent", title: "Budget overschreden", detail: "Boodschappen", amount: 50, count: 1, tone: "warning", href: "/budgetten", actionLabel: "Budget bekijken" },
];

test("nieuwe rapportagesignalen starten open en bewaren een gekozen status", () => {
  const merged = mergeActionSignalStatuses(signals, [{ signalId: "budget-overspent:food", status: "resolved", updatedAt: "2026-09-23T10:00:00Z" }]);
  assert.equal(merged[0]?.status, "open");
  assert.equal(merged[1]?.status, "resolved");
  assert.equal(merged[1]?.updatedAt, "2026-09-23T10:00:00Z");
});

test("ieder deterministisch signaal heeft een directe vervolgstap", () => {
  const generated = getActionSignals([
    { id: "t", date: "2026-09-10", accountId: "a", counterparty: "Nieuwe winkel", description: "Aankoop", amount: -75, kind: "variabele_uitgave" },
  ], [], [], "2026-09", "month");
  assert.ok(generated.length > 0);
  assert.ok(generated.every((signal) => signal.href.startsWith("/") && signal.actionLabel.length > 0));
  assert.equal(generated.find((signal) => signal.type === "uncategorized")?.href, "/transacties?mode=review&month=2026-09");
});
