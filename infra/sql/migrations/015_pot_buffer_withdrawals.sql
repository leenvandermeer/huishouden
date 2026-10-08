insert into categories (id, name, parent, kind)
values ('potje-opname', 'Opname uit potje/buffer', 'Financien', 'interne_overboeking')
on conflict (id) do update
set name = excluded.name,
    parent = excluded.parent,
    kind = excluded.kind,
    valid_to = null;

update transactions
set category_id = 'potje-opname',
    kind = 'interne_overboeking',
    rule_applied = 'Opname uit potje/buffer'
where category_id = 'ontsparen'
  and internal_transfer_group is not null;
