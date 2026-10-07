/**
 * Renal Tubular Acidification, Secretion & Diuretic Segmental Pharmacology Engine
 *
 * FD&C Act § 520(o)(1)(E) Regulatory Posture:
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations of nephron segmental solute
 * transport, transepithelial electrochemical potentials, tubular acidification, and
 * diuretic segmental pharmacology to enable licensed healthcare professionals and
 * trainees to independently analyze renal handling and drug collisions. It does not
 * provide patient-specific dosing directives, treatment orders, or diagnostic determinations.
 * References: Goodman & Gilman's Pharmacological Basis of Therapeutics (14th ed.),
 * Brenner and Rector's The Kidney (11th ed.), and peer-reviewed nephrology literature.
 */

import { DRUG_BY_ID } from "./catalog";

// Ensure hydrochlorothiazide alias is established for catalog lookup
if (DRUG_BY_ID["hctz"] && !DRUG_BY_ID["hydrochlorothiazide"]) {
  DRUG_BY_ID["hydrochlorothiazide"] = DRUG_BY_ID["hctz"];
}

export const RENAL_MECHANISMS_REGULATORY_DISCLAIMER =
  "FirstPass Renal Tubular Acidification, Secretion & Diuretic Segmental Pharmacology Engine is an educational clinical pharmacology reference under Section 520(o)(1)(E) of the Federal Food, Drug, and Cosmetic Act (FD&C Act § 520(o)(1)(E)). It provides non-prescriptive educational decision-support describing nephron segmental transport physiology, solute carrier mechanics, electrochemical ion gradients, diuretic classes, and pharmacokinetic-pharmacodynamic tubular interactions based on peer-reviewed nephrology and molecular pharmacology literature. It does not provide medical diagnoses, treatment directives, or patient-specific dosing directives. Clinicians must consult full FDA-approved prescribing information and exercise independent clinical judgment.";

export const RENAL_MECHANISMS_CITATIONS: readonly string[] = [
  "Reilly RF, Jackson EK. Chapter 25: Regulation of volume and osmolality of the extracellular fluid. In: Brunton LL, Knollmann BC, eds. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
  "Ellison DH. Clinical use of diuretics in heart failure: Considerations on resistance and sequential nephron blockade. Semin Nephrol. 2011;31(6):538-552. doi:10.1016/j.semnephrol.2011.09.006.",
  "Mount DB. Thick ascending limb of the loop of Henle. Clin J Am Soc Nephrol. 2014;9(11):1974-1986. doi:10.2215/CJN.04480413.",
  "Subramanya AR, Ellison DH. Distal convoluted tubule. Clin J Am Soc Nephrol. 2014;9(12):2147-2163. doi:10.2215/CJN.05920613.",
  "Palmer BF, Clegg DJ. Physiology and pathophysiology of potassium homeostasis. Adv Physiol Educ. 2016;40(4):480-490. doi:10.1152/advan.00121.2016.",
  "Hamm LL, Nakhoul N, Hering-Smith KS. Acid-Base Homeostasis. Clin J Am Soc Nephrol. 2015;10(12):2232-2242. doi:10.2215/CJN.07400715.",
  "Loffing J, Korbmacher C. Regulated sodium transport in the renal connecting tubule (CNT) and cortical collecting duct (CCD). Curr Opin Nephrol Hypertens. 2009;18(5):409-415. doi:10.1097/MNH.0b013e32832f57b6.",
  "Bedford LE, et al. Lithium-induced nephrogenic diabetes insipidus: Pathophysiology and amiloride rescue. Kidney Int. 2008;74(1):28-36. doi:10.1038/ki.2008.92.",
  "Loboz KK, Shenfield GM. Drug-induced acute kidney injury: The 'triple whammy'. Br J Clin Pharmacol. 2005;59(2):239-243. doi:10.1111/j.1365-2125.2004.02188.x.",
];

export type NephronSegmentId =
  | "pct"
  | "tal"
  | "dct"
  | "ccd-principal"
  | "ccd-intercalated";

export type MembraneDomain = "apical" | "basolateral" | "paracellular";

export type TransportDirection =
  | "reabsorption"
  | "secretion"
  | "back-leak"
  | "efflux"
  | "influx";

export interface NephronTransporter {
  id: string;
  name: string;
  gene: string;
  aliases: string[];
  segmentId: NephronSegmentId;
  membrane: MembraneDomain;
  direction: TransportDirection;
  solutes: string[];
  stoichiometry: string;
  drivingForce: string;
  physiologicalRole: string;
  inhibitedByDrugIds: string[];
  stimulatedBy?: string[];
  clinicalRelevance: string;
}

export interface SegmentDrugTarget {
  drugClass: string;
  targetMolecule: string;
  representativeDrugIds: string[];
  mechanismSummary: string;
  electrolyteConsequences: {
    sodium: string;
    potassium: string;
    calcium: string;
    magnesium: string;
    chloride: string;
    bicarbonateAndAcidBase: string;
    urinePh: string;
  };
  monitoredParameters: string[];
}

export interface NephronSegment {
  id: NephronSegmentId;
  name: string;
  shortName: string;
  anatomicalZone: "Renal Cortex" | "Outer Medulla" | "Inner Medulla";
  transepithelialPotential: string;
  waterPermeability: string;
  fractionalSodiumReabsorption: string;
  primaryTransporters: NephronTransporter[];
  keyPhysiologicalMechanisms: string[];
  pharmacologicalTargets: SegmentDrugTarget[];
  tubularFluidComposition: {
    entryOsmolality: string;
    exitOsmolality: string;
    phChange: string;
  };
  clinicalPearls: string[];
}

export type DiureticClassId =
  | "ca-inhibitors"
  | "loop-diuretics"
  | "thiazides"
  | "potassium-sparing-enac"
  | "potassium-sparing-mra"
  | "sglt2-inhibitors"
  | "v2-antagonists";

export interface DiureticClassProfile {
  id: DiureticClassId;
  className: string;
  tubularSite: string;
  segmentId: NephronSegmentId;
  molecularTarget: string;
  representativeDrugIds: string[];
  fractionalSodiumExcretion: string;
  calciumEffect: string;
  calciumMechanism: string;
  magnesiumEffect: string;
  magnesiumMechanism: string;
  potassiumEffect: string;
  potassiumMechanism: string;
  acidBaseEffect: string;
  urinePhEffect: string;
  clinicalIndications: string[];
  highYieldBoardPearls: string[];
  monitoredParameters: string[];
}

export type RenalCollisionSeverity = "critical" | "high" | "moderate" | "synergistic-clinical";

export interface RenalCollision {
  id: string;
  title: string;
  severity: RenalCollisionSeverity;
  summary: string;
  mechanismsInvolved: {
    afferentArteriole?: string;
    efferentArteriole?: string;
    tubularTransport: string;
    hormonalResponse: string;
    hemodynamicConsequence: string;
  };
  triggerDrugClasses: string[];
  interactingDrugIds: string[];
  pathophysiologyDetail: string;
  clinicalRisks: string[];
  monitoredParameters: string[];
  mitigationPhysiology: string;
  literatureCitation: string;
}

// ============================================================================
// 1. NEPHRON TRANSPORTERS DATABASE
// ============================================================================

