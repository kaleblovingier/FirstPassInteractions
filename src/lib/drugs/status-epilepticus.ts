/**
 * Comprehensive Status Epilepticus (SE) 3-Phase Stepped Treatment Algorithm,
 * Synaptic Plasticity & GABA-A Receptor Internalization Kinetics, Landmark ESETT Trial
 * Antiseizure Medication (ASM) Comparator, and Acute Cerebral Edema Osmotherapy Engine.
 *
 * Authored from the clinical perspective of an MD (Neurologist & Neuro-Intensivist)
 * & PharmD (Neurocritical Care Clinical Pharmacotherapy Specialist) and Senior Software Engineer.
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms strictly to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed neurologists, neuro-intensivists, emergency physicians, intensivists,
 *   clinical pharmacologists, clinical pharmacists (PharmD), and supervised health-professions trainees.
 * - Displays transparent physiological, biochemical, electrophysiologic, and clinical trial
 *   rationale derived from peer-reviewed literature (American Epilepsy Society [AES] Guidelines,
 *   Neurocritical Care Society [NCS] Status Epilepticus Guidelines, ESETT Trial, RAMPART Trial).
 * - Enables independent clinical verification of all calculated doses, telemetry rails,
 *   receptor endocytosis decay models, and hyperosmolar safety boundaries.
 * - STRICTLY NON-PRESCRIPTIVE: Does NOT generate automated medical orders, does NOT emit
 *   closed-loop infusion commands, and does NOT replace individualized bedside clinical
 *   evaluation, institutional neurocritical care protocols, or the FDA-approved Prescribing Information.
 */

import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. STATUTORY REGULATORY DISCLAIMER (FD&C Act § 520(o)(1)(E))
// ============================================================================

export const STATUS_EPILEPTICUS_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational status epilepticus stepped treatment algorithm, pharmacoresistance and GABA-A internalizing receptor kinetics, ESETT trial ASM comparison, and acute cerebral edema osmotherapy reference engine is intended solely for licensed healthcare professionals (neurologists, neuro-intensivists, emergency physicians, intensivists, clinical pharmacists) and supervised health-professions students. It models American Epilepsy Society (AES) and Neurocritical Care Society (NCS) stepped phases, synaptic receptor endocytosis time-decay kinetics, landmark ESETT trial non-inferiority outcomes, and hyperosmolar therapy safety rails (23.4% hypertonic saline central-line requirements, Mannitol crystallization filtering, and serum osmolality ceilings) to enable independent clinical verification of patient care strategies. It does not provide automated diagnostic conclusions, does not generate medical orders or infusion pump directives, and does not replace individualized bedside clinical evaluation, institutional neurocritical care protocols, or the FDA-approved Prescribing Information.";

// ============================================================================
// 2. PEER-REVIEWED LITERATURE & GUIDELINE CITATIONS
// ============================================================================

export interface Citation {
  id: string;
  citation: string;
  pmid?: string;
  doi?: string;
  relevance: string;
}

export const SE_CITATIONS: Citation[] = [
  {
    id: "aes-guidelines-2016",
    citation:
      "Glauser T, Shinnar S, Gloss D, et al. Evidence-Based Guideline: Treatment of Convulsive Status Epilepticus in Children and Adults: Report of the Guideline Committee of the American Epilepsy Society. Epilepsy Curr. 2016;16(1):48-61.",
    pmid: "26900382",
    doi: "10.5698/1535-7597-16.1.48",
    relevance:
      "Definitive American Epilepsy Society (AES) 3-phase stepped algorithm for emergent (Phase 1: 0-20m), established (Phase 2: 20-40m), and refractory (Phase 3: >40m) status epilepticus.",
  },
  {
    id: "esett-trial-nejm-2019",
    citation:
      "Kapur J, Elm J, Chamberlain JM, et al.; ESETT Investigative Team. Randomized Trial of Three Anticonvulsant Medications for Status Epilepticus (ESETT). N Engl J Med. 2019;381(22):2103-2113.",
    pmid: "31774953",
    doi: "10.1056/NEJMoa1905795",
    relevance:
      "Landmark multicenter blinded RCT establishing non-inferiority of levetiracetam (60 mg/kg), fosphenytoin (20 mg PE/kg), and valproate (40 mg/kg) in benzodiazepine-refractory convulsive SE (~45-47% cessation at 60 min).",
  },
  {
    id: "ncs-guidelines-2012",
    citation:
      "Brophy GM, Bell R, Claassen J, et al.; Neurocritical Care Society Status Epilepticus Guideline Writing Committee. Guidelines for the Evaluation and Management of Status Epilepticus. Neurocrit Care. 2012;17(1):3-23.",
    pmid: "22528274",
    doi: "10.1007/s12028-012-9695-z",
    relevance:
      "Neurocritical Care Society consensus protocol detailing continuous general anesthetic infusions, burst suppression EEG targets, and critical care physiological stabilization.",
  },
  {
    id: "rampart-trial-nejm-2012",
    citation:
      "Silbergleit R, Durkalski V, Lowenstein D, et al.; NETT Investigators. Intramuscular versus intravenous therapy for prehospital status epilepticus (RAMPART). N Engl J Med. 2012;366(7):591-600.",
    pmid: "22335736",
    doi: "10.1056/NEJMoa1107494",
    relevance:
      "Prehospital RCT proving non-inferiority and superior time-to-administration of IM midazolam (10 mg autoinjector) over IV lorazepam (4 mg) for rapid seizure termination.",
  },
  {
    id: "goodkin-gaba-trafficking-2008",
    citation:
      "Goodkin HP, Joshi S, Mtchedlishvili Z, et al. Subunit-specific trafficking of GABA(A) receptors during status epilepticus. J Neurosci. 2008;28(18):4696-4704.",
    pmid: "18448646",
    doi: "10.1523/JNEUROSCI.3426-07.2008",
    relevance:
      "Demonstrates clathrin-dependent endocytosis and dephosphorylation of beta-2/3 and gamma-2 synaptic GABA-A receptor subunits during continuous seizing.",
  },
  {
    id: "naylor-gaba-pharmacoresistance-2005",
    citation:
      "Naylor DE, Liu H, Wasterlain CG. Trafficking of GABA(A) receptors, loss of inhibition, and a mechanism for pharmacoresistance in status epilepticus. J Neurosci. 2005;25(34):7724-7733.",
    pmid: "16120773",
    doi: "10.1523/JNEUROSCI.4944-04.2005",
    relevance:
      "Quantifies time-dependent loss of benzodiazepine potency (up to 20-fold reduction) and parallel upregulation of postsynaptic NMDA/AMPA receptors.",
  },
  {
    id: "koenig-hypertonic-saline-2008",
    citation:
      "Koenig MA, Bryan M, Lewin JL 3rd, et al. Use of 23.4% hypertonic saline for the treatment of cerebral edema and refractory intracranial hypertension. Crit Care Med. 2008;36(1):205-210.",
    pmid: "18090370",
    doi: "10.1097/01.CCM.0000295595.63242.06",
    relevance:
      "Pivotal neurocritical care study demonstrating rapid ICP reduction via 30 mL bolus of 23.4% NaCl given via central line for transtentorial herniation and refractory edema.",
  },
  {
    id: "cook-cerebral-edema-guidelines-2020",
    citation:
      "Cook AM, Morgan Jones G, Hawryluk GWJ, et al. Guidelines for the Acute Treatment of Cerebral Edema in Neurocritical Care Patients. Neurocrit Care. 2020;32(3):647-666.",
    pmid: "32227294",
    doi: "10.1007/s12028-020-00959-7",
    relevance:
      "Neurocritical Care Society clinical practice guidelines on hyperosmolar therapy (hypertonic saline vs mannitol), osmolar gap monitoring, and renal safeguards.",
  },
];

// ============================================================================
// 3. TAXONOMY & DRUG IDS
// ============================================================================

export type StatusEpilepticusPhase =
  | "phase-1-emergent"
  | "phase-2-established"
  | "phase-3-refractory"
  | "osmotherapy";

export const PHASE_1_BENZO_IDS = [
  "lorazepam",
  "midazolam",
  "midazolam-nasal",
  "diazepam",
  "diazepam-rectal",
  "diazepam-nasal",
  "clobazam",
  "clonazepam",
] as const;

export const PHASE_2_ASM_IDS = [
  "levetiracetam",
  "levetiracetam-xr",
  "fosphenytoin",
  "phenytoin",
  "phenytoin-fosphenytoin",
  "valproate",
  "valproate-iv",
  "valproate-sprinkle",
  "lacosamide",
  "phenobarbital",
  "brivaracetam",
  "topiramate",
  "topiramate-xr",
] as const;

export const PHASE_3_ANESTHETIC_IDS = [
  "propofol",
  "ketamine",
  "ketamine-iv",
  "esketamine",
  "midazolam",
  "pentobarbital",
  "phenobarbital",
] as const;

export const OSMOTHERAPY_IDS = [
  "hypertonic-saline",
  "hypertonic-saline-neb",
  "mannitol",
  "mannitol-inhaled",
  "sodium-chloride-tablet",
] as const;

export const ALL_SE_DRUG_IDS = [
  ...new Set([
    ...PHASE_1_BENZO_IDS,
    ...PHASE_2_ASM_IDS,
    ...PHASE_3_ANESTHETIC_IDS,
    ...OSMOTHERAPY_IDS,
  ]),
];

// ============================================================================
// 4. DESK DETECTION
// ============================================================================

