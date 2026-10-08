alter table fixed_expenses
  add column if not exists next_due_on date;

create table if not exists recurring_incomes (
  id text primary key,
  label text not null,
  amount numeric(14,2) not null check (amount > 0),
  frequency text not null check (frequency in ('maandelijks', 'kwartaal', 'jaarlijks')),
  next_expected_on date not null,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_incomes_active_date
  on recurring_incomes (next_expected_on)
  where valid_to is null;

create index if not exists idx_fixed_expenses_active_due_date
  on fixed_expenses (next_due_on)
  where valid_to is null;
