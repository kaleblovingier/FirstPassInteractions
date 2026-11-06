# Gamma Phase A inventory (engineering)

Discovery only. Inspected `main` at `8c858dbe4cda9e1a4eece83ed555be0c84fb9bb0`. Rechecked against `main` at `d700a9a` on 2026-11-06: paths, line counts, and status notes below are corrected to that commit, and items `main` has since fixed are marked **Done on main**. This file changes no grades, pins, catalog strengths, engine pharmacology, routes, or dependencies.

Docs-only. The recheck ran `npm run lint` and `npm run typecheck` on the branch with `main` merged in.

No confirmed production outage (P0) turned up in this pass. The items below are incremental TypeScript/React work. They are not a rewrite.

## 1) Architecture and key directories

TanStack Start + React Router + Vite 8. React 19. Tailwind v4. The desk is a client Zustand store. Public reference pages are prerendered. Nitro's Vercel preset is applied only for `vite build` and `vite preview`.

| Path | Role |
|---|---|
| `vite.config.ts` | Dev `0.0.0.0:8080`. Preview `127.0.0.1:8081`. Plugins: PGLite bootstrap (dev, only if `migrations/` has files), `/auth/popup` (dev only), app-env, PWA, OG image generation on build, Tailwind, `tanstackStart` prerender, Nitro `preset: "vercel"` when `command === "build" \|\| isPreview`. |
| `src/router.tsx` | `getRouter()` passes `defaultErrorComponent: AppErrorComponent`. |
| `src/routes/__root.tsx` | Document shell, `AuthProvider`, `PreviewHostBridge`, font loader, prehydrate script for `localStorage` key `firstpass.desk.v7`, service worker registration. |
| `src/routes/index.tsx` | `/` renders `DeskApp` only. Not prerendered. |
| `src/routes/pair.$slug.tsx`, `drug.$slug.tsx`, `enzyme.$slug.tsx`, `pairs.tsx`, `enzymes.tsx`, `for-programs.tsx`, `trust.tsx`, `help.tsx`, `privacy.tsx`, `terms.tsx`, `cookies.tsx` | Public pages. Loaders throw `redirect` / `notFound`. Listed in the prerender filter in `vite.config.ts`. |
| `src/routes/practice.tsx`, `glossary.tsx`, `workup.tsx` | Learning pages. Not in the prerender filter, so they stay server-rendered. |
| `src/routes/recover.tsx` | License recovery page. |
| `src/routes/sitemap[.]xml.ts` | GET handler. Builds XML from `pairPages()`. |
| `src/routes/api/stripe.webhook.ts` | POST → `handleStripeWebhook`. |
| `src/routes/api/license/recover.ts` | License recovery API. |
| `src/routes/api/programs/inquiry.ts` | Program inquiry API. |
| `src/routes/api/cds/$.ts` | CDS catch-all. Owned by the data-API lane; not reviewed here. |
| `src/routeTree.gen.ts` | Generated route tree. |
| `src/components/desk/app.tsx` | Desk shell (~1,728 lines). Eager chrome plus `React.lazy` for clinical, study, watch, foundry, dossier, help, rounds, compare, label, cites, packet dialog. |
| `src/components/desk/clinical.tsx` | Clinical board (~7,444 lines). One lazy chunk that then statically imports every station. |
| `src/components/desk/*-station.tsx` | 26 station modules. |
| `src/components/ui/` | `button.tsx`, `badge.tsx`, `input.tsx` only. Button uses `@radix-ui/react-slot`. |
| `src/lib/drugs/store.ts` | Zustand `persist`, key `firstpass.desk.v7`, `skipHydration: true`. Rehydrate is started from `DeskApp`. `merge` runs the saved blob through `readDeskStorageState` in `src/lib/drugs/desk-persist.ts`. |
| `src/lib/drugs/catalog.ts` | Catalog module (~3,705 lines). Imported by the desk shell. |
| `src/lib/drugs/engine.ts` | Pair analysis (~2,567 lines). Imported by the desk shell and by `src/lib/seo/pair-pages.ts` at build. |
| `src/lib/server/rpc-input.ts` | Zod bounds for drug server functions (`checkInput`). The node budget lives in `src/lib/server/node-budget.ts`. |
| `src/lib/drugs/live-rpc.ts`, `pubmed-rpc.ts`, `readers-rpc.ts`, `psychonaut-rpc.ts` | `createServerFn({ method: "POST" })` with `checkInput`. Handlers dynamic-import `*.server` modules. |
| `src/lib/billing/license.ts`, `stripe.ts`, `paypal.ts`, `collect.ts` | Public `createServerFn` POST handlers. Validated with strict Zod schemas through `checkBillingInput` in `src/lib/billing/rpc-input.ts`. PIN checks live in `license.server.ts`. |
| `src/lib/auth/middleware.ts` | `authMiddleware` exists. No product server function attaches it. Auth stays off for this app. |
| `src/lib/db.ts` | Neon when `DATABASE_URL` is set, otherwise in-memory PGLite. |
| `scripts/migrate.mjs` | `npm run build` runs this after Vite. No `DATABASE_URL` or no pending app migrations → exit 0. `migrations/auth/` is not applied by this script. |
| `vercel.json` | `buildCommand`: `npm run build`. Permanent redirects for renamed slugs. CSP, Referrer-Policy, `X-Content-Type-Options`, Permissions-Policy, HSTS. `sw.js` is `no-cache`. |
| `src/lib/error-component.tsx` | The only router error UI. Has Reload and Reset saved desk controls. |
| `src/lib/server/rate-limit.ts` | In-memory sliding window. The file states counts do not survive a cold start and are not shared across instances. |
| `src/lib/server/safe-log.ts` | Logs error name and code, not message or stack. |

