/**
 * Cytochrome P450 Time-Dependent Inhibition (TDI) & Nuclear Induction Simulator
 *
 * Mechanistic pharmacokinetic simulation engine modeling:
 * 1. Competitive Reversible Inhibition:
 *    - Rapid onset and rapid offset upon drug clearance governed by Ki, substrate Km,
 *      and perpetrator elimination half-life (Fluconazole, Ciprofloxacin, Quinidine).
 * 2. Mechanism-Based / Time-Dependent / Suicidal Inhibition (MBI / TDI):
 *    - Bioactivation by the CYP enzyme itself generates an unstable reactive intermediate
 *      that either coordinates irreversibly with the reduced Fe2+ heme iron (quasi-irreversible
 *      Metabolite-Intermediate Complex / MIC, e.g. Clarithromycin, Erythromycin, Diltiazem)
 *      or covalently alkylates the CYP apoprotein/heme ring (e.g. Ritonavir, Grapefruit
 *      furanocoumarins [bergamottin, 6',7'-dihydroxybergamottin], Paroxetine carbene adduct).
 *    - Recovery kinetics: Strictly independent of drug clearance! Once the enzyme molecule is
 *      destroyed, recovery requires de novo enzyme transcription, translation, and folding
 *      (governed by kdeg and turnover half-life ~36-72 hours for intestinal/hepatic CYP3A4).
 *      "Stopping the perpetrator does not restore the enzyme."
 * 3. Transcriptional Nuclear Receptor Induction:
 *    - PXR (Pregnane X Receptor / NR1I2): Heterodimerizes with RXR, binds ER6/DR3 promoter response
 *      elements, drives CYP3A4, CYP2C9, CYP2C19, ABCB1 (P-gp) transcription (Rifampin,
 *      St. John's wort, Carbamazepine).
 *    - CAR (Constitutive Androstane Receptor / NR1I3): Translocates to nucleus, heterodimerizes with RXR,
 *      binds PBREM enhancer modules, drives CYP2B6, CYP3A4 (Phenobarbital, Phenytoin).
 *    - AhR (Aryl Hydrocarbon Receptor): Ligand-activated transcription factor, heterodimerizes with ARNT,
 *      binds XRE/DRE response elements, drives CYP1A1/CYP1A2/CYP1B1 transcription (Tobacco cigarette
 *      combustion PAHs, Charbroiled/smoked meats).
 *    - Induction kinetics: Slow delayed onset (3-7 days lag for nuclear translocation, transcription,
 *      translation, and membrane insertion) and protracted offset (2-3 weeks after discontinuing
 *      the inducer while the elevated enzyme pool undergoes first-order degradation via kdeg).
 *      "Inducers take a week to land and two weeks to leave."
 *
 * REGULATORY NOTICE (FD&C Act § 520(o)(1)(E)):
 * Non-Device Clinical Decision Support Software. This simulator provides educational
 * reference pharmacology, molecular models, and kinetic simulations for licensed clinicians
 * and healthcare trainees. It does not provide patient-specific dosing directives, prescribing
 * commands, or diagnostic determinations. Dosing regimens, drug selection, and clinical monitoring
 * remain the sole independent responsibility of the treating clinician.
 */

import { DRUG_BY_ID } from "./catalog";

// ---------------------------------------------------------------------------
// Regulatory Posture
// ---------------------------------------------------------------------------

export const CYP_KINETICS_REGULATORY_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This Cytochrome P450 Time-Dependent Inhibition (TDI) & Nuclear Induction Simulator provides educational reference pharmacology and mechanistic simulation models describing molecular binding, enzyme degradation, and turnover kinetics. It is designed to assist licensed healthcare professionals and healthcare students in understanding and analyzing cytochrome P450 modulations. It does not provide patient-specific dosing directives, prescribing instructions, or therapeutic mandates. Dosing regimens, drug selection, and clinical monitoring remain the independent responsibility of licensed clinicians. References: FDA Guidance for Industry on In Vitro Drug Interaction Studies (2020), IUPHAR/BPS Guide to PHARMACOLOGY, and peer-reviewed cytochrome P450 turnover literature.";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type MolecularModeId =
  | "competitive-reversible"
  | "mechanism-based-tdi"
  | "nuclear-receptor-induction";

export interface MolecularMode {
  id: MolecularModeId;
  title: string;
  shortName: string;
  subtitle: string;
  mechanismDescription: string;
  bindingTarget: string;
  reversibility: string;
  onsetKinetics: string;
  offsetKinetics: string;
  clinicalAphorism: string;
  exemplarDrugIds: string[];
  biochemicalHallmarks: string[];
  governingParameters: string[];
}

export type TdiSubMechanism =
  | "mic-heme-coordination"
  | "apoprotein-alkylation"
  | "reactive-carbene"
  | "furan-epoxide-adduct";

export interface TdiPerpetrator {
  drugId: string;
  name: string;
  targetIsoforms: string[];
  subMechanism: TdiSubMechanism;
  subMechanismLabel: string;
  reactiveIntermediate: string;
  inactivationRateKinactPerDay: number;
  resynthesisHalfLifeHours: { intestinal: number; hepatic: number };
  recoveryTimeDays: string;
  clinicalImpact: string;
  highRiskVictimSubstrates: string[];
  clinicalPearl: string;
  citations: string[];
}

export type NuclearReceptorType = "PXR" | "CAR" | "AhR";

export interface NuclearInducer {
  drugId: string;
  name: string;
  receptor: NuclearReceptorType;
  receptorFullName: string;
  heterodimerPartner: string;
  dnaResponseElement: string;
  targetGenes: string[];
  inducedIsoforms: string[];
  onsetLagDays: number;
  peakInductionDays: number;
  offsetWashoutWeeks: number;
  maxFoldInduction: number;
  clinicalPearl: string;
  highRiskVictimSubstrates: string[];
  citations: string[];
}

export interface CompetitiveInhibitor {
  drugId: string;
  name: string;
  targetIsoforms: string[];
  kiMicromolar: number;
  offsetHours: number;
  clinicalPearl: string;
  highRiskVictimSubstrates: string[];
  citations: string[];
}

export interface NuclearReceptorPathway {
  receptorId: NuclearReceptorType;
  name: string;
  geneSymbol: string;
  dimerization: string;
  responseElements: string;
  regulatedEnzymes: string[];
  canonicalInducerIds: string[];
  biochemicalMechanism: string;
  clinicalPearls: string[];
}

export interface SensitiveVictimSubstrate {
  drugId: string;
  name: string;
  primaryCyp: string;
  narrowTherapeuticIndex: boolean;
  toxicityWithTdi: string;
  failureWithInducer: string;
}

export interface TrajectoryPoint {
  day: number;
  activePoolPct: number;
  totalEnzymeAbundancePct: number;
  competitiveSuppressionPct: number;
  phase: "baseline" | "onset" | "steady-state" | "offset-recovery" | "full-recovery";
  phaseLabel: string;
  narrative: string;
  isoforms: Record<string, number>;
}

export interface ActiveModulatorInfo {
  drugId: string;
  drugName: string;
  mode: "competitive" | "tdi" | "induction";
  targetIsoforms: string[];
  description: string;
}

export interface EnzymeTrajectoryResult {
  points: TrajectoryPoint[];
  nadirPct: number;
  peakPct: number;
  dayAtNadir: number;
  dayAtPeak: number;
  recoveryDay90Pct: number | null;
  dominantMechanism:
    | "TDI / Mechanism-Based"
    | "Nuclear Induction"
    | "Competitive Reversible"
    | "Complex Collision"
    | "Baseline Normal";
  activeModulators: ActiveModulatorInfo[];
  clinicalSummary: string;
  monitoringPearls: string[];
  days: number;
  stopDay: number;
}

export interface KineticAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  mechanism: string;
  action: string;
  involvedDrugIds: string[];
}

export interface VictimRisk {
  victimId: string;
  victimName: string;
  perpetratorId: string;
  perpetratorName: string;
  consequence: string;
  recommendation: string;
}

export interface TrayKineticsDetection {
  tdiDrugs: TdiPerpetrator[];
  inducerDrugs: NuclearInducer[];
  competitiveDrugs: CompetitiveInhibitor[];
  victimDrugs: SensitiveVictimSubstrate[];
  hasCollision: boolean;
  collisionType: "tdi-knockout" | "nuclear-induction" | "opposing-tdi-induction" | "none";
  summary: string;
  kineticAlerts: KineticAlert[];
  victimRisks: VictimRisk[];
}

