-- Phase 2: Songs, lyrics, vibes, engagement schema
-- Margo — Music & Artist Catalog Migration, Section 3
-- Run AFTER Phase 1 (20260731_artist_approval_phase1.sql) — this depends on
-- profiles.artist_status existing for the songs RLS gate below.

-- ── Songs — owned directly by a profile, no artists table ──
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id),

  title text not null,
  artist_display_name text not null,   -- denormalized display string (may differ from profile display_name if artist uses a stage name)
  artwork_url text,
  audio_url text,
  description text,

  status text not null default 'draft'
    check (status in ('draft', 'processing', 'live', 'coming_soon', 'hidden')),
  coming_soon_label text,
  "order" int,

  -- streaming links — same shape as the Firebase Song interface
  youtube_url text,
  spotify_url text,
  apple_music_url text,
  soundcloud_url text,
  audiomack_url text,
  boomplay_url text,

  duration_sec numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index songs_owner_idx on public.songs(owner_profile_id);
create index songs_status_order_idx on public.songs(status, "order");

-- ── Lyric lines — real rows instead of a parsed SRT string ──
create table public.lyric_lines (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  line_index int not null,
  text text not null,
  start_sec numeric not null,
  end_sec numeric not null,
  unique (song_id, line_index)
);

create index lyric_lines_song_idx on public.lyric_lines(song_id);

-- ── Vibes — join table, powers the discovery board in one query ──
create table public.lyric_line_vibes (
  line_id uuid not null references public.lyric_lines(id) on delete cascade,
  vibe text not null,
  primary key (line_id, vibe)
);

create index lyric_line_vibes_vibe_idx on public.lyric_line_vibes(vibe);

-- ── Engagement — session-deduped, same concept as Firebase engagement/ node ──
create table public.song_plays (
  song_id uuid not null references public.songs(id) on delete cascade,
  session_id text not null,
  qualified_at timestamptz not null default now(),
  primary key (song_id, session_id)
);

create table public.song_resonates (
  song_id uuid not null references public.songs(id) on delete cascade,
  actor_id text not null,   -- auth.uid()::text for signed-in, margoSessionId for anon
  created_at timestamptz not null default now(),
  primary key (song_id, actor_id)
);

-- ── Denormalized stats — O(1) reads for cards/grid, no COUNT() on every render ──
create table public.song_stats (
  song_id uuid primary key references public.songs(id) on delete cascade,
  plays int not null default 0,
  resonate_count int not null default 0,
  lyric_uses int not null default 0,
  updated_at timestamptz not null default now()
);

-- Keep song_stats.resonate_count in sync automatically
create or replace function public.on_song_resonate_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.song_stats (song_id, resonate_count)
  values (coalesce(new.song_id, old.song_id), 0)
  on conflict (song_id) do nothing;

  update public.song_stats
  set resonate_count = (select count(*) from public.song_resonates where song_id = coalesce(new.song_id, old.song_id)),
      updated_at = now()
  where song_id = coalesce(new.song_id, old.song_id);
  return null;
end;
$$;

create trigger song_resonate_insert after insert on public.song_resonates
  for each row execute function public.on_song_resonate_change();
create trigger song_resonate_delete after delete on public.song_resonates
  for each row execute function public.on_song_resonate_change();

-- Keep song_stats.plays in sync automatically — same pattern as resonate_count.
-- (Not explicitly written out in the plan doc's Section 3 code block, but needed
-- so song_stats.plays is ever populated — added here to match the established
-- denormalized-counter convention rather than leaving plays permanently at 0.)
create or replace function public.on_song_play_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.song_stats (song_id, plays)
  values (new.song_id, 0)
  on conflict (song_id) do nothing;

  update public.song_stats
  set plays = (select count(*) from public.song_plays where song_id = new.song_id),
      updated_at = now()
  where song_id = new.song_id;
  return null;
end;
$$;

create trigger song_play_insert after insert on public.song_plays
  for each row execute function public.on_song_play_change();

-- ══════════════════════════════════════════════════════════════════
-- RLS policies
-- ══════════════════════════════════════════════════════════════════

