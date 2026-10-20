# FDA disagreement audit (PharmD review, proposals only)

> Educational teaching tool. Proposals for Kaleb. **No grade, sensitivity, strength or severity is changed in code by this document.**
> Source rows: `npx tsx scripts/fda-agreement.ts` review list on origin/main ce78b44 (307 pairs compared, 264 exact = 86%, 43 disagreements).
> Retrieved 2026-10-19.

## What the 43 disagreements are

All 43 are disagreements with **FDA's Drug Development and Drug Interactions Table 1** (substrate sensitivity and inhibitor/inducer strength classes), not with a DailyMed label's Contraindications section. 37 are strength mismatches and 6 are roles FDA lists that the catalog lacks. There are no direction mismatches.

**Quote source:** the "FDA says" column is the verbatim class from the FDA Table 1 transcription in `src/lib/drugs/reference/fda-ddi-table.ts` (FDA page current as of 2026-05-29). Footnotes are quoted from the same file; fn 4, 12, 15 and 16 are stored there as paraphrase placeholders, not FDA wording. DailyMed SPL labels generally do not state FDA's "sensitive / moderate-sensitive" index class, so there is no SPL sentence to quote for these rows, and none was claimed. Any label-level check is listed as a follow-up below.

Catalog vocabulary: `sensitive | major | minor`. The validator treats FDA "moderate-sensitive" as catalog "major".

## Summary

| Proposal | Count |
|---|---:|
| upgrade | 20 |
| downgrade | 6 |
| keep | 6 |
| needs-review | 11 |

Any upgrade or downgrade would change the grades of many pair cards through the enzyme rule. Run `scripts/severity-whatif.ts` on each proposal before Kaleb decides. **Kaleb's call on every row.**

## Rows

