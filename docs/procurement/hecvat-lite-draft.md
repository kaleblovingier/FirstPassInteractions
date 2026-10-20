# HECVAT Lite and vendor security questionnaire: draft answers

> **DRAFT. Do not send as-is.** Written 2026-10-18 from the code on branch `growth/trust`
> (software 1.75.0). Each answer names the file it rests on. Lines marked
> **Operator to confirm:** depend on facts that are not in the code (company, contracts,
> account settings, plans). Each carries a suggested answer that must be checked, edited or
> deleted before anything goes to a buyer. Copy answers into the institution's own form; the
> question wording below is a summary of common HECVAT Lite and higher-ed vendor form topics,
> not the official form text.
>
> FirstPass holds **no** SOC 2 report, ISO 27001 certificate, HITRUST or FedRAMP authorization,
> and is **not** FDA-cleared. Do not answer any question in a way that implies otherwise.
>
> Companion map with full file references: [data-flow.md](data-flow.md).

## 1. Company and product

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 1.1 | Vendor name and contact | FirstPass Interactions. Developer: Kaleb Lovingier. FirstPassInteractions@gmail.com, 360-707-8923. | `src/lib/regulatory.ts` (`SOFTWARE`) |
| 1.2 | Legal entity type, state of formation, tax ID | **Operator to confirm:** the legal form of "FirstPass Interactions" (sole proprietorship, LLC or other), the state of formation, and the TIN on the W-9. The software's legal terms name Delaware as the governing law; that is a choice-of-law clause and does not by itself show a Delaware entity. Suggested: state the entity exactly as it appears on the W-9. | `src/lib/regulatory.ts` (`LEGAL_TERMS.governingLaw`) |
| 1.3 | Product description | FirstPass is educational drug-interaction reference software. It shows mapped CYP450 and pharmacodynamic interactions, FDA label excerpts and published scales, with links to the sources, so a learner can review the basis. It is not FDA-cleared, not a charting system and does not pick a dose. The FDA-approved Prescribing Information governs. | `src/lib/regulatory.ts` (`INTENDED_USE`, `NOT_FOR`, `NOT_CLEARED`), `README.md` |
| 1.4 | Intended users | Licensed healthcare professionals, and students in accredited health-professions programs using it for education under faculty or preceptor supervision. | `src/lib/regulatory.ts` (`INTENDED_USERS`) |
| 1.5 | Delivery model | Web application in a browser. No install. Public URL `https://firstpass-desk.vercel.app`. | `src/lib/seo/pair-copy.ts` (`SITE_URL`) |
| 1.6 | Current version | 1.76.0 (released 2026-09-26 per the software record). | `src/lib/regulatory.ts` (`SOFTWARE`) |
| 1.7 | Number of employees, years in business, references | **Operator to confirm.** Do not invent customers or references. Suggested: "FirstPass is developed and run by one person, Kaleb Lovingier." | none in repo |
| 1.8 | Licensing | Individual Founding license, $79 once. Group and site licenses: see `/for-programs`. Program prices in the code are marked as a draft. | `README.md`, `src/lib/billing/programs.ts` |
| 1.9 | Regulatory status | Not FDA-cleared and not FDA-approved. An internal engineering self-assessment compares the product with FDA guidance for software that is not a medical device; it is not legal advice and not an FDA determination. | `src/lib/regulatory.ts`, `docs/regulatory/gap-assessment.md` |

