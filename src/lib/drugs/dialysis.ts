/**
 * Hemodialysis drug removal & dialyzability reference.
 * Grounded in FDA package inserts, Bennett's Drug Prescribing in Renal Failure,
 * and clinical nephrology pharmacokinetics.
 *
 * Determinants of dialytic clearance:
 * 1. Molecular Weight: Low MW (<500 Da) easily traverses conventional dialyzer pores; large macromolecules (>1000–1500 Da) require high-flux membranes.
 * 2. Protein Binding: Only unbound (free) drug crosses the dialyzer membrane. High binding (>80–85%) severely restricts removal.
 * 3. Volume of Distribution (Vd): Drugs with large Vd (>1–2 L/kg) reside primarily in extravascular and intracellular tissue stores; blood clearance removes only a minute fraction of total body burden.
 * 4. Water Solubility: Lipophilic agents distribute into tissue and are poorly cleared compared to hydrophilic agents.
 *
 * Educational reference only — not an order, not a replacement prescription.
 * The Prescribing Information and nephrology team govern.
 */

export type Dialyzability = "dialyzed" | "partially-dialyzed" | "not-dialyzed";
export type PostHdSchedule = "post-hd" | "supplement" | "standard";

export interface DialysisEntry {
  id: string;
  name: string;
  dialyzability: Dialyzability;
  schedule: PostHdSchedule;
  fractionRemovedPct?: string;
  molecularWeightDa: number;
  proteinBindingPct: number;
  volumeDistributionLKg: number;
  mechanism: string;
  pearl: string;
  caution?: string;
}

