/**
 * Critical Care Vasopressor, Inotrope & Adrenergic Receptor Hemodynamics Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed critical care physicians, cardiologists, clinical pharmacologists,
 *   clinical pharmacists (PharmD), and supervised health-professions trainees.
 * - Displays transparent physiological, biochemical, and receptor-binding rationale
 *   derived from canonical peer-reviewed critical care and pharmacology literature
 *   (Goodman & Gilman, Surviving Sepsis Campaign, Marino's The ICU Book, Katzung).
 * - Enables independent clinical verification of the scientific basis of all findings.
 * - DOES NOT generate automated medical orders, prescription directives, closed-loop
 *   infusion pump controls, or definitive treatment decisions.
 *
 * Clinical Scope:
 * 1. Receptor Binding Selectivity Matrix:
 *    Models affinities and downstream signaling across alpha-1 (Gq), alpha-2 (Gi),
 *    beta-1 (Gs), beta-2 (Gs), V1a (Gq), AT1 (Gq), D1 (Gs), and D2 (Gi).
 * 2. Eight Master Drug Profiles:
 *    Norepinephrine, Epinephrine, Phenylephrine, Vasopressin, Dobutamine, Milrinone,
 *    Dopamine, Angiotensin II.
 * 3. Hemodynamic Trajectory Quantifier:
 *    MAP, SVR, CO/CI, HR, PVR, and MVO2 vectors.
 * 4. Epinephrine Hyperlactatemia Mechanics:
 *    Beta-2 skeletal muscle adenylyl cyclase activation -> accelerated aerobic glycolysis
 *    exceeding PDH oxidative capacity -> benign Type B hyperlactatemia vs Type A dysoxia.
 * 5. Acidemia-Induced Adrenergic Uncoupling:
 *    Arterial pH < 7.20 conformational G-protein uncoupling of alpha-1 and beta-1
 *    catecholamine receptors, contrasted with persistent V1a receptor responsiveness.
 * 6. Four Critical Receptor Clashes & Drug Collisions:
 *    - Beta-Blockers x Epinephrine (Unopposed alpha-1 afterload surge & reflex bradycardia)
 *    - MAO Inhibitors x Indirect-Acting Sympathomimetics (VMAT2 norepinephrine flood & hypertensive crisis)
 *    - Milrinone PDE3 Accumulation in Renal Impairment (Prolonged half-life & refractory hypotension)
 *    - Inotropes in Dynamic LVOT Obstruction / HOCM (Venturi effect worsening & hemodynamic collapse)
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

/**
 * Statutory Non-Device Clinical Decision Support disclaimer under FD&C Act § 520(o)(1)(E).
 */
export const VASOACTIVE_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational critical care pharmacodynamics engine is intended solely for licensed healthcare professionals and supervised health-professions students. It models receptor affinities, physiological second-messenger pathways, and published critical care pharmacokinetic parameters to enable independent review of the scientific rationale for vasoactive selection, hemodynamic trajectories, and receptor collisions. It does not provide automated diagnostic conclusions, does not generate infusion pump directives or prescription orders, and does not replace individualized bedside clinical evaluation or the FDA-approved Prescribing Information.";

// ============================================================================
// 1. RECEPTOR SELECTIVITY DEFINITIONS & TARGET REGISTRY
// ============================================================================

export type TargetReceptorId =
  | "alpha-1"
  | "alpha-2"
  | "beta-1"
  | "beta-2"
  | "V1a"
  | "AT1"
  | "D1"
  | "D2";

export type GProteinCoupling = "Gq" | "Gi" | "Gs";

export type AffinityTier =
  | "None"
  | "Weak"
  | "Moderate"
  | "Strong"
  | "Potent";

export type AffinityScore = 0 | 1 | 2 | 3 | 4;

export interface ReceptorTargetProfile {
  id: TargetReceptorId;
  name: string;
  family: "Adrenergic" | "Vasopressinergic" | "Angiotensinergic" | "Dopaminergic";
  gProtein: GProteinCoupling;
  secondMessenger: string;
  primaryTissues: string[];
  primaryHemodynamicEffect: string;
  molecularSignaling: string;
}

export const TARGET_RECEPTORS: Record<TargetReceptorId, ReceptorTargetProfile> = {
  "alpha-1": {
    id: "alpha-1",
    name: "Alpha-1 Adrenergic (α₁)",
    family: "Adrenergic",
    gProtein: "Gq",
    secondMessenger: "Phospholipase C (PLC) → IP3 + DAG → Intracellular Ca²⁺ mobilization",
    primaryTissues: ["Vascular smooth muscle", "Radial pupillary muscle", "Urinary bladder sphincter"],
    primaryHemodynamicEffect: "Potent arteriolar and venous vasoconstriction → Increased SVR and increased MAP",
    molecularSignaling:
      "Gq activation stimulates PLC-beta to cleave PIP2 into IP3 and DAG. IP3 triggers calcium release from the sarcoplasmic reticulum. Elevated cytosolic Ca2+ binds calmodulin, activating Myosin Light-Chain Kinase (MLCK), phosphorylating myosin regulatory light chains, and driving smooth muscle contraction and systemic vasoconstriction.",
  },
  "alpha-2": {
    id: "alpha-2",
    name: "Alpha-2 Adrenergic (α₂)",
    family: "Adrenergic",
    gProtein: "Gi",
    secondMessenger: "Adenylyl cyclase inhibition → Decreased intracellular cAMP, activated inward rectifier K⁺ channels",
    primaryTissues: ["Presynaptic adrenergic nerve terminals (central/peripheral)", "Vascular smooth muscle", "Platelets", "Pancreatic beta cells"],
    primaryHemodynamicEffect: "Presynaptic autoreceptor activation inhibits norepinephrine release (central sympatholysis); postsynaptic vascular α₂ causes peripheral vasoconstriction",
    molecularSignaling:
      "Gi alpha subunit inhibits adenylyl cyclase, lowering cAMP. Beta-gamma subunits activate G-protein-coupled inwardly rectifying potassium (GIRK) channels and inhibit N-type voltage-gated calcium channels, hyperpolarizing presynaptic sympathetic terminals and suppressing vesicular catecholamine exocytosis.",
  },
  "beta-1": {
    id: "beta-1",
    name: "Beta-1 Adrenergic (β₁)",
    family: "Adrenergic",
    gProtein: "Gs",
    secondMessenger: "Adenylyl cyclase activation → Increased cAMP → Protein Kinase A (PKA) activation",
    primaryTissues: ["Ventricular myocardium", "Sinoatrial (SA) node", "Atrioventricular (AV) node", "Juxtaglomerular cells"],
    primaryHemodynamicEffect: "Positive inotropy (contractility), chronotropy (heart rate), dromotropy (conduction), and lusitropy (relaxation rate); stimulates renin secretion",
    molecularSignaling:
      "Gs alpha subunit stimulates adenylyl cyclase, converting ATP to cAMP. cAMP activates PKA, which phosphorylates L-type calcium channels (Cav1.2), the ryanodine receptor (RyR2), and phospholamban (PLN). This augments systolic calcium influx and accelerates diastolic calcium reuptake into the sarcoplasmic reticulum via SERCA2a.",
  },
  "beta-2": {
    id: "beta-2",
    name: "Beta-2 Adrenergic (β₂)",
    family: "Adrenergic",
    gProtein: "Gs",
    secondMessenger: "Adenylyl cyclase activation → Increased cAMP → PKA activation",
    primaryTissues: ["Vascular smooth muscle (skeletal muscle, coronary beds)", "Bronchial smooth muscle", "Skeletal muscle sarcolemma", "Liver"],
    primaryHemodynamicEffect: "Arteriolar vasodilation (decreases SVR), bronchodilation, accelerates skeletal muscle aerobic glycolysis and cellular potassium uptake via Na⁺/K⁺-ATPase",
    molecularSignaling:
      "In vascular and bronchial smooth muscle, PKA phosphorylates and inactivates MLCK and phosphorylates phospholamban, sequestering calcium and provoking relaxation and vasodilation. In skeletal muscle, beta-2 activation stimulates glycogenolysis and membrane Na+/K+-ATPase, driving rapid aerobic glycolysis beyond mitochondrial pyruvate dehydrogenase capacity.",
  },
  "V1a": {
    id: "V1a",
    name: "Vasopressin 1a Receptor (V1a)",
    family: "Vasopressinergic",
    gProtein: "Gq",
    secondMessenger: "Phospholipase C (PLC) → IP3 + DAG → Intracellular Ca²⁺ surge; PKC closes K(ATP) channels",
    primaryTissues: ["Vascular smooth muscle", "Myometrium", "Platelets", "Hepatocytes"],
    primaryHemodynamicEffect: "Potent non-adrenergic vasoconstriction, increases SVR, closes K(ATP) channels; resistant to severe acidemia",
    molecularSignaling:
      "Agonism activates Gq, stimulating PLC to produce IP3 and DAG, inducing intracellular calcium release. Additionally, V1a signaling activates protein kinase C (PKC), which directly phosphorylates and closes ATP-sensitive potassium (K_ATP) channels in vascular smooth muscle. Unlike catecholaminergic receptors, V1a maintains high ligand binding affinity and intact G-protein coupling in severe acidosis (pH < 7.20).",
  },
  "AT1": {
    id: "AT1",
    name: "Angiotensin II Type 1 Receptor (AT1)",
    family: "Angiotensinergic",
    gProtein: "Gq",
    secondMessenger: "Phospholipase C (PLC) → IP3 + DAG → Ca²⁺ influx and calcium sensitization via Rho-kinase",
    primaryTissues: ["Vascular smooth muscle", "Adrenal cortex (zona glomerulosa)", "Kidney efferent arterioles", "Myocardium"],
    primaryHemodynamicEffect: "Potent systemic and renal efferent arteriolar vasoconstriction; stimulates aldosterone secretion; increases SVR and MAP independently of adrenergic receptors",
    molecularSignaling:
      "Gq-protein-coupled signaling triggers IP3/DAG release and activates RhoA/Rho-kinase pathways, which inhibit myosin light-chain phosphatase (MLCP), producing sustained calcium sensitization and profound vasoconstriction. Stimulates aldosterone release from the adrenal cortex and endogenous vasopressin secretion.",
  },
  "D1": {
    id: "D1",
    name: "Dopamine-1 Receptor (D1)",
    family: "Dopaminergic",
    gProtein: "Gs",
    secondMessenger: "Adenylyl cyclase activation → Increased intracellular cAMP → PKA activation",
    primaryTissues: ["Renal vascular beds", "Mesenteric / splanchnic arterial beds", "Coronary arteries", "Renal proximal tubules"],
    primaryHemodynamicEffect: "Vasodilation of renal, splanchnic, and coronary beds; stimulates tubular natriuresis and diuresis at low infusion rates",
    molecularSignaling:
      "Stimulates adenylyl cyclase via Gs, increasing cAMP and activating PKA in vascular smooth muscle cells of the renal and splanchnic circulation, leading to relaxation and decreased regional vascular resistance. In the proximal tubule, D1 activation inhibits apical Na+/H+ exchanger (NHE3) and basolateral Na+/K+-ATPase, promoting natriuresis.",
  },
  "D2": {
    id: "D2",
    name: "Dopamine-2 Receptor (D2)",
    family: "Dopaminergic",
    gProtein: "Gi",
    secondMessenger: "Adenylyl cyclase inhibition → Decreased cAMP; inhibits Ca²⁺ channels, opens K⁺ channels",
    primaryTissues: ["Presynaptic sympathetic nerve terminals", "Area postrema (CTZ)", "Anterior pituitary", "Coronary vasculature"],
    primaryHemodynamicEffect: "Inhibits presynaptic norepinephrine exocytosis; triggers nausea/vomiting centrally via chemoreceptor trigger zone; suppresses prolactin secretion",
    molecularSignaling:
      "Inhibits adenylyl cyclase and voltage-gated N-type calcium channels via Gi/o, hyperpolarizing presynaptic sympathetic terminals and reducing endogenous norepinephrine release. Centrally, D2 stimulation in the area postrema induces nausea and emesis.",
  },
};

