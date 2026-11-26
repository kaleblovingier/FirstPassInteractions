# FirstPassInteractions — Autonomous Architecture Audit & Backlog

> Living engineering and clinical pharmacology backlog maintained by the Lead Architect & Orchestrator.
> Adapted to the actual repository stack: **TanStack Start + React 19 + Vite 8 + TypeScript + Tailwind v4 + PostgreSQL/PGLite + Node.js native test runner (`node:test`)**.
>
> Educational pharmacology reference only. Not FDA-cleared and not FDA-approved. The FDA-approved Prescribing Information governs. No administered doses.

---

## 1. Repository Architecture Map

- **Frontend & SSR Shell**: `src/routes/` (TanStack Router file routes with static prerendering for `/drug/*`, `/pair/*`, `/class/*`, `/enzyme/*`, `/glossary`, `/sources`, `/methodology`), `src/components/desk/` (interactive interaction desk + clinical stations), `src/components/seo/` & `src/components/learn/` (reference monographs, class hubs, print handouts, glossary).
- **Core PK/PD Interaction Engine**: `src/lib/drugs/engine.ts` (`analyze()`), `src/lib/drugs/catalog.ts` + Waves 1–7 (`1,935` → `1,955+` compounds), `src/lib/drugs/safety.ts`, `src/lib/drugs/host.ts`, `src/lib/drugs/half-lives.ts`, `src/lib/drugs/tdm.ts`, `src/lib/drugs/combos.ts`, `src/lib/drugs/brief.ts`, `src/lib/drugs/clinical-packet.ts`, `src/lib/drugs/nps-watch.ts`.
- **Programmatic HTTP API**: `src/routes/api/cds/$.ts` → `src/lib/server/api/cds-handler.server.ts` & `src/lib/server/api/cds-service.ts` (`GET /api/cds/health`, `GET /api/cds/search`, `GET /api/cds/autocomplete`, `POST /api/cds/analyze`, `POST /api/cds/check`, `POST /api/cds/kinetics`, `POST /api/cds/export`), plus LTI 1.3 (`src/routes/api/lti/$.ts`) and billing (`src/routes/api/license/`).
- **Automated Verification & Clinical Safety Guards**:
  - `npm test` (`350+` test files, `4,424+` tests)
  - `src/lib/guards/dose-rule.test.ts` (zero administered-dose ratchet)
  - `src/lib/regulatory-claims.test.ts` (FD&C Act § 520(o)(1)(E) claim guard)
  - `src/lib/guards/editorial-ui.test.ts` (zero neon/purple/indigo/cyan/gradient/glassmorphism guard)
  - `scripts/low-contrast-text.mjs` (WCAG AA contrast guard)
  - `npm run check:label-drift` (DailyMed SPL quote drift guard)
  - `scripts/verify-pmids.ts` (NCBI PubMed PMID verification)
  - `scripts/signoff-packet.ts` & `docs/validation/*.md` (pair-scan regression packets)

---

## 2. Prioritized Autonomous Backlog

### Round 12 — Core Engine Hardening, Wave 7 Nootropic/Botanical Monographs, Zero-Artifact Editorial UI Overhaul & `/methodology` Hub
- [x] **R12-A1 (Engine Hardening & API Export)**:
  - Deduplicate `drugIds` in `analyze()` (`src/lib/drugs/engine.ts`) so duplicate stack entries never self-collide or double-count `stackLoad`.
  - Add 3+ drug **multi-compound PK cascade detection** in `multiDrugFindings()` (`grp-pk-multi-inh-*` cumulative dual/multi-inhibitor saturation including prodrug bioactivation blockade, `grp-pk-opposing-*` opposing inhibitor × inducer tug-of-war on the same CYP/P-gp isoform) plus `grp-ach-*` (≥ 3 anticholinergics) and `grp-bleed-*` (≥ 3 bleeding-risk agents) multi-drug PD burden rules.
  - Add `buildMarkdownRegimenReport()` and `buildStructuredRegimenJson()` in `src/lib/drugs/brief.ts`.
  - Add optional `enzyme`, `role`, and `cls` filtering to `GET /api/cds/search` and add `POST /api/cds/export` (`json` | `markdown`) in `src/lib/server/api/cds-service.ts` & `cds-handler.server.ts`.
