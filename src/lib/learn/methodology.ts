/**
 * Clinical pharmacology reference and methodology data for /methodology.
 * Covers first-pass extraction, FDA clinical DDI potency tiers, kinetic timelines
 * (reversible vs. TDI vs. induction), prodrug bioactivation traps, drug transporters
 * and regimen stacking, and the FirstPass evidence hierarchy.
 *
 * Educational reference only. Not FDA-cleared and not FDA-approved. No administered doses.
 */
import { SITE_URL } from "@/lib/seo/pair-copy";

export const METHODOLOGY_PATH = "/methodology";
export const METHODOLOGY_URL = `${SITE_URL}${METHODOLOGY_PATH}`;
export const METHODOLOGY_TITLE = "Pharmacology reference & methodology | FirstPass";
export const METHODOLOGY_DESCRIPTION =
  "Mechanistic pharmacokinetics on FirstPass: first-pass hepatic and intestinal extraction, FDA clinical DDI potency tiers, competitive vs. TDI vs. induction timelines, prodrug bioactivation traps, drug transporters, and source hierarchy. Educational reference only. Not FDA-cleared.";
export const METHODOLOGY_H1 = "Pharmacology reference & methodology";
export const METHODOLOGY_INTRO =
  "Reference pharmacokinetics, FDA clinical drug-drug interaction potency definitions, enzyme turnover timelines, prodrug bioactivation rules, transmembrane transporter pathways, and the evidence hierarchy used across FirstPass. Educational reference only — not FDA-cleared and not FDA-approved.";

export const SCOPE_BANNER_NOTICE =
  "Educational reference only. FirstPass is not FDA-cleared, not FDA-approved, and not a medical device. No review by clinicians is claimed for default map entries, and no administered amounts or prescriptions are produced. Confirm every clinical question against official Prescribing Information (DailyMed SPL).";

export type MethodologySectionId =
  | "first-pass"
  | "fda-tiers"
  | "kinetics-timelines"
  | "prodrug-traps"
  | "transporters-stacking"
  | "evidence-scope";

export interface MethodologySectionMeta {
  id: MethodologySectionId;
  number: string;
  title: string;
  shortTitle: string;
  subtitle: string;
}

export interface MethodologyCitation {
  label: string;
  url: string;
}

export interface FirstPassRouteExample {
  agent: string;
  routeContrast: string;
  enzymes: string;
  mechanism: string;
}

export interface FdaTierRow {
  tier: string;
  tone: "danger" | "warn" | "info" | "accent";
  threshold: string;
  clearanceEffect: string;
  prototypes: string;
}

export interface KineticsTimelineRow {
  mechanism: string;
  shortTag: string;
  tone: "info" | "warn" | "danger";
  onset: string;
  peakEffect: string;
  offsetWashout: string;
  clinicalPrototype: string;
}

export interface ProdrugTrapRow {
  prodrug: string;
  pathway: string;
  activeMetabolite: string;
  perpetratorTrap: string;
  clinicalOutcome: string;
  deskHref?: string;
}

export interface TransporterPathwayRow {
  system: string;
  gene: string;
  direction: string;
  sites: string;
  keySubstrates: string;
  clinicalConsequence: string;
}

export interface StackingMechanismCard {
  title: string;
  badge: string;
  detail: string;
  deskHref?: string;
  deskLabel?: string;
}

export interface EvidenceTierRow {
  tier: string;
  sourceClass: string;
  roleOnDesk: string;
  authorityNote: string;
}

export interface MethodologyDeskExample {
  title: string;
  href: string;
  tag: string;
  sectionId: MethodologySectionId;
  summary: string;
}

