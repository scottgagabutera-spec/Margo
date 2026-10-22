-- Align EXECUTE grants with repo intent: authenticated-only RPCs must not be callable by anon.
-- Does not change function bodies. Apply only after review (prod currently grants anon via PUBLIC drift).

revoke execute on function public.is_admin() from anon;
revoke execute on function public.touch_last_seen() from anon;
revoke execute on function public.profiles_for_my_notification_actors(uuid[]) from anon;
revoke execute on function public.can_read_sent_moment(uuid) from anon;
revoke execute on function public.can_reference_story_post(uuid, uuid) from anon;
revoke execute on function public.is_active_promote_artist(uuid) from public;
revoke execute on function public.is_active_promote_artist(uuid) from anon;

-- Re-affirm intended grants (idempotent)
grant execute on function public.is_admin() to authenticated;
grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.profiles_for_my_notification_actors(uuid[]) to authenticated;
grant execute on function public.can_read_sent_moment(uuid) to authenticated;
grant execute on function public.can_reference_story_post(uuid, uuid) to authenticated;
grant execute on function public.is_active_promote_artist(uuid) to authenticated, service_role;
