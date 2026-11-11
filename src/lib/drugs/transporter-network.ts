/**
 * Transmembrane Transporter & Barrier Network Pharmacological Database
 *
 * Comprehensive reference database covering the 5 major clinical transporter families:
 * 1) P-gp / MDR1 (ABCB1) - ATP-Binding Cassette Efflux
 * 2) BCRP (ABCG2) - ATP-Binding Cassette Efflux
 * 3) OATP1B1 & OATP1B3 (SLCO1B1/3) - Solute Carrier Sinusoidal Influx
 * 4) OAT1 & OAT3 (SLC22A6/8) - Renal Basolateral Organic Anion Influx
 * 5) OCT2 & MATE1/MATE2-K (SLC22A2 / SLC47A1/2) - Renal Cation Secretion Axis
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations, membrane vector topologies,
 * and pharmacokinetic collision models to enable licensed healthcare professionals
 * and students to independently analyze transmembrane drug transport. It does not
 * provide patient-specific dosing directives, prescribing instructions, or diagnostic
 * determinations. References: IUPHAR/BPS Guide to PHARMACOLOGY, FDA Clinical Drug
 * Interaction Studies Guidance (2020), and peer-reviewed transporter literature.
 */

import { DRUG_BY_ID } from "./catalog";

export type TransporterFamily = "ABC Efflux" | "SLC Influx";

export interface TransporterCollision {
  id: string;
  title: string;
  description: string;
  drugPair: [string, string];
  hazard: string;
  severity: "critical" | "high" | "moderate";
  mechanismDetail: string;
  literatureCitation: string;
}

export interface MembraneVector {
  membrane: "apical" | "basolateral" | "canalicular" | "sinusoidal";
  direction: "efflux" | "influx";
  organ: string;
  anatomicalSite: string;
  vectorSummary: string;
}

export interface TransporterInfo {
  id: string;
  gene: string;
  name: string;
  aliases: string[];
  family: TransporterFamily;
  atpDependent: boolean;
  primaryLocations: string[];
  membraneVectors: MembraneVector[];
  physiologicalRole: string;
  substrates: string[];
  inhibitors: string[];
  inducers: string[];
  probeOrInvestigationalInhibitors?: string[];
  clinicalCollisions: TransporterCollision[];
  pharmacokineticImpact: string;
  fdaClassification: string;
  iupharClassification: string;
  citations: string[];
}

export type BarrierId = "bbb" | "intestinal" | "hepatic" | "renal";

export interface BarrierTransporterNode {
  transporterId: string;
  gene: string;
  name: string;
  membrane: "apical" | "basolateral" | "canalicular" | "sinusoidal";
  direction: "efflux" | "influx";
  vectorLabel: string;
  arrowDirection: "up" | "down" | "left" | "right";
  mechanismNote: string;
}

export interface BarrierArchitecture {
  id: BarrierId;
  name: string;
  shortName: string;
  badge: string;
  organ: string;
  apicalSideLabel: string;
  apicalSideDescription: string;
  basolateralSideLabel: string;
  basolateralSideDescription: string;
  cellularCompartment: string;
  barrierDescription: string;
  transporterNodes: BarrierTransporterNode[];
  clinicalTakeaway: string;
  citations: string[];
}

export const TRANSPORTER_REGULATORY_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Educational Decision Support: This transmembrane transporter and barrier network database provides reference pharmacology and pharmacokinetic pathway visualizations compiled from IUPHAR/BPS Guide to PHARMACOLOGY, FDA Clinical Drug Interaction Studies Guidance, and peer-reviewed literature. It is intended solely for educational analysis and clinical reasoning by licensed healthcare professionals and healthcare students. It does not provide patient-specific dosing directives, prescribing instructions, diagnostic determinations, or therapeutic mandates. Dosing and clinical regimen decisions remain the independent responsibility of licensed clinicians.";

