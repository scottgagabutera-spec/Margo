-- Expose is_private on follow list rows (list still uses security definer; counts stay total).

create or replace function public.list_profile_follows(
  p_username text,
  p_kind text,
  p_limit int default 60,
  p_offset int default 0
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_viewer uuid := auth.uid();
  v_can_see_profile boolean;
  v_items json;
  v_total int;
  v_lim int := greatest(1, least(coalesce(p_limit, 60), 80));
  v_off int := greatest(0, coalesce(p_offset, 0));
begin
  if p_kind not in ('followers', 'following') then
    return json_build_object('ok', false, 'error', 'invalid_kind');
  end if;

  select * into v_profile
  from public.profiles
  where username = nullif(trim(p_username), '')
    and deactivated_at is null
  limit 1;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  v_can_see_profile :=
    v_viewer is not distinct from v_profile.id
    or v_profile.is_private = false
    or (
      v_viewer is not null
      and exists (
        select 1 from public.follows
        where follower_id = v_viewer
          and followee_id = v_profile.id
          and status = 'accepted'
      )
    );

  if not v_can_see_profile then
    return json_build_object('ok', false, 'error', 'private_profile');
  end if;

  if v_profile.follow_lists_private and v_viewer is distinct from v_profile.id then
    return json_build_object(
      'ok', false,
      'error', 'lists_private',
      'username', v_profile.username,
      'displayName', v_profile.display_name
    );
  end if;

  if p_kind = 'followers' then
    select count(*)::int into v_total
    from public.follows
    where followee_id = v_profile.id and status = 'accepted';

    select coalesce(json_agg(row_to_json(x)), '[]'::json) into v_items
    from (
      select
        p.id,
        p.username,
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.is_artist as "isArtist",
        p.is_private as "isPrivate"
      from public.follows f
      join public.profiles p on p.id = f.follower_id
      where f.followee_id = v_profile.id
        and f.status = 'accepted'
        and p.deactivated_at is null
      order by f.created_at desc
      limit v_lim
      offset v_off
    ) x;
  else
    select count(*)::int into v_total
    from public.follows
    where follower_id = v_profile.id and status = 'accepted';

    select coalesce(json_agg(row_to_json(x)), '[]'::json) into v_items
    from (
      select
        p.id,
        p.username,
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.is_artist as "isArtist",
        p.is_private as "isPrivate"
      from public.follows f
      join public.profiles p on p.id = f.followee_id
      where f.follower_id = v_profile.id
        and f.status = 'accepted'
        and p.deactivated_at is null
      order by f.created_at desc
      limit v_lim
      offset v_off
    ) x;
  end if;

  return json_build_object(
    'ok', true,
    'kind', p_kind,
    'username', v_profile.username,
    'displayName', v_profile.display_name,
    'listsPrivate', v_profile.follow_lists_private,
    'isOwner', v_viewer is not distinct from v_profile.id,
    'total', v_total,
    'items', v_items
  );
end;
$$;
