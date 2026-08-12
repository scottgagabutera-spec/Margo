# MARGO — Brand Identity & Design System
*Version 4.6 — August 2026 — Living document, update with every design decision*

---

## 1. What Margo Is

Margo is a music-first social platform where people communicate through song lyrics. The feeling it should create in the first second someone opens it:

> Warm. Intimate. Like discovering a song that says exactly what you couldn't.

---

## 2. Logo & Brand Mark — UNTOUCHABLE

- Mark: The gold circle with the M waveform inside
- Wordmark: MARGO in Syne 800, gold, **letter-spacing 2px**, uppercase
- Color: Always #E8C547 on dark background (logo exception; elsewhere prefer `var(--gold)`)
- Rule: Never recolor or redraw. Always use `components/MargoLogo.tsx` — never inline Syne “Margo” text as a logo
- Wordmark **scales with symbol size** (`~0.43 × size` in px) so lockups stay proportional
- Letter-spacing is **2px** (tighter than old 3–5px tracking — wide tracking reads as stretched)

### The 3 Tiers

| Tier | Name | What it is | When to use |
|------|------|-----------|-------------|
| 1 | The Mark | M in gold circle, no dash | Favicon only |
| 2 | The Symbol | M in gold circle + dash below | Nav, feed header, composer |
| 3 | The Lockup | Symbol + MARGO wordmark | Landing page nav, OG images |

The Symbol IS the Margo logo. The dash below the M is what makes it distinctly Margo.

### Logo Usage by Context

| Context | Tier | Props |
|---------|------|-------|
| Browser favicon | Mark (1) | size={16} |
| Nav bar | Symbol (2) | size={28} wordmark rings |
| Feed header | Symbol (2) | size={36} rings |
| Composer header | Symbol (2) | size={32} rings |
| Landing page nav | Lockup (3) | size={36} wordmark rings |
| Card export | Symbol (2) | size={48} |
| Profile hero | — | **No wordmark in body** — person-first; global nav clears above cover |

### Shadow & Glow Rules
- In-app: filter: drop-shadow(0 2px 8px rgba(232,197,71,0.25))
- Favicon: no shadow ever
- Ghost watermark on exports: opacity 0.18, no shadow, bottom-left always

### Rings Rules
- Rings are UI animation only — CSS rings on nav/feed/landing
- Never add rings to static exported images
- Never add rings to favicon

---

## 3. Typography — Dual system (UI + lyric)

Margo speaks in two voices:

1. **UI (Geist Sans)** — nav, buttons, handles, timestamps, labels, toasts, chrome, **song title / artist metadata**, account settings / studio / apply forms.
   CSS: `var(--font-geist-sans)` / `lib/fonts.ts` → `UI_FONT`.  
   Loaded via `geist/font/sans` (variable woff2) on the root layout.
2. **Lyric (Lora)** — posted lyric quotes, signature lyrics, lyric-led marketing lines.
   CSS: `var(--font-lora)` / `LYRIC_FONT`. Always italic for the star lyric block.
3. **Logo (Syne 800)** — MARGO wordmark ONLY via `MargoLogo`. Nothing else uses Syne.

Self-hosted via Next.js font system (`next/font` + `geist`). Do not load Inter.

### Type role grid (canonical — sanity-check new UI against this)

Pick a **role** first; do not invent one-off rem values.

| Role | Size | Weight | Color | Face | Use |
|------|------|--------|-------|------|-----|
| Hero | `clamp(2rem,5vw,3.2rem)` (landing may use larger clamp) | 300–700 | `--text` | Lora or Geist by surface | Marketing / page heroes |
| Page title | `1.5rem` | 600 | `--text` or `--gold` | Geist | Settings, Edit, Studio gates |
| Display name | `1.25rem` | 600 | `--text` | Geist | Profile only |
| Song title | `0.95–1.15rem` | 600 | `--text` | Geist | Stacked metadata |
| Lyric star | `1.1rem` | 400 italic | `--text` | **Lora** | Posted lyrics, signature lyric |
| Body | `0.95rem` | 400 | `--text` / `--text-secondary` | Geist | Paragraphs, inputs |
| Secondary | `0.82rem` | 400 | `--text-secondary` | Geist | Subtitles, help |
| Artist name | `0.75rem` | 400 | `--text-secondary` | Geist | Under song title |
| Username / meta | `0.7rem` | 400 | `--text-secondary` / muted | Geist | `@handle`, footer links, timestamps |
| Label / CTA | `0.6rem` | 600–700 | context | Geist | Uppercase chips, micro-buttons; touch ≥44px |
| **Micro body / compact explainer** | **`0.65rem`** | **400** | `--text-secondary` | Geist | Landing how-it-works body at &lt;640px; other dense 3-up strips. Line-height **1.25**. Not Body, not Secondary. |
| Floor | **never &lt; `0.6rem`** | — | — | — | Remap illegal sizes up to Label/CTA or Micro body |

Nav links (desktop): `0.75rem` / 700 / uppercase / letter-spacing ~1–2px — still Geist chrome.

> **Note:** Interactive control text is governed by Section 14 Rule 3 as refined by Section 15 — short CTAs stay `0.6–0.7rem` with ≥44px touch targets. Micro body is for **non-interactive** dense support copy only.

### Display name vs username (canonical)

| Role | Size | Weight | Color | Face |
|------|------|--------|-------|------|
| Display name | `1.25rem` | 600 | `--text` | Geist |
| @username | `0.7rem` | 400 | `--text-secondary` | Geist |

### Song title vs artist (canonical)

Always **stack** when space allows (catalog, karaoke header, SongPreview, mini-player expanded, post attribution):

| Role | Size | Weight | Color | Face |
|------|------|--------|-------|------|
| Song title | `0.95–1.15rem` | 600 | `--text` | Geist |
| Artist | `0.7–0.75rem` | 400 | `--text-secondary` | Geist |

Joined `Title · Artist` at one size is **only** for ultra-dense chrome (collapsed mini-player). Prefer `components/song-meta.tsx`.

