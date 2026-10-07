/**
 * Cardiac Electrophysiology & Ion Channel Arrhythmia Mechanism Engine
 * Educational clinical pharmacology and biophysical decision-support database.
 *
 * FD&C Act § 520(o)(1)(E) non-prescriptive regulatory posture:
 * Educational decision support; cites peer-reviewed cardiac electrophysiology and
 * molecular pharmacology literature; provides biophysical mechanics, channel kinetics,
 * and monitored parameters; no patient-specific dosing or prescriptive directives.
 */

import { DRUG_BY_ID } from "./catalog";

export const ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER =
  "FirstPass Cardiac Electrophysiology & Ion Channel Arrhythmia Mechanism Engine is an educational clinical pharmacology and biophysical electrophysiology reference under Section 520(o)(1)(E) of the Federal Food, Drug, and Cosmetic Act (FD&C Act § 520(o)(1)(E)). It provides non-prescriptive educational decision-support describing cardiac action potential kinetics, ion channel conductance, Vaughan Williams antiarrhythmic mechanics, and cellular arrhythmia triggers based on peer-reviewed cardiac electrophysiology literature. It does not provide medical diagnoses, treatment directives, or patient-specific dosing directives. Clinicians must consult full FDA-approved prescribing information and exercise independent clinical judgment.";

export const ELECTROPHYSIOLOGY_CITATIONS: readonly string[] = [
  "Grant AO. Cardiac ion channels. Circulation. 2009;120(11):1005-1012. doi:10.1161/CIRCULATIONAHA.108.788620.",
  "Roden DM. Drug-induced prolongation of the QT interval. N Engl J Med. 2004;350(10):1013-1022. doi:10.1056/NEJMra032426.",
  "Antzelevitch C, Burashnikov A. Overview of basic mechanisms of cardiac arrhythmia. Card Electrophysiol Clin. 2011;3(1):23-45. doi:10.1016/j.ccep.2010.10.012.",
  "Vaughan Williams EM. Classification of antiarrhythmic drugs. In: Sandoe E, Flensted-Jensen E, Olesen KH, eds. Symposium on Cardiac Arrhythmias. AB Astra; 1970:449-472.",
  "Sicouri S, Antzelevitch C. Mechanisms of cellular arrhythmogenesis: early and delayed afterdepolarizations. Pacing Clin Electrophysiol. 2001;24(10):1544-1555.",
  "Nerbonne JM, Kass RS. Molecular physiology of cardiac electrical excitability. Physiol Rev. 2005;85(4):1205-1253. doi:10.1152/physrev.00030.2004.",
  "Goodman & Gilman's: The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023. Chapter 34: Antiarrhythmic Drugs.",
  "Katzung BG, Vanderah TW, eds. Basic & Clinical Pharmacology. 15th ed. McGraw-Hill; 2021. Chapter 14: Agents Used in Cardiac Arrhythmias.",
];

export type ActionPotentialPhaseNumber = 0 | 1 | 2 | 3 | 4;

export type CardiacIon = "Na+" | "Ca2+" | "K+" | "Na+/Ca2+" | "Na+/K+" | "Mixed Cation";

export interface IonFluxVector {
  ion: CardiacIon;
  direction: "inward" | "outward" | "exchanger" | "pump";
  channelOrTransporter: string;
  gene: string;
  biophysicalSummary: string;
}

export interface ActionPotentialPhase {
  phase: ActionPotentialPhaseNumber;
  name: string;
  shortName: string;
  subtitle: string;
  ventricularMechanism: string;
  nodalMechanism: string;
  voltageRangeVentricular: string;
  voltageRangeNodal: string;
  primaryCurrents: string[];
  ionFlux: IonFluxVector[];
  activeDrugClasses: string[];
  ecgCorrelation: string;
  vulnerabilityAndPathology: string;
}

export interface TissueModel {
  id: "ventricular" | "nodal";
  name: string;
  tissueType: string;
  restingPotentialMv: number;
  peakPotentialMv: number;
  thresholdPotentialMv: number;
  actionPotentialDurationMs: number;
  upstrokeVelocityVPerSec: string;
  conductionVelocity: string;
  phase0Driver: string;
  phase4Characteristics: string;
  plateauCharacteristics: string;
  autonomicControl: {
    sympatheticEffect: string;
    parasympatheticEffect: string;
  };
  svgCurvePoints: Array<{ timeMs: number; voltageMv: number; phase: ActionPotentialPhaseNumber }>;
  clinicalSignificance: string;
}

export type IonChannelId =
  | "nav15"
  | "cav12"
  | "herg"
  | "kv71"
  | "kir21"
  | "hcn4"
  | "ncx1"
  | "nakatpase"
  | "ito"
  | "ikach";

export interface PharmacologicBlocker {
  drugId: string;
  drugName: string;
  blockerType: string;
  affinityOrKinetics: string;
  clinicalImpact: string;
}

export interface IonChannelFamily {
  id: IonChannelId;
  name: string;
  gene: string;
  proteinName: string;
  currentName: string;
  conductanceIon: CardiacIon;
  channelClass:
    | "Voltage-Gated Sodium Channel"
    | "L-Type High-Voltage Calcium Channel"
    | "Rapid Delayed Rectifier Potassium Channel"
    | "Slow Delayed Rectifier Potassium Channel"
    | "Inward Rectifier Potassium Channel"
    | "Hyperpolarization-Activated Pacemaker Channel"
    | "Electrogenic Antiporter"
    | "Electrogenic P-Type Ion Pump"
    | "Transient Outward Potassium Channel"
    | "G-Protein Inward Rectifier Potassium Channel";
  fluxDirection: "inward" | "outward" | "bidirectional";
  phasesActive: ActionPotentialPhaseNumber[];
  tissueDistribution: string;
  gatingKinetics: string;
  biophysicalFunction: string;
  pharmacologicBlockers: PharmacologicBlocker[];
  geneticChannelopathy: string;
  arrhythmiaTrigger: string;
}

export type VaughanWilliamsClassId =
  | "IA"
  | "IB"
  | "IC"
  | "II"
  | "III"
  | "IV"
  | "unclassified-digoxin"
  | "unclassified-adenosine"
  | "unclassified-ivabradine";

export interface PrototypeDrug {
  drugId: string;
  drugName: string;
  targetAffinity: string;
  biophysicalMechanism: string;
  ecgChanges: string;
  keySafetyPrecaution: string;
}

export interface VaughanWilliamsClassInfo {
  id: VaughanWilliamsClassId;
  code: string;
  name: string;
  subheading: string;
  primaryTarget: string;
  channelKinetics: string;
  dissociationTimeTau: string;
  useDependenceProfile:
    | "Intermediate Use-Dependence"
    | "Rapid Recovery / State-Dependent (Depolarized Tissue)"
    | "Marked Use-Dependence (Tachycardia Aggravation)"
    | "Rate-Blunting / Autonomic Modulation"
    | "Reverse Use-Dependence (Bradycardia Aggravation)"
    | "Frequency-Dependent Nodal Suppression"
    | "State-Independent / Transporter-Coupled";
  conductionVelocityEffect: string;
  refractoryPeriodEffect: string;
  ecgFootprint: {
    prInterval: string;
    qrsDuration: string;
    qtInterval: string;
    morphologyPattern: string;
  };
  prototypeDrugs: PrototypeDrug[];
  electrophysiologicalMechanisms: string;
  proarrhythmicRisks: string[];
  clinicalMonitoredParameters: string[];
}

export interface ArrhythmiaMechanism {
  id: "ead" | "dad" | "use-dependence" | "reverse-use-dependence";
  title: string;
  category: "afterdepolarization" | "gating-kinetics";
  phaseLocus: string;
  triggerEvent: string;
  biophysicalCurrents: string;
  ecgFootprint: string;
  cellularPhysiology: string;
  aggravatingFactors: string[];
  protectiveOrCounterMechanisms: string[];
  prototypeAssociatedDrugs: Array<{ drugId: string; drugName: string; role: string }>;
}

export interface ArrhythmiaCollision {
  id: string;
  title: string;
  severity: "critical" | "high" | "moderate";
  category:
    | "qt-ead-collision"
    | "qrs-conduction-collision"
    | "av-block-collision"
    | "dad-calcium-collision"
    | "reverse-use-dependence-collision";
  drugIds: string[];
  involvedDrugs: Array<{ id: string; name: string; role: string }>;
  primaryMechanism: string;
  electrophysiologicalRisk: string;
  ecgMarkers: string;
  clinicalSurveillance: string;
  biophysicalExplanation: string;
}

export interface CardiacDrugElectrophysiologyProfile {
  drugId: string;
  drugName: string;
  vaughanWilliamsClass: VaughanWilliamsClassId | "none";
  primaryChannelsBlocked: IonChannelId[];
  ikRBlocker: boolean;
  nav15Blocker: boolean;
  cav12Blocker: boolean;
  nodalConductionSlowing: boolean;
  ecgImpact: {
    prChange: "prolonged" | "unchanged" | "shortened";
    qrsChange: "widened" | "unchanged";
    qtChange: "prolonged" | "unchanged" | "shortened";
  };
  arrhythmiaRiskProfile: string;
}

// ============================================================================
// 1. ACTION POTENTIAL PHASES
// ============================================================================

