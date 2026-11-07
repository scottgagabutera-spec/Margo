-- Favorite artists (PR2): external artist directory + per-profile picks. Additive only.

create table if not exists public.catalog_artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text not null,
  source text not null check (source in ('deezer', 'apple', 'genius')),
  source_id text not null,
  artwork_r2_key text,
  margo_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_artists_source_unique unique (source, source_id)
);

create index if not exists catalog_artists_name_normalized_idx
  on public.catalog_artists (name_normalized);

create table if not exists public.profile_favorite_artists (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  catalog_artist_id uuid not null references public.catalog_artists (id) on delete cascade,
  position smallint not null check (position >= 0 and position < 10),
  created_at timestamptz not null default now(),
  primary key (profile_id, position),
  constraint profile_favorite_artists_profile_artist_unique unique (profile_id, catalog_artist_id)
);

alter table public.catalog_artists enable row level security;
alter table public.profile_favorite_artists enable row level security;

create policy catalog_artists_select_anon
  on public.catalog_artists for select to anon, authenticated
  using (true);

create policy profile_favorite_artists_select
  on public.profile_favorite_artists for select to anon, authenticated
  using (true);

create policy profile_favorite_artists_insert_own
  on public.profile_favorite_artists for insert to authenticated
  with check (profile_id = auth.uid());

create policy profile_favorite_artists_update_own
  on public.profile_favorite_artists for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy profile_favorite_artists_delete_own
  on public.profile_favorite_artists for delete to authenticated
  using (profile_id = auth.uid());

-- catalog_artists writes: service role / server only (no insert policy for authenticated).

grant select on public.catalog_artists to anon, authenticated;
grant select, insert, update, delete on public.profile_favorite_artists to authenticated;
