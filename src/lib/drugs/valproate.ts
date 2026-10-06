/**
 * Valproate (Valproic Acid / Divalproex) Pharmacokinetics, Saturable Binding & Hyperammonemia Station.
 *
 * Educational clinical pharmacology reference synthesizing:
 * 1. Saturable Human Serum Albumin Binding (Non-Linear Kinetics):
 *    - Free fraction expands non-linearly from ~10% at <50 mcg/mL to >25-30% at >75-100 mcg/mL.
 *    - Free valproate levels can be severely toxic even when total concentration appears "therapeutic".
 * 2. Hypoalbuminemia Normalization (Hermida and Kodama equations):
 *    - Free valproate estimation when unbound level cannot be promptly measured.
 * 3. Valproate-Induced Hyperammonemic Encephalopathy (VHE):
 *    - Mitochondrial urea cycle block (N-acetylglutamate synthase inhibition).
 *    - Critical diagnostic trap: Ammonia is elevated while AST/ALT/Bilirubin are frequently normal.
 * 4. L-Carnitine (Levocarnitine / Carnitor) Antidote Stoichiometry:
 *    - Loading dose: 100 mg/kg IV (max 6 g) over 30 min, then 50 mg/kg IV q8h until ammonia normalizes.
 * 5. Critical Drug Collisions:
 *    - Carbapenem crash: Irreversible 60-90% drop in valproate within 24h (contraindicated).
 *    - Lamotrigine UGT inhibition: Doubles lamotrigine t1/2, severe Stevens-Johnson syndrome (SJS) hazard.
 *    - Topiramate: Synergistic hyperammonemic encephalopathy without LFT rise.
 *    - Aspirin: Protein binding displacement and beta-oxidation inhibition.
 *
 * Strictly non-prescriptive educational reference. Not an FDA-cleared clinical decision
 * support tool, not an order set, and not a dosing directive. The FDA-approved Prescribing
 * Information, medical toxicology consultation, and attending clinician govern.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { PI_FOOTER, NOT_CLEARED } from "../regulatory";

export interface ValproateLevelEval {
  totalMcgMl: number;
  albuminGDl: number;
  measuredFreeMcgMl?: number;
  estimatedFreeMcgMl: number;
  estimatedFreeFractionPct: number;
  method: "measured" | "hermida" | "kodama";
  totalBand: "subtherapeutic" | "target-epilepsy" | "target-mania" | "elevated" | "toxic";
  freeBand: "subtherapeutic" | "target" | "elevated" | "toxic";
  saturationWarning: boolean;
  headline: string;
  clinicalInterpretation: string;
  pearl: string;
}

export interface VheEvaluation {
  ammoniaUmolL: number;
  astAltElevated: boolean;
  hasEncephalopathySymptoms: boolean;
  hasTopiramate: boolean;
  riskTier: "normal" | "mild-hyperammonemia" | "high-risk-vhe" | "confirmed-vhe";
  headline: string;
  normalLftTrapAlert: string;
  topiramateSynergyAlert: string | null;
  carnitineIndicated: boolean;
  recommendedActions: string[];
}

export interface CarnitineDosing {
  weightKg: number;
  indication: "hyperammonemic-encephalopathy" | "acute-severe-overdose" | "asymptomatic-mild";
  ivLoadingDoseMg: number;
  ivLoadingDoseVials: number; // 1 g / 5 mL vials
  ivMaintenanceDoseMg: number;
  ivMaintenanceFrequency: string;
  maxLoadingDoseMg: number;
  durationGuidance: string;
  administrationNote: string;
}

export interface ValproateCollision {
  drugId: string;
  drugName: string;
  category: "carbapenem-crash" | "lamotrigine-sjs" | "topiramate-ammonia" | "aspirin-displacement" | "inducer-clearance";
  severity: "contraindicated" | "major" | "moderate";
  headline: string;
  mechanism: string;
  clinicalAction: string;
}

export interface ValproateReport {
  hasValproate: boolean;
  onDeskIds: string[];
  levelEval: ValproateLevelEval;
  vheEval: VheEvaluation;
  carnitineDosing: CarnitineDosing;
  collisions: ValproateCollision[];
  clinicalPearls: string[];
  disclaimer: string;
}

export const CARBAPENEM_IDS = new Set(["meropenem", "ertapenem", "imipenem", "doripenem"]);
export const VALPROATE_IDS = new Set(["valproate"]);

/**
 * Checks if valproate or associated perpetrators/antidotes are on the desk.
 */
