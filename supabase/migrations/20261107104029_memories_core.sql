-- Memories core (additive).
-- Production applied: version 20261107104029, name 20261108100007_memories_core.

create type public.memory_visibility as enum ('public', 'followers', 'only_me');
create type public.memory_date_granularity as enum ('day', 'month', 'year', 'period', 'none');

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  story text,
  mood text,
  visibility public.memory_visibility not null default 'public',
  show_in_lyrics_feed boolean not null default true,
  show_date_publicly boolean not null default true,
  date_granularity public.memory_date_granularity not null default 'none',
  date_start date,
  date_end date,
  cover_r2_key text,
  resonate_count int not null default 0,
  lyric_back_count int not null default 0,
  content_removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_story_len check (story is null or char_length(story) <= 500),
  constraint memories_date_period check (
    date_granularity <> 'period'
    or (date_start is not null and (date_end is null or date_end >= date_start))
  )
);

create index memories_owner_created_idx on public.memories (owner_profile_id, created_at desc);
create index memories_visibility_feed_idx
  on public.memories (visibility, show_in_lyrics_feed, created_at desc)
  where content_removed_at is null;
create index memories_public_timeline_idx
  on public.memories (date_start, created_at desc)
  where content_removed_at is null and visibility = 'public';

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  position smallint not null,
  r2_key text not null,
  width int,
  height int,
  created_at timestamptz not null default now(),
  unique (memory_id, position)
);

create index memory_photos_memory_idx on public.memory_photos (memory_id, position);

create table public.memory_songs (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  position smallint not null,
  song_id uuid references public.songs (id) on delete set null,
  song_title text not null,
  artist_name text not null,
  lyric_excerpt text,
  is_lyric_only boolean not null default false,
  unique (memory_id, position)
);

create index memory_songs_memory_idx on public.memory_songs (memory_id, position);
create index memory_songs_song_idx on public.memory_songs (song_id) where song_id is not null;

create table public.memory_resonates (
  memory_id uuid not null references public.memories (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, actor_id)
);

create index memory_resonates_actor_idx on public.memory_resonates (actor_id, created_at desc);

create table public.memory_lyric_backs (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  song_id uuid references public.songs (id) on delete set null,
  song_title text,
  artist_name text,
  lyric_excerpt text,
  created_at timestamptz not null default now(),
  content_removed_at timestamptz
);

create index memory_lyric_backs_memory_idx on public.memory_lyric_backs (memory_id, created_at desc);

create table public.memory_card_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  memory_id uuid not null references public.memories (id) on delete cascade,
  theme text not null,
  shape text not null,
  created_at timestamptz not null default now()
);

create index memory_card_exports_memory_idx on public.memory_card_exports (memory_id, created_at desc);

create or replace function public.memory_visible_to(p_memory_id uuid, p_viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memories m
    join public.profiles p on p.id = m.owner_profile_id
    where m.id = p_memory_id
      and m.content_removed_at is null
      and p.is_admin is not true
      and (
        m.owner_profile_id = p_viewer_id
        or m.visibility = 'public'
        or (
          m.visibility = 'followers'
          and p_viewer_id is not null
          and exists (
            select 1
            from public.follows f
            where f.followee_id = m.owner_profile_id
              and f.follower_id = p_viewer_id
              and f.status = 'accepted'
          )
        )
      )
  );
$$;

revoke all on function public.memory_visible_to(uuid, uuid) from public;
grant execute on function public.memory_visible_to(uuid, uuid) to authenticated, anon;

create or replace function public.touch_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memories_updated_at
  before update on public.memories
  for each row execute function public.touch_memory_updated_at();

create or replace function public.memory_resonate_count_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.memories set resonate_count = resonate_count + 1 where id = new.memory_id;
  elsif tg_op = 'DELETE' then
    update public.memories set resonate_count = greatest(0, resonate_count - 1) where id = old.memory_id;
  end if;
  return null;
end;
$$;

create trigger memory_resonates_count_ins
  after insert on public.memory_resonates
  for each row execute function public.memory_resonate_count_sync();

create trigger memory_resonates_count_del
  after delete on public.memory_resonates
  for each row execute function public.memory_resonate_count_sync();

alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.memory_songs enable row level security;
alter table public.memory_resonates enable row level security;
alter table public.memory_lyric_backs enable row level security;
alter table public.memory_card_exports enable row level security;

create policy memories_select on public.memories
  for select to authenticated, anon
  using (
    content_removed_at is null
    and memory_visible_to(id, auth.uid())
  );

create policy memories_insert on public.memories
  for insert to authenticated
  with check (owner_profile_id = auth.uid());

create policy memories_update on public.memories
  for update to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

create policy memories_delete on public.memories
  for delete to authenticated
  using (owner_profile_id = auth.uid());

create policy memory_photos_select on public.memory_photos
  for select to authenticated, anon
  using (memory_visible_to(memory_id, auth.uid()));

create policy memory_photos_write on public.memory_photos
  for all to authenticated
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.owner_profile_id = auth.uid()
    )
  );

create policy memory_songs_select on public.memory_songs
  for select to authenticated, anon
  using (memory_visible_to(memory_id, auth.uid()));

create policy memory_songs_write on public.memory_songs
  for all to authenticated
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.owner_profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and m.owner_profile_id = auth.uid()
    )
  );

create policy memory_resonates_select on public.memory_resonates
  for select to authenticated, anon
  using (memory_visible_to(memory_id, auth.uid()));

create policy memory_resonates_insert on public.memory_resonates
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and memory_visible_to(memory_id, auth.uid())
  );

create policy memory_resonates_delete on public.memory_resonates
  for delete to authenticated
  using (actor_id = auth.uid());

create policy memory_lyric_backs_select on public.memory_lyric_backs
  for select to authenticated, anon
  using (
    content_removed_at is null
    and memory_visible_to(memory_id, auth.uid())
  );

create policy memory_lyric_backs_insert on public.memory_lyric_backs
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and memory_visible_to(memory_id, auth.uid())
  );

create policy memory_card_exports_insert on public.memory_card_exports
  for insert to authenticated
  with check (user_id = auth.uid());

create policy memory_card_exports_select on public.memory_card_exports
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.memories to anon;
grant select on public.memory_photos to anon;
grant select on public.memory_songs to anon;
grant select on public.memory_resonates to anon;
grant select on public.memory_lyric_backs to anon;
