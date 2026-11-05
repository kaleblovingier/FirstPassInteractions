# EPSILON audit — Foundry, Hunt, and live scientific sources

Read-only discovery against `main` at `8c858db` (2026-11-05). No grades, gold-set rows, pins, tiers, `label-contraindications.ts`, `DROPPED_CANDIDATES`, Stripe, `plans.tsx`, `stripe-return.tsx`, or `/for-programs` were changed. No P0 defect in this lane justified a code fix in the same change.

## Inventory

### Operator desks

Foundry is not a normal route. `src/components/desk/app.tsx` (`openFoundry`, around the logo button) opens `view === "foundry"` after seven taps. The button’s accessible name is “FirstPass”.

`src/components/desk/foundry.tsx` is three tabs:

| Tab | Surface | What it does |
|---|---|---|
| Hunt | `src/components/desk/hunt.tsx` | Week-of-five, search recipes, directory, local book |
| Launch | `src/components/desk/launch.tsx` | Copy-out pitch links and posts. Sibling of this lane; not reviewed in depth |
| Close | `CloseDesk` + `ProgramKeyDesk` in `foundry.tsx` | Buyer DMs, pay note, collect/mint, issued keys, program keys |

Hunt data lives in `src/lib/billing/hunts.ts` (directory, DMs, `loadPipe` / `savePipe`) and `src/lib/billing/operator-desk.ts` (cap, CSV/JSON, unreadable-book guard).

### Browser persistence

| Key | Writer | Guard |
|---|---|---|
| `firstpass.pipeline.v1` (`PIPE_KEY`) | `savePipe` in `hunts.ts` | Refuses an empty overwrite of a real book and any write over non-array JSON unless the caller passes `allowEmpty` / `replaceUnreadable`. `try/catch` on get and set. Cap 80 (`PIPE_LIMIT`). Hunt shows that cap and pauses edits when the blob will not parse |
| `firstpass.issued.v1` | `persistIssued` in `foundry.tsx` | Slice to 80. No `try/catch`. Corrupt JSON loads as `[]`, so the next mint replaces the blob |
| `firstpass.payNote` | pay-note input in `foundry.tsx` | `setItem` on every keystroke. No `try/catch` |
| `firstpass.foundry.pin` | `sessionStorage` in `foundry.tsx` | Tab-scoped. Cleared by Forget. Not sent as a stored server secret |
| `firstpass.watch.v1` | `writeWatchlist` in `src/lib/drugs/watchlist.ts` | Unknown ids dropped. Cap 5 free / 12 founding. Corrupt JSON reads as empty and the next save replaces it. No `try/catch` |

One-off mint (`mintKey` in `src/lib/billing/license.server.ts`) is random. Named collect rows are deterministic from the sold-to string (`mintKeyFromNote`). Program keys are deterministic from org, tier, and end month. The server does not keep a copy of a minted key; verify is stateless HMAC. Losing `firstpass.issued.v1` loses the only local copy of a one-off key.

Collect writes the new key into the hunt row note (`foundry.tsx` `collect`, status `keyed`, `note: key`). Hunt CSV/JSON export includes that note (`pipeToCsv` / `pipeToJson`).

### Tests already on this lane

| File | Covers |
|---|---|
| `src/lib/billing/operator-desk.test.ts` | Pipe guard, CSV formula escape, export names, issued search, and a source scan that Foundry/Hunt still call those helpers |
| `src/lib/billing/hunt-dm.test.ts` | DM copy canon (five free, $79 once, no “Pro”) |
| `src/components/desk/copy-founding.test.ts` | Foundry UI strings (“Desk (year)”, no “Pro”) |
| `src/lib/drugs/watchlist.test.ts` | Cap, dedupe, unknown ids. No storage-failure case |
| `src/lib/drugs/live.server.test.ts` | Partial cache, total failure not cached, alias query names |
| `src/lib/drugs/rxnav.server.test.ts` | Partner scan against stubbed OpenFDA text |
| `src/lib/drugs/pubmed.server.test.ts` | Cache hit, empty id list, summary HTTP failure not cached |
| `src/components/desk/dossier-live.test.ts` | Dossier still prints a partial `reason` when `ok` is true |
| `src/lib/drugs/grade-provenance.test.ts` | Freshness line is display-only and does not change a basis |
| `src/lib/drugs/catalog-ungraded-perps.test.ts` | Fedratinib and mavacamten have no scored inhibitor/inducer role |