// ---------------------------------------------------------------------------
// 3 Molecular Modes of CYP Modulation Data
// ---------------------------------------------------------------------------

export const MOLECULAR_MODES: readonly MolecularMode[] = [
  {
    id: "competitive-reversible",
    title: "Competitive Reversible Inhibition",
    shortName: "Competitive Reversible",
    subtitle: "Rapid Onset & Rapid Washout Governed by Ki and Elimination Half-Life",
    mechanismDescription:
      "Perpetrator produces reversible competitive inhibition by non-covalently occupying the catalytic substrate pocket or coordinating the heme iron (e.g. triazole ring nitrogen). No chemical bond is formed, and the enzyme protein structure is completely uninjured. Inhibition severity depends directly on the concentration ratio [I]/Ki and substrate Km.",
    bindingTarget: "Substrate-binding pocket / catalytic cleft (non-covalent Van der Waals & hydrogen bonds)",
    reversibility: "Fully reversible; instant dissociation upon concentration decline",
    onsetKinetics: "Rapid (<12–24 hours), tracking perpetrator plasma absorption and Cmax",
    offsetKinetics: "Rapid (<24–48 hours), strictly paralleling perpetrator systemic elimination half-life",
    clinicalAphorism: "Clears with the drug: offset tracks systemic clearance half-life.",
    exemplarDrugIds: ["fluconazole", "ciprofloxacin", "quinidine"],
    biochemicalHallmarks: [
      "No covalent adducts or heme destruction",
      "Increases apparent Km of substrate without altering Vmax (surmountable at high substrate concentrations)",
      "Enzyme returns to 100% catalytic capacity the moment perpetrator drug clears plasma",
    ],
    governingParameters: ["Inhibitor concentration [I]", "Inhibitor constant Ki", "Substrate Michaelis constant Km", "Drug elimination half-life t1/2"],
  },
  {
    id: "mechanism-based-tdi",
    title: "Mechanism-Based / Time-Dependent Inactivation (MBI / TDI)",
    shortName: "MBI / TDI Suicidal",
    subtitle: "Suicidal Inactivation: Metabolite-Intermediate Complex (MIC) or Apoprotein Alkylation",
    mechanismDescription:
      "Catalytic bioactivation by the CYP enzyme itself generates an unstable electrophilic or radical intermediate. This reactive species either forms a quasi-irreversible coordinate complex with reduced Fe2+ heme iron (Metabolite-Intermediate Complex / MIC) or covalently alkylates the CYP apoprotein/heme ring, triggering irreversible destruction and proteolytic degradation.",
    bindingTarget: "Heme iron Fe2+ (Metabolite-Intermediate Complex / MIC) or CYP apoprotein nucleophiles (covalent alkylation)",
    reversibility: "Irreversible or quasi-irreversible; destroyed enzyme cannot be revived",
    onsetKinetics: "Rapid-to-progressive (12–48 hours) as catalytic cycles progressively consume active enzyme pool",
    offsetKinetics: "Protracted (3–7 days); strictly independent of drug clearance, governed entirely by de novo protein synthesis (kdeg)",
    clinicalAphorism: "Stopping the perpetrator does not restore the enzyme: recovery demands de novo protein synthesis.",
    exemplarDrugIds: ["clarithromycin", "erythromycin", "diltiazem", "ritonavir", "grapefruit", "paroxetine"],
    biochemicalHallmarks: [
      "Requires NADPH, catalytic turnover, and bioactivation (suicidal auto-inactivation)",
      "Produces spectral absorbance shift (e.g. 456 nm MIC peak for clarithromycin)",
      "Reduces both Vmax and apparent enzyme pool (insurmountable by substrate concentration)",
      "Intestinal CYP3A4 recovery: ~24–72 h; Hepatic CYP3A4 recovery: ~48–96 h",
    ],
    governingParameters: ["Inactivation rate constant kinact", "Inactivation constant KI", "Enzyme degradation rate kdeg", "Turnover half-life t1/2 ~36–72h"],
  },
  {
    id: "nuclear-receptor-induction",
    title: "Transcriptional Nuclear Receptor Induction",
    shortName: "Nuclear Induction",
    subtitle: "Delayed Transcriptional Upregulation via PXR, CAR, and AhR Pathways",
    mechanismDescription:
      "Ligand binding to nuclear hormone receptors (PXR, CAR, AhR) drives receptor translocation, dimerization with partner proteins (RXR or ARNT), recruitment of transcriptional coactivators, and binding to specific DNA enhancer/promoter elements. This markedly amplifies mRNA synthesis and de novo translation of CYP enzymes and drug transporters.",
    bindingTarget: "Nuclear receptors (PXR/NR1I2, CAR/NR1I3, AhR) -> DNA response elements (ER6, DR3, PBREM, XRE)",
    reversibility: "Receptor ligand unbinds with drug clearance, but elevated enzyme pool persists",
    onsetKinetics: "Delayed lag phase (3–7 days) required for transcription, translation, and endoplasmic reticulum membrane insertion",
    offsetKinetics: "Protracted washout lag (2–3 weeks) while the massive pool of excess enzyme degrades through first-order kdeg",
    clinicalAphorism: "Inducers take a week to land and two weeks to leave.",
    exemplarDrugIds: ["rifampin", "st-johns-wort", "carbamazepine", "phenobarbital", "phenytoin", "charred-meat"],
    biochemicalHallmarks: [
      "Lag phase: no meaningful change in first 24–48 hours",
      "Increases maximal enzyme velocity Vmax 2- to 5-fold (lowering victim AUC by 80–95%)",
      "Frequently co-induces Phase II enzymes (UGTs) and efflux transporters (P-gp/ABCB1)",
      "Sudden cessation creates toxic rebound spike in victim drug levels 1–2 weeks later",
    ],
    governingParameters: ["Transcriptional EC50", "Max fold induction Emax", "Nuclear mRNA half-life", "Enzyme degradation rate kdeg"],
  },
];

// ---------------------------------------------------------------------------
// TDI Perpetrators Catalog
// ---------------------------------------------------------------------------

