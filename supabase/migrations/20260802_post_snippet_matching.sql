-- Adds exact snippet timing to posts, closing the gap where the feed's
-- SnippetIconButton had to re-guess which lyric_lines row a post's text
-- came from on every render (fuzzy substring match, silently falling
-- back to lyrics[0] — i.e. starting the whole song — when nothing
-- matched). These columns are populated once, at post-creation or
-- edit-time, by a shared matching function (lib/lyric-match.ts) instead
-- of guessed at playback time.
--
-- Nullable by design: posts with no linked song, or where the matcher
-- couldn't find a confident match, simply won't render a snippet button
-- at all — no forced wrong-fallback behavior.

alter table public.posts
  add column if not exists snippet_start_sec numeric,
  add column if not exists snippet_end_sec numeric;