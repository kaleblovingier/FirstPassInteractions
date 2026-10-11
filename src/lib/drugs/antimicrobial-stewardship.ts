/**
 * Antimicrobial Stewardship, Neuro/Nephrotoxicity, and Organ Collision Reference Engine.
 *
 * FD&C Act § 520(o)(1)(E) Regulatory Posture:
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations of antimicrobial toxicodynamics,
 * organ toxicities, dialytic clearance kinetics, and pharmacodynamic drug collisions to
 * enable licensed infectious disease specialists, clinical pharmacists, hospitalists, and
 * trainees to independently analyze antimicrobial safety profiles. It does not provide
 * patient-specific dosing directives, treatment orders, or diagnostic determinations.
 * Clinicians must consult full FDA-approved Prescribing Information, local institutional
 * antibiograms, and exercise independent clinical judgment.
 *
 * Clinical Scope:
 * 1. Cefepime Neurotoxicity & GABA-A Competitive Antagonism
 * 2. Daptomycin x HMG-CoA Reductase Inhibitors (Statins) Skeletal Myopathy & Sarcolemmal Disruption
 * 3. Linezolid / Tedizolid Reversible MAO-A/B Inhibition x Serotonergic Agents, Tyramine & Time-Dependent Toxicities
 * 4. Colistin (Polymyxin E) & Polymyxin B Nephrotoxicity & Presynaptic Neuromuscular Blockade
 * 5. Fluoroquinolones (Ciprofloxacin, Levofloxacin, Moxifloxacin) Multi-System Collisions & Chelation Kinetics
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext, DEFAULT_HOST } from "./types";
import { PI_FOOTER, NOT_CLEARED } from "../regulatory";

// ============================================================================
// REGULATORY DISCLAIMER & CITATIONS
// ============================================================================

export const ANTIMICROBIAL_REGULATORY_DISCLAIMER =
  "FirstPass Antimicrobial Stewardship, Neuro/Nephrotoxicity, and Organ Collision Reference Engine is an educational clinical pharmacology reference under Section 520(o)(1)(E) of the Federal Food, Drug, and Cosmetic Act (FD&C Act § 520(o)(1)(E)). It provides non-prescriptive educational decision-support describing antimicrobial pharmacology, toxicodynamic mechanisms, organ toxicities, dialytic clearance, and pharmacodynamic drug collisions based on peer-reviewed infectious disease literature and FDA-approved labeling. It does not provide medical diagnoses, treatment orders, or patient-specific dosing directives. Clinicians must consult full FDA-approved prescribing information, local institutional antibiograms, and exercise independent clinical judgment.";

export const ANTIMICROBIAL_CITATIONS: readonly string[] = [
  "Food and Drug Administration (FDA). FDA Drug Safety Communication: Cefepime and risk of seizure in patients with renal impairment. FDA; 2012.",
  "Fugate JE, Kalimullah EA, Hocker SE, et al. Cefepime neurotoxicity in the intensive care unit: a cause of severe, underrecognized encephalopathy. Crit Care. 2013;17(6):R264. doi:10.1186/cc13125.",
  "Boschung-Pasquier L, Atkinson A, Perrottet N, et al. Cefepime neurotoxicity: thresholds and risk factors. A systematic review. Clin Microbiol Infect. 2020;26(3):333-339. doi:10.1016/j.cmi.2019.10.005.",
  "Bhavnani SM, Rubino CM, Ambrose PG, Drusano GL. Daptomycin exposure and the probability of elevations in creatine phosphokinase (CPK): an analysis of patients from a prospective clinical trial. Clin Infect Dis. 2010;50(12):1568-1574. doi:10.1086/652767.",
  "Lawrence KR, Adra M, Gillman PK. Serious adverse events associated with oxazolidinone antibiotics: focus on serotonin syndrome and linezolid. Pharmacotherapy. 2006;26(5):697-707. doi:10.1592/phco.26.5.697.",
  "Nation RL, Garon-Skeffington P, et al. Polymyxin acute kidney injury and neuromuscular blockade: dosing and toxicity considerations. Clin Infect Dis. 2019;68(10):1788-1797. doi:10.1093/cid/ciy849.",
  "Tulkens PM, Arvis P, Kruesmann F. The safety of fluoroquinolones: an update on the tendon, nervous system, and aortic risks. Expert Opin Drug Saf. 2019;18(11):1011-1025. doi:10.1080/14740338.2019.1668375.",
  "Baddour LM, Wilson WR, Bayer AS, et al. Infective Endocarditis in Adults: Diagnosis, Antimicrobial Therapy, and Management of Complications: A Guideline for Healthcare Professionals From the American Heart Association. Circulation. 2015;132(15):1435-1486.",
  "Barlam TF, Cosgrove SE, Abbo LM, et al. Implementing an Antibiotic Stewardship Program: Guidelines by the Infectious Diseases Society of America and the Society for Healthcare Epidemiology of America. Clin Infect Dis. 2016;62(10):e51-e77. doi:10.1093/cid/ciw118.",
];

// ============================================================================
// DATA CONTRACTS & INTERFACES
// ============================================================================

export type AntimicrobialSeverity = "contraindicated" | "major" | "moderate" | "warning";

export type AntimicrobialCategory =
  | "cephalosporin"
  | "lipopeptide"
  | "oxazolidinone"
  | "polymyxin"
  | "fluoroquinolone";

export interface AntimicrobialProfile {
  id: string;
  name: string;
  brandNames: string[];
  category: AntimicrobialCategory;
  classLabel: string;
  spectrumSummary: string;
  primaryClearance: "renal" | "hepatic" | "mixed";
  dialyzability: string;
  blackBoxWarnings: string[];
  keyToxicities: string[];
  stewardshipIndication: string;
}

export interface CefepimeNeurotoxicityReport {
  agentId: "cefepime";
  mechanism: string;
  riskLevel: "standard" | "high" | "critical";
  riskFactors: string[];
  clinicalSpectrum: {
    ncse: { name: string; description: string; detection: string };
    eegFindings: { name: string; pattern: string; significance: string };
    myoclonus: { name: string; description: string };
    encephalopathy: { name: string; description: string };
    asterixis: { name: string; description: string };
    coma: { name: string; description: string };
  };
  onsetKinetics: {
    typicalOnsetDays: string;
    reversalCourse: string;
    serumTroughThresholdMcgMl: number;
  };
  hemodialysisClearance: {
    fractionRemovedPerSessionPct: number;
    dialysisKinetics: string;
    dosingScheduleStandard: string;
  };
  stewardshipAction: string[];
}

export interface DaptomycinMyopathyReport {
  agentId: "daptomycin";
  mechanism: string;
  statinCollision: {
    present: boolean;
    statinAgents: string[];
    mechanism: string;
    severity: "major" | "none";
  };
  practiceStandard: {
    statinManagement: string;
    cpkMonitoringCadence: string;
    discontinuationThresholds: {
      symptomaticCpkU_L: number;
      asymptomaticCpkU_L: number;
    };
    symptomVigilance: string[];
  };
  stewardshipAction: string[];
}

export interface OxazolidinoneReport {
  agentsPresent: ("linezolid" | "tedizolid")[];
  mechanism: string;
  serotoninToxicity: {
    riskLevel: "none" | "moderate" | "severe-life-threatening";
    interactingAgents: string[];
    mechanism: string;
    hunterCriteria: string[];
    highRiskClasses: string[];
  };
  tyraminePressorCollision: {
    mechanism: string;
    clinicalManifestations: string[];
    dietaryAvoidanceList: string[];
  };
  timeDependentToxicities: {
    myelosuppression: {
      onsetThresholdDays: number;
      pathophysiology: string;
      manifestations: string[];
      monitoring: string;
    };
    neuropathies: {
      onsetThresholdDays: number;
      peripheralNeuropathy: string;
      opticNeuropathy: string;
    };
  };
  stewardshipAction: string[];
}

export interface PolymyxinReport {
  agentsPresent: ("colistin" | "polymyxin-b")[];
  nephrotoxicity: {
    incidencePct: string;
    pathophysiology: string;
    synergisticNephrotoxins: string[];
    monitoring: string;
  };
  neuromuscularBlockade: {
    mechanism: string;
    clinicalManifestation: string;
    synergisticAgents: string[];
    reversalPearl: string;
  };
  stewardshipAction: string[];
}

export interface FluoroquinoloneReport {
  agentsPresent: ("ciprofloxacin" | "levofloxacin" | "moxifloxacin")[];
  blackBoxWarnings: {
    tendinopathy: {
      targetSite: string;
      mechanism: string;
      steroidCollision: {
        present: boolean;
        steroids: string[];
        synergyDescription: string;
      };
      highRiskCohorts: string[];
    };
    peripheralNeuropathy: {
      description: string;
    };
    cnsToxicities: {
      mechanism: string;
      seizureRiskFactors: string[];
    };
    qtProlongation: {
      hierarchy: string;
      mechanism: string;
    };
    aorticAneurysmDissection: {
      mechanism: string;
      contraindicatedPopulations: string[];
    };
  };
  cationChelationCollision: {
    present: boolean;
    cationsPresent: string[];
    mechanism: string;
    bioavailabilityReductionPct: string;
    mandatorySpacingRule: string;
    interactingCations: string[];
  };
  stewardshipAction: string[];
}

export interface AntimicrobialCollision {
  id: string;
  title: string;
  severity: AntimicrobialSeverity;
  category:
    | "cefepime-renal-neurotoxicity"
    | "daptomycin-statin-myopathy"
    | "oxazolidinone-serotonergic-syndrome"
    | "oxazolidinone-tyramine-pressor"
    | "polymyxin-nmba-respiratory-paralysis"
    | "polymyxin-aminoglycoside-toxicity"
    | "polymyxin-nephrotoxin-synergy"
    | "fluoroquinolone-steroid-tendon-rupture"
    | "fluoroquinolone-cation-chelation"
    | "fluoroquinolone-qt-stacking"
    | "fluoroquinolone-nsaid-seizure";
  antimicrobialIds: string[];
  interactingAgentIds: string[];
  mechanism: string;
  clinicalManifestation: string;
  practiceStandard: string;
  stewardshipAction: string;
}

export interface StewardshipMonitoringPlanItem {
  parameter: string;
  frequency: string;
  rationale: string;
  thresholds: string;
}

export interface AntimicrobialDeskDetection {
  hasAntimicrobial: boolean;
  hasCefepime: boolean;
  hasDaptomycin: boolean;
  hasLinezolid: boolean;
  hasTedizolid: boolean;
  hasOxazolidinone: boolean;
  hasColistin: boolean;
  hasPolymyxinB: boolean;
  hasPolymyxin: boolean;
  hasFluoroquinolone: boolean;
  hasCiprofloxacin: boolean;
  hasLevofloxacin: boolean;
  hasMoxifloxacin: boolean;
  hasStatin: boolean;
  hasSerotonergic: boolean;
  hasNeuromuscularBlocker: boolean;
  hasAminoglycoside: boolean;
  hasCation: boolean;
  hasCorticosteroid: boolean;
  matchedAntimicrobials: string[];
  matchedInteractingAgents: string[];
}

export interface AntimicrobialStewardshipReport {
  hasAntimicrobial: boolean;
  onDeskIds: string[];
  antimicrobialsOnDesk: AntimicrobialProfile[];
  cefepimeNeurotoxicity: CefepimeNeurotoxicityReport | null;
  daptomycinMyopathy: DaptomycinMyopathyReport | null;
  oxazolidinoneSerotoninTyramine: OxazolidinoneReport | null;
  polymyxinToxicities: PolymyxinReport | null;
  fluoroquinoloneCollisions: FluoroquinoloneReport | null;
  collisions: AntimicrobialCollision[];
  stewardshipPearls: string[];
  monitoringPlan: StewardshipMonitoringPlanItem[];
  disclaimer: string;
  citations: readonly string[];
}

// ============================================================================
// DRUG CATALOG IDENTIFIER SETS
// ============================================================================

export const CEFEPIME_IDS = new Set(["cefepime"]);
export const DAPTOMYCIN_IDS = new Set(["daptomycin"]);
export const OXAZOLIDINONE_IDS = new Set(["linezolid", "tedizolid"]);
export const POLYMYXIN_IDS = new Set(["colistin", "polymyxin-b"]);
export const FLUOROQUINOLONE_IDS = new Set(["ciprofloxacin", "levofloxacin", "moxifloxacin"]);

export const ANTIMICROBIAL_CORE_IDS = new Set([
  ...CEFEPIME_IDS,
  ...DAPTOMYCIN_IDS,
  ...OXAZOLIDINONE_IDS,
  ...POLYMYXIN_IDS,
  ...FLUOROQUINOLONE_IDS,
]);

export const STATIN_IDS = new Set([
  "atorvastatin",
  "rosuvastatin",
  "simvastatin",
  "pravastatin",
  "lovastatin",
  "fluvastatin",
  "pitavastatin",
  "simvastatin-ezetimibe",
  "atorvastatin-amlodipine",
  "rosuvastatin-ezetimibe",
]);

export const SEROTONERGIC_IDS = new Set([
  // SSRIs
  "fluoxetine",
  "sertraline",
  "paroxetine",
  "citalopram",
  "escitalopram",
  "fluvoxamine",
  // SNRIs
  "venlafaxine",
  "duloxetine",
  "desvenlafaxine",
  "levomilnacipran",
  // TCAs
  "amitriptyline",
  "nortriptyline",
  "imipramine",
  "clomipramine",
  "doxepin",
  // Triptans
  "sumatriptan",
  "rizatriptan",
  "zolmitriptan",
  // Opioids / Analgesics / Cough
  "tramadol",
  "meperidine",
  "methadone",
  "fentanyl",
  "dextromethorphan",
  // MAOIs
  "phenelzine",
  "tranylcypromine",
  "isocarboxazid",
  "selegiline",
  "rasagiline",
  // Others
  "buspirone",
  "methylene-blue",
]);

export const NMBA_IDS = new Set([
  "rocuronium",
  "vecuronium",
  "cisatracurium",
  "pancuronium",
  "succinylcholine",
]);

export const AMINOGLYCOSIDE_IDS = new Set([
  "gentamicin",
  "tobramycin",
  "amikacin",
  "streptomycin",
  "plazomicin",
]);

export const CATION_IDS = new Set([
  "calcium",
  "calcium-carbonate",
  "calcium-acetate",
  "calcium-gluconate",
  "calcium-chloride",
  "calcium-gluconate-iv",
  "iron",
  "ferrous-sulfate",
  "iron-sucrose",
  "iron-dextran",
  "magnesium",
  "magnesium-oxide",
  "magnesium-sulfate",
  "magnesium-citrate",
  "magnesium-sulfate-oral",
  "magnesium-sulfate-iv",
  "aluminum",
  "aluminum-hydroxide",
  "sucralfate",
  "zinc",
  "zinc-sulfate",
]);

export const STEROID_IDS = new Set([
  "prednisone",
  "prednisolone",
  "dexamethasone",
  "methylprednisolone",
  "hydrocortisone",
  "triamcinolone",
  "budesonide",
]);

export const NSAID_IDS = new Set([
  "ibuprofen",
  "naproxen",
  "meloxicam",
  "ketorolac",
  "indomethacin",
  "celecoxib",
  "aspirin",
  "diclofenac",
]);

// ============================================================================
// ANTIMICROBIAL PROFILES MASTER DATABASE
// ============================================================================

export const ANTIMICROBIAL_PROFILES: Record<string, AntimicrobialProfile> = {
  cefepime: {
    id: "cefepime",
    name: "Cefepime",
    brandNames: ["Maxipime"],
    category: "cephalosporin",
    classLabel: "Fourth-Generation Antipseudomonal Cephalosporin",
    spectrumSummary:
      "Broad-spectrum beta-lactam active against Pseudomonas aeruginosa, Enterobacteriaceae (AmpC beta-lactamase producers), and Methicillin-Susceptible Staphylococcus aureus (MSSA). Lacks activity against MRSA and Enterococcus.",
    primaryClearance: "renal",
    dialyzability:
      "Highly dialyzable (~68-70% cleared per 3h hemodialysis session) due to low molecular weight (480 Da) and low plasma protein binding (~20%). Must be administered post-HD.",
    blackBoxWarnings: [],
    keyToxicities: [
      "Neurotoxicity (competitive GABA-A antagonism, encephalopathy, myoclonus, NCSE)",
      "Clostridioides difficile-associated diarrhea",
      "Hypersensitivity / beta-lactam anaphylaxis",
      "Drug-induced positive direct Coombs test",
    ],
    stewardshipIndication:
      "Reserved for serious pseudomonal infections, febrile neutropenia, nosocomial pneumonia, and complicated intra-abdominal/urinary tract infections. Mandatory renal interval adjustment to prevent neurotoxic peak/trough accumulation.",
  },
  daptomycin: {
    id: "daptomycin",
    name: "Daptomycin",
    brandNames: ["Cubicin", "Cubicin RF"],
    category: "lipopeptide",
    classLabel: "Cyclic Lipopeptide Antibacterial",
    spectrumSummary:
      "Bactericidal lipopeptide with rapid activity against Gram-positive pathogens including MRSA, Vancomycin-Intermediate S. aureus (VISA), Vancomycin-Resistant S. aureus (VRSA), and Vancomycin-Resistant Enterococci (VRE; E. faecium and E. faecalis). Inactivated by pulmonary surfactant (strictly contraindicated in pneumonia).",
    primaryClearance: "renal",
    dialyzability:
      "Moderately dialyzable (~30-50% cleared by HD; dosed every 48 hours in ESRD or after HD on dialysis days).",
    blackBoxWarnings: [],
    keyToxicities: [
      "Skeletal muscle sarcolemmal injury, myopathy, and rhabdomyolysis with elevated CPK",
      "Eosinophilic pneumonia (fever, dyspnea, peripheral infiltrates; onset 2-4 weeks)",
      "Peripheral neuropathy",
    ],
    stewardshipIndication:
      "Gold-standard bactericidal therapy for MRSA bacteremia, right-sided infective endocarditis, and complicated skin/soft tissue infections. Mandatory hold on concurrent statins and baseline + weekly CPK monitoring.",
  },
  linezolid: {
    id: "linezolid",
    name: "Linezolid",
    brandNames: ["Zyvox"],
    category: "oxazolidinone",
    classLabel: "Oxazolidinone Ribosomal Inhibitor (50S)",
    spectrumSummary:
      "Bacteriostatic oxazolidinone active against resistant Gram-positive organisms, including MRSA, VRE faecium/faecalis, and coagulase-negative Staphylococci. 100% oral bioavailability facilitates seamless IV-to-oral switch.",
    primaryClearance: "hepatic",
    dialyzability:
      "Dialyzable (~30% removed by HD; dose after hemodialysis).",
    blackBoxWarnings: [],
    keyToxicities: [
      "Serotonin syndrome via reversible non-selective MAO-A/B inhibition with serotonergic agents",
      "Tyramine pressor sensitivity ('cheese reaction') with aged/fermented dietary tyramine",
      "Mitochondrial myelosuppression (thrombocytopenia, anemia) after >= 14 days of therapy",
      "Peripheral and optic neuropathy / vision loss after > 28 days of therapy",
      "Lactic acidosis (mitochondrial electron transport chain inhibition)",
    ],
    stewardshipIndication:
      "Indicated for VRE infections, hospital-acquired pneumonia (MRSA), and complicated skin/soft tissue infections. Screen patient for serotonergic agents before initiation; mandate weekly CBC.",
  },
  tedizolid: {
    id: "tedizolid",
    name: "Tedizolid",
    brandNames: ["Sivextro"],
    category: "oxazolidinone",
    classLabel: "Second-Generation Oxazolidinone",
    spectrumSummary:
      "Potent oxazolidinone active against MRSA, MSSA, and Streptococcus pyogenes. Once-daily dosing (200 mg q24h) for a standard 6-day course in acute bacterial skin and skin structure infections (ABSSSI).",
    primaryClearance: "hepatic",
    dialyzability:
      "Not dialyzable to a significant degree; no supplemental dose required post-HD.",
    blackBoxWarnings: [],
    keyToxicities: [
      "Weak reversible MAO-A/B inhibition (substantially lower clinical serotonin collision propensity than linezolid, but class precautions remain)",
      "Reversible myelosuppression (lower incidence in labeled 6-day courses)",
      "Peripheral and optic neuropathy with prolonged unapproved courses",
    ],
    stewardshipIndication:
      "Targeted ABSSSI therapy with short-course advantages over linezolid. Class warnings regarding serotonergic drugs and MAO inhibition still warrant vigilance.",
  },
  colistin: {
    id: "colistin",
    name: "Colistin (Colistimethate Sodium)",
    brandNames: ["Coly-Mycin M"],
    category: "polymyxin",
    classLabel: "Polymyxin Cationic Lipopeptide Detergent (Polymyxin E)",
    spectrumSummary:
      "Last-line bactericidal membrane-disrupting cationic detergent active against Carbapenem-Resistant Enterobacteriaceae (CRE), multidrug-resistant Pseudomonas aeruginosa, and Acinetobacter baumannii. Inactive against Proteus, Providencia, Morganella, and Serratia.",
    primaryClearance: "renal",
    dialyzability:
      "Colistimethate prodrug is cleared renally and dialyzed; requires complex post-HD supplemental dosing based on specialized PK nomograms.",
    blackBoxWarnings: [],
    keyToxicities: [
      "Severe nephrotoxicity: acute tubular necrosis (ATN) and membrane lysis (30-50% incidence)",
      "Presynaptic neuromuscular blockade: respiratory muscle paralysis and prolonged apnea",
      "Neurotoxicity: paresthesias, dizziness, ataxia, confusion",
    ],
    stewardshipIndication:
      "Strictly restricted salvage therapy for extensively drug-resistant (XDR) Gram-negative bacilli when newer beta-lactamase inhibitor combinations (ceftazidime-avibactam, meropenem-vaborbactam, cefiderocol) are unavailable or resistant.",
  },
  "polymyxin-b": {
    id: "polymyxin-b",
    name: "Polymyxin B",
    brandNames: ["Polymyxin B Sulfate"],
    category: "polymyxin",
    classLabel: "Polymyxin Cationic Lipopeptide Detergent",
    spectrumSummary:
      "Bactericidal cationic lipopeptide active against multidrug-resistant Gram-negative pathogens (P. aeruginosa, A. baumannii, Klebsiella pneumoniae). Administered as active drug (not prodrug), avoiding unpredictable colistimethate conversion kinetics.",
    primaryClearance: "mixed",
    dialyzability:
      "Negligible renal clearance / dialysis removal; standard systemic dosing maintained in renal failure and ESRD.",
    blackBoxWarnings: [],
    keyToxicities: [
      "Severe dose-dependent nephrotoxicity (tubular cell membrane permeabilization)",
      "Presynaptic neuromuscular junction blockade and respiratory depression",
      "Facial paresthesias and peripheral neurotoxicity",
    ],
    stewardshipIndication:
      "Preferred over colistin for systemic bloodstream and deep-tissue infections due to predictable pharmacokinetics, but shares identical severe nephrotoxic and neuromuscular collision liabilities.",
  },
  ciprofloxacin: {
    id: "ciprofloxacin",
    name: "Ciprofloxacin",
    brandNames: ["Cipro"],
    category: "fluoroquinolone",
    classLabel: "Second-Generation Fluoroquinolone (Topoisomerase II/IV Inhibitor)",
    spectrumSummary:
      "Oral/IV fluoroquinolone with potent Gram-negative activity including Pseudomonas aeruginosa, Enterobacteriaceae, and atypical pathogens. Moderate CYP1A2 inhibitor.",
    primaryClearance: "renal",
    dialyzability:
      "Poorly dialyzed (<10% removed by HD); requires renal interval extension for CrCl < 50 mL/min.",
    blackBoxWarnings: [
      "Tendinitis and tendon rupture (Achilles tendon; exacerbated by steroids and age >= 60)",
      "Peripheral neuropathy (rapid onset, potentially permanent axonal injury)",
      "Central nervous system toxicities (seizures, psychosis, hallucinations)",
      "Exacerbation of myasthenia gravis",
      "Aortic aneurysm and dissection (extracellular matrix collagen degradation)",
    ],
    keyToxicities: [
      "Polyvalent cation chelation (Fe2+, Ca2+, Mg2+, Al3+, Zn2+) slashing absorption by 50-90%",
      "GABA-A competitive antagonism lowering seizure threshold",
      "QTc interval prolongation and Torsades de Pointes",
      "Dysglycemia (hypoglycemia and hyperglycemia)",
      "CYP1A2 victim toxicity (tizanidine, theophylline)",
    ],
    stewardshipIndication:
      "FDA boxed warnings restrict use in uncomplicated UTIs, acute sinusitis, and acute bronchitis when other options exist. Reserve for documented pseudomonal or multidrug-resistant infections.",
  },
  levofloxacin: {
    id: "levofloxacin",
    name: "Levofloxacin",
    brandNames: ["Levaquin"],
    category: "fluoroquinolone",
    classLabel: "Third-Generation Respiratory Fluoroquinolone",
    spectrumSummary:
      "Broad-spectrum L-isomer of ofloxacin with expanded activity against Streptococcus pneumoniae, atypicals (Legionella, Mycoplasma, Chlamydia), and Gram-negative bacilli including P. aeruginosa. 100% oral bioavailability.",
    primaryClearance: "renal",
    dialyzability:
      "Minimally removed by hemodialysis (<5%); requires mandatory dose adjustment for CrCl < 50 mL/min.",
    blackBoxWarnings: [
      "Tendinitis and tendon rupture (Achilles tendon)",
      "Peripheral neuropathy",
      "Central nervous system toxicities",
      "Exacerbation of myasthenia gravis",
      "Aortic aneurysm and dissection",
    ],
    keyToxicities: [
      "Divalent/trivalent cation chelation",
      "QTc interval prolongation",
      "Achilles tendinitis / rupture (amplified by corticosteroids)",
      "Dysglycemia",
    ],
    stewardshipIndication:
      "Indicated for community-acquired pneumonia (CAP), nosocomial pneumonia, and complicated pyelonephritis. Avoid in uncomplicated infections per FDA stewardship guidance.",
  },
  moxifloxacin: {
    id: "moxifloxacin",
    name: "Moxifloxacin",
    brandNames: ["Avelox"],
    category: "fluoroquinolone",
    classLabel: "Fourth-Generation Respiratory Fluoroquinolone",
    spectrumSummary:
      "Expanded Gram-positive, anaerobic (Bacteroides fragilis), and atypical coverage. Lacks activity against Pseudomonas aeruginosa and does NOT achieve therapeutic urinary concentrations (strictly contraindicated in UTI/pyelonephritis).",
    primaryClearance: "hepatic",
    dialyzability:
      "Eliminated predominantly via hepatic glucuronidation and sulfation; no renal dose adjustment required.",
    blackBoxWarnings: [
      "Tendinitis and tendon rupture",
      "Peripheral neuropathy",
      "Central nervous system toxicities",
      "Exacerbation of myasthenia gravis",
      "Aortic aneurysm and dissection",
    ],
    keyToxicities: [
      "Highest propensity for QTc prolongation among fluoroquinolones (IKr channel blockade)",
      "Polyvalent cation chelation with oral supplements",
      "Hepatotoxicity (rare fulminant hepatic failure)",
    ],
    stewardshipIndication:
      "Reserved for CAP or intra-abdominal infections with beta-lactam anaphylaxis. Do not use for urinary tract infections.",
  },
};

// ============================================================================
// DETECTION & LOOKUP ENGINE
// ============================================================================

/**
 * Rapid desk detection function matching antimicrobials and colliding perpetrators/victims.
 */