export const ACTION_POTENTIAL_PHASES: readonly ActionPotentialPhase[] = [
  {
    phase: 0,
    name: "Phase 0 (Rapid Upstroke Depolarization)",
    shortName: "Phase 0 Upstroke",
    subtitle: "Rapid INa Influx (Ventricular) vs Slow ICa,L Influx (Nodal)",
    ventricularMechanism:
      "Rapid opening of voltage-gated Nav1.5 sodium channels when membrane depolarizes to threshold (~-65 mV). Enormous inward INa current drives steep upstroke with dV/dt max exceeding 200-400 V/s, depolarizing myocyte to +30 mV within 1-2 ms. Dictates conduction velocity and QRS complex duration.",
    nodalMechanism:
      "SA and AV nodal cells lack functional Nav1.5 fast sodium channels. Phase 0 upstroke is driven exclusively by slower inward L-type calcium current (ICa,L through Cav1.2) activating at threshold ~-40 mV. dV/dt max is slow (1-10 V/s), creating physiological conduction delay across the AV node.",
    voltageRangeVentricular: "-90 mV to +30 mV",
    voltageRangeNodal: "-40 mV to +10 mV",
    primaryCurrents: ["INa (Nav1.5 / SCN5A)", "ICa,L (Cav1.2 / CACNA1C)"],
    ionFlux: [
      {
        ion: "Na+",
        direction: "inward",
        channelOrTransporter: "Nav1.5",
        gene: "SCN5A",
        biophysicalSummary: "Massive inward Na+ flux drives rapid depolarization in working myocardium.",
      },
      {
        ion: "Ca2+",
        direction: "inward",
        channelOrTransporter: "Cav1.2",
        gene: "CACNA1C",
        biophysicalSummary: "Primary depolarizing current driving Phase 0 upstroke in SA and AV nodal pacemakers.",
      },
    ],
    activeDrugClasses: ["Class IA", "Class IB", "Class IC", "Class IV (nodal)"],
    ecgCorrelation: "QRS complex upstroke/deflection (ventricular); PR segment conduction transit (AV nodal delay).",
    vulnerabilityAndPathology:
      "Blockade of Nav1.5 slows conduction velocity, widening the QRS complex. Excessive slowing promotes unidirectional block and circus re-entry (CAST trial mechanism). Loss-of-function mutations cause Brugada syndrome.",
  },
  {
    phase: 1,
    name: "Phase 1 (Transient Early Repolarization)",
    shortName: "Phase 1 Notch",
    subtitle: "Inward INa Inactivation & Outward Ito Activation",
    ventricularMechanism:
      "Rapid inactivation of voltage-gated Nav1.5 channels coincides with brief activation of transient outward potassium current (Ito, encoded by Kv4.3 / KCND3). This creates a prominent 'notch' or early repolarization dipping potential back down toward +10 mV to set the plateau level.",
    nodalMechanism: "Rudimentary or absent in SA and AV nodal pacemaker tissue due to low Ito expression.",
    voltageRangeVentricular: "+30 mV down to +10 mV",
    voltageRangeNodal: "N/A (indistinct in nodal tissue)",
    primaryCurrents: ["Ito (Kv4.3 / KCND3)", "INa inactivation gates"],
    ionFlux: [
      {
        ion: "K+",
        direction: "outward",
        channelOrTransporter: "Kv4.3 (Ito)",
        gene: "KCND3",
        biophysicalSummary: "Transient outward K+ current terminates upstroke overshoot and carves the Phase 1 notch.",
      },
    ],
    activeDrugClasses: ["Class IA (mild Ito modulation)", "Investigational Ito blockers"],
    ecgCorrelation: "Terminal J-point and junction of QRS complex with ST segment.",
    vulnerabilityAndPathology:
      "Prominent Ito in ventricular epicardium vs endocardium creates transmural voltage gradients. Exaggerated Phase 1 notch can lead to Phase 2 re-entry and Brugada pattern ST elevation.",
  },
  {
    phase: 2,
    name: "Phase 2 (Plateau Phase)",
    shortName: "Phase 2 Plateau",
    subtitle: "Inward ICa,L vs Outward Delayed Rectifiers (IKr / IKs)",
    ventricularMechanism:
      "Delicate biophysical balance between inward depolarizing L-type calcium current (ICa,L via Cav1.2) and outward repolarizing delayed rectifier potassium currents (IKr, IKs). Membrane potential remains stable near 0 mV for 200-300 ms, sustaining calcium influx to trigger calcium-induced calcium release (CICR) from sarcoplasmic reticulum via RyR2 for excitation-contraction coupling.",
    nodalMechanism:
      "Brief and poorly delineated in nodal cells; the slower Phase 0 transitions rapidly into repolarization without a sustained plateau.",
    voltageRangeVentricular: "+10 mV to -10 mV (hovers near 0 mV)",
    voltageRangeNodal: "+10 mV to 0 mV (brief)",
    primaryCurrents: ["ICa,L (Cav1.2 / CACNA1C)", "IKr (hERG / KCNH2)", "IKs (Kv7.1 / KCNQ1)", "NCX1 (forward mode)"],
    ionFlux: [
      {
        ion: "Ca2+",
        direction: "inward",
        channelOrTransporter: "Cav1.2",
        gene: "CACNA1C",
        biophysicalSummary: "Inward Ca2+ current sustains plateau potential and triggers intracellular CICR.",
      },
      {
        ion: "K+",
        direction: "outward",
        channelOrTransporter: "hERG (IKr) & Kv7.1 (IKs)",
        gene: "KCNH2 / KCNQ1",
        biophysicalSummary: "Delayed rectifier currents activate progressively to counterbalance inward Ca2+.",
      },
    ],
    activeDrugClasses: ["Class IV (Non-DHP CCBs)", "Class II (Beta-blockers blunting PKA-ICa,L)", "Class III (initiates here)"],
    ecgCorrelation: "ST segment (isoelectric baseline on surface ECG).",
    vulnerabilityAndPathology:
      "Excessive prolongation of Phase 2 permits reactivation of L-type Ca2+ channels ('window current'), generating Phase 2 Early Afterdepolarizations (EADs) that trigger Torsades de Pointes.",
  },
  {
    phase: 3,
    name: "Phase 3 (Rapid Repolarization)",
    shortName: "Phase 3 Repolarization",
    subtitle: "Outward Rapid (IKr / hERG) & Slow (IKs) Delayed Rectifier Inactivation",
    ventricularMechanism:
      "Inward ICa,L channels inactivate while outward delayed rectifier potassium currents predominate. Rapid delayed rectifier (IKr through hERG / KCNH2) and slow delayed rectifier (IKs through Kv7.1 / KCNQ1) conduct outward K+ ions, rapidly pulling membrane potential back toward negative resting baseline (-90 mV).",
    nodalMechanism:
      "Cav1.2 calcium channels inactivate, and outward delayed rectifier K+ currents repolarize the nodal pacemaker cell back to its maximal diastolic potential (MDP, approx -60 mV).",
    voltageRangeVentricular: "-10 mV down to -90 mV",
    voltageRangeNodal: "0 mV down to -60 mV",
    primaryCurrents: ["IKr (hERG / Kv11.1 / KCNH2)", "IKs (Kv7.1 / KCNQ1)", "IK1 (Kir2.1 / KCNJ2, late Phase 3)"],
    ionFlux: [
      {
        ion: "K+",
        direction: "outward",
        channelOrTransporter: "hERG (IKr)",
        gene: "KCNH2",
        biophysicalSummary: "Primary outward current driving rapid ventricular repolarization; target of QT prolonging drugs.",
      },
      {
        ion: "K+",
        direction: "outward",
        channelOrTransporter: "Kv7.1 / MinK (IKs)",
        gene: "KCNQ1 / KCNE1",
        biophysicalSummary: "Slow outward current providing repolarization reserve during adrenergic stress.",
      },
    ],
    activeDrugClasses: ["Class III (IKr / hERG blockers)", "Class IA (moderate hERG block)"],
    ecgCorrelation: "T wave inscription and T-wave peak-to-end interval (surface ECG).",
    vulnerabilityAndPathology:
      "Pharmacologic block of hERG / IKr delays Phase 3 repolarization, manifesting as QT prolongation. During delayed Phase 3, Cav1.2 or forward NCX reactivation generates Phase 3 Early Afterdepolarizations (EADs), the primary trigger for Torsades de Pointes.",
  },
  {
    phase: 4,
    name: "Phase 4 (Resting Potential & Pacemaker Diastolic Depolarization)",
    shortName: "Phase 4 Resting / Pacemaker",
    subtitle: "Stable IK1 Resting Potential (Ventricular) vs Spontaneous Automaticity (Nodal)",
    ventricularMechanism:
      "Working myocardium maintains a true stable resting potential (-90 mV) dominated by strong outward conductance through inward rectifier potassium channels (IK1 via Kir2.1 / KCNJ2) and electrogenic Na+/K+ ATPase pump (3 Na+ out / 2 K+ in). The cell displays zero automaticity under physiological conditions.",
    nodalMechanism:
      "SA and AV nodal pacemakers lack significant IK1 and possess no stable resting potential. After reaching maximal diastolic potential (-60 mV), spontaneous diastolic depolarization occurs. Driven by: 1) 'funny' inward hyperpolarization-activated pacemaker current (If through HCN4), 2) decay of outward K+ currents, 3) inward Ca2+ clock (spontaneous diastolic SR Ca2+ release extruded by forward NCX1), and 4) inward T-type and L-type Ca2+ currents bringing membrane to firing threshold (-40 mV).",
    voltageRangeVentricular: "Stable at -90 mV",
    voltageRangeNodal: "Spontaneous upward drift from -60 mV to -40 mV",
    primaryCurrents: [
      "IK1 (Kir2.1 / KCNJ2, ventricular resting)",
      "If (HCN4, nodal pacemaker)",
      "Na+/K+ ATPase (ATP1A1)",
      "NCX1 (SLC8A1)",
      "IK,ACh (Kir3.1/3.4, vagal brake)",
    ],
    ionFlux: [
      {
        ion: "K+",
        direction: "outward",
        channelOrTransporter: "Kir2.1 (IK1)",
        gene: "KCNJ2",
        biophysicalSummary: "Clamps ventricular resting potential close to potassium equilibrium potential (-90 mV).",
      },
      {
        ion: "Mixed Cation",
        direction: "inward",
        channelOrTransporter: "HCN4 (If)",
        gene: "HCN4",
        biophysicalSummary: "Hyperpolarization-activated inward Na+/K+ current driving pacemaker diastolic depolarization.",
      },
      {
        ion: "Na+/K+",
        direction: "pump",
        channelOrTransporter: "Na+/K+ ATPase",
        gene: "ATP1A1",
        biophysicalSummary: "Extrudes 3 Na+ in exchange for 2 K+, generating net electrogenic outward current and ionic gradients.",
      },
      {
        ion: "Na+/Ca2+",
        direction: "exchanger",
        channelOrTransporter: "NCX1",
        gene: "SLC8A1",
        biophysicalSummary: "Extrudes 1 Ca2+ for 3 Na+ in forward mode, generating transient inward depolarizing current (Iti).",
      },
    ],
    activeDrugClasses: [
      "Class II (Beta-blockers - flattens nodal slope)",
      "Class IV (Non-DHP CCBs - blunts nodal threshold)",
      "Unclassified: Digoxin (Na+/K+ ATPase inhibitor)",
      "Unclassified: Ivabradine (HCN4 / If blocker)",
      "Unclassified: Adenosine (opens IK,ACh)",
    ],
    ecgCorrelation: "T-P interval (electrical diastole on surface ECG).",
    vulnerabilityAndPathology:
      "Intracellular Ca2+ overload (e.g. digitalis toxicity) causes spontaneous diastolic SR Ca2+ release, activating forward NCX1 (Iti) and producing Delayed Afterdepolarizations (DADs). In nodal tissue, excessive autonomic suppression causes sinus arrest or high-grade AV block.",
  },
];

// ============================================================================
// 2. TISSUE MODELS
// ============================================================================

export const TISSUE_MODELS: Record<"ventricular" | "nodal", TissueModel> = {
  ventricular: {
    id: "ventricular",
    name: "Ventricular Action Potential (Fast-Response Myocardium)",
    tissueType: "Ventricular myocytes, Atrial myocardium, Purkinje conduction fibers",
    restingPotentialMv: -90,
    peakPotentialMv: 30,
    thresholdPotentialMv: -65,
    actionPotentialDurationMs: 320,
    upstrokeVelocityVPerSec: "> 200 - 400 V/s (Nav1.5 fast sodium channels)",
    conductionVelocity: "0.5 - 1.0 m/s (myocardium) / 2.0 - 4.0 m/s (Purkinje fibers)",
    phase0Driver: "Rapid inward sodium current (INa via Nav1.5)",
    phase4Characteristics: "True stable resting membrane potential clamped at -90 mV by dominant IK1.",
    plateauCharacteristics: "Prolonged Phase 2 plateau (~200-300 ms) hovering around 0 mV, sustaining Ca2+ influx for excitation-contraction coupling.",
    autonomicControl: {
      sympatheticEffect:
        "Beta-1 / Gs activation increases cAMP and PKA phosphorylation, enhancing Cav1.2 (inotropic boost) and IKs (accelerates repolarization to prevent APD prolongation at high heart rates).",
      parasympatheticEffect:
        "Minimal direct inotropic effect on ventricular myocardium due to sparse vagal innervation, though dampens sympathetic tone via Gi.",
    },
    svgCurvePoints: [
      { timeMs: 0, voltageMv: -90, phase: 4 },
      { timeMs: 20, voltageMv: -90, phase: 4 },
      { timeMs: 25, voltageMv: 30, phase: 0 },
      { timeMs: 40, voltageMv: 10, phase: 1 },
      { timeMs: 120, voltageMv: 5, phase: 2 },
      { timeMs: 220, voltageMv: 0, phase: 2 },
      { timeMs: 260, voltageMv: -30, phase: 3 },
      { timeMs: 300, voltageMv: -75, phase: 3 },
      { timeMs: 320, voltageMv: -90, phase: 3 },
      { timeMs: 400, voltageMv: -90, phase: 4 },
    ],
    clinicalSignificance:
      "Vulnerable to re-entrant arrhythmias from Nav1.5 conduction slowing (CAST trial), Early Afterdepolarizations from IKr blockade (Torsades de Pointes), and Delayed Afterdepolarizations from calcium overload.",
  },
  nodal: {
    id: "nodal",
    name: "Nodal Action Potential (SA Node & AV Node Slow-Response Pacemakers)",
    tissueType: "Sinoatrial (SA) Node, Atrioventricular (AV) Node",
    restingPotentialMv: -60,
    peakPotentialMv: 10,
    thresholdPotentialMv: -40,
    actionPotentialDurationMs: 200,
    upstrokeVelocityVPerSec: "1 - 10 V/s (Cav1.2 L-type calcium channels, no fast INa)",
    conductionVelocity: "0.05 m/s (slow AV nodal conduction provides essential physiological delay for ventricular filling)",
    phase0Driver: "Slow inward calcium current (ICa,L via Cav1.2)",
    phase4Characteristics: "Unstable maximal diastolic potential (-60 mV) with continuous spontaneous pacemaker depolarization (If + Ca2+ clock).",
    plateauCharacteristics: "Rudimentary or absent plateau; upstroke transitions promptly into Phase 3 repolarization.",
    autonomicControl: {
      sympatheticEffect:
        "Beta-1 / Gs increases cAMP -> directly shifts HCN4 If activation to less negative voltages and enhances Cav1.2 -> steepens Phase 4 pacemaker slope -> increases heart rate (positive chronotropy) and speeds AV conduction (positive dromotropy).",
      parasympatheticEffect:
        "M2 / Gi inhibits adenylyl cyclase (lowering cAMP) while Gbeta-gamma subunits directly open IK,ACh (GIRK) potassium channels -> hyperpolarizes maximal diastolic potential and flattens Phase 4 slope -> slows heart rate (negative chronotropy) and delays AV conduction.",
    },
    svgCurvePoints: [
      { timeMs: 0, voltageMv: -60, phase: 4 },
      { timeMs: 80, voltageMv: -52, phase: 4 },
      { timeMs: 160, voltageMv: -40, phase: 4 },
      { timeMs: 200, voltageMv: 10, phase: 0 },
      { timeMs: 220, voltageMv: 5, phase: 2 },
      { timeMs: 270, voltageMv: -35, phase: 3 },
      { timeMs: 310, voltageMv: -60, phase: 3 },
      { timeMs: 360, voltageMv: -55, phase: 4 },
      { timeMs: 400, voltageMv: -48, phase: 4 },
    ],
    clinicalSignificance:
      "Vulnerable to severe bradycardia, sinus arrest, or complete heart block when challenged with combinations of Class II (beta-blockers), Class IV (non-DHP CCBs), or cardiac glycosides.",
  },
};

// ============================================================================
// 3. ION CHANNEL FAMILIES
// ============================================================================

