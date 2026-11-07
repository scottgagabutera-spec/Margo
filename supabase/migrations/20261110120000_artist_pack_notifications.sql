-- Artist pack PR 1 (repo only until approved):
-- artist_submitted notifications, one pending application per profile, stage name on approve.

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
    'memory_lyric_reply'
  ));

create unique index if not exists artist_applications_one_pending_per_profile
  on public.artist_applications (profile_id)
  where status = 'pending';

create or replace function public.on_artist_application_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update public.profiles
    set
      is_artist = true,
      display_name = coalesce(nullif(trim(new.display_artist_name), ''), display_name)
    where id = new.profile_id;

    new.reviewed_at = now();
  end if;
  return new;
end;
$$;
