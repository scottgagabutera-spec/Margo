# Margo research report — 10 Nov 2026

Read-only snapshot of production Supabase (`axtvisukibxnhnyoffke`), targeted app reads, and Supabase security/performance advisors. Row counts are `pg_stat_user_tables.n_live_tup` estimates unless noted.

---

## Section 1: Hub (max 25 lines)

Hub opens as a **panel** from the nav Hub grid (`components/hub-menu.tsx`); tiles are **full-page links** (close Hub on navigate). **Stage** → `/` landing; **Messages** → `/messages` inbox; **Notifications** → `/notifications` list; **Library** → `/library` (mobile-only page). Back = system back; panel also has close/back chevron.

**Loading:** Pending state on tile link; destination lists use root **Messaging** / **Notifications** providers (spinners there). **Data on Hub open:** none extra — badges read memory already fetched at sign-in: **messages** unread sum (`hooks/useMessaging.tsx`); **notifications** unread except `type=message` (`hooks/useHubSurfaces.ts`, ~30-row cap). **Gold nav dot:** any badge &gt; 0 (`hubHasActivity`).

**Visuals:** 56px rounded icon tile, 22px gold stroke icons, 18px gold count badge, Geist 12px labels (`globals.css` `.margo-hub-tile*`).

**Visibility:** Four shipped tiles for all; Studio/Promote unshipped, artist-only when enabled. Signed-out: lock on account tiles. **`isArtist`:** `profiles.is_artist` on identity.

**Mentions card:** Settings → `ArtistFavoriteMentionsCard` → `/api/artist/mention-stats` (catalog `favorite_mention_count` tops).

**Listener stats without new tables:** `post_stats`, profile counters, memory counts, notification feed; not “who favorited me” unless scan favorites.

**Fifth tile:** one config row + stats route; **0** Hub requests, **1** aggregate API on stats page open.

---

## Section 2: Feed tabs (max 12 lines)

**Feed** (`components/feed-content-tab-bar.tsx` on `app/feed/page.tsx`): **Lyrics** — scroll of lyric posts (text, emotion, linked song/YouTube metadata, artwork URLs). **Memories** — memory tiles (title, story, mood, cover/photos via R2 keys). **Shorts** — vertical clips from `song_curated_moments` + song media (or “coming soon” empty). **Echoes** — weekly Q&A block (`/api/echoes/feed-block`, `echo_answers`). Tabs switch in-place on Feed; data from Meilisearch/Supabase APIs per sector, not one table.

**Profile** (`app/profile/[username]/page.tsx`, classes `margo-profile-content-tab*`): **Lyrics** / **Private** — author’s posts; **Memories** — grid or timeline; **Reposts** — `post_replays`; **Lyric Backs** — reply posts via `useAuthorLyricBacks`. Same post card language as feed where applicable.

**Tab chrome:** Feed uses **text-only** tabs (no icons): 0.8125rem semibold Geist, muted → active text + 2px gold underline (`globals.css`). Profile tabs smaller (0.72rem, gold active underline). Bottom nav icons: SVG `viewBox 0 0 24 24`, default **18px**, **strokeWidth 1.5**, `var(--text)` (Hub trigger uses **20px** `HubGridIcon` with 1.5 stroke). Custom tab icons should match that stroke and gold active state, not the feed tab row (text only today).

---

## Section 3: Storage (max 14 lines)

**Supabase Storage:** `avatars` (live uploads → `profiles.avatar_url`); `song-audio` / `song-artwork` (legacy purge paths only). **R2 (`margo`):** studio audio/artwork, memory photos/video (`memory_photos.r2_key`, posters), catalog artwork, promote/Shorts staging MP4. **Posts:** text + YouTube/Genius URLs on `posts` rows; stories reference `posts.id`.

**Uploads:** Avatars browser→Supabase; songs/memories/promote browser→presigned R2 (API signs only). **No resized Supabase transforms** — full image/audio/video URLs.

**Egress (3–6 MB/day Storage):** Likely **avatar** re-downloads in feeds/lists (cache-bust query), plus any legacy **song** objects still in Supabase buckets—not Postgres egress.

---

## Section 4: Database health (max 35 lines)