| # | FDA drug | Target | Catalog says | FDA Table 1 says | FDA footnote (verbatim from transcription) | Proposal | PharmD reason |
|---:|---|---|---|---|---|---|---|
| 1 | alprazolam | CYP3A4 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **downgrade** | FDA moderate-sensitive (AUC 2- to <5-fold with strong inhibitor); catalog "sensitive" over-calls. Map to "major" |
| 2 | avanafil | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 3 | bupropion | CYP2B6 | substrate (major) | substrate (FDA sensitive) | fn 2: "Bupropion itself is not a sensitive substrate. It is metabolized by multiple enzymes including CYP2B6 that is only responsible for the formation of hydroxybupropion, an active metabolite. Thus, the considerations of drug interactions with CYP2B6 modulators should take into account plasma concentration changes of both buproprion and hydroxybupropion." | **needs-review** | FDA fn 2: bupropion itself is not sensitive; hydroxybupropion matters. Card text should say so before any grade change |
| 4 | celecoxib | CYP2C9 | substrate (major) | substrate (FDA sensitive) | fn 3: "Listed based on pharmacogenetic studies." | **needs-review** | FDA fn 3: listed from pharmacogenetic (CYP2C9 PM) data, not inhibitor DDI studies |
| 5 | clozapine | CYP1A2 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **keep** | FDA moderate-sensitive, catalog sensitive: seizure/sedation risk; clozapine label calls out CYP1A2 inhibitors (fluvoxamine) |
| 6 | colchicine | CYP3A4 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **keep** | FDA moderate-sensitive, catalog sensitive: fatal toxicity reported with CYP3A/P-gp inhibitors; label has inhibitor-specific adjustments |
| 7 | conivaptan | CYP3A4 | substrate (major); inhibitor (moderate) | substrate (FDA sensitive) | fn 5: "The classification is based on studies conducted with intravenously administered conivaptan." | **needs-review** | FDA fn 5: based on IV conivaptan; catalog row is not route-specific |
| 8 | darifenacin | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 9 | darunavir | CYP3A4 | substrate (major); inhibitor (strong) | substrate (FDA sensitive) | fn 6: "Usually administered to patients in combination with ritonavir, a strong CYP3A inhibitor." | **needs-review** | FDA fn 6: always given with ritonavir or cobicistat, so the unboosted class rarely applies |
| 10 | dasatinib | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 11 | dronedarone | CYP3A4 | substrate (major); inhibitor (moderate) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 12 | duloxetine | CYP1A2 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 13 | efavirenz | CYP2B6 | substrate (sensitive); inducer (moderate) | substrate (FDA moderate-sensitive) | — | **downgrade** | FDA moderate-sensitive (AUC 2- to <5-fold with strong inhibitor); catalog "sensitive" over-calls. Map to "major" |
| 14 | Entrectinib | CYP3A4 | substrate (major); inhibitor (weak) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 15 | everolimus | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 16 | fezolinetant | CYP1A2 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 17 | fluvoxamine | CYP3A4 | inhibitor (moderate) | inhibitor (FDA weak) | fn 8: "Fluvoxamine increased the AUC of certain sensitive CYP3A substrates more than 2-fold (e.g., increased the AUC of buspirone 2.35-fold)" | **needs-review** | FDA fn 8: buspirone AUC rose 2.35-fold (moderate-range) though FDA classifies weak; ambiguous |
| 18 | ibrutinib | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 19 | isavuconazole | CYP3A4 | substrate (major); inhibitor (moderate) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 20 | nortriptyline | CYP2D6 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **downgrade** | FDA moderate-sensitive (AUC 2- to <5-fold with strong inhibitor); catalog "sensitive" over-calls. Map to "major" |
| 21 | omeprazole | CYP2C19 | substrate (major); inhibitor (weak) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 22 | perphenazine | CYP2D6 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 23 | phenytoin | CYP2C9 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **keep** | FDA moderate-sensitive, catalog sensitive: narrow therapeutic index, nonlinear kinetics; over-calling is defensible |
| 24 | pimozide | CYP3A4 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **keep** | FDA moderate-sensitive, catalog sensitive: QT risk; label contraindicates strong CYP3A inhibitors anyway |
| 25 | pioglitazone | CYP2C8 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **downgrade** | FDA moderate-sensitive (AUC 2- to <5-fold with strong inhibitor); catalog "sensitive" over-calls. Map to "major" |
| 26 | pirfenidone | CYP1A2 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **downgrade** | FDA moderate-sensitive (AUC 2- to <5-fold with strong inhibitor); catalog "sensitive" over-calls. Map to "major" |
| 27 | propafenone | CYP2D6 | substrate (sensitive); inhibitor (weak) | substrate (FDA moderate-sensitive) | — | **downgrade** | FDA moderate-sensitive (AUC 2- to <5-fold with strong inhibitor); catalog "sensitive" over-calls. Map to "major" |
| 28 | Repotrectinib | CYP3A4 | substrate (major); inducer (moderate) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 29 | ritonavir | CYP2B6 | inducer (moderate) | inducer (FDA weak) | fn 14: "Ritonavir is approved for use in combination with other anti-HIV or anti-HCV drugs. Caution should be used when extrapolating the observed effect of ritonavir alone to the effect of anti-HIV or anti-HCV combination regimens on CYP3A activities."; fn 15: "Exposure-condition caveat (FDA footnote 15); wording not reproduced here, see the source page."; fn 16: "Exposure-condition caveat (FDA footnote 16); wording not reproduced here, see the source page." | **needs-review** | FDA fn 14–16: ritonavir is only used as a booster; extrapolation caveat |
| 30 | selexipag | CYP2C8 | substrate (major) | substrate (FDA sensitive) | fn 21: "Selexipag is a prodrug. it is the selexipag active metabolite ACT-333679 that is a sensitive substrate of CYP2C8. Selexipag and ACT-333679 are also substrates of OATP1B transporter" | **needs-review** | FDA fn 21: the active metabolite ACT-333679 is the sensitive substrate; label already restricts strong CYP2C8 inhibitors (gemfibrozil) |
| 31 | sildenafil | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 32 | tasimelteon | CYP1A2 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 33 | theophylline | CYP1A2 | substrate (sensitive) | substrate (FDA moderate-sensitive) | — | **keep** | FDA moderate-sensitive, catalog sensitive: narrow therapeutic index; toxicity at modest exposure rises |
| 34 | ticagrelor | CYP3A4 | substrate (major); inhibitor (weak) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 35 | tolterodine | CYP2D6 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 36 | vardenafil | CYP3A4 | substrate (major) | substrate (FDA sensitive) | — | **upgrade** | FDA sensitive index substrate (AUC ≥5-fold with a strong inhibitor); catalog "major" under-calls. Map to "sensitive" |
| 37 | warfarin | CYP2C9 | substrate (sensitive) | substrate (FDA moderate-sensitive) | fn 19: "S-warfarin" | **keep** | FDA moderate-sensitive, catalog sensitive: narrow therapeutic index (INR); keeping "sensitive" is the safer teaching default |
| 38 | clotrimazole | CYP3A4 | — | inhibitor (FDA weak) | — | **needs-review** | Troche/topical use; systemic weak CYP3A inhibition matters mainly for tacrolimus. Formulation-specific |
| 39 | elagolix | CYP3A4 | — | inducer (FDA weak) | — | **upgrade** | FDA lists elagolix as a weak CYP3A inducer; add the role so inducer cards with sensitive substrates appear (low impact) |
| 40 | miconazole | CYP2C9 | — | inhibitor (FDA moderate) | — | **upgrade** | Moderate CYP2C9 inhibitor; warfarin + miconazole (incl. oral gel, vaginal) INR rises are well documented |
| 41 | resmetirom | CYP2C8 | inhibitor (weak) | substrate (FDA moderate-sensitive) | — | **needs-review** | Rezdiffra labels CYP2C8 inhibitor restrictions (gemfibrozil); adding the substrate role is consistent |
| 42 | ritonavir | CYP2C19 | — | inducer (FDA weak) | fn 14: "Ritonavir is approved for use in combination with other anti-HIV or anti-HCV drugs. Caution should be used when extrapolating the observed effect of ritonavir alone to the effect of anti-HIV or anti-HCV combination regimens on CYP3A activities."; fn 15: "Exposure-condition caveat (FDA footnote 15); wording not reproduced here, see the source page."; fn 16: "Exposure-condition caveat (FDA footnote 16); wording not reproduced here, see the source page." | **needs-review** | FDA fn 14–16: ritonavir is only used as a booster; extrapolation caveat |
| 43 | tipranavir | CYP3A4 | — | substrate (FDA sensitive) | fn 6: "Usually administered to patients in combination with ritonavir, a strong CYP3A inhibitor." | **needs-review** | FDA fn 6: always co-given with ritonavir; a substrate role would rarely drive a card |

## Follow-ups (not done here)

- For each **upgrade** row, check the DailyMed Drug Interactions section (7) for wording that names strong CYP inhibitors, before the grade moves. This audit did not fetch those SPLs.
- Ritonavir appears twice (rows 29, 42). Decide it once as a booster-only drug.
- The 6 kept or downgraded narrow-therapeutic-index substrates could get a card note instead of a grade change.
