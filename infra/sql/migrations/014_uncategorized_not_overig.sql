update transactions
set category_id = null,
    rule_applied = null
where kind <> 'interne_overboeking'
  and category_id in ('overig', 'overig-inkomen')
  and rule_applied is null;
