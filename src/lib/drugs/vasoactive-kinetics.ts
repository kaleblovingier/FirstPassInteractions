/**
 * Vasoactive Hemodynamics, Inotropes, Vasopressors & Shock Stratification Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Architecture:
 * - Transparent physiological, biochemical, and hemodynamic receptor kinetics models
 * - Canonical peer-reviewed citations: AHA/ACC Cardiogenic Shock Scientific Statement,
 *   SCAI Clinical Expert Consensus on Shock Classification (Baran et al., 2019; Naidu et al., 2022),
 *   Surviving Sepsis Campaign Guidelines (Evans et al., 2021),
 *   SOAP II Trial (De Backer et al., NEJM 2010),
 *   ATHOS-3 Trial (Khanna et al., NEJM 2017),
 *   VASST Trial (Russell et al., NEJM 2008),
 *   Extravasation Antidote Protocols (Reynolds et al., 2014).
 * - Strictly non-prescriptive: provides physiological reference values, receptor profiles,
 *   pharmacodynamic warnings, and risk categorizations without automated order directives.
 */

import type { HostContext } from "./types";

export const NOT_CLEARED =
  "Educational & physiological reference only. Not an FDA-cleared medical device, closed-loop infusion directive, or hemodynamic mandate. Licensed clinician verification required under FD&C Act § 520(o)(1)(E).";

export const PI_FOOTER =
  "Calculations reflect peer-reviewed literature (SCAI, AHA/ACC, Surviving Sepsis Campaign). Real-time clinical judgment, arterial line telemetry, and hemodynamic response govern bedside titration.";

export interface ReceptorProfile {
  alpha1: number; // 0 (none) to 4 (maximum)
  alpha2: number;
  beta1: number;
  beta2: number;
  v1a: number;
  da1: number;
  at1: number;
  pde3Inhibition: boolean;
  primaryMechanism: string;
  hemodynamicEffect: {
    map: "increase" | "decrease" | "variable";
    svr: "increase" | "decrease" | "variable";
    co: "increase" | "decrease" | "neutral" | "variable";
    hr: "increase" | "decrease" | "neutral" | "variable";
    mvo2: "increase" | "decrease" | "neutral";
  };
}

export interface VasoactiveAgentDef {
  id: string;
  name: string;
  class: "vasopressor" | "inotrope" | "inodilator" | "vasodilator";
  receptorProfile: ReceptorProfile;
  standardDosingUnit: string;
  referenceDosingRange: string;
  onsetMinutes: number;
  halfLifeMinutes: number;
  metabolismAndClearance: string;
  renalClearanceFraction: number; // 0.0 to 1.0
  arrhythmiaRisk: "low" | "moderate" | "high";
  clinicalIndications: string[];
  keySafetyAlerts: string[];
}

