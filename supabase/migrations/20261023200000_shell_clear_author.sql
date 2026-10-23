-- Shell rows: no author link in DB (anon cannot map author_profile_id).
-- Normal posts keep posts_author_or_legacy_check; shells exempt via content_removed_at.

alter table public.posts
  drop constraint if exists posts_author_or_legacy_check;

alter table public.posts
  add constraint posts_author_or_legacy_check
  check (
    content_removed_at is not null
    or author_profile_id is not null
    or legacy_author_label is not null
  );

comment on constraint posts_author_or_legacy_check on public.posts is
  'Every active post needs author_profile_id or legacy_author_label; shelled Lyric Backs (content_removed_at) may have neither.';

-- Backfill any shells created before author was cleared (production count was 0 at ship).
update public.posts
set author_profile_id = null
where content_removed_at is not null
  and author_profile_id is not null;

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
  v_removed timestamptz;
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

  select author_profile_id, parent_post_id, content_removed_at
    into v_owner, v_parent, v_removed
    from public.posts
    where id = p_post_id
    for update;

  if not found then
    raise exception 'delete_or_shell_own_lyric_back: post % not found', p_post_id;
  end if;

  if v_removed is not null and v_owner is null then
    return jsonb_build_object('outcome', 'shelled');
  end if;

  if v_owner is null then
    raise exception 'delete_or_shell_own_lyric_back: post % has no owner', p_post_id;
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
    author_profile_id = null,
    content_removed_at = coalesce(content_removed_at, now()),
    updated_at = now()
  where id = p_post_id;

  return jsonb_build_object('outcome', 'shelled');
end;
$$;
