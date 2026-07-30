-- Account settings support: deactivation + message privacy.
-- Run this in the Supabase SQL Editor (or via `supabase db push`), once, on the production project.

-- 1. New columns on profiles -------------------------------------------------

alter table public.profiles
  add column if not exists deactivated_at timestamptz null,
  add column if not exists who_can_message text not null default 'everyone';

alter table public.profiles
  drop constraint if exists profiles_who_can_message_check;

alter table public.profiles
  add constraint profiles_who_can_message_check
  check (who_can_message in ('everyone', 'followers', 'no_one'));

-- 2. Message-privacy enforcement ---------------------------------------------
-- security definer so it can read profiles regardless of the caller's own
-- read access to that row (a stranger sending a first message won't
-- necessarily pass the profiles SELECT policy for the recipient).

create or replace function public.can_message(p_sender uuid, p_recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when pr.who_can_message = 'no_one' then false
    when pr.who_can_message = 'everyone' then true
    when pr.who_can_message = 'followers' then exists (
      select 1 from public.follows
      where follower_id = p_sender
        and followee_id = p_recipient
        and status = 'accepted'
    )
    else true
  end
  from public.profiles pr
  where pr.id = p_recipient
    and pr.deactivated_at is null;
$$;

drop policy if exists "user sends as self" on public.messages;

create policy "user sends as self and recipient allows it"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and public.can_message(auth.uid(), recipient_id)
);

-- 3. Hide deactivated profiles from everyone but the owner -------------------

drop policy if exists "owner and accepted followers read full profile" on public.profiles;

create policy "owner and accepted followers read full profile"
on public.profiles
for select
using (
  auth.uid() = id
  or (
    deactivated_at is null
    and (
      is_private = false
      or exists (
        select 1 from public.follows
        where follower_id = auth.uid()
          and followee_id = profiles.id
          and status = 'accepted'
      )
    )
  )
);

-- NOTE: if `public_profiles` is a view or table that also surfaces profile
-- rows independently of the policy above, it needs the same
-- `deactivated_at is null` filter added directly to its definition — check
-- that separately, this migration does not touch it.