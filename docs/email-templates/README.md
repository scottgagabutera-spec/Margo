# Supabase auth email templates (manual paste)

**Warning:** Pasting into the Supabase dashboard updates **production** emails immediately for this project.

## Where to paste

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. **Confirm signup** → paste `confirm-signup.html` into the message body (HTML mode if offered).
3. **Reset password** → paste `reset-password.html`.

Do not change **Site URL** or **Redirect URLs** here — Scott configures those separately.

## Sender (separate)

Use **Authentication → SMTP** with a verified domain (e.g. Resend) so the From name shows **Margo**.
