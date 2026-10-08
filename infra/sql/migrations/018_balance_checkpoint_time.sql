alter table accounts
  add column if not exists balance_checked_at timestamptz;

update accounts
set balance_checked_at = coalesce(
  balance_checked_at,
  balance_date::timestamptz + interval '1 day' - interval '1 second',
  last_import_at,
  created_at,
  now()
)
where balance_checked_at is null;

update accounts
set opening_balance = balance - coalesce((
  select sum(t.amount)
  from transactions t
  where t.account_id = accounts.id
    and (
      t.booked_at < accounts.balance_date
      or (
        t.booked_at = accounts.balance_date
        and t.created_at <= accounts.balance_checked_at
      )
    )
), 0),
    opening_balance_date = balance_date
where balance_source = 'manual'
  and balance_date is not null;