## 2. Data collected and data classification

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 2.1 | What institutional or user data does the product collect? | For learners: none on FirstPass servers. There are no accounts and no database. Desk state, study marks, lab-book answers, saved briefs, recent trays and watch pins live in the learner's browser `localStorage`. | `.grok/app-env.json`, `src/lib/drugs/store.ts`, `src/lib/drugs/lab.ts`, `data-flow.md` section 2 |
| 2.2 | What leaves the browser? | Catalog drug ids or names for live lookups (the server then queries public sources by drug name); an optional check summary for the AI readers; the license key at redemption; an email at checkout or key recovery. | `data-flow.md` section 3 |
| 2.3 | Buyer data | Card buyers: email, name and payment details are held by Stripe. The FirstPass server reads email and name from Stripe to email the key and writes the key back to the Stripe record. Key emails go through Resend with a blind copy to the operator inbox. PayPal buyers (rail off unless configured): payer email and given name read from PayPal. | `src/lib/billing/stripe.server.ts`, `src/lib/billing/paypal.server.ts`, `src/lib/billing/license-mail.server.ts` |
| 2.4 | Does the product store, process or transmit PHI? | It is not designed to. The software's terms say users must not enter PHI and that FirstPass is not a HIPAA covered entity or business associate. The desk's inputs are catalog drug names and teaching toggles (for example an age band of adult or older adult, not a birth date). **Operator to confirm before sending:** the handout builder's free-text "Patient Identifier / Name" field was removed on `growth/million`. Once that is live, answer "No". | `src/lib/regulatory.ts` (`LEGAL_TERMS.hipaa`, `NOT_FOR`), `src/components/desk/resource-navigator.tsx` |
| 2.5 | Will you sign a Business Associate Agreement (BAA)? | **Operator to confirm.** Suggested: "FirstPass is not designed to receive PHI and does not sign BAAs. Users must not enter PHI." | `src/lib/regulatory.ts` (`LEGAL_TERMS.hipaa`) |
| 2.6 | FERPA: does the product receive education records or student PII? | For learners using the desk: no. There are no accounts, and learner work stays in the learner's browser. For program licenses: **Operator to confirm** how rosters are handled. The operator console can derive keys from a list of names; it does not send names to a database, but it keeps an issued-key list (names and keys) in the operator's own browser storage. Suggested: "We do not need student names to issue program keys. If a program sends a roster, it is used only to issue keys and is not stored on our servers." | `src/lib/billing/license.ts` (`mintLicenseBatch`), `src/lib/billing/license.server.ts` (`mintKeyFromNote`), `src/components/desk/foundry.tsx` (`firstpass.issued.v1`) |
| 2.7 | Does the product use AI or machine learning on user data? | One optional feature. When a user presses "Ask the three readers", the server sends a short brief built from the check on screen (drug names, top rows, mechanisms, source names, blank-pair reasons) to xAI's API (model `grok-4.5`). It runs only on request and only when an xAI key is configured. Answers are screened for directive wording and milligram amounts. FirstPass does not train models. **Operator to confirm:** xAI's retention and training terms for API inputs, and whether to add an on-screen note that the readers use an outside AI service (there is none today). | `src/lib/drugs/readers.server.ts`, `src/components/desk/readers.tsx`, `src/components/desk/check.tsx` |
| 2.8 | Data location | No FirstPass data store. The server functions ran in Vercel's `iad1` (US East) region when observed on 2026-10-18. **Operator to confirm:** the Vercel project's function region, and the regions Stripe, Resend and xAI use. | observation; `vercel.json` sets no region |
| 2.9 | Data retention and deletion | FirstPass keeps no learner data on servers. Server memory caches expire in 10 minutes to 6 hours and are lost on restart. Learners delete their own data by clearing site data. **Operator to confirm:** retention for Stripe records, Resend logs, the operator inbox and Vercel logs, and how a deletion request from a buyer is handled. Suggested: "Buyer records are kept in Stripe for tax and refund purposes; email us to request deletion of anything we hold." | `src/lib/server/cache.ts`, `src/lib/drugs/*.server.ts` |
| 2.10 | Cookies and tracking | FirstPass code sets no cookies and has no analytics, advertising or tracking code. Every page loads Google Fonts and a "Created with Grok" badge script from `grok.com` (the hosting template). Those third parties receive the visitor's IP address and browser details; the grok.com script response sets grok.com cookies (observed 2026-10-18). FirstPass does not control that script. | `package.json`, `src/routes/__root.tsx`, `scripts/grok-pwa-shared.mjs`, `data-flow.md` section 4 |
| 2.11 | Do you sell or share user data? | **Operator to confirm.** The code sends buyer data only to Stripe, PayPal (if on) and Resend for payment and key delivery. Suggested: "No. We do not sell or share user data." | `data-flow.md` section 3.3 |
| 2.12 | Privacy policy | **Operator to confirm.** The repo has legal terms in `src/lib/regulatory.ts` and the public `/trust` page, but no separate privacy policy page was found. The gap assessment recommends a short privacy statement. | `src/lib/regulatory.ts`, `src/routes/trust.tsx`, `docs/regulatory/gap-assessment.md` (section 8) |

## 3. Hosting and infrastructure

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 3.1 | Hosting provider | Vercel (project `firstpass-desk`). Built from source on every push to `main`. | `README.md` (Deploy), `vercel.json` |
| 3.2 | Do you operate your own data center or servers? | No. Serverless functions and static files on Vercel. No database. | `vite.config.ts` (Nitro `vercel` preset), `.grok/app-env.json` |
| 3.3 | Hosting provider's certifications | **Operator to confirm** from Vercel's current trust documentation; do not present Vercel's attestations as FirstPass's own. | none in repo |
| 3.4 | Source code hosting | GitHub, public repository `kaleblovingier/FirstPassInteractions`. | `README.md` |

