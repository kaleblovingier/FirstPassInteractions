/**
 * Obstetric Teratogenesis, Trimester-Specific Critical Windows,
 * Placental Transporter Barrier Kinetics, and Lactation Safety Reference Engine
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations, developmental timelines,
 * placental transporter vector modeling, and maternal-infant lactation kinetics
 * to enable licensed healthcare professionals (Maternal-Fetal Medicine Specialists,
 * Obstetricians, Perinatal Clinical Pharmacists, and Neonatologists) and supervised
 * health-professions students to independently analyze perinatal drug exposure.
 * It does not provide patient-specific dosing directives, prescribing instructions,
 * diagnostic determinations, or therapeutic mandates.
 *
 * Statutory Non-Device Criteria (FD&C Act § 520(o)(1)(E) / FDA CDS Guidance Jan 2026):
 * 1. Does not acquire, process, or analyze medical images, IVD data, or physiologic signals.
 * 2. Displays medical and pharmacological information, developmental windows, and citations.
 * 3. Formulates educational information to support clinical decision-making by licensed HCPs.
 * 4. Enables independent review of the underlying basis, mechanisms, and literature.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. REGULATORY DISCLAIMERS & CDS POSTURE
// ============================================================================

export const PREGNANCY_LACTATION_REGULATORY_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Clinical Decision Support Reference: This obstetric teratogenesis, " +
  "placental barrier transport, and lactation safety engine compiles published peer-reviewed pharmacology, " +
  "FDA Prescribing Information boxed warnings, CDC/ACOG/AAP clinical guidelines, and LactMed monographs. " +
  "It is designed solely for educational analysis and independent clinical verification by licensed healthcare " +
  "professionals and health-professions students under accredited supervision. It does not provide diagnostic " +
  "determinations, patient-specific dosing directives, treatment protocols, or prescribing mandates. The FDA-approved " +
  "Prescribing Information and clinical evaluation of the attending physician govern all care decisions.";

export const CDS_CRITERIA_COMPLIANCE = [
  {
    criterionNumber: 1,
    title: "No Image or Physiologic Signal Processing",
    explanation:
      "Processes only user-selected pharmacological identifiers, gestational ages, and clinical phenotypes. No ultrasound, fetal heart rate tracings, or medical imaging data are acquired or processed.",
  },
  {
    criterionNumber: 2,
    title: "Displays Pharmacological & Developmental Information",
    explanation:
      "Visualizes embryological critical windows, molecular mechanisms (CRBN, RAR/RXR, DHFR, HDAC, AT1, COX, VKORC1), placental transporter kinetics, and lactation milk-to-plasma / RID metrics.",
  },
  {
    criterionNumber: 3,
    title: "Directed to Licensed Healthcare Professionals",
    explanation:
      "Engineered for Maternal-Fetal Medicine specialists, OB/GYN physicians, Perinatal Clinical Pharmacists, and neonatologists. Not intended for direct consumer or patient self-management.",
  },
  {
    criterionNumber: 4,
    title: "Transparent Rationale Enabling Independent Review",
    explanation:
      "Every collision discloses its molecular pathway, structural phenotype, gestational critical window, citations (FDA SPL, Briggs, Hale, LactMed), and evidence-based alternatives.",
  },
] as const;

// ============================================================================
// 2. EMBRYOGENESIS PHASES & TRIMESTER-SPECIFIC CRITICAL WINDOWS
// ============================================================================

export type EmbryogenesisPhaseId = "pre-implantation" | "major-organogenesis" | "fetogenesis";

export interface EmbryogenesisPhaseInfo {
  id: EmbryogenesisPhaseId;
  name: string;
  gestationalAgeWeeks: { min: number; max: number };
  postConceptionWeeks: { min: number; max: number };
  biologicalHallmark: string;
  toxicologicalVulnerability: string;
  allOrNoneApplies: boolean;
  peakStructuralDefects: boolean;
}

export const EMBRYOGENESIS_PHASES: readonly EmbryogenesisPhaseInfo[] = [
  {
    id: "pre-implantation",
    name: "Pre-Implantation Period (All-or-None Window)",
    gestationalAgeWeeks: { min: 3, max: 4.9 },
    postConceptionWeeks: { min: 1, max: 2.9 },
    biologicalHallmark:
      "Fertilization, blastomere cleavage, morula formation, blastocyst cavitation, and trophoblast implantation into endometrium.",
    toxicologicalVulnerability:
      "All-or-None phenomenon: High-dose cytotoxic exposure either destroys a critical mass of totipotent cells causing blastocyst loss / failure to implant (recognized as delayed menses or spontaneous miscarriage), or surviving totipotent blastomeres fully compensate and regenerate without major structural organ dysmorphology.",
    allOrNoneApplies: true,
    peakStructuralDefects: false,
  },
  {
    id: "major-organogenesis",
    name: "Major Organogenesis (Peak Teratogenic Susceptibility Window)",
    gestationalAgeWeeks: { min: 5, max: 10.9 },
    postConceptionWeeks: { min: 3, max: 8.9 },
    biologicalHallmark:
      "Gastrulation, three germ layer differentiation (ectoderm, mesoderm, endoderm), neural tube formation, cardiac looping and septation, branchial arch patterning, and limb bud morphogenesis.",
    toxicologicalVulnerability:
      "Peak vulnerability to catastrophic, major structural anatomical malformations. Chemical disruptions during cell differentiation, migration, and apoptosis produce fixed physical congenital anomalies (e.g., phocomelia, neural tube defects, conotruncal heart defects, craniofacial clefts).",
    allOrNoneApplies: false,
    peakStructuralDefects: true,
  },
  {
    id: "fetogenesis",
    name: "Fetogenesis & Functional Maturation Window",
    gestationalAgeWeeks: { min: 11, max: 42 },
    postConceptionWeeks: { min: 9, max: 40 },
    biologicalHallmark:
      "Histogenesis, cellular proliferation, organ system functional maturation, synaptogenesis, myelination, fetal renal fluid turnover, and dynamic vascular autoregulation.",
    toxicologicalVulnerability:
      "Disruptions typically produce functional, cognitive, behavioral, or growth deficits rather than gross organ agenesis. Specific late critical hazards include: fetal renal hypoperfusion and anuria (RAAS blockers >= 14-20 wk), oligohydramnios (NSAIDs >= 20 wk), premature ductus arteriosus constriction (NSAIDs >= 28-32 wk), and microvascular hemorrhage (warfarin).",
    allOrNoneApplies: false,
    peakStructuralDefects: false,
  },
];

export interface CriticalWindowDetail {
  id: string;
  name: string;
  organSystem: string;
  postConceptionDays: { min: number; max: number };
  gestationalAgeWeeks: { min: number; max: number };
  developmentalProcess: string;
  vulnerabilityDescription: string;
  primaryCulpritClasses: string[];
  malformationRisks: string[];
}

export const CRITICAL_DEVELOPMENTAL_WINDOWS: readonly CriticalWindowDetail[] = [
  {
    id: "neural-tube-closure",
    name: "Neural Tube Closure",
    organSystem: "Central Nervous System",
    postConceptionDays: { min: 21, max: 28 },
    gestationalAgeWeeks: { min: 5.0, max: 6.0 },
    developmentalProcess:
      "Primary neurulation: Neural folds elevate, meet in the dorsal midline, and fuse bi-directionally. Anterior neuropore closes on Day 25; posterior neuropore closes on Day 28 post-conception.",
    vulnerabilityDescription:
      "Blockade of dihydrofolate reductase or histone deacetylase dysregulation disrupts thymidylate synthesis, neuroepithelial proliferation, and cellular adhesion, preventing neural groove apposition.",
    primaryCulpritClasses: ["Valproate", "Carbamazepine", "Methotrexate", "Folate Antagonists"],
    malformationRisks: [
      "Anencephaly (failure of cranial closure)",
      "Spina bifida / Myelomeningocele (failure of caudal closure, 1-2% risk with valproate)",
      "Encephalocele",
    ],
  },
  {
    id: "cardiac-septation",
    name: "Cardiac Septation & Outflow Tract Morphogenesis",
    organSystem: "Cardiovascular System",
    postConceptionDays: { min: 20, max: 50 },
    gestationalAgeWeeks: { min: 4.9, max: 9.1 },
    developmentalProcess:
      "Primitive cardiac tube looping, endocardial cushion growth, atrial/ventricular septation, and neural crest-derived aorticopulmonary conotruncal spiral septation separating aorta and pulmonary artery.",
    vulnerabilityDescription:
      "Disruption of cardiac neural crest cell migration or secondary heart field signaling impairs outflow tract alignment and valve formation.",
    primaryCulpritClasses: ["Retinoids (Isotretinoin, Acitretin)", "Thalidomide", "Lithium"],
    malformationRisks: [
      "Tetralogy of Fallot",
      "Transposition of the Great Arteries",
      "Persistent Truncus Arteriosus",
      "Interrupted Aortic Arch",
      "Ventricular Septal Defects (VSD)",
      "Ebstein Anomaly",
    ],
  },
  {
    id: "limb-bud-development",
    name: "Limb Bud Morphogenesis & Outgrowth",
    organSystem: "Musculoskeletal System",
    postConceptionDays: { min: 24, max: 36 },
    gestationalAgeWeeks: { min: 5.4, max: 7.1 },
    developmentalProcess:
      "Apical Ectodermal Ridge (AER) induction and Zone of Polarizing Activity (ZPA) sonic hedgehog signaling driving proximo-distal limb outgrowth and digit patterning.",
    vulnerabilityDescription:
      "Recruitment of Cereblon (CRBN) E3 ubiquitin ligase causes rapid proteasomal degradation of SALL4 transcription factor, truncating limb outgrowth signals and triggering extensive mesodermal apoptosis.",
    primaryCulpritClasses: ["Thalidomide", "Lenalidomide", "Pomalidomide"],
    malformationRisks: [
      "Phocomelia ('seal limbs' - severe intercalary long bone reduction)",
      "Amelia (complete absence of one or more limbs)",
      "Radial ray hypoplasia / aplasia",
      "Preaxial polydactyly or syndactyly",
    ],
  },
  {
    id: "craniofacial-fusion",
    name: "Craniofacial Fusion & Branchial Arch Differentiation",
    organSystem: "Craniofacial / Otic / Thymic",
    postConceptionDays: { min: 45, max: 60 },
    gestationalAgeWeeks: { min: 8.4, max: 10.6 },
    developmentalProcess:
      "Fusion of medial nasal processes, lateral nasal processes, and maxillary prominence; branchial arch 1 and 2 patterning of auricle, auditory canal, ossicles, and thymus.",
    vulnerabilityDescription:
      "Retinoid receptor RAR/RXR hyperactivation arrests cranial neural crest cell (CNCC) migration into pharyngeal arches 1-4, producing branchial arch dysmorphology.",
    primaryCulpritClasses: ["Retinoids (Isotretinoin, Acitretin)", "Methotrexate", "Folate Antagonists"],
    malformationRisks: [
      "Microtia / Anotia (underdeveloped or absent external ear)",
      "Stenosis / atresia of external auditory meatus with conductive deafness",
      "Micrognathia (severe mandibular hypoplasia)",
      "Cleft lip with or without cleft palate",
      "Thymic aplasia / hypoplasia (congenital immunodeficiency)",
    ],
  },
  {
    id: "fetal-renal-perfusion",
    name: "Fetal Renal Perfusion & Amniotic Fluid Generation",
    organSystem: "Genitourinary / Amniotic Homeostasis",
    postConceptionDays: { min: 98, max: 280 },
    gestationalAgeWeeks: { min: 16.0, max: 40.0 },
    developmentalProcess:
      "Metanephros nephrogenesis completes around 34-36 weeks. From Week 16 onward, fetal urine output is the primary source (>90%) of amniotic fluid volume, critical for thoracic expansion and lung growth.",
    vulnerabilityDescription:
      "Fetal GFR depends on local angiotensin II (AT1-mediated efferent arteriolar tone) and renal vasodilatory prostaglandins (PGE2/PGI2). Inhibition causes fetal hypotension, anuria, and oligohydramnios.",
    primaryCulpritClasses: ["ACE Inhibitors", "ARBs", "ARNI (Sacubitril/Valsartan)", "NSAIDs (at >= 20 weeks)"],
    malformationRisks: [
      "Fetal anuria / oliguria and profound oligohydramnios / anhydramnios",
      "Potter Sequence: pulmonary hypoplasia (lethal respiratory failure at birth)",
      "Potter facies (compressed nasal bridge, prominent epicanthal folds, low-set ears)",
      "Limb contractures and talipes equinovarus (clubfoot)",
      "Hypocalvaria (defective calvarial ossification due to hypotension)",
      "Neonatal acute renal failure",
    ],
  },
  {
    id: "ductus-arteriosus-closure",
    name: "Ductus Arteriosus Prostaglandin Dependence",
    organSystem: "Fetal Circulation / Pulmonary Vasculature",
    postConceptionDays: { min: 182, max: 280 },
    gestationalAgeWeeks: { min: 28.0, max: 40.0 },
    developmentalProcess:
      "The ductus arteriosus shunts ~90% of right ventricular cardiac output away from high-resistance, unexpanded fetal lungs into the descending aorta. Patency is actively maintained by circulating PGE2 and vascular PGI2.",
    vulnerabilityDescription:
      "COX inhibition depletes PGE2/PGI2. After 28 weeks, ductal sensitivity to prostaglandins escalates dramatically, precipitating in utero premature ductus arteriosus constriction or closure.",
    primaryCulpritClasses: ["NSAIDs (Ibuprofen, Naproxen, Ketorolac, Indomethacin, Celecoxib)"],
    malformationRisks: [
      "Premature in utero constriction / closure of ductus arteriosus",
      "Right ventricular hypertrophy and acute right heart strain",
      "Severe tricuspid regurgitation",
      "Pulmonary vascular medial muscular hypertrophy",
      "Persistent Pulmonary Hypertension of the Newborn (PPHN)",
    ],
  },
];

// ============================================================================
// 3. HIGH-YIELD TERATOGENIC PATHWAYS & MOLECULAR MECHANISMS
// ============================================================================

export type TeratogenMechanismClass =
  | "crbn-sall4-ubiquitination"
  | "rar-rxr-neural-crest-arrest"
  | "dhfr-folate-synthesis-arrest"
  | "hdac-inhibition-folate-blockade"
  | "epoxide-folate-dysregulation"
  | "renal-at1-potter-cascade"
  | "cox-prostaglandin-ductus-renal"
  | "vkorc1-osteocalcin-gla-depletion";

export interface HighYieldTeratogenProfile {
  id: string;
  genericName: string;
  brandNames: string[];
  drugClass: string;
  mechanismClass: TeratogenMechanismClass;
  molecularTarget: string;
  pathophysiologicalCascade: string;
  structuralManifestations: string[];
  gestationalCriticalWindow: string;
  contraindicatedTrimesters: ("first" | "second" | "third" | "all")[];
  remsProgram?: {
    name: string;
    mandatoryRequirements: string;
    pregnancyTestingSchedule: string;
    postTherapyWaitPeriod: string;
  };
  pharmacokineticTraps?: string[];
  preferredSaferAlternatives: string[];
  boxedWarningSummary: string;
  evidenceCitations: string[];
}

export const HIGH_YIELD_TERATOGENS: Record<string, HighYieldTeratogenProfile> = {
  // 1. Thalidomide & Lenalidomide
  thalidomide: {
    id: "thalidomide",
    genericName: "Thalidomide",
    brandNames: ["Thalomid"],
    drugClass: "Immunomodulatory Drug (IMiD)",
    mechanismClass: "crbn-sall4-ubiquitination",
    molecularTarget: "Cereblon (CRBN) substrate receptor of CRL4^CRBN E3 ubiquitin ligase",
    pathophysiologicalCascade:
      "Thalidomide binds Cereblon (CRBN), creating a neo-substrate degron interface that recruits transcription factor SALL4 (Spalt-like transcription factor 4) and p63. This triggers rapid polyubiquitination and 26S proteasomal degradation of SALL4, arresting embryonic limb outgrowth signaling (FGF8/SHH) and causing extensive apoptotic necrosis in the limb mesenchyme and branchial arches.",
    structuralManifestations: [
      "Phocomelia ('seal limbs' with intercalary reduction of humerus, radius, ulna, or femur)",
      "Amelia (complete agenesis of upper or lower extremities)",
      "Microtia / Anotia with absence of external auditory canal",
      "Sensorineural deafness and unilateral/bilateral facial nerve palsy",
      "Congenital heart defects (VSD, ASD, tetralogy of Fallot)",
      "Duodenal atresia and anorectal malformations",
    ],
    gestationalCriticalWindow: "Weeks 5.4 - 7.1 Gestational Age (Days 24-36 post-conception; single dose suffices)",
    contraindicatedTrimesters: ["all"],
    remsProgram: {
      name: "THALIDOMID REMS",
      mandatoryRequirements:
        "Mandatory prescriber, patient, and pharmacy registration; two forms of reliable contraception started 4 weeks prior to therapy and continued 4 weeks post-cessation; abstinence counseling.",
      pregnancyTestingSchedule:
        "Two negative pregnancy tests prior to initiation (one within 10-14 days and second within 24 hours of first prescription), then weekly for the first 4 weeks, then monthly in women of reproductive potential.",
      postTherapyWaitPeriod: "4 weeks after final dose.",
    },
    pharmacokineticTraps: [
      "Extremely narrow teratogenic window: Exposure between post-conception days 24-36 has a malformation attack rate exceeding 50-80% even after a single 100 mg dose.",
    ],
    preferredSaferAlternatives: ["Alternative non-IMiD immunosuppression or chemotherapy under specialist oncology guidance."],
    boxedWarningSummary:
      "CONTRAINDICATED IN PREGNANCY. Severe life-threatening human birth defects or embryo-fetal demise. Even a single dose taken during pregnancy can cause severe limb and organ malformations.",
    evidenceCitations: [
      "Fischer ES, et al. Structure of the DDB1-CRBN E3 ubiquitin ligase in complex with thalidomide. Nature. 2014;512(7512):49-53.",
      "Donovan KA, et al. Thalidomide promotes degradation of SALL4, a transcription factor implicated in Duane radial ray syndrome. eLife. 2018;7:e38430.",
    ],
  },

  lenalidomide: {
    id: "lenalidomide",
    genericName: "Lenalidomide",
    brandNames: ["Revlimid"],
    drugClass: "Immunomodulatory Drug (IMiD)",
    mechanismClass: "crbn-sall4-ubiquitination",
    molecularTarget: "Cereblon (CRBN) substrate receptor of CRL4^CRBN E3 ubiquitin ligase",
    pathophysiologicalCascade:
      "Lenalidomide is a potent structural analogue of thalidomide that binds Cereblon (CRBN), promoting the proteasomal degradation of developmental transcription factor SALL4 as well as Ikaros (IKZF1) and Aiolos (IKZF3). This leads to catastrophic disruption of limb bud mesenchyme and branchial arch development.",
    structuralManifestations: [
      "Phocomelia and amelia (severe upper and lower limb reductions)",
      "Microtia and anotia",
      "Congenital cardiovascular septal and outflow anomalies",
      "Embryonic death / spontaneous abortion",
    ],
    gestationalCriticalWindow: "All trimesters (Peak major organogenesis: Weeks 5-10 Gestational Age)",
    contraindicatedTrimesters: ["all"],
    remsProgram: {
      name: "REVLIMID REMS",
      mandatoryRequirements:
        "Mandatory enrollment in REVLIMID REMS. Dual contraception starting 4 weeks before, during, during interruptions, and for 4 weeks after therapy; male barrier contraception required due to presence in semen.",
      pregnancyTestingSchedule:
        "Dual negative pregnancy tests prior to start (10-14 days and 24 hours prior), then weekly for 4 weeks, then every 2-4 weeks during treatment.",
      postTherapyWaitPeriod: "4 weeks after final dose.",
    },
    preferredSaferAlternatives: ["Non-teratogenic hematologic regimens tailored by specialty hematology."],
    boxedWarningSummary:
      "EMBRYO-FETAL TOXICITY: Contraindicated in pregnancy. Lenalidomide is a thalidomide analogue and causes severe birth defects or death to an unborn baby. Prescribed exclusively under REVLIMID REMS.",
    evidenceCitations: [
      "FDA Prescribing Information: Revlimid (lenalidomide). Celgene Corp/BMS.",
      "Sievers QL, et al. SALL4 is a zinc-finger transcription factor target of thalidomide and lenalidomide. Science. 2018;362(6414):eaat0572.",
    ],
  },

  pomalidomide: {
    id: "pomalidomide",
    genericName: "Pomalidomide",
    brandNames: ["Pomalyst"],
    drugClass: "Immunomodulatory Drug (IMiD)",
    mechanismClass: "crbn-sall4-ubiquitination",
    molecularTarget: "Cereblon (CRBN) E3 ubiquitin ligase",
    pathophysiologicalCascade:
      "Direct CRBN binding inducing SALL4 degradation and developmental limb arrest identical to thalidomide class embryopathy.",
    structuralManifestations: ["Phocomelia", "Congenital heart disease", "Embryo-fetal demise"],
    gestationalCriticalWindow: "All trimesters (Peak Weeks 5-10 GA)",
    contraindicatedTrimesters: ["all"],
    remsProgram: {
      name: "POMALYST REMS",
      mandatoryRequirements: "Strict registration, dual contraception, mandatory pregnancy verification.",
      pregnancyTestingSchedule: "Dual testing pre-initiation, weekly x 4 weeks, then monthly.",
      postTherapyWaitPeriod: "4 weeks after discontinuation.",
    },
    preferredSaferAlternatives: ["Consult hematology/oncology for non-teratogenic alternatives."],
    boxedWarningSummary: "EMBRYO-FETAL TOXICITY. Contraindicated in pregnancy. Severe birth defects or fetal death.",
    evidenceCitations: ["FDA Prescribing Information: Pomalyst (pomalidomide). Bristol Myers Squibb."],
  },

  // 2. Retinoids
  isotretinoin: {
    id: "isotretinoin",
    genericName: "Isotretinoin (13-cis-retinoic acid)",
    brandNames: ["Accutane", "Absorica", "Claravis", "Zenatane", "Amnesteem"],
    drugClass: "Systemic Retinoid",
    mechanismClass: "rar-rxr-neural-crest-arrest",
    molecularTarget: "Nuclear Retinoic Acid Receptors (RAR-alpha/beta/gamma) and RXR",
    pathophysiologicalCascade:
      "Isotretinoin and its active metabolite 4-oxo-isotretinoin dysregulate homeobox (Hox) gene patterning along the anteroposterior embryonic axis. Excessive RAR activation induces massive apoptosis and inhibits the migration of cranial neural crest cells (CNCCs) destined for pharyngeal arches 1-4 and the frontonasal process, arresting branchial arch and outflow tract development.",
    structuralManifestations: [
      "Microtia / Anotia with absent or stenotic external auditory meatus (70% of affected)",
      "Conotruncal cardiovascular defects: Tetralogy of Fallot, interrupted aortic arch, truncus arteriosus, VSD",
      "Central nervous system anomalies: Hydrocephalus, cerebellar hypoplasia, microcephaly",
      "Thymic aplasia / hypoplasia (resembling DiGeorge sequence immunodeficiency)",
      "Micrognathia (severe receding chin) and cleft palate",
      "Neurodevelopmental delay and IQ depression (>50% of exposed infants even without structural defects)",
    ],
    gestationalCriticalWindow: "Weeks 5 - 10 Gestational Age (Organogenesis; critical craniofacial/cardiac windows)",
    contraindicatedTrimesters: ["all"],
    remsProgram: {
      name: "iPLEDGE REMS",
      mandatoryRequirements:
        "Mandatory registration for all prescribers, pharmacies, and patients. Two forms of effective contraception started 1 month prior to therapy and continued 1 month after therapy.",
      pregnancyTestingSchedule:
        "Two negative CLIA-certified urine/serum pregnancy tests separated by 19 days prior to starting, followed by monthly negative tests within a 7-day prescription window.",
      postTherapyWaitPeriod: "1 month after final dose (elimination half-life of parent ~20 hr, 4-oxo metabolite ~25 hr).",
    },
    preferredSaferAlternatives: [
      "Topical therapies (benzoyl peroxide, topical azelaic acid, topical erythromycin)",
      "Oral cephalexin or oral erythromycin for severe inflammatory acne under supervision",
    ],
    boxedWarningSummary:
      "CONTRAINDICATED IN PREGNANCY. Causes severe birth defects in up to 35% of exposed pregnancies and spontaneous abortion in ~40%. Available only under the strict iPLEDGE REMS program.",
    evidenceCitations: [
      "Lammer EJ, et al. Retinoic acid embryopathy. N Engl J Med. 1985;313(14):837-841.",
      "FDA Prescribing Information: Absorica (isotretinoin). Sun Pharmaceutical Industries.",
    ],
  },

  acitretin: {
    id: "acitretin",
    genericName: "Acitretin",
    brandNames: ["Soriatane"],
    drugClass: "Systemic Aromatic Retinoid",
    mechanismClass: "rar-rxr-neural-crest-arrest",
    molecularTarget: "Nuclear Retinoic Acid Receptors (RAR)",
    pathophysiologicalCascade:
      "Activates nuclear RARs, disrupting cranial neural crest migration and Hox gene regulation, producing retinoic acid embryopathy. CRITICAL PHARMACOKINETIC TRAP: In the presence of even minuscule amounts of ethanol (dietary, medicinal, or fermented), acitretin undergoes reverse transesterification into ETRETINATE. Etretinate is 50 times more lipophilic than acitretin, partitions deeply into adipose tissue stores, has an elimination terminal half-life of 120-168 days, and can leach out for years.",
    structuralManifestations: [
      "Craniofacial malformations (microtia, anotia, cleft palate, micrognathia)",
      "Conotruncal cardiac malformations and aortic arch anomalies",
      "Hydrocephalus, meningomyelocele, and skeletal synostosis",
      "Spontaneous abortion and fetal demise",
    ],
    gestationalCriticalWindow: "All trimesters (Pregnancy strictly prohibited during and for 3 YEARS POST-THERAPY)",
    contraindicatedTrimesters: ["all"],
    remsProgram: {
      name: "Do Not Get Pregnant Program (Soriatane)",
      mandatoryRequirements:
        "Dual contraception during therapy and for at least 3 FULL YEARS following discontinuation. Avoid all alcohol during therapy and for 2 months after cessation.",
      pregnancyTestingSchedule: "Monthly during treatment and every 3 months for 3 years after therapy discontinuation.",
      postTherapyWaitPeriod: "3 FULL YEARS (36 months) due to etretinate storage and prolonged adipose release.",
    },
    pharmacokineticTraps: [
      "Alcohol Transesterification Trap: Ethanol intake causes metabolic conversion of acitretin (t1/2 ~49 hr) to etretinate (t1/2 ~120-168 days). Trace alcohol in food, mouthwashes, or medications can trigger this reaction. A 3-year post-treatment pregnancy prohibition is mandatory.",
    ],
    preferredSaferAlternatives: ["Phototherapy (NB-UVB)", "Topical corticosteroids", "Topical calcipotriene (limited)"],
    boxedWarningSummary:
      "MAJOR HUMAN TERATOGEN. CONTRAINDICATED IN WOMEN WHO ARE PREGNANT OR INTEND TO BECOME PREGNANT WITHIN 3 YEARS OF DISCONTINUATION. Etretinate formation extends teratogenic risk for years.",
    evidenceCitations: [
      "Geiger JM, et al. Teratogenic risk of acitretin. Dermatology. 1994;189(2):109-116.",
      "FDA Prescribing Information: Soriatane (acitretin). Stiefel Laboratories.",
    ],
  },

  // 3. Folate Antagonists & Antiepileptics
  methotrexate: {
    id: "methotrexate",
    genericName: "Methotrexate",
    brandNames: ["Trexall", "Rasuvo", "Otrexup", "Rheumatrex"],
    drugClass: "Antimetabolite / Folate Antagonist",
    mechanismClass: "dhfr-folate-synthesis-arrest",
    molecularTarget: "Dihydrofolate Reductase (DHFR)",
    pathophysiologicalCascade:
      "Methotrexate acts as a stoichiometric, tight-binding competitive inhibitor of DHFR, depleting tetrahydrofolate (THF) pools. This arrests thymidylate (dTMP) and de novo purine synthesis, causing DNA replication fork collapse, cell cycle arrest, and extensive apoptotic death during rapid blastogenesis and organogenesis.",
    structuralManifestations: [
      "Aminopterin / Methotrexate Syndrome (Cranial dysostosis, cloverleaf skull / kleeblattschädel)",
      "Severe craniosynostosis with wide fontanelles and delayed calvarial ossification",
      "Micrognathia, low-set ears, hypertelorism, and cleft palate",
      "Limb anomalies (hypoplastic digits, syndactyly, absent thumbs, talipes)",
      "Severe intrauterine growth restriction (IUGR) and early embryolethality",
    ],
    gestationalCriticalWindow: "Weeks 5 - 10 Gestational Age (Days 21-60 post-conception; Weeks 6-8 peak sensitivity)",
    contraindicatedTrimesters: ["all"],
    pharmacokineticTraps: [
      "Pre-conception washout: Methotrexate polyglutamates persist inside hepatic, bone marrow, and tissue cells. Females must discontinue at least 1 ovulatory cycle (or 3-6 months) before conception; males must discontinue at least 3 months before conception due to impaired spermatogenesis.",
    ],
    preferredSaferAlternatives: [
      "Sulfasalazine (with high-dose folic acid 4-5 mg/day)",
      "Hydroxychloroquine (safe in pregnancy and lactation for lupus/RA)",
      "Azathioprine (acceptable alternative under rheumatology guidance)",
    ],
    boxedWarningSummary:
      "EMBRYO-FETAL TOXICITY & FETAL DEATH: Contraindicated in pregnant patients with non-malignant diseases. Causes fetal death, embryolethality, and severe congenital malformations (Aminopterin syndrome).",
    evidenceCitations: [
      "Feldkamp ML, Carey JC. Clinical teratology: methotrexate and aminopterin embryopathy. Teratology. 1993;47(5):341-344.",
      "Hyoun SC, et al. Pregnancy outcome after first trimester exposure to methotrexate. Teratology. 2003;67(1):10-20.",
    ],
  },

  valproate: {
    id: "valproate",
    genericName: "Valproate (Valproic acid / Divalproex sodium)",
    brandNames: ["Depakote", "Depakene", "Depacon"],
    drugClass: "Anticonvulsant / Histone Deacetylase Inhibitor",
    mechanismClass: "hdac-inhibition-folate-blockade",
    molecularTarget: "Class I Histone Deacetylases (HDAC1/HDAC2) and Folate Transporters",
    pathophysiologicalCascade:
      "Valproate directly inhibits HDAC1/2, inducing global histone hyperacetylation and aberrant expression/silencing of Hox and developmental homeobox genes. Concurrently, it blocks cellular folate uptake via the reduced folate carrier (RFC) and increases oxidative stress, impairing neuroepithelial folding during neural tube closure.",
    structuralManifestations: [
      "Neural tube defects: Spina bifida / myelomeningocele (1-2% risk, ~10-fold baseline excess)",
      "Characteristic Valproate Embryopathy facies: Broad nasal bridge, shallow philtrum, thin upper lip, epicanthal folds, micrognathia",
      "Congenital heart defects: Ventricular septal defects, aortic coarctation",
      "Limb defects: Preaxial ray defects, arachnodactyly",
      "Neurodevelopmental disorders: Dose-dependent 8-11 point verbal IQ deficit, 3- to 5-fold surge in Autism Spectrum Disorder (ASD)",
    ],
    gestationalCriticalWindow: "Neural tube: Days 21-28 post-conception (GA 5.0-6.0 wk); Functional CNS: throughout pregnancy",
    contraindicatedTrimesters: ["first", "second", "third"],
    preferredSaferAlternatives: [
      "Lamotrigine (low malformation baseline ~2-3%, monitor clearance in pregnancy)",
      "Levetiracetam (favorable teratogenicity registry profile ~2-3%)",
    ],
    boxedWarningSummary:
      "BLACK BOX TERATOGENICITY: Contraindicated for migraine prophylaxis in pregnancy. Avoid in epilepsy or bipolar disorder unless other medications are ineffective. 10-fold increase in neural tube defects and permanent neurodevelopmental IQ deficits.",
    evidenceCitations: [
      "Meador KJ, et al. Cognitive function at 3 years of age after fetal exposure to antiepileptic drugs (NEAD study). N Engl J Med. 2009;360(16):1597-1605.",
      "Jentink J, et al. Valproic acid monotherapy in pregnancy and major congenital malformations. N Engl J Med. 2010;362(23):2185-2193.",
    ],
  },

  carbamazepine: {
    id: "carbamazepine",
    genericName: "Carbamazepine",
    brandNames: ["Tegretol", "Carbatrol", "Equetro"],
    drugClass: "Anticonvulsant",
    mechanismClass: "epoxide-folate-dysregulation",
    molecularTarget: "Voltage-Gated Sodium Channels & Folate Metabolism",
    pathophysiologicalCascade:
      "Metabolized to carbamazepine-10,11-epoxide; interferes with folate-mediated homocysteine remethylation, neural crest migration, and distal neural tube closure.",
    structuralManifestations: [
      "Neural tube defects: Spina bifida (~0.5 - 1.0% incidence vs 0.1% baseline)",
      "Craniofacial dysmorphism: Upward-slanting palpebral fissures, epicanthal folds, short nose",
      "Distal digital hypoplasia / fingernail hypoplasia",
      "Neonatal coagulopathy / intracranial hemorrhage (depletes vitamin K; maternal prophylaxis recommended)",
    ],
    gestationalCriticalWindow: "Days 21-28 post-conception (GA 5.0-6.0 wk) for neural tube; late term for coagulopathy",
    contraindicatedTrimesters: ["first"],
    preferredSaferAlternatives: ["Lamotrigine", "Levetiracetam"],
    boxedWarningSummary:
      "WARNING: Congenital malformations including neural tube defects (e.g. spina bifida) in exposed infants. High-dose maternal folic acid (4 mg/day) and prenatal alpha-fetoprotein screening recommended.",
    evidenceCitations: [
      "Rosa FW. Spina bifida in infants of women treated with carbamazepine during pregnancy. N Engl J Med. 1991;324(10):674-677.",
    ],
  },

  // 4. Renin-Angiotensin System Blockers
  lisinopril: {
    id: "lisinopril",
    genericName: "Lisinopril (and ACE Inhibitor Class)",
    brandNames: ["Prinivil", "Zestril"],
    drugClass: "Angiotensin-Converting Enzyme (ACE) Inhibitor",
    mechanismClass: "renal-at1-potter-cascade",
    molecularTarget: "Somatic ACE / Angiotensin II Type 1 Receptor (AT1) Axis",
    pathophysiologicalCascade:
      "During the 2nd and 3rd trimesters, fetal systemic blood pressure and renal perfusion depend almost exclusively on angiotensin II maintaining efferent arteriolar tone. ACE inhibition blocks Ang II synthesis, triggering profound fetal systemic hypotension, severe renal hypoperfusion, and renal tubular dysgenesis. The resulting fetal anuria causes anhydramnios/oligohydramnios, triggering POTTER SEQUENCE: pulmonary hypoplasia, severe limb contractures, and compressed Potter facies, compounded by calvarial hypoplasia (hypocalvaria).",
    structuralManifestations: [
      "Potter Sequence: Severe pulmonary hypoplasia (primary cause of neonatal asphyxia and death)",
      "Oligohydramnios / Anhydramnios",
      "Hypocalvaria (deficient calvarial bone ossification / wide cranial sutures)",
      "Limb position deformities: Talipes equinovarus (clubfoot) and flexion contractures",
      "Potter facies: Compressed, flattened nose, receded chin, prominent epicanthal folds",
      "Neonatal acute renal failure, persistent anuria, and cardiovascular collapse",
    ],
    gestationalCriticalWindow: "2nd and 3rd Trimesters (Gestational Age >= 14 weeks; catastrophic >= 20 weeks)",
    contraindicatedTrimesters: ["second", "third"],
    preferredSaferAlternatives: [
      "Labetalol (first-line obstetric antihypertensive; combined alpha/beta blocker)",
      "Nifedipine ER (first-line obstetric calcium channel blocker)",
      "Methyldopa (central alpha-2 agonist with decades of obstetric safety data)",
      "Hydralazine (arteriolar vasodilator)",
    ],
    boxedWarningSummary:
      "BOXED WARNING - FETAL TOXICITY: When pregnancy is detected, discontinue lisinopril as soon as possible. Drugs that act directly on the renin-angiotensin system can cause injury and death to the developing fetus.",
    evidenceCitations: [
      "Cooper WO, et al. Major congenital malformations after first-trimester exposure to ACE inhibitors. N Engl J Med. 2006;354(23):2443-2451.",
      "Barr M Jr. Teratogen update: angiotensin-converting enzyme inhibitors. Teratology. 1994;50(6):399-409.",
    ],
  },

  losartan: {
    id: "losartan",
    genericName: "Losartan (and ARB Class)",
    brandNames: ["Cozaar"],
    drugClass: "Angiotensin II Receptor Blocker (ARB)",
    mechanismClass: "renal-at1-potter-cascade",
    molecularTarget: "Angiotensin II Type 1 (AT1) Receptor",
    pathophysiologicalCascade:
      "Direct competitive blockade of fetal renal vascular AT1 receptors in the 2nd and 3rd trimesters aborts angiotensin II-mediated efferent arteriolar constriction, causing severe fetal renal failure, anuria, oligohydramnios, and Potter sequence identical to ACE inhibitors.",
    structuralManifestations: [
      "Potter Sequence: Lethal pulmonary hypoplasia, compressed facies, clubfoot",
      "Oligohydramnios / Anhydramnios",
      "Fetal renal tubular dysgenesis and neonatal anuria",
      "Hypocalvaria (calvarial skull defect)",
    ],
    gestationalCriticalWindow: "2nd and 3rd Trimesters (Gestational Age >= 14 weeks)",
    contraindicatedTrimesters: ["second", "third"],
    preferredSaferAlternatives: ["Labetalol", "Nifedipine ER", "Methyldopa", "Hydralazine"],
    boxedWarningSummary:
      "BOXED WARNING - FETAL TOXICITY: Discontinue immediately upon pregnancy confirmation. Blocks fetal renin-angiotensin axis causing oligohydramnios, fetal renal failure, and neonatal death.",
    evidenceCitations: [
      "FDA Prescribing Information: Cozaar (losartan potassium). Organon.",
      "Quan A. Fetopathy associated with exposure to angiotensin receptor blockers. Pediatrics. 2006;118(1):e164-e167.",
    ],
  },

  "sacubitril-valsartan": {
    id: "sacubitril-valsartan",
    genericName: "Sacubitril / Valsartan",
    brandNames: ["Entresto"],
    drugClass: "Angiotensin Receptor-Neprilysin Inhibitor (ARNI)",
    mechanismClass: "renal-at1-potter-cascade",
    molecularTarget: "AT1 Receptor Blockade (Valsartan) + Neprilysin Inhibition (Sacubitril)",
    pathophysiologicalCascade:
      "Combines potent AT1 receptor blockade with neprilysin inhibition. Direct fetal renal AT1 blockade destroys fetal glomerular hemodynamics in the 2nd and 3rd trimesters, causing anuria, oligohydramnios, Potter sequence, and neonatal death.",
    structuralManifestations: [
      "Potter Sequence (pulmonary hypoplasia, limb contractures, flattened facies)",
      "Fetal anuria / oligohydramnios",
      "Hypocalvaria and neonatal death",
    ],
    gestationalCriticalWindow: "2nd and 3rd Trimesters (Gestational Age >= 14 weeks)",
    contraindicatedTrimesters: ["second", "third"],
    preferredSaferAlternatives: ["Labetalol", "Nifedipine ER", "Hydralazine", "Obstetric cardiology consult"],
    boxedWarningSummary:
      "BOXED WARNING - FETAL TOXICITY: Discontinue Entresto as soon as pregnancy is detected. Acts directly on RAAS causing fetal harm and death.",
    evidenceCitations: ["FDA Prescribing Information: Entresto (sacubitril/valsartan). Novartis Pharmaceuticals."],
  },

  // 5. NSAIDs
  ibuprofen: {
    id: "ibuprofen",
    genericName: "Ibuprofen (and Nonsteroidal Anti-Inflammatory Class)",
    brandNames: ["Advil", "Motrin"],
    drugClass: "Nonsteroidal Anti-Inflammatory Drug (NSAID)",
    mechanismClass: "cox-prostaglandin-ductus-renal",
    molecularTarget: "Cyclooxygenase-1 (COX-1) and Cyclooxygenase-2 (COX-2)",
    pathophysiologicalCascade:
      "Inhibits COX-mediated synthesis of vasodilatory prostaglandins (PGE2, PGI2). In pregnancy, this triggers two distinct developmental catastrophes: (1) At >= 20 weeks GA: Fetal renal perfusion becomes dependent on renal prostaglandins; COX blockade causes fetal renal hypoperfusion, decreased fetal urine output, and oligohydramnios within 48 hours. (2) At >= 28-32 weeks GA (contraindicated at >= 30 weeks): Patency of the fetal ductus arteriosus is maintained by PGE2. NSAID exposure causes premature in utero constriction/closure of the ductus arteriosus, resulting in right ventricular hypertension, tricuspid regurgitation, pulmonary vascular remodeling, and persistent pulmonary hypertension of the newborn (PPHN).",
    structuralManifestations: [
      "Premature in utero constriction / closure of the ductus arteriosus",
      "Right ventricular strain and functional tricuspid regurgitation",
      "Persistent Pulmonary Hypertension of the Newborn (PPHN)",
      "Oligohydramnios / Anhydramnios secondary to fetal renal impairment (>= 20 weeks GA)",
      "Neonatal necrotizing enterocolitis (NEC) and intracranial hemorrhage",
    ],
    gestationalCriticalWindow:
      "Gestational Age >= 20 weeks (oligohydramnios warning); Gestational Age >= 28-32 weeks (premature ductus closure; CONTRAINDICATED at >= 30 weeks)",
    contraindicatedTrimesters: ["third"],
    preferredSaferAlternatives: [
      "Acetaminophen (first-line analgesic/antipyretic in all trimesters of pregnancy)",
      "Non-pharmacologic therapy (heat, physical therapy)",
      "Short-course opioid analgesia under strict specialist supervision for refractory severe pain",
    ],
    boxedWarningSummary:
      "WARNING: Avoid use of NSAIDs in women at 20 weeks or later in pregnancy due to the risk of fetal renal impairment leading to oligohydramnios. Strictly avoid at 30 weeks or later due to the risk of premature closure of the fetal ductus arteriosus.",
    evidenceCitations: [
      "FDA Drug Safety Communication: FDA warns that using type of pain and fever medication in second half of pregnancy could lead to rare but serious kidney problems in unborn babies (Oct 2020).",
      "Moise KJ Jr. Effect of indomethacin on the fetal ductus arteriosus: a review. Am J Obstet Gynecol. 1993;169(3):714-718.",
    ],
  },

  naproxen: {
    id: "naproxen",
    genericName: "Naproxen",
    brandNames: ["Aleve", "Naprosyn"],
    drugClass: "NSAID",
    mechanismClass: "cox-prostaglandin-ductus-renal",
    molecularTarget: "COX-1 and COX-2",
    pathophysiologicalCascade:
      "Long-acting non-selective COX inhibitor. Depletes fetal PGE2/PGI2, causing oligohydramnios after 20 weeks and premature closure of ductus arteriosus after 28-30 weeks with persistent PPHN.",
    structuralManifestations: [
      "Premature in utero closure of ductus arteriosus",
      "Persistent pulmonary hypertension of the newborn (PPHN)",
      "Fetal renal dysfunction and oligohydramnios",
    ],
    gestationalCriticalWindow: "GA >= 20 weeks (renal/oligohydramnios); GA >= 28-30 weeks (ductus arteriosus; contraindicated >= 30 wk)",
    contraindicatedTrimesters: ["third"],
    preferredSaferAlternatives: ["Acetaminophen"],
    boxedWarningSummary:
      "WARNING: Avoid at >= 20 weeks GA (oligohydramnios); contraindicated at >= 30 weeks GA (premature ductus arteriosus closure).",
    evidenceCitations: ["FDA Drug Safety Communication: NSAID use at 20 weeks or later (Oct 2020)."],
  },

  ketorolac: {
    id: "ketorolac",
    genericName: "Ketorolac",
    brandNames: ["Toradol"],
    drugClass: "NSAID",
    mechanismClass: "cox-prostaglandin-ductus-renal",
    molecularTarget: "COX-1 and COX-2",
    pathophysiologicalCascade:
      "High-potency COX inhibitor with profound anti-prostaglandin activity. In late pregnancy, precipitates rapid in utero closure of the ductus arteriosus and inhibits maternal uterine contractions, prolonging labor.",
    structuralManifestations: [
      "Premature constriction of ductus arteriosus",
      "PPHN",
      "Fetal anuria / oligohydramnios",
      "Uterine atony / inhibition of labor contractions",
    ],
    gestationalCriticalWindow: "Contraindicated in labor and delivery, and in late pregnancy (>= 30 weeks GA)",
    contraindicatedTrimesters: ["third"],
    preferredSaferAlternatives: ["Acetaminophen", "Multimodal non-NSAID analgesia"],
    boxedWarningSummary:
      "CONTRAINDICATED IN PREGNANCY, LABOR, AND DELIVERY: Impairs fetal circulation and inhibits uterine contractions.",
    evidenceCitations: ["FDA Prescribing Information: Toradol (ketorolac tromethamine). Roche."],
  },

  // 6. Warfarin
  warfarin: {
    id: "warfarin",
    genericName: "Warfarin",
    brandNames: ["Coumadin", "Jantoven"],
    drugClass: "Vitamin K Antagonist / Coumarin Anticoagulant",
    mechanismClass: "vkorc1-osteocalcin-gla-depletion",
    molecularTarget: "Vitamin K Epoxide Reductase Complex 1 (VKORC1)",
    pathophysiologicalCascade:
      "Warfarin inhibits VKORC1, depleting reduced vitamin K (hydroquinone). This impairs gamma-glutamyl carboxylase, halting the post-translational formation of gamma-carboxyglutamate (Gla) residues on osteocalcin (bone Gla protein) and matrix Gla protein (MGP). Without Gla residues, these proteins cannot bind calcium or hydroxyapatite crystals, severely halting cartilaginous and bony calcification during epiphyseal growth. In the 2nd and 3rd trimesters, transplacental passage depletes fetal clotting factors, precipitating microvascular cerebral hemorrhages, optic atrophy, and microcephaly.",
    structuralManifestations: [
      "Coumarin / Warfarin Embryopathy (Weeks 6-9 post-conception / GA 8-11 weeks):",
      "- Severe nasal hypoplasia ('saddle nose' deformity with depressed nasal bridge)",
      "- Chondrodysplasia punctata (stippled epiphyses seen as punctate calcifications on radiography)",
      "- Hypoplastic terminal phalanges and brachydactyly",
      "Fetopathy / CNS Bleeding (2nd and 3rd Trimesters):",
      "- Fetal intracranial hemorrhage, schizencephaly, microcephaly, hydrocephalus",
      "- Optic nerve atrophy and blindness",
      "- Severe intrauterine growth restriction (IUGR)",
    ],
    gestationalCriticalWindow:
      "Embryopathy critical window: Weeks 8 - 11 Gestational Age (Days 42-63 post-conception); CNS bleeding risk: throughout 2nd & 3rd trimesters",
    contraindicatedTrimesters: ["first", "second", "third"],
    preferredSaferAlternatives: [
      "Low Molecular Weight Heparin (Enoxaparin, Dalteparin) - Large polysaccharide molecule (~4,500 Da) that DOES NOT cross the placenta; first-line anticoagulant in pregnancy.",
      "Unfractionated Heparin (UFH) - Large macromolecule (~15,000 Da) that DOES NOT cross the placenta; preferred near term / delivery.",
    ],
    boxedWarningSummary:
      "CONTRAINDICATED IN PREGNANCY. Warfarin readily crosses the placental barrier and can cause fatal fetal hemorrhage and severe congenital malformations (warfarin embryopathy with nasal hypoplasia and stippled epiphyses).",
    evidenceCitations: [
      "Hall JG, et al. Maternal and fetal sequelae of anticoagulation during pregnancy. Am J Med. 1980;68(1):122-140.",
      "Bates SM, et al. VTE, thrombophilia, antithrombotic therapy, and pregnancy: Antithrombotic Therapy and Prevention of Thrombosis, 9th ed: ACCP Evidence-Based Clinical Practice Guidelines. Chest. 2012;141(2 Suppl):e691S-e736S.",
    ],
  },
};

// Sets for rapid formulary mapping
export const THALIDOMIDE_IDS = new Set(["thalidomide", "lenalidomide", "pomalidomide"]);
export const RETINOID_IDS = new Set(["isotretinoin", "acitretin", "tretinoin", "bexarotene", "etretinate"]);
export const FOLATE_ANTAGONIST_IDS = new Set([
  "methotrexate",
  "valproate",
  "carbamazepine",
  "topiramate",
  "phenytoin",
  "phenobarbital",
]);
export const RAAS_BLOCKER_IDS = new Set([
  "lisinopril",
  "enalapril",
  "enalaprilat",
  "ramipril",
  "benazepril",
  "captopril",
  "quinapril",
  "fosinopril",
  "perindopril",
  "trandolapril",
  "moexipril",
  "lisinopril-hctz",
  "losartan",
  "valsartan",
  "candesartan",
  "irbesartan",
  "olmesartan",
  "telmisartan",
  "sacubitril-valsartan",
  "aliskiren",
]);
export const NSAID_IDS = new Set([
  "ibuprofen",
  "naproxen",
  "ketorolac",
  "meloxicam",
  "celecoxib",
  "indomethacin",
  "diclofenac",
  "nabumetone",
  "piroxicam",
  "sulindac",
  "etodolac",
]);
export const WARFARIN_IDS = new Set(["warfarin"]);
export const CYP2D6_OPIOID_IDS = new Set(["codeine", "tramadol"]);

// ============================================================================
// 4. PLACENTAL BARRIER TRANSPORTER & PERMEATION KINETICS
// ============================================================================

export interface PlacentalPermeationEvaluation {
  drugId: string;
  drugName: string;
  molecularWeightDa: number;
  logP: number;
  proteinBindingPercent: number;
  fickDiffusionCategory: "unrestricted" | "intermediate" | "negligible";
  effluxTransporters: ("P-gp (ABCB1)" | "BCRP (ABCG2)")[];
  effluxShieldingActive: boolean;
  activeTransportMechanism?: string;
  fetalCordToMaternalRatioEstimate: string;
  placentalCrossingRisk: "high" | "moderate" | "low" | "negligible" | "late-gestation-active";
  pharmacologicalSummary: string;
}

export interface PlacentalDrugSpec {
  id: string;
  name: string;
  mwDa: number;
  logP: number;
  proteinBindingPercent: number;
  apicalEffluxPumps: ("P-gp (ABCB1)" | "BCRP (ABCG2)")[];
  specialTransporterNote?: string;
  clinicalCordMaternalRatio: string;
  crossingCategory: "high" | "moderate" | "low" | "negligible" | "late-gestation-active";
  summary: string;
}

export const PLACENTAL_DRUG_DATABASE: Record<string, PlacentalDrugSpec> = {
  // Macromolecules that DO NOT cross placenta
  heparin: {
    id: "heparin",
    name: "Unfractionated Heparin",
    mwDa: 15000,
    logP: -3.0,
    proteinBindingPercent: 90,
    apicalEffluxPumps: [],
    clinicalCordMaternalRatio: "0.0 (Undetectable)",
    crossingCategory: "negligible",
    summary:
      "High molecular weight (~15,000 Da) and strong negative polysulfated charge prevent passive diffusion across the syncytiotrophoblast. Safe throughout pregnancy.",
  },
  enoxaparin: {
    id: "enoxaparin",
    name: "Enoxaparin (LMWH)",
    mwDa: 4500,
    logP: -2.5,
    proteinBindingPercent: 80,
    apicalEffluxPumps: [],
    clinicalCordMaternalRatio: "0.0 (Undetectable)",
    crossingCategory: "negligible",
    summary:
      "High molecular weight (~4,500 Da) prevents passive diffusion across placenta. First-line obstetric anticoagulant.",
  },
  "insulin-regular": {
    id: "insulin-regular",
    name: "Insulin Regular",
    mwDa: 5808,
    logP: -1.5,
    proteinBindingPercent: 5,
    apicalEffluxPumps: [],
    clinicalCordMaternalRatio: "0.0 (Negligible)",
    crossingCategory: "negligible",
    summary:
      "High molecular weight peptide (5,808 Da) does not cross the placental barrier. Preferred first-line agent for gestational and pregestational diabetes.",
  },
  infliximab: {
    id: "infliximab",
    name: "Infliximab (anti-TNF monoclonal IgG1)",
    mwDa: 149100,
    logP: -1.0,
    proteinBindingPercent: 0,
    apicalEffluxPumps: [],
    specialTransporterNote:
      "Negligible passive diffusion in 1st trimester. From ~18-20 weeks GA onward, undergoes active receptor-mediated transcytosis via placental neonatal Fc receptor (FcRn), resulting in cord levels exceeding maternal levels at term.",
    clinicalCordMaternalRatio: "0.0 in 1st tri; >1.5-2.0 at term (due to active FcRn transport)",
    crossingCategory: "late-gestation-active",
    summary:
      "No passive crossing during organogenesis due to high MW (149 kDa). Actively transcytosed across syncytiotrophoblast in late 2nd and 3rd trimesters via FcRn.",
  },

  // Apical Efflux Shielding: Glyburide vs Metformin
  glyburide: {
    id: "glyburide",
    name: "Glyburide (Glibenclamide)",
    mwDa: 494,
    logP: 3.8,
    proteinBindingPercent: 99.8,
    apicalEffluxPumps: ["P-gp (ABCB1)", "BCRP (ABCG2)"],
    specialTransporterNote:
      "Syncytiotrophoblast apical efflux: Both P-gp (ABCB1) and BCRP (ABCG2) actively extrude glyburide back into maternal circulation, coupled with >99% maternal albumin binding, keeping fetal cord levels lower than metformin.",
    clinicalCordMaternalRatio: "0.3 - 0.7 (Restricted by active efflux pumps)",
    crossingCategory: "moderate",
    summary:
      "Active apical efflux pumps P-gp and BCRP extrude glyburide from syncytiotrophoblast back to mother, reducing fetal exposure compared to metformin.",
  },
  metformin: {
    id: "metformin",
    name: "Metformin",
    mwDa: 129,
    logP: -1.43,
    proteinBindingPercent: 0,
    apicalEffluxPumps: [],
    specialTransporterNote:
      "Metformin is a substrate for placental organic cation transporters (OCT1, OCT2, OCT3) on the basolateral and apical membranes without equivalent syncytiotrophoblast apical efflux extrusion. Crosses freely.",
    clinicalCordMaternalRatio: "1.0 - 1.5 (Equal to or higher than maternal plasma)",
    crossingCategory: "high",
    summary:
      "Crosses placenta freely via organic cation transporters (OCTs) without apical efflux barrier. Fetal cord concentrations equal or exceed maternal levels.",
  },

  // Antiretrovirals with P-gp Efflux Shielding
  ritonavir: {
    id: "ritonavir",
    name: "Ritonavir",
    mwDa: 721,
    logP: 3.9,
    proteinBindingPercent: 98,
    apicalEffluxPumps: ["P-gp (ABCB1)"],
    specialTransporterNote:
      "High affinity substrate for P-gp on maternal-facing syncytiotrophoblast apical membrane, actively extruding drug back into maternal blood.",
    clinicalCordMaternalRatio: "0.2 - 0.4 (Restricted by P-gp efflux)",
    crossingCategory: "low",
    summary:
      "P-gp actively extrudes ritonavir from placenta back to maternal blood, shielding the fetal compartment.",
  },

  // Small Lipophiles Crossing Unrestricted
  caffeine: {
    id: "caffeine",
    name: "Caffeine",
    mwDa: 194,
    logP: -0.07,
    proteinBindingPercent: 36,
    apicalEffluxPumps: [],
    clinicalCordMaternalRatio: "1.0 (Rapid, complete passive equilibrium)",
    crossingCategory: "high",
    summary: "Low MW and low protein binding allow unrestricted passive Fickian diffusion into fetal circulation.",
  },
  acetaminophen: {
    id: "acetaminophen",
    name: "Acetaminophen (Paracetamol)",
    mwDa: 151,
    logP: 0.46,
    proteinBindingPercent: 20,
    apicalEffluxPumps: [],
    clinicalCordMaternalRatio: "1.0 (Rapid passive equilibrium)",
    crossingCategory: "high",
    summary: "Rapid passive diffusion across placental barrier. Well-established obstetric safety record at therapeutic doses.",
  },
};

/**
 * Evaluates placental barrier permeation based on Fick's law of diffusion,
 * molecular weight (<500 Da vs 500-1000 Da vs >1000 Da), lipophilicity,
 * protein binding, and apical syncytiotrophoblast efflux pumps (P-gp, BCRP).
 */