export const VASOACTIVE_AGENTS: Record<string, VasoactiveAgentDef> = {
  norepinephrine: {
    id: "norepinephrine",
    name: "Norepinephrine (Levophed)",
    class: "vasopressor",
    receptorProfile: {
      alpha1: 4,
      alpha2: 2,
      beta1: 2,
      beta2: 1,
      v1a: 0,
      da1: 0,
      at1: 0,
      pde3Inhibition: false,
      primaryMechanism: "Potent alpha-1 vasoconstriction with modest beta-1 inotropy; minimal beta-2 effect.",
      hemodynamicEffect: {
        map: "increase",
        svr: "increase",
        co: "neutral",
        hr: "variable",
        mvo2: "increase",
      },
    },
    standardDosingUnit: "mcg/min (or mcg/kg/min)",
    referenceDosingRange: "2 to 30+ mcg/min (0.02 to 0.5+ mcg/kg/min)",
    onsetMinutes: 1,
    halfLifeMinutes: 2,
    metabolismAndClearance: "Hepatic COMT and MAO biotransformation; tissue uptake; minimal renal unchanged.",
    renalClearanceFraction: 0.05,
    arrhythmiaRisk: "moderate",
    clinicalIndications: [
      "First-line vasopressor for septic shock (Surviving Sepsis Campaign)",
      "First-line vasopressor for cardiogenic shock with severe hypotension",
      "Undifferentiated vasodilatory shock",
    ],
    keySafetyAlerts: [
      "Extravasation causes profound local vasoconstriction and ischemic tissue necrosis; phentolamine is indicated immediately.",
      "Excessive vasoconstriction may compromise splanchnic, renal, and peripheral microcirculatory perfusion.",
    ],
  },
  epinephrine: {
    id: "epinephrine",
    name: "Epinephrine (Adrenalin)",
    class: "vasopressor",
    receptorProfile: {
      alpha1: 4,
      alpha2: 2,
      beta1: 4,
      beta2: 3,
      v1a: 0,
      da1: 0,
      at1: 0,
      pde3Inhibition: false,
      primaryMechanism: "Potent non-selective alpha and beta agonist. Low doses exhibit potent beta-1 and beta-2 stimulation; high doses recruit massive alpha-1 vasoconstriction.",
      hemodynamicEffect: {
        map: "increase",
        svr: "variable",
        co: "increase",
        hr: "increase",
        mvo2: "increase",
      },
    },
    standardDosingUnit: "mcg/min (or mcg/kg/min)",
    referenceDosingRange: "1 to 20+ mcg/min (0.01 to 0.5+ mcg/kg/min)",
    onsetMinutes: 1,
    halfLifeMinutes: 2,
    metabolismAndClearance: "Rapid enzymatic degradation by COMT and MAO in liver and adrenergic nerve endings.",
    renalClearanceFraction: 0.05,
    arrhythmiaRisk: "high",
    clinicalIndications: [
      "First-line for anaphylactic shock (IM 0.3-0.5 mg)",
      "Cardiopulmonary resuscitation (ACLS, 1 mg IV q3-5min)",
      "Second-line / refractory distributive and cardiogenic shock",
    ],
    keySafetyAlerts: [
      "Stimulates skeletal muscle beta-2 receptors, activating Na+/K+ ATPase and aerobic glycolysis -> generates benign Type B hyperlactatemia.",
      "High incidence of tachyarrhythmias and marked escalation of myocardial oxygen demand (MVO2).",
    ],
  },
  vasopressin: {
    id: "vasopressin",
    name: "Vasopressin (Arg-Vasopressin / AVP)",
    class: "vasopressor",
    receptorProfile: {
      alpha1: 0,
      alpha2: 0,
      beta1: 0,
      beta2: 0,
      v1a: 4,
      da1: 0,
      at1: 0,
      pde3Inhibition: false,
      primaryMechanism: "Non-adrenergic Gq-mediated vascular smooth muscle V1a receptor stimulation, mobilizing intracellular Ca2+.",
      hemodynamicEffect: {
        map: "increase",
        svr: "increase",
        co: "neutral",
        hr: "neutral",
        mvo2: "neutral",
      },
    },
    standardDosingUnit: "units/min",
    referenceDosingRange: "0.03 units/min fixed (do NOT titrate for septic shock)",
    onsetMinutes: 2,
    halfLifeMinutes: 15,
    metabolismAndClearance: "Hepatic and renal aminopeptidases and vasopressinases.",
    renalClearanceFraction: 0.1,
    arrhythmiaRisk: "low",
    clinicalIndications: [
      "Catecholamine-sparing adjunct in septic shock with norepinephrine requirements",
      "Vasoplegic shock post-cardiopulmonary bypass",
      "Post-cardiac arrest vasodilatory collapse",
    ],
    keySafetyAlerts: [
      "VASST trial protocol: fixed infusion at 0.03 units/min. Doses > 0.04 units/min cause severe mesenteric, myocardial, and digital ischemia.",
      "Lacks adrenergic beta-1 chronotropy; ideal in patients with severe refractory tachycardia.",
    ],
  },
  dopamine: {
    id: "dopamine",
    name: "Dopamine",
    class: "vasopressor",
    receptorProfile: {
      alpha1: 3,
      alpha2: 1,
      beta1: 3,
      beta2: 1,
      v1a: 0,
      da1: 4,
      at1: 0,
      pde3Inhibition: false,
      primaryMechanism: "Dose-dependent selectivity: <3 mcg/kg/min = DA1; 3-10 mcg/kg/min = beta-1; >10 mcg/kg/min = alpha-1.",
      hemodynamicEffect: {
        map: "increase",
        svr: "variable",
        co: "increase",
        hr: "increase",
        mvo2: "increase",
      },
    },
    standardDosingUnit: "mcg/kg/min",
    referenceDosingRange: "2 to 20 mcg/kg/min",
    onsetMinutes: 2,
    halfLifeMinutes: 2,
    metabolismAndClearance: "Rapid metabolism via plasma and hepatic MAO and COMT to norepinephrine.",
    renalClearanceFraction: 0.1,
    arrhythmiaRisk: "high",
    clinicalIndications: [
      "Symptomatic bradycardia refractory to atropine (ACLS second-line)",
      "Cardiogenic shock with low risk of tachyarrhythmias (historically; largely superseded by norepinephrine)",
    ],
    keySafetyAlerts: [
      "SOAP II landmark trial: Dopamine vs Norepinephrine in shock demonstrated double the arrhythmogenic events (20.7% vs 12.4%) and higher 28-day mortality in cardiogenic shock.",
      "Low-dose 'renal dopamine' (<3 mcg/kg/min) is obsolete and discredited; does not prevent AKI.",
    ],
  },
  phenylephrine: {
    id: "phenylephrine",
    name: "Phenylephrine (Neo-Synephrine)",
    class: "vasopressor",
    receptorProfile: {
      alpha1: 4,
      alpha2: 0,
      beta1: 0,
      beta2: 0,
      v1a: 0,
      da1: 0,
      at1: 0,
      pde3Inhibition: false,
      primaryMechanism: "Pure, direct-acting alpha-1 adrenergic agonist with zero beta-1 or beta-2 activity.",
      hemodynamicEffect: {
        map: "increase",
        svr: "increase",
        co: "decrease",
        hr: "decrease",
        mvo2: "neutral",
      },
    },
    standardDosingUnit: "mcg/min (or mcg/kg/min)",
    referenceDosingRange: "20 to 200+ mcg/min (0.25 to 2.0 mcg/kg/min)",
    onsetMinutes: 1,
    halfLifeMinutes: 3,
    metabolismAndClearance: "Hepatic MAO metabolism and sulfate conjugation.",
    renalClearanceFraction: 0.15,
    arrhythmiaRisk: "low",
    clinicalIndications: [
      "Hyperdynamic septic shock with tachyarrhythmias precluding beta-1 agents",
      "Dynamic left ventricular outflow tract (LVOT) obstruction in hypertrophic cardiomyopathy (increases afterload and reduces obstruction gradient)",
      "Anesthesia-induced acute arterial hypotension",
    ],
    keySafetyAlerts: [
      "Causes baroreceptor-mediated reflex vagal bradycardia and increases cardiac afterload without inotropic support, dropping cardiac output.",
      "Avoid in low cardiac output cardiogenic shock.",
    ],
  },
  dobutamine: {
    id: "dobutamine",
    name: "Dobutamine (Dobutrex)",
    class: "inotrope",
    receptorProfile: {
      alpha1: 1,
      alpha2: 0,
      beta1: 4,
      beta2: 2,
      v1a: 0,
      da1: 0,
      at1: 0,
      pde3Inhibition: false,
      primaryMechanism: "Synthetic catecholamine; potent beta-1 inotrope with mild beta-2 arteriolar vasodilation. Minimal alpha-1.",
      hemodynamicEffect: {
        map: "variable",
        svr: "decrease",
        co: "increase",
        hr: "increase",
        mvo2: "increase",
      },
    },
    standardDosingUnit: "mcg/kg/min",
    referenceDosingRange: "2.5 to 20 mcg/kg/min",
    onsetMinutes: 2,
    halfLifeMinutes: 2,
    metabolismAndClearance: "Hepatic methylation by COMT to 3-O-methyldobutamine and glucuronide conjugates.",
    renalClearanceFraction: 0.1,
    arrhythmiaRisk: "high",
    clinicalIndications: [
      "First-line inotrope for low cardiac output states (cardiogenic shock, decompensated biventricular heart failure)",
      "Sepsis-induced myocardial dysfunction (added to norepinephrine per Surviving Sepsis guidelines)",
    ],
    keySafetyAlerts: [
      "Independent of renal clearance (short 2-min t1/2, hepatic COMT) -> safe in severe renal failure / dialysis where milrinone accumulates.",
      "Increases myocardial oxygen consumption (MVO2) and may provoke ventricular ectopy or tachyarrhythmias.",
      "Mild beta-2 vasodilation can cause hypotension in hypovolemic patients; ensure adequate intravascular volume or concurrent vasopressor.",
    ],
  },
  milrinone: {
    id: "milrinone",
    name: "Milrinone (Primacor)",
    class: "inodilator",
    receptorProfile: {
      alpha1: 0,
      alpha2: 0,
      beta1: 0,
      beta2: 0,
      v1a: 0,
      da1: 0,
      at1: 0,
      pde3Inhibition: true,
      primaryMechanism: "Phosphodiesterase-3 (PDE-3) inhibitor preventing cAMP hydrolysis. Elevates cAMP in myocardium (inotropy) and vascular smooth muscle (systemic and pulmonary vasodilation).",
      hemodynamicEffect: {
        map: "decrease",
        svr: "decrease",
        co: "increase",
        hr: "variable",
        mvo2: "neutral",
      },
    },
    standardDosingUnit: "mcg/kg/min",
    referenceDosingRange: "0.25 to 0.75 mcg/kg/min (optional load 50 mcg/kg over 10 min often omitted to prevent shock)",
    onsetMinutes: 5,
    halfLifeMinutes: 144, // 2.4 hours in normal renal function
    metabolismAndClearance: "Predominantly cleared by glomerular filtration and active renal tubular secretion (~80-85% excreted unchanged in urine).",
    renalClearanceFraction: 0.85,
    arrhythmiaRisk: "high",
    clinicalIndications: [
      "Biventricular heart failure with pulmonary arterial hypertension (reduces right ventricular afterload)",
      "Cardiogenic shock refractory to beta-adrenergic agonists or in patients with down-regulated beta receptors on chronic beta-blockers",
      "Bridge to heart transplant or durable left ventricular assist device (LVAD)",
    ],
    keySafetyAlerts: [
      "CRITICAL RENAL CLEARANCE TRAP: 85% renally cleared. In renal failure (CrCl < 30 mL/min), elimination half-life surges from 2.4 hours to > 24 to 40 hours! Produces protracted, refractory hypotension and ventricular tachyarrhythmias.",
      "Avoid intravenous loading bolus in hypotensive or hemodynamically fragile patients.",
    ],
  },
  "angiotensin-ii": {
    id: "angiotensin-ii",
    name: "Angiotensin II (Giapreza)",
    class: "vasopressor",
    receptorProfile: {
      alpha1: 0,
      alpha2: 0,
      beta1: 0,
      beta2: 0,
      v1a: 0,
      da1: 0,
      at1: 4,
      pde3Inhibition: false,
      primaryMechanism: "Binds Gq-protein coupled AT1 receptors, activating PLC and IP3 to trigger intracellular Ca2+ release and rapid systemic vasoconstriction, and stimulates aldosterone release.",
      hemodynamicEffect: {
        map: "increase",
        svr: "increase",
        co: "variable",
        hr: "neutral",
        mvo2: "neutral",
      },
    },
    standardDosingUnit: "ng/kg/min",
    referenceDosingRange: "10 to 40 ng/kg/min (initial 20 ng/kg/min; max 80 ng/kg/min)",
    onsetMinutes: 1,
    halfLifeMinutes: 1,
    metabolismAndClearance: "Rapid enzymatic cleavage by circulating peptidases and aminopeptidases in blood and tissues.",
    renalClearanceFraction: 0.05,
    arrhythmiaRisk: "low",
    clinicalIndications: [
      "Catecholamine-refractory distributive / septic shock (ATHOS-3 trial)",
      "Vasoplegic shock requiring multi-vasopressor salvage therapy",
    ],
    keySafetyAlerts: [
      "Marked prothrombotic risk: ATHOS-3 trial reported elevated incidence of arterial and venous thromboembolism (12.9% vs 5.1%). Mandatory concurrent DVT chemoprophylaxis unless contraindicated.",
      "Lacks adrenergic beta chronotropy or inotropy.",
    ],
  },
};

