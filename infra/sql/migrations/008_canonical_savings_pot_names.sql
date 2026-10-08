update pots
set name = case
  when lower(name) = 'vrij spaargeld' then 'Vrij Spaargeld'
  when lower(name) in ('benzine', 'bezine') then 'Benzine'
  when lower(name) = 'weekgeld per maand' then 'Weekgeld per Maand'
  when lower(name) = 'nicky spaarpot' then 'Nicky Spaarpot'
  when lower(name) = 'nicky sporten' then 'Nicky sporten'
  when lower(name) = 'lotte kinderbijslag' then 'Lotte kinderbijslag'
  else name
end
where account_id in (
  select id
  from accounts
  where upper(regexp_replace(iban, '\s', '', 'g')) = 'NL93RABO1012731537'
)
and lower(name) in (
  'vrij spaargeld',
  'benzine',
  'bezine',
  'weekgeld per maand',
  'nicky spaarpot',
  'nicky sporten',
  'lotte kinderbijslag'
);