export interface StatusEpilepticusDeskDetection {
  hasStatusEpilepticusAgent: boolean;
  hasPhase1Benzodiazepine: boolean;
  hasPhase2Asm: boolean;
  hasPhase3Anesthetic: boolean;
  hasOsmotherapy: boolean;
  matchedPhase1Ids: string[];
  matchedPhase2Ids: string[];
  matchedPhase3Ids: string[];
  matchedOsmotherapyIds: string[];
  allMatchedIds: string[];
  activePhaseSummary:
    | "Phase 1: Emergent Initial"
    | "Phase 2: Established"
    | "Phase 3: Refractory"
    | "Osmotherapy & ICP"
    | "Multi-Phase Regimen"
    | "None";
}

export function statusEpilepticusOnDesk(drugIds: string[]): StatusEpilepticusDeskDetection {
  const norm = drugIds.map((id) => id.toLowerCase().trim());

  const matchedPhase1Ids = norm.filter((id) =>
    PHASE_1_BENZO_IDS.some((p1) => p1 === id || id.includes(p1)),
  );
  const matchedPhase2Ids = norm.filter((id) =>
    PHASE_2_ASM_IDS.some((p2) => p2 === id || id.includes(p2)),
  );
  const matchedPhase3Ids = norm.filter((id) =>
    PHASE_3_ANESTHETIC_IDS.some((p3) => p3 === id || id.includes(p3)),
  );
  const matchedOsmotherapyIds = norm.filter((id) =>
    OSMOTHERAPY_IDS.some((osm) => osm === id || id.includes(osm)),
  );

  const hasPhase1 = matchedPhase1Ids.length > 0;
  const hasPhase2 = matchedPhase2Ids.length > 0;
  const hasPhase3 = matchedPhase3Ids.length > 0;
  const hasOsm = matchedOsmotherapyIds.length > 0;
  const hasAny = hasPhase1 || hasPhase2 || hasPhase3 || hasOsm;

  const activePhasesCount = [hasPhase1, hasPhase2, hasPhase3, hasOsm].filter(Boolean).length;

  let activePhaseSummary: StatusEpilepticusDeskDetection["activePhaseSummary"] = "None";
  if (activePhasesCount > 1) {
    activePhaseSummary = "Multi-Phase Regimen";
  } else if (hasPhase1) {
    activePhaseSummary = "Phase 1: Emergent Initial";
  } else if (hasPhase2) {
    activePhaseSummary = "Phase 2: Established";
  } else if (hasPhase3) {
    activePhaseSummary = "Phase 3: Refractory";
  } else if (hasOsm) {
    activePhaseSummary = "Osmotherapy & ICP";
  }

  const allMatchedIds = [
    ...new Set([
      ...matchedPhase1Ids,
      ...matchedPhase2Ids,
      ...matchedPhase3Ids,
      ...matchedOsmotherapyIds,
    ]),
  ];

  return {
    hasStatusEpilepticusAgent: hasAny,
    hasPhase1Benzodiazepine: hasPhase1,
    hasPhase2Asm: hasPhase2,
    hasPhase3Anesthetic: hasPhase3,
    hasOsmotherapy: hasOsm,
    matchedPhase1Ids,
    matchedPhase2Ids,
    matchedPhase3Ids,
    matchedOsmotherapyIds,
    allMatchedIds,
    activePhaseSummary,
  };
}

// ============================================================================
// 5. PHASE 1: EMERGENT INITIAL THERAPY (0 TO 5-20 MIN)
// ============================================================================

export interface Phase1BenzodiazepineDose {
  drugId: string;
  name: string;
  route: "IV" | "IM" | "PR" | "IN" | "Buccal";
  dosePerKgText: string;
  maxSingleDoseMg: number;
  calculatedDoseMg: number;
  maxCumulativeDoseMg: number;
  repeatIntervalMinutes: string;
  infusionRateLimit: string;
  evidenceBase: string;
  clinicalPearls: string[];
  vehicleWarnings: string[];
}

export interface Phase1Evaluation {
  timeWindow: string;
  patientWeightKg: number;
  firstLineRegimens: Phase1BenzodiazepineDose[];
  timingInstructions: string;
  transitionTrigger: string;
}

export function calculatePhase1Dosing(weightKg: number): Phase1Evaluation {
  const safeWeight = Math.max(10, Math.min(200, weightKg || 70));

  // 1. Lorazepam IV: 0.1 mg/kg IV (max 4.0 mg per single dose, repeat once at 5-10 min)
  const lzpDose = Math.min(4.0, Math.round(safeWeight * 0.1 * 10) / 10);
  const lorazepam: Phase1BenzodiazepineDose = {
    drugId: "lorazepam",
    name: "Lorazepam (Ativan)",
    route: "IV",
    dosePerKgText: "0.1 mg/kg IV",
    maxSingleDoseMg: 4.0,
    calculatedDoseMg: lzpDose,
    maxCumulativeDoseMg: 8.0,
    repeatIntervalMinutes: "5 to 10 minutes",
    infusionRateLimit: "Infuse at maximum 2.0 mg/min IV push",
    evidenceBase:
      "AES 2016 Level A recommendation. High affinity for GABA-A alpha-1/beta-2/gamma-2 complex with slow brain redistribution (longer effective duration in CNS than diazepam).",
    clinicalPearls: [
      "Preferred IV agent when vascular access is immediately available due to sustained CNS duration (redistribution t1/2 ~ 10-15h vs 30-60m for diazepam).",
      "Peak brain levels reached within 2-3 minutes of IV administration.",
      "If seizures persist after 5-10 minutes, administer a second identical dose (max cumulative 8 mg). If ongoing at 20 minutes, immediately initiate Phase 2.",
    ],
    vehicleWarnings: [
      "PROPYLENE GLYCOL TOXICITY HAZARD: Commercial lorazepam vials contain 40% propylene glycol and 10% ethanol as solubilizers. Continuous infusions provoke hyperosmolar lactic acidosis, osmolar gap elevation, and acute tubular necrosis. Indicated ONLY for intermittent boluses in SE.",
    ],
  };

  // 2. Midazolam IM: RAMPART trial (10 mg IM if >40 kg, 5 mg IM if 13-40 kg)
  const mdzImDose = safeWeight > 40 ? 10.0 : safeWeight >= 13 ? 5.0 : Math.round(safeWeight * 0.2 * 10) / 10;
  const midazolamIm: Phase1BenzodiazepineDose = {
    drugId: "midazolam",
    name: "Midazolam (Versed) IM",
    route: "IM",
    dosePerKgText: safeWeight > 40 ? "10 mg fixed IM (>40 kg)" : "5 mg fixed IM (13-40 kg)",
    maxSingleDoseMg: 10.0,
    calculatedDoseMg: mdzImDose,
    maxCumulativeDoseMg: 20.0,
    repeatIntervalMinutes: "5 to 10 minutes",
    infusionRateLimit: "Deep intramuscular injection (vastus lateralis or deltoid)",
    evidenceBase:
      "RAMPART NEJM 2012 / AES Level A. Non-inferior and faster time-to-seizure cessation than IV lorazepam in prehospital and non-IV settings due to immediate administration.",
    clinicalPearls: [
      "FIRST-LINE CHOICE WHEN NO IV ACCESS: Imidazole ring is open at formulation pH (<4) making it water-soluble, then closes at physiologic tissue pH (7.4) becoming highly lipophilic, enabling rapid absorption into systemic circulation and brain.",
      "Time from paramedics arriving to seizure termination was significantly shorter with IM midazolam than IV lorazepam in RAMPART due to avoided delays establishing IV access.",
    ],
    vehicleWarnings: [
      "Formulated in aqueous solution without propylene glycol; no vehicle hyperosmolality risks.",
    ],
  };

  // 3. Diazepam Rectal Gel (Diastat): 0.2 mg/kg PR (max 20 mg)
  const dzpPrDose = Math.min(20.0, Math.round(safeWeight * 0.2 * 10) / 10);
  const diazepamPr: Phase1BenzodiazepineDose = {
    drugId: "diazepam-rectal",
    name: "Diazepam Rectal Gel (Diastat)",
    route: "PR",
    dosePerKgText: "0.2 mg/kg PR (pediatric tiers: 0.2-0.5 mg/kg)",
    maxSingleDoseMg: 20.0,
    calculatedDoseMg: dzpPrDose,
    maxCumulativeDoseMg: 20.0,
    repeatIntervalMinutes: "Single dose; repeat once only under medical protocol",
    infusionRateLimit: "Slow rectal instillation using locked prefilled syringe applicator",
    evidenceBase:
      "AES Level A recommendation when neither IV nor IM routes are feasible.",
    clinicalPearls: [
      "Commercial Diastat AcuDial locks to preset dose (rounded to nearest 2.5 mg increments: 5, 7.5, 10, 12.5, 15, 17.5, 20 mg).",
      "Keep patient on side in recovery position to prevent aspiration while administering.",
    ],
    vehicleWarnings: [
      "Contains ethyl alcohol and propylene glycol; local rectal mucosal irritation possible.",
    ],
  };

  // 4. Diazepam IV: 0.15 - 0.2 mg/kg IV (max 10 mg per dose)
  const dzpIvDose = Math.min(10.0, Math.round(safeWeight * 0.2 * 10) / 10);
  const diazepamIv: Phase1BenzodiazepineDose = {
    drugId: "diazepam",
    name: "Diazepam (Valium) IV",
    route: "IV",
    dosePerKgText: "0.15 - 0.2 mg/kg IV",
    maxSingleDoseMg: 10.0,
    calculatedDoseMg: dzpIvDose,
    maxCumulativeDoseMg: 20.0,
    repeatIntervalMinutes: "5 to 10 minutes",
    infusionRateLimit: "Infuse at maximum 5.0 mg/min IV push",
    evidenceBase:
      "AES 2016 Level A alternative when lorazepam is unavailable.",
    clinicalPearls: [
      "EXTREME LIPOPHILICITY & REDISTRIBUTION RISK: Crosses blood-brain barrier within seconds, but rapidly redistributes into peripheral adipose stores within 30-60 minutes, leading to early recurrent seizures despite long systemic half-life (30-60 hours).",
    ],
    vehicleWarnings: [
      "Solubilized in 40% propylene glycol and 10% ethyl alcohol; slow administration prevents thrombophlebitis and hypotension.",
    ],
  };

  // 5. Intranasal Midazolam: 0.2 mg/kg IN (max 10 mg)
  const mdzInDose = Math.min(10.0, Math.round(safeWeight * 0.2 * 10) / 10);
  const midazolamIn: Phase1BenzodiazepineDose = {
    drugId: "midazolam-nasal",
    name: "Midazolam Intranasal (Nayzilam)",
    route: "IN",
    dosePerKgText: "0.2 mg/kg IN (or 5 mg spray per nostril)",
    maxSingleDoseMg: 10.0,
    calculatedDoseMg: mdzInDose,
    maxCumulativeDoseMg: 10.0,
    repeatIntervalMinutes: "10 minutes if seizures persist",
    infusionRateLimit: "Mucosal Atomization Device (MAD), split dose 50% per nostril",
    evidenceBase:
      "AES Level B evidence. High nasal mucosal vascularity provides rapid direct-to-CSF and venous absorption.",
    clinicalPearls: [
      "Commercial Nayzilam delivers 5.0 mg single spray per nostril (10 mg total if both nares used).",
      "Clean excess mucus prior to atomization; hold nostril closed for 5 seconds post-spray.",
    ],
    vehicleWarnings: [
      "Transient burning sensation and lacrimation common due to acidic formulation.",
    ],
  };

  return {
    timeWindow: "0 to 5-20 minutes from seizure onset (Emergent Initial Therapy)",
    patientWeightKg: safeWeight,
    firstLineRegimens: [lorazepam, midazolamIm, diazepamPr, diazepamIv, midazolamIn],
    timingInstructions:
      "Administer first dose immediately upon confirmation of continuous seizure lasting ≥ 5 minutes. If clinical or electrographic seizure continues at 5 to 10 minutes, administer exactly ONE repeat dose. If seizure continues past 20 minutes from onset, DO NOT continue administering benzodiazepines; advance immediately to Phase 2 Established Status Epilepticus therapy.",
    transitionTrigger:
      "SEIZURE PERSISTENCE ≥ 20 MINUTES: Synaptic GABA-A receptors undergo progressive clathrin-dependent endocytosis and dephosphorylation. Transition immediately to Phase 2 Established Status Epilepticus therapy (ESETT ASMs). Repeated benzodiazepine dosing after 20 minutes yields declining efficacy while exponentially increasing risks of respiratory depression, hypoventilation, and cardiovascular collapse.",
  };
}