export function antimicrobialOnDesk(drugIds: string[]): AntimicrobialDeskDetection {
  const normalized = new Set(drugIds.map((id) => id.toLowerCase().trim()));

  // Cefepime
  const hasCefepime = [...normalized].some(
    (id) => CEFEPIME_IDS.has(id) || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("cefepime"))
  );

  // Daptomycin
  const hasDaptomycin = [...normalized].some(
    (id) => DAPTOMYCIN_IDS.has(id) || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("daptomycin"))
  );

  // Oxazolidinones
  const hasLinezolid = [...normalized].some(
    (id) => id === "linezolid" || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("linezolid"))
  );
  const hasTedizolid = [...normalized].some(
    (id) => id === "tedizolid" || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("tedizolid"))
  );
  const hasOxazolidinone = hasLinezolid || hasTedizolid;

  // Polymyxins
  const hasColistin = [...normalized].some(
    (id) => id === "colistin" || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("colistin"))
  );
  const hasPolymyxinB = [...normalized].some(
    (id) => id === "polymyxin-b" || id === "polymyxin"
  );
  const hasPolymyxin = hasColistin || hasPolymyxinB;

  // Fluoroquinolones
  const hasCiprofloxacin = [...normalized].some(
    (id) => id === "ciprofloxacin" || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("ciprofloxacin"))
  );
  const hasLevofloxacin = [...normalized].some(
    (id) => id === "levofloxacin" || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("levofloxacin"))
  );
  const hasMoxifloxacin = [...normalized].some(
    (id) => id === "moxifloxacin" || DRUG_BY_ID[id]?.aliases.some((a) => a.toLowerCase().includes("moxifloxacin"))
  );
  const hasFluoroquinolone = hasCiprofloxacin || hasLevofloxacin || hasMoxifloxacin;

  // Interacting drug classes
  const hasStatin = [...normalized].some(
    (id) => STATIN_IDS.has(id) || DRUG_BY_ID[id]?.pd.includes("statin") || DRUG_BY_ID[id]?.cls.toLowerCase().includes("statin")
  );

  const hasSerotonergic = [...normalized].some(
    (id) =>
      (SEROTONERGIC_IDS.has(id) ||
        DRUG_BY_ID[id]?.pd.includes("serotonergic") ||
        DRUG_BY_ID[id]?.pd.includes("ssri-snri") ||
        DRUG_BY_ID[id]?.pd.includes("maoi")) &&
      id !== "linezolid" &&
      id !== "tedizolid"
  );

  const hasNeuromuscularBlocker = [...normalized].some(
    (id) => NMBA_IDS.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("neuromuscular blocker")
  );

  const hasAminoglycoside = [...normalized].some(
    (id) => AMINOGLYCOSIDE_IDS.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("aminoglycoside")
  );

  const hasCation = [...normalized].some((id) => CATION_IDS.has(id));

  const hasCorticosteroid = [...normalized].some(
    (id) =>
      STEROID_IDS.has(id) ||
      DRUG_BY_ID[id]?.cls.toLowerCase().includes("corticosteroid") ||
      (DRUG_BY_ID[id]?.cls.toLowerCase().includes("steroid") && !DRUG_BY_ID[id]?.cls.toLowerCase().includes("anabolic"))
  );

  const matchedAntimicrobials: string[] = [];
  if (hasCefepime) matchedAntimicrobials.push("cefepime");
  if (hasDaptomycin) matchedAntimicrobials.push("daptomycin");
  if (hasLinezolid) matchedAntimicrobials.push("linezolid");
  if (hasTedizolid) matchedAntimicrobials.push("tedizolid");
  if (hasColistin) matchedAntimicrobials.push("colistin");
  if (hasPolymyxinB) matchedAntimicrobials.push("polymyxin-b");
  if (hasCiprofloxacin) matchedAntimicrobials.push("ciprofloxacin");
  if (hasLevofloxacin) matchedAntimicrobials.push("levofloxacin");
  if (hasMoxifloxacin) matchedAntimicrobials.push("moxifloxacin");

  const matchedInteractingAgents: string[] = [];
  for (const id of normalized) {
    if (
      STATIN_IDS.has(id) ||
      SEROTONERGIC_IDS.has(id) ||
      NMBA_IDS.has(id) ||
      AMINOGLYCOSIDE_IDS.has(id) ||
      CATION_IDS.has(id) ||
      STEROID_IDS.has(id)
    ) {
      if (!matchedAntimicrobials.includes(id)) {
        matchedInteractingAgents.push(id);
      }
    }
  }

  const hasAntimicrobial = matchedAntimicrobials.length > 0;

  return {
    hasAntimicrobial,
    hasCefepime,
    hasDaptomycin,
    hasLinezolid,
    hasTedizolid,
    hasOxazolidinone,
    hasColistin,
    hasPolymyxinB,
    hasPolymyxin,
    hasFluoroquinolone,
    hasCiprofloxacin,
    hasLevofloxacin,
    hasMoxifloxacin,
    hasStatin,
    hasSerotonergic,
    hasNeuromuscularBlocker,
    hasAminoglycoside,
    hasCation,
    hasCorticosteroid,
    matchedAntimicrobials,
    matchedInteractingAgents,
  };
}

