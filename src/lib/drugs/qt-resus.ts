/**
 * Tisdale QTc Risk Score, Multi-Formula QTc Correction & Torsades de Pointes (TdP) Resuscitation Engine.
 *
 * Electrophysiological modeling:
 * - Multi-formula rate-correction (Bazett, Fridericia, Framingham, Hodges)
 * - Heart rate discrepancy analysis (Tachycardia overestimation vs Bradycardia underestimation)
 * - Sex-adjusted repolarization risk tiers (Normal, Borderline, Prolonged, Critical >=500 ms)
 * - Validated Tisdale Inpatient QTc Risk Score (Circulation 2013; 0-21 points)
 * - Acute Torsades de Pointes Emergency Resuscitation Nomogram (IV Magnesium, Overdrive Pacing, Defibrillation)
 * - IKr / hERG channel block pathophysiology & congenital LQTS (LQT1/2/3) differentiation
 *
 * Educational clinical decision support reference only (FD&C Act 520(o)(1)(E)).
 * Not an automated ECG interpreter and not a substitute for clinical judgment.
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";
import { qtReport, type QtReport, type QtRow } from "./qt";

export type Sex = "male" | "female";

export type QtRiskBand = "normal" | "borderline" | "prolonged" | "critical";

export interface MultiQtcInput {
  qtMs: number;
  hrBpm: number;
  sex: Sex;
  baselineQtcMs?: number;
}

export interface RateTrapWarning {
  type: "tachycardia-inflation" | "bradycardia-underestimation" | "concordant";
  divergenceMs: number;
  headline: string;
  explanation: string;
  recommendation: string;
}

export interface MultiQtcResult {
  qtMs: number;
  hrBpm: number;
  sex: Sex;
  rrSec: number;
  bazettMs: number;
  fridericiaMs: number;
  framinghamMs: number;
  hodgesMs: number;
  recommendedFormula: "Fridericia" | "Framingham" | "Bazett";
  recommendedQtcMs: number;
  riskBand: QtRiskBand;
  riskLabel: string;
  isProlonged: boolean;
  isCritical: boolean; // >= 500 ms
  deltaBaselineMs: number | null;
  deltaBaselineAlert: string | null;
  rateTrap: RateTrapWarning;
}

export interface TisdaleFactor {
  id: string;
  label: string;
  points: number;
  present: boolean;
  autoDetected: boolean;
  rationale: string;
}

export interface TisdaleInput {
  ageGeriatric?: boolean; // age >= 68 (1 pt)
  femaleSex?: boolean; // female (1 pt)
  loopDiuretic?: boolean; // loop diuretic (1 pt)
  hypokalemia?: boolean; // serum K <= 3.5 mEq/L (2 pts)
  admissionQtcProlonged?: boolean; // admission QTc >= 450 ms (2 pts)
  acuteMi?: boolean; // acute MI (2 pts)
  twoOrMoreQtDrugs?: boolean; // >= 2 QT-prolonging drugs (3 pts)
  sepsis?: boolean; // severe sepsis / septic shock (3 pts)
  heartFailure?: boolean; // heart failure / reduced EF (3 pts)
}

export interface TisdaleResult {
  score: number;
  maxScore: number;
  tier: "low" | "moderate" | "high";
  tierLabel: string;
  predictedRiskPercentage: string;
  factors: TisdaleFactor[];
  clinicalRecommendations: string[];
  telemetryRequirement: string;
  electrolyteTargets: {
    potassiumMeqL: string;
    magnesiumMgDl: string;
  };
  summary: string;
}

export interface TdpStep {
  stepNumber: number;
  title: string;
  agentOrIntervention: string;
  dosingOrParameters: string;
  timing: string;
  mechanism: string;
  clinicalPearls: string[];
  warning?: string;
}

export interface TdpResuscitationProtocol {
  clinicalStatus: "stable-recurrent-bursts" | "unstable-pulseless";
  headline: string;
  urgency: "emergent" | "critical";
  steps: TdpStep[];
  electrolyteDirectives: {
    potassiumTarget: string;
    magnesiumTarget: string;
    laboratoryAlert: string;
  };
  antiarrhythmicAvoidanceList: string[];
}

export interface QtDeskEvaluation {
  hasQtDrugs: boolean;
  qtReport: QtReport | null;
  activeQtRows: QtRow[];
  loopDiureticsOnDesk: string[];
  tisdaleDefault: TisdaleResult;
  referenceFormulas: MultiQtcResult;
  tdpNomogramStable: TdpResuscitationProtocol;
  tdpNomogramUnstable: TdpResuscitationProtocol;
  pathophysiologySummary: string;
}

/** Loop diuretic identifiers in formulary */
export const LOOP_DIURETIC_IDS = new Set([
  "furosemide",
  "torsemide",
  "bumetanide",
  "ethacrynic-acid",
]);

