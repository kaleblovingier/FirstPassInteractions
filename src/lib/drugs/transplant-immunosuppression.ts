/**
 * Solid Organ Transplant Maintenance Immunosuppression, Enterohepatic
 * Recirculation & Clearance Collision Engine
 *
 * FD&C ACT § 520(o)(1)(E) REGULATORY COMPLIANCE POSTURE:
 * Non-Device Clinical Decision Support (CDS) Software Reference.
 * This software module is intended solely for educational, analytical, and
 * clinical decision-support reference by licensed healthcare professionals
 * (transplant nephrologists, hepatologists, cardiologists, pulmonologists,
 * transplant clinical pharmacists, and clinical pharmacologists) and medical trainees.
 *
 * In strict conformity with Section 520(o)(1)(E) of the Federal Food, Drug,
 * and Cosmetic Act (21 U.S.C. § 360j(o)(1)(E)):
 * 1. It does not acquire, process, or analyze medical images or signals from in vitro
 *    diagnostic devices or automated pattern recognition;
 * 2. It displays and analyzes established clinical pharmacological mechanisms,
 *    transmembrane transport vectors, enzyme kinetics, and peer-reviewed clinical guidelines;
 * 3. It provides non-prescriptive clinical considerations and educational rationale;
 * 4. It enables healthcare professionals to independently review the pharmacological basis,
 *    molecular pathways, and peer-reviewed citations so that they do not rely primarily
 *    on any recommendation to make patient-specific clinical decisions.
 *
 * This engine does NOT provide patient-specific dosing directives, prescribing orders,
 * or automated diagnostic determinations.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext, DEFAULT_HOST } from "./types";

// ============================================================================
// REGULATORY NOTICE & AUTHORITATIVE CITATIONS
// ============================================================================

export const TRANSPLANT_CDS_REGULATORY_NOTICE =
  "FirstPass Solid Organ Transplant Immunosuppression & Clearance Collision Engine is an educational Clinical Decision Support reference under FD&C Act § 520(o)(1)(E). It provides non-prescriptive pharmacological explanations of quad-therapy maintenance regimens, mycophenolic acid enterohepatic recirculation, CNI clearance collisions, mTOR surgical healing rails, and corticosteroid taper dynamics compiled from KDIGO, AASLD, ISHLT, and peer-reviewed clinical pharmacokinetics literature. It does not provide patient-specific dosing orders, treatment directives, or diagnostic determinations. Licensed clinicians retain sole responsibility for independent regimen design and therapeutic drug monitoring.";

export const TRANSPLANT_LITERATURE_CITATIONS: readonly string[] = [
  "KDIGO Clinical Practice Guideline for the Care of Kidney Transplant Recipients. Kidney Int Suppl. 2009;(113):S1-155. Reaffirmed 2024 update on immunosuppressive strategies.",
  "Lucey MR, et al. Long-term management of the adult liver transplant recipient: 2012 practice guideline by AASLD and AST. Hepatology. 2013;57(1):281-303. doi:10.1002/hep.26046.",
  "Costanzo MR, et al. The International Society of Heart and Lung Transplantation Guidelines for the care of heart transplant recipients. J Heart Lung Transplant. 2010;29(8):914-956.",
  "Venkateswaran RV, et al. The International Society for Heart and Lung Transplantation Guidelines for the management of lung transplant recipients. J Heart Lung Transplant. 2021;40(11):1349-1400.",
  "van Gelder T, et al. Pharmacokinetics and clinical efficacy of mycophenolate mofetil in renal transplant recipients. Clin Pharmacokinet. 2002;41(14):1129-1142.",
  "Kuypers DR, et al. Enterohepatic recirculation and pharmacokinetics of mycophenolic acid in renal allograft recipients: Cyclosporine A versus tacrolimus. Clin Pharmacol Ther. 2005;77(4):329-341.",
  "Shipkova M, et al. Therapeutic drug monitoring of mycophenolic acid: Recommended analytical methods and target concentrations. Clin Chem. 2005;51(6):978-989.",
  "Brunet M, et al. Therapeutic drug monitoring of tacrolimus-personalized therapy: Second consensus report. Ther Drug Monit. 2019;41(3):261-307.",
  "Nankivell BJ, et al. The natural history of chronic allograft nephropathy. N Engl J Med. 2003;349(24):2326-2333.",
  "Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. Chapter 39: Immunosuppressants, Tolerogens, and Immunostimulants. McGraw-Hill; 2023.",
];

// ============================================================================
// SOLID ORGAN TYPES & QUAD-THERAPY TAXONOMY
// ============================================================================

export type SolidOrgan = "kidney" | "liver" | "heart" | "lung";

export type QuadTherapyClass =
  | "cni"
  | "antimetabolite"
  | "mtor_inhibitor"
  | "corticosteroid";

export interface TransplantDrugProfile {
  id: string;
  name: string;
  brandNames: string[];
  quadClass: QuadTherapyClass;
  molecularTarget: string;
  intracellularReceptor: string;
  biochemicalMechanism: string;
  primaryMetabolizingEnzymes: string[];
  transporterVectors: string[];
  narrowTherapeuticIndex: boolean;
  typicalTdmMatrix: {
    earlyTarget: string;
    maintenanceTarget: string;
    samplingWindow: string;
  };
  keyAdverseEffects: string[];
  clinicalPearls: string[];
}

export const TRANSPLANT_DRUG_PROFILES: Record<string, TransplantDrugProfile> = {
  tacrolimus: {
    id: "tacrolimus",
    name: "Tacrolimus (FK506)",
    brandNames: ["Prograf", "Advagraf", "Envarsus XR", "Astagraf XL", "Protopic"],
    quadClass: "cni",
    molecularTarget: "Calcineurin Phosphatase (Protein Phosphatase 2B / PP2B)",
    intracellularReceptor: "FKBP-12 (FK506-Binding Protein 12, 12 kDa Immunophilin)",
    biochemicalMechanism:
      "Binds intracellular FKBP-12; the binary complex potently inhibits calcineurin serine/threonine phosphatase, preventing dephosphorylation and nuclear translocation of Nuclear Factor of Activated T-cells (NFAT), thereby halting transcription of interleukin-2 (IL-2) and downstream T-cell activation/proliferation cascades.",
    primaryMetabolizingEnzymes: ["CYP3A4", "CYP3A5"],
    transporterVectors: ["P-gp (ABCB1 efflux substrate)"],
    narrowTherapeuticIndex: true,
    typicalTdmMatrix: {
      earlyTarget: "8–12 ng/mL (Kidney/Liver: 8–10; Heart/Lung: 10–15)",
      maintenanceTarget: "5–8 ng/mL (Liver stable: 4–6; Lung stable: 8–12)",
      samplingWindow: "12-hour trough (C0) whole blood immediately prior to morning dose",
    },
    keyAdverseEffects: [
      "Afferent renal arteriolar vasoconstriction, isometric tubular vacuolization, chronic arteriopathy, thrombotic microangiopathy (TMA)",
      "Neurotoxicity: fine intention tremor, insomnia, severe cefalea, paresthesias, posterior reversible encephalopathy syndrome (PRES)",
      "Post-Transplant Diabetes Mellitus (PTDM / NODAT) via pancreatic islet beta-cell vacuolization and suppression of insulin mRNA transcription",
      "Electrolyte shifts: hypomagnesemia (urinary wasting), hyperkalemia (inhibition of principal cell ROMK/ENaC), alopecia",
    ],
    clinicalPearls: [
      "Does NOT inhibit canalicular MRP2 (ABCC2); preserves normal biliary MPAG excretion and mycophenolic acid enterohepatic recycling.",
      "CYP3A5*1 extensive expressers require 1.5- to 2-fold higher doses to achieve target trough compared to CYP3A5*3/*3 non-expressers.",
      "Whole blood binding: 85-90% concentrated inside erythrocytes bound to FKBP; changes in hematocrit alter total measured trough levels without altering free drug exposure.",
    ],
  },
  cyclosporine: {
    id: "cyclosporine",
    name: "Cyclosporine A (CsA)",
    brandNames: ["Neoral", "Sandimmune", "Gengraf"],
    quadClass: "cni",
    molecularTarget: "Calcineurin Phosphatase (Protein Phosphatase 2B / PP2B)",
    intracellularReceptor: "Cyclophilin A (18 kDa Cytosolic Immunophilin)",
    biochemicalMechanism:
      "Binds cytosolic Cyclophilin A; the complex inhibits calcineurin phosphatase activity, blocking NFAT dephosphorylation, preventing nuclear translocation, and suppressing IL-2 transcription. Microemulsion formulations (Neoral, Gengraf) provide bile-independent, self-emulsifying gastrointestinal absorption compared to original oil-based formulation (Sandimmune).",
    primaryMetabolizingEnzymes: ["CYP3A4"],
    transporterVectors: [
      "P-gp (ABCB1 substrate & moderate inhibitor)",
      "MRP2 (ABCC2 potent canalicular inhibitor)",
      "OATP1B1 / OATP1B3 inhibitor",
      "BSEP (ABCB11 inhibitor)",
    ],
    narrowTherapeuticIndex: true,
    typicalTdmMatrix: {
      earlyTarget: "200–350 ng/mL C0 or 800–1200 ng/mL C2 (2-hr post-dose)",
      maintenanceTarget: "100–200 ng/mL C0 or 600–800 ng/mL C2",
      samplingWindow: "12-hour trough (C0) or strictly timed 2-hour post-dose (C2 +/- 15 min)",
    },
    keyAdverseEffects: [
      "Afferent arteriolar vasoconstriction and acute/chronic renal allograft nephrotoxicity",
      "Endothelin-mediated systemic arterial hypertension (higher incidence than tacrolimus)",
      "Gingival hyperplasia, hirsutism/hypertrichosis",
      "Dyslipidemia: marked hypercholesterolemia and hypertriglyceridemia (LDL clearance inhibition)",
      "Hyperuricemia and accelerated clinical gout; hyperkalemia and hypomagnesemia",
    ],
    clinicalPearls: [
      "CRITICAL: Potently inhibits canalicular Multidrug Resistance-associated Protein 2 (MRP2/ABCC2), eliminating enterohepatic recirculation of mycophenolate and slashing MPA AUC by 30-40%!",
      "C2 monitoring provides superior correlation with 12-hour AUC (AUC0-12) compared to C0 for microemulsion formulation.",
    ],
  },
  mycophenolate: {
    id: "mycophenolate",
    name: "Mycophenolate Mofetil (MMF) / Mycophenolic Acid (MPA)",
    brandNames: ["CellCept", "Myfortic (as EC-MPS)"],
    quadClass: "antimetabolite",
    molecularTarget: "Inosine Monophosphate Dehydrogenase (IMPDH Type II Isoform)",
    intracellularReceptor: "None (direct reversible non-competitive/uncompetitive enzyme inhibition)",
    biochemicalMechanism:
      "Rapidly hydrolyzed by plasma and tissue esterases to active Mycophenolic Acid (MPA). MPA potently and reversibly inhibits IMPDH (with 5-fold selectivity for the inducible Type II isoform in activated lymphocytes), blocking the de novo synthesis of guanosine nucleotides (GMP, dGTP). Because lymphocytes lack the purine salvage pathway (HGPRT), T- and B-cell clonal expansion is arrested in S-phase.",
    primaryMetabolizingEnzymes: ["UGT1A9 (major)", "UGT2B7", "UGT1A8"],
    transporterVectors: ["MRP2 (ABCC2 canalicular biliary excretion of MPAG)"],
    narrowTherapeuticIndex: false,
    typicalTdmMatrix: {
      earlyTarget: "MPA AUC0-12 30–60 mg*h/L (Trough C0 target ~1.5–3.5 mcg/mL with Tac, 2.0–4.0 with CsA)",
      maintenanceTarget: "MPA AUC0-12 30–60 mg*h/L",
      samplingWindow: "12-hour pre-dose trough C0 or limited 3-point sampling AUC estimate",
    },
    keyAdverseEffects: [
      "Dose-limiting gastrointestinal toxicity: erosive enteropathy, disabling diarrhea, nausea, abdominal cramping",
      "Bone marrow suppression: leukopenia, neutropenia, anemia, thrombocytopenia",
      "Increased opportunistic infection risk: CMV viremia/disease, BK virus nephropathy, HSV",
      "Teratogenicity: FDA Boxed Warning; congenital ear malformations (microtia), facial clefts, cardiovascular anomalies, 45% spontaneous abortion rate",
    ],
    clinicalPearls: [
      "Secondary MPA peak occurs at 6 to 12 hours post-dose from enterohepatic recirculation, supplying 10% to 40% of total 24-hour MPA AUC.",
      "Biliary excretion of inactive MPAG via MRP2 is blocked by cyclosporine, but preserved by tacrolimus.",
      "Enteric-Coated Mycophenolate Sodium (EC-MPS / Myfortic) releases at neutral intestinal pH (>= 6.0), bypassing gastric hypochlorhydria collisions seen with MMF + PPIs.",
    ],
  },
  azathioprine: {
    id: "azathioprine",
    name: "Azathioprine",
    brandNames: ["Imuran", "Azasan"],
    quadClass: "antimetabolite",
    molecularTarget: "De novo purine synthesis & DNA/RNA chain elongation via 6-TGN incorporation",
    intracellularReceptor: "None (antimetabolite prodrug)",
    biochemicalMechanism:
      "Prodrug converted non-enzymatically (and via glutathione S-transferase) into 6-mercaptopurine (6-MP). 6-MP is metabolized via HGPRT into 6-thioguanine nucleotides (6-TGN), which incorporate into replicating DNA/RNA causing chain termination and apoptosis. Competing catabolic pathways are TPMT (methylation) and Xanthine Oxidase (XO, oxidation to thiouric acid).",
    primaryMetabolizingEnzymes: ["TPMT", "NUDT15", "Xanthine Oxidase (catabolism)"],
    transporterVectors: ["OAT3", "MRP4"],
    narrowTherapeuticIndex: true,
    typicalTdmMatrix: {
      earlyTarget: "Standard empiric dosing 1–2 mg/kg/day adjusted for TPMT/NUDT15 genotypes",
      maintenanceTarget: "Adjusted to maintain absolute neutrophil count (ANC) > 1500 /mcL",
      samplingWindow: "RBC 6-TGN / 6-MMP metabolites in refractory rejection or unexplained myelosuppression",
    },
    keyAdverseEffects: [
      "Dose-dependent bone marrow suppression: profound leukopenia, thrombocytopenia, pancytopenia",
      "Hepatotoxicity: cholestatic jaundice, veno-occlusive disease / sinusoidal obstruction syndrome",
      "Pancreatitis (hypersensitivity reaction, typically within initial 4 weeks)",
      "Malignancy: increased long-term risk of non-melanoma skin cancer and lymphoproliferative disorders",
    ],
    clinicalPearls: [
      "CRITICAL FATAL COLLISION with Xanthine Oxidase inhibitors (allopurinol, febuxostat): blocking 6-MP catabolism shunts massive flux into active 6-TGN, triggering fatal bone marrow aplasia unless azathioprine dose is proactively reduced by 67-75% or avoided entirely.",
    ],
  },
  sirolimus: {
    id: "sirolimus",
    name: "Sirolimus (Rapamycin)",
    brandNames: ["Rapamune"],
    quadClass: "mtor_inhibitor",
    molecularTarget: "Mechanistic Target of Rapamycin Complex 1 (mTORC1 Serine/Threonine Kinase)",
    intracellularReceptor: "FKBP-12 (FK506-Binding Protein 12, exact same immunophilin as Tacrolimus)",
    biochemicalMechanism:
      "Binds intracellular FKBP-12; the binary complex does NOT inhibit calcineurin, but instead binds and inhibits the mTORC1 complex. This arrests downstream phosphorylation of p70S6 kinase (p70S6K) and eukaryotic initiation factor 4E-binding protein 1 (4E-BP1), arresting interleukin-driven T- and B-cell cell cycle progression from G1 into S phase.",
    primaryMetabolizingEnzymes: ["CYP3A4"],
    transporterVectors: ["P-gp (ABCB1 substrate)"],
    narrowTherapeuticIndex: true,
    typicalTdmMatrix: {
      earlyTarget: "Combined with low-dose CNI: 4–8 ng/mL; CNI-free protocol: 8–12 ng/mL",
      maintenanceTarget: "CNI-sparing maintenance: 4–8 ng/mL; Monotherapy/CNI-free: 6–10 ng/mL",
      samplingWindow: "24-hour trough (C0) whole blood due to prolonged elimination half-life (~60 hours)",
    },
    keyAdverseEffects: [
      "Impaired surgical wound healing: incisional dehiscence, lymphoceles, persistent seromas, incisional hernias, anastomotic leaks",
      "Metabolic dysregulation: marked hypertriglyceridemia and hypercholesterolemia (lipoprotein lipase inhibition)",
      "Renal: de novo proteinuria, podocyte foot process effacement; additive afferent arteriolar nephrotoxicity when combined with full-dose CNIs",
      "Pulmonary: non-infectious interstitial pneumonitis / lymphocytic alveolitis",
      "Aphthous oral ulcerations, delayed graft function (DGF) prolongation, thrombocytopenia",
    ],
    clinicalPearls: [
      "Black Box Warning in Liver Transplantation: Excess mortality, graft loss, and Hepatic Artery Thrombosis (HAT) when initiated early post-transplant.",
      "Strict surgical hold: Must avoid or delay initiation for at least 4 to 6 weeks post-transplantation until surgical incisions and vascular/airway anastomoses have fully re-epithelialized.",
      "Proteinuria monitoring rail: Conversion from CNI to mTOR inhibitor is contraindicated or associated with poor allograft outcomes if baseline 24-hr urinary protein > 500-800 mg.",
    ],
  },
  everolimus: {
    id: "everolimus",
    name: "Everolimus (RAD001)",
    brandNames: ["Zortress", "Certican", "Afinitor"],
    quadClass: "mtor_inhibitor",
    molecularTarget: "Mechanistic Target of Rapamycin Complex 1 (mTORC1)",
    intracellularReceptor: "FKBP-12 (FK506-Binding Protein 12)",
    biochemicalMechanism:
      "40-O-(2-hydroxyethyl) derivative of sirolimus. Binds FKBP-12 to form a ternary complex with mTORC1, blocking p70S6K and 4E-BP1 phosphorylation and arresting lymphocyte cell cycle progression at G1->S transition. Shorter half-life (~30 hours) allows steady state to be reached within 4-5 days compared to 7-10 days for sirolimus.",
    primaryMetabolizingEnzymes: ["CYP3A4"],
    transporterVectors: ["P-gp (ABCB1 substrate)"],
    narrowTherapeuticIndex: true,
    typicalTdmMatrix: {
      earlyTarget: "Combined with reduced-exposure CNI: 3–8 ng/mL",
      maintenanceTarget: "Target trough 3–8 ng/mL",
      samplingWindow: "12-hour trough (C0) whole blood immediately prior to next dose",
    },
    keyAdverseEffects: [
      "Wound healing impairment, lymphocele formation, wound breakdown",
      "Hyperlipidemia (hypertriglyceridemia and elevated LDL)",
      "Proteinuria and additive nephrotoxicity with standard-dose CNI",
      "Non-infectious pneumonitis, stomatitis/mouth ulcers, edema",
    ],
    clinicalPearls: [
      "Widely utilized in heart transplantation to attenuate cardiac allograft vasculopathy (CAV) progression.",
      "Shares sirolimus surgical delay requirements (>= 4-6 weeks post-op) and proteinuria surveillance thresholds.",
    ],
  },
  prednisone: {
    id: "prednisone",
    name: "Prednisone",
    brandNames: ["Deltasone", "Rayos"],
    quadClass: "corticosteroid",
    molecularTarget: "Glucocorticoid Receptor (GR / NR3C1)",
    intracellularReceptor: "Cytosolic Glucocorticoid Receptor",
    biochemicalMechanism:
      "Hepatically converted by 11-beta-HSD1 to active prednisolone. Binds cytosolic GR, translocates to nucleus, binds GREs and physically interacts with NF-kappa-B and AP-1 transcription factors (transrepression), downregulating transcription of pro-inflammatory cytokines (IL-1, IL-2, IL-6, TNF-alpha) and inducing annexin A1 (lipocortin) to suppress phospholipase A2.",
    primaryMetabolizingEnzymes: ["11-beta-HSD1 (activation)", "CYP3A4 (metabolism)"],
    transporterVectors: ["P-gp (ABCB1 substrate & mild inducer)"],
    narrowTherapeuticIndex: false,
    typicalTdmMatrix: {
      earlyTarget: "Taper schedule: starting 20–30 mg/day (post-IV methylpred pulse), tapering to 5 mg/day by month 1–3",
      maintenanceTarget: "5 mg/day oral maintenance or steroid withdrawal protocol",
      samplingWindow: "Clinical efficacy/toxicity monitoring; no serum drug level monitoring required",
    },
    keyAdverseEffects: [
      "Metabolic: hyperglycemia, post-transplant diabetes mellitus, visceral adiposity, cushingoid facies",
      "Cardiovascular: fluid retention, arterial hypertension, dyslipidemia",
      "Musculoskeletal: osteopenia/osteoporosis, avascular necrosis (osteonecrosis) of femoral head, myopathy",
      "Ophthalmic: posterior subcapsular cataracts, glaucoma; Dermatologic: skin atrophy, impaired wound healing",
    ],
    clinicalPearls: [
      "DYNAMIC CNI REBOUND DURING TAPER: High-dose corticosteroids induce CYP3A4 and P-gp via PXR activation. As prednisone is tapered down post-transplant, enzyme induction wanes, dropping CNI clearance and triggering a dangerous rebound surge in tacrolimus/cyclosporine trough levels with acute allograft nephrotoxicity unless CNI doses are proactively decreased!",
    ],
  },
  methylprednisolone: {
    id: "methylprednisolone",
    name: "Methylprednisolone",
    brandNames: ["Solu-Medrol", "Medrol"],
    quadClass: "corticosteroid",
    molecularTarget: "Glucocorticoid Receptor (GR)",
    intracellularReceptor: "Cytosolic Glucocorticoid Receptor",
    biochemicalMechanism:
      "Active 6-alpha-methylated synthetic glucocorticoid with 5-fold anti-inflammatory potency relative to hydrocortisone and minimal mineralocorticoid activity. Administered as intravenous sodium succinate for perioperative induction boluses (250-1000 mg IV at reperfusion) and high-dose pulse rescue for acute allograft rejection (250-500 mg IV daily for 3 days).",
    primaryMetabolizingEnzymes: ["CYP3A4"],
    transporterVectors: ["P-gp (ABCB1)"],
    narrowTherapeuticIndex: false,
    typicalTdmMatrix: {
      earlyTarget: "Induction bolus 250–1000 mg IV intraoperatively, rapid stepdown to oral prednisone",
      maintenanceTarget: "Oral Medrol 4 mg daily equivalent to prednisone 5 mg daily",
      samplingWindow: "Clinical monitoring; no serum TDM required",
    },
    keyAdverseEffects: [
      "Acute hyperglycemia requiring aggressive insulin coverage",
      "Acute psychosis, insomnia, mood lability",
      "Acute fluid retention, hypertension, peptic ulceration",
      "Opportunistic infection vulnerability (PJP, fungal, CMV)",
    ],
    clinicalPearls: [
      "High-dose intravenous pulses produce potent transient PXR-mediated CYP3A4 induction followed by post-pulse resolution.",
    ],
  },
};

// ============================================================================
// SOLID ORGAN PROTOCOLS & TDM TARGET MATRIX
// ============================================================================

export interface OrganTdmProfile {
  organ: SolidOrgan;
  organLabel: string;
  firstLineMaintenance: string;
  tacrolimusTargets: {
    months0to3: string;
    months3to6: string;
    maintenance: string;
  };
  cyclosporineTargets: {
    months0to3: string;
    maintenance: string;
  };
  mycophenolateStrategy: string;
  mtorConsiderations: string;
  corticosteroidStrategy: string;
  uniqueOrganVulnerabilities: string[];
}

export const SOLID_ORGAN_TDM_PROFILES: Record<SolidOrgan, OrganTdmProfile> = {
  kidney: {
    organ: "kidney",
    organLabel: "Renal Allograft (Kidney)",
    firstLineMaintenance: "Tacrolimus + Mycophenolate Mofetil / EC-MPS + Prednisone taper",
    tacrolimusTargets: {
      months0to3: "8–12 ng/mL (target 10 early post-op)",
      months3to6: "7–9 ng/mL",
      maintenance: "5–8 ng/mL (lower 4–6 ng/mL in CNI-minimization regimens)",
    },
    cyclosporineTargets: {
      months0to3: "200–300 ng/mL C0 (or 800–1000 ng/mL C2)",
      maintenance: "100–175 ng/mL C0 (or 600–800 ng/mL C2)",
    },
    mycophenolateStrategy:
      "MMF 1000 mg PO BID or EC-MPS 720 mg PO BID. When combined with Cyclosporine, higher MMF doses (1000–1500 mg BID) are frequently required due to MRP2 inhibition slashing MPA AUC by 30-40%.",
    mtorConsiderations:
      "Avoid early initiation (<4-6 weeks) due to surgical lymphoceles and wound breakdown. Conversion from CNI to mTOR inhibitor at 3-6 months can preserve GFR but requires baseline 24-hr proteinuria < 500-800 mg/day to avoid podocyte decompensation.",
    corticosteroidStrategy:
      "Prednisone 20 mg/day tapered to 5 mg/day by month 2-3. Steroid-withdrawal protocols (off by day 7) require potent induction (rATG) and close surveillance.",
    uniqueOrganVulnerabilities: [
      "CNI-induced afferent arteriolar vasoconstriction mimics acute rejection (elevated serum creatinine).",
      "BK virus nephropathy triggered by over-immunosuppression (requires protocol screening for BK viremia).",
      "Delayed graft function (DGF) requires conservative CNI exposure until tubular recovery.",
    ],
  },
  liver: {
    organ: "liver",
    organLabel: "Hepatic Allograft (Liver)",
    firstLineMaintenance: "Tacrolimus monotherapy or Tacrolimus + MMF; early steroid withdrawal",
    tacrolimusTargets: {
      months0to3: "8–10 ng/mL",
      months3to6: "6–8 ng/mL",
      maintenance: "4–6 ng/mL (liver allografts exhibit inherent immune tolerance compared to kidney)",
    },
    cyclosporineTargets: {
      months0to3: "200–250 ng/mL C0",
      maintenance: "100–150 ng/mL C0",
    },
    mycophenolateStrategy:
      "MMF often initiated perioperatively for renal-sparing benefits (delaying or reducing CNI in hepatorenal syndrome) and tapered off by 6 to 12 months, leaving patient on CNI monotherapy.",
    mtorConsiderations:
      "BLACK BOX WARNING: Early use of sirolimus (<30 days post-liver transplant) is associated with fatal Hepatic Artery Thrombosis (HAT), graft loss, and excess mortality. Late conversion (>3-6 months) is safe for CNI-induced nephrotoxicity or hepatocellular carcinoma (HCC) recurrence suppression.",
    corticosteroidStrategy:
      "Rapid steroid taper; complete withdrawal by 3 to 6 months is standard of care to mitigate recurrence of metabolic dysfunction-associated steatohepatitis (MASH), hepatitis C, or severe diabetes.",
    uniqueOrganVulnerabilities: [
      "Hepatic artery thrombosis (HAT) catastrophic risk with early mTOR inhibitors.",
      "Biliary tract complications (strictures, leaks) alter enterohepatic recycling and MPA bioavailability.",
      "Hepatic graft tolerance allows lower long-term immunosuppressive targets than thoracic organs.",
    ],
  },
  heart: {
    organ: "heart",
    organLabel: "Cardiac Allograft (Heart)",
    firstLineMaintenance: "Tacrolimus + Mycophenolate Mofetil + Prednisone taper",
    tacrolimusTargets: {
      months0to3: "10–12 ng/mL (higher initial targets to prevent early cell-mediated/antibody-mediated rejection)",
      months3to6: "8–10 ng/mL",
      maintenance: "5–8 ng/mL",
    },
    cyclosporineTargets: {
      months0to3: "250–350 ng/mL C0",
      maintenance: "150–200 ng/mL C0",
    },
    mycophenolateStrategy:
      "MMF 1000–1500 mg PO BID preferred over azathioprine based on superior survival and lower rejection in randomized trials.",
    mtorConsiderations:
      "Everolimus or Sirolimus utilized after sternal wound healing (>1-3 months) specifically to attenuate Cardiac Allograft Vasculopathy (CAV) progression and CMV infection.",
    corticosteroidStrategy:
      "Prednisone starting at 20 mg/day, gradually tapered to 5-10 mg/day by month 6. Complete withdrawal attempted only in select low-immunologic-risk recipients due to severity of heart rejection.",
    uniqueOrganVulnerabilities: [
      "Cardiac allograft vasculopathy (CAV) is the leading cause of late graft failure; mTOR inhibitors provide anti-proliferative vascular protection.",
      "Denervated donor heart: rejection does not cause angina; requires routine protocol surveillance via endomyocardial biopsy (EMB) or donor-derived cell-free DNA (dd-cfDNA).",
    ],
  },
  lung: {
    organ: "lung",
    organLabel: "Pulmonary Allograft (Single/Bilateral Lung)",
    firstLineMaintenance: "Tacrolimus + Mycophenolate Mofetil + Prednisone (highest intensity quad-therapy)",
    tacrolimusTargets: {
      months0to3: "10–14 ng/mL (highest target among all solid organ transplants)",
      months3to6: "10–12 ng/mL",
      maintenance: "8–12 ng/mL",
    },
    cyclosporineTargets: {
      months0to3: "300–400 ng/mL C0",
      maintenance: "200–300 ng/mL C0",
    },
    mycophenolateStrategy:
      "MMF 1000–1500 mg PO BID standard; EC-MPS 720–1080 mg PO BID. Maintenance target MPA AUC0-12 often higher (45–60 mg*h/L) to prevent chronic allograft dysfunction.",
    mtorConsiderations:
      "STRICT EARLY CONTRAINDICATION: Fatal bronchial anastomotic dehiscence reported when mTOR inhibitors are initiated within 90 days of lung transplantation. Reserved exclusively for late refractory rejection or CNI-induced renal failure after robust bronchial airway healing is confirmed by bronchoscopy.",
    corticosteroidStrategy:
      "Indefinite maintenance prednisone (typically 5–10 mg/day); complete steroid withdrawal is rarely practiced due to high incidence of Chronic Lung Allograft Dysfunction (CLAD / Bronchiolitis Obliterans Syndrome).",
    uniqueOrganVulnerabilities: [
      "Highest rates of acute rejection and chronic rejection (CLAD) among all solid organs due to direct exposure to external atmospheric environmental antigens and pathogens.",
      "Bronchial airway ischemia and anastomotic vulnerability mandate absolute avoidance of mTOR inhibitors perioperatively.",
      "Broad-spectrum antibiotics frequently prescribed for pulmonary infections, precipitating severe gut flora MPA clearance collisions.",
    ],
  },
};

// ============================================================================
// DRUG CATALOG DICTIONARIES & ALIAS NORMALIZATION
// ============================================================================

export const CNI_DRUG_IDS = new Set([
  "tacrolimus",
  "prograf",
  "advagraf",
  "envarsus",
  "envarsus-xr",
  "astagraf",
  "astagraf-xl",
  "protopic",
  "fk506",
  "fk-506",
  "cyclosporine",
  "neoral",
  "sandimmune",
  "gengraf",
  "csa",
  "cyclosporin",
  "voclosporin",
  "lupkynis",
]);

export const ANTIMETABOLITE_DRUG_IDS = new Set([
  "mycophenolate",
  "mycophenolate-mofetil",
  "mycophenolate mofetil",
  "cellcept",
  "mmf",
  "myfortic",
  "ec-mps",
  "ecmps",
  "mycophenolic-acid",
  "mycophenolic acid",
  "mpa",
  "azathioprine",
  "imuran",
  "azasan",
  "6-mp",
  "6mp",
  "mercaptopurine",
  "purinethol",
]);

export const MTOR_INHIBITOR_DRUG_IDS = new Set([
  "sirolimus",
  "rapamune",
  "rapamycin",
  "everolimus",
  "zortress",
  "certican",
  "afinitor",
  "temsirolimus",
  "torisel",
]);

export const CORTICOSTEROID_DRUG_IDS = new Set([
  "prednisone",
  "deltasone",
  "rayos",
  "methylprednisolone",
  "solu-medrol",
  "solumedrol",
  "medrol",
  "dexamethasone",
  "decadron",
  "prednisolone",
  "orapred",
  "millipred",
  "hydrocortisone",
  "solu-cortef",
]);

export const BROAD_SPECTRUM_MICROBIOME_ANTIBIOTICS = new Set([
  "ciprofloxacin",
  "cipro",
  "levofloxacin",
  "levaquin",
  "moxifloxacin",
  "avelox",
  "amoxicillin-clavulanate",
  "augmentin",
  "amoxicillin",
  "amoxil",
  "ampicillin-sulbactam",
  "unasyn",
  "piperacillin-tazobactam",
  "zosyn",
  "pip-tazo",
  "ceftriaxone",
  "rocephin",
  "cefepime",
  "maxipime",
  "ceftazidime",
  "fortaz",
  "cefotaxime",
  "claforan",
  "cefazolin",
  "ancef",
  "cefdinir",
  "omnicef",
  "cefpodoxime",
  "vantin",
  "meropenem",
  "merrem",
  "ertapenem",
  "invanz",
  "imipenem-cilastatin",
  "primaxin",
  "metronidazole",
  "flagyl",
  "clindamycin",
  "cleocin",
]);

export const BILE_ACID_SEQUESTRANTS = new Set([
  "cholestyramine",
  "questran",
  "prevalite",
  "colestipol",
  "colestid",
  "colesevelam",
  "welchol",
]);

export const PROTON_PUMP_INHIBITORS = new Set([
  "omeprazole",
  "prilosec",
  "esomeprazole",
  "nexium",
  "pantoprazole",
  "protonix",
  "lansoprazole",
  "prevacid",
  "rabeprazole",
  "aciphex",
  "dexlansoprazole",
  "dexilant",
]);

export const STRONG_CYP3A_INHIBITORS = new Set([
  "ketoconazole",
  "nizoral",
  "itraconazole",
  "sporanox",
  "voriconazole",
  "vfend",
  "posaconazole",
  "noxafil",
  "isavuconazonium",
  "cresemba",
  "clarithromycin",
  "biaxin",
  "ritonavir",
  "norvir",
  "cobicistat",
  "tybost",
  "paxlovid",
]);

export const STRONG_CYP3A_INDUCERS = new Set([
  "rifampin",
  "rifadin",
  "rifampicin",
  "rifabutin",
  "mycobutin",
  "carbamazepine",
  "tegretol",
  "phenytoin",
  "dilantin",
  "phenobarbital",
  "luminal",
  "st-johns-wort",
  "st johns wort",
  "hypericum",
]);

export const XANTHINE_OXIDASE_INHIBITORS = new Set([
  "allopurinol",
  "zyloprim",
  "alprim",
  "febuxostat",
  "uloric",
]);

// Helper to normalize any drug token
export function normalizeDrugToken(token: string): string {
  return token
    .toLowerCase()
    .trim()
    .replace(/[_/\s]+/g, "-");
}

// ============================================================================
// ENTEROHEPATIC RECIRCULATION SIMULATION ENGINE
// ============================================================================

export interface MpaSimulationInput {
  formulation: "mmf" | "ec-mps";
  doseMg: number;
  cniPerpetrator: "tacrolimus" | "cyclosporine" | "none";
  antibioticActive: boolean;
  cholestyramineActive: boolean;
  ppiActive: boolean;
}

export interface MpaKineticPoint {
  timeHours: number;
  concentrationMcgMl: number;
  isSecondaryPeakWindow: boolean;
}

export interface MpaSimulationResult {
  formulation: "mmf" | "ec-mps";
  doseMg: number;
  baselineAuc0_24: number; // in mg*h/L
  effectiveAuc0_24: number; // in mg*h/L
  aucPercentChange: number;
  primaryPeakCmaxMcgMl: number;
  primaryPeakTmaxHours: number;
  secondaryPeakCmaxMcgMl: number;
  secondaryPeakTmaxHours: number;
  secondaryPeakAbolished: boolean;
  secondaryPeakContributionPct: number;
  curve: MpaKineticPoint[];
  mechanisticNotes: string[];
}

/**
 * Mathematical bi-exponential simulation of Mycophenolic Acid (MPA) plasma concentration-time profile
 * across 24 hours (two 12-hour dosing intervals), capturing:
 * 1. Rapid primary absorption peak (1-2 hours)
 * 2. Glucuronidation to MPAG by hepatic UGT1A9
 * 3. Biliary MRP2 canalicular secretion
 * 4. Anaerobic flora beta-glucuronidase cleavage & secondary reabsorption peak (6-12 hours)
 * 5. Pharmacokinetic perturbations from Cyclosporine (MRP2 blockade), Antibiotics (flora eradication),
 *    Cholestyramine (intraluminal binding), and PPIs (gastric dissolution impairment).
 */
