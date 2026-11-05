# B-P0-2 decision: ultrarapid activation and Avoid together

Status: **design only.** Alpha (Grok Bot) and Kaleb both have to say yes before Gamma (Bot 4) changes code. This pull request recommends option A and does not apply it.

Educational reference only. Not FDA-cleared. The Prescribing Information governs.

Source of the finding: draft PR #219, `docs/clinical-review/beta-phase-a-findings.md` section B-P0-2, branch `cursor/beta-phase-a-findings-a67c`. The behavior below is what `main` runs today (`phenotypeFindings()` and `SEVERITY_HINT` in the files named here). This note adds no CYP grade and no numerical estimate.

## The inconsistency

Learners see **Avoid together** for severity `contraindicated`. The on-screen hint promises that bin is a named label pin, not pharmacokinetic math:

`SEVERITY_HINT.contraindicated` in `src/lib/drugs/types.ts`:

> Avoid together is a teaching bin. On this desk it is kept for a named label pin, not for pharmacokinetic math. It is not an order to stop a medicine.

`pkSeverity()` in `src/lib/drugs/engine.ts` keeps that promise. It never returns `contraindicated`. Its branches return `major`, `moderate`, or `minor`.

`phenotypeFindings()` in the same file does not. It runs only for `PHENOTYPE_ENZYMES` (CYP2D6, CYP2C19, CYP2C9, CYP2B6). A normal metabolizer emits nothing. For every other phenotype it copies inhibitor or inducer math, then applies one extra rule:

- **Poor or intermediate.** The analogy is a strong inhibitor (poor) or a moderate inhibitor (intermediate), via `pkSeverity(..., "inhibitor")`. If that analogy would have been `contraindicated`, the next line forces `major`. Ultrarapid is not on this line.
- **Ultrarapid.** The analogy is a strong inducer, via `pkSeverity(..., "inducer")`. On an activation pathway, when the substrate is `sensitive` or narrow-index (`nti`), the function then **sets `contraindicated`**. There is no label pin on that assignment. The clinical string's example is codeine → morphine. The branch is every activation substrate on those four enzymes, not a codeine-only pin. Ultrarapid clearance stays on the inducer analogy and does not take this lift.

A learner can read that genotype sketch as a labeled contraindication. It is desk inference: phenotype times the stored pathway and sensitivity.

The poor-metabolizer cap is real in source, and it is currently a guard. Because `pkSeverity()` never returns `contraindicated`, the poor and intermediate force-to-`major` line does not fire on today's math. The ultrarapid activation line assigns `contraindicated` **after** `pkSeverity()`, so the cap never sees it.

## Options

Exactly two. Pick one. Do not blend them.

### A (recommended). Cap ultrarapid activation at Serious concern

In `phenotypeFindings()`, stop assigning `contraindicated` on the ultrarapid activation sketch. Leave that sketch at the strong-inducer analogy, which is `major` (**Serious concern**). Keep the poor and intermediate force-to-`major` line so that path still cannot emit `contraindicated`.

Leave `SEVERITY_HINT.contraindicated` as it is. After this cap, phenotype math matches the hint: Avoid together stays a named label pin for pharmacokinetic and phenotype tiers.

### B. Keep Avoid together on that sketch, and say it is inference

Leave the ultrarapid activation assignment at `contraindicated`. Update the on-screen hint (`SEVERITY_HINT.contraindicated`) and the basis copy for this sketch so a reader sees that this one genotype sketch is desk inference, not a labeled contraindication. The hint can no longer say Avoid together is only a named label pin unless the same sentence names this exception.

The basis edit is that sentence on this sketch. It does not close B-P0-3 (the broader CPIC badge on every `geno` row).

## Why A

Avoid together should mean a named label pin. This ultrarapid card is a genotype sketch: the desk treats the metabolizer like a strong inducer on an activation pathway, then lifts sensitive and narrow-index substrates to the word learners already use for labeled contraindications. Poor and intermediate sketches already refuse that word. Matching them keeps Serious concern for the teaching point (faster conversion to active metabolite; the in-code example is codeine → morphine) without dressing the sketch up as a labeled contraindication. The Prescribing Information still governs whether any specific product is contraindicated in an ultrarapid metabolizer. This note does not add a fold-change, a concentration, or a new CYP grade.

## Acceptance criteria for Gamma (Bot 4)

Implement only after Alpha and Kaleb have both said yes, and only the option they accepted. Record that choice in the implementation pull request.

1. No catalog grade edits. No edits under `src/lib/drugs/catalog*.ts`. The test drug is the existing codeine row: `catalog.ts` already stores it as a CYP2D6 substrate on the activation pathway with sensitivity `sensitive`. Do not edit that row. Do not add a grade or a numerical estimate to make the test pass.
2. No edits to `label-contraindications` (or `src/lib/drugs/label-contraindications.ts`). Do not change `pkSeverity()` unless a later human ask says to. This decision does not.
3. A test calls `analyze` with codeine alone and a host phenotype. Lock the finding id `geno-CYP2D6-UM-codeine` (not "any Avoid together card" on that run).
   - Option A accepted: that finding's severity is `major`.
   - Option B accepted: that finding's severity is `contraindicated`, and both `SEVERITY_HINT.contraindicated` and the basis line for this sketch say the tier is desk inference, not a labeled contraindication.
4. The same test shows the poor-metabolizer cap still cannot emit `contraindicated`. Finding `geno-CYP2D6-PM-codeine` has severity other than `contraindicated`. Keep the force-to-`major` line on the poor and intermediate branch.
5. Suggested home for the test: `src/lib/drugs/phenotype-severity.test.ts`, using the existing `node:test` style and `analyze` from `src/lib/drugs/engine.ts`. Pass a full host (spread `DEFAULT_HOST`) so phenotype, smoking, and the other host fields stay defined. Assert on the `geno-` id so a phenoconversion or clinic card cannot satisfy the lock.
6. Option A leaves `SEVERITY_HINT.contraindicated` unchanged. Option B changes that hint and the sketch's basis copy only.

## Out of scope

- This design pull request: no change under `src/`. No engine change. No catalog edit. No severity-table edit.
- Open draft PR **#209** (rolapitant pin proposal) and open draft PR **#213** (Desk-QA, including the zoliflodacin P-gp grade) stay parked. Do not merge them, push to them, or fold their edits into the implementation.
- B-P0-1 (sign-off packet legend) and B-P0-3 (CPIC badge on every `geno` row) are separate findings.

## Decision record

| | |
| --- | --- |
| Recommendation in this note | **A.** Cap ultrarapid activation at `major`. |
| Alpha (Grok Bot) | Pending. |
| Kaleb | Pending. |
| Implementer | Gamma (Bot 4), after both yes. |

Educational reference only. Not FDA-cleared. The Prescribing Information governs.
