/**
 * Neuropsychiatric Polypharmacy, Therapeutic Drug Monitoring (TDM) & Neuro-Emergency Reference Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Regulatory Posture:
 * This software module is an educational, non-prescriptive clinical pharmacology decision-support
 * reference under Section 520(o)(1)(E) of the Federal Food, Drug, and Cosmetic Act (21 U.S.C. § 360j(o)(1)(E)).
 * It models receptor pharmacology, validated diagnostic decision trees (Hunter Serotonin Toxicity Criteria,
 * DSM-5 / Levenson / Gurrera NMS Criteria, Anticholinergic Toxidrome signs), Clozapine REMS Absolute
 * Neutrophil Count (ANC) protocols, CYP1A2 polycyclic aromatic hydrocarbon (PAH) tobacco smoke induction
 * and cessation clearance surge kinetics, and antidepressant elimination half-life / FINISH syndrome
 * cross-tapering kinetics to enable licensed healthcare professionals (psychiatrists, neurologists,
 * emergency physicians, clinical pharmacologists, and psychiatric pharmacotherapy specialists / PharmDs)
 * and supervised health-professions students to independently analyze complex neuropsychiatric regimens.
 * It does not provide patient-specific dosing orders, automated diagnostic directives, treatment mandates,
 * or replace independent clinical judgment and official FDA-approved Prescribing Information.
 *
 * Authoritative Literature & Guideline Citations:
 * - Dunkley EJC, Isbister GK, Sibbritt D, Dawson AH, Whyte IM. The Hunter Serotonin Toxicity Criteria:
 *   simple and accurate diagnostic decision rules for serotonin toxicity. QJM. 2003;96(9):635-642.
 *   doi:10.1093/qjmed/hcg109.
 * - Levenson JL. Neuroleptic malignant syndrome. Am J Psychiatry. 1985;142(10):1137-1145.
 * - Gurrera RJ, Caroff SN, Cohen A, et al. An international consensus study of neuroleptic malignant
 *   syndrome diagnostic criteria using the Delphi method. J Clin Psychiatry. 2011;72(9):1222-1228.
 * - Boyer EW, Shannon M. The serotonin syndrome. N Engl J Med. 2005;352(11):1112-1120.
 * - FDA Center for Drug Evaluation and Research. Clozaril (clozapine) Prescribing Information & REMS Protocol.
 *   NDA 019758. U.S. Food and Drug Administration; 2023.
 * - Rostami-Hodjegan A, Amin AM, Spencer EP, Lennard MS, Tucker GT, Flanagan RJ. Influence of dose,
 *   cigarette smoking, age, sex, and metabolic phenotype on enantioselective clearance of clozapine.
 *   J Clin Psychopharmacol. 2004;24(4):370-378.
 * - de Leon J, Diaz FJ. Serious adverse drug reactions of clozapine: gastrointestinal hypomotility
 *   and metabolic syndrome. Clin Psychopharmacol Neurosci. 2015;13(3):230-239.
 * - Palmer SE, McLean RM, Ellis PM, Harrison-Woolrych M. Life-threatening clozapine-induced
 *   gastrointestinal hypomotility: an analysis of 102 cases. J Clin Psychiatry. 2008;69(5):759-768.
 * - Rosenbaum JF, Fava M, Hoog SL, Ascroft RC, Krebs WB. Selective serotonin reuptake inhibitor
 *   discontinuation syndrome: a randomized clinical trial. Biol Psychiatry. 1998;44(2):77-87.
 * - Strawn JR, Welge JA, Wehry AM, Keeshin B, Rynn MA. Antidepressant discontinuation syndrome:
 *   clinical considerations and management. CNS Drugs. 2018;32(4):347-358.
 * - Litovitz T, et al. Anticholinergic toxidrome and physostigmine reversal: risks and clinical criteria.
 *   Ann Emerg Med. 2000;35(4):374-385.
 * - Rosenberg H, Pollock N, Schiemann A, Bulger T, Stowell K. Malignant hyperthermia: a review.
 *   Orphanet J Rare Dis. 2015;10:93. doi:10.1186/s13023-015-0310-1.
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";

/* ========================================================================== */
/* SECTION 1: REGULATORY POSTURE & AUTHORITATIVE CITATIONS                    */
/* ========================================================================== */

export const NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Reference: The FirstPass Neuropsychiatric Polypharmacy, TDM & Neuro-Emergency Engine provides educational, non-prescriptive mechanistic pharmacology models, diagnostic criteria (Hunter Serotonin Toxicity Criteria, Levenson/Gurrera NMS Criteria, Anticholinergic Toxidrome), Clozapine REMS Absolute Neutrophil Count algorithms, tobacco smoke CYP1A2 induction/cessation kinetic simulations, and antidepressant discontinuation half-life analyses for licensed healthcare professionals and supervised trainees. It enables independent evaluation of the scientific rationale for complex neuropsychiatric interactions and does not provide patient-specific dosing orders, automated diagnostic directives, or treatment mandates. Clinical management requires independent evaluation, psychiatric emergency assessment, and reference to official FDA-approved Prescribing Information.";

export const NEUROPSYCH_CITATIONS: readonly string[] = [
  "Dunkley EJC, Isbister GK, Sibbritt D, Dawson AH, Whyte IM. The Hunter Serotonin Toxicity Criteria: simple and accurate diagnostic decision rules for serotonin toxicity. QJM. 2003;96(9):635-642. doi:10.1093/qjmed/hcg109.",
  "Levenson JL. Neuroleptic malignant syndrome. Am J Psychiatry. 1985;142(10):1137-1145. doi:10.1176/ajp.142.10.1137.",
  "Gurrera RJ, Caroff SN, Cohen A, et al. An international consensus study of neuroleptic malignant syndrome diagnostic criteria using the Delphi method. J Clin Psychiatry. 2011;72(9):1222-1228. doi:10.4088/JCP.10m06438.",
  "Boyer EW, Shannon M. The serotonin syndrome. N Engl J Med. 2005;352(11):1112-1120. doi:10.1056/NEJMra041867.",
  "FDA CDER. Clozaril (clozapine) Prescribing Information & REMS Protocol. NDA 019758. U.S. Food and Drug Administration; 2023.",
  "Rostami-Hodjegan A, Amin AM, Spencer EP, Lennard MS, Tucker GT, Flanagan RJ. Influence of dose, cigarette smoking, age, sex, and metabolic phenotype on enantioselective clearance of clozapine. J Clin Psychopharmacol. 2004;24(4):370-378.",
  "de Leon J, Diaz FJ. Serious adverse drug reactions of clozapine: gastrointestinal hypomotility and metabolic syndrome. Clin Psychopharmacol Neurosci. 2015;13(3):230-239. doi:10.9758/cpn.2015.13.3.230.",
  "Palmer SE, McLean RM, Ellis PM, Harrison-Woolrych M. Life-threatening clozapine-induced gastrointestinal hypomotility: an analysis of 102 cases. J Clin Psychiatry. 2008;69(5):759-768. doi:10.4088/jcp.v69n0509.",
  "Rosenbaum JF, Fava M, Hoog SL, Ascroft RC, Krebs WB. Selective serotonin reuptake inhibitor discontinuation syndrome: a randomized clinical trial. Biol Psychiatry. 1998;44(2):77-87. doi:10.1016/s0006-3223(98)00126-7.",
  "Strawn JR, Welge JA, Wehry AM, Keeshin B, Rynn MA. Antidepressant discontinuation syndrome: clinical considerations and management. CNS Drugs. 2018;32(4):347-358. doi:10.1007/s40263-018-0511-4.",
  "Litovitz T, et al. Anticholinergic toxidrome and physostigmine reversal: risks and clinical criteria. Ann Emerg Med. 2000;35(4):374-385.",
  "Rosenberg H, Pollock N, Schiemann A, Bulger T, Stowell K. Malignant hyperthermia: a review. Orphanet J Rare Dis. 2015;10:93. doi:10.1186/s13023-015-0310-1.",
];

/* ========================================================================== */
/* SECTION 2: NEUROPSYCHIATRIC EMERGENCIES & TOXIDROME DIFFERENTIAL ENGINE    */
/* ========================================================================== */

/**
 * Diagnostic decision criteria input for Hunter Serotonin Toxicity Criteria.
 * Requires presence of at least one serotonergic agent.
 */
export interface HunterCriteriaInput {
  serotonergicExposure: boolean;
  spontaneousClonus: boolean;
  inducibleClonus: boolean;
  ocularClonus: boolean;
  agitation: boolean;
  diaphoresis: boolean;
  tremor: boolean;
  hyperreflexia: boolean; // Lower extremity predominance
  hypertonia: boolean;
  temperatureCelsius: number;
}

export interface HunterCriteriaResult {
  meetsHunterCriteria: boolean;
  satisfiedRuleIndex: number | null;
  satisfiedRuleName: string | null;
  severityGrade: "none" | "mild" | "moderate" | "severe-critical";
  molecularMechanism: string;
  clinicalPresentationSummary: string;
  managementProtocol: {
    immediateAction: string;
    antidoteRecommendation: string;
    antipyreticWarning: string;
    neuromuscularBlockadeGuidance: string;
    supportiveMeasures: string[];
  };
  diagnosticSensitivity: string;
  diagnosticSpecificity: string;
}

/**
 * Hunter Serotonin Toxicity Criteria Decision Tree (Dunkley et al., 2003):
 * In the presence of a serotonergic agent, meeting ANY of these 5 mutually non-exclusive rules
 * confirms Serotonin Syndrome with 84% sensitivity and 97% specificity:
 *   Rule 1: Spontaneous clonus
 *   Rule 2: Inducible clonus AND (agitation OR diaphoresis)
 *   Rule 3: Ocular clonus AND (agitation OR diaphoresis)
 *   Rule 4: Tremor AND hyperreflexia (lower extremity predominance)
 *   Rule 5: Hypertonia AND temperature > 38.0°C AND (ocular clonus OR inducible clonus)
 */
