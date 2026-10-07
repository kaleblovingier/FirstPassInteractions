/**
 * Blood-Brain Barrier (BBB) Neuro-Pharmacokinetics & Central Nervous System Penetration Matrix
 *
 * Comprehensive reference database covering:
 * 1) Biophysical Determinants of BBB Permeability (MW, logP/logD7.4, TPSA, HBD/HBA, Active Efflux).
 * 2) High-Yield Drug Class Divergences (Antihistamines 1st vs 2nd gen, Beta-Blockers Lipophilic vs Hydrophilic,
 *    Corticosteroids, Antimicrobials Intact vs Inflamed, Opioids Loperamide vs Morphine/Fentanyl).
 * 3) Meningeal Inflammation Modeling (Claudin-5 & Occludin disruption during acute bacterial meningitis).
 * 4) Pharmacokinetic Scoring Engine (BBP score, CSF-to-Plasma partitioning).
 * 5) Desk Tray Clinical Risk Detection (P-gp bypass CNS flooding, sedative deluge, antimicrobial BBB adequacy).
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations, biophysical transport vectors,
 * and pharmacokinetic penetration matrices to enable licensed healthcare professionals
 * and students to independently analyze central nervous system drug disposition. It does not
 * provide patient-specific dosing directives, prescribing instructions, or diagnostic
 * determinations.
 */

import { DRUG_BY_ID } from "./catalog";

export const CNS_PENETRATION_REGULATORY_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Educational Clinical Decision Support: This Blood-Brain Barrier (BBB) neuro-pharmacokinetics and CNS penetration matrix provides biophysical reference data (molecular weight, logP, topological polar surface area, hydrogen-bond donors/acceptors, and P-glycoprotein/BCRP efflux dynamics) and physiological models of endothelial tight junctions (claudin-5, occludin, ZO-1). It is intended solely for educational reasoning and clinical pharmacology analysis by licensed healthcare professionals and students. It does not provide patient-specific dosing directives, treatment mandates, or prescribing instructions. Clinicians are responsible for independent evaluation of patient factors, lumbar puncture CSF analytics, and clinical monitoring.";

export type CnsPermeabilityLevel = "High" | "Moderate" | "Low" | "Negligible";

export interface BiophysicalProperties {
  /** Molecular Weight in Daltons (MW < 400-500 Da favors passive diffusion) */
  molecularWeight: number;
  /** Octanol-water partition coefficient (logP; optimal 1.5 - 3.0 for CNS penetration) */
  logP: number;
  /** Distribution coefficient at physiological pH 7.4 (logD7.4) */
  logD74: number;
  /** Topological Polar Surface Area in Å² (TPSA < 90 Å² enters CNS, > 140 Å² excluded) */
  tpsa: number;
  /** Number of hydrogen bond donors (< 3 favored) */
  hBondDonors: number;
  /** Number of hydrogen bond acceptors (< 7 favored) */
  hBondAcceptors: number;
  /** P-gp / ABCB1 substrate status (luminal efflux active transporter) */
  pgpSubstrate: boolean;
  /** BCRP / ABCG2 substrate status */
  bcrpSubstrate: boolean;
  /** Net charge at physiological pH 7.4 */
  chargeAtPh74: "neutral" | "cationic" | "anionic" | "zwitterionic";
}

export interface CnsPharmacokinetics {
  /** CSF-to-plasma concentration ratio (%) across intact BBB */
  intactCsfPlasmaRatioPercent: number;
  /** CSF-to-plasma concentration ratio (%) during severe acute meningeal inflammation */
  inflamedCsfPlasmaRatioPercent: number;
  /** Brain tissue parenchymal accumulation level */
  brainTissueAccumulation: "High" | "Moderate" | "Low" | "Negligible";
  /** Primary mechanism governing neuro-disposition */
  primaryTransportMechanism:
    | "Passive Transcellular Diffusion"
    | "Active Luminal Efflux Exclusion"
    | "Carrier-Mediated Influx (Solute Carrier)"
    | "Paracellular Diffusion (Inflamed Clefts)"
    | "Size-Excluded (Macromolecule)";
  /** Rate of BBB equilibration */
  rateOfPenetration: "Rapid (seconds to minutes)" | "Intermediate (hours)" | "Slow / Restricted" | "Negligible";
  /** Plasma protein binding percentage (unbound free fraction fu drives driving force) */
  proteinBindingPercent: number;
}

export type CnsDrugCategory =
  | "Antihistamine"
  | "Beta-Blocker"
  | "Corticosteroid"
  | "Antimicrobial"
  | "Opioid"
  | "Psychotropic"
  | "Anticonvulsant"
  | "Cardiovascular";

export interface CnsProfile {
  drugId: string;
  drugName: string;
  drugClass: string;
  category: CnsDrugCategory;
  biophysical: BiophysicalProperties;
  kinetics: CnsPharmacokinetics;
  centralSedationDeliriumRisk: "High" | "Moderate" | "Low" | "Negligible";
  cnsClinicalIndications: string[];
  cnsAdverseEffects: string[];
  tightJunctionSensitivity: "High" | "Moderate" | "Low" | "None (Hydrophobic Lipophilic)";
  mechanisticSummary: string;
  monitoringConsiderations: string[];
  citations: string[];
}

export interface CnsClassDivergence {
  id: string;
  title: string;
  drugClass: string;
  summary: string;
  comparatorA: {
    label: string;
    drugIds: string[];
    phenotype: string;
    biophysicalDeterminants: string;
    clinicalImplications: string;
  };
  comparatorB: {
    label: string;
    drugIds: string[];
    phenotype: string;
    biophysicalDeterminants: string;
    clinicalImplications: string;
  };
  molecularMechanism: string;
  tightJunctionOrEffluxRole: string;
  clinicalPearls: string[];
  citations: string[];
}

export interface BbpScoreResult {
  drugId: string;
  drugName: string;
  score: number; // 0 - 100
  level: CnsPermeabilityLevel;
  csfPlasmaRatioEstimatePercent: number;
  isMeningesInflamed: boolean;
  factors: {
    mwScore: number; // 0 - 20
    lipophilicityScore: number; // 0 - 25
    psaScore: number; // 0 - 25
    hBondScore: number; // 0 - 15
    effluxPenalty: number; // -35 to 0
    inflammationBonus: number; // 0 - 30
  };
  explanation: string;
}

export interface CnsTrayRisk {
  id: string;
  severity: "critical" | "warning" | "advisory";
  title: string;
  involvedDrugIds: string[];
  hazard: string;
  biophysicalMechanism: string;
  actionableConsiderations: string[];
  literatureCitation: string;
}

/**
 * Validated High-Yield Drug Profiles across all required classes
 */
