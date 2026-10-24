# Layout and navigation notes (docs only)

**Status:** Observation and proposed follow-up only. No product behavior is changed by this file. **Do not implement until Scott approves.**

---

## (a) What navigation shows today

### Phone (typical primary-tab widths, ~360–430px)

- **`/` (home):** Stage landing (`StageLandingPage`) with a minimal top bar: Margo logo, Sign in or profile avatar. **No** Feed / Discover in the header. Footer links include Feed, Discover, About, Privacy. The global **`MobileTabBar`** (Feed · Discover · Compose · Hub · You) is **hidden on `/`** via stage chrome rules, so the landing experience is full-screen Stage content without bottom tabs.
- **`/feed`:** Fixed **`MargoNav`** top bar (logo, Library, Hub when signed in; desktop text links are CSS-hidden on narrow viewports). **`MobileTabBar`** at the bottom for primary tabs. Feed content sits between `--nav-height` and `--margo-tabbar-h`.

### Tablet (~768px)

- Same structural split as phone for **`/`**: landing header without Feed/Discover; footer links remain the main in-page path to Feed/Discover.
- **`/feed`:** Still uses **`MobileTabBar`** at the bottom (primary-tab shell is mobile-first). **`MargoNav`** shows logo + Hub/Library; Feed/Discover/Share a Lyric text links appear only at desktop breakpoints defined in nav CSS, not necessarily mirrored on tablet yet.

### Laptop / desktop (~1024px+)

- **`/`:** Still the Stage landing page. Header is logo + account only — **not** the same link row as in-app **`MargoNav`** (no Feed, Discover, or Send a line in the landing header when signed in).
- **`/feed`:** **`MargoNav`** with Feed, Discover, Share a Lyric (compose), avatar menu. No bottom tab bar (hidden at desktop). This is the “full” app chrome Scott expects inside the app, but it does not extend to `/`.

---

## (b) Laptop home vs app chrome

On a laptop, **`/` is the Stage landing**, not the lyric feed. Feed and Discover are **not** in the landing header; signed-in users who land on `/` must use the **footer** (Feed / Discover links), deep links, bookmarks, or marketing CTAs that point to `/feed` — not a persistent top nav matching **`MargoNav`**.

---

## (c) Proposed design by breakpoint (approval required)

| Breakpoint | Proposal |
|------------|----------|
| **Phone** | Keep bottom **`MobileTabBar`**. Primary landing CTA / “enter app” should go to **`/feed`** (not trap users on Stage without tabs). |
| **Tablet (signed in)** | Slim **top tabs** for Feed · Discover · Compose (or equivalent), reducing reliance on footer-only discovery. |
| **Laptop (signed in)** | Landing header shows **Feed, Discover, Send a line** (compose), mirroring **`MargoNav`** link set so `/` and `/feed` feel like one product. |

Unsigned visitors can keep marketing-minimal chrome on `/`.

---

## (d) Likely implementation files

- `components/stage/stage-landing-page.tsx` — landing header and footer; signed-in link row.
- `components/margo-nav.tsx` — shared labels, routes, and active states to reuse on landing.
- `app/layout.tsx` — where global chrome is mounted; avoid double nav.
- `app/globals.css` — breakpoint rules for landing vs app nav, tab bar visibility, safe areas.

---

## (e) Phone-first surfaces that may look wrong on larger screens

| Area | File(s) | Issue | Fix idea |
|------|---------|-------|----------|
| Inline delete confirm | `post-inline-focused-delete.tsx`, `globals.css` (`.margo-inline-delete-*`) | Panel anchored to card; wide viewports may leave awkward scrim width | Max-width confirm column; center scrim on desktop |
| Popup delete (flag) | `delete-moment-dialog.tsx`, `margo-delete-ui-mode.ts` | Centered modal tuned for phone | Keep flag path; optional desktop max-width |
| Moment inline edit | `post-moment-inline-edit.tsx`, `moment-compose-vibe-picker.tsx` | Inline expansion on card | Tablet/desktop: cap width or sheet at `md` |
| Thread edit (resonance) | `resonance-card.tsx` + `edit-moment-modal.tsx` | **Modal/sheet** on post thread vs **inline edit on feed** | Unify edit UX per breakpoint or always inline |
| Report menu | `post-report-menu.tsx` | Bottom-anchored sheet | Desktop: anchored popover or centered dialog |
| Lyric Back panel | `lyric-back-panel-compose.tsx`, `lyric-back-focus-panel.tsx` | Full-viewport panel, keyboard metrics phone-tuned | Wider min-height / two-column preview on desktop |
| Post thread | `app/post/[id]/page.tsx`, `post-card.tsx` | Touch targets and indent tuned for phone | Review `--post-thread-*` spacing at 1024+ |
| New moments pill | `feed-new-moments-pill.tsx` | Below Shorts/Lyrics tabs, mobile z-index | Ensure pill doesn’t collide with desktop nav only layout |
| Stage moment card | `stage/stage-moment-card.tsx` | Shorts/Stage layout | Already separate from feed card; verify tablet Stage |

---

## (f) Follow-up list for a future PR (after Scott approval)

1. **Press feedback** on every tappable control (consistent `:active` / scale, no dead zones).
2. **Loading shells** for profile and search routes (avoid blank first paint).
3. **Measured tap-to-content** times on Feed → thread navigation (3G / Slow 4G profiles).
4. **Profile delete lists** and **report modal path** — still partial vs feed/thread parity.
5. **“Keep bleeding”** repeat navigation check on a **real phone** (home → feed → thread → back loop).
6. **Resonate notification parity** with other engagement types.
7. **View/play inflation** audit (client vs server counts).
8. **Thread count** for nested Lyric Backs (display vs `echo_count` semantics).

---

*Captured during PR #282 pre-merge scan. Implementation blocked until Scott approves section (c).*
