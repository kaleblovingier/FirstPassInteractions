import type { Drug, Enzyme, EnzymeRole, ItemKind, PdFlag, Strength, SubstrateSensitivity } from "./types";
import { CLINIC_BEERS, CLINIC_PREG_AVOID } from "./clinic";
import { CLINIC_FORMULARY } from "./catalog-clinic";
import { MODERN_FORMULARY } from "./catalog-modern";
import { hasDrugbank } from "./drugbank";
import { hasPgx } from "./pgx";
import { hasCite } from "./pubmed";
import { hasStahl } from "./stahl";
import { hasTdm } from "./tdm";
import { MME_FACTOR } from "./mme";

function sub(
  enzyme: Enzyme,
  sensitivity: SubstrateSensitivity,
  pathway: "clearance" | "activation" = "clearance",
  nti = false,
): EnzymeRole {
  return { enzyme, kind: "substrate", sensitivity, pathway, nti };
}

function inh(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inhibitor", strength };
}

function ind(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inducer", strength };
}

function d(
  id: string,
  name: string,
  brands: string[],
  cls: string,
  enzymes: EnzymeRole[],
  pd: PdFlag[],
  toxicityHint: string,
  extra?: { aliases?: string[]; note?: string; kind?: ItemKind },
): Drug {
  return {
    id,
    name,
    brands,
    cls,
    aliases: extra?.aliases ?? [],
    enzymes,
    pd,
    toxicityHint,
    note: extra?.note,
    kind: extra?.kind ?? "drug",
  };
}