export const ION_CHANNEL_FAMILIES: readonly IonChannelFamily[] = [
  {
    id: "nav15",
    name: "Nav1.5 (Cardiac Voltage-Gated Sodium Channel)",
    gene: "SCN5A",
    proteinName: "Sodium Voltage-Gated Channel Alpha Subunit 5",
    currentName: "INa (Fast inward sodium current)",
    conductanceIon: "Na+",
    channelClass: "Voltage-Gated Sodium Channel",
    fluxDirection: "inward",
    phasesActive: [0],
    tissueDistribution: "Atrial and ventricular myocytes, Purkinje conduction system (absent in SA/AV nodal centers).",
    gatingKinetics: "Extremely rapid activation (<1 ms) followed by rapid inactivation within 2-3 ms.",
    biophysicalFunction:
      "Drives Phase 0 rapid depolarization upstroke. Dictates maximum rate of voltage rise (dV/dt max) and myocardial conduction velocity. Governs QRS complex duration on surface ECG.",
    pharmacologicBlockers: [
      {
        drugId: "flecainide",
        drugName: "Flecainide",
        blockerType: "Class IC (Potent Nav1.5 blocker)",
        affinityOrKinetics: "Very slow dissociation kinetics (tau > 10-20 s); marked use-dependence.",
        clinicalImpact: "Marked QRS widening without QT change; increased mortality in structural heart disease (CAST trial).",
      },
      {
        drugId: "propafenone",
        drugName: "Propafenone",
        blockerType: "Class IC (Nav1.5 blocker + weak beta-blocker)",
        affinityOrKinetics: "Slow dissociation kinetics; pronounced use-dependence.",
        clinicalImpact: "QRS widening, PR prolongation; potential conversion of AF to atrial flutter with 1:1 conduction.",
      },
      {
        drugId: "quinidine",
        drugName: "Quinidine",
        blockerType: "Class IA (Nav1.5 blocker + hERG blocker)",
        affinityOrKinetics: "Intermediate dissociation kinetics (tau 1-5 s).",
        clinicalImpact: "Moderate QRS widening combined with QT prolongation; proarrhythmic EAD/TdP risk.",
      },
      {
        drugId: "procainamide",
        drugName: "Procainamide",
        blockerType: "Class IA (Nav1.5 blocker + NAPA active metabolite)",
        affinityOrKinetics: "Intermediate dissociation kinetics.",
        clinicalImpact: "Slows ventricular conduction; NAPA metabolite exhibits pure Class III IKr block.",
      },
      {
        drugId: "lidocaine",
        drugName: "Lidocaine",
        blockerType: "Class IB (Nav1.5 blocker, state-dependent)",
        affinityOrKinetics: "Rapid dissociation kinetics (tau < 0.5 s); selectively binds inactivated channels.",
        clinicalImpact: "Preferentially blocks depolarized ischemic ventricular myocardium; minimal QRS change at normal rates.",
      },
      {
        drugId: "mexiletine",
        drugName: "Mexiletine",
        blockerType: "Class IB (Oral Nav1.5 blocker)",
        affinityOrKinetics: "Rapid dissociation kinetics; shortens action potential duration.",
        clinicalImpact: "Suppresses ventricular ectopy in ischemic myocardium; also used in congenital LQT3.",
      },
    ],
    geneticChannelopathy:
      "Brugada Syndrome (loss-of-function SCN5A mutations); Long QT Syndrome Type 3 (LQT3, gain-of-function / failure of complete inactivation generating late INa).",
    arrhythmiaTrigger:
      "Excessive pharmacologic block slows conduction velocity, widening QRS and creating substrate for circus re-entry. Incomplete inactivation (late INa) prolongs APD and promotes EADs.",
  },
  {
    id: "cav12",
    name: "Cav1.2 (L-Type Voltage-Gated Calcium Channel)",
    gene: "CACNA1C",
    proteinName: "Calcium Voltage-Gated Channel Subunit Alpha1 C",
    currentName: "ICa,L (Long-lasting inward calcium current)",
    conductanceIon: "Ca2+",
    channelClass: "L-Type High-Voltage Calcium Channel",
    fluxDirection: "inward",
    phasesActive: [0, 2, 4],
    tissueDistribution: "Ubiquitous in myocardium: SA node, AV node, atrial and ventricular myocytes.",
    gatingKinetics: "Activates at ~ -40 mV; slow voltage-dependent and Ca2+-dependent inactivation.",
    biophysicalFunction:
      "Drives Phase 0 upstroke in SA and AV nodes; sustains Phase 2 plateau in ventricular myocytes; provides trigger Ca2+ for sarcoplasmic reticulum CICR; determines AV nodal conduction delay (PR interval).",
    pharmacologicBlockers: [
      {
        drugId: "verapamil",
        drugName: "Verapamil",
        blockerType: "Class IV (Non-DHP Phenylalkylamine CCB)",
        affinityOrKinetics: "High affinity for open/inactivated Cav1.2; frequency-dependent block.",
        clinicalImpact: "Marked AV nodal conduction delay (PR prolongation), negative inotropy, rate control in SVT/AF.",
      },
      {
        drugId: "diltiazem",
        drugName: "Diltiazem",
        blockerType: "Class IV (Non-DHP Benzothiazepine CCB)",
        affinityOrKinetics: "Intermediate frequency-dependent Cav1.2 block.",
        clinicalImpact: "Slows AV node conduction, blunts ventricular response in AF/AFlutter, negative inotropy.",
      },
    ],
    geneticChannelopathy: "Timothy Syndrome (CACNA1C gain-of-function causing marked QT prolongation and syndactyly).",
    arrhythmiaTrigger:
      "Reactivation of Cav1.2 during prolonged Phase 2/3 plateau ('window current') is the primary biophysical engine generating Early Afterdepolarizations (EADs) and polymorphic VT.",
  },
  {
    id: "herg",
    name: "hERG / Kv11.1 (Rapid Delayed Rectifier Potassium Channel)",
    gene: "KCNH2",
    proteinName: "Potassium Voltage-Gated Channel Subfamily H Member 2",
    currentName: "IKr (Rapid delayed rectifier potassium current)",
    conductanceIon: "K+",
    channelClass: "Rapid Delayed Rectifier Potassium Channel",
    fluxDirection: "outward",
    phasesActive: [2, 3],
    tissueDistribution: "Ventricular and atrial myocytes, Purkinje conduction fibers.",
    gatingKinetics:
      "Unusual kinetics: rapid C-type inactivation during depolarization, followed by very rapid recovery from inactivation upon repolarization, producing a large outward current peak during Phase 3.",
    biophysicalFunction:
      "Primary outward current driving Phase 3 rapid repolarization of the cardiac action potential. Its spacious central pore cavity with aromatic residues (Tyr652, Phe656) makes it uniquely vulnerable to unintended pharmacologic blockade by structurally diverse drug molecules.",
    pharmacologicBlockers: [
      {
        drugId: "sotalol",
        drugName: "Sotalol",
        blockerType: "Class III (IKr blocker + non-selective beta-blocker)",
        affinityOrKinetics: "Direct hERG pore blocker; exhibits prominent reverse use-dependence.",
        clinicalImpact: "Marked QT prolongation; excessive risk of TdP during bradycardia or hypokalemia.",
      },
      {
        drugId: "dofetilide",
        drugName: "Dofetilide",
        blockerType: "Class III (Pure selective IKr blocker)",
        affinityOrKinetics: "High-affinity hERG blocker; strong reverse use-dependence.",
        clinicalImpact: "Dose-dependent QT prolongation; requires continuous inpatient telemetry initiation.",
      },
      {
        drugId: "amiodarone",
        drugName: "Amiodarone",
        blockerType: "Class III (Multi-channel blocker: IKr, Nav1.5, Cav1.2, Beta-adrenergic)",
        affinityOrKinetics: "Complex multi-channel inhibition; accumulates in lipids over weeks.",
        clinicalImpact: "Prolongs QT marked, but lower TdP incidence (~1%) because concomitant Cav1.2 block suppresses EADs.",
      },
      {
        drugId: "ibutilide",
        drugName: "Ibutilide",
        blockerType: "Class III (IKr blocker + slow inward Na+ current promoter)",
        affinityOrKinetics: "Rapid-acting IV formulation.",
        clinicalImpact: "Used for acute chemical cardioversion of AF/flutter; substantial TdP risk requiring 4h ECG monitoring.",
      },
      {
        drugId: "ondansetron",
        drugName: "Ondansetron",
        blockerType: "Non-cardiac off-target hERG blocker (5-HT3 antagonist)",
        affinityOrKinetics: "Concentration-dependent hERG channel block.",
        clinicalImpact: "Additive QT prolongation when combined with antiarrhythmics or psychotropics.",
      },
      {
        drugId: "citalopram",
        drugName: "Citalopram",
        blockerType: "Non-cardiac off-target hERG blocker (SSRI)",
        affinityOrKinetics: "Dose-dependent hERG inhibition (FDA warning capped at 20-40 mg).",
        clinicalImpact: "Prolongs QTc; dangerous collision when combined with Class III antiarrhythmics.",
      },
      {
        drugId: "haloperidol",
        drugName: "Haloperidol",
        blockerType: "Non-cardiac off-target hERG blocker (Antipsychotic)",
        affinityOrKinetics: "Potent hERG blocker, especially via IV route.",
        clinicalImpact: "High risk of QTc prolongation and Torsades de Pointes, particularly in ICU settings.",
      },
    ],
    geneticChannelopathy: "Congenital Long QT Syndrome Type 2 (LQT2, often triggered by auditory stimuli or emotional arousal).",
    arrhythmiaTrigger:
      "Blockade of IKr impairs repolarization reserve, lengthening action potential duration (prolonged QT interval) and permitting Phase 2/3 Early Afterdepolarizations (EADs) leading to Torsades de Pointes.",
  },
  {
    id: "kv71",
    name: "Kv7.1 / MinK (Slow Delayed Rectifier Potassium Channel)",
    gene: "KCNQ1 / KCNE1",
    proteinName: "Potassium Voltage-Gated Channel Subfamily Q Member 1 + KCNE1 Ancillary Subunit",
    currentName: "IKs (Slow delayed rectifier potassium current)",
    conductanceIon: "K+",
    channelClass: "Slow Delayed Rectifier Potassium Channel",
    fluxDirection: "outward",
    phasesActive: [2, 3],
    tissueDistribution: "Ventricular and atrial myocardium.",
    gatingKinetics: "Slow activation upon depolarization; accumulates open state during rapid heart rates.",
    biophysicalFunction:
      "Provides cardiac 'repolarization reserve'. Strongly upregulated by sympathetic adrenergic stimulation (cAMP / PKA phosphorylation of KCNQ1), accelerating repolarization to preserve diastolic filling time during exercise or tachycardia.",
    pharmacologicBlockers: [
      {
        drugId: "amiodarone",
        drugName: "Amiodarone",
        blockerType: "Class III (also blunts IKs)",
        affinityOrKinetics: "Inhibits IKs along with IKr after chronic administration.",
        clinicalImpact: "Contributes to profound lengthening of ventricular refractoriness.",
      },
    ],
    geneticChannelopathy:
      "Congenital Long QT Syndrome Type 1 (LQT1, classical exertional / swimming arrhythmia triggers due to failed IKs adrenergic response); Jervell and Lange-Nielsen Syndrome (bilateral sensorineural deafness + LQT).",
    arrhythmiaTrigger:
      "Loss of IKs impairs repolarization reserve during tachycardia or adrenergic stress, causing stress-induced EADs and polymorphic ventricular tachycardia.",
  },
  {
    id: "kir21",
    name: "Kir2.1 (Inward Rectifier Potassium Channel)",
    gene: "KCNJ2",
    proteinName: "Potassium Inwardly Rectifying Channel Subfamily J Member 2",
    currentName: "IK1 (Inward rectifier potassium current)",
    conductanceIon: "K+",
    channelClass: "Inward Rectifier Potassium Channel",
    fluxDirection: "outward",
    phasesActive: [3, 4],
    tissueDistribution: "Ventricular and atrial working myocytes, Purkinje fibers (virtually absent in SA/AV nodal tissue).",
    gatingKinetics:
      "Strong inward rectification: conducts outward K+ current only at negative potentials near EK (-90 mV); completely blocked by intracellular polyamines and Mg2+ during depolarization (Phases 1-2), preventing outward K+ leak during plateau.",
    biophysicalFunction:
      "Clamps ventricular resting membrane potential strictly at -90 mV and terminates Phase 3 repolarization. Prevents spontaneous automaticity in working ventricular myocardium.",
    pharmacologicBlockers: [
      {
        drugId: "quinidine",
        drugName: "Quinidine",
        blockerType: "Class IA (non-specific block at high concentrations)",
        affinityOrKinetics: "Weak Kir2.1 blockade.",
        clinicalImpact: "Depolarizes resting potential slightly, promoting abnormal automaticity.",
      },
    ],
    geneticChannelopathy:
      "Andersen-Tawil Syndrome (LQT7, loss-of-function KCNJ2 causing ventricular arrhythmias, periodic paralysis, and dysmorphic features); Short QT Syndrome Type 3 (gain-of-function).",
    arrhythmiaTrigger:
      "Downregulation of IK1 (common in heart failure) depolarizes resting potential, inactivates Nav1.5 channels, and unmasks latent ventricular automaticity.",
  },
  {
    id: "hcn4",
    name: "HCN4 (Hyperpolarization-Activated Cyclic Nucleotide-Gated Channel 4)",
    gene: "HCN4",
    proteinName: "Hyperpolarization Activated Cyclic Nucleotide Gated Potassium Channel 4",
    currentName: "If ('Funny' pacemaker inward current)",
    conductanceIon: "Mixed Cation",
    channelClass: "Hyperpolarization-Activated Pacemaker Channel",
    fluxDirection: "inward",
    phasesActive: [4],
    tissueDistribution: "Sinoatrial node (predominant), Atrioventricular node, Purkinje conduction fibers.",
    gatingKinetics:
      "Activated by hyperpolarization (MDP more negative than -50 mV). Direct cyclic nucleotide (cAMP) binding to the C-terminal CNBD shifts the activation voltage curve to less negative potentials.",
    biophysicalFunction:
      "Carries mixed inward Na+/K+ current (net inward depolarizing) during diastole. Primary driver of Phase 4 spontaneous diastolic depolarization in the SA node. Modulated by autonomic tone.",
    pharmacologicBlockers: [
      {
        drugId: "ivabradine",
        drugName: "Ivabradine",
        blockerType: "Selective HCN4 / If Channel Blocker",
        affinityOrKinetics: "Enters and blocks HCN channel pore from the intracellular side when open; use-dependent.",
        clinicalImpact: "Pure heart rate reduction without myocardial Cav1.2 blockade; preserves contractility, blood pressure, and ventricular repolarization.",
      },
    ],
    geneticChannelopathy: "Congenital Sick Sinus Syndrome, familial sinus bradycardia, and sinus node dysfunction.",
    arrhythmiaTrigger:
      "Excessive If inhibition causes severe sinus bradycardia; overexpression in hypertrophied ventricles creates ectopic pacemaker foci.",
  },
  {
    id: "ncx1",
    name: "NCX1 (Sodium-Calcium Exchanger 1)",
    gene: "SLC8A1",
    proteinName: "Solute Carrier Family 8 Member A1",
    currentName: "INCX (Sodium-calcium exchange current / Iti)",
    conductanceIon: "Na+/Ca2+",
    channelClass: "Electrogenic Antiporter",
    fluxDirection: "bidirectional",
    phasesActive: [2, 4],
    tissueDistribution: "Sarcolemma of all cardiac myocytes.",
    gatingKinetics: "Reversible electrogenic exchanger dependent on transmembrane Na+ and Ca2+ electrochemical gradients and membrane voltage.",
    biophysicalFunction:
      "Forward mode (3 Na+ in : 1 Ca2+ out) extrudes cytoplasmic Ca2+ during diastole, producing a net inward depolarizing current (+1 charge). Reverse mode (3 Na+ out : 1 Ca2+ in) can occur during Phase 0 upstroke or when intracellular Na+ rises.",
    pharmacologicBlockers: [
      {
        drugId: "digoxin",
        drugName: "Digoxin",
        blockerType: "Indirect NCX1 modulator via Na+/K+ ATPase inhibition",
        affinityOrKinetics: "Raises intracellular [Na+], blunting forward NCX1 and promoting reverse NCX1.",
        clinicalImpact: "Increases SR Ca2+ load, enhancing contractility but predisposing to spontaneous diastolic Ca2+ release and DADs.",
      },
    ],
    geneticChannelopathy: "Arrhythmogenic cardiomyopathy and heart failure remodeling.",
    arrhythmiaTrigger:
      "When sarcoplasmic reticulum is overloaded with Ca2+, spontaneous diastolic RyR2 Ca2+ leak activates forward NCX1. Forward extrusion generates the transient inward current (Iti), triggering Delayed Afterdepolarizations (DADs).",
  },
  {
    id: "nakatpase",
    name: "Na+/K+ ATPase (Sodium-Potassium Ion Pump)",
    gene: "ATP1A1 / ATP1A2",
    proteinName: "Sodium/Potassium Transporting ATPase Subunit Alpha",
    currentName: "INa/K (Electrogenic sodium pump current)",
    conductanceIon: "Na+/K+",
    channelClass: "Electrogenic P-Type Ion Pump",
    fluxDirection: "outward",
    phasesActive: [4],
    tissueDistribution: "Sarcolemma of all cardiac myocytes and conduction tissue.",
    gatingKinetics: "ATP-dependent active transport; pumps 3 intracellular Na+ ions out in exchange for 2 extracellular K+ ions in.",
    biophysicalFunction:
      "Maintains the fundamental electrochemical gradients of the myocyte (low intracellular Na+ ~10 mM, high intracellular K+ ~140 mM). Net outward current (+1 outward charge per cycle) contributes to hyperpolarizing the resting potential.",
    pharmacologicBlockers: [
      {
        drugId: "digoxin",
        drugName: "Digoxin",
        blockerType: "Direct Na+/K+ ATPase Inhibitor (Cardiac Glycoside)",
        affinityOrKinetics: "Binds extracellular alpha subunit of phosphorylated ATPase in competitive antagonism with K+.",
        clinicalImpact: "Inhibition leads to intracellular Na+ accumulation, indirect SR Ca2+ loading, positive inotropy, and enhanced vagal tone.",
      },
    ],
    geneticChannelopathy: "Familial hemiplegic migraine and rapid-onset dystonia-parkinsonism (ATP1A2/ATP1A3).",
    arrhythmiaTrigger:
      "Toxicity causes severe intracellular Na+ loading, driving massive SR Ca2+ overload, spontaneous diastolic Ca2+ waves, and DAD-triggered ventricular tachyarrhythmias.",
  },
];

