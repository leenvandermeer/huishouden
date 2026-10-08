create table if not exists import_mapping_presets (
  id text primary key,
  name text not null,
  source_bank text not null,
  mapping jsonb not null,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists import_mapping_presets_source_bank_name_idx
  on import_mapping_presets(lower(source_bank), lower(name));
