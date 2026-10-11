/** Acetaminophen (Paracetamol) Toxicology, Rumack-Matthew Nomogram, and NAC Kinetics Station.
 * Non-device educational clinical pharmacology reference. Not a medical directive.
 * Grounded in Rumack-Matthew 1975, Smilkstein 1988, and King's College Criteria.
 */

export type NomogramBand = "too-early" | "below-treatment" | "above-treatment" | "high-risk" | "late-presentation";

export interface RumackNomogramInput {
  hoursPostIngestion: number;
  serumApapUgMl: number;
  chronicAlcoholOrInducer?: boolean;
  malnutritionOrFasting?: boolean;
}

export interface RumackNomogramResult {
  hoursPostIngestion: number;
  serumApapUgMl: number;
  treatmentLineUgMl: number | null;
  highRiskLineUgMl: number | null;
  band: NomogramBand;
  label: string;
  nacIndicated: boolean;
  nacUrgency: string;
  riskModifiers: string[];
  clinicalGuidance: string;
  toxicologyPearl: string;
}

/** Compute the 150-treatment line threshold at hours post-ingestion (4 to 24 hours) */
export function apapTreatmentLine(hours: number): number | null {
  if (!Number.isFinite(hours) || hours < 4 || hours > 24) {
    return null;
  }
  // 150 ug/mL at 4h, t1/2 of 4 hours: 150 * (0.5)^((hours - 4)/4)
  const threshold = 150 * Math.pow(0.5, (hours - 4) / 4);
  return Math.round(threshold * 10) / 10;
}

/** Compute the 300-high risk line threshold at hours post-ingestion (4 to 24 hours) */
export function apapHighRiskLine(hours: number): number | null {
  if (!Number.isFinite(hours) || hours < 4 || hours > 24) {
    return null;
  }
  const threshold = 300 * Math.pow(0.5, (hours - 4) / 4);
  return Math.round(threshold * 10) / 10;
}

