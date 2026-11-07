# FirstPass regulatory gap assessment

Status: working draft, written 2026-09-26 against `main` at `0a30c77` (software 1.14.0).
Updated 2026-11-07 against `main` at `da80f1e` (software 1.79.0): section 3 table, section 4 numbers, and section 8.
This is an engineering self-assessment, not legal advice and not an FDA determination. Before any
public regulatory claim changes, a regulatory attorney or consultant should review it.

## 1. What "FDA approval" means for this product

Software is not "approved" by FDA. A software medical device is either cleared through 510(k),
granted through De Novo, or (rarely) approved through PMA. Separately, some clinical decision
support (CDS) software is excluded from the device definition altogether by section 520(o)(1)(E)
of the FD&C Act (added by the 21st Century Cures Act). Excluded software needs no FDA submission.

FirstPass currently positions itself as **non-device CDS**, and every surface says "Not
FDA-cleared." That copy must stay until a clearance actually exists.

Two realistic paths:

| Path | What it takes | Fit |
|---|---|---|
| A. Stay non-device CDS | Meet all four statutory criteria and document why. No submission. | Best fit for an educational interaction reference. Recommended. |
| B. 510(k) or De Novo | A regulated device with a quality system, design controls, risk file, software lifecycle docs, cybersecurity file, validation data, and a predicate (510(k)) or a novel-device request (De Novo). | Only worth it if the product must make claims that fail the criteria (for example, a single directive dose). Months to years and consultant cost. |

## 2. Guidance update the desk had not picked up

