# Citation audit

Checked 2026-11-05 and 2026-11-06 against NCBI E-utilities (`esummary`, `efetch`, and PMC full text where noted). No grade, pin, severity, catalog strength or engine rule was changed.

## Scope

Every PMID under `src/`: the curated shelf (`src/lib/drugs/pubmed.ts`, `pubmed-wave2.ts`) and PMIDs written into clinical copy and citation tables (`basis.ts`, `safety.ts`, `wards.ts`, `catalog.ts`, `glycemic-kinetics.ts`, `status-epilepticus.ts`, `learn/glossary.ts`). Test fixtures were excluded.

Each `why` and `relevance` line was read against the paper's title and abstract, not its full text.

## Counts

| | Before | After |
|---|---|---|
| Unique PMIDs | 167 | 166 |
| Curated rows | 133 | 131 |
| PMIDs written inline | 47 | 47 |
| PMIDs that NCBI could not find | 1 | 0 |
| PMIDs pointing at the wrong paper or a notice | 27 | 0 |
| Retracted, or under an expression of concern | 0 | 0 |

28 of 167 PMIDs (17%) did not lead to the paper they were cited for. 12 papers have no abstract on PubMed, so they were judged on title, authors and journal only: 4763428, 8305063, 10393149, 11476118, 14999113, 15784664, 15917386, 19512959, 19564476, 23184849, 23422873, 32511106.

These cited papers carry a published erratum, which is not a retraction: 8305063, 10683007, 15784664 (two), 21270794, 28910830, 32511106.

## What was fixed

### PMID led to the wrong paper

Each replacement was found by title and author search, then read.

| Old PMID | What it actually was | Cited paper | New PMID |
|---|---|---|---|
| 12496741 | Evolutionary psychology review | Dresser 2002, fruit juices and fexofenadine | 11823753 |
| 16044105 | Psychotropic metabolic ratios | Lilja 2005, orange juice and atenolol (journal also wrong) | 15983823 |
| 24193112 | Metoprolol CYP2D6 in MERIT-HF | Misaka 2014, green tea and nadolol | 24419562 |
| 18578612 | Sunitinib in thyroid cells | Benvenga 2008, coffee and levothyroxine | 18341376 |
| 6808025 | Endocarditis immune complexes | Bauer 1982, tube feeds and phenytoin | 6803191 |
| 3498445 | UVB and HLA-DR antigens | Juncos 1987, diet and levodopa | 3632369 |
| 22797808 | Photoacoustic endoscopy | Shah 2015, phenoconversion (year also wrong) | 24913012 |
| 32721035 | Vitamin D and TRPV1 | Cicali 2021, phenoconversion tutorial (title and year also wrong) | 34231197 |
| 36067166 | Bean bug circadian clock | Dowell 2022, CDC opioid guideline | 36327391 |
| 21926492 | Decannulation editorial | Owen 2009, CYP2D6 summary (title, journal and year also wrong) | 19512959 |
| 36449473 | Abortion incidence in Burkina Faso | Suarez 2022, buprenorphine vs methadone in pregnancy | 36449419 |
| 8093639 | CD4 counts letter | Alvir 1993, clozapine agranulocytosis | 8515788 |
| 12844322 | Layered tungstic acid chemistry | Niemi 2003, rifampicin; merged into the existing row | 12882588 |
| 17381386 | Cinnamon in diabetes | Spriet 2007, valproate and meropenem | 17609232 |
| 29126268 | Antibiotic duration in pneumonia | Luther 2018, vancomycin plus pip-tazo (journal also wrong) | 29088001 |
| 11248154 | ABO-incompatible heart transplant | Catella-Lawson 2001, ibuprofen and aspirin | 11752357 |
| 29390205 | Erratum notice for the guideline | Hiemke 2018, AGNP TDM guideline | 28910830 |
| 2189332 | Captopril in neonates | Groenendal 1990, methotrexate and TMP-SMX | 2225539 |
| 23297394 | Weight-loss history | Bailey 2013, grapefruit interactions | 23184849 |
| 4742240 | Pediatric injury care | Katz 1973, hyperglycemia and sodium (title also wrong) | 4763428 |
| 8357112 | Delirium prediction model | Boyle 1993, octreotide (journal also wrong) | 8445035 |
| 11420190 | Not found at NCBI | Edge 2006, UK case-control study of cerebral oedema (title, year and journal also wrong) | 16847700 |
| 18090370 | Piglet lung injury | Koenig 2008, hypertonic saline (title and journal also wrong) | 18272864 |
| 18448646 | ApoE4 transgenic mice | Goodkin 2008, GABA-A trafficking (volume and pages also wrong) | 18322097 |
| 27203362 | Newborn skin impedance | Klein-Schwartz 2016, sulfonylurea overdose (title and journal also wrong) | 26551662 |
| 31774953 | "Roadside Assistance" case | Kapur 2019, ESETT | 31774955 |
| 32439898 | GBE1 in lung adenocarcinoma | Dhatariya 2020, DKA primer (an author also wrong) | 32409703 |
| 38078575 | ADA Standards, technology chapter | ADA Standards 2024, hospital chapter | 38078585 |

