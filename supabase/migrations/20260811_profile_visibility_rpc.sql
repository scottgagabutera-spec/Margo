-- Distinguish missing username vs private/inaccessible profile for empty states.
-- Profiles RLS correctly hides private rows from non-followers, so the profile
-- page cannot tell those cases apart from SELECT alone. This RPC returns only
-- existence + privacy flag for a username - no display name, avatar, bio, etc.

create or replace function public.profile_visibility_for_username(p_username text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select json_build_object(
        'exists', true,
        'is_private', p.is_private
      )
      from public.profiles p
      where p.username = nullif(trim(p_username), '')
        and p.deactivated_at is null
      limit 1
    ),
    json_build_object(
      'exists', false,
      'is_private', false
    )
  );
$$;

revoke all on function public.profile_visibility_for_username(text) from public;
grant execute on function public.profile_visibility_for_username(text) to anon, authenticated;

comment on function public.profile_visibility_for_username(text) is
  'Security-definer: returns only {exists, is_private} for a username so clients can show an honest empty state when RLS blocks the profile row.';
