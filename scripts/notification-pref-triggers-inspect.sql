-- Run in Supabase SQL Editor to inspect production message-notification triggers.
-- Paste results back before codifying notify_on_message in a migration.

-- 1) All triggers on public.messages
select tgname, pg_get_triggerdef(oid) as trigger_def
from pg_trigger
where tgrelid = 'public.messages'::regclass
  and not tgisinternal
order by tgname;

-- 2) Functions whose names suggest message notifications
select p.proname, pg_get_functiondef(p.oid) as function_def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%notify%message%'
    or p.proname ilike '%message%notify%'
  )
order by p.proname;

-- 3) Recent message-type notifications (sanity check that prod creates them)
select id, recipient_id, actor_id, type, message_id, created_at
from public.notifications
where type = 'message'
order by created_at desc
limit 5;