export function evaluateHunterSerotoninCriteria(input: HunterCriteriaInput): HunterCriteriaResult {
  const managementProtocol = {
    immediateAction:
      "Immediately discontinue all serotonergic agents (SSRIs, SNRIs, MAOIs, TCAs, triptans, tramadol, linezolid, dextromethorphan, MDMA). Most mild cases resolve spontaneously within 24 to 48 hours.",
    antidoteRecommendation:
      "5-HT2A Antagonist Cyproheptadine: Initial loading dose 12 mg orally or crushed via nasogastric tube; if symptoms persist after 2 hours, administer an additional 2 mg every 2 hours as needed; maintenance dosing is typically 8 mg every 6 hours (maximum 32 mg in 24 hours).",
    antipyreticWarning:
      "Avoid antipyretics (acetaminophen, ibuprofen): Hyperthermia in Serotonin Syndrome is caused by excessive sustained muscular activity and clonus, NOT hypothalamic cytokine-mediated setpoint shift. Antipyretics are ineffective and add hepatic/renal toxicity.",
    neuromuscularBlockadeGuidance:
      "For severe hyperthermia (> 41.0°C / 105.8°F), rapid sequence intubation with non-depolarizing neuromuscular blockade (e.g., vecuronium) is life-saving to halt muscular heat production. Succinylcholine is CONTRAINDICATED due to acute hyperkalemic cardiac arrest and rhabdomyolysis risks.",
    supportiveMeasures: [
      "Aggressive IV hydration with chilled normal saline to prevent rhabdomyolysis and acute kidney injury.",
      "Intravenous benzodiazepines (e.g., diazepam 5-10 mg IV or lorazepam 1-2 mg IV q10-15min) to blunten neuromuscular hyperactivity, reduce agitation, and alleviate secondary hyperthermia.",
      "Continuous core temperature monitoring (rectal or esophageal probe).",
      "External cooling blankets, ice packs to axillae and groins, and mist-and-fan evaporative cooling.",
    ],
  };

  if (!input.serotonergicExposure) {
    return {
      meetsHunterCriteria: false,
      satisfiedRuleIndex: null,
      satisfiedRuleName: null,
      severityGrade: "none",
      molecularMechanism:
        "Serotonin syndrome requires hyperstimulation of central 5-HT2A and 5-HT1A receptors, which cannot occur without serotonergic pharmacotherapy or overdose.",
      clinicalPresentationSummary:
        "Patient has not been exposed to a serotonergic medication; Hunter Serotonin Toxicity Criteria require serotonergic exposure as a prerequisite.",
      managementProtocol,
      diagnosticSensitivity: "84% (Hunter et al., 2003)",
      diagnosticSpecificity: "97% (Hunter et al., 2003)",
    };
  }

  // Evaluate the 5 Hunter decision rules in order
  let meets = false;
  let ruleIdx: number | null = null;
  let ruleName: string | null = null;

  if (input.spontaneousClonus) {
    meets = true;
    ruleIdx = 1;
    ruleName = "Rule 1: Spontaneous Clonus";
  } else if (input.inducibleClonus && (input.agitation || input.diaphoresis)) {
    meets = true;
    ruleIdx = 2;
    ruleName = "Rule 2: Inducible Clonus + (Agitation or Diaphoresis)";
  } else if (input.ocularClonus && (input.agitation || input.diaphoresis)) {
    meets = true;
    ruleIdx = 3;
    ruleName = "Rule 3: Ocular Clonus + (Agitation or Diaphoresis)";
  } else if (input.tremor && input.hyperreflexia) {
    meets = true;
    ruleIdx = 4;
    ruleName = "Rule 4: Tremor + Hyperreflexia (Lower Extremity Predominance)";
  } else if (
    input.hypertonia &&
    input.temperatureCelsius > 38.0 &&
    (input.ocularClonus || input.inducibleClonus)
  ) {
    meets = true;
    ruleIdx = 5;
    ruleName = "Rule 5: Hypertonia + Temperature > 38.0°C + (Ocular or Inducible Clonus)";
  }

  // Determine clinical severity grade
  let severityGrade: HunterCriteriaResult["severityGrade"] = "none";
  if (meets) {
    if (input.temperatureCelsius >= 39.5 || (input.hypertonia && input.spontaneousClonus)) {
      severityGrade = "severe-critical";
    } else if (
      input.temperatureCelsius >= 38.0 ||
      input.spontaneousClonus ||
      (input.ocularClonus && input.agitation)
    ) {
      severityGrade = "moderate";
    } else {
      severityGrade = "mild";
    }
  }

  const presentation = meets
    ? `Patient satisfies Hunter Serotonin Toxicity Criteria via ${ruleName}. Characterized by excessive serotonergic neuromuscular hyperactivity (clonus, hyperreflexia), autonomic instability, and altered mental status.`
    : "Patient has serotonergic exposure but does not meet validated Hunter decision tree thresholds (clonus, hyperreflexia + tremor, or hypertonia + pyrexia). Continue close clinical observation.";

  return {
    meetsHunterCriteria: meets,
    satisfiedRuleIndex: ruleIdx,
    satisfiedRuleName: ruleName,
    severityGrade,
    molecularMechanism:
      "Excessive agonist stimulation of central (brainstem and hypothalamic) and peripheral 5-HT2A and 5-HT1A receptors, resulting in neuromuscular hyperexcitability, autonomic excitation, and secondary hyperthermia.",
    clinicalPresentationSummary: presentation,
    managementProtocol,
    diagnosticSensitivity: "84% (Dunkley et al., QJM 2003)",
    diagnosticSpecificity: "97% (Dunkley et al., QJM 2003)",
  };
}

/**
 * Diagnostic decision criteria input for Neuroleptic Malignant Syndrome (NMS)
 * per DSM-5, Levenson (1985), and Gurrera Delphi Consensus (2011).
 */
export interface NmsCriteriaInput {
  dopamineAntagonistExposure: boolean; // Antipsychotics, antiemetics, or withdrawal of DA agonist
  leadPipeRigidity: boolean;
  temperatureCelsius: number;
  autonomicInstability: boolean; // Labile BP, marked tachycardia, diaphoresis
  alteredMentalStatus: boolean; // Encephalopathy, mutism, delirium, stupor
  cpkLevelUPerL?: number; // Creatine kinase elevation
  elevatedCpk: boolean;
  leukocytosis: boolean; // WBC > 10,000/uL
  hyporeflexiaOrNormalReflexes: boolean;
}

export interface NmsCriteriaResult {
  meetsNmsCriteria: boolean;
  diagnosticConfidence: "confirmed" | "probable" | "possible" | "unlikely";
  levensonMajorCriteriaMet: string[];
  levensonMinorCriteriaMet: string[];
  differentiatorVsSerotoninSyndrome: {
    neuromuscularComparison: string;
    onsetComparison: string;
    resolutionComparison: string;
    pupilComparison: string;
    bowelComparison: string;
  };
  pharmacotherapyProtocol: {
    dopamineAgonistBromocriptine: string;
    ryanodineBlockerDantrolene: string;
    nmdaAntagonistAmantadine: string;
    supportiveAndRenalProtection: string;
  };
  pathophysiologicalMechanism: string;
}

/**
 * Evaluates clinical features for Neuroleptic Malignant Syndrome (NMS).
 */
export function evaluateNmsCriteria(input: NmsCriteriaInput): NmsCriteriaResult {
  const majorMet: string[] = [];
  const minorMet: string[] = [];

  if (input.leadPipeRigidity) majorMet.push("Severe 'Lead-Pipe' Muscle Rigidity");
  if (input.temperatureCelsius >= 38.0) majorMet.push(`Marked Hyperthermia (${input.temperatureCelsius}°C)`);
  if (input.elevatedCpk || (input.cpkLevelUPerL && input.cpkLevelUPerL > 1000)) {
    majorMet.push(
      `Marked Creatine Kinase Elevation (CPK ${input.cpkLevelUPerL ? `${input.cpkLevelUPerL} IU/L` : "> 1,000 IU/L"})`,
    );
  }

  if (input.autonomicInstability) minorMet.push("Autonomic Instability (Tachycardia, Labile BP, Diaphoresis)");
  if (input.alteredMentalStatus) minorMet.push("Altered Mental Status / Encephalopathy / Stupor");
  if (input.leukocytosis) minorMet.push("Leukocytosis (WBC > 10,000 / µL)");

  const hasExposure = input.dopamineAntagonistExposure;
  const majorCount = majorMet.length;
  const minorCount = minorMet.length;

  let meetsNms = false;
  let confidence: NmsCriteriaResult["diagnosticConfidence"] = "unlikely";

  if (hasExposure) {
    if (majorCount >= 3 && minorCount >= 2) {
      meetsNms = true;
      confidence = "confirmed";
    } else if (majorCount >= 2 && minorCount >= 2) {
      meetsNms = true;
      confidence = "probable";
    } else if (majorCount >= 1 && minorCount >= 2) {
      confidence = "possible";
    }
  }

  return {
    meetsNmsCriteria: meetsNms,
    diagnosticConfidence: confidence,
    levensonMajorCriteriaMet: majorMet,
    levensonMinorCriteriaMet: minorMet,
    differentiatorVsSerotoninSyndrome: {
      neuromuscularComparison:
        "NMS features generalized 'lead-pipe' plastic muscle rigidity throughout range-of-motion with hyporeflexia or normal reflexes; Serotonin Syndrome features lower-extremity hyperreflexia, coarse tremor, and spontaneous or inducible clonus.",
      onsetComparison:
        "NMS has an insidious onset evolving over days to weeks (mean 24-72 hours post initiation or dose escalation); Serotonin Syndrome has an acute, rapid onset developing within 6 to 24 hours of exposure.",
      resolutionComparison:
        "NMS resolves slowly over 1 to 2 weeks (up to 3-4 weeks for depot / long-acting injectables); Serotonin Syndrome resolves rapidly within 24 to 48 hours of drug cessation.",
      pupilComparison:
        "NMS features normal / unremarkable pupils; Serotonin Syndrome typically presents with mydriasis (dilated pupils) and ocular clonus.",
      bowelComparison:
        "NMS presents with normal or hypoactive bowel sounds; Serotonin Syndrome features hyperactive bowel sounds with abdominal cramping and diarrhea.",
    },
    pharmacotherapyProtocol: {
      dopamineAgonistBromocriptine:
        "Bromocriptine (D2 receptor agonist): 2.5 mg to 5.0 mg orally or via nasogastric tube three times daily (TID), titrated up to 15-20 mg/day as needed. Directly restores central dopaminergic tone in the hypothalamus and corpus striatum.",
      ryanodineBlockerDantrolene:
        "Dantrolene (Ryanodine receptor 1 antagonist): 1.0 to 2.5 mg/kg IV initial bolus, repeated every 10-15 minutes up to a maximum cumulative dose of 10 mg/kg/day. Directly blocks sarcoplasmic reticulum calcium release in skeletal muscle, reducing rigidity and muscle thermogenesis.",
      nmdaAntagonistAmantadine:
        "Amantadine (NMDA antagonist & dopamine facilitator): 100 mg orally or via NG tube twice to three times daily (BID-TID, up to 400 mg/day). Enhances central dopamine release and reduces glutamatergic toxicity.",
      supportiveAndRenalProtection:
        "Aggressive IV hydration (target urine output >= 100-200 mL/h) with sodium bicarbonate for urine alkalinization (pH >= 7.0) to prevent intratubular precipitation of toxic myoglobin and prevent rhabdomyolysis-induced acute tubular necrosis.",
    },
    pathophysiologicalMechanism:
      "Profound blockade of dopamine D2 receptors in the nigrostriatal tract (producing severe muscle rigidity) and the preoptic anterior hypothalamus (producing thermoregulatory failure and uncontrolled hyperthermia), compounded by sympathoadrenal hyperactivity.",
  };
}

