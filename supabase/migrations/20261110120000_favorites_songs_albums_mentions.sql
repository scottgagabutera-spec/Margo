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
  catalog_artist_id uuid references public.catalog_artists (id) on delete set null,
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
  catalog_artist_id uuid references public.catalog_artists (id) on delete set null,
  favorite_mention_count integer not null default 0 check (favorite_mention_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_albums_source_unique unique (source, source_id)
);

create index if not exists catalog_songs_catalog_artist_id_idx
  on public.catalog_songs (catalog_artist_id)
  where catalog_artist_id is not null;

create index if not exists catalog_albums_catalog_artist_id_idx
  on public.catalog_albums (catalog_artist_id)
  where catalog_artist_id is not null;

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

-- ── Atomic favorites replace (single transaction; rollback on failure) ───
create or replace function public._validate_favorite_items(p_items jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  elem jsonb;
  pos int;
  cid uuid;
  seen_pos int[] := '{}';
  seen_id uuid[] := '{}';
  n int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid items';
  end if;
  n := jsonb_array_length(p_items);
  if n > 10 then
    raise exception 'too many favorites';
  end if;
  for elem in select value from jsonb_array_elements(p_items)
  loop
    pos := (elem ->> 'position')::int;
    cid := (elem ->> 'catalog_id')::uuid;
    if cid is null or pos is null or pos < 0 or pos > 9 then
      raise exception 'invalid item';
    end if;
    if pos = any(seen_pos) then
      raise exception 'duplicate position';
    end if;
    if cid = any(seen_id) then
      raise exception 'duplicate catalog row';
    end if;
    seen_pos := array_append(seen_pos, pos);
    seen_id := array_append(seen_id, cid);
  end loop;
end;
$$;

create or replace function public.replace_profile_favorite_artists(
  p_profile_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  elem jsonb;
begin
  if p_profile_id is null then
    raise exception 'profile_id required';
  end if;
  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_profile_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  perform public._validate_favorite_items(p_items);

  delete from public.profile_favorite_artists where profile_id = p_profile_id;

  for elem in select value from jsonb_array_elements(p_items)
  loop
    insert into public.profile_favorite_artists (profile_id, catalog_artist_id, position)
    values (
      p_profile_id,
      (elem ->> 'catalog_id')::uuid,
      (elem ->> 'position')::int
    );
  end loop;
end;
$$;

create or replace function public.replace_profile_favorite_songs(
  p_profile_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  elem jsonb;
begin
  if p_profile_id is null then
    raise exception 'profile_id required';
  end if;
  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_profile_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  perform public._validate_favorite_items(p_items);

  delete from public.profile_favorite_songs where profile_id = p_profile_id;

  for elem in select value from jsonb_array_elements(p_items)
  loop
    insert into public.profile_favorite_songs (profile_id, catalog_song_id, position)
    values (
      p_profile_id,
      (elem ->> 'catalog_id')::uuid,
      (elem ->> 'position')::int
    );
  end loop;
end;
$$;

create or replace function public.replace_profile_favorite_albums(
  p_profile_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  elem jsonb;
begin
  if p_profile_id is null then
    raise exception 'profile_id required';
  end if;
  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_profile_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  perform public._validate_favorite_items(p_items);

  delete from public.profile_favorite_albums where profile_id = p_profile_id;

  for elem in select value from jsonb_array_elements(p_items)
  loop
    insert into public.profile_favorite_albums (profile_id, catalog_album_id, position)
    values (
      p_profile_id,
      (elem ->> 'catalog_id')::uuid,
      (elem ->> 'position')::int
    );
  end loop;
end;
$$;

grant execute on function public.replace_profile_favorite_artists(uuid, jsonb) to service_role;
grant execute on function public.replace_profile_favorite_songs(uuid, jsonb) to service_role;
grant execute on function public.replace_profile_favorite_albums(uuid, jsonb) to service_role;

-- ── Idempotent mention counter backfill (recount; safe to re-run) ───────
update public.catalog_artists ca
set favorite_mention_count = src.cnt
from (
  select catalog_artist_id, count(*)::int as cnt
  from public.profile_favorite_artists
  group by catalog_artist_id
) src
where ca.id = src.catalog_artist_id;

update public.catalog_artists ca
set favorite_mention_count = 0
where not exists (
  select 1 from public.profile_favorite_artists p where p.catalog_artist_id = ca.id
);

update public.catalog_songs cs
set favorite_mention_count = src.cnt
from (
  select catalog_song_id, count(*)::int as cnt
  from public.profile_favorite_songs
  group by catalog_song_id
) src
where cs.id = src.catalog_song_id;

update public.catalog_songs cs
set favorite_mention_count = 0
where not exists (
  select 1 from public.profile_favorite_songs p where p.catalog_song_id = cs.id
);

update public.catalog_albums ca
set favorite_mention_count = src.cnt
from (
  select catalog_album_id, count(*)::int as cnt
  from public.profile_favorite_albums
  group by catalog_album_id
) src
where ca.id = src.catalog_album_id;

update public.catalog_albums ca
set favorite_mention_count = 0
where not exists (
  select 1 from public.profile_favorite_albums p where p.catalog_album_id = ca.id
);
