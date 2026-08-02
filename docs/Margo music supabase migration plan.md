# Margo — Music & Artist Catalog: Firebase → Supabase Migration Plan
*Draft v1 — July 2026 — Living document — last updated August 2, 2026 (Phase 6 app code shipped and verified live; snippet matching and edit-lyric features added — see Progress Log)*

**Purpose:** move songs, lyric lines/vibes, and song engagement fully onto Supabase, connected directly to `profiles` — no separate `artists` table, no Tier 1/2/3 licensing distinction. An artist is a `profiles` row with `is_artist = true`. This is the next phase after the identity migration (`MARGO_SUPABASE_MIGRATION_PLAN.md`), and it supersedes the Tier-based sections of `MARGO_TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md` (Section 5) and `MARGO_RIGHTS_AND_DISCOVERY_PLAN.md` (Section 1.3) — those documents' *audio engine* and *legal-foundation* content still stands; their *artist-tier* content is replaced by this doc.

**Standards:** GIANTS WAY · MODERN · PREMIUM · UNIQUE FOR MARGO · LONG TERM · USER EXPERIENCE · CONSISTENCY · VERY LOGICAL · MOBILE FIRST · APP READY

---

## Progress Log

**July 31, 2026 — Phase 1 and Phase 2 schema shipped and verified live.**

Two branches merged to `main`, in order:

