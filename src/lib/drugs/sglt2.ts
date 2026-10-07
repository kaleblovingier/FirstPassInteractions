/**
 * SGLT2 Inhibitor Homeostasis, Euglycemic DKA (euDKA) & Perioperative Hold Station.
 *
 * Educational clinical pharmacology reference synthesizing:
 * 1. Euglycemic Diabetic Ketoacidosis (euDKA):
 *    - Diagnostic Trap: Blood glucose < 250 mg/dL (often 150-200 mg/dL or near-normal)
 *      with high anion gap metabolic acidosis (pH < 7.30, HCO3 < 18), elevated serum
 *      beta-hydroxybutyrate (>= 3.0 mmol/L), and ketonuria.
 *    - Pathophysiology: Glycosuria maintains near-normal serum glucose while blunted insulin /
 *      surging glucagon drive lipolysis, hepatic ketogenesis, and severe dehydration.
 *    - Emergency Resuscitation Rule: Co-administer IV Dextrose (D5W/D10W) early with IV insulin
 *      infusion to clear ketonemia without inducing severe hypoglycemia.
 * 2. FDA Perioperative Hold Schedule:
 *    - Empagliflozin (Jardiance), Dapagliflozin (Farxiga), Canagliflozin (Invokana): Hold >= 3 days prior.
 *    - Ertugliflozin (Steglatro): Hold >= 4 days prior to major surgery.
 *    - Sotagliflozin (Inpefa): Hold >= 3 days prior.
 *    - Resume only once oral feeding is fully re-established and surgical stress catabolism resolves.
 * 3. Cardiorenal Protection vs Glycemic eGFR Thresholds:
 *    - Glycemic efficacy declines when eGFR < 45 mL/min/1.73m2.
 *    - Cardiorenal benefits (HFrEF, HFpEF, CKD) persist down to eGFR 20-25 mL/min/1.73m2 (DAPA-CKD, EMPA-KIDNEY).
 *    - Reassuring Initial eGFR Dip: Acute 2-4 mL/min drop reflects restored tubuloglomerular feedback
 *      and afferent vasoconstriction, not structural tubular toxicity.
 * 4. Serious Safety Rails & Collisions:
 *    - Fournier's Gangrene: Necrotizing fasciitis of the perineum requiring emergent surgical debridement.
 *    - "Triple Whammy" AKI Collision: SGLT2i + Loop Diuretic + ACEi/ARB + NSAID causing acute prerenal failure.
 *    - Mycotic Genital Infections & Lower Extremity Amputation monitoring.
 *
 * Strictly non-prescriptive educational reference. Not an FDA-cleared clinical decision
 * support tool, not an order set, and not a dosing directive. The FDA-approved Prescribing
 * Information, surgical pre-op guidelines, and attending clinician govern.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { PI_FOOTER, NOT_CLEARED } from "../regulatory";

export type Sglt2AgentId =
  | "empagliflozin"
  | "dapagliflozin"
  | "canagliflozin"
  | "ertugliflozin"
  | "sotagliflozin"
  | "empagliflozin-linagliptin"
  | "empagliflozin-metformin"
  | "dapagliflozin-metformin";

export interface Sglt2AgentProfile {
  id: Sglt2AgentId;
  name: string;
  brand: string;
  selectivity: string; // SGLT2 vs SGLT1/2
  preopHoldDays: number;
  glycemicEgfrThreshold: number; // eGFR below which glycemic efficacy blunts
  cardiorenalEgfrCutoff: number; // lowest eGFR for initiating/continuing cardiorenal indication
  contraindicatedEgfr: number; // eGFR below which contraindicated (typically dialysis)
  hasAmputationPrecaution: boolean;
}

export interface EuDkaEvaluation {
  isEuDkaSuspected: boolean;
  glucoseMgDl: number;
  anionGap: number;
  betaHydroxybutyrateMmolL: number;
  bicarbonateMeqL: number;
  arterialPh: number;
  headline: string;
  diagnosticTrapAlert: string;
  resuscitationGuidance: {
    dextroseInsulinCoadministration: string;
    fluidResuscitation: string;
    sglt2Discontinuation: string;
    ketoneClearanceTarget: string;
  };
  precipitatingTriggers: string[];
}

export interface PerioperativeHoldSchedule {
  agentName: string;
  recommendedHoldDays: number;
  surgeryTimingNote: string;
  resumptionCriteria: string;
  urgentSurgeryProtocol: string;
}

export interface RenalIndicationRail {
  agentName: string;
  currentEgfr: number;
  glycemicStatus: "effective" | "blunted" | "ineffective";
  cardiorenalStatus: "indicated" | "caution-dose-reduce" | "contraindicated-dialysis";
  initialEgfrDipReassurance: string;
}

export interface Sglt2Collision {
  drugId: string;
  drugName: string;
  category: "volume-depletion" | "triple-whammy-aki" | "hypoglycemia-secretagogue" | "contrast-nephropathy";
  severity: "major" | "moderate";
  headline: string;
  mechanism: string;
  clinicalAction: string;
}

export interface Sglt2Report {
  hasSglt2: boolean;
  agentsOnDesk: Sglt2AgentProfile[];
  euDkaEval: EuDkaEvaluation;
  preopSchedule: PerioperativeHoldSchedule[];
  renalRails: RenalIndicationRail[];
  collisions: Sglt2Collision[];
  fourniersWarning: string;
  clinicalPearls: string[];
  disclaimer: string;
}

// —— AGENT PROFILES ———————————————————————————————————————————

export const SGLT2_PROFILES: Record<string, Sglt2AgentProfile> = {
  empagliflozin: {
    id: "empagliflozin",
    name: "Empagliflozin",
    brand: "Jardiance",
    selectivity: "Highly selective SGLT2 inhibitor (~2500-fold vs SGLT1)",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 30,
    cardiorenalEgfrCutoff: 20, // EMPA-KIDNEY trial
    contraindicatedEgfr: 0, // Dialysis
    hasAmputationPrecaution: false,
  },
  dapagliflozin: {
    id: "dapagliflozin",
    name: "Dapagliflozin",
    brand: "Farxiga",
    selectivity: "Highly selective SGLT2 inhibitor (~1200-fold vs SGLT1)",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 45,
    cardiorenalEgfrCutoff: 25, // DAPA-CKD / DAPA-HF
    contraindicatedEgfr: 0, // Dialysis
    hasAmputationPrecaution: false,
  },
  canagliflozin: {
    id: "canagliflozin",
    name: "Canagliflozin",
    brand: "Invokana",
    selectivity: "SGLT2 inhibitor with mild intestinal SGLT1 inhibition (~250-fold)",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 45,
    cardiorenalEgfrCutoff: 30, // CREDENCE trial (continue until dialysis)
    contraindicatedEgfr: 0, // Dialysis
    hasAmputationPrecaution: true,
  },
  ertugliflozin: {
    id: "ertugliflozin",
    name: "Ertugliflozin",
    brand: "Steglatro",
    selectivity: "Highly selective SGLT2 inhibitor (~2000-fold vs SGLT1)",
    preopHoldDays: 4, // FDA specifies >= 4 days for ertugliflozin due to longer PD elimination
    glycemicEgfrThreshold: 45,
    cardiorenalEgfrCutoff: 30,
    contraindicatedEgfr: 30,
    hasAmputationPrecaution: false,
  },
  sotagliflozin: {
    id: "sotagliflozin",
    name: "Sotagliflozin",
    brand: "Inpefa",
    selectivity: "Dual SGLT1 and SGLT2 inhibitor (delays GI glucose absorption and renal reabsorption)",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 45,
    cardiorenalEgfrCutoff: 25,
    contraindicatedEgfr: 0, // Dialysis
    hasAmputationPrecaution: false,
  },
  "empagliflozin-linagliptin": {
    id: "empagliflozin-linagliptin",
    name: "Empagliflozin–linagliptin",
    brand: "Glyxambi",
    selectivity: "SGLT2 inhibitor + DPP-4 inhibitor",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 30,
    cardiorenalEgfrCutoff: 20,
    contraindicatedEgfr: 0,
    hasAmputationPrecaution: false,
  },
  "empagliflozin-metformin": {
    id: "empagliflozin-metformin",
    name: "Empagliflozin–metformin",
    brand: "Synjardy",
    selectivity: "SGLT2 inhibitor + Biguanide",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 45, // Limited by metformin eGFR 30-45 cutoffs
    cardiorenalEgfrCutoff: 30,
    contraindicatedEgfr: 30,
    hasAmputationPrecaution: false,
  },
  "dapagliflozin-metformin": {
    id: "dapagliflozin-metformin",
    name: "Dapagliflozin–metformin",
    brand: "Xigduo XR",
    selectivity: "SGLT2 inhibitor + Biguanide",
    preopHoldDays: 3,
    glycemicEgfrThreshold: 45,
    cardiorenalEgfrCutoff: 30,
    contraindicatedEgfr: 30,
    hasAmputationPrecaution: false,
  },
};

export const SGLT2_IDS = new Set(Object.keys(SGLT2_PROFILES));

export const LOOP_DIURETIC_IDS = new Set(["furosemide", "bumetanide", "torsemide"]);
export const THIAZIDE_IDS = new Set(["hydrochlorothiazide", "chlorthalidone", "indapamide", "metolazone"]);
export const SECRETAGOGUE_IDS = new Set(["glipizide", "glimepiride", "glyburide", "repaglinide", "nateglinide"]);
export const INSULIN_IDS = new Set([
  "insulin-regular",
  "insulin-glargine",
  "insulin-detemir",
  "insulin-degludec",
  "insulin-aspart",
  "insulin-lispro",
  "insulin-nph",
]);

/**
 * Checks if SGLT2 inhibitors or interacting agents are present on the active desk tray.
 */
