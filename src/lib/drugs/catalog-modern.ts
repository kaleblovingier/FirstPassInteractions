/**
 * Modern pharmacy + street-supply expansion.
 * Teaching desk only — empty enzyme lists mean no CYP story here, not "safe."
 * Not a dose. Not FDA-cleared. The PI / FDA / DEA source governs.
 */

import type { Drug, Enzyme, EnzymeRole, ItemKind, PdFlag, Strength, SubstrateSensitivity } from "./types";

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

/** Extra formulary rows merged after the teaching core + clinic pack. */
export const MODERN_FORMULARY: Drug[] = [
  // —— Metabolic / endocrine (GLP-1 family fill-ins) ——————————
  d("dulaglutide", "Dulaglutide", ["Trulicity"], "GLP-1 agonist",
    [],
    ["hypoglycemic"],
    "Stacked hypoglycemia with sulfonylureas / insulin; delayed gastric emptying",
    {
      aliases: ["trulicity"],
      note: "Weekly GLP-1 peptide. Not a CYP substrate. Same SU/insulin hypo map and delayed emptying as semaglutide.",
    }),
  d("liraglutide", "Liraglutide", ["Victoza", "Saxenda"], "GLP-1 agonist",
    [],
    ["hypoglycemic"],
    "Stacked hypoglycemia with sulfonylureas / insulin; delayed gastric emptying",
    {
      aliases: ["victoza", "saxenda"],
      note: "Daily GLP-1. Peptide — no CYP. Hypoglycemia is the secretagogue pair.",
    }),

  // —— Sleep / orexin ————————————————————————————————
  d("daridorexant", "Daridorexant", ["Quviviq"], "Dual orexin antagonist (hypnotic)",
    [sub("CYP3A4", "major")],
    ["cns-depressant", "benzo-zdrug"],
    "Next-day sedation; 3A4 victim; stacked CNS depression with opioids / alcohol",
    {
      aliases: ["quviviq"],
      note: "DORA like suvorexant/lemborexant. Strong 3A4 inhibitors raise exposure. Treat PD with opioids and alcohol as an airway stack, not a free sleep pill.",
    }),

  // —— Psychiatry ————————————————————————————————————
  d("cariprazine", "Cariprazine", ["Vraylar"], "Atypical antipsychotic (D3/D2 partial)",
    [sub("CYP3A4", "major")],
    ["qt-possible", "seizure-lowering"],
    "Akathisia, 3A4 victim toxicity; QT possible",
    {
      aliases: ["vraylar"],
      note: "Long-lived active metabolites. Strong 3A4 inhibitors (ritonavir, azoles) raise exposure. Not a serotonergic MAOI pair on this desk.",
    }),
  d("lumateperone", "Lumateperone", ["Caplyta"], "Atypical antipsychotic",
    [sub("CYP3A4", "major")],
    ["qt-possible", "cns-depressant"],
    "Sedation; 3A4 victim; stacked CNS depression",
    {
      aliases: ["caplyta"],
      note: "Food raises absorption. Strong 3A4 inhibitors and inducers matter. PI governs dose cuts — this desk does not dose it.",
    }),
  d("brexpiprazole", "Brexpiprazole", ["Rexulti"], "Atypical antipsychotic (D2 partial)",
    [sub("CYP3A4", "major"), sub("CYP2D6", "major")],
    ["qt-possible", "seizure-lowering"],
    "Akathisia; 3A4/2D6 victim toxicity",
    {
      aliases: ["rexulti"],
      note: "Dual 3A4 and 2D6 clearance. Paroxetine, fluoxetine, and ritonavir-class boosters raise levels. PI has the tables.",
    }),
  d("asenapine", "Asenapine", ["Saphris", "Secuado"], "Atypical antipsychotic (SL / patch)",
    [sub("CYP1A2", "major")],
    ["qt-possible", "cns-depressant"],
    "Sedation, QT possible; smoke induction can lower levels",
    {
      aliases: ["saphris", "secuado"],
      note: "Sublingual / patch. Smoking induces 1A2 — levels can fall when someone lights up, rise on quit. Also UGT1A4 on the label. Not swallowed.",
    }),
  d("iloperidone", "Iloperidone", ["Fanapt"], "Atypical antipsychotic",
    [sub("CYP3A4", "major"), sub("CYP2D6", "major")],
    ["qt-known"],
    "QT prolongation; 3A4/2D6 victim",
    {
      aliases: ["fanapt"],
      note: "Labeled QT. Strong 3A4 or 2D6 inhibitors raise exposure. Pair with methadone / macrolides is a QT stack on this desk.",
    }),
  d("pimavanserin", "Pimavanserin", ["Nuplazid"], "5-HT2A inverse agonist (Parkinson psychosis)",
    [sub("CYP3A4", "major")],
    ["qt-known"],
    "QT prolongation; 3A4 victim",
    {
      aliases: ["nuplazid"],
      note: "No D2 block. Strong 3A4 inhibitors raise levels and QT risk. PI governs — not a dose card.",
    }),
  d("gepirone", "Gepirone", ["Exxua"], "5-HT1A agonist antidepressant",
    [sub("CYP3A4", "major")],
    ["serotonergic", "qt-known"],
    "QT prolongation; serotonin syndrome with MAOIs; 3A4 victim",
    {
      aliases: ["exxua"],
      note: "Extended-release 5-HT1A agonist. Strong 3A4 inhibitors are a hard stop on the label. MAOIs remain contraindicated.",
    }),
  d("zuranolone", "Zuranolone", ["Zurzuvae"], "Neuroactive steroid GABA-A PAM",
    [sub("CYP3A4", "major")],
    ["cns-depressant", "benzo-zdrug"],
    "CNS depression; 3A4 victim; stacked sedation with opioids / alcohol / benzos",
    {
      aliases: ["zurzuvae"],
      note: "14-day postpartum depression course. Fat meal required. Strong 3A4 perpetrators matter. Treat PD as a CNS-depressant stack.",
    }),

  // —— Antivirals / HIV / transplant-adjacent ——————————————
  d("nirmatrelvir", "Nirmatrelvir", [], "COVID-19 protease inhibitor",
    [inh("CYP3A4", "strong")],
    [],
    "Raises 3A4-victim levels when boosted; search Paxlovid for the marketed pair",
    {
      aliases: ["pf-07321332"],
      note: "The protease half of Paxlovid. Alone it is not the product on the shelf — ritonavir boost is the perpetrator story. Prefer the Paxlovid row for teaching.",
    }),
  d("bictegravir", "Bictegravir", ["Biktarvy"], "HIV INSTI",
    [sub("CYP3A4", "major")],
    [],
    "Victim of strong 3A4 inducers (rifampin, carbamazepine)",
    {
      aliases: ["biktarvy", "bic"],
      note: "Usually coformulated. CYP3A4 + UGT1A1 clearance. Strong inducers can steal it. Not a major perpetrator on this desk.",
    }),
  d("cabotegravir", "Cabotegravir", ["Vocabria", "Apretude", "Cabenuva"], "HIV INSTI (oral / LA)",
    [],
    [],
    "Inducer interactions via UGT partners; long-acting residual exposure",
    {
      aliases: ["apretude", "cabenuva", "vocabria"],
      note: "Long-acting PrEP / treatment. Mostly UGT1A1 — quiet CYP row on this desk. Rifampin-class inducers still matter on the label.",
    }),
  d("lenacapavir", "Lenacapavir", ["Sunlenca", "Yeztugo"], "HIV capsid inhibitor",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate"), inh("P-gp", "moderate")],
    [],
    "3A4/P-gp victim and moderate perpetrator; long residual effect",
    {
      aliases: ["sunlenca", "yeztugo"],
      note: "Twice-yearly injectable option. Moderate 3A4/P-gp inhibition can raise sensitive victims. Strong inducers steal it.",
    }),
  d("letermovir", "Letermovir", ["Prevymis"], "CMV terminase inhibitor",
    [sub("CYP3A4", "minor"), inh("CYP3A4", "moderate")],
    [],
    "Raises tacrolimus / cyclosporine / sirolimus; 3A4/OATP interactions",
    {
      aliases: ["prevymis"],
      note: "Transplant CMV prophylaxis. Moderate 3A4 inhibition plus OATP effects raise calcineurin / mTOR levels — TDM is the clinical move. Desk is educational only.",
    }),
  d("maribavir", "Maribavir", ["Livtencity"], "CMV UL97 kinase inhibitor",
    [sub("CYP3A4", "major"), ind("CYP3A4", "weak")],
    [],
    "3A4 victim; can lower some immunosuppressant levels",
    {
      aliases: ["livtencity"],
      note: "Post-transplant refractory CMV. Watch 3A4 perpetrators and immunosuppressant TDM on the PI.",
    }),
  d("molnupiravir", "Molnupiravir", ["Lagevrio"], "COVID-19 antiviral (mutagenic ribonucleoside)",
    [],
    [],
    "Not a CYP perpetrator; pregnancy contraindication on label",
    {
      aliases: ["lagevrio"],
      note: "Minimal drug–drug CYP map. The teaching point is indication / pregnancy labeling, not a desk collision.",
    }),
  d("remdesivir", "Remdesivir", ["Veklury"], "COVID-19 nucleotide antiviral",
    [],
    ["hepatotoxic", "nephrotoxic"],
    "LFTs / renal vehicle concerns; limited CYP perpetrator story",
    {
      aliases: ["veklury"],
      note: "IV hospital antiviral. Not a ritonavir-style booster. Hepatic labs dominate over CYP cards.",
    }),

  // —— JAK / immuno ————————————————————————————————
  d("upadacitinib", "Upadacitinib", ["Rinvoq"], "JAK inhibitor",
    [sub("CYP3A4", "major")],
    ["immunosuppressant", "hepatotoxic"],
    "Infection risk; 3A4 victim; stacked immuno toxicity",
    {
      aliases: ["rinvoq"],
      note: "Strong 3A4 inhibitors and inducers change exposure. Not a serotonergic row.",
    }),
  d("tofacitinib", "Tofacitinib", ["Xeljanz"], "JAK inhibitor",
    [sub("CYP3A4", "major"), sub("CYP2C19", "minor")],
    ["immunosuppressant", "hepatotoxic"],
    "Infection / thrombosis signals on label; 3A4 victim",
    {
      aliases: ["xeljanz"],
      note: "Moderate/strong CYP3A4 inhibitors raise levels. PI has the tables — desk is educational only.",
    }),
  d("baricitinib", "Baricitinib", ["Olumiant"], "JAK inhibitor",
    [],
    ["immunosuppressant", "nephrotoxic"],
    "Infection risk; OAT3 interactions; renal clearance",
    {
      aliases: ["olumiant"],
      note: "Mostly renal / OAT3, not a classic CYP perpetrator. Strong OAT3 inhibitors (e.g. probenecid) matter on the label.",
    }),
  d("ritlecitinib", "Ritlecitinib", ["Litfulo"], "JAK3 / TEC inhibitor",
    [sub("CYP3A4", "major")],
    ["immunosuppressant"],
    "Infection risk; 3A4 victim",
    { aliases: ["litfulo"], note: "Alopecia areata JAK. Strong 3A4 perpetrators change exposure." }),
  d("deucravacitinib", "Deucravacitinib", ["Sotyktu"], "TYK2 inhibitor",
    [sub("CYP1A2", "minor"), sub("CYP2B6", "minor"), sub("CYP3A4", "minor")],
    ["immunosuppressant"],
    "Infection risk; modest CYP map",
    {
      aliases: ["sotyktu"],
      note: "Allosteric TYK2. Quieter CYP story than JAK1/3 drugs; still immuno.",
    }),
  d("apremilast", "Apremilast", ["Otezla"], "PDE4 inhibitor",
    [sub("CYP3A4", "major")],
    [],
    "GI intolerance; 3A4 victim / inducer loss of efficacy",
    {
      aliases: ["otezla"],
      note: "Strong 3A4 inducers (rifampin, carbamazepine, St John's wort) can steal it.",
    }),

  // —— Street / RC opioids ——————————————————————————
  d("etodesnitazene", "Etodesnitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "High-potency μ-agonist respiratory arrest; 3A4 victim; benzo/xylazine airway stack",
    {
      aliases: ["etazene-desnitro", "nitazene"],
      note: "Nitazene class. Treat like other benzimidazole opioids next to benzos, alcohol, and xylazine. Naloxone reverses μ — not α2.",
    }),
  d("n-pyrrolidino-etonitazene", "N-Pyrrolidino etonitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Extremely high-potency μ-agonist; respiratory arrest; 3A4 victim",
    {
      aliases: ["npe", "protonitazepyne", "pyrrolidino-etonitazene", "nitazene"],
      note: "Among the hotter nitazene analogues reported in toxicology. Teaching card only — potency estimates vary; PI/forensic sources govern.",
    }),
  d("butonitazene", "Butonitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "μ-agonist respiratory arrest; 3A4 victim; stacked CNS depression",
    { aliases: ["butonitazene", "nitazene"] }),
  d("flunitazene", "Flunitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "μ-agonist respiratory arrest; 3A4 victim",
    { aliases: ["flu-nitazene", "nitazene"] }),
  d("brorphine", "Brorphine", [], "Street synthetic opioid",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "μ-agonist respiratory arrest; often cut into fake tablets",
    {
      aliases: ["brorphine"],
      note: "Appeared in pressed 'oxycodone' supply. Same airway map as illicit fentanyl next to benzos and xylazine.",
    }),
  d("u-47700", "U-47700", [], "Street synthetic opioid (AH-series related)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "μ-agonist respiratory arrest; 3A4 victim",
    {
      aliases: ["u47700", "pink", "u-4"],
      note: "Research chemical opioid from earlier waves. Treat as a full μ-agonist on this desk.",
    }),

  // —— Designer benzos ——————————————————————————————
  d("pyrazolam", "Pyrazolam", [], "Designer benzodiazepine",
    [],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Benzo × opioid airway stack; withdrawal seizures",
    {
      aliases: ["pyrazolam"],
      note: "Triazolobenzodiazepine RC. Quiet CYP map vs alprazolam — PD with opioids and alcohol still dominates.",
    }),
  d("flubromazepam", "Flubromazepam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Very long-acting RC benzo; delayed withdrawal; opioid airway stack",
    {
      aliases: ["flubromazepam", "fbzp"],
      note: "Long half-life. Blackouts and delayed withdrawal seizures are the street pattern. 3A4 still relevant.",
    }),
  d("deschloroetizolam", "Deschloroetizolam", [], "Thienodiazepine (designer)",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Etizolam-family CNS depression; opioid airway stack",
    {
      aliases: ["etizolam-deschloro", "deschloro-etizolam"],
      note: "Thienodiazepine cousin of etizolam. Same teaching map: 3A4 + opioid/alcohol airway.",
    }),
  d("meclonazepam", "Meclonazepam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Clonazepam-family RC; opioid airway stack",
    { aliases: ["meclonazepam"] }),
  d("phenazolam", "Phenazolam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "High-potency RC benzo; blackout and opioid airway stack",
    {
      aliases: ["phenazolam", "clobromazolam"],
      note: "Sometimes sold as clonazolam. Treat as a high-potency 3A4 benzo.",
    }),

  // —— Cathinones / stimulants ————————————————————————
  d("eutylone", "Eutylone", [], "Cathinone stimulant / entactogen",
    [sub("CYP2D6", "major")],
    ["serotonergic", "stimulant", "seizure-lowering"],
    "Hyperthermia, serotonin toxicity with MAOIs; 2D6 victim",
    {
      aliases: ["bk-ebdb", "n-ethylbutylone", "eutylone"],
      note: "Appeared in 'Molly' supply. Same MAOI / serotonin map as other methylenedioxy cathinones.",
    }),
  d("n-ethylpentylone", "N-Ethylpentylone", [], "Cathinone stimulant",
    [sub("CYP2D6", "major")],
    ["serotonergic", "stimulant", "seizure-lowering"],
    "Severe sympathomimetic and serotonergic toxicity; MAOI crisis",
    {
      aliases: ["ephylone", "bk-ebdp", "nep"],
      note: "Sold as MDMA in some seizures. Hotter stimulant signal than MDMA — still a MAOI contraindication on this desk.",
    }),
  d("mdphp", "MDPHP", [], "Cathinone stimulant (pyrovalerone)",
    [sub("CYP2D6", "minor")],
    ["stimulant", "seizure-lowering"],
    "Severe sympathomimetic toxicity; MAOI hypertensive crisis",
    {
      aliases: ["mdphp", "monkey dust"],
      note: "Pyrovalerone-family DAT/NET blocker like α-PVP. Pressor with MAOIs still applies.",
    }),
];