/**
 * Advanced Multi-Formula QTc Calculator with rate divergence trap detection.
 */
export function calculateMultiQtc({
  qtMs,
  hrBpm,
  sex,
  baselineQtcMs,
}: MultiQtcInput): MultiQtcResult | null {
  if (
    !Number.isFinite(qtMs) ||
    !Number.isFinite(hrBpm) ||
    qtMs < 200 ||
    qtMs > 850 ||
    hrBpm < 30 ||
    hrBpm > 230
  ) {
    return null;
  }

  const rrSec = 60 / hrBpm;

  // 1. Bazett: QTc = QT / sqrt(RR)
  const bazett = qtMs / Math.sqrt(rrSec);

  // 2. Fridericia: QTc = QT / cbrt(RR)
  const fridericia = qtMs / Math.cbrt(rrSec);

  // 3. Framingham (Sagie linear): QTc = QT + 154 * (1 - RR)
  const framingham = qtMs + 154 * (1 - rrSec);

  // 4. Hodges (linear): QTc = QT + 1.75 * (HR - 60)
  const hodges = qtMs + 1.75 * (hrBpm - 60);

  const bazettMs = Math.round(bazett);
  const fridericiaMs = Math.round(fridericia);
  const framinghamMs = Math.round(framingham);
  const hodgesMs = Math.round(hodges);

  // Preferred clinical formula
  // Fridericia is recommended by FDA, ACC, AHA, and ESC guidelines for clinical evaluations.
  let recommendedFormula: "Fridericia" | "Framingham" | "Bazett" = "Fridericia";
  let recommendedQtcMs = fridericiaMs;

  // Rate trap evaluation
  const divergenceMs = Math.abs(bazettMs - fridericiaMs);
  let rateTrap: RateTrapWarning;

  if (hrBpm > 85 && bazettMs - fridericiaMs >= 20) {
    rateTrap = {
      type: "tachycardia-inflation",
      divergenceMs: bazettMs - fridericiaMs,
      headline: `Bazett Tachycardia Inflation Trap (${bazettMs - fridericiaMs} ms gap)`,
      explanation:
        `At heart rate ${hrBpm} bpm, standard Bazett math overestimates QTc by ${bazettMs - fridericiaMs} ms compared to Fridericia (${bazettMs} ms vs ${fridericiaMs} ms). Hospital 12-lead automated reads frequently display Bazett, creating false "prolonged QT" alarms.`,
      recommendation:
        "Rely on Fridericia or Framingham for clinical decision-making. Avoid inappropriately discontinuing essential therapies based solely on automated Bazett numbers during tachycardia.",
    };
    recommendedFormula = "Fridericia";
    recommendedQtcMs = fridericiaMs;
  } else if (hrBpm < 60 && fridericiaMs - bazettMs >= 15) {
    rateTrap = {
      type: "bradycardia-underestimation",
      divergenceMs: fridericiaMs - bazettMs,
      headline: `Bazett Bradycardia Underestimation Trap (${fridericiaMs - bazettMs} ms gap)`,
      explanation:
        `At heart rate ${hrBpm} bpm, Bazett math undercorrects repolarization (${bazettMs} ms vs Fridericia ${fridericiaMs} ms). Bradycardia accentuates early afterdepolarizations (EADs) and pause-dependent torsades; underestimating QTc here is dangerous.`,
      recommendation:
        "Fridericia reveals true repolarization prolongation during bradycardia. Maintain high clinical suspicion for torsadogenic risk despite seemingly reassuring Bazett output.",
    };
    recommendedFormula = "Fridericia";
    recommendedQtcMs = fridericiaMs;
  } else {
    rateTrap = {
      type: "concordant",
      divergenceMs,
      headline: "Concordant Rate Correction",
      explanation:
        `At heart rate ${hrBpm} bpm, formulas are largely concordant (Bazett ${bazettMs} ms vs Fridericia ${fridericiaMs} ms). Both reflect physiological repolarization accurately.`,
      recommendation: "Fridericia remains the preferred reference per ACC/AHA/ESC guidelines.",
    };
  }

  // Sex-adjusted classification thresholds
  // Normal: Male <= 450, Female <= 460
  // Borderline: Male 451-470, Female 461-480
  // Prolonged: Male 471-499, Female 481-499
  // Critical: >= 500 ms (both)
  let riskBand: QtRiskBand = "normal";
  let riskLabel = "Normal Repolarization";

  const normalLimit = sex === "female" ? 460 : 450;
  const prolongedLimit = sex === "female" ? 480 : 470;

  if (recommendedQtcMs >= 500) {
    riskBand = "critical";
    riskLabel = `Critical QTc Prolongation (>= 500 ms) — High TdP Arrhythmia Hazard`;
  } else if (recommendedQtcMs > prolongedLimit) {
    riskBand = "prolonged";
    riskLabel = `Prolonged QTc (${recommendedQtcMs} ms > ${prolongedLimit} ms cutoff)`;
  } else if (recommendedQtcMs > normalLimit) {
    riskBand = "borderline";
    riskLabel = `Borderline QTc (${recommendedQtcMs} ms; normal <= ${normalLimit} ms)`;
  } else {
    riskBand = "normal";
    riskLabel = `Normal QTc (${recommendedQtcMs} ms <= ${normalLimit} ms)`;
  }

  // Baseline Delta Analysis
  let deltaBaselineMs: number | null = null;
  let deltaBaselineAlert: string | null = null;

  if (baselineQtcMs !== undefined && Number.isFinite(baselineQtcMs) && baselineQtcMs > 0) {
    deltaBaselineMs = Math.round(recommendedQtcMs - baselineQtcMs);
    if (deltaBaselineMs >= 60) {
      deltaBaselineAlert =
        `Critical Escalation: QTc increased by +${deltaBaselineMs} ms from baseline (threshold >=60 ms confers a 3- to 5-fold rise in TdP hazard regardless of absolute value). Immediate drug review warranted.`;
    } else if (deltaBaselineMs >= 30) {
      deltaBaselineAlert =
        `Moderate Prolongation: QTc increased by +${deltaBaselineMs} ms from baseline (threshold >=30 ms warrants enhanced telemetry and electrolyte monitoring).`;
    }
  }

  return {
    qtMs,
    hrBpm,
    sex,
    rrSec: Math.round(rrSec * 1000) / 1000,
    bazettMs,
    fridericiaMs,
    framinghamMs,
    hodgesMs,
    recommendedFormula,
    recommendedQtcMs,
    riskBand,
    riskLabel,
    isProlonged: recommendedQtcMs > normalLimit,
    isCritical: recommendedQtcMs >= 500,
    deltaBaselineMs,
    deltaBaselineAlert,
    rateTrap,
  };
}

