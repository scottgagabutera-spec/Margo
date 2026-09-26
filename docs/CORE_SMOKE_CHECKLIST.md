# Core smoke checklist (pre-merge / release)

Manual pass on **mobile (≤639px) and desktop (≥640px)** while signed in. Takes ~10 minutes; catches “feature vanished” regressions.

| # | Area | Pass criteria |
|---|------|----------------|
| 1 | **Stories** | Mobile: floating Stories control above tab bar opens list/viewer. Desktop: horizontal story tray under nav on Feed with **Add** chip. |
| 2 | **Feed** | Posts load; pull-to-refresh works; **New moments** pill is centered, no count; feed does not jump when new posts arrive until pill tap. |
| 3 | **Discover** | Catalog / moments load; tab switch from Feed is responsive. |
| 4 | **Compose** | Can open compose tab; song search responds. |
| 5 | **You / Profile** | Profile loads; signature hold on card; cover/avatar sheet on Edit Profile and You cover. |
| 6 | **Auto-Promote** | Settings shows YouTube/TikTok connections (artist account). |
| 7 | **Hub** | Hub overlay opens from tab bar. |

## Stories regression (2026-09)

**Cause:** Mobile/desktop detection started as `null`, so **both** UIs hid until hydration; desktop also required `isMobileViewport === false`, which failed during `null`.

**Fix:** Sync initial viewport from `matchMedia`; desktop tray uses `!== true`; mobile dock uses `!== false`.

## Automation (follow-up)

- CI: `npx tsc --noEmit` (required today).
- Optional: Playwright script hitting `/feed` signed-in fixture asserting `[data-margo-primary-tab=feed]` + `.margo-stories-dock` or `.margo-story-ring-tray` visible.
- Preview deploydiv comment bot with this checklist link.
