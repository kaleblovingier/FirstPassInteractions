# FirstPass data-flow map

> **DRAFT. For the operator to review before sending to anyone.** Built from the code on
> branch `growth/trust` (software 1.75.0, `src/lib/regulatory.ts`) on 2026-10-18. Every
> statement names the file it comes from. Where the code does not settle a question, the line
> says **not confirmed**. Re-check this map after any change to the files it cites.

FirstPass is an educational drug-interaction desk. It is not FDA-cleared, and the Prescribing
Information governs (`src/lib/regulatory.ts`).

## 1. Summary

| Question | Answer | Source |
| --- | --- | --- |
| Accounts or sign-in? | None. Auth scaffolding exists in `src/lib/auth/` but is switched off (`VITE_AUTH_ENABLED: "false"`) and no auth route is mounted. | `.grok/app-env.json`, `src/routes/` (no `api/auth`), `src/lib/auth/provider.tsx` |
| Database? | None. `deploy.database` is `false`. `src/lib/db.ts` is only imported by the unused auth middleware. | `.grok/app-env.json`, `src/lib/auth/middleware.ts` |
| Where does learner work live? | The learner's own browser (`localStorage`). See section 2. | `src/lib/drugs/store.ts` and others below |
| What leaves the browser? | Catalog drug ids or names for live lookups; a check summary for the optional AI readers; a license key at redemption; an email at checkout or key recovery. See section 3. | `src/lib/drugs/*-rpc.ts`, `src/lib/billing/*.ts` |
| Cookies? | FirstPass's own code sets none. A grok.com script on every page can receive and set grok.com cookies (section 4). | `src/routes/__root.tsx`, `scripts/grok-pwa-shared.mjs` |
| Analytics? | No analytics, advertising or tracking library in `package.json` or source. | `package.json`, `src/lib/drugs/feedback.ts` |
| Server logs | One-line JSON, operational fields only. Never payloads, search text, regimens, host context or keys. | `src/lib/server/log.ts`, `src/lib/server/http.ts` |
| Hosting | Vercel, project `firstpass-desk`, built from source on each push to `main`. | `README.md` (Deploy), `vercel.json`, `vite.config.ts` |

## 2. What the browser stores

All of these are `localStorage` (or `sessionStorage` where noted) on the user's device. None is
sent to a FirstPass server except as listed in section 3. Clearing site data removes them.

| Key | Holds | Source |
| --- | --- | --- |
| `firstpass.desk.v7` | Drugs on the desk; metabolizer picks; smoking, alcohol, ketamine and cannabis route; age band (`adult` / `geriatric`); kidney (`ok` / `ckd`); pregnancy (`off` / `pregnant` / `lactating`); typed amounts per drug; study marks; plan, license key, lifetime flag, preview timer; HCP acknowledgment. | `src/lib/drugs/store.ts` (`partialize`) |
| `firstpass.watch.v1` | Watch pins (drug ids). | `src/lib/drugs/watchlist.ts` |
| `firstpass.lab.v1` | Lab-book answers (free text typed by the learner) with a timestamp. Exported only as a file the learner downloads. | `src/lib/drugs/lab.ts` |
| `firstpass.saved-briefs.v1` | Saved desk briefs. | `src/lib/drugs/saved-briefs.ts` |
| `firstpass.trays.v1` | Undo and recent trays. | `src/lib/drugs/tray-history.ts` |
| `firstpass.slash.v1` | Whether the `/` search shortcut is off. | `src/components/desk/search.tsx` |
| `firstpass.issued.v1`, `firstpass.payNote`, `firstpass.pipeline.v1` | Operator console only: issued key rows (buyer name and key), the operator's pay note, the operator's outreach pipeline. Present only on the operator's own browser. | `src/components/desk/foundry.tsx`, `src/lib/billing/hunts.ts` |
| `firstpass.foundry.pin` (`sessionStorage`) | Operator PIN for the current tab session, operator console only. | `src/components/desk/foundry.tsx` |

Not stored anywhere: the ZIP or city typed into the help-line finder is resolved from a static
in-browser table and is not persisted or transmitted (`src/lib/drugs/help-resources.ts`,
`src/components/desk/help.tsx`).