export const DIALYSIS_CATALOG: Record<string, DialysisEntry> = {
  // —— Beta-lactams & Glycopeptides ——————————————————————————————————
  cefepime: {
    id: "cefepime",
    name: "Cefepime",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~68%",
    molecularWeightDa: 480,
    proteinBindingPct: 20,
    volumeDistributionLKg: 0.3,
    mechanism: "Low MW, low protein binding, hydrophilic small Vd allow rapid dialytic extraction.",
    pearl: "Substantial dialytic clearance. Must administer replacement dose immediately after hemodialysis to maintain %T > MIC. Interval prolongation in CKD without proper monitoring risks neurotoxicity / myoclonus / nonconvulsive status epilepticus.",
    caution: "Failure to redose post-HD risks subtherapeutic bacteremic coverage; failure to reduce frequency between runs risks neurotoxicity.",
  },
  meropenem: {
    id: "meropenem",
    name: "Meropenem",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 383,
    proteinBindingPct: 2,
    volumeDistributionLKg: 0.35,
    mechanism: "Negligible protein binding, low MW, and hydrophilic extracellular distribution.",
    pearl: "Approximately 50% cleared during a 3- to 4-hour hemodialysis session. Administer the scheduled maintenance dose after the completion of hemodialysis.",
  },
  "piperacillin-tazobactam": {
    id: "piperacillin-tazobactam",
    name: "Piperacillin / Tazobactam",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "30–40%",
    molecularWeightDa: 517,
    proteinBindingPct: 30,
    volumeDistributionLKg: 0.24,
    mechanism: "Modest protein binding and low extracellular Vd allow significant dialytic clearance.",
    pearl: "Hemodialysis removes 30–40% of piperacillin and tazobactam. An additional dose or scheduling maintenance post-HD is required on dialysis days to ensure pseudomonal eradication.",
  },
  ampicillin: {
    id: "ampicillin",
    name: "Ampicillin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "40–50%",
    molecularWeightDa: 349,
    proteinBindingPct: 20,
    volumeDistributionLKg: 0.25,
    mechanism: "Low protein binding and low molecular weight facilitate high dialytic clearance.",
    pearl: "40–50% removed by intermittent hemodialysis; administer dose post-dialysis.",
  },
  amoxicillin: {
    id: "amoxicillin",
    name: "Amoxicillin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~30%",
    molecularWeightDa: 365,
    proteinBindingPct: 20,
    volumeDistributionLKg: 0.3,
    mechanism: "Water soluble, low protein binding, low MW.",
    pearl: "Moderately to highly dialyzed; schedule post-HD dose on dialysis days.",
  },
  ceftazidime: {
    id: "ceftazidime",
    name: "Ceftazidime",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~55%",
    molecularWeightDa: 546,
    proteinBindingPct: 10,
    volumeDistributionLKg: 0.25,
    mechanism: "Negligible protein binding, hydrophilic small Vd.",
    pearl: "Over 50% removed during standard hemodialysis; administer post-HD.",
  },
  cefazolin: {
    id: "cefazolin",
    name: "Cefazolin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "20–50% (flux-dependent)",
    molecularWeightDa: 454,
    proteinBindingPct: 80,
    volumeDistributionLKg: 0.15,
    mechanism: "Moderate-high protein binding restricts clearance on low-flux membranes, but modern high-flux filters clear substantial drug.",
    pearl: "Workhorse antimicrobial in outpatient hemodialysis units; commonly administered intravenously after each dialysis run (three times weekly) for bacteremia or line infections.",
  },
  ceftriaxone: {
    id: "ceftriaxone",
    name: "Ceftriaxone",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 554,
    proteinBindingPct: 90,
    volumeDistributionLKg: 0.15,
    mechanism: "High protein binding (>90%) prevents passage across the dialyzer membrane; balanced dual renal/biliary elimination.",
    pearl: "Ceftriaxone is not significantly cleared by hemodialysis. No supplemental dose is necessary after dialysis; maintains standard daily schedule without post-HD adjustment.",
  },
  vancomycin: {
    id: "vancomycin",
    name: "Vancomycin",
    dialyzability: "partially-dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "20–40% (high-flux)",
    molecularWeightDa: 1448,
    proteinBindingPct: 55,
    volumeDistributionLKg: 0.7,
    mechanism: "Bulky glycopeptide (1448 Da) has negligible clearance through historic low-flux dialyzers, but modern synthetic high-flux membranes remove 20–40%.",
    pearl: "Typically administered post-HD. In high-flux IHD, pre-dialysis serum level guides whether a maintenance or booster dose is given at the tail end or immediately after the run.",
  },
  daptomycin: {
    id: "daptomycin",
    name: "Daptomycin",
    dialyzability: "partially-dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~15%",
    molecularWeightDa: 1620,
    proteinBindingPct: 92,
    volumeDistributionLKg: 0.1,
    mechanism: "Large cyclic lipopeptide (1620 Da) with very high protein binding (92%); low dialytic extraction.",
    pearl: "Dosed every 48 hours following hemodialysis on dialysis days to synchronize administration and prevent premature removal.",
  },
  linezolid: {
    id: "linezolid",
    name: "Linezolid",
    dialyzability: "partially-dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~30%",
    molecularWeightDa: 337,
    proteinBindingPct: 31,
    volumeDistributionLKg: 0.6,
    mechanism: "Low protein binding and low MW permit moderate dialytic clearance despite modest tissue penetration.",
    pearl: "Approximately 30% of a linezolid dose is cleared by hemodialysis. Doses scheduled on dialysis days should be given after the completion of the dialysis session.",
  },

  // —— Aminoglycosides & Fluoroquinolones ————————————————————————————
  gentamicin: {
    id: "gentamicin",
    name: "Gentamicin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 477,
    proteinBindingPct: 10,
    volumeDistributionLKg: 0.25,
    mechanism: "Highly water soluble, low protein binding, low MW; readily extracted across dialyzer.",
    pearl: "Approximately 50% removed per 3- to 4-hour hemodialysis run. Administer supplemental post-HD dose guided by therapeutic drug monitoring (peak/trough) to avoid irreversible ototoxicity / vestibulotoxicity.",
    caution: "Accumulation in renal failure damages hair cells of the inner ear. TDM monitoring required.",
  },
  tobramycin: {
    id: "tobramycin",
    name: "Tobramycin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 467,
    proteinBindingPct: 10,
    volumeDistributionLKg: 0.25,
    mechanism: "Low MW, minimal protein binding, hydrophilic extracellular distribution.",
    pearl: "Rapidly dialyzed; administer replacement dose post-HD.",
  },
  amikacin: {
    id: "amikacin",
    name: "Amikacin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 585,
    proteinBindingPct: 10,
    volumeDistributionLKg: 0.25,
    mechanism: "Low protein binding and hydrophilic small Vd.",
    pearl: "50% cleared during hemodialysis; administer post-dialysis guided by levels.",
  },
  ciprofloxacin: {
    id: "ciprofloxacin",
    name: "Ciprofloxacin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<10%",
    molecularWeightDa: 331,
    proteinBindingPct: 30,
    volumeDistributionLKg: 2.5,
    mechanism: "Large volume of distribution (2.5 L/kg) and substantial tissue penetration mean only a tiny fraction of drug is in circulating plasma.",
    pearl: "Minimally dialyzed (<10%). Dose is reduced for baseline renal impairment, but no supplemental dose is needed post-hemodialysis.",
  },
  levofloxacin: {
    id: "levofloxacin",
    name: "Levofloxacin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<10%",
    molecularWeightDa: 361,
    proteinBindingPct: 35,
    volumeDistributionLKg: 1.5,
    mechanism: "Large tissue distribution (Vd 1.5 L/kg) limits dialytic extraction despite low protein binding.",
    pearl: "Hemodialysis removal is negligible. Dose is reduced according to renal impairment guidelines (e.g. 500 mg initial then 250 mg every 48h), without supplemental post-HD doses.",
  },

  // —— Antifungals & Antivirals ——————————————————————————————————————
  fluconazole: {
    id: "fluconazole",
    name: "Fluconazole",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 306,
    proteinBindingPct: 11,
    volumeDistributionLKg: 0.7,
    mechanism: "Low protein binding (11%), low MW, and modest Vd allow rapid filtration.",
    pearl: "50% cleared during a 3-hour hemodialysis session. Administer 100% of the recommended renal dose after each hemodialysis run on dialysis days.",
  },
  voriconazole: {
    id: "voriconazole",
    name: "Voriconazole",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 349,
    proteinBindingPct: 58,
    volumeDistributionLKg: 4.6,
    mechanism: "Massive volume of distribution (4.6 L/kg) and extensive tissue binding limit dialytic clearance.",
    pearl: "Voriconazole itself is minimally dialyzed. Note: IV formulation contains SBECD excipient which accumulates in renal failure; oral formulation is strongly preferred in ESRD.",
  },
  acyclovir: {
    id: "acyclovir",
    name: "Acyclovir",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~60%",
    molecularWeightDa: 225,
    proteinBindingPct: 15,
    volumeDistributionLKg: 0.7,
    mechanism: "Small hydrophilic molecule, low protein binding.",
    pearl: "Approximately 60% removed during a 6-hour hemodialysis run. Must administer dose post-HD. Failure to reduce interval between runs leads to neurotoxicity / hallucinations / encephalopathy.",
  },
  ganciclovir: {
    id: "ganciclovir",
    name: "Ganciclovir",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 255,
    proteinBindingPct: 1,
    volumeDistributionLKg: 0.7,
    mechanism: "Virtually zero protein binding (1%) and low MW enable high filter clearance.",
    pearl: "Dose immediately after hemodialysis session; 50% cleared per run.",
  },
  valganciclovir: {
    id: "valganciclovir",
    name: "Valganciclovir",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 354,
    proteinBindingPct: 1,
    volumeDistributionLKg: 0.7,
    mechanism: "Rapidly converted to ganciclovir, which has 50% dialytic clearance.",
    pearl: "Administer after hemodialysis on dialysis days.",
  },

  // —— Anticoagulants ————————————————————————————————————————————————
  dabigatran: {
    id: "dabigatran",
    name: "Dabigatran",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "50–60%",
    molecularWeightDa: 471,
    proteinBindingPct: 35,
    volumeDistributionLKg: 1.0,
    mechanism: "Low-to-moderate protein binding (35%) and small Vd allow substantial dialytic extraction.",
    pearl: "The only direct oral anticoagulant (DOAC) effectively cleared by hemodialysis (50–60% removed over 4 hours). In life-threatening overdose or bleeding when Praxbind (idarucizumab) is unavailable, emergency hemodialysis can clear drug.",
    caution: "Severe CKD (CrCl < 15) is a contraindication in FDA labeling due to severe bleeding risk.",
  },
  apixaban: {
    id: "apixaban",
    name: "Apixaban",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<7%",
    molecularWeightDa: 459,
    proteinBindingPct: 87,
    volumeDistributionLKg: 0.3,
    mechanism: "High protein binding (87%) restricts passage across dialyzer membranes.",
    pearl: "Apixaban is not dialyzable (<7% removed during 4-hour HD). Hemodialysis cannot be used for emergency reversal. Dosing in ESRD relies on specific label criteria (age ≥80 or weight ≤60 kg for 2.5 mg BID).",
  },
  rivaroxaban: {
    id: "rivaroxaban",
    name: "Rivaroxaban",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 436,
    proteinBindingPct: 92,
    volumeDistributionLKg: 0.7,
    mechanism: "Very high protein binding (92–95%) virtually eliminates dialytic extraction.",
    pearl: "Not cleared by hemodialysis. Hemodialysis is ineffective for overdose removal. 4-factor PCC or Andexxa is the reversal consideration.",
  },
  warfarin: {
    id: "warfarin",
    name: "Warfarin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<1%",
    molecularWeightDa: 308,
    proteinBindingPct: 99,
    volumeDistributionLKg: 0.15,
    mechanism: "Extreme protein binding (99% bound to serum albumin); virtually zero free fraction in dialyzer.",
    pearl: "Warfarin is not dialyzable. Standard daily dosing guided by INR without post-HD adjustment.",
  },
  enoxaparin: {
    id: "enoxaparin",
    name: "Enoxaparin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 4500,
    proteinBindingPct: 80,
    volumeDistributionLKg: 0.1,
    mechanism: "Large polyanionic macromolecule (MW ~4,500 Da) does not traverse dialyzer membranes.",
    pearl: "Not dialyzed. Low molecular weight heparins accumulate in severe renal failure; dose reduction or switch to unfractionated heparin is required.",
  },
  heparin: {
    id: "heparin",
    name: "Heparin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 15000,
    proteinBindingPct: 95,
    volumeDistributionLKg: 0.07,
    mechanism: "High molecular weight (15,000 Da) and massive negative charge prevent membrane transit.",
    pearl: "Unfractionated heparin is not cleared by dialysis. Frequently infused into the hemodialysis circuit to prevent extracorporeal dialyzer clotting.",
  },

  // —— Cardiovascular ————————————————————————————————————————————————
  lisinopril: {
    id: "lisinopril",
    name: "Lisinopril",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "35–50%",
    molecularWeightDa: 405,
    proteinBindingPct: 0,
    volumeDistributionLKg: 0.7,
    mechanism: "Zero protein binding and hydrophilic nature permit significant dialytic clearance.",
    pearl: "Administer after hemodialysis. Dosing immediately before hemodialysis risks severe intradialytic hypotension and loss of medication into the dialysate.",
  },
  enalapril: {
    id: "enalapril",
    name: "Enalapril",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "35–50%",
    molecularWeightDa: 376,
    proteinBindingPct: 50,
    volumeDistributionLKg: 0.7,
    mechanism: "Active metabolite enalaprilat is hydrophilic and dialyzed.",
    pearl: "Dose after hemodialysis on dialysis days.",
  },
  atenolol: {
    id: "atenolol",
    name: "Atenolol",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 266,
    proteinBindingPct: 10,
    volumeDistributionLKg: 0.7,
    mechanism: "Hydrophilic beta-blocker with minimal protein binding and small Vd.",
    pearl: "50% cleared by hemodialysis. Schedule dose post-HD. If given prior to HD, causes intradialytic hypotension and subsequent loss of efficacy.",
  },
  sotalol: {
    id: "sotalol",
    name: "Sotalol",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 272,
    proteinBindingPct: 0,
    volumeDistributionLKg: 1.2,
    mechanism: "Hydrophilic class III antiarrhythmic with 0% protein binding, cleared renally and by HD.",
    pearl: "Dialyzable; dose post-HD. Accumulation in renal impairment leads to QT prolongation and Torsades de Pointes.",
  },
  metoprolol: {
    id: "metoprolol",
    name: "Metoprolol",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 267,
    proteinBindingPct: 12,
    volumeDistributionLKg: 5.5,
    mechanism: "Lipophilic beta-blocker with large volume of distribution (5.5 L/kg); circulating fraction is negligible.",
    pearl: "Metoprolol is not significantly cleared by hemodialysis. Cleared primarily by hepatic CYP2D6 metabolism. No supplemental post-HD dose required.",
  },
  carvedilol: {
    id: "carvedilol",
    name: "Carvedilol",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<1%",
    molecularWeightDa: 406,
    proteinBindingPct: 98,
    volumeDistributionLKg: 2.0,
    mechanism: "Extreme protein binding (98%) and lipophilic tissue partitioning.",
    pearl: "Not dialyzable. Preferred beta-blocker in ESRD heart failure because it is neither dialyzed nor dependent on renal elimination.",
  },
  amlodipine: {
    id: "amlodipine",
    name: "Amlodipine",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<1%",
    molecularWeightDa: 409,
    proteinBindingPct: 98,
    volumeDistributionLKg: 21,
    mechanism: "Massive volume of distribution (21 L/kg) and 98% protein binding.",
    pearl: "Completely non-dialyzable. Circulating plasma holds less than 1% of total body drug. Standard daily dosing without post-HD adjustment.",
  },
  digoxin: {
    id: "digoxin",
    name: "Digoxin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<3%",
    molecularWeightDa: 781,
    proteinBindingPct: 25,
    volumeDistributionLKg: 7.0,
    mechanism: "Extensive tissue binding to skeletal and cardiac Na+/K+ ATPase (Vd 7 L/kg). Plasma contains a minute fraction of body stores.",
    pearl: "Not dialyzable (<3% cleared). Hemodialysis cannot treat digoxin toxicity; DigiFab (digoxin immune Fab) is the specific reversal antidote. Post-HD hypokalemia precipitously triggers arrhythmias.",
  },
  amiodarone: {
    id: "amiodarone",
    name: "Amiodarone",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<1%",
    molecularWeightDa: 645,
    proteinBindingPct: 96,
    volumeDistributionLKg: 66,
    mechanism: "Enormous lipophilic volume of distribution (66 L/kg) and 96% protein binding.",
    pearl: "Virtually zero dialytic clearance. Eliminated by hepatic metabolism and biliary excretion. No post-HD adjustment.",
  },
  hydralazine: {
    id: "hydralazine",
    name: "Hydralazine",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 160,
    proteinBindingPct: 87,
    volumeDistributionLKg: 1.5,
    mechanism: "Rapidly metabolized by polymorphic hepatic N-acetyltransferase; high protein binding.",
    pearl: "Not significantly dialyzed. Standard dosing without supplemental replacement.",
  },

  // —— Neurologic, Psychiatric, and Anticonvulsants ——————————————————
  lithium: {
    id: "lithium",
    name: "Lithium",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "50–60%",
    molecularWeightDa: 74,
    proteinBindingPct: 0,
    volumeDistributionLKg: 0.7,
    mechanism: "Tiny monovalent cation (74 Da), 0% protein binding, moderate Vd; rapid dialytic transit.",
    pearl: "Prototypic dialyzable toxin. Highly cleared during hemodialysis. Crucial pearl: intracellular lithium redistributes back into the vascular space 6–8 hours post-dialysis, causing significant serum level rebound. Serial levels and repeated or extended dialysis sessions are frequently needed.",
    caution: "Rebound hyperlithiemia occurs as intracellular stores equilibrate after dialysis ends.",
  },
  levetiracetam: {
    id: "levetiracetam",
    name: "Levetiracetam",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 170,
    proteinBindingPct: 0,
    volumeDistributionLKg: 0.6,
    mechanism: "Small, hydrophilic molecule with zero protein binding.",
    pearl: "Approximately 50% cleared during 4-hour hemodialysis. Administer a supplemental dose (typically ~250–500 mg) immediately following each hemodialysis session to maintain seizure prophylaxis.",
  },
  gabapentin: {
    id: "gabapentin",
    name: "Gabapentin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~35%",
    molecularWeightDa: 171,
    proteinBindingPct: 0,
    volumeDistributionLKg: 0.8,
    mechanism: "Zero protein binding, low MW, hydrophilic distribution.",
    pearl: "Cleared by hemodialysis (~35% per run). Administer post-dialysis. Severe accumulation in CKD causes profound sedation, myoclonus, ataxia, and respiratory depression.",
  },
  pregabalin: {
    id: "pregabalin",
    name: "Pregabalin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 159,
    proteinBindingPct: 0,
    volumeDistributionLKg: 0.5,
    mechanism: "Small molecule, 0% protein binding, low Vd.",
    pearl: "Approximately 50% removed by 4-hour hemodialysis. Administer supplemental dose post-HD.",
  },
  valproate: {
    id: "valproate",
    name: "Valproate",
    dialyzability: "partially-dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "10–20% (therapeutic) / 40% (toxic)",
    molecularWeightDa: 144,
    proteinBindingPct: 90,
    volumeDistributionLKg: 0.2,
    mechanism: "Protein binding is saturable (90% at therapeutic concentrations, but drops to 60–70% at toxic levels >150 µg/mL).",
    pearl: "Minimally dialyzed at normal therapeutic levels due to high protein binding. In acute severe overdose, saturated binding sites create a large free fraction that is readily extracted by high-flux hemodialysis.",
  },
  phenytoin: {
    id: "phenytoin",
    name: "Phenytoin",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<5%",
    molecularWeightDa: 252,
    proteinBindingPct: 90,
    volumeDistributionLKg: 0.6,
    mechanism: "High protein binding (~90%) prevents passage across the dialyzer membrane.",
    pearl: "Phenytoin is not dialyzed. Note: uremia displaces phenytoin from albumin, increasing the active free fraction despite normal total levels. Use Sheiner–Tozer correction or measure free levels directly.",
  },
  carbamazepine: {
    id: "carbamazepine",
    name: "Carbamazepine",
    dialyzability: "not-dialyzed",
    schedule: "standard",
    fractionRemovedPct: "<10%",
    molecularWeightDa: 236,
    proteinBindingPct: 75,
    volumeDistributionLKg: 1.4,
    mechanism: "Lipophilic agent with moderate-high protein binding and large tissue distribution.",
    pearl: "Poorly cleared by intermittent hemodialysis. Charcoal hemoperfusion or high-flux continuous renal replacement therapy is utilized for severe toxicity.",
  },
  baclofen: {
    id: "baclofen",
    name: "Baclofen",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 214,
    proteinBindingPct: 30,
    volumeDistributionLKg: 0.8,
    mechanism: "Low protein binding and modest Vd allow effective dialytic extraction.",
    pearl: "Hemodialysis removes ~50% of baclofen. In patients with CKD, standard doses rapidly cause baclofen neurotoxicity (coma, respiratory depression, flaccidity, myoclonus). Emergent hemodialysis rapidly resolves baclofen toxicity.",
  },

  // —— Toxic / Overdose / Other Clinical Entities ——————————————————
  metformin: {
    id: "metformin",
    name: "Metformin",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "30–50%",
    molecularWeightDa: 129,
    proteinBindingPct: 0,
    volumeDistributionLKg: 4.0,
    mechanism: "Small, hydrophilic biguanide with 0% protein binding.",
    pearl: "Effectively cleared by hemodialysis. Contraindicated in severe renal impairment (eGFR <30) due to fatal lactic acidosis (MALA). Hemodialysis is the cornerstone treatment for MALA, clearing both metformin and correcting severe acidemia.",
  },
  aspirin: {
    id: "aspirin",
    name: "Aspirin (Salicylate)",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 180,
    proteinBindingPct: 60,
    volumeDistributionLKg: 0.15,
    mechanism: "Small molecule, low extracellular Vd (0.15 L/kg); protein binding saturates at toxic concentrations.",
    pearl: "Salicylates are dialyzable. Hemodialysis is the definitive extracorporeal therapy for severe salicylate poisoning (altered mental status, pulmonary edema, renal failure, or level >90–100 mg/dL).",
  },
  theophylline: {
    id: "theophylline",
    name: "Theophylline",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 180,
    proteinBindingPct: 40,
    volumeDistributionLKg: 0.5,
    mechanism: "Low MW, modest protein binding, small volume of distribution.",
    pearl: "Rapidly cleared by hemodialysis. Used for refractory methylxanthine toxicity / life-threatening seizures / intractable tachyarrhythmias.",
  },
  methotrexate: {
    id: "methotrexate",
    name: "Methotrexate",
    dialyzability: "partially-dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "20–40% (high-flux)",
    molecularWeightDa: 454,
    proteinBindingPct: 50,
    volumeDistributionLKg: 0.6,
    mechanism: "Moderate protein binding; conventional low-flux dialysis is inefficient, but modern high-flux membranes clear drug.",
    pearl: "High-flux hemodialysis is utilized as rescue therapy in delayed methotrexate elimination when glucarpidase is unavailable.",
  },
  allopurinol: {
    id: "allopurinol",
    name: "Allopurinol",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 136,
    proteinBindingPct: 0,
    volumeDistributionLKg: 1.6,
    mechanism: "Active metabolite oxypurinol is hydrophilic with 0% protein binding.",
    pearl: "Oxypurinol is dialyzed. Dosed after hemodialysis to prevent accumulation and severe allopurinol hypersensitivity syndrome (DRESS).",
  },
  ethanol: {
    id: "ethanol",
    name: "Ethanol",
    dialyzability: "dialyzed",
    schedule: "post-hd",
    fractionRemovedPct: "~50%",
    molecularWeightDa: 46,
    proteinBindingPct: 0,
    volumeDistributionLKg: 0.6,
    mechanism: "Minute molecular weight (46 Da), 0% protein binding, total body water distribution.",
    pearl: "Freely dialyzable. When ethanol is used as an antidote for toxic alcohol ingestion, ethanol infusion rates must be doubled during hemodialysis to maintain therapeutic ADH inhibition.",
  },
};