export const NEPHRON_TRANSPORTERS: readonly NephronTransporter[] = [
  // --- Proximal Convoluted Tubule (PCT) ---
  {
    id: "sglt2",
    name: "SGLT2 (Sodium-Glucose Cotransporter 2)",
    gene: "SLC5A2",
    aliases: ["SLC5A2", "SGLT-2"],
    segmentId: "pct",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["Na+", "Glucose"],
    stoichiometry: "1 Na+ : 1 Glucose",
    drivingForce: "Transmembrane Na+ chemical gradient created by basolateral Na+/K+ ATPase",
    physiologicalRole: "Responsible for high-capacity, low-affinity reabsorption of ~90% of filtered glucose in the early S1/S2 segments of the PCT.",
    inhibitedByDrugIds: ["empagliflozin", "dapagliflozin", "canagliflozin"],
    clinicalRelevance: "SGLT2 inhibitors block glucose and sodium reabsorption in the PCT. The increased distal delivery of sodium to the macula densa restores tubuloglomerular feedback (TGF), inducing afferent arteriolar constriction and mitigating intraglomerular hyperfiltration, providing nephroprotective and cardioprotective benefits.",
  },
  {
    id: "ca-iv-ii",
    name: "Carbonic Anhydrase II & IV (CA II / CA IV)",
    gene: "CA2 / CA4",
    aliases: ["CA II", "CA IV", "Carbonic Anhydrase"],
    segmentId: "pct",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["H+", "HCO3-", "CO2"],
    stoichiometry: "Equilibrium catalytic hydration/dehydration (CO2 + H2O <-> H2CO3 <-> H+ + HCO3-)",
    drivingForce: "Catalytic acceleration of CO2 and carbonic acid equilibrium across apical brush border (CA IV) and intracellular cytoplasm (CA II)",
    physiologicalRole: "Apical CA IV dehydrates luminal H2CO3 to CO2 and H2O. CO2 diffuses into the proximal cell where cytoplasmic CA II rehydrates it to H+ and HCO3-. H+ is extruded via NHE3 to drive further HCO3- reclamation, while HCO3- exits basolaterally via NBCe1.",
    inhibitedByDrugIds: ["acetazolamide"],
    clinicalRelevance: "Inhibition by acetazolamide blocks proximal proton recycling, resulting in profound bicarbonaturia (alkaline urine, pH > 7.5), secondary sodium wasting, and hyperchloremic non-anion gap metabolic acidosis. Used for altitude sickness (stimulates respiratory drive) and metabolic alkalosis correction.",
  },
  {
    id: "nhe3",
    name: "NHE3 (Sodium-Hydrogen Exchanger 3)",
    gene: "SLC9A3",
    aliases: ["SLC9A3", "Na+/H+ antiporter 3"],
    segmentId: "pct",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["Na+ (in)", "H+ (out)"],
    stoichiometry: "1 Na+ (reabsorbed) : 1 H+ (secreted)",
    drivingForce: "Steep basolateral-driven inward Na+ concentration gradient",
    physiologicalRole: "Principal driver of proximal sodium and fluid reabsorption, accounting for ~60% of all filtered Na+ entry into PCT cells. Pumps protons into the lumen to titrate filtered bicarbonate.",
    inhibitedByDrugIds: ["acetazolamide"],
    stimulatedBy: ["Angiotensin II", "Endothelin-1", "Sympathetic nervous system"],
    clinicalRelevance: "Stimulated strongly by angiotensin II and sympathetic tone during volume contraction; indirectly shut down by carbonic anhydrase inhibitors due to intracellular proton depletion.",
  },
  {
    id: "oat1-3",
    name: "OAT1 & OAT3 (Organic Anion Transporters 1 and 3)",
    gene: "SLC22A6 / SLC22A8",
    aliases: ["SLC22A6", "SLC22A8", "OAT1", "OAT3"],
    segmentId: "pct",
    membrane: "basolateral",
    direction: "secretion",
    solutes: ["Organic Anions", "Alpha-Ketoglutarate"],
    stoichiometry: "1 Organic Anion (inward) : 1 Alpha-Ketoglutarate (outward)",
    drivingForce: "Tertiary active transport: driven by outward dicarboxylate gradient maintained by sodium-dicarboxylate cotransporters (NaDC3)",
    physiologicalRole: "Extracts endogenous anions (urate, prostaglandins) and acidic drugs from peritubular capillaries into proximal tubular cells for subsequent luminal extrusion.",
    inhibitedByDrugIds: ["probenecid", "furosemide", "hydrochlorothiazide"],
    clinicalRelevance: "Crucial pathway for loop and thiazide diuretics to reach the tubular lumen where their luminal target transporters (NKCC2, NCC) reside. Probenecid competitively inhibits OAT1/3, reducing diuretic delivery to the tubular lumen and extending beta-lactam half-life.",
  },
  {
    id: "oct2",
    name: "OCT2 (Organic Cation Transporter 2)",
    gene: "SLC22A2",
    aliases: ["SLC22A2", "OCT2"],
    segmentId: "pct",
    membrane: "basolateral",
    direction: "secretion",
    solutes: ["Organic Cations", "Creatinine"],
    stoichiometry: "Facilitated electrogenic cation uptake",
    drivingForce: "Inside-negative membrane potential (-70 mV)",
    physiologicalRole: "Mediates basolateral influx of positively charged organic cations, including endogenous creatinine and xenobiotics, into proximal tubular cells.",
    inhibitedByDrugIds: ["cimetidine"],
    clinicalRelevance: "Transports metformin and creatinine. Cimetidine inhibits OCT2, causing a benign, non-GFR elevation in serum creatinine by blocking tubular secretion.",
  },

  // --- Thick Ascending Limb (TAL) ---
  {
    id: "nkcc2",
    name: "NKCC2 (Sodium-Potassium-Chloride Cotransporter 2)",
    gene: "SLC12A1",
    aliases: ["SLC12A1", "NKCC2", "Bumetanide-sensitive cotransporter"],
    segmentId: "tal",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["Na+", "K+", "2 Cl-"],
    stoichiometry: "1 Na+ : 1 K+ : 2 Cl- (electroneutral)",
    drivingForce: "Transmembrane inward Na+ gradient created by basolateral Na+/K+ ATPase",
    physiologicalRole: "Mediates reabsorption of ~25% of filtered NaCl in the thick ascending limb. Coupled with apical ROMK K+ recycling, it drives the corticomedullary osmotic gradient for urinary concentration.",
    inhibitedByDrugIds: ["furosemide", "torsemide", "bumetanide"],
    clinicalRelevance: "Pharmacologic target of loop diuretics. Inhibition disrupts the +10 mV lumen-positive potential, abolishing paracellular divalent cation reabsorption (causing hypercalciuria and hypomagnesemia) and producing massive natriuresis ('high-ceiling' diuresis).",
  },
  {
    id: "romk-tal",
    name: "ROMK (Renal Outer Medullary Potassium Channel) - TAL",
    gene: "KCNJ1",
    aliases: ["KCNJ1", "Kir1.1", "ROMK"],
    segmentId: "tal",
    membrane: "apical",
    direction: "back-leak",
    solutes: ["K+"],
    stoichiometry: "Electrogenic K+ channel efflux",
    drivingForce: "Favorable outward K+ electrochemical gradient",
    physiologicalRole: "Recycles reabsorbed K+ back across the apical membrane into the tubular lumen to prevent luminal K+ depletion for NKCC2 and generate a transepithelial +10 mV lumen-positive charge.",
    inhibitedByDrugIds: [],
    clinicalRelevance: "The +10 mV lumen-positive potential created by ROMK K+ back-leak provides the essential thermodynamic driving force for paracellular reabsorption of Ca2+ and Mg2+ across claudin-16/19 tight junctions.",
  },
  {
    id: "claudin-16-19",
    name: "Claudin-16 & Claudin-19 Tight Junction Complex",
    gene: "CLDN16 / CLDN19",
    aliases: ["Paracellin-1", "CLDN16", "CLDN19"],
    segmentId: "tal",
    membrane: "paracellular",
    direction: "reabsorption",
    solutes: ["Ca2+", "Mg2+"],
    stoichiometry: "Passive paracellular divalent cation flux",
    drivingForce: "+10 mV transepithelial lumen-positive potential generated by apical ROMK and basolateral CLC-Kb",
    physiologicalRole: "Permits paracellular reabsorption of ~60% of filtered magnesium and ~20-25% of filtered calcium in the TAL.",
    inhibitedByDrugIds: ["furosemide", "torsemide", "bumetanide"],
    clinicalRelevance: "Loop diuretics indirectly inactivate this pathway by collapsing the transepithelial voltage, resulting in profound urinary wasting of Ca2+ (hypercalciuria, causing hypocalcemia risk) and Mg2+ (hypomagnesemia).",
  },

  // --- Distal Convoluted Tubule (DCT) ---
  {
    id: "ncc",
    name: "NCC (Sodium-Chloride Cotransporter)",
    gene: "SLC12A3",
    aliases: ["SLC12A3", "NCCT", "Thiazide-sensitive cotransporter"],
    segmentId: "dct",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["Na+", "Cl-"],
    stoichiometry: "1 Na+ : 1 Cl- (electroneutral)",
    drivingForce: "Transmembrane inward Na+ gradient created by basolateral Na+/K+ ATPase",
    physiologicalRole: "Mediates reabsorption of 5-7% of filtered sodium in the early and late DCT. Water-impermeable segment continuing tubular fluid dilution.",
    inhibitedByDrugIds: ["hydrochlorothiazide", "chlorthalidone", "metolazone"],
    clinicalRelevance: "Target of thiazide and thiazide-like diuretics. Inhibition lowers intracellular sodium, which dramatically steepens the basolateral electrochemical gradient driving NCX1 (Na+/Ca2+ exchanger), promoting active calcium reabsorption (hypocalciuria, mild hypercalcemia).",
  },
  {
    id: "trpv5",
    name: "TRPV5 (Transient Receptor Potential Vanilloid 5)",
    gene: "TRPV5",
    aliases: ["ECaC1", "CAT2", "TRPV5"],
    segmentId: "dct",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["Ca2+"],
    stoichiometry: "Passive, highly selective Ca2+ entry channel",
    drivingForce: "Steep inward electrochemical calcium gradient (intracellular Ca2+ is ~100 nM vs luminal ~1 mM, with negative cell membrane potential)",
    physiologicalRole: "Apical gatekeeper for active transcellular calcium reabsorption in the DCT.",
    inhibitedByDrugIds: [],
    stimulatedBy: ["Parathyroid Hormone (PTH)", "1,25-Dihydroxyvitamin D3", "Klotho"],
    clinicalRelevance: "Thiazide inhibition of NCC hyperpolarizes the apical membrane and lowers intracellular Na+, enhancing apical Ca2+ entry via TRPV5. This renders thiazides hypocalciuric, protecting against recurrent calcium kidney stones.",
  },
  {
    id: "ncx1-dct",
    name: "NCX1 (Sodium-Calcium Exchanger 1) - DCT",
    gene: "SLC8A1",
    aliases: ["SLC8A1", "NCX1"],
    segmentId: "dct",
    membrane: "basolateral",
    direction: "reabsorption",
    solutes: ["3 Na+ (in)", "1 Ca2+ (out)"],
    stoichiometry: "3 Na+ : 1 Ca2+ (electrogenic)",
    drivingForce: "Steep basolateral inward Na+ chemical gradient created by Na+/K+ ATPase",
    physiologicalRole: "Extrudes reabsorbed calcium across the basolateral membrane into peritubular capillaries, completing active transcellular calcium reclamation in the DCT.",
    inhibitedByDrugIds: [],
    clinicalRelevance: "When thiazides block apical NCC, intracellular Na+ drops, steepening the driving force for NCX1 to extrude Ca2+ into blood while pulling Na+ into the cell, resulting in net systemic calcium retention.",
  },

  // --- Cortical Collecting Duct - Principal Cells (CCD-PC) ---
  {
    id: "enac",
    name: "ENaC (Epithelial Sodium Channel)",
    gene: "SCNN1A / SCNN1B / SCNN1G",
    aliases: ["SCNN1A", "SCNN1B", "SCNN1G", "ENaC", "Amiloride-sensitive Na+ channel"],
    segmentId: "ccd-principal",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["Na+"],
    stoichiometry: "Electrogenic Na+ channel influx",
    drivingForce: "Strong inward electrochemical gradient (-70 mV inside cell, low intracellular Na+)",
    physiologicalRole: "Reabsorbs the final 2-3% of filtered sodium. Because Na+ enters without a co-transported anion, this electrogenic influx generates a substantial transepithelial lumen-negative potential (-10 to -35 mV).",
    inhibitedByDrugIds: ["amiloride", "triamterene"],
    stimulatedBy: ["Aldosterone (via SGK1 / Nedd4-2 phosphorylation)"],
    clinicalRelevance: "Blocked by amiloride and triamterene. Eliminating electrogenic Na+ reabsorption collapses the lumen-negative charge, which eliminates the electrical driving force for ROMK K+ secretion, preserving potassium (potassium-sparing effect). Crucially, lithium enters principal cells almost exclusively via ENaC.",
  },
  {
    id: "mr-aldosterone",
    name: "Mineralocorticoid Receptor (MR Axis)",
    gene: "NR3C2",
    aliases: ["NR3C2", "Aldosterone Receptor", "MR"],
    segmentId: "ccd-principal",
    membrane: "basolateral",
    direction: "reabsorption",
    solutes: ["Aldosterone signaling cascade"],
    stoichiometry: "Nuclear steroid transcription factor",
    drivingForce: "Lipophilic ligand diffusion across basolateral membrane",
    physiologicalRole: "Binds aldosterone, translocates to nucleus, and upregulates SGK1 (which phosphorylates and inhibits Nedd4-2, preventing ENaC ubiquitination/degradation) and stimulates basolateral Na+/K+ ATPase expression.",
    inhibitedByDrugIds: ["spironolactone", "eplerenone"],
    clinicalRelevance: "Target of mineralocorticoid receptor antagonists (MRAs). Antagonism downregulates apical ENaC channels and basolateral Na+/K+ pumps, reducing sodium retention, preventing potassium excretion, and blunting proton excretion.",
  },
  {
    id: "romk-ccd",
    name: "ROMK (Renal Outer Medullary Potassium Channel) - CCD",
    gene: "KCNJ1",
    aliases: ["KCNJ1", "Kir1.1", "Secretory K+ Channel"],
    segmentId: "ccd-principal",
    membrane: "apical",
    direction: "secretion",
    solutes: ["K+"],
    stoichiometry: "Electrogenic K+ secretion",
    drivingForce: "Transepithelial lumen-negative electrical potential (-10 to -35 mV) generated by ENaC",
    physiologicalRole: "Primary channel for physiological potassium secretion into urine. Regulated by aldosterone, tubular flow rate, and extracellular potassium concentration.",
    inhibitedByDrugIds: [],
    clinicalRelevance: "Loop and thiazide diuretics increase fluid and sodium delivery to the CCD, boosting ENaC activity, deepening lumen negativity, and markedly accelerating ROMK K+ secretion (driving severe hypokalemia).",
  },
  {
    id: "v2r-aqp2",
    name: "V2 Vasopressin Receptor & Aquaporin-2 (V2R / AQP2 Axis)",
    gene: "AVPR2 / AQP2",
    aliases: ["AVPR2", "AQP2", "Vasopressin V2 Receptor", "Aquaporin 2"],
    segmentId: "ccd-principal",
    membrane: "apical",
    direction: "reabsorption",
    solutes: ["H2O"],
    stoichiometry: "Passive osmotic water flux through tetrameric water channels",
    drivingForce: "Transmedullary interstitial osmotic gradient generated by TAL countercurrent multiplication",
    physiologicalRole: "Vasopressin binds basolateral Gs-coupled V2 receptors, raising intracellular cAMP via adenylate cyclase, activating PKA, and inducing exocytic insertion of AQP2-containing vesicles into the apical membrane.",
    inhibitedByDrugIds: ["tolvaptan"],
    stimulatedBy: ["desmopressin"],
    clinicalRelevance: "Tolvaptan blocks V2R, inducing aquaresis (free water excretion without electrolyte loss) for euvolemic/hypervolemic hyponatremia. Desmopressin activates V2R for central DI. Chronic lithium therapy downregulates AQP2 transcription and apical membrane trafficking via GSK3-beta inhibition, causing nephrogenic diabetes insipidus.",
  },

  // --- Cortical Collecting Duct - Intercalated Cells (Alpha & Beta) ---
  {
    id: "h-atpase-alpha",
    name: "Vacuolar H+-ATPase (Alpha Intercalated Cell)",
    gene: "ATP6V1B1 / ATP6V0A4",
    aliases: ["Proton Pump", "H+-ATPase", "Vacuolar ATPase"],
    segmentId: "ccd-intercalated",
    membrane: "apical",
    direction: "secretion",
    solutes: ["H+"],
    stoichiometry: "Primary active proton pump (ATP-dependent)",
    drivingForce: "Direct ATP hydrolysis against steep proton concentration gradients (can achieve urine pH down to 4.5)",
    physiologicalRole: "Directly extrudes protons into the tubular lumen for urinary acidification and net acid excretion (titrating luminal phosphate and ammonia buffers). Coupled to basolateral AE1 (Band 3) HCO3- extrusion.",
    inhibitedByDrugIds: [],
    stimulatedBy: ["Aldosterone", "Lumen-negative transepithelial potential", "Intracellular acidosis"],
    clinicalRelevance: "Stimulated by aldosterone. Aldosterone excess drives hypersecretion of protons, leading to metabolic alkalosis. Conversely, hypoaldosteronism or MRA therapy impairs proton pumping, resulting in Type 4 renal tubular acidosis (hyperkalemic metabolic acidosis).",
  },
  {
    id: "h-k-atpase-alpha",
    name: "Apical H+/K+-ATPase (Alpha Intercalated Cell)",
    gene: "ATP4A / ATP12A",
    aliases: ["Colonic/Gastric H+/K+-ATPase in Kidney"],
    segmentId: "ccd-intercalated",
    membrane: "apical",
    direction: "secretion",
    solutes: ["H+ (out)", "K+ (in)"],
    stoichiometry: "1 H+ (secreted) : 1 K+ (reabsorbed) per ATP",
    drivingForce: "Direct ATP hydrolysis",
    physiologicalRole: "Upregulated during severe systemic potassium depletion to reclaim filtered potassium at the expense of accelerated proton extrusion into the urine.",
    inhibitedByDrugIds: [],
    clinicalRelevance: "Contributes to the generation and maintenance of contraction alkalosis and severe diuretic-induced hypokalemia: as the kidney attempts to conserve K+, it pumps more H+ into urine, aggravating metabolic alkalosis.",
  },
  {
    id: "ae1-alpha",
    name: "Basolateral Anion Exchanger 1 (AE1 / Band 3)",
    gene: "SLC4A1",
    aliases: ["SLC4A1", "AE1", "Band 3", "Cl-/HCO3- Exchanger"],
    segmentId: "ccd-intercalated",
    membrane: "basolateral",
    direction: "reabsorption",
    solutes: ["HCO3- (out)", "Cl- (in)"],
    stoichiometry: "1 HCO3- (reabsorbed into blood) : 1 Cl- (into cell)",
    drivingForce: "Electroneutral exchange down intracellular HCO3- concentration gradient",
    physiologicalRole: "Transports newly regenerated bicarbonate generated by cytoplasmic CA II across the basolateral membrane into the systemic circulation, replenishing the systemic alkali reserve.",
    inhibitedByDrugIds: [],
    clinicalRelevance: "Loss-of-function mutations or drug toxicities cause Classic Distal (Type 1) RTA, characterized by failure to acidify urine (urine pH > 5.5 in metabolic acidosis) and nephrocalcinosis.",
  },
  {
    id: "pendrin-beta",
    name: "Pendrin (Beta Intercalated Cell Cl-/HCO3- Exchanger)",
    gene: "SLC26A4",
    aliases: ["SLC26A4", "Pendrin"],
    segmentId: "ccd-intercalated",
    membrane: "apical",
    direction: "secretion",
    solutes: ["HCO3- (secreted into lumen)", "Cl- (reabsorbed into cell)"],
    stoichiometry: "1 Cl- (in) : 1 HCO3- (out)",
    drivingForce: "Electroneutral anion exchange dependent on luminal chloride concentration",
    physiologicalRole: "Secretes bicarbonate into urine during systemic metabolic alkalosis in exchange for luminal chloride reabsorption.",
    inhibitedByDrugIds: [],
    clinicalRelevance: "Requires luminal chloride to function. In diuretic-induced hypochloremia (such as loop or thiazide overuse), lack of luminal chloride halts Pendrin function, preventing bicarbonate excretion and locking in 'chloride-responsive' contraction alkalosis.",
  },
];

