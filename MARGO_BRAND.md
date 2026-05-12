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

DON'T:
- Hardcode any color
- Use any font other than Lora and Syne
- Add a new color without updating this document
- Go below 0.6rem font size
- Create touch targets smaller than 44px
- Animate layout properties (width, height, top, left)
- Use emoji for play/pause — always use PlayPauseIcon component

---

*Last updated: May 2026 — Version 4.0*
