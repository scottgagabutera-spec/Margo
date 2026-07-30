# Margo — Music & Artist Catalog: Firebase → Supabase Migration Plan
*Draft v1 — July 2026 — Living document*

**Purpose:** move songs, lyric lines/vibes, and song engagement fully onto Supabase, connected directly to `profiles` — no separate `artists` table, no Tier 1/2/3 licensing distinction. An artist is a `profiles` row with `is_artist = true`. This is the next phase after the identity migration (`MARGO_SUPABASE_MIGRATION_PLAN.md`), and it supersedes the Tier-based sections of `MARGO_TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md` (Section 5) and `MARGO_RIGHTS_AND_DISCOVERY_PLAN.md` (Section 1.3) — those documents' *audio engine* and *legal-foundation* content still stands; their *artist-tier* content is replaced by this doc.

**Standards:** GIANTS WAY · MODERN · PREMIUM · UNIQUE FOR MARGO · LONG TERM · USER EXPERIENCE · CONSISTENCY · VERY LOGICAL · MOBILE FIRST · APP READY

---

## 0. What audit turned up — real gaps, not hypothetical ones

Before proposing anything new, here's what's actually true in the live codebase right now, confirmed by reading the real files:

| # | Finding | Why it matters |
|---|---|---|
| 1 | `profiles.is_artist` is **read** in 5 places (`profile/[username]`, `settings`, `useIdentity`, `profile-lookup`) but **never written** anywhere in app code | The artist-application loop is currently incomplete — something outside git (manual Studio edit, or an untracked trigger) is the only thing that could be flipping this today. No visible mechanism ties `artist_applications.status = 'approved'` to `profiles.is_artist = true`. |
| 2 | Two parallel "who's a real artist" systems exist simultaneously | `adminConfig/licensedArtists` (Firebase, managed by `LicensedTab` in admin) vs. `artist_applications` (Supabase, the new system). `useApprovedArtists` bridges them by hardcoding `['margo', 'trymargo']` + querying approved applications — but the admin UI still writes to the *old* Firebase list, disconnected from the new table. These can silently drift apart. |
| 3 | No admin UI exists to approve/reject `artist_applications` rows — **confirmed** | `components/artists-tab.tsx` reviewed. It is a **third, separate system**: it moderates a Firebase `artists/{uid}` node (`status: active/warned/frozen/removed`) and its own inline copy states "Artists get access immediately on signup" — meaning it predates `artist_applications` entirely and has no concept of a pending application. It cannot approve anything; it only warns/freezes/removes artists who are already active. Nothing in the app sets `artist_applications.status = 'approved'`. |
| 4 | Song creation (`SongForm` in admin) is 100% Firebase — admin-authored only | There is no self-serve upload path at all today. Every song is manually entered by the admin, including audio URL, artwork URL, and streaming links. The Whisper (`/api/whisper`) and vibe-tagging (`/api/tag-vibes`) pipelines write directly to `songs/{id}.srt` and `songs/{id}.lineVibes` in Firebase. |
| 5 | `compose/page.tsx` links a post to a song via **text matching**, not a foreign key | `handleSelectSong` scans the entire Firebase `songs` tree client-side, comparing lowercased title/artist strings, to find `linkedSongId`. This only works because song catalog is small and admin-curated with clean titles — it will misfire increasingly as a real self-serve catalog grows (typos, duplicate titles, featuring artists, etc.). |
| 6 | `useSongs` and `useSharedLines` are unchanged Firebase RTDB, as already known | Confirmed no drift since the earlier review — still full-tree listener, still client-side SRT parsing, still O(n) post-scanning for shared lines. |
| 7 | `useSong.ts` (singular, single-song detail — the karaoke player's data source) is a **second, independent** Firebase reader with its **own duplicated SRT/plain-lyrics parser**, separate from `LyricBoard`'s parsing logic in `useSongs`/`app/music/page.tsx` | Two parsers reading the same underlying shape means a parsing bug fix in one place can silently not apply to the other. Once `lyric_lines` is a real table (Section 3), both call sites become simple `select` queries and the duplicated parser logic is deleted entirely — not migrated, removed. |
| 8 | `useLicensedArtists.ts` (the Firebase predecessor to `useApprovedArtists.ts`) still exists in the repo, identical `{ artists, isLicensed, loading }` shape and hardcoded fallback names | **Confirmed dead code** — `git grep -rn "useLicensedArtists" -- app/ components/` returns zero matches. Safe to delete in Phase 7 (or sooner, as a one-line cleanup folded into any open branch) — no live inconsistency, just an unused leftover from the `useApprovedArtists` swap. |
| 9 | `ArtistsTab` moderates a **third, independent artist concept** — Firebase `artists/{uid}` with `active/warned/frozen/removed` status, `agreedToRightsWarranty`, `email`, `displayName` — entirely separate from both `adminConfig/licensedArtists` and `artist_applications`/`profiles.is_artist` | This is a real moderation feature (warn, freeze, remove, with a reason shown to the artist and a Firebase notification pushed) — worth keeping the *concept*, not the storage. It needs a Supabase home so it operates on the same `profiles` row as everything else, rather than a fourth place an artist's standing could live. See Section 2A below. |

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
     songs (new)
       ↑
       │ song_id
       │
  lyric_lines (new) ──< lyric_line_vibes (new)
```

This also directly answers "where does the artist come from" for the compose flow and music page: it's always `profiles`, never a second identity system.

---

## 2. Closing Gap #1 — the missing `is_artist` trigger

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
- **`artist_applications.reviewed_at` already exists** and is currently written by nothing in the app — a clean signal this was planned for from the start, just never wired to an admin action. The trigger below sets it.
- **`profiles` already has `followers_count`/`following_count`/`posts_count` as denormalized integer counters**, updated by triggers presumably (per the identity migration doc's follow system). `song_stats` in Section 3 follows the exact same pattern already established here — consistent with existing conventions, not a new one.
- **Firebase `artists/{uid}` does not exist** — confirmed from the live RTDB tree (`adminConfig`, `analytics`, `engagement`, `pages`, `postStats`, `posts`, `songPlays`, `songResonates`, `songStats`, `songs`, `vibeIndex` — no `artists`). Since only Margo/Trymargo has ever posted, `ArtistsTab` has nothing to moderate yet. **The backfill concern in the original Section 2A draft is resolved — there is nothing to migrate.** The new `profiles.artist_status` columns start clean.

## 2B. Consolidating the moderation concept (`ArtistsTab`'s real job)

`ArtistsTab`'s warn/freeze/remove functionality is worth preserving — it's a real, working feature (reason shown to the artist, notification pushed, filter by status). But it currently operates on a fourth data location (`artists/{uid}` in Firebase) that has no relationship to `profiles` or `artist_applications` at all. Consolidate onto `profiles`:

```sql
alter table public.profiles
  add column if not exists artist_status text not null default 'active'
    check (artist_status in ('active', 'warned', 'frozen', 'removed')),
  add column if not exists artist_status_reason text,
  add column if not exists artist_status_updated_at timestamptz;
```

- `artist_status` only means anything when `is_artist = true` — no separate table needed, same reasoning as Section 1.
- The warn/freeze/remove admin actions become simple `profiles` updates instead of a Firebase `artists/{uid}` write, and the "notify the artist" step becomes a row in whatever the eventual Supabase notifications table is (per `MARGO_IDENTITY_SUPABASE_MIGRATION_PLAN.md`'s existing notifications work — reuse that, don't build a second notification path).
- `frozen`/`removed` should also gate song visibility: add `and p.artist_status = 'active'` to the `songs` RLS "public reads live songs" policy (Section 3) so a frozen artist's catalog stops surfacing publicly without deleting anything.
- Existing Firebase `artists/{uid}` rows would have needed a one-time backfill into these new `profiles` columns before `ArtistsTab` is cut over — **confirmed not needed**: the node doesn't exist in the live database (Section 2A), so `profiles.artist_status` simply starts at its `'active'` default for every artist going forward.

**Net result:** one admin tab, rebuilt against Supabase, that does two things — approve/reject pending `artist_applications` (new, doesn't exist today) and warn/freeze/remove already-approved artists (ported from `ArtistsTab`'s existing, working logic). Retire the Firebase `artists/{uid}` node once the backfill is verified.

---

## 3. Schema — songs, lyrics, vibes, engagement

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
```

### RLS policies

```sql
alter table public.songs enable row level security;
alter table public.lyric_lines enable row level security;
alter table public.lyric_line_vibes enable row level security;
alter table public.song_plays enable row level security;
alter table public.song_resonates enable row level security;
alter table public.song_stats enable row level security;

-- Public can read live/coming-soon songs; owner can read all their own (incl. drafts)
create policy "public reads live songs" on public.songs
  for select using (status in ('live', 'coming_soon') or owner_profile_id = auth.uid());

-- Only artists can insert, only into their own profile_id
create policy "artists insert own songs" on public.songs
  for insert with check (
    owner_profile_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and is_artist = true)
  );

create policy "owner updates own songs" on public.songs
  for update using (owner_profile_id = auth.uid());

-- Lyric lines/vibes follow the parent song's visibility
create policy "read lines of visible songs" on public.lyric_lines
  for select using (
    exists (select 1 from public.songs s where s.id = song_id and (s.status in ('live','coming_soon') or s.owner_profile_id = auth.uid()))
  );

create policy "owner writes own lines" on public.lyric_lines
  for all using (
    exists (select 1 from public.songs s where s.id = song_id and s.owner_profile_id = auth.uid())
  );

-- Engagement — public read (for stats), write only as self
create policy "public reads song_stats" on public.song_stats for select using (true);

create policy "authenticated writes own resonate" on public.song_resonates
  for all using (actor_id = coalesce(auth.uid()::text, actor_id));
```

*(Vibes and plays policies follow the same shape — omitted for brevity, same pattern applies.)*

### Storage buckets

```sql
insert into storage.buckets (id, name, public) values ('song-audio', 'song-audio', true);
insert into storage.buckets (id, name, public) values ('song-artwork', 'song-artwork', true);
```
RLS on `storage.objects`: artist can upload/update only into a path prefixed with their own `auth.uid()` (e.g. `song-audio/{uid}/{songId}.mp3`), public can read.

---

## 4. Upload → live pipeline

| Step | Where | Detail |
|---|---|---|
| 1. Apply as artist | `/apply-artist` (exists) | Unchanged |
| 2. Admin approves | Admin UI (needs confirming/building — see Gap #3) | Trigger from Section 2 flips `profiles.is_artist` automatically once `status='approved'` is set |
| 3. "Upload Song" appears | Profile page or a new `/upload-song` route, gated on `identity.isArtist` | New UI — reuse `SongForm`'s field layout/copy, but write to Supabase + Storage instead of Firebase |
| 4. Upload audio + artwork | Direct-to-Storage upload from the browser (`supabase.storage.from('song-audio').upload(...)`) | `songs` row created with `status='draft'` first, then updated with URLs |
| 5. Lyric/vibe pipeline | `/api/whisper` + `/api/tag-vibes` — **need rewriting** to write `lyric_lines`/`lyric_line_vibes` rows instead of one `srt` string + `lineVibes` object | Same AI calls, different write target. This is real work, not a config change — worth its own branch. |
| 6. Go live | Artist (or admin, if review-before-publish is wanted) sets `status='live'` once audio + artwork + lyric_lines exist | Simple checklist gate in the upload UI, same idea as the old admin "Go live" checklist |

**Open product question, not a code question:** should artist-uploaded songs go live immediately, or queue for admin review first (closer to the current admin-only model)? Doesn't block the schema/upload-mechanics work — can be a `status` value (`pending_review`) added later without a migration.

---

## 5. Music page rebuild — what changes for the reader

This is where the "nice music page UI" goal and the technical migration are actually the same piece of work, not two separate tasks:

- **Discovery board** (`LyricBoard`): today it downloads every song, parses every SRT client-side, shuffles in JS. Becomes one query:
  ```sql
  select ll.text, ll.start_sec, ll.end_sec, s.id as song_id, s.title, s.artwork_url, s.audio_url, p.display_name as artist_name, p.username as artist_username
  from lyric_lines ll
  join lyric_line_vibes v on v.line_id = ll.id
  join songs s on s.id = ll.song_id
  join profiles p on p.id = s.owner_profile_id
  where v.vibe = $1 and s.status = 'live'
  order by random() limit 6;
  ```
  Same discovery-by-vibe experience, but the card can now show and link to the **real artist's profile** — something the current Firebase model has no clean way to do, since `songs.artist` is just a free-text string today.
- **Song grid**: reads `songs where status='live'`, paginated (per the earlier scaling review — cap at ~24, load more). Each card can link to `/profile/{artist_username}`.
- **Search**: moves from client-side substring scan to a real Postgres `ilike`/`tsvector` query once catalog size warrants it.
- **`useSharedLines`**: becomes a real query once `posts.song_id` is a proper foreign key (depends on the separate, still-deferred `posts` migration per the identity doc — until then, this hook stays on Firebase, reading a Postgres `song_id` isn't possible from an RTDB post).

---

## 6. `compose` page changes

- Song search/link (`handleSelectSong`) stops doing text-matching against a full Firebase tree scan. Once songs live in Postgres: `select id, audio_url from songs where owner_profile_id = ... and lower(title) = lower($1)` — or better, let the artist attach their own song directly via a picker scoped to *their own* catalog, removing the fuzzy-matching problem entirely for artist-authored posts.
- `useApprovedArtists`/`isLicensed` — once every real artist is just `profiles.is_artist`, this hook's whole reason for existing (bridging two systems) goes away. Simplify to a direct `identity.isArtist` check, retire the Firebase `adminConfig/licensedArtists` list and the `LicensedTab` admin UI that manages it.

---

## 7. Recommended build order

| Phase | Work | Est. shape |
|---|---|---|
| **1** | Trigger (Section 2) + build the admin approval/moderation tab (Section 2A) + `profiles.artist_status` columns + one-time backfill from Firebase `artists/{uid}` | Small-medium, unblocks everything else. This replaces `ArtistsTab`'s Firebase reads/writes with Supabase ones — same UI shape, new backend. |
| **2** | Schema + RLS + storage buckets (Section 3) | One migration file |
| **3** | Self-serve upload UI + Storage wiring | New page/component |
| **4** | Rewrite `/api/whisper` + `/api/tag-vibes` to write Postgres | Medium — same AI logic, new persistence |
| **5** | Music page reads (`useSongs`, `LyricBoard`, grid, search) **and** `useSong` (karaoke detail) → Supabase | Medium-large, this is also the UI refresh. Delete both SRT parsers (`useSongs`'s inline parsing and `useSong`'s `parseSRT`/`parsePlainLyrics`) once both read `lyric_lines` directly — don't port the parsers, remove them. |
| **6** | `compose` song-linking → real FK / artist-owned picker | Small once Phase 5 lands |
| **7** | Retire `adminConfig/licensedArtists`, `LicensedTab`, `useLicensedArtists.ts` (confirm zero remaining call sites first), old Firebase `songs` tree | Cleanup, after a dual-write/verification window |

---

## 8. Open items before Phase 1 starts

Both prior open items are now resolved (Section 2A confirmed the real schema; the Firebase `artists/{uid}` node doesn't exist, so no backfill is needed). One remains:

1. **Product decision:** instant-live vs. admin-reviewed song publishing (Section 4) — doesn't block schema work, does affect the upload UI's final state.

Phase 1 is otherwise unblocked and can start as soon as this doc is reviewed.

---

*Next step once the two open files are in hand: write the actual migration SQL file as `supabase/migrations/{date}_songs_and_engagement.sql`, and open `feat/music-supabase` for Phase 1–2.*