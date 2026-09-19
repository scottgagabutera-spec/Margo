# Margo — Investor Deck Brief
**5-minute elevator pitch · Q&A format · visually consistent with trymargo.com**

Version 1.0 — 15 August 2026  
**No deck has been built from this file.** This is the source pack for writing and designing it.

---

## How to use this

Take this document into a design/writing session and produce a short deck (recommended: **8 slides**, 16:9). Do not invent a new visual language. Do not pad with abstract market slides. Every claim should be either (a) a real product behavior someone can tap on trymargo.com today, or (b) a clearly labeled industry figure, or (c) a number Scott copies from Admin the morning of the meeting.

**Sources used (in order of authority)**

| Layer | Source of truth |
|---|---|
| Brand tokens, type, logo | `MARGO_BRAND.md` v4.10 + `app/globals.css` `:root` + `components/MargoLogo.tsx` |
| Product behavior | Live app: `app/page.tsx`, `app/about/page.tsx`, `app/compose/page.tsx`, `components/post-card.tsx` |
| Company facts | LinkedIn company page, founder LinkedIn, Terms/Privacy/DMCA on trymargo.com |
| Traction | **Must be filled from Admin Overview** — this repo has no live counts |
| Ask amount | **Not recorded anywhere in the repo or public pages** — fill before the meeting |

**What this brief is not**

- It is not the existing 12-slide long-form deck. That file is **not in this repository**, so its grid/card styles could not be reverse-engineered. The visual system below is the **live product and landing**, which is what a VC will open after the meeting.
- It is not a fundraising memo. Numbers that are not in Admin, Vercel Analytics, or a public filing are left blank on purpose.

---

# Part 1 — Brand / design system (use this, don’t restyle)

The feeling the deck should create in the first second, same as the product:

> Warm. Intimate. Like discovering a song that says exactly what you couldn't.

Ten standards (from brand): **Giants way · Modern · Premium · Unique for Margo · Long term · User experience · Consistency · Very logical · Mobile first · App ready.**

For a pitch deck that means: dark, sparse, gold used once per slide, lyrics in italic serif, chrome in sans. No stock photos of headphones. No rainbow gradients. No Inter.

---

## 1.1 Fonts (exact)

Loaded in `app/layout.tsx`. Helpers in `lib/fonts.ts`.

| Face | Family name | How it loads | Weights in use | Where it is used |
|---|---|---|---|---|
| **Geist Sans** | `Geist` (`--font-geist-sans`) | `geist/font/sans` — **variable woff2**, self-hosted | Variable **100–900**. Product uses **400, 500, 600, 700** | All UI chrome: nav, labels, handles, timestamps, song title/artist, settings, numbers, Q-labels on this deck |
| **Lora** | `Lora` (`--font-lora`) | `next/font/google` Lora, `style: ['normal','italic']` | **300** (landing hero), **400 italic** (lyric quotes), **600** (section titles / about H2), **700** (primary CTAs, about H1) | Posted lyrics, signature lyric, lyric-led marketing lines, landing hero, primary buttons |
| **Sora** | `Sora` (`--font-sora`) | `next/font/google` Sora, **weight `700` only** | **700 only** | **MARGO wordmark and nothing else** |

CSS helpers:

```
UI_FONT    = var(--font-geist-sans), system-ui, sans-serif
LYRIC_FONT = var(--font-lora), serif
```

**Removed — never bring back in the deck:** Bebas Neue, DM Sans, Instrument Serif, Space Mono, Inter, Syne (old wordmark), Satoshi, Google Fonts CDN for UI.

### Type role grid for the deck (mapped from Brand §3)

| Deck role | Size (16:9, ~1920×1080) | Weight | Color | Face | Notes |
|---|---|---|---|---|---|
| Slide question (the Q) | 11–13px | 700 | `--gold` | Geist | Uppercase, letter-spacing 1.5–2px. Same as landing footer column labels / About eyebrow |
| Slide title / one-sentence answer | clamp ~40–64px | 300 | `--text` | **Lora** | Match landing H1 “Talk in lyrics.” (`font-weight: 300`, `letter-spacing: -0.02em`, `line-height: 1.1`) |
| Body answer | 16–18px | 400 | `--text` or `--text-secondary` | Geist | Landing marketing body is Lora italic; **in a pitch deck, Geist body is more readable standing up.** Keep Lora for lyrics only |
| Lyric quote (examples) | 18–22px | 400 italic | `--text` | **Lora** | Always italic. Quote marks around the line |
| Song / artist under a lyric | 12–14px title / 11–12px artist | 600 / 400 | `--text` / `--text-secondary` | Geist | Always **stacked**, never `Title · Artist` on one line |
| KPI number | 36–48px | 600 | `--text` | Geist | One gold number per slide max |
| KPI label | 11px | 600 | `--text-muted` | Geist | Uppercase, letter-spacing 1px |
| Caption / source | 11px | 400 | `--text-muted` | Geist | Industry figures always sourced |
| CTA / pill | 10–11px | 700 | `--bg` on gold | **Lora** | Uppercase, letter-spacing 1–1.5px, radius 50px |

Floor: never go below **0.6rem / ~10px** even for captions.

**Landing vs product nuance (follow this):** the marketing site (`/`) is lyric-led — Lora for hero and italic subhead. The logged-in app is Geist chrome + Lora lyrics. The deck should look like **the landing hero plus a feed card**, not like a Notion template.