## 4. Encryption

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 4.1 | Encryption in transit | Yes. The site is served over HTTPS by Vercel; plain HTTP returns a 308 redirect to HTTPS; the response carries `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (observed 2026-10-18). Every outside API the server calls uses an `https://` URL. | observation; `src/lib/drugs/*.server.ts`, `src/lib/billing/*.server.ts` |
| 4.2 | Encryption at rest | FirstPass stores no learner data at rest. Data in the learner's browser storage is protected by the device, not by FirstPass. Buyer records at Stripe and Resend are encrypted under those providers' terms: **Operator to confirm** wording from their documentation. | `data-flow.md` sections 2 and 3.3 |
| 4.3 | Key and secret management | Secrets are server environment variables in the Vercel project. None use the `VITE_` prefix that would bundle them for the browser. `.env` files are gitignored. A scan of tracked files on 2026-10-18 found no secret values. **Operator to confirm:** who can read the Vercel project's environment variables, and that `LICENSE_PEPPER` is backed up somewhere safe (see 12.2). | `src/lib/env.server.ts`, `.gitignore`, `docs/automatic-license-delivery.md` |
| 4.4 | Cryptography used | License keys are signed with HMAC-SHA256 under a server-only secret. The signature kept in the key is the first 8 hex characters (32 bits) of the HMAC. PIN and signature checks use constant-time comparison. | `src/lib/billing/license.server.ts` |

## 5. Authentication

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 5.1 | How do end users authenticate? | They do not. There are no accounts. A paid unlock is a signed license key the user pastes in; the server checks the signature once, and the unlock is then kept in that browser. | `src/lib/billing/license.ts`, `src/components/desk/plans.tsx`, `src/lib/drugs/store.ts` |
| 5.2 | SSO, SAML, Shibboleth or InCommon support | No. Not applicable without accounts. **Operator to confirm** whether program licenses will need institution sign-in; today they would not. | `.grok/app-env.json` (`VITE_AUTH_ENABLED: "false"`) |
| 5.3 | Multi-factor authentication | Not applicable for end users. For administrator accounts (Vercel, GitHub, Stripe, Resend, PayPal, xAI, the operator Gmail): **Operator to confirm** that MFA is on for each. | none in repo |
| 5.4 | Password policy | Not applicable; there are no user passwords. The operator console uses a PIN set in `FOUNDER_PIN`. In production the server refuses to run with the built-in default PIN. **Operator to confirm** PIN length and rotation. | `src/lib/billing/license.server.ts` |

## 6. Access control

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 6.1 | Who at the vendor can access customer data? | There is no FirstPass customer database. Buyer records are in Stripe (and PayPal if used); key emails are copied to the operator inbox. **Operator to confirm:** the list of people with access to Stripe, PayPal, Resend, Vercel, GitHub and the inbox. Suggested: "Only Kaleb Lovingier." | `src/lib/billing/license-mail.server.ts` |
| 6.2 | Administrative functions in the application | An operator console (reached by tapping the logo seven times) can mint keys, list paid Stripe orders with buyer email, name and key, and, where configured, scan the operator's Gmail for payment notices and draft replies. Every action needs the operator PIN, checked on the server in constant time. There is no attempt limit or lockout on the PIN. | `src/components/desk/app.tsx` (`openFoundry`), `src/lib/billing/license.ts`, `src/lib/billing/stripe.ts`, `src/lib/billing/collect.ts` |
| 6.3 | Least privilege, access reviews, offboarding | **Operator to confirm.** Suggested: "Single operator. Access to each provider account is reviewed when it changes." | none in repo |

## 7. Logging and monitoring

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 7.1 | What does the application log? | One-line JSON events with operational fields only: event name, source, host, status, attempts, duration, counts, cache hit or miss, error class, correlation id. The logging module's rule is that lines never carry request payloads, search text, regimens, host context, license keys, API keys or URLs that embed them. | `src/lib/server/log.ts`, `src/lib/server/http.ts` |
| 7.2 | Platform logs | Vercel keeps its own request logs (path, query string, IP address). **Operator to confirm** the retention for the project's Vercel plan. | none in repo |
| 7.3 | Are administrator actions logged? | No. Operator console actions (minting keys, listing orders) are not logged by FirstPass code. | `src/lib/billing/license.ts` (no `logEvent` calls) |
| 7.4 | Monitoring and alerting | **Operator to confirm.** No error-monitoring or alerting service is in the code or `package.json`. Suggested: "Vercel runtime logs are reviewed when a problem is reported." | `package.json` |