export interface DialysisReport {
  rows: DialysisEntry[];
  dialyzedCount: number;
  partiallyDialyzedCount: number;
  notDialyzedCount: number;
  postHdCount: number;
  summary: string;
  principles: string;
}

/** Check whether any drug on the desk carries hemodialysis removal data. */
export function dialysisWanted(ids: string[]): boolean {
  return ids.some((id) => Boolean(DIALYSIS_CATALOG[id]));
}

/** Compute hemodialysis removability report for tray drugs. */
export function dialysisOnDesk(ids: string[]): DialysisReport | null {
  const seen = new Set<string>();
  const hits: DialysisEntry[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = DIALYSIS_CATALOG[id];
    if (entry) {
      hits.push(entry);
    }
  }

  if (hits.length === 0) return null;

  // Sort dialyzed first, then partially dialyzed, then not dialyzed; then alphabetically
  const dialRank: Record<Dialyzability, number> = {
    dialyzed: 0,
    "partially-dialyzed": 1,
    "not-dialyzed": 2,
  };

  hits.sort((a, b) => dialRank[a.dialyzability] - dialRank[b.dialyzability] || a.name.localeCompare(b.name));

  const dialyzedCount = hits.filter((h) => h.dialyzability === "dialyzed").length;
  const partiallyDialyzedCount = hits.filter((h) => h.dialyzability === "partially-dialyzed").length;
  const notDialyzedCount = hits.filter((h) => h.dialyzability === "not-dialyzed").length;
  const postHdCount = hits.filter((h) => h.schedule === "post-hd").length;

  const summary = `${hits.length} drug${hits.length > 1 ? "s" : ""} on tray mapped for hemodialysis clearance: ${dialyzedCount} dialyzed, ${partiallyDialyzedCount} partially dialyzed, ${notDialyzedCount} non-dialyzed. ${postHdCount} recommend post-HD administration.`;

  const principles =
    "Hemodialysis drug clearance depends on free unbound fraction (protein binding <80%), molecular weight (<500 Da for standard filters), volume of distribution (<1–2 L/kg), and dialyzer membrane flux. Highly dialyzed drugs risk clinical failure if not administered after hemodialysis.";

  return {
    rows: hits,
    dialyzedCount,
    partiallyDialyzedCount,
    notDialyzedCount,
    postHdCount,
    summary,
    principles,
  };
}

