/**
 * Direct Oral Anticoagulant (DOAC) & Bleed Management Desk.
 *
 * Educational clinical pharmacology reference synthesizing:
 * 1. Apixaban ABC Dose Reduction criteria (Age >= 80, Body Weight <= 60 kg, Serum Creatinine >= 1.5 mg/dL)
 * 2. Renal dosing rails across DOACs (Apixaban, Rivaroxaban, Dabigatran, Edoxaban)
 * 3. Edoxaban Black Box Warning: CrCl > 95 mL/min ischemic stroke risk
 * 4. Dabigatran capsule integrity ("DO NOT CRUSH / OPEN") and hemodialysis clearance
 * 5. Perioperative interruption and procedural hold schedules (stratified by bleeding risk and CrCl)
 * 6. Acute bleed management and reversal nomograms:
 *    - Andexanet alfa (Andexxa) low- vs high-dose criteria
 *    - Idarucizumab (Praxbind) 5 g IV for dabigatran
 *    - 4-Factor Prothrombin Complex Concentrate (4F-PCC) non-specific hemostatic dosing
 * 7. Pharmacokinetic (CYP3A4 / P-gp) and pharmacodynamic (antiplatelet, NSAID, SSRI) collisions
 *
 * Strictly non-prescriptive educational reference. Not an FDA-cleared clinical decision
 * support tool, not an order set, and not a dosing directive. The FDA-approved Prescribing
 * Information, hospital anticoagulation stewardship guidelines, and attending clinician govern.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { crclOf, type CrclResult, type Sex } from "./bedside";
import { PI_FOOTER, NOT_CLEARED } from "../regulatory";

export type DoacIndication =
  | "nvaf" // Non-valvular Atrial Fibrillation
  | "vte-treatment" // Acute DVT / PE Treatment
  | "vte-secondary" // Extended Secondary Prevention of DVT / PE
  | "vte-prophylaxis" // Post-Op Orthopedic VTE Prophylaxis
  | "cad-pad"; // CAD / PAD Vascular Protection

export type ProcedureBleedRisk = "minimal" | "low" | "high" | "neuraxial";

export type BleedSeverity = "minor" | "major" | "urgent-procedure";

export interface ApixabanAbcEvaluation {
  age: number;
  weightKg: number;
  scr: number;
  ageMet: boolean;
  weightMet: boolean;
  scrMet: boolean;
  criteriaMetCount: number;
  reductionIndicated: boolean;
  standardDose: string;
  recommendedDose: string;
  rationale: string;
  indicationNote: string;
  esrdDialysisNote: string;
}

export interface DoacRenalRail {
  agentId: string;
  agentName: string;
  brandName: string;
  crcl: number;
  doseRecommendation: string;
  status: "standard" | "reduced" | "caution" | "avoid" | "black-box";
  headline: string;
  explanation: string;
  foodRequirement?: string;
  capsuleIntegrityWarning?: string;
  dialysisRole?: string;
}

export interface PerioperativeHold {
  agentId: string;
  agentName: string;
  procedureBleedRisk: ProcedureBleedRisk;
  crcl: number;
  holdDurationHours: number;
  holdDurationDisplay: string;
  preOpTimingSummary: string;
  postOpResumptionSummary: string;
  bridgingRecommendation: string;
  neuraxialSpecificGuidance?: string;
  clinicalRationale: string;
}

export interface AndexxaDosingCalc {
  agent: "apixaban" | "rivaroxaban";
  lastDoseMg: number;
  hoursSinceLastDose: number;
  isHighDose: boolean;
  ivBolus: string;
  continuousInfusion: string;
  totalVials100mg: number;
  totalVials200mg: number;
  rationale: string;
}

export interface SpecificAntidote {
  name: string;
  brand: string;
  mechanism: string;
  regimen: string;
  fdaApproved: boolean;
}

export interface ReversalEvaluation {
  agentId: string;
  agentName: string;
  bleedSeverity: BleedSeverity;
  headline: string;
  immediateActions: string[];
  specificAntidote: SpecificAntidote | null;
  andexxaCalc?: AndexxaDosingCalc;
  nonSpecificAlternative: {
    agent: string;
    dosing: string;
    caution: string;
  };
  hemodialysisRole: {
    isDialyzable: boolean;
    clearancePct: string;
    note: string;
  };
  monitoringLabs: string[];
  resumptionGuidance: string;
}

export interface AnticoagulantCollision {
  drugId: string;
  drugName: string;
  category:
    | "dual-strong-inhibitor"
    | "dual-strong-inducer"
    | "antiplatelet"
    | "nsaid"
    | "ssri-snri"
    | "herbal-bleed";
  severity: "contraindicated" | "major" | "moderate";
  headline: string;
  mechanism: string;
  clinicalAction: string;
}

export interface DoacReport {
  hasAnticoagulant: boolean;
  hasDoac: boolean;
  hasReversal: boolean;
  anticoagulantsOnDesk: string[];
  reversalsOnDesk: string[];
  patientProfile: {
    age: number;
    weightKg: number;
    scr: number;
    sex: Sex;
    crcl: number;
    indication: DoacIndication;
    procedureRisk: ProcedureBleedRisk;
    bleedSeverity: BleedSeverity;
  };
  apixabanAbc?: ApixabanAbcEvaluation;
  renalRails: DoacRenalRail[];
  perioperativeHolds: PerioperativeHold[];
  reversals: ReversalEvaluation[];
  collisions: AnticoagulantCollision[];
  clinicalTakeaways: string[];
  disclaimer: string;
}

export const DOAC_IDS = new Set(["apixaban", "rivaroxaban", "edoxaban", "dabigatran"]);
export const VKA_PARENTERAL_IDS = new Set(["warfarin", "enoxaparin", "heparin", "fondaparinux", "bivalirudin"]);
export const ALL_ANTICOAGULANT_IDS = new Set([...DOAC_IDS, ...VKA_PARENTERAL_IDS]);
export const REVERSAL_IDS = new Set(["andexanet-alfa", "idarucizumab", "protamine", "vitamin-k"]);

// Bleed modifiers
const DUAL_STRONG_INHIBITORS = new Set([
  "ketoconazole",
  "itraconazole",
  "clarithromycin",
  "ritonavir",
  "cobicistat",
  "lopinavir",
]);

const DUAL_STRONG_INDUCERS = new Set([
  "rifampin",
  "carbamazepine",
  "phenytoin",
  "st-johns-wort",
  "phenobarbital",
  "primidone",
]);

const ANTIPLATELET_IDS = new Set([
  "aspirin",
  "clopidogrel",
  "ticagrelor",
  "prasugrel",
  "cilostazol",
  "dipyridamole",
]);

const NSAID_IDS = new Set([
  "ibuprofen",
  "naproxen",
  "ketorolac",
  "celecoxib",
  "meloxicam",
  "indomethacin",
  "diclofenac",
  "sulindac",
  "etodolac",
  "piroxicam",
]);

const SSRI_SNRI_IDS = new Set([
  "sertraline",
  "fluoxetine",
  "paroxetine",
  "escitalopram",
  "citalopram",
  "fluvoxamine",
  "venlafaxine",
  "duloxetine",
  "desvenlafaxine",
  "vortioxetine",
  "vilazodone",
]);

const HERBAL_BLEED_IDS = new Set([
  "fish-oil",
  "ginkgo",
  "garlic",
  "nattokinase",
  "dong-quai",
  "feverfew",
  "vitamin-e",
]);

/**
 * Checks whether any anticoagulant or reversal agent is present on the desk.
 */
