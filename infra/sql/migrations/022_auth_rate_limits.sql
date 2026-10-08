create table if not exists auth_rate_limits (
  scope text not null,
  key_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

create index if not exists auth_rate_limits_expires_at_idx on auth_rate_limits(expires_at);