export function simulateMpaEnterohepaticKinetics(
  input: MpaSimulationInput,
): MpaSimulationResult {
  const {
    formulation,
    doseMg,
    cniPerpetrator,
    antibioticActive,
    cholestyramineActive,
    ppiActive,
  } = input;

  // Normalized baseline parameters for standard 1000 mg MMF / 720 mg EC-MPS
  const doseFactor = doseMg / 1000;
  let ka = formulation === "mmf" ? 2.5 : 1.8; // absorption rate constant (/hr)
  const kel = 0.06; // terminal elimination rate constant (/hr, t1/2 ~ 12-16 hrs)
  let baseCmax1 = (formulation === "mmf" ? 24.0 : 21.0) * doseFactor;
  let baseTmax1 = formulation === "mmf" ? 1.0 : 1.75;

  // PPI gastric dissolution effect: only impacts MMF (uncoated prodrug requires acidic dissolution)
  // EC-MPS dissolves in small bowel (pH >= 6.0), fully protected from PPI effect.
  let ppiBluntingFactor = 1.0;
  if (ppiActive && formulation === "mmf") {
    ppiBluntingFactor = 0.65; // ~35% drop in Cmax and delayed dissolution
    baseCmax1 *= ppiBluntingFactor;
    baseTmax1 += 0.5;
    ka *= 0.7;
  }

  // Secondary peak magnitude & enterohepatic recycling fraction:
  // In normal conditions with Tacrolimus, EHC contributes ~25-35% of total AUC.
  let ehcMultiplier = 1.0;
  const mechanisticNotes: string[] = [];

  if (cniPerpetrator === "cyclosporine") {
    ehcMultiplier *= 0.05; // Cyclosporine blocks MRP2 by ~95%
    mechanisticNotes.push(
      "Cyclosporine A potently inhibits biliary canalicular MRP2 (ABCC2), blocking MPAG entry into bile. Enterohepatic recirculation is abolished, dropping MPA AUC by ~35%.",
    );
  } else if (cniPerpetrator === "tacrolimus") {
    mechanisticNotes.push(
      "Tacrolimus does not inhibit canalicular MRP2; biliary MPAG excretion and enterohepatic recycling are intact.",
    );
  }

  if (antibioticActive) {
    ehcMultiplier *= 0.05; // Gut microbiome beta-glucuronidase eradicated
    mechanisticNotes.push(
      "Broad-spectrum antibiotics eradicate intestinal commensal anaerobic flora producing beta-glucuronidase, preventing MPAG cleavage back to MPA and eliminating the secondary peak (30–50% AUC loss).",
    );
  }

  if (cholestyramineActive) {
    ehcMultiplier = 0.0; // Complete intraluminal binding
    mechanisticNotes.push(
      "Cholestyramine binds MPA and MPAG irreversibly in the intestinal lumen, completely blocking enterohepatic reabsorption and accelerating clearance (40–50% AUC loss).",
    );
  }

  if (ppiActive && formulation === "mmf") {
    mechanisticNotes.push(
      "Proton pump inhibitor increases gastric pH, impairing Mycophenolate Mofetil dissolution, delaying Tmax and blunting Cmax by ~35%. Enteric-coated mycophenolate sodium (EC-MPS) avoids this interaction.",
    );
  } else if (ppiActive && formulation === "ec-mps") {
    mechanisticNotes.push(
      "EC-MPS (Myfortic) is protected from PPI gastric pH dissolution blunting because its enteric coat is designed to release at neutral jejunal/ileal pH (>= 6.0).",
    );
  }

  const secondaryPeakAbolished = ehcMultiplier < 0.15;
  const baseCmax2 = 7.5 * doseFactor * ehcMultiplier;
  const tmax2 = 8.0;

  // Generate concentration curve across 24 hours (simulating steady state 12-hr BID dosing)
  const timePoints = [
    0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0,
    12.5, 13.0, 14.0, 16.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0,
  ];

  const curve: MpaKineticPoint[] = [];
  let effectiveAuc0_24 = 0;
  let baselineAuc0_24 = 0;

  for (let i = 0; i < timePoints.length; i++) {
    const t = timePoints[i];
    const tCycle = t % 12; // 12-hour cycle for BID dosing

    // Primary absorption curve: Bateman function
    const primaryConc =
      baseCmax1 * 1.5 * (Math.exp(-kel * tCycle) - Math.exp(-ka * tCycle));
    const safePrimary = Math.max(0, primaryConc);

    // Baseline secondary peak (normal EHC)
    const baselineSecondary =
      7.5 * doseFactor * Math.exp(-0.5 * Math.pow((tCycle - tmax2) / 1.8, 2));

    // Perturbed secondary peak
    const effectiveSecondary =
      baseCmax2 * Math.exp(-0.5 * Math.pow((tCycle - tmax2) / 1.8, 2));

    // Trough floor
    const baselineFloor = 2.0 * doseFactor;
    const effectiveFloor =
      secondaryPeakAbolished ? 1.0 * doseFactor : 2.0 * doseFactor;

    const baseVal = Math.max(
      baselineFloor * Math.exp(-kel * tCycle),
      safePrimary + baselineSecondary,
    );
    const effVal = Math.max(
      effectiveFloor * Math.exp(-kel * tCycle),
      safePrimary + effectiveSecondary,
    );

    const isSecondaryWindow = (tCycle >= 6 && tCycle <= 11);
    curve.push({
      timeHours: t,
      concentrationMcgMl: parseFloat(effVal.toFixed(2)),
      isSecondaryPeakWindow: isSecondaryWindow,
    });

    // Trapezoidal rule integration for 24h AUC
    if (i > 0) {
      const dt = t - timePoints[i - 1];
      const prevEff = curve[i - 1].concentrationMcgMl;
      const prevBase = Math.max(
        baselineFloor * Math.exp(-kel * (timePoints[i - 1] % 12)),
        Math.max(
          0,
          (formulation === "mmf" ? 24 : 21) * doseFactor * 1.5 *
            (Math.exp(-kel * (timePoints[i - 1] % 12)) -
              Math.exp(-ka * (timePoints[i - 1] % 12))),
        ) +
          7.5 * doseFactor *
            Math.exp(-0.5 * Math.pow(((timePoints[i - 1] % 12) - tmax2) / 1.8, 2)),
      );

      effectiveAuc0_24 += ((prevEff + effVal) / 2) * dt;
      baselineAuc0_24 += ((prevBase + baseVal) / 2) * dt;
    }
  }

  // Normalize AUC figures to standard reference ranges
  // Standard 1000 mg BID MMF baseline AUC is ~45-50 mg*h/L
  const targetBaselineAuc = 48.0 * doseFactor;
  const ratio = targetBaselineAuc / Math.max(1, baselineAuc0_24);
  baselineAuc0_24 = targetBaselineAuc;
  effectiveAuc0_24 = effectiveAuc0_24 * ratio;

  if (cholestyramineActive) {
    effectiveAuc0_24 *= 0.55; // 45% drop
  } else if (cniPerpetrator === "cyclosporine" || antibioticActive) {
    effectiveAuc0_24 *= 0.65; // ~35% drop
  }

  const aucPercentChange =
    ((effectiveAuc0_24 - baselineAuc0_24) / baselineAuc0_24) * 100;
  const secondaryPeakContributionPct = secondaryPeakAbolished
    ? 2.0
    : 28.5 * ehcMultiplier;

  return {
    formulation,
    doseMg,
    baselineAuc0_24: parseFloat(baselineAuc0_24.toFixed(1)),
    effectiveAuc0_24: parseFloat(effectiveAuc0_24.toFixed(1)),
    aucPercentChange: parseFloat(aucPercentChange.toFixed(1)),
    primaryPeakCmaxMcgMl: parseFloat(baseCmax1.toFixed(1)),
    primaryPeakTmaxHours: parseFloat(baseTmax1.toFixed(2)),
    secondaryPeakCmaxMcgMl: secondaryPeakAbolished
      ? 0.0
      : parseFloat(baseCmax2.toFixed(1)),
    secondaryPeakTmaxHours: tmax2,
    secondaryPeakAbolished,
    secondaryPeakContributionPct: parseFloat(
      secondaryPeakContributionPct.toFixed(1),
    ),
    curve,
    mechanisticNotes,
  };
}

