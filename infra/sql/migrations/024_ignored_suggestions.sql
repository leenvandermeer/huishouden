create table if not exists ignored_suggestions (
  id text primary key,
  suggestion_type text not null,
  suggestion_key text not null,
  label text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (suggestion_type, suggestion_key)
);

create index if not exists idx_ignored_suggestions_type_key
  on ignored_suggestions (suggestion_type, suggestion_key);
