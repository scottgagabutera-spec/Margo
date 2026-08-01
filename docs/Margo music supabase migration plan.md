# Margo — Music & Artist Catalog: Firebase → Supabase Migration Plan
*Draft v1 — July 2026 — Living document — last updated August 1, 2026 (Posts & Engagement schema for Phase 6 applied and verified live in Supabase)*

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
- Replace with: a new **Catalog tab** — read-heavy, lists all artists (from `profiles where is_artist=true`) and their songs with play/resonate stats, allows moderation-level actions only (e.g. toggle a song `live`/`hidden`), but has **no upload, no audio/artwork fields, no "Generate SRT" button, no "Save Song" form**. Authoring belongs entirely to the artist-facing upload page (Phase 3), not admin. **Not yet built** — scoped here, not started.

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
   - **Not yet confirmed:** no real artist has uploaded a real song through this flow in production yet — Phase 4's route was only tested via the isolated throwaway-song script, and Phase 3's UI hasn't had an end-to-end production run logged. Worth doing one real upload and confirming `songs`/`lyric_lines`/`lyric_line_vibes` all populate correctly before calling this phase fully verified, not just merged.
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

**Schema applied directly via the Supabase SQL Editor** (dashboard-run, to be tracked in git as `supabase/migrations/20260801_posts_and_engagement_schema.sql` once file-tracked, same dashboard-then-git order as Section 3):