// ============================================================================
// 6. PHASE 2: ESTABLISHED STATUS EPILEPTICUS & ESETT TRIAL COMPARATOR
// ============================================================================

export interface EsettComparatorEntry {
  drugId: string;
  name: string;
  brandName: string;
  targetMechanism: string;
  doseFormula: string;
  maxDoseMg: number;
  calculatedDoseMg: number;
  infusionDurationMinutes: number;
  maxInfusionRate: string;
  esett60MinEfficacyPct: number; // Percentage with seizure cessation at 60m
  esettEfficacyCi95: string;
  hemodynamicStability: "high" | "moderate" | "low";
  cardiacTelemetryRequired: boolean;
  renalAdjustmentRequired: boolean;
  criticalContraindications: string[];
  clinicalPearls: string[];
}

export interface Phase2Evaluation {
  timeWindow: string;
  patientWeightKg: number;
  esettSummary: {
    trialName: string;
    trialCitation: string;
    keyFinding: string;
    clinicalImplication: string;
  };
  comparators: EsettComparatorEntry[];
  alternativeSecondLine: {
    lacosamide: {
      doseMg: number;
      infusionTimeMinutes: string;
      mechanism: string;
      warning: string;
    };
    phenobarbital: {
      doseMgKg: number;
      maxDoseMg: number;
      calculatedDoseMg: number;
      rateLimit: string;
      warning: string;
    };
  };
}

export function calculatePhase2Dosing(
  weightKg: number,
  crclMlMin: number = 90,
): Phase2Evaluation {
  const safeWeight = Math.max(10, Math.min(200, weightKg || 70));

  // 1. Levetiracetam: 60 mg/kg IV (max 4,500 mg) over 10 min
  const levetiracetamDose = Math.min(4500, Math.round(safeWeight * 60));
  const levetiracetamEntry: EsettComparatorEntry = {
    drugId: "levetiracetam",
    name: "Levetiracetam",
    brandName: "Keppra",
    targetMechanism:
      "Binds synaptic vesicle protein 2A (SV2A), modulating presynaptic vesicle exocytosis and reducing glutamate release. Independent of GABA-A receptor trafficking.",
    doseFormula: "60 mg/kg IV (max 4,500 mg)",
    maxDoseMg: 4500,
    calculatedDoseMg: levetiracetamDose,
    infusionDurationMinutes: 10,
    maxInfusionRate: "Infuse calculated dose over 10 minutes (diluted in 100 mL NS or D5W)",
    esett60MinEfficacyPct: 47,
    esettEfficacyCi95: "39% - 55%",
    hemodynamicStability: "high",
    cardiacTelemetryRequired: false,
    renalAdjustmentRequired: true,
    criticalContraindications: [
      "Known hypersensitivity to levetiracetam or pyrrolidone derivatives.",
    ],
    clinicalPearls: [
      "NO CARDIAC TELEMETRY REQUIREMENT: Displays minimal to zero hemodynamic instability or cardiac arrhythmogenic liability compared to sodium channel blockers.",
      "RENAL ADJUSTMENT FOR MAINTENANCE: Excreted predominantly unchanged renally (66%). Acute status epilepticus loading dose (60 mg/kg) is administered in full regardless of CrCl to rapidly establish therapeutic neuro-axial levels, but subsequent maintenance dosing requires CrCl adjustments.",
      "Minimal hepatic metabolism and zero cytochrome P450 interactions, making it ideal in polypharmacy, liver failure, and critically ill patients.",
    ],
  };

  // 2. Fosphenytoin: 20 mg PE/kg IV (max 1,500 mg PE) infused at max 150 mg PE/min
  const fosphenytoinDose = Math.min(1500, Math.round(safeWeight * 20));
  const fosphenytoinMinTime = Math.max(10, Math.ceil(fosphenytoinDose / 150));
  const fosphenytoinEntry: EsettComparatorEntry = {
    drugId: "fosphenytoin",
    name: "Fosphenytoin Sodium",
    brandName: "Cerebyx",
    targetMechanism:
      "Prodrug of phenytoin; cleaved by plasma and tissue alkaline phosphatases (t1/2 ~ 8-15m) to phenytoin, which blocks voltage-gated sodium channels (Nav1.1, Nav1.2) in their inactive state.",
    doseFormula: "20 mg PE/kg IV (max 1,500 mg PE, where 1 mg PE = 1.5 mg fosphenytoin sodium = 1 mg phenytoin sodium)",
    maxDoseMg: 1500,
    calculatedDoseMg: fosphenytoinDose,
    infusionDurationMinutes: fosphenytoinMinTime,
    maxInfusionRate: "Maximum 150 mg PE/min IV infusion rate rail",
    esett60MinEfficacyPct: 45,
    esettEfficacyCi95: "36% - 54%",
    hemodynamicStability: "moderate",
    cardiacTelemetryRequired: true,
    renalAdjustmentRequired: false,
    criticalContraindications: [
      "Sinus bradycardia, sinoatrial block, second- and third-degree AV block, Adams-Stokes syndrome.",
      "Prior acute hepatotoxicity or severe cutaneous adverse reactions (SCAR / DRESS / Stevens-Johnson Syndrome / TEN) attributed to hydantoins.",
    ],
    clinicalPearls: [
      "MANDATORY CONTINUOUS CARDIAC TELEMETRY: Phenytoin blocks cardiac Nav1.5 channels, risking conduction delays, PR/QRS widening, severe hypotension, ventricular arrhythmias, and asystole. Continuous ECG and blood pressure monitoring are mandatory during infusion.",
      "MAXIMUM RATE 150 mg PE/MIN: Because fosphenytoin is water-soluble (pH 8.6-9.0) and lacks propylene glycol, it can be infused 3x faster than parent phenytoin (max 50 mg/min), significantly reducing infusion time.",
      "ELIMINATES PURPLE GLOVE SYNDROME: Parenteral phenytoin has a pH of 12 with 40% propylene glycol, causing chemical thrombosis, skin necrosis, and purple glove syndrome upon extravasation. Fosphenytoin eliminates this risk.",
    ],
  };

  // 3. Valproate Sodium: 40 mg/kg IV (max 3,000 mg) over 10 min
  const valproateDose = Math.min(3000, Math.round(safeWeight * 40));
  const valproateEntry: EsettComparatorEntry = {
    drugId: "valproate",
    name: "Valproate Sodium",
    brandName: "Depacon",
    targetMechanism:
      "Multimodal: Increases cerebral GABA levels by inhibiting GABA transaminase (GABA-T) and succinic semialdehyde dehydrogenase; suppresses NMDA-mediated excitotoxicity; blocks T-type calcium channels and voltage-gated sodium channels.",
    doseFormula: "40 mg/kg IV (max 3,000 mg)",
    maxDoseMg: 3000,
    calculatedDoseMg: valproateDose,
    infusionDurationMinutes: 10,
    maxInfusionRate: "Infuse calculated dose over 10 minutes (~3-6 mg/kg/min)",
    esett60MinEfficacyPct: 46,
    esettEfficacyCi95: "38% - 55%",
    hemodynamicStability: "high",
    cardiacTelemetryRequired: false,
    renalAdjustmentRequired: false,
    criticalContraindications: [
      "POLG MUTATIONS & MITOCHONDRIAL DISORDERS: Fatal fulminant hepatic necrosis in patients with polymerase gamma (POLG) mutations (e.g. Alpers-Huttenlocher syndrome). Absolute contraindication.",
      "SEVERE HEPATIC IMPAIRMENT / ACUTE HEPATITIS: High risk of unrecoverable liver failure.",
      "UREA CYCLE DISORDERS (UCD): Precipitates acute hyperammonemic encephalopathy and cerebral edema via carbamoyl phosphate synthetase I (CPS-1) inhibition.",
      "PREGNANCY: High teratogenicity (major congenital malformations and neural tube defects ~10%, significant IQ reduction).",
      "PANCREATITIS: History of valproate-induced hemorrhagic pancreatitis.",
    ],
    clinicalPearls: [
      "BROADEST SPECTRUM EFFICACY: Excellent choice in primary generalized epilepsies, myoclonic status epilepticus, and focal status.",
      "Excellent hemodynamic profile with minimal hypotension or cardiac conduction suppression compared to fosphenytoin.",
      "Check baseline ammonia, LFTs, and pregnancy test; co-administration with carbapenems (meropenem) slashes valproate levels by >80-90% within 24 hours, causing breakthrough status.",
    ],
  };

  // Second-line Alternatives
  const lacosamideDose = 400; // Standard IV loading dose
  const phenoDose = Math.min(1000, Math.round(safeWeight * 20));

  return {
    timeWindow: "20 to 40 minutes from seizure onset (Established Status Epilepticus)",
    patientWeightKg: safeWeight,
    esettSummary: {
      trialName: "Established Status Epilepticus Treatment Trial (ESETT)",
      trialCitation: "Kapur J, et al. N Engl J Med. 2019;381(22):2103-2113.",
      keyFinding:
        "Levetiracetam (47%), Fosphenytoin (45%), and Valproate sodium (46%) demonstrated statistical non-inferiority for seizure cessation and neurological recovery at 60 minutes in convulsive SE refractory to benzodiazepines. Primary safety outcomes (hypotension, intubation, arrhythmias) showed no significant differences.",
      clinicalImplication:
        "Clinicians should choose between levetiracetam, fosphenytoin, and valproate based on patient-specific contraindications (e.g. cardiac conduction disease -> avoid fosphenytoin; liver failure / mitochondrial disease -> avoid valproate; severe CKD -> adjust levetiracetam maintenance).",
    },
    comparators: [levetiracetamEntry, fosphenytoinEntry, valproateEntry],
    alternativeSecondLine: {
      lacosamide: {
        doseMg: lacosamideDose,
        infusionTimeMinutes: "5 to 15 minutes",
        mechanism:
          "Selectively enhances slow inactivation of voltage-gated sodium channels without altering fast inactivation.",
        warning:
          "CARDIAC PR INTERVAL PROLONGATION: Can cause first-, second-, or third-degree AV block and syncope. Caution when co-administered with other AV nodal blockers (beta-blockers, diltiazem, verapamil, digoxin).",
      },
      phenobarbital: {
        doseMgKg: 20,
        maxDoseMg: 1000,
        calculatedDoseMg: phenoDose,
        rateLimit: "Maximum 50 to 100 mg/min IV infusion rate",
        warning:
          "SEVERE RESPIRATORY DEPRESSION & HYPOTENSION: Positive allosteric modulator of GABA-A (prolongs channel open time). Immediate bedside airway management and mechanical ventilation capability required.",
      },
    },
  };
}

