alter table accounts
  add column if not exists manual_balance numeric(14,2);

update accounts
set manual_balance = balance
where balance_source = 'manual'
  and manual_balance is null;
