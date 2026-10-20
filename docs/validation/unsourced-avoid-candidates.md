# Unsourced "Avoid together" grades: label check (wave 12)

Educational reference only. Not FDA-cleared. No doses.

Source: the 21 "Avoid together" grades with no cited source in `docs/grade-provenance-audit.md` (PR #169). Each was checked against the current DailyMed SPL on 2026-10-19 (PT). A pair is pinned only when the partner is named in the Contraindications section (section 4, or unnumbered CONTRAINDICATIONS on older labels) and the card already reads Avoid together. No grade was changed.

## Pinned (gold set wave 12, `label-contraindications.ts`)

| Pair | Label | Section | Quote |
|---|---|---|---|
| Tranylcypromine + 5-HTP / L-tryptophan | Parnate (setid b72d8187-dfcc-4ea0-b5e9-c0be95b69a27) | 4.1 Combination with Certain Drugs (Table 1 names tryptophan and hydroxytryptophan) | "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … hydroxytryptophan" |
| Isocarboxazid + Tyramine foods | Marplan (setid 95fde749-44ad-4668-86c4-0ff17bca0074) | CONTRAINDICATIONS | "Marplan (isocarboxazid) should not be administered in combination with any of the following: … cheese or other foods with a high tyramine content" |

## Label-cited outside Contraindications (for Kaleb; not pinned, grade unchanged)

| Pair | Label | Section | Quote / reason |
|---|---|---|---|
| Isocarboxazid + 5-HTP / L-tryptophan | Marplan | CONTRAINDICATIONS › Sympathomimetics (borderline) | "Use of sympathomimetics and compounds such as … tyrosine, and tryptophan with Marplan may precipitate hypertension, headache, and related symptoms." Named inside the section, but the sentence says "may precipitate", not "should not be administered". Kaleb's call. |
| Tranylcypromine + Tyramine foods | Parnate | Boxed Warning; 5.2 Hypertensive Crisis and Hypertension; 7.2 Tyramine-Containing Foods and Beverages | "MAOIs, including PARNATE, have been associated with hypertensive crises caused by the ingestion of foods or beverages with a high concentration of tyramine." Not in Table 1 (4.1). |
| Selegiline + Tyramine foods | Selegiline HCl capsules (setid 1924db3d-6a16-4496-cfd0-6903be146925) | WARNINGS | "Rare cases of hypertensive reactions associated with ingestion of tyramine-containing foods have been reported in patients taking the recommended daily dose of selegiline." |
| Rasagiline + Tyramine foods | Azilect (setid a40d0e73-3f9f-4b01-979d-402c9cdaeb60) | 5.1 Hypertension; 7.7 | "Dietary tyramine restriction is not required during treatment with recommended doses of AZILECT." The label adds that certain very high tyramine foods could cause severe hypertension. |
| Safinamide + Tyramine foods | Xadago (setid c4d65f28-983f-42b4-bb23-023ae0fe81b2) | 5.1 Hypertension; 7.6 Tyramine | "Dietary tyramine restriction is not required during treatment with recommended doses of XADAGO." |
| Tedizolid + Tyramine foods | Sivextro (setid 75672079-589f-451a-bdbf-eaebcfcc80a9) | 12.3 Pharmacokinetics only | A tyramine pressor study in healthy adults. Not in section 4. |
| Ozanimod + Tyramine foods | Zeposia (setid 93ce2fab-edfb-4804-8074-963071de51e4) | 12.2 / 12.3 only | "No clinically significant effect in tyramine induced pressor response was observed" and ozanimod "had no effect on the plasma concentrations of oral tyramine". The label does not support Avoid together; worth a grade review. |
| Trimethoprim–sulfamethoxazole + Methotrexate | Bactrim (setid f59d0c04-9c66-4d53-a0e1-cb55570deb62) | PRECAUTIONS › Drug Interactions | "Methotrexate Avoid concurrent use". Label class is avoid, not contraindicated. |

## Not named on the label (not pinned, grade unchanged)

- Selegiline, Azilect, Xadago, ProvayBlue (methylene blue, setid 4f6848e5-35ed-4046-b13c-3032b5ba3232), Sivextro, Zeposia + 5-HTP / L-tryptophan: the SPL does not name tryptophan or hydroxytryptophan. ProvayBlue names serotonergic classes (SSRIs, SNRIs, MAOIs) and opioids only.
- Methylene blue + Tyramine foods: ProvayBlue does not name tyramine.

## No FDA label

- Moclobemide + 5-HTP / L-tryptophan, Moclobemide + Tyramine foods, Harmaline + 5-HTP / L-tryptophan, Harmaline + Tyramine foods: no US-approved DailyMed label for moclobemide or harmaline. 5-HTP / L-tryptophan and tyramine foods are supplements or foods.

After wave 12 the audit lists 19 unsourced Avoid together grades (was 21).

## Severity-change candidates (for Kaleb; not pinned)

| Pair | Label | Section | Quote | Card today |
|---|---|---|---|---|
| Rolapitant + Thioridazine | Varubi (setid 8670c3cf-82d9-466d-be49-de33d8c8742b) | 4 CONTRAINDICATIONS | "VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index, such as thioridazine and pimozide." | Serious concern |
| Rolapitant + Pimozide | Varubi | 4 CONTRAINDICATIONS | same | Use care |

A pin would raise these to Avoid together, which is a severity change, so they are listed for review only.
