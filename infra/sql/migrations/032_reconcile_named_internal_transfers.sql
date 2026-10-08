-- Rabobank exports for savings pots can omit the counter-account IBAN.
-- Reconcile those pairs by date, amount, opposite direction, own accounts and the named pot in the description.
with prepared as (
  select
    t.id,
    t.account_id,
    t.booked_at,
    t.amount,
    t.created_at,
    a.type as account_type,
    coalesce(
      nullif(trim(substring(t.description from '(?i)(?:naar|van):\s*([^"]+)')), ''),
      nullif(trim(t.counterparty), '')
    ) as transfer_label
  from transactions t
  join accounts a on a.id = t.account_id
   and a.own_account = true
   and a.archived_at is null
   and a.excluded_from_import = false
  where t.internal_transfer_group is null
    and t.category_id is null
    and coalesce(t.counter_account, '') = ''
),
normalized as (
  select *,
         regexp_replace(lower(coalesce(transfer_label, '')), '[^a-z0-9]', '', 'g') as transfer_key
  from prepared
),
paired as (
  select
    positive.id as positive_id,
    negative.id as negative_id,
    'int_named_' || substr(md5(least(positive.id, negative.id) || '|' || greatest(positive.id, negative.id)), 1, 24) as transfer_group
  from (
    select *,
           row_number() over (
             partition by booked_at, abs(amount), account_id, transfer_key
             order by created_at, id
           ) as pair_index
    from normalized
    where amount > 0
      and transfer_key <> ''
  ) positive
  join (
    select *,
           row_number() over (
             partition by booked_at, abs(amount), account_id, transfer_key
             order by created_at, id
           ) as pair_index
    from normalized
    where amount < 0
      and transfer_key <> ''
  ) negative
    on positive.booked_at = negative.booked_at
   and abs(positive.amount) = abs(negative.amount)
   and positive.account_id <> negative.account_id
   and positive.transfer_key = negative.transfer_key
   and positive.pair_index = negative.pair_index
),
candidate_transactions as (
  select t.id,
         p.transfer_group,
         t.amount,
         account.type as account_type,
         other_account.type as other_account_type
  from paired p
  join transactions t on t.id in (p.positive_id, p.negative_id)
  join accounts account on account.id = t.account_id
  join transactions other_transaction on other_transaction.id in (p.positive_id, p.negative_id)
   and other_transaction.id <> t.id
  join accounts other_account on other_account.id = other_transaction.account_id
)
update transactions t
set category_id = case
      when candidate_transactions.account_type = 'betaalrekening'
       and candidate_transactions.other_account_type = 'spaarrekening'
       and candidate_transactions.amount < 0 then 'sparen'
      when candidate_transactions.account_type = 'betaalrekening'
       and candidate_transactions.other_account_type = 'spaarrekening'
       and candidate_transactions.amount > 0 then 'potje-opname'
      else 'intern'
    end,
    kind = case
      when candidate_transactions.account_type = 'betaalrekening'
       and candidate_transactions.other_account_type = 'spaarrekening'
       and candidate_transactions.amount < 0 then 'reservering'
      when candidate_transactions.account_type = 'betaalrekening'
       and candidate_transactions.other_account_type = 'spaarrekening'
       and candidate_transactions.amount > 0 then 'interne_overboeking'
      else 'interne_overboeking'
    end,
    internal_transfer_group = candidate_transactions.transfer_group,
    rule_applied = case
      when candidate_transactions.account_type = 'betaalrekening'
       and candidate_transactions.other_account_type = 'spaarrekening'
       and candidate_transactions.amount < 0 then 'Sparen naar eigen spaarrekening'
      when candidate_transactions.account_type = 'betaalrekening'
       and candidate_transactions.other_account_type = 'spaarrekening'
       and candidate_transactions.amount > 0 then 'Uit spaarrekening'
      when candidate_transactions.account_type = 'spaarrekening'
       and candidate_transactions.other_account_type = 'betaalrekening' then 'Spaarrekeningzijde van sparen'
      else 'Kruispost tussen eigen rekeningen'
    end
from candidate_transactions
where t.id = candidate_transactions.id;

with known_names(name_key) as (
  values
    ('vrijspaargeld'),
    ('weekgeld'),
    ('weekgeldpermaand'),
    ('vrijtebestedenpermaand'),
    ('sparen'),
    ('huis'),
    ('vakantie'),
    ('benzine'),
    ('kleding'),
    ('rijbewijslotte'),
    ('nickyspaarpot'),
    ('nickysporten'),
    ('lottekinderbijslag'),
    ('huiswntuin'),
    ('vrijtebesteden'),
    ('hypotheek'),
    ('kinderbijslag')
),
candidates as (
  select
    t.id,
    t.amount,
    a.type as account_type,
    regexp_replace(lower(coalesce(
      nullif(trim(substring(t.description from '(?i)(?:naar|van):\s*([^"]+)')), ''),
      nullif(trim(t.counterparty), '')
    )), '[^a-z0-9]', '', 'g') as transfer_key
  from transactions t
  join accounts a on a.id = t.account_id
   and a.own_account = true
   and a.archived_at is null
   and a.excluded_from_import = false
  where t.internal_transfer_group is null
    and t.category_id is null
    and coalesce(t.counter_account, '') = ''
)
update transactions t
set category_id = case
      when candidates.account_type = 'betaalrekening' and candidates.amount < 0 then 'sparen'
      when candidates.account_type = 'betaalrekening' and candidates.amount > 0 then 'potje-opname'
      else 'intern'
    end,
    kind = case
      when candidates.account_type = 'betaalrekening' and candidates.amount < 0 then 'reservering'
      else 'interne_overboeking'
    end,
    rule_applied = case
      when candidates.account_type = 'betaalrekening' and candidates.amount < 0 then 'Interne potreservering'
      when candidates.account_type = 'betaalrekening' and candidates.amount > 0 then 'Interne potopname'
      else 'Interne potrekeningzijde'
    end
from candidates
join known_names on known_names.name_key = candidates.transfer_key
where t.id = candidates.id;
