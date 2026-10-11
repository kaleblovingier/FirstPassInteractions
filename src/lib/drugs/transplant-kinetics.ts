/**
 * Solid Organ Transplant Immunosuppression, CNI Therapeutic Drug Monitoring & Collision Kinetics Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Architecture:
 * - Transparent cellular, pharmacokinetic, and biochemical interaction models
 * - Canonical peer-reviewed citations:
 *   KDIGO Clinical Practice Guideline for the Care of Kidney Transplant Recipients (2009 / 2020),
 *   AST/ASTS Consensus Guidelines on Immunosuppressive Monitoring (Wiesner et al., 2018),
 *   Bullingham et al., Clinical pharmacokinetics of mycophenolate mofetil. Clin Pharmacokinet. 1998,
 *   van Gelder et al., Pharmacokinetics and pharmacodynamics of mycophenolic acid in organ transplant. Basic Clin Pharmacol Toxicol. 2006,
 *   Pichard et al., Corticosteroids induce hepatic and intestinal CYP3A4. Mol Pharmacol. 1992,
 *   Elion GB. The purine path to chemotherapy. Science. 1989 (Nobel Lecture on 6-MP / Allopurinol).
 * - Strictly non-prescriptive: educational reference ranges, interaction warnings, and pharmacokinetic guidance.
 */

import type { HostContext } from "./types";

export const NOT_CLEARED =
  "Educational & transplant pharmacology reference only. Not an FDA-cleared medical device, dosing directive, or diagnostic mandate. Transplant nephrologist / surgeon verification required under FD&C Act § 520(o)(1)(E).";

export const PI_FOOTER =
  "Calculations reflect KDIGO, AST/ASTS, and peer-reviewed literature. Serial whole-blood trough levels, allograft biopsy findings, and donor-specific antibody (DSA) titers govern bedside clinical decisions.";

export interface CniTargetBands {
  agent: "tacrolimus" | "cyclosporine";
  monitoringParameter: "C0 (12-hour whole blood trough)" | "C2 (2-hour peak concentration)";
  earlyPostTransplantTarget: string; // 0-3 months
  maintenanceTarget: string; // >3-6 months
  unit: string;
  samplingTubeMandate: string;
  cellularPartitioningNote: string;
  nephrotoxicityHallmarks: string[];
  neurotoxicityHallmarks: string[];
}

export const CNI_TARGET_GUIDELINES: Record<"tacrolimus" | "cyclosporine", CniTargetBands> = {
  tacrolimus: {
    agent: "tacrolimus",
    monitoringParameter: "C0 (12-hour whole blood trough)",
    earlyPostTransplantTarget: "8 to 12 ng/mL",
    maintenanceTarget: "5 to 8 ng/mL (up to 4-7 ng/mL in low-immunologic risk)",
    unit: "ng/mL",
    samplingTubeMandate: "WHOLE BLOOD (EDTA tube). Never plasma or serum.",
    cellularPartitioningNote:
      "CRITICAL SAMPLING TRAP: Tacrolimus partitions 85-90% into erythrocytes! Centrifuging blood and testing serum/plasma falsely yields undetectable or near-zero levels (<0.5 ng/mL), risking massive accidental overdose.",
    nephrotoxicityHallmarks: [
      "Acute reversible afferent arteriolar vasoconstriction (drop in GFR, surge in serum creatinine)",
      "Tubular dysfunction: hyperkalemia (blunted aldosterone sensitivity in cortical collecting duct), hypomagnesemia, hyperuricemia",
      "Chronic irreversible arteriopathy: nodular hyalinosis, striped cortical fibrosis, and tubular atrophy",
    ],
    neurotoxicityHallmarks: [
      "Fine action hand tremor (most common early sign)",
      "Insomnia, vivid nightmares, headache, paresthesias",
      "Posterior Reversible Encephalopathy Syndrome (PRES): parietal-occipital vasogenic edema, seizures, visual disturbance, altered consciousness",
    ],
  },
  cyclosporine: {
    agent: "cyclosporine",
    monitoringParameter: "C2 (2-hour peak concentration)",
    earlyPostTransplantTarget: "C0 150-300 ng/mL or C2 800-1400 ng/mL",
    maintenanceTarget: "C0 75-150 ng/mL or C2 600-1000 ng/mL",
    unit: "ng/mL",
    samplingTubeMandate: "WHOLE BLOOD (EDTA tube). Never plasma or serum.",
    cellularPartitioningNote:
      "Cyclosporine partitions 50-60% into erythrocytes in a temperature- and hematocrit-dependent manner. Whole blood measurement is strictly required.",
    nephrotoxicityHallmarks: [
      "Afferent arteriolar vasoconstriction mediated by endothelin surge and blunted endothelial nitric oxide synthesis",
      "Thrombotic Microangiopathy (TMA / HUS) with microangiopathic hemolytic anemia and thrombocytopenia",
    ],
    neurotoxicityHallmarks: [
      "Coarse tremor, peripheral neuropathy, cerebellar ataxia",
      "Gingival hyperplasia, hirsutism, hyperlipidemia",
    ],
  },
};