### Metadata only, PMID right

- Titles matched to NCBI: 9834039, 18206732, 32189324, 15592331, 15319342, 15900287, 31885095.
- Journal: 7870932 and 2813665 are `Psychopharmacology (Berl)`.
- Year: 35840540 is 2023 in print (2022 online).
- Hillier 1999 (10225241): title and third author.

### Sentence or tag the abstract contradicts

| PMID | Was | Now |
|---|---|---|
| 9737361 | Psyllium with levothyroxine "is an empty TSH" | The study found no detectable malabsorption |
| 38707050 | Xylazine sedation "does not budge" with naloxone | The case report says it improved after naloxone; the row now says so and points to the class review |
| 13129991 | "Midazolam probe", tagged midazolam | The probe was alprazolam; tag corrected |
| 10683007 | Tagged ritonavir | The paper studied indinavir; tag corrected |
| 10546917 | Tagged `cyp` while saying "not a CYP story" | Tag removed; the abstract points to P-gp |
| 15355126 | "Gut 3A4 first-pass", "ritonavir" | Metabolism is primarily hepatic; ketoconazole and grapefruit are what it names |
| 8521679 | Lists ARBs | The abstract lists thiazides, NSAIDs and ACE inhibitors |
| 12882588 | Lists apixaban, tacrolimus and OCPs | A 2003 review; now the drugs its abstract names |
| 41668237 | Bradycardia "on arrival" | Within 24 hours; higher bag-mask use added |
| 26253303 | "Fontaine", who is not an author | Renet, with what the two cases showed |
| 36327391 | "Methadone is banded" | The guideline's table has a single factor (see review item 1) |
| 8515788 | "Why ANC, not WBC" | The registry finding: timing, age and sex |
| 34231197 | Tagged dextromethorphan | Not in the full text (PMC8404400); tag removed. The bupropion sentence is in the full text |
| 10225241 | "Refined 2.0" factor | The paper reports 2.4 overall, 4.0 above 400 mg/dL (see review item 2) |
| 8445035, 26551662, 16847700, 18322097, 18272864 | Claims that were not in the abstract | Rewritten to what the abstract reports |
| 15983823, 18341376, 6803191, 3632369, 17609232 | Mechanism or advice beyond the abstract | Rewritten to what the abstract reports |

### Duplicate rows

12230351 appeared twice, which also collided as a React list key. 12844322 (once corrected) duplicated 12882588. Each paper now has one row.

## Needs human review

Nothing below was changed. Items 1 to 5 are the ones with clinical weight.

