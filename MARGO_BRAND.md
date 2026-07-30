# MARGO — Brand Identity & Design System
*Version 4.0 — May 2026 — Living document, update with every design decision*

---

## 1. What Margo Is

Margo is a music-first social platform where people communicate through song lyrics. The feeling it should create in the first second someone opens it:

> Warm. Intimate. Like discovering a song that says exactly what you couldn't.

---

## 2. Logo & Brand Mark — UNTOUCHABLE

- Mark: The gold circle with the M waveform inside
- Wordmark: MARGO in Syne 800, gold, letter-spacing 5px, uppercase
- Color: Always #E8C547 on dark background
- Rule: Never resize, recolor, or alter in any way
- Component: components/MargoLogo.tsx — always use this, never inline SVG

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
| Landing page nav | Lockup (3) | size={36} rings |
| Card export | Symbol (2) | size={48} |

### Shadow & Glow Rules
- In-app: filter: drop-shadow(0 2px 8px rgba(232,197,71,0.25))
- Favicon: no shadow ever
- Ghost watermark on exports: opacity 0.18, no shadow, bottom-left always

### Rings Rules
- Rings are UI animation only — CSS rings on nav/feed/landing
- Never add rings to static exported images
- Never add rings to favicon

---

## 3. Typography — One Font Only

Every piece of text uses Lora. No exceptions outside the logo.
Self-hosted via Next.js font system (next/font/google with Lora).

Type scale:
- clamp(2rem,5vw,3.2rem) 700  — Page hero titles
- 2rem 700                    — Section titles
- 1.5rem 600                  — Modal headers, featured lyric
- 1.15rem 600                 — Card titles, song names
- 1.1rem 400 italic           — Lyric text (the star, never change)
- 0.95rem 400                 — Body text, descriptions
- 0.82rem 400                 — Secondary text, artist names
- 0.75rem 700                 — Nav links (uppercase, letter-spacing 2px)
- 0.7rem 400                  — Timestamps, counts, usernames
- 0.6rem 600                  — Labels, vibe tags, uppercase UI elements
- MINIMUM: 0.6rem             — nothing smaller, ever

Logo font: Syne 800 — MARGO wordmark ONLY. Nothing else uses Syne.

Removed fonts (never bring back):
- Bebas Neue, DM Sans, Instrument Serif, Space Mono, Google Fonts CDN

---

## 4. Color System

All colors are CSS variables defined in app/globals.css.
NEVER hardcode a color value anywhere — always use var(--name).

Core:
- --bg: #07060A (near-black, never pure black)
- --surface: #0F0E13 (cards, sheets, modals)
- --surface-2: #161420
- --surface-3: #1E1B2A
- --border: rgba(255,255,255,0.07)
- --border-hi: rgba(255,255,255,0.12)
- --text: #F4F1ED (warm white, not pure white)
- --text-2: #9A98A4 (artist names, captions)
- --text-3: #555360 (placeholders, disabled)

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

Desktop (640px+):
  [Logo left] ............ [Feed] [Music] [Share a Lyric] [≡]

Mobile (<640px):
  [Logo left] ............ [+ gold circle] [≡]

Hamburger opens full-page overlay:
  - Dark background rgba(7,6,10,0.97) with blur
  - Large italic Lora links centered
  - Staggered fade-in animation
  - Gold dot on active page
  - Links: Feed, Music, Share a Lyric, About, Contact

Active page indicator: gold underline bar (18px wide, 2px tall) below nav link.

---

## 10. Button System

### Tier 1 — Primary CTA
One per screen. The unmissable action.
- Background: var(--gold) — Color: var(--bg)
- Font: Lora 700, 0.6-0.7rem, uppercase, letter-spacing 1.5px
- Padding: 14px 24px — Border-radius: 50px — Min-height: 48px

### Tier 2 — Secondary Action
- Background: var(--surface-2) — Color: var(--text-2)
- Border: 1px solid var(--border)
- Font: Lora 600, 0.6rem, uppercase
- Padding: 11px 16px — Border-radius: 50px

### Tier 3 — Inline Feed Action (pill)
- Background: rgba(255,255,255,0.05)
- Border: 1px solid rgba(255,255,255,0.10)
- Font: Lora 600, 0.6rem, uppercase, letter-spacing 1px
- Padding: 6px 14px — Border-radius: 50px — Min touch: 44px