The desk cited the **September 28, 2022** CDS guidance. FDA replaced it with a revised final
guidance issued **January 6, 2026** and reissued **January 29, 2026**
(<https://www.fda.gov/media/109618/download>). This PR updates the citation in
`src/lib/regulatory.ts` and the label page. Changes that matter here, per the guidance and
published law-firm summaries (Covington, DLA Piper, Faegre Drinker, FDA Law Blog, January 2026):

- The four statutory criteria are unchanged.
- **Criterion 3:** software that gives a single output fails criterion 3, but FDA now intends to
  exercise enforcement discretion when only one option is clinically appropriate and the other
  criteria are met.
- **Time-critical use** moved from criterion 3 to criterion 4. Software meant for time-critical
  decisions may not leave the HCP room to independently review the basis.
- More emphasis on **transparency** of inputs, logic, and how outputs are generated, and on
  automation bias.
- Software relying on **genomic or other non-validated data** is called out as outside the
  enforcement-discretion policy.

## 3. Criterion-by-criterion mapping

| # | Criterion | Where FirstPass stands | Gap / action |
|---|---|---|---|
| 1 | Does not acquire, process, or analyze medical images, IVD signals, or physiologic signal patterns | Inputs are user-picked drug names and host flags. No images or waveforms. | **Review `src/lib/drugs/uds.ts`.** It maps drugs to expected, missed, and false-positive urine immunoassay results. As long as it is a teaching map from drug names and never takes an actual assay result as input, it should stay on the right side. Adding a "enter your cup result" input would put criterion 1 at risk. |
| 2 | Displays, analyzes, or prints medical information | FDA label excerpts, enzyme maps, published scales, literature. | None found. |
| 3 | Supports or provides recommendations to an HCP | Intended use names licensed HCPs, plus health-professions students for supervised education (`INTENDED_USERS`, decided by Kaleb 2026-09-27). "Trained safety staff" is gone. Dose and infusion-rate calculators sit behind an HCP and not-time-critical confirmation (`dose-gate.tsx`, hazard H4). Copies of the intended-user line now import `INTENDED_USERS` (Plans `WHO_FOR`). | **Dose rails** still check a user-entered milligram against labeled maxima and caps. Keep the copy as the label's number, never a replacement milligram. `src/lib/regulatory-claims.test.ts` now fails on a positive "FDA-cleared", "clinically validated", or "reviewed by pharmacists" style claim anywhere in shipped copy. |
| 4 | Lets the HCP independently review the basis, so they do not rely primarily on the output | Each finding carries a `FindingBasis` (label pin, label gold-set quote, perpetrator label, FDA interaction table, FDA boxed or safety communication, PI paraphrase, CPIC teaching card, PMID, scale, or desk map). Shipped since September: "Why this grade" on every check row, label version and last-checked dates, label pins for named contraindications (Avoid together is kept for a label pin, not for enzyme math), and, on this branch, per-source FDA section names and retrieval days, a "Desk map only" notice, and a "How this grade was reached" line (`src/lib/drugs/basis-review.ts`, hazard H6). Start/stop clocks are labeled as a study aid, not a real-time alert. | **Biggest remaining gap: basis coverage (section 4).** 53.6% of pair findings still rest on the desk map alone. 25 Avoid together rows have no saved source (section 4). PI paraphrase rows link a DailyMed search and save no section or date. CYP phenotype rows stay labeled as a teaching analogy, not a PGx result. |

## 4. Basis coverage measurement

`scripts/basis-coverage.ts` runs every two-drug pair in the catalog through `analyze()` and counts
findings whose only basis is the desk's own map, meaning no label line, FDA table row, FDA box or
safety communication, PI paraphrase, PMID, or CPIC teaching card. Full run (every pair, not a
sample) on 2026-11-07 against `da80f1e`: 1,911 drugs, about 1.83 million pairs, about 22 seconds.

| Severity | Findings | Desk-map only | Share | On `0a30c77` (2026-09-26) |
|---|---:|---:|---:|---:|
| Contraindicated | 3,081 | 25 | 0.8% | 44.1% |
| Major | 79,335 | 22,855 | 28.8% | 35.3% |
| Moderate | 122,568 | 68,610 | 56.0% | 42.0% |
| Minor | 67,841 | 54,787 | 80.8% | 77.1% |
| **All** | **272,825** | **146,277** | **53.6%** | **48.9%** |

Contraindicated coverage moved most, because Avoid together is now kept for a label pin. The
overall share rose because the catalog grew (1,770 to 1,911 drugs) and the new rows are mostly
desk-only moderate and minor rows, not because sources were removed.

The largest desk-only rule families are generic PD collisions (`pd`, about 47k), CYP3A4 substrate
competition (about 36k), washout (about 23k), CYP3A4 inhibitor (about 9.8k), CYP3A4 inducer
(about 6.5k), and urine-screen teaching rows (about 7.6k).

The 25 desk-only Avoid together rows are all pharmacodynamic rules: 5-HTP with an MAOI-class drug
(12), tyramine foods with an MAOI-class drug (9), gemfibrozil with lovastatin or red yeast rice (2),
allopurinol with azathioprine or mercaptopurine (2), and methotrexate with TMP-SMX (1). Several
saved label lines already speak to the tyramine rows (Azilect, Xadago, Sivextro, Zeposia); see
`docs/validation/unsourced-avoid-proposals.md`. Those grades are a clinical call and are unchanged.

Desk-only Serious concern rows lead with `pd` (about 14.3k), CYP3A4 inducer (about 2.7k), CYP3A4
inhibitor (about 1.8k), and washout (about 1.7k).

Every check row now says so when its only basis is the desk's map ("Desk map only: no FDA label or
literature source is saved for this row. Check the Prescribing Information."), names the FDA label
section and retrieval day when a saved line records them, and restates how the desk's rule reached
the tier. That makes the gap visible to the reader. It does not close it. **Priority fix:** give
every Avoid together and Serious concern row a specific external basis. For CYP inhibitor and
inducer rows, record which FDA DDI table entry (or PI section) each drug's role came from, per drug.
Do not bulk-label roles as "FDA table" unless each was verified against the table.

## 5. No clinician on the team

As of 2026-09-27 FirstPass has no licensed clinician on staff or as an advisor. The law does not
require one for non-device CDS, but it affects two things:

- **Claims.** No surface may say or imply clinical review ("reviewed by pharmacists," "vetted,"
  "clinically validated," "pharmacist-built"). A check of `main` and #53 on 2026-09-26 found none.
- **Biggest real gap.** A clinical advisor, ideally a PharmD, signing off on contraindicated and
  major findings is the highest-value credibility step, and any 510(k)/De Novo path would need
  qualified clinical input for validation and risk review.

## 6. If Kaleb chooses the 510(k) / De Novo path

None of this exists yet. Listed so the scope is visible, not as a plan of record.

- **Quality system:** FDA's Quality Management System Regulation (QMSR), which incorporates
  ISO 13485:2016, took effect February 2, 2026. Needs design controls, document control, CAPA,
  complaint handling, supplier control, management review.
- **Software lifecycle:** IEC 62304 (software safety class, requirements, architecture, unit and
  integration verification, SOUP list, maintenance and problem resolution).
- **Risk management:** ISO 14971 file. `HAZARDS` in `regulatory.ts` (H1 to H5) is a starting
  hazard list, not a risk file (no severity/probability, no residual-risk review).
- **Usability:** IEC 62366-1 human factors, especially automation bias and the "empty result is
  not a green light" hazard.
- **Cybersecurity:** section 524B premarket cybersecurity content (SBOM, threat model, patch plan)
  applies to cyber devices.
- **Clinical/analytical validation:** agreement against a published reference set of known
  interactions, with sensitivity and specificity by severity. The validation harness proposed in
  the room is the first piece of this and is useful on path A too.
- **Identifiers:** a real UDI comes from an FDA-accredited issuing agency and GUDID listing. The
  string `udi: "FP-SW-1.14.0"` in `regulatory.ts` is an internal version tag, not a UDI. Renaming
  the field (for example to `buildId`) avoids implying device status.
- Establishment registration, device listing, and user fees would follow clearance.

## 7. Other certifications

| Item | Applies today? | Note |
|---|---|---|
| HIPAA | Likely not as a covered entity or business associate, because the desk stores no PHI. | Keep it that way: no patient identifiers in briefs, permalinks, or logs. Write this down in a short privacy statement. If a hospital signs on, they may still ask for a BAA review. |
| SOC 2 Type I / II | Not required by law. | Hospital and pharmacy buyers often ask for it. Readiness needs policies, access control, logging, vendor review (Vercel, Stripe). Worth it only once institutional sales are real. |
| ISO 27001 | Optional alternative to SOC 2, more common outside the US. | Same prerequisite work. |
| WCAG 2.1 AA | Accessibility expectation for institutional and public-sector buyers. | Cheap to audit now. |
| EU MDR / UK MHRA | Only if marketed there. Drug-interaction software is commonly a Class IIa device under EU MDR Rule 11. | Out of scope unless Kaleb plans EU/UK sales. |
| Stripe / PCI | Card data stays with Stripe Checkout, so PCI scope is the SAQ A level. | Confirm no card data ever touches our servers. |

## 8. Recommended order

Done since 2026-09-26: this assessment and the guidance-date fix; contraindicated coverage (44.1% to
0.8% desk-only); the `udi` field renamed to `releaseTag` and `buildId`; a label gold set and FDA
table agreement checks (`docs/validation/`); the privacy page; per-row basis review aids.

1. Basis coverage: the 25 desk-only Avoid together rows first (a clinical call), then Serious
   concern. Track with `scripts/basis-coverage.ts`.
2. Recruit a clinical advisor (PharmD) to review Avoid together and Serious concern findings.
3. Replace PI paraphrase rows that link a DailyMed search with a saved label line (section, quote,
   retrieval day), one row at a time.
4. Validation harness against a published reference table, with agreement by severity.
5. Revisit path B only if a product claim requires it.
