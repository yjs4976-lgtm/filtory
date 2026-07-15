alter table public.members
  add column if not exists date_of_birth date null,
  add column if not exists gender varchar(30) null;

alter table public.members
  drop constraint if exists members_gender_check;

alter table public.members
  add constraint members_gender_check
  check (gender is null or gender in ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'));