// ============================================================================
// 2. FIVE NEPHRON SEGMENTS PHYSIOLOGY & PHARMACOLOGY
// ============================================================================

export const NEPHRON_SEGMENTS: readonly NephronSegment[] = [
  {
    id: "pct",
    name: "Proximal Convoluted Tubule (PCT)",
    shortName: "PCT",
    anatomicalZone: "Renal Cortex",
    transepithelialPotential: "-2 to -4 mV lumen-negative (early S1) shifting to +1 to +2 mV lumen-positive (late S3)",
    waterPermeability: "High (Constitutive AQP1 - Isosmotic reabsorption)",
    fractionalSodiumReabsorption: "65% of filtered Na+, Cl-, and H2O; 85-90% of filtered HCO3-",
    primaryTransporters: NEPHRON_TRANSPORTERS.filter((t) => t.segmentId === "pct"),
    keyPhysiologicalMechanisms: [
      "Isosmotic fluid reabsorption: bulk reclamation of ~65% of filtered water and sodium via apical NHE3 and basolateral Na+/K+ ATPase, accompanied by water through aquaporin-1 (AQP1).",
      "Bicarbonate reclamation: Apical brush border CA IV dehydrates luminal carbonic acid; intracellular CA II rehydrates CO2 to produce H+ (secreted via NHE3) and HCO3- (reabsorbed via basolateral NBCe1).",
      "Glucose and amino acid cotransport: SGLT2 in early S1/S2 segments reabsorbs ~90% of filtered glucose coupled to inward Na+ gradient.",
      "Active organic ion secretion: Basolateral OAT1/OAT3 and OCT2 pump anionic and cationic drugs into tubular cells for apical MRP2/4 and MATE1/2-K efflux into urine.",
    ],
    pharmacologicalTargets: [
      {
        drugClass: "SGLT2 Inhibitors",
        targetMolecule: "SGLT2 (SLC5A2)",
        representativeDrugIds: ["empagliflozin", "dapagliflozin", "canagliflozin"],
        mechanismSummary: "Selective inhibition of apical sodium-glucose cotransporter 2, inducing osmotic glucosuria and natriuresis, restoring tubuloglomerular feedback and reducing intraglomerular hypertension.",
        electrolyteConsequences: {
          sodium: "Mild natriuresis (osmotic diuresis, 1-2% fractional excretion)",
          potassium: "Neutral to minimal reduction (no direct K+ wasting)",
          calcium: "Neutral calcium handling",
          magnesium: "Mild elevation / magnesium retention",
          chloride: "Mild proportional excretion",
          bicarbonateAndAcidBase: "Neutral; potential risk of euglycemic DKA under insulinopenic physiological stress",
          urinePh: "Unaltered / neutral",
        },
        monitoredParameters: ["Serum creatinine / eGFR", "Blood pressure / volume status", "Blood glucose & ketones", "Urine output"],
      },
      {
        drugClass: "Carbonic Anhydrase Inhibitors",
        targetMolecule: "Carbonic Anhydrase II (intracellular) & IV (apical brush border)",
        representativeDrugIds: ["acetazolamide"],
        mechanismSummary: "Reversible catalytic inhibition of CA II and IV, paralyzing apical proton recycling, causing massive proximal bicarbonate wasting and blunting NHE3-mediated sodium reabsorption.",
        electrolyteConsequences: {
          sodium: "Mild natriuresis (2-3% fractional sodium excretion)",
          potassium: "Marked hypokalemia (increased distal Na+ delivery drives CCD K+ secretion)",
          calcium: "Mild hypercalciuria (can increase calcium phosphate precipitation in alkaline urine)",
          magnesium: "Neutral",
          chloride: "Hyperchloremia (compensatory chloride retention)",
          bicarbonateAndAcidBase: "Severe bicarbonaturia leading to hyperchloremic non-anion gap metabolic acidosis (Type 2 proximal RTA-like)",
          urinePh: "Alkaline (urine pH rises to > 7.5 - 8.0)",
        },
        monitoredParameters: ["Serum bicarbonate & arterial blood gas / venous CO2", "Serum potassium", "Serum chloride", "Urine pH"],
      },
    ],
    tubularFluidComposition: {
      entryOsmolality: "~290-300 mOsm/kg (isotonic to systemic plasma)",
      exitOsmolality: "~290-300 mOsm/kg (remains strictly isosmotic due to proportional AQP1 water permeability)",
      phChange: "Falls from ~7.4 to ~6.7 along the segment as bicarbonate is reclaimed",
    },
    clinicalPearls: [
      "Carbonic anhydrase inhibitors self-limit their diuretic efficacy within 48-72 hours because the resulting systemic metabolic acidosis depletes filtered bicarbonate load.",
      "Organic anion transporters (OAT1/3) in the PCT are the necessary gateway for loop and thiazide diuretics to enter the tubular fluid; severe CKD or competitive inhibitors (e.g. probenecid) blunt diuretic efficacy.",
    ],
  },
  {
    id: "tal",
    name: "Thick Ascending Limb of Loop of Henle (TAL)",
    shortName: "TAL",
    anatomicalZone: "Outer Medulla",
    transepithelialPotential: "+10 mV lumen-positive (driven by ROMK K+ back-leak and basolateral Cl- exit)",
    waterPermeability: "Impermeable (Diluting segment)",
    fractionalSodiumReabsorption: "25% of filtered NaCl; 60% of filtered Mg2+; 20-25% of filtered Ca2+",
    primaryTransporters: NEPHRON_TRANSPORTERS.filter((t) => t.segmentId === "tal"),
    keyPhysiologicalMechanisms: [
      "Active NaCl reabsorption via apical NKCC2 (1 Na+ : 1 K+ : 2 Cl-) driven by basolateral Na+/K+ ATPase, while water is excluded, rendering tubular fluid hypoosmolar.",
      "ROMK apical potassium recycling: Reabsorbed K+ leaks back into the lumen via ROMK channels, maintaining substrate K+ for NKCC2 and establishing a +10 mV transepithelial lumen-positive potential.",
      "Paracellular divalent cation reabsorption: The +10 mV lumen-positive potential repels positively charged Ca2+ and Mg2+, driving them through claudin-16/19 tight junction pores into the peritubular interstitium.",
      "Countercurrent multiplication: Generates the hypertonic medullary interstitium essential for downstream vasopressin-mediated water reabsorption in the collecting duct.",
    ],
    pharmacologicalTargets: [
      {
        drugClass: "Loop Diuretics ('High-Ceiling')",
        targetMolecule: "NKCC2 (SLC12A1)",
        representativeDrugIds: ["furosemide", "torsemide", "bumetanide"],
        mechanismSummary: "Reversible competitive inhibition of the chloride-binding site of apical NKCC2, abolishing the +10 mV lumen-positive transepithelial potential and blocking medullary concentration gradient generation.",
        electrolyteConsequences: {
          sodium: "Massive natriuresis ('high ceiling', up to 20-25% fractional excretion)",
          potassium: "Marked hypokalemia (high distal Na+ delivery and volume-depletion aldosterone surge)",
          calcium: "Hypercalciuria (hypocalcemia risk; 'Loops lose calcium' by eliminating paracellular voltage drive)",
          magnesium: "Marked hypomagnesemia (impairs TAL paracellular Mg2+ reabsorption, the primary site of systemic Mg uptake)",
          chloride: "Severe hypochloremia (loss of 2 Cl- for each Na+ blocked)",
          bicarbonateAndAcidBase: "Metabolic alkalosis (contraction alkalosis via volume contraction and aldosterone surge)",
          urinePh: "Acidic (distal proton wasting driven by aldosterone)",
        },
        monitoredParameters: ["Serum potassium & magnesium", "Serum calcium", "Serum bicarbonate & chloride", "BUN / Serum creatinine", "Urine output & volume status"],
      },
    ],
    tubularFluidComposition: {
      entryOsmolality: "~1200 mOsm/kg at the hairpin turn of Henle",
      exitOsmolality: "~100-150 mOsm/kg (hypoosmotic fluid delivered to the DCT due to solute reabsorption without water)",
      phChange: "Minimal change; pH remains ~6.8 to 7.0",
    },
    clinicalPearls: [
      "'Loops lose calcium': Loop diuretics induce hypercalciuria and are used in emergency management of severe hypercalcemic crisis (with aggressive saline repletion).",
      "Because ~60% of all filtered magnesium is reabsorbed in the TAL via the voltage-dependent paracellular pathway, loop diuretics are the leading pharmacological cause of refractory hypomagnesemia.",
      "Loop diuretics stimulate renal prostaglandin production (PGE2), promoting renal blood flow; concurrent NSAID use abolishes this effect.",
    ],
  },
  {
    id: "dct",
    name: "Distal Convoluted Tubule (DCT)",
    shortName: "DCT",
    anatomicalZone: "Renal Cortex",
    transepithelialPotential: "-5 to -10 mV lumen-negative (early DCT is electroneutral; late DCT becomes slightly negative)",
    waterPermeability: "Impermeable (Cortical diluting segment)",
    fractionalSodiumReabsorption: "5-7% of filtered NaCl; 8-10% of filtered Ca2+",
    primaryTransporters: NEPHRON_TRANSPORTERS.filter((t) => t.segmentId === "dct"),
    keyPhysiologicalMechanisms: [
      "Electroneutral NaCl reabsorption via apical NCC (1 Na+ : 1 Cl-), completely impermeable to water, further diluting luminal fluid.",
      "Active transcellular calcium reabsorption: Luminal Ca2+ enters via apical TRPV5 channels down electrochemical gradient, binds intracellular calbindin-D28k, and is actively extruded into peritubular blood by basolateral NCX1 (3 Na+ in : 1 Ca2+ out) and PMCA1b.",
      "Reciprocal coupling of Na+ and Ca2+: Blocking apical NCC lowers intracellular Na+, steepening the chemical gradient for basolateral NCX1 to pump Ca2+ out of the cell, directly accelerating apical TRPV5 Ca2+ entry.",
    ],
    pharmacologicalTargets: [
      {
        drugClass: "Thiazide & Thiazide-Like Diuretics",
        targetMolecule: "NCC (SLC12A3)",
        representativeDrugIds: ["hydrochlorothiazide", "chlorthalidone", "metolazone"],
        mechanismSummary: "Competitive inhibition of the chloride site of the apical NCC cotransporter, inhibiting 5-7% of sodium reabsorption and secondarily accelerating active transcellular calcium reclamation.",
        electrolyteConsequences: {
          sodium: "Moderate natriuresis (5-8% fractional excretion)",
          potassium: "Hypokalemia (increased delivery of Na+ and fluid to CCD principal cells)",
          calcium: "Hypocalciuria (hypercalcemia risk; 'Thiazides take calcium in' via steepened basolateral NCX1 gradient)",
          magnesium: "Mild to moderate hypomagnesemia (downregulation of apical TRPM6 channels in DCT)",
          chloride: "Hypochloremia",
          bicarbonateAndAcidBase: "Metabolic alkalosis (contraction alkalosis)",
          urinePh: "Acidic to normal",
        },
        monitoredParameters: ["Serum calcium (check for unmasked hyperparathyroidism)", "Serum potassium", "Serum sodium (hyponatremia risk in elderly)", "Serum uric acid (hyperuricemia risk)"],
      },
    ],
    tubularFluidComposition: {
      entryOsmolality: "~100-150 mOsm/kg",
      exitOsmolality: "~80-100 mOsm/kg (lowest tubular osmolality achieved before entering the collecting system)",
      phChange: "Stable around 6.6 to 6.8",
    },
    clinicalPearls: [
      "'Thiazides take calcium in': Unlike loop diuretics, thiazides reduce urinary calcium excretion by up to 50%, making them the definitive pharmacological therapy for recurrent calcium oxalate nephrolithiasis.",
      "Compensatory DCT hypertrophy occurs during chronic loop diuretic therapy, explaining loop diuretic resistance; adding metolazone or HCTZ overcomes this ('Sequential Nephron Blockade').",
      "Thiazides can induce severe hyponatremia because they impair cortical urinary dilution while sparing the medullary hypertonicity needed for vasopressin-mediated water reabsorption.",
    ],
  },
  {
    id: "ccd-principal",
    name: "Cortical Collecting Duct - Principal Cells",
    shortName: "CCD (Principal)",
    anatomicalZone: "Renal Cortex",
    transepithelialPotential: "-10 to -35 mV lumen-negative (generated by electrogenic ENaC Na+ reabsorption)",
    waterPermeability: "Regulated by Vasopressin (V2R / AQP2)",
    fractionalSodiumReabsorption: "2-3% of filtered Na+",
    primaryTransporters: NEPHRON_TRANSPORTERS.filter((t) => t.segmentId === "ccd-principal"),
    keyPhysiologicalMechanisms: [
      "Electrogenic sodium reabsorption via apical ENaC channels: Influx of positively charged Na+ without an anion creates a strong transepithelial lumen-negative potential (-10 to -35 mV).",
      "Voltage-dependent potassium secretion: The lumen-negative potential created by ENaC pulls K+ out of principal cells into the lumen through apical ROMK and BK channels.",
      "Aldosterone genomic upregulation: Aldosterone binds the intracellular mineralocorticoid receptor, stimulating SGK1, inhibiting Nedd4-2 ubiquitin ligase, and stabilizing apical ENaC while boosting basolateral Na+/K+ ATPase pumps.",
      "Vasopressin-regulated water permeability: Basolateral V2 receptor engagement raises cAMP, triggering apical exocytosis of AQP2 channels.",
    ],
    pharmacologicalTargets: [
      {
        drugClass: "Potassium-Sparing Diuretics: ENaC Blockers",
        targetMolecule: "ENaC (SCNN1A/B/G)",
        representativeDrugIds: ["amiloride", "triamterene"],
        mechanismSummary: "Direct, reversible blockade of the apical epithelial sodium channel, eliminating electrogenic Na+ entry, abolishing the lumen-negative transepithelial potential, and halting ROMK-mediated K+ secretion.",
        electrolyteConsequences: {
          sodium: "Weak natriuresis (1-2% fractional excretion)",
          potassium: "Potassium retention (Hyperkalemia risk)",
          calcium: "Mild calcium retention / neutral",
          magnesium: "Magnesium-sparing (reduces urinary Mg2+ loss)",
          chloride: "Mild excretion",
          bicarbonateAndAcidBase: "Mild non-anion gap metabolic acidosis (reduced proton extrusion drive)",
          urinePh: "Alkaline to neutral (diminished electrochemical gradient for proton secretion)",
        },
        monitoredParameters: ["Serum potassium", "Serum sodium", "Renal function / BUN & Creatinine"],
      },
      {
        drugClass: "Potassium-Sparing Diuretics: Aldosterone Antagonists (MRAs)",
        targetMolecule: "Mineralocorticoid Receptor (NR3C2)",
        representativeDrugIds: ["spironolactone", "eplerenone"],
        mechanismSummary: "Competitive antagonism of cytosolic mineralocorticoid receptors, preventing aldosterone-mediated transcription of SGK1, downregulating apical ENaC abundance and basolateral Na+/K+ ATPase pumps.",
        electrolyteConsequences: {
          sodium: "Mild natriuresis (1-2% fractional excretion)",
          potassium: "Marked potassium retention (Hyperkalemia risk, especially with ACEi/ARBs)",
          calcium: "Neutral",
          magnesium: "Magnesium-sparing",
          chloride: "Mild proportional excretion",
          bicarbonateAndAcidBase: "Metabolic acidosis (Type 4 RTA physiology: blunts proton secretion in intercalated cells)",
          urinePh: "Unaltered to slightly elevated",
        },
        monitoredParameters: ["Serum potassium (frequent checks in HF/CKD)", "Serum creatinine / eGFR", "Blood pressure"],
      },
      {
        drugClass: "Vasopressin V2 Receptor Antagonists (Vaptans)",
        targetMolecule: "V2 Vasopressin Receptor (AVPR2)",
        representativeDrugIds: ["tolvaptan"],
        mechanismSummary: "Selective antagonism of basolateral V2 receptors, preventing Gs-mediated cAMP generation and blocking AQP2 apical membrane insertion, producing pure aquaresis.",
        electrolyteConsequences: {
          sodium: "Systemic serum sodium increase (pure water clearance without natriuresis)",
          potassium: "Neutral",
          calcium: "Neutral",
          magnesium: "Neutral",
          chloride: "Neutral",
          bicarbonateAndAcidBase: "Neutral",
          urinePh: "Neutral (urine osmolality drops sharply to < 100-150 mOsm/kg)",
        },
        monitoredParameters: ["Serum sodium (rate of correction must not exceed 8-10 mEq/L/24h to prevent osmotic demyelination syndrome)", "Fluid intake & urine volume", "Hepatic transaminases"],
      },
    ],
    tubularFluidComposition: {
      entryOsmolality: "~80-100 mOsm/kg",
      exitOsmolality: "Highly variable: 50 mOsm/kg (in absence of ADH) to 300 mOsm/kg (equilibrated with cortical interstitium under ADH)",
      phChange: "Falls towards 6.0 - 6.5 as protons are added downstream",
    },
    clinicalPearls: [
      "Lithium enters principal cells through apical ENaC because the channel cannot distinguish Li+ from Na+; once inside, lithium inhibits GSK3-beta and shuts down AQP2 transcription, causing nephrogenic diabetes insipidus.",
      "Amiloride is the targeted mechanistic antidote for lithium-induced NDI: it blocks apical ENaC entry of Li+ without interfering with therapeutic lithium levels in the brain.",
      "Liddle syndrome represents a gain-of-function mutation in ENaC (loss of the PY motif that binds Nedd4-2), causing constitutive ENaC activation, severe hypertension, hypokalemia, and metabolic alkalosis with suppressed aldosterone; it responds dramatically to amiloride but not spironolactone.",
    ],
  },
  {
    id: "ccd-intercalated",
    name: "Cortical Collecting Duct - Intercalated Cells (Alpha & Beta)",
    shortName: "CCD (Intercalated)",
    anatomicalZone: "Renal Cortex",
    transepithelialPotential: "Variable lumen-negative to neutral",
    waterPermeability: "Regulated by AQP2/AQP3/AQP4",
    fractionalSodiumReabsorption: "< 1% (Specialized acid-base and chloride/bicarbonate regulatory cells)",
    primaryTransporters: NEPHRON_TRANSPORTERS.filter((t) => t.segmentId === "ccd-intercalated"),
    keyPhysiologicalMechanisms: [
      "Type A (Alpha) intercalated cells: Primary acid extrusion machinery. Apical vacuolar H+-ATPase and H+/K+-ATPase pump protons into the lumen against steep electrochemical gradients, lowering urine pH to as low as 4.5. Basolateral AE1 (Band 3) extrudes regenerated HCO3- into peritubular blood.",
      "Aldosterone stimulation of proton secretion: Aldosterone directly stimulates the apical H+-ATPase in alpha cells and indirectly stimulates it by deepening lumen negativity via principal cell ENaC.",
      "Type B (Beta) intercalated cells: Bicarbonate extrusion machinery for systemic alkalosis. Apical Pendrin (SLC26A4) exchanges intracellular HCO3- for luminal Cl-, while basolateral H+-ATPase pumps protons back into systemic blood.",
      "Chloride dependence of Pendrin: Pendrin requires luminal Cl- to secrete HCO3-. In volume/chloride depletion (e.g. diuretic misuse, vomiting), lack of luminal chloride halts Pendrin, preventing bicarbonate excretion and perpetuating contraction alkalosis.",
    ],
    pharmacologicalTargets: [
      {
        drugClass: "Intercalated Cell Acid-Base Modulators & V2 Agonists",
        targetMolecule: "H+-ATPase, Pendrin, V2R / AQP2",
        representativeDrugIds: ["desmopressin"],
        mechanismSummary: "Synthetic vasopressin V2 receptor agonist that promotes AQP2 apical trafficking for antidiuresis in central DI, while intercalated cell transport governs final urine acidification and buffer titration.",
        electrolyteConsequences: {
          sodium: "Systemic dilution / potential hyponatremia with water intake",
          potassium: "Neutral",
          calcium: "Neutral",
          magnesium: "Neutral",
          chloride: "Neutral",
          bicarbonateAndAcidBase: "Homeostatic net acid excretion via H+-ATPase titrating HPO4^2- and NH3",
          urinePh: "Capable of maximal urine acidification (pH 4.5 - 5.5)",
        },
        monitoredParameters: ["Serum sodium", "Urine osmolality", "Serum bicarbonate & chloride", "Urine pH"],
      },
    ],
    tubularFluidComposition: {
      entryOsmolality: "~100-300 mOsm/kg",
      exitOsmolality: "50 mOsm/kg (maximal water diuresis) to 1200 mOsm/kg (maximal antidiuresis in inner medullary collecting duct)",
      phChange: "Final urine acidification down to minimum physiological pH 4.5 (from ~6.5 at entry)",
    },
    clinicalPearls: [
      "Contraction alkalosis pathophysiology: Hypovolemia triggers an aldosterone surge. Aldosterone accelerates alpha-intercalated H+-ATPase proton pumping and principal cell ENaC/ROMK K+ wasting. Hypokalemia drives H+ into cells in exchange for K+, inducing intracellular acidosis that accelerates proximal ammoniagenesis and bicarbonate reclamation. Concomitant hypochloremia paralyzes beta-intercalated Pendrin, locking in severe metabolic alkalosis.",
      "Distal Renal Tubular Acidosis (Type 1 RTA) involves failure of alpha-intercalated apical H+-ATPase or basolateral AE1, making it impossible to acidify urine below pH 5.5 despite severe systemic metabolic acidosis, often accompanied by hypokalemia and nephrocalcinosis.",
      "Type 4 RTA (Hyperkalemic RTA) is caused by aldosterone deficiency or resistance (such as from MRAs, ACEis, ARBs, or NSAIDs), which paralyzes alpha-intercalated proton secretion and principal cell potassium secretion.",
    ],
  },
];

