-- Welcome series (in-app tips from Margo). Repo only until approved.

alter table public.notifications
  add column if not exists data jsonb not null default '{}'::jsonb;

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
    'artist_submitted',
    'artist_approved',
    'artist_rejected',
    'lyric_back',
    'memory_reply',
    'memory_lyric_reply',
    'system_welcome'
  ));

create unique index if not exists notifications_system_welcome_one_per_kind
  on public.notifications (recipient_id, (data ->> 'kind'))
  where type = 'system_welcome' and (data ->> 'kind') is not null;