export const TRANSPORTERS: readonly TransporterInfo[] = [
  // 1) P-gp / MDR1 / ABCB1
  {
    id: "pgp-abcb1",
    gene: "ABCB1",
    name: "P-glycoprotein / MDR1 (ABCB1)",
    aliases: ["P-gp", "MDR1", "ABCB1", "ATP-binding cassette sub-family B member 1", "CD243"],
    family: "ABC Efflux",
    atpDependent: true,
    primaryLocations: [
      "Blood-Brain Barrier (BBB capillary endothelia, pumps out of brain into blood)",
      "Intestinal Enterocytes (apical efflux into gut lumen)",
      "Renal Proximal Tubule (apical secretion into tubular urine)",
      "Hepatic Canalicular Membrane (biliary excretion into bile duct)",
    ],
    membraneVectors: [
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Brain Microvasculature",
        anatomicalSite: "Capillary Endothelia",
        vectorSummary: "Extrudes substrates from brain endothelial cytoplasm into capillary bloodstream, excluding them from the CNS.",
      },
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Small Intestine",
        anatomicalSite: "Enterocyte Brush Border",
        vectorSummary: "Pumps orally ingested xenobiotics back into the intestinal lumen, restricting bioavailability.",
      },
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Kidney",
        anatomicalSite: "Proximal Tubule Apical Membrane",
        vectorSummary: "Actively secretes substrates from tubular epithelial cells into the pro-urine lumen for elimination.",
      },
      {
        membrane: "canalicular",
        direction: "efflux",
        organ: "Liver",
        anatomicalSite: "Hepatocyte Canalicular Membrane",
        vectorSummary: "Pumps drugs into bile canaliculi for hepatobiliary excretion.",
      },
    ],
    physiologicalRole:
      "Primary ATP-dependent cellular defence pump. Employs ATP hydrolysis to actively extrude lipophilic and amphipathic xenobiotics across endothelial and epithelial apical membranes, safeguarding vital organs and accelerating elimination.",
    substrates: [
      "digoxin",
      "loperamide",
      "dabigatran",
      "colchicine",
      "cyclosporine",
      "tacrolimus",
      "sirolimus",
      "fentanyl",
      "apixaban",
      "rivaroxaban",
      "daraxonrasib",
    ],
    inhibitors: [
      "verapamil",
      "diltiazem",
      "quinidine",
      "amiodarone",
      "clarithromycin",
      "itraconazole",
      "ritonavir",
      "paxlovid",
      "cyclosporine",
      "vepdegestrant",
      "daraxonrasib",
    ],
    inducers: [
      "rifampin",
      "st-johns-wort",
      "carbamazepine",
      "phenytoin",
      "phenobarbital",
    ],
    probeOrInvestigationalInhibitors: [
      "Elacridar (GF120918 - third generation dual P-gp/BCRP investigational inhibitor)",
      "Tariquidar (XR9576 - potent non-competitive investigational inhibitor)",
    ],
    clinicalCollisions: [
      {
        id: "loperamide-quinidine",
        title: "Loperamide Central BBB Penetration & Severe Toxicity via P-gp Inhibition",
        drugPair: ["loperamide", "quinidine"],
        description:
          "Loperamide is a potent peripheral mu-opioid agonist normally excluded from the central nervous system by capillary endothelial P-glycoprotein. High-dose co-administration with quinidine abolishes P-gp efflux, permitting rapid BBB penetration with marked central opioid effects, respiratory depression, and severe QT/QRS prolongation.",
        hazard:
          "Profound central respiratory depression, opioid overdose syndrome, and life-threatening ventricular dysrhythmias.",
        severity: "critical",
        mechanismDetail:
          "Quinidine occupies the substrate-binding pocket of ABCB1 at the BBB, blocking the efflux gate and increasing brain parenchyma concentration of loperamide multi-fold.",
        literatureCitation:
          "Sadeque AJ, et al. Increased drug delivery to the brain by P-glycoprotein inhibition. Clin Pharmacol Ther. 2000;68(3):231-237.",
      },
      {
        id: "loperamide-verapamil",
        title: "Loperamide + Verapamil Central Neuro-Opioid Escape",
        drugPair: ["loperamide", "verapamil"],
        description:
          "Verapamil competitively inhibits endothelial P-glycoprotein at the blood-brain barrier, enabling loperamide to bypass the protective efflux gate, cross into brain parenchyma, and produce sedation, miosis, and loss of respiratory drive.",
        hazard:
          "Unintended central opiate toxicity, stupor, and severe hypoventilation.",
        severity: "critical",
        mechanismDetail:
          "Verapamil binds high-affinity transmembrane domains of P-gp, shutting off the ATP-coupled pump and allowing hydrophobic loperamide to partition across the lipid bilayer into brain tissue.",
        literatureCitation:
          "Vannay-Bouchiche C, et al. P-glycoprotein inhibition at the blood-brain barrier: consequences for central opioid access. Fundam Clin Pharmacol. 2007;21(4):427-434.",
      },
      {
        id: "digoxin-amiodarone",
        title: "Digoxin Toxic Overexposure via Renal & Gut P-gp Blockade",
        drugPair: ["digoxin", "amiodarone"],
        description:
          "Amiodarone inhibits apical P-gp in both renal proximal tubules and intestinal enterocytes. This cuts renal tubular secretion of digoxin by approximately 50% and enhances oral absorption, doubling steady-state digoxin plasma levels.",
        hazard:
          "Lethal digitalis toxicity (bidirectional VT, complete AV block, refractory hyperkalemia, yellow-green visual halos).",
        severity: "critical",
        mechanismDetail:
          "Non-competitive and competitive inhibition of ABCB1 renal transport proteins halts the primary active tubular secretion mechanism of unchanged digoxin.",
        literatureCitation:
          "Hager WD, et al. Digoxin-amiodarone interaction: clinical and pharmacokinetic evaluation. Circulation. 1981;64(5):1069-1072.",
      },
      {
        id: "digoxin-verapamil",
        title: "Digoxin + Verapamil Double-Pronged P-gp & AV Block Collision",
        drugPair: ["digoxin", "verapamil"],
        description:
          "Verapamil suppresses renal P-gp secretion of digoxin by 60-90% while simultaneously compounding negative dromotropic effects at the AV node.",
        hazard:
          "Severe bradyarrhythmias, high-grade AV dissociation, and systemic cardiac glycoside toxicity.",
        severity: "critical",
        mechanismDetail:
          "Verapamil acts as an ABCB1 inhibitor in proximal tubular brush borders and synergizes pharmacodynamically at cardiac calcium channels and vagal tone pathways.",
        literatureCitation:
          "Pedersen KE, et al. Digoxin-verapamil interaction. Clin Pharmacol Ther. 1981;30(3):311-316.",
      },
      {
        id: "colchicine-clarithromycin",
        title: "Colchicine Multi-Organ Collapse via P-gp / CYP3A4 Arrest",
        drugPair: ["colchicine", "clarithromycin"],
        description:
          "Clarithromycin strongly inhibits both P-gp efflux and CYP3A4, collapsing colchicine elimination and driving systemic accumulation.",
        hazard:
          "Multi-organ failure, fatal bone marrow aplasia, and neuromuscular toxicity.",
        severity: "critical",
        mechanismDetail:
          "Dual inhibition of hepatic canalicular and intestinal P-gp combined with CYP3A4 block abolishes the clearance pathways of colchicine.",
        literatureCitation:
          "Hung IFN, et al. Fatal interaction between clarithromycin and colchicine in patients with renal insufficiency: a retrospective study. Clin Infect Dis. 2005;41(3):291-300.",
      },
      {
        id: "tacrolimus-paxlovid",
        title: "Tacrolimus + Paxlovid Gut P-gp & CYP3A4 Dual-Barrier Collapse",
        drugPair: ["tacrolimus", "paxlovid"],
        description:
          "Tacrolimus oral bioavailability and systemic elimination are jointly restricted by enterocyte apical P-gp (ABCB1) back-transport and CYP3A4 presystemic metabolism. The ritonavir booster in Paxlovid (nirmatrelvir/ritonavir) irreversibly inactivates CYP3A4 and suppresses intestinal/hepatic P-gp, cutting apparent clearance by >65% and triggering 10- to >50-fold tacrolimus AUC surges.",
        hazard:
          "Life-threatening calcineurin inhibitor toxicity: acute kidney injury, hyperkalemia, neurotoxicity/PRES, and severe immunosuppression.",
        severity: "critical",
        mechanismDetail:
          "Synergistic knockout of enterocyte brush-border ABCB1 efflux and mechanism-based CYP3A4 inactivation collapses gut-wall extraction and hepatic clearance, sustaining supratherapeutic troughs for days after completing Paxlovid.",
        literatureCitation:
          "FDA Prescribing Information for PAXLOVID (nirmatrelvir/ritonavir); Clin Case Rep / Transplant Pharmacokinet DDI Models (PMID: 35599203, PMID: 37924724).",
      },
      {
        id: "sirolimus-paxlovid",
        title: "Sirolimus + Paxlovid mTOR Inhibitor P-gp / CYP3A4 Surge",
        drugPair: ["sirolimus", "paxlovid"],
        description:
          "Sirolimus undergoes concerted intestinal P-gp efflux and CYP3A4 metabolism. Co-administration with Paxlovid (nirmatrelvir/ritonavir) disables both enterocyte P-gp extrusion and CYP3A4 clearance, escalating sirolimus AUC approximately 11-fold across an already prolonged elimination half-life.",
        hazard:
          "Profound mTOR inhibitor toxicity: severe stomatitis/mucositis, myelosuppression, pneumonitis, hyperlipidemia, and impaired wound healing.",
        severity: "critical",
        mechanismDetail:
          "Inhibition of apical ABCB1 efflux in enterocytes and bile canaliculi compounds suicidal CYP3A4 inactivation, sharply amplifying absorbed fraction (F) and prolonging systemic persistence.",
        literatureCitation:
          "Lemaitre F, et al. Therapeutic Drug Monitoring & SFPT Guidance on Nirmatrelvir/Ritonavir Immunosuppressant DDIs; FDA Prescribing Information for PAXLOVID.",
      },
      {
        id: "rivaroxaban-paxlovid",
        title: "Rivaroxaban + Paxlovid Dual P-gp/BCRP & CYP3A4 Hemorrhage Surge",
        drugPair: ["rivaroxaban", "paxlovid"],
        description:
          "Rivaroxaban clearance is split between CYP3A4/CYP2J2 hepatic metabolism (~50%) and ABCB1 (P-gp)/ABCG2 (BCRP) active renal and intestinal efflux. Ritonavir in Paxlovid simultaneously arrests CYP3A4 and P-gp/BCRP, amplifying rivaroxaban systemic AUC approximately 2.5-fold (ritonavir benchmark).",
        hazard:
          "Major spontaneous gastrointestinal, retroperitoneal, or intracranial hemorrhage from combined metabolic and transporter clearance collapse.",
        severity: "critical",
        mechanismDetail:
          "Dual blockade of enterocyte/renal apical P-gp (ABCB1) and BCRP (ABCG2) efflux coupled with irreversible CYP3A4 inactivation removes both elimination arms simultaneously, exceeding single-pathway DDI magnitudes (PMID: 23305158, PMID: 11861813).",
        literatureCitation:
          "Mueck W, et al. Br J Clin Pharmacol. 2013;76(3):455-466 (PMID: 23305158); Cummins CL, et al. J Pharmacol Exp Ther. 2002 (PMID: 11861813).",
      },
      {
        id: "apixaban-paxlovid",
        title: "Apixaban + Paxlovid Combined P-gp/BCRP & CYP3A4 Exposure Escalation",
        drugPair: ["apixaban", "paxlovid"],
        description:
          "Apixaban exhibits balanced dependence on intestinal/renal P-gp and BCRP efflux alongside CYP3A4 metabolism (~25%). Paxlovid disables both enterocyte/renal ABC efflux and CYP3A4 turnover concurrently, driving approximately 2-fold increases in apixaban AUC.",
        hazard:
          "Markedly elevated anti-Xa anticoagulation intensity and major bleeding hazard, amplified further by concurrent renal impairment.",
        severity: "critical",
        mechanismDetail:
          "Presystemic enterocyte P-gp/CYP3A4 synergy blockade increases absorbed fraction (Fa * Fg) while renal/biliary ABC efflux inhibition slows systemic clearance (PMID: 31030414, PMID: 11861813).",
        literatureCitation:
          "Garonzik S, et al. Am J Cardiovasc Drugs. 2019;19(6):595-604 (PMID: 31030414); Cummins CL, et al. J Pharmacol Exp Ther. 2002 (PMID: 11861813).",
      },
      {
        id: "dabigatran-rifampin",
        title: "Dabigatran + Rifampin Intestinal P-gp (ABCB1) Induction Collapse",
        drugPair: ["dabigatran", "rifampin"],
        description:
          "Dabigatran etexilate is a CYP-independent prodrug whose oral bioavailability (~3–7%) is tightly gated by enterocyte apical P-gp efflux. Rifampin activates PXR to strongly upregulate duodenal ABCB1 expression, slashing dabigatran systemic AUC by approximately 66–67%.",
        hazard:
          "Loss of thrombin inhibition, subtherapeutic anticoagulation, ischemic stroke, and systemic thromboembolism.",
        severity: "critical",
        mechanismDetail:
          "PXR-RXR transcriptional upregulation of enterocyte brush-border ABCB1 extrudes dabigatran etexilate back into the gut lumen prior to esterase conversion, persisting for 1–2 weeks after rifampin discontinuation (PMID: 22348256, PMID: 10411543).",
        literatureCitation:
          "Hartter S, et al. Br J Clin Pharmacol. 2012;74(3):495-500 (PMID: 22348256); Greiner B, et al. J Clin Invest. 1999;104(2):147-153 (PMID: 10411543).",
      },
      {
        id: "digoxin-rifampin",
        title: "Digoxin + Rifampin Duodenal ABCB1 Induction Proof-of-Mechanism",
        drugPair: ["digoxin", "rifampin"],
        description:
          "Rifampin increases human duodenal P-glycoprotein expression ~3.5-fold via PXR activation, dropping oral digoxin AUC by ~30% while leaving intravenous digoxin clearance minimally changed—proving intestinal P-gp is the dominant presystemic locus.",
        hazard:
          "Subtherapeutic digoxin serum concentrations, loss of ventricular rate control in atrial fibrillation, and heart failure decompensation.",
        severity: "high",
        mechanismDetail:
          "Transcriptional induction of intestinal ABCB1 decreases oral fraction absorbed (Fa) without materially altering glomerular filtration, while protracted protein turnover delays recovery for ~2 weeks post-stop (PMID: 10411543).",
        literatureCitation:
          "Greiner B, et al. The role of intestinal P-glycoprotein in the interaction of digoxin and rifampin. J Clin Invest. 1999;104(2):147-153 (PMID: 10411543).",
      },
    ],
    pharmacokineticImpact:
      "Modulates bioavailability (F), central nervous system penetration, biliary clearance, and renal tubular secretion. Inhibition increases systemic AUC and CNS distribution; induction decreases bioavailability.",
    fdaClassification: "FDA Index Efflux Transporter (In Vitro & Clinical DDI Guidance)",
    iupharClassification: "ABCB Family / ABCB1 (IUPHAR Transporter Database)",
    citations: [
      "Giacomini KM, et al. Membrane transporters in drug development. Nat Rev Drug Discov. 2010;9(3):215-236.",
      "FDA Guidance for Industry: Clinical Drug Interaction Studies — Cytochrome P450 Enzyme- and Transporter-Mediated Drug Interactions. U.S. FDA, 2020.",
      "Fromm MF. P-glycoprotein: a defense mechanism limiting oral bioavailability and CNS entry of drugs. Int J Clin Pharmacol Ther. 2000;38(2):69-74.",
    ],
  },

  // 2) BCRP / ABCG2
  {
    id: "bcrp-abcg2",
    gene: "ABCG2",
    name: "Breast Cancer Resistance Protein (BCRP / ABCG2)",
    aliases: ["BCRP", "ABCG2", "MXR", "ABCP", "CD338"],
    family: "ABC Efflux",
    atpDependent: true,
    primaryLocations: [
      "Intestinal apical membrane (limits oral bioavailability)",
      "Blood-Brain Barrier (capillary endothelia efflux)",
      "Hepatic canalicular membrane (biliary drug excretion)",
      "Placenta syncytiotrophoblast (fetoprotective barrier)",
    ],
    membraneVectors: [
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Small Intestine",
        anatomicalSite: "Enterocyte Apical Membrane",
        vectorSummary: "Extrudes substrates back into the intestinal lumen, constraining systemic absorption of hydrophilic anions and conjugates.",
      },
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Brain Microvasculature",
        anatomicalSite: "Endothelial Luminal Membrane",
        vectorSummary: "Pumps substrates from endothelial cells into luminal blood, collaborating with P-gp to reinforce the blood-brain barrier.",
      },
      {
        membrane: "canalicular",
        direction: "efflux",
        organ: "Liver",
        anatomicalSite: "Canalicular Membrane",
        vectorSummary: "Mediates active biliary secretion of sulfate conjugates and hydrophilic organic anions into bile.",
      },
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Placenta",
        anatomicalSite: "Syncytiotrophoblast Brush Border",
        vectorSummary: "Pumps xenobiotics back into maternal circulation, shielding the developing fetus.",
      },
    ],
    physiologicalRole:
      "High-capacity ATP-driven half-transporter (homodimer) protecting mucosal and endothelial boundaries. Regulates absorption of sulfated conjugates, porphyrins, statins, and antifolates while directing biliary excretion.",
    substrates: [
      "rosuvastatin",
      "methotrexate",
      "sulfasalazine",
      "topotecan",
      "apixaban",
      "rivaroxaban",
      "atorvastatin",
    ],
    inhibitors: [
      "gefitinib",
      "lapatinib",
      "cyclosporine",
      "eltrombopag",
      "regorafenib",
      "ritonavir",
      "paxlovid",
      "tavapadon",
    ],
    inducers: [],
    probeOrInvestigationalInhibitors: [
      "Elacridar (GF120918 - potent investigational dual BCRP/P-gp inhibitor)",
      "Curcumin (dietary polyphenol inhibitor of ABCG2 efflux)",
      "Fostamatinib (Syk kinase inhibitor displaying potent BCRP inhibition)",
      "Ko143 (selective nanomolar in vitro ABCG2 inhibitor tool)",
    ],
    clinicalCollisions: [
      {
        id: "rosuvastatin-lapatinib",
        title: "Rosuvastatin AUC Surge via Intestinal & Canalicular BCRP Inhibition",
        drugPair: ["rosuvastatin", "lapatinib"],
        description:
          "Lapatinib potently inhibits ABCG2 (BCRP) in intestinal enterocytes and hepatic canaliculi. Oral rosuvastatin bioavailability surges 2-to-3-fold, increasing peripheral tissue exposure.",
        hazard:
          "Profound statin-induced myopathy, severe rhabdomyolysis, and renal myoglobin cast nephropathy.",
        severity: "critical",
        mechanismDetail:
          "Inhibition of intestinal apical ABCG2 boosts rosuvastatin fraction absorbed (Fa) while canalicular BCRP inhibition slows biliary clearance, precipitating systemic statin toxicity.",
        literatureCitation:
          "Elsby R, et al. Validation of in vitro cell-based models to evaluate BCRP-mediated drug-drug interactions. Drug Metab Dispos. 2016;44(3):398-408.",
      },
      {
        id: "methotrexate-gefitinib",
        title: "Methotrexate Clearance Delay via BCRP Biliary & Tissue Blockade",
        drugPair: ["methotrexate", "gefitinib"],
        description:
          "Gefitinib inhibits BCRP-mediated efflux of methotrexate and its polyglutamated metabolites, reducing hepatobiliary elimination and sustaining cytotoxic plasma concentrations.",
        hazard:
          "Severe myelosuppression, fatal cytopenias, gastrointestinal mucositis, and acute nephrotoxicity.",
        severity: "high",
        mechanismDetail:
          "Methotrexate is actively excreted into bile by canalicular ABCG2; gefitinib competitive binding arrests this pathway, escalating systemic exposure.",
        literatureCitation:
          "Chen ZS, et al. Gefitinib (ZD1839) reverses Breast Cancer Resistance Protein-mediated multidrug resistance. Cancer Res. 2004;64(18):6660-6665.",
      },
      {
        id: "sulfasalazine-cyclosporine",
        title: "Sulfasalazine Systemic Exposure Elevation via Intestinal BCRP Efflux Suppression",
        drugPair: ["sulfasalazine", "cyclosporine"],
        description:
          "Cyclosporine blocks intestinal BCRP efflux, increasing sulfasalazine systemic absorption beyond the intended colonic luminally active target.",
        hazard:
          "Elevated systemic sulfasalazine concentrations, hemolytic anemia, and hepatic hypersensitivity.",
        severity: "moderate",
        mechanismDetail:
          "Sulfasalazine is a hallmark BCRP probe substrate; apical efflux inhibition in enterocytes allows higher systemic bioavailability.",
        literatureCitation:
          "Dahan A, Amidon GL. Small intestinal efflux mechanisms: impact of BCRP and P-gp on oral drug absorption. Eur J Pharm Sci. 2009;36(1):11-23.",
      },
      {
        id: "rosuvastatin-cyclosporine-bcrp",
        title: "Rosuvastatin + Cyclosporine Intestinal/Canalicular BCRP & Hepatic OATP1B1 Double-Hit",
        drugPair: ["rosuvastatin", "cyclosporine"],
        description:
          "Rosuvastatin undergoes minimal CYP metabolism (ECCS Class 3B hydrophilic acid) and relies critically on intestinal/canalicular BCRP (ABCG2) efflux and sinusoidal OATP1B1 (SLCO1B1) rate-limiting hepatic uptake. Cyclosporine blocks both transporters concurrently, spiking rosuvastatin AUC 7.1-fold and Cmax 10.6-fold.",
        hazard:
          "Severe statin-induced myopathy, fulminant rhabdomyolysis, myoglobinuric AKI, and hepatic transaminitis.",
        severity: "critical",
        mechanismDetail:
          "Apical ABCG2 inhibition increases intestinal absorption fraction (Fa) and blocks canalicular biliary extrusion (CLbile) while sinusoidal SLCO1B1 uptake arrest reduces Extended Clearance Concept rate-limiting hepatic influx (PSinf), trapping rosuvastatin in systemic blood and skeletal muscle (PMID: 15289793, PMID: 26155985).",
        literatureCitation:
          "Simonson SG, et al. Clin Pharmacol Ther. 2004;76(2):167-177 (PMID: 15289793); Varma MV, et al. Pharm Res. 2015 (PMID: 26155985).",
      },
    ],
    pharmacokineticImpact:
      "Dictates oral bioavailability (especially of rosuvastatin and sulfasalazine), biliary elimination of conjugates, and blood-brain barrier restriction. Polymorphisms (c.421C>A) further amplify susceptibility.",
    fdaClassification: "FDA Index Efflux Transporter (Clinical & In Vitro DDI)",
    iupharClassification: "ABCG Family / ABCG2 (IUPHAR Transporter Database)",
    citations: [
      "Robey RW, et al. ABCG2: determining its relevance in clinical drug resistance. Cancer Metastasis Rev. 2007;26(1):39-57.",
      "International Transporter Consortium. Transporters in drug development. Clin Pharmacol Ther. 2018;104(5):736-749.",
      "FDA Guidance for Industry: In Vitro Drug Interaction Studies — Cytochrome P450 Enzyme- and Transporter-Mediated Drug Interactions. 2020.",
    ],
  },

  // 3) OATP1B1 & OATP1B3 / SLCO1B1 & SLCO1B3
  {
    id: "oatp1b1-1b3-slco",
    gene: "SLCO1B1 & SLCO1B3",
    name: "Organic Anion Transporting Polypeptide 1B1 / 1B3 (OATP1B1/OATP1B3)",
    aliases: ["OATP1B1", "OATP1B3", "OATP-C", "OATP2", "SLCO1B1", "SLCO1B3", "LST-1"],
    family: "SLC Influx",
    atpDependent: false,
    primaryLocations: [
      "Basolateral (sinusoidal) membrane of hepatocytes (mediates uptake of drugs from portal blood into liver)",
    ],
    membraneVectors: [
      {
        membrane: "sinusoidal",
        direction: "influx",
        organ: "Liver",
        anatomicalSite: "Hepatocyte Sinusoidal Membrane",
        vectorSummary: "Extracts organic anions from portal and systemic blood across sinusoidal endothelium into hepatocyte cytoplasm for metabolism and biliary secretion.",
      },
    ],
    physiologicalRole:
      "Sodium-independent solute carrier specialized for hepatic first-pass extraction. Mediates sinusoidal uptake of endogenous bile acids, conjugated bilirubin, and anionic lipophilic pharmaceuticals into hepatocytes.",
    substrates: [
      "atorvastatin",
      "rosuvastatin",
      "simvastatin",
      "pravastatin",
      "pitavastatin",
      "repaglinide",
      "bosentan",
      "valsartan",
    ],
    inhibitors: [
      "cyclosporine",
      "gemfibrozil",
      "clarithromycin",
      "rifampin",
      "eltrombopag",
      "ritonavir",
      "paxlovid",
    ],
    inducers: [],
    probeOrInvestigationalInhibitors: [],
    clinicalCollisions: [
      {
        id: "atorvastatin-cyclosporine",
        title: "Cyclosporine Shutoff of Hepatic Sinusoidal OATP1B1 Statin Uptake",
        drugPair: ["cyclosporine", "atorvastatin"],
        description:
          "Cyclosporine potently inhibits hepatic sinusoidal OATP1B1/1B3 (SLCO1B1/3) influx alongside CYP3A4 and canalicular BCRP/P-gp efflux, collapsing Extended Clearance Concept hepatic uptake (PSinf) and producing an ~8.7-fold increase in atorvastatin AUC and 10.7-fold increase in Cmax.",
        hazard:
          "Massive systemic statin exposure, fulminant rhabdomyolysis, myoglobinuria, and acute tubular necrosis.",
        severity: "critical",
        mechanismDetail:
          "Under the Extended Clearance Concept, sinusoidal OATP1B1/1B3 uptake (PSinf) is rate-limiting for hepatic clearance; potent SLCO1B1/3 blockade traps atorvastatin in systemic blood while concurrent CYP3A4/BCRP arrest prevents escape clearance (PMID: 12099384, PMID: 26155985, PMID: 16714062).",
        literatureCitation:
          "Asberg A, et al. Am J Transplant. 2001 (PMID: 12099384); Niemi M, et al. Pharmacol Rev. 2011;63(1):157-181; Varma MV, et al. Pharm Res. 2015 (PMID: 26155985).",
      },
      {
        id: "simvastatin-gemfibrozil",
        title: "Gemfibrozil OATP1B1 Blockade + Glucuronidation Arrest",
        drugPair: ["gemfibrozil", "simvastatin"],
        description:
          "Gemfibrozil and its 1-O-beta-glucuronide metabolite potently inhibit sinusoidal OATP1B1 uptake alongside CYP2C8 and UGT1A3/1A1 clearance, triggering massive muscle accumulation of active simvastatin acid.",
        hazard:
          "Extremely elevated rhabdomyolysis hazard; contraindicated combination in clinical pharmacology practice.",
        severity: "critical",
        mechanismDetail:
          "Gemfibrozil glucuronide exerts mechanism-based inhibition of OATP1B1/1B3 uptake combined with metabolic inactivation, producing profound systemic circulating statin acid levels.",
        literatureCitation:
          "Shitara Y, et al. Gemfibrozil and its glucuronide inhibit the organic anion transporting polypeptide 2 (OATP2/OATP1B1:SLC21A6)-mediated hepatic uptake. J Pharmacol Exp Ther. 2004;311(1):228-236.",
      },
      {
        id: "rosuvastatin-cyclosporine",
        title: "Cyclosporine Dual Influx/Efflux Trap of Rosuvastatin",
        drugPair: ["cyclosporine", "rosuvastatin"],
        description:
          "Cyclosporine simultaneously inhibits sinusoidal OATP1B1/1B3 (SLCO1B1) hepatic uptake and intestinal/canalicular BCRP (ABCG2) efflux, increasing rosuvastatin steady-state AUC 7.1-fold and Cmax 10.6-fold.",
        hazard:
          "Severe statin-associated musculoskeletal toxicity, rhabdomyolysis, and hepatocellular injury.",
        severity: "critical",
        mechanismDetail:
          "Rosuvastatin is a prototypical ECCS Class 3B low-permeability hydrophilic acid where sinusoidal OATP1B1 uptake governs hepatic clearance (CLint,all ~ PSinf). Blockade of SLCO1B1 influx plus ABCG2 intestinal/biliary efflux traps statin in systemic blood and skeletal muscle (PMID: 15289793, PMID: 26155985, PMID: 16714062).",
        literatureCitation:
          "Simonson SG, et al. Clin Pharmacol Ther. 2004;76(2):167-177 (PMID: 15289793); Varma MV, et al. Pharm Res. 2015 (PMID: 26155985).",
      },
      {
        id: "pitavastatin-cyclosporine",
        title: "Pitavastatin + Cyclosporine ECC Class 3B Uptake-Limited Statin Collision",
        drugPair: ["pitavastatin", "cyclosporine"],
        description:
          "Pitavastatin undergoes negligible CYP450 oxidation and relies almost purely on sinusoidal OATP1B1 (SLCO1B1) hepatic uptake followed by biliary elimination. Cyclosporine blocks OATP1B1 uptake, elevating pitavastatin AUC ~4.6-fold despite minimal metabolic clearance dependence.",
        hazard:
          "Severe statin-associated myopathy and rhabdomyolysis in patients receiving calcineurin inhibitor immunosuppression.",
        severity: "critical",
        mechanismDetail:
          "Canonical Extended Clearance Concept Class 3B demonstration: when (CLmet + CLbile) >> PSdiff, hepatic clearance simplifies to PSinf, rendering systemic statin AUC exquisitely sensitive to OATP1B1 inhibition even with zero CYP involvement (PMID: 26155985, PMID: 16714062).",
        literatureCitation:
          "Shitara Y, Sugiyama Y. Pharmacol Ther. 2006;112(1):71-105 (PMID: 16714062); Varma MV, et al. Pharm Res. 2015 (PMID: 26155985).",
      },
      {
        id: "atorvastatin-rifampin-acute",
        title: "Atorvastatin + Rifampin Biphasic ECC Paradox (Acute OATP1B1 Block vs Chronic PXR Induction)",
        drugPair: ["atorvastatin", "rifampin"],
        description:
          "Acute single-exposure rifampin potently inhibits hepatic sinusoidal OATP1B1 uptake, spiking atorvastatin AUC ~6- to 7-fold, whereas chronic repeated rifampin activates PXR transcription of CYP3A4 and P-gp, collapsing atorvastatin AUC by ~80%.",
        hazard:
          "Acute myotoxicity upon initial co-administration followed by profound loss of LDL lowering during sustained therapy.",
        severity: "high",
        mechanismDetail:
          "Demonstrates temporal kinetic divergence under the Extended Clearance Concept: immediate competitive inhibition of rate-limiting sinusoidal PSinf precedes the 3–7 day transcriptional lag required for PXR-driven CYP3A4 upregulation (PMID: 26155985, PMID: 12882588).",
        literatureCitation:
          "Varma MV, et al. Pharm Res. 2015 (PMID: 26155985); Niemi M, et al. Clin Pharmacokinet. 2003 (PMID: 12882588).",
      },
      {
        id: "bosentan-cyclosporine",
        title: "Bosentan Sinusoidal Influx Blockade by Cyclosporine",
        drugPair: ["bosentan", "cyclosporine"],
        description:
          "Cyclosporine blocks OATP1B1/1B3-mediated liver clearance of bosentan, causing a 3- to 4-fold spike in bosentan plasma levels while bosentan reciprocally reduces cyclosporine levels.",
        hazard:
          "Marked hepatotoxicity, severe transaminase elevations, and loss of immunosuppression.",
        severity: "high",
        mechanismDetail:
          "Competitive inhibition of hepatic sinusoidal OATP-mediated uptake halts bosentan clearance, elevating systemic plasma levels.",
        literatureCitation:
          "Treiber A, et al. The organic anion transporting polypeptide 1B1 mediates the hepatic uptake of bosentan. Mol Pharmacol. 2007;72(2):481-488.",
      },
    ],
    pharmacokineticImpact:
      "Controls the hepatic clearance and first-pass extraction ratio (Eh) of statins and other organic anions. Inhibition causes marked elevation in systemic AUC without altering renal excretion.",
    fdaClassification: "FDA Index Hepatic Uptake Transporter (Clinical DDI Guidance)",
    iupharClassification: "SLCO Family / SLCO1B1 & SLCO1B3 (IUPHAR Transporter Database)",
    citations: [
      "Kalliokoski A, Niemi M. Impact of OATP transporters on pharmacokinetics. Br J Pharmacol. 2009;158(3):693-705.",
      "FDA Guidance for Industry: Clinical Drug Interaction Studies. U.S. FDA, 2020.",
      "Niemi M. Role of OATP transporters in statin disposition. Expert Opin Drug Metab Toxicol. 2007;3(4):545-554.",
    ],
  },

  // 4) OAT1 & OAT3 / SLC22A6 & SLC22A8
  {
    id: "oat1-oat3-slc22",
    gene: "SLC22A6 & SLC22A8",
    name: "Organic Anion Transporters 1 & 3 (OAT1 / OAT3)",
    aliases: ["OAT1", "OAT3", "SLC22A6", "SLC22A8", "PAH Transporter", "Organic Anion Carrier"],
    family: "SLC Influx",
    atpDependent: false,
    primaryLocations: [
      "Basolateral membrane of renal proximal tubular epithelial cells (uptake from peritubular capillary blood into tubular cells for secretion)",
    ],
    membraneVectors: [
      {
        membrane: "basolateral",
        direction: "influx",
        organ: "Kidney",
        anatomicalSite: "Proximal Tubular Basolateral Membrane",
        vectorSummary: "Transports hydrophilic organic anions from peritubular capillary blood into tubular epithelial cells via dicarboxylate exchange for active renal secretion into urine.",
      },
    ],
    physiologicalRole:
      "Tertiary active exchangers coupled to dicarboxylate (alpha-ketoglutarate) gradients. Drive basolateral extraction of small, water-soluble organic anions, antiviral nucleoside analogues, beta-lactam antibiotics, and diuretics into proximal tubular cells.",
    substrates: [
      "penicillin-g",
      "penicillin-v",
      "amoxicillin",
      "cefazolin",
      "ceftriaxone",
      "methotrexate",
      "furosemide",
      "ciprofloxacin",
    ],
    inhibitors: [
      "probenecid",
      "indomethacin",
      "ibuprofen",
    ],
    inducers: [],
    probeOrInvestigationalInhibitors: [],
    clinicalCollisions: [
      {
        id: "probenecid-penicillin-g",
        title: "Probenecid Prolongation of Penicillin Renal Secretion",
        drugPair: ["probenecid", "penicillin-g"],
        description:
          "Probenecid competitively blocks basolateral OAT1 and OAT3 uptake from peritubular capillary blood into proximal tubule cells, slashing tubular secretion of penicillin G and sustaining high bactericidal serum levels.",
        hazard:
          "Prolonged beta-lactam exposure; utilized therapeutically for neurosyphilis regimens, but alters standard pharmacokinetic clearance.",
        severity: "moderate",
        mechanismDetail:
          "Probenecid exhibits high affinity for SLC22A6/A8 binding sites, competitively displacing penicillins and reducing renal tubular clearance by over 50%.",
        literatureCitation:
          "Burnett AL, et al. Mechanism of the renal tubular secretion of penicillins. J Pharmacol Exp Ther. 1951;102(3):214-222.",
      },
      {
        id: "probenecid-methotrexate",
        title: "Probenecid Arrest of Renal Methotrexate Elimination",
        drugPair: ["probenecid", "methotrexate"],
        description:
          "Probenecid potently inhibits basolateral OAT1 and OAT3, shutting down active tubular secretion of methotrexate and 7-hydroxymethotrexate, precipitating severe toxic drug accumulation.",
        hazard:
          "Lethal methotrexate toxicity: life-threatening pancytopenia, acute kidney injury, severe gastrointestinal ulcerations, and sepsis.",
        severity: "critical",
        mechanismDetail:
          "Methotrexate relies on basolateral OAT1/3 transport for active renal clearance; probenecid blockade traps methotrexate in the systemic circulation.",
        literatureCitation:
          "Aumente D, et al. Evaluation of methotrexate renal clearance and transporter interactions. J Clin Pharm Ther. 2006;31(4):357-362.",
      },
      {
        id: "ibuprofen-methotrexate",
        title: "NSAID-Mediated Blockade of Renal Tubular Methotrexate Secretion",
        drugPair: ["ibuprofen", "methotrexate"],
        description:
          "Ibuprofen competitively inhibits basolateral OAT1/3 uptake of methotrexate and simultaneously reduces renal perfusion via prostaglandin synthesis inhibition, dropping renal clearance.",
        hazard:
          "Severe toxic methotrexate accumulation, profound bone marrow suppression, and acute nephrotoxicity.",
        severity: "critical",
        mechanismDetail:
          "NSAIDs are competitive substrates/inhibitors of SLC22A6/A8; the interaction blunts both tubular extraction and hemodynamic filtration.",
        literatureCitation:
          "El-Sheikh AA, et al. Mechanisms of renal anion transport inhibition by NSAIDs. Eur J Pharmacol. 2007;554(2-3):159-166.",
      },
      {
        id: "indomethacin-methotrexate",
        title: "Indomethacin Competitive OAT1/3 Transport Blockade of Methotrexate",
        drugPair: ["indomethacin", "methotrexate"],
        description:
          "Indomethacin potently blocks renal OAT1 and OAT3, dramatically suppressing methotrexate clearance during oncologic or rheumatologic therapy.",
        hazard:
          "Fatal bone marrow aplasia and systemic methotrexate cytotoxicity.",
        severity: "critical",
        mechanismDetail:
          "High-affinity binding of indomethacin to SLC22A6/A8 basolateral transporters displaces methotrexate, impairing active renal secretion.",
        literatureCitation:
          "Tracey RB, et al. Severe methotrexate toxicity induced by indomethacin co-administration. Med J Aust. 1986;144(7):391-392.",
      },
    ],
    pharmacokineticImpact:
      "Mediates active renal clearance (Clr) of anionic drugs and loop diuretics. Inhibition doubles or triples systemic exposure of cleared substrates and delays diuretic delivery to the luminal site of action.",
    fdaClassification: "FDA Index Renal Secretion Transporter (Clinical & In Vitro DDI)",
    iupharClassification: "SLC22 Family / SLC22A6 & SLC22A8 (IUPHAR Transporter Database)",
    citations: [
      "Burckhardt G. Drug transport by Organic Anion Transporters (OATs). Pharmacol Ther. 2012;136(1):106-130.",
      "FDA Guidance for Industry: Clinical Drug Interaction Studies. U.S. FDA, 2020.",
      "VanWert AL, et al. Organic anion transporters: discovery, pharmacology, and significance. Expert Opin Drug Metab Toxicol. 2010;6(1):1-16.",
    ],
  },

  // 5) OCT2 & MATE1/MATE2-K / SLC22A2 & SLC47A1/2
  {
    id: "oct2-mate-slc22",
    gene: "SLC22A2 & SLC47A1/SLC47A2",
    name: "Organic Cation Transporter 2 & MATE1/MATE2-K (OCT2 / MATE Axis)",
    aliases: ["OCT2", "MATE1", "MATE2-K", "SLC22A2", "SLC47A1", "SLC47A2", "Renal Cation Secretion Axis"],
    family: "SLC Influx",
    atpDependent: false,
    primaryLocations: [
      "Basolateral membrane of renal proximal tubular cells (OCT2 influx from peritubular capillary blood into cell)",
      "Apical brush border membrane of renal proximal tubular cells (MATE1/MATE2-K efflux into tubular urine)",
    ],
    membraneVectors: [
      {
        membrane: "basolateral",
        direction: "influx",
        organ: "Kidney",
        anatomicalSite: "Proximal Tubule Basolateral Membrane (OCT2)",
        vectorSummary: "Electrogenically transports positively charged organic cations from peritubular blood into proximal tubular cell cytoplasm.",
      },
      {
        membrane: "apical",
        direction: "efflux",
        organ: "Kidney",
        anatomicalSite: "Proximal Tubule Apical Brush Border (MATE1/2-K)",
        vectorSummary: "Antiporter using proton (H+) exchange gradient to actively extrude cations from tubular cytoplasm into the pro-urine lumen.",
      },
    ],
    physiologicalRole:
      "Integrated dual-membrane renal secretion axis. Basolateral OCT2 (SLC22A2) drives membrane potential-dependent uptake of organic cations from blood; apical MATE1 and MATE2-K (SLC47A1/2) couple outward cation export to an inward proton gradient for luminal urinary elimination.",
    substrates: [
      "metformin",
      "cisplatin",
      "atenolol",
    ],
    inhibitors: [
      "cimetidine",
      "dolutegravir",
      "ranolazine",
      "tmp-smx",
    ],
    inducers: [],
    probeOrInvestigationalInhibitors: [],
    clinicalCollisions: [
      {
        id: "cimetidine-metformin",
        title: "Cimetidine Asymmetric MATE1/MATE2-K & OCT2 Blockade of Renal Metformin Secretion",
        drugPair: ["cimetidine", "metformin"],
        description:
          "Cimetidine exhibits substantially higher affinity for apical MATE1/MATE2-K (Ki ≈ 1–7 µM) than basolateral OCT2 (Ki ≈ 95–150 µM). Entering proximal tubular cells via OCT2, cimetidine arrests apical H+-coupled MATE extrusion of metformin into urine, reducing renal clearance by 27% to 35% and trapping metformin intracellularly.",
        hazard:
          "Renal tubular and systemic metformin accumulation, mitochondrial complex I inhibition, metformin-associated lactic acidosis (MALA), and severe GI distress.",
        severity: "critical",
        mechanismDetail:
          "Asymmetric apical MATE1/MATE2-K efflux blockade coupled with intact basolateral OCT2 entry elevates intracellular proximal tubular metformin accumulation alongside plasma exposure, amplifying lactic acidosis risk especially in reduced eGFR.",
        literatureCitation:
          "Somogyi A, et al. Br J Clin Pharmacol. 1987;23(5):545-551; Ito S, et al. Clin Pharmacol Ther. 2012 (cimetidine MATE1 vs OCT2 selectivity).",
      },
      {
        id: "dolutegravir-metformin",
        title: "Dolutegravir OCT2 & MATE1 Blockade of Renal Metformin Secretion",
        drugPair: ["dolutegravir", "metformin"],
        description:
          "Dolutegravir potently inhibits basolateral renal OCT2 (IC50 ≈ 1.9 µM) and apical MATE1 (IC50 ≈ 6.3 µM), blocking active transcellular cation secretion and driving an ~79% increase in metformin AUC (up to 2.4-fold with higher exposure) and 66% rise in Cmax without reducing true GFR.",
        hazard:
          "Substantial intracellular and systemic metformin accumulation, hypoglycemia, gastrointestinal intolerance, and lactic acidosis risk.",
        severity: "high",
        mechanismDetail:
          "Potent inhibition of SLC22A2 basolateral influx and SLC47A1 apical extrusion impedes urinary elimination of unchanged metformin while also blocking tubular creatinine secretion (causing benign pseudo-elevation of serum creatinine unrelated to GFR loss).",
        literatureCitation:
          "Song IH, et al. Effect of dolutegravir on the pharmacokinetics of metformin in healthy subjects. J Acquir Immune Defic Syndr. 2016;72(4):400-407.",
      },
      {
        id: "ranolazine-metformin",
        title: "Ranolazine Inhibition of Renal OCT2 Metformin Transport",
        drugPair: ["ranolazine", "metformin"],
        description:
          "Ranolazine inhibits OCT2 in proximal tubular cells, resulting in an exposure-dependent increase in metformin AUC (up to 1.8-fold at high therapeutic exposure).",
        hazard:
          "Elevated metformin serum levels and increased risk of metabolic acidosis.",
        severity: "high",
        mechanismDetail:
          "Inhibition of SLC22A2 basolateral influx impedes transcellular renal clearance of cationic substrates.",
        literatureCitation:
          "Chu X, et al. Clinical implications of drug-drug interactions involving OCT2 and MATE transporters. J Pharm Sci. 2017;106(9):2294-2307.",
      },
      {
        id: "tmp-smx-metformin",
        title: "Trimethoprim (TMP-SMX) Blockade of Renal Cation Excretion",
        drugPair: ["tmp-smx", "metformin"],
        description:
          "The trimethoprim component of TMP-SMX inhibits renal OCT2 and MATE1 transporters, decreasing active secretion of metformin and producing higher systemic levels.",
        hazard:
          "Metformin overexposure and compounding hyperkalemia/nephrotoxic burden.",
        severity: "high",
        mechanismDetail:
          "Trimethoprim inhibits basolateral OCT2 and apical MATE transporters, reducing the renal clearance of organic cations.",
        literatureCitation:
          "Wang Z, et al. Organic Cation Transporters (OCTs) and Multidrug and Toxin Extrusion (MATE) Transporters in Renal Drug Disposition. AAPS J. 2016;18(3):616-628.",
      },
    ],
    pharmacokineticImpact:
      "Dictates the transcellular secretory clearance of cationic drugs (e.g. metformin) into urine. Inhibition of OCT2 or MATE selectively suppresses active tubular secretion without lowering glomerular filtration rate (GFR).",
    fdaClassification: "FDA Index Renal Cation Transporter Axis (Clinical & In Vitro DDI)",
    iupharClassification: "SLC22 & SLC47 Families / SLC22A2 & SLC47A1/2 (IUPHAR Database)",
    citations: [
      "Koepsell H. The SLC22 family with transporters of organic cations, anions and zwitterions. Mol Aspects Med. 2013;34(2-3):413-435.",
      "Motohashi H, Inui K. Multidrug and toxin extrusion family SLC47: physiological, pharmacological and toxicological importance. Mol Aspects Med. 2013;34(2-3):661-668.",
      "FDA Guidance for Industry: Clinical Drug Interaction Studies. U.S. FDA, 2020.",
    ],
  },
];