export function sglt2OnDesk(ids: string[]): {
  hasSglt2: boolean;
  sglt2Ids: string[];
  hasLoopDiuretic: boolean;
  hasThiazide: boolean;
  hasNsaid: boolean;
  hasRaas: boolean;
  hasSecretagogue: boolean;
  hasInsulin: boolean;
} {
  const sglt2Ids = ids.filter((id) => SGLT2_IDS.has(id));
  const hasLoopDiuretic = ids.some((id) => LOOP_DIURETIC_IDS.has(id));
  const hasThiazide = ids.some((id) => THIAZIDE_IDS.has(id));
  const hasNsaid = ids.some((id) =>
    ["ibuprofen", "naproxen", "meloxicam", "celecoxib", "ketorolac", "indomethacin", "diclofenac"].includes(id),
  );
  const hasRaas = ids.some((id) =>
    ["lisinopril", "losartan", "valsartan", "sacubitril-valsartan", "enalapril", "ramipril"].includes(id),
  );
  const hasSecretagogue = ids.some((id) => SECRETAGOGUE_IDS.has(id));
  const hasInsulin = ids.some((id) => INSULIN_IDS.has(id));

  return {
    hasSglt2: sglt2Ids.length > 0,
    sglt2Ids,
    hasLoopDiuretic,
    hasThiazide,
    hasNsaid,
    hasRaas,
    hasSecretagogue,
    hasInsulin,
  };
}

