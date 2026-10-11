/**
 * Pediatric & Neonatal Developmental Pharmacokinetics, Organ Ontogeny & Safety Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed pediatricians, pediatric intensivists (PICU/NICU), pediatric
 *   pharmacotherapy specialists (PharmD / BCPPS), and supervised health-professions trainees.
 * - Displays transparent physiological, developmental, and pharmacokinetic formulas derived
 *   from canonical peer-reviewed literature:
 *   1. Kearns GL, et al. Developmental pharmacology—drug disposition, action, and therapy
 *      in infants and children. N Engl J Med. 2003;349(12):1157-1167.
 *   2. Schwartz GJ, et al. New equations to estimate GFR in children with CKD.
 *      J Am Soc Nephrol. 2009;20(3):629-637.
 *   3. Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.
 *   4. Haycock GB, et al. Surface area of children: a minireview. J Pediatr. 1978;93(1):62-66.
 *   5. Robertson A, et al. Bilirubin displacing capacity of ceftriaxone in neonates.
 *      J Pediatr. 1988;112(5):804-808.
 *   6. AAP Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the
 *      Newborn Infant 35 or More Weeks of Gestation. Pediatrics. 2022;150(3):e2022058859.
 *   7. FDA Drug Safety Communication: FDA restricts use of prescription codeine and tramadol
 *      medicines in children; recommends against use in breastfeeding women (2017/2018).
 *   8. Weiss CF, et al. Chloramphenicol in the newborn infant: A physiologic explanation of its
 *      toxicity (Gray Baby Syndrome). N Engl J Med. 1960;262(16):787-794.
 *   9. CDC / FDA: Gasping syndrome and benzyl alcohol in neonates. MMWR 1982;31(22):290-291.
 *   10. AAP Committee on Drugs: "Inactive" ingredients in pharmaceutical products: update (subject
 *       review). Pediatrics. 1997;99(2):268-278 (Propylene glycol hyperosmolality & lactic acidosis).
 * - Strictly non-prescriptive: educational reference ranges, ontogeny models, and interaction warnings.
 *   Does not generate closed-loop infusion commands, prescriptive dosing orders, or diagnostic mandates.
 */

import type { HostContext } from "./types";

// ============================================================================
// 1. REGULATORY DISCLAIMERS & STATUTORY POSTURE
// ============================================================================

export const NOT_CLEARED =
  "Educational & pediatric pharmacotherapy reference only. Not an FDA-cleared medical device, dosing directive, or diagnostic mandate. Licensed pediatrician / pediatric pharmacist verification required under FD&C Act § 520(o)(1)(E).";

export const PI_FOOTER =
  "Developmental ontogeny models reflect AAP, Kearns et al., Schwartz et al., and peer-reviewed literature. Serial clinical assessment, therapeutic drug monitoring, and individual renal/hepatic maturation govern bedside clinical care.";

export const PEDIATRIC_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational pediatric pharmacokinetics, developmental organ ontogeny, bilirubin displacement kinetics, and excipient toxicity reference engine is intended solely for licensed healthcare professionals (pediatricians, pediatric intensivists, pediatric clinical pharmacists) and supervised trainees. It models developmental renal GFR maturation, hepatic CYP/UGT ontogeny shifts, kernicterus bilirubin displacement, excipient toxicities (propylene glycol, benzyl alcohol), FDA boxed warnings, and bedside allometric scaling. It displays transparent physiological and biochemical mechanisms with peer-reviewed literature citations to enable independent clinical review. STRICTLY NON-PRESCRIPTIVE: Does not generate patient-specific medical orders, prescription directives, or closed-loop infusion pump controls.";

export const PEDIATRIC_REGULATORY_NOTICE = `${PEDIATRIC_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`;

// ============================================================================
// 2. CORE TYPES & CONTEXT INTERFACES
// ============================================================================

export type DevelopmentalStage =
  | "extremely-preterm"
  | "very-preterm"
  | "moderate-late-preterm"
  | "term-neonate"
  | "infant"
  | "toddler"
  | "early-childhood"
  | "child"
  | "adolescent"
  | "adult";

export interface PediatricContext {
  gestationalAgeWeeks?: number; // e.g. 24-42, default 40 for term
  postnatalAgeDays?: number; // chronological days after birth
  postnatalAgeMonths?: number;
  postnatalAgeYears?: number;
  weightKg?: number; // 0.4 to 120 kg
  heightCm?: number; // 25 to 200 cm
  serumCreatinineMgDl?: number; // enzymatic / IDMS-traceable SCr
  isPostTonsillectomy?: boolean; // T&A status for codeine/tramadol contraindication
  isHyperbilirubinemic?: boolean; // jaundice / elevated unconjugated bilirubin
  hasIvCalciumActive?: boolean; // co-administered IV calcium (ceftriaxone precipitation risk)
  indication?: string;
}

export interface PediatricAgeSummary {
  chronologicalAgeText: string;
  totalPostnatalDays: number;
  postnatalYears: number;
  gestationalAgeWeeks: number;
  postmenstrualAgeWeeks: number; // PMA = GA + (PNA in days / 7)
  isPreterm: boolean;
  isNeonate: boolean; // <= 28 days
  isInfant: boolean; // < 1 year
  isChildUnder12: boolean;
  isChildUnder8: boolean;
  isPediatricPatient: boolean; // < 18 years
  developmentalStage: DevelopmentalStage;
  stageLabel: string;
  developmentalPhysiologySummary: string;
}