export function valproateOnDesk(ids: string[]): {
  hasValproate: boolean;
  hasCarbapenem: boolean;
  hasLamotrigine: boolean;
  hasTopiramate: boolean;
  hasCarnitine: boolean;
} {
  return {
    hasValproate: ids.includes("valproate"),
    hasCarbapenem: ids.some((id) => CARBAPENEM_IDS.has(id)),
    hasLamotrigine: ids.includes("lamotrigine"),
    hasTopiramate: ids.includes("topiramate"),
    hasCarnitine: ids.includes("carnitine") || ids.includes("levocarnitine"),
  };
}

/**
 * Calculates estimated free (unbound) valproate level and evaluates saturable protein binding.
 *
 * Hermida Equation:
 *   Free Fraction (FF) = 1 / (0.13 * Albumin + 0.44)
 *   Estimated Free Concentration = Total Concentration * (FF / 100)
 *
 * Normal Reference Ranges:
 *   Total Valproic Acid: 50–100 mcg/mL (up to 125 mcg/mL in acute bipolar mania)
 *   Free (Unbound) Valproate: 5–15 mcg/mL (optimal 7–12 mcg/mL)
 */
export function evaluateValproateLevel(params: {
  totalMcgMl: number;
  albuminGDl?: number;
  measuredFreeMcgMl?: number;
  method?: "hermida" | "kodama";
}): ValproateLevelEval {
  const total = Math.max(0, Math.min(300, params.totalMcgMl));
  const albumin = Math.max(1.0, Math.min(6.0, params.albuminGDl ?? 4.0));
  const method = params.method ?? "hermida";

  let estimatedFreeMcgMl = 0;
  let estimatedFreeFractionPct = 10;

  if (params.measuredFreeMcgMl !== undefined && params.measuredFreeMcgMl > 0) {
    estimatedFreeMcgMl = params.measuredFreeMcgMl;
    estimatedFreeFractionPct = total > 0 ? (estimatedFreeMcgMl / total) * 100 : 10;
  } else if (method === "hermida") {
    // Hermida equation for Free Fraction %
    const ffPct = (1 / (0.13 * albumin + 0.44)) * 10;
    // Saturation adjustment: when total > 75 mcg/mL, human albumin binding sites saturate non-linearly
    let saturationMultiplier = 1.0;
    if (total > 100) {
      saturationMultiplier = 1.0 + (total - 100) * 0.012;
    } else if (total > 75) {
      saturationMultiplier = 1.0 + (total - 75) * 0.006;
    }
    estimatedFreeFractionPct = Math.min(60, ffPct * saturationMultiplier);
    estimatedFreeMcgMl = (total * estimatedFreeFractionPct) / 100;
  } else {
    // Kodama equation
    const ffPct = (1 / (0.126 * albumin + 0.384)) * 10;
    estimatedFreeFractionPct = Math.min(60, ffPct);
    estimatedFreeMcgMl = (total * estimatedFreeFractionPct) / 100;
  }

  // Round values
  estimatedFreeMcgMl = Math.round(estimatedFreeMcgMl * 10) / 10;
  estimatedFreeFractionPct = Math.round(estimatedFreeFractionPct * 10) / 10;

  // Evaluate total band
  let totalBand: ValproateLevelEval["totalBand"] = "target-epilepsy";
  if (total < 50) {
    totalBand = "subtherapeutic";
  } else if (total <= 100) {
    totalBand = "target-epilepsy";
  } else if (total <= 125) {
    totalBand = "target-mania";
  } else if (total <= 150) {
    totalBand = "elevated";
  } else {
    totalBand = "toxic";
  }

  // Evaluate free band
  let freeBand: ValproateLevelEval["freeBand"] = "target";
  if (estimatedFreeMcgMl < 5) {
    freeBand = "subtherapeutic";
  } else if (estimatedFreeMcgMl <= 15) {
    freeBand = "target";
  } else if (estimatedFreeMcgMl <= 25) {
    freeBand = "elevated";
  } else {
    freeBand = "toxic";
  }

  const saturationWarning = total > 75 || estimatedFreeFractionPct > 15 || albumin < 3.5;

  let headline = "";
  let clinicalInterpretation = "";

  if (freeBand === "toxic") {
    headline = "Severely Toxic Free Valproate Level (>25 mcg/mL)";
    clinicalInterpretation = `Estimated free drug concentration is ${estimatedFreeMcgMl} mcg/mL (free fraction ${estimatedFreeFractionPct}%). High risk of obtundation, cerebral edema, hyperammonemia, and respiratory depression. Saturable albumin binding has broken down.`;
  } else if (freeBand === "elevated") {
    headline = "Supratherapeutic Free Valproate Exposure (15–25 mcg/mL)";
    clinicalInterpretation = `Estimated free concentration is ${estimatedFreeMcgMl} mcg/mL. Note: Even if total level (${total} mcg/mL) appears acceptable, unbound active drug is elevated due to ${albumin < 3.5 ? `hypoalbuminemia (${albumin} g/dL)` : "binding site saturation"}.`;
  } else if (freeBand === "target") {
    headline = "Optimal Free Valproate Therapeutic Window (5–15 mcg/mL)";
    clinicalInterpretation = `Estimated free concentration is ${estimatedFreeMcgMl} mcg/mL (target 5–15 mcg/mL; free fraction ~${estimatedFreeFractionPct}%). Good therapeutic balance for seizure control or mood stabilization.`;
  } else {
    headline = "Subtherapeutic Free Valproate (<5 mcg/mL)";
    clinicalInterpretation = `Estimated free concentration is ${estimatedFreeMcgMl} mcg/mL. Below established therapeutic efficacy threshold. Evaluate compliance or drug interactions.`;
  }

  const pearl =
    "Valproate exhibits non-linear, concentration-dependent protein binding. Below 50 mcg/mL, ~90% is bound to albumin. Above 75–100 mcg/mL or in hypoalbuminemia, binding sites saturate and the free fraction surges from 10% to >25-30%. Total level alone can dangerously understate toxicity.";

  return {
    totalMcgMl: total,
    albuminGDl: albumin,
    measuredFreeMcgMl: params.measuredFreeMcgMl,
    estimatedFreeMcgMl,
    estimatedFreeFractionPct,
    method: params.measuredFreeMcgMl ? "measured" : method,
    totalBand,
    freeBand,
    saturationWarning,
    headline,
    clinicalInterpretation,
    pearl,
  };
}