/**
 * Validated Tisdale Inpatient QTc Risk Score (Circulation 2013).
 */
export function evaluateTisdaleScore(input: TisdaleInput): TisdaleResult {
  const factors: TisdaleFactor[] = [
    {
      id: "ageGeriatric",
      label: "Age >= 68 years",
      points: 1,
      present: Boolean(input.ageGeriatric),
      autoDetected: false,
      rationale: "Reduced physiological cardiac reserve, reduced renal drug clearance, and increased myocardial fibrosis.",
    },
    {
      id: "femaleSex",
      label: "Female sex",
      points: 1,
      present: Boolean(input.femaleSex),
      autoDetected: false,
      rationale: "Estrogen downregulates potassium repolarizing currents (IKr) and lengthens baseline APD; testosterone shortens APD.",
    },
    {
      id: "loopDiuretic",
      label: "Loop diuretic therapy",
      points: 1,
      present: Boolean(input.loopDiuretic),
      autoDetected: false,
      rationale: "Induced kaliuresis and calciuria drive hypokalemia and hypomagnesemia, predisposing to early afterdepolarizations.",
    },
    {
      id: "hypokalemia",
      label: "Serum potassium <= 3.5 mEq/L",
      points: 2,
      present: Boolean(input.hypokalemia),
      autoDetected: false,
      rationale: "Extracellular hypokalemia enhances IKr drug-binding and increases single-channel inactivation.",
    },
    {
      id: "admissionQtcProlonged",
      label: "Admission / baseline QTc >= 450 ms",
      points: 2,
      present: Boolean(input.admissionQtcProlonged),
      autoDetected: false,
      rationale: "Pre-existing baseline repolarization delay reduces safety margin before reaching the 500 ms arrhythmogenic threshold.",
    },
    {
      id: "acuteMi",
      label: "Acute myocardial infarction",
      points: 2,
      present: Boolean(input.acuteMi),
      autoDetected: false,
      rationale: "Ischemic border zones exhibit marked heterogeneity in repolarization and enhanced automaticity.",
    },
    {
      id: "twoOrMoreQtDrugs",
      label: ">= 2 QTc-prolonging drugs on regimen",
      points: 3,
      present: Boolean(input.twoOrMoreQtDrugs),
      autoDetected: false,
      rationale: "Additive or synergistic hERG potassium channel blockade exponentially widens temporal and spatial dispersion.",
    },
    {
      id: "sepsis",
      label: "Sepsis / severe systemic infection",
      points: 3,
      present: Boolean(input.sepsis),
      autoDetected: false,
      rationale: "Inflammatory cytokines (TNF-alpha, IL-6) directly inhibit hERG K+ channels and impair hepatic CYP clearance.",
    },
    {
      id: "heartFailure",
      label: "Heart failure (reduced EF / decompensated)",
      points: 3,
      present: Boolean(input.heartFailure),
      autoDetected: false,
      rationale: "Downregulated potassium current density, neurohormonal activation, and mechanical stretch prolong repolarization.",
    },
  ];

  const score = factors.reduce((sum, f) => sum + (f.present ? f.points : 0), 0);
  const maxScore = 21;

  let tier: TisdaleResult["tier"] = "low";
  let tierLabel = "Low Risk (Score <= 6)";
  let predictedRiskPercentage = "< 15% probability of QTc >= 500 ms";

  const clinicalRecommendations: string[] = [];

  if (score >= 11) {
    tier = "high";
    tierLabel = "High Risk (Score >= 11)";
    predictedRiskPercentage = "~73% probability of QTc >= 500 ms (high torsadogenic hazard)";
    clinicalRecommendations.push(
      "Mandatory continuous cardiac telemetry with automated ST/QT interval analysis enabled.",
      "Strict avoidance of additional QTc-prolonging medications; evaluate non-torsadogenic therapeutic alternatives.",
      "Aggressive electrolyte targets: maintain serum potassium 4.5–5.0 mEq/L and serum magnesium >= 2.0–2.5 mg/dL.",
      "Obtain daily 12-lead ECG and repeat 2–4 hours after initiating any new antimicrobial or psychiatric agent.",
      "Ensure bedside availability of IV Magnesium Sulfate and cardiac defibrillator.",
    );
  } else if (score >= 7) {
    tier = "moderate";
    tierLabel = "Moderate Risk (Score 7–10)";
    predictedRiskPercentage = "~37% probability of QTc >= 500 ms (moderate torsadogenic hazard)";
    clinicalRecommendations.push(
      "Cardiac telemetry monitoring recommended during hospital stay.",
      "Maintain serum potassium >= 4.0 mEq/L and serum magnesium >= 2.0 mg/dL.",
      "Check 12-lead ECG at baseline and 24–48 hours after dosage increases or new additions.",
      "Screen for drug-drug interactions (e.g. CYP3A4 / CYP2D6 / P-gp inhibitors that elevate victim QT drug levels).",
    );
  } else {
    tier = "low";
    tierLabel = "Low Risk (Score <= 6)";
    predictedRiskPercentage = "< 15% probability of QTc >= 500 ms (low torsadogenic hazard)";
    clinicalRecommendations.push(
      "Standard clinical monitoring without dedicated QT telemetry protocol unless clinical status deteriorates.",
      "Maintain normal serum electrolytes (K+ >= 4.0 mEq/L, Mg2+ >= 2.0 mg/dL).",
      "Re-evaluate Tisdale score if loop diuretics, antiarrhythmics, or multiple psychotropic agents are added.",
    );
  }

  const telemetryRequirement =
    tier === "high"
      ? "Mandatory continuous telemetry with QTc alarms active"
      : tier === "moderate"
        ? "Recommended telemetry; daily 12-lead ECG"
        : "Standard inpatient monitoring";

  const electrolyteTargets = {
    potassiumMeqL: tier === "high" ? "4.5–5.0 mEq/L" : ">= 4.0 mEq/L",
    magnesiumMgDl: tier === "high" ? ">= 2.5 mg/dL" : ">= 2.0 mg/dL",
  };

  const summary = `Tisdale QTc Score: ${score}/${maxScore} (${tierLabel}). Predicted risk of critical QTc >= 500 ms: ${predictedRiskPercentage}.`;

  return {
    score,
    maxScore,
    tier,
    tierLabel,
    predictedRiskPercentage,
    factors,
    clinicalRecommendations,
    telemetryRequirement,
    electrolyteTargets,
    summary,
  };
}