Server functions found (product):

- Drug lookups: `lookupLiveSources`, `lookupRxnavInteractions`, `searchTrials`, `lookupCpicGuideline`, `searchPubmed`, `readRegimen`, `lookupPsychonaut`.
- Billing: `redeemLicense`, `mintLicenseKey`, `mintProgramLicense`, `mintLicenseBatch`, `collectLicenses`, `draftCollected`, `stripeStatus`, `startStripeCheckout`, `claimStripeCheckout`, `listPaidLicenses`, `paypalStatus`, `startPaypalCheckout`, `claimPaypalCheckout`.
- `getConnectorReadiness` in `src/lib/app-data/readiness.ts` (connector lane; not expanded here).

## 2) Implemented vs incomplete

### In place

- File routes, named `getRouter()`, root shell, and a default error component.
- Desk state with a manual rehydrate (`skipHydration`) and a 300ms fallback so the shell does not wait forever (`DeskApp` in `app.tsx`).
- Prehydrate inline script hides the disclaimer and paid chrome before paint when `hcpAck` or a non-free `plan` is already saved.
- Secondary desk views are `React.lazy` + `Suspense` (`DeskFallback`).
- Drug RPCs validate with Zod and refuse oversized graphs before `safeParse` (`MAX_INPUT_NODES` in `rpc-input.ts`). Unknown catalog ids are dropped, not thrown.
- License HMAC verify, timing-safe compare, and production refusal of the default PIN and pepper (`licenseSecretsRequired` in `license.server.ts`).
- Stripe webhook is a route handler, not a browser-called mint.
- Public SEO routes prerender with `crawlLinks`. Pair list is memoized (`pairPages()` cache in `pair-pages.ts`).
- `.vercel/output` is gitignored, with `scripts/no-vercel-output.test.mjs` so a committed Build Output API tree cannot skip the source build.
- `tsconfig.json` has `strict: true`. ESLint uses `typescript-eslint` recommended. `@typescript-eslint/no-explicit-any` is off.

### Incomplete or uneven