export function computePediatricAgeSummary(context: PediatricContext): PediatricAgeSummary {
  const gaWeeks = context.gestationalAgeWeeks ?? 40;
  let totalDays = 0;

  if (context.postnatalAgeDays !== undefined) {
    totalDays += context.postnatalAgeDays;
  }
  if (context.postnatalAgeMonths !== undefined) {
    totalDays += Math.round(context.postnatalAgeMonths * 30.4375);
  }
  if (context.postnatalAgeYears !== undefined) {
    totalDays += Math.round(context.postnatalAgeYears * 365.25);
  }

  // If no age supplied, default to 1 year infant baseline
  if (
    context.postnatalAgeDays === undefined &&
    context.postnatalAgeMonths === undefined &&
    context.postnatalAgeYears === undefined
  ) {
    totalDays = 365;
  }

  const pnaYears = Number((totalDays / 365.25).toFixed(2));
  const pmaWeeks = Number((gaWeeks + totalDays / 7).toFixed(1));
  const isPreterm = gaWeeks < 37;
  const isNeonate = totalDays <= 28;
  const isInfant = totalDays < 365;
  const isChildUnder12 = pnaYears < 12;
  const isChildUnder8 = pnaYears < 8;
  const isPediatricPatient = pnaYears < 18;

  let developmentalStage: DevelopmentalStage = "child";
  let stageLabel = "Child";
  let developmentalPhysiologySummary = "";

  if (gaWeeks < 28 && isNeonate) {
    developmentalStage = "extremely-preterm";
    stageLabel = "Extremely Preterm Neonate (< 28 weeks GA)";
    developmentalPhysiologySummary =
      "Incomplete nephrogenesis (active until 34-36w), very low GFR (15-20 mL/min/1.73m²), total body water ~85-90%, minimal CYP3A4/CYP1A2/UGT activity, highly permeable blood-brain barrier.";
  } else if (gaWeeks >= 28 && gaWeeks < 32 && isNeonate) {
    developmentalStage = "very-preterm";
    stageLabel = "Very Preterm Neonate (28 to < 32 weeks GA)";
    developmentalPhysiologySummary =
      "Active nephrogenesis, low GFR, high total body water (~80-85%), predominant CYP3A7 expression, immature glucuronidation.";
  } else if (gaWeeks >= 32 && gaWeeks < 37 && isNeonate) {
    developmentalStage = "moderate-late-preterm";
    stageLabel = "Moderate to Late Preterm Neonate (32 to < 37 weeks GA)";
    developmentalPhysiologySummary =
      "Nephrogenesis nearing completion (~34-36w), GFR rapidly climbing, total body water ~75-80%, transitional CYP expression.";
  } else if (isNeonate) {
    developmentalStage = "term-neonate";
    stageLabel = "Full-Term Neonate (0 to 28 days)";
    developmentalPhysiologySummary =
      "Nephrogenesis complete (approx. 1 million nephrons per kidney), baseline GFR 30-40 mL/min/1.73m² at days 1-3 rising to 50-60 mL/min/1.73m² by 2 weeks; total body water ~75%, albumin binding capacity diminished, CYP3A7 dominant with minimal CYP1A2 and low CYP3A4.";
  } else if (isInfant) {
    developmentalStage = "infant";
    stageLabel = "Infant (29 days to 12 months)";
    developmentalPhysiologySummary =
      "Rapid organ maturation: GFR climbs to 80-100 mL/min/1.73m² by 6-12 months. CYP3A4 expression ascends to adult levels. CYP1A2 gradually surfaces (~50% adult by 1 year). Total body water contracts toward 60%.";
  } else if (pnaYears < 3) {
    developmentalStage = "toddler";
    stageLabel = "Toddler (1 to 3 years)";
    developmentalPhysiologySummary =
      "Renal GFR reaches adult normalized values (~120 mL/min/1.73m²). Relative liver volume per kg exceeds adult proportions, resulting in high metabolic clearance per kg for CYP3A4 substrates.";
  } else if (pnaYears < 6) {
    developmentalStage = "early-childhood";
    stageLabel = "Early Childhood (2 to 6 years)";
    developmentalPhysiologySummary =
      "Peak drug metabolic clearance per kilogram of body weight. Hepatic CYP3A4 and renal elimination capacity often exceed adult rates on a mg/kg basis.";
  } else if (pnaYears < 12) {
    developmentalStage = "child";
    stageLabel = "Child (6 to 11 years)";
    developmentalPhysiologySummary =
      "Stable mature renal and hepatic clearances approaching adult rates per BSA. Skeletal and dental enamel active calcification.";
  } else if (pnaYears < 18) {
    developmentalStage = "adolescent";
    stageLabel = "Adolescent (12 to 17 years)";
    developmentalPhysiologySummary =
      "Pubertal hormonal surge (sex steroids influence CYP3A and renal hemodynamics). Body composition shifts (increase in muscle mass in males, adipose in females). Adult pharmacokinetic profiles attained.";
  } else {
    developmentalStage = "adult";
    stageLabel = "Adult (≥ 18 years)";
    developmentalPhysiologySummary =
      "Mature adult pharmacokinetic and organ clearance physiology.";
  }

  let chronologicalAgeText = "";
  if (totalDays <= 30) {
    chronologicalAgeText = `${totalDays} day${totalDays === 1 ? "" : "s"}`;
  } else if (totalDays < 365) {
    const months = Number((totalDays / 30.4375).toFixed(1));
    chronologicalAgeText = `${months} months (${totalDays} days)`;
  } else {
    chronologicalAgeText = `${pnaYears} years (${totalDays} days)`;
  }

  return {
    chronologicalAgeText,
    totalPostnatalDays: totalDays,
    postnatalYears: pnaYears,
    gestationalAgeWeeks: gaWeeks,
    postmenstrualAgeWeeks: pmaWeeks,
    isPreterm,
    isNeonate,
    isInfant,
    isChildUnder12,
    isChildUnder8,
    isPediatricPatient,
    developmentalStage,
    stageLabel,
    developmentalPhysiologySummary,
  };
}

// ============================================================================
// 3. PILLAR 1: DEVELOPMENTAL ORGAN ONTOGENY
// ============================================================================

export interface RenalGfrBracket {
  ageLabel: string;
  minGfr: number; // mL/min/1.73m²
  maxGfr: number; // mL/min/1.73m²
  meanGfr: number;
  developmentalMilestone: string;
}

export const RENAL_GFR_MATURATION_CURVE: RenalGfrBracket[] = [
  {
    ageLabel: "Preterm (24-28 weeks GA)",
    minGfr: 15,
    maxGfr: 20,
    meanGfr: 17.5,
    developmentalMilestone:
      "Active nephrogenesis. Low renal perfusion pressure, high renal vascular resistance, immature glomerular podocyte slit diaphragms.",
  },
  {
    ageLabel: "Preterm (29-36 weeks GA)",
    minGfr: 20,
    maxGfr: 30,
    meanGfr: 25,
    developmentalMilestone:
      "Completing nephrogenesis (concludes at ~34-36 weeks). Glomerular filtration area expanding.",
  },
  {
    ageLabel: "Full-term neonate (day 1-3)",
    minGfr: 30,
    maxGfr: 40,
    meanGfr: 35,
    developmentalMilestone:
      "Postnatal systemic vascular resistance surge drops renal vascular resistance; renal blood flow rises from 5% to 10% of cardiac output.",
  },
  {
    ageLabel: "Term neonate (1-2 weeks)",
    minGfr: 50,
    maxGfr: 60,
    meanGfr: 55,
    developmentalMilestone:
      "Rapid post-birth glomerular recruitment, doubling of functional clearance relative to day 1.",
  },
  {
    ageLabel: "Infant (1-5 months)",
    minGfr: 60,
    maxGfr: 80,
    meanGfr: 70,
    developmentalMilestone:
      "Progressive tubular and glomerular maturation, expanding functional renal reserve.",
  },
  {
    ageLabel: "Infant (6-12 months)",
    minGfr: 80,
    maxGfr: 100,
    meanGfr: 90,
    developmentalMilestone:
      "Tubular transport capacity and glomerular surface area reach near-adult density per BSA.",
  },
  {
    ageLabel: "Child (1-2 years & older)",
    minGfr: 100,
    maxGfr: 140,
    meanGfr: 120,
    developmentalMilestone:
      "Full adult baseline normalized GFR reached (~120 mL/min/1.73m²). Renal drug clearance achieves mature kinetic capacity.",
  },
];

export function getExpectedNormalGfrRange(
  gestationalAgeWeeks: number,
  postnatalAgeDays: number,
): RenalGfrBracket {
  if (gestationalAgeWeeks < 29 && postnatalAgeDays <= 7) {
    return RENAL_GFR_MATURATION_CURVE[0]; // 15-20
  }
  if (gestationalAgeWeeks < 37 && postnatalAgeDays <= 7) {
    return RENAL_GFR_MATURATION_CURVE[1]; // 20-30
  }
  if (postnatalAgeDays <= 3) {
    return RENAL_GFR_MATURATION_CURVE[2]; // 30-40
  }
  if (postnatalAgeDays <= 14) {
    return RENAL_GFR_MATURATION_CURVE[3]; // 50-60
  }
  if (postnatalAgeDays <= 150) {
    return RENAL_GFR_MATURATION_CURVE[4]; // 60-80
  }
  if (postnatalAgeDays <= 365) {
    return RENAL_GFR_MATURATION_CURVE[5]; // 80-100
  }
  return RENAL_GFR_MATURATION_CURVE[6]; // ~120
}

export interface RenalOntogenyAssessment {
  expectedNormalGfrBracket: RenalGfrBracket;
  schwartzEgfr?: number; // mL/min/1.73m²
  isEgfrDepressedForAge?: boolean;
  clinicalInterpretation: string;
  renalClearanceMaturationFraction: number; // 0.12 to 1.0 (relative to adult 120 mL/min/1.73m²)
  nephrogenesisStatus: string;
}

