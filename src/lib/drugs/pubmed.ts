/** Curated PubMed shelf. Titles from NCBI esummary. Live search is a separate server call. */

export type CiteTag =
  | "cyp"
  | "pgx"
  | "mat"
  | "food"
  | "clinic"
  | "serotonin"
  | "qt"
  | "review"
  | "herb";

export interface Cite {
  pmid: string;
  year: number;
  journal: string;
  title: string;
  why: string;
  tags: CiteTag[];
  drugIds: string[];
  pair?: [string, string];
}

export interface LiveCite {
  pmid: string;
  title: string;
  year: string;
  journal: string;
  authors: string;
}

export interface LiveResult {
  ok: boolean;
  hits: LiveCite[];
  reason?: string;
  query: string;
}

function c(
  pmid: string,
  year: number,
  journal: string,
  title: string,
  why: string,
  tags: CiteTag[],
  drugIds: string[],
  pair?: [string, string],
): Cite {
  return pair ? { pmid, year, journal, title, why, tags, drugIds, pair } : { pmid, year, journal, title, why, tags, drugIds };
}

export const CITES: Cite[] = [
  c("1671113", 1991, "Lancet", "Interaction of citrus juices with felodipine and nifedipine.",
    "The paper that put grapefruit on the CYP map. Intestinal 3A4, not hepatic.",
    ["cyp", "food"], ["grapefruit", "nifedipine", "felodipine"], ["grapefruit", "felodipine"]),
  c("9834039", 1998, "Clin Pharmacol Ther", "Grapefruit juice-simvastatin interaction: effect on serum concentrations of simvastatin, simvastatin acid, and β-hydroxyacid simvastatin.",
    "Oral simvastatin exposure jumps. The 3A4-sensitive statin story in one curve.",
    ["cyp", "food"], ["grapefruit", "simvastatin"], ["grapefruit", "simvastatin"]),
  c("9585793", 1998, "Clin Pharmacol Ther", "Grapefruit juice greatly increases serum concentrations of lovastatin and lovastatin acid.",
    "Same map as simvastatin — and as red yeast rice / monacolin K.",
    ["cyp", "food", "herb"], ["grapefruit", "lovastatin", "red-yeast-rice"], ["grapefruit", "lovastatin"]),
  c("9871430", 1998, "Clin Pharmacol Ther", "Grapefruit juice substantially increases plasma concentrations of buspirone.",
    "A gut-3A4 first-pass victim. Overlay IV on this desk: the ghost does not move.",
    ["cyp", "food"], ["grapefruit", "buspirone"], ["grapefruit", "buspirone"]),
  c("7628179", 1995, "Clin Pharmacol Ther", "Interaction between grapefruit juice and midazolam in humans.",
    "Oral midazolam is the classic probe for intestinal CYP3A4 knockout.",
    ["cyp", "food"], ["grapefruit", "midazolam"], ["grapefruit", "midazolam"]),
  c("11476118", 2001, "J Clin Psychopharmacol", "Drug interactions with grapefruit juice: an update.",
    "Greenblatt / von Moltke review of which psychotropics actually move.",
    ["cyp", "food", "review"], ["grapefruit"]),
  c("10683007", 2000, "Lancet", "Indinavir concentrations and St John's wort.",
    "Piscitelli. The herbal that dumps a protease inhibitor via PXR / 3A4 induction.",
    ["cyp", "herb"], ["st-johns-wort", "ritonavir"]),
  c("10546917", 1999, "Clin Pharmacol Ther", "Pharmacokinetic interaction of digoxin with an herbal extract from St John's wort (Hypericum perforatum).",
    "P-gp induction. Digoxin falls. Not a CYP story.",
    ["cyp", "herb", "clinic"], ["st-johns-wort", "digoxin"], ["st-johns-wort", "digoxin"]),
  c("11673747", 2001, "Clin Pharmacol Ther", "The effects of St John's wort (Hypericum perforatum) on human cytochrome P450 activity.",
    "Wang. Phenotyping cocktail: 3A4 is the isoform that moves.",
    ["cyp", "herb"], ["st-johns-wort"]),
  c("13129991", 2003, "JAMA", "Effect of St John's wort on drug metabolism by induction of cytochrome P450 3A4 enzyme.",
    "Markowitz. Midazolam probe. The JAMA paper clinics still cite.",
    ["cyp", "herb"], ["st-johns-wort", "midazolam"]),
  c("15917386", 2005, "N Engl J Med", "Drug metabolism and variability among patients in drug response.",
    "Wilkinson. The CYP review to hand a student before this desk.",
    ["cyp", "review"], []),
  c("19106084", 2009, "N Engl J Med", "Cytochrome p-450 polymorphisms and response to clopidogrel.",
    "Mega TRITON. 2C19 loss-of-function, lost activation, stent thrombosis.",
    ["pgx", "clinic"], ["clopidogrel"]),
  c("18206732", 2008, "J Am Coll Cardiol", "Influence of omeprazole on the antiplatelet action of clopidogrel associated with aspirin: the randomized, double-blind OCLA study.",
    "Gilard. Omeprazole phenocopies a 2C19 PM. Pantoprazole is the quieter switch on this desk.",
    ["cyp", "clinic"], ["clopidogrel", "omeprazole"], ["clopidogrel", "omeprazole"]),
  c("23698643", 2013, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium guidelines for CYP2C19 genotype and clopidogrel therapy: 2013 update.",
    "CPIC clopidogrel. Open the guideline; this desk only paraphrases.",
    ["pgx", "clinic"], ["clopidogrel"]),
  c("35034351", 2022, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium Guideline for CYP2C19 Genotype and Clopidogrel Therapy: 2022 update.",
    "Current CPIC table for clopidogrel / 2C19.",
    ["pgx", "clinic"], ["clopidogrel"]),
  c("15930419", 2005, "N Engl J Med", "Effect of VKORC1 haplotypes on transcriptional regulation and warfarin dose.",
    "Rieder. VKORC1 plus 2C9 is why warfarin lives on the PGx tab.",
    ["pgx", "clinic"], ["warfarin"]),
  c("28198005", 2017, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for Pharmacogenetics-Guided Warfarin Dosing: 2017 update.",
    "CPIC warfarin. Not a dose from this desk.",
    ["pgx", "clinic"], ["warfarin"]),
  c("24458010", 2014, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium guidelines for cytochrome P450 2D6 genotype and codeine therapy: 2014 update.",
    "Codeine UM leads to morphine toxicity. PM means no analgesia. The teaching pair.",
    ["pgx"], ["codeine"]),
  c("33387367", 2021, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium Guideline for CYP2D6, OPRM1, and COMT Genotypes and Select Opioid Therapy.",
    "CPIC opioids after codeine: tramadol, hydrocodone, oxycodone caveats.",
    ["pgx", "mat"], ["codeine", "tramadol", "hydrocodone", "oxycodone"]),
  c("16819548", 2007, "Pharmacogenomics J", "Pharmacokinetics of codeine and its metabolite morphine in ultra-rapid metabolizers due to CYP2D6 duplication.",
    "Kirchheiner. Morphine AUC in UMs — why a 'usual' codeine dose is not usual.",
    ["pgx", "cyp"], ["codeine"]),
  c("16361630", 2005, "J Clin Oncol", "Pharmacogenetics of tamoxifen biotransformation is associated with clinical outcomes of efficacy and hot flashes.",
    "Goetz. 2D6 blockade (or PM) is lost activation, not stacked parent.",
    ["pgx", "clinic"], ["tamoxifen"]),
  c("25974703", 2015, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP2D6 and CYP2C19 Genotypes and Dosing of Selective Serotonin Reuptake Inhibitors.",
    "CPIC SSRIs. Flip 2C19 on this desk for citalopram / escitalopram.",
    ["pgx"], ["citalopram", "escitalopram", "sertraline", "fluoxetine", "paroxetine", "fluvoxamine"]),
  c("27997040", 2017, "Clin Pharmacol Ther", "Clinical pharmacogenetics implementation consortium guideline (CPIC) for CYP2D6 and CYP2C19 genotypes and dosing of tricyclic antidepressants: 2016 update.",
    "CPIC TCAs. Amitriptyline is 2D6 and 2C19.",
    ["pgx"], ["amitriptyline", "nortriptyline", "imipramine", "clomipramine", "desipramine"]),
  c("21270794", 2011, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium guidelines for thiopurine methyltransferase genotype and thiopurine dosing.",
    "TPMT. Azathioprine / 6-MP. Allopurinol is a phenocopy via xanthine oxidase, not TPMT.",
    ["pgx", "clinic"], ["azathioprine", "mercaptopurine"]),
  c("23422873", 2013, "Clin Pharmacol Ther", "Clinical pharmacogenetics implementation consortium guidelines for thiopurine methyltransferase genotype and thiopurine dosing: 2013 update.",
    "TPMT update. NUDT15 later joined the table.",
    ["pgx", "clinic"], ["azathioprine", "mercaptopurine"]),
  c("26094938", 2016, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium (CPIC) guidelines for human leukocyte antigen B (HLA-B) genotype and allopurinol dosing: 2015 update.",
    "HLA-B*5801. Severe cutaneous reaction — not a CYP collision.",
    ["pgx", "clinic"], ["allopurinol"]),
  c("24918167", 2014, "Clin Pharmacol Ther", "The clinical pharmacogenetics implementation consortium guideline for SLCO1B1 and simvastatin-induced myopathy: 2014 update.",
    "OATP1B1. Gemfibrozil is the phenocopy on this desk.",
    ["pgx", "clinic"], ["simvastatin"]),
  c("32189324", 2020, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium Guideline (CPIC) for CYP2C9 and Nonsteroidal Anti-Inflammatory Drug Therapies.",
    "2C9 PMs stack NSAID parent. Celecoxib, ibuprofen, flurbiprofen.",
    ["pgx", "clinic"], ["ibuprofen", "celecoxib", "meloxicam", "diclofenac"]),
  c("32770672", 2021, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP2C19 and Proton Pump Inhibitor Dosing.",
    "2C19 UM may fail a PPI; PM stacks parent. Pantoprazole is still the clopidogrel switch.",
    ["pgx", "clinic"], ["omeprazole", "esomeprazole", "lansoprazole", "pantoprazole"]),
  c("31006110", 2019, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP2B6 and Efavirenz-Containing Antiretroviral Therapy.",
    "2B6 PM stacks efavirenz. Same isoform as ketamine and methadone.",
    ["pgx"], ["efavirenz", "ketamine", "methadone"]),
  c("12230351", 2002, "Ann Intern Med", "Torsade de pointes associated with very-high-dose methadone.",
    "Krantz. Methadone QT is dose and potassium. Azoles and Vistaril are the traps on this desk.",
    ["qt", "mat"], ["methadone"]),
  c("18292673", 2008, "Anesthesiology", "Role of CYP2B6 in stereoselective human methadone metabolism.",
    "Kharasch. 2B6, not just 3A4. Inducers look like a stolen dose.",
    ["cyp", "mat"], ["methadone"]),
  c("9663180", 1998, "Clin Pharmacol Ther", "The effect of fluconazole on the clinical pharmacokinetics of methadone.",
    "Azole raises methadone. QT stack, not a 'stable OTP' footnote.",
    ["cyp", "mat", "qt"], ["fluconazole", "methadone"], ["fluconazole", "methadone"]),
  c("17517480", 2007, "Drug Alcohol Depend", "Sublingual buprenorphine/naloxone precipitated withdrawal in subjects maintained on 100mg of daily methadone.",
    "Occupancy, not milligrams. The failed induction on this desk.",
    ["mat"], ["buprenorphine", "methadone"], ["buprenorphine", "methadone"]),
  c("8160253", 1994, "Ther Drug Monit", "Probable metabolic interaction between methadone and fluvoxamine in addict patients.",
    "Bertschy. Luvox raises the methadone level/dose ratio. Stopping it looks like a stolen take-home.",
    ["cyp", "mat"], ["fluvoxamine", "methadone"], ["fluvoxamine", "methadone"]),
  c("7224382", 1981, "Ann Intern Med", "Phenytoin-induced methadone withdrawal.",
    "Tong / Kreek. Therapeutic phenytoin dumps methadone within days. Induction, not a missed bottle.",
    ["cyp", "mat"], ["phenytoin", "methadone"], ["phenytoin", "methadone"]),
  c("10485779", 1999, "Anesthesiology", "Ritonavir's role in reducing fentanyl clearance and prolonging its half-life.",
    "Olkkola. Ritonavir cuts fentanyl clearance 67%. Paxlovid is the five-day version of this booster.",
    ["cyp", "mat"], ["ritonavir", "fentanyl", "paxlovid"], ["ritonavir", "fentanyl"]),
  c("19238656", 2008, "Clin Pharmacol Ther", "Mechanism of ritonavir changes in methadone pharmacokinetics and pharmacodynamics: II. Ritonavir effects on CYP3A and P-glycoprotein activities.",
    "Kharasch. Ritonavir still drops methadone even while inhibiting 3A4. The OTP mixed arrow.",
    ["cyp", "mat"], ["ritonavir", "methadone", "paxlovid"], ["ritonavir", "methadone"]),
  c("20132117", 2010, "Am J Addict", "Drug interactions of clinical importance among the opioids, methadone and buprenorphine, and other frequently prescribed medications: a review.",
    "McCance-Katz. The OTP DDI review still handed to the window.",
    ["mat", "review"], ["methadone", "buprenorphine", "fentanyl"]),
  c("17109310", 2006, "Clin Infect Dis", "Interactions between buprenorphine and antiretrovirals. II. The protease inhibitors nelfinavir, lopinavir/ritonavir, and ritonavir.",
    "McCance-Katz. Ritonavir raises buprenorphine ~50% without a withdrawal map. Opposite of methadone.",
    ["cyp", "mat"], ["buprenorphine", "ritonavir", "paxlovid", "cobicistat"], ["buprenorphine", "ritonavir"]),
  c("11145498", 2000, "Lancet", "Methadone, ciprofloxacin, and adverse drug reactions.",
    "Herrlin. Cipro next to methadone — sedation and a long QTc. Not a free UTI pill on the OTP.",
    ["cyp", "mat", "qt"], ["ciprofloxacin", "methadone"], ["ciprofloxacin", "methadone"]),
  c("15329598", 2004, "Anesthesiology", "Influence of hepatic and intestinal cytochrome P4503A activity on the acute disposition and effects of oral transmucosal fentanyl citrate.",
    "Kharasch. 3A4 changes duration more than peak after Actiq. Rifampin dumps; inhibitors stretch.",
    ["cyp", "mat"], ["fentanyl", "grapefruit", "rifampin"]),
  c("11014404", 2000, "Clin Pharmacol Ther", "Increased drug delivery to the brain by P-glycoprotein inhibition.",
    "Sadeque. Loperamide plus quinidine is a CNS opioid. P-gp, not a GI footnote.",
    ["cyp", "mat"], ["loperamide", "quinidine"], ["loperamide", "quinidine"]),
  c("12925718", 2003, "QJM", "The Hunter Serotonin Toxicity Criteria: simple and accurate diagnostic decision rules for serotonin toxicity.",
    "Dunkley. Clonus, hyperreflexia, hyperthermia. The teaching screen.",
    ["serotonin"], ["mdma", "tramadol", "sertraline", "phenelzine"]),
  c("2035713", 1991, "Am J Psychiatry", "The serotonin syndrome.",
    "Sternbach. The original diagnostic frame.",
    ["serotonin", "review"], ["phenelzine"]),
  c("15784664", 2005, "N Engl J Med", "The serotonin syndrome.",
    "Boyer and Shannon. The NEJM review still handed to residents.",
    ["serotonin", "review"], ["mdma", "tramadol", "linezolid"]),
  c("17874986", 2007, "Med J Aust", "Serotonin toxicity: a practical approach to diagnosis and treatment.",
    "Isbister. Practical, not a plus-table.",
    ["serotonin"], ["tramadol", "dextromethorphan"]),
  c("10078539", 1999, "Am J Cardiol", "Sildenafil citrate and blood-pressure-lowering drugs: results of drug interaction studies with an organic nitrate and a calcium antagonist.",
    "Webb. Nitrate × PDE5 is labeled catastrophic hypotension.",
    ["clinic"], ["sildenafil", "nitroglycerin"], ["sildenafil", "nitroglycerin"]),
  c("15592331", 2004, "Clin Pharmacol Ther", "Ciprofloxacin greatly increases concentrations and hypotensive effect of tizanidine by inhibiting its cytochrome P450 1A2–mediated metabolism.",
    "Granfors. Tizanidine is a sensitive 1A2 victim. Echinacea is the vitamin-shop echo.",
    ["cyp", "clinic"], ["ciprofloxacin", "tizanidine"], ["ciprofloxacin", "tizanidine"]),
  c("16007523", 2005, "Clin Infect Dis", "Fatal interaction between clarithromycin and colchicine in patients with renal insufficiency: a retrospective study.",
    "Hung. 3A4/P-gp plus CKD. Colchicine is NTI.",
    ["cyp", "clinic"], ["clarithromycin", "colchicine"], ["clarithromycin", "colchicine"]),
  c("12065445", 2002, "Drug Metab Dispos", "Contribution of CYP3A4, CYP2B6, and CYP2C9 isoforms to N-demethylation of ketamine in human liver microsomes.",
    "Hijazi. Oral ketamine is a first-pass 3A4/2B6 victim. IV mostly skips gut 3A4.",
    ["cyp"], ["ketamine"]),
  c("15319342", 2004, "Drug Metab Dispos", "Stereochemical analysis of 3,4-methylenedioxymethamphetamine and its main metabolites in human samples including the catechol-O-methyltransferase-inhibited MDMA metabolite HMMA.",
    "MDMA clearance is 2D6 then COMT. Blockade stacks parent and serotonin.",
    ["cyp"], ["mdma"]),
  c("10976543", 2000, "Clin Pharmacol Ther", "Plasma concentrations of active simvastatin acid are increased by gemfibrozil.",
    "Backman. Gemfibrozil × simvastatin is contraindicated. Fenofibrate is quieter — not free.",
    ["cyp", "clinic"], ["gemfibrozil", "simvastatin"], ["gemfibrozil", "simvastatin"]),
  c("12496749", 2002, "Clin Pharmacol Ther", "Gemfibrozil greatly increases plasma concentrations of cerivastatin.",
    "OATP/2C8. The withdrawn-statin lesson that still maps to 2C8 victims (repaglinide, pioglitazone).",
    ["cyp", "clinic"], ["gemfibrozil", "pioglitazone"]),
  c("7870932", 1993, "Psychopharmacology", "Concurrent cocaine-ethanol ingestion in humans: pharmacology, physiology, behavior, and the role of cocaethylene.",
    "McCance-Katz. Cocaine plus ethanol is a third drug.",
    ["mat"], ["cocaine", "ethanol"], ["cocaine", "ethanol"]),
  c("10393149", 1999, "Am J Clin Nutr", "Dietary supplement or drug? The case for cholestin.",
    "Heber. Red yeast rice is lovastatin. Grapefruit and gemfibrozil still apply.",
    ["herb", "clinic"], ["red-yeast-rice", "lovastatin"]),
  c("9989685", 1999, "Am J Clin Nutr", "Cholesterol-lowering effects of a proprietary Chinese red-yeast-rice dietary supplement.",
    "The lipid drop is the statin. Not a free 'natural' row.",
    ["herb"], ["red-yeast-rice"]),
  c("21870106", 2012, "Eur J Clin Pharmacol", "Repeated administration of berberine inhibits cytochromes P450 in humans.",
    "Human cocktail: berberine is a real 2D6/3A4 perpetrator, not goldenseal tea.",
    ["cyp", "herb"], ["berberine"]),
  c("15900287", 2005, "Clin Pharmacol Ther", "In vivo effects of goldenseal, kava kava, black cohosh, and valerian on human cytochrome P450 1A2, 2D6, 2E1, and 3A4/5 phenotyping.",
    "Gurley. Goldenseal is the herb that actually moves 2D6/3A4. Kava/valerian are quieter on CYP.",
    ["cyp", "herb"], ["goldenseal", "kava", "black-cohosh", "valerian"]),
  c("18484782", 2008, "Drug Saf", "Safety of green tea extracts: a systematic review by the US Pharmacopeia.",
    "Concentrated EGCG has a liver signal. A cup of tea is not this row.",
    ["herb", "clinic"], ["green-tea"]),
  c("9737361", 1998, "Thyroid", "Effects of pharmacological fiber supplements on levothyroxine absorption.",
    "Psyllium / viscous fiber. Metamucil with the morning dose is an empty TSH.",
    ["food", "clinic"], ["psyllium", "levothyroxine"], ["psyllium", "levothyroxine"]),
  c("12882588", 2003, "Clin Pharmacokinet", "Pharmacokinetic interactions with rifampicin: clinical relevance.",
    "Niemi. The induction review. Methadone, apixaban, tacrolimus, OCPs all dump.",
    ["cyp", "clinic", "review"], ["rifampin"]),
  c("2813665", 1989, "Psychopharmacology", "Dose-related plasma levels of clozapine: influence of smoking behaviour, sex and age.",
    "Haring. Smoke induces 1A2. Cessation is rebound toxicity.",
    ["cyp"], ["clozapine"]),
  c("12618594", 2003, "Pharmacogenetics", "The effect of smoking and cytochrome P450 CYP1A2 genetic polymorphism on clozapine clearance and dose requirement.",
    "van der Weide. Smoke plus 1A2 genotype.",
    ["cyp", "pgx"], ["clozapine"]),
  c("8521679", 1995, "Clin Pharmacokinet", "Clinical relevance of drug interactions with lithium.",
    "Finley. ACEI, ARB, thiazide, NSAID — reduced lithium clearance.",
    ["clinic"], ["lithium", "lisinopril"]),
  c("1524964", 1992, "Br J Clin Pharmacol", "Sodium valproate acutely inhibits lamotrigine metabolism.",
    "UGT, not CYP. Rash and SJS risk when the pair is started wrong.",
    ["clinic"], ["valproate", "lamotrigine"], ["valproate", "lamotrigine"]),
  c("31885095", 2020, "Pharmacotherapy", "Drug Interaction Between Febuxostat and Thiopurine Antimetabolites: A Review of the FDA Adverse Event Reporting System and Meta-Analysis.",
    "Xanthine oxidase. Febuxostat is the same trap as allopurinol next to Imuran.",
    ["clinic"], ["febuxostat", "azathioprine"], ["febuxostat", "azathioprine"]),
  c("15355126", 2004, "Clin Pharmacokinet", "Pharmacokinetics of budesonide (Entocort EC) capsules for Crohn's disease.",
    "Gut 3A4 first-pass. Azoles and ritonavir make a 'local' steroid systemic.",
    ["cyp", "clinic"], ["budesonide"]),
  c("8889906", 1996, "J Clin Psychopharmacol", "Cytochrome P450 enzymes: interpretation of their interactions with selective serotonin reuptake inhibitors. Part II.",
    "Preskorn. Fluoxetine/paroxetine lock 2D6. Fluvoxamine locks 1A2/2C19.",
    ["cyp", "review"], ["fluoxetine", "paroxetine", "fluvoxamine"]),
  c("17259955", 2007, "Clin Pharmacol Ther", "Drug interaction studies: study design, data analysis, and implications for dosing and labeling.",
    "Huang / FDA. How a 'strong inhibitor' is defined — the grading this desk uses.",
    ["cyp", "review"], []),
  c("22992668", 2012, "Clin Pharmacol Ther", "Pharmacogenomics knowledge for personalized medicine.",
    "PharmGKB overview. ClinPGx is the current home.",
    ["pgx", "review"], []),
  c("37139824", 2023, "J Am Geriatr Soc", "American Geriatrics Society 2023 updated AGS Beers Criteria® for potentially inappropriate medication use in older adults.",
    "Beers 2023. Flip geriatric on this desk. Not a stop list — a teaching highlight.",
    ["clinic", "review"], []),
  c("15781124", 2005, "Pharmacol Ther", "UDP-glucuronosyltransferases and clinical drug-drug interactions.",
    "UGT. Valproate–lamotrigine lives here, not on CYP.",
    ["clinic", "review"], ["valproate", "lamotrigine"]),
  c("12496741", 2002, "Clin Pharmacol Ther", "Fruit juices inhibit organic anion transporting polypeptide-mediated drug uptake to decrease the oral availability of fexofenadine.",
    "Dresser. Apple/orange/grapefruit juice cut Allegra. OATP, not CYP — the arrow is loss of effect.",
    ["food", "clinic"], ["oatp-juice", "fexofenadine", "grapefruit"], ["oatp-juice", "fexofenadine"]),
  c("16044105", 2005, "Br J Clin Pharmacol", "Effects of orange juice on the pharmacokinetics of atenolol.",
    "Lilja. Orange juice dumps atenolol AUC. Same OATP neighborhood as Allegra, not 2D6.",
    ["food", "clinic"], ["oatp-juice", "atenolol"], ["oatp-juice", "atenolol"]),
  c("24193112", 2014, "Clin Pharmacol Ther", "Green tea ingestion greatly reduces plasma concentrations of nadolol in humans.",
    "Misaka. Catechins vs OATP1A2. Corgard falls. A cup of tea is not the EGCG liver capsule — both still map.",
    ["food", "herb"], ["green-tea", "nadolol"], ["green-tea", "nadolol"]),
  c("1934862", 1991, "Clin Pharmacol Ther", "Interference of dairy products with the absorption of ciprofloxacin.",
    "Neuvonen. Yogurt and milk empty Cipro. Calcium chelation, not 1A2.",
    ["food", "clinic"], ["dairy", "ciprofloxacin"], ["dairy", "ciprofloxacin"]),
  c("18578612", 2008, "Thyroid", "Altered intestinal absorption of L-thyroxine caused by coffee.",
    "Benvenga. Espresso with Synthroid is an empty TSH. Tannins, not 1A2 caffeine.",
    ["food", "clinic"], ["coffee", "levothyroxine"], ["coffee", "levothyroxine"]),
  c("6808025", 1982, "Neurology", "Interference of oral phenytoin absorption by continuous nasogastric feedings.",
    "Bauer. The tube-feed Dilantin paper. Hold, flush, separate. Not 2C9.",
    ["food", "clinic"], ["enteral-feed", "phenytoin"], ["enteral-feed", "phenytoin"]),
  c("3498445", 1987, "Arch Neurol", "Dietary influences on the antiparkinsonian response to levodopa.",
    "Juncos. Protein meals compete at LAT1. A steak next to Sinemet is lost 'on' time, not a cytochrome.",
    ["food", "clinic"], ["protein-meal", "levodopa"], ["protein-meal", "levodopa"]),
  c("14999113", 2004, "N Engl J Med", "Drug-induced prolongation of the QT interval.",
    "Roden. Milliseconds, potassium, and stacked IKr blockers — the review that still teaches torsades.",
    ["qt", "review", "clinic"], ["methadone", "sotalol", "citalopram"]),
  c("12230351", 2002, "Ann Intern Med", "Torsade de pointes associated with very-high-dose methadone.",
    "Krantz. The OTP QT paper. Dose-related methadone and milliseconds.",
    ["qt", "mat", "clinic"], ["methadone"]),
  c("22265699", 2012, "Lancet", "Lithium toxicity profile: a systematic review and meta-analysis.",
    "McKnight. Levels, thyroid, kidney — TDM is the point of lithium, not a CYP row.",
    ["clinic", "review"], ["lithium"]),
  c("29390205", 2018, "Pharmacopsychiatry", "Consensus Guidelines for Therapeutic Drug Monitoring in Neuropsychopharmacology: Update 2017.",
    "AGNP / Hiemke. Clozapine 350 ng/mL, TCA windows, the teaching TDM table.",
    ["clinic", "review", "pgx"], ["clozapine", "nortriptyline", "valproate"]),
  c("8305063", 1993, "N Engl J Med", "Acute liver failure.",
    "Lee. Why acetaminophen, INH, and valproate sit on the LiverTox A list.",
    ["clinic", "review"], ["acetaminophen", "isoniazid", "valproate"]),
  c("16338275", 2005, "Clin Pharmacol Ther", "Methadone enantiomer plasma levels, CYP2B6, CYP2C19, and CYP2C9 genotypes, and response to treatment.",
    "2B6 is why some methadone levels never settle. QT is the other card.",
    ["cyp", "mat", "pgx"], ["methadone"]),
  c("22797808", 2012, "Br J Clin Pharmacol", "Addressing phenoconversion: the Achilles' heel of personalized medicine.",
    "Shah and Smith. A strong 2D6 inhibitor makes a normal metabolizer look poor. The genotype did not change.",
    ["cyp", "pgx", "clinic"], ["paroxetine", "codeine", "fluoxetine"]),
  c("32721035", 2020, "Clin Pharmacol Ther", "Impact of CYP2D6 pharmacogenetic testing on the management of patients with mental health disorders.",
    "Cicali. Phenoconversion is why a 2D6 NM on bupropion is not a 2D6 NM.",
    ["cyp", "pgx"], ["bupropion", "dextromethorphan"]),
  c("36067166", 2022, "MMWR Recomm Rep", "CDC clinical practice guideline for prescribing opioids for pain — United States, 2022.",
    "The MME factors this desk teaches. Methadone is banded. Street fentanyl is not a factor.",
    ["mat", "clinic", "review"], ["morphine", "oxycodone", "methadone", "fentanyl"]),
  c("21926492", 2011, "Clin Pharmacol Ther", "PharmGKB summary: very important pharmacogene information for CYP2D6.",
    "Owen. The 2D6 chapter this desk phenoconverts against.",
    ["cyp", "pgx", "review"], ["codeine", "paroxetine"]),
  c("24986836", 2014, "J Anal Toxicol", "False-positive interferences of common urine drug screen immunoassays: a review.",
    "Saitman. Wellbutrin vs the amphetamine cup, Zoloft vs the benzo cup, Seroquel vs the TCA cup. Presumptive, not LC-MS/MS.",
    ["mat", "clinic", "review"], ["bupropion", "sertraline", "quetiapine", "dextromethorphan", "methadone"]),
  c("12924748", 2003, "J Psychoactive Drugs", "The Clinical Opiate Withdrawal Scale (COWS).",
    "Wesson and Ling. Eleven items. A score is not occupancy — fentanyl in tissue can still precipitate at 14.",
    ["mat", "clinic"], ["buprenorphine", "methadone", "fentanyl"]),
  c("2597811", 1989, "Br J Addict", "Assessment of alcohol withdrawal: the revised clinical institute withdrawal assessment for alcohol scale (CIWA-Ar).",
    "Sullivan. Ten items, max 67. Symptom-triggered maps often move at 8–10. Not a benzo protocol on this desk.",
    ["clinic", "review"], ["ethanol"]),
  c("21142534", 2010, "N Engl J Med", "Neonatal abstinence syndrome after methadone or buprenorphine exposure.",
    "Jones MOTHER. Buprenorphine had milder NAS in that map. Not a reason to destabilize a working methadone, and not a milk card.",
    ["mat", "clinic"], ["methadone", "buprenorphine"]),
  c("36449473", 2022, "N Engl J Med", "Buprenorphine versus methadone for opioid use disorder in pregnancy.",
    "Suarez. Cohort echo of MOTHER: milder NAS on buprenorphine, similar maternal outcomes. Still not a switch protocol.",
    ["mat", "clinic"], ["methadone", "buprenorphine"]),
  c("32511106", 2020, "J Addict Med", "The ASAM National Practice Guideline for the Treatment of Opioid Use Disorder: 2020 Focused Update.",
    "Induction timing, COWS, XR-naltrexone washout. Occupancy is not the integer. This desk does not pick a film.",
    ["mat", "clinic", "review"], ["buprenorphine", "methadone", "naltrexone", "fentanyl"]),
  c("8093639", 1993, "N Engl J Med", "Clozapine-induced agranulocytosis. Incidence and risk factors in the United States.",
    "Alvir. Why ANC, not WBC, sits on the REMS table this desk paraphrases.",
    ["clinic"], ["clozapine"]),
  c("8549036", 1996, "Clin Pharmacol Ther", "Rifampin drastically reduces plasma concentrations and effects of oral midazolam.",
    "Backman. 96% AUC dump. Oral midazolam is the 3A4 index victim. Open CYP, then the start clock.",
    ["cyp", "clinic"], ["rifampin", "midazolam"], ["rifampin", "midazolam"]),
  c("9591931", 1998, "Eur J Clin Pharmacol", "The area under the plasma concentration-time curve for oral midazolam is 400-fold larger during treatment with itraconazole than with rifampicin.",
    "Backman. Switch from inhibition to induction is a 400-fold swing. Four days after rifampin, AUC is still only 13% of baseline — the stop clock.",
    ["cyp", "clinic"], ["rifampin", "itraconazole", "midazolam"], ["rifampin", "midazolam"]),
  c("12844322", 2003, "Clin Pharmacokinet", "Pharmacokinetic interactions with rifampicin.",
    "Niemi. Full induction ~1 week; dissipates ~2 weeks after stop. Remember the stop — rebound is the dangerous half.",
    ["cyp", "review"], ["rifampin", "midazolam", "simvastatin"]),
  c("18043468", 2007, "Ther Drug Monit", "Clinically important drug interactions potentially involving mechanism-based inhibition of cytochrome P450 3A4 and the role of therapeutic drug monitoring.",
    "Zhou. Macrolides, ritonavir, diltiazem/verapamil destroy 3A4. New enzyme, not dissociation. The TDI linger on this desk.",
    ["cyp", "review"], ["clarithromycin", "erythromycin", "ritonavir", "diltiazem", "verapamil"]),
  c("17381386", 2007, "Ann Pharmacother", "Interaction between valproate and meropenem: a retrospective study.",
    "Spriet. Carbapenems crash valproate within a day — UGT / glucuronide recycling, not a CYP isoform. Switch the antibiotic or the AED.",
    ["clinic"], ["meropenem", "valproate"], ["meropenem", "valproate"]),
  c("29126268", 2018, "Clin Infect Dis", "Vancomycin plus piperacillin-tazobactam and acute kidney injury in adults: a systematic review and meta-analysis.",
    "Luther. Observational AKI excess vs vancomycin plus cefepime or a carbapenem. Not a boxed hold. Oral vancomycin is a different exposure.",
    ["clinic"], ["vancomycin", "piperacillin-tazobactam"], ["vancomycin", "piperacillin-tazobactam"]),
  c("11248154", 2001, "N Engl J Med", "Cyclooxygenase inhibitors and the antiplatelet effects of aspirin.",
    "Catella-Lawson. Ibuprofen occupies COX-1 and can block aspirin acetylation. Lost cardioprotection, not two NSAIDs.",
    ["clinic"], ["aspirin", "ibuprofen"], ["aspirin", "ibuprofen"]),
  c("16433873", 2006, "Br J Clin Pharmacol", "The pharmacokinetic and pharmacodynamic consequences of the co-administration of lamotrigine and a combined oral contraceptive in healthy female subjects.",
    "Sidhu. Combined OCPs cut lamotrigine AUC roughly in half. Stopping the pill can spike parent.",
    ["clinic"], ["lamotrigine", "ethinyl-estradiol"], ["lamotrigine", "ethinyl-estradiol"]),
  c("29385237", 2018, "Clin Pharmacol Ther", "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP2D6 and Tamoxifen Therapy.",
    "CPIC tamoxifen. Strong 2D6 inhibitors steal endoxifen. Switch the SSRI, do not give more tamoxifen.",
    ["pgx", "clinic"], ["tamoxifen", "paroxetine"], ["tamoxifen", "paroxetine"]),
  c("18378520", 2008, "N Engl J Med", "Telmisartan, ramipril, or both in patients at high risk for vascular events.",
    "ONTARGET. Dual ACEI+ARB — more hyperkalemia, hypotension, AKI without outcome gain.",
    ["clinic"], ["ramipril", "telmisartan", "lisinopril", "losartan"], ["lisinopril", "losartan"]),
  c("26253303", 2015, "Gastroenterology", "Extreme bradycardia after first doses of sofosbuvir and daclatasvir in patients receiving amiodarone: 2 cases including a rechallenge.",
    "Fontaine. The labeled sofosbuvir–amiodarone bradycardia row. Not stacked nodal PD.",
    ["clinic"], ["epclusa", "amiodarone", "sofosbuvir"], ["epclusa", "amiodarone"]),
];

