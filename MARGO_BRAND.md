# MARGO — Brand Identity & Design System
*Version 3.0 — Living document, update with every design decision*

## 1. What Margo Is
Margo is a music-first social platform where people communicate through song lyrics. The feeling it should create in the first second someone opens it:

> Warm. Intimate. Like discovering a song that says exactly what you couldn't.

## 2. Logo & Brand Mark — UNTOUCHABLE
- Mark: The gold circle with the M waveform inside
- Wordmark: MARGO in Syne 800, gold, letter-spacing 5px, uppercase
- Color: Always #E8C547 on dark background
- Rule: Never resize, recolor, or alter in any way

## 3. Typography — One Font Only
Every piece of text uses Lora. No exceptions outside the logo.
Self-hosted in assets/fonts/lora/ — no Google dependency.

Type scale:
- 2rem 700       — Hero titles, landing page
- 1.5rem 600     — Page titles, modal headers
- 1.15rem 600    — Card titles, song name
- 1.1rem 400 italic — Lyric text (the star, never change)
- 0.95rem 400    — Body text, descriptions
- 0.82rem 400    — Secondary text, artist name
- 0.7rem 400     — Timestamps, counts, usernames
- 0.6rem 600     — Labels, vibe tags, uppercase UI
- MINIMUM: 0.6rem — nothing smaller, ever

Logo font — Syne 800: MARGO wordmark ONLY. Nothing else uses Syne.

Removed fonts (never bring back):
- Bebas Neue, DM Sans, Instrument Serif, Space Mono

## 4. Color System
All colors are CSS variables in assets/css/base.css.
NEVER hardcode a color value anywhere else.

Core:
- --bg: #07060A (near-black, never pure black)
- --surface: #0F0E13 (cards, sheets, modals)
- --surface-2: #161420
- --surface-3: #1E1B2A
- --border: rgba(255,255,255,0.07)
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

Resonate (same as gold — it is the premium action):
- --resonate: #E8C547
- --resonate-faint: rgba(232,197,71,0.08)

Status (functional only, not decorative):
- --success: #4ade80
- --partial: var(--gold)

Emotion colors (Margo unique identity — keep all):
- Love: #FF6B9D, Heartbreak: #ff6060, Hope: #7B9FFF
- Nostalgia: #E8C547, Healing: #4ade80, Joy: #ffc847
- Rage: #FF6440, Loneliness: #a0a0ff, SendIt: #00e5c8, LetOut: #c864ff

## 5. Spacing Scale
4px, 8px, 12px, 16px, 24px, 32px, 48px
Never use arbitrary values outside this scale.

## 6. Border Radius Scale
4px=tags, 8px=small cards, 12px=cards, 16px=large, 24px=modals, 50px=pills

## 7. Animation Rules
- ease-out: cubic-bezier(0.16, 1, 0.3, 1) — elements entering
- ease-in: cubic-bezier(0.4, 0, 1, 1) — elements leaving
- fast: 150ms (hover), normal: 220ms, slow: 380ms (sheets)
- ONLY animate transform and opacity — never width, height, top, left
- Always respect prefers-reduced-motion

## 8. Breakpoints
- Mobile: <480px — design here first, 375px minimum
- Tablet: 480-767px
- Desktop: 768px+ — max-width 500px centered feed
- Touch targets: minimum 44x44px always

## 9. Do's and Don'ts
DO:
- Use Lora for all text
- Use Syne 800 only for MARGO wordmark
- Use CSS variables for every color
- Keep gold scarce and meaningful
- Test on 375px mobile first
- Update this document before merging design changes

DON'T:
- Hardcode any color in CSS
- Use any font other than Lora and Syne
- Add a new color without updating this document
- Go below 0.6rem font size
- Create touch targets smaller than 44px
- Animate layout properties

## 10. Voice & Tone
Margo speaks like a music lover, not a tech company.
DO: "Drop a lyric back..." / "Be the first to echo" / "Which song answers this?"
DON'T: "Add a comment" / "Submit" / "No data found"
Empty states are invitations, not errors.

---
Last updated: April 2026 — Version 3.0

## 11. Mobile-Specific Component Rules

### Floating banners (new-posts-bar, toast notifications)
- max-width: calc(100vw - 48px) — never touch screen edges
- top: 68px desktop / 56px mobile — below the header
- font-size: 0.6rem on all screens — never smaller
- padding: 10px 22px desktop / 9px 16px mobile
- Always centered with left:50% + translateX(-50%)
- Never use white-space:nowrap on mobile — allow text to fit

### Touch targets
- Minimum 44x44px on all interactive elements
- Buttons in headers: min-height 36px, min-width 80px
- Pills and tags: min-height 28px

---

## 12. Logo Usage System

### The 3 Tiers

| Tier | Name | What it is | SVG id |
|---|---|---|---|
| 1 | The Mark | M in gold circle, no dash | `#margo-mark` |
| 2 | The Symbol | M in gold circle + dash below | `#margo-symbol` |
| 3 | The Lockup | Symbol + MARGO wordmark | inline only |

**The Symbol IS the Margo logo.** The dash below the M is what makes it distinctly Margo. Never omit it except at favicon sizes where it becomes invisible.

### Where Each Tier Is Used