export const BARRIER_ARCHITECTURES: readonly BarrierArchitecture[] = [
  {
    id: "bbb",
    name: "Blood-Brain Barrier (BBB)",
    shortName: "BBB",
    badge: "Neurovascular Unit",
    organ: "Cerebral Microvasculature",
    apicalSideLabel: "Capillary Lumen (Circulating Blood)",
    apicalSideDescription: "Systemic arterial microcirculation flowing through brain capillary beds.",
    basolateralSideLabel: "Brain Parenchyma / CNS Interstitium",
    basolateralSideDescription: "Astrocyte end-feet, pericytes, and neural extracellular interstitial fluid.",
    cellularCompartment: "Brain Capillary Endothelial Cells with Tight Junctions (Claudin-5, Occludin)",
    barrierDescription:
      "Continuous tight junctions seal paracellular pathways, forcing all transport to be transcellular. Luminal ATP-dependent efflux pumps (P-gp, BCRP) actively intercept lipophilic compounds in the endothelial membrane and pump them back into blood, restricting central access.",
    transporterNodes: [
      {
        transporterId: "pgp-abcb1",
        gene: "ABCB1",
        name: "P-glycoprotein (P-gp)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Endothelial Cytoplasm -> Capillary Blood",
        arrowDirection: "up",
        mechanismNote: "Apical efflux pump repelling loperamide, digoxin, cyclosporine from entering brain tissue.",
      },
      {
        transporterId: "bcrp-abcg2",
        gene: "ABCG2",
        name: "Breast Cancer Resistance Protein (BCRP)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Endothelial Cytoplasm -> Capillary Blood",
        arrowDirection: "up",
        mechanismNote: "Synergistic luminal efflux gate for topotecan, methotrexate, and sulfated metabolites.",
      },
    ],
    clinicalTakeaway:
      "Loperamide is a potent peripheral opioid that fails to cross the BBB under normal physiological conditions due to active P-gp efflux. Co-administering potent P-gp inhibitors (quinidine, verapamil) causes central penetration, respiratory arrest, and euphoria.",
    citations: [
      "Sadeque AJ, et al. Increased drug delivery to the brain by P-glycoprotein inhibition. Clin Pharmacol Ther. 2000;68(3):231-237.",
      "Giacomini KM, et al. Nat Rev Drug Discov. 2010;9(3):215-236.",
    ],
  },
  {
    id: "intestinal",
    name: "Intestinal Epithelium",
    shortName: "Intestine",
    badge: "Mucosal Absorption Gate",
    organ: "Small Intestinal Enterocyte (Jejunum/Ileum)",
    apicalSideLabel: "Gut Lumen (Ingested Contents)",
    apicalSideDescription: "Intraluminal fluid containing orally administered pharmaceuticals and dietary solutes.",
    basolateralSideLabel: "Mesenteric Capillary Blood (Portal System)",
    basolateralSideDescription: "Submucosal capillaries collecting absorbed compounds for portal venous delivery to the liver.",
    cellularCompartment: "Polarized Columnar Enterocyte with Apical Microvilli Brush Border",
    barrierDescription:
      "Acts as the first biological checkpoint of oral bioavailability. Apical efflux pumps (P-gp, BCRP) actively eject absorbed molecules back into the gut lumen, cycling substrates repeatedly past enterocyte CYP3A4 to multiply presystemic extraction (Fa * Fg).",
    transporterNodes: [
      {
        transporterId: "pgp-abcb1",
        gene: "ABCB1",
        name: "P-glycoprotein (P-gp)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Enterocyte Cytoplasm -> Gut Lumen",
        arrowDirection: "up",
        mechanismNote: "Extrudes dabigatran, colchicine, digoxin, tacrolimus, apixaban, and rivaroxaban back into gut lumen, prolonging enterocyte CYP3A4 encounter probability (PMID: 11861813).",
      },
      {
        transporterId: "bcrp-abcg2",
        gene: "ABCG2",
        name: "BCRP (ABCG2)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Enterocyte Cytoplasm -> Gut Lumen",
        arrowDirection: "up",
        mechanismNote: "Ejects rosuvastatin, apixaban, and sulfasalazine back into intestinal lumen, modulating systemic absorption.",
      },
    ],
    clinicalTakeaway:
      "Inhibition of intestinal P-gp + CYP3A4 (Paxlovid, clarithromycin, verapamil) produces super-additive oral bioavailability surges (tacrolimus, sirolimus, rivaroxaban), whereas PXR induction of duodenal P-gp (rifampin) cuts dabigatran and digoxin bioavailability (PMID: 10411543, PMID: 22348256).",
    citations: [
      "Fromm MF. Int J Clin Pharmacol Ther. 2000;38(2):69-74.",
      "Cummins CL, et al. Unmasking the dynamic interplay between intestinal P-glycoprotein and CYP3A4. J Pharmacol Exp Ther. 2002 (PMID: 11861813).",
      "Greiner B, et al. The role of intestinal P-glycoprotein in the interaction of digoxin and rifampin. J Clin Invest. 1999 (PMID: 10411543).",
      "International Transporter Consortium. Clin Pharmacol Ther. 2018;104(5):736-749.",
    ],
  },
  {
    id: "hepatic",
    name: "Hepatic Sinusoid & Canaliculus",
    shortName: "Liver",
    badge: "Hepatobiliary Clearance Engine",
    organ: "Polarized Hepatocyte",
    apicalSideLabel: "Bile Canaliculus (Biliary Tree)",
    apicalSideDescription: "Canalicular lumen conducting bile acids, conjugated drugs, and metabolites to the biliary tree.",
    basolateralSideLabel: "Sinusoidal Blood (Portal & Hepatic Arterial)",
    basolateralSideDescription: "Fenestrated sinusoids delivering first-pass portal blood and oxygenated arterial blood.",
    cellularCompartment: "Hepatocyte Parenchyma (Metabolic & Secretory Hub)",
    barrierDescription:
      "Governed by the Extended Clearance Concept (ECC): CLint,all = PSinf * (CLmet + CLbile) / (PSeff + CLmet + CLbile). Basolateral OATP1B1/1B3 carriers drive rate-limiting sinusoidal influx for ECCS Class 1B/3B acids, while intracellular CYPs/UGTs (CLmet) and canalicular ABC pumps (CLbile: P-gp, BCRP) complete vectorial clearance (PMID: 26155985, PMID: 16714062).",
    transporterNodes: [
      {
        transporterId: "oatp1b1-1b3-slco",
        gene: "SLCO1B1 & SLCO1B3",
        name: "OATP1B1 & OATP1B3",
        membrane: "sinusoidal",
        direction: "influx",
        vectorLabel: "Sinusoidal Blood -> Hepatocyte Cytoplasm",
        arrowDirection: "down",
        mechanismNote: "Rate-limiting sinusoidal uptake (PSinf) for ECCS Class 1B/3B statins (atorvastatin, rosuvastatin, pitavastatin), bosentan, and repaglinide.",
      },
      {
        transporterId: "pgp-abcb1",
        gene: "ABCB1",
        name: "P-gp (Canalicular)",
        membrane: "canalicular",
        direction: "efflux",
        vectorLabel: "Hepatocyte Cytoplasm -> Bile Canaliculus",
        arrowDirection: "up",
        mechanismNote: "Active biliary secretion (CLbile) of digoxin, paclitaxel, colchicine into bile.",
      },
      {
        transporterId: "bcrp-abcg2",
        gene: "ABCG2",
        name: "BCRP (Canalicular)",
        membrane: "canalicular",
        direction: "efflux",
        vectorLabel: "Hepatocyte Cytoplasm -> Bile Canaliculus",
        arrowDirection: "up",
        mechanismNote: "Active biliary excretion (CLbile) of rosuvastatin, methotrexate, and sulfate conjugates.",
      },
    ],
    clinicalTakeaway:
      "For ECCS Class 3B uptake-rate-limited statins (rosuvastatin, pitavastatin, atorvastatin), cyclosporine or gemfibrozil blocks OATP1B1 sinusoidal influx (PSinf), spiking systemic plasma AUC 5- to 10-fold and driving skeletal muscle rhabdomyolysis while blunting intrahepatic access (PMID: 15289793, PMID: 26155985).",
    citations: [
      "Varma MV, et al. Predicting Clearance Mechanism in Drug Discovery: Extended Clearance Classification System (ECCS). Pharm Res. 2015 (PMID: 26155985).",
      "Shitara Y, Sugiyama Y. Pharmacol Ther. 2006;112(1):71-105 (PMID: 16714062).",
      "Niemi M, et al. Pharmacol Rev. 2011;63(1):157-181.",
    ],
  },
  {
    id: "renal",
    name: "Renal Proximal Tubule",
    shortName: "Kidney",
    badge: "Active Tubular Secretion Axis",
    organ: "Proximal Tubular Epithelial Cell",
    apicalSideLabel: "Tubular Lumen (Pro-Urine Filtrate)",
    apicalSideDescription: "Glomerular filtrate flowing across proximal brush border toward loop of Henle.",
    basolateralSideLabel: "Peritubular Capillary Blood",
    basolateralSideDescription: "Peritubular capillaries bathing basolateral membrane with post-glomerular blood.",
    cellularCompartment: "Proximal Tubular Epithelium (S1/S2/S3 Segments)",
    barrierDescription:
      "Active transcellular secretion of hydrophilic anions and cations. Basolateral OAT1/3 and OCT2 uptake from peritubular blood is coupled with apical MATE1/2-K and ABCB1 extrusion into the tubular lumen for urinary excretion.",
    transporterNodes: [
      {
        transporterId: "oat1-oat3-slc22",
        gene: "SLC22A6 & SLC22A8",
        name: "OAT1 & OAT3",
        membrane: "basolateral",
        direction: "influx",
        vectorLabel: "Peritubular Blood -> Tubular Cell Cytoplasm",
        arrowDirection: "down",
        mechanismNote: "Basolateral uptake of penicillins, methotrexate, cephalosporins, and loop diuretics.",
      },
      {
        transporterId: "oct2-mate-slc22",
        gene: "SLC22A2 & SLC47A1/2",
        name: "OCT2 & MATE1/2-K Axis",
        membrane: "basolateral",
        direction: "influx",
        vectorLabel: "Peritubular Blood -> Tubular Cell -> Urine",
        arrowDirection: "up",
        mechanismNote: "Coupled cation secretion: OCT2 mediates basolateral uptake; MATE1/2-K drives apical proton-coupled efflux of metformin.",
      },
      {
        transporterId: "pgp-abcb1",
        gene: "ABCB1",
        name: "P-gp (Apical Tubular)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Tubular Cell Cytoplasm -> Pro-Urine",
        arrowDirection: "up",
        mechanismNote: "Active apical secretion of digoxin and dabigatran directly into tubular urine.",
      },
    ],
    clinicalTakeaway:
      "Probenecid blocks OAT1/3, competitively inhibiting renal tubular secretion of penicillin (therapeutic prolongation) or methotrexate (severe toxic accumulation, pancytopenia). Cimetidine or dolutegravir inhibits OCT2/MATE secretion of metformin, raising lactic acidosis risk.",
    citations: [
      "Burckhardt G. Pharmacol Ther. 2012;136(1):106-130.",
      "Wang Z, et al. AAPS J. 2016;18(3):616-628.",
    ],
  },
];

