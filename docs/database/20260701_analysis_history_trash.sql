-- Analysis history trash support.
-- General deletes set deleted_at; permanent deletes remove the analysis_request row.

alter table public.analysis_requests
add column if not exists deleted_at timestamp with time zone,
add column if not exists deleted_by bigint references public.members(id) on delete set null;

create index if not exists idx_analysis_requests_deleted_at
on public.analysis_requests(deleted_at);

create index if not exists idx_analysis_requests_member_deleted_at
on public.analysis_requests(member_id, deleted_at);