- No route defines `pendingComponent` or its own `errorComponent`. Only three routes define `notFoundComponent` (`pair`, `drug`, `enzyme`).
- ~~Persisted desk JSON is cast to `Partial<DeskState>` and spread onto state.~~ **Done on main:** `readDeskStorageState` coerces the blob. Still open: reload checks only the key's shape; the HMAC is checked on redeem only.
- `ClinicalBoard` is one module. Opening it downloads every station import at the top of `clinical.tsx` (station imports run from about line 96 to line 273).
- The desk shell still statically imports catalog, engine, search, findings, heatmap, atlas, paywall, plans, PK explorer, formulary, and other always-mounted cards (`app.tsx` imports through about line 126).
- ~~Billing server functions each declare a local `readString`. They do not share `checkInput`.~~ **Done on main:** every billing server function validates through `checkBillingInput` with strict Zod schemas and a node budget (`src/lib/billing/rpc-input.ts`).
- Rate limits and PIN strike maps are process memory (`rate-limit.ts`, `PIN_THROTTLE` in `license.server.ts`). On Vercel that is one isolate.
- `pairPageBySlug` is `pairPages().find`. The array is cached; the lookup is still linear. Prerender calls it once per slug.
- Many `dependencies` are not imported from `src/` (see P3). They install on every Vercel build and do not appear in the client graph.
- `AuthProvider` is mounted. Product server functions do not use `authMiddleware`. That matches auth-off. It is not a missing login page.

## 3) Findings

Complexity is the size of a follow-up change: **S** one module, **M** a few modules plus a test, **L** routing or build-pipeline change. None of these are a new app.

### P0

None confirmed on this commit. The desk, router, and Vercel config are wired and consistent with a source build (`vercel.json` `buildCommand`, `.vercel` gitignored). Do not treat the P1s as outages.

### P1 — Persisted desk state is unchecked, and a thrown render has no recovery

**Status on `main` at `d700a9a`: mostly done.** `store.ts` `merge` (about line 477) now calls `readDeskStorageState` in `src/lib/drugs/desk-persist.ts`, which coerces every saved field (bounded `string[]` for `selected`, the plan union, `previewUntil` number or null) and rewrites a repaired blob. A paid `plan` with no key-shaped license or program grant becomes free. `AppErrorComponent` has Reload and Reset saved desk buttons. `desk-persist.test.ts` covers a non-array `selected` and a bad license. Still open: hydrate checks the key's shape only (the HMAC is still checked on redeem only, by design per the module comment), hydrate does not filter `selected` against `DRUG_BY_ID` (only `add` and `load` do), and the error screen still uses zinc colors rather than the desk tokens. The text below describes the code at `8c858db`.

`src/lib/drugs/store.ts` `merge` (about line 453) does `const p = (persisted ?? {}) as Partial<DeskState>` and `{ ...current, ...p, ... }`. Enum fields `age`, `kidney`, and `preg` are narrowed. `selected` is not forced to `string[]`. `plan` is not forced to `"free" | "pro" | "lab"`. `doses` is only checked with `typeof === "object"`.

`activePlan` treats `plan === "pro" | "lab"` as paid (`store.ts`). `redeemLicense` (`src/lib/billing/license.ts`) checks the HMAC on paste (`plans.tsx` `redeem`). Nothing calls it again on rehydrate. A saved `plan` of `"lab"` with an empty `license` unlocks host factors after reload. The interaction code is already in the client bundle, so this does not hide server data. It does let a stale or hand-edited `firstpass.desk.v7` skip the key check the paste path uses.

If `selected` is not an array, the next `includes` / `filter` in the store or `DeskApp` throws. `src/router.tsx` sends that to `AppErrorComponent` (`src/lib/error-component.tsx`), which prints `error.message` and has no reload or "reset this desk" control. `safe-log.ts` deliberately does not log messages; the error page does the opposite for whatever the router passes in.