- [x] **R12-A2 (Wave 7 Nootropic, Racetam, Peptide & Botanical Monograph Expansion + Half-Lives)**:
  - Add **20 structured monographs** in `src/lib/drugs/catalog-modern-wave7.ts` (`aniracetam`, `oxiracetam`, `pramiracetam`, `fasoracetam`, `coluracetam`, `nefiracetam`, `bromantane`, `flmodafinil`, `cerebrolysin`, `dihexa`, `sulforaphane`, `cordyceps`, `tongkat-ali`, `agmatine`, `taurine`, `glycine`, `alcar`, `uridine-monophosphate`, `lithium-orotate`, `l-tryptophan`) and fix missing aliases (`n-acetylcysteine` on `nac`, `5-htp` on `five-htp`, `curcumin` on `turmeric`).
  - Expand `HALF_LIVES` in `src/lib/drugs/half-lives.ts` with verified elimination half-lives for clinical staples and nootropics (`caffeine`, `modafinil`, `armodafinil`, `melatonin`, `bupropion`, `diphenhydramine`, `dextromethorphan`, `acetaminophen`, `clopidogrel`, `codeine`, `tramadol`, `lisdexamfetamine`, `piracetam`, `aniracetam`).
- [x] **R12-B1 & R12-B2 (Editorial Clinical UI Overhaul — 0 Vibe-Coded Artifacts)**:
  - Audit & refactor **all 163 occurrences** of `purple-*`, `indigo-*`, `violet-*`, `fuchsia-*`, `cyan-*`, `pink-*`, `bg-gradient-*`, `backdrop-blur-*`, and decorative `Sparkles` across 23 components into Clinical Monograph + Reference Laboratory tokens (`accent`, `info`, `warn`, `danger`, `ok`, `surface`, `surface-2`, `bg-sunken`, `border`, `fg`, `muted`, `subtle`) with `tabular-nums` and `1px` hairline structural rules.
  - Add `src/lib/guards/editorial-ui.test.ts` to lock in zero visual regressions permanently.
- [x] **R12-C1 (Interactive CYP450 & P-gp Pathway Matrix View)**:
  - Upgrade `src/components/desk/heatmap.tsx` into a dense Clinical Monograph CYP450 & P-gp Matrix displaying `tabular-nums` $t_{1/2}$ half-lives, explicit FDA potency/sensitivity tokens (`Sens`, `Maj`, `Min`, `Act` prodrug badge, `Str Inh`, `Mod Inh`, `Wk Inh`, `Str Ind`, `Mod Ind`), filter pills (`Active enzymes` / `All 8 pathways` / `Collisions only`), and interactive cell detail readout.
- [x] **R12-C2 (Pharmacology Reference & Methodology Hub `/methodology`)**:
  - Ship prerendered `/methodology` (`src/routes/methodology.tsx`, `src/components/learn/methodology-view.tsx`, `src/lib/learn/methodology.ts`) covering First-Pass Metabolism, FDA DDI Potency Tiers, Competitive Inhibition vs. TDI vs. Induction Washout Timelines, Prodrug Bioactivation Traps, Transporter Networks (`P-gp`/`BCRP`/`OATP`), and Evidence Hierarchy. Link from Desk footer, Command Palette, and `/glossary`.