/**
 * Derive auto-detected Tisdale factors from desk drugs and host context.
 */
export function deriveTisdaleDefaults(ids: string[], host: HostContext): TisdaleInput {
  const ageGeriatric = host.age === "geriatric";
  // Sex is not explicitly in HostContext, default female to false unless specified
  const femaleSex = false;

  // Detect loop diuretics on desk
  const loopDiuretic = ids.some((id) => {
    if (LOOP_DIURETIC_IDS.has(id)) return true;
    const d = DRUG_BY_ID[id];
    return d?.cls.toLowerCase().includes("loop") || d?.pd.includes("loop-thiazide");
  });

  // Detect count of QT-prolonging drugs on desk
  const qtDrugsCount = ids.filter((id) => {
    const d = DRUG_BY_ID[id];
    return d && (d.pd.includes("qt-known") || d.pd.includes("qt-possible"));
  }).length;
  const twoOrMoreQtDrugs = qtDrugsCount >= 2;

  return {
    ageGeriatric,
    femaleSex,
    loopDiuretic,
    twoOrMoreQtDrugs,
    hypokalemia: false,
    admissionQtcProlonged: false,
    acuteMi: false,
    sepsis: false,
    heartFailure: false,
  };
}

/**
 * Emergency Torsades de Pointes (TdP) Resuscitation Nomogram.
 */