1. **Methadone MME factor.** `src/lib/drugs/mme.ts` bands methadone by dose, heads the file "2022 guideline" and labels the row "CDC bands". The CDC 2022 table (PMID 36327391, PMC9639433) gives one factor, 4.7. The desk's computed MME and the label disagree with the source it names.
2. **Hillier factor.** `glycemic-kinetics.ts` and `glycemic-station.tsx` compute and label "Hillier (2.0)". The paper reports 2.4 overall and 4.0 above 400 mg/dL, and `bedside.ts` already uses 2.4. The two desk surfaces give different corrected sodium values.
3. **Psyllium and levothyroxine.** The only paper cited for this pair (9737361) found no detectable malabsorption. The grade stands on something else or needs a new source.
4. **Xylazine and naloxone.** 38707050 is a single case report that runs against the class position. Decide whether it stays on the shelf.
5. **Protein meal and levodopa.** 3632369 found the effect with protein above the RDA and none at RDA intake.
6. **Tags that name a drug the paper did not study** (class or analogy links, some stated in the `why`):
   - 18378520 ONTARGET: pair lisinopril + losartan; the trial used ramipril and telmisartan.
   - 26253303: pair Epclusa + amiodarone; the cases were sofosbuvir and daclatasvir.
   - 31006110: efavirenz guideline tagged ketamine, methadone.
   - 9585793: lovastatin paper tagged red yeast rice.
   - 12496749: cerivastatin paper tagged pioglitazone.
   - 10485779, 19238656, 17109310: ritonavir papers tagged Paxlovid; 17109310 also cobicistat.
   - 12925718: Hunter criteria tagged MDMA, tramadol, sertraline, phenelzine.
   - 25974703: CPIC SSRI guideline tagged fluoxetine; its abstract lists five SSRIs without fluoxetine, and PMC returned no full text to check.
7. **Sentences that go beyond the abstract** (not shown wrong; these need the full text or an editor):
   - 1671113: "Intestinal 3A4, not hepatic"; the 1991 abstract names neither.
   - 11145498: "a long QTc" and the `qt` tag; the abstract lists sedation, confusion and respiratory depression.
   - 9663180: "QT stack" and the `qt` tag; the abstract is pharmacokinetic.
   - 17109310: "~50%"; the abstract gives no figure.
   - 2813665: "induces 1A2", "rebound"; the abstract reports lower levels in smokers.
   - 15319342: "2D6 then COMT"; the paper is a stereochemical analysis.
   - 12065445: oral first-pass and IV claims; the paper uses liver microsomes.
   - 1524964: rash and SJS; the abstract covers clearance.
   - 8305063: "LiverTox A list" cited to a 1993 review.
   - 28910830: "Clozapine 350 ng/mL"; the abstract has no value.
   - 40257097: "replacing xylazine"; not in the abstract.
   - ESETT (31774955) relevance line: "non-inferiority"; the trial looked for the most and least effective drug.

## Not verified

- Free-text citations with no PMID, such as `ANTICOAGULATION_LITERATURE_CITATIONS` and the MOUD, vasoactive, pediatric and opioid-rotation lists. They were out of scope. Given 17% of PMIDs were wrong here, they deserve the same audit.
- Non-PMID fields in the tables (DOIs) were checked only on rows this audit changed.
- Full text, except where PMC is named above.

## Keeping it honest

- `npx --no-install tsx scripts/verify-pmids.ts` re-fetches every PMID and reports. `--write` refreshes `src/lib/drugs/reference/pmid-snapshot.json`. Only this script uses the network.
- `src/lib/drugs/pmid-snapshot.test.ts` runs offline in `npm test`. Every curated row must match its snapshot year, journal and title, every PMID in source must have a row, and no paper may have two rows.
- These checks catch a wrong PMID or wrong metadata. They do not catch a `why` sentence that misreads a real paper, so that still needs a reader.

## Regenerated documents

- `docs/clinical-review/signoff-packet.md`: one line changes, the Catella-Lawson PMID.
- `docs/grade-provenance-audit.md`: the citation fixes alone move one desk row from a cited paper to a catalog-rule note (1198 to 1197 linked, 59 to 60 rule), because of the corrected tags on 13129991 and 10683007. Measured by regenerating with the pre-audit citation files and comparing. The rest of that file's diff (for example pair pages 532 to 542) is catalog growth merged before this audit, which the document had not caught up with.
