# Margo — Music & Feed Redesign: Status & Plan
> **STATUS (Aug 2026): PARTIALLY SUPERSEDED.** Feed earned badges and Discover rename shipped. Treat `/music` references as historical; live discovery is `/discover`. Verify Save Queue and related items in code before planning from this doc.


*Living doc, in the style of the other MARGO_*.md docs. Paste this into a new
conversation to bring Claude up to speed instantly.*

Last updated: Aug 2, 2026

---

## 1. Shipped — merged to `main`

**Feed redesign** — collapsed the permanent vibe-pill row and New/Trending/Top
tab row into earned, per-post tags.

- Vibe badge on each post is tappable — filters the feed to that vibe
  (single-select; tapping the active vibe again clears it).
- New/Trending/Top badges appear only on posts that actually qualify (recency
  window / top-N by score) — never permanent chrome.
- Dismissible "Filtering: X" / sort chip shows above the feed only when a
  filter or non-default sort is active.
- **"Margo Original" badge removed entirely** — now that trymargo is
  positioned as one artist among the roster rather than the platform itself,
  a permanent badge on its posts read as platform-favoritism. Its posts earn
  New/Trending/Top like any other artist's.
- **Known open question (not yet resolved):** rank badges (New/Trending/Top)
  currently drive *sort* (reorder, nothing hidden) while the vibe badge
  drives *filter* (narrows the list). Both are still presented as visually
  identical tappable pills, which doesn't make the distinction legible to a
  user. Long-term fix sketched but not built: separate sort into its own
  small persistent single-select control (not a pill matching filter styling),
  keep vibe as the on-post filter trigger. See §2 for the researched
  rationale (filtering narrows, sorting reorders — giants keep these as two
  distinct controls, not one).

Branch `feed-redesign-earned-badges` → merged `main` (`69acccb`).

**Nav overlap fix** — root cause was `MargoNav`'s `position: fixed`, which
removes it from document flow entirely; nothing below it reserved space,
so any page without matching top padding overlapped the nav from first
paint (not just on scroll).

- `MargoNav` now measures its own real rendered height via `ResizeObserver`
  and publishes it as `--nav-height` on `document.documentElement`, so
  every consuming page pulls the *actual* number instead of a guessed pixel
  offset.
- `app/feed/page.tsx`'s page-wrapper `paddingTop` and sticky-search `top`
  both reference `var(--nav-height, 72px)` — the `72px` fallback keeps the
  page correct even if rendered before `MargoNav`'s effect has run, or in
  isolation before dependent branches are merged (this exact scenario broke
  the Vercel preview mid-build and was the fix for it).
- **Not yet applied elsewhere:** `/apply-artist`'s header overlap (known bug
  #3 below) and Studio's hardcoded `100px` padding are both the same root
  cause and could be swapped to `var(--nav-height, 72px)` in a follow-up
  pass — not done yet, just now trivial to do consistently.

Branch `fix-nav-height-overlap` → merged `main` (`72cf1a4`), merged **before**
the feed branch per dependency order.

Both merges verified together post-merge: `npx tsc --noEmit` and
`npm run build` clean on `main` with both changes combined (not just each
branch in isolation).

---

## 2. Shipped — awaiting PR merge

**"Save Queue" feature** — lets a listener persist the audio engine's current
queue as a durable Supabase playlist.

- `lib/queues.ts` (new) — `saveCurrentQueueAsPlaylist(title, isPublic)`.
  Resolves each queue item's `(song_id, line_index)` to a real
  `lyric_lines.id` via one batched lookup (the engine's `LyricMomentQueueItem`
  carries `lineIndex`, an integer, but `queue_items` references
  `lyric_lines.id`, a uuid — this was the one real design gap found while
  building). Writes to `queues` then `queue_items`; rolls back the queue row
  if item insert fails.
- `components/save-queue-button.tsx` (new) — pill button matching existing
  style/auth-gate conventions, saving/saved states.
- `app/music/page.tsx` (updated) — `SaveQueueButton` wired into the
  focused-lyric-moment view next to "Post to Feed," titled dynamically
  (`'My Mix'` or `'{VIBE} Mix'` based on active vibe filter).

**Status:** `npx tsc --noEmit` clean, `npm run build` clean (all 32 routes),
committed (`c260407`) and pushed to branch `feat/save-queue`. **PR still not
merged to `main`** — oldest open item, otherwise unchanged since last update.
PR link: `github.com/scottgagabutera-spec/Margo/pull/new/feat/save-queue`

**Schema already live in Supabase** (confirmed via SQL Editor + RLS check):
`queues` and `queue_items` tables, 4 RLS policies (owner writes own
queues/items, public reads public queues + items of visible queues),
indexes, Realtime — all verified end-to-end before Save Queue was built.