/**
 * Society for Cardiovascular Angiography and Interventions (SCAI) Shock Classification Stages
 * Baran et al., Catheter Cardiovasc Interv 2019; Naidu et al., J Am Coll Cardiol 2022
 */
export type ScaiStage = "A" | "B" | "C" | "D" | "E";

export interface ScaiEvaluation {
  stage: ScaiStage;
  label: string;
  description: string;
  criteriaMet: string[];
  recommendedMonitoring: string[];
  mortalityRiskTier: "low (<5%)" | "moderate (5-15%)" | "high (15-30%)" | "severe (30-50%)" | "catastrophic (>50%)";
  citations: string[];
}

export interface ShockParameters {
  sbp?: number; // mmHg
  map?: number; // mmHg
  heartRate?: number; // bpm
  lactate?: number; // mmol/L
  scvO2?: number; // % (central venous oxygen sat)
  urineOutputMlPerHour?: number; // mL/h
  vasoactiveAgentCount?: number;
  onMechanicalSupport?: boolean; // IABP, Impella, VA-ECMO
  cardiacArrestOrCPR?: boolean;
  refractoryAcidosis?: boolean; // pH < 7.2 or severe base deficit
}

export function evaluateScaiShockStage(params: ShockParameters): ScaiEvaluation {
  const criteria: string[] = [];

  // Stage E: Extremis
  if (params.cardiacArrestOrCPR || (params.refractoryAcidosis && (params.lactate ?? 0) >= 8.0)) {
    if (params.cardiacArrestOrCPR) criteria.push("Ongoing CPR or post-cardiac arrest with persistent shock state");
    if (params.refractoryAcidosis) criteria.push("Severe refractory metabolic acidosis (pH < 7.2 with lactate >= 8.0 mmol/L)");
    if (params.onMechanicalSupport) criteria.push("VA-ECMO or emergency biventricular mechanical life support");

    return {
      stage: "E",
      label: "Stage E: Extremis",
      description: "Circulatory collapse, ongoing resuscitation, refractory uncorrectable acidemia, or cardiac arrest.",
      criteriaMet: criteria,
      recommendedMonitoring: [
        "Continuous invasive arterial line telemetry",
        "Point-of-care arterial blood gas / serial lactate every 1-2 hours",
        "Consider immediate VA-ECMO / mechanical circulatory support cannulation",
        "Continuous telemetry and defibrillator pads in situ",
      ],
      mortalityRiskTier: "catastrophic (>50%)",
      citations: [
        "Naidu SS, et al. SCAI SHOCK Stage Classification Expert Consensus Update. J Am Coll Cardiol. 2022;79(9):933-946.",
      ],
    };
  }

  // Stage D: Deteriorating / Escalating
  if (
    (params.vasoactiveAgentCount ?? 0) >= 2 ||
    (params.onMechanicalSupport && (params.lactate ?? 0) > 2.0) ||
    ((params.lactate ?? 0) >= 4.0 && (params.sbp ?? 120) < 90)
  ) {
    if ((params.vasoactiveAgentCount ?? 0) >= 2) {
      criteria.push(`Escalating requirements: >= 2 vasoactive infusions (${params.vasoactiveAgentCount} active)`);
    }
    if ((params.lactate ?? 0) >= 4.0) {
      criteria.push(`Severe tissue hypoperfusion with serum lactate ${params.lactate} mmol/L (>= 4.0)`);
    }
    if (params.onMechanicalSupport) {
      criteria.push("Temporary mechanical circulatory support active with persistent hypoperfusion");
    }

    return {
      stage: "D",
      label: "Stage D: Deteriorating",
      description: "Failure to respond to initial inotrope or vasopressor; escalating doses, adding second agent, or worsening hypoperfusion.",
      criteriaMet: criteria,
      recommendedMonitoring: [
        "Urgent advanced heart failure / interventional cardiology consultation",
        "Pulmonary artery catheter (PAC / Swan-Ganz) placement to assess filling pressures and cardiac index",
        "Continuous invasive arterial blood pressure monitoring",
        "Echocardiogram to assess right vs left ventricular failure and mechanical complications",
      ],
      mortalityRiskTier: "severe (30-50%)",
      citations: [
        "Baran DA, et al. SCAI clinical expert consensus on classification of cardiogenic shock. Catheter Cardiovasc Interv. 2019;94(1):29-37.",
      ],
    };
  }

  // Stage C: Classic Cardiogenic Shock
  if (
    ((params.sbp ?? 120) < 90 || (params.map ?? 80) < 65 || (params.vasoactiveAgentCount ?? 0) >= 1) &&
    (((params.lactate ?? 0) > 2.0) || (params.urineOutputMlPerHour ?? 50) < 30 || (params.scvO2 ?? 75) < 65)
  ) {
    if ((params.sbp ?? 120) < 90) criteria.push(`Hypotension: SBP ${params.sbp} mmHg (< 90)`);
    if ((params.map ?? 80) < 65) criteria.push(`Inadequate perfusion pressure: MAP ${params.map} mmHg (< 65)`);
    if ((params.vasoactiveAgentCount ?? 0) >= 1) criteria.push("Initiation of inotrope or vasopressor infusion");
    if ((params.lactate ?? 0) > 2.0) criteria.push(`Hypoperfusion marker: Lactate ${params.lactate} mmol/L (> 2.0)`);
    if ((params.urineOutputMlPerHour ?? 50) < 30) criteria.push(`Oliguria: Urine output ${params.urineOutputMlPerHour} mL/h (< 30)`);
    if ((params.scvO2 ?? 75) < 65) criteria.push(`Impaired oxygen delivery: ScvO2 ${params.scvO2}% (< 65%)`);

    return {
      stage: "C",
      label: "Stage C: Classic",
      description: "Hypoperfusion manifested by cold extremities, oliguria, altered mentation, or elevated lactate, requiring inotrope, vasopressor, or initial mechanical support.",
      criteriaMet: criteria,
      recommendedMonitoring: [
        "Invasive arterial line placement for beat-to-beat hemodynamic guidance",
        "Urgent cardiac catheterization lab evaluation if ischemic etiology",
        "Serial venous lactate every 2 to 4 hours until clearance documented",
        "Strict Foley catheter hourly urine output tracking",
      ],
      mortalityRiskTier: "high (15-30%)",
      citations: [
        "van Diepen S, et al. Contemporary Management of Cardiogenic Shock: AHA Scientific Statement. Circulation. 2017;136(16):e232-e268.",
      ],
    };
  }

  // Stage B: Beginning / Pre-shock
  if (
    ((params.sbp ?? 120) < 90 || (params.map ?? 80) < 60 || (params.heartRate ?? 70) > 100) &&
    ((params.lactate ?? 1.0) <= 2.0)
  ) {
    if ((params.sbp ?? 120) < 90) criteria.push(`Relative hypotension: SBP ${params.sbp} mmHg (< 90)`);
    if ((params.map ?? 80) < 60) criteria.push(`Borderline MAP ${params.map} mmHg (< 60)`);
    if ((params.heartRate ?? 70) > 100) criteria.push(`Compensatory tachycardia: HR ${params.heartRate} bpm (> 100)`);
    criteria.push("End-organ perfusion maintained (normal lactate <= 2.0 mmol/L, preserved urine output)");

    return {
      stage: "B",
      label: "Stage B: Beginning",
      description: "Compensated pre-shock: relative hypotension or tachycardia without clinical or laboratory evidence of tissue hypoperfusion.",
      criteriaMet: criteria,
      recommendedMonitoring: [
        "Close bedside surveillance in intensive care or stepdown cardiac telemetry",
        "Serial blood pressure and vital signs every 15-30 minutes",
        "Baseline lactate and repeat in 4-6 hours if blood pressure remains marginal",
      ],
      mortalityRiskTier: "moderate (5-15%)",
      citations: [
        "Naidu SS, et al. SCAI SHOCK Stage Classification Expert Consensus Update. J Am Coll Cardiol. 2022;79(9):933-946.",
      ],
    };
  }

  // Stage A: At Risk
  criteria.push("Hemodynamically stable: SBP >= 90 mmHg, MAP >= 65 mmHg");
  criteria.push("No evidence of tissue hypoperfusion (lactate <= 2.0 mmol/L)");
  criteria.push("Underlying acute cardiovascular insult (e.g. acute coronary syndrome, myocarditis, decompensated cardiomyopathy)");

  return {
    stage: "A",
    label: "Stage A: At Risk",
    description: "Normotensive with preserved systemic perfusion, but presenting with acute cardiac condition at risk of progressing to shock.",
    criteriaMet: criteria,
    recommendedMonitoring: [
      "Standard telemetry monitoring and serial cardiac markers",
      "Treat underlying cause (revascularization, medical guideline-directed therapy)",
    ],
    mortalityRiskTier: "low (<5%)",
    citations: [
      "Baran DA, et al. SCAI clinical expert consensus on classification of cardiogenic shock. Catheter Cardiovasc Interv. 2019;94(1):29-37.",
    ],
  };
}

