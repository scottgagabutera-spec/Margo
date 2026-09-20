-- DM-sent Moments: status 'sent' — not on feed/Discover/search.
-- Visible to author + message participants only (via margo-moment:{postId} in messages.body).
-- Distinct from 'private' (owner-only Keep Private shelf).

create or replace function public.can_read_sent_moment(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    where position(('margo-moment:' || p_post_id::text) in m.body) > 0
      and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  );
$$;

revoke all on function public.can_read_sent_moment(uuid) from public;
grant execute on function public.can_read_sent_moment(uuid) to authenticated;

drop policy if exists "participants read sent posts" on public.posts;
create policy "participants read sent posts" on public.posts
  for select
  using (
    status = 'sent'
    and public.can_read_sent_moment(id)
  );

drop policy if exists "read lines of visible posts" on public.post_lines;
create policy "read lines of visible posts" on public.post_lines
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.status = 'active'
          or p.author_profile_id = auth.uid()
          or (p.status = 'sent' and public.can_read_sent_moment(p.id))
        )
    )
  );

comment on column public.posts.status is
  'active=public feed; private=owner-only shelf; sent=DM-only (participants); hidden=moderation';
