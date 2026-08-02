-- Adds updated_at to posts, auto-maintained by a trigger. This is NOT
-- surfaced to users anywhere — per the edit-lyrics design decision
-- (see conversation, Aug 2, 2026), Margo follows the Instagram/Facebook
-- pattern (silent, unlimited, no visible "Edited" label or history) not
-- the X pattern (time-boxed, visible version history). The reasoning:
-- on Margo, editing a lyric is correcting a transcription against an
-- immutable ground truth (the real song/timestamp), not rewriting a
-- claim — categorically closer to fixing a caption typo than rewriting
-- a tweet's meaning. updated_at exists purely for internal debugging/
-- support, never rendered in the UI.

alter table public.posts
  add column if not exists updated_at timestamptz;

create or replace function public.on_post_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists post_updated_at on public.posts;
create trigger post_updated_at
  before update on public.posts
  for each row
  execute function public.on_post_updated();