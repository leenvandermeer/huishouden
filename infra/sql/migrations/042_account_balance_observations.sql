create table if not exists account_balance_observations (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  observed_on date not null,
  observed_at timestamptz not null default now(),
  balance numeric(14,2) not null,
  source text not null check (source in ('import', 'manual')),
  import_id text references imports(id) on delete set null,
  unique (account_id, observed_on, source)
);

create index if not exists account_balance_observations_account_date_idx
  on account_balance_observations (account_id, observed_on, observed_at);

insert into account_balance_observations (id, account_id, observed_on, observed_at, balance, source)
select
  'balance_' || md5(id || '|' || coalesce(balance_date, current_date)::text || '|' || balance_source),
  id,
  coalesce(balance_date, current_date),
  coalesce(balance_checked_at, last_import_at, now()),
  balance,
  balance_source
from accounts
where archived_at is null
on conflict (account_id, observed_on, source) do nothing;
