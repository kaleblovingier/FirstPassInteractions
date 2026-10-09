/**
 * Maternal-Fetal Medicine & Perinatal Pharmacokinetics Reference Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed Maternal-Fetal Medicine (MFM) specialists, obstetricians,
 *   perinatal/obstetric clinical pharmacists (PharmD), and supervised health-professions trainees.
 * - Displays transparent physiological, biochemical, and pharmacokinetic formulas derived
 *   from canonical peer-reviewed literature (ACOG Practice Bulletins, Creasy & Resnik's
 *   Maternal-Fetal Medicine, Briggs' Drugs in Pregnancy and Lactation, The Magpie Trial).
 * - Enables independent clinical verification of the scientific rationale for all findings.
 * - STRICTLY NON-PRESCRIPTIVE: Does not generate patient-specific medical orders,
 *   prescription directives, or closed-loop infusion pump controls.
 *
 * Core Pillars:
 * 1. Maternal Gestational PK Adaptations:
 *    - Plasma volume expansion (+40-50% by 32 weeks, expanding Vd of hydrophilic drugs like
 *      beta-lactams and aminoglycosides, lowering peak concentrations).
 *    - Renal hyperfiltration (GFR surges by +50%, accelerating clearance of renally eliminated
 *      drugs: ampicillin, cefazolin, low molecular weight heparin).
 *    - Hypoalbuminemia (dilutional drop by ~1.0 g/dL, increasing free unbound fraction of
 *      highly protein-bound drugs: phenytoin, diazepam).
 *    - Hepatic CYP activity shifts: CYP3A4, CYP2D6, and CYP2C9 activities are induced by
 *      progesterone/estradiol; CYP1A2 is repressed.
 * 2. Preeclampsia / Eclampsia Magnesium Sulfate Neuroprotection & Toxicity Safeguards:
 *    - Pritchard (IM) and Zuspan (IV) regimens: Loading 4 to 6 g IV over 15-20 minutes, then
 *      1 to 2 g/h continuous infusion. Target therapeutic serum magnesium: 4.8 to 8.4 mg/dL
 *      (2.0 to 3.5 mmol/L or 4.0 to 7.0 mEq/L).
 *    - Concentration-dependent toxicity milestones:
 *      - Loss of deep tendon patellar reflexes: 9.0 to 12.0 mg/dL (7.5 to 10 mEq/L).
 *      - Respiratory depression / somnolence: 12.0 to 15.0 mg/dL (10 to 12.5 mEq/L).
 *      - Cardiac arrest / asystole / conduction block: > 15.0 to 20.0 mg/dL (> 12.5 mEq/L).
 *    - Emergency Antidote: Calcium gluconate 10% (1 g = 10 mL IV over 3-5 minutes) competitive
 *      antagonism of neuromuscular junction calcium entry.
 *    - Renal failure magnesium accumulation trap: Serum creatinine >= 1.2 mg/dL or urine
 *      output < 30 mL/h requires mandatory rate reduction (1 g/h) or hold with serial magnesium checks.
 * 3. Acute Severe Maternal Hypertension (BP >= 160/110 mmHg):
 *    - ACOG First-Line Emergency Antihypertensives:
 *      - IV Labetalol: Alpha-1 and non-selective beta-blocker. Avoid in maternal asthma,
 *        severe bradycardia (HR < 60), or decompensated heart failure.
 *      - IV Hydralazine: Direct arteriolar vasodilator. Caution: delayed onset (15-20 min),
 *        profound reflex tachycardia, and maternal hypotension leading to non-reassuring
 *        fetal heart tracings.
 *      - Oral Nifedipine immediate-release: Dihydropyridine calcium channel blocker.
 *        Swallow whole; NEVER bite or administer sublingually (uncontrolled sudden hypotension).
 *        Caution when co-administered with magnesium sulfate (synergistic neuromuscular
 *        blockade and profound hypotension).
 * 4. Postpartum Hemorrhage (PPH) Uterotonic Stepped Cascade & Safety Contraindications:
 *    - Oxytocin (Pitocin): First-line uterotonic. Caution on rapid IV push (marked transient
 *      hypotension); high-dose prolonged infusion exerts antidiuretic vasopressin-like effect
 *      causing severe hyponatremic water intoxication and maternal seizures!
 *    - Methylergonovine (Methergine): Ergot alkaloid inducing sustained uterine tetany.
 *      ABSOLUTE CONTRAINDICATION: Hypertension, preeclampsia, cardiovascular disease
 *      (potent alpha-1 vasoconstriction precipitates hypertensive crisis, intracranial
 *      hemorrhage, and stroke).
 *    - Carboprost tromethamine (Hemabate, 15-methyl PGF2alpha): Potent prostaglandin
 *      myometrial stimulant. ABSOLUTE CONTRAINDICATION: Asthma / active bronchospasm (potent
 *      bronchial smooth muscle constriction induces refractory bronchospasm and hypoxemia).
 *      Common side effect: profuse secretory diarrhea.
 *    - Misoprostol (Cytotec, PGE1): Stable synthetic prostaglandin E1. Safe in asthma and
 *      hypertension. High-dose administration triggers shivering, rigors, and hyperthermia
 *      (temp > 40°C).
 * 5. Critical Embryological Windows & Canonical Teratogens:
 *    - Pre-implantation (weeks 1-2 post-conception): "All-or-none" period.
 *    - Organogenesis (weeks 3-8 post-conception): Maximum structural teratogenic vulnerability.
 *    - Fetal period (weeks 9-38 post-conception): Functional defects and growth restriction.
 *    - High-Yield Teratogen Signatures:
 *      - ACE inhibitors / ARBs: 2nd and 3rd trimester exposure causes fetal renal tubular
 *        dysgenesis, severe oligohydramnios, pulmonary hypoplasia, and skull ossification
 *        defects (Potter sequence).
 *      - Isotretinoin (Accutane): Craniofacial, cardiovascular (conotruncal defects),
 *        thymic, and central nervous system neural crest defects.
 *      - Valproic acid: Neural tube defects (spina bifida, 1-2% risk), craniofacial
 *        dysmorphism, long-term cognitive impairment (dose > 800-1000 mg/d high risk).
 *      - Warfarin: Warfarin embryopathy (weeks 6-9: nasal hypoplasia, stippled epiphyses /
 *        chondrodysplasia punctata; 2nd/3rd trimester: CNS hemorrhage and microcephaly).
 *        Mandatory switch to LMWH before 6 weeks gestation.
 *      - Methotrexate: Folate depletion, skeletal abnormalities, craniosynostosis.
 *      - Thalidomide: Phocomelia (limb reduction defects).
 */

import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. REGULATORY DISCLAIMERS & NON-DEVICE CDS POSTURE (FD&C Act § 520(o)(1)(E))
// ============================================================================

export const OBSTETRIC_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational obstetric pharmacokinetics, maternal resuscitation, and perinatal pharmacotherapy reference engine is intended solely for licensed healthcare professionals (Maternal-Fetal Medicine specialists, obstetricians, perinatal clinical pharmacists) and supervised health-professions trainees. It models gestational pharmacokinetic alterations (plasma volume expansion, renal hyperfiltration, dilutional hypoalbuminemia, CYP/UGT shifts), preeclampsia/eclampsia magnesium sulfate neuroprotection and toxicity thresholds, ACOG acute severe maternal hypertension pharmacotherapy, postpartum hemorrhage (PPH) uterotonic cascade algorithms, and critical embryological teratogen vulnerability windows. It displays transparent physiological and biochemical mechanisms with peer-reviewed literature citations to enable independent clinical review. STRICTLY NON-PRESCRIPTIVE: Does not generate patient-specific medical orders, prescription directives, or closed-loop infusion pump controls, and does not replace individualized clinical evaluation or the FDA-approved Prescribing Information.";

export const OBSTETRIC_REGULATORY_NOTICE = `${OBSTETRIC_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`;

// ============================================================================
// 2. PILLAR 1: MATERNAL GESTATIONAL PHARMACOKINETICS
// ============================================================================

export interface MaternalPkAdaptationSummary {
  gestationalAgeWeeks: number;
  trimester: "first" | "second" | "third" | "postpartum";
  plasmaVolumeExpansionPct: number;
  plasmaVolumeDeltaMl: number;
  gfrIncreasePct: number;
  expectedCreatinineRangeMgDl: { min: number; max: number };
  dilutionalAlbuminDropGDl: number;
  expectedAlbuminGDl: number;
  hydrophilicVdMultiplier: number;
  hydrophilicCmaxReductionPct: number;
  renalClearanceMultiplier: number;
  cypShifts: {
    cyp3a4: { direction: "induced"; changePct: number; mechanism: string; affectedDrugs: string[] };
    cyp2d6: { direction: "induced"; changePct: number; mechanism: string; affectedDrugs: string[] };
    cyp2c9: { direction: "induced"; changePct: number; mechanism: string; affectedDrugs: string[] };
    ugt1a4_2b7: { direction: "induced"; changePct: number; mechanism: string; affectedDrugs: string[] };
    cyp1a2: { direction: "repressed"; changePct: number; mechanism: string; affectedDrugs: string[] };
  };
  clinicalImplications: string[];
}

/**
 * Calculates physiological maternal PK adaptations based on gestational age in weeks.
 * Reference: Costantine MM. Front Pharmacol 2014; Creasy & Resnik 9th Ed.
 */