**Impact:** A bad `localStorage` value can blank the desk. A forged `plan` survives reload without `verifyKey`.

**Complexity:** M.

**Acceptance:**

- **Done on main.** Parse the persisted slice with Zod (or an equivalent runtime schema). On failure, keep defaults and do not throw.
- **Partly done on main.** `selected` is a `string[]` of ids that `DRUG_BY_ID` actually has (bounded `string[]` is done; the catalog-id filter at hydrate is not). `plan` is the plan union. `previewUntil` is a number or null.
- **Open.** After a successful parse, if `plan` is not `"free"`, re-call the existing `redeemLicense` / `verifyKey` path with the stored license string before `usePlan()` reports pro or lab. A failed or missing key returns the free desk and does not mint a new key. (A missing or malformed key already returns the free desk on `main`.)
- **Done on main.** The error screen offers a reload control. It still shows `error.message` (router contract). It does not add a stack dump.
- **Partly done on main.** A unit test writes a non-array `selected` and a `plan: "lab"` with no license, rehydrates, and asserts no throw and a free plan until a real key verifies (`desk-persist.test.ts` covers these at the shape level, without an HMAC check).
- No catalog grade, pin, or engine rule changes.

### P1 — Clinical board is one chunk that imports every station

`DeskApp` lazy-loads `./clinical` (`app.tsx` about line 90). `clinical.tsx` then statically imports each panel (`QtStation` from about line 96, `OncologyPanel`, `AntimicrobialPanel`, `PhenytoinPanel`, and the rest from about line 227). The file is about 7,444 lines. Station files are separate modules, but the bundler still pulls them through that barrel of imports.

**Impact:** The first open of the clinical view downloads every station and the kinetic modules they import, including stations the visitor does not open.

**Complexity:** M. Do not merge stations or move calculations.

**Acceptance:**

- `ClinicalBoard` lazy-loads the panel for the active tab (or a small group of tabs), with the existing `DeskFallback` (or the same status text).
- The initial clinical chunk no longer statically imports unused station modules. Verify with a production build's chunk graph (import trace or `dist`/`output` asset list), not a guess.
- Tab switch still receives the same `ids` and `host` props. No copy or calculation changes.
- Typecheck stays green.

### P1 — Desk shell still pays for catalog, engine, and below-fold cards on `/`

`src/routes/index.tsx` renders `DeskApp` with no route loader and no lazy boundary around the shell. `app.tsx` statically imports `@/lib/drugs/catalog`, `@/lib/drugs/engine`, and a long list of cards (search, findings, heatmap, atlas, plans, PK, formulary, and others). Secondary views are already lazy. The first document is not.

`pair-pages.ts` also imports `analyze` and the catalog so prerender can grade public pages. That work is build-time. It is a reason not to "fix" bundle size by splitting the engine into a server-only module without a measured client budget.

**Impact:** First load of `/` parses the catalog (~3,705 lines) and engine (~2,567 lines) plus the shell (~1,728 lines) before the visitor opens a secondary view.

**Complexity:** M for lazy-loading cards that are not on the first screen (heatmap, atlas, formulary, PK). L if the engine itself is split. Do the card split first.

**Acceptance:**

- Record the current `/` client entry chunk size from one production build (bytes, gzip).
- Move at least the off-screen explorers that `app.tsx` mounts behind `view` checks onto the same `lazy` + `Suspense` pattern already used for study and clinical.
- Desk add/remove and `analyze` for the current tray still run without a network round trip.
- Re-measure the entry chunk. The follow-up is done when that number drops and the desk still renders a two-drug result.
- Do not change `analyze` results.

### P1 — PIN and abuse limits are per serverless isolate

`src/lib/server/rate-limit.ts` documents that windows live in one instance and reset on cold start. `clientKey()` reads `x-real-ip` (then the first `x-forwarded-for` entry) only when `process.env.VERCEL` is set; otherwise every caller shares `SHARED_CLIENT`. `pinOk` (`license.server.ts`) never hard-refuses: per-client backoff, then a global `slowMs` pause. Strike state is a module `Map`.

