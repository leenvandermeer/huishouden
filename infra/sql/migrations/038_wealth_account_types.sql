alter table accounts drop constraint if exists accounts_type_check;

alter table accounts
  add constraint accounts_type_check
  check (type in ('betaalrekening', 'spaarrekening', 'beleggingsrekening', 'schuld'));