| Context | Tier | Size | Rings? |
|---|---|---|---|
| Browser favicon | Mark (Tier 1) | 16–32px | No |
| Nav bar | Symbol (Tier 2) | 32×32px | Yes (CSS) |
| Feed header | Symbol (Tier 2) | 36×36px | Yes (CSS) |
| Composer header | Symbol (Tier 2) | 32×32px | Yes (CSS) |
| Lyric Back share card | Symbol (Tier 2) | 48×48px | No |
| Landing page nav | Lockup (Tier 3) | 36px tall | Yes (CSS) |
| GIF export watermark | Ghost Lockup | W×0.048 | Yes (animated canvas) |
| Poster export watermark | Ghost Lockup | W×0.048 | No (static canvas) |
| OG/social share image | Lockup (Tier 3) | — | No |

### Ghost Watermark Rules (exports only)
- Position: always bottom-left, never centered
- Opacity: exactly 0.18 — not more (distracting), not less (invisible)
- Color: always white version on dark backgrounds
- Size: 3.5–4.8% of canvas width
- Never add shadow to the ghost

### Shadow & Glow Rules
- In-app Symbol: `filter: drop-shadow(0 2px 8px rgba(232,197,71,0.25))`
- Canvas exports: `shadowBlur = size * 0.4` with gold color (already in brand.js)
- Favicon: no shadow ever
- Ghost watermark: no shadow ever

### Rings Rules
- Rings are UI animation only — CSS on landing/feed/nav, canvas on GIF
- Never add rings to static exported images (poster, save card)
- Never add rings to favicon
- Ring animation: 3 ripples staggered at 0, 0.33, 0.66 delay

### Master SVG File
Single source of truth: `/assets/brand/margo-brand.svg`
All HTML logo instances must use `<use href="/assets/brand/margo-brand.svg#[id]"/>`.
Canvas exports (GIF, poster) use brand.js — cannot use SVG sprites.

### What Needs Cleaning
- [ ] Replace 3 duplicate inline SVGs in index.html with `<use href=...>`
- [ ] Remove stray fix_brand_*.js files from repo root
- [ ] Add margo-brand.svg to /assets/brand/
---

## 13. Button System

Every button in Margo belongs to one of six tiers.
Font is always Lora. Colors are always CSS variables. Never hardcode hex. Never use Space Mono.

### Tier 1 — Primary CTA
One per screen. The unmissable action. (SAVE CARD, DROP IT, + SHARE A LYRIC)
- Background: var(--gold)
- Color: #07060A
- Font: Lora 700, 0.7rem, uppercase, letter-spacing 1px
- Padding: 14px 24px — Border-radius: 12px — Min-height: 52px
- Hover: var(--gold-warm), scale(1.01) — Active: var(--gold-2), scale(0.98)
- Never more than one on screen at a time

### Tier 2 — Secondary Action
Supporting actions alongside a Primary CTA. (COPY TEXT, SHARE LINK, Save)
- Background: var(--surface-2) — Color: var(--text-2)
- Border: 1px solid var(--border)
- Font: Lora 600, 0.6rem, uppercase, letter-spacing 0.5px
- Padding: 11px 16px — Border-radius: 10px — Min-height: 52px
- Hover: border var(--gold-border), color var(--gold)
- Active: scale(0.97)

### Tier 3 — Inline Feed Action (pill)
Small actions on post cards. Never the hero. (RESONATE, LYRIC BACK, CARD)
- Background: rgba(255,255,255,0.05) — Color: var(--text-2)
- Border: 1px solid rgba(255,255,255,0.10)
- Font: Lora 600, 0.6rem, uppercase, letter-spacing 1px
- Padding: 6px 14px — Border-radius: 50px — Min-height: 28px visual, 44px touch
- Hover: border var(--gold-border), color var(--gold)
- Active/resonated: background var(--gold-faint), border var(--gold-border), color var(--gold)

### Tier 4 — Selector/Toggle
Pick one from a set. Always in a row. (Square/Vertical/Wide, themes, Motion/Color)
- Default: background var(--surface-2), color var(--text-3), border var(--border)
- Active: background var(--gold-faint), border var(--gold-border), color var(--gold)
- Font: Lora 600, 0.58rem — Border-radius: 10px — Transition: all 150ms

### Tier 5 — Ghost/Dismiss
Never competes with content. Always top-right. (× close, Cancel)
- Background: rgba(255,255,255,0.05) — Color: var(--text-3)
- Border: 1px solid var(--border)
- Size: 32×32px visual, border-radius 50%
- Font: 1.1rem for × symbol only
- Hover: background rgba(255,255,255,0.10), color var(--text)
- Touch target: 44×44px via padding — never smaller

### Tier 6 — Pulse CTA Hint
Cycles gold glow across Tier 2 buttons to guide first interaction.
- Animation: 2.4s ease-in-out infinite, box-shadow gold glow
- Stops on first click — restarts on new post/session open
- Never on Tier 1 (already gold) — Never on Tier 5 (dismiss must never be highlighted)

### Rules for ALL tiers
- Font: Lora only — never Space Mono, never system font
- Colors: CSS variables only — never hardcoded hex
- Touch target: minimum 44×44px always
- Transition: all 150ms ease
- Text: uppercase, letter-spacing minimum 0.5px
- Animate only transform and opacity — never width/height/top/left

### Tech debt — Space Mono cleanup
Space Mono violates brand rules and must be replaced with Lora across:
- js/ui/resonate.js (partially fixed April 2026)
- js/ui/feed/styles.js
- js/core/username.js
- js/features/echoes.js
- js/features/duet-mode.js
- js/media/gif/renderer.js
Do in a dedicated branch: feature/spacemono-cleanup