/**
 * Evaluates Valproate-Induced Hyperammonemic Encephalopathy (VHE).
 * Normal Serum Ammonia: 15–45 umol/L (or 11–35 umol/L depending on assay).
 */
export function evaluateVhe(params: {
  ammoniaUmolL: number;
  astAltElevated: boolean;
  hasEncephalopathySymptoms: boolean;
  hasTopiramate: boolean;
}): VheEvaluation {
  const { ammoniaUmolL, astAltElevated, hasEncephalopathySymptoms, hasTopiramate } = params;

  let riskTier: VheEvaluation["riskTier"] = "normal";
  let headline = "Normal Serum Ammonia";
  let carnitineIndicated = false;
  const recommendedActions: string[] = [];

  if (ammoniaUmolL > 80 && hasEncephalopathySymptoms) {
    riskTier = "confirmed-vhe";
    headline = "Confirmed Valproate-Induced Hyperammonemic Encephalopathy (VHE)";
    carnitineIndicated = true;
    recommendedActions.push("Discontinue valproate immediately.");
    recommendedActions.push("Initiate IV L-Carnitine (Levocarnitine) loading protocol (100 mg/kg IV up to 6 g).");
    recommendedActions.push("Obtain urgent neurology / medical toxicology consult.");
    recommendedActions.push("Serial ammonia levels q6–12h until normalized.");
    recommendedActions.push("EEG to evaluate for diffuse slowing, triphasic waves, or non-convulsive status epilepticus.");
  } else if (ammoniaUmolL > 80 || (ammoniaUmolL > 50 && hasEncephalopathySymptoms)) {
    riskTier = "high-risk-vhe";
    headline = "High-Risk Hyperammonemia / Impending Encephalopathy";
    carnitineIndicated = true;
    recommendedActions.push("Hold valproate; re-evaluate clinical necessity.");
    recommendedActions.push("Administer IV or oral L-Carnitine to replenish mitochondrial cofactor stores.");
    recommendedActions.push("Monitor for progressive lethargy, asterixis, or paradoxical seizure increase.");
  } else if (ammoniaUmolL > 45) {
    riskTier = "mild-hyperammonemia";
    headline = "Mild / Asymptomatic Hyperammonemia (46–80 umol/L)";
    carnitineIndicated = false;
    recommendedActions.push("Monitor clinical mental status closely.");
    recommendedActions.push("Recheck serum ammonia in 24–48 hours if symptomatic.");
    recommendedActions.push("Avoid co-prescribing topiramate or other carbonic anhydrase inhibitors.");
  } else {
    riskTier = "normal";
    headline = "Normal Ammonia Level (≤45 umol/L)";
    recommendedActions.push("Continue baseline monitoring.");
  }

  const normalLftTrapAlert =
    "CRITICAL DIAGNOSTIC TRAP: Valproate-induced hyperammonemic encephalopathy (VHE) typically presents with completely NORMAL transaminases (AST/ALT) and normal bilirubin. VHE is caused by metabolite inhibition of mitochondrial N-acetylglutamate synthase (NAGS) in the urea cycle, NOT by hepatocellular necrosis. Do not rule out VHE based on normal liver function tests!";

  let topiramateSynergyAlert: string | null = null;
  if (hasTopiramate) {
    topiramateSynergyAlert =
      "TOPIRAMATE COLLISION ALERT: Co-administration of topiramate with valproate markedly accelerates hyperammonemia risk through additive inhibition of hepatic carbonic anhydrase II/V and glutamine synthetase. Encephalopathy can occur even at therapeutic valproate doses and normal LFTs.";
  }

  return {
    ammoniaUmolL,
    astAltElevated,
    hasEncephalopathySymptoms,
    hasTopiramate,
    riskTier,
    headline,
    normalLftTrapAlert,
    topiramateSynergyAlert,
    carnitineIndicated,
    recommendedActions,
  };
}