export function getTdpResuscitationNomogram(status: "stable-recurrent-bursts" | "unstable-pulseless"): TdpResuscitationProtocol {
  if (status === "unstable-pulseless") {
    return {
      clinicalStatus: "unstable-pulseless",
      headline: "EMERGENCY: Hemodynamically Unstable / Pulseless Polymorphic VT (Torsades de Pointes)",
      urgency: "emergent",
      steps: [
        {
          stepNumber: 1,
          title: "Immediate Unsynchronized Defibrillation (High Energy)",
          agentOrIntervention: "Biphasic Defibrillator Shock (200 J unsynchronized)",
          dosingOrParameters: "200 Joules biphasic (or maximum manufacturer output)",
          timing: "STAT — do not delay",
          mechanism: "Simultaneously depolarizes the entire myocardium to terminate undulating polymorphic re-entrant wavelets.",
          clinicalPearls: [
            "CRITICAL: Do NOT attempt synchronized cardioversion. In polymorphic VT, the constantly undulating QRS vector prevents reliable R-wave tracking by the defibrillator; synchronization will fail to fire or deliver a shock on the vulnerable T-wave peak, degenerating into refractory VF.",
            "If pulseless, immediately initiate high-quality chest compressions and follow ACLS Cardiac Arrest Protocol.",
          ],
          warning: "Never delay defibrillation for medication administration in a hemodynamically unstable or pulseless patient.",
        },
        {
          stepNumber: 2,
          title: "Intravenous Magnesium Sulfate Bolus",
          agentOrIntervention: "Magnesium Sulfate 2 g IV Push",
          dosingOrParameters: "2 grams IV diluted in 10 mL D5W or NS administered over 1–2 minutes",
          timing: "Immediately following initial defibrillation attempt / during CPR",
          mechanism: "Suppresses early afterdepolarizations (EADs) by blocking inward L-type calcium currents (ICa-L).",
          clinicalPearls: [
            "Administer regardless of baseline serum magnesium level (even if normal!).",
            "Can repeat a second 2 g bolus in 5–15 minutes if polymorphic VT recurs.",
          ],
        },
        {
          stepNumber: 3,
          title: "Aggressive Intracellular Potassium Repletion",
          agentOrIntervention: "Potassium Chloride IV Infusion",
          dosingOrParameters: "Infuse via central line (target rate 10–20 mEq/hr with continuous ECG)",
          timing: "Target serum K+ 4.5–5.0 mEq/L STAT",
          mechanism: "Increases outward repolarizing IKr current conductance and reduces hERG channel drug affinity.",
          clinicalPearls: [
            "Low-normal potassium (e.g. 3.6 mEq/L) is proarrhythmic in TdP. Drive potassium to high-normal (4.5–5.0 mEq/L).",
          ],
        },
        {
          stepNumber: 4,
          title: "Heart Rate Overdrive & Elimination of Pauses",
          agentOrIntervention: "Transvenous Temporary Cardiac Overdrive Pacing",
          dosingOrParameters: "Pacing rate 90–110 bpm",
          timing: "Once pulse / rhythm is stabilized",
          mechanism: "Shortens ventricular action potential duration (APD) and abolishes the pause-dependent short-long-short cycle that triggers EADs.",
          clinicalPearls: [
            "Transvenous pacing is preferred over chemical inotropes in unstable patients.",
          ],
        },
      ],
      electrolyteDirectives: {
        potassiumTarget: "Target serum K+ 4.5–5.0 mEq/L",
        magnesiumTarget: "Target serum Mg2+ >= 2.0–2.5 mg/dL",
        laboratoryAlert: "Never delay emergency defibrillation or IV magnesium bolus while awaiting lab results.",
      },
      antiarrhythmicAvoidanceList: [
        "Amiodarone (Class III - prolongs QT further)",
        "Procainamide (Class Ia - potent IKr blocker)",
        "Sotalol (Class III - potent IKr blocker)",
        "Ibutilide / Dofetilide (Class III - pure IKr blockers)",
        "Haloperidol / Droperidol (potent hERG blockers)",
      ],
    };
  }

  // Stable with recurrent non-sustained bursts
  return {
    clinicalStatus: "stable-recurrent-bursts",
    headline: "ACUTE PROTOCOL: Hemodynamically Stable Patient with Recurrent TdP Bursts / Critical QTc >= 500 ms",
    urgency: "critical",
    steps: [
      {
        stepNumber: 1,
        title: "First-Line Membrane Stabilization: IV Magnesium Sulfate",
        agentOrIntervention: "Magnesium Sulfate 2 g IV Infusion",
        dosingOrParameters: "2 grams IV in 50–100 mL D5W over 15 minutes; may push over 1–2 minutes if active bursts occur",
        timing: "Immediate first-line intervention",
        mechanism: "Suppresses Phase 2/3 Early Afterdepolarizations (EADs) by antagonizing L-type calcium channels (ICa-L) without shortening the baseline QT interval.",
        clinicalPearls: [
          "THE CHIEF CLINICAL PEARL: Magnesium is effective EVEN IF baseline serum magnesium is completely normal (e.g. 2.2 mg/dL). Do not wait for lab confirmation.",
          "Repeat with a second 2 g bolus in 5–15 minutes if non-sustained polymorphic VT bursts persist.",
          "Follow with continuous IV infusion of Magnesium Sulfate 0.5–1.0 g/hour (or 2–4 mg/min) for 24–48 hours until QTc stabilizes < 500 ms.",
        ],
      },
      {
        stepNumber: 2,
        title: "Overdrive Acceleration & Pause Elimination",
        agentOrIntervention: "Temporary Transvenous Pacing or Isoproterenol Infusion",
        dosingOrParameters: "Target heart rate: 90–110 bpm",
        timing: "Initiate if bradycardic (HR < 60) or experiencing pause-dependent bursts",
        mechanism: "Accelerating heart rate shortens the ventricular repolarization period and extinguishes the short-long-short triggering pause.",
        clinicalPearls: [
          "Temporary transvenous overdrive pacing is the gold standard.",
          "Pharmacological alternative: Isoproterenol (Isuprel) continuous infusion at 2–10 mcg/min titrated to maintain ventricular rate 90–110 bpm.",
          "CONTRAINDICATION WARNING: Isoproterenol is strictly contraindicated in Congenital Long QT Syndrome (especially LQT1 and LQT2, where adrenergic surge triggers lethal arrhythmias) and in acute coronary ischemia / acute MI.",
        ],
        warning: "Do not use Isoproterenol in suspected congenital LQTS or acute myocardial infarction.",
      },
      {
        stepNumber: 3,
        title: "Aggressive Potassium Optimization",
        agentOrIntervention: "Potassium Chloride IV / Oral Repletion",
        dosingOrParameters: "Replenish to target serum K+ 4.5–5.0 mEq/L",
        timing: "Commence simultaneously with magnesium",
        mechanism: "Higher extracellular K+ concentration increases inward rectifier and delayed rectifier (IKr) conductance, reducing drug-channel affinity and promoting repolarization reserve.",
        clinicalPearls: [
          "Serum K+ of 3.8–4.0 mEq/L is inadequate for a torsadogenic myocardium. Drive to high-normal (4.5–5.0 mEq/L).",
        ],
      },
      {
        stepNumber: 4,
        title: "Immediate Culprit Drug Withdrawal & CYP De-stacking",
        agentOrIntervention: "Discontinue all IKr / hERG channel blocking agents and pharmacokinetic perpetrators",
        dosingOrParameters: "Hold all known and possible QT drugs immediately",
        timing: "Immediate",
        mechanism: "Halts further drug accumulation and allows systemic clearance of the offending agent.",
        clinicalPearls: [
          "Check for pharmacokinetic perpetrators (CYP3A4, CYP2D6, P-gp inhibitors) that amplified the culprit drug concentration.",
          "Review antiemetics (ondansetron), antimicrobials (fluoroquinolones, macrolides, azoles), and psychotropics (antipsychotics, SSRIs/TCAs).",
        ],
      },
      {
        stepNumber: 5,
        title: "Continuous Telemetry & Defibrillator Readiness",
        agentOrIntervention: "Cardiac Telemetry + Defibrillator Pads Applied",
        dosingOrParameters: "Continuous multi-lead monitoring with QTc tracking; pads placed anteroposteriorly",
        timing: "Continuous until QTc < 480 ms for >= 24 hours",
        mechanism: "Ensures immediate defibrillation capability should stable bursts degenerate into sustained polymorphic VT or VF.",
        clinicalPearls: [
          "Keep defibrillator in the room with pads pre-attached.",
        ],
      },
    ],
    electrolyteDirectives: {
      potassiumTarget: "Target serum K+ 4.5–5.0 mEq/L (high-normal)",
      magnesiumTarget: "Target serum Mg2+ >= 2.0–2.5 mg/dL (high-normal)",
      laboratoryAlert: "Administer Magnesium Sulfate 2 g IV immediately without waiting for serum magnesium lab values.",
    },
    antiarrhythmicAvoidanceList: [
      "Amiodarone (Class III - exacerbates QT prolongation)",
      "Procainamide, Quinidine, Disopyramide (Class Ia - strong IKr blockers)",
      "Sotalol, Dofetilide, Ibutilide (Class III - pure IKr blockers)",
      "Haloperidol, Droperidol (potent hERG blockers)",
      "Avoid all Class Ia and Class III antiarrhythmics in drug-induced TdP!",
    ],
  };
}

