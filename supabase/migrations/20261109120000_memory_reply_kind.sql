-- Memory replies: text comment vs lyric-back (repo only — do not apply until approved).

alter table public.memory_lyric_backs
  add column if not exists kind text not null default 'lyric';

alter table public.memory_lyric_backs
  drop constraint if exists memory_lyric_backs_kind_check;

alter table public.memory_lyric_backs
  add constraint memory_lyric_backs_kind_check
  check (kind in ('text', 'lyric'));

comment on column public.memory_lyric_backs.kind is
  'text = plain reply in the author''s words; lyric = song-linked lyric back.';

-- Owner alerts for memory engagement (applied with this migration).
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'message',
    'resonate',
    'follow',
    'follow_request',
    'warned',
    'frozen',
    'removed',
    'restored',
    'artist_approved',
    'artist_rejected',
    'lyric_back',
    'memory_reply',
    'memory_lyric_reply'
  ));