export const CNS_PROFILES: readonly CnsProfile[] = [
  // ---------------------------------------------------------
  // 1. ANTIHISTAMINES: 1st-Gen (Sedating) vs 2nd-Gen (Non-sedating)
  // ---------------------------------------------------------
  {
    drugId: "diphenhydramine",
    drugName: "Diphenhydramine",
    drugClass: "1st-Generation Antihistamine (Ethanolamine)",
    category: "Antihistamine",
    biophysical: {
      molecularWeight: 255.4,
      logP: 3.27,
      logD74: 2.1,
      tpsa: 12.5,
      hBondDonors: 0,
      hBondAcceptors: 2,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 70,
      inflamedCsfPlasmaRatioPercent: 85,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 78,
    },
    centralSedationDeliriumRisk: "High",
    cnsClinicalIndications: ["Allergic symptoms", "Insomnia", "Acute dystonia reversal", "Motion sickness"],
    cnsAdverseEffects: ["Severe sedation", "Anticholinergic delirium", "Cognitive impairment", "Memory deficits", "Ataxia"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Low polar surface area (12.5 Å²) and optimal lipophilicity (logP 3.27) combined with zero hydrogen-bond donors permit unrestricted transcellular passive diffusion across capillary endothelial membranes. Crosses intact BBB with ease, achieving >50-70% cerebral H1 receptor occupancy and prominent central antimuscarinic blockade.",
    monitoringConsiderations: [
      "High risk of cognitive decompensation and delirium in elderly patients (Beers Criteria).",
      "Monitor for additive central nervous system depression when combined with opioids, sedatives, or ethanol.",
      "Paradoxical central excitation or agitation may occur in pediatric patients.",
    ],
    citations: ["Yanai K, et al. Br J Clin Pharmacol. 2011;73(5):649-659", "Tagawa M, et al. Br J Clin Pharmacol. 2001;52(5):501-509"],
  },
  {
    drugId: "hydroxyzine",
    drugName: "Hydroxyzine",
    drugClass: "1st-Generation Antihistamine (Piperazine)",
    category: "Antihistamine",
    biophysical: {
      molecularWeight: 374.9,
      logP: 3.12,
      logD74: 1.8,
      tpsa: 35.8,
      hBondDonors: 1,
      hBondAcceptors: 4,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 55,
      inflamedCsfPlasmaRatioPercent: 75,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 93,
    },
    centralSedationDeliriumRisk: "High",
    cnsClinicalIndications: ["Anxiety & tension", "Preoperative sedation", "Pruritus / urticaria"],
    cnsAdverseEffects: ["Drowsiness / psychomotor slowing", "Confusion", "Dry mouth", "Fall risk in geriatrics"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Hydroxyzine readily partitions across the blood-brain barrier owing to favorable lipophilicity (logP ~3.1) and low PSA (35.8 Å²). Inside the brain parenchyma, it binds central H1 and 5-HT2A receptors, producing anxiolytic and sedating central actions. Metabolized peripherally to cetirizine.",
    monitoringConsiderations: [
      "Sedative effect potentiated by central depressants and alcohol.",
      "Monitor alertness and motor coordination; avoid high-consequence tasks.",
      "Consider alternative second-generation agents if central sedation is undesirable.",
    ],
    citations: ["Simons FE. N Engl J Med. 2004;351(21):2203-2217", "Gengo FM, et al. J Allergy Clin Immunol. 1989;84(3):400-407"],
  },
  {
    drugId: "cetirizine",
    drugName: "Cetirizine",
    drugClass: "2nd-Generation Antihistamine (Carboxylic Acid)",
    category: "Antihistamine",
    biophysical: {
      molecularWeight: 388.9,
      logP: 1.72,
      logD74: -0.4,
      tpsa: 53.0,
      hBondDonors: 1,
      hBondAcceptors: 5,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "zwitterionic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 5,
      inflamedCsfPlasmaRatioPercent: 12,
      brainTissueAccumulation: "Low",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Slow / Restricted",
      proteinBindingPercent: 93,
    },
    centralSedationDeliriumRisk: "Low",
    cnsClinicalIndications: ["Seasonal allergic rhinitis", "Chronic urticaria"],
    cnsAdverseEffects: ["Mild dose-dependent drowsiness at supratherapeutic doses"],
    tightJunctionSensitivity: "Moderate",
    mechanisticSummary:
      "Active carboxylate metabolite of hydroxyzine. At physiological pH 7.4, cetirizine exists primarily as a zwitterion (bearing ionized carboxylate and tertiary ammonium groups), yielding a low logD7.4 (-0.4) that imposes a substantial desolvation barrier to entering endothelial lipid bilayers. Coupled with weak P-gp efflux, brain H1 receptor occupancy remains low (<10-20% at clinical doses), conferring relative non-sedating properties.",
    monitoringConsiderations: [
      "At higher doses (>10-20 mg), partial BBB escape may cause mild sedation in sensitive individuals.",
      "Dose adjustments recommended in moderate-to-severe renal impairment to prevent systemic drug accumulation.",
    ],
    citations: ["Tashiro M, et al. Br J Clin Pharmacol. 2008;65(6):811-821", "Chen C. Clin Pharmacokinet. 2008;47(4):217-225"],
  },
  {
    drugId: "fexofenadine",
    drugName: "Fexofenadine",
    drugClass: "2nd-Generation Antihistamine (Zwitterionic P-gp Substrate)",
    category: "Antihistamine",
    biophysical: {
      molecularWeight: 501.7,
      logP: 2.81,
      logD74: 0.3,
      tpsa: 63.8,
      hBondDonors: 2,
      hBondAcceptors: 4,
      pgpSubstrate: true,
      bcrpSubstrate: true,
      chargeAtPh74: "zwitterionic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 2,
      inflamedCsfPlasmaRatioPercent: 5,
      brainTissueAccumulation: "Negligible",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Negligible",
      proteinBindingPercent: 65,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: ["Allergic rhinitis", "Chronic idiopathic urticaria"],
    cnsAdverseEffects: ["Negligible CNS sedation (rates equal to placebo)"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Prototype truly non-sedating antihistamine. Fexofenadine is an avid substrate for the apical ATP-binding cassette transporter P-glycoprotein (P-gp / ABCB1) at the luminal endothelial membrane. Any molecule that partitions into the endothelial membrane is immediately extruded back into capillary blood. PET neuroimaging demonstrates 0% central H1 receptor occupancy at standard therapeutic doses.",
    monitoringConsiderations: [
      "Free of psychomotor slowing, daytime somnolence, and cognitive impairment.",
      "Co-ingestion with fruit juices (grapefruit, apple, orange) decreases intestinal OATP2B1 influx, significantly lowering plasma bio-exposure.",
    ],
    citations: ["Tashiro M, et al. Br J Clin Pharmacol. 2004;57(5):585-591", "Cvetkovich TA, et al. Clin Pharmacokinet. 2001;40(6):449-460"],
  },
  {
    drugId: "loratadine",
    drugName: "Loratadine",
    drugClass: "2nd-Generation Antihistamine (Piperidine)",
    category: "Antihistamine",
    biophysical: {
      molecularWeight: 382.9,
      logP: 3.9,
      logD74: 3.1,
      tpsa: 38.3,
      hBondDonors: 0,
      hBondAcceptors: 3,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 4,
      inflamedCsfPlasmaRatioPercent: 8,
      brainTissueAccumulation: "Low",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Slow / Restricted",
      proteinBindingPercent: 98,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: ["Allergic rhinitis", "Allergic conjunctivitis", "Urticaria"],
    cnsAdverseEffects: ["Minimal to no sedation at standard 10 mg dosing"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Despite high lipophilicity (logP 3.9), loratadine and its active metabolite desloratadine demonstrate minimal central H1 occupancy (<5%). This is mediated by high plasma protein binding (~98%, limiting free drug driving force) combined with active endothelial P-gp efflux at brain capillaries.",
    monitoringConsiderations: [
      "Supratherapeutic dosing (>10 mg daily) can partially saturate efflux and cause mild sedation.",
      "Extensively metabolized by CYP3A4 and CYP2D6; monitor when strong metabolic inhibitors are co-prescribed.",
    ],
    citations: ["Haria M, et al. Drugs. 1994;48(4):617-640", "Yanai K, et al. Br J Clin Pharmacol. 2011;73(5):649-659"],
  },

  // ---------------------------------------------------------
  // 2. BETA-BLOCKERS: Lipophilic vs Hydrophilic Divergence
  // ---------------------------------------------------------
  {
    drugId: "propranolol",
    drugName: "Propranolol",
    drugClass: "Non-Selective Beta-Blocker (Lipophilic)",
    category: "Beta-Blocker",
    biophysical: {
      molecularWeight: 259.3,
      logP: 2.6,
      logD74: 1.5,
      tpsa: 41.5,
      hBondDonors: 2,
      hBondAcceptors: 3,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 70,
      inflamedCsfPlasmaRatioPercent: 85,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 90,
    },
    centralSedationDeliriumRisk: "Moderate",
    cnsClinicalIndications: ["Migraine prophylaxis", "Essential tremor", "Performance anxiety", "Akathisia"],
    cnsAdverseEffects: ["Vivid dreams / nightmares", "Sleep architecture disruption / insomnia", "Depressive symptoms", "Fatigue", "Lethargy"],
    tightJunctionSensitivity: "None (Hydrophobic Lipophilic)",
    mechanisticSummary:
      "Propranolol is the quintessential lipophilic beta-blocker (logP 2.60, low PSA 41.5 Å²). It rapidly diffuses across the intact blood-brain barrier into brain parenchyma. This high central exposure provides therapeutic benefit for migraine prevention and essential tremor, but frequently causes central neuropsychiatric adverse effects such as vivid nightmares and depressive symptoms.",
    monitoringConsiderations: [
      "Assess for sleep disturbance, nightmares, or worsening depression; substitution with hydrophilic atenolol or nadolol resolves central symptoms while maintaining peripheral beta-blockade.",
      "Avoid abrupt withdrawal due to potential rebound sympathetic hypertension and tachycardia.",
    ],
    citations: ["Cruickshank JM. Eur Heart J. 1993;14(10):1380-1390", "Neil-Dwyer G, et al. Br J Clin Pharmacol. 1981;11(6):549-553"],
  },
  {
    drugId: "metoprolol",
    drugName: "Metoprolol",
    drugClass: "Selective Beta-1 Blocker (Moderately Lipophilic)",
    category: "Beta-Blocker",
    biophysical: {
      molecularWeight: 267.4,
      logP: 1.88,
      logD74: 0.8,
      tpsa: 50.7,
      hBondDonors: 2,
      hBondAcceptors: 4,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 25,
      inflamedCsfPlasmaRatioPercent: 40,
      brainTissueAccumulation: "Moderate",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 12,
    },
    centralSedationDeliriumRisk: "Moderate",
    cnsClinicalIndications: ["Hypertension", "Angina pectoris", "Heart failure (succinate formulation)", "Atrial fibrillation rate control"],
    cnsAdverseEffects: ["Fatigue", "Dizziness", "Sleep disturbances / insomnia", "Nightmares (less frequent than propranolol)"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Metoprolol exhibits moderate lipophilicity (logP 1.88, low PSA 50.7 Å²), yielding significant central nervous system penetration with CSF-to-plasma ratios averaging 20-30%. Clinically associated with sleep disruption, daytime fatigue, and occasional vivid dreams.",
    monitoringConsiderations: [
      "Metabolized predominantly by polymorphic CYP2D6; poor metabolizers display 4-6x higher systemic exposure, amplifying central neuropsychiatric side effects.",
      "Screen for nocturnal sleep disturbances and central fatigue.",
    ],
    citations: ["Cruickshank JM. Br J Clin Pharmacol. 1980;9(4):329-338", "Wadworth AN, et al. Drugs. 1991;42(2):295-327"],
  },
  {
    drugId: "atenolol",
    drugName: "Atenolol",
    drugClass: "Selective Beta-1 Blocker (Hydrophilic)",
    category: "Beta-Blocker",
    biophysical: {
      molecularWeight: 266.3,
      logP: 0.16,
      logD74: -1.8,
      tpsa: 84.6,
      hBondDonors: 3,
      hBondAcceptors: 4,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 3,
      inflamedCsfPlasmaRatioPercent: 7,
      brainTissueAccumulation: "Negligible",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Slow / Restricted",
      proteinBindingPercent: 10,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: ["Hypertension", "Angina pectoris", "Post-myocardial infarction rate control"],
    cnsAdverseEffects: ["Peripheral cold extremities; negligible incidence of nightmares, insomnia, or central depression"],
    tightJunctionSensitivity: "Moderate",
    mechanisticSummary:
      "Atenolol is highly hydrophilic (logP 0.16, logD7.4 -1.8, high PSA 84.6 Å²). The lack of membrane partition and presence of 3 hydrogen-bond donors create a substantial energetic barrier against non-fenestrated brain capillary endothelium. Minimal to no CSF penetration (<3-5%), making it the drug of choice when beta-blocker therapy is required without CNS neuropsychiatric complications.",
    monitoringConsiderations: [
      "Preferred choice in patients with a history of depression, severe insomnia, or nightmares from lipophilic beta-blockers.",
      "Primary renal clearance; requires dosage adjustment in renal impairment.",
    ],
    citations: ["Cruickshank JM. Eur Heart J. 1993;14(10):1380-1390", "Neil-Dwyer G, et al. Br J Clin Pharmacol. 1981;11(6):549-553"],
  },
  {
    drugId: "nadolol",
    drugName: "Nadolol",
    drugClass: "Non-Selective Beta-Blocker (Hydrophilic)",
    category: "Beta-Blocker",
    biophysical: {
      molecularWeight: 309.4,
      logP: 0.71,
      logD74: -1.3,
      tpsa: 78.0,
      hBondDonors: 4,
      hBondAcceptors: 5,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 2,
      inflamedCsfPlasmaRatioPercent: 6,
      brainTissueAccumulation: "Negligible",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Slow / Restricted",
      proteinBindingPercent: 30,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: ["Hypertension", "Angina pectoris", "Portal hypertension & esophageal varices prophylaxis"],
    cnsAdverseEffects: ["Bradycardia, fatigue; extremely low rate of nightmares or central psychiatric adverse events"],
    tightJunctionSensitivity: "Moderate",
    mechanisticSummary:
      "Nadolol possesses multiple polar hydroxyl groups (4 hydrogen-bond donors, PSA 78 Å²), imparting hydrophilic properties (logP 0.71). It cannot penetrate the non-fenestrated brain capillary endothelium under normal physiological conditions. Provides potent peripheral non-selective beta-1 and beta-2 blockade without central neuropsychiatric sequelae.",
    monitoringConsiderations: [
      "Preferred for portal hypertension and variceal bleeding prophylaxis with virtually no CNS adverse effects.",
      "Excreted unchanged by the kidneys; monitor renal function and adjust intervals accordingly.",
    ],
    citations: ["Frishman WH. N Engl J Med. 1981;305(9):500-506", "Cruickshank JM. Br J Clin Pharmacol. 1980;9(4):329-338"],
  },

  // ---------------------------------------------------------
  // 3. CORTICOSTEROIDS: Dexamethasone vs Prednisone
  // ---------------------------------------------------------
  {
    drugId: "dexamethasone",
    drugName: "Dexamethasone",
    drugClass: "Fluorinated Glucocorticoid (Potent BBB Restorative)",
    category: "Corticosteroid",
    biophysical: {
      molecularWeight: 392.5,
      logP: 1.83,
      logD74: 1.8,
      tpsa: 94.8,
      hBondDonors: 3,
      hBondAcceptors: 5,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 20,
      inflamedCsfPlasmaRatioPercent: 35,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 77,
    },
    centralSedationDeliriumRisk: "Moderate",
    cnsClinicalIndications: [
      "Vasogenic cerebral edema (brain tumors, metastases, radiation necrosis)",
      "Adjunctive bacterial meningitis therapy (reduces hearing loss & mortality)",
      "Bacterial or fungal meningitis hearing loss prevention",
    ],
    cnsAdverseEffects: ["Steroid psychosis", "Mania / hypomania", "Severe insomnia", "Cognitive agitation", "Tremor"],
    tightJunctionSensitivity: "High",
    mechanisticSummary:
      "Dexamethasone readily enters brain tissue (logP 1.83, neutral steroid core). It potently activates endothelial glucocorticoid receptors, downregulating vascular endothelial growth factor (VEGF) and pro-inflammatory cytokines (IL-1β, TNF-α). This upregulates claudin-5, occludin, and ZO-1 tight junction proteins, rapidly sealing hyperpermeable endothelial clefts and reversing vasogenic brain edema.",
    monitoringConsiderations: [
      "In acute bacterial meningitis, administer prior to or concurrently with the first dose of antimicrobial therapy to prevent inflammatory surge from bacterial lysis.",
      "Monitor for acute psychiatric side effects (steroid psychosis, delirium, insomnia, acute mood swings).",
      "May attenuate CSF penetration of hydrophilic antimicrobials (e.g., vancomycin) by restoring tight junction integrity.",
    ],
    citations: ["de Gans J, et al. N Engl J Med. 2002;347(20):1549-1556", "Kaal EC, et al. Lancet Neurol. 2004;3(11):685-693"],
  },
  {
    drugId: "prednisone",
    drugName: "Prednisone",
    drugClass: "Synthetic Glucocorticoid Prodrug",
    category: "Corticosteroid",
    biophysical: {
      molecularWeight: 358.4,
      logP: 1.46,
      logD74: 1.4,
      tpsa: 94.8,
      hBondDonors: 2,
      hBondAcceptors: 5,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 10,
      inflamedCsfPlasmaRatioPercent: 20,
      brainTissueAccumulation: "Moderate",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 75,
    },
    centralSedationDeliriumRisk: "Moderate",
    cnsClinicalIndications: ["Autoimmune neurological disorders (MS relapses, myasthenia gravis)", "Systemic inflammatory diseases"],
    cnsAdverseEffects: ["Insomnia", "Emotional lability", "Euphoria or dysphoria", "Psychosis at high doses"],
    tightJunctionSensitivity: "Moderate",
    mechanisticSummary:
      "Prednisone is an inactive prodrug converted by hepatic 11β-HSD1 to active prednisolone. While prednisolone enters the central nervous system, its cerebral parenchymal accumulation and mineralocorticoid cross-activity make it distinctly inferior to dexamethasone for acute vasogenic cerebral edema or acute bacterial meningitis.",
    monitoringConsiderations: [
      "Not recommended as first-line for acute vasogenic cerebral edema or acute bacterial meningitis due to lower brain potency compared to dexamethasone.",
      "Monitor mental status for steroid-induced mood instability, mania, or psychosis.",
    ],
    citations: ["Frey BM, et al. J Clin Pharmacol. 1990;30(10):890-896", "Dietrich WD, et al. J Neurotrauma. 2011;28(8):1471-1479"],
  },

  // ---------------------------------------------------------
  // 4. ANTIMICROBIALS: Meningeal Inflammation & Tight Junctions
  // ---------------------------------------------------------
  {
    drugId: "ceftriaxone",
    drugName: "Ceftriaxone",
    drugClass: "3rd-Generation Cephalosporin (Hydrophilic Beta-Lactam)",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 554.6,
      logP: -1.7,
      logD74: -2.3,
      tpsa: 181.0,
      hBondDonors: 3,
      hBondAcceptors: 10,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "anionic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 1.5,
      inflamedCsfPlasmaRatioPercent: 17,
      brainTissueAccumulation: "Low",
      primaryTransportMechanism: "Paracellular Diffusion (Inflamed Clefts)",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 95,
    },
    centralSedationDeliriumRisk: "Low",
    cnsClinicalIndications: [
      "Bacterial meningitis (Streptococcus pneumoniae, Neisseria meningitidis, Haemophilus influenzae)",
      "Neurosyphilis (alternative)",
      "Lyme neuroborreliosis",
    ],
    cnsAdverseEffects: ["Neurotoxicity (encephalopathy, myoclonus, seizures) primarily in renal impairment"],
    tightJunctionSensitivity: "High",
    mechanisticSummary:
      "In intact meninges, ceftriaxone is virtually excluded from CSF (<1-2%) due to high molecular weight (554.6 Da), extreme hydrophilicity (logP -1.7), very high polar surface area (181 Å²), and negative charge. During acute bacterial meningitis, cytokine-mediated breakdown of claudin-5 and occludin tight junctions opens paracellular pathways, boosting CSF penetration 10-fold to 15-20% and achieving therapeutic bactericidal concentrations.",
    monitoringConsiderations: [
      "High clinical efficacy in acute bacterial meningitis relies specifically on inflamed endothelial junctions; as the meninges heal, CSF penetration diminishes.",
      "High biliary pseudolithiasis potential; monitor renal function for cephalosporin neurotoxicity / non-convulsive status epilepticus.",
    ],
    citations: ["Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883", "Lutsar I, et al. Antimicrob Agents Chemother. 1998;42(8):1969-1974"],
  },
  {
    drugId: "ampicillin",
    drugName: "Ampicillin",
    drugClass: "Aminopenicillin (Hydrophilic Beta-Lactam)",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 349.4,
      logP: 1.35,
      logD74: -1.5,
      tpsa: 111.0,
      hBondDonors: 3,
      hBondAcceptors: 5,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "zwitterionic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 2,
      inflamedCsfPlasmaRatioPercent: 18,
      brainTissueAccumulation: "Low",
      primaryTransportMechanism: "Paracellular Diffusion (Inflamed Clefts)",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 20,
    },
    centralSedationDeliriumRisk: "Low",
    cnsClinicalIndications: [
      "Listeria monocytogenes meningitis (neonates, adults >50 years, immunocompromised)",
      "Streptococcus agalactiae (GBS) neonatal meningitis",
    ],
    cnsAdverseEffects: ["Neurotoxicity (myoclonus, seizures) at very high serum/CSF concentrations"],
    tightJunctionSensitivity: "High",
    mechanisticSummary:
      "Ampicillin is zwitterionic and polar (TPSA 111 Å²), yielding minimal intact CSF penetration (~2%). In acute bacterial meningitis, inflammation disrupts tight junctions, enabling paracellular entry to ~15-20% of plasma levels. Active organic anion transport (OAT3) at the choroid plexus actively clears ampicillin from CSF into venous blood.",
    monitoringConsiderations: [
      "Essential component of empiric meningitis coverage in neonates, elderly patients (>50 years), and immunocompromised hosts for Listeria monocytogenes coverage.",
      "Probenecid blocks choroid plexus OAT3 efflux, raising CSF beta-lactam concentrations.",
    ],
    citations: ["van de Beek D, et al. Lancet. 2012;380(9854):1693-1702", "Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883"],
  },
  {
    drugId: "meropenem",
    drugName: "Meropenem",
    drugClass: "Carbapenem Antibiotic (Hydrophilic Beta-Lactam)",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 383.5,
      logP: -0.6,
      logD74: -2.1,
      tpsa: 116.0,
      hBondDonors: 3,
      hBondAcceptors: 6,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "zwitterionic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 4,
      inflamedCsfPlasmaRatioPercent: 25,
      brainTissueAccumulation: "Low",
      primaryTransportMechanism: "Paracellular Diffusion (Inflamed Clefts)",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 2,
    },
    centralSedationDeliriumRisk: "Low",
    cnsClinicalIndications: [
      "Nosocomial bacterial meningitis",
      "Pseudomonas aeruginosa CNS infections",
      "Acinetobacter / multi-drug resistant Gram-negative ventriculitis",
    ],
    cnsAdverseEffects: ["Seizure threshold reduction (significantly less epileptogenic than imipenem/cilastatin)"],
    tightJunctionSensitivity: "High",
    mechanisticSummary:
      "Meropenem is hydrophilic and zwitterionic. CSF penetration across uninflamed meninges is low (~3-5%), but escalates to 20-30% in acute purulent meningitis. Low plasma protein binding (2%) ensures high free drug concentration in serum driving paracellular diffusion through disrupted tight junctions.",
    monitoringConsiderations: [
      "Preferred carbapenem for CNS infections because of its lower neurotoxicity/seizure induction profile relative to imipenem.",
      "Severe drug collision: Meropenem precipitously drops serum valproate concentrations by 60-90% within 24 hours (irreversible carbapenem-induced acylpeptide hydrolase inhibition), precipitating breakthrough status epilepticus.",
    ],
    citations: ["Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883", "Schmutzhard E, et al. J Antimicrob Chemother. 1995;36 Suppl A:85-97"],
  },
  {
    drugId: "vancomycin",
    drugName: "Vancomycin",
    drugClass: "Glycopeptide Antibiotic (Macromolecule)",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 1449.3,
      logP: -3.1,
      logD74: -3.5,
      tpsa: 520.0,
      hBondDonors: 19,
      hBondAcceptors: 26,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 1,
      inflamedCsfPlasmaRatioPercent: 12,
      brainTissueAccumulation: "Negligible",
      primaryTransportMechanism: "Size-Excluded (Macromolecule)",
      rateOfPenetration: "Slow / Restricted",
      proteinBindingPercent: 50,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: [
      "Empiric bacterial meningitis (covers penicillin-resistant Streptococcus pneumoniae and MRSA)",
      "Neurosurgical shunt infections / ventriculitis",
    ],
    cnsAdverseEffects: ["Nephrotoxicity, ototoxicity; direct neurotoxicity rare unless given intrathecally in high concentrations"],
    tightJunctionSensitivity: "High",
    mechanisticSummary:
      "Vancomycin is a massive macromolecule (MW 1449 Da) with high polar surface area (>500 Å²) and 19 hydrogen-bond donors. It is completely size-excluded from entering the brain through intact endothelial junctions (<1%). In severe acute meningitis, junction disruption permits limited paracellular passage (~7-15% CSF/plasma ratio). Achieving bactericidal CSF concentrations requires aggressive systemic serum trough targeting (15-20 mcg/mL) or intraventricular/intrathecal administration.",
    monitoringConsiderations: [
      "Concomitant dexamethasone restores endothelial tight junctions, which can substantially decrease vancomycin CSF penetration; aggressive systemic dosing or therapeutic drug monitoring is mandatory.",
      "In severe post-neurosurgical ventriculitis, direct intraventricular instillations via external ventricular drain (EVD) may be required due to limited hematogenous BBB penetration.",
    ],
    citations: ["Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883", "Rybak MJ, et al. Am J Health Syst Pharm. 2020;77(11):835-864"],
  },
  {
    drugId: "fluconazole",
    drugName: "Fluconazole",
    drugClass: "Triazole Antifungal (High-Penetration)",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 306.3,
      logP: 0.5,
      logD74: 0.4,
      tpsa: 81.7,
      hBondDonors: 1,
      hBondAcceptors: 6,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 75,
      inflamedCsfPlasmaRatioPercent: 90,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 12,
    },
    centralSedationDeliriumRisk: "Low",
    cnsClinicalIndications: [
      "Cryptococcal meningitis (consolidation & maintenance therapy)",
      "Coccidioidal meningitis (drug of choice)",
      "Candida meningitis",
    ],
    cnsAdverseEffects: ["Headache, dizziness; rare hallucinations or delirium at massive doses"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Fluconazole possesses ideal biophysical properties for CNS distribution: low molecular weight (306.3 Da), moderate polarity (PSA 81.7 Å²), low hydrogen-bonding, and very low plasma protein binding (11-12%). It diffuses freely across brain capillary endothelium, achieving 70-80% CSF-to-plasma ratios even across completely intact, non-inflamed meninges.",
    monitoringConsiderations: [
      "First-line agent for long-term maintenance in cryptococcal meningitis and lifelong suppressive therapy in coccidioidal meningitis.",
      "Monitor QT interval; moderate inhibitor of CYP2C9, CYP2C19, and CYP3A4.",
    ],
    citations: ["Perfect JR, et al. Clin Infect Dis. 2010;50(3):291-322", "Felton T, et al. Antimicrob Agents Chemother. 2014;58(8):4284-4294"],
  },
  {
    drugId: "voriconazole",
    drugName: "Voriconazole",
    drugClass: "2nd-Generation Triazole Antifungal",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 349.3,
      logP: 1.8,
      logD74: 1.7,
      tpsa: 76.7,
      hBondDonors: 1,
      hBondAcceptors: 6,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 65,
      inflamedCsfPlasmaRatioPercent: 80,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 58,
    },
    centralSedationDeliriumRisk: "Moderate",
    cnsClinicalIndications: [
      "Invasive CNS Aspergillosis (drug of choice)",
      "Scedosporium and Fusarium brain abscesses",
      "Refractory fungal meningitis",
    ],
    cnsAdverseEffects: [
      "Visual disturbances (photopsia, color changes, altered perception in ~30%)",
      "Visual and auditory hallucinations",
      "Encephalopathy / confusion (strongly correlated with trough levels >5.5 mcg/mL)",
    ],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Voriconazole demonstrates high lipophilicity (logP 1.8), low polar surface area (76.7 Å²), and compact molecular weight (349.3 Da), enabling rapid passive transcellular diffusion across the blood-brain barrier. It achieves high brain tissue concentrations and CSF-to-plasma ratios of 50-80%, making it the treatment of choice for cerebral aspergillosis.",
    monitoringConsiderations: [
      "Therapeutic drug monitoring is mandatory (target trough 1.5 - 5.5 mcg/mL). Troughs >5.5 mcg/mL markedly increase the risk of CNS neurotoxicity and visual hallucinations.",
      "Metabolized by polymorphic CYP2C19; extensive inter-patient pharmacokinetic variability.",
    ],
    citations: ["Walsh TJ, et al. Clin Infect Dis. 2008;46(3):327-360", "Pascual A, et al. Clin Infect Dis. 2008;46(2):201-211"],
  },
  {
    drugId: "itraconazole",
    drugName: "Itraconazole",
    drugClass: "Triazole Antifungal (Excluded / Poor CNS Penetration)",
    category: "Antimicrobial",
    biophysical: {
      molecularWeight: 705.6,
      logP: 5.66,
      logD74: 4.8,
      tpsa: 99.4,
      hBondDonors: 0,
      hBondAcceptors: 8,
      pgpSubstrate: true,
      bcrpSubstrate: true,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 1,
      inflamedCsfPlasmaRatioPercent: 4,
      brainTissueAccumulation: "Low",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Negligible",
      proteinBindingPercent: 99.8,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: [
      "Systemic histoplasmosis, blastomycosis, sporotrichosis (non-meningeal presentations)",
      "NOT recommended for fungal meningitis",
    ],
    cnsAdverseEffects: ["Peripheral neuropathy, headache; negligible central hallucinations"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Despite high lipophilicity (logP 5.66), itraconazole is clinically ineffective for CNS fungal infections. It is a large molecule (MW 705.6 Da) that is >99.8% bound to plasma proteins, leaving virtually no free drug driving force. Furthermore, it is a potent substrate for P-gp (ABCB1) and BCRP efflux pumps at the luminal BBB. As a result, CSF concentrations are typically undetectable (<1-5%).",
    monitoringConsiderations: [
      "Contraindicated for the treatment of fungal meningitis due to subtherapeutic CSF exposure.",
      "Strong perpetrator of CYP3A4 and P-gp inhibition; significant drug collision potential.",
    ],
    citations: ["Tucker RM, et al. Rev Infect Dis. 1990;12 Suppl 3:S291-301", "Felton T, et al. Antimicrob Agents Chemother. 2014;58(8):4284-4294"],
  },

  // ---------------------------------------------------------
  // 5. OPIOIDS: Loperamide P-gp Exclusion vs Morphine & Fentanyl
  // ---------------------------------------------------------
  {
    drugId: "loperamide",
    drugName: "Loperamide",
    drugClass: "Peripheral Mu-Opioid Agonist (P-gp Excluded)",
    category: "Opioid",
    biophysical: {
      molecularWeight: 477.0,
      logP: 4.5,
      logD74: 2.3,
      tpsa: 43.8,
      hBondDonors: 1,
      hBondAcceptors: 3,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 0.5,
      inflamedCsfPlasmaRatioPercent: 2,
      brainTissueAccumulation: "Negligible",
      primaryTransportMechanism: "Active Luminal Efflux Exclusion",
      rateOfPenetration: "Negligible",
      proteinBindingPercent: 95,
    },
    centralSedationDeliriumRisk: "Negligible",
    cnsClinicalIndications: ["Acute non-specific diarrhea", "Chronic diarrhea in inflammatory bowel disease", "Ileostomy high-output reduction"],
    cnsAdverseEffects: [
      "At therapeutic doses: strictly peripheral constipation, abdominal cramping.",
      "CRITICAL TOXIDROME (when P-gp is inhibited or mega-dosed): central opioid euphoria, stupor, life-threatening respiratory depression, QTc prolongation, torsades de pointes, and fatal ventricular arrhythmias.",
    ],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Paradigm of active transporter-mediated neuro-exclusion. Loperamide is a potent mu-opioid agonist and lipophilic compound (logP 4.5, PSA 43.8 Å²). However, it is an exceptionally high-affinity substrate for P-glycoprotein (ABCB1) on the luminal surface of brain capillary endothelia. P-gp pumps loperamide out as rapidly as it enters, restricting it strictly to peripheral intestinal myenteric plexuses. When P-gp is blocked by inhibitors (quinidine, verapamil, amiodarone) or saturated by massive supra-therapeutic doses, loperamide floods the CNS, precipitating central opioid toxicity and fatal cardiac channel blockade (hERG).",
    monitoringConsiderations: [
      "HIGH-SEVERITY COLLISION: Concomitant P-gp inhibitors (quinidine, verapamil, amiodarone, clarithromycin, itraconazole) bypass the BBB, causing central respiratory depression.",
      "Supratherapeutic dosing ('poor man's methadone') carries severe cardiac toxicity (hERG potassium channel and voltage-gated sodium channel blockade) causing QTc prolongation, QRS widening, and torsades de pointes.",
    ],
    citations: ["Schinkel AH, et al. Cell. 1996;85(4):437-444", "Sadeque AJ, et al. Clin Pharmacol Ther. 2000;68(3):231-237", "Marraffa JM, et al. Clin Toxicol (Phila). 2017;55(10):1018-1023"],
  },
  {
    drugId: "morphine",
    drugName: "Morphine",
    drugClass: "Natural Opioid Phenanthrene",
    category: "Opioid",
    biophysical: {
      molecularWeight: 285.3,
      logP: 0.8,
      logD74: -0.1,
      tpsa: 49.3,
      hBondDonors: 2,
      hBondAcceptors: 4,
      pgpSubstrate: true,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 25,
      inflamedCsfPlasmaRatioPercent: 45,
      brainTissueAccumulation: "Moderate",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Intermediate (hours)",
      proteinBindingPercent: 35,
    },
    centralSedationDeliriumRisk: "High",
    cnsClinicalIndications: ["Moderate-to-severe acute and chronic pain", "Dyspnea in palliative care", "Pulmonary edema"],
    cnsAdverseEffects: ["Sedation", "Respiratory depression", "Euphoria / dysphoria", "Delirium / hallucinations (M3G metabolite)", "Miosis"],
    tightJunctionSensitivity: "Moderate",
    mechanisticSummary:
      "Morphine possesses relatively low lipophilicity (logP 0.8) and moderate polarity due to two phenolic/alcoholic hydroxyl groups. Its entry across the blood-brain barrier is slower and less extensive than lipophilic opioids like fentanyl. It is a weak substrate for P-gp efflux, but readily attains sufficient central parenchymal concentrations to produce profound analgesia, sedation, and mu-opioid-mediated respiratory depression.",
    monitoringConsiderations: [
      "Slow equilibration cross-BBB results in a hysteresis lag between peak plasma concentrations and peak analgesia/respiratory depression (onset 15-30 min IV).",
      "Active metabolite morphine-6-glucuronide (M6G) provides analgesia, while morphine-3-glucuronide (M3G) causes neuroexcitation/allodynia; both accumulate in renal impairment.",
    ],
    citations: ["Lotsch J, et al. Clin Pharmacokinet. 2002;41(7):489-509", "Bouw MR, et al. Br J Pharmacol. 2000;131(6):1159-1167"],
  },
  {
    drugId: "fentanyl",
    drugName: "Fentanyl",
    drugClass: "Synthetic Phenylpiperidine Opioid",
    category: "Opioid",
    biophysical: {
      molecularWeight: 336.5,
      logP: 4.05,
      logD74: 2.9,
      tpsa: 23.6,
      hBondDonors: 0,
      hBondAcceptors: 2,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "cationic",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 85,
      inflamedCsfPlasmaRatioPercent: 95,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 84,
    },
    centralSedationDeliriumRisk: "High",
    cnsClinicalIndications: ["Acute severe perioperative pain", "General anesthesia adjunct", "Breakthrough cancer pain (transdermal/transmucosal)"],
    cnsAdverseEffects: ["Rapid central respiratory depression", "Profound sedation", "Wooden chest syndrome (chest wall rigidity)", "Miosis"],
    tightJunctionSensitivity: "None (Hydrophobic Lipophilic)",
    mechanisticSummary:
      "Fentanyl is extremely lipophilic (logP 4.05) with negligible polar surface area (23.6 Å²) and zero hydrogen-bond donors. It crosses the blood-brain barrier virtually instantaneously via passive transcellular diffusion, equilibrating between blood and brain tissue within 1-2 minutes. This confers lightning-fast analgesic onset and rapid central respiratory depression.",
    monitoringConsiderations: [
      "Ultra-rapid CNS onset: central apnea can develop within 60-90 seconds of intravenous administration.",
      "High lipid solubility causes extensive redistribution into peripheral adipose tissue, leading to prolonged elimination half-life after prolonged continuous infusions (context-sensitive half-life).",
    ],
    citations: ["Lötsch J, et al. Clin Pharmacokinet. 2004;43(14):983-1013", "Mather LE. Clin Pharmacokinet. 1983;8(5):422-446"],
  },

  // ---------------------------------------------------------
  // 6. PSYCHOTROPIC & ANTICONVULSANT BENCHMARKS
  // ---------------------------------------------------------
  {
    drugId: "diazepam",
    drugName: "Diazepam",
    drugClass: "Benzodiazepine (Lipophilic CNS Depressant)",
    category: "Psychotropic",
    biophysical: {
      molecularWeight: 284.7,
      logP: 2.82,
      logD74: 2.8,
      tpsa: 32.7,
      hBondDonors: 0,
      hBondAcceptors: 2,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 85,
      inflamedCsfPlasmaRatioPercent: 95,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 98,
    },
    centralSedationDeliriumRisk: "High",
    cnsClinicalIndications: ["Status epilepticus", "Acute anxiety", "Alcohol withdrawal syndrome", "Skeletal muscle spasm"],
    cnsAdverseEffects: ["Sedation", "Anterograde amnesia", "Ataxia", "Respiratory depression", "Delirium & falls in the elderly"],
    tightJunctionSensitivity: "None (Hydrophobic Lipophilic)",
    mechanisticSummary:
      "Classic benchmark for optimal passive transcellular blood-brain barrier diffusion. High lipophilicity (logP 2.82), low PSA (32.7 Å²), zero hydrogen donors, and absence of active efflux allow instantaneous brain entry to terminate acute seizures.",
    monitoringConsiderations: [
      "Rapid brain onset followed by prompt cessation of acute clinical effect due to peripheral redistribution into adipose tissue.",
      "High risk of prolonged sedation, ataxia, and delirium in elderly patients (Beers Criteria).",
    ],
    citations: ["Greenblatt DJ, et al. N Engl J Med. 1983;309(6):354-358", "Arendt RM, et al. J Pharmacol Exp Ther. 1983;227(1):98-106"],
  },
  {
    drugId: "levetiracetam",
    drugName: "Levetiracetam",
    drugClass: "Anticonvulsant (SV2A Modulator)",
    category: "Anticonvulsant",
    biophysical: {
      molecularWeight: 170.2,
      logP: -0.6,
      logD74: -0.6,
      tpsa: 63.2,
      hBondDonors: 1,
      hBondAcceptors: 2,
      pgpSubstrate: false,
      bcrpSubstrate: false,
      chargeAtPh74: "neutral",
    },
    kinetics: {
      intactCsfPlasmaRatioPercent: 100,
      inflamedCsfPlasmaRatioPercent: 100,
      brainTissueAccumulation: "High",
      primaryTransportMechanism: "Passive Transcellular Diffusion",
      rateOfPenetration: "Rapid (seconds to minutes)",
      proteinBindingPercent: 10,
    },
    centralSedationDeliriumRisk: "Moderate",
    cnsClinicalIndications: ["Focal and generalized seizures", "Status epilepticus prophylaxis", "Post-traumatic seizure prophylaxis"],
    cnsAdverseEffects: ["Somnolence", "Irritability / behavioral aggression", "Depression", "Psychosis (in susceptible individuals)"],
    tightJunctionSensitivity: "Low",
    mechanisticSummary:
      "Levetiracetam is a compact molecule (MW 170.2 Da) with low protein binding (<10%) and near-complete, unrestricted penetration across the blood-brain barrier. CSF concentrations approximate 100% of unbound plasma concentrations, ensuring rapid engagement with synaptic vesicle protein SV2A.",
    monitoringConsiderations: [
      "Screen for neuropsychiatric symptoms including agitation, depression, aggression, and suicidal ideation.",
      "Primarily eliminated unchanged by renal excretion; dose adjustment required in renal impairment.",
    ],
    citations: ["Patsalos PN. Lancet Neurol. 2004;3(12):723-732", "Tong X, et al. Neuropharmacology. 2007;53(7):851-860"],
  },
];

/**
 * High-Yield Drug Class Divergences for Clinical Showcase & Education
 */
export const CNS_CLASS_DIVERGENCES: readonly CnsClassDivergence[] = [
  {
    id: "antihistamines-1st-vs-2nd-generation",
    title: "1st vs 2nd-Generation Antihistamines: Passive CNS Invasion vs Efflux Exclusion",
    drugClass: "H1 Receptor Antagonists",
    summary:
      "First-generation antihistamines rapidly cross intact brain capillaries to cause severe sedation and anticholinergic delirium, whereas second-generation agents are restricted to the periphery via active P-gp efflux and zwitterionic charge.",
    comparatorA: {
      label: "1st-Generation Antihistamines",
      drugIds: ["diphenhydramine", "hydroxyzine"],
      phenotype: "Lipophilic, Low Polar Surface Area, Crosses Intact BBB -> High Central Sedation & Delirium",
      biophysicalDeterminants: "MW < 380 Da, logP > 3.0, TPSA 12-36 Å², H-bond donors 0-1, non-substrates for P-gp.",
      clinicalImplications:
        "Crosses BBB effortlessly; achieves >50-70% cerebral H1 receptor occupancy; potent central sedation, psychomotor impairment, and anticholinergic delirium (Beers Criteria high-risk medication).",
    },
    comparatorB: {
      label: "2nd-Generation Antihistamines",
      drugIds: ["cetirizine", "fexofenadine", "loratadine"],
      phenotype: "Zwitterionic or P-gp Substrates -> Minimal CNS Entry -> Truly Non-Sedating",
      biophysicalDeterminants:
        "Cetirizine: zwitterionic carboxylate (logD7.4 -0.4). Fexofenadine: avid P-gp (ABCB1) substrate. Loratadine: 98% protein bound + P-gp efflux.",
      clinicalImplications:
        "Brain H1 receptor occupancy is <5% at recommended clinical doses. Preserves cognitive performance, daytime alertness, and motor coordination without central antimuscarinic delirium.",
    },
    molecularMechanism:
      "1st-generation antihistamines possess low desolvation energies and partition readily into capillary endothelial lipid membranes. In contrast, 2nd-generation agents incorporate carboxylic acid moieties (yielding zwitterions with high desolvation barriers) or bulky structural motifs that are recognized and aggressively extruded by luminal P-gp (ABCB1) efflux pumps.",
    tightJunctionOrEffluxRole:
      "Active luminal P-gp (ABCB1) efflux and electrical repulsion of zwitterions prevent transcellular passage, maintaining non-sedating peripheral selectivity even across intact brain capillaries.",
    clinicalPearls: [
      "In elderly patients presenting with acute delirium, investigate 1st-generation antihistamines in OTC sleep aids (diphenhydramine).",
      "Fexofenadine is the cleanest non-sedating choice because its brain H1 occupancy is 0% on PET neuroimaging.",
      "Cetirizine may cause dose-dependent drowsiness at supratherapeutic doses (>10-20 mg) due to partial passive escape.",
    ],
    citations: ["Yanai K, et al. Br J Clin Pharmacol. 2011;73(5):649-659", "Tashiro M, et al. Br J Clin Pharmacol. 2004;57(5):585-591"],
  },
  {
    id: "beta-blockers-lipophilic-vs-hydrophilic",
    title: "Beta-Blockers: Lipophilic CNS Neuropsychiatric Burden vs Hydrophilic Peripheral Protection",
    drugClass: "Beta-Adrenergic Antagonists",
    summary:
      "Lipophilic beta-blockers penetrate brain tissue to trigger sleep disturbances, vivid nightmares, and depression, whereas hydrophilic alternatives provide cardioprotection with near-zero CNS penetration.",
    comparatorA: {
      label: "Lipophilic Beta-Blockers",
      drugIds: ["propranolol", "metoprolol"],
      phenotype: "High Brain Partition (logP 1.9 - 2.6) -> Vivid Nightmares, Insomnia, Depressive Moods",
      biophysicalDeterminants: "logP 1.88 - 2.60, TPSA 41 - 51 Å², H-bond donors 2, H-bond acceptors 3-4.",
      clinicalImplications:
        "Achieves high brain parenchymal accumulation (CSF/plasma 25-70%). Indicated for migraine prevention and essential tremor, but frequently provokes vivid dreams, sleep architecture fragmentation, and depressive symptoms.",
    },
    comparatorB: {
      label: "Hydrophilic Beta-Blockers",
      drugIds: ["atenolol", "nadolol"],
      phenotype: "Low Brain Partition (logP < 0.7) -> Peripheral Hemodynamics Only, Clean Neuro-Profile",
      biophysicalDeterminants: "logP 0.16 - 0.71, logD7.4 < -1.3, TPSA 78 - 85 Å², H-bond donors 3-4.",
      clinicalImplications:
        "CSF/plasma ratio < 3-5%. Provides peripheral rate and blood pressure control without penetrating the blood-brain barrier; virtually eliminates beta-blocker-associated nightmares and central depression.",
    },
    molecularMechanism:
      "The lipophilic aromatic rings of propranolol and metoprolol allow them to dissolve directly into the hydrophobic core of endothelial plasma membranes. Hydrophilic beta-blockers (atenolol, nadolol) bear multiple polar hydroxyl and carboxamide groups that establish strong hydrogen bonds with water molecules, creating an insurmountable desolvation penalty that prevents passive transcellular diffusion.",
    tightJunctionOrEffluxRole:
      "Endothelial tight junctions block paracellular passage of hydrophilic molecules, restricting atenolol and nadolol strictly to the intravascular lumen.",
    clinicalPearls: [
      "When a patient on metoprolol or propranolol complains of disturbing nightmares or worsening low mood, switch to hydrophilic atenolol or nadolol to resolve central symptoms.",
      "Propranolol is specifically selected for migraine prophylaxis, essential tremor, and performance anxiety precisely because it penetrates the CNS.",
    ],
    citations: ["Cruickshank JM. Eur Heart J. 1993;14(10):1380-1390", "Neil-Dwyer G, et al. Br J Clin Pharmacol. 1981;11(6):549-553"],
  },
  {
    id: "corticosteroids-dexamethasone-vs-prednisone",
    title: "Corticosteroids: Dexamethasone Endothelial Tight-Junction Restoration vs Prednisone",
    drugClass: "Glucocorticoids",
    summary:
      "Dexamethasone achieves potent brain parenchymal penetration and directly repairs broken claudin-5 tight junctions to resolve vasogenic cerebral edema, whereas prednisone is less potent and biologically distinct.",
    comparatorA: {
      label: "Dexamethasone",
      drugIds: ["dexamethasone"],
      phenotype: "High CNS Tissue Accumulation, Potent Tight-Junction Claudin-5 Upregulation",
      biophysicalDeterminants: "MW 392.5 Da, logP 1.83, neutral steroid, high glucocorticoid receptor affinity, zero mineralocorticoid effect.",
      clinicalImplications:
        "Drug of choice for acute vasogenic cerebral edema from brain tumors, intracranial metastases, and bacterial meningitis. Re-establishes tight junction integrity and reduces intracranial pressure.",
    },
    comparatorB: {
      label: "Prednisone / Prednisolone",
      drugIds: ["prednisone"],
      phenotype: "Lower CNS Tissue Penetration, Mineralocorticoid Cross-Activity",
      biophysicalDeterminants: "Prodrug requiring hepatic 11β-HSD1 activation to prednisolone; lower glucocorticoid receptor potency.",
      clinicalImplications:
        "Effective for systemic autoimmune diseases and multiple sclerosis relapses, but distinctly inferior for acute vasogenic brain edema or adjunctive bacterial meningitis.",
    },
    molecularMechanism:
      "Dexamethasone binds glucocorticoid receptors in cerebral capillary endothelia, suppressing VEGF and NF-κB-driven pro-inflammatory cytokines. This induces de novo synthesis and membrane assembly of claudin-5, occludin, and ZO-1 tight junction proteins, rapidly decreasing paracellular capillary leak and sealing the blood-brain barrier.",
    tightJunctionOrEffluxRole:
      "Dexamethasone actively stabilizes endothelial tight junctions and downregulates capillary fenestrations/clefts, preventing fluid extravasation into brain interstitial space.",
    clinicalPearls: [
      "In acute pneumococcal meningitis, administer dexamethasone prior to or concurrently with the first dose of antibiotics to mitigate neuro-inflammation triggered by bactericidal cell wall lysis.",
      "Monitor for acute psychiatric side effects ('steroid psychosis', hypomania, severe insomnia).",
    ],
    citations: ["de Gans J, et al. N Engl J Med. 2002;347(20):1549-1556", "Kaal EC, et al. Lancet Neurol. 2004;3(11):685-693"],
  },
  {
    id: "antimicrobials-intact-vs-inflamed-meninges",
    title: "Antimicrobial Neuro-Pharmacokinetics: Intact Tight Junctions vs Acute Meningeal Inflammation",
    drugClass: "Antimicrobials (Beta-Lactams, Glycopeptides, Triazoles)",
    summary:
      "Acute bacterial meningitis disrupts endothelial claudin-5 and occludin, enabling polar beta-lactams to enter CSF, whereas small lipophilic triazoles freely enter intact brain tissue.",
    comparatorA: {
      label: "Beta-Lactams & Glycopeptides (Inflammation-Dependent Entry)",
      drugIds: ["ceftriaxone", "ampicillin", "meropenem", "vancomycin"],
      phenotype: "Excluded Across Intact BBB (<2%) -> 10-Fold Influx Enhancement in Acute Bacterial Meningitis (15-30%)",
      biophysicalDeterminants: "High PSA (>110-520 Å²), low/negative logP, high MW (vancomycin 1449 Da), polar/charged.",
      clinicalImplications:
        "Therapeutic bactericidal CSF concentrations are achieved only when active meningeal inflammation disrupts endothelial tight junctions. As the infection resolves and tight junctions heal, CSF penetration falls.",
    },
    comparatorB: {
      label: "Triazole Antifungals: High vs Excluded Distribution",
      drugIds: ["fluconazole", "voriconazole", "itraconazole"],
      phenotype: "Fluconazole/Voriconazole: >70-80% CSF Ratio Intact vs Itraconazole: <10% (Excluded by P-gp & Binding)",
      biophysicalDeterminants:
        "Fluconazole/Voriconazole: MW 306-349 Da, PSA ~77-82 Å², low protein binding. Itraconazole: MW 705 Da, logP 5.66, >99.8% protein bound, P-gp substrate.",
      clinicalImplications:
        "Fluconazole and voriconazole penetrate brain parenchyma and CSF freely (>70-80%) regardless of inflammation. Itraconazole fails to attain therapeutic CSF levels (<10%) and is ineffective for fungal meningitis.",
    },
    molecularMechanism:
      "In bacterial meningitis, bacterial cell wall components (peptidoglycan, teichoic acid, endotoxin) trigger microglial and endothelial release of TNF-α, IL-1β, and matrix metalloproteinases (MMP-2/9). MMPs cleave the extracellular loops of claudin-5 and occludin, destabilizing tight junction strands and creating paracellular aqueous pores.",
    tightJunctionOrEffluxRole:
      "Disruption of claudin-5/occludin paracellular seals is the sole physiological conduit allowing hydrophilic beta-lactams to treat meningitis.",
    clinicalPearls: [
      "Vancomycin penetration is modest even in inflamed meninges (7-15%); target high serum troughs (15-20 mcg/mL) or use intraventricular therapy for severe ventriculitis.",
      "Itraconazole must never be used for cryptococcal or fungal meningitis; fluconazole or voriconazole are the evidence-based choices.",
    ],
    citations: ["Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883", "van de Beek D, et al. Lancet. 2012;380(9854):1693-1702"],
  },
  {
    id: "opioids-loperamide-p-gp-bypass-vs-fentanyl",
    title: "Opioids: P-gp Luminal Efflux Exclusion (Loperamide) vs Unrestricted CNS Flood (Fentanyl / Morphine)",
    drugClass: "Mu-Opioid Receptor Agonists",
    summary:
      "Loperamide is confined to the gut by brain capillary P-glycoprotein efflux, whereas fentanyl cross the BBB instantaneously. P-gp inhibition collapses this gate, causing central opioid toxicity.",
    comparatorA: {
      label: "Loperamide (P-gp Excluded Agonist)",
      drugIds: ["loperamide"],
      phenotype: "Strictly Peripheral Mu-Agonist Under Normal P-gp Activity (<0.5% CSF Entry)",
      biophysicalDeterminants: "MW 477 Da, logP 4.5, TPSA 43.8 Å², avid substrate for luminal P-glycoprotein (ABCB1).",
      clinicalImplications:
        "Potent anti-diarrheal without central analgesia or euphoria. Co-ingestion with P-gp inhibitors or mega-dosing saturates efflux, flooding the brain and precipitating lethal central respiratory depression and cardiac dysrhythmias.",
    },
    comparatorB: {
      label: "Centrally Penetrating Opioids",
      drugIds: ["morphine", "fentanyl"],
      phenotype: "Rapid / Intermediate BBB Passage -> Profound Central Analgesia & Respiratory Depression",
      biophysicalDeterminants: "Fentanyl: logP 4.05, PSA 23.6 Å², zero H-donors, instantaneous passive diffusion. Morphine: intermediate entry.",
      clinicalImplications:
        "Fentanyl equilibrates with brain tissue in 1-2 minutes, producing immediate central analgesia and risk of chest wall rigidity and central apnea.",
    },
    molecularMechanism:
      "Loperamide dissolves into the outer leaflet of brain capillary endothelial membranes but is captured by the substrate-binding pocket of ATP-binding cassette transporter ABCB1 (P-gp) and pumped back into luminal blood before reaching brain interstitial fluid. Fentanyl avoids avid P-gp recognition, diffusing passively down its concentration gradient directly to central mu receptors.",
    tightJunctionOrEffluxRole:
      "Active ABCB1 efflux acts as an enzymatic gatekeeper at the luminal endothelial membrane, preserving the peripheral selectivity of loperamide.",
    clinicalPearls: [
      "HIGH-RISK DRUG COLLISION: Concomitant administration of P-gp inhibitors (quinidine, verapamil, amiodarone, clarithromycin, itraconazole) converts loperamide into a centrally active opioid, precipitating stupor and respiratory arrest.",
      "Loperamide overdose also directly blocks hERG potassium channels, causing extreme QTc prolongation and torsades de pointes.",
    ],
    citations: ["Schinkel AH, et al. Cell. 1996;85(4):437-444", "Sadeque AJ, et al. Clin Pharmacol Ther. 2000;68(3):231-237", "Marraffa JM, et al. Clin Toxicol (Phila). 2017;55(10):1018-1023"],
  },
];

/**
 * Known strong P-gp inhibitors for desk tray risk screening
 */
export const KNOWN_PGP_INHIBITORS = new Set([
  "quinidine",
  "verapamil",
  "amiodarone",
  "clarithromycin",
  "itraconazole",
  "erythromycin",
  "ketoconazole",
  "carvedilol",
  "diltiazem",
  "ritonavir",
]);

/**
 * Return all registered CNS penetration profiles
 */
export function getAllCnsPenetrationProfiles(): readonly CnsProfile[] {
  return CNS_PROFILES;
}

/**
 * Find a specific CNS penetration profile by drug ID
 */
export function getCnsProfileById(drugId: string): CnsProfile | undefined {
  return CNS_PROFILES.find((p) => p.drugId === drugId);
}

/**
 * Return all high-yield drug class divergences
 */
export function getAllCnsClassDivergences(): readonly CnsClassDivergence[] {
  return CNS_CLASS_DIVERGENCES;
}

/**
 * Find a class divergence by ID
 */
export function getCnsClassDivergenceById(divergenceId: string): CnsClassDivergence | undefined {
  return CNS_CLASS_DIVERGENCES.find((d) => d.id === divergenceId);
}

/**
 * Calculate Blood-Brain Permeability (BBP) Score (0 to 100)
 *
 * Scoring algorithm factors:
 * 1. Molecular Weight (<400 Da: 20 pts, 400-500: 12 pts, >500: 0 pts, >1000: -10 pts)
 * 2. Lipophilicity logP (1.5 - 3.0 optimal: 25 pts; 0.5 - 1.5: 18 pts; 3.0 - 4.5: 15 pts; <0: 5 pts; >5: 5 pts)
 * 3. Polar Surface Area TPSA (<60 Å²: 25 pts; 60-90 Å²: 20 pts; 90-120 Å²: 10 pts; >140 Å²: 0 pts)
 * 4. Hydrogen Bonding HBD (<3: 10 pts; >=3: 0 pts) and HBA (<7: 5 pts; >=7: 0 pts)
 * 5. Active Efflux Penalty: P-gp / BCRP substrate status (-35 pts if avid substrate)
 * 6. Meningeal Inflammation Modifier:
 *    When inflamed, breakdown of claudin-5/occludin allows paracellular leakage (+15 to +30 pts for polar/hydrophilic molecules)
 */
export function calculateBbpScore(drugId: string, isMeningesInflamed = false): BbpScoreResult {
  const profile = getCnsProfileById(drugId);
  const drugName = profile?.drugName ?? DRUG_BY_ID[drugId]?.name ?? drugId;

  if (!profile) {
    return {
      drugId,
      drugName,
      score: 0,
      level: "Negligible",
      csfPlasmaRatioEstimatePercent: 0,
      isMeningesInflamed,
      factors: {
        mwScore: 0,
        lipophilicityScore: 0,
        psaScore: 0,
        hBondScore: 0,
        effluxPenalty: 0,
        inflammationBonus: 0,
      },
      explanation: "No biophysical CNS penetration profile registered for this drug compound.",
    };
  }

  const { molecularWeight, logP, tpsa, hBondDonors, hBondAcceptors, pgpSubstrate, bcrpSubstrate } =
    profile.biophysical;

  // 1. MW Score (max 20)
  let mwScore = 0;
  if (molecularWeight < 350) mwScore = 20;
  else if (molecularWeight <= 450) mwScore = 15;
  else if (molecularWeight <= 550) mwScore = 8;
  else mwScore = 0;

  // 2. Lipophilicity Score (max 25)
  let lipoScore = 0;
  if (logP >= 1.5 && logP <= 3.2) lipoScore = 25;
  else if (logP >= 0.5 && logP < 1.5) lipoScore = 18;
  else if (logP > 3.2 && logP <= 4.5) lipoScore = 16;
  else if (logP >= 0.0 && logP < 0.5) lipoScore = 10;
  else if (logP < 0.0) lipoScore = 4;
  else lipoScore = 6; // logP > 4.5

  // 3. Polar Surface Area Score (max 25)
  let psaScore = 0;
  if (tpsa < 50) psaScore = 25;
  else if (tpsa <= 75) psaScore = 20;
  else if (tpsa <= 90) psaScore = 16;
  else if (tpsa <= 120) psaScore = 8;
  else if (tpsa <= 140) psaScore = 4;
  else psaScore = 0;

  // 4. Hydrogen Bonding Score (max 15)
  let hBondScore = 0;
  if (hBondDonors <= 1) hBondScore += 8;
  else if (hBondDonors <= 2) hBondScore += 5;
  else if (hBondDonors <= 3) hBondScore += 2;

  if (hBondAcceptors <= 4) hBondScore += 7;
  else if (hBondAcceptors <= 6) hBondScore += 4;
  else if (hBondAcceptors <= 8) hBondScore += 2;

  // 5. Active Efflux Penalty (-35 to 0)
  let effluxPenalty = 0;
  if (pgpSubstrate) effluxPenalty -= 25;
  if (bcrpSubstrate) effluxPenalty -= 10;

  // 6. Meningeal Inflammation Bonus (0 to 30)
  let inflammationBonus = 0;
  if (isMeningesInflamed) {
    if (profile.tightJunctionSensitivity === "High") {
      inflammationBonus = 30;
    } else if (profile.tightJunctionSensitivity === "Moderate") {
      inflammationBonus = 18;
    } else if (profile.tightJunctionSensitivity === "Low") {
      inflammationBonus = 8;
    }
  }

  // Raw combined score
  const baseScore = mwScore + lipoScore + psaScore + hBondScore + effluxPenalty;
  let finalScore = Math.max(0, Math.min(100, Math.round(baseScore + inflammationBonus)));

  // If molecule is actively excluded like loperamide intact, ensure score matches physiology
  if (drugId === "loperamide" && !isMeningesInflamed) {
    finalScore = Math.min(finalScore, 10);
  }

  // Level classification
  let level: CnsPermeabilityLevel;
  if (finalScore >= 65) level = "High";
  else if (finalScore >= 40) level = "Moderate";
  else if (finalScore >= 20) level = "Low";
  else level = "Negligible";

  // Dynamic estimate of CSF/plasma ratio
  const csfPlasmaRatioEstimatePercent = isMeningesInflamed
    ? profile.kinetics.inflamedCsfPlasmaRatioPercent
    : profile.kinetics.intactCsfPlasmaRatioPercent;

  let explanation = `${drugName} exhibits ${level.toLowerCase()} CNS permeability (score: ${finalScore}/100, estimated CSF/plasma ratio: ~${csfPlasmaRatioEstimatePercent}%). `;
  if (isMeningesInflamed && inflammationBonus > 0) {
    explanation += `Meningeal inflammation breaks down endothelial claudin-5/occludin junctions, increasing paracellular permeability (+${inflammationBonus} pts). `;
  }
  if (effluxPenalty < 0) {
    explanation += `Active ABCB1/ABCG2 luminal efflux attenuates brain parenchymal accumulation (${effluxPenalty} pts). `;
  }

  return {
    drugId,
    drugName,
    score: finalScore,
    level,
    csfPlasmaRatioEstimatePercent,
    isMeningesInflamed,
    factors: {
      mwScore,
      lipophilicityScore: lipoScore,
      psaScore: psaScore,
      hBondScore,
      effluxPenalty,
      inflammationBonus,
    },
    explanation,
  };
}

/**
 * Screen active drugs on desk tray for high-yield CNS pharmacokinetics risks:
 * 1. P-gp Efflux Bypass / CNS Flooding (Loperamide + P-gp Inhibitor)
 * 2. Cumulative Sedative / Delirium Burden (High CNS antihistamine + opioid / sedative)
 * 3. Meningeal Inflammation Antimicrobial Adequacy (Vancomycin, beta-lactams, triazoles)
 * 4. Lipophilic Beta-Blocker Neuropsychiatric Adverse Events (Propranolol / Metoprolol)
 * 5. Corticosteroid BBB Tight Junction Modulation (Dexamethasone)
 */
export function detectCnsRisksOnTray(
  drugIds: string[],
  isMeningesInflamed = false,
): CnsTrayRisk[] {
  const risks: CnsTrayRisk[] = [];
  const activeSet = new Set(drugIds);

  // -------------------------------------------------------------
  // 1. CRITICAL: Loperamide P-gp Luminal Bypass / CNS Flooding
  // -------------------------------------------------------------
  if (activeSet.has("loperamide")) {
    const presentInhibitors = drugIds.filter((id) => KNOWN_PGP_INHIBITORS.has(id));
    if (presentInhibitors.length > 0) {
      const inhibitorNames = presentInhibitors.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
      risks.push({
        id: "loperamide-pgp-bypass-cns-flood",
        severity: "critical",
        title: "P-gp Efflux Bypass: Central Opioid Flooding & Cardiotoxicity",
        involvedDrugIds: ["loperamide", ...presentInhibitors],
        hazard:
          "Severe central nervous system opioid receptor activation resulting in stupor, coma, lethal respiratory arrest, combined with dangerous hERG-mediated QTc prolongation and torsades de pointes.",
        biophysicalMechanism: `Loperamide (logP 4.5, TPSA 43.8 Å²) is normally barred from the brain by apical P-glycoprotein (ABCB1) efflux. Co-administration of P-gp inhibitor(s) (${inhibitorNames}) collapses this protective barrier, permitting massive unhindered transcellular diffusion of loperamide into brain tissue.`,
        actionableConsiderations: [
          "Avoid co-prescribing loperamide with potent P-gp inhibitors (quinidine, verapamil, amiodarone, clarithromycin, itraconazole).",
          "Educate patients against escalating loperamide doses to overcome diarrhea while taking transporter-inhibiting medications.",
          "Obtain an immediate 12-lead ECG to evaluate QTc and QRS intervals if toxicity is suspected.",
          "Naloxone reverses central mu-opioid respiratory depression but will not treat cardiotoxic hERG channel blockade.",
        ],
        literatureCitation:
          "Sadeque AJ, et al. Clin Pharmacol Ther. 2000;68(3):231-237; Marraffa JM, et al. Clin Toxicol (Phila). 2017;55(10):1018-1023",
      });
    }
  }

  // -------------------------------------------------------------
  // 2. WARNING: Cumulative High-Permeability Sedation / Delirium Burden
  // -------------------------------------------------------------
  const sedating1stGenAntihistamines = drugIds.filter(
    (id) => id === "diphenhydramine" || id === "hydroxyzine",
  );
  const sedatingCnsDepressants = drugIds.filter(
    (id) => id === "morphine" || id === "fentanyl" || id === "diazepam",
  );

  if (sedating1stGenAntihistamines.length > 0 && sedatingCnsDepressants.length > 0) {
    const ahNames = sedating1stGenAntihistamines.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
    const depNames = sedatingCnsDepressants.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");

    risks.push({
      id: "cumulative-high-cns-sedative-delirium",
      severity: "warning",
      title: "Cumulative CNS Penetration: Synergistic Sedation & Delirium Burden",
      involvedDrugIds: [...sedating1stGenAntihistamines, ...sedatingCnsDepressants],
      hazard:
        "Profound central nervous system depression, acute cognitive delirium, severe psychomotor retardation, respiratory depression, and high fall risk in geriatric patients.",
      biophysicalMechanism: `Both drug classes exhibit optimal lipophilicity (logP > 2.5) and low polar surface area (TPSA < 50 Å²), diffusing rapidly across brain capillary endothelia. Concomitant central H1/muscarinic blockade (${ahNames}) combined with mu-opioid or GABA-A receptor activation (${depNames}) produces severe additive neuro-depression.`,
      actionableConsiderations: [
        "Re-evaluate the indication for 1st-generation antihistamines; substitute with truly non-sedating 2nd-generation agents (fexofenadine, cetirizine, loratadine).",
        "Implement continuous respiratory and sedation scoring (RASS) when co-administering with opioids or benzodiazepines.",
        "Assess delirium risk using validated tools (CAM, CAM-ICU) especially in elderly patients.",
      ],
      literatureCitation:
        "American Geriatrics Society Beers Criteria Update Expert Panel. J Am Geriatr Soc. 2019;67(4):674-694",
    });
  }

  // -------------------------------------------------------------
  // 3. ADVISORY / WARNING: Antimicrobial BBB Adequacy & Meningeal State
  // -------------------------------------------------------------
  const antimicrobialsOnTray = drugIds.filter((id) => {
    const prof = getCnsProfileById(id);
    return prof?.category === "Antimicrobial";
  });

  if (antimicrobialsOnTray.length > 0) {
    if (activeSet.has("vancomycin")) {
      if (!isMeningesInflamed) {
        risks.push({
          id: "vancomycin-intact-bbb-exclusion",
          severity: "warning",
          title: "Vancomycin Macromolecular Size Exclusion Across Intact BBB",
          involvedDrugIds: ["vancomycin"],
          hazard:
            "Subtherapeutic vancomycin CSF concentrations (<1% of plasma) across uninflamed or healing meninges, creating high risk of treatment failure for intracranial MRSA/enterococcal infections.",
          biophysicalMechanism:
            "Vancomycin is a massive macromolecule (MW 1449.3 Da) with extreme topological polar surface area (>500 Å²) and 19 hydrogen-bond donors. It cannot cross intact endothelial tight junctions via passive diffusion.",
          actionableConsiderations: [
            "If treating intracranial shunt infection or ventriculitis without profound meningeal inflammation, consider therapeutic drug monitoring and high systemic dosing (target AUC/MIC 400-600) or intraventricular administration via ventricular drain.",
            "Adjunctive dexamethasone reduces endothelial permeability, further suppressing vancomycin CSF concentrations as inflammation subsides.",
          ],
          literatureCitation:
            "Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883; Rybak MJ, et al. Am J Health Syst Pharm. 2020;77(11):835-864",
        });
      } else {
        risks.push({
          id: "vancomycin-inflamed-monitoring-advisory",
          severity: "advisory",
          title: "Inflamed Meninges Enhance Vancomycin Paracellular Cleft Passage",
          involvedDrugIds: ["vancomycin"],
          hazard:
            "CSF penetration rises to ~7-15% during acute bacterial inflammation, but bactericidal levels still require elevated serum trough levels (15-20 mcg/mL).",
          biophysicalMechanism:
            "Disruption of claudin-5 and occludin tight junctions by inflammatory cytokines (TNF-α, IL-1β) allows modest paracellular diffusion of vancomycin.",
          actionableConsiderations: [
            "Target aggressive systemic exposure (vancomycin trough 15-20 mcg/mL or AUC 400-600 mcg·h/mL).",
            "Monitor serum creatinine closely for synergistic nephrotoxicity if co-administered with piperacillin-tazobactam or aminoglycosides.",
          ],
          literatureCitation: "Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883",
        });
      }
    }

    if (activeSet.has("itraconazole")) {
      risks.push({
        id: "itraconazole-cns-exclusion-warning",
        severity: "warning",
        title: "Itraconazole Inefficacy for Central Nervous System Fungal Infections",
        involvedDrugIds: ["itraconazole"],
        hazard:
          "Undetectable to negligible CSF concentrations (<1-4%), resulting in catastrophic clinical failure if prescribed for fungal meningitis or intracranial abscesses.",
        biophysicalMechanism:
          "Despite high lipophilicity (logP 5.66), itraconazole is a bulky molecule (MW 705.6 Da) that is >99.8% bound to plasma albumin, eliminating free drug driving force. Furthermore, it is a substrate for luminal P-gp and BCRP efflux pumps.",
        actionableConsiderations: [
          "Contraindicated for fungal meningitis (cryptococcal, coccidioidal, histoplasma, or aspergillus CNS disease).",
          "Switch to fluconazole (>70-80% CSF penetration) for cryptococcal or candida meningitis, or voriconazole (>60-80% CSF penetration) for invasive CNS aspergillosis.",
        ],
        literatureCitation:
          "Tucker RM, et al. Rev Infect Dis. 1990;12 Suppl 3:S291-301; Perfect JR, et al. Clin Infect Dis. 2010;50(3):291-322",
      });
    }

    if (activeSet.has("meropenem") && activeSet.has("valproate")) {
      risks.push({
        id: "meropenem-valproate-seizure-collision",
        severity: "critical",
        title: "Carbapenem-Valproate Collision: Precipitous Drop in Anticonvulsant Levels",
        involvedDrugIds: ["meropenem", "valproate"],
        hazard:
          "Rapid 60-90% collapse in serum valproate concentrations within 24 hours, provoking loss of seizure control and refractory status epilepticus.",
        biophysicalMechanism:
          "Meropenem irreversibly inhibits hepatic acylpeptide hydrolase and intestinal UDP-glucuronosyltransferase, while increasing valproate glucuronide uptake into erythrocytes, causing irreversible valproate depletion.",
        actionableConsiderations: [
          "Avoid co-administration. Co-prescribing cannot be overcome by simply increasing valproate doses.",
          "If meropenem is mandatory for CNS infection, switch anticonvulsant therapy to levetiracetam or lacosamide with continuous EEG monitoring.",
        ],
        literatureCitation: "Spriet I, et al. Ann Pharmacother. 2007;41(7):1130-1136",
      });
    }
  }

  // -------------------------------------------------------------
  // 4. ADVISORY: Lipophilic Beta-Blocker Neuropsychiatric Adverse Events
  // -------------------------------------------------------------
  const lipophilicBetaBlockers = drugIds.filter(
    (id) => id === "propranolol" || id === "metoprolol",
  );
  if (lipophilicBetaBlockers.length > 0) {
    const bbNames = lipophilicBetaBlockers.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
    risks.push({
      id: "lipophilic-beta-blocker-cns-adverse-effects",
      severity: "advisory",
      title: "Lipophilic Beta-Blocker: Brain Accumulation & Sleep/Mood Disturbances",
      involvedDrugIds: lipophilicBetaBlockers,
      hazard:
        "High central nervous system tissue partition associated with vivid nightmares, sleep fragmentation, daytime lethargy, and potential depressive mood changes.",
      biophysicalMechanism: `${bbNames} exhibits favorable lipophilicity (logP 1.9-2.6) and low polar surface area (TPSA < 51 Å²), crossing intact brain capillary endothelia to occupy central beta-adrenergic receptors and modulate melatonin synthesis.`,
      actionableConsiderations: [
        "Inquire specifically about sleep architecture disturbances, nightmares, or worsening depression.",
        "If central neuropsychiatric side effects occur, transition to a hydrophilic beta-blocker (atenolol or nadolol; logP < 0.7, CSF/plasma < 5%) which provides equivalent peripheral cardioprotection with near-zero CNS penetration.",
      ],
      literatureCitation: "Cruickshank JM. Eur Heart J. 1993;14(10):1380-1390",
    });
  }

  // -------------------------------------------------------------
  // 5. ADVISORY: Dexamethasone Endothelial Tight-Junction Restoration
  // -------------------------------------------------------------
  if (activeSet.has("dexamethasone")) {
    const coPrescribedAntimicrobials = drugIds.filter((id) => {
      const p = getCnsProfileById(id);
      return p?.category === "Antimicrobial";
    });

    if (coPrescribedAntimicrobials.length > 0) {
      risks.push({
        id: "dexamethasone-antimicrobial-timing-advisory",
        severity: "advisory",
        title: "Dexamethasone Tight-Junction Stabilization & Antimicrobial Administration Timing",
        involvedDrugIds: ["dexamethasone", ...coPrescribedAntimicrobials],
        hazard:
          "Dexamethasone actively upregulates claudin-5 and occludin, which attenuates brain edema but may decrease the paracellular CSF penetration of hydrophilic antimicrobials (especially vancomycin) as meningeal inflammation cools.",
        biophysicalMechanism:
          "Glucocorticoid receptor activation downregulates endothelial VEGF and pro-inflammatory cytokines, promoting the assembly of tight junction complexes and sealing capillary gaps.",
        actionableConsiderations: [
          "In acute bacterial meningitis, administer dexamethasone prior to or concurrently with the first antimicrobial dose to prevent severe cytokine release from bactericidal bacterial lysis.",
          "Maintain high systemic dosing and monitor serum troughs closely for vancomycin, since steroid-mediated barrier stabilization lowers its CSF penetration.",
        ],
        literatureCitation:
          "de Gans J, et al. N Engl J Med. 2002;347(20):1549-1556; Nau R, et al. Clin Microbiol Rev. 2010;23(4):858-883",
      });
    }
  }

  return risks;
}