// ============================================================================
// 4. VAUGHAN WILLIAMS CLASSIFICATION SYSTEM
// ============================================================================

export const VAUGHAN_WILLIAMS_CLASSES: readonly VaughanWilliamsClassInfo[] = [
  {
    id: "IA",
    code: "Class IA",
    name: "Moderate Sodium Channel Blockers with Repolarization Prolongation",
    subheading: "Moderate Nav1.5 Block + Concomitant IKr (hERG) Inhibition",
    primaryTarget: "Nav1.5 (INa) + hERG (IKr)",
    channelKinetics: "Intermediate binding and dissociation kinetics",
    dissociationTimeTau: "1 to 5 seconds",
    useDependenceProfile: "Intermediate Use-Dependence",
    conductionVelocityEffect: "Moderately Decreased (slows Phase 0 upstroke dV/dt)",
    refractoryPeriodEffect: "Prolonged (increases action potential duration / effective refractory period)",
    ecgFootprint: {
      prInterval: "Mildly Prolonged",
      qrsDuration: "Moderately Widened (+15% to +25%)",
      qtInterval: "Prolonged (due to concomitant hERG block)",
      morphologyPattern: "Widened QRS with prominent QT/QTc prolongation; risk of notched T waves.",
    },
    prototypeDrugs: [
      {
        drugId: "quinidine",
        drugName: "Quinidine",
        targetAffinity: "Nav1.5 and hERG blocker; anticholinergic vagolytic properties.",
        biophysicalMechanism: "Blocks open Nav1.5 channels with intermediate kinetics; blocks hERG IKr repolarizing current.",
        ecgChanges: "Widened QRS, prolonged QT/QTc, mild PR prolongation, ST-T wave changes.",
        keySafetyPrecaution: "Quinidine syncope (TdP) can occur at subtherapeutic serum concentrations; vagolytic effect may paradoxically accelerate AV conduction in atrial flutter.",
      },
      {
        drugId: "procainamide",
        drugName: "Procainamide",
        targetAffinity: "Nav1.5 blocker; active metabolite N-acetylprocainamide (NAPA) blocks hERG.",
        biophysicalMechanism: "Moderate Phase 0 slowing; NAPA selectively prolongs Phase 3 repolarization.",
        ecgChanges: "QRS widening, prolonged QTc, PR prolongation.",
        keySafetyPrecaution: "Monitor QRS duration and QTc continuously during IV infusion; stop if QRS widens >50% or QTc >500 ms.",
      },
      {
        drugId: "disopyramide",
        drugName: "Disopyramide",
        targetAffinity: "Nav1.5 and hERG blocker; strong negative inotrope; potent anticholinergic.",
        biophysicalMechanism: "Intermediate Nav1.5 block; lengthens atrial and ventricular refractory periods.",
        ecgChanges: "Moderate QRS widening, prolonged QT interval.",
        keySafetyPrecaution: "Precipitates severe decompensation in heart failure; marked anticholinergic urinary retention and glaucoma exacerbation.",
      },
    ],
    electrophysiologicalMechanisms:
      "By moderately slowing conduction velocity (Nav1.5) while simultaneously prolonging the effective refractory period (IKr block), Class IA agents terminate re-entrant circuits in both atria and ventricles.",
    proarrhythmicRisks: [
      "Early Afterdepolarizations (EADs) and Torsades de Pointes secondary to IKr blockade.",
      "Excessive QRS widening and monomorphic VT in diseased myocardium.",
      "Paradoxical accelerated AV conduction in atrial flutter if AV node is not pre-blocked.",
    ],
    clinicalMonitoredParameters: ["QRS complex duration", "QTc interval", "Serum potassium and magnesium", "Heart rate and blood pressure"],
  },
  {
    id: "IB",
    code: "Class IB",
    name: "Mild Sodium Channel Blockers with Repolarization Shortening",
    subheading: "Mild Nav1.5 Block + Rapid Dissociation Kinetics (Ischemic Tissue Selective)",
    primaryTarget: "Nav1.5 (INa, preferentially in depolarized/ischemic myocardium)",
    channelKinetics: "Rapid binding and dissociation kinetics",
    dissociationTimeTau: "< 0.5 seconds",
    useDependenceProfile: "Rapid Recovery / State-Dependent (Depolarized Tissue)",
    conductionVelocityEffect: "Unchanged or Mildly Decreased in normal tissue; substantially slowed in ischemic/depolarized cells",
    refractoryPeriodEffect: "Shortened (decreases action potential duration and refractoriness)",
    ecgFootprint: {
      prInterval: "Normal / Unchanged",
      qrsDuration: "Normal / Minimal change at normal heart rates",
      qtInterval: "Shortened or Unchanged (mild APD reduction)",
      morphologyPattern: "Preserved normal baseline ECG morphology; lacks QT prolongation.",
    },
    prototypeDrugs: [
      {
        drugId: "lidocaine",
        drugName: "Lidocaine",
        targetAffinity: "Inactivated Nav1.5 channels in depolarized tissue (ischemia/acidosis).",
        biophysicalMechanism: "Fast on/off kinetics dissociate during normal diastole; blocks persistently in depolarized ischemic tissue.",
        ecgChanges: "ECG typically unchanged; may mildly shorten QT interval.",
        keySafetyPrecaution: "Ineffective against atrial arrhythmias due to brief atrial action potentials; CNS toxicity (tremor, seizures, altered mental status) at elevated levels.",
      },
      {
        drugId: "mexiletine",
        drugName: "Mexiletine",
        targetAffinity: "Oral Nav1.5 blocker with rapid dissociation kinetics.",
        biophysicalMechanism: "Shortens APD and selectively suppresses late sodium current (late INa).",
        ecgChanges: "Minimal QRS effect; shortens QT in LQT3 patients.",
        keySafetyPrecaution: "Neurological toxicity, nausea, tremor; monitor liver function and blood counts.",
      },
    ],
    electrophysiologicalMechanisms:
      "Fast dissociation allows rapid recovery between normal beats, sparing conduction in healthy myocardium. In depolarized, ischemic, or rapidly firing tissue, channels remain inactivated longer, unmasking potent conduction block.",
    proarrhythmicRisks: [
      "Proarrhythmic risk is comparatively low among antiarrhythmics.",
      "Potential bradycardia, sinus arrest, or AV block in patients with pre-existing conduction system disease.",
    ],
    clinicalMonitoredParameters: ["Neurological exam (CNS toxicity)", "Serum lidocaine concentrations", "Liver function", "Continuous telemetry"],
  },
  {
    id: "IC",
    code: "Class IC",
    name: "Marked Sodium Channel Blockers with Negligible Repolarization Effect",
    subheading: "Marked Nav1.5 Block + Slow Dissociation Kinetics (Marked Use-Dependence)",
    primaryTarget: "Nav1.5 (INa)",
    channelKinetics: "Very slow binding and dissociation kinetics",
    dissociationTimeTau: "> 10 to 20 seconds",
    useDependenceProfile: "Marked Use-Dependence (Tachycardia Aggravation)",
    conductionVelocityEffect: "Markedly Decreased (profound depression of Phase 0 upstroke dV/dt)",
    refractoryPeriodEffect: "Unchanged or Minimally Prolonged in ventricular tissue",
    ecgFootprint: {
      prInterval: "Prolonged (slows intra-atrial and AV conduction)",
      qrsDuration: "Markedly Widened (rate-dependent widening during tachycardia)",
      qtInterval: "Unchanged (JT interval unchanged; any QTc prolongation is purely QRS widening)",
      morphologyPattern: "Marked intraventricular conduction delay; progressive QRS widening with faster heart rates.",
    },
    prototypeDrugs: [
      {
        drugId: "flecainide",
        drugName: "Flecainide",
        targetAffinity: "Potent Nav1.5 blocker with extremely slow unbinding kinetics.",
        biophysicalMechanism: "Depresses Phase 0 upstroke markedly; blocks RyR2 calcium release channels.",
        ecgChanges: "Progressive QRS widening (use-dependent), PR prolongation; JT interval unchanged.",
        keySafetyPrecaution: "CAST trial demonstrated 2.5-fold increase in cardiac mortality in patients with prior myocardial infarction or ischemic heart disease; contraindicated in structural heart disease.",
      },
      {
        drugId: "propafenone",
        drugName: "Propafenone",
        targetAffinity: "Nav1.5 blocker + weak non-selective beta-adrenergic blocker.",
        biophysicalMechanism: "Slow dissociation from Nav1.5; mild Class II autonomic blunting.",
        ecgChanges: "QRS widening, PR prolongation, mild sinus bradycardia.",
        keySafetyPrecaution: "Contraindicated in structural heart disease or severe bronchospasm; risk of converting atrial fibrillation into 1:1 conducting atrial flutter.",
      },
    ],
    electrophysiologicalMechanisms:
      "Because drug dissociation takes >10-20 seconds, channels do not clear drug molecules during diastole. With faster heart rates, unblocked channels progressively diminish, producing marked conduction slowing and QRS widening.",
    proarrhythmicRisks: [
      "CAST Trial Catastrophe: Fatal sustained monomorphic and polymorphic ventricular tachycardia in patients with prior MI or ischemic heart disease.",
      "Atrial flutter with rapid 1:1 AV conduction (converts AF to flutter with rate ~200 bpm, conducted 1:1 due to less AV delay).",
      "Severe rate-dependent QRS widening during exercise or stress.",
    ],
    clinicalMonitoredParameters: [
      "QRS duration (halt or reduce if QRS widens >25-50% over baseline)",
      "Exercise treadmill stress testing to unmask exercise-induced QRS widening",
      "Echocardiogram to rule out structural/ischemic heart disease",
    ],
  },
  {
    id: "II",
    code: "Class II",
    name: "Beta-Adrenergic Receptor Antagonists",
    subheading: "Suppression of Autonomic Gs Signaling in Nodal Pacemakers",
    primaryTarget: "Beta-1 Adrenergic GPCR (Gs protein -> Adenylyl Cyclase -> cAMP -> PKA)",
    channelKinetics: "Receptor-mediated modulation",
    dissociationTimeTau: "Receptor-dependent",
    useDependenceProfile: "Rate-Blunting / Autonomic Modulation",
    conductionVelocityEffect: "Decreased specifically in SA node and AV node slow-response tissue; unchanged in His-Purkinje",
    refractoryPeriodEffect: "Prolonged in AV node; prevents adrenergic shortening of ventricular APD",
    ecgFootprint: {
      prInterval: "Prolonged (delays AV nodal conduction)",
      qrsDuration: "Normal / Unchanged",
      qtInterval: "Normal or mildly shortened (prevents adrenergic QT prolongation)",
      morphologyPattern: "Sinus bradycardia, lengthened PR interval, preservation of narrow QRS.",
    },
    prototypeDrugs: [
      {
        drugId: "metoprolol",
        drugName: "Metoprolol",
        targetAffinity: "Selective Beta-1 adrenergic antagonist.",
        biophysicalMechanism: "Decreases cAMP and PKA phosphorylation of Cav1.2 and HCN4 in nodal tissue.",
        ecgChanges: "Sinus rate deceleration, prolonged PR interval.",
        keySafetyPrecaution: "Severe bradycardia, high-grade AV block, acute heart failure exacerbation if uncompensated.",
      },
      {
        drugId: "propranolol",
        drugName: "Propranolol",
        targetAffinity: "Non-selective Beta-1 / Beta-2 antagonist; membrane-stabilizing activity at very high doses.",
        biophysicalMechanism: "Inhibits sympathetic stimulation of SA and AV nodal pacemakers; blunts Phase 4 slope.",
        ecgChanges: "Decreased sinus rate, prolonged PR interval.",
        keySafetyPrecaution: "Bronchospasm in asthma/COPD (Beta-2 block), hypoglycemia masking in diabetics.",
      },
      {
        drugId: "atenolol",
        drugName: "Atenolol",
        targetAffinity: "Selective hydrophilic Beta-1 antagonist.",
        biophysicalMechanism: "Blunts Phase 4 automaticity; decreases AV node dromotropy.",
        ecgChanges: "Prolonged PR interval, decreased heart rate.",
        keySafetyPrecaution: "Renally cleared; accumulation in renal impairment increases AV block risk.",
      },
      {
        drugId: "carvedilol",
        drugName: "Carvedilol",
        targetAffinity: "Non-selective Beta-blocker with Alpha-1 adrenergic antagonism.",
        biophysicalMechanism: "Decreases SA/AV automaticity; peripheral vasodilation via Alpha-1 block.",
        ecgChanges: "Bradycardia, PR prolongation.",
        keySafetyPrecaution: "Postural hypotension, dizziness, bradycardia.",
      },
      {
        drugId: "bisoprolol",
        drugName: "Bisoprolol",
        targetAffinity: "Highly selective Beta-1 antagonist.",
        biophysicalMechanism: "Attenuates adrenergic augmentation of If and ICa,L.",
        ecgChanges: "PR prolongation, resting rate reduction.",
        keySafetyPrecaution: "Bradycardia, AV nodal conduction delay.",
      },
      {
        drugId: "esmolol",
        drugName: "Esmolol",
        targetAffinity: "Ultra-short-acting selective Beta-1 antagonist (RBC esterase clearance).",
        biophysicalMechanism: "Rapid titration for acute rate control in SVT, AF, or perioperative hypertension.",
        ecgChanges: "Rapid deceleration of sinus and ventricular response rates.",
        keySafetyPrecaution: "Hypotension; rapid recovery upon discontinuation (~9 minute elimination half-life).",
      },
    ],
    electrophysiologicalMechanisms:
      "Reduces PKA-mediated phosphorylation of Cav1.2 channels and shifts HCN4 activation curves in nodal tissue. Flattens Phase 4 diastolic depolarization slope in SA node (slowing heart rate) and slows Phase 0 upstroke in AV node (extending PR interval).",
    proarrhythmicRisks: [
      "Severe symptomatic bradycardia, sinus node arrest, and high-grade atrioventricular block.",
      "Cardiogenic shock when combined with Class IV Non-DHP calcium channel blockers.",
      "Rebound adrenergic storm and ventricular tachyarrhythmias upon abrupt withdrawal.",
    ],
    clinicalMonitoredParameters: ["Resting and active heart rate", "PR interval", "Blood pressure", "Signs of acute decompensated heart failure"],
  },
  {
    id: "III",
    code: "Class III",
    name: "Potassium Channel Blockers (Repolarization Delay)",
    subheading: "Blockade of Outward Potassium Currents (IKr / hERG) -> Action Potential Duration Prolongation",
    primaryTarget: "hERG / Kv11.1 (IKr) ± Kv7.1 (IKs)",
    channelKinetics: "Direct pore blockade or gated channel inhibition",
    dissociationTimeTau: "Variable; drug-specific",
    useDependenceProfile: "Reverse Use-Dependence (Bradycardia Aggravation)",
    conductionVelocityEffect: "Unchanged (pure Class III like dofetilide); slowed if multi-class like amiodarone",
    refractoryPeriodEffect: "Markedly Prolonged across atria, ventricles, and accessory pathways",
    ecgFootprint: {
      prInterval: "Normal / Unchanged (pure Class III) or Prolonged (amiodarone)",
      qrsDuration: "Normal / Unchanged (pure Class III) or Mildly Widened (amiodarone)",
      qtInterval: "Markedly Prolonged (QTc extension is hallmark of Class III effect)",
      morphologyPattern: "T-wave flattening, broad notched T-waves, prominent U-waves, T-wave alternans.",
    },
    prototypeDrugs: [
      {
        drugId: "amiodarone",
        drugName: "Amiodarone",
        targetAffinity: "Multi-channel blocker: Class III (IKr, IKs) + Class I (Nav1.5) + Class II (antiadrenergic) + Class IV (Cav1.2).",
        biophysicalMechanism: "Prolongs APD and refractoriness uniformly across cardiac tissues; inhibits multiple inward and outward currents.",
        ecgChanges: "Prolonged QTc, PR prolongation, widened QRS, bradycardia.",
        keySafetyPrecaution: "Extremely long half-life (~58 days); pulmonary toxicity, thyroid dysfunction, hepatotoxicity, corneal deposits; potent CYP and P-gp inhibitor.",
      },
      {
        drugId: "sotalol",
        drugName: "Sotalol",
        targetAffinity: "Racemic D,L-sotalol: IKr blocker + non-selective beta-blocker.",
        biophysicalMechanism: "Direct pore blocker of hERG; reverse use-dependence amplifies IKr block during bradycardia.",
        ecgChanges: "Dose-dependent QTc prolongation, PR prolongation, bradycardia.",
        keySafetyPrecaution: "Reverse use-dependence creates severe TdP risk at slower heart rates; requires 3-day inpatient ECG monitoring during initiation; renally cleared.",
      },
      {
        drugId: "dofetilide",
        drugName: "Dofetilide",
        targetAffinity: "Highly selective pure IKr blocker.",
        biophysicalMechanism: "Selective pore inhibition of hERG without affecting Nav1.5 or Cav1.2.",
        ecgChanges: "Isolated QTc prolongation; PR and QRS unchanged.",
        keySafetyPrecaution: "Strict mandatory inpatient telemetry protocol; dose adjusted precisely to creatinine clearance; stop if QTc >500 ms.",
      },
      {
        drugId: "ibutilide",
        drugName: "Ibutilide",
        targetAffinity: "IV IKr blocker with slow inward sodium current promotion.",
        biophysicalMechanism: "Rapid prolongation of atrial and ventricular action potential duration.",
        ecgChanges: "Acute QTc prolongation.",
        keySafetyPrecaution: "Torsades de Pointes occurs in ~4-8% of patients receiving IV infusion; requires continuous telemetry and resuscitation preparedness.",
      },
      {
        drugId: "dronedarone",
        drugName: "Dronedarone",
        targetAffinity: "Non-iodinated benzofuran derivative; multi-channel blocker.",
        biophysicalMechanism: "Inhibits IKr, IKs, Cav1.2, and Nav1.5; antiadrenergic.",
        ecgChanges: "Moderate QTc prolongation, PR prolongation.",
        keySafetyPrecaution: "Contraindicated in permanent atrial fibrillation and severe or decompensated heart failure (ANDROMEDA and PALLAS trials).",
      },
    ],
    electrophysiologicalMechanisms:
      "Blockade of outward potassium currents impairs Phase 3 rapid repolarization, extending action potential duration and effective refractory period. This extinguishes re-entry waves. However, the reverse use-dependence characteristic causes maximal APD prolongation at low heart rates.",
    proarrhythmicRisks: [
      "Early Afterdepolarizations (EADs) triggering polymorphic ventricular tachycardia (Torsades de Pointes).",
      "Pause-dependent TdP precipitated by long-short cycle sequences.",
      "Severe bradycardia and sinus arrest (amiodarone, sotalol).",
    ],
    clinicalMonitoredParameters: [
      "Baseline and continuous QTc interval (halt if QTc >= 500 ms or increases >60 ms over baseline)",
      "Serum potassium (maintain >= 4.0 mEq/L) and magnesium (maintain >= 2.0 mg/dL)",
      "Renal function (creatinine clearance for sotalol and dofetilide)",
    ],
  },
  {
    id: "IV",
    code: "Class IV",
    name: "Non-Dihydropyridine Calcium Channel Blockers",
    subheading: "Blockade of L-Type Calcium Channels (Cav1.2) in Slow-Response Nodal Tissue",
    primaryTarget: "Cav1.2 (ICa,L in SA and AV nodes)",
    channelKinetics: "Voltage- and frequency-dependent binding",
    dissociationTimeTau: "Intermediate recovery",
    useDependenceProfile: "Frequency-Dependent Nodal Suppression",
    conductionVelocityEffect: "Decreased in SA and AV node slow-response tissue; minimal effect on His-Purkinje conduction velocity",
    refractoryPeriodEffect: "Prolonged in the AV node",
    ecgFootprint: {
      prInterval: "Prolonged (characteristic AV nodal conduction delay)",
      qrsDuration: "Normal / Unchanged",
      qtInterval: "Normal / Unchanged (may slightly shorten Phase 2 plateau)",
      morphologyPattern: "Lengthened PR interval, slowed ventricular response rate in atrial tachyarrhythmias.",
    },
    prototypeDrugs: [
      {
        drugId: "verapamil",
        drugName: "Verapamil",
        targetAffinity: "High affinity for open and inactivated Cav1.2 channels; phenylalkylamine class.",
        biophysicalMechanism: "Frequency-dependent inhibition of ICa,L; slows Phase 0 in AV node; negative inotropic effect.",
        ecgChanges: "Prolonged PR interval, rate deceleration.",
        keySafetyPrecaution: "Severe hypotension, cardiogenic shock in reduced ejection fraction (HFrEF); complete heart block when combined with beta-blockers; potent P-gp inhibitor.",
      },
      {
        drugId: "diltiazem",
        drugName: "Diltiazem",
        targetAffinity: "Intermediate affinity for Cav1.2; benzothiazepine class.",
        biophysicalMechanism: "Slows AV nodal conduction velocity and prolongs refractory period; modest negative inotrope.",
        ecgChanges: "PR interval prolongation, reduction in ventricular response rate.",
        keySafetyPrecaution: "Bradycardia, AV block, worsening of acute heart failure; moderate CYP3A4 inhibitor.",
      },
    ],
    electrophysiologicalMechanisms:
      "Inhibits Cav1.2 L-type calcium channels, depressing the Phase 0 upstroke in nodal tissue. Slows AV nodal conduction velocity, lengthens AV nodal refractory period, and blunts sympathetic enhancement of calcium entry.",
    proarrhythmicRisks: [
      "Severe sinus bradycardia, sinoatrial exit block, and third-degree complete AV block.",
      "Cardiogenic shock in HFrEF due to negative inotropy.",
      "Accelerated ventricular response in Wolff-Parkinson-White (WPW) syndrome with pre-excited AF (shunts conduction through accessory pathway).",
    ],
    clinicalMonitoredParameters: ["PR interval", "Ventricular response rate in atrial fibrillation", "Blood pressure", "Left ventricular ejection fraction"],
  },
  {
    id: "unclassified-digoxin",
    code: "Unclassified: Digoxin",
    name: "Cardiac Glycoside (Na+/K+ ATPase Inhibitor)",
    subheading: "Inhibition of Sodium-Potassium Pump -> Altered NCX1 Calcium Exchange & Vagal Tone",
    primaryTarget: "Na+/K+ ATPase (ATP1A1)",
    channelKinetics: "Direct enzymatic pump inhibition",
    dissociationTimeTau: "Slow pump binding",
    useDependenceProfile: "State-Independent / Transporter-Coupled",
    conductionVelocityEffect: "Decreased in AV node (via central and peripheral vagal enhancement); accelerated in Purkinje tissue at toxic levels",
    refractoryPeriodEffect: "Shortened in atrial and ventricular myocardium; prolonged in AV node",
    ecgFootprint: {
      prInterval: "Prolonged (due to increased parasympathetic vagal tone at AV node)",
      qrsDuration: "Normal / Unchanged",
      qtInterval: "Shortened (due to accelerated ventricular repolarization)",
      morphologyPattern: "Scooped ST-segment depression ('Salvador Dali mustache' digitalis effect), T-wave inversion, U waves.",
    },
    prototypeDrugs: [
      {
        drugId: "digoxin",
        drugName: "Digoxin",
        targetAffinity: "High-affinity inhibitor of cardiac sarcolemmal Na+/K+ ATPase alpha subunit.",
        biophysicalMechanism:
          "Inhibits Na+/K+ pump -> intracellular [Na+] rises -> blunts forward NCX1 extrusion -> intracellular [Ca2+] rises -> enhanced inotropy. Also stimulates nodose ganglion and vagal nuclei, slowing AV conduction.",
        ecgChanges: "ST scooping ('digitalis effect'), shortened QT, PR prolongation, premature ventricular complexes.",
        keySafetyPrecaution: "Narrow therapeutic window (0.5-0.9 ng/mL for heart failure); toxicity precipitates Delayed Afterdepolarizations (DADs), bidirectional VT, junctional tachycardia, and severe AV block.",
      },
    ],
    electrophysiologicalMechanisms:
      "Intracellular sodium accumulation blunts or reverses NCX1, packing the sarcoplasmic reticulum with calcium. Spontaneous diastolic calcium leak via RyR2 triggers electrogenic NCX forward mode (Iti), precipitating Phase 4 Delayed Afterdepolarizations (DADs).",
    proarrhythmicRisks: [
      "Delayed Afterdepolarizations (DADs) generating bidirectional ventricular tachycardia and PVCs.",
      "High-grade AV block, paroxysmal atrial tachycardia with block, accelerated junctional rhythm.",
      "Toxicity dramatically magnified by hypokalemia, hypomagnesemia, and P-gp inhibitors (amiodarone, verapamil, quinidine).",
    ],
    clinicalMonitoredParameters: [
      "Serum digoxin concentrations (trough >= 6-8h post-dose)",
      "Serum potassium and magnesium",
      "Renal function (creatinine clearance)",
      "Continuous ECG for ectopy or AV block",
    ],
  },
  {
    id: "unclassified-adenosine",
    code: "Unclassified: Adenosine",
    name: "Purinergic A1 Receptor Agonist",
    subheading: "Activation of G-Protein Coupled Inward Rectifier Potassium Current (IK,ACh)",
    primaryTarget: "Adenosine A1 GPCR -> Gi protein -> GIRK1/4 (IK,ACh)",
    channelKinetics: "Direct GPCR-coupled ligand-gating",
    dissociationTimeTau: "Ultra-rapid (< 10 seconds biological half-life)",
    useDependenceProfile: "State-Independent / Transporter-Coupled",
    conductionVelocityEffect: "Markedly Decreased in AV node (transient complete conduction block)",
    refractoryPeriodEffect: "Markedly Prolonged in AV node; shortened in atria",
    ecgFootprint: {
      prInterval: "Markedly Prolonged transitioning to transient complete AV nodal block",
      qrsDuration: "Normal / Unchanged",
      qtInterval: "Normal / Unchanged",
      morphologyPattern: "Transient complete asystole / ventricular pause terminating AV nodal re-entrant tachycardia (AVNRT).",
    },
    prototypeDrugs: [
      {
        drugId: "adenosine",
        drugName: "Adenosine",
        targetAffinity: "High-affinity agonist at purinergic A1 receptors.",
        biophysicalMechanism:
          "Couples to Gi protein: Gbeta-gamma subunits open IK,ACh potassium channels causing hyperpolarization; Galpha-i inhibits adenylyl cyclase, suppressing Cav1.2 inward calcium current in the AV node.",
        ecgChanges: "Transient complete AV block terminating SVT.",
        keySafetyPrecaution: "Bronchospasm in asthma/reactive airway disease; transient chest tightness and flushing; antagonized by theophylline/caffeine; potentiated by dipyridamole.",
      },
    ],
    electrophysiologicalMechanisms:
      "Rapid outward potassium current hyperpolarizes the AV nodal resting potential while inward calcium conductance is simultaneously suppressed. Conduction across the AV node halts completely for several seconds, interrupting re-entrant circuits.",
    proarrhythmicRisks: [
      "Transient prolonged asystole or high-grade AV block.",
      "Atrial fibrillation induction in ~1-5% due to shortening of atrial action potential duration.",
      "Bronchospasm in asthmatic patients (A2B/A3 receptor activation in bronchial smooth muscle).",
    ],
    clinicalMonitoredParameters: ["Continuous rhythm strip during rapid IV push", "Airway status in asthmatics", "Blood pressure"],
  },
  {
    id: "unclassified-ivabradine",
    code: "Unclassified: Ivabradine",
    name: "Selective Pacemaker Hyperpolarization-Activated Current (If) Blocker",
    subheading: "Pure Sinoatrial Pacemaker Channel Blockade -> Isolated Heart Rate Deceleration",
    primaryTarget: "HCN4 (If pacemaker current in Sinoatrial Node)",
    channelKinetics: "Pore-blocking, open-channel dependent",
    dissociationTimeTau: "Use-dependent recovery",
    useDependenceProfile: "Marked Use-Dependence (Tachycardia Aggravation)",
    conductionVelocityEffect: "Unchanged throughout myocardium and His-Purkinje; isolated slowing of SA node firing rate",
    refractoryPeriodEffect: "Unchanged in atrial and ventricular myocardium",
    ecgFootprint: {
      prInterval: "Normal / Unchanged",
      qrsDuration: "Normal / Unchanged",
      qtInterval: "Rate-adjusted QTc unchanged (pure rate reduction)",
      morphologyPattern: "Dose-dependent slowing of sinus P-wave frequency with normal baseline ECG intervals.",
    },
    prototypeDrugs: [
      {
        drugId: "ivabradine",
        drugName: "Ivabradine",
        targetAffinity: "Selective inhibitor of hyperpolarization-activated cyclic nucleotide-gated channels (HCN4).",
        biophysicalMechanism:
          "Enters the HCN channel pore from the intracellular side and blocks mixed inward Na+/K+ flux during Phase 4 diastole, reducing the slope of spontaneous pacemaker depolarization in the SA node.",
        ecgChanges: "Dose-dependent reduction in sinus heart rate.",
        keySafetyPrecaution: "Phosphenes (visual luminous phenomena) due to retinal HCN1 inhibition; contraindicated in severe bradycardia, cardiogenic shock, or 2nd/3rd degree AV block; CYP3A4 substrate.",
      },
    ],
    electrophysiologicalMechanisms:
      "Reduces inward depolarizing current during Phase 4 diastole in SA nodal pacemaker cells without altering Phase 0 upstroke, ventricular repolarization, or myocardial contractility.",
    proarrhythmicRisks: [
      "Severe sinus bradycardia.",
      "Increased incidence of atrial fibrillation reported in clinical trials (SHIFT and SIGNIFY).",
    ],
    clinicalMonitoredParameters: ["Resting resting sinus heart rate", "Visual disturbance surveillance (phosphenes)", "Blood pressure"],
  },
];