### Tier 5 — Ghost/Dismiss
- Background: rgba(255,255,255,0.05) — Color: var(--text-3)
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

### Audio
- preload="auto" always — never preload="metadata"
- Pass audioUrl as ?au= URL param for instant buffering before Firebase resolves

---

## 13. Do's and Don'ts

DO:
- Use Lora for all text
- Use Syne 800 only for MARGO wordmark
- Use CSS variables for every color
- Keep gold scarce and meaningful — it means something important
- Test on 375px mobile first
- Update this document before merging any design changes
- Use components/MargoLogo.tsx for all logo instances
- Use components/play-pause-icon.tsx for all play/pause buttons
- Use components/heart-icon.tsx for all heart/resonate icons
- Never use unicode, emoji, or text glyphs as visual elements anywhere in the app

DON'T:
- Hardcode any color
- Use any font other than Lora and Syne
- Add a new color without updating this document
- Go below 0.6rem font size
- Create touch targets smaller than 44px
- Animate layout properties (width, height, top, left)
- Use emoji for play/pause — always use PlayPauseIcon component

---

## 14. Permanent Enforcement Rules

*Added May 2026 from full codebase standards audit. These rules are merge gates — violations block PRs. Section 1–13 above are brand identity; this section is how we enforce it in code.*

**Ten standards** (from `.cursor/rules/git-safety.md`): GIANTS WAY · MODERN · PREMIUM · UNIQUE FOR MARGO · LONG TERM · USER EXPERIENCE · CONSISTENCY · VERY LOGICAL · MOBILE FIRST · APP READY

**Scope:** All production Next.js paths (`app/`, `components/`). Legacy `js/` and `public/*.html` must not be copied into new code.

---

### Rule 1 — No Unicode or emoji as UI icons

**Rule:** Never use Unicode characters (▶ ◀ ♪ × ✕ ♡ ♥ ↩ ↗ ← → ✦ ✓ ✗ ⚑ or any glyph) inside `<span>`, `<div>`, or `<button>` as a visual icon. Text labels may use words only ("Back", "Close", "Play Now"). Icons must be inline SVG components or approved shared components (`PlayPauseIcon`, `MargoLogo`, lucide icons where already established).

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

**Audit evidence:**
| File | Line | Violation |
|------|------|-----------|
| `app/feed/page.tsx` | 274, 381, 636 | ♪ placeholder, ▶ tier-2 overlay, × clear |
| `app/music/page.tsx` | 521, 625, 640, 690, 715–717, 742, 910–911 | ×, ←/→ nav, ♥/♡, ▶ Play Now |
| `app/music/player/page.tsx` | 408, 416, 429, 467 | ♪, ▶, ✕, ✦ |
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
| `app/music/page.tsx` | 128, 565, 570 | `#E8C547` on play icon |
| `app/music/player/page.tsx` | 265–266, 278, 301 | `#E8C547`, `#07060A`, `#0f0e14`, `#f5d878` |
| `app/compose/page.tsx` | 506 | `#ff6b6b` error |
| `app/admin/page.tsx` | 49, 114, 171, 193, 373, 388 | `#ff6060`, `#4ade80` |
| `app/about/page.tsx`, `app/contact/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` | 11 | `#6B4EFF` blob |
| `components/mini-player.tsx` | 23–27, 114+ | emotion map + ~22 hex hits |
| `components/card-export-modal.tsx` | 20–25, 58+, 341+, 471+ | export themes + canvas hex |
| `components/share-button.tsx` | 49 | `bg-[#1a1a1a]` |
| `components/MargoLogo.tsx` | 28, 52, 56, 62, 72 | logo SVG fills (document as sole exception or tokenize) |

**Exception (document only):** `components/MargoLogo.tsx` may retain fixed logo gold `#E8C547` until tokenized — never copy that pattern elsewhere.

---

### Rule 3 — Minimum 16px (`1rem`) on interactive and body UI text

**Rule:** Any tappable control label, button text, nav link, vibe pill, search field, or feed action caption must be **≥ `1rem` (16px)**. Metadata only (timestamps, legal fine print, disabled hints) may go to `0.875rem` (14px) minimum — never below. Section 3 type scale `0.6rem` labels are **deprecated for interactive UI**; update components to meet this rule, not the old minimum.

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