// ============================================================================
// 2. HEMODYNAMIC TRAJECTORY PARAMETERS
// ============================================================================

export type HemodynamicDirection =
  | "surge"
  | "increase"
  | "neutral"
  | "decrease"
  | "marked-drop";

export interface HemodynamicVector {
  map: { direction: HemodynamicDirection; score: number };
  svr: { direction: HemodynamicDirection; score: number };
  coCi: { direction: HemodynamicDirection; score: number };
  hr: { direction: HemodynamicDirection; score: number };
  pvr: { direction: HemodynamicDirection; score: number };
  mvo2: { direction: HemodynamicDirection; score: number };
}

export interface HemodynamicImpact extends HemodynamicVector {
  rationale: string;
}

export function directionToScore(dir: HemodynamicDirection): number {
  switch (dir) {
    case "surge":
      return 2;
    case "increase":
      return 1;
    case "neutral":
      return 0;
    case "decrease":
      return -1;
    case "marked-drop":
      return -2;
  }
}

export function scoreToDirection(score: number): HemodynamicDirection {
  if (score >= 1.5) return "surge";
  if (score >= 0.5) return "increase";
  if (score <= -1.5) return "marked-drop";
  if (score <= -0.5) return "decrease";
  return "neutral";
}

// ============================================================================
// 3. MASTER VASOACTIVE DRUG PROFILES
// ============================================================================

export type VasoactiveDrugId =
  | "norepinephrine"
  | "epinephrine"
  | "phenylephrine"
  | "vasopressin"
  | "dobutamine"
  | "milrinone"
  | "dopamine"
  | "angiotensin-ii";

export interface VasoactiveDrugProfile {
  id: VasoactiveDrugId;
  name: string;
  brandNames: string[];
  drugClass: string;
  receptorAffinities: Record<TargetReceptorId, AffinityScore>;
  receptorTiers: Record<TargetReceptorId, AffinityTier>;
  doseDependentNotes?: string;
  hemodynamics: HemodynamicImpact;
  mechanismSummary: string;
  clinicalIndications: string[];
  halfLifeMinutes: number;
  primaryMetabolismClearance: string;
  monitoringRails: string[];
  typicalDosingRange: string;
  citations: string[];
}

