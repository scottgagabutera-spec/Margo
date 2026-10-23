-- posts.text is NOT NULL; shell erase uses empty string, not NULL.

create or replace function public.delete_or_shell_own_lyric_back(
  p_post_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_parent uuid;
  v_child_count int;
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if p_post_id is null or p_user_id is null then
    raise exception 'delete_or_shell_own_lyric_back: p_post_id and p_user_id are required';
  end if;

  if jwt_role <> 'service_role' and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'permission denied: delete_or_shell_own_lyric_back'
      using errcode = '42501';
  end if;

  select author_profile_id, parent_post_id
    into v_owner, v_parent
    from public.posts
    where id = p_post_id
    for update;

  if v_owner is null then
    raise exception 'delete_or_shell_own_lyric_back: post % not found', p_post_id;
  end if;
  if v_owner <> p_user_id then
    raise exception 'delete_or_shell_own_lyric_back: % does not own post %', p_user_id, p_post_id;
  end if;
  if v_parent is null then
    raise exception 'delete_or_shell_own_lyric_back: post % is not a Lyric Back', p_post_id;
  end if;

  select count(*)::int into v_child_count
    from public.posts
    where parent_post_id = p_post_id
      and status not in ('hidden', 'private');

  if v_child_count = 0 then
    select count(*)::int into v_child_count
      from public.posts
      where parent_post_id = p_post_id
        and status not in ('hidden', 'private');
    if v_child_count = 0 then
      perform public.delete_own_post(p_post_id, p_user_id);
      return jsonb_build_object('outcome', 'deleted');
    end if;
  end if;

  update public.posts
  set
    text = '',
    emotion = null,
    song_id = null,
    song_title = null,
    artist_name = null,
    artwork_url = null,
    snippet_start_sec = null,
    snippet_end_sec = null,
    external_listen_url = null,
    legacy_author_label = null,
    content_removed_at = coalesce(content_removed_at, now()),
    updated_at = now()
  where id = p_post_id;

  return jsonb_build_object('outcome', 'shelled');
end;
$$;
