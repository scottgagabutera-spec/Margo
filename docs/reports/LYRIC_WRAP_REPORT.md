# Lyric wrap audit (Part B — report only)

Branch: `cursor/hub-nav-logic-bccc` · PR #322 · No lyric/CSS changes in this part.

Preview used for DOM probes: `https://margo-git-cursor-hub-nav-logic-bccc-bgss-projects-0f517fe3.vercel.app/feed` (signed-out, Oct 2026).

---

## 1. Components that render lyric text

| Surface | File | Shared feed lyric stack? |
|--------|------|-------------------------|
| **Feed post card** (default) | `components/post-card.tsx` → `PostCardLyricSection` in `components/post-card-feed-layout.tsx` (L201–278) | **Yes** — `FEED_CARD_LYRIC_*` + `.margo-feed-lyric` |
| **Feed post row** (collapsed) | `components/post-card.tsx` L741–743 | **Yes** — `FEED_CARD_LYRIC_ROW_CLASS` (+ `--row` clamp) |
| **Post detail** | `app/post/[id]/page.tsx` L302+ `PostCard` | **Yes** (same `PostCardLyricSection`) |
| **Profile / search reposts** | `app/profile/[username]/page.tsx` `PostCard` | **Yes** |
| **Notifications desktop pane** | `components/notification-post-pane.tsx` `PostCard` | **Yes** |
| **Lyric Back thread row** | `components/lyric-back-thread-row.tsx` L429–432 | **No** — `.margo-lb-thread-row__lyric` (`app/globals.css` L4908–4923) |
| **Post thread ancestors / root compact** | `app/post/[id]/page.tsx` + CSS `.margo-post-thread-root-compact__lyric` (L4700–4707), `.margo-post-thread-ancestor-lyric` (L5094–5103) | **No** — smaller Lora, nowrap ellipsis on ancestors |
| **Feed Shorts / Stage moment card** | `components/stage/stage-moment-card.tsx` L325–347 | **Partial** — `.margo-feed-lyric` when `feedShortsFixedLyric`; else inline `lyricStyle` + absolute width from layout |
| **Discover resonance card** | `components/resonance-card.tsx` L47–50, L113–118 | **No** — inline Lora 0.88rem, 4-line `-webkit-line-clamp`, lines joined with `  /  ` |
| **Discover lyric moment card** | `components/lyric-moment-card.tsx` L75–80 | **No** — same pattern as resonance (0.88rem, clamp 4, `pre-line`) |
| **DM lyric moment** | `components/moment-message-card.tsx` L51–61 | **No** — inline Lora 0.82–0.9rem |
| **Share / export** | `components/card-export-modal.tsx` → `components/moment-share-studio.tsx` + canvas in `lib/moment-export/` | **No** — canvas layout / wrap in `render-moment.ts`, not feed CSS |
| **Playlist lyric row** | `components/playlist-lyric-row.tsx` L33–35 | **No** — `LYRIC_FONT` inline on title/line text |
| **Suggested Lyric Back panel** | `components/lyric-back-focus-panel.tsx` (rows use `LyricBackThreadRow`) | **No** (LB row class) |
| **Skeleton** | `components/margo-skeletons.tsx` L58 | Zone only (no real text) |

**Shared canonical feed lyric:** `lib/post-card-lyric-class.ts` → `.margo-feed-lyric` rules in `app/globals.css` L380–391, L450–454, L403–407 (modifiers), zone rules L1992–2008.

---

## 2. Main feed card — exact lyric styles

**Component:** `PostCardLyricSection` (`components/post-card-feed-layout.tsx` L201–278) renders `<p className={FEED_CARD_LYRIC_CLASS | FEED_CARD_LYRIC_CLAMP_CLASS}>`.

**CSS tokens** (`app/globals.css` L67–68, L379–391):