export const TDI_PERPETRATORS: readonly TdiPerpetrator[] = [
  {
    drugId: "clarithromycin",
    name: "Clarithromycin",
    targetIsoforms: ["CYP3A4"],
    subMechanism: "mic-heme-coordination",
    subMechanismLabel: "Metabolite-Intermediate Complex (MIC)",
    reactiveIntermediate: "Nitrosoalkane metabolite generated from N-demethylation of desosamine sugar",
    inactivationRateKinactPerDay: 1.45,
    resynthesisHalfLifeHours: { intestinal: 24, hepatic: 48 },
    recoveryTimeDays: "3 to 6 days after discontinuation",
    clinicalImpact: "Potent CYP3A4 knockout. Increases midazolam AUC 7-fold to 10-fold and simvastatin AUC >10-fold.",
    highRiskVictimSubstrates: ["midazolam", "simvastatin", "tacrolimus"],
    clinicalPearl:
      "Desosamine amine oxidation generates a nitrosoalkane that tightly binds reduced Fe2+ heme iron (456 nm complex). Intestinal 3A4 is destroyed on day 1. Discontinuing clarithromycin yesterday does NOT restore oral midazolam or statin clearance today; recovery requires fresh enzyme synthesis over 3–5 days.",
    citations: ["Zhou S, et al. Clin Pharmacokinet 2005", "Mayhew BS, et al. Drug Metab Dispos 2000"],
  },
  {
    drugId: "erythromycin",
    name: "Erythromycin",
    targetIsoforms: ["CYP3A4"],
    subMechanism: "mic-heme-coordination",
    subMechanismLabel: "Metabolite-Intermediate Complex (MIC)",
    reactiveIntermediate: "Nitrosoalkane reactive intermediate coordinating heme Fe2+",
    inactivationRateKinactPerDay: 0.85,
    resynthesisHalfLifeHours: { intestinal: 24, hepatic: 48 },
    recoveryTimeDays: "3 to 5 days after discontinuation",
    clinicalImpact: "Moderate-to-strong CYP3A4 inactivation; dual hazard with QT prolongation.",
    highRiskVictimSubstrates: ["midazolam", "simvastatin", "theophylline"],
    clinicalPearl:
      "Similar to clarithromycin, erythromycin undergoes N-demethylation followed by oxidation to form a quasi-irreversible nitroso-heme complex. Although less potent than clarithromycin, recovery remains strictly gated by de novo CYP3A4 synthesis.",
    citations: ["Pessayre D, et al. Biochem Pharmacol 1982", "Huang SM, et al. Clin Pharmacol Ther 2007"],
  },
  {
    drugId: "diltiazem",
    name: "Diltiazem",
    targetIsoforms: ["CYP3A4"],
    subMechanism: "mic-heme-coordination",
    subMechanismLabel: "Metabolite-Intermediate Complex (MIC)",
    reactiveIntermediate: "N-monodemethylated nitrosoalkane intermediate coordinating heme iron",
    inactivationRateKinactPerDay: 0.72,
    resynthesisHalfLifeHours: { intestinal: 30, hepatic: 52 },
    recoveryTimeDays: "3 to 5 days after discontinuation",
    clinicalImpact: "Moderate CYP3A4 TDI; produces clinically significant increases in statin, calcineurin inhibitor, and DOAC levels.",
    highRiskVictimSubstrates: ["simvastatin", "tacrolimus", "midazolam"],
    clinicalPearl:
      "Diltiazem forms an inhibitory nitroso-heme complex (MIC) through its dimethylaminoethyl side chain. Often misclassified as a simple reversible inhibitor, but its progressive time-dependent inactivation means steady-state inhibition is markedly stronger than single-dose predictions.",
    citations: ["Jones DR, et al. Drug Metab Dispos 1999", "Yeo KR, et al. Br J Clin Pharmacol 2011"],
  },
  {
    drugId: "ritonavir",
    name: "Ritonavir",
    targetIsoforms: ["CYP3A4", "CYP2D6"],
    subMechanism: "apoprotein-alkylation",
    subMechanismLabel: "Irreversible Apoprotein & Heme Alkylation",
    reactiveIntermediate: "Thiazole ring-derived electrophilic carbene and radical species",
    inactivationRateKinactPerDay: 1.85,
    resynthesisHalfLifeHours: { intestinal: 28, hepatic: 60 },
    recoveryTimeDays: "4 to 7 days after discontinuation",
    clinicalImpact: "The gold standard pharmaceutical 3A4 knockout. Used therapeutically for pharmacokinetic boosting (100 mg).",
    highRiskVictimSubstrates: ["midazolam", "simvastatin", "tacrolimus"],
    clinicalPearl:
      "Ritonavir is an exceptionally potent mechanism-based inactivator. Oxidation generates reactive intermediates that both alkylate the apoprotein and coordinate heme. Intestinal and hepatic CYP3A4 are virtually eliminated within 24–48 hours. After stopping ritonavir, normal 3A4 metabolic capacity takes 5–7 days to regenerate.",
    citations: ["Kalgutkar AS, et al. Curr Med Chem 2007", "Ernest CS, et al. Drug Metab Dispos 2005"],
  },
  {
    drugId: "grapefruit",
    name: "Grapefruit juice",
    targetIsoforms: ["CYP3A4"],
    subMechanism: "furan-epoxide-adduct",
    subMechanismLabel: "Furan Epoxide Covalent Apoprotein Adduct",
    reactiveIntermediate: "Bergamottin and 6',7'-dihydroxybergamottin furan-2,3-epoxides",
    inactivationRateKinactPerDay: 2.2,
    resynthesisHalfLifeHours: { intestinal: 24, hepatic: 50 },
    recoveryTimeDays: "1 to 3 days (enterocyte turnover dependent)",
    clinicalImpact: "Destroys enterocyte intestinal CYP3A4 first-pass extraction; massive oral bioavailability jump (simvastatin, felodipine).",
    highRiskVictimSubstrates: ["simvastatin", "midazolam", "tacrolimus"],
    clinicalPearl:
      "Furanocoumarins (bergamottin) act as suicide substrates: CYP3A4 epoxidizes the furan ring into a reactive electrophile that irreversibly alkylates the apoprotein, causing apoprotein denaturation and proteasomal degradation. Because systemic absorption of furanocoumarins is minimal, gut 3A4 is destroyed while liver 3A4 is mostly spared. Oral midazolam AUC spikes, while IV midazolam is minimally affected.",
    citations: ["Lown KS, et al. J Clin Invest 1997", "Paine MF, et al. Clin Pharmacol Ther 2006"],
  },
  {
    drugId: "paroxetine",
    name: "Paroxetine",
    targetIsoforms: ["CYP2D6"],
    subMechanism: "reactive-carbene",
    subMechanismLabel: "Methylenedioxyphenyl Carbene Heme Adduct",
    reactiveIntermediate: "Electrophilic carbene intermediate generated from methylenedioxy ring cleavage",
    inactivationRateKinactPerDay: 1.1,
    resynthesisHalfLifeHours: { intestinal: 36, hepatic: 65 },
    recoveryTimeDays: "4 to 7 days after discontinuation",
    clinicalImpact: "Converts extensive CYP2D6 normal metabolizers into phenotypic poor metabolizers (phenocopying).",
    highRiskVictimSubstrates: ["metoprolol"],
    clinicalPearl:
      "Paroxetine's methylenedioxy moiety is cleaved by CYP2D6 to form a reactive carbene that forms a pseudo-irreversible coordination complex with the heme iron. A patient on paroxetine has zero functional 2D6 activity; stopping paroxetine requires up to 1 week for newly synthesized 2D6 to restore codeine activation or metoprolol clearance.",
    citations: ["Bertelsen KM, et al. Drug Metab Dispos 2003", "Liston HL, et al. Clin Pharmacokinet 2002"],
  },
];

// ---------------------------------------------------------------------------
// Nuclear Inducers Catalog
// ---------------------------------------------------------------------------