// ============================================================================
// 7. PHASE 3: REFRACTORY STATUS EPILEPTICUS (RSE & SRSE)
// ============================================================================

export interface Phase3AnestheticRegimen {
  drugId: string;
  name: string;
  brandName: string;
  receptorMechanism: string;
  loadingBolusText: string;
  calculatedBolusMg: string;
  maintenanceInfusionRate: string;
  calculatedMaintenanceRateMgH: string;
  burstSuppressionTarget: string;
  tachyphylaxisRisk: "high" | "moderate" | "low";
  safetyCeilingAlert: string;
  clinicalPearls: string[];
}

export interface Phase3Evaluation {
  timeWindow: string;
  patientWeightKg: number;
  definition: {
    refractorySe: string;
    superRefractorySe: string;
    electrographicTarget: string;
  };
  anesthetics: Phase3AnestheticRegimen[];
}

export function calculatePhase3Dosing(weightKg: number): Phase3Evaluation {
  const safeWeight = Math.max(10, Math.min(200, weightKg || 70));

  // 1. Propofol (Diprivan)
  const propBolusLow = Math.round(safeWeight * 1.0);
  const propBolusHigh = Math.round(safeWeight * 2.0);
  // 30 - 100 mcg/kg/min -> 1.8 - 6.0 mg/kg/h
  const propRateLowMgH = Math.round(safeWeight * 0.03 * 60 * 10) / 10;
  const propRateHighMgH = Math.round(safeWeight * 0.1 * 60 * 10) / 10;

  const propofolRegimen: Phase3AnestheticRegimen = {
    drugId: "propofol",
    name: "Propofol",
    brandName: "Diprivan",
    receptorMechanism:
      "Potent GABA-A receptor positive allosteric modulator at beta-subunit transmembrane domain, directly activating chloride conductance at high concentrations and inhibiting NMDA receptors.",
    loadingBolusText: "1.0 - 2.0 mg/kg IV bolus over 3-5 min; repeat 1 mg/kg every 3-5 min until burst suppression",
    calculatedBolusMg: `${propBolusLow} - ${propBolusHigh} mg IV bolus`,
    maintenanceInfusionRate: "30 - 100 mcg/kg/min (approx. 1.8 - 6.0 mg/kg/h)",
    calculatedMaintenanceRateMgH: `${propRateLowMgH} - ${propRateHighMgH} mg/h`,
    burstSuppressionTarget:
      "Titrate to 8-12 seconds of interburst interval or >50-80% suppression on continuous video-EEG (cEEG).",
    tachyphylaxisRisk: "low",
    safetyCeilingAlert:
      "PROPOFOL INFUSION SYNDROME (PRIS) WARNING: Doses > 4-5 mg/kg/h (> 67-83 mcg/kg/min) or duration > 48 hours carry lethal risk of mitochondrial respiratory chain uncoupling, fatty acid oxidation failure, refractory lactic acidosis, rhabdomyolysis, hyperkalemia, acute kidney injury, Brugada-like ST elevation, and fatal asystolic cardiac arrest. Monitor serial lactate, triglycerides, and CPK.",
    clinicalPearls: [
      "Ultra-rapid onset and offset allow periodic sedation holidays for neuro-examination.",
      "Formulated in 10% lipid emulsion delivering 1.1 kcal/mL; account for caloric load in enteral/parenteral nutrition.",
      "Profound vasodilation and myocardial depression often necessitate concurrent vasopressor support (norepinephrine).",
    ],
  };

  // 2. Midazolam Continuous Infusion
  const midzBolus = Math.round(safeWeight * 0.2 * 10) / 10;
  // 0.05 - 2.0 mg/kg/h
  const midzRateLowMgH = Math.round(safeWeight * 0.05 * 10) / 10;
  const midzRateHighMgH = Math.round(safeWeight * 2.0 * 10) / 10;

  const midazolamRegimen: Phase3AnestheticRegimen = {
    drugId: "midazolam",
    name: "Midazolam Continuous Infusion",
    brandName: "Versed",
    receptorMechanism:
      "GABA-A positive allosteric modulator increasing chloride channel opening frequency.",
    loadingBolusText: "0.2 mg/kg IV bolus; repeat 0.1-0.2 mg/kg every 5-10 min until seizure cessation (max load 2 mg/kg)",
    calculatedBolusMg: `${midzBolus} mg IV bolus (repeat q5-10m as needed)`,
    maintenanceInfusionRate: "0.05 - 2.0 mg/kg/h IV continuous infusion",
    calculatedMaintenanceRateMgH: `${midzRateLowMgH} - ${midzRateHighMgH} mg/h`,
    burstSuppressionTarget:
      "Titrate to electrographic seizure suppression or burst suppression pattern on cEEG.",
    tachyphylaxisRisk: "high",
    safetyCeilingAlert:
      "RAPID TACHYPHYLAXIS KINETICS: Continuous exposure precipitates accelerated endocytosis and down-regulation of postsynaptic GABA-A receptors within 24-48 hours. Patients frequently experience breakthrough seizures despite escalating infusion rates, requiring transition to non-GABAergic agents.",
    clinicalPearls: [
      "Superior hemodynamic stability compared to propofol and pentobarbital.",
      "Active metabolite 1-hydroxymidazolam glucuronide accumulates in acute renal dysfunction, resulting in prolonged coma upon cessation.",
    ],
  };

  // 3. Ketamine (Ketalar)
  const ketBolusLow = Math.round(safeWeight * 1.5 * 10) / 10;
  const ketBolusHigh = Math.round(safeWeight * 3.0 * 10) / 10;
  // 1.0 - 10.0 mg/kg/h (approx. 15 - 150 mcg/kg/min)
  const ketRateLowMgH = Math.round(safeWeight * 1.0);
  const ketRateHighMgH = Math.round(safeWeight * 10.0);

  const ketamineRegimen: Phase3AnestheticRegimen = {
    drugId: "ketamine",
    name: "Ketamine",
    brandName: "Ketalar",
    receptorMechanism:
      "Uncompetitive, open-channel NMDA receptor antagonist (phencyclidine site within pore). Blocks excessive inward calcium flux and down-regulates glutamatergic excitotoxicity.",
    loadingBolusText: "1.5 - 3.0 mg/kg IV bolus over 5 minutes",
    calculatedBolusMg: `${ketBolusLow} - ${ketBolusHigh} mg IV bolus`,
    maintenanceInfusionRate: "1.0 - 10.0 mg/kg/h (approx. 15 - 150 mcg/kg/min)",
    calculatedMaintenanceRateMgH: `${ketRateLowMgH} - ${ketRateHighMgH} mg/h`,
    burstSuppressionTarget:
      "Titrate to electrographic seizure cessation and suppression of periodic discharges on cEEG.",
    tachyphylaxisRisk: "low",
    safetyCeilingAlert:
      "MONITOR FOR NEUROPSYCHIATRIC EMERGENCE & SYMPATHETIC STIMULATION: Ketamine increases endogenous catecholamine tone. Although neuroprotective and hemodynamic-sparing in RSE, high doses can cause tachycardia, hypertension, and emergence delirium (prevented by concurrent midazolam or propofol).",
    clinicalPearls: [
      "CRITICAL ROLE IN GABAERGIC RESISTANCE: As status epilepticus progresses past 30-40 minutes, synaptic GABA-A receptors internalize while NMDA and AMPA receptors are translocated to the postsynaptic active zone. Ketamine directly targets this upregulated glutamatergic drive when GABAergic drugs completely fail!",
      "HEMODYNAMIC ADVANTAGE: Sympathomimetic properties preserve mean arterial pressure (MAP) and cerebral perfusion pressure (CPP), counteracting the vasodilatory hypotension of propofol or midazolam.",
      "Synergistic when co-administered with GABAergic anesthetics (e.g., Ketamine + Propofol or Ketamine + Midazolam).",
    ],
  };

  // 4. Pentobarbital (Barbiturate coma)
  const pentBolus = Math.round(safeWeight * 5.0);
  const pentRateLowMgH = Math.round(safeWeight * 1.0);
  const pentRateHighMgH = Math.round(safeWeight * 5.0);

  const pentobarbitalRegimen: Phase3AnestheticRegimen = {
    drugId: "pentobarbital",
    name: "Pentobarbital",
    brandName: "Nembutal",
    receptorMechanism:
      "GABA-A receptor positive allosteric modulator and direct chloride channel opener at high concentrations; inhibits AMPA receptors.",
    loadingBolusText: "5.0 mg/kg IV bolus over 10 minutes",
    calculatedBolusMg: `${pentBolus} mg IV bolus`,
    maintenanceInfusionRate: "1.0 - 5.0 mg/kg/h IV continuous infusion",
    calculatedMaintenanceRateMgH: `${pentRateLowMgH} - ${pentRateHighMgH} mg/h`,
    burstSuppressionTarget:
      "Definitive burst suppression on cEEG (target 10-15 seconds suppression pattern).",
    tachyphylaxisRisk: "low",
    safetyCeilingAlert:
      "SEVERE SYSTEMIC COMPLICATIONS: High incidence of refractory myocardial depression and peripheral vasodilation requiring multiple vasopressors; paralytic ileus; profound immunosuppression with ventilator-associated pneumonia; and prolonged elimination half-life (t1/2 30-120 hours) resulting in coma lasting days to weeks post-infusion.",
    clinicalPearls: [
      "Reserved for super-refractory status epilepticus (SRSE) failing propofol, midazolam, and ketamine.",
      "Continuous arterial line and central venous access mandatory.",
    ],
  };

  return {
    timeWindow: ">40 minutes from seizure onset (Refractory & Super-Refractory SE)",
    patientWeightKg: safeWeight,
    definition: {
      refractorySe:
        "Seizure persistence despite adequate doses of initial benzodiazepine (Phase 1) PLUS at least one second-line antiseizure medication (Phase 2). Occurs in 20-30% of SE cases.",
      superRefractorySe:
        "Seizures continuing or recurring ≥ 24 hours after the onset of anesthetic therapy, or recurring upon weaning or reduction of general anesthesia. Mortality exceeds 30-50%.",
      electrographicTarget:
        "Continuous electrographic burst suppression on continuous video-EEG (cEEG) with 8-12 seconds of interburst interval or >50-80% suppression pattern for at least 24 to 48 hours before planned weaning.",
    },
    anesthetics: [propofolRegimen, midazolamRegimen, ketamineRegimen, pentobarbitalRegimen],
  };
}