export function evaluateRenalOntogeny(
  ageSummary: PediatricAgeSummary,
  heightCm?: number,
  serumCreatinineMgDl?: number,
): RenalOntogenyAssessment {
  const expectedBracket = getExpectedNormalGfrRange(
    ageSummary.gestationalAgeWeeks,
    ageSummary.totalPostnatalDays,
  );

  let schwartzEgfr: number | undefined;
  let isEgfrDepressedForAge: boolean | undefined;

  if (heightCm && serumCreatinineMgDl && serumCreatinineMgDl > 0) {
    // Bedside Schwartz Equation: (0.413 * height_cm) / SCr
    schwartzEgfr = Number(((0.413 * heightCm) / serumCreatinineMgDl).toFixed(1));
    isEgfrDepressedForAge = schwartzEgfr < expectedBracket.minGfr;
  }

  const maturationFraction = Number(
    Math.min(1.0, expectedBracket.meanGfr / 120).toFixed(2),
  );

  let nephrogenesisStatus = "";
  if (ageSummary.gestationalAgeWeeks < 34) {
    nephrogenesisStatus =
      "Active antenatal glomerulogenesis. Nephron formation ongoing in nephrogenic zone; vulnerable to nephrotoxic injury (NSAIDs, aminoglycosides).";
  } else if (ageSummary.gestationalAgeWeeks < 37) {
    nephrogenesisStatus =
      "Nephrogenesis completing. Nephron endowment fixed (~800,000 to 1,200,000 nephrons). Maturation driven by renal blood flow expansion.";
  } else {
    nephrogenesisStatus =
      "Nephrogenesis complete. Progressive postnatal drop in renal vascular resistance drives physiological GFR ascent.";
  }

  let clinicalInterpretation = `Expected developmental normal GFR for ${expectedBracket.ageLabel}: ${expectedBracket.minGfr} to ${expectedBracket.maxGfr} mL/min/1.73m² (mean ~${expectedBracket.meanGfr} mL/min/1.73m²). Maturation level is ~${Math.round(maturationFraction * 100)}% of adult capacity.`;

  if (schwartzEgfr !== undefined) {
    if (isEgfrDepressedForAge) {
      clinicalInterpretation += ` Calculated Bedside Schwartz eGFR is ${schwartzEgfr} mL/min/1.73m², which is DEPRESSED below the expected developmental baseline (${expectedBracket.minGfr}-${expectedBracket.maxGfr} mL/min/1.73m²). Dose adjustment for renally cleared drugs (e.g., beta-lactams, aminoglycosides, vancomycin) indicated.`;
    } else {
      clinicalInterpretation += ` Calculated Bedside Schwartz eGFR is ${schwartzEgfr} mL/min/1.73m², concordant with developmental maturation expectations.`;
    }
  }

  return {
    expectedNormalGfrBracket: expectedBracket,
    schwartzEgfr,
    isEgfrDepressedForAge,
    clinicalInterpretation,
    renalClearanceMaturationFraction: maturationFraction,
    nephrogenesisStatus,
  };
}

// ----------------------------------------------------------------------------
// Hepatic CYP & UGT Ontogeny
// ----------------------------------------------------------------------------

export interface HepaticEnzymeOntogeny {
  enzyme: string;
  maturationPercentOfAdult: number; // 0 to 200%
  developmentalTrajectory: string;
  fetalVsPostnatalPattern: string;
  clinicalSignificance: string;
}

export interface HepaticOntogenyAssessment {
  cyp3a7: HepaticEnzymeOntogeny;
  cyp3a4: HepaticEnzymeOntogeny;
  cyp1a2: HepaticEnzymeOntogeny;
  cyp2d6: HepaticEnzymeOntogeny;
  cyp2c19: HepaticEnzymeOntogeny;
  ugt2b7: HepaticEnzymeOntogeny;
  caffeineHalfLifePredictionHours: number;
  caffeineHalfLifeRangeText: string;
  ontogenySummary: string;
}

export function evaluateHepaticOntogeny(ageSummary: PediatricAgeSummary): HepaticOntogenyAssessment {
  const days = ageSummary.totalPostnatalDays;
  const years = ageSummary.postnatalYears;

  // CYP3A7: Fetal isoform, peak at birth, declines rapidly over first months
  let cyp3a7Percent = 100;
  if (days <= 7) cyp3a7Percent = 100;
  else if (days <= 30) cyp3a7Percent = 75;
  else if (days <= 90) cyp3a7Percent = 35;
  else if (days <= 365) cyp3a7Percent = 10;
  else cyp3a7Percent = 0;

  // CYP3A4: Low at birth (~10%), reaches adult at 1-2 years, exceeds adult (120-160%) at 2-6 years
  let cyp3a4Percent = 10;
  if (days <= 3) cyp3a4Percent = 10;
  else if (days <= 28) cyp3a4Percent = 25;
  else if (days <= 180) cyp3a4Percent = 50;
  else if (days <= 365) cyp3a4Percent = 80;
  else if (years < 2) cyp3a4Percent = 100;
  else if (years <= 6) cyp3a4Percent = 150; // exceeds adult clearance/kg
  else if (years <= 12) cyp3a4Percent = 120;
  else cyp3a4Percent = 100;

  // CYP1A2: Very slow maturation (undetectable at birth, ~50% at 1 year, adult at 1-2 years)
  let cyp1a2Percent = 1;
  let caffeineHours = 80;
  let caffeineRange = "65 to 100 hours";

  if (ageSummary.isPreterm && days <= 28) {
    cyp1a2Percent = 1;
    caffeineHours = 85;
    caffeineRange = "65 to 100 hours (prolonged 16-25x vs adult 4h!)";
  } else if (days <= 7) {
    cyp1a2Percent = 2;
    caffeineHours = 40;
    caffeineRange = "30 to 60 hours";
  } else if (days <= 30) {
    cyp1a2Percent = 10;
    caffeineHours = 24;
    caffeineRange = "18 to 36 hours";
  } else if (days <= 180) {
    cyp1a2Percent = 30;
    caffeineHours = 8;
    caffeineRange = "6 to 12 hours";
  } else if (days <= 365) {
    cyp1a2Percent = 50;
    caffeineHours = 4.5;
    caffeineRange = "3.5 to 5.5 hours";
  } else if (years <= 6) {
    cyp1a2Percent = 130;
    caffeineHours = 2.5;
    caffeineRange = "2 to 3.5 hours (hyper-clearance in young children)";
  } else {
    cyp1a2Percent = 100;
    caffeineHours = 4.0;
    caffeineRange = "3 to 5 hours (adult normal)";
  }

  // CYP2D6: Maturation over first weeks to months
  let cyp2d6Percent = 20;
  if (days <= 7) cyp2d6Percent = 20;
  else if (days <= 28) cyp2d6Percent = 40;
  else if (days <= 180) cyp2d6Percent = 70;
  else cyp2d6Percent = 100;

  // CYP2C19: Maturation over first weeks to months
  let cyp2c19Percent = 15;
  if (days <= 7) cyp2c19Percent = 15;
  else if (days <= 28) cyp2c19Percent = 35;
  else if (days <= 180) cyp2c19Percent = 75;
  else cyp2c19Percent = 100;

  // UGT2B7 (chloramphenicol, morphine glucuronidation): very low at birth (~10%)
  let ugt2b7Percent = 10;
  if (days <= 7) ugt2b7Percent = 10;
  else if (days <= 28) ugt2b7Percent = 25;
  else if (days <= 180) ugt2b7Percent = 50;
  else if (days <= 365) ugt2b7Percent = 80;
  else ugt2b7Percent = 100;

  const cyp3a7: HepaticEnzymeOntogeny = {
    enzyme: "CYP3A7",
    maturationPercentOfAdult: cyp3a7Percent,
    developmentalTrajectory: "Fetal-specific isoform; peaks at birth, declines steeply over first 1-3 months.",
    fetalVsPostnatalPattern: "Dominates fetal liver (>50% total CYP). Silenced postnatally as CYP3A4 activates.",
    clinicalSignificance: "Metabolizes dehydroepiandrosterone (DHEA-S) and fetal retinoic acid. Weak affinity for adult drug substrates.",
  };

  const cyp3a4: HepaticEnzymeOntogeny = {
    enzyme: "CYP3A4",
    maturationPercentOfAdult: cyp3a4Percent,
    developmentalTrajectory: "Low at birth (~10%), matures by 1-2 years; clearance per kg exceeds adult by 1.5x in early childhood (2-6y).",
    fetalVsPostnatalPattern: "Postnatal activation following cortisol/hormonal triggers at delivery.",
    clinicalSignificance:
      "Clears midazolam, fentanyl, macrolides, tacrolimus. Young children (2-6y) frequently require higher mg/kg doses due to relative hepatomegaly (liver mass ~4% of body weight vs 2% in adults).",
  };

  const cyp1a2: HepaticEnzymeOntogeny = {
    enzyme: "CYP1A2",
    maturationPercentOfAdult: cyp1a2Percent,
    developmentalTrajectory:
      "Slowest CYP maturation: undetectable at birth (<1%), ~50% at 1 year, adult levels by 1-2 years.",
    fetalVsPostnatalPattern: "Not expressed in fetus; dependent on environmental and dietary xenobiotic exposure.",
    clinicalSignificance:
      "Primary enzyme for caffeine and theophylline. Explains dramatic caffeine half-life prolongation (65-100h in preterm neonates vs 4h in adults), allowing once-daily caffeine citrate dosing in apnea of prematurity.",
  };

  const cyp2d6: HepaticEnzymeOntogeny = {
    enzyme: "CYP2D6",
    maturationPercentOfAdult: cyp2d6Percent,
    developmentalTrajectory: "Matures over first weeks to months after birth.",
    fetalVsPostnatalPattern: "Minimal in mid-gestation, activates rapidly after birth.",
    clinicalSignificance:
      "Converts codeine -> morphine and tramadol -> M1. Pharmacogenetic polymorphism (UM vs PM) superimposed on immature baseline creates extreme danger in pediatrics.",
  };

  const cyp2c19: HepaticEnzymeOntogeny = {
    enzyme: "CYP2C19",
    maturationPercentOfAdult: cyp2c19Percent,
    developmentalTrajectory: "Matures over first weeks to months (reaches adult capacity by 6-12 months).",
    fetalVsPostnatalPattern: "Detectable at low levels (~15%) at birth.",
    clinicalSignificance:
      "Clears proton pump inhibitors, voriconazole, diazepam, phenobarbital.",
  };

  const ugt2b7: HepaticEnzymeOntogeny = {
    enzyme: "UGT2B7",
    maturationPercentOfAdult: ugt2b7Percent,
    developmentalTrajectory: "Severely deficient in neonates (~10% adult), matures progressively across the first year.",
    fetalVsPostnatalPattern: "Suppressed antenatally.",
    clinicalSignificance:
      "Critical for chloramphenicol and morphine glucuronidation. Deficiency underlies Gray Baby Syndrome in neonates receiving chloramphenicol.",
  };

  const ontogenySummary = `Hepatic metabolic profile for ${ageSummary.stageLabel}: CYP3A4 is at ~${cyp3a4Percent}% adult capacity; CYP1A2 is at ~${cyp1a2Percent}%; UGT2B7 glucuronidation is at ~${ugt2b7Percent}%. Predicted caffeine half-life is ${caffeineRange}.`;

  return {
    cyp3a7,
    cyp3a4,
    cyp1a2,
    cyp2d6,
    cyp2c19,
    ugt2b7,
    caffeineHalfLifePredictionHours: caffeineHours,
    caffeineHalfLifeRangeText: caffeineRange,
    ontogenySummary,
  };
}

