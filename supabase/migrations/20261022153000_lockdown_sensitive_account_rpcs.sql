-- Lock down account/moment purge RPCs: service_role EXECUTE only + caller guard.
-- App entrypoints: app/api/delete-account, app/api/posts/moment (service role after cookie session).

-- ── purge_user_account_data ───────────────────────────────────────────
create or replace function public.purge_user_account_data(
  p_user_id uuid,
  p_username text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_deleted int;
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if p_user_id is null then
    raise exception 'purge_user_account_data: p_user_id is required';
  end if;

  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'permission denied: purge_user_account_data'
      using errcode = '42501';
  end if;

  select username into v_username from public.profiles where id = p_user_id;
  if v_username is null and p_username is not null then
    v_username := p_username;
  end if;

  create temporary table if not exists _purge_posts (
    id uuid primary key
  ) on commit drop;
  truncate _purge_posts;

  with recursive tree as (
    select id from public.posts where author_profile_id = p_user_id
    union
    select p.id
    from public.posts p
    join tree t on p.parent_post_id = t.id
  )
  insert into _purge_posts (id)
  select id from tree
  on conflict do nothing;

  delete from public.post_resonates
  where post_id in (select id from _purge_posts);

  delete from public.post_reports
  where post_id in (select id from _purge_posts);

  delete from public.post_replays
  where post_id in (select id from _purge_posts);

  delete from public.post_stats
  where post_id in (select id from _purge_posts);

  delete from public.notifications
  where post_id in (select id::text from _purge_posts);

  loop
    delete from public.posts p
    where p.id in (select id from _purge_posts)
      and not exists (
        select 1 from public.posts c where c.parent_post_id = p.id
      );
    get diagnostics v_deleted = row_count;
    exit when v_deleted = 0;
  end loop;

  if exists (select 1 from public.posts where id in (select id from _purge_posts)) then
    raise exception 'purge_user_account_data: could not delete all posts for %', p_user_id;
  end if;

  delete from public.post_resonates
  where actor_id = p_user_id::text
     or (v_username is not null and actor_id = v_username);

  delete from public.post_replays
  where replayer_id = p_user_id;

  delete from public.post_reports
  where reporter_id = p_user_id;

  delete from public.song_resonates
  where actor_id = p_user_id::text
     or (v_username is not null and actor_id = v_username);

  delete from public.notifications
  where recipient_id = p_user_id
     or actor_id = p_user_id;

  delete from public.messages
  where sender_id = p_user_id
     or recipient_id = p_user_id;

  delete from public.follows
  where follower_id = p_user_id
     or followee_id = p_user_id;

  delete from public.artist_applications
  where profile_id = p_user_id;

  if to_regclass('public.queues') is not null then
    delete from public.queues
    where owner_profile_id = p_user_id;
  end if;

  delete from public.songs
  where owner_profile_id = p_user_id;

  delete from public.profiles
  where id = p_user_id;

  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'purge_user_account_data: profile % still exists after delete', p_user_id;
  end if;
end;
$$;

-- ── delete_own_post ───────────────────────────────────────────────────
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
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if p_post_id is null or p_user_id is null then
    raise exception 'delete_own_post: p_post_id and p_user_id are required';
  end if;

  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'permission denied: delete_own_post'
      using errcode = '42501';
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

-- ── update_own_moment ─────────────────────────────────────────────────
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
  v_line jsonb;
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if p_post_id is null or p_user_id is null then
    raise exception 'update_own_moment: p_post_id and p_user_id are required';
  end if;

  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'permission denied: update_own_moment'
      using errcode = '42501';
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

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    if length(coalesce(v_line ->> 'text', '')) > 500 then
      raise exception 'update_own_moment: line text exceeds maximum length';
    end if;
    if length(coalesce(v_line ->> 'song_title', '')) > 300 then
      raise exception 'update_own_moment: song title exceeds maximum length';
    end if;
    if length(coalesce(v_line ->> 'artist_name', '')) > 300 then
      raise exception 'update_own_moment: artist name exceeds maximum length';
    end if;
  end loop;

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

revoke all on function public.purge_user_account_data(uuid, text) from public;
revoke all on function public.purge_user_account_data(uuid, text) from anon;
revoke all on function public.purge_user_account_data(uuid, text) from authenticated;
grant execute on function public.purge_user_account_data(uuid, text) to service_role;

revoke all on function public.delete_own_post(uuid, uuid) from public;
revoke all on function public.delete_own_post(uuid, uuid) from anon;
revoke all on function public.delete_own_post(uuid, uuid) from authenticated;
grant execute on function public.delete_own_post(uuid, uuid) to service_role;

revoke all on function public.update_own_moment(uuid, uuid, jsonb) from public;
revoke all on function public.update_own_moment(uuid, uuid, jsonb) from anon;
revoke all on function public.update_own_moment(uuid, uuid, jsonb) from authenticated;
grant execute on function public.update_own_moment(uuid, uuid, jsonb) to service_role;
