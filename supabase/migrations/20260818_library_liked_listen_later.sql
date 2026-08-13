-- Library shelves (S1): Liked + Listen Later song saves.
-- Phase D builds Library UI on top of these tables.
-- Songs only (D2). Never used for Moments/snippets.

create table if not exists public.liked_songs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table if not exists public.listen_later_songs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index if not exists liked_songs_user_created_idx
  on public.liked_songs (user_id, created_at desc);

create index if not exists listen_later_songs_user_created_idx
  on public.listen_later_songs (user_id, created_at desc);

alter table public.liked_songs enable row level security;
alter table public.listen_later_songs enable row level security;

-- Owner-only read/write (private Library shelves)
create policy "owner reads liked_songs"
  on public.liked_songs for select
  using (user_id = auth.uid());

create policy "owner inserts liked_songs"
  on public.liked_songs for insert
  with check (user_id = auth.uid());

create policy "owner deletes liked_songs"
  on public.liked_songs for delete
  using (user_id = auth.uid());

create policy "owner reads listen_later_songs"
  on public.listen_later_songs for select
  using (user_id = auth.uid());

create policy "owner inserts listen_later_songs"
  on public.listen_later_songs for insert
  with check (user_id = auth.uid());

create policy "owner deletes listen_later_songs"
  on public.listen_later_songs for delete
  using (user_id = auth.uid());