// ============================================================================
// 3. DIURETIC CLASS COMPARISON MATRIX
// ============================================================================

export const DIURETIC_CLASS_PROFILES: readonly DiureticClassProfile[] = [
  {
    id: "ca-inhibitors",
    className: "Carbonic Anhydrase Inhibitors",
    tubularSite: "Proximal Convoluted Tubule (PCT)",
    segmentId: "pct",
    molecularTarget: "Carbonic Anhydrase II (cytoplasmic) & IV (luminal brush border)",
    representativeDrugIds: ["acetazolamide"],
    fractionalSodiumExcretion: "2% to 3% (mild natriuresis due to extensive downstream reabsorption in TAL and DCT)",
    calciumEffect: "Mildly increased urinary calcium excretion",
    calciumMechanism: "Inhibition of proximal fluid reabsorption slightly reduces proximal passive calcium reclamation; increases risk of calcium phosphate stone precipitation in alkaline urine.",
    magnesiumEffect: "Neutral to minimal effect",
    magnesiumMechanism: "Minimal effect on TAL magnesium transport.",
    potassiumEffect: "Wasting (Hypokalemia)",
    potassiumMechanism: "Increased delivery of unreabsorbed sodium and non-reabsorbed bicarbonate anions to the CCD principal cells deepens lumen negativity, markedly accelerating ROMK K+ secretion.",
    acidBaseEffect: "Metabolic Acidosis (Hyperchloremic Non-Anion Gap / Type 2 RTA physiology)",
    urinePhEffect: "Markedly Alkaline (Urine pH > 7.5 to 8.2)",
    clinicalIndications: [
      "Acute mountain sickness prophylaxis & treatment (induces metabolic acidosis to stimulate central respiratory drive)",
      "Metabolic alkalosis correction in volume-overloaded patients with heart failure or COPD",
      "Open-angle glaucoma (reduces aqueous humor production)",
      "Idiopathic intracranial hypertension (pseudotumor cerebri)",
    ],
    highYieldBoardPearls: [
      "Diuretic effect is self-limiting within 48 to 72 hours due to the progressive reduction in filtered bicarbonate load caused by systemic metabolic acidosis.",
      "Produces alkaline urine with metabolic acidosis: the hallmark laboratory signature of proximal bicarbonate wasting.",
    ],
    monitoredParameters: ["Serum bicarbonate & total CO2", "Serum potassium", "Serum chloride", "Arterial or venous blood gas"],
  },
  {
    id: "loop-diuretics",
    className: "Loop Diuretics ('High-Ceiling')",
    tubularSite: "Thick Ascending Limb of Loop of Henle (TAL)",
    segmentId: "tal",
    molecularTarget: "NKCC2 (SLC12A1) apical electroneutral 1Na+-1K+-2Cl- cotransporter",
    representativeDrugIds: ["furosemide", "torsemide", "bumetanide"],
    fractionalSodiumExcretion: "20% to 25% ('High-ceiling' diuresis)",
    calciumEffect: "Hypercalciuria (Hypocalcemia Risk; 'Loops lose calcium')",
    calciumMechanism: "Inhibition of NKCC2 abolishes ROMK potassium recycling, collapsing the +10 mV lumen-positive transepithelial potential. This eliminates the thermodynamic repulsive force driving paracellular Ca2+ through claudin-16/19 tight junctions.",
    magnesiumEffect: "Marked Wasting (Severe Hypomagnesemia)",
    magnesiumMechanism: "Elimination of the +10 mV lumen-positive potential abolishes paracellular Mg2+ reabsorption in the TAL, which normally accounts for 60% of all systemic magnesium reclamation.",
    potassiumEffect: "Marked Wasting (Hypokalemia)",
    potassiumMechanism: "Massive delivery of sodium and fluid to CCD principal cells combined with volume-contraction-induced aldosterone elevation drives intense electrogenic ENaC Na+ uptake and ROMK K+ wasting.",
    acidBaseEffect: "Metabolic Alkalosis (Contraction alkalosis with hypokalemia and hypochloremia)",
    urinePhEffect: "Acidic to normal (pH typically 5.0 to 6.0 due to aldosterone-stimulated distal proton pumping)",
    clinicalIndications: [
      "Acute pulmonary edema and acute decompensated heart failure volume overload",
      "Chronic heart failure (HFrEF and HFpEF) maintenance of euvolemia",
      "Hepatic cirrhosis with ascites (combined with spironolactone)",
      "Nephrotic syndrome and acute kidney injury volume management",
      "Acute severe hypercalcemia emergency diuresis (with aggressive isotonic saline hydration)",
    ],
    highYieldBoardPearls: [
      "'Loops lose calcium': Loop diuretics increase urinary calcium excretion and can lower serum calcium, whereas thiazides retain calcium.",
      "Ototoxicity (tinnitus, reversible or permanent sensorineural hearing loss) can occur with rapid high-dose IV administration due to inhibition of the NKCC1 isoform in the stria vascularis of the inner ear.",
      "Must be actively secreted into the tubular lumen via proximal OAT1/3 transporters to reach the apical NKCC2 binding site; severe CKD or hypoalbuminemia impairs delivery to the target site.",
    ],
    monitoredParameters: ["Serum potassium & magnesium (serial monitoring)", "Serum calcium", "BUN & Serum creatinine", "Serum chloride & bicarbonate", "Urine output & orthostatic vitals"],
  },
  {
    id: "thiazides",
    className: "Thiazide & Thiazide-Like Diuretics",
    tubularSite: "Distal Convoluted Tubule (DCT)",
    segmentId: "dct",
    molecularTarget: "NCC (SLC12A3) apical electroneutral Na+-Cl- cotransporter",
    representativeDrugIds: ["hydrochlorothiazide", "chlorthalidone", "metolazone"],
    fractionalSodiumExcretion: "5% to 8% (moderate natriuresis)",
    calciumEffect: "Hypocalciuria (Hypercalcemia Risk; 'Thiazides take calcium in')",
    calciumMechanism: "Inhibition of apical NCC reduces intracellular Na+, steepening the chemical gradient for basolateral NCX1 (3 Na+ in : 1 Ca2+ out). This accelerates basolateral Ca2+ extrusion and pulls Ca2+ across apical TRPV5 channels into the cell, reducing urine calcium excretion by up to 50%.",
    magnesiumEffect: "Mild to Moderate Wasting (Hypomagnesemia)",
    magnesiumMechanism: "Downregulates apical TRPM6 magnesium channels in the DCT during chronic therapy.",
    potassiumEffect: "Wasting (Hypokalemia)",
    potassiumMechanism: "Increased delivery of unreabsorbed sodium and fluid to CCD principal cells stimulates ENaC uptake, deepening lumen negativity and driving ROMK K+ secretion.",
    acidBaseEffect: "Metabolic Alkalosis (Hypokalemic, hypochloremic contraction alkalosis)",
    urinePhEffect: "Acidic to normal",
    clinicalIndications: [
      "Essential hypertension (first-line therapy, especially chlorthalidone and hydrochlorothiazide)",
      "Recurrent calcium nephrolithiasis (hypercalciuria: decreases urinary calcium supersaturation)",
      "Nephrogenic diabetes insipidus (paradoxical antidiuresis: induces mild volume contraction, boosting proximal fluid reabsorption)",
      "Synergistic sequential nephron blockade in loop-resistant heart failure (metolazone)",
    ],
    highYieldBoardPearls: [
      "'Thiazides take calcium in': Protective against recurrent calcium oxalate kidney stones; may unmask underlying primary hyperparathyroidism.",
      "Metolazone retains potent efficacy even at GFR < 30 mL/min, unlike hydrochlorothiazide which loses monotherapy efficacy at low GFR.",
      "High incidence of thiazide-induced hyponatremia in elderly women because thiazides impair cortical dilution without impairing medullary hypertonicity.",
    ],
    monitoredParameters: ["Serum calcium", "Serum sodium", "Serum potassium", "Serum uric acid (can precipitate acute gout)", "Serum glucose"],
  },
  {
    id: "potassium-sparing-enac",
    className: "Potassium-Sparing Diuretics: ENaC Channel Blockers",
    tubularSite: "Cortical Collecting Duct (CCD) - Principal Cells",
    segmentId: "ccd-principal",
    molecularTarget: "ENaC (Epithelial Sodium Channel, SCNN1A/B/G)",
    representativeDrugIds: ["amiloride", "triamterene"],
    fractionalSodiumExcretion: "1% to 3% (weak natriuretic alone)",
    calciumEffect: "Mildly reduced urinary calcium / neutral",
    calciumMechanism: "Reduces distal calcium excretion slightly; no significant hypercalcemia risk.",
    magnesiumEffect: "Magnesium-Sparing (Reduces renal Mg2+ wasting)",
    magnesiumMechanism: "Reduces electrochemical drive for paracellular and transcellular magnesium wasting.",
    potassiumEffect: "Sparing (Hyperkalemia Risk)",
    potassiumMechanism: "Direct blockade of apical ENaC eliminates electrogenic sodium influx, abolishing the lumen-negative transepithelial potential and eliminating the electrical driving force for ROMK K+ secretion.",
    acidBaseEffect: "Metabolic Acidosis (Mild hyperkalemic non-anion gap metabolic acidosis / Type 4 RTA physiology)",
    urinePhEffect: "Alkaline to neutral (diminishes driving force for intercalated cell H+-ATPase proton secretion)",
    clinicalIndications: [
      "Counteracting hypokalemia and hypomagnesemia induced by loop or thiazide diuretics",
      "Liddle syndrome (constitutively active ENaC: definitive targeted therapy)",
      "Lithium-induced nephrogenic diabetes insipidus (amiloride blocks principal cell ENaC entry of Li+)",
      "Cystic fibrosis aerosol research (mucociliary clearance)",
    ],
    highYieldBoardPearls: [
      "Amiloride does not require aldosterone receptor binding; it blocks ENaC directly, making it effective in Liddle syndrome where aldosterone is suppressed.",
      "Amiloride is the definitive mechanistic rescue agent for lithium-induced NDI because lithium enters principal cells almost exclusively via ENaC.",
      "Triamterene can precipitate as urinary stones and cause triamterene nephrolithiasis.",
    ],
    monitoredParameters: ["Serum potassium (high hyperkalemia risk when co-administered with RAAS inhibitors)", "BUN & Serum creatinine", "Serum sodium"],
  },
  {
    id: "potassium-sparing-mra",
    className: "Potassium-Sparing Diuretics: Aldosterone Receptor Antagonists (MRAs)",
    tubularSite: "Cortical Collecting Duct (CCD) - Principal & Intercalated Cells",
    segmentId: "ccd-principal",
    molecularTarget: "Mineralocorticoid Receptor (NR3C2 cytosolic/nuclear receptor)",
    representativeDrugIds: ["spironolactone", "eplerenone"],
    fractionalSodiumExcretion: "1% to 2% (weak natriuretic alone)",
    calciumEffect: "Neutral",
    calciumMechanism: "No direct effect on renal calcium transport.",
    magnesiumEffect: "Magnesium-Sparing (Prevents diuretic-induced hypomagnesemia)",
    magnesiumMechanism: "Preserves intracellular and extracellular magnesium levels.",
    potassiumEffect: "Sparing (Hyperkalemia Risk, particularly in CKD/diabetes)",
    potassiumMechanism: "Antagonizes aldosterone-driven genomic transcription of SGK1, promoting Nedd4-2-mediated ENaC internalization and downregulating basolateral Na+/K+ ATPase pumps.",
    acidBaseEffect: "Metabolic Acidosis (Hyperkalemic non-anion gap metabolic acidosis / Type 4 RTA physiology)",
    urinePhEffect: "Alkaline to neutral (blunts aldosterone stimulation of alpha-intercalated H+-ATPase)",
    clinicalIndications: [
      "Heart failure with reduced ejection fraction (HFrEF: RALES & EPHESUS trials demonstrate mortality benefit)",
      "Hepatic cirrhosis with ascites (reverses secondary hyperaldosteronism; typical 100 mg spironolactone to 40 mg furosemide ratio)",
      "Primary hyperaldosteronism (Conn syndrome / bilateral adrenal hyperplasia)",
      "Resistant hypertension (PATHWAY-2 trial confirmed superiority as 4th-line agent)",
    ],
    highYieldBoardPearls: [
      "Spironolactone non-specifically blocks androgen and progesterone receptors, causing gynecomastia, breast tenderness, and menstrual irregularities; eplerenone is a highly selective MRA without anti-androgenic side effects.",
      "Produces mortality reduction in HFrEF independent of diuretic effect via inhibition of cardiac and vascular fibrosis.",
    ],
    monitoredParameters: ["Serum potassium (serial checks at baseline, 1 week, 4 weeks, and quarterly)", "Serum creatinine / eGFR", "Blood pressure"],
  },
  {
    id: "sglt2-inhibitors",
    className: "SGLT2 Inhibitors (Gliflozins)",
    tubularSite: "Proximal Convoluted Tubule (PCT) - S1/S2 Segments",
    segmentId: "pct",
    molecularTarget: "SGLT2 (SLC5A2) apical Na+-Glucose cotransporter",
    representativeDrugIds: ["empagliflozin", "dapagliflozin", "canagliflozin"],
    fractionalSodiumExcretion: "1% to 2% (mild osmotic natriuresis coupled with glucosuria)",
    calciumEffect: "Neutral to slight transient increase",
    calciumMechanism: "Mild uricosuric and osmotic effect; no clinically significant calcium disturbances.",
    magnesiumEffect: "Mild Magnesium Elevation (Serum Mg2+ increase)",
    magnesiumMechanism: "Consistently elevates serum magnesium by ~0.1 to 0.2 mg/dL through enhanced distal tubular reclamation.",
    potassiumEffect: "Neutral (No clinically significant K+ wasting)",
    potassiumMechanism: "Does not stimulate distal K+ secretion because sodium delivery is modest and accompanied by glucose osmoles rather than non-reabsorbable anions.",
    acidBaseEffect: "Neutral (Risk of Euglycemic Diabetic Ketoacidosis in insulin-deficient states)",
    urinePhEffect: "Neutral",
    clinicalIndications: [
      "Type 2 diabetes mellitus glycemic control with cardiovascular risk reduction",
      "Heart failure (HFrEF and HFpEF: EMPEROR and DAPA-HF trials show reduced HF hospitalizations and CV death)",
      "Chronic kidney disease (DAPA-CKD and EMPA-KIDNEY trials demonstrate slowed CKD progression)",
    ],
    highYieldBoardPearls: [
      "Nephroprotection mechanism: Increases sodium delivery to the macula densa, restoring tubuloglomerular feedback (TGF), which causes afferent arteriolar constriction and reduces intraglomerular capillary hypertension.",
      "Causes an initial, reversible dip in eGFR of 3-5 mL/min/1.73m2 within 2-4 weeks, reflecting successful relief of glomerular hyperfiltration.",
    ],
    monitoredParameters: ["Serum creatinine / eGFR (transient hemodynamic dip is expected)", "Blood pressure & volume status", "Blood ketones if unwell", "Genitourinary mycotic infections"],
  },
  {
    id: "v2-antagonists",
    className: "Vasopressin V2 Receptor Antagonists (Vaptans)",
    tubularSite: "Cortical and Medullary Collecting Duct",
    segmentId: "ccd-principal",
    molecularTarget: "V2 Vasopressin Receptor (AVPR2 basolateral Gs-coupled GPCR)",
    representativeDrugIds: ["tolvaptan"],
    fractionalSodiumExcretion: "0% (Pure aquaresis: electrolyte-free water excretion)",
    calciumEffect: "Neutral",
    calciumMechanism: "No effect on renal calcium transport.",
    magnesiumEffect: "Neutral",
    magnesiumMechanism: "No effect on renal magnesium transport.",
    potassiumEffect: "Neutral",
    potassiumMechanism: "No direct effect on principal cell potassium secretion.",
    acidBaseEffect: "Neutral",
    urinePhEffect: "Neutral (Urine osmolality drops sharply to < 100-150 mOsm/kg)",
    clinicalIndications: [
      "Euvolemic hyponatremia (SIADH: Syndrome of Inappropriate Antidiuretic Hormone secretion)",
      "Hypervolemic hyponatremia in heart failure or cirrhosis",
      "Autosomal dominant polycystic kidney disease (ADPKD: slows cyst growth and eGFR decline)",
    ],
    highYieldBoardPearls: [
      "Produces 'aquaresis' (pure solute-free water excretion) in contrast to standard natriuretic diuretics.",
      "Black box warning: Rapid correction of chronic hyponatremia (>8-10 mEq/L in 24 hours) risks irreversible Osmotic Demyelination Syndrome (central pontine myelinolysis); frequent serum sodium monitoring is mandatory.",
    ],
    monitoredParameters: ["Serum sodium (measure every 4-6 hours during active titration)", "Urine output & thirst drive", "Hepatic liver function tests (ALT, AST, total bilirubin)"],
  },
];

