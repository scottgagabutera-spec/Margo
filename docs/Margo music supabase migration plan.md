# Margo — Music & Artist Catalog: Firebase → Supabase Migration Plan
*Draft v1 — July 2026 — Living document — last updated August 1, 2026 (Phase 4 route verified, product + admin scope decisions resolved)*

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

## 0. What audit turned up — real gaps, not hypothetical ones

Before proposing anything new, here's what's actually true in the live codebase right now, confirmed by reading the real files:

| # | Finding | Why it matters | Status |
|---|---|---|---|
| 1 | `profiles.is_artist` is **read** in 5 places (`profile/[username]`, `settings`, `useIdentity`, `profile-lookup`) but **never written** anywhere in app code | The artist-application loop was incomplete — nothing tied `artist_applications.status = 'approved'` to `profiles.is_artist = true`. | ✅ **Resolved** — `artist_application_approved` trigger now closes this loop, live in production. |
| 2 | Two parallel "who's a real artist" systems exist simultaneously | `adminConfig/licensedArtists` (Firebase, `LicensedTab`) vs. `artist_applications` (Supabase). `useApprovedArtists` bridges them by hardcoding `['margo', 'trymargo']` + querying approved applications. | ⏳ **Still open** — resolved conceptually now that approval writes `is_artist`, but `LicensedTab`/`useLicensedArtists.ts` retirement is Phase 7, not done yet. Confirmed `compose/page.tsx` still calls the old `isLicensed()` from this hook (Aug 1 file read). |
| 3 | No admin UI exists to approve/reject `artist_applications` rows | `artists-tab.tsx` predated `artist_applications` entirely, had no concept of a pending application. | ✅ **Resolved** — `artist-applications-tab.tsx` shipped, live at `/admin`. |
| 4 | Song creation (`SongForm` in admin) is 100% Firebase — admin-authored only | No self-serve upload path exists today. | ⏳ **Still open** — this is Phase 3, not started. |
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

This data came entirely from the one-time `migrate-songs-to-supabase.mjs` script (Section — see Progress Log, Phase 4 status below). No new-upload pipeline has populated any of it.

---

## 4. Upload → live pipeline — NOT STARTED (Phase 3), but unblocked