export function calculateMaternalPkAdaptations(gestationalAgeWeeks: number = 32): MaternalPkAdaptationSummary {
  const ga = Math.max(0, Math.min(42, gestationalAgeWeeks));

  let trimester: "first" | "second" | "third" | "postpartum" = "third";
  if (ga <= 13) trimester = "first";
  else if (ga <= 27) trimester = "second";
  else if (ga <= 40) trimester = "third";
  else trimester = "postpartum";

  // Plasma volume expands progressively: +10-15% by 12w, +30-35% by 24w, peaking +45-50% at 32-34w.
  let pvPct = 0;
  if (ga <= 8) pvPct = (ga / 8) * 8;
  else if (ga <= 20) pvPct = 8 + ((ga - 8) / 12) * 22; // 30% by 20w
  else if (ga <= 34) pvPct = 30 + ((ga - 20) / 14) * 18; // 48% by 34w
  else pvPct = 48 - ((ga - 34) / 8) * 4; // slight plateau ~44%

  const pvDeltaMl = Math.round((pvPct / 100) * 2600); // baseline non-pregnant ~2600 mL plasma

  // GFR surges early: +40% by end of 1st trimester, peaking +50% in 2nd trimester.
  let gfrPct = 0;
  if (ga <= 12) gfrPct = (ga / 12) * 40;
  else if (ga <= 28) gfrPct = 40 + ((ga - 12) / 16) * 10;
  else gfrPct = 50 - ((ga - 28) / 14) * 5; // slight drop near term to ~45%

  // Dilutional drop in albumin: baseline 4.3 g/dL drops by 0.5 g/dL in 1st tri, ~0.8-1.0 g/dL in 2nd/3rd tri.
  const albDrop = Math.min(1.2, 0.2 + (ga / 32) * 0.8);
  const expectedAlb = Math.max(2.8, Math.round((4.3 - albDrop) * 10) / 10);

  // Hydrophilic Vd expansion: proportional to extracellular water expansion (+30-45%)
  const hydrophilicVdMult = Math.round((1 + pvPct * 0.008) * 100) / 100;
  const hydrophilicCmaxDrop = Math.round((1 - 1 / hydrophilicVdMult) * 100);

  // Renal clearance multiplier: closely tracks GFR increase
  const renalClMult = Math.round((1 + gfrPct / 100) * 100) / 100;

  return {
    gestationalAgeWeeks: ga,
    trimester,
    plasmaVolumeExpansionPct: Math.round(pvPct),
    plasmaVolumeDeltaMl: pvDeltaMl,
    gfrIncreasePct: Math.round(gfrPct),
    expectedCreatinineRangeMgDl: { min: 0.4, max: 0.7 },
    dilutionalAlbuminDropGDl: Math.round(albDrop * 10) / 10,
    expectedAlbuminGDl: expectedAlb,
    hydrophilicVdMultiplier: hydrophilicVdMult,
    hydrophilicCmaxReductionPct: hydrophilicCmaxDrop,
    renalClearanceMultiplier: renalClMult,
    cypShifts: {
      cyp3a4: {
        direction: "induced",
        changePct: 60,
        mechanism: "Progesterone and placental hormones stimulate CYP3A4 promoter transactivation via Pregnane X Receptor (PXR).",
        affectedDrugs: ["Nifedipine", "Buprenorphine", "Methadone", "Midazolam", "Protease Inhibitors"],
      },
      cyp2d6: {
        direction: "induced",
        changePct: 40,
        mechanism: "Estrogen-driven induction of hepatic CYP2D6 transcription accelerates metabolism.",
        affectedDrugs: ["Labetalol", "Metoprolol", "Fluoxetine", "Ondansetron"],
      },
      cyp2c9: {
        direction: "induced",
        changePct: 25,
        mechanism: "Steroid receptor induction enhances CYP2C9 protein synthesis.",
        affectedDrugs: ["Phenytoin", "Celecoxib", "Warfarin"],
      },
      ugt1a4_2b7: {
        direction: "induced",
        changePct: 250,
        mechanism: "Massive estrogen-mediated induction of UGT1A4 glucuronidation drives profound clearance surges.",
        affectedDrugs: ["Lamotrigine (clearance rises 200-300%, frequent seizure breakthrough)", "Morphine"],
      },
      cyp1a2: {
        direction: "repressed",
        changePct: -35,
        mechanism: "Estrogen and gestational steroids repress CYP1A2 gene transcription, prolonging half-life.",
        affectedDrugs: ["Caffeine", "Theophylline", "Olanzapine", "Clozapine"],
      },
    },
    clinicalImplications: [
      "Hydrophilic Antibiotics & Beta-Lactams: Expanded Vd and GFR-driven renal clearance lower peak (Cmax) and trough (Cmin) levels of ampicillin, cefazolin, and piperacillin. More frequent dosing (e.g. ampicillin q4h instead of q6h for GBS or chorioamnionitis) or higher doses are routinely necessary.",
      "Renal Elimination Baseline: Physiological normal serum creatinine during pregnancy is 0.4 to 0.7 mg/dL. A 'normal' non-pregnant serum creatinine of 0.9 to 1.1 mg/dL indicates underlying renal impairment in pregnancy.",
      "Dilutional Hypoalbuminemia & Unbound Fraction: Albumin drops ~1.0 g/dL. For highly protein-bound medications (phenytoin, valproate, diazepam), total serum concentrations appear artificially low while pharmacologically active unbound (free) concentrations remain therapeutic. Total levels alone risk inappropriate toxic dose escalation.",
      "Lamotrigine Glucuronidation Surge: UGT1A4 activity increases up to 300%. Lamotrigine clearance surges starting in the first trimester, requiring monthly therapeutic drug monitoring and substantial dose escalation to prevent catastrophic breakthrough seizures.",
    ],
  };
}

export interface ProteinBindingCorrectionResult {
  drugName: string;
  measuredTotalLevel: number;
  unit: string;
  measuredAlbuminGDl: number;
  normalAlbuminGDl: number;
  estimatedFreeFractionBaseline: number;
  estimatedPregnancyFreeFraction: number;
  correctedTotalLevel: number;
  interpretation: string;
}

/**
 * Winter-Tozer style correction for pregnancy-associated hypoalbuminemia in highly bound drugs (e.g., phenytoin).
 * Formula: Corrected Level = Measured Total / ((0.2 * (Albumin / 4.4)) + 0.1) or adjusted pregnancy coefficient.
 */
export function calculatePregnancyProteinBindingCorrection(options: {
  measuredTotalLevel: number;
  unit?: string;
  albuminGDl?: number;
  drug?: "phenytoin" | "valproate" | "general";
}): ProteinBindingCorrectionResult {
  const measured = options.measuredTotalLevel;
  const unit = options.unit ?? "mcg/mL";
  const alb = options.albuminGDl ?? 3.2;
  const normalAlb = 4.4;
  const drug = options.drug ?? "phenytoin";

  // In pregnancy, binding affinity may also be altered; affinity factor ~0.2-0.25
  const affinityFactor = drug === "phenytoin" ? 0.2 : drug === "valproate" ? 0.15 : 0.2;
  const denom = (alb / normalAlb) * (1 - affinityFactor) + affinityFactor;
  const corrected = Math.round((measured / Math.max(0.2, denom)) * 10) / 10;

  const baselineFu = drug === "phenytoin" ? 0.1 : 0.1;
  const pregFu = Math.round((baselineFu * (normalAlb / alb)) * 100) / 100;

  return {
    drugName: drug === "phenytoin" ? "Phenytoin" : drug === "valproate" ? "Valproate" : "Highly Protein-Bound Drug",
    measuredTotalLevel: measured,
    unit,
    measuredAlbuminGDl: alb,
    normalAlbuminGDl: normalAlb,
    estimatedFreeFractionBaseline: baselineFu,
    estimatedPregnancyFreeFraction: Math.min(0.35, pregFu),
    correctedTotalLevel: corrected,
    interpretation:
      `Measured total concentration (${measured} ${unit}) is diluted by hypoalbuminemia (albumin ${alb} g/dL). ` +
      `Estimated free unbound fraction has risen from ${Math.round(baselineFu * 100)}% to ~${Math.round(pregFu * 100)}%. ` +
      `Corrected normalized total concentration is approximately ${corrected} ${unit}. Always prioritize direct free (unbound) drug concentration assays when available.`,
  };
}

// ============================================================================
// 3. PILLAR 2: MAGNESIUM SULFATE NEUROPROTECTION & TOXICITY RAILS
// ============================================================================

export type MagnesiumToxicityTier =
  | "subtherapeutic"
  | "therapeutic"
  | "loss_of_reflexes"
  | "respiratory_depression"
  | "conduction_block_or_arrest";

export interface MagnesiumConcentrationUnits {
  mgDl: number;
  mmolL: number;
  mEqL: number;
}

export function mgDlToMeqL(mgDl: number): number {
  // Molecular weight Mg = 24.305 mg/mmol; divalent valence = 2.
  // 1 mg/dL = 10 mg/L = (10 / 24.305) mmol/L * 2 mEq/mmol = 0.82287 mEq/L
  return Math.round((mgDl * (10 / 24.305) * 2) * 10) / 10;
}

export function mgDlToMmolL(mgDl: number): number {
  return Math.round(((mgDl * 10) / 24.305) * 100) / 100;
}

export function meqLToMgDl(meqL: number): number {
  return Math.round(((meqL / 2) * 24.305 / 10) * 10) / 10;
}

export function mmolLToMgDl(mmolL: number): number {
  return Math.round(((mmolL * 24.305) / 10) * 10) / 10;
}

export interface MagnesiumSulfateRegimenInfo {
  regimenName: "Zuspan (IV)" | "Pritchard (IM)";
  loadingDoseDescription: string;
  maintenanceDoseDescription: string;
  targetTherapeuticRange: {
    mgDl: { min: number; max: number };
    mmolL: { min: number; max: number };
    mEqL: { min: number; max: number };
  };
  duration: string;
  antidote: string;
}

export const ZUSPAN_REGIMEN: MagnesiumSulfateRegimenInfo = {
  regimenName: "Zuspan (IV)",
  loadingDoseDescription: "Loading dose: 4 to 6 g IV infusion over 15 to 20 minutes (diluted in 100 mL 0.9% NaCl or D5W).",
  maintenanceDoseDescription: "Maintenance infusion: 1 to 2 g/h continuous IV infusion (e.g., 20 g in 500 mL 0.9% NaCl at 25-50 mL/h).",
  targetTherapeuticRange: {
    mgDl: { min: 4.8, max: 8.4 },
    mmolL: { min: 2.0, max: 3.5 },
    mEqL: { min: 4.0, max: 7.0 },
  },
  duration: "Continue for 24 hours postpartum or 24 hours after last eclamptic convulsion.",
  antidote: "Calcium gluconate 10% (1 g = 10 mL IV over 3-5 minutes) for life-threatening toxicity.",
};

export const PRITCHARD_REGIMEN: MagnesiumSulfateRegimenInfo = {
  regimenName: "Pritchard (IM)",
  loadingDoseDescription: "Loading dose: 4 g IV over 15 to 20 minutes PLUS 10 g deep IM (5 g in each upper outer buttock with 1 mL 2% lidocaine).",
  maintenanceDoseDescription: "Maintenance dose: 5 g deep IM every 4 hours alternating buttocks, conditioned on intact patellar reflexes and UO >= 100 mL/4h.",
  targetTherapeuticRange: {
    mgDl: { min: 4.8, max: 8.4 },
    mmolL: { min: 2.0, max: 3.5 },
    mEqL: { min: 4.0, max: 7.0 },
  },
  duration: "Continue for 24 hours postpartum or 24 hours after last eclamptic convulsion.",
  antidote: "Calcium gluconate 10% (1 g = 10 mL IV over 3-5 minutes) for life-threatening toxicity.",
};

