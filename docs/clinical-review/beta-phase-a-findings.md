# Beta Phase A findings — pharmacology and scientific accuracy

Discovery only, from `main` before this document was added. This document changes no grade, catalog strength, pin, engine severity, or production copy.

Educational reference only. Not FDA-cleared. Not a prescribing aid. No new pharmacological relationship and no new numerical estimate is asserted here. Statements about labels are quotes or paraphrases already stored in the repo. Where the desk infers a tier from a mechanism, that inference is labeled as such.

Open pull requests **#209** and **#213** were read and left untouched. Do not merge them from this phase.

Alpha can turn each finding into a task. Implementation is a later phase, and only after a human yes where a finding would change a grade.

## How to read a tier

| Desk word | Code | What it is |
| --- | --- | --- |
| Avoid together | `contraindicated` | Teaching bin. The on-screen hint says it is kept for a named label pin, not for pharmacokinetic math (`SEVERITY_HINT` in `src/lib/drugs/types.ts`). The engine does not keep that promise everywhere. See B-P0-2. |
| Serious concern | `major` | Engine or catalog rule, sometimes with a label quote, sometimes without. |
| Use care | `moderate` | Same. |
| Mild note | `minor` | Same. |

Two sources of a tier, and they must stay distinct:

- **Label-established.** A DailyMed sentence is stored and shown (`label-gold-set.ts`, `label-contraindications.ts`, `basis.ts` label quotes).
- **Mechanistic inference.** Catalog role times `pkSeverity()`, a pharmacodynamic flag, a phenotype analogy, or a phenoconversion sketch. The Prescribing Information may or may not say the same thing.

---

## 1. Interaction engine

### 1.1 CYP inhibition, induction, substrate

`pkFindings()` in `src/lib/drugs/engine.ts` pairs every shared enzyme. For each direction it keeps the strongest perpetrator grade and the hottest substrate grade, then calls `pkSeverity()`.

Substrate vocabulary is `sensitive | major | minor`, plus an optional narrow-index flag (`nti`) and a pathway of `clearance` or `activation` (prodrug). Perpetrator vocabulary is `strong | moderate | weak` for both inhibitors and inducers.

`pkSeverity()` (`engine.ts`, the function starting near the strength tables) never returns `contraindicated`. Current branches:

- Inhibitor, strong, sensitive or narrow-index: `major`.
- Inhibitor, strong, major substrate: `major`.
- Inhibitor, strong, otherwise: `moderate`.
- Inhibitor, moderate, sensitive or narrow-index: `major`.
- Inhibitor, moderate, major substrate: `moderate`.
- Inhibitor, moderate, otherwise: `minor`.
- Inhibitor, weak, sensitive or narrow-index: `moderate`.
- Inhibitor, weak, otherwise: `minor`.
- Inducer on an activation (prodrug) pathway: strong `major`, moderate `moderate`, weak `minor`. Sensitivity is not used.
- Inducer on clearance: strong is `major` for every sensitivity, including minor. Moderate with sensitive, narrow-index, or major is `major`. Moderate otherwise is `moderate`. Weak is `minor`.

Two hard-coded skips inside `pkFindings()` (still inference, not a label lookup): fruit-juice perpetrators are not scored as P-gp inhibitors of fexofenadine, and ritonavir or Paxlovid is not scored as raising methadone through CYP3A4.

If both drugs are only substrates, a competition row is emitted at `moderate` when either is narrow-index, otherwise `minor` when both are sensitive or major. Clinical text says competition is "usually modest". That is a desk sentence, not a cited fold-change.

Clinical sentences state the catalog grade as fact: "X is a strong CYP3A4 inhibitor. Y is a sensitive CYP3A4 substrate…". Whether that grade is FDA's class or the desk's bin is not in that sentence. The "Why this grade" layer is separate (section 1.5).

### 1.2 Phenotype and phenoconversion

Host phenotype (`phenotypeFindings()` in `engine.ts`) runs only for `PHENOTYPE_ENZYMES`: CYP2D6, CYP2C19, CYP2C9, CYP2B6 (`src/lib/drugs/types.ts`). Normal metabolizer emits nothing.

- Poor metabolizer is scored as a strong inhibitor. Intermediate is scored as a moderate inhibitor. The clinical line says "Same pattern as a strong/moderate inhibitor." That is an analogy, not a CPIC table row.
- If that analogy would have been `contraindicated`, the code forces `major`.
- Ultrarapid on a clearance pathway is forced to strong-inducer math, then overwritten: sensitive or narrow-index becomes `major`, major substrate `moderate`, else `minor`.
- Ultrarapid on an activation pathway uses strong-inducer math, then **sets `contraindicated`** when the substrate is sensitive or narrow-index. The comment names codeine to morphine. See B-P0-2.

Phenoconversion (`src/lib/drugs/pheno-convert.ts`) is a separate teaching map. The file header says "Not a CPIC table and not a test order." Watched enzymes are CYP2D6, CYP2C19, CYP2C9, CYP2B6, CYP1A2, and CYP3A4. CYP1A2 and CYP3A4 are always treated as a normal genotype.

Rules in `clinicalOf()`:

- Strong inhibitor: poor stays poor; ultrarapid becomes "NM-like"; everyone else becomes "PM-like".
- Moderate inhibitor: poor stays poor; ultrarapid becomes "NM-like"; intermediate becomes "PM-like"; normal becomes "IM-like".
- Strong or moderate inducer: poor stays poor; everyone else becomes "induced".
- Weak perpetrators do not shift the row.

