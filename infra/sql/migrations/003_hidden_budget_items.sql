create table if not exists hidden_budget_items (
  month text not null,
  category_id text not null references categories(id),
  created_at timestamptz not null default now(),
  primary key (month, category_id)
);
