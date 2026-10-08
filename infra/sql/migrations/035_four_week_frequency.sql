alter table fixed_expenses
  drop constraint if exists fixed_expenses_frequency_check;

alter table fixed_expenses
  add constraint fixed_expenses_frequency_check
  check (frequency in ('maandelijks', 'vierwekelijks', 'kwartaal', 'jaarlijks'));

alter table recurring_incomes
  drop constraint if exists recurring_incomes_frequency_check;

alter table recurring_incomes
  add constraint recurring_incomes_frequency_check
  check (frequency in ('maandelijks', 'vierwekelijks', 'kwartaal', 'jaarlijks'));
