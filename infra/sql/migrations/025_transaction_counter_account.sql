alter table transactions
  add column if not exists counter_account text;

update transactions
set counter_account = upper(regexp_replace((regexp_match(description, '(NL[0-9]{2}[A-Z]{4}[0-9]{10})'))[1], '(.{4})', '\1 ', 'g'))
where counter_account is null
  and description ~ '(NL[0-9]{2}[A-Z]{4}[0-9]{10})';

alter table categorization_rules
  drop constraint if exists categorization_rules_match_scope_check;

alter table categorization_rules
  add constraint categorization_rules_match_scope_check
  check (match_scope in (
    'counterparty',
    'description',
    'counter_account',
    'counterparty_description',
    'counterparty_counter_account',
    'description_counter_account',
    'all'
  ));
