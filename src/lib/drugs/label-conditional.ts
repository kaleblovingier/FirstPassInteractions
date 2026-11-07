/**
 * Label contraindications that hold only under a condition the desk cannot see
 * (wave 18, a proposal for Kaleb).
 *
 * Why this exists: some section 4 lines contraindicate a pair only at a dose,
 * only for one indication, or only in one treatment phase. A pin (see
 * label-contraindications.ts) would show Avoid together for every patient,
 * including the ones the line does not cover. The desk takes no dose for these
 * pairs, no indication, and no treatment phase, so it cannot tell which side of
 * the line a patient is on.
 *
 * What a line does instead: the pair keeps the grade its enzyme or class rule
 * already gives. The engine appends one plain sentence to that finding saying
 * what the label contraindicates and under which condition, and tags the
 * finding `label-conditional`. basis.ts quotes the label. No grade is raised to
 * contraindicated here, and no CYP grade is added.
 *
 * The one exception is the Inspra hypertension line. Those pairs had no card at
 * all, so engine.ts adds a pharmacodynamic hyperkalemia card at major (Serious
 * concern, the grade the ACEI/ARB × potassium-sparing card already uses) and
 * the line rides on that card. That card fires only for the partners listed
 * here.
 *
 * Source rules:
 * - Every quote is a verbatim span of the section text saved in
 *   scripts/fixtures/label-drift-spl.json (DailyMed SPL v2 XML, retrieved
 *   2026-10-28). "…" marks an elided span. Dose amounts are elided, so no quote
 *   carries a milligram figure. The label-drift check covers these quotes.
 * - Only partners the line names, or a catalog combination row that contains a
 *   named drug, are listed. No class expansion beyond that.
 *
 * Educational reference, not FDA-cleared. No doses.
 */
import type { Enzyme, Finding } from "./types";
import { SEVERITY_LABEL } from "./types";

export type LabelConditionKind = "dose" | "indication" | "phase";

export type LabelConditionalTarget =
  /** An existing CYP finding: perpetrator id, enzyme and direction. */
  | { kind: "pk"; perpId: string; enzyme: Enzyme; role: "inhibitor" | "inducer" }
  /** A pharmacodynamic card, by rule suffix. */
  | { kind: "pd"; suffix: string };

export interface LabelConditionalLine {
  /** Stable id, `labelDrugId+otherId`. */
  id: string;
  /** Catalog id of the drug whose label carries the line. */
  labelDrugId: string;
  /** Catalog id of the other drug. */
  otherId: string;
  /** The finding the sentence rides on. */
  target: LabelConditionalTarget;
  labelDrug: string;
  labelSection: string;
  /** Verbatim span of the saved section text. */
  quote: string;
  /** The name in the quote that covers `otherId`. */
  labelExample: string;
  /** What the contraindication depends on. */
  condition: LabelConditionKind;
  /** Plain words, no dose: "only …" completes "lists this combination under Contraindications". */
  scope: string;
  /**
   * `named`: the line names this drug. `combination`: the catalog row is a
   * fixed combination that contains a drug the line names.
   */
  basis: "named" | "combination";
  url: string;
  retrieved: "2026-10-28";
}

export const LABEL_CONDITIONAL_TAG = "label-conditional";

const DM = (setid: string) => `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`;

// Vfend (voriconazole), SPL version 33, effective 2026-03-20.
const VFEND = DM("08d08721-1f4c-478a-8abf-d9c402d50553");
// Sporanox (itraconazole) capsules, SPL version 31, effective 2026-07-13.
const SPORANOX = DM("a4d555fa-787c-40fb-bb7d-b0d4f7318fd0");
// Noxafil (posaconazole), SPL version 56, effective 2026-02-13.
const NOXAFIL = DM("b073b082-7b57-4423-8c06-4fd4263d6f84");
// Inspra (eplerenone), SPL version 6, effective 2025-06-23.
const INSPRA = DM("1a52bedc-8e2c-4116-a296-a87770676b4a");

