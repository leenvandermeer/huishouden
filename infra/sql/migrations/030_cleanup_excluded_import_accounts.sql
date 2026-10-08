-- Clean up imported data for accounts that were marked as excluded after an import.
create temporary table if not exists migration_030_affected_accounts (
  id text primary key
) on commit drop;

truncate migration_030_affected_accounts;

insert into migration_030_affected_accounts (id)
select id
from accounts
where excluded_from_import = true
on conflict do nothing;

insert into migration_030_affected_accounts (id)
select distinct kept.account_id
from transactions removed
join accounts removed_account
  on removed_account.id = removed.account_id
join transactions kept
  on kept.internal_transfer_group = removed.internal_transfer_group
 and kept.account_id <> removed.account_id
where removed_account.excluded_from_import = true
  and removed.import_id is not null
  and removed.internal_transfer_group is not null
on conflict do nothing;

update categorization_rules
set created_from_transaction_id = null
where created_from_transaction_id in (
  select t.id
  from transactions t
  join accounts a on a.id = t.account_id
  where a.excluded_from_import = true
    and t.import_id is not null
);

delete from transactions t
using accounts a
where a.id = t.account_id
  and a.excluded_from_import = true
  and t.import_id is not null;

with orphaned as (
  select internal_transfer_group
  from transactions
  where internal_transfer_group is not null
  group by internal_transfer_group
  having count(*) <> 2
     or abs(coalesce(sum(amount), 0)) >= 0.005
)
update transactions t
set category_id = null,
    kind = case when t.amount > 0 then 'inkomen' else 'variabele_uitgave' end,
    internal_transfer_group = null,
    rule_applied = null
from orphaned
where t.internal_transfer_group = orphaned.internal_transfer_group;

update accounts
set balance = coalesce(opening_balance, 0) + coalesce((
      select sum(t.amount)
      from transactions t
      where t.account_id = accounts.id
    ), 0),
    balance_date = coalesce((
      select max(t.booked_at)
      from transactions t
      where t.account_id = accounts.id
    ), balance_date),
    balance_checked_at = now(),
    last_import_at = (
      select max(i.imported_at)
      from transactions t
      join imports i on i.id = t.import_id
      where t.account_id = accounts.id
    )
where balance_source = 'import'
  and id in (select id from migration_030_affected_accounts);

update accounts
set balance = coalesce(manual_balance, balance) + coalesce((
  select sum(t.amount)
  from transactions t
  where t.account_id = accounts.id
    and (
      t.booked_at > accounts.balance_date
      or (
        t.booked_at = accounts.balance_date
        and t.created_at > accounts.balance_checked_at
      )
    )
), 0)
where balance_source = 'manual'
  and balance_date is not null
  and id in (select id from migration_030_affected_accounts);