export function evaluatePlacentalPermeation(drug: {
  id: string;
  name?: string;
  mwDa?: number;
  logP?: number;
  proteinBindingPercent?: number;
}): PlacentalPermeationEvaluation {
  const catalogEntry = PLACENTAL_DRUG_DATABASE[drug.id];
  const name = drug.name ?? catalogEntry?.name ?? drug.id;
  const mwDa = drug.mwDa ?? catalogEntry?.mwDa ?? 300;
  const logP = drug.logP ?? catalogEntry?.logP ?? 1.5;
  const pbPercent = drug.proteinBindingPercent ?? catalogEntry?.proteinBindingPercent ?? 50;
  const efflux = catalogEntry?.apicalEffluxPumps ?? [];
  const effluxShieldingActive = efflux.length > 0;

  // Fick's Law Molecular Weight Assessment:
  // MW < 500 Da: Freely diffuses
  // MW 500 - 1000 Da: Slower, restricted passage
  // MW > 1000 Da: Negligible passive crossing (e.g. heparin, insulin, biologics)
  let fickCategory: "unrestricted" | "intermediate" | "negligible";
  let crossingRisk: "high" | "moderate" | "low" | "negligible" | "late-gestation-active";
  let cordMaternalEstimate: string;

  if (catalogEntry?.crossingCategory) {
    crossingRisk = catalogEntry.crossingCategory;
    fickCategory = mwDa > 1000 ? "negligible" : mwDa >= 500 ? "intermediate" : "unrestricted";
    cordMaternalEstimate = catalogEntry.clinicalCordMaternalRatio;
  } else if (mwDa > 1000) {
    fickCategory = "negligible";
    crossingRisk = "negligible";
    cordMaternalEstimate = "< 0.05 (Negligible passive diffusion)";
  } else if (mwDa >= 500 || pbPercent > 95 || effluxShieldingActive) {
    fickCategory = "intermediate";
    crossingRisk = effluxShieldingActive ? "low" : "moderate";
    cordMaternalEstimate = effluxShieldingActive ? "0.2 - 0.5 (Restricted by efflux)" : "0.5 - 0.8";
  } else {
    fickCategory = "unrestricted";
    crossingRisk = "high";
    cordMaternalEstimate = "0.8 - 1.2 (Rapid passive equilibrium)";
  }

  let summary =
    `MW ${mwDa} Da, logP ${logP}, Protein Binding ${pbPercent}%. ` +
    `Fick's law prediction: ${fickCategory} passive diffusion across syncytiotrophoblast. `;

  if (effluxShieldingActive) {
    summary += `Active apical efflux pumps (${efflux.join(", ")}) extrude drug back into maternal blood, shielding fetus. `;
  }

  if (catalogEntry?.specialTransporterNote) {
    summary += catalogEntry.specialTransporterNote;
  }

  return {
    drugId: drug.id,
    drugName: name,
    molecularWeightDa: mwDa,
    logP,
    proteinBindingPercent: pbPercent,
    fickDiffusionCategory: fickCategory,
    effluxTransporters: efflux,
    effluxShieldingActive,
    activeTransportMechanism: catalogEntry?.specialTransporterNote,
    fetalCordToMaternalRatioEstimate: cordMaternalEstimate,
    placentalCrossingRisk: crossingRisk,
    pharmacologicalSummary: summary,
  };
}