/**
 * Evaluates laboratory data for Euglycemic Diabetic Ketoacidosis (euDKA).
 */
export function evaluateEuDka({
  glucoseMgDl,
  bicarbonateMeqL,
  arterialPh = 7.35,
  betaHydroxybutyrateMmolL = 0.4,
  anionGap = 10,
  recentTriggers = [],
}: {
  glucoseMgDl: number;
  bicarbonateMeqL: number;
  arterialPh?: number;
  betaHydroxybutyrateMmolL?: number;
  anionGap?: number;
  recentTriggers?: string[];
}): EuDkaEvaluation {
  const isAcidemic = arterialPh < 7.30 || bicarbonateMeqL < 18;
  const isKetonemic = betaHydroxybutyrateMmolL >= 3.0;
  const hasAnionGapAcidosis = anionGap > 12;
  const isEuglycemicRange = glucoseMgDl < 250;

  const isEuDkaSuspected = isEuglycemicRange && (isAcidemic || isKetonemic) && hasAnionGapAcidosis;

  let headline = "";
  if (isEuDkaSuspected) {
    headline = `HIGH SUSPICION FOR EUGLYCEMIC DKA (euDKA) — Glucose ${glucoseMgDl} mg/dL, Anion Gap ${anionGap}, Bicarbonate ${bicarbonateMeqL} mEq/L`;
  } else if (isAcidemic || isKetonemic) {
    headline = `Metabolic Acidosis / Ketonemia Alert — Monitor SGLT2-Mediated Ketoacidosis`;
  } else {
    headline = `Normal Acid-Base & Metabolic Profile — euDKA Currently Low Risk`;
  }

  const diagnosticTrapAlert =
    "CRITICAL DIAGNOSTIC TRAP: Euglycemic DKA presents with normal or mildly elevated blood glucose (< 200–250 mg/dL) due to ongoing renal glycosuria. Clinicians frequently miss or delay DKA diagnosis because glucose is not markedly elevated. Always measure serum beta-hydroxybutyrate, blood gas, and anion gap in any unwell patient taking an SGLT2 inhibitor regardless of blood glucose.";

  return {
    isEuDkaSuspected,
    glucoseMgDl,
    anionGap,
    betaHydroxybutyrateMmolL,
    bicarbonateMeqL,
    arterialPh,
    headline,
    diagnosticTrapAlert,
    resuscitationGuidance: {
      dextroseInsulinCoadministration:
        "CRITICAL RESUSCITATION PROTOCOL: Initiate IV Dextrose (D5W or D10W at 75–125 mL/hr) simultaneously with continuous IV regular insulin infusion (0.05–0.1 units/kg/hr). Dextrose is REQUIRED to avoid hypoglycemia while delivering sufficient insulin to halt lipolysis, hepatic free fatty acid oxidation, and ketoacid generation.",
      fluidResuscitation:
        "Vigorous isotonic fluid replacement (Normal Saline or balanced crystalloid e.g., Plasmalyte) to replace severe osmotic diuresis deficits (typically 2–4 L total deficit).",
      sglt2Discontinuation:
        "Discontinue SGLT2 inhibitor immediately. Do NOT restart until patient has fully recovered, eating normally, and acute ketoacidosis has resolved.",
      ketoneClearanceTarget:
        "Continue insulin and dextrose infusion until serum beta-hydroxybutyrate is < 0.6 mmol/L, anion gap closes (<= 12), venous pH > 7.30, and serum bicarbonate >= 18 mEq/L.",
    },
    precipitatingTriggers: recentTriggers.length > 0 ? recentTriggers : [
      "Acute infection / sepsis (most common)",
      "Surgery or invasive procedural stress",
      "Reduced carbohydrate intake (strict low-carb / ketogenic diet, fasting)",
      "Omission or reduction of insulin therapy",
      "Acute excessive alcohol consumption",
      "Severe dehydration / volume contraction",
    ],
  };
}