No component test drives Hunt’s radio group, Foundry’s clipboard failure, or Watch’s handling of `ok: true` with a failed shortage source.

### Live scientific hooks

All live calls go through `fetchJson` in `src/lib/server/http.ts` (6s default, one jittered retry on 429/503 for GET, `UpstreamError` messages omit the URL). Cache is in-process `BoundedLRUCache` (`src/lib/server/cache.ts`). It does not survive a new instance, and Refresh cannot see another instance’s entries.

| Source | Call site | Cache | What the UI is told |
|---|---|---|---|
| OpenFDA label | `fetchLabel` in `src/lib/drugs/live.server.ts` | Whole pack: 30 min if nothing failed, 30 s if partial, not cached if every source failed (`liveTtl`) | Dossier FDA tab. `effective_time` is not kept. First `limit=1` hit for `openfda.generic_name:"…"`. Interactions clipped to ~520 characters before anyone reads them |
| OpenFDA FAERS | `fetchFaers` | Same pack | Top 8 reaction counts. Dossier says counts, not rates. No date window |
| OpenFDA shortages, NDC, enforcement | `fetchShortage`, `fetchNdc`, `fetchRecalls` | Same pack | Dossier sections. Watch shows shortage rows and `recalls[0]`, labeled “Top recall” |
| RxNorm RxCUI | `fetchRxnorm` (`search=2`, then brand names) | Same pack | Dossier Names tab. Approximate name search. A brand-lookup failure becomes an empty brand list, not a failed source |
| RxClass | `classRows` in `src/lib/drugs/rxnav.server.ts` | 6 h, per RxCUI and source (ATC, FDASPL) | Live label coach. Header states the Interaction API was retired in 2024 |
| Partner scan | `buildReport` in `rxnav.server.ts` | 30 min only when the scan is complete; incomplete reports use ttl 0 | “Ask live sources” on the desk. Match is a substring of the already-clipped interactions excerpt. Desk max 8 drugs |
| DailyMed SPL list | `fetchDailyMed` (`pagesize=3`) | Same 30 min pack | Dossier shows title, `published_date`, setid link. Not joined to `label-versions.json` |
| PubChem | `fetchPubchem` (name → formula, MW, IUPAC, InChIKey). 404 is empty, not failure | Same pack | Dossier Molecule tab links the CID. No retrieved date |
| PubMed E-utilities | `searchLive` in `src/lib/drugs/pubmed.server.ts`, query built in `src/lib/drugs/pubmed-rpc.ts` | 10 min, including a successful empty hit list. Thrown failures are not cached | Dossier Papers. Curated cites stay in `pubmed.ts` / `pubmed-wave2.ts` and are separate from the live list |

Alias coverage for live queries is a short map in `liveQueryName` (`tmp-smx`, `paxlovid` → nirmatrelvir, `valproate` → valproic acid, several street ids skipped). Paxlovid’s live label pull is the nirmatrelvir name only.

### Provenance and freshness

| Piece | Role |
|---|---|
| `src/lib/drugs/grade-provenance.ts` | “Why this grade” view over `basisFor()`. Never changes a grade. `labelFreshnessLine` looks up a DailyMed setid on a **label** basis href |
| `src/components/label-freshness.tsx` | Renders that line |
| `src/lib/drugs/reference/label-versions.json` | 97 labels. File `retrieved` and every `checkedOn` are `2026-10-28`. Every row has `effective` and `version` |
| `src/lib/drugs/reference/label-drift.ts` + `docs/validation/label-drift.md` | Offline quote-vs-SPL check for gold-set and contraindication quotes. Same 2026-10-28 pull. 208 quotes pass, 1 moved section, 0 drifted |
| `docs/grade-provenance-audit.md` | Generated. Counts rule-only grades. This audit does not reopen those grades |
| `src/lib/drugs/watchlist.ts` + `src/components/desk/watch.tsx` | Local pins. On open, each pin calls `lookupLiveSources` |