export function getTransporterById(id: string): TransporterInfo | null {
  return TRANSPORTERS.find((t) => t.id === id) ?? null;
}

export function findTransportersForDrug(drugId: string): TransporterInfo[] {
  const normalized = drugId.trim().toLowerCase();
  if (!normalized) return [];

  return TRANSPORTERS.filter((transporter) => {
    const isSubstrate = transporter.substrates.some((s) => s.toLowerCase() === normalized);
    const isInhibitor = transporter.inhibitors.some((i) => i.toLowerCase() === normalized);
    const isInducer = transporter.inducers.some((ind) => ind.toLowerCase() === normalized);
    const inCollision = transporter.clinicalCollisions.some((c) =>
      c.drugPair.some((p) => p.toLowerCase() === normalized),
    );

    return isSubstrate || isInhibitor || isInducer || inCollision;
  });
}

export function getAllTransporters(): readonly TransporterInfo[] {
  return TRANSPORTERS;
}

export function getBarrierById(id: BarrierId): BarrierArchitecture | null {
  return BARRIER_ARCHITECTURES.find((b) => b.id === id) ?? null;
}

export function getAllBarriers(): readonly BarrierArchitecture[] {
  return BARRIER_ARCHITECTURES;
}

// ---------------------------------------------------------------------------
// Extended Clearance Concept (ECC) & Transporter-Enzyme Interplay Engine
// ---------------------------------------------------------------------------