// ============================================================================
// 8. PHARMACORESISTANCE & SYNAPTIC PLASTICITY KINETICS
// ============================================================================

export interface ReceptorKineticsPoint {
  timeMinutes: number;
  synapticGabaADensityPct: number; // % of baseline remaining on synaptic surface
  benzodiazepineFoldResistance: number; // Fold increase in resistance (1.0 = normal, up to 20x)
  synapticNmdaDensityPct: number; // % of baseline NMDA/AMPA density (upregulated)
  pharmacoresistanceIndex: number; // 0.0 to 1.0 (clamped)
  clinicalPhaseName: string;
  recommendedTargetMechanism: string;
}

export interface GabaInternalizationEvaluation {
  seizureDurationMinutes: number;
  currentKinetics: ReceptorKineticsPoint;
  timelineCurve: ReceptorKineticsPoint[];
  molecularPathophysiology: {
    gabaInternalizationMechanism: string;
    glutamateUpregulationMechanism: string;
    clinicalImplicationForKetamine: string;
    benzodiazepineFailureExplanation: string;
  };
}

/**
 * Models the time-dependent loss of synaptic GABA-A receptor density and parallel
 * upregulation of postsynaptic NMDA/AMPA receptors during continuous status epilepticus.
 *
 * Mathematical derivation:
 * - GABA-A loss follows exponential decay: R_gaba(t) = R_min + (100 - R_min) * exp(-k_gaba * t)
 *   where R_min ~ 15% and k_gaba ~ 0.035 min^-1.
 * - Fold-resistance = 1.0 + 19.0 * (1 - exp(-k_gaba * t)), scaling from 1x to 20x.
 * - NMDA/AMPA upregulation: R_nmda(t) = 100 + (280 - 100) * (1 - exp(-k_nmda * t))
 *   where k_nmda ~ 0.030 min^-1, expanding from 100% to ~280% of baseline.
 */
