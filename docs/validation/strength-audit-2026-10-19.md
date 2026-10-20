# Catalog strength audit, 2026-10-19

Educational tool, NOT FDA-cleared. No dosing. Labels were read from the openFDA label API (api.fda.gov/drug/label.json) on 2026-10-19.

Branch `catalog-strength-audit`. Not pushed. **Every grade change below needs Kaleb's approval before merge.**

## Strength changes

| Drug | Role | Old -> new | Label quote (verbatim) | Section | Label effective |
|---|---|---|---|---|---|
| cinacalcet (Sensipar) | CYP2D6 inhibitor | moderate -> strong | "Cinacalcet is a strong inhibitor of CYP2D6." | 7.2 CYP2D6 Substrates | 2025-12-12 |
| apalutamide (Erleada) | CYP2C19 inducer | moderate -> strong | "Apalutamide is a strong inducer of CYP3A4 and CYP2C19, a weak inducer of CYP2C9, and an inducer of P-gp, BCRP, and OATP1B1." | 7 Drug Interactions (Effect of ERLEADA on other drugs) | 2026-07-02 |
| dronedarone (Multaq) | CYP2D6 inhibitor | weak -> moderate | "Dronedarone is metabolized primarily by CYP3A and is a moderate inhibitor of CYP3A and CYP2D6." | 12.3 Pharmacokinetics | 2026-01-27 |

Confirmed unchanged against the same labels: apalutamide CYP3A4 strong inducer and CYP2C9 weak inducer; dronedarone CYP3A4 moderate inhibitor. The dronedarone role quote is now in `src/lib/drugs/reference/label-perpetrators.ts` (Multaq, CYP2D6 inhibitor, 12.3).

Note: the repo's FDA Table 1 snapshot (`reference/fda-ddi-table.ts`) still lists cinacalcet as a moderate CYP2D6 inhibitor and apalutamide as a moderate CYP2C19 inducer. That snapshot was left as is, because it records the FDA web table, not the label. Those two rows will now read as a strength mismatch against FDA Table 1, with the label as the reason.

## Pair grade changes (116 pairs, all upward). Needs Kaleb's approval

Highest card severity per pair, from `analyze()` before and after, over every catalog pair that includes one of the three drugs. Nothing went down, and no pair became contraindicated.

### cinacalcet (74)
| Partner | Before | After |
|---|---|---|
| a-pvp | moderate | major |
| almotriptan | moderate | major |
| amitriptyline | moderate | major |
| amoxapine | moderate | major |
| amphetamine | moderate | major |
| aripiprazole | moderate | major |
| auvelity | moderate | major |
| bisoprolol | moderate | major |
| brexpiprazole | moderate | major |
| carvedilol | moderate | major |
| chlorpromazine | moderate | major |
| citalopram | moderate | major |
| clomipramine | moderate | major |
| cyclobenzaprine | moderate | major |
| darifenacin | moderate | major |
| deutetrabenazine | moderate | major |
| dextroamphetamine | moderate | major |
| diphenhydramine | moderate | major |
| donepezil | moderate | major |
| doxepin | moderate | major |
| duloxetine | moderate | major |
| eutylone | moderate | major |
| fesoterodine | moderate | major |
| flecainide | moderate | major |
| fluoxetine | moderate | major |
| fluphenazine | moderate | major |
| fluvoxamine | moderate | major |
| galantamine | moderate | major |
| haloperidol | moderate | major |
| hydrocodone | moderate | major |
| hydroxychloroquine | moderate | major |
| ibogaine | moderate | major |
| iloperidone | moderate | major |
| imipramine | moderate | major |
| lofexidine | moderate | major |
| maprotiline | moderate | major |
| mda | moderate | major |
| mdma | moderate | major |
| mdphp | moderate | major |
| mdpv | moderate | major |
| mephedrone | moderate | major |
| methamphetamine | moderate | major |
| methylone | moderate | major |
| metoclopramide | moderate | major |
| metodesnitazene | moderate | major |
| metoprolol | moderate | major |
| mexiletine | moderate | major |
| mirtazapine | moderate | major |
| n-ethylhexedrone | moderate | major |
| n-ethylpentylone | moderate | major |
| o-dsmt | moderate | major |
| ondansetron | moderate | major |
| oxycodone | moderate | major |
| paroxetine | moderate | major |
| perphenazine | moderate | major |
| pimozide | moderate | major |
| pitolisant | moderate | major |
| primaquine | moderate | major |
| promethazine | moderate | major |
| propranolol | moderate | major |
| risperidone | moderate | major |
| s-venlafaxine | moderate | major |
| tamsulosin | moderate | major |
| three-mmc | moderate | major |
| timolol | moderate | major |
| tolterodine | moderate | major |
| tramadol | moderate | major |
| trimipramine | moderate | major |
| twocb | moderate | major |
| valbenazine | moderate | major |
| venlafaxine | moderate | major |
| viloxazine | moderate | major |
| vortioxetine | moderate | major |
| yohimbine | moderate | major |

