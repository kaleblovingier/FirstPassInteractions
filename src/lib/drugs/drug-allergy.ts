/**
 * Drug allergy and adverse drug reaction (ADR) teaching engine.
 *
 * Four pieces a learner meets on rounds:
 *   1. PEN-FAST: a bedside rule that sorts a penicillin allergy label by risk.
 *   2. Beta-lactam R1 side chains: why cross-reactivity follows the side chain, not the class.
 *   3. Naranjo: a ten-question causality score for a suspected ADR.
 *   4. Severe cutaneous adverse reactions (SCAR): latency, usual culprits, HLA links.
 *
 * Teaching only. Not an allergy assessment, a test result, or an order.
 *
 * Sources:
 *   Trubiano JA, et al. JAMA Intern Med 2020;180(5):745–752 (PEN-FAST).
 *   Copaescu AM, et al. JAMA Intern Med 2023;183(9):944–952 (PALACE).
 *   Khan DA, et al. J Allergy Clin Immunol 2022;150(6):1333–1393 (drug allergy practice parameter).
 *   Zagursky RJ, Pichichero ME. J Allergy Clin Immunol Pract 2018;6(1):72–81.
 *   Blumenthal KG, et al. Lancet 2019;393:183–198.
 *   Naranjo CA, et al. Clin Pharmacol Ther 1981;30(2):239–245.
 *   Strom BL, et al. N Engl J Med 2003;349:1628–1635.
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";

export const ALLERGY_DISCLAIMER =
  "Teaching framework, not an allergy assessment or an order. Risk rules and side-chain tables are population tools; the patient's history, the labeling, and an allergy specialist govern any challenge or avoidance decision.";

export const ALLERGY_CITATIONS: string[] = [
  "Trubiano JA, Vogrin S, Chua KYL, et al. Development and validation of a penicillin allergy clinical decision rule (PEN-FAST). JAMA Intern Med 2020;180(5):745–752.",
  "Copaescu AM, Vogrin S, James F, et al. Efficacy of a clinical decision rule to enable direct oral challenge in patients with low-risk penicillin allergy: the PALACE randomized clinical trial. JAMA Intern Med 2023;183(9):944–952.",
  "Khan DA, Banerji A, Blumenthal KG, et al. Drug allergy: a 2022 practice parameter update. J Allergy Clin Immunol 2022;150(6):1333–1393.",
  "Zagursky RJ, Pichichero ME. Cross-reactivity in β-lactam allergy. J Allergy Clin Immunol Pract 2018;6(1):72–81.",
  "Blumenthal KG, Peter JG, Trubiano JA, Phillips EJ. Antibiotic allergy. Lancet 2019;393(10167):183–198.",
  "Naranjo CA, Busto U, Sellers EM, et al. A method for estimating the probability of adverse drug reactions. Clin Pharmacol Ther 1981;30(2):239–245.",
  "Strom BL, Schinnar R, Apter AJ, et al. Absence of cross-reactivity between sulfonamide antibiotics and sulfonamide nonantibiotics. N Engl J Med 2003;349(17):1628–1635.",
  "Sassolas B, Haddad C, Mockenhaupt M, et al. ALDEN, an algorithm for assessment of drug causality in Stevens–Johnson syndrome and toxic epidermal necrolysis. Clin Pharmacol Ther 2010;88(1):60–68.",
  "Kardaun SH, Sidoroff A, Valeyrie-Allanore L, et al. Variability in the clinical pattern of cutaneous side-effects of drugs with systemic symptoms: does a DRESS syndrome really exist? Br J Dermatol 2007;156(3):609–611.",
];

/* ── PEN-FAST ─────────────────────────────────────────────────────────── */

export interface PenFastInput {
  /** F: the penicillin allergy reaction happened 5 years ago or less (2 points). */
  withinFiveYears: boolean;
  /** A / S: anaphylaxis or angioedema, OR a severe cutaneous adverse reaction (2 points). */
  anaphylaxisOrScar: boolean;
  /** T: the reaction needed treatment (1 point). */
  treatmentRequired: boolean;
}