| Property | Value |
|----------|--------|
| font-family | `var(--font-lora), serif` |
| font-size | `var(--feed-type-lyric)` → **1.0625rem (17px** at 16px root) |
| font-weight | 400 |
| font-style | italic |
| line-height | `var(--feed-type-lyric-lh)` → **1.55** |
| letter-spacing | normal |
| color | `var(--text)` |
| margin (on `.margo-feed-lyric`) | 0 |
| padding (lyric `<p>`) | none |
| **Zone** `.margo-post-card__lyric-zone` (L1992–2003) | margin `var(--margo-post-card-lyric-margin)` (24px) vertical; padding 0; **max-width: 36ch** (phone); **@media (min-width: 640px): width 100%; max-width 100%** |
| white-space | **pre-line** (`.margo-feed-lyric` L390) |
| overflow-wrap | not set on `.margo-feed-lyric`; **inherited from `.margo-post-card` → `anywhere`** (L615–616) |
| word-break | **inherited `break-word`** from `.margo-post-card` (L616) |
| hyphens | not set (computed **manual**) |
| text-wrap | **pretty** only under `@supports` for `.margo-post-card__lyric-zone .margo-feed-lyric` (L2005–2008); zone itself often computes `wrap` |
| text-overflow | none on lyric (clamp uses line-box ellipsis) |
| line-clamp | **`.margo-feed-lyric--clamp-4`**: `-webkit-line-clamp: 4`, `overflow: hidden`, `-webkit-box` (L450–454) |
| overflow | hidden when clamped; visible otherwise |

**Stage inner padding** around lyric: `.margo-post-card__moment-stage-inner` L1972 — `padding: 12px 4px 16px` (narrows lyric box vs card body).

**JS truncation / expand** (`lib/post-card-lyric-layout.ts` L1–7, `post-card-feed-layout.tsx` L213, L255–275):

- `feedLyricNeedsExpand`: true if **>4 newline-separated segments** OR **length > 180** → toggles clamp class + “more/less”.
- No `.slice()` on lyric body; clamp is **CSS line-clamp**, not string ellipsis.
- Multi-line **collapsed** mode (L217–225): all lines in **one** `<p className={CLAMP}>`, stitches as inline `<span>` — **no `\n` between line texts**.

**Row variant** (`post-card.tsx` L741): `FEED_CARD_LYRIC_ROW_CLASS` → `.margo-feed-lyric--row` — **1-line** `-webkit-line-clamp: 1` (L403–407).

---

## 3. Storage vs rendering (line breaks)

- **DB:** `posts.text` and/or `post_lines[].text` per line (`lib/post-lines.ts` L58–71 `resolveMomentLines`).
- **Feed single-line moment:** one string in `<p>` with `white-space: pre-line` → **`\n` in `posts.text` are preserved**.
- **Feed multi-line moment (expanded):** one `<p>` per line (L228–234) → **breaks between lines preserved**; stitches are separate blocks.
- **Feed multi-line moment (collapsed + clamp):** one `<p>`, lines concatenated as inline spans with “stitch” labels (L217–225) → **author line breaks between `post_lines` are not `\n`; text flows as one paragraph** until clamp cuts it.
- **Discover / lyric moment cards:** `momentLines.map(...).join('  /  ')` (`resonance-card.tsx` L47–49) → **original line breaks replaced by ` / `**, one clamped block.
- **Dribble-style post on one visual line:** if the DB stores three physical lines as **three `post_lines`** but UI is **collapsed multi** or Discover join, user sees one run-on line; if stored as **one `posts.text` with spaces only**, `pre-line` will **not** restore breaks — **breaks are lost at content or join time**, not by CSS alone.

---

## 4. Widths and fit (code + one Playwright probe on preview)

**Layout math**

- Feed column: `app/feed/page.tsx` L537–538 padding **16px** horizontal; `.margo-feed-column` `max-width: min(100%, var(--margo-feed-max-width))` (`globals.css` L3424–3428).
- `--margo-feed-max-width`: **720px** default, **680px** at `min-width: 640px` (L65, L89–91).
- Card width ≈ **column inner − 0** = viewport − 32px on phone; **680 − 32 = 648px** on desktop column.
- Card padding **16px** each side → body inner ≈ **card − 32px**.
- Lyric zone phone cap: **min(body, 36ch)**; **36ch ≈ 396px** on preview (Lora probe).

**Measured on preview** (first card when present; simulated box uses same zone width when lyric node missing):

| Viewport | Column (px) | Card (px) | Lyric zone (px) | 36ch cap (px) | ~Chars/line (simulated)* |
|---------|---------------|-----------|-----------------|---------------|-------------------------|
| 360 | 360 | 328 | 294 | 396 | 28–34 |
| 390 | 390 | 358 | 316–324 | 396 | 32–38 |
| 430 | 430 | 398 | 364 | 396 | 38–43 |
| 834 | 834 | 648 | 614 | (100% width) | 68–76 |
| 1280 | 1280 | 648 | 614 | — | 68–76 |
| 1440 | 1440 | 648 | 606–614 | — | 68–76 |
| 1920 | 1920 | 648 | 614 | — | 68–76 |

