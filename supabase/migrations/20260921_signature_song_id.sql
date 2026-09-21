-- Optional catalog song attached to a profile signature lyric (playable).

alter table public.profiles
  add column if not exists signature_song_id uuid references public.songs(id) on delete set null;

comment on column public.profiles.signature_song_id is
  'When set, the signature lyric is tied to a live catalog song and can play on the profile.';

create index if not exists profiles_signature_song_id_idx
  on public.profiles (signature_song_id)
  where signature_song_id is not null;