## 8. Incident response and breach notification

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 8.1 | Do you have a written incident response plan? | **Operator to confirm.** None is in the repository. Suggested, if true once written: "Yes. One owner (Kaleb Lovingier) triages, contains (rotate the affected secret in Vercel and redeploy; disable the affected rail by removing its key), assesses what data was involved, notifies affected customers, and records what changed." | none in repo |
| 8.2 | Breach notification commitment | **Operator to confirm.** This is a legal promise; check it with counsel and with any contract. Suggested: "We will notify affected institutions without undue delay, and within 72 hours of confirming a breach that involves their data, at the contact they give us." | none in repo |
| 8.3 | Security contact | FirstPassInteractions@gmail.com. **Operator to confirm** whether to publish a `SECURITY.md` or `security.txt`; neither exists today. | `src/lib/regulatory.ts` (`SOFTWARE.email`) |
| 8.4 | Cyber or professional liability insurance | **Operator to confirm.** Do not claim coverage that is not in force. Suggested if none: "We do not carry cyber liability insurance at this time." | none in repo |

## 9. Application security and vulnerability management

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 9.1 | Secure development practices | Input to server functions is validated with zod schemas: lists and strings are capped and unknown drug ids are dropped before any outside call. Outside calls have deadlines, a single retry and a 4 MB body cap. The Stripe webhook verifies Stripe's signature. Secrets fail closed in production. | `src/lib/server/rpc-input.ts`, `src/lib/server/http.ts`, `src/lib/billing/stripe.server.ts`, `src/lib/billing/license.server.ts` |
| 9.2 | Automated testing | The test suite ran 3,153 tests (210 script tests and 2,943 TypeScript tests) with 0 failures on 2026-10-18, plus a TypeScript typecheck and ESLint. | `scripts/run-tests.mjs`, `package.json` |
| 9.3 | Dependency management | Dependencies are pinned in `package-lock.json`. No automated dependency scanning is configured in the repository (no `.github` workflows or Dependabot file). **Operator to confirm** whether GitHub's Dependabot alerts are on in the repository settings, and the patch cadence. Suggested: "Dependency alerts are reviewed monthly and critical fixes are applied within 7 days." | `package-lock.json` |
| 9.4 | Penetration testing | **Operator to confirm.** No penetration test or third-party security assessment is documented in the repository. Suggested if none: "No third-party penetration test has been performed." | none in repo |
| 9.5 | Rate limiting and abuse controls | Key recovery: 5 requests per IP per 15 minutes and 3 per email per hour. AI readers: 30 asks per minute. Both are in-memory per server instance and reset on restart. Other endpoints, including key redemption, the operator PIN check and the public `/api/cds/*` API, have no rate limit of their own. | `src/lib/billing/recover.server.ts`, `src/lib/drugs/readers.server.ts`, `src/lib/billing/license.ts`, `src/lib/server/api/cds-handler.server.ts` |
| 9.6 | Security headers | HSTS is set by Vercel (observed). `vercel.json` sets no Content-Security-Policy or frame-options headers. A third-party script (`grok.com`) is injected without Subresource Integrity. | `vercel.json`, `scripts/grok-pwa-shared.mjs` |
| 9.7 | Public APIs | `/api/cds/*` is a public JSON API with no authentication. It accepts drug names and optional patient-level values (age up to 89, sex, weight, creatinine, eGFR, pregnancy and others) and rejects drug names that look like an SSN or long ID number. The desk itself does not call it. **Operator to confirm** whether this API should stay public. | `src/routes/api/cds/$.ts`, `src/lib/server/api/schemas.ts` |
| 9.8 | Change management | Every push to `main` deploys to production. **Operator to confirm** review and approval steps before a push to `main`. | `README.md` (Deploy) |

## 10. Third parties (subprocessors)

