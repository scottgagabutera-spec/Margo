# Margo — Architecture

> Living high-level map for humans and coding agents.  
> Companion inventory: `PROJECT_MAP.md`. Session laws: `CLAUDE.md`. UI standards: `MARGO_BRAND.md`.  
> Prefer searchable module names over markdown links to source files (links rot).

---

## 0. How to use this doc

Update this file when **invariants**, **major modules**, or **core data flows** change.  
Do not dump per-file gotchas here — those belong in `PROJECT_MAP.md` (sparingly) or inline comments.

---

## 1. What Margo is

Margo is a **lyric-social** product: people post song lyrics tagged with emotion, resonate, Replay, and reply with another lyric (**Lyric Back**). Discovery is vibe- and moment-oriented; catalog songs support snippet play and full karaoke.

**Shape of the system**

| Layer | Choice |
|-------|--------|
| App | Next.js 16 App Router, React 19, TypeScript |
| Data / auth | Supabase Postgres + Realtime + Auth (httpOnly cookie session) |
| Hosting | Vercel |
| Audio | Cloudflare R2 MP3s via `lib/audio-engine` |
| AI | OpenAI (emotion, moderation, Suggested Lyric Back ranking); Genius for external lyric search |

**Primary surfaces:** Feed · Discover · Compose / Lyric Back · `/song/[id]` karaoke · Profiles · Messages · Notifications · Studio · Admin.

**Retired routes (redirects only):** `/music` → `/discover`; `/music/player` → `/song/[id]` (`next.config.mjs`).

---

## 2. Codemap

| Area | Responsibility | Key modules |
|------|----------------|-------------|
| Shell / tabs | Global chrome, keepalive panes, tab swipe | `app/layout.tsx`, `components/primary-tab-shell.tsx`, `components/mobile-tab-bar.tsx`, `components/margo-nav.tsx`, `hooks/useTabSwipe.tsx`, `hooks/usePrimaryTabSwipeGesture.ts` |
| Feed | Lyric posts + Replays | `app/feed/page.tsx`, `components/post-card.tsx`, `hooks/usePosts.ts`, `hooks/useRecentReplays.ts`, `lib/feed-replay-map.ts` |
| Discover / catalog | Moments, song grid, karaoke | `app/discover/page.tsx`, `app/discover/songs/page.tsx`, `app/song/[id]/page.tsx`, `hooks/useSongs.ts`, `hooks/useSong.ts`, `hooks/useLyricMoments.ts`, `lib/catalog-lyric-unit.ts`, `components/catalog-grid.tsx` |
| Compose / Lyric Back | Create posts and replies | `app/compose/page.tsx`, `app/lyric-back/page.tsx`, `lib/search-margo-songs.ts`, `components/compose-line-picker.tsx`, `app/api/genius/route.ts`, `app/api/emotion/route.ts` |
| Suggested Lyric Back | On-demand catalog reply suggestions | `components/post-card-suggested-reply.tsx`, `app/api/suggest-lyric-back/route.ts`, `lib/suggest-lyric-back.ts` |
| Card export / share card | PNG lyric cards + analytics | `components/card-export-modal.tsx`, `lib/engagement/card-exports.ts`, table `card_exports` (`supabase/migrations/20260815_card_exports.sql`) |
| Auth / identity | Cookie session, profiles, gates | `lib/supabase/*`, `components/supabase-auth-provider.tsx`, `hooks/useIdentity.tsx`, `app/api/auth/*`, `components/auth-gate-modal.tsx` |
| Audio | Snippets, queue, full play, Media Session | `lib/audio-engine/*`, `components/mini-player.tsx`, `components/audio-engine-provider.tsx`, `hooks/useAudioEngine.ts` |
| Social | DMs, alerts, follows | `app/messages/*`, `app/notifications/page.tsx`, `hooks/useMessaging.tsx`, `hooks/useNotifications.tsx` |
| Studio / artists | Uploads, applications | `app/studio/page.tsx`, `app/apply-artist/page.tsx`, `components/studio/song-upload-form.tsx`, `hooks/useApprovedArtists.ts` |
| Trust & safety | Content moderation + copyright agent | `app/api/moderate/route.ts`, `app/dmca/page.tsx`, `components/post-reports-tab.tsx`, `app/api/admin/post-reports/route.ts`, `app/api/admin/artist-moderation/route.ts` |
| Admin | Internal ops | `app/admin/page.tsx`, `app/api/admin/*`, `lib/admin-auth.ts`, `lib/admin-overview-kpis.ts` |
| Schema | Applied history | `supabase/migrations/*` |

---

## 3. Major data flows

### 3.1 Post: Compose → Supabase → Feed

1. `app/compose/page.tsx` — catalog-first search (`lib/search-margo-songs.ts`) and/or Genius (`app/api/genius/route.ts`).
2. Emotion classify (`app/api/emotion/route.ts`); text check (`app/api/moderate/route.ts`).
3. Insert into `posts` (and related line timing via `lib/post-lines.ts` / `post_lines` when applicable).
4. `hooks/usePosts.ts` Realtime / fetch → `components/post-card.tsx` on `app/feed/page.tsx`.