export interface MagnesiumEvaluationResult {
  serumLevel: MagnesiumConcentrationUnits;
  tier: MagnesiumToxicityTier;
  tierLabel: string;
  therapeuticTargetRange: string;
  clinicalFindingsExpected: string[];
  antidoteRequired: boolean;
  antidoteProtocol?: {
    agent: string;
    dose: string;
    route: string;
    rate: string;
    mechanism: string;
    repeatInstructions: string;
  };
  renalAccumulationWarning: boolean;
  renalTrapDetails?: {
    serumCreatinineMgDl?: number;
    urineOutputMlHr?: number;
    hazardHeadline: string;
    actionRequired: string;
    monitoringFrequency: string;
  };
  managementSummary: string;
}

export function evaluateMagnesiumSulfate(options: {
  serumMagnesiumMgDl?: number;
  urineOutputMlHr?: number;
  serumCreatinineMgDl?: number;
  infusionRateGPerHour?: number;
}): MagnesiumEvaluationResult {
  const mgDl = options.serumMagnesiumMgDl ?? 5.5;
  const mmolL = mgDlToMmolL(mgDl);
  const mEqL = mgDlToMeqL(mgDl);

  let tier: MagnesiumToxicityTier = "therapeutic";
  let tierLabel = "Therapeutic Range (Eclampsia Prophylaxis & Neuroprotection)";
  let findings: string[] = [
    "Suppression of cortical and subcortical eclamptogenic epileptiform discharges.",
    "Peripheral arteriolar vasodilation, modest transient reduction in systemic vascular resistance.",
    "Intact patellar deep tendon reflexes (+2), normal respiratory rate (>= 12/min).",
    "Fetal neuroprotection: reductions in neonatal periventricular leukomalacia and cerebral palsy (<32w GA).",
  ];
  let antidoteRequired = false;

  if (mgDl < 4.8) {
    tier = "subtherapeutic";
    tierLabel = "Subtherapeutic Level (< 4.8 mg/dL / < 2.0 mmol/L)";
    findings = [
      "Insufficient seizure threshold elevation in preeclampsia with severe features.",
      "Patient remains vulnerable to eclamptic convulsions.",
      "Reflexes intact and brisk.",
    ];
  } else if (mgDl <= 8.4) {
    tier = "therapeutic";
    tierLabel = "Therapeutic Window (4.8 - 8.4 mg/dL / 2.0 - 3.5 mmol/L)";
    // already set
  } else if (mgDl < 12.0) {
    tier = "loss_of_reflexes";
    tierLabel = "Early Toxicity: Loss of Deep Tendon Patellar Reflexes (9.0 - 12.0 mg/dL / 3.7 - 5.0 mmol/L)";
    findings = [
      "Loss of patellar deep tendon reflexes (DTRs): earliest cardinal bedside clinical sign of toxicity.",
      "Presynaptic neuromuscular blockade: competitive inhibition of voltage-dependent P/Q-type calcium channels.",
      "Impaired acetylcholine release at the motor endplate.",
      "Patient may report facial warmth, flushing, diplopia, and heavy extremities.",
    ];
  } else if (mgDl < 15.0) {
    tier = "respiratory_depression";
    tierLabel = "Severe Toxicity: Somnolence & Respiratory Depression (12.0 - 15.0 mg/dL / 5.0 - 6.2 mmol/L)";
    findings = [
      "Respiratory depression (respiratory rate < 12 breaths/minute).",
      "Profound CNS somnolence, slurred speech, lethargy.",
      "Diaphragmatic and intercostal neuromuscular paralysis.",
      "Severe risk of hypercapnic respiratory arrest and maternal hypoxemia.",
    ];
    antidoteRequired = true;
  } else {
    tier = "conduction_block_or_arrest";
    tierLabel = "Life-Threatening Toxicity: Cardiac Conduction Block & Asystole (> 15.0 mg/dL / > 6.2 mmol/L)";
    findings = [
      "High-grade sinoatrial and atrioventricular (AV) conduction block, PR prolongation, widened QRS.",
      "Complete muscular flaccidity and apnea.",
      "Electromechanical dissociation, severe bradycardia, ventricular asystole, and cardiac arrest.",
      "Direct depression of myocardial calcium-dependent excitation-contraction coupling.",
    ];
    antidoteRequired = true;
  }

  // Renal Failure Accumulation Trap check
  const uo = options.urineOutputMlHr;
  const scr = options.serumCreatinineMgDl;
  const isOliguric = uo !== undefined && uo < 30;
  const isRenalImpaired = scr !== undefined && scr >= 1.2;
  const renalAccumulationWarning = isOliguric || isRenalImpaired;

  let renalTrapDetails: MagnesiumEvaluationResult["renalTrapDetails"];
  if (renalAccumulationWarning) {
    renalTrapDetails = {
      serumCreatinineMgDl: scr,
      urineOutputMlHr: uo,
      hazardHeadline: "Renal Failure Magnesium Accumulation Trap Detected",
      actionRequired:
        "Over 90-95% of magnesium is eliminated via renal glomerular filtration. In preeclampsia complicated by acute kidney injury (serum Cr >= 1.2 mg/dL) or oliguria (urine output < 30 mL/h), magnesium accumulates rapidly to lethal concentrations. Immediately reduce maintenance rate to 1.0 g/h or hold infusion. Place Foley catheter with urometer.",
      monitoringFrequency:
        "Perform serial stat serum magnesium levels every 2 to 4 hours. Assess patellar deep tendon reflexes and respiratory rate hourly. If reflexes are diminished or absent, STOP infusion immediately.",
    };
  }

  let antidoteProtocol: MagnesiumEvaluationResult["antidoteProtocol"];
  if (antidoteRequired || tier === "loss_of_reflexes") {
    antidoteProtocol = {
      agent: "Calcium Gluconate 10% Solution",
      dose: "1 g (10 mL of 10% solution)",
      route: "Slow Intravenous Push",
      rate: "Over 3 to 5 minutes",
      mechanism:
        "Calcium directly and competitively antagonizes magnesium inhibition at the presynaptic motor endplate voltage-gated calcium channels, restoring acetylcholine exocytosis and reversing diaphragmatic paralysis. Concurrently stabilizes cardiac myocytes against AV conduction block.",
      repeatInstructions:
        "If respiratory depression or severe neuromuscular paralysis persists after initial 10 mL bolus, repeat 1 g IV after 5-10 minutes. Support ventilation with bag-valve-mask or endotracheal intubation as needed. (Note: Calcium chloride 10% provides 3x more elemental calcium but carries severe tissue necrosis risk if extravasated; calcium gluconate is standard).",
    };
  }

  const managementSummary =
    tier === "therapeutic"
      ? "Magnesium concentration is within therapeutic bounds. Maintain continuous fetal monitoring, hourly respiratory rate and DTR checks, and strict fluid balance."
      : tier === "subtherapeutic"
        ? "Subtherapeutic level. Review infusion pump verification and evaluate need for re-bolusing in consultation with senior obstetric team if clinical seizure risk is high."
        : tier === "loss_of_reflexes"
          ? "Immediate action: Hold magnesium infusion. Check stat serum magnesium level. Verify respiratory rate >= 12/min and oxygen saturation. Prepare calcium gluconate at bedside."
          : "CRITICAL EMERGENCY: Stop magnesium infusion immediately. Administer Calcium Gluconate 10% (1 g IV over 3-5 minutes). Secure airway, provide 100% FiO2 respiratory support, and obtain immediate stat serum magnesium.";

  return {
    serumLevel: { mgDl, mmolL, mEqL },
    tier,
    tierLabel,
    therapeuticTargetRange: "4.8 to 8.4 mg/dL (2.0 to 3.5 mmol/L or 4.0 to 7.0 mEq/L)",
    clinicalFindingsExpected: findings,
    antidoteRequired,
    antidoteProtocol,
    renalAccumulationWarning,
    renalTrapDetails,
    managementSummary,
  };
}

// ============================================================================
// 4. PILLAR 3: ACUTE SEVERE MATERNAL HYPERTENSION (BP >= 160/110 mmHg)
// ============================================================================

export type AcuteAntihypertensiveAgentId = "labetalol" | "hydralazine" | "nifedipine_ir";

export interface AntihypertensiveOptionProfile {
  id: AcuteAntihypertensiveAgentId;
  name: string;
  class: string;
  standardDosingRegimen: string[];
  onsetMinutes: string;
  peakMinutes: string;
  durationHours: string;
  mechanism: string;
  contraindications: string[];
  boxedWarningsOrCautions: string[];
  isSuitableForCase: boolean;
  suitabilityRationale: string;
}

export interface AcuteHypertensionEvaluationResult {
  isSevereHypertension: boolean;
  systolicBp: number;
  diastolicBp: number;
  mapMmHg: number;
  urgencyRationale: string;
  targetBloodPressure: string;
  firstLineAgents: Record<AcuteAntihypertensiveAgentId, AntihypertensiveOptionProfile>;
  activeAlerts: string[];
  clinicalPearls: string[];
}