export const METHODOLOGY_SECTIONS: readonly MethodologySectionMeta[] = [
  {
    id: "first-pass",
    number: "01",
    title: "First-Pass Hepatic & Intestinal Extraction",
    shortTitle: "First-pass extraction",
    subtitle: "Portal venous clearance, hepatic extraction ratio (E_H), gut-wall CYP3A4 + P-gp cycling, and route-dependent interaction amplitudes.",
  },
  {
    id: "fda-tiers",
    number: "02",
    title: "FDA Clinical DDI Potency & Sensitivity Classification",
    shortTitle: "FDA DDI tiers",
    subtitle: "Quantitative AUC fold-change and clearance thresholds from FDA Clinical Drug Interaction Studies Guidance (2020/2023) and ICH M12.",
  },
  {
    id: "kinetics-timelines",
    number: "03",
    title: "Inhibition vs. Time-Dependent Inactivation (TDI) vs. Induction Timelines",
    shortTitle: "Kinetics & washout",
    subtitle: "Why start lag and stop washout diverge sharply across reversible binding, covalent enzyme inactivation, and nuclear-receptor transcription.",
  },
  {
    id: "prodrug-traps",
    number: "04",
    title: "Prodrug Bioactivation Traps",
    shortTitle: "Prodrug bioactivation",
    subtitle: "Why enzyme inhibition on an activation substrate causes therapeutic failure rather than toxicity, and which prodrugs bypass hepatic CYP.",
  },
  {
    id: "transporters-stacking",
    number: "05",
    title: "Transporters (P-gp, BCRP, OATP1B1/1B3) & Multi-Drug Stacking",
    shortTitle: "Transporters & stacking",
    subtitle: "Efflux and sinusoidal uptake amplification plus cumulative enzyme saturation, inhibitor-inducer tug-of-war, and multi-pathway PD burden.",
  },
  {
    id: "evidence-scope",
    number: "06",
    title: "Evidence Hierarchy & Educational Reference Scope",
    shortTitle: "Evidence & scope",
    subtitle: "How FirstPass ranks DailyMed SPL pins, FDA Table 1 index roles, PubMed literature, and forensic early-warning toxicology bulletins.",
  },
];

/* ── Section 01: First-Pass Hepatic & Intestinal Extraction ──────────────── */

export const FIRST_PASS_OVERVIEW =
  "An orally swallowed compound must survive two sequential presystemic barriers before reaching systemic arterial blood: enterocytes lining the small-intestinal mucosa (where CYP3A4 accounts for roughly 80% of intestinal P450 content alongside apical P-glycoprotein efflux) and the liver via the portal vein. Overall oral bioavailability is the product of fraction absorbed across the lumen (F_a), fraction escaping gut-wall metabolism (F_g), and fraction escaping hepatic first-pass extraction (F_h = 1 − E_H, where E_H = CL_H / Q_H).";

export const FIRST_PASS_INTERPLAY =
  "Enterocyte P-gp (ABCB1) repeatedly pumps absorbed lipophilic substrates back into the gut lumen, extending their dwell time across the brush border and exposing each molecule to multiple catalytic passes through intestinal CYP3A4. When a substrate exhibits high presystemic extraction (low F_g or high E_H), even modest inhibition of gut or hepatic enzymes produces a nonlinear surge in oral systemic AUC — whereas parenteral or inhaled routes enter systemic circulation directly and bypass this initial gate.";

export const FIRST_PASS_EQUATION = {
  formula: "F = F_a × F_g × F_h     where     F_h = 1 − E_H     and     E_H = CL_H / Q_H",
  terms: [
    { symbol: "F", meaning: "Net oral systemic bioavailability reaching arterial circulation." },
    { symbol: "F_a", meaning: "Fraction absorbed from the intestinal lumen into enterocytes." },
    { symbol: "F_g", meaning: "Fraction escaping enterocyte CYP3A4 / P-gp gut-wall extraction." },
    { symbol: "E_H", meaning: "Hepatic extraction ratio (hepatic clearance CL_H divided by portal/arterial hepatic blood flow Q_H)." },
  ],
} as const;

