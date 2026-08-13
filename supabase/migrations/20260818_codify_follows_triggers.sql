-- Codify live follows triggers/functions into tracked migrations.
-- Source: prod pg_get_functiondef + pg_get_triggerdef (2026-08-13).
-- Pure repo=prod snapshot — do NOT change behavior here.
--
-- Backlog (separate PR, not this file):
--   1) Dedupe BEFORE INSERT: set_follow_status vs auto_accept_public_follow
--   2) Make notify_on_follow_request SECURITY DEFINER (parity with notify_on_follow)

-- ── Functions (exact live bodies) ───────────────────────────────────────────

create or replace function public.set_follow_status()
 returns trigger
 language plpgsql
as $function$
declare
  target_private boolean;
begin
  select is_private into target_private from profiles where id = new.followee_id;
  new.status := case when target_private then 'pending' else 'accepted' end;
  return new;
end;
$function$;

create or replace function public.auto_accept_public_follow()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  if (select is_private from profiles where id = new.followee_id) = false then
    new.status := 'accepted';
  end if;
  return new;
end;
$function$;

create or replace function public.notify_on_follow_request()
 returns trigger
 language plpgsql
as $function$
begin
  if new.status = 'pending' and new.follower_id <> new.followee_id then
    insert into notifications (recipient_id, actor_id, type)
    values (new.followee_id, new.follower_id, 'follow_request');
  end if;
  return new;
end;
$function$;

create or replace function public.notify_on_follow()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  if new.status = 'accepted' and new.follower_id <> new.followee_id then
    if (tg_op = 'INSERT')
       or (tg_op = 'UPDATE' and old.status is distinct from 'accepted') then
      insert into notifications (recipient_id, actor_id, type)
      values (new.followee_id, new.follower_id, 'follow');
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.sync_follow_counts()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  if (tg_op = 'INSERT') then
    if new.status = 'accepted' then
      update profiles set following_count = following_count + 1 where id = new.follower_id;
      update profiles set followers_count = followers_count + 1 where id = new.followee_id;
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    if old.status <> 'accepted' and new.status = 'accepted' then
      update profiles set following_count = following_count + 1 where id = new.follower_id;
      update profiles set followers_count = followers_count + 1 where id = new.followee_id;
    elsif old.status = 'accepted' and new.status <> 'accepted' then
      update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
      update profiles set followers_count = greatest(followers_count - 1, 0) where id = old.followee_id;
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE') then
    if old.status = 'accepted' then
      update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
      update profiles set followers_count = greatest(followers_count - 1, 0) where id = old.followee_id;
    end if;
    return old;
  end if;

  return null;
end;
$function$;

-- ── Triggers (drop + recreate with live names / timing) ─────────────────────

drop trigger if exists before_follow_insert on public.follows;
create trigger before_follow_insert
  before insert on public.follows
  for each row execute function public.set_follow_status();

drop trigger if exists trg_auto_accept_public_follow on public.follows;
create trigger trg_auto_accept_public_follow
  before insert on public.follows
  for each row execute function public.auto_accept_public_follow();

drop trigger if exists on_follow_request on public.follows;
create trigger on_follow_request
  after insert on public.follows
  for each row execute function public.notify_on_follow_request();

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
  after insert or update on public.follows
  for each row execute function public.notify_on_follow();

drop trigger if exists trg_sync_follow_counts on public.follows;
create trigger trg_sync_follow_counts
  after insert or delete or update on public.follows
  for each row execute function public.sync_follow_counts();
