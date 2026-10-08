delete from pots
where account_id in (
  select id
  from accounts
  where upper(regexp_replace(iban, '\s', '', 'g')) = 'NL93RABO1012731537'
)
and lower(name) not in (
  'vrij spaargeld',
  'benzine',
  'weekgeld per maand',
  'nicky spaarpot',
  'nicky sporten',
  'lotte kinderbijslag'
);