export const FIRST_PASS_ROUTES: readonly FirstPassRouteExample[] = [
  {
    agent: "Oral vs. IV Ketamine",
    routeContrast: "Oral (~17–24% bioavailability, high E_H) vs. IV (100%, bypasses portal extraction)",
    enzymes: "CYP3A4 · CYP2B6 (N-demethylation to norketamine)",
    mechanism:
      "Oral ketamine undergoes heavy gut-wall and hepatic first-pass conversion to norketamine; strong CYP3A4/2B6 inhibitors or inducers (e.g., clarithromycin, rifampin) shift oral parent AUC several-fold. Intravenous ketamine bypasses intestinal and initial portal extraction, so clearance tracks hepatic blood flow (Q_H) with markedly smaller perpetrator fold-changes.",
  },
  {
    agent: "Oral vs. Inhaled Cannabinoids & HHC",
    routeContrast: "Oral (extensive portal first-pass) vs. Inhaled vapor/smoke (rapid pulmonary systemic entry)",
    enzymes: "CYP2C9 · CYP3A4 (11-hydroxylation and oxidative clearance)",
    mechanism:
      "Oral THC, CBD, and hexahydrocannabinol (HHC) pass directly through the portal vein into hepatocytes, generating high ratios of active 11-hydroxy metabolites and exposing total systemic AUC to CYP2C9/CYP3A4 perpetrators. Inhaled delivery bypasses initial gut-wall and hepatic first-pass extraction, altering both active-metabolite proportion and presystemic interaction amplitude.",
  },
  {
    agent: "Grapefruit Furanocoumarins on Oral Substrates",
    routeContrast: "Oral victim (gut-wall CYP3A4 destroyed) vs. IV victim (hepatic CYP3A4 largely intact)",
    enzymes: "Intestinal CYP3A4 (mechanism-based inactivation by bergamottin)",
    mechanism:
      "Normal dietary servings of grapefruit selectively inactivate enterocyte CYP3A4 while sparing hepatic CYP3A4. High-gut-extraction oral victims (simvastatin, felodipine, buspirone, oral midazolam) surge sharply in exposure, whereas intravenous administration of the same agent shows minimal AUC shift.",
  },
];

export const FIRST_PASS_CITATIONS: readonly MethodologyCitation[] = [
  {
    label: "Wilkinson GR. Drug metabolism and variability among patients in drug response. N Engl J Med 2005;352:2211–2221 (PMID 15917386)",
    url: "https://pubmed.ncbi.nlm.nih.gov/15917386/",
  },
  {
    label: "Peltoniemi MA et al. Ketamine: a review of clinical pharmacokinetics and pharmacodynamics in anesthesia and pain therapy. Clin Pharmacokinet 2016;55:1059–1077 (PMID 27028535)",
    url: "https://pubmed.ncbi.nlm.nih.gov/27028535/",
  },
  {
    label: "Huestis MA. Human cannabinoid pharmacokinetics. Chem Biodivers 2007;4:1770–1804 (PMID 17712819)",
    url: "https://pubmed.ncbi.nlm.nih.gov/17712819/",
  },
];

/* ── Section 02: FDA Clinical DDI Potency & Sensitivity Classification ───── */

export const FDA_TIERS_INTRO =
  "FirstPass maps perpetrator potency and substrate sensitivity directly to the quantitative AUC fold-change bins established in the FDA Clinical Drug Interaction Studies Guidance for Industry (2020), the FDA Table of Substrates, Inhibitors and Inducers (2023), and ICH M12 (2024). Potency is defined against a sensitive index substrate for the same enzyme pathway.";

export const FDA_POTENCY_TIERS: readonly FdaTierRow[] = [
  {
    tier: "Strong Inhibitor",
    tone: "danger",
    threshold: "≥ 5-fold AUC increase",
    clearanceEffect: "≥ 80% oral clearance decrease of a sensitive index substrate",
    prototypes: "Ritonavir, clarithromycin, itraconazole, fluoxetine, paroxetine, bupropion, fluvoxamine",
  },
  {
    tier: "Moderate Inhibitor",
    tone: "warn",
    threshold: "≥ 2 to < 5-fold AUC increase",
    clearanceEffect: "50% to < 80% oral clearance decrease",
    prototypes: "Fluconazole, diltiazem, verapamil, erythromycin, ciprofloxacin, flmodafinil",
  },
  {
    tier: "Weak Inhibitor",
    tone: "info",
    threshold: "≥ 1.25 to < 2-fold AUC increase",
    clearanceEffect: "20% to < 50% oral clearance decrease",
    prototypes: "Cimetidine, esomeprazole (on selected CYP2C19 substrates)",
  },
  {
    tier: "Strong Inducer",
    tone: "danger",
    threshold: "≥ 80% AUC decrease",
    clearanceEffect: "≥ 5-fold oral clearance increase of a sensitive index substrate",
    prototypes: "Rifampin, carbamazepine, phenytoin, St. John's wort, apalutamide",
  },
  {
    tier: "Moderate Inducer",
    tone: "warn",
    threshold: "≥ 50% to < 80% AUC decrease",
    clearanceEffect: "2- to 5-fold oral clearance increase",
    prototypes: "Efavirenz, modafinil, bosentan, phenobarbital",
  },
  {
    tier: "Sensitive Index Substrate",
    tone: "accent",
    threshold: "AUC increases ≥ 5-fold with strong index inhibitor",
    clearanceEffect: "High fraction metabolized (f_m ≥ 0.8) via a single dominant CYP isoform",
    prototypes: "Midazolam (CYP3A4), simvastatin (CYP3A4), buspirone (CYP3A4), dextromethorphan (CYP2D6), tizanidine (CYP1A2)",
  },
];