/**
 * Diagnostic input for Anticholinergic Toxidrome.
 */
export interface AnticholinergicInput {
  anticholinergicExposure: boolean; // Atropine, diphenhydramine, TCAs, benztropine, oxybutynin, etc.
  mydriasis: boolean; // Blind as a bat
  deliriumOrAgitation: boolean; // Mad as a hatter
  flushing: boolean; // Red as a beet
  hyperthermia: boolean; // Hot as a hare
  anhidrosis: boolean; // Dry as a bone (dry axillae & skin)
  urinaryRetentionOrHypoactiveBowel: boolean; // Full as a flask
  tachycardia: boolean;
  tcaIngestionOrWideQrsOrAvBlock: boolean;
}

export interface AnticholinergicResult {
  meetsAnticholinergicToxidrome: boolean;
  mnemonicFeaturesPresent: {
    batMydriasis: boolean;
    hatterDelirium: boolean;
    beetFlushing: boolean;
    hareHyperthermia: boolean;
    boneAnhidrosis: boolean;
    flaskRetention: boolean;
  };
  criticalDiscriminatorVsSsAndNms: string;
  physostigmineSuitability: {
    isCandidate: boolean;
    contraindicationWarning: string;
    protocolSummary: string;
  };
  molecularMechanism: string;
}

/**
 * Evaluates Anticholinergic Toxidrome features and Physostigmine safety.
 */
export function evaluateAnticholinergicToxidrome(input: AnticholinergicInput): AnticholinergicResult {
  const mnemonicCount = [
    input.mydriasis,
    input.deliriumOrAgitation,
    input.flushing,
    input.hyperthermia,
    input.anhidrosis,
    input.urinaryRetentionOrHypoactiveBowel,
  ].filter(Boolean).length;

  const meets = input.anticholinergicExposure && mnemonicCount >= 3 && input.anhidrosis;

  const isCandidate =
    meets &&
    input.deliriumOrAgitation &&
    !input.tcaIngestionOrWideQrsOrAvBlock;

  const contraindicationWarning = input.tcaIngestionOrWideQrsOrAvBlock
    ? "ABSOLUTE CONTRAINDICATION: Physostigmine is strictly contraindicated in Tricyclic Antidepressant (TCA) toxicity, wide QRS (> 100 ms), PR prolongation, or AV block. Administration precipitates refractory asystolic cardiac arrest, severe bradyarrhythmias, and intractable seizures!"
    : "Safe physostigmine administration requires a baseline 12-lead ECG confirming normal QRS width (< 100 ms) and absence of AV conduction block. Atropine must be at bedside.";

  return {
    meetsAnticholinergicToxidrome: meets,
    mnemonicFeaturesPresent: {
      batMydriasis: input.mydriasis,
      hatterDelirium: input.deliriumOrAgitation,
      beetFlushing: input.flushing,
      hareHyperthermia: input.hyperthermia,
      boneAnhidrosis: input.anhidrosis,
      flaskRetention: input.urinaryRetentionOrHypoactiveBowel,
    },
    criticalDiscriminatorVsSsAndNms:
      "CRITICAL PHYSICAL EXAM DIFFERENTIATOR: Anticholinergic toxicity produces ANHIDROSIS (completely dry skin, dry axillae, dry oral mucosa) due to peripheral M3 muscarinic sweat gland blockade. In contrast, Serotonin Syndrome and NMS produce marked DIAPHORESIS (profuse drenching sweats, clammy/moist skin). Examination of the axillae is the fastest bedside differentiator.",
    physostigmineSuitability: {
      isCandidate,
      contraindicationWarning,
      protocolSummary:
        "Physostigmine salicylate (tertiary amine AChE inhibitor crossing the blood-brain barrier): Administer 0.5 mg to 2.0 mg IV slowly over 5 minutes with continuous cardiac monitoring. Reverses central delirium and peripheral anticholinergic signs within 15-30 minutes. Rapid push causes severe cholinergic bradycardia or bronchospasm.",
    },
    molecularMechanism:
      "Competitive blockade of central and peripheral muscarinic acetylcholine receptors (M1 through M5), abolishing parasympathetic tone and hypothalamic cholinergic cooling.",
  };
}

/**
 * Diagnostic input for Malignant Hyperthermia (MH).
 */
export interface MhInput {
  volatileAnestheticOrSuccinylcholineExposure: boolean;
  masseterSpasmOrRigidity: boolean;
  rapidEndTidalCo2Rise: boolean;
  hyperthermia: boolean;
  sinusTachycardia: boolean;
  metabolicAcidosis: boolean;
}

export interface MhResult {
  isLikelyMh: boolean;
  molecularEtiology: string;
  antidoteDantroleneGuidance: string;
  clinicalPresentation: string;
}

export function evaluateMalignantHyperthermia(input: MhInput): MhResult {
  const isLikely =
    input.volatileAnestheticOrSuccinylcholineExposure &&
    (input.rapidEndTidalCo2Rise || input.masseterSpasmOrRigidity) &&
    (input.hyperthermia || input.metabolicAcidosis);

  return {
    isLikelyMh: isLikely,
    molecularEtiology:
      "Autosomal dominant pharmacogenetic mutation in the skeletal muscle ryanodine receptor gene (RYR1, 80%) or alpha-1S calcium channel (CACNA1S). Exposure to halogenated volatile anesthetics (sevoflurane, desflurane, isoflurane) or succinylcholine triggers uncontrolled sarcoplasmic reticulum calcium efflux into myoplasm.",
    antidoteDantroleneGuidance:
      "Immediately discontinue triggering agents, hyperventilate with 100% O2 via charcoal filters. Administer Dantrolene Sodium (Dantrium/Revonto 2.5 mg/kg IV push, or Ryanodex 2.5 mg/kg IV single vial) repeated every 5-10 minutes up to 10 mg/kg until hypermetabolic signs cease.",
    clinicalPresentation:
      "Earliest sign is an exponential, unexplained rise in End-Tidal CO2 (ETCO2) refractory to hyperventilation, followed by masseter spasm, tachycardia, and explosive hyperthermia (can rise > 1.0°C every 5 minutes up to > 43.0°C).",
  };
}

/**
 * Side-by-side comparative differentiator across the 4 major neuro-emergencies.
 */
export interface NeuroEmergencyDifferentiatorRow {
  entity: string;
  causativeAgents: string;
  onsetSpeed: string;
  neuromuscularTone: string;
  reflexesAndClonus: string;
  skinMoisture: string;
  pupils: string;
  bowelSounds: string;
  hallmarkLabs: string;
  primaryAntidote: string;
}

export const NEURO_EMERGENCY_COMPARISON_MATRIX: readonly NeuroEmergencyDifferentiatorRow[] = [
  {
    entity: "Serotonin Syndrome (SS)",
    causativeAgents: "SSRIs, SNRIs, MAOIs, TCAs, triptans, tramadol, linezolid, dextromethorphan, MDMA",
    onsetSpeed: "Acute & rapid: < 6 to 24 hours post-dose or polypharmacy",
    neuromuscularTone: "Hypertonia with lower-extremity predominance; rigidity mild to moderate",
    reflexesAndClonus: "Marked hyperreflexia (patellar/Achilles) + Spontaneous, Inducible, or Ocular Clonus",
    skinMoisture: "Profuse diaphoresis (clammy, drenched skin)",
    pupils: "Mydriasis (dilated, reactive) with ocular clonus",
    bowelSounds: "Hyperactive bowel sounds with abdominal cramping and diarrhea",
    hallmarkLabs: "Mild CPK elevation, metabolic acidosis in severe cases; generally non-specific",
    primaryAntidote: "5-HT2A antagonist Cyproheptadine (12 mg load, 2 mg q2h, 8 mg q6h) + Benzodiazepines; AVOID antipyretics",
  },
  {
    entity: "Neuroleptic Malignant Syndrome (NMS)",
    causativeAgents: "Dopamine antagonists (haloperidol, fluphenazine, metoclopramide, promethazine, atypicals)",
    onsetSpeed: "Insidious & subacute: 24 to 72 hours, up to 1-2 weeks",
    neuromuscularTone: "Severe generalized 'lead-pipe' rigidity throughout full range of motion",
    reflexesAndClonus: "Hyporeflexia or normal reflexes; clonus is ABSENT",
    skinMoisture: "Profuse diaphoresis (pale, drenching sweat)",
    pupils: "Normal / unremarkable pupils; no ocular clonus",
    bowelSounds: "Normal to hypoactive bowel sounds",
    hallmarkLabs: "Massive CPK elevation (> 1,000 to > 50,000 IU/L), leukocytosis (WBC 10,000-40,000/µL), myoglobinuria",
    primaryAntidote: "D2 agonist Bromocriptine (2.5-5 mg tid) + Ryanodine blocker Dantrolene (1-2.5 mg/kg IV) + Amantadine",
  },
  {
    entity: "Anticholinergic Toxidrome",
    causativeAgents: "Atropine, diphenhydramine, TCAs, benztropine, oxybutynin, quetiapine, scopolamine, Datura",
    onsetSpeed: "Acute to subacute: 1 to 4 hours post ingestion",
    neuromuscularTone: "Variable tone; myoclonus, choreoathetosis, purposeless picking movements (carphologia)",
    reflexesAndClonus: "Normal or mildly decreased reflexes; clonus is ABSENT",
    skinMoisture: "ANHIDROSIS: bone dry skin, dry axillae, dry oral mucosa (fastest discriminator!)",
    pupils: "Marked mydriasis (wide, poorly reactive) with loss of visual accommodation",
    bowelSounds: "Hypoactive or completely absent bowel sounds; urinary retention",
    hallmarkLabs: "Usually normal CPK; sinus tachycardia on ECG; check QRS for TCA toxicity",
    primaryAntidote: "Physostigmine (0.5-2 mg slow IV over 5 min); ABSOLUTELY CONTRAINDICATED if TCA / wide QRS / AV block",
  },
  {
    entity: "Malignant Hyperthermia (MH)",
    causativeAgents: "Halogenated volatile anesthetics (sevoflurane, desflurane, isoflurane) or succinylcholine",
    onsetSpeed: "Immediate intraoperative or early post-anesthesia: minutes to hours",
    neuromuscularTone: "Severe generalized muscle rigidity; masseter muscle spasm",
    reflexesAndClonus: "Rigid extremities; no clonus",
    skinMoisture: "Mottled, cyanotic skin, variable sweating",
    pupils: "Unremarkable to sluggish",
    bowelSounds: "Decreased / absent in surgical setting",
    hallmarkLabs: "Explosive surge in End-Tidal CO2, severe lactic/respiratory acidosis, profound hyperkalemia, extreme CPK",
    primaryAntidote: "Dantrolene Sodium (2.5 mg/kg IV bolus, up to 10 mg/kg) + hyperventilation 100% O2",
  },
];