/**
 * Computes FDA perioperative hold schedule for SGLT2 inhibitors.
 */
export function calculatePreopHold(ids: string[]): PerioperativeHoldSchedule[] {
  const schedules: PerioperativeHoldSchedule[] = [];

  for (const id of ids) {
    const profile = SGLT2_PROFILES[id];
    if (!profile) continue;

    const days = profile.preopHoldDays;
    schedules.push({
      agentName: `${profile.name} (${profile.brand})`,
      recommendedHoldDays: days,
      surgeryTimingNote: `Hold at least ${days} full days prior to scheduled major surgery (e.g., if surgery is on Friday, take last dose on ${days === 4 ? "Monday" : "Tuesday"}).`,
      resumptionCriteria:
        "Do NOT resume postoperatively until patient has completely resumed oral nutrition, is fully hydrated, and acute surgical catabolic stress has subsided.",
      urgentSurgeryProtocol:
        "If emergency/urgent surgery cannot be delayed: Discontinue SGLT2 inhibitor immediately, monitor blood gas and beta-hydroxybutyrate every 4–6 hours, maintain IV hydration, and consider prophylactic dextrose infusion with insulin if ketonemia develops.",
    });
  }

  return schedules;
}

/**
 * Evaluates eGFR thresholds for glycemic efficacy vs cardiorenal indications.
 */