export const VASOACTIVE_DRUG_PROFILES: Record<VasoactiveDrugId, VasoactiveDrugProfile> = {
  norepinephrine: {
    id: "norepinephrine",
    name: "Norepinephrine",
    brandNames: ["Levophed"],
    drugClass: "Potent Alpha-1/Beta-1 Catecholamine Vasopressor",
    receptorAffinities: {
      "alpha-1": 4,
      "alpha-2": 2,
      "beta-1": 3,
      "beta-2": 1,
      V1a: 0,
      AT1: 0,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "Potent",
      "alpha-2": "Moderate",
      "beta-1": "Strong",
      "beta-2": "Weak",
      V1a: "None",
      AT1: "None",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "At all standard critical care infusion rates (0.01–3.0 mcg/kg/min), alpha-1 vasoconstriction dominates. Beta-1 inotropy supports cardiac contractility and stroke volume, preventing the sharp drop in cardiac output seen with pure alpha-agonists.",
    hemodynamics: {
      map: { direction: "surge", score: 2 },
      svr: { direction: "surge", score: 2 },
      coCi: { direction: "neutral", score: 0 },
      hr: { direction: "neutral", score: 0 },
      pvr: { direction: "increase", score: 1 },
      mvo2: { direction: "increase", score: 1 },
      rationale:
        "Potent alpha-1 vasoconstriction markedly raises SVR and MAP. Modest beta-1 inotropic stimulation maintains stroke volume, while baroreflex buffering generally prevents excessive tachycardia, resulting in neutral or slightly variable heart rate and cardiac output. Modest increase in MVO2 due to afterload elevation.",
    },
    mechanismSummary:
      "First-line vasopressor in vasodilatory and septic shock. Endogenous catecholamine exerting intense alpha-1-mediated arterial and venous constriction with modest beta-1 myocyte inotropy. Reverses systemic vasoplegia, restores mean systemic filling pressure (Pmsf), and augments venous return (preload).",
    clinicalIndications: [
      "Septic Shock (Surviving Sepsis Campaign first-line vasopressor)",
      "Vasodilatory / Distributive Shock",
      "Neurogenic Shock (combined alpha-1 pressor and beta-1 chronotropic support)",
      "Post-cardiac arrest hemodynamic stabilization",
    ],
    halfLifeMinutes: 2.0,
    primaryMetabolismClearance:
      "Rapid neuronal and extraneuronal uptake (uptake-1 and uptake-2) followed by enzymatic metabolism by Catechol-O-methyltransferase (COMT) and Monoamine Oxidase (MAO) in liver, kidneys, and local tissues. Terminal elimination half-life ~1–2 minutes.",
    monitoringRails: [
      "Continuous arterial line blood pressure monitoring",
      "Assess peripheral perfusion (capillary refill, mottling score, lactate clearance)",
      "Monitor for excessive peripheral vasoconstriction, digital ischemia, and splanchnic hypoperfusion at high doses (>0.5 mcg/kg/min)",
      "Central venous access strongly preferred to avoid extravasation necrosis",
    ],
    typicalDosingRange: "0.01 to 3.0 mcg/kg/min IV continuous infusion (titrated to MAP target ≥ 65 mmHg)",
    citations: [
      "Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Intensive Care Med. 2021;47(11):1181-1247.",
      "De Backer D, et al. Comparison of dopamine and norepinephrine in the treatment of shock. N Engl J Med. 2010;362(9):779-789.",
    ],
  },

  epinephrine: {
    id: "epinephrine",
    name: "Epinephrine (Adrenaline)",
    brandNames: ["Adrenalin", "EpiPen"],
    drugClass: "Broad-Spectrum Alpha/Beta Adrenergic Vasopressor & Inotrope",
    receptorAffinities: {
      "alpha-1": 4,
      "alpha-2": 3,
      "beta-1": 4,
      "beta-2": 4,
      V1a: 0,
      AT1: 0,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "Potent",
      "alpha-2": "Strong",
      "beta-1": "Potent",
      "beta-2": "Potent",
      V1a: "None",
      AT1: "None",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "At low doses (<0.05 mcg/kg/min), beta-1 and beta-2 stimulation predominate, producing marked inotropy, chronotropy, and peripheral vasodilation (SVR may fall slightly or remain neutral). At higher doses (>0.1 mcg/kg/min), alpha-1 vasoconstriction overwhelms beta-2 vasodilation, resulting in marked SVR surge and profound pressor effect.",
    hemodynamics: {
      map: { direction: "surge", score: 2 },
      svr: { direction: "increase", score: 1 },
      coCi: { direction: "surge", score: 2 },
      hr: { direction: "surge", score: 2 },
      pvr: { direction: "neutral", score: 0 },
      mvo2: { direction: "surge", score: 2 },
      rationale:
        "Potent beta-1 inotropy and chronotropy substantially increase cardiac output and heart rate. Alpha-1 vasoconstriction drives MAP, while beta-2 vasodilation partially modulates SVR at lower doses. Markedly escalates myocardial oxygen consumption (MVO2) and arrhythmogenicity.",
    },
    mechanismSummary:
      "Non-selective potent agonist across all adrenergic receptors (alpha-1, alpha-2, beta-1, beta-2). Produces profound inotropy, chronotropy, and vasoconstriction. Stimulates skeletal muscle beta-2 receptors, inducing rapid aerobic glycolysis that leads to characteristically benign Type B hyperlactatemia.",
    clinicalIndications: [
      "Anaphylaxis & Anaphylactic Shock (first-line therapy)",
      "Cardiopulmonary Resuscitation (ACLS cardiac arrest)",
      "Refractory Septic Shock (second-line adjunct to norepinephrine)",
      "Cardiogenic Shock with severe hypoperfusion / post-cardiotomy syndrome",
      "Severe Bronchospasm & Status Asthmaticus",
    ],
    halfLifeMinutes: 2.5,
    primaryMetabolismClearance:
      "Rapidly cleared by cellular uptake and metabolism via COMT and MAO in the liver, kidney, and vascular endothelium. Negligible renal excretion of unchanged drug. Half-life ~2–3 minutes.",
    monitoringRails: [
      "Continuous cardiac rhythm monitoring for ventricular arrhythmias and sinus tachycardia",
      "Distinguish beta-2-mediated Type B hyperlactatemia from tissue dysoxia (evaluate ScvO2, venous-to-arterial CO2 gap, urine output)",
      "Monitor for hyperglycemia (glycogenolysis) and hypokalemia (beta-2-stimulated Na+/K+-ATPase shift)",
      "Watch for myocardial ischemia / dynamic ST-segment changes due to extreme MVO2 surge",
    ],
    typicalDosingRange: "0.01 to 1.0 mcg/kg/min IV continuous infusion; 0.3–0.5 mg IM for anaphylaxis",
    citations: [
      "Levy B, et al. Epinephrine versus norepinephrine for cardiogenic shock after acute myocardial infarction. J Am Coll Cardiol. 2018;72(2):173-182.",
      "Annane D, et al. Norepinephrine plus dobutamine versus epinephrine alone for management of septic shock: a randomised trial. Lancet. 2007;370(9588):676-684.",
    ],
  },

  phenylephrine: {
    id: "phenylephrine",
    name: "Phenylephrine",
    brandNames: ["Neo-Synephrine", "Vazculep"],
    drugClass: "Pure Selective Alpha-1 Adrenergic Vasopressor",
    receptorAffinities: {
      "alpha-1": 4,
      "alpha-2": 1,
      "beta-1": 0,
      "beta-2": 0,
      V1a: 0,
      AT1: 0,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "Potent",
      "alpha-2": "Weak",
      "beta-1": "None",
      "beta-2": "None",
      V1a: "None",
      AT1: "None",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "Pure alpha-1 agonist with zero direct beta-1 or beta-2 activity across all clinical doses. Escalating dose causes isolated systemic vasoconstriction and afterload elevation without inotropy.",
    hemodynamics: {
      map: { direction: "surge", score: 2 },
      svr: { direction: "surge", score: 2 },
      coCi: { direction: "decrease", score: -1 },
      hr: { direction: "decrease", score: -1 },
      pvr: { direction: "increase", score: 1 },
      mvo2: { direction: "increase", score: 1 },
      rationale:
        "Pure alpha-1 vasoconstriction produces sharp rise in SVR and MAP. Absence of beta-1 activity combined with carotid/aortic baroreceptor firing triggers prominent reflex bradycardia. Increased afterload without inotropic support frequently reduces stroke volume and overall cardiac output.",
    },
    mechanismSummary:
      "Direct-acting selective alpha-1 adrenergic agonist. Induces arteriolar vasoconstriction, increasing systemic vascular resistance and blood pressure. Lacks direct cardiac inotropic or chronotropic activity; induces baroreceptor-mediated vagal reflex bradycardia and can precipitate stroke volume reduction in patients with impaired left ventricular function.",
    clinicalIndications: [
      "Vasodilatory shock with tachyarrhythmias (where beta-1 stimulation is undesirable)",
      "Anesthesia-induced vasoplegia and spinal shock",
      "Dynamic LVOT obstruction (HOCM / SAM) — drug of choice to increase afterload and stent open the outflow tract",
      "Neurogenic shock without severe bradycardia",
    ],
    halfLifeMinutes: 5.0,
    primaryMetabolismClearance:
      "Metabolized primarily by hepatic Monoamine Oxidase (MAO-A) to 3-hydroxymandelic acid and phenolic conjugates. Elimination half-life ~5 minutes IV.",
    monitoringRails: [
      "Continuous arterial line monitoring",
      "Watch for reflex bradycardia and reductions in cardiac output / stroke volume",
      "Contraindicated in decompensated cardiogenic shock and low-output states due to afterload burden",
    ],
    typicalDosingRange: "0.1 to 5.0 mcg/kg/min IV continuous infusion (or 50–200 mcg IV push boluses)",
    citations: [
      "Morelli A, et al. Phenylephrine versus norepinephrine for initial hemodynamic support of patients with septic shock: a randomised, controlled trial. Crit Care. 2008;12(6):R143.",
      "Thiele RH, et al. The physiologic approach to hemodynamic support in critical care. Anesth Analg. 2011;113(6):1343-1363.",
    ],
  },

  vasopressin: {
    id: "vasopressin",
    name: "Vasopressin (Arginine Vasopressin / AVP)",
    brandNames: ["Vasostrict"],
    drugClass: "Non-Adrenergic Peptide Vasopressor (V1a Agonist)",
    receptorAffinities: {
      "alpha-1": 0,
      "alpha-2": 0,
      "beta-1": 0,
      "beta-2": 0,
      V1a: 4,
      AT1: 0,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "None",
      "alpha-2": "None",
      "beta-1": "None",
      "beta-2": "None",
      V1a: "Potent",
      AT1: "None",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "In septic shock, dosed as a non-titrated continuous infusion at a fixed rate of 0.03 units/min (or 0.01–0.04 units/min). Higher doses (>0.04 units/min) lack demonstrated benefit and dramatically increase risks of myocardial, mesenteric, and digital ischemia.",
    hemodynamics: {
      map: { direction: "surge", score: 2 },
      svr: { direction: "surge", score: 2 },
      coCi: { direction: "neutral", score: 0 },
      hr: { direction: "neutral", score: 0 },
      pvr: { direction: "neutral", score: 0 },
      mvo2: { direction: "neutral", score: 0 },
      rationale:
        "Selective V1a-mediated vasoconstriction increases SVR and MAP without direct adrenergic chronotropic or inotropic stimulation. Sparing of beta-1 receptors avoids tachyarrhythmias and excess MVO2 consumption. At low doses, pulmonary vascular resistance is preserved or mildly reduced via endothelial nitric oxide release.",
    },
    mechanismSummary:
      "Endogenous posterior pituitary nonapeptide hormone that selectively stimulates vascular smooth muscle V1a receptors (Gq-coupled), causing intracellular calcium release and closing K_ATP channels. Operates via non-adrenergic signaling, maintaining full pressor efficacy during severe acidemia (pH < 7.20) when catecholamine receptors are uncoupled.",
    clinicalIndications: [
      "Vasodilatory / Septic Shock (second-line adjunct at fixed 0.03 units/min to spare catecholamines)",
      "Vasoplegic shock post-cardiopulmonary bypass",
      "Severe acidemic shock (pH < 7.20) refractory to high-dose catecholamines",
      "Central Diabetes Insipidus / Post-hypophysectomy polyuria",
    ],
    halfLifeMinutes: 15.0,
    primaryMetabolismClearance:
      "Rapidly metabolized and cleared by hepatic and renal vascular vasopressinases and tissue peptidases. Half-life ~10–20 minutes.",
    monitoringRails: [
      "Fixed rate infusion at 0.03 units/min preferred over wide titration",
      "Monitor for cutaneous and digital necrosis, especially when co-administered with high-dose norepinephrine",
      "Assess for mesenteric ischemia and hyponatremia (V2-mediated renal free water retention)",
      "Monitor platelet count (V1a-mediated platelet aggregation)",
    ],
    typicalDosingRange: "0.03 units/min IV fixed continuous infusion (range 0.01–0.04 units/min)",
    citations: [
      "Russell JA, et al. Vasopressin versus norepinephrine infusion in patients with septic shock (VASST). N Engl J Med. 2008;358(9):877-887.",
      "Gordon AC, et al. Effect of early vasopressin vs norepinephrine on kidney failure in patients with septic shock: the VANISH randomized clinical trial. JAMA. 2016;316(5):509-518.",
    ],
  },

  dobutamine: {
    id: "dobutamine",
    name: "Dobutamine",
    brandNames: ["Dobutrex"],
    drugClass: "Synthetic Beta-1 Adrenergic Inotrope / Inodilator",
    receptorAffinities: {
      "alpha-1": 1,
      "alpha-2": 0,
      "beta-1": 4,
      "beta-2": 2,
      V1a: 0,
      AT1: 0,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "Weak",
      "alpha-2": "None",
      "beta-1": "Potent",
      "beta-2": "Moderate",
      V1a: "None",
      AT1: "None",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "Administered as a 50:50 racemic mixture. The (+)-enantiomer is a potent beta-1 and beta-2 agonist and competitive alpha-1 antagonist; the (-)-enantiomer is a potent alpha-1 agonist. The net clinical effect is predominant beta-1 inotropy with mild beta-2-mediated vasodilation.",
    hemodynamics: {
      map: { direction: "neutral", score: 0 },
      svr: { direction: "decrease", score: -1 },
      coCi: { direction: "surge", score: 2 },
      hr: { direction: "increase", score: 1 },
      pvr: { direction: "decrease", score: -1 },
      mvo2: { direction: "surge", score: 2 },
      rationale:
        "Potent beta-1 inotropy substantially elevates stroke volume and cardiac output. Concurrent beta-2 vascular stimulation decreases SVR and PVR ('inodilator' profile). Net MAP is typically neutral or slightly decreased if systemic vasodilation outpaces inotropic augmentation. Prominently accelerates MVO2.",
    },
    mechanismSummary:
      "Synthetic catecholamine designed for targeted inotropic support. Directly stimulates cardiac beta-1 receptors to augment myocardial contractility and stroke volume, with modest beta-2-mediated systemic and pulmonary vasodilation. Increases cardiac output while reducing left and right ventricular filling pressures.",
    clinicalIndications: [
      "Cardiogenic Shock with low cardiac index and elevated filling pressures",
      "Severe acute decompensated heart failure with hypoperfusion (Killip III/IV)",
      "Septic cardiomyopathy / persistent hypoperfusion despite adequate MAP and fluid loading (Surviving Sepsis Campaign)",
      "Pharmacologic stress echocardiography",
    ],
    halfLifeMinutes: 2.0,
    primaryMetabolismClearance:
      "Rapidly metabolized in tissues and liver by Catechol-O-methyltransferase (COMT) to 3-O-methyldobutamine and subsequent glucuronide conjugation. Elimination half-life ~2 minutes.",
    monitoringRails: [
      "Continuous ECG monitoring for ventricular ectopy, ventricular tachycardia, and atrial fibrillation",
      "Monitor blood pressure closely; can precipitate hypotension in under-resuscitated or hypovolemic patients",
      "Watch for myocardial ischemia / angina due to augmented myocardial oxygen consumption (MVO2)",
      "STRICT CONTRAINDICATION in dynamic LVOT obstruction (HOCM / SAM)",
    ],
    typicalDosingRange: "2.5 to 20.0 mcg/kg/min IV continuous infusion",
    citations: [
      "Hollenberg SM. Vasoactive drugs in circulatory shock. Am J Respir Crit Care Med. 2011;183(7):847-855.",
      "Levy B, et al. Vasopressors and inotropes in cardiogenic shock. Curr Opin Crit Care. 2015;21(4):369-375.",
    ],
  },

  milrinone: {
    id: "milrinone",
    name: "Milrinone",
    brandNames: ["Primacor"],
    drugClass: "Phosphodiesterase-3 (PDE3) Inhibitor / Non-Adrenergic Inodilator",
    receptorAffinities: {
      "alpha-1": 0,
      "alpha-2": 0,
      "beta-1": 0,
      "beta-2": 0,
      V1a: 0,
      AT1: 0,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "None",
      "alpha-2": "None",
      "beta-1": "None",
      "beta-2": "None",
      V1a: "None",
      AT1: "None",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "Non-receptor mechanism: selectively inhibits phosphodiesterase isozyme 3 (PDE3). Bypasses down-regulated or desensitized beta-1 adrenergic receptors, making it particularly effective in chronic heart failure patients receiving chronic beta-blocker therapy.",
    hemodynamics: {
      map: { direction: "decrease", score: -1 },
      svr: { direction: "marked-drop", score: -2 },
      coCi: { direction: "surge", score: 2 },
      hr: { direction: "increase", score: 1 },
      pvr: { direction: "marked-drop", score: -2 },
      mvo2: { direction: "increase", score: 1 },
      rationale:
        "Selective PDE3 inhibition increases intracellular cAMP, enhancing myocyte contractility and relaxation (positive inotropy and lusitropy) while provoking profound arteriolar vasodilation. SVR and PVR drop markedly. Net MAP frequently decreases, necessitating adequate volume or concurrent vasopressor support. MVO2 is moderately increased but partially buffered by significant afterload reduction.",
    },
    mechanismSummary:
      "Bipyridine non-catecholamine inodilator that selectively inhibits PDE3, retarding the breakdown of cAMP in cardiac myocytes and vascular smooth muscle. Enhances calcium influx and sarcoplasmic reticulum reuptake in the heart (inotropic and lusitropic) while inducing pronounced systemic and pulmonary vascular relaxation.",
    clinicalIndications: [
      "Acute decompensated biventricular heart failure refractory to conventional therapy",
      "Cardiogenic shock with elevated systemic and pulmonary vascular resistance",
      "Right ventricular failure and acute pulmonary arterial hypertension (reduces RV afterload via PVR reduction)",
      "Bridge to heart transplantation or mechanical circulatory support (LVAD)",
    ],
    halfLifeMinutes: 140.0, // ~2.3 hours in normal renal function, stretches to 10-24h in CKD
    primaryMetabolismClearance:
      "ELIMINATED OVER 80% TO 90% UNCHANGED BY RENAL EXCRETION via glomerular filtration and active tubular secretion. Half-life is 2.3–2.5 hours in healthy adults but extends to 10–24+ hours in renal impairment (CKD/ESRD), provoking severe drug accumulation, persistent vasodilation, and refractory hypotension.",
    monitoringRails: [
      "MANDATORY DOSE REDUCTION IN RENAL IMPAIRMENT: Adjust dose strictly by CrCl (CrCl < 50 mL/min requires 30–70% dose cuts; hold or avoid in dialysis/ESRD)",
      "Continuous invasive blood pressure monitoring for severe systemic hypotension",
      "Continuous telemetry for sustained ventricular tachycardia and atrial arrhythmias",
      "Monitor serum potassium and magnesium (hypokalemia dramatically heightens proarrhythmic risk)",
      "Do NOT administer rapid IV loading boluses in unstable ICU patients due to precipitous afterload collapse",
    ],
    typicalDosingRange: "0.125 to 0.75 mcg/kg/min IV continuous infusion (dose-adjusted for CrCl; loading doses generally omitted in ICU)",
    citations: [
      "Cuffe MS, et al. Short-term intravenous milrinone for acute exacerbation of chronic heart failure: a randomized controlled trial (OPTIME-CHF). JAMA. 2002;287(12):1541-1547.",
      "Giamouzis G, et al. Milrinone use in heart failure: contemporary perspectives. Card Fail Rev. 2022;8:e05.",
    ],
  },

  dopamine: {
    id: "dopamine",
    name: "Dopamine",
    brandNames: ["Intropin"],
    drugClass: "Dose-Dependent Mixed Dopaminergic & Adrenergic Catecholamine",
    receptorAffinities: {
      "alpha-1": 4, // at high doses
      "alpha-2": 2,
      "beta-1": 3, // at intermediate doses
      "beta-2": 1,
      V1a: 0,
      AT1: 0,
      D1: 4, // at low doses
      D2: 4, // at low doses
    },
    receptorTiers: {
      "alpha-1": "Potent",
      "alpha-2": "Moderate",
      "beta-1": "Strong",
      "beta-2": "Weak",
      V1a: "None",
      AT1: "None",
      D1: "Potent",
      D2: "Potent",
    },
    doseDependentNotes:
      "Pronounced dose-dependent receptor transitions: (1) Low dose (0.5–3 mcg/kg/min): D1/D2 agonism causing renal and mesenteric vasodilation (clinical 'renal protection' debunked); (2) Intermediate dose (3–10 mcg/kg/min): Beta-1 inotropy and chronotropy; (3) High dose (>10 mcg/kg/min): Alpha-1 vasoconstriction overwhelms dopaminergic and beta-2 vasodilation, raising SVR.",
    hemodynamics: {
      map: { direction: "increase", score: 1 },
      svr: { direction: "increase", score: 1 },
      coCi: { direction: "surge", score: 2 },
      hr: { direction: "surge", score: 2 },
      pvr: { direction: "increase", score: 1 },
      mvo2: { direction: "surge", score: 2 },
      rationale:
        "Dose-dependent trajectory. Intermediate and high doses markedly increase heart rate and cardiac contractility via beta-1 receptors and endogenous norepinephrine release. High doses increase SVR and MAP via alpha-1 vasoconstriction. Associated with significantly higher incidence of tachyarrhythmias and increased MVO2 compared to norepinephrine.",
    },
    mechanismSummary:
      "Immediate metabolic precursor of norepinephrine. Exhibits classic tripartite dose-dependent receptor engagement: D1/D2 vasodilation at low doses, beta-1 inotropy/chronotropy at intermediate doses, and alpha-1 vasoconstriction at high doses. Also promotes presynaptic vesicular norepinephrine release (indirect mechanism). SOAP II trial demonstrated higher tachyarrhythmia rates and excess cardiogenic shock mortality compared to norepinephrine.",
    clinicalIndications: [
      "Symptomatic or hemodynamically unstable sinus bradycardia (ACLS second-line)",
      "Cardiogenic shock with bradycardia and low systemic vascular resistance (second-line)",
      "Historical vasodilatory shock (now largely superseded by norepinephrine)",
    ],
    halfLifeMinutes: 2.0,
    primaryMetabolismClearance:
      "Rapidly metabolized in the liver, kidney, and plasma by MAO and COMT to homovanillic acid (HVA) and dihydroxyphenylacetic acid (DOPAC). Elimination half-life ~2 minutes.",
    monitoringRails: [
      "Continuous cardiac telemetry: high incidence of sinus tachycardia, atrial fibrillation, and ventricular arrhythmias",
      "Avoid in patients with preexisting tachyarrhythmias or acute coronary syndromes",
      "'Renal-dose dopamine' (1–3 mcg/kg/min) is ineffective for acute kidney injury prevention and NOT recommended",
      "MANDATORY CONTRAINDICATION with MAO Inhibitors due to indirect sympathomimetic release of norepinephrine",
    ],
    typicalDosingRange: "2 to 20 mcg/kg/min IV continuous infusion",
    citations: [
      "De Backer D, et al. Comparison of dopamine and norepinephrine in the treatment of shock. N Engl J Med. 2010;362(9):779-789.",
      "Bellomo R, et al. Low-dose dopamine in patients with early renal dysfunction: a placebo-controlled randomised trial. Lancet. 2000;356(9248):2139-2143.",
    ],
  },

  "angiotensin-ii": {
    id: "angiotensin-ii",
    name: "Angiotensin II",
    brandNames: ["Giapreza"],
    drugClass: "Synthetic Human Peptide Vasopressor (AT1 Agonist)",
    receptorAffinities: {
      "alpha-1": 0,
      "alpha-2": 0,
      "beta-1": 0,
      "beta-2": 0,
      V1a: 0,
      AT1: 4,
      D1: 0,
      D2: 0,
    },
    receptorTiers: {
      "alpha-1": "None",
      "alpha-2": "None",
      "beta-1": "None",
      "beta-2": "None",
      V1a: "None",
      AT1: "Potent",
      D1: "None",
      D2: "None",
    },
    doseDependentNotes:
      "Peptide hormone acting selectively at AT1 receptors. Initiated at 20 ng/kg/min and titrated up to 80 ng/kg/min during the first 3 hours, then maintenance typically 1.25 to 40 ng/kg/min. Units are nanograms/kg/min (not micrograms).",
    hemodynamics: {
      map: { direction: "surge", score: 2 },
      svr: { direction: "surge", score: 2 },
      coCi: { direction: "neutral", score: 0 },
      hr: { direction: "neutral", score: 0 },
      pvr: { direction: "increase", score: 1 },
      mvo2: { direction: "increase", score: 1 },
      rationale:
        "Selective AT1 agonism provokes intense systemic vasoconstriction, rapidly escalating SVR and MAP. Lacks direct beta-1 inotropic or chronotropic activity; cardiac output remains neutral or slightly reduced due to afterload load. Causes preferential renal efferent arteriolar vasoconstriction, potentially preserving GFR in septic shock.",
    },
    mechanismSummary:
      "Synthetic human octapeptide identical to endogenous angiotensin II. Stimulates Gq-protein-coupled AT1 receptors on vascular smooth muscle, activating PLC and Rho-kinase to trigger vasoconstriction. Operates entirely independently of adrenergic receptors, vasopressin receptors, and catecholamine metabolic pathways. Effective in refractory high-output vasodilatory shock (ATHOS-3 trial).",
    clinicalIndications: [
      "Refractory Septic and Vasodilatory Shock resistant to high-dose norepinephrine and vasopressin",
      "Acute Respiratory Distress Syndrome (ARDS) with vasodilatory shock",
      "Post-cardiopulmonary bypass vasoplegia",
    ],
    halfLifeMinutes: 1.0, // < 1 minute
    primaryMetabolismClearance:
      "Rapidly degraded within plasma and red blood cells by ubiquitous circulating aminopeptidases and endopeptidases into smaller inactive peptide fragments. Elimination half-life < 1 minute.",
    monitoringRails: [
      "Dosed in NANOGRAMS (ng/kg/min) — high hazard for 1000-fold pump programming errors",
      "High incidence of thromboembolic events (DVT, PE, arterial thrombosis): mandatory VTE prophylaxis unless contraindicated",
      "Titrate down as concurrent catecholamines are weaned to prevent severe rebound hypertension or peripheral ischemia",
      "Monitor peripheral perfusion (extremity cyanosis, digital necrosis)",
    ],
    typicalDosingRange: "Initiate at 20 ng/kg/min; titrate every 5 minutes by up to 15 ng/kg/min; maintenance 1.25–40 ng/kg/min (max 80 ng/kg/min)",
    citations: [
      "Khanna A, et al. Angiotensin II for the Treatment of Vasodilatory Shock (ATHOS-3). N Engl J Med. 2017;377(5):419-430.",
      "Busse LW, et al. The clinical use of angiotensin II in septic shock. Crit Care. 2020;24(1):282.",
    ],
  },
};

// ============================================================================
// 4. EPINEPHRINE HYPERLACTATEMIA MECHANICS (TYPE B vs TYPE A)
// ============================================================================

export interface EpinephrineHyperlactatemiaEvaluation {
  epinephrineActive: boolean;
  lactateMmolL: number;
  scvO2Pct?: number;
  pvaCo2GapMmHg?: number;
  isTypeBLactatemia: boolean;
  isTypeAHypoperfusion: boolean;
  classification:
    | "normal-lactate"
    | "benign-type-b-aerobic-glycolysis"
    | "type-a-tissue-dysoxia"
    | "indeterminate-mixed-lactatemia";
  headline: string;
  biochemicalMechanism: string;
  clinicalDifferentiation: string[];
  pearl: string;
}

/**
 * Evaluates whether observed hyperlactatemia during epinephrine administration
 * represents benign beta-2-stimulated aerobic glycolysis (Type B) or true
 * tissue hypoperfusion / anaerobic dysoxia (Type A).
 */
export function evaluateEpinephrineHyperlactatemia(params: {
  epinephrineActive: boolean;
  lactateMmolL: number;
  scvO2Pct?: number;
  pvaCo2GapMmHg?: number;
  urineOutputMlKgHr?: number;
}): EpinephrineHyperlactatemiaEvaluation {
  const { epinephrineActive, lactateMmolL, scvO2Pct, pvaCo2GapMmHg, urineOutputMlKgHr } = params;

  if (lactateMmolL <= 2.0) {
    return {
      epinephrineActive,
      lactateMmolL,
      scvO2Pct,
      pvaCo2GapMmHg,
      isTypeBLactatemia: false,
      isTypeAHypoperfusion: false,
      classification: "normal-lactate",
      headline: `Normal Serum Lactate (${lactateMmolL} mmol/L)`,
      biochemicalMechanism:
        "Normal baseline cellular respiration. Glycolytic flux matches mitochondrial pyruvate dehydrogenase (PDH) oxidative capacity.",
      clinicalDifferentiation: [
        "Serum lactate is within the normal physiologic range (≤ 2.0 mmol/L).",
        "Adequate cellular oxygen delivery (DO2) and oxidative phosphorylation.",
      ],
      pearl:
        "Normal lactate rules out significant systemic tissue dysoxia and indicates that beta-2 glycolytic flux is not currently saturating pyruvate clearance.",
    };
  }

  // Markers of adequate systemic perfusion:
  // ScvO2 >= 70% and P(v-a)CO2 gap < 6 mmHg, adequate urine output >= 0.5 mL/kg/h
  const hasAdequateScvO2 = scvO2Pct !== undefined ? scvO2Pct >= 70 : undefined;
  const hasAdequateCo2Gap = pvaCo2GapMmHg !== undefined ? pvaCo2GapMmHg < 6.0 : undefined;
  const hasAdequateUrine = urineOutputMlKgHr !== undefined ? urineOutputMlKgHr >= 0.5 : undefined;

  const perfusionMarkersAvailable =
    hasAdequateScvO2 !== undefined || hasAdequateCo2Gap !== undefined || hasAdequateUrine !== undefined;

  const isPerfusionPreserved =
    (hasAdequateScvO2 === true || hasAdequateScvO2 === undefined) &&
    (hasAdequateCo2Gap === true || hasAdequateCo2Gap === undefined) &&
    (hasAdequateUrine === true || hasAdequateUrine === undefined) &&
    perfusionMarkersAvailable;

  const isPerfusionImpaired =
    hasAdequateScvO2 === false || hasAdequateCo2Gap === false || hasAdequateUrine === false;

  let classification: EpinephrineHyperlactatemiaEvaluation["classification"] =
    "indeterminate-mixed-lactatemia";
  let isTypeB = false;
  let isTypeA = false;
  let headline = "";

  if (epinephrineActive && isPerfusionPreserved) {
    classification = "benign-type-b-aerobic-glycolysis";
    isTypeB = true;
    headline = `BENIGN TYPE B EPINEPHRINE HYPERLACTATEMIA (${lactateMmolL} mmol/L): Aerobic Glycolytic Surge`;
  } else if (isPerfusionImpaired) {
    classification = "type-a-tissue-dysoxia";
    isTypeA = true;
    headline = `CRITICAL TYPE A HYPOPERFUSION LACTATEMIA (${lactateMmolL} mmol/L): Tissue Dysoxia / Microvascular Failure`;
  } else if (epinephrineActive) {
    classification = "indeterminate-mixed-lactatemia";
    isTypeB = true;
    headline = `Epinephrine-Associated Hyperlactatemia (${lactateMmolL} mmol/L): Assess Perfusion Biomarkers`;
  } else {
    classification = "type-a-tissue-dysoxia";
    isTypeA = true;
    headline = `Pathologic Hyperlactatemia (${lactateMmolL} mmol/L) in Absence of Epinephrine: Investigate Hypoperfusion`;
  }

  const biochemicalMechanism =
    "Epinephrine stimulates skeletal muscle sarcolemmal beta-2 adrenergic receptors coupled to Gs proteins. Adenylyl cyclase activation leads to elevated intracellular cAMP and Protein Kinase A (PKA) activation. PKA stimulates glycogen phosphorylase (glycogenolysis) and activates the membrane Na+/K+-ATPase pump. Elevated ADP/AMP stimulates phosphofructokinase-1 (PFK-1), massively accelerating aerobic glycolysis. Cytosolic pyruvate is produced at a rate that vastly exceeds the maximal oxidative capacity of mitochondrial Pyruvate Dehydrogenase (PDH). Excess pyruvate is converted into lactate by Lactate Dehydrogenase (LDH) to regenerate NAD+, resulting in significant hyperlactatemia despite abundant oxygen delivery and normal tissue perfusion.";

  const clinicalDifferentiation = [
    "Type B2 Aerobic Glycolysis (Epinephrine-Induced): Characterized by preserved or elevated central venous oxygen saturation (ScvO2 ≥ 70%), normal venoarterial carbon dioxide gap (P(v-a)CO2 < 6 mmHg), warm extremities, brisk capillary refill (< 2 sec), and stable or improving urine output. Lactate-to-pyruvate (L:P) ratio remains normal (~10:1 to 15:1).",
    "Type A Anaerobic Tissue Dysoxia (Septic / Cardiogenic Shock): Characterized by systemic cellular hypoperfusion, ScvO2 < 70%, wide P(v-a)CO2 gap (≥ 6 mmHg), oliguria (< 0.5 mL/kg/h), mottled extremities, and elevated lactate-to-pyruvate ratio (> 25:1 to 30:1).",
    "Diagnostic Pitfall: Escalating vasopressor support or administering excessive crystalloid volume in response to rising lactate solely driven by epinephrine represents a serious clinical error. Evaluate the clinical triad: MAP, ScvO2, and microcirculatory perfusion markers.",
  ];

  const pearl =
    "Epinephrine-induced lactate elevation is a pharmacodynamic signature of beta-2 adrenergic stimulation, not an indicator of resuscitation failure. If ScvO2 is ≥70%, P(v-a)CO2 gap is <6 mmHg, and urine output is adequate, rising lactate (often climbing to 4–8 mmol/L) does NOT necessitate changing vasopressors or administering more fluid.";

  return {
    epinephrineActive,
    lactateMmolL,
    scvO2Pct,
    pvaCo2GapMmHg,
    isTypeBLactatemia: isTypeB,
    isTypeAHypoperfusion: isTypeA,
    classification,
    headline,
    biochemicalMechanism,
    clinicalDifferentiation,
    pearl,
  };
}

// ============================================================================
// 5. ACIDEMIA-INDUCED ADRENERGIC UNCOUPLING
// ============================================================================

export interface AcidemiaUncouplingEvaluation {
  arterialPh: number;
  isAcidemicUncouplingRisk: boolean;
  uncouplingSeverity: "none" | "mild" | "moderate" | "severe-adrenergic-uncoupling";
  estimatedCatecholamineResponsivenessPct: number;
  estimatedVasopressinResponsivenessPct: number;
  headline: string;
  molecularMechanism: string;
  scientificRationaleForVasopressin: string;
  clinicalAction: string;
  pearl: string;
}

/**
 * Models conformational uncoupling of adrenergic receptors from G-proteins during
 * severe acidemia (pH < 7.20) and the scientific rationale for early non-adrenergic
 * vasopressor initiation (Vasopressin / Angiotensin II).
 */
export function evaluateAcidemiaAdrenergicUncoupling(
  arterialPh: number,
  activeVasoactiveIds: string[],
): AcidemiaUncouplingEvaluation {
  const hasCatecholamines = activeVasoactiveIds.some((id) =>
    ["norepinephrine", "epinephrine", "phenylephrine", "dopamine", "dobutamine"].includes(id.toLowerCase()),
  );
  const hasVasopressin = activeVasoactiveIds.some((id) => id.toLowerCase() === "vasopressin");
  const hasAngiotensin = activeVasoactiveIds.some((id) => id.toLowerCase() === "angiotensin-ii");

  let uncouplingSeverity: AcidemiaUncouplingEvaluation["uncouplingSeverity"] = "none";
  let catecholamineResp = 100;
  let vasopressinResp = 100;
  let headline = "";

  if (arterialPh >= 7.35) {
    uncouplingSeverity = "none";
    catecholamineResp = 100;
    vasopressinResp = 100;
    headline = `Physiologic Arterial pH (${arterialPh}): Intact Adrenergic & Vasopressin Receptor Coupling`;
  } else if (arterialPh >= 7.25) {
    uncouplingSeverity = "mild";
    catecholamineResp = 85;
    vasopressinResp = 95;
    headline = `Mild Acidemia (pH ${arterialPh}): Preserved Adrenergic Signaling`;
  } else if (arterialPh >= 7.20) {
    uncouplingSeverity = "moderate";
    catecholamineResp = 65;
    vasopressinResp = 90;
    headline = `Moderate Acidemia (pH ${arterialPh}): Emerging Adrenergic Desensitization`;
  } else {
    // pH < 7.20: Severe uncoupling threshold
    uncouplingSeverity = "severe-adrenergic-uncoupling";
    if (arterialPh < 7.10) {
      catecholamineResp = 30;
      vasopressinResp = 85;
      headline = `CRITICAL ACIDEMIA UNCOUPLING (pH ${arterialPh} < 7.10): Severe Catecholamine Resistance`;
    } else {
      catecholamineResp = 45;
      vasopressinResp = 85;
      headline = `SEVERE ACIDEMIA (pH ${arterialPh} < 7.20): Adrenergic Receptor G-Protein Uncoupling`;
    }
  }

  const isAcidemicUncouplingRisk = arterialPh < 7.20;

  const molecularMechanism =
    "Severe extracellular and intracellular acidemia (arterial pH < 7.20) impairs vascular smooth muscle contractility via multi-hit molecular mechanisms: (1) Protonation of critical histidine and aspartate residues in the transmembrane binding pockets of alpha-1 (Gq) and beta-1 (Gs) receptors induces steric conformational changes that prevent efficient G-protein coupling; (2) Intracellular acidosis and ATP depletion activate ATP-sensitive potassium (K_ATP) channels, hyperpolarizing the vascular smooth muscle cell membrane and blocking L-type voltage-gated calcium entry; (3) Inflammatory upregulation of inducible Nitric Oxide Synthase (iNOS) overproduces NO, activating soluble guanylyl cyclase (sGC) and protein kinase G (PKG), provoking refractory vascular relaxation; (4) Desensitization of the contractile apparatus via calcium desensitization of myosin light-chain kinase.";

  const scientificRationaleForVasopressin =
    "Vasopressin V1a receptors retain high ligand binding affinity and intact Gq signaling across severely acidotic pH ranges (pH 6.80–7.15) where alpha-1 and beta-1 receptors are largely uncoupled. Crucially, vasopressin V1a activation stimulates protein kinase C (PKC), which directly phosphorylates and CLOSES open K_ATP channels, restoring resting membrane potential and permitting extracellular calcium entry into vascular smooth muscle. Furthermore, vasopressin suppresses iNOS induction. This provides the primary scientific and physiological rationale for early initiation of vasopressin (fixed dose 0.03 units/min) and/or angiotensin II in acidemic vasodilatory and septic shock.";

  let clinicalAction = "";
  if (isAcidemicUncouplingRisk) {
    if (hasCatecholamines && !hasVasopressin && !hasAngiotensin) {
      clinicalAction =
        "RATIONALE FOR EARLY NON-ADRENERGIC VASOPRESSOR: Escalating norepinephrine or epinephrine alone into high dose ranges (>0.5 mcg/kg/min) yields diminishing pressor returns while escalating tachyarrhythmias and digital ischemia. Add non-adrenergic Vasopressin (fixed 0.03 units/min) or Angiotensin II to bypass uncoupled adrenergic pathways and restore vascular tone.";
    } else if (hasVasopressin) {
      clinicalAction =
        "Vasopressin is actively on desk, providing non-adrenergic V1a pressor coverage resilient to severe acidosis. Maintain fixed infusion rate (0.03 units/min) and titrate catecholamines as background vascular tone recovers.";
    } else {
      clinicalAction =
        "Address underlying etiology of severe acidemia (ventilation, source control, volume status, renal replacement therapy). Consider non-adrenergic pressors if pressor escalation is required.";
    }
  } else {
    clinicalAction =
      "Arterial pH is above the critical uncoupling threshold (≥ 7.20). Standard adrenergic pressor responsiveness is maintained.";
  }

  const pearl =
    "At pH < 7.20, catecholamines hit a ceiling of diminishing returns because alpha-1 receptors uncouple from Gq proteins and K_ATP channels open. Vasopressin V1a receptors do NOT uncouple and actively close K_ATP channels. In severe septic shock with acidosis, adding vasopressin early is physiologically superior to escalating norepinephrine to extreme levels.";

  return {
    arterialPh,
    isAcidemicUncouplingRisk,
    uncouplingSeverity,
    estimatedCatecholamineResponsivenessPct: catecholamineResp,
    estimatedVasopressinResponsivenessPct: vasopressinResp,
    headline,
    molecularMechanism,
    scientificRationaleForVasopressin,
    clinicalAction,
    pearl,
  };
}

// ============================================================================
// 6. CRITICAL RECEPTOR CLASHES & DRUG COLLISIONS
// ============================================================================

export type CollisionCategory =
  | "beta-blocker-epinephrine-unopposed-alpha"
  | "maoi-indirect-sympathomimetic-crisis"
  | "milrinone-renal-accumulation"
  | "inotrope-lvot-obstruction-hocm";

export interface VasoactiveCollision {
  category: CollisionCategory;
  severity: "contraindicated" | "major";
  perpetratorDrugIds: string[];
  victimDrugIds: string[];
  headline: string;
  molecularReceptorMechanism: string;
  hemodynamicConsequence: string;
  clinicalAction: string;
  antidoteOrRescueStrategy: string;
  monitoringRails: string[];
  citations: string[];
}

export const BETA_BLOCKER_IDS = new Set([
  "propranolol",
  "metoprolol",
  "labetalol",
  "labetalol-ob",
  "atenolol",
  "carvedilol",
  "esmolol",
  "nadolol",
  "bisoprolol",
  "timolol",
  "nebivolol",
  "sotalol",
]);

export const MAOI_IDS = new Set([
  "phenelzine",
  "tranylcypromine",
  "linezolid",
  "isocarboxazid",
  "selegiline",
  "rasagiline",
  "safinamide",
  "moclobemide",
  "methylene-blue",
]);

export const INDIRECT_SYMPATHOMIMETIC_IDS = new Set([
  "ephedrine",
  "pseudoephedrine",
  "amphetamine",
  "dextroamphetamine",
  "amphetamine-mixed-salts-ir",
  "amphetamine-mixed-salts-xr",
  "amphetamine-odt",
  "methamphetamine",
  "methylphenidate",
  "lisdexamfetamine",
  "dopamine",
]);

export const INOTROPE_IDS = new Set([
  "dobutamine",
  "epinephrine",
  "dopamine",
  "isoproterenol",
  "milrinone",
]);

/**
 * Scans a drug list and clinical host parameters for the four critical vasoactive collisions.
 */
export function findVasoactiveCollisions(params: {
  drugIds: string[];
  host?: HostContext;
  hasLvotObstructionOrHocm?: boolean;
  crClMlMin?: number;
}): VasoactiveCollision[] {
  const { drugIds, host, hasLvotObstructionOrHocm, crClMlMin } = params;
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  const collisions: VasoactiveCollision[] = [];

  const detectedBb = normalized.filter((id) => BETA_BLOCKER_IDS.has(id));
  const detectedMaoi = normalized.filter((id) => MAOI_IDS.has(id));
  const detectedIndirect = normalized.filter((id) => INDIRECT_SYMPATHOMIMETIC_IDS.has(id));
  const hasEpi = normalized.includes("epinephrine");
  const hasMilrinone = normalized.includes("milrinone");
  const detectedInotropes = normalized.filter((id) => INOTROPE_IDS.has(id));

  // --------------------------------------------------------------------------
  // Collision 1: Beta-Blockers x Epinephrine (Unopposed Alpha-1 Surge)
  // --------------------------------------------------------------------------
  if (hasEpi && detectedBb.length > 0) {
    const bbNames = detectedBb.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
    collisions.push({
      category: "beta-blocker-epinephrine-unopposed-alpha",
      severity: "contraindicated",
      perpetratorDrugIds: detectedBb,
      victimDrugIds: ["epinephrine"],
      headline: `Beta-Blocker (${bbNames}) × Epinephrine: Unopposed Alpha-1 Afterload Surge & Severe Reflex Bradycardia`,
      molecularReceptorMechanism:
        "Beta-adrenergic receptor blockade (especially non-selective beta-blockers like propranolol, nadolol, labetalol, or high-dose metoprolol) completely blocks vascular beta-2 receptors, preventing physiologic vasodilation. When epinephrine is administered, its intense alpha-1 agonism is left completely UNOPPOSED by beta-2 vasodilation. Concurrently, myocardial beta-1 receptors are blocked, preventing the heart from mounting compensatory inotropic or chronotropic responses against the surging afterload.",
      hemodynamicConsequence:
        "Catastrophic systemic vascular resistance spike (SVR surges abruptly to > 2500–3500 dynes·s·cm⁻⁵), driving malignant hypertension. Aortic and carotid baroreceptor firing combined with direct beta-1 blockade precipitates severe reflex vagal bradycardia (heart rates plummeting to 30–40 bpm or asystole), acute left ventricular afterload mismatch, pulmonary edema, myocardial infarction, and intracranial hemorrhage.",
      clinicalAction:
        "CONTRAINDICATION / EXTREME CAUTION: In beta-blocked patients requiring pressor support, avoid epinephrine boluses and infusions. If anaphylaxis occurs in a beta-blocked patient and is refractory to epinephrine, DO NOT repeatedly escalate epinephrine doses.",
      antidoteOrRescueStrategy:
        "ADMINISTER INTRAVENOUS GLUCAGON (1 to 5 mg IV over 5 minutes, followed by 1 to 5 mg/hour IV infusion). Glucagon binds to independent glucagon G-protein receptors, bypassing beta-adrenergic receptors to directly activate adenylyl cyclase, generate cAMP, and restore cardiac inotropy and chronotropy. For severe hypertensive crisis with afterload mismatch, administer IV phentolamine (alpha-1 antagonist, 5 mg IV) or nitroprusside.",
      monitoringRails: [
        "Continuous 12-lead ECG and arterial line blood pressure monitoring",
        "Monitor for acute flash pulmonary edema and left ventricular failure",
        "Have IV Glucagon and IV Atropine/Pacing at bedside immediately",
      ],
      citations: [
        "Korenblat P, et al. Anaphylaxis in the patient receiving beta-blocker therapy: challenges and solutions. Clin Exp Allergy. 2006;36(8):979-985.",
        "Thomas SH, et al. Severe hypertension and bradycardia associated with epinephrine in a beta-blocked patient. J Accid Emerg Med. 1996;13(3):209-211.",
      ],
    });
  }

  // --------------------------------------------------------------------------
  // Collision 2: MAO Inhibitors x Indirect-Acting Sympathomimetics
  // --------------------------------------------------------------------------
  if (detectedMaoi.length > 0 && detectedIndirect.length > 0) {
    const maoiNames = detectedMaoi.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
    const indirectNames = detectedIndirect.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
    collisions.push({
      category: "maoi-indirect-sympathomimetic-crisis",
      severity: "contraindicated",
      perpetratorDrugIds: detectedMaoi,
      victimDrugIds: detectedIndirect,
      headline: `MAO Inhibitor (${maoiNames}) × Indirect Sympathomimetic (${indirectNames}): Vesicular Norepinephrine Flood & Hypertensive Crisis`,
      molecularReceptorMechanism:
        "Indirect-acting sympathomimetics (ephedrine, pseudoephedrine, amphetamines, and dopamine) enter presynaptic sympathetic nerve terminals via the norepinephrine transporter (NET) and trigger massive vesicular release of stored norepinephrine via VMAT2. Because Monoamine Oxidase (MAO-A) is irreversibly or reversibly inhibited, intraneuronal and synaptic catecholamine degradation is completely halted. The resulting tidal wave of unmetabolized norepinephrine floods into the synaptic cleft.",
      hemodynamicConsequence:
        "Hyperacute malignant hypertensive crisis (systolic blood pressure surging to > 220–250 mmHg), intense peripheral vasoconstriction, malignant hyperthermia / hyperpyrexia, acute encephalopathy, subarachnoid / intracranial hemorrhage, aortic dissection, and fatal ventricular tachyarrhythmias.",
      clinicalAction:
        "STRICT CONTRAINDICATION: Co-administration of MAOIs (including linezolid and methylene blue) with indirect-acting sympathomimetics is absolutely contraindicated. If pressor support is required during anesthesia or shock, DO NOT USE ephedrine or dopamine.",
      antidoteOrRescueStrategy:
        "USE CAREFULLY TITRATED DIRECT-ACTING VASOPRESSORS AT 10% TO 20% OF STANDARD STARTING DOSES (e.g. dilute direct phenylephrine or direct norepinephrine), or non-adrenergic Vasopressin. For acute hypertensive crisis: Administer IV Phentolamine (2.5 to 5 mg IV boluses every 5–10 minutes) or IV Nicardipine / Clevidipine infusion.",
      monitoringRails: [
        "Continuous arterial line blood pressure monitoring",
        "Neurological checks for intracranial hemorrhage and encephalopathy",
        "Continuous ECG for acute ST-segment changes and malignant ventricular arrhythmias",
      ],
      citations: [
        "Finberg JP. Inhibitors of MAO-A and MAO-B in Psychiatry and Neurology. Front Pharmacol. 2014;5:259.",
        "Gillman PK. Monoamine oxidase inhibitors, opioid analgesics and serotonin toxicity. Br J Anaesth. 2005;95(4):434-441.",
      ],
    });
  }

  // --------------------------------------------------------------------------
  // Collision 3: Milrinone PDE3 Accumulation in Renal Impairment
  // --------------------------------------------------------------------------
  const isCkd = host?.kidney === "ckd" || (crClMlMin !== undefined && crClMlMin < 50);
  if (hasMilrinone && isCkd) {
    const crClText = crClMlMin !== undefined ? `CrCl ${crClMlMin} mL/min` : "CKD";
    collisions.push({
      category: "milrinone-renal-accumulation",
      severity: "major",
      perpetratorDrugIds: ["renal-impairment"],
      victimDrugIds: ["milrinone"],
      headline: `Milrinone Accumulation in Renal Impairment (${crClText}): Prolonged Half-Life, Refractory Vasodilation & Arrhythmias`,
      molecularReceptorMechanism:
        "Milrinone is a selective phosphodiesterase-3 (PDE3) inhibitor that increases cAMP in cardiac myocytes and vascular smooth muscle ('inodilator'). Over 80% to 90% of milrinone is eliminated UNCHANGED in the urine via glomerular filtration and tubular secretion. In renal impairment (CrCl < 50 mL/min, ESRD), elimination half-life dramatically stretches from its normal 2.3–2.5 hours to 10–24+ hours.",
      hemodynamicConsequence:
        "Drug accumulation leads to persistent, uncontrolled systemic vasodilation (SVR collapses to < 500 dynes·s·cm⁻⁵), severe refractory hypotension unresponsive to volume, and life-threatening ventricular tachyarrhythmias (VT, VF) driven by excessive intracellular calcium cycling and cAMP-mediated electrophysiological instability.",
      clinicalAction:
        "MANDATORY DOSE REDUCTION & TITRATION RAILS: In patients with CrCl < 50 mL/min, reduce continuous infusion rate per FDA labeling: CrCl 50 mL/min → 0.43 mcg/kg/min; CrCl 40 mL/min → 0.38 mcg/kg/min; CrCl 30 mL/min → 0.33 mcg/kg/min; CrCl 20 mL/min → 0.28 mcg/kg/min; CrCl 10 mL/min → 0.23 mcg/kg/min. In severe ESRD/dialysis, avoid milrinone or consider alternative inotropes that undergo hepatic elimination (e.g., Dobutamine, which is metabolized via hepatic methylation and glucuronidation).",
      antidoteOrRescueStrategy:
        "Discontinue or down-titrate milrinone infusion immediately. Because half-life is >12–24 hours in renal failure, vasodilation will persist for days. If inotropic support remains mandatory, transition to hepatically metabolized inotropes (e.g. Dobutamine). Support systemic vascular resistance with alpha-1 vasopressors (Norepinephrine, Phenylephrine) or Vasopressin. Continuous Renal Replacement Therapy (CRRT) or high-flux hemodialysis can moderately accelerate clearance.",
      monitoringRails: [
        "Serial serum creatinine and calculated Cockcroft-Gault CrCl daily",
        "Continuous invasive arterial line blood pressure monitoring",
        "Continuous telemetry for sustained and non-sustained ventricular tachycardia",
        "Serial serum potassium and magnesium monitoring (maintain K > 4.0 mEq/L, Mg > 2.0 mg/dL)",
      ],
      citations: [
        "Cuffe MS, et al. Short-term intravenous milrinone for acute exacerbation of chronic heart failure (OPTIME-CHF). JAMA. 2002;287(12):1541-1547.",
        "Shipley JB, et al. Milrinone: basic actions and potential role in treating heart failure. Pharmacotherapy. 1996;16(5):789-808.",
      ],
    });
  }

  // --------------------------------------------------------------------------
  // Collision 4: Inotropes in Dynamic LVOT Obstruction (HOCM / SAM)
  // --------------------------------------------------------------------------
  if (hasLvotObstructionOrHocm && detectedInotropes.length > 0) {
    const inotropeNames = detectedInotropes.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");
    collisions.push({
      category: "inotrope-lvot-obstruction-hocm",
      severity: "contraindicated",
      perpetratorDrugIds: detectedInotropes,
      victimDrugIds: ["lvot-obstruction-hocm"],
      headline: `Inotrope (${inotropeNames}) in Dynamic LVOT Obstruction (HOCM / SAM): Venturi Collapse & Acute Hemodynamic Collapse`,
      molecularReceptorMechanism:
        "In hypertrophic obstructive cardiomyopathy (HOCM), asymmetric septal hypertrophy, or severe hypovolemic systolic anterior motion (SAM) of the mitral valve, the subaortic flow tract is narrowed. Inotropes (dobutamine, epinephrine, dopamine, isoproterenol) potently stimulate myocardial beta-1 receptors, hyper-accelerating ventricular contraction and heart rate. Concurrently, beta-2 vasodilation decreases systemic afterload. The hyperdynamic left ventricle ejects blood through the narrowed LVOT at extreme velocities, producing a profound Venturi effect that pulls the anterior mitral valve leaflet toward the hypertrophied septum.",
      hemodynamicConsequence:
        "Dynamic left ventricular outflow tract gradient surges precipitously (gradients commonly jump from 20 mmHg to > 100 mmHg), precipitating acute severe mitral regurgitation, catastrophic collapse in forward stroke volume, sudden electromechanical dissociation, and refractory cardiogenic shock.",
      clinicalAction:
        "ABSOLUTE CONTRAINDICATION: In dynamic LVOT obstruction, inotropes (dobutamine, epinephrine, dopamine) and systemic vasodilators (milrinone, nitrates, ACEi) are strictly contraindicated and lethal. IMMEDIATELY CEASE all inotropic infusions.",
      antidoteOrRescueStrategy:
        "TRIPARTITE RESCUE PROTOCOL FOR LVOT OBSTRUCTION / SAM: (1) Volume expansion (administer IV crystalloid or colloid boluses to expand LV end-diastolic volume and widen the subaortic channel); (2) Beta-blocker administration (e.g. IV esmolol or metoprolol to slow heart rate, lengthen diastolic filling time, and decrease hyperdynamic inotropy); (3) Pure alpha-1 vasopressor therapy with PHENYLEPHRINE. Phenylephrine increases SVR without stimulating contractility, increasing LV end-systolic volume, stenting open the LVOT, and abolishing the dynamic gradient.",
      monitoringRails: [
        "Bedside Point-of-Care Echocardiography (POCUS) / TTE / TEE to visualize SAM and measure LVOT Doppler velocity and gradient",
        "Invasive arterial line tracing displaying spike-and-dome (pulsus bisferiens) contour",
        "Maintain adequate preload and avoid tachycardia",
      ],
      citations: [
        "Maron BJ, et al. 2020 AHA/ACC Guideline for the Diagnosis and Treatment of Patients With Hypertrophic Cardiomyopathy. Circulation. 2020;142(25):e558-e631.",
        "Sherrid MV, et al. Mechanisms of dynamic left ventricular outflow tract obstruction in hypertrophic cardiomyopathy. J Am Coll Cardiol. 2003;41(12):2253-2262.",
      ],
    });
  }

  return collisions;
}

// ============================================================================
// 7. DESK DETECTION & COMPREHENSIVE REPORT GENERATOR
// ============================================================================

export interface VasoactiveOnDeskResult {
  hasVasoactive: boolean;
  vasoactiveDrugs: VasoactiveDrugProfile[];
  hasCatecholamines: boolean;
  hasNonAdrenergicVasopressors: boolean;
  hasInotropes: boolean;
  hasBetaBlockers: boolean;
  hasMaoisInhibitors: boolean;
  hasIndirectSympathomimetics: boolean;
  hasMilrinone: boolean;
  detectedDrugIds: string[];
  detectedVasoactiveIds: VasoactiveDrugId[];
  detectedBetaBlockerIds: string[];
  detectedMaoiIds: string[];
  detectedIndirectSympathomimeticIds: string[];
}

/**
 * Detection function that screens active drug IDs on the desk for vasoactive
 * agents, beta-blockers, MAOIs, and indirect-acting sympathomimetics.
 */
export function vasoactiveOnDesk(drugIds: string[]): VasoactiveOnDeskResult {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());

  const detectedVasoactiveIds = normalized.filter(
    (id): id is VasoactiveDrugId => id in VASOACTIVE_DRUG_PROFILES,
  );
  const vasoactiveDrugs = detectedVasoactiveIds.map((id) => VASOACTIVE_DRUG_PROFILES[id]);

  const detectedBetaBlockerIds = normalized.filter((id) => BETA_BLOCKER_IDS.has(id));
  const detectedMaoiIds = normalized.filter((id) => MAOI_IDS.has(id));
  const detectedIndirectSympathomimeticIds = normalized.filter((id) =>
    INDIRECT_SYMPATHOMIMETIC_IDS.has(id),
  );

  const hasCatecholamines = detectedVasoactiveIds.some((id) =>
    ["norepinephrine", "epinephrine", "phenylephrine", "dopamine", "dobutamine"].includes(id),
  );
  const hasNonAdrenergicVasopressors = detectedVasoactiveIds.some((id) =>
    ["vasopressin", "angiotensin-ii"].includes(id),
  );
  const hasInotropes = detectedVasoactiveIds.some((id) =>
    ["dobutamine", "epinephrine", "milrinone", "dopamine"].includes(id),
  );
  const hasMilrinone = detectedVasoactiveIds.includes("milrinone");

  return {
    hasVasoactive: detectedVasoactiveIds.length > 0,
    vasoactiveDrugs,
    hasCatecholamines,
    hasNonAdrenergicVasopressors,
    hasInotropes,
    hasBetaBlockers: detectedBetaBlockerIds.length > 0,
    hasMaoisInhibitors: detectedMaoiIds.length > 0,
    hasIndirectSympathomimetics: detectedIndirectSympathomimeticIds.length > 0,
    hasMilrinone,
    detectedDrugIds: normalized,
    detectedVasoactiveIds,
    detectedBetaBlockerIds,
    detectedMaoiIds,
    detectedIndirectSympathomimeticIds,
  };
}

export interface VasoactiveReportOptions {
  arterialPh?: number;
  lactateMmolL?: number;
  scvO2Pct?: number;
  pvaCo2GapMmHg?: number;
  urineOutputMlKgHr?: number;
  hasLvotObstructionOrHocm?: boolean;
  crClMlMin?: number;
}

export interface AggregatedHemodynamics {
  mapScore: number;
  svrScore: number;
  coCiScore: number;
  hrScore: number;
  pvrScore: number;
  mvo2Score: number;
  netMap: HemodynamicDirection;
  netSvr: HemodynamicDirection;
  netCoCi: HemodynamicDirection;
  netHr: HemodynamicDirection;
  netPvr: HemodynamicDirection;
  netMvo2: HemodynamicDirection;
  summary: string;
}

export interface VasoactiveReport {
  onDesk: VasoactiveOnDeskResult;
  activeDrugs: VasoactiveDrugProfile[];
  receptorsRegistry: Record<TargetReceptorId, ReceptorTargetProfile>;
  aggregatedHemodynamics?: AggregatedHemodynamics;
  hyperlactatemiaEvaluation?: EpinephrineHyperlactatemiaEvaluation;
  acidemiaEvaluation?: AcidemiaUncouplingEvaluation;
  collisions: VasoactiveCollision[];
  clinicalPearls: string[];
  disclaimer: string;
}

/**
 * Calculates the combined directional trajectory for a set of active vasoactive agents.
 */
export function aggregateHemodynamics(
  drugProfiles: VasoactiveDrugProfile[],
): AggregatedHemodynamics {
  if (drugProfiles.length === 0) {
    return {
      mapScore: 0,
      svrScore: 0,
      coCiScore: 0,
      hrScore: 0,
      pvrScore: 0,
      mvo2Score: 0,
      netMap: "neutral",
      netSvr: "neutral",
      netCoCi: "neutral",
      netHr: "neutral",
      netPvr: "neutral",
      netMvo2: "neutral",
      summary: "No vasoactive agents actively simulated.",
    };
  }

  let mapSum = 0;
  let svrSum = 0;
  let coCiSum = 0;
  let hrSum = 0;
  let pvrSum = 0;
  let mvo2Sum = 0;

  for (const drug of drugProfiles) {
    mapSum += drug.hemodynamics.map.score;
    svrSum += drug.hemodynamics.svr.score;
    coCiSum += drug.hemodynamics.coCi.score;
    hrSum += drug.hemodynamics.hr.score;
    pvrSum += drug.hemodynamics.pvr.score;
    mvo2Sum += drug.hemodynamics.mvo2.score;
  }

  // Mean scores normalized
  const count = drugProfiles.length;
  const avgMap = mapSum / count;
  const avgSvr = svrSum / count;
  const avgCoCi = coCiSum / count;
  const avgHr = hrSum / count;
  const avgPvr = pvrSum / count;
  const avgMvo2 = mvo2Sum / count;

  const netMap = scoreToDirection(avgMap);
  const netSvr = scoreToDirection(avgSvr);
  const netCoCi = scoreToDirection(avgCoCi);
  const netHr = scoreToDirection(avgHr);
  const netPvr = scoreToDirection(avgPvr);
  const netMvo2 = scoreToDirection(avgMvo2);

  const agentNames = drugProfiles.map((d) => d.name).join(" + ");
  const summary = `Multi-agent trajectory for [${agentNames}]: Net MAP is projected to ${netMap}, SVR to ${netSvr}, Cardiac Output/Index to ${netCoCi}, Heart Rate to ${netHr}, PVR to ${netPvr}, and Myocardial Oxygen Demand (MVO2) to ${netMvo2}.`;

  return {
    mapScore: Math.round(avgMap * 10) / 10,
    svrScore: Math.round(avgSvr * 10) / 10,
    coCiScore: Math.round(avgCoCi * 10) / 10,
    hrScore: Math.round(avgHr * 10) / 10,
    pvrScore: Math.round(avgPvr * 10) / 10,
    mvo2Score: Math.round(avgMvo2 * 10) / 10,
    netMap,
    netSvr,
    netCoCi,
    netHr,
    netPvr,
    netMvo2,
    summary,
  };
}

/**
 * Report generator for the critical care vasoactive kinetics engine.
 * Synthesizes receptor matrices, trajectory projections, hyperlactatemia mechanics,
 * acidemia uncoupling evaluations, and critical receptor collisions.
 */
export function vasoactiveReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: VasoactiveReportOptions,
): VasoactiveReport {
  const onDesk = vasoactiveOnDesk(drugIds);
  const activeDrugs = onDesk.vasoactiveDrugs;

  const arterialPh = options?.arterialPh ?? 7.38;
  const lactateMmolL = options?.lactateMmolL ?? 1.5;
  const crClMlMin = options?.crClMlMin ?? (host.kidney === "ckd" ? 30 : 90);
  const hasLvotObstructionOrHocm = options?.hasLvotObstructionOrHocm ?? false;

  // 1. Aggregated hemodynamics
  const aggregated = activeDrugs.length > 0 ? aggregateHemodynamics(activeDrugs) : undefined;

  // 2. Epinephrine hyperlactatemia evaluation
  const hasEpi = onDesk.detectedVasoactiveIds.includes("epinephrine");
  const hyperlactatemia = evaluateEpinephrineHyperlactatemia({
    epinephrineActive: hasEpi,
    lactateMmolL,
    scvO2Pct: options?.scvO2Pct,
    pvaCo2GapMmHg: options?.pvaCo2GapMmHg,
    urineOutputMlKgHr: options?.urineOutputMlKgHr,
  });

  // 3. Acidemia uncoupling evaluation
  const acidemia = evaluateAcidemiaAdrenergicUncoupling(
    arterialPh,
    onDesk.detectedVasoactiveIds,
  );

  // 4. Critical receptor clashes & collisions
  const collisions = findVasoactiveCollisions({
    drugIds,
    host,
    hasLvotObstructionOrHocm,
    crClMlMin,
  });

  // 5. Clinical pearls
  const clinicalPearls: string[] = [
    "Surviving Sepsis Campaign First-Line: Norepinephrine is the first-line vasopressor for septic and vasodilatory shock (target MAP ≥ 65 mmHg). Sparing excessive beta-1 chronotropy while providing robust alpha-1 vasoconstriction, it provides superior survival and fewer arrhythmias compared to dopamine (SOAP II trial).",
    "Acidemia Uncoupling & Vasopressin Initiation: At arterial pH < 7.20, catecholaminergic alpha-1 and beta-1 receptors uncouple from G-proteins and vascular K_ATP channels open. Vasopressin V1a receptors do not uncouple and actively close K_ATP channels. Early fixed-dose vasopressin (0.03 units/min) is physiologically grounded and spares toxic catecholamine escalation.",
    "Type B Epinephrine Lactatemia: Rising lactate during epinephrine infusion frequently represents benign beta-2 skeletal muscle aerobic glycolysis rather than worsening shock dysoxia. Verify central venous oxygen saturation (ScvO2 ≥ 70%) and venoarterial CO2 gap (< 6 mmHg) before assuming resuscitation failure.",
    "Milrinone Renal Elimination Window: Over 80–90% of milrinone is eliminated unchanged in urine. Elimination half-life extends from 2.3h to 10–24h+ in renal dysfunction (CrCl < 50 mL/min). Without mandatory dose reductions, profound refractory vasodilation and ventricular arrhythmias ensue.",
    "Dynamic LVOT Obstruction (HOCM / SAM) Danger: Inotropes (dobutamine, epinephrine) hyper-accelerate LV ejection velocity, triggering the Venturi effect, severe systolic anterior motion of the mitral valve, and sudden cardiovascular collapse. Treat with volume, beta-blockers, and pure alpha-1 afterload (phenylephrine).",
    "Unopposed Alpha-1 Hazard: Co-administering epinephrine to a patient on non-selective beta-blockers blocks beta-2 vasodilation and beta-1 inotropy, provoking catastrophic afterload surges, acute pulmonary edema, and severe reflex bradycardia. Glucagon is the specific rescue agent.",
  ];

  if (host.age === "geriatric") {
    clinicalPearls.push(
      "Geriatric Hemodynamics: Reduced beta-adrenergic receptor sensitivity and diminished baroreflex sensitivity. Heightened vulnerability to catecholamine-induced tachyarrhythmias and excessive afterload spikes.",
    );
  }

  return {
    onDesk,
    activeDrugs,
    receptorsRegistry: TARGET_RECEPTORS,
    aggregatedHemodynamics: aggregated,
    hyperlactatemiaEvaluation: hyperlactatemia,
    acidemiaEvaluation: acidemia,
    collisions,
    clinicalPearls,
    disclaimer: `${VASOACTIVE_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

// ============================================================================
// 8. HELPER ACCESSORS & SELECTIVITY UTILITIES
// ============================================================================

export function getVasoactiveProfile(
  drugId: string,
): VasoactiveDrugProfile | undefined {
  return VASOACTIVE_DRUG_PROFILES[drugId.toLowerCase().trim() as VasoactiveDrugId];
}

export function getAllVasoactiveProfiles(): VasoactiveDrugProfile[] {
  return Object.values(VASOACTIVE_DRUG_PROFILES);
}

export function getReceptorTarget(
  receptorId: TargetReceptorId,
): ReceptorTargetProfile | undefined {
  return TARGET_RECEPTORS[receptorId];
}

export function getAllReceptorTargets(): ReceptorTargetProfile[] {
  return Object.values(TARGET_RECEPTORS);
}

/**
 * Returns a comparative matrix of receptor affinities across all eight master drugs.
 */
export function getComparativeReceptorMatrix(): {
  receptors: TargetReceptorId[];
  drugs: {
    id: VasoactiveDrugId;
    name: string;
    affinities: Record<TargetReceptorId, AffinityScore>;
  }[];
} {
  const receptors: TargetReceptorId[] = [
    "alpha-1",
    "alpha-2",
    "beta-1",
    "beta-2",
    "V1a",
    "AT1",
    "D1",
    "D2",
  ];
  const drugs = getAllVasoactiveProfiles().map((d) => ({
    id: d.id,
    name: d.name,
    affinities: d.receptorAffinities,
  }));
  return { receptors, drugs };
}
