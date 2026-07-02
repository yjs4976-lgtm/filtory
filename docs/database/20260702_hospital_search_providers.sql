-- Hospital search provider support.
-- Run this once in the Supabase SQL editor before deploying the app code.

alter table public.hospitals
add column if not exists source_provider varchar(20),
add column if not exists external_place_id varchar(100),
add column if not exists kakao_place_url text,
add column if not exists road_address text,
add column if not exists latitude numeric(10, 7),
add column if not exists longitude numeric(10, 7),
add column if not exists is_official_hospital boolean not null default false,
add column if not exists official_source varchar(20);

create unique index if not exists uq_hospitals_source_provider_external_place_id
on public.hospitals(source_provider, external_place_id)
where source_provider is not null and external_place_id is not null;

create index if not exists idx_hospitals_latitude_longitude
on public.hospitals(latitude, longitude)
where latitude is not null and longitude is not null;