export type PenFastBand = "very-low" | "low" | "moderate" | "high";

export interface PenFastResult {
  score: number;
  band: PenFastBand;
  /** Approximate chance of a positive penicillin allergy test in the derivation cohort. */
  riskText: string;
  /** Score under 3. */
  lowRisk: boolean;
  teaching: string;
}

export const PEN_FAST_ITEMS: { key: keyof PenFastInput; letter: string; label: string; points: number }[] = [
  { key: "withinFiveYears", letter: "F", label: "Reaction 5 years ago or less", points: 2 },
  { key: "anaphylaxisOrScar", letter: "A / S", label: "Anaphylaxis or angioedema, or a severe cutaneous reaction", points: 2 },
  { key: "treatmentRequired", letter: "T", label: "The reaction needed treatment", points: 1 },
];

export const PEN_FAST_MNEMONIC =
  "PEN = a penicillin allergy reported by the patient. F = five years or less (2). A = anaphylaxis or angioedema, S = severe cutaneous reaction (2 for either). T = treatment required (1).";

export function penFast(input: PenFastInput): PenFastResult {
  const score = (input.withinFiveYears ? 2 : 0) + (input.anaphylaxisOrScar ? 2 : 0) + (input.treatmentRequired ? 1 : 0);
  let band: PenFastBand;
  let riskText: string;
  if (score === 0) {
    band = "very-low";
    riskText = "Very low risk: under 1% chance of a positive penicillin allergy test.";
  } else if (score <= 2) {
    band = "low";
    riskText = "Low risk: about 5% chance of a positive penicillin allergy test.";
  } else if (score === 3) {
    band = "moderate";
    riskText = "Moderate risk: about 20% chance of a positive penicillin allergy test.";
  } else {
    band = "high";
    riskText = "High risk: about 50% chance of a positive penicillin allergy test.";
  }
  const lowRisk = score < 3;
  const teaching = lowRisk
    ? "Score under 3 is low risk. In the PALACE trial, a direct oral amoxicillin challenge in this group was as safe as skin testing first. Published practice treats these patients as candidates for a supervised challenge. A history of a severe cutaneous reaction is still a hard stop, whatever the score."
    : "Score 3 or more. The PALACE trial did not test direct challenge here. Published practice routes these patients to allergy evaluation, often with skin testing, before any challenge.";
  return { score, band, riskText, lowRisk, teaching };
}

/* ── Beta-lactam R1 side chains ───────────────────────────────────────── */

export type BetaLactamClass = "penicillin" | "cephalosporin" | "carbapenem" | "monobactam";

export interface BetaLactamRow {
  id: string;
  name: string;
  cls: BetaLactamClass;
  /** Key of the R1 (C-6 for penicillins, C-7 for cephalosporins) side chain group. */
  r1: string;
  note?: string;
}

/** Human names for the R1 group keys. */
export const R1_GROUP_LABEL: Record<string, string> = {
  benzyl: "Benzyl",
  phenoxymethyl: "Phenoxymethyl",
  aminobenzyl: "Aminobenzyl",
  "ureido-piperazine": "Piperazine-ureido (piperacillin)",
  naphthyl: "Ethoxynaphthyl (nafcillin)",
  isoxazolyl: "Isoxazolyl",
  thienyl: "Thienyl",
  tetrazolyl: "Tetrazolyl (cefazolin)",
  "dithietane": "Dithietane (cefotetan)",
  "methoxyimino-furyl": "Methoxyimino-furyl",
  "methoxyimino-aminothiazolyl": "Methoxyimino-aminothiazolyl",
  "aminothiazolyl-other": "Aminothiazolyl (cefdinir, cefixime)",
  "carboxypropyl-oxyimino-aminothiazolyl": "Carboxypropyl-oxyimino-aminothiazolyl",
  ceftolozane: "Aminothiadiazolyl (ceftolozane)",
  ceftaroline: "Ethoxyimino-thiadiazolyl (ceftaroline)",
  carbapenem: "Carbapenem hydroxyethyl",
};