export function calculateGabaInternalization(
  seizureDurationMinutes: number,
): GabaInternalizationEvaluation {
  const duration = Math.max(0, Math.min(180, seizureDurationMinutes));

  const kGaba = 0.035;
  const kNmda = 0.03;
  const rMinGaba = 15.0;
  const rMaxNmda = 280.0;

  function evaluatePoint(t: number): ReceptorKineticsPoint {
    const gabaDensity = Math.round(
      (rMinGaba + (100.0 - rMinGaba) * Math.exp(-kGaba * t)) * 10,
    ) / 10;

    const foldResistance = Math.round(
      (1.0 + 19.0 * (1.0 - Math.exp(-kGaba * t))) * 10,
    ) / 10;

    const nmdaDensity = Math.round(
      (100.0 + (rMaxNmda - 100.0) * (1.0 - Math.exp(-kNmda * t))) * 10,
    ) / 10;

    // Pharmacoresistance index 0.0 to 1.0
    const rawIndex = (100.0 - gabaDensity) / (100.0 - rMinGaba);
    const index = Math.min(1.0, Math.max(0.0, Math.round(rawIndex * 100) / 100));

    let clinicalPhaseName = "";
    let recommendedTargetMechanism = "";

    if (t <= 5) {
      clinicalPhaseName = "Phase 1: Emergent Seizure (GABA-A Receptors Fully Intact)";
      recommendedTargetMechanism =
        "Potent GABA-A Positive Allosteric Modulator (IV Lorazepam, IM Midazolam). Maximal pharmacologic sensitivity.";
    } else if (t <= 20) {
      clinicalPhaseName = "Phase 1 Late / Transition (Early GABA-A Endocytosis)";
      recommendedTargetMechanism =
        "Rapid second benzodiazepine dose if ongoing. Prepare Phase 2 ASMs immediately before resistance accelerates.";
    } else if (t <= 40) {
      clinicalPhaseName = "Phase 2: Established SE (Marked GABA-A Internalization)";
      recommendedTargetMechanism =
        "Non-GABA-A dependent mechanisms: Presynaptic SV2A ligand (Levetiracetam), Sodium channel blockade (Fosphenytoin), or Multi-target (Valproate).";
    } else if (t <= 60) {
      clinicalPhaseName = "Phase 3: Refractory SE (Severe GABA-A Depletion, NMDA Surge)";
      recommendedTargetMechanism =
        "Continuous general anesthetics: Direct GABA-A channel openers (Propofol) paired with uncompetitive NMDA receptor antagonist (Ketamine).";
    } else {
      clinicalPhaseName = "Phase 3 Late / Super-Refractory SE (Profound Pharmacoresistance)";
      recommendedTargetMechanism =
        "Polytherapy targeting non-internalized pathways: High-dose Ketamine (NMDA antagonism) + Propofol/Pentobarbital + neuroprotection.";
    }

    return {
      timeMinutes: t,
      synapticGabaADensityPct: gabaDensity,
      benzodiazepineFoldResistance: foldResistance,
      synapticNmdaDensityPct: nmdaDensity,
      pharmacoresistanceIndex: index,
      clinicalPhaseName,
      recommendedTargetMechanism,
    };
  }

  const currentKinetics = evaluatePoint(duration);

  // Standard timeline milestones for curve plotting: 0, 5, 10, 20, 30, 45, 60, 90, 120 min
  const standardMilestones = [0, 5, 10, 20, 30, 45, 60, 90, 120];
  const timelineCurve = standardMilestones.map((m) => evaluatePoint(m));

  return {
    seizureDurationMinutes: duration,
    currentKinetics,
    timelineCurve,
    molecularPathophysiology: {
      gabaInternalizationMechanism:
        "Within 15 to 30 minutes of continuous epileptic firing, massive intracellular calcium influx activates protein phosphatases (calcineurin), triggering dephosphorylation of synaptic GABA-A receptor beta-2/3 and gamma-2 subunits. Dephosphorylated receptors are rapidly sequestered into clathrin-coated pits, endocytosed into intracellular endosomes, and degraded or recycled, leaving as little as 15-20% of functional targets on the postsynaptic membrane.",
      glutamateUpregulationMechanism:
        "Simultaneously, unremitting synaptic glutamate release activates postsynaptic second-messenger cascades (CaMKII), promoting forward trafficking and exocytosis of NMDA (GluN1/GluN2B) and AMPA (GluA1/GluA2) receptor complexes from reserve pools to the synaptic membrane. Postsynaptic excitatory receptor density surges by 250% to 280% of baseline.",
      clinicalImplicationForKetamine:
        "This receptor trafficking mismatch provides the profound mechanistic rationale for Ketamine in refractory status epilepticus. When synaptic GABA-A targets are depleted, traditional GABAergic agents lose efficacy. Ketamine acts as an uncompetitive open-channel blocker of the newly mobilized, pathogenic NMDA receptors, quenching the glutamate excitotoxic drive and halting seizure propagation.",
      benzodiazepineFailureExplanation:
        "The endocytosis of benzodiazepine-sensitive synaptic GABA-A receptors causes up to a 20-fold loss of benzodiazepine potency within 30 to 60 minutes. Giving repetitive or escalating benzodiazepines after 20 minutes fails to terminate seizures while precipitating profound cardiovascular collapse, respiratory depression, and death.",
    },
  };
}

// ============================================================================
// 9. OSMOTHERAPY FOR ACUTE CEREBRAL EDEMA & ELEVATED ICP
// ============================================================================

export interface HypertonicSalineRegimen {
  agentName: string;
  concentrationPercent: number; // 23.4
  standardBolusVolumeMl: number; // 30 mL
  infusionTimeMinutes: string; // 10 to 15 min
  osmolalityMOsmL: number; // 8,008 mOsm/L
  sodiumContentMeqMl: number; // 4.0 mEq/mL
  sodiumContentMeqL: number; // 801 mEq per 30 mL scale -> 4,004 mEq/L
  totalSodiumDeliveredMeq: number; // 120 mEq in 30 mL
  routeRequirement: "CENTRAL VENOUS LINE ONLY (CVL or PICC)";
  targetSerumSodiumRange: string; // 145 - 155 mEq/L
  serumSodiumMaxCeiling: number; // 160 mEq/L
  serumOsmolalityMaxCeiling: number; // 320 mOsm/kg
  maxSafeCorrectionRate24h: string; // <= 8-10 mEq/L in 24h
  osmoticDemyelinationRisk: string;
  acidBaseConsequence: string;
  clinicalPearls: string[];
  safetyWarnings: string[];
}

export interface MannitolRegimen {
  agentName: string;
  concentrationPercent: number; // 20%
  osmolalityMOsmL: number; // 1,098 mOsm/L
  doseGramsPerKgLow: number; // 0.5 g/kg
  doseGramsPerKgHigh: number; // 1.0 g/kg
  calculatedGramsLow: number;
  calculatedGramsHigh: number;
  calculatedVolumeMlLow: number; // 0.5 g/kg -> 2.5 mL/kg
  calculatedVolumeMlHigh: number; // 1.0 g/kg -> 5.0 mL/kg
  infusionDurationMinutes: string; // 20 to 30 min
  mandatoryFilter: "In-line 0.22-micron filter (crystallization hazard)";
  contraindicationCeilingOsm: number; // >= 320 mOsm/kg
  contraindicationCeilingOsmolarGap: number; // > 15-20 mOsm/kg
  triphasicMechanism: string[];
  renalSafetyWarnings: string[];
  clinicalPearls: string[];
}

export interface OsmotherapyEvaluation {
  patientWeightKg: number;
  currentSerumNa: number;
  currentSerumOsm: number;
  hypertonicSaline234: HypertonicSalineRegimen;
  mannitol20: MannitolRegimen;
  comparativeMatrix: {
    onsetOfIcpReduction: string;
    durationOfIcpReduction: string;
    reboundEdemaRisk: string;
    hemodynamicImpact: string;
    renalSafetyThreshold: string;
  };
}

