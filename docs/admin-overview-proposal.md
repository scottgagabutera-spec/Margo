# Admin overview (report only)

## Current navigation

`/admin` is a long single page with sections (applications, moderation, songs, uploads, etc.). Filters are horizontal text tabs inside each section. On a phone you scroll a lot; primary actions sit inside expandable cards.

## What you use most

1. Pending artist applications (approve/reject)
2. Moderation (warn/freeze/remove)
3. New catalog songs / upload oversight

## Pain on phone

- Confirm actions were easy to miss inside cards (addressed in next PR modal).
- No at-a-glance counts on entry.
- Section switching requires scroll and memory, not muscle memory.

## Proposed simpler layout (not built)

**Home hub** with three count cards: Pending applications, Open reports, New songs (24h). Each card is one tap to the list.

**Bottom nav (4 items):** Home, Applications, Moderation, Catalog. Sticky on phone; sidebar on tablet/desktop.

**List screens:** Full-width rows, swipe or buttons for primary action, detail sheet from bottom.

## Risks

- Moving routes breaks admin bookmarks and muscle memory.
- Count queries need indexed, cheap aggregates.
- Role gating must stay server enforced on every API.

## Small PR plan

1. PR A: Admin home counts + bottom nav shell (no feature removal).
2. PR B: Applications list uses new modal (this PR).
3. PR C: Moderation + catalog list polish and shared row component.