---

## 1.2 Color palette (exact hex)

Canonical tokens: `app/globals.css` `:root`. In the deck, hardcode these hexes (Figma/Gamma/Keynote cannot use CSS variables). In any web-built deck, use the variables.

### Surfaces

| Token | Hex / value | Use in deck |
|---|---|---|
| `--bg` | **`#07060A`** | Slide canvas. Near-black, **never `#000000`** |
| `--surface` | **`#0F0E13`** | Cards, quote panels, Q&A answer wells |
| `--surface-2` | **`#161420`** | Nested cards, dark lyric-back bubble |
| `--surface-3` | **`#1E1B2A`** | Rare; hover/pressed wells only |
| `--border` | **`rgba(255,255,255,0.07)`** | Default card stroke |
| `--border-hi` | **`rgba(255,255,255,0.12)`** | Selected / emphasis stroke |

Ambient (landing): two huge gold blurs, opacity 0.03–0.05, `filter: blur(120px)`. Optional on title + close slides only. Do not put a blur on every slide.

### Text

| Token | Hex | Use |
|---|---|---|
| `--text` | **`#F4F1ED`** | Primary copy, lyrics, titles |
| `--text-secondary` | **`#B8B6C0`** | Secondary sentences, handles, readable labels |
| `--text-muted` | **`#8A8894`** | KPI labels, sources, “Coming soon” |
| `--text-disabled` | **`#5C5A66`** | Placeholders only — **not** body |
| `--text-on-gold` | `#07060A` (same as `--bg`) | Text sitting on gold fills |

Do **not** use `--text-2` / `--text-3` (deprecated aliases). Do **not** use raw white at <45% opacity for anything a VC has to read.

### Gold (the signature — scarce)

| Token | Hex / value | Use |
|---|---|---|
| `--gold` | **`#E8C547`** | Logo, one CTA, active Q, one KPI, resonate |
| `--gold-warm` | **`#F5D46A`** | Hover only |
| `--gold-2` | **`#D4A832`** | Pressed only |
| `--gold-faint` | `rgba(232,197,71,0.08)` | Gold card wash (Tier-1 feed cards, featured exchange) |
| `--gold-border` | `rgba(232,197,71,0.28)` | Gold card stroke |
| `--gold-glow` | `rgba(232,197,71,0.12)` | Soft glow under primary CTA |

**Rule:** gold means something important. One gold object per slide (logo on title slide does not count). Never gold-on-gold. Never a gold background for a whole slide except the single gold lyric bubble in a Lyric Back pair.

### Emotion colors (optional, one vibe pill on a sample card — never a rainbow legend)

| Vibe | Hex |
|---|---|
| Love | `#FF6B9D` |
| Heartbreak | `#ff6060` |
| Hope | `#7B9FFF` |
| Nostalgia | `#E8C547` |
| Healing | `#4ade80` |
| Joy | `#ffc847` |
| Rage | `#FF6440` |
| Loneliness | `#a0a0ff` |
| Send It | `#00e5c8` |
| Let Out | `#c864ff` |

Compose also has Chill / Grateful / Spiritual / Hype / Proud / Pain / Lost — treat extra vibes as product detail, not a slide.

### Do not use

| Color | Why |
|---|---|
| `#6B4EFF` purple blobs on `/about` and `/contact` | Leftover, not a brand token. Brand audit flagged them. |
| `#08070C` | `site.webmanifest` `background_color` — off-token vs `--bg` |
| `#0B0B0D` | Logo **M-stroke only** (see logo). Not a surface. |
| Tailwind/shadcn `oklch` light theme in `globals.css` | Dead shadcn residue. Ignore. |
| Pure black, pure white, neon, rainbow vibe bars | Clashes with product |

---

## 1.3 Logo — files, tiers, sizing

**There is no separate “logo PNG pack” in the repo.** The logo is drawn by `components/MargoLogo.tsx`. Static copies:

| File | What it is | Deck use |
|---|---|---|
| `components/MargoLogo.tsx` | Canonical SVG: gold circle, M waveform, optional dash, optional Sora wordmark | Rebuild lockup from this |
| `public/icon.svg` | Symbol (circle + M + dash), 32×32, viewBox `-4 -4 88 88` | Favicon-scale; **too small for slides** — redraw at slide size from the same paths |
| `favicons/favicon.svg` | Same as `public/icon.svg` | No |
| `public/icon-dark-32x32.png` / `icon-light-32x32.png` | Raster favicons | No |
| `public/apple-icon.png` | Apple touch | No |
| `public/og-image.png` | 1200×630 Open Graph | Optional last-slide “trymargo.com” poster, not the logo lockup |
| `public/favicon.ico` | ICO | No |

### Geometry (from `MargoLogo.tsx`)

- Circle: `cx=40 cy=40 r=36`, fill `#E8C547`
- M path: `M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57` — stroke `#0B0B0D`, width 5, round caps/joins
- Dash (makes it Margo): `rect x=35 y=60 width=10 height=3.5 rx=1.75` fill `#0B0B0D` at 55% opacity
- Wordmark: `MARGO`, Sora 700, `#E8C547`, uppercase, **letter-spacing 2px** (locked)
- Wordmark size = **`max(11px, round(0.5 × symbol size))`** — so 28px mark → 14px type; 36px mark → 18px type
- Gap mark↔wordmark = `max(6px, round(0.25 × size))`
- In-app shadow: `drop-shadow(0 2px 8px rgba(232,197,71,0.25))` — **use on-screen; omit on print/PDF export**
- Rings: CSS only, nav/landing. **Never on a static slide or PDF**