/** Extended Clearance Classification System (ECCS) classes (Varma et al. 2015, PMID: 26155985). */
export type EccsClassId = "1A" | "1B" | "2" | "3A" | "3B" | "4";

/** Reference biophysical profile for an ECCS clearance class. */
export interface EccsClassProfile {
  classId: EccsClassId;
  title: string;
  ionizationAndMw: string;
  permeability: "High" | "Low";
  primaryClearanceRoute: string;
  rateLimitingStep: string;
  keyTransportersAndEnzymes: string[];
  exemplarDrugIds: string[];
  ddiVulnerability: string;
}

/** Canonical ECCS Class 1A–4 profiles with all exemplarDrugIds grounded in `DRUG_BY_ID`. */
export const ECCS_CLASS_PROFILES: readonly EccsClassProfile[] = [
  {
    classId: "1A",
    title: "Class 1A — High-Permeability Metabolism-Limited Acids",
    ionizationAndMw: "Acids/Zwitterions, MW <= 400 Da, high passive permeability",
    permeability: "High",
    primaryClearanceRoute: "Hepatic CYP/UGT intracellular metabolism (CLmet)",
    rateLimitingStep: "Intracellular metabolic turnover (PSeff ~ PSdiff >> CLmet + CLbile)",
    keyTransportersAndEnzymes: ["CYP2C9", "CYP3A4", "UGTs"],
    exemplarDrugIds: ["warfarin", "ibuprofen", "indomethacin"],
    ddiVulnerability: "Sensitive to metabolic enzyme inhibition/induction; minimal plasma AUC impact from OATP1B1 blockade.",
  },
  {
    classId: "1B",
    title: "Class 1B — High-Permeability Hepatic Uptake-Assisted Acids",
    ionizationAndMw: "Acids/Zwitterions, MW > 400 Da, high passive permeability + active sinusoidal influx",
    permeability: "High",
    primaryClearanceRoute: "Hepatic OATP1B1/1B3 uptake coupled to CYP/UGT metabolism",
    rateLimitingStep: "Combined sinusoidal uptake (PSinf) and intracellular metabolic clearance",
    keyTransportersAndEnzymes: ["SLCO1B1", "SLCO1B3", "CYP3A4", "CYP2C8", "UGT1A3"],
    exemplarDrugIds: ["atorvastatin", "repaglinide", "bosentan"],
    ddiVulnerability: "Dual hit when OATP1B1 and CYP/UGT are inhibited simultaneously (e.g. cyclosporine + atorvastatin, gemfibrozil + repaglinide).",
  },
  {
    classId: "2",
    title: "Class 2 — High-Permeability Bases & Neutrals",
    ionizationAndMw: "Bases/Neutrals, high passive permeability",
    permeability: "High",
    primaryClearanceRoute: "CYP/UGT hepatic & intestinal metabolism + apical P-gp interplay",
    rateLimitingStep: "Metabolic clearance (plus gut P-gp recycling for large amphipathic neutrals)",
    keyTransportersAndEnzymes: ["CYP3A4", "CYP2D6", "ABCB1 (P-gp)"],
    exemplarDrugIds: ["midazolam", "simvastatin", "tacrolimus", "rivaroxaban"],
    ddiVulnerability: "Vulnerable to gut/liver CYP3A4 MBI and concerted gut P-gp + CYP3A4 collapse (e.g. Paxlovid + tacrolimus/rivaroxaban).",
  },
  {
    classId: "3A",
    title: "Class 3A — Low-Permeability Renally Cleared Acids",
    ionizationAndMw: "Acids/Zwitterions, MW <= 400 Da, low passive permeability",
    permeability: "Low",
    primaryClearanceRoute: "Renal glomerular filtration + basolateral OAT1/OAT3 tubular secretion",
    rateLimitingStep: "Renal basolateral uptake / filtration",
    keyTransportersAndEnzymes: ["SLC22A6 (OAT1)", "SLC22A8 (OAT3)"],
    exemplarDrugIds: ["furosemide", "penicillin-g", "methotrexate"],
    ddiVulnerability: "Sensitive to renal OAT1/3 blockade (probenecid, NSAIDs) delaying elimination and risking systemic cytotoxicity.",
  },
  {
    classId: "3B",
    title: "Class 3B — Low-Permeability Hepatic Uptake Rate-Limited Acids",
    ionizationAndMw: "Acids/Zwitterions, MW > 400 Da, low passive permeability",
    permeability: "Low",
    primaryClearanceRoute: "Active OATP1B1/1B3 sinusoidal uptake followed by unchanged biliary/renal excretion",
    rateLimitingStep: "Sinusoidal uptake clearance (PSinf) because (CLmet + CLbile) >> PSdiff (beta -> 1)",
    keyTransportersAndEnzymes: ["SLCO1B1 (OATP1B1)", "SLCO1B3 (OATP1B3)", "ABCG2 (BCRP)", "ABCC2"],
    exemplarDrugIds: ["rosuvastatin", "pravastatin", "pitavastatin", "valsartan"],
    ddiVulnerability: "Exquisitely sensitive to OATP1B1 and BCRP inhibition (cyclosporine + rosuvastatin/pitavastatin); plasma AUC spikes even with minimal CYP involvement.",
  },
  {
    classId: "4",
    title: "Class 4 — Low-Permeability Bases & Neutrals (Renal / Efflux Gated)",
    ionizationAndMw: "Bases/Neutrals, low passive permeability",
    permeability: "Low",
    primaryClearanceRoute: "Renal filtration + OCT2/MATE or P-gp active tubular/intestinal efflux",
    rateLimitingStep: "Transporter-mediated secretion or intestinal P-gp absorption gating",
    keyTransportersAndEnzymes: ["SLC22A2 (OCT2)", "SLC47A1/2 (MATE1/2-K)", "ABCB1 (P-gp)"],
    exemplarDrugIds: ["metformin", "atenolol", "digoxin", "dabigatran"],
    ddiVulnerability: "Susceptible to OCT2/MATE blockade (dolutegravir, cimetidine + metformin) or intestinal P-gp inhibition/induction (rifampin + dabigatran/digoxin).",
  },
];

