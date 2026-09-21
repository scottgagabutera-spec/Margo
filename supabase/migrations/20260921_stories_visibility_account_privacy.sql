-- Stories inherit each account's existing is_private audience (same as posts).
-- Sign-in is required to view any story, public or private. No new story privacy flag.

create or replace function public.can_view_story(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.stories s
      join public.profiles p on p.id = s.author_profile_id
      where s.id = p_story_id
        and s.expires_at > now()
        and (
          s.author_profile_id = auth.uid()
          or (
            public.can_reference_story_post(s.post_id, s.author_profile_id)
            and (
              coalesce(p.is_private, false) = false
              or exists (
                select 1
                from public.follows f
                where f.follower_id = auth.uid()
                  and f.followee_id = s.author_profile_id
                  and f.status = 'accepted'
              )
            )
          )
        )
    );
$$;

revoke all on function public.can_view_story(uuid) from public;
revoke all on function public.can_view_story(uuid) from anon;
grant execute on function public.can_view_story(uuid) to authenticated;

comment on function public.can_view_story(uuid) is
  'Signed-in viewers only. Public accounts: any signed-in user. Private accounts: author or accepted follower.';
