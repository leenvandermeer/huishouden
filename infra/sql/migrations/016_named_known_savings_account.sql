update accounts
set name = 'Rabo DoelSparen'
where upper(regexp_replace(iban, '\s', '', 'g')) = 'NL93RABO1012731537'
  and name in ('Rabobank 1537', 'Rabobank 7315', 'Spaarrekening 1537');