/**
 * Epinephrine Type B Aerobic Hyperlactatemia vs Type A Ischemic Acidosis Differentiation
 */
export interface LactateEvaluation {
  classification: "Type B (Aerobic Epinephrine-Mediated)" | "Type A (Anaerobic Tissue Hypoperfusion)" | "Indeterminate / Mixed";
  physiologicalRationale: string;
  isBenignMetabolicArtifact: boolean;
  clinicalActionSummary: string;
  parametersAnalyzed: {
    lactate: number;
    arterialPh?: number;
    scvO2?: number;
    epinephrineActive: boolean;
  };
}

export function evaluateEpinephrineLactate(options: {
  lactate: number;
  epinephrineActive: boolean;
  arterialPh?: number;
  scvO2?: number; // %
  baseExcess?: number;
  urineOutputAdequate?: boolean;
}): LactateEvaluation {
  const { lactate, epinephrineActive, arterialPh, scvO2, urineOutputAdequate } = options;

  if (epinephrineActive && lactate > 2.0) {
    const phPreserved = arterialPh === undefined || arterialPh >= 7.35;
    const scvO2Adequate = scvO2 === undefined || scvO2 >= 70;
    const urineAdequate = urineOutputAdequate === undefined || urineOutputAdequate === true;

    if (phPreserved && scvO2Adequate && urineAdequate) {
      return {
        classification: "Type B (Aerobic Epinephrine-Mediated)",
        physiologicalRationale:
          "Epinephrine stimulates skeletal muscle beta-2 adrenergic receptors, activating membrane Na+/K+ ATPase and adenylyl cyclase/cAMP pathways. This accelerates glycogenolysis, producing pyruvate faster than mitochondrial pyruvate dehydrogenase (PDH) can oxidize it. Excess pyruvate is converted to lactate under aerobic conditions with preserved tissue oxygen delivery. Concurrently, arterial pH, ScvO2, and urine output remain normal or improving.",
        isBenignMetabolicArtifact: true,
        clinicalActionSummary:
          "Do NOT mistake epinephrine-induced Type B hyperlactatemia for ongoing tissue hypoperfusion or fluid responsiveness. Avoid reflexive escalation of fluids or additional vasopressors if blood pressure, ScvO2, and urine output are stable. Lactate typically plateaus and rapidly clears upon epinephrine weaning.",
        parametersAnalyzed: {
          lactate,
          arterialPh,
          scvO2,
          epinephrineActive: true,
        },
      };
    }

    if (!phPreserved || (scvO2 !== undefined && scvO2 < 65) || urineOutputAdequate === false) {
      return {
        classification: "Type A (Anaerobic Tissue Hypoperfusion)",
        physiologicalRationale:
          "Acidemia (pH < 7.35), depressed central venous oxygen saturation (ScvO2 < 65%), or oliguria indicate true anaerobic cellular debt and microvascular hypoperfusion, despite concurrent epinephrine infusion.",
        isBenignMetabolicArtifact: false,
        clinicalActionSummary:
          "Severe tissue hypoperfusion present. Reassess volume status, cardiac output (via echocardiography or pulmonary artery catheter), and consider escalation of mechanical circulatory support or inotropic assistance.",
        parametersAnalyzed: {
          lactate,
          arterialPh,
          scvO2,
          epinephrineActive: true,
        },
      };
    }
  }

  if (lactate > 2.0) {
    return {
      classification: "Type A (Anaerobic Tissue Hypoperfusion)",
      physiologicalRationale:
        "Elevated blood lactate in the absence of beta-2 agonist hyper-glycolysis reflects inadequate cellular oxygen delivery (DO2) relative to consumption (VO2), driving anaerobic glycolysis and ATP hydrolysis.",
      isBenignMetabolicArtifact: false,
      clinicalActionSummary:
        "Evaluate systemic perfusion markers, MAP, cardiac output, and address underlying shock etiology.",
      parametersAnalyzed: {
        lactate,
        arterialPh,
        scvO2,
        epinephrineActive,
      },
    };
  }

  return {
    classification: "Indeterminate / Mixed",
    physiologicalRationale: "Serum lactate is within normal physiologic limits (<= 2.0 mmol/L).",
    isBenignMetabolicArtifact: false,
    clinicalActionSummary: "Lactate normal; continue routine hemodynamic surveillance.",
    parametersAnalyzed: {
      lactate,
      arterialPh,
      scvO2,
      epinephrineActive,
    },
  };
}