\*Simulated with `.margo-feed-lyric` at measured zone width, `pre-line`, off-card probe (`scripts/lyric-wrap-simulate.spec.mjs`); inherits **`overflow-wrap: anywhere` / `word-break: break-word`** when attached inside `.margo-post-card` (DOM probe L615–616).

**Widest unbroken line before wrap (simulation):** phone ~**40–43** Latin chars at 430px; desktop ~**72–78** chars at 614px zone (full clause fits one row).

---

## 5. Three lyrics — line breaks by width (simulation)

Legend: **early** = break before natural phrase end; **orphan** = short leftover word/fragment alone on a line.

### (a) Three-line Dribble lyric (`\n` between logical lines)

| Width | Rendered lines | Issues |
|-------|----------------|--------|
| 360 | 6 | **Early** splits inside repeated phrase; **orphan** `"yeah"` (×2); **early** `"you caught my eye"` → `"you"` / `"caught my eye"` |
| 390 | 6 | Same pattern; slightly longer first row |
| 430 | 4 | Closer to 3 intent; **early** last line: `"caught"` / `"my eye"` |
| 834+ | 3 | Matches 3 source `\n` lines; no orphans |

### (b) `Keep bleeding`

| Width | Lines | Issues |
|-------|-------|--------|
| All | 1 | None |

### (c) Two-line pocket lyric

| Width | Lines | Issues |
|-------|-------|--------|
| 360 | 3 | **Early**: `"questions"` **orphan** on its own line |
| 390 | 2 | Clean (matches 2 source lines) |
| 430+ | 2 | Clean |

---

## 6. Root cause (inconsistency)

1. **Two width regimes:** phone **36ch (~294–364px)** lyric zone vs desktop **~614px** full body (`globals.css` L1996–2003) → same text wraps at **different characters per line** (table §4).
2. **Aggressive breaking on the card:** `.margo-post-card { overflow-wrap: anywhere; word-break: break-word; }` (L615–616) applies to lyric children → browser may break **inside words** when lines are tight; worse on **narrow** zones.
3. **Different wrap engines by breakpoint:** `text-wrap: pretty` on lyric inside zone (L2005–2008) vs plain `wrap` on zone; plus Shorts-only `overflow-wrap: break-word` on `.margo-feed-lyric` (L401) — **feed card lyric does not set wrap-word on itself**, only inherits card `anywhere`.
4. **Content shape differs by post type:** multi-line **collapsed** feed merges lines without `\n` (L217–225); Discover **joins with ` / `** (L47–49); single-line **pre-line** keeps `\n` — same song can **look** like one run-on line (Dribble) or wrap differently.
5. **Clamp / row variants:** `--clamp-4` and `--row` (1 line) add **ellipsis truncation** unrelated to natural wrap (`globals.css` L403–407, L450–454; `feedLyricNeedsExpand` L1–7).

**Rule that most explains “some early, some not”:** **zone width (36ch vs 100%) + `overflow-wrap: anywhere` on the card** — narrow cards force more breaks and allow breaks at arbitrary points; wide desktop lines fit whole phrases.

---

## 7. Recommendation (alignment only — no font change)

1. **Single lyric measure everywhere on feed cards:** use one **max-width** for `.margo-post-card__lyric-zone` on phone and desktop — e.g. keep **36ch on phone** but also cap desktop at **36ch–42ch** *or* expand phone to match **~42ch** so phone/laptop share the same **~38–42 character** wrap column (visual consistency over full-bleed desktop).
2. **Wrap policy:** on lyric nodes only, set **`overflow-wrap: break-word`** (or `normal`) and **`word-break: normal`**; **remove inheritance of `anywhere`** from the card for the lyric subtree (override on `.margo-post-card__lyric-zone .margo-feed-lyric`).
3. **Preserve logical lines:** for multi-line moments, always render **separate `<p>` per `post_lines` entry** (or insert `\n` between stitches) even in collapsed/clamped state so Dribble-style lines do not merge; avoid Discover-style `join(' / ')` if parity with feed is required (Discover is separate surface).
4. **Target line length:** design for **~32–40 characters per line** at 17px Lora (matches ~294–364px box); desktop should use the **same ch cap**, not 614px full card width.
5. **Optional:** `text-wrap: balance` or `pretty` **consistently** on all breakpoints once width is unified.

---

*End of report. No lyric presentation code was changed in Part B.*