`labelFreshnessLine` returns null unless `basis.kind === "label"` and the href has a setid. Catalog `note` URLs are not bases, so they never get a freshness line.

Eight DailyMed setids cited from `catalog-modern.ts`, `catalog-modern-wave2.ts`, and `catalog-modern-wave3.ts` are absent from `label-versions.json`:

| Drug | setid | File |
|---|---|---|
| Gepotidacin | `80b57cfe-7819-4d95-a57d-014af42f118d` | `catalog-modern.ts` |
| Pivmecillinam | `440a5f17-ab11-0fc8-e063-6394a90a58e9` | `catalog-modern.ts` |
| Ensifentrine | `e6433c98-41a0-4f99-8f7f-d0e9db6e3f40` | `catalog-modern.ts` |
| Sotatercept | `21693ee2-cd23-4137-ac67-066bb3a4a9b7` | `catalog-modern.ts` |
| Elinzanetant | `f42884ff-7dff-419c-8a0c-affe2ed73818` | `catalog-modern-wave2.ts` |
| Mavacamten | `669c936b-3ee6-4e36-8a22-79dd11b1255b` | `catalog-modern-wave2.ts` |
| Mavorixafor | `7f3a5ee3-ca73-4876-85a0-ed1e108a2237` | `catalog-modern-wave3.ts` |
| Vanzacaftor–tezacaftor–deutivacaftor | `7e635909-c6fd-4f0d-ae77-cdff03653a20` | `catalog-modern-wave3.ts` |

### Ungraded-perpetrator pattern (catalog-modern / waves only)

`EnzymeRole` (`src/lib/drugs/types.ts`) requires a `Strength` on every inhibitor and inducer. There is no unscored role. The engine (`src/lib/drugs/engine.ts`) only pairs stored inhibitor/inducer rows with substrates. Where a label names a perpetrator and does not give strong/moderate/weak, the row is left out on purpose and the sentence sits in `note` or `toxicityHint`.

Locked by tests today:

- Fedratinib — `src/lib/drugs/catalog-clinic.ts` (hint says the inhibitor roles stay ungraded). `catalog-ungraded-perps.test.ts`
- Mavacamten — inducer sentence in `catalog-modern-wave2.ts`. Same test file
- Mavorixafor and Alyftrek — `catalog-modern-wave3.test.ts` asserts no inhibitor/inducer row

Same prose-only choice, without the word “ungraded”, in `catalog-modern-wave3.ts` notes for etripamil, tradipitant, and zoliflodacin (`no inh() role is coded`).

What the learner actually sees:

- Pair check `blankReason` (`src/components/desk/check.tsx`) looks only at stored enzyme rows. A quiet pair does not quote the ungraded note.
- Single-drug monograph (`SingleDrug` in `src/components/desk/app.tsx`) prints the long note, then “Not a mapped inhibitor” / “Not a mapped inducer” when the arrays are empty.
- `perpetratorCountCard` (`src/lib/drugs/learn/perpetrator-count.ts`) asks how many perpetrator rows are stored and accepts `0` for these drugs.
- Watch’s enzyme line (`watchEnzymeLine` in `watch.tsx`) shows the first graded perpetrator, otherwise the first substrate. An ungraded inhibitor is not mentioned.

That is consistent with “do not invent a strength”. It is not the same as telling the reader the label named a perpetrator.

## Findings

No P0. The pair checker already says a blank pair is not a clearance, and the live coach already says a quiet label scan is not a green light. The gaps below are still the ones that most often get over-read.

### P1 — Ungraded label perpetrators never become a pair annotation

**Where:** `src/lib/drugs/types.ts` (`EnzymeRole`), `src/lib/drugs/engine.ts`, `src/components/desk/check.tsx` (`blankReason`), `src/components/desk/app.tsx` (`SingleDrug` / `RoleList`), `src/lib/drugs/learn/perpetrator-count.ts`, `src/lib/drugs/catalog-modern-wave2.ts` (mavacamten), `src/lib/drugs/catalog-modern-wave3.ts` (mavorixafor, Alyftrek, and the “no inh()” notes), `src/lib/drugs/catalog-clinic.ts` (fedratinib), `src/lib/drugs/catalog-ungraded-perps.test.ts`.

