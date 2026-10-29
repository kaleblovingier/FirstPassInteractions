# Rolapitant pin proposal (proposal only, not applied)

Status: **proposal for Kaleb.** No pin, grade, catalog strength, or test is changed. Applying the pin described here would raise both pair cards to Avoid together. Do not merge this until Kaleb says yes.

Source row: the severity-change table in [unsourced-avoid-candidates.md](./unsourced-avoid-candidates.md) (wave 12 follow-up). The desk already records the two names on the Varubi perpetrator row in `src/lib/drugs/reference/label-perpetrators.ts` and withholds the contraindication quote there, because the cards do not read Avoid together.

## Source

- Varubi (rolapitant) tablets, Luria Therapeutics LLC. DailyMed setid `8670c3cf-82d9-466d-be49-de33d8c8742b`, SPL version 3, effective 2026-09-08, published 2026-09-10. [DailyMed](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8670c3cf-82d9-466d-be49-de33d8c8742b).
- Retrieved 2026-10-29 UTC from the DailyMed SPL v2 XML (`/dailymed/services/v2/spls/{setid}.xml`). The name-search response that day listed `db_published_date` Oct 28, 2026 08:14:10 PM EST, and this setid as the current Varubi SPL.
- An older Varubi SPL (Tersera Therapeutics, setid `a52896cd-4a98-49b8-82db-bf1985a64d97`, version 3, effective 2020-08-19, published 2020-08-31) still contains the same contraindication sentence. This proposal uses the Luria label, which is the setid already cited in the wave 12 note and on the perpetrator row.

Section text below is the label-drift normalizer (`splSections` / `normalize` in `src/lib/drugs/reference/label-drift.ts`): tags stripped, whitespace folded. The wave 12 sentence is an exact substring of normalized section 4 and of the normalized full SPL.

## Catalog ids

| Catalog id | Display name | Brands | Roles that set these cards |
|---|---|---|---|
| `rolapitant` | Rolapitant | Varubi | moderate CYP2D6 inhibitor; moderate P-gp inhibitor. No pharmacodynamic flags. |
| `thioridazine` | Thioridazine | Mellaril | sensitive CYP2D6 substrate with a narrow therapeutic index; also a moderate CYP2D6 inhibitor. QT, CNS depressant, anticholinergic. |
| `pimozide` | Pimozide | Orap | CYP2D6 substrate graded **major** (not narrow-index) in the catalog; sensitive CYP3A4 substrate; minor CYP1A2 substrate. QT, CNS depressant. |

Neither partner is a P-gp substrate in the catalog, so the moderate P-gp inhibitor role on rolapitant does not open a P-gp card. Rolapitant is not a CYP2D6 substrate, so thioridazine's own moderate CYP2D6 inhibition does not open a reverse card. Confirmed by `analyze()` below: one CYP2D6 inhibitor finding on each pair, perpetrator `rolapitant`.

The label calls both drugs narrow-therapeutic-index CYP2D6 substrates. The catalog marks that flag on thioridazine only. Pimozide's CYP2D6 role stays `major`. This proposal does not change that grade. Under `pkSeverity`, a moderate inhibitor with a major substrate is moderate ("Use care"), and a moderate inhibitor with a sensitive or narrow-index substrate is major ("Serious concern"). Marking pimozide narrow-index would stop at Serious concern. The label's contraindicated verdict is what a pin would add on top of either card.

## Section 4 Contraindications (verbatim)

> 4 CONTRAINDICATIONS VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index, such as thioridazine and pimozide. VARUBI can significantly increase the plasma concentrations of thioridazine and pimozide, which may result in QT prolongation and Torsades de Pointes [see Warnings and Precautions (5.1) ] . VARUBI is contraindicated in pediatric patients less than 2 years of age because of irreversible impairment of sexual development and fertility observed in juvenile rats at clinically relevant dosages [see Use in Specific Populations (8.4) ] . CYP2D6 substrates with a narrow therapeutic index (e.g., thioridazine and pimozide) ( 4 , 5.1 , 7 ) Pediatric patients less than 2 years of age because of irreversible impairment of sexual development and fertility in juvenile rats ( 4 , 8.4 )

Pin quote, the sentence already in the wave 12 note, copied from section 4 (comma before "such as"):

> VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index, such as thioridazine and pimozide.

The same contraindication is repeated without that comma in section 5.1 and in Table 4 of section 7. A future pin should copy the section 4 sentence.

## Section 5.1 and section 7 (verbatim substrings)

Section 5.1, under "Narrow Therapeutic Index Drugs (Thioridazine and Pimozide)":

> VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index such as thioridazine and pimozide. Increased plasma concentrations of thioridazine and pimozide are associated with serious and/or life-threatening events of QT prolongation and Torsades de Pointes [see Contraindications (4) ] .

The same subsection says rolapitant is a moderate CYP2D6 inhibitor and that the inhibitory effect lasts at least 28 days after a single administration, and is expected to persist beyond 28 days for an unknown duration.

Section 7, Table 4, row "Narrow Therapeutic Index Drugs (Thioridazine and Pimozide)":

> Clinical Impact: Increased plasma concentrations of thioridazine and pimozide are associated with serious and/or life-threatening events of QT prolongation and Torsades de Pointes. Intervention: VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index such as thioridazine and pimozide. If patients require these drugs, use an alternative antiemetic to VARUBI or an alternative to thioridazine or pimozide that is not metabolized by CYP2D6 [see Contraindications (4) , Warnings and Precautions (5.1) ].

## Partner labels

Fetched the same day. Neither SPL contains "rolapitant" or "Varubi". The pin, if Kaleb wants it, would cite Varubi only.