alter table public.songs enable row level security;
alter table public.lyric_lines enable row level security;
alter table public.lyric_line_vibes enable row level security;
alter table public.song_plays enable row level security;
alter table public.song_resonates enable row level security;
alter table public.song_stats enable row level security;

-- Public can read live/coming-soon songs from artists in good standing;
-- owner can always read their own (incl. drafts, regardless of standing).
-- The artist_status gate is the Section 2B addition — a frozen/removed
-- artist's catalog stops surfacing publicly without deleting anything.
create policy "public reads live songs" on public.songs
  for select using (
    (
      status in ('live', 'coming_soon')
      and exists (
        select 1 from public.profiles p
        where p.id = owner_profile_id and p.artist_status = 'active'
      )
    )
    or owner_profile_id = auth.uid()
  );

-- Only artists can insert, only into their own profile_id
create policy "artists insert own songs" on public.songs
  for insert with check (
    owner_profile_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and is_artist = true)
  );

create policy "owner updates own songs" on public.songs
  for update using (owner_profile_id = auth.uid());

-- Lyric lines follow the parent song's visibility
create policy "read lines of visible songs" on public.lyric_lines
  for select using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and (
          (s.status in ('live','coming_soon')
            and exists (select 1 from public.profiles p where p.id = s.owner_profile_id and p.artist_status = 'active'))
          or s.owner_profile_id = auth.uid()
        )
    )
  );

create policy "owner writes own lines" on public.lyric_lines
  for all using (
    exists (select 1 from public.songs s where s.id = song_id and s.owner_profile_id = auth.uid())
  );

-- Vibes follow the same visibility as their parent line
create policy "read vibes of visible lines" on public.lyric_line_vibes
  for select using (
    exists (
      select 1 from public.lyric_lines ll
      join public.songs s on s.id = ll.song_id
      where ll.id = line_id
        and (
          (s.status in ('live','coming_soon')
            and exists (select 1 from public.profiles p where p.id = s.owner_profile_id and p.artist_status = 'active'))
          or s.owner_profile_id = auth.uid()
        )
    )
  );

create policy "owner writes own vibes" on public.lyric_line_vibes
  for all using (
    exists (
      select 1 from public.lyric_lines ll
      join public.songs s on s.id = ll.song_id
      where ll.id = line_id and s.owner_profile_id = auth.uid()
    )
  );

-- Engagement — public read (for stats), write only as self
create policy "public reads song_stats" on public.song_stats for select using (true);

create policy "authenticated writes own resonate" on public.song_resonates
  for all using (actor_id = coalesce(auth.uid()::text, actor_id));

-- Plays are anonymous-friendly (session-based, no auth required to qualify
-- a play) — anyone can insert, no one can read raw session rows directly
-- (only the denormalized song_stats.plays count is public).
create policy "anyone records a play" on public.song_plays
  for insert with check (true);

-- ══════════════════════════════════════════════════════════════════
-- Storage buckets
-- ══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public) values ('song-audio', 'song-audio', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('song-artwork', 'song-artwork', true)
  on conflict (id) do nothing;

-- Artists can upload/update only into a path prefixed with their own auth.uid()
-- (e.g. song-audio/{uid}/{songId}.mp3) — public can read from both buckets.
create policy "public reads song-audio" on storage.objects
  for select using (bucket_id = 'song-audio');

create policy "public reads song-artwork" on storage.objects
  for select using (bucket_id = 'song-artwork');

create policy "artist uploads own song-audio" on storage.objects
  for insert with check (
    bucket_id = 'song-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artist updates own song-audio" on storage.objects
  for update using (
    bucket_id = 'song-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artist uploads own song-artwork" on storage.objects
  for insert with check (
    bucket_id = 'song-artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "artist updates own song-artwork" on storage.objects
  for update using (
    bucket_id = 'song-artwork'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sanity checks after running:
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in
--     ('songs','lyric_lines','lyric_line_vibes','song_plays','song_resonates','song_stats');
--
--   select policyname, tablename from pg_policies where schemaname = 'public'
--   and tablename in ('songs','lyric_lines','lyric_line_vibes','song_plays','song_resonates','song_stats');