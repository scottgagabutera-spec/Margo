# Destructive / ambiguous tap audit (Margo)

Living list for rolling out `MargoActionSheet` (see `components/margo-action-sheet.tsx`).  
**Last updated:** 2026-09-26 — signature lyric wired; other rows are audit-only.

Legend: **High** = data loss, account, or irreversible without confirm. **Medium** = surprising state change. **Low** = reversible or already has a dialog.

---

## You / Profile (`/you`, `/profile/[username]`, `/profile/edit`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Signature lyric (own profile) | **Fixed:** action sheet (Edit / Replace / Remove / Cancel) | Was **High** if tap cleared | Remove persists immediately via `updateSignatureLyric` |
| Signature catalog line (edit) | **Fixed:** selected line → sheet; play is separate control | Was **High** if tap toggled off | Unselected line still picks lyric |
| Clear song (×) on signature picker | Clears song/artist/catalog only | Medium | No sheet yet |
| Sign Out (account menu) | Immediate sign-out | Medium | Expected; could add confirm |
| Edit Profile / cover / avatar | Nav or picker — low risk | Low | |

---

## Feed (`/feed`, `PostCard`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Post ⋮ → Delete | Opens `DeleteMomentDialog` | Low | Has confirm step |
| Resonate toggle | Immediate toggle | Low | Reversible |
| Report (if exposed) | — | — | Verify menu |

---

## Discover (`/discover`, cards, moments)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Resonance / moment cards | Same patterns as feed where `PostCard` / `ResonanceCard` used | Varies | `ResonanceCard` has menu → Delete → dialog (**Low**) |
| Listen Later / queue actions | `song-card-actions`, preview sheet | Low–Medium | Remove from list is immediate |

---

## Compose (`/compose`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Change song with lyric entered | `window.confirm` | Medium | Has confirm; could migrate to action sheet |
| Clear / reset compose flow | Various setState clears | Medium | Audit per control in compose page |
| Post / Keep private | Intentional submit | Low | |

---

## Lyric Back (`/lyric-back`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Change song / clear lyric | Similar to compose | Medium | Grep `setLyric('')` paths |

---

## Hub / Messages / Notifications

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Hub menu items | Navigation | Low | |
| DM thread actions | — | — | Review delete message if present |

---

## Settings (`/settings`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Delete account | Username typing confirm + button | Low | Strong confirm |
| Auto-Promote disconnect | Immediate API disconnect | **High** | No sheet; TikTok copy mentions revoke |
| Notification toggles | Immediate save | Low | |
| Private account toggle (edit profile) | Immediate on Save only | Low | On edit page, not instant |

---

## Studio / Promote (`/studio`, `/studio/promote`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Queue card → Remove | `window.confirm` | Medium | Has confirm |
| Queue reject / dismiss | API call (some paths silent fail — known) | Medium | |
| Publish confirm | Inline confirm step on card | Low | |
| Generate promotion blocks | Queue add | Low | |

---

## Song / Karaoke (`/song/[id]`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Queue remove / skip | `removeQueueIndex` audio engine | Low | Playback only |

---

## Admin (`/admin`)

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Moderation / delete / reject actions | Various | **High** | Internal; separate bar |

---

## Export / Share sheets

| Target | Current behavior | Risk | Notes |
|--------|------------------|------|--------|
| Share / export | User-initiated | Low | |
| Promote republish | Confirm block in picker | Low | |

---

## Priority follow-up (recommended order)

1. **Promote disconnect** (Settings) — **High**, one tap kills OAuth session  
2. **Signature picker clear song (×)** — Medium  
3. **Compose change-song** — replace `window.confirm` with shared sheet  
4. **Promote queue remove** — replace `window.confirm` with shared sheet  
5. Post delete menus — already dialog-backed; optional sheet for consistency  