// ============================================================================
// CORTICOSTEROID TAPER & DYNAMIC CNI REBOUND ENGINE
// ============================================================================

export interface SteroidTaperInput {
  cniAgent: "tacrolimus" | "cyclosporine";
  currentCniTroughNgMl: number;
  initialPrednisoneDoseMg: number;
  taperedPrednisoneDoseMg: number;
}

export interface SteroidTaperResult {
  cniAgent: "tacrolimus" | "cyclosporine";
  initialPrednisoneDoseMg: number;
  taperedPrednisoneDoseMg: number;
  cyp3aInductionResolutionPct: number;
  predictedCniClearanceReductionPct: number;
  projectedReboundTroughNgMl: number;
  clinicalRiskTier: "critical" | "high" | "moderate" | "standard";
  mechanisticRationale: string;
  recommendedAction: string;
}

/**
 * Simulates the dynamic clearance reduction and rebound surge in Calcineurin Inhibitor (CNI)
 * trough concentrations as maintenance corticosteroids are tapered down post-transplantation.
 */
export function simulateCniSteroidTaper(
  input: SteroidTaperInput,
): SteroidTaperResult {
  const {
    cniAgent,
    currentCniTroughNgMl,
    initialPrednisoneDoseMg,
    taperedPrednisoneDoseMg,
  } = input;

  const deltaSteroid = Math.max(
    0,
    initialPrednisoneDoseMg - taperedPrednisoneDoseMg,
  );
  const taperFraction = initialPrednisoneDoseMg > 0
    ? deltaSteroid / initialPrednisoneDoseMg
    : 0;

  // High dose prednisone (>= 20 mg/day) produces significant CYP3A4/P-gp induction.
  // Full resolution of induction from 20-30 mg to 0-5 mg drops intrinsic CNI clearance by ~30-45%.
  const maxClearanceDrop = cniAgent === "tacrolimus" ? 0.40 : 0.35;
  const predictedClearanceDrop = maxClearanceDrop * Math.min(1.0, taperFraction * 1.2);
  const clearanceReductionPct = predictedClearanceDrop * 100;
  const inductionResolutionPct = Math.min(100, taperFraction * 100);

  // Clearance inverse relationship: Css = Dose / CL -> Css_new = Css_old / (1 - drop)
  const multiplier = 1 / Math.max(0.2, 1 - predictedClearanceDrop);
  const projectedTrough = currentCniTroughNgMl * multiplier;

  let riskTier: "critical" | "high" | "moderate" | "standard" = "standard";
  if (projectedTrough >= (cniAgent === "tacrolimus" ? 15 : 350)) {
    riskTier = "critical";
  } else if (projectedTrough >= (cniAgent === "tacrolimus" ? 12 : 250)) {
    riskTier = "high";
  } else if (deltaSteroid >= 10) {
    riskTier = "moderate";
  }

  const agentLabel = cniAgent === "tacrolimus" ? "Tacrolimus" : "Cyclosporine";
  const rationalText =
    `Glucocorticoids activate Pregnane X Receptors (PXR), inducing hepatic and intestinal CYP3A4, CYP3A5, and P-gp. As prednisone is tapered from ${initialPrednisoneDoseMg} mg to ${taperedPrednisoneDoseMg} mg daily, enzyme induction wanes, reducing ${agentLabel} intrinsic clearance by ~${clearanceReductionPct.toFixed(0)}%. Without proactive CNI dose reduction, steady-state trough concentrations surge from ${currentCniTroughNgMl.toFixed(1)} ng/mL to an estimated ${projectedTrough.toFixed(1)} ng/mL.`;

  const actionText =
    `Plan proactive therapeutic drug monitoring (TDM) within 3 to 7 days of each steroid taper step. Anticipate prospective CNI dose reduction of ~20% to 35% during significant tapers (e.g. >= 10-15 mg/day drop) to prevent acute allograft vasoconstriction, acute kidney injury, and neurotoxicity.`;

  return {
    cniAgent,
    initialPrednisoneDoseMg,
    taperedPrednisoneDoseMg,
    cyp3aInductionResolutionPct: parseFloat(inductionResolutionPct.toFixed(1)),
    predictedCniClearanceReductionPct: parseFloat(
      clearanceReductionPct.toFixed(1),
    ),
    projectedReboundTroughNgMl: parseFloat(projectedTrough.toFixed(1)),
    clinicalRiskTier: riskTier,
    mechanisticRationale: rationalText,
    recommendedAction: actionText,
  };
}

