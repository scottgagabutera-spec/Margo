-- Preserve direct external listen destinations (e.g. Apple Music trackViewUrl)
-- on posts created from Stage/Compose search when no catalog song_id is linked.

alter table public.posts
  add column if not exists external_listen_url text;

comment on column public.posts.external_listen_url is
  'Direct external listen URL from search provenance (Apple trackViewUrl, Genius page). Used by resolveMomentListen when song_id is null.';
