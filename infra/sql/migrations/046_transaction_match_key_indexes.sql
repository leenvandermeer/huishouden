-- Category suggestions and fixed expense evidence look up earlier transactions
-- by normalized counter account or counterparty. Without these expression
-- indexes every lookup scans the whole transactions table.
create index if not exists transactions_counter_account_key_idx
  on transactions ((nullif(trim(counter_account), '')))
  where nullif(trim(counter_account), '') is not null;

create index if not exists transactions_counterparty_key_idx
  on transactions ((regexp_replace(lower(coalesce(counterparty, '')), '[^a-z0-9]+', '', 'g')));

create index if not exists transactions_supplier_key_idx
  on transactions ((regexp_replace(regexp_replace(lower(coalesce(counterparty, '')), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')), booked_at desc)
  where amount < 0;

analyze transactions;
