# Margo design rules

Reference for product, design, and engineering prompts. Follow these on every surface.

## Ten standards

Giants way · Modern · Premium · Unique for Margo · Long term · User experience · Consistency · Very logical · Mobile first · App ready.

## Avatars (people)

- **Shape:** Portrait rounded rectangle ~4:5 with thin gold border (`MargoAvatar` / `MargoPortraitAvatar`). **No circles for people.**
- **Sizes:** `xs` (nav), `sm` (tab), `md` (lists), `lg` (feed header). Use `components/margo-avatar.tsx`.
- **Artists on Favorite artists** may stay round (artwork, not user photos).

## Memory titles

- Show the **memory title** everywhere (tiles, grid, feed cards, detail). Full text — no ellipsis; tiles grow in height.
- **Fallback:** full story, then song title only if neither exists.
- **Style:** Gold (`var(--gold)`), medium weight, Geist Sans, sentence case. Dark gradient behind text on cover art.

## Labels and typography

- Section labels: small gold, sentence case, medium weight — not wide-track all caps.
- UI copy: Geist Sans, sentence case.
- On memory surfaces use **@username**, not display name.

## Navigation chrome

- **One back** per screen (shell nav — no duplicate circle back).
- **One logo** and **one search** per screen where search applies.
- Persistent shell with skeletons; avoid black loading frames.

## Controls

- Primary icon / chip buttons ~**32px** where possible.
- Profile **⋯** menu: plain icon, no box; popover anchored under the icon, right-aligned, never over the portrait.

## Adaptive text

- Use `lib/ui/adaptive-text-color.ts` for text on flat fills and memory tile titles (WCAG ≥ 4.5:1). On photos use a dark scrim and cream/white — never gold on gold.

## Media and egress

- User media in R2 under `users/{userId}/…` (memories, avatars). No internal storage terms in UI.
- Run `scripts/egress_guard.py` on every PR; fix new violations before merge.

## Memories UX

- Detail hero: compact cover (~120px beside title) so title, @username, and story fit above the fold on small phones.
- Create/edit previews must match real tiles and detail layout.

## Artist / label profiles

- Listen & follow: one row of small icons (~28–32px). Role tags: small gold sentence case (e.g. “Music label”).

## Docs

When adding patterns, update this file and keep the link in the root [README](../README.md).
