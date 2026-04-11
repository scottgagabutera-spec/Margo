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