// ============================================================================
// 4. HIGH-YIELD NEPHROLOGY & DIURETIC COLLISIONS
// ============================================================================

export const RENAL_COLLISIONS: readonly RenalCollision[] = [
  {
    id: "triple-whammy",
    title: "Triple Whammy: Pre-Renal Glomerular Shutdown (ACEi/ARB + Loop Diuretic + NSAID)",
    severity: "critical",
    summary: "Simultaneous afferent vasoconstriction, efferent vasodilation, and intravascular volume depletion precipitating acute prerenal renal failure.",
    mechanismsInvolved: {
      afferentArteriole: "NSAIDs inhibit COX-1 and COX-2 enzymes, suppressing vasodilatory renal prostaglandins (PGE2 and PGI2), causing intense afferent arteriolar vasoconstriction and choking glomerular inflow.",
      efferentArteriole: "ACE inhibitors or ARBs block Angiotensin II action on AT1 receptors, preventing compensatory efferent arteriolar vasoconstriction and causing uninhibited efferent vasodilation.",
      tubularTransport: "Loop diuretics inhibit apical NKCC2 in the TAL, inducing significant natriuresis and intravascular volume contraction.",
      hormonalResponse: "Volume depletion triggers intense renin release, but downstream efferent resistance cannot be maintained due to ACEi/ARB blockade, while NSAIDs block prostaglandin-mediated autoregulatory compensation.",
      hemodynamicConsequence: "Catastrophic collapse of intraglomerular capillary hydrostatic pressure (delta P), causing abrupt cessation of glomerular filtration and acute kidney injury.",
    },
    triggerDrugClasses: ["ACE inhibitor / ARB", "Loop Diuretic", "NSAID"],
    interactingDrugIds: ["lisinopril", "losartan", "enalapril", "valsartan", "furosemide", "torsemide", "bumetanide", "ibuprofen", "naproxen", "ketorolac", "celecoxib", "indomethacin"],
    pathophysiologyDetail:
      "Normal renal autoregulation maintains a constant glomerular filtration rate across mean arterial pressures of 80 to 180 mmHg. In states of volume depletion induced by loop diuretics, glomerular perfusion pressure drops. The kidney preserves GFR via two compensatory mechanisms: 1) local prostaglandins (PGE2, PGI2) dilate the afferent arteriole to maximize blood entering the glomerulus, and 2) angiotensin II constricts the efferent arteriole to maintain intraglomerular hydrostatic pressure. Co-administering an NSAID eliminates prostaglandin-dependent afferent dilation, while an ACEi or ARB prevents angiotensin II-dependent efferent constriction. The glomerulus loses both ends of its autoregulatory clamp, resulting in a sudden, precipitous drop in transcapillary filtration pressure and acute renal failure.",
    clinicalRisks: [
      "Acute Kidney Injury (AKI) with doubling or tripling of serum creatinine within 48 to 72 hours",
      "Severe hyperkalemia (attenuated GFR plus ACEi/ARB-mediated aldosterone suppression)",
      "Oliguria or anuria and fluid overload",
      "Accelerated cardiovascular decompensation in heart failure patients",
    ],
    monitoredParameters: [
      "Daily serum creatinine, BUN, and calculated eGFR",
      "Serum potassium (high risk of life-threatening hyperkalemia)",
      "Daily urine output and fluid balance",
      "Blood pressure and orthostatic vitals",
    ],
    mitigationPhysiology:
      "Physiological mitigation involves identifying and discontinuing the NSAID, temporarily holding the loop diuretic if volume status permits, providing cautious volume restoration if hypovolemic, and monitoring until intraglomerular hemodynamics and GFR recover.",
    literatureCitation: "Loboz KK, Shenfield GM. Drug-induced acute kidney injury: The 'triple whammy'. Br J Clin Pharmacol. 2005;59(2):239-243.",
  },
  {
    id: "sequential-nephron-blockade",
    title: "Sequential Nephron Blockade: Synergistic TAL + DCT Inhibition (Loop Diuretic + Thiazide/Metolazone)",
    severity: "synergistic-clinical",
    summary: "Combined blockade of thick ascending limb and distal convoluted tubule overcoming compensatory distal hypertrophy to produce profound synergistic natriuresis.",
    mechanismsInvolved: {
      tubularTransport: "Loop diuretic blocks NKCC2 in the TAL (inhibiting ~25% of Na+ reabsorption). Thiazide or metolazone blocks NCC in the DCT (inhibiting ~5-7% of Na+ reabsorption).",
      hormonalResponse: "Profound intravascular volume contraction activates the sympathetic nervous system and RAAS, generating intense secondary hyperaldosteronism.",
      hemodynamicConsequence: "Massive natriuresis and diuresis; overcomes the 'braking phenomenon' of chronic loop diuretic resistance.",
    },
    triggerDrugClasses: ["Loop Diuretic", "Thiazide / Thiazide-like Diuretic (Metolazone, HCTZ, Chlorthalidone)"],
    interactingDrugIds: ["furosemide", "torsemide", "bumetanide", "metolazone", "hydrochlorothiazide", "chlorthalidone"],
    pathophysiologyDetail:
      "Chronic loop diuretic monotherapy delivers massive sodium and chloride loads to the distal tubule. Over weeks, the DCT undergoes compensatory structural hypertrophy and hyperplasia, with marked transcriptional upregulation of apical NCC cotransporters (the 'braking phenomenon'). As a result, the hypertrophied DCT avidly reabsorbs the sodium delivered from the TAL, rendering the patient diuretic-resistant. Adding a thiazide or metolazone blocks the hypertrophied NCC cotransporters, producing a synergistic, torrential natriuresis that overcomes diuretic resistance. However, delivering this massive fluid and sodium load to the downstream CCD drives extreme ENaC sodium reabsorption and unrestricted ROMK potassium and H+-ATPase proton wasting.",
    clinicalRisks: [
      "Severe, refractory hypokalemia (< 2.5 to 3.0 mEq/L) risking ventricular tachyarrhythmias",
      "Profound hypomagnesemia (< 1.2 mg/dL)",
      "Abrupt intravascular volume depletion, orthostatic hypotension, and prerenal azotemia",
      "Severe hypochloremic metabolic alkalosis (contraction alkalosis)",
    ],
    monitoredParameters: [
      "Serum potassium and magnesium (daily to twice-daily during initiation)",
      "Serum sodium and chloride",
      "Serum creatinine and BUN",
      "Strict intake and output records, daily weights, and blood pressure",
    ],
    mitigationPhysiology:
      "Physiological mitigation requires anticipating the extreme synergy: establishing pre-treatment electrolyte baselines, scheduling close serial laboratory monitoring, and providing potassium and magnesium chloride repletion to prevent arrhythmogenic electrolyte depletion.",
    literatureCitation: "Ellison DH. Clinical use of diuretics in heart failure: Considerations on resistance and sequential nephron blockade. Semin Nephrol. 2011;31(6):538-552.",
  },
  {
    id: "contraction-alkalosis-risk",
    title: "Diuretic-Induced Contraction Alkalosis (Hypovolemia-Aldosterone Proton Wasting Axis)",
    severity: "high",
    summary: "Extracellular volume depletion and chloride loss triggering secondary hyperaldosteronism, accelerating alpha-intercalated H+ wasting and paralyzing beta-intercalated Pendrin.",
    mechanismsInvolved: {
      tubularTransport: "Loop or thiazide diuretics cause substantial loss of extracellular water, sodium, and chloride without equivalent bicarbonate loss. Concomitant hypokalemia shifts systemic H+ into intracellular space in exchange for K+.",
      hormonalResponse: "Hypovolemia triggers an intense secondary aldosterone surge.",
      hemodynamicConsequence: "Aldosterone stimulates apical H+-ATPase in alpha-intercalated cells and ENaC in principal cells, while chloride depletion halts Pendrin-mediated bicarbonate secretion in beta-intercalated cells.",
    },
    triggerDrugClasses: ["High-Dose Loop Diuretic", "Thiazide Diuretic"],
    interactingDrugIds: ["furosemide", "torsemide", "bumetanide", "hydrochlorothiazide", "chlorthalidone", "metolazone"],
    pathophysiologyDetail:
      "Contraction alkalosis involves both generation and maintenance phases. Generation occurs when potent diuretics cause loss of extracellular fluid containing sodium and chloride with low bicarbonate content, concentrating the remaining systemic bicarbonate. Maintenance occurs through three interlocking physiological mechanisms: 1) Secondary hyperaldosteronism directly stimulates alpha-intercalated H+-ATPase proton secretion, regenerating systemic bicarbonate; 2) Hypokalemia causes intracellular potassium to exit cells in exchange for extracellular H+, creating intracellular acidosis in renal tubular cells, which accelerates proximal ammoniagenesis and bicarbonate reclamation; 3) Severe hypochloremia starves beta-intercalated Pendrin (SLC26A4) of luminal chloride, preventing it from secreting excess bicarbonate into urine. The result is a persistent 'chloride-responsive' metabolic alkalosis.",
    clinicalRisks: [
      "Severe metabolic alkalosis (serum HCO3- > 35-40 mEq/L, arterial pH > 7.55)",
      "Hypoventilation and hypercapnia (compensatory respiratory depression, dangerous in COPD)",
      "Refractory hypokalemia and cardiac arrhythmias",
      "Decreased cerebral blood flow and neuromuscular irritability (tetany, seizures)",
    ],
    monitoredParameters: [
      "Serum bicarbonate and chloride",
      "Serum potassium",
      "Urine chloride concentration (typically < 15-20 mEq/L in chloride-responsive alkalosis)",
      "Arterial or venous blood gas (pH, pCO2)",
    ],
    mitigationPhysiology:
      "Physiological resolution depends on restoring intravascular volume and replenishing chloride with isotonic sodium chloride (or potassium chloride), which recharges luminal chloride for beta-intercalated Pendrin to resume bicarbonate excretion. Carbonic anhydrase inhibitors (acetazolamide) can be utilized to promote proximal bicarbonaturia if volume repletion is contraindicated.",
    literatureCitation: "Hamm LL, Nakhoul N, Hering-Smith KS. Acid-Base Homeostasis. Clin J Am Soc Nephrol. 2015;10(12):2232-2242.",
  },
  {
    id: "lithium-ndi-enac",
    title: "Lithium-Induced Nephrogenic Diabetes Insipidus & Amiloride ENaC Rescue",
    severity: "high",
    summary: "Lithium enters CCD principal cells via apical ENaC, downregulating AQP2 channels and causing nephrogenic DI; amiloride selectively blocks ENaC entry.",
    mechanismsInvolved: {
      tubularTransport: "Lithium (Li+) is a monovalent cation that permeates apical ENaC channels with high conductance in principal cells. Basolateral Na+/K+ ATPase cannot efficiently pump Li+ out, causing intracellular lithium accumulation.",
      hormonalResponse: "Intracellular lithium inhibits glycogen synthase kinase 3-beta (GSK3-beta) and impairs vasopressin-stimulated adenylyl cyclase signaling.",
      hemodynamicConsequence: "Profoun downregulation of AQP2 mRNA transcription and loss of apical AQP2 water channel trafficking, rendering collecting ducts completely resistant to vasopressin (polyuria, polydipsia).",
    },
    triggerDrugClasses: ["Lithium (Mood Stabilizer)", "ENaC Interactors (Amiloride)"],
    interactingDrugIds: ["lithium", "amiloride"],
    pathophysiologyDetail:
      "Lithium freely passes through apical ENaC channels because its ionic radius is comparable to sodium. However, unlike sodium, lithium is extruded very poorly across the basolateral membrane by the Na+/K+ ATPase pump, causing intracellular lithium concentrations in principal cells to reach levels several times higher than systemic serum. This toxic accumulation inhibits GSK3-beta and blunts V2-receptor-driven cAMP generation, preventing aquaporin-2 vesicle translocation and downregulating AQP2 gene expression. The collecting duct becomes impermeable to water, resulting in nephrogenic diabetes insipidus characterized by severe polyuria (often 4-8 L/day) and compensatory polydipsia. Amiloride acts as a targeted competitive inhibitor of apical ENaC: by blocking lithium entry into principal cells, amiloride prevents intracellular accumulation and allows AQP2 trafficking to recover, without lowering psychiatric lithium levels in the brain.",
    clinicalRisks: [
      "Nephrogenic Diabetes Insipidus (hyposthenuria, severe polyuria, unquenchable polydipsia)",
      "Dehydration, hypernatremia, and prerenal azotemia during periods of water deprivation",
      "Vicious cycle of lithium toxicity: volume depletion triggers compensatory proximal tubular sodium and lithium reabsorption, driving systemic lithium levels into the toxic range (> 1.5-2.0 mEq/L)",
    ],
    monitoredParameters: [
      "Serum lithium levels (narrow therapeutic index: 0.6 to 1.2 mEq/L)",
      "24-hour urine volume and urine osmolality (< 300 mOsm/kg despite water restriction indicates NDI)",
      "Serum sodium and renal function (BUN / Creatinine)",
      "Serum potassium (when amiloride is introduced)",
    ],
    mitigationPhysiology:
      "Amiloride provides targeted mechanistic prevention and reversal of lithium-induced NDI by selectively closing the ENaC pore to lithium entry in principal cells, preserving AQP2 expression while maintaining systemic lithium therapy.",
    literatureCitation: "Bedford LE, et al. Lithium-induced nephrogenic diabetes insipidus: Pathophysiology and amiloride rescue. Kidney Int. 2008;74(1):28-36.",
  },
  {
    id: "dual-raas-hyperkalemia",
    title: "Dual RAAS / Aldosterone Blockade: Severe Hyperkalemia Hazard (ACEi/ARB + K+-Sparing Diuretic)",
    severity: "critical",
    summary: "Simultaneous inhibition of angiotensin II and mineralocorticoid receptors paralyzing principal cell potassium secretion.",
    mechanismsInvolved: {
      tubularTransport: "Potassium-sparing diuretics (spironolactone, eplerenone, amiloride, triamterene) block ENaC or mineralocorticoid receptors in CCD principal cells.",
      hormonalResponse: "ACE inhibitors or ARBs suppress systemic angiotensin II and reduce adrenal aldosterone secretion.",
      hemodynamicConsequence: "Synergistic arrest of principal cell ROMK K+ secretion and intercalated cell H+-ATPase proton pumping, resulting in severe hyperkalemia and Type 4 RTA metabolic acidosis.",
    },
    triggerDrugClasses: ["ACE inhibitor / ARB", "Potassium-Sparing Diuretic (MRA or ENaC Blocker)"],
    interactingDrugIds: ["lisinopril", "losartan", "enalapril", "valsartan", "spironolactone", "eplerenone", "amiloride", "triamterene"],
    pathophysiologyDetail:
      "Combining an ACE inhibitor or ARB with a mineralocorticoid receptor antagonist (e.g. spironolactone, eplerenone) or ENaC blocker (amiloride, triamterene) achieves additive inhibition of the renal potassium excretion axis. The ACEi/ARB reduces circulating aldosterone levels, while the MRA prevents remaining aldosterone from binding intracellular receptors in principal cells. The combined lack of SGK1 stimulation and ENaC activity eliminates the lumen-negative transepithelial voltage driving ROMK K+ secretion into urine. In patients with reduced GFR, diabetes, or baseline potassium > 4.5 mEq/L, this combination frequently precipitates life-threatening hyperkalemia (> 6.0 mEq/L) and hyperkalemic metabolic acidosis (Type 4 RTA).",
    clinicalRisks: [
      "Life-threatening hyperkalemia (peaked T waves, PR prolongation, widened QRS, ventricular arrest)",
      "Type 4 renal tubular acidosis (hyperkalemic non-anion gap metabolic acidosis)",
      "Worsening renal function and oliguria",
    ],
    monitoredParameters: [
      "Baseline and serial serum potassium (1 week, 2 weeks, monthly)",
      "Serum creatinine and estimated GFR",
      "12-lead ECG if serum K+ exceeds 5.5 mEq/L",
    ],
    mitigationPhysiology:
      "Mitigation relies on strict patient selection, avoiding potassium supplements, maintaining cautious titration, monitoring serial serum potassium, and having clear thresholds for temporary dose suspension if serum potassium exceeds 5.0 to 5.5 mEq/L.",
    literatureCitation: "Palmer BF, Clegg DJ. Physiology and pathophysiology of potassium homeostasis. Adv Physiol Educ. 2016;40(4):480-490.",
  },
  {
    id: "sglt2-loop-hypovolemia",
    title: "Synergistic Proximal & Loop Natriuresis: Volume Depletion & Orthostasis (SGLT2i + Loop Diuretic)",
    severity: "moderate",
    summary: "Coupled osmotic glucosuria in the PCT and high-ceiling natriuresis in the TAL causing additive volume contraction.",
    mechanismsInvolved: {
      tubularTransport: "SGLT2 inhibitors block proximal glucose and sodium uptake (1-2% FE_Na + osmotic diuresis). Loop diuretics block NKCC2 in the TAL (20-25% FE_Na).",
      hormonalResponse: "Additive fluid loss accelerates secondary renin-angiotensin-aldosterone activation.",
      hemodynamicConsequence: "Potentiated reduction in effective circulating volume, arterial blood pressure, and intraglomerular capillary hydrostatic pressure.",
    },
    triggerDrugClasses: ["SGLT2 Inhibitor", "Loop Diuretic"],
    interactingDrugIds: ["empagliflozin", "dapagliflozin", "canagliflozin", "furosemide", "torsemide", "bumetanide"],
    pathophysiologyDetail:
      "SGLT2 inhibitors produce modest natriuresis and substantial osmotic diuresis via unabsorbed luminal glucose. When combined with a potent loop diuretic, the additive solute and water loss from both the PCT and TAL can precipitate rapid intravascular volume contraction, particularly in elderly patients or those with heart failure on stable loop diuretic regimens. This can manifest as symptomatic orthostatic hypotension, falls, and a transient rise in serum creatinine reflecting prerenal hypoperfusion.",
    clinicalRisks: [
      "Symptomatic orthostatic hypotension, syncope, and fall injuries",
      "Prerenal azotemia and transient eGFR decline",
      "Hemoconcentration and increased hematocrit",
    ],
    monitoredParameters: [
      "Orthostatic blood pressure and heart rate",
      "Serum creatinine, BUN, and hematocrit",
      "Weight trends and clinical volume status",
    ],
    mitigationPhysiology:
      "Physiological monitoring involves assessing clinical volume status prior to initiating SGLT2 inhibitors in patients on background loop diuretics, anticipating additive natriuresis, and monitoring fluid balance.",
    literatureCitation: "Reilly RF, Jackson EK. Chapter 25: Regulation of volume and osmolality of the extracellular fluid. Goodman & Gilman's 14th ed. 2023.",
  },
];