| Label | setid | SPL | Names rolapitant? |
|---|---|---|---|
| Pimozide Tablets, USP | `70b079e2-a1f7-4a93-8685-d60a4d7c1280` | version 5, effective 2026-08-12 | No |
| Thioridazine hydrochloride (Safecor Health) | `1fd16a99-e856-4a37-9dae-c443714fac14` | version 2, effective 2026-03-02 | No |

Those are the setids the gold set already uses for these drugs. The thioridazine SPL is an older-style label; its first `<title>` is the boxed WARNING.

## What-if: card today, and the card a pin would produce

`scripts/severity-whatif.ts` answers a different question. It caps CYP/P-gp findings that are **already** contraindicated and carry no label citation, and it reports what would fall to major. These two pairs sit below contraindicated, so that cap would leave them where they are and would not show this raise. The numbers below are the pair-level equivalent: `analyze()` on the current engine, then the lift `applyLabelPins` would apply to the existing CYP2D6 inhibitor finding. The engine, `LABEL_CONTRAINDICATIONS`, and the catalog were not modified. The lift was computed outside the engine by matching the same finding `holdsLabelPin` matches on its second pass (label drug is the perpetrator: `drugIds` `[rolapitant, victim]`, enzyme CYP2D6, tag `inhibitor`).

Pair severity is the highest finding whose `drugIds` include both drugs, the same rule as `label-gold-set-eval.ts`. Two runs: `DEFAULT_HOST` (the desk and the gold-set test) and no host (the scan `severity-whatif.ts` uses). The pair severity matches on both runs. The default host also adds a phenoconversion card at moderate; it does not set the pair severity.

| Pair | Finding that sets the card today | Card today | That finding after the pin | Card after the pin |
|---|---|---|---|---|
| Rolapitant + thioridazine (`rolapitant` + `thioridazine`) | `rolapitant__thioridazine__pk-CYP2D6-inhibitor-rolapitant` | major ("Serious concern") | contraindicated | contraindicated ("Avoid together") |
| Rolapitant + pimozide (`rolapitant` + `pimozide`) | `pimozide__rolapitant__pk-CYP2D6-inhibitor-rolapitant` | moderate ("Use care") | contraindicated | contraindicated ("Avoid together") |

Today's clinical lines:

- Thioridazine: "Rolapitant is a moderate CYP2D6 inhibitor. Thioridazine is a sensitive CYP2D6 substrate with a narrow therapeutic index." Mechanism: moderate CYP2D6 inhibition of clearance. Effect: higher exposure.
- Pimozide: "Rolapitant is a moderate CYP2D6 inhibitor. Pimozide is a major CYP2D6 substrate." Same mechanism and effect.

Findings the simulated pin leaves alone (still moderate, "Use care"):

- `rolapitant__cyp-clock` on both pairs (CYP teaching clock; both hosts).
- `pheno-CYP2D6-rolapitant` on both pairs (default host only).

The matching finding exists, so the lift holds that card. It does not append a second card. A pin with `enzyme` and `kind` omitted would take the no-enzyme path: these pairs have no pharmacodynamic finding to hold, so the desk would add a standalone contraindicated finding and leave the CYP card at its current grade. The shape that matches the card already on the desk is `enzyme: "CYP2D6"`, `kind: "inhibitor"`, `labelDrugId: "rolapitant"`, `otherId` the partner, `basis: "named"`, `labelSection: "4 CONTRAINDICATIONS"`, and the section 4 quote above. That shape is described here only. It is not added to `label-contraindications.ts`.

Thioridazine would move one step (major to contraindicated). Pimozide would move two (moderate to contraindicated). Kaleb can approve both, only thioridazine, or neither.

## Named examples in this proposal

Section 4 says "such as thioridazine and pimozide." Those two names are the proposal. Other catalog CYP2D6 substrates flagged narrow-index are `atomoxetine`, `desipramine`, and `nortriptyline`. Each already has a CYP2D6 inhibitor card with rolapitant at major ("Serious concern"). They are not named in the sentence, and they are not part of this proposal.

## Why this needs Kaleb

Current pin rule: pin when the partner is named in Contraindications and the card **already** reads Avoid together. Both cards are below that line (Serious concern, and Use care). A pin here is a severity change.

Options:

1. **Pin both named pairs**, holding the existing CYP2D6 inhibitor finding (labeled product as the perpetrator). Both cards become Avoid together. Quote is the section 4 sentence above.
2. **Pin thioridazine only.** That card is already Serious concern, one step under the label. Leave pimozide at Use care.
3. **No pins.** Leave both cards as they are.

## Other open severity-change candidates (pointers only)

Already written up for Kaleb. Nothing in this document applies them.

- Wave 11 HIV-inducer lines in [label-gold-set.md](./label-gold-set.md) (the notes that start "wave 11 (severity change" and "wave 11 severity-change candidates"). Products named there include Pifeltro, Rukobia, Genvoya, Prezcobix, Cresemba, Vfend, Coartem, and Biltricide. Those notes already say a pin would raise an existing major inducer card.
- Marplan + 5-HTP / L-tryptophan, the "may precipitate" line: [unsourced-avoid-candidates.md](./unsourced-avoid-candidates.md) and row 1 of [unsourced-avoid-proposals.md](./unsourced-avoid-proposals.md). The same Marplan sentence is noted again for methylphenidate, epinephrine, norepinephrine, and dopamine in the wave 14 note in [label-gold-set.md](./label-gold-set.md).
- The earlier class-versus-named writeup in the same style: [lomitapide-pin-proposal.md](./lomitapide-pin-proposal.md).

## Not in this change

`label-contraindications.ts`, engine grades, catalog strengths, the gold set, and `docs/validation/severity-whatif.md` are unchanged. `severity-whatif.md` stays the cap preview it already is.