### dronedarone (36)
| Partner | Before | After |
|---|---|---|
| a-pvp | minor | major |
| amoxapine | minor | major |
| amphetamine | minor | major |
| atomoxetine | moderate | major |
| auvelity | minor | major |
| carvedilol | minor | major |
| dextroamphetamine | minor | major |
| diphenhydramine | minor | major |
| duloxetine | minor | major |
| eutylone | minor | major |
| fluoxetine | moderate | major |
| fluvoxamine | moderate | major |
| lofexidine | minor | major |
| mdphp | minor | major |
| mdpv | minor | major |
| mephedrone | minor | major |
| methamphetamine | minor | major |
| methylone | minor | major |
| metoclopramide | minor | major |
| metoprolol | minor | major |
| mexiletine | minor | major |
| n-ethylhexedrone | minor | major |
| n-ethylpentylone | minor | major |
| nebivolol | moderate | major |
| paroxetine | minor | major |
| perphenazine | minor | major |
| primaquine | minor | major |
| propranolol | minor | major |
| r-venlafaxine | moderate | major |
| s-venlafaxine | minor | major |
| three-mmc | minor | major |
| timolol | minor | major |
| twocb | minor | major |
| viloxazine | minor | major |
| vortioxetine | minor | major |
| yohimbine | minor | major |

### apalutamide (6)
| Partner | Before | After |
|---|---|---|
| a-pvp | moderate | major |
| carisoprodol | moderate | major |
| doxepin | moderate | major |
| imipramine | moderate | major |
| pantoprazole | moderate | major |
| selegiline | moderate | major |

## Full-catalog audit, method

There are 395 inhibitor and inducer roles on 221 catalog rows. For each row, the longest openFDA label matching its generic name (or brand name for combinations) was pulled. Every sentence in the Drug Interactions, Clinical Pharmacology, Warnings and Contraindications sections that named the enzyme and the role was checked for a potency word (strong, potent, moderate, weak or mild) applied to the drug itself. Each mismatch was then read by hand. 178 rows had a label. Foods, supplements, recreational drugs and ethinyl estradiol (OCP) have no FDA label to audit.

Limits: a role whose label gives no potency word was not graded, and P-gp was not graded without one. Roles the label gives but the catalog lacks were not added. BCRP is not modeled. Global thresholds are unchanged. Held-back drugs (amlodipine, tolvaptan, prasugrel, elinzanetant, risdiplam, brigatinib, canagliflozin, febuxostat) are untouched, and duvelisib stays ungraded.

False positives that were checked and left alone: voriconazole 2C9/2C19 ("strong" applies to 3A4), cobicistat 3A ("weak" applies to TAF), carbamazepine 1A2 ("potent" applies to 3A4), enzalutamide 2C9/2C19 (the label says moderate, which matches), apalutamide 2C9 (weak, matches), selpercatinib 3A (weak, matches), nitisinone 2E1 (weak, matches), berotralstat 2C9/2C19 (weak, matches), and isavuconazole, lonafarnib, vonoprazan and Epidiolex 3A4 (the potency words there describe other drugs).

## Review list (not changed)

| Drug | Role | Catalog | Label says | Why held |
|---|---|---|---|---|
| clopidogrel | CYP2C8 inhibitor | moderate | "The acyl-β-glucuronide metabolite of clopidogrel is a strong inhibitor of CYP2C8." (7.8) | FDA Table 1 snapshot says moderate. Kaleb to choose label or table. |
| teriflunomide | CYP1A2 inducer | moderate | "Teriflunomide may be a weak inducer of CYP1A2 in vivo." (7 Drug Interactions). A caffeine AUC drop of 55% falls in FDA's moderate band | Label wording and its own data disagree. FDA Table 1 says moderate. |
| fluvoxamine | CYP3A4 inhibitor | moderate | "Although it has not been definitively demonstrated that fluvoxamine is a potent CYP3A4 inhibitor, it is likely to be" (Warnings) | Hedged. FDA Table 1 says weak. |
| cannabidiol (non-Epidiolex row) | CYP2C19 inhibitor | strong | Epidiolex: "Cannabidiol is a moderate inhibitor of CYP2C19" | This row is unregulated CBD, not Epidiolex. The Epidiolex row is already moderate. |
| apalutamide | P-gp inducer | (none) | "an inducer of P-gp" | No potency word, so not added. |
| dronedarone | P-gp inhibitor | moderate | "It has the potential to inhibit P-glycoprotein (P-gp) transport." | No potency word. Existing grade kept, not re-graded. |

## P-gp skip list

`saquinavir` is now in the catalog (FDA Table 1 shelf, CYP3A4 only). It moved from NOT_IN_CATALOG to SKIP_UNGRADED in `pgp-fda-roles.test.ts`, so the main-branch failure passes.
