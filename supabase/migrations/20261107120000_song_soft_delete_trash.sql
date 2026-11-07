-- Soft-delete + trash retention for catalog songs (YouTube Studio–style).
-- Hidden: existing status = 'hidden' (RLS already hides from public reads).
-- Deleted: status 'archived' + deleted_at set; public policy excludes archived; owner still reads via OR branch.

alter table public.songs
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists pre_delete_status text;

-- Allow archived (soft-deleted) rows; keep historical check names meaningful.
alter table public.songs drop constraint if exists songs_status_check;
alter table public.songs
  add constraint songs_status_check
  check (status in ('draft', 'processing', 'live', 'coming_soon', 'hidden', 'archived'));

drop policy if exists "public reads live songs" on public.songs;
create policy "public reads live songs" on public.songs
  for select using (
    (
      status in ('live', 'coming_soon')
      and deleted_at is null
      and exists (
        select 1 from public.profiles p
        where p.id = owner_profile_id and p.artist_status = 'active'
      )
    )
    or owner_profile_id = auth.uid()
  );

comment on column public.songs.deleted_at is 'When set, song is soft-deleted (trash). Purged by cron after purge_after.';
comment on column public.songs.purge_after is 'R2/Storage cleanup and hard delete scheduled after this time (typically deleted_at + 30d).';
comment on column public.songs.pre_delete_status is 'Status before soft delete; used when restoring from trash.';

create index if not exists songs_deleted_at_idx on public.songs (deleted_at) where deleted_at is not null;
create index if not exists songs_purge_after_idx on public.songs (purge_after) where purge_after is not null;

-- Lyric lines: exclude soft-deleted (archived) parent songs from public line reads.
drop policy if exists "read lines of visible songs" on public.lyric_lines;
create policy "read lines of visible songs" on public.lyric_lines
  for select using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.deleted_at is null
        and (
          (s.status in ('live','coming_soon')
            and exists (select 1 from public.profiles p where p.id = s.owner_profile_id and p.artist_status = 'active'))
          or s.owner_profile_id = auth.uid()
        )
    )
  );