// ============================================================================
// TRANSPLANT COLLISION ENGINE & ALERT TAXONOMY
// ============================================================================

export interface TransplantCollisionAlert {
  id: string;
  title: string;
  severity: "critical" | "high" | "moderate";
  collidingAgents: [string, string];
  mechanismCategory:
    | "enterohepatic_mrp2"
    | "microbiome_flora"
    | "intraluminal_binding"
    | "gastric_dissolution"
    | "fkbp12_competition"
    | "surgical_wound_healing"
    | "cyp3a_perpetrator"
    | "corticosteroid_taper"
    | "xanthine_oxidase_bone_marrow"
    | "hyperlipidemia_proteinuria";
  pharmacologicalMechanism: string;
  clinicalHazard: string;
  monitoringAndMitigation: string;
  literatureCitation: string;
}

export function detectTransplantCollisions(
  drugIds: string[],
  host?: HostContext,
): TransplantCollisionAlert[] {
  const normalized = drugIds.map(normalizeDrugToken);
  const alerts: TransplantCollisionAlert[] = [];

  const hasTacrolimus = normalized.some((id) =>
    ["tacrolimus", "prograf", "advagraf", "envarsus", "astagraf", "fk506"].includes(
      id,
    ),
  );
  const hasCyclosporine = normalized.some((id) =>
    ["cyclosporine", "neoral", "sandimmune", "gengraf", "csa"].includes(id),
  );
  const hasMmf = normalized.some((id) =>
    ["mycophenolate", "mycophenolate-mofetil", "cellcept", "mmf"].includes(id),
  );
  const hasEcMps = normalized.some((id) =>
    ["myfortic", "ec-mps", "ecmps", "mycophenolate-sodium"].includes(id),
  );
  const hasMycophenolate = hasMmf || hasEcMps || normalized.some((id) =>
    id.includes("mycophenolat"),
  );
  const hasAzathioprine = normalized.some((id) =>
    ["azathioprine", "imuran", "azasan", "6-mp", "mercaptopurine"].includes(id),
  );
  const hasSirolimus = normalized.some((id) =>
    ["sirolimus", "rapamune", "rapamycin"].includes(id),
  );
  const hasEverolimus = normalized.some((id) =>
    ["everolimus", "zortress", "certican", "afinitor"].includes(id),
  );
  const hasMtor = hasSirolimus || hasEverolimus;
  const hasPrednisone = normalized.some((id) =>
    ["prednisone", "deltasone", "prednisolone"].includes(id),
  );
  const hasMethylpred = normalized.some((id) =>
    ["methylprednisolone", "solu-medrol", "medrol"].includes(id),
  );
  const hasSteroid = hasPrednisone || hasMethylpred;

  // Interacting Perpetrator Detections
  const matchedAbx = normalized.filter((id) =>
    BROAD_SPECTRUM_MICROBIOME_ANTIBIOTICS.has(id),
  );
  const matchedSequestrant = normalized.filter((id) =>
    BILE_ACID_SEQUESTRANTS.has(id),
  );
  const matchedPpi = normalized.filter((id) =>
    PROTON_PUMP_INHIBITORS.has(id),
  );
  const matchedCyp3aInh = normalized.filter((id) =>
    STRONG_CYP3A_INHIBITORS.has(id),
  );
  const matchedCyp3aInd = normalized.filter((id) =>
    STRONG_CYP3A_INDUCERS.has(id),
  );
  const matchedXoInh = normalized.filter((id) =>
    XANTHINE_OXIDASE_INHIBITORS.has(id),
  );

  // 1. Cyclosporine vs Mycophenolate (MRP2 Enterohepatic Blockade & Switch Trap)
  if (hasCyclosporine && hasMycophenolate) {
    alerts.push({
      id: "csa-mrp2-mycophenolate",
      title: "Cyclosporine MRP2 Canalicular Blockade vs Mycophenolate (EHC Suppression)",
      severity: "high",
      collidingAgents: ["cyclosporine", "mycophenolate"],
      mechanismCategory: "enterohepatic_mrp2",
      pharmacologicalMechanism:
        "Cyclosporine A potently inhibits biliary canalicular MRP2 (ABCC2), blocking secretion of mycophenolic acid glucuronide (MPAG) into bile. This abolishes the secondary MPA peak (normally occurring at 6–12 h) and reduces total MPA AUC by 30% to 40% compared to tacrolimus-treated recipients. Tacrolimus does NOT inhibit MRP2.",
      clinicalHazard:
        "Subtherapeutic immunosuppression with standard MMF doses when paired with cyclosporine. CRITICAL SWITCH HAZARD: Switching from cyclosporine to tacrolimus without lowering MMF dose unleashes a 30–50% MPA AUC surge causing profound leukopenia, CMV infection, and diarrhea. Switching from tacrolimus to cyclosporine drops MPA AUC by 30–40%, triggering acute allograft rejection.",
      monitoringAndMitigation:
        "When pairing cyclosporine with MMF, target higher MMF doses (1000–1500 mg BID) or perform therapeutic drug monitoring of MPA AUC0-12 (target 30–60 mg*h/L). If converting between cyclosporine and tacrolimus, execute proactive MMF dose titration.",
      literatureCitation:
        "Kuypers DR, et al. Clin Pharmacol Ther. 2005;77(4):329-341. van Gelder T, et al. Clin Pharmacokinet. 2002;41(14):1129-1142.",
    });
  }

  // 2. Broad-Spectrum Antibiotic vs Mycophenolate (Microbiome Beta-Glucuronidase Eradication)
  if (hasMycophenolate && matchedAbx.length > 0) {
    alerts.push({
      id: "abx-microbiome-mycophenolate",
      title: "Broad-Spectrum Antibiotic Microbiome Collision vs Mycophenolate",
      severity: "critical",
      collidingAgents: ["mycophenolate", matchedAbx[0]],
      mechanismCategory: "microbiome_flora",
      pharmacologicalMechanism:
        "Broad-spectrum antibiotics (ciprofloxacin, amoxicillin-clavulanate, cephalosporins, piperacillin-tazobactam) eradicate commensal intestinal anaerobic flora (Bacteroides, Clostridium) that produce bacterial beta-glucuronidase. Without beta-glucuronidase, MPAG cannot be hydrolyzed back into active MPA, completely eliminating the secondary MPA peak (6–12 h post-dose) and reducing total 24-hr MPA AUC by 30% to 50%.",
      clinicalHazard:
        "Precipitous drop in systemic mycophenolic acid exposure during antimicrobial therapy, substantially increasing the risk of acute cellular and antibody-mediated allograft rejection.",
      monitoringAndMitigation:
        "Exercise heightened clinical vigilance for allograft dysfunction during and up to 14 days after antibiotic courses. Consider checking MPA trough or AUC levels, or temporary CNI trough target optimization. Warn against unmonitored outpatient fluoroquinolone courses.",
      literatureCitation:
        "van Gelder T, et al. Clin Pharmacokinet. 2002;41(14):1129-1142. KDIGO Kidney Transplant Guidelines 2009/2024.",
    });
  }

  // 3. Bile Acid Sequestrant vs Mycophenolate (Intraluminal Binding & Interrupted EHC)
  if (hasMycophenolate && matchedSequestrant.length > 0) {
    alerts.push({
      id: "sequestrant-mycophenolate-binding",
      title: "Bile Acid Sequestrant Intraluminal Binding vs Mycophenolate",
      severity: "high",
      collidingAgents: ["mycophenolate", matchedSequestrant[0]],
      mechanismCategory: "intraluminal_binding",
      pharmacologicalMechanism:
        "Cholestyramine, colestipol, and colesevelam bind free mycophenolic acid (MPA) and its glucuronide (MPAG) directly within the intestinal lumen, completely disrupting enterohepatic recirculation and accelerating clearance, resulting in a 40% to 50% decrease in MPA AUC.",
      clinicalHazard:
        "Severe subtherapeutic MPA exposure and acute rejection if coadministered unintentionally. (Note: Clinically exploited deliberately as a washout protocol in mycophenolate toxicity or urgent teratogenic decontamination).",
      monitoringAndMitigation:
        "Avoid concurrent use unless deliberate MPA elimination/washout is intended. If bile acid sequestrant is clinically mandated for refractory hypercholesterolemia, separate administration by at least 4 to 6 hours or switch to an alternative lipid-lowering agent.",
      literatureCitation:
        "CellCept (mycophenolate mofetil) US Prescribing Information, Genentech/Roche.",
    });
  }

  // 4. PPI vs Mycophenolate Mofetil (Gastric Dissolution Blunting; EC-MPS Spared)
  if (hasMmf && matchedPpi.length > 0) {
    alerts.push({
      id: "ppi-mmf-gastric-dissolution",
      title: "Proton Pump Inhibitor Gastric Hypochlorhydria vs Mycophenolate Mofetil (MMF)",
      severity: "moderate",
      collidingAgents: ["mycophenolate", matchedPpi[0]],
      mechanismCategory: "gastric_dissolution",
      pharmacologicalMechanism:
        "Proton pump inhibitors elevate gastric pH above 4.5–5.0. Mycophenolate Mofetil (CellCept) exhibits pH-dependent solubility requiring acidic gastric conditions for rapid dissolution, resulting in a ~30% to 50% reduction in MPA Cmax and early AUC. In contrast, Enteric-Coated Mycophenolate Sodium (EC-MPS / Myfortic) releases at neutral pH in the small intestine and is unaffected by PPIs.",
      clinicalHazard:
        "Blunted peak MPA concentrations and variable early systemic exposure, potentially compromising acute immunosuppressive coverage in early post-transplant recipients.",
      monitoringAndMitigation:
        "In patients requiring chronic PPI gastroprotection who exhibit low MPA exposure or acute rejection risk, consider converting from Mycophenolate Mofetil to Enteric-Coated Mycophenolate Sodium (EC-MPS 720 mg BID equimolar to MMF 1000 mg BID).",
      literatureCitation:
        "Kuypers DR, et al. Clin Pharmacokinet. 2005. Kofler S, et al. Am J Transplant. 2009;9(4):780-787.",
    });
  }

  // 5. mTOR Inhibitor + CNI (Competitive FKBP-12 Binding & Synergistic Nephrotoxicity)
  if (hasMtor && (hasTacrolimus || hasCyclosporine)) {
    const cniName = hasTacrolimus ? "tacrolimus" : "cyclosporine";
    const mtorName = hasSirolimus ? "sirolimus" : "everolimus";
    alerts.push({
      id: "mtor-cni-fkbp12-nephrotoxicity",
      title: "mTOR Inhibitor + CNI: Intracellular FKBP-12 Competition & Additive Nephrotoxicity",
      severity: "high",
      collidingAgents: [mtorName, cniName],
      mechanismCategory: "fkbp12_competition",
      pharmacologicalMechanism:
        "Sirolimus and Everolimus bind competitively to intracellular FKBP-12 (the exact immunophilin bound by Tacrolimus). Combined exposure produces synergistic afferent renal arteriolar vasoconstriction and tubular cell stress, significantly exacerbating CNI-induced nephrotoxicity when combined with standard-dose CNIs.",
      clinicalHazard:
        "Synergistic additive nephrotoxicity, acute allograft dysfunction, progressive decline in estimated GFR, histological chronic allograft nephropathy, and severe proteinuria.",
      monitoringAndMitigation:
        "Protocolized CNI dose reduction is mandatory when initiating an mTOR inhibitor (target tacrolimus trough 3–5 ng/mL or cyclosporine C0 50–100 ng/mL). Monitor serial serum creatinine, GFR, and urine protein-to-creatinine ratio (UPCR).",
      literatureCitation:
        "KDIGO Kidney Transplant Guidelines 2009. Nankivell BJ, et al. N Engl J Med. 2003;349(24):2326-2333.",
    });
  }

  // 6. mTOR Inhibitor Surgical Healing & Dehiscence Collision
  if (hasMtor) {
    const mtorName = hasSirolimus ? "sirolimus" : "everolimus";
    alerts.push({
      id: "mtor-surgical-wound-dehiscence",
      title: "mTOR Inhibitor Surgical Recovery Window & Wound Dehiscence Advisory",
      severity: "high",
      collidingAgents: [mtorName, "surgical-wound"],
      mechanismCategory: "surgical_wound_healing",
      pharmacologicalMechanism:
        "Inhibition of mTORC1 suppresses Vascular Endothelial Growth Factor (VEGF), fibroblast proliferation, collagen cross-linking, and angiogenesis. Administering an mTOR inhibitor within the immediate surgical recovery period causes wound dehiscence, incisional hernias, extensive lymphocele collections, and anastomotic breakdown.",
      clinicalHazard:
        "Catastrophic surgical complications: fatal bronchial anastomotic dehiscence in lung recipients; hepatic artery thrombosis (HAT) and graft loss in liver recipients (FDA Boxed Warning); symptomatic perinephric lymphoceles requiring percutaneous drainage or surgical fenestration in kidney recipients.",
      monitoringAndMitigation:
        "STRICT SURGICAL DELAY: Hold or avoid initiation of sirolimus/everolimus for at least 4 to 6 weeks post-transplantation (and >= 90 days in lung recipients) until primary surgical incisions and vascular/airway anastomoses have fully healed.",
      literatureCitation:
        "Rapamune (sirolimus) US Prescribing Information, Pfizer. King-Biggs MB, et al. J Heart Lung Transplant. 2003;22(4):444-452.",
    });
  }

  // 7. mTOR Inhibitor Hyperlipidemia & Proteinuria Monitoring Rails
  if (hasMtor) {
    const mtorName = hasSirolimus ? "sirolimus" : "everolimus";
    alerts.push({
      id: "mtor-proteinuria-hyperlipidemia-rails",
      title: "mTOR Inhibitor Metabolic & Glomerular Monitoring Rails (Lipids & Proteinuria)",
      severity: "moderate",
      collidingAgents: [mtorName, "metabolic-rails"],
      mechanismCategory: "hyperlipidemia_proteinuria",
      pharmacologicalMechanism:
        "mTORC1 inhibition blunts adipose tissue lipoprotein lipase (LPL) activity and stimulates hepatic apolipoprotein B-100 synthesis, driving marked hypertriglyceridemia and hypercholesterolemia. At the glomerulus, mTOR inhibition disrupts podocyte slit diaphragm nephrin architecture and VEGF paracrine signaling, inducing de novo or worsening proteinuria.",
      clinicalHazard:
        "Severe dyslipidemia accelerating cardiovascular morbidity; irreversible glomerular injury and accelerated allograft failure if converted in the setting of pre-existing proteinuria.",
      monitoringAndMitigation:
        "Screen fasting lipid profile prior to initiation and periodically thereafter; initiate statin therapy as indicated (watch CNI/statin CYP/OATP interactions). Verify baseline 24-hr urinary protein < 500-800 mg (or spot UPCR < 0.5-0.8 g/g); conversion is contraindicated in severe baseline proteinuria.",
      literatureCitation:
        "KDIGO Kidney Transplant Guidelines 2009. Letavernier E, et al. Am J Transplant. 2008;8(9):1810-1818.",
    });
  }

  // 8. Corticosteroid Taper & Dynamic CNI Rebound Surge
  if (hasSteroid && (hasTacrolimus || hasCyclosporine)) {
    const cniName = hasTacrolimus ? "tacrolimus" : "cyclosporine";
    const steroidName = hasPrednisone ? "prednisone" : "methylprednisolone";
    alerts.push({
      id: "steroid-taper-cni-rebound",
      title: "Dynamic CNI Rebound Surge During Corticosteroid Taper",
      severity: "high",
      collidingAgents: [steroidName, cniName],
      mechanismCategory: "corticosteroid_taper",
      pharmacologicalMechanism:
        "High-dose corticosteroids induce CYP3A4, CYP3A5, and P-gp via Pregnane X Receptor (PXR) transcription. As steroids are tapered over the weeks post-transplant, this enzyme induction resolves, decreasing intrinsic CNI clearance by 30% to 50% and causing a dynamic surge in CNI trough levels.",
      clinicalHazard:
        "Dangerous rebound CNI toxicity: acute allograft nephrotoxicity (elevated creatinine, oliguria), severe tremors, headache, neurotoxicity, hypertension, or posterior reversible encephalopathy syndrome (PRES).",
      monitoringAndMitigation:
        "Anticipate proactive CNI dose reductions during corticosteroid tapers. Perform therapeutic drug monitoring within 3 to 7 days following significant steroid dose reductions to avoid supratherapeutic trough concentrations.",
      literatureCitation:
        "Goodman & Gilman's Pharmacological Basis of Therapeutics, 14th ed. Brunet M, et al. Ther Drug Monit. 2019;41(3):261-307.",
    });
  }

  // 9. Azathioprine x Xanthine Oxidase Inhibitor (Fatal Bone Marrow Aplasia)
  if (hasAzathioprine && matchedXoInh.length > 0) {
    alerts.push({
      id: "azathioprine-xo-bone-marrow-aplasia",
      title: "FATAL COLLISION: Azathioprine + Xanthine Oxidase Inhibitor (Allopurinol / Febuxostat)",
      severity: "critical",
      collidingAgents: ["azathioprine", matchedXoInh[0]],
      mechanismCategory: "xanthine_oxidase_bone_marrow",
      pharmacologicalMechanism:
        "Azathioprine is converted to 6-mercaptopurine (6-MP). Xanthine oxidase is the primary catabolic enzyme converting 6-MP to inactive 6-thiouric acid. Coadministration of an XO inhibitor (allopurinol or febuxostat) completely blocks catabolism, shunting massive substrate into the HGPRT pathway to form 6-thioguanine nucleotides (6-TGN).",
      clinicalHazard:
        "Severe, life-threatening bone marrow aplasia: profound pancytopenia, neutropenic sepsis, and fatal systemic hemorrhage.",
      monitoringAndMitigation:
        "STRICT PRESCRIBING WARNING: Avoid combination if possible. If coadministration is clinically unavoidable, reduce azathioprine dose by 67% to 75% (i.e. to 25%–33% of standard dose) and monitor weekly complete blood counts with absolute neutrophil counts.",
      literatureCitation:
        "Imuran (azathioprine) US Prescribing Information. Relling MV, et al. Clin Pharmacol Ther. 2019;105(5):1095-1105.",
    });
  }

  // 10. CNI + Strong CYP3A4 / P-gp Inhibitor
  if ((hasTacrolimus || hasCyclosporine) && matchedCyp3aInh.length > 0) {
    const cniName = hasTacrolimus ? "tacrolimus" : "cyclosporine";
    alerts.push({
      id: "cni-strong-cyp3a-inhibitor-surge",
      title: `Strong CYP3A4/P-gp Inhibitor + ${cniName.toUpperCase()} (Toxicity Surge)`,
      severity: "critical",
      collidingAgents: [cniName, matchedCyp3aInh[0]],
      mechanismCategory: "cyp3a_perpetrator",
      pharmacologicalMechanism:
        `Strong CYP3A4 inhibitors (voriconazole, posaconazole, ketoconazole, clarithromycin, ritonavir) potently inactivate intestinal and hepatic CYP3A4, increasing ${cniName} AUC by 2- to 5-fold (or up to 10-fold with ritonavir) and prolonging elimination half-life.`,
      clinicalHazard:
        "Severe CNI toxicity: acute kidney injury, oliguria, hyperkalemia, severe neurotoxicity, seizures, and posterior reversible encephalopathy syndrome (PRES).",
      monitoringAndMitigation:
        `Proactive prospective CNI dose reduction is required upon initiating strong CYP3A inhibitors (typically empirical 60%–75% dose cut with voriconazole/posaconazole, up to 90% with ritonavir). Check CNI trough levels at day 2-3 and titrate.`,
      literatureCitation:
        "Brunet M, et al. Ther Drug Monit. 2019;41(3):261-307. KDIGO Kidney Transplant Guidelines 2009.",
    });
  }

  // 11. CNI + Strong CYP3A4 / P-gp Inducer
  if ((hasTacrolimus || hasCyclosporine) && matchedCyp3aInd.length > 0) {
    const cniName = hasTacrolimus ? "tacrolimus" : "cyclosporine";
    alerts.push({
      id: "cni-strong-cyp3a-inducer-rejection",
      title: `Strong CYP3A4/P-gp Inducer + ${cniName.toUpperCase()} (Allograft Rejection Hazard)`,
      severity: "critical",
      collidingAgents: [cniName, matchedCyp3aInd[0]],
      mechanismCategory: "cyp3a_perpetrator",
      pharmacologicalMechanism:
        `Strong CYP3A4 and P-gp inducers (rifampin, carbamazepine, phenytoin, phenobarbital, St. John's wort) profoundly accelerate hepatic and intestinal clearance of ${cniName}, slashing AUC by 60% to 80%.`,
      clinicalHazard:
        "Rapid collapse of immunosuppressive blood levels to subtherapeutic troughs, triggering acute cellular and antibody-mediated allograft rejection and graft loss.",
      monitoringAndMitigation:
        "Avoid combination if feasible. If inducer therapy is unavoidable, anticipate 2- to 4-fold increases in CNI dosing with frequent (twice-weekly) TDM trough monitoring until steady-state is re-established.",
      literatureCitation:
        "Brunet M, et al. Ther Drug Monit. 2019;41(3):261-307.",
    });
  }

  return alerts;
}