### The 3 tiers

| Tier | What | Deck |
|---|---|---|
| 1 Mark | M in gold circle, **no dash** | Do not use (favicon only) |
| 2 Symbol | M + dash | Corner mark on interior slides |
| 3 Lockup | Symbol + MARGO | **Title slide and last slide only** |

### Recommended deck sizes (16:9)

| Context | Tier | Symbol size | Wordmark |
|---|---|---|---|
| Title slide, top-left | Lockup | **36px** (same as landing nav) | Yes, rings **off** |
| Interior slides, top-left | Symbol | **28px** (same as in-app nav) | No |
| Close / URL slide | Lockup | 48–64px | Yes |
| Sample export card in a mock | Symbol | 48px | No (product rule for card export) |
| Favicon / tiny | Mark | 16px | No |

Never recolor. Never redraw a different M. Never set the wordmark in Geist or Lora.

---

## 1.4 Spacing, radius, motion, layout

### Spacing scale (Brand §5)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 88 · 120` px. No random 18s and 22s.

Slide padding recommendation: **64px** outer; **48px** if the slide is dense. Interior gap between Q label and title: **16px**. Gap title → body: **24px**. Gap between two example cards: **16 or 24px**.

88px is the product’s “content below fixed nav” offset — not needed in a deck unless you mock a phone chrome.

### Radius scale (Brand §6)

| Radius | Use |
|---|---|
| 4px | Tags |
| 8px | Small chips, nested bits |
| 12px | Standard cards (song covers, contact panels, About-style wells) |
| 16px | Large cards |
| **18px** | **Feed post cards** (`post-card.tsx`) and landing exchange bubbles |
| 24px | Modals |
| 50px | Pills / primary CTA |

Landing ticker cards are **14px** radius — close enough to 12; prefer **12 or 18** in the deck, don’t invent 14 as a third system.

### Layout conventions already in the product (steal these)

| Pattern | Spec | Steal for |
|---|---|---|
| Landing max measure | Hero `maxWidth: 56rem`; exchange `maxWidth: 520px` | Title + “what is it” |
| Feed column | `maxWidth: 720px`, page pad `32px 24px` | Phone mock of a feed card |
| Catalog grid | `maxWidth: 72rem`, `repeat(auto-fill, minmax(160px, 1fr))`, **gap 16px**, song cover radius **12px** | Do not put a 12-up catalog on a 5-min slide |
| How-it-works | **3 columns**, gold numbered circles, Geist titles | The walkthrough slide |
| Exchange pair | Gold bubble (post) then dark bubble (Lyric Back), tails, 18px radius, Lora italic | Title slide + problem slide |
| Contact panel | `--surface`, `1px solid --border`, radius **12px**, pad **28px** | Q&A well / ask box |
| Hairline gold rule | `width 48px, height 2px, linear-gradient(90deg, gold, transparent)` | Under the Q on every slide |
| Ambient | Two gold orbs, blur 120px, opacity 0.03–0.05 | Title + close only |

### Card styles to copy (not invent)

**A. Feed lyric card** (`components/post-card.tsx`)

- Background: `rgba(232,197,71,0.04)` if the post is playable catalog (Tier-1), else `rgba(255,255,255,0.02)`
- Border: gold `rgba(232,197,71,0.22)` or white `rgba(255,255,255,0.06)`
- Radius **18px**, pad **16px** (compact 12px)
- Top hairline gradient across 60% width
- Vibe as a **price-tag silhouette** (`VibeTag`), not a rounded pill, on the card edge
- Lyric: Lora italic ~1.1rem
- Actions in **one row**: Resonate · Lyric Back · Card · Replay — SVG icons, not emoji
- Earned badges New / Trending / Top: Geist 700, 0.6rem, gold, pill, only if earned

**B. Landing ticker card** (`app/page.tsx`)

- 220px wide, pad 14×18, radius 14px, gap 8px inside
- Lora italic lyric, 2-line clamp
- Tiny vibe pill + artist

**C. Lyric Back pair** (landing hero + export)

- Gold bubble = original post (`background: var(--gold)`, text `--bg`)
- Dark bubble = reply (`--surface-2`, `--border-hi`)
- Footer: song title (Lora 700 0.7rem) · artist · `@handle`
- This is the single most “Margo” visual. Put it on slide 1.

**D. Song catalog card**

- 1:1 cover, radius 12px, shadow `0 8px 24px rgba(0,0,0,0.5)`
- Gold play circle 32px, `PlayPauseIcon` 14px in `--bg`
- Title Geist 600 0.95rem / artist Geist 400 0.75rem stacked

**E. Export card** (what users actually share)

- Themes: Violet (gold on `#0E0B1A` — closest to product), plus Purple / Ocean / Ember / Forest / Bone
- Shapes: 1080², 1080×1350 story, 1920×1080 wide
- Ghost symbol bottom-left, opacity 0.18, **no shadow**, URL `trymargo.com`
- Dual-card for Lyric Backs: parent + reply on one image