/**
 * Enterohepatic Recirculation (EHC) & Antibiotic Gut Flora Collision
 */
export interface MycophenolateEhcAssessment {
  baselineSecondaryPeakPresent: boolean;
  antibioticGutFloraDecimation: boolean;
  predictedMpaAucReductionPercent: number;
  rejectionRiskAlert: string;
  biochemicalMechanism: string;
}

export function evaluateMycophenolateEhc(options: {
  mycophenolateActive: boolean;
  broadSpectrumAntibioticsActive: boolean;
}): MycophenolateEhcAssessment {
  const { mycophenolateActive, broadSpectrumAntibioticsActive } = options;

  if (mycophenolateActive && broadSpectrumAntibioticsActive) {
    return {
      baselineSecondaryPeakPresent: false,
      antibioticGutFloraDecimation: true,
      predictedMpaAucReductionPercent: 35, // typical 30-50% drop
      rejectionRiskAlert:
        "CRITICAL IMMUNOSUPPRESSION VULNERABILITY: Broad-spectrum antibiotics decimate intestinal flora beta-glucuronidase enzymes, halting hydrolysis of MPAG back into active MPA. Secondary plasma peak disappears, slashing MPA exposure by 30 to 50% and triggering acute allograft rejection!",
      biochemicalMechanism:
        "Mycophenolate (MPA) undergoes hepatic UGT1A9 glucuronidation to inactive MPAG, which is excreted in bile. Intestinal commensal bacteria synthesize beta-glucuronidases that de-glucuronidate MPAG back into active lipophilic MPA for secondary reabsorption (yielding the 6-12 hour post-dose peak, accounting for 10-40% of total AUC). Broad-spectrum antibiotics (ciprofloxacin, ampicillin, piperacillin-tazobactam) eliminate beta-glucuronidase-producing bacteria, causing MPAG to be lost in stool.",
    };
  }

  return {
    baselineSecondaryPeakPresent: mycophenolateActive,
    antibioticGutFloraDecimation: false,
    predictedMpaAucReductionPercent: 0,
    rejectionRiskAlert: "Intestinal microbiome intact; normal enterohepatic recirculation expected.",
    biochemicalMechanism:
      "Normal secondary absorption peak at 6 to 12 hours sustained by gut flora beta-glucuronidase activity.",
  };
}

/**
 * Corticosteroid Taper CYP3A4 Rebound Simulation
 */
export interface SteroidTaperCniImpact {
  steroidTaperActive: boolean;
  predictedCniClearanceDeceleration: string;
  expectedCniTroughSurgePercent: number;
  clinicalAction: string;
  biochemicalMechanism: string;
}

export function evaluateSteroidTaperCniImpact(options: {
  cniActive: boolean;
  highDoseSteroidTapering: boolean;
}): SteroidTaperCniImpact {
  const { cniActive, highDoseSteroidTapering } = options;

  if (cniActive && highDoseSteroidTapering) {
    return {
      steroidTaperActive: true,
      predictedCniClearanceDeceleration: "Hepatic & intestinal CYP3A4 / P-gp de-induction over 7 to 14 days",
      expectedCniTroughSurgePercent: 50, // 40-80% increase
      clinicalAction:
        "PROACTIVE CNI TDM MONITORING: Check whole-blood tacrolimus or cyclosporine trough levels 3 to 5 days after each major steroid dose decrement. Anticipate a 30-50% CNI dose reduction requirement during weaning to prevent acute nephrotoxicity.",
      biochemicalMechanism:
        "Corticosteroids (methylprednisolone, prednisone) are potent inducers of CYP3A4 and ABCB1 (P-glycoprotein) via the glucocorticoid receptor (GR) and PXR. Tapering steroids removes this transcriptional induction stimulus; as enzyme levels fall over 1-2 weeks, CNI metabolic clearance decelerates, causing sudden supratherapeutic CNI blood accumulation.",
    };
  }

  return {
    steroidTaperActive: false,
    predictedCniClearanceDeceleration: "Stable baseline",
    expectedCniTroughSurgePercent: 0,
    clinicalAction: "Routine therapeutic drug monitoring.",
    biochemicalMechanism: "No active steroid withdrawal de-induction stimulus identified.",
  };
}