// ============================================================================
// SECTION EVALUATORS
// ============================================================================

/**
 * 1. Cefepime Neurotoxicity & GABA-A Competitive Antagonism Evaluator
 */
export function evaluateCefepimeNeurotoxicity(
  drugIds: string[],
  host: HostContext
): CefepimeNeurotoxicityReport | null {
  const onDesk = antimicrobialOnDesk(drugIds);
  if (!onDesk.hasCefepime) return null;

  const isRenalImpaired = host.kidney === "ckd";
  const isGeriatric = host.age === "geriatric";

  const riskFactors: string[] = [
    "High-dose or unadjusted cefepime therapy exceeding renal excretory capacity",
    "Impaired glomerular filtration (CrCl < 50 mL/min, ESRD on intermittent hemodialysis / peritoneal dialysis)",
    "Systemic inflammation / septicemia causing disruption of tight junctions at the blood-brain barrier",
  ];
  if (isRenalImpaired) {
    riskFactors.push("Patient context: Documented baseline chronic kidney disease / reduced GFR");
  }
  if (isGeriatric) {
    riskFactors.push("Patient context: Geriatric age cohort (age-related nephrosclerosis and increased CNS susceptibility)");
  }

  let riskLevel: "standard" | "high" | "critical" = "standard";
  if (isRenalImpaired) {
    riskLevel = "critical";
  } else if (isGeriatric) {
    riskLevel = "high";
  }

  return {
    agentId: "cefepime",
    mechanism:
      "Cefepime traverses the blood-brain barrier (significantly accelerated by systemic inflammation and sepsis) and functions as a concentration-dependent competitive antagonist at postsynaptic GABA-A (gamma-aminobutyric acid type A) receptors. By blocking GABA binding, cefepime impairs chloride influx into cortical neurons, diminishing inhibitory neurotransmission and provoking intense cortical hyperexcitability, myoclonic jerking, and epileptiform discharges.",
    riskLevel,
    riskFactors,
    clinicalSpectrum: {
      ncse: {
        name: "Non-Convulsive Status Epilepticus (NCSE)",
        description:
          "Insidious continuous electrographic seizure activity without overt tonic-clonic convulsions. Manifests as unresponsiveness, subtle eye twitching, blinking, or mutism. Frequently misattributed to septic or uremic encephalopathy.",
        detection: "Requires emergent, continuous electroencephalography (cEEG) for definitive diagnosis.",
      },
      eegFindings: {
        name: "Generalized Periodic Discharges (GPDs) & Triphasic Waves",
        pattern: "Bilateral, synchronous Generalized Periodic Discharges (GPDs) with or without triphasic morphology at 1-2 Hz.",
        significance: "Diagnostic hallmark of severe neurotoxicity, resolving rapidly upon drug discontinuation.",
      },
      myoclonus: {
        name: "Myoclonus",
        description:
          "Sudden, involuntary, arrhythmic shock-like muscle contractions, predominantly involving the face, upper extremities, and perioral musculature.",
      },
      encephalopathy: {
        name: "Acute Toxic Encephalopathy",
        description:
          "Progressive cognitive slowing, severe confusion, disorientation, agitation, and fluctuating delirium.",
      },
      asterixis: {
        name: "Asterixis ('Liver Flap')",
        description:
          "Lapse of sustained posture during wrist extension, mimicking hepatic or uremic metabolic flap.",
      },
      coma: {
        name: "Profound Stupor / Coma",
        description:
          "Deep unresponsiveness in unrecognized drug accumulation with high serum concentrations (>35 mcg/mL).",
      },
    },
    onsetKinetics: {
      typicalOnsetDays: "2 to 5 days post-initiation (median ~3-4 days in unadjusted renal failure)",
      reversalCourse:
        "Rapid clinical and electrographic reversal within 48 to 72 hours (2-3 days) following dose adjustment or drug cessation.",
      serumTroughThresholdMcgMl: 20, // Trough >20 mcg/mL associated with neurotoxicity, >35 mcg/mL highly predictive
    },
    hemodialysisClearance: {
      fractionRemovedPerSessionPct: 70, // ~68-70% removed per standard 3-hour session
      dialysisKinetics:
        "Low molecular weight (480 Da), hydrophilic profile, and minimal plasma protein binding (~20%) permit robust clearance through high-flux dialyzer membranes.",
      dosingScheduleStandard:
        "Mandatory administration immediately AFTER hemodialysis runs. Administering cefepime pre-dialysis strips ~70% of the active drug into dialysate, collapsing pharmacodynamic %T > MIC against Pseudomonas; conversely, failing to extend dose intervals between dialyses triggers severe neurotoxic accumulation.",
    },
    stewardshipAction: [
      "Mandate renal dose adjustment for CrCl < 50 mL/min (e.g., 1 g IV q24h or 1 g IV post-HD vs 2 g IV q8h standard).",
      "In any patient developing acute delirium, myoclonus, or confusion while receiving cefepime, immediately order continuous EEG and hold cefepime.",
      "Switch to alternative antipseudomonal agents (meropenem [provided valproate is absent], piperacillin-tazobactam, or aztreonam) during neurotoxicity workup.",
      "Consider emergent hemodialysis in life-threatening NCSE or severe overdose to rapidly extract ~70% of circulating drug.",
    ],
  };
}