// ============================================================================
// 4. PILLAR 2: NEONATAL HYPERBILIRUBINEMIA & KERNICTERUS ALBUMIN DISPLACEMENT
// ============================================================================

export interface KernicterusAssessment {
  ceftriaxoneDisplacementDetected: boolean;
  sulfamethoxazoleDisplacementDetected: boolean;
  isNeonateContraindicated: boolean; // <= 28 days
  isInfantSulfamethoxazoleContraindicated: boolean; // < 2 months
  calciumPrecipitationHazard: boolean;
  hyperbilirubinemiaCompoundingHazard: boolean;
  pathophysiology: string;
  severity: "CRITICAL_CONTRAINDICATION" | "HIGH_ALERT_WARNING" | "BENIGN";
  recommendedAlternatives: string[];
  clinicalActionMandate: string;
}

export function evaluateKernicterusAndDisplacement(options: {
  drugIds: string[];
  ageSummary: PediatricAgeSummary;
  isHyperbilirubinemic?: boolean;
  hasIvCalciumActive?: boolean;
}): KernicterusAssessment {
  const normalized = options.drugIds.map((d) => d.toLowerCase());
  const hasCeftriaxone = normalized.some((d) => d.includes("ceftriaxone"));
  const hasSulfamethoxazole = normalized.some(
    (d) =>
      d.includes("sulfamethoxazole") ||
      d.includes("bactrim") ||
      d.includes("septra") ||
      d.includes("cotrimoxazole") ||
      d.includes("trimethoprim-sulfamethoxazole") ||
      d.includes("smx"),
  );

  const isNeonate = options.ageSummary.totalPostnatalDays <= 28;
  const isUnder2Months = options.ageSummary.totalPostnatalDays < 60;
  const hasCalcium = options.hasIvCalciumActive ?? false;
  const hasJaundice = options.isHyperbilirubinemic ?? false;

  let ceftriaxoneContraindicated = false;
  let sulfamethoxazoleContraindicated = false;
  let calciumPrecipitationHazard = false;
  let hyperbilirubinemiaCompoundingHazard = false;
  const alternatives: string[] = [];
  const actionAlerts: string[] = [];

  if (hasCeftriaxone) {
    if (isNeonate) {
      ceftriaxoneContraindicated = true;
      alternatives.push("Cefotaxime IV (third-generation cephalosporin with low albumin displacement)");
      alternatives.push("Ampicillin IV + Gentamicin IV (gold-standard empiric neonatal sepsis regimen)");
      alternatives.push("Cefepime IV (if antipseudomonal third/fourth-generation coverage required)");

      if (hasCalcium) {
        calciumPrecipitationHazard = true;
        actionAlerts.push(
          "FATAL CALCIUM-CEFTRIAXONE PRECIPITATION HAZARD: Co-administration of IV ceftriaxone with IV calcium-containing solutions (including total parenteral nutrition / TPN or calcium gluconate) in neonates ≤ 28 days precipitates insoluble crystalline ceftriaxone-calcium salts in pulmonary and renal microvasculature, causing fatal pulmonary and renal embolization!",
        );
      }

      if (hasJaundice) {
        hyperbilirubinemiaCompoundingHazard = true;
        actionAlerts.push(
          "SEVERE KERNICTERUS ENCEPHALOPATHY HAZARD: High albumin-binding affinity of ceftriaxone (~95%) competitively displaces unconjugated bilirubin from human serum albumin. In the presence of neonatal hyperbilirubinemia, free lipophilic bilirubin traverses the immature blood-brain barrier and deposits in the basal ganglia (globus pallidus, subthalamic nucleus), triggering acute bilirubin encephalopathy and irreversible kernicterus (choreoathetoid cerebral palsy, sensorineural deafness).",
        );
      } else {
        actionAlerts.push(
          "MANDATORY FDA CONTRAINDICATION: Ceftriaxone is strictly contraindicated in neonates ≤ 28 days of age due to risk of kernicterus from albumin bilirubin displacement, regardless of baseline bilirubin level.",
        );
      }
    }
  }

  if (hasSulfamethoxazole) {
    if (isUnder2Months) {
      sulfamethoxazoleContraindicated = true;
      alternatives.push("Amoxicillin or Amoxicillin-Clavulanate");
      alternatives.push("Cephalexin or Cefdinir");
      actionAlerts.push(
        "MANDATORY CONTRAINDICATION: Sulfamethoxazole (Bactrim / TMP-SMX) is contraindicated in infants < 2 months of age (≤ 60 days). Sulfonamides competitively displace unconjugated bilirubin from albumin, precipitating kernicterus.",
      );
    }
  }

  const isAnyContraindicated = ceftriaxoneContraindicated || sulfamethoxazoleContraindicated;
  const severity: KernicterusAssessment["severity"] = isAnyContraindicated
    ? "CRITICAL_CONTRAINDICATION"
    : hasCeftriaxone || hasSulfamethoxazole
      ? "HIGH_ALERT_WARNING"
      : "BENIGN";

  const pathophysiology =
    "Neonatal serum albumin has lower binding affinity and lower circulating concentration. Highly protein-bound acidic drugs (ceftriaxone ~95%, sulfonamides) displace unconjugated bilirubin into plasma. Free bilirubin is neurotoxic and lipophilic, crossing the immature blood-brain barrier to bind lipid membranes of the basal ganglia and cranial nerve nuclei.";

  const clinicalActionMandate = actionAlerts.length
    ? actionAlerts.join(" | ")
    : "No acute neonatal bilirubin displacement or calcium precipitation collisions identified.";

  return {
    ceftriaxoneDisplacementDetected: hasCeftriaxone,
    sulfamethoxazoleDisplacementDetected: hasSulfamethoxazole,
    isNeonateContraindicated: ceftriaxoneContraindicated,
    isInfantSulfamethoxazoleContraindicated: sulfamethoxazoleContraindicated,
    calciumPrecipitationHazard,
    hyperbilirubinemiaCompoundingHazard,
    pathophysiology,
    severity,
    recommendedAlternatives: Array.from(new Set(alternatives)),
    clinicalActionMandate,
  };
}

