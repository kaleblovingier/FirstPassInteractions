/**
 * Clinical pharmacology glossary for /glossary: the jargon on FirstPass cards,
 * in plain words first and the precise term second. Every definition was checked
 * against the source cited on its entry. Educational reference only, no doses.
 */
import { GLOSSARY_DESCRIPTION, GLOSSARY_TITLE, GLOSSARY_URL } from "./glossary-meta";

export interface GlossarySource {
  title: string;
  url: string;
}

export interface GlossaryTerm {
  /** Kebab-case slug, also the heading anchor: /glossary#<id>. */
  id: string;
  term: string;
  aka: string[];
  /** Plain-language definition, at most GLOSSARY_MAX_SENTENCES sentences. */
  definition: string;
  /** One sentence tying the term to a desk feature. */
  onDesk: string;
  /** Ids of other glossary terms. */
  related: string[];
  /** Internal pages only. */
  links?: { label: string; href: string }[];
  source: GlossarySource;
}

export const GLOSSARY_MAX_SENTENCES = 2;
export const GLOSSARY_MAX_CHARS = 340;

export { GLOSSARY_DESCRIPTION, GLOSSARY_TITLE, GLOSSARY_URL };
export const GLOSSARY_H1 = "Clinical pharmacology glossary";
export const GLOSSARY_INTRO =
  "The words on FirstPass cards, in plain language first and the precise term second, for clinicians, medical, PharmD, nursing, NP and PA learners and other health-professions students. Each entry says where the term shows up on the desk and which source it was checked against.";

const M12: GlossarySource = {
  title: "ICH M12 Drug Interaction Studies, FDA guidance for industry (August 2024)",
  url: "https://www.fda.gov/media/161199/download",
};
const CFR_LABEL: GlossarySource = {
  title: "21 CFR 201.57, content and format of prescription drug labeling",
  url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-201/subpart-B/section-201.57",
};
const CFR_DEFINITIONS: GlossarySource = {
  title: "21 CFR 314.3, definitions (bioavailability)",
  url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-314/subpart-A/section-314.3",
};
const E14: GlossarySource = {
  title: "ICH E14, clinical evaluation of QT/QTc interval prolongation and proarrhythmic potential (2005)",
  url: "https://database.ich.org/sites/default/files/E14_Guideline.pdf",
};
const S7B: GlossarySource = {
  title: "ICH S7B, non-clinical evaluation of delayed ventricular repolarization (2005)",
  url: "https://database.ich.org/sites/default/files/S7B_Guideline.pdf",
};
const CPIC_TERMS: GlossarySource = {
  title: "Caudle KE et al. Standardizing terms for clinical pharmacogenetic test results (CPIC). Genet Med 2017;19:215-223. PMID 27441996",
  url: "https://pubmed.ncbi.nlm.nih.gov/27441996/",
};
const CPIC_CYP2D6: GlossarySource = {
  title: "Caudle KE et al. Standardizing CYP2D6 genotype to phenotype translation (CPIC and DPWG). Clin Transl Sci 2020;13:116-124. PMID 31647186",
  url: "https://pubmed.ncbi.nlm.nih.gov/31647186/",
};
const CPIC_PROCESS: GlossarySource = {
  title: "Caudle KE et al. The CPIC guideline development process. Curr Drug Metab 2014;15:209-217. PMID 24479687",
  url: "https://pubmed.ncbi.nlm.nih.gov/24479687/",
};
const KALGUTKAR: GlossarySource = {
  title: "Kalgutkar AS et al. Mechanism-based inactivation of cytochrome P450 enzymes. Curr Drug Metab 2007;8:407-447. PMID 17584015",
  url: "https://pubmed.ncbi.nlm.nih.gov/17584015/",
};
const NIU: GlossarySource = {
  title: "Niu J et al. Pharmacodynamic drug-drug interactions. Clin Pharmacol Ther 2019;105:1395-1406. PMID 30912119",
  url: "https://pubmed.ncbi.nlm.nih.gov/30912119/",
};
const STEADY_STATE: GlossarySource = {
  title: "Wadhwa RR, Cascella M. Steady state concentration. StatPearls, NCBI Bookshelf (updated 2023)",
  url: "https://www.ncbi.nlm.nih.gov/books/NBK553132/",
};
const BEERS: GlossarySource = {
  title: "American Geriatrics Society 2023 updated AGS Beers Criteria. J Am Geriatr Soc 2023;71:2052-2081. PMID 37139824",
  url: "https://pubmed.ncbi.nlm.nih.gov/37139824/",
};

