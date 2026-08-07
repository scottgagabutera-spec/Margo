-- posts.song_id / queue_items.song_id — correct ON DELETE behavior when a song is removed.
--
-- posts.song_id → ON DELETE SET NULL
--   The lyric/post is the user's expression; losing a catalog song must not
--   erase the post. Metadata columns (song_title, artist_name, artwork_url)
--   may remain as historical text; song_id simply clears.
--
-- queue_items.song_id → ON DELETE CASCADE
--   A queue row that points at a missing song is meaningless; drop the item.

do $$
declare
  c_posts text;
  c_qi text;
begin
  select tc.constraint_name into c_posts
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'posts'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'song_id'
  limit 1;

  if c_posts is not null then
    execute format('alter table public.posts drop constraint %I', c_posts);
  end if;

  -- Ensure column can be null for SET NULL (no-op if already nullable)
  alter table public.posts alter column song_id drop not null;

  alter table public.posts
    add constraint posts_song_id_fkey
    foreign key (song_id) references public.songs(id)
    on delete set null;

  if to_regclass('public.queue_items') is not null then
    select tc.constraint_name into c_qi
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'queue_items'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'song_id'
    limit 1;

    if c_qi is not null then
      execute format('alter table public.queue_items drop constraint %I', c_qi);
    end if;

    alter table public.queue_items
      add constraint queue_items_song_id_fkey
      foreign key (song_id) references public.songs(id)
      on delete cascade;
  end if;
end $$;