export function doacOnDesk(ids: string[]): {
  hasAnticoagulant: boolean;
  hasDoac: boolean;
  hasReversal: boolean;
  anticoagulants: string[];
  reversals: string[];
} {
  const anticoagulants = ids.filter((id) => ALL_ANTICOAGULANT_IDS.has(id));
  const reversals = ids.filter((id) => REVERSAL_IDS.has(id));
  const hasDoac = ids.some((id) => DOAC_IDS.has(id));
  return {
    hasAnticoagulant: anticoagulants.length > 0,
    hasDoac,
    hasReversal: reversals.length > 0,
    anticoagulants,
    reversals,
  };
}

/**
 * Evaluates the Apixaban ABC Criteria for dose reduction in Non-Valvular Atrial Fibrillation (NVAF).
 * Dose reduces from 5 mg PO BID to 2.5 mg PO BID when patient satisfies at least 2 of 3:
 * - Age >= 80 years
 * - Body Weight <= 60 kg
 * - Serum Creatinine >= 1.5 mg/dL
 */
export function evaluateApixabanAbc(input: {
  age: number;
  weightKg: number;
  scr: number;
  indication?: DoacIndication;
}): ApixabanAbcEvaluation {
  const { age, weightKg, scr, indication = "nvaf" } = input;
  const ageMet = age >= 80;
  const weightMet = weightKg <= 60;
  const scrMet = scr >= 1.5;

  let criteriaMetCount = 0;
  if (ageMet) criteriaMetCount++;
  if (weightMet) criteriaMetCount++;
  if (scrMet) criteriaMetCount++;

  const reductionIndicated = criteriaMetCount >= 2;

  let standardDose = "5 mg PO BID";
  let recommendedDose = reductionIndicated ? "2.5 mg PO BID" : "5 mg PO BID";
  let rationale = "";
  let indicationNote = "";

  if (indication === "nvaf") {
    if (reductionIndicated) {
      const reasons: string[] = [];
      if (ageMet) reasons.push(`Age ≥80 (${age} yrs)`);
      if (weightMet) reasons.push(`Body weight ≤60 kg (${weightKg} kg)`);
      if (scrMet) reasons.push(`Serum creatinine ≥1.5 mg/dL (${scr} mg/dL)`);
      rationale = `Dose reduction indicated: Patient meets ${criteriaMetCount} of 3 "ABC" criteria (${reasons.join(", ")}). Recommended dose is 2.5 mg PO BID.`;
    } else if (criteriaMetCount === 1) {
      const metOne = ageMet ? "Age ≥80" : weightMet ? "Weight ≤60 kg" : "SCr ≥1.5 mg/dL";
      rationale = `Standard dose maintained: Patient meets only 1 of 3 "ABC" criteria (${metOne}). At least 2 criteria are required for dose reduction in NVAF.`;
    } else {
      rationale = `Standard dose maintained: Patient meets 0 of 3 "ABC" criteria. Standard dose is 5 mg PO BID.`;
    }
    indicationNote = "NVAF stroke prevention: Standard 5 mg PO BID; reduced to 2.5 mg PO BID if ≥2 ABC criteria met.";
  } else if (indication === "vte-treatment") {
    standardDose = "10 mg PO BID × 7 days, then 5 mg PO BID";
    recommendedDose = standardDose;
    rationale = `Acute DVT/PE Treatment: "ABC" reduction criteria do NOT apply to acute treatment phase. Initial loading dose is 10 mg PO BID for the first 7 days, followed by maintenance 5 mg PO BID.`;
    indicationNote = `Do not down-titrate to 2.5 mg BID during the acute treatment phase even if ABC criteria are present.`;
  } else if (indication === "vte-secondary") {
    standardDose = "2.5 mg PO BID";
    recommendedDose = "2.5 mg PO BID";
    rationale = `Extended secondary prevention: Following at least 6 months of therapeutic anticoagulation for DVT/PE, labeled maintenance dose is 2.5 mg PO BID.`;
    indicationNote = `Extended prevention dose is uniformly 2.5 mg PO BID regardless of baseline ABC criteria.`;
  } else if (indication === "vte-prophylaxis") {
    standardDose = "2.5 mg PO BID";
    recommendedDose = "2.5 mg PO BID";
    rationale = `Orthopedic VTE Prophylaxis: Labeled dose is 2.5 mg PO BID (started 12–24h post-op; duration 12 days for knee, 35 days for hip).`;
    indicationNote = `Orthopedic surgical prophylaxis is 2.5 mg PO BID.`;
  } else {
    rationale = `Indication evaluated. ABC criteria specifically govern Non-Valvular Atrial Fibrillation.`;
    indicationNote = `Review indication-specific labeling.`;
  }

  const esrdDialysisNote =
    "In NVAF with ESRD maintained on intermittent hemodialysis, FDA labeling supports 5 mg PO BID, or dose reduction to 2.5 mg PO BID if age ≥80 OR body weight ≤60 kg (only 1 criterion required in ESRD). For DVT/PE, apixaban is not recommended in CrCl <15 mL/min.";

  return {
    age,
    weightKg,
    scr,
    ageMet,
    weightMet,
    scrMet,
    criteriaMetCount,
    reductionIndicated,
    standardDose,
    recommendedDose,
    rationale,
    indicationNote,
    esrdDialysisNote,
  };
}

/**
 * Evaluates renal dosing rails, black box warnings, food requirements, and administration rules for DOACs.
 */
