update categories
set name = 'Naar spaarrekening'
where id = 'sparen';

update categories
set name = 'Uit spaarrekening'
where id in ('potje-opname', 'ontsparen');

update transactions
set rule_applied = 'Uit spaarrekening'
where rule_applied = 'Opname uit potje/buffer';

update transactions
set rule_applied = 'Spaarrekeningzijde van sparen'
where rule_applied = 'Spaarrekeningzijde van potje/buffer';
