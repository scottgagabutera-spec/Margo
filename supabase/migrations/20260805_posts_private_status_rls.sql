-- Keep Private: posts.status = 'private' is already filtered in app queries
-- (usePosts / useSharedLines). This migration locks the same rule into RLS
-- so anon/other authenticated clients cannot SELECT private/hidden rows via
-- the Supabase client. Service role (admin API) bypasses RLS.
--
-- Owners retain SELECT on their own rows (including private) for future
-- "my private lyrics" surfaces. Insert/update owner policies are unchanged.

drop policy if exists "public reads active posts" on public.posts;
create policy "public reads active posts" on public.posts
  for select
  using (status = 'active');

drop policy if exists "owners read own posts" on public.posts;
create policy "owners read own posts" on public.posts
  for select
  using (auth.uid() = author_profile_id);