export function evaluateDoacRenal(
  agentId: string,
  crcl: number,
  weightKg: number,
  indication: DoacIndication = "nvaf",
): DoacRenalRail {
  const drug = DRUG_BY_ID[agentId];
  const agentName = drug?.name ?? agentId;
  const brandName = drug?.brands?.[0] ?? "";

  if (agentId === "apixaban") {
    if (crcl < 15) {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: indication === "nvaf" ? "5 mg BID (or 2.5 mg BID if age ≥80 or wt ≤60 kg)" : "Avoid / Not recommended",
        status: indication === "nvaf" ? "caution" : "avoid",
        headline: indication === "nvaf" ? "ESRD / Dialysis: Specialized NVAF Dosing" : "Avoid in severe renal impairment (CrCl <15 mL/min)",
        explanation:
          indication === "nvaf"
            ? "FDA label permits 5 mg BID in hemodialysis-dependent ESRD, reducing to 2.5 mg BID if age ≥80 OR weight ≤60 kg. For DVT/PE, clinical data are insufficient and use is not recommended."
            : "Clinical data in acute VTE with CrCl <15 mL/min or dialysis are lacking. Unfractionated heparin or warfarin preferred.",
        dialysisRole: "Not dialyzable (~87% protein-bound; <7% removed by hemodialysis).",
      };
    }
    if (crcl < 30) {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "Dose per ABC criteria (2.5 mg vs 5 mg BID)",
        status: "caution",
        headline: "Moderate to Severe Renal Impairment (CrCl 15–29 mL/min)",
        explanation:
          "Apixaban is 27% renally cleared. While GFR alone does not mandate dose reduction in the absence of ABC criteria, drug exposure increases ~40%. Monitor renal function and bleeding signs vigilantly.",
        dialysisRole: "Not dialyzable (<7% removed by hemodialysis).",
      };
    }
    return {
      agentId,
      agentName,
      brandName,
      crcl,
      doseRecommendation: "Standard dosing guided by ABC criteria (5 mg vs 2.5 mg BID)",
      status: "standard",
      headline: "Preserved Renal Function (CrCl ≥30 mL/min)",
      explanation: "Dose according to indication and ABC criteria. Renal clearance is intact.",
      dialysisRole: "Not dialyzable (<7% removed by hemodialysis).",
    };
  }

  if (agentId === "rivaroxaban") {
    const foodRequirement =
      "CRITICAL: 15 mg and 20 mg tablets MUST be taken with food (evening meal for NVAF; with meals for VTE). Fasting administration drops oral bioavailability from ~100% to 66%, creating subtherapeutic stroke/clot risk. 2.5 mg and 10 mg tablets may be taken with or without food.";

    if (crcl < 15) {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "Avoid use (Contraindicated / Insufficient data)",
        status: "avoid",
        headline: "Avoid in CrCl <15 mL/min",
        explanation:
          "Rivaroxaban is ~36% eliminated unchanged by the kidneys. Severe renal impairment leads to significant drug accumulation and major bleeding risk. Avoid use.",
        foodRequirement,
        dialysisRole: "Not dialyzable (~92–95% protein-bound).",
      };
    }
    if (crcl <= 50) {
      if (indication === "nvaf") {
        return {
          agentId,
          agentName,
          brandName,
          crcl,
          doseRecommendation: "15 mg PO once daily with evening meal",
          status: "reduced",
          headline: "Renal Dose Reduction Mandated: CrCl 15–50 mL/min",
          explanation:
            "In NVAF with CrCl 15–50 mL/min, ROCKET AF trial showed 15 mg daily provides equivalent exposure to 20 mg daily in normal renal function. Take strictly with the evening meal.",
          foodRequirement,
          dialysisRole: "Not dialyzable (~92–95% protein-bound).",
        };
      }
      if (indication === "vte-treatment" && crcl < 30) {
        return {
          agentId,
          agentName,
          brandName,
          crcl,
          doseRecommendation: "Avoid use (CrCl <30 mL/min in acute VTE)",
          status: "avoid",
          headline: "Avoid in Acute VTE if CrCl <30 mL/min",
          explanation: "In acute DVT/PE treatment, rivaroxaban is avoided if CrCl <30 mL/min. Parenteral anticoagulation or VKA preferred.",
          foodRequirement,
          dialysisRole: "Not dialyzable (~92–95% protein-bound).",
        };
      }
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "15 mg PO BID × 21d, then 20 mg daily with food (monitor closely)",
        status: "caution",
        headline: "CrCl 30–50 mL/min: Standard acute VTE dosing with close monitoring",
        explanation: "Monitor renal function regularly. Discontinue or switch if CrCl declines below 30 mL/min.",
        foodRequirement,
        dialysisRole: "Not dialyzable (~92–95% protein-bound).",
      };
    }
    return {
      agentId,
      agentName,
      brandName,
      crcl,
      doseRecommendation: indication === "nvaf" ? "20 mg PO once daily with evening meal" : "Standard indication dose",
      status: "standard",
      headline: "Preserved Renal Function (CrCl >50 mL/min)",
      explanation: "Standard labeled dose. Always administer 15 mg and 20 mg doses with food.",
      foodRequirement,
      dialysisRole: "Not dialyzable (~92–95% protein-bound).",
    };
  }

  if (agentId === "edoxaban") {
    if (crcl > 95 && indication === "nvaf") {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "DO NOT USE in NVAF (Select alternative DOAC or Warfarin)",
        status: "black-box",
        headline: "BLACK BOX WARNING: CrCl >95 mL/min — High Ischemic Stroke Risk",
        explanation:
          "FDA Boxed Warning: Edoxaban should NOT be used in patients with NVAF and CrCl >95 mL/min. In the ENGAGE AF-TIMI 48 trial, patients with CrCl >95 mL/min had an increased rate of ischemic stroke with edoxaban 60 mg daily compared to warfarin, due to hyperclearance and lower drug exposure. Choose apixaban, dabigatran, rivaroxaban, or warfarin instead.",
        dialysisRole: "Minimally dialyzable (~9% cleared by hemodialysis).",
      };
    }
    if (crcl < 15) {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "Avoid use / Not recommended",
        status: "avoid",
        headline: "Avoid in CrCl <15 mL/min or Dialysis",
        explanation: "Edoxaban is ~50% renally eliminated. Not recommended in patients with CrCl <15 mL/min.",
        dialysisRole: "Minimally dialyzable (~9% cleared by hemodialysis).",
      };
    }
    if (crcl <= 50 || weightKg <= 60) {
      const reasons: string[] = [];
      if (crcl <= 50) reasons.push(`CrCl 15–50 mL/min (${crcl} mL/min)`);
      if (weightKg <= 60) reasons.push(`Body weight ≤60 kg (${weightKg} kg)`);
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "30 mg PO once daily",
        status: "reduced",
        headline: "Dose Reduction Mandated: 30 mg Daily",
        explanation: `Reduce dose from standard 60 mg to 30 mg once daily due to: ${reasons.join(" and ")}. (Also reduce to 30 mg if co-administered with P-gp inhibitors verapamil, quinidine, or dronedarone).`,
        dialysisRole: "Minimally dialyzable (~9% cleared by hemodialysis).",
      };
    }
    return {
      agentId,
      agentName,
      brandName,
      crcl,
      doseRecommendation: "60 mg PO once daily",
      status: "standard",
      headline: "CrCl 51–95 mL/min: Standard Labeled Dose",
      explanation: "Standard 60 mg once daily dose. Confirm body weight is >60 kg and no concomitant strong P-gp inhibitors.",
      dialysisRole: "Minimally dialyzable (~9% cleared by hemodialysis).",
    };
  }

  if (agentId === "dabigatran") {
    const capsuleIntegrityWarning =
      "CRITICAL: MUST be swallowed whole with a full glass of water. DO NOT chew, break, or open capsules. Opening or sprinkling the capsule content increases systemic bioavailability by 75%, leading to unpredictable supratherapeutic drug levels and high bleeding risk. Keep in original manufacturer bottle with desiccant; discard 4 months after first opening.";
    const dialysisRole =
      "PROMINENT HEMODIALYSIS ROLE: Unlike other DOACs, dabigatran is ~80% renally eliminated and only 35% protein-bound. Hemodialysis clears ~50–60% of circulating drug over 4 hours. In life-threatening bleeding or severe toxicity when Praxbind (idarucizumab) is unavailable, emergency hemodialysis is an effective clearance pathway.";

    if (crcl < 15) {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: "Avoid use / Not recommended",
        status: "avoid",
        headline: "Avoid in CrCl <15 mL/min or Dialysis",
        explanation: "Dabigatran depends on renal elimination (80%). Significant drug accumulation occurs below CrCl 15 mL/min.",
        capsuleIntegrityWarning,
        dialysisRole,
      };
    }
    if (crcl <= 30) {
      return {
        agentId,
        agentName,
        brandName,
        crcl,
        doseRecommendation: indication === "nvaf" ? "75 mg PO twice daily" : "Avoid in acute VTE if CrCl <30 mL/min",
        status: indication === "nvaf" ? "reduced" : "avoid",
        headline: "CrCl 15–30 mL/min: Dose Reduction (NVAF) or Avoid (VTE)",
        explanation:
          indication === "nvaf"
            ? "In NVAF, reduce dose to 75 mg BID. Note: If co-administered with P-gp inhibitors (dronedarone, ketoconazole), avoid use completely."
            : "In acute DVT/PE treatment, dabigatran is not recommended if CrCl <30 mL/min.",
        capsuleIntegrityWarning,
        dialysisRole,
      };
    }
    return {
      agentId,
      agentName,
      brandName,
      crcl,
      doseRecommendation: "150 mg PO twice daily",
      status: "standard",
      headline: "Preserved Renal Function (CrCl >30 mL/min)",
      explanation: "Standard labeled dose 150 mg BID. If CrCl is 30–50 mL/min and taking dronedarone or systemic ketoconazole, reduce dose to 75 mg BID.",
      capsuleIntegrityWarning,
      dialysisRole,
    };
  }

  // Fallback for VKA / Parenterals
  return {
    agentId,
    agentName,
    brandName,
    crcl,
    doseRecommendation: "Follow agent-specific nomogram",
    status: crcl < 30 ? "caution" : "standard",
    headline: crcl < 30 ? "Renal monitoring advised" : "Standard monitoring",
    explanation: `${agentName} clearance and hemostatic parameters require individualized clinical monitoring.`,
  };
}