// ============================================================================
// 5. ARRHYTHMIA MECHANISMS (EADs, DADs, Use-Dependence)
// ============================================================================

export const ARRHYTHMIA_MECHANISMS: readonly ArrhythmiaMechanism[] = [
  {
    id: "ead",
    title: "Early Afterdepolarizations (EADs)",
    category: "afterdepolarization",
    phaseLocus: "Phase 2 (plateau) or Phase 3 (late repolarization)",
    triggerEvent:
      "Excessive prolongation of the ventricular action potential duration (APD) delays repolarization, keeping membrane voltage in the window where Cav1.2 calcium channels recover from inactivation and reopen.",
    biophysicalCurrents:
      "Cav1.2 L-type Ca2+ 'window current' reactivation in Phase 2; electrogenic forward NCX1 current (Iti) and late INa in Phase 3.",
    ecgFootprint: "Prolonged QT/QTc interval (> 500 ms), prominent U-waves, T-wave alternans, polymorphic VT / Torsades de Pointes.",
    cellularPhysiology:
      "When outward repolarizing currents (IKr / hERG) are inhibited or inward currents (late INa, ICa,L) are amplified, the myocyte fails to repolarize promptly. As membrane potential lingers between -35 mV and -10 mV, Cav1.2 channels de-inactivate and fire a secondary depolarizing upstroke before complete repolarization.",
    aggravatingFactors: [
      "Bradycardia and long pauses (amplified by reverse use-dependence of IKr blockers).",
      "Hypokalemia (paradoxically diminishes hERG conductance and enhances drug binding).",
      "Hypomagnesemia (impairs Na+/K+ ATPase and destabilizes membrane potential).",
      "Female sex (longer baseline QTc and lower repolarization reserve).",
      "Co-administration of multiple hERG / IKr-blocking pharmacological agents.",
    ],
    protectiveOrCounterMechanisms: [
      "Repolarization reserve provided by intact IKs (Kv7.1 / KCNQ1).",
      "Increased heart rate / pacing (shortens APD and bypasses reverse use-dependence).",
      "Intravenous magnesium sulfate (stabilizes sarcolemma and suppresses Cav1.2 window current).",
    ],
    prototypeAssociatedDrugs: [
      { drugId: "sotalol", drugName: "Sotalol", role: "Class III IKr blocker with strong reverse use-dependence" },
      { drugId: "dofetilide", drugName: "Dofetilide", role: "Potent pure IKr blocker" },
      { drugId: "quinidine", drugName: "Quinidine", role: "Class IA agent with intermediate IKr block" },
      { drugId: "ondansetron", drugName: "Ondansetron", role: "Non-cardiac hERG-blocking 5-HT3 antagonist" },
      { drugId: "haloperidol", drugName: "Haloperidol", role: "High-potency hERG-blocking antipsychotic" },
    ],
  },
  {
    id: "dad",
    title: "Delayed Afterdepolarizations (DADs)",
    category: "afterdepolarization",
    phaseLocus: "Phase 4 (after complete repolarization of the preceding action potential)",
    triggerEvent:
      "Intracellular and sarcoplasmic reticulum (SR) calcium overload leads to spontaneous diastolic calcium release waves into the cytosol via ryanodine receptors (RyR2).",
    biophysicalCurrents:
      "Electrogenic NCX1 forward mode (extrudes 1 Ca2+ for 3 Na+, producing transient inward current Iti) + Ca2+-activated non-selective cation channels.",
    ecgFootprint: "Ventricular premature beats (PVCs), bidirectional ventricular tachycardia, accelerated junctional rhythms.",
    cellularPhysiology:
      "When the SR is overloaded with calcium (e.g. digitalis toxicity, catecholaminergic stress, ischemia), RyR2 channels spontaneously release calcium during diastole. The electrogenic NCX1 exchanger pumps 1 Ca2+ out and 3 Na+ in, creating a net inward depolarizing current (Iti). If this DAD depolarization reaches Nav1.5 threshold (~ -60 mV), a triggered action potential fires.",
    aggravatingFactors: [
      "Tachycardia and rapid pacing (increases calcium entry beat-to-beat, packing the SR).",
      "Digitalis toxicity (inhibits Na+/K+ ATPase, raising intracellular Na+ and Ca2+).",
      "Adrenergic catecholaminergic surge (PKA/CaMKII hyperphosphorylation of RyR2).",
      "Hypercalcemia and hypokalemia (hypokalemia increases digitalis binding to Na+/K+ pump).",
      "Acute myocardial ischemia and reperfusion injury.",
    ],
    protectiveOrCounterMechanisms: [
      "Decreased heart rate / avoidance of catecholaminergic surges.",
      "Beta-adrenergic blockade (Class II) to reduce cAMP, PKA phosphorylation of RyR2, and Ca2+ loading.",
      "Digoxin-specific Fab fragments (DigiFab) in digitalis toxicity.",
    ],
    prototypeAssociatedDrugs: [
      { drugId: "digoxin", drugName: "Digoxin", role: "Na+/K+ ATPase inhibitor directly producing SR Ca2+ overload" },
      { drugId: "epinephrine", drugName: "Epinephrine", role: "Potent beta-1 agonist driving calcium overload" },
    ],
  },
  {
    id: "use-dependence",
    title: "Use-Dependence (Tachycardia-Dependent Block)",
    category: "gating-kinetics",
    phaseLocus: "Phase 0 (Nav1.5) or Phase 2 (Cav1.2)",
    triggerEvent:
      "The antiarrhythmic drug binds preferentially to the open or inactivated conformation of the ion channel and unbinds slowly during diastole.",
    biophysicalCurrents: "Inward sodium current (INa via Nav1.5) or inward calcium current (ICa,L via Cav1.2).",
    ecgFootprint: "Progressive QRS complex widening and PR interval prolongation as heart rate accelerates (e.g., during exercise).",
    cellularPhysiology:
      "Because unbinding kinetics are slow (tau > 10-20 seconds for Class IC flecainide), drug molecules cannot fully dissociate during the short diastolic interval of a rapid heart rate. Block accumulates beat-to-beat, progressively suppressing dV/dt max and conduction velocity at higher rates.",
    aggravatingFactors: [
      "Sinus tachycardia, exercise, physical stress, emotional arousal.",
      "Supraventricular and ventricular tachyarrhythmias.",
      "Higher drug concentrations and baseline conduction disease.",
    ],
    protectiveOrCounterMechanisms: [
      "Slower resting heart rates (allow adequate diastolic unbinding time).",
      "Exercise treadmill testing to detect dangerous rate-dependent QRS widening before discharge.",
    ],
    prototypeAssociatedDrugs: [
      { drugId: "flecainide", drugName: "Flecainide", role: "Classic prototype: marked use-dependent Nav1.5 block with CAST catastrophe" },
      { drugId: "propafenone", drugName: "Propafenone", role: "Class IC agent exhibiting slow dissociation kinetics" },
      { drugId: "verapamil", drugName: "Verapamil", role: "Frequency-dependent Cav1.2 block in nodal tissue" },
    ],
  },
  {
    id: "reverse-use-dependence",
    title: "Reverse Use-Dependence (Bradycardia-Dependent Block)",
    category: "gating-kinetics",
    phaseLocus: "Phase 3 (hERG / IKr repolarization)",
    triggerEvent:
      "Potassium channel block and action potential duration prolongation are paradoxically greatest at slower heart rates and long cycle lengths.",
    biophysicalCurrents: "Rapid delayed rectifier potassium current (IKr via hERG / KCNH2).",
    ecgFootprint: "Exaggerated QTc prolongation at low heart rates and following compensatory pauses; minimal QTc prolongation during tachycardia.",
    cellularPhysiology:
      "IKr channels open upon depolarization and normally deactivate slowly. At rapid rates, accumulation of open channels and repolarization reserve blunt drug impact. At slow rates (long diastolic intervals), complete deactivation and gating dynamics result in a higher percentage of IKr inhibition per beat, causing disproportionate APD lengthening.",
    aggravatingFactors: [
      "Sinus bradycardia, nocturnal vagal tone, sick sinus syndrome.",
      "Post-extrasystolic compensatory pauses ('short-long-short' sequence triggering TdP).",
      "Co-administration of bradycardic agents (beta-blockers, non-DHP CCBs, ivabradine).",
      "Electrolyte deficits (hypokalemia, hypomagnesemia).",
    ],
    protectiveOrCounterMechanisms: [
      "Maintenance of adequate heart rates (e.g., temporary overdrive pacing at 90-110 bpm).",
      "Isoproterenol infusion (in acquired non-congenital long QT without ischemia).",
      "Correction of serum potassium to upper-normal range (4.5 - 5.0 mEq/L).",
    ],
    prototypeAssociatedDrugs: [
      { drugId: "sotalol", drugName: "Sotalol", role: "Class III prototype with marked reverse use-dependence" },
      { drugId: "dofetilide", drugName: "Dofetilide", role: "Selective IKr blocker displaying bradycardia vulnerability" },
      { drugId: "quinidine", drugName: "Quinidine", role: "Class IA agent with pause-dependent TdP" },
    ],
  },
];

