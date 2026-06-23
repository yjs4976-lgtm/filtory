-- Filtory login ID support
-- Apply after the existing member migrations.

alter table public.members
add column if not exists login_id varchar(100);

-- Existing members can keep using email login. Preserve their current nickname
-- as an initial login ID without changing the nickname itself.
update public.members
set login_id = lower(btrim(nickname))
where login_id is null
  and nickname is not null
  and btrim(nickname) <> '';

create unique index if not exists idx_members_login_id_normalized_unique
on public.members (lower(btrim(login_id)))
where login_id is not null and btrim(login_id) <> '';
