-- Post export preferences + Auto-Promote foundations (Phase 0).
-- Verified artists only (is_artist + artist_status = 'active') via RLS helpers.

-- ---------------------------------------------------------------------------
-- 1. Persist export prefs on posts (shape / color / effect at export time)
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists export_shape_id text not null default 'square',
  add column if not exists export_theme_id text not null default 'gold',
  add column if not exists export_atmosphere_id text not null default 'still';

alter table public.posts
  drop constraint if exists posts_export_shape_id_check;

alter table public.posts
  add constraint posts_export_shape_id_check
  check (export_shape_id in ('square', 'vertical', 'wide'));

alter table public.posts
  drop constraint if exists posts_export_theme_id_check;

alter table public.posts
  add constraint posts_export_theme_id_check
  check (export_theme_id in ('gold', 'dark', 'blush', 'sage', 'dusk'));

alter table public.posts
  drop constraint if exists posts_export_atmosphere_id_check;

alter table public.posts
  add constraint posts_export_atmosphere_id_check
  check (export_atmosphere_id in ('still', 'breath', 'drift', 'pulse', 'weight'));

comment on column public.posts.export_shape_id is
  'Last-known export shape. Pre-migration rows default square (no historical shape data).';
comment on column public.posts.export_theme_id is
  'Color theme when export_atmosphere_id = still.';
comment on column public.posts.export_atmosphere_id is
  'Export effect overlay. still = color-only; living values replace color fill.';

-- Backfill living atmosphere from joined song where available.
update public.posts p
set export_atmosphere_id = s.atmosphere
from public.songs s
where p.song_id = s.id
  and s.atmosphere is not null
  and s.atmosphere in ('breath', 'drift', 'pulse', 'weight');

-- ---------------------------------------------------------------------------
-- 2. Artist promote settings (one row per artist)
-- ---------------------------------------------------------------------------

create table if not exists public.artist_promote_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  publish_mode text not null default 'review'
    check (publish_mode in ('auto', 'review')),
  enabled boolean not null default false,
  cadence text not null default 'manual'
    check (cadence in ('daily', 'weekly', 'manual')),
  max_posts_per_run smallint not null default 1
    check (max_posts_per_run between 1 and 5),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Connected social accounts (tokens server-only via API)
-- ---------------------------------------------------------------------------

create table if not exists public.artist_social_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null
    check (platform in ('youtube', 'tiktok', 'instagram', 'facebook', 'x')),
  status text not null default 'connected'
    check (status in ('connected', 'expired', 'revoked', 'error')),
  external_account_id text,
  external_username text,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  platform_meta jsonb not null default '{}',
  connected_at timestamptz not null default now(),
  last_publish_at timestamptz,
  last_error text,
  unique (profile_id, platform)
);

create index if not exists artist_social_connections_profile_idx
  on public.artist_social_connections (profile_id);

-- ---------------------------------------------------------------------------
-- 4. Promote queue + per-platform targets
-- ---------------------------------------------------------------------------

create table if not exists public.promote_queue (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending_review'
    check (status in (
      'draft', 'pending_review', 'approved', 'publishing',
      'published', 'partial', 'failed', 'rejected', 'cancelled'
    )),
  source_type text not null check (source_type in ('existing_moment', 'catalog_line')),
  source_post_id uuid references public.posts (id) on delete set null,
  source_song_id uuid references public.songs (id) on delete set null,
  source_line_indexes int[],
  lyric_text text not null,
  snippet_start_sec numeric,
  snippet_end_sec numeric,
  song_title text not null default '',
  artist_name text not null default '',
  artwork_url text,
  default_shape_id text not null default 'square'
    check (default_shape_id in ('square', 'vertical', 'wide')),
  default_theme_id text not null default 'gold'
    check (default_theme_id in ('gold', 'dark', 'blush', 'sage', 'dusk')),
  default_atmosphere_id text not null default 'still'
    check (default_atmosphere_id in ('still', 'breath', 'drift', 'pulse', 'weight')),
  override_shape_id text
    check (override_shape_id is null or override_shape_id in ('square', 'vertical', 'wide')),
  override_theme_id text
    check (override_theme_id is null or override_theme_id in ('gold', 'dark', 'blush', 'sage', 'dusk')),
  override_atmosphere_id text
    check (override_atmosphere_id is null or override_atmosphere_id in ('still', 'breath', 'drift', 'pulse', 'weight')),
  rendered_video_url text,
  rendered_at timestamptz,
  selection_score numeric,
  selection_reason jsonb,
  scheduled_publish_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promote_queue_profile_status_idx
  on public.promote_queue (profile_id, status, created_at desc);

create table if not exists public.promote_queue_targets (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.promote_queue (id) on delete cascade,
  platform text not null
    check (platform in ('youtube', 'tiktok', 'instagram', 'facebook', 'x')),
  connection_id uuid references public.artist_social_connections (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'publishing', 'published', 'failed', 'skipped')),
  external_post_id text,
  external_post_url text,
  error_message text,
  published_at timestamptz,
  unique (queue_id, platform)
);

create index if not exists promote_queue_targets_queue_idx
  on public.promote_queue_targets (queue_id);

-- ---------------------------------------------------------------------------
-- 5. Active-artist gate (stricter than badge display)
-- ---------------------------------------------------------------------------

create or replace function public.is_active_promote_artist(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.is_artist = true
      and p.artist_status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------

alter table public.artist_promote_settings enable row level security;
alter table public.artist_social_connections enable row level security;
alter table public.promote_queue enable row level security;
alter table public.promote_queue_targets enable row level security;

drop policy if exists artist_promote_settings_owner on public.artist_promote_settings;
create policy artist_promote_settings_owner on public.artist_promote_settings
  for all
  using (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()))
  with check (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()));

-- Connections: owner can read metadata rows but token columns should only be used server-side.
drop policy if exists artist_social_connections_owner_select on public.artist_social_connections;
create policy artist_social_connections_owner_select on public.artist_social_connections
  for select
  using (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()));

drop policy if exists artist_social_connections_owner_write on public.artist_social_connections;
create policy artist_social_connections_owner_write on public.artist_social_connections
  for insert
  with check (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()));

drop policy if exists artist_social_connections_owner_update on public.artist_social_connections;
create policy artist_social_connections_owner_update on public.artist_social_connections
  for update
  using (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()))
  with check (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()));

drop policy if exists artist_social_connections_owner_delete on public.artist_social_connections;
create policy artist_social_connections_owner_delete on public.artist_social_connections
  for delete
  using (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()));

drop policy if exists promote_queue_owner on public.promote_queue;
create policy promote_queue_owner on public.promote_queue
  for all
  using (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()))
  with check (profile_id = auth.uid() and public.is_active_promote_artist(auth.uid()));

drop policy if exists promote_queue_targets_owner on public.promote_queue_targets;
create policy promote_queue_targets_owner on public.promote_queue_targets
  for all
  using (
    exists (
      select 1 from public.promote_queue q
      where q.id = queue_id
        and q.profile_id = auth.uid()
        and public.is_active_promote_artist(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.promote_queue q
      where q.id = queue_id
        and q.profile_id = auth.uid()
        and public.is_active_promote_artist(auth.uid())
    )
  );

grant execute on function public.is_active_promote_artist(uuid) to authenticated, service_role;