// ============================================================================
// 5. HELPER FUNCTIONS
// ============================================================================

/**
 * Returns all 5 nephron segments with comprehensive physiological and pharmacological modeling.
 */
export function getAllNephronSegments(): readonly NephronSegment[] {
  return NEPHRON_SEGMENTS;
}

/**
 * Returns a specific nephron segment by ID.
 */
export function getNephronSegmentById(id: NephronSegmentId | string): NephronSegment | undefined {
  return NEPHRON_SEGMENTS.find((s) => s.id === id);
}

/**
 * Returns all mapped nephron transporters across all 5 segments.
 */
export function getAllNephronTransporters(): readonly NephronTransporter[] {
  return NEPHRON_TRANSPORTERS;
}

/**
 * Returns all transporters mapped to a specific segment.
 */
export function getTransportersBySegment(segmentId: NephronSegmentId): NephronTransporter[] {
  return NEPHRON_TRANSPORTERS.filter((t) => t.segmentId === segmentId);
}

/**
 * Returns all structured diuretic class comparative profiles.
 */
export function getDiureticClassProfiles(): readonly DiureticClassProfile[] {
  return DIURETIC_CLASS_PROFILES;
}

/**
 * Returns a specific diuretic class profile by ID.
 */
export function getDiureticClassById(id: DiureticClassId | string): DiureticClassProfile | undefined {
  return DIURETIC_CLASS_PROFILES.find((p) => p.id === id);
}

