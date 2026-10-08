alter table categorization_rules
  add column if not exists match_scope text not null default 'all'
  check (match_scope in ('counterparty', 'description', 'all'));

update categorization_rules
set match_scope = 'all'
where match_scope is null;
