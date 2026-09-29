export interface MetaboliteNode {
  name: string;
  via: string;
  note: string;
  active?: boolean;
  toxic?: boolean;
}

export interface MetaboliteTree {
  id: string;
  blurb: string;
  nodes: MetaboliteNode[];
}

export const METABOLITE_TREES: Record<string, MetaboliteTree> = {
  ketamine: {
    id: "ketamine",
    blurb: "Norketamine stays NMDA-active; (2R,6R)-HNK is the AMPA metabolite tied to the antidepressant signal.",
    nodes: [
      { name: "Norketamine", via: "CYP2B6 · CYP3A4", note: "Still NMDA-active, longer t½ than parent", active: true },
      { name: "(2R,6R)-HNK", via: "further oxidation", note: "AMPA potentiation — not an NMDA block", active: true },
    ],
  },
  esketamine: {
    id: "esketamine",
    blurb: "S-enantiomer. Same 2B6/3A4 norketamine step; first-pass is worse orally than as Spravato.",
    nodes: [
      { name: "S-norketamine", via: "CYP2B6 · CYP3A4", note: "Active NMDA metabolite", active: true },
      { name: "HNK", via: "further oxidation", note: "Putative AMPA antidepressant metabolite", active: true },
    ],
  },
  mdma: {
    id: "mdma",
    blurb: "CYP2D6 demethylenation plus mechanism-based 2D6 inhibition after the first pass — the second dose is not the first.",
    nodes: [
      { name: "HHMA / MDA", via: "CYP2D6", note: "Catechol / demethylenated products", active: true },
      { name: "HHA", via: "COMT", note: "Downstream catechol" },
    ],
  },
  codeine: {
    id: "codeine",
    blurb: "Analgesia is morphine. A 2D6 UM turns a cough syrup into an opioid overdose.",
    nodes: [
      { name: "Morphine", via: "CYP2D6", note: "The μ-agonist. Blocked in PMs, toxic in UMs.", active: true, toxic: true },
      { name: "Norcodeine", via: "CYP3A4", note: "Mostly inactive shunt" },
    ],
  },
  tramadol: {
    id: "tramadol",
    blurb: "Parent is SNRI-like; M1 is the μ-opioid. 2D6 PM = less analgesia, more parent serotonin/seizure load.",
    nodes: [
      { name: "O-desmethyltramadol (M1)", via: "CYP2D6", note: "μ-opioid agonist", active: true },
      { name: "N-desmethyltramadol", via: "CYP3A4", note: "Inactive shunt" },
    ],
  },
  dextromethorphan: {
    id: "dextromethorphan",
    blurb: "2D6 PM or a strong 2D6 inhibitor keeps parent DXM (serotonergic). Extensive metabolizers make dextrorphan (more NMDA).",
    nodes: [
      { name: "Dextrorphan", via: "CYP2D6", note: "Stronger NMDA antagonist", active: true },
      { name: "3-methoxymorphinan", via: "CYP3A4", note: "Minor shunt" },
    ],
  },
  dronabinol: {
    id: "dronabinol",
    blurb: "Oral first-pass makes 11-OH-THC, which is more psychoactive than parent. Smoked THC largely skips that.",
    nodes: [
      { name: "11-OH-THC", via: "CYP2C9 · CYP3A4", note: "More psychoactive; edible >> smoked", active: true },
      { name: "THC-COOH", via: "further oxidation", note: "Inactive, long detection window" },
    ],
  },
  ibogaine: {
    id: "ibogaine",
    blurb: "Noribogaine is long-lived. 2D6 inhibitors and QT drugs are a documented fatality pattern.",
    nodes: [
      { name: "Noribogaine", via: "CYP2D6", note: "Long t½; still cardiotoxic", active: true, toxic: true },
    ],
  },
  cocaine: {
    id: "cocaine",
    blurb: "Alcohol hijacks hydrolysis. Cocaethylene is longer-lived and more cardiotoxic than parent cocaine.",
    nodes: [
      { name: "Benzoylecgonine", via: "hCE1", note: "Inactive urinary metabolite" },
      { name: "Norcocaine", via: "CYP3A4", note: "Minor hepatotoxic species", toxic: true },
      { name: "Cocaethylene", via: "hCE1 + ethanol", note: "Longer t½, more cardiotoxic", active: true, toxic: true },
    ],
  },
  ethanol: {
    id: "ethanol",
    blurb: "Chronic use induces CYP2E1 — the NAPQI path for acetaminophen. Acute use occupies ADH.",
    nodes: [
      { name: "Acetaldehyde", via: "ADH · CYP2E1", note: "Toxic intermediate; disulfiram blocks ALDH", toxic: true },
      { name: "Acetate", via: "ALDH", note: "Terminal product" },
    ],
  },
  methadone: {
    id: "methadone",
    blurb: "CYP2B6 and 3A4 to EDDP. Inducers drop levels (withdrawal); inhibitors raise QT risk.",
    nodes: [
      { name: "EDDP", via: "CYP2B6 · CYP3A4", note: "Inactive; used as a compliance marker" },
    ],
  },
  clozapine: {
    id: "clozapine",
    blurb: "CYP1A2 does the work. Smoke induces it; quitting without a dose cut is a toxicity event.",
    nodes: [
      { name: "Norclozapine", via: "CYP1A2", note: "Active; tracks parent", active: true },
    ],
  },
  cannabidiol: {
    id: "cannabidiol",
    blurb: "7-OH-CBD is active. Strong 2C19 inhibition (fluconazole, CBD itself at high dose) stacks parent.",
    nodes: [
      { name: "7-OH-CBD", via: "CYP2C19", note: "Active metabolite", active: true },
      { name: "7-COOH-CBD", via: "further oxidation", note: "Inactive, abundant" },
    ],
  },
  fentanyl: {
    id: "fentanyl",
    blurb: "Norfentanyl via CYP3A4. Strong 3A4 inhibitors raise parent and the airway risk.",
    nodes: [
      { name: "Norfentanyl", via: "CYP3A4", note: "Inactive shunt" },
    ],
  },
  buprenorphine: {
    id: "buprenorphine",
    blurb: "Norbuprenorphine is an active μ-agonist and a P-gp substrate. 3A4 inhibitors raise both.",
    nodes: [
      { name: "Norbuprenorphine", via: "CYP3A4", note: "Active μ-agonist", active: true },
    ],
  },
  "two-fdck": {
    id: "two-fdck",
    blurb: "Same norketamine-class step as ketamine. Oral first-pass is the 2B6/3A4 trap.",
    nodes: [
      { name: "Norketamine analogue", via: "CYP2B6 · CYP3A4", note: "Still NMDA-active", active: true },
    ],
  },
  gbl: {
    id: "gbl",
    blurb: "Serum lactonase converts GBL to GHB within minutes. Alcohol delays a 1,4-BD conversion, not this one.",
    nodes: [
      { name: "GHB", via: "lactonase", note: "The active CNS depressant", active: true, toxic: true },
    ],
  },
  "bd-14": {
    id: "bd-14",
    blurb: "ADH and CYP2E1 turn 1,4-BD into GHB. Ethanol occupies ADH and dumps GHB later.",
    nodes: [
      { name: "GHB", via: "ADH · CYP2E1", note: "Delayed if alcohol is on board", active: true, toxic: true },
    ],
  },
  mephedrone: {
    id: "mephedrone",
    blurb: "CYP2D6 demethylation. A 2D6 PM or a strong 2D6 inhibitor stacks parent cathinone.",
    nodes: [
      { name: "Nor-mephedrone", via: "CYP2D6", note: "Still stimulant/entactogen", active: true },
    ],
  },
  loperamide: {
    id: "loperamide",
    blurb: "P-gp and CYP3A4 keep it out of the brain. Block either and it becomes a central opioid with QT.",
    nodes: [
      { name: "N-desmethyl-loperamide", via: "CYP3A4", note: "Less active" },
    ],
  },
  meperidine: {
    id: "meperidine",
    blurb: "Normeperidine is the seizure metabolite. 3A4 blockade and renal failure both stack it.",
    nodes: [
      { name: "Normeperidine", via: "CYP3A4 · CYP2B6", note: "Neurotoxic; seizures", toxic: true },
    ],
  },
  carisoprodol: {
    id: "carisoprodol",
    blurb: "CYP2C19 to meprobamate. A 2C19 PM or CBD/fluconazole leaves more parent and still makes the barbiturate-like metabolite.",
    nodes: [
      { name: "Meprobamate", via: "CYP2C19", note: "Barbiturate-like sedative", active: true, toxic: true },
    ],
  },
  dck: {
    id: "dck",
    blurb: "Same norketamine-class step as ketamine. Oral first-pass is the 2B6/3A4 trap.",
    nodes: [
      { name: "Nor-DCK", via: "CYP2B6 · CYP3A4", note: "Still NMDA-active", active: true },
    ],
  },
  mda: {
    id: "mda",
    blurb: "CYP2D6 demethylenation, like MDMA. A 2D6 PM or paroxetine stacks parent entactogen.",
    nodes: [
      { name: "HHA / catechol", via: "CYP2D6", note: "Demethylenated product", active: true },
    ],
  },
  "four-aco-dmt": {
    id: "four-aco-dmt",
    blurb: "Deacetylation is not CYP. The active drug is psilocin — same MAO-A map as mushrooms.",
    nodes: [
      { name: "Psilocin", via: "esterases", note: "The 5-HT2A agonist", active: true },
    ],
  },
  desipramine: {
    id: "desipramine",
    blurb: "Sensitive CYP2D6 substrate. 2-hydroxy-desipramine tracks parent; PMs and strong 2D6 inhibitors spike both.",
    nodes: [
      { name: "2-hydroxy-desipramine", via: "CYP2D6", note: "Active; cardiotoxic in excess", active: true, toxic: true },
    ],
  },
  imipramine: {
    id: "imipramine",
    blurb: "CYP2C19 demethylates to desipramine; CYP2D6 hydroxylates both. Two isoform traps.",
    nodes: [
      { name: "Desipramine", via: "CYP2C19", note: "Active TCA", active: true },
      { name: "2-hydroxy-imipramine", via: "CYP2D6", note: "Cardiotoxic in excess", toxic: true },
    ],
  },
  warfarin: {
    id: "warfarin",
    blurb: "S-warfarin (the potent enantiomer) is sensitive CYP2C9. Fluconazole, amiodarone, and 2C9 PMs raise INR.",
    nodes: [
      { name: "7-hydroxy-S-warfarin", via: "CYP2C9", note: "Inactive shunt of the potent enantiomer" },
      { name: "R-warfarin oxidation", via: "CYP1A2 · CYP3A4", note: "Less potent enantiomer" },
    ],
  },
  phenobarbital: {
    id: "phenobarbital",
    blurb: "Autoinducer. After 1–2 weeks it turns on 3A4/2C9/2C19 — OCPs, DOACs, and oral ketamine all fall.",
    nodes: [
      { name: "p-hydroxyphenobarbital", via: "CYP2C19", note: "Then glucuronidated" },
    ],
  },
  efavirenz: {
    id: "efavirenz",
    blurb: "Sensitive CYP2B6 substrate that also induces 2B6 and 3A4. 2B6 PMs get more CNS toxicity; methadone gets withdrawal.",
    nodes: [
      { name: "8-hydroxy-efavirenz", via: "CYP2B6", note: "Neurotoxic metabolite", toxic: true },
    ],
  },
  tapentadol: {
    id: "tapentadol",
    blurb: "UGT2B7, not CYP. Parent is the μ-agonist and the NRI — MAOIs and SSRIs still stack.",
    nodes: [
      { name: "Tapentadol-O-glucuronide", via: "UGT2B7", note: "Inactive" },
    ],
  },
  hydromorphone: {
    id: "hydromorphone",
    blurb: "UGT2B7 to hydromorphone-3-glucuronide. Not a CYP victim; still an opioid for PD.",
    nodes: [
      { name: "H3G", via: "UGT2B7", note: "Neuroexcitatory in renal failure", toxic: true },
    ],
  },
  oxycodone: {
    id: "oxycodone",
    blurb: "3A4 is the main shunt. 2D6 makes oxymorphone — the more potent μ-agonist. Percocet adds APAP on a separate 2E1 map.",
    nodes: [
      { name: "Noroxycodone", via: "CYP3A4", note: "Weakly active shunt" },
      { name: "Oxymorphone", via: "CYP2D6", note: "Hotter μ-agonist", active: true },
    ],
  },
  heroin: {
    id: "heroin",
    blurb: "Minutes to 6-MAM, then morphine. The CYP map is morphine's, not diacetylmorphine's.",
    nodes: [
      { name: "6-Monoacetylmorphine", via: "plasma esterases", note: "Diagnostic of heroin; still a μ-agonist", active: true },
      { name: "Morphine", via: "esterases", note: "The durable opioid", active: true, toxic: true },
    ],
  },
  "dirty-30": {
    id: "dirty-30",
    blurb: "Modeled as illicit fentanyl, not oxycodone. Norfentanyl is the inactive marker; the μ-agonist is parent.",
    nodes: [
      { name: "Norfentanyl", via: "CYP3A4", note: "Inactive; the parent is the opioid" },
    ],
  },
  kratom: {
    id: "kratom",
    blurb: "CYP3A4 turns mitragynine into 7-hydroxymitragynine — the more potent μ-agonist. Street 7-OH skips that step.",
    nodes: [
      { name: "7-Hydroxymitragynine", via: "CYP3A4", note: "Much more potent μ-agonist than parent", active: true, toxic: true },
    ],
  },
  "seven-oh": {
    id: "seven-oh",
    blurb: "The μ-agonist itself. 3A4 still clears it; inhibitors raise the opioid load.",
    nodes: [
      { name: "Further oxidation / conjugation", via: "CYP3A4", note: "Parent is already the hot species", active: true },
    ],
  },
  primidone: {
    id: "primidone",
    blurb: "Activated to phenobarbital. After 1–2 weeks you have a broad CYP inducer on board.",
    nodes: [
      { name: "Phenobarbital", via: "CYP2C19 · oxidation", note: "The inducing barbiturate", active: true },
      { name: "PEMA", via: "oxidation", note: "Active anticonvulsant metabolite", active: true },
    ],
  },
  clopidogrel: {
    id: "clopidogrel",
    blurb: "Prodrug. CYP2C19 (with 3A4/2B6/1A2) to the thiol. 2C19 PMs and omeprazole blunt antiplatelet effect.",
    nodes: [
      { name: "Thiol active metabolite", via: "CYP2C19", note: "Irreversible P2Y12 block", active: true },
    ],
  },
  tamoxifen: {
    id: "tamoxifen",
    blurb: "Endoxifen is the workhorse. CYP2D6 PMs and strong 2D6 inhibitors lose activation.",
    nodes: [
      { name: "Endoxifen", via: "CYP2D6", note: "Potent anti-estrogen", active: true },
      { name: "N-desmethyl-tamoxifen", via: "CYP3A4", note: "Then 2D6 to endoxifen" },
    ],
  },
  diclazepam: {
    id: "diclazepam",
    blurb: "Long RC benzo. Sequential dealkylation toward delorazepam, lorazepam, and lormetazepam.",
    nodes: [
      { name: "Delorazepam", via: "CYP3A4", note: "Long-acting active benzo", active: true },
      { name: "Lorazepam", via: "further metabolism", note: "Then UGT", active: true },
    ],
  },
};

export function treesFor(ids: string[]): MetaboliteTree[] {
  const seen = new Set<string>();
  const out: MetaboliteTree[] = [];
  for (const id of ids) {
    const t = METABOLITE_TREES[id];
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}