/** Input parameters for Extended Clearance Concept (ECC) hepatic clearance partitioning. */
export interface ExtendedClearanceInput {
  /** Active sinusoidal uptake clearance PSinf,active (e.g. OATP1B1/1B3, >= 0). */
  psInfluxActive: number;
  /** Passive sinusoidal membrane diffusion clearance PSdiff (>= 0). */
  psPassiveDiff: number;
  /** Active basolateral sinusoidal efflux clearance PSeff,active (e.g. MRP3/4, >= 0; default 0). */
  psEffluxActive?: number;
  /** Intracellular hepatic metabolic clearance CLmet (>= 0). */
  clMetabolic: number;
  /** Canalicular biliary efflux clearance CLbile (e.g. BCRP/P-gp/MRP2, >= 0). */
  clBiliary: number;
  /** Remaining fraction of active OATP uptake under perpetrator (>= 0; default 1.0). */
  uptakeActivityFactor?: number;
  /** Multiplier on CLmet (>= 0; < 1 for inhibition, > 1 for induction; default 1.0). */
  metabolismActivityFactor?: number;
  /** Multiplier on CLbile (>= 0; < 1 for BCRP/P-gp inhibition; default 1.0). */
  biliaryActivityFactor?: number;
  /** Optional unbound fraction in blood fub in (0, 1] for well-stirred organ clearance. */
  fub?: number;
  /** Optional hepatic blood flow Qh (> 0, same flow units as clearances) for well-stirred Eh/AUCR. */
  hepaticBloodFlow?: number;
}