/**
 * Calculates Perioperative Interruption & Hold Schedules based on:
 * - Procedure Bleeding Risk (Minimal, Low, High, Neuraxial)
 * - Renal function (CrCl)
 * - Guidelines: CHEST 2024, ACC/AHA 2023, ASRA 2022
 */
export function calculatePerioperativeHold(
  agentId: string,
  crcl: number,
  risk: ProcedureBleedRisk,
): PerioperativeHold {
  const drug = DRUG_BY_ID[agentId];
  const agentName = drug?.name ?? agentId;

  if (agentId === "apixaban" || agentId === "rivaroxaban") {
    if (risk === "minimal") {
      return {
        agentId,
        agentName,
        procedureBleedRisk: risk,
        crcl,
        holdDurationHours: 0,
        holdDurationDisplay: "0–24 hours (skip morning dose on day of procedure)",
        preOpTimingSummary: "Perform at trough level. Skip morning dose or continue without interruption if local hemostasis is feasible.",
        postOpResumptionSummary: "Resume next scheduled dose 6–24 hours post-procedure once local hemostasis is secured.",
        bridgingRecommendation: "No bridging required.",
        clinicalRationale: "Minor dental extraction, skin biopsy, cataract surgery: bleeding risk is low and manageable with local measures.",
      };
    }
    if (risk === "neuraxial") {
      return {
        agentId,
        agentName,
        procedureBleedRisk: risk,
        crcl,
        holdDurationHours: 72,
        holdDurationDisplay: "72 hours (3 full days)",
        preOpTimingSummary: "Hold for at least 72 hours prior to spinal/epidural needle puncture or catheter manipulation.",
        postOpResumptionSummary: "Do not remove neuraxial catheter until at least 24h after last DOAC dose. Resume DOAC ≥6 hours after catheter removal.",
        bridgingRecommendation: "No heparin bridging.",
        neuraxialSpecificGuidance: "ASRA Pain / Regional Anesthesia Consensus: 72-hour hold ensures minimal residual anticoagulant effect to avert epidural/spinal hematoma.",
        clinicalRationale: "Spinal hematoma can result in irreversible paralysis; generous clearance interval required.",
      };
    }
    if (risk === "high") {
      const holdHours = crcl < 30 ? 72 : 48;
      const holdDays = crcl < 30 ? "72 hours (3 days)" : "48 hours (2 days)";
      return {
        agentId,
        agentName,
        procedureBleedRisk: risk,
        crcl,
        holdDurationHours: holdHours,
        holdDurationDisplay: holdDays,
        preOpTimingSummary: `Hold for ${holdDays} (last dose taken ${holdHours}h prior to surgery).`,
        postOpResumptionSummary: "Resume full therapeutic dose 48–72 hours post-op once surgical hemostasis is established. Prophylactic heparin/LMWH may be bridged in intermediate window if VTE risk is high.",
        bridgingRecommendation: "No pre-operative heparin bridging needed (rapid DOAC offset/onset obviates bridging).",
        clinicalRationale: "Major cardiac, intracranial, intraocular, vascular, or major orthopedic surgery carries high bleeding morbidity. 4–5 half-lives required.",
      };
    }
    // Low risk
    const holdHours = crcl < 30 ? 36 : 24;
    const holdDays = crcl < 30 ? "36–48 hours" : "24–36 hours (1 full day)";
    return {
      agentId,
      agentName,
      procedureBleedRisk: risk,
      crcl,
      holdDurationHours: holdHours,
      holdDurationDisplay: holdDays,
      preOpTimingSummary: `Hold for ${holdDays} prior to procedure.`,
      postOpResumptionSummary: "Resume 24 hours post-procedure once adequate hemostasis is achieved.",
      bridgingRecommendation: "No pre-op bridging required.",
      clinicalRationale: "Low bleed procedures (endoscopy without biopsy, laparoscopic cholecystectomy, hernia repair): 2–3 half-lives provide safe residual hemostasis.",
    };
  }

  if (agentId === "dabigatran") {
    if (risk === "minimal") {
      return {
        agentId,
        agentName,
        procedureBleedRisk: risk,
        crcl,
        holdDurationHours: 24,
        holdDurationDisplay: "24 hours (1 day)",
        preOpTimingSummary: "Hold for 24 hours prior to minor procedure.",
        postOpResumptionSummary: "Resume 6–24 hours post-procedure once local hemostasis confirmed.",
        bridgingRecommendation: "No bridging required.",
        clinicalRationale: "Minimal bleeding risk procedures.",
      };
    }
    if (risk === "neuraxial") {
      let holdHours = 72;
      if (crcl < 30) holdHours = 120;
      else if (crcl < 50) holdHours = 96;
      const holdDays = `${holdHours} hours (${Math.round(holdHours / 24)} days)`;
      return {
        agentId,
        agentName,
        procedureBleedRisk: risk,
        crcl,
        holdDurationHours: holdHours,
        holdDurationDisplay: holdDays,
        preOpTimingSummary: `Hold for ${holdDays} prior to neuraxial puncture or catheter placement.`,
        postOpResumptionSummary: "Remove catheter at least 24h after last dose. Resume dabigatran ≥6 hours post-catheter removal.",
        bridgingRecommendation: "No pre-op bridging.",
        neuraxialSpecificGuidance: `ASRA Guidelines: Dabigatran half-life prolongs dramatically in renal impairment (from 12–17h to >28h). CrCl ${crcl} mL/min mandates ${holdDays} hold.`,
        clinicalRationale: "Prevention of catastrophic spinal/epidural hematoma.",
      };
    }
    if (risk === "high") {
      let holdHours = 48;
      if (crcl < 30) holdHours = 96;
      else if (crcl < 50) holdHours = 72;
      const holdDays = `${holdHours} hours (${Math.round(holdHours / 24)} days)`;
      return {
        agentId,
        agentName,
        procedureBleedRisk: risk,
        crcl,
        holdDurationHours: holdHours,
        holdDurationDisplay: holdDays,
        preOpTimingSummary: `Hold for ${holdDays} prior to major surgery.`,
        postOpResumptionSummary: "Resume therapeutic dose 48–72 hours post-op once complete surgical hemostasis secured.",
        bridgingRecommendation: "No pre-operative bridging required.",
        clinicalRationale: `Dabigatran elimination half-life is strictly kidney-dependent. High procedural bleed risk requires 4–5 half-lives of drug elimination.`,
      };
    }
    // Low risk
    let holdHours = 24;
    if (crcl < 30) holdHours = 48;
    else if (crcl < 50) holdHours = 36;
    const holdDays = `${holdHours} hours`;
    return {
      agentId,
      agentName,
      procedureBleedRisk: risk,
      crcl,
      holdDurationHours: holdHours,
      holdDurationDisplay: holdDays,
      preOpTimingSummary: `Hold for ${holdDays} prior to procedure.`,
      postOpResumptionSummary: "Resume 24 hours post-procedure once hemostasis established.",
      bridgingRecommendation: "No pre-op bridging required.",
      clinicalRationale: "Low bleed procedures with renally adjusted holding window.",
    };
  }

  if (agentId === "edoxaban") {
    const holdHours = risk === "neuraxial" ? 72 : risk === "high" ? 48 : risk === "low" ? 24 : 0;
    const holdDays = `${holdHours} hours (${Math.round(holdHours / 24)} days)`;
    return {
      agentId,
      agentName,
      procedureBleedRisk: risk,
      crcl,
      holdDurationHours: holdHours,
      holdDurationDisplay: holdHours === 0 ? "0–24 hours" : holdDays,
      preOpTimingSummary: `Hold for ${holdHours === 0 ? "skip morning dose" : holdDays} prior to procedure.`,
      postOpResumptionSummary: risk === "high" ? "Resume 48–72h post-op" : "Resume 24h post-op",
      bridgingRecommendation: "No bridging required.",
      clinicalRationale: "Edoxaban half-life is 10–14 hours; clearance is 50% renal.",
    };
  }

  if (agentId === "warfarin") {
    return {
      agentId,
      agentName,
      procedureBleedRisk: risk,
      crcl,
      holdDurationHours: 120,
      holdDurationDisplay: "5 days (120 hours)",
      preOpTimingSummary: "Hold warfarin 5 days prior to surgery. Check INR 24h before procedure (target INR <1.5).",
      postOpResumptionSummary: "Resume warfarin 12–24h post-op with regular evening dose once surgical hemostasis verified.",
      bridgingRecommendation:
        "Consider therapeutic LMWH bridging ONLY in high thrombotic risk patients (mechanical mitral valve, stroke/TIA within 3 months, CHADS2-VASc ≥7). BRIDGE trial showed bridging increases bleeding without reducing arterial thromboembolism in average-risk AF.",
      clinicalRationale: "Warfarin clearance is hepatic (half-life ~36–42 hours). Clotting factors require days to resynthesize.",
    };
  }

  if (agentId === "enoxaparin") {
    const isTherapeutic = true; // Conservative
    const holdHours = risk === "neuraxial" ? 24 : isTherapeutic ? 24 : 12;
    return {
      agentId,
      agentName,
      procedureBleedRisk: risk,
      crcl,
      holdDurationHours: holdHours,
      holdDurationDisplay: `${holdHours} hours`,
      preOpTimingSummary: `Hold for ${holdHours} hours before procedure or neuraxial catheter placement.`,
      postOpResumptionSummary: "Resume prophylactic dose 12–24h post-op; therapeutic dose 48–72h post-op.",
      bridgingRecommendation: "LMWH is the bridging agent itself.",
      neuraxialSpecificGuidance: "ASRA: 24h hold for therapeutic dosing (1 mg/kg q12h or 1.5 mg/kg daily); 12h hold for prophylactic dosing (30 mg q12h or 40 mg daily).",
      clinicalRationale: "Enoxaparin anti-Xa activity declines over 12–24 hours.",
    };
  }

  // Fallback
  return {
    agentId,
    agentName,
    procedureBleedRisk: risk,
    crcl,
    holdDurationHours: 24,
    holdDurationDisplay: "24–48 hours",
    preOpTimingSummary: "Hold per hospital perioperative protocol.",
    postOpResumptionSummary: "Resume upon confirmed surgical hemostasis.",
    bridgingRecommendation: "Individualize per surgical team.",
    clinicalRationale: "Specialist consultation and protocol guidance.",
  };
}