export function evaluateAcuteSevereHypertension(options?: {
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  hasAsthma?: boolean;
  hasBradycardia?: boolean;
  hasHeartFailure?: boolean;
  isReceivingMagnesium?: boolean;
}): AcuteHypertensionEvaluationResult {
  const sbp = options?.systolicBp ?? 165;
  const dbp = options?.diastolicBp ?? 112;
  const hr = options?.heartRateBpm ?? 82;
  const hasAsthma = options?.hasAsthma ?? false;
  const hasBradycardia = (options?.hasBradycardia ?? false) || hr < 60;
  const hasHeartFailure = options?.hasHeartFailure ?? false;
  const isReceivingMagnesium = options?.isReceivingMagnesium ?? false;

  const isSevere = sbp >= 160 || dbp >= 110;
  const map = Math.round((sbp + 2 * dbp) / 3);

  // Labetalol suitability
  const labetalolContraindicated = hasAsthma || hasBradycardia || hasHeartFailure;
  let labetalolRationale = "ACOG First-Line: Rapid onset (1-2 min), dual alpha-1 and beta blockade reduces SVR without reflex tachycardia.";
  if (hasAsthma) {
    labetalolRationale = "CONTRAINDICATED: Maternal asthma / active bronchospasm. Non-selective beta-2 blockade triggers bronchoconstriction and life-threatening status asthmaticus.";
  } else if (hasBradycardia) {
    labetalolRationale = `CONTRAINDICATED: Baseline maternal bradycardia (HR ${hr} bpm < 60). Beta-1 blockade risks profound bradycardia, AV nodal block, and cardiac compromise.`;
  } else if (hasHeartFailure) {
    labetalolRationale = "CONTRAINDICATED: Decompensated maternal heart failure. Beta blockade impairs inotropic compensation.";
  }

  // Hydralazine suitability
  const hydralazineCaution = hr > 110;
  const hydralazineRationale = hydralazineCaution
    ? "CAUTION: Direct arteriolar dilation provokes marked baroreceptor-mediated reflex tachycardia. Maternal baseline HR is already elevated."
    : "ACOG First-Line Alternative: Potent direct arteriolar smooth muscle relaxant. Mandatory caution regarding delayed peak (15-20 min) to avoid dose stacking.";

  // Nifedipine IR suitability
  let nifedipineRationale = "ACOG First-Line: Rapid oral agent. Must SWALLOW WHOLE. Never bite or give sublingually.";
  if (isReceivingMagnesium) {
    nifedipineRationale += " CAUTION: Concomitant magnesium sulfate creates synergistic calcium antagonism: monitor for sudden hypotension or neuromuscular weakness.";
  }

  const agents: Record<AcuteAntihypertensiveAgentId, AntihypertensiveOptionProfile> = {
    labetalol: {
      id: "labetalol",
      name: "IV Labetalol",
      class: "Combined Alpha-1 & Non-Selective Beta-1/Beta-2 Adrenergic Antagonist",
      standardDosingRegimen: [
        "Initial dose: 20 mg IV push over 2 minutes.",
        "Recheck BP at 10 minutes. If BP remains severe (>= 160/110), administer 40 mg IV over 2 minutes.",
        "Recheck BP at 10 minutes. If BP remains severe, administer 80 mg IV over 2 minutes.",
        "Maximum cumulative acute IV dose: 220 mg to 300 mg.",
      ],
      onsetMinutes: "1 to 2 minutes",
      peakMinutes: "5 to 10 minutes",
      durationHours: "2 to 4 hours",
      mechanism:
        "Competitively antagonizes vascular alpha-1 receptors (reducing SVR) and myocardial/vascular beta-1 and beta-2 receptors (preventing reflex tachycardia and reducing cardiac output surge). IV ratio of beta to alpha blockade is ~7:1.",
      contraindications: [
        "Maternal asthma or active reactive airway disease / bronchospasm",
        "Severe sinus bradycardia (heart rate < 60 beats/min)",
        "Second-degree or third-degree atrioventricular (AV) block",
        "Decompensated congestive heart failure",
      ],
      boxedWarningsOrCautions: [
        "Avoid in cocaine- or methamphetamine-induced hypertensive crises due to risk of unopposed alpha-1 vasoconstriction.",
      ],
      isSuitableForCase: !labetalolContraindicated,
      suitabilityRationale: labetalolRationale,
    },
    hydralazine: {
      id: "hydralazine",
      name: "IV Hydralazine",
      class: "Direct Arteriolar Smooth Muscle Vasodilator",
      standardDosingRegimen: [
        "Initial dose: 5 mg or 10 mg IV push slowly over 2 minutes.",
        "Recheck BP at 20 minutes. If BP remains severe (>= 160/110), administer 10 mg IV over 2 minutes.",
        "Maximum cumulative acute IV dose: 20 mg to 30 mg.",
      ],
      onsetMinutes: "5 to 20 minutes",
      peakMinutes: "15 to 20 minutes (CRITICAL DELAY WINDOW)",
      durationHours: "2 to 6 hours",
      mechanism:
        "Direct relaxation of arteriolar vascular smooth muscle via cellular calcium mobilization interference and nitric oxide/cGMP signaling, decreasing systemic vascular resistance and afterload.",
      contraindications: [
        "Coronary artery disease / myocardial ischemia",
        "Severe aortic or mitral stenosis",
        "Known hypersensitivity to hydralazine",
      ],
      boxedWarningsOrCautions: [
        "DELAYED ONSET TRAP: Peak effect takes 15 to 20 minutes. Re-dosing too early risks acute cumulative dose-stacking and sudden profound maternal hypotension.",
        "REFLEX TACHYCARDIA & PALPITATIONS: Direct SVR reduction elicits robust baroreflex-mediated sympathetic catecholamine surge.",
        "FETAL COMPROMISE: Sudden steep maternal hypotension reduces uterine arterial perfusion pressure, precipitating fetal heart rate late decelerations and bradycardia.",
      ],
      isSuitableForCase: true,
      suitabilityRationale: hydralazineRationale,
    },
    nifedipine_ir: {
      id: "nifedipine_ir",
      name: "Oral Nifedipine Immediate-Release (IR)",
      class: "Dihydropyridine L-Type Calcium Channel Blocker",
      standardDosingRegimen: [
        "Initial dose: 10 mg to 20 mg orally (capsule swallowed whole).",
        "Recheck BP at 20 minutes. If BP remains severe (>= 160/110), administer 20 mg orally.",
        "Maximum cumulative daily dose: 180 mg.",
      ],
      onsetMinutes: "10 to 20 minutes",
      peakMinutes: "30 to 45 minutes",
      durationHours: "4 to 6 hours",
      mechanism:
        "Inhibits trans-sarcolemmal calcium ion influx through voltage-sensitive L-type calcium channels in vascular smooth muscle, provoking coronary and peripheral arteriolar vasodilation.",
      contraindications: [
        "Aortic stenosis",
        "Severe cardiogenic shock",
        "Hypersensitivity to dihydropyridines",
      ],
      boxedWarningsOrCautions: [
        "CRITICAL ADMINISTRATION RAIL: SWALLOW WHOLE. NEVER BITE, CHEW, PUNCTURE, OR ADMINISTER SUBLINGUALLY. Sublingual or chewed administration causes uncontrolled precipitous blood pressure crashes, myocardial ischemia, and fatal fetal hypoperfusion.",
        "MAGNESIUM SULFATE SYNERGY: Co-administration with parenteral magnesium sulfate can trigger synergistic neuromuscular blockade and sudden severe maternal hypotension.",
      ],
      isSuitableForCase: true,
      suitabilityRationale: nifedipineRationale,
    },
  };

  const activeAlerts: string[] = [];
  if (isSevere) {
    activeAlerts.push(
      `ACUTE SEVERE MATERNAL HYPERTENSION DETECTED (BP ${sbp}/${dbp} mmHg, MAP ${map} mmHg). Obstetric emergency requiring first-line pharmacotherapy within 30-60 minutes to prevent maternal hemorrhagic stroke.`,
    );
  }
  if (hasAsthma) {
    activeAlerts.push("Maternal Asthma Flagged: Labetalol is contraindicated due to beta-2 bronchospasm risk. Prefer Hydralazine IV or Nifedipine oral.");
  }
  if (hasBradycardia) {
    activeAlerts.push(`Maternal Bradycardia (HR ${hr} bpm): Labetalol is contraindicated. Prefer Hydralazine IV or Nifedipine oral.`);
  }
  if (isReceivingMagnesium) {
    activeAlerts.push("Concomitant Magnesium Sulfate: Caution with Nifedipine due to potential synergistic calcium antagonism and profound hypotension.");
  }

  const clinicalPearls: string[] = [
    "ACOG Standard: Acute severe hypertension (SBP >= 160 or DBP >= 110 mmHg confirmed for >= 15 min) must be treated emergently within 30-60 minutes to reduce hemorrhagic stroke risk.",
    "Target Blood Pressure: Non-severe range (SBP 140-150 mmHg, DBP 90-100 mmHg). Avoid dropping MAP by > 25% acutely, which can compromise uteroplacental blood flow.",
    "Labetalol vs Hydralazine: Labetalol acts faster and causes significantly less maternal tachycardia and maternal hypotension than hydralazine.",
    "Oral Nifedipine IR Administration: Swallow whole. Never bite, chew, or puncture. Sublingual nifedipine is obsolete and hazardous.",
    "Fetal Heart Rate Monitoring: Continuous external electronic fetal monitoring is mandatory during acute antihypertensive titration to detect placental hypoperfusion.",
  ];

  return {
    isSevereHypertension: isSevere,
    systolicBp: sbp,
    diastolicBp: dbp,
    mapMmHg: map,
    urgencyRationale:
      "Severe systolic hypertension (>= 160 mmHg) is the primary hemodynamic driver of maternal hemorrhagic stroke and arterial dissection in preeclampsia. Timely control reduces maternal mortality.",
    targetBloodPressure: "Systolic 140-150 mmHg, Diastolic 90-100 mmHg (avoid precipitous drops)",
    firstLineAgents: agents,
    activeAlerts,
    clinicalPearls,
  };
}

// ============================================================================
// 5. PILLAR 4: POSTPARTUM HEMORRHAGE (PPH) STEPPED UTEROTONIC CASCADE
// ============================================================================

export type PphUterotonicStep = "step1_oxytocin" | "step2_methergine" | "step3_carboprost" | "step4_misoprostol";

export interface PphUterotonicAgent {
  step: PphUterotonicStep;
  stepNumber: 1 | 2 | 3 | 4;
  agentName: string;
  brandNames: string[];
  pharmacologicClass: string;
  targetReceptor: string;
  standardDosing: string;
  route: string;
  onset: string;
  absoluteContraindications: string[];
  keySafetyAlerts: string[];
  biochemicalMechanism: string;
  hemodynamicProfile: string;
  adverseReactions: string[];
  isContraindicated: boolean;
  contraindicationReason?: string;
}

export interface PphCascadeEvaluationResult {
  hasActivePph: boolean;
  maternalHypertension: boolean;
  maternalAsthma: boolean;
  steps: Record<PphUterotonicStep, PphUterotonicAgent>;
  steppedSequence: PphUterotonicAgent[];
  criticalSafetyBadges: {
    methergineHypertensionAlert: boolean;
    carboprostAsthmaAlert: boolean;
    oxytocinRapidPushAlert: boolean;
    oxytocinHyponatremiaAlert: boolean;
    misoprostolHyperthermiaAlert: boolean;
  };
  clinicalPearls: string[];
}

