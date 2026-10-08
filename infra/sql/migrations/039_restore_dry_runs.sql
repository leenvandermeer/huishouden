create table if not exists restore_dry_runs (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  backup_checksum text not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists restore_dry_runs_lookup_idx
  on restore_dry_runs(user_id, backup_checksum, expires_at)
  where used_at is null;
