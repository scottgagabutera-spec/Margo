-- Allow lyric_back on notifications.type (client insert from lyric-back page).
-- Matches NotificationType in hooks/useNotifications.tsx.
-- Constraint was previously widened for follow_request / artist statuses outside
-- some tracked migrations; this recreates the full allowed set + lyric_back.

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
    'lyric_back'
  ));
