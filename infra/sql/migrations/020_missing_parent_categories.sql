insert into categories (id, name, parent, kind)
values
  ('inkomen', 'Inkomen', null, 'inkomen'),
  ('financien', 'Financien', null, 'reservering')
on conflict (id) do update
set name = excluded.name,
    parent = excluded.parent,
    kind = excluded.kind,
    valid_to = null;