export const FDA_TIERS_FOOTNOTE =
  "Supplementary FDA bins: Moderately sensitive substrates exhibit ≥ 2 to < 5-fold AUC increases with strong index inhibitors, and weak inducers reduce sensitive-substrate AUC by ≥ 20% to < 50%. Narrow therapeutic index (NTI) substrates (e.g., warfarin, digoxin, lithium, phenytoin, tacrolimus, theophylline) can produce clinically serious toxicity even at moderate or weak AUC fold-changes.";

export const FDA_TIERS_CITATIONS: readonly MethodologyCitation[] = [
  {
    label: "FDA Guidance for Industry: Clinical Drug Interaction Studies — Cytochrome P450 Enzyme- and Transporter-Mediated Drug Interactions (January 2020)",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-drug-interaction-studies-cytochrome-p450-enzyme-and-transporter-mediated-drug-interactions",
  },
  {
    label: "FDA Drug Development and Drug Interactions: Table of Substrates, Inhibitors and Inducers (updated 2023)",
    url: "https://www.fda.gov/drugs/drug-interactions-labeling/drug-development-and-drug-interactions-table-substrates-inhibitors-and-inducers",
  },
  {
    label: "ICH M12 Drug Interaction Studies — FDA Guidance for Industry (August 2024)",
    url: "https://www.fda.gov/media/161199/download",
  },
];

/* ── Section 03: Competitive vs. TDI vs. Induction Timelines ───────────── */

export const KINETICS_INTRO =
  "Knowing whether two drugs collide is only half the clinical question — knowing when the interaction starts and how long it lingers after stopping the perpetrator prevents premature restarts and delayed rebound toxicity. Enzyme modulation follows three fundamentally distinct kinetic clocks.";

export const KINETICS_TIMELINES: readonly KineticsTimelineRow[] = [
  {
    mechanism: "Competitive Reversible Inhibition",
    shortTag: "Reversible binding",
    tone: "info",
    onset: "Hours — tracks perpetrator absorption and active-site occupancy (C_max / K_i)",
    peakEffect: "Perpetrator steady-state plasma concentration",
    offsetWashout: "Tracks perpetrator elimination half-life (~4–5 half-lives to clear; extended when long-lived active metabolites accumulate, e.g., norfluoxetine)",
    clinicalPrototype: "Fluconazole, quinidine, ciprofloxacin, ketoconazole",
  },
  {
    mechanism: "Mechanism-Based / Time-Dependent Inactivation (TDI)",
    shortTag: "Suicide inactivation",
    tone: "warn",
    onset: "Rapid — hours to 1–3 days as catalytic turnover forms covalent adducts or metabolite-intermediate complexes (MIC)",
    peakEffect: "24–72 hours of repeated dosing as enzyme pool depletes below basal synthesis",
    offsetWashout: "Independent of perpetrator plasma clearance; governed by de novo CYP protein resynthesis (~24–72 h for intestinal CYP3A4, up to 3–7 days for hepatic CYP3A4/CYP2D6)",
    clinicalPrototype: "Grapefruit bergamottin, clarithromycin, erythromycin, paroxetine, ritonavir, diltiazem",
  },
  {
    mechanism: "Nuclear-Receptor Transcriptional Induction (PXR / CAR / AhR)",
    shortTag: "Gene upregulation",
    tone: "danger",
    onset: "Slow lag — 3–7 days for nuclear receptor activation, mRNA transcription, translation, and membrane insertion",
    peakEffect: "7–14 days of continuous inducer exposure",
    offsetWashout: "De-induction lingers 1–2 weeks after stopping (up to 2–3 weeks for long-t½ inducers) while excess enzyme undergoes first-order degradation (k_deg)",
    clinicalPrototype: "Rifampin (PXR), carbamazepine (PXR/CAR), phenytoin (CAR/PXR), St. John's wort (PXR), tobacco smoke PAHs (AhR → CYP1A2)",
  },
];