/**
 * Milrinone vs Dobutamine Renal Clearance Elimination Comparison
 */
export interface InotropeRenalComparison {
  patientCrCl: number;
  milrinone: {
    estimatedHalfLifeHours: number;
    accumulationRiskTier: "normal" | "moderate accumulation" | "severe accumulation / toxicity trap";
    doseAdjustmentRationale: string;
    dialysisClearanceNote: string;
  };
  dobutamine: {
    estimatedHalfLifeMinutes: number;
    accumulationRiskTier: "none (organ-independent COMT metabolism)";
    clinicalRecommendation: string;
  };
}

export function compareInotropeRenalClearance(crCl: number): InotropeRenalComparison {
  const safeCrCl = Math.max(5, Math.min(150, crCl));

  let milrinoneT12 = 2.4;
  let accumulationTier: "normal" | "moderate accumulation" | "severe accumulation / toxicity trap" = "normal";
  let doseRationale = "Standard dosing in preserved renal function (0.375 to 0.75 mcg/kg/min).";

  if (safeCrCl < 30) {
    milrinoneT12 = 24.0 + (30 - safeCrCl) * 0.5; // up to 36-40 hours
    accumulationTier = "severe accumulation / toxicity trap";
    doseRationale =
      "Severe renal impairment (CrCl < 30 mL/min). 85% of milrinone is renally cleared. Half-life is prolonged 10- to 15-fold (to > 24-40 hours). Empiric 50-75% dose reduction mandated (0.2 to 0.25 mcg/kg/min or lower), or prefer dobutamine to prevent refractory vasodilation and arrhythmias.";
  } else if (safeCrCl < 50) {
    milrinoneT12 = 4.5 + (50 - safeCrCl) * 0.4;
    accumulationTier = "moderate accumulation";
    doseRationale = "Moderate renal impairment (CrCl 30-50 mL/min). Reduce maintenance infusion by 30-50% (0.25 to 0.4 mcg/kg/min).";
  }

  return {
    patientCrCl: safeCrCl,
    milrinone: {
      estimatedHalfLifeHours: Math.round(milrinoneT12 * 10) / 10,
      accumulationRiskTier: accumulationTier,
      doseAdjustmentRationale: doseRationale,
      dialysisClearanceNote: "Partially dialyzed by high-flux hemodialysis; does not substitute for proactive dose downward adjustment.",
    },
    dobutamine: {
      estimatedHalfLifeMinutes: 2.0,
      accumulationRiskTier: "none (organ-independent COMT metabolism)",
      clinicalRecommendation:
        "Dobutamine undergoes rapid hepatic COMT methylation independent of renal function (t1/2 ~ 2 min). Preferred inotrope in AKI, severe CKD, and intermittent hemodialysis.",
    },
  };
}