/**
 * 2. Daptomycin x HMG-CoA Reductase Inhibitors (Statins) Skeletal Myopathy Evaluator
 */
export function evaluateDaptomycinMyopathy(
  drugIds: string[],
  host: HostContext
): DaptomycinMyopathyReport | null {
  const onDesk = antimicrobialOnDesk(drugIds);
  if (!onDesk.hasDaptomycin) return null;

  const statinAgents = drugIds.filter(
    (id) => STATIN_IDS.has(id) || DRUG_BY_ID[id]?.pd.includes("statin") || DRUG_BY_ID[id]?.cls.toLowerCase().includes("statin")
  );
  const statinPresent = statinAgents.length > 0;
  const isRenalImpaired = host.kidney === "ckd";

  const actions: string[] = [
    "Obtain baseline serum creatine phosphokinase (CK / CPK) before the first dose of daptomycin.",
    "Practice standard: Temporarily HOLD all HMG-CoA reductase inhibitor (statin) therapy for the entire duration of daptomycin.",
    "Order weekly CPK monitoring in standard-risk inpatients.",
  ];

  if (statinPresent) {
    actions.unshift(
      "CRITICAL COLLISION: Concurrent statin identified (" +
        statinAgents.join(", ") +
        "). Place an immediate order to hold statin therapy to prevent additive skeletal muscle sarcolemmal necrosis and rhabdomyolysis."
    );
  }

  if (isRenalImpaired) {
    actions.push(
      "Renal impairment detected: Daptomycin interval must be extended to every 48 hours (q48h) for CrCl < 30 mL/min / ESRD. Increase CPK monitoring frequency to twice weekly (q3-4d)."
    );
  } else if (statinPresent) {
    actions.push(
      "If cardiology deems statin continuation non-negotiable (e.g., acute ACS), mandate twice-weekly CPK monitoring and daily symptom surveillance."
    );
  }

  return {
    agentId: "daptomycin",
    mechanism:
      "Daptomycin is a cyclic lipopeptide that requires physiologic calcium (Ca2+) to undergo micellar oligomerization and insert its lipophilic tail into bacterial membranes. However, daptomycin also interacts directly with mammalian skeletal muscle sarcolemma, perturbing membrane integrity, triggering intracellular calcium influx, depleting myocyte ATP, and causing sarcolemmal disruption, muscle cell necrosis, and massive creatine kinase (CK / CPK) release into circulation, escalating to acute rhabdomyolysis and myoglobinuric renal tubular injury.",
    statinCollision: {
      present: statinPresent,
      statinAgents,
      mechanism:
        "Statins (atorvastatin, rosuvastatin, simvastatin, pravastatin, lovastatin) impair skeletal muscle mitochondrial ubiquinone (coenzyme Q10) synthesis and compromise myocyte membrane stability. Concurrent daptomycin and statin administration causes synergistic, additive sarcolemmal toxicity, drastically multiplying the incidence of severe myopathy, CPK elevation (>10x ULN), and fatal rhabdomyolysis.",
      severity: statinPresent ? "major" : "none",
    },
    practiceStandard: {
      statinManagement:
        "Hold all statin therapy for the entire duration of daptomycin treatment. Resume statin only after daptomycin completion and confirmation of normal CPK.",
      cpkMonitoringCadence:
        isRenalImpaired || statinPresent
          ? "Twice weekly (q3-4 days) CPK monitoring due to high-risk renal impairment and/or statin exposure."
          : "Weekly CPK monitoring at baseline and every 7 days during active therapy.",
      discontinuationThresholds: {
        symptomaticCpkU_L: 1000, // >1,000 U/L (approx. 5x ULN) with muscle pain/weakness
        asymptomaticCpkU_L: 2000, // >2,000 U/L (approx. 10x ULN) even without symptoms
      },
      symptomVigilance: [
        "Unexplained muscle pain, aching, tenderness, or cramping (predominantly in proximal calves, thighs, shoulders)",
        "Proximal symmetric muscle weakness or difficulty climbing stairs",
        "Dark, tea-colored, or cola-colored urine (hallmark sign of myoglobinuria)",
      ],
    },
    stewardshipAction: actions,
  };
}