const raw: Drug[] = [
  // —— Macrolides / azoles / antivirals ————————————————
  d("clarithromycin", "Clarithromycin", ["Biaxin"], "Macrolide antibiotic",
    [sub("CYP3A4", "major"), inh("CYP3A4", "strong"), inh("P-gp", "moderate")],
    ["qt-possible"], "QT prolongation, CYP3A4 perpetrator toxicity"),
  d("erythromycin", "Erythromycin", ["Ery-Tab"], "Macrolide antibiotic",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate"), inh("P-gp", "moderate")],
    ["qt-possible"], "QT prolongation"),
  d("azithromycin", "Azithromycin", ["Zithromax", "Z-Pak"], "Macrolide antibiotic",
    [], ["qt-possible"], "QT prolongation",
    { note: "Minimal CYP3A4 inhibition unlike other macrolides. Next to methadone it still stacks QT — not a free Z-Pak." }),
  d("ciprofloxacin", "Ciprofloxacin", ["Cipro"], "Fluoroquinolone",
    [inh("CYP1A2", "strong"), inh("CYP3A4", "weak")],
    ["qt-possible", "seizure-lowering"], "QT, CNS stimulation, 1A2 victim toxicity",
    { note: "Strong 1A2 inhibitor (tizanidine is the labeled victim). Weak 3A4 plus QT. Herrlin 2000: Cipro next to methadone caused sedation and respiratory depression — not a free UTI pill on the OTP." }),
  d("levofloxacin", "Levofloxacin", ["Levaquin"], "Fluoroquinolone",
    [], ["qt-possible", "seizure-lowering"], "QT prolongation"),
  d("moxifloxacin", "Moxifloxacin", ["Avelox"], "Fluoroquinolone",
    [], ["qt-known"], "QT prolongation"),
  d("metronidazole", "Metronidazole", ["Flagyl"], "Nitroimidazole",
    [inh("CYP2C9", "weak")], ["seizure-lowering"], "Disulfiram-like reaction, neuropathy",
    { note: "2C9 inhibition is modest and debated; still flagged with warfarin." }),
  d("fluconazole", "Fluconazole", ["Diflucan"], "Azole antifungal",
    [sub("CYP3A4", "minor"), inh("CYP2C9", "strong"), inh("CYP2C19", "strong"), inh("CYP3A4", "moderate")],
    ["qt-possible"], "QT, elevated victim-drug levels"),
  d("ketoconazole", "Ketoconazole", ["Nizoral"], "Azole antifungal",
    [inh("CYP3A4", "strong"), inh("P-gp", "strong"), inh("CYP2C19", "moderate")],
    ["qt-possible", "hepatotoxic"], "Hepatotoxicity, endocrine effects, victim-drug toxicity"),
  d("itraconazole", "Itraconazole", ["Sporanox"], "Azole antifungal",
    [sub("CYP3A4", "major"), inh("CYP3A4", "strong"), inh("P-gp", "strong")],
    ["hepatotoxic"], "Heart failure exacerbation, victim-drug toxicity"),
  d("voriconazole", "Voriconazole", ["Vfend"], "Azole antifungal",
    [sub("CYP2C19", "major"), sub("CYP3A4", "major"), inh("CYP3A4", "strong"), inh("CYP2C9", "moderate"), inh("CYP2C19", "moderate")],
    ["qt-possible", "hepatotoxic"], "Visual disturbance, hepatotoxicity, victim-drug toxicity"),
  d("rifampin", "Rifampin", ["Rifadin"], "Rifamycin",
    [ind("CYP3A4", "strong"), ind("CYP2C9", "strong"), ind("CYP2C19", "strong"), ind("CYP2B6", "strong"), ind("CYP1A2", "moderate"), ind("CYP2C8", "moderate"), ind("P-gp", "strong")],
    ["hepatotoxic"], "Loss of victim-drug efficacy, hepatotoxicity",
    { aliases: ["rifampicin"] }),
  d("linezolid", "Linezolid", ["Zyvox"], "Oxazolidinone",
    [], ["serotonergic", "maoi"], "Serotonin syndrome, myelosuppression",
    { note: "Reversible nonselective MAO inhibition." }),
  d("tmp-smx", "Trimethoprim–sulfamethoxazole", ["Bactrim", "Septra"], "Sulfonamide antibiotic",
    [inh("CYP2C9", "moderate"), inh("CYP2C8", "moderate")],
    ["k-sparing", "nephrotoxic"], "Hyperkalemia, marrow suppression, INR rise",
    { aliases: ["bactrim", "cotrimoxazole", "sulfamethoxazole"] }),
  d("isoniazid", "Isoniazid", ["Nydrazid"], "Antimycobacterial",
    [inh("CYP2C19", "moderate"), inh("CYP3A4", "weak"), inh("CYP2D6", "weak"), inh("CYP2E1", "weak")],
    ["hepatotoxic", "seizure-lowering"], "Hepatitis, neuropathy",
    {
      aliases: ["inh"],
      note: "Latent TB is common on OTP boards. Weak 3A4 inhibition can nudge methadone; the louder stories are INH hepatitis next to alcohol, rifampin dumping methadone, and tuna/mackerel (diamine oxidase) — search histamine fish.",
    }),
  d("ritonavir", "Ritonavir", ["Norvir"], "HIV protease inhibitor / booster",
    [sub("CYP3A4", "major"), inh("CYP3A4", "strong"), inh("CYP2D6", "moderate"), inh("P-gp", "strong"), ind("CYP2B6", "moderate"), ind("CYP1A2", "moderate"), ind("CYP2C9", "weak")],
    [], "Victim-drug toxicity via 3A4/P-gp; methadone may fall",
    {
      aliases: ["norvir"],
      note: "Strong 3A4/P-gp inhibition raises fentanyl (Olkkola: clearance −67%). Steady-state ritonavir dumps methadone anyway (Kharasch) — watch OTP withdrawal, not nod. Paxlovid is the five-day version of this booster.",
    }),
  d("paxlovid", "Paxlovid (nirmatrelvir/ritonavir)", ["Paxlovid"], "COVID-19 antiviral (ritonavir-boosted)",
    [inh("CYP3A4", "strong"), inh("P-gp", "strong"), ind("CYP2B6", "moderate")],
    [],
    "Fentanyl/oxycodone airway; methadone withdrawal",
    {
      aliases: ["nirmatrelvir", "nirmatrelvir/ritonavir", "paxlovid"],
      note: "Five-day ritonavir boost. Fentanyl, oxycodone, and hydrocodone rise — airway. Methadone often falls (2B6/UGT) — watch withdrawal at the window, not sedation. Not a dosing protocol. Search ritonavir for the chronic HIV booster.",
    }),
  d("nevirapine", "Nevirapine", ["Viramune"], "NNRTI antiretroviral",
    [sub("CYP3A4", "major"), ind("CYP3A4", "moderate"), ind("CYP2B6", "moderate")],
    ["hepatotoxic"],
    "Methadone withdrawal; hepatotoxicity",
    {
      aliases: ["viramune"],
      note: "Classic OTP stolen-dose NNRTI, like efavirenz. 3A4/2B6 induction. Watch withdrawal 1–2 weeks in; hepatotoxicity is a separate row.",
    }),
  d("cobicistat", "Cobicistat", ["Tybost"], "PK booster",
    [inh("CYP3A4", "strong"), inh("CYP2D6", "weak"), inh("P-gp", "strong")],
    [], "Victim-drug toxicity via 3A4",
    {
      aliases: ["tybost", "pk booster"],
      note: "The modern ritonavir-like booster in Genvoya, Prezcobix, Evotaz. Strong 3A4/P-gp inhibition raises buprenorphine and many 3A4 victims. Unlike ritonavir it does not induce 2B6 — methadone parent climbs, it does not fall. Tybost is not Norvir on an OTP board.",
    }),

  // —— Cardiovascular ———————————————————————————————
  d("warfarin", "Warfarin", ["Coumadin", "Jantoven"], "Vitamin K antagonist",
    [sub("CYP2C9", "sensitive", "clearance", true), sub("CYP3A4", "minor"), sub("CYP1A2", "minor")],
    ["anticoagulant"], "Bleeding / high INR",
    { note: "S-warfarin (more potent) is a sensitive CYP2C9 substrate; R-warfarin uses 1A2/3A4." }),
  d("apixaban", "Apixaban", ["Eliquis"], "Direct oral anticoagulant",
    [sub("CYP3A4", "major"), sub("P-gp", "major")],
    ["anticoagulant"], "Bleeding or loss of anticoagulation"),
  d("rivaroxaban", "Rivaroxaban", ["Xarelto"], "Direct oral anticoagulant",
    [sub("CYP3A4", "major"), sub("P-gp", "major")],
    ["anticoagulant"], "Bleeding or loss of anticoagulation"),
  d("dabigatran", "Dabigatran", ["Pradaxa"], "Direct thrombin inhibitor",
    [sub("P-gp", "sensitive")],
    ["anticoagulant"], "Bleeding or loss of anticoagulation"),
  d("clopidogrel", "Clopidogrel", ["Plavix"], "P2Y12 inhibitor",
    [sub("CYP2C19", "sensitive", "activation"), sub("CYP3A4", "minor", "activation"), inh("CYP2C8", "moderate")],
    ["antiplatelet"], "Loss of antiplatelet effect or bleeding",
    { note: "Prodrug. Bioactivation is CYP2C19-dependent; omeprazole/esomeprazole blunt it." }),
  d("aspirin", "Aspirin", ["Bayer", "Ecotrin"], "Antiplatelet / NSAID",
    [], ["antiplatelet", "nsaid", "nephrotoxic"], "Bleeding, GI ulcer, renal injury"),
  d("atorvastatin", "Atorvastatin", ["Lipitor"], "Statin",
    [sub("CYP3A4", "major")],
    ["statin", "hepatotoxic"], "Myopathy / rhabdomyolysis"),
  d("simvastatin", "Simvastatin", ["Zocor"], "Statin",
    [sub("CYP3A4", "sensitive")],
    ["statin", "hepatotoxic"], "Myopathy / rhabdomyolysis",
    { note: "Sensitive 3A4 substrate. Strong 3A4 inhibitors are contraindicated." }),
  d("lovastatin", "Lovastatin", ["Mevacor"], "Statin",
    [sub("CYP3A4", "sensitive")],
    ["statin", "hepatotoxic"], "Myopathy / rhabdomyolysis"),
  d("rosuvastatin", "Rosuvastatin", ["Crestor"], "Statin",
    [sub("CYP2C9", "minor")],
    ["statin", "hepatotoxic"], "Myopathy / rhabdomyolysis",
    { note: "Limited CYP clearance; OATP1B1 interactions dominate." }),
  d("pravastatin", "Pravastatin", ["Pravachol"], "Statin",
    [],
    ["statin"], "Myopathy",
    { note: "Not a CYP3A4 substrate — often the switch when 3A4 is blocked." }),
  d("gemfibrozil", "Gemfibrozil", ["Lopid"], "Fibrate",
    [inh("CYP2C8", "strong"), inh("CYP2C9", "moderate")],
    ["fibrate"], "Myopathy with statins, hypoglycemia with repaglinide"),
  d("amlodipine", "Amlodipine", ["Norvasc"], "Dihydropyridine CCB",
    [sub("CYP3A4", "major")],
    [], "Hypotension, edema"),
  d("diltiazem", "Diltiazem", ["Cardizem", "Tiazac"], "Non-DHP CCB",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate"), inh("P-gp", "moderate")],
    ["ndhp-ccb", "bradycardic"], "Bradycardia, AV block, hypotension"),
  d("verapamil", "Verapamil", ["Calan", "Isoptin"], "Non-DHP CCB",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate"), inh("P-gp", "strong")],
    ["ndhp-ccb", "bradycardic"], "Bradycardia, AV block, hypotension"),
  d("metoprolol", "Metoprolol", ["Lopressor", "Toprol-XL"], "Beta blocker",
    [sub("CYP2D6", "major")],
    ["beta-blocker", "bradycardic"], "Bradycardia, heart block, hypotension"),
  d("carvedilol", "Carvedilol", ["Coreg"], "Beta / alpha blocker",
    [sub("CYP2D6", "major"), sub("CYP2C9", "minor")],
    ["beta-blocker", "alpha-blocker", "bradycardic"], "Bradycardia, hypotension"),
  d("propranolol", "Propranolol", ["Inderal"], "Beta blocker",
    [sub("CYP2D6", "major"), sub("CYP1A2", "major")],
    ["beta-blocker", "bradycardic"], "Bradycardia, bronchospasm"),
  d("amiodarone", "Amiodarone", ["Pacerone", "Cordarone"], "Class III antiarrhythmic",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate"), inh("CYP2C9", "moderate"), inh("CYP2D6", "weak"), inh("CYP1A2", "moderate"), inh("P-gp", "moderate")],
    ["qt-known", "bradycardic", "hepatotoxic"], "TdP, bradycardia, thyroid/liver/lung toxicity",
    { note: "Inhibition accumulates over weeks; interactions persist after stopping." }),
  d("sotalol", "Sotalol", ["Betapace"], "Class III antiarrhythmic",
    [], ["qt-known", "beta-blocker", "bradycardic"], "TdP, bradycardia"),
  d("digoxin", "Digoxin", ["Lanoxin"], "Cardiac glycoside",
    [sub("P-gp", "sensitive", "clearance", true)],
    ["bradycardic"], "Digoxin toxicity (nausea, arrhythmia, visual change)",
    { note: "Narrow index. P-gp inhibitors (amiodarone, verapamil, clarithromycin) raise levels." }),
  d("lisinopril", "Lisinopril", ["Prinivil", "Zestril"], "ACE inhibitor",
    [], ["acei-arb", "nephrotoxic"], "Hyperkalemia, acute kidney injury, angioedema"),
  d("losartan", "Losartan", ["Cozaar"], "ARB",
    [sub("CYP2C9", "major", "activation"), sub("CYP3A4", "minor")],
    ["acei-arb", "nephrotoxic"], "Hyperkalemia, acute kidney injury"),
  d("spironolactone", "Spironolactone", ["Aldactone"], "Mineralocorticoid antagonist",
    [], ["k-sparing"], "Hyperkalemia, gynecomastia"),
  d("furosemide", "Furosemide", ["Lasix"], "Loop diuretic",
    [], ["loop-thiazide", "nephrotoxic"], "Volume depletion, AKI, electrolyte loss"),
  d("hctz", "Hydrochlorothiazide", ["Microzide"], "Thiazide diuretic",
    [], ["loop-thiazide"], "Hyponatremia, hypokalemia, gout",
    { aliases: ["hydrochlorothiazide"] }),
  d("tamsulosin", "Tamsulosin", ["Flomax"], "Alpha-1 blocker",
    [sub("CYP3A4", "major"), sub("CYP2D6", "major")],
    ["alpha-blocker"], "Orthostatic hypotension"),

  // —— Psychiatry ——————————————————————————————————
  d("sertraline", "Sertraline", ["Zoloft"], "SSRI",
    [sub("CYP2C19", "major"), sub("CYP3A4", "minor"), inh("CYP2D6", "weak")],
    ["serotonergic", "ssri-snri"], "Serotonin syndrome, bleeding, hyponatremia"),
  d("fluoxetine", "Fluoxetine", ["Prozac"], "SSRI",
    [sub("CYP2D6", "major"), inh("CYP2D6", "strong"), inh("CYP2C19", "moderate"), inh("CYP3A4", "weak")],
    ["serotonergic", "ssri-snri", "seizure-lowering"], "Serotonin syndrome, bleeding; long-lived inhibition",
    { note: "Norfluoxetine prolongs 2D6 inhibition for weeks after stopping." }),
  d("paroxetine", "Paroxetine", ["Paxil"], "SSRI",
    [sub("CYP2D6", "major"), inh("CYP2D6", "strong")],
    ["serotonergic", "ssri-snri", "anticholinergic"], "Serotonin syndrome, discontinuation syndrome"),
  d("fluvoxamine", "Fluvoxamine", ["Luvox"], "SSRI",
    [sub("CYP2D6", "minor"), inh("CYP1A2", "strong"), inh("CYP2C19", "strong"), inh("CYP3A4", "moderate"), inh("CYP2B6", "moderate")],
    ["serotonergic", "ssri-snri"], "Serotonin syndrome; marked 1A2/2C19 perpetrator",
    {
      note: "The OTP Luvox bump: 1A2/2C19/3A4/2B6 inhibition raises methadone. Stopping it looks like a stolen dose. Not the same map as fluoxetine.",
    }),
  d("citalopram", "Citalopram", ["Celexa"], "SSRI",
    [sub("CYP2C19", "major"), sub("CYP3A4", "major"), sub("CYP2D6", "minor")],
    ["serotonergic", "ssri-snri", "qt-known"], "QT prolongation, serotonin syndrome"),
  d("escitalopram", "Escitalopram", ["Lexapro"], "SSRI",
    [sub("CYP2C19", "major"), sub("CYP3A4", "major")],
    ["serotonergic", "ssri-snri", "qt-possible"], "QT prolongation, serotonin syndrome"),
  d("venlafaxine", "Venlafaxine", ["Effexor"], "SNRI",
    [sub("CYP2D6", "major"), sub("CYP3A4", "minor")],
    ["serotonergic", "ssri-snri"], "Serotonin syndrome, hypertension"),
  d("duloxetine", "Duloxetine", ["Cymbalta"], "SNRI",
    [sub("CYP1A2", "major"), sub("CYP2D6", "major"), inh("CYP2D6", "moderate")],
    ["serotonergic", "ssri-snri", "hepatotoxic"], "Serotonin syndrome, hepatotoxicity"),
  d("bupropion", "Bupropion", ["Wellbutrin", "Zyban"], "NDRI antidepressant",
    [sub("CYP2B6", "major"), inh("CYP2D6", "strong")],
    ["seizure-lowering"], "Seizures, 2D6 victim-drug toxicity"),
  d("mirtazapine", "Mirtazapine", ["Remeron"], "NaSSA antidepressant",
    [sub("CYP3A4", "major"), sub("CYP2D6", "minor"), sub("CYP1A2", "minor")],
    ["serotonergic", "cns-depressant"], "Sedation, serotonin syndrome (lower risk)"),
  d("trazodone", "Trazodone", ["Desyrel"], "SARI antidepressant",
    [sub("CYP3A4", "major")],
    ["serotonergic", "cns-depressant", "qt-possible"], "Sedation, priapism, serotonin syndrome"),
  d("amitriptyline", "Amitriptyline", ["Elavil"], "Tricyclic antidepressant",
    [sub("CYP2D6", "major"), sub("CYP2C19", "major"), sub("CYP3A4", "minor")],
    ["serotonergic", "cns-depressant", "anticholinergic", "qt-possible", "seizure-lowering"],
    "Anticholinergic toxicity, arrhythmia, seizures"),
  d("nortriptyline", "Nortriptyline", ["Pamelor"], "Tricyclic antidepressant",
    [sub("CYP2D6", "sensitive", "clearance", true)],
    ["serotonergic", "cns-depressant", "anticholinergic", "qt-possible"],
    "TCA toxicity, arrhythmia"),
  d("lithium", "Lithium", ["Lithobid"], "Mood stabilizer",
    [], ["serotonergic", "seizure-lowering", "nephrotoxic"], "Lithium toxicity (narrow index)",
    { note: "Renally cleared, not CYP. NSAIDs, ACE inhibitors, and thiazides raise levels." }),
  d("quetiapine", "Quetiapine", ["Seroquel"], "Atypical antipsychotic",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant", "qt-possible", "anticholinergic"], "Sedation, QT, hypotension"),
  d("olanzapine", "Olanzapine", ["Zyprexa"], "Atypical antipsychotic",
    [sub("CYP1A2", "major")],
    ["cns-depressant", "anticholinergic"], "Sedation, metabolic syndrome",
    { note: "Smoking induces 1A2 and can drop levels; cessation raises them." }),
  d("risperidone", "Risperidone", ["Risperdal"], "Atypical antipsychotic",
    [sub("CYP2D6", "major"), sub("CYP3A4", "minor")],
    ["cns-depressant", "qt-possible"], "EPS, hyperprolactinemia, QT"),
  d("aripiprazole", "Aripiprazole", ["Abilify"], "Atypical antipsychotic",
    [sub("CYP2D6", "major"), sub("CYP3A4", "major")],
    [], "Akathisia, impulse-control effects"),
  d("clozapine", "Clozapine", ["Clozaril"], "Atypical antipsychotic",
    [sub("CYP1A2", "sensitive", "clearance", true), sub("CYP3A4", "minor"), sub("CYP2C19", "minor")],
    ["cns-depressant", "anticholinergic", "seizure-lowering", "qt-possible"],
    "Agranulocytosis, seizures, myocarditis, constipation",
    { note: "Sensitive 1A2 substrate. Fluvoxamine and ciprofloxacin can spike levels." }),
  d("haloperidol", "Haloperidol", ["Haldol"], "Typical antipsychotic",
    [sub("CYP3A4", "major"), sub("CYP2D6", "major"), inh("CYP2D6", "moderate")],
    ["cns-depressant", "qt-known", "seizure-lowering"], "EPS, TdP, NMS"),
  d("ziprasidone", "Ziprasidone", ["Geodon"], "Atypical antipsychotic",
    [sub("CYP3A4", "minor")],
    ["cns-depressant", "qt-known", "fed-boost"], "TdP; F collapses without a ~500 kcal meal",
    {
      note: "Labeled with food — about 500 kcal or AUC falls by half. High-fat meal on this desk is the perpetrator. QT is the other row. 3A4 is quiet compared with quetiapine.",
    }),
  d("alprazolam", "Alprazolam", ["Xanax"], "Benzodiazepine",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant", "benzo-zdrug"], "Sedation, respiratory depression, falls"),
  d("diazepam", "Diazepam", ["Valium"], "Benzodiazepine",
    [sub("CYP3A4", "major"), sub("CYP2C19", "major")],
    ["cns-depressant", "benzo-zdrug"], "Sedation, prolonged accumulation"),
  d("clonazepam", "Clonazepam", ["Klonopin"], "Benzodiazepine",
    [sub("CYP3A4", "major")],
    ["cns-depressant", "benzo-zdrug"], "Sedation, respiratory depression"),
  d("lorazepam", "Lorazepam", ["Ativan"], "Benzodiazepine",
    [],
    ["cns-depressant", "benzo-zdrug"], "Sedation, respiratory depression",
    { note: "UGT-glucuronidated, not a CYP substrate — often preferred when CYPs are blocked." }),
  d("midazolam", "Midazolam", ["Versed"], "Benzodiazepine",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant", "benzo-zdrug"], "Profound sedation, respiratory depression"),
  d("zolpidem", "Zolpidem", ["Ambien"], "Z-hypnotic",
    [sub("CYP3A4", "major")],
    ["cns-depressant", "benzo-zdrug"], "Complex sleep behavior, falls"),
  d("buspirone", "Buspirone", ["BuSpar"], "Anxiolytic",
    [sub("CYP3A4", "sensitive")],
    ["serotonergic"], "Serotonin syndrome (with other serotonergics), dizziness"),
  d("phenelzine", "Phenelzine", ["Nardil"], "Irreversible MAOI",
    [inh("CYP2C19", "moderate")],
    ["maoi", "serotonergic"], "Hypertensive crisis, serotonin syndrome",
    { note: "Irreversible MAO-A/B inhibitor. Serotonergic drugs and tyramine are contraindicated." }),
  d("selegiline", "Selegiline", ["Emsam", "Eldepryl"], "MAO-B inhibitor",
    [sub("CYP2B6", "major"), sub("CYP2C19", "minor")],
    ["maoi", "serotonergic"], "Serotonin syndrome, hypertensive crisis at higher doses"),
  d("levodopa", "Levodopa / carbidopa", ["Sinemet", "Rytary", "Duopa"], "Dopamine precursor (Parkinson)",
    [],
    [],
    "Lost 'on' time with a protein meal; iron binds it in the gut",
    {
      aliases: ["sinemet", "carbidopa", "l-dopa", "l dopa", "madopar", "stalevo"],
      note: "Large-neutral amino acids compete at LAT1 in gut and brain. A steak next to the morning dose is a motor fluctuation, not CYP. Iron chelates it. Mucuna on this shelf is the same precursor in a bean.",
    }),

  // —— Pain / neuro —————————————————————————————————
  d("codeine", "Codeine", [], "Opioid analgesic (prodrug)",
    [sub("CYP2D6", "sensitive", "activation"), sub("CYP3A4", "minor")],
    ["opioid", "cns-depressant"], "Loss of analgesia or morphine toxicity (UM phenotype)",
    { note: "Prodrug. CYP2D6 O-demethylation produces morphine; inhibitors blunt analgesia." }),
  d("tramadol", "Tramadol", ["Ultram"], "Opioid / SNRI analgesic",
    [sub("CYP2D6", "major", "activation"), sub("CYP3A4", "major")],
    ["opioid", "cns-depressant", "serotonergic", "seizure-lowering"],
    "Seizures, serotonin syndrome, respiratory depression"),
  d("oxycodone", "Oxycodone", ["OxyContin", "Percocet", "Roxicodone", "Endocet"], "Opioid analgesic",
    [sub("CYP3A4", "major"), sub("CYP2D6", "minor")],
    ["opioid", "cns-depressant"], "Respiratory depression, sedation",
    {
      aliases: ["percs", "perc", "perc 30", "roxi", "oxy"],
      note: "Percocet is oxycodone plus acetaminophen — put APAP on the desk for the 2E1/alcohol story. Street 'perc 30s' stamped M30 are often pressed fentanyl, not this row. Search dirty 30.",
    }),
  d("hydrocodone", "Hydrocodone", ["Norco", "Vicodin"], "Opioid analgesic",
    [sub("CYP3A4", "major"), sub("CYP2D6", "minor", "activation")],
    ["opioid", "cns-depressant"], "Respiratory depression, sedation"),
  d("morphine", "Morphine", ["MS Contin"], "Opioid analgesic",
    [sub("P-gp", "minor")],
    ["opioid", "cns-depressant"], "Respiratory depression, sedation",
    { note: "UGT2B7, not CYP. PD synergies still apply." }),
  d("fentanyl", "Fentanyl", ["Duragesic", "Sublimaze"], "Opioid analgesic",
    [sub("CYP3A4", "sensitive")],
    ["opioid", "cns-depressant", "serotonergic"], "Respiratory depression",
    {
      aliases: ["duragesic", "actiq", "sublimaze", "china white"],
      note: "Norfentanyl via 3A4. Paxlovid, ritonavir, azoles, and macrolides raise parent and the airway risk — the opposite of methadone, which can fall. A methadone take-home plus illicit fentanyl is stacked μ, not two prescriptions. Street tablets stamped M30 are this row ± xylazine; search dirty 30.",
    }),
  d("methadone", "Methadone", ["Dolophine", "Methadose"], "Opioid agonist",
    [sub("CYP3A4", "major"), sub("CYP2B6", "major"), sub("CYP2C19", "minor"), sub("CYP1A2", "minor")],
    ["opioid", "cns-depressant", "qt-known", "serotonergic"], "TdP, respiratory depression",
    {
      aliases: ["methadose", "diskets"],
      note: "Long t½ — q24h accumulates. 3A4/2B6 inducers (rifampin, carbamazepine, phenytoin, efavirenz, nevirapine, St. John's wort) look like a stolen dose. Inhibitors (fluconazole, fluvoxamine, erythromycin) and other QT drugs raise TdP. Paxlovid/ritonavir is the mixed arrow: methadone often falls, fentanyl rises. Boxed with benzos and gabapentinoids. Take-home plus illicit fentanyl is stacked μ.",
    }),
  d("gabapentin", "Gabapentin", ["Neurontin"], "Gabapentinoid",
    [], ["cns-depressant"], "Sedation, respiratory depression with opioids"),
  d("pregabalin", "Pregabalin", ["Lyrica"], "Gabapentinoid",
    [], ["cns-depressant"], "Sedation, respiratory depression with opioids"),
  d("carbamazepine", "Carbamazepine", ["Tegretol"], "Anticonvulsant",
    [sub("CYP3A4", "major"), ind("CYP3A4", "strong"), ind("CYP2B6", "moderate"), ind("CYP2C9", "moderate"), ind("CYP2C19", "moderate"), ind("CYP1A2", "moderate"), ind("P-gp", "moderate")],
    ["cns-depressant", "anticholinergic", "seizure-lowering"], "Loss of victim-drug efficacy, hyponatremia, SJS",
    { note: "Autoinducer. Strong 3A4 (and 2B6) induction — looks like a stolen methadone take-home in 7–10 days, same family as phenytoin and rifampin." }),
  d("phenytoin", "Phenytoin", ["Dilantin"], "Anticonvulsant",
    [sub("CYP2C9", "sensitive", "clearance", true), sub("CYP2C19", "major"), ind("CYP3A4", "strong"), ind("CYP2B6", "moderate"), ind("CYP2C19", "moderate"), ind("P-gp", "moderate")],
    ["cns-depressant", "hepatotoxic"], "Phenytoin toxicity or loss of co-drug efficacy",
    { note: "Narrow index, nonlinear kinetics. Strong 3A4 (and 2B6) induction — Tong 1981: phenytoin looks like a stolen methadone take-home within days." }),
  d("valproate", "Valproate", ["Depakote", "Depakene"], "Anticonvulsant",
    [inh("CYP2C9", "weak")],
    ["cns-depressant", "hepatotoxic", "seizure-lowering"], "Hyperammonemia, hepatotoxicity, teratogenicity",
    { aliases: ["valproic acid", "divalproex"] }),
  d("lamotrigine", "Lamotrigine", ["Lamictal"], "Anticonvulsant",
    [], ["cns-depressant"], "SJS/TEN (with valproate), dizziness",
    { note: "UGT1A4, not CYP. Valproate doubles levels; inducers drop them." }),
  d("levetiracetam", "Levetiracetam", ["Keppra"], "Anticonvulsant",
    [], ["cns-depressant"], "Mood change, sedation",
    { note: "Renally cleared. Almost no CYP interactions." }),
  d("tizanidine", "Tizanidine", ["Zanaflex"], "Central muscle relaxant",
    [sub("CYP1A2", "sensitive", "clearance", true)],
    ["cns-depressant", "bradycardic"], "Profound hypotension, bradycardia, sedation",
    { note: "Sensitive 1A2 substrate. Ciprofloxacin and fluvoxamine are contraindicated." }),
  d("cyclobenzaprine", "Cyclobenzaprine", ["Flexeril"], "Muscle relaxant",
    [sub("CYP3A4", "major"), sub("CYP1A2", "major"), sub("CYP2D6", "minor")],
    ["cns-depressant", "anticholinergic", "serotonergic"], "Sedation, serotonin syndrome"),
  d("donepezil", "Donepezil", ["Aricept"], "AChE inhibitor",
    [sub("CYP2D6", "major"), sub("CYP3A4", "major")],
    ["bradycardic"], "Bradycardia, syncope, GI upset"),

  // —— GI / endocrine / immuno / other ———————————————
  d("omeprazole", "Omeprazole", ["Prilosec"], "PPI",
    [sub("CYP2C19", "major"), inh("CYP2C19", "moderate"), inh("CYP3A4", "weak")],
    [], "Reduced clopidogrel activation, B12/Mg loss"),
  d("esomeprazole", "Esomeprazole", ["Nexium"], "PPI",
    [sub("CYP2C19", "major"), inh("CYP2C19", "moderate")],
    [], "Reduced clopidogrel activation"),
  d("pantoprazole", "Pantoprazole", ["Protonix"], "PPI",
    [sub("CYP2C19", "minor")],
    [], "Hypomagnesemia",
    { note: "Weaker 2C19 inhibition — often preferred with clopidogrel." }),
  d("metformin", "Metformin", ["Glucophage"], "Biguanide",
    [], ["hypoglycemic"], "Lactic acidosis (rare), GI upset",
    { note: "OCT/MATE, not CYP." }),
  d("glipizide", "Glipizide", ["Glucotrol"], "Sulfonylurea",
    [sub("CYP2C9", "major")],
    ["hypoglycemic", "insulin-secretagogue"], "Hypoglycemia"),
  d("glyburide", "Glyburide", ["Diabeta", "Micronase"], "Sulfonylurea",
    [sub("CYP2C9", "major"), sub("CYP3A4", "minor")],
    ["hypoglycemic", "insulin-secretagogue"], "Hypoglycemia"),
  d("repaglinide", "Repaglinide", ["Prandin"], "Meglitinide",
    [sub("CYP2C8", "sensitive"), sub("CYP3A4", "major")],
    ["hypoglycemic", "insulin-secretagogue"], "Severe hypoglycemia",
    { note: "Gemfibrozil is contraindicated (CYP2C8 + OATP)." }),
  d("insulin-glargine", "Insulin glargine", ["Lantus", "Basaglar", "Toujeo"], "Long-acting insulin",
    [], ["hypoglycemic"], "Hypoglycemia"),
  d("levothyroxine", "Levothyroxine", ["Synthroid", "Levoxyl"], "Thyroid hormone",
    [], [], "Iatrogenic hyper/hypothyroidism",
    { note: "Absorption interactions (iron, calcium, PPIs) dominate over CYP." }),
  d("prednisone", "Prednisone", ["Deltasone"], "Corticosteroid",
    [sub("CYP3A4", "minor")],
    [], "Hyperglycemia, immunosuppression, tendon rupture with fluoroquinolones",
    { note: "Empty PD on purpose — the fluoroquinolone tendon pair is a named row, not stacked GABA. Not a 3A4 inducer like dexamethasone." }),
  d("tacrolimus", "Tacrolimus", ["Prograf"], "Calcineurin inhibitor",
    [sub("CYP3A4", "sensitive", "clearance", true), sub("P-gp", "major")],
    ["immunosuppressant", "nephrotoxic", "seizure-lowering"], "Nephrotoxicity, neurotoxicity, infection",
    { note: "Narrow index. Strong 3A4 inhibitors can multiply AUC." }),
  d("cyclosporine", "Cyclosporine", ["Neoral", "Sandimmune", "Gengraf"], "Calcineurin inhibitor",
    [sub("CYP3A4", "sensitive", "clearance", true), sub("P-gp", "major"), inh("CYP3A4", "moderate"), inh("P-gp", "moderate")],
    ["immunosuppressant", "nephrotoxic"], "Nephrotoxicity, infection"),
  d("methotrexate", "Methotrexate", ["Trexall", "Rheumatrex"], "Antimetabolite",
    [], ["nephrotoxic", "hepatotoxic"], "Marrow suppression, mucositis, AKI",
    { note: "NSAIDs and TMP-SMX raise toxicity via renal/transporter effects." }),
  d("colchicine", "Colchicine", ["Colcrys", "Mitigare"], "Antigout",
    [sub("CYP3A4", "sensitive", "clearance", true), sub("P-gp", "sensitive")],
    [], "Myelosuppression, myopathy, GI toxicity",
    { note: "Contraindicated with strong 3A4/P-gp inhibitors in renal/hepatic impairment." }),
  d("allopurinol", "Allopurinol", ["Zyloprim"], "Xanthine oxidase inhibitor",
    [], [], "SJS/TEN (HLA-B*5801), marrow suppression with azathioprine",
    {
      aliases: ["zyloprim", "allopurinol"],
      note: "XO blockade is how 6-mercaptopurine accumulates. Azathioprine and 6-MP are labeled dose-cuts or contraindications — febuxostat is the same enzyme. Not a CYP row.",
    }),
  d("sildenafil", "Sildenafil", ["Viagra", "Revatio"], "PDE5 inhibitor",
    [sub("CYP3A4", "major")],
    ["pde5"], "Severe hypotension with nitrates"),
  d("tadalafil", "Tadalafil", ["Cialis", "Adcirca"], "PDE5 inhibitor",
    [sub("CYP3A4", "major")],
    ["pde5"], "Severe hypotension with nitrates"),
  d("nitroglycerin", "Nitroglycerin", ["Nitrostat", "Nitro-Dur"], "Nitrate",
    [], ["nitrate"], "Catastrophic hypotension with PDE5 inhibitors"),
  d("ondansetron", "Ondansetron", ["Zofran"], "5-HT3 antagonist",
    [sub("CYP3A4", "major"), sub("CYP1A2", "minor"), sub("CYP2D6", "minor")],
    ["qt-known", "serotonergic"], "QT prolongation"),
  d("diphenhydramine", "Diphenhydramine", ["Benadryl"], "First-generation antihistamine",
    [sub("CYP2D6", "minor"), inh("CYP2D6", "weak")],
    ["cns-depressant", "anticholinergic"], "Sedation, delirium, urinary retention"),
  d("acetaminophen", "Acetaminophen", ["Tylenol", "Paracetamol"], "Analgesic / antipyretic",
    [sub("CYP2E1", "major", "activation"), sub("CYP1A2", "minor"), sub("CYP3A4", "minor")],
    ["hepatotoxic"], "Hepatotoxicity in overdose or with 2E1 induction (chronic alcohol)",
    {
      aliases: ["paracetamol", "apap"],
      note: "CYP2E1 activation to NAPQI. Chronic drinking induces 2E1 and depletes glutathione — the classic delayed-hepatotoxicity pattern.",
    }),
  d("ibuprofen", "Ibuprofen", ["Advil", "Motrin"], "NSAID",
    [sub("CYP2C9", "major")],
    ["nsaid", "nephrotoxic"], "GI bleed, AKI, attenuated antiplatelet effect of aspirin"),
  d("naproxen", "Naproxen", ["Aleve", "Naprosyn"], "NSAID",
    [sub("CYP2C9", "minor"), sub("CYP1A2", "minor")],
    ["nsaid", "nephrotoxic"], "GI bleed, AKI"),
  d("celecoxib", "Celecoxib", ["Celebrex"], "COX-2 inhibitor",
    [sub("CYP2C9", "major"), inh("CYP2D6", "weak")],
    ["nsaid", "nephrotoxic"], "CV risk, AKI, attenuated but present bleeding risk"),
  d("theophylline", "Theophylline", ["Theo-24", "Uniphyl"], "Methylxanthine",
    [sub("CYP1A2", "sensitive", "clearance", true)],
    ["seizure-lowering"], "Tachyarrhythmia, seizures",
    { note: "Narrow index. Ciprofloxacin and fluvoxamine can double levels." }),
  d("tamoxifen", "Tamoxifen", ["Nolvadex", "Soltamox"], "SERM",
    [sub("CYP2D6", "sensitive", "activation"), sub("CYP3A4", "major"), sub("CYP2C9", "minor")],
    [], "Loss of endoxifen (efficacy) if 2D6 is blocked",
    { note: "Prodrug. Strong 2D6 inhibitors (paroxetine, fluoxetine, bupropion) are avoided." }),
  d("ethinyl-estradiol", "Ethinyl estradiol (OCP)", ["Yaz", "Ortho Tri-Cyclen", "Loestrin"], "Estrogen contraceptive",
    [sub("CYP3A4", "major")],
    [], "Contraceptive failure with inducers",
    { aliases: ["oral contraceptive", "birth control", "ocp"] }),
  d("grapefruit", "Grapefruit juice", [], "Furanocoumarin (intestinal CYP3A4)",
    [inh("CYP3A4", "strong"), inh("P-gp", "moderate")],
    [], "Raised oral 3A4-victim exposure for 24–72 h",
    {
      kind: "food",
      aliases: ["grapefruit", "gfj", "pomelo", "seville orange", "bergamottin"],
      note: "Mechanism-based intestinal CYP3A4 knockout. Hepatic 3A4 is largely spared — IV ketamine barely moves; oral ketamine, buspirone, and quetiapine do.",
    }),
  d("caffeine", "Caffeine", [], "Methylxanthine",
    [sub("CYP1A2", "sensitive")],
    [], "Jitteriness, insomnia, tachycardia",
    { aliases: ["guarana", "caffeine pill", "no-doz", "yerba mate"] }),
  d("lurasidone", "Lurasidone", ["Latuda"], "Atypical antipsychotic",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant", "fed-boost"],
    "Sedation, akathisia; F collapses without ~350 kcal",
    {
      note: "Contraindicated with strong CYP3A4 inhibitors and inducers. Also labeled with food — about 350 kcal. Put a high-fat meal on the desk; empty-stomach Latuda is a different failure than grapefruit.",
    }),

  // —— Dissociatives / NMDA ————————————————————————
  d("ketamine", "Ketamine", ["Ketalar"], "NMDA dissociative anesthetic",
    [sub("CYP2B6", "major"), sub("CYP3A4", "major"), sub("CYP2C9", "minor")],
    ["dissociative", "cns-depressant", "seizure-lowering"],
    "Respiratory depression, emergence reactions, blood-pressure swings, cystitis with chronic exposure",
    {
      aliases: ["ketalar", "racemic ketamine"],
      note: "Norketamine via CYP2B6 (major) and CYP3A4. Strong 3A4 inhibitors raise exposure; GABA-ergic drugs add airway risk and can blunt antidepressant response.",
    }),
  d("esketamine", "Esketamine", ["Spravato"], "NMDA dissociative (S-ketamine)",
    [sub("CYP2B6", "major"), sub("CYP3A4", "major"), sub("CYP2C9", "minor")],
    ["dissociative", "cns-depressant", "seizure-lowering"],
    "Sedation, dissociation, hypertension, respiratory depression with CNS depressants",
    {
      aliases: ["spravato"],
      note: "S-enantiomer of ketamine. Same 2B6/3A4 map. Label warns against other CNS depressants including benzodiazepines and alcohol.",
    }),
  d("dextromethorphan", "Dextromethorphan", ["Delsym", "Robitussin DM"], "NMDA antitussive / dissociative",
    [sub("CYP2D6", "sensitive"), sub("CYP3A4", "minor")],
    ["dissociative", "serotonergic", "cns-depressant", "seizure-lowering"],
    "Serotonin syndrome, dissociation, sedation",
    {
      aliases: ["dxm"],
      note: "Sensitive CYP2D6 substrate. 2D6 poor metabolizers or strong inhibitors (paroxetine, fluoxetine, bupropion) raise exposure sharply. Serotonergic at therapeutic and supra-therapeutic doses.",
    }),
  d("memantine", "Memantine", ["Namenda"], "NMDA antagonist",
    [],
    ["dissociative"],
    "Confusion, dizziness",
    { note: "Renally cleared (OCT2), not a CYP substrate. PD overlap with other NMDA drugs is modest." }),

  // —— Entactogens / stimulants ——————————————————————
  d("mdma", "MDMA", [], "Entactogen / stimulant",
    [sub("CYP2D6", "major"), inh("CYP2D6", "moderate"), sub("CYP1A2", "minor"), sub("CYP3A4", "minor")],
    ["serotonergic", "stimulant", "seizure-lowering"],
    "Hyperthermia, serotonin syndrome, hyponatremia, hypertensive crisis with MAOIs",
    {
      aliases: ["midomafetamine", "3,4-methylenedioxymethamphetamine"],
      note: "CYP2D6 demethylenation plus mechanism-based 2D6 inhibition after the first pass. Strong 2D6 inhibitors blunt the effect and raise parent exposure. MAOIs are contraindicated.",
    }),
  d("amphetamine", "Amphetamine", ["Adderall", "Evekeo"], "Amphetamine stimulant",
    [sub("CYP2D6", "minor")],
    ["stimulant", "seizure-lowering"],
    "Hypertension, tachycardia, psychosis, MAOI hypertensive crisis",
    { aliases: ["adderall", "dextroamphetamine"] }),
  d("lisdexamfetamine", "Lisdexamfetamine", ["Vyvanse"], "Amphetamine prodrug",
    [],
    ["stimulant", "seizure-lowering"],
    "Hypertension, tachycardia, MAOI hypertensive crisis",
    { note: "Hydrolyzed to d-amphetamine (not CYP). Interactions are PD with MAOIs and other stimulants." }),
  d("methylphenidate", "Methylphenidate", ["Ritalin", "Concerta", "Daytrana"], "NDRI stimulant",
    [inh("CYP2D6", "weak")],
    ["stimulant"],
    "Hypertension, tachycardia, MAOI hypertensive crisis",
    { aliases: ["concerta", "ritalin"], note: "CES1, not a major CYP substrate." }),
  d("methamphetamine", "Methamphetamine", ["Desoxyn"], "Amphetamine stimulant",
    [sub("CYP2D6", "major")],
    ["stimulant", "seizure-lowering"],
    "Hypertensive crisis, hyperthermia, cardiotoxicity",
    { aliases: ["desoxyn", "meth", "crystal", "ice", "shard", "crystal meth"] }),
  d("cocaine", "Cocaine", [], "Local anesthetic / stimulant",
    [sub("CYP3A4", "minor")],
    ["stimulant", "qt-possible", "seizure-lowering", "hepatotoxic"],
    "Arrhythmia, seizure, hyperthermia, cocaethylene with ethanol",
    {
      aliases: ["crack", "coke", "blow", "snow", "powder"],
      note: "Mostly CES1 hydrolysis. CYP3A4 makes norcocaine. Ethanol forms cocaethylene — longer-lived and more cardiotoxic. Smoked crack skips first-pass; the PD map (speedball, MAOI, QT) does not. Pair with an opioid for the speedball finding.",
    }),
  d("heroin", "Heroin", [], "Diacetylmorphine",
    [sub("P-gp", "minor")],
    ["opioid", "cns-depressant"],
    "Respiratory depression, pulmonary edema",
    {
      aliases: ["diamorphine", "dope", "smack", "tar", "china white", "brown"],
      note: "Rapidly deacetylated to 6-MAM then morphine. Not a CYP victim. Speedball with cocaine is PD — the stimulant masks apnea. Same μ map as morphine once it converts.",
    }),
  d("modafinil", "Modafinil", ["Provigil"], "Wake-promoting agent",
    [sub("CYP3A4", "major"), inh("CYP2C19", "moderate"), ind("CYP3A4", "moderate")],
    ["stimulant"],
    "Loss of 3A4-victim efficacy (OCPs), 2C19 victim toxicity",
    { note: "Moderate 3A4 inducer and 2C19 inhibitor. Can fail oral contraceptives." }),
  d("armodafinil", "Armodafinil", ["Nuvigil"], "Wake-promoting agent",
    [sub("CYP3A4", "major"), inh("CYP2C19", "moderate"), ind("CYP3A4", "moderate")],
    ["stimulant"],
    "Loss of 3A4-victim efficacy, 2C19 victim toxicity"),
  d("atomoxetine", "Atomoxetine", ["Strattera"], "NRI (ADHD)",
    [sub("CYP2D6", "sensitive", "clearance", true)],
    ["seizure-lowering"],
    "Hypertension, suicidality warning, 2D6 victim toxicity",
    { note: "Sensitive CYP2D6 substrate. Strong 2D6 inhibitors require dose reduction." }),
  d("nicotine", "Nicotine", ["Nicorette", "Nicoderm"], "Nicotine agonist",
    [sub("CYP2B6", "minor"), ind("CYP1A2", "moderate")],
    ["stimulant"],
    "Tachycardia; smoking-induced 1A2 drops clozapine/olanzapine/theophylline",
    { note: "Combustion PAHs, not nicotine itself, drive most 1A2 induction. Cessation can spike 1A2 victims." }),

  // —— Classic psychedelics ————————————————————————
  d("psilocybin", "Psilocybin", [], "Tryptamine psychedelic",
    [],
    ["serotonergic", "psychedelic", "seizure-lowering"],
    "Serotonin syndrome with MAOIs; seizure risk with lithium",
    {
      aliases: ["psilocin"],
      note: "Dephosphorylated to psilocin; then MAO-A and UGT1A10 — not a CYP substrate. Lithium combinations have been linked to seizures.",
    }),
  d("lsd", "LSD", [], "Ergoline psychedelic",
    [],
    ["serotonergic", "psychedelic", "seizure-lowering"],
    "Serotonin syndrome with MAOIs; seizure risk with lithium",
    {
      aliases: ["lysergide", "lysergic acid diethylamide"],
      note: "Negligible CYP clearance. PD collisions dominate: MAOIs, other serotonergics, lithium.",
    }),
  d("dmt", "DMT", [], "Tryptamine psychedelic",
    [],
    ["serotonergic", "psychedelic"],
    "Hypertensive crisis / serotonin syndrome with pharmaceutical MAOIs",
    {
      aliases: ["n,n-dmt", "dimethyltryptamine"],
      note: "MAO-A in gut destroys oral DMT. Pharmaceutical MAOIs plus DMT are not the same as a supervised ayahuasca setting — pressor and serotonin risk is high.",
    }),
  d("mescaline", "Mescaline", [], "Phenethylamine psychedelic",
    [],
    ["serotonergic", "psychedelic", "seizure-lowering"],
    "Serotonin syndrome with MAOIs",
    { note: "MAO and some CYP2D6 contribution. PD with MAOIs and lithium matters more than CYP." }),

  // —— Cannabinoids ———————————————————————————————
  d("dronabinol", "Dronabinol (THC)", ["Marinol", "Syndros"], "Cannabinoid (THC)",
    [sub("CYP2C9", "major"), sub("CYP3A4", "major")],
    ["cannabinoid", "cns-depressant"],
    "Sedation, tachycardia, 2C9/3A4 victim toxicity",
    { aliases: ["thc", "delta-9-thc", "cannabis"] }),
  d("cannabidiol", "Cannabidiol", ["Epidiolex"], "Cannabinoid (CBD)",
    [sub("CYP2C19", "major"), sub("CYP3A4", "major"), inh("CYP2C19", "strong"), inh("CYP3A4", "moderate"), inh("CYP2C9", "moderate"), inh("CYP2D6", "weak")],
    ["cannabinoid", "cns-depressant", "hepatotoxic"],
    "Somnolence, transaminase rise, victim-drug toxicity (clobazam, diazepam, warfarin)",
    {
      aliases: ["cbd", "epidiolex"],
      note: "Strong CYP2C19 inhibitor — a major perpetrator for diazepam, clobazam, and citalopram.",
    }),

  // —— Alcohol / GABA / MAT —————————————————————————
  d("ethanol", "Ethanol", [], "Alcohol",
    [sub("CYP2E1", "major"), ind("CYP2E1", "moderate")],
    ["alcohol", "cns-depressant", "hepatotoxic", "seizure-lowering"],
    "Respiratory depression with other CNS drugs, hepatotoxicity, cocaethylene with cocaine",
    {
      aliases: ["alcohol", "etoh"],
      note: "Chronic use induces CYP2E1 (and, via lifestyle, other pathways). Acute use is a CNS depressant. Never stack with GHB, opioids, or benzodiazepines.",
    }),
  d("sodium-oxybate", "Sodium oxybate", ["Xyrem", "Lumryz"], "GHB (GABA-B)",
    [],
    ["ghb", "cns-depressant"],
    "Profound respiratory depression, coma",
    {
      aliases: ["ghb", "xyrem", "gamma hydroxybutyrate"],
      note: "Contraindicated with alcohol and other CNS depressants. Not a CYP substrate.",
    }),
  d("phenibut", "Phenibut", [], "GABA-B analogue",
    [],
    ["cns-depressant"],
    "Sedation, withdrawal seizures when stacked then stopped",
    { note: "Not a CYP substrate. PD with alcohol, benzos, GHB, and opioids." }),
  d("baclofen", "Baclofen", ["Lioresal"], "GABA-B agonist",
    [],
    ["cns-depressant"],
    "Sedation, respiratory depression with other CNS drugs"),
  d("eszopiclone", "Eszopiclone", ["Lunesta"], "Z-hypnotic",
    [sub("CYP3A4", "major")],
    ["cns-depressant", "benzo-zdrug"],
    "Sedation, complex sleep behavior"),
  d("ramelteon", "Ramelteon", ["Rozerem"], "Melatonin-receptor hypnotic",
    [sub("CYP1A2", "sensitive")],
    ["cns-depressant"],
    "Sedation; fluvoxamine is contraindicated",
    { note: "Sensitive CYP1A2 substrate. Fluvoxamine (strong 1A2 inhibitor) is labeled contraindicated." }),
  d("suvorexant", "Suvorexant", ["Belsomra"], "Orexin antagonist",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant"],
    "Sedation, next-day impairment",
    { note: "Sensitive 3A4 substrate. Strong 3A4 inhibitors are not recommended." }),
  d("melatonin", "Melatonin", [], "Pineal hormone",
    [sub("CYP1A2", "sensitive")],
    ["cns-depressant"],
    "Sedation; 1A2 inhibitors raise exposure"),
  d("buprenorphine", "Buprenorphine", ["Suboxone", "Subutex", "Butrans", "Sublocade", "Zubsolv", "Brixadi"], "Partial opioid agonist",
    [sub("CYP3A4", "major"), sub("CYP2C8", "minor")],
    ["opioid", "cns-depressant", "partial-opioid"],
    "Respiratory depression with benzos/alcohol; precipitated withdrawal with full agonists",
    {
      aliases: ["suboxone", "subutex", "zubsolv", "bunavail", "belbuca", "buprenex", "brixadi"],
      note: "High-affinity partial μ-agonist. On a fentanyl or methadone load it precipitates withdrawal — the classic failed induction. Stable bup then a full agonist (7-OH, fentanyl) blocks the high. 3A4 inhibitors (ritonavir, cobicistat, azoles) raise parent. Street benzos and gabapentinoids still hit the airway. Naloxone in Suboxone is poorly absorbed under the tongue; it is not a second opioid on this desk unless injected.",
    }),
  d("naltrexone", "Naltrexone", ["ReVia", "Vivitrol", "Contrave"], "Opioid antagonist",
    [],
    ["opioid-antagonist"],
    "Precipitated opioid withdrawal; blocks opioid analgesia",
    {
      aliases: ["vivitrol", "revia"],
      note: "Not a CYP substrate. IM naltrexone occupies μ for weeks. Leftover fentanyl or a 'just this once' agonist is precipitated withdrawal, not a slip that didn't work. Also used for alcohol use disorder next to acamprosate.",
    }),
  d("naloxone", "Naloxone", ["Narcan", "Kloxxado"], "Opioid antagonist",
    [],
    ["opioid-antagonist"],
    "Precipitated opioid withdrawal",
    { aliases: ["narcan"] }),
  d("nalmefene", "Nalmefene", ["Opvee", "Revex"], "Opioid antagonist",
    [],
    ["opioid-antagonist"],
    "Precipitated opioid withdrawal; longer μ occupancy than naloxone",
    {
      aliases: ["opvee", "revex"],
      note: "Nasal nalmefene (Opvee) occupies μ longer than naloxone. After a fentanyl or nitazene fold the patient can re-narcotize as nalmefene still sits — or look over-reversed for hours. Not a CYP substrate. This desk is not a field protocol.",
    }),
  d("kratom", "Kratom (mitragynine)", [], "Atypical opioid / stimulant",
    [sub("CYP3A4", "major"), inh("CYP2D6", "weak")],
    ["opioid", "cns-depressant", "serotonergic"],
    "Respiratory depression with other CNS drugs; 3A4 victim toxicity",
    {
      aliases: ["mitragynine", "7-hydroxymitragynine"],
      note: "Mitragynine is a CYP3A4 substrate. Combined with other opioids, benzos, or alcohol the respiratory risk is additive.",
    }),
  d("disulfiram", "Disulfiram", ["Antabuse"], "Aldehyde dehydrogenase inhibitor",
    [inh("CYP2E1", "strong"), inh("CYP1A2", "weak")],
    ["hepatotoxic", "seizure-lowering"],
    "Acetaldehyde reaction with ethanol; hepatotoxicity",
    { aliases: ["antabuse"] }),
  d("acamprosate", "Acamprosate", ["Campral"], "NMDA / GABA modulator",
    [],
    [],
    "Diarrhea, renal accumulation",
    { note: "Renally cleared. Almost no CYP interactions." }),
  d("varenicline", "Varenicline", ["Chantix"], "Partial nicotinic agonist",
    [],
    ["seizure-lowering"],
    "Nausea, neuropsychiatric warning",
    { aliases: ["chantix"], note: "Renally cleared. No CYP map." }),
  d("clomipramine", "Clomipramine", ["Anafranil"], "Tricyclic antidepressant",
    [sub("CYP2D6", "major"), sub("CYP2C19", "major"), sub("CYP3A4", "minor")],
    ["serotonergic", "cns-depressant", "anticholinergic", "qt-possible", "seizure-lowering"],
    "TCA toxicity, serotonin syndrome, seizure"),
  d("vortioxetine", "Vortioxetine", ["Trintellix"], "Multimodal antidepressant",
    [sub("CYP2D6", "major")],
    ["serotonergic", "ssri-snri"],
    "Serotonin syndrome, nausea"),
  d("tranylcypromine", "Tranylcypromine", ["Parnate"], "Irreversible MAOI",
    [],
    ["maoi", "serotonergic"],
    "Hypertensive crisis, serotonin syndrome",
    { note: "Irreversible MAO-A/B inhibitor. Stimulants, entactogens, and serotonergics are contraindicated." }),
  d("topiramate", "Topiramate", ["Topamax"], "Anticonvulsant",
    [ind("CYP3A4", "weak")],
    ["cns-depressant", "seizure-lowering"],
    "Cognitive slowing, metabolic acidosis, reduced OCP efficacy at high dose"),
  d("moclobemide", "Moclobemide", ["Manerix"], "Reversible MAOI (RIMA)",
    [sub("CYP2C19", "major"), inh("CYP2D6", "weak"), inh("CYP1A2", "weak")],
    ["maoi", "serotonergic"],
    "Serotonin syndrome, pressor with stimulants (lower than irreversible MAOIs)",
    { note: "Reversible MAO-A inhibitor. Still contraindicated with MDMA, other serotonergics, and stimulants, with a shorter washout than phenelzine." }),
  d("clobazam", "Clobazam", ["Onfi", "Sympazan"], "Benzodiazepine",
    [sub("CYP2C19", "sensitive"), sub("CYP3A4", "major")],
    ["cns-depressant", "benzo-zdrug"],
    "Sedation, respiratory depression; 2C19 PM or CBD can spike N-desmethylclobazam",
    { note: "Sensitive CYP2C19 substrate. Cannabidiol (Epidiolex) is a classic perpetrator." }),
  d("pcp", "Phencyclidine", [], "NMDA dissociative",
    [sub("CYP3A4", "major")],
    ["dissociative", "cns-depressant", "seizure-lowering"],
    "Prolonged psychosis, seizure, hyperthermia, airway risk with other CNS drugs",
    { aliases: ["phencyclidine"], note: "CYP3A4 to trans-PCPOH. Same NMDA + GABA stacking as ketamine." }),
  d("twocb", "2C-B", [], "Phenethylamine psychedelic",
    [sub("CYP2D6", "minor")],
    ["serotonergic", "psychedelic", "seizure-lowering"],
    "Serotonin syndrome with MAOIs; vasoconstriction",
    { aliases: ["2c-b", "2cb", "4-bromo-2,5-dimethoxyphenethylamine"] }),
  d("kava", "Kava", [], "Kavalactone sedative",
    [inh("CYP2E1", "moderate"), inh("CYP1A2", "weak"), inh("CYP2C9", "weak"), inh("CYP2C19", "weak"), inh("CYP3A4", "weak")],
    ["cns-depressant", "hepatotoxic"],
    "Hepatotoxicity, additive sedation with alcohol/benzos",
    { aliases: ["kava kava", "piper methysticum"] }),
  d("quinidine", "Quinidine", ["Quinidex"], "Class Ia antiarrhythmic",
    [sub("CYP3A4", "major"), inh("CYP2D6", "strong"), inh("P-gp", "strong")],
    ["qt-known"],
    "TdP, cinchonism, 2D6 victim toxicity",
    { note: "Strong CYP2D6 inhibitor. Paired with dextromethorphan as Nuedexta — a textbook 2D6 trap." }),
  d("ibogaine", "Ibogaine", [], "Oneirogen / NMDA–kappa agonist",
    [sub("CYP2D6", "major"), sub("CYP3A4", "minor")],
    ["dissociative", "qt-known", "cns-depressant", "seizure-lowering"],
    "Prolonged QT, ataxia, death in unsupervised use — especially with methadone or other QT drugs",
    {
      aliases: ["iboga", "noribogaine"],
      note: "CYP2D6 to noribogaine. Strong 2D6 inhibitors and QT drugs are a documented fatality pattern. Not a medical treatment map.",
    }),
  d("harmaline", "Harmaline", [], "Beta-carboline MAOI",
    [inh("CYP2D6", "moderate")],
    ["maoi", "serotonergic"],
    "Hypertensive crisis and serotonin syndrome with tyramine, stimulants, or entactogens",
    {
      aliases: ["harmine", "ayahuasca", "banisteriopsis"],
      note: "The MAOI in ayahuasca. Pharmaceutical MAOIs plus DMT/MDMA remain contraindicated outside a supervised research setting.",
    }),
  d("five-meo-dmt", "5-MeO-DMT", [], "Tryptamine psychedelic",
    [],
    ["serotonergic", "psychedelic"],
    "Intense serotonergic load; MAOI combinations have been lethal",
    {
      aliases: ["5-meo-dmt", "5meo"],
      note: "MAO-A clearance. Do not combine with harmala alkaloids or pharmaceutical MAOIs.",
    }),
  d("nitrous-oxide", "Nitrous oxide", [], "Inhaled dissociative",
    [],
    ["dissociative", "cns-depressant"],
    "Hypoxia with other CNS depressants; B12 inactivation with chronic exposure",
    { aliases: ["n2o", "nitrous"], note: "Not a CYP substrate. PD with opioids, benzos, alcohol, and other NMDA drugs." }),
  d("tyramine-foods", "Tyramine foods", [], "Aged / fermented meal",
    [],
    ["tyramine"],
    "Hypertensive crisis with MAOIs",
    {
      kind: "food",
      aliases: ["tyramine", "aged cheese", "salami", "tap beer", "soy sauce", "sauerkraut"],
      note: "Aged cheese, cured meats, tap beer, soy, and fava beans. Irreversible MAOIs plus a tyramine load can spike blood pressure within minutes.",
    }),
  d("st-johns-wort", "St. John's wort", [], "Hypericum (3A4 inducer)",
    [ind("CYP3A4", "strong"), ind("CYP2C19", "moderate"), ind("P-gp", "strong"), ind("CYP2C9", "weak")],
    ["serotonergic"],
    "Loss of 3A4-victim efficacy; serotonin syndrome with antidepressants",
    {
      kind: "herb",
      aliases: ["hypericum", "sjw", "st johns wort"],
      note: "Induces CYP3A4 and P-gp about like rifampin-lite. Also serotonergic — stacked SSRIs/MDMA are a problem on both axes.",
    }),
  d("high-fat-meal", "High-fat meal", [], "Dietary absorption booster",
    [],
    ["fat-meal"],
    "Higher oral cannabinoid (and some lipophilic) AUC",
    {
      kind: "food",
      aliases: ["fatty meal", "high fat", "with food", "fed state", "with meals", "take with food"],
      note: "A 50–60% fat meal can several-fold increase oral THC and CBD. Lurasidone and ziprasidone are labeled with calories — F collapses fasted. Posaconazole suspension wants food; Fosamax wants none. Take that as a PK fact, not a dosing instruction.",
    }),
  d("low-salt", "Low-salt / dehydration", [], "Renal lithium trap",
    [],
    ["sodium-restriction", "nephrotoxic"],
    "Lithium retention and toxicity",
    {
      kind: "food",
      aliases: ["low sodium", "dehydration", "salt restriction", "sauna"],
      note: "Lithium tracks sodium. Crash diets, heavy sweating, or a sudden low-salt stretch raise levels without a dose change.",
    }),
  d("high-salt", "High-salt meal", [], "Renal lithium dump",
    [],
    ["sodium-load"],
    "Drop in lithium level / loss of effect",
    {
      kind: "food",
      aliases: ["high sodium", "salty meal"],
      note: "A sudden salt load increases lithium clearance. Less dangerous than restriction, but mood can slip.",
    }),
  d("alkalinizer", "Urinary alkalinizer", [], "Bicarbonate / antacid load",
    [],
    ["urinary-alkaline"],
    "Slowed amphetamine excretion, longer stimulant effect",
    {
      kind: "food",
      aliases: ["baking soda", "sodium bicarbonate", "tums", "alkaline urine"],
      note: "Alkaline urine reabsorbs amphetamine. Antacids and bicarbonate stretch duration and peak — a classic stimulant PK trick, and a toxicity risk.",
    }),
  d("acidic-juice", "Acidic juice / vitamin C", [], "Urinary acidifier",
    [],
    ["urinary-acid"],
    "Faster amphetamine clearance, shorter duration",
    {
      kind: "food",
      aliases: ["vitamin c", "ascorbic acid", "orange juice", "cranberry"],
      note: "Acid urine speeds amphetamine excretion. Opposite of bicarbonate. Not a 3A4 story — grapefruit is the furanocoumarin. Apple/orange juice cutting Allegra is OATP (search apple juice), not this pH row.",
    }),
  d("charred-meat", "Charred / smoked meat", [], "PAH CYP1A2 inducer",
    [ind("CYP1A2", "moderate")],
    [],
    "Lower 1A2-victim levels (clozapine, olanzapine, caffeine)",
    {
      kind: "food",
      aliases: ["charcoal grilled", "barbecued", "smoked meat", "pah food"],
      note: "Same PAH induction as tobacco smoke, weaker. Cruciferous vegetables do a milder version of this.",
    }),
  d("five-htp", "5-HTP / L-tryptophan", [], "Serotonin precursor",
    [],
    ["serotonergic", "tryptophan"],
    "Serotonin syndrome with MAOIs, SSRIs, MDMA, DXM",
    {
      kind: "herb",
      aliases: ["5-htp", "5htp", "tryptophan", "l-tryptophan"],
      note: "Feeds 5-HT synthesis. Stacked with an SSRI or MAOI this is a serotonergic load, not a gentle sleep aid.",
    }),
  d("goldenseal", "Goldenseal", [], "CYP2D6 / 3A4 herbal inhibitor",
    [inh("CYP2D6", "moderate"), inh("CYP3A4", "moderate"), inh("CYP2C9", "weak")],
    [],
    "Raised 2D6 and 3A4 victim levels (DXM, MDMA, oral ketamine)",
    {
      kind: "herb",
      aliases: ["hydrastis", "goldenseal root"],
      note: "The plant. Berberine HCl is the capsule people actually buy — same 2D6/3A4 map, plus glucose-lowering. Search berberine for the pill.",
    }),
  d("valerian", "Valerian root", [], "Herbal sedative",
    [],
    ["cns-depressant"],
    "Additive sedation with benzos, alcohol, GHB, ketamine",
    { kind: "herb", aliases: ["valerian", "valeriana"] }),
  d("tianeptine", "Tianeptine", ["Stablon", "Coaxil"], "Atypical μ-opioid antidepressant",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Respiratory depression at high dose; withdrawal; 3A4 victim toxicity",
    {
      aliases: ["tianaa", "zaza"],
      note: "Prescribed as an antidepressant in some countries; μ-agonist at higher exposure. CYP3A4 substrate. Stacks with other CNS depressants.",
    }),
  d("xylazine", "Xylazine", [], "Veterinary α2-agonist",
    [],
    ["alpha2-agonist", "cns-depressant", "bradycardic"],
    "Profound sedation not reversed by naloxone; airway loss with opioids",
    {
      aliases: ["tranq", "tranq dope"],
      note: "Not a CYP story. Street opioid adulterant. Naloxone reverses the opioid but not the α2 sedation — airway support is the intervention.",
    }),
  d("medetomidine", "Medetomidine", ["Domitor"], "Veterinary α2-agonist",
    [],
    ["alpha2-agonist", "cns-depressant", "bradycardic"],
    "Deep sedation, bradycardia; not reversed by naloxone",
    {
      aliases: ["dexmedetomidine", "precedex", "dex"],
      note: "Appearing in the same street-opioid supply as xylazine. Same α2 airway problem.",
    }),
  d("isotonitazene", "Isotonitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "High-potency μ-agonist respiratory arrest; 3A4 victim toxicity",
    { aliases: ["iso", "nitazene"] }),
  d("protonitazene", "Protonitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "High-potency μ-agonist respiratory arrest",
    { aliases: ["protonitazene", "nitazene"] }),
  d("bromazolam", "Bromazolam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Respiratory depression with opioids; withdrawal seizures",
    { aliases: ["bromaz", "dbzd"] }),
  d("etizolam", "Etizolam", ["Etilaam"], "Thienodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Respiratory depression with opioids; withdrawal seizures",
    { aliases: ["etiz"] }),
  d("flualprazolam", "Flualprazolam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "High-potency benzo × opioid airway stack",
    { aliases: ["flualp"] }),
  d("gbl", "GBL", [], "GHB prodrug",
    [],
    ["ghb", "cns-depressant"],
    "Converts to GHB; labeled contraindication with other CNS depressants",
    {
      aliases: ["gamma-butyrolactone", "gamma butyrolactone"],
      note: "Lactonase converts GBL to GHB. Same apnea map as sodium oxybate plus alcohol or benzos.",
    }),
  d("bd-14", "1,4-Butanediol", [], "GHB prodrug",
    [sub("CYP2E1", "minor", "activation")],
    ["ghb", "cns-depressant"],
    "ADH/CYP2E1 activation to GHB; delayed coma with alcohol",
    {
      aliases: ["14bd", "1,4-bd", "butanediol"],
      note: "Alcohol occupies ADH and delays conversion, then dumps GHB later. Not a dosing map.",
    }),
  d("mephedrone", "Mephedrone", [], "Cathinone entactogen",
    [sub("CYP2D6", "major")],
    ["serotonergic", "stimulant"],
    "Serotonin syndrome with MAOIs; 2D6 victim toxicity",
    { aliases: ["4-mmc", "4mmc", "m-cat"] }),
  d("three-mmc", "3-MMC", [], "Cathinone stimulant",
    [sub("CYP2D6", "major")],
    ["serotonergic", "stimulant"],
    "Serotonin and pressor load with MAOIs",
    { aliases: ["3-mmc", "3mmc"] }),
  d("two-fdck", "2-Fluorodeschloroketamine", [], "Arylcyclohexylamine dissociative",
    [sub("CYP2B6", "major"), sub("CYP3A4", "major")],
    ["dissociative", "cns-depressant"],
    "NMDA airway stack; oral first-pass 3A4/2B6 like ketamine",
    {
      aliases: ["2-fdck", "2fdck", "2fdck"],
      note: "Ketamine analogue. Oral first-pass is the 3A4 trap; IV mostly skips it.",
    }),
  d("mxe", "Methoxetamine", [], "Arylcyclohexylamine dissociative",
    [sub("CYP2B6", "major"), sub("CYP3A4", "minor"), sub("CYP2C19", "minor")],
    ["dissociative", "cns-depressant", "seizure-lowering"],
    "Longer NMDA load than ketamine; stacked airway risk with GABA drugs",
    { aliases: ["methoxetamine"] }),
  d("loperamide", "Loperamide", ["Imodium"], "Peripheral μ-agonist / P-gp substrate",
    [sub("P-gp", "sensitive"), sub("CYP3A4", "major")],
    ["opioid", "qt-known", "cns-depressant"],
    "P-gp blockade lets loperamide into the CNS and heart — opioid toxicity plus QT",
    {
      aliases: ["imodium"],
      note: "P-gp and 3A4 keep therapeutic doses peripheral. Quinidine, ritonavir, or grapefruit plus high dose is a documented cardiotoxic pattern.",
    }),
  d("hydroxyzine", "Hydroxyzine", ["Atarax", "Vistaril"], "Sedating antihistamine",
    [sub("CYP3A4", "major")],
    ["cns-depressant", "anticholinergic", "qt-possible"],
    "Additive sedation and QT with other CNS / QT drugs",
    {
      aliases: ["atarax", "vistaril"],
      note: "The OTP 'not a benzo' for anxiety still prolongs QT and sedates. Next to methadone that is a TdP and airway row, not a free extra.",
    }),
  d("poppers", "Alkyl nitrites (poppers)", [], "Volatile nitrite vasodilator",
    [],
    ["nitrate"],
    "Profound hypotension / MI with PDE5 inhibitors",
    {
      aliases: ["amyl nitrite", "isobutyl nitrite", "popper"],
      note: "Same nitrate × PDE5 map as nitroglycerin. Not a CYP substrate.",
    }),
  d("carfentanil", "Carfentanil", [], "Ultra-potent veterinary opioid",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Respiratory arrest at microgram exposure; 3A4 victim",
    { aliases: ["carfent"] }),

  // —— Extra NMDA / RC / street ————————————————————
  d("dck", "Deschloroketamine", [], "Arylcyclohexylamine dissociative",
    [sub("CYP2B6", "major"), sub("CYP3A4", "major")],
    ["dissociative", "cns-depressant"],
    "NMDA airway stack; oral first-pass like ketamine",
    {
      aliases: ["deschloroketamine", "2'-oxo-pcm"],
      note: "Ketamine analogue without the chlorine. Oral 3A4/2B6 first-pass is the trap; IV mostly skips it.",
    }),
  d("three-meo-pcp", "3-MeO-PCP", [], "Arylcyclohexylamine dissociative",
    [sub("CYP3A4", "major"), sub("CYP2B6", "minor")],
    ["dissociative", "cns-depressant", "seizure-lowering"],
    "Longer NMDA load than ketamine; mania, seizure, airway risk with GABA drugs",
    {
      aliases: ["3-meo-pcp", "3meopcp"],
      note: "Longer and hotter than ketamine. Same NMDA × benzo/alcohol airway map, plus a mania/seizure signal at high exposure.",
    }),
  d("four-aco-dmt", "4-AcO-DMT", [], "Tryptamine psychedelic (psilocin prodrug)",
    [],
    ["serotonergic", "psychedelic", "seizure-lowering"],
    "Serotonin syndrome with MAOIs; seizure risk with lithium",
    {
      aliases: ["4-aco-dmt", "4aco", "psilacetin", "o-acetylpsilocin"],
      note: "Deacetylated to psilocin — same MAO-A/UGT map as mushrooms, not a CYP substrate. Lithium still applies.",
    }),
  d("twentyfive-i", "25I-NBOMe", [], "NBOMe psychedelic",
    [],
    ["serotonergic", "psychedelic", "seizure-lowering", "qt-possible"],
    "Vasoconstriction, seizures, fatalities; MAOI and lithium still apply",
    {
      aliases: ["25i-nbome", "25i", "n-bomb", "nbome"],
      note: "Not a CYP story. Street blotter sold as LSD. Vasoconstriction and seizures dominate; serotonergic PD with MAOIs and lithium still fires.",
    }),
  d("mda", "MDA", [], "Entactogen / stimulant",
    [sub("CYP2D6", "major"), inh("CYP2D6", "weak"), sub("CYP3A4", "minor")],
    ["serotonergic", "stimulant", "seizure-lowering"],
    "Hyperthermia, serotonin syndrome, MAOI hypertensive crisis",
    {
      aliases: ["3,4-methylenedioxyamphetamine", "sass", "sassafras"],
      note: "MDMA's demethylenated cousin and a metabolite of MDMA. Same 2D6 + MAOI map, slightly more stimulant.",
    }),
  d("methylone", "Methylone", [], "Cathinone entactogen",
    [sub("CYP2D6", "major")],
    ["serotonergic", "stimulant"],
    "Serotonin syndrome with MAOIs; 2D6 victim toxicity",
    { aliases: ["bk-mdma", "m1", "3,4-methylenedioxymethcathinone"] }),
  d("clonazolam", "Clonazolam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "High-potency benzo × opioid airway stack; blackout and withdrawal seizures",
    { aliases: ["clam", "clonz"] }),
  d("flubromazolam", "Flubromazolam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Very long high-potency benzo; opioid airway stack, withdrawal seizures",
    { aliases: ["flubrom", "fbzm"] }),
  d("a-pvp", "α-PVP", [], "Cathinone stimulant (pyrovalerone)",
    [sub("CYP2D6", "minor"), sub("CYP2C19", "minor")],
    ["stimulant", "seizure-lowering"],
    "Severe sympathomimetic toxicity; MAOI hypertensive crisis",
    {
      aliases: ["alpha-pvp", "flakka", "gravel"],
      note: "DAT/NET blocker more than a 5-HT releaser. Pressor with MAOIs still applies.",
    }),
  d("metonitazene", "Metonitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "High-potency μ-agonist respiratory arrest; 3A4 victim toxicity",
    { aliases: ["meto", "nitazene"] }),
  d("salvinorin", "Salvinorin A", [], "Kappa-opioid oneirogen",
    [],
    ["dissociative", "cns-depressant"],
    "Brief intense dissociation; additive CNS depression",
    {
      aliases: ["salvia", "salvia divinorum", "salvinorin-a"],
      note: "Kappa agonist, not a CYP substrate and not a mu opioid — naltrexone will not reverse it. PD with other CNS drugs is still sedation.",
    }),
  d("scopolamine", "Scopolamine", ["Transderm Scop"], "Antimuscarinic tropane",
    [],
    ["anticholinergic", "cns-depressant", "seizure-lowering"],
    "Delirium, urinary retention, stacked anticholinergic burden",
    {
      aliases: ["hyoscine", "datura", "devil's trumpet", "jimsonweed"],
      note: "Datura/Brugmansia tropane. Not a CYP story. Stacks with diphenhydramine, hydroxyzine, TCAs — delirium, not a recreational map.",
    }),

  // —— Clinical classics the desk was missing ——————
  d("cimetidine", "Cimetidine", ["Tagamet"], "H2 blocker / CYP perpetrator",
    [inh("CYP1A2", "moderate"), inh("CYP2D6", "moderate"), inh("CYP3A4", "moderate"), inh("CYP2C9", "weak"), inh("P-gp", "moderate")],
    [],
    "Raised victim-drug levels (theophylline, tizanidine, warfarin, oral ketamine)",
    {
      aliases: ["tagamet"],
      note: "The original OTC cytochrome bully. Famotidine does not do this — if you need an H2 blocker next to a 1A2/3A4 victim, switch. On an OTP board it can nudge methadone parent (Tagamet is not a free heartburn pill next to a known-QT opioid).",
    }),
  d("meperidine", "Meperidine", ["Demerol"], "Opioid analgesic",
    [sub("CYP3A4", "major"), sub("CYP2B6", "major")],
    ["opioid", "cns-depressant", "serotonergic", "seizure-lowering"],
    "Serotonin syndrome with MAOIs; seizures from normeperidine",
    {
      aliases: ["demerol", "pethidine"],
      note: "Labeled contraindicated with MAOIs. CYP3A4/2B6 to neurotoxic normeperidine, which seizes in renal impairment and with 3A4 blockade.",
    }),
  d("phenobarbital", "Phenobarbital", ["Luminal"], "Barbiturate anticonvulsant",
    [sub("CYP2C19", "major"), ind("CYP3A4", "strong"), ind("CYP2C9", "strong"), ind("CYP2C19", "moderate"), ind("CYP1A2", "moderate"), ind("P-gp", "moderate")],
    ["cns-depressant", "seizure-lowering"],
    "Loss of victim-drug efficacy (OCPs, DOACs, ketamine); stacked sedation",
    {
      aliases: ["phenobarbitone"],
      note: "Strong pan-CYP inducer after 1–2 weeks, like carbamazepine. Barbiturate PD with alcohol/opioids is additive apnea.",
    }),
  d("efavirenz", "Efavirenz", ["Sustiva", "Atripla"], "NNRTI antiretroviral",
    [sub("CYP2B6", "sensitive"), ind("CYP3A4", "moderate"), ind("CYP2B6", "moderate")],
    ["qt-possible", "cns-depressant", "seizure-lowering"],
    "Loss of 3A4/2B6 victims (methadone, ketamine); 2B6 PM neurotoxicity",
    {
      aliases: ["sustiva"],
      note: "Sensitive CYP2B6 substrate and a 3A4/2B6 inducer. Classic methadone-withdrawal precipitant. 2B6 PMs get more CNS toxicity.",
    }),
  d("triazolam", "Triazolam", ["Halcion"], "Benzodiazepine",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant", "benzo-zdrug"],
    "Profound sedation with strong 3A4 inhibitors",
    { note: "Sensitive intestinal/hepatic 3A4 substrate. Ritonavir, azoles, and grapefruit are labeled problems." }),
  d("pimozide", "Pimozide", ["Orap"], "Typical antipsychotic",
    [sub("CYP3A4", "sensitive"), sub("CYP1A2", "minor")],
    ["qt-known", "cns-depressant"],
    "TdP — contraindicated with strong 3A4 inhibitors",
    { note: "Narrow-index QT drug. Strong 3A4 inhibitors (clarithromycin, azoles, ritonavir) are labeled contraindicated." }),
  d("thioridazine", "Thioridazine", ["Mellaril"], "Typical antipsychotic",
    [sub("CYP2D6", "sensitive", "clearance", true), inh("CYP2D6", "moderate")],
    ["qt-known", "cns-depressant", "anticholinergic"],
    "TdP — contraindicated with strong 2D6 inhibitors and in 2D6 PMs",
    { note: "Boxed QT warning. Paroxetine, fluoxetine, bupropion, and 2D6 poor metabolizers are a labeled problem." }),
  d("tapentadol", "Tapentadol", ["Nucynta"], "Opioid / NRI analgesic",
    [],
    ["opioid", "cns-depressant", "serotonergic", "seizure-lowering"],
    "Respiratory depression; serotonin syndrome; seizures",
    {
      aliases: ["nucynta"],
      note: "UGT2B7, not CYP. Parent is a μ-agonist plus norepinephrine reuptake blocker — MAOIs and other serotonergics still stack.",
    }),
  d("hydromorphone", "Hydromorphone", ["Dilaudid", "Exalgo"], "Opioid analgesic",
    [],
    ["opioid", "cns-depressant"],
    "Respiratory depression, sedation",
    {
      aliases: ["dilaudid"],
      note: "UGT2B7 to H3G, not CYP. PD with benzos, alcohol, GHB, and xylazine still applies.",
    }),
  d("carisoprodol", "Carisoprodol", ["Soma"], "Carbamate muscle relaxant",
    [sub("CYP2C19", "sensitive", "activation")],
    ["cns-depressant", "seizure-lowering"],
    "Sedation, respiratory depression, meprobamate accumulation in 2C19 PMs",
    {
      aliases: ["soma"],
      note: "Prodrug. CYP2C19 to meprobamate (a barbiturate-like sedative). 2C19 PMs and CBD/fluconazole stack parent plus metabolite.",
    }),
  d("clonidine", "Clonidine", ["Catapres", "Kapvay"], "Central α2-agonist",
    [],
    ["alpha2-agonist", "cns-depressant", "bradycardic"],
    "Sedation and bradycardia; stacked airway risk with opioids",
    {
      aliases: ["catapres"],
      note: "Same α2 family as xylazine, at clinical doses. Naloxone does not reverse the α2 sedation. Rebound hypertension on abrupt stop. Still used for opioid withdrawal when lofexidine is not on the shelf.",
    }),
  d("lofexidine", "Lofexidine", ["Lucemyra"], "α2-agonist (opioid withdrawal)",
    [sub("CYP2D6", "major")],
    ["alpha2-agonist", "cns-depressant", "bradycardic"],
    "Bradycardia, hypotension; sedation naloxone will not reverse",
    {
      aliases: ["lucemyra"],
      note: "FDA-approved for opioid withdrawal. Same α2 family as clonidine and xylazine — naloxone will not reverse it. CYP2D6 substrate; paroxetine and fluoxetine raise exposure and bradycardia.",
    }),
  d("flecainide", "Flecainide", ["Tambocor"], "Class Ic antiarrhythmic",
    [sub("CYP2D6", "major")],
    ["qt-possible"],
    "Arrhythmia, 2D6 victim toxicity",
    { note: "CYP2D6 substrate with a narrow-ish index. Strong 2D6 inhibitors raise levels and QRS/QT risk." }),
  d("oxazepam", "Oxazepam", ["Serax"], "Benzodiazepine",
    [],
    ["cns-depressant", "benzo-zdrug"],
    "Sedation, respiratory depression",
    { note: "UGT-glucuronidated, like lorazepam — often the switch when 3A4/2C19 is blocked. PD stacking still applies." }),
  d("temazepam", "Temazepam", ["Restoril"], "Benzodiazepine",
    [],
    ["cns-depressant", "benzo-zdrug"],
    "Sedation, respiratory depression",
    { note: "Mostly UGT. Cleaner CYP map than diazepam or alprazolam; not a clean PD map with opioids or alcohol." }),
  d("posaconazole", "Posaconazole", ["Noxafil"], "Azole antifungal",
    [inh("CYP3A4", "strong"), inh("P-gp", "moderate")],
    ["qt-possible", "hepatotoxic", "fed-boost"],
    "Victim-drug toxicity via 3A4, QT; oral suspension wants food",
    {
      note: "Strong CYP3A4 inhibitor. Oral ketamine, quetiapine, midazolam, simvastatin, and colchicine all move. The suspension is a fed-state absorption victim — delayed-release tablets are quieter with food. High-fat meal on this desk is that row.",
    }),
  d("isocarboxazid", "Isocarboxazid", ["Marplan"], "Irreversible MAOI",
    [],
    ["maoi", "serotonergic"],
    "Hypertensive crisis, serotonin syndrome",
    { note: "Irreversible MAO-A/B. Same 14-day washout as phenelzine. Tyramine, stimulants, and entactogens are contraindicated." }),
  d("oxcarbazepine", "Oxcarbazepine", ["Trileptal"], "Anticonvulsant",
    [ind("CYP3A4", "moderate"), inh("CYP2C19", "moderate")],
    ["cns-depressant"],
    "Loss of 3A4-victim efficacy (OCPs); 2C19 victim toxicity; hyponatremia",
    { aliases: ["trileptal"], note: "Weaker inducer than carbamazepine, still enough to fail oral contraceptives at higher doses." }),
  d("paliperidone", "Paliperidone", ["Invega"], "Atypical antipsychotic",
    [sub("P-gp", "minor")],
    ["cns-depressant", "qt-possible"],
    "QT, EPS, hyperprolactinemia",
    { note: "9-OH-risperidone. Mostly renal, not CYP2D6 — unlike parent risperidone. QT and PD still apply." }),
  d("desipramine", "Desipramine", ["Norpramin"], "Tricyclic antidepressant",
    [sub("CYP2D6", "sensitive", "clearance", true)],
    ["serotonergic", "cns-depressant", "anticholinergic", "qt-possible", "seizure-lowering"],
    "TCA toxicity, arrhythmia",
    { note: "Sensitive CYP2D6 substrate, narrow-ish index. Paroxetine/fluoxetine/bupropion can spike levels." }),
  d("imipramine", "Imipramine", ["Tofranil"], "Tricyclic antidepressant",
    [sub("CYP2D6", "major"), sub("CYP2C19", "major", "activation")],
    ["serotonergic", "cns-depressant", "anticholinergic", "qt-possible", "seizure-lowering"],
    "TCA toxicity, serotonin syndrome, seizure"),
  d("promethazine", "Promethazine", ["Phenergan"], "Sedating antihistamine",
    [sub("CYP2D6", "major")],
    ["cns-depressant", "anticholinergic", "qt-possible"],
    "Additive sedation, delirium, respiratory depression with opioids",
    {
      aliases: ["phenergan"],
      note: "The window antiemetic. Next to methadone it is airway plus a possible QT drug — not a free nausea drop. Purple-drank stacks are the same map with codeine.",
    }),
  d("doxylamine", "Doxylamine", ["Unisom"], "Sedating antihistamine",
    [],
    ["cns-depressant", "anticholinergic"],
    "Additive sedation and anticholinergic burden",
    { aliases: ["unisom"] }),
  d("chlorpromazine", "Chlorpromazine", ["Thorazine"], "Typical antipsychotic",
    [sub("CYP2D6", "major"), sub("CYP1A2", "major"), inh("CYP2D6", "weak")],
    ["cns-depressant", "anticholinergic", "qt-possible", "seizure-lowering"],
    "Sedation, QT, EPS, stacked anticholinergic load"),
  d("rasagiline", "Rasagiline", ["Azilect"], "MAO-B inhibitor",
    [sub("CYP1A2", "major")],
    ["maoi", "serotonergic"],
    "Serotonin syndrome; pressor with stimulants at higher exposure",
    { note: "Selective MAO-B at labeled doses; selectivity is not a free pass with MDMA, other serotonergics, or ciprofloxacin (1A2)." }),
  d("lemborexant", "Lemborexant", ["Dayvigo"], "Orexin antagonist",
    [sub("CYP3A4", "sensitive")],
    ["cns-depressant"],
    "Sedation, next-day impairment; 3A4 victim",
    { note: "Sensitive 3A4 substrate. Strong 3A4 inhibitors are not recommended." }),

  // —— More food / herb perpetrators ——————————————
  d("piperine", "Black pepper (piperine)", [], "Alkaloid absorption booster",
    [inh("CYP3A4", "moderate"), inh("P-gp", "moderate"), inh("CYP2D6", "weak")],
    [],
    "Raised oral 3A4/P-gp victim exposure",
    {
      kind: "herb",
      aliases: ["black pepper", "bioperine", "piper nigrum"],
      note: "Piperine is a real 3A4/P-gp inhibitor and a bioavailability hack. A heavy pepper extract next to oral ketamine, buspirone, or loperamide is not a seasoning footnote.",
    }),
  d("pomegranate", "Pomegranate juice", [], "Intestinal CYP3A4 inhibitor",
    [inh("CYP3A4", "moderate")],
    [],
    "Raised oral 3A4-victim exposure",
    {
      kind: "food",
      aliases: ["pomegranate", "pom juice"],
      note: "Weaker and less consistent than grapefruit, same intestinal 3A4 neighborhood. Do not treat it as a free grapefruit substitute, or as harmless.",
    }),
  d("starfruit", "Star fruit", [], "Furanocoumarin / nephrotoxin",
    [inh("CYP3A4", "moderate")],
    ["nephrotoxic", "seizure-lowering"],
    "Raised oral 3A4-victim exposure; seizures in CKD",
    {
      kind: "food",
      aliases: ["carambola", "star fruit"],
      note: "3A4 inhibition plus a neurotoxin that seizes in renal failure. Not a cocktail garnish if the GFR is low.",
    }),
  d("licorice", "Licorice root", [], "Mineralocorticoid herb",
    [],
    ["hypokalemic"],
    "Hypokalemia, edema, apparent mineralocorticoid excess — worse QT and digoxin toxicity",
    {
      kind: "herb",
      aliases: ["glycyrrhiza", "glycyrrhizin", "liquorice"],
      note: "Glycyrrhizin blocks 11β-HSD2. Potassium falls. QT drugs and digoxin get more dangerous. Deglycyrrhizinated (DGL) is a different product.",
    }),
  d("ginkgo", "Ginkgo biloba", [], "Herbal antiplatelet",
    [inh("CYP2C19", "weak")],
    ["antiplatelet"],
    "Bleeding with anticoagulants/antiplatelets; weak 2C19 inhibition",
    { kind: "herb", aliases: ["ginkgo biloba", "eb-761"] }),
  d("ginseng", "Panax ginseng", [], "Herbal adaptogen",
    [ind("CYP3A4", "weak")],
    ["hypoglycemic"],
    "Possible loss of 3A4-victim efficacy; stacked hypoglycemia",
    { kind: "herb", aliases: ["asian ginseng", "panax"] }),
  d("milk-thistle", "Milk thistle (silymarin)", [], "Herbal 2C9 / 3A4 modulator",
    [inh("CYP2C9", "weak"), inh("CYP3A4", "weak")],
    ["hepatotoxic"],
    "Modest 2C9/3A4 inhibition — warfarin and oral 3A4 victims can move",
    {
      kind: "herb",
      aliases: ["silymarin", "silybum"],
      note: "Inhibition is modest and formulation-dependent. Still worth mapping next to warfarin or oral ketamine.",
    }),
  d("cruciferous", "Cruciferous vegetables", [], "Dietary CYP1A2 inducer",
    [ind("CYP1A2", "weak")],
    [],
    "Lower 1A2-victim levels (clozapine, olanzapine, caffeine) with a heavy daily load",
    {
      kind: "food",
      aliases: ["broccoli", "brussels sprouts", "cabbage", "kale", "indole-3-carbinol"],
      note: "Same PAH/AhR neighborhood as smoke, much weaker. A kale phase is not smoking a pack, but 1A2 victims can drift. Kale-as-vitamin-K next to warfarin is a different row — search leafy greens.",
    }),

  d("dairy", "Dairy / milk", [], "Calcium-rich meal",
    [],
    [],
    "Chelates fluoroquinolones, tetracyclines, bisphosphonates, and levothyroxine",
    {
      kind: "food",
      aliases: ["milk", "yogurt", "yoghurt", "calcium meal", "cheese sandwich", "latte", "dairy"],
      note: "The calcium in a glass of milk — not the tyramine in aged cheddar. Cipro, tetracycline, Fosamax, and Synthroid never arrive. Separate by several hours. Aged-cheese MAOI is a different row.",
    }),
  d("leafy-greens", "Leafy greens (vitamin K)", [], "Phylloquinone meal",
    [],
    ["vitk-food"],
    "Loss of warfarin anticoagulation",
    {
      kind: "food",
      aliases: ["kale", "spinach", "collards", "swiss chard", "kale smoothie", "vitamin k foods", "dark leafy"],
      note: "Dietary phylloquinone. A kale phase dumps INR; a consistent salad is easier to warfarin-adjust around. The K gummy is a different row. Not 2C9.",
    }),
  d("oatp-juice", "Apple / orange juice", [], "OATP2B1 fruit juice",
    [],
    ["oatp-block"],
    "Lost absorption of fexofenadine, atenolol, nadolol, aliskiren",
    {
      kind: "food",
      aliases: ["apple juice", "orange juice", "oj", "fruit juice", "oatp", "tropicana"],
      note: "OATP2B1/1A2, not CYP3A4. Apple and orange juice cut Allegra, Tenormin, Corgard, and Tekturna. Grapefruit does this AND knocks out gut 3A4 — they are not interchangeable. Acidic-juice-as-amphetamine-acidifier is a different row.",
    }),
  d("coffee", "Coffee / black tea", [], "Polyphenol beverage",
    [],
    ["polyphenol-drink"],
    "Lost levothyroxine and iron absorption — not the 1A2 caffeine row",
    {
      kind: "food",
      aliases: ["espresso", "morning coffee", "black tea", "tea with iron", "tannins", "americano", "coffee"],
      note: "Tannins bind levothyroxine and iron in the gut. Espresso with Synthroid is an empty TSH (Benvenga). Caffeine-as-1A2-substrate is a different bottle. Green-tea extract (EGCG) is the 3A4/liver capsule, not this cup.",
    }),
  d("protein-meal", "High-protein meal", [], "Large-neutral amino acid load",
    [],
    ["protein-load"],
    "Lost levodopa 'on' time",
    {
      kind: "food",
      aliases: ["protein", "steak", "protein shake", "whey", "high protein", "amino acids"],
      note: "Leu/Phe/Tyr compete with levodopa at LAT1 in gut and brain. A protein breakfast next to Sinemet is a motor fluctuation, not CYP. Iron chelation is a separate row.",
    }),
  d("soy", "Soy protein / soy milk", [], "Soy food (T4 binder / vitamin K)",
    [],
    ["vitk-food"],
    "Lost levothyroxine absorption; INR drift with warfarin",
    {
      kind: "food",
      aliases: ["soy milk", "soy protein", "tofu", "edamame", "soy formula", "soya", "soy"],
      note: "Soy binds levothyroxine in the gut and carries some vitamin K. Formula and protein shakes are the row, not a splash of soy sauce (that one is tyramine). Separate from Synthroid by several hours.",
    }),
  d("high-k-foods", "High-potassium foods", [], "Dietary potassium load",
    [],
    ["k-food"],
    "Hyperkalemia with ACEI/ARB and spironolactone",
    {
      kind: "food",
      aliases: ["banana", "salt substitute", "potato", "coconut water", "high potassium", "losalt", "k foods"],
      note: "Bananas, potatoes, salt-substitute KCl, coconut water. Next to lisinopril plus spironolactone this is the hyperK triad without a Slow-K bottle. The potassium-supplement row is separate.",
    }),
  d("histamine-fish", "Aged / histamine fish", [], "Scombroid / histamine meal",
    [],
    ["histamine"],
    "Flushing and headache with isoniazid (and MAOIs)",
    {
      kind: "food",
      aliases: ["tuna", "mackerel", "scombroid", "aged fish", "mahi", "histamine fish"],
      note: "INH blocks diamine oxidase. Tuna or mackerel that would be mild scombroid in anyone becomes a flush-and-headache reaction on isoniazid. MAOIs add a tyramine/histamine overlap — not the cheese plate, a different amine.",
    }),
  d("enteral-feed", "Enteral / tube feed", [], "Continuous nutrition binding",
    [],
    ["enteral"],
    "Lost phenytoin, warfarin, and levothyroxine absorption",
    {
      kind: "food",
      aliases: ["tube feed", "ng feed", "osmolite", "jevity", "enteral nutrition", "tfn", "nasogastric"],
      note: "Bauer 1982. Continuous NG feeds bind phenytoin — levels crash, seizures return. Warfarin and Synthroid also lose the dose. Hold the feed, flush, separate. Not CYP.",
    }),

  // —— Clinic / MAT / street additions ——————————————
  d("dexmedetomidine", "Dexmedetomidine", ["Precedex", "Igalmi"], "Central α2-agonist (IV anesthetic adjunct)",
    [],
    ["alpha2-agonist", "cns-depressant", "bradycardic"],
    "Sedation naloxone will not reverse; bradycardia, stacked airway risk with opioids",
    {
      aliases: ["precedex", "dexmed"],
      note: "Clinical cousin of xylazine and medetomidine. Same α2 map: naloxone reverses the opioid, not the α2. Ketamine-clinic recovery stacks.",
    }),
  d("propofol", "Propofol", ["Diprivan"], "IV anesthetic",
    [sub("CYP2B6", "minor")],
    ["cns-depressant"],
    "Apnea, hypotension; stacked CNS depression with benzos, opioids, ketamine",
    {
      aliases: ["diprivan", "milk of amnesia"],
      note: "Mostly UGT. The CYP row is quiet. PD with midazolam, fentanyl, and ketamine is the airway story.",
    }),
  d("prazosin", "Prazosin", ["Minipress"], "Alpha-1 blocker",
    [],
    ["alpha-blocker"],
    "First-dose syncope; orthostasis with alcohol or PDE5 inhibitors",
    {
      aliases: ["minipress"],
      note: "PTSD-nightmare dose still drops standing blood pressure. Alcohol and sildenafil stack the orthostasis, not a CYP row.",
    }),
  d("seven-oh", "7-Hydroxymitragynine", [], "Kratom μ-agonist (7-OH)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Respiratory depression; 3A4 victim; benzo/alcohol/xylazine airway stack",
    {
      aliases: ["7-oh", "7oh", "7-hydroxymitragynine", "7-oh-mitragynine"],
      note: "Much hotter μ-agonist than mitragynine. Street 7-OH tablets are an opioid map, not a tea map. 3A4 inhibitors raise exposure.",
    }),
  d("nalbuphine", "Nalbuphine", ["Nubain"], "Mixed opioid agonist–antagonist",
    [],
    ["opioid", "cns-depressant", "opioid-antagonist"],
    "Respiratory depression; precipitated withdrawal in full-agonist dependence",
    {
      aliases: ["nubain"],
      note: "Kappa agonist / mu antagonist. Can precipitate withdrawal in a methadone or fentanyl-dependent patient, and still stack CNS depression.",
    }),
  d("guanfacine", "Guanfacine", ["Intuniv", "Tenex"], "Central α2-agonist",
    [sub("CYP3A4", "major")],
    ["alpha2-agonist", "cns-depressant", "bradycardic"],
    "Sedation and bradycardia; 3A4 victim; stacked airway risk with opioids",
    {
      aliases: ["intuniv", "tenex"],
      note: "ADHD α2 agonist. Strong 3A4 inhibitors raise levels. Same naloxone-will-not-reverse family as clonidine and xylazine.",
    }),
  d("primidone", "Primidone", ["Mysoline"], "Barbiturate anticonvulsant (prodrug)",
    [sub("CYP2C19", "major", "activation"), ind("CYP3A4", "strong"), ind("CYP2C9", "strong"), ind("CYP2C19", "moderate"), ind("P-gp", "moderate")],
    ["cns-depressant", "seizure-lowering"],
    "Loss of victim-drug efficacy (OCPs, DOACs, ketamine); stacked sedation",
    {
      aliases: ["mysoline"],
      note: "Activated to phenobarbital. Pan-CYP induction after days to weeks. Same OCP-failure map as carbamazepine.",
    }),
  d("etonitazene", "Etonitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "High-potency μ-agonist respiratory arrest; 3A4 victim toxicity",
    { aliases: ["etazene", "nitazene"] }),
  d("diclazepam", "Diclazepam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Long-acting RC benzo; opioid airway stack, delayed withdrawal",
    {
      aliases: ["chlorodiazepam"],
      note: "Metabolizes toward delorazepam / lorazepam / lormetazepam. Long tail. Treat as a 3A4 benzo next to opioids.",
    }),
  d("vilazodone", "Vilazodone", ["Viibryd"], "SPAR antidepressant",
    [sub("CYP3A4", "major")],
    ["serotonergic", "ssri-snri"],
    "Serotonin syndrome; 3A4 victim",
    { aliases: ["viibryd"], note: "SSRI plus 5-HT1A partial agonist. Strong 3A4 inhibitors raise exposure. MAOIs remain contraindicated." }),
  d("aprepitant", "Aprepitant", ["Emend"], "NK1 antagonist (antiemetic)",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate"), ind("CYP2C9", "weak")],
    [],
    "Raised 3A4-victim levels (oral midazolam, ketamine); modest 2C9 induction (warfarin)",
    {
      aliases: ["emend", "fosaprepitant"],
      note: "Moderate 3A4 inhibitor for a few days around a dose, then a weak 2C9 inducer. Check INR after a course next to warfarin.",
    }),
  d("famotidine", "Famotidine", ["Pepcid"], "H2 blocker",
    [],
    [],
    "Not a CYP perpetrator — the switch when cimetidine is the problem",
    {
      aliases: ["pepcid"],
      note: "Unlike cimetidine, famotidine does not meaningfully inhibit 1A2/2D6/3A4. Put both on the materia when someone asks 'which H2 is safe next to tizanidine.'",
    }),
  d("oxymorphone", "Oxymorphone", ["Opana"], "Opioid analgesic",
    [],
    ["opioid", "cns-depressant"],
    "Respiratory depression, sedation",
    {
      aliases: ["opana"],
      note: "Mostly UGT, not CYP. PD with benzos, alcohol, GHB, and α2-agonists still applies. Alcohol dumps ER oxymorphone.",
    }),
  d("dirty-30", "Dirty 30 (pressed M30)", [], "Street pressed opioid",
    [sub("CYP3A4", "sensitive")],
    ["opioid", "cns-depressant"],
    "Respiratory arrest; contents are not oxycodone",
    {
      aliases: [
        "dirty 30",
        "dirty 30s",
        "dirty thirty",
        "dirty thirties",
        "pressed 30",
        "pressed 30s",
        "blues",
        "m30",
        "m 30",
        "fake perc 30",
        "pressed perc",
        "pressed oxy",
      ],
      note: "Street tablets stamped M30 are typically illicit fentanyl ± xylazine or a nitazene, not pharmaceutical oxycodone. This row is the tablet as sold. Pair xylazine for the α2 stack naloxone will not reverse. Percocet / percs is the real oxycodone + APAP combo.",
    }),
  d("epclusa", "Sofosbuvir / velpatasvir", ["Epclusa"], "HCV DAA",
    [sub("P-gp", "major"), inh("P-gp", "moderate"), sub("CYP3A4", "minor")],
    ["hepatotoxic"],
    "Loss of DAA exposure with strong inducers — not a methadone dump",
    {
      aliases: ["epclusa", "sofosbuvir", "velpatasvir", "sof/vel"],
      note: "Pan-genotypic HCV treatment common on MAT desks. Strong inducers (rifampin, carbamazepine, St. John's wort) are labeled contraindicated — the DAA fails. Methadone exposure usually does not dump. Contrast rifampin next to methadone, which does.",
    }),

  // —— Clinic staples (primary / IM / transplant / endocrine) ———
  d("azathioprine", "Azathioprine", ["Imuran", "Azasan"], "Thiopurine immunosuppressant",
    [],
    ["immunosuppressant"],
    "Marrow suppression — xanthine oxidase blockade is labeled",
    {
      aliases: ["imuran", "aza", "azasan"],
      note: "Prodrug to 6-MP. Xanthine oxidase (allopurinol, febuxostat) and TPMT both clear 6-MP; block XO and the marrow sees a multiple of the dose. Not a CYP isoform on this desk.",
    }),
  d("mercaptopurine", "Mercaptopurine", ["Purinethol", "Purixan"], "Thiopurine antimetabolite",
    [],
    ["immunosuppressant"],
    "Marrow suppression with xanthine oxidase inhibitors",
    {
      aliases: ["6-mp", "6mp", "6-mercaptopurine", "purinethol"],
      note: "The active thiopurine. Same XO map as azathioprine. Allopurinol is a labeled dose-cut or hold, not a gout footnote.",
    }),
  d("febuxostat", "Febuxostat", ["Uloric"], "Xanthine oxidase inhibitor",
    [],
    [],
    "Boxed CV death; marrow suppression with azathioprine / 6-MP",
    {
      aliases: ["uloric"],
      note: "Same XO enzyme as allopurinol. Coadministration with azathioprine or 6-MP is contraindicated. Not a CYP perpetrator.",
    }),
  d("terbinafine", "Terbinafine", ["Lamisil"], "Allylamine antifungal",
    [inh("CYP2D6", "strong")],
    ["hepatotoxic"],
    "2D6 victim toxicity; hepatotoxicity",
    {
      aliases: ["lamisil"],
      note: "Weeks of nail-fungus Lamisil is a strong 2D6 inhibitor. Metoprolol, desipramine, tamoxifen activation, and codeine all move. Not an azole — the 3A4 row stays quiet.",
    }),
  d("mirabegron", "Mirabegron", ["Myrbetriq"], "Beta-3 agonist (OAB)",
    [sub("CYP3A4", "minor"), inh("CYP2D6", "moderate")],
    [],
    "Raised 2D6-victim levels; hypertension",
    {
      aliases: ["myrbetriq"],
      note: "Moderate 2D6 inhibitor at the OAB dose. Metoprolol, desipramine, and tamoxifen can move. Not an anticholinergic — that is oxybutynin on this desk.",
    }),
  d("fenofibrate", "Fenofibrate", ["Tricor", "Trilipix", "Antara"], "Fibrate",
    [inh("CYP2C9", "weak")],
    ["fibrate"],
    "Myopathy with statins (preferable to gemfibrozil)",
    {
      aliases: ["tricor", "trilipix", "fenofibric acid"],
      note: "Still a statin × fibrate myopathy pair, usually major rather than the gemfibrozil–simvastatin contraindication. Weak 2C9 — warfarin INR can drift.",
    }),
  d("isosorbide-mononitrate", "Isosorbide mononitrate", ["Imdur", "Monoket"], "Nitrate",
    [],
    ["nitrate"],
    "Catastrophic hypotension with PDE5 inhibitors",
    {
      aliases: ["imdur", "ismn", "isosorbide", "isosorbide mn"],
      note: "The daily angina nitrate. Same PDE5 map as nitroglycerin — Viagra, Cialis, Levitra, and poppers. Not a CYP substrate.",
    }),
  d("ranolazine", "Ranolazine", ["Ranexa"], "Antianginal",
    [sub("CYP3A4", "sensitive"), inh("CYP2D6", "moderate"), sub("P-gp", "major"), inh("P-gp", "moderate")],
    ["qt-possible"],
    "QT; 3A4 victim toxicity — labeled with strong inhibitors",
    {
      aliases: ["ranexa"],
      note: "Sensitive 3A4 substrate. Strong 3A4 inhibitors (clarithromycin, azoles, ritonavir) are labeled contraindicated. Also a moderate 2D6 inhibitor.",
    }),
  d("ticagrelor", "Ticagrelor", ["Brilinta"], "P2Y12 inhibitor",
    [sub("CYP3A4", "major"), inh("CYP3A4", "weak"), sub("P-gp", "major")],
    ["antiplatelet"],
    "Bleeding; loss of effect with strong 3A4 inducers",
    {
      aliases: ["brilinta"],
      note: "Not a prodrug — unlike clopidogrel, 2C19 PPIs do not blunt it. Strong 3A4 inhibitors/inducers and aspirin >100 mg are the labeled problems.",
    }),
  d("hydroxychloroquine", "Hydroxychloroquine", ["Plaquenil"], "DMARD / antimalarial",
    [sub("CYP2D6", "minor"), sub("CYP3A4", "minor"), sub("CYP2C8", "minor")],
    ["qt-possible"],
    "Retinopathy, QT, cardiomyopathy",
    {
      aliases: ["plaquenil", "hcq"],
      note: "The CYP row is quiet. QT plus another known-QT drug (citalopram, methadone, ondansetron) is the collision, plus the eye exam.",
    }),
  d("sumatriptan", "Sumatriptan", ["Imitrex"], "Triptan",
    [],
    ["serotonergic"],
    "Serotonin syndrome with MAOIs; vasospasm",
    {
      aliases: ["imitrex"],
      note: "MAO-A, not CYP. Phenelzine and other MAOIs are labeled contraindicated. An SSRI pair is the usual warning, not the MAOI row.",
    }),
  d("eletriptan", "Eletriptan", ["Relpax"], "Triptan",
    [sub("CYP3A4", "sensitive")],
    ["serotonergic"],
    "3A4 victim toxicity; serotonin syndrome with MAOIs",
    {
      aliases: ["relpax"],
      note: "The CYP triptan. Strong 3A4 inhibitors are labeled — do not give Relpax within 72 h of clarithromycin, azoles, or ritonavir. Sumatriptan is the MAO-A cousin.",
    }),
  d("budesonide", "Budesonide (oral / gut)", ["Entocort", "Uceris", "Pulmicort"], "Corticosteroid",
    [sub("CYP3A4", "sensitive")],
    [],
    "Iatrogenic Cushing / adrenal suppression with 3A4 inhibitors",
    {
      aliases: ["entocort", "uceris", "pulmicort"],
      note: "Oral Entocort/Uceris is a sensitive gut 3A4 first-pass victim — ketoconazole and grapefruit make a 'local' steroid systemic. Inhaled Pulmicort is quieter than fluticasone next to ritonavir, not zero.",
    }),
  d("dexamethasone", "Dexamethasone", ["Decadron", "DexPak"], "Corticosteroid",
    [sub("CYP3A4", "major"), ind("CYP3A4", "moderate")],
    [],
    "Loss of 3A4-victim efficacy after days of induction",
    {
      aliases: ["decadron", "dexpak", "dex"],
      note: "Substrate and moderate 3A4 inducer. A few days of Decadron can dump OCPs, DOACs, and oral midazolam. Prednisone on this desk is not that inducer.",
    }),
  d("eplerenone", "Eplerenone", ["Inspra"], "Mineralocorticoid antagonist",
    [sub("CYP3A4", "sensitive")],
    ["k-sparing"],
    "Hyperkalemia; 3A4 victim — labeled with strong inhibitors",
    {
      aliases: ["inspra"],
      note: "Sensitive 3A4 substrate. Strong 3A4 inhibitors are contraindicated. Spironolactone is the cousin without the CYP row — both still hyperkalemia next to an ACEI/ARB.",
    }),
  d("nifedipine", "Nifedipine", ["Procardia", "Adalat", "Nifedical"], "Dihydropyridine CCB",
    [sub("CYP3A4", "sensitive")],
    [],
    "Hypotension, edema — grapefruit is labeled",
    {
      aliases: ["procardia", "adalat"],
      note: "Sensitive 3A4, more first-pass than amlodipine. Grapefruit and azoles raise parent. IR nifedipine is the old hypotension trap; ER is still a 3A4 victim. Felodipine is the original Lancet juice paper.",
    }),
  d("felodipine", "Felodipine", ["Plendil"], "Dihydropyridine CCB",
    [sub("CYP3A4", "sensitive")],
    [],
    "Hypotension, edema — the original grapefruit victim",
    {
      aliases: ["plendil"],
      note: "Bailey 1991. Intestinal 3A4 first-pass is the whole story. Grapefruit raises F; hepatic 3A4 (an IV map) barely moves. Amlodipine is the quieter cousin; nifedipine is on this shelf too.",
    }),
  d("glimepiride", "Glimepiride", ["Amaryl"], "Sulfonylurea",
    [sub("CYP2C9", "major")],
    ["hypoglycemic", "insulin-secretagogue"],
    "Hypoglycemia — 2C9 PMs and inhibitors raise parent",
    { aliases: ["amaryl"] }),
  d("pioglitazone", "Pioglitazone", ["Actos"], "Thiazolidinedione",
    [sub("CYP2C8", "sensitive"), sub("CYP3A4", "minor")],
    ["hypoglycemic"],
    "Edema, heart failure; 2C8 victim (gemfibrozil)",
    {
      aliases: ["actos"],
      note: "Sensitive CYP2C8 substrate. Gemfibrozil is a strong 2C8 inhibitor — labeled dose cap or avoid. Fluid retention next to a glitazone is PD, not this curve.",
    }),
  d("empagliflozin", "Empagliflozin", ["Jardiance"], "SGLT2 inhibitor",
    [],
    ["nephrotoxic"],
    "Euglycemic DKA, genital mycosis, volume depletion",
    {
      aliases: ["jardiance"],
      note: "UGT, not CYP. The collision is volume/AKI next to a diuretic or ACEI, and DKA with a sick day — not a cytochrome row. Stacked hypo with a sulfonylurea is still real.",
    }),
  d("dapagliflozin", "Dapagliflozin", ["Farxiga"], "SGLT2 inhibitor",
    [],
    ["nephrotoxic"],
    "Euglycemic DKA, genital mycosis, volume depletion",
    {
      aliases: ["farxiga"],
      note: "Same SGLT2 map as empagliflozin. Not a CYP substrate. Search jardiance if you want the class.",
    }),
  d("semaglutide", "Semaglutide", ["Ozempic", "Wegovy", "Rybelsus"], "GLP-1 agonist",
    [],
    [],
    "Stacked hypoglycemia with sulfonylureas / insulin; delayed gastric emptying",
    {
      aliases: ["ozempic", "wegovy", "rybelsus", "sema"],
      note: "Peptide. Not a CYP substrate. Delayed gastric emptying can slow oral drugs (including OCPs and some desk victims). Hypoglycemia is the SU/insulin pair, not metformin.",
    }),
  d("tirzepatide", "Tirzepatide", ["Mounjaro", "Zepbound"], "GIP / GLP-1 agonist",
    [],
    [],
    "Stacked hypoglycemia with sulfonylureas / insulin",
    {
      aliases: ["mounjaro", "zepbound"],
      note: "Same peptide map as semaglutide — no CYP, delayed emptying, hypo with a secretagogue.",
    }),
  d("sirolimus", "Sirolimus", ["Rapamune"], "mTOR inhibitor",
    [sub("CYP3A4", "sensitive", "clearance", true), sub("P-gp", "major")],
    ["immunosuppressant"],
    "NTI — infection, marrow, hyperlipidemia; 3A4/P-gp victim",
    {
      aliases: ["rapamune", "rapamycin"],
      note: "Narrow index like tacrolimus. Azoles, grapefruit, and ritonavir multiply AUC. Inducers dump it and risk rejection. Not a dose.",
    }),
  d("mycophenolate", "Mycophenolate", ["CellCept", "Myfortic"], "Antimetabolite immunosuppressant",
    [],
    ["immunosuppressant"],
    "Marrow suppression, GI toxicity, infection",
    {
      aliases: ["cellcept", "myfortic", "mmf", "mycophenolate mofetil"],
      note: "UGT, not CYP. PPIs and antacids cut absorption. The azathioprine/XO story is a different antimetabolite.",
    }),
  d("metoclopramide", "Metoclopramide", ["Reglan"], "Prokinetic / D2 antagonist",
    [sub("CYP2D6", "major")],
    ["cns-depressant"],
    "Tardive dyskinesia, EPS — 2D6 PMs and inhibitors raise exposure",
    {
      aliases: ["reglan"],
      note: "Boxed tardive warning. 2D6 PMs and strong 2D6 inhibitors (paroxetine, fluoxetine, bupropion, terbinafine) raise parent. Not an ondansetron QT cousin.",
    }),
  d("diclofenac", "Diclofenac", ["Voltaren", "Cataflam", "Flector"], "NSAID",
    [sub("CYP2C9", "major")],
    ["nsaid", "nephrotoxic", "hepatotoxic"],
    "GI bleed, AKI, hepatotoxicity",
    { aliases: ["voltaren", "cataflam"] }),
  d("meloxicam", "Meloxicam", ["Mobic"], "NSAID",
    [sub("CYP2C9", "major")],
    ["nsaid", "nephrotoxic"],
    "GI bleed, AKI",
    { aliases: ["mobic"] }),
  d("ketorolac", "Ketorolac", ["Toradol"], "NSAID",
    [sub("CYP2C9", "minor")],
    ["nsaid", "nephrotoxic"],
    "GI bleed, AKI — 5-day ceiling",
    {
      aliases: ["toradol"],
      note: "The IM/IV NSAID. Same ACEI × NSAID GFR hit and MTX clearance story as ibuprofen, louder GI. Not a CYP perpetrator.",
    }),
  d("fluticasone", "Fluticasone", ["Flonase", "Flovent", "Advair"], "Inhaled / nasal corticosteroid",
    [sub("CYP3A4", "sensitive")],
    [],
    "Iatrogenic Cushing with strong 3A4 inhibitors (ritonavir)",
    {
      aliases: ["flonase", "flovent", "advair", "arnuity"],
      note: "Swallowed fraction is a sensitive 3A4 first-pass victim. Ritonavir/cobicistat plus Flonase is the classic iatrogenic Cushing / adrenal pair. Not 'just a spray.'",
    }),
  d("fexofenadine", "Fexofenadine", ["Allegra"], "Second-generation antihistamine",
    [sub("P-gp", "major")],
    [],
    "Loss of effect with fruit juice (OATP); raised levels with P-gp block",
    {
      aliases: ["allegra"],
      note: "P-gp/OATP, not CYP. Apple/orange/grapefruit juice cut absorption (search apple juice). Verapamil and other P-gp inhibitors raise it. The one 2nd-gen antihistamine with a transporter map. Juice is loss of effect, not a CYP rise.",
    }),
  d("oxybutynin", "Oxybutynin", ["Ditropan", "Oxytrol"], "Antimuscarinic (OAB)",
    [sub("CYP3A4", "major")],
    ["anticholinergic", "cns-depressant"],
    "Delirium, retention — stacked anticholinergic burden",
    {
      aliases: ["ditropan", "oxytrol"],
      note: "3A4 to N-desethyloxybutynin. Strong inhibitors raise parent. PD with diphenhydramine, hydroxyzine, TCAs, and benztropine is delirium in older adults. Mirabegron is the non-anticholinergic OAB switch.",
    }),
  d("enoxaparin", "Enoxaparin", ["Lovenox"], "LMWH",
    [],
    ["anticoagulant"],
    "Bleeding with antiplatelets / NSAIDs",
    {
      aliases: ["lovenox", "lmwh"],
      note: "Not a CYP substrate. The collision is stacked bleeding with NSAIDs, aspirin, SSRIs, and DOACs — not a cytochrome row.",
    }),
  d("atenolol", "Atenolol", ["Tenormin"], "Beta blocker",
    [],
    ["beta-blocker", "bradycardic"],
    "Bradycardia, heart block, hypotension",
    {
      aliases: ["tenormin"],
      note: "Renal, not CYP2D6. The switch when metoprolol is a 2D6 victim (paroxetine, terbinafine, 2D6 PM). Apple/orange juice cut OATP absorption — search apple juice. PD with non-DHP CCBs still applies.",
    }),
  d("nadolol", "Nadolol", ["Corgard"], "Beta blocker (OATP)",
    [],
    ["beta-blocker", "bradycardic"],
    "Lost effect with fruit juice and green tea (OATP)",
    {
      aliases: ["corgard"],
      note: "Renal, not 2D6. OATP1A2 substrate — green tea and apple/orange juice cut AUC sharply (Misaka). Atenolol is the quieter cousin on the same transporter. Not a CYP row.",
    }),
  d("valsartan", "Valsartan", ["Diovan"], "ARB",
    [],
    ["acei-arb", "nephrotoxic"],
    "Hyperkalemia, acute kidney injury",
    {
      aliases: ["diovan"],
      note: "OATP, not CYP — unlike losartan, which needs 2C9 activation. Same RAAS PD: NSAID GFR hit, K-sparing hyperkalemia, lithium. Fruit juice dumping aliskiren is a different OATP row.",
    }),
  d("aliskiren", "Aliskiren", ["Tekturna"], "Direct renin inhibitor",
    [],
    ["acei-arb", "nephrotoxic"],
    "Lost absorption with fruit juice (OATP); hyperkalemia with ACEI/ARB",
    {
      aliases: ["tekturna", "rasilez"],
      note: "OATP2B1. Apple, orange, and grapefruit juice dump aliskiren. Dual RAAS block with an ACEI is a different, labeled problem. Not a CYP substrate.",
    }),
  d("chlorthalidone", "Chlorthalidone", ["Thalitone"], "Thiazide-like diuretic",
    [],
    ["loop-thiazide"],
    "Hyponatremia, hypokalemia, gout, lithium rise",
    {
      aliases: ["thalitone"],
      note: "Longer than HCTZ, same lithium and ACEI/NSAID triple-whammy map. Not a CYP substrate.",
    }),
  d("amoxicillin", "Amoxicillin", ["Amoxil", "Augmentin"], "Beta-lactam antibiotic",
    [],
    [],
    "Hypersensitivity; not a CYP perpetrator",
    {
      aliases: ["amoxil", "augmentin", "amox", "amoxicillin-clavulanate"],
      note: "The quiet penicillin. Unlike clarithromycin it does not inhibit 3A4, and unlike TMP-SMX it does not raise MTX or potassium. Put it next to warfarin if you want the desk to stay mostly quiet.",
    }),
  d("cephalexin", "Cephalexin", ["Keflex"], "Cephalosporin",
    [],
    [],
    "Hypersensitivity; not a CYP perpetrator",
    { aliases: ["keflex"] }),
  d("doxycycline", "Doxycycline", ["Vibramycin", "Doryx"], "Tetracycline antibiotic",
    [],
    [],
    "Photosensitivity; chelation with cations — not a CYP perpetrator",
    {
      aliases: ["vibramycin", "doryx", "doxy"],
      note: "Not an inducer like rifampin and not a 3A4 inhibitor like clarithromycin. Cations and dairy still bind it, less brutally than tetracycline itself. Isotretinoin is the other labeled problem.",
    }),
  d("tetracycline", "Tetracycline", [], "Tetracycline antibiotic",
    [],
    [],
    "Chelation with dairy and cations — the original milk trap",
    {
      aliases: ["sumycin", "achaomycin"],
      note: "More dairy-sensitive than doxycycline. A glass of milk can empty the course. Not an inducer and not a 3A4 inhibitor. Cations are the map.",
    }),
  d("alendronate", "Alendronate", ["Fosamax"], "Bisphosphonate",
    [],
    ["empty-stomach"],
    "Lost absorption with any food, dairy, or cations — take fasting upright",
    {
      aliases: ["fosamax", "bisphosphonate", "alendronic", "risedronate", "actonel"],
      note: "Anything in the stomach kills F. Dairy, calcium, coffee, a meal. Thirty minutes before food, full glass of water, stay upright. Not a CYP substrate. Risedronate is the same empty-stomach map.",
    }),
  d("albuterol", "Albuterol", ["ProAir", "Ventolin", "Proventil"], "Short-acting beta-2 agonist",
    [],
    [],
    "Tachycardia, hypokalemia at high dose — not a CYP substrate",
    { aliases: ["salbutamol", "proair", "ventolin", "proventil"] }),
  d("cetirizine", "Cetirizine", ["Zyrtec"], "Second-generation antihistamine",
    [],
    [],
    "Somnolence at high dose — not a CYP perpetrator",
    {
      aliases: ["zyrtec"],
      note: "Renal, not CYP. The switch when hydroxyzine or diphenhydramine would stack anticholinergic and QT load. Fexofenadine is the P-gp cousin.",
    }),
  d("sitagliptin", "Sitagliptin", ["Januvia"], "DPP-4 inhibitor",
    [],
    [],
    "Rare pancreatitis; modest glucose effect — not a CYP substrate",
    { aliases: ["januvia"] }),
  d("benztropine", "Benztropine", ["Cogentin"], "Antimuscarinic (EPS)",
    [],
    ["anticholinergic", "cns-depressant"],
    "Delirium, retention — stacked anticholinergic burden",
    {
      aliases: ["cogentin"],
      note: "The EPS antidote that is itself an anticholinergic. Stacks with diphenhydramine, oxybutynin, TCAs, hydroxyzine. Not a CYP story.",
    }),
  d("vardenafil", "Vardenafil", ["Levitra", "Staxyn"], "PDE5 inhibitor",
    [sub("CYP3A4", "major")],
    ["pde5"],
    "Severe hypotension with nitrates; QT possible",
    {
      aliases: ["levitra", "staxyn"],
      note: "Same nitrate contraindication as sildenafil. 3A4 victim — azoles and protease inhibitors raise parent.",
    }),
  d("doxazosin", "Doxazosin", ["Cardura"], "Alpha-1 blocker",
    [sub("CYP3A4", "major")],
    ["alpha-blocker"],
    "First-dose syncope; orthostasis with PDE5 inhibitors",
    { aliases: ["cardura"] }),
  d("lansoprazole", "Lansoprazole", ["Prevacid"], "PPI",
    [sub("CYP2C19", "major"), inh("CYP2C19", "weak")],
    [],
    "Weaker clopidogrel interaction than omeprazole",
    {
      aliases: ["prevacid"],
      note: "2C19 substrate, weaker inhibitor than omeprazole/esomeprazole. Pantoprazole is still the usual clopidogrel switch.",
    }),

  // —— Common patient supplements ————————————————
  d("red-yeast-rice", "Red yeast rice", [], "Monacolin K (lovastatin analog)",
    [sub("CYP3A4", "sensitive")],
    ["statin"],
    "Myopathy; 3A4 victim toxicity — this is a statin",
    {
      kind: "herb",
      aliases: ["red yeast", "monacolin", "cholestin", "xuezhikang"],
      note: "Monacolin K is lovastatin. Grapefruit, azoles, and gemfibrozil are the same map as Zocor. 'Natural cholesterol support' is not a free statin.",
    }),
  d("sam-e", "SAM-e", [], "S-adenosylmethionine",
    [],
    ["serotonergic"],
    "Serotonin syndrome with MAOIs, SSRIs, MDMA, tramadol",
    {
      kind: "herb",
      aliases: ["same", "ademetionine", "s-adenosylmethionine"],
      note: "A methyl donor sold for mood and joints. It is serotonergic. Next to an MAOI or an SSRI this is the same PD as 5-HTP, not a wellness footnote.",
    }),
  d("vitamin-k", "Vitamin K (phytonadione / MK-7)", [], "Vitamin K supplement",
    [],
    [],
    "Loss of warfarin anticoagulation",
    {
      kind: "herb",
      aliases: ["phytonadione", "phylloquinone", "menaquinone", "mk-7", "mk7", "vitamin k2", "vitamin k1"],
      note: "The antidote is also a gummy. Kale, MK-7, and IV phytonadione all dump INR. Not a 2C9 story — it bypasses the enzyme.",
    }),
  d("fish-oil", "Fish oil (omega-3)", [], "Omega-3 supplement",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants and other antiplatelets",
    {
      kind: "herb",
      aliases: ["omega-3", "omega 3", "epa", "dha", "lovaza", "icosapent", "krill oil"],
      note: "High-dose EPA/DHA impair platelet aggregation. A gram with dinner is quieter than a 4 g lipid dose next to warfarin or apixaban.",
    }),
  d("garlic", "Garlic extract", [], "Allium supplement",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants / antiplatelets",
    {
      kind: "herb",
      aliases: ["allicin", "allium sativum", "aged garlic"],
      note: "Food garlic is seasoning. Concentrated aged-garlic extracts are the bleed row. Do not stack with warfarin, DOACs, or ginkgo as a 'heart stack.'",
    }),
  d("turmeric", "Turmeric / curcumin", [], "Curcuminoid supplement",
    [inh("CYP3A4", "weak"), inh("CYP2C9", "weak")],
    ["antiplatelet"],
    "Bleeding; modest 3A4/2C9 inhibition at extract doses",
    {
      kind: "herb",
      aliases: ["curcumin", "curcuma", "golden milk", "meriva"],
      note: "Piperine is often co-formulated to raise curcumin — that adds the black-pepper 3A4/P-gp hit already on this shelf. The spice in food is not this extract.",
    }),
  d("vitamin-e", "Vitamin E (high-dose)", [], "Tocopherol supplement",
    [],
    ["antiplatelet"],
    "Bleeding at high IU with anticoagulants",
    {
      kind: "herb",
      aliases: ["tocopherol", "alpha-tocopherol", "vitamin e"],
      note: "Dietary E is not the row. Hundreds of IU next to warfarin or a DOAC is the bleed map. Not a CYP perpetrator.",
    }),
  d("yohimbine", "Yohimbine", [], "α2-antagonist (sexual / stimulant herb)",
    [sub("CYP2D6", "major")],
    ["stimulant"],
    "Pressor crisis with MAOIs; 2D6 victim tachycardia",
    {
      kind: "herb",
      aliases: ["yohimbe", "pausinystalia", "aphrodyne"],
      note: "α2 blockade raises NE. MAOIs, stimulants, and 2D6 PMs are a pressor and arrhythmia story. Not a gym footnote.",
    }),
  d("quercetin", "Quercetin", [], "Flavonol supplement",
    [inh("CYP3A4", "moderate"), inh("P-gp", "moderate"), inh("CYP2C8", "moderate")],
    [],
    "Raised oral 3A4/P-gp and 2C8 victim levels",
    {
      kind: "herb",
      aliases: ["flavonol", "sophora"],
      note: "A real 3A4/P-gp/2C8 inhibitor at supplement grams. Next to simvastatin, oral ketamine, or repaglinide it is a perpetrator, not a bioflavonoid.",
    }),
  d("green-tea", "Green tea extract (EGCG)", [], "Catechin supplement",
    [inh("CYP3A4", "weak"), inh("P-gp", "weak")],
    ["hepatotoxic", "antiplatelet", "oatp-block"],
    "Hepatotoxicity of concentrated extract; bleed; OATP/P-gp victims can fall",
    {
      kind: "herb",
      aliases: ["egcg", "camellia sinensis", "matcha extract", "green tea"],
      note: "A cup of tea is not this row — coffee/black tea on this shelf is the tannin-Synthroid map. Concentrated EGCG has a liver signal. Also an OATP bully: nadolol and atenolol fall (Misaka). Next to Corgard it is loss of beta blockade, not a CYP rise.",
    }),
  d("calcium", "Calcium supplement", [], "Divalent cation",
    [],
    [],
    "Chelates fluoroquinolones, tetracyclines, and levothyroxine",
    {
      kind: "herb",
      aliases: ["calcium carbonate", "calcium citrate", "os-cal", "caltrate", "tums extra"],
      note: "Absorption, not CYP. Separate from Cipro, doxycycline, and Synthroid by several hours. Tums-as-alkalinizer (amphetamine urine) is a different row.",
    }),
  d("iron", "Iron supplement", [], "Divalent cation",
    [],
    [],
    "Chelates fluoroquinolones, tetracyclines, and levothyroxine",
    {
      kind: "herb",
      aliases: ["ferrous sulfate", "ferrous gluconate", "ferrous fumarate", "feosol"],
      note: "Same gut chelation as calcium. A prenatal plus morning levothyroxine is a classic empty TSH. Not a CYP row.",
    }),
  d("magnesium", "Magnesium supplement", [], "Divalent cation",
    [],
    [],
    "Chelates fluoroquinolones, tetracyclines, and levothyroxine",
    {
      kind: "herb",
      aliases: ["magnesium oxide", "magnesium citrate", "magnesium glycinate", "milk of magnesia"],
      note: "Sleep and constipation doses still chelate. Separate from Cipro, doxycycline, and levothyroxine. Not a GABA occupancy.",
    }),
  d("zinc", "Zinc supplement", [], "Divalent cation",
    [],
    [],
    "Chelates fluoroquinolones, tetracyclines, and levothyroxine",
    {
      kind: "herb",
      aliases: ["zinc sulfate", "zinc picolinate", "zinc gluconate"],
      note: "Cold lozenges and 'immune' grams still bind the same drugs in the gut. Separate the dose.",
    }),
  d("niacin", "Niacin (nicotinic acid)", [], "Vitamin B3 (lipid dose)",
    [],
    ["hepatotoxic"],
    "Myopathy with statins; hepatotoxicity at gram doses",
    {
      kind: "herb",
      aliases: ["nicotinic acid", "vitamin b3", "niaspan", "nicotinamide"],
      note: "Flush niacin at lipid grams is the row — not a B-complex. Stacked with a statin (including red yeast rice) it is a muscle/liver map. Nicotinamide is a different product.",
    }),
  d("potassium", "Potassium supplement", [], "Electrolyte supplement",
    [],
    ["k-sparing"],
    "Hyperkalemia with ACEI/ARB and spironolactone",
    {
      kind: "herb",
      aliases: ["kcl", "potassium chloride", "klor-con", "slow-k"],
      note: "Salt-substitute potassium plus lisinopril plus spironolactone is the hyperK triad. The desk already scores ACEI × K-sparing — this is the third bottle.",
    }),
  d("senna", "Senna", [], "Stimulant laxative",
    [],
    ["hypokalemic"],
    "Hypokalemia — worse QT and digoxin toxicity",
    {
      kind: "herb",
      aliases: ["sennosides", "senokot", "ex-lax"],
      note: "Chronic stimulant laxatives drop potassium. Same QT/digoxin map as licorice, different mechanism. Not a CYP row.",
    }),
  d("arginine", "L-arginine", [], "Nitric-oxide precursor",
    [],
    [],
    "Additive hypotension with PDE5 inhibitors",
    {
      kind: "herb",
      aliases: ["l-arginine", "arg", "nitric oxide booster", "pre-workout arginine"],
      note: "NO substrate. Next to sildenafil/tadalafil it is stacked vasodilation, quieter than a nitrate but not nothing. Pre-workout plus a weekend pill.",
    }),
  d("glucosamine", "Glucosamine", [], "Aminosugar (joint)",
    [],
    [],
    "INR rise with warfarin (formulation-dependent)",
    {
      kind: "herb",
      aliases: ["glucosamine sulfate", "gs", "joint supplement", "chondroitin", "osteo bi-flex"],
      note: "Often paired with chondroitin. Warfarin INR can climb. Not a 2C9 inhibitor — a hemostasis footnote. Quiet next to a DOAC in most maps.",
    }),
  d("cranberry", "Cranberry extract", [], "Vaccinium supplement",
    [inh("CYP2C9", "weak")],
    [],
    "Possible INR rise with warfarin",
    {
      kind: "herb",
      aliases: ["vaccinium", "cranberry juice", "uti supplement"],
      note: "Weak 2C9 story, inconsistent. A UTI capsule next to warfarin is worth mapping; a splash of juice is not grapefruit. Orange-juice-as-acidifier is a different row.",
    }),
  d("cinnamon", "Cinnamon extract", [], "Cassia / cinnamaldehyde",
    [],
    ["hypoglycemic"],
    "Stacked hypoglycemia with secretagogues",
    {
      kind: "herb",
      aliases: ["cassia", "cinnamomum", "ceylon cinnamon"],
      note: "Cassia extracts can lower glucose. Next to glipizide or insulin that is a hypo row. Coumarin in cassia is a liver footnote at high dose — not warfarin vitamin K.",
    }),
  d("ashwagandha", "Ashwagandha", [], "Withania (adaptogen)",
    [],
    ["cns-depressant", "hepatotoxic"],
    "Additive sedation; rare herb-induced liver injury",
    {
      kind: "herb",
      aliases: ["withania", "withania somnifera", "ksm-66", "sensoril"],
      note: "GABA-adjacent sedation plus a real, uncommon hepatitis signal. Next to benzos or alcohol it is CNS. Next to kava or green-tea extract it is stacked liver.",
    }),
  d("passionflower", "Passionflower", [], "Herbal sedative",
    [],
    ["cns-depressant"],
    "Additive sedation with benzos, alcohol, valerian",
    {
      kind: "herb",
      aliases: ["passiflora", "passiflora incarnata"],
      note: "Sold in sleep teas with valerian. Same CNS stack, not a CYP perpetrator.",
    }),
  d("chamomile", "Chamomile", [], "Herbal sedative / antiplatelet",
    [],
    ["cns-depressant", "antiplatelet"],
    "Sedation plus bleeding with anticoagulants",
    {
      kind: "herb",
      aliases: ["matricaria", "german chamomile", "chamaemelum"],
      note: "A tea is quieter than an extract. Coumarin-adjacent plus sedation. Next to warfarin it is a bleed footnote, not a 2C9 hammer.",
    }),
  d("black-cohosh", "Black cohosh", [], "Cimicifuga (menopausal herb)",
    [],
    ["hepatotoxic"],
    "Herb-induced liver injury",
    {
      kind: "herb",
      aliases: ["cimicifuga", "actaea racemosa", "remifemin"],
      note: "Menopause shelf. The map is hepatotoxicity, not estrogen occupancy. Stacked with kava, EGCG, or niacin is a liver row.",
    }),
  d("dong-quai", "Dong quai", [], "Angelica (coumarin herb)",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants",
    {
      kind: "herb",
      aliases: ["angelica sinensis", "dang gui", "female ginseng"],
      note: "Coumarin-containing herb. Warfarin and DOACs are the bleed row. Not a CYP inducer like St. John's wort.",
    }),
  d("feverfew", "Feverfew", [], "Migraine herb (antiplatelet)",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants / antiplatelets",
    {
      kind: "herb",
      aliases: ["tanacetum", "tanacetum parthenium"],
      note: "Migraine prevention herb. Platelet effects plus NSAID stacks. Not a triptan 3A4 story.",
    }),
  d("coq10", "Coenzyme Q10", [], "Ubiquinone supplement",
    [],
    [],
    "Possible INR drop with warfarin",
    {
      kind: "herb",
      aliases: ["coq-10", "ubiquinone", "ubiquinol", "coenzyme q"],
      note: "Vitamin K–like structure. Warfarin INR can fall — quieter and less consistent than a K gummy. Statin-associated muscle is why people buy it, not a myopathy pair on this desk.",
    }),
  d("hawthorn", "Hawthorn", [], "Crataegus (cardiac herb)",
    [],
    ["bradycardic"],
    "Additive hypotension / bradycardia with antihypertensives and digoxin",
    {
      kind: "herb",
      aliases: ["crataegus", "hawthorn berry", "crataegus oxyacantha"],
      note: "Inotrope/vasodilator folklore with a real BP drop. Next to digoxin or a beta blocker it is PD, not CYP.",
    }),
  d("mucuna", "Mucuna pruriens (L-DOPA)", [], "Dopamine precursor herb",
    [],
    ["stimulant"],
    "Pressor crisis with MAOIs; stacked dopaminergic load",
    {
      kind: "herb",
      aliases: ["mucuna", "velvet bean", "l-dopa herb", "cowhage"],
      note: "Contains levodopa. MAOIs are a pressor row. Not a 2D6 story. Parkinson's patients sometimes use it off-label — this is not a dosing protocol.",
    }),
  d("biotin", "Biotin (high-dose)", [], "Vitamin B7",
    [],
    [],
    "Lab interference (troponin, thyroid) — not a CYP collision",
    {
      kind: "herb",
      aliases: ["vitamin b7", "vitamin h", "hair skin nails"],
      note: "The desk stays quiet on CYP/PD. High-dose biotin falsely deranges TSH, troponin, and some hormone assays. The collision is the lab, not the liver.",
    }),
  d("folate", "Folic acid / folate", [], "Vitamin B9",
    [],
    [],
    "Oncology MTX efficacy vs rheumatology rescue — context, not CYP",
    {
      kind: "herb",
      aliases: ["folic acid", "vitamin b9", "methylfolate", "l-methylfolate", "5-mthf"],
      note: "Rheumatology gives folate with methotrexate on purpose. Oncology does not want it competing. This pair stays quiet so the desk does not scold a RA protocol. Not a 2C9 story.",
    }),
  d("vitamin-d", "Vitamin D (cholecalciferol)", [], "Vitamin D3",
    [sub("CYP3A4", "minor")],
    [],
    "3A4 is a minor activation path — usually quiet",
    {
      kind: "herb",
      aliases: ["cholecalciferol", "vitamin d3", "ergocalciferol", "vitamin d"],
      note: "25-hydroxylation is not 3A4. 3A4 helps inactivate calcitriol. Strong inducers can lower 25-OH-D over weeks. A daily 2000 IU next to a statin should stay quiet.",
    }),
  d("berberine", "Berberine", [], "Isoquinoline alkaloid (glucose / lipid)",
    [inh("CYP2D6", "moderate"), inh("CYP3A4", "moderate"), inh("P-gp", "moderate"), inh("CYP2C9", "weak")],
    ["hypoglycemic"],
    "Raised 2D6/3A4/P-gp victims; stacked hypoglycemia",
    {
      kind: "herb",
      aliases: ["berberine hcl", "berberine hydrochloride", "oregon grape", "coptis"],
      note: "The capsule, not the goldenseal tea. Same 2D6/3A4/P-gp bully plus a metformin-like glucose drop. Next to simvastatin, oral ketamine, or glipizide it is a perpetrator. Goldenseal is the plant row.",
    }),
  d("saw-palmetto", "Saw palmetto", [], "Serenoa (BPH herb)",
    [inh("CYP3A4", "weak")],
    ["antiplatelet"],
    "Bleeding with anticoagulants; weak 3A4 inhibition",
    {
      kind: "herb",
      aliases: ["serenoa", "serenoa repens", "permixon"],
      note: "Prostate shelf. Antiplatelet plus a weak 3A4 hit. Next to warfarin it is a bleed footnote, not finasteride.",
    }),
  d("echinacea", "Echinacea", [], "Immune herb",
    [inh("CYP1A2", "moderate"), inh("CYP3A4", "weak")],
    [],
    "Raised 1A2-victim levels (tizanidine, clozapine, caffeine)",
    {
      kind: "herb",
      aliases: ["echinacea purpurea", "coneflower", "echinacea angustifolia"],
      note: "Cold-and-flu bottle. 1A2 inhibition is the real map — tizanidine and clozapine move. Short courses; not St. John's wort.",
    }),
  d("bitter-orange", "Bitter orange (synephrine)", [], "Citrus stimulant",
    [],
    ["stimulant"],
    "Pressor crisis with MAOIs; stacked sympathomimetic load",
    {
      kind: "herb",
      aliases: ["synephrine", "citrus aurantium", "p-synephrine", "adrena-lean", "fat burner orange"],
      note: "The 'ephedra-free' fat-burner. α1 agonist. MAOIs, yohimbine, and amphetamines are a pressor stack. Not grapefruit 3A4 — that is a different citrus.",
    }),
  d("rhodiola", "Rhodiola", [], "Adaptogen (weak MAO)",
    [],
    ["serotonergic"],
    "Serotonin syndrome with MAOIs and other serotonergics",
    {
      kind: "herb",
      aliases: ["rhodiola rosea", "arctic root", "golden root"],
      note: "In-vitro MAO inhibition is why it sits next to 5-HTP and SAM-e, not next to ashwagandha as a free adaptogen. Evidence is thinner than phenelzine — still mapped.",
    }),
  d("ala", "Alpha-lipoic acid", [], "Antioxidant / glucose supplement",
    [],
    ["hypoglycemic"],
    "Stacked hypoglycemia with secretagogues and insulin",
    {
      kind: "herb",
      aliases: ["alpha lipoic acid", "thioctic acid", "ala"],
      note: "Neuropathy and 'insulin sensitivity' bottle. Next to glipizide or insulin it is a hypo row. Not a CYP perpetrator.",
    }),
  d("fenugreek", "Fenugreek", [], "Trigonella (glucose / lactation)",
    [],
    ["hypoglycemic", "antiplatelet"],
    "Stacked hypoglycemia; bleeding with anticoagulants",
    {
      kind: "herb",
      aliases: ["trigonella", "methi", "fenugreek seed"],
      note: "Kitchen seed at extract grams. Glucose plus a little bleed. Next to a sulfonylurea or warfarin, not a curry footnote.",
    }),
  d("evening-primrose", "Evening primrose oil", [], "GLA supplement",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants / antiplatelets",
    {
      kind: "herb",
      aliases: ["epo", "oenothera", "gamma-linolenic", "gla"],
      note: "Menopause / eczema bottle. Platelet effects. Quiet on CYP.",
    }),
  d("resveratrol", "Resveratrol", [], "Stilbene supplement",
    [inh("CYP3A4", "moderate"), inh("CYP2C9", "weak")],
    ["antiplatelet"],
    "Raised oral 3A4 victims; bleed",
    {
      kind: "herb",
      aliases: ["trans-resveratrol", "polygonum cuspidatum", "japanese knotweed"],
      note: "Gram extracts inhibit 3A4. A glass of wine is not this row. Next to simvastatin or oral midazolam it is a perpetrator.",
    }),
  d("dhea", "DHEA", [], "Adrenal androgen precursor",
    [sub("CYP3A4", "major")],
    [],
    "3A4 victim; androgenic effects — not a CYP perpetrator",
    {
      kind: "herb",
      aliases: ["prasterone", "dehydroepiandrosterone"],
      note: "Hormone, not a vitamin. 3A4 clears it. Inducers dump it; inhibitors raise androgenic noise. Not a testosterone protocol.",
    }),
  d("nac", "N-acetylcysteine", [], "Glutathione precursor",
    [],
    [],
    "APAP antidote — not a CYP perpetrator",
    {
      kind: "herb",
      aliases: ["n-acetylcysteine", "acetylcysteine", "n-acetyl cysteine"],
      note: "The acetaminophen antidote sold as a mucolytic and 'liver support.' CYP/PD stays quiet. Does not retire NAPQI from chronic alcohol plus APAP.",
    }),
  d("charcoal", "Activated charcoal", [], "Oral adsorbent",
    [],
    [],
    "Binds co-administered oral drugs — lost absorption",
    {
      kind: "herb",
      aliases: ["activated charcoal", "activated carbon", "charcoal capsule"],
      note: "A binder, not a CYP. Next to levothyroxine, warfarin, OCPs, or an anticonvulsant the dose never arrives. Separate by several hours. Not the charred-meat 1A2 row.",
    }),
  d("creatine", "Creatine", [], "Muscle phosphagen",
    [],
    [],
    "Not a CYP or PD collision — renal load in dehydration",
    {
      kind: "herb",
      aliases: ["creatine monohydrate", "creatine hcl"],
      note: "The desk stays quiet. Dehydration plus an NSAID or an ACEI is a kidney footnote, not a scored pair. Not a stimulant.",
    }),
  d("nattokinase", "Nattokinase", [], "Fibrinolytic enzyme (natto)",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants — sold as a clot buster",
    {
      kind: "herb",
      aliases: ["natto kinase", "natto extract", "nattokinase nsk"],
      note: "A fibrinolytic sold as 'heart health.' Next to warfarin or a DOAC this is stacked hemostasis, not vitamin K. Stop before procedures. Food natto is quieter than the capsule.",
    }),
  d("psyllium", "Psyllium", [], "Viscous fiber (bulk laxative)",
    [],
    [],
    "Binds co-administered oral drugs — lost absorption",
    {
      kind: "herb",
      aliases: ["metamucil", "ispaghula", "psyllium husk", "fiber capsule"],
      note: "A binder, not a CYP. Metamucil with morning Synthroid, digoxin, or carbamazepine is an empty dose. Separate by several hours. Not the charcoal-capsule row.",
    }),
  d("chromium", "Chromium picolinate", [], "Trace mineral (glucose)",
    [],
    ["hypoglycemic"],
    "Stacked hypoglycemia with secretagogues and insulin",
    {
      kind: "herb",
      aliases: ["chromium", "chromium picolinate", "chrome mate"],
      note: "'Blood sugar support' bottle. Next to glipizide or insulin it is a hypo row. Not a CYP perpetrator. Food chromium is not this milligram capsule.",
    }),
  d("citrulline", "L-citrulline", [], "Arginine precursor (NO)",
    [],
    [],
    "Additive hypotension with PDE5 inhibitors",
    {
      kind: "herb",
      aliases: ["l-citrulline", "citrulline malate", "pre-workout citrulline"],
      note: "Converts to arginine and feeds NO more reliably than oral arginine itself. Next to sildenafil it is the same stacked vasodilation. Pre-workout plus a weekend pill.",
    }),
  d("grape-seed", "Grape seed extract", [], "OPC / proanthocyanidin",
    [],
    ["antiplatelet"],
    "Bleeding with anticoagulants / antiplatelets",
    {
      kind: "herb",
      aliases: ["gse", "opc", "proanthocyanidin", "grape seed"],
      note: "High-OPC extracts impair platelets. A glass of wine is not this row. Next to warfarin, a DOAC, or fish oil it is a bleed stack.",
    }),
  d("icariin", "Horny goat weed (icariin)", [], "Herbal PDE5-like (Epimedium)",
    [],
    [],
    "Stacked vasodilation with nitrates and PDE5 drugs",
    {
      kind: "herb",
      aliases: ["horny goat weed", "epimedium", "yin yang huo", "icariin"],
      note: "The 'natural Viagra' bottle. Icariin is a weak PDE5 hit — not labeled like sildenafil, still a first-dose syncope watch next to a nitrate or a real PDE5. Not a CYP perpetrator.",
    }),
];

const coreIds = new Set(raw.map((d) => d.id));
const clinicExtra = CLINIC_FORMULARY.filter((d) => !coreIds.has(d.id));
const afterClinic = new Set([...coreIds, ...clinicExtra.map((d) => d.id)]);
export const DRUGS: Drug[] = [
  ...raw,
  ...clinicExtra,
  ...MODERN_FORMULARY.filter((d) => !afterClinic.has(d.id)),
];
export const DRUG_BY_ID: Record<string, Drug> = Object.fromEntries(DRUGS.map((x) => [x.id, x]));

const PSYCH_CLS =
  /SSRI|SNRI|MAOI|antipsychotic|antidepressant|Benzodiazepine|Opioid|Gabapentinoid|Mood stabilizer|NMDA|Dissociative|Psychedelic|Entactogen|Stimulant|Cannabinoid|Alcohol|GHB|Z-hypnotic|Anxiolytic|ADHD|NRI|Nicotine|Methylxanthine|Tricyclic|NaSSA|SARI|NDRI|hypnotic|orexin|Melatonin|kratom|GABA|MAT|Wake-promoting|Pineal|Partial opioid|Opioid antagonist|Atypical opioid|aldehyde|NMDA \/ GABA|nicotinic|Anticonvulsant|Central muscle|AChE|α2-agonist|Nitazene|Designer benzodiazepine|Thienodiazepine|Cathinone|neuroactive steroid|Arylcyclohexylamine|GHB prodrug|Alkyl nitrite|Antidiarrheal|Sedating antihistamine|Veterinary|Barbiturate|NNRTI|NBOMe|Salvinorin|Tropane|H2 blocker|Carbamate|oneirogen|pyrovalerone|NRI analgesic|IV anesthetic|NK1|SPAR|mixed opioid|7-OH|Diacetylmorphine|Street pressed|Local anesthetic/i;

export function isPsych(drug: Drug): boolean {
  if (PSYCH_CLS.test(drug.cls)) return true;
  return drug.pd.some((p) =>
    [
      "serotonergic",
      "dissociative",
      "psychedelic",
      "stimulant",
      "cannabinoid",
      "alcohol",
      "ghb",
      "cns-depressant",
      "opioid",
      "maoi",
      "ssri-snri",
      "benzo-zdrug",
      "opioid-antagonist",
    ].includes(p),
  );
}

export function isFood(drug: Drug): boolean {
  return drug.kind === "food" || drug.kind === "herb";
}

function psychRank(drug: Drug): number {
  if (drug.pd.includes("dissociative")) return 0;
  if (drug.pd.includes("psychedelic") || drug.id === "mdma") return 1;
  if (drug.pd.includes("stimulant") || drug.pd.includes("cannabinoid") || drug.pd.includes("alcohol") || drug.pd.includes("ghb"))
    return 2;
  if (isFood(drug)) return 4;
  return 3;
}

export function searchDrugs(query: string, excludeIds: string[] = []): Drug[] {
  const q = query.trim().toLowerCase();
  const normalizedQuery = normalizeSearchText(q);
  const excluded = new Set(excludeIds);
  if (!q) {
    const psych = DRUGS.filter((d) => !excluded.has(d.id) && isPsych(d) && !isFood(d))
      .sort((a, b) => psychRank(a) - psychRank(b) || a.name.localeCompare(b.name))
      .slice(0, 12);
    const foods = DRUGS.filter((d) => !excluded.has(d.id) && isFood(d)).slice(0, 6);
    return [...psych, ...foods];
  }
  if (!normalizedQuery) return [];
  const foodQuery =
    q === "food" ||
    q === "foods" ||
    q === "diet" ||
    q === "meal" ||
    q === "herb" ||
    q === "herbs" ||
    q === "juice" ||
    q === "dairy" ||
    q === "kitchen";
  const psychQuery =
    q === "psych" ||
    q.includes("psychoact") ||
    q.includes("dissociat") ||
    q.includes("psychedel") ||
    q === "stimulant" ||
    q === "stimulants";
  if (foodQuery) {
    const kitchenFirst = [
      "grapefruit",
      "dairy",
      "leafy-greens",
      "oatp-juice",
      "tyramine-foods",
      "high-fat-meal",
      "coffee",
      "protein-meal",
      "soy",
      "high-k-foods",
      "histamine-fish",
      "enteral-feed",
      "pomegranate",
      "starfruit",
      "charred-meat",
      "cruciferous",
      "st-johns-wort",
      "acidic-juice",
      "alkalinizer",
      "low-salt",
      "high-salt",
      "green-tea",
    ];
    const seen = new Set<string>();
    const ordered: Drug[] = [];
    for (const id of kitchenFirst) {
      const d = DRUG_BY_ID[id];
      if (!d || excluded.has(d.id)) continue;
      seen.add(d.id);
      ordered.push(d);
    }
    for (const d of DRUGS) {
      if (excluded.has(d.id) || seen.has(d.id) || !isFood(d)) continue;
      ordered.push(d);
      if (ordered.length >= 24) break;
    }
    return ordered.slice(0, 24);
  }
  if (
    q === "supplement" ||
    q === "supplements" ||
    q === "vitamin" ||
    q === "vitamins" ||
    q === "otc"
  ) {
    const supplementOrder = [
      "berberine",
      "red-yeast-rice",
      "sam-e",
      "vitamin-k",
      "st-johns-wort",
      "goldenseal",
      "nattokinase",
      "fish-oil",
      "yohimbine",
      "quercetin",
      "bitter-orange",
      "calcium",
      "iron",
      "niacin",
      "charcoal",
      "psyllium",
      "echinacea",
      "icariin",
    ];
    return supplementOrder
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (psychQuery) {
    return DRUGS.filter((d) => !excluded.has(d.id) && isPsych(d)).slice(0, 16);
  }
  if (q === "street" || q === "rc" || q === "research") {
    return DRUGS.filter(
      (d) =>
        !excluded.has(d.id) &&
        /nitazene|Designer|Cathinone|Arylcyclohexylamine|NBOMe|oneirogen|pyrovalerone|xylazine|kratom|tianeptine|GHB prodrug|popper|ibogaine|2C-|MXE|FDCK|cocaine|heroin|Dirty|pressed opioid|Local anesthetic|Diacetylmorphine/i.test(
          d.cls + d.name,
        ),
    ).slice(0, 16);
  }
  if (q === "mat" || q === "otp" || q === "oud" || q === "obots" || q === "obot") {
    const matIds = new Set([
      "buprenorphine",
      "methadone",
      "naltrexone",
      "naloxone",
      "nalmefene",
      "lofexidine",
      "clonidine",
      "acamprosate",
      "disulfiram",
      "gabapentin",
      "pregabalin",
      "xylazine",
      "epclusa",
      "seven-oh",
      "tianeptine",
      "hydroxyzine",
      "ondansetron",
    ]);
    return DRUGS.filter(
      (d) =>
        !excluded.has(d.id) &&
        (matIds.has(d.id) ||
          /Partial opioid|Opioid antagonist|HCV DAA|α2-agonist \(opioid/i.test(d.cls)),
    ).slice(0, 16);
  }
  if (q === "onco" || q === "chemo" || q === "oncology" || q === "cancer") {
    return DRUGS.filter((d) => !excluded.has(d.id) && familyOf(d) === "onco").slice(0, 24);
  }
  if (q === "abx" || q === "antibiotic" || q === "antibiotics") {
    return DRUGS.filter((d) => !excluded.has(d.id) && familyOf(d) === "id").slice(0, 24);
  }
  if (q === "hiv" || q === "art" || q === "arv") {
    return DRUGS.filter(
      (d) =>
        !excluded.has(d.id) &&
        /HIV|INSTI|NRTI|NNRTI|protease inhibitor|capsid inhibitor|attachment inhibitor/i.test(d.cls),
    ).slice(0, 24);
  }
  if (q === "insulin" || q === "insulins") {
    return DRUGS.filter((d) => !excluded.has(d.id) && /insulin/i.test(`${d.cls} ${d.name}`)).slice(
      0,
      24,
    );
  }
  if (q === "wards" || q === "ward" || q === "hospital" || q === "zosyn" || q === "entresto" || q === "safety" || q === "named" || q === "boxed") {
    const wardOrder = [
      "meropenem",
      "ertapenem",
      "imipenem-cilastatin",
      "valproate",
      "vancomycin",
      "piperacillin-tazobactam",
      "sacubitril-valsartan",
      "lisinopril",
      "capecitabine",
      "fluorouracil",
      "warfarin",
      "dicloxacillin",
      "nafcillin",
      "letermovir",
      "tacrolimus",
      "linezolid",
      "insulin-aspart",
      "semaglutide",
      "epclusa",
      "amiodarone",
      "clozapine",
      "lorazepam",
      "aspirin",
      "ibuprofen",
      "lamotrigine",
      "tamoxifen",
      "paroxetine",
      "ethinyl-estradiol",
      "rifampin",
      "isotretinoin",
      "doxycycline",
      "ciprofloxacin",
      "prednisone",
      "losartan",
      "omeprazole",
      "rilpivirine",
      "empagliflozin",
      "furosemide",
    ];
    return wardOrder
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 24);
  }
  if (q === "dose" || q === "dosing" || q === "mg" || q === "milligram" || q === "cap") {
    const doseOrder = [
      "simvastatin",
      "amiodarone",
      "amlodipine",
      "methotrexate",
      "colchicine",
      "lithium",
      "warfarin",
      "gabapentin",
      "metformin",
      "vancomycin",
      "lamotrigine",
      "valproate",
      "atorvastatin",
      "sildenafil",
      "buprenorphine",
      "digoxin",
    ];
    return doseOrder
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "harm" || q === "hr" || q === "strips" || q === "recovery" || q === "never" || q === "wiki" || q === "psychonaut" || q === "tripsit" || q === "pw") {
    const hrOrder = [
      "naloxone",
      "nalmefene",
      "fentanyl",
      "dirty-30",
      "xylazine",
      "medetomidine",
      "heroin",
      "seven-oh",
      "bromazolam",
      "sodium-oxybate",
      "mdma",
      "ketamine",
      "cocaine",
      "ethanol",
      "lsd",
      "twentyfive-i",
      "buprenorphine",
      "methadone",
    ];
    return hrOrder
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 18);
  }
  if (q === "clinic" || q === "primary" || q === "common" || q === "pcp" || q === "staple" || q === "staples") {
    const clinicOrder = [
      "meropenem",
      "vancomycin",
      "piperacillin-tazobactam",
      "sacubitril-valsartan",
      "azathioprine",
      "allopurinol",
      "febuxostat",
      "terbinafine",
      "mirabegron",
      "fenofibrate",
      "isosorbide-mononitrate",
      "sildenafil",
      "ranolazine",
      "eplerenone",
      "eletriptan",
      "budesonide",
      "fluticasone",
      "semaglutide",
      "pioglitazone",
      "clopidogrel",
      "omeprazole",
      "warfarin",
      "simvastatin",
      "sirolimus",
      "nifedipine",
      "metformin",
    ];
    return clinicOrder
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "pgx" || q === "pharmgkb" || q === "cpic" || q === "clinpgx") {
    return DRUGS.filter((d) => !excluded.has(d.id) && hasPgx(d.id)).slice(0, 16);
  }
  if (q === "stahl") {
    return DRUGS.filter((d) => !excluded.has(d.id) && hasStahl(d.id)).slice(0, 16);
  }
  if (q === "drugbank" || q === "db") {
    return DRUGS.filter((d) => !excluded.has(d.id) && hasDrugbank(d.id)).slice(0, 16);
  }
  if (q === "pubmed" || q === "pmid" || q === "cites" || q === "refs" || q === "papers") {
    return DRUGS.filter((d) => !excluded.has(d.id) && hasCite(d.id)).slice(0, 16);
  }
  if (q === "beers" || q === "geriatric") {
    return CLINIC_BEERS.map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "pregnancy" || q === "pregnant" || q === "lactation" || q === "teratogen") {
    return CLINIC_PREG_AVOID.map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (
    q === "pheno" ||
    q === "phenoconversion" ||
    q === "phenoconvert" ||
    q === "convert"
  ) {
    const order = ["paroxetine", "fluoxetine", "bupropion", "quinidine", "terbinafine", "fluconazole", "fluvoxamine", "ciprofloxacin", "clarithromycin", "codeine", "dextromethorphan", "tamoxifen"];
    return order
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "mme" || q === "morphine equivalent" || q === "morphine-equivalent" || q === "omed") {
    return Object.keys(MME_FACTOR)
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "hunter" || q === "serotonin syndrome" || q === "nms" || q === "clonus") {
    return DRUGS.filter(
      (d) =>
        !excluded.has(d.id) &&
        (d.pd.includes("serotonergic") || d.pd.includes("ssri-snri") || d.pd.includes("maoi") || /antipsychotic/i.test(d.cls)),
    ).slice(0, 16);
  }
  if (q === "reversal" || q === "antidote" || q === "naloxone" || q === "narcan" || q === "opvee") {
    const order = ["naloxone", "nalmefene", "nac", "vitamin-k", "fentanyl", "methadone", "acetaminophen", "warfarin", "xylazine", "dabigatran", "digoxin"];
    return order
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "tdm" || q === "levels" || q === "trough") {
    return DRUGS.filter((d) => !excluded.has(d.id) && hasTdm(d.id)).slice(0, 16);
  }
  if (
    q === "uds" ||
    q === "uad" ||
    q === "immunoassay" ||
    q === "cup" ||
    q === "urine" ||
    q === "screen"
  ) {
    const order = [
      "methadone",
      "buprenorphine",
      "fentanyl",
      "oxycodone",
      "quetiapine",
      "sertraline",
      "bupropion",
      "dextromethorphan",
      "rifampin",
      "bromazolam",
      "clonazepam",
      "tramadol",
    ];
    return order
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "cows" || q === "ciwa" || q === "withdrawal" || q === "precipitated") {
    const order = [
      "buprenorphine",
      "methadone",
      "fentanyl",
      "naltrexone",
      "nalmefene",
      "lofexidine",
      "clonidine",
      "ethanol",
      "dirty-30",
    ];
    return order
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "lactmed" || q === "lactation" || q === "breastfeed" || q === "breastfeeding" || q === "milk") {
    const order = [
      "methadone",
      "buprenorphine",
      "lithium",
      "codeine",
      "tramadol",
      "sertraline",
      "fluoxetine",
      "lamotrigine",
      "lorazepam",
      "warfarin",
    ];
    return order
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "qtc" || q === "qt" || q === "torsades") {
    return DRUGS.filter((d) => !excluded.has(d.id) && (d.pd.includes("qt-known") || d.pd.includes("qt-possible"))).slice(0, 16);
  }
  if (
    q === "cyp" ||
    q === "protocol" ||
    q === "protocols" ||
    q === "tdi" ||
    q === "mbi" ||
    q === "index" ||
    q === "fda table" ||
    q === "fda-table" ||
    q === "clock"
  ) {
    const order = [
      "clarithromycin",
      "midazolam",
      "rifampin",
      "ketoconazole",
      "itraconazole",
      "paroxetine",
      "fluoxetine",
      "bupropion",
      "fluvoxamine",
      "ciprofloxacin",
      "tizanidine",
      "grapefruit",
      "amiodarone",
      "gemfibrozil",
      "codeine",
      "warfarin",
    ];
    return order
      .map((id) => DRUG_BY_ID[id])
      .filter((d): d is Drug => Boolean(d) && !excluded.has(d.id))
      .slice(0, 16);
  }
  if (q === "rxnav" || q === "pubchem" || q === "trials" || q === "dailymed" || q === "shortage" || q === "shortages") {
    return DRUGS.filter((d) => !excluded.has(d.id) && d.kind === "drug" && !d.id.startsWith("__")).slice(0, 16);
  }
  const coreQuery = stripSaltFormTokens(normalizedQuery);
  const matchQueries =
    coreQuery !== normalizedQuery ? [normalizedQuery, coreQuery] : [normalizedQuery];

  const scored: { drug: Drug; score: number }[] = [];
  for (const drug of DRUGS) {
    if (excluded.has(drug.id)) continue;
    const name = normalizeSearchText(drug.name);
    const brands = drug.brands.map(normalizeSearchText);
    const aliases = drug.aliases.map(normalizeSearchText);
    const id = normalizeSearchText(drug.id);
    const cls = drug.cls.toLowerCase();
    const searchable = [name, id, ...brands, ...aliases];
    let score = 0;
    for (const mq of matchQueries) {
      const compactQuery = mq.replace(/\s/g, "");
      const enzymeKey = compactEnzymeQuery(mq);
      const enzymeRoles = drug.enzymes.filter((e) => {
        const en = normalizeSearchText(e.enzyme).replace(/\s/g, "");
        if (enzymeKey) return en === enzymeKey || en.includes(enzymeKey.replace(/^cyp/, ""));
        return compactQuery.length >= 3 && en.includes(compactQuery);
      });
      const enzymeHit = enzymeRoles.length > 0;
      const tokenHit =
        mq.length >= 3 &&
        mq.split(" ").every((token) => searchable.some((value) => value.includes(token)));
      let s = 0;
      if (searchable.some((value) => value === mq)) s = 100;
      else if (name.startsWith(mq) || id.startsWith(mq)) s = 80;
      else if (brands.some((b) => b.startsWith(mq)) || aliases.some((a) => a.startsWith(mq))) s = 70;
      else if (name.includes(mq) || id.includes(mq)) s = 60;
      else if (brands.some((b) => b.includes(mq)) || aliases.some((a) => a.includes(mq))) s = 50;
      else if (tokenHit) s = 45;
      else if (cls.includes(q)) s = 35;
      else if (enzymeHit && enzymeKey) {
        const teach = TEACHING_ENZYME_HITS[enzymeKey] ?? [];
        const teachIdx = teach.indexOf(drug.id);
        if (teachIdx >= 0) s = 68 - teachIdx;
        else if (enzymeRoles.some((e) => e.kind === "inhibitor" || e.kind === "inducer")) s = 48;
        else s = 28;
      } else if (enzymeHit) s = 25;
      else if (eKindQuery(drug, q)) s = 20;
      // Prefer the plain-generic hit when the user typed a salt/release suffix.
      if (mq === coreQuery && mq !== normalizedQuery && s >= 60) s += 5;
      if (s > score) score = s;
    }
    if (score > 0) scored.push({ drug, score });
  }

  scored.sort((a, b) => b.score - a.score || a.drug.name.localeCompare(b.drug.name));
  return scored.slice(0, 24).map((s) => s.drug);
}

/**
 * Make generic, brand, salt-form, and street-name lookups comparable without
 * changing the displayed clinical name. Punctuation and diacritics should not
 * decide whether a catalog entry is discoverable.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Common salt / release tokens users paste after a generic (e.g. metformin hcl). */
export const SALT_FORM_TOKENS = new Set([
  "hcl",
  "hbr",
  "hydrochloride",
  "hydrobromide",
  "mesylate",
  "maleate",
  "succinate",
  "fumarate",
  "tartrate",
  "citrate",
  "phosphate",
  "sulfate",
  "sulphate",
  "besylate",
  "tosylate",
  "acetate",
  "hippurate",
  "sodium",
  "potassium",
  "calcium",
  "dihydrate",
  "monohydrate",
  "anhydrous",
  "xr",
  "er",
  "sr",
  "cr",
  "la",
  "odt",
  "ir",
  "xl",
]);

/** Drop trailing salt/release tokens so "metformin hcl" still finds metformin. */
export function stripSaltFormTokens(normalized: string): string {
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return normalized;
  const kept = parts.filter((t) => !SALT_FORM_TOKENS.has(t));
  return kept.length ? kept.join(" ") : normalized;
}


/** Compact forms users type when hunting by enzyme (CYP 3A4, 2D6, …). */
function compactEnzymeQuery(normalized: string): string | null {
  const compact = normalized.replace(/\s/g, "");
  const aliases: Record<string, string> = {
    cyp3a4: "cyp3a4",
    "3a4": "cyp3a4",
    cyp3a5: "cyp3a5",
    "3a5": "cyp3a5",
    cyp2d6: "cyp2d6",
    "2d6": "cyp2d6",
    cyp2c19: "cyp2c19",
    "2c19": "cyp2c19",
    cyp2c9: "cyp2c9",
    "2c9": "cyp2c9",
    cyp1a2: "cyp1a2",
    "1a2": "cyp1a2",
    cyp2b6: "cyp2b6",
    "2b6": "cyp2b6",
    cyp2e1: "cyp2e1",
    "2e1": "cyp2e1",
  };
  return aliases[compact] ?? null;
}

/** Prefer well-known teaching perpetrators when someone searches an enzyme name. */
const TEACHING_ENZYME_HITS: Record<string, string[]> = {
  cyp3a4: [
    "clarithromycin",
    "itraconazole",
    "ketoconazole",
    "grapefruit",
    "ritonavir",
    "rifampin",
    "carbamazepine",
  ],
  cyp2d6: ["paroxetine", "fluoxetine", "bupropion", "quinidine", "terbinafine"],
  cyp2c19: ["omeprazole", "fluoxetine", "fluvoxamine"],
  cyp2c9: ["amiodarone", "fluconazole", "sulfamethoxazole"],
  cyp1a2: ["fluvoxamine", "ciprofloxacin", "smoke"],
};

function eKindQuery(drug: Drug, q: string): boolean {
  if (q.includes("inhibit")) return drug.enzymes.some((e) => e.kind === "inhibitor");
  if (q.includes("induc")) return drug.enzymes.some((e) => e.kind === "inducer");
  if (q.includes("prodrug") || q.includes("activat"))
    return drug.enzymes.some((e) => e.kind === "substrate" && e.pathway === "activation");
  return false;
}

export const FAMILIES = [
  { id: "all", label: "All" },
  { id: "nmda", label: "NMDA" },
  { id: "psychedelic", label: "Psychedelic" },
  { id: "stimulant", label: "Stimulant" },
  { id: "gaba", label: "GABA" },
  { id: "opioid", label: "Opioid" },
  { id: "psych", label: "Psych" },
  { id: "cardio", label: "Cardio" },
  { id: "id", label: "Perp / ID" },
  { id: "onco", label: "Onco" },
  { id: "food", label: "Food / herb" },
  { id: "other", label: "Other" },
] as const;

export type FamilyId = (typeof FAMILIES)[number]["id"];

export function familyOf(drug: Drug): Exclude<FamilyId, "all"> {
  if (drug.kind === "food" || drug.kind === "herb") return "food";
  if (drug.pd.includes("dissociative")) return "nmda";
  if (drug.pd.includes("psychedelic")) return "psychedelic";
  if (drug.pd.includes("stimulant") || drug.id === "mdma") return "stimulant";
  if (
    drug.pd.includes("opioid") ||
    drug.pd.includes("opioid-antagonist") ||
    drug.pd.includes("alpha2-agonist")
  )
    return "opioid";
  if (drug.pd.includes("alcohol") || drug.pd.includes("ghb") || drug.pd.includes("benzo-zdrug"))
    return "gaba";
  if (
    drug.pd.includes("ssri-snri") ||
    drug.pd.includes("maoi") ||
    /antipsychotic|antidepressant|Mood|Tricyclic|NaSSA|SARI|NDRI|Anxiolytic/i.test(drug.cls)
  )
    return "psych";
  if (
    /Macrolide|Azole|Fluoroquinolone|HIV|Rifamycin|NNRTI|NRTI|INSTI|antiviral|CMV |capsid inhibitor|JAK |TYK2 |PDE4 |H2 blocker|PK booster|Oxazolidinone|Sulfonamide|Antimycobacterial|HCV|DAA|Allylamine|Beta-lactam|Tetracycline|Cephalosporin|Carbapenem|Aminoglycoside|Glycopeptide|Penicillin|Antimalarial|Echinocandin|Nitroimidazole|Lincosamide|Polymyxin|Monobactam|Protease inhibitor|Anthelmintic|Nitrofuran|Lipopeptide/i.test(
      drug.cls,
    )
  )
    return "id";
  if (
    drug.pd.includes("anticoagulant") ||
    drug.pd.includes("statin") ||
    drug.pd.includes("beta-blocker") ||
    drug.pd.includes("ndhp-ccb") ||
    /Statin|CCB|Beta|ARB|ACE|antiarrhythmic|DOAC|Vitamin K|Cardiac|diuretic|Alpha-1|Fibrate|PDE5|Nitrate|SGLT2|GLP-1|GIP|DPP-4|Antianginal|Mineralocorticoid|P2Y12|thiazide|LMWH|Insulin|ARNI|Heparin/i.test(
      drug.cls,
    )
  )
    return "cardio";
  if (
    /TKI|kinase inhibitor|Platinum|Taxane|Anthracycline|Topoisomerase|alkylator|Checkpoint|PARP|BCL-2|CDK4|BTK |EGFR |VEGF |HER2 |SERM|SERD|Aromatase|GnRH|Vinca|microtubule|Proteasome|CELMoD|\bADC\b|chemotherap|cytotoxic|Differentiating|BRAF|MEK|KRAS|PI3K|FLT3|ALK \/|NTRK|Supportive oncology|Classical chemotherapy|CYP17|Antiandrogen|Androgen receptor/i.test(
      drug.cls,
    )
  )
    return "onco";
  return "other";
}
