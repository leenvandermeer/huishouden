-- Rabobank 6537 is an external child account. Outgoing payments to it are allowance expenses.
insert into categories (id, name, parent, kind)
values
  ('gezin', 'Gezin', null, 'variabele_uitgave'),
  ('zakgeld', 'Zakgeld', 'Gezin', 'variabele_uitgave')
on conflict (id) do update
set name = excluded.name,
    parent = excluded.parent,
    kind = excluded.kind,
    valid_to = null;

insert into categorization_rules (id, pattern, match_scope, category_id, kind, active)
values (
  'market_nl45_rabo_0328_3865_37_zakgeld',
  'NL45 RABO 0328 3865 37',
  'counter_account',
  'zakgeld',
  'variabele_uitgave',
  true
)
on conflict (id) do update
set pattern = excluded.pattern,
    match_scope = excluded.match_scope,
    category_id = excluded.category_id,
    kind = excluded.kind,
    active = true;

update transactions
set category_id = 'zakgeld',
    kind = 'variabele_uitgave',
    internal_transfer_group = null,
    rule_applied = 'Regel: NL45 RABO 0328 3865 37'
where amount < 0
  and regexp_replace(coalesce(counter_account, ''), '[^0-9A-Za-z]', '', 'g') = 'NL45RABO0328386537';
