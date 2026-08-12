# Margo

Margo is a social platform where people communicate through song lyrics. Post a lyric, pick the feeling behind it, and others resonate — or reply with their own lyric (a Lyric Back). The whole conversation stays inside music.

Live at [trymargo.com](https://trymargo.com)

---

## What Makes Margo Unique

- **Lyric Back** — Reply to any lyric with your own lyric. No comments — only music.
- **Accounts + identity** — Profiles, follows, DMs, and optional artist Studio. Guest browse is allowed; gated actions require sign-in.
- **Emotion first** — Every post is tagged with a feeling. Discovery is organized around vibe and lyric moments.
- **Original + independent catalog** — Margo originals and verified artists, with full karaoke on `/song/[id]`.
- **Suggested Lyric Back** — On-demand catalog suggestions from Feed cards.
- **Lyric intelligence** — Shared lines and catalog units power Discover Moments and suggestions.

---

## Core Loop

1. Search a lyric, song, artist, or person
2. Pick or confirm the song (catalog-first; Genius for external lookup)
3. Tag the feeling and post
4. Others resonate, Replay, or Lyric Back
5. Export a visual card or share a deep link
6. Discover Moments and songs on Discover; play full karaoke on `/song/[id]`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5.7 |
| Database | Supabase (Postgres + Realtime) |
| Auth | Supabase Auth — httpOnly cookie session |
| Icons | PlayPauseIcon, HeartIcon — custom SVG only |
| Audio | Cloudflare R2 via `lib/audio-engine` |
| APIs | Genius, YouTube Data API v3, OpenAI |
| Hosting | Vercel |
| Analytics | Vercel Analytics (cookieless) |
| Fonts | Geist Sans (UI), Lora (lyrics), Syne 600 (logo) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/feed` | Main lyric feed |
| `/discover` | Discover Moments + catalog entry |
| `/discover/songs` | Full song grid |
| `/song/[id]` | Karaoke / full player |
| `/compose` | Post a lyric |
| `/lyric-back` | Reply with a lyric |
| `/post/[id]` | Post thread |
| `/messages` | DMs |
| `/notifications` | Alerts |
| `/profile/[username]` | Public profile |
| `/studio` | Artist uploads |
| `/apply-artist` | Artist application |
| `/settings` | Account settings |
| `/about` `/contact` `/privacy` `/terms` `/dmca` | Static / legal |
| `/admin` | Admin (hidden — B+G desktop, 10s press mobile) |

`/music` and `/music/player` permanently redirect to Discover / `/song/[id]`.

---

## Project Structure

```
app/                 Next.js App Router
components/          Shared UI (nav, cards, mini-player, admin)
hooks/               Supabase data + identity hooks
lib/                 Audio engine, Supabase clients, suggest/catalog helpers
supabase/migrations/ Schema history (keep applied files)
docs/                Plans — many are shipped; see status banners
public/              Static assets
```

**Read CLAUDE.md and MARGO_BRAND.md before writing any code.**

---

## Development

```bash
npm install
npm run dev        # localhost:3000
npx tsc --noEmit   # must be zero errors before commit
```

Always branch from `main`. Never commit secrets (`.env`).

---

## Contact

[trymargo.com](https://trymargo.com)  
contact@trymargo.com  
[linkedin.com/company/trymargo](https://linkedin.com/company/trymargo)