const TERMS: GlossaryTerm[] = [
  {
    id: "accumulation",
    term: "Accumulation",
    aka: ["build-up", "accumulation ratio", "Rac"],
    definition:
      "Build-up of a drug in the body when each new dose arrives before the earlier ones have cleared. It usually shows when doses are spaced less than four half-lives apart, and the accumulation ratio puts a number on it.",
    onDesk: "Pick a dosing interval in the desk's level sketch and its Build-up (Rac) tile shows the accumulation ratio for that tray.",
    related: ["half-life", "steady-state", "clearance"],
    source: STEADY_STATE,
  },
  {
    id: "active-metabolite",
    term: "Active metabolite",
    aka: ["pharmacologically active metabolite"],
    definition:
      "A breakdown product of a drug that still acts on the drug's target, so it can add to, or carry, the effect. Judging its share takes its potency, protein binding and exposure compared with the parent drug.",
    onDesk: "When a tray drug has a mapped active product, the level sketch adds a tile for it beside the parent drug.",
    related: ["prodrug", "fraction-metabolized", "ultrarapid-metabolizer"],
    source: {
      title: "Obach RS. Pharmacologically active drug metabolites. Pharmacol Rev 2013;65:578-640. PMID 23406671",
      url: "https://pubmed.ncbi.nlm.nih.gov/23406671/",
    },
  },
  {
    id: "activity-score",
    term: "Activity score (AS)",
    aka: ["AS", "CYP2D6 activity score"],
    definition:
      "A CYP2D6 number made by adding up a value for each allele, from 0 for no function to 1 for normal function, multiplied by its copy number. CPIC and DPWG read the total as a phenotype: 0 is PM, above 0 and below 1.25 is IM, 1.25 to 2.25 is NM, and above 2.25 is UM.",
    onDesk: "The Library's Pharmacogenomics & CPIC tab shows these activity-score ranges beside each CYP2D6 phenotype.",
    related: ["allele", "diplotype", "poor-metabolizer", "ultrarapid-metabolizer"],
    links: [{ label: "CYP2D6 page", href: "/enzyme/cyp2d6" }],
    source: CPIC_CYP2D6,
  },
  {
    id: "additive-effect",
    term: "Additive effect",
    aka: ["additive PD effect", "synergy", "antagonism", "stacking"],
    definition:
      "When two drugs act on the same effect and the combined result equals the sum of each drug's effect alone. Synergy is more than that sum, and antagonism is less.",
    onDesk: "The Library's Mechanism Intersect Engine adds up shared receptor and pathway load across the whole tray.",
    related: ["pharmacodynamic-interaction", "serotonin-toxicity", "anticholinergic-burden", "qtc"],
    source: NIU,
  },
  {
    id: "allele",
    term: "Allele",
    aka: ["star allele", "allele function", "no function allele", "decreased function allele"],
    definition:
      "One version of a gene, written with a star name such as CYP2C19*2. CPIC labels each allele by function: increased, normal, decreased or no function, or unknown or uncertain when evidence is missing or conflicting.",
    onDesk: "The Library's Pharmacogenomics & CPIC tab lists key alleles for each gene with their function and activity values.",
    related: ["diplotype", "activity-score", "normal-metabolizer"],
    source: CPIC_TERMS,
  },
  {
    id: "anticholinergic-burden",
    term: "Anticholinergic burden",
    aka: ["ACB", "anticholinergic load", "cumulative anticholinergic burden"],
    definition:
      "The combined effect of taking several medicines that block acetylcholine. The 2023 Beers Criteria name this cumulative burden as a risk and flag taking multiple anticholinergic drugs together as a clinically important interaction in older adults.",
    onDesk: "The ACB tab on the clinical board totals each tray medicine's Anticholinergic Cognitive Burden score.",
    related: ["beers-criteria", "additive-effect", "pharmacodynamic-interaction"],
    source: BEERS,
  },
  {
    id: "auc",
    term: "AUC (area under the curve)",
    aka: ["area under the curve", "exposure", "total exposure"],
    definition:
      "Total drug exposure over time, measured as the area under the drug's concentration-versus-time curve (AUC). Interaction studies compare AUC with and without the interacting drug.",
    onDesk: "The desk's level sketch reports exposure as an AUC ratio for the drug you pick.",
    related: ["auc-ratio", "cmax", "inhibitor", "inducer"],
    source: M12,
  },
  {
    id: "auc-ratio",
    term: "AUC ratio (AUCR)",
    aka: ["AUCR", "fold-change", "exposure ratio"],
    definition:
      "A drug's AUC with an interacting drug divided by its AUC without it, so a ratio of 2 means exposure doubled. FDA's strong, moderate and weak grades are cut from this ratio.",
    onDesk: "The level sketch prints it as Exposure (AUCR), a teaching estimate rather than a measured level.",
    related: ["auc", "inhibitor", "inducer", "sensitive-index-substrate"],
    source: M12,
  },
  {
    id: "bcrp",
    term: "BCRP (breast cancer resistance protein)",
    aka: ["ABCG2", "breast cancer resistance protein"],
    definition:
      "A drug pump (efflux transporter) in the gut wall and liver that pushes drugs back out of cells. Like P-gp, it can change how much of a swallowed drug is absorbed and how much reaches the brain.",
    onDesk: "The Library's Transporter Network tab has a BCRP section with worked collisions.",
    related: ["p-glycoprotein", "bioavailability", "oatp1b1-oatp1b3"],
    source: M12,
  },
  {
    id: "beers-criteria",
    term: "Beers Criteria (AGS)",
    aka: ["AGS Beers Criteria", "Beers list", "potentially inappropriate medication", "PIM"],
    definition:
      "The American Geriatrics Society's list of potentially inappropriate medications that adults 65 and older are usually best to avoid, in general or with certain diseases or conditions. It applies in every care setting except hospice and end-of-life care, and it supports rather than replaces shared decision-making.",
    onDesk: "Flip older adult on the person panel and the Clinic notes card flags Beers 2023 cautions for tray medicines.",
    related: ["anticholinergic-burden", "contraindication"],
    source: BEERS,
  },
  {
    id: "bioavailability",
    term: "Bioavailability (F)",
    aka: ["F", "oral bioavailability"],
    definition:
      "How fast and how much of a drug's active ingredient is absorbed from a product and becomes available at the site where it acts (the rate and extent of absorption).",
    onDesk: "Gut vs vein on the desk shows why a swallowed dose meets gut and liver enzymes that an IV dose mostly skips.",
    related: ["first-pass-effect", "p-glycoprotein", "auc"],
    source: CFR_DEFINITIONS,
  },
  {
    id: "boxed-warning",
    term: "Boxed warning",
    aka: ["black box warning", "BBW"],
    definition:
      "A warning FDA can require in a box at the start of a drug's label for certain contraindications or serious risks, especially ones that can lead to death or serious injury. It briefly explains the risk and points to the label section with the details.",
    onDesk: "The Clinic notes card on the desk quotes boxed label language for tray medicines that carry it.",
    related: ["contraindication", "warnings-and-precautions", "prescribing-information"],
    source: CFR_LABEL,
  },
  {
    id: "clearance",
    term: "Clearance (CL)",
    aka: ["CL", "drug clearance", "slows clearance", "speeds clearance"],
    definition:
      "How efficiently the body removes a drug: the volume of plasma cleared of the drug per unit of time. Together with volume of distribution, it sets the half-life.",
    onDesk: "On Learn, Slows clearance marks an inhibitor and Speeds clearance marks an inducer.",
    related: ["half-life", "volume-of-distribution", "inhibitor", "inducer"],
    source: STEADY_STATE,
  },
  {
    id: "cmax",
    term: "Cmax (peak concentration)",
    aka: ["peak concentration", "peak level"],
    definition: "The highest concentration a drug reaches in the blood after a dose (maximum concentration, Cmax).",
    onDesk: "The level sketch shows a Cmax fold-change beside the AUC ratio for the drug you pick.",
    related: ["auc", "half-life", "bioavailability"],
    source: M12,
  },
  {
    id: "contraindication",
    term: "Contraindication",
    aka: ["contraindicated", "label section 4"],
    definition:
      "A situation in which a drug should not be used because the risk clearly outweighs any possible benefit, such as a dangerous combination or condition. FDA labels list only known hazards here, in section 4, and say None if there are none.",
    onDesk: "Most pair-page quotes on this site come from a label's section 4, and the desk keeps its Avoid together tier for a named label pin.",
    related: ["warnings-and-precautions", "boxed-warning", "prescribing-information"],
    links: [{ label: "Label-sourced drug pairs", href: "/pairs" }],
    source: CFR_LABEL,
  },
  {
    id: "cpic-guideline",
    term: "CPIC guideline",
    aka: ["CPIC", "Clinical Pharmacogenetics Implementation Consortium"],
    definition:
      "A guideline from the Clinical Pharmacogenetics Implementation Consortium (CPIC) on how genetic test results a patient already has can be used to optimize drug therapy. Each one grades its evidence and gives each prescribing recommendation a strength.",
    onDesk: "The Library's Pharmacogenomics & CPIC tab paraphrases CPIC actions; open the guideline itself for its tables.",
    related: ["diplotype", "activity-score", "allele"],
    source: CPIC_PROCESS,
  },
  {
    id: "cytochrome-p450",
    term: "Cytochrome P450 (CYP)",
    aka: ["CYP", "CYP450", "P450", "isoform", "CYP3A4", "CYP2D6"],
    definition:
      "A family of enzymes that chemically change (metabolize) medicines and other foreign substances. About a dozen of them, in the CYP1, CYP2 and CYP3 families, handle most drugs in clinical use.",
    onDesk: "The Enzyme map and the enzyme pages show which desk medicines are substrates, inhibitors or inducers of each CYP.",
    related: ["substrate", "inhibitor", "inducer", "p-glycoprotein"],
    links: [
      { label: "All enzyme pages", href: "/enzymes" },
      { label: "CYP3A4 page", href: "/enzyme/cyp3a4" },
    ],
    source: {
      title: "Zanger UM, Schwab M. Cytochrome P450 enzymes in drug metabolism. Pharmacol Ther 2013;138:103-141. PMID 23333322",
      url: "https://pubmed.ncbi.nlm.nih.gov/23333322/",
    },
  },
  {
    id: "diplotype",
    term: "Diplotype",
    aka: ["genotype", "star allele pair"],
    definition:
      "The pair of alleles a person carries for one gene, written like CYP2D6*1/*10. Guidelines translate it into a predicted metabolizer phenotype, and the word genotype is often used for the same thing.",
    onDesk: "The desk's phenotype switches skip the diplotype and set the predicted phenotype directly.",
    related: ["allele", "activity-score", "phenoconversion"],
    source: CPIC_CYP2D6,
  },
  {
    id: "drug-interactions-section",
    term: "Drug Interactions (label section 7)",
    aka: ["section 7", "Drug Interactions section"],
    definition:
      "The label section on clinically significant interactions with other drugs, drug classes or foods, with practical steps to prevent or manage them. It briefly gives the mechanism when known and expands on interactions named under Contraindications or Warnings and Precautions.",
    onDesk: "Pair pages name the label section behind each quote, and some quotes come from section 7.",
    related: ["contraindication", "warnings-and-precautions", "prescribing-information"],
    links: [{ label: "Label-sourced drug pairs", href: "/pairs" }],
    source: CFR_LABEL,
  },
  {
    id: "enterohepatic-recirculation",
    term: "Enterohepatic recirculation",
    aka: ["enterohepatic circulation", "enterohepatic recycling", "EHC"],
    definition:
      "A loop in which a drug is excreted into bile and then reabsorbed from the gut back into the blood, sometimes after gut bacteria undo a conjugate the liver made. It can cause second peaks in drug levels and a longer apparent half-life.",
    onDesk: "The Transplant tab on the clinical board simulates mycophenolate's enterohepatic loop.",
    related: ["half-life", "active-metabolite"],
    source: {
      title: "Roberts MS et al. Enterohepatic circulation: physiological, pharmacokinetic and clinical implications. Clin Pharmacokinet 2002;41:751-790. PMID 12162761",
      url: "https://pubmed.ncbi.nlm.nih.gov/12162761/",
    },
  },
  {
    id: "first-pass-effect",
    term: "First-pass effect",
    aka: ["first-pass metabolism", "first-pass elimination", "presystemic metabolism"],
    definition:
      "Loss of a drug to metabolism between where it is given and where blood is sampled, usually in the gut wall and liver when it is swallowed. It matters most when only a small, variable share of the dose escapes.",
    onDesk: "The Gut vs vein card traces the swallowed path through gut enzymes, portal vein and liver before the body.",
    related: ["bioavailability", "cytochrome-p450", "p-glycoprotein"],
    source: {
      title: "Pond SM, Tozer TN. First-pass elimination: basic concepts and clinical consequences. Clin Pharmacokinet 1984;9:1-25. PMID 6362950",
      url: "https://pubmed.ncbi.nlm.nih.gov/6362950/",
    },
  },
  {
    id: "fraction-metabolized",
    term: "Fraction metabolized (fm)",
    aka: ["fm", "fraction metabolised", "major pathway", "minor pathway"],
    definition:
      "The share of a drug's clearance that runs through one enzyme (fm). When one enzyme handles 25 percent or more of a drug's elimination, ICH M12 expects clinical interaction studies for it.",
    onDesk: "On Learn, Minor pathway means a smaller share of clearance, and enzyme pages sort substrates into major- and minor-pathway groups.",
    related: ["substrate", "sensitive-index-substrate", "clearance"],
    source: M12,
  },
  {
    id: "half-life",
    term: "Half-life (t½)",
    aka: ["t1/2", "elimination half-life"],
    definition:
      "The time it takes for the amount of a drug in the body to fall by half (elimination half-life). It depends on volume of distribution and clearance, and regular dosing reaches a steady level after about four to five half-lives.",
    onDesk: "The level sketch's Half-life tile shows the usual half-life and the one on this tray.",
    related: ["clearance", "volume-of-distribution", "steady-state", "accumulation"],
    source: {
      title: "Hallare J, Gerriets V. Elimination half-life of drugs. StatPearls, NCBI Bookshelf (updated 2025)",
      url: "https://www.ncbi.nlm.nih.gov/books/NBK554498/",
    },
  },
  {
    id: "herg",
    term: "hERG channel (IKr)",
    aka: ["hERG", "IKr", "KCNH2", "potassium channel block"],
    definition:
      "A heart potassium channel, encoded by the hERG gene, that carries the IKr current that helps the ventricles recover (repolarize) after each beat. Blocking it is the most common way medicines prolong the QT interval.",
    onDesk: "The QT tab on the clinical board lists the hERG/IKr blockers on the current tray.",
    related: ["qtc", "torsades-de-pointes"],
    source: S7B,
  },
  {
    id: "hunter-criteria",
    term: "Hunter criteria",
    aka: ["Hunter Serotonin Toxicity Criteria", "clonus"],
    definition:
      "Decision rules for spotting serotonin toxicity after a serotonergic drug, built on seven signs: clonus (spontaneous, inducible or ocular), agitation, sweating, tremor, brisk reflexes, high muscle tone and temperature above 38 °C. They are simpler and more accurate than the older Sternbach criteria.",
    onDesk: "The Hunter tab on the clinical board walks through these signs for a serotonergic tray, where clonus points away from NMS.",
    related: ["serotonin-toxicity", "neuroleptic-malignant-syndrome"],
    source: {
      title: "Dunkley EJ et al. The Hunter Serotonin Toxicity Criteria. QJM 2003;96:635-642. PMID 12925718",
      url: "https://pubmed.ncbi.nlm.nih.gov/12925718/",
    },
  },
  {
    id: "index-drug",
    term: "Index drug",
    aka: ["index substrate", "index inhibitor", "index inducer", "index precipitant", "FDA index"],
    definition:
      "A well-studied drug that regulators recommend for clinical interaction studies because its effect on one pathway, as a substrate or as an inhibitor or inducer, is predictable. Studies that pair index drugs aim to show the largest interaction to expect on that pathway.",
    onDesk: "The Enzyme map tags FDA index drugs, and the CYP tab lists the ones on this desk in its FDA index table.",
    related: ["sensitive-index-substrate", "inhibitor", "inducer"],
    source: M12,
  },
  {
    id: "inducer",
    term: "Inducer (strong, moderate, weak)",
    aka: ["enzyme inducer", "induction", "enzyme induction", "PXR", "CAR", "AhR", "speeds clearance", "strong inducer", "moderate inducer", "weak inducer"],
    definition:
      "A drug that makes cells build more of an enzyme or transporter, by switching on its gene through receptors such as PXR, CAR or AhR, so the drugs it handles reach lower blood levels. FDA grades it by how much it lowers a sensitive index substrate's AUC: strong is 80% or more, moderate is 50% to under 80%, and weak is 20% to under 50%.",
    onDesk: "Enzyme pages group inducers by these bins, and the person panel's smoking switch adds tobacco smoke as a CYP1A2 inducer.",
    related: ["inhibitor", "auc-ratio", "phenoconversion", "clearance"],
    links: [{ label: "CYP1A2 page", href: "/enzyme/cyp1a2" }],
    source: M12,
  },
  {
    id: "inhibitor",
    term: "Inhibitor (strong, moderate, weak)",
    aka: ["enzyme inhibitor", "blocker", "slows clearance", "strong inhibitor", "moderate inhibitor", "weak inhibitor"],
    definition:
      "A drug that blocks an enzyme or transporter, so the drugs it normally handles reach higher blood levels. FDA grades it by how much it raises a sensitive index substrate's AUC: strong is 5-fold or more, moderate is 2-fold to under 5-fold, and weak is 1.25-fold to under 2-fold.",
    onDesk: "On Learn, the Strong, moderate, weak row is this FDA grade, and enzyme pages group inhibitors the same way.",
    related: ["inducer", "reversible-inhibition", "time-dependent-inhibition", "auc-ratio"],
    links: [{ label: "All enzyme pages", href: "/enzymes" }],
    source: M12,
  },
  {
    id: "intermediate-metabolizer",
    term: "Intermediate metabolizer (IM)",
    aka: ["IM"],
    definition:
      "A person whose enzyme activity is decreased, between a normal and a poor metabolizer (IM). It comes from combinations of normal, decreased and no function alleles, such as CYP2C19*1/*2.",
    onDesk: "The person panel's IM setting sits between NM and PM for CYP2D6, CYP2C19, CYP2C9 and CYP2B6.",
    related: ["normal-metabolizer", "poor-metabolizer", "activity-score", "phenoconversion"],
    source: CPIC_TERMS,
  },
  {
    id: "mate",
    term: "MATE1 and MATE2-K",
    aka: ["MATE", "MATE1", "MATE2-K", "multidrug and toxin extrusion protein"],
    definition:
      "Kidney efflux transporters that push drugs out of tubule cells toward the urine during active renal secretion. Metformin and creatinine are substrates, and cimetidine, pyrimethamine and quinidine are inhibitors.",
    onDesk: "The Library's Transporter Network tab covers MATE with OCT2 in the kidney's cation secretion route.",
    related: ["oct2", "oat1-oat3"],
    source: M12,
  },
  {
    id: "moderately-sensitive-substrate",
    term: "Moderately sensitive substrate",
    aka: ["moderate sensitive substrate", "moderate-sensitive substrate"],
    definition:
      "A drug whose blood levels (AUC) rise at least 2-fold but less than 5-fold when given with a strong index inhibitor of its pathway in clinical studies.",
    onDesk: "The desk's own substrate bins are sensitive, major-pathway and minor-pathway, so it has no separate moderately sensitive bin.",
    related: ["sensitive-index-substrate", "substrate", "fraction-metabolized"],
    source: M12,
  },
  {
    id: "narrow-therapeutic-index",
    term: "Narrow therapeutic index (NTI)",
    aka: ["NTI", "narrow therapeutic range"],
    definition:
      "A drug for which small differences in dose or blood level can cause serious treatment failure or life-threatening or disabling side effects. FDA has proposed stricter bioequivalence testing for generic versions of these drugs.",
    onDesk: "The CYP clock gives NTI victims their own row, and enzyme pages mark NTI substrates.",
    related: ["therapeutic-drug-monitoring", "substrate", "sensitive-index-substrate"],
    source: {
      title: "Yu LX et al. Novel bioequivalence approach for narrow therapeutic index drugs. Clin Pharmacol Ther 2015;97:286-291. PMID 25669762",
      url: "https://pubmed.ncbi.nlm.nih.gov/25669762/",
    },
  },
  {
    id: "neuroleptic-malignant-syndrome",
    term: "Neuroleptic malignant syndrome (NMS)",
    aka: ["NMS"],
    definition:
      "A reaction to drugs that block dopamine, or to stopping drugs that boost it, marked by high body temperature, muscle rigidity, changed mental state, raised creatine kinase and unstable blood pressure and heart rate. An international expert consensus set these criteria, which also require other causes to be ruled out.",
    onDesk: "The Hunter tab sets NMS beside serotonin toxicity so you can compare the two.",
    related: ["serotonin-toxicity", "hunter-criteria"],
    source: {
      title: "Gurrera RJ et al. An international consensus study of neuroleptic malignant syndrome diagnostic criteria. J Clin Psychiatry 2011;72:1222-1228. PMID 21733489",
      url: "https://pubmed.ncbi.nlm.nih.gov/21733489/",
    },
  },
  {
    id: "normal-metabolizer",
    term: "Normal metabolizer (NM)",
    aka: ["NM", "extensive metabolizer", "EM"],
    definition:
      "A person with fully functional enzyme activity (NM), the term CPIC uses in place of extensive metabolizer. It comes from combinations of normal and decreased function alleles, such as CYP2C19*1/*1.",
    onDesk: "NM is the default on every phenotype switch in the person panel.",
    related: ["intermediate-metabolizer", "rapid-metabolizer", "phenoconversion"],
    source: CPIC_TERMS,
  },
  {
    id: "oat1-oat3",
    term: "OAT1 and OAT3",
    aka: ["OAT1", "OAT3", "organic anion transporter"],
    definition:
      "Kidney uptake transporters for organic anions that help move drugs from the blood into the urine (active renal secretion). Probenecid blocks both.",
    onDesk: "The Library's Transporter Network tab covers OAT1 and OAT3, including probenecid and methotrexate.",
    related: ["oct2", "mate", "clearance"],
    source: M12,
  },
  {
    id: "oatp1b1-oatp1b3",
    term: "OATP1B1 and OATP1B3",
    aka: ["OATP1B1", "OATP1B3", "OATP", "organic anion transporting polypeptide"],
    definition:
      "Liver uptake transporters that pull certain drugs, including several statins, from the blood into liver cells. Cyclosporine and single-dose rifampin are the inhibitors ICH M12 lists for studying them.",
    onDesk: "The Library's Transporter Network tab shows cyclosporine and gemfibrozil blocking OATP1B1 statin uptake.",
    related: ["bcrp", "p-glycoprotein", "inhibitor"],
    source: M12,
  },
  {
    id: "oct2",
    term: "OCT2",
    aka: ["organic cation transporter 2"],
    definition:
      "A kidney uptake transporter for organic cations that pulls drugs such as metformin from the blood into kidney cells for active renal secretion. It also carries creatinine, and drugs such as cimetidine block it.",
    onDesk: "The Library's Transporter Network tab pairs OCT2 with MATE in the kidney's cation secretion route.",
    related: ["mate", "oat1-oat3", "clearance"],
    source: M12,
  },
  {
    id: "p-glycoprotein",
    term: "P-glycoprotein (P-gp)",
    aka: ["P-gp", "MDR1", "ABCB1"],
    definition:
      "A drug pump (efflux transporter) in the gut wall, liver and kidney that pushes drugs back out of cells. It can limit how much of a swallowed drug is absorbed and how much reaches the brain.",
    onDesk: "P-gp has its own enzyme page, and the CYP tab flags drugs that block both CYP3A4 and P-gp.",
    related: ["bcrp", "bioavailability", "cytochrome-p450"],
    links: [{ label: "P-gp page", href: "/enzyme/p-gp" }],
    source: M12,
  },
  {
    id: "perpetrator",
    term: "Perpetrator (precipitant)",
    aka: ["precipitant", "perpetrator drug", "affecting drug", "interacting drug"],
    definition:
      "The drug that causes an interaction by inhibiting or inducing an enzyme or transporter. ICH M12 calls it the precipitant, and the drug it affects is the substrate.",
    onDesk: "The CYP tab builds its start and stop clocks around the perpetrator on the tray.",
    related: ["substrate", "inhibitor", "inducer"],
    source: M12,
  },
  {
    id: "pharmacodynamic-interaction",
    term: "Pharmacodynamic interaction (PD)",
    aka: ["PD interaction", "pharmacodynamic drug interaction", "same-system effects"],
    definition:
      "An interaction in which one drug changes the effect of another, rather than how the body absorbs, distributes or clears it. These are classed as synergistic, additive or antagonistic.",
    onDesk: "Filter the desk's findings to Same-system effects to see its pharmacodynamic collisions.",
    related: ["additive-effect", "pharmacokinetic-interaction", "serotonin-toxicity", "qtc"],
    source: NIU,
  },
  {
    id: "pharmacokinetic-interaction",
    term: "Pharmacokinetic interaction (PK)",
    aka: ["PK interaction", "pharmacokinetic drug interaction", "levels / timing"],
    definition:
      "An interaction in which one drug changes how the body absorbs, distributes, metabolizes or eliminates another (ADME), so its blood levels change.",
    onDesk: "Filter the desk's findings to Levels / timing to see its pharmacokinetic collisions.",
    related: ["pharmacodynamic-interaction", "inhibitor", "inducer", "auc-ratio"],
    source: NIU,
  },
  {
    id: "phenoconversion",
    term: "Phenoconversion",
    aka: ["genotype-phenotype mismatch"],
    definition:
      "A mismatch between the metabolizer status predicted from someone's genes and how their enzymes actually work, caused by non-genetic factors. Inhibiting drugs, older age, cancer and inflammation can shift a person toward a lower group, while inducers and smoking can shift them higher.",
    onDesk: "The Pheno tab and the Phenoconversion card on Learn show the same tray with the blocker off, then on.",
    related: ["poor-metabolizer", "inhibitor", "diplotype", "normal-metabolizer"],
    links: [{ label: "CYP2D6 page", href: "/enzyme/cyp2d6" }],
    source: {
      title: "Klomp SD et al. Phenoconversion of cytochrome P450 metabolism: a systematic review. J Clin Med 2020;9:2890. PMID 32906709",
      url: "https://pubmed.ncbi.nlm.nih.gov/32906709/",
    },
  },
  {
    id: "poor-metabolizer",
    term: "Poor metabolizer (PM)",
    aka: ["PM"],
    definition:
      "A person with little to no activity of a drug-metabolizing enzyme (PM), from a combination of no function and decreased function alleles, such as CYP2C19*2/*2.",
    onDesk: "On the person panel, a PM setting scores like a strong inhibitor of that enzyme.",
    related: ["intermediate-metabolizer", "phenoconversion", "activity-score", "prodrug"],
    source: CPIC_TERMS,
  },
  {
    id: "prescribing-information",
    term: "Prescribing Information (PI)",
    aka: ["PI", "label", "package insert", "full prescribing information"],
    definition:
      "The FDA-approved label for a prescription drug: a short Highlights summary, then the Full Prescribing Information in fixed, numbered sections. Those sections include the boxed warning, indications, dosage, contraindications, warnings and precautions, and drug interactions.",
    onDesk: "Every desk card ends the same way, the Prescribing Information governs, and pair pages quote it with a DailyMed link.",
    related: ["boxed-warning", "contraindication", "warnings-and-precautions", "drug-interactions-section"],
    links: [{ label: "Label-sourced drug pairs", href: "/pairs" }],
    source: CFR_LABEL,
  },
  {
    id: "prodrug",
    term: "Prodrug",
    aka: ["activation pathway", "bioactivation"],
    definition:
      "A medicine with little or no activity of its own that the body converts, through enzymes or chemistry, into the active drug.",
    onDesk: "The Prodrug row on Learn and the activation-pathway note on enzyme pages flag drugs where blocking the enzyme can mean less active product.",
    related: ["active-metabolite", "ultrarapid-metabolizer", "poor-metabolizer"],
    source: {
      title: "Rautio J et al. The expanding role of prodrugs in contemporary drug design and development. Nat Rev Drug Discov 2018;17:559-587. PMID 29700501",
      url: "https://pubmed.ncbi.nlm.nih.gov/29700501/",
    },
  },
  {
    id: "protein-binding",
    term: "Protein binding (fu)",
    aka: ["plasma protein binding", "fraction unbound", "fu", "free fraction", "unbound drug"],
    definition:
      "How much of a drug in the blood is attached to plasma proteins; the unattached share is the fraction unbound (fu). The unbound concentration is what drives a drug's effect and its toxicity.",
    onDesk: "With phenytoin on the tray, the Bedside card's Corrected phenytoin block uses Sheiner–Tozer and notes that a free level is better.",
    related: ["volume-of-distribution", "therapeutic-drug-monitoring", "narrow-therapeutic-index"],
    source: {
      title: "Roberts JA et al. The clinical relevance of plasma protein binding changes. Clin Pharmacokinet 2013;52:1-8. PMID 23150213",
      url: "https://pubmed.ncbi.nlm.nih.gov/23150213/",
    },
  },
  {
    id: "qtc",
    term: "QTc (corrected QT interval)",
    aka: ["QT interval", "QT prolongation", "corrected QT", "Bazett", "Fridericia"],
    definition:
      "The QT interval, from the start of the QRS complex to the end of the T wave on an ECG, adjusted for heart rate because QT shortens as heart rate rises. Bazett's and Fridericia's formulas are the most widely used corrections.",
    onDesk: "The Bedside card prints QTc by both Bazett and Fridericia from the QT and heart rate you enter.",
    related: ["torsades-de-pointes", "herg", "pharmacodynamic-interaction"],
    source: E14,
  },
  {
    id: "rapid-metabolizer",
    term: "Rapid metabolizer (RM)",
    aka: ["RM"],
    definition:
      "A person whose enzyme activity is above normal but below ultrarapid (RM), from a mix of normal and increased function alleles, such as CYP2C19*1/*17.",
    onDesk: "The person panel has no RM setting; its switches offer PM, IM, NM and UM.",
    related: ["ultrarapid-metabolizer", "normal-metabolizer", "allele"],
    source: CPIC_TERMS,
  },
  {
    id: "reversible-inhibition",
    term: "Reversible inhibition",
    aka: ["competitive inhibition", "non-competitive inhibition", "reversible occupancy"],
    definition:
      "Enzyme blocking by a drug that binds and lets go, competitively or non-competitively, without damaging the enzyme. Unlike mechanism-based inactivation, no new enzyme has to be made for activity to return.",
    onDesk: "The CYP tab labels these clocks reversible: start and stop track the inhibitor's own half-life.",
    related: ["time-dependent-inhibition", "inhibitor"],
    source: KALGUTKAR,
  },
  {
    id: "sensitive-index-substrate",
    term: "Sensitive index substrate",
    aka: ["sensitive substrate", "victim drug"],
    definition:
      "An index drug whose blood levels (AUC) rise 5-fold or more when given with a strong index inhibitor of its pathway in clinical studies.",
    onDesk: "When the CYP tab has no clock to show, its study steps name index pairs such as midazolam for CYP3A4.",
    related: ["moderately-sensitive-substrate", "index-drug", "inhibitor", "fraction-metabolized"],
    links: [{ label: "CYP3A4 page", href: "/enzyme/cyp3a4" }],
    source: M12,
  },
  {
    id: "serotonin-toxicity",
    term: "Serotonin toxicity (serotonin syndrome)",
    aka: ["serotonin syndrome", "serotonergic toxicity"],
    definition:
      "Too much serotonin activity in the central nervous system, causing neuromuscular excitation (clonus, brisk reflexes, rigidity), autonomic signs (fever, fast heart rate, sweating, tremor) and a changed mental state. Severe cases come from drug combinations acting at different sites, most often an MAOI plus a serotonin reuptake inhibitor.",
    onDesk: "The Hunter tab on the clinical board screens a serotonergic tray for these signs.",
    related: ["hunter-criteria", "neuroleptic-malignant-syndrome", "pharmacodynamic-interaction", "additive-effect"],
    source: {
      title: "Isbister GK et al. Serotonin toxicity: a practical approach to diagnosis and treatment. Med J Aust 2007;187:361-365. PMID 17874986",
      url: "https://pubmed.ncbi.nlm.nih.gov/17874986/",
    },
  },
  {
    id: "steady-state",
    term: "Steady state",
    aka: ["steady-state concentration", "Css", "plateau"],
    definition:
      "The point in repeated dosing where the amount of drug eliminated per unit of time equals the amount reaching the blood, so levels stop rising. A common rule of thumb puts it at about five half-lives, though some drugs are exceptions.",
    onDesk: "Pick a dosing interval in the level sketch to watch repeated doses build toward a plateau.",
    related: ["half-life", "accumulation", "therapeutic-drug-monitoring"],
    source: STEADY_STATE,
  },
  {
    id: "substrate",
    term: "Substrate (object, victim)",
    aka: ["object", "victim", "affected drug"],
    definition:
      "A drug that an enzyme or transporter acts on, by metabolizing it or moving it across a membrane. In an interaction it is the affected drug, which ICH M12 calls the object.",
    onDesk: "Enzyme pages list each enzyme's substrates by sensitivity, and the CYP clock calls them victims.",
    related: ["perpetrator", "sensitive-index-substrate", "fraction-metabolized"],
    links: [{ label: "All enzyme pages", href: "/enzymes" }],
    source: M12,
  },
  {
    id: "therapeutic-drug-monitoring",
    term: "Therapeutic drug monitoring (TDM)",
    aka: ["TDM", "drug levels"],
    definition:
      "Measuring a drug's blood concentration at set times to keep a steady concentration and tailor the regimen to the patient. It is used mainly for drugs with a narrow therapeutic range or large person-to-person differences in how they are handled.",
    onDesk: "The Levels tab on the clinical board shows teaching level windows for tray medicines that have one mapped.",
    related: ["narrow-therapeutic-index", "steady-state", "protein-binding"],
    source: {
      title: "Kang JS, Lee MH. Overview of therapeutic drug monitoring. Korean J Intern Med 2009;24:1-10. PMID 19270474",
      url: "https://pubmed.ncbi.nlm.nih.gov/19270474/",
    },
  },
  {
    id: "time-dependent-inhibition",
    term: "Time-dependent inhibition (TDI)",
    aka: ["TDI", "mechanism-based inhibition", "mechanism-based inactivation", "MBI", "irreversible inhibition"],
    definition:
      "Enzyme blocking in which the enzyme turns the drug into a reactive product that irreversibly disables it (mechanism-based inactivation). Activity comes back only as the body makes new enzyme, so the block can outlast the drug.",
    onDesk: "The CYP tab tags these drugs TDI, and the Library's CYP Induction & TDI tab models the slow recovery.",
    related: ["reversible-inhibition", "inhibitor", "phenoconversion"],
    source: KALGUTKAR,
  },
  {
    id: "torsades-de-pointes",
    term: "Torsades de pointes (TdP)",
    aka: ["TdP", "torsade de pointes", "polymorphic ventricular tachycardia"],
    definition:
      "A dangerous fast rhythm from the ventricles whose ECG looks like the QRS complexes twisting around the baseline (a polymorphic ventricular tachycardia). It is linked to a prolonged QT interval and can degenerate into ventricular fibrillation and sudden death.",
    onDesk: "The QT tab includes a torsades de pointes reference beside the tray's QT-prolonging medicines.",
    related: ["qtc", "herg"],
    source: E14,
  },
  {
    id: "ultrarapid-metabolizer",
    term: "Ultrarapid metabolizer (UM)",
    aka: ["UM", "ultra-rapid metabolizer"],
    definition:
      "A person whose enzyme activity is above even a rapid metabolizer (UM), from two increased function alleles or more than two normal function alleles, such as CYP2D6*1/*1xN.",
    onDesk: "Flip CYP2D6 to UM on the person panel with codeine on the tray to see extra activation to morphine.",
    related: ["rapid-metabolizer", "prodrug", "activity-score"],
    source: CPIC_TERMS,
  },
  {
    id: "volume-of-distribution",
    term: "Volume of distribution (Vd)",
    aka: ["Vd", "apparent volume of distribution"],
    definition:
      "A theoretical volume that would hold all the drug in the body at the same concentration as in plasma, so it relates the amount in the body to the plasma level. It is not a real space, and together with clearance it sets the half-life.",
    onDesk: "The Library's PK & Nonlinear Kinetics tab works through volume of distribution with clearance and half-life.",
    related: ["clearance", "half-life", "protein-binding"],
    source: STEADY_STATE,
  },
  {
    id: "warnings-and-precautions",
    term: "Warnings and Precautions (label section 5)",
    aka: ["warning", "precaution", "section 5"],
    definition:
      "The label section on clinically significant adverse reactions and other safety hazards, including those from drug interactions, with the limits on use they bring and the steps to take if they occur. Unlike a contraindication, these are risks to prevent or reduce, for example by avoiding a combined therapy or changing the dosage.",
    onDesk: "Pair pages name the label section behind each quote, so you can tell a warning from a contraindication.",
    related: ["contraindication", "boxed-warning", "drug-interactions-section"],
    links: [{ label: "Label-sourced drug pairs", href: "/pairs" }],
    source: CFR_LABEL,
  },
];