/**
 * Calculates L-Carnitine (Levocarnitine / Carnitor) Antidote Sizing Protocol.
 * Dosing:
 *   IV Loading Dose: 100 mg/kg IV over 30 minutes (maximum single dose 6,000 mg = 6 g).
 *   Maintenance Dose: 50 mg/kg IV every 8 hours (or continuous infusion), max 3,000 mg/dose.
 * Supplied: 1 g / 5 mL (200 mg/mL) vials.
 */
export function calculateCarnitineDosing(
  weightKg: number,
  indication: "hyperammonemic-encephalopathy" | "acute-severe-overdose" | "asymptomatic-mild" = "hyperammonemic-encephalopathy",
): CarnitineDosing {
  const wt = Math.max(10, Math.min(250, weightKg));
  const maxLoadingDoseMg = 6000;

  let ivLoadingDoseMg = Math.min(maxLoadingDoseMg, Math.round((wt * 100) / 100) * 100);
  let ivMaintenanceDoseMg = Math.min(3000, Math.round((wt * 50) / 100) * 100);

  if (indication === "asymptomatic-mild") {
    ivLoadingDoseMg = Math.min(3000, Math.round((wt * 50) / 100) * 100);
    ivMaintenanceDoseMg = Math.min(2000, Math.round((wt * 33) / 100) * 100);
  }

  const ivLoadingDoseVials = Math.ceil(ivLoadingDoseMg / 1000);

  const durationGuidance =
    "Continue L-carnitine until clinical encephalopathy resolves and serum ammonia decreases below 50 umol/L (typically 24–48 hours).";

  const administrationNote =
    "Dilute loading dose in 100–250 mL of 0.9% NaCl or D5W and infuse IV over 30 minutes. Rapid IV bolus may cause transient nausea, vomiting, and fishy body odor (trimethylamine metabolite).";

  return {
    weightKg: wt,
    indication,
    ivLoadingDoseMg,
    ivLoadingDoseVials,
    ivMaintenanceDoseMg,
    ivMaintenanceFrequency: "every 8 hours IV",
    maxLoadingDoseMg,
    durationGuidance,
    administrationNote,
  };
}