/* ========================================================================== */
/* SECTION 3: CLOZAPINE HIGH-RISK TDM, REMS & KINETIC HAZARDS                 */
/* ========================================================================== */

/**
 * Absolute Neutrophil Count (ANC) evaluation per FDA Clozapine REMS Program.
 */
export type ClozapineAncStatus =
  | "normal"
  | "mild-neutropenia"
  | "moderate-neutropenia"
  | "severe-agranulocytosis";

export interface ClozapineAncEvaluation {
  ancValuePerUl: number;
  isBen: boolean;
  status: ClozapineAncStatus;
  canInitiateOrContinue: boolean;
  monitoringFrequency: string;
  clinicalActionDirective: string;
  hematologyConsultRequired: boolean;
  rechallengePermitted: boolean;
  remsThresholdDescription: string;
}

/**
 * Evaluates ANC monitoring rules under FDA Clozapine REMS:
 * - General Population:
 *     ANC >= 1,500/uL: Normal
 *     ANC 1,000 - 1,499/uL: Mild neutropenia (continue clozapine, ANC 3x/week)
 *     ANC 500 - 999/uL: Moderate neutropenia (interrupt clozapine, daily ANC, hematology consult)
 *     ANC < 500/uL: Severe agranulocytosis (permanent cessation, do not rechallenge, daily ANC)
 * - Benign Ethnic Neutropenia (BEN):
 *     ANC >= 1,000/uL: Normal for BEN
 *     ANC 500 - 999/uL: Mild neutropenia for BEN (continue clozapine, ANC 3x/week)
 *     ANC < 500/uL: Severe agranulocytosis (permanent cessation, do not rechallenge, daily ANC)
 */
export function evaluateClozapineAnc(
  ancValuePerUl: number,
  isBen: boolean = false,
): ClozapineAncEvaluation {
  const anc = Math.max(0, Math.round(ancValuePerUl));

  if (!isBen) {
    if (anc >= 1500) {
      return {
        ancValuePerUl: anc,
        isBen: false,
        status: "normal",
        canInitiateOrContinue: true,
        monitoringFrequency:
          "Standard REMS schedule: Weekly for weeks 1-26, every 2 weeks for weeks 27-52, then every 4 weeks indefinitely.",
        clinicalActionDirective: "Eligible to initiate or continue clozapine therapy. Maintain routine REMS surveillance.",
        hematologyConsultRequired: false,
        rechallengePermitted: true,
        remsThresholdDescription: "General Population: Normal ANC (threshold >= 1,500 / µL).",
      };
    } else if (anc >= 1000) {
      return {
        ancValuePerUl: anc,
        isBen: false,
        status: "mild-neutropenia",
        canInitiateOrContinue: true,
        monitoringFrequency: "Three times weekly until ANC >= 1,500 / µL.",
        clinicalActionDirective:
          "Continue clozapine therapy under intensified monitoring. Order ANC three times weekly until ANC returns to >= 1,500 / µL, then resume regular monitoring schedule.",
        hematologyConsultRequired: false,
        rechallengePermitted: true,
        remsThresholdDescription: "General Population: Mild Neutropenia (ANC 1,000 to 1,499 / µL).",
      };
    } else if (anc >= 500) {
      return {
        ancValuePerUl: anc,
        isBen: false,
        status: "moderate-neutropenia",
        canInitiateOrContinue: false,
        monitoringFrequency: "Daily until ANC >= 1,000 / µL, then three times weekly until >= 1,500 / µL.",
        clinicalActionDirective:
          "Interrupt clozapine therapy immediately. Consult hematology. Monitor ANC daily until ANC >= 1,000 / µL, then three times weekly until >= 1,500 / µL. Do not rechallenge unless prescriber and hematologist determine that benefits clearly outweigh the risk of recurrent neutropenia.",
        hematologyConsultRequired: true,
        rechallengePermitted: false,
        remsThresholdDescription: "General Population: Moderate Neutropenia (ANC 500 to 999 / µL).",
      };
    } else {
      return {
        ancValuePerUl: anc,
        isBen: false,
        status: "severe-agranulocytosis",
        canInitiateOrContinue: false,
        monitoringFrequency: "Daily until ANC >= 1,500 / µL and clinical recovery from infection risk.",
        clinicalActionDirective:
          "IMMEDIATE PERMANENT CLOZAPINE CESSATION. Immediate hematology consultation. Patient must NEVER be rechallenged with clozapine. Strict protective isolation / infection precautions. Institute broad-spectrum empiric antibiotics if febrile (febrile neutropenia protocol). Consider G-CSF (filgrastim) in consultation with hematologist.",
        hematologyConsultRequired: true,
        rechallengePermitted: false,
        remsThresholdDescription: "General Population: Severe Agranulocytosis (ANC < 500 / µL) - Black Box Warning.",
      };
    }
  } else {
    // Benign Ethnic Neutropenia (BEN)
    if (anc >= 1000) {
      return {
        ancValuePerUl: anc,
        isBen: true,
        status: "normal",
        canInitiateOrContinue: true,
        monitoringFrequency:
          "BEN REMS schedule: Weekly for weeks 1-26, every 2 weeks for weeks 27-52, then every 4 weeks indefinitely.",
        clinicalActionDirective:
          "Eligible to initiate or continue clozapine therapy under BEN baseline criteria (>= 1,000 / µL).",
        hematologyConsultRequired: false,
        rechallengePermitted: true,
        remsThresholdDescription: "Benign Ethnic Neutropenia (BEN): Normal baseline (threshold >= 1,000 / µL).",
      };
    } else if (anc >= 500) {
      return {
        ancValuePerUl: anc,
        isBen: true,
        status: "mild-neutropenia",
        canInitiateOrContinue: true,
        monitoringFrequency: "Three times weekly until ANC >= 1,000 / µL.",
        clinicalActionDirective:
          "Continue clozapine therapy under intensified monitoring. Order ANC three times weekly until ANC returns to >= 1,000 / µL, then resume regular BEN monitoring schedule.",
        hematologyConsultRequired: false,
        rechallengePermitted: true,
        remsThresholdDescription: "BEN: Mild Neutropenia for BEN (ANC 500 to 999 / µL).",
      };
    } else {
      return {
        ancValuePerUl: anc,
        isBen: true,
        status: "severe-agranulocytosis",
        canInitiateOrContinue: false,
        monitoringFrequency: "Daily until ANC >= 1,000 / µL and clinical recovery from infection risk.",
        clinicalActionDirective:
          "IMMEDIATE PERMANENT CLOZAPINE CESSATION. Immediate hematology consultation. Patient must NEVER be rechallenged with clozapine. Strict infection precautions; consider G-CSF.",
        hematologyConsultRequired: true,
        rechallengePermitted: false,
        remsThresholdDescription: "BEN: Severe Agranulocytosis (ANC < 500 / µL) - Black Box Warning.",
      };
    }
  }
}

/**
 * Tobacco smoke CYP1A2 induction vs smoking cessation kinetic simulator input.
 */
export interface ClozapineTobaccoInput {
  currentDailyDoseMg: number; // e.g., 400 mg
  isSmokingTobacco: boolean;
  cigarettesPerDay?: number; // e.g., 15-20 cigs/day
  scenario: "smoker-steady" | "cessation-acute" | "resumption-acute" | "nonsmoker-steady";
  daysPostChange?: number; // 0 to 14 days
  knownSmokerSerumLevelNgMl?: number; // Optional baseline trough level, e.g. 450 ng/mL
}

export interface ClozapineTobaccoResult {
  scenario: ClozapineTobaccoInput["scenario"];
  cyp1a2InductionRatio: number; // e.g., 1.50 in heavy smoker vs 1.00 in non-smoker
  relativeClearance: number;
  projectedSerumConcentrationNgMl: number;
  projectedConcentrationChangePercent: number;
  toxicityRiskTier: "therapeutic-window" | "elevated-seizure-risk" | "critical-toxicity" | "subtherapeutic-relapse";
  clinicalHazards: string[];
  recommendedDoseAdjustmentMg: number;
  proactiveManagementPlan: string;
  nicotineReplacementEducation: string;
}

/**
 * Models the paradoxical surge in clozapine concentrations upon smoking cessation,
 * and the precipitous plunge in levels upon smoking resumption.
 *
 * Molecular Pharmacokinetics:
 * - Polycyclic aromatic hydrocarbons (PAHs) in burning tobacco smoke (benzopyrenes, anthracene)
 *   bind the Aryl Hydrocarbon Receptor (AhR), inducing hepatic CYP1A2 gene transcription.
 * - Nicotine does NOT induce CYP1A2! Switching to nicotine patches, gum, or e-cigarettes
 *   stops PAH delivery and results in complete CYP1A2 de-induction.
 * - Heavy smoking (>= 7-10 cigarettes/day) induces CYP1A2 clearance by approximately 50%
 *   (clearance ratio ~ 1.50).
 * - Upon smoking cessation (e.g., inpatient smoke-free psychiatric unit admission),
 *   CYP1A2 de-induction occurs as induced enzymes degrade (half-life ~38 hours),
 *   resolving over 3 to 7 days.
 * - Clearance drops by ~33% (from 1.5x down to 1.0x), causing serum clozapine concentrations
 *   to surge by 50% to 100% (+50% to +100%) for the same oral dose!
 * - Levels surging above 1,000 ng/mL dramatically elevate risk of grand mal seizures,
 *   severe sedation, toxic myocarditis, and aspiration pneumonia.
 */