Removed fonts (never bring back):
- Bebas Neue, DM Sans, Instrument Serif, Space Mono, Inter, Google Fonts CDN for app UI

---

## 4. Color System

All colors are CSS variables defined in app/globals.css.
NEVER hardcode a color value anywhere — always use var(--name).

### Surfaces
- --bg: #07060A (near-black, never pure black)
- --surface: #0F0E13 (cards, sheets, modals)
- --surface-2: #161420
- --surface-3: #1E1B2A
- --border: rgba(255,255,255,0.07)
- --border-hi: rgba(255,255,255,0.12)

### Text hierarchy (contrast-safe on --bg / --surface)
- **--text** (#F4F1ED) — Primary copy, display names, lyrics, hero lines.
- **--text-secondary** (#B8B6C0) — Interactive or meaningfully-read UI: @handles, secondary CTAs, action labels, timestamps users actually read, artist/caption lines when secondary to a title.
- **--text-muted** (#8A8894) — Supporting meta that is visible but not primary (song labels under a lyric card, inactive helper text, status labels like "Coming Soon").
- **--text-disabled** (#5C5A66) — Placeholders, disabled controls, and decorative fallback chrome (e.g. an icon's fallback color when no meaningful value applies) ONLY. Never for handles, CTAs, or body-secondary copy.
- **--text-on-gold** (= `var(--bg)`) — Text on gold buttons / gold fills.

**Rules:**
1. Interactive or meaningfully-read UI must use `--text-secondary` or brighter. Never `--text-disabled`, and never raw white opacity below ~0.45 for that role.
2. Type floor is **0.6rem** brand-wide for decorative/meta text (Section 3). Interactive control text follows Section 14 Rule 3 / Section 15.
3. Prefer named text tokens over ad-hoc `rgba(255,255,255,…)` greys.

**Deprecated aliases — status:**
- `--text-2` → resolves to `var(--text-secondary)`. No remaining call sites in `app/` or `components/` as of the `feat/fix-text-3-contrast` migration; alias kept in `globals.css` only for safety.
- `--text-3` → resolves to `var(--text-disabled)`. Migration (`feat/fix-text-3-contrast`) reclassified every product call site in `app/` + `components/` into `--text-secondary`, `--text-muted`, or an explicit `--text-disabled` reference. As of that migration, `--text-3` itself is no longer directly referenced in product code — alias retained in `globals.css` only as a safety net for any missed or future stragglers.
- New code must not introduce `--text-2` / `--text-3`. Use the named hierarchy above directly.
- Out of scope for that migration (unchanged, tracked separately): legacy `assets/css/*`, root `index.html`, `public/*.html` — confirmed dead/unserved, folded into a future "remove pre-Next residue" cleanup; `app/admin/page.tsx`'s raw `rgba()` usage — tracked as a later opacity-token batch, not a `--text-3` case.

Gold — The Margo Signature:
- --gold: #E8C547 (logo, buttons, active states, resonate)
- --gold-warm: #F5D46A (hover)
- --gold-2: #D4A832 (pressed)
- --gold-faint: rgba(232,197,71,0.08)
- --gold-border: rgba(232,197,71,0.28)
- --gold-glow: rgba(232,197,71,0.12)
- Use `var(--gold)` as the only gold reference in component code; never hardcode `#E8C547` or any other gold hex.

Emotion colors (Margo unique identity — never remove):
- Love: #FF6B9D
- Heartbreak: #ff6060
- Hope: #7B9FFF
- Nostalgia: #E8C547
- Healing: #4ade80
- Joy: #ffc847
- Rage: #FF6440
- Loneliness: #a0a0ff
- Send It: #00e5c8
- Let Out: #c864ff

---

## 4B. Icon System

Single family for all product UI icons (tabs, feed actions, close/back/search).

**Geometry**
- ViewBox: 24×24
- Stroke: 1.5
- Caps / joins: round
- Default: outline (stroke). Fill only for active/selected states (e.g. resonated heart, play triangle where filled is the glyph)

**Source of truth:** `components/icons/*` exported from `components/icons/index.ts`.
Do not introduce a second heart/search path with a different stroke. `components/heart-icon.tsx` is a thin adapter over the icons package for legacy `filled` prop call sites — prefer importing from `@/components/icons` in new code (see Section 13, which follows this guidance).

**No Unicode as icons** — see Section 14 Rule 1. Back / Close / Play affordances use `ArrowLeftIcon`, `CloseIcon`, `PlayIcon` / `PlayPauseIcon`.

**Semantic map**

| Feature | Icon | Notes |
|---------|------|--------|
| Feed (tab) | House (inline tab SVG) | Primary home |
| Discover (tab) | `CompassIcon` | Finding lyrics / artists / people — **not** a music note |
| Compose (tab) | Plus in gold circle | Create |
| Alerts (tab) | Bell | Notifications |
| You (tab) | Person / avatar | Profile |
| Resonate | `HeartIcon` / `HeartFilledIcon` | One heart family only |
| Lyric Back | `LyricBackIcon` | Reply curve |
| Card / share image | `CardIcon` | Export frame |
| Search | `SearchIcon` | Do not use bare Lucide Search |
| Music / playing chrome | `MusicNoteIcon` / `PlayPauseIcon` | Playback meaning only — not Discover tab |
| Back | `ArrowLeftIcon` | Word label "Back" beside icon |
| Close | `CloseIcon` | aria-label Close |

**Compliance check for any new component:** Does it import from `@/components/icons` (or PlayPauseIcon / MargoLogo)? Stroke 1.5? Correct glyph for the job? No Unicode glyph standing in as an icon? If any answer is no, it fails this section.

---
## 5. Spacing Scale

4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 88px, 120px
Never use arbitrary values outside this scale.
88px top padding = standard page content offset below fixed nav.

---

## 6. Border Radius Scale

4px=tags, 8px=small cards, 12px=cards, 16px=large cards, 24px=modals, 50px=pills

---

## 7. Animation Rules

- ease-out: cubic-bezier(0.16, 1, 0.3, 1) — elements entering
- ease-in: cubic-bezier(0.4, 0, 1, 1) — elements leaving
- fast: 150ms (hover states)
- normal: 220ms (transitions)
- slow: 300-380ms (overlays, sheets)
- ONLY animate transform and opacity — never width, height, top, left
- Always respect prefers-reduced-motion

---

## 8. Breakpoints

- Mobile first: 375px minimum design target
- Mobile: <640px — logo + gold + icon + hamburger only in nav
- Desktop: 640px+ — full nav items visible
- Touch targets: minimum 44x44px always
- -webkit-tap-highlight-color: transparent set globally in globals.css

---

## 9. Navigation System

### Marketing / desktop header nav

Desktop (640px+):
  [Logo left] ............ [Feed] [Discover] [Share a Lyric] [≡]

Mobile (<640px):
  [Logo left] ............ [+ gold circle] [≡]

Hamburger opens full-page overlay:
  - Dark background rgba(7,6,10,0.97) with blur
  - Large italic Lora links centered
  - Staggered fade-in animation
  - Gold dot on active page
  - Links: Feed, Discover, Share a Lyric, About, Contact

Active page indicator: gold underline bar (18px wide, 2px tall) below nav link.

### Primary in-app tab bar

This is distinct from the marketing header above — it's the persistent bottom tab bar used across the logged-in product. Icons and order are defined in Section 4B's semantic map:

1. **Feed** — House icon — primary home
2. **Discover** — `CompassIcon` — finding lyrics / artists / people
3. **Compose** — Plus in gold circle — create
4. **Alerts** — Bell — notifications
5. **You** — Person / avatar — profile

`music` as a standalone nav destination is retired. `next.config.mjs` permanently redirects `/music` → `/discover` and `/music/player` → `/song/[id]`. There is no live Music page in the tree. Do not add nav references to "Music"; use "Discover."

### Chrome modes (`lib/chrome-mode.ts`)

| Mode | Path | MargoNav | MobileTabBar |
|------|------|----------|--------------|
| `app` | product routes | shown | shown |
| `marketing` | `/` | hidden (landing has its own nav) | **shown** — deliberate Margo choice |
| `immersive` | `/song/[id]` | hidden | hidden |

Landing footer: two columns (product | legal), Geist `0.7rem`, social icon row; pads with `--margo-page-padding-bottom`.

---

## 10. Button System

> **Font size on interactive text:** all tiers below use Section 3's decorative type scale (0.6–0.7rem) for button copy. This is the correct, current pattern — not stale. Section 14 Rule 3's ≥1rem minimum is refined by Section 15's permanent design rule: CTA emphasis comes from color, contrast, weight, and gold, not larger type, and the **touch target** (not the font) is what must grow to ≥44px. Follow the sizing below; grow `minWidth`/`minHeight`/padding, not `fontSize`, to hit the touch-target minimum.

### Tier 1 — Primary CTA
One per screen. The unmissable action.
- Background: var(--gold) — Color: var(--bg)
- Font: Lora 700, 0.6-0.7rem, uppercase, letter-spacing 1.5px
- Padding: 14px 24px — Border-radius: 50px — Min-height: 48px

### Tier 2 — Secondary Action
- Background: var(--surface-2) — Color: var(--text-secondary)
- Border: 1px solid var(--border)
- Font: Lora 600, 0.6rem, uppercase
- Padding: 11px 16px — Border-radius: 50px

### Tier 3 — Inline Feed Action (pill)
- Background: rgba(255,255,255,0.05)
- Color: var(--text-secondary)
- Border: 1px solid rgba(255,255,255,0.10)
- Font: Lora 600, 0.6rem, uppercase, letter-spacing 1px
- Padding: 6px 14px — Border-radius: 50px — Min touch: 44px

### Tier 4 — *(reserved, not yet specified)*
No pattern currently defined for this tier. If a new button style is needed that doesn't fit Tiers 1–3 or 5, define it here rather than improvising ad hoc — don't skip straight to Tier 5.

### Tier 5 — Ghost/Dismiss
- Background: rgba(255,255,255,0.05) — Color: var(--text-disabled)
- Size: 32x32px visual, border-radius 50%, 44x44px touch target

Rules for ALL tiers:
- Font: Lora only
- Colors: CSS variables only — never hardcoded hex
- Touch target: minimum 44x44px
- Transition: all 150ms ease
- Animate only transform and opacity

---

## 11. Voice & Tone

Margo speaks like a music lover, not a tech company.

DO: "Drop a lyric back..." / "Which song answers this?" / "When words fail, drop a lyric."
DON'T: "Add a comment" / "Submit" / "No data found"

Empty states are invitations, not errors.

---

## 12. Mobile Performance Rules

### backdrop-filter
- Desktop: blur(16px) is fine
- Mobile (<640px): must be none or reduced, compensate with darker background
- Nav on mobile when menu open: background rgba(7,6,10,0.97), no blur

### Touch targets
- Minimum 44x44px on all interactive elements
- Pills and tags: min-height 28px visual, 44px touch via padding

### Feed action row (Resonate / Lyric Back / Card / Replay)
- **Hard requirement:** one horizontal row at 375px — never wrap the four actions onto a second line. Test against the longest label (**LYRIC BACK**) plus real double-digit counts.
- **Labels stay visible on mobile** — do not drop to icon-only. Shrink mobile label type (`.margo-feed-action__label`, ~0.4rem) so icon + label fit; increase label size at ≥640px.
- **Counts are compact badges** tucked on the icon corner (`.margo-feed-action__badge`), not full-size inline numbers competing with the label.
- Touch targets remain ≥44px via padding/min-height. Source: `components/post-card.tsx` + `.margo-feed-action*` in `app/globals.css`.
- `aria-label` still carries the full action name.

### Audio
- preload="auto" always — never preload="metadata"
- Pass audioUrl as ?au= URL param for instant buffering before Firebase resolves

---

## 13. Do's and Don'ts

DO:
- Use Geist Sans for UI chrome; Lora for lyric quotes; Syne only for the wordmark
- Use Syne 800 only for MARGO wordmark
- Use CSS variables for every color
- Keep gold scarce and meaningful — it means something important
- Test on 375px mobile first
- Update this document before merging any design changes
- Use components/MargoLogo.tsx for all logo instances
- Use components/play-pause-icon.tsx for all play/pause buttons
- Import heart/resonate icons from `@/components/icons` (Section 4B) — `components/heart-icon.tsx` is a legacy adapter, not the preferred source for new code
- Never use unicode, emoji, or text glyphs as visual elements anywhere in the app

DON'T:
- Hardcode any color
- Use any font other than Lora and Syne
- Add a new color without updating this document
- Go below the type floor for decorative text, or below Section 14 Rule 3 / Section 15 for interactive text
- Create touch targets smaller than 44px
- Animate layout properties (width, height, top, left)
- Use emoji for play/pause — always use PlayPauseIcon component
- Introduce `--text-2` or `--text-3` in new code (Section 4)

---

## 14. Permanent Enforcement Rules

*Added May 2026 from full codebase standards audit. These rules are merge gates — violations block PRs. Section 1–13 above are brand identity; this section is how we enforce it in code.*

**Ten standards** (from `.cursor/rules/git-safety.md`): GIANTS WAY · MODERN · PREMIUM · UNIQUE FOR MARGO · LONG TERM · USER EXPERIENCE · CONSISTENCY · VERY LOGICAL · MOBILE FIRST · APP READY

**Scope:** All production Next.js paths (`app/`, `components/`). Legacy `js/` and `public/*.html` must not be copied into new code.

---

### Rule 1 — No Unicode or emoji as UI icons

**Rule:** Never use Unicode characters (▶ ◀ ♪ × ✕ ♡ ♥ ↩ ↗ ← → ✦ ✓ ✗ ⚑ or any glyph) inside `<span>`, `<div>`, or `<button>` as a visual icon. Text labels may use words only ("Back", "Close", "Play Now"). Icons must be inline SVG components from `components/icons` or approved shared components (`PlayPauseIcon`, `MargoLogo`). Do not add bare Lucide icons with a different stroke.

**Standards:** PREMIUM · CONSISTENCY · UNIQUE FOR MARGO · MOBILE FIRST

**Correct:**
```tsx
<PlayPauseIcon playing={playing} size={16} color="var(--gold)" />
<button aria-label="Close"><CloseIcon /></button>
<span>Lyric Back</span> {/* label only — icon is sibling SVG */}
```

**Wrong:**
```tsx
<span>▶</span>
<button>♥ Resonate</button>
<button>×</button>
<Link>▶ Play Now</Link>
```

**Audit evidence (original May 2026 audit — status per-file tracked in migration branches, not here):**
| File | Line | Violation |
|------|------|-----------|
| `app/feed/page.tsx` | 274, 381, 636 | ♪ placeholder, ▶ tier-2 overlay, × clear |
| `app/lyric-back/page.tsx` | 493, 728, 739, 760 | ← Back, ♥/♡, ↩, ↗ |
| `app/compose/page.tsx` | 353, 386, 454 | ← Back |
| `app/admin/page.tsx` | 193, 255, 270, 274, 293, 319, 321, 371, 385, 388, 419, 624, 666 | ⚑, ✓, ✗, ✦ |
| `components/mini-player.tsx` | 187, 347 | ♪, × |
| `components/card-export-modal.tsx` | 491 | × |

**Contrast (correct pattern in same audit):** `app/feed/page.tsx` 137, 247 (`PlayPauseIcon`); 395–427 (inline SVG resonate / lyric back / card); `components/margo-nav.tsx` 99–135 (SVG + / menu).

**iOS note:** Unicode ▶ in `app/feed/page.tsx:381` renders as the grey SF Symbol play triangle on iPhone Safari — the primary reported play-button inconsistency vs gold SVG on tier-1 cards.

---

### Rule 2 — No hardcoded hex or rgba literals in TSX

**Rule:** In `app/` and `components/`, every color must use `var(--*)` from `app/globals.css` or a shared token module (e.g. `lib/tokens/emotions.ts`). No `#RRGGBB`, no Tailwind arbitrary hex (`bg-[#1a1a1a]`), no duplicated emotion maps per file. `rgba(232,197,71,…)` is allowed only if expressed as a documented token (e.g. `var(--gold-faint)`), not ad hoc.

**Standards:** APP READY · CONSISTENCY · LONG TERM · PREMIUM

**Correct:**
```tsx
color: 'var(--gold)'
background: 'var(--surface)'
// emotions: import { EMOTION_COLORS } from '@/lib/tokens/emotions'
```

**Wrong:**
```tsx
color="#E8C547"
const EMOTION_COLORS = { love: '#FF6B9D', ... } // duplicated in page
className="from-[#08070C]"
color: srtStatus.startsWith('✓') ? '#4ade80' : '#ff6060'
```

**Audit evidence:**
| File | Line | Violation |
|------|------|-----------|
| `app/feed/page.tsx` | 16–18, 137, 325 | `EMOTION_COLORS` hex, `PlayPauseIcon` `#E8C547`, logo stroke `#0B0B0D` |
| `app/lyric-back/page.tsx` | 47–50, 374 | emotion map hex, error `#ff6b6b` |
| `app/page.tsx` | 19–21 | emotion map hex |
| `app/layout.tsx` | 163–165 | Tailwind `from-[#08070C]` / `via-[#0a0909]` / `to-[#0f0e14]`, body `color: '#F4F1ED'` |
| `app/compose/page.tsx` | 506 | `#ff6b6b` error |
| `app/admin/page.tsx` | 49, 114, 171, 193, 373, 388 | `#ff6060`, `#4ade80` |
| `app/about/page.tsx`, `app/contact/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` | 11 | `#6B4EFF` blob |
| `components/mini-player.tsx` | 23–27, 114+ | emotion map + ~22 hex hits |
| `components/card-export-modal.tsx` | 20–25, 58+, 341+, 471+ | export themes + canvas hex |
| `components/MargoLogo.tsx` | 28, 52, 56, 62, 72 | logo SVG fills (document as sole exception or tokenize) |

**Exception (document only):** `components/MargoLogo.tsx` may retain fixed logo gold `#E8C547` until tokenized — never copy that pattern elsewhere.

---

### Rule 3 — Minimum 16px (`1rem`) on interactive and body UI text

**Rule:** Any tappable control label, button text, nav link, vibe pill, search field, or feed action caption must be **≥ `1rem` (16px)**. Metadata only (timestamps, legal fine print, disabled hints) may go to `0.875rem` (14px) minimum — never below. Section 3 type scale `0.6rem` labels are **deprecated for interactive UI**; update components to meet this rule, not the old minimum.

> **Refined by Section 15:** in practice, this rule is enforced via **touch-target size**, not font size, for short CTA/pill labels. See Section 15's permanent design rule and Pattern 2 — decorative and CTA-style short labels may stay at Section 3 scale (0.6–0.7rem) as long as the tappable container meets 44×44px. Rule 3 as originally written still governs longer-form interactive body copy (e.g. paragraph-length links, form field text) where small type genuinely harms legibility.

**Standards:** MOBILE FIRST · PREMIUM · GIANTS WAY · USER EXPERIENCE · CONSISTENCY

**Correct:**
```tsx
<button style={{ fontSize: '1rem', minHeight: 44, padding: '12px 16px' }}>Resonate</button>
<input style={{ fontSize: '1rem' }} />
```

**Wrong:**
```tsx
<button style={{ fontSize: '0.5rem' }}>Resonate</button>
<button style={{ fontSize: '0.6rem' }}>▶ Play Now</button>
<input style={{ fontSize: '0.75rem' }} />
```

**Audit evidence (historical — largely superseded by Section 15's touch-target pattern; treat as resolved where a `--margo-touch-min` container wraps the label, not as an open violation list):**
| File | Example lines | Sizes found |
|------|---------------|-------------|
| `app/feed/page.tsx` | 401, 597–604, 610–617, 629 | `0.5rem`–`0.75rem` on buttons/inputs |
| `app/compose/page.tsx` | 378+ | `0.6rem` CTAs |
| `app/lyric-back/page.tsx` | 467–475 | `0.5rem` send/continue |
| `components/margo-nav.tsx` | 61–62, 80–81 | `0.75rem` / `0.6rem` nav |
| `components/mini-player.tsx` | 220, 334, 544 | down to `0.42rem` |

---

### Rule 4 — One play/pause affordance: `PlayPauseIcon` only

**Rule:** Every play, pause, and buffering state uses `components/play-pause-icon.tsx`. Same size/color tokens on feed, Discover, `/song/[id]`, and mini-player. Never mix Unicode ▶ on one tier and SVG on another in the same surface.

**Standards:** CONSISTENCY · PREMIUM · UNIQUE FOR MARGO · MOBILE FIRST

**Correct:**
```tsx
import { PlayPauseIcon } from '@/components/play-pause-icon'
<PlayPauseIcon playing={playing} size={20} color="var(--gold)" />
```

**Wrong:**
```tsx
<span style={{ fontSize: '0.7rem' }}>▶</span>
<Link>▶ Play Now</Link>
```

**Audit evidence:** `app/feed/page.tsx:137` (correct) vs `:381` (wrong tier-2); `components/play-pause-icon.tsx` accepts hardcoded `#E8C547` at call sites — fix callers to `var(--gold)`.

---

### Rule 5 — Feed actions use the same SVG icon set everywhere

**Rule:** Resonate, Lyric Back, Card, Replay, close, search clear, and share must use the same inline SVG (or shared icon components) on feed, lyric-back, Discover, and compose. Do not use Unicode hearts/arrows on one page and SVG on another. On mobile, follow Section 12 **Feed action row** — labels stay visible at reduced size; counts as icon badges; never wrap the row.

**Standards:** CONSISTENCY · PREMIUM · UNIQUE FOR MARGO · MOBILE FIRST

**Correct:** `components/post-card.tsx` — SVG icons + `.margo-feed-action` layout; labels via `.margo-feed-action__label`.

**Wrong:** Column-stacked icon + label that wraps on narrow screens; Unicode `♥` `♡` `↩` as icons.
---

### Rule 6 — Audio: in-DOM `<audio>` + single playback module

**Rule:** Do not use detached `new Audio()` for user-facing playback. Use a hidden in-DOM `<audio preload="auto" playsInline>` (or the shared player hook/store). One audio instance per active session. Pass `?au=` for early buffer per Section 12. Wire `navigator.mediaSession` handlers to the **same** `play()` / `pause()` / `currentTime` as the UI — not React state alone.

**Standards:** GIANTS WAY · PREMIUM · MOBILE FIRST · APP READY · VERY LOGICAL

**Correct:**
```tsx
<audio ref={audioRef} preload="auto" playsInline src={url} />
navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play())
```

**Wrong:**
```tsx
const audio = new Audio(url)
audio.play()
navigator.mediaSession.setActionHandler('play', () => setPlaying(true)) // no audio call
```

**Audit evidence:**
| File | Line | Violation |
|------|------|-----------|
| `app/feed/page.tsx` | 73–76, 165–168, 187–194 | `new Audio()`, Media Session desync |

---

### Rule 7 — No native browser controls for media or volume

**Rule:** Never render `<audio controls>`, never rely on OS-native range sliders for volume/seek. Custom seek UI (feed tier-1 pattern) everywhere. Do not set `accentColor` on `<input type="range">` as a styling shortcut.

**Standards:** PREMIUM · UNIQUE FOR MARGO · CONSISTENCY · GIANTS WAY

**Correct:** Custom progress bar with touch + mouse handlers bound to `audio.currentTime`.

**Wrong:**
```tsx
<audio controls />
<input type="range" style={{ accentColor: '#E8C547' }} />
```

**Audit evidence:** `components/mini-player.tsx:519–522` (`accentColor: '#E8C547'` — native iOS/Android thumb/track).

---

### Rule 8 — No hover-only interaction on touch surfaces

**Rule:** Visible hover styles (`onMouseEnter` / `onMouseLeave`, CSS `:hover` alone) must not be the only affordance for selection or emphasis on lists, search results, or cards. Touch users must see the same states via `:active`, selected class, or tap.

**Standards:** MOBILE FIRST · USER EXPERIENCE · VERY LOGICAL

**Correct:**
```tsx
onClick={() => setSelected(id)}
style={{ background: selected ? 'var(--gold-faint)' : 'transparent' }}
```

**Wrong:**
```tsx
onMouseEnter={() => setHover(i)}
onMouseLeave={() => setHover(null)}
// no selected state for touch
```

**Audit evidence:** `app/compose/page.tsx:337–338`; `app/lyric-back/page.tsx:418–419` (search result hover only).

---

### Rule 9 — `backdrop-filter` on mobile must have a solid fallback

**Rule:** On viewports `<640px`, `backdrop-filter` / `WebkitBackdropFilter` must be `none` or reduced; compensate with opaque `rgba(7,6,10,0.97)` (or `var(--bg)` at high opacity). Never assume blur works on iOS Safari.

**Standards:** MOBILE FIRST · PREMIUM · APP READY

**Correct:** Section 12 mobile nav pattern — dark opaque overlay, no blur.

**Wrong:** Full `blur(16px)` on mobile menu with no opaque fallback.

**Audit evidence:** `components/margo-nav.tsx:145–146`.

---

### Rule 10 — WebKit-only features need cross-platform behavior

**Rule:** `-webkit-line-clamp`, `-webkit-overflow-scrolling`, `WebkitMaskImage`, and `-webkit-box` are allowed only with a documented fallback or progressive enhancement. Never make layout or readability depend on a single engine.

**Standards:** APP READY · MOBILE FIRST · MODERN

**Audit evidence:** `app/page.tsx:65–66,302`; `app/feed/page.tsx:593` (`WebkitOverflowScrolling`).

---

### Rule 11 — Fonts load from self-hosted files, not CSS URLs

**Rule:** `@font-face` in `app/globals.css` must point to `.woff2` (via `next/font` or `public/fonts/`), never to a Google Fonts CSS URL as `src`. Body theme must match Margo dark tokens — no conflicting shadcn light `oklch` defaults leaking into pages.

**Standards:** PREMIUM · MODERN · CONSISTENCY

**Audit evidence:** `app/globals.css:150–157` (invalid `@font-face` src + `bg-background` light theme).

---

### Rule 12 — Centralize emotion colors and export themes

**Rule:** `EMOTION_COLORS` and card-export palette definitions live in **one** module imported by feed, compose, lyric-back, landing, mini-player. Canvas export may use computed values from tokens, not a second hex copy per file. The fallback color for an unmapped emotion (e.g. `EMOTION_COLORS[emotion] || ...`) should resolve to `var(--text-disabled)`, not a hardcoded hex or an ad hoc `--text-3` reference.

**Standards:** LONG TERM · APP READY · CONSISTENCY

**Audit evidence:** Duplicated maps in `app/feed/page.tsx:16–18`, `app/lyric-back/page.tsx:47–50`, `app/page.tsx:19–21`, `components/mini-player.tsx:23–27`, `components/card-export-modal.tsx:20–25`.

---

### Rule 13 — Navigation arrows in copy

**Rule:** Prefer words over Unicode arrows in CTAs ("Full Karaoke", "Back", "Next"). If an arrow is decorative in marketing copy, use SVG. Never `→` or `←` inside primary buttons or links that act as icons.

**Standards:** CONSISTENCY · PREMIUM

**Audit evidence:** `app/feed/page.tsx:454`; `app/compose/page.tsx:353+`.

---

### Rule 14 — Close and dismiss controls

**Rule:** All modals, sheets, search clear, and trays use a shared `CloseIcon` (SVG), `aria-label="Close"`, 44×44px touch target, Tier 5 ghost styles from Section 10. Never `×` or `✕` characters.

**Standards:** PREMIUM · CONSISTENCY · MOBILE FIRST

**Audit evidence:** `app/feed/page.tsx:636`; `components/mini-player.tsx:347`; `components/card-export-modal.tsx:491`.

---

### Rule 15 — Admin and status UI: no Unicode status glyphs

**Rule:** Admin success/error/flag states use color + text ("Saved", "Failed", "3 flags"), not `✓` `✗` `⚑` `✦` in buttons or status strings. Internal tools still follow Margo icon rules.

**Standards:** CONSISTENCY · PREMIUM

**Audit evidence:** `app/admin/page.tsx` throughout (see Rule 1 table).

---

### Rule 16 — iOS Safari verification before merge

**Rule:** Any change to play/pause, audio, Media Session, icons, or bottom sheets must be verified on **iPhone Safari** (not only Chrome DevTools mobile). Tier-1 and tier-2 feed cards must look identical for play affordance.

**Standards:** MOBILE FIRST · PREMIUM · GIANTS WAY · USER EXPERIENCE

**Audit trigger:** Grey system ▶ on `app/feed/page.tsx:381` vs gold `PlayPauseIcon` on `:137`.

---

### Rule 17 — TypeScript and build integrity

**Rule:** `npx tsc --noEmit` and `npx next build` with zero errors before merge. Do not rely on `typescript.ignoreBuildErrors: true` in `next.config.mjs` to ship UI fixes.

**Standards:** GIANTS WAY · LONG TERM · MODERN

---

### Pre-merge checklist (copy into PR description)

- [ ] No Unicode/emoji used as icons in changed files
- [ ] No new `#hex` or duplicated `EMOTION_COLORS` in TSX
- [ ] No new `--text-2` / `--text-3` references (Section 4)
- [ ] Interactive text meets Section 14 Rule 3 as refined by Section 15; touch targets ≥ 44px
- [ ] Play/pause uses `PlayPauseIcon` only
- [ ] Audio uses in-DOM element + Media Session wired to real playback
- [ ] No `accentColor` sliders or `<audio controls>`
- [ ] No hover-only state without touch/active equivalent
- [ ] Tested on 375px width and iPhone Safari for media/icon changes

---

## 15. Mobile Responsiveness Rules

*Added May 2026 — Patterns 1–4 from the responsive foundation sprint. These are permanent implementation rules in `app/globals.css` and production pages. Section 12 summarizes mobile performance; this section is the authoritative pattern reference with wrong/right examples.*

**Ten standards enforced by this section:** MOBILE FIRST · USER EXPERIENCE · PREMIUM · APP READY · CONSISTENCY · VERY LOGICAL · GIANTS WAY

**Cross-reference:** Section 14 Rule 3 (interactive text size) is refined here — see the permanent design rule immediately below. Rule 8 (hover-only) and Rule 9 (backdrop-filter) are enforced here with concrete tokens and CSS patterns.

---

### Permanent design rule — Small text is intentional

Small type on **decorative** UI (vibe pills, action labels, badges, metadata, uppercase micro-labels) is an intentional Margo aesthetic — not a responsiveness bug. **Do not increase font sizes** on these elements to "fix" mobile.

- **Emphasis on CTAs and primary actions** comes from color, contrast, weight, and gold — not from larger type.
- **Touch targets** on interactive controls must still be ≥ 44×44px via container `minWidth` / `minHeight` / padding (`var(--margo-touch-min)`), with **text size unchanged**.
- **Interactive** = receives tap/click (buttons, links, pills, scrubbers, nav icons). **Decorative** = label inside a tappable row, timestamp, count, badge copy, artist metadata — keep scale from Section 3; only fix unreadable contrast, not size.

This rule **refines** Section 14 Rule 3 for Margo: Rule 3 targets illegible interactive captions (longer-form body-style interactive text); decorative and short-CTA `0.6rem`–`0.7rem` labels inside 44px containers remain valid — this includes Section 10's button tiers.

---

### Pattern 1 — Safe area insets

**Rule:** Any fixed or sticky UI at the bottom of the viewport (page scroll padding, toasts, player chrome, share sheets, trays) must account for the iOS home indicator via tokens — never a lone hardcoded `80px`.

**Tokens** (`app/globals.css` `:root`):

| Token | Purpose |
|-------|---------|
| `--margo-safe-bottom` | `env(safe-area-inset-bottom, 0px)` |
| `--margo-page-bottom` | Base content clearance above mini-player (`80px`) |
| `--margo-page-padding-bottom` | Page scroll padding: `calc(var(--margo-page-bottom) + var(--margo-safe-bottom))` |
| `--margo-toast-offset` | Sonner bottom toaster clearance |
| `--margo-player-*` | Player viewport, fade, hint, tray, footer, share-sheet bottoms |

**Correct pattern:** Compose base spacing + safe area in one token; use the token on the element that needs bottom clearance.

**Standards:** MOBILE FIRST · APP READY · USER EXPERIENCE · PREMIUM

**Wrong:**
```tsx
<div style={{ padding: '100px 24px 80px' }}>
```
```tsx
bottom: 88px; /* ignores home indicator on iPhone */
```

**Right:**
```tsx
<div style={{ padding: '100px 24px var(--margo-page-padding-bottom)' }}>
```
```css
[data-sonner-toaster][data-y-position='bottom'] {
  bottom: var(--margo-toast-offset) !important;
}
```
```tsx
/* Player fixed chrome — use the matching --margo-player-* token, not a magic number */
bottom: 'var(--margo-player-viewport-bottom)';
```

**Implemented in:** `app/feed/page.tsx`, `app/compose/page.tsx`, `app/lyric-back/page.tsx`, `app/layout.tsx` (Sonner `offset={0}` + CSS offset).

---

### Pattern 2 — Touch targets

**Rule:** Every **interactive** element must present a ≥ **44×44px** hit area. Use `--margo-touch-min: 44px` from `app/globals.css` — never shrink the control to match small label text.

**Standards:** MOBILE FIRST · USER EXPERIENCE · GIANTS WAY · CONSISTENCY

**Wrong:**
```tsx
<button style={{ width: 32, height: 32, fontSize: '0.6rem' }}>Resonate</button>
```
```tsx
<button style={{ padding: '4px 8px', fontSize: '0.6rem' }}>Play</button>
/* visual box < 44px, no min dimensions */
```

**Right:**
```tsx
<button style={{
  minWidth: 'var(--margo-touch-min)',
  minHeight: 'var(--margo-touch-min)',
  padding: '0 14px',
  fontSize: '0.6rem', /* aesthetic unchanged — see Section 10 note + Section 15 permanent design rule */
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}}>
  Resonate
</button>
```
```tsx
/* Icon-only control: square touch box, icon size unchanged */
width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
```

**Do not change:** Decorative label font sizes on vibe pills, feed action captions, badges, or metadata when applying this pattern — only the **container** dimensions.

**Implemented in:** `components/margo-nav.tsx`, `app/feed/page.tsx`, `app/compose/page.tsx`, `app/lyric-back/page.tsx`, `components/mini-player.tsx`.

---

### Pattern 3 — Backdrop filter

**Rule:** **Opaque background first**; `backdrop-filter` is progressive enhancement for desktop only. On viewports **< 640px**, `backdrop-filter` and `-webkit-backdrop-filter` must be **`none`** always, with a solid or near-opaque fallback.

**Tokens:**

| Token | Value / use |
|-------|-------------|
| `--margo-scrim` | `rgba(7, 6, 10, 0.97)` — overlays, nav, scrims, mobile fallback |
| `--margo-bar` | `rgba(10, 9, 13, 0.98)` — mini-player bar (opaque enough without blur on mobile) |

**Utility classes** (`app/globals.css`): Prefer shared classes over one-off blur in TSX.

- `.margo-nav-bar`, `.margo-nav-overlay`, `.margo-landing-nav`
- `.margo-preview-scrim`, `.margo-featured-badge`, `.margo-tap-overlay`
- `.margo-upnext-tray`, `.margo-mp-bar`, `.margo-mp-scrim`
- `.margo-no-blur-mobile` — opt-in helper to strip blur below 640px on ad-hoc surfaces

**Standards:** MOBILE FIRST · PREMIUM · APP READY · CONSISTENCY

**Wrong:**
```tsx
<div style={{
  background: 'rgba(7,6,10,0.4)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}} />
/* mobile: muddy, expensive, fails on iOS without opaque layer */
```

**Right:**
```tsx
<header className="margo-nav-bar" />
```
```css
/* globals.css pattern */
.margo-nav-bar {
  background: rgba(7, 6, 10, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
@media (max-width: 639px) {
  .margo-nav-bar {
    background: var(--margo-scrim) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}
```

**Implemented in:** `app/globals.css`, `components/margo-nav.tsx`, `app/page.tsx`, `components/mini-player.tsx`.

---

### Pattern 4 — Touch states (not hover-only)

**Rule:** Touch users must never depend on `:hover` alone for feedback or discovery.

1. **Every `:hover` style** on a control must have a matching **`:active`** (same visual rules). Add **`:focus-visible`** where keyboard access matters (cards, nav chips).
2. **Desktop-only hover** (lift, zoom, extra opacity) lives inside **`@media (hover: hover) and (pointer: fine)`** — see comment block in `app/globals.css`.
3. **Always-visible affordances on mobile** — e.g. song card play overlay at **`opacity: 0.85`** by default, **`opacity: 1`** on `:active`; full hover overlay only inside the hover media query.

**Standards:** MOBILE FIRST · USER EXPERIENCE · VERY LOGICAL · CONSISTENCY

**Wrong:**
```css
.song-card-overlay { opacity: 0; }
.song-card-wrap:hover .song-card-overlay { opacity: 1; }
/* touch: overlay invisible until accidental sticky hover */
```
```css
.mp-btn:hover { opacity: 0.65; }
/* no :active — tap gives no feedback on phone */
```

**Right:**
```css
.song-card-overlay { opacity: 0.85; transition: opacity 250ms ease; }
.song-card-wrap:active .song-card-overlay { opacity: 1 !important; }
@media (hover: hover) and (pointer: fine) {
  .song-card-wrap:hover { transform: translateY(-6px); }
  .song-card-wrap:hover .song-card-overlay { opacity: 1 !important; }
  .song-card-wrap:hover .song-card-img { transform: scale(1.06); }
}
```
```css
.mp-btn:active { opacity: 0.65 !important; transform: scale(0.92); }
@media (hover: hover) and (pointer: fine) {
  .mp-btn:hover { opacity: 0.65 !important; }
}
```

**State-only changes:** Pattern 4 adjusts **opacity, transform, background, border-color** on interaction — no font, layout, or size changes.

**Implemented in:** `components/mini-player.tsx` (board, preview, song grid, mini-player, up-next tray).

---

### Pattern 1–4 pre-merge checklist

- [ ] Bottom padding / fixed `bottom` uses `--margo-page-padding-bottom` or the correct `--margo-player-*` / `--margo-toast-offset` token
- [ ] New interactive controls use `minWidth` / `minHeight` ≥ `var(--margo-touch-min)` without enlarging decorative label fonts
- [ ] New blurred surfaces use a globals.css `.margo-*` class or duplicate the opaque-first + `@media (max-width: 639px)` blur-off pattern
- [ ] New `:hover` rules have matching `:active`; desktop-only hover wrapped in `@media (hover: hover) and (pointer: fine)`
- [ ] `npx tsc --noEmit` passes

---

## Changelog

- **4.6 (Aug 2026):** Wordmark tracking **2px** (tighter; 5px was doc-sync error that worsened stretch). Canonical **type role grid** with Micro body / compact explainer (`0.65rem`). Landing how-it-works stays 3-up on mobile with compact title+body. Footer pad/gap tightened.
- **4.5 (Aug 2026):** Wordmark letter-spacing synced to 5px and scales with symbol size. Canonical display-name / @username and song-title / artist stacks. Landing keeps MobileTabBar (marketing mode). Profile nav clearance + avatar lightbox. Account surfaces (settings / edit / studio / apply) use Geist chrome. Footer two-column + social icons. Type floor enforced at 0.6rem.
- **4.4 (Aug 2026):** Dual type system — Geist Sans for UI chrome, Lora retained for lyric quotes / signature lyrics / lyric-led marketing. Syne remains wordmark-only. Helpers in `lib/fonts.ts` (`UI_FONT`, `LYRIC_FONT`).
- **4.3 (Aug 2026):** Fixed version-number mismatch (header now matches footer). Finalized `--text-2`/`--text-3` deprecation status per `feat/fix-text-3-contrast` migration — no remaining product call sites. Resolved Section 10/Section 4 contradiction (Tier 2/5 button colors now reference named tokens, not deprecated aliases). Added missing Tier 4 placeholder in Section 10. Resolved the three-way conflict between Section 10 button font sizes, Section 14 Rule 3, and Section 15's permanent design rule — added explicit cross-references so Rule 3 alone doesn't read as contradicting Section 10/15. Updated Section 9 nav references from "Music" to "Discover"; documented the in-app bottom tab bar (previously undefined in Section 9, only implied by Section 4B). Aligned Section 13's heart-icon guidance with Section 4B (prefer `@/components/icons`, `heart-icon.tsx` is legacy). Documented "Coming Soon" pill and emotion-fallback-color resolutions from the `--text-3` classification decisions.
- **4.2 (May 2026):** Added Section 15 Mobile Responsiveness Rules (Patterns 1–4).
- **4.0 (May 2026):** Added Section 4B Icon System, Section 14 Permanent Enforcement Rules from full codebase audit.

---

*Last updated: August 2026 — Version 4.4*