// ============================================================================
// DESK DETECTION ENGINE
// ============================================================================

export interface TransplantDeskDetection {
  hasTransplant: boolean;
  hasCni: boolean;
  hasTacrolimus: boolean;
  hasCyclosporine: boolean;
  hasAntimetabolite: boolean;
  hasMycophenolate: boolean;
  hasMmf: boolean;
  hasEcMps: boolean;
  hasAzathioprine: boolean;
  hasMtorInhibitor: boolean;
  hasSirolimus: boolean;
  hasEverolimus: boolean;
  hasCorticosteroid: boolean;
  hasPrednisone: boolean;
  hasMethylprednisolone: boolean;
  hasMicrobiomeAntibiotic: boolean;
  hasBileAcidSequestrant: boolean;
  hasPpi: boolean;
  hasCyp3aInhibitor: boolean;
  hasCyp3aInducer: boolean;
  hasXoInhibitor: boolean;
  detectedTransplantDrugIds: string[];
  detectedPerpetratorDrugIds: string[];
  presentAgents: string[];
}

/**
 * Rapid desk detection function matching solid organ transplant maintenance agents,
 * antimetabolites, mTOR inhibitors, corticosteroids, and colliding perpetrators.
 */
export function transplantOnDesk(drugIds: string[]): TransplantDeskDetection {
  const normalized = drugIds.map(normalizeDrugToken);

  const detectedTransplantDrugIds: string[] = [];
  const detectedPerpetratorDrugIds: string[] = [];
  const presentAgents: string[] = [];

  let hasTacrolimus = false;
  let hasCyclosporine = false;
  let hasMmf = false;
  let hasEcMps = false;
  let hasMycophenolate = false;
  let hasAzathioprine = false;
  let hasSirolimus = false;
  let hasEverolimus = false;
  let hasPrednisone = false;
  let hasMethylprednisolone = false;

  for (const id of normalized) {
    // CNIs
    if (CNI_DRUG_IDS.has(id)) {
      detectedTransplantDrugIds.push(id);
      if (["tacrolimus", "prograf", "advagraf", "envarsus", "astagraf", "fk506"].includes(id)) {
        hasTacrolimus = true;
      }
      if (["cyclosporine", "neoral", "sandimmune", "gengraf", "csa"].includes(id)) {
        hasCyclosporine = true;
      }
    }

    // Antimetabolites
    if (ANTIMETABOLITE_DRUG_IDS.has(id)) {
      detectedTransplantDrugIds.push(id);
      if (["mycophenolate", "mycophenolate-mofetil", "cellcept", "mmf"].includes(id)) {
        hasMmf = true;
        hasMycophenolate = true;
      }
      if (["myfortic", "ec-mps", "ecmps", "mycophenolate-sodium"].includes(id)) {
        hasEcMps = true;
        hasMycophenolate = true;
      }
      if (["mycophenolic-acid", "mpa"].includes(id)) {
        hasMycophenolate = true;
      }
      if (["azathioprine", "imuran", "azasan", "6-mp", "mercaptopurine"].includes(id)) {
        hasAzathioprine = true;
      }
    }

    // mTOR Inhibitors
    if (MTOR_INHIBITOR_DRUG_IDS.has(id)) {
      detectedTransplantDrugIds.push(id);
      if (["sirolimus", "rapamune", "rapamycin"].includes(id)) {
        hasSirolimus = true;
      }
      if (["everolimus", "zortress", "certican", "afinitor"].includes(id)) {
        hasEverolimus = true;
      }
    }

    // Corticosteroids
    if (CORTICOSTEROID_DRUG_IDS.has(id)) {
      detectedTransplantDrugIds.push(id);
      if (["prednisone", "deltasone", "prednisolone"].includes(id)) {
        hasPrednisone = true;
      }
      if (["methylprednisolone", "solu-medrol", "medrol"].includes(id)) {
        hasMethylprednisolone = true;
      }
    }

    // Perpetrators
    if (BROAD_SPECTRUM_MICROBIOME_ANTIBIOTICS.has(id)) {
      detectedPerpetratorDrugIds.push(id);
    }
    if (BILE_ACID_SEQUESTRANTS.has(id)) {
      detectedPerpetratorDrugIds.push(id);
    }
    if (PROTON_PUMP_INHIBITORS.has(id)) {
      detectedPerpetratorDrugIds.push(id);
    }
    if (STRONG_CYP3A_INHIBITORS.has(id)) {
      detectedPerpetratorDrugIds.push(id);
    }
    if (STRONG_CYP3A_INDUCERS.has(id)) {
      detectedPerpetratorDrugIds.push(id);
    }
    if (XANTHINE_OXIDASE_INHIBITORS.has(id)) {
      detectedPerpetratorDrugIds.push(id);
    }

    const pretty = DRUG_BY_ID[id]?.name ?? id;
    if (!presentAgents.includes(pretty)) {
      presentAgents.push(pretty);
    }
  }

  const hasCni = hasTacrolimus || hasCyclosporine || detectedTransplantDrugIds.some((id) => CNI_DRUG_IDS.has(id));
  const hasAntimetabolite = hasMycophenolate || hasAzathioprine || detectedTransplantDrugIds.some((id) => ANTIMETABOLITE_DRUG_IDS.has(id));
  const hasMtorInhibitor = hasSirolimus || hasEverolimus || detectedTransplantDrugIds.some((id) => MTOR_INHIBITOR_DRUG_IDS.has(id));
  const hasCorticosteroid = hasPrednisone || hasMethylprednisolone || detectedTransplantDrugIds.some((id) => CORTICOSTEROID_DRUG_IDS.has(id));

  const hasMicrobiomeAntibiotic = detectedPerpetratorDrugIds.some((id) => BROAD_SPECTRUM_MICROBIOME_ANTIBIOTICS.has(id));
  const hasBileAcidSequestrant = detectedPerpetratorDrugIds.some((id) => BILE_ACID_SEQUESTRANTS.has(id));
  const hasPpi = detectedPerpetratorDrugIds.some((id) => PROTON_PUMP_INHIBITORS.has(id));
  const hasCyp3aInhibitor = detectedPerpetratorDrugIds.some((id) => STRONG_CYP3A_INHIBITORS.has(id));
  const hasCyp3aInducer = detectedPerpetratorDrugIds.some((id) => STRONG_CYP3A_INDUCERS.has(id));
  const hasXoInhibitor = detectedPerpetratorDrugIds.some((id) => XANTHINE_OXIDASE_INHIBITORS.has(id));

  const hasTransplant =
    hasCni ||
    hasAntimetabolite ||
    hasMtorInhibitor ||
    (hasCorticosteroid && detectedTransplantDrugIds.length > 0);

  return {
    hasTransplant,
    hasCni,
    hasTacrolimus,
    hasCyclosporine,
    hasAntimetabolite,
    hasMycophenolate,
    hasMmf,
    hasEcMps,
    hasAzathioprine,
    hasMtorInhibitor,
    hasSirolimus,
    hasEverolimus,
    hasCorticosteroid,
    hasPrednisone,
    hasMethylprednisolone,
    hasMicrobiomeAntibiotic,
    hasBileAcidSequestrant,
    hasPpi,
    hasCyp3aInhibitor,
    hasCyp3aInducer,
    hasXoInhibitor,
    detectedTransplantDrugIds: Array.from(new Set(detectedTransplantDrugIds)),
    detectedPerpetratorDrugIds: Array.from(new Set(detectedPerpetratorDrugIds)),
    presentAgents,
  };
}

