create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('owner', 'admin', 'readonly')) default 'owner',
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id text primary key,
  name text not null,
  iban text not null unique,
  bank text not null,
  type text not null check (type in ('betaalrekening', 'spaarrekening')),
  balance numeric(14,2) not null default 0,
  own_account boolean not null default true,
  last_import_at timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists categories (
  id text primary key,
  name text not null,
  parent text,
  kind text not null check (kind in ('inkomen', 'vaste_last', 'variabele_uitgave', 'reservering', 'interne_overboeking')),
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now()
);

create table if not exists imports (
  id text primary key,
  source_bank text not null,
  filename text not null,
  file_hash text not null unique,
  transaction_count integer not null default 0,
  account_count integer not null default 0,
  imported_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  account_id text not null references accounts(id),
  import_id text references imports(id),
  booked_at date not null,
  counterparty text,
  description text not null,
  amount numeric(14,2) not null,
  category_id text references categories(id),
  kind text not null check (kind in ('inkomen', 'vaste_last', 'variabele_uitgave', 'reservering', 'interne_overboeking')),
  transaction_hash text not null unique,
  internal_transfer_group text,
  rule_applied text,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id text primary key,
  month text not null,
  category_id text not null references categories(id),
  planned_amount numeric(14,2) not null,
  actual_amount numeric(14,2) not null default 0,
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  unique (month, category_id)
);

create table if not exists pots (
  id text primary key,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  monthly_reservation numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists fixed_expenses (
  id text primary key,
  supplier text not null,
  category_id text not null references categories(id),
  amount numeric(14,2) not null,
  previous_amount numeric(14,2),
  frequency text not null check (frequency in ('maandelijks', 'kwartaal', 'jaarlijks')),
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now()
);

create table if not exists categorization_rules (
  id text primary key,
  pattern text not null,
  category_id text not null references categories(id),
  kind text not null,
  created_from_transaction_id text references transactions(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id text primary key,
  actor_user_id text references users(id),
  event_type text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