/**
 * Azathioprine x Xanthine Oxidase (Allopurinol / Febuxostat) Lethal Collision
 */
export interface ThiopurineXanthineOxidaseCollision {
  isLethalCollisionDetected: boolean;
  pancytopeniaRiskLevel: "catastrophic" | "none";
  mandatoryDoseReductionRule: string;
  molecularPathwayShunt: string;
}

export function evaluateAzathioprineXanthineOxidase(drugIds: string[]): ThiopurineXanthineOxidaseCollision {
  const normalized = drugIds.map((d) => d.toLowerCase());
  const hasThiopurine = normalized.includes("azathioprine");
  const hasXoInhibitor = normalized.includes("allopurinol");

  if (hasThiopurine && hasXoInhibitor) {
    return {
      isLethalCollisionDetected: true,
      pancytopeniaRiskLevel: "catastrophic",
      mandatoryDoseReductionRule:
        "MANDATORY 75% AZATHIOPRINE DOSE REDUCTION: Reduce azathioprine dose to 25% of baseline (or avoid combination completely). Monitor weekly complete blood counts (CBC) for severe neutropenia.",
      molecularPathwayShunt:
        "Azathioprine is converted to 6-mercaptopurine (6-MP). Xanthine Oxidase (XO) is the primary clearance pathway converting 6-MP to inactive 6-thiouric acid. Allopurinol blocks XO, shunting 100% of 6-MP through HPRT into cytotoxic 6-thioguanine nucleotides (6-TGN), which causes massive, fatal bone marrow aplasia and pancytopenia.",
    };
  }

  return {
    isLethalCollisionDetected: false,
    pancytopeniaRiskLevel: "none",
    mandatoryDoseReductionRule: "Standard therapeutic dosing.",
    molecularPathwayShunt: "Normal balance between XO, TPMT, and HPRT enzymatic pathways.",
  };
}

/**
 * Tray Detection
 */
export interface TransplantDeskDetection {
  hasTransplant: boolean;
  hasTacrolimus: boolean;
  hasCyclosporine: boolean;
  hasMycophenolate: boolean;
  hasAzathioprine: boolean;
  hasSirolimus: boolean;
  hasAllopurinol: boolean;
  hasPrednisone: boolean;
  detectedAgents: string[];
}

export function transplantOnDesk(drugIds: string[]): TransplantDeskDetection {
  const normalized = drugIds.map((d) => d.toLowerCase());
  const detected: string[] = [];

  const hasTacrolimus = normalized.includes("tacrolimus");
  const hasCyclosporine = normalized.includes("cyclosporine");
  const hasMycophenolate = normalized.includes("mycophenolate");
  const hasAzathioprine = normalized.includes("azathioprine");
  const hasSirolimus = normalized.includes("sirolimus");
  const hasAllopurinol = normalized.includes("allopurinol");
  const hasPrednisone = normalized.includes("prednisone");

  if (hasTacrolimus) detected.push("tacrolimus");
  if (hasCyclosporine) detected.push("cyclosporine");
  if (hasMycophenolate) detected.push("mycophenolate");
  if (hasAzathioprine) detected.push("azathioprine");
  if (hasSirolimus) detected.push("sirolimus");
  if (hasAllopurinol) detected.push("allopurinol");
  if (hasPrednisone) detected.push("prednisone");

  const hasTransplant =
    hasTacrolimus || hasCyclosporine || hasMycophenolate || hasAzathioprine || hasSirolimus;

  return {
    hasTransplant,
    hasTacrolimus,
    hasCyclosporine,
    hasMycophenolate,
    hasAzathioprine,
    hasSirolimus,
    hasAllopurinol,
    hasPrednisone,
    detectedAgents: detected,
  };
}