/**
 * 3. Linezolid / Tedizolid x Serotonergic Agents & Tyramine Evaluator
 */
export function evaluateOxazolidinoneToxicities(
  drugIds: string[],
  host: HostContext
): OxazolidinoneReport | null {
  const onDesk = antimicrobialOnDesk(drugIds);
  if (!onDesk.hasOxazolidinone) return null;

  const agentsPresent: ("linezolid" | "tedizolid")[] = [];
  if (onDesk.hasLinezolid) agentsPresent.push("linezolid");
  if (onDesk.hasTedizolid) agentsPresent.push("tedizolid");

  const interactingSerotonergics = drugIds.filter(
    (id) =>
      (SEROTONERGIC_IDS.has(id) ||
        DRUG_BY_ID[id]?.pd.includes("serotonergic") ||
        DRUG_BY_ID[id]?.pd.includes("ssri-snri") ||
        DRUG_BY_ID[id]?.pd.includes("maoi")) &&
      id !== "linezolid" &&
      id !== "tedizolid"
  );

  const hasInteracting = interactingSerotonergics.length > 0;
  let riskLevel: "none" | "moderate" | "severe-life-threatening" = "none";
  if (hasInteracting) {
    riskLevel = onDesk.hasLinezolid ? "severe-life-threatening" : "moderate";
  }

  const stewardshipAction: string[] = [
    "Reversible MAO-A/B inhibition: Instruct dietary avoidance of tyramine-rich foods (aged cheeses, tap beer, fermented foods, cured meats) to prevent acute hypertensive crisis.",
    "Treatment duration >= 14 days: Mandate weekly Complete Blood Count (CBC) with differential to monitor for mitochondrial myelosuppression (thrombocytopenia, anemia).",
    "Treatment duration > 28 days: Perform baseline and periodic visual acuity and color vision testing; monitor for sensory peripheral neuropathy.",
  ];

  if (hasInteracting) {
    stewardshipAction.unshift(
      "CONTRAINDICATED / HIGH-ALERT COLLISION: Oxazolidinone co-administered with serotonergic agent(s) (" +
        interactingSerotonergics.join(", ") +
        "). Risk of fatal Serotonin Syndrome. Avoid combination; select alternative Gram-positive antibacterial (daptomycin, vancomycin, ceftaroline) or hold serotonergic agent with appropriate washout if feasible."
    );
  }

  return {
    agentsPresent,
    mechanism:
      "Oxazolidinones (linezolid and tedizolid) are synthetic antibacterial agents structurally related to the antidepressant toloxatone. They act as reversible, non-selective competitive inhibitors of monoamine oxidase isoforms A and B (MAO-A and MAO-B). MAO-A is the primary metabolic enzyme responsible for the oxidative deamination and breakdown of serotonin (5-HT), norepinephrine, and dopamine in the central nervous system and peripheral tissues.",
    serotoninToxicity: {
      riskLevel,
      interactingAgents: interactingSerotonergics,
      mechanism:
        "Concurrent administration of linezolid with serotonergic agents (SSRIs, SNRIs, TCAs, triptans, tramadol, meperidine, dextromethorphan) produces synergistic intrasynaptic accumulation of serotonin. Reuptake inhibition combined with blockade of enzymatic degradation triggers life-threatening Serotonin Toxicity (Serotonin Syndrome) characterized by postsynaptic 5-HT1A and 5-HT2A overstimulation.",
      hunterCriteria: [
        "Spontaneous clonus",
        "Inducible clonus with agitation or diaphoresis",
        "Ocular clonus with agitation or diaphoresis",
        "Tremor accompanied by hyperreflexia (prominently lower extremities)",
        "Hyperthermia (>38°C) accompanied by ocular or inducible clonus",
      ],
      highRiskClasses: [
        "SSRIs (fluoxetine, sertraline, paroxetine, citalopram, escitalopram)",
        "SNRIs (venlafaxine, duloxetine, desvenlafaxine)",
        "TCAs (amitriptyline, nortriptyline, imipramine)",
        "Triptans (sumatriptan, rizatriptan, zolmitriptan)",
        "Analgesics / Antitussives (tramadol, meperidine, methadone, fentanyl, dextromethorphan)",
        "MAOIs & Others (phenelzine, selegiline, rasagiline, buspirone, IV methylene blue)",
      ],
    },
    tyraminePressorCollision: {
      mechanism:
        "Inhibition of intestinal and hepatic MAO-A prevents the first-pass degradation of dietary tyramine. Unmetabolized tyramine enters the systemic circulation, is taken up into adrenergic nerve terminals via norepinephrine transporters (NET), and displaces vesicular norepinephrine into the synaptic cleft, triggering massive alpha-1 vasoconstriction, hypertensive crisis ('cheese reaction'), reflex bradycardia or tachycardia, and potential intracranial hemorrhage.",
      clinicalManifestations: [
        "Severe, explosive occipital or frontal headache",
        "Marked systolic and diastolic blood pressure elevations (BP > 180/120 mmHg)",
        "Diaphoresis, chest pain, palpitations, pallor, and intracranial hemorrhage risk",
      ],
      dietaryAvoidanceList: [
        "Aged and mature cheeses (parmesan, aged cheddar, gouda, roquefort, stilton)",
        "Unpasteurized draft or tap beers and red wines (Chianti)",
        "Aged, air-dried, or fermented meats (salami, pepperoni, prosciutto, summer sausage)",
        "Fermented soy products (soy sauce, tofu, miso) and yeast extracts (Marmite, Vegemite)",
        "Pickled or fermented vegetables (sauerkraut, kimchi)",
      ],
    },
    timeDependentToxicities: {
      myelosuppression: {
        onsetThresholdDays: 14,
        pathophysiology:
          "Linezolid cross-inhibits human mitochondrial protein synthesis via off-target binding to the 16S-like ribosomal RNA of mammalian 55S mitochondrial ribosomes (which share evolutionary homology with bacterial 70S ribosomes). This blunts translation of electron transport chain subunits in rapidly dividing hematopoietic stem cells, culminating in reversible thrombocytopenia, anemia, and neutropenia.",
        manifestations: ["Thrombocytopenia (platelets < 100,000/mcL)", "Anemia (normocytic normochromic)", "Pancytopenia"],
        monitoring: "Mandatory complete blood count (CBC) with platelet count weekly; discontinue if significant marrow suppression occurs.",
      },
      neuropathies: {
        onsetThresholdDays: 28,
        peripheralNeuropathy:
          "Axonal sensorimotor peripheral neuropathy manifesting with stocking-glove paresthesias, burning pain, and numbness; frequently persistent, irreversible, or takes months to resolve.",
        opticNeuropathy:
          "Bilateral, painless loss of visual acuity, central or cecocentral scotomas, and impaired color perception (dyschromatopsia). Secondary to mitochondrial damage in the optic nerve; requires urgent ophthalmologic examination and immediate drug cessation to prevent permanent blindness.",
      },
    },
    stewardshipAction,
  };
}

/**
 * 4. Colistin (Polymyxin E) & Polymyxin B Toxicities Evaluator
 */
export function evaluatePolymyxinToxicities(
  drugIds: string[],
  host: HostContext
): PolymyxinReport | null {
  const onDesk = antimicrobialOnDesk(drugIds);
  if (!onDesk.hasPolymyxin) return null;

  const agentsPresent: ("colistin" | "polymyxin-b")[] = [];
  if (onDesk.hasColistin) agentsPresent.push("colistin");
  if (onDesk.hasPolymyxinB) agentsPresent.push("polymyxin-b");

  const synergisticNMBAs = drugIds.filter(
    (id) => NMBA_IDS.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("neuromuscular blocker")
  );
  const synergisticAminoglycosides = drugIds.filter(
    (id) => AMINOGLYCOSIDE_IDS.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("aminoglycoside")
  );

  const actions: string[] = [
    "Severe Nephrotoxicity Alert: Polymyxins cause acute tubular necrosis (ATN) in 30-50% of patients. Maintain rigorous hydration, monitor daily SCr/BUN, and avoid concurrent nephrotoxins.",
    "Monitor respiratory function and neuromuscular status continuously; assess for ptosis, diplopia, swallowing difficulty, and respiratory muscle weakness.",
  ];

  if (synergisticNMBAs.length > 0) {
    actions.unshift(
      "CRITICAL ANESTHETIC COLLISION: Concurrent polymyxin and nondepolarizing neuromuscular blocker (" +
        synergisticNMBAs.join(", ") +
        "). Massive synergistic blockade of neuromuscular transmission predisposing to prolonged postoperative apnea and respiratory arrest. Anticholinesterases (neostigmine) provide inconsistent reversal; IV calcium gluconate may be required."
    );
  }

  if (synergisticAminoglycosides.length > 0) {
    actions.unshift(
      "HIGH TOXICITY SYNERGY: Concurrent polymyxin and aminoglycoside (" +
        synergisticAminoglycosides.join(", ") +
        "). Compounding risks of profound proximal tubular necrosis and additive presynaptic acetylcholine release blockade."
    );
  }

  return {
    agentsPresent,
    nephrotoxicity: {
      incidencePct: "30% to 50%",
      pathophysiology:
        "Colistin and Polymyxin B act as cationic amphipathic detergents. The positively charged polycationic peptide ring binds avidly to anionic phospholipids and megalin receptors on the apical brush border membrane of renal proximal tubular cells. The hydrophobic fatty acid tail inserts into the lipid bilayer, creating membrane pores, precipitating cell membrane permeabilization, mitochondrial swelling, caspase-mediated apoptosis, acute tubular necrosis (ATN), and cell lysis.",
      synergisticNephrotoxins: [
        "Vancomycin (additive proximal tubular oxidative stress and cast formation)",
        "Aminoglycosides (gentamicin, tobramycin, amikacin)",
        "Loop diuretics (furosemide; medullary dehydration)",
        "NSAIDs (afferent arteriolar vasoconstriction)",
        "IV iodinated radiocontrast media",
      ],
      monitoring: "Daily serum creatinine, blood urea nitrogen (BUN), electrolytes, and strict urine output (UOP) monitoring.",
    },
    neuromuscularBlockade: {
      mechanism:
        "Polymyxins block presynaptic voltage-gated calcium channels at the neuromuscular junction, preventing calcium influx and halting the exocytosis of acetylcholine (ACh) vesicles into the synaptic cleft. Simultaneously, they cause non-competitive desensitization of postsynaptic nicotinic acetylcholine receptors at the motor endplate.",
      clinicalManifestation:
        "Progressive symmetric muscle flaccidity, facial and perioral numbness, ptosis, diplopia, dysarthria, dysphagia, and sudden fatal respiratory muscle paralysis / apnea.",
      synergisticAgents: [
        ...synergisticNMBAs,
        ...synergisticAminoglycosides,
        "General anesthetics and magnesium infusions",
      ],
      reversalPearl:
        "Unlike pure competitive NMBA block, anticholinesterases (neostigmine, pyridostigmine) provide inconsistent or ineffective reversal because presynaptic calcium influx remains blunted. Administration of IV Calcium Gluconate (1-2 g IV) can partially restore presynaptic calcium influx and reverse polymyxin-mediated neuromuscular blockade.",
    },
    stewardshipAction: actions,
  };
}