- Tables created and verified present via `information_schema.tables`: `posts`, `post_resonates`, `post_stats`.
- All 6 RLS policies verified present via `pg_policies`: `public reads active posts`, `authenticated users insert own posts`, `owner updates own posts`, `owner deletes own posts` (all on `posts`) · `public reads post_stats` (`post_stats`) · `authenticated writes own post_resonate` (`post_resonates`).
- All 5 triggers verified present via `information_schema.triggers`: `post_reply_insert`, `post_reply_delete` (on `posts`, sync `post_stats.echo_count` from Lyric Back replies) · `post_resonate_insert`, `post_resonate_delete` (on `post_resonates`, sync `post_stats.resonate_count`) · `post_song_link_insert` (on `posts`, **closes the `song_stats.lyric_uses` gap** — increments the linked song's `lyric_uses` whenever a post with a real `song_id` is created).
- `increment_post_view(p_post_id uuid)` RPC function also applied — a safe, dedup-free view counter callable via `supabase.rpc('increment_post_view', { p_post_id })`, replacing the Firebase `runTransaction` view-count pattern.

**What this means for build order:** the schema/RLS/triggers layer of Phase 6 is done, following the exact same "schema first, verified via `information_schema`/`pg_policies`, then app code" sequence Phase 2 used. What remains, not yet started:
- Migration script (Firebase `posts` → Supabase `posts`/`post_stats`, same pattern as `migrate-songs-to-supabase.mjs`) — `song_id` should resolve directly from each post's existing `songId` field rather than needing fuzzy matching, since the old post already carried the real linked id.
- Rewrite `usePosts`/`usePost` to read from Supabase.
- Rewrite `compose/page.tsx`'s `handleSelectSong` (real FK query instead of tree scan + string match) and `handlePost` (insert into Supabase `posts` instead of Firebase `push`).
- Rewrite `useSharedLines` as a real Postgres group-by query on `posts.song_id`.
- Rewrite the feed's resonate/view/echo logic to call `post_resonates`/`increment_post_view`/replies instead of the Firebase `analytics`/`postStats` paths.
- Fix `Tier1Player`/`SnippetIconButton` to read `lyric_lines` (already live via `useSong`) instead of re-parsing Firebase SRT — same fix category as Gap #7, just not yet applied to these two components.
- Retire `useApprovedArtists`/`isLicensed()` in favor of a direct `identity.isArtist` or `songs.owner_profile_id` check (removes a dependency Phase 7 was going to handle anyway).

---

## 0. What audit turned up — real gaps, not hypothetical ones

Before proposing anything new, here's what's actually true in the live codebase right now, confirmed by reading the real files:

| # | Finding | Why it matters | Status |
|---|---|---|---|
| 1 | `profiles.is_artist` is **read** in 5 places (`profile/[username]`, `settings`, `useIdentity`, `profile-lookup`) but **never written** anywhere in app code | The artist-application loop was incomplete — nothing tied `artist_applications.status = 'approved'` to `profiles.is_artist = true`. | ✅ **Resolved** — `artist_application_approved` trigger now closes this loop, live in production. |
| 2 | Two parallel "who's a real artist" systems exist simultaneously | `adminConfig/licensedArtists` (Firebase, `LicensedTab`) vs. `artist_applications` (Supabase). `useApprovedArtists` bridges them by hardcoding `['margo', 'trymargo']` + querying approved applications. | ⏳ **Still open** — resolved conceptually now that approval writes `is_artist`, but `LicensedTab`/`useLicensedArtists.ts` retirement is Phase 7, not done yet. Confirmed `compose/page.tsx` still calls the old `isLicensed()` from this hook (Aug 1 file read). |
| 3 | No admin UI exists to approve/reject `artist_applications` rows | `artists-tab.tsx` predated `artist_applications` entirely, had no concept of a pending application. | ✅ **Resolved** — `artist-applications-tab.tsx` shipped, live at `/admin`. |
| 4 | Song creation (`SongForm` in admin) is 100% Firebase — admin-authored only | No self-serve upload path existed. | ✅ **Resolved** — self-serve upload now exists via `/studio` (Phase 3), merged Aug 1, 2026. The old `SongForm` itself is still 100% Firebase and still slated for retirement (Section 8, item 5) — it hasn't been deleted yet, just superseded as the real upload path. |
| 5 | `compose/page.tsx` links a post to a song via **text matching**, not a foreign key | Will misfire as a real self-serve catalog grows. | ⏳ **Still open** — confirmed still true by direct file read Aug 1. `handleSelectSong` still does a manual Firebase tree scan with `.toLowerCase().trim()` matching. This is Phase 6, depends on Phase 5 landing first (Phase 5 is only partially done — see Progress Log). |
| 6 | `useSongs` and `useSharedLines` are unchanged Firebase RTDB | Full-tree listener, client-side SRT parsing, O(n) post-scanning. | ⏳ **Partially resolved** — `useSongs` ✅ rewritten to Supabase (merged `29ec9ab`). `useSharedLines` ⏳ confirmed still Firebase RTDB by direct file read Aug 1 — unchanged, no work started. |
| 7 | `useSong.ts` has its own duplicated SRT/plain-lyrics parser, separate from `useSongs`'s | Two parsers reading the same shape — a bug fix in one won't apply to the other. | ✅ **Resolved** — both hooks rewritten to Supabase `select` queries, both parsers deleted, merged `29ec9ab`. |
| 8 | `useLicensedArtists.ts` still exists, confirmed dead code (`git grep` returns zero matches) | Safe to delete, no live inconsistency. | ⏳ **Still open** — scheduled for Phase 7, not yet deleted. |
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

This data came entirely from the one-time `migrate-songs-to-supabase.mjs` script (Section — see Progress Log, Phase 4 status below). No new-upload pipeline had populated any of it as of the Aug 1 audit — the `/studio` self-serve pipeline (Progress Log, later Aug 1 entry) can now add to these counts, but hasn't yet been confirmed to have done so.

---

## 4. ✅ DONE — Upload → live pipeline (Phase 3), pending production verification

**🟢 Product decision resolved (Aug 1, 2026):** instant-live. An artist who has already been approved (Section 2's trigger) publishes songs directly — no per-song admin review. This is settled.

**🟢 Shipped (Aug 1, 2026, later):** the full pipeline below is built and merged via `feat/studio-poster-redesign`. What remains is confirming a real, end-to-end production upload — everything so far has been verified either via `tsc`/build passing or via the isolated Phase 4 test script, not via one real artist uploading one real song through `/studio`.

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

**Admin's role in this pipeline, now explicit:** admin approves the *artist* once (Section 2). Admin has no role in approving individual *songs*. The retired `MusicTab`/`SongForm` is being replaced by a read-only Catalog tab (Progress Log, Aug 1 entry) for oversight, not gatekeeping — not yet built.

---

## 5. Music page rebuild — PARTIALLY DONE (Phase 5)

**✅ Done, confirmed live (merged `29ec9ab`):**
- **Discovery board** (`LyricBoard` in `app/music/page.tsx`): now builds all discovery moments directly from `song.lyricLines`, which comes from `useSongs()`'s real Supabase query. No more client-side SRT parsing, no more full-tree download-and-parse. Confirmed live against 10 real songs / 399 lines / 379 vibes.
- **Song grid and karaoke player** (`app/music/player/page.tsx`, via `useSong()`): both read real Supabase data, typed correctly, no Firebase fallback code left.

**⏳ Not started, confirmed by direct file read Aug 1:**
- **`useSharedLines.ts`** — still unchanged Firebase RTDB. Still does a full `posts` tree scan via `onValue(query(ref(db,'posts'), orderByChild('timestamp')))`, with substring `.includes()` matching on song/artist text to compute "most shared lines." Becomes a real query once `posts.song_id` is a proper foreign key (still-deferred `posts` migration per the identity doc) — nothing has moved on this yet.
- **Search** — still client-side substring scan over the in-memory song list, not a real Postgres `ilike`/`tsvector` query. Not yet warranted at 10 songs, but flagged as still-original-plan.

Original planned query for the discovery board (now effectively implemented, in spirit, via `useSongs()` client-side joins rather than this exact SQL — worth confirming later whether a dedicated server-side query would outperform the current client-side filter-by-vibe approach as the catalog grows beyond 10 songs):
```sql
select ll.text, ll.start_sec, ll.end_sec, s.id as song_id, s.title, s.artwork_url, s.audio_url, p.display_name as artist_name, p.username as artist_username
from lyric_lines ll
join lyric_line_vibes v on v.line_id = ll.id
join songs s on s.id = ll.song_id
join profiles p on p.id = s.owner_profile_id
where v.vibe = $1 and s.status = 'live'
order by random() limit 6;
```

---

## 6. `compose` page changes — NOT STARTED (Phase 6)

Confirmed unchanged by direct file read Aug 1, 2026:

- Song search/link (`handleSelectSong`) still does a full Firebase `songs` tree read (`get(ref(db,'songs'))`) with manual `snap.forEach` + `.toLowerCase().trim()` string matching against the searched title/artist — the exact text-matching approach flagged as Gap #5 in Section 0, not yet touched.
- Still gated by `isLicensed(result.artist)` from the old Firebase-era `useApprovedArtists` hook, not a direct `identity.isArtist` check.
- **New finding, not previously called out explicitly:** new posts from `compose` still write entirely to Firebase (`push(ref(db, 'posts'), post)`), including the `songId`/`audioUrl` link fields. This means even once song search/linking moves to Supabase, the *post* itself remains on Firebase RTDB — a second, separate migration surface not yet scoped anywhere in this document.

Planned direction, unchanged from original doc: once songs live in Postgres, `select id, audio_url from songs where owner_profile_id = ... and lower(title) = lower($1)` — or better, let the artist attach their own song directly via a picker scoped to *their own* catalog. `useApprovedArtists`/`isLicensed` simplifies to a direct `identity.isArtist` check, retiring the Firebase `adminConfig/licensedArtists` list and the `LicensedTab` admin UI that manages it (Phase 7).

---

## 7. Recommended build order

| Phase | Work | Status |
|---|---|---|
| **1** | Trigger (Section 2) + admin approval/moderation tab (Section 2A/2B) + `profiles.artist_status` columns | ✅ **Done** — merged `feat/artist-approval-supabase` → `main` (`8cdba62`), verified live in Supabase production |
| **2** | Schema + RLS + storage buckets (Section 3) | ✅ **Done** — merged `chore/track-migration-sql` → `main` (`3aa758a`), verified live in Supabase production, row counts confirmed Aug 1 |
| **3** | Self-serve upload UI + Storage wiring | ✅ **Done** — merged `feat/studio-poster-redesign` → `main`. `tsc`/`build` clean. Pending one real end-to-end production upload to fully verify (no production run logged yet). Also still pending: retiring `admin`'s `MusicTab`/`SongForm`/`LicensedTab` in favor of a general-purpose Catalog tab (see Progress Log) — scoped, not started. |
| **4** | Rewrite `/api/whisper` + `/api/tag-vibes` to write Postgres | ✅ **Done and verified.** `/api/tag-vibes` rewritten to require `songId` and persist real `lyric_lines`/`lyric_line_vibes` rows; tested end-to-end via a throwaway test song with zero risk to live data. `/api/whisper` confirmed already correct, unchanged. Now has a real caller too — `/studio`'s upload form (Phase 3). |
| **5** | Music page reads (`useSongs`, `LyricBoard`, grid, search) **and** `useSong` (karaoke detail) → Supabase | ✅ **Partially done** — merged `29ec9ab`. `useSongs`, `useSong`, discovery board, and player page all confirmed live on Supabase. `useSharedLines` and search remain Firebase/client-side, not started. |
| **6** | Posts & Engagement — `compose` song-linking, post creation, feed reads, resonate/view/echo, `useSharedLines` → Supabase | ⏳ **Schema/RLS/triggers done and verified live** (`posts`, `post_resonates`, `post_stats`, all 5 triggers, all 6 policies — see Progress Log). **App code not started**: `usePosts`/`usePost`, `compose`'s `handleSelectSong`/`handlePost`, the feed's resonate/view/echo logic, `useSharedLines`, and the feed's duplicate SRT parsing (`Tier1Player`/`SnippetIconButton`) are all still confirmed-unchanged Firebase, per direct file reads Aug 1. |
| **7** | Retire `adminConfig/licensedArtists`, `LicensedTab`, `useLicensedArtists.ts`, old Firebase `songs` tree | ⏳ Not started |

---

## 8. Open items

1. ~~**🔴 Product decision (blocking Phase 3)**~~ — ✅ **Resolved August 1, 2026.** Instant-live: an approved artist publishes songs directly, no per-song admin review. Admin approves the artist once (Section 2), never individual songs.
2. ~~**⚠️ Notifications schema**~~ — ✅ **Resolved August 1, 2026** (merged `16baa8f`). `notifyProfile()` confirmed against real schema; artist-status notifications can now be trusted to deliver.
3. ~~**🆕 Build-order risk: Phase 4 not started**~~ — ✅ **Resolved August 1, 2026.** `/api/tag-vibes` rewritten to write real `lyric_lines`/`lyric_line_vibes` rows, tested end-to-end via an isolated throwaway-song test (zero risk to live data), confirmed working including correct filler-line handling and safe re-processing. `/api/whisper` confirmed already correct, unchanged.
4. **🆕 New, Aug 1, 2026 — scoping gap, still open:** `compose`'s post-creation path (not just song-linking) is still 100% Firebase — new posts write to `push(ref(db,'posts'), post)`. This is a second migration surface (posts, not just songs) that isn't currently scoped as its own phase anywhere in this document. Worth deciding whether it's folded into Phase 6 or tracked separately, likely alongside the "still-deferred `posts` migration" mentioned in Section 5 re: `useSharedLines`.
5. **🆕 New, Aug 1, 2026 — scoping decision made, not yet built:** `admin/page.tsx`'s `MusicTab`, `SongForm`, and `LicensedTab` are being retired (not extended) in favor of a general-purpose, read-only Catalog tab — see Progress Log for full reasoning. This is now scoped but not started; folding it into Phase 3 (since both involve the same "who authors a song" boundary) or tracking it as its own small phase is an open sequencing choice, not a product question. Now that Phase 3 itself has shipped without this tab, it's effectively its own remaining task rather than something that can piggyback on Phase 3 work.
6. **🆕 New, Aug 1, 2026 — Phase 3 gap, not blocking, corrected after direct file read of `song-upload-form.tsx`:** the form does have a working retry path (`pendingSongId`/`pendingAudioUrl` state, `handleRetry`) that resumes the lyrics pipeline without restarting — this was not previously credited. The real, narrower gap: if the **Storage upload itself** (audio or artwork) fails, before any `songs` row exists, there's no retry and the partial file isn't cleaned up. A fresh submit attempt after that specific failure mode generates a new `songId` and re-uploads from scratch, orphaning the first attempt's file. Not urgent at current volume.
7. **🆕 New, Aug 1, 2026 — Phase 3 gap, not blocking:** `song-upload-form.tsx`'s stage-status text (error/success states) uses a hardcoded inline `rgba()` color rather than a CSS variable, because no `lib/tokens/emotions.ts` module exists yet to hold semantic success/error colors. Self-flagged in the component's own code comment as a stopgap. Small, isolated violation of the "all colors via CSS variables" design-system rule (Section 0-style debt) — low risk of spreading since it's currently one component, but worth fixing before other components copy the pattern.
8. **🆕 New, Aug 1, 2026 — verification gap:** Phase 3's upload pipeline has been merged and passes `tsc`/`build`, and Phase 4's route logic was separately proven correct via an isolated script — but no one has yet run a real end-to-end upload through `/studio` in production and confirmed all three tables (`songs`, `lyric_lines`, `lyric_line_vibes`) populate correctly together. Worth doing once before treating Phase 3/4 as fully verified rather than just merged.
9. ~~**🆕 New, Aug 1, 2026 — confirmed by direct file read of `app/compose/page.tsx`:** `song_stats.lyric_uses` has no write path.~~ — ✅ **Schema-level fix applied and verified August 1, 2026.** The `post_song_link_insert` trigger (Posts & Engagement schema, Progress Log) now increments `song_stats.lyric_uses` whenever a post with a real `song_id` is created. This only takes effect once `compose`'s write path actually moves to Supabase `posts` (still not started, see Phase 6 build order below) — the trigger is live and correct, but nothing calls it yet.
10. **🆕 New, Aug 1, 2026 — confirmed by direct file read of the feed (`Tier1Player`, `SnippetIconButton`):** both components independently call `get(ref(db, 'songs/{songId}'))` and run their own local `parseSRT()` client-side to find the currently-playing lyric line. This is a third, still-Firebase SRT parser — the same category of problem Gap #7 already fixed once for `useSongs`/`useSong` (which now read real `lyric_lines` rows from Supabase), just not yet applied here. Once `usePosts`/the feed read from Supabase, these two components should read `lyric_lines` via the song's `id` (already available through `useSong`) instead of re-fetching and re-parsing SRT.
12. **✅ Confirmed, Aug 1, 2026 — direct file read of `components/studio/song-upload-form.tsx`:** the Phase 3 Progress Log's claim that the upload form calls `/api/whisper` → `/api/tag-vibes` in sequence is now verified against the actual component (previously only known via the other session's self-report). `runLyricsPipeline` confirms this exactly. `/api/sync-lyrics` (Section 8, discovered same day) is **not** called anywhere in this flow — it remains a fourth, unconnected route with no known caller anywhere in the app.
13. **🆕 New, Aug 1, 2026 — confirmed by direct file read of `app/lyric-back/page.tsx`:** this page is a **second, independent post-creation entry point**, separate from `compose/page.tsx`. `handlePost` branches on whether a `postId` is present: replying to an existing post writes a child object to Firebase `posts/{postId}/echoes`; starting a fresh Lyric Back with no parent writes a **new top-level post** via `push(ref(db,'posts'), ...)` — the same Firebase write `compose` does, entirely independently. **This means the Phase 6 rewrite of `handlePost` must cover both files, not just `compose`** — migrating `compose` alone would leave `lyric-back` still creating new posts on Firebase.
14. **🆕 New, Aug 1, 2026 — confirmed by direct file read of `lyric-back/page.tsx` and `useEchoes.ts`:** there are three separate, differently-shaped "resonate" concepts across the app, not two: song-level (`song_resonates`, Section 3, live in Supabase), post-level (the feed, Firebase `analytics/{postId}/resonates/{actorId}`), and now confirmed **echo-level** (`lyric-back/page.tsx`'s `toggleResonate`, Firebase `analytics/{echoId}/resonates/{actorId}`). If echoes become real `posts` rows with `parent_post_id` under the Posts & Engagement design, echo-resonates naturally collapse into the same `post_resonates` table — but this should be an explicit design decision before Phase 6 app code is written, not an assumption.
15. **🆕 New, Aug 1, 2026 — real pre-existing product bug, confirmed by direct file read, not introduced by this migration:** `lyric-back/page.tsx`'s `promoteAndReply` navigates to `/lyric-back?postId=X&echoId=Y`, intending to let someone reply to a *specific echo*. Confirmed by reading `useEchoes.ts` that `echoId` is never read anywhere — the page always re-fetches and displays the **original top-level post** as "Responding to," discarding which reply was actually clicked. Firebase's structure is flat by design (a post has echoes; an echo can't have its own echoes), so this isn't just a missing param read, it's a structural limitation. **Design decision needed for Phase 6:** `posts.parent_post_id` on a self-referencing table naturally supports true arbitrary-depth threading for free — worth deciding explicitly whether to fix this bug as part of the migration, or intentionally preserve today's flat one-level behavior.

---

*Next step: do one real end-to-end upload through `/studio` to confirm Phase 3/4 work correctly together in production (Section 8, item 8). Alongside or shortly after, retire `admin`'s Music/SongForm/Licensed tabs in favor of the scoped Catalog tab (item 5), and begin Phase 6 (`compose` song-linking + post-creation migration, item 4).*