Production already refuses the default PIN and pepper when `NODE_ENV === "production"` or `GROK_PROJECT_ID` is set (`licenseSecretsRequired`). That part is in place. What does not carry across isolates is the strike count. Mint endpoints (`mintLicenseKey`, `mintProgramLicense`, `mintLicenseBatch`, `collectLicenses`, `listPaidLicenses`) are public POST server functions gated by that PIN.

**Impact:** Parallel isolates each allow `PIN_THROTTLE.free` (5) fast misses before backoff. A shared counter is the only way the limit is global. This is not a license-price change.

**Complexity:** M if a shared store is already configured. L if it is not: do not add a new database in the same change as the desk work. First ship a note in the operator path and a test that the in-memory limiter still slows one isolate.

**Acceptance:**

- Keep timing-safe compare and the production default-PIN refusal.
- Do not log the PIN or the guess (`pin.wrong` already logs counts only).
- If no shared store is configured, the follow-up stops at an explicit production comment and a test that `pinOk` still throws `pinWaitMessage` after the free misses in one process.
- If a store is added later, the same `PIN_THROTTLE` numbers apply across isolates, and a wrong PIN still does not lock the operator out forever (current contract).

### P2 — Billing server functions do not use the drug RPC validator

**Status on `main` at `d700a9a`: mostly done.** `src/lib/billing/rpc-input.ts` adds strict Zod schemas and `checkBillingInput` (node budget `BILLING_MAX_NODES`, shared `withinNodeBudget` from `src/lib/server/node-budget.ts`). `license.ts`, `stripe.ts`, `paypal.ts`, and `collect.ts` all use it, and no `readString` copies remain. `StripeCheckoutInput` restricts plan to `pro` / `lab` and interval to `month` / `year` / `life`. Still open: `paypal.server.ts` still casts the order JSON with `as any` (about line 161). The text below describes the code at `8c858db`.

`readString` is copied in `license.ts`, `stripe.ts`, `paypal.ts`, and `collect.ts`. Drug RPCs use `checkInput` + Zod, including a node budget that exists because Zod before 4.6.6 walks every element of an oversized array before `.max()` rejects it (now in `src/lib/server/node-budget.ts`). Billing validators do not. `readRows` in `collect.ts` casts filtered objects to `CollectRow`.

`paypal.server.ts` uses `as any` on the order JSON (about line 161).

**Impact:** A hostile POST can send a large object into mint/checkout handlers. Later caps (`parseNameList`, `BATCH_CAP`) limit some outputs, not the parse. Drug RPCs already show the pattern to copy.

**Complexity:** S.

**Acceptance:**

- **Done on main.** One shared helper for billing inputs, with max string lengths and a node budget consistent with `withinNodeBudget`.
- **Done on main.** `startStripeCheckout` plan and interval are unions the server already accepts, not arbitrary strings that fall through later.
- **Open.** `paypal` order JSON is parsed with a small schema (id and status fields the claim path reads). No `as any`.
- Existing license and Stripe tests still pass. No price or plan-catalog edits.

### P2 — Router error and loading surfaces are thin

`AppErrorComponent` is a centered zinc panel. The desk uses `bg-bg` / `text-fg`. There is no `pendingComponent` on `/` or the public routes. Pair, drug, and enzyme routes have a one-line not-found. Practice, recover, and the API routes rely on the default.

Caught server-function failures in `rxnav.tsx`, `plans.tsx` redeem, and similar boards set local error text. An unexpected throw during render still hits the root error component only.

**Impact:** A render throw looks unlike the desk and offers no next step. Navigations have no route-level pending UI (Suspense fallbacks cover lazy views only).

**Complexity:** S. Visual polish of stations stays with the UI lane. This item is the error/pending contract only.

**Acceptance:**