export function calculateOsmotherapy(
  weightKg: number,
  options?: {
    currentSerumNa?: number;
    currentSerumOsm?: number;
  },
): OsmotherapyEvaluation {
  const safeWeight = Math.max(10, Math.min(200, weightKg || 70));
  const currentNa = options?.currentSerumNa ?? 140;
  const currentOsm = options?.currentSerumOsm ?? 290;

  // 1. 23.4% Hypertonic Saline: 30 mL bolus over 10-15 min via central line
  const htsRegimen: HypertonicSalineRegimen = {
    agentName: "23.4% Hypertonic Saline (NaCl)",
    concentrationPercent: 23.4,
    standardBolusVolumeMl: 30,
    infusionTimeMinutes: "10 to 15 minutes",
    osmolalityMOsmL: 8008,
    sodiumContentMeqMl: 4.0,
    sodiumContentMeqL: 4004,
    totalSodiumDeliveredMeq: 120, // 30 mL * 4 mEq/mL
    routeRequirement: "CENTRAL VENOUS LINE ONLY (CVL or PICC)",
    targetSerumSodiumRange: "145 - 155 mEq/L",
    serumSodiumMaxCeiling: 160,
    serumOsmolalityMaxCeiling: 320,
    maxSafeCorrectionRate24h: "Maximum 8 to 10 mEq/L rise per 24 hours in chronic hyponatremia",
    osmoticDemyelinationRisk:
      "OSMOTIC DEMYELINATION SYNDROME (ODS) / CENTRAL PONTINE MYELINOLYSIS: In patients with baseline chronic hyponatremia (< 130 mEq/L), rapid sodium elevation causes dehydration of pontine glial cells, demyelination, spastic quadriparesis, pseudobulbar palsy, and locked-in syndrome. Limit correction rate to ≤ 8 mEq/L per 24h.",
    acidBaseConsequence:
      "HYPERCHLOREMIC METABOLIC ACIDOSIS: Delivers an equimolar ratio of sodium to chloride (120 mEq Na+ and 120 mEq Cl-). Reduces the serum Strong Ion Difference (SID = [Na+] - [Cl-]), precipitating or exacerbating non-anion gap metabolic acidosis.",
    clinicalPearls: [
      "GOLD STANDARD IN TRANSTENTORIAL HERNIATION: Produces an immediate, powerful transluminal osmotic gradient across the intact blood-brain barrier (reflection coefficient sigma = 1.0 for sodium), extracting water from the cerebral parenchyma into the intravascular space within minutes.",
      "No diuretic effect compared to mannitol; expands intravascular volume, supporting cerebral perfusion pressure (CPP = MAP - ICP).",
      "Repeat boluses of 30 mL may be given q3-4h PRN for acute ICP spikes provided serum Na remains < 155-160 mEq/L and serum osmolality < 320 mOsm/kg.",
    ],
    safetyWarnings: [
      "MANDATORY CENTRAL VENOUS LINE: Extreme hyperosmolality (8,008 mOsm/L) causes catastrophic peripheral vein thrombophlebitis, vascular spasm, and extensive subcutaneous chemical necrosis/gangrene if extravasated.",
      "HOLD IF SERUM SODIUM ≥ 160 mEq/L or SERUM OSMOLALITY ≥ 320 mOsm/kg.",
    ],
  };

  // 2. Mannitol 20%: 0.5 to 1.0 g/kg IV over 20-30 min
  const manGramsLow = Math.round(safeWeight * 0.5 * 10) / 10;
  const manGramsHigh = Math.round(safeWeight * 1.0 * 10) / 10;
  // 20% solution = 0.2 g/mL -> 1 g = 5 mL
  const manVolLow = Math.round(manGramsLow * 5);
  const manVolHigh = Math.round(manGramsHigh * 5);

  const mannitolRegimen: MannitolRegimen = {
    agentName: "Mannitol 20% IV",
    concentrationPercent: 20.0,
    osmolalityMOsmL: 1098,
    doseGramsPerKgLow: 0.5,
    doseGramsPerKgHigh: 1.0,
    calculatedGramsLow: manGramsLow,
    calculatedGramsHigh: manGramsHigh,
    calculatedVolumeMlLow: manVolLow,
    calculatedVolumeMlHigh: manVolHigh,
    infusionDurationMinutes: "20 to 30 minutes",
    mandatoryFilter: "In-line 0.22-micron filter (crystallization hazard)",
    contraindicationCeilingOsm: 320,
    contraindicationCeilingOsmolarGap: 20,
    triphasicMechanism: [
      "1. Immediate Rheologic Viscosity Reduction (0-15 min): Expands plasma volume and dilutes hematocrit, lowering blood viscosity and increasing microvascular cerebral blood flow. Triggers reflex cerebrovascular vasoconstriction, immediately reducing cerebral blood volume and ICP.",
      "2. Delayed Osmotic Dehydration (15-60 min): Creates osmotic gradient across intact blood-brain barrier (reflection coefficient sigma = 0.9), extracting free water from brain parenchyma into intravascular space.",
      "3. Renal Osmotic Diuresis (1-4 hours): Inhibits water and sodium reabsorption in the loop of Henle and proximal tubules, promoting profound osmotic diuresis.",
    ],
    renalSafetyWarnings: [
      "OSMOTIC NEPHROSIS HAZARD: Mannitol is freely filtered at the glomerulus. If renal clearance is impaired, high concentrations accumulate intracellularly in proximal tubule cells, inducing severe cytoplasmic vacuolization, acute tubular necrosis, and anuric acute kidney injury.",
      "HOLD IF SERUM OSMOLALITY ≥ 320 mOsm/kg OR OSMOLAR GAP > 15-20 mOsm/kg.",
      "CONTRAINDICATED IN ANURIA, SEVERE DEHYDRATION, OR FLASH PULMONARY EDEMA / CHF (initial volume expansion increases preload and provokes decompensated cardiac failure).",
    ],
    clinicalPearls: [
      "MANDATORY IN-LINE 0.22-MICRON FILTER: Mannitol readily crystallizes out of solution at cool or room temperatures. Infusion of microscopic crystals can cause pulmonary microembolism and vascular occlusion. Always inspect bag for crystals and infuse through an in-line filter.",
      "MONITOR HYPOVOLEMIA & EUVOLEMIA: The delayed osmotic diuresis can lead to massive free water loss, hypovolemia, hypotension, and compromised cerebral perfusion pressure. Replace urinary losses with isotonic crystalloids (normal saline).",
      "REBOUND ELEVATION IN ICP: With prolonged or repeated dosing, mannitol can slowly leak across a disrupted blood-brain barrier into brain parenchyma, reversing the osmotic gradient and provoking severe rebound cerebral edema.",
    ],
  };

  return {
    patientWeightKg: safeWeight,
    currentSerumNa: currentNa,
    currentSerumOsm: currentOsm,
    hypertonicSaline234: htsRegimen,
    mannitol20: mannitolRegimen,
    comparativeMatrix: {
      onsetOfIcpReduction:
        "23.4% Saline: 5 to 10 minutes | Mannitol: 10 to 15 minutes (rheologic effect within minutes).",
      durationOfIcpReduction:
        "23.4% Saline: 2 to 6 hours | Mannitol: 1.5 to 4 hours.",
      reboundEdemaRisk:
        "23.4% Saline: Lower risk (sodium reflection coefficient sigma = 1.0) | Mannitol: Moderate-to-high risk (sigma = 0.9; leaks into injured brain with repeated dosing).",
      hemodynamicImpact:
        "23.4% Saline: Sustained intravascular expansion, elevates MAP/CPP | Mannitol: Transient expansion followed by delayed profound diuresis and hypovolemia.",
      renalSafetyThreshold:
        "23.4% Saline: Hold if Na ≥ 160 mEq/L or Osm ≥ 320 mOsm/kg | Mannitol: Hold if Osm ≥ 320 mOsm/kg or Osmolar Gap > 15-20 mOsm/kg.",
    },
  };
}

// ============================================================================
// 10. COLLISION & SAFETY ALERTS GENERATOR
// ============================================================================

export interface StatusEpilepticusSafetyCollision {
  id: string;
  title: string;
  severity: "critical" | "warning" | "advisory";
  mechanism: string;
  clinicalConsequence: string;
  managementGuidance: string;
  citations: string[];
}

