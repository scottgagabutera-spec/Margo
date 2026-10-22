-- Artist consent: allow opting catalog songs out of the feed Shorts shelf (default on).

alter table public.songs
  add column if not exists shorts_enabled boolean not null default true;

comment on column public.songs.shorts_enabled is
  'When false, song is excluded from the feed Shorts shelf. Default true for existing songs.';
