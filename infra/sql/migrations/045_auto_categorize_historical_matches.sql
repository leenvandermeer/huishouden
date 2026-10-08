-- Fill open categories when all earlier transactions for the same counter
-- account (or counterparty when no account is available) agree.
with open_transactions as (
  select
    t.id,
    nullif(trim(t.counter_account), '') as counter_account,
    regexp_replace(lower(coalesce(t.counterparty, '')), '[^a-z0-9]+', '', 'g') as counterparty_key,
    sign(t.amount) as amount_sign
  from transactions t
  where t.category_id is null
    and t.kind <> 'interne_overboeking'
    and t.internal_transfer_group is null
), matched_history as (
  select
    target.id,
    history.category_id,
    category.kind,
    case
      when target.counter_account is not null and nullif(trim(history.counter_account), '') = target.counter_account then 'tegenrekening'
      else 'tegenpartij'
    end as match_source,
    case
      when target.counter_account is not null and nullif(trim(history.counter_account), '') = target.counter_account then 1
      else 2
    end as source_priority
  from open_transactions target
  join transactions history
    on history.id <> target.id
   and history.category_id is not null
   and history.category_id not in ('overig', 'overig-inkomen')
   and history.kind <> 'interne_overboeking'
   and sign(history.amount) = target.amount_sign
   and (
     (target.counter_account is not null and nullif(trim(history.counter_account), '') = target.counter_account)
     or (
       target.counterparty_key <> ''
       and regexp_replace(lower(coalesce(history.counterparty, '')), '[^a-z0-9]+', '', 'g') = target.counterparty_key
     )
   )
  join categories category on category.id = history.category_id and category.valid_to is null
), best_source as (
  select id, min(source_priority) as source_priority
  from matched_history
  group by id
), evidence as (
  select
    matched.id,
    matched.category_id,
    matched.kind,
    matched.match_source,
    count(*)::int as evidence_count
  from matched_history matched
  join best_source on best_source.id = matched.id and best_source.source_priority = matched.source_priority
  group by matched.id, matched.category_id, matched.kind, matched.match_source
), ranked as (
  select
    evidence.*,
    sum(evidence_count) over (partition by id) as total_evidence,
    row_number() over (partition by id order by evidence_count desc, category_id) as category_rank
  from evidence
), unambiguous as (
  select id, category_id, kind, match_source
  from ranked
  where category_rank = 1
    and evidence_count = total_evidence
)
update transactions target_transaction
set category_id = unambiguous.category_id,
    kind = unambiguous.kind,
    rule_applied = 'Historische match: ' || unambiguous.match_source
from unambiguous
where target_transaction.id = unambiguous.id;