// ============================================================================
// 5. PILLAR 3: HIGH-ALERT PEDIATRIC DRUG & EXCIPIENT TOXICITIES
// ============================================================================

export interface HighAlertToxicityAlert {
  category: "drug-toxicity" | "excipient-toxicity" | "boxed-warning" | "organ-toxicity";
  drugOrExcipientName: string;
  syndromeTitle: string;
  isContraindicated: boolean;
  ageThresholdDescription: string;
  molecularBiochemicalMechanism: string;
  clinicalHallmarks: string[];
  safeAlternativeOrException: string;
}

export function evaluateHighAlertPediatricToxicities(options: {
  drugIds: string[];
  ageSummary: PediatricAgeSummary;
  isPostTonsillectomy?: boolean;
}): HighAlertToxicityAlert[] {
  const normalized = options.drugIds.map((d) => d.toLowerCase());
  const alerts: HighAlertToxicityAlert[] = [];
  const days = options.ageSummary.totalPostnatalDays;
  const years = options.ageSummary.postnatalYears;
  const isPostTandA = options.isPostTonsillectomy ?? false;

  // 1. Chloramphenicol -> Gray Baby Syndrome
  if (normalized.some((d) => d.includes("chloramphenicol"))) {
    const isNeonateOrInfant = days <= 90;
    alerts.push({
      category: "drug-toxicity",
      drugOrExcipientName: "Chloramphenicol",
      syndromeTitle: "Gray Baby Syndrome (Cardiovascular Collapse & Cyanosis)",
      isContraindicated: isNeonateOrInfant,
      ageThresholdDescription: "Neonates and young infants (especially preterm and postnatal age ≤ 3 months)",
      molecularBiochemicalMechanism:
        "Deficient hepatic glucuronidation (immature UGT2B7 ~10% adult capacity) and immature glomerular filtration lead to massive accumulation of toxic unconjugated chloramphenicol (levels > 40-50 mcg/mL), causing mitochondrial respiratory chain inhibition.",
      clinicalHallmarks: [
        "Abdominal distention, vomiting, and refusal to feed",
        "Hypothermia, flaccidity, and lethargy",
        "Ashen-gray cyanosis ('gray syndrome')",
        "Rapid cardiovascular collapse, metabolic acidosis, shock, and high mortality",
      ],
      safeAlternativeOrException:
        "Contraindicated in neonates. Use alternative targeted antibiotics (e.g., ampicillin, third-generation cephalosporins, carbapenems, or vancomycin) guided by culture and susceptibility.",
    });
  }

  // 2. Propylene Glycol Excipient Toxicity
  const hasPgVehicle = normalized.some(
    (d) =>
      d.includes("lorazepam") ||
      d.includes("diazepam") ||
      d.includes("phenobarbital") ||
      d.includes("digoxin") ||
      d.includes("esmolol") ||
      d.includes("propylene glycol") ||
      d.includes("bactrim") ||
      d.includes("septra"),
  );
  if (hasPgVehicle && days <= 28) {
    alerts.push({
      category: "excipient-toxicity",
      drugOrExcipientName: "Propylene Glycol (Excipient Vehicle)",
      syndromeTitle: "Propylene Glycol Hyperosmolality & Lactic Acidosis Syndrome",
      isContraindicated: false, // high alert warning requiring osmolar gap monitoring
      ageThresholdDescription: "Neonates ≤ 28 days (especially low birth weight infants)",
      molecularBiochemicalMechanism:
        "Propylene glycol is a solvent vehicle in IV lorazepam (80%), IV diazepam (40%), IV phenobarbital, and IV digoxin. Neonates have immature alcohol dehydrogenase (ADH) activity and low renal clearance, prolonging elimination half-life from 5 hours (adult) to over 17-30 hours in neonates. Accumulation generates high concentrations of D- and L-lactic acid and high serum osmolality.",
      clinicalHallmarks: [
        "Elevated serum osmolar gap (> 10-12 mOsm/kg)",
        "Severe high anion gap lactic acidosis",
        "Renal proximal tubular cell swelling and acute kidney injury (AKI)",
        "Central nervous system depression, paradoxical seizures, arrhythmias",
      ],
      safeAlternativeOrException:
        "Use IV levetiracetam (aqueous solution) or midazolam (water-soluble benzodiazepine formulation with no propylene glycol) for neonatal status epilepticus. If PG-containing infusions cannot be avoided, monitor serial osmolar gap and serum lactate.",
    });
  }

  // 3. Benzyl Alcohol Excipient -> Gasping Syndrome
  const hasBenzylAlcohol = normalized.some(
    (d) =>
      d.includes("benzyl alcohol") ||
      d.includes("bacteriostatic") ||
      d.includes("multidose"),
  );
  if (hasBenzylAlcohol && (days <= 28 || options.ageSummary.isPreterm)) {
    alerts.push({
      category: "excipient-toxicity",
      drugOrExcipientName: "Benzyl Alcohol (Preservative)",
      syndromeTitle: "Neonatal Gasping Syndrome",
      isContraindicated: true,
      ageThresholdDescription: "Neonates ≤ 28 days and premature / low-birth-weight infants",
      molecularBiochemicalMechanism:
        "Benzyl alcohol preservative in bacteriostatic saline/water or multi-dose vials is metabolized to benzoic acid. Neonates have immature hepatic glycine N-acyltransferase and glucuronidation pathways, leading to massive benzoic acid accumulation.",
      clinicalHallmarks: [
        "Severe progressive high anion gap metabolic acidosis",
        "Gasping respirations ('gasping syndrome')",
        "Rapid neurological deterioration, convulsions, intraventricular hemorrhage",
        "Severe bradycardia, hypotension, cardiovascular collapse, and death",
      ],
      safeAlternativeOrException:
        "STRICT MANDATE: Use ONLY preservative-free single-dose vials and preservative-free 0.9% sodium chloride for flushes and reconstitution in all neonates.",
    });
  }

  // 4. Codeine & Tramadol Black Box Contraindications
  const hasCodeine = normalized.some((d) => d.includes("codeine"));
  const hasTramadol = normalized.some((d) => d.includes("tramadol"));

  if (hasCodeine || hasTramadol) {
    const drugName = hasCodeine && hasTramadol ? "Codeine & Tramadol" : hasCodeine ? "Codeine" : "Tramadol";
    const isUnder12 = years < 12;
    const isPostTaContraindicated = isPostTandA && years < 18;
    const isBoxedContraindicated = isUnder12 || isPostTaContraindicated;

    alerts.push({
      category: "boxed-warning",
      drugOrExcipientName: drugName,
      syndromeTitle: "FDA Black Box Contraindication: Fatal CYP2D6 Ultra-Rapid Opioid Overdose",
      isContraindicated: isBoxedContraindicated,
      ageThresholdDescription:
        "Contraindicated in all children < 12 years, and < 18 years following tonsillectomy / adenoidectomy",
      molecularBiochemicalMechanism:
        "Codeine is a prodrug biotransformed to morphine by CYP2D6. Tramadol is metabolized by CYP2D6 to its active O-desmethyltramadol (M1) metabolite (200x higher mu-opioid affinity). CYP2D6 ultra-rapid metabolizers (UM, ~1-10% of population) produce unpredictable, massive, lethal surges of morphine or M1, causing fatal respiratory arrest even at labeled doses.",
      clinicalHallmarks: [
        "Profound somnolence, pinpoint pupils, and bradypnea",
        "Sudden sleep apnea exacerbation and fatal respiratory depression",
        "Cardiac arrest following routine post-tonsillectomy oral analgesia",
      ],
      safeAlternativeOrException:
        "CONTRAINDICATED in children < 12y or < 18y post-T&A. First-line pediatric analgesia: Acetaminophen + Ibuprofen multimodal scheduled regimen. If severe post-op pain necessitates opioids: oral oxycodone or IV morphine under continuous pulse oximetry monitoring.",
    });
  }

  // 5. Fluoroquinolones -> Articular Cartilage Damage & Arthropathy
  const hasFluoroquinolone = normalized.some(
    (d) =>
      d.includes("ciprofloxacin") ||
      d.includes("levofloxacin") ||
      d.includes("moxifloxacin") ||
      d.includes("ofloxacin"),
  );
  if (hasFluoroquinolone && years < 18) {
    alerts.push({
      category: "organ-toxicity",
      drugOrExcipientName: "Fluoroquinolones (Ciprofloxacin / Levofloxacin)",
      syndromeTitle: "Juvenile Articular Cartilage Chondrotoxicity & Arthropathy",
      isContraindicated: false, // restrictive warning with specific exceptions
      ageThresholdDescription: "Pediatric patients < 18 years of age",
      molecularBiochemicalMechanism:
        "Fluoroquinolones chelate magnesium ions in chondrocytes, disrupting proteoglycan synthesis and causing cartilage vesicle necrosis, erosion, blistering, and joint effusion in immature weight-bearing joints.",
      clinicalHallmarks: [
        "Arthralgia, joint swelling, gait abnormalities, and effusion in large joints (knees, ankles)",
        "Achilles tendonitis and potential tendon rupture",
      ],
      safeAlternativeOrException:
        "RESTRICT USE: Avoid in children < 18 years unless no safer alternative exists. Recognized pediatric indications: Inhalational anthrax post-exposure prophylaxis, complicated Pseudomonas pulmonary exacerbation in cystic fibrosis, and complicated multi-drug resistant pyelonephritis.",
    });
  }

  // 6. Tetracyclines -> Tooth Enamel Hypoplasia & Discoloration
  const hasTetracycline = normalized.some(
    (d) =>
      d.includes("tetracycline") ||
      d.includes("minocycline") ||
      d.includes("doxycycline"),
  );
  const hasDoxycycline = normalized.some((d) => d.includes("doxycycline"));

  if (hasTetracycline && years < 8) {
    alerts.push({
      category: "organ-toxicity",
      drugOrExcipientName: hasDoxycycline ? "Doxycycline" : "Tetracyclines",
      syndromeTitle: "Permanent Tooth Enamel Hypoplasia & Yellow-Brown Discoloration",
      isContraindicated: !hasDoxycycline, // general tetracyclines contraindicated < 8y
      ageThresholdDescription: "Children < 8 years of age (during odontogenesis)",
      molecularBiochemicalMechanism:
        "Tetracyclines form insoluble orthophosphate calcium complexes deposited in developing hydroxyapatite during tooth calcification (odontogenesis), causing irreversible brownish-yellow staining and enamel hypoplasia.",
      clinicalHallmarks: [
        "Permanent yellow, gray, or brown banding of deciduous and permanent dentition",
        "Enamel pitting and hypoplasia predisposing to severe dental caries",
        "Reversible depression of skeletal bone growth velocity in premature infants",
      ],
      safeAlternativeOrException:
        hasDoxycycline
          ? "CRITICAL LIFE-SAVING EXCEPTION: The AAP Red Book and CDC explicitly designate short-course Doxycycline (≤ 14-21 days) as FIRST-LINE therapy for life-threatening Rocky Mountain Spotted Fever (RMSF), ehrlichiosis, and Lyme disease in children of ALL ages. Short courses have not demonstrated visible enamel staining, and delay in RMSF treatment carries >20% mortality."
          : "Avoid older tetracyclines in children < 8 years. If tick-borne rickettsia or Lyme is suspected, substitute Doxycycline.",
    });
  }

  return alerts;
}