/**
 * Evaluates pharmacokinetic and pharmacodynamic collisions for Valproate on the active desk.
 */
export function findValproateCollisions(ids: string[]): ValproateCollision[] {
  const collisions: ValproateCollision[] = [];
  if (!ids.includes("valproate")) return collisions;

  // 1. Carbapenems (Meropenem, Ertapenem, Imipenem, Doripenem)
  for (const id of ids) {
    if (CARBAPENEM_IDS.has(id)) {
      const drugName = DRUG_BY_ID[id]?.name ?? id;
      collisions.push({
        drugId: id,
        drugName,
        category: "carbapenem-crash",
        severity: "contraindicated",
        headline: `Valproate × ${drugName}: Severe / Fatal Carbapenem Crash`,
        mechanism: `Carbapenems irreversibly inhibit acylpeptide hydrolase and intestinal acyl-glucuronide transporters, blocking hydrolysis of valproate glucuronide back into active parent drug. Valproate serum levels collapse by 60–90% within 24 hours.`,
        clinicalAction:
          "CONTRAINDICATED. Increasing the valproate dose fails to overcome the metabolic block and does not restore therapeutic concentrations. Switch to an alternative non-carbapenem antibiotic, or replace valproate with levetiracetam or lacosamide immediately to avert breakthrough status epilepticus.",
      });
    }
  }

  // 2. Lamotrigine
  if (ids.includes("lamotrigine")) {
    collisions.push({
      drugId: "lamotrigine",
      drugName: "Lamotrigine",
      category: "lamotrigine-sjs",
      severity: "contraindicated",
      headline: "Valproate × Lamotrigine: UGT Inhibition & SJS/TEN Hazard",
      mechanism: "Valproate potently inhibits UGT1A4 and UGT2B7 glucuronidation, more than doubling lamotrigine elimination half-life (from 25–30h to 48–60h).",
      clinicalAction:
        "BLACK BOX WARNING: Steep increase in life-threatening toxic epidermal necrolysis (TEN) and Stevens-Johnson syndrome (SJS). If initiating lamotrigine in a patient taking valproate, use the dedicated 'blue starter kit' (25 mg every other day × 2 weeks, then 25 mg daily × 2 weeks; ≥50% dose reduction).",
    });
  }

  // 3. Topiramate
  if (ids.includes("topiramate")) {
    collisions.push({
      drugId: "topiramate",
      drugName: "Topiramate",
      category: "topiramate-ammonia",
      severity: "major",
      headline: "Valproate × Topiramate: Synergistic Hyperammonemic Encephalopathy",
      mechanism: "Topiramate inhibits carbonic anhydrase II/V and glutamine synthetase, impairing renal and hepatic ammonium clearance and compounding valproate-induced NAGS inhibition.",
      clinicalAction:
        "Monitor for lethargy, hypothermia, confusion, and asterixis. Check serum ammonia promptly if cognitive changes occur. Discontinue valproate and initiate L-carnitine if symptomatic hyperammonemia develops. AST/ALT remain normal in most cases.",
    });
  }

  // 4. Aspirin
  if (ids.includes("aspirin")) {
    collisions.push({
      drugId: "aspirin",
      drugName: "Aspirin",
      category: "aspirin-displacement",
      severity: "major",
      headline: "Valproate × Aspirin: Albumin Displacement & Beta-Oxidation Block",
      mechanism: "Salicylates displace valproate from serum albumin binding sites, expanding the free fraction, while competitively inhibiting mitochondrial beta-oxidation.",
      clinicalAction:
        "Avoid high-dose aspirin co-prescribing. Free valproate toxicity can manifest even when total levels appear unchanged. Consider acetaminophen for analgesia.",
    });
  }

  // 5. Enzyme Inducers (Phenytoin, Carbamazepine, Phenobarbital)
  const inducers = ["phenytoin", "carbamazepine", "phenobarbital"].filter((i) => ids.includes(i));
  for (const id of inducers) {
    const drugName = DRUG_BY_ID[id]?.name ?? id;
    collisions.push({
      drugId: id,
      drugName,
      category: "inducer-clearance",
      severity: "moderate",
      headline: `Valproate × ${drugName}: Accelerated Glucuronidation Clearance`,
      mechanism: `${drugName} induces CYP2C9 and UGT enzymes, increasing valproate clearance and lowering serum concentrations by 40–50%. In reverse, valproate displaces phenytoin from albumin (expanding free phenytoin).`,
      clinicalAction: "Monitor free levels of both antiepileptics. Adjust dosages based on clinical seizure control.",
    });
  }

  return collisions;
}

