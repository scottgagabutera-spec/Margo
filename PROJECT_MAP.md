# Margo — Project Map

Generated from a full repo file listing (July 2026). This is a working reference —
update the relevant section whenever a file's purpose changes meaningfully.

> ⚠️ **Big thing to know first:** this repo appears to contain **two separate apps**:
> 1. **The current Next.js app** — `app/`, `components/`, `hooks/`, `lib/` — this is what
>    every session so far has actually touched (admin, signin, settings, compose, feed).
> 2. **A legacy vanilla-JS app** — `js/`, `api/`, `assets/`, `index.html`, `public/*.html` —
>    old-school script files (`js/ui/admin.js` alone is **1,839 lines**, `js/media/share-sheet.js`
>    is 1,043). None of these have come up in any of our sessions.
>
> If `js/` and `api/` (the `.js` one, not `app/api`) are dead code from before the Next.js
> migration, they're worth archiving or deleting — right now they're roughly doubling your
> file count and make "what does this project consist of" much harder to answer. Flagging
> this rather than assuming — confirm before I treat them as legacy in future work.

---

## `app/` — Next.js App Router (the live app)

| File | Purpose |
|---|---|
| `page.tsx` (372) | Landing/home page |
| `layout.tsx` (207) | Root layout — fonts, providers, global shell |
| `globals.css` | Global styles |
| `about/page.tsx`, `contact/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` | Static content pages |
| `signin/page.tsx` (22) | Unified sign-in (replaces old `/artist/signin`), has `BackButton` |
| `auth/callback/page.tsx` (60) | OAuth/Supabase auth callback handler |
| `settings/page.tsx` (606) | Account settings — delete account, etc. |
| `admin/page.tsx` (980) | Admin dashboard — Posts, Music, Licensed Artists, Featured, Pages, Artists tabs; has `BackButton` |
| `apply-artist/page.tsx` (106) | In-app artist application flow (post-unified-identity model) |
| `profile/edit/page.tsx` (305) | Edit own profile |
| `profile/[username]/page.tsx` (**0 lines**) | ⚠️ **Empty file** — public profile page not yet built, or a stub/leftover. Worth confirming which. |
| `feed/page.tsx` (793) + `feed/layout.tsx` | Main feed |
| `compose/page.tsx` (549) + `compose/layout.tsx` | Post composer |
| `lyric-back/page.tsx` (810) + `lyric-back/layout.tsx` | "Lyric back" reply/echo feature |
| `music/page.tsx` (1,145) + `music/layout.tsx` | Music/discovery page |
| `music/player/page.tsx` (469) | Full-screen player view |
| `api/whisper/route.ts` (43) | Whisper AI transcription → SRT (used by admin SongForm) |
| `api/tag-vibes/route.ts` (101) | AI vibe-tagging for lyric lines |
| `api/genius/route.ts` (128) | Genius API integration (lyric lookup) |
| `api/emotion/route.ts` (64) | Emotion classification for posts |
| `api/moderate/route.ts` (53) | Content moderation |
| `api/sync-lyrics/route.ts` (59) | Lyric sync helper |
| `api/backfill-echo-counts/route.ts` (50) | Server-side backfill endpoint |
| `api/delete-account/route.ts` (75) | Account deletion (used by `/settings`) |

## `components/` — shared React components

| File | Purpose |
|---|---|
| `margo-nav.tsx` (486) | Main nav bar — **this is where the avatar dropdown work goes next** |
| `back-button.tsx` (44) | The `BackButton` just added across signin/admin/etc. |
| `auth-form.tsx` (172), `auth-provider.tsx` (34), `auth-gate-modal.tsx` (90) | Auth UI + context |
| `supabase-auth-provider.tsx` (80) | Supabase-specific auth context (part of the identity migration) |
| `avatar-upload.tsx` (139) | Profile avatar upload |
| `artist-application-form.tsx` (157) | Form used by `/apply-artist` |
| `artists-tab.tsx` (186) | Admin's "Artists" tab content |
| `admin-trigger.tsx` (49) | Likely the entry point/button that surfaces admin access |
| `card-export-modal.tsx` (569) | Export a lyric/post as a shareable image card |
| `mini-player.tsx` (548) | Persistent mini audio player |
| `audio-engine-provider.tsx` (79) | React context wrapping `lib/audio-engine` |
| `theme-provider.tsx` (11) | Theme/dark-mode context |
| `MargoLogo.tsx` (82) | Logo component |
| `heart-icon.tsx`, `play-pause-icon.tsx`, `share-button.tsx`, `username-tag.tsx` | Small shared UI pieces |
| `icons/*` (10 files) | Icon components (arrow, card, chevron, close, heart, lyric-back, music-note, share) + shared `icon-props.ts` / `index.ts` barrel |
| `ui/*` (~50 files) | **shadcn/ui component library** (button, dialog, dropdown-menu, sidebar, table, toast, calendar, carousel, chart, etc.) — standard generated primitives, not custom app logic |

## `hooks/` — data & state hooks