// ============================================================================
// 6. PILLAR 4: PEDIATRIC ALLOMETRIC SCALING & BEDSIDE EQUATIONS
// ============================================================================

export interface AllometricBsaResult {
  mostellerBsaM2?: number;
  haycockBsaM2?: number;
  weightKg?: number;
  heightCm?: number;
  formulaDetails: {
    mosteller: string;
    haycock: string;
  };
}

export function calculatePediatricBsa(heightCm?: number, weightKg?: number): AllometricBsaResult {
  let mostellerBsaM2: number | undefined;
  let haycockBsaM2: number | undefined;

  if (heightCm && weightKg && heightCm > 0 && weightKg > 0) {
    // Mosteller BSA: sqrt( (height_cm * weight_kg) / 3600 )
    mostellerBsaM2 = Number(Math.sqrt((heightCm * weightKg) / 3600).toFixed(3));

    // Haycock BSA: 0.024265 * (weight_kg ^ 0.5378) * (height_cm ^ 0.3964)
    haycockBsaM2 = Number(
      (0.024265 * Math.pow(weightKg, 0.5378) * Math.pow(heightCm, 0.3964)).toFixed(3),
    );
  }

  return {
    mostellerBsaM2,
    haycockBsaM2,
    weightKg,
    heightCm,
    formulaDetails: {
      mosteller: "Mosteller: BSA (m²) = √((Height [cm] × Weight [kg]) / 3600)",
      haycock: "Haycock: BSA (m²) = 0.024265 × Weight (kg)^0.5378 × Height (cm)^0.3964 (optimal for infants & children)",
    },
  };
}

/**
 * Bedside Schwartz Equation for Pediatric eGFR (2009 updated IDMS-traceable constant)
 * eGFR (mL/min/1.73 m²) = (0.413 × Height [cm]) / Serum Creatinine [mg/dL]
 */
export function calculateBedsideSchwartzEgfr(
  heightCm?: number,
  serumCreatinineMgDl?: number,
): {
  schwartzEgfr?: number;
  formulaUsed: string;
  isIdmsTraceable: boolean;
  interpretationNotes: string;
} {
  if (!heightCm || !serumCreatinineMgDl || serumCreatinineMgDl <= 0) {
    return {
      schwartzEgfr: undefined,
      formulaUsed: "Bedside Schwartz: (0.413 × Height [cm]) / SCr [mg/dL]",
      isIdmsTraceable: true,
      interpretationNotes: "Height and enzymatic / IDMS serum creatinine are required to calculate eGFR.",
    };
  }

  const schwartzEgfr = Number(((0.413 * heightCm) / serumCreatinineMgDl).toFixed(1));

  return {
    schwartzEgfr,
    formulaUsed: `Bedside Schwartz: (0.413 × ${heightCm} cm) / ${serumCreatinineMgDl} mg/dL = ${schwartzEgfr} mL/min/1.73m²`,
    isIdmsTraceable: true,
    interpretationNotes:
      "Valid for children aged 1 to 16 years using enzymatic IDMS-traceable serum creatinine assays. In neonates < 1 week, maternal creatinine transplacental transfer falsely elevates infant SCr.",
  };
}

/**
 * Pediatric Weight-Based Dose Calculator with Adult Dose Maximum Ceiling Clamp
 * Prevents dangerous overdose in older/obese pediatric patients where mg/kg dosing exceeds adult maxima.
 */
export interface DoseCeilingClampResult {
  weightKg: number;
  prescribedMgPerKg: number;
  maxAdultDoseMg: number;
  rawCalculatedDoseMg: number;
  clampedDoseMg: number;
  isCeilingApplied: boolean;
  percentReductionFromRaw: number;
  clinicalSafetyAlert: string;
}

