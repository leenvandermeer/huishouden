import { Button, Input, Select } from "@/components/ui";
import { CategoryCombobox } from "@/components/finance/category-combobox";
import { changeTransactionCategory } from "@/modules/finance/actions";
import type { CategorizationRuleScope, Category } from "@/modules/finance/types";

interface CategoryCorrectionFormProps {
  transactionId: string;
  categories: Category[];
  defaultCategoryId?: string;
  defaultRulePattern: string;
  defaultRuleScope?: CategorizationRuleScope;
  compact?: boolean;
  dense?: boolean;
  suggestionScore?: number;
  suggestionReason?: string;
}

export function CategoryCorrectionForm({
  transactionId,
  categories,
  defaultCategoryId,
  defaultRulePattern,
  defaultRuleScope = "counterparty",
  compact = false,
  dense = false,
  suggestionScore,
  suggestionReason,
}: CategoryCorrectionFormProps) {
  return (
    <form
      action={changeTransactionCategory}
      className={compact
        ? "grid gap-2"
        : dense
          ? "grid min-w-0 grid-cols-[minmax(6.5rem,1fr)_2rem_minmax(5rem,0.55fr)_minmax(5.75rem,0.75fr)_3.5rem] items-start gap-1"
          : "grid min-w-0 gap-1 xl:grid-cols-[minmax(8rem,1fr)_2.7rem_minmax(5.75rem,0.55fr)_minmax(7rem,0.75fr)_4.1rem] xl:items-start 2xl:gap-2 2xl:grid-cols-[minmax(10rem,1fr)_3rem_minmax(7rem,0.6fr)_minmax(9rem,0.8fr)_4.5rem]"}
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      {suggestionScore != null ? <p className="col-span-full rounded-md bg-[var(--color-brand-subtle)] px-2 py-1 text-[0.68rem] text-brand"><strong>Voorstel {suggestionScore}%</strong> · {suggestionReason}</p> : null}
      <CategoryCombobox id={transactionId} categories={categories} defaultCategoryId={defaultCategoryId} />
      <label className="flex min-h-8 min-w-0 shrink-0 items-center justify-center gap-1 text-[0.72rem] text-[var(--color-text-muted)]" title="Regel bewaren">
        <input name="saveRule" type="checkbox" className="h-3.5 w-3.5" />
        <span className="sr-only">Regel bewaren</span>
      </label>
      <Select name="ruleScope" defaultValue={defaultRuleScope} aria-label="Regel zoekt in" className="min-w-0">
        <option value="all">Alles</option>
        <option value="counterparty">Tegenpartij</option>
        <option value="description">Omschrijving</option>
        <option value="counter_account">Tegenrekening</option>
        <option value="counterparty_description">Tegenpartij + omschrijving</option>
        <option value="counterparty_counter_account">Tegenpartij + tegenrekening</option>
        <option value="description_counter_account">Omschrijving + tegenrekening</option>
      </Select>
      <Input name="rulePattern" defaultValue={defaultRulePattern} aria-label="Herkenningstekst voor regel" className="min-w-0" />
      <Button type="submit" size="sm" className={compact ? "w-full" : "w-full px-2"}>Opslaan</Button>
    </form>
  );
}