**Audit evidence (systemic — each file has dozens):**
| File | Example lines | Sizes found |
|------|---------------|-------------|
| `app/feed/page.tsx` | 401, 597–604, 610–617, 629 | `0.5rem`–`0.75rem` on buttons/inputs |
| `app/music/page.tsx` | 715–717, 910–911, 960 | `0.58rem`–`0.82rem` on CTAs and search |
| `app/compose/page.tsx` | 378+ | `0.6rem` CTAs |
| `app/lyric-back/page.tsx` | 467–475 | `0.5rem` send/continue |
| `components/margo-nav.tsx` | 61–62, 80–81 | `0.75rem` / `0.6rem` nav |
| `components/mini-player.tsx` | 220, 334, 544 | down to `0.42rem` |

---

### Rule 4 — One play/pause affordance: `PlayPauseIcon` only

**Rule:** Every play, pause, and buffering state uses `components/play-pause-icon.tsx`. Same size/color tokens on feed, music, player, and mini-player. Never mix Unicode ▶ on one tier and SVG on another in the same surface.

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

**Audit evidence:** `app/feed/page.tsx:137` (correct) vs `:381` (wrong tier-2); `app/music/page.tsx:717,742,910`; `app/music/player/page.tsx:416`; `components/play-pause-icon.tsx` accepts hardcoded `#E8C547` at call sites — fix callers to `var(--gold)`.

---

### Rule 5 — Feed actions use the same SVG icon set everywhere

**Rule:** Resonate, Lyric Back, Card, close, search clear, and share must use the same inline SVG (or shared icon components) on feed, lyric-back, music, and compose. Do not use Unicode hearts/arrows on one page and SVG on another.

**Standards:** CONSISTENCY · PREMIUM · UNIQUE FOR MARGO

**Correct:** `app/feed/page.tsx:395–427` — SVG paths + text label.

**Wrong:** `app/lyric-back/page.tsx:728,739,760` — `♥` `♡` `↩` `↗` in spans; `app/music/page.tsx:715` — `♥` `♡` in button.

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
| `app/music/page.tsx` | 201, 310 | multiple `new Audio()` pools |
| `app/music/player/page.tsx` | 101–145 | detached audio + session state |

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

**Audit evidence:** `components/margo-nav.tsx:145–146`; `app/music/page.tsx:675`; `app/music/player/page.tsx:264,277`.

---

### Rule 10 — WebKit-only features need cross-platform behavior

**Rule:** `-webkit-line-clamp`, `-webkit-overflow-scrolling`, `WebkitMaskImage`, and `-webkit-box` are allowed only with a documented fallback or progressive enhancement. Never make layout or readability depend on a single engine.

**Standards:** APP READY · MOBILE FIRST · MODERN

**Audit evidence:** `app/page.tsx:65–66,302`; `app/music/page.tsx:413–417,435–437`; `app/feed/page.tsx:593` (`WebkitOverflowScrolling`).

---

### Rule 11 — Fonts load from self-hosted files, not CSS URLs

**Rule:** `@font-face` in `app/globals.css` must point to `.woff2` (via `next/font` or `public/fonts/`), never to a Google Fonts CSS URL as `src`. Body theme must match Margo dark tokens — no conflicting shadcn light `oklch` defaults leaking into pages.

**Standards:** PREMIUM · MODERN · CONSISTENCY

**Audit evidence:** `app/globals.css:150–157` (invalid `@font-face` src + `bg-background` light theme).

---

### Rule 12 — Centralize emotion colors and export themes

**Rule:** `EMOTION_COLORS` and card-export palette definitions live in **one** module imported by feed, compose, lyric-back, landing, mini-player. Canvas export may use computed values from tokens, not a second hex copy per file.

**Standards:** LONG TERM · APP READY · CONSISTENCY

**Audit evidence:** Duplicated maps in `app/feed/page.tsx:16–18`, `app/lyric-back/page.tsx:47–50`, `app/page.tsx:19–21`, `components/mini-player.tsx:23–27`, `components/card-export-modal.tsx:20–25`.

---

### Rule 13 — Navigation arrows in copy

**Rule:** Prefer words over Unicode arrows in CTAs ("Full Karaoke", "Back", "Next"). If an arrow is decorative in marketing copy, use SVG. Never `→` or `←` inside primary buttons or links that act as icons.

**Standards:** CONSISTENCY · PREMIUM

**Audit evidence:** `app/feed/page.tsx:454`; `app/music/page.tsx:587,625,640`; `app/music/player/page.tsx:307`; `app/compose/page.tsx:353+`.