/** Quantitative output of Extended Clearance Concept (ECC) partitioning and systemic vs intrahepatic shifts. */
export interface ExtendedClearanceResult {
  valid: boolean;
  reason?: string;
  baselineClIntAll: number;
  modulatedClIntAll: number;
  baselineBeta: number;
  modulatedBeta: number;
  rateLimitingRegime: "uptake-rate-limited" | "mixed-uptake-elimination" | "metabolism-biliary-limited";
  systemicExposureRatio: number;
  intrahepaticKpuuRatio: number;
  intrahepaticAucRatio: number;
  baselineHepaticExtraction: number | null;
  modulatedHepaticExtraction: number | null;
  formulaNote: string;
}

function invalidEccResult(reason: string): ExtendedClearanceResult {
  return {
    valid: false,
    reason,
    baselineClIntAll: 0,
    modulatedClIntAll: 0,
    baselineBeta: 0,
    modulatedBeta: 0,
    rateLimitingRegime: "mixed-uptake-elimination",
    systemicExposureRatio: 1,
    intrahepaticKpuuRatio: 1,
    intrahepaticAucRatio: 1,
    baselineHepaticExtraction: null,
    modulatedHepaticExtraction: null,
    formulaNote: "Invalid Extended Clearance Concept input parameters.",
  };
}

/**
 * Computes hepatic intrinsic clearance and systemic vs intrahepatic exposure partitioning using
 * the Extended Clearance Concept (Shitara & Sugiyama, PMID: 16714062; Varma et al., PMID: 26155985):
 *   CLint,all = (PSinf,active + PSdiff) * (CLmet + CLbile) / (PSeff,active + PSdiff + CLmet + CLbile)
 * Explains why inhibiting sinusoidal OATP1B1 uptake causes large systemic plasma AUC surges while
 * dropping intrahepatic statin exposure, whereas blocking canalicular efflux or metabolism alone
 * in an uptake-rate-limited drug spikes intrahepatic drug levels with minimal plasma AUC change.
 */
