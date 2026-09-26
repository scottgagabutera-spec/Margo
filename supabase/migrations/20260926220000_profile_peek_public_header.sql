-- Public profile header for private accounts (bio + counts visible; posts still RLS-gated).

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
          'signatureLyric', p.signature_lyric,
          'signatureSong', p.signature_song,
          'signatureArtist', p.signature_artist,
          'signatureSongId', p.signature_song_id,
          'artistLinks', coalesce(p.artist_links, '{}'::jsonb)
        ),
        'followerCount', greatest(0, coalesce(p.followers_count, 0)),
        'followingCount', greatest(0, coalesce(p.following_count, 0))
      )
      from public.profiles p
      where p.username = nullif(trim(p_username), '')
        and p.deactivated_at is null
      limit 1
    ),
    json_build_object('ok', false, 'error', 'not_found')
  );
$$;

revoke all on function public.profile_peek_for_username(text) from public;
grant execute on function public.profile_peek_for_username(text) to anon, authenticated;

comment on function public.profile_peek_for_username(text) is
  'Security-definer profile card (no posts). Used when RLS hides a private account row from the viewer.';