/** Evaluate single acute acetaminophen ingestion against Rumack-Matthew Nomogram */
export function evaluateRumackMatthew({
  hoursPostIngestion,
  serumApapUgMl,
  chronicAlcoholOrInducer = false,
  malnutritionOrFasting = false,
}: RumackNomogramInput): RumackNomogramResult | null {
  if (
    !Number.isFinite(hoursPostIngestion) ||
    !Number.isFinite(serumApapUgMl) ||
    hoursPostIngestion < 0 ||
    hoursPostIngestion > 168 ||
    serumApapUgMl < 0 ||
    serumApapUgMl > 2500
  ) {
    return null;
  }

  const riskModifiers: string[] = [];
  if (chronicAlcoholOrInducer) {
    riskModifiers.push("CYP2E1 induction accelerates NAPQI generation; hepatic glutathione may be depleted.");
  }
  if (malnutritionOrFasting) {
    riskModifiers.push("Prolonged fasting/cachexia depletes baseline glutathione reserves, lowering hepatotoxic threshold.");
  }

  // < 4 hours: Absorption/distribution phase ongoing
  if (hoursPostIngestion < 4) {
    return {
      hoursPostIngestion,
      serumApapUgMl,
      treatmentLineUgMl: null,
      highRiskLineUgMl: null,
      band: "too-early",
      label: "Pre-Nomogram Phase (<4 hours post-ingestion)",
      nacIndicated: serumApapUgMl > 300,
      nacUrgency:
        serumApapUgMl > 300
          ? "Immediate NAC initiation prudent while awaiting 4-hour redraw due to extreme early level."
          : "Repeat serum APAP level at 4 hours post-ingestion for nomogram plotting.",
      riskModifiers,
      clinicalGuidance:
        "Levels drawn earlier than 4 hours post-ingestion cannot be plotted on the Rumack-Matthew Nomogram because GI absorption and tissue distribution are not yet complete. A repeat APAP level must be drawn at 4 hours to establish peak exposure.",
      toxicologyPearl:
        "If ingestion was within 1–2 hours, activated charcoal (1 g/kg) can be considered if the airway is intact. Do not delay NAC if an early level is overwhelmingly massive.",
    };
  }

  // > 24 hours: Nomogram invalid
  if (hoursPostIngestion > 24) {
    const hasToxicity = serumApapUgMl > 5;
    return {
      hoursPostIngestion,
      serumApapUgMl,
      treatmentLineUgMl: null,
      highRiskLineUgMl: null,
      band: "late-presentation",
      label: "Late Presentation (>24 hours post-ingestion)",
      nacIndicated: hasToxicity,
      nacUrgency: hasToxicity
        ? "Administer NAC immediately. Evaluate liver function tests (ALT/AST), INR, and renal function."
        : "Evaluate transaminases (ALT/AST). If transaminases are normal and APAP is undetectable, toxicity is unlikely.",
      riskModifiers,
      clinicalGuidance:
        "The Rumack-Matthew nomogram is not validated beyond 24 hours post-ingestion. Patients presenting late must be evaluated with serum APAP, transaminases (ALT/AST), total bilirubin, and PT/INR. If transaminases are elevated or any APAP remains detectable, full-course NAC is indicated.",
      toxicologyPearl:
        "Even in late fulminant hepatic failure where parent APAP has fully cleared, NAC significantly improves microcirculatory hemodynamics, oxygen consumption, and reduces cerebral edema.",
    };
  }

  const treatmentCut = apapTreatmentLine(hoursPostIngestion)!;
  const highRiskCut = apapHighRiskLine(hoursPostIngestion)!;

  let band: NomogramBand = "below-treatment";
  let label = "Below Treatment Line (Hepatotoxicity Unlikely)";
  let nacIndicated = false;
  let nacUrgency = "NAC generally not indicated for single acute ingestion with known time.";
  let clinicalGuidance =
    "Serum concentration falls below the 150-treatment line. In single acute ingestions without high-risk co-factors, hepatic glutathione stores are sufficient to detoxify NAPQI.";

  if (serumApapUgMl >= highRiskCut) {
    band = "high-risk";
    label = "Above High-Risk Line (Severe Hepatotoxicity Risk ~60%)";
    nacIndicated = true;
    nacUrgency = "Immediate NAC administration indicated. High risk of severe centrilobular hepatic necrosis.";
    clinicalGuidance =
      "Concentration falls above the original 300-line. Without early NAC, severe hepatotoxicity (AST/ALT >1,000 IU/L) occurs in ~60% of patients. Monitor serial transaminases, INR, and renal function.";
  } else if (serumApapUgMl >= treatmentCut) {
    band = "above-treatment";
    label = "Above Treatment Line (Probable Toxicity Without Antidote)";
    nacIndicated = true;
    nacUrgency = "Administer N-acetylcysteine (NAC) promptly. Maximally effective within 8 hours.";
    clinicalGuidance =
      "Concentration exceeds the 150-treatment line (150 µg/mL at 4h). N-acetylcysteine restores glutathione reserves and prevents toxic NAPQI macromolecular binding.";
  } else if (riskModifiers.length > 0 && serumApapUgMl >= treatmentCut * 0.7) {
    // Borderline below treatment with high-risk features
    clinicalGuidance +=
      " Caution: Patient carries high-risk modifiers (CYP2E1 induction / depleted baseline glutathione). Consider clinical consultation and close transaminase monitoring.";
  }

  const toxicologyPearl =
    "Optimal window: NAC initiated within 8 hours of acute ingestion reduces severe hepatotoxicity risk to <2%. After 8 hours, efficacy gradually declines but remains protective and lifesaving.";

  return {
    hoursPostIngestion,
    serumApapUgMl,
    treatmentLineUgMl: treatmentCut,
    highRiskLineUgMl: highRiskCut,
    band,
    label,
    nacIndicated,
    nacUrgency,
    riskModifiers,
    clinicalGuidance,
    toxicologyPearl,
  };
}

export interface KingsCollegeInput {
  arterialPhUnder730: boolean;
  encephalopathyGrade3Or4: boolean;
  serumCreatinineOver34: boolean;
  inrOver65: boolean;
  lactateOver3AfterResuscitation?: boolean;
}

export interface KingsCollegeResult {
  meetsCriteria: boolean;
  reason: string;
  urgency: string;
  summary: string;
}