export function calculateExtendedHepaticClearance(
  input: ExtendedClearanceInput,
): ExtendedClearanceResult {
  const {
    psInfluxActive,
    psPassiveDiff,
    psEffluxActive = 0,
    clMetabolic,
    clBiliary,
    uptakeActivityFactor = 1,
    metabolismActivityFactor = 1,
    biliaryActivityFactor = 1,
    fub,
    hepaticBloodFlow,
  } = input;

  const nonNegChecks: Array<[string, number]> = [
    ["psInfluxActive", psInfluxActive],
    ["psPassiveDiff", psPassiveDiff],
    ["psEffluxActive", psEffluxActive],
    ["clMetabolic", clMetabolic],
    ["clBiliary", clBiliary],
    ["uptakeActivityFactor", uptakeActivityFactor],
    ["metabolismActivityFactor", metabolismActivityFactor],
    ["biliaryActivityFactor", biliaryActivityFactor],
  ];
  for (const [label, val] of nonNegChecks) {
    if (!Number.isFinite(val) || val < 0) {
      return invalidEccResult(`${label} must be a finite number >= 0.`);
    }
  }
  if (fub !== undefined && (!Number.isFinite(fub) || fub <= 0 || fub > 1)) {
    return invalidEccResult("fub must be a finite number in (0, 1].");
  }
  if (hepaticBloodFlow !== undefined && (!Number.isFinite(hepaticBloodFlow) || hepaticBloodFlow <= 0)) {
    return invalidEccResult("hepaticBloodFlow must be a finite number > 0.");
  }

  const psInf0 = psInfluxActive + psPassiveDiff;
  const psEff = psEffluxActive + psPassiveDiff;
  const clElim0 = clMetabolic + clBiliary;

  if (psInf0 <= 0 || clElim0 <= 0) {
    return invalidEccResult("Total sinusoidal influx and intracellular elimination must both be > 0.");
  }

  const denom0 = psEff + clElim0;
  const baselineBeta = denom0 > 0 ? clElim0 / denom0 : 0;
  const baselineClIntAll = psInf0 * baselineBeta;

  const psInf1 = psInfluxActive * uptakeActivityFactor + psPassiveDiff;
  const clElim1 = clMetabolic * metabolismActivityFactor + clBiliary * biliaryActivityFactor;
  const denom1 = psEff + clElim1;
  const modulatedBeta = denom1 > 0 ? clElim1 / denom1 : 0;
  const modulatedClIntAll = psInf1 * modulatedBeta;

  const rateLimitingRegime: ExtendedClearanceResult["rateLimitingRegime"] =
    baselineBeta >= 0.7
      ? "uptake-rate-limited"
      : baselineBeta <= 0.3
        ? "metabolism-biliary-limited"
        : "mixed-uptake-elimination";

  let baselineHepaticExtraction: number | null = null;
  let modulatedHepaticExtraction: number | null = null;
  let systemicExposureRatio: number;

  if (fub !== undefined && hepaticBloodFlow !== undefined) {
    const clH0 = (hepaticBloodFlow * fub * baselineClIntAll) / (hepaticBloodFlow + fub * baselineClIntAll);
    const clH1 = (hepaticBloodFlow * fub * modulatedClIntAll) / (hepaticBloodFlow + fub * modulatedClIntAll);
    baselineHepaticExtraction = clH0 / hepaticBloodFlow;
    modulatedHepaticExtraction = clH1 / hepaticBloodFlow;
    systemicExposureRatio = clH1 > 0 ? clH0 / clH1 : Number.POSITIVE_INFINITY;
  } else {
    systemicExposureRatio = modulatedClIntAll > 0 ? baselineClIntAll / modulatedClIntAll : Number.POSITIVE_INFINITY;
  }

  const kpuu0 = denom0 > 0 ? psInf0 / denom0 : 1;
  const kpuu1 = denom1 > 0 ? psInf1 / denom1 : kpuu0;
  const intrahepaticKpuuRatio = kpuu0 > 0 ? kpuu1 / kpuu0 : 1;
  const intrahepaticAucRatio =
    Number.isFinite(systemicExposureRatio) ? systemicExposureRatio * intrahepaticKpuuRatio : Number.POSITIVE_INFINITY;

  return {
    valid: true,
    baselineClIntAll,
    modulatedClIntAll,
    baselineBeta,
    modulatedBeta,
    rateLimitingRegime,
    systemicExposureRatio,
    intrahepaticKpuuRatio,
    intrahepaticAucRatio,
    baselineHepaticExtraction,
    modulatedHepaticExtraction,
    formulaNote:
      `Regime: ${rateLimitingRegime} (beta0 = ${baselineBeta.toFixed(2)}, beta1 = ${modulatedBeta.toFixed(2)}). ` +
      `Systemic exposure ratio = ${Number.isFinite(systemicExposureRatio) ? `${systemicExposureRatio.toFixed(2)}x` : "unbounded"}; ` +
      `intrahepatic Kp,uu ratio = ${intrahepaticKpuuRatio.toFixed(2)}x.`,
  };
}

/** Input parameters for presystemic enterocyte P-gp (ABCB1) + CYP3A4 interplay. */
export interface GutInterplayInput {
  /** Baseline intestinal fraction absorbed Fa in (0, 1] under normal P-gp efflux. */
  baselineFa: number;
  /** Baseline gut-wall fraction escaping enterocyte CYP3A4 metabolism Fg in (0, 1]. */
  baselineFg: number;
  /** P-gp activity multiplier (>= 0; < 1 for inhibition e.g. Paxlovid/verapamil; > 1 for induction e.g. rifampin). */
  pgpActivityFactor: number;
  /** Enterocyte CYP3A4 activity multiplier (>= 0; < 1 for TDI/inhibition; > 1 for PXR induction). */
  cyp3a4ActivityFactor: number;
  /** Dimensionless P-gp recycling coupling coefficient amplifying CYP3A4 exposure (>= 0; default 0.5). */
  recyclingCoupling?: number;
}

/** Quantitative result of presystemic gut P-gp + CYP3A4 efflux-metabolism interplay. */
export interface GutInterplayResult {
  valid: boolean;
  reason?: string;
  baselineFa: number;
  baselineFg: number;
  baselineFaFg: number;
  modulatedFa: number;
  modulatedFg: number;
  modulatedFaFg: number;
  presystemicBioavailabilityFold: number;
  isolatedPgpFold: number;
  isolatedCyp3a4Fold: number;
  synergyRatio: number;
  formulaNote: string;
}

function invalidGutResult(reason: string): GutInterplayResult {
  return {
    valid: false,
    reason,
    baselineFa: 1,
    baselineFg: 1,
    baselineFaFg: 1,
    modulatedFa: 1,
    modulatedFg: 1,
    modulatedFaFg: 1,
    presystemicBioavailabilityFold: 1,
    isolatedPgpFold: 1,
    isolatedCyp3a4Fold: 1,
    synergyRatio: 1,
    formulaNote: "Invalid enterocyte P-gp / CYP3A4 interplay inputs.",
  };
}

/**
 * Models presystemic enterocyte ABCB1 (P-gp) + CYP3A4 efflux-metabolism synergy (Cummins & Benet,
 * PMID: 11861813). Apical P-gp recycling extends intracellular residence and repeated CYP3A4 access;
 * dual blockade (e.g. Paxlovid + tacrolimus/rivaroxaban) drives multiplicative (super-additive)
 * Fa * Fg bioavailability surges, whereas dual PXR induction (rifampin) collapses oral absorption.
 */
export function calculateGutPgpCyp3aSynergy(input: GutInterplayInput): GutInterplayResult {
  const {
    baselineFa,
    baselineFg,
    pgpActivityFactor,
    cyp3a4ActivityFactor,
    recyclingCoupling = 0.5,
  } = input;

  if (!Number.isFinite(baselineFa) || baselineFa <= 0 || baselineFa > 1) {
    return invalidGutResult("baselineFa must be a finite number in (0, 1].");
  }
  if (!Number.isFinite(baselineFg) || baselineFg <= 0 || baselineFg > 1) {
    return invalidGutResult("baselineFg must be a finite number in (0, 1].");
  }
  if (!Number.isFinite(pgpActivityFactor) || pgpActivityFactor < 0) {
    return invalidGutResult("pgpActivityFactor must be a finite number >= 0.");
  }
  if (!Number.isFinite(cyp3a4ActivityFactor) || cyp3a4ActivityFactor < 0) {
    return invalidGutResult("cyp3a4ActivityFactor must be a finite number >= 0.");
  }
  if (!Number.isFinite(recyclingCoupling) || recyclingCoupling < 0) {
    return invalidGutResult("recyclingCoupling must be a finite number >= 0.");
  }

  const rEff0 = 1 / baselineFa - 1;
  const mGut0 = 1 / baselineFg - 1;

  const evalState = (fPgp: number, f3a4: number): { fa: number; fg: number; fafg: number } => {
    const eff = rEff0 * fPgp;
    const fa = 1 / (1 + eff);
    const recycleNorm = (1 + recyclingCoupling * eff) / (1 + recyclingCoupling * rEff0);
    const fg = 1 / (1 + mGut0 * f3a4 * recycleNorm);
    return { fa, fg, fafg: fa * fg };
  };

  const baselineFaFg = baselineFa * baselineFg;
  const combined = evalState(pgpActivityFactor, cyp3a4ActivityFactor);
  const pgpOnly = evalState(pgpActivityFactor, 1);
  const cypOnly = evalState(1, cyp3a4ActivityFactor);

  const presystemicBioavailabilityFold = combined.fafg / baselineFaFg;
  const isolatedPgpFold = pgpOnly.fafg / baselineFaFg;
  const isolatedCyp3a4Fold = cypOnly.fafg / baselineFaFg;
  const additiveExpected = 1 + (isolatedPgpFold - 1) + (isolatedCyp3a4Fold - 1);
  const synergyRatio = additiveExpected > 0 ? presystemicBioavailabilityFold / additiveExpected : 1;

  return {
    valid: true,
    baselineFa,
    baselineFg,
    baselineFaFg,
    modulatedFa: combined.fa,
    modulatedFg: combined.fg,
    modulatedFaFg: combined.fafg,
    presystemicBioavailabilityFold,
    isolatedPgpFold,
    isolatedCyp3a4Fold,
    synergyRatio,
    formulaNote:
      `Fa*Fg shifts from ${baselineFaFg.toFixed(3)} to ${combined.fafg.toFixed(3)} ` +
      `(${presystemicBioavailabilityFold.toFixed(2)}x fold; isolated P-gp ${isolatedPgpFold.toFixed(2)}x, ` +
      `isolated CYP3A4 ${isolatedCyp3a4Fold.toFixed(2)}x).`,
  };
}

/** Validates that every drug ID referenced in transporters, collisions, and ECCS profiles exists in `DRUG_BY_ID`. */
export function validateTransporterCatalogIntegrity(): {
  valid: boolean;
  missingDrugIds: string[];
  totalUniqueDrugIds: number;
} {
  const allIds = Array.from(
    new Set([
      ...TRANSPORTERS.flatMap((t) => [
        ...t.substrates,
        ...t.inhibitors,
        ...t.inducers,
        ...t.clinicalCollisions.flatMap((c) => c.drugPair),
      ]),
      ...ECCS_CLASS_PROFILES.flatMap((e) => e.exemplarDrugIds),
    ]),
  );
  const missingDrugIds = allIds.filter((id) => !DRUG_BY_ID[id]);
  return {
    valid: missingDrugIds.length === 0,
    missingDrugIds,
    totalUniqueDrugIds: allIds.length,
  };
}