export function evaluateStatusEpilepticusCollisions(
  drugIds: string[],
  seizureDurationMinutes: number = 30,
): StatusEpilepticusSafetyCollision[] {
  const norm = drugIds.map((id) => id.toLowerCase().trim());
  const collisions: StatusEpilepticusSafetyCollision[] = [];

  const hasPropofol = norm.includes("propofol");
  const hasFosphenytoin = norm.some((id) => id.includes("fosphenytoin") || id.includes("phenytoin"));
  const hasValproate = norm.some((id) => id.includes("valproate"));
  const hasLacosamide = norm.includes("lacosamide");
  const hasBenzo = norm.some((id) => PHASE_1_BENZO_IDS.some((b) => id.includes(b)));
  const hasMannitol = norm.some((id) => id.includes("mannitol"));
  const hasHts = norm.some((id) => id.includes("hypertonic-saline") || id.includes("saline"));
  const hasKetamine = norm.some((id) => id.includes("ketamine"));

  // 1. Propofol Infusion Syndrome (PRIS)
  if (hasPropofol) {
    collisions.push({
      id: "pris-mitochondrial-uncoupling",
      title: "Propofol Infusion Syndrome (PRIS) Safety Ceiling Alert",
      severity: "critical",
      mechanism:
        "Propofol impairs electron transport chain complexes (I, II, IV) and carnitine palmitoyltransferase-1 (CPT-1), blocking mitochondrial long-chain fatty acid oxidation.",
      clinicalConsequence:
        "Refractory high-anion-gap lactic acidosis, rhabdomyolysis, hyperkalemia, acute renal failure, Brugada-like ECG pattern (coved ST elevation V1-V3), and fatal refractory bradycardia/asystole.",
      managementGuidance:
        "Limit infusion rate to < 4-5 mg/kg/h (< 67-83 mcg/kg/min) and continuous duration to < 48 hours. Serial monitoring of blood lactate, arterial pH, serum triglycerides, and CPK is mandatory. If PRIS is suspected, discontinue immediately and transition to Ketamine or Midazolam.",
      citations: [
        "Brophy GM, et al. Neurocrit Care 2012.",
        "Kam PC, et al. Anaesthesia 2007.",
      ],
    });
  }

  // 2. Fosphenytoin Rapid Infusion Rate & Cardiac Conduction Blockade
  if (hasFosphenytoin) {
    collisions.push({
      id: "fosphenytoin-cardiac-rate-limit",
      title: "Fosphenytoin Cardiac Rate Ceiling (Max 150 mg PE/min) & Telemetry Mandate",
      severity: "critical",
      mechanism:
        "Phenytoin blocks voltage-gated Nav1.5 cardiac sodium channels, slowing Phase 0 depolarization across the bundle of His and Purkinje system.",
      clinicalConsequence:
        "Infusion rates exceeding 150 mg PE/min risk profound hypotension, PR prolongation, wide QRS, second- or third-degree AV block, and fatal asystolic arrest.",
      managementGuidance:
        "Cap infusion rate at STRICT MAXIMUM of 150 mg PE/min (infusion duration ≥ 10 minutes for full 1,500 mg PE load). Mandatory continuous ECG and frequent blood pressure monitoring during and for at least 30 minutes following infusion.",
      citations: [
        "Kapur J, et al. (ESETT). N Engl J Med. 2019.",
        "FDA Cerebyx Prescribing Information.",
      ],
    });
  }

  // 3. Valproate POLG / Mitochondrial & Hepatic Contraindication
  if (hasValproate) {
    collisions.push({
      id: "valproate-polg-mitochondrial-warning",
      title: "Valproate POLG Mutation, Mitochondrial & Hepatic Black Box Warning",
      severity: "critical",
      mechanism:
        "Valproic acid inhibits mitochondrial beta-oxidation and impairs oxidative phosphorylation enzymes. In patients harboring POLG (DNA polymerase gamma) mutations, it precipitates rapid mitochondrial bioenergetic collapse.",
      clinicalConsequence:
        "Precipitates fatal fulminant hepatic necrosis in patients with POLG mutations (Alpers-Huttenlocher syndrome) and causes acute hyperammonemic encephalopathy in occult Urea Cycle Disorders (UCD).",
      managementGuidance:
        "Contraindicated in known or suspected POLG mutations or acute hepatic dysfunction. Check baseline LFTs, pregnancy status, and serum ammonia. Note: Co-administration with carbapenems (e.g. meropenem) causes catastrophic 80-90% drop in valproate serum levels within 24 hours.",
      citations: [
        "Glauser T, et al. Epilepsy Curr 2016.",
        "FDA Depacon Prescribing Information.",
      ],
    });
  }

  // 4. Lacosamide AV Conduction Prolongation
  if (hasLacosamide) {
    collisions.push({
      id: "lacosamide-pr-interval-conduction",
      title: "Lacosamide Dose-Dependent PR Interval Prolongation & AV Block Risk",
      severity: "warning",
      mechanism:
        "Enhancement of slow inactivation of voltage-gated sodium channels causes dose-dependent slowing of atrioventricular nodal conduction.",
      clinicalConsequence:
        "Risk of PR prolongation, first-degree AV block, second-degree AV block, complete heart block, and syncope.",
      managementGuidance:
        "Infuse IV loading dose (400 mg) over 5-15 minutes. Use extreme caution in patients with baseline conduction system abnormalities or concomitant AV nodal blocking agents (beta-blockers, diltiazem, verapamil, digoxin).",
      citations: [
        "FDA Vimpat Prescribing Information.",
        "Brophy GM, et al. Neurocrit Care 2012.",
      ],
    });
  }

  // 5. Benzodiazepine Tachyphylaxis & Endocytosis in Prolonged SE
  if (hasBenzo && seizureDurationMinutes >= 20) {
    collisions.push({
      id: "benzo-pharmacoresistance-endocytosis",
      title: "Benzodiazepine Pharmacoresistance: GABA-A Receptor Endocytosis",
      severity: "warning",
      mechanism:
        "Prolonged seizure activity (> 15-20 min) causes dephosphorylation and clathrin-mediated internalization of synaptic GABA-A receptors, slashing benzodiazepine potency up to 20-fold.",
      clinicalConsequence:
        "Repeated benzodiazepine dosing after 20 minutes fails to control seizures while provoking respiratory arrest, severe hypotension, and unnecessary delay in initiating Phase 2 ASMs.",
      managementGuidance:
        "Limit benzodiazepines to maximum 2 doses. If seizures persist beyond 20 minutes, advance immediately to Phase 2 non-GABA-A agents (Levetiracetam, Fosphenytoin, Valproate).",
      citations: [
        "Goodkin HP, et al. J Neurosci 2008.",
        "Naylor DE, et al. J Neurosci 2005.",
        "AES Guidelines 2016.",
      ],
    });
  }

  // 6. 23.4% Saline Central Line Requirement
  if (hasHts) {
    collisions.push({
      id: "hypertonic-saline-central-line-requirement",
      title: "23.4% Hypertonic Saline Central Venous Access Requirement",
      severity: "critical",
      mechanism:
        "Extreme osmolar concentration (8,008 mOsm/L; 4 mEq/mL Na+ and Cl-) creates severe osmotic chemical irritation.",
      clinicalConsequence:
        "Extravasation into peripheral soft tissue causes devastating full-thickness skin necrosis, compartment syndrome, and permanent neuromuscular injury.",
      managementGuidance:
        "Administer 30 mL boluses EXCLUSIVELY via central venous catheter (CVL or PICC). In the absence of central access, use 3% hypertonic saline via a large-bore peripheral vein with dedicated monitoring.",
      citations: [
        "Koenig MA, et al. Crit Care Med 2008.",
        "Cook AM, et al. Neurocrit Care 2020.",
      ],
    });
  }

  // 7. Mannitol Filter & Osmolality Limit
  if (hasMannitol) {
    collisions.push({
      id: "mannitol-crystallization-and-renal-ceiling",
      title: "Mannitol In-Line Filter Mandate & Osmolar Ceiling (<320 mOsm/kg)",
      severity: "warning",
      mechanism:
        "Mannitol supersaturates and precipitates into microscopic needle-like crystals at cool or room temperatures. In renal tubules, accumulation causes osmotic nephrosis.",
      clinicalConsequence:
        "Infusion of unfiltered crystals causes pulmonary and renal microvascular embolism. Excessive dosing causes acute anuric renal failure.",
      managementGuidance:
        "Always administer through an in-line 0.22-micron filter. Hold Mannitol if serum osmolality is ≥ 320 mOsm/kg or osmolar gap exceeds 15-20 mOsm/kg.",
      citations: [
        "Cook AM, et al. Neurocrit Care 2020.",
        "FDA Osmitrol Prescribing Information.",
      ],
    });
  }

  // 8. Ketamine NMDA Mechanistic Synergy in Late SE
  if (hasKetamine) {
    collisions.push({
      id: "ketamine-nmda-excitotoxicity-synergy",
      title: "Ketamine NMDA Antagonism: Mechanistic Overcoming of GABA-A Depletion",
      severity: "advisory",
      mechanism:
        "Uncompetitive NMDA receptor open-channel blockade circumvents internalized GABA-A receptors, targeting newly mobilized postsynaptic glutamate receptors.",
      clinicalConsequence:
        "Halts glutamatergic excitotoxicity, terminates refractory seizures, and provides sympathetic support (elevates MAP) counteracting propofol/midazolam hypotension.",
      managementGuidance:
        "Ideal non-GABAergic partner in Phase 3 RSE. Infuse at 1.5-3.0 mg/kg bolus followed by 1-10 mg/kg/h continuous infusion. Monitor for emergence reactions upon awakening.",
      citations: [
        "Brophy GM, et al. Neurocrit Care 2012.",
        "Naylor DE, et al. J Neurosci 2005.",
      ],
    });
  }

  return collisions;
}

// ============================================================================
// 11. COMPREHENSIVE STATUS EPILEPTICUS REPORT GENERATOR
// ============================================================================

export interface StatusEpilepticusReportOptions {
  weightKg?: number;
  seizureDurationMinutes?: number;
  crclMlMin?: number;
  currentSerumNa?: number;
  currentSerumOsm?: number;
}

export interface StatusEpilepticusReport {
  onDesk: StatusEpilepticusDeskDetection;
  patientWeightKg: number;
  seizureDurationMinutes: number;
  phase1: Phase1Evaluation;
  phase2: Phase2Evaluation;
  phase3: Phase3Evaluation;
  receptorKinetics: GabaInternalizationEvaluation;
  osmotherapy: OsmotherapyEvaluation;
  activeCollisions: StatusEpilepticusSafetyCollision[];
  clinicalPearls: string[];
  disclaimer: string;
  citations: Citation[];
}

export function statusEpilepticusReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: StatusEpilepticusReportOptions,
): StatusEpilepticusReport {
  const onDesk = statusEpilepticusOnDesk(drugIds);

  const weightKg = options?.weightKg ?? 70;
  const seizureDuration = options?.seizureDurationMinutes ?? (onDesk.hasPhase3Anesthetic ? 45 : onDesk.hasPhase2Asm ? 25 : 10);
  const crcl = options?.crclMlMin ?? (host.kidney === "ckd" ? 35 : 90);
  const serumNa = options?.currentSerumNa ?? 140;
  const serumOsm = options?.currentSerumOsm ?? 290;

  const phase1 = calculatePhase1Dosing(weightKg);
  const phase2 = calculatePhase2Dosing(weightKg, crcl);
  const phase3 = calculatePhase3Dosing(weightKg);
  const receptorKinetics = calculateGabaInternalization(seizureDuration);
  const osmotherapy = calculateOsmotherapy(weightKg, {
    currentSerumNa: serumNa,
    currentSerumOsm: serumOsm,
  });
  const activeCollisions = evaluateStatusEpilepticusCollisions(drugIds, seizureDuration);

  const clinicalPearls: string[] = [
    "American Epilepsy Society (AES) Stepped Algorithm: Status epilepticus is a medical emergency with time-critical escalation thresholds: Phase 1 (0-20m, Benzodiazepines) -> Phase 2 (20-40m, ESETT ASMs) -> Phase 3 (>40m, General Anesthetic Infusions & Burst Suppression).",
    "ESETT Non-Inferiority Landmark Trial: Levetiracetam (60 mg/kg, max 4,500 mg), Fosphenytoin (20 mg PE/kg, max 1,500 mg PE), and Valproate sodium (40 mg/kg, max 3,000 mg) have equivalent ~45-47% seizure cessation rates at 60 min. Select agents based on cardiac (avoid fosphenytoin in conduction disease) or hepatic/mitochondrial (avoid valproate in POLG/liver disease) rails.",
    "GABA-A Internalization Kinetics: Within 15-30 minutes of continuous seizing, synaptic GABA-A receptors undergo endocytosis and dephosphorylation, reducing benzodiazepine potency by up to 20-fold. Concurrently, NMDA receptors are upregulated, providing the biological foundation for Ketamine.",
    "23.4% Hypertonic Saline Central Line Mandate: 30 mL bolus of 23.4% NaCl (8,008 mOsm/L, 120 mEq Na+) rapidly lowers ICP in cerebral herniation, but MUST be infused via central venous line to prevent fatal peripheral tissue necrosis.",
    "Mannitol 20% In-Line Filter & Osmolality Rail: Always infuse Mannitol (0.5-1.0 g/kg) through a 0.22-micron filter to trap crystals, and hold if serum osmolality ≥ 320 mOsm/kg to prevent acute osmotic nephrosis.",
  ];

  if (host.age === "geriatric") {
    clinicalPearls.push(
      "Geriatric Pharmacodynamics: Elderly patients have heightened sensitivity to benzodiazepine-induced respiratory depression, reduced fosphenytoin protein binding due to hypoalbuminemia, and decreased levetiracetam renal clearance.",
    );
  }

  return {
    onDesk,
    patientWeightKg: weightKg,
    seizureDurationMinutes: seizureDuration,
    phase1,
    phase2,
    phase3,
    receptorKinetics,
    osmotherapy,
    activeCollisions,
    clinicalPearls,
    disclaimer: `${STATUS_EPILEPTICUS_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
    citations: SE_CITATIONS,
  };
}