/**
 * Detects high-yield nephrology and diuretic collisions given a list of drug IDs.
 */
export function detectRenalCollisions(drugIds: string[]): Array<{
  collision: RenalCollision;
  matchedDrugIds: string[];
  triggeredBy: string[];
}> {
  if (!drugIds || drugIds.length === 0) return [];

  // Normalize input drug IDs (handle hydrochlorothiazide vs hctz)
  const normalizedIds = new Set<string>();
  for (const id of drugIds) {
    normalizedIds.add(id);
    if (id === "hctz") normalizedIds.add("hydrochlorothiazide");
    if (id === "hydrochlorothiazide") normalizedIds.add("hctz");
  }

  // Classification lookup sets
  const loopDiuretics = new Set(["furosemide", "torsemide", "bumetanide"]);
  const thiazides = new Set(["hydrochlorothiazide", "hctz", "chlorthalidone", "metolazone", "indapamide"]);
  const aceiArbs = new Set([
    "lisinopril",
    "losartan",
    "enalapril",
    "valsartan",
    "ramipril",
    "candesartan",
    "telmisartan",
    "benazepril",
    "olmesartan",
  ]);
  const nsaids = new Set([
    "ibuprofen",
    "naproxen",
    "ketorolac",
    "celecoxib",
    "indomethacin",
    "meloxicam",
    "diclofenac",
    "aspirin",
  ]);
  const potassiumSparing = new Set([
    "spironolactone",
    "eplerenone",
    "amiloride",
    "triamterene",
  ]);
  const sglt2s = new Set(["empagliflozin", "dapagliflozin", "canagliflozin"]);

  const matchedCollisions: Array<{
    collision: RenalCollision;
    matchedDrugIds: string[];
    triggeredBy: string[];
  }> = [];

  // 1. Triple Whammy: ACEi/ARB + Loop Diuretic + NSAID
  const hasAceiArb = [...normalizedIds].filter((id) => {
    if (aceiArbs.has(id)) return true;
    const d = DRUG_BY_ID[id];
    return d && (d.cls.includes("ACE") || d.cls.includes("ARB") || d.pd.includes("acei-arb"));
  });
  const hasLoop = [...normalizedIds].filter((id) => loopDiuretics.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("loop diuretic"));
  const hasNsaid = [...normalizedIds].filter((id) => nsaids.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("nsaid"));

  if (hasAceiArb.length > 0 && hasLoop.length > 0 && hasNsaid.length > 0) {
    const col = RENAL_COLLISIONS.find((c) => c.id === "triple-whammy")!;
    matchedCollisions.push({
      collision: col,
      matchedDrugIds: [...new Set([...hasAceiArb, ...hasLoop, ...hasNsaid])],
      triggeredBy: ["ACEi/ARB", "Loop Diuretic", "NSAID"],
    });
  }

  // 2. Sequential Nephron Blockade: Loop + Thiazide/Metolazone
  const hasThiazide = [...normalizedIds].filter((id) => thiazides.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("thiazide"));
  if (hasLoop.length > 0 && hasThiazide.length > 0) {
    const col = RENAL_COLLISIONS.find((c) => c.id === "sequential-nephron-blockade")!;
    matchedCollisions.push({
      collision: col,
      matchedDrugIds: [...new Set([...hasLoop, ...hasThiazide])],
      triggeredBy: ["Loop Diuretic", "Thiazide / Metolazone"],
    });
  }

  // 3. Contraction Alkalosis Risk: High-dose loop or multiple diuretics
  if (hasLoop.length > 0) {
    const col = RENAL_COLLISIONS.find((c) => c.id === "contraction-alkalosis-risk")!;
    matchedCollisions.push({
      collision: col,
      matchedDrugIds: hasLoop,
      triggeredBy: ["Loop Diuretic (Volume & Chloride Wasting)"],
    });
  }

  // 4. Lithium Nephrogenic DI & ENaC Axis (and amiloride interaction)
  const hasLithium = normalizedIds.has("lithium");
  const hasAmiloride = normalizedIds.has("amiloride");
  if (hasLithium) {
    const col = RENAL_COLLISIONS.find((c) => c.id === "lithium-ndi-enac")!;
    const matched = ["lithium"];
    const triggers = ["Lithium (ENaC cellular uptake)"];
    if (hasAmiloride) {
      matched.push("amiloride");
      triggers.push("Amiloride (Targeted ENaC Blockade Rescue)");
    }
    matchedCollisions.push({
      collision: col,
      matchedDrugIds: matched,
      triggeredBy: triggers,
    });
  }

  // 5. Dual RAAS / Hyperkalemia Hazard: ACEi/ARB + K+-sparing
  const hasKSparing = [...normalizedIds].filter((id) => potassiumSparing.has(id) || DRUG_BY_ID[id]?.pd.includes("k-sparing"));
  if (hasAceiArb.length > 0 && hasKSparing.length > 0) {
    const col = RENAL_COLLISIONS.find((c) => c.id === "dual-raas-hyperkalemia")!;
    matchedCollisions.push({
      collision: col,
      matchedDrugIds: [...new Set([...hasAceiArb, ...hasKSparing])],
      triggeredBy: ["ACEi/ARB", "Potassium-Sparing Diuretic"],
    });
  }

  // 6. SGLT2 + Loop Diuretic Potentiation
  const hasSglt2 = [...normalizedIds].filter((id) => sglt2s.has(id) || DRUG_BY_ID[id]?.cls.toLowerCase().includes("sglt2"));
  if (hasSglt2.length > 0 && hasLoop.length > 0) {
    const col = RENAL_COLLISIONS.find((c) => c.id === "sglt2-loop-hypovolemia")!;
    matchedCollisions.push({
      collision: col,
      matchedDrugIds: [...new Set([...hasSglt2, ...hasLoop])],
      triggeredBy: ["SGLT2 Inhibitor", "Loop Diuretic"],
    });
  }

  return matchedCollisions;
}

