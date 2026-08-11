-- Multi-line moments: optional child rows for a post.
-- posts.text / song_id / snippet_* remain the position-0 mirror so Feed,
-- warm-cache selects, and privacy filtering stay unchanged for single-line
-- posts and for callers that don't join post_lines.

create table if not exists public.post_lines (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  position smallint not null,
  text text not null,
  song_id uuid references public.songs (id) on delete set null,
  song_title text,
  artist_name text,
  artwork_url text,
  snippet_start_sec numeric,
  snippet_end_sec numeric,
  source text not null default 'external'
    check (source in ('catalog', 'external', 'freeform')),
  created_at timestamptz not null default now(),
  constraint post_lines_position_range check (position >= 0 and position <= 2),
  constraint post_lines_post_position_unique unique (post_id, position)
);

create index if not exists post_lines_post_id_position_idx
  on public.post_lines (post_id, position);

comment on table public.post_lines is
  'Ordered lyric segments for a post moment. Cap 3 (positions 0–2). Position 0 mirrors posts.* columns.';

alter table public.post_lines enable row level security;

-- Visibility follows the parent post (active public, or owner).
drop policy if exists "read lines of visible posts" on public.post_lines;
create policy "read lines of visible posts" on public.post_lines
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.status = 'active'
          or p.author_profile_id = auth.uid()
        )
    )
  );

drop policy if exists "owners insert own post_lines" on public.post_lines;
create policy "owners insert own post_lines" on public.post_lines
  for insert with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.author_profile_id = auth.uid()
    )
  );

drop policy if exists "owners update own post_lines" on public.post_lines;
create policy "owners update own post_lines" on public.post_lines
  for update using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.author_profile_id = auth.uid()
    )
  );

drop policy if exists "owners delete own post_lines" on public.post_lines;
create policy "owners delete own post_lines" on public.post_lines
  for delete using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.author_profile_id = auth.uid()
    )
  );