export function evaluateSglt2RenalRails(ids: string[], currentEgfr: number): RenalIndicationRail[] {
  const rails: RenalIndicationRail[] = [];

  for (const id of ids) {
    const profile = SGLT2_PROFILES[id];
    if (!profile) continue;

    let glycemicStatus: "effective" | "blunted" | "ineffective" = "effective";
    if (currentEgfr < profile.glycemicEgfrThreshold) {
      glycemicStatus = "ineffective";
    } else if (currentEgfr < 60) {
      glycemicStatus = "blunted";
    }

    let cardiorenalStatus: "indicated" | "caution-dose-reduce" | "contraindicated-dialysis" = "indicated";
    if (currentEgfr <= profile.contraindicatedEgfr || currentEgfr < 15) {
      cardiorenalStatus = "contraindicated-dialysis";
    } else if (currentEgfr < profile.cardiorenalEgfrCutoff) {
      cardiorenalStatus = "caution-dose-reduce";
    }

    rails.push({
      agentName: `${profile.name} (${profile.brand})`,
      currentEgfr,
      glycemicStatus,
      cardiorenalStatus,
      initialEgfrDipReassurance:
        "EXPECTED INITIAL eGFR DIP: An acute drop of 2 to 4 mL/min/1.73m2 (or up to 10-15% from baseline) occurs within the first 2 to 4 weeks of initiation due to tubuloglomerular feedback (macula densa sodium delivery causing afferent arteriolar constriction and reducing harmful intraglomerular hypertension). This hemodynamically mediated dip is REVERSIBLE and predicts long-term nephron preservation; do NOT discontinue therapy unless eGFR drops > 30% without alternative explanation.",
    });
  }

  return rails;
}

/**
 * Discovers dangerous drug collisions involving SGLT2 inhibitors.
 */
export function findSglt2Collisions(ids: string[]): Sglt2Collision[] {
  const collisions: Sglt2Collision[] = [];
  const onDesk = sglt2OnDesk(ids);
  if (!onDesk.hasSglt2) return collisions;

  const sglt2Names = onDesk.sglt2Ids.map((id) => SGLT2_PROFILES[id]?.name ?? id).join(", ");

  // 1. Triple Whammy AKI: SGLT2i + Loop Diuretic + RAASi + NSAID
  if (onDesk.hasLoopDiuretic && onDesk.hasRaas && onDesk.hasNsaid) {
    collisions.push({
      drugId: "triple-whammy-sglt2",
      drugName: `${sglt2Names} + Loop Diuretic + RAASi + NSAID`,
      category: "triple-whammy-aki",
      severity: "major",
      headline: "QUADRUPLE COLLISION: SGLT2i + Loop Diuretic + ACEi/ARB + NSAID AKI Cascade",
      mechanism:
        "Simultaneous osmotic diuresis (SGLT2i), loop kaliuresis (Furosemide), efferent arteriolar dilation (ACEi/ARB), and afferent arteriolar vasoconstriction (NSAID) causes catastrophic reduction in glomerular filtration pressure and acute tubular necrosis.",
      clinicalAction:
        "Discontinue NSAID immediately. Review intravascular volume status and consider adjusting loop diuretic dose. Monitor serum creatinine and electrolytes closely.",
    });
  } else if (onDesk.hasLoopDiuretic) {
    collisions.push({
      drugId: "loop-diuretic",
      drugName: `${sglt2Names} + Loop Diuretic`,
      category: "volume-depletion",
      severity: "moderate",
      headline: "Additive Osmotic & Natriuretic Volume Depletion",
      mechanism:
        "SGLT2 inhibitor osmotic diuresis (~500–1000 mL/day fluid loss) combined with loop diuretic natriuresis markedly increases risk of orthostatic hypotension, syncope, and prerenal azotemia, particularly in elderly or frail patients.",
      clinicalAction:
        "Anticipate loop diuretic dose reduction (often 25–50%) upon SGLT2 inhibitor initiation if patient is euvolemic. Instruct patient on postural hypotension precautions.",
    });
  }

  // 2. Hypoglycemia with Insulin Secretagogues or Insulin
  if (onDesk.hasSecretagogue || onDesk.hasInsulin) {
    const offending = onDesk.hasSecretagogue && onDesk.hasInsulin
      ? "Sulfonylurea & Insulin"
      : onDesk.hasSecretagogue
      ? "Sulfonylurea"
      : "Insulin";
    collisions.push({
      drugId: "hypoglycemia-secretagogue",
      drugName: `${sglt2Names} + ${offending}`,
      category: "hypoglycemia-secretagogue",
      severity: "major",
      headline: `Stacked Hypoglycemia Risk with ${offending}`,
      mechanism:
        "While SGLT2 inhibitors alone have negligible intrinsic hypoglycemia risk, co-administration with insulin or sulfonylureas drastically elevates hypoglycemia risk because the physiological glucose threshold for endogenous insulin shutoff is bypassed.",
      clinicalAction:
        "Proactively reduce baseline sulfonylurea or basal insulin dose (typically 10–20% reduction in insulin) when initiating SGLT2 inhibitors. Increase blood glucose monitoring frequency.",
    });
  }

  return collisions;
}