/** Every id here is checked against DRUG_BY_ID by the tests. */
export const BETA_LACTAMS: BetaLactamRow[] = [
  { id: "penicillin-g", name: "Penicillin G", cls: "penicillin", r1: "benzyl" },
  { id: "penicillin-v", name: "Penicillin V", cls: "penicillin", r1: "phenoxymethyl" },
  { id: "ampicillin", name: "Ampicillin", cls: "penicillin", r1: "aminobenzyl" },
  { id: "ampicillin-sulbactam", name: "Ampicillin–sulbactam", cls: "penicillin", r1: "aminobenzyl" },
  { id: "amoxicillin", name: "Amoxicillin", cls: "penicillin", r1: "aminobenzyl", note: "Hydroxy-aminobenzyl R1." },
  { id: "piperacillin", name: "Piperacillin", cls: "penicillin", r1: "ureido-piperazine" },
  { id: "piperacillin-tazobactam", name: "Piperacillin–tazobactam", cls: "penicillin", r1: "ureido-piperazine" },
  { id: "nafcillin", name: "Nafcillin", cls: "penicillin", r1: "naphthyl" },
  { id: "oxacillin", name: "Oxacillin", cls: "penicillin", r1: "isoxazolyl" },
  { id: "dicloxacillin", name: "Dicloxacillin", cls: "penicillin", r1: "isoxazolyl" },
  { id: "cephalexin", name: "Cephalexin", cls: "cephalosporin", r1: "aminobenzyl" },
  { id: "cefadroxil", name: "Cefadroxil", cls: "cephalosporin", r1: "aminobenzyl", note: "Hydroxy-aminobenzyl R1, like amoxicillin." },
  { id: "cefaclor", name: "Cefaclor", cls: "cephalosporin", r1: "aminobenzyl" },
  { id: "cefprozil", name: "Cefprozil", cls: "cephalosporin", r1: "aminobenzyl", note: "Hydroxy-aminobenzyl R1, like amoxicillin." },
  { id: "cefazolin", name: "Cefazolin", cls: "cephalosporin", r1: "tetrazolyl", note: "Unique R1. Shares no R1 with other marketed beta-lactams." },
  { id: "cefoxitin", name: "Cefoxitin", cls: "cephalosporin", r1: "thienyl" },
  { id: "cefotetan", name: "Cefotetan", cls: "cephalosporin", r1: "dithietane" },
  { id: "cefuroxime", name: "Cefuroxime", cls: "cephalosporin", r1: "methoxyimino-furyl" },
  { id: "ceftriaxone", name: "Ceftriaxone", cls: "cephalosporin", r1: "methoxyimino-aminothiazolyl" },
  { id: "cefotaxime", name: "Cefotaxime", cls: "cephalosporin", r1: "methoxyimino-aminothiazolyl" },
  { id: "cefepime", name: "Cefepime", cls: "cephalosporin", r1: "methoxyimino-aminothiazolyl" },
  { id: "cefpodoxime", name: "Cefpodoxime", cls: "cephalosporin", r1: "methoxyimino-aminothiazolyl" },
  { id: "cefditoren", name: "Cefditoren", cls: "cephalosporin", r1: "methoxyimino-aminothiazolyl" },
  { id: "cefdinir", name: "Cefdinir", cls: "cephalosporin", r1: "aminothiazolyl-other" },
  { id: "cefixime", name: "Cefixime", cls: "cephalosporin", r1: "aminothiazolyl-other" },
  { id: "ceftazidime", name: "Ceftazidime", cls: "cephalosporin", r1: "carboxypropyl-oxyimino-aminothiazolyl" },
  { id: "ceftazidime-avibactam", name: "Ceftazidime–avibactam", cls: "cephalosporin", r1: "carboxypropyl-oxyimino-aminothiazolyl" },
  { id: "cefiderocol", name: "Cefiderocol", cls: "cephalosporin", r1: "carboxypropyl-oxyimino-aminothiazolyl", note: "R1 matches ceftazidime and aztreonam." },
  { id: "ceftolozane-tazobactam", name: "Ceftolozane–tazobactam", cls: "cephalosporin", r1: "ceftolozane", note: "R1 resembles ceftazidime's." },
  { id: "ceftaroline", name: "Ceftaroline", cls: "cephalosporin", r1: "ceftaroline" },
  { id: "aztreonam", name: "Aztreonam", cls: "monobactam", r1: "carboxypropyl-oxyimino-aminothiazolyl", note: "Same side chain as ceftazidime. Otherwise no cross-reactivity with penicillins." },
  { id: "meropenem", name: "Meropenem", cls: "carbapenem", r1: "carbapenem" },
  { id: "meropenem-vaborbactam", name: "Meropenem–vaborbactam", cls: "carbapenem", r1: "carbapenem" },
  { id: "imipenem-cilastatin", name: "Imipenem–cilastatin", cls: "carbapenem", r1: "carbapenem" },
  { id: "imipenem-relebactam", name: "Imipenem–relebactam", cls: "carbapenem", r1: "carbapenem" },
  { id: "ertapenem", name: "Ertapenem", cls: "carbapenem", r1: "carbapenem" },
  { id: "doripenem", name: "Doripenem", cls: "carbapenem", r1: "carbapenem" },
];