export function pubmedUrl(pmid: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

export function pubmedSearchUrl(q: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`;
}

export function citesFor(ids: string[]): Cite[] {
  if (!ids.length) return CITES.filter((c) => c.tags.includes("review")).slice(0, 8);
  const set = new Set(ids);
  const pairHits = CITES.filter((c) => c.pair && set.has(c.pair[0]) && set.has(c.pair[1]));
  const drugHits = CITES.filter((c) => c.drugIds.some((id) => set.has(id)));
  const seen = new Set<string>();
  const out: Cite[] = [];
  for (const row of [...pairHits, ...drugHits]) {
    if (seen.has(row.pmid)) continue;
    seen.add(row.pmid);
    out.push(row);
  }
  return out;
}

export function searchCites(query: string): Cite[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITES;
  if (q === "pubmed" || q === "pmid" || q === "cites" || q === "refs" || q === "papers") return CITES;
  return CITES.filter((c) => {
    if (c.tags.some((t) => t === q)) return true;
    if (c.pmid === q) return true;
    if (String(c.year) === q) return true;
    const blob = `${c.title} ${c.journal} ${c.why} ${c.drugIds.join(" ")}`.toLowerCase();
    return blob.includes(q);
  });
}

export function hasCite(id: string) {
  return CITES.some((c) => c.drugIds.includes(id));
}

export const CITE_TAGS: { id: CiteTag | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cyp", label: "CYP" },
  { id: "pgx", label: "PGx" },
  { id: "mat", label: "MAT" },
  { id: "food", label: "Food" },
  { id: "herb", label: "Herb" },
  { id: "clinic", label: "Clinic" },
  { id: "serotonin", label: "Serotonin" },
  { id: "qt", label: "QT" },
  { id: "review", label: "Reviews" },
];
