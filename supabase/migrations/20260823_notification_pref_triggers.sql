-- Respect profiles.settings.notifications for trigger-created notifications.
-- Keys mirror app/settings/page.tsx: newFollower, newMessage.
--
-- Fail-open when settings are missing or the key is unset (pref !== false),
-- matching lib/notification-prefs.ts isNotificationAllowed().
--
-- Message trigger: NOT present in tracked migrations. See PR notes — apply the
-- message function update only after production pg_get_functiondef confirms it.

-- ── Preference helper ───────────────────────────────────────────────────────

create or replace function public.notification_pref_allows(p_recipient uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (settings->'notifications'->>p_key)::boolean
      from public.profiles
      where id = p_recipient
    ),
    true
  ) is not false;
$$;

comment on function public.notification_pref_allows(uuid, text) is
  'Returns false only when profiles.settings.notifications[p_key] is explicitly false.';

-- ── Follow request (pending) ────────────────────────────────────────────────

create or replace function public.notify_on_follow_request()
 returns trigger
 language plpgsql
as $function$
begin
  if new.status = 'pending' and new.follower_id <> new.followee_id then
    if public.notification_pref_allows(new.followee_id, 'newFollower') then
      insert into notifications (recipient_id, actor_id, type)
      values (new.followee_id, new.follower_id, 'follow_request');
    end if;
  end if;
  return new;
end;
$function$;

-- ── Follow accepted ─────────────────────────────────────────────────────────

create or replace function public.notify_on_follow()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  if new.status = 'accepted' and new.follower_id <> new.followee_id then
    if (tg_op = 'INSERT')
       or (tg_op = 'UPDATE' and old.status is distinct from 'accepted') then
      if public.notification_pref_allows(new.followee_id, 'newFollower') then
        insert into notifications (recipient_id, actor_id, type)
        values (new.followee_id, new.follower_id, 'follow');
      end if;
    end if;
  end if;
  return new;
end;
$function$;