// Codepoint order of the lowercased term: identical on the server and in every browser.
const sortKey = (t: GlossaryTerm) => t.term.toLowerCase();
export const GLOSSARY: GlossaryTerm[] = [...TERMS].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));

export const GLOSSARY_BY_ID: Record<string, GlossaryTerm> = Object.fromEntries(GLOSSARY.map((t) => [t.id, t]));

/** Terms whose name, other names or definition contain the query (case-insensitive). */
export function filterGlossary(terms: GlossaryTerm[], query: string): GlossaryTerm[] {
  const q = query.trim().toLowerCase();
  if (!q) return terms;
  return terms.filter((t) => [t.term, ...t.aka, t.definition].some((s) => s.toLowerCase().includes(q)));
}

/** Sorted terms grouped under their first letter, for the A–Z sections. */
export function groupByLetter(terms: GlossaryTerm[]): { letter: string; terms: GlossaryTerm[] }[] {
  const groups: { letter: string; terms: GlossaryTerm[] }[] = [];
  for (const t of terms) {
    const letter = t.term[0]!.toUpperCase();
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.terms.push(t);
    else groups.push({ letter, terms: [t] });
  }
  return groups;
}

/** schema.org DefinedTermSet for the page, one DefinedTerm per entry. */
export function glossaryJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": GLOSSARY_URL,
    name: GLOSSARY_H1,
    description: GLOSSARY_DESCRIPTION,
    url: GLOSSARY_URL,
    inLanguage: "en-US",
    hasDefinedTerm: GLOSSARY.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${GLOSSARY_URL}#${t.id}`,
      name: t.term,
      ...(t.aka.length ? { alternateName: t.aka } : {}),
      description: t.definition,
      url: `${GLOSSARY_URL}#${t.id}`,
      inDefinedTermSet: GLOSSARY_URL,
    })),
  };
}

/** glossaryJsonLd() as <script> text, with <, > and & escaped as the router escapes head JSON-LD, so no term can close the tag. */
export function glossaryJsonLdText(): string {
  return JSON.stringify(glossaryJsonLd()).replace(/[<>&]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
