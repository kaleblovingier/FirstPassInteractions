# Wave 18: conditional label lines and the eplerenone hyperkalemia card (proposal)

Status: **proposal for Kaleb.** This branch changes eight pair grades (no card to Serious concern) and the warning text and cited source on five more cards. No pair is raised to Avoid together, no label pin is added, and no CYP grade or catalog strength changes. Do not merge until Kaleb says yes.

Sources: every quote below is a verbatim span of the section text saved in `scripts/fixtures/label-drift-spl.json` (DailyMed SPL v2 XML, retrieved 2026-10-28). "…" marks an elided span; dose amounts are elided so no quote carries a milligram figure. No label was fetched for this wave (outbound requests are blocked here). The label-drift check (`npm run check:label-drift`) now covers these quotes, and all six pass in their cited section.

| Label | setid | SPL version | Effective | Fixture section |
|---|---|---|---|---|
| Vfend (voriconazole) | `08d08721-1f4c-478a-8abf-d9c402d50553` | 33 | 2026-03-20 | 4 CONTRAINDICATIONS |
| Sporanox (itraconazole) capsules | `a4d555fa-787c-40fb-bb7d-b0d4f7318fd0` | 31 | 2026-07-13 | CONTRAINDICATIONS |
| Noxafil (posaconazole) | `b073b082-7b57-4423-8c06-4fd4263d6f84` | 56 | 2026-02-13 | 4 CONTRAINDICATIONS (4.6 Use with Venetoclax) |
| Inspra (eplerenone) | `1a52bedc-8e2c-4116-a296-a87770676b4a` | 6 | 2025-06-23 | 4 CONTRAINDICATIONS (For Patients Treated for Hypertension) |

## Why not a pin

Each line contraindicates the pair only under a condition: an efavirenz or ritonavir dose, the hypertension indication, or the venetoclax initiation and ramp-up phase in CLL or SLL. The desk takes no dose, indication, or treatment phase for these pairs, so a pin (`label-contraindications.ts`) would show Avoid together for every patient, including the ones the line does not cover. That overstates the label.

The existing patterns were checked:

- Label pins always set Avoid together. The one-direction pins (`START_ONLY_LABEL_DRUGS`, bupropion with linezolid) still show Avoid together, so they do not fit a dose line.
- Gold rows with label class `contraindicated` must read Avoid together or sit on `KNOWN_CONTRAINDICATION_GAPS`, which would call these pairs engine gaps. Earlier waves dropped conditional lines from the gold set for that reason (wave 4 and wave 17 notes).
- `labelFloorFindings` in `engine.ts` already shows a label-cited card below Avoid together and says so in its text (Suboxone with phenelzine: "The label says not recommended, so this desk shows Serious concern for this pair. It does not call the pair contraindicated.").

Chosen shape: `src/lib/drugs/label-conditional.ts`. The pair keeps the grade its enzyme or class rule gives. The engine appends one sentence to the named card and tags it `label-conditional`; `basis.ts` puts the verbatim label line first under "Why this grade". The sentence names the condition and says the desk does not know it, so the card stays at Serious concern. The one place a card is added is the Inspra hypertension line, because those pairs had no card at all. There the new card is Serious concern, the grade the ACEI/ARB × potassium-sparing card (`pd-hyperk`) already uses for the same physiology.

## Before and after

"Before" is `origin/main` at `8e4c216`. Pair grade is the highest finding that names both drugs, with and without `DEFAULT_HOST` (same result both ways for every row).

### Grade changes: no card to Serious concern (8 pairs)

New engine rule `pd-mra-k` ("eplerenone × potassium-sparing diuretic or potassium supplement", major), firing only for the partners below. Card text: "Eplerenone already blocks aldosterone at the collecting duct. A potassium-sparing diuretic or a potassium supplement adds more potassium retention or load. Check potassium and creatinine, especially in CKD. The Inspra (eplerenone) label lists this combination under Contraindications only when Inspra is used to treat hypertension. This desk does not know the indication, so this card stays at Serious concern and is not shown as Avoid together."

Label sentence (Inspra, 4 CONTRAINDICATIONS, fixture): "INSPRA is contraindicated for the treatment of hypertension in patients with: … concomitant administration of potassium supplements or potassium-sparing diuretics (e.g., amiloride, spironolactone, or triamterene)"

