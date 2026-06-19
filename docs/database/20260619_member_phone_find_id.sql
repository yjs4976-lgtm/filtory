-- 아이디 찾기(이름 + 전화번호) 지원을 위한 안전한 추가 마이그레이션
-- 기존 회원 데이터는 변경하지 않으며, 전화번호가 없는 기존 회원은 프로필에서 등록한 뒤 사용할 수 있습니다.
alter table public.members
  add column if not exists phone varchar(50);

create index if not exists idx_members_active_name_phone
  on public.members (real_name, phone)
  where active is true and deleted_at is null;
