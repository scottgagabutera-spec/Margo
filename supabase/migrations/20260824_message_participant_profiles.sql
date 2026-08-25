-- Message participants can read each other's basic profile fields.
-- Without this, a recipient opening a request from a private-profile sender
-- sees "Unknown" and /messages/unknown fails to load the thread because
-- username lookup returns no row under the existing profiles SELECT policy.

drop policy if exists "message participants read partner profiles" on public.profiles;

create policy "message participants read partner profiles"
on public.profiles
for select
using (
  deactivated_at is null
  and exists (
    select 1
    from public.messages m
    where (
      m.sender_id = auth.uid() and m.recipient_id = profiles.id
    ) or (
      m.recipient_id = auth.uid() and m.sender_id = profiles.id
    )
  )
);