/**
 * Extravasation Phentolamine Rescue Protocol
 */
export interface ExtravasationProtocol {
  antidote: string;
  doseAndPreparation: string;
  administrationTechnique: string;
  timeWindowHours: number;
  alternativeAgent: string;
  monitoringGuidance: string;
}

export function getPhentolamineExtravasationProtocol(): ExtravasationProtocol {
  return {
    antidote: "Phentolamine Mesylate (Regitine) - Competitive alpha-1 adrenergic antagonist",
    doseAndPreparation: "5 to 10 mg diluted in 10 to 15 mL of 0.9% Sodium Chloride injection",
    administrationTechnique:
      "Infiltrate subcutaneously / intradermally throughout the entire ischemic, blanched area using a fine (25 to 27 gauge) needle. Multiple small injections circumferentially. Prompt reversal of blanching confirms local alpha-receptor blockade.",
    timeWindowHours: 12,
    alternativeAgent:
      "Topical 2% Nitroglycerin ointment (1 inch strip applied to ischemic zone) if phentolamine is unavailable or while awaiting pharmacy dispensing.",
    monitoringGuidance:
      "Monitor for local tissue reperfusion (warmth, return of pink capillary refill). Monitor systemic blood pressure for unintended systemic hypotension from phentolamine absorption.",
  };
}