---

## 3. Researched — informs future filter/sort work

Deep-dive on how established platforms structure filtering vs. sorting,
prompted by the feed redesign's badge-ambiguity issue above:

- **Filtering narrows a list to only what matches; sorting reorders the full
  list without hiding anything.** Sorting alone never produces zero results,
  which is precisely why it's the lower-risk control for people to use.
- Strong interfaces keep the two as **separate, visually distinct controls**
  that work together — not one blurred into the other. Applying this to
  Margo: vibe should stay a single-select *filter* (distinct primary
  categories shouldn't be multi-selectable), while New/Trending/Top should
  become a *sort* — a small persistent single-select toggle near search,
  not a tappable pill styled identically to the filter trigger.
- Removable filter/sort chips showing the applied criteria (already partly
  built via the "Filtering: X" chip) are standard — worth splitting into two
  chip types once sort is broken out, so it's visually clear which chip
  clears a filter vs. a sort.

Not yet implemented — flagged for whenever the Feed's sort/filter split gets
picked back up, or as a shared pattern to apply when Music's earned-tag
system (§4) gets built, so both surfaces are consistent from the start.

---

## 4. Designed — not yet built

### Music page redesign
- **Deep search** — currently `.filter()` over an in-memory array, matching
  only title/artist. Needs Postgres full-text search or trigram matching
  (`pg_trgm`) across `songs` AND `lyric_lines` — searching by a remembered
  lyric phrase and landing on that exact moment is the differentiator,
  not a nice-to-have.
- **Connected/auto-advancing snippet playback** — browsing the grid = tap
  each snippet manually. Once someone commits (taps into a card, or picks a
  vibe), it becomes a continuous auto-advancing queue via the existing
  `setQueue()` infrastructure — like a mix, not a jukebox.
- **Earned New/Trending/Top tags** — small tags shown only on songs that
  actually qualify (recency / engagement velocity / resonate count), tappable
  to filter. Should follow the sort-vs-filter split from §3 rather than
  repeating Feed's original ambiguity.
- **Mobile restructure** (not just reflow):
  - Discovery board → one swipeable card, not a 2-col grid of 6
  - Featured song → compact horizontal strip, not a full 4:3 hero
  - "More Songs" → scannable list (thumbnail + title/artist + inline play),
    not a grid
  - Vibe pills stay pinned at top (already correct)
- **Artist-name links everywhere** — song cards, featured hero, and the
  focused-moment view should all link the artist name to
  `/artist/[username]`. Currently plain text.
- A rough mobile mockup of this combined layout was built and approved in
  chat (search bar → vibe pills → single swipeable discovery card → earned
  tag badges → featured strip → catalog list).

### Search improvements (Feed)
- `@username` prefix support designed (early-return before the existing
  substring match, additive only — not built yet): typing `@handle` switches
  to an author-only exact match instead of blending into the general OR
  search across text/song/artist/emotion/username.

### Scaling fixes for `/music` (matters once catalog grows past a handful)
- **Server-side random sampling** — `allMoments` currently loops every
  song's lyric lines into one in-memory JS array client-side, shuffled in
  JS. Fine at ~10 songs, becomes a multi-MB payload at hundreds. Needs a
  server-side random sample (`ORDER BY random() LIMIT 6` per vibe, or a
  periodically-refreshed materialized view).
- **Featured-song rotation** — `featuredSong` is currently one global
  `songs.reduce()` pick by highest `lyricUses`, forever. Winner-take-all —
  undermines the growth loop (new artists never get featured). Needs
  time-windowed rotation and/or a guaranteed "New" slot.
- **Fairness decision (unresolved):** pure merit ranking vs. guaranteed
  rotation slots so artist #24 gets discovered as easily as artist #1 did.
  Leaning toward rotation given the 24-artist plan depends on each new
  artist bringing new listeners.

### Site structure (3-page split)
`/music` currently does three jobs at once (discovery, browsing, artist
representation). Proposed split:
1. **`/music`** — pure discovery/emotional front door (vibe board, featured,
   most-shared-lines). No catalog browsing.
2. **`/artists`** (new) — browsable directory of every artist on Margo.
   Doubles as a recruitment/pitch tool.
3. **`/artist/[username]`** (new) — public artist profile, full catalog +
   stats. The actual retention mechanic ("I follow this person," not just
   "I liked one song"). Would also host "Artist Mix" (see below).

### Song Queue / Lyric Queue / "Mix" system (bigger build, own session)
- **Song Queue** (exists, via `setQueue()`) vs. **Lyric Queue** (sequence of
  `LyricMoment`s — song + specific line + timestamp).
- **"Queue as Lyrics"** — one-tap conversion of any Song Queue into a Lyric
  Queue, picking each song's most-shared or highest-confidence vibe-matched
  line.
- Three Mix mechanics:
  1. **Vibe Mix** (solo) — tap a vibe, get an auto-generated, saveable Lyric
     Queue across the whole catalog, not just what's on-screen.
  2. **Lyric Blend** (two-person, Spotify-Blend-style) — merges two people's
     resonated lyrics into a shared queue, attributed by *line*, not song —
     structurally impossible on Spotify (no lyric-line data model).
  3. **Artist Mix** (promo) — artist-curated queue living permanently on
     their public profile; doubles as day-one promotional content for new
     artists.
- Rough schema sketched (extends the `queues`/`queue_items` pattern already
  live, adds `queue_collaborators` for Blend):
  ```sql
  create table public.queues (
    id uuid primary key default gen_random_uuid(),
    owner_profile_id uuid references public.profiles(id),
    type text not null check (type in ('song', 'lyric')),
    kind text not null default 'manual'
      check (kind in ('manual', 'vibe_mix', 'blend', 'artist_mix')),
    title text not null,
    vibe text,
    is_public boolean not null default false,
    updated_at timestamptz not null default now()
  );

  create table public.queue_items (
    queue_id uuid not null references public.queues(id) on delete cascade,
    position int not null,
    song_id uuid references public.songs(id),
    lyric_line_id uuid references public.lyric_lines(id),
    added_by_profile_id uuid references public.profiles(id),
    primary key (queue_id, position)
  );

  create table public.queue_collaborators (
    queue_id uuid not null references public.queues(id) on delete cascade,
    profile_id uuid not null references public.profiles(id),
    primary key (queue_id, profile_id)
  );
  ```

### Artist identity / verification
- Existing flow confirmed correct: normal user → `/apply-artist` → admin
  approval → `artist_applications.status = 'approved'` trigger flips
  `profiles.is_artist = true`. Already live since July 31.
- **Gaps:** no verified-artist badge on public profiles yet; no persistent
  "Studio" nav item for artists (`/studio` currently only reachable by
  direct link — `StudioPage` already gates correctly on `identity?.isArtist`,
  just missing the nav entry point).

### Known bugs (identified, not fixed)
1. Mobile sign-out leaves the user stranded on their own now-signed-out
   profile page — no redirect to `/feed` or `/signin`.
2. Desktop avatar dropdown's `handleSignOut` (in `margo-nav.tsx`) has the
   same missing-redirect bug.
3. `/apply-artist` page header overlaps/hides behind the sticky Margo logo
   bar — missing top padding (Studio page avoids this with a hardcoded
   100px top padding). **Now trivially fixable** via `var(--nav-height, 72px)`
   since that variable exists as of the nav overlap fix above — just not
   applied to this page yet.
4. `hqdefault.jpg` 404s in Feed — the YouTube-thumbnail fallback
   (`post.youtubeMeta?.thumbnail`) requests a thumbnail that doesn't exist
   for some posts. Spotted in DevTools during the nav-overlap debugging pass,
   not yet fixed.

### Smaller open decisions
- Rename "Apply as an Artist" → "Margo for Artists"? Undecided.
- Reposition the profile page's account-actions row (Account settings /
  Apply as an artist / Sign out) higher up — currently sits after the full
  lyrics list, becomes unreachable as post history grows. Confirmed this is
  NOT legacy dead code — it's the deliberate current design (the earlier
  `MobileAccountMenu.tsx` sheet pattern was intentionally abandoned in favor
  of it) — so the fix is repositioning, not reintroducing the old pattern.

---

## 5. Suggested order

1. **Merge the `feat/save-queue` PR** — done and tested, just sitting idle.
   Oldest open item; nothing blocks it.
2. **Feed sort/filter split** — apply the §3 research to Feed itself: break
   New/Trending/Top out into a real sort control, separate from the vibe
   filter pill. Small, contained, resolves the ambiguity flagged in §1.
3. **`var(--nav-height, 72px)` cleanup pass** — apply to `/apply-artist` and
   Studio now that the variable exists; trivial once started.
4. **Music redesign** — bigger scope (search + mobile restructure + tags +
   connected playback), applying the sort/filter split from the start this
   time. Do after #2 proves the pattern out on Feed.
5. **Artist directory + artist profile pages** — unblocks the 24-artist
   growth narrative.
6. **Scaling fixes** (server-side sampling, featured rotation) — timed to
   when the catalog actually starts growing past a handful of songs.
7. **Song Queue / Lyric Queue / Mix system** — the biggest build, warrants
   its own dedicated session once the above ships.