/**
 * Calculates Andexanet alfa (Andexxa) dosing according to ANNEXA-4 protocol and FDA labeling:
 * Low Dose:
 * - Apixaban <= 5 mg (any timing) OR >5 mg taken >= 8 hours ago (or unknown timing)
 * - Rivaroxaban <= 10 mg (any timing) OR >10 mg taken >= 8 hours ago (or unknown timing)
 * Regimen: 400 mg IV bolus @ 30 mg/min, followed by 4 mg/min continuous infusion for 120 min (480 mg) = 880 mg total.
 *
 * High Dose:
 * - Apixaban > 5 mg taken < 8 hours ago
 * - Rivaroxaban > 10 mg taken < 8 hours ago
 * Regimen: 800 mg IV bolus @ 30 mg/min, followed by 8 mg/min continuous infusion for 120 min (960 mg) = 1,760 mg total.
 */
export function calculateAndexxaDose(
  agent: "apixaban" | "rivaroxaban",
  lastDoseMg: number,
  hoursSinceLastDose: number,
): AndexxaDosingCalc {
  let isHighDose = false;

  if (agent === "apixaban") {
    if (lastDoseMg > 5 && hoursSinceLastDose < 8) {
      isHighDose = true;
    }
  } else {
    // rivaroxaban
    if (lastDoseMg > 10 && hoursSinceLastDose < 8) {
      isHighDose = true;
    }
  }

  if (isHighDose) {
    return {
      agent,
      lastDoseMg,
      hoursSinceLastDose,
      isHighDose: true,
      ivBolus: "800 mg IV at target rate of 30 mg/min (~27 minutes)",
      continuousInfusion: "8 mg/min continuous IV infusion for up to 120 minutes (960 mg)",
      totalVials100mg: 18,
      totalVials200mg: 9,
      rationale: `High-Dose Protocol: Indicated because ${agent === "apixaban" ? "apixaban" : "rivaroxaban"} last dose was >${agent === "apixaban" ? "5 mg" : "10 mg"} (${lastDoseMg} mg) AND was administered within the last 8 hours (${hoursSinceLastDose}h ago). High circulating factor Xa inhibitor concentration requires 1,760 mg total decoy protein.`,
    };
  }

  return {
    agent,
    lastDoseMg,
    hoursSinceLastDose,
    isHighDose: false,
    ivBolus: "400 mg IV at target rate of 30 mg/min (~14 minutes)",
    continuousInfusion: "4 mg/min continuous IV infusion for up to 120 minutes (480 mg)",
    totalVials100mg: 9,
    totalVials200mg: 5,
    rationale: `Low-Dose Protocol: Indicated because ${agent === "apixaban" ? "apixaban" : "rivaroxaban"} dose was ${agent === "apixaban" ? "≤5 mg" : "≤10 mg"} or elapsed time since last dose is ≥8 hours (${hoursSinceLastDose}h ago / unknown). Total dose 880 mg provides effective neutralization of residual factor Xa inhibition.`,
  };
}

/**
 * Evaluates Acute Bleed Management & Reversal Nomogram.
 */