// ============================================================================
// 5. LACTATION & INFANT RISK MODELING (M/P, RID, BIOAVAILABILITY, CYP2D6 UM)
// ============================================================================

export type LactationSafetyBenchmark = "compatible-low-risk" | "moderate-monitor" | "avoid-high-risk" | "contraindicated";

export interface RelativeInfantDoseCalculation {
  infantDoseMgKgDay: number;
  maternalDoseMgKgDay: number;
  relativeInfantDosePercent: number;
  benchmarkTier: LactationSafetyBenchmark;
  clinicalInterpretation: string;
  calculationSteps: string[];
}

export interface LactationProfile {
  drugId: string;
  drugName: string;
  milkToPlasmaRatio: number;
  relativeInfantDosePercent: number;
  infantBioavailabilityPercent: number;
  safetyRating: LactationSafetyBenchmark;
  cyp2d6Vulnerability: boolean;
  cyp2d6UmWarning?: string;
  infantMonitoringParameters: string[];
  preferredLactationAlternatives: string[];
  clinicalExplanation: string;
  lactMedSummary: string;
}

export const LACTATION_DATABASE: Record<string, LactationProfile> = {
  ibuprofen: {
    drugId: "ibuprofen",
    drugName: "Ibuprofen",
    milkToPlasmaRatio: 0.05,
    relativeInfantDosePercent: 0.38,
    infantBioavailabilityPercent: 80,
    safetyRating: "compatible-low-risk",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: ["None expected at usual therapeutic maternal dosing"],
    preferredLactationAlternatives: ["Acetaminophen", "Ibuprofen"],
    clinicalExplanation:
      "Ibuprofen is excreted in breast milk in negligible amounts (M/P ratio ~0.05, RID < 0.5%). An exclusively breastfed infant receives less than 0.2-0.5% of the maternal weight-adjusted dose. First-line preferred NSAID for postpartum analgesia and lactation.",
    lactMedSummary:
      "LactMed: Compatible with breastfeeding. Milk levels are extremely low and undetected in infant serum.",
  },

  acetaminophen: {
    drugId: "acetaminophen",
    drugName: "Acetaminophen",
    milkToPlasmaRatio: 0.9,
    relativeInfantDosePercent: 2.0,
    infantBioavailabilityPercent: 88,
    safetyRating: "compatible-low-risk",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: ["Rare rash or gastrointestinal upset"],
    preferredLactationAlternatives: ["Acetaminophen"],
    clinicalExplanation:
      "Excreted into milk with M/P ~0.9, resulting in an RID of ~2% (well below the 10% safety threshold). First-line analgesic/antipyretic in lactation.",
    lactMedSummary: "LactMed: Compatible. Infant exposure is well below pediatric therapeutic doses.",
  },

  codeine: {
    drugId: "codeine",
    drugName: "Codeine",
    milkToPlasmaRatio: 2.1,
    relativeInfantDosePercent: 8.5,
    infantBioavailabilityPercent: 53,
    safetyRating: "contraindicated",
    cyp2d6Vulnerability: true,
    cyp2d6UmWarning:
      "BLACK BOX WARNING / FATAL NEONATAL RESPIRATORY DEPRESSION: Codeine is a prodrug requiring hepatic CYP2D6 bioactivation to active morphine. In maternal CYP2D6 Ultra-Rapid Metabolizers (UM, harboring gene duplications *1xN, *2xN), codeine is converted rapidly and extensively into high concentrations of morphine in breast milk. Neonates have immature renal clearance and deficient hepatic UGT2B7 glucuronidation, leading to massive morphine accumulation, severe somnolence, CNS depression, apnea, and fatal infant opioid overdose. Contraindicated during breastfeeding.",
    infantMonitoringParameters: [
      "CRITICAL: Extreme somnolence, difficulty waking to feed, limpness, slow shallow breathing (<20/min), cyanosis",
    ],
    preferredLactationAlternatives: ["Ibuprofen", "Acetaminophen", "Non-opioid multimodal analgesia"],
    clinicalExplanation:
      "FDA Boxed Warning against use during breastfeeding. Maternal CYP2D6 ultra-rapid metabolism produces lethal morphine surges in breast milk causing neonatal respiratory arrest and death.",
    lactMedSummary:
      "LactMed: Avoid codeine during breastfeeding. Fatal infant morphine toxicity reported in nursing mothers who are CYP2D6 ultra-rapid metabolizers.",
  },

  tramadol: {
    drugId: "tramadol",
    drugName: "Tramadol",
    milkToPlasmaRatio: 2.2,
    relativeInfantDosePercent: 2.8,
    infantBioavailabilityPercent: 75,
    safetyRating: "contraindicated",
    cyp2d6Vulnerability: true,
    cyp2d6UmWarning:
      "BLACK BOX WARNING: Tramadol relies on CYP2D6 bioactivation to its active mu-opioid metabolite O-desmethyltramadol (M1). Maternal CYP2D6 ultra-rapid metabolism causes high M1 levels in breast milk, causing life-threatening respiratory depression and death in nursing infants.",
    infantMonitoringParameters: ["Excessive sedation, difficulty breastfeeding, respiratory pause, hypothermia"],
    preferredLactationAlternatives: ["Ibuprofen", "Acetaminophen"],
    clinicalExplanation:
      "FDA Boxed Warning contraindicates tramadol in breastfeeding mothers due to unpredictable CYP2D6-mediated conversion to potent opioid metabolite M1 and neonatal respiratory depression.",
    lactMedSummary: "LactMed: Contraindicated during breastfeeding by FDA.",
  },

  gentamicin: {
    drugId: "gentamicin",
    drugName: "Gentamicin",
    milkToPlasmaRatio: 0.15,
    relativeInfantDosePercent: 2.1,
    infantBioavailabilityPercent: 0.5,
    safetyRating: "compatible-low-risk",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: ["Loose stools, thrush / candidiasis"],
    preferredLactationAlternatives: ["Gentamicin is compatible due to poor oral bioavailability"],
    clinicalExplanation:
      "INFANT ORAL BIOAVAILABILITY BARRIER: Although present in breast milk at low levels (RID ~2%), gentamicin is highly polar and has negligible oral bioavailability in infants (<1%). It is not absorbed systemically from the infant gastrointestinal tract, precluding systemic nephrotoxicity or ototoxicity. Clinically compatible with breastfeeding.",
    lactMedSummary:
      "LactMed: Compatible. Systemic absorption by the infant is negligible due to poor oral bioavailability.",
  },

  vancomycin: {
    drugId: "vancomycin",
    drugName: "Vancomycin",
    milkToPlasmaRatio: 0.5,
    relativeInfantDosePercent: 6.7,
    infantBioavailabilityPercent: 3.0,
    safetyRating: "compatible-low-risk",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: ["Alteration of infant GI microflora, loose stools"],
    preferredLactationAlternatives: ["Vancomycin is compatible due to minimal oral bioavailability"],
    clinicalExplanation:
      "INFANT ORAL BIOAVAILABILITY BARRIER: Vancomycin is a large glycopeptide (1,449 Da) with virtually negligible oral bioavailability (<5%) in infants without inflamed bowel. Systemic infant absorption is minimal; does not cause systemic toxicity.",
    lactMedSummary: "LactMed: Compatible. Minimal oral absorption by the breastfed infant.",
  },

  valproate: {
    drugId: "valproate",
    drugName: "Valproate",
    milkToPlasmaRatio: 0.1,
    relativeInfantDosePercent: 1.5,
    infantBioavailabilityPercent: 100,
    safetyRating: "moderate-monitor",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: [
      "Infant liver function tests, jaundice, lethargy, bruising / thrombocytopenia",
    ],
    preferredLactationAlternatives: ["Lamotrigine", "Levetiracetam"],
    clinicalExplanation:
      "RID is low (~1.5%), but infant hepatotoxicity and platelet dysfunction have been reported rarely. Use with caution; monitor infant liver enzymes and platelet counts.",
    lactMedSummary: "LactMed: Compatible with close monitoring of infant liver function and platelets.",
  },

  methotrexate: {
    drugId: "methotrexate",
    drugName: "Methotrexate",
    milkToPlasmaRatio: 0.08,
    relativeInfantDosePercent: 0.13,
    infantBioavailabilityPercent: 70,
    safetyRating: "contraindicated",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: ["Bone marrow suppression, neutropenia, growth impairment"],
    preferredLactationAlternatives: ["Sulfasalazine", "Hydroxychloroquine"],
    clinicalExplanation:
      "Cytotoxic antimetabolite that accumulates in neonatal tissues and causes prolonged cellular toxicity and immunosuppression. Strictly contraindicated during breastfeeding.",
    lactMedSummary: "LactMed: Contraindicated during breastfeeding due to potential cytotoxicity.",
  },

  warfarin: {
    drugId: "warfarin",
    drugName: "Warfarin",
    milkToPlasmaRatio: 0.05,
    relativeInfantDosePercent: 0.3,
    infantBioavailabilityPercent: 100,
    safetyRating: "compatible-low-risk",
    cyp2d6Vulnerability: false,
    infantMonitoringParameters: ["None expected; PT/INR monitoring generally not required for full-term healthy infants"],
    preferredLactationAlternatives: ["Warfarin", "Enoxaparin", "Heparin"],
    clinicalExplanation:
      "Warfarin is 99% bound to maternal albumin and does not pass into breast milk in significant amounts. RID < 1%. Fully compatible with breastfeeding, in stark contrast to its severe in utero teratogenicity.",
    lactMedSummary: "LactMed: Compatible. Warfarin is not detected in breast milk or infant plasma.",
  },
};

