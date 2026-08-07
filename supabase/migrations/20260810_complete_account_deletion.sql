-- Complete account deletion: transactional DB purge for a single profile.
-- Called from app/api/delete-account via service role (RPC).
-- Storage object cleanup stays in the API route (Storage API).

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
begin
  if p_user_id is null then
    raise exception 'purge_user_account_data: p_user_id is required';
  end if;

  select username into v_username from public.profiles where id = p_user_id;
  if v_username is null and p_username is not null then
    v_username := p_username;
  end if;

  -- Post tree: every post authored by the user, plus all nested replies under
  -- those posts (any author) so parent_post_id FKs cannot block deletion.
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

  -- Engagement / notifications tied to those posts
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

  -- Delete posts leaf-first (self-referencing parent_post_id)
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

  -- User as actor on others' content (uuid and legacy display-name actor_id)
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

  -- Correct column: profile_id (not user_id)
  delete from public.artist_applications
  where profile_id = p_user_id;

  -- Optional listen queues owned by this profile (FK without cascade)
  if to_regclass('public.queues') is not null then
    delete from public.queues
    where owner_profile_id = p_user_id;
  end if;

  -- Songs: children (lyric_lines, vibes, plays, resonates, stats) cascade from songs
  delete from public.songs
  where owner_profile_id = p_user_id;

  delete from public.profiles
  where id = p_user_id;

  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'purge_user_account_data: profile % still exists after delete', p_user_id;
  end if;
end;
$$;

revoke all on function public.purge_user_account_data(uuid, text) from public;
grant execute on function public.purge_user_account_data(uuid, text) to service_role;