const VENETOCLAX_SCOPE =
  "at venetoclax initiation and during the ramp-up phase in chronic lymphocytic leukemia or small lymphocytic lymphoma";

/** Inspra section 4, "For Patients Treated for Hypertension". */
const INSPRA_HTN =
  "INSPRA is contraindicated for the treatment of hypertension in patients with: … concomitant administration of potassium supplements or potassium-sparing diuretics (e.g., amiloride, spironolactone, or triamterene)";

const inspra = (
  otherId: string,
  labelExample: string,
  basis: LabelConditionalLine["basis"],
): LabelConditionalLine => ({
  id: `eplerenone+${otherId}`,
  labelDrugId: "eplerenone",
  otherId,
  target: { kind: "pd", suffix: "pd-mra-k" },
  labelDrug: "Inspra (eplerenone)",
  labelSection: "4 CONTRAINDICATIONS",
  quote: INSPRA_HTN,
  labelExample,
  condition: "indication",
  scope: "when Inspra is used to treat hypertension",
  basis,
  url: INSPRA,
  retrieved: "2026-10-28",
});

export const LABEL_CONDITIONAL_LINES: readonly LabelConditionalLine[] = [
  {
    id: "voriconazole+efavirenz",
    labelDrugId: "voriconazole",
    otherId: "efavirenz",
    // Vfend item 2 (inducers that lower voriconazole). Same orientation and
    // enzyme as the wave 17 carbamazepine pin.
    target: { kind: "pk", perpId: "efavirenz", enzyme: "CYP2C19", role: "inducer" },
    labelDrug: "Vfend (voriconazole)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Efavirenz Concomitant use with efavirenz dosages of … or higher is contraindicated",
    labelExample: "Efavirenz",
    condition: "dose",
    scope: "at or above the efavirenz dosage the label states. Lower efavirenz dosages are not on that line",
    basis: "named",
    url: VFEND,
    retrieved: "2026-10-28",
  },
  {
    id: "voriconazole+ritonavir",
    labelDrugId: "voriconazole",
    otherId: "ritonavir",
    // The only CYP card on this pair is voriconazole raising ritonavir. The
    // label line is about ritonavir lowering voriconazole; the sentence says so.
    target: { kind: "pk", perpId: "voriconazole", enzyme: "CYP3A4", role: "inhibitor" },
    labelDrug: "Vfend (voriconazole)",
    labelSection: "4 CONTRAINDICATIONS",
    quote:
      "Ritonavir Concomitant use with high-dose ritonavir (… ) is contraindicated. Concomitant use with low-dose ritonavir (… ) should be avoided, unless an assessment of the benefit/risk to the patient justifies the use of VFEND",
    labelExample: "Ritonavir",
    condition: "dose",
    scope:
      "with high-dose ritonavir, among drugs that lower voriconazole levels. With low-dose ritonavir it says to avoid the combination unless the benefit and risk to the patient justify Vfend",
    basis: "named",
    url: VFEND,
    retrieved: "2026-10-28",
  },
  {
    id: "voriconazole+venetoclax",
    labelDrugId: "voriconazole",
    otherId: "venetoclax",
    target: { kind: "pk", perpId: "voriconazole", enzyme: "CYP3A4", role: "inhibitor" },
    labelDrug: "Vfend (voriconazole)",
    labelSection: "4 CONTRAINDICATIONS",
    quote:
      "Venetoclax: Coadministration at initiation and during the ramp-up phase is contraindicated in patients with chronic lymphocytic leukemia (CLL) or small lymphocytic lymphoma (SLL)",
    labelExample: "Venetoclax",
    condition: "phase",
    scope: VENETOCLAX_SCOPE,
    basis: "named",
    url: VFEND,
    retrieved: "2026-10-28",
  },
  {
    id: "itraconazole+venetoclax",
    labelDrugId: "itraconazole",
    otherId: "venetoclax",
    target: { kind: "pk", perpId: "itraconazole", enzyme: "CYP3A4", role: "inhibitor" },
    labelDrug: "Sporanox (itraconazole)",
    labelSection: "CONTRAINDICATIONS",
    quote:
      "Coadministration with venetoclax is contraindicated in patients with CLL/SLL during the dose initiation and ramp-up phase of venetoclax",
    labelExample: "venetoclax",
    condition: "phase",
    scope: VENETOCLAX_SCOPE,
    basis: "named",
    url: SPORANOX,
    retrieved: "2026-10-28",
  },
  {
    id: "posaconazole+venetoclax",
    labelDrugId: "posaconazole",
    otherId: "venetoclax",
    target: { kind: "pk", perpId: "posaconazole", enzyme: "CYP3A4", role: "inhibitor" },
    labelDrug: "Noxafil (posaconazole)",
    labelSection: "4 CONTRAINDICATIONS",
    quote:
      "Coadministration of Noxafil with venetoclax at initiation and during the ramp-up phase is contraindicated in patients with chronic lymphocytic leukemia (CLL) or small lymphocytic lymphoma (SLL)",
    labelExample: "venetoclax",
    condition: "phase",
    scope: VENETOCLAX_SCOPE,
    basis: "named",
    url: NOXAFIL,
    retrieved: "2026-10-28",
  },
  inspra("spironolactone", "spironolactone", "named"),
  inspra("spironolactone-derm", "spironolactone", "named"),
  inspra("spironolactone-hctz", "spironolactone", "combination"),
  inspra("amiloride", "amiloride", "named"),
  inspra("triamterene", "triamterene", "named"),
  inspra("hydrochlorothiazide-triamterene", "triamterene", "combination"),
  inspra("potassium", "potassium supplements", "named"),
  inspra("potassium-chloride", "potassium supplements", "named"),
];