// ============================================================================
// TRANSPLANT REPORT GENERATOR
// ============================================================================

export interface SurgicalWoundAdvisory {
  hasMtorInhibitor: boolean;
  recommendedHoldWindowWeeks: string;
  surgicalHealingLiabilities: string[];
  organSpecificSurgicalWarnings: {
    lungBronchialDehiscenceWarning: string;
    liverHepaticArteryThrombosisWarning: string;
    kidneyLymphoceleWarning: string;
  };
}

export interface TransplantReport {
  hasTransplantTherapy: boolean;
  detection: TransplantDeskDetection;
  overallRiskTier: "critical" | "high" | "moderate" | "standard";
  quadTherapyProfile: {
    cniPresent: string[];
    antimetabolitePresent: string[];
    mtorPresent: string[];
    corticosteroidPresent: string[];
    regimenDescription: string;
  };
  collisions: TransplantCollisionAlert[];
  mpaEnterohepaticSimulation: MpaSimulationResult | null;
  cniSteroidTaperModel: SteroidTaperResult | null;
  surgicalWoundAdvisory: SurgicalWoundAdvisory | null;
  organTdmProfiles: Record<SolidOrgan, OrganTdmProfile>;
  hostVulnerabilities: {
    isCkdOrImpairedRenal: boolean;
    isPregnancyRisk: boolean;
    isGeriatric: boolean;
    phenotypeNotes: string[];
    clinicalAdvisories: string[];
  };
  regulatoryNotice: string;
  citations: readonly string[];
}

