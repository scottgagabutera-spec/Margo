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

- **File:** `public/margo-email-logo.png` (192×192, transparent; rendered from `components/MargoLogo.tsx` symbol geometry).
- **Production URL:** `https://trymargo.com/margo-email-logo.png` (live after deploy).
- Templates show the PNG at 40×40 in the `#0c0c0e` band plus gold **MARGO** text (fallback when images are blocked; `alt="Margo"` on the img).

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
