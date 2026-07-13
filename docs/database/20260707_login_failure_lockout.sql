-- 로그인 실패 반복 제한 지원.
-- 배포 전 Supabase SQL editor에서 한 번 실행하면 된다.

alter table public.members
add column if not exists failed_login_count integer not null default 0,
add column if not exists last_failed_login_at timestamp with time zone,
add column if not exists login_locked_until timestamp with time zone;

create index if not exists idx_members_login_locked_until
on public.members(login_locked_until)
where login_locked_until is not null;
