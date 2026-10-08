-- Extra known Rabobank pot names. Migration 032 already handled the broad cleanup;
-- this keeps production aligned after expanding the name list.
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