---

### Rule 14 — Close and dismiss controls

**Rule:** All modals, sheets, search clear, and trays use a shared `CloseIcon` (SVG), `aria-label="Close"`, 44×44px touch target, Tier 5 ghost styles from Section 10. Never `×` or `✕` characters.

**Standards:** PREMIUM · CONSISTENCY · MOBILE FIRST

**Audit evidence:** `app/feed/page.tsx:636`; `app/music/page.tsx:521,690`; `components/mini-player.tsx:347`; `components/card-export-modal.tsx:491`; `app/music/player/page.tsx:429`.

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
- [ ] Interactive text ≥ `1rem`; touch targets ≥ 44px
- [ ] Play/pause uses `PlayPauseIcon` only
- [ ] Audio uses in-DOM element + Media Session wired to real playback
- [ ] No `accentColor` sliders or `<audio controls>`
- [ ] No hover-only state without touch/active equivalent
- [ ] Tested on 375px width and iPhone Safari for media/icon changes

---

## 15. Mobile Responsiveness Rules

*Added May 2026 — Patterns 1–4 from the responsive foundation sprint. These are permanent implementation rules in `app/globals.css` and production pages. Section 12 summarizes mobile performance; this section is the authoritative pattern reference with wrong/right examples.*

**Ten standards enforced by this section:** MOBILE FIRST · USER EXPERIENCE · PREMIUM · APP READY · CONSISTENCY · VERY LOGICAL · GIANTS WAY

**Cross-reference:** Section 14 Rule 8 (hover-only) and Rule 9 (backdrop-filter) are enforced here with concrete tokens and CSS patterns.

---

### Permanent design rule — Small text is intentional

Small type on **decorative** UI (vibe pills, action labels, badges, metadata, uppercase micro-labels) is an intentional Margo aesthetic — not a responsiveness bug. **Do not increase font sizes** on these elements to "fix" mobile.

- **Emphasis on CTAs and primary actions** comes from color, contrast, weight, and gold — not from larger type.
- **Touch targets** on interactive controls must still be ≥ 44×44px via container `minWidth` / `minHeight` / padding (`var(--margo-touch-min)`), with **text size unchanged**.
- **Interactive** = receives tap/click (buttons, links, pills, scrubbers, nav icons). **Decorative** = label inside a tappable row, timestamp, count, badge copy, artist metadata — keep scale from Section 3; only fix unreadable contrast, not size.

This rule **refines** Section 14 Rule 3 for Margo: Rule 3 targets illegible interactive captions; decorative `0.6rem`–`0.7rem` labels inside 44px containers remain valid.

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

**Implemented in:** `app/feed/page.tsx`, `app/compose/page.tsx`, `app/lyric-back/page.tsx`, `app/music/player/page.tsx`, `app/layout.tsx` (Sonner `offset={0}` + CSS offset).

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
  fontSize: '0.6rem', /* aesthetic unchanged */
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

**Implemented in:** `components/margo-nav.tsx`, `app/feed/page.tsx`, `app/compose/page.tsx`, `app/lyric-back/page.tsx`, `app/music/page.tsx`, `app/music/player/page.tsx`, `components/mini-player.tsx`.

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

**Implemented in:** `app/globals.css`, `components/margo-nav.tsx`, `app/page.tsx`, `app/music/page.tsx`, `app/music/player/page.tsx`, `components/mini-player.tsx`.

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

**Implemented in:** `app/music/page.tsx`, `components/mini-player.tsx`, `app/music/player/page.tsx` (board, preview, song grid, mini-player, up-next tray).

---

### Pattern 1–4 pre-merge checklist

- [ ] Bottom padding / fixed `bottom` uses `--margo-page-padding-bottom` or the correct `--margo-player-*` / `--margo-toast-offset` token
- [ ] New interactive controls use `minWidth` / `minHeight` ≥ `var(--margo-touch-min)` without enlarging decorative label fonts
- [ ] New blurred surfaces use a globals.css `.margo-*` class or duplicate the opaque-first + `@media (max-width: 639px)` blur-off pattern
- [ ] New `:hover` rules have matching `:active`; desktop-only hover wrapped in `@media (hover: hover) and (pointer: fine)`
- [ ] `npx tsc --noEmit` passes

---

*Last updated: May 2026 — Version 4.2 (Section 15 Mobile Responsiveness Rules — Patterns 1–4 sprint)*