export function evaluateReversal(
  agentId: string,
  severity: BleedSeverity = "major",
  andexxaParams?: { lastDoseMg: number; hoursSinceLastDose: number },
): ReversalEvaluation {
  const drug = DRUG_BY_ID[agentId];
  const agentName = drug?.name ?? agentId;

  if (severity === "minor") {
    return {
      agentId,
      agentName,
      bleedSeverity: severity,
      headline: "Minor Bleeding: Local Measures & Temporary Hold",
      immediateActions: [
        "Apply direct local pressure / hemostatic packing.",
        "Delay or skip next 1–2 doses of anticoagulant.",
        "Check basic labs: CBC (hemoglobin/hematocrit), platelet count, renal function, PT/INR, aPTT.",
        "Identify and address reversible bleeding source (e.g. epistaxis, superficial laceration, hemorrhoids).",
        "Reversal agents are NOT indicated for minor bleeding.",
      ],
      specificAntidote: null,
      nonSpecificAlternative: {
        agent: "None indicated",
        dosing: "Supportive care and local hemostasis only.",
        caution: "Administering prothrombotic reversal agents for minor bleeds exposes the patient to serious thromboembolic stroke/DVT risk without clinical benefit.",
      },
      hemodialysisRole: {
        isDialyzable: false,
        clearancePct: "N/A",
        note: "Not indicated for minor bleeds.",
      },
      monitoringLabs: ["CBC (Hgb/Hct)", "Scr / CrCl", "Vital signs"],
      resumptionGuidance: "Resume anticoagulant once minor bleeding has resolved, typically within 24–48 hours.",
    };
  }

  // Major / Life-threatening or Urgent Procedure
  if (agentId === "dabigatran") {
    return {
      agentId,
      agentName,
      bleedSeverity: severity,
      headline: "Major Bleed / Urgent Surgery: Idarucizumab (Praxbind) 5 g IV",
      immediateActions: [
        "DISCONTINUE dabigatran immediately.",
        "Establish 2 large-bore IV lines; volume resuscitation / type & crossmatch.",
        "Administer Idarucizumab (Praxbind) 5 g IV immediately.",
        "Consider activated charcoal 50 g PO if ingested within past 2 hours.",
      ],
      specificAntidote: {
        name: "Idarucizumab",
        brand: "Praxbind",
        mechanism: "Humanized monoclonal antibody Fab fragment with 350-fold higher binding affinity for dabigatran than thrombin. Neutralizes unbound and thrombin-bound drug within minutes.",
        regimen: "5 g IV administered as two consecutive 2.5 g / 50 mL IV infusions or boluses.",
        fdaApproved: true,
      },
      nonSpecificAlternative: {
        agent: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra)",
        dosing: "50 units/kg IV (max 5,000 units) OR fixed dose 2,000 units IV.",
        caution: "Second-line rescue when Praxbind is unavailable on hospital formulary.",
      },
      hemodialysisRole: {
        isDialyzable: true,
        clearancePct: "50–60% cleared over 4 hours",
        note: "Dabigatran is ~80% renally cleared and only 35% protein-bound. If Praxbind is unavailable and patient is in severe toxicity with refractory hemorrhage, emergency hemodialysis effectively removes circulating drug.",
      },
      monitoringLabs: [
        "Dilute Thrombin Time (dTT) or Ecarin Clotting Time (ECT) — direct dabigatran activity",
        "aPTT (prolonged aPTT indicates dabigatran presence; normal aPTT excludes high levels)",
        "Thrombin Time (TT) — extremely sensitive; normal TT rules out clinically relevant dabigatran",
        "CBC (Hgb/Hct), basic metabolic panel (CrCl)",
      ],
      resumptionGuidance:
        "Patients can restart dabigatran 24 hours after idarucizumab administration if clinically stable and hemostasis achieved. If thrombotic risk is high, heparin/LMWH can be started 24 hours post-reversal.",
    };
  }

  if (agentId === "apixaban" || agentId === "rivaroxaban") {
    const lastMg = andexxaParams?.lastDoseMg ?? (agentId === "apixaban" ? 5 : 20);
    const lastHrs = andexxaParams?.hoursSinceLastDose ?? 4;
    const andexxaCalc = calculateAndexxaDose(agentId, lastMg, lastHrs);

    return {
      agentId,
      agentName,
      bleedSeverity: severity,
      headline: `Major Bleed / Urgent Surgery: Andexanet alfa (Andexxa) or 4F-PCC`,
      immediateActions: [
        `DISCONTINUE ${agentName} immediately.`,
        "Establish aggressive volume / red cell resuscitation; maintain mean arterial pressure.",
        "Administer specific reversal agent (Andexanet alfa) OR 4-Factor PCC (Kcentra) per hospital emergency protocol.",
        "Consider activated charcoal 50 g PO if ingested within the last 2 hours.",
      ],
      specificAntidote: {
        name: "Andexanet alfa",
        brand: "Andexxa",
        mechanism: "Recombinant modified human factor Xa decoy protein that binds and sequesters factor Xa inhibitors (apixaban, rivaroxaban) with high affinity.",
        regimen: andexxaCalc.isHighDose
          ? "High-Dose: 800 mg IV bolus @ 30 mg/min + 8 mg/min IV infusion × 120 min (total 1,760 mg)"
          : "Low-Dose: 400 mg IV bolus @ 30 mg/min + 4 mg/min IV infusion × 120 min (total 880 mg)",
        fdaApproved: true,
      },
      andexxaCalc,
      nonSpecificAlternative: {
        agent: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra)",
        dosing: "50 units/kg IV (max 5,000 units) OR fixed dose 2,000 units IV over 10–15 minutes.",
        caution:
          "4F-PCC is the predominant hospital formulary first-line choice in many centers due to rapid availability, lower cost, and comparable clinical hemostatic efficacy in observational registries.",
      },
      hemodialysisRole: {
        isDialyzable: false,
        clearancePct: "<7% cleared (not dialyzable)",
        note: `Both apixaban (87% protein bound) and rivaroxaban (92–95% protein bound) have extensive plasma protein binding. Hemodialysis is INEFFECTIVE and will not clear drug.`,
      },
      monitoringLabs: [
        "Anti-Factor Xa activity calibrated to specific DOAC (gold standard for residual exposure)",
        "Standard Heparin Anti-Xa assay (calibrated to heparin; serves as qualitative surrogate)",
        "PT/INR (prolonged by rivaroxaban, less sensitive for apixaban)",
        "CBC, type & screen, serum creatinine",
      ],
      resumptionGuidance:
        "ANNEXA-4 trial safety alert: 10% of patients experienced thromboembolic events within 30 days of Andexxa administration. Resumption of oral or parenteral anticoagulation as soon as medically safe is critical to mitigate rebound thrombosis.",
    };
  }

  if (agentId === "edoxaban") {
    return {
      agentId,
      agentName,
      bleedSeverity: severity,
      headline: "Major Bleed / Urgent Surgery: 4-Factor PCC (Kcentra) 50 units/kg",
      immediateActions: [
        "DISCONTINUE edoxaban immediately.",
        "Establish hemodynamic resuscitation.",
        "Administer 4-Factor PCC 50 units/kg (max 5,000 units).",
        "Note: Andexanet alfa is not FDA-approved for edoxaban, though off-label use is reported in select registries.",
      ],
      specificAntidote: null,
      nonSpecificAlternative: {
        agent: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra)",
        dosing: "50 units/kg IV (max 5,000 units) OR fixed dose 2,000 units IV.",
        caution: "Primary recommended hemostatic reversal agent for edoxaban in ACC/AHA guidelines.",
      },
      hemodialysisRole: {
        isDialyzable: false,
        clearancePct: "~9% cleared (minimally dialyzable)",
        note: "Hemodialysis does not provide clinically meaningful clearance of edoxaban.",
      },
      monitoringLabs: ["Anti-Factor Xa assay", "PT/INR", "CBC", "Serum creatinine"],
      resumptionGuidance: "Resume therapeutic anticoagulation once surgical/clinical hemostasis is secure.",
    };
  }

  if (agentId === "warfarin") {
    return {
      agentId,
      agentName,
      bleedSeverity: severity,
      headline: "Major Bleeding: 4-Factor PCC + IV Vitamin K (Phytonadione)",
      immediateActions: [
        "DISCONTINUE warfarin immediately.",
        "Check stat INR.",
        "Administer 4-Factor PCC (Kcentra) dosed to pre-treatment INR: INR 2 to <4: 25 units/kg; INR 4 to 6: 35 units/kg; INR >6: 50 units/kg (max 5,000 units).",
        "Co-administer Vitamin K1 (Phytonadione) 5–10 mg slow IV in 50 mL normal saline over 30 minutes (reverses VKORC1 block to sustain factor synthesis after PCC factors clear).",
      ],
      specificAntidote: {
        name: "4-Factor PCC + Vitamin K1 (Phytonadione)",
        brand: "Kcentra + Vitamin K",
        mechanism: "4F-PCC provides immediate replacement of vitamin K-dependent factors (II, VII, IX, X and proteins C/S). IV Vitamin K stimulates endogenous liver synthesis (onset 4–6h, peak 24h).",
        regimen: "4F-PCC 25–50 units/kg IV + Vitamin K 5–10 mg slow IV infusion.",
        fdaApproved: true,
      },
      nonSpecificAlternative: {
        agent: "Fresh Frozen Plasma (FFP)",
        dosing: "10–15 mL/kg IV (requires thawing and large fluid volume; inferior to 4F-PCC).",
        caution: "FFP has slow reversal onset, requires large infusion volumes, and carries transfusion-associated circulatory overload (TACO) risk.",
      },
      hemodialysisRole: {
        isDialyzable: false,
        clearancePct: "<1% (99% protein-bound)",
        note: "Not dialyzable.",
      },
      monitoringLabs: ["Stat INR (repeat 30 min post-PCC infusion and q4–6h)", "CBC", "LFTs"],
      resumptionGuidance: "Resume warfarin once bleeding has stabilized and patient is cleared by surgical/interventional team.",
    };
  }

  if (agentId === "enoxaparin" || agentId === "heparin") {
    return {
      agentId,
      agentName,
      bleedSeverity: severity,
      headline: `Major Bleeding: Protamine Sulfate Reversal`,
      immediateActions: [
        `DISCONTINUE ${agentName} immediately.`,
        agentId === "heparin"
          ? "Administer Protamine sulfate: 1 mg per 100 units of heparin administered in the previous 2–3 hours (max single dose 50 mg; infuse slowly over 10 min to prevent severe hypotension)."
          : "Administer Protamine sulfate: If enoxaparin given within 8 hours, 1 mg protamine per 1 mg enoxaparin (max 50 mg). If >8 hours ago, 0.5 mg protamine per 1 mg enoxaparin. Note: Protamine neutralizes ~60% of enoxaparin anti-Xa activity.",
      ],
      specificAntidote: {
        name: "Protamine sulfate",
        brand: "Protamine",
        mechanism: "Strongly basic polycationic peptide that binds strongly acidic heparin/LMWH to form an inactive salt complex.",
        regimen: agentId === "heparin" ? "1 mg per 100 units heparin (max 50 mg)" : "1 mg per 1 mg enoxaparin (max 50 mg)",
        fdaApproved: true,
      },
      nonSpecificAlternative: {
        agent: "Supportive hemostatic therapy (rFVIIa or 4F-PCC for life-threatening refractory LMWH bleed)",
        dosing: "Consult hematology.",
        caution: "Experimental off-label use.",
      },
      hemodialysisRole: {
        isDialyzable: false,
        clearancePct: "Not dialyzable",
        note: "Not dialyzable.",
      },
      monitoringLabs: ["aPTT (for heparin)", "Anti-Factor Xa level (for LMWH)", "CBC", "Platelet count (evaluate for HIT)"],
      resumptionGuidance: "Carefully re-evaluate indication and time since hemostasis.",
    };
  }

  // Generic fallback
  return {
    agentId,
    agentName,
    bleedSeverity: severity,
    headline: "Major Bleed: Stop Agent and Initiate Resuscitation",
    immediateActions: [
      `Stop ${agentName} immediately.`,
      "Obtain emergent hematology and surgical consultation.",
      "Check coagulation panel and CBC.",
    ],
    specificAntidote: null,
    nonSpecificAlternative: {
      agent: "4-Factor PCC or FFP per institutional bleeding protocol",
      dosing: "Hospital transfusion protocol.",
      caution: "Monitor for thrombosis.",
    },
    hemodialysisRole: {
      isDialyzable: false,
      clearancePct: "Variable",
      note: "Review agent-specific clearance.",
    },
    monitoringLabs: ["CBC", "Coagulation parameters"],
    resumptionGuidance: "Resumption guided by multidisciplinary team.",
  };
}

