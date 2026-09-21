-- Authors must read their own stories for INSERT … RETURNING and Story ring self-view.
-- Without this, SELECT policy (can_view_story) recurses on stories during RETURNING
-- and rejects the insert even when the author is valid.

drop policy if exists "authors read own stories" on public.stories;
create policy "authors read own stories" on public.stories
  for select
  using (author_profile_id = auth.uid());
