-- Favorite songs & albums + catalog rows + mention counters (apply manually; not auto-run in CI).

-- ── Catalog songs (external + Margo link) ─────────────────────────────
create table if not exists public.catalog_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_name text not null,
  source text not null check (source in ('margo', 'apple', 'genius', 'deezer')),
  source_id text not null,
  artwork_url text,
  margo_song_id uuid references public.songs (id) on delete set null,
  favorite_mention_count integer not null default 0 check (favorite_mention_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_songs_source_unique unique (source, source_id)
);

create index if not exists catalog_songs_margo_song_id_idx
  on public.catalog_songs (margo_song_id)
  where margo_song_id is not null;

-- ── Catalog albums ────────────────────────────────────────────────────
create table if not exists public.catalog_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_name text not null,
  source text not null check (source in ('apple', 'deezer')),
  source_id text not null,
  artwork_url text,
  favorite_mention_count integer not null default 0 check (favorite_mention_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_albums_source_unique unique (source, source_id)
);

-- ── Artist mention counter on existing catalog_artists ────────────────
alter table public.catalog_artists
  add column if not exists favorite_mention_count integer not null default 0;

alter table public.catalog_artists
  drop constraint if exists catalog_artists_favorite_mention_count_nonneg;

alter table public.catalog_artists
  add constraint catalog_artists_favorite_mention_count_nonneg
  check (favorite_mention_count >= 0);

-- ── Profile favorite songs / albums ───────────────────────────────────
create table if not exists public.profile_favorite_songs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  catalog_song_id uuid not null references public.catalog_songs (id) on delete cascade,
  position smallint not null check (position >= 0 and position < 10),
  created_at timestamptz not null default now(),
  primary key (profile_id, position),
  constraint profile_favorite_songs_profile_song_unique unique (profile_id, catalog_song_id)
);

create table if not exists public.profile_favorite_albums (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  catalog_album_id uuid not null references public.catalog_albums (id) on delete cascade,
  position smallint not null check (position >= 0 and position < 10),
  created_at timestamptz not null default now(),
  primary key (profile_id, position),
  constraint profile_favorite_albums_profile_album_unique unique (profile_id, catalog_album_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────
alter table public.catalog_songs enable row level security;
alter table public.catalog_albums enable row level security;
alter table public.profile_favorite_songs enable row level security;
alter table public.profile_favorite_albums enable row level security;

drop policy if exists catalog_songs_select on public.catalog_songs;
create policy catalog_songs_select on public.catalog_songs for select to anon, authenticated using (true);

drop policy if exists catalog_albums_select on public.catalog_albums;
create policy catalog_albums_select on public.catalog_albums for select to anon, authenticated using (true);

drop policy if exists profile_favorite_songs_select on public.profile_favorite_songs;
create policy profile_favorite_songs_select on public.profile_favorite_songs for select to anon, authenticated using (true);

drop policy if exists profile_favorite_songs_insert_own on public.profile_favorite_songs;
create policy profile_favorite_songs_insert_own on public.profile_favorite_songs for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists profile_favorite_songs_delete_own on public.profile_favorite_songs;
create policy profile_favorite_songs_delete_own on public.profile_favorite_songs for delete to authenticated
  using (profile_id = auth.uid());

drop policy if exists profile_favorite_albums_select on public.profile_favorite_albums;
create policy profile_favorite_albums_select on public.profile_favorite_albums for select to anon, authenticated using (true);

drop policy if exists profile_favorite_albums_insert_own on public.profile_favorite_albums;
create policy profile_favorite_albums_insert_own on public.profile_favorite_albums for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists profile_favorite_albums_delete_own on public.profile_favorite_albums;
create policy profile_favorite_albums_delete_own on public.profile_favorite_albums for delete to authenticated
  using (profile_id = auth.uid());

grant select on public.catalog_songs to anon, authenticated;
grant select on public.catalog_albums to anon, authenticated;
grant select, insert, delete on public.profile_favorite_songs to authenticated;
grant select, insert, delete on public.profile_favorite_albums to authenticated;

-- ── Mention counters (triggers only; clients never write counts) ────────
create or replace function public.bump_catalog_artist_mention()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.catalog_artists set favorite_mention_count = favorite_mention_count + 1 where id = new.catalog_artist_id;
  elsif tg_op = 'DELETE' then
    update public.catalog_artists set favorite_mention_count = greatest(0, favorite_mention_count - 1) where id = old.catalog_artist_id;
  end if;
  return null;
end;
$$;

drop trigger if exists profile_favorite_artists_mention_incr on public.profile_favorite_artists;
create trigger profile_favorite_artists_mention_incr
  after insert or delete on public.profile_favorite_artists
  for each row execute function public.bump_catalog_artist_mention();

create or replace function public.bump_catalog_song_mention()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.catalog_songs set favorite_mention_count = favorite_mention_count + 1 where id = new.catalog_song_id;
  elsif tg_op = 'DELETE' then
    update public.catalog_songs set favorite_mention_count = greatest(0, favorite_mention_count - 1) where id = old.catalog_song_id;
  end if;
  return null;
end;
$$;

drop trigger if exists profile_favorite_songs_mention_incr on public.profile_favorite_songs;
create trigger profile_favorite_songs_mention_incr
  after insert or delete on public.profile_favorite_songs
  for each row execute function public.bump_catalog_song_mention();

create or replace function public.bump_catalog_album_mention()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.catalog_albums set favorite_mention_count = favorite_mention_count + 1 where id = new.catalog_album_id;
  elsif tg_op = 'DELETE' then
    update public.catalog_albums set favorite_mention_count = greatest(0, favorite_mention_count - 1) where id = old.catalog_album_id;
  end if;
  return null;
end;
$$;

drop trigger if exists profile_favorite_albums_mention_incr on public.profile_favorite_albums;
create trigger profile_favorite_albums_mention_incr
  after insert or delete on public.profile_favorite_albums
  for each row execute function public.bump_catalog_album_mention();
