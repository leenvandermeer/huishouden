create table if not exists product_events (
  id text primary key,
  user_id text references users(id) on delete set null,
  event_type text not null check (event_type in ('client.error', 'source.missing_income', 'source.estimated')),
  path text not null,
  release_version text not null,
  event_day date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index if not exists product_events_daily_signal_idx
  on product_events(user_id, event_type, path, event_day);

create index if not exists product_events_created_at_idx
  on product_events(created_at desc);