/**
 * Generates the full Valproate clinical pharmacology report.
 */
export function valproateReportOnDesk(
  ids: string[],
  host: HostContext,
  params?: {
    totalMcgMl?: number;
    albuminGDl?: number;
    ammoniaUmolL?: number;
    weightKg?: number;
    astAltElevated?: boolean;
    hasEncephalopathySymptoms?: boolean;
  },
): ValproateReport {
  const hasValproate = ids.includes("valproate");
  const onDeskIds = ids.filter((id) => VALPROATE_IDS.has(id));

  const totalMcgMl = params?.totalMcgMl ?? 75;
  const albuminGDl = params?.albuminGDl ?? (host.kidney === "ckd" ? 3.0 : 4.0);
  const ammoniaUmolL = params?.ammoniaUmolL ?? 32;
  const weightKg = params?.weightKg ?? 70;
  const astAltElevated = params?.astAltElevated ?? false;
  const hasEncephalopathySymptoms = params?.hasEncephalopathySymptoms ?? false;
  const hasTopiramate = ids.includes("topiramate");

  const levelEval = evaluateValproateLevel({ totalMcgMl, albuminGDl });
  const vheEval = evaluateVhe({
    ammoniaUmolL,
    astAltElevated,
    hasEncephalopathySymptoms,
    hasTopiramate,
  });
  const carnitineDosing = calculateCarnitineDosing(weightKg, vheEval.carnitineIndicated ? "hyperammonemic-encephalopathy" : "asymptomatic-mild");
  const collisions = findValproateCollisions(ids);

  const clinicalPearls: string[] = [
    "Saturable Protein Binding: Human serum albumin binding sites saturate at valproate concentrations >75–100 mcg/mL, causing the free fraction to rapidly expand from 10% to >25-30%.",
    "Normal LFT Diagnostic Trap: Valproate-induced hyperammonemic encephalopathy (VHE) typically presents with completely normal AST/ALT/bilirubin. Check ammonia directly when patients develop unexplained lethargy or asterixis.",
    "Carbapenem Contraindication: Carbapenems (meropenem, ertapenem) crash valproate levels by 60–90% within 24 hours. The interaction is irreversible and cannot be overcome by dose escalation.",
    "Lamotrigine SJS Hazard: Valproate inhibits lamotrigine glucuronidation and doubles its half-life. Start lamotrigine at 50% reduced dose (blue starter kit) to avoid toxic epidermal necrolysis.",
    "L-Carnitine Antidote: High-dose IV levocarnitine (100 mg/kg loading, max 6 g, then 50 mg/kg q8h) replenishes depleted mitochondrial cofactor pools and restores urea cycle function in VHE.",
  ];

  if (host.preg === "pregnant") {
    clinicalPearls.unshift(
      "BLACK BOX TERATOGENICITY: Strictly contraindicated in pregnancy for migraine prophylaxis; avoid in epilepsy/bipolar if any alternative exists. High risk of neural tube defects (spina bifida 1–2%) and permanent neurodevelopmental IQ reduction.",
    );
  }

  return {
    hasValproate,
    onDeskIds,
    levelEval,
    vheEval,
    carnitineDosing,
    collisions,
    clinicalPearls,
    disclaimer: `${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

