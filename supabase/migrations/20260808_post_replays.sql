-- Replay: plain amplify or quote of another user's post.
-- Shape mirrors post_resonates (join table, unique per actor×post).
-- Apply in Supabase SQL Editor; repo tracks migrations.
--
-- RLS: post_resonates uses "authenticated writes own post_resonate"
-- (FOR ALL on own actor). We need a public/authenticated SELECT so
-- other users' profiles and follower feeds can render Replays — so
-- this migrates as separate select + insert/update/delete policies
-- instead of a single FOR ALL.

create table if not exists public.post_replays (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  replayer_id uuid not null references public.profiles(id) on delete cascade,
  quote_text text, -- null = plain Replay; non-null = quote Replay
  created_at timestamptz not null default now(),
  unique (post_id, replayer_id)
);

create index if not exists post_replays_post_idx
  on public.post_replays (post_id);

create index if not exists post_replays_replayer_created_idx
  on public.post_replays (replayer_id, created_at desc);

alter table public.post_replays enable row level security;

drop policy if exists "authenticated reads post_replays" on public.post_replays;
create policy "authenticated reads post_replays" on public.post_replays
  for select
  to authenticated
  using (true);

drop policy if exists "users insert own post_replays" on public.post_replays;
create policy "users insert own post_replays" on public.post_replays
  for insert
  to authenticated
  with check (auth.uid() = replayer_id);

-- Plain → quote upgrade (unique row stays; quote_text is filled in).
drop policy if exists "users update own post_replays" on public.post_replays;
create policy "users update own post_replays" on public.post_replays
  for update
  to authenticated
  using (auth.uid() = replayer_id)
  with check (auth.uid() = replayer_id);

drop policy if exists "users delete own post_replays" on public.post_replays;
create policy "users delete own post_replays" on public.post_replays
  for delete
  to authenticated
  using (auth.uid() = replayer_id);

-- Optional denormalized count on post_stats (mirrors resonate_count /
-- echo_count triggers). Safe if column already exists.
alter table public.post_stats
  add column if not exists replay_count int not null default 0;

create or replace function public.sync_post_replay_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
  v_count int;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  select count(*)::int into v_count
  from public.post_replays
  where post_id = v_post_id;

  update public.post_stats
  set replay_count = v_count
  where post_id = v_post_id;

  if not found then
    insert into public.post_stats (post_id, views, resonate_count, echo_count, replay_count)
    values (v_post_id, 0, 0, 0, v_count);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists post_replay_insert on public.post_replays;
create trigger post_replay_insert
  after insert on public.post_replays
  for each row execute function public.sync_post_replay_count();

drop trigger if exists post_replay_delete on public.post_replays;
create trigger post_replay_delete
  after delete on public.post_replays
  for each row execute function public.sync_post_replay_count();

-- One-time backfill (safe no-op when empty).
update public.post_stats ps
set replay_count = coalesce((
  select count(*)::int from public.post_replays r where r.post_id = ps.post_id
), 0);