### Motion (if the deck is web / Gamma, not PDF)

- Ease out: `cubic-bezier(0.16, 1, 0.3, 1)`
- Fast 150ms, normal 220ms
- Animate **transform and opacity only**
- Respect reduced motion
- Logo rings: 2.4s, three staggered 0.8s — landing/nav only, not slides

### Breakpoints (if you build a web deck)

- Mobile-first 375px
- 640px = desktop nav appears
- Touch 44×44 — irrelevant on a projector, still don’t make tiny gold dots as the only hit target if this is also a linkable URL

### Buttons (if a slide has a URL chip)

Tier 1: gold fill, `--bg` text, **Lora 700**, 0.6–0.7rem, uppercase, tracking 1.5px, pad 14×24, radius 50px, min-height 48px, shadow `0 6px 28px rgba(232,197,71,0.28)` — this is the landing “See What’s Live” button.

### Voice

DO: “Drop a lyric back.” / “When words fail, drop a lyric.” / “Talk in lyrics.”  
DON’T: “Add a comment.” / “Submit.” / “We’re a music-tech platform leveraging AI.”

Empty states are invitations. The deck should sound like a music lover, not a SaaS company.

### Icons

SVG only. No ▶ ♥ ↩ ✦. If you need play/pause, copy `PlayPauseIcon`. If you need resonate, copy `HeartIcon`. Stroke 1.5, 24×24 viewBox, round caps.

---

## 1.5 Deck canvas recommendation

| Spec | Value |
|---|---|
| Ratio | **16:9** (standing-up / TV / Zoom). Optional 9:16 leave-behind of the Lyric Back card, not the pitch itself |
| Canvas | `#07060A` |
| Safe inset | 64px |
| Grid | 12-column mental grid, 24px gutter — **not** a 12-slide deck. Content sits in 8–10 columns, never edge-to-edge type |
| Type lockup | Top: Geist gold Q + 48px gold hairline. Then Lora title. Then Geist body / one example card |
| Footer | Symbol 28px left; `trymargo.com` Geist 11px `--text-muted` right; slide number `--text-disabled` |
| Density | One question, one answer, one concrete example. If it needs a footnote, it belongs in the appendix |

---

# Part 2 — Content (Q&A a VC will actually ask)

Answers below are written for the deck: first a **one-line answer** (the slide title), then the **spoken paragraph**, then **concrete examples**. Placeholders are marked `⟦FILL⟧`.

---

## Q1. What is Margo?

**One sentence (slide title, Lora 300):**  
Margo is where people talk to each other in song lyrics.

**One paragraph (speak this):**  
People already send lyrics when plain words fail — in a story, a status, a text, a caption. Margo is a social product built for that habit. You post a line, tag the feeling, and someone answers with a line of their own. That reply is a Lyric Back. There is no comment box. The conversation stays inside music. You can listen to the moment, open the full song, follow the person, and — if you’re an artist — put your own music in the same room.

**Show, don’t tell (put this on the slide, not a paragraph):**  
The landing hero pair, which is the actual mechanic:

> “Keep me in your mirror but don't take your eyes off the road…”  
> **Mirror** · Madison  
>  
> “See you again.”  
> **See You Again** · Wiz Khalifa

