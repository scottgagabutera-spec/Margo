# Margo stats and ranking

This is the source of truth for **what a number means**, **what does not count**, **where it appears**, and **whether it feeds a rank badge**.

Verified in code (August 2026). Discover Trending/Top previously stamped the first 8 songs in the loaded list even at **zero** plays — on a small catalog that looked like “everything is trending.” That is fixed: zero engagement never gets Trending; zero lyric-uses never gets Top; Discover home shows at most **3** of each; the full song grid at most **5**.

---

## Rank badges (labels, not raw counts)

### Feed — New / Trending / Top

Computed **client-side** on the posts currently in the Feed buffer (`app/feed/page.tsx`). Not a database leaderboard. Not global all-time.

**Costly score (Feed badges):**  
`(resonates × 4) + (lyric backs × 5) + (replays × 6)`

Views are impressions (not plays) and **do not** unlock Trending/Top. Song plays are karaoke-only and **not** on posts.

There are no last-N-hour counters. Trending velocity is `costly / (ageHours + 2)^1.4`.

| Badge | Qualifies when | Sort if you tap the badge |
|---|---|---|
| **New** | Posted within **24 hours**, and did **not** earn Trending or Top. Every such post (no top-N). | Recency (`created_at`, or replay time for injected replay cards) |
| **Trending** | Costly **≥ 80**, **2 of 3** kinds (resonates ≥ 8, lyric backs ≥ 4, replays ≥ 6), then top **3** by velocity. Can apply in the first 24h. | Same velocity formula |
| **Top** | Costly **≥ 200**, **all 3** kinds, age **≥ 24h**, then top **3** by lifetime costly. | Lifetime costly |

Badges are mutually exclusive (Top > Trending > New). Compact **replay** cards do not show these pills.

**Does not qualify:** hidden/private/blocked posts (not in the list); posts below the floors / missing kinds; posts still sitting in the “new lyrics” buffer until the user flushes it. Empty is better than a fake badge.

**Shown:** Feed post cards only (`components/post-card.tsx`, feed variant).

### Discover songs — Trending / Top

Different formula from Feed. Shared helper: `lib/catalog-rank.ts`.

**Song engagement:** `plays + (song resonates × 3)`

| Badge | Qualifies when | Cap |
|---|---|---|
| **Trending** | `plays + 3 × song resonates ≥ 80`, then highest | 3 on Discover home row; 5 on `/discover/songs` |
| **Top** | `lyric_uses ≥ 25`, then highest lyric uses | Same caps |
| **New** | Not used on songs (no release-date sort yet) | — |

If both would apply, the card shows **Top** (not both).

**Shown:** Discover Songs row; `/discover/songs` grid. Not on Moments/Resonance cards.

---

## Counts

### Song plays (streams)

**Increments when:** full karaoke (`playFull` / song page), playback position reaches the threshold: **30 seconds**, or **50% of duration** if the track is under 60 seconds. Inserts `song_plays (song_id, session_id)`. Trigger recounts `song_stats.plays`.

**Does not count:** snippet / Moment / Mixtape / Feed preview audio; pausing before the threshold; the same browser session again (`margoSessionId` in localStorage, PK forever); SSR/`blocked-session` ids.

**Shown:** Discover song subtitles; Studio tiles and totals; artist profile discography (“N plays”); search/Meilisearch song docs.

**Ranks:** Discover **Trending** (and sort). **Not** Feed badges.

### Post views

**Increments when:** ~**50% of the post card** is visible (`IntersectionObserver`). RPC `increment_post_view`. Dedupe: `sessionStorage` key `viewed_{postId}` (this tab/session only).

**Does not count:** a second view in the same tab; there is **no** durable per-user or per-device id in git for this RPC (a new tab can count again). No dwell-time requirement.

**Shown:** **not** on the card. Not used for Feed badges.

**Ranks:** **none.** Views are impressions; they do not unlock Feed badges.

### Post resonates

**Increments when:** signed-in user taps Resonate. Unique `(post_id, actor_id)`. Toggle off deletes the row; count follows the table.

**Does not count:** signed-out taps (auth gate); a second resonate by the same user; **song** resonates (separate table).

**Shown:** badge on Feed/profile/thread post cards.

**Ranks:** Feed Trending/Top (weight **4**).

### Song resonates

**Increments when:** user resonates a **song** (catalog/karaoke actions). Unique `(song_id, actor_id)`. `song_stats.resonate_count` via trigger.

**Does not count:** resonating a lyric **post**.

**Shown:** Studio; artist profile discography totals; Discover engagement formula.

**Ranks:** Discover Trending (`× 3`). **Not** Feed.

### Lyric Backs (echoes)

**Increments when:** someone posts a Lyric Back (`posts.parent_post_id`). `post_stats.echo_count` tracks **active** children (hidden replies are dropped from the count).

**Does not count:** resonating a reply (that’s the reply’s own resonates); private/hidden children.

**Shown:** “Lyric Back” badge on post cards; thread pages.

**Ranks:** Feed Trending/Top (weight **5**).

### Replays

**Increments when:** signed-in user taps Replay. One row per `(post_id, replayer_id)`; changing the quote updates the row, it does **not** add a second replay.

**Does not count:** a second replay of the same post by the same user; anonymous users.

**Shown:** Replay badge on Feed cards; profile Replays tab.

**Ranks:** Feed Trending/Top (weight **6**, unique per user). Replay time can also lift a **replay card** in the New **sort** order; the inner card does not get New/Trending/Top pills.

### Lyric uses

**Increments when:** a post is created with `song_id` set (compose / lyric-back linking a catalog song). `song_stats.lyric_uses`.

**Does not count:** karaoke plays; posts with no `song_id`.

**Shown:** Discover song meta (“N lyric uses”).

**Ranks:** Discover **Top** songs.

### Followers / following

**Increments when:** a follow is **accepted** (`follows.status = 'accepted'`). Private accounts: pending does not count until accept.

**Does not count:** pending requests; unfollows (row gone).

**Shown:** profile header. Not used in Trending/Top.

### Studio / artist aggregates

Sum of that artist’s `song_stats.plays` and `resonate_count` for their live songs. Same play/resonate rules as above. Shown on Studio and the profile discography line. Not a separate increment path.

### Card exports

A row in `card_exports` after a PNG download. **Not** shown as a public stat. **Not** in any rank formula.

### Hub / notifications / messages badges

Unread notification and message **dots** are inbox unread counts, not engagement. They do not feed Trending/Top/New.

---

## What to say if asked

- **“How do you decide Trending on the Feed?”** — Among posts in the current Feed with a real mix of resonates, Lyric Backs, and replays (not impressions), the three with the highest costly engagement divided by a recency penalty. New is “posted in the last day” and has not earned Trending/Top.
- **“How do you decide Trending on Discover?”** — Among songs with `plays + 3 × song resonates ≥ 80` (plays are qualified full listens), the highest that score, capped so a small catalog cannot badge every cover. Top songs need at least 25 lyric uses.
- **“What is a stream?”** — A full-song listen past 30 seconds (or half the track if it’s under a minute), once per device session. Snippets never count.
- **Feed Trending and Discover Trending are not the same number.**
