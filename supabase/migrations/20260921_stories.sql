-- In-app Stories: ephemeral lyric Moments (24h TTL, accepted-followers audience).
-- References existing posts — native playback + Atmosphere, not exported video.

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists stories_author_created_idx
  on public.stories (author_profile_id, created_at desc);

create index if not exists stories_expires_at_idx
  on public.stories (expires_at);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_profile_id uuid not null references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (story_id, viewer_profile_id)
);

create index if not exists story_views_viewer_idx
  on public.story_views (viewer_profile_id, seen_at desc);

-- Post must be a top-level Moment the author can reference (active or own private).
create or replace function public.can_reference_story_post(p_post_id uuid, p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.parent_post_id is null
      and p.status not in ('hidden', 'sent')
      and (
        p.status = 'active'
        or p.author_profile_id = p_author_id
      )
  );
$$;

revoke all on function public.can_reference_story_post(uuid, uuid) from public;
grant execute on function public.can_reference_story_post(uuid, uuid) to authenticated;

-- Viewer is author or accepted follower; story not expired; post still readable.
create or replace function public.can_view_story(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stories s
    where s.id = p_story_id
      and s.expires_at > now()
      and (
        s.author_profile_id = auth.uid()
        or (
          exists (
            select 1
            from public.follows f
            where f.follower_id = auth.uid()
              and f.followee_id = s.author_profile_id
              and f.status = 'accepted'
          )
          and public.can_reference_story_post(s.post_id, s.author_profile_id)
        )
      )
  );
$$;

revoke all on function public.can_view_story(uuid) from public;
grant execute on function public.can_view_story(uuid) to authenticated;

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

drop policy if exists "authors insert stories" on public.stories;
create policy "authors insert stories" on public.stories
  for insert
  with check (
    author_profile_id = auth.uid()
    and expires_at > now()
    and expires_at <= now() + interval '25 hours'
    and public.can_reference_story_post(post_id, auth.uid())
  );

drop policy if exists "viewers read stories" on public.stories;
create policy "viewers read stories" on public.stories
  for select
  using (public.can_view_story(id));

drop policy if exists "authors delete own stories" on public.stories;
create policy "authors delete own stories" on public.stories
  for delete
  using (author_profile_id = auth.uid());

drop policy if exists "viewers record story views" on public.story_views;
create policy "viewers record story views" on public.story_views
  for insert
  with check (
    viewer_profile_id = auth.uid()
    and public.can_view_story(story_id)
  );

drop policy if exists "viewers update own story views" on public.story_views;
create policy "viewers update own story views" on public.story_views
  for update
  using (viewer_profile_id = auth.uid())
  with check (
    viewer_profile_id = auth.uid()
    and public.can_view_story(story_id)
  );

drop policy if exists "viewers read own story views" on public.story_views;
create policy "viewers read own story views" on public.story_views
  for select
  using (viewer_profile_id = auth.uid());

drop policy if exists "story authors read views on their stories" on public.story_views;
create policy "story authors read views on their stories" on public.story_views
  for select
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_views.story_id
        and s.author_profile_id = auth.uid()
    )
  );

comment on table public.stories is
  'Ephemeral in-app lyric Moments (24h). Native playback — not exported video.';

do $$
begin
  begin
    alter publication supabase_realtime add table public.stories;
  exception
    when duplicate_object then null;
    when undefined_object then
      raise notice 'publication supabase_realtime missing — enable Realtime in the project first';
    when others then
      raise notice 'could not add stories to realtime: %', sqlerrm;
  end;
end $$;
