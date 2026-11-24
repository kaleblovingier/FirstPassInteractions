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

### Round 13 — High-Alert Prodrug & Nootropic/Botanical Safety Rules, Markdown Export UI, & Deep Monograph Polish
- [ ] **R13-1**: Add NCBI-verified PubMed safety rules in `src/lib/drugs/safety.ts` & `clinical-packet.ts` for prodrug bioactivation failure (`codeine`/`tramadol` + strong CYP2D6 inhibitors; `clopidogrel` + strong CYP2C19 inhibitors), botanical/supplement CYP/P-gp high-alert traps (`st-johns-wort` + DOACs/immunosuppressants/OCPs, `berberine` + cyclosporine/tacrolimus/CYP2D6 victims, `lithium-orotate` + prescription lithium/NSAIDs/ACEi/thiazides), and curated nootropic/clinical sample stacks in `samples.ts` & `rounds.ts`.
- [ ] **R13-2**: Wire 1-click **Copy Markdown Monograph** and **Download Markdown** buttons alongside JSON/CSV export in `src/components/desk/app.tsx`, and surface multi-drug PK saturation/tug-of-war badges cleanly in `src/components/desk/findings.tsx`.
- [ ] **R13-3**: Audit & enrich `src/lib/drugs/transporter-network.ts` (`OATP1B1`, `OATP1B3`, `BCRP`, `OCT2`, `MATE1`, `P-gp`) and `src/components/desk/dossier.tsx` (monograph drawer with half-life, washout window, FDA potency tier badges, and expandable Prescribing Information excerpts).
- [ ] **R13-4**: Run Playwright/browser smoke & responsive mobile viewport QA on `/` (desk + CYP matrix), `/methodology`, `/glossary`, and `/drug/warfarin` to verify zero console errors, zero horizontal overflow, and crisp laboratory typography.

### Round 14 — Comprehensive QA, Accessibility Journeys, Performance & Remaining Station Polish
- [ ] **R14-1**: Audit all remaining `src/components/seo/*.tsx` and `src/components/learn/*.tsx` pages for editorial hairline precision, `tabular-nums` alignment, and zero low-contrast / non-editorial utility classes.
- [ ] **R14-2**: Expand `src/lib/drugs/combos.ts` and `src/lib/drugs/tdm.ts` with additional OTC/Rx combinations and narrow-therapeutic-index monitoring protocols.
- [ ] **R14-3**: Add full keyboard-navigation & screen-reader unit tests for the CYP450/P-gp Matrix, Methodology Hub, and CDS export API.
