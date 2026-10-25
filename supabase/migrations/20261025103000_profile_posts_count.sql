-- Denormalized public lyric count (top-level active posts) for profile stats.

alter table public.profiles
  add column if not exists posts_count integer not null default 0;

comment on column public.profiles.posts_count is
  'Count of public top-level posts (status=active, parent_post_id null) by this profile.';

update public.profiles p
set posts_count = coalesce(
  (
    select count(*)::integer
    from public.posts po
    where po.author_profile_id = p.id
      and po.status = 'active'
      and po.parent_post_id is null
  ),
  0
);

create or replace function public.sync_profile_posts_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_public boolean;
  new_public boolean;
begin
  old_public := tg_op in ('UPDATE', 'DELETE')
    and old.status = 'active'
    and old.parent_post_id is null;
  new_public := tg_op in ('INSERT', 'UPDATE')
    and new.status = 'active'
    and new.parent_post_id is null;

  if tg_op = 'DELETE' then
    if old_public then
      update public.profiles
      set posts_count = greatest(posts_count - 1, 0)
      where id = old.author_profile_id;
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new_public then
      update public.profiles
      set posts_count = posts_count + 1
      where id = new.author_profile_id;
    end if;
    return new;
  end if;

  if old_public and not new_public then
    update public.profiles
    set posts_count = greatest(posts_count - 1, 0)
    where id = old.author_profile_id;
  elsif not old_public and new_public then
    update public.profiles
    set posts_count = posts_count + 1
    where id = new.author_profile_id;
  elsif old_public and new_public and old.author_profile_id is distinct from new.author_profile_id then
    update public.profiles
    set posts_count = greatest(posts_count - 1, 0)
    where id = old.author_profile_id;
    update public.profiles
    set posts_count = posts_count + 1
    where id = new.author_profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_sync_profile_posts_count on public.posts;
create trigger posts_sync_profile_posts_count
  after insert or update of status, parent_post_id, author_profile_id or delete
  on public.posts
  for each row
  execute function public.sync_profile_posts_count();

create or replace function public.profile_peek_for_username(p_username text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select json_build_object(
        'ok', true,
        'profile', json_build_object(
          'id', p.id,
          'username', p.username,
          'displayName', p.display_name,
          'bio', p.bio,
          'avatarUrl', p.avatar_url,
          'coverUrl', p.cover_url,
          'isPrivate', p.is_private,
          'isArtist', p.is_artist,
          'artistStatus', p.artist_status,
          'followListsPrivate', coalesce(p.follow_lists_private, false),
          'whoCanMessage', p.who_can_message,
          'signatureLyric', p.signature_lyric,
          'signatureSong', p.signature_song,
          'signatureArtist', p.signature_artist,
          'signatureSongId', p.signature_song_id,
          'artistLinks', coalesce(p.artist_links, '{}'::jsonb)
        ),
        'followerCount', greatest(0, coalesce(p.followers_count, 0)),
        'followingCount', greatest(0, coalesce(p.following_count, 0)),
        'postsCount', greatest(0, coalesce(p.posts_count, 0)),
        'viewerFollowStatus', (
          select f.status
          from public.follows f
          where f.follower_id = auth.uid()
            and f.followee_id = p.id
          limit 1
        )
      )
      from public.profiles p
      where p.username = nullif(trim(p_username), '')
        and p.deactivated_at is null
      limit 1
    ),
    json_build_object('ok', false, 'error', 'not_found')
  );
$$;
