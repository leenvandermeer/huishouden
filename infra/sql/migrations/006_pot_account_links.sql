alter table pots
  add column if not exists account_id text references accounts(id) on delete set null;

create index if not exists pots_account_id_idx on pots(account_id);

update pots
set account_id = (
  select id
  from accounts
  where type = 'spaarrekening'
    and archived_at is null
  order by case when upper(regexp_replace(iban, '\s', '', 'g')) = 'NL93RABO1012731537' then 0 else 1 end, name
  limit 1
)
where account_id is null
  and exists (
    select 1
    from accounts
    where type = 'spaarrekening'
      and archived_at is null
  );
