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
      "fentanyl",
      "apixaban",
    ],
    inhibitors: [
      "verapamil",
      "quinidine",
      "amiodarone",
      "clarithromycin",
      "itraconazole",
      "ritonavir",
    ],
    inducers: [
      "rifampin",
      "st-johns-wort",
      "carbamazepine",
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
    ],
    inhibitors: [
      "gefitinib",
      "lapatinib",
      "cyclosporine",
      "regorafenib",
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
      "bosentan",
      "valsartan",
    ],
    inhibitors: [
      "cyclosporine",
      "gemfibrozil",
      "clarithromycin",
      "rifampin",
    ],
    inducers: [],
    probeOrInvestigationalInhibitors: [],
    clinicalCollisions: [
      {
        id: "atorvastatin-cyclosporine",
        title: "Cyclosporine Shutoff of Hepatic Sinusoidal OATP1B1 Statin Uptake",
        drugPair: ["cyclosporine", "atorvastatin"],
        description:
          "Cyclosporine potently inhibits sinusoidal OATP1B1 and OATP1B3 influx, arresting hepatic first-pass uptake and triggering an 8- to 10-fold increase in systemic circulating atorvastatin exposure.",
        hazard:
          "Massive systemic statin exposure, fulminant rhabdomyolysis, myoglobinuria, and acute tubular necrosis.",
        severity: "critical",
        mechanismDetail:
          "Potent non-competitive inhibition of SLCO1B1/3 sinusoidal carriers blocks entry into the metabolic compartment, causing statin molecules to spill over into the systemic circulation and peripheral muscle tissue.",
        literatureCitation:
          "Niemi M, et al. Organic anion transporting polypeptide 1B1: a genetically polymorphic transporter of major importance for hepatic drug disposition. Pharmacol Rev. 2011;63(1):157-181.",
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
          "Cyclosporine inhibits both sinusoidal OATP1B1 uptake and canalicular BCRP efflux, increasing rosuvastatin steady-state AUC up to 7.1-fold.",
        hazard:
          "Severe statin-associated musculoskeletal toxicity and hepatocellular injury.",
        severity: "critical",
        mechanismDetail:
          "Blockade of OATP1B1 sinusoidal influx traps rosuvastatin in circulating plasma, compounded by inhibition of canalicular ABCG2 biliary excretion.",
        literatureCitation:
          "Simonson SG, et al. Rosuvastatin pharmacokinetics in healthy subjects coadministered cyclosporine. Clin Pharmacol Ther. 2004;76(2):167-177.",
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
        title: "Cimetidine Competitive Inhibition of Renal OCT2/MATE Metformin Clearance",
        drugPair: ["cimetidine", "metformin"],
        description:
          "Cimetidine competitively inhibits basolateral OCT2 uptake and apical MATE1 secretion in renal proximal tubules, reducing metformin renal clearance by 27% to 35% and escalating circulating plasma concentrations.",
        hazard:
          "Severe metformin accumulation, elevated risk of metformin-associated lactic acidosis (MALA), and severe GI distress.",
        severity: "critical",
        mechanismDetail:
          "Cimetidine potently inhibits both basolateral OCT2 and apical MATE1/2-K transporters, blocking the transcellular flux of cationic metformin into urine.",
        literatureCitation:
          "Somogyi A, et al. Reduction of metformin renal tubular secretion by cimetidine in normal subjects. Br J Clin Pharmacol. 1987;23(5):545-551.",
      },
      {
        id: "dolutegravir-metformin",
        title: "Dolutegravir Inhibition of Renal Tubular Metformin Secretion",
        drugPair: ["dolutegravir", "metformin"],
        description:
          "Dolutegravir selectively inhibits basolateral renal OCT2 and apical MATE1, producing an approximately 79% increase in metformin AUC and 66% rise in Cmax without impairing glomerular filtration rate (GFR).",
        hazard:
          "Substantial increase in metformin exposure, hypoglycemia, and potential lactic acidosis risk.",
        severity: "high",
        mechanismDetail:
          "Dolutegravir is a potent inhibitor of OCT2 (IC50 ~1.9 uM) and MATE1, slowing active tubular secretion of unchanged metformin into urine.",
        literatureCitation:
          "Song IH, et al. Effect of dolutegravir on the pharmacokinetics of metformin in healthy subjects. J Acquir Immune Defic Syndr. 2016;72(4):400-407.",
      },
      {
        id: "ranolazine-metformin",
        title: "Ranolazine Inhibition of Renal OCT2 Metformin Transport",
        drugPair: ["ranolazine", "metformin"],
        description:
          "Ranolazine inhibits OCT2 in proximal tubular cells, resulting in a dose-dependent increase in metformin exposure (up to 1.8-fold at 1000 mg BID).",
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
      "Acts as the first biological checkpoint of oral bioavailability. Apical efflux pumps (P-gp, BCRP) actively eject absorbed molecules back into the gut lumen, working in tandem with enterocyte CYP3A4 to reduce net absorption fraction.",
    transporterNodes: [
      {
        transporterId: "pgp-abcb1",
        gene: "ABCB1",
        name: "P-glycoprotein (P-gp)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Enterocyte Cytoplasm -> Gut Lumen",
        arrowDirection: "up",
        mechanismNote: "Extrudes dabigatran, colchicine, digoxin back into gut lumen, restricting oral bioavailability.",
      },
      {
        transporterId: "bcrp-abcg2",
        gene: "ABCG2",
        name: "BCRP (ABCG2)",
        membrane: "apical",
        direction: "efflux",
        vectorLabel: "Enterocyte Cytoplasm -> Gut Lumen",
        arrowDirection: "up",
        mechanismNote: "Ejects rosuvastatin and sulfasalazine back into intestinal lumen, modulating systemic absorption.",
      },
    ],
    clinicalTakeaway:
      "Inhibition of intestinal P-gp or BCRP by drugs like verapamil, clarithromycin, or lapatinib increases oral bioavailability (AUC) up to several fold, triggering unexpected systemic overexposure.",
    citations: [
      "Fromm MF. Int J Clin Pharmacol Ther. 2000;38(2):69-74.",
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
      "A coordinated two-step clearance machinery: basolateral OATP1B1 and OATP1B3 solute carriers mediate active sinusoidal uptake of drugs from portal blood into hepatocytes, while apical ABC pumps (P-gp, BCRP) actively secrete metabolites into bile canaliculi.",
    transporterNodes: [
      {
        transporterId: "oatp1b1-1b3-slco",
        gene: "SLCO1B1 & SLCO1B3",
        name: "OATP1B1 & OATP1B3",
        membrane: "sinusoidal",
        direction: "influx",
        vectorLabel: "Sinusoidal Blood -> Hepatocyte Cytoplasm",
        arrowDirection: "down",
        mechanismNote: "Active sinusoidal uptake of statins (atorvastatin, rosuvastatin), bosentan, and valsartan.",
      },
      {
        transporterId: "pgp-abcb1",
        gene: "ABCB1",
        name: "P-gp (Canalicular)",
        membrane: "canalicular",
        direction: "efflux",
        vectorLabel: "Hepatocyte Cytoplasm -> Bile Canaliculus",
        arrowDirection: "up",
        mechanismNote: "Active biliary secretion of digoxin, paclitaxel, colchicine into bile.",
      },
      {
        transporterId: "bcrp-abcg2",
        gene: "ABCG2",
        name: "BCRP (Canalicular)",
        membrane: "canalicular",
        direction: "efflux",
        vectorLabel: "Hepatocyte Cytoplasm -> Bile Canaliculus",
        arrowDirection: "up",
        mechanismNote: "Active biliary excretion of rosuvastatin, methotrexate, and sulfate conjugates.",
      },
    ],
    clinicalTakeaway:
      "Cyclosporine or gemfibrozil potently inhibits OATP1B1, blocking hepatic sinusoidal uptake of statins and causing a 5-to-10 fold spike in systemic circulating statin concentrations, triggering severe rhabdomyolysis and acute kidney injury.",
    citations: [
      "Niemi M, et al. Pharmacol Rev. 2011;63(1):157-181.",
      "Shitara Y, et al. J Pharmacol Exp Ther. 2004;311(1):228-236.",
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