export const KINETICS_CALLOUTS: readonly { title: string; detail: string }[] = [
  {
    title: "TDI outlasts the last tablet",
    detail:
      "Because mechanism-based inactivators chemically destroy the active enzyme molecule, stopping clarithromycin, ritonavir, paroxetine, or grapefruit juice yesterday does not immediately restore CYP activity today. New enzyme protein must be transcribed and folded.",
  },
  {
    title: "De-induction rebound hazard",
    detail:
      "When a chronic inducer (such as rifampin, carbamazepine, or daily tobacco smoking via AhR) is stopped, elevated CYP pools decay slowly over 1–2 weeks. Narrow-index victims stabilized during induction (warfarin, clozapine, methadone, tacrolimus) can climb into toxicity days after the inducer ends.",
  },
];

export const KINETICS_CITATIONS: readonly MethodologyCitation[] = [
  {
    label: "Kalgutkar AS, Obach RS, Maurer TS. Mechanism-based inactivation of cytochrome P450 enzymes. Curr Drug Metab 2007;8:407–447 (PMID 17584015)",
    url: "https://pubmed.ncbi.nlm.nih.gov/17584015/",
  },
  {
    label: "Yang J et al. Cytochrome P450 turnover: regulation of synthesis and degradation, methods for determining rates, and implications for DDI prediction. Drug Metab Dispos 2008;36:1453–1461 (PMID 18281482)",
    url: "https://pubmed.ncbi.nlm.nih.gov/18281482/",
  },
];

/* ── Section 04: Prodrug Bioactivation Traps ───────────────────────────── */

export const PRODRUG_INTRO =
  "Standard metabolic intuition assumes that inhibiting an enzyme raises drug toxicity. On an activation substrate (prodrug), the directional arrow inverts completely: inhibiting the activating enzyme blocks formation of the pharmacologically active metabolite, producing phenoconversion and therapeutic failure — loss of analgesia, failed antiplatelet protection, or blunted endocrine blockade.";

export const PRODRUG_TRAPS: readonly ProdrugTrapRow[] = [
  {
    prodrug: "Codeine",
    pathway: "CYP2D6 O-demethylation",
    activeMetabolite: "Morphine",
    perpetratorTrap: "Strong CYP2D6 inhibitors (fluoxetine, paroxetine, bupropion, quinidine)",
    clinicalOutcome: "Loss of opioid analgesia (functional poor-metabolizer phenoconversion); conversely, CYP2D6 ultrarapid metabolizers risk excessive morphine respiratory depression.",
    deskHref: "/?brief=codeine,fluoxetine",
  },
  {
    prodrug: "Tramadol",
    pathway: "CYP2D6 O-demethylation",
    activeMetabolite: "O-desmethyltramadol (M1)",
    perpetratorTrap: "Strong CYP2D6 inhibitors (paroxetine, fluoxetine, bupropion)",
    clinicalOutcome: "Blunted μ-opioid analgesia from M1 while parent tramadol accumulates, increasing serotonergic toxicity and seizure liability without pain relief.",
    deskHref: "/?brief=tramadol,fluoxetine",
  },
  {
    prodrug: "Tamoxifen",
    pathway: "CYP2D6 (primary) & CYP3A4",
    activeMetabolite: "Endoxifen (4-hydroxy-N-desmethyltamoxifen)",
    perpetratorTrap: "Strong CYP2D6 inhibitors (paroxetine, fluoxetine, bupropion, quinidine)",
    clinicalOutcome: "Reduced endoxifen plasma concentrations and impaired estrogen-receptor antagonism; FDA labeling cautions against strong CYP2D6 inhibitors.",
    deskHref: "/?brief=tamoxifen,paroxetine",
  },
  {
    prodrug: "Clopidogrel",
    pathway: "CYP2C19 two-step hepatic bioactivation",
    activeMetabolite: "Active thiol metabolite (irreversible P2Y12 blocker)",
    perpetratorTrap: "Strong/moderate CYP2C19 inhibitors (omeprazole, esomeprazole, fluvoxamine, fluconazole)",
    clinicalOutcome: "Diminished platelet inhibition and increased risk of stent thrombosis or ischemic cardiovascular events (FDA Boxed Warning on CYP2C19 impairment).",
    deskHref: "/?brief=clopidogrel,omeprazole",
  },
  {
    prodrug: "Lisdexamfetamine",
    pathway: "Erythrocyte peptidase hydrolysis (non-CYP)",
    activeMetabolite: "Dextroamphetamine",
    perpetratorTrap: "Red blood cell enzymatic cleavage — not dependent on hepatic CYP450 activation",
    clinicalOutcome: "Bioactivation itself bypasses CYP inhibition traps, though downstream dextroamphetamine clearance remains sensitive to urinary pH and CYP2D6/sympathomimetic collisions.",
  },
  {
    prodrug: "Adrafinil",
    pathway: "Hepatic amide hydrolysis / esterase conversion",
    activeMetabolite: "Modafinil",
    perpetratorTrap: "Hepatic metabolic conversion prior to systemic activity",
    clinicalOutcome: "Delayed onset and additional hepatic processing relative to modafinil; once converted, inherits modafinil's moderate CYP3A4 induction and CYP2C19 inhibition profile.",
  },
];

