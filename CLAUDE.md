# MARGO — AI Assistant & Developer Rules
> Version 3.0 — August 2026
> **Read this entire file before touching any code. These are laws, not suggestions.**

---

## Stack Overview
- Framework: Next.js 16 (App Router), React 19, TypeScript 5.7
- Database: Supabase (Postgres + Realtime)
- Auth: Supabase Auth — email/OAuth accounts, httpOnly cookie session (`lib/supabase/*`)
- Audio: Cloudflare R2 (self-hosted MP3s) via `lib/audio-engine`
- APIs: Genius (lyrics/search), YouTube Data API v3, OpenAI (emotion, moderation, Suggested Lyric Back)
- Hosting: Vercel
- Analytics: Vercel Analytics (cookieless)
- Fonts: Geist Sans (UI), Lora (lyrics), Sora 700 (logo only)

---

## Project Structure
```
app/
  page.tsx                 — Landing (own nav, marketing)
  feed/page.tsx            — Main lyric feed (primary tab)
  discover/page.tsx        — Discover (Moments, catalog; primary tab)
  discover/songs/page.tsx  — Full song catalog grid
  song/[id]/page.tsx       — Karaoke / full song player (immersive)
  compose/page.tsx         — Post a lyric
  lyric-back/page.tsx      — Reply with a lyric
  post/[id]/page.tsx        — Single post thread
  messages/                — DMs
  notifications/page.tsx   — Alerts
  profile/[username]/      — Public profiles (+ songs)
  studio/page.tsx          — Artist studio uploads
  apply-artist/page.tsx    — Artist application
  settings/page.tsx        — Account settings
  admin/page.tsx           — Admin panel (NO nav — internal)
  about|contact|privacy|terms|dmca — Static / legal

components/
  margo-nav.tsx            — Desktop/shared nav
  mobile-tab-bar.tsx       — Primary tab bar (Feed / Discover / Compose / Hub / You)
  primary-tab-shell.tsx    — Keepalive panes + tab swipe
  post-card.tsx            — Feed/Discover post card
  post-card-suggested-reply.tsx — On-demand Suggested Lyric Back
  mini-player.tsx          — Global snippet mini player
  card-export-modal.tsx    — Lyric card export
  admin-trigger.tsx        — Hidden admin entry (B+G desktop, 10s press mobile)

hooks/
  usePosts.ts / usePost.ts — Feed posts (Supabase Realtime)
  useSongs.ts / useSong.ts — Catalog songs + lyric lines
  useEchoes.ts             — Lyric Backs for a post
  useIdentity.tsx          — Signed-in profile / session
  useNotifications.tsx     — Alerts
  useMessaging.tsx         — DMs

lib/
  supabase/                — Cookie clients (browser + server)
  audio-engine/            — Shared playback engine
  suggest-lyric-back.ts    — Catalog Suggested Lyric Back
  catalog-lyric-unit.ts    — Adjacent-line lyric windows
```

**Retired routes (keep redirects in `next.config.mjs`):** `/music` → `/discover`; `/music/player` → `/song/[id]`. Do not add nav links to Music.

---

## Rules

### 1. ALWAYS branch from main
Never commit directly to main. Create a feature branch, test, then merge.
```bash
git checkout -b feat/your-feature
# work
git checkout main && git merge feat/your-feature
```

### 2. ALWAYS run TypeScript check before committing
```bash
npx tsc --noEmit 2>&1 | head -20
```
Zero errors required. No exceptions.

### 3. ALWAYS use line-number Node.js scripts for file edits
Git Bash on Windows has CRLF line endings. String replacement with str_replace or regex often fails silently. Always use:
```js
const lines = fs.readFileSync(file, 'utf8').split('\n');
lines[idx] = 'new content';
fs.writeFileSync(file, lines.join('\n'), 'utf8');
```

### 4. NEVER use backticks inside node -e strings
Backticks inside node -e are interpreted by bash as command substitution. Use string concatenation instead of template literals when inside node -e.

### 5. Audio player rules
- Prefer `lib/audio-engine` (`playSnippet`, `playFull`, Media Session) over ad-hoc `new Audio()`
- Always wire Media Session before starting playback to prevent browser orange overlays
- Instant buffering: pass early audio URL (`?au=` or song page data) when linking into karaoke
- Never use unicode/emoji as visual icons — SVG only (`PlayPauseIcon`, `HeartIcon` from `components/heart-icon.tsx`)
- All colors must use CSS variables — no hardcoded hex in component code. Exception: intentional per-vibe `EMOTION_COLORS` maps

### 6. Nav rules
- Desktop: `MargoNav` (Feed, Discover, Share a Lyric, account)
- Mobile primary tabs: Feed, Discover, Compose, Hub, You — via `PrimaryTabShell` / `MobileTabBar`
- Landing (`/`) has its own marketing nav — intentional
- Song/karaoke page has its own immersive header — intentional
- Admin has NO nav — internal tool
- Never render `MargoNav` twice on the same page
- Layout already mounts global chrome; do not re-add nav inside page bodies

### 7. Data / Supabase rules
- Catalog and posts live in Supabase (not Firebase RTDB)
- Prefer Realtime subscriptions / shared hooks over one-off fetches where the page already has a pattern
- Songs: id, title, artist, artwork, audio_url, plays, lyric lines/vibes, status
- Posts: text, knowledge{song,artist}, emotion, username, timestamps, resonates, song_id, audio, lines
- Artists: `profiles.is_artist` + Studio / apply-artist flow (not Firebase `licensedArtists`)
- Plays / engagement: `lib/engagement/*`
- Schema changes: add a file under `supabase/migrations/` — never delete applied migration history

### 8. Admin access
- Desktop: press B + G simultaneously
- Mobile: press and hold anywhere for 10 seconds
- Implemented in `components/admin-trigger.tsx`, wired via `app/layout.tsx`

### 9. Styling rules
- Core app pages use inline React styles (not Tailwind utility soup)
- CSS variables defined in `app/globals.css`
- Never hardcode color hex — always `var(--gold)`, `var(--bg)`, etc.
- `-webkit-tap-highlight-color: transparent` set globally
- backdrop-filter blur on mobile must have a fallback — see MARGO_BRAND.md Rule 2
- Follow MARGO_BRAND.md Sections 14–15 for touch targets and UI standards

### 10. Minimal surgical changes
Margo has working features. Every change must be targeted.
- Never restructure a file to fix a one-line bug
- Read the relevant section before editing
- Prototype logic in a temp script before touching production files
- If unsure — ask before writing code

---

*Last updated: August 2026 — Version 3.0*