/**
 * Detects pharmacokinetic (CYP3A4/P-gp) and pharmacodynamic (platelet/mucosal) collisions
 * involving anticoagulants on the current desk.
 */
export function findAnticoagulantCollisions(ids: string[]): AnticoagulantCollision[] {
  const collisions: AnticoagulantCollision[] = [];
  const hasApixaban = ids.includes("apixaban");
  const hasRivaroxaban = ids.includes("rivaroxaban");
  const hasDabigatran = ids.includes("dabigatran");
  const hasEdoxaban = ids.includes("edoxaban");
  const hasWarfarin = ids.includes("warfarin");
  const hasAnyAnticoagulant = ids.some((id) => ALL_ANTICOAGULANT_IDS.has(id));

  if (!hasAnyAnticoagulant) return collisions;

  // 1. Dual strong CYP3A4 + P-gp inhibitors
  for (const id of ids) {
    if (DUAL_STRONG_INHIBITORS.has(id)) {
      const perpName = DRUG_BY_ID[id]?.name ?? id;
      if (hasApixaban) {
        collisions.push({
          drugId: id,
          drugName: perpName,
          category: "dual-strong-inhibitor",
          severity: "major",
          headline: `Apixaban × ${perpName}: Dual CYP3A4 + P-gp Blockade`,
          mechanism: `${perpName} inhibits both CYP3A4 clearance and P-gp intestinal efflux, doubling apixaban plasma AUC and peak concentration.`,
          clinicalAction:
            "FDA Labeling: Reduce apixaban dose by 50% (e.g. 5 mg BID reduced to 2.5 mg BID; 10 mg BID reduced to 5 mg BID). If patient is ALREADY taking 2.5 mg BID due to ABC criteria, AVOID co-administration.",
        });
      }
      if (hasRivaroxaban) {
        collisions.push({
          drugId: id,
          drugName: perpName,
          category: "dual-strong-inhibitor",
          severity: "contraindicated",
          headline: `Rivaroxaban × ${perpName}: Avoid Co-administration`,
          mechanism: `${perpName} strongly blocks both CYP3A4 and P-gp, increasing rivaroxaban AUC up to 2.6-fold with severe bleeding escalation.`,
          clinicalAction:
            "FDA Labeling: Avoid concomitant use of rivaroxaban with combined P-gp and strong CYP3A4 inhibitors. Consider apixaban with dose reduction or switch to parenteral/VKA therapy.",
        });
      }
    }
  }

  // 2. Dual strong CYP3A4 + P-gp inducers
  for (const id of ids) {
    if (DUAL_STRONG_INDUCERS.has(id)) {
      const perpName = DRUG_BY_ID[id]?.name ?? id;
      if (hasApixaban || hasRivaroxaban || hasEdoxaban || hasDabigatran) {
        collisions.push({
          drugId: id,
          drugName: perpName,
          category: "dual-strong-inducer",
          severity: "contraindicated",
          headline: `DOAC × ${perpName}: Severe Subtherapeutic Levels & Stroke Risk`,
          mechanism: `Potent induction of hepatic CYP3A4 and intestinal P-gp reduces DOAC bioavailability and accelerates clearance (AUC drops ~50–70%).`,
          clinicalAction:
            "FDA Labeling: Avoid concomitant use of DOACs with strong dual CYP3A4 and P-gp inducers. High risk of catastrophic thromboembolic stroke or recurrent DVT/PE. Switch to warfarin or LMWH with monitored INR/anti-Xa.",
        });
      }
    }
  }

  // 3. Concomitant Antiplatelets
  for (const id of ids) {
    if (ANTIPLATELET_IDS.has(id)) {
      const drugName = DRUG_BY_ID[id]?.name ?? id;
      collisions.push({
        drugId: id,
        drugName,
        category: "antiplatelet",
        severity: "major",
        headline: `Anticoagulant × ${drugName}: Multi-Agent Hemostatic Collision`,
        mechanism: `Dual coagulation cascade suppression + platelet inhibition. Concomitant antiplatelet therapy increases major bleeding risk 2- to 3-fold.`,
        clinicalAction:
          "ACC/AHA and ESC Guidelines: Omit aspirin in stable CAD/AF unless recent acute coronary syndrome or PCI (stent). If triple therapy (DOAC + DAPT) is required post-PCI, drop aspirin early (usually upon hospital discharge) and maintain DOAC + clopidogrel.",
      });
    }
  }

  // 4. Concomitant NSAIDs
  for (const id of ids) {
    if (NSAID_IDS.has(id)) {
      const drugName = DRUG_BY_ID[id]?.name ?? id;
      collisions.push({
        drugId: id,
        drugName,
        category: "nsaid",
        severity: "major",
        headline: `Anticoagulant × ${drugName}: Severe GI Bleed Synergy`,
        mechanism: `NSAID-mediated COX-1 inhibition impairs platelet thromboxane A2 aggregation and causes direct gastric mucosal injury. Combined with systemic anticoagulation, GI hemorrhage risk multiplies 3- to 6-fold.`,
        clinicalAction:
          "Avoid routine NSAID co-prescription with anticoagulants. If analgesia is needed, consider acetaminophen, topical agents, or non-pharmacologic modalities. If an NSAID is unavoidable, co-prescribe a PPI (e.g. pantoprazole).",
      });
    }
  }

  // 5. Concomitant SSRI / SNRIs
  for (const id of ids) {
    if (SSRI_SNRI_IDS.has(id)) {
      const drugName = DRUG_BY_ID[id]?.name ?? id;
      collisions.push({
        drugId: id,
        drugName,
        category: "ssri-snri",
        severity: "moderate",
        headline: `Anticoagulant × ${drugName}: Platelet Serotonin Depletion`,
        mechanism: `Serotonin reuptake inhibition blocks SERT on platelet membranes, depleting dense granule serotonin stores and impairing platelet aggregation.`,
        clinicalAction:
          "Observational studies confirm a ~1.5- to 2-fold increase in major bleeding (especially upper GI). Counsel patient on petechiae, easy bruising, melena. Consider gastroprotection with a PPI.",
      });
    }
  }

  // 6. Herbals
  for (const id of ids) {
    if (HERBAL_BLEED_IDS.has(id)) {
      const drugName = DRUG_BY_ID[id]?.name ?? id;
      collisions.push({
        drugId: id,
        drugName,
        category: "herbal-bleed",
        severity: "moderate",
        headline: `Anticoagulant × ${drugName}: Additive Bleeding Tendency`,
        mechanism: `High-dose omega-3 fatty acids, ginkgo terpenoids, or organosulfurs impair platelet aggregation or enhance fibrinolysis.`,
        clinicalAction: "Inquire about supplement doses. Advise stopping herbal bleed stacks prior to planned invasive procedures.",
      });
    }
  }

  return collisions;
}