export function modelClozapineTobaccoKinetics(input: ClozapineTobaccoInput): ClozapineTobaccoResult {
  const dose = Math.max(25, input.currentDailyDoseMg);
  const cigs = Math.max(0, input.cigarettesPerDay ?? (input.isSmokingTobacco ? 15 : 0));
  const days = Math.max(0, input.daysPostChange ?? 0);

  // Approximate baseline serum level if not provided (rule of thumb: ~1.0-1.2 ng/mL per mg in non-smoker, ~0.7-0.8 in smoker)
  const defaultSmokerRatio = 0.8;
  const defaultNonSmokerRatio = 1.3;

  let baselineLevel = input.knownSmokerSerumLevelNgMl;
  if (!baselineLevel || baselineLevel <= 0) {
    baselineLevel = input.isSmokingTobacco ? dose * defaultSmokerRatio : dose * defaultNonSmokerRatio;
  }

  // Max PAH induction in heavy smokers is ~1.5x normal CYP1A2 clearance
  const maxInductionFactor = cigs >= 10 ? 1.5 : 1.0 + (cigs / 10) * 0.5;

  let cyp1a2InductionRatio = 1.0;
  let relativeClearance = 1.0;
  let projectedSerumLevel = baselineLevel;
  let pctChange = 0;
  let recommendedDose = dose;

  if (input.scenario === "smoker-steady") {
    cyp1a2InductionRatio = maxInductionFactor;
    relativeClearance = maxInductionFactor;
    projectedSerumLevel = baselineLevel;
    pctChange = 0;
    recommendedDose = dose;
  } else if (input.scenario === "nonsmoker-steady") {
    cyp1a2InductionRatio = 1.0;
    relativeClearance = 1.0;
    projectedSerumLevel = baselineLevel;
    pctChange = 0;
    recommendedDose = dose;
  } else if (input.scenario === "cessation-acute") {
    // Smoking cessation: enzyme de-induction over 3-7 days (CYP1A2 protein degradation t1/2 ~ 36-38h / 1.5 days)
    const decayFraction = days >= 7 ? 0 : Math.exp(-0.693 * (days / 1.5));
    cyp1a2InductionRatio = 1.0 + (maxInductionFactor - 1.0) * decayFraction;
    relativeClearance = cyp1a2InductionRatio;

    // Steady-state concentration is inversely proportional to clearance:
    // Css_new = Css_baseline * (Clearance_baseline / Clearance_new)
    const clearanceRatio = maxInductionFactor / cyp1a2InductionRatio;
    projectedSerumLevel = Math.round(baselineLevel * clearanceRatio);
    pctChange = Math.round(((projectedSerumLevel - baselineLevel) / baselineLevel) * 100);

    // Recommended dose adjustment to maintain baseline target level:
    recommendedDose = Math.round((dose / maxInductionFactor) * 25) / 25; // Reduce by ~33%
  } else if (input.scenario === "resumption-acute") {
    // Resuming smoking: enzyme induction rises over 7-14 days
    const riseFraction = 1.0 - Math.exp(-0.693 * (days / 4.0));
    cyp1a2InductionRatio = 1.0 + (maxInductionFactor - 1.0) * riseFraction;
    relativeClearance = cyp1a2InductionRatio;

    // Levels plummet as clearance increases
    projectedSerumLevel = Math.round(baselineLevel / cyp1a2InductionRatio);
    pctChange = Math.round(((projectedSerumLevel - baselineLevel) / baselineLevel) * 100);
    recommendedDose = Math.round(dose * maxInductionFactor * 25) / 25;
  }

  // Toxicity risk stratification
  let riskTier: ClozapineTobaccoResult["toxicityRiskTier"] = "therapeutic-window";
  const hazards: string[] = [];

  if (projectedSerumLevel > 1000) {
    riskTier = "critical-toxicity";
    hazards.push("CRITICAL SEIZURE HAZARD: Serum clozapine > 1,000 ng/mL dramatically elevates grand mal seizure frequency (EEG paroxysmal spike-wave discharges).");
    hazards.push("SEVERE SEDATION & ASPIRATION RISK: Somnolence and pharyngeal dysmotility increase aspiration pneumonia risk.");
    hazards.push("MYOCARDITIS & CARDIOTOXICITY: Concentration spikes increase toxic tachycardia and myocarditis risk.");
  } else if (projectedSerumLevel > 700) {
    riskTier = "elevated-seizure-risk";
    hazards.push("ELEVATED TOXICITY RISK: Serum level exceeds standard therapeutic window (350-600 ng/mL). Monitor for ataxia, confusion, and tremor.");
  } else if (projectedSerumLevel < 350 && input.scenario === "resumption-acute") {
    riskTier = "subtherapeutic-relapse";
    hazards.push("PSYCHOTIC RELAPSE RISK: Serum level dropped below therapeutic threshold (350 ng/mL) due to rapid tobacco CYP1A2 induction.");
  } else {
    riskTier = "therapeutic-window";
  }

  return {
    scenario: input.scenario,
    cyp1a2InductionRatio: Math.round(cyp1a2InductionRatio * 100) / 100,
    relativeClearance: Math.round(relativeClearance * 100) / 100,
    projectedSerumConcentrationNgMl: projectedSerumLevel,
    projectedConcentrationChangePercent: pctChange,
    toxicityRiskTier: riskTier,
    clinicalHazards: hazards,
    recommendedDoseAdjustmentMg: Math.round(recommendedDose),
    proactiveManagementPlan:
      input.scenario === "cessation-acute"
        ? `Upon abrupt smoking cessation (e.g., inpatient smoke-free psychiatric unit admission), proactively reduce the daily clozapine dose by 30% to 40% (target dose ~${Math.round(recommendedDose)} mg/day) over 3 to 5 days. Order a trough serum clozapine and norclozapine level at day 3 to 5 to guide further titration.`
        : input.scenario === "resumption-acute"
          ? `Upon discharge and resumption of smoking, expect clozapine levels to decline by 30% to 50% over 1 to 2 weeks. Closely monitor for psychotic decompensation and consider pre-emptive dose escalation to ~${Math.round(recommendedDose)} mg/day with repeat TDM.`
          : "Maintain current dose and regular TDM schedule while smoking status remains constant.",
    nicotineReplacementEducation:
      "CRITICAL CLINICAL PEARL: Polycyclic aromatic hydrocarbons (PAHs) in burning plant matter induce CYP1A2; NICOTINE DOES NOT. Nicotine transdermal patches, gums, lozenges, and electronic cigarettes (vaping) do NOT contain PAHs and will NOT prevent the 50%-100% clozapine concentration surge when a patient stops smoking cigarettes!",
  };
}

/**
 * Clozapine-Induced Gastrointestinal Hypomotility (CIGH) evaluation.
 */
export interface CighRiskFactors {
  hasClozapine: boolean;
  concurrentAnticholinergicAgents: string[];
  concurrentOpioid: boolean;
  ageYears: number;
  constipationReported: boolean;
  bowelMovementAbsenceDays: number;
}

export interface CighEvaluation {
  riskScore: "critical" | "high" | "moderate" | "standard";
  mortalityWarning: string;
  pathophysiologicalMechanism: string;
  mandatedProactiveInterventions: string[];
  diagnosticRedFlags: string[];
}

export function evaluateCighRisk(factors: CighRiskFactors): CighEvaluation {
  if (!factors.hasClozapine) {
    return {
      riskScore: "standard",
      mortalityWarning: "Patient is not taking clozapine.",
      pathophysiologicalMechanism: "Not applicable.",
      mandatedProactiveInterventions: [],
      diagnosticRedFlags: [],
    };
  }

  let score = 0;
  if (factors.concurrentAnticholinergicAgents.length > 0) score += 2;
  if (factors.concurrentOpioid) score += 2;
  if (factors.ageYears >= 65) score += 1;
  if (factors.constipationReported) score += 2;
  if (factors.bowelMovementAbsenceDays >= 3) score += 4;
  else if (factors.bowelMovementAbsenceDays >= 2) score += 2;

  let riskTier: CighEvaluation["riskScore"] = "moderate";
  if (score >= 5 || factors.bowelMovementAbsenceDays >= 3) {
    riskTier = "critical";
  } else if (score >= 3 || factors.bowelMovementAbsenceDays >= 2) {
    riskTier = "high";
  }

  return {
    riskScore: riskTier,
    mortalityWarning:
      "CRITICAL MORTALITY PEARL: Case fatality from Clozapine-Induced Gastrointestinal Hypomotility (CIGH, 15% to 27%) and absolute mortality from CIGH EXCEED the mortality from clozapine-induced agranulocytosis! CIGH can progress silently from mild constipation to fecal impaction, stercoral ulceration, megacolon, bowel ischemia, perforation, and fatal septic peritonitis.",
    pathophysiologicalMechanism:
      "Clozapine exerts potent, high-affinity antagonism across muscarinic acetylcholine receptors (M1-M5), serotonin 5-HT3 receptors, and histamine H1 receptors in the enteric nervous system, quadrupling colonic transit time from ~24 hours up to > 100 hours.",
    mandatedProactiveInterventions: [
      "Initiate a proactive bowel regimen on Day 1 of clozapine initiation (do not wait for constipation symptoms to develop).",
      "Osmotic laxative of choice: Polyethylene glycol 3350 (MiraLAX) 17 g daily.",
      "Stimulant laxative: Senna 8.6-17.2 mg nightly as adjunctive agent.",
      "High fluid intake (>= 2 L/day). Avoid bulk-forming fiber laxatives (psyllium) without adequate hydration, as they worsen impaction.",
      "Avoid stacking additional anticholinergic agents (benztropine, diphenhydramine, TCAs) unless strictly unavoidable.",
    ],
    diagnosticRedFlags: [
      "Absence of bowel movement for >= 48 hours requires immediate active intervention.",
      "Abdominal distension, severe pain, nausea, vomiting, or overflow 'diarrhea' around an impaction warrants urgent physical exam and abdominal imaging (KUB / CT abdomen) to rule out toxic megacolon or ileus.",
    ],
  };
}

/**
 * Evaluates strong CYP1A2 inhibitor collisions with Clozapine.
 */
export interface ClozapineCollisionAlert {
  interactingDrugId: string;
  interactingDrugName: string;
  collisionSeverity: "contraindicated" | "major";
  magnitudeFoldIncrease: string;
  mechanism: string;
  clinicalAction: string;
}

export function detectClozapine1a2Collisions(drugIds: string[]): ClozapineCollisionAlert[] {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  const hasClozapine = normalized.some((id) => id === "clozapine" || id === "clozaril");
  if (!hasClozapine) return [];

  const alerts: ClozapineCollisionAlert[] = [];

  for (const id of normalized) {
    if (id === "fluvoxamine" || id === "luvox") {
      alerts.push({
        interactingDrugId: id,
        interactingDrugName: "Fluvoxamine",
        collisionSeverity: "contraindicated",
        magnitudeFoldIncrease: "2-fold to 5-fold (up to 10-fold in CYP2D6/2C19 poor metabolizers)",
        mechanism:
          "Potent hepatic CYP1A2 inhibition (plus CYP2C19, 3A4, 2C9 inhibition). Clozapine clearance is severely blocked, causing massive accumulation of clozapine and norclozapine.",
        clinicalAction:
          "FDA LABELED CONTRAINDICATION / CRITICAL COLLISION: Concomitant use is generally avoided. If co-administration is clinically mandatory, clozapine daily dose must be pre-emptively reduced by 67% to 75% with intensive TDM monitoring for grand mal seizures and sedation.",
      });
    }

    if (id === "ciprofloxacin" || id === "cipro") {
      alerts.push({
        interactingDrugId: id,
        interactingDrugName: "Ciprofloxacin",
        collisionSeverity: "major",
        magnitudeFoldIncrease: "2-fold to 3-fold increase in serum clozapine AUC and peak concentrations",
        mechanism:
          "Strong fluoroquinolone CYP1A2 inhibition. Blocks clozapine N-demethylation, resulting in rapid clozapine accumulation.",
        clinicalAction:
          "MAJOR CLINICAL COLLISION: Pre-emptively reduce clozapine dose by 50% or choose an alternative non-inhibitory antimicrobial (e.g., levofloxacin, ceftriaxone). Monitor clozapine serum concentrations and watch for excessive sedation or seizures.",
      });
    }
  }

  return alerts;
}

