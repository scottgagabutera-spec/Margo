-- Post reports queue for in-product Report action (PostCard ••• menu).
-- Apply in Supabase SQL Editor; repo tracks migrations.

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create index if not exists post_reports_status_created_idx
  on public.post_reports (status, created_at desc);

alter table public.post_reports enable row level security;

-- Signed-in users can file a report as themselves (one per post).
drop policy if exists "users insert own reports" on public.post_reports;
create policy "users insert own reports" on public.post_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Reporters can see their own submissions (optional transparency).
drop policy if exists "users read own reports" on public.post_reports;
create policy "users read own reports" on public.post_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Admins: use service role or an existing is_admin path for full queue
-- reads/updates. Client admin UI in this app uses the signed-in admin
-- user's supabase client — grant SELECT/UPDATE to admins via the
-- same is_admin() helper used elsewhere if present. Fallback: service
-- role API. Soft allow for authenticated users marked is_admin on profiles
-- when that column exists:

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
  ) then
    execute $pol$
      drop policy if exists "admins read all reports" on public.post_reports;
      create policy "admins read all reports" on public.post_reports
        for select to authenticated
        using (exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin = true
        ));
    $pol$;
    execute $pol$
      drop policy if exists "admins update reports" on public.post_reports;
      create policy "admins update reports" on public.post_reports
        for update to authenticated
        using (exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin = true
        ))
        with check (exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin = true
        ));
    $pol$;
  end if;
end $$;

-- Owners must be able to soft-hide their own replies (status → hidden).
-- Only add if no broader owner-update policy already covers this.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and policyname = 'owners update own posts'
  ) then
    create policy "owners update own posts" on public.posts
      for update
      to authenticated
      using (auth.uid() = author_profile_id)
      with check (auth.uid() = author_profile_id);
  end if;
end $$;