/**
 * Calculates Relative Infant Dose (RID) and classifies safety against international
 * clinical benchmarks (Hale, WHO, AAP):
 *   RID = [Infant Dose (mg/kg/day) / Maternal Dose (mg/kg/day)] * 100%
 *
 * Clinical Benchmark:
 *   RID < 10%: Generally compatible with breastfeeding.
 *   RID 10 - 25%: Moderate exposure; monitor infant closely or select alternative.
 *   RID >= 25%: Elevated exposure; seek lower-RID alternative or suspend nursing.
 */
export function calculateRelativeInfantDose(params: {
  infantDoseMgKgDay?: number;
  maternalDoseMgKgDay?: number;
  milkConcentrationMgL?: number;
  dailyMilkVolumeMlKgDay?: number;
  totalDailyMaternalDoseMg?: number;
  maternalWeightKg?: number;
  maternalAvgPlasmaConcMgL?: number;
  milkToPlasmaRatio?: number;
}): RelativeInfantDoseCalculation {
  const steps: string[] = [];
  const dailyMilkLKgDay = (params.dailyMilkVolumeMlKgDay ?? 150) / 1000; // Standard 150 mL/kg/day = 0.15 L/kg/day
  const maternalWeight = params.maternalWeightKg ?? 70;

  // 1. Resolve maternal daily dose (mg/kg/day)
  let maternalDoseMgKgDay = params.maternalDoseMgKgDay;
  if (maternalDoseMgKgDay === undefined) {
    if (params.totalDailyMaternalDoseMg !== undefined) {
      maternalDoseMgKgDay = params.totalDailyMaternalDoseMg / maternalWeight;
      steps.push(
        `Maternal weight-adjusted dose: ${params.totalDailyMaternalDoseMg} mg / ${maternalWeight} kg = ${maternalDoseMgKgDay.toFixed(3)} mg/kg/day`,
      );
    } else {
      maternalDoseMgKgDay = 10; // Default placeholder
      steps.push(`Maternal dose assumed at standard reference value: ${maternalDoseMgKgDay} mg/kg/day`);
    }
  } else {
    steps.push(`Maternal dose provided: ${maternalDoseMgKgDay.toFixed(3)} mg/kg/day`);
  }

  // 2. Resolve milk concentration (mg/L)
  let milkConcMgL = params.milkConcentrationMgL;
  if (milkConcMgL === undefined && params.maternalAvgPlasmaConcMgL !== undefined && params.milkToPlasmaRatio !== undefined) {
    milkConcMgL = params.maternalAvgPlasmaConcMgL * params.milkToPlasmaRatio;
    steps.push(
      `Estimated milk concentration: Maternal plasma ${params.maternalAvgPlasmaConcMgL} mg/L * M/P ${params.milkToPlasmaRatio} = ${milkConcMgL.toFixed(3)} mg/L`,
    );
  }

  // 3. Resolve infant daily dose (mg/kg/day)
  let infantDoseMgKgDay = params.infantDoseMgKgDay;
  if (infantDoseMgKgDay === undefined) {
    if (milkConcMgL !== undefined) {
      infantDoseMgKgDay = milkConcMgL * dailyMilkLKgDay;
      steps.push(
        `Estimated infant daily dose: Milk conc ${milkConcMgL.toFixed(3)} mg/L * ${dailyMilkLKgDay} L/kg/day intake = ${infantDoseMgKgDay.toFixed(4)} mg/kg/day`,
      );
    } else {
      infantDoseMgKgDay = 0.05; // Fallback
      steps.push(`Infant dose estimated via default reference index: ${infantDoseMgKgDay} mg/kg/day`);
    }
  } else {
    steps.push(`Infant daily dose provided: ${infantDoseMgKgDay.toFixed(4)} mg/kg/day`);
  }

  // 4. Calculate RID (%)
  const ridPercent = maternalDoseMgKgDay > 0 ? (infantDoseMgKgDay / maternalDoseMgKgDay) * 100 : 0;
  steps.push(
    `Relative Infant Dose (RID): [${infantDoseMgKgDay.toFixed(4)} mg/kg/day / ${maternalDoseMgKgDay.toFixed(3)} mg/kg/day] * 100% = ${ridPercent.toFixed(2)}%`,
  );

  let benchmarkTier: LactationSafetyBenchmark;
  let clinicalInterpretation: string;

  if (ridPercent < 10) {
    benchmarkTier = "compatible-low-risk";
    clinicalInterpretation = `RID ${ridPercent.toFixed(2)}% is below the 10% clinical benchmark threshold. Generally considered compatible with breastfeeding for healthy full-term infants.`;
  } else if (ridPercent <= 25) {
    benchmarkTier = "moderate-monitor";
    clinicalInterpretation = `RID ${ridPercent.toFixed(2)}% reflects moderate infant exposure (10-25%). Close monitoring of the infant for sedation, feeding intolerance, or adverse effects is indicated.`;
  } else {
    benchmarkTier = "avoid-high-risk";
    clinicalInterpretation = `RID ${ridPercent.toFixed(2)}% exceeds 25%. High infant systemic exposure. Selection of a lower-RID alternative agent is strongly advised.`;
  }

  return {
    infantDoseMgKgDay,
    maternalDoseMgKgDay,
    relativeInfantDosePercent: Math.round(ridPercent * 100) / 100,
    benchmarkTier,
    clinicalInterpretation,
    calculationSteps: steps,
  };
}