/**
 * 5. Fluoroquinolones (Ciprofloxacin, Levofloxacin, Moxifloxacin) Multi-System Collisions Evaluator
 */
export function evaluateFluoroquinoloneCollisions(
  drugIds: string[],
  host: HostContext
): FluoroquinoloneReport | null {
  const onDesk = antimicrobialOnDesk(drugIds);
  if (!onDesk.hasFluoroquinolone) return null;

  const agentsPresent: ("ciprofloxacin" | "levofloxacin" | "moxifloxacin")[] = [];
  if (onDesk.hasCiprofloxacin) agentsPresent.push("ciprofloxacin");
  if (onDesk.hasLevofloxacin) agentsPresent.push("levofloxacin");
  if (onDesk.hasMoxifloxacin) agentsPresent.push("moxifloxacin");

  const steroidsPresent = drugIds.filter(
    (id) =>
      STEROID_IDS.has(id) ||
      DRUG_BY_ID[id]?.cls.toLowerCase().includes("corticosteroid") ||
      (DRUG_BY_ID[id]?.cls.toLowerCase().includes("steroid") && !DRUG_BY_ID[id]?.cls.toLowerCase().includes("anabolic"))
  );
  const cationsPresent = drugIds.filter((id) => CATION_IDS.has(id));
  const nsaidsPresent = drugIds.filter((id) => NSAID_IDS.has(id) || DRUG_BY_ID[id]?.pd.includes("nsaid"));

  const isGeriatric = host.age === "geriatric";
  const highRiskTendonCohorts: string[] = [
    "Concomitant systemic corticosteroid therapy (multiplicative risk)",
    "Age >= 60 years",
    "Chronic renal insufficiency / hemodialysis",
    "Solid organ transplant recipients (kidney, heart, lung)",
  ];
  if (isGeriatric) {
    highRiskTendonCohorts.push("Patient context: Geriatric cohort (age-related tendon degenerative changes)");
  }

  const actions: string[] = [
    "FDA Boxed Warning: Fluoroquinolones carry disabling and potentially irreversible serious adverse reactions (tendinitis/tendon rupture, peripheral neuropathy, CNS effects). Reserve for infections where no alternative antibacterials exist.",
    "Aortic Aneurysm Alert: Avoid fluoroquinolones in patients with known aortic aneurysm, hypertension, atherosclerosis, or connective tissue disorders (Marfan, Ehlers-Danlos).",
  ];

  if (cationsPresent.length > 0) {
    actions.unshift(
      "MANDATORY TIMING SEPARATION: Oral fluoroquinolone identified alongside polyvalent cation(s) (" +
        cationsPresent.join(", ") +
        "). Chelation slashes oral absorption by 50% to 90%. Administer oral fluoroquinolone at least 2 hours BEFORE or 4 to 6 hours AFTER polyvalent cations."
    );
  }

  if (steroidsPresent.length > 0) {
    actions.unshift(
      "HIGH-RISK BOXED COLLISION: Concomitant fluoroquinolone and systemic corticosteroid (" +
        steroidsPresent.join(", ") +
        "). Synergistic matrix metalloproteinase upregulation drastically accelerates tenocyte necrosis and Achilles tendon rupture. Discontinue fluoroquinolone immediately if tendon pain or swelling occurs."
    );
  }

  if (nsaidsPresent.length > 0) {
    actions.push(
      "CNS / Seizure Alert: Concurrent NSAID (" +
        nsaidsPresent.join(", ") +
        ") potentiates fluoroquinolone GABA-A antagonism, markedly lowering the seizure threshold."
    );
  }

  return {
    agentsPresent,
    blackBoxWarnings: {
      tendinopathy: {
        targetSite: "Achilles tendon (up to 90% of ruptures), rotator cuff, biceps, extensor pollicis longus",
        mechanism:
          "Fluoroquinolones upregulate matrix metalloproteinases (MMP-1, MMP-13) and inhibit tenocyte proliferation, causing tenocyte apoptosis, intracellular magnesium chelation, and degradation of extracellular matrix collagen fibril architecture. Can occur within 48 hours of starting or up to several months post-cessation.",
        steroidCollision: {
          present: steroidsPresent.length > 0,
          steroids: steroidsPresent,
          synergyDescription:
            "Concomitant systemic corticosteroids compound extracellular matrix breakdown, increasing the relative risk of catastrophic Achilles tendon rupture by 4- to 10-fold compared to monotherapy.",
        },
        highRiskCohorts: highRiskTendonCohorts,
      },
      peripheralNeuropathy: {
        description:
          "Rapid-onset sensory or sensorimotor axonal polyneuropathy presenting as burning pain, paresthesias, hypoesthesia, or numbness in extremities. May arise within days of initiation and persist permanently despite immediate drug cessation.",
      },
      cnsToxicities: {
        mechanism:
          "Fluoroquinolones competitively displace GABA from postsynaptic GABA-A receptors and stimulate excitatory NMDA receptors, precipitating central neurotoxicity: tremors, severe restlessness, anxiety, toxic psychosis, hallucinations, and lowering the convulsive seizure threshold.",
        seizureRiskFactors: [
          "Co-administration with NSAIDs (potentiation of GABA receptor blockade)",
          "History of epilepsy or unprovoked seizures",
          "Renal insufficiency causing unadjusted drug accumulation",
        ],
      },
      qtProlongation: {
        hierarchy: "Moxifloxacin > Levofloxacin > Ciprofloxacin",
        mechanism:
          "Concentration-dependent blockade of the rapid delayed rectifier potassium current (IKr) via binding to cardiac hERG channels, prolonging myocardial repolarization and precipitating Torsades de Pointes.",
      },
      aorticAneurysmDissection: {
        mechanism:
          "Degradation of type I and type III collagen fibrils and elastin fragmentation in the aortic medial layer via matrix metalloproteinase activation, predisposing to aortic dissection and aneurysm rupture.",
        contraindicatedPopulations: [
          "Pre-existing aortic aneurysm or history of aortic dissection",
          "Connective tissue disorders (Marfan syndrome, vascular Ehlers-Danlos syndrome)",
          "Severe uncontrolled hypertension",
          "Atherosclerotic cardiovascular disease",
        ],
      },
    },
    cationChelationCollision: {
      present: cationsPresent.length > 0,
      cationsPresent,
      mechanism:
        "Divalent (Fe2+, Ca2+, Mg2+, Zn2+) and trivalent (Al3+, Fe3+) cations form tight, insoluble, non-absorbable chelate complexes with the 4-keto and 3-carboxyl oxygen groups of the fluoroquinolone core within the gastrointestinal tract, rendering the antibiotic unabsorbable.",
      bioavailabilityReductionPct: "50% to 90%",
      mandatorySpacingRule:
        "Administer oral fluoroquinolones at least 2 hours BEFORE or 4 to 6 hours AFTER polyvalent cation-containing medications or mineral supplements.",
      interactingCations: [
        "Antacids containing aluminum hydroxide or magnesium hydroxide (e.g., Maalox, Mylanta)",
        "Sucralfate (contains basic aluminum sucrose sulfate)",
        "Oral iron supplements (ferrous sulfate, ferrous gluconate)",
        "Oral calcium supplements or calcium-rich meals/antacids",
        "Zinc supplements and multivitamins with minerals",
        "Didanosine chewable buffered tablets",
      ],
    },
    stewardshipAction: actions,
  };
}

// ============================================================================
// COLLISION DETECTION ENGINE
// ============================================================================