The paid unlock is stored in the browser. The server verifies a key's signature only when the
key is redeemed (`src/lib/billing/license.ts`, `redeemLicense`). The unlock is not re-checked
with the server on later visits (`src/lib/drugs/store.ts`). This is a licensing note, not a data
flow.

## 3. What leaves the browser, and where it goes

### 3.1 Live lookups (server functions)

The browser calls a TanStack server function on the FirstPass server. The server calls the public
source. The public source sees the Vercel server, not the user's IP address.

| Feature | Browser sends | Server sends upstream | Upstream host | Source |
| --- | --- | --- | --- | --- |
| Live label, adverse-event counts, NDC, shortages, recalls, RxNorm, PubChem, DailyMed (also used by Watch and the PI view) | One catalog drug id | The catalog generic name | `api.fda.gov`, `rxnav.nlm.nih.gov`, `pubchem.ncbi.nlm.nih.gov`, `dailymed.nlm.nih.gov` | `src/lib/drugs/live-rpc.ts`, `src/lib/drugs/live.server.ts` |
| Label-pair scan and RxClass | Up to 8 catalog drug ids | Catalog names, then RxCUIs | `rxnav.nlm.nih.gov`, `api.fda.gov` | `src/lib/drugs/rxnav.server.ts` |
| ClinicalTrials.gov search | Catalog ids and a query string (the desk always sends an empty query) | Catalog names | `clinicaltrials.gov` | `src/lib/drugs/live-rpc.ts`, `src/lib/drugs/trials.server.ts`, `src/components/desk/dossier.tsx` |
| PubMed search | Catalog ids and a query string (the desk always sends an empty query) | Catalog names plus fixed terms, `tool=firstpass` and the operator's email (NCBI etiquette) | `eutils.ncbi.nlm.nih.gov` | `src/lib/drugs/pubmed-rpc.ts`, `src/lib/drugs/pubmed.server.ts` |
| CPIC guideline | One catalog drug name | That name | `api.cpicpgx.org` | `src/lib/drugs/cpic.server.ts` |
| PsychonautWiki intro and TripSit combination | Up to 2 catalog drug ids | Mapped wiki titles and TripSit names or classes | `psychonautwiki.org`, `tripbot.tripsit.me` | `src/lib/drugs/psychonaut-rpc.ts`, `src/lib/drugs/psychonaut.server.ts` |

Every upstream request carries a `User-Agent` naming FirstPass and the operator's email
(`src/lib/drugs/*.server.ts`). Input is validated before any upstream call: ids must be on the
catalog shelf, lists are capped at 16 ids, query strings at 300 characters
(`src/lib/server/rpc-input.ts`). Upstream calls have a 6-second default deadline, at most one
retry, and a 4 MB body cap (`src/lib/server/http.ts`). Results are cached in server memory for
10 minutes to 6 hours depending on the source (`src/lib/drugs/*.server.ts`, `BoundedLRUCache` in
`src/lib/server/cache.ts`). Caches are per server instance and are not written to disk.

Note: the server functions accept a free-text `query` (up to 300 characters) for PubMed and
ClinicalTrials.gov. The desk UI never fills it, but a direct caller could, and that text would be
forwarded to NCBI or ClinicalTrials.gov.

### 3.2 The three readers (AI)

| Step | Detail | Source |
| --- | --- | --- |
| Trigger | Only when the user presses "Ask the three readers". | `src/components/desk/readers.tsx` |
| Browser sends | A brief built from the check on screen: catalog drug names (up to 5), the lead row, its clock, watch line, source names, fold line, up to 6 rows (severity, line, mechanism), up to 12 blank-pair reasons, up to 4 food lines, and a fixed sentence if an opioid is on the desk. Each field is clipped. | `src/components/desk/check.tsx` (`readerBrief`), `src/lib/drugs/readers.ts` (`sanitizeBrief`) |
| Server sends | Three calls to `https://api.x.ai/v1/chat/completions`, model `grok-4.5`, with a fixed system prompt and the brief as JSON. Uses the app owner's `XAI_API_KEY`. | `src/lib/drugs/readers.server.ts` |
| Server keeps | The answers, keyed by the brief, in memory for 10 minutes. | `src/lib/drugs/readers.server.ts` |
| Limits | 30 asks per minute per server instance; 15-second timeout per call; answers with directive words are dropped and milligram amounts are masked. | `src/lib/drugs/readers.server.ts` |
| Off switch | Without `XAI_API_KEY` the readers return "unavailable" and nothing is sent. | `src/lib/drugs/readers.server.ts` |

