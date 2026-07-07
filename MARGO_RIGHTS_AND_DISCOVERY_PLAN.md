# Margo — Rights, Discovery & Playback Infrastructure Plan
*Draft v1 — July 2026 — Living document*

**This is a strategic and technical plan, not legal advice.** Anything in Section 1 involving DMCA registration, uploader agreements, or rights warranties should be reviewed by an actual entertainment/IP lawyer before going live. This document is meant to make that lawyer conversation faster and cheaper by having the shape already worked out.

---

## 0. The goal in one sentence

Let anyone communicate through song lyrics with zero friction, while being aggressive about opening the platform (independent artist uploads, full catalog access) without being reckless about copyright exposure — building the legal foundation *first*, then growing fast on top of it, the way Audiomack and SoundCloud actually did it (not "get every license before launch").

---

## 1. Legal Foundation (do this before opening uploads wider)

### 1.1 DMCA Safe Harbor Registration
- **Actual cost: $6, one-time**, paid directly to the U.S. Copyright Office. Self-serve online registration, ~10 minutes, no lawyer required for the filing itself. Covers up to ten domains and is valid for 3 years before a $6 renewal.
- Requires the agent's contact info to be published in **two places**: on trymargo.com itself AND in the Copyright Office's public directory. Courts have specifically held both are required — one without the other does not give you safe harbor.
- Publish a Copyright Policy page on trymargo.com describing the takedown process.
- Build a real notice-and-takedown workflow: a reporting form/email, a defined response time, and a process for removing infringing content and handling repeat-infringer accounts.
- This is the legal floor that protects Margo the way it protects YouTube, SoundCloud, and Audiomack — it does not prevent lawsuits, but it removes most monetary liability for user-uploaded infringement if you act in good faith.
- **Sequencing note:** the ToS uploader warranty, the copyright policy page, and the takedown workflow can all be drafted and published now, with no dependency on the $6 filing. But do not open uploads widely to independent artists until the $6 filing is actually done and live in both places — that's the one piece standing between "responsible" and "unprotected."

### 1.2 Terms of Service — Uploader Rights Warranty
- Every artist upload requires the uploader to affirmatively warrant they own the rights or have explicit permission to distribute the track.
- Store this acceptance with a timestamp per upload (not just once at account creation) — this is your evidence trail if a dispute arises.
- Include a clear repeat-infringer policy: accounts get suspended after a defined number of valid takedowns.

### 1.3 Two-tier risk model (already partially in place)
| Tier | What it is | Legal exposure |
|------|-----------|-----------------|
| Tier 1 — Margo Originals | Songs Margo owns outright | None — full control |
| Tier 2 — Licensed/Verified Independent Artists | Artist warrants ownership + agrees to ToS | Low — protected by DMCA safe harbor + warranty trail |
| Tier 3 — Everything else (major label catalog, etc.) | No rights, no hosting | Zero — redirect-out only, never hosted or streamed |

Tier 3 is the current redirect model — keep it as the permanent default for anything not explicitly cleared.

---

## 2. Audio Fingerprinting Layer

**Purpose:** catch unauthorized uploads before they go live, the way Audiomack does — this is what separates "responsible open uploads" from "reckless open uploads."

- Screen every artist upload through a fingerprinting service (e.g. Audible Magic, ACRCloud) against known copyrighted catalogs before it's published.
- Flow: upload → fingerprint check → (a) clean → goes live, or (b) match found → held for manual review / rejected.
- This runs *in addition to*, not instead of, the DMCA takedown process — fingerprinting is the pre-screen, DMCA is the backstop for anything that slips through.
- Cost is API-based (per scan), not enterprise-tier — reasonable for a pre-revenue solo founder to start with.

---

## 3. Lyric Identification Layer — Musixmatch Replacing Genius

### 3.1 What actually changes
Musixmatch replaces **Genius only** — the lyric-search/song-identification function. It does not replace streaming destinations (Spotify, Apple Music, etc.) and it does not grant any right to host or stream audio. Two completely separate rights stacks:
- **Lyrics/composition rights** → Musixmatch (once licensed)
- **Master recording rights** → still requires separate licensing per song, which Margo does not have for outside catalog — hence Tier 3 stays redirect-only.

### 3.2 Why the swap is worth it
- Musixmatch offers full lyric text + synced (line-timed) lyrics on a commercial license — this could eventually replace the Whisper transcription step in the admin upload pipeline for licensed content, saving processing time and likely improving accuracy.
- Single strong matcher instead of relying solely on Genius for identification.

