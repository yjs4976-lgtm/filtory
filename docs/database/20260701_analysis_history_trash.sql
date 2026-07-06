-- Analysis history trash support.
-- Run this once in the Supabase SQL editor before deploying the app code.

alter table public.analysis_requests
add column if not exists deleted_at timestamp with time zone,
add column if not exists deleted_by bigint references public.members(id) on delete set null;

create index if not exists idx_analysis_requests_deleted_at
on public.analysis_requests(deleted_at);

create index if not exists idx_analysis_requests_member_deleted_at
on public.analysis_requests(member_id, deleted_at);