Not confirmed: the check rows come from `analyze(selected, host, amounts)` (`src/components/desk/app.tsx`),
so rows can reflect host toggles, and, if the user typed amounts, dose-check findings
(`src/lib/drugs/engine.ts`, `doseFindings`). Whether a dose-check row can reach the brief
(`regimenGroups(rows).pairs`) was not traced. xAI's retention of API inputs is set by xAI's terms,
not by this code: **not confirmed**. The readers UI does not tell the user that the brief goes to
an outside AI service (`src/components/desk/readers.tsx`).

### 3.3 Payments, keys and email

| Flow | Data | Goes to | Source |
| --- | --- | --- | --- |
| Card checkout | Plan, interval and an optional email typed on the Plans page. Card details are entered on Stripe's hosted page only. | Stripe (`stripe` SDK, server side) | `src/lib/billing/stripe.ts`, `src/lib/billing/stripe.server.ts` (`createCheckout`) |
| Card return and webhook | Stripe session id. The server reads the session's email, name and amounts from Stripe, mints the key, writes the key into the session metadata and the payment description, and sets the Stripe receipt email. | Stripe | `src/lib/billing/stripe.server.ts` (`claimSession`, `fulfillPaidSession`, `handleStripeWebhook`) |
| PayPal (off unless `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set) | Order id. The server reads the payer email and given name from PayPal to email the key. | PayPal Orders v2 (`api-m.paypal.com`, or sandbox) | `src/lib/billing/paypal.server.ts` |
| Key email | Buyer email, buyer name, key. | Resend (`api.resend.com`), to the buyer with a blind copy to `FirstPassInteractions@gmail.com` | `src/lib/billing/license-mail.server.ts`, `src/lib/billing/commerce.ts` (`OPERATOR.email`) |
| Key redemption | The key string. Verified and returned; nothing stored. | FirstPass server only | `src/lib/billing/license.ts`, `src/lib/billing/license.server.ts` |
| Lost-key recovery | The typed email. Looked up in Stripe; the key is re-sent through Resend to that email only. The same answer is returned whether or not a purchase matches. | Stripe, Resend | `src/routes/api/license/recover.ts`, `src/lib/billing/recover.server.ts` |
| Manual payments (Venmo, Cash App, direct PayPal) | Handled by the operator, who mints a key in the operator console. | Operator | `README.md` (Pay / write), `src/components/desk/foundry.tsx` |

Recovery rate-limit counters hold `ip:<address>` and `email:<address>` keys in a server-memory
`Map` (5 per IP per 15 minutes, 3 per email per hour). They are pruned only when the map passes
10,000 entries and are lost when the instance restarts (`src/lib/billing/recover.server.ts`).

Card data stays with Stripe Checkout; the gap assessment puts PCI scope at the SAQ A level and
asks to confirm that no card data touches FirstPass servers (`docs/regulatory/gap-assessment.md`,
section 7). The code reviewed here never receives card numbers.

### 3.4 Operator console

The operator console opens after seven taps on the logo (`src/components/desk/app.tsx`,
`openFoundry`). Its server functions need the operator PIN (`FOUNDER_PIN`), compared with
`timingSafeEqual` (`src/lib/billing/license.server.ts`). With the PIN it can mint keys, list paid
Stripe sessions with buyer email, name and key (`listPaidLicenses`), and, where the Grok
connector gateway is configured, search the operator's Gmail for payment notices and create Gmail
drafts (`src/lib/billing/collect.server.ts`, `src/lib/app-data/client.server.ts`). Whether the
Gmail connector is active on the Vercel deployment: **not confirmed** (it needs
`GROK_CONNECTORS_URL` or a gate host and a connector token).

There is no attempt limit or lockout on the operator PIN (`src/lib/billing/license.ts`,
`src/lib/billing/stripe.ts`, `src/lib/billing/collect.ts`).

### 3.5 Public HTTP API

`/api/cds/*` is a public, unauthenticated JSON API (`src/routes/api/cds/$.ts`,
`src/lib/server/api/cds-handler.server.ts`):

- `GET /api/cds/health`, `GET /api/cds/search?q=`
- `POST /api/cds/check` and `POST /api/cds/kinetics`, which accept up to 20 drug names and an
  optional host context: age (0 to 89), sex, weight, serum creatinine, eGFR, kidney category,
  pregnant, lactating, smoker, blood pH, serum albumin, urine pH (`src/lib/server/api/schemas.ts`).

Drug names that look like an SSN or a long number are rejected (`PHI_PATIENT_ID_REGEX`). Results
are cached in server memory for 10 minutes, keyed by drug ids and the full host context
(`src/lib/server/api/cds-service.ts`). Errors are logged with an operation name, error class and a
correlation id only. There is no rate limit and no authentication. The desk UI does not call this
API (no caller in `src/components/`).

### 3.6 Other

- **Feedback.** A `mailto:` link the visitor sends from their own email app; it carries the desk
  link and tray names and asks the sender to leave out patient information
  (`src/lib/drugs/feedback.ts`, `src/components/desk/app.tsx`).
- **Share links.** `?case=`, `?pack=`, `?lab=`, `?brief=` carry catalog ids in the URL
  (`src/lib/drugs/permalinks.ts`). They reach Vercel's request logs like any URL.
- **Unused code.** `src/lib/multiplayer/` (WebRTC) is not imported anywhere and has no
  `/api/rtc` route.

## 4. Third parties loaded by the browser

| Resource | Loaded on | What the third party receives | Source |
| --- | --- | --- | --- |
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | Every page | The visitor's IP address, user agent and referrer | `src/routes/__root.tsx` |
| `https://grok.com/grok-app-builder/extensions.js` (platform "Created with Grok" badge) | Every HTML page, injected by the hosting template | The visitor's IP address, user agent and referrer; any grok.com cookies the browser sends | `scripts/grok-pwa-shared.mjs` (`GROK_EXTENSIONS_SCRIPT_SRC`), `server/middleware/grok-pwa.ts` |

Observed on 2026-10-18 (not from the repo):

- The live home page loads both resources above.
- The `extensions.js` response set two cookies: `grok_device_id` (Domain `.grok.com`,
  `SameSite=Lax`, about 400 days) and `__cf_bm` (Cloudflare, `SameSite=None`, 30 minutes).
  Whether a browser keeps them when the script loads on a FirstPass page depends on its
  third-party cookie rules: **not confirmed**.
- The script, as fetched that day, reads no browser storage and makes one `GET` to
  `app-builder-deployer.grok.com` (with `credentials: "omit"`) only when a project id meta tag is
  present. The live page had no project id tag. The script is loaded live and can change without
  a FirstPass release.
- The draft ACR records that Lighthouse "best practices" failed on third-party cookies from this
  script (`docs/accessibility/ACR-WCAG22.md`, known gap 5).

## 5. Server-side secrets

All secrets are server environment variables read through `env()` (`src/lib/env.server.ts`) or
`process.env`. None uses the `VITE_` prefix, so none is bundled for the browser. The only
`VITE_` variables are `VITE_AUTH_ENABLED`, `VITE_OPERATOR_CONTACT`, `VITE_PAY_URL`,
`VITE_PUBLIC_URL` and `VITE_STUN_URLS`, none of them secret. `.env` and `.env.*` are gitignored
(`.gitignore`). A scan of tracked files on 2026-10-18 found no Stripe, webhook, Resend or xAI
secret values.

| Variable | Used for | Behavior when missing | Source |
| --- | --- | --- | --- |
| `LICENSE_PEPPER` | HMAC-SHA256 signing and verification of keys | In production (`NODE_ENV=production` or `GROK_PROJECT_ID` set) mint and verify throw; no default is used. Outside production a built-in default is used. | `src/lib/billing/license.server.ts` |
| `FOUNDER_PIN` | Operator PIN | Same as above. | `src/lib/billing/license.server.ts` |
| `STRIPE_SECRET_KEY` | Card checkout, claim, recovery, paid list | Card checkout off ("not live"); recovery returns 503. Keys that are not `sk_`/`rk_` test or live are treated as off. | `src/lib/billing/stripe.server.ts`, `src/lib/billing/recover.server.ts` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature check | Webhook returns 503; unsigned or bad signatures return 400. | `src/lib/billing/stripe.server.ts` |
| `RESEND_API_KEY`, `LICENSE_FROM` | Key email | No email; key still shows on screen; recovery returns 503. | `src/lib/billing/license-mail.server.ts` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` | PayPal rail | PayPal off; sandbox unless `PAYPAL_ENV=live`. | `src/lib/billing/paypal.server.ts` |
| `XAI_API_KEY` | The three readers | Readers unavailable; nothing sent. | `src/lib/drugs/readers.server.ts` |
| `GROK_CONNECTORS_URL`, `GROK_CONNECTOR_ACCESS_TOKEN` | Operator Gmail scan and drafts | Mail scan reports "off". | `src/lib/app-data/client.server.ts`, `src/lib/billing/collect.server.ts` |

Key format: `FP-<PLAN>-<8 hex>-<8 hex>`. The signature is the first 8 hex characters (32 bits)
of an HMAC-SHA256 (`src/lib/billing/license.server.ts`, `hmac`). Key redemption has no rate limit
(`src/lib/billing/license.ts`). Keys are not revoked on refund or dispute
(`docs/automatic-license-delivery.md`, Known limits).

## 6. Transport and hosting

- The desk is deployed to Vercel from source on every push to `main` (`README.md`, Deploy;
  `vercel.json` `buildCommand`). The Nitro `vercel` preset writes the build output
  (`vite.config.ts`).
- `vercel.json` sets redirects only. It sets no security headers (no CSP, no frame options).
- Observed on 2026-10-18 (platform behavior, not in the repo): `https://firstpass-desk.vercel.app/`
  returns `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; plain HTTP
  returns `308` to HTTPS; the response header `X-Vercel-Id` showed the function in `iad1`
  (US East). Data region and log retention are Vercel project settings: **not confirmed**.
- Vercel keeps its own request logs (path, query string, IP address). Retention is a Vercel plan
  setting: **not confirmed**.

## 7. Server logging

`logEvent` writes one JSON line per event to the console with `level`, `event`, operational
fields and a timestamp. The module's contract is that fields never carry request payloads, search
text, regimens, host context, license keys, API keys or URLs that embed them
(`src/lib/server/log.ts`). Upstream calls log source, host, status, attempts and duration, and
error messages never carry the URL (`src/lib/server/http.ts`). Logged events seen in code:
`upstream.fetch`, `live.lookup`, `readers.ask`, `rpc.invalid`, `cds.request_failed`,
`cds.kinetics.module_failed`, `cds.candidate_search_failed`. Not confirmed: that every
`console.*` call outside `log.ts` follows the same rule (for example the auth scaffolding's
`[gate-identity]` logs in `src/lib/auth/gate-session.server.ts`, which only run when auth is on).

## 8. Things in the code that work against the privacy claims

These are listed for the operator to decide on. Items 1 to 3 were fixed on the integration branch (`growth/million`); the rest are open.

1. **A patient name and MRN field.** The handout builder in the resource navigator has an input
   labelled "Patient Identifier / Name (Client-Side Only / No PHI Stored)" with the placeholder
   "e.g. J. Doe / MRN-84012". It is kept in React state only and is not sent or stored, but it
   invites PHI entry, against `LEGAL_TERMS.hipaa` and `NOT_FOR` in `src/lib/regulatory.ts`
   (`src/components/desk/resource-navigator.tsx`, `src/lib/drugs/healthcare-resources.ts`).
   **Fixed:** the field is removed from the handout builder.
2. **The readers send data to xAI without saying so on screen** (section 3.2).
   **Fixed:** the readers panel now says asking sends the desk's drug names and findings to xAI's Grok model.
3. **Third-party script on every page** that the help page's "Privacy guarantee" ("No search terms
   or locations are ever sent to our servers or stored in cookies") does not mention
   (`src/components/desk/help.tsx`, section 4). FirstPass code itself does keep that promise.
   **Fixed:** the line now reads "FirstPass does not send your search terms or location to its servers and sets no cookies of its own."
4. **Public CDS API accepts patient-level clinical values** without authentication or a rate
   limit (section 3.5).
