create index if not exists transactions_booked_created_idx
  on transactions (booked_at desc, created_at desc);

create index if not exists transactions_account_booked_idx
  on transactions (account_id, booked_at desc, created_at desc);

create index if not exists transactions_category_booked_idx
  on transactions (category_id, booked_at desc, created_at desc);

create index if not exists transactions_kind_category_booked_idx
  on transactions (kind, category_id, booked_at desc);

create index if not exists transactions_internal_transfer_group_idx
  on transactions (internal_transfer_group)
  where internal_transfer_group is not null;

create index if not exists transactions_review_queue_idx
  on transactions (booked_at desc, created_at desc)
  where kind <> 'interne_overboeking'
    and (
      category_id is null
      or category_id in ('overig', 'overig-inkomen')
      or rule_applied is null
    );

create index if not exists transactions_negative_booked_idx
  on transactions (booked_at desc, category_id, kind)
  where amount < 0;

create index if not exists imports_imported_at_idx
  on imports (imported_at desc);

create index if not exists sessions_expires_at_idx
  on sessions (expires_at);

create index if not exists users_lower_email_active_idx
  on users (lower(email))
  where disabled_at is null;
