-- Keep post_stats.echo_count aligned with visible Lyric Backs when a
-- child post's status (or parent_post_id) changes — e.g. admin Hide/Show.
--
-- Context: on_post_reply_change() (insert/delete) already bumps the
-- counter when status = 'active'. Soft-hide via status update never
-- fired that path, so the Feed "N Lyric Back" badge would drift. This
-- closes the gap at the database layer.
--
-- Visible reply = status = 'active' — same predicate as
-- on_post_reply_change(), not an exclusion list. Equivalent to
-- useEchoes/RLS "not hidden/private" only while status is confined to
-- {'active','hidden','private'}; equality matches insert/delete exactly.
--
-- Apply in the Supabase SQL Editor (repo tracks migrations; apply order
-- matches dashboard-then-git as elsewhere in this project).

-- ── Recompute helper (parent uuid → recount active children) ──

create or replace function public.recompute_post_echo_count(p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_parent_id is null then
    return;
  end if;

  select count(*)::int into v_count
  from public.posts
  where parent_post_id = p_parent_id
    and status = 'active';

  update public.post_stats
  set echo_count = v_count
  where post_id = p_parent_id;

  if not found then
    insert into public.post_stats (post_id, views, resonate_count, echo_count)
    values (p_parent_id, 0, 0, v_count);
  end if;
end;
$$;

-- ── Trigger fn: after status / parent change on a posts row ──

create or replace function public.on_post_reply_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recompute old parent if this was (or still is) a lyric back
  if old.parent_post_id is not null then
    perform public.recompute_post_echo_count(old.parent_post_id);
  end if;

  -- If reparented to a different post, recompute the new parent too
  if new.parent_post_id is not null
     and new.parent_post_id is distinct from old.parent_post_id then
    perform public.recompute_post_echo_count(new.parent_post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists post_reply_status_update on public.posts;
create trigger post_reply_status_update
  after update of status, parent_post_id on public.posts
  for each row
  when (
    old.status is distinct from new.status
    or old.parent_post_id is distinct from new.parent_post_id
  )
  execute function public.on_post_reply_visibility_change();

-- ── One-time recompute (safe no-op when already correct) ──
-- Prod check 2026-08-06: child rows 22 active / 4 hidden / 0 private;
-- echo_count vs status='active' count matched with drift 0.

update public.post_stats ps
set echo_count = coalesce((
  select count(*)::int
  from public.posts p
  where p.parent_post_id = ps.post_id
    and p.status = 'active'
), 0);

-- Sanity (run manually after apply):
--   select trigger_name, event_manipulation, action_timing, action_statement
--   from information_schema.triggers
--   where event_object_table = 'posts' and trigger_name like 'post_reply%';
--
--   -- After hiding one active lyric back in admin, its parent's echo_count
--   -- should drop by 1 without any app-side counter write.