- Error component keeps `error.message`, uses the desk background tokens, and includes a reload button. (Reload button: **done on main**, with a Reset saved desk button. Desk tokens: still open, the panel still uses zinc.)
- `/` has a `pendingComponent` that is text, not a blank screen, if the router supports one for this Start version.
- A thrown render in a test or story still shows the message.

### P2 — Prerender and OG generation are a large build step

`vite.config.ts` prerenders `/pairs`, `/enzymes`, `/for-programs`, `/trust`, `/help`, legal pages, `/sitemap.xml`, and every `/pair/*`, `/drug/*`, and `/enzyme/*` link the crawl can see. `ogImagesPlugin` runs `scripts/og-images.ts` once per build via `spawnSync` and throws if it fails. `package.json` `build` is `node scripts/with-app-env.mjs vite build && npm run db:migrate`. Nitro is `3.0.260610-beta` with `preset: "vercel"` and `serverDir: "./server"`.

`docs/validation/label-gold-set.md` reports 514 label pairs. `pair-pages.test.ts` requires at least 300 unique public pair pages. Each of those becomes HTML and, through `ogImageJobs()` in `src/lib/seo/og.ts`, a share image (pairs + drug hubs + two static images). This pass did not re-run the build, so it does not claim a timeout. The fan-out is the risk.

`pairPageBySlug` is a linear `find` on the cached array (`pair-pages.ts`).

**Impact:** Vercel build time and memory. A failed OG script fails the deploy (`ogImagesPlugin` throws). Migrate is safe to re-run and skips when `DATABASE_URL` is unset.

**Complexity:** S for a slug `Map`. M to measure and, only if the build is near the platform limit, narrow crawl without dropping indexed URLs that `sitemap.xml` still lists.

**Acceptance:**

- One production build log records prerender page count, OG image count, and build duration.
- `pairPageBySlug` is a map lookup. Pair-page tests still pass.
- Sitemap URLs and prerendered paths stay in agreement. No change to pair copy or grades.
- Do not commit `.vercel/output`.

### P2 — `no-explicit-any` is off, and a few UI handlers use it

`eslint.config.mjs` sets `@typescript-eslint/no-explicit-any` to `"off"`. `tsconfig.json` does not enable `noUncheckedIndexedAccess`. Generated `routeTree.gen.ts` uses `as any` (expected). Hand-written casts include station `<select>` `onChange` handlers (`pediatric-station.tsx`, `glycemic-station.tsx`, `moud-station.tsx`, `anesthesia-station.tsx`) and `paypal.server.ts`.

**Impact:** A mistyped option value becomes `any` and enters kinetic state. Typecheck will not catch it.

**Complexity:** S per station. Do them with the clinical split, not as a repo-wide lint flip.

**Acceptance:**

- Those four `onChange` handlers use the option union already defined in the station.
- Do not turn on `no-explicit-any` for the whole repo in the same change (generated route tree and tests would dominate the diff).
- No change to the kinetic formulas.

### P3 — Installed UI and data libraries are unused in `src/`

`package.json` dependencies with no `from "..."` import under `src/` at this commit:

- `@tanstack/react-query`, `@tanstack/react-table`
- `react-hook-form`, `@hookform/resolvers`
- `vaul`, `sonner`, `date-fns`, `react-day-picker`, `react-resizable-panels`
- Radix packages other than `@radix-ui/react-slot` and `@radix-ui/react-dialog` (slot is imported in `src/components/ui/button.tsx`; dialog in `src/components/desk/command-palette.tsx`)

`cmdk` was on this list at `8c858db`. On `main` it is imported by `src/components/desk/command-palette.tsx`.

`recharts` is used by `src/components/desk/pk.tsx`. `zod`, `zustand`, `stripe`, `jose`, `kysely`, `pg`, and `@electric-sql/pglite` are used.

**Impact:** Longer `npm install` on Vercel and a wider supply-chain surface. Unused packages are not in the client graph, so this does not by itself shrink the desk chunk.

