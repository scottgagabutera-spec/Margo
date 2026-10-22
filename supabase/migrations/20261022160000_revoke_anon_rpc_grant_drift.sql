-- Align EXECUTE grants with repo intent: client-callable RPCs stay authenticated-only.
-- can_read_sent_moment is NOT revoked here — RLS policies need anon EXECUTE (see 20261022174500).

revoke execute on function public.is_admin() from anon;
revoke execute on function public.touch_last_seen() from anon;
revoke execute on function public.profiles_for_my_notification_actors(uuid[]) from anon;
revoke execute on function public.can_reference_story_post(uuid, uuid) from anon;
revoke execute on function public.is_active_promote_artist(uuid) from public;
revoke execute on function public.is_active_promote_artist(uuid) from anon;

-- Re-affirm intended grants (idempotent)
grant execute on function public.is_admin() to authenticated;
grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.profiles_for_my_notification_actors(uuid[]) to authenticated;
-- can_read_sent_moment: granted in 20261022174500 (anon + authenticated for RLS)
grant execute on function public.can_reference_story_post(uuid, uuid) to authenticated;
grant execute on function public.is_active_promote_artist(uuid) to authenticated, service_role;