// ============================================================================
// 6. DETECTOR & REPORT GENERATION FUNCTIONS
// ============================================================================

export interface PregnancyOnDeskResult {
  hasTeratogen: boolean;
  hasHighYieldTeratogen: boolean;
  hasLactationRisk: boolean;
  hasRemProgram: boolean;
  hasRaasBlocker: boolean;
  hasNsaid: boolean;
  hasWarfarin: boolean;
  hasRetinoid: boolean;
  hasImid: boolean;
  hasFolateAntagonist: boolean;
  hasCyp2d6LactationOpioid: boolean;
  flaggedDrugIds: string[];
  teratogenIds: string[];
  lactationConcernIds: string[];
  identifiedAgents: Array<{
    id: string;
    name: string;
    category: string;
    summary: string;
    teratogenSeverity: "contraindicated-boxed" | "major-hazard" | "moderate-precaution";
    lactationRating: LactationSafetyBenchmark;
  }>;
}

/**
 * Fast detector that scans a list of active desk drug IDs for pregnancy and lactation hazards.
 */
export function pregnancyOnDesk(ids: string[]): PregnancyOnDeskResult {
  const flaggedDrugIds = new Set<string>();
  const teratogenIds = new Set<string>();
  const lactationConcernIds = new Set<string>();
  const identifiedAgents: PregnancyOnDeskResult["identifiedAgents"] = [];

  let hasHighYield = false;
  let hasRem = false;
  let hasRaas = false;
  let hasNsaid = false;
  let hasWarfarin = false;
  let hasRetinoid = false;
  let hasImid = false;
  let hasFolate = false;
  let hasCyp2d6Opioid = false;

  for (const id of ids) {
    const isImid = THALIDOMIDE_IDS.has(id);
    const isRetinoid = RETINOID_IDS.has(id);
    const isFolate = FOLATE_ANTAGONIST_IDS.has(id);
    const isRaas = RAAS_BLOCKER_IDS.has(id);
    const isNsaid = NSAID_IDS.has(id);
    const isWarf = WARFARIN_IDS.has(id);
    const isCyp2d6Op = CYP2D6_OPIOID_IDS.has(id);
    const isHighYield = isImid || isRetinoid || isFolate || isRaas || isNsaid || isWarf;
    const lacInfo = LACTATION_DATABASE[id];
    const isLacConcern = lacInfo ? lacInfo.safetyRating !== "compatible-low-risk" : false;

    if (isHighYield || isCyp2d6Op || isLacConcern) {
      flaggedDrugIds.add(id);

      if (isHighYield) {
        teratogenIds.add(id);
        hasHighYield = true;
      }
      if (isImid) {
        hasImid = true;
        hasRem = true;
      }
      if (isRetinoid) {
        hasRetinoid = true;
        hasRem = true;
      }
      if (isFolate) hasFolate = true;
      if (isRaas) hasRaas = true;
      if (isNsaid) hasNsaid = true;
      if (isWarf) hasWarfarin = true;
      if (isCyp2d6Op) {
        hasCyp2d6Opioid = true;
        lactationConcernIds.add(id);
      }
      if (isLacConcern) {
        lactationConcernIds.add(id);
      }

      const highYieldProfile = HIGH_YIELD_TERATOGENS[id];
      const name = DRUG_BY_ID[id]?.name ?? highYieldProfile?.genericName ?? lacInfo?.drugName ?? id;
      const category = highYieldProfile?.drugClass ?? lacInfo?.drugName ?? "Perinatal Concern";
      const summary = highYieldProfile?.boxedWarningSummary ?? lacInfo?.clinicalExplanation ?? "Monitored perinatal agent";
      const teratogenSeverity =
        isImid || isRetinoid || isWarf || id === "methotrexate" || id === "valproate"
          ? "contraindicated-boxed"
          : isRaas || isNsaid || isFolate
            ? "major-hazard"
            : "moderate-precaution";
      const lacRating = lacInfo?.safetyRating ?? (isCyp2d6Op ? "contraindicated" : "moderate-monitor");

      identifiedAgents.push({
        id,
        name,
        category,
        summary,
        teratogenSeverity,
        lactationRating: lacRating,
      });
    }
  }

  return {
    hasTeratogen: teratogenIds.size > 0,
    hasHighYieldTeratogen: hasHighYield,
    hasLactationRisk: lactationConcernIds.size > 0,
    hasRemProgram: hasRem,
    hasRaasBlocker: hasRaas,
    hasNsaid: hasNsaid,
    hasWarfarin: hasWarfarin,
    hasRetinoid: hasRetinoid,
    hasImid: hasImid,
    hasFolateAntagonist: hasFolate,
    hasCyp2d6LactationOpioid: hasCyp2d6Opioid,
    flaggedDrugIds: Array.from(flaggedDrugIds),
    teratogenIds: Array.from(teratogenIds),
    lactationConcernIds: Array.from(lactationConcernIds),
    identifiedAgents,
  };
}

