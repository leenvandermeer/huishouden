alter table accounts
  add column if not exists opening_balance numeric(14,2) not null default 0,
  add column if not exists opening_balance_date date,
  add column if not exists balance_date date,
  add column if not exists balance_source text not null default 'import' check (balance_source in ('import', 'manual'));

update accounts
set balance_date = coalesce(balance_date, last_import_at::date, current_date)
where balance_date is null;