/**
 * Generates structured clinical SGLT2 report from current active desk items.
 */
export function sglt2ReportOnDesk(ids: string[], host?: HostContext): Sglt2Report {
  const onDesk = sglt2OnDesk(ids);
  const profiles = onDesk.sglt2Ids.map((id) => SGLT2_PROFILES[id]).filter(Boolean);

  const defaultEgfr = host?.kidney === "ckd" ? 28 : 65;

  const euDkaEval = evaluateEuDka({
    glucoseMgDl: 165,
    bicarbonateMeqL: 22,
    arterialPh: 7.38,
    betaHydroxybutyrateMmolL: 0.5,
    anionGap: 10,
  });

  const preopSchedule = calculatePreopHold(onDesk.sglt2Ids);
  const renalRails = evaluateSglt2RenalRails(onDesk.sglt2Ids, defaultEgfr);
  const collisions = findSglt2Collisions(ids);

  const ClinicalPearls = [
    "Euglycemic DKA occurs with blood glucose < 250 mg/dL (frequently normal or mildly elevated) because persistent renal glycosuria clears circulating glucose while insulinopenia and glucagon excess drive ketoacidosis.",
    "When treating euDKA, IV Dextrose (D5W or D10W) MUST be co-administered with IV insulin infusion — without dextrose, blood glucose will drop before adequate insulin can be given to halt lipolysis and clear ketonemia.",
    "FDA requires holding SGLT2 inhibitors at least 3 days prior to surgery (4 days for ertugliflozin); resume only when oral intake is fully re-established and catabolic stress resolves.",
    "The acute 2–4 mL/min dip in eGFR upon SGLT2i initiation is an expected hemodynamic effect of restored tubuloglomerular feedback, not structural nephrotoxicity, and predicts long-term renal preservation.",
    "Fournier's gangrene (necrotizing fasciitis of the perineum) is a rare medical emergency associated with SGLT2 inhibitors requiring immediate surgical debridement and broad-spectrum antibiotics.",
    "Stacking SGLT2 inhibitors with loop diuretics, ACEi/ARBs, and NSAIDs produces a severe Quadruple Collision resulting in acute prerenal azotemia and tubular necrosis.",
  ];

  return {
    hasSglt2: onDesk.hasSglt2,
    agentsOnDesk: profiles,
    euDkaEval,
    preopSchedule,
    renalRails,
    collisions,
    fourniersWarning:
      "FDA WARNING: Rare cases of Fournier's Gangrene (necrotizing fasciitis of the perineum) have occurred in both women and men. Evaluate immediately for pain, tenderness, redness, or swelling in genital/perineal area accompanied by fever or malaise. Discontinue SGLT2 inhibitor, start IV antibiotics, and obtain urgent surgical consultation.",
    clinicalPearls: ClinicalPearls,
    disclaimer: `${NOT_CLEARED} Educational clinical pharmacology reference. SGLT2 inhibitor perioperative holds, cardiorenal thresholds, and euDKA resuscitation require institutional protocols and clinical judgment. ${PI_FOOTER}`,
  };
}