export function evaluatePphUterotonicCascade(options?: {
  hasActivePph?: boolean;
  hasMaternalHypertension?: boolean;
  hasMaternalAsthma?: boolean;
  hasFluidOverloadOrProlongedInfusion?: boolean;
}): PphCascadeEvaluationResult {
  const hasPph = options?.hasActivePph ?? true;
  const hasHt = options?.hasMaternalHypertension ?? false;
  const hasAsthma = options?.hasMaternalAsthma ?? false;
  const hasProlongedOxytocin = options?.hasFluidOverloadOrProlongedInfusion ?? false;

  const oxytocin: PphUterotonicAgent = {
    step: "step1_oxytocin",
    stepNumber: 1,
    agentName: "Oxytocin",
    brandNames: ["Pitocin"],
    pharmacologicClass: "Exogenous Nonapeptide Hormone Uterotonic",
    targetReceptor: "Oxytocin Gq-protein coupled receptor (OTR) in myometrium",
    standardDosing: "10 to 40 units in 500 to 1000 mL crystalloid IV continuous infusion (or 10 units IM)",
    route: "IV infusion (or IM)",
    onset: "< 1 minute IV, 3-5 minutes IM",
    absoluteContraindications: [
      "Hypersensitivity to oxytocin",
    ],
    keySafetyAlerts: [
      "NEVER ADMINISTER RAPID UNDILUTED IV PUSH: Rapid bolus triggers abrupt generalized vascular smooth muscle relaxation, severe transient maternal hypotension, reflex tachycardia, myocardial ischemia, and cardiovascular collapse.",
      "HIGH-DOSE PROLONGED INFUSION HYPONATREMIA TRAP: Oxytocin shares structural homology with arginine vasopressin (ADH). Prolonged high-dose infusion (> 40 mU/min) with large volumes of hypotonic fluids activates renal collecting duct V2 receptors, producing free water retention, severe dilutional hyponatremia, cerebral edema, maternal seizures, and coma.",
    ],
    biochemicalMechanism:
      "Binds Gq-coupled oxytocin receptors on myometrial cell membranes, stimulating phospholipase C (PLC) to cleave PIP2 into IP3 and DAG. IP3 triggers rapid calcium mobilization from the sarcoplasmic reticulum. Intracellular calcium binds calmodulin, activating myosin light-chain kinase (MLCK) to drive rhythmic and tonic myometrial contraction.",
    hemodynamicProfile: "Systemic vasodilation on bolus; antidiuresis / free water retention on prolonged infusion.",
    adverseReactions: ["Transient hypotension (rapid push)", "Hyponatremia / water intoxication (high dose)", "Nausea", "Flushing"],
    isContraindicated: false,
  };

  const methergine: PphUterotonicAgent = {
    step: "step2_methergine",
    stepNumber: 2,
    agentName: "Methylergonovine",
    brandNames: ["Methergine"],
    pharmacologicClass: "Ergot Alkaloid Myometrial Stimulant",
    targetReceptor: "Alpha-1 adrenergic, 5-HT2 serotonergic, and dopaminergic receptors",
    standardDosing: "0.2 mg IM (may repeat every 2 to 4 hours; max 5 doses)",
    route: "Intramuscular (IM) ONLY. NEVER IV PUSH.",
    onset: "2 to 5 minutes IM",
    absoluteContraindications: [
      "Hypertension (chronic, gestational, preeclampsia, eclampsia)",
      "Coronary artery disease / ischemic heart disease",
      "Peripheral vascular disease / Raynaud's phenomenon",
      "Severe hepatic or renal impairment",
    ],
    keySafetyAlerts: [
      "ABSOLUTE CONTRAINDICATION IN HYPERTENSION: Methylergonovine stimulates vascular alpha-1 adrenergic and 5-HT2 receptors, producing intense generalized arteriolar vasoconstriction. In hypertensive or preeclamptic patients, it precipitates acute hypertensive crisis, intracranial hemorrhage (stroke), coronary vasospasm / myocardial infarction, and acute pulmonary edema.",
      "NEVER GIVE INTRAVENOUSLY: IV administration causes catastrophic sudden blood pressure surges and stroke.",
    ],
    biochemicalMechanism:
      "Partial agonist at alpha-adrenergic and serotonergic receptors in the myometrium, causing sustained tetanic uterine contraction that compresses myometrial spiral arterioles. Concurrently produces systemic arteriolar vasoconstriction.",
    hemodynamicProfile: "Potent systemic vasoconstriction, sharp increase in SVR and blood pressure.",
    adverseReactions: ["Severe hypertension", "Maternal stroke / cerebral hemorrhage", "Seizures", "Headache", "Coronary vasospasm", "Nausea/vomiting"],
    isContraindicated: hasHt,
    contraindicationReason: hasHt
      ? "ABSOLUTE CONTRAINDICATION: Maternal hypertension / preeclampsia present. Potent alpha-1 vasoconstriction precipitates fatal hypertensive crisis, stroke, or myocardial infarction."
      : undefined,
  };

  const carboprost: PphUterotonicAgent = {
    step: "step3_carboprost",
    stepNumber: 3,
    agentName: "Carboprost Tromethamine (15-Methyl PGF2α)",
    brandNames: ["Hemabate"],
    pharmacologicClass: "Synthetic Prostaglandin F2-alpha Analogue",
    targetReceptor: "Prostaglandin FP receptors (Gq-coupled) in myometrium and bronchial smooth muscle",
    standardDosing: "250 mcg (0.25 mg) deep IM; may repeat every 15 to 90 minutes (maximum cumulative dose: 8 doses = 2 mg)",
    route: "Deep Intramuscular (IM) ONLY",
    onset: "15 to 30 minutes",
    absoluteContraindications: [
      "Asthma / active reactive airway disease / bronchospasm",
      "Known hypersensitivity to carboprost",
      "Active acute cardiac, pulmonary, renal, or hepatic disease",
    ],
    keySafetyAlerts: [
      "ABSOLUTE CONTRAINDICATION IN ASTHMA: PGF2alpha is an exceptionally potent bronchial smooth muscle constrictor. Administration in patients with asthma or reactive airway disease induces hyperacute refractory bronchospasm, severe hypoxemia, ventilation-perfusion mismatch, and respiratory arrest.",
      "PROFUSE SECRETORY DIARRHEA: Stimulates gastrointestinal smooth muscle motility and intestinal mucosal fluid secretion; diarrhea occurs in > 60% of patients. Prophylactic loperamide and antiemetics are frequently co-prescribed.",
    ],
    biochemicalMechanism:
      "15-methyl synthetic analogue of PGF2alpha with prolonged enzymatic stability. Agonism at Gq-coupled FP receptors mobilizes intracellular calcium, inducing forceful sustained myometrial contractions and local spiral arteriolar constriction.",
    hemodynamicProfile: "Bronchoconstriction, pulmonary arteriolar vasoconstriction, hypertension, pyrexia.",
    adverseReactions: [
      "Life-threatening bronchospasm (in asthma)",
      "Profuse secretory diarrhea (> 60%)",
      "Nausea, vomiting",
      "Pyrexia / temperature rise",
      "Hypertension, flushing",
    ],
    isContraindicated: hasAsthma,
    contraindicationReason: hasAsthma
      ? "ABSOLUTE CONTRAINDICATION: Maternal asthma / active reactive airway disease. Potent bronchial smooth muscle constriction triggers severe refractory bronchospasm, hypoxia, and respiratory failure."
      : undefined,
  };

  const misoprostol: PphUterotonicAgent = {
    step: "step4_misoprostol",
    stepNumber: 4,
    agentName: "Misoprostol",
    brandNames: ["Cytotec"],
    pharmacologicClass: "Synthetic Prostaglandin E1 (PGE1) Methyl Ester Analogue",
    targetReceptor: "Prostaglandin EP2, EP3, and EP4 receptors in myometrium",
    standardDosing: "600 to 1000 mcg administered sublingually, orally, or rectally (single dose)",
    route: "Sublingual, Oral, or Rectal (PR)",
    onset: "10 to 15 minutes sublingual, 20-30 minutes oral",
    absoluteContraindications: [
      "Known hypersensitivity to prostaglandins",
    ],
    keySafetyAlerts: [
      "SAFE IN ASTHMA & HYPERTENSION: Unlike carboprost, misoprostol does not cause bronchoconstriction; unlike methylergonovine, it does not induce alpha-1 hypertensive vasoconstriction. It is the preferred second/third-line uterotonic when asthma or hypertension contraindicate other agents.",
      "SEVERE HYPERTHERMIA & RIGORS: Doses of 800-1000 mcg frequently trigger violent shivering, rigors, and acute hyperpyrexia (temperatures commonly spiking > 40°C / 104°F). This is a pharmacologic thermoregulatory side effect and should not be mistaken for intraamniotic infection (chorioamnionitis) or septic shock.",
    ],
    biochemicalMechanism:
      "Rapidly de-esterified into active misoprostol acid. Interacts with myometrial EP3 receptors to increase intracellular calcium, driving myometrial contractility and cervical collagen remodeling.",
    hemodynamicProfile: "Mild vasodilation, peripheral cutaneous flushing, central thermoregulatory resetting.",
    adverseReactions: [
      "Violent shivering and rigors (> 50%)",
      "High fever / hyperpyrexia (> 40°C)",
      "Nausea, vomiting, abdominal cramping",
      "Diarrhea",
    ],
    isContraindicated: false,
  };

  const steps = {
    step1_oxytocin: oxytocin,
    step2_methergine: methergine,
    step3_carboprost: carboprost,
    step4_misoprostol: misoprostol,
  };

  const steppedSequence = [oxytocin, methergine, carboprost, misoprostol];

  const pearls = [
    "Stepped Algorithm Discipline: Oxytocin is always first-line. Methergine is second-line UNLESS hypertension/preeclampsia is present. Carboprost is third-line UNLESS asthma is present. Misoprostol is universally safe in asthma and hypertension.",
    "Hypertension Routing: If blood pressure is elevated, SKIP Methergine entirely and advance directly to Carboprost (or Misoprostol if asthma also present).",
    "Asthma Routing: If reactive airway disease or asthma is present, SKIP Carboprost entirely and utilize Methergine (if normotensive) or advance directly to Misoprostol.",
    "Dual Pathology (Hypertension + Asthma): Methergine is contraindicated due to HTN; Carboprost is contraindicated due to asthma. Misoprostol (600-1000 mcg sublingually/rectally) is the primary safe uterotonic.",
    "Tranexamic Acid (TXA) Adjuvant: In active PPH (WOMAN trial), 1 g IV TXA within 3 hours of delivery reduces death due to bleeding without increasing thromboembolic risk.",
  ];

  return {
    hasActivePph: hasPph,
    maternalHypertension: hasHt,
    maternalAsthma: hasAsthma,
    steps,
    steppedSequence,
    criticalSafetyBadges: {
      methergineHypertensionAlert: hasHt,
      carboprostAsthmaAlert: hasAsthma,
      oxytocinRapidPushAlert: true,
      oxytocinHyponatremiaAlert: hasProlongedOxytocin,
      misoprostolHyperthermiaAlert: true,
    },
    clinicalPearls: pearls,
  };
}