export interface PregnancyEvaluationOptions {
  gestationalAgeWeeks?: number;
  totalDailyMaternalDoseMg?: number;
  maternalWeightKg?: number;
  infantAgeDays?: number;
}

export interface PregnancyLactationReport {
  summaryStatus: "critical" | "warning" | "advisory" | "compatible" | "unmapped";
  headline: string;
  hostContext: {
    pregState: "off" | "pregnant" | "lactating";
    cyp2d6Phenotype: string;
    gestationalAgeWeeks?: number;
  };
  activeVulnerabilityWindows: CriticalWindowDetail[];
  detectedCollisions: Array<{
    drugId: string;
    drugName: string;
    hazardType:
      | "embryopathy"
      | "fetopathy"
      | "ductus-closure"
      | "potter-sequence"
      | "neonatal-toxicity"
      | "etretinate-persistence"
      | "opioid-cyp2d6-um-apnea";
    severity: "critical" | "high" | "moderate";
    headline: string;
    mechanismExplanation: string;
    criticalTimingWindow: string;
    remsNotice?: string;
    saferAlternatives: string[];
  }>;
  teratogenicProfiles: HighYieldTeratogenProfile[];
  placentalPermeationAnalyses: PlacentalPermeationEvaluation[];
  lactationAnalyses: LactationProfile[];
  cyp2d6LactationAlert?: {
    triggered: boolean;
    phenotype: string;
    culpritDrugs: string[];
    warningText: string;
    pathophysiology: string;
    neonatalRisks: string[];
  };
  clinicalPearls: string[];
  regulatoryPosture: {
    statutoryCitation: string;
    nonDeviceCdsCriteria: typeof CDS_CRITERIA_COMPLIANCE;
    disclaimer: string;
  };
  disclaimer: string;
}