export const PRODRUG_CITATIONS: readonly MethodologyCitation[] = [
  {
    label: "Crews KR et al. CPIC Guideline for Opioids and CYP2D6, OPRM1, and COMT. Clin Pharmacol Ther 2021;110:888–896 (PMID 33387367)",
    url: "https://pubmed.ncbi.nlm.nih.gov/33387367/",
  },
  {
    label: "Lee CR et al. CPIC Guideline for CYP2C19 Genotype and Clopidogrel Therapy: 2022 Update. Clin Pharmacol Ther 2022;112:959–967 (PMID 35034351)",
    url: "https://pubmed.ncbi.nlm.nih.gov/35034351/",
  },
  {
    label: "Goetz MP et al. CPIC Guideline for CYP2D6 and Tamoxifen Therapy. Clin Pharmacol Ther 2018;103:770–777 (PMID 29385237)",
    url: "https://pubmed.ncbi.nlm.nih.gov/29385237/",
  },
  {
    label: "Pennick M. Absorption of lisdexamfetamine dimesylate and its enzymatic conversion to d-amphetamine. Neuropsychiatr Dis Treat 2010;6:317–327 (PMID 20628632)",
    url: "https://pubmed.ncbi.nlm.nih.gov/20628632/",
  },
];

/* ── Section 05: Transporters & Multi-Drug Stacking ────────────────────── */

export const TRANSPORTERS_INTRO =
  "Cytochrome P450 oxidation operates in concert with ATP-binding cassette (ABC) efflux pumps and solute-carrier (SLC) influx transporters across intestinal, hepatic, renal, and blood-brain barriers. In real-world regimens of three or more medications, transporter bottlenecks and stacked pharmacodynamic mechanisms routinely amplify risk beyond any single pair.";

export const TRANSPORTER_PATHWAYS: readonly TransporterPathwayRow[] = [
  {
    system: "P-glycoprotein (P-gp / MDR1)",
    gene: "ABCB1",
    direction: "ATP-dependent efflux",
    sites: "Intestinal enterocytes, biliary canaliculi, renal proximal tubule, blood-brain barrier",
    keySubstrates: "Digoxin, dabigatran, apixaban, rivaroxaban, tacrolimus, cyclosporine, loperamide",
    clinicalConsequence:
      "Dual CYP3A4 + P-gp inhibition (clarithromycin, itraconazole, verapamil, ritonavir, dronedarone) compounds intestinal absorption surges and reduces biliary/renal excretion, raising DOAC bleeding, digoxin toxicity, and calcineurin nephrotoxicity.",
  },
  {
    system: "Breast Cancer Resistance Protein (BCRP)",
    gene: "ABCG2",
    direction: "ATP-dependent efflux",
    sites: "Intestinal enterocytes, hepatocyte canalicular membrane, blood-brain barrier, placenta",
    keySubstrates: "Rosuvastatin, sulfasalazine, methotrexate, topotecan",
    clinicalConsequence:
      "BCRP inhibition (e.g., cyclosporine, eltrombopag, curcuminoids) raises systemic exposure of non-CYP-cleared substrates such as rosuvastatin even when CYP3A4 is untouched.",
  },
  {
    system: "Organic Anion Transporting Polypeptides (OATP1B1 / OATP1B3)",
    gene: "SLCO1B1 / SLCO1B3",
    direction: "Sinusoidal hepatic uptake (influx)",
    sites: "Basolateral (sinusoidal) hepatocyte membrane (plus intestinal OATP1A2/2B1 for select oral drugs)",
    keySubstrates: "Atorvastatin, rosuvastatin, pravastatin, pitavastatin, repaglinide, fexofenadine (gut OATP)",
    clinicalConsequence:
      "Hepatic OATP1B1/1B3 inhibitors (cyclosporine, gemfibrozil, clarithromycin, single-dose IV rifampin) block hepatocyte entry, trapping statins in systemic blood and elevating myopathy/rhabdomyolysis risk. Conversely, fruit juices blocking intestinal OATP uptake decrease fexofenadine absorption.",
  },
];

