/**
 * Duplicate catalog rows that disagree (2026-11-07 draft for Kaleb).
 *
 * Each edit makes a duplicate row agree with the label-backed row for the same
 * product, on the fields the saved source covers. `before` is origin/main at
 * da80f1e; `after` is this branch. scripts/duplicate-rows.ts rebuilds the
 * "before" scan from these values, and duplicate-rows.test.ts checks that the
 * catalog matches `after` and that each fixture quote is verbatim.
 *
 * Enzyme strings use the catalog-clinic code (`i:CYP2D6:strong` and so on).
 * Educational reference only. Not FDA-cleared. No doses.
 */
import type { PdFlag } from "../types";

export interface RowFields {
  enzymes?: string;
  pd?: PdFlag[];
  brands?: string[];
  aliases?: string[];
}

export interface DuplicateRowEdit {
  ref: string;
  /** The row this edit changes. */
  id: string;
  /** The label-backed row it now agrees with. */
  matches: string;
  before: RowFields;
  after: RowFields;
  /** Short verbatim quote(s) behind the change, with where each is saved. */
  quote: string;
  why: string;
  /** Changes search only (no engine field), so no pair grade can move. */
  searchOnly?: boolean;
}

export const BUPROPION_SPL_SETID = "334e5635-e4cc-cf2a-e063-6294a90ae1e1";
export const BUPROPION_SEIZURE_QUOTE = "Bupropion hydrochloride tablets are contraindicated in patients with a seizure disorder.";
export const BUPROPION_MAOI_QUOTE =
  "There is an increased risk of hypertensive reactions when bupropion hydrochloride tablets are used concomitantly with MAOIs.";
/** FDA Table 1 cells, as transcribed in fda-ddi-table.ts. */
export const FDA_CELL_BUPROPION_2D6 = "2D6 strong inhibitor";
export const FDA_CELL_DXM_2D6 = "2D6 sensitive substrate";
/** Lybalvi section 4 fragment saved in label-gold-set.ts (wave 7 note). */
export const LYBALVI_OPIOID_FRAGMENT = "patients using opioids";
/** Epidiolex sentence saved in docs/validation/strength-audit-2026-10-19.md. */
export const EPIDIOLEX_2C19_QUOTE = "Cannabidiol is a moderate inhibitor of CYP2C19";

export const DUPLICATE_ROW_EDITS: readonly DuplicateRowEdit[] = [
  {
    ref: "E1",
    id: "dextromethorphan-bupropion",
    matches: "auvelity",
    before: { enzymes: "", pd: ["serotonergic"] },
    after: { enzymes: "i:CYP2D6:strong;s:CYP2D6:major", pd: ["serotonergic", "seizure-lowering"] },
    quote: `FDA Table 1 (fda-ddi-table.ts): bupropion "${FDA_CELL_BUPROPION_2D6}"; dextromethorphan "${FDA_CELL_DXM_2D6}". Bupropion tablets section 4 (fixture): "${BUPROPION_SEIZURE_QUOTE}"`,
    why: "Auvelity is dextromethorphan with bupropion. The `auvelity` row already carries bupropion's CYP2D6 inhibition, dextromethorphan as the CYP2D6 victim, and the seizure-threshold flag; the second Auvelity row carried only serotonergic. It now carries the same roles, so the product reads the same whichever row search returns.",
  },
  {
    ref: "E2",
    id: "olanzapine-samidorphan",
    matches: "lybalvi",
    before: { pd: ["cns-depressant"] },
    after: { pd: ["opioid-antagonist", "cns-depressant"] },
    quote: `Lybalvi section 4, saved as a fragment in label-gold-set.ts ("wave 7: Lybalvi + opioids"): contraindicated in "${LYBALVI_OPIOID_FRAGMENT}"`,
    why: "Samidorphan is the opioid antagonist in Lybalvi, and its section 4 contraindicates the product in patients using opioids. The `lybalvi` row carries the opioid-antagonist flag (precipitated withdrawal card with opioids); the second Lybalvi row did not, so Lybalvi with oxycodone or fentanyl showed only a sedation card. The CYP1A2 role is not copied (no saved source).",
  },
  {
    ref: "E3",
    id: "cannabidiol",
    matches: "cannabidiol-epidiolex",
    before: { brands: ["Epidiolex"], aliases: ["cbd", "epidiolex"] },
    after: { brands: [], aliases: ["cbd"] },
    quote: `Epidiolex label, quoted in strength-audit-2026-10-19.md: "${EPIDIOLEX_2C19_QUOTE}"`,
    why: "Searching \"Epidiolex\" returned the unbranded CBD row first, which grades CYP2C19 inhibition as strong. The Epidiolex label calls cannabidiol a moderate CYP2C19 inhibitor, which is what `cannabidiol-epidiolex` already says, and the 2026-10-19 audit kept `cannabidiol` strong because it is \"unregulated CBD, not Epidiolex\". The brand and alias now sit only on the Epidiolex row. No engine field changes, so no pair grade moves.",
    searchOnly: true,
  },
];