**🟢 Product decision resolved (Aug 1, 2026):** instant-live. An artist who has already been approved (Section 2's trigger) publishes songs directly — no per-song admin review. This is now settled, not open.

| Step | Where | Detail |
|---|---|---|
| 1. Apply as artist | `/apply-artist` (exists) | Unchanged |
| 2. Admin approves | `/admin` → Artists tab | ✅ **Done** — trigger from Section 2 flips `profiles.is_artist` automatically once `status='approved'` is set, live in production. Notifications on this path now also confirmed working (Section 2B). |
| 3. "Upload Song" appears | A new artist-facing route (e.g. `/upload-song`, or under the artist's own profile), gated on `identity.isArtist` | ⏳ **Not started.** Reuse `SongForm`'s field layout/copy (the UX is good), but rebuild it against Supabase — the old form itself is being retired, not extended, since it writes to Firebase and has no effect on the real catalog (see Progress Log, Aug 1 later entry). |
| 4. Upload audio + artwork | Direct-to-Storage upload from the browser (`supabase.storage.from('song-audio').upload(...)`) | ⏳ **Not started** — buckets exist and are ready (Section 3) |
| 5. Lyric/vibe pipeline | `/api/whisper` + `/api/tag-vibes` rewritten to write `lyric_lines`/`lyric_line_vibes` | ✅ **`/api/tag-vibes` rewritten and verified working, Aug 1, 2026** — see Progress Log for full test results. Requires `songId`, writes real `lyric_lines`/`lyric_line_vibes` rows, safe to re-run (delete-then-insert). `/api/whisper` unchanged (already correct — audio in, SRT out, no Postgres writes needed there). **What's still missing is a real caller** — the upload page in step 3 needs to call whisper, then this rewritten route, in sequence. |
| 6. Go live | Automatic — `status` is set to `'live'` directly by the upload flow, no separate approval step | ⏳ **Not started** — straightforward once step 3 exists, now that the instant-live decision is settled |

**Admin's role in this pipeline, now explicit:** admin approves the *artist* once (Section 2). Admin has no role in approving individual *songs*. The retired `MusicTab`/`SongForm` is being replaced by a read-only Catalog tab (Progress Log, Aug 1 later entry) for oversight, not gatekeeping.

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
| **3** | Self-serve upload UI + Storage wiring | ⏳ **Unblocked, not started.** Product decision resolved (instant-live, Aug 1). Phase 4's route is done and tested, so this can now proceed without the earlier sequencing risk. Also now scoped to include retiring `admin`'s `MusicTab`/`SongForm`/`LicensedTab` in favor of a general-purpose Catalog tab (see Progress Log). |
| **4** | Rewrite `/api/whisper` + `/api/tag-vibes` to write Postgres | ✅ **Done and verified, Aug 1, 2026.** `/api/tag-vibes` rewritten to require `songId` and persist real `lyric_lines`/`lyric_line_vibes` rows; tested end-to-end via a throwaway test song with zero risk to live data. `/api/whisper` confirmed already correct, unchanged. Only remaining piece: a real caller (Phase 3's upload page). |
| **5** | Music page reads (`useSongs`, `LyricBoard`, grid, search) **and** `useSong` (karaoke detail) → Supabase | ✅ **Partially done** — merged `29ec9ab`. `useSongs`, `useSong`, discovery board, and player page all confirmed live on Supabase. `useSharedLines` and search remain Firebase/client-side, not started. |
| **6** | `compose` song-linking → real FK / artist-owned picker | ⏳ **Not started, confirmed by direct file read Aug 1.** Also newly confirmed: post creation itself is still Firebase, not just the song-linking logic. |
| **7** | Retire `adminConfig/licensedArtists`, `LicensedTab`, `useLicensedArtists.ts`, old Firebase `songs` tree | ⏳ Not started |

---

## 8. Open items

1. ~~**🔴 Product decision (blocking Phase 3)**~~ — ✅ **Resolved August 1, 2026.** Instant-live: an approved artist publishes songs directly, no per-song admin review. Admin approves the artist once (Section 2), never individual songs.
2. ~~**⚠️ Notifications schema**~~ — ✅ **Resolved August 1, 2026** (merged `16baa8f`). `notifyProfile()` confirmed against real schema; artist-status notifications can now be trusted to deliver.
3. ~~**🆕 Build-order risk: Phase 4 not started**~~ — ✅ **Resolved August 1, 2026.** `/api/tag-vibes` rewritten to write real `lyric_lines`/`lyric_line_vibes` rows, tested end-to-end via an isolated throwaway-song test (zero risk to live data), confirmed working including correct filler-line handling and safe re-processing. `/api/whisper` confirmed already correct, unchanged.
4. **🆕 New, Aug 1, 2026 — scoping gap, still open:** `compose`'s post-creation path (not just song-linking) is still 100% Firebase — new posts write to `push(ref(db,'posts'), post)`. This is a second migration surface (posts, not just songs) that isn't currently scoped as its own phase anywhere in this document. Worth deciding whether it's folded into Phase 6 or tracked separately, likely alongside the "still-deferred `posts` migration" mentioned in Section 5 re: `useSharedLines`.
5. **🆕 New, Aug 1, 2026 — scoping decision made, not yet built:** `admin/page.tsx`'s `MusicTab`, `SongForm`, and `LicensedTab` are being retired (not extended) in favor of a general-purpose, read-only Catalog tab — see Progress Log for full reasoning. This is now scoped but not started; folding it into Phase 3 (since both involve the same "who authors a song" boundary) or tracking it as its own small phase is an open sequencing choice, not a product question.

---

*Next step: build Phase 3 — the artist-facing upload page (instant-live, gated on `identity.isArtist`), reusing `SongForm`'s UX but rebuilt against Supabase + Storage, calling `/api/whisper` then the now-proven `/api/tag-vibes`. Alongside or shortly after, retire `admin`'s Music/SongForm/Licensed tabs per item 5 above.*