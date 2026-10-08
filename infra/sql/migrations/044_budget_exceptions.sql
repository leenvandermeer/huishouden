alter table budgets
  add column if not exists note text,
  add column if not exists exception_accepted boolean not null default false;

alter table budgets
  drop constraint if exists budgets_note_length_check;

alter table budgets
  add constraint budgets_note_length_check check (note is null or char_length(note) <= 500);