/**
 * Complete summary of active renal pharmacology for a set of drug IDs.
 */
export function getRenalPharmacologySummary(drugIds: string[]): {
  activeSegments: NephronSegment[];
  activeTransporters: NephronTransporter[];
  collisions: ReturnType<typeof detectRenalCollisions>;
  diureticClasses: DiureticClassProfile[];
} {
  const normalizedIds = new Set(drugIds);
  if (normalizedIds.has("hctz")) normalizedIds.add("hydrochlorothiazide");
  if (normalizedIds.has("hydrochlorothiazide")) normalizedIds.add("hctz");

  // Find active transporters
  const activeTransporters = NEPHRON_TRANSPORTERS.filter((t) =>
    t.inhibitedByDrugIds.some((id) => normalizedIds.has(id))
  );

  // Active segments
  const activeSegmentIds = new Set(activeTransporters.map((t) => t.segmentId));
  const activeSegments = NEPHRON_SEGMENTS.filter((s) => activeSegmentIds.has(s.id));

  // Collisions
  const collisions = detectRenalCollisions(drugIds);

  // Diuretic classes matched
  const diureticClasses = DIURETIC_CLASS_PROFILES.filter((p) =>
    p.representativeDrugIds.some((id) => normalizedIds.has(id))
  );

  return {
    activeSegments,
    activeTransporters,
    collisions,
    diureticClasses,
  };
}