export const MULTI_DRUG_STACKING: readonly StackingMechanismCard[] = [
  {
    title: "Cumulative enzyme saturation",
    badge: "Multi-perpetrator PK",
    detail:
      "Adding two moderate inhibitors on the same isoform, combining a moderate inhibitor with an intermediate-metabolizer genotype (phenoconversion), or stacking renal/hepatic impairment narrows residual clearance far beyond single-pair estimates.",
    deskHref: "/?brief=warfarin,fluconazole",
    deskLabel: "Inspect CYP2C9 narrow-index tray",
  },
  {
    title: "Opposing inhibitor × inducer tug-of-war",
    badge: "Kinetic mismatch",
    detail:
      "Co-administering a strong inhibitor and a strong inducer on one enzyme (e.g., rifampin + ketoconazole + midazolam) creates an unstable net exposure that swings wildly during initiation and washout because inhibition acts in hours while induction takes 1–2 weeks to develop and decay.",
    deskHref: "/?brief=rifampin,ketoconazole,midazolam",
    deskLabel: "Inspect 3-drug CYP3A4 tug-of-war",
  },
  {
    title: "Multi-pathway pharmacodynamic (PD) burden",
    badge: "Converging organ axes",
    detail:
      "Drugs with zero shared CYP enzymes still compound toxicity across five high-consequence physiological axes tracked on FirstPass: QTc prolongation / torsades de pointes, serotonergic excess, CNS & respiratory depression, anticholinergic burden, and additive bleeding (anticoagulant + antiplatelet + SSRI/NSAID).",
  },
];

export const TRANSPORTERS_CITATIONS: readonly MethodologyCitation[] = [
  {
    label: "International Transporter Consortium. Membrane transporters in drug development. Nat Rev Drug Discov 2010;9:215–236 (PMID 20190787)",
    url: "https://pubmed.ncbi.nlm.nih.gov/20190787/",
  },
  {
    label: "Zamek-Gliszczynski MJ et al. Transporters in drug development: 2018 ITC recommendations. Clin Pharmacol Ther 2018;104:890–899 (PMID 30137645)",
    url: "https://pubmed.ncbi.nlm.nih.gov/30137645/",
  },
  {
    label: "Niu J, Straubinger RM, Mager DE. Pharmacodynamic drug-drug interactions. Clin Pharmacol Ther 2019;105:1395–1406 (PMID 30912119)",
    url: "https://pubmed.ncbi.nlm.nih.gov/30912119/",
  },
];

/* ── Section 06: Evidence Hierarchy & Educational Reference Scope ──────── */

export const EVIDENCE_INTRO =
  "Every interaction card on FirstPass declares its evidentiary origin so licensed clinicians and health-professions trainees can independently inspect the primary document before making any judgment. Higher-tier authoritative label text always takes precedence over mechanistic inference.";

export const EVIDENCE_HIERARCHY: readonly EvidenceTierRow[] = [
  {
    tier: "Tier 1",
    sourceClass: "FDA Prescribing Information (DailyMed SPL) Label Pins",
    roleOnDesk: "Verbatim Boxed Warning, Section 4 (Contraindications), Section 5 (Warnings & Precautions), and Section 7 (Drug Interactions) quotes with DailyMed set ID, SPL version, and retrieval date.",
    authorityNote: "Primary authority. Only named label pins emit top avoidance grades when warranted; if the mechanistic map and official labeling disagree, the official labeling governs.",
  },
  {
    tier: "Tier 2",
    sourceClass: "FDA Table 1 Index Roles & ICH M12 / CPIC Tables",
    roleOnDesk: "Standardized substrate sensitivity, inhibitor/inducer potency grades, transporter index classifications, and pharmacogenomic allele-to-phenotype translation bins.",
    authorityNote: "Powers mechanistic CYP450 and P-gp pair grading when no verbatim label pin overrides the pair.",
  },
  {
    tier: "Tier 3",
    sourceClass: "Peer-Reviewed Clinical Literature (NCBI PubMed)",
    roleOnDesk: "Human pharmacokinetic DDI trials, enzyme turnover kinetics, transporter consensus statements, and published clinical scoring references linked by PMID.",
    authorityNote: "Provides mechanistic context, washout clocks, and verifiable citations for independent literature inspection.",
  },
  {
    tier: "Tier 4",
    sourceClass: "Forensic Early-Warning Toxicology Bulletins (CFSRE, UNODC, EUDA, DEA)",
    roleOnDesk: "Analytical toxicology monographs and public-health advisories for novel psychoactive and street-supply agents (e.g., nitazenes, xylazine, medetomidine, designer benzodiazepines, HHC) that lack approved drug labeling.",
    authorityNote: "Explicitly marked as educational harm-reduction and toxicology reference maps — never equivalent to approved Prescribing Information.",
  },
];

