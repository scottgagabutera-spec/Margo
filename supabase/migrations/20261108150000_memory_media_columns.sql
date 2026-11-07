-- Memory photos → rich media (photos + short video). DO NOT APPLY until Scott approves.
-- After apply: memory create API may persist media_type, poster_r2_key, duration_sec, mime_type.

alter table public.memory_photos
  add column if not exists media_type text not null default 'image',
  add column if not exists poster_r2_key text,
  add column if not exists duration_sec real,
  add column if not exists mime_type text;

comment on column public.memory_photos.media_type is 'image | video';
comment on column public.memory_photos.poster_r2_key is 'R2 key for video poster (webp)';
comment on column public.memory_photos.duration_sec is 'Video duration seconds';
