# Memories program — pre-PR2 deliverables (a–f)

Locked feed architecture: **server slots API + client interleave**; **client** sends `excludeMemoryIds`, `excludePeopleIds`, `stripCount` on each slots request (no server session memory). Dismiss flags: **7 days** in `localStorage`; slot picks in `sessionStorage` until tab close.

Profile tabs (user-facing): **Lyrics**, **Memories** (PR4), **Reposts**, **Lyric Backs**, **Private**.

---

## a. Artist source comparison (Favorite artists picker, PR2)

| Source | Artwork | Name quality | Rate limits | Terms / cost | Margo today |
|--------|---------|--------------|-------------|--------------|-------------|
| **Apple Music / iTunes Search API** | Strong (CDN URLs; `compactArtworkUrl`) | Good mainstream + indie; odd spelling edge cases | Undocumented; practical ~20 req/min/IP; no auth for search | Free; no logo lock-in for search-only metadata; **cannot** store/redistribute bulk catalog | **In production** via `lib/genius-external-search.ts` + Compose |
| **Genius** | Moderate (track art varies) | Best for display names tied to lyrics | Strict per API key; 429 under load | Commercial API key; attribution expectations; lyrics text is licensed — use IDs/names/art only for picker | **In production** for compose/signature search |
| **Deezer** | Good | Solid EU/Africa catalog | Open API ~50 req/s app quota | Free tier; attribution; geo gaps vs Apple in PH/US | Not integrated |
| **MusicBrainz** | Cover Art Archive via MBID | Canonical names; weak “artist as celebrity” UX | 1 req/s etiquette | ODbL; attribute MB; art varies | Not integrated |
| **Spotify Web API** | Excellent | Excellent | Developer app approval; strict storage rules | Prohibits long-term cache of metadata/art without compliance | Links only (`artist-links`) |

**Recommendation for PR2 Favorite artists:**  
1. **Primary:** Margo `artists` / verified artist profiles (On Margo chip).  
2. **Enrichment search:** Keep **Apple iTunes Search** first (artwork + speed, already wired).  
3. **Fallback query pass:** **Genius artist search** when Apple returns &lt;5 hits (names only, reuse existing key).  
4. **Do not** add Deezer/Spotify metadata APIs in PR2 unless Apple+Genius fail UX tests in PH; adds keys and policy surface without clear win over Apple for artwork.

---

## b. Schema SQL + RLS (draft — do not apply until PR3 migration PR)

```sql
-- PR3+: memories core
create type public.memory_visibility as enum ('public', 'followers', 'only_me');
create type public.memory_date_granularity as enum ('day', 'month', 'year', 'period', 'none');

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  story text,
  mood text,
  visibility public.memory_visibility not null default 'public',
  show_in_lyrics_feed boolean not null default true,
  show_date_publicly boolean not null default true,
  date_granularity public.memory_date_granularity not null default 'none',
  date_start date,
  date_end date,
  cover_photo_id uuid,
  content_removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  position smallint not null,
  r2_key text not null,
  width int,
  height int,
  created_at timestamptz not null default now(),
  unique (memory_id, position)
);

create table public.memory_songs (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  position smallint not null,
  song_id uuid references public.songs (id) on delete set null,
  song_title text,
  artist_name text,
  lyric_excerpt text,
  is_lyric_only boolean not null default false,
  unique (memory_id, position)
);

-- PR2: favorite artists (profile)
create table public.profile_favorite_artists (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position between 0 and 9),
  artist_profile_id uuid references public.profiles (id) on delete cascade,
  catalog_artist_key text,
  display_name text not null,
  artwork_url text,
  created_at timestamptz not null default now(),
  primary key (profile_id, position),
  check (
    (artist_profile_id is not null and catalog_artist_key is null)
    or (artist_profile_id is null and catalog_artist_key is not null)
  )
);

alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.memory_songs enable row level security;
alter table public.profile_favorite_artists enable row level security;

-- memories: owner full; public read; followers read; only_me owner only
create policy memories_select on public.memories for select using (
  owner_profile_id = auth.uid()
  or (visibility = 'public' and content_removed_at is null)
  or (visibility = 'followers' and content_removed_at is null and exists (
    select 1 from public.follows f
    where f.followee_id = memories.owner_profile_id
      and f.follower_id = auth.uid()
      and f.status = 'accepted'
  ))
);

create policy memories_insert on public.memories for insert
  with check (owner_profile_id = auth.uid());

create policy memories_update on public.memories for update
  using (owner_profile_id = auth.uid());

create policy memories_delete on public.memories for delete
  using (owner_profile_id = auth.uid());

-- child tables: visible if parent memory visible (same rules via exists)
create policy memory_photos_select on public.memory_photos for select using (
  exists (select 1 from public.memories m where m.id = memory_id /* apply visibility fn */)
);

-- favorite artists: world-readable for public profiles; owner write
create policy profile_favorite_artists_select on public.profile_favorite_artists for select
  using (true);

create policy profile_favorite_artists_write on public.profile_favorite_artists for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
```