export const BETA_LACTAM_BY_ID: Record<string, BetaLactamRow> = Object.fromEntries(BETA_LACTAMS.map((b) => [b.id, b]));

/** R1 groups that resemble each other without being identical (unordered pairs). */
const SIMILAR_R1: [string, string][] = [
  ["benzyl", "phenoxymethyl"],
  ["benzyl", "thienyl"],
  ["methoxyimino-aminothiazolyl", "methoxyimino-furyl"],
  ["methoxyimino-aminothiazolyl", "aminothiazolyl-other"],
  ["methoxyimino-aminothiazolyl", "ceftaroline"],
  ["carboxypropyl-oxyimino-aminothiazolyl", "ceftolozane"],
];

function r1Similar(a: string, b: string): boolean {
  return SIMILAR_R1.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export type CrossLevel = "identical-r1" | "similar-r1" | "dissimilar" | "same-drug";

export interface CrossReactivityResult {
  level: CrossLevel;
  why: string;
  /** Both are penicillins: they share the penicillin core, so R1 is not the whole story. */
  coreShared: boolean;
  /** Both ids are in the teaching table. */
  known: boolean;
}

export function crossReactivity(culpritId: string, candidateId: string): CrossReactivityResult {
  const a = BETA_LACTAM_BY_ID[culpritId];
  const b = BETA_LACTAM_BY_ID[candidateId];
  if (culpritId === candidateId) {
    return { level: "same-drug", why: "Same drug. The allergy label applies directly.", coreShared: true, known: Boolean(a) };
  }
  if (!a || !b) {
    return { level: "dissimilar", why: "Not in the side-chain teaching table.", coreShared: false, known: false };
  }
  const coreShared = a.cls === "penicillin" && b.cls === "penicillin";
  const coreNote = coreShared
    ? " Both are penicillins and share the penicillin core, so a true penicillin allergy usually covers both, whatever the R1."
    : "";

  if (a.r1 === b.r1) {
    if (a.r1 === "carbapenem") {
      return {
        level: "identical-r1",
        why: "Carbapenems share the same hydroxyethyl side chain. Treat one carbapenem allergy as a class allergy.",
        coreShared,
        known: true,
      };
    }
    const pair = [a.cls, b.cls].sort().join("+");
    const extra =
      pair === "cephalosporin+monobactam"
        ? " This is the one place aztreonam cross-reacts."
        : pair === "cephalosporin+penicillin"
          ? " Shared R1 drives most penicillin–cephalosporin cross-reactions."
          : "";
    return {
      level: "identical-r1",
      why: `Identical R1 side chain (${R1_GROUP_LABEL[a.r1] ?? a.r1}).${extra}${coreNote}`,
      coreShared,
      known: true,
    };
  }

  if (r1Similar(a.r1, b.r1)) {
    return {
      level: "similar-r1",
      why: `Similar, not identical, R1 side chains (${R1_GROUP_LABEL[a.r1] ?? a.r1} vs ${R1_GROUP_LABEL[b.r1] ?? b.r1}). Risk is lower than an identical match but not zero.${coreNote}`,
      coreShared,
      known: true,
    };
  }

  let why = "Dissimilar R1 side chains.";
  if (a.cls === "carbapenem" || b.cls === "carbapenem") {
    const other = a.cls === "carbapenem" ? b : a;
    why =
      other.cls === "penicillin"
        ? "Carbapenem and penicillin: cross-reactivity under 1% in penicillin skin-test-positive patients."
        : "Carbapenem against another beta-lactam: dissimilar side chains and low cross-reactivity.";
  } else if (a.cls === "monobactam" || b.cls === "monobactam") {
    why = "Aztreonam does not cross-react with penicillins or with cephalosporins outside the ceftazidime side-chain group.";
  } else if (a.id === "cefazolin" || b.id === "cefazolin") {
    why = "Cefazolin has a unique R1. Most penicillin-allergic patients tolerate it.";
  }
  return { level: "dissimilar", why: `${why}${coreNote}`, coreShared, known: true };
}

/* ── Naranjo ADR probability scale ────────────────────────────────────── */

export type NaranjoAnswer = "yes" | "no" | "unknown";

export interface NaranjoItem {
  id: string;
  question: string;
  points: Record<NaranjoAnswer, number>;
}

export const NARANJO_ITEMS: NaranjoItem[] = [
  { id: "q1", question: "Are there previous conclusive reports on this reaction?", points: { yes: 1, no: 0, unknown: 0 } },
  { id: "q2", question: "Did the adverse event appear after the suspected drug was given?", points: { yes: 2, no: -1, unknown: 0 } },
  { id: "q3", question: "Did the reaction improve when the drug was stopped or a specific antagonist was given?", points: { yes: 1, no: 0, unknown: 0 } },
  { id: "q4", question: "Did the reaction reappear when the drug was given again?", points: { yes: 2, no: -1, unknown: 0 } },
  { id: "q5", question: "Are there alternative causes that could on their own have caused the reaction?", points: { yes: -1, no: 2, unknown: 0 } },
  { id: "q6", question: "Did the reaction reappear when a placebo was given?", points: { yes: -1, no: 1, unknown: 0 } },
  { id: "q7", question: "Was the drug detected in blood or other fluids in toxic concentrations?", points: { yes: 1, no: 0, unknown: 0 } },
  { id: "q8", question: "Was the reaction worse when the dose was raised, or milder when it was lowered?", points: { yes: 1, no: 0, unknown: 0 } },
  { id: "q9", question: "Did the patient have a similar reaction to the same or a similar drug before?", points: { yes: 1, no: 0, unknown: 0 } },
  { id: "q10", question: "Was the adverse event confirmed by any objective evidence?", points: { yes: 1, no: 0, unknown: 0 } },
];

export type NaranjoBand = "definite" | "probable" | "possible" | "doubtful";

export interface NaranjoResult {
  score: number;
  band: NaranjoBand;
}

export function naranjoBand(score: number): NaranjoBand {
  if (score >= 9) return "definite";
  if (score >= 5) return "probable";
  if (score >= 1) return "possible";
  return "doubtful";
}

/**
 * Score the ten answers. Accepts an array in item order or a record keyed by item id.
 * Missing answers count as "unknown" (0 points).
 */
export function naranjo(
  answers: ReadonlyArray<NaranjoAnswer | undefined> | Partial<Record<string, NaranjoAnswer>>,
): NaranjoResult {
  const pick = (i: number, id: string): NaranjoAnswer => {
    const v = Array.isArray(answers)
      ? (answers as ReadonlyArray<NaranjoAnswer | undefined>)[i]
      : (answers as Partial<Record<string, NaranjoAnswer>>)[id];
    return v === "yes" || v === "no" ? v : "unknown";
  };
  const score = NARANJO_ITEMS.reduce((s, item, i) => s + item.points[pick(i, item.id)], 0);
  return { score, band: naranjoBand(score) };
}

/* ── Severe cutaneous adverse reactions ───────────────────────────────── */

export interface HlaNote {
  allele: string;
  drugs: string;
  note: string;
}

export interface ScarProfile {
  key: "sjs-ten" | "dress" | "agep";
  name: string;
  latency: string;
  features: string;
  /** Catalog ids of classic culprits (verified against DRUG_BY_ID). */
  culpritIds: string[];
  /** Culprits named for teaching, whether or not they are in the catalog. */
  culpritNames: string[];
  hla: HlaNote[];
  causalityTool: string;
}

const AGEP_BETA_LACTAM_IDS = BETA_LACTAMS.filter((b) => b.cls === "penicillin" || b.cls === "cephalosporin").map((b) => b.id);

export const SCAR_PROFILES: ScarProfile[] = [
  {
    key: "sjs-ten",
    name: "Stevens–Johnson syndrome / toxic epidermal necrolysis",
    latency: "4–28 days after the drug starts",
    features: "Dusky target-like lesions, blisters and skin detachment, with two or more mucosal sites. Under 10% body surface is SJS; over 30% is TEN.",
    culpritIds: ["allopurinol", "carbamazepine", "oxcarbazepine", "lamotrigine", "phenytoin", "fosphenytoin", "tmp-smx", "nevirapine"],
    culpritNames: ["Allopurinol", "Carbamazepine", "Lamotrigine", "Phenytoin", "Sulfamethoxazole", "Nevirapine"],
    hla: [
      { allele: "HLA-B*15:02", drugs: "Carbamazepine, oxcarbazepine, phenytoin", note: "Strongest in people of Southeast Asian ancestry. The carbamazepine label asks for screening in at-risk ancestry before starting." },
      { allele: "HLA-B*58:01", drugs: "Allopurinol", note: "Raises SJS/TEN and DRESS risk. More common in Han Chinese, Korean, Thai and African ancestry." },
    ],
    causalityTool: "ALDEN (Sassolas 2010) scores drug causality in SJS/TEN.",
  },
  {
    key: "dress",
    name: "Drug reaction with eosinophilia and systemic symptoms (DRESS)",
    latency: "2–8 weeks after the drug starts",
    features: "Fever, widespread rash, facial swelling, enlarged lymph nodes, eosinophilia or atypical lymphocytes, and organ involvement (most often liver). Can relapse for weeks.",
    culpritIds: ["carbamazepine", "oxcarbazepine", "phenytoin", "fosphenytoin", "lamotrigine", "phenobarbital", "allopurinol", "vancomycin", "tmp-smx", "sulfasalazine", "minocycline"],
    culpritNames: ["Aromatic anticonvulsants", "Allopurinol", "Vancomycin", "Sulfonamides", "Minocycline"],
    hla: [
      { allele: "HLA-A*31:01", drugs: "Carbamazepine", note: "Linked to DRESS and other carbamazepine reactions across many ancestries, including European and Japanese." },
      { allele: "HLA-B*58:01", drugs: "Allopurinol", note: "Also raises DRESS risk." },
    ],
    causalityTool: "The RegiSCAR score (Kardaun 2007) grades how well a case fits DRESS.",
  },
  {
    key: "agep",
    name: "Acute generalized exanthematous pustulosis (AGEP)",
    latency: "Usually under 48 hours for antibiotics; up to several days for other drugs",
    features: "Many small sterile pustules on red, swollen skin, often starting in skin folds, with fever and neutrophilia. Usually clears within about two weeks of stopping the drug.",
    culpritIds: [...AGEP_BETA_LACTAM_IDS, "azithromycin", "clarithromycin", "erythromycin", "hydroxychloroquine", "diltiazem"],
    culpritNames: ["Beta-lactams (aminopenicillins most often)", "Macrolides", "Hydroxychloroquine", "Diltiazem"],
    hla: [],
    causalityTool: "The EuroSCAR AGEP validation score grades how well a case fits AGEP.",
  },
];

export const SCAR_RECHALLENGE_RULE =
  "A history of SJS/TEN, DRESS or AGEP is an absolute contraindication to rechallenge. No test dose, no graded challenge, no desensitization with the culprit.";

/* ── Sulfonamides ─────────────────────────────────────────────────────── */

export type SulfonamideKind = "arylamine-antimicrobial" | "arylamine-other" | "non-arylamine";

export interface SulfonamideRow {
  id: string;
  name: string;
  kind: SulfonamideKind;
}

export const SULFONAMIDES: SulfonamideRow[] = [
  { id: "tmp-smx", name: "Trimethoprim–sulfamethoxazole", kind: "arylamine-antimicrobial" },
  { id: "sulfasalazine", name: "Sulfasalazine", kind: "arylamine-other" },
  { id: "furosemide", name: "Furosemide", kind: "non-arylamine" },
  { id: "bumetanide", name: "Bumetanide", kind: "non-arylamine" },
  { id: "torsemide", name: "Torsemide", kind: "non-arylamine" },
  { id: "hctz", name: "Hydrochlorothiazide", kind: "non-arylamine" },
  { id: "chlorthalidone", name: "Chlorthalidone", kind: "non-arylamine" },
  { id: "indapamide", name: "Indapamide", kind: "non-arylamine" },
  { id: "metolazone", name: "Metolazone", kind: "non-arylamine" },
  { id: "acetazolamide", name: "Acetazolamide", kind: "non-arylamine" },
  { id: "topiramate", name: "Topiramate", kind: "non-arylamine" },
  { id: "zonisamide", name: "Zonisamide", kind: "non-arylamine" },
  { id: "celecoxib", name: "Celecoxib", kind: "non-arylamine" },
  { id: "glipizide", name: "Glipizide", kind: "non-arylamine" },
  { id: "glyburide", name: "Glyburide", kind: "non-arylamine" },
  { id: "sumatriptan", name: "Sumatriptan", kind: "non-arylamine" },
];

export const SULFONAMIDE_NOTE =
  "Antimicrobial sulfonamides carry an arylamine at N4 and an N1 heterocyclic ring; most non-antimicrobial sulfonamides carry neither. A sulfa antibiotic allergy does not predict a reaction to a non-antimicrobial sulfonamide. Patients with one drug allergy react to unrelated drugs more often, which explains the old association (Strom 2003).";

/* ── Desk detection and report ────────────────────────────────────────── */

const SCAR_CULPRIT_IDS = new Set(
  SCAR_PROFILES.filter((p) => p.key !== "agep").flatMap((p) => p.culpritIds),
);
const SULFA_BY_ID: Record<string, SulfonamideRow> = Object.fromEntries(SULFONAMIDES.map((s) => [s.id, s]));

export interface AllergyDeskDetection {
  hasAllergyRelevant: boolean;
  betaLactamIds: string[];
  /** SJS/TEN or DRESS classic culprits on the tray. */
  scarRiskIds: string[];
  sulfonamideIds: string[];
  matchedIds: string[];
}

export function allergyOnDesk(ids: string[]): AllergyDeskDetection {
  const uniq = [...new Set(ids)];
  const betaLactamIds = uniq.filter((id) => id in BETA_LACTAM_BY_ID);
  const scarRiskIds = uniq.filter((id) => SCAR_CULPRIT_IDS.has(id));
  const sulfonamideIds = uniq.filter((id) => id in SULFA_BY_ID);
  const hit = new Set([...betaLactamIds, ...scarRiskIds, ...sulfonamideIds]);
  const matchedIds = uniq.filter((id) => hit.has(id));
  return { hasAllergyRelevant: matchedIds.length > 0, betaLactamIds, scarRiskIds, sulfonamideIds, matchedIds };
}

/** Which SCAR profiles list this id as a culprit. */
export function scarProfilesFor(id: string): ScarProfile[] {
  return SCAR_PROFILES.filter((p) => p.culpritIds.includes(id));
}

export interface AllergyReport {
  detection: AllergyDeskDetection;
  notes: string[];
  citations: string[];
  disclaimer: string;
}

const nameOf = (id: string) => DRUG_BY_ID[id]?.name ?? BETA_LACTAM_BY_ID[id]?.name ?? SULFA_BY_ID[id]?.name ?? id;

export function allergyReportOnDesk(ids: string[], _host?: HostContext): AllergyReport {
  const detection = allergyOnDesk(ids);
  const notes: string[] = [];

  if (detection.betaLactamIds.length > 0) {
    notes.push(
      `Beta-lactam on the tray: ${detection.betaLactamIds.map(nameOf).join(", ")}. About 10% of patients carry a penicillin allergy label, and over 90% of them tolerate penicillin when tested. PEN-FAST sorts the label; the R1 side chain predicts cross-reactivity.`,
    );
    const pairs: string[] = [];
    const bl = detection.betaLactamIds;
    for (let i = 0; i < bl.length; i++) {
      for (let j = i + 1; j < bl.length; j++) {
        const c = crossReactivity(bl[i], bl[j]);
        if (c.level === "identical-r1") pairs.push(`${nameOf(bl[i])} and ${nameOf(bl[j])}`);
      }
    }
    if (pairs.length > 0) notes.push(`Identical R1 side chains on the tray: ${pairs.join("; ")}.`);
  }

  if (detection.scarRiskIds.length > 0) {
    notes.push(
      `Classic SJS/TEN or DRESS culprit on the tray: ${detection.scarRiskIds.map(nameOf).join(", ")}. ${SCAR_RECHALLENGE_RULE}`,
    );
    const hlaHits: string[] = [];
    if (detection.scarRiskIds.some((id) => ["carbamazepine", "oxcarbazepine", "phenytoin", "fosphenytoin"].includes(id))) {
      hlaHits.push("HLA-B*15:02 (carbamazepine, oxcarbazepine, phenytoin)");
    }
    if (detection.scarRiskIds.includes("carbamazepine")) hlaHits.push("HLA-A*31:01 (carbamazepine)");
    if (detection.scarRiskIds.includes("allopurinol")) hlaHits.push("HLA-B*58:01 (allopurinol)");
    if (hlaHits.length > 0) notes.push(`HLA links to know: ${hlaHits.join("; ")}.`);
  }

  if (detection.sulfonamideIds.length > 0) {
    const anti = detection.sulfonamideIds.filter((id) => SULFA_BY_ID[id].kind !== "non-arylamine");
    const non = detection.sulfonamideIds.filter((id) => SULFA_BY_ID[id].kind === "non-arylamine");
    if (anti.length > 0) notes.push(`Arylamine sulfonamide on the tray: ${anti.map(nameOf).join(", ")}.`);
    if (non.length > 0) notes.push(`Non-antimicrobial sulfonamide on the tray: ${non.map(nameOf).join(", ")}.`);
    notes.push(SULFONAMIDE_NOTE);
  }

  return { detection, notes, citations: ALLERGY_CITATIONS, disclaimer: ALLERGY_DISCLAIMER };
}