/**
 * End-to-End Transplant Report Generator
 */
export interface TransplantReport {
  detection: TransplantDeskDetection;
  cniGuidelines?: CniTargetBands;
  ehcAssessment: MycophenolateEhcAssessment;
  steroidTaperAssessment: SteroidTaperCniImpact;
  thiopurineCollision: ThiopurineXanthineOxidaseCollision;
  safetyAlerts: string[];
  citations: string[];
  disclaimer: string;
}

export function transplantReportOnDesk(
  drugIds: string[],
  host?: HostContext,
  options?: {
    postTransplantMonths?: number;
    broadSpectrumAntibiotics?: boolean;
    highDoseSteroidTaper?: boolean;
  },
): TransplantReport {
  const detection = transplantOnDesk(drugIds);
  const safetyAlerts: string[] = [];
  const citations: string[] = [
    "KDIGO Clinical Practice Guideline for the Care of Kidney Transplant Recipients. Am J Transplant. 2009;9(Suppl 3):S1-S157.",
    "Wiesner RH, et al. American Society of Transplantation recommendations for immunosuppressive monitoring. Am J Transplant. 2018.",
    "van Gelder T, et al. Pharmacokinetics and pharmacodynamics of mycophenolic acid in organ transplant. Basic Clin Pharmacol Toxicol. 2006;98(3):287-293.",
    "Elion GB. The purine path to chemotherapy. Science. 1989;244(4900):41-47.",
  ];

  let cniGuidelines: CniTargetBands | undefined;
  if (detection.hasTacrolimus) {
    cniGuidelines = CNI_TARGET_GUIDELINES.tacrolimus;
    safetyAlerts.push(
      "Tacrolimus Whole Blood Sampling Mandate: 85-90% partitions into erythrocytes. MUST measure in whole blood EDTA tube. Plasma/serum levels are falsely undetectable.",
    );
  } else if (detection.hasCyclosporine) {
    cniGuidelines = CNI_TARGET_GUIDELINES.cyclosporine;
    safetyAlerts.push(
      "Cyclosporine Therapeutic Monitoring: Measure C0 trough (150-300 ng/mL early) or C2 2-hour peak (800-1400 ng/mL early). Requires whole blood EDTA tube.",
    );
  }

  // Mycophenolate EHC
  const ehcAssessment = evaluateMycophenolateEhc({
    mycophenolateActive: detection.hasMycophenolate,
    broadSpectrumAntibioticsActive: options?.broadSpectrumAntibiotics ?? false,
  });
  if (ehcAssessment.antibioticGutFloraDecimation) {
    safetyAlerts.push(ehcAssessment.rejectionRiskAlert);
  }

  // Steroid Taper Rebound
  const steroidTaperAssessment = evaluateSteroidTaperCniImpact({
    cniActive: detection.hasTacrolimus || detection.hasCyclosporine,
    highDoseSteroidTapering: options?.highDoseSteroidTaper ?? detection.hasPrednisone,
  });
  if (steroidTaperAssessment.steroidTaperActive) {
    safetyAlerts.push(
      "Steroid De-Induction CNI Surge Hazard: Weaning steroids causes CYP3A4/P-gp down-regulation, reducing CNI clearance by ~40-50% over 7-14 days. Monitor whole blood trough levels closely to avoid acute CNI nephrotoxicity.",
    );
  }

  // Azathioprine x Allopurinol
  const thiopurineCollision = evaluateAzathioprineXanthineOxidase(drugIds);
  if (thiopurineCollision.isLethalCollisionDetected) {
    safetyAlerts.push(
      `Lethal Thiopurine-Allopurinol Interaction: ${thiopurineCollision.mandatoryDoseReductionRule}`,
    );
  }

  // Sirolimus Wound Healing
  if (detection.hasSirolimus) {
    safetyAlerts.push(
      "mTOR Inhibitor Wound Healing Warning: Sirolimus impairs fibroblast proliferation and surgical angiogenesis. Avoid initiation until surgical wound is fully healed (4-6 weeks post-transplant).",
    );
  }

  return {
    detection,
    cniGuidelines,
    ehcAssessment,
    steroidTaperAssessment,
    thiopurineCollision,
    safetyAlerts,
    citations,
    disclaimer: `${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

