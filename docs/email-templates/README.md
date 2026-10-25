# Supabase auth email templates (manual paste)

**Warning:** Pasting into the Supabase dashboard updates **production** emails immediately for this project.

## Where to paste

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. **Confirm signup** → paste `confirm-signup.html` into the message body (HTML mode if offered).
3. **Reset password** → paste `reset-password.html`.

Do not change **Site URL** or **Redirect URLs** here — Scott configures those separately.

## Reset password — variables used

| Variable | Role |
| --- | --- |
| `{{ .RedirectTo }}` | Exact redirect URL from `resetPasswordForEmail` (preview host on preview, `https://trymargo.com/reset-password` in prod). **Use this as the link base**, not `SiteURL`, so preview resets stay on preview. |
| `{{ .TokenHash }}` | Hashed OTP for `verifyOtp({ token_hash, type: 'recovery' })` after the user taps **Continue** on `/reset-password`. |
| `{{ .Token }}` | Plain 8-digit code for **Enter code instead** on the same page. |

Button href in the template:

`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`

Supabase terminology: [Email templates — `RedirectTo` vs `SiteURL`](https://supabase.com/docs/guides/auth/auth-email-templates).

## Sender (separate)

Use **Authentication → SMTP** with a verified domain (e.g. Resend) so the From name shows **Margo**.