/**
 * Full Desk QTc & Resuscitation Evaluation.
 */
export function evaluateQtDesk(ids: string[], host: HostContext): QtDeskEvaluation {
  const qtRep = qtReport(ids, host);
  const activeQtRows = qtRep ? qtRep.rows : [];

  const loopDiureticsOnDesk = ids.filter((id) => {
    if (LOOP_DIURETIC_IDS.has(id)) return true;
    const d = DRUG_BY_ID[id];
    return d?.cls.toLowerCase().includes("loop") || d?.pd.includes("loop-thiazide");
  });

  const tisdaleInput = deriveTisdaleDefaults(ids, host);
  const tisdaleDefault = evaluateTisdaleScore(tisdaleInput);

  // Baseline reference QTc calculation for display (e.g. 420 ms at 75 bpm, male)
  const referenceFormulas = calculateMultiQtc({
    qtMs: 420,
    hrBpm: 75,
    sex: "male",
  })!;

  const tdpNomogramStable = getTdpResuscitationNomogram("stable-recurrent-bursts");
  const tdpNomogramUnstable = getTdpResuscitationNomogram("unstable-pulseless");

  const pathophysiologySummary =
    "Drug-induced Torsades de Pointes (TdP) is initiated by pharmacological inhibition of the rapid delayed rectifier potassium current (IKr), encoded by the hERG / KCNH2 gene. Impaired outward potassium egress delays Phase 3 repolarization, extending the action potential duration (APD). During prolonged repolarization, reactivated L-type calcium currents (ICa-L) produce Early Afterdepolarizations (EADs). Spatial and transmural dispersion of repolarization allows EADs to trigger pause-dependent polymorphic ventricular tachycardia ('twisting of the points'). Bradycardia accentuates IKr blockade via reverse use-dependence, while hypokalemia and hypomagnesemia lower the threshold for triggered activity.";

  return {
    hasQtDrugs: activeQtRows.length > 0,
    qtReport: qtRep,
    activeQtRows,
    loopDiureticsOnDesk,
    tisdaleDefault,
    referenceFormulas,
    tdpNomogramStable,
    tdpNomogramUnstable,
    pathophysiologySummary,
  };
}

