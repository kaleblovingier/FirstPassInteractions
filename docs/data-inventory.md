# FirstPass data inventory

Snapshot: 2026-10-19, from `origin/main` at de56833. Source of truth for `/privacy`, `/terms`, `/cookies` (copy in `src/lib/seo/legal.ts`). Not legal advice; recommend attorney review.

| # | What | Where in code | Why | Retention | Processor |
|---|------|---------------|-----|-----------|-----------|
| 1 | Desk state: drugs, host toggles, typed amounts, license key (`firstpass.desk.v7`) | `src/lib/drugs/store.ts:176,451,482` | Keep desk between visits | Until user clears site data | None (browser localStorage) |
| 2 | Lab answers, saved briefs, trays, watch pins, study marks, slash-key setting | `src/lib/drugs/lab.ts:27`, `saved-briefs.ts:8`, `tray-history.ts:7`, `watchlist.ts:10`, `study-marks.ts`, `src/components/desk/search.tsx:12` | Learner convenience | Until cleared | None (localStorage) |
| 3 | Operator-only: issued keys, pay note, pipeline, foundry PIN (sessionStorage) | `src/components/desk/foundry.tsx:51-53,73,125`, `src/lib/billing/hunts.ts:1068` | Operator workflow on operator's browser | Until cleared / tab close (PIN) | None; **contains buyer names/emails on operator's device** |
| 4 | Auth (Better Auth): `user`(name,email,image), `session`(token, ipAddress, userAgent), `account`(tokens, password hash), `verification` | `migrations/auth/0001_auth.sql:19-62`, `src/lib/auth/server.ts:149,211`, `src/lib/db.ts:19` | Sign-in (template) | Not active: `.grok/app-env.json` `VITE_AUTH_ENABLED=false`, `deploy.database=false` | Neon if `DATABASE_URL` set, else in-process PGlite |
| 5 | Auth cookies `__Host-grok-auth.session_token`, `__Host-grok_gate_session`; bearer in sessionStorage `grok-auth.bearer-token` | `src/lib/auth/server.ts:149`, `gate-session-marker.ts:11`, `gate-session.server.ts:71,157`, `client.ts:48,63` | Strictly necessary session (only if auth enabled) | Session | None |
| 6 | License key verification (HMAC-SHA256, `LICENSE_PEPPER`) | `src/lib/billing/license.server.ts:45-86`, `src/lib/billing/license.ts:12` | Check Founding key | Not stored server-side | None |
| 7 | Stripe checkout (switched off): buyer name, email; key written to Stripe metadata. Lost-key recovery checks only card purchases, and card checkout is switched off. If you paid by Venmo, Cash App or PayPal, email FirstPassInteractions@gmail.com to have your key resent. | `src/lib/billing/stripe.server.ts:89-113`, `src/routes/api/stripe.webhook.ts` | Sell + deliver Founding key | Per Stripe | Stripe |
| 8 | PayPal checkout (off unless configured) | `src/lib/billing/paypal.server.ts` | Payments | Per PayPal | PayPal |
| 9 | Manual Venmo/Cash App/PayPal: payer name/handle/amount parsed from payment emails | `src/lib/billing/collect.server.ts`, `payments.ts`, `foundry.tsx:183` | Operator issues key | In Gmail until deleted | Venmo/Block/PayPal, Google (Gmail) |
| 10 | Key email to buyer, BCC operator | `src/lib/billing/license-mail.server.ts:24,34` | Deliver key | Resend logs + Gmail | Resend, Google |
| 11 | Lost-key recovery checks only card purchases, and card checkout is switched off. If you paid by Venmo, Cash App or PayPal, email FirstPassInteractions@gmail.com to have your key resent. IP+email rate counters in memory. | `src/lib/billing/recover.server.ts:56`, `src/routes/api/license/recover.ts` | Re-send key; abuse limit | Counters until instance restart | Stripe, Resend |
| 12 | Program inquiry: name, work email, org, message → operator email (reply-to user); IP+email counters | `src/lib/billing/program-inquiry.server.ts:33-61,88-100` | Sales inquiries | Counters ≤24h in memory; email in inbox | Resend, Google |
| 13 | Live lookups: drug names/ids only | `src/lib/drugs/live.server.ts`, `live-rpc.ts`, `psychonaut.server.ts` | Live label/literature data | Not stored | OpenFDA, NLM, PubChem, DailyMed, CT.gov, PubMed, CPIC, PsychonautWiki, TripSit (see server IP only) |
| 14 | "Three readers" brief → xAI | `src/lib/drugs/readers.server.ts:10,48` | AI restatement | LRU cache 10 min | xAI |
| 15 | Server logs: event names, status, counts (no contents/emails/keys by design) | `src/lib/server/log.ts:18`; some `console.error` in `src/lib/auth/gate-session.server.ts` | Debugging | Per Vercel | Vercel |
| 16 | Host request logs (IP, UA, path) | Vercel platform | Hosting | Per Vercel plan | Vercel |
| 17 | Google Fonts (IP, UA to Google) | `src/routes/__root.tsx:26,30` | Typography | Per Google | Google |
| 18 | "Created with Grok" badge script from grok.com (may set its own cookies) | `scripts/grok-pwa-shared.mjs:203,238` | Platform badge | Per grok.com | xAI / grok.com |
| 19 | Feedback: mailto opened in user's mail app | `src/lib/drugs/feedback.ts:2` | Feedback | In Gmail | Google |
| 20 | Analytics / ads / error tracking | none found (no @vercel/analytics, Speed Insights, Sentry, GA, PostHog) | — | — | — |

## Findings to review
- The grok.com badge script is the one third-party script FirstPass doesn't control. If it sets non-essential cookies, a consent banner or removing the script may be needed.
- Google Fonts are loaded from Google's servers, so Google sees visitor IP addresses. Self-hosting the fonts would remove this.
- The auth tables log `ipAddress` and `userAgent` if sign-in is ever enabled. Update `/privacy` before enabling it.
- Copies of buyer names and emails sit in the operator's browser localStorage (`firstpass.issued.v1`, `firstpass.pipeline.v1`) and in Gmail.
- `src/lib/regulatory.ts` uses the "non-device clinical decision support" framing and lists "labeled dose ranges" in its intended use. The new pages don't repeat either; Kaleb has to decide on that wording.
- Governing law in `LEGAL_TERMS` was Delaware. This PR changes it to Washington to match `/terms`.
