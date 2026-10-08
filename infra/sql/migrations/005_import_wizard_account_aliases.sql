create table if not exists pending_imports (
  id text primary key,
  actor_user_id text references users(id),
  files jsonb not null,
  options jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending', 'imported', 'expired')) default 'pending',
  created_at timestamptz not null default now(),
  imported_at timestamptz
);

create table if not exists account_aliases (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  alias text not null unique,
  label text,
  created_at timestamptz not null default now()
);

insert into account_aliases (id, account_id, alias, label)
select
  'alias_' || substr(md5(regexp_replace(iban, '\s', '', 'g')), 1, 24),
  id,
  upper(regexp_replace(iban, '\s', '', 'g')),
  'IBAN'
from accounts
on conflict (alias) do nothing;

create index if not exists pending_imports_created_at_idx on pending_imports(created_at);
create index if not exists account_aliases_account_id_idx on account_aliases(account_id);