/**
 * Returns developmental critical windows active at a specific gestational age.
 */
export function getTrimesterVulnerability(gaWeeks: number): CriticalWindowDetail[] {
  return CRITICAL_DEVELOPMENTAL_WINDOWS.filter(
    (win) => gaWeeks >= win.gestationalAgeWeeks.min && gaWeeks <= win.gestationalAgeWeeks.max,
  );
}

/**
 * Generates the full Obstetric Teratogenesis, Placental Barrier Kinetics,
 * and Lactation Safety Report under FD&C Act § 520(o)(1)(E).
 */
export function pregnancyReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: PregnancyEvaluationOptions,
): PregnancyLactationReport {
  const onDesk = pregnancyOnDesk(drugIds);
  const gaWeeks = options?.gestationalAgeWeeks;
  const isPregnant = host.preg === "pregnant";
  const isLactating = host.preg === "lactating";
  const cyp2d6Phenotype = host.phenotypes.CYP2D6 ?? "NM";

  const detectedCollisions: PregnancyLactationReport["detectedCollisions"] = [];
  const teratogenicProfiles: HighYieldTeratogenProfile[] = [];
  const placentalPermeationAnalyses: PlacentalPermeationEvaluation[] = [];
  const lactationAnalyses: LactationProfile[] = [];

  // Active developmental windows
  const activeVulnerabilityWindows: CriticalWindowDetail[] =
    gaWeeks !== undefined
      ? getTrimesterVulnerability(gaWeeks)
      : [...CRITICAL_DEVELOPMENTAL_WINDOWS];

  // 1. Evaluate Teratogenic Pathways
  for (const id of drugIds) {
    const profile = HIGH_YIELD_TERATOGENS[id];
    if (profile) {
      teratogenicProfiles.push(profile);

      // Check specific clinical collisions
      if (THALIDOMIDE_IDS.has(id)) {
        detectedCollisions.push({
          drugId: id,
          drugName: profile.genericName,
          hazardType: "embryopathy",
          severity: "critical",
          headline: `CRITICAL TERATOGEN: Cereblon-SALL4 Degradation (${profile.genericName})`,
          mechanismExplanation: profile.pathophysiologicalCascade,
          criticalTimingWindow: profile.gestationalCriticalWindow,
          remsNotice: profile.remsProgram ? `${profile.remsProgram.name}: ${profile.remsProgram.mandatoryRequirements}` : undefined,
          saferAlternatives: profile.preferredSaferAlternatives,
        });
      }

      if (RETINOID_IDS.has(id)) {
        const isAcitretin = id === "acitretin";
        detectedCollisions.push({
          drugId: id,
          drugName: profile.genericName,
          hazardType: isAcitretin ? "etretinate-persistence" : "embryopathy",
          severity: "critical",
          headline: isAcitretin
            ? "CRITICAL RETINOID: Acitretin-Etretinate Transesterification (3-Year Pregnancy Wait)"
            : `CRITICAL RETINOID: Nuclear RAR/RXR Cranial Neural Crest Arrest (${profile.genericName})`,
          mechanismExplanation: profile.pathophysiologicalCascade,
          criticalTimingWindow: profile.gestationalCriticalWindow,
          remsNotice: profile.remsProgram ? `${profile.remsProgram.name}: ${profile.remsProgram.mandatoryRequirements}` : undefined,
          saferAlternatives: profile.preferredSaferAlternatives,
        });
      }

      if (FOLATE_ANTAGONIST_IDS.has(id)) {
        const isValproate = id === "valproate";
        const isMtx = id === "methotrexate";
        detectedCollisions.push({
          drugId: id,
          drugName: profile.genericName,
          hazardType: "embryopathy",
          severity: "critical",
          headline: isValproate
            ? "BLACK BOX TERATOGEN: Valproate HDAC Inhibition & Neural Tube Defects (1-2% Spina Bifida)"
            : isMtx
              ? "BLACK BOX TERATOGEN: Methotrexate DHFR Arrest (Aminopterin/Methotrexate Syndrome)"
              : `Teratogenic Folate Dysregulation (${profile.genericName})`,
          mechanismExplanation: profile.pathophysiologicalCascade,
          criticalTimingWindow: profile.gestationalCriticalWindow,
          saferAlternatives: profile.preferredSaferAlternatives,
        });
      }

      if (RAAS_BLOCKER_IDS.has(id)) {
        const raasTiming =
          gaWeeks !== undefined && gaWeeks < 14
            ? "Early exposure; stop immediately prior to 2nd trimester renal reliance."
            : "2nd and 3rd Trimesters (Catastrophic: Fetal Anuria & Potter Sequence)";
        detectedCollisions.push({
          drugId: id,
          drugName: profile.genericName,
          hazardType: "potter-sequence",
          severity: "critical",
          headline: `BLACK BOX FETAL TOXICITY: RAAS Blockade (${profile.genericName}) -> Fetal Anuria & Potter Sequence`,
          mechanismExplanation: profile.pathophysiologicalCascade,
          criticalTimingWindow: raasTiming,
          saferAlternatives: profile.preferredSaferAlternatives,
        });
      }

      if (NSAID_IDS.has(id)) {
        const isPast20Wk = gaWeeks !== undefined ? gaWeeks >= 20 : true;
        const isPast30Wk = gaWeeks !== undefined ? gaWeeks >= 30 : true;
        const severity = isPast30Wk ? "critical" : isPast20Wk ? "high" : "moderate";
        const timingNote =
          gaWeeks !== undefined
            ? `Current GA ${gaWeeks} wk: ${isPast30Wk ? "CONTRAINDICATED (Ductus Arteriosus Closure)" : isPast20Wk ? "WARNING (Oligohydramnios)" : "1st Trimester (Low structural risk)"}`
            : ">= 20 weeks (fetal renal oligohydramnios); >= 30 weeks (CONTRAINDICATED: premature ductus arteriosus closure)";

        detectedCollisions.push({
          drugId: id,
          drugName: profile.genericName,
          hazardType: isPast30Wk ? "ductus-closure" : "fetopathy",
          severity,
          headline: isPast30Wk
            ? `CONTRAINDICATED AT >= 30 WEEKS: ${profile.genericName} -> Premature Ductus Arteriosus Closure & PPHN`
            : `WARNING AT >= 20 WEEKS: ${profile.genericName} -> Fetal Renal Impairment & Oligohydramnios`,
          mechanismExplanation: profile.pathophysiologicalCascade,
          criticalTimingWindow: timingNote,
          saferAlternatives: profile.preferredSaferAlternatives,
        });
      }

      if (WARFARIN_IDS.has(id)) {
        detectedCollisions.push({
          drugId: id,
          drugName: profile.genericName,
          hazardType: "embryopathy",
          severity: "critical",
          headline: `BLACK BOX CONTRAINDICATION: Warfarin VKORC1 Inhibition -> Coumarin Embryopathy`,
          mechanismExplanation: profile.pathophysiologicalCascade,
          criticalTimingWindow: profile.gestationalCriticalWindow,
          saferAlternatives: profile.preferredSaferAlternatives,
        });
      }
    }

    // Placental barrier evaluation for each drug
    placentalPermeationAnalyses.push(evaluatePlacentalPermeation({ id }));

    // Lactation evaluation
    const lacProfile = LACTATION_DATABASE[id];
    if (lacProfile) {
      lactationAnalyses.push(lacProfile);
    }
  }

  // 2. Check CYP2D6 Ultra-Rapid Metabolizer Lactation Opioid Alert
  let cyp2d6Alert: PregnancyLactationReport["cyp2d6LactationAlert"] = undefined;
  const culpritOpioids = drugIds.filter((id) => CYP2D6_OPIOID_IDS.has(id));
  if (culpritOpioids.length > 0) {
    const isUm = cyp2d6Phenotype === "UM";
    const opioidNames = culpritOpioids.map((id) => DRUG_BY_ID[id]?.name ?? id).join(" and ");

    if (isUm || isLactating) {
      cyp2d6Alert = {
        triggered: true,
        phenotype: cyp2d6Phenotype,
        culpritDrugs: culpritOpioids,
        warningText: isUm
          ? `CRITICAL LETHAL INFANT HAZARD: Maternal CYP2D6 Ultra-Rapid Metabolizer (UM) receiving ${opioidNames}. Rapid, extensive conversion to active morphine surges in breast milk. High risk of fatal neonatal respiratory arrest.`
          : `BOXED WARNING: Codeine/Tramadol during breastfeeding. CYP2D6 metabolizer phenotyping or non-opioid switch required due to risk of fatal neonatal respiratory depression.`,
        pathophysiology:
          "Codeine and tramadol are prodrugs bioactivated by hepatic CYP2D6 into active morphine and O-desmethyltramadol (M1) respectively. Maternal ultra-rapid metabolizers (harboring gene duplications) generate massive morphine spikes in milk. Neonatal renal clearance and UGT2B7 glucuronidation are immature, precipitating lethal morphine accumulation.",
        neonatalRisks: [
          "Severe neonatal somnolence and unresponsiveness",
          "Hypotonia and inability to latch or nurse",
          "Bradypnea (<20 breaths/min) and recurrent apneic pauses",
          "Fatal neonatal opioid toxicity",
        ],
      };

      if (isUm) {
        detectedCollisions.unshift({
          drugId: culpritOpioids[0],
          drugName: opioidNames,
          hazardType: "opioid-cyp2d6-um-apnea",
          severity: "critical",
          headline: `FATAL NEONATAL RESPIRATORY ARREST RISK: Maternal CYP2D6 UM + ${opioidNames}`,
          mechanismExplanation: cyp2d6Alert.pathophysiology,
          criticalTimingWindow: "Lactation / Breastfeeding (highest neonatal vulnerability in first 4 weeks)",
          saferAlternatives: ["Acetaminophen", "Ibuprofen"],
        });
      }
    }
  }

  // 3. Clinical Pearls & Counseling Highlights
  const clinicalPearls: string[] = [
    "Pre-implantation All-or-None Window (GA weeks 3-4): Insults in the first 2 post-conception weeks either destroy the totipotent blastocyst (resulting in miscarriage/resorption) or surviving cells fully regenerate without anatomical malformations.",
    "Major Organogenesis Peak Vulnerability (GA weeks 5-10): This 6-week window is the critical period for major structural birth defects (neural tube days 21-28, heart days 20-50, limbs days 24-36, palate days 45-60).",
    "RAAS Blocker Potter Sequence (2nd/3rd trimester): ACEi and ARBs do not cause classic first-trimester structural agenesis, but in the 2nd/3rd trimesters block fetal renal AT1 receptors, causing fetal anuria, oligohydramnios, Potter facies, lethal pulmonary hypoplasia, and hypocalvaria.",
    "Dual NSAID Trimester Windows: Use >= 20 weeks GA causes fetal renal hypoperfusion and oligohydramnios within 48 hr; use >= 28-30 weeks causes premature in utero constriction of the ductus arteriosus and fatal persistent pulmonary hypertension of the newborn (PPHN).",
    "Acitretin Etretinate Transesterification Trap: Ethanol (even in trace culinary/medicinal amounts) transesterifies acitretin to etretinate (t1/2 ~120-168 days), storing in adipose tissue for years. Requires a mandatory 3-year post-treatment pregnancy prohibition.",
    "Lactation RID < 10% Clinical Benchmark: An infant receiving < 10% of the maternal weight-adjusted dose is considered clinically safe for breastfeeding. Ibuprofen (RID < 0.5%) and acetaminophen (RID ~2%) are preferred first-line postpartum analgesics.",
    "Infant Bioavailability Protection: Aminoglycosides (gentamicin) and glycopeptides (vancomycin) have poor infant oral absorption (<1-5%) and do not achieve systemic levels despite low milk presence.",
  ];

  if (isPregnant) {
    clinicalPearls.unshift(
      "ACTIVE PREGNANCY CONTEXT: Strict review of teratogenic windows and immediate substitution of high-yield teratogens with obstetric standard-of-care alternatives (labetalol/nifedipine for HTN, LMWH for anticoagulation, insulin for diabetes).",
    );
  }

  if (isLactating) {
    clinicalPearls.unshift(
      "ACTIVE LACTATION CONTEXT: Review Relative Infant Dose (RID), infant oral bioavailability barriers, and avoid CYP2D6-dependent opioid prodrugs (codeine, tramadol).",
    );
  }

  // 4. Determine overall summary status and headline
  let summaryStatus: PregnancyLactationReport["summaryStatus"] = "compatible";
  let headline = "No high-yield teratogens or critical lactation hazards detected on current regimen.";

  const hasCritical = detectedCollisions.some((c) => c.severity === "critical");
  const hasHigh = detectedCollisions.some((c) => c.severity === "high");

  if (hasCritical) {
    summaryStatus = "critical";
    headline = "CRITICAL TERATOGENIC OR LACTATION COLLISION DETECTED: Immediate clinical reassessment indicated.";
  } else if (hasHigh) {
    summaryStatus = "warning";
    headline = "SIGNIFICANT PERINATAL HAZARD IDENTIFIED: Trimester-specific risk requires close monitoring or safer substitution.";
  } else if (detectedCollisions.length > 0) {
    summaryStatus = "advisory";
    headline = "PERINATAL ADVISORY: Review exposure timing and infant feeding monitoring parameters.";
  } else if (drugIds.length === 0) {
    summaryStatus = "unmapped";
    headline = "No active medications on desk to evaluate for perinatal safety.";
  }

  const disclaimer = `${PREGNANCY_LACTATION_REGULATORY_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`;

  return {
    summaryStatus,
    headline,
    hostContext: {
      pregState: host.preg ?? "off",
      cyp2d6Phenotype,
      gestationalAgeWeeks: gaWeeks,
    },
    activeVulnerabilityWindows,
    detectedCollisions,
    teratogenicProfiles,
    placentalPermeationAnalyses,
    lactationAnalyses,
    cyp2d6LactationAlert: cyp2d6Alert,
    clinicalPearls,
    regulatoryPosture: {
      statutoryCitation: "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Reference",
      nonDeviceCdsCriteria: CDS_CRITERIA_COMPLIANCE,
      disclaimer: PREGNANCY_LACTATION_REGULATORY_DISCLAIMER,
    },
    disclaimer,
  };
}