1. **`feat/artist-approval-supabase`** (merged `8cdba62`) —
   - New file `components/artist-applications-tab.tsx`: Supabase-backed replacement for the old Firebase `artists-tab.tsx`. Two sections — **Applications** (approve/reject pending `artist_applications`, filterable by pending/approved/rejected/all) and **Moderation** (warn/freeze/remove already-approved artists, ported from the old `ArtistsTab`'s working logic, filterable by active/warned/frozen/removed/all).
   - `app/admin/page.tsx` updated: import and render swapped from `ArtistsTab` → `ArtistApplicationsTab`. Old `components/artists-tab.tsx` deleted (186 lines, zero remaining call sites confirmed before removal).
   - Applied directly via the Supabase SQL Editor against production, then verified with `information_schema` queries (all confirmed present):
     - `profiles.artist_status` (`text`, not null, default `'active'`), `artist_status_reason` (`text`, nullable), `artist_status_updated_at` (`timestamptz`, nullable) — Section 2B.
     - `artist_application_approved` trigger on `artist_applications`, `BEFORE UPDATE` — Section 2. Confirmed firing correctly: sets `profiles.is_artist = true` and stamps `reviewed_at` when `status` transitions to `'approved'`.
   - Confirmed live at `/admin` → Artists tab: renders correctly, shows "No applications." / clean empty states since the tables start empty (screenshot-verified July 31).

2. **`chore/track-migration-sql`** (merged `3aa758a`) —
   - Ran the full Section 3 schema directly via the Supabase SQL Editor first, then tracked the SQL in git afterward (dashboard-run, then backfilled into version control — not the reverse).
   - Tables created and verified present: `songs`, `lyric_lines`, `lyric_line_vibes`, `song_plays`, `song_resonates`, `song_stats`.
   - All 10 RLS policies verified present via `pg_policies` query (see exact list in Section 3 below).
   - Storage buckets `song-audio` and `song-artwork` created (public read, uid-scoped upload/update).
   - **One addition beyond this doc's original Section 3 text**, made when actually running the migration: a `song_plays` → `song_stats.plays` sync trigger (`on_song_play_change`), mirroring the `song_resonates` → `resonate_count` trigger. The original Section 3 code block only wired up `resonate_count`; without the matching plays trigger, `song_stats.plays` would have sat at 0 forever.
   - Both files now tracked in repo: `supabase/migrations/20260731_artist_approval_trigger.sql`, `supabase/migrations/20260731_songs_and_engagement_schema.sql`.

**What this means for the build order (Section 7 below):** Phase 1 is fully done. Phase 2 is done for schema/RLS/storage — the remaining Phase 2 work (if any is later identified) would only be additive, not a redo.

---

**July 31, 2026 (later) — Phase 5 partially shipped (read-side only); notifications gap closed.**

Two more branches merged to `main`, in order:

3. **`feature/artist-verification`** (merged `29ec9ab`, fast-forward) —
   - `hooks/useSongs.ts` and `hooks/useSong.ts` rewritten from Firebase RTDB to Supabase `select` queries, reading the schema from Section 3 directly (`songs` joined to `song_stats` and `lyric_lines`/`lyric_line_vibes`).
   - `app/music/page.tsx`'s `LyricBoard` now builds discovery moments straight from `song.lyricLines` — no more client-side SRT parsing.
   - `app/music/player/page.tsx` updated to match — real typed `Song` fields, no `(song as any)` casts, no `parseLyrics`/`.lyrics`/`.srt` fallback.
   - `scripts/migrate-songs-to-supabase.mjs` added — one-time migration script, Firebase → Supabase for existing song rows.
   - This branch also shipped the artist verification flow itself: Suno bio-code check, Linktree import, instant-approve, via new `/api/import-linktree`, `/api/submit-artist-application`, `/api/verify-artist-link` routes and `components/artist-application-form.tsx`.
   - Verified: `tsc --noEmit` clean, `npm run build` clean, all routes intact.

4. **`fix/notifications-schema-alignment`** (merged `16baa8f`) —
   - `notifyProfile()` in `artist-applications-tab.tsx` fixed to match the *real* `notifications` table shape (previously guessed — flagged in Section 2B/8).
   - `NotificationType` widened in `hooks/useNotifications.tsx` to support artist-status events.
   - `components/notification-item.tsx` updated to render the new type.
   - Verified: `tsc --noEmit` clean, `npm run build` clean.

---

**August 1, 2026 — Confirmed via direct production query and direct file reads: exactly what Phase 4/5/6 work remains, no hedging.**

Ran `scripts/check-songs-count.mjs` (a one-off script, service-role key, direct `select count`) against production:

```
--- Supabase production row counts ---
songs: 10
lyric_lines: 399
lyric_line_vibes: 379
```

Sample confirms real catalog data — 10 songs, all `status='live'`, artist `Trymargo` (`Formidable`, `A Thousand Lives`, `Mr. Love`, `Hanggang Ngayon`, `Não para`, +5 more).

**This confirms `migrate-songs-to-supabase.mjs` was in fact run against production** — the 399 lyric_lines and 379 vibes are real, not a hypothetical empty table.

Also read the following files directly to confirm (not guess) their current state:

- **`app/api/whisper/route.ts`** — unchanged. Still fetches an audio file, sends it to OpenAI Whisper, and returns a raw `.srt`-format string. **No Postgres writes at all.**
- **`app/api/tag-vibes/route.ts`** — unchanged. Still takes raw SRT text as input, calls GPT to tag lines with vibes, and returns a JSON array of `{id, line, start, end, vibes}`. **No Postgres writes at all.**
- **`hooks/useSharedLines.ts`** — unchanged. Still does a full Firebase `posts` tree scan (`onValue(query(ref(db,'posts'), orderByChild('timestamp')))`) with substring `.includes()` matching on song/artist text to find shared lines.
- **`app/compose/page.tsx`** — unchanged. `handleSelectSong` still does a full Firebase `songs` tree read (`get(ref(db,'songs'))`) with manual `snap.forEach` + `.toLowerCase().trim()` string matching, gated by the old Firebase-era `isLicensed()` from `useApprovedArtists`. New posts still write to Firebase (`push(ref(db,'posts'), post)`), not Supabase.

**What this confirms, precisely:**
- **Phase 5 is done ONLY for the read side that `useSongs`/`useSong` power** — the discovery board and karaoke player, both confirmed reading real Supabase data live.
- **Phase 4 has NOT started, confirmed by reading the actual route files.** This matters more than a routine "not started yet" — it means **all 399 lyric_lines and 379 vibes currently live came entirely from the one-time migration script**, not from any working upload pipeline. If a new song were uploaded through the (not-yet-built) Phase 3 UI today, there is no code path that would populate its lyrics or vibes into Postgres. See Section 8, new item #3.
- **`useSharedLines` (part of Phase 5) has NOT started**, confirmed by reading the hook directly.
- **`compose` song-linking (Phase 6) has NOT started**, confirmed by reading the page directly — including that new posts still go to Firebase, not Supabase, which Section 6 hadn't previously called out explicitly.

---

**August 1, 2026 (later) — Product decision made; admin scope decision made; Phase 4 route rewritten and verified working end-to-end.**

**🟢 Product decision resolved (closes Section 8, item 1):** Artist-uploaded songs go **instant-live**, not admin-reviewed. This matches the standard self-serve creator model (upload → immediately visible, same as posting on any platform) rather than a review queue. Approval happens once, at the artist-application stage (Section 2) — after that, an approved artist publishes directly, same as any other creator platform. Admin's job does not include reviewing individual songs.

**🟢 Admin scope decision made (new, not previously scoped):** `admin/page.tsx`'s current `MusicTab`/`SongForm`/`LicensedTab` will be **retired**, not kept. Reading the actual file confirmed something important: `SongForm` is 100% Firebase — creating or editing a song there has **zero effect on the real Supabase catalog** that `/music` actually reads from (the 10 live songs came entirely from the migration script, never from this admin form). So today, this tab is not just outdated, it's actively misleading — an admin could "save changes" to a song there and nothing would happen to what users actually see.

Going forward, admin is scoped to **people and general oversight, never individual content authoring**:
- Keep: `PostsTab`, `ArtistApplicationsTab` (approve/reject/moderate), `FeaturedTab`, `PagesTab`
- Retire: `MusicTab`, `SongForm`, `LicensedTab`, `useLicensedArtists.ts` (Section 0, Gap #8 — now has a concrete trigger to actually delete it, not just "someday")
- Replace with: a new **Catalog tab** — read-heavy, lists all artists (from `profiles where is_artist=true`) and their songs with play/resonate stats, allows moderation-level actions only (e.g. toggle a song `live`/`hidden`), but has **no upload, no audio/artwork fields, no "Generate SRT" button, no "Save Song" form**. Authoring belongs entirely to the artist-facing upload page (Phase 3), not admin. **Still not built as of Aug 2, 2026** — scoped here, not started. Phase 7 item.

**🟢 Phase 4 rewritten and verified working end-to-end, via isolated test (no admin UI, no real song touched):**

- Rewrote `app/api/tag-vibes/route.ts` to require `songId`, delete any existing `lyric_lines` for that song first (supports re-processing; `lyric_line_vibes` cascade-deletes automatically), insert new `lyric_lines`, then insert `lyric_line_vibes` using the real generated line ids. Returns `{songId, linesWritten, vibesWritten}` instead of raw transcript JSON.
- Uses `getSupabaseAdmin()` from `lib/supabase-admin.ts` (service-role client, bypasses RLS) — correct choice since this route writes on behalf of a user in a server context with no `auth.uid()` available.
- Deliberately left `songs.status` untouched by this route — publishing state stays entirely in Phase 3's upload flow, not buried in the tagging endpoint.
- `app/api/whisper/route.ts` was left unchanged — it already does its one job correctly (audio in, SRT out); no Postgres writes belong there.
- **Test performed:** built `scripts/test-tag-vibes-route.mjs` — creates a throwaway `status='draft'` test song (so it never appears on `/music`), calls the rewritten route against it with fake 3-line SRT text, verifies the actual rows in `lyric_lines`/`lyric_line_vibes`, then deletes the test song (cascade cleanup). Zero risk to the 10 real live songs.
- **Required setup discovered along the way:** `OPENAI_API_KEY` was **never set** in `.env.local` — confirmed via `Get-Content .env.local | Select-String "OPENAI"` (empty result), plus checked Windows env vars and git history for any leaked key (all empty). This means the whisper/tag-vibes pipeline was never actually runnable, even from the old admin `SongForm` — clicking "Generate SRT" or "Tag Vibes" there would have failed with the same missing-key error. A new OpenAI API key was created and added to `.env.local`.
- **Test result — full success:**
  ```
  Route response: { songId: '...', linesWritten: 3, vibesWritten: 2 }
  lyric_lines: 3 rows, correct line_index/text/start_sec/end_sec, including a
    zero-vibe filler line ("Hmm") correctly tagged with no vibes
  lyric_line_vibes: 2 rows, correctly referencing the real generated lyric_lines.id
  Cleanup: test song deleted, cascade removed lines/vibes, zero leftover data
  ```
  This confirms the full round trip works: OpenAI Whisper-style tagging call → Supabase writes → correct id-matching between `lyric_lines` and `lyric_line_vibes` → safe re-processing (delete-then-insert) → cascade cleanup.

**What this means for build order:** Phase 4's actual route logic is now proven correct — the only missing piece is a real caller, since the old admin `SongForm` is being retired rather than extended. The next concrete step is Phase 3: the artist-facing upload page, gated on `identity.isArtist`, instant-live, which will call `/api/whisper` → rewritten `/api/tag-vibes` in sequence against a real Supabase song it creates.

---

**August 1, 2026 (later still) — Phase 3 shipped: self-serve upload UI live, closing the Phase 4 "missing caller" gap.**

5. **`feat/studio-poster-redesign`** (merged) —
   - New artist-facing upload route at `/studio`, gated on `identity.isArtist`, matching the instant-live product decision from earlier this same day.
   - `components/studio/song-upload-form.tsx`: uploads audio/artwork directly to the `song-audio`/`song-artwork` Storage buckets (Section 3), inserts a `songs` row with `status: 'processing'`, then calls `/api/whisper` → the rewritten `/api/tag-vibes` in sequence exactly as scoped, then sets `status: 'live'` on success.
   - This is the "real caller" Section 4/7 flagged as the only missing piece after Phase 4's route was proven correct via isolated test — Phase 3 and Phase 4 are now both closed as a pair.
   - `tsc --noEmit` and `npm run build` both clean at merge time.
   - **Not yet confirmed:** no real artist has uploaded a real song through this flow in production yet — Phase 4's route was only tested via the isolated throwaway-song script, and Phase 3's UI hasn't had an end-to-end production run logged. Worth doing one real upload and confirming `songs`/`lyric_lines`/`lyric_line_vibes` all populate correctly before calling this phase fully verified, not just merged. **Still true as of Aug 2, 2026** — no real production upload has been logged.
   - Two small known issues carried into this merge, not blocking: (1) if the audio or artwork Storage upload itself fails (before the `songs` row is inserted), there's no retry path and the partially-uploaded file isn't cleaned up — a source of storage cruft over time; (2) the upload form's error/success message color uses a raw inline `rgba()` instead of a CSS variable, self-flagged in the component's own comment as a stopgap since no `lib/tokens/emotions.ts` exists yet — small design-system debt (Section 0-style gap), worth a follow-up.

---

**August 1, 2026 (later still) — Posts & Engagement schema (Phase 6) applied and verified live.**

While auditing `compose`, the feed, `useSharedLines`, `usePosts`, and `usePost` by direct file read, confirmed the following were **all still unchanged Firebase RTDB**, none previously fully scoped as one connected surface:
- `usePosts.ts` / `usePost.ts` — full `onValue` listeners on Firebase `posts`/`posts/{id}`, no Supabase involvement at all.
- `compose/page.tsx` — `handleSelectSong` does a full Firebase `songs` tree scan with `.toLowerCase().trim()` matching (confirmed, matches Section 0 Gap #5); `handlePost` still writes new posts via `push(ref(db,'posts'), post)`.
- The feed (`app/(feed)/page.tsx`) — resonates write to `analytics/{postId}/resonates/{actorId}` and `postStats/{postId}/resonateCount`, a **separate, post-level concept** from the already-live `song_resonates`/`song_stats` (Section 3), which are song-level. Views (`postStats/{postId}/views`) and Lyric Back echo counts (`postStats/{postId}/echoCount`) are Firebase-only with no Supabase equivalent.
- **New finding, not previously scoped:** `compose/page.tsx`'s `handlePost` also writes lyric-use counts via Firebase `runTransaction` to `songs/${linkedSongId}/lyricUses` and `songStats/${linkedSongId}/lyricUses` — meaning Supabase's `song_stats.lyric_uses` column (live since Section 3) has had **zero write path** since it was created. Silently stuck at 0 for every song.
- **New finding, not previously scoped:** `Tier1Player` and `SnippetIconButton` (both in the feed) independently re-fetch Firebase `songs/{songId}` and re-parse SRT client-side — a third, still-Firebase SRT parser, duplicating the exact problem Section 0 Gap #7 already fixed once for `useSongs`/`useSong`.
- **New requirement surfaced, not previously scoped:** `Post.replies` and the feed's `LyricBackIcon` (linking to `/lyric-back?postId=...`) confirm "Lyric Back" needs real reply-to-a-post threading — `posts` needs a `parent_post_id`, not just flat rows.

**Decision:** given how entangled these are — a partial migration risks new posts writing to the wrong place or the feed silently failing to show them — Phase 6 is scoped as one connected "Posts & Engagement" migration rather than separate `compose`-only and `feed`-only passes.

**Schema applied directly via the Supabase SQL Editor**, tracked at `supabase/migrations/20260801_posts_and_engagement_schema.sql`, same dashboard-then-git order as Section 3:

- Tables created and verified present via `information_schema.tables`: `posts`, `post_resonates`, `post_stats`.
- All 6 RLS policies verified present via `pg_policies`: `public reads active posts`, `authenticated users insert own posts`, `owner updates own posts`, `owner deletes own posts` (all on `posts`) · `public reads post_stats` (`post_stats`) · `authenticated writes own post_resonate` (`post_resonates`).
- All 5 triggers verified present via `information_schema.triggers`: `post_reply_insert`, `post_reply_delete` (on `posts`, sync `post_stats.echo_count` from Lyric Back replies) · `post_resonate_insert`, `post_resonate_delete` (on `post_resonates`, sync `post_stats.resonate_count`) · `post_song_link_insert` (on `posts`, **closes the `song_stats.lyric_uses` gap** — increments the linked song's `lyric_uses` whenever a post with a real `song_id` is created).
- `increment_post_view(p_post_id uuid)` RPC function also applied — a safe, dedup-free view counter callable via `supabase.rpc('increment_post_view', { p_post_id })`, replacing the Firebase `runTransaction` view-count pattern.

**What this means for build order:** the schema/RLS/triggers layer of Phase 6 landed this day. The app-code layer (migration script, `usePosts`/`usePost`, `compose`, `lyric-back`, the feed, `useSharedLines`) shipped the following day — see the Aug 2, 2026 entries below.

---

**August 1–2, 2026 — Phase 6 app code: fully shipped, verified, and merged. Migration run and confirmed 133/133.**

This is the single largest connected piece of work in this doc's history — six merged branches, one bug found and fixed in production, and two entirely new features (snippet matching, edit-lyric) that weren't originally scoped anywhere in this plan. Documented here as one continuous arc since the branches depended on each other in sequence.

**6. `migrate-posts-to-supabase.mjs`** (one-time script, run directly, not a merged app-code branch) —
- Same pattern as `migrate-songs-to-supabase.mjs`: reads a single local full Firebase root export JSON, no live Firebase connection, no service account credential.
- **Real findings from direct export analysis, not assumptions:**
  - Of 112 top-level Firebase posts, exactly 5 were duplicate standalone copies of nested `echoes` (written twice by `lyric-back.tsx`'s old dual-write pattern — same id, same parent, same content). Deduped: built the full set of nested-echo ids first, skipped any top-level post whose id was in that set, so each is created exactly once via the echo pass with the correct `parent_post_id`.
  - Echo-level `resonates` live nested directly inside the echo object (`echo.resonates`), never at `analytics/{echoId}/resonates` as the first draft of the script assumed — that path never exists in the real data. Would have silently produced zero echo resonates if not caught.
  - Author resolution: only 1 of 112 Firebase posts had a real `authorUid` matching a `profiles.id` directly — confirmed by direct query, not assumed. Everything else predates real Supabase accounts. Decision: no fake profiles minted for legacy content; `posts.author_profile_id` is nullable, legacy content carries a plain-text `legacy_author_label` instead. A check constraint (`posts_author_or_legacy_check`) guarantees every post has one or the other, never neither.
  - Song linking resolves via `songs.firebase_id` (preserved from the old Firebase key), never `songId === songs.id`.
  - Exactly one entry existed under `analytics/{postId}/replies/{replyId}` — a third, structurally different reply shape (`anonName`, `userId`, a raw numeric resonate count instead of an actor-id object) with no relationship to `posts` or `echoes`. Too small a sample (n=1), too structurally different to safely generalize — flagged in the script's log output, not migrated automatically. **Manually inserted afterward** via a one-off SQL statement once its real Supabase parent id was looked up from the migration log's `idMap`.
- **Run result, verified against production via SQL after the fact:**
  ```
  Top-level posts seen: 112
  Deduped (standalone twin of a nested echo): 5
  Echoes migrated: 25
  Real author (profile-linked): 1
  Legacy author (label only): 131
  Unresolved song links: 0
  Unhandled analytics/*/replies (flagged, not auto-migrated): 1 (manually inserted after)
  Errors: 0
  ```
  Post-run verification queries confirmed: 132 rows from the script + 1 manual insert = **133/133 pieces of content accounted for**, split 107 top-level / 26 echo-and-manual, 0 broken author rows (never both null), 0 posts with an unresolved `song_id` that should have had one, `post_stats`/`post_resonates` populated alongside every row.

**7. `fix/lyric-back-nested-threading`** (merged `6f298de`) — the main Phase 6 app-code branch —
- `hooks/usePosts.ts` / `hooks/usePost.ts` rewritten to Supabase `select` queries (joined to `profiles` for author display and `post_stats` for resonate/echo counts), replacing Firebase `onValue` listeners entirely. **Deliberate compatibility choice:** the returned `Post` object keeps the old Firebase-shaped field names (`timestamp`, `knowledge`, `authorUid`, etc.) even though the underlying Supabase columns are named differently — this meant downstream components needed far fewer changes, only the hooks' internal mapping layer changed.
- **Behavior change from the Firebase version:** `usePosts()` now only returns top-level posts (`parent_post_id is null`) by design — replies/echoes have their own real rows now and are structurally excluded from the main feed query rather than fetched-then-filtered client-side.
- `hooks/useEchoes.ts` rewritten to query Supabase `posts` where `parent_post_id` matches, joined to `post_resonates` to rebuild a `Record<actorId, true>` shape matching what the page's optimistic-update logic expected.
- `app/compose/page.tsx`: `handleSelectSong` replaced with a real FK lookup against `songs` (`ilike` on title/artist, `status = 'live'`) — the old Firebase full-tree scan and the `isLicensed()` gate from `useApprovedArtists` are both gone; the FK lookup itself replaces the need for a pre-filter gate. `handlePost` now inserts into Supabase `posts` instead of Firebase `push`. `song_stats.lyric_uses` now increments automatically via the `post_song_link_insert` trigger — the old manual Firebase `runTransaction` calls were removed.
- `app/lyric-back/page.tsx`: `handlePost` now inserts into Supabase `posts` with `parent_post_id` set for replies (or `null` for a fresh top-level Lyric Back) instead of the old flat `posts/{id}/echoes` nesting. `toggleResonate` now writes to `post_resonates` instead of Firebase `analytics/{echoId}/resonates`.
- **Real pre-existing bug fixed (closes Section 8, item 15):** `promoteAndReply`'s `echoId` URL param was read but never used — "Responding to" always showed the top-level post regardless of which specific echo was clicked. Now `respondingToId = echoId || postId`, and that's also what's written as `parent_post_id` on the reply — since `posts.parent_post_id` is self-referencing, this gives real arbitrary-depth threading for free, not just a one-level flat structure.
- Verified: `tsc --noEmit` and `npm run build` both clean.

**8. `feat/feed-supabase-migration`** (merged `5d89679`) —
- `app/feed/page.tsx`: view tracking now calls the `increment_post_view` RPC instead of a Firebase transaction. Post stats (views/resonates/echoes) fetched once from `post_stats` plus a Realtime subscription. "Did I resonate with this" now queries `post_resonates` scoped to the viewer's own `actor_id`, replacing a full-tree Firebase `analytics` pull. `toggleResonate` writes to `post_resonates`; `resonate_count` syncs automatically via trigger.
- `Tier1Player`/`SnippetIconButton` (Section 8, item 10) — both now query `lyric_lines` directly via a shared `fetchLyricLines()` helper instead of fetching a raw Firebase `.srt` string and parsing it client-side. This fully closes item #10 — there is no SRT text to parse anymore at all in these two components, not just a different way of parsing it.
- **Deliberately dropped, not silently ported, flagged in code comment:** the old Firebase `toggleResonate` also mirrored a post resonate into `songResonates/{linkedSongId}/{myId}` whenever the post was linked to a song — treating "resonating with a lyric post about song X" as equivalent to "resonating with song X itself." The Posts & Engagement schema keeps `song_resonates` and `post_resonates` fully separate with no cross-write hook, and this plan never called that linkage out as intended behavior to preserve. Left out. **Flagged here in case it turns out to have been load-bearing for song-level stats.**
- Verified: `tsc --noEmit` and `npm run build` both clean.

**9. `feat/shared-lines-supabase`** (merged `3a6c4b1`) — closes Section 8, item 6 (`useSharedLines`) —
- **Honest note, not a full fix:** this doc's original Section 5 SQL sketch envisioned a real `where song_id = $1 group by text` join. That's not what shipped, deliberately — only ~12 of 133 migrated posts carry a real `song_id`; a strict FK join would silently exclude the vast majority of real historical shared-line data (121 posts have `song_title` text with no `song_id`, confirmed by direct query — these are legacy free-text mentions, not broken links). So `useSharedLines` keeps the same fuzzy song/artist text-matching strategy the Firebase version used, now against Supabase instead of a Firebase tree scan. Still fetches all top-level posts and filters client-side — fine at current volume (133 posts), worth a real query later once `song_id` coverage improves or volume grows.
- Verified: `tsc --noEmit` and `npm run build` both clean.

**10. `fix/post-audio-url-tier1-bug`** (merged `88d2651`) — **a real regression, introduced and fixed same day** —
- `usePosts`/`usePost` had hardcoded `audioUrl: null` on every post (a known-gap comment left in intentionally, then never followed up on) — meaning **every post, including ones correctly linked to a real trymargo song via `song_id`, rendered as non-Tier1** in the feed, falling through to the generic Apple Music/YouTube link fallback instead of showing the snippet button and player. Caught via screenshot during a live Vercel preview check.
- Fix: both hooks now join `songs:song_id ( audio_url )` and populate `audioUrl` from the joined row.
- Verified: `tsc --noEmit` and `npm run build` both clean.

**What this means for build order:** **Phase 6 is done.** Migration, schema, and app code across `usePosts`/`usePost`/`useEchoes`, `compose`, `lyric-back`, the feed, and `useSharedLines` are all live on `main`, all verified via `tsc --noEmit` + `npm run build`, and the migrated data has been spot-checked directly in Supabase. The only remaining Firebase-touching surface in the posts/engagement area is `useApprovedArtists`/`LicensedTab` (Phase 7, dead weight now that `compose` no longer calls it, but not yet deleted).

**⚠️ Unverified, worth confirming:** several of today's hooks (`usePosts`, `usePost`, `useEchoes`, the feed's post_stats/resonate subscriptions) subscribe to Postgres Realtime for live updates. Whether Realtime replication is actually turned on for `posts`, `post_stats`, and `post_resonates` in the Supabase dashboard (Database → Replication) was never explicitly checked this session. If it's off, everything still works on initial load — it just silently won't live-update, which is easy to miss in casual testing. **Action item: check this before calling Phase 6 fully verified end-to-end**, not just "code correct."

---

**August 2, 2026 — Two new features shipped, neither originally scoped anywhere in this document: deterministic snippet matching, and edit-lyric.**

These emerged from a direct product conversation about what "Margo as both social and streaming platform" requires long-term — not from anything in the original plan text. Documented here as net-new scope, not a continuation of a prior section.

### Deterministic snippet matching

**Problem found in production:** the feed's snippet button (`SnippetIconButton`) picked which real `lyric_lines` row a post's quoted text corresponded to via **fuzzy substring matching, re-run on every render** — and when nothing matched (a typed lyric that wasn't a character-for-character SRT substring, common with the 140-char compose cap or minor wording differences), it silently fell back to `lyrics[0]`, meaning the button played **the entire song from the start** instead of the quoted moment. Confirmed live via a real trymargo post where this exact failure occurred.

**11. `feat/snippet-matching`** (merged `66c7e1d`) —
- `posts.snippet_start_sec`/`snippet_end_sec` added (nullable — a post with no confident match simply doesn't get a snippet button, rather than a forced wrong guess).
- `lib/lyric-match.ts` — new shared matching function, used identically at post-creation and (later) edit time. Uses normalized edit-distance similarity (Levenshtein, with a containment-based confidence boost for truncated/expanded quotes) against a confidence threshold, returning `null` rather than guessing when nothing is confident enough.
- `compose/page.tsx`: captures exact `start`/`end` when arriving via a player share link (already known precisely there, no matching needed), or runs `matchLyricLine` against the linked song's real `lyric_lines` when the person typed their own lyric after picking a song via search.
- `lyric-back/page.tsx`: **gained real song linking for the first time** — it never had this before (a pre-existing gap, not introduced by this branch), meaning Lyric Back posts could never become Tier1 regardless of any other fix. Now does the same FK lookup `compose` has, plus the same matcher call.
- `music/player/page.tsx`'s share sheet and `music/page.tsx`'s board focused-panel both now pass exact `start`/`end` through their respective share URLs — skipping matching entirely for those two entry points. **The board's focused panel also gained a "Post to Feed" option it never had before** (previously only "Play Snippet" and "Full Karaoke" existed there).
- Feed's `SnippetIconButton` now uses stored timing directly when present; the fuzzy fetch-and-match path is kept only as a fallback for posts created before this column existed, and even that fallback **no longer force-falls-back to `lyrics[0]`** — if nothing matches, the button does nothing rather than playing the wrong part of the song.
- Verified: `tsc --noEmit` and `npm run build` both clean.

### Edit-lyric

**Design decision, grounded in a comparison of current patterns (X's time-boxed visible-history edit vs. Instagram/Facebook's silent unlimited caption edit):** on Margo, editing a lyric corrects a transcription against a fixed, real, immutable ground truth (the actual song and timestamp) — it is not rewriting a claim the way an edited tweet can be. Categorically closer to fixing a caption typo than rewriting a tweet's meaning. **Decision: silent, unlimited, no visible "Edited" label or version history** — the Instagram/Facebook pattern, not X's.

**12. `feat/edit-lyric-post`** (merged `3c25918`) —
- `posts.updated_at` added, auto-maintained via a `before update` trigger. **Never surfaced in the UI anywhere** — exists purely for internal debugging/support, consistent with the "no visible history" decision above.
- `components/edit-post-modal.tsx` — new modal, matching `CardExportModal`'s established interaction pattern (overlay + centered panel) rather than introducing a new UI pattern. Re-runs `matchLyricLine` and `/api/moderate` on save — an edit is treated as functionally a re-submission of the same checks a fresh post gets, not a bypass of them.
- If the post already has replies (`echo_count > 0`), the modal shows a **non-blocking** context note ("X people have replied to this — they're still responding to what you originally wrote") rather than preventing the edit outright — respects the owner's ability to fix their own content without silently breaking the context of existing replies.
- Feed: a small pencil affordance appears next to the "Margo Original" badge slot, gated strictly on `post.authorUid === user.id` — never shown on anyone else's posts, never shown on legacy posts with no real `author_profile_id` (there's no signed-in owner to authorize an edit on those).
- Verified: `tsc --noEmit` and `npm run build` both clean.

**What this means for build order:** these two features close the loop the plan doc's original Section 6 sketch didn't anticipate — the "share a specific lyric moment" experience across all three entry points (compose search, player share, board share) is now deterministic end-to-end, and a mismatched snippet is now self-correctable by the post's owner rather than a permanent wrong state. Neither of these is tracked as a numbered phase below since they cut across Phase 6 rather than extending it linearly — see the new Section 9.

---

## 0. What audit turned up — real gaps, not hypothetical ones

Before proposing anything new, here's what's actually true in the live codebase right now, confirmed by reading the real files:

| # | Finding | Why it matters | Status |
|---|---|---|---|
| 1 | `profiles.is_artist` is **read** in 5 places (`profile/[username]`, `settings`, `useIdentity`, `profile-lookup`) but **never written** anywhere in app code | The artist-application loop was incomplete — nothing tied `artist_applications.status = 'approved'` to `profiles.is_artist = true`. | ✅ **Resolved** — `artist_application_approved` trigger now closes this loop, live in production. |
| 2 | Two parallel "who's a real artist" systems exist simultaneously | `adminConfig/licensedArtists` (Firebase, `LicensedTab`) vs. `artist_applications` (Supabase). `useApprovedArtists` bridges them by hardcoding `['margo', 'trymargo']` + querying approved applications. | ⏳ **Still open, but now dead weight rather than a live inconsistency.** `compose/page.tsx` no longer calls `isLicensed()` at all (removed as part of the Phase 6 rewrite, Aug 1–2). `useApprovedArtists.ts`/`LicensedTab`/`adminConfig/licensedArtists` still physically exist, unused by any real write path — safe to delete, Phase 7. |
| 3 | No admin UI exists to approve/reject `artist_applications` rows | `artists-tab.tsx` predated `artist_applications` entirely, had no concept of a pending application. | ✅ **Resolved** — `artist-applications-tab.tsx` shipped, live at `/admin`. |
| 4 | Song creation (`SongForm` in admin) is 100% Firebase — admin-authored only | No self-serve upload path existed. | ✅ **Resolved** — self-serve upload now exists via `/studio` (Phase 3), merged Aug 1, 2026. The old `SongForm` itself is still 100% Firebase and still slated for retirement (Section 8, item 5) — it hasn't been deleted yet, just superseded as the real upload path. |
| 5 | `compose/page.tsx` links a post to a song via **text matching**, not a foreign key | Will misfire as a real self-serve catalog grows. | ✅ **Resolved, Aug 1–2, 2026.** `handleSelectSong` now does a real Supabase FK query (`ilike` on `songs.title`/`artist_display_name`, `status = 'live'`) instead of a Firebase tree scan. `lyric-back/page.tsx` gained the identical real lookup for the first time (it never had one before). |
| 6 | `useSongs` and `useSharedLines` are unchanged Firebase RTDB | Full-tree listener, client-side SRT parsing, O(n) post-scanning. | ✅ **Resolved for `useSongs`** (merged `29ec9ab`, July 31). ✅ **Resolved for `useSharedLines`, Aug 2, 2026** — now queries Supabase, though it keeps the same fuzzy text-matching strategy rather than a strict FK join; see the Aug 2 Progress Log entry for why a strict join isn't safe yet. |
| 7 | `useSong.ts` has its own duplicated SRT/plain-lyrics parser, separate from `useSongs`'s | Two parsers reading the same shape — a bug fix in one won't apply to the other. | ✅ **Resolved** — both hooks rewritten to Supabase `select` queries, both parsers deleted, merged `29ec9ab`. |
| 8 | `useLicensedArtists.ts` still exists, confirmed dead code (`git grep` returns zero matches) | Safe to delete, no live inconsistency. | ⏳ **Still open** — scheduled for Phase 7, not yet deleted. Now genuinely dead (see item #2 above), not just orphaned. |
| 9 | `ArtistsTab` moderated a third, independent artist concept (Firebase `artists/{uid}`) | Real moderation feature worth keeping the *concept* of, not the storage. | ✅ **Resolved** — moderation logic ported onto `profiles.artist_status`, live in production; old Firebase `artists/{uid}` node never existed so no backfill/retirement needed. |

None of this is a criticism of what exists — the Firebase-era admin-curated model was the right call to move fast pre-artist-signup. It's just the concrete starting line for what needs to change now that self-serve upload is the goal.

---

## 1. Core design decision: no separate `artists` table

`profiles` already carries `is_artist: boolean`, and `artist_applications` already carries `display_artist_name` + verification links. Adding a third `artists` table would just be a second place to keep an artist's name/bio in sync with their profile — extra joins, extra drift risk, no real benefit.

**Decision:** an artist *is* a `profiles` row. Everything an "artist" needs beyond a normal profile — song ownership, upload permission — hangs directly off `profiles.id`, gated by `profiles.is_artist`.

```
profiles (existing)
  id, username, display_name, avatar_url, bio, is_artist, is_private, ...
       ↑
       │ owner_profile_id
       │
     songs (new)                          ✅ live in production
       ↑
       │ song_id
       │
  lyric_lines (new) ──< lyric_line_vibes (new)   ✅ live in production
       ↑
       │ (fuzzy match, not FK — see Aug 2 note)
       │
     posts (new, ✅ live in production, Aug 1–2, 2026)
       │
       │ parent_post_id (self-referencing — real threading)
       ├──< post_resonates
       └──< post_stats
```

This also directly answers "where does the artist come from" for the compose flow and music page: it's always `profiles`, never a second identity system.

---

## 2. ✅ DONE — Closing Gap #1 — the missing `is_artist` trigger

*Applied to production July 31, 2026. Tracked at `supabase/migrations/20260731_artist_approval_trigger.sql`.*

This is small but blocking — nothing else in this plan matters if applications approve into a dead end. Add a trigger so approval is atomic and can never be forgotten by a future admin action:

```sql
create or replace function public.on_artist_application_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update public.profiles
    set is_artist = true
    where id = new.profile_id;

    new.reviewed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists artist_application_approved on public.artist_applications;
create trigger artist_application_approved
  before update on public.artist_applications
  for each row
  execute function public.on_artist_application_approved();
```
*(Changed to `before update` from `after update` so the trigger can set `new.reviewed_at` on the row being written, per the confirmed schema in Section 2A — an `after` trigger can't modify the row it's firing on.)*

**Verified live:** `select trigger_name, event_manipulation, action_timing from information_schema.triggers where event_object_table = 'artist_applications';` returned `artist_application_approved | UPDATE | BEFORE`.

## 2A. Confirmed schema (via `information_schema.columns`)

No more guessing — here's what's actually live:

```
profiles
  id                uuid                      not null
  username          text                      not null
  display_name      text                      not null
  is_artist         boolean                   not null   default false
  created_at        timestamptz               not null   default now()
  bio               text
  signature_lyric   text
  signature_song    text
  signature_artist  text
  is_private        boolean                   not null   default false
  settings          jsonb                     not null   default '{}'
  avatar_url        text
  deactivated_at    timestamptz
  who_can_message   text                      not null   default 'everyone'
  followers_count   integer                   not null   default 0
  following_count   integer                   not null   default 0
  posts_count       integer                   not null   default 0
  artist_status              text        not null default 'active'   ✅ added 7/31/26
  artist_status_reason       text                                     ✅ added 7/31/26
  artist_status_updated_at   timestamptz                               ✅ added 7/31/26

artist_applications
  id                    uuid       not null   default gen_random_uuid()
  profile_id            uuid       not null
  status                text       not null   default 'pending'
  display_artist_name   text       not null
  links                 jsonb      not null   default '{}'
  note                  text
  rights_agreed         boolean    not null   default false
  submitted_at          timestamptz not null  default now()
  reviewed_at           timestamptz
```

Two things worth noting from the real schema:
- **`artist_applications.reviewed_at` already existed** and was written by nothing in the app — a clean signal this was planned for from the start, just never wired to an admin action. The trigger now sets it, confirmed working in production.
- **`profiles` already has `followers_count`/`following_count`/`posts_count` as denormalized integer counters**, updated by triggers presumably (per the identity migration doc's follow system). `song_stats` in Section 3 follows the exact same pattern already established here — consistent with existing conventions, not a new one.
- **Firebase `artists/{uid}` never existed** — confirmed from the live RTDB tree (`adminConfig`, `analytics`, `engagement`, `pages`, `postStats`, `posts`, `songPlays`, `songResonates`, `songStats`, `songs`, `vibeIndex` — no `artists`). No backfill was ever needed; `profiles.artist_status` simply started at its `'active'` default for every artist going forward.

## 2B. ✅ DONE — Consolidating the moderation concept (`ArtistsTab`'s real job)

*Applied to production July 31, 2026, alongside Section 2.*

`ArtistsTab`'s warn/freeze/remove functionality was worth preserving — a real, working feature (reason shown to the artist, notification pushed, filter by status). It operated on a fourth data location (`artists/{uid}` in Firebase) with no relationship to `profiles` or `artist_applications`. Consolidated onto `profiles`:

```sql
alter table public.profiles
  add column if not exists artist_status text not null default 'active'
    check (artist_status in ('active', 'warned', 'frozen', 'removed')),
  add column if not exists artist_status_reason text,
  add column if not exists artist_status_updated_at timestamptz;
```

- `artist_status` only means anything when `is_artist = true` — no separate table needed, same reasoning as Section 1.
- The warn/freeze/remove admin actions are now simple `profiles` updates in `artist-applications-tab.tsx`'s `ModerationSection`.
- ✅ **Resolved** (merged `16baa8f`, Aug 1, 2026) — the "notify the artist" step (`notifyProfile()` in the component) previously was written against a **guessed** `notifications` table shape. It has now been fixed to match the confirmed real schema in `hooks/useNotifications.tsx`, and `NotificationType` was widened to support artist-status events. No longer a guessed shape — artist-facing notifications (warn/freeze/remove, approval) can now be trusted to actually deliver.
- `frozen`/`removed` gates song visibility: the Section 3 `songs` RLS "public reads live songs" policy includes `and p.artist_status = 'active'` — done as part of the Phase 2 schema push, not deferred.

**Net result — shipped:** one admin tab, live against Supabase, that does two things — approve/reject pending `artist_applications` and warn/freeze/remove already-approved artists, with working notifications on both paths. Old Firebase `artists/{uid}` node never existed, so nothing to retire there.

---

## 3. ✅ DONE — Schema — songs, lyrics, vibes, engagement

*Applied to production July 31, 2026. Tracked at `supabase/migrations/20260731_songs_and_engagement_schema.sql`. Verified via `information_schema.tables` (all 6 tables present) and `pg_policies` (all 10 policies present). Row counts confirmed live via direct query Aug 1, 2026 — see Progress Log.*

Field types below follow the confirmed `profiles`/`artist_applications` conventions from Section 2A (e.g. `integer` denormalized counters, `timestamptz`, `text` over `varchar`) plus reasonable defaults inferred from the Firebase `Song` shape (`useSongs.ts`, admin `SongForm`) for fields with no existing Postgres precedent.

```sql
-- Songs — owned directly by a profile, no artists table
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id),

  title text not null,
  artist_display_name text not null,   -- denormalized display string (may differ from profile display_name if artist uses a stage name)
  artwork_url text,
  audio_url text,
  description text,

  status text not null default 'draft'
    check (status in ('draft', 'processing', 'live', 'coming_soon', 'hidden')),
  coming_soon_label text,
  "order" int,

  -- streaming links — same shape as the Firebase Song interface
  youtube_url text,
  spotify_url text,
  apple_music_url text,
  soundcloud_url text,
  audiomack_url text,
  boomplay_url text,

  duration_sec numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index songs_owner_idx on public.songs(owner_profile_id);
create index songs_status_order_idx on public.songs(status, "order");

-- Lyric lines — real rows instead of a parsed SRT string
create table public.lyric_lines (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  line_index int not null,
  text text not null,
  start_sec numeric not null,
  end_sec numeric not null,
  unique (song_id, line_index)
);

create index lyric_lines_song_idx on public.lyric_lines(song_id);

-- Vibes — join table, this is what makes the discovery board a single query
create table public.lyric_line_vibes (
  line_id uuid not null references public.lyric_lines(id) on delete cascade,
  vibe text not null,
  primary key (line_id, vibe)
);

create index lyric_line_vibes_vibe_idx on public.lyric_line_vibes(vibe);

-- Engagement — session-deduped, same concept as the Firebase engagement/ node
create table public.song_plays (
  song_id uuid not null references public.songs(id) on delete cascade,
  session_id text not null,
  qualified_at timestamptz not null default now(),
  primary key (song_id, session_id)
);

create table public.song_resonates (
  song_id uuid not null references public.songs(id) on delete cascade,
  actor_id text not null,   -- auth.uid()::text for signed-in, margoSessionId for anon
  created_at timestamptz not null default now(),
  primary key (song_id, actor_id)
);

-- Denormalized stats — O(1) reads for cards/grid, no COUNT() on every render
create table public.song_stats (
  song_id uuid primary key references public.songs(id) on delete cascade,
  plays int not null default 0,
  resonate_count int not null default 0,
  lyric_uses int not null default 0,
  updated_at timestamptz not null default now()
);

-- Keep song_stats.resonate_count in sync automatically
create or replace function public.on_song_resonate_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.song_stats (song_id, resonate_count)
  values (coalesce(new.song_id, old.song_id), 0)
  on conflict (song_id) do nothing;

  update public.song_stats
  set resonate_count = (select count(*) from public.song_resonates where song_id = coalesce(new.song_id, old.song_id)),
      updated_at = now()
  where song_id = coalesce(new.song_id, old.song_id);
  return null;
end;
$$;

create trigger song_resonate_insert after insert on public.song_resonates
  for each row execute function public.on_song_resonate_change();
create trigger song_resonate_delete after delete on public.song_resonates
  for each row execute function public.on_song_resonate_change();

-- ✅ ADDED beyond original plan text, at execution time (see Progress Log):
-- song_plays → song_stats.plays sync trigger, same pattern as resonate_count.
-- Without this, song_stats.plays would never populate.
create or replace function public.on_song_play_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.song_stats (song_id, plays)
  values (new.song_id, 0)
  on conflict (song_id) do nothing;

  update public.song_stats
  set plays = (select count(*) from public.song_plays where song_id = new.song_id),
      updated_at = now()
  where song_id = new.song_id;
  return null;
end;
$$;

create trigger song_play_insert after insert on public.song_plays
  for each row execute function public.on_song_play_change();
```

### RLS policies — all 10 verified live via `pg_policies`

```sql
alter table public.songs enable row level security;
alter table public.lyric_lines enable row level security;
alter table public.lyric_line_vibes enable row level security;
alter table public.song_plays enable row level security;
alter table public.song_resonates enable row level security;
alter table public.song_stats enable row level security;

-- Public can read live/coming-soon songs from artists in good standing;
-- owner can always read their own (incl. drafts, regardless of standing).
-- The artist_status gate (Section 2B) was folded in at execution time.
create policy "public reads live songs" on public.songs
  for select using (
    (
      status in ('live', 'coming_soon')
      and exists (
        select 1 from public.profiles p
        where p.id = owner_profile_id and p.artist_status = 'active'
      )
    )
    or owner_profile_id = auth.uid()
  );

create policy "artists insert own songs" on public.songs
  for insert with check (
    owner_profile_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and is_artist = true)
  );

create policy "owner updates own songs" on public.songs
  for update using (owner_profile_id = auth.uid());

create policy "read lines of visible songs" on public.lyric_lines
  for select using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and (
          (s.status in ('live','coming_soon')
            and exists (select 1 from public.profiles p where p.id = s.owner_profile_id and p.artist_status = 'active'))
          or s.owner_profile_id = auth.uid()
        )
    )
  );

create policy "owner writes own lines" on public.lyric_lines
  for all using (
    exists (select 1 from public.songs s where s.id = song_id and s.owner_profile_id = auth.uid())
  );

create policy "read vibes of visible lines" on public.lyric_line_vibes
  for select using (
    exists (
      select 1 from public.lyric_lines ll
      join public.songs s on s.id = ll.song_id
      where ll.id = line_id
        and (
          (s.status in ('live','coming_soon')
            and exists (select 1 from public.profiles p where p.id = s.owner_profile_id and p.artist_status = 'active'))
          or s.owner_profile_id = auth.uid()
        )
    )
  );

create policy "owner writes own vibes" on public.lyric_line_vibes
  for all using (
    exists (
      select 1 from public.lyric_lines ll
      join public.songs s on s.id = ll.song_id
      where ll.id = line_id and s.owner_profile_id = auth.uid()
    )
  );

create policy "public reads song_stats" on public.song_stats for select using (true);

create policy "authenticated writes own resonate" on public.song_resonates
  for all using (actor_id = coalesce(auth.uid()::text, actor_id));

-- Plays are anonymous-friendly (session-based, no auth required) —
-- anyone can insert, no one reads raw session rows (only song_stats.plays is public).
create policy "anyone records a play" on public.song_plays
  for insert with check (true);
```

**Verified live (10 policies confirmed via `pg_policies`):** `owner writes own vibes`, `read vibes of visible lines` (`lyric_line_vibes`) · `owner writes own lines`, `read lines of visible songs` (`lyric_lines`) · `anyone records a play` (`song_plays`) · `authenticated writes own resonate` (`song_resonates`) · `public reads song_stats` (`song_stats`) · `artists insert own songs`, `owner updates own songs`, `public reads live songs` (`songs`).

### Storage buckets — ✅ live

```sql
insert into storage.buckets (id, name, public) values ('song-audio', 'song-audio', true);
insert into storage.buckets (id, name, public) values ('song-artwork', 'song-artwork', true);
```
RLS on `storage.objects`: artist can upload/update only into a path prefixed with their own `auth.uid()` (e.g. `song-audio/{uid}/{songId}.mp3`), public can read. Applied and live.

### Live production data — confirmed Aug 1, 2026

Direct query via `scripts/check-songs-count.mjs` confirms:

| Table | Row count |
|---|---|
| `songs` | 10 (all `status='live'`, artist `Trymargo`) |
| `lyric_lines` | 399 |
| `lyric_line_vibes` | 379 |

This data came entirely from the one-time `migrate-songs-to-supabase.mjs` script. No new-upload pipeline had populated any of it as of the Aug 1 audit — the `/studio` self-serve pipeline (Section 4) can now add to these counts, but no real production upload has been confirmed as of Aug 2, 2026.

---

## 4. ✅ DONE — Upload → live pipeline (Phase 3), pending production verification

**🟢 Product decision resolved (Aug 1, 2026):** instant-live. An artist who has already been approved (Section 2's trigger) publishes songs directly — no per-song admin review. This is settled.

**🟢 Shipped (Aug 1, 2026, later):** the full pipeline below is built and merged via `feat/studio-poster-redesign`. What remains is confirming a real, end-to-end production upload — everything so far has been verified either via `tsc`/build passing or via the isolated Phase 4 test script, not via one real artist uploading one real song through `/studio`. **Still true as of Aug 2, 2026.**

| Step | Where | Detail |
|---|---|---|
| 1. Apply as artist | `/apply-artist` (exists) | Unchanged |
| 2. Admin approves | `/admin` → Artists tab | ✅ **Done** — trigger from Section 2 flips `profiles.is_artist` automatically once `status='approved'` is set, live in production. Notifications on this path now also confirmed working (Section 2B). |
| 3. "Upload Song" appears | `/studio`, gated on `identity.isArtist` | ✅ **Done** — `app/studio/page.tsx` shows the poster-grid dashboard and upload form only when `identity?.isArtist` is true, "Apply as an Artist" CTA otherwise. Merged via `feat/studio-poster-redesign`. |
| 4. Upload audio + artwork | Direct-to-Storage upload from the browser | ✅ **Done** — `song-upload-form.tsx` uploads straight to `song-audio`/`song-artwork` buckets (Section 3), uid-scoped paths as designed. |
| 5. Lyric/vibe pipeline | `/api/whisper` + rewritten `/api/tag-vibes`, writing `lyric_lines`/`lyric_line_vibes` | ✅ **Done, with a real caller.** `song-upload-form.tsx`'s `runLyricsPipeline()` calls `/api/whisper` then the rewritten `/api/tag-vibes` in sequence against the real song it just created — this is the caller Phase 4's earlier entry flagged as missing. |
| 6. Go live | `status` set to `'live'` automatically by the upload flow | ✅ **Done** — `song-upload-form.tsx` sets `status: 'live'` after the lyric/vibe pipeline succeeds, no separate approval step. |

**Known gaps in this shipped flow, not blocking but worth fixing:**
- If the audio or artwork Storage upload itself fails (before the `songs` row exists), there's no retry — the partial file isn't cleaned up, and clicking submit again just restarts with a fresh `songId`, orphaning the first attempt's file in Storage.
- The upload form's error/success text color uses a raw inline `rgba()` value rather than a CSS variable — self-flagged in the component's own comment, a small design-system debt item (see Section 8).

**Admin's role in this pipeline, now explicit:** admin approves the *artist* once (Section 2). Admin has no role in approving individual *songs*. The retired `MusicTab`/`SongForm` is being replaced by a read-only Catalog tab (Progress Log, Aug 1 entry) for oversight, not gatekeeping — not yet built, Phase 7.

---

## 5. ✅ MOSTLY DONE — Music page rebuild (Phase 5)

**✅ Done, confirmed live (merged `29ec9ab`):**
- **Discovery board** (`LyricBoard` in `app/music/page.tsx`): now builds all discovery moments directly from `song.lyricLines`, which comes from `useSongs()`'s real Supabase query. No more client-side SRT parsing, no more full-tree download-and-parse. Confirmed live against 10 real songs / 399 lines / 379 vibes.
- **Song grid and karaoke player** (`app/music/player/page.tsx`, via `useSong()`): both read real Supabase data, typed correctly, no Firebase fallback code left.
- **Aug 2, 2026 additions:** the board's focused-lyric panel gained a "Post to Feed" share option (previously only "Play Snippet" and "Full Karaoke" existed there), and the player's share sheet now passes exact lyric timing through to `compose` — see Section 9.

**✅ Resolved, Aug 2, 2026 — `useSharedLines.ts`.** No longer Firebase. Queries Supabase `posts` directly. **Kept the same fuzzy song/artist text-matching strategy** the Firebase version used rather than a strict `song_id` join — see the Aug 2 Progress Log entry for why (most historical posts don't carry a real `song_id`, so a strict join would silently exclude the majority of real data). Worth a real query once `song_id` coverage across posts improves.

**⏳ Not started:**
- **Search** — still client-side substring scan over the in-memory song list, not a real Postgres `ilike`/`tsvector` query. Not yet warranted at 10 songs, but flagged as still-original-plan.

---

## 6. ✅ DONE — `compose`/`lyric-back` song-linking and post creation (Phase 6)

*Was "NOT STARTED" as of Aug 1, 2026's earlier audit; fully shipped by Aug 2, 2026. See the Aug 1–2 Progress Log entry for the complete branch-by-branch account. Summary of the final state:*

- `compose/page.tsx`'s `handleSelectSong` does a real Supabase FK query against `songs` (`ilike` on title/artist, `status='live'`) — the Firebase tree scan and the `isLicensed()`/`useApprovedArtists` gate are both gone. `handlePost` inserts into Supabase `posts`.
- `lyric-back/page.tsx`'s `handlePost` also inserts into Supabase `posts`, with `parent_post_id` set for replies — and, new as of Aug 2, does the same real song FK lookup `compose` has, which it never had before.
- `song_stats.lyric_uses` now has a real, working write path via the `post_song_link_insert` trigger — no more manual Firebase transactions, no more silently-stuck-at-zero column.
- **Original Section 6 planned direction** ("once songs live in Postgres, `select id, audio_url from songs where owner_profile_id = ... and lower(title) = lower($1)`") — implemented close to as planned, using `ilike` rather than exact `lower()` equality for a bit more forgiveness on minor formatting differences, and scoped to `status = 'live'` rather than the artist's own catalog specifically (any live song can be linked, not just the searcher's own — matches how a normal music-tagging flow works elsewhere, e.g. Instagram music stickers).

---

## 7. Recommended build order

| Phase | Work | Status |
|---|---|---|
| **1** | Trigger (Section 2) + admin approval/moderation tab (Section 2A/2B) + `profiles.artist_status` columns | ✅ **Done** — merged `feat/artist-approval-supabase` → `main` (`8cdba62`), verified live in Supabase production |
| **2** | Schema + RLS + storage buckets (Section 3) | ✅ **Done** — merged `chore/track-migration-sql` → `main` (`3aa758a`), verified live in Supabase production, row counts confirmed Aug 1 |
| **3** | Self-serve upload UI + Storage wiring | ✅ **Done** — merged `feat/studio-poster-redesign` → `main`. `tsc`/`build` clean. **Still pending one real end-to-end production upload to fully verify** (no production run logged as of Aug 2, 2026). Also still pending: retiring `admin`'s `MusicTab`/`SongForm`/`LicensedTab` in favor of a general-purpose Catalog tab (see Progress Log) — scoped, not started, Phase 7. |
| **4** | Rewrite `/api/whisper` + `/api/tag-vibes` to write Postgres | ✅ **Done and verified.** `/api/tag-vibes` rewritten to require `songId` and persist real `lyric_lines`/`lyric_line_vibes` rows; tested end-to-end via a throwaway test song with zero risk to live data. `/api/whisper` confirmed already correct, unchanged. Has a real caller — `/studio`'s upload form (Phase 3). |
| **5** | Music page reads (`useSongs`, `LyricBoard`, grid, search) **and** `useSong` (karaoke detail) → Supabase | ✅ **Mostly done.** `useSongs`, `useSong`, discovery board, player page, and now `useSharedLines` (Aug 2) all live on Supabase. Only client-side search remains as originally planned, not yet warranted at current catalog size. |
| **6** | Posts & Engagement — `compose` song-linking, post creation, feed reads, resonate/view/echo, `useSharedLines` → Supabase | ✅ **Done, Aug 1–2, 2026.** Migration script run and verified 133/133. `usePosts`/`usePost`/`useEchoes`, `compose`, `lyric-back`, the feed, and `useSharedLines` all rewritten, merged, and verified via `tsc --noEmit` + `npm run build` at each step. One production bug found and fixed same day (hardcoded `audioUrl: null` breaking Tier1 detection). See the full Progress Log entry for the six-branch account. |
| **6.5** *(new, not in original phase numbering)* | Deterministic snippet matching + edit-lyric | ✅ **Done, Aug 2, 2026.** See Section 9 — this cuts across Phase 6 rather than extending it linearly, hence the new sub-number rather than a Phase 7 renumber. |
| **7** | Retire `adminConfig/licensedArtists`, `LicensedTab`, `useLicensedArtists.ts`, old Firebase `songs` tree; build the read-only admin Catalog tab | ⏳ **Not started.** `useApprovedArtists`/`isLicensed()` is now confirmed dead code (item #2 in Section 0 — no live caller left after the Phase 6 rewrite), making this a pure deletion rather than a migration. |

---

## 8. Open items

1. ~~**🔴 Product decision (blocking Phase 3)**~~ — ✅ **Resolved August 1, 2026.** Instant-live: an approved artist publishes songs directly, no per-song admin review. Admin approves the artist once (Section 2), never individual songs.
2. ~~**⚠️ Notifications schema**~~ — ✅ **Resolved August 1, 2026** (merged `16baa8f`). `notifyProfile()` confirmed against real schema; artist-status notifications can now be trusted to deliver.
3. ~~**🆕 Build-order risk: Phase 4 not started**~~ — ✅ **Resolved August 1, 2026.** `/api/tag-vibes` rewritten to write real `lyric_lines`/`lyric_line_vibes` rows, tested end-to-end via an isolated throwaway-song test (zero risk to live data), confirmed working including correct filler-line handling and safe re-processing. `/api/whisper` confirmed already correct, unchanged.
4. ~~**🆕 Scoping gap: `compose`'s post-creation path still 100% Firebase**~~ — ✅ **Resolved Aug 1–2, 2026.** Folded into Phase 6 as originally suggested here. Both `compose` and `lyric-back` (item #13 below) now write to Supabase.
5. **🆕 New, Aug 1, 2026 — scoping decision made, not yet built:** `admin/page.tsx`'s `MusicTab`, `SongForm`, and `LicensedTab` are being retired (not extended) in favor of a general-purpose, read-only Catalog tab — see Progress Log for full reasoning. **Still not started as of Aug 2, 2026** — Phase 7.
6. **🆕 New, Aug 1, 2026 — Phase 3 gap, not blocking, corrected after direct file read of `song-upload-form.tsx`:** the form does have a working retry path (`pendingSongId`/`pendingAudioUrl` state, `handleRetry`) that resumes the lyrics pipeline without restarting — this was not previously credited. The real, narrower gap: if the **Storage upload itself** (audio or artwork) fails, before any `songs` row exists, there's no retry and the partial file isn't cleaned up. Not urgent at current volume.
7. **🆕 New, Aug 1, 2026 — Phase 3 gap, not blocking:** `song-upload-form.tsx`'s stage-status text (error/success states) uses a hardcoded inline `rgba()` color rather than a CSS variable. Self-flagged in the component's own code comment as a stopgap. Small, isolated design-system debt — worth fixing before other components copy the pattern.
8. **🆕 New, Aug 1, 2026 — verification gap, still open Aug 2, 2026:** no one has yet run a real end-to-end upload through `/studio` in production and confirmed all three tables (`songs`, `lyric_lines`, `lyric_line_vibes`) populate correctly together outside the isolated test script. Worth doing once before treating Phase 3/4 as fully verified rather than just merged.
9. ~~**🆕 `song_stats.lyric_uses` has no write path**~~ — ✅ **Fully resolved, Aug 1–2, 2026.** The `post_song_link_insert` trigger was live from Aug 1 but had nothing calling it (nothing wrote real `posts.song_id` rows yet). Now that `compose` and `lyric-back` both insert real posts with `song_id` set, this column has a genuine, working write path for the first time.
10. ~~**Duplicate Firebase SRT parsers in `Tier1Player`/`SnippetIconButton`**~~ — ✅ **Fully resolved, Aug 1–2, 2026.** Both now read `lyric_lines` directly (Aug 1 feed rewrite), and as of Aug 2's snippet-matching work, most posts don't even need the fallback parsing path at all since exact timing is stored on the post itself.
12. ~~**`song-upload-form.tsx` pipeline verification**~~ — ✅ **Confirmed, Aug 1, 2026** — see item #6 above for the retry-path correction.
13. ~~**`lyric-back/page.tsx` is a second, independent post-creation entry point**~~ — ✅ **Resolved, Aug 1–2, 2026.** Both `compose` and `lyric-back` now write to Supabase `posts`; the migration correctly deduped the 5 legacy Firebase posts that existed as duplicates of nested echoes from the old dual-write pattern this item describes.
14. ~~**Three separate "resonate" concepts (song/post/echo-level)**~~ — ✅ **Resolved, Aug 1, 2026.** Echoes are now real `posts` rows, so echo-resonates collapsed naturally into the same `post_resonates` table as top-level post resonates. Two concepts remain by design: `song_resonates` (song-level) and `post_resonates` (covers both top-level posts and replies uniformly) — confirmed as the intended end state, not an oversight.
15. ~~**`promoteAndReply`'s `echoId` never read — "Responding to" always shows the top-level post**~~ — ✅ **Fixed, Aug 1, 2026**, as part of the Phase 6 rewrite (`fix/lyric-back-nested-threading`). `respondingToId = echoId || postId` now drives both the displayed context and the `parent_post_id` written on reply.
16. **🆕 New, Aug 1, 2026 — dropped behavior, flagged not silently ported:** the old Firebase feed also mirrored a post resonate into `songResonates/{linkedSongId}/{myId}` whenever the post was linked to a song. No schema equivalent exists in the Posts & Engagement design (`song_resonates`/`post_resonates` are fully separate, no cross-write hook), and this was never called out as intended behavior anywhere in this plan. Left out of the rewrite. **Still open — flag if this turns out to have mattered for song-level stats.**
17. **🆕 New, Aug 1, 2026 — one Firebase post left unmigrated by the script, handled manually:** exactly 1 of 133 total pieces of content (`analytics/{postId}/replies/{replyId}`, a structurally distinct third reply shape with a raw numeric resonate count and no relation to `posts`/`echoes`) was too small a sample and too different in shape to safely auto-migrate. Flagged in the script's log, then manually inserted via a one-off SQL statement using its real Supabase parent id (looked up from the migration log's `idMap`). **Fully resolved** — 133/133 confirmed, but worth remembering this one post's history is slightly different from the other 132 if it's ever debugged.
18. **🆕 New, Aug 1, 2026 — honest scope note, not a bug:** `useSharedLines.ts` (Section 5, Section 8 item formerly #6) uses fuzzy song/artist text matching against Supabase, not the strict `song_id` join this doc's original Section 5 SQL sketch envisioned. This is deliberate — most historical posts (121 of 133) don't carry a real `song_id`. Worth revisiting once `song_id` coverage improves.
19. **🆕 New, Aug 2, 2026 — snippet-matching honest note, not a bug:** `lib/lyric-match.ts`'s confidence threshold (0.55) was chosen reasonably but has not been tuned against real usage data — worth revisiting once there's a meaningful sample of edited/re-matched posts to see whether it's too strict (too many posts silently get no snippet button) or too loose (occasional wrong matches slip through).
20. **🆕 New, Aug 2, 2026 — unverified, action item:** several Phase 6 and Section 9 hooks (`usePosts`, `usePost`, `useEchoes`, the feed's `post_stats`/`post_resonates` subscriptions) depend on Supabase Realtime replication being enabled for `posts`, `post_stats`, and `post_resonates` (Database → Replication in the dashboard) to live-update. This was never explicitly checked. If it's off, initial loads still work correctly — only live-updating silently doesn't happen, which is easy to miss in casual testing. **Needs a direct check before Phase 6/9 can be called fully verified end-to-end**, not just "code correct."
21. **🆕 New, Aug 2, 2026 — Phase 7 is now smaller than originally scoped, worth noting:** `useApprovedArtists.ts` is confirmed to have zero remaining callers after the Phase 6 rewrite removed `compose`'s last use of `isLicensed()`. Its Phase 7 retirement is now a pure deletion (file + its Firebase `adminConfig/licensedArtists` source), not a migration — lower-risk than originally implied by grouping it with the admin Catalog tab build in the same phase number.

---

## 9. New scope, Aug 2, 2026 — Deterministic snippet matching & edit-lyric

*Not present in this document's original scope. Added here as its own section rather than folded into Section 6, since it cuts across `compose`, `lyric-back`, the feed, and the music page rather than extending any one of them linearly. See the Aug 2, 2026 Progress Log entry above for the full branch-by-branch account; this section is the durable reference for the design decisions, kept separate from the log so future readers don't have to dig through log entries to find the reasoning.*

### 9.1 Why this needed to exist

The feed's snippet button matched a post's quoted lyric text to a real `lyric_lines` row via fuzzy substring search, re-run on every render, with a silent fallback to `lyrics[0]` when nothing matched — meaning the "play just this line" button could end up playing the entire song from the beginning. Confirmed live in production against a real trymargo post. Root cause: the match was never computed once and stored; it was re-guessed every time, forever, against text that might not be a clean substring of the real SRT line (compose's 140-char cap, minor wording differences, punctuation).

### 9.2 Schema

```sql
alter table public.posts
  add column if not exists snippet_start_sec numeric,
  add column if not exists snippet_end_sec numeric;

alter table public.posts
  add column if not exists updated_at timestamptz;

create or replace function public.on_post_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger post_updated_at
  before update on public.posts
  for each row
  execute function public.on_post_updated();
```

Both nullable by design: a post with no linked song, or where the matcher finds nothing confident, simply doesn't render a snippet button. `updated_at` is never surfaced in the UI — see 9.4.

### 9.3 `lib/lyric-match.ts` — the shared matcher

One function, called identically from three places (post creation in `compose`, post creation in `lyric-back`, and post editing): given a `songId` and typed text, fetch that song's real `lyric_lines`, score each against the typed text using normalized Levenshtein edit-distance similarity (with a containment-based confidence boost for truncated/expanded quotes — common given the 140-char compose cap), and return the best match only if it clears a 0.55 confidence threshold. Below that, returns `null` rather than guessing — a missing snippet button is a smaller problem than one that plays the wrong part of a song.

Two entry points skip this matcher entirely and pass exact timing straight through instead, since they already know it precisely:
- The player page's share sheet (the currently-playing lyric line's real `start`/`end`).
- The music board's focused-lyric panel (same — it's already showing a specific real `lyric_lines` row).

### 9.4 Edit-lyric — design decision

Compared X's edit pattern (time-boxed, capped edit count, visible "Edited" label with tap-through version history — appropriate because rewriting a tweet can change what was actually claimed) against Instagram/Facebook's pattern (silent, unlimited, no visible history — appropriate because a caption is decoration on the actual content, not the content itself).

**Margo's posts fall into the second bucket.** Correcting a lyric transcription against a real, fixed song and timestamp that never moved is closer to fixing a caption typo than rewriting a tweet's meaning — the person isn't changing what they meant, they're fixing a transcription error against a ground truth that already existed. **Decision: silent, unlimited edits, no visible "Edited" label, no version history.** `posts.updated_at` exists only for internal debugging/support.

Engagement (resonates, replies, view counts) is untouched by an edit — it's an `UPDATE` on the same row, not a new post.

**One real coherence risk, handled non-blockingly:** if a post already has replies, those replies' "Responding to" context is pulled live from the parent's current text. Editing after replies exist could make existing replies look like they're responding to something different. Resolved by showing a one-line note in the edit modal ("X people have replied to this — they're still responding to what you originally wrote") rather than blocking the edit — respects the owner's right to fix their own content without silently corrupting others' context, without being a hard wall.

Legacy posts (`legacy_author_label`, no real `author_profile_id`) are not editable — there's no signed-in owner to authorize it. The edit affordance is gated on `post.authorUid === user.id`.

### 9.5 What still isn't built

- No bulk "fix all my mismatched snippets" tool — each edit is one post at a time, by design (matches the scope of what was actually asked for).
- The 0.55 confidence threshold (Section 8, item 19) hasn't been validated against real usage.
- Only lyric *text* is editable through this modal — song/artist linking, vibe/emotion, and privacy status are not editable after posting. Not scoped; would need its own design pass if wanted later (in particular, changing the linked song after creation likely needs the same replies-context consideration as text edits, maybe more so).

---

*Next step: confirm Supabase Realtime replication is actually enabled for `posts`/`post_stats`/`post_resonates` (Section 8, item 20) — the one unverified assumption underneath everything shipped Aug 1–2. Alongside or shortly after: do one real end-to-end song upload through `/studio` to close out Phase 3/4 verification (Section 8, item 8), then move to Phase 7 (retire `useApprovedArtists`/`LicensedTab`/`useLicensedArtists.ts` — now pure deletions, Section 8 item 21 — and build the read-only admin Catalog tab).*