| # | Drug A + drug B (catalog ids) | Before | After | Covered by |
|---:|---|---|---|---|
| 1 | Eplerenone + spironolactone (`eplerenone`, `spironolactone`) | Not mapped (no card) | Serious concern | named: spironolactone |
| 2 | Eplerenone + spironolactone derm (`spironolactone-derm`) | Not mapped | Serious concern | named: spironolactone (same molecule, dermatology row) |
| 3 | Eplerenone + spironolactone–HCTZ / Aldactazide (`spironolactone-hctz`) | Not mapped | Serious concern | combination row containing spironolactone |
| 4 | Eplerenone + amiloride (`amiloride`) | Not mapped | Serious concern | named: amiloride |
| 5 | Eplerenone + triamterene (`triamterene`) | Not mapped | Serious concern | named: triamterene |
| 6 | Eplerenone + HCTZ–triamterene / Maxzide, Dyazide (`hydrochlorothiazide-triamterene`) | Not mapped | Serious concern | combination row containing triamterene |
| 7 | Eplerenone + potassium supplement (`potassium`) | Not mapped | Serious concern | named: potassium supplements |
| 8 | Eplerenone + potassium chloride / Klor-Con (`potassium-chloride`) | Not mapped | Serious concern | named: potassium supplements |

Kaleb's call: rows 2, 3 and 6 are the judgment rows (a form row and two combination products). The ACEI/ARB card is untouched: lisinopril or losartan with spironolactone, eplerenone, finerenone, amiloride, triamterene, TMP-SMX or the potassium supplement still reads `pd-hyperk` at Serious concern with the same text (test in `label-conditional.test.ts`).

### Warning and source changes, grade unchanged at Serious concern (5 pairs)

| # | Drug A + drug B | Card that carries the line | Before | After | Label sentence (fixture section) |
|---:|---|---|---|---|---|
| 9 | Voriconazole + efavirenz | `efavirenz__voriconazole__pk-CYP2C19-inducer-efavirenz` | Serious concern; CYP text only; lead basis FDA interaction table | Serious concern; text adds: "The Vfend (voriconazole) label lists this combination under Contraindications only at or above the efavirenz dosage the label states. Lower efavirenz dosages are not on that line. This desk does not know the dose, so this card stays at Serious concern and is not shown as Avoid together."; lead basis is the Vfend quote | Vfend 4: "Efavirenz Concomitant use with efavirenz dosages of … or higher is contraindicated" |
| 10 | Voriconazole + ritonavir | `ritonavir__voriconazole__pk-CYP3A4-inhibitor-voriconazole` | Serious concern; CYP text only | Serious concern; text adds: "The Vfend (voriconazole) label lists this combination under Contraindications only with high-dose ritonavir, among drugs that lower voriconazole levels. With low-dose ritonavir it says to avoid the combination unless the benefit and risk to the patient justify Vfend. This desk does not know the dose, …"; lead basis is the Vfend quote | Vfend 4: "Ritonavir Concomitant use with high-dose ritonavir (… ) is contraindicated. Concomitant use with low-dose ritonavir (… ) should be avoided, unless an assessment of the benefit/risk to the patient justifies the use of VFEND" |
| 11 | Voriconazole + venetoclax | `venetoclax__voriconazole__pk-CYP3A4-inhibitor-voriconazole` | Serious concern; CYP text only | Serious concern; text adds: "The Vfend (voriconazole) label lists this combination under Contraindications only at venetoclax initiation and during the ramp-up phase in chronic lymphocytic leukemia or small lymphocytic lymphoma. This desk does not know the treatment phase, …"; lead basis is the Vfend quote | Vfend 4: "Venetoclax: Coadministration at initiation and during the ramp-up phase is contraindicated in patients with chronic lymphocytic leukemia (CLL) or small lymphocytic lymphoma (SLL)" |
| 12 | Itraconazole + venetoclax | `itraconazole__venetoclax__pk-CYP3A4-inhibitor-itraconazole` | Serious concern; CYP text only | Serious concern; same sentence naming the Sporanox (itraconazole) label; lead basis is the Sporanox quote | Sporanox CONTRAINDICATIONS: "Coadministration with venetoclax is contraindicated in patients with CLL/SLL during the dose initiation and ramp-up phase of venetoclax" |
| 13 | Posaconazole + venetoclax | `posaconazole__venetoclax__pk-CYP3A4-inhibitor-posaconazole` | Serious concern; CYP text only | Serious concern; same sentence naming the Noxafil (posaconazole) label; lead basis is the Noxafil quote | Noxafil 4 (4.6): "Coadministration of Noxafil with venetoclax at initiation and during the ramp-up phase is contraindicated in patients with chronic lymphocytic leukemia (CLL) or small lymphocytic lymphoma (SLL)" |