// ============================================================================
// 6. PILLAR 5: CRITICAL EMBRYOLOGICAL WINDOWS & CANONICAL TERATOGENS
// ============================================================================

export type EmbryologicalPhaseId = "pre_implantation" | "organogenesis" | "fetal_period";

export interface EmbryologicalPhaseProfile {
  id: EmbryologicalPhaseId;
  name: string;
  conceptionalWeeks: { min: number; max: number };
  gestationalWeeksFromLmp: { min: number; max: number };
  developmentalHallmarks: string[];
  teratogenSusceptibilityNature: string;
  primaryRiskType: "All-or-None" | "Major Structural Malformations" | "Functional Deficits & Fetopathy";
}

export const EMBRYOLOGICAL_PHASES: Record<EmbryologicalPhaseId, EmbryologicalPhaseProfile> = {
  pre_implantation: {
    id: "pre_implantation",
    name: "Pre-Implantation & Cleavage Phase",
    conceptionalWeeks: { min: 0, max: 2 },
    gestationalWeeksFromLmp: { min: 2, max: 4 },
    developmentalHallmarks: [
      "Fertilization, blastomere cleavage, morula formation.",
      "Blastocyst formation, zona pellucida shedding, implantation into endometrium.",
      "Totipotent and pluripotential embryonic cells.",
    ],
    teratogenSusceptibilityNature:
      "All-or-none period. An insult either destroys a critical number of totipotent blastomeres causing early unrecognized pregnancy loss/resorption, or surviving cells compensate completely, resulting in normal subsequent anatomical organ development.",
    primaryRiskType: "All-or-None",
  },
  organogenesis: {
    id: "organogenesis",
    name: "Embryonic Period (Organogenesis)",
    conceptionalWeeks: { min: 3, max: 8 },
    gestationalWeeksFromLmp: { min: 5, max: 10 },
    developmentalHallmarks: [
      "Neural tube closure (days 21-28 post-conception / GA ~5-6 weeks).",
      "Cardiac loop and septation (weeks 3-7 post-conception / GA ~5-9 weeks).",
      "Limb bud outgrowth and digit separation (weeks 4-8 post-conception / GA ~6-10 weeks).",
      "Craniofacial, otic, and palatal fusion (weeks 6-9 post-conception / GA ~8-11 weeks).",
    ],
    teratogenSusceptibilityNature:
      "CRITICAL PEAK VULNERABILITY WINDOW for gross structural anatomical teratogenesis. Cell division, tissue differentiation, and organ morphogenetic movements are at maximum velocity. Teratogenic exposures during these specific weeks produce permanent structural anomalies.",
    primaryRiskType: "Major Structural Malformations",
  },
  fetal_period: {
    id: "fetal_period",
    name: "Fetal Period",
    conceptionalWeeks: { min: 9, max: 38 },
    gestationalWeeksFromLmp: { min: 11, max: 40 },
    developmentalHallmarks: [
      "Growth, histogenesis, cellular differentiation, and physiological functional maturation.",
      "Cerebral cortical gyration and synaptogenesis.",
      "Nephrogenesis, pulmonary alveolar branching.",
      "External genitalia maturation.",
    ],
    teratogenSusceptibilityNature:
      "Vulnerability shifts away from major gross structural dysmorphology toward functional deficits, intellectual/neurocognitive disability, behavioral impairment, intrauterine growth restriction (IUGR), and tissue-specific fetopathies (e.g. renal tubular dysgenesis from ACE inhibitors, premature ductus arteriosus closure from NSAIDs).",
    primaryRiskType: "Functional Deficits & Fetopathy",
  },
};

export function getEmbryologicalPhase(gestationalAgeWeeksFromLmp: number): EmbryologicalPhaseProfile {
  const ga = Math.max(0, gestationalAgeWeeksFromLmp);
  if (ga <= 4.0) return EMBRYOLOGICAL_PHASES.pre_implantation;
  if (ga <= 10.0) return EMBRYOLOGICAL_PHASES.organogenesis;
  return EMBRYOLOGICAL_PHASES.fetal_period;
}

export type TeratogenCompoundId =
  | "ace_inhibitors_arbs"
  | "isotretinoin"
  | "valproic_acid"
  | "warfarin"
  | "methotrexate"
  | "thalidomide"
  | "lithium"
  | "nsaids_late"
  | "tetracyclines";

export interface CanonicalTeratogenProfile {
  id: TeratogenCompoundId;
  name: string;
  representativeDrugs: string[];
  peakVulnerabilityConceptionalWeeks: { min: number; max: number };
  peakVulnerabilityGestationalAgeWeeks: { min: number; max: number };
  molecularBiochemicalMechanism: string;
  characteristicPhenotypeSignature: string[];
  severityTier: "high_risk_major_teratogen" | "contraindicated_late_fetopathy" | "moderate_teratogen";
  clinicalManagementRail: string;
}

