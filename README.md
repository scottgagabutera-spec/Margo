# Margo

Margo is a social platform where people communicate through song lyrics. Post a lyric, pick the feeling behind it, and the platform identifies the song. Others resonate, or reply with their own lyric — a Lyric Back. The whole conversation stays inside music.

Live at [trymargo.com](https://trymargo.com)

---

## What Makes Margo Unique

- **Lyric Back** — Reply to any lyric with your own lyric. No comments, no text — only music.
- **Anonymous by design** — Random usernames (Guitar#4821). Focus stays on the lyric, not identity.
- **Emotion first** — Every post is tagged with a feeling. The platform is organized around human emotion.
- **Original music** — Margo creates and publishes its own songs, available on all major streaming platforms with full karaoke player and lyric sync.
- **Lyric intelligence** — The platform tracks which specific lines get shared most, making lyrics a measurable signal of intent.
- **Licensed artist system** — Infrastructure already built for independent artists to join under agreement.

---

## Core Loop

1. Search a lyric, song, or artist name
2. Margo identifies the song via Genius API
3. Pick the feeling behind it (Love, Heartbreak, Hope, Nostalgia, Healing, Joy, Rage, Loneliness, Send It, Let Out)
4. Post it — links to official streaming platforms attach automatically
5. Others resonate with one tap
6. Others reply with their own lyric — a Lyric Back
7. Every post can be exported as a visual card, GIF, or shared as a deep link

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5.7 |
| Database | Firebase Realtime Database |
| Auth | Anonymous — auto-generated usernames, no accounts |
| Icons | PlayPauseIcon, HeartIcon — custom SVG components only |
| Audio | Cloudflare R2 (self-hosted MP3s) via audio.trymargo.com (edge caching enabled) |
| APIs | Genius, YouTube Data API v3, OpenAI |
| Hosting | Vercel |
| Analytics | Vercel Analytics (cookieless) |
| Fonts | Lora (self-hosted), Syne 800 (logo only) |

---

## Pages

| Route | Description |
|-------|-------------|
| / | Landing page |
| /feed | Main lyric feed |
| /music | Music catalog with featured hero song |
| /music/player | Full karaoke player with lyric sync |
| /compose | Post a lyric |
| /lyric-back | Reply with a lyric |
| /about | About Margo |
| /contact | Contact and investor info |
| /privacy | Privacy policy |
| /terms | Terms of use |
| /admin | Admin panel (hidden — B+G desktop, 10s press mobile) |

---

## Project Structure

```
app/                    Next.js App Router pages
components/             Shared React components
  margo-nav.tsx         Global nav (desktop + mobile + full page overlay)
  MargoLogo.tsx         Logo (3 tiers: mark, symbol, lockup)
  play-pause-icon.tsx   Custom SVG play/pause icon
  heart-icon.tsx        Custom SVG heart/resonate icon
  card-export-modal.tsx Lyric card export
  admin-trigger.tsx     Hidden admin entry trigger
hooks/                  Firebase data hooks
  useSongs.ts           All songs
  useSong.ts            Single song + SRT parser
  usePosts.ts           Feed posts
  useEchoes.ts          Lyric Backs
  useSharedLines.ts     Most shared lines per song
  useLicensedArtists.ts Licensed artists
  useUsername.ts        Anonymous username
lib/                    Firebase config
public/                 Static assets
```

---

## Roadmap

### Stage 1 — Social Expression (Live)
- Lyric posts with emotion tagging
- Automatic song identification via Genius
- Streaming links — YouTube, Spotify, Apple Music, Audiomack, Boomplay
- Resonate and Lyric Back
- Visual card export and deep link sharing
- Anonymous usernames — no account required
- Original Margo music with karaoke player
- Admin panel with song and artist management

### Stage 2 — Social Discovery (In Progress)
- Licensed independent artists joining the platform
- Certified artist tier system
- Music stats — plays, resonates, lyric uses per song
- Hero song determined by engagement, not manual order

### Stage 3 — Social Streaming (Long Term)
- Full licensed streaming
- Artist monetization
- Community-driven charts and trends
- Label and rights holder partnerships

---

## Development

```bash
npm install
npm run dev        # localhost:3000
npx tsc --noEmit   # TypeScript check — must be zero errors before commit
```

**Read CLAUDE.md and MARGO_BRAND.md before writing any code.**

---

## Contact

[trymargo.com](https://trymargo.com)
contact@trymargo.com
[linkedin.com/company/trymargo](https://linkedin.com/company/trymargo)
