# MARGO — AI Assistant & Developer Rules
> Version 2.0 — May 2026
> **Read this entire file before touching any code. These are laws, not suggestions.**

---

## Stack Overview
- Framework: Next.js 16 (App Router), React 19, TypeScript 5.7
- Database: Firebase Realtime Database
- Auth: Anonymous — auto-generated usernames, no accounts
- Audio: Cloudflare R2 (self-hosted MP3s)
- APIs: Genius (lyrics/search), YouTube Data API v3, OpenAI (emotion + moderation)
- Hosting: Vercel
- Analytics: Vercel Analytics (cookieless)
- Fonts: Lora (self-hosted), Syne 800 (logo only)

---

## Project Structure
```
app/
  page.tsx              — Landing page (own nav, marketing)
  feed/page.tsx         — Main feed (MargoNav)
  music/page.tsx        — Music catalog (MargoNav)
  music/player/page.tsx — Karaoke player (own header, immersive)
  compose/page.tsx      — Post a lyric (MargoNav)
  lyric-back/page.tsx   — Reply with a lyric (MargoNav)
  about/page.tsx        — About (MargoNav)
  contact/page.tsx      — Contact (MargoNav)
  privacy/page.tsx      — Privacy policy (MargoNav)
  terms/page.tsx        — Terms of use (MargoNav)
  admin/page.tsx        — Admin panel (NO nav — internal tool)

components/
  margo-nav.tsx         — Shared nav (desktop + mobile + full overlay)
  MargoLogo.tsx         — Logo component (3 tiers: mark, symbol, lockup)
  play-pause-icon.tsx   — Custom SVG play/pause/buffering icon
  card-export-modal.tsx — Lyric card export
  share-button.tsx      — Share sheet
  admin-trigger.tsx     — Hidden admin entry (B+G desktop, 10s press mobile)

hooks/
  useSongs.ts           — All songs from Firebase (ordered)
  useSong.ts            — Single song + SRT lyrics parser
  usePosts.ts           — Feed posts with real-time listener
  usePost.ts            — Single post
  useEchoes.ts          — Lyric Backs (replies) for a post
  useSharedLines.ts     — Most shared lyric lines per song
  useLicensedArtists.ts — Licensed artists from adminConfig
  useUsername.ts        — Anonymous username management
```

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
Backticks inside node -e are interpreted by bash as command substitution. Use `"songs/" + songId + "/plays"` string concatenation instead of template literals when inside node -e.

### 5. Audio player rules
- Always use `preload="auto"` not `preload="metadata"`
- Always check `audio.readyState >= 3` before calling `audio.play()`
- Use `canplaythrough` event as fallback when readyState < 3
- Always wire Media Session API before audio.play() to prevent browser orange overlay
- Audio effect must run ONCE on mount — dependency array `[]` with earlyAudioUrl from URL params
- earlyAudioUrl passed as `?au=` param from music page links for instant buffering

### 6. MargoNav rules
- MargoNav is used on: feed, music, compose, lyric-back, about, contact, privacy, terms
- Landing page (/) has its own custom nav — intentional, do not replace
- Music player has its own header — intentional, immersive experience
- Admin has NO nav — internal tool
- Never render MargoNav twice on the same page
- music/page.tsx renders MargoNav in BOTH loading state and main return — both are correct

### 7. Firebase rules
- All Firebase reads use real-time listeners (onValue) not one-time gets
- songs/ node: id, title, artist, artwork, audioUrl, youtubeId, plays, resonates, lyricUses, order, status
- posts/ node: text, knowledge{song,artist}, emotion, username, timestamp, resonates, songId, audioUrl
- adminConfig/licensedArtists: array of certified artist objects
- lyricUses increments in compose/page.tsx when post is created with linkedSongId
- plays increments in music/player/page.tsx when audio first plays (once per session)
- Firebase permission_denied on plays transaction = Firebase security rules need updating

### 8. Admin access
- Desktop: press B + G simultaneously
- Mobile: press and hold anywhere for 10 seconds
- Implemented in components/admin-trigger.tsx, wired via app/layout.tsx

### 9. Styling rules
- All styling uses inline React styles — no Tailwind classes in core app pages
- CSS variables defined in app/globals.css
- Never hardcode color hex values — always use var(--gold), var(--bg) etc.
- -webkit-tap-highlight-color: transparent set globally in globals.css
- backdrop-filter blur on mobile must have fallback — see MARGO_BRAND.md Rule 2

### 10. Minimal surgical changes
Margo has working features. Every change must be targeted.
- Never restructure a file to fix a one-line bug
- Read the relevant section before editing
- Prototype logic in a temp script before touching production files
- If unsure — ask before writing code

---

*Last updated: May 2026 — Version 2.0*