A shifted row with a victim becomes a `geno` finding at `major` if the lead perpetrator is strong, otherwise `moderate`. The pearl says the chart genotype and the desk enzyme differ. That is mechanistic teaching, not a measured phenotype.

### 1.3 Pharmacodynamic rules

`pdFindings()` is a long list of flag and named-set rules. Examples that set `contraindicated` directly, before any pin:

- MAOI × serotonergic, or MAOI × MAOI (`pd-maoi-sero`).
- Carbapenem × valproate.
- ARNI × ACE inhibitor.
- And others enumerated in `docs/clinical-review/signoff-packet.md` section 1 (23 contraindicated class rules, 54 major class rules, on the packet's scan).

`basis.ts` already says two of those rules extend the label past the named partners:

- `pd-ghb-cns`: oxybate labels contraindicate sedative hypnotics and alcohol; "Street GHB and non-hypnotic depressants are the desk extending that label."
- `pd-maoi-stim`: amphetamine and methylphenidate labels contraindicate MAOIs; "Cocaine, MDMA, and other unlabeled stimulants are the desk extending that label."

The sign-off packet's open question 2 gives the GHB split on that scan: 738 pairs, about 120 hypnotic or alcohol partners, about 618 other CNS depressants. Those counts are the packet's, not a new count.

`labelFloorFindings()` holds two pairs below Avoid together on purpose, with the label quote in the card: buprenorphine × phenelzine at `major` ("not recommended", not contraindicated), methadone × zidovudine at `moderate`. The code says it does not assign a CYP grade.

### 1.4 What `pkSeverity` does not do

Ship 1.51 is cited in `scripts/signoff-packet.ts` and `scripts/severity-whatif.ts`: a strong inhibitor or strong inducer with a sensitive or narrow-index substrate stops at `major`. Avoid together on a CYP or P-gp finding is supposed to come from a label pin (`applyLabelPins()`, `holdWashoutLabelPins()`).

The generated packet disagrees with that code in its section 2 legend. See B-P0-1.

### 1.5 How confidence and evidence are shown

There is no numeric confidence score on an interaction finding.

`basisFor()` in `src/lib/drugs/basis.ts` builds an ordered list:

1. Label pin quote, if the finding is tagged `label-contraindicated`.
2. Gold-set quote when the pair exists and the mechanism matches (`PK` vs `PD`; `PK+PD` matches either).
3. A boxed or PI paraphrase keyed by finding-id suffix (`BOXED`, `PI`). Many of these are class paraphrases, not a verbatim SPL sentence, and the link is often a DailyMed search rather than a setid.
4. FDA Table 1 role, only when the perpetrator is on the transcribed table for that enzyme and role. Detail text says FDA grades the roles and "the severity tier on this row is the desk's rule."
5. A perpetrator-label quote from `label-perpetrators.ts`. If the label names a contraindication, that quote is shown. If it only states inhibition or induction, the detail says the tier is the desk's rule. If the victim is in `alsoNamed` and not in a contraindication group, the function returns nothing rather than call the tier a desk rule.
6. The first curated PubMed cite for those drug ids (`citesFor()` prefers a pair-tagged cite, then any cite that lists either drug).
7. If `kind === "geno"` or the id contains `pheno`: a CPIC row pointing at `https://cpicpgx.org/guidelines/` with the sentence "Phenotype rows paraphrase published CPIC tables."
8. If nothing else: "Curated map — no external source verified."

`gradeBases()` in `src/lib/drugs/grade-provenance.ts` drops the `desk` kind and, when nothing cited remains, shows "Basis: catalog enzyme rule" or "Basis: catalog rule", with the sentence "No FDA label quote is on file for this pair." A label row can add a freshness line from `label-versions.json` ("Label version dated … Last checked …") or "No label version date is on file." It does not invent a date.

The check board (`src/components/desk/check.tsx`) renders mechanism verbs ("slows clearance of", "rewrites the pathway for"). It does not show a confidence tier.

`docs/grade-provenance-audit.md` (generated, do not hand-edit) reports, on its scan: Avoid together 3,035 findings, 19 with no cited source (0.6%); Serious concern 72,023 findings, 14,786 rule-only (20.5%). The 19 unsourced Avoid together pairs are listed there and again in section 4.

A PubMed row or a CPIC index link counts as a cited source in `hasCitedSource()`. That can overstate how specific the evidence is. See B-P0-3 and B-P1-4.

---

## 2. Label, gold set, pin pipeline, DailyMed

### 2.1 Gold set

`src/lib/drugs/reference/label-gold-set.ts` stores pairs tied to a DailyMed SPL quote. `retrieved` is one of `2026-09-27`, `2026-10-02`, `2026-10-03`, `2026-10-05`, `2026-10-12`, `2026-10-19`, `2026-10-28`. Quotes are meant to be verbatim substrings; ellipsis marks an elided span. The header says quotes are trimmed so they carry no milligram amounts.

`docs/validation/label-gold-set.md` (generated) reports 514 pairs and "Engine at or above label-supported floor: 514 / 514", and "label contraindicated and engine contraindicated: 479 / 479". That is agreement with the stored floor, not an independent clinical review. Wave inclusion rules are in the gold-set file header (label must say contraindicated, or avoid / not recommended; monitoring-only language does not qualify; several waves skip conditional renal, hepatic, or dose-dependent lines).

`docs/validation/label-drift.md` records a DailyMed SPL v2 re-check dated 2026-10-28. This phase did not re-fetch labels.

### 2.2 Pins

`src/lib/drugs/label-contraindications.ts` holds named-pair pins. The test "pin list is exactly the reviewed set" locks these origin counts:

| Origin | Count |
| --- | ---: |
| gold-set | 27 |
| wave3 | 90 |
| wave4 | 99 |
| no-enzyme | 60 |
| pd | 155 |
| wave6 | 13 |
| wave7 | 49 |
| restored-after-58 | 4 |

497 pins. `no-enzyme` and `pd` omit `enzyme` and `kind` so they do not assign a CYP grade. The header says no-enzyme emits a standalone Avoid together card, and pd lifts the highest existing pharmacodynamic card.

`applyLabelPins()` sets `severity: "contraindicated"` on the matching CYP finding, or synthesizes one if the enzyme finding is missing ("catalog roles changed"). `holdWashoutLabelPins()` can lift a washout card the same way when the pin origin is `pd`.

Each pin has `basis: "named" | "class"`.

- `named`: the label names the partner.
- `class`: the contraindications sentence covers a class and does not name the partner. The type comment gives "inducers of CYP3A" as the example.

There are 16 `basis: "class"` pins on main, including Ranexa × primidone ("Taking inducers of CYP3A"), thioridazine × abiraterone and × cinacalcet (2D6 inhibitor class), naltrexone × oxycodone and × hydrocodone ("opioid analgesics"), and Geodon class rows (Class Ia/III antiarrhythmics; MAOIs other than the named linezolid and intravenous methylene blue examples).

### 2.3 Standing pin rule

The rule used for later waves is written in `docs/validation/unsourced-avoid-candidates.md` and repeated in `docs/validation/unsourced-avoid-proposals.md`:

> A pair is pinned only when the partner is named in the Contraindications section and the card already reads Avoid together. No grade was changed.

And: "None of these meets the pin bar (partner named in the Contraindications section with contraindicated wording), so none is pinned."

Consequences already visible:

- A label contraindication whose card is Serious concern or Use care is **not** pinned. Rolapitant is the worked example (section 4).
- A class sentence can still be an older pin (`basis: "class"`). The standing rule was not applied backwards.
- The engine does not check `basis === "named"`. Any pin lifts the tier.

### 2.4 DailyMed provenance on screen

Pin and gold-set details append "Retrieved from DailyMed" plus the stored date. `labelFreshnessLine()` adds SPL effective date and last-checked date only when `label-versions.json` has that setid. Missing file row: "No label version date is on file."

FDA Table 1 transcription (`src/lib/drugs/reference/fda-ddi-table.ts`) says content current as of 05/29/2026, retrieved 2026-09-26. P-gp rows have `fdaClass: null` because "FDA grades transporter roles without a potency class."

---

## 3. Gaps

### 3.1 P-gp grades without an FDA potency word

FDA Table 1 stores no P-gp potency class. `pkSeverity()` does not have a transporter branch. A catalog `strong | moderate | weak` on P-gp is scored like a CYP grade.

The enzyme page says so: `ENZYME_STRENGTH_NOTE_TRANSPORTER` in `src/lib/seo/pair-copy.ts` is "Strong, moderate and weak are the desk's own grades for P-gp." The pair clinical sentence does not say "desk grade". It says the drug "is a strong P-gp inhibitor" (or moderate, or weak) whenever that role wins.

Examples stored as strong P-gp inhibitors or inducers in `src/lib/drugs/catalog.ts`: ketoconazole, itraconazole, rifampin, ritonavir, Paxlovid, cobicistat, quinidine. Rolapitant is stored `i:P-gp:moderate` in `src/lib/drugs/catalog-clinic.ts` while FDA Table 1 has `fdaClass: null` for that P-gp row (`fda-ddi-table.ts`).

`src/lib/drugs/pgp-fda-roles.test.ts` states the policy for a later addition: "FDA does not grade P-gp strength." Grades were filled from the catalog's CYP bins "using digoxin or dabigatran label AUC changes." Strong was not used for those additions. The test requires P-gp inhibitor roles for capmatinib (weak), pirtobrutinib (weak), tucatinib (weak), lapatinib (moderate), propafenone (moderate), lopinavir (moderate), and sofosbuvir/velpatasvir/voxilaprevir (moderate). Adefovir and oseltamivir stay ungraded on a skip list. Belumosudil, danicopan, fostamatinib, and saquinavir-and-ritonavir are listed as not in the catalog.

The sign-off packet's open question 3 still says those FDA-listed inhibitors "have no P-gp inhibitor role here because a grade would have to be invented," and it counts 8 strong, 23 moderate, 8 weak. That sentence does not match `pgp-fda-roles.test.ts` on current main. The packet's P-gp census should not be reused until the packet is regenerated. This phase does not regenerate it.

Zoliflodacin is a separate P-gp substrate grade. See B-P1-1.

### 3.2 Grades the label does not name

Some rows are explicit about staying ungraded when the label names a perpetrator and no strength word (`src/lib/drugs/catalog-ungraded-perps.test.ts`): fedratinib's CYP3A4, CYP2C19, and CYP2D6 inhibitor sentences; mavacamten's inducer sentences. Xolremdi and Alyftrek follow that pattern for perpetrator roles and break it for the victim grade. See B-P1-2.

Other catalog grades disagree with FDA Table 1. `docs/validation/fda-disagreement-audit.md` (proposals only, retrieved 2026-10-19, source commit cited as ce78b44) lists 43 disagreements: 37 strength mismatches, 6 roles FDA lists that the catalog lacked, no direction mismatches. Proposals: 20 upgrade, 6 downgrade, 6 keep, 11 needs-review. The file says no grade was changed. Several "keep" rows are catalog `sensitive` where FDA says moderate-sensitive, justified in the doc as narrow-index or label risk (clozapine, colchicine, phenytoin, pimozide, theophylline, warfarin). That is a recorded choice to over-call relative to Table 1, not a label contraindication.

Footnotes 4, 12, 15, and 16 in the FDA transcription are stored as paraphrase placeholders, not FDA wording. The disagreement audit says so.

### 3.3 Misleading certainty

- Sign-off section 2 attributes pin-lifted Avoid together rows to `pkSeverity()` (B-P0-1).
- On-screen hint says Avoid together is not pharmacokinetic math; one phenotype branch still sets it (B-P0-2).
- Every `geno` finding, including phenoconversion, gets a CPIC citation the phenoconversion module disclaims (B-P0-3).
- A drug-level PMID can be the visible "source" for a rule the paper does not test (B-P1-4).
- Class PD rules that extend a label still display as label-backed via `BOXED` paraphrases (GHB, MAOI stimulants). The paraphrase does admit the extension. The tier is still Avoid together for the extended partners (B-P1-5).
- Static CPIC cards in `src/lib/drugs/pgx.ts` use imperative actions ("Start at 50% of the usual dose", "Avoid"). Pearls say "This is not a dosing protocol" on some cards and not on others. They are paraphrases with a guideline URL, not a quoted CPIC table version, and they are not what `pkSeverity()` runs. Live lookup (`src/lib/drugs/cpic.server.ts`) says a hit is a guideline to read, not a dose. See B-P2-2.

### 3.4 CPIC / PGx coverage

Present, and narrow.

- Static cards: 53 catalog ids in `PGX` (`src/lib/drugs/pgx.ts`), levels A/B/C, genes including CYP2C19, CYP2D6, CYP2C9, SLCO1B1, TPMT/NUDT15, HLA, CYP2B6. Header: "Paraphrases of published guidelines — open the source for the table."
- Phenotype engine: four genes, inhibitor/inducer analogy, not the card's action text.
- Phenoconversion: six enzymes, fixed shift table, not the cards.
- Live CPIC: user-initiated lookup at `api.cpicpgx.org`, 30-minute cache, failure returns "CPIC did not answer" or "CPIC has no guideline row for this name." It does not change a grade.
- `basisFor()` CPIC row is the guidelines index, not the drug's guideline URL from `pgx.ts`.

No code path was found that applies a CPIC recommendation as an interaction severity. The risk is display: a phenotype or phenoconversion row can look CPIC-backed when the tier came from `pkSeverity()` or the shift table.

---

## 4. Clinical debt already visible

No clinician has signed the engine. `docs/clinical-review/signoff-packet.md` header: "Status: no clinician has reviewed this content yet." The reviewer table is empty. The packet says it scanned 1,888 catalog entries with no host context, so phenotype, pregnancy, renal, and dose rules are not in the counts.

### 4.1 Unsigned high rules

Section 1 of the packet lists class rules at Avoid together or Serious concern whose cited source is "Curated map only", or a drug-level PMID "not rule-specific". Examples the packet itself flags that way include statin × fibrate (the contraindicated gemfibrozil rows), TMP-SMX × methotrexate at Avoid together, speedball, hemostasis, alpha-2 × opioid, nodal depression, hyperkalemia, chelation. Those are not new findings; they are unsigned.

### 4.2 Nineteen unsourced Avoid together grades

`docs/grade-provenance-audit.md` lists 19. `docs/validation/unsourced-avoid-candidates.md` (DailyMed check 2026-10-19) pinned two earlier rows (Parnate Table 1 with tryptophan / hydroxytryptophan; Marplan with tyramine foods) and left the rest unpinned. `docs/validation/unsourced-avoid-proposals.md` suggests, without applying:

| Suggested action | Pairs |
| --- | ---: |
| Keep (no US label) | 4 (harmaline and moclobemide, with 5-HTP and with tyramine foods) |
| Cite outside Contraindications, do not pin | 7 |
| Downgrade candidate | 8 |

The proposals file says a downgrade is a severity change and is Kaleb's call. This phase does not choose.

### 4.3 Rolapitant — draft #209, leave it alone

`docs/validation/unsourced-avoid-candidates.md` and gold-set exclusions:

- Varubi section 4 (setid `8670c3cf-82d9-466d-be49-de33d8c8742b`, retrieved 2026-10-19): "VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index, such as thioridazine and pimozide."
- Rolapitant + thioridazine card on that review: Serious concern.
- Rolapitant + pimozide card: Use care.
- Not pinned, because a pin would raise the tier. That matches the standing rule.

Draft PR **#209** (`cursor/rolapitant-pin-proposal-f683`) is a proposal document only. Its body says catalog strengths and pins are unchanged and that merge needs an explicit yes. Do not edit #209 in the phase that implements this list unless the human yes is the task.

Separate from the pin: the catalog row is `i:CYP2D6:moderate;i:P-gp:moderate`. FDA Table 1 calls rolapitant a moderate CYP2D6 inhibitor and a P-gp inhibitor with no potency class (footnote 17 is about intravenous rolapitant and BCRP/P-gp). The moderate P-gp grade is a desk bin.

### 4.4 Zoliflodacin P-gp — draft #213, leave it alone

On main, `src/lib/drugs/catalog-modern-wave3.ts` stores zoliflodacin (Nuzolvence) as CYP3A4 substrate `major` and P-gp substrate `minor`. The note says label 12.3 attributes 68% of clearance to CYP3A4, and "Also a P-gp/BCRP substrate". The test locks the CYP3A4 major row and does not mention the P-gp grade.

Draft PR **#213** (`cursor/desk-qa-wave3-labels-57ad`) says the P-gp minor grade should be removed because the label gives no potency word, and that the grade changes strong P-gp inducer findings. It says the removal needs Kaleb's approval. The CYP3A4 major grade is described there as unchanged. This phase does not remove the role and does not edit #213.

The CYP3A4 `major` tier is also not an FDA Table 1 word. It is the desk's reading of a clearance fraction and a labeled inducer contraindication. Whether `major` is the right bin is a human decision, not a fact this document settles. Do not invent a fold-change class for it.

### 4.5 Xolremdi and Alyftrek — grades already on main, human yes still open

Both rows are in `catalog-modern-wave3.ts`. Tests lock the current shape. Nothing in the sign-off packet records a clinician yes.

**Mavorixafor (Xolremdi).** Enzymes on the row: CYP3A4 substrate `major` only. The note quotes section 7.2: "Mavorixafor is a CYP2D6 inhibitor", "Mavorixafor is an inhibitor of CYP3A4", "Mavorixafor is an inhibitor of P-gp", and "Mavorixafor is a P-gp substrate", and says none of those sentences names a strength, so they stay ungraded and are not scored. The note also quotes section 12.3 dextromethorphan, midazolam, and digoxin concentration changes and still does not assign a perpetrator grade. Section 4 is quoted: "Use of XOLREMDI is contraindicated with drugs that are highly dependent on CYP2D6 for clearance." That class contraindication has no named partner and no pin, and the inhibitor is unscored, so the desk does not show it as a pair tier.

The CYP3A4 `major` victim grade is justified in the note and the test as "strong CYP3A4 inhibitor dosage reduction and strong-inducer avoid", not as a label word "major" or "sensitive".

**Vanzacaftor–tezacaftor–deutivacaftor (Alyftrek).** Enzymes match Trikafta: CYP3A4 substrate `major` only. The note quotes section 4 "None", section 7.1 substrates of CYP3A with inducers "not recommended" and a dosage reduction for strong or moderate inhibitors, and section 7.2 "Tezacaftor and deutivacaftor (components of ALYFTREK) are P-gp inhibitors" with "No strength word." In-vitro CYP2C9 and BCRP sentences are quoted and left ungraded. The test says "no extra perpetrator grade".

Human yes still required before any later phase adds a perpetrator strength, pins the Xolremdi section 4 class, or changes the CYP3A4 victim bin. This document does not propose which strength those sentences would be.

### 4.6 Sign-off legend versus the engine

`scripts/signoff-packet.ts` still emits this section 2 legend:

> Inhibitors: strong × sensitive/NTI → contraindicated; strong × major → major; moderate × sensitive/NTI → major. Inducers (clearance): strong × sensitive/NTI → contraindicated; strong × any → major; moderate × sensitive/NTI/major → major.

`pkSeverity()` does not return `contraindicated` on those branches. The same script's open question 1 says the opposite: escalation to contraindicated is label-only, and on that scan 282 PK findings (0 of them P-gp) read contraindicated. Section 2 rows 78–87 are those pin-lifted findings, but `pkTrigger()` always writes "Severity comes from pkSeverity() in engine.ts, not from a label lookup." A reviewer using the table would approve the wrong rule. The washout trigger text says "Major in that case, moderate otherwise" even when a pd pin has lifted the card to Avoid together (packet row 99).

---

## 5. Prioritized findings

Complexity is the size of a later change, not a schedule. Acceptance criteria are for that later change. This phase ships none of them.

### P0 — misleading certainty a reviewer could sign

#### B-P0-1. Sign-off packet section 2 describes a `pkSeverity()` that main does not run

- **Impact.** The unsigned clinical packet attributes Avoid together CYP rows to enzyme math. Open question 1 in the same file contradicts the legend and the trigger column. Signing section 2 as written would approve a rule the code removed in Ship 1.51, and would hide that those 282 findings are pins.
- **Complexity.** Small, if the fix is the generator text and a regenerated packet. The regeneration scans the whole catalog; it must not be hand-edited. No grade change.
- **Modules.** `scripts/signoff-packet.ts`, `docs/clinical-review/signoff-packet.md`. Read-only consumers: anyone using the packet as the review checklist.
- **Acceptance.** Regenerated section 2 legend matches `pkSeverity()` (no contraindicated branch). Rows that are Avoid together only because of `label-contraindicated` say that, and do not say "not from a label lookup". Washout rows lifted by `holdWashoutLabelPins()` say so. Open question 1's counts are recomputed, not copied. Diff contains no change under `src/lib/drugs/catalog*.ts`, `label-contraindications.ts`, or `pkSeverity()`.

#### B-P0-2. "Avoid together is not pharmacokinetic math" is false for one phenotype branch

- **Impact.** `SEVERITY_HINT.contraindicated` says Avoid together is kept for a named label pin, not for pharmacokinetic math. `phenotypeFindings()` sets `contraindicated` for an ultrarapid metabolizer plus an activation-pathway substrate that is sensitive or narrow-index, with no label pin. Poor and intermediate phenotypes are capped back to `major` if the analogy would have been contraindicated. Ultrarapid activation is not. A learner can read a genotype sketch as a labeled contraindication. Codeine is the comment's example; the branch is every activation substrate on the four phenotype enzymes, not a codeine-only pin.
- **Complexity.** Small in the phenotype function, once a human picks the tier. Product copy in `SEVERITY_HINT` must match the code. Do not change `pkSeverity()` in the same change unless the human asks.
- **Modules.** `src/lib/drugs/engine.ts` (`phenotypeFindings`), `src/lib/drugs/types.ts` (`SEVERITY_HINT`).
- **Acceptance.** A written decision: either ultrarapid activation stops at `major` like the poor-metabolizer cap, or the hint states that this one genotype sketch can read Avoid together and names it as inference. The decision is recorded in the PR. No catalog grade edits. A test locks the chosen tier for one activation substrate under ultrarapid CYP2D6 and shows the poor-metabolizer cap still cannot emit `contraindicated`.

#### B-P0-3. Phenoconversion and other `geno` rows are badged as CPIC

- **Impact.** `pheno-convert.ts` says the map is not a CPIC table. `basisFor()` still appends "CPIC / ClinPGx" and "Phenotype rows paraphrase published CPIC tables" for every `kind: "geno"` finding, with the guidelines index URL. `gradeBases()` treats that as a cited source, so the row does not fall through to "Basis: catalog rule". Phenotype analogies get the same badge. A reader cannot tell label-established CPIC content from the desk's shift table.
- **Complexity.** Small. Display and `basisFor()` only.
- **Modules.** `src/lib/drugs/basis.ts`, `src/lib/drugs/grade-provenance.ts`, `src/lib/drugs/pheno-convert.ts`.
- **Acceptance.** A phenoconversion finding's lead basis does not say it paraphrases a CPIC table. It says the shift is the desk's teaching map. A phenotype finding may link a specific guideline only when `pgx.ts` has a card for that drug and gene; otherwise it says the tier is the inhibitor/inducer analogy. The generic index URL is not used as if it were the pair's source. No severity change. Tests cover one shifted CYP2D6 row and one drug with no `PGX` card.

### P1 — grades and pins that need a human yes before code changes

#### B-P1-1. P-gp potency bins are desk grades, and one substrate bin is already challenged

- **Impact.** FDA Table 1 has no P-gp potency word. The engine scores catalog bins anyway. Pair text states them as the drug's grade. Strong bins exist on older rows (ketoconazole, itraconazole, rifampin, ritonavir, Paxlovid, cobicistat, quinidine). Newer FDA-listed inhibitors were filled as weak or moderate in `pgp-fda-roles.test.ts` using digoxin or dabigatran AUC language stored in that test, not in FDA's class column. Zoliflodacin's P-gp `minor` substrate is the case #213 already asks a human to remove. The sign-off packet's "no role because a grade would have to be invented" list is stale against that test.
- **Complexity.** Medium. A cap or a wording change touches every P-gp finding. Removing one substrate grade is small but is already drafted in #213.
- **Modules.** `src/lib/drugs/engine.ts` (`pkSeverity`, `pkFindings`), `src/lib/drugs/catalog.ts`, `src/lib/drugs/catalog-clinic.ts`, `src/lib/drugs/catalog-modern-wave3.ts`, `src/lib/drugs/pgp-fda-roles.test.ts`, `src/lib/seo/pair-copy.ts`, sign-off generator. Do not edit PR #213's branch from a drive-by.
- **Acceptance.** A human decides one of: leave bins and make every P-gp clinical sentence say "desk grade", or stop using potency in `pkSeverity()` for P-gp. Separately, the human decides the zoliflodacin P-gp `minor` role (#213). This task does not pick the strength. After the decision, `pgp-fda-roles.test.ts` and the pair sentence agree, and the sign-off packet is regenerated so open question 3 matches the catalog. No CYP grade edits in the same change.

#### B-P1-2. Xolremdi and Alyftrek victim grades are inferences; perpetrator roles are ungraded; section 4 is invisible

- **Impact.** Both drugs are on main with CYP3A4 `major` because the label tells the reader to change or avoid a dose with CYP3A perpetrators, not because the label says "major". Perpetrator sentences without a strength word are ungraded, which is the catalog's stated rule. Xolremdi section 4 contraindicates drugs highly dependent on CYP2D6 and will not show as a pair until someone names partners or assigns a strength. Assigning a strength from the stored concentration quotes would be a new grade. This document does not do that.
- **Complexity.** Small once the human answers. Large if the answer is "pin the class", because that needs named partners and violates the standing rule unless the human writes an exception.
- **Modules.** `src/lib/drugs/catalog-modern-wave3.ts`, `catalog-modern-wave3.test.ts`. Pins only if the human names partners.
- **Acceptance.** A recorded yes or no on (1) keeping CYP3A4 `major` for each product, (2) leaving CYP2D6, CYP3A4, and P-gp perpetrator roles ungraded, (3) whether Xolremdi section 4 gets any pin. If the answer is no new pin and no new strength, tests stay as they are and the sign-off packet gains a line that says the victim tier is a labeled-action inference. No strength is typed in this phase.

#### B-P1-3. Rolapitant pin is blocked by the standing rule; the label names the partners

- **Impact.** Varubi section 4 names thioridazine and pimozide. The cards do not already read Avoid together, so the standing rule forbids the pin. The pairs stay Serious concern and Use care. That is label text the desk will not surface as Avoid together until a human overrides the rule. Draft #209 already asks. Do not merge it from this list.
- **Complexity.** Small if the human says yes: a pin, not a new CYP grade. The moderate P-gp catalog grade is a separate question (B-P1-1).
- **Modules.** `label-contraindications.ts`, gold set, and the proposal doc on #209. Catalog row only if the P-gp bin is in scope.
- **Acceptance.** Human yes or no, written on #209 or a successor. If yes, the pin quotes the current Varubi section 4 sentence, `basis` is `named`, and `pkSeverity()` is unchanged. If no, the cards stay below Avoid together and the exclusion note stays in the gold-set file. This phase does neither.

#### B-P1-4. Drug-level PubMed and class paraphrases count as "cited"

- **Impact.** `citesFor()` then `basisFor()` attach the first curated cite. Pair-specific cites are preferred; otherwise any paper that lists one of the drugs. The sign-off packet already labels many of those "not rule-specific". `gradeBases()` still shows them as a source, so the grade-provenance audit does not call the row rule-only. Serious concern is 20.5% rule-only on that audit; the other 79.5% are not all pair-level evidence.
- **Complexity.** Medium. Needs a definition of "about this pair" before the UI changes, or rule-only counts will move for the wrong reason.
- **Modules.** `src/lib/drugs/pubmed.ts`, `src/lib/drugs/basis.ts`, `src/lib/drugs/grade-provenance.ts`, `scripts/grade-provenance-audit.ts`.
- **Acceptance.** A finding whose only literature row is a drug-level cite still shows the cite, and also shows that it is not a pair study. The audit's rule-only count gains a third bucket: pair-cited, drug-cited, catalog-rule. No grade moves because a cite was reclassified.

#### B-P1-5. Class extensions already labeled as extensions, still at Avoid together

- **Impact.** GHB × any CNS depressant and MAOI × any stimulant, including drugs the basis text calls unlabeled extensions, are `contraindicated`. The packet's open question 2 asks whether the non-hypnotic oxybate pairs belong at Serious concern. Nineteen other Avoid together rows have no citation at all (section 4.2); eight of those are downgrade candidates in the proposals doc, including pairs whose label says no tyramine effect or says monitor.
- **Complexity.** Medium per rule, because each downgrade is a severity change and needs the human row by row. The proposals doc already did the label search.
- **Modules.** `engine.ts` PD rules, `basis.ts` `BOXED` entries, `docs/validation/unsourced-avoid-proposals.md`. Pins only where the proposals file says the pin bar is already failed.
- **Acceptance.** For each of the 19, and for the GHB split, the PR records keep, cite-without-pin, or downgrade. Downgrades change only those pairs' rule output. No new pin unless the partner is named in Contraindications with contraindicated wording. Harmaline and moclobemide stay without a fabricated US label.

#### B-P1-6. Sixteen class pins predate the named-partner rule

- **Impact.** `basis: "class"` still lifts Avoid together for partners the quote does not name (examples in section 2.2). That can be a fair reading of a class contraindication. It is not the standing rule. A reviewer can think every Avoid together pin is a named partner.
- **Complexity.** Small to label them in the packet and the why-this-grade line. Large to unpin them.
- **Modules.** `label-contraindications.ts`, `basis.ts` `labelPinBasis()`, sign-off generator.
- **Acceptance.** Human decides the 16 stay or go, as a list, not as a new class expansion. If they stay, the basis sentence says the label names the class and does not name this partner. If any go, the pair's tier falls back to `pkSeverity()` or the PD rule and the gold-set floor is updated in the same change. No new class pins.

#### B-P1-7. FDA Table 1 disagreements are still proposals

- **Impact.** Forty-three catalog-versus-Table-1 rows in `docs/validation/fda-disagreement-audit.md` would move many cards through `pkSeverity()` if applied. The audit says each upgrade or downgrade should be run through `scripts/severity-whatif.ts` first, and that the DailyMed section 7 check for upgrades was not done. "Keep" rows intentionally differ from FDA's moderate-sensitive class.
- **Complexity.** High if all 43 move. Low if the task is only to attach the what-if output to each row for the human.
- **Modules.** Catalog role rows named in that doc, `src/lib/drugs/reference/fda-ddi-table.ts`, `scripts/severity-whatif.ts`.
- **Acceptance.** No grade changes until each row has a human mark. A later PR that does change a grade includes the what-if pair count and a DailyMed section 7 quote or an explicit "no sentence found". Footnote placeholders are not quoted as FDA wording.

### P2 — coverage and inference that should be visible, not silently "fixed"

#### B-P2-1. Phenoconversion is a fixed sketch

- **Impact.** Strong inhibitor becomes poor-like except when the genotype is already poor or ultrarapid. Moderate inhibitor steps one bin. Inducers become "induced" except in poor metabolizers. Weak perpetrators do not count. CYP1A2 and CYP3A4 genotypes are hardcoded normal. Findings are `major` or `moderate` with no label pin. Teaching value is real; presenting it as the patient's enzyme is not.
- **Complexity.** Medium if the copy changes. High if the shift table changes, and that would be a new clinical rule this phase must not invent.
- **Modules.** `pheno-convert.ts`, check board verb "rewrites the pathway for", `basis.ts` after B-P0-3.
- **Acceptance.** The card says "teaching sketch" and names the rule that fired (strong inhibitor, moderate inhibitor, or inducer). It does not say the lab genotype changed. Shift table unchanged unless a later human task says otherwise.

#### B-P2-2. Static PGx cards can read as orders

- **Impact.** 53 drugs have paraphrased action lines, some with a fraction of a usual dose, some saying Avoid. They are not the interaction engine. They can still be read as the desk's dose. Live CPIC lookup is separate and does not grade.
- **Complexity.** Small for a banner. Medium if each action line must be re-checked against the current guideline URL. Do not invent a dose while doing that.
- **Modules.** `src/lib/drugs/pgx.ts`, `src/components/desk/pharmacogenomics.tsx`, `src/components/desk/dossier.tsx`.
- **Acceptance.** Every card states it is a paraphrase and not a dose. Action lines that state a fraction stay only if the PR cites the guideline section already linked, without adding a new number. Drugs with no card do not gain one in this task.

#### B-P2-3. Strong inducer × any clearance substrate is Serious concern

- **Impact.** `pkSeverity()` returns `major` for every strong inducer on a clearance substrate, including `minor`. The packet's row 94 is that branch (strong inducer × minor), with enzyme counts from its scan. That is inference. Many of those pairs will not have a label sentence.
- **Complexity.** High. Changing it moves a large set of cards. Out of scope until a human asks for a what-if.
- **Modules.** `pkSeverity()`, sign-off packet section 2 after B-P0-1.
- **Acceptance.** Not implemented in the P0/P1 pass. If a later task opens it, `severity-whatif.ts` is the preview, and the legend matches the code before anyone signs the packet.

#### B-P2-4. Gold-set pass rate is floor agreement

- **Impact.** 514 / 514 and 479 / 479 mean the engine meets the floor the gold set stored, including floors held up by pins. They do not mean every Avoid together in the catalog was reviewed, and they do not cover the 19 unsourced rows or the FDA Table 1 mismatches.
- **Complexity.** Small to say this on the gold-set report header. No test change required for the truth of the current counts.
- **Modules.** `scripts/gold-set-report.ts`, `docs/validation/label-gold-set.md`.
- **Acceptance.** The generated summary says the pass is "engine at or above the stored floor", and points at the unsourced list and the FDA disagreement list as out of scope for that score.

### P3 — bookkeeping that will confuse the next review

#### B-P3-1. Sign-off scan omits host, phenotype, and dose rules

- **Impact.** The packet's pair counts are pairwise `analyze([a, b])` with no host. Phenotype Avoid together (B-P0-2), phenoconversion, pregnancy, renal, and dose caps are invisible to the signature table.
- **Complexity.** High to scan phenotypes. A note in the packet is small and is partly there already ("Host-, phenotype-, and dose-driven rules are therefore not counted here").
- **Modules.** `scripts/signoff-packet.ts`.
- **Acceptance.** The purpose section stays accurate. If a phenotype section is added, it is a separate generated table and does not reuse section 2's legend.

#### B-P3-2. Catalog notes carry study numbers the finding basis does not

- **Impact.** Example: the ritonavir note in `catalog.ts` cites a clearance change and names papers in prose. That number is not a `basisFor()` row and is not re-derived here. A reader of the note and a reader of the pair card are not looking at the same evidence object.
- **Complexity.** Medium to attach an existing note's citation as a labeled "catalog note, not a pair study" row. Do not add new numbers.
- **Modules.** Catalog `note` fields, `basis.ts`.
- **Acceptance.** No new numeric claim. If a note is shown beside a grade, it is marked as a catalog note.

#### B-P3-3. Competition and weak-perpetrator rows are easy to over-read

- **Impact.** Shared-substrate competition is `moderate` or `minor` with the sentence "usually modest". Weak inhibitor × sensitive substrate is `moderate`. Neither is a label contraindication. They are easy to stack under a louder pin on the same pair and disappear, or to read as a measured interaction when no pin exists.
- **Complexity.** Small copy change.
- **Modules.** `pkFindings()` clinical string.
- **Acceptance.** The competition sentence keeps "usually modest" and says the row is overlap, not a perpetrator study. No severity change.

---

## 6. Suggested task order

Do not start these in this pull request.

1. B-P0-1, B-P0-2, B-P0-3. Copy and attribution only, plus the one phenotype decision. No catalog grades.
2. Human pass on B-P1-2, B-P1-3, B-P1-5, and the zoliflodacin line inside B-P1-1. #209 and #213 stay the vehicles for Rolapitant and zoliflodacin unless the human asks for a new PR.
3. B-P1-1 wording or P-gp cap, only after that yes.
4. B-P1-4, B-P1-6, B-P1-7 as review mechanics.
5. P2 and P3 when the signature packet is worth signing.

## 7. What this phase did not do

- Did not change `pkSeverity()`, pins, catalog roles, or production strings.
- Did not merge or push to #209 or #213.
- Did not re-fetch DailyMed or FDA pages, and did not recompute the sign-off pair census.
- Did not decide any downgrade, upgrade, or new strength.
- Did not treat gold-set agreement as clinical sign-off.
