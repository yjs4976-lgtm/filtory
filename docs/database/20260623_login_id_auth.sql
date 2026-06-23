-- Filtory login ID support
-- Apply after the existing member migrations.

alter table public.members
add column if not exists login_id varchar(20);

-- Clean values created by an earlier migration attempt when they do not match
-- the login ID contract. Those members can continue to use email login.
update public.members
set login_id = null
where login_id is not null
  and lower(btrim(login_id)) !~ '^[a-z0-9_.-]{4,20}$';

-- Normalize existing valid IDs, retaining the earliest member when a
-- normalized duplicate exists. Other duplicate rows remain email-login only.
with ranked_login_ids as (
  select
    id,
    lower(btrim(login_id)) as normalized_login_id,
    row_number() over (
      partition by lower(btrim(login_id))
      order by created_at asc nulls last, id asc
    ) as row_num
  from public.members
  where login_id is not null
    and lower(btrim(login_id)) ~ '^[a-z0-9_.-]{4,20}$'
)
update public.members as m
set login_id = case
  when ranked_login_ids.row_num = 1 then ranked_login_ids.normalized_login_id
  else null
end
from ranked_login_ids
where m.id = ranked_login_ids.id;

-- Backfill only valid, unclaimed nickname values. Korean or otherwise invalid
-- nicknames deliberately stay null so their owners keep email login.
with valid_candidates as (
  select
    member.id,
    lower(btrim(member.nickname)) as normalized_login_id,
    row_number() over (
      partition by lower(btrim(member.nickname))
      order by member.created_at asc nulls last, member.id asc
    ) as row_num
  from public.members as member
  where member.login_id is null
    and member.nickname is not null
    and lower(btrim(member.nickname)) ~ '^[a-z0-9_.-]{4,20}$'
    and not exists (
      select 1
      from public.members as existing_member
      where lower(btrim(existing_member.login_id)) = lower(btrim(member.nickname))
    )
)
update public.members as m
set login_id = valid_candidates.normalized_login_id
from valid_candidates
where m.id = valid_candidates.id
  and valid_candidates.row_num = 1;

alter table public.members
alter column login_id type varchar(20)
using login_id::varchar(20);

create unique index if not exists idx_members_login_id_normalized_unique
on public.members (lower(btrim(login_id)))
where login_id is not null and btrim(login_id) <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'members_login_id_format_check'
  ) then
    alter table public.members
    add constraint members_login_id_format_check
    check (login_id is null or login_id ~ '^[a-z0-9_.-]{4,20}$');
  end if;
end;
$$;