### 3.3 Path to get there
- Free tier now: prototype `matcher.track.get` against existing catalog, compare match quality/coverage to Genius.
- Do NOT commit budget to a paid tier until you have real usage numbers — Musixmatch pricing has historically been negotiated per deal based on user volume, not flat-rate self-serve. **Open question:** whether they offer a prepaid/metered model similar to OpenAI's credit system is unconfirmed — ask their commercial team directly rather than assuming either way.
- Commercial tier unlocks full lyric text + synced timing for display to real users (free tier is ~30% preview only, not shippable).

### 3.4 Whisper replacement scope (admin ingestion only)
- Whisper is currently used **only in the admin song-ingestion pipeline** (`POST /api/whisper`) to auto-generate SRT timing for newly added songs — it has no presence in the user-facing feed or player.
- If a paid Musixmatch deal is signed and its synced-lyric data proves more accurate/reliable than Whisper's auto-transcription for a given track, Musixmatch synced lyrics can **replace Whisper as the SRT source for that track** in the admin pipeline — same downstream consumer (`songs/{id}.srt`), different upstream source.
- This is a per-track swap decision at ingestion time, not a platform-wide cutover: Whisper stays as the fallback for any song without Musixmatch synced-lyric coverage (e.g. less mainstream or regional tracks Musixmatch may not have synced data for).
- No user-facing change either way — this only affects how accurate/clean the snippet timing is behind the scenes.

---

## 4. Multi-Platform Discovery Layer — the "Where do you want to listen?" Modal

### 4.1 The idea
Instead of a single redirect-out link, tapping play on a Tier 3 (non-hosted) song opens a modal offering the major platforms where the song is actually available: YouTube, Spotify, Apple Music, Deezer, Audiomack, and others as relevant.

### 4.2 Why this is the right move
- Turns a dead-end redirect into an intentional, premium-feeling moment — consistent with Margo's brand voice ("Drop a lyric back," not "No data found").
- Doesn't require any new licensing — these are just outbound links, same legal footing as today's single-link redirect.
- Naturally extensible: Audiomack could be added as a platform option immediately, since it's a strong match for Margo's target audience (youth culture, Africa/Caribbean-heavy) and doesn't require any deal to link out to.

### 4.3 Data requirements
Each `songs/{songId}` entry (for Tier 3 songs) needs a `streamingLinks` object:
```
streamingLinks: {
  youtube: "url" | null,
  spotify: "url" | null,
  appleMusic: "url" | null,
  deezer: "url" | null,
  audiomack: "url" | null,
}
```
- Populate at admin upload/entry time, or backfill via Genius/Musixmatch metadata + manual entry for gaps.
- Modal only shows platforms with a non-null link — no dead buttons.

### 4.4 UX shape (brand-consistent)
- Triggered on tap of play for any Tier 3 song.
- Dark sheet/modal per brand system (Section 6, MARGO_BRAND.md) — `--surface` background, gold CTA styling, Lora type.
- Each platform row: logo + platform name + arrow icon (SVG, never Unicode per Section 14 Rule 1).
- Optional: remember last-chosen platform per user (localStorage) to skip the modal next time, with a small "always ask" toggle — reduces friction for repeat listeners without losing the discovery moment for new ones.

---

## 5. Recommended Build Order

| Phase | Work | Depends on |
|-------|------|-----------|
| 1 | DMCA agent registration + copyright policy + ToS warranty language | Lawyer review |
| 2 | Streaming-links modal for Tier 3 songs (no new licensing needed) | Nothing — can ship now |
| 3 | Musixmatch free-tier prototype vs Genius (identification quality test) | Nothing — can start now |
| 4 | Audio fingerprinting integration on artist upload flow | Phase 1 legal foundation in place |
| 5 | Artist sign-up/verification flow (see auth plan, separate doc) | Phase 1 + 4 |
| 6 | Musixmatch commercial tier negotiation | Real usage numbers from Phase 2–5 |

---

## 6. Open Questions to Resolve

- Which fingerprinting vendor (Audible Magic vs ACRCloud) fits budget/API needs best — needs a direct comparison pass.
- Should the "where to listen" modal apply to Tier 1/2 songs too as a secondary option below the native player, or stay Tier-3-only?
- Repeat-infringer threshold for artist accounts — how many valid takedowns before suspension?
- Whether Audiomack's own upload/licensing API could eventually double as a secondary distribution channel for Margo-original songs, not just a listen-destination link.

---

*Next document: Auth & Identity Plan (anonymous listener upgrade path + artist verification flow) — to be drafted once useUsername.ts / usePost.ts / usePosts.ts review is complete.*