That is Margo. Two people, two songs, one feeling. Live at [trymargo.com](https://trymargo.com).

**Product one-liners already in market (pick one, don’t stack):**

- Landing: “Send a line from a song. Someone sends one back. That's Margo.”
- About: “Music is the language. Margo is the space.”
- LinkedIn company: “Communicate Through Song Lyrics.”
- Site title: “Talk, Listen & Share Through Song Lyrics.”

**What Margo is not:** not a Spotify clone, not Genius with a feed, not Instagram Stories for lyrics. Those are where the behavior currently leaks. Margo is the home for it.

---

## Q2. What problem does it solve, and why now?

**One sentence:**  
Billions of people already speak in lyrics. Nobody built the social network for that.

**The problem, concretely:**  
Maya wants to tell someone it’s over without writing a paragraph. Today she screenshots Spotify, pastes a line into Instagram, or searches Genius and dumps the text in WhatsApp. The other person hearts it — or replies in words. The song is decoration. The conversation left music.

On Margo she posts the line, tags **Heartbreak**, and Jordan Lyric-Backs with a different song. Both lines are playable if Margo hosts them. Both are shareable as a card. Both count as **Lyric Uses** — how many times that line was used to say something, not how many times it was streamed.

**Why the behavior is real (industry, not Margo vanity):**

- Genius is a lyrics-as-destination business with **100M+ monthly visitors** (Genius / Music Ally, June 2026) and on the order of **~180M monthly visits** in third-party traffic reports. People already go looking for lines.
- Recorded music is still growing: **US$31.7B** in 2025, **11th straight year**, streaming **>US$22B / 69.6%** of that, **837M paid streaming accounts** (IFPI Global Music Report 2026).
- Spotify alone: **761M MAU**, **293M Premium** (Q1 2026, company figures via industry press). Listen is solved. **Talk through what you heard is not.**
- Sub-Saharan Africa recorded-music revenue **+15.2%** in 2025 (IFPI) — the founder is building from Kigali into a region where mobile-first music social is still being claimed.

**Why now:**

1. **The habit exists.** Stories, statuses, TikTok sounds, Genius searches — lyrics are already how people caption feelings.
2. **Streaming won listen, and stalled meaning.** Playlists don’t tell you that a thousand people used *this line* to say “I’m leaving.”
3. **Independents and AI-assisted artists need a room that isn’t a DSP homepage.** Margo already hosts originals + approved artists, and redirects majors instead of pretending to license them.
4. **The product is live**, not a Figma. Feed, Lyric Back, Discover Moments, karaoke, Studio, DMs, cards — shipping weekly from Rwanda.

**Founder’s own sequencing (LinkedIn, Feb 2026) — use this, it’s honest:**  
You can’t build a system before you build a habit. Stage 1 is expression (drop a lyric). Stage 2 is discovery and licensed lyrics. Stage 3 is native streaming. The vision didn’t shrink; the order changed.

---

## Q3. Who is the user? Walk one real person through Margo, start to finish

**One sentence:**  
A person who would have sent a lyric in a text — and the independent artist that line might belong to.

**Two users, one loop.** Do not pitch “everyone who likes music.”

### User A — Maya, 24, sends lyrics instead of paragraphs

Composite of the actual product path (Compose → Feed → Lyric Back → Card → Discover → Song). Not a fake case study with fake metrics.

1. **Lands on trymargo.com.** Sees a gold bubble and a dark bubble — someone already talking in lyrics. Taps **See What’s Live**.
2. **Browses Feed as a guest.** She can look. To post, resonate, Lyric Back, or DM she has to sign in (email/OAuth, real profile — anonymity is not the product).
3. **Compose.** Searches a line, a song, an artist, or a person. Catalog-first (Margo-hosted songs). If it isn’t hosted, Genius identifies the track and she can still post the excerpt; play may redirect out.
4. **Picks the line** (or a short window of adjacent lines). Caps the text. Tags a vibe — e.g. **Nostalgia**. Posts.
5. **Jordan sees it.** He taps **Resonate** (gold heart). Or **Lyric Back**: he searches his own line, or taps **See Lyric Back suggestions** and accepts a catalog suggestion. His reply is a new post linked to hers — not a comment.
6. **Maya exports a Card** (square / story / wide, gold-on-dark) and drops it in WhatsApp. Footer says trymargo.com. Dual-card if it’s a Lyric Back.
7. **She taps the moment and listens** — snippet of the quoted line via the in-app engine, then **full karaoke** on `/song/[id]` if Margo hosts the audio.
8. **Discover.** Moments (lyric units), song grid, artists. She follows Jordan, maybe DMs if he allows it. Profile is a person: display name, `@handle`, lyrics, optional artist badge.
9. **She comes back** because someone Lyric-Backed her at 1am, not because a For You algorithm showed her a video.

**Primary tabs she lives in:** Feed · Discover · Compose · Hub (Library / Messages / Alerts) · You.

### User B — Alex, independent artist

1. Applies at `/apply-artist` (account required). Admin approves → `profiles.is_artist`.
2. **Studio:** uploads audio + artwork to R2, Whisper times the lines, vibes get tagged, song goes **live**.
3. When Maya quotes a line, that song’s **Lyric Uses** increments. Plays count only on real karaoke listens (30s or 50% if the track is under 60s) — not on snippets.
4. Alex’s profile is in `/artists`. His music sits in the same feed where people are already talking.

**Do not claim** a named real user or a conversion rate you don’t have. If you have a real Maya (a screenshot of an actual Lyric Back from production), **use that screenshot** instead of the fallback exchange.

---

## Q4. What’s the business model?

**One sentence:**  
Free to talk in lyrics today. Money follows the habit: artists, then licenses, then listening — not ads on day one.

**Honest present tense (August 2026):**

- Consumer app is **free**. Structured data on the site even lists `offers.price = 0`.
- Internal strategy doc still describes a **pre-revenue solo founder**.
- No ads product, no IAP, no paid tier in the app.
- **Margo Originals** are already distributed on DSPs (Spotify artist linked from the landing footer; DistroKid imprint `12537896 Records DK` on releases such as *Formidable*, May 2026). That is a catalog/identity wedge, not a revenue story yet.
- **Independent artists** apply, get approved, upload. They are supply, not yet a take-rate.

**How it becomes a business (in the order the founder already published):**

| Stage | What | How money can show up | Status |
|---|---|---|---|
| **1. Expression** | Post / Resonate / Lyric Back / Card | Attention + habit. Cards are the growth loop (export → WhatsApp/IG → back to Margo) | **Live** |
| **2. Discovery** | Moments, suggestions, licensed lyric ID (Musixmatch path), “where to listen” for majors | Affiliate/outbound to DSPs; later, lyric license as COGS for displaying full licensed text; artist tools | Partially live (Genius ID + redirect). Musixmatch / listen-modal still plan |
| **3. Native streaming** | Hosted catalog + karaoke | Later: artist/label deals on hosted audio, possible premium listening. **Not** “beat Spotify at catalogs” | Live only for Margo-owned + approved independents. Majors stay redirect-only on purpose |

**Unique asset to sell later (do not over-claim it as revenue today):**  
**Lyric Uses** — times a specific line was used to communicate something. Not streams. Not likes. Intent. Labels and independents cannot buy that signal from Spotify or Instagram today.

**What not to say:** “We’ll take 30% of streaming like Spotify.” That fights an incumbent on their battlefield. Margo’s wedge is **conversation**, then **the catalog that conversation points at**.

**Rights posture (credibility with music VCs):**  
Three tiers, already in product and Terms:

1. **Margo Originals** — owned.  
2. **Approved independents** — uploader warrants rights; Studio; DMCA agent **DMCA-1077694** on file.  
3. **Everything else** — excerpt + redirect. Never hosted.

That is how Audiomack/SoundCloud actually opened, not “license Universal before launch.”

---

## Q5. What’s the traction?

**One sentence:**  
The product is live. Copy this morning’s Admin numbers — do not present placeholders.

**This environment could not query production.** There is no `.env`, no analytics export, and no traction table in git. **Inventing MAU would be worse than a small number.**

### Copy from Admin Overview the day you present

Admin → Overview (`app/admin/page.tsx` / `lib/admin-overview-kpis.ts`). Timezone for the sparkline: **Africa/Kigali**. Window: **last 30 days**.

| KPI on screen | Field | Put on the slide as |
|---|---|---|
| Signups (all-time profiles) | `growth.signupsTotal` | Accounts |
| Active top-level posts | `growth.postsActive` | Lyrics posted (live) |
| All top-level posts | `growth.postsAll` | Lyrics posted (incl. hidden) |
| Active Lyric Backs | `growth.lyricBacksActive` | Lyric Backs |
| All Lyric Backs | `growth.lyricBacksAll` | Lyric Backs (incl. hidden) |
| Live songs | `liveSongs` | Hosted catalog |
| Approved artists | `approvedArtists` | Artist roster |
| 30-day signup sparkline | `growth.signupsByDay` | Tiny bars, Kigali dates |

**Also pull, if you have them (not in this git snapshot):**

| Source | Number |
|---|---|
| Vercel Analytics | Weekly visitors, top routes (`/`, `/feed`, `/discover`) |
| `card_exports` table | Cards exported (share loop) |
| `song_stats.plays` / `lyric_uses` | Catalog listens vs communication |
| Instagram `@officialtrymargo` · TikTok `@officialtrymargo` · YouTube `@trymargo` · X `@OfficialUTM` | Followers — **verify the morning of**; this brief does not scrape them |
| Spotify `open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ` | Monthly listeners for **trymargo the artist**, not the app |

**Public facts that are true without a query:**

- Live at **trymargo.com**, Next.js app, real accounts, guest browse, gated write.
- Company page: **Founded 2025**, privately held, listed **2–10 employees**, Technology / Information / Media. LinkedIn company followers were **7** when checked Aug 2026 — **do not put LinkedIn followers on a traction slide.**
- Internal docs: **pre-revenue**.
- Catalog once verified at **10 live songs** during the 2026 Supabase migration — **that number is stale; replace with Admin `liveSongs`.**
- Product surface area shipped: Feed, Discover (Moments + songs), karaoke, Compose, Lyric Back + Suggested Lyric Back, Replay, card export, profiles, follows, DMs, notifications, Hub/Library, Studio, artist apply, admin, DMCA.

**How to talk small numbers:**  
“We’re pre-scale on purpose. Stage 1 is the habit. These are real people posting real lines on a live network I shipped — not a waitlist.” If signups are still tiny, **lead with a real Lyric Back screenshot**, not a vanity chart.

Fill-in block for the slide:

```
Accounts          ⟦FILL from Admin signupsTotal⟧
Live lyrics       ⟦FILL postsActive⟧
Lyric Backs       ⟦FILL lyricBacksActive⟧
Hosted songs      ⟦FILL liveSongs⟧
Approved artists  ⟦FILL approvedArtists⟧
Cards exported    ⟦FILL if you query card_exports⟧
```

---

## Q6. What’s the market, and why does Margo have a shot?

**One sentence:**  
The listen market is huge and owned. The *talk-in-lyrics* market is unowned.

**Do not put a US$500B TAM pyramid on a 5-minute deck.** Use one tight stack:

| Layer | Figure | What it is | Source |
|---|---|---|---|
| **Listen (context, not TAM)** | US$31.7B recorded music, US$22B+ streaming, 837M paid accounts (2025) | Proves music is a real economy | IFPI GMR 2026 |
| **Lyric demand (proof of habit)** | 100M+ monthly Genius visitors | People already seek lines | Genius / Music Ally Jun 2026 |
| **Margo’s shot** | Category of one: social graph where the edge is a lyric, not a follow or a stream | Why a small team can start | Product |

**Why Margo specifically:**

1. **Behavior-first, not catalog-first.** Instagram won photos because people already took photos. Margo is betting the same thing about lyrics.
2. **Built where the next streaming growth is.** IFPI: Sub-Saharan Africa and MENA each **+15.2%** in 2025. Founder is in Kigali, bilingual Rwanda/Switzerland, already shipped a live English-language product on the global web.
3. **Supply that DSPs ignore sits naturally here.** Independents + Margo Originals + AI-assisted artists who keep commercial rights (About page + Terms). Majors are invited as *lines people quote*, not as a licensing hostage situation.
4. **A metric incumbents don’t have.** Lyric Uses = communication intent. That is a wedge into artist tools and later data, the same direction Genius is now expanding into (data licensing, 2026) — except Genius is still a lyrics *encyclopedia*, not a *conversation*.

**Comparable positioning (one line each, never a competitor slide of logos):**

| Product | What they are | What they are not |
|---|---|---|
| Spotify | Listen | No lyric conversation |
| Instagram / TikTok | Photo/video social; music is a sound layer | The comment is still words |
| Genius | Search + annotate lyrics | Not a social graph of people talking *as* lyrics |
| Margo | People talking in lyrics, with optional listen | Not a full major-label DSP |

---

## Q7. Who’s the team, and why is this credible?

**One sentence:**  
Scott Gaga Butera (Butera G. Scott) — founder. He already built the live product, and he has been in music rights since before Margo.

**Who presents:**

- **Butera G. Scott / Scott Gaga Butera** — Founder, Margo. Based in **Rwanda (Kigali)**. Grew up in Rwanda, studied in **Switzerland** (HES-SO University of Applied Sciences and Arts Western Switzerland, per LinkedIn). Builds with a music-lover’s taste system (this brand doc is the proof).
- Contact: `investors@trymargo.com` · `hello@trymargo.com` · [linkedin.com/in/butera-g-scott-979910376](https://www.linkedin.com/in/butera-g-scott-979910376) · [linkedin.com/company/trymargo](https://www.linkedin.com/company/trymargo)

**Why he’s credible to build this, concretely:**

1. **The app exists.** Next.js 16, Supabase, R2 audio, Realtime feed, karaoke, Studio, moderation, DMCA agent. Not a slide about “we will hire a CTO and then start.”
2. **He has been in the music-rights problem before.** Co-founded **MNI — Muzika Nyarwanda Ipande Ltd** (with Jean-Christian Ndikubwayo), covered by *The New Times* (students launching a platform for Rwandan artistes to earn from their craft; MNI awards ceremony coverage 28 June 2020). Margo is the grown-up, global version of that instinct: artists should get a room, and lyrics are how fans already talk.
3. **Taste is a moat at seed.** The brand system is unusually tight for a pre-seed consumer app. VCs will feel it in the first 3 seconds of trymargo.com.
4. **Sequencing discipline.** Publicly killed the “build everything” version (points, dashboards, licensed full-catalog streaming) until the habit exists.

**Team honesty (say this if asked, don’t hide it):**

- LinkedIn company lists **2–10 employees**. Internal engineering docs still say **solo founder**. Other names on his LinkedIn headline (Tapa, Gagara, Annie) are **other products**, not a Margo org chart. **Do not imply a 10-person Margo team.**
- For the ask slide: the first hires are the point of the round (see Q8).

**Do not:** put a fake advisory board. Do not claim Jean-Christian as Margo co-founder unless that is actually true today — public record ties him to **MNI**, not to Margo.

---

## Q8. What’s the ask — how much, for what, and what does the timeline look like?

**Amount: `⟦FILL — not in repo, not on the website⟧`.**  
Do not invent a round size in the designed deck. Write the number Scott decides, then lock it.

**Suggested frame (pre-seed / seed-pre, given pre-revenue + live product):**  
A **12–18 month** round to finish Stage 1 distribution and start Stage 2 licensing — not to out-stream Spotify.

### Use of funds (edit the split; keep the buckets)

| Bucket | What it actually buys in *this* codebase / plan | Typical share |
|---|---|---|
| **Growth** | Get Maya’s card into WhatsApp/IG; Africa + diaspora launch; maybe one city/campus cohort | 35–45% |
| **Licensing & trust** | Musixmatch (or equivalent) for real lyric text + sync; audio fingerprinting on Studio uploads; counsel on uploader warranties | 20–25% |
| **Product** | Native apps (PWA exists; “app ready” is a brand law); listen-out modal; Suggested Lyric Back quality; performance | 20–25% |
| **People** | First hire: a designer/engineer or a community/artist lead so Scott is not the entire company | 15–20% |

### Timeline (founder-published stages + rights plan)

| When | Milestone a VC can check |
|---|---|
| **Now** | Live web app. DMCA agent registered (`DMCA-1077694`). Studio for approved artists. Majors redirect-only |
| **0–6 months** | Habit metrics: weekly posters, Lyric Back rate, card exports. Fingerprinting on upload. “Where do you want to listen?” for unhosted songs |
| **6–12 months** | Serious lyric-ID license if usage justifies it. First paid experiment: artist tools or DSP affiliate — **pick one, don’t both** |
| **12–18 months** | Either: evidence the habit is compounding (raise a larger round), or: hosted catalog + a real take-rate with independents |

**Close line:**  
“We’re raising **⟦FILL⟧** to make talking in lyrics a daily habit — then to license and listen around that habit. trymargo.com is already on.”

---

## Q9. What’s the moat? Why can’t Spotify or Instagram just do this?

**One sentence:**  
They would have to stop being themselves.

**Spotify** is a listen graph. Their unit is a stream. A Lyric Back is a *reply*. To copy Margo they would have to put a social conversation on top of Premium, invite the comment-section problems they have spent years avoiding, and measure communication instead of plays. Their customers are labels whose contracts are about streams. **Lyric Uses threatens the metric they sell.**

**Instagram / TikTok** already have lyrics as stickers and sounds. The comment is still words, the unit is still a video/photo, and music is licensed as a soundtrack. If they “add lyric replies,” it becomes another sticker pack, not a graph of people whose relationship is *made of songs*. Their ranking systems optimize watch time, not whether Jordan found the exact answering line.

**Genius** owns search-intent for lyrics. They do not own the social act of *sending* a line as the message. Copying Margo would mean becoming a social network — a different company.

**What Margo has that is actually hard to copy once it works:**

1. **The primitive:** Lyric Back (no comments). That’s a product religion, not a feature flag.
2. **The graph:** post → vibe → reply line → song → person. Edges are lyrics.
3. **Lyric Uses:** a new number artists can care about.
4. **Rights shape:** hosted independents + originals; majors as quotes, not a lawsuit.
5. **Taste / brand:** gold, Lora, Sora lockup, no emoji chrome. Incumbent design systems cannot look like this without a side-quest.
6. **Head start on a small, weird habit** that looks trivial until it isn’t — the same class of bet as “photos of your lunch” in 2010.

**Weak moat today (say it if asked):**  
Network effects don’t exist at tiny scale. The real protection *this year* is speed, taste, and refusing to become a DSP. The round is to get to a graph that is painful to recreate.

---

# Part 3 — Structure for a 5-minute standing pitch

**8 slides. ~35–40 seconds each. No appendix in the room.**  
Keep a 2-slide appendix in the file for Q&A (model detail, rights tiers).

Existing 12-slide long-form: too much for standing up. If a slide doesn’t answer one of the questions above, it doesn’t ship.

| # | On screen (Q in gold Geist, answer in Lora) | Visual | Seconds | Spoken job |
|---|---|---|---|---|
| **1** | **What is Margo?** / “People talk in lyrics.” | Lockup 36px. Gold + dark Lyric Back pair (Mirror / See You Again or a **live** pair). URL | 25 | Hook. Don’t define “platform.” |
| **2** | **What problem?** / “The habit has no home.” | Left: Maya’s IG screenshot / WhatsApp paste (generic mock). Right: the same line as a Margo card | 40 | Problem + why now in one breath. One IFPI or Genius figure max, as a caption |
| **3** | **Who is it for?** / “Maya posts a line. Jordan answers in a song.” | 3-up How-it-works: Post a lyric → Get a Lyric Back → Discover the artist (already on the landing) | 45 | Walkthrough. Tap the air as if it’s the phone |
| **4** | **How it works in the product** | One real feed card (Resonate / Lyric Back / Card / Replay row visible) + tiny karaoke still | 35 | Proof it’s built. No architecture diagram |
| **5** | **Traction** / the four `⟦FILL⟧` numbers | 4 Geist KPIs + optional 30-day Kigali sparkline. If numbers are small, **replace two KPIs with a real Lyric Back screenshot** | 30 | Live, not a waitlist. No hockey stick |
| **6** | **Why this wins** / “Listen is owned. Talk isn’t.” | Three lines only: Spotify = listen. Instagram = pictures. Margo = lyrics as the message. Tiny Lyric Uses definition | 40 | Market + moat fused. No TAM pyramid |
| **7** | **Who’s building it** / Scott, Kigali, live product, MNI history | Photo + 3 proof points. Not a fake org chart | 30 | Credibility |
| **8** | **The ask** / “⟦FILL⟧ to make this a habit.” | Amount, 12–18 months, 3 buckets, `investors@trymargo.com`, lockup, trymargo.com | 40 | Close. Sit down |

**Cut from the 12-slide version if it had these:** team bios beyond Scott, full TAM/SAM/SOM math, tech stack, detailed financials, 10-competitor matrix, “vision 2030” collage, multiple CTAs.

**Appendix (file only, skip unless asked):**

- A1. Rights tiers + DMCA-1077694  
- A2. Stage 1→2→3 and use-of-funds table  

**Reading-it-standing-up test:** print 8 slides as hand cards. If you need to squint, cut copy. Body ≤ 40 words per slide besides the lyric example.

---

## Design do’s for whoever builds the deck

1. Open trymargo.com on a phone, screenshot the hero exchange, use it on slide 1.  
2. One gold object per slide.  
3. Lyric examples always Lora italic; never Geist italic.  
4. Wordmark only on slides 1 and 8.  
5. No emoji, no stock concert crowd, no waveform decoration except the logo M.  
6. If you web-build it, Geist + Lora + Sora via the same `next/font` stack; if you Figma it, install those three families (Sora 700, Lora 300/400 italic/700, Geist 400/600/700).  
7. Export PDF **without** logo drop-shadow and **without** rings.  
8. Last slide URL is **trymargo.com**, not a Bitly.

---

## Fill this before you design (Scott)

- [ ] Admin: accounts, live lyrics, Lyric Backs, live songs, approved artists  
- [ ] Optional: card exports, Vercel visitors, DSP monthly listeners  
- [ ] Round amount and % dilution / instrument (SAFE vs priced)  
- [ ] Whether anyone else is on the cap table or joining as a co-founder  
- [ ] One **real** Lyric Back screenshot from production (replace the Madison / Wiz fallback if you have a better live pair)  
- [ ] Headshot for slide 7  

---

*Brand tokens: `MARGO_BRAND.md` v4.10, `app/globals.css`, `components/MargoLogo.tsx`. Product: trymargo.com, August 2026. Industry figures: IFPI Global Music Report 2026; Genius/Music Ally June 2026. Company: LinkedIn, Terms, DMCA page. Traction and ask: fill from Admin and Scott — not from this file.*
