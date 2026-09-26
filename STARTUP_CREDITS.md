# Startup credits & removable integrations

Living registry of third-party tools Margo adopts through **Intercom Fin Startup Pack**, direct vendor startup programs, or similar **time-limited credits**. Update this file whenever one of these integrations is **added, changed, or removed**.

**Agent rule:** Any PR that touches a listed integration must update the relevant section here in the same PR.

---

## PostHog

| Field | Detail |
| --- | --- |
| **What / why** | Product analytics (events, optional flags later). Fin Startup Pack / PostHog for Startups — **$50,000 credits**, 12 months. Chosen for removable client SDK + usage while credits last. |
| **Activated** | **2026-09-26** (startup application approved; confirm start date in PostHog → Billing) |
| **Credit duration** | **12 months** from activation; billing limit set to **$0** on account (no auto-charge after credits) |
| **Env vars (Vercel)** | `NEXT_PUBLIC_POSTHOG_KEY` — project API key (public, browser). Optional: `NEXT_PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`), `NEXT_PUBLIC_POSTHOG_UI_HOST` (default `https://us.posthog.com`). Use EU hosts if the project is on EU Cloud. |
| **Code touchpoints** | `lib/analytics/posthog-browser.ts` (init + capture), `components/analytics/posthog-provider.tsx` (pageviews), `lib/analytics/track.ts` (forwards all `trackEvent` calls), `app/layout.tsx` (`PostHogProvider`), `lib/audio-engine/engine.ts` (`song_played`), `components/moment-share-studio.tsx` (export/share). Existing callers of `trackEvent()` elsewhere unchanged. |
| **Not enabled** | Session replay, autocapture, PostHog AI tools (by config). |
| **Limitations** | Browser-only; no server-side capture yet. Vercel Analytics still runs in production separately. Without env key, PostHog is a no-op. |

### How to remove PostHog

1. Remove env vars from Vercel (`NEXT_PUBLIC_POSTHOG_*`).
2. Delete `lib/analytics/posthog-browser.ts` and `components/analytics/posthog-provider.tsx`.
3. In `lib/analytics/track.ts`, remove the `capturePostHogEvent` import and call.
4. In `app/layout.tsx`, remove `PostHogProvider` wrapper and import.
5. Run `npm uninstall posthog-js`.
6. Update this file (remove or mark PostHog section archived).

No other files require PostHog imports for removal.

---

## Sentry

| Field | Detail |
| --- | --- |
| **What / why** | Error and performance monitoring. Fin Startup Pack — **~$5,000 credits**, 12 months (apply at [sentry.io/for/startups](https://sentry.io/for/startups)). |
| **Activated** | _Not integrated in repo yet — fill when SDK is added._ |
| **Credit duration** | **12 months** from program approval (per Sentry startup terms) |
| **Env vars (planned)** | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (CI/releases), `NEXT_PUBLIC_SENTRY_DSN` if client errors needed — exact set when integrated. |
| **Code touchpoints (planned)** | Typically `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`, `next.config` wrapper — **none present today**. |

### How to remove Sentry (when integrated)

1. Remove Sentry env vars from Vercel.
2. Remove `@sentry/nextjs` and Sentry config files listed above.
3. Revert any `next.config` Sentry wrapper.
4. `npm uninstall @sentry/nextjs`.
5. Update this section.

---

## ElevenLabs

| Field | Detail |
| --- | --- |
| **What / why** | Voice TTS / dubbing (future). Startup Grants — **33M credits / 12 months** (direct ElevenLabs program; may differ from Fin pack redemption). |
| **Activated** | _Not integrated in repo yet._ |
| **Credit duration** | **12 months** from grant award (ElevenLabs Startup Grants) |
| **Env vars (planned)** | `ELEVENLABS_API_KEY` (server-only, Vercel) |
| **Code touchpoints (planned)** | Future `lib/voice/` adapter only — **no production usage today**. Grant may require “ElevenLabs Grants” footer link on site for 12 months. |

### How to remove ElevenLabs (when integrated)

1. Remove `ELEVENLABS_API_KEY` and feature flags.
2. Delete voice adapter module and API routes; gate UI off env.
3. Update this section.

---

## Stripe

| Field | Detail |
| --- | --- |
| **What / why** | Payments / revenue share (future). Fin pack — **$500 fee credits** (offsets Stripe fees when processing starts). |
| **Activated** | _Account/credits only — no Margo payment flows in app._ |
| **Credit duration** | Per Stripe / pack redemption terms (fee credits expire per Stripe dashboard) |
| **Env vars (future)** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Code touchpoints** | **None** until revenue share ships. |

### How to remove Stripe (when integrated)

1. Remove Stripe routes/webhooks and env vars.
2. `npm uninstall stripe` (if added).
3. Update this section.

---

## Intercom + Fin (helpdesk)

| Field | Detail |
| --- | --- |
| **What / why** | Support / Fin AI agent — **not wired into Margo app code**; separate Intercom workspace. |
| **Activated** | Per Fin Startup Pack approval |
| **Credit duration** | ~**1 year** Fin + Intercom per pack terms |
| **Env vars** | None in Margo repo (Messenger snippet optional later) |
| **Code touchpoints** | None today |

### How to remove

Disable or uninstall Intercom widget if added later; no backend dependency expected.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-09-26 | PostHog integrated (events + pageviews). Registry created. |