// ============================================================================
// 6. CARDIAC ELECTROPHYSIOLOGY DRUG DATABASE & CROSS-REFERENCE
// ============================================================================

export const CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE: Record<string, CardiacDrugElectrophysiologyProfile> = {
  // Class IA
  quinidine: {
    drugId: "quinidine",
    drugName: "Quinidine",
    vaughanWilliamsClass: "IA",
    primaryChannelsBlocked: ["nav15", "herg"],
    ikRBlocker: true,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "prolonged", qrsChange: "widened", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "EADs / Torsades de Pointes; QRS widening; accelerated AV conduction if flutter.",
  },
  procainamide: {
    drugId: "procainamide",
    drugName: "Procainamide",
    vaughanWilliamsClass: "IA",
    primaryChannelsBlocked: ["nav15", "herg"],
    ikRBlocker: true,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "prolonged", qrsChange: "widened", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Conduction delay and QRS widening; NAPA metabolite drives QT prolongation.",
  },
  disopyramide: {
    drugId: "disopyramide",
    drugName: "Disopyramide",
    vaughanWilliamsClass: "IA",
    primaryChannelsBlocked: ["nav15", "herg"],
    ikRBlocker: true,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "prolonged", qrsChange: "widened", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Torsades de Pointes, profound negative inotropy in heart failure.",
  },

  // Class IB
  lidocaine: {
    drugId: "lidocaine",
    drugName: "Lidocaine",
    vaughanWilliamsClass: "IB",
    primaryChannelsBlocked: ["nav15"],
    ikRBlocker: false,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "shortened" },
    arrhythmiaRiskProfile: "Low proarrhythmic potential; bradycardia/conduction block in severe baseline disease.",
  },
  mexiletine: {
    drugId: "mexiletine",
    drugName: "Mexiletine",
    vaughanWilliamsClass: "IB",
    primaryChannelsBlocked: ["nav15"],
    ikRBlocker: false,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "shortened" },
    arrhythmiaRiskProfile: "Shortens APD; suppresses late sodium current; low proarrhythmia risk.",
  },

  // Class IC
  flecainide: {
    drugId: "flecainide",
    drugName: "Flecainide",
    vaughanWilliamsClass: "IC",
    primaryChannelsBlocked: ["nav15"],
    ikRBlocker: false,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "prolonged", qrsChange: "widened", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "CAST catastrophe in structural/ischemic heart disease; marked use-dependent QRS widening.",
  },
  propafenone: {
    drugId: "propafenone",
    drugName: "Propafenone",
    vaughanWilliamsClass: "IC",
    primaryChannelsBlocked: ["nav15"],
    ikRBlocker: false,
    nav15Blocker: true,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "widened", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Use-dependent QRS widening; 1:1 atrial flutter conduction; beta-blocker properties.",
  },

  // Class II
  metoprolol: {
    drugId: "metoprolol",
    drugName: "Metoprolol",
    vaughanWilliamsClass: "II",
    primaryChannelsBlocked: ["cav12", "hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Severe bradycardia, complete AV block (especially with Class IV CCBs or digoxin).",
  },
  propranolol: {
    drugId: "propranolol",
    drugName: "Propranolol",
    vaughanWilliamsClass: "II",
    primaryChannelsBlocked: ["cav12", "hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Sinus arrest, high-grade AV block, bronchospasm.",
  },
  atenolol: {
    drugId: "atenolol",
    drugName: "Atenolol",
    vaughanWilliamsClass: "II",
    primaryChannelsBlocked: ["cav12", "hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Bradycardia, accumulation in renal failure.",
  },
  carvedilol: {
    drugId: "carvedilol",
    drugName: "Carvedilol",
    vaughanWilliamsClass: "II",
    primaryChannelsBlocked: ["cav12", "hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Bradycardia, hypotension (Alpha-1 blockade).",
  },
  bisoprolol: {
    drugId: "bisoprolol",
    drugName: "Bisoprolol",
    vaughanWilliamsClass: "II",
    primaryChannelsBlocked: ["cav12", "hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Bradycardia, AV nodal conduction suppression.",
  },
  esmolol: {
    drugId: "esmolol",
    drugName: "Esmolol",
    vaughanWilliamsClass: "II",
    primaryChannelsBlocked: ["cav12", "hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Acute hypotension, severe bradycardia during rapid infusion.",
  },

  // Class III
  amiodarone: {
    drugId: "amiodarone",
    drugName: "Amiodarone",
    vaughanWilliamsClass: "III",
    primaryChannelsBlocked: ["herg", "kv71", "nav15", "cav12"],
    ikRBlocker: true,
    nav15Blocker: true,
    cav12Blocker: true,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "widened", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Marked QT prolongation; lower TdP rate (~1%) due to Cav1.2 block; bradycardia; severe organ toxicities.",
  },
  sotalol: {
    drugId: "sotalol",
    drugName: "Sotalol",
    vaughanWilliamsClass: "III",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Reverse use-dependence; high Torsades de Pointes risk during bradycardia and hypokalemia.",
  },
  dofetilide: {
    drugId: "dofetilide",
    drugName: "Dofetilide",
    vaughanWilliamsClass: "III",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Pure IKr blocker; dose-dependent EADs and TdP; mandatory inpatient telemetry initiation.",
  },
  ibutilide: {
    drugId: "ibutilide",
    drugName: "Ibutilide",
    vaughanWilliamsClass: "III",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Acute TdP risk in ~4-8% post-infusion; requires 4 hours post-infusion ECG monitoring.",
  },
  dronedarone: {
    drugId: "dronedarone",
    drugName: "Dronedarone",
    vaughanWilliamsClass: "III",
    primaryChannelsBlocked: ["herg", "kv71", "nav15", "cav12"],
    ikRBlocker: true,
    nav15Blocker: true,
    cav12Blocker: true,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Increased mortality in permanent AF and severe heart failure (ANDROMEDA, PALLAS).",
  },

  // Class IV
  verapamil: {
    drugId: "verapamil",
    drugName: "Verapamil",
    vaughanWilliamsClass: "IV",
    primaryChannelsBlocked: ["cav12"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: true,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Complete AV block, cardiogenic shock in HFrEF, fatal ventricular acceleration in WPW + AF.",
  },
  diltiazem: {
    drugId: "diltiazem",
    drugName: "Diltiazem",
    vaughanWilliamsClass: "IV",
    primaryChannelsBlocked: ["cav12"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: true,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "AV nodal conduction block, bradycardia, negative inotropy.",
  },

  // Unclassified Modulators
  digoxin: {
    drugId: "digoxin",
    drugName: "Digoxin",
    vaughanWilliamsClass: "unclassified-digoxin",
    primaryChannelsBlocked: ["nakatpase", "ncx1"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "shortened" },
    arrhythmiaRiskProfile: "DAD-triggered ventricular arrhythmias, bidirectional VT, high-grade AV block, ST scooping.",
  },
  adenosine: {
    drugId: "adenosine",
    drugName: "Adenosine",
    vaughanWilliamsClass: "unclassified-adenosine",
    primaryChannelsBlocked: ["ikach", "cav12"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: true,
    nodalConductionSlowing: true,
    ecgImpact: { prChange: "prolonged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Transient complete asystole / AV block, atrial fibrillation induction in ~1-5%.",
  },
  ivabradine: {
    drugId: "ivabradine",
    drugName: "Ivabradine",
    vaughanWilliamsClass: "unclassified-ivabradine",
    primaryChannelsBlocked: ["hcn4"],
    ikRBlocker: false,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "unchanged" },
    arrhythmiaRiskProfile: "Sinus bradycardia, increased atrial fibrillation incidence.",
  },

  // Off-Target hERG / IKr Blockers in catalog
  ondansetron: {
    drugId: "ondansetron",
    drugName: "Ondansetron",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Dose-dependent hERG channel block; additive EAD/TdP risk with other QT prolongers.",
  },
  citalopram: {
    drugId: "citalopram",
    drugName: "Citalopram",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Dose-dependent QTc prolongation (FDA black box cap at 40 mg, 20 mg in elderly).",
  },
  escitalopram: {
    drugId: "escitalopram",
    drugName: "Escitalopram",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Dose-dependent hERG block; additive QT prolongation.",
  },
  haloperidol: {
    drugId: "haloperidol",
    drugName: "Haloperidol",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "High hERG affinity; severe TdP risk especially with intravenous administration.",
  },
  ziprasidone: {
    drugId: "ziprasidone",
    drugName: "Ziprasidone",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Significant concentration-dependent QTc prolongation.",
  },
  methadone: {
    drugId: "methadone",
    drugName: "Methadone",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "High hERG affinity; dose-dependent TdP, particularly at doses > 100 mg/day.",
  },
  erythromycin: {
    drugId: "erythromycin",
    drugName: "Erythromycin",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Potent off-target hERG blocker + CYP3A4 inhibitor; classic cause of drug-induced TdP.",
  },
  azithromycin: {
    drugId: "azithromycin",
    drugName: "Azithromycin",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "hERG block and increased cardiovascular death in high-risk baseline patients.",
  },
  ciprofloxacin: {
    drugId: "ciprofloxacin",
    drugName: "Ciprofloxacin",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Fluoroquinolone class hERG block; moderate QT prolongation.",
  },
  fluconazole: {
    drugId: "fluconazole",
    drugName: "Fluconazole",
    vaughanWilliamsClass: "none",
    primaryChannelsBlocked: ["herg"],
    ikRBlocker: true,
    nav15Blocker: false,
    cav12Blocker: false,
    nodalConductionSlowing: false,
    ecgImpact: { prChange: "unchanged", qrsChange: "unchanged", qtChange: "prolonged" },
    arrhythmiaRiskProfile: "Off-target hERG block + potent CYP3A4/CYP2C9 inhibition.",
  },
};

// ============================================================================
// 7. HELPER FUNCTIONS & COLLISION DETECTION
// ============================================================================

export function getActionPotentialPhases(): readonly ActionPotentialPhase[] {
  return ACTION_POTENTIAL_PHASES;
}

export function getIonChannelById(channelId: string): IonChannelFamily | null {
  return ION_CHANNEL_FAMILIES.find((ch) => ch.id === channelId) ?? null;
}

export function getAllIonChannels(): readonly IonChannelFamily[] {
  return ION_CHANNEL_FAMILIES;
}

export function getVaughanWilliamsClasses(): readonly VaughanWilliamsClassInfo[] {
  return VAUGHAN_WILLIAMS_CLASSES;
}

export function getTissueModel(type: "ventricular" | "nodal"): TissueModel {
  return TISSUE_MODELS[type];
}

export function getArrhythmiaMechanisms(): readonly ArrhythmiaMechanism[] {
  return ARRHYTHMIA_MECHANISMS;
}

export function getCardiacElectrophysiologyProfile(
  drugId: string,
): CardiacDrugElectrophysiologyProfile | null {
  const norm = drugId.trim().toLowerCase();
  return CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE[norm] ?? null;
}

/**
 * Detects electrophysiological and channel-level arrhythmia collisions on a tray of drugs.
 */
export function detectArrhythmiaCollisions(drugIds: string[]): ArrhythmiaCollision[] {
  const normalizedIds = Array.from(new Set(drugIds.map((id) => id.trim().toLowerCase())));
  const collisions: ArrhythmiaCollision[] = [];

  const profiles = normalizedIds
    .map((id) => CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE[id])
    .filter((p): p is CardiacDrugElectrophysiologyProfile => p !== null && p !== undefined);

  if (profiles.length === 0) return collisions;

  // Groupings
  const ikrBlockers = profiles.filter((p) => p.ikRBlocker);
  const nav15Blockers = profiles.filter((p) => p.nav15Blocker);
  const nodalSlowers = profiles.filter((p) => p.nodalConductionSlowing);
  const betaBlockers = profiles.filter((p) => p.vaughanWilliamsClass === "II");
  const nonDhpCcbs = profiles.filter((p) => p.vaughanWilliamsClass === "IV");
  const digoxinProfile = profiles.find((p) => p.drugId === "digoxin");
  const reverseUseBlockers = profiles.filter(
    (p) => p.drugId === "sotalol" || p.drugId === "dofetilide" || p.drugId === "quinidine",
  );

  // 1. Dual / Multi-IKr Blockade (Severe EAD / TdP Risk)
  if (ikrBlockers.length >= 2) {
    const isHighPotency = ikrBlockers.some(
      (d) => d.vaughanWilliamsClass === "III" || d.vaughanWilliamsClass === "IA",
    );
    collisions.push({
      id: "multi-ikr-blockade",
      title: "Multi-Hit IKr (hERG) Blockade: Repolarization Reserve Collapse",
      severity: isHighPotency ? "critical" : "high",
      category: "qt-ead-collision",
      drugIds: ikrBlockers.map((d) => d.drugId),
      involvedDrugs: ikrBlockers.map((d) => ({
        id: d.drugId,
        name: d.drugName,
        role: `IKr (hERG) channel blocker (${d.vaughanWilliamsClass !== "none" ? d.vaughanWilliamsClass : "Off-target"})`,
      })),
      primaryMechanism:
        "Cumulative pharmacological inhibition of outward rapid delayed rectifier potassium current (IKr via hERG / KCNH2) across Phase 3 repolarization.",
      electrophysiologicalRisk:
        "Profound lengthening of ventricular action potential duration (APD) and surface QTc interval. Promotes Cav1.2 L-type calcium window current reactivation, triggering Phase 2 and Phase 3 Early Afterdepolarizations (EADs) and Torsades de Pointes.",
      ecgMarkers: "Progressive QTc prolongation (> 500 ms), T-wave flattening or bifid notched T-waves, prominent U-waves, ventricular couplets.",
      clinicalSurveillance:
        "Continuous 12-lead telemetry monitoring; baseline and serial QTc intervals; serum potassium maintained >= 4.0 mEq/L and magnesium >= 2.0 mg/dL.",
      biophysicalExplanation:
        "Normal repolarization reserve relies on IKr and IKs to counterbalance persistent inward currents. Dual inhibition eliminates reserve, causing unpredictable APD prolongation and pause-dependent triggered activity.",
    });
  }

  // 2. Dual Nav1.5 Sodium Channel Blockade (Conduction Velocity Collapse & QRS Widening)
  if (nav15Blockers.length >= 2) {
    const hasClassIC = nav15Blockers.some((d) => d.vaughanWilliamsClass === "IC");
    collisions.push({
      id: "dual-nav15-blockade",
      title: "Additive Nav1.5 Conduction Velocity Depression & QRS Prolongation",
      severity: hasClassIC ? "critical" : "high",
      category: "qrs-conduction-collision",
      drugIds: nav15Blockers.map((d) => d.drugId),
      involvedDrugs: nav15Blockers.map((d) => ({
        id: d.drugId,
        name: d.drugName,
        role: `Nav1.5 (INa) fast sodium blocker (${d.vaughanWilliamsClass})`,
      })),
      primaryMechanism:
        "Concurrent suppression of voltage-gated Nav1.5 sodium channel conductance during Phase 0 rapid depolarization upstroke.",
      electrophysiologicalRisk:
        "Marked reduction in upstroke velocity (dV/dt max) and myocardial conduction velocity. Expands ventricular activation time, creating extensive slow-conduction pathways and critical re-entrant loops.",
      ecgMarkers: "Progressive QRS duration widening (> 120 ms or > 25-50% over baseline), terminal conduction delay, right bundle branch block morphology.",
      clinicalSurveillance:
        "Serial 12-lead ECGs; monitor QRS width closely at rest and with exertion; evaluate for underlying structural or ischemic cardiomyopathy.",
      biophysicalExplanation:
        "By depressing dV/dt max across the working myocardium, dual sodium channel blockers convert normal homogeneous activation into fragmented, heterogeneous conduction wavefronts susceptible to unidirectional block and lethal circus re-entry.",
    });
  }

  // 3. Synergistic AV Nodal Conduction Block (Beta-Blocker + Non-DHP CCB)
  if (betaBlockers.length >= 1 && nonDhpCcbs.length >= 1) {
    const involved = [...betaBlockers, ...nonDhpCcbs];
    collisions.push({
      id: "synergistic-av-nodal-block",
      title: "Synergistic AV Nodal Conduction Suppression: High-Grade Heart Block Risk",
      severity: "critical",
      category: "av-block-collision",
      drugIds: involved.map((d) => d.drugId),
      involvedDrugs: involved.map((d) => ({
        id: d.drugId,
        name: d.drugName,
        role: d.vaughanWilliamsClass === "II" ? "Class II Beta-blocker (Gs / cAMP suppression)" : "Class IV Non-DHP CCB (Cav1.2 pore blocker)",
      })),
      primaryMechanism:
        "Dual-mechanism suppression of AV nodal Phase 0 upstroke (Cav1.2 block) combined with sympathetic autonomic withdrawal (Beta-1 receptor antagonism).",
      electrophysiologicalRisk:
        "Profound depression of SA and AV nodal automaticity and dromotropy. Markedly slows or halts decremental conduction across the AV node, precipitating severe sinus bradycardia, sinus arrest, or complete third-degree AV block.",
      ecgMarkers: "Marked PR interval prolongation (> 240 ms), Mobitz I (Wenckebach) or Mobitz II AV block, 2:1 conduction, junctional escape rhythm.",
      clinicalSurveillance:
        "Continuous heart rate and PR interval surveillance; monitor for syncope, presyncope, and hypotension; bedside transcutaneous pacing availability.",
      biophysicalExplanation:
        "Nodal pacemakers lack fast Nav1.5 channels and depend entirely on Cav1.2 and HCN4. Beta-blockers remove the adrenergic cAMP drive that enhances Cav1.2 and If, while Non-DHP CCBs directly occlude Cav1.2 pores. The synergy can entirely extinguish AV node transmission.",
    });
  }

  // 4. Digoxin + AV Nodal Conduction Suppressors (Beta-blockers or Non-DHP CCBs)
  if (digoxinProfile && (betaBlockers.length >= 1 || nonDhpCcbs.length >= 1)) {
    const nodalPartners = [...betaBlockers, ...nonDhpCcbs];
    const allInvolved = [digoxinProfile, ...nodalPartners];
    collisions.push({
      id: "digoxin-nodal-synergy",
      title: "Digoxin Vagomimetic Synergy with Nodal Depressants: Extreme AV Conduction Delay",
      severity: "high",
      category: "av-block-collision",
      drugIds: allInvolved.map((d) => d.drugId),
      involvedDrugs: allInvolved.map((d) => ({
        id: d.drugId,
        name: d.drugName,
        role: d.drugId === "digoxin" ? "Cardiac glycoside (central vagal tone stimulator)" : `Class ${d.vaughanWilliamsClass} nodal blocker`,
      })),
      primaryMechanism:
        "Digoxin-induced central and peripheral vagal parasympathetic stimulation coupled with pharmacologic Cav1.2 or Beta-1 blockade at the AV node.",
      electrophysiologicalRisk:
        "Profound PR prolongation, high-grade AV nodal block, and severe symptomatic bradycardia.",
      ecgMarkers: "PR prolongation, scooped ST segments, slow ventricular response in atrial fibrillation (< 50 bpm).",
      clinicalSurveillance:
        "Serial ECGs; evaluate resting heart rate; assess serum digoxin concentrations and renal clearance.",
      biophysicalExplanation:
        "Digoxin activates vagal efferent pathways that open IK,ACh channels in the AV node, hyperpolarizing nodal cells while beta-blockers or CCBs eliminate compensatory sympathetic upstroke currents.",
    });
  }

  // 5. Digoxin DAD & Intracellular Calcium Collision (Digoxin + Amiodarone or Quinidine or Verapamil)
  if (digoxinProfile) {
    const interactingDrugs = profiles.filter(
      (p) => p.drugId === "amiodarone" || p.drugId === "quinidine" || p.drugId === "verapamil",
    );
    if (interactingDrugs.length > 0) {
      const allInvolved = [digoxinProfile, ...interactingDrugs];
      collisions.push({
        id: "digoxin-calcium-dad-collision",
        title: "Digoxin Toxicity & Delayed Afterdepolarization (DAD) Triggering Amplification",
        severity: "critical",
        category: "dad-calcium-collision",
        drugIds: allInvolved.map((d) => d.drugId),
        involvedDrugs: allInvolved.map((d) => ({
          id: d.drugId,
          name: d.drugName,
          role: d.drugId === "digoxin" ? "Cardiac glycoside (Na+/K+ ATPase inhibitor)" : "P-gp / clearance inhibitor + electrophysiologic modifier",
        })),
        primaryMechanism:
          "P-glycoprotein (ABCB1) transport inhibition markedly elevates serum digoxin levels (approx 2-fold spike), accelerating Na+/K+ ATPase shutdown, severe SR calcium loading, and forward NCX1 Iti generation.",
      electrophysiologicalRisk:
        "Diastolic sarcoplasmic reticulum calcium overload triggers spontaneous calcium waves that engage electrogenic NCX1, creating Phase 4 Delayed Afterdepolarizations (DADs). Leads to polymorphic/bidirectional ventricular tachycardia, accelerated junctional rhythms, and fatal ventricular fibrillation.",
      ecgMarkers: "Frequent premature ventricular complexes (bigeminy/trigeminy), bidirectional VT, junctional tachycardia with AV dissociation, PR prolongation.",
      clinicalSurveillance:
        "Serum digoxin concentration monitoring; mandatory digoxin dose reduction (~50%) when adding amiodarone/verapamil/quinidine; serum potassium and magnesium surveillance.",
      biophysicalExplanation:
        "Digoxin blocks Na+/K+ ATPase, raising intracellular Na+ which forces reverse NCX mode. When combined with pharmacokinetic inhibitors, toxic intracellular Ca2+ levels precipitate spontaneous diastolic RyR2 opening and massive Iti inward currents.",
      });
    }
  }

  // 6. Reverse Use-Dependence Trapping (Class III IKr Blocker + Bradycardic Agent)
  if (reverseUseBlockers.length >= 1 && nodalSlowers.length >= 1) {
    const bradycardics = nodalSlowers.filter((p) => !reverseUseBlockers.some((r) => r.drugId === p.drugId));
    if (bradycardics.length > 0) {
      const involved = [...reverseUseBlockers, ...bradycardics];
      collisions.push({
        id: "reverse-use-dependence-trapping",
        title: "Reverse Use-Dependence Repolarization Trapping: Bradycardia-Induced EAD / TdP Escalation",
        severity: "high",
        category: "reverse-use-dependence-collision",
        drugIds: involved.map((d) => d.drugId),
        involvedDrugs: involved.map((d) => ({
          id: d.drugId,
          name: d.drugName,
          role: reverseUseBlockers.some((r) => r.drugId === d.drugId)
            ? "Class III / IA IKr blocker (reverse use-dependence)"
            : "Nodal depressant / Bradycardic agent",
        })),
        primaryMechanism:
          "Bradycardic drug decelerates heart rate and prolongs diastolic interval, directly triggering the reverse use-dependence phenomenon of IKr potassium channel blockers.",
        electrophysiologicalRisk:
          "Directly triggers the reverse use-dependence phenomenon: slowing of heart rate paradoxically maximizes hERG channel blockade and action potential duration prolongation. Markedly elevates the incidence of Phase 2 and 3 Early Afterdepolarizations (EADs) and pause-dependent Torsades de Pointes.",
        ecgMarkers: "Profound QTc prolongation during nocturnal or resting bradycardia; broad notched T waves; pause-dependent ventricular ectopy.",
        clinicalSurveillance:
          "Holter / telemetry tracking for pause-dependent ectopy; heart rate maintained >= 60-70 bpm; serum electrolytes strictly maintained; dose adjustment of nodal agent.",
        biophysicalExplanation:
          "At fast rates, repolarization reserve and channel gating reduce sotalol/dofetilide/quinidine efficacy. At slow heart rates, complete channel deactivation and specific drug-receptor kinetics result in disproportionately greater IKr blockade, creating critical repolarization instability.",
      });
    }
  }

  return collisions;
}
