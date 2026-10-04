/**
 * Formulary wave 2 — more modern pharmacy + street-supply teaching rows.
 * Stacks on catalog-modern.ts. Empty enzyme lists mean no CYP story here, not "safe."
 * Rows whose id, name, brand, or alias already live in another catalog were dropped
 * (the earlier row wins) — see catalog-modern-wave2.test.ts.
 * Educational desk only. Not a dose. Not FDA-cleared. PI / FDA / DEA govern.
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

/** Second modern / street wave — merged after MODERN_FORMULARY. */
export const MODERN_WAVE2_FORMULARY: Drug[] = [
  // —— NK3 / vasomotor ——————————————————————————————
  d("fezolinetant", "Fezolinetant", ["Veozah"], "NK3 receptor antagonist",
    [sub("CYP1A2", "major")],
    ["hepatotoxic"],
    "Hepatotoxicity monitoring; 1A2 victim (ciprofloxacin, fluvoxamine)",
    {
      aliases: ["veozah"],
      note: "Menopause vasomotor. Strong 1A2 inhibitors are labeled avoid. LFTs on the PI — not a CYP dose card here.",
    }),
  d("elinzanetant", "Elinzanetant", ["Lynkuet"], "NK1/NK3 receptor antagonist",
    [sub("CYP3A4", "major")],
    [],
    "CYP3A4 interaction precautions; pregnancy contraindication; baseline hepatic testing",
    {
      aliases: ["lynkuet"],
      note: "LYNKUET is labeled for moderate to severe vasomotor symptoms due to menopause. Elinzanetant is primarily metabolized by CYP3A4 to active metabolites. The current label says avoid strong CYP3A4 inhibitors, grapefruit, and moderate/strong CYP3A4 inducers; dosage modification is specified with moderate inhibitors. Pregnancy is contraindicated. Check baseline hepatic tests; the label says not to start if ALT or AST is at least 2 times ULN or total bilirubin is at least 2 times ULN. This note is a safety prompt, not dosing advice. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f42884ff-7dff-419c-8a0c-affe2ed73818",
    }),

  // —— Cardio modern ——————————————————————————————————
  d("mavacamten", "Mavacamten", ["Camzyos"], "Cardiac myosin inhibitor",
    [sub("CYP2C19", "major"), sub("CYP3A4", "major")],
    ["hepatotoxic"],
    "Systolic dysfunction; 2C19/3A4 victim — REMS and PI govern",
    {
      aliases: ["camzyos"],
      note: "oHCM REMS drug. Strong 2C19 or 3A4 inhibitors/inducers change exposure. This desk does not pick a milligram.",
    }),
  d("aprocitentan", "Aprocitentan", ["Tryvio"], "ERA (endothelin antagonist)",
    [sub("CYP3A4", "minor")],
    ["hepatotoxic", "nephrotoxic"],
    "Hepatotoxicity / edema / embryo-fetal toxicity class risks — PI governs",
    {
      aliases: ["tryvio"],
      note: "Resistant hypertension ERA. Embryo-fetal and liver class warnings matter more than CYP here.",
    }),

  // —— Pain / ID ————————————————————————————————————————
  d("suzetrigine", "Suzetrigine", ["Journavx"], "NaV1.8 inhibitor (non-opioid analgesic)",
    [sub("CYP3A4", "major")],
    [],
    "3A4 victim; avoid with strong 3A4 inhibitors per label",
    {
      aliases: ["journavx", "vx-548"],
      note: "Non-opioid acute pain. Strong 3A4 inhibitors raise exposure. Not an opioid PD stack — still not 'interaction-free.'",
    }),
  d("lefamulin", "Lefamulin", ["Xenleta"], "Pleuromutilin antibiotic",
    [sub("CYP3A4", "major"), inh("CYP3A4", "moderate")],
    ["qt-known"],
    "QT prolongation; 3A4 victim and moderate inhibitor",
    {
      aliases: ["xenleta"],
      note: "Community pneumonia. Labeled QT. Moderate 3A4 inhibition plus 3A4 substrate — messy with ritonavir or midazolam.",
    }),

  // —— Metabolic emerging ————————————————————————————
  d("retatrutide", "Retatrutide", [], "Triple GIP/GLP-1/glucagon agonist (emerging)",
    [],
    ["hypoglycemic"],
    "Stacked hypoglycemia with SU/insulin; GI slowing",
    {
      aliases: ["ly3437943", "reta"],
      note: "Investigational / emerging incretin. Same hypo + delayed-emptying teaching map as other incretins. Status changes — not a marketing claim.",
    }),
  d("orforglipron", "Orforglipron", [], "Oral non-peptide GLP-1 agonist (emerging)",
    [sub("CYP3A4", "minor")],
    ["hypoglycemic"],
    "Hypoglycemia with secretagogues; check evolving label for CYP",
    {
      aliases: ["ly3502970"],
      note: "Oral small-molecule GLP-1 in development. Treat CYP as provisional — PI/final label wins.",
    }),
  d("cagrilintide", "Cagrilintide", [], "Amylin analog (emerging, often with semaglutide)",
    [],
    ["hypoglycemic"],
    "GI slowing / hypo when stacked with insulin secretagogues",
    {
      aliases: ["cagri", "cagrisema"],
      note: "Amylin analog teaching row. Delayed emptying stack with GLP-1s. Not a CYP desk star.",
    }),

  // —— Street opioids / fentanyl analogs ————————————————
  d("acrylfentanyl", "Acrylfentanyl", [], "Street synthetic opioid (fentanyl analog)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "High-potency fentanyl analog; overdose reversal may need more than one naloxone administration and ongoing monitoring; benzo airway stack",
    {
      aliases: ["acryloylfentanyl", "acrylic fentanyl"],
      note: "Illicit fentanyl analog. Same teaching map as fentanyl: 3A4 victims, xylazine/benzo stacks, naloxone is μ-only.",
    }),
  d("furanylfentanyl", "Furanylfentanyl", [], "Street synthetic opioid (fentanyl analog)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Potent illicit opioid; naloxone μ-only; designer benzo stack",
    {
      aliases: ["furanyl fentanyl", "fuf"],
      note: "Common in seized powder. Treat like other illicit fentanyls on this desk.",
    }),
  d("cyclopropylfentanyl", "Cyclopropylfentanyl", [], "Street synthetic opioid (fentanyl analog)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Illicit μ agonist; airway stack with sedatives",
    { aliases: ["cyclopropyl fentanyl"] }),
  d("ocfentanil", "Ocfentanil", [], "Street synthetic opioid (fentanyl analog)",
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Potent illicit opioid; naloxone μ-only",
    { aliases: ["ocfentanil", "A-3217"] }),
  d("metodesnitazene", "Metodesnitazene", [], "Benzimidazole opioid (nitazene)",
    [sub("CYP3A4", "major"), sub("CYP2D6", "minor")],
    ["opioid", "cns-depressant"],
    "High-potency nitazene; naloxone μ-only; benzo/xylazine stack",
    {
      aliases: ["metodesnitazene", "metodesaza"],
      note: "Illicit benzimidazole opioid. Same desk map as other nitazenes.",
    }),
  d("o-dsmt", "O-Desmethyltramadol", [], "Tramadol active metabolite / street opioid",
    [sub("CYP2D6", "minor"), sub("CYP3A4", "major")],
    ["opioid", "serotonergic", "seizure-lowering", "cns-depressant"],
    "μ agonist + serotonin; seizures; MAOI risk",
    {
      aliases: ["odsmt", "o-dsmt", "desmetramadol"],
      note: "Active metabolite of tramadol, also sold alone. Serotonin + opioid + seizure map — not 'just a weak opioid.'",
    }),

  // —— Cathinones / dissociatives / designer benzos ————
  d("mdpv", "MDPV", [], "Cathinone stimulant (pyrovalerone)",
    [sub("CYP2D6", "minor")],
    ["stimulant", "seizure-lowering"],
    "Severe sympathomimetic toxicity; MAOI hypertensive crisis",
    {
      aliases: ["bath salts", "mdpv", "methylenedioxypyrovalerone"],
      note: "DAT/NET blocker. Pressor with MAOIs. Not an MDMA roll.",
    }),
  d("n-ethylhexedrone", "N-Ethylhexedrone", [], "Cathinone stimulant",
    [sub("CYP2D6", "minor")],
    ["stimulant", "seizure-lowering"],
    "Sympathomimetic toxicity; MAOI pressor risk",
    {
      aliases: ["hexen", "n-ethylhexedrone", "neh"],
      note: "Research-chemical cathinone. Stimulant PD dominates.",
    }),
  d("nifoxipam", "Nifoxipam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Active metabolite-class RC benzo; opioid airway stack",
    {
      aliases: ["nifoxipam", "3-hydroxy-desmethylflunitrazepam"],
      note: "Often described as a flunitrazepam-related metabolite RC. Treat as a high-potency 3A4 benzo.",
    }),
  d("desalkylgidazepam", "Desalkylgidazepam", [], "Designer benzodiazepine",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Long-acting RC benzo; delayed withdrawal; opioid airway stack",
    {
      aliases: ["gidazepam-metabolite", "desalkylgidazepam", "bromonordiazepam"],
      note: "Gidazepam metabolite sold as an RC. Long action — blackouts and delayed withdrawal.",
    }),
  d("flubrotizolam", "Flubrotizolam", [], "Thienodiazepine (designer)",
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Potent thienodiazepine RC; opioid airway stack",
    {
      aliases: ["flubrotizolam"],
      note: "Etizolam-family RC. Same teaching: 3A4 + opioid/alcohol airway.",
    }),

  // —— Nicotine cessation teaching ————————————————————
  d("cytisine", "Cytisine", ["Tabex", "Toxovac"], "Partial nicotinic agonist",
    [],
    [],
    "Nausea / sleep disturbance; not a CYP perpetrator",
    {
      aliases: ["tabex", "baptitoxine", "cytisinicline"],
      note: "Plant alkaloid smoking-cessation aid (region-dependent availability). Minimal CYP map — shelf row next to varenicline teaching.",
    }),
];
