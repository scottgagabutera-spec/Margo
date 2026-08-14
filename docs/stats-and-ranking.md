# Margo stats and ranking

This is the source of truth for **what a number means**, **what does not count**, **where it appears**, and **whether it feeds a rank badge**.

Verified in code (August 2026). Discover Trending/Top previously stamped the first 8 songs in the loaded list even at **zero** plays — on a small catalog that looked like “everything is trending.” That is fixed: zero engagement never gets Trending; zero lyric-uses never gets Top; Discover home shows at most **3** of each; the full song grid at most **5**.

---

## Rank badges (labels, not raw counts)

### Feed — New / Trending / Top

Computed **client-side** on the posts currently in the Feed buffer (`app/feed/page.tsx`). Not a database leaderboard. Not global all-time.

**Engagement score (Feed only):**  
`views + (resonates × 4) + (lyric backs × 5)`  
Replays and song plays are **not** in this score.

| Badge | Qualifies when | Sort if you tap the badge |
|---|---|---|
| **New** | Post `created_at` is within **24 hours**. Every such post gets the badge (no top-N). | Recency (`created_at`, or replay time for injected replay cards) |
| **Trending** | Engagement **> 0**, then top **5** by `engage / (ageHours + 2)^1.4` | Same formula |
| **Top** | Engagement **> 0**, then top **5** by lifetime `engage` (no time decay) | Same formula |

A post can wear more than one badge. Compact **replay** cards do not show these pills.

**Does not qualify:** hidden/private/blocked posts (not in the list); zero-engage posts for Trending/Top; posts still sitting in the “new lyrics” buffer until the user flushes it.

**Shown:** Feed post cards only (`components/post-card.tsx`, feed variant).

### Discover songs — Trending / Top

Different formula from Feed. Shared helper: `lib/catalog-rank.ts`.

**Song engagement:** `plays + (song resonates × 3)`

| Badge | Qualifies when | Cap |
|---|---|---|
| **Trending** | Song engagement **> 0**, then highest engagement | 3 on Discover home row; 5 on `/discover/songs` |
| **Top** | `lyric_uses` **> 0**, then highest lyric uses | Same caps |
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

**Shown:** **not** on the card. Used only inside Feed engagement.

**Ranks:** Feed Trending/Top (`views` weight **1**).

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

**Ranks:** **none**. Replay time can lift a **replay card** in the New **sort** order, but the inner card does not get New/Trending/Top pills.

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

- **“How do you decide Trending on the Feed?”** — Among posts in the current Feed with at least one view, resonate, or lyric-back, the five with the highest engagement divided by a recency penalty. New is simply “posted in the last day.”
- **“How do you decide Trending on Discover?”** — Among songs with at least one qualified full listen or song-resonate, the highest `plays + 3 × song resonates`, capped so a small catalog cannot badge every cover.
- **“What is a stream?”** — A full-song listen past 30 seconds (or half the track if it’s under a minute), once per device session. Snippets never count.
- **Feed Trending and Discover Trending are not the same number.**