**Scale (public, ~est. rows):** `lyric_lines` 815, `lyric_line_vibes` 809, `queue_items` 354, `catalog_artists` 357, `posts` 175, `post_resonates` 179, `post_stats` 161, `promote_queue` 91, `notifications` 64, `profiles` 20, `messages` 18, `songs` 17 — most social graph tables still small.

**Counts storage:** **Counter columns + triggers:** `post_stats` (resonate, echo, replay, views), `profiles` (followers, following, posts), `memories` (resonate, lyric_back), `song_stats`, `catalog_* .favorite_mention_count`. **PK prevents duplicates:** `post_resonates (post_id, actor_id)`, `post_replays` unique `(post_id, replayer_id)`, `memory_resonates`, `follows`.

**RLS:** Almost all app tables RLS on with policies. **RLS off (ERROR):** `bak_profile_favorite_artists_20261110`, `bak_catalog_artists_20261110`. **RLS on, zero policies:** `api_rate_limits`, `promote_*_pending`, `promote_staging_cleanup_failures`, `suggest_lyric_back_*` (likely service-role-only — confirm intent).

**Integrity notes:** `public_profiles` view flagged **SECURITY DEFINER**. Many **SECURITY DEFINER** functions callable by `anon`/`authenticated` (triggers + RPCs including new `replace_profile_favorite_*`); favorite RPCs should enforce `p_profile_id = auth.uid()`. **26 unindexed foreign keys** (performance advisor). **Realtime:** `messages`, `notifications`, `posts`, `post_resonates`, `post_replays`, `post_stats`, `songs`, `song_stats`, `stories` on `supabase_realtime`.

**Fast growth risk:** `post_resonates`, `notifications`, `messages`, `song_plays`, `queue_items`, lyric vibe tables, promote queue. **Heavy reads:** notification list + actor RPC; feed queries via search/indexed APIs; selecting full `posts.text` / `settings` jsonb on wide selects.

**Security advisor summary:** 2× RLS disabled (backups); 1× security definer view; 6× RLS no policy; 10× mutable `search_path`; 30+ WARN on callable SECURITY DEFINER; leaked-password protection off.

**Backup tables:** Same RLS-off ERROR as above; no extra lints beyond public exposure risk — treat as admin-only or enable RLS deny-all.

**Areas (short):** **Resonates/reposts** — join tables + `post_stats`. **Follows** — composite PK, count triggers. **Memories** — owner RLS, photos/songs child tables. **Favorites** — profile positions + catalog mention triggers. **Notifications/messages** — recipient-scoped RLS, realtime.

---

## Section 5: Top improvements (max 15 lines)

1. **RLS on backup tables** — Benefit: close public exposure. Risk: unused today. Migration yes. One PR.
2. **FK indexes (notifications, replays, …)** — Benefit: faster inbox/profile. Risk: low size today. Migration yes. One PR.
3. **Revoke anon on trigger SD functions** — Benefit: less API surface. Risk: if wrongly called from client. Migration yes. One PR.
4. **Policies for RLS-on/no-policy tables** — Benefit: explicit intent. Risk: worker breakage. Migration yes.
5. **My-stats RPC + Hub tile** — Benefit: listener insights. Risk: wrong aggregates. Migration optional. One PR.
6. **Avatar cache headers** — Benefit: cut Storage egress. Risk: stale photo. No migration.
7. **Review realtime publication list** — Benefit: less fanout. Risk: dropped live UI. Migration yes.
8. **Leaked-password protection** — Benefit: auth hardening. Risk: minimal. Dashboard only.

---

## Appendix

### A. Public tables and estimated row counts

