-- RLS on posts / post_lines (role public) references can_read_sent_moment() for sent rows.
-- Anon must retain EXECUTE so active-post reads succeed; the function returns false when
-- auth.uid() is null (no DM participant), so sent moments do not leak.

grant execute on function public.can_read_sent_moment(uuid) to anon;
grant execute on function public.can_read_sent_moment(uuid) to authenticated;
