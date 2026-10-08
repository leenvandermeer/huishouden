alter table pots
  alter column target_amount drop not null,
  alter column current_amount drop not null,
  alter column current_amount drop default,
  alter column monthly_reservation drop not null,
  alter column monthly_reservation drop default;

with movement_pots as (
  select distinct
    savings_account.id as account_id,
    case
      when extracted.pot_key = 'bezine' then 'benzine'
      else extracted.pot_key
    end as pot_key
  from transactions t
  join accounts payment_account
    on payment_account.id = t.account_id
   and payment_account.type = 'betaalrekening'
  join transactions savings_transaction
    on savings_transaction.internal_transfer_group = t.internal_transfer_group
   and savings_transaction.id <> t.id
  join accounts savings_account
    on savings_account.id = savings_transaction.account_id
   and savings_account.type = 'spaarrekening'
   and savings_account.archived_at is null
  cross join lateral (
    select lower(nullif(trim(regexp_replace(substring(t.description from '(?i)(?:naar|van):\s*([^"]+)'), '\s*"+\s*$', '')), '')) as pot_key
  ) extracted
  where t.category_id in ('sparen', 'ontsparen')
    and t.internal_transfer_group is not null
    and extracted.pot_key is not null
)
update pots
set target_amount = null,
    current_amount = null,
    monthly_reservation = null
from movement_pots
where pots.account_id = movement_pots.account_id
  and lower(pots.name) = movement_pots.pot_key
  and (
    pots.target_amount = pots.current_amount
    or coalesce(pots.monthly_reservation, 0) <> 0
    or (coalesce(pots.target_amount, 0) = 0 and coalesce(pots.current_amount, 0) = 0)
  );
