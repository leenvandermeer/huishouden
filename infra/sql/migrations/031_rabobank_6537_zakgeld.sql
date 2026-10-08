-- General allowance categories; installation-specific account rules are not seeded.
insert into categories (id, name, parent, kind)
values
  ('gezin', 'Gezin', null, 'variabele_uitgave'),
  ('zakgeld', 'Zakgeld', 'Gezin', 'variabele_uitgave')
on conflict (id) do update
set name = excluded.name,
    parent = excluded.parent,
    kind = excluded.kind,
    valid_to = null;