export function detectAntimicrobialCollisions(
  drugIds: string[],
  host: HostContext
): AntimicrobialCollision[] {
  const collisions: AntimicrobialCollision[] = [];
  const onDesk = antimicrobialOnDesk(drugIds);

  const isRenalImpaired = host.kidney === "ckd";

  // 1. Cefepime in renal impairment (Neurotoxicity)
  if (onDesk.hasCefepime && isRenalImpaired) {
    collisions.push({
      id: "cefepime-renal-neurotoxicity",
      title: "Cefepime Neurotoxicity & GABA-A Blockade in Renal Impairment",
      severity: "major",
      category: "cefepime-renal-neurotoxicity",
      antimicrobialIds: ["cefepime"],
      interactingAgentIds: [],
      mechanism:
        "Cefepime crosses the blood-brain barrier and competitively antagonizes GABA-A receptors. Reduced renal elimination in CKD/ESRD leads to dramatic supratherapeutic accumulation (Cmin > 20-35 mcg/mL), provoking non-convulsive status epilepticus (NCSE), GPDs on EEG, and myoclonus.",
      clinicalManifestation:
        "Acute encephalopathy, myoclonic jerking, asterixis, non-convulsive status epilepticus, and coma.",
      practiceStandard:
        "Mandatory renal interval adjustment according to CrCl (e.g., 1 g q24h or 1 g post-HD). Immediate continuous EEG for acute delirium; hemodialysis clears ~70% per 3-hour run.",
      stewardshipAction:
        "Renally adjust dose immediately; if neurotoxicity is suspected, switch to alternative antipseudomonal agent.",
    });
  }

  // 2. Daptomycin + Statin (Myopathy)
  if (onDesk.hasDaptomycin && onDesk.hasStatin) {
    const statins = drugIds.filter(
      (id) => STATIN_IDS.has(id) || DRUG_BY_ID[id]?.pd.includes("statin") || DRUG_BY_ID[id]?.cls.toLowerCase().includes("statin")
    );
    collisions.push({
      id: "daptomycin-statin-myopathy",
      title: "Daptomycin + HMG-CoA Reductase Inhibitor (Statin) Skeletal Myopathy",
      severity: "major",
      category: "daptomycin-statin-myopathy",
      antimicrobialIds: ["daptomycin"],
      interactingAgentIds: statins,
      mechanism:
        "Daptomycin disrupts human skeletal muscle sarcolemma; statins independently destabilize myocyte membranes via ubiquinone depletion. Combination produces synergistic myocyte lysis, severe CPK elevation, and rhabdomyolysis.",
      clinicalManifestation:
        "Myalgia, proximal muscle weakness, marked serum CPK elevation (>5-10x ULN), dark tea-colored urine, and acute kidney injury.",
      practiceStandard:
        "Hold all statin therapy for the entire duration of daptomycin. Baseline and weekly CPK monitoring (twice weekly in renal impairment).",
      stewardshipAction:
        "Hold statin therapy immediately. Stop daptomycin if CPK > 1,000 U/L with symptoms or > 2,000 U/L asymptomatic.",
    });
  }

  // 3. Oxazolidinones + Serotonergic Agents (Serotonin Syndrome)
  if (onDesk.hasOxazolidinone && onDesk.hasSerotonergic) {
    const oxas = onDesk.hasLinezolid ? ["linezolid"] : ["tedizolid"];
    const sero = drugIds.filter(
      (id) =>
        (SEROTONERGIC_IDS.has(id) ||
          DRUG_BY_ID[id]?.pd.includes("serotonergic") ||
          DRUG_BY_ID[id]?.pd.includes("ssri-snri") ||
          DRUG_BY_ID[id]?.pd.includes("maoi")) &&
        id !== "linezolid" &&
        id !== "tedizolid"
    );
    collisions.push({
      id: "oxazolidinone-serotonergic-syndrome",
      title: `${oxas.map((o) => ANTIMICROBIAL_PROFILES[o]?.name || o).join("/")} Reversible MAO Inhibition + Serotonergic Agent`,
      severity: onDesk.hasLinezolid ? "contraindicated" : "major",
      category: "oxazolidinone-serotonergic-syndrome",
      antimicrobialIds: oxas,
      interactingAgentIds: sero,
      mechanism:
        "Oxazolidinones reversibly inhibit MAO-A, blocking serotonin degradation. Co-administration with serotonergic psychotropics or analgesics triggers massive synaptic serotonin accumulation and Serotonin Syndrome.",
      clinicalManifestation:
        "Hunter criteria: spontaneous or ocular clonus, agitation, diaphoresis, hyperreflexia, hyperthermia (>38°C), autonomic collapse.",
      practiceStandard:
        "Avoid combination unless alternative Gram-positive antibacterials are strictly unavailable. If co-administered, mandate strict neuro-monitoring.",
      stewardshipAction:
        "Discontinue serotonergic agent or select non-MAOI alternative antibacterial (daptomycin, vancomycin, ceftaroline).",
    });
  }

  // 4. Polymyxin + Neuromuscular Blockers (Respiratory Paralysis)
  if (onDesk.hasPolymyxin && onDesk.hasNeuromuscularBlocker) {
    const polys = onDesk.hasColistin ? ["colistin"] : ["polymyxin-b"];
    const nmba = drugIds.filter(
      (id) => NMBA_IDS.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("neuromuscular blocker")
    );
    collisions.push({
      id: "polymyxin-nmba-respiratory-paralysis",
      title: "Polymyxin + Neuromuscular Blocker Presynaptic Transmission Blockade",
      severity: "contraindicated",
      category: "polymyxin-nmba-respiratory-paralysis",
      antimicrobialIds: polys,
      interactingAgentIds: nmba,
      mechanism:
        "Polymyxins inhibit presynaptic calcium influx (blunting acetylcholine release) and desensitize postsynaptic nicotinic receptors, synergistically multiplying neuromuscular blockade duration and triggering prolonged apnea.",
      clinicalManifestation:
        "Failure of postoperative spontaneous ventilation, prolonged paralysis, flaccid weakness, and fatal apnea.",
      practiceStandard:
        "Avoid combination during surgical procedures; if unavoidable, maintain mechanical ventilation and administer IV Calcium Gluconate (1-2 g) for rescue.",
      stewardshipAction:
        "Alert anesthesia/critical care team. Note that neostigmine provides unreliable reversal; prepare IV calcium gluconate.",
    });
  }

  // 5. Polymyxin + Aminoglycosides (Dual Nephrotoxicity & Neuromuscular Block)
  if (onDesk.hasPolymyxin && onDesk.hasAminoglycoside) {
    const polys = onDesk.hasColistin ? ["colistin"] : ["polymyxin-b"];
    const ags = drugIds.filter(
      (id) => AMINOGLYCOSIDE_IDS.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("aminoglycoside")
    );
    collisions.push({
      id: "polymyxin-aminoglycoside-toxicity",
      title: "Polymyxin + Aminoglycoside Synergistic Nephrotoxicity & Neuromuscular Blockade",
      severity: "major",
      category: "polymyxin-aminoglycoside-toxicity",
      antimicrobialIds: polys,
      interactingAgentIds: ags,
      mechanism:
        "Additive membrane permeabilization of renal proximal tubular cells causes severe ATN. Additive presynaptic inhibition of acetylcholine release produces neuromuscular depression.",
      clinicalManifestation:
        "Acute oliguric or non-oliguric kidney injury, rapid rise in SCr, respiratory muscle weakness.",
      practiceStandard:
        "Avoid dual polymyxin and aminoglycoside therapy. Monitor daily renal indices and therapeutic drug levels.",
      stewardshipAction:
        "Evaluate alternative Gram-negative regimens (ceftazidime-avibactam, cefiderocol).",
    });
  }

  // 6. Fluoroquinolone + Corticosteroids (Achilles Tendon Rupture)
  if (onDesk.hasFluoroquinolone && onDesk.hasCorticosteroid) {
    const fqs = [
      onDesk.hasCiprofloxacin ? "ciprofloxacin" : "",
      onDesk.hasLevofloxacin ? "levofloxacin" : "",
      onDesk.hasMoxifloxacin ? "moxifloxacin" : "",
    ].filter(Boolean);
    const steroids = drugIds.filter(
      (id) =>
        STEROID_IDS.has(id) ||
        DRUG_BY_ID[id]?.cls.toLowerCase().includes("corticosteroid") ||
        (DRUG_BY_ID[id]?.cls.toLowerCase().includes("steroid") && !DRUG_BY_ID[id]?.cls.toLowerCase().includes("anabolic"))
    );
    collisions.push({
      id: "fluoroquinolone-steroid-tendon-rupture",
      title: "Fluoroquinolone + Systemic Corticosteroid Achilles Tendon Rupture",
      severity: "major",
      category: "fluoroquinolone-steroid-tendon-rupture",
      antimicrobialIds: fqs,
      interactingAgentIds: steroids,
      mechanism:
        "Both agents independently activate matrix metalloproteinases and inhibit tenocyte collagen synthesis. Co-administration multiplies Achilles tendon rupture risk by 4- to 10-fold.",
      clinicalManifestation:
        "Sudden onset of severe pain, audible snapping/popping, swelling, and inability to bear weight on the Achilles tendon.",
      practiceStandard:
        "Avoid combination, particularly in patients >= 60 years or with renal dysfunction. Discontinue fluoroquinolone immediately at first sign of tendon pain.",
      stewardshipAction:
        "Switch to beta-lactam, macrolide, or other non-quinolone antibacterial.",
    });
  }

  // 7. Fluoroquinolone + Polyvalent Cations (Chelation Inactivation)
  if (onDesk.hasFluoroquinolone && onDesk.hasCation) {
    const fqs = [
      onDesk.hasCiprofloxacin ? "ciprofloxacin" : "",
      onDesk.hasLevofloxacin ? "levofloxacin" : "",
      onDesk.hasMoxifloxacin ? "moxifloxacin" : "",
    ].filter(Boolean);
    const cations = drugIds.filter((id) => CATION_IDS.has(id));
    collisions.push({
      id: "fluoroquinolone-cation-chelation",
      title: "Fluoroquinolone + Polyvalent Cation GI Chelation & Inactivation",
      severity: "major",
      category: "fluoroquinolone-cation-chelation",
      antimicrobialIds: fqs,
      interactingAgentIds: cations,
      mechanism:
        "Polyvalent metal cations (Fe2+, Ca2+, Mg2+, Al3+, Zn2+) form insoluble chelate complexes with the 4-keto and 3-carboxyl groups of fluoroquinolones, reducing oral bioavailability by 50% to 90%.",
      clinicalManifestation:
        "Clinical treatment failure, persistent bacteremia/sepsis, and rapid emergence of resistant bacterial mutants.",
      practiceStandard:
        "Mandatory spacing: Administer oral fluoroquinolones at least 2 hours BEFORE or 4 to 6 hours AFTER polyvalent cations.",
      stewardshipAction:
        "Stagger administration schedule on the medication administration record (MAR) or switch cation supplements to a spaced dosing window.",
    });
  }

  // 8. Fluoroquinolone + NSAIDs (Seizure Lowering)
  const hasNsaid = drugIds.some((id) => NSAID_IDS.has(id) || DRUG_BY_ID[id]?.pd.includes("nsaid"));
  if (onDesk.hasFluoroquinolone && hasNsaid) {
    const fqs = [
      onDesk.hasCiprofloxacin ? "ciprofloxacin" : "",
      onDesk.hasLevofloxacin ? "levofloxacin" : "",
      onDesk.hasMoxifloxacin ? "moxifloxacin" : "",
    ].filter(Boolean);
    const nsaids = drugIds.filter((id) => NSAID_IDS.has(id) || DRUG_BY_ID[id]?.pd.includes("nsaid"));
    collisions.push({
      id: "fluoroquinolone-nsaid-seizure",
      title: "Fluoroquinolone + NSAID Synergistic GABA-A Antagonism & Seizure Risk",
      severity: "moderate",
      category: "fluoroquinolone-nsaid-seizure",
      antimicrobialIds: fqs,
      interactingAgentIds: nsaids,
      mechanism:
        "NSAIDs potentiate fluoroquinolone competitive displacement of GABA from postsynaptic GABA-A receptors, lowering the convulsive threshold.",
      clinicalManifestation:
        "Tremors, severe restlessness, agitation, confusion, and generalized epileptic seizures.",
      practiceStandard:
        "Avoid concurrent high-dose NSAID therapy with fluoroquinolones, especially in patients with pre-existing epilepsy or CNS disorders.",
      stewardshipAction:
        "Select acetaminophen for analgesia/antipyresis in place of NSAIDs during fluoroquinolone therapy.",
    });
  }

  return collisions;
}