export const NUCLEAR_INDUCERS: readonly NuclearInducer[] = [
  {
    drugId: "rifampin",
    name: "Rifampin",
    receptor: "PXR",
    receptorFullName: "Pregnane X Receptor (NR1I2)",
    heterodimerPartner: "RXR (Retinoid X Receptor, NR2B1)",
    dnaResponseElement: "ER6 (Everted Repeat 6) & DR3 (Direct Repeat 3) in CYP3A4 promoter",
    targetGenes: ["CYP3A4", "CYP2C9", "CYP2C19", "ABCB1 (P-gp)", "UGT1A1"],
    inducedIsoforms: ["CYP3A4", "CYP2C9", "CYP2C19"],
    onsetLagDays: 3,
    peakInductionDays: 10,
    offsetWashoutWeeks: 2.5,
    maxFoldInduction: 3.8,
    clinicalPearl:
      "The quintessential prototypical PXR agonist. Rifampin docks into the large hydrophobic ligand-binding pocket of PXR, recruiting SRC-1 coactivators and driving exponential transcription of CYP3A4, CYP2C9, and P-gp. Oral contraceptive failure and subtherapeutic calcineurin inhibitor levels are catastrophic risks. Offset takes 2–3 weeks: stopping rifampin does not clear the induced enzyme pool overnight.",
    highRiskVictimSubstrates: ["tacrolimus", "midazolam", "simvastatin", "warfarin"],
    citations: ["Lehmann JM, et al. J Clin Invest 1998", "Niemi M, et al. Clin Pharmacokinet 2003"],
  },
  {
    drugId: "st-johns-wort",
    name: "St. John's wort",
    receptor: "PXR",
    receptorFullName: "Pregnane X Receptor (NR1I2)",
    heterodimerPartner: "RXR (Retinoid X Receptor, NR2B1)",
    dnaResponseElement: "ER6 and DR3 promoter elements",
    targetGenes: ["CYP3A4", "CYP2C9", "CYP2C19", "ABCB1 (P-gp)"],
    inducedIsoforms: ["CYP3A4", "CYP2C9", "CYP2C19"],
    onsetLagDays: 4,
    peakInductionDays: 12,
    offsetWashoutWeeks: 2.0,
    maxFoldInduction: 2.8,
    clinicalPearl:
      "Hyperforin is a high-affinity sub-micromolar ligand for PXR. Over-the-counter herbal use notoriously precipitates acute allograft rejection by driving CYP3A4/P-gp clearance of cyclosporine and tacrolimus. Clinical offset requires 10–14 days for the hyper-induced enzyme pool to degrade.",
    highRiskVictimSubstrates: ["tacrolimus", "midazolam", "warfarin"],
    citations: ["Moore LB, et al. Proc Natl Acad Sci USA 2000", "Ruschitzka F, et al. Lancet 2000"],
  },
  {
    drugId: "carbamazepine",
    name: "Carbamazepine",
    receptor: "PXR",
    receptorFullName: "Pregnane X Receptor (NR1I2)",
    heterodimerPartner: "RXR (Retinoid X Receptor, NR2B1)",
    dnaResponseElement: "ER6 and DR3 promoter elements",
    targetGenes: ["CYP3A4", "CYP2C9", "CYP2C19", "UGT2B7"],
    inducedIsoforms: ["CYP3A4", "CYP2C9"],
    onsetLagDays: 4,
    peakInductionDays: 14,
    offsetWashoutWeeks: 2.5,
    maxFoldInduction: 2.5,
    clinicalPearl:
      "Activates PXR to induce its own metabolism (auto-induction), causing its own clearance to double over the first 2–4 weeks of therapy. Co-administered CYP3A4 victims experience profound exposure reductions.",
    highRiskVictimSubstrates: ["tacrolimus", "midazolam", "warfarin"],
    citations: ["Synold TW, et al. Nat Med 2001", "Bertilsson L, et al. Clin Pharmacokinet 1986"],
  },
  {
    drugId: "phenobarbital",
    name: "Phenobarbital",
    receptor: "CAR",
    receptorFullName: "Constitutive Androstane Receptor (NR1I3)",
    heterodimerPartner: "RXR (Retinoid X Receptor, NR2B1)",
    dnaResponseElement: "PBREM (Phenobarbital-Responsive Enhancer Module)",
    targetGenes: ["CYP2B6", "CYP3A4", "CYP2C9", "UGT1A1"],
    inducedIsoforms: ["CYP2B6", "CYP3A4", "CYP2C9"],
    onsetLagDays: 4,
    peakInductionDays: 14,
    offsetWashoutWeeks: 3.0,
    maxFoldInduction: 2.9,
    clinicalPearl:
      "Indirect activator of CAR: promotes protein phosphatase 2A (PP2A)-mediated dephosphorylation of CAR, prompting nuclear translocation from cytoplasm. Binds PBREM upstream of CYP2B6 and CYP3A4. Given phenobarbital's ~100-hour elimination half-life PLUS enzyme turnover delay, induction persists for 3 to 4 weeks after cessation.",
    highRiskVictimSubstrates: ["bupropion", "midazolam", "warfarin"],
    citations: ["Kawamoto T, et al. Mol Cell Biol 1999", "Sueyoshi T, et al. J Biol Chem 1999"],
  },
  {
    drugId: "phenytoin",
    name: "Phenytoin",
    receptor: "CAR",
    receptorFullName: "Constitutive Androstane Receptor & PXR",
    heterodimerPartner: "RXR (Retinoid X Receptor, NR2B1)",
    dnaResponseElement: "PBREM and ER6 response elements",
    targetGenes: ["CYP2B6", "CYP3A4", "CYP2C9", "UGT1A1"],
    inducedIsoforms: ["CYP2B6", "CYP3A4", "CYP2C9"],
    onsetLagDays: 4,
    peakInductionDays: 14,
    offsetWashoutWeeks: 2.5,
    maxFoldInduction: 2.6,
    clinicalPearl:
      "Dual activator of CAR and PXR. Broadly induces CYP3A4, CYP2C9, and CYP2B6. Discontinuation requires extended therapeutic drug monitoring for victim substrates because clearance remains elevated for weeks.",
    highRiskVictimSubstrates: ["tacrolimus", "bupropion", "warfarin"],
    citations: ["Handschin C, et al. Mol Pharmacol 2002", "Pascussi JM, et al. Mol Pharmacol 2000"],
  },
  {
    drugId: "charred-meat",
    name: "Charred / smoked meat",
    receptor: "AhR",
    receptorFullName: "Aryl Hydrocarbon Receptor",
    heterodimerPartner: "ARNT (AhR Nuclear Translocator)",
    dnaResponseElement: "XRE / DRE (Xenobiotic Response Element: 5'-TNGCGTG-3')",
    targetGenes: ["CYP1A1", "CYP1A2", "CYP1B1", "UGT1A6"],
    inducedIsoforms: ["CYP1A2"],
    onsetLagDays: 3,
    peakInductionDays: 7,
    offsetWashoutWeeks: 1.5,
    maxFoldInduction: 2.0,
    clinicalPearl:
      "Combustion and dietary polycyclic aromatic hydrocarbons (PAHs, e.g. benzo[a]pyrene in charbroiled meats and smoke), NOT nicotine, bind the cytoplasmic AhR. AhR sheds Hsp90, translocates to nucleus, heterodimerizes with ARNT, and binds XREs in the CYP1A2 promoter. High PAH exposure induces CYP1A2, lowering clozapine, olanzapine, and theophylline levels. Sudden cessation of PAH exposure stops AhR activation; CYP1A2 drops to baseline over 1–2 weeks, precipitating clozapine toxicity and seizures if doses are not monitored and adjusted.",
    highRiskVictimSubstrates: ["clozapine", "theophylline"],
    citations: ["Faber MS, et al. Clin Pharmacol Ther 2005", "Kappas A, et al. Clin Pharmacol Ther 1978"],
  },
];

// ---------------------------------------------------------------------------
// Competitive Reversible Inhibitors Catalog
// ---------------------------------------------------------------------------

export const COMPETITIVE_INHIBITORS: readonly CompetitiveInhibitor[] = [
  {
    drugId: "fluconazole",
    name: "Fluconazole",
    targetIsoforms: ["CYP2C9", "CYP3A4", "CYP2C19"],
    kiMicromolar: 6.5,
    offsetHours: 24,
    clinicalPearl:
      "Triazole nitrogen reversibly coordinates the heme iron (type II binding). Governed by reversible mass-action binding. Rebounds to normal activity within 2–3 days following drug elimination (t1/2 ~30h). Contrasts with irreversible TDI.",
    highRiskVictimSubstrates: ["warfarin", "midazolam"],
    citations: ["Kunze KL, et al. Drug Metab Dispos 1996", "Niwa T, et al. Biol Pharm Bull 2005"],
  },
  {
    drugId: "ciprofloxacin",
    name: "Ciprofloxacin",
    targetIsoforms: ["CYP1A2"],
    kiMicromolar: 12.0,
    offsetHours: 12,
    clinicalPearl:
      "Potent reversible competitive inhibitor of CYP1A2. Fluoroquinolone ring occupies the narrow planar substrate cleft. Rapid onset within hours; rapid offset within 24 hours of discontinuation (ciprofloxacin t1/2 ~4h). Contrast with irreversible TDI or slow AhR turnover.",
    highRiskVictimSubstrates: ["theophylline", "clozapine"],
    citations: ["Fuhr U, et al. Clin Pharmacol Ther 1992", "McLellan RA, et al. Br J Clin Pharmacol 1996"],
  },
  {
    drugId: "quinidine",
    name: "Quinidine",
    targetIsoforms: ["CYP2D6"],
    kiMicromolar: 0.06,
    offsetHours: 12,
    clinicalPearl:
      "Sub-micromolar competitive inhibitor of CYP2D6. Classic pharmacological probe for reversible 2D6 inhibition. Washes out rapidly upon elimination without destroying the enzyme apoprotein.",
    highRiskVictimSubstrates: ["metoprolol"],
    citations: ["Guengerich FP, et al. Mol Pharmacol 1986", "Otton SV, et al. Clin Pharmacol Ther 1988"],
  },
];

// ---------------------------------------------------------------------------
// Nuclear Receptor Pathways
// ---------------------------------------------------------------------------

