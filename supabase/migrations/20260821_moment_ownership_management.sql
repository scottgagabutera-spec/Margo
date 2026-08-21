-- Moment ownership management: server-verified Delete and multi-line-aware
-- Edit for a user's own Moment.
--
-- Architecture mirrors the existing account-deletion pipeline exactly
-- (supabase/migrations/20260810_complete_account_deletion.sql +
-- app/api/delete-account/route.ts): a SECURITY DEFINER function granted to
-- service_role only, invoked from a Next.js API route that first verifies
-- the caller's session via cookies and passes the verified user id in
-- explicitly. Ownership is therefore enforced server-side twice — once by
-- the route reading the real session, once by the function checking
-- author_profile_id — never trusted from client-supplied post data.
--
-- Also adds the RLS policy the posts table was missing: post_lines already
-- had owner insert/update/delete policies (20260816_post_lines.sql), but
-- posts itself only ever had owner select/update. Added for completeness /
-- defense-in-depth even though the RPC path below runs as service role and
-- does not depend on RLS to function.

drop policy if exists "owners delete own posts" on public.posts;
create policy "owners delete own posts" on public.posts
  for delete
  to authenticated
  using (auth.uid() = author_profile_id);

-- ── delete_own_post ──────────────────────────────────────────────────
-- Deletes exactly one post the caller owns. Does NOT cascade-delete Lyric
-- Back replies — a reply is the replier's own content, not the original
-- author's, so deleting a Moment orphans its direct replies (parent_post_id
-- set to null) instead of destroying someone else's words. post_lines,
-- card_exports, and suggest_lyric_back_cache already have verified
-- cascade/set-null FKs (20260816/20260815/20260817 migrations) and need no
-- manual cleanup here. post_resonates, post_reports, post_replays,
-- post_stats, and notifications predate this repo's tracked migration
-- history (their CREATE TABLE statements aren't in supabase/migrations/),
-- so their FK on-delete behavior can't be verified from the repo alone —
-- deleted explicitly here instead, mirroring exactly how
-- purge_user_account_data already handles the same tables for full account
-- deletion.
create or replace function public.delete_own_post(
  p_post_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if p_post_id is null or p_user_id is null then
    raise exception 'delete_own_post: p_post_id and p_user_id are required';
  end if;

  select author_profile_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null then
    raise exception 'delete_own_post: post % not found', p_post_id;
  end if;
  if v_owner <> p_user_id then
    raise exception 'delete_own_post: % does not own post %', p_user_id, p_post_id;
  end if;

  update public.posts set parent_post_id = null where parent_post_id = p_post_id;

  delete from public.post_resonates where post_id = p_post_id;
  delete from public.post_reports where post_id = p_post_id;
  delete from public.post_replays where post_id = p_post_id;
  delete from public.post_stats where post_id = p_post_id;
  delete from public.notifications where post_id = p_post_id::text;

  delete from public.posts where id = p_post_id;

  if exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'delete_own_post: post % still exists after delete', p_post_id;
  end if;
end;
$$;

revoke all on function public.delete_own_post(uuid, uuid) from public;
grant execute on function public.delete_own_post(uuid, uuid) to service_role;

-- ── update_own_moment ────────────────────────────────────────────────
-- Atomically replaces a Moment's lines: the posts mirror fields (position
-- 0 — Feed/warm-cache/privacy filtering read these directly and never join
-- post_lines, so they must stay in sync) plus the complete post_lines set.
-- p_lines is the full, final, ordered array of 1-3 lines the Edit Moment
-- UI resolved client-side (snippet timing / song linkage per line, the
-- same way Compose already resolves it at creation time) — this function
-- only persists it, atomically, so a partial client failure can never
-- leave the Moment with zero lines the way a sequential delete-then-insert
-- from the client could.
create or replace function public.update_own_moment(
  p_post_id uuid,
  p_user_id uuid,
  p_lines jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_count int;
  v_first jsonb;
begin
  if p_post_id is null or p_user_id is null then
    raise exception 'update_own_moment: p_post_id and p_user_id are required';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then
    raise exception 'update_own_moment: p_lines must be a JSON array';
  end if;

  select author_profile_id into v_owner from public.posts where id = p_post_id;
  if v_owner is null then
    raise exception 'update_own_moment: post % not found', p_post_id;
  end if;
  if v_owner <> p_user_id then
    raise exception 'update_own_moment: % does not own post %', p_user_id, p_post_id;
  end if;

  v_count := jsonb_array_length(p_lines);
  if v_count is null or v_count < 1 or v_count > 3 then
    raise exception 'update_own_moment: p_lines must contain 1 to 3 lines';
  end if;

  v_first := p_lines -> 0;
  if coalesce(trim(v_first ->> 'text'), '') = '' then
    raise exception 'update_own_moment: first line text cannot be empty';
  end if;

  update public.posts set
    text = v_first ->> 'text',
    song_id = nullif(v_first ->> 'song_id', '')::uuid,
    song_title = v_first ->> 'song_title',
    artist_name = v_first ->> 'artist_name',
    artwork_url = nullif(v_first ->> 'artwork_url', ''),
    snippet_start_sec = nullif(v_first ->> 'snippet_start_sec', '')::numeric,
    snippet_end_sec = nullif(v_first ->> 'snippet_end_sec', '')::numeric
  where id = p_post_id;

  delete from public.post_lines where post_id = p_post_id;

  insert into public.post_lines (
    post_id, position, text, song_id, song_title, artist_name,
    artwork_url, snippet_start_sec, snippet_end_sec, source
  )
  select
    p_post_id,
    (ordinality - 1)::smallint,
    line ->> 'text',
    nullif(line ->> 'song_id', '')::uuid,
    line ->> 'song_title',
    line ->> 'artist_name',
    nullif(line ->> 'artwork_url', ''),
    nullif(line ->> 'snippet_start_sec', '')::numeric,
    nullif(line ->> 'snippet_end_sec', '')::numeric,
    coalesce(nullif(line ->> 'source', ''), 'external')
  from jsonb_array_elements(p_lines) with ordinality as t(line, ordinality);
end;
$$;

revoke all on function public.update_own_moment(uuid, uuid, jsonb) from public;
grant execute on function public.update_own_moment(uuid, uuid, jsonb) to service_role;
