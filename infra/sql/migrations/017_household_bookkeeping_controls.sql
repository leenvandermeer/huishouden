update categories
set name = 'Potjes/buffer inleg',
    parent = 'Financien',
    kind = 'reservering',
    valid_to = null
where id = 'sparen';

create table if not exists month_closures (
  month text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  closed_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);