export const EDUCATIONAL_SCOPE_POINTS: readonly string[] = [
  "FirstPass is an educational pharmacology reference intended for licensed healthcare professionals and students in accredited health-professions programs under supervision.",
  "FirstPass is not FDA-cleared, not FDA-approved, and not a medical device. Display of FDA label excerpts or FDA interaction table classifications does not confer regulatory clearance.",
  "No clinician review is claimed for FirstPass's default mechanistic tier bins; each finding links directly to its underlying source class so the reader can independently verify the basis.",
  "FirstPass does not generate prescriptions, clinical orders, or administered doses. Any clinical regimen decision must be confirmed against current official Prescribing Information (DailyMed SPL) and institutional protocols.",
  "An absence of mapped collisions is never a clearance or proof of safety — unmapped UGT glucuronidation, renal/hepatic organ dysfunction, protein-binding shifts, unlisted metabolites, and street-supply adulterants still apply.",
];

/* ── Live Desk Interactive Examples ────────────────────────────────────── */

export const METHODOLOGY_DESK_EXAMPLES: readonly MethodologyDeskExample[] = [
  {
    title: "Codeine + Fluoxetine",
    href: "/?brief=codeine,fluoxetine",
    tag: "Prodrug activation trap · CYP2D6",
    sectionId: "prodrug-traps",
    summary: "Strong CYP2D6 inhibition blocks O-demethylation to morphine, causing analgesic failure; norfluoxetine prolongs phenoconversion for weeks.",
  },
  {
    title: "Clopidogrel + Omeprazole",
    href: "/?brief=clopidogrel,omeprazole",
    tag: "Prodrug activation trap · CYP2C19",
    sectionId: "prodrug-traps",
    summary: "CYP2C19 inhibition impairs two-step conversion to clopidogrel's active thiol metabolite, reducing P2Y12 antiplatelet protection.",
  },
  {
    title: "Rifampin + Ketoconazole + Midazolam",
    href: "/?brief=rifampin,ketoconazole,midazolam",
    tag: "3-drug stacking · Induction vs. inhibition",
    sectionId: "transporters-stacking",
    summary: "Opposing strong CYP3A4 inducer and strong inhibitor on a sensitive index substrate — contrasting rapid inhibition with slow 1–2 week induction kinetics.",
  },
  {
    title: "Warfarin + Fluconazole",
    href: "/?brief=warfarin,fluconazole",
    tag: "FDA moderate/strong inhibitor · NTI victim",
    sectionId: "fda-tiers",
    summary: "Reversible CYP2C9 inhibition slows S-warfarin clearance, illustrating why narrow-therapeutic-index victims climb into bleeding risk rapidly.",
  },
  {
    title: "Clarithromycin + Simvastatin",
    href: "/?brief=clarithromycin,simvastatin",
    tag: "First-pass + TDI · CYP3A4 & OATP1B1",
    sectionId: "kinetics-timelines",
    summary: "Time-dependent inactivation of intestinal and hepatic CYP3A4 plus OATP1B1 uptake inhibition drives severe statin exposure elevation.",
  },
  {
    title: "Digoxin + Verapamil",
    href: "/?brief=digoxin,verapamil",
    tag: "Transporter efflux · P-gp",
    sectionId: "transporters-stacking",
    summary: "P-gp (ABCB1) efflux inhibition elevates digoxin systemic concentrations through intestinal and renal clearance blockade without CYP oxidation.",
  },
];