/**
 * Builds the comprehensive DOAC & Bleed Management Desk report.
 */
export function doacReportOnDesk(
  ids: string[],
  host: HostContext,
  customParams?: {
    age?: number;
    weightKg?: number;
    scr?: number;
    sex?: Sex;
    indication?: DoacIndication;
    procedureRisk?: ProcedureBleedRisk;
    bleedSeverity?: BleedSeverity;
  },
): DoacReport {
  const meta = doacOnDesk(ids);

  // Derive physiological defaults
  const age = customParams?.age ?? (host.age === "geriatric" ? 82 : 65);
  const weightKg = customParams?.weightKg ?? 70;
  const scr = customParams?.scr ?? (host.kidney === "ckd" ? 1.8 : 1.0);
  const sex: Sex = customParams?.sex ?? "male";
  const indication: DoacIndication = customParams?.indication ?? "nvaf";
  const procedureRisk: ProcedureBleedRisk = customParams?.procedureRisk ?? "low";
  const bleedSeverity: BleedSeverity = customParams?.bleedSeverity ?? "major";

  const crclCalc: CrclResult | null = crclOf({ age, weightKg, scr, sex });
  const crcl = crclCalc?.crcl ?? 75;

  let apixabanAbc: ApixabanAbcEvaluation | undefined;
  if (ids.includes("apixaban")) {
    apixabanAbc = evaluateApixabanAbc({ age, weightKg, scr, indication });
  }

  const renalRails: DoacRenalRail[] = [];
  const perioperativeHolds: PerioperativeHold[] = [];
  const reversals: ReversalEvaluation[] = [];

  for (const id of meta.anticoagulants) {
    renalRails.push(evaluateDoacRenal(id, crcl, weightKg, indication));
    perioperativeHolds.push(calculatePerioperativeHold(id, crcl, procedureRisk));
    reversals.push(evaluateReversal(id, bleedSeverity));
  }

  const collisions = findAnticoagulantCollisions(ids);

  const clinicalTakeaways: string[] = [];
  if (meta.hasDoac) {
    clinicalTakeaways.push(
      "DOACs feature predictable pharmacokinetic profiles and rapid onset/offset (half-lives 8–17h), eliminating the need for routine INR monitoring or pre-operative bridging heparin.",
    );
  }
  if (ids.includes("apixaban")) {
    clinicalTakeaways.push(
      'Apixaban dose reduction in NVAF requires meeting at least 2 of 3 "ABC" criteria (Age ≥80, Weight ≤60 kg, SCr ≥1.5 mg/dL). Meeting only 1 criterion does NOT warrant reduction.',
    );
  }
  if (ids.includes("edoxaban") && crcl > 95 && indication === "nvaf") {
    clinicalTakeaways.push(
      "CRITICAL: Edoxaban carries an FDA Black Box Warning prohibiting use in NVAF with CrCl >95 mL/min due to elevated ischemic stroke rates compared to warfarin.",
    );
  }
  if (ids.includes("rivaroxaban")) {
    clinicalTakeaways.push(
      "Rivaroxaban 15 mg and 20 mg tablets must strictly be taken with food to ensure complete oral bioavailability (~100% with food vs 66% fasting).",
    );
  }
  if (ids.includes("dabigatran")) {
    clinicalTakeaways.push(
      "Dabigatran capsules must be swallowed whole without opening or chewing (+75% exposure spike). Dabigatran is the only DOAC effectively cleared by hemodialysis (~50–60% over 4h).",
    );
  }
  if (collisions.some((c) => c.severity === "contraindicated")) {
    clinicalTakeaways.push(
      "Severe drug collision identified on the desk: Dual strong CYP3A4/P-gp inducers or contraindicated inhibitors compromise anticoagulant safety.",
    );
  }

  return {
    hasAnticoagulant: meta.hasAnticoagulant,
    hasDoac: meta.hasDoac,
    hasReversal: meta.hasReversal,
    anticoagulantsOnDesk: meta.anticoagulants,
    reversalsOnDesk: meta.reversals,
    patientProfile: {
      age,
      weightKg,
      scr,
      sex,
      crcl,
      indication,
      procedureRisk,
      bleedSeverity,
    },
    apixabanAbc,
    renalRails,
    perioperativeHolds,
    reversals,
    collisions,
    clinicalTakeaways,
    disclaimer: `${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