For row 9 the second inducer card (`pk-CYP2C19` carries the line, `pk-CYP3A4-inducer-efavirenz` does not) is unchanged; the CYP2C19 card was chosen to match the wave 17 Vfend inducer pins (carbamazepine, rifabutin, rifampin). For row 10 the only CYP card is voriconazole raising ritonavir, while the label line is about ritonavir lowering voriconazole; the sentence states the label's own reason.

## Simvastatin with HIV protease inhibitors

No change. Every HIV protease inhibitor catalog row that Zocor's 7.1 Table 2 Examples row names ("select HIV protease inhibitors (e.g., nelfinavir, ritonavir, and darunavir/ritonavir)", quoted from the existing wave 1 and wave 17 pins) is already pinned at Avoid together: ritonavir (wave 1), nelfinavir (wave 17), and darunavir, atazanavir, lopinavir/ritonavir, Prezcobix, Evotaz and Paxlovid through their own labels. Zocor has no dose-conditional protease inhibitor line in the saved section 4 text. Indinavir, saquinavir and tipranavir (and their ritonavir rows) are not named by Zocor ("select"), stay in the wave 17 dropped notes, and today read Mild note (indinavir, saquinavir) or no card (tipranavir), because those shelf rows carry no inhibitor role. That catalog question belongs to the HIV catalog work, not this wave.

## Left out, and why

- **Spironolactone or finerenone with trimethoprim (TMP-SMX), potassium supplements, amiloride or triamterene; eplerenone with TMP-SMX or finerenone.** The Aldactone, Bactrim and Kerendia labels are not in the fixture, and Inspra names only potassium supplements and potassium-sparing diuretics. No saved sentence, so no card. All still read no card, except eplerenone + finerenone (Mild note from CYP3A4). Clinically these are the strongest remaining hyperkalemia gaps; saving those three labels to the fixture is the next step.
- **Vfend with efavirenz or ritonavir combination rows** (Atripla `efavirenz-ftc-tdf`, Kaletra, Paxlovid, indinavir/ritonavir, tipranavir/ritonavir). The line is by dose, and these rows' efavirenz or ritonavir content is not in a saved label. Voriconazole + Atripla still reads no card.
- **Norvir section 4 lists voriconazole** in the saved text without a dose qualifier. The wave 4 note says Norvir section 7 makes it dose-dependent; that section is not saved. The pair stays at Serious concern with the Vfend line. Flag for Kaleb.
- **Venetoclax with other strong CYP3A inhibitors** (clarithromycin, ketoconazole, ritonavir, cobicistat-boosted rows). The Venclexta label is not in the fixture, so its class line and steady-state dose change cannot be quoted. Cards stay at Serious concern with no label line.
- **IV potassium chloride, potassium citrate, potassium phosphate** with eplerenone. Not clearly "potassium supplements" in the Inspra sense. No card.
- **Potassium chloride (`potassium-chloride`) and HCTZ–triamterene with an ACEI or ARB** read no card today (the rows lack the `k-sparing` flag). Not changed, because the brief keeps the ACEI/ARB behaviour as it is. Worth a separate decision.

These are also in the wave 18 entries of `DROPPED_CANDIDATES` (`src/lib/drugs/reference/label-gold-set.ts`, rendered in `label-gold-set.md`).

## Options for Kaleb

1. **Ship as is**: 8 new Serious concern cards and 5 label lines, nothing at Avoid together.
2. **Ship the five notes only**: drop rule `pd-mra-k` and the eight Inspra lines; the eplerenone pairs go back to no card.
3. **Drop the judgment rows** (2, 3, 6) and keep the named partners only.
4. **None.**

## Files

- `src/lib/drugs/label-conditional.ts` (new): the 13 lines, the sentence, the target matcher.
- `src/lib/drugs/engine.ts`: `applyLabelConditional` after `applyLabelPins`; rule `pd-mra-k`.
- `src/lib/drugs/basis.ts`: `labelConditionalBasis` leads the basis list for a tagged card.
- `scripts/label-drift-check.ts`, `src/lib/drugs/reference/label-drift.ts`: the drift check covers the new quotes.
- `src/lib/drugs/label-conditional.test.ts` (new): fixture-verbatim quotes, one card per line, grades held, ACEI/ARB card unchanged, no line on unlisted pairs.
- Regenerated: `docs/validation/label-drift.md`, `docs/validation/label-gold-set.md`, `docs/clinical-review/signoff-packet.md` (new row for `pd-mra-k`, 8 pairs).
