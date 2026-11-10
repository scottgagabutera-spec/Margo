-- One-off backup tables from 2026-11-10: lock down via RLS (no policies).
-- Only service_role can read/write; anon and authenticated are denied by default.

alter table public.bak_profile_favorite_artists_20261110 enable row level security;
alter table public.bak_catalog_artists_20261110 enable row level security;