/**
 * Tray Detection
 */
export interface VasoactiveDeskDetection {
  hasVasoactive: boolean;
  detectedAgents: VasoactiveAgentDef[];
  hasVasopressor: boolean;
  hasInotrope: boolean;
  hasInodilator: boolean;
  isMultiVasoactive: boolean;
  hasEpinephrine: boolean;
  hasMilrinone: boolean;
  hasDobutamine: boolean;
  hasExtravasationRisk: boolean;
}

export function vasoactiveOnDesk(drugIds: string[]): VasoactiveDeskDetection {
  const detected: VasoactiveAgentDef[] = [];

  for (const id of drugIds) {
    const normalized = id.toLowerCase();
    const agent = VASOACTIVE_AGENTS[normalized];
    if (agent && !detected.some((d) => d.id === agent.id)) {
      detected.push(agent);
    }
  }

  const hasVasopressor = detected.some((d) => d.class === "vasopressor");
  const hasInotrope = detected.some((d) => d.class === "inotrope");
  const hasInodilator = detected.some((d) => d.class === "inodilator");
  const hasEpinephrine = detected.some((d) => d.id === "epinephrine");
  const hasMilrinone = detected.some((d) => d.id === "milrinone");
  const hasDobutamine = detected.some((d) => d.id === "dobutamine");
  const hasExtravasationRisk = detected.some((d) => d.receptorProfile.alpha1 >= 3);

  return {
    hasVasoactive: detected.length > 0,
    detectedAgents: detected,
    hasVasopressor,
    hasInotrope,
    hasInodilator,
    isMultiVasoactive: detected.length >= 2,
    hasEpinephrine,
    hasMilrinone,
    hasDobutamine,
    hasExtravasationRisk,
  };
}

