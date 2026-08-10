-- Notification actor identity for recipients.
-- Profiles RLS ("owner and accepted followers...") blocks embedding private
-- actors on notification rows, so the UI shows "Someone" / "??" and follow
-- links fall back to /feed. This RPC returns only public-facing identity
-- fields for actors that appear on the caller's own notifications.

create or replace function public.profiles_for_my_notification_actors(p_actor_ids uuid[])
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url
  from public.profiles p
  where p.id = any (p_actor_ids)
    and p.deactivated_at is null
    and exists (
      select 1
      from public.notifications n
      where n.recipient_id = auth.uid()
        and n.actor_id = p.id
    );
$$;

revoke all on function public.profiles_for_my_notification_actors(uuid[]) from public;
grant execute on function public.profiles_for_my_notification_actors(uuid[]) to authenticated;

comment on function public.profiles_for_my_notification_actors(uuid[]) is
  'Security-definer: notification recipients may read username/display_name/avatar_url for actors on their own notification rows only.';