**What happens:** Mavorixafor’s note quotes a section 4 contraindication with drugs highly dependent on CYP2D6, and a dextromethorphan AUC increase, and still stores no inhibitor row. On a tray with a CYP2D6 substrate the check can say “No shared enzyme and no stacked-effect row on this map.” The monograph’s empty inhibitor column reads as “not mapped” beside a paragraph that says the opposite. Learn scores the stored count, which is 0.

**Acceptance:**

- Do not add a `Strength`, do not change any existing grade, gold row, pin, or tier.
- Add a non-scored annotation (a new role kind, or a pair footnote fed only from an explicit list). It must not enter `engine.ts` severity.
- For each drug already called ungraded in the files above, a pair with a substrate of the named enzyme shows the label sentence and the DailyMed link, and still has no Avoid / Serious / Use-care tier from that sentence.
- `blankReason` must not claim “no perpetrator was mapped” for that pair without the annotation.
- `perpetratorCountCard` must not treat “0 stored rows” as the whole story for those ids (exclude them, or add a second sentence that the label names an unscored perpetrator).
- Extend `catalog-ungraded-perps.test.ts` past fedratinib and mavacamten so a new scored `inh()` / `ind()` on those ids fails CI. Keep the wave3 tests.

### P1 — Live label identity is unpinned, and the partner scan sees a short excerpt

**Where:** `fetchLabel` in `src/lib/drugs/live.server.ts` (`limit=1`, no `sort`, interactions `clip(..., 520)`, no `effective_time` on `FdaLabel` in `src/lib/drugs/live.ts`). Consumer: `buildReport` in `src/lib/drugs/rxnav.server.ts` (needles run on `label.interactions`). UI: `src/components/desk/dossier.tsx` (FDA tab has no version date), `src/components/desk/rxnav.tsx`.

**What happens:** OpenFDA can return any SPL whose generic name matches. That setid is not checked against `label-versions.json`. The partner coach then searches only the first ~520 characters of the interactions section. A partner named later is reported as not in the excerpt. The coach does say the text is truncated and is not a complete engine. It does not say the search window itself was truncated, or which SPL date was used.

**Acceptance:**

- Keep the on-screen excerpt short.
- Search a much larger interactions string (or the full section) before deciding “no partner named”.
- Show setid plus `effective_time` (or “OpenFDA did not send a date”) on the FDA tab and on each live pair row.
- If `label-versions.json` has that setid and `effective` differs, say so. Do not overwrite the stored grade quote.
- A test with a partner string past the old 520-character clip must still produce a pair, and a test with two stubbed SPLs must record which setid was shown.

### P1 — Watch confuses a failed shortage pull with an empty shortage, and Refresh does not bypass cache

**Where:** `refreshOne` in `src/components/desk/watch.tsx` sets `err` only when `pack.ok` is false, then the empty-shortage sentence when `shortage.length === 0`. `lookupLiveOutcome` in `live.server.ts` caches a fully successful pack for 30 minutes (`LIVE_TTL_MS`). `lookupLiveSources` in `src/lib/drugs/live-rpc.ts` has no bypass. “Top recall” is `recalls[0]` from `product_description:"name"` with `limit=4` and no date sort (`fetchRecalls`).

**What happens:** If the label call works and the shortage call does not, `ok` stays true and `reason` names the failure (`partialReason`). Watch drops that reason and shows “No OpenFDA shortage rows came back this time.” A real empty shortage uses the same sentence. Refresh within 30 minutes on a warm instance returns the cached pack, and the card never shows when the pack was fetched. `book.updatedAt` is the localStorage write, not the FDA pull. “Top” is the first enforcement hit for a phrase, not the newest or the highest class.

**Acceptance:**