| table_name | est_rows |
|------------|----------|
| api_rate_limits | 190 |
| artist_applications | 6 |
| artist_promote_settings | 1 |
| artist_social_connections | 2 |
| bak_catalog_artists_20261110 | 357 |
| bak_profile_favorite_artists_20261110 | 5 |
| card_exports | 0 |
| catalog_albums | 0 |
| catalog_artists | 357 |
| catalog_songs | 1 |
| echo_answers | 1 |
| echo_question_sets | 1 |
| echo_questions | 1 |
| follows | 5 |
| liked_songs | 6 |
| listen_later_songs | 2 |
| lyric_line_vibes | 809 |
| lyric_lines | 815 |
| memories | 1 |
| memory_card_exports | 0 |
| memory_lyric_backs | 0 |
| memory_photos | 0 |
| memory_resonates | 2 |
| memory_songs | 1 |
| messages | 18 |
| notifications | 64 |
| post_lines | 20 |
| post_replays | 2 |
| post_reports | 6 |
| post_resonates | 179 |
| post_stats | 161 |
| posts | 175 |
| profile_favorite_albums | 0 |
| profile_favorite_artists | 4 |
| profile_favorite_songs | 1 |
| profiles | 20 |
| promote_facebook_page_pending | 0 |
| promote_queue | 91 |
| promote_queue_targets | 159 |
| promote_staging_cleanup_failures | 0 |
| promote_tiktok_oauth_pending | 1 |
| queue_items | 354 |
| queues | 1 |
| site_featured_exchange | 1 |
| song_curated_moments | 2 |
| song_plays | 99 |
| song_resonates | 2 |
| song_stats | 17 |
| songs | 17 |
| stories | 3 |
| story_views | 0 |
| suggest_lyric_back_cache | 34 |
| suggest_lyric_back_daily_spend | 2 |

### B. Storage buckets (application usage)

| Bucket / backend | Used for |
|------------------|----------|
| Supabase `avatars` | Profile photos; browser direct upload |
| Supabase `song-audio` | Legacy per-user paths; deletion/purge only in code |
| Supabase `song-artwork` | Legacy; deletion/purge only in code |
| Cloudflare R2 `margo` (default) | Song audio/artwork, memory media, catalog artwork, promote staging MP4 |

### C. Realtime publications (selected)

`supabase_realtime`: `messages`, `notifications`, `posts`, `post_resonates`, `post_replays`, `post_stats`, `songs`, `song_stats`, `stories`. Partitioned `messages_YYYY_MM_DD` under `supabase_realtime_messages_publication`.

### D. Recommended SQL (illustrative — review before apply)

**Backup table lock-down:**

```sql
alter table public.bak_profile_favorite_artists_20261110 enable row level security;
alter table public.bak_catalog_artists_20261110 enable row level security;
-- Optional: create policy ... for service_role only, or revoke API access via privileges.
```

**Example FK indexes (from performance advisor pattern):**

```sql
create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_id, created_at desc);

create index if not exists idx_post_replays_post_id
  on public.post_replays (post_id);

create index if not exists idx_card_exports_post_id
  on public.card_exports (post_id);

create index if not exists idx_catalog_artists_margo_profile_id
  on public.catalog_artists (margo_profile_id);
```

**Listener stats RPC sketch (no new tables):**

```sql
-- create or replace function public.my_content_stats()
-- returns jsonb language sql security invoker stable as $$
--   select jsonb_build_object(
--     'followers', p.followers_count,
--     'posts', p.posts_count,
--     'resonates', coalesce(sum(ps.resonate_count), 0),
--     'replays', coalesce(sum(ps.replay_count), 0),
--     'views', coalesce(sum(ps.views), 0)
--   )
--   from public.profiles p
--   left join public.posts po on po.author_profile_id = p.id
--   left join public.post_stats ps on ps.post_id = po.id
--   where p.id = auth.uid()
--   group by p.id, p.followers_count, p.posts_count;
-- $$;
```

### E. Advisor queries used

```sql
-- RLS summary
select c.relname, c.relrowsecurity,
  (select count(*) from pg_policies p where p.tablename=c.relname and p.schemaname='public') as policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by 1;

-- Row estimates
select relname, n_live_tup::bigint from pg_stat_user_tables where schemaname='public' order by 1;

-- Realtime
select pubname, tablename from pg_publication_tables where pubname like 'supabase%' order by 2;
```

### F. Key source files

- Hub: `lib/hub/tiles.ts`, `components/hub-menu.tsx`, `hooks/useHubSurfaces.ts`
- Feed tabs: `components/feed-content-tab-bar.tsx`, `app/feed/page.tsx`
- Profile tabs: `app/profile/[username]/page.tsx`
- Mentions: `components/artist-favorite-mentions-card.tsx`, `lib/artist-mention-stats-server.ts`
- Uploads: `lib/profile-avatar-upload.ts`, `lib/memory/client-media-upload.ts`, `lib/r2/catalog-upload-presign.ts`