/**
 * End-to-End Vasoactive Hemodynamics Report Generator
 */
export interface VasoactiveReport {
  detection: VasoactiveDeskDetection;
  activeAgents: VasoactiveAgentDef[];
  scaiEvaluation?: ScaiEvaluation;
  epinephrineLactateReview?: LactateEvaluation;
  inotropeRenalReview?: InotropeRenalComparison;
  extravasationProtocol: ExtravasationProtocol;
  safetyAlerts: string[];
  citations: string[];
  disclaimer: string;
}

export function vasoactiveReportOnDesk(
  drugIds: string[],
  host?: Partial<HostContext> & { patientCrCl?: number },
  options?: {
    shockParams?: ShockParameters;
    patientCrCl?: number;
    lactate?: number;
    arterialPh?: number;
    scvO2?: number;
  },
): VasoactiveReport {
  const detection = vasoactiveOnDesk(drugIds);
  const activeAgents = detection.detectedAgents;
  const safetyAlerts: string[] = [];
  const citations: string[] = [
    "Baran DA, et al. SCAI clinical expert consensus on classification of cardiogenic shock. Catheter Cardiovasc Interv. 2019;94(1):29-37.",
    "Naidu SS, et al. SCAI SHOCK Stage Classification Expert Consensus Update. J Am Coll Cardiol. 2022;79(9):933-946.",
    "Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Crit Care Med. 2021;49(11):e1063-e1143.",
    "De Backer D, et al. Comparison of Dopamine and Norepinephrine in the Treatment of Shock (SOAP II). N Engl J Med. 2010;362(9):779-789.",
    "Khanna A, et al. Angiotensin II for the Treatment of Vasodilatory Shock (ATHOS-3). N Engl J Med. 2017;377(5):419-430.",
  ];

  // SCAI Shock Staging
  let scaiEvaluation: ScaiEvaluation | undefined;
  if (options?.shockParams) {
    const paramsWithCount: ShockParameters = {
      ...options.shockParams,
      vasoactiveAgentCount: options.shockParams.vasoactiveAgentCount ?? activeAgents.length,
    };
    scaiEvaluation = evaluateScaiShockStage(paramsWithCount);
  }

  // Epinephrine Lactate Evaluation
  let epinephrineLactateReview: LactateEvaluation | undefined;
  if (options?.lactate !== undefined) {
    epinephrineLactateReview = evaluateEpinephrineLactate({
      lactate: options.lactate,
      epinephrineActive: detection.hasEpinephrine,
      arterialPh: options.arterialPh,
      scvO2: options.scvO2,
    });
    if (epinephrineLactateReview.isBenignMetabolicArtifact) {
      safetyAlerts.push(
        "Epinephrine-Induced Type B Hyperlactatemia detected: Elevated lactate with preserved arterial pH/ScvO2 reflects skeletal muscle beta-2 glycogenolysis rather than worsening tissue hypoperfusion.",
      );
    }
  }

  // Renal Clearance Evaluation for Milrinone / Dobutamine
  let inotropeRenalReview: InotropeRenalComparison | undefined;
  const crClValue = options?.patientCrCl ?? host?.patientCrCl ?? (host?.egfr ?? (host?.ckdStage && host.ckdStage >= 3 ? 25 : 80));
  if (detection.hasMilrinone || detection.hasDobutamine || options?.patientCrCl !== undefined || host?.patientCrCl !== undefined) {
    inotropeRenalReview = compareInotropeRenalClearance(crClValue);
    if (detection.hasMilrinone && inotropeRenalReview.milrinone.accumulationRiskTier !== "normal") {
      safetyAlerts.push(
        `Milrinone Renal Clearance Hazard (CrCl ${inotropeRenalReview.patientCrCl} mL/min): 85% renally eliminated; half-life extended to ~${inotropeRenalReview.milrinone.estimatedHalfLifeHours} hours. High risk of protracted vasoplegic hypotension. Consider dose reduction or dobutamine substitution.`,
      );
    }
  }

  // Multi-Vasoactive Alert
  if (detection.isMultiVasoactive) {
    safetyAlerts.push(
      `Concomitant Vasoactive Regimen (${activeAgents.length} agents): Monitor arterial line hemodynamics, end-organ perfusion, and cardiac arrhythmias continuously. Meets criterion for escalating shock (SCAI Stage D).`,
    );
  }

  // Extravasation Alert
  if (detection.hasExtravasationRisk) {
    safetyAlerts.push(
      "High Alpha-1 Extravasation Hazard: Potent peripheral vasoconstrictors detected. Ensure central venous access where feasible; if peripheral extravasation occurs, initiate phentolamine 5-10 mg infiltration protocol within 12 hours.",
    );
  }

  return {
    detection,
    activeAgents,
    scaiEvaluation,
    epinephrineLactateReview,
    inotropeRenalReview,
    extravasationProtocol: getPhentolamineExtravasationProtocol(),
    safetyAlerts,
    citations,
    disclaimer: `${NOT_CLEARED} ${PI_FOOTER}`,
  };
}