export function calculatePediatricDoseClamp(options: {
  weightKg: number;
  prescribedMgPerKg: number;
  maxAdultDoseMg: number;
}): DoseCeilingClampResult {
  const { weightKg, prescribedMgPerKg, maxAdultDoseMg } = options;
  const rawCalculatedDoseMg = Number((weightKg * prescribedMgPerKg).toFixed(1));
  const isCeilingApplied = rawCalculatedDoseMg > maxAdultDoseMg;
  const clampedDoseMg = isCeilingApplied ? maxAdultDoseMg : rawCalculatedDoseMg;

  const percentReductionFromRaw = isCeilingApplied
    ? Number((((rawCalculatedDoseMg - maxAdultDoseMg) / rawCalculatedDoseMg) * 100).toFixed(1))
    : 0;

  let clinicalSafetyAlert = `Calculated dose: ${clampedDoseMg} mg.`;
  if (isCeilingApplied) {
    clinicalSafetyAlert = `CRITICAL ADULT DOSE CEILING CLAMP APPLIED: Raw weight-based calculation (${weightKg} kg × ${prescribedMgPerKg} mg/kg = ${rawCalculatedDoseMg} mg) exceeds the maximum recommended adult ceiling (${maxAdultDoseMg} mg). Dose clamped to ${maxAdultDoseMg} mg to prevent catastrophic pediatric toxicity (-${percentReductionFromRaw}% reduction).`;
  }

  return {
    weightKg,
    prescribedMgPerKg,
    maxAdultDoseMg,
    rawCalculatedDoseMg,
    clampedDoseMg,
    isCeilingApplied,
    percentReductionFromRaw,
    clinicalSafetyAlert,
  };
}

export interface StandardPediatricDosingTemplate {
  drugName: string;
  indication: string;
  standardMgPerKg: number;
  frequencyText: string;
  adultMaxDoseMg: number;
  ceilingBasis: string;
}

export const COMMON_PEDIATRIC_DOSING_TEMPLATES: StandardPediatricDosingTemplate[] = [
  {
    drugName: "Amoxicillin (High Dose)",
    indication: "Acute Otitis Media / Pneumonia",
    standardMgPerKg: 90,
    frequencyText: "mg/kg/day divided q12h",
    adultMaxDoseMg: 4000,
    ceilingBasis: "Maximum adult daily dose is 4,000 mg/day (or 1,000 mg per single dose q8h).",
  },
  {
    drugName: "Acetaminophen (Paracetamol)",
    indication: "Analgesia / Antipyretic",
    standardMgPerKg: 15,
    frequencyText: "mg/kg/dose q4-6h prn",
    adultMaxDoseMg: 1000,
    ceilingBasis: "Maximum single adult dose 1,000 mg (maximum 4,000 mg/day).",
  },
  {
    drugName: "Ibuprofen",
    indication: "Anti-inflammatory / Antipyretic",
    standardMgPerKg: 10,
    frequencyText: "mg/kg/dose q6-8h prn",
    adultMaxDoseMg: 800,
    ceilingBasis: "Maximum single adult dose 800 mg (maximum 2,400 to 3,200 mg/day).",
  },
  {
    drugName: "Ceftriaxone",
    indication: "Severe Pediatric Bacterial Infection",
    standardMgPerKg: 75,
    frequencyText: "mg/kg/day IV/IM q12-24h",
    adultMaxDoseMg: 2000,
    ceilingBasis: "Standard adult maximum dose 2,000 mg/day (4,000 mg/day in meningitis).",
  },
  {
    drugName: "Ampicillin",
    indication: "Bacterial Meningitis / Severe Sepsis",
    standardMgPerKg: 300,
    frequencyText: "mg/kg/day divided q6h",
    adultMaxDoseMg: 12000,
    ceilingBasis: "Maximum adult daily dose 12,000 mg/day (2,000 mg q4h).",
  },
  {
    drugName: "Cefotaxime",
    indication: "Neonatal & Pediatric Sepsis / Meningitis",
    standardMgPerKg: 200,
    frequencyText: "mg/kg/day divided q6-8h",
    adultMaxDoseMg: 8000,
    ceilingBasis: "Maximum adult daily dose 8,000 to 12,000 mg/day.",
  },
  {
    drugName: "Cefazolin",
    indication: "Surgical Prophylaxis / MSSA Infection",
    standardMgPerKg: 50,
    frequencyText: "mg/kg/day divided q8h",
    adultMaxDoseMg: 6000,
    ceilingBasis: "Standard adult ceiling 6,000 mg/day (2,000 mg single dose for prophylaxis).",
  },
  {
    drugName: "Methylprednisolone",
    indication: "Status Asthmaticus",
    standardMgPerKg: 2,
    frequencyText: "mg/kg/day IV loading/divided",
    adultMaxDoseMg: 80,
    ceilingBasis: "Adult status asthmaticus ceiling 60 to 80 mg/day.",
  },
];

// ============================================================================
// 7. DESK TRAY DETECTION: pediatricOnDesk
// ============================================================================

export interface PediatricDeskDetection {
  hasPediatricTargetDrug: boolean;
  hasCeftriaxone: boolean;
  hasSulfamethoxazole: boolean;
  hasChloramphenicol: boolean;
  hasCodeine: boolean;
  hasTramadol: boolean;
  hasFluoroquinolone: boolean;
  hasTetracycline: boolean;
  hasDoxycycline: boolean;
  hasPropyleneGlycolRisk: boolean;
  hasBenzylAlcoholRisk: boolean;
  hasCaffeine: boolean;
  hasAcetaminophen: boolean;
  hasIbuprofen: boolean;
  detectedAgents: string[];
  matchedDrugCategories: string[];
}

export function pediatricOnDesk(drugIds: string[]): PediatricDeskDetection {
  const normalized = drugIds.map((d) => d.toLowerCase());
  const detectedAgents: string[] = [];
  const categories: string[] = [];

  const hasCeftriaxone = normalized.some((d) => d.includes("ceftriaxone"));
  const hasSulfamethoxazole = normalized.some(
    (d) =>
      d.includes("sulfamethoxazole") ||
      d.includes("bactrim") ||
      d.includes("septra") ||
      d.includes("cotrimoxazole") ||
      d.includes("trimethoprim-sulfamethoxazole") ||
      d.includes("smx"),
  );
  const hasChloramphenicol = normalized.some((d) => d.includes("chloramphenicol"));
  const hasCodeine = normalized.some((d) => d.includes("codeine"));
  const hasTramadol = normalized.some((d) => d.includes("tramadol"));
  const hasFluoroquinolone = normalized.some(
    (d) =>
      d.includes("ciprofloxacin") ||
      d.includes("levofloxacin") ||
      d.includes("moxifloxacin") ||
      d.includes("ofloxacin"),
  );
  const hasDoxycycline = normalized.some((d) => d.includes("doxycycline"));
  const hasTetracycline =
    hasDoxycycline ||
    normalized.some((d) => d.includes("tetracycline") || d.includes("minocycline"));

  const hasPropyleneGlycolRisk = normalized.some(
    (d) =>
      d.includes("lorazepam") ||
      d.includes("diazepam") ||
      d.includes("phenobarbital") ||
      d.includes("digoxin") ||
      d.includes("esmolol"),
  );

  const hasBenzylAlcoholRisk = normalized.some(
    (d) =>
      d.includes("benzyl alcohol") ||
      d.includes("bacteriostatic") ||
      d.includes("multidose"),
  );

  const hasCaffeine = normalized.some((d) => d.includes("caffeine"));
  const hasAcetaminophen = normalized.some(
    (d) => d.includes("acetaminophen") || d.includes("paracetamol") || d.includes("tylenol"),
  );
  const hasIbuprofen = normalized.some((d) => d.includes("ibuprofen") || d.includes("motrin") || d.includes("advil"));

  if (hasCeftriaxone) {
    detectedAgents.push("ceftriaxone");
    categories.push("Kernicterus & Calcium Precipitation Risk");
  }
  if (hasSulfamethoxazole) {
    detectedAgents.push("sulfamethoxazole");
    categories.push("Bilirubin Displacement Sulfonamide");
  }
  if (hasChloramphenicol) {
    detectedAgents.push("chloramphenicol");
    categories.push("Gray Baby UGT2B7 Vulnerability");
  }
  if (hasCodeine) {
    detectedAgents.push("codeine");
    categories.push("CYP2D6 Boxed Warning Prodrug");
  }
  if (hasTramadol) {
    detectedAgents.push("tramadol");
    categories.push("CYP2D6 Boxed Warning Prodrug");
  }
  if (hasFluoroquinolone) {
    detectedAgents.push("fluoroquinolone");
    categories.push("Juvenile Cartilage Chondrotoxicity");
  }
  if (hasTetracycline) {
    detectedAgents.push(hasDoxycycline ? "doxycycline" : "tetracycline");
    categories.push("Dental Enamel Calcification Binding");
  }
  if (hasPropyleneGlycolRisk) {
    detectedAgents.push("propylene-glycol-vehicle");
    categories.push("Hyperosmolality & Lactic Acidosis Excipient");
  }
  if (hasBenzylAlcoholRisk) {
    detectedAgents.push("benzyl-alcohol");
    categories.push("Gasping Syndrome Preservative");
  }
  if (hasCaffeine) {
    detectedAgents.push("caffeine");
    categories.push("CYP1A2 Ontogeny Marker");
  }
  if (hasAcetaminophen) {
    detectedAgents.push("acetaminophen");
    categories.push("Pediatric Core Analgesic");
  }
  if (hasIbuprofen) {
    detectedAgents.push("ibuprofen");
    categories.push("Pediatric Core NSAID");
  }

  const hasPediatricTargetDrug = detectedAgents.length > 0;

  return {
    hasPediatricTargetDrug,
    hasCeftriaxone,
    hasSulfamethoxazole,
    hasChloramphenicol,
    hasCodeine,
    hasTramadol,
    hasFluoroquinolone,
    hasTetracycline,
    hasDoxycycline,
    hasPropyleneGlycolRisk,
    hasBenzylAlcoholRisk,
    hasCaffeine,
    hasAcetaminophen,
    hasIbuprofen,
    detectedAgents,
    matchedDrugCategories: Array.from(new Set(categories)),
  };
}