| Service | Purpose | Data it receives | Source |
| --- | --- | --- | --- |
| Vercel | Hosting, serverless functions, request logs | All requests to the site | `README.md`, `vercel.json` |
| Stripe | Card payments | Buyer email, name, billing details, card data (entered on Stripe's page) | `src/lib/billing/stripe.server.ts` |
| PayPal (off unless configured) | Payments | Payer email and name | `src/lib/billing/paypal.server.ts` |
| Resend | Key emails | Buyer email, name, license key | `src/lib/billing/license-mail.server.ts` |
| xAI (only when a key is set and a user asks) | AI readers | A summary of the check on screen | `src/lib/drugs/readers.server.ts` |
| Google Fonts | Web fonts | Visitor IP address and browser details | `src/routes/__root.tsx` |
| grok.com (hosting template badge script) | "Created with Grok" badge | Visitor IP address and browser details; grok.com cookies | `scripts/grok-pwa-shared.mjs` |
| OpenFDA, NLM (RxNorm, RxClass, DailyMed, PubChem), NCBI PubMed, ClinicalTrials.gov, CPIC, PsychonautWiki, TripSit | Public reference lookups | Catalog drug names from the FirstPass server (not from the visitor's browser) | `src/lib/drugs/*.server.ts` |
| Gmail through the Grok connector gateway (operator console only; active status not confirmed) | Finding payment notices and drafting key emails | Operator mailbox contents matching a payment search; buyer names and emails | `src/lib/billing/collect.server.ts`, `src/lib/app-data/client.server.ts` |
| GitHub | Source code hosting (public) | Source code only | `README.md` |

**Operator to confirm:** that this list is complete for the accounts actually in use, and whether
each provider's data processing terms have been accepted.

## 11. Accessibility

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 11.1 | Do you have a VPAT or ACR? | A draft Accessibility Conformance Report exists (VPAT 2.5, WCAG 2.2 edition, dated 2026-10-12). Of 56 Level A and AA rows: 15 Supports, 3 Partially Supports, 29 Not Evaluated, 9 Not Applicable. **Operator to confirm:** the report itself says not to send it to a buyer until Kaleb has reviewed every row; review it first. Its contact line names kaleblovingier@gmail.com, not FirstPassInteractions@gmail.com. | `docs/accessibility/ACR-WCAG22.md` |
| 11.2 | Testing methods | axe-core scans at 320 and 1280 px (0 violations since PR #153), Lighthouse accessibility 100 on tested pages, a keyboard journey script (36 of 36 checks), reflow, forced-colors and reduced-motion checks, and a contrast unit test. Not yet done: screen reader, speech or switch input, browsers other than Chrome, a manual expert audit. | `docs/accessibility/ACR-WCAG22.md`, `docs/accessibility/wcag-conformance.md` |
| 11.3 | Accessibility roadmap | The ACR lists known gaps and planned fixes. **Operator to confirm** dates. Note: the ACR's 2.1.4 row says the `/` shortcut cannot be turned off; the code now stores an off setting (`firstpass.slash.v1`), so that row may be stale. | `docs/accessibility/ACR-WCAG22.md`, `src/components/desk/search.tsx` |

## 12. Business continuity and availability

| # | Question | Draft answer | Source |
| --- | --- | --- | --- |
| 12.1 | Backups | FirstPass has no database to back up. Source code is in GitHub; the site can be rebuilt and redeployed from it. Learner work lives in each browser; learners can export the desk as JSON or CSV and lab receipts as files. FirstPass cannot restore a learner's browser data. | `README.md`, `src/components/desk/app.tsx` (desk export) |
| 12.2 | Recovery of license keys | Paid card keys are derived from the Stripe session id and `LICENSE_PEPPER`, so they can be re-derived and re-sent as long as Stripe and that secret exist. If `LICENSE_PEPPER` were lost or changed, existing keys could no longer be verified. **Operator to confirm** where that secret is backed up. | `src/lib/billing/license.server.ts`, `docs/automatic-license-delivery.md` |
| 12.3 | Uptime commitment or SLA | **Operator to confirm.** Do not quote an uptime number; none is measured in the repo. Suggested: "No SLA. The service runs on Vercel and is best effort." | none in repo |
| 12.4 | Disaster recovery and key-person risk | **Operator to confirm.** FirstPass is run by one person. Suggested: "If the operator is unavailable, the site keeps running on Vercel; existing keys keep working in learners' browsers." | `src/lib/drugs/store.ts` (unlock kept in browser) |
| 12.5 | Dependence on outside data sources | Live lookups depend on public APIs. If one is down, that panel says so and the rest of the desk keeps working from the built-in catalog. | `src/lib/drugs/live.server.ts`, `src/lib/server/http.ts` |

## 13. Certifications and attestations

| Item | Answer |
| --- | --- |
| SOC 2 Type I or II | No. |
| ISO 27001 | No. |
| HITRUST, FedRAMP, StateRAMP | No. |
| HIPAA | FirstPass is not designed to receive PHI and its terms prohibit entering it. It does not claim HIPAA compliance. |
| PCI DSS | Card data is entered only on Stripe's hosted checkout. **Operator to confirm** the SAQ type with Stripe (the gap assessment expects SAQ A). |
| FDA | Not FDA-cleared and not FDA-approved. |
| Clinical review | No clinician has reviewed the interaction content yet. A pharmacist sign-off packet is prepared. (`docs/clinical-review/signoff-packet.md`) |
