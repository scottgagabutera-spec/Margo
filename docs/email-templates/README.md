# Supabase auth email templates (manual paste)

**Warning:** Pasting into the Supabase dashboard updates **production** emails immediately for this project.

## Subjects

| Template | Subject |
| --- | --- |
| Reset password | Reset your Margo password |
| Confirm signup | Confirm your Margo account |

## Where to paste

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. **Confirm signup** → paste `confirm-signup.html` (HTML mode if offered).
3. **Reset password** → paste `reset-password.html`.

Do not change **Site URL** or **Redirect URLs** here — Scott configures those separately.

## Header logo PNG

There is **no** dedicated transparent gold lockup PNG in the repo (only `og-image.png`, which is a social share card — do not use in email). Templates use a **text “MARGO”** band on `#0c0c0e` until a proper `public/` asset is added and deployed to production.

## Reset password — variables

| Variable | Use |
| --- | --- |
| `{{ .RedirectTo }}` | Opens `/reset-password` on the host that requested the reset. Button **Enter code** — no token in the URL. |
| `{{ .Token }}` | 8-digit code for in-app entry. |

## Confirm signup — variables

| Variable | Use |
| --- | --- |
| `{{ .ConfirmationURL }}` | Supabase verify link for **Confirm account**. |

## Sender (separate)

Use **Authentication → SMTP** with a verified domain (e.g. Resend) so the From name shows **Margo**.