/* ========================================================================== */
/* SECTION 4: ANTIDEPRESSANT DISCONTINUATION & CROSS-TAPERING KINETICS        */
/* ========================================================================== */

export type FinishRiskTier = "extreme" | "high" | "moderate" | "low-auto-taper";

export interface AntidepressantKineticProfile {
  id: string;
  name: string;
  parentHalfLifeHours: number;
  activeMetaboliteHalfLifeHours: number | null;
  activeMetaboliteName: string | null;
  effectiveHalfLifeDescription: string;
  finishRiskTier: FinishRiskTier;
  anticholinergicReboundRisk: boolean;
  washoutRequiredBeforeMaoiDays: number;
  washoutRequiredAfterMaoiDays: number;
  clinicalPearls: string;
}

export const ANTIDEPRESSANT_KINETICS_REGISTRY: Record<string, AntidepressantKineticProfile> = {
  paroxetine: {
    id: "paroxetine",
    name: "Paroxetine (Paxil)",
    parentHalfLifeHours: 21,
    activeMetaboliteHalfLifeHours: null,
    activeMetaboliteName: null,
    effectiveHalfLifeDescription: "~21 hours; non-linear pharmacokinetics (autoinhibits CYP2D6)",
    finishRiskTier: "extreme",
    anticholinergicReboundRisk: true,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "Extreme FINISH discontinuation risk due to short half-life and potent anticholinergic rebound (muscarinic receptor upregulation). Requires slow, hyperbolic tapering over weeks to months, or fluoxetine bridging.",
  },
  venlafaxine: {
    id: "venlafaxine",
    name: "Venlafaxine (Effexor)",
    parentHalfLifeHours: 5,
    activeMetaboliteHalfLifeHours: 11,
    activeMetaboliteName: "O-desmethylvenlafaxine (ODV)",
    effectiveHalfLifeDescription: "Parent ~5h, active metabolite ODV ~11h",
    finishRiskTier: "extreme",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "Extreme FINISH risk. Discontinuation symptoms (severe brain zaps, nausea, vertigo) can emerge within hours of a single delayed dose. Requires micro-tapering or low-dose fluoxetine bridging.",
  },
  "venlafaxine-xr": {
    id: "venlafaxine-xr",
    name: "Venlafaxine XR (Effexor XR)",
    parentHalfLifeHours: 5,
    activeMetaboliteHalfLifeHours: 11,
    activeMetaboliteName: "O-desmethylvenlafaxine (ODV)",
    effectiveHalfLifeDescription: "Absorption extended, elimination kinetics unchanged (parent 5h, ODV 11h)",
    finishRiskTier: "extreme",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "Extreme FINISH risk. Extended release formulation delays gastrointestinal absorption but elimination half-life remains ultra-short.",
  },
  desvenlafaxine: {
    id: "desvenlafaxine",
    name: "Desvenlafaxine (Pristiq)",
    parentHalfLifeHours: 11,
    activeMetaboliteHalfLifeHours: null,
    activeMetaboliteName: null,
    effectiveHalfLifeDescription: "~11 hours",
    finishRiskTier: "high",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls: "High discontinuation risk comparable to parent venlafaxine.",
  },
  duloxetine: {
    id: "duloxetine",
    name: "Duloxetine (Cymbalta)",
    parentHalfLifeHours: 12,
    activeMetaboliteHalfLifeHours: null,
    activeMetaboliteName: null,
    effectiveHalfLifeDescription: "~12 hours",
    finishRiskTier: "high",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "High discontinuation risk. Short elimination half-life leads to rapid drop in dual serotonin/norepinephrine reuptake inhibition.",
  },
  sertraline: {
    id: "sertraline",
    name: "Sertraline (Zoloft)",
    parentHalfLifeHours: 26,
    activeMetaboliteHalfLifeHours: 66,
    activeMetaboliteName: "N-desmethylsertraline (weakly active)",
    effectiveHalfLifeDescription: "Parent ~26h, weak metabolite ~66h",
    finishRiskTier: "moderate",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "Moderate discontinuation risk. Intermediate half-life typically allows standard step-down tapering over 2 to 4 weeks.",
  },
  escitalopram: {
    id: "escitalopram",
    name: "Escitalopram (Lexapro)",
    parentHalfLifeHours: 30,
    activeMetaboliteHalfLifeHours: null,
    activeMetaboliteName: null,
    effectiveHalfLifeDescription: "~27-32 hours",
    finishRiskTier: "moderate",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls: "Moderate discontinuation risk. Standard 2 to 4 week taper generally well tolerated.",
  },
  citalopram: {
    id: "citalopram",
    name: "Citalopram (Celexa)",
    parentHalfLifeHours: 35,
    activeMetaboliteHalfLifeHours: null,
    activeMetaboliteName: null,
    effectiveHalfLifeDescription: "~35 hours",
    finishRiskTier: "moderate",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls: "Moderate discontinuation risk. Racemic mixture with ~35h half-life.",
  },
  fluvoxamine: {
    id: "fluvoxamine",
    name: "Fluvoxamine (Luvox)",
    parentHalfLifeHours: 15,
    activeMetaboliteHalfLifeHours: null,
    activeMetaboliteName: null,
    effectiveHalfLifeDescription: "~15 hours",
    finishRiskTier: "high",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 14,
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "High discontinuation risk due to relatively short half-life (~15h). Potent CYP1A2/2C19 perpetrator.",
  },
  fluoxetine: {
    id: "fluoxetine",
    name: "Fluoxetine (Prozac)",
    parentHalfLifeHours: 72, // 2-4 days
    activeMetaboliteHalfLifeHours: 240, // 7-15 days (norfluoxetine)
    activeMetaboliteName: "Norfluoxetine (potent active SSRI metabolite)",
    effectiveHalfLifeDescription: "Parent 2-4 days (48-96h); Active Norfluoxetine 7-15 days (168-360h)",
    finishRiskTier: "low-auto-taper",
    anticholinergicReboundRisk: false,
    washoutRequiredBeforeMaoiDays: 35, // 5 weeks!
    washoutRequiredAfterMaoiDays: 14,
    clinicalPearls:
      "AUTOTAPERING PHENOMENON: Norfluoxetine half-life (up to 15 days) creates an intrinsic gradual taper, making FINISH withdrawal rare. MANDATORY WARNING: Requires a strict 5-WEEK (35 days) WASHOUT prior to starting an MAOI to avoid fatal Serotonin Syndrome!",
  },
};

/**
 * FINISH Syndrome evaluation.
 * Mnemonic:
 * F: Flu-like symptoms (fatigue, lethargy, headache, myalgias, diaphoresis)
 * I: Insomnia (vivid dreams, nightmares)
 * N: Nausea (vomiting, diarrhea, anorexia)
 * I: Imbalance (dizziness, vertigo, lightheadedness, ataxia)
 * S: Sensory disturbances (paresthesias, electric shock 'brain zaps', tinnitus)
 * H: Hyperarousal (anxiety, agitation, irritability, mood lability)
 */
export interface FinishSyndromeEvaluation {
  drugId: string;
  drugName: string;
  riskTier: FinishRiskTier;
  halfLifeHours: number;
  finishMnemonicDetails: {
    f: string;
    i1: string;
    n: string;
    i2: string;
    s: string;
    h: string;
  };
  clinicalTaperingRecommendation: string;
  fluoxetineBridgingCandidate: boolean;
}

export function evaluateFinishSyndromeRisk(
  drugId: string,
  abruptlyStopped: boolean = true,
): FinishSyndromeEvaluation | null {
  const normId = drugId.toLowerCase().trim();
  const profile = ANTIDEPRESSANT_KINETICS_REGISTRY[normId];
  if (!profile) return null;

  return {
    drugId: profile.id,
    drugName: profile.name,
    riskTier: profile.finishRiskTier,
    halfLifeHours: profile.parentHalfLifeHours,
    finishMnemonicDetails: {
      f: "Flu-like symptoms: systemic fatigue, headache, malaise, diffuse myalgias, arthralgias, diaphoresis",
      i1: "Insomnia: frequent awakenings, intense vivid dreaming, disruptive nightmares",
      n: "Nausea: anorexia, vomiting, abdominal cramping, loose stools",
      i2: "Imbalance: postural lightheadedness, episodic vertigo, ataxia, feeling unsteady",
      s: "Sensory disturbances: brief electric shock-like sensations traversing head and spine ('brain zaps'), paresthesias, tinnitus",
      h: "Hyperarousal: severe rebound anxiety, irritability, agitation, emotional lability, tearfulness",
    },
    clinicalTaperingRecommendation:
      profile.finishRiskTier === "extreme"
        ? `Extreme discontinuation risk (${profile.name}): Abrupt cessation precipitates rapid, severe FINISH syndrome. Recommend a slow, hyperbolic taper reducing dose by 10% to 25% every 2 to 4 weeks. If severe discontinuation symptoms occur, consider fluoxetine bridging (10-20 mg daily for 1-2 weeks, then stop).`
        : profile.finishRiskTier === "high"
          ? `High discontinuation risk (${profile.name}): Taper gradually over 4 to 8 weeks in stepwise decrements.`
          : profile.finishRiskTier === "moderate"
            ? `Moderate discontinuation risk (${profile.name}): Standard taper over 2 to 4 weeks is generally sufficient.`
            : `Low discontinuation risk (${profile.name}): Active norfluoxetine persists for weeks, effectively auto-tapering itself. Minimal risk of FINISH syndrome.`,
    fluoxetineBridgingCandidate: profile.finishRiskTier === "extreme" && abruptlyStopped,
  };
}

/**
 * Antidepressant cross-tapering and washout calculator.
 */
export interface CrossTaperRecommendation {
  fromDrugName: string;
  toDrugName: string;
  strategy: "direct-switch" | "cross-taper" | "mandatory-washout-maoi" | "fluoxetine-bridge";
  washoutDaysRequired: number;
  serotoninSyndromeRiskDuringTransition: "critical" | "high" | "moderate" | "low";
  scheduleSummary: string;
  contraindicationNotice?: string;
  stepByStepProtocol: string[];
}

export const MAOI_DRUG_IDS = new Set([
  "phenelzine",
  "nardil",
  "tranylcypromine",
  "parnate",
  "selegiline",
  "emsam",
  "isocarboxazid",
  "marplan",
  "rasagiline",
  "safinamide",
  "moclobemide",
]);

export function isMaoi(drugId: string): boolean {
  return MAOI_DRUG_IDS.has(drugId.toLowerCase().trim());
}

/**
 * Calculates evidence-based cross-tapering schedules and washout mandates.
 */
export function calculateAntidepressantCrossTaper(
  fromDrugId: string,
  toDrugId: string,
  currentDoseMg: number = 20,
): CrossTaperRecommendation {
  const normFrom = fromDrugId.toLowerCase().trim();
  const normTo = toDrugId.toLowerCase().trim();

  const fromName = DRUG_BY_ID[normFrom]?.name ?? normFrom;
  const toName = DRUG_BY_ID[normTo]?.name ?? normTo;

  const fromIsMaoi = isMaoi(normFrom);
  const toIsMaoi = isMaoi(normTo);

  // Scenario 1: Switching from Fluoxetine to an MAOI (MANDATORY 5-WEEK WASHOUT)
  if (normFrom === "fluoxetine" && toIsMaoi) {
    return {
      fromDrugName: fromName,
      toDrugName: toName,
      strategy: "mandatory-washout-maoi",
      washoutDaysRequired: 35, // 5 weeks
      serotoninSyndromeRiskDuringTransition: "critical",
      scheduleSummary:
        "MANDATORY 5-WEEK (35 DAYS) WASHOUT REQUIRED: Initiating an MAOI following fluoxetine without completing a full 5-week washout carries an extreme, potentially fatal risk of Serotonin Syndrome.",
      contraindicationNotice:
        "FDA BLACK BOX CONTRAINDICATION: Active norfluoxetine has a terminal elimination half-life of 7 to 15 days. Full 5 half-lives clearance requires 35 days (5 weeks). Concomitant monoamine oxidase inhibition while norfluoxetine is circulating produces lethal serotonin toxicity.",
      stepByStepProtocol: [
        "Day 0: Discontinue Fluoxetine completely.",
        "Days 1 to 35: Mandatory drug-free washout period (5 weeks). No serotonergic agents permitted.",
        "Day 36: Begin low-dose MAOI therapy under strict dietary tyramine restrictions and clinical monitoring.",
      ],
    };
  }

  // Scenario 2: Switching from other SSRI/SNRI to an MAOI (2-WEEK WASHOUT)
  if (!fromIsMaoi && toIsMaoi) {
    return {
      fromDrugName: fromName,
      toDrugName: toName,
      strategy: "mandatory-washout-maoi",
      washoutDaysRequired: 14,
      serotoninSyndromeRiskDuringTransition: "critical",
      scheduleSummary:
        "MANDATORY 14-DAY WASHOUT: Discontinue current antidepressant completely and wait a full 14 days before starting MAOI therapy.",
      contraindicationNotice:
        "FDA CONTRAINDICATION: Minimum 2-week washout is required to clear circulating SSRI/SNRI molecules and prevent fatal Serotonin Syndrome.",
      stepByStepProtocol: [
        "Day 0: Stop current SSRI/SNRI completely.",
        "Days 1 to 14: Complete 14-day drug-free washout period.",
        "Day 15: Initiate low-dose MAOI with dietary tyramine precautions.",
      ],
    };
  }

  // Scenario 3: Switching from MAOI to SSRI/SNRI (2-WEEK WASHOUT)
  if (fromIsMaoi && !toIsMaoi) {
    return {
      fromDrugName: fromName,
      toDrugName: toName,
      strategy: "mandatory-washout-maoi",
      washoutDaysRequired: 14,
      serotoninSyndromeRiskDuringTransition: "critical",
      scheduleSummary:
        "MANDATORY 14-DAY WASHOUT: Irreversible MAO inhibition requires 14 days for the body to synthesize new monoamine oxidase enzymes.",
      contraindicationNotice:
        "FDA CONTRAINDICATION: Introducing an SSRI/SNRI before MAO enzyme regeneration produces massive intrasynaptic serotonin accumulation and severe Serotonin Syndrome.",
      stepByStepProtocol: [
        "Day 0: Discontinue MAOI completely.",
        "Days 1 to 14: Maintain tyramine-restricted diet and allow de novo MAO synthesis over 14 days.",
        "Day 15: Initiate replacement antidepressant at a conservative starting dose.",
      ],
    };
  }

  // Scenario 4: Switching between non-MAOI antidepressants
  const fromProfile = ANTIDEPRESSANT_KINETICS_REGISTRY[normFrom];
  const isFromExtreme = fromProfile?.finishRiskTier === "extreme";

  if (isFromExtreme) {
    return {
      fromDrugName: fromName,
      toDrugName: toName,
      strategy: "cross-taper",
      washoutDaysRequired: 0,
      serotoninSyndromeRiskDuringTransition: "moderate",
      scheduleSummary:
        `Conservative 3- to 4-Week Cross-Taper: Due to extreme FINISH risk of ${fromName}, gradually step down the outgoing dose while slowly stepping up ${toName}.`,
      stepByStepProtocol: [
        `Week 1: Reduce ${fromName} to 75% of baseline dose (~${Math.round(currentDoseMg * 0.75)} mg). Begin ${toName} at 25% of target dose.`,
        `Week 2: Reduce ${fromName} to 50% of baseline dose (~${Math.round(currentDoseMg * 0.5)} mg). Increase ${toName} to 50% of target dose.`,
        `Week 3: Reduce ${fromName} to 25% of baseline dose (~${Math.round(currentDoseMg * 0.25)} mg). Increase ${toName} to 75% of target dose.`,
        `Week 4: Discontinue ${fromName} completely. Titrate ${toName} to full target therapeutic dose.`,
      ],
    };
  }

  // Standard cross-taper or direct switch
  return {
    fromDrugName: fromName,
    toDrugName: toName,
    strategy: "cross-taper",
    washoutDaysRequired: 0,
    serotoninSyndromeRiskDuringTransition: "low",
    scheduleSummary:
      `Standard 2-Week Cross-Taper: Cross-titrate ${fromName} and ${toName} concurrently over 14 days to minimize both discontinuation symptoms and adverse effects.`,
    stepByStepProtocol: [
      `Days 1 to 7: Halve the dose of ${fromName} (~${Math.round(currentDoseMg * 0.5)} mg). Start ${toName} at standard initial dose.`,
      `Days 8 to 14: Further reduce ${fromName} by half or discontinue. Titrate ${toName} to full therapeutic dose.`,
      `Day 15: Discontinue ${fromName} completely; maintain ${toName}.`,
    ],
  };
}

/* ========================================================================== */
/* SECTION 5: DESK DETECTION & COMPREHENSIVE REPORT GENERATOR                 */
/* ========================================================================== */

export const NEUROPSYCH_CORE_IDS = new Set([
  // Clozapine & Antipsychotics
  "clozapine",
  "clozaril",
  "olanzapine",
  "zyprexa",
  "haloperidol",
  "haldol",
  "chlorpromazine",
  "thorazine",
  "fluphenazine",
  "risperidone",
  "risperdal",
  "paliperidone",
  "invega",
  "quetiapine",
  "seroquel",
  "aripiprazole",
  "abilify",
  "ziprasidone",
  "geodon",
  "lurasidone",
  "latuda",
  "cariprazine",
  "vraylar",
  "brexpiprazole",
  "rexulti",
  // Antidepressants - SSRIs/SNRIs/TCAs/MAOIs
  "paroxetine",
  "paxil",
  "fluoxetine",
  "prozac",
  "venlafaxine",
  "venlafaxine-xr",
  "effexor",
  "effexor-xr",
  "desvenlafaxine",
  "pristiq",
  "duloxetine",
  "cymbalta",
  "sertraline",
  "zoloft",
  "escitalopram",
  "lexapro",
  "citalopram",
  "celexa",
  "fluvoxamine",
  "luvox",
  "amitriptyline",
  "elavil",
  "nortriptyline",
  "pamelor",
  "clomipramine",
  "anafranil",
  "imipramine",
  "tofranil",
  "doxepin",
  "sinequan",
  "phenelzine",
  "nardil",
  "tranylcypromine",
  "parnate",
  "selegiline",
  "emsam",
  "isocarboxazid",
  "marplan",
  // Antidotes & Movement Disorder Agents
  "bromocriptine",
  "parlodel",
  "dantrolene",
  "dantrium",
  "ryanodex",
  "amantadine",
  "gocovri",
  "symmetrel",
  "cyproheptadine",
  "periactin",
  "physostigmine",
  "antilirium",
  "benztropine",
  "cogentin",
  "trihexyphenidyl",
  // CYP1A2 Collisions
  "ciprofloxacin",
  "cipro",
]);

/**
 * Returns true if any core neuropsychiatric medication, antipsychotic,
 * antidepressant, neuro-emergency antidote, or CYP1A2 clozapine interactor is on the desk.
 */
export function neuropsychOnDesk(drugIds: string[]): boolean {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  return normalized.some((id) => {
    if (NEUROPSYCH_CORE_IDS.has(id)) return true;
    if (
      [
        "clozapine",
        "olanzapine",
        "haloperidol",
        "fluoxetine",
        "paroxetine",
        "venlafaxine",
        "fluvoxamine",
        "ciprofloxacin",
        "bromocriptine",
        "dantrolene",
        "amantadine",
        "cyproheptadine",
        "physostigmine",
      ].some((core) => id.includes(core))
    ) {
      return true;
    }
    return false;
  });
}

export interface NeuropsychReport {
  hasNeuropsych: boolean;
  presentAgents: string[];
  overallRiskTier: "critical" | "high" | "moderate" | "standard";
  clozapineReport: {
    hasClozapine: boolean;
    collisions1a2: ClozapineCollisionAlert[];
    tobaccoModel: ClozapineTobaccoResult | null;
    cighEvaluation: CighEvaluation | null;
  };
  emergenciesDetected: {
    hasSerotonergicStack: boolean;
    hasDopamineAntagonistStack: boolean;
    hasAnticholinergicBurden: boolean;
    serotoninSyndromeRiskSummary: string;
    nmsRiskSummary: string;
    anticholinergicRiskSummary: string;
  };
  antidepressantDiscontinuation: {
    evaluatedProfiles: AntidepressantKineticProfile[];
    finishRiskSummaries: FinishSyndromeEvaluation[];
    maoiWashoutAlerts: CrossTaperRecommendation[];
  };
  activeAlerts: string[];
  clinicalPearls: string[];
  regulatoryNotice: string;
}

/**
 * Comprehensive neuropsychiatric report generator for active desk tray.
 */
export function neuropsychReportOnDesk(drugIds: string[], host: HostContext): NeuropsychReport {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  const hasNp = neuropsychOnDesk(normalized);

  const presentAgents = normalized
    .filter((id) => NEUROPSYCH_CORE_IDS.has(id) || DRUG_BY_ID[id]?.cls?.toLowerCase().includes("antipsychotic") || DRUG_BY_ID[id]?.cls?.toLowerCase().includes("antidepressant"))
    .map((id) => DRUG_BY_ID[id]?.name ?? id);

  const hasClozapine = normalized.some((id) => id === "clozapine" || id === "clozaril");

  // Clozapine Collisions & Tobacco Model
  const clozapineCollisions = hasClozapine ? detectClozapine1a2Collisions(normalized) : [];
  const tobaccoModel = hasClozapine
    ? modelClozapineTobaccoKinetics({
        currentDailyDoseMg: 350,
        isSmokingTobacco: host.smoking,
        scenario: host.smoking ? "smoker-steady" : "nonsmoker-steady",
      })
    : null;

  const cighEvaluation = hasClozapine
    ? evaluateCighRisk({
        hasClozapine: true,
        concurrentAnticholinergicAgents: normalized.filter((id) =>
          ["benztropine", "diphenhydramine", "amitriptyline", "doxepin", "oxybutynin"].includes(id),
        ),
        concurrentOpioid: normalized.some((id) =>
          ["morphine", "oxycodone", "fentanyl", "methadone", "hydromorphone", "buprenorphine"].includes(id),
        ),
        ageYears: host.age === "geriatric" ? 72 : 45,
        constipationReported: false,
        bowelMovementAbsenceDays: 1,
      })
    : null;

  // Serotonergic & Neuro-Emergency Stacks
  const serotonergicAgents = normalized.filter((id) =>
    [
      "fluoxetine",
      "paroxetine",
      "venlafaxine",
      "venlafaxine-xr",
      "sertraline",
      "escitalopram",
      "citalopram",
      "fluvoxamine",
      "duloxetine",
      "clomipramine",
      "phenelzine",
      "tranylcypromine",
      "selegiline",
      "tramadol",
      "dextromethorphan",
      "linezolid",
    ].includes(id),
  );
  const hasSerotonergicStack = serotonergicAgents.length >= 2;

  const daAntagonists = normalized.filter((id) =>
    [
      "haloperidol",
      "chlorpromazine",
      "fluphenazine",
      "olanzapine",
      "risperidone",
      "paliperidone",
      "clozapine",
      "quetiapine",
      "ziprasidone",
      "lurasidone",
      "metoclopramide",
      "promethazine",
    ].includes(id),
  );
  const hasDopamineAntagonistStack = daAntagonists.length >= 2;

  const anticholinergicAgents = normalized.filter((id) =>
    [
      "atropine",
      "diphenhydramine",
      "benztropine",
      "trihexyphenidyl",
      "amitriptyline",
      "doxepin",
      "clomipramine",
      "oxybutynin",
      "chlorpromazine",
      "olanzapine",
      "clozapine",
    ].includes(id),
  );
  const hasAnticholinergicBurden = anticholinergicAgents.length >= 2;

  // Antidepressant Discontinuation & Washout Alerts
  const evaluatedProfiles: AntidepressantKineticProfile[] = [];
  const finishRiskSummaries: FinishSyndromeEvaluation[] = [];
  const maoiWashoutAlerts: CrossTaperRecommendation[] = [];

  const maoiPresent = normalized.find(isMaoi);

  for (const id of normalized) {
    const prof = ANTIDEPRESSANT_KINETICS_REGISTRY[id];
    if (prof) {
      evaluatedProfiles.push(prof);
      const finishEval = evaluateFinishSyndromeRisk(id, true);
      if (finishEval) finishRiskSummaries.push(finishEval);

      if (maoiPresent && id !== maoiPresent) {
        maoiWashoutAlerts.push(calculateAntidepressantCrossTaper(id, maoiPresent));
      }
    }
  }

  // Active Alerts Synthesis
  const activeAlerts: string[] = [];

  if (clozapineCollisions.length > 0) {
    for (const col of clozapineCollisions) {
      activeAlerts.push(
        `[Clozapine CYP1A2 Collision - ${col.collisionSeverity.toUpperCase()}] ${col.interactingDrugName}: ${col.magnitudeFoldIncrease}. ${col.clinicalAction}`,
      );
    }
  }

  if (hasClozapine && !host.smoking) {
    activeAlerts.push(
      "[Clozapine Non-Smoker Kinetics] CYP1A2 is in baseline non-induced state. Warning: If patient was an inpatient who starts smoking upon discharge, clozapine clearance will surge by ~50%, dropping levels and risking psychotic relapse.",
    );
  } else if (hasClozapine && host.smoking) {
    activeAlerts.push(
      "[Clozapine Tobacco Smoke Induction] Patient is flagged as a smoker: CYP1A2 clearance is induced ~50% by PAHs. CRITICAL WARNING: Abrupt smoking cessation (or smoke-free hospitalization) will de-induce CYP1A2 over 3-7 days, surging serum clozapine by 50%-100% and risking grand mal seizures and toxicity!",
    );
  }

  if (hasClozapine && cighEvaluation && cighEvaluation.riskScore !== "standard") {
    activeAlerts.push(
      `[Clozapine Gastrointestinal Hypomotility - ${cighEvaluation.riskScore.toUpperCase()}] Severe transit slowing. Proactive bowel regimen (PEG 3350) mandated. CIGH mortality exceeds agranulocytosis mortality!`,
    );
  }

  if (maoiWashoutAlerts.length > 0) {
    for (const w of maoiWashoutAlerts) {
      activeAlerts.push(
        `[CRITICAL MAOI WASHOUT CONTRAINDICATION] ${w.fromDrugName} + ${w.toDrugName}: Mandatory ${w.washoutDaysRequired}-day washout required! Fatal Serotonin Syndrome risk.`,
      );
    }
  } else if (hasSerotonergicStack) {
    activeAlerts.push(
      `[Serotonergic Polypharmacy - MAJOR] ${serotonergicAgents.join(", ")}: Multiple serotonergic agents increase risk of Serotonin Syndrome. Hunter Criteria monitoring indicated.`,
    );
  }

  if (hasDopamineAntagonistStack) {
    activeAlerts.push(
      `[Antipsychotic / Dopamine Antagonist Stack] ${daAntagonists.join(", ")}: High D2 receptor occupancy increases risk of Neuroleptic Malignant Syndrome and severe extrapyramidal symptoms.`,
    );
  }

  // Overall Risk Tier
  let overallRiskTier: NeuropsychReport["overallRiskTier"] = "standard";
  if (
    clozapineCollisions.some((c) => c.collisionSeverity === "contraindicated") ||
    maoiWashoutAlerts.length > 0
  ) {
    overallRiskTier = "critical";
  } else if (
    clozapineCollisions.length > 0 ||
    hasSerotonergicStack ||
    (hasClozapine && host.smoking) ||
    finishRiskSummaries.some((f) => f.riskTier === "extreme")
  ) {
    overallRiskTier = "high";
  } else if (hasNp || hasClozapine) {
    overallRiskTier = "moderate";
  }

  const clinicalPearls = [
    "Hunter Serotonin Toxicity Criteria has 84% sensitivity and 97% specificity; clonus (spontaneous, inducible, ocular) is the single most specific diagnostic physical finding.",
    "Fastest bedside differentiator between Anticholinergic Toxidrome and Serotonin Syndrome / NMS is skin moisture: Anticholinergic toxicity produces ANHIDROSIS (dry axillae), whereas SS and NMS produce marked DIAPHORESIS.",
    "In NMS, 'lead-pipe' rigidity and hyporeflexia evolve over days/weeks; in Serotonin Syndrome, tremor, hyperreflexia, and clonus develop acutely within 24 hours.",
    "Antipyretics (acetaminophen, NSAIDs) are ineffective in Serotonin Syndrome and NMS because hyperthermia is caused by continuous peripheral muscular rigidity and clonus, NOT hypothalamic pyrogen setpoint elevation.",
    "Polycyclic aromatic hydrocarbons (PAHs) in burning tobacco smoke (not nicotine!) induce CYP1A2. Abrupt smoking cessation in a clozapine-treated patient resolves induction over 3-7 days, surging serum clozapine by 50% to 100% and risking grand mal seizures.",
    "Mortality from Clozapine-Induced Gastrointestinal Hypomotility (CIGH, 15%-27%) exceeds the mortality from clozapine agranulocytosis. A proactive daily osmotic bowel regimen is mandatory.",
    "Fluoxetine to MAOI requires a MANDATORY 5-WEEK (35 days) WASHOUT because active norfluoxetine has an elimination half-life of 7 to 15 days.",
    "Paroxetine (t1/2 ~21h) and Venlafaxine (t1/2 ~5-11h) carry extreme FINISH discontinuation risk due to rapid elimination.",
  ];

  return {
    hasNeuropsych: hasNp,
    presentAgents,
    overallRiskTier,
    clozapineReport: {
      hasClozapine,
      collisions1a2: clozapineCollisions,
      tobaccoModel,
      cighEvaluation,
    },
    emergenciesDetected: {
      hasSerotonergicStack,
      hasDopamineAntagonistStack,
      hasAnticholinergicBurden,
      serotoninSyndromeRiskSummary: hasSerotonergicStack
        ? `Elevated risk with concurrent serotonergics (${serotonergicAgents.join(", ")}). Evaluate via Hunter criteria.`
        : "Standard risk; single or no serotonergic agents present.",
      nmsRiskSummary: hasDopamineAntagonistStack
        ? `Elevated risk with multiple dopamine antagonists (${daAntagonists.join(", ")}). Evaluate for lead-pipe rigidity, hyperthermia, and elevated CPK.`
        : "Standard risk.",
      anticholinergicRiskSummary: hasAnticholinergicBurden
        ? `High anticholinergic burden (${anticholinergicAgents.join(", ")}). Check axillae for anhidrosis, monitor for delirium and urinary retention.`
        : "Standard risk.",
    },
    antidepressantDiscontinuation: {
      evaluatedProfiles,
      finishRiskSummaries,
      maoiWashoutAlerts,
    },
    activeAlerts,
    clinicalPearls,
    regulatoryNotice: NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER,
  };
}