| File | Purpose |
|---|---|
| `useIdentity.ts` (243) | Core identity hook — extended with `artistApplication` fields per the identity migration |
| `useArtistApplication.ts` (116) | Artist application submission logic |
| `useApprovedArtists.ts` (44), `useLicensedArtists.ts` (35) | Read artist allowlists |
| `useAudioEngine.ts` (127) | Hook wrapper around `lib/audio-engine` |
| `useAuthorProfile.ts` (18) | Look up a post's author profile |
| `useEchoes.ts` (38) | Lyric-back "echoes" data |
| `usePost.ts` (24), `usePosts.ts` (39) | Single post / posts list |
| `useSong.ts` (65), `useSongs.ts` (55) | Single song / songs list |
| `useSharedLines.ts` (70) | Shared lyric lines logic |
| `use-mobile.ts` (19), `use-toast.ts` (191) | Utility hooks (duplicated in `ui/`, see flag below) |

## `lib/` — core logic, non-React

| File | Purpose |
|---|---|
| `firebase.ts` (22) | Firebase app/db init |
| `supabase.ts` (8) | Supabase client init |
| `utils.ts` (6) | Generic helpers (likely `cn()` for Tailwind) |
| `profile-lookup.ts` (76) | Username → profile resolution |
| `audio-engine/engine.ts` (611) | Core audio playback engine |
| `audio-engine/index.ts` (70) | Public entry point for the engine |
| `audio-engine/media-session.ts` (153) | Browser Media Session API integration (lock-screen controls) |
| `audio-engine/preload-cache.ts` (187) | Audio preloading/caching |
| `audio-engine/snippet-resolver.ts` (123) | Resolves which audio snippet to play |
| `audio-engine/types.ts` (229) | Shared audio engine types |
| `engagement/plays.ts` (91), `engagement/session.ts` (75) | Play-count and session tracking (feeds the admin backfill tools) |

## `api/` — ⚠️ legacy plain-JS API (not `app/api`)

| File | Purpose |
|---|---|
| `config.js`, `inspire.js`, `lyricback-og.js`, `posts.js`, `spotify.js`, `youtube.js` | Old serverless functions predating the Next.js `app/api` routes. Likely superseded — confirm before treating as dead. |

## `js/` — ⚠️ legacy vanilla-JS front end

| Subfolder | Purpose |
|---|---|
| `core/` | `app.js` (312), `brand.js`, `firebase.js`, `state.js`, `username.js` (595) — old app bootstrap/state |
| `features/` | `duet-mode.js`, `duet-sheet.js` (1,249!), `echoes.js`, `lyric-back-share.js` (1,016), `motion.js` — old feature implementations, big overlap with current `lyric-back` page |
| `media/` | GIF studio, poster studio, share-sheet, platform-picker — media export tooling (huge: `share-sheet.js` 1,043, `studio.js` 828, `gif-studio.js` 654) |
| `ui/` | `admin.js` (**1,839 lines** — the old admin panel, now replaced by `app/admin/page.tsx`), plus feed/composer UI scripts |

## `assets/` & `public/` — static assets

- `assets/css/*` — old app's stylesheets (base, composer, feed, landing, mobile, modals)
- `assets/fonts/` — Lora & Syne webfonts
- `public/*.html` — static HTML pages (about, contact, music, privacy, terms) — likely from the pre-Next.js site
- `public/*.png/ico/svg`, `favicons/` — icons, favicons, OG image, cover art

## `supabase/`

- `migrations/20260728_account_settings.sql` — the migration behind `/settings`
- `.temp/*` — local CLI cache (gitignored per the earlier `.gitignore` cleanup)

## Root-level docs & config

| File | Purpose |
|---|---|
| `docs/MARGO_GROWTH_AND_PLATFORM_PLAN.md` | Growth/platform strategy doc |
| `docs/MARGO_IDENTITY_SUPABASE_MIGRATION_PLAN.md` | The identity migration plan we've been executing |
| `docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md` | Audio engagement architecture target |
| `MARGO_RIGHTS_AND_DISCOVERY_PLAN.md` | Song rights / discovery tiers plan |
| `MARGO_BRAND.md` | Brand guidelines |
| `CLAUDE.md` | Project instructions for Claude sessions |
| `.cursor/rules/git-safety.md` | Git safety rules (for Cursor) |
| `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `vercel.json`, `database.rules.json` | Standard project config |

---

## Flags worth resolving

1. **Legacy `js/`, `api/`, `assets/`, `public/*.html`** — likely dead weight from before the Next.js migration. Confirm and archive/delete if so; this alone would cut the visible file count roughly in half.
2. **`app/profile/[username]/page.tsx` is 0 lines** — empty file. Either an unbuilt public profile page or a stray stub.
3. **Two lockfiles present**: `package-lock.json` *and* `pnpm-lock.yaml`. Usually means two package managers were used at different times — worth picking one and deleting the other to avoid dependency drift.
4. **Duplicate hooks**: `hooks/use-mobile.ts` / `hooks/use-toast.ts` vs `components/ui/use-mobile.tsx` / `components/ui/use-toast.ts` — likely shadcn's copies vs your own; check which is actually imported and remove the unused pair.
5. **`ign`, `diff.txt`, `sitemap.xml` (root) vs `public/sitemap.xml`** — small stray/duplicate files worth a quick look.