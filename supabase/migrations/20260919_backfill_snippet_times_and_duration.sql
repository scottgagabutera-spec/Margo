-- Backfill null snippet_start_sec / snippet_end_sec on catalog posts where we
-- can confidently tie post text to a lyric_lines row. Also fills songs.duration_sec
-- from max(lyric_lines.end_sec) when still null.
--
-- Flagged (not guessed):
--   Formidable — French quote; matcher returns null by design until re-posted/edited.
--   A Thousand Lives — compose cap may truncate; verify after apply.
--   A cheer for my friend — no posts found at migration time.
--   Leave the lights on — posts already had snippet times when audited.

-- Nawala — "Gone, everything gone" → line 73 (209–211s)
update public.posts p
set
  snippet_start_sec = 209,
  snippet_end_sec = 211
from public.songs s
where p.song_id = s.id
  and p.snippet_start_sec is null
  and s.title ilike '%nawala%'
  and p.text ilike '%gone%everything%gone%';

-- Dribble — second catalog post (ec83e233…) → 76.199–81.32s
update public.posts
set
  snippet_start_sec = 76.199,
  snippet_end_sec = 81.32
where snippet_start_sec is null
  and id::text like 'ec83e233%';

-- Remaining catalog posts with null snippet times: join best lyric line by
-- normalized containment (line contains post text, prefer longest line).
with candidates as (
  select
    p.id as post_id,
    ll.start_sec,
    ll.end_sec,
    row_number() over (
      partition by p.id
      order by length(ll.text) desc, ll.line_index asc
    ) as rn
  from public.posts p
  join public.lyric_lines ll on ll.song_id = p.song_id
  where p.snippet_start_sec is null
    and p.song_id is not null
    and p.text is not null
    and length(trim(p.text)) > 0
    and lower(regexp_replace(ll.text, '[.,!?;:"''\u2018\u2019\u201c\u201d]', '', 'g'))
        like '%' || lower(regexp_replace(p.text, '[.,!?;:"''\u2018\u2019\u201c\u201d]', '', 'g')) || '%'
)
update public.posts p
set
  snippet_start_sec = c.start_sec,
  snippet_end_sec = c.end_sec
from candidates c
where p.id = c.post_id
  and c.rn = 1;

-- Song duration from lyric tail when missing
update public.songs s
set duration_sec = sub.max_end
from (
  select song_id, max(end_sec) as max_end
  from public.lyric_lines
  group by song_id
) sub
where s.id = sub.song_id
  and s.duration_sec is null
  and sub.max_end is not null;
