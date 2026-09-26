# Feed “ocean” — design + product logic

**Goal:** No psychological “Chapter 1” at the top or “The End” at the bottom. Users stay **in the loop**; new stuff is **signal**, not a start line.

## What feels like a beginning today (and what we change)

| Signal | Role | Direction |
|--------|------|-----------|
| Story ring tray (desktop) | Social “front page” | Keep as utility; no title copy. Optional: inline between cards later. |
| Sort / vibe filters | Control | Only when active — already minimal. |
| “Be the first” empty state | **Strong start metaphor** | Replaced with neutral empty + Compose link. |
| Hard stop after last card | **End metaphor** | `FeedOceanFooter` — gradient fade, optional “Earlier moments”. |
| **New Moments pill** (floating) | **Not** the start — treat as **notification** | Unchanged: tap merges new posts and scrolls to newest. Does not redefine “where feed begins”. |

## Chronology (technical truth)

- Feed stays **newest-first** in the DOM (standard, logical, matches pill + pull-to-refresh).
- **Scrolling down** = deeper into time (older). We do **not** invert scroll direction (that breaks pull-to-refresh and accessibility).
- “Lost in the ocean” = **no labeled start/end**, continuous load, soft edges — not reading upside-down.

## How new posts appear

1. **While on Feed:** Realtime / buffer → **“N new Moments” pill** → tap to reveal at top (user chooses when to “surface” — not auto-jump unless they tap).
2. **Pull down:** Refresh + merge (existing).
3. **Return visit:** Cached pane paints instantly; stale data soft-refreshes in background.

## Scroll-up / scroll-down (user question)

- **Scroll down** → older posts (`Earlier moments` button / infinite page when enabled).
- **Scroll up** → toward newest; pill appears when something arrived above the viewport.
- Starting mid-stream (Twitter-style random depth) needs **cursor pagination + session anchor** — phase 2; not required for ocean *feel* if edges are soft and load is continuous.

## Implementation phases

| Phase | Status |
|-------|--------|
| A — Soft empty + ocean footer + copy | In repo |
| B — Paginate `fetchFeedPosts` with `created_at` cursor + intersection observer | Partial hook in prefetch |
| C — Ambient motion / parallax | Design spike |