const BY_PAIR = new Map<string, LabelConditionalLine>();
for (const r of LABEL_CONDITIONAL_LINES) BY_PAIR.set([r.labelDrugId, r.otherId].sort().join("|"), r);

/** Conditional line for an unordered pair of catalog ids, if a saved label carries one. */
export function labelConditionalFor(a: string, b: string): LabelConditionalLine | undefined {
  return BY_PAIR.get([a, b].sort().join("|"));
}

/** True when the pair gets the Inspra eplerenone × potassium card (engine rule `pd-mra-k`). */
export function isInspraPotassiumPair(a: string, b: string): boolean {
  const line = labelConditionalFor(a, b);
  return line?.target.kind === "pd" && line.target.suffix === "pd-mra-k";
}

const UNKNOWN: Record<LabelConditionKind, string> = {
  dose: "the dose",
  indication: "the indication",
  phase: "the treatment phase",
};

/** Plain sentence appended to the finding the line rides on. No dose. */
export function labelConditionalSentence(r: LabelConditionalLine, f: Pick<Finding, "severity">): string {
  return `The ${r.labelDrug} label lists this combination under Contraindications only ${r.scope}. This desk does not know ${UNKNOWN[r.condition]}, so this card stays at ${SEVERITY_LABEL[f.severity]} and is not shown as Avoid together.`;
}

/** Does this finding carry the line's target? */
export function isConditionalTarget(r: LabelConditionalLine, f: Finding): boolean {
  const t = r.target;
  if (t.kind === "pd") return f.kind === "pd" && f.id.endsWith(`__${t.suffix}`);
  if (f.kind !== "pk" || !f.enzymes.includes(t.enzyme) || !f.tags.includes(t.role)) return false;
  const victim = t.perpId === r.labelDrugId ? r.otherId : r.labelDrugId;
  return f.drugIds[0] === t.perpId && f.drugIds[1] === victim;
}