// ============================================================================
// STEWARDSHIP MONITORING PLAN & CLINICAL PEARLS GENERATORS
// ============================================================================

export function generateStewardshipMonitoringPlan(
  drugIds: string[],
  host: HostContext
): StewardshipMonitoringPlanItem[] {
  const onDesk = antimicrobialOnDesk(drugIds);
  const items: StewardshipMonitoringPlanItem[] = [];

  const isRenalImpaired = host.kidney === "ckd";

  if (onDesk.hasCefepime) {
    items.push({
      parameter: "Renal Function (SCr / CrCl / eGFR) & Mental Status",
      frequency: "Daily during active therapy",
      rationale:
        "Cefepime clearance is exclusively renal. Declining clearance precipitates rapid accumulation (Cmin > 20 mcg/mL), causing GABA-A antagonism, myoclonus, and NCSE.",
      thresholds: "CrCl < 50 mL/min mandates immediate dosage interval reduction. Acute confusion warrants continuous EEG.",
    });
    items.push({
      parameter: "Continuous Electroencephalogram (cEEG)",
      frequency: "Emergent if new confusion, delirium, or myoclonus arises",
      rationale:
        "NCSE is clinically occult and easily mistaken for sepsis-associated encephalopathy. GPDs and triphasic waves confirm cefepime neurotoxicity.",
      thresholds: "Generalized periodic discharges (GPDs) at 1-2 Hz resolve within 48-72h of drug discontinuation.",
    });
  }

  if (onDesk.hasDaptomycin) {
    const isHighRisk = isRenalImpaired || onDesk.hasStatin;
    items.push({
      parameter: "Serum Creatine Phosphokinase (CK / CPK)",
      frequency: isHighRisk ? "Twice weekly (every 3-4 days)" : "Baseline and weekly",
      rationale:
        "Daptomycin causes sarcolemmal disruption and skeletal myopathy. Statins and renal failure synergistically multiply rhabdomyolysis risk.",
      thresholds:
        "Discontinue daptomycin if CPK > 1,000 U/L with muscle pain/weakness, or > 2,000 U/L even if asymptomatic.",
    });
  }

  if (onDesk.hasOxazolidinone) {
    items.push({
      parameter: "Complete Blood Count (CBC) with Platelets",
      frequency: "Baseline and weekly (critical at >= 14 days)",
      rationale:
        "Mitochondrial ribosomal protein synthesis inhibition suppresses bone marrow hematopoietic lineages after >= 14 days of therapy.",
      thresholds: "Platelets < 100,000/mcL or acute drop in hemoglobin warrants evaluation for drug cessation.",
    });
    items.push({
      parameter: "Visual Acuity, Color Vision & Peripheral Neuropathy Exam",
      frequency: "Baseline and periodic if therapy exceeds 28 days",
      rationale:
        "Prolonged oxazolidinone courses cause mitochondrial optic neuropathy (risk of permanent blindness) and sensory peripheral neuropathy.",
      thresholds: "Any reduction in visual acuity, central scotoma, or loss of red-green discrimination mandates urgent ophthalmologic consult.",
    });
  }

  if (onDesk.hasPolymyxin) {
    items.push({
      parameter: "Daily Serum Creatinine, BUN & Urine Output",
      frequency: "Daily",
      rationale:
        "Polymyxins cause direct tubular membrane permeabilization with a 30-50% incidence of acute tubular necrosis (ATN).",
      thresholds: "Doubling of baseline SCr or oliguria (<0.5 mL/kg/h) requires immediate regimen re-evaluation.",
    });
    items.push({
      parameter: "Neuromuscular & Respiratory Monitoring",
      frequency: "Continuous in ICU / perioperative settings",
      rationale:
        "Polymyxins inhibit presynaptic acetylcholine release. Prolonged apnea occurs with NMBAs or aminoglycosides.",
      thresholds: "Ptosis, diplopia, dyspnea; have IV Calcium Gluconate (1-2 g) available for rescue.",
    });
  }

  if (onDesk.hasFluoroquinolone) {
    items.push({
      parameter: "Musculoskeletal & Achilles Tendon Assessment",
      frequency: "Daily clinical check",
      rationale:
        "Upregulation of matrix metalloproteinases predisposes to rapid Achilles tendon rupture (compounded by corticosteroids).",
      thresholds: "Any localized tendon pain or edema requires immediate drug discontinuation and avoidance of weight bearing.",
    });
    items.push({
      parameter: "Electrocardiogram (EKG) QTc Interval",
      frequency: "Baseline and 48h post-initiation (especially with moxifloxacin or QT-stacking agents)",
      rationale: "IKr potassium channel blockade prolongs cardiac repolarization, predisposing to Torsades de Pointes.",
      thresholds: "QTc > 500 ms or delta-QTc > 60 ms warrants consideration of discontinuation.",
    });
  }

  return items;
}

export function generateStewardshipPearls(
  drugIds: string[],
  host: HostContext
): string[] {
  const onDesk = antimicrobialOnDesk(drugIds);
  const pearls: string[] = [];

  if (onDesk.hasCefepime) {
    pearls.push(
      "Cefepime Hemodialysis Timing: Cefepime is ~68-70% cleared in a single 3-hour hemodialysis run. Always administer the daily maintenance dose IMMEDIATELY AFTER hemodialysis to maintain pharmacodynamic %T > MIC while avoiding interdialytic neurotoxic accumulation."
    );
    pearls.push(
      "Cefepime Neurotoxicity Triad: Suspect cefepime neurotoxicity in any patient with renal dysfunction developing myoclonus, altered mental status, and GPDs on EEG. Clinical resolution occurs within 48-72 hours of stopping the drug."
    );
  }

  if (onDesk.hasDaptomycin) {
    pearls.push(
      "Daptomycin Statin Hold Standard: Always write an explicit order to hold statin therapy when starting daptomycin. Never co-prescribe without mandatory twice-weekly CPK monitoring and clinical justification."
    );
    pearls.push(
      "Daptomycin Pulmonary Trap: Daptomycin is irreversibly bound and inactivated by pulmonary surfactant. It must NEVER be used for pneumonia, even for bacteremic MRSA pulmonary infections."
    );
  }

  if (onDesk.hasOxazolidinone) {
    pearls.push(
      "Linezolid MAO Inhibition Rule: Linezolid is a potent, reversible, non-selective MAOI. Combining it with SSRIs, SNRIs, or tramadol without a 2-week washout risks fatal Serotonin Syndrome. Tedizolid has lower MAO inhibition potency but shares class precautions."
    );
    pearls.push(
      "Oxazolidinone Chronotoxicity: 14 days marks the threshold for mitochondrial myelosuppression (thrombocytopenia); 28 days marks the threshold for potentially permanent optic and peripheral neuropathy."
    );
  }

  if (onDesk.hasPolymyxin) {
    pearls.push(
      "Polymyxin Antidote Pearl: Polymyxin-induced respiratory paralysis cannot be reliably reversed by neostigmine because the block is primarily presynaptic (calcium influx failure). Intravenous Calcium Gluconate (1-2 g) can restore presynaptic calcium influx and reverse paralysis."
    );
  }

  if (onDesk.hasFluoroquinolone) {
    pearls.push(
      "Fluoroquinolone Chelation Rule of Thumb: Take oral fluoroquinolones 2 hours BEFORE or 4 to 6 hours AFTER any calcium, magnesium, aluminum, iron, or zinc supplements. Chelation slashes absorption by up to 90%."
    );
    pearls.push(
      "Aortic Wall Vulnerability: Fluoroquinolones accelerate collagen and elastin matrix degradation. The FDA warns against their use in elderly patients, hypertensive individuals, or those with known aneurysms."
    );
  }

  return pearls;
}

// ============================================================================
// MAIN MASTER REPORT GENERATOR
// ============================================================================

/**
 * Generates comprehensive antimicrobial stewardship evaluation and collision analysis.
 */
export function antimicrobialReportOnDesk(
  drugIds: string[],
  host: HostContext = DEFAULT_HOST
): AntimicrobialStewardshipReport {
  const onDesk = antimicrobialOnDesk(drugIds);

  const matchedProfiles: AntimicrobialProfile[] = [];
  for (const id of onDesk.matchedAntimicrobials) {
    if (ANTIMICROBIAL_PROFILES[id]) {
      matchedProfiles.push(ANTIMICROBIAL_PROFILES[id]);
    }
  }

  const cefepimeNeurotoxicity = evaluateCefepimeNeurotoxicity(drugIds, host);
  const daptomycinMyopathy = evaluateDaptomycinMyopathy(drugIds, host);
  const oxazolidinoneSerotoninTyramine = evaluateOxazolidinoneToxicities(drugIds, host);
  const polymyxinToxicities = evaluatePolymyxinToxicities(drugIds, host);
  const fluoroquinoloneCollisions = evaluateFluoroquinoloneCollisions(drugIds, host);

  const collisions = detectAntimicrobialCollisions(drugIds, host);
  const stewardshipPearls = generateStewardshipPearls(drugIds, host);
  const monitoringPlan = generateStewardshipMonitoringPlan(drugIds, host);

  return {
    hasAntimicrobial: onDesk.hasAntimicrobial,
    onDeskIds: drugIds,
    antimicrobialsOnDesk: matchedProfiles,
    cefepimeNeurotoxicity,
    daptomycinMyopathy,
    oxazolidinoneSerotoninTyramine,
    polymyxinToxicities,
    fluoroquinoloneCollisions,
    collisions,
    stewardshipPearls,
    monitoringPlan,
    disclaimer: `${ANTIMICROBIAL_REGULATORY_DISCLAIMER} ${PI_FOOTER} ${NOT_CLEARED}`,
    citations: ANTIMICROBIAL_CITATIONS,
  };
}