// ============================================================================
// 8. COMPREHENSIVE REPORT GENERATOR: pediatricReportOnDesk
// ============================================================================

export interface PediatricReport {
  detection: PediatricDeskDetection;
  patientAgeSummary: PediatricAgeSummary;
  renalOntogeny: RenalOntogenyAssessment;
  hepaticOntogeny: HepaticOntogenyAssessment;
  kernicterusRisk: KernicterusAssessment;
  highAlertToxicities: HighAlertToxicityAlert[];
  allometricScaling: {
    bsa: AllometricBsaResult;
    schwartzEgfr?: number;
    sampleClampedDoses: DoseCeilingClampResult[];
  };
  safetyAlerts: string[];
  citations: string[];
  disclaimer: string;
}

export function pediatricReportOnDesk(
  drugIds: string[],
  host?: HostContext,
  childContext?: PediatricContext,
): PediatricReport {
  const context: PediatricContext = childContext ?? {
    gestationalAgeWeeks: 40,
    postnatalAgeDays: 14,
    weightKg: 3.5,
    heightCm: 50,
    serumCreatinineMgDl: 0.4,
  };

  const detection = pediatricOnDesk(drugIds);
  const patientAgeSummary = computePediatricAgeSummary(context);
  const renalOntogeny = evaluateRenalOntogeny(
    patientAgeSummary,
    context.heightCm,
    context.serumCreatinineMgDl,
  );
  const hepaticOntogeny = evaluateHepaticOntogeny(patientAgeSummary);
  const kernicterusRisk = evaluateKernicterusAndDisplacement({
    drugIds,
    ageSummary: patientAgeSummary,
    isHyperbilirubinemic: context.isHyperbilirubinemic,
    hasIvCalciumActive: context.hasIvCalciumActive,
  });
  const highAlertToxicities = evaluateHighAlertPediatricToxicities({
    drugIds,
    ageSummary: patientAgeSummary,
    isPostTonsillectomy: context.isPostTonsillectomy,
  });

  const bsa = calculatePediatricBsa(context.heightCm, context.weightKg);

  // Compute sample dose clamps for drugs detected or common catalog
  const sampleClampedDoses: DoseCeilingClampResult[] = [];
  if (context.weightKg && context.weightKg > 0) {
    const w = context.weightKg;
    // Check amoxicillin high dose
    sampleClampedDoses.push(
      calculatePediatricDoseClamp({
        weightKg: w,
        prescribedMgPerKg: 90,
        maxAdultDoseMg: 4000,
      }),
    );
    // Check acetaminophen
    sampleClampedDoses.push(
      calculatePediatricDoseClamp({
        weightKg: w,
        prescribedMgPerKg: 15,
        maxAdultDoseMg: 1000,
      }),
    );
  }

  const safetyAlerts: string[] = [];

  // Kernicterus & Ceftriaxone / Bactrim alerts
  if (kernicterusRisk.isNeonateContraindicated) {
    safetyAlerts.push(
      `CEFTRIAXONE CONTRAINDICATION: Ceftriaxone in neonates ≤ 28 days carries high risk of kernicterus and fatal calcium precipitation. ${kernicterusRisk.clinicalActionMandate}`,
    );
  }
  if (kernicterusRisk.isInfantSulfamethoxazoleContraindicated) {
    safetyAlerts.push(
      `BACTRIM / SULFAMETHOXAZOLE CONTRAINDICATION: Displaces bilirubin in infants < 2 months, risking kernicterus.`,
    );
  }

  // High-alert toxicities
  for (const alert of highAlertToxicities) {
    if (alert.isContraindicated) {
      safetyAlerts.push(
        `CONTRAINDICATION [${alert.drugOrExcipientName}]: ${alert.syndromeTitle}. ${alert.safeAlternativeOrException}`,
      );
    } else {
      safetyAlerts.push(
        `WARNING [${alert.drugOrExcipientName}]: ${alert.syndromeTitle}. ${alert.safeAlternativeOrException}`,
      );
    }
  }

  // Renal GFR warning
  if (renalOntogeny.isEgfrDepressedForAge) {
    safetyAlerts.push(
      `DEVELOPMENTAL RENAL IMPAIRMENT: Calculated Bedside Schwartz eGFR (${renalOntogeny.schwartzEgfr} mL/min/1.73m²) is depressed below expected normal for age (${renalOntogeny.expectedNormalGfrBracket.minGfr}-${renalOntogeny.expectedNormalGfrBracket.maxGfr} mL/min/1.73m²).`,
    );
  }

  const citations: string[] = [
    "Kearns GL, et al. Developmental pharmacology—drug disposition, action, and therapy in infants and children. N Engl J Med. 2003;349(12):1157-1167.",
    "Schwartz GJ, et al. New equations to estimate GFR in children with CKD. J Am Soc Nephrol. 2009;20(3):629-637.",
    "Robertson A, et al. Bilirubin displacing capacity of ceftriaxone in neonates. J Pediatr. 1988;112(5):804-808.",
    "AAP Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation. Pediatrics. 2022;150(3):e2022058859.",
    "FDA Drug Safety Communication: FDA restricts use of prescription codeine and tramadol medicines in children (2017/2018).",
    "Weiss CF, et al. Chloramphenicol in the newborn infant: A physiologic explanation of its toxicity (Gray Baby Syndrome). N Engl J Med. 1960;262(16):787-794.",
    "CDC / FDA: Gasping syndrome and benzyl alcohol in neonates. MMWR 1982;31(22):290-291.",
    "Haycock GB, et al. Surface area of children: a minireview. J Pediatr. 1978;93(1):62-66.",
    "Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.",
  ];

  return {
    detection,
    patientAgeSummary,
    renalOntogeny,
    hepaticOntogeny,
    kernicterusRisk,
    highAlertToxicities,
    allometricScaling: {
      bsa,
      schwartzEgfr: renalOntogeny.schwartzEgfr,
      sampleClampedDoses,
    },
    safetyAlerts,
    citations,
    disclaimer: `${PEDIATRIC_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
}
