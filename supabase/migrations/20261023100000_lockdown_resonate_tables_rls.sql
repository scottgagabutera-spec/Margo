-- H3: post_resonates / song_resonates — remove public ALL policy with
-- coalesce(auth.uid()::text, actor_id) that allowed anon read/write any actor_id.
-- Authenticated users: SELECT/INSERT/DELETE own rows only. Anon: no access.
-- Public counts remain on post_stats.resonate_count / song_stats.resonate_count.

drop policy if exists "authenticated writes own post_resonate" on public.post_resonates;
drop policy if exists "authenticated writes own resonate" on public.song_resonates;

create policy "users read own post_resonates"
  on public.post_resonates
  for select
  to authenticated
  using (actor_id = (auth.uid())::text);

create policy "users insert own post_resonates"
  on public.post_resonates
  for insert
  to authenticated
  with check (actor_id = (auth.uid())::text);

create policy "users delete own post_resonates"
  on public.post_resonates
  for delete
  to authenticated
  using (actor_id = (auth.uid())::text);

create policy "users read own song_resonates"
  on public.song_resonates
  for select
  to authenticated
  using (actor_id = (auth.uid())::text);

create policy "users insert own song_resonates"
  on public.song_resonates
  for insert
  to authenticated
  with check (actor_id = (auth.uid())::text);

create policy "users delete own song_resonates"
  on public.song_resonates
  for delete
  to authenticated
  using (actor_id = (auth.uid())::text);
