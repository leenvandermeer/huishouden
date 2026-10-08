create table if not exists annual_budgets (
  id text primary key,
  year integer not null check (year between 2000 and 2200),
  category_id text not null references categories(id),
  planned_amount numeric(14,2) not null check (planned_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, category_id)
);

create index if not exists annual_budgets_year_idx on annual_budgets (year, category_id);