### Round 13 — High-Alert Prodrug & Nootropic/Botanical Safety Rules, Markdown Export UI, Transporters, TDM/OTC Combos & Deep Monograph Polish
- [x] **R13-1**: Add NCBI-verified PubMed safety rules in `src/lib/drugs/safety.ts` & `clinical-packet.ts` for prodrug bioactivation failure (`codeine`/`tramadol` + strong CYP2D6 inhibitors), botanical/supplement CYP/P-gp high-alert traps (`st-johns-wort` + DOACs/immunosuppressants/OCPs, `berberine` + cyclosporine/tacrolimus/CYP2D6 victims, `lithium-orotate` + prescription lithium/NSAIDs/ACEi/thiazides), and curated nootropic/clinical sample stacks in `samples.ts` & `rounds.ts`.
- [x] **R13-2**: Wire 1-click **Copy Markdown** and **Download Markdown** buttons alongside JSON/CSV export in `src/components/desk/app.tsx`, and surface multi-drug PK saturation/tug-of-war/prodrug badges + `"Multi-drug"` filter pill in `src/components/desk/findings.tsx`.
- [x] **R13-3**: Enrich `src/lib/drugs/transporter-network.ts` (`P-gp`, `BCRP`, `OATP1A2/1B1/1B3`, `OAT1/3`, `OCT2/MATE1` + botanicals/DOACs/statins/dolutegravir) and upgrade `src/components/desk/dossier.tsx` with `MonographPkStrip` ($t_{1/2}$, $5\times t_{1/2}$ washout, FDA DDI potency tiers, `/methodology` link).
- [x] **R13-4**: Register `/methodology` in static prerendering (`vite.config.ts`), `sitemapXml()`, and SEO navigation (`pair-page.tsx`, `class-page.tsx`, `sources-page.tsx`, `enzyme-page.tsx`); expand `TDM` (`28` → `42` protocols) and `COMBINATIONS` (`98` → `126` OTC/Rx multi-ingredient products).
- [x] **R13-5**: Run live Playwright/browser smoke & responsive mobile viewport QA on `/` (desk + CYP matrix), `/?brief=fluoxetine,bupropion,codeine`, `/methodology`, and `/glossary` against the production preview build (fixed subtle `.sr-only` containing-block overflow in `heatmap.tsx` → `0px` horizontal overflow on `390px` mobile!).

### Round 14 — Sparkles Eradication, CPIC Level A PGx Expansion, CYP450 TDI/Inducer Expansion & Glossary
- [x] **R14-1 (Zero Decorative `Sparkles` + Guard Enforcement)**: Replaced all 7 remaining `Sparkles` icons across `src/components/desk/` (`anesthesia-station.tsx`, `antimicrobial-station.tsx`, `mechanism-intersect.tsx`, `oncology-station.tsx`, `phenytoin-station.tsx`, `pk-tdm-mechanisms.tsx`, `pregnancy-station.tsx`) with editorial clinical icons (`BookOpen`, `SlidersHorizontal`) and locked `\bSparkles\b` into `src/lib/guards/editorial-ui.test.ts`.
- [x] **R14-2 (CPIC Level A Pharmacogenomics Expansion)**: Added `SLCO1B1` and `HLA-B*58:01` (`13` → `15` pharmacogenes) and 6 landmark CPIC Level A drug-gene interactions (`25` → `31`: `simvastatin-slco1b1`, `atorvastatin-slco1b1`, `allopurinol-hla-b5801`, `atomoxetine-cyp2d6`, `ondansetron-cyp2d6`, `celecoxib-cyp2c9`) in `src/lib/drugs/pharmacogenomics.ts`.
- [x] **R14-3 (CYP450 TDI & Nuclear-Receptor Inducer Expansion)**: Added 5 mechanism-based TDI perpetrators (`9` → `14`: `cobicistat`, `amiodarone`, `gemfibrozil`, `clopidogrel`, `fluoxetine`) and 4 PXR/CAR nuclear-receptor inducers (`7` → `11`: `modafinil`, `efavirenz`, `apalutamide`, `enzalutamide`) in `src/lib/drugs/cyp-kinetics.ts`.
- [x] **R14-4 (Glossary Expansion)**: Added 6 pharmacokinetics & transporter entries (`59` → `65`) in `src/lib/learn/glossary.ts` linking directly to `/methodology` (`nuclear-receptor-induction`, `michaelis-menten-kinetics`, `efflux-transporter`, `uptake-transporter`, `washout-period`, `enzyme-saturation`).

