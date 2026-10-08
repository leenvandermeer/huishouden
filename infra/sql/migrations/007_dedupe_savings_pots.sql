update pots
set name = 'Benzine'
where lower(name) = 'bezine'
  and account_id in (
    select id
    from accounts
    where upper(regexp_replace(iban, '\s', '', 'g')) = 'NL93RABO1012731537'
  );

with ranked as (
  select
    id,
    first_value(id) over (
      partition by account_id, lower(name)
      order by current_amount desc, monthly_reservation desc, created_at asc, id asc
    ) as keep_id
  from pots
  where account_id is not null
),
aggregated as (
  select
    keep_id as id,
    max(target_amount) as target_amount,
    max(current_amount) as current_amount,
    max(monthly_reservation) as monthly_reservation,
    min(target_date) filter (where target_date is not null) as target_date
  from ranked
  join pots on pots.id = ranked.id
  group by keep_id
)
update pots
set target_amount = greatest(pots.target_amount, aggregated.target_amount),
    current_amount = greatest(pots.current_amount, aggregated.current_amount),
    monthly_reservation = greatest(pots.monthly_reservation, aggregated.monthly_reservation),
    target_date = coalesce(pots.target_date, aggregated.target_date)
from aggregated
where pots.id = aggregated.id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by account_id, lower(name)
      order by current_amount desc, monthly_reservation desc, created_at asc, id asc
    ) as keep_id
  from pots
  where account_id is not null
)
delete from pots
using ranked
where pots.id = ranked.id
  and ranked.id <> ranked.keep_id;