- When `shortage` or `recalls` is in `failed`, Watch shows that source’s failure phrase, not the empty-success sentence. Dossier already does this (`dossier-live.test.ts`); Watch should match.
- Empty and failed are different strings, and both still say a quiet pull is not a green light.
- The card shows a fetched-at time. Refresh passes a flag that skips `liveCache` for that pin (class cache may stay).
- Enforcement rows are sorted by initiation date when the field parses, and the heading is not “Top” unless a rank is defined.
- A unit test feeds `ok: true`, `shortage: []`, `failed` containing `shortage`, and expects the failure copy.

### P1 — Issued keys and hunt notes are weaker than the hunt book guard

**Where:** `loadIssued` / `persistIssued` / pay-note `setItem` in `src/components/desk/foundry.tsx`. Contrast `savePipe` and `nextPipeStorage` in `hunts.ts` / `operator-desk.ts`. Collect’s `note: key` in `foundry.tsx`. Export in `hunt.tsx` (`exportBook`). `copy` in `foundry.tsx` swallows clipboard errors, then the success line always says “fulfillment copied” once `last` is set.

**What happens:**

- A corrupt `firstpass.issued.v1` becomes an empty list, and the next mint overwrites it. Hunt refuses that unless the operator confirms replace.
- `setItem` throwing (private mode, quota) escapes the React updater. Hunt returns false and tells the operator the book was left unchanged.
- Collect replaces the outreach note with the license key. Download CSV/JSON then exports buyer name plus key. The note field’s placeholder still describes a reply note.
- Clipboard denial still shows “fulfillment copied”. Hunt sets a visible notice in the same situation.

**Acceptance:**

- Issued-key writes use the same rules as the book: unreadable storage is not replaced without an explicit confirm; `setItem` failure is caught and the key stays on screen.
- Pay-note writes are caught the same way.
- Collect appends the key in a dedicated field (or a second line) and does not destroy `note`. CSV/JSON export of keys is a separate, labeled action, not a silent column.
- “fulfillment copied” renders only after `clipboard.writeText` resolves. Failure uses the same visible notice Hunt already has.
- Tests cover corrupt issued JSON, a throwing `setItem`, and a rejected clipboard. No change to mint math, program tiers, or Stripe.

### P1 — Modern DailyMed cites sit outside the freshness file

**Where:** the eight setids in the table above. `labelFreshnessLine` in `src/lib/drugs/grade-provenance.ts`. `src/lib/drugs/reference/label-versions.json` (snapshot `2026-10-28`, 97 labels, all `checkedOn` that day). Live DailyMed hits in `fetchDailyMed` are not compared to that file.

**What happens:** A reviewer can see “Label version dated … Last checked 2026-10-28” on a gold-set basis, and cannot see any version date on the modern notes that actually carry these setids. The live dossier can show a different setid than the note, with no comparison. The drift script does not cover these notes because they are not gold quotes.

**Acceptance:**

- Add those eight setids to `label-versions.json` with `effective`, `version`, and `checkedOn` taken from DailyMed SPL v2, the same way the existing 97 rows were filled. Do not edit quotes or grades to do it.
- A test fails when a `setid=` in `catalog-modern.ts`, `catalog-modern-wave2.ts`, or `catalog-modern-wave3.ts` is missing from `label-versions.json`.
- Where the monograph shows that note, show `labelFreshnessLine` for its setid (display only).
- On the live FDA/DailyMed tabs, if the returned setid is in the file and the live published date differs, show both dates. Do not change the stored grade.

## P2

### Foundry and Hunt controls are only partly named

**Where:** Foundry tab buttons (`foundry.tsx`, the Hunt / Launch / Close row) have no `role="tab"`, `aria-selected`, or `aria-controls`. Hunt prey and range chips (`hunt.tsx`) have no `aria-pressed`. Status radios are a real `radiogroup` with arrow keys and 1–5, which is the good pattern. Repeated “Google” / “Mail” / “Site” links do not include the row name. Launch’s `copy` and Foundry’s `copy` both swallow clipboard failure; Hunt does not.

