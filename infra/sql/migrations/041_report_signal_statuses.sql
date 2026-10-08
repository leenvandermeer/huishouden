create table if not exists report_signal_statuses (
  period_type text not null check (period_type in ('month', 'quarter', 'year')),
  period text not null,
  signal_id text not null,
  status text not null check (status in ('open', 'resolved', 'dismissed')),
  updated_by text references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (period_type, period, signal_id)
);

create index if not exists report_signal_statuses_status_idx
  on report_signal_statuses(period_type, period, status, updated_at desc);