export const NUCLEAR_RECEPTOR_PATHWAYS: readonly NuclearReceptorPathway[] = [
  {
    receptorId: "PXR",
    name: "Pregnane X Receptor",
    geneSymbol: "NR1I2",
    dimerization: "Heterodimerizes with RXR (Retinoid X Receptor, NR2B1)",
    responseElements: "ER6 (Everted Repeat 6) and DR3 (Direct Repeat 3) motifs",
    regulatedEnzymes: ["CYP3A4", "CYP2C9", "CYP2C19", "ABCB1 (P-gp)", "UGT1A1"],
    canonicalInducerIds: ["rifampin", "st-johns-wort", "carbamazepine"],
    biochemicalMechanism:
      "PXR contains a remarkably large and flexible ligand-binding pocket (~1,100 Å³) that accommodates structurally diverse lipophilic xenobiotics. Agonist binding induces a conformational shift that displaces nuclear receptor corepressors (NCoR/SMRT) and recruits steroid receptor coactivators (SRC-1). The PXR-RXR heterodimer binds promoter response elements, accelerating pre-mRNA transcription up to 5-fold.",
    clinicalPearls: [
      "Broadest target gene coverage: co-regulates CYP3A4 and P-gp, creating a synchronized intestinal/hepatic barrier.",
      "Requires 3–7 days to reach peak transcription and 2–3 weeks to decay after stopping the agonist.",
      "High clinical lethality with calcineurin inhibitors (tacrolimus rejection) and antiretrovirals.",
    ],
  },
  {
    receptorId: "CAR",
    name: "Constitutive Androstane Receptor",
    geneSymbol: "NR1I3",
    dimerization: "Heterodimerizes with RXR (Retinoid X Receptor, NR2B1)",
    responseElements: "PBREM (Phenobarbital-Responsive Enhancer Module, DR4 motifs)",
    regulatedEnzymes: ["CYP2B6", "CYP3A4", "CYP2C9", "UGT1A1"],
    canonicalInducerIds: ["phenobarbital", "phenytoin"],
    biochemicalMechanism:
      "CAR is constitutively active in vitro but held in an inactive sequestered complex in the hepatocyte cytoplasm bound to heat shock protein 90 (Hsp90) and CCRP. Xenobiotics like phenobarbital stimulate dephosphorylation at Thr-38 via PP2A, triggering CAR nuclear translocation. In the nucleus, CAR heterodimerizes with RXR and binds the 51-bp PBREM enhancer module.",
    clinicalPearls: [
      "Dominant transcriptional driver of CYP2B6 (dramatically lowers bupropion and methadone exposure).",
      "Phenobarbital's long elimination half-life (~100 hours) combines with enzyme turnover to produce the longest offset lag in clinical pharmacology (3–4 weeks).",
      "Significant overlap with PXR in CYP3A4 and CYP2C9 promoter activation.",
    ],
  },
  {
    receptorId: "AhR",
    name: "Aryl Hydrocarbon Receptor",
    geneSymbol: "AHR",
    dimerization: "Heterodimerizes with ARNT (AhR Nuclear Translocator / HIF-1β)",
    responseElements: "XRE / DRE (Xenobiotic Response Element: 5'-TNGCGTG-3')",
    regulatedEnzymes: ["CYP1A1", "CYP1A2", "CYP1B1", "UGT1A6"],
    canonicalInducerIds: ["charred-meat"],
    biochemicalMechanism:
      "Unlike PXR and CAR (which are nuclear receptor superfamily members), AhR is a basic helix-loop-helix/Per-ARNT-Sim (bHLH-PAS) transcription factor. Maintained in cytoplasm by Hsp90, p23, and XAP2. Planar aromatic hydrocarbons (PAHs) bind AhR, prompting conformational change, nuclear import, and shedding of chaperones. In the nucleus, AhR heterodimerizes with ARNT and recruits p300/CBP histone acetyltransferases to XRE motifs in the CYP1A promoter.",
    clinicalPearls: [
      "Specific for the CYP1A gene family (1A1, 1A2, 1B1) without inducing CYP3A4.",
      "Cigarette smoke PAHs drive this pathway; pure nicotine (e.g. NRT patches, gum, vaping) does NOT induce AhR or CYP1A2.",
      "Hospitalization cessation spike: Patients stabilized on clozapine who stop smoking upon hospital admission lose AhR drive within 1–2 weeks, leading to clozapine toxicity and seizures.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Sensitive Victim Substrates
// ---------------------------------------------------------------------------

export const SENSITIVE_VICTIM_SUBSTRATES: readonly SensitiveVictimSubstrate[] = [
  {
    drugId: "midazolam",
    name: "Midazolam",
    primaryCyp: "CYP3A4",
    narrowTherapeuticIndex: false,
    toxicityWithTdi: "Profound prolonged sedation, respiratory depression (oral AUC increases 5- to 10-fold)",
    failureWithInducer: "Complete loss of sedative efficacy; AUC reduced by 85–95%",
  },
  {
    drugId: "simvastatin",
    name: "Simvastatin",
    primaryCyp: "CYP3A4",
    narrowTherapeuticIndex: false,
    toxicityWithTdi: "Severe myopathy and rhabdomyolysis due to massive active acid accumulation (>10-fold AUC)",
    failureWithInducer: "Failure of lipid lowering and cardiovascular risk reduction",
  },
  {
    drugId: "tacrolimus",
    name: "Tacrolimus",
    primaryCyp: "CYP3A4",
    narrowTherapeuticIndex: true,
    toxicityWithTdi: "Acute nephrotoxicity, neurotoxicity, severe hyperkalemia",
    failureWithInducer: "Acute allograft rejection due to subtherapeutic trough concentrations",
  },
  {
    drugId: "warfarin",
    name: "Warfarin",
    primaryCyp: "CYP2C9",
    narrowTherapeuticIndex: true,
    toxicityWithTdi: "Life-threatening hemorrhage and supratherapeutic INR",
    failureWithInducer: "Subtherapeutic INR, arterial/venous thromboembolism, stroke",
  },
  {
    drugId: "theophylline",
    name: "Theophylline",
    primaryCyp: "CYP1A2",
    narrowTherapeuticIndex: true,
    toxicityWithTdi: "Tachyarrhythmias, intractable seizures, vomiting",
    failureWithInducer: "Severe bronchospasm and acute asthma/COPD exacerbation",
  },
  {
    drugId: "clozapine",
    name: "Clozapine",
    primaryCyp: "CYP1A2",
    narrowTherapeuticIndex: true,
    toxicityWithTdi: "Lethal sedation, grand mal seizures, myocarditis, severe hypotension",
    failureWithInducer: "Psychotic decompensation, hospital readmission",
  },
  {
    drugId: "bupropion",
    name: "Bupropion",
    primaryCyp: "CYP2B6",
    narrowTherapeuticIndex: false,
    toxicityWithTdi: "Seizure threshold reduction and agitation",
    failureWithInducer: "Loss of antidepressant response due to accelerated conversion to hydroxybupropion",
  },
  {
    drugId: "metoprolol",
    name: "Metoprolol",
    primaryCyp: "CYP2D6",
    narrowTherapeuticIndex: false,
    toxicityWithTdi: "Profound bradycardia, heart block, severe hypotension (3- to 5-fold AUC increase)",
    failureWithInducer: "Loss of beta-blockade",
  },
];

// All referenced drug IDs for catalog integrity tests
export const ALL_REFERENCED_DRUG_IDS: readonly string[] = [
  "clarithromycin",
  "erythromycin",
  "diltiazem",
  "ritonavir",
  "grapefruit",
  "paroxetine",
  "rifampin",
  "st-johns-wort",
  "carbamazepine",
  "phenobarbital",
  "phenytoin",
  "charred-meat",
  "fluconazole",
  "ciprofloxacin",
  "quinidine",
  "midazolam",
  "simvastatin",
  "tacrolimus",
  "warfarin",
  "theophylline",
  "clozapine",
  "bupropion",
  "metoprolol",
];

// ---------------------------------------------------------------------------
// Helper Accessor Functions
// ---------------------------------------------------------------------------

export function getAllTdiPerpetrators(): readonly TdiPerpetrator[] {
  return TDI_PERPETRATORS;
}

export function getAllNuclearInducers(): readonly NuclearInducer[] {
  return NUCLEAR_INDUCERS;
}

export function getAllCompetitiveInhibitors(): readonly CompetitiveInhibitor[] {
  return COMPETITIVE_INHIBITORS;
}

export function getNuclearReceptorPathways(): readonly NuclearReceptorPathway[] {
  return NUCLEAR_RECEPTOR_PATHWAYS;
}

export function getMolecularModes(): readonly MolecularMode[] {
  return MOLECULAR_MODES;
}

export function getTdiPerpetratorById(drugId: string): TdiPerpetrator | undefined {
  return TDI_PERPETRATORS.find((p) => p.drugId.toLowerCase() === drugId.toLowerCase());
}

export function getNuclearInducerById(drugId: string): NuclearInducer | undefined {
  return NUCLEAR_INDUCERS.find((i) => i.drugId.toLowerCase() === drugId.toLowerCase());
}

export function getCompetitiveInhibitorById(drugId: string): CompetitiveInhibitor | undefined {
  return COMPETITIVE_INHIBITORS.find((c) => c.drugId.toLowerCase() === drugId.toLowerCase());
}

// ---------------------------------------------------------------------------
// Dynamic Time-Course Engine (Mathematical Simulation)
// ---------------------------------------------------------------------------

/**
 * Calculates dynamic % active CYP enzyme pool over 0 to 30 days upon starting and stopping
 * TDI perpetrators, nuclear inducers, and competitive inhibitors.
 *
 * Mathematical formulation:
 * - Enzyme turnover follows zero-order synthesis and first-order degradation:
 *   d(E_pool)/dt = k_syn(t) - (k_deg + k_inact(t)) * E_pool(t)
 * - Baseline: E_pool(0) = 100%, k_deg = 0.347 day^-1 (half-life ~48 hours), k_syn,0 = 34.7 %/day.
 * - MBI/TDI: Adds k_inact during exposure, causing rapid active apoprotein destruction.
 *   Recovery post-stop is strictly limited by de novo synthesis (k_syn,0 - k_deg * E_pool).
 * - Induction: Agonist increases synthesis rate k_syn(t) with a 3-7 day transcriptional lag.
 *   Post-stop decay of excess enzyme takes 2-3 weeks (t1/2 ~ 3 days).
 * - Competitive: Reversibly reduces functional activity by (1 - F_comp(t)), where F_comp
 *   clears rapidly with the perpetrator's elimination half-life.
 */
export function calculateEnzymeTrajectory(
  drugIds: string[],
  days: number = 30,
  stopDay: number = 10,
): EnzymeTrajectoryResult {
  const normDrugIds = (drugIds || []).map((id) => id.toLowerCase().trim());
  const activeTdi = TDI_PERPETRATORS.filter((p) => normDrugIds.includes(p.drugId));
  const activeInducers = NUCLEAR_INDUCERS.filter((i) => normDrugIds.includes(i.drugId));
  const activeCompetitive = COMPETITIVE_INHIBITORS.filter((c) => normDrugIds.includes(c.drugId));

  // Determine dominant mechanism
  let dominantMechanism: EnzymeTrajectoryResult["dominantMechanism"] = "Baseline Normal";
  if (activeTdi.length > 0 && activeInducers.length > 0) {
    dominantMechanism = "Complex Collision";
  } else if (activeTdi.length > 0) {
    dominantMechanism = "TDI / Mechanism-Based";
  } else if (activeInducers.length > 0) {
    dominantMechanism = "Nuclear Induction";
  } else if (activeCompetitive.length > 0) {
    dominantMechanism = "Competitive Reversible";
  }

  // Active modulators descriptor list
  const activeModulators: ActiveModulatorInfo[] = [
    ...activeTdi.map((p) => ({
      drugId: p.drugId,
      drugName: p.name,
      mode: "tdi" as const,
      targetIsoforms: p.targetIsoforms,
      description: `Suicidal MBI/TDI (${p.subMechanismLabel})`,
    })),
    ...activeInducers.map((i) => ({
      drugId: i.drugId,
      drugName: i.name,
      mode: "induction" as const,
      targetIsoforms: i.inducedIsoforms,
      description: `Transcriptional ${i.receptor} Nuclear Induction`,
    })),
    ...activeCompetitive.map((c) => ({
      drugId: c.drugId,
      drugName: c.name,
      mode: "competitive" as const,
      targetIsoforms: c.targetIsoforms,
      description: "Competitive Reversible Inhibition",
    })),
  ];

  // If no modulators active, produce a clean baseline trajectory
  if (activeModulators.length === 0) {
    const points: TrajectoryPoint[] = [];
    for (let d = 0; d <= days; d++) {
      points.push({
        day: d,
        activePoolPct: 100,
        totalEnzymeAbundancePct: 100,
        competitiveSuppressionPct: 0,
        phase: "baseline",
        phaseLabel: "Physiological Baseline",
        narrative: "Normal homeostatic enzyme turnover (synthesis balances degradation at 100%).",
        isoforms: { CYP3A4: 100, CYP1A2: 100, CYP2C9: 100, CYP2B6: 100, CYP2D6: 100 },
      });
    }
    return {
      points,
      nadirPct: 100,
      peakPct: 100,
      dayAtNadir: 0,
      dayAtPeak: 0,
      recoveryDay90Pct: null,
      dominantMechanism: "Baseline Normal",
      activeModulators: [],
      clinicalSummary: "Baseline CYP enzyme synthesis and turnover in homeostatic equilibrium. No active modulators detected.",
      monitoringPearls: ["Standard baseline metabolic capacity. No pharmacokinetic enzyme collisions identified."],
      days,
      stopDay,
    };
  }

  // Simulation parameter constants
  const kDeg = 0.347; // day^-1 (half-life = 48 hours for hepatic/intestinal CYP3A4 turnover)
  const kSyn0 = 100 * kDeg; // 34.7 %/day

  // TDI parameters
  const netKinact = activeTdi.reduce((acc, t) => acc + t.inactivationRateKinactPerDay, 0);

  // Induction parameters
  const maxInductionFold = activeInducers.reduce((acc, ind) => acc + (ind.maxFoldInduction - 1), 0);
  const minOnsetLag = activeInducers.length > 0 ? Math.min(...activeInducers.map((i) => i.onsetLagDays)) : 3;

  // Competitive inhibition parameters
  const netCompInhibition = activeCompetitive.reduce((acc, c) => {
    // fractional suppression between 0 and 0.85
    const fract = c.kiMicromolar < 1 ? 0.85 : c.kiMicromolar < 10 ? 0.75 : 0.65;
    return Math.max(acc, fract);
  }, 0);
  const compHalfLifeHours = activeCompetitive.length > 0 ? Math.max(...activeCompetitive.map((c) => c.offsetHours)) : 24;
  const compKel = 0.693 / (compHalfLifeHours / 24); // day^-1

  // Run numerical simulation across days with fine sub-stepping for smooth ODE fidelity
  const dt = 0.05; // 0.05 day steps (1.2 hours)
  const stepsPerDay = Math.round(1 / dt);

  let currentPool = 100.0;
  const daySampledPoints: Array<{
    day: number;
    activePoolPct: number;
    totalEnzymeAbundancePct: number;
    competitiveSuppressionPct: number;
  }> = [];

  for (let d = 0; d <= days; d++) {
    // Record integer day
    // Calculate current competitive suppression
    let compSuppression = 0;
    if (activeCompetitive.length > 0) {
      if (d <= stopDay) {
        // Ramps to steady-state competitive inhibition within ~1 day
        const onFactor = 1 - Math.exp(-compKel * (d + 0.5));
        compSuppression = netCompInhibition * onFactor;
      } else {
        // Rapid exponential washout
        const washoutTime = d - stopDay;
        compSuppression = netCompInhibition * Math.exp(-compKel * washoutTime);
      }
    }

    const netActivePct = Math.max(1, Math.round(currentPool * (1 - compSuppression)));
    daySampledPoints.push({
      day: d,
      activePoolPct: netActivePct,
      totalEnzymeAbundancePct: Math.round(currentPool),
      competitiveSuppressionPct: Math.round(compSuppression * 100),
    });

    if (d === days) break;

    // Advance ODE by 1 full day via fine sub-steps
    for (let step = 0; step < stepsPerDay; step++) {
      const t = d + step * dt;
      const isDrugActive = t <= stopDay;

      // Inactivation rate
      const kinact = isDrugActive ? netKinact : 0;

      // Synthesis rate with delayed induction
      let kSyn = kSyn0;
      if (activeInducers.length > 0) {
        if (isDrugActive) {
          // Sigmoidal induction ramp accounting for onset lag
          const effectiveT = Math.max(0, t - (minOnsetLag - 1));
          const hill = Math.pow(effectiveT, 2) / (Math.pow(effectiveT, 2) + Math.pow(4.0, 2));
          kSyn = kSyn0 * (1 + maxInductionFold * hill);
        } else {
          // Exponential decay of elevated mRNA transcription rate back to basal
          const postStopTime = t - stopDay;
          const inducerWashout = Math.exp(-0.4 * postStopTime); // inducer clears over 2-3 days
          const hillAtStop = Math.pow(Math.max(0, stopDay - (minOnsetLag - 1)), 2) /
            (Math.pow(Math.max(0, stopDay - (minOnsetLag - 1)), 2) + Math.pow(4.0, 2));
          kSyn = kSyn0 * (1 + maxInductionFold * hillAtStop * inducerWashout);
        }
      }

      // Coupled differential equation: dE/dt = k_syn - (k_deg + k_inact) * E
      const dPool = (kSyn - (kDeg + kinact) * currentPool) * dt;
      currentPool = Math.max(0.5, currentPool + dPool);
    }
  }

  // Find nadir, peak, day at nadir, day at peak
  let nadirPct = 999;
  let peakPct = 0;
  let dayAtNadir = 0;
  let dayAtPeak = 0;

  for (const pt of daySampledPoints) {
    if (pt.activePoolPct < nadirPct) {
      nadirPct = pt.activePoolPct;
      dayAtNadir = pt.day;
    }
    if (pt.activePoolPct > peakPct) {
      peakPct = pt.activePoolPct;
      dayAtPeak = pt.day;
    }
  }

  // Recovery day (day post-stop where active pool is within 90% of baseline)
  let recoveryDay90Pct: number | null = null;
  for (const pt of daySampledPoints) {
    if (pt.day > stopDay) {
      if (dominantMechanism === "Nuclear Induction") {
        // Return down towards <= 115% baseline
        if (pt.activePoolPct <= 115) {
          recoveryDay90Pct = pt.day;
          break;
        }
      } else {
        // Return up towards >= 90% baseline
        if (pt.activePoolPct >= 90) {
          recoveryDay90Pct = pt.day;
          break;
        }
      }
    }
  }

  // Build full narrative points
  const points: TrajectoryPoint[] = daySampledPoints.map((pt) => {
    let phase: TrajectoryPoint["phase"] = "baseline";
    let phaseLabel = "Baseline";
    let narrative = "";

    if (pt.day === 0) {
      phase = "baseline";
      phaseLabel = "Exposure Start";
      narrative = "Day 0: Initial introduction of modulators. Enzyme pool starts at 100% homeostatic capacity.";
    } else if (pt.day <= stopDay) {
      if (pt.day <= 3) {
        phase = "onset";
        phaseLabel = "Onset / Induction Lag";
        if (activeTdi.length > 0) {
          narrative = `Day ${pt.day}: Suicidal TDI catalytic bioactivation rapidly consumes active CYP enzyme pool down to ${pt.activePoolPct}%.`;
        } else if (activeInducers.length > 0) {
          narrative = `Day ${pt.day}: Nuclear receptor activation lag phase. Minimal change in active enzyme pool (${pt.activePoolPct}%) while mRNA transcription accelerates.`;
        } else {
          narrative = `Day ${pt.day}: Reversible competitive inhibitor accumulates toward steady state; active capacity drops to ${pt.activePoolPct}%.`;
        }
      } else {
        phase = "steady-state";
        phaseLabel = "Maximal Modulation";
        if (activeTdi.length > 0 && activeInducers.length > 0) {
          narrative = `Day ${pt.day}: Collision state: ongoing TDI destruction opposes transcriptional induction; active pool suppressed to ${pt.activePoolPct}%.`;
        } else if (activeTdi.length > 0) {
          narrative = `Day ${pt.day}: Deep TDI nadir (${pt.activePoolPct}%). High victim toxicity hazard. Substrate clearance severely compromised.`;
        } else if (activeInducers.length > 0) {
          narrative = `Day ${pt.day}: Robust transcriptional induction (${pt.activePoolPct}%). Marked acceleration of victim substrate metabolic clearance.`;
        } else {
          narrative = `Day ${pt.day}: Reversible competitive steady state (${pt.activePoolPct}% active capacity).`;
        }
      }
    } else {
      // Post-stop
      const postDays = pt.day - stopDay;
      if (recoveryDay90Pct !== null && pt.day >= recoveryDay90Pct) {
        phase = "full-recovery";
        phaseLabel = "Normalized Equilibrium";
        narrative = `Day ${pt.day} (${postDays}d post-stop): Enzyme pool has returned within physiological bounds (${pt.activePoolPct}%).`;
      } else {
        phase = "offset-recovery";
        phaseLabel = "Offset / Turnover Recovery";
        if (activeTdi.length > 0) {
          narrative = `Day ${pt.day} (${postDays}d post-stop): Drug eliminated, but recovery requires de novo enzyme synthesis (kdeg turnover). Active pool is ${pt.activePoolPct}%.`;
        } else if (activeInducers.length > 0) {
          narrative = `Day ${pt.day} (${postDays}d post-stop): Inducer cleared, but excess enzyme pool is slowly degrading (${pt.activePoolPct}%). Extended 2-3 week washout ongoing.`;
        } else {
          narrative = `Day ${pt.day} (${postDays}d post-stop): Competitive inhibitor eliminated; rapid recovery to ${pt.activePoolPct}%.`;
        }
      }
    }

    // Isoform approximations for visualization
    const isoforms: Record<string, number> = {
      CYP3A4: activeTdi.some((t) => t.targetIsoforms.includes("CYP3A4")) || activeInducers.some((i) => i.inducedIsoforms.includes("CYP3A4"))
        ? pt.activePoolPct
        : 100,
      CYP1A2: activeInducers.some((i) => i.inducedIsoforms.includes("CYP1A2")) || activeCompetitive.some((c) => c.targetIsoforms.includes("CYP1A2"))
        ? pt.activePoolPct
        : 100,
      CYP2C9: activeInducers.some((i) => i.inducedIsoforms.includes("CYP2C9")) || activeCompetitive.some((c) => c.targetIsoforms.includes("CYP2C9"))
        ? pt.activePoolPct
        : 100,
      CYP2B6: activeInducers.some((i) => i.inducedIsoforms.includes("CYP2B6")) ? pt.activePoolPct : 100,
      CYP2D6: activeTdi.some((t) => t.targetIsoforms.includes("CYP2D6")) ? pt.activePoolPct : 100,
    };

    return {
      day: pt.day,
      activePoolPct: pt.activePoolPct,
      totalEnzymeAbundancePct: pt.totalEnzymeAbundancePct,
      competitiveSuppressionPct: pt.competitiveSuppressionPct,
      phase,
      phaseLabel,
      narrative,
      isoforms,
    };
  });

  // Clinical summary and pearls
  let clinicalSummary = "";
  const monitoringPearls: string[] = [];

  if (dominantMechanism === "TDI / Mechanism-Based") {
    clinicalSummary = `Mechanism-based suicidal inactivation drives active CYP capacity down to a nadir of ${nadirPct}% by Day ${dayAtNadir}. Discontinuing the perpetrator at Day ${stopDay} does not immediately restore clearance: functional recovery depends strictly on de novo enzyme synthesis with a ~48-hour half-life, reaching 90% recovery around Day ${recoveryDay90Pct ?? stopDay + 6}.`;
    monitoringPearls.push(
      "Stopping the perpetrator does not restore the enzyme: oral victim substrates (e.g. midazolam, simvastatin) remain at high exposure for 3–5 days post-discontinuation.",
      "Intestinal CYP3A4 regenerates faster (~24–48h) than hepatic CYP3A4 (~48–96h) due to rapid enterocyte turnover.",
      "Monitor victim drug levels and therapeutic indices; consider non-interacting alternative agents.",
    );
  } else if (dominantMechanism === "Nuclear Induction") {
    clinicalSummary = `Transcriptional nuclear induction exhibits a 3–5 day lag phase before driving enzyme capacity to a peak of ${peakPct}% around Day ${dayAtPeak}. Discontinuation at Day ${stopDay} leaves a protracted 2–3 week offset lag while the elevated enzyme pool degrades via normal turnover, returning near baseline around Day ${recoveryDay90Pct ?? stopDay + 14}.`;
    monitoringPearls.push(
      "Inducers take a week to land and two weeks to leave: anticipate delayed onset of therapeutic failure and protracted offset.",
      "Cessation rebound risk: stopping an inducer (e.g. smoking cessation in hospital) removes transcriptional drive while victim doses remain elevated, precipitating toxicity 1–2 weeks later.",
      "Perform serial therapeutic drug monitoring for narrow therapeutic index victims (tacrolimus, warfarin, theophylline, clozapine).",
    );
  } else if (dominantMechanism === "Competitive Reversible") {
    clinicalSummary = `Competitive reversible inhibition rapidly suppresses functional capacity to ${nadirPct}% without destroying the enzyme. Discontinuation at Day ${stopDay} produces rapid offset within 24–48 hours as the drug washes out of plasma.`;
    monitoringPearls.push(
      "Offset strictly parallels perpetrator plasma clearance: once the drug clears systemic circulation, 100% catalytic capacity is immediately available.",
      "Higher substrate concentrations can partially overcome competitive inhibition by shifting the mass-action equilibrium.",
    );
  } else if (dominantMechanism === "Complex Collision") {
    clinicalSummary = `Complex kinetic collision: simultaneous mechanism-based suicidal inactivation and transcriptional nuclear induction produce conflicting kinetic vectors. Active pool nadirs at ${nadirPct}% under TDI destruction, while nuclear induction drives mRNA transcription. Discontinuation creates extreme rebound kinetics.`;
    monitoringPearls.push(
      "Opposing kinetic vectors: ongoing TDI destroys the very enzyme molecules being synthesized by nuclear induction.",
      "High clinical instability: modifying either perpetrator destabilizes victim substrate exposure rapidly.",
      "Intensive monitoring of clinical endpoints and therapeutic drug levels is recommended.",
    );
  }

  return {
    points,
    nadirPct,
    peakPct,
    dayAtNadir,
    dayAtPeak,
    recoveryDay90Pct,
    dominantMechanism,
    activeModulators,
    clinicalSummary,
    monitoringPearls,
    days,
    stopDay,
  };
}

// ---------------------------------------------------------------------------
// Desk Tray Kinetics Detection
// ---------------------------------------------------------------------------

/**
 * Scans active desk tray drug IDs to detect TDI perpetrators, nuclear inducers,
 * competitive inhibitors, and sensitive victim substrates, flagging clinical collisions.
 */
export function detectTdiInductionOnTray(drugIds: string[]): TrayKineticsDetection {
  const normIds = (drugIds || []).map((id) => id.toLowerCase().trim());

  const tdiDrugs = TDI_PERPETRATORS.filter((p) => normIds.includes(p.drugId));
  const inducerDrugs = NUCLEAR_INDUCERS.filter((i) => normIds.includes(i.drugId));
  const competitiveDrugs = COMPETITIVE_INHIBITORS.filter((c) => normIds.includes(c.drugId));
  const victimDrugs = SENSITIVE_VICTIM_SUBSTRATES.filter((v) => normIds.includes(v.drugId));

  const kineticAlerts: KineticAlert[] = [];
  const victimRisks: VictimRisk[] = [];

  // Check for TDI + Inducer opposing collision
  if (tdiDrugs.length > 0 && inducerDrugs.length > 0) {
    const tdiNames = tdiDrugs.map((t) => t.name).join(", ");
    const indNames = inducerDrugs.map((i) => i.name).join(", ");
    kineticAlerts.push({
      id: "opposing-collision",
      severity: "critical",
      title: "Opposing Kinetic Collision: Suicidal TDI + Nuclear Induction",
      mechanism: `Simultaneous suicidal inactivation (${tdiNames}) and transcriptional induction (${indNames}) create conflicting kinetic vectors on cytochrome P450 turnover.`,
      action: "Anticipate erratic victim substrate clearance and extreme rebound kinetics upon discontinuing either agent. Perform intensive clinical monitoring.",
      involvedDrugIds: [...tdiDrugs.map((t) => t.drugId), ...inducerDrugs.map((i) => i.drugId)],
    });
  }

  // Check for TDI + Sensitive Victim
  for (const tdi of tdiDrugs) {
    for (const victim of victimDrugs) {
      if (tdi.highRiskVictimSubstrates.includes(victim.drugId) || tdi.targetIsoforms.some((iso) => victim.primaryCyp.includes(iso))) {
        kineticAlerts.push({
          id: `tdi-victim-${tdi.drugId}-${victim.drugId}`,
          severity: "critical",
          title: `Suicidal TDI Inactivation Collision: ${tdi.name} + ${victim.name}`,
          mechanism: `${tdi.name} irreversibly inactivates ${victim.primaryCyp} via ${tdi.subMechanismLabel}. Active enzyme pool knocked out; recovery requires 3–7 days of de novo synthesis.`,
          action: `Monitor closely for ${victim.toxicityWithTdi}. Account for prolonged inactivation lasting days after stopping ${tdi.name}.`,
          involvedDrugIds: [tdi.drugId, victim.drugId],
        });
        victimRisks.push({
          victimId: victim.drugId,
          victimName: victim.name,
          perpetratorId: tdi.drugId,
          perpetratorName: tdi.name,
          consequence: victim.toxicityWithTdi,
          recommendation: "Evaluate non-interacting therapeutic alternatives or implement intensive clinical monitoring and dose titration.",
        });
      }
    }
  }

  // Check for Inducer + Sensitive Victim
  for (const ind of inducerDrugs) {
    for (const victim of victimDrugs) {
      if (ind.highRiskVictimSubstrates.includes(victim.drugId) || ind.inducedIsoforms.some((iso) => victim.primaryCyp.includes(iso))) {
        kineticAlerts.push({
          id: `inducer-victim-${ind.drugId}-${victim.drugId}`,
          severity: victim.narrowTherapeuticIndex ? "critical" : "warning",
          title: `Transcriptional Induction Collision: ${ind.name} + ${victim.name}`,
          mechanism: `${ind.name} induces ${victim.primaryCyp} transcription via ${ind.receptor} pathway. Delayed onset (3–7 days) and protracted offset (2–3 weeks).`,
          action: `Anticipate ${victim.failureWithInducer}. Perform therapeutic drug monitoring and anticipate protracted 2–3 week washout upon discontinuation.`,
          involvedDrugIds: [ind.drugId, victim.drugId],
        });
        victimRisks.push({
          victimId: victim.drugId,
          victimName: victim.name,
          perpetratorId: ind.drugId,
          perpetratorName: ind.name,
          consequence: victim.failureWithInducer,
          recommendation: "Monitor therapeutic drug concentrations and account for 2–3 week delayed offset lag when discontinuing the inducer.",
        });
      }
    }
  }

  // Check for AhR PAH Cessation Alert
  if (normIds.includes("charred-meat") && victimDrugs.some((v) => v.primaryCyp === "CYP1A2")) {
    const clozapineTheoph = victimDrugs.filter((v) => v.primaryCyp === "CYP1A2");
    kineticAlerts.push({
      id: "pah-cessation-warning",
      severity: "warning",
      title: "AhR Dietary/Combustion PAH Inducer Alert",
      mechanism: "Dietary and combustion polycyclic aromatic hydrocarbons (PAHs) maintain CYP1A2 induction. Sudden cessation causes CYP1A2 activity to drop to baseline over 1–2 weeks.",
      action: `If high PAH exposure ceases, monitor ${clozapineTheoph.map((v) => v.name).join(", ")} plasma levels closely to prevent delayed toxicity and seizures.`,
      involvedDrugIds: ["charred-meat", ...clozapineTheoph.map((v) => v.drugId)],
    });
  }

  const hasCollision = kineticAlerts.length > 0;
  let collisionType: TrayKineticsDetection["collisionType"] = "none";
  if (tdiDrugs.length > 0 && inducerDrugs.length > 0) {
    collisionType = "opposing-tdi-induction";
  } else if (tdiDrugs.length > 0 && victimDrugs.length > 0) {
    collisionType = "tdi-knockout";
  } else if (inducerDrugs.length > 0 && victimDrugs.length > 0) {
    collisionType = "nuclear-induction";
  }

  let summary = "";
  if (!hasCollision && tdiDrugs.length === 0 && inducerDrugs.length === 0 && competitiveDrugs.length === 0) {
    summary = "No CYP time-dependent inhibitors or nuclear inducers detected on active tray.";
  } else if (hasCollision) {
    summary = `${kineticAlerts.length} kinetic collision(s) detected involving ${tdiDrugs.length} TDI perpetrator(s), ${inducerDrugs.length} inducer(s), and ${victimDrugs.length} sensitive victim substrate(s).`;
  } else {
    summary = `Active tray contains ${tdiDrugs.length} TDI perpetrator(s), ${inducerDrugs.length} inducer(s), and ${competitiveDrugs.length} competitive inhibitor(s) without flagged sensitive victim collisions.`;
  }

  return {
    tdiDrugs,
    inducerDrugs,
    competitiveDrugs,
    victimDrugs,
    hasCollision,
    collisionType,
    summary,
    kineticAlerts,
    victimRisks,
  };
}