### Round 15 — Mobile Table Accessibility & Overflow Hardening, Competitive Inhibitor Ki Library, Washout Expansion & Real Station Bug Fixes
- [x] **R15-1 (Quantitative Competitive Inhibitor $K_i$ & Washout Expansion)**: Expanded `COMPETITIVE_INHIBITORS` in `src/lib/drugs/cyp-kinetics.ts` (`4` → `14`: added `ketoconazole`, `itraconazole`, `voriconazole`, `bupropion`, `terbinafine`, `omeprazole`, `esomeprazole`, `cimetidine`, `berberine`, `piperine`) and included competitive inhibitors in `CYP3A4`/`CYP2D6` isoform trajectory readouts; added `EXTENDED_WASHOUT` (`5` teaching-panel clocks for `phenytoin`, `apalutamide`/`enzalutamide`, `modafinil`/`armodafinil`, `terbinafine`, and mechanism-based TDI inactivators `paroxetine`/`ritonavir`/`cobicistat`/`clarithromycin`/`grapefruit`) in `src/lib/drugs/host.ts` via `washoutsFor()` (leaving 2-drug engine pair-grade scans invariant) with matching plain-language classification in `src/lib/drugs/washout-plain.ts`.
- [x] **R15-2 (Real Clinical Station Bug Fixes & Editorial Precision)**:
  - Fixed broken `"tobacco"` catalog ID bug (`"tobacco"` → `"tobacco-smoking"`) in `src/components/desk/cyp-kinetics.tsx` preset and modulator chip; replaced neon cyan `#06b6d4`/`#38bdf8` SVG strokes with Reference Laboratory hex tokens (`#A62639`, `#B86B11`, `#1F4E5B`, `#266858`); added interactive Competitive Inhibitor $K_i$ & Offset Reference Table (`tabular-nums`).
  - Fixed `Inspect Gene` bug in `src/components/desk/pharmacogenomics.tsx` via `resolveGeneExplorerTarget()` so `HLA-B*58:01` (`HLA-B5801`) navigates to its own panel instead of `HLA-B*57:01`; added `SLCO1B1` OATP1B1 hepatic uptake flux model and `Simvastatin × SLCO1B1` / `Allopurinol × HLA-B*58:01` presets.
- [x] **R15-3 (Mobile `overflow-x-auto` Containment & Component Test Coverage)**: Added `relative`, `role="region"`, `tabIndex={0}`, and descriptive `aria-label`s to all 6 reference tables in `methodology-view.tsx` plus `relative` on `pharmacogenomics.tsx`, `transporter-network.tsx`, `clinical-packet-dialog.tsx`, `toxidromes.tsx`, and `receptor-profiler.tsx`; added dedicated test suites `src/components/desk/cyp-kinetics.test.tsx` and `src/components/desk/pharmacogenomics.test.tsx`.
- [x] **R15-4 (Live Production Preview Playwright Desktop + Mobile QA)**: Verified all 14 desktop (`1280×800`) & mobile (`390×844`) production preview routes (`/`, `/?brief=warfarin,fluconazole`, `/?brief=st-johns-wort,berberine,apixaban`, `/?brief=fluoxetine,bupropion,codeine`, `/methodology`, `/glossary`, `/pairs`) with HTTP `200`, `0px` horizontal overflow, `0` console errors, and `0` page errors.

### Round 16 — Next Autonomy Wave (Queued)
- [ ] **R16-1**: Sweep remaining clinical station `overflow-x-auto` containers (`acid-base-station.tsx`, `allergy-station.tsx`, `anesthesia-station.tsx`, `anticoagulation-station.tsx`, `clinical.tsx`, `epilepsy-station.tsx`, `glycemic-station.tsx`, `moud-station.tsx`, `opioid-rotation-station.tsx`, `pediatric-station.tsx`, `renal-mechanisms.tsx`) for `relative` mobile containment + editorial typography polish.
- [ ] **R16-2**: Expand **Wave 8** clinical & nootropic monograph coverage (e.g., `citicoline`/`alpha-gpc` verification, high-priority oncology TKIs/DOACs/antifungals, plus `HALF_LIVES` expansion `67` → `85+` verified agents).
- [ ] **R16-3**: Add interactive keyboard/WCAG 2.2 AA audit tests across `/methodology`, `/glossary`, `/pairs`, `/classes`, and core desk modals.