**Acceptance:** Selected tab and selected chips expose pressed/selected state. Icon-only or repeated links include the target name. Clipboard failure is visible on Foundry and Launch the way Hunt already does it. Do not remove the seven-tap gate in the same change.

### The seven-tap entrance is invisible to assistive tech

**Where:** `openFoundry` in `src/components/desk/app.tsx`. The control is named “FirstPass” and the gesture is undocumented in the UI.

**Acceptance:** Leave minting off the learner desk. If an operator path is added, it is a named control on a page buyers do not get by default (or a documented key sequence announced only after it succeeds), not a change to the learner header’s accessible name.

### PubMed live hits are easy to read as curated evidence

**Where:** `src/lib/drugs/pubmed-rpc.ts` (first two desk names only, plus a fixed interaction/CYP clause). `pullPubmed` in `pubmed.server.ts` (no read of an E-utilities `ERROR` field on HTTP 200, no `api_key`, `retmax=8`). Dossier `PubmedPanel` renders live hits in the same card shape as curated cites, minus the curated `why`. Footer says the search is incomplete.

**Acceptance:** Live cards carry a visible “Live search, not a grade source” label. An `ERROR` / `errorlist` body with HTTP 200 is a failure, is not cached, and is not shown as “no hits”. The query string shown to the reader includes every name that was actually searched. No new curated PMID is added in that change.

### RxNorm approximate match can attach the wrong RxCUI

**Where:** `fetchRxnorm` uses `search=2`. `scanDrug` in `rxnav.server.ts` prefers that RxCUI over the label’s RxCUI for RxClass.

**Acceptance:** Prefer an exact RxNorm match when one exists; otherwise say the RxCUI is approximate. Do not class a drug on an approximate RxCUI without that label. Keep the retired-Interaction-API copy.

### Label HTML entities are not decoded on the live excerpt

**Where:** `plain` in `live.server.ts` replaces `&` with `&`. `&amp;` therefore stays `&amp;`. `label-drift.ts` already decodes entities for the offline SPL check.

**Acceptance:** Live excerpts use the same entity decode as `normalize` in `label-drift.ts`, including numeric entities, and a test fixture with `&amp;` renders as `&`.

### Watchlist storage does not use the hunt-book rules

**Where:** `readWatchlist` / `writeWatchlist` in `src/lib/drugs/watchlist.ts`.

**Acceptance:** A non-JSON blob is not overwritten by Add. `setItem` failure surfaces a sentence and leaves the in-memory list intact. Cap behavior stays 5 / 12.

### FAERS counts have no time window

**Where:** `fetchFaers` in `live.server.ts`. The dossier heading already says “counts, not rates”.

**Acceptance:** The list states that the count is all reports on file for that exact term, with no date filter, or the request gains an explicit received-date bound that the UI prints. Do not turn counts into rates.

### OpenFDA and NCBI are called without an application key

**Where:** `getJson` in `live.server.ts`, `ncbi` in `pubmed.server.ts` (`tool` + `email` only).

**Acceptance:** Optional server-only key, never `VITE_`, never logged. Missing key keeps today’s behavior. 429 still uses the existing single retry and must not be cached as a successful empty label or an empty PubMed search.

## Suggested follow-up order

1. P1 ungraded-perpetrator annotation (no new strength).
2. P1 Watch failure-versus-empty, plus cache bypass and fetched-at.
3. P1 partner scan window and SPL date on the live label.
4. P1 issued-key guard and hunt-note key export.
5. P1 register the eight modern setids in `label-versions.json` and show the existing freshness line.
6. P2 a11y names, PubMed error body, RxNorm exactness, entity decode.

## Explicitly not found

- Hunt’s book guard, CSV formula escaping, and status radiogroup are in place and tested at the helper layer.
- Total live failure is not cached; a partial pack is cached for 30 seconds; an incomplete RxNav report is not cached.
- PubMed HTTP failures are not cached.
- `grade-provenance.ts` does not rewrite a grade when it adds a freshness line.
- The 2026-10-28 drift report shows no drifted gold quote. This audit did not re-run the network drift script.
- No change to grades is recommended by this document. The P1 annotation is a second surface next to the stored roles, not a new tier.