(Tighten child policies with a `security definer` function `memory_visible_to(memory_id, viewer_id)` before apply.)

---

## c. Per-PR test notes + rollback

| PR | Phone / iPad / laptop checks | Rollback |
|----|------------------------------|----------|
| **PR1** (this) | Profile shell order; silver signature pill play + tap full lyric; owner long-press; no cover banner; tabs Lyrics/Reposts/Lyric Backs/Private; desktop 2-col @ landscape | Revert PR; cover returns on profile |
| PR2 | Favorite artists picker; reorder; first 5 on profile; search On Margo | Revert migration + UI; table drop if applied |
| PR3 | Create memory 4 steps; visibility toggles | Revert migration |
| PR4 | Memory detail; profile Memories tab; resonate/lyric back/card | Revert routes + tables if needed |
| PR5 | Feed memory slots every 6 lyrics; skip empty | Feature flag off interleaver |
| PR6 | People strip @14/29…; dismiss 7d | Client flag to hide strips |
| PR7 | Notifications respect visibility | Disable triggers |

---

## d. Image size + egress (R2, WebP, lazy load)

| Asset | Upload cap | Stored | Display | Egress |
|-------|------------|--------|---------|--------|
| Memory cover | 5 MB JPEG/PNG | R2 `memories/{owner}/{id}/cover.webp` | AVIF/WebP `@2x` max 1200px long edge | Cloudflare R2 + CDN; lazy `loading="lazy"` in feed/profile |
| Memory gallery | 5 MB each, max 8 | `.../photos/{n}.webp` | Thumb 400px in strip; full in detail lightbox | Same; horizontal strip uses `srcset` |
| Favorite artist art | URL or 256px import | Store **URL** from Apple/Margo catalog, not re-host unless On Margo | 48px circles | Hotlink + cache headers |

**Pipeline:** browser `createImageBitmap` → canvas resize → WebP q≈0.82; preserve EXIF orientation server-side if upload raw. **Signed GET** for non-public memories (followers/only_me).

---

## e. Meilisearch rules

| Index | Include | Exclude |
|-------|---------|---------|
| `memories` (new) | `visibility = public`, `content_removed_at` null, owner not `is_admin` | `only_me`, `followers` rows; `show_in_lyrics_feed` irrelevant to index |
| `artists` / profiles | Existing artist docs | Unchanged; favorite artists are **profile fields**, not separate index docs in PR2 |

Sync: webhook on `memories` update → delete doc when visibility narrows or soft-delete.

---

## f. Memory reactions (PR4)

**Ship in PR4:** Resonate, Lyric Back, Card export (reuse post patterns where possible).

**Repost:** Reuse `post_reposts` only if memory is modeled as a `posts` row (rejected — memories are separate). **PR4b proposal:** defer memory repost until a thin `memory_reposts` table mirroring `post_reposts` (actor, memory_id, quote) **or** unify on a polymorphic `engagement_targets` table later. **PR4 ships without Repost** unless Scott wants PR4b in parallel.

---

## Slots API correction (feed, PR5+)

Request body/query includes: `excludeMemoryIds[]`, `excludePeopleIds[]`, `stripCount`, lyric index range. Server returns deterministic slot payloads only.

People strip resolver: ideals `14, 29, 44…`; snap ±4 with ≥2 lyrics between strip and any memory anchor; never adjacent to nudge @8.