/** Evaluate King's College Criteria for liver transplantation in acute APAP liver failure */
export function evaluateKingsCollege({
  arterialPhUnder730,
  encephalopathyGrade3Or4,
  serumCreatinineOver34,
  inrOver65,
  lactateOver3AfterResuscitation = false,
}: KingsCollegeInput): KingsCollegeResult {
  if (arterialPhUnder730) {
    return {
      meetsCriteria: true,
      reason: "Arterial pH < 7.30 after adequate fluid resuscitation (independent single criterion).",
      urgency: "Emergent liver transplant evaluation indicated. Mortality >80% without transplantation.",
      summary: "Meets King's College Criteria based on severe refractory metabolic acidemia.",
    };
  }

  if (lactateOver3AfterResuscitation) {
    return {
      meetsCriteria: true,
      reason: "Post-resuscitation arterial lactate > 3.0 mmol/L at 12 hours (early prognostic marker).",
      urgency: "Immediate hepatology / liver transplant center contact indicated.",
      summary: "Meets updated King's College Criteria based on severe systemic hypoperfusion/lactatemia.",
    };
  }

  const triadCount = [encephalopathyGrade3Or4, serumCreatinineOver34, inrOver65].filter(Boolean).length;
  if (triadCount === 3) {
    return {
      meetsCriteria: true,
      reason: "All 3 concurrent criteria present: Grade 3/4 encephalopathy + Serum Cr > 3.4 mg/dL + INR > 6.5.",
      urgency: "Emergent liver transplant evaluation indicated. Predicted mortality exceeds 85% without grafting.",
      summary: "Meets classic King's College triad for acetaminophen-induced acute liver failure.",
    };
  }

  return {
    meetsCriteria: false,
    reason: `Only ${triadCount} of 3 triad criteria present; pH ≥ 7.30.`,
    urgency: "Continue aggressive medical management (NAC, supportive care, renal replacement as indicated).",
    summary: "Does not currently meet King's College transplant criteria. Monitor serial labs closely.",
  };
}

export interface NacRegimen {
  name: string;
  totalDoseMgKg: number;
  durationHours: number;
  steps: { phase: string; doseMgKg: number; timeHours: number; rateNote: string }[];
  pearl: string;
}

export const NAC_REGIMENS: NacRegimen[] = [
  {
    name: "IV 21-Hour Protocol (Classic 3-Bag)",
    totalDoseMgKg: 300,
    durationHours: 21,
    steps: [
      { phase: "Loading Bag 1", doseMgKg: 150, timeHours: 1, rateNote: "Infuse over 60 minutes. Highest incidence of anaphylactoid flushing." },
      { phase: "Maintenance Bag 2", doseMgKg: 50, timeHours: 4, rateNote: "Infuse over 4 hours." },
      { phase: "Maintenance Bag 3", doseMgKg: 100, timeHours: 16, rateNote: "Infuse over 16 hours. Check ALT/AST and APAP before completing." },
    ],
    pearl: "FDA-approved standard. Non-allergic anaphylactoid reactions (flushing, pruritus, bronchospasm) occur in 10–20% of patients during Bag 1. Stop infusion, give antihistamines, and restart at slower rate once resolved. Do NOT permanently stop NAC.",
  },
  {
    name: "IV Simplified 2-Bag Protocol",
    totalDoseMgKg: 300,
    durationHours: 20,
    steps: [
      { phase: "Bag 1", doseMgKg: 200, timeHours: 4, rateNote: "Infuse over 4 hours. Slower initial rate dramatically reduces anaphylactoid histamine release." },
      { phase: "Bag 2", doseMgKg: 100, timeHours: 16, rateNote: "Infuse over 16 hours." },
    ],
    pearl: "Australian / UK consensus protocol increasingly adopted in US centers. Demonstrates non-inferior hepatoprotection with >50% reduction in adverse anaphylactoid reactions.",
  },
  {
    name: "Oral 72-Hour Protocol",
    totalDoseMgKg: 1330,
    durationHours: 72,
    steps: [
      { phase: "Oral Loading", doseMgKg: 140, timeHours: 0, rateNote: "Loading dose oral or NG tube." },
      { phase: "Oral Maintenance", doseMgKg: 70, timeHours: 72, rateNote: "70 mg/kg every 4 hours for 17 additional doses." },
    ],
    pearl: "Historically gold standard. Free of anaphylactoid reactions, but high incidence of vomiting due to foul sulfur odor. Antiemetics (ondansetron) required. If dose vomited within 1 hour, repeat dose.",
  },
];

/** Check if acetaminophen or NAC is on the desk */
export function apapOnDesk(ids: string[]): boolean {
  return ids.includes("acetaminophen") || ids.includes("nac");
}