### 3.2 Lyric Back

1. `app/lyric-back/page.tsx` creates a reply post linked to the parent.
2. Echo counts / notifications update (`notifications` lyric-back type).
3. Thread read via `hooks/useEchoes.ts` and `app/post/[id]/page.tsx`.

### 3.3 Suggested Lyric Back

1. User taps underline on Feed card → `components/post-card-suggested-reply.tsx` (fetch **only on tap**, not on Feed load).
2. `POST app/api/suggest-lyric-back/route.ts` with `postIds` (batch capped by `SUGGEST_BATCH_MAX`).
3. `lib/suggest-lyric-back.ts`:
   - Load active posts; build eligible catalog units from `lib/catalog-lyric-unit.ts`.
   - Rank with `gpt-4o-mini` (`best` + `bestOtherSong`).
   - Soft cross-song diversity assemble into final picks.
   - Cache **successful non-empty** results only (`suggest_lyric_back_cache`); never cache empty/hard failure.
4. Accept → navigate to `app/lyric-back/page.tsx` with query params.

### 3.4 Discover Moment → snippet → karaoke

1. Moments from `hooks/useLyricMoments.ts` / catalog units.
2. `lib/audio-engine` `playSnippet` → `components/mini-player.tsx`.
3. Full track: `app/song/[id]/page.tsx` + `playFull`.

### 3.5 Auth gate

1. Gated action → `useAuthGate` / `components/auth-gate-modal.tsx`.
2. Session via `lib/supabase/client.ts` + `app/api/auth/*` (httpOnly cookies).
3. Profile state in `hooks/useIdentity.tsx` / `IdentityProvider` in `app/layout.tsx`.

### 3.6 Card export

1. Card action opens `components/card-export-modal.tsx` (Feed, Compose, Lyric Back, post, profile, song).
2. After PNG download, fire-and-forget `recordCardExport` in `lib/engagement/card-exports.ts` → `card_exports` (must not block download).

---

## 4. Architectural invariants

### Do

- Require **real identity** for gated actions (resonate, post, DM, export analytics when signed in, etc.).
- Keep Suggested Lyric Back **on-demand**; no auto-batch LLM on Feed mount.
- Treat **Supabase** as source of truth for posts, songs, profiles, engagement.
- Use a **single** audio engine path (`lib/audio-engine`); wire Media Session to real playback.
- Prefer SVG icons (`PlayPauseIcon`, `HeartIcon`) and CSS variables (`app/globals.css`).
- Keep primary tabs (Feed / Discover / …) on the keepalive shell with scroll freeze + Realtime pause when hidden.
- Add schema only via new files under `supabase/migrations/` — never rewrite applied history.
- Branch from `main`; run `npx tsc --noEmit` before commit.

### Don't

- Add new **anonymous-actor** identity models for product features.
- Auto-fire LLM / suggest ranking for every visible Feed card on load.
- Treat Firebase RTDB as live catalog/feed truth (leftover Firebase only in explicit one-shots such as `app/api/admin/featured/import-rtdb/route.ts`).
- Revive `/music` as a nav destination (redirects stay; pages removed).
- Reintroduce the Feed **panel-strip / swipe-row** PostCard experiment from abandoned PR **#85** without a fresh, approved design pass. It was tried (tiles → Stories pages → Discover-width reading measure) and did not ship; do not silently revive it from residual memory or old branches.
- Delete or “squash away” applied migration SQL.

---

## 5. Cross-cutting notes

| Concern | Where |
|---------|--------|
| Cookie session | `lib/supabase/cookie-options.ts`, `client.ts`, `server.ts`, `app/api/auth/*` |
| Same-tab auth sync | `lib/supabase/auth-broadcast.ts` |
| Tab swipe motion | `lib/tab-swipe-motion.ts` + primary-tab hooks |
| Account wipe | `lib/purge-user-account.ts`, `app/api/delete-account/route.ts` |
| Copyright agent page | `app/dmca/page.tsx` (policy + designated-agent contact); Terms/Privacy link here |
| OpenAI moderation on write | `app/api/moderate/route.ts` (Compose / edit paths) |

---

## 6. Where detail lives

| Need | Doc / place |
|------|-------------|
| File inventory + Careful notes | `PROJECT_MAP.md` |
| Coding session rules | `CLAUDE.md` |
| Visual / touch / brand rules | `MARGO_BRAND.md` |
| Shipped migration narratives | `docs/*` (many stamped ARCHIVE — verify code before planning from them) |
| Rights / growth strategy | `MARGO_RIGHTS_AND_DISCOVERY_PLAN.md`, `docs/MARGO_GROWTH_AND_PLATFORM_PLAN.md` |

---

*Last updated: August 2026*
