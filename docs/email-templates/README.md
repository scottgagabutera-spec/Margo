# Supabase auth email templates (manual paste)

**Warning:** Pasting into the Supabase dashboard updates **production** emails immediately for this project.

## Subjects (paste in Supabase template subject fields)

| Template | Subject |
| --- | --- |
| Reset password | Reset your Margo password |
| Confirm signup | Confirm your Margo account |

## Where to paste body HTML

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. **Confirm signup** → paste `confirm-signup.html` (HTML mode if offered).
3. **Reset password** → paste `reset-password.html`.

Do not change **Site URL** or **Redirect URLs** here — Scott configures those separately.

## Header image (production)

- File in repo: `public/margo-email-lockup.png` (copy of official `public/og-image.png` lockup art).
- URL in templates: `https://trymargo.com/margo-email-lockup.png`
- **Live only after** that file is deployed to production on trymargo.com.

## Reset password — variables

| Variable | Use |
| --- | --- |
| `{{ .RedirectTo }}` | Opens `/reset-password` on the same host that requested the reset (preview or prod). Button **Enter code** — no token in URL. |
| `{{ .Token }}` | 8-digit code shown large for in-app entry. |

## Confirm signup — variables

| Variable | Use |
| --- | --- |
| `{{ .ConfirmationURL }}` | Supabase verify link; redirects to your configured confirm URL after tap. |

## Sender (separate)

Use **Authentication → SMTP** with a verified domain (e.g. Resend) so the From name shows **Margo**.
