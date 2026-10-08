/**
 * Comprehensive Neuromuscular Blockade (NMBA), Electrophysiologic Monitoring (TOF/PTC),
 * Sugammadex Cyclodextrin Encapsulation Kinetics, Anticholinesterase Reversal,
 * and ICU Sedation-Analgesia / Delirium (PADIS) Reference Engine.
 *
 * Authored from the clinical perspective of an MD (Anesthesiologist & Neuro-Intensivist)
 * & PharmD (Surgical Critical Care Pharmacotherapy Specialist) and Senior Software Engineer.
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed anesthesiologists, neuro-intensivists, critical care physicians,
 *   trauma surgeons, clinical pharmacologists, clinical pharmacists (PharmD), and supervised
 *   health-professions trainees in accredited programs.
 * - Displays transparent physiological, biochemical, electrophysiologic, and clinical trial
 *   rationale derived from peer-reviewed literature (2023 ASA Guidelines for Neuromuscular
 *   Monitoring and Reversal, SCCM PADIS Guidelines, Miller's Anesthesia, Goodman & Gilman).
 * - Enables independent clinical verification of the scientific basis of all reversal
 *   strategies, TOF interpretations, dosing nomograms, and ICU sedation safety matrices.
 * - STRICTLY NON-PRESCRIPTIVE: Does NOT generate automated medical orders, does NOT emit
 *   closed-loop infusion commands, and does NOT replace individualized bedside clinical
 *   evaluation, institutional anesthesia protocols, or the FDA-approved Prescribing Information.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. STATUTORY REGULATORY DISCLAIMER (FD&C Act § 520(o)(1)(E))
// ============================================================================

export const ANESTHESIA_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational neuromuscular blockade, reversal kinetics, and critical care sedation reference engine is intended solely for licensed healthcare professionals (anesthesiologists, intensivists, surgeons, clinical pharmacists) and supervised health-professions students. It models electrophysiologic Train-of-Four (TOF) depth, cyclodextrin guest-host encapsulation thermodynamics, anticholinesterase ceiling limitations, succinylcholine extrajunctional hyperkalemia mechanics, and SCCM PADIS ICU sedation/PRIS thresholds to enable independent clinical verification of patient care strategies. It does not provide automated diagnostic conclusions, does not generate medical orders or infusion pump directives, and does not replace individualized bedside clinical evaluation or the FDA-approved Prescribing Information.";

// ============================================================================
// 2. NMBA TAXONOMY, AGENT PROFILES & KINETIC REGISTRY
// ============================================================================

export type NMBAClass =
  | "depolarizing"
  | "non-depolarizing-aminosteroid"
  | "non-depolarizing-benzylisoquinolinium";

export type NMBAId =
  | "succinylcholine"
  | "rocuronium"
  | "vecuronium"
  | "cisatracurium"
  | "atracurium"
  | "pancuronium";

export type ReversalClass =
  | "cyclodextrin-encapsulation"
  | "acetylcholinesterase-inhibitor"
  | "antimuscarinic-anticholinergic";

export type ReversalAgentId =
  | "sugammadex"
  | "neostigmine"
  | "glycopyrrolate"
  | "atropine";

export type SedativeAgentId =
  | "propofol"
  | "dexmedetomidine"
  | "midazolam"
  | "lorazepam";

export interface NMBAProfile {
  id: NMBAId;
  name: string;
  brandNames: string[];
  class: NMBAClass;
  mechanism: string;
  intubationDose: string;
  onset: string;
  durationMinutes: string;
  eliminationPathway: string;
  organIndependence: boolean;
  activeMetabolites: string;
  histamineRelease: "none" | "minimal" | "moderate" | "significant";
  sugammadexReversibility: "high" | "moderate" | "none";
  sugammadexAffinityKdMicroMolar: number | null; // Kd in micromolar (lower = tighter)
  associationConstantKaMolar: string;
  clinicalPearls: string[];
  keyWarnings: string[];
}

export const NMBA_PROFILES: Record<NMBAId, NMBAProfile> = {
  succinylcholine: {
    id: "succinylcholine",
    name: "Succinylcholine (Suxamethonium)",
    brandNames: ["Anectine", "Quelicin"],
    class: "depolarizing",
    mechanism:
      "Nicotinic acetylcholine receptor (nAChR) agonist at the motor endplate. Binds to alpha-subunits causing prolonged membrane depolarization. Produces Phase I block (muscle fasciculations, lack of fade on TOF) followed by Phase II block (desensitization, marked fade) with repeated or large cumulative doses (> 4-5 mg/kg).",
    intubationDose: "1.0 - 1.5 mg/kg IV (RSI); 2.0 - 3.0 mg/kg IM (pediatric salvage)",
    onset: "30 - 60 seconds",
    durationMinutes: "5 - 10 minutes (normal BChE activity)",
    eliminationPathway:
      "Rapid two-step hydrolysis by plasma pseudocholinesterase (butyrylcholinesterase / BChE) to succinylmonocholine (weak block) then to choline and succinic acid. Less than 2% eliminated unchanged renally.",
    organIndependence: true,
    activeMetabolites: "Succinylmonocholine (1/20th to 1/80th neuromuscular blocking potency)",
    histamineRelease: "minimal",
    sugammadexReversibility: "none",
    sugammadexAffinityKdMicroMolar: null,
    associationConstantKaMolar: "0 M⁻¹ (Zero encapsulation affinity)",
    clinicalPearls: [
      "Gold standard for ultrarapid intubation when immediate offset is required, but carried with severe metabolic and hyperkalemic liabilities.",
      "Phase I block is augmented, NOT reversed, by neostigmine (anticholinesterases inhibit BChE, prolonging succinylcholine duration).",
      "Trigger agent for Malignant Hyperthermia (MH) via ryanodine receptor (RYR1) activation, especially when paired with volatile halogenated anesthetics.",
    ],
    keyWarnings: [
      "ACUTE LETHAL HYPERKALEMIA: Extrajunctional nAChR upregulation in severe burns (> 24-48h post-injury), denervation/spinal cord injury (> 72h), prolonged ICU immobilization, and neuromuscular diseases (ALS, muscular dystrophy) causes massive potassium efflux (+3.0 to > 5.0 mEq/L surge, provoking cardiac arrest).",
      "PSEUDOCHOLINESTERASE DEFICIENCY: Atypical BChE genetic variants (homozygous atypical EaEa: Dibucaine number < 20-30) or acquired liver failure prolong apnea from 5-10 minutes to 4-8+ hours.",
      "SUGAMMADEX INEFFECTIVE: Sugammadex has zero affinity for succinylcholine. Reversal is strictly supportive (continued mechanical ventilation).",
    ],
  },
  rocuronium: {
    id: "rocuronium",
    name: "Rocuronium",
    brandNames: ["Zemuron", "Esmeron"],
    class: "non-depolarizing-aminosteroid",
    mechanism:
      "Competitive antagonism at postsynaptic nicotinic acetylcholine receptors (nAChRs) at the neuromuscular junction, preventing acetylcholine-induced endplate depolarization.",
    intubationDose: "0.6 mg/kg IV (standard intubation); 1.0 - 1.2 mg/kg IV (rapid sequence induction / RSI)",
    onset: "60 - 90 seconds (60s at 1.2 mg/kg RSI dose)",
    durationMinutes: "30 - 60 minutes (prolonged to 60-90+ min at 1.2 mg/kg RSI dose)",
    eliminationPathway:
      "Predominantly hepatic uptake and biliary excretion (~70% unchanged in feces/bile); renal excretion accounts for ~20-30%.",
    organIndependence: false,
    activeMetabolites: "17-desacetylrocuronium (trace, minimal blocking activity)",
    histamineRelease: "none",
    sugammadexReversibility: "high",
    sugammadexAffinityKdMicroMolar: 0.1, // Kd ~ 0.1 uM
    associationConstantKaMolar: "1.0 × 10⁷ M⁻¹ (Highest affinity guest-host complex)",
    clinicalPearls: [
      "Primary aminosteroid for RSI (1.2 mg/kg provides intubation conditions comparable to succinylcholine at 60 seconds).",
      "Preferred target for Sugammadex encapsulation due to sub-micromolar dissociation constant (Kd ~ 0.1 µM).",
      "Absence of active metabolites provides cleaner pharmacokinetics than vecuronium or pancuronium.",
    ],
    keyWarnings: [
      "Prolonged clearance in severe hepatic cirrhosis and severe renal impairment.",
      "Critical displacement risk: Postoperative administration of toremifene or flucloxacillin can displace rocuronium from sugammadex, causing delayed recurarization.",
    ],
  },
  vecuronium: {
    id: "vecuronium",
    name: "Vecuronium",
    brandNames: ["Norcuron"],
    class: "non-depolarizing-aminosteroid",
    mechanism:
      "Competitive antagonism at postsynaptic nAChRs on skeletal muscle motor endplates.",
    intubationDose: "0.08 - 0.1 mg/kg IV",
    onset: "2.5 - 3.0 minutes",
    durationMinutes: "30 - 45 minutes",
    eliminationPathway:
      "Hepatic metabolism (deacetylation 40-50%) and biliary excretion (40-60%); renal excretion (20-30%).",
    organIndependence: false,
    activeMetabolites:
      "3-desacetylvecuronium (~50% neuromuscular blocking potency of parent; accumulates in renal failure)",
    histamineRelease: "none",
    sugammadexReversibility: "high",
    sugammadexAffinityKdMicroMolar: 1.5, // Kd ~ 1.5 uM
    associationConstantKaMolar: "6.7 × 10⁵ M⁻¹ (High affinity guest-host complex)",
    clinicalPearls: [
      "Lacks cardiovascular vagolytic effects; highly cardiostable with minimal tachycardia or blood pressure fluctuation.",
      "Powder formulation requiring reconstitution with sterile water before administration.",
    ],
    keyWarnings: [
      "Renal accumulation: 3-desacetylvecuronium accumulates during continuous ICU infusions in acute kidney injury, resulting in prolonged persistent paralysis.",
      "Sugammadex provides rapid reversal (2 or 4 mg/kg), though association constant is ~15-fold lower than rocuronium.",
    ],
  },
  pancuronium: {
    id: "pancuronium",
    name: "Pancuronium",
    brandNames: ["Pavulon"],
    class: "non-depolarizing-aminosteroid",
    mechanism:
      "Long-acting competitive antagonism at postsynaptic nAChRs, with concurrent vagolytic (antimuscarinic) action at cardiac M2 receptors.",
    intubationDose: "0.08 - 0.1 mg/kg IV",
    onset: "3.0 - 5.0 minutes",
    durationMinutes: "60 - 100 minutes (prolonged in elderly or renal failure)",
    eliminationPathway:
      "Predominantly renal excretion (60-80% unchanged drug); hepatic deacetylation (15-20%).",
    organIndependence: false,
    activeMetabolites: "3-hydroxypancuronium (~50% blocking activity, renally cleared)",
    histamineRelease: "minimal",
    sugammadexReversibility: "moderate",
    sugammadexAffinityKdMicroMolar: 3.5, // Kd ~ 3.5 uM
    associationConstantKaMolar: "2.9 × 10⁵ M⁻¹ (Moderate affinity guest-host complex)",
    clinicalPearls: [
      "Produces moderate vagolytic tachycardia and sympathetic stimulation via norepinephrine reuptake blockade.",
      "Rarely chosen in modern ambulatory or fast-track anesthesia due to prolonged duration and post-op residual curarization risks.",
    ],
    keyWarnings: [
      "Severe accumulation in renal impairment: Avoid in patients with CrCl < 50 mL/min.",
      "Sugammadex reversal is NOT FDA-approved for pancuronium (lower affinity Kd ~ 3.5 µM; off-label rescue only).",
    ],
  },
  cisatracurium: {
    id: "cisatracurium",
    name: "Cisatracurium",
    brandNames: ["Nimbex"],
    class: "non-depolarizing-benzylisoquinolinium",
    mechanism:
      "Intermediate-acting 1R-cis, 1'R-cis stereoisomer of atracurium. Competitive antagonism at postsynaptic nAChRs.",
    intubationDose: "0.15 - 0.2 mg/kg IV (intubation); 1.0 - 3.0 mcg/kg/min (ICU ARDS infusion)",
    onset: "2.0 - 3.0 minutes",
    durationMinutes: "45 - 60 minutes",
    eliminationPathway:
      "Organ-independent Hofmann elimination (~80%, non-enzymatic spontaneous chemical degradation at physiologic pH 7.40 and temp 37°C into laudanosine and monoquaternary acrylate) and non-specific plasma ester hydrolysis.",
    organIndependence: true,
    activeMetabolites:
      "Laudanosine (tertiary amine with potential CNS stimulant/seizure threshold lowering properties, but generated at ~1/5th to 1/10th levels compared to atracurium)",
    histamineRelease: "none",
    sugammadexReversibility: "none",
    sugammadexAffinityKdMicroMolar: null,
    associationConstantKaMolar: "0 M⁻¹ (Zero encapsulation affinity; structural incompatibility)",
    clinicalPearls: [
      "DRUG OF CHOICE IN MULTI-ORGAN FAILURE: Metabolism is completely independent of hepatic and renal function (ESRD, AKI, cirrhosis, hepatic failure).",
      "Historical standard in ARDS neuromuscular blockade trials (ROSE / ACURASYS) due to predictable organ-independent clearance and absence of tachyphylaxis.",
      "Does not trigger histamine release, unlike parent atracurium.",
    ],
    keyWarnings: [
      "SUGAMMADEX ZERO AFFINITY: Sugammadex is completely ineffective for cisatracurium reversal. Attempting sugammadex reversal leads to failed recovery and catastrophic unreversed paralysis.",
      "Reversal requires conventional anticholinesterase therapy (Neostigmine + Glycopyrrolate) after spontaneous return of at least 2, preferably 4 twitches on TOF.",
    ],
  },
  atracurium: {
    id: "atracurium",
    name: "Atracurium",
    brandNames: ["Tracrium"],
    class: "non-depolarizing-benzylisoquinolinium",
    mechanism:
      "Racemic mixture of 10 stereoisomers. Competitive antagonism at postsynaptic nAChRs.",
    intubationDose: "0.4 - 0.5 mg/kg IV",
    onset: "2.0 - 2.5 minutes",
    durationMinutes: "30 - 45 minutes",
    eliminationPathway:
      "Spontaneous Hofmann elimination (~33%) and non-specific plasma ester hydrolysis (~66%).",
    organIndependence: true,
    activeMetabolites:
      "Laudanosine (crosses blood-brain barrier; epileptogenic in high animal concentrations; accumulates with prolonged high-dose infusions in renal/hepatic failure)",
    histamineRelease: "moderate",
    sugammadexReversibility: "none",
    sugammadexAffinityKdMicroMolar: null,
    associationConstantKaMolar: "0 M⁻¹ (Zero encapsulation affinity)",
    clinicalPearls: [
      "Organ-independent clearance via spontaneous chemical degradation.",
      "Can precipitate significant histamine release (dose- and injection-speed dependent), causing cutaneous flushing, transient hypotension, and bronchospasm.",
    ],
    keyWarnings: [
      "SUGAMMADEX INEFFECTIVE: Zero affinity. Requires neostigmine + glycopyrrolate reversal.",
      "Histamine release caution in severe reactive airway disease / brittle asthma.",
    ],
  },
};

export const ALL_NMBA_IDS: NMBAId[] = [
  "succinylcholine",
  "rocuronium",
  "vecuronium",
  "cisatracurium",
  "atracurium",
  "pancuronium",
];

export const AMINOSTEROID_NMBA_IDS: NMBAId[] = [
  "rocuronium",
  "vecuronium",
  "pancuronium",
];

export const BENZYLISOQUINOLINIUM_NMBA_IDS: NMBAId[] = [
  "cisatracurium",
  "atracurium",
];

export const DEPOLARIZING_NMBA_IDS: NMBAId[] = ["succinylcholine"];

// ============================================================================
// 3. REVERSAL AGENTS TAXONOMY & PROFILES
// ============================================================================

export interface ReversalProfile {
  id: ReversalAgentId;
  name: string;
  brandNames: string[];
  class: ReversalClass;
  mechanism: string;
  molecularTarget: string;
  dosingSummary: string;
  ceilingEffect: boolean;
  coAdministrationRequirement?: string;
  clinicalPearls: string[];
  keyWarnings: string[];
}

export const REVERSAL_PROFILES: Record<ReversalAgentId, ReversalProfile> = {
  sugammadex: {
    id: "sugammadex",
    name: "Sugammadex",
    brandNames: ["Bridion"],
    class: "cyclodextrin-encapsulation",
    mechanism:
      "Modified gamma-cyclodextrin macrocycle (8 glucopyranose units with lipophilic internal cavity and 8 negatively charged thioether carboxylate side chains). Forms a tight 1:1 guest-host inclusion complex encapsulating the lipophilic steroidal core of rocuronium or vecuronium, rapidly decreasing free plasma NMBA concentration and driving a biophase concentration gradient from neuromuscular junction back into plasma. The complex is biologically inert and excreted unchanged via the kidneys.",
    molecularTarget:
      "Free aminosteroid molecules (Rocuronium Kd ~ 0.1 µM > Vecuronium Kd ~ 1.5 µM >> Pancuronium Kd ~ 3.5 µM). Zero binding to benzylisoquinolines or succinylcholine.",
    dosingSummary:
      "Weight-based on ACTUAL body weight: 2 mg/kg for moderate block (reappearance of T2 on TOF); 4 mg/kg for deep block (PTC 1-2, 0 twitches on TOF); 16 mg/kg for immediate rescue reversal post-rocuronium 1.2 mg/kg.",
    ceilingEffect: false,
    clinicalPearls: [
      "Can reverse any depth of aminosteroid blockade (including intense and deep block where neostigmine is completely ineffective).",
      "Dosing MUST be calculated using actual total body weight (TBW), not ideal or adjusted body weight, even in morbidly obese patients.",
      "Renally excreted intact: In severe renal impairment (CrCl < 30 mL/min or ESRD on dialysis), clearance is prolonged (complex persists for days), though recurrence of blockade has not been demonstrated in clinical trials; high-flux dialysis clears the complex.",
    ],
    keyWarnings: [
      "HORMONAL CONTRACEPTIVE COLLISION: Sugammadex binds progesterone and estrogen in its cyclodextrin cavity, reducing free active steroid exposure by ~34% (equivalent to missing one daily pill). MANDATORY COUNSELING: Patients on hormonal contraceptives MUST use additional non-hormonal back-up contraception (e.g. barrier method) for 7 consecutive days post-administration.",
      "DISPLACEMENT INTERACTIONS: Toremifene (Fareston) and IV Flucloxacillin competitively bind cyclodextrin, displacing rocuronium/vecuronium and triggering delayed recurarization and post-op respiratory arrest.",
      "COAGULATION ASSAY ARTIFACT: Causes transient in vitro prolongation of aPTT and PT/INR by up to 25-30% for 30-60 min post-dose due to phospholipid sequestering in test reagents; not associated with clinical hemorrhage.",
      "ANAPHYLAXIS: Rare hypersensitivity/anaphylaxis (~0.3% in volunteer studies, mediated by cyclodextrin recognition without prior exposure); monitor for urticaria, bronchospasm, and circulatory collapse.",
    ],
  },
  neostigmine: {
    id: "neostigmine",
    name: "Neostigmine Methylsulfate",
    brandNames: ["Bloxiverz", "Prostigmin"],
    class: "acetylcholinesterase-inhibitor",
    mechanism:
      "Reversible carbamate acetylcholinesterase inhibitor (AChE-I). Carbamylates the esteratic site of acetylcholinesterase, delaying acetylcholine hydrolysis and massively elevating synaptic acetylcholine at the neuromuscular junction, which competitively displaces non-depolarizing NMBAs from postsynaptic nicotinic receptors.",
    molecularTarget:
      "Acetylcholinesterase (AChE) and pseudocholinesterase (BChE). Indiscriminately increases acetylcholine at both nicotinic and muscarinic synapses.",
    dosingSummary:
      "0.03 - 0.07 mg/kg IV (max single dose 5.0 mg). MUST be co-administered with Glycopyrrolate (0.2 mg glycopyrrolate per 1.0 mg neostigmine) to block lethal muscarinic hyperstimulation.",
    ceilingEffect: true,
    coAdministrationRequirement:
      "Mandatory co-administration with Glycopyrrolate (0.2 mg glycopyrrolate per 1 mg neostigmine) to prevent severe bradycardia, asystole, bronchospasm, and copious secretions.",
    clinicalPearls: [
      "CEILING EFFECT: Acetylcholinesterase inhibition is saturable and depends on endogenous ACh release. Neostigmine CANNOT reverse deep block (0 twitches on TOF, PTC 0-2).",
      "PARADOXICAL WEAKNESS HAZARD: Administering neostigmine when recovery is near complete (TOF ratio ≥ 0.90) causes synaptic ACh flood, desensitizing nicotinic receptors, inducing open-channel block, and paradoxically worsening muscle weakness and respiratory fatigue.",
      "Onset is slow (7 - 10 minutes to peak effect), requiring patient to remain monitored and intubated until quantitative TOF ratio reaches ≥ 0.90.",
    ],
    keyWarnings: [
      "SEVERE MUSCARINIC HYPERSTIMULATION: Without anticholinergic co-administration, neostigmine induces profound bradycardia, complete heart block, asystole, severe bronchospasm, hypersalivation, and increased intestinal motility.",
      "INEFFECTIVE IN DEEP BLOCKADE: Administration with 0 twitches on TOF fails to reverse block and leaves the patient paralyzed and at risk for postoperative pulmonary complications (POPC).",
    ],
  },
  glycopyrrolate: {
    id: "glycopyrrolate",
    name: "Glycopyrrolate",
    brandNames: ["Robinul"],
    class: "antimuscarinic-anticholinergic",
    mechanism:
      "Synthetic quaternary ammonium antimuscarinic agent. Competitively blocks muscarinic M1, M2, and M3 receptors in cardiac, bronchial, and secretory tissues.",
    molecularTarget: "Peripheral muscarinic acetylcholine receptors (M1, M2, M3).",
    dosingSummary:
      "0.2 mg IV for every 1.0 mg of neostigmine administered (1:5 weight ratio). Example: 3 mg neostigmine paired with 0.6 mg glycopyrrolate, administered simultaneously or pre-mixed.",
    ceilingEffect: false,
    clinicalPearls: [
      "QUATERNARY AMINE: Possesses a permanent positive charge, preventing penetration through the intact blood-brain barrier. Does NOT cause central anticholinergic syndrome, sedation, or postoperative delirium (unlike tertiary amine Atropine).",
      "Slightly slower onset of vagolytic action compared to atropine, matching the 7-10 minute onset curve of neostigmine precisely.",
    ],
    keyWarnings: [
      "Tachycardia, urinary retention, precipitation of acute angle-closure glaucoma in predisposed anatomical eyes.",
      "Failure to administer alongside neostigmine results in uninhibited muscarinic bradycardia and potential asystole.",
    ],
  },
  atropine: {
    id: "atropine",
    name: "Atropine Sulfate",
    brandNames: ["AtroPen"],
    class: "antimuscarinic-anticholinergic",
    mechanism:
      "Tertiary amine antimuscarinic alkaloid. Competitive antagonist at all muscarinic acetylcholine receptors.",
    molecularTarget: "Peripheral and central muscarinic receptors (crosses blood-brain barrier).",
    dosingSummary:
      "0.015 - 0.03 mg/kg IV (alternative pairing with edrophonium or neostigmine; typically 0.4 - 1.0 mg IV).",
    ceilingEffect: false,
    clinicalPearls: [
      "TERTIARY AMINE: Readily crosses the blood-brain barrier; can trigger central anticholinergic syndrome, agitation, confusion, and ICU delirium in elderly patients.",
      "Faster vagolytic onset than glycopyrrolate; traditionally paired with rapid-onset edrophonium (Enlon) rather than neostigmine.",
    ],
    keyWarnings: [
      "Central anticholinergic toxicity: Restlessness, hallucinations, hyperthermia, and delirium.",
      "Excessive tachycardia in patients with coronary artery disease (increases myocardial oxygen demand).",
    ],
  },
};

// ============================================================================
// 4. ICU SEDATIVE PROFILES (PADIS & PRIS SAFETY MATRIX)
// ============================================================================

export interface SedativeProfile {
  id: SedativeAgentId;
  name: string;
  brandNames: string[];
  class: string;
  mechanism: string;
  icuDosing: string;
  padisGuidelineRole: string;
  deliriumRisk: "low-delirium-sparing" | "moderate" | "high-independent-risk-factor";
  respiratoryDepression: boolean;
  hemodynamicProfile: string;
  clinicalPearls: string[];
  keyWarnings: string[];
}

export const SEDATIVE_PROFILES: Record<SedativeAgentId, SedativeProfile> = {
  propofol: {
    id: "propofol",
    name: "Propofol",
    brandNames: ["Diprivan"],
    class: "Alkylphenol IV hypnotic emulsion",
    mechanism:
      "Positive allosteric modulator of GABA_A receptors, enhancing inhibitory GABAergic neurotransmission. In addition, blocks NMDA receptors and modulates cannabinoid CB1 signaling.",
    icuDosing:
      "ICU sedation: 5 - 50 mcg/kg/min (0.3 - 3.0 mg/kg/h). Strictly avoid infusions > 4-5 mg/kg/h (> 67-83 mcg/kg/min) or duration > 48 hours to prevent PRIS.",
    padisGuidelineRole:
      "First-line non-benzodiazepine sedative in mechanically ventilated ICU patients alongside dexmedetomidine. Facilitates rapid neurological awakening and spontaneous breathing trials due to lipophilic redistribution.",
    deliriumRisk: "moderate",
    respiratoryDepression: true,
    hemodynamicProfile:
      "Dose-dependent arterial vasodilation, venous pooling (decreased preload), and mild direct myocardial depression -> significant hypotension. Blunts baroreceptor reflex.",
    clinicalPearls: [
      "Formulated in a 10% soybean oil, 1.2% egg yolk phospholipid emulsion, providing 1.1 kcal/mL of lipid calories (must be calculated into total parenteral nutrition).",
      "Strict aseptic technique required: Emulsion supports microbial growth. Change tubing and infusion bottles every 12 hours.",
    ],
    keyWarnings: [
      "PROPOFOL INFUSION SYNDROME (PRIS): High-dose (> 4-5 mg/kg/h) or prolonged (> 48h) infusions uncouple mitochondrial oxidative phosphorylation (complexes I, II, IV) and inhibit carnitine palmitoyltransferase-1 (CPT-1), blocking free fatty acid beta-oxidation. Results in severe refractory metabolic lactic acidosis, rhabdomyolysis, hyperkalemia, acute renal failure, hepatomegaly/hypertriglyceridemia, Brugada-like ECG pattern (coved ST elevation in V1-V3), refractory bradycardia, and fatal asystole.",
      "Profound hypotension in hypovolemic or shock states; respiratory depression and apnea upon bolus administration.",
    ],
  },
  dexmedetomidine: {
    id: "dexmedetomidine",
    name: "Dexmedetomidine",
    brandNames: ["Precedex", "Igalmi"],
    class: "Selective centrally-acting alpha-2 adrenergic agonist",
    mechanism:
      "Potent and highly selective alpha-2 adrenoceptor agonist (alpha-2 : alpha-1 selectivity ratio 1620:1, ~8x more selective than clonidine). Acts on presynaptic and postsynaptic alpha-2 receptors in the locus coeruleus of the brainstem, attenuating central sympathetic outflow.",
    icuDosing:
      "0.2 - 1.4 mcg/kg/h IV continuous infusion. Bolus loading doses (1 mcg/kg over 10 min) are generally avoided in ICU due to biphasic hemodynamic swings.",
    padisGuidelineRole:
      "Preferred first-line sedative over benzodiazepines per SCCM PADIS guidelines. Promotes cooperative, easily arousable sedation that mimics natural non-REM stage 2 sleep, significantly reducing ICU delirium and shortening time to extubation.",
    deliriumRisk: "low-delirium-sparing",
    respiratoryDepression: false,
    hemodynamicProfile:
      "Central sympatholysis -> dose-dependent bradycardia and hypotension. Rapid IV boluses cause transient peripheral vascular alpha-2b receptor stimulation with vasoconstrictive hypertension, followed by central hypotension.",
    clinicalPearls: [
      "SPARES RESPIRATORY DRIVE: Does not cause clinically significant hypoventilation or hypercapnic respiratory depression. Safe for non-intubated patients, high-flow nasal cannula, and post-extubation weaning.",
      "Facilitates neurological assessment: Patients wake readily to verbal stimulation and return to sleep when unstimulated.",
    ],
    keyWarnings: [
      "Profound bradycardia and sinus arrest: Exercise extreme caution in patients with preexisting second- or third-degree heart block, severe ventricular dysfunction, or hypovolemia.",
      "Withdrawal syndrome: Abrupt discontinuation after prolonged infusions (> 48-72h) can produce rebound sympathetic storm (hypertension, tachycardia, agitation, tremors).",
    ],
  },
  midazolam: {
    id: "midazolam",
    name: "Midazolam",
    brandNames: ["Versed"],
    class: "Short-acting benzodiazepine",
    mechanism:
      "Positive allosteric modulator of GABA_A receptors, increasing chloride channel opening frequency and enhancing GABA-mediated neuronal hyperpolarization.",
    icuDosing: "0.02 - 0.1 mg/kg/h IV continuous infusion; bolus 1 - 2 mg IV for procedural sedation.",
    padisGuidelineRole:
      "SCCM PADIS guidelines recommend AGAINST routine benzodiazepine infusions for ICU sedation. Reserved strictly for alcohol withdrawal (CIWA), status epilepticus, or deep sedation during neuromuscular blockade.",
    deliriumRisk: "high-independent-risk-factor",
    respiratoryDepression: true,
    hemodynamicProfile: "Modest vasodilation and reduction in systemic vascular resistance; synergistic hypotension with opioids.",
    clinicalPearls: [
      "Metabolized via hepatic CYP3A4 to active metabolite 1-hydroxymidazolam, which is glucuronidated and renally eliminated. Glucuronide metabolite accumulates markedly in acute kidney injury, resulting in prolonged sedation lasting days.",
      "Highly lipophilic with large volume of distribution in prolonged infusions (context-sensitive half-time increases exponentially beyond 24-48 hours).",
    ],
    keyWarnings: [
      "INDEPENDENT RISK FACTOR FOR ICU DELIRIUM: Strong association with delirium, prolonged mechanical ventilation, increased ICU length of stay, and long-term post-intensive care syndrome (PICS) cognitive impairment.",
      "Profound respiratory depression, especially when combined with opioids or in obstructive sleep apnea.",
    ],
  },
  lorazepam: {
    id: "lorazepam",
    name: "Lorazepam",
    brandNames: ["Ativan"],
    class: "Intermediate-acting benzodiazepine",
    mechanism:
      "Positive allosteric modulator of GABA_A receptors. Enhances transmembrane chloride influx.",
    icuDosing: "0.5 - 2 mg IV intermittent boluses; continuous infusion 1 - 10 mg/h (rarely indicated).",
    padisGuidelineRole:
      "Disfavored for routine ICU sedation per SCCM PADIS. Strong driver of ICU delirium. Reserved for alcohol withdrawal or refractory status epilepticus.",
    deliriumRisk: "high-independent-risk-factor",
    respiratoryDepression: true,
    hemodynamicProfile: "Relatively hemodynamically stable; minimal direct myocardial depression.",
    clinicalPearls: [
      "Undergoes direct hepatic glucuronidation (UGT2B7) to inactive lorazepam-glucuronide, without CYP phase I metabolism. Preferred over midazolam in moderate hepatic dysfunction.",
    ],
    keyWarnings: [
      "PROPYLENE GLYCOL TOXICITY: IV formulation contains propylene glycol solvent (80% v/v). High-dose continuous infusions (> 0.1 mg/kg/h) cause hyperosmolar anion-gap metabolic acidosis, acute tubular necrosis, and proximal renal tubular injury. Monitor serum osmolar gap.",
      "Delirium driver in mechanically ventilated patients.",
    ],
  },
};

// ============================================================================
// 5. TRAIN-OF-FOUR (TOF) & POST-TETANIC COUNT (PTC) MONITORING MATRIX
// ============================================================================

export type TOFDepth =
  | "intense"
  | "deep"
  | "moderate"
  | "shallow"
  | "minimal-or-recovered";

export interface TOFStimulationResult {
  twitches: 0 | 1 | 2 | 3 | 4;
  tofRatio?: number; // 0.0 to 1.0 (only relevant when 4 twitches present)
  postTetanicCount?: number; // 0 to 16 (only assessed when twitches == 0)
  depth: TOFDepth;
  receptorOccupancyPct: string;
  clinicalDescription: string;
  recommendedSugammadexDoseMgKg: number | null;
  neostigmineEligible: boolean;
  clinicalCaveat: string;
}

export function evaluateTofDepth(params: {
  twitches: number;
  tofRatio?: number;
  postTetanicCount?: number;
}): TOFStimulationResult {
  const twitches = Math.max(0, Math.min(4, Math.round(params.twitches))) as 0 | 1 | 2 | 3 | 4;
  const ptc = params.postTetanicCount !== undefined
    ? Math.max(0, Math.min(16, Math.round(params.postTetanicCount)))
    : undefined;
  const ratio = params.tofRatio !== undefined ? Math.max(0, Math.min(1.5, params.tofRatio)) : undefined;

  if (twitches === 0) {
    if (ptc === undefined || ptc === 0) {
      return {
        twitches: 0,
        postTetanicCount: 0,
        depth: "intense",
        receptorOccupancyPct: "> 100% (intense blockade)",
        clinicalDescription:
          "Intense block: No response to TOF and 0 twitches on 50 Hz post-tetanic stimulation. Diaphragm and laryngeal muscles completely paralyzed.",
        recommendedSugammadexDoseMgKg: 16, // Emergency rescue or wait until PTC 1-2
        neostigmineEligible: false,
        clinicalCaveat:
          "Neostigmine is strictly CONTRAINDICATED / INEFFECTIVE. Reversal with Sugammadex requires either emergency rescue (16 mg/kg post-rocuronium 1.2 mg/kg) or waiting for spontaneous transition to deep block (PTC ≥ 1).",
      };
    }

    if (ptc >= 1 && ptc <= 2) {
      return {
        twitches: 0,
        postTetanicCount: ptc,
        depth: "deep",
        receptorOccupancyPct: "90% - 99%",
        clinicalDescription:
          `Deep block: 0 twitches on TOF with post-tetanic count of ${ptc}. Adductor pollicis fully blocked; diaphragm may exhibit minor spontaneous movement under surgical stimulation.`,
        recommendedSugammadexDoseMgKg: 4,
        neostigmineEligible: false,
        clinicalCaveat:
          "Neostigmine CANNOT reverse deep block (ceiling effect). Sugammadex 4 mg/kg is the evidence-based indicated reversal agent for aminosteroid NMBAs. If cisatracurium was used, must wait for spontaneous twitch return.",
      };
    }

    // ptc >= 3 with TOF 0
    return {
      twitches: 0,
      postTetanicCount: ptc,
      depth: "deep",
      receptorOccupancyPct: "85% - 90%",
      clinicalDescription:
        `Deep to moderate transition: 0 twitches on TOF with PTC of ${ptc}. Approaching reappearance of first twitch (T1).`,
      recommendedSugammadexDoseMgKg: 4,
      neostigmineEligible: false,
      clinicalCaveat:
        "Neostigmine still ineffective. Sugammadex 4 mg/kg indicated, or wait for T2 reappearance for 2 mg/kg tier.",
    };
  }

  if (twitches === 1) {
    return {
      twitches: 1,
      depth: "moderate",
      receptorOccupancyPct: "85% - 90%",
      clinicalDescription:
        "Moderate block (T1 visible, T2-T4 absent): Early return of adductor pollicis twitching. Severe residual weakness.",
      recommendedSugammadexDoseMgKg: 2,
      neostigmineEligible: false,
      clinicalCaveat:
        "Neostigmine reversal at T1 alone carries high failure rate and prolonged recovery (> 20-30 min). Wait for T2 return before neostigmine, or use Sugammadex 2 mg/kg.",
    };
  }

  if (twitches === 2 || twitches === 3) {
    return {
      twitches,
      depth: "moderate",
      receptorOccupancyPct: twitches === 2 ? "80% - 85%" : "75% - 80%",
      clinicalDescription:
        `Moderate block (${twitches} twitches on TOF): Canonical threshold for conventional reversal or standard Sugammadex dosing. Reappearance of T2 confirmed.`,
      recommendedSugammadexDoseMgKg: 2,
      neostigmineEligible: true,
      clinicalCaveat:
        "Sugammadex 2 mg/kg provides rapid full reversal within 2-3 minutes. Neostigmine (0.05-0.07 mg/kg) + Glycopyrrolate is eligible, but requires 10-15 minutes and continuous quantitative monitoring until TOF ratio ≥ 0.90.",
    };
  }

  // twitches === 4
  if (ratio !== undefined && ratio >= 0.90) {
    return {
      twitches: 4,
      tofRatio: ratio,
      depth: "minimal-or-recovered",
      receptorOccupancyPct: "< 70% (physiologically recovered)",
      clinicalDescription:
        `Adequately recovered (4 twitches, quantitative TOF ratio ${ratio.toFixed(2)} ≥ 0.90): Meets 2023 ASA criteria for safe tracheal extubation.`,
      recommendedSugammadexDoseMgKg: null,
      neostigmineEligible: false,
      clinicalCaveat:
        "PARADOXICAL WEAKNESS WARNING: Neostigmine is CONTRAINDICATED when TOF ratio is ≥ 0.90. Anticholinesterase administration at this stage causes excessive synaptic ACh, inducing receptor desensitization and muscle weakness.",
    };
  }

  return {
    twitches: 4,
    tofRatio: ratio,
    depth: "shallow",
    receptorOccupancyPct: "70% - 75%",
    clinicalDescription:
      `Shallow block: 4 twitches present with perceptible fade (TOF ratio ${ratio !== undefined ? ratio.toFixed(2) : "< 0.90"}). Patient vulnerable to upper airway collapse and microaspiration if extubated.`,
    recommendedSugammadexDoseMgKg: 2,
    neostigmineEligible: true,
    clinicalCaveat:
      "Neostigmine 0.03 - 0.05 mg/kg + Glycopyrrolate or Sugammadex 2 mg/kg can be administered. Tracheal extubation is safe ONLY once quantitative TOF ratio reaches ≥ 0.90.",
  };
}

// ============================================================================
// 6. TARGETED REVERSAL: SUGAMMADEX CYCLODEXTRIN ENCAPSULATION
// ============================================================================

export interface SugammadexDoseResult {
  nmbaId: NMBAId;
  patientWeightKg: number;
  depthCategory: "moderate" | "deep" | "immediate-rescue";
  recommendedDoseMgKg: number;
  totalDoseMg: number;
  vialsRequired200mg: number;
  vialsRequired500mg: number;
  isEffectiveForAgent: boolean;
  affinityKdMicroMolar: number | null;
  encapsulationKinetics: string;
  hormonalContraceptiveMandate: string;
  displacementRecurarizationWarning: string;
  coagulationWarning: string;
}

export function calculateSugammadexDose(params: {
  weightKg: number;
  depthCategory: "moderate" | "deep" | "immediate-rescue";
  nmbaId: NMBAId;
}): SugammadexDoseResult {
  const weight = Math.max(10, Math.min(300, params.weightKg));
  const profile = NMBA_PROFILES[params.nmbaId];

  let doseMgKg = 2;
  if (params.depthCategory === "deep") {
    doseMgKg = 4;
  } else if (params.depthCategory === "immediate-rescue") {
    doseMgKg = 16;
  }

  const isEffective = profile.sugammadexReversibility !== "none";
  const totalMg = Math.round(weight * doseMgKg);
  const vials200 = Math.ceil(totalMg / 200);
  const vials500 = Math.ceil(totalMg / 500);

  let kinetics = "";
  if (params.nmbaId === "rocuronium") {
    kinetics =
      "High-affinity 1:1 guest-host cyclodextrin complex (Kd ~ 0.1 µM). Rapidly lowers free plasma rocuronium, extracting molecules from the neuromuscular junction down a concentration gradient. Reversal occurs within 2-3 minutes across all depths.";
  } else if (params.nmbaId === "vecuronium") {
    kinetics =
      "Tight 1:1 cyclodextrin inclusion complex (Kd ~ 1.5 µM). Effectively encapsulates vecuronium with clinical recovery in ~3 minutes for moderate block and ~4.5 minutes for deep block.";
  } else if (params.nmbaId === "pancuronium") {
    kinetics =
      "Moderate cyclodextrin affinity (Kd ~ 3.5 µM). Off-label reversal only. Higher or repeated dosing may be needed due to lower association constant.";
  } else {
    kinetics =
      `ZERO AFFINITY: Sugammadex has NO chemical affinity (Kd > 100,000 µM) for ${profile.name}. Benzylisoquinolines and depolarizers cannot fit into the cyclodextrin cavity. Administration is completely ineffective.`;
  }

  const contraceptive =
    "MANDATORY CONTRACEPTIVE COUNSELING: Sugammadex binds progesterone and estrogen in its cavity, slashes active circulating exposure by ~34% (equivalent to missing one daily pill). Patients on oral, transdermal, injectable, or implantable hormonal contraceptives MUST use additional non-hormonal back-up contraception (e.g. condoms) for 7 CONSECUTIVE DAYS following sugammadex administration.";

  const displacement =
    "DISPLACEMENT HAZARD: Co-administration of toremifene or IV flucloxacillin competitively displaces rocuronium/vecuronium from the cyclodextrin cavity, precipitating delayed recurarization and sudden post-op respiratory arrest.";

  const coag =
    "COAGULATION ASSAY NOTICE: Transient in vitro prolongation of aPTT and PT/INR by up to 25-30% within 30-60 minutes post-dose due to cyclodextrin binding assay phospholipids; no increased clinical bleeding.";

  return {
    nmbaId: params.nmbaId,
    patientWeightKg: weight,
    depthCategory: params.depthCategory,
    recommendedDoseMgKg: doseMgKg,
    totalDoseMg: totalMg,
    vialsRequired200mg: vials200,
    vialsRequired500mg: vials500,
    isEffectiveForAgent: isEffective,
    affinityKdMicroMolar: profile.sugammadexAffinityKdMicroMolar,
    encapsulationKinetics: kinetics,
    hormonalContraceptiveMandate: contraceptive,
    displacementRecurarizationWarning: displacement,
    coagulationWarning: coag,
  };
}

// ============================================================================
// 7. CONVENTIONAL ANTICHOLINESTERASE REVERSAL: NEOSTIGMINE + GLYCOPYRROLATE
// ============================================================================

export interface NeostigmineDoseResult {
  patientWeightKg: number;
  tofTwitches: number;
  tofRatio?: number;
  isEligible: boolean;
  contraindicatedReason?: string;
  neostigmineDoseMgKg: number;
  neostigmineTotalMg: number;
  neostigmineMaxCapApplied: boolean;
  glycopyrrolateTotalMg: number;
  glycopyrrolateRatioExplanation: string;
  muscarinicWarning: string;
  paradoxicalWeaknessWarning: string;
}

export function calculateNeostigmineGlycopyrrolateDose(params: {
  weightKg: number;
  tofTwitches: number;
  tofRatio?: number;
}): NeostigmineDoseResult {
  const weight = Math.max(10, Math.min(300, params.weightKg));
  const twitches = Math.max(0, Math.min(4, Math.round(params.tofTwitches)));
  const ratio = params.tofRatio !== undefined ? Math.max(0, Math.min(1.5, params.tofRatio)) : undefined;

  // Ceiling and eligibility checks
  if (twitches === 0) {
    return {
      patientWeightKg: weight,
      tofTwitches: 0,
      isEligible: false,
      contraindicatedReason:
        "CEILING EFFECT: Neostigmine cannot reverse deep or intense neuromuscular blockade (0 twitches on TOF, PTC 0-2). Acetylcholinesterase inhibition cannot compensate for > 90% receptor occupancy. Administering neostigmine will fail to reverse block and risks severe residual paralysis.",
      neostigmineDoseMgKg: 0,
      neostigmineTotalMg: 0,
      neostigmineMaxCapApplied: false,
      glycopyrrolateTotalMg: 0,
      glycopyrrolateRatioExplanation: "No anticholinergic required when neostigmine is withheld.",
      muscarinicWarning: "Withhold anticholinesterase until spontaneous recovery returns at least 2 twitches on TOF.",
      paradoxicalWeaknessWarning: "Do not attempt neostigmine in 0 twitches block.",
    };
  }

  if (twitches === 4 && ratio !== undefined && ratio >= 0.90) {
    return {
      patientWeightKg: weight,
      tofTwitches: 4,
      tofRatio: ratio,
      isEligible: false,
      contraindicatedReason:
        `PARADOXICAL WEAKNESS CONTRAINDICATION: Neuromuscular transmission is already recovered (TOF ratio ${ratio.toFixed(2)} ≥ 0.90). Administering neostigmine causes excessive synaptic acetylcholine accumulation, inducing postsynaptic nicotinic receptor desensitization, depolarizing open-channel block, and paradoxically worsening muscle weakness and respiratory fatigue.`,
      neostigmineDoseMgKg: 0,
      neostigmineTotalMg: 0,
      neostigmineMaxCapApplied: false,
      glycopyrrolateTotalMg: 0,
      glycopyrrolateRatioExplanation: "Withhold both neostigmine and glycopyrrolate.",
      muscarinicWarning: "No cholinergic stimulation present; withholding reversal is physiologically correct.",
      paradoxicalWeaknessWarning:
        "Documented clinical phenomenon: Neostigmine given at TOF ratio ≥ 0.90 weakens genioglossus and diaphragm function.",
    };
  }

  // Eligible dosing tiers
  let doseMgKg = 0.05;
  if (twitches === 1) {
    doseMgKg = 0.07; // High dose, though clinical recommendation is to wait for T2
  } else if (twitches >= 2 && twitches <= 3) {
    doseMgKg = 0.05;
  } else if (twitches === 4) {
    if (ratio !== undefined && ratio >= 0.40 && ratio < 0.90) {
      doseMgKg = 0.03; // Near recovery
    } else {
      doseMgKg = 0.04; // 4 twitches with fade
    }
  }

  let calculatedNeoMg = weight * doseMgKg;
  let maxCapApplied = false;
  if (calculatedNeoMg > 5.0) {
    calculatedNeoMg = 5.0; // Max labeled single dose cap
    maxCapApplied = true;
  }

  // Glycopyrrolate 0.2 mg per 1 mg neostigmine (1:5 ratio)
  const glycoMg = Number((calculatedNeoMg * 0.2).toFixed(2));

  return {
    patientWeightKg: weight,
    tofTwitches: twitches,
    tofRatio: ratio,
    isEligible: true,
    neostigmineDoseMgKg: Number(doseMgKg.toFixed(3)),
    neostigmineTotalMg: Number(calculatedNeoMg.toFixed(2)),
    neostigmineMaxCapApplied: maxCapApplied,
    glycopyrrolateTotalMg: glycoMg,
    glycopyrrolateRatioExplanation:
      `Fixed quaternary ratio: 0.2 mg glycopyrrolate per 1.0 mg neostigmine (1:5 weight ratio). Blocks peripheral muscarinic hyperstimulation without crossing blood-brain barrier. Total: ${glycoMg} mg glycopyrrolate paired with ${calculatedNeoMg.toFixed(2)} mg neostigmine.`,
    muscarinicWarning:
      "MANDATORY CO-ADMINISTRATION: Neostigmine must NEVER be administered without an anticholinergic. Unopposed muscarinic stimulation causes life-threatening sinus arrest, complete AV block, asystole, bronchospasm, and copious secretions.",
    paradoxicalWeaknessWarning:
      "Monitor continuously with quantitative TOF until ratio ≥ 0.90 is objectively confirmed before tracheal extubation.",
  };
}

// ============================================================================
// 8. SUCCINYLCHOLINE SPECIAL PATHOPHYSIOLOGY EVALUATORS
// ============================================================================

export interface SuccinylcholineHyperkalemiaResult {
  isContraindicated: boolean;
  identifiedRiskFactors: string[];
  mechanism: string;
  predictedPotassiumSurgeMeqL: string;
  clinicalConsequences: string[];
  safeAlternatives: string[];
}

export function evaluateSuccinylcholineHyperkalemiaRisk(params: {
  hasThermalBurn?: boolean;
  burnDaysPostInjury?: number;
  hasSpinalCordInjuryOrStroke?: boolean;
  denervationDaysPostInjury?: number;
  hasProlongedIcuImmobilization?: boolean;
  hasNeuromuscularDisease?: boolean; // ALS, Muscular Dystrophy, GBS
  neuromuscularConditionName?: string;
  hasSevereCrushInjuryOrSepsis?: boolean;
}): SuccinylcholineHyperkalemiaResult {
  const risks: string[] = [];
  let contraindicated = false;

  if (params.hasThermalBurn) {
    const days = params.burnDaysPostInjury ?? 3;
    if (days >= 1 && days <= 730) {
      contraindicated = true;
      risks.push(`Severe thermal burn (${days} days post-injury; high risk window extends from 24-48 hours up to 1-2 years)`);
    }
  }

  if (params.hasSpinalCordInjuryOrStroke) {
    const days = params.denervationDaysPostInjury ?? 5;
    if (days >= 3 && days <= 180) {
      contraindicated = true;
      risks.push(`Denervation / Spinal cord injury / Stroke (${days} days post-injury; high risk window extends from 72 hours up to 6 months)`);
    }
  }

  if (params.hasNeuromuscularDisease) {
    contraindicated = true;
    risks.push(`Neuromuscular disease (${params.neuromuscularConditionName ?? "ALS / Duchenne Muscular Dystrophy / GBS"})`);
  }

  if (params.hasProlongedIcuImmobilization) {
    contraindicated = true;
    risks.push("Prolonged ICU immobilization / Critical illness polyneuropathy and myopathy (CIPNM)");
  }

  if (params.hasSevereCrushInjuryOrSepsis) {
    contraindicated = true;
    risks.push("Severe crush injury / Intra-abdominal sepsis with rhabdomyolysis");
  }

  if (contraindicated) {
    return {
      isContraindicated: true,
      identifiedRiskFactors: risks,
      mechanism:
        "EXTRAJUNCTIONAL nAChR UPREGULATION: Denervation, burns, disuse atrophy, and motor neuron disease trigger sarcolemmal proliferation of embryonic fetal-type (alpha-1, beta-1, gamma, delta pentamers) and alpha-7 nicotinic acetylcholine receptors across the entire muscle membrane. Succinylcholine triggers simultaneous sustained channel opening across all extrajunctional receptors, causing massive intracellular potassium efflux into the intravascular space.",
      predictedPotassiumSurgeMeqL: "+3.0 to > 5.0 mEq/L (catastrophic surge compared to normal +0.5 to 1.0 mEq/L)",
      clinicalConsequences: [
        "Lethal acute hyperkalemia (> 7.0 - 9.0+ mEq/L)",
        "Peaked T waves, PR prolongation, QRS widening, sine wave morphology",
        "Ventricular tachycardia, ventricular fibrillation, and refractory asystolic cardiac arrest",
      ],
      safeAlternatives: [
        "Rocuronium 1.0 - 1.2 mg/kg IV (RSI drug of choice; rapid 60-second intubation conditions with zero potassium efflux)",
        "Sugammadex immediately available for emergency rescue reversal if needed",
      ],
    };
  }

  return {
    isContraindicated: false,
    identifiedRiskFactors: [],
    mechanism:
      "Normal neuromuscular junction configuration. Extrajunctional nAChRs are absent. Succinylcholine induces standard transient potassium rise (+0.5 to 1.0 mEq/L) via endplate depolarization.",
    predictedPotassiumSurgeMeqL: "+0.5 to 1.0 mEq/L (physiologic normal rise)",
    clinicalConsequences: ["Well tolerated in patients with baseline normokalemia (K+ < 5.0 mEq/L)."],
    safeAlternatives: ["Succinylcholine 1.0-1.5 mg/kg or Rocuronium 0.6-1.2 mg/kg."],
  };
}

export interface PseudocholinesteraseResult {
  genotypeName: string;
  dibucaineNumber: string;
  expectedApneaDuration: string;
  managementProtocol: string;
  contraindicatedInterventions: string[];
}

export function evaluatePseudocholinesteraseDeficiency(params: {
  isKnownVariant?: boolean;
  variantType?: "heterozygous-atypical" | "homozygous-atypical" | "fluoride-resistant" | "silent";
  acquiredDeficiencyCondition?: "liver-failure" | "pregnancy" | "malnutrition" | "organophosphate";
}): PseudocholinesteraseResult {
  if (params.variantType === "homozygous-atypical") {
    return {
      genotypeName: "Homozygous Atypical Variant (EaEa)",
      dibucaineNumber: "15 - 30 (Dibucaine fails to inhibit abnormal enzyme)",
      expectedApneaDuration: "4 to 8+ hours of prolonged neuromuscular blockade",
      managementProtocol:
        "Maintain sedation and mechanical ventilation. Await spontaneous non-enzymatic clearance and renal excretion. Monitor with quantitative TOF until twitches return.",
      contraindicatedInterventions: [
        "NEOSTIGMINE IS CONTRAINDICATED: Neostigmine inhibits pseudocholinesterase and acetylcholinesterase, worsening and prolonging Phase I blockade.",
        "SUGAMMADEX IS INEFFECTIVE: Zero binding to succinylcholine.",
      ],
    };
  }

  if (params.variantType === "heterozygous-atypical") {
    return {
      genotypeName: "Heterozygous Atypical Variant (EuEa)",
      dibucaineNumber: "50 - 65",
      expectedApneaDuration: "20 to 30 minutes (mildly prolonged block)",
      managementProtocol:
        "Maintain controlled ventilation and sedation for 20-30 minutes until full spontaneous twitch recovery.",
      contraindicatedInterventions: ["Do not administer neostigmine until Phase II block is objectively verified."],
    };
  }

  if (params.variantType === "silent") {
    return {
      genotypeName: "Homozygous Silent Gene Variant (EsEs)",
      dibucaineNumber: "0 (Complete absence of enzyme activity)",
      expectedApneaDuration: "4 to 8+ hours of prolonged flaccid paralysis",
      managementProtocol:
        "Prolonged postoperative mechanical ventilation in ICU. Fresh frozen plasma (FFP) provides exogenous pseudocholinesterase but carries transfusion risks and is rarely indicated over supportive care.",
      contraindicatedInterventions: ["Anticholinesterases contraindicated."],
    };
  }

  if (params.acquiredDeficiencyCondition) {
    return {
      genotypeName: `Acquired BChE Deficiency (${params.acquiredDeficiencyCondition})`,
      dibucaineNumber: "70 - 80 (Normal enzyme quality, reduced quantity/activity)",
      expectedApneaDuration: "15 to 45 minutes of moderately prolonged block",
      managementProtocol:
        "Support airway and maintain sedation until spontaneous recovery. Assess liver function and nutritional status.",
      contraindicatedInterventions: ["Avoid anticholinesterases during active Phase I block."],
    };
  }

  return {
    genotypeName: "Normal Pseudocholinesterase Genotype (EuEu)",
    dibucaineNumber: "70 - 85 (Normal dibucaine inhibition)",
    expectedApneaDuration: "5 to 10 minutes (normal rapid spontaneous offset)",
    managementProtocol: "Standard post-induction airway management.",
    contraindicatedInterventions: [],
  };
}

// ============================================================================
// 9. ICU SEDATION & PROPOFOL INFUSION SYNDROME (PRIS) MONITOR
// ============================================================================

export interface PrisRiskResult {
  isHighPrisRisk: boolean;
  rateMcgKgMin: number;
  rateMgKgH: number;
  durationHours: number;
  thresholdExceeded: boolean;
  mechanism: string;
  hallmarkFeatures: string[];
  safetyRecommendations: string[];
}

export function evaluatePrisRisk(params: {
  rateMcgKgMin?: number;
  rateMgKgH?: number;
  durationHours: number;
}): PrisRiskResult {
  let rateMcg = params.rateMcgKgMin ?? 0;
  let rateMgH = params.rateMgKgH ?? 0;

  if (rateMcg > 0 && rateMgH === 0) {
    rateMgH = Number(((rateMcg * 60) / 1000).toFixed(2));
  } else if (rateMgH > 0 && rateMcg === 0) {
    rateMcg = Number(((rateMgH * 1000) / 60).toFixed(1));
  }

  const duration = Math.max(0, params.durationHours);
  const exceedsRate = rateMgH >= 4.0 || rateMcg >= 67;
  const exceedsDuration = duration >= 48;
  const isHighRisk = exceedsRate || (rateMgH >= 3.0 && exceedsDuration);

  const hallmark = [
    "Refractory high-anion-gap metabolic lactic acidosis",
    "Rhabdomyolysis with massive creatine kinase (CK) elevation and myoglobinuria",
    "Acute kidney injury and severe hyperkalemia",
    "Hepatomegaly, hepatic steatosis, and severe hypertriglyceridemia",
    "Cardiac instability: Brugada-like ECG pattern (coved ST elevation in V1-V3), refractory bradycardia, and asystolic arrest",
  ];

  const recommendations = [
    "Limit propofol infusion rates to < 4.0 mg/kg/h (< 67 mcg/kg/min).",
    "Limit continuous duration to < 48 hours wherever possible.",
    "Serial monitoring of serum arterial lactate, serum triglycerides, and serum creatine kinase (CK).",
    "Rotate to Dexmedetomidine (Precedex) as preferred delirium-sparing non-respiratory-depressant alternative per SCCM PADIS guidelines.",
    "Immediate cessation of propofol upon unexplained lactic acidosis, refractory bradycardia, or rising CK; initiate aggressive hemodialysis / ECMO support if PRIS ensues.",
  ];

  return {
    isHighPrisRisk: isHighRisk,
    rateMcgKgMin: rateMcg,
    rateMgKgH: rateMgH,
    durationHours: duration,
    thresholdExceeded: exceedsRate || exceedsDuration,
    mechanism:
      "MITOCHONDRIAL UNCOUPLING & FATTY ACID OXIDATION BLOCKADE: Propofol uncouples oxidative phosphorylation in the mitochondrial electron transport chain (complexes I, II, and IV) and inhibits carnitine palmitoyltransferase-1 (CPT-1), preventing mitochondrial entry and beta-oxidation of long-chain fatty acids. This precipitates cellular bioenergetic crisis, anaerobic metabolism, muscle necrosis, and cardiac conduction failure.",
    hallmarkFeatures: hallmark,
    safetyRecommendations: recommendations,
  };
}

// ============================================================================
// 10. DRUG COLLISION & INTERACTION DEFINITIONS
// ============================================================================

export interface AnesthesiaCollisionAlert {
  id: string;
  title: string;
  severity: "critical" | "warning" | "advisory";
  mechanism: string;
  clinicalConsequence: string;
  managementGuidance: string;
  citations: string[];
}

export const HORMONAL_CONTRACEPTIVE_IDS = new Set<string>([
  "ethinyl-estradiol",
  "drospirenone",
  "levonorgestrel",
  "medroxyprogesterone",
  "etonogestrel",
  "norethindrone",
  "estradiol",
  "norgestimate",
  "desogestrel",
  "ocp",
  "birth-control",
]);

export const DISPLACEMENT_INTERACTOR_IDS = new Set<string>([
  "toremifene",
  "flucloxacillin",
]);

export const NMBA_POTENTIATOR_IDS = new Set<string>([
  "gentamicin",
  "tobramycin",
  "amikacin",
  "colistin",
  "polymyxin-b",
  "lithium",
  "magnesium",
  "sevoflurane",
  "desflurane",
  "isoflurane",
]);

// ============================================================================
// 11. DESK TRAY DETECTION & COMPREHENSIVE REPORT GENERATOR
// ============================================================================

export interface AnesthesiaDeskResult {
  hasNmba: boolean;
  hasDepolarizingNmba: boolean;
  hasAminosteroidNmba: boolean;
  hasBenzylisoquinoliniumNmba: boolean;
  hasReversal: boolean;
  hasSugammadex: boolean;
  hasNeostigmine: boolean;
  hasGlycopyrrolate: boolean;
  hasSedative: boolean;
  hasPropofol: boolean;
  hasDexmedetomidine: boolean;
  hasBenzodiazepine: boolean;
  hasContraceptive: boolean;
  hasDisplacementAgent: boolean;
  hasNmbaPotentiator: boolean;
  detectedNmbaIds: NMBAId[];
  detectedReversalIds: ReversalAgentId[];
  detectedSedativeIds: SedativeAgentId[];
  detectedContraceptiveIds: string[];
  detectedDisplacementIds: string[];
  detectedPotentiatorIds: string[];
  activeAgents: string[];
}

export function anesthesiaOnDesk(drugIds: string[]): AnesthesiaDeskResult {
  const normIds = drugIds.map((id) => id.toLowerCase().trim());

  const detectedNmbaIds: NMBAId[] = [];
  const detectedReversalIds: ReversalAgentId[] = [];
  const detectedSedativeIds: SedativeAgentId[] = [];
  const detectedContraceptiveIds: string[] = [];
  const detectedDisplacementIds: string[] = [];
  const detectedPotentiatorIds: string[] = [];
  const activeAgents: string[] = [];

  for (const id of normIds) {
    // 1. NMBAs
    if (ALL_NMBA_IDS.includes(id as NMBAId)) {
      if (!detectedNmbaIds.includes(id as NMBAId)) {
        detectedNmbaIds.push(id as NMBAId);
        activeAgents.push(NMBA_PROFILES[id as NMBAId].name);
      }
    } else if (["sux", "anectine", "quelicin"].includes(id)) {
      if (!detectedNmbaIds.includes("succinylcholine")) {
        detectedNmbaIds.push("succinylcholine");
        activeAgents.push(NMBA_PROFILES.succinylcholine.name);
      }
    } else if (["zemuron", "esmeron", "roc"].includes(id)) {
      if (!detectedNmbaIds.includes("rocuronium")) {
        detectedNmbaIds.push("rocuronium");
        activeAgents.push(NMBA_PROFILES.rocuronium.name);
      }
    } else if (["norcuron", "vec"].includes(id)) {
      if (!detectedNmbaIds.includes("vecuronium")) {
        detectedNmbaIds.push("vecuronium");
        activeAgents.push(NMBA_PROFILES.vecuronium.name);
      }
    } else if (["nimbex"].includes(id)) {
      if (!detectedNmbaIds.includes("cisatracurium")) {
        detectedNmbaIds.push("cisatracurium");
        activeAgents.push(NMBA_PROFILES.cisatracurium.name);
      }
    } else if (["tracrium"].includes(id)) {
      if (!detectedNmbaIds.includes("atracurium")) {
        detectedNmbaIds.push("atracurium");
        activeAgents.push(NMBA_PROFILES.atracurium.name);
      }
    } else if (["pavulon"].includes(id)) {
      if (!detectedNmbaIds.includes("pancuronium")) {
        detectedNmbaIds.push("pancuronium");
        activeAgents.push(NMBA_PROFILES.pancuronium.name);
      }
    }

    // 2. Reversal Agents
    if (["sugammadex", "bridion"].includes(id)) {
      if (!detectedReversalIds.includes("sugammadex")) {
        detectedReversalIds.push("sugammadex");
        activeAgents.push(REVERSAL_PROFILES.sugammadex.name);
      }
    }
    if (["neostigmine", "bloxiverz", "prostigmin"].includes(id)) {
      if (!detectedReversalIds.includes("neostigmine")) {
        detectedReversalIds.push("neostigmine");
        activeAgents.push(REVERSAL_PROFILES.neostigmine.name);
      }
    }
    if (["glycopyrrolate", "robinul"].includes(id)) {
      if (!detectedReversalIds.includes("glycopyrrolate")) {
        detectedReversalIds.push("glycopyrrolate");
        activeAgents.push(REVERSAL_PROFILES.glycopyrrolate.name);
      }
    }
    if (["atropine"].includes(id)) {
      if (!detectedReversalIds.includes("atropine")) {
        detectedReversalIds.push("atropine");
        activeAgents.push(REVERSAL_PROFILES.atropine.name);
      }
    }

    // 3. ICU Sedatives
    if (["propofol", "diprivan"].includes(id)) {
      if (!detectedSedativeIds.includes("propofol")) {
        detectedSedativeIds.push("propofol");
        activeAgents.push(SEDATIVE_PROFILES.propofol.name);
      }
    }
    if (["dexmedetomidine", "precedex", "igalmi"].includes(id)) {
      if (!detectedSedativeIds.includes("dexmedetomidine")) {
        detectedSedativeIds.push("dexmedetomidine");
        activeAgents.push(SEDATIVE_PROFILES.dexmedetomidine.name);
      }
    }
    if (["midazolam", "versed"].includes(id)) {
      if (!detectedSedativeIds.includes("midazolam")) {
        detectedSedativeIds.push("midazolam");
        activeAgents.push(SEDATIVE_PROFILES.midazolam.name);
      }
    }
    if (["lorazepam", "ativan"].includes(id)) {
      if (!detectedSedativeIds.includes("lorazepam")) {
        detectedSedativeIds.push("lorazepam");
        activeAgents.push(SEDATIVE_PROFILES.lorazepam.name);
      }
    }

    // 4. Contraceptives
    if (HORMONAL_CONTRACEPTIVE_IDS.has(id)) {
      if (!detectedContraceptiveIds.includes(id)) {
        detectedContraceptiveIds.push(id);
      }
    }

    // 5. Displacement Interactors
    if (DISPLACEMENT_INTERACTOR_IDS.has(id)) {
      if (!detectedDisplacementIds.includes(id)) {
        detectedDisplacementIds.push(id);
      }
    }

    // 6. Potentiators
    if (NMBA_POTENTIATOR_IDS.has(id)) {
      if (!detectedPotentiatorIds.includes(id)) {
        detectedPotentiatorIds.push(id);
      }
    }
  }

  const hasNmba = detectedNmbaIds.length > 0;
  const hasDepolarizingNmba = detectedNmbaIds.some((id) => DEPOLARIZING_NMBA_IDS.includes(id));
  const hasAminosteroidNmba = detectedNmbaIds.some((id) => AMINOSTEROID_NMBA_IDS.includes(id));
  const hasBenzylisoquinoliniumNmba = detectedNmbaIds.some((id) => BENZYLISOQUINOLINIUM_NMBA_IDS.includes(id));

  const hasReversal = detectedReversalIds.length > 0;
  const hasSugammadex = detectedReversalIds.includes("sugammadex");
  const hasNeostigmine = detectedReversalIds.includes("neostigmine");
  const hasGlycopyrrolate = detectedReversalIds.includes("glycopyrrolate");

  const hasSedative = detectedSedativeIds.length > 0;
  const hasPropofol = detectedSedativeIds.includes("propofol");
  const hasDexmedetomidine = detectedSedativeIds.includes("dexmedetomidine");
  const hasBenzodiazepine = detectedSedativeIds.includes("midazolam") || detectedSedativeIds.includes("lorazepam");

  const hasContraceptive = detectedContraceptiveIds.length > 0;
  const hasDisplacementAgent = detectedDisplacementIds.length > 0;
  const hasNmbaPotentiator = detectedPotentiatorIds.length > 0;

  return {
    hasNmba,
    hasDepolarizingNmba,
    hasAminosteroidNmba,
    hasBenzylisoquinoliniumNmba,
    hasReversal,
    hasSugammadex,
    hasNeostigmine,
    hasGlycopyrrolate,
    hasSedative,
    hasPropofol,
    hasDexmedetomidine,
    hasBenzodiazepine,
    hasContraceptive,
    hasDisplacementAgent,
    hasNmbaPotentiator,
    detectedNmbaIds,
    detectedReversalIds,
    detectedSedativeIds,
    detectedContraceptiveIds,
    detectedDisplacementIds,
    detectedPotentiatorIds,
    activeAgents,
  };
}

export interface AnesthesiaEvaluationParams {
  weightKg?: number;
  selectedNmbaId?: NMBAId;
  tofTwitches?: number;
  tofRatio?: number;
  postTetanicCount?: number;
  isEmergencyRsiReversal?: boolean;
  propofolRateMcgKgMin?: number;
  propofolRateMgKgH?: number;
  propofolDurationHours?: number;
  hasBurnOrDenervation?: boolean;
  burnOrDenervationDays?: number;
  hasNeuromuscularDisease?: boolean;
  hasBcheDeficiency?: boolean;
  bcheVariant?: "heterozygous-atypical" | "homozygous-atypical" | "fluoride-resistant" | "silent";
  hasHormonalContraceptive?: boolean;
  hasToremifeneOrFlucloxacillin?: boolean;
}

export interface AnesthesiaReport {
  onDesk: AnesthesiaDeskResult;
  selectedNmba?: NMBAProfile;
  tofEvaluation?: TOFStimulationResult;
  sugammadexDosing?: SugammadexDoseResult;
  neostigmineDosing?: NeostigmineDoseResult;
  succinylcholineWarning?: SuccinylcholineHyperkalemiaResult;
  pseudocholinesteraseEvaluation?: PseudocholinesteraseResult;
  prisEvaluation?: PrisRiskResult;
  activeCollisions: AnesthesiaCollisionAlert[];
  clinicalPearls: string[];
  disclaimer: string;
}

export function anesthesiaReportOnDesk(
  drugIds: string[],
  host: HostContext,
  params?: AnesthesiaEvaluationParams,
): AnesthesiaReport {
  const onDesk = anesthesiaOnDesk(drugIds);

  const weightKg = params?.weightKg ?? 70;
  const chosenNmbaId: NMBAId =
    params?.selectedNmbaId ??
    (onDesk.detectedNmbaIds[0] || "rocuronium");

  const selectedNmba = NMBA_PROFILES[chosenNmbaId];

  // 1. TOF Evaluation
  const twitches = params?.tofTwitches ?? 2;
  const ptc = params?.postTetanicCount ?? (twitches === 0 ? 1 : undefined);
  const ratio = params?.tofRatio;
  const tofEvaluation = evaluateTofDepth({
    twitches,
    tofRatio: ratio,
    postTetanicCount: ptc,
  });

  // 2. Sugammadex Dosing
  let depthCategory: "moderate" | "deep" | "immediate-rescue" = "moderate";
  if (params?.isEmergencyRsiReversal) {
    depthCategory = "immediate-rescue";
  } else if (tofEvaluation.depth === "deep" || tofEvaluation.depth === "intense") {
    depthCategory = "deep";
  }

  const sugammadexDosing = calculateSugammadexDose({
    weightKg,
    depthCategory,
    nmbaId: chosenNmbaId,
  });

  // 3. Neostigmine Dosing
  const neostigmineDosing = calculateNeostigmineGlycopyrrolateDose({
    weightKg,
    tofTwitches: twitches,
    tofRatio: ratio,
  });

  // 4. Succinylcholine Evaluator
  const hasBurnOrDenerv = Boolean(params?.hasBurnOrDenervation);
  const days = params?.burnOrDenervationDays ?? 14;
  const hasNMD = Boolean(params?.hasNeuromuscularDisease);
  const succinylcholineWarning = evaluateSuccinylcholineHyperkalemiaRisk({
    hasThermalBurn: hasBurnOrDenerv,
    burnDaysPostInjury: days,
    hasSpinalCordInjuryOrStroke: hasBurnOrDenerv,
    denervationDaysPostInjury: days,
    hasNeuromuscularDisease: hasNMD,
    hasProlongedIcuImmobilization: host.age === "geriatric" && hasBurnOrDenerv,
  });

  // 5. Pseudocholinesterase Evaluator
  const pseudocholinesteraseEvaluation = evaluatePseudocholinesteraseDeficiency({
    isKnownVariant: Boolean(params?.hasBcheDeficiency),
    variantType: params?.bcheVariant,
    acquiredDeficiencyCondition: host.kidney === "ckd" ? "liver-failure" : undefined,
  });

  // 6. PRIS Evaluation
  const propRateMcg = params?.propofolRateMcgKgMin ?? (onDesk.hasPropofol ? 50 : 0);
  const propRateMgH = params?.propofolRateMgKgH ?? (onDesk.hasPropofol ? 3.0 : 0);
  const propDuration = params?.propofolDurationHours ?? (onDesk.hasPropofol ? 36 : 0);
  const prisEvaluation = evaluatePrisRisk({
    rateMcgKgMin: propRateMcg,
    rateMgKgH: propRateMgH,
    durationHours: propDuration,
  });

  // 7. Active Collisions
  const collisions: AnesthesiaCollisionAlert[] = [];

  // Collision A: Sugammadex + Hormonal Contraceptives
  if (onDesk.hasSugammadex || onDesk.hasContraceptive || params?.hasHormonalContraceptive) {
    collisions.push({
      id: "sugammadex-contraceptive-collision",
      title: "Sugammadex × Hormonal Contraceptives: Steroid Encapsulation & Contraceptive Failure",
      severity: "critical",
      mechanism:
        "Sugammadex guest-host inclusion cavity binds progesterone and estrogen derivatives, reducing free hormone exposure (AUC) by ~34%, equivalent to missing one daily contraceptive pill.",
      clinicalConsequence:
        "Risk of unintended pregnancy due to transient failure of oral, transdermal, implantable, injectable, or hormonal intrauterine contraception.",
      managementGuidance:
        "MANDATORY PATIENT COUNSELING: Patients taking any hormonal contraceptive MUST use an additional non-hormonal back-up method (e.g. barrier method / condoms) for 7 CONSECUTIVE DAYS following sugammadex administration.",
      citations: [
        "FDA Bridion (sugammadex) Prescribing Information. Section 5.3 & 7.1.",
        "Naguib M, et al. Practice Guidelines for Monitoring and Antagonism of Neuromuscular Blockade. Anesthesiology. 2023.",
      ],
    });
  }

  // Collision B: Sugammadex + Toremifene / Flucloxacillin Displacement
  if (onDesk.hasSugammadex || onDesk.hasDisplacementAgent || params?.hasToremifeneOrFlucloxacillin) {
    collisions.push({
      id: "sugammadex-displacement-recurarization",
      title: "Sugammadex × Toremifene / Flucloxacillin: Cyclodextrin Displacement & Delayed Recurarization",
      severity: "critical",
      mechanism:
        "Toremifene (SERM) and IV flucloxacillin possess high binding affinity for the cyclodextrin cavity and competitively displace rocuronium or vecuronium from the inclusion complex.",
      clinicalConsequence:
        "Free rocuronium/vecuronium molecules re-enter the biophase at the neuromuscular junction, triggering delayed recurarization, sudden muscle flaccidity, and post-extubation acute respiratory arrest.",
      managementGuidance:
        "If toremifene or IV flucloxacillin must be given postoperatively, maintain continuous electrophysiologic neuromuscular monitoring (TOF) and ventilatory readiness. Consider alternative non-displacing antibiotics.",
      citations: [
        "FDA Bridion (sugammadex) Prescribing Information. Section 7.2 Drug Interactions.",
        "Zwiers A, et al. In vitro and in vivo binding displacement of sugammadex. Eur J Pharm Sci. 2011.",
      ],
    });
  }

  // Collision C: Succinylcholine Extrajunctional Hyperkalemia
  if (onDesk.hasDepolarizingNmba || hasBurnOrDenerv || hasNMD) {
    if (succinylcholineWarning.isContraindicated) {
      collisions.push({
        id: "succinylcholine-extrajunctional-hyperkalemia",
        title: "Succinylcholine × Extrajunctional Upregulation: Lethal Hyperkalemic Cardiac Arrest",
        severity: "critical",
        mechanism: succinylcholineWarning.mechanism,
        clinicalConsequence:
          "Massive systemic potassium surge (+3.0 to > 5.0 mEq/L) within 2-5 minutes of succinylcholine administration, resulting in peaked T waves, widening QRS, ventricular fibrillation, and refractory asystolic cardiac arrest.",
        managementGuidance:
          "SUCCINYLCHOLINE IS STRICTLY CONTRAINDICATED. Use Rocuronium 1.0 - 1.2 mg/kg IV for rapid sequence intubation, with Sugammadex available for rescue reversal.",
        citations: [
          "Martyn JA, et al. Extrajunctional acetylcholine receptors in disease states. Anesthesiology. 2006;105(4):813-827.",
          "Gronert GA. Cardiac arrest after succinylcholine: mortality and etiology. Anesthesiology. 1999.",
        ],
      });
    }
  }

  // Collision D: Neostigmine Ceiling & Paradoxical Weakness
  if (onDesk.hasNeostigmine) {
    if (twitches === 0) {
      collisions.push({
        id: "neostigmine-ceiling-failure",
        title: "Neostigmine Ceiling Failure: Ineffective in Deep / Intense Blockade",
        severity: "critical",
        mechanism:
          "Acetylcholinesterase inhibition has a physiological ceiling. In deep block (> 90% receptor occupancy), endogenous ACh cannot overcome receptor saturation.",
        clinicalConsequence:
          "Failure of reversal, persistent severe paralysis, inability to protect airway, and post-op respiratory failure.",
        managementGuidance:
          "Do not administer neostigmine at TOF 0. For aminosteroids (rocuronium/vecuronium), administer Sugammadex 4 mg/kg. For cisatracurium, wait until at least 2 twitches spontaneously reappear.",
        citations: [
          "Naguib M, et al. Anesthesiology 2023;138(1):13-41.",
          "Kopman AF, et al. Neostigmine and the ceiling effect. Anesthesiology. 2005.",
        ],
      });
    } else if (twitches === 4 && ratio !== undefined && ratio >= 0.90) {
      collisions.push({
        id: "neostigmine-paradoxical-weakness",
        title: "Neostigmine Paradoxical Weakness: Nicotinic Desensitization at Full Recovery",
        severity: "warning",
        mechanism:
          "Administering neostigmine when TOF ratio is ≥ 0.90 floods the synaptic cleft with excessive ACh, inducing receptor desensitization and depolarizing open-channel block.",
        clinicalConsequence:
          "Paradoxical decrease in muscle force, diaphragmatic weakness, genioglossus airway collapse, and post-extubation hypoventilation.",
        managementGuidance:
          "WITHHOLD NEOSTIGMINE. Quantitative TOF ratio ≥ 0.90 confirms adequate spontaneous recovery. No reversal agent is required.",
        citations: [
          "Caldwell JE. Clinical limitations of anticholinesterase antagonism. Anesthesiology. 2009.",
          "Herbstreit F, et al. Impaired upper airway integrity by residual neuromuscular blockade. Anesthesiology. 2009.",
        ],
      });
    }
  }

  // Collision E: Neostigmine without Glycopyrrolate
  if (onDesk.hasNeostigmine && !onDesk.hasGlycopyrrolate) {
    collisions.push({
      id: "neostigmine-unopposed-muscarinic-hyperstimulation",
      title: "Neostigmine Unopposed Muscarinic Hyperstimulation Hazard",
      severity: "critical",
      mechanism:
        "Neostigmine inhibits AChE indiscriminately across all cholinergic junctions, provoking massive peripheral muscarinic receptor hyperstimulation.",
      clinicalConsequence:
        "Profound sinus bradycardia, nodal escape rhythms, complete atrioventricular block, asystole, bronchospasm, and pulmonary flooding with secretions.",
      managementGuidance:
        "MANDATORY CO-ADMINISTRATION: Co-administer Glycopyrrolate at a fixed ratio of 0.2 mg glycopyrrolate per 1.0 mg neostigmine (e.g. 0.6 mg glycopyrrolate per 3.0 mg neostigmine).",
      citations: [
        "Mirakhur RK. Anticholinergic drugs in anaesthesia. Can J Anaesth. 1988.",
        "Miller's Anesthesia, 9th Edition. Chapter 29: Pharmacology of Muscle Relaxants and Reversal Agents.",
      ],
    });
  }

  // Collision F: Sugammadex on Benzylisoquinolines or Sux
  if (onDesk.hasSugammadex && (onDesk.hasBenzylisoquinoliniumNmba || onDesk.hasDepolarizingNmba)) {
    const offending = onDesk.hasBenzylisoquinoliniumNmba ? "Cisatracurium / Atracurium" : "Succinylcholine";
    collisions.push({
      id: "sugammadex-ineffective-class-mismatch",
      title: `Sugammadex Class Incompatibility: ZERO Affinity for ${offending}`,
      severity: "critical",
      mechanism:
        "Sugammadex cyclodextrin cavity (~7.5 Å) specifically encapsulates the lipophilic steroid nucleus of aminosteroids. Benzylisoquinolines and succinylcholine have zero structural fit (Kd > 100,000 µM).",
      clinicalConsequence:
        "Complete failure of reversal. Patient remains fully paralyzed and apneic.",
      managementGuidance:
        "For cisatracurium/atracurium, use Neostigmine + Glycopyrrolate once at least 2 twitches reappear on TOF. For succinylcholine, maintain mechanical ventilation until spontaneous BChE clearance.",
      citations: [
        "Welliver M, et al. Neuromuscular blockade and reversal. AANA J. 2016.",
        "Naguib M, et al. Anesthesiology 2023.",
      ],
    });
  }

  // Collision G: Propofol Infusion Syndrome (PRIS)
  if (prisEvaluation.isHighPrisRisk) {
    collisions.push({
      id: "pris-mitochondrial-uncoupling-alert",
      title: "Propofol Infusion Syndrome (PRIS) Threshold Warning",
      severity: "critical",
      mechanism: prisEvaluation.mechanism,
      clinicalConsequence:
        "Refractory metabolic lactic acidosis, rhabdomyolysis, hyperkalemia, Brugada-like ECG pattern, acute renal failure, and fatal refractory bradycardia/asystole.",
      managementGuidance:
        "Reduce propofol rate to < 4 mg/kg/h (< 67 mcg/kg/min) or rotate immediately to Dexmedetomidine (Precedex) per SCCM PADIS guidelines. Monitor serial lactate, CK, and triglycerides.",
      citations: [
        "Devlin JW, et al. SCCM PADIS Guidelines. Crit Care Med. 2018.",
        "Kam PC, et al. Propofol infusion syndrome. Anaesthesia. 2007.",
      ],
    });
  }

  // 8. Clinical Pearls
  const clinicalPearls: string[] = [
    "2023 ASA Guidelines Standard of Care: Quantitative neuromuscular monitoring (acceleromyography or electromyography) confirming a Train-of-Four (TOF) ratio ≥ 0.90 is the definitive standard of care to prevent residual paralysis before extubation.",
    "Sugammadex Actual Weight Sizing: Always calculate sugammadex dosing using actual total body weight (TBW), not ideal body weight, even in severe obesity, to ensure adequate 1:1 molar encapsulation excess.",
    "Cisatracurium Organ-Independence: Cisatracurium undergoes spontaneous Hofmann elimination and ester hydrolysis at physiologic pH and temperature. It is the drug of choice in multi-organ failure, cirrhosis, and acute kidney injury.",
    "PADIS Delirium Strategy: Routine benzodiazepine infusions are an independent modifiable risk factor for ICU delirium. Dexmedetomidine and propofol are favored to shorten mechanical ventilation and ICU length of stay.",
    "Glycopyrrolate Quaternary Safety: Glycopyrrolate does not cross the blood-brain barrier, preventing central anticholinergic syndrome and confusion seen with tertiary amines like atropine.",
  ];

  if (host.age === "geriatric") {
    clinicalPearls.push(
      "Geriatric Pharmacodynamics: Elderly patients have decreased hepatic blood flow, reduced plasma pseudocholinesterase, and prolonged neuromuscular recovery times. Dose titrations and quantitative TOF verification are mandatory.",
    );
  }

  return {
    onDesk,
    selectedNmba,
    tofEvaluation,
    sugammadexDosing,
    neostigmineDosing,
    succinylcholineWarning,
    pseudocholinesteraseEvaluation,
    prisEvaluation,
    activeCollisions: collisions,
    clinicalPearls,
    disclaimer: `${ANESTHESIA_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

// ============================================================================
// 12. HELPER ACCESSORS & UTILITIES
// ============================================================================

export function getNmbaProfile(id: string): NMBAProfile | undefined {
  return NMBA_PROFILES[id.toLowerCase().trim() as NMBAId];
}

export function getAllNmbaProfiles(): NMBAProfile[] {
  return Object.values(NMBA_PROFILES);
}

export function getReversalProfile(id: string): ReversalProfile | undefined {
  return REVERSAL_PROFILES[id.toLowerCase().trim() as ReversalAgentId];
}

export function getAllReversalProfiles(): ReversalProfile[] {
  return Object.values(REVERSAL_PROFILES);
}

export function getSedativeProfile(id: string): SedativeProfile | undefined {
  return SEDATIVE_PROFILES[id.toLowerCase().trim() as SedativeAgentId];
}

export function getAllSedativeProfiles(): SedativeProfile[] {
  return Object.values(SEDATIVE_PROFILES);
}
