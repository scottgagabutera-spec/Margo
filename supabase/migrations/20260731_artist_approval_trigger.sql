-- Phase 1: Artist approval trigger + moderation columns
-- Margo — Music & Artist Catalog Migration, Section 2 / 2B
-- Run this in the Supabase SQL Editor against the live project.

-- ── 2. Approval trigger ──
-- Atomically flips profiles.is_artist to true when an artist_applications
-- row transitions into 'approved', and stamps reviewed_at on the same row.
-- Must be BEFORE UPDATE so it can modify new.reviewed_at (an AFTER trigger
-- cannot modify the row that fired it).

create or replace function public.on_artist_application_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update public.profiles
    set is_artist = true
    where id = new.profile_id;

    new.reviewed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists artist_application_approved on public.artist_applications;
create trigger artist_application_approved
  before update on public.artist_applications
  for each row
  execute function public.on_artist_application_approved();

-- ── 2B. Moderation columns on profiles ──
-- Consolidates ArtistsTab's warn/freeze/remove concept onto profiles,
-- replacing the old Firebase artists/{uid} node (confirmed not to exist,
-- so no backfill is required — every artist starts at 'active').

alter table public.profiles
  add column if not exists artist_status text not null default 'active'
    check (artist_status in ('active', 'warned', 'frozen', 'removed')),
  add column if not exists artist_status_reason text,
  add column if not exists artist_status_updated_at timestamptz;

-- Sanity checks — run these after the above to confirm the migration landed:
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_name = 'profiles' and column_name like 'artist_status%';
--
--   select trigger_name, event_manipulation, action_timing
--   from information_schema.triggers
--   where event_object_table = 'artist_applications';