export const CANONICAL_TERATOGENS: Record<TeratogenCompoundId, CanonicalTeratogenProfile> = {
  ace_inhibitors_arbs: {
    id: "ace_inhibitors_arbs",
    name: "ACE Inhibitors & Angiotensin Receptor Blockers (ARBs)",
    representativeDrugs: ["Lisinopril", "Enalapril", "Losartan", "Valsartan", "Captopril", "Ramipril"],
    peakVulnerabilityConceptionalWeeks: { min: 11, max: 38 },
    peakVulnerabilityGestationalAgeWeeks: { min: 13, max: 40 }, // 2nd and 3rd trimester
    molecularBiochemicalMechanism:
      "Blockade of fetal angiotensin II AT1 receptors reduces fetal systemic blood pressure and eliminates angiotensin II-dependent efferent arteriolar tone in developing fetal nephrons. This causes profound fetal renal hypoperfusion, renal tubular dysgenesis, anuria, and severe oligohydramnios.",
    characteristicPhenotypeSignature: [
      "Potter Sequence secondary to severe oligohydramnios",
      "Pulmonary hypoplasia (lethal neonatal respiratory failure)",
      "Fetal renal tubular dysgenesis and neonatal anuria/renal failure",
      "Calvarial/skull hypoplasia and ossification defects (hypoplastic parietal/frontal bones)",
      "Limb contractures and clubbed feet",
      "Intrauterine growth restriction (IUGR) and fetal demise",
    ],
    severityTier: "contraindicated_late_fetopathy",
    clinicalManagementRail:
      "CONTRAINDICATED in the 2nd and 3rd trimesters. Immediate cessation upon pregnancy detection; transition to labetalol, nifedipine, or methyldopa. Evaluate amniotic fluid volume and fetal kidneys with targeted serial ultrasound if exposed.",
  },
  isotretinoin: {
    id: "isotretinoin",
    name: "Isotretinoin & Systemic Retinoids",
    representativeDrugs: ["Isotretinoin (Accutane)", "Acitretin", "Tretinoin (oral)"],
    peakVulnerabilityConceptionalWeeks: { min: 3, max: 8 },
    peakVulnerabilityGestationalAgeWeeks: { min: 5, max: 10 },
    molecularBiochemicalMechanism:
      "Exogenous retinoic acid binds nuclear retinoic acid receptors (RAR/RXR), disrupting homeobox (HOX) gene patterning and impairing cephalic and cardiac neural crest cell migration into the branchial arches and cardiac outflow tract.",
    characteristicPhenotypeSignature: [
      "Craniofacial anomalies: microtia, anotia, rudimentary external ears, low-set ears, cleft palate",
      "Conotruncal cardiovascular defects: transposition of great arteries, tetralogy of Fallot, truncus arteriosus, aortic arch hypoplasia",
      "Thymic aplasia / hypoplasia (cellular immunodeficiency)",
      "Central nervous system defects: hydrocephalus, microcephaly, cerebellar hypoplasia",
      "Spontaneous abortion occurs in ~40%; major malformations occur in ~25-30% of liveborn exposed infants",
    ],
    severityTier: "high_risk_major_teratogen",
    clinicalManagementRail:
      "ABSOLUTE CONTRAINDICATION in pregnancy (FDA Boxed Warning / iPLEDGE program). Mandatory two forms of contraception and monthly negative pregnancy tests before dispensing. Discontinue oral retinoids prior to conception (acitretin requires 3-year wash-out due to etretinate conversion).",
  },
  valproic_acid: {
    id: "valproic_acid",
    name: "Valproic Acid / Divalproex Sodium",
    representativeDrugs: ["Valproic acid", "Depakote", "Divalproex", "Sodium valproate"],
    peakVulnerabilityConceptionalWeeks: { min: 3, max: 8 },
    peakVulnerabilityGestationalAgeWeeks: { min: 5, max: 10 },
    molecularBiochemicalMechanism:
      "Direct inhibition of histone deacetylases (HDAC), disruption of folate-dependent one-carbon metabolism, generation of reactive oxygen species, and induction of neuroepithelial apoptosis during neural tube closure.",
    characteristicPhenotypeSignature: [
      "Neural tube defects: lumbar meningomyelocele / spina bifida (1-2% risk, ~10-20x baseline population)",
      "Characteristic 'Valproate Face': epicanthal folds, broad nasal bridge, anteverted nostrils, long philtrum, thin vermilion border",
      "Congenital cardiac anomalies: ventricular septal defects, aortic coarctation",
      "Limb reduction and axial skeletal defects",
      "Neurodevelopmental morbidity: 8 to 11 point reduction in childhood IQ, 3-fold higher incidence of autism spectrum disorders",
    ],
    severityTier: "high_risk_major_teratogen",
    clinicalManagementRail:
      "Avoid in women of childbearing potential unless no alternative exists. If unavoidable, keep total daily dose < 600-800 mg divided TID, and co-administer high-dose folic acid (4 mg daily) preconceptionally. Offer early AFP screening and level II targeted fetal anatomy ultrasound.",
  },
  warfarin: {
    id: "warfarin",
    name: "Warfarin (Vitamin K Antagonist)",
    representativeDrugs: ["Warfarin", "Coumadin"],
    peakVulnerabilityConceptionalWeeks: { min: 6, max: 9 },
    peakVulnerabilityGestationalAgeWeeks: { min: 8, max: 11 },
    molecularBiochemicalMechanism:
      "Inhibits vitamin K epoxide reductase (VKORC1), blocking post-translational gamma-carboxylation of osteocalcin and matrix Gla protein (essential for cartilage maturation and osteogenesis). Crosses placenta freely, causing fetal vitamin K deficiency and microvascular hemorrhage.",
    characteristicPhenotypeSignature: [
      "Warfarin Embryopathy (Weeks 6-9 exposure): Severe nasal hypoplasia ('saddle nose' deformity)",
      "Stippled epiphyses (chondrodysplasia punctata) visible on radiography",
      "Hypoplastic distal phalanges and brachydactyly",
      "2nd/3rd Trimester CNS Fetopathy: Fetal intracranial hemorrhage, microcephaly, optic atrophy, blindness, and developmental delay",
    ],
    severityTier: "high_risk_major_teratogen",
    clinicalManagementRail:
      "CONTRAINDICATED in pregnancy except under highly specialized mechanical heart valve protocols. Mandatory transition to Low Molecular Weight Heparin (LMWH, which does NOT cross the placenta) BEFORE 6 weeks gestation.",
  },
  methotrexate: {
    id: "methotrexate",
    name: "Methotrexate (Folate Antimetabolite)",
    representativeDrugs: ["Methotrexate", "Trexall"],
    peakVulnerabilityConceptionalWeeks: { min: 6, max: 8 },
    peakVulnerabilityGestationalAgeWeeks: { min: 8, max: 10 },
    molecularBiochemicalMechanism:
      "Competitive inhibition of dihydrofolate reductase (DHFR), halting production of tetrahydrofolate and blocking purine and thymidylate synthesis, causing mitotic arrest in rapidly dividing embryonic mesenchyme.",
    characteristicPhenotypeSignature: [
      "Methotrexate/Aminopterin Syndrome",
      "Cranial ossification failure, wide fontanelles, craniosynostosis ('cloverleaf skull')",
      "Micrognathia, retrognathia, cleft palate, low-set ears",
      "Limb anomalies: hypoplastic radius, syndactyly, absent digits",
      "Severe intrauterine growth restriction and spontaneous abortion",
    ],
    severityTier: "high_risk_major_teratogen",
    clinicalManagementRail:
      "CONTRAINDICATED in pregnancy (used pharmacologically for medical termination and ectopic pregnancy). Discontinue at least 3 months (or one complete ovulatory cycle) prior to planned conception. Administer high-dose folic acid.",
  },
  thalidomide: {
    id: "thalidomide",
    name: "Thalidomide & Analogues",
    representativeDrugs: ["Thalidomide", "Lenalidomide", "Pomalidomide"],
    peakVulnerabilityConceptionalWeeks: { min: 3, max: 6 }, // days 20 to 36 post-conception
    peakVulnerabilityGestationalAgeWeeks: { min: 5, max: 8 },
    molecularBiochemicalMechanism:
      "Binds cereblon (CRBN), the substrate recognition component of the CRL4-CRBN E3 ubiquitin ligase complex. Recruits transcription factor SALL4, promoting its ubiquitination and rapid proteasomal degradation, arresting limb bud outgrowth and branchial arch development.",
    characteristicPhenotypeSignature: [
      "Phocomelia: severe intercalary limb reduction defects ('seal limbs'), amelia",
      "Preaxial and radial ray limb hypoplasia",
      "Anotia, microtia, and sensorineural hearing loss",
      "Congenital cardiovascular malformations (VSD, truncus arteriosus)",
      "Ocular defects: microphthalmia, anophthalmia",
    ],
    severityTier: "high_risk_major_teratogen",
    clinicalManagementRail:
      "ABSOLUTE CONTRAINDICATION in pregnancy (Thalidomide REMS program). Requires stringent dual contraception and frequent pregnancy testing. Even a single dose during days 20-36 post-conception carries > 50% risk of devastating malformations.",
  },
  lithium: {
    id: "lithium",
    name: "Lithium",
    representativeDrugs: ["Lithium carbonate", "Lithobid"],
    peakVulnerabilityConceptionalWeeks: { min: 3, max: 8 },
    peakVulnerabilityGestationalAgeWeeks: { min: 5, max: 10 },
    molecularBiochemicalMechanism:
      "Interferes with inositol monophosphatase (IMPase) and glycogen synthase kinase-3beta (GSK-3beta) signaling pathways, disrupting cardiac looping and tricuspid valve morphogenesis.",
    characteristicPhenotypeSignature: [
      "Ebstein's anomaly: apical displacement of the tricuspid valve leaflets, severe tricuspid regurgitation, atrialization of the right ventricle (absolute risk ~1 in 1000 to 2000 vs 1 in 20,000 baseline)",
      "Neonatal hypotonia ('floppy infant syndrome')",
      "Neonatal nephrogenic diabetes insipidus and thyroid dysfunction",
    ],
    severityTier: "moderate_teratogen",
    clinicalManagementRail:
      "If maintained for severe bipolar disorder, perform fetal echocardiogram at 18-20 weeks gestation. Renal clearance surges in pregnancy, necessitating frequent serum level monitoring and postpartum dose reduction.",
  },
  nsaids_late: {
    id: "nsaids_late",
    name: "NSAIDs (Late Gestation / Third Trimester)",
    representativeDrugs: ["Indomethacin", "Ibuprofen", "Ketorolac", "Naproxen"],
    peakVulnerabilityConceptionalWeeks: { min: 26, max: 38 },
    peakVulnerabilityGestationalAgeWeeks: { min: 28, max: 40 },
    molecularBiochemicalMechanism:
      "Inhibition of cyclooxygenase (COX-1 / COX-2) blocks synthesis of vasodilatory prostaglandins (PGE2, PGI2) essential for maintaining patency of the fetal ductus arteriosus and maintaining fetal renal arteriolar perfusion.",
    characteristicPhenotypeSignature: [
      "Premature constriction or closure of the fetal ductus arteriosus",
      "Persistent pulmonary hypertension of the newborn (PPHN)",
      "Fetal oliguria and severe oligohydramnios",
      "Necrotizing enterocolitis and intracranial hemorrhage in preterm neonates",
    ],
    severityTier: "contraindicated_late_fetopathy",
    clinicalManagementRail:
      "Avoid NSAIDs after 28 weeks gestation, and CONTRAINDICATED at >= 32 weeks gestation. If indomethacin is used short-term (< 48h) for preterm tocolysis, perform serial fetal echocardiography to monitor ductus arteriosus flow velocity and amniotic fluid index.",
  },
  tetracyclines: {
    id: "tetracyclines",
    name: "Tetracyclines",
    representativeDrugs: ["Doxycycline", "Tetracycline", "Minocycline"],
    peakVulnerabilityConceptionalWeeks: { min: 14, max: 38 },
    peakVulnerabilityGestationalAgeWeeks: { min: 16, max: 40 },
    molecularBiochemicalMechanism:
      "Chelates calcium orthophosphate in developing fetal enamel and dentin matrices, incorporating permanently into active calcification zones.",
    characteristicPhenotypeSignature: [
      "Permanent brown/yellow discoloration of primary deciduous teeth",
      "Enamel hypoplasia",
      "Transient reversible inhibition of fetal fibular bone growth",
    ],
    severityTier: "moderate_teratogen",
    clinicalManagementRail:
      "Avoid in second and third trimesters. Short-term doxycycline for life-threatening vector-borne illness (e.g. Rocky Mountain spotted fever) remains indicated as benefit outweighs dental staining risk.",
  },
};

export interface EvaluatedTeratogenFinding {
  drugId: string;
  matchedCompound: CanonicalTeratogenProfile;
  isCurrentlyInVulnerabilityWindow: boolean;
  currentPhase: EmbryologicalPhaseProfile;
  actionMessage: string;
}

export function evaluateTeratogenRisk(
  drugIds: string[],
  gestationalAgeWeeksFromLmp: number = 7,
): {
  gestationalAgeWeeks: number;
  currentPhase: EmbryologicalPhaseProfile;
  findings: EvaluatedTeratogenFinding[];
  hasHighRiskTeratogen: boolean;
} {
  const currentPhase = getEmbryologicalPhase(gestationalAgeWeeksFromLmp);
  const normalized = drugIds.map((d) => d.toLowerCase().trim());
  const findings: EvaluatedTeratogenFinding[] = [];

  for (const teratogen of Object.values(CANONICAL_TERATOGENS)) {
    const matched = teratogen.representativeDrugs.some((drugName) => {
      const lower = drugName.toLowerCase();
      return normalized.some((id) => id.includes(lower) || lower.includes(id));
    });

    if (matched) {
      const inWindow =
        gestationalAgeWeeksFromLmp >= teratogen.peakVulnerabilityGestationalAgeWeeks.min &&
        gestationalAgeWeeksFromLmp <= teratogen.peakVulnerabilityGestationalAgeWeeks.max;

      let actionMessage = inWindow
        ? `CURRENTLY INSIDE CRITICAL VULNERABILITY WINDOW (Weeks ${teratogen.peakVulnerabilityGestationalAgeWeeks.min}-${teratogen.peakVulnerabilityGestationalAgeWeeks.max} GA). Urgent risk of ${teratogen.characteristicPhenotypeSignature[0]}.`
        : `Identified teratogenic profile. Peak vulnerability window is Weeks ${teratogen.peakVulnerabilityGestationalAgeWeeks.min}-${teratogen.peakVulnerabilityGestationalAgeWeeks.max} GA (patient currently at Week ${gestationalAgeWeeksFromLmp} GA).`;

      findings.push({
        drugId: teratogen.id,
        matchedCompound: teratogen,
        isCurrentlyInVulnerabilityWindow: inWindow,
        currentPhase,
        actionMessage,
      });
    }
  }

  return {
    gestationalAgeWeeks: gestationalAgeWeeksFromLmp,
    currentPhase,
    findings,
    hasHighRiskTeratogen: findings.some((f) => f.matchedCompound.severityTier === "high_risk_major_teratogen"),
  };
}

// ============================================================================
// 7. DESK TRAY DETECTION & COMPREHENSIVE REPORT GENERATOR
// ============================================================================

export interface ObstetricOnDeskResult {
  hasObstetricDrug: boolean;
  hasMagnesium: boolean;
  hasAntihypertensives: boolean;
  hasUterotonics: boolean;
  hasTeratogens: boolean;
  hasPregnancyPkAlteredDrugs: boolean;
  detectedMagnesiumIds: string[];
  detectedAntihypertensiveIds: string[];
  detectedUterotonicIds: string[];
  detectedTeratogenIds: string[];
  detectedPkAlteredIds: string[];
  allDetectedObstetricIds: string[];
}

const MAGNESIUM_KEYWORDS = ["magnesium", "magnesium sulfate", "magnesium_sulfate", "mgso4"];
const ANTIHYPERTENSIVE_KEYWORDS = ["labetalol", "hydralazine", "nifedipine", "methyldopa"];
const UTEROTONIC_KEYWORDS = ["oxytocin", "pitocin", "methylergonovine", "methergine", "carboprost", "hemabate", "misoprostol", "cytotec"];
const TERATOGEN_KEYWORDS = [
  "lisinopril", "enalapril", "losartan", "valsartan", "captopril", "ramipril",
  "isotretinoin", "accutane", "acitretin", "tretinoin",
  "valproate", "valproic", "divalproex", "depakote",
  "warfarin", "coumadin",
  "methotrexate",
  "thalidomide", "lenalidomide",
  "lithium",
  "indomethacin", "ibuprofen", "ketorolac", "naproxen",
  "doxycycline", "tetracycline",
];
const PK_ALTERED_KEYWORDS = [
  "ampicillin", "cefazolin", "piperacillin", "gentamicin", "enoxaparin", "lamotrigine", "phenytoin",
];

export function obstetricOnDesk(drugIds: string[]): ObstetricOnDeskResult {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());

  const hasMatch = (keywords: string[]) =>
    normalized.filter((id) => keywords.some((kw) => id.includes(kw) || kw.includes(id)));

  const detectedMagnesiumIds = hasMatch(MAGNESIUM_KEYWORDS);
  const detectedAntihypertensiveIds = hasMatch(ANTIHYPERTENSIVE_KEYWORDS);
  const detectedUterotonicIds = hasMatch(UTEROTONIC_KEYWORDS);
  const detectedTeratogenIds = hasMatch(TERATOGEN_KEYWORDS);
  const detectedPkAlteredIds = hasMatch(PK_ALTERED_KEYWORDS);

  const all = Array.from(
    new Set([
      ...detectedMagnesiumIds,
      ...detectedAntihypertensiveIds,
      ...detectedUterotonicIds,
      ...detectedTeratogenIds,
      ...detectedPkAlteredIds,
    ]),
  );

  return {
    hasObstetricDrug: all.length > 0,
    hasMagnesium: detectedMagnesiumIds.length > 0,
    hasAntihypertensives: detectedAntihypertensiveIds.length > 0,
    hasUterotonics: detectedUterotonicIds.length > 0,
    hasTeratogens: detectedTeratogenIds.length > 0,
    hasPregnancyPkAlteredDrugs: detectedPkAlteredIds.length > 0,
    detectedMagnesiumIds,
    detectedAntihypertensiveIds,
    detectedUterotonicIds,
    detectedTeratogenIds,
    detectedPkAlteredIds,
    allDetectedObstetricIds: all,
  };
}

export interface ObstetricReportOptions {
  gestationalAgeWeeks?: number;
  serumMagnesiumMgDl?: number;
  urineOutputMlHr?: number;
  serumCreatinineMgDl?: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  hasMaternalAsthma?: boolean;
  hasMaternalHypertension?: boolean;
  hasActivePph?: boolean;
  magnesiumInfusionRateGPerHour?: number;
}

export interface ObstetricReport {
  onDesk: ObstetricOnDeskResult;
  maternalPk: MaternalPkAdaptationSummary;
  magnesiumSulfate: MagnesiumEvaluationResult;
  acuteHypertension: AcuteHypertensionEvaluationResult;
  pphUterotonics: PphCascadeEvaluationResult;
  teratogenEvaluation: ReturnType<typeof evaluateTeratogenRisk>;
  activeAlerts: string[];
  canonicalCitations: { authorOrGroup: string; title: string; source: string; year: number }[];
  regulatoryDisclaimer: string;
}

export const CANONICAL_OBSTETRIC_CITATIONS = [
  {
    authorOrGroup: "American College of Obstetricians and Gynecologists (ACOG)",
    title: "Gestational Hypertension and Preeclampsia. Practice Bulletin No. 222",
    source: "Obstet Gynecol 2020; 135(6):e237-e260",
    year: 2020,
  },
  {
    authorOrGroup: "ACOG Committee on Obstetric Practice",
    title: "Emergent Therapy for Acute-Onset, Severe Hypertension During Pregnancy and the Postpartum Period. Committee Opinion No. 767",
    source: "Obstet Gynecol 2019; 133(2):e174-e180",
    year: 2019,
  },
  {
    authorOrGroup: "American College of Obstetricians and Gynecologists (ACOG)",
    title: "Postpartum Hemorrhage. Practice Bulletin No. 183",
    source: "Obstet Gynecol 2017; 130(4):e168-e186",
    year: 2017,
  },
  {
    authorOrGroup: "The Magpie Trial Collaborative Group",
    title: "Do women with pre-eclampsia, and their babies, benefit from magnesium sulphate? The Magpie Trial: a randomised placebo-controlled trial",
    source: "Lancet 2002; 359(9321):1877-1890",
    year: 2002,
  },
  {
    authorOrGroup: "Zuspan FP",
    title: "Problems encountered in the treatment of pregnancy-induced hypertension: a perspective of hypertension in pregnancy",
    source: "Am J Obstet Gynecol 1978; 131(6):591-597",
    year: 1978,
  },
  {
    authorOrGroup: "Pritchard JA, Cunningham FG, Pritchard SA",
    title: "The Parkland Memorial Hospital protocol for treatment of eclampsia: evaluation of 245 cases",
    source: "Am J Obstet Gynecol 1984; 148(7):951-963",
    year: 1984,
  },
  {
    authorOrGroup: "Costantine MM",
    title: "Physiologic and pharmacokinetic changes in pregnancy",
    source: "Front Pharmacol 2014; 5:65",
    year: 2014,
  },
  {
    authorOrGroup: "Briggs GG, Freeman RK, Towers CV, Fornes CA",
    title: "Drugs in Pregnancy and Lactation: A Reference Guide to Fetal and Neonatal Risk (12th Edition)",
    source: "Wolters Kluwer",
    year: 2021,
  },
];

export function obstetricReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: ObstetricReportOptions,
): ObstetricReport {
  const onDesk = obstetricOnDesk(drugIds);

  const ga = options?.gestationalAgeWeeks ?? 32;
  const maternalPk = calculateMaternalPkAdaptations(ga);

  const mgLevel = options?.serumMagnesiumMgDl ?? (onDesk.hasMagnesium ? 5.8 : 2.0);
  const scr = options?.serumCreatinineMgDl ?? (host.kidney === "ckd" ? 1.4 : 0.6);
  const uo = options?.urineOutputMlHr ?? (host.kidney === "ckd" ? 25 : 60);

  const magnesiumSulfate = evaluateMagnesiumSulfate({
    serumMagnesiumMgDl: mgLevel,
    urineOutputMlHr: uo,
    serumCreatinineMgDl: scr,
    infusionRateGPerHour: options?.magnesiumInfusionRateGPerHour ?? 2.0,
  });

  const sbp = options?.systolicBp ?? 150;
  const dbp = options?.diastolicBp ?? 95;
  const acuteHypertension = evaluateAcuteSevereHypertension({
    systolicBp: sbp,
    diastolicBp: dbp,
    heartRateBpm: options?.heartRateBpm ?? 80,
    hasAsthma: options?.hasMaternalAsthma ?? false,
    hasBradycardia: (options?.heartRateBpm ?? 80) < 60,
    hasHeartFailure: false,
    isReceivingMagnesium: onDesk.hasMagnesium,
  });

  const pphUterotonics = evaluatePphUterotonicCascade({
    hasActivePph: options?.hasActivePph ?? onDesk.hasUterotonics,
    hasMaternalHypertension: options?.hasMaternalHypertension ?? (sbp >= 140 || dbp >= 90),
    hasMaternalAsthma: options?.hasMaternalAsthma ?? false,
  });

  const teratogenEvaluation = evaluateTeratogenRisk(drugIds, ga);

  const activeAlerts: string[] = [];

  if (magnesiumSulfate.antidoteRequired) {
    activeAlerts.push(`CRITICAL MAGNESIUM TOXICITY: ${magnesiumSulfate.tierLabel}. Calcium Gluconate 10% 1 g IV indicated immediately.`);
  }
  if (magnesiumSulfate.renalAccumulationWarning) {
    activeAlerts.push("RENAL FAILURE MAGNESIUM ACCUMULATION TRAP: GFR impairment / oliguria. Reduce or hold magnesium infusion and check serial levels.");
  }
  if (acuteHypertension.isSevereHypertension) {
    activeAlerts.push(`ACUTE SEVERE HYPERTENSION (BP ${sbp}/${dbp} mmHg): Initiate ACOG first-line antihypertensive therapy within 30-60 min.`);
  }
  if (pphUterotonics.steps.step2_methergine.isContraindicated && onDesk.detectedUterotonicIds.some((id) => id.includes("methergine") || id.includes("ergonovine"))) {
    activeAlerts.push("CONTRAINDICATION: Methylergonovine on desk in a patient with maternal hypertension / preeclampsia. Stroke and hypertensive crisis hazard.");
  }
  if (pphUterotonics.steps.step3_carboprost.isContraindicated && onDesk.detectedUterotonicIds.some((id) => id.includes("carboprost") || id.includes("hemabate"))) {
    activeAlerts.push("CONTRAINDICATION: Carboprost (Hemabate) on desk in a patient with asthma. Severe refractory bronchospasm hazard.");
  }
  if (teratogenEvaluation.hasHighRiskTeratogen) {
    activeAlerts.push("MAJOR HIGH-RISK TERATOGEN DETECTED on desk. Review critical vulnerability window and embryopathy hazards.");
  }

  return {
    onDesk,
    maternalPk,
    magnesiumSulfate,
    acuteHypertension,
    pphUterotonics,
    teratogenEvaluation,
    activeAlerts,
    canonicalCitations: CANONICAL_OBSTETRIC_CITATIONS,
    regulatoryDisclaimer: OBSTETRIC_REGULATORY_NOTICE,
  };
}
