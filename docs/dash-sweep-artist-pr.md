# Dash sweep (artist live updates PR)

User-facing helper copy updated to avoid em dash, en dash, and hyphen used as sentence punctuation. User-typed data, code comments, and missing-data placeholders (e.g. admin date fallback) were left unchanged.

## `components/artist-application-form.tsx`

| Before | After |
|--------|--------|
| `Imported N links — review below.` | `Imported N links. Review below.` |
| `Couldn't confirm that yet — make sure the code is saved in your bio.` | `Couldn't confirm that yet. Make sure the code is saved in your bio.` |
| `Just your handle works — no need to paste the full link.` | `Just your handle works. No need to paste the full link.` |
| `I've added it — Verify Now` | `I've added it. Verify now` |
| `Found in your bio — keep it there until you submit.` | `Found in your bio. Keep it there until you submit.` (also removed leading checkmark glyph) |

## `components/studio/song-upload-form.tsx`

| Before | After |
|--------|--------|
| `Reading lyrics with Whisper AI — this can take a minute…` | `Reading lyrics with Whisper AI. This can take a minute…` |
| `Try again — the song is still here.` | `Try again. The song is still here.` |
| `@username is your unique handle — not the credit.` | `@username is your unique handle, not the credit.` |
| `How the room feels while this song plays — not the lyric vibe tag.` | `How the room feels while this song plays. Not the lyric vibe tag.` |
| Placeholder `Paste hook or chorus — helps Whisper…` | `Paste hook or chorus. Helps Whisper…` |
| `…no Whisper language code — Margo auto-detects…` | `…no Whisper language code. Margo auto-detects…` |

## `components/artist-applications-tab.tsx`

| Before | After |
|--------|--------|
| Tab intro: `on approval — this sets` | `on approval. This sets` |
| Moderation reason placeholder: `Explain why — this becomes` | `Explain why. This becomes` |

Not changed: admin metadata lines using ` · ` as separators, `Account created … —` missing-date placeholder, or moderation status glance ` — ${reason}` (separator between status and reason text).