**Complexity:** S. Removing a package is a lockfile change. Confirm with `npm run build` after removal. Do not remove Radix slot, Radix dialog, cmdk, recharts, or zod.

**Acceptance:**

- `rg` from `src/` shows no remaining imports of each removed package.
- `npm run build` and `npm run typecheck` pass.
- No UI redesign.

### P3 — Service worker and CSP are coupled to inline scripts

`__root.tsx` registers `/sw.js` after load (skipped inside frames) and injects two inline scripts (font media swap, prehydrate). `vercel.json` CSP allows `'unsafe-inline'` on `script-src` and also allows Stripe and `https://grok.com`. That inline allowance is what makes the prehydrate script legal. Tightening CSP without moving those scripts will break first paint.

**Impact:** None until someone edits CSP or the inline scripts separately.

**Complexity:** M. Out of scope for the first implementation pass.

**Acceptance (later):** Nonce or hash for those two scripts, CSP without a blanket `'unsafe-inline'`, prehydrate still sets `data-fp-ack` / `data-fp-paid`, and the Grok branding script is still allowed.

## 4) Non-goals

This PR does not change behavior. Follow-up implementation in this lane still does not:

| Lane | Leave untouched |
|---|---|
| Beta (labels / gold set / FDA) | `src/lib/drugs/label-contraindications.ts`, `src/lib/drugs/reference/label-gold-set.ts`, `src/lib/drugs/engine.ts` grading rules, `scripts/fda-agreement.ts`, `scripts/label-drift-check.ts`, `scripts/severity-whatif.ts`, `docs/validation/*`. No new pins, no severity changes, no catalog strength edits. |
| Epsilon (data APIs) | `src/routes/api/cds/$.ts`, `src/lib/server/api/*`, RxNav / OpenFDA / PubMed / CPIC / Psychonaut client contracts, `src/lib/app-data/*`. Gamma may keep calling the existing server functions. Do not redesign their payloads. |
| Delta (UI / a11y polish) | Contrast, focus order, station layout, copy tone. Exception: the router error component's recovery control and token alignment in the P2 above. |
| Eta (claims / pricing) | `src/lib/billing/plans.ts` prices, `src/lib/billing/commerce.ts` claims, `src/lib/seo/legal.ts` refund TODOs, paywall marketing copy. Re-verifying a stored key is an engineering check, not a new price. |

Also out of scope: adding accounts, attaching `authMiddleware` while auth is off, moving the engine to a server-only module, replacing Zustand, replacing TanStack Start, or switching off the Nitro Vercel preset.

## 5) Highest-impact incremental work (in order)

1. ~~Schema-check `firstpass.desk.v7`~~ (done on main) and re-verify a non-free plan with the existing license server function (still open). ~~Add a reload control on `AppErrorComponent`.~~ Done on main.
2. Lazy-load clinical stations from `clinical.tsx` without merging files.
3. Lazy-load off-screen desk cards already gated by `view` in `app.tsx`, then compare one production entry-chunk size.
4. ~~Point billing server functions at a bounded parser.~~ Done on main. Remove the `as any` on the PayPal order (still open).
5. Add a `Map` for `pairPageBySlug` and record prerender/OG counts from one build before changing crawl scope.
6. Drop unused dependencies only after the chunk work, with a full build.

Do not start with a router rewrite, a new database, or an engine split.

## Evidence notes

- Line counts are `wc -l` on `main` at `d700a9a` (rechecked), not estimates of bundle bytes. Bundle bytes need one production build (not run here).
- Pair-page cardinality: `src/lib/seo/pair-pages.test.ts` asserts `pages.length >= 300`. The generated gold-set report lists 514 label pairs. This pass did not execute `pairPages()`.
- Dependency non-use is "no import from `src/`". A future import would change that finding.
- This change is markdown only. The recheck ran `npm run lint` and `npm run typecheck`.