/**
 * Synthesizes the complete Solid Organ Transplant Maintenance Immunosuppression,
 * Enterohepatic Recirculation, and Clearance Collision Report.
 */
export function transplantReportOnDesk(
  drugIds: string[],
  host: HostContext = DEFAULT_HOST,
): TransplantReport {
  const detection = transplantOnDesk(drugIds);
  const collisions = detectTransplantCollisions(drugIds, host);

  // Overall risk tier
  let overallRiskTier: "critical" | "high" | "moderate" | "standard" = "standard";
  if (collisions.some((c) => c.severity === "critical")) {
    overallRiskTier = "critical";
  } else if (collisions.some((c) => c.severity === "high")) {
    overallRiskTier = "high";
  } else if (collisions.some((c) => c.severity === "moderate")) {
    overallRiskTier = "moderate";
  }

  // Quad therapy profile breakdown
  const cniPresent = detection.hasTacrolimus
    ? ["Tacrolimus"]
    : detection.hasCyclosporine
    ? ["Cyclosporine"]
    : [];
  const antimetabolitePresent = detection.hasMmf
    ? ["Mycophenolate Mofetil"]
    : detection.hasEcMps
    ? ["Enteric-Coated Mycophenolate Sodium"]
    : detection.hasAzathioprine
    ? ["Azathioprine"]
    : [];
  const mtorPresent = detection.hasSirolimus
    ? ["Sirolimus"]
    : detection.hasEverolimus
    ? ["Everolimus"]
    : [];
  const corticosteroidPresent = detection.hasPrednisone
    ? ["Prednisone"]
    : detection.hasMethylprednisolone
    ? ["Methylprednisolone"]
    : [];

  let regimenDescription = "Incomplete or non-transplant regimen";
  if (cniPresent.length > 0 && antimetabolitePresent.length > 0 && corticosteroidPresent.length > 0) {
    regimenDescription = "Standard Triple Therapy (CNI + Antimetabolite + Corticosteroid)";
  } else if (cniPresent.length > 0 && mtorPresent.length > 0) {
    regimenDescription = "CNI-Sparing Dual Therapy (CNI + mTOR Inhibitor)";
  } else if (mtorPresent.length > 0 && antimetabolitePresent.length > 0) {
    regimenDescription = "CNI-Free Immunosuppression (mTOR Inhibitor + Antimetabolite)";
  } else if (cniPresent.length > 0 && antimetabolitePresent.length > 0) {
    regimenDescription = "Steroid-Free Dual Maintenance (CNI + Antimetabolite)";
  }

  // MPA enterohepatic simulation
  let mpaEnterohepaticSimulation: MpaSimulationResult | null = null;
  if (detection.hasMycophenolate) {
    const formulation = detection.hasEcMps ? "ec-mps" : "mmf";
    const doseMg = detection.hasEcMps ? 720 : 1000;
    const cniPerpetrator = detection.hasCyclosporine
      ? "cyclosporine"
      : detection.hasTacrolimus
      ? "tacrolimus"
      : "none";

    mpaEnterohepaticSimulation = simulateMpaEnterohepaticKinetics({
      formulation,
      doseMg,
      cniPerpetrator,
      antibioticActive: detection.hasMicrobiomeAntibiotic,
      cholestyramineActive: detection.hasBileAcidSequestrant,
      ppiActive: detection.hasPpi,
    });
  }

  // CNI steroid taper model
  let cniSteroidTaperModel: SteroidTaperResult | null = null;
  if (detection.hasCni && detection.hasCorticosteroid) {
    const cniAgent = detection.hasTacrolimus ? "tacrolimus" : "cyclosporine";
    const baselineTrough = cniAgent === "tacrolimus" ? 8.0 : 150.0;
    cniSteroidTaperModel = simulateCniSteroidTaper({
      cniAgent,
      currentCniTroughNgMl: baselineTrough,
      initialPrednisoneDoseMg: 20.0,
      taperedPrednisoneDoseMg: 5.0,
    });
  }

  // Surgical wound advisory
  let surgicalWoundAdvisory: SurgicalWoundAdvisory | null = null;
  if (detection.hasMtorInhibitor) {
    surgicalWoundAdvisory = {
      hasMtorInhibitor: true,
      recommendedHoldWindowWeeks: "Hold for >= 4 to 6 weeks post-transplantation (>= 90 days in lung allografts)",
      surgicalHealingLiabilities: [
        "Inhibition of VEGF suppresses capillary sprouting, granulation tissue formation, and endothelial re-epithelialization.",
        "Fibroblast proliferation and collagen deposition are inhibited, causing fascial dehiscence, incisional hernias, and chronic seromas.",
        "Lymphatic leak closure is delayed, predisposing to large perinephric or pelvic lymphoceles.",
      ],
      organSpecificSurgicalWarnings: {
        lungBronchialDehiscenceWarning:
          "STRICT CONTRAINDICATION in early lung transplantation (<90 days post-op): Fatal bronchial anastomotic necrosis and airway dehiscence have been documented.",
        liverHepaticArteryThrombosisWarning:
          "FDA BOXED WARNING in liver transplantation: Early sirolimus use (<30 days post-op) causes fatal hepatic artery thrombosis (HAT), graft loss, and excess mortality.",
        kidneyLymphoceleWarning:
          "High incidence of large perigraft lymphoceles compressing the ureter or iliac vessels, frequently requiring percutaneous drainage or surgical peritoneal fenestration.",
      },
    };
  }

  // Host vulnerabilities
  const hostVulnerabilities: TransplantReport["hostVulnerabilities"] = {
    isCkdOrImpairedRenal: host.kidney === "ckd",
    isPregnancyRisk: host.preg === "pregnant" || host.preg === "lactating",
    isGeriatric: host.age === "geriatric",
    phenotypeNotes: [],
    clinicalAdvisories: [],
  };

  if (host.kidney === "ckd") {
    hostVulnerabilities.clinicalAdvisories.push(
      "Baseline renal impairment / CKD: Heightened vulnerability to CNI-induced pre-glomerular afferent arteriolar vasoconstriction and ischemic tubular injury. Consider early CNI-minimization protocols or antimetabolite/mTOR conversion strategies.",
    );
  }

  if (hostVulnerabilities.isPregnancyRisk) {
    if (detection.hasMycophenolate) {
      hostVulnerabilities.clinicalAdvisories.push(
        "CRITICAL TERATOGENICITY: Mycophenolate carries an FDA Boxed Warning for first-trimester embryofetal toxicity, congenital ear/facial/cardiac malformations, and high spontaneous abortion rate (45%). Strictly contraindicated in pregnancy; mandatory conversion to Azathioprine at least 6-12 weeks prior to planned conception.",
      );
    }
    if (detection.hasMtorInhibitor) {
      hostVulnerabilities.clinicalAdvisories.push(
        "mTOR inhibitors are contraindicated during pregnancy due to embryo-fetal toxicity.",
      );
    }
  }

  if (host.age === "geriatric") {
    hostVulnerabilities.clinicalAdvisories.push(
      "Geriatric transplant recipient (age >= 65): Increased susceptibility to opportunistic over-immunosuppression (CMV, PJP, invasive fungal disease), CNI neurotoxicity (tremor, encephalopathy), steroid-induced bone loss and hyperglycemia, and malignancy.",
    );
  }

  // Pharmacogenomic baseline review
  if (host.phenotypes) {
    if (detection.hasTacrolimus) {
      hostVulnerabilities.phenotypeNotes.push(
        "Tacrolimus is primarily cleared by CYP3A4 and CYP3A5. Patients with CYP3A5*1 expresser status require 1.5- to 2-fold higher doses to achieve target trough compared to CYP3A5*3/*3 non-expressers.",
      );
    }
    if (detection.hasAzathioprine) {
      hostVulnerabilities.phenotypeNotes.push(
        "Azathioprine myelosuppression risk is critically dictated by TPMT and NUDT15 genotypes. Intermediate or poor metabolizers require 50% to 90% dose reduction to prevent severe cytopenias.",
      );
    }
  }

  return {
    hasTransplantTherapy: detection.hasTransplant,
    detection,
    overallRiskTier,
    quadTherapyProfile: {
      cniPresent,
      antimetabolitePresent,
      mtorPresent,
      corticosteroidPresent,
      regimenDescription,
    },
    collisions,
    mpaEnterohepaticSimulation,
    cniSteroidTaperModel,
    surgicalWoundAdvisory,
    organTdmProfiles: SOLID_ORGAN_TDM_PROFILES,
    hostVulnerabilities,
    regulatoryNotice: TRANSPLANT_CDS_REGULATORY_NOTICE,
    citations: TRANSPLANT_LITERATURE_CITATIONS,
  };
}
