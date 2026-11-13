import type { SeverityTier } from "../../types/interaction";

export const ENZYMES = [
  "CYP1A2",
  "CYP2B6",
  "CYP2C8",
  "CYP2C9",
  "CYP2C19",
  "CYP2D6",
  "CYP2E1",
  "CYP3A4",
  "P-gp",
] as const;

export type Enzyme = (typeof ENZYMES)[number];

export type Strength = "strong" | "moderate" | "weak";
export type SubstrateSensitivity = "sensitive" | "major" | "minor";
export type Severity = "contraindicated" | "major" | "moderate" | "minor";

export type Metabolizer = "PM" | "IM" | "NM" | "UM";

export const PHENOTYPE_ENZYMES = ["CYP2D6", "CYP2C19", "CYP2C9", "CYP2B6"] as const;
export type PhenotypeEnzyme = (typeof PHENOTYPE_ENZYMES)[number];
export type PhenotypeMap = Record<PhenotypeEnzyme, Metabolizer>;

export const DEFAULT_PHENOTYPES: PhenotypeMap = {
  CYP2D6: "NM",
  CYP2C19: "NM",
  CYP2C9: "NM",
  CYP2B6: "NM",
};

export const METABOLIZER_LABEL: Record<Metabolizer, string> = {
  PM: "Poor",
  IM: "Intermediate",
  NM: "Normal",
  UM: "Ultrarapid",
};

export type KetamineRoute = "iv" | "in" | "oral";
export type CannabisRoute = "smoked" | "oral";
export type AlcoholPattern = "off" | "acute" | "chronic";
export type AgeBand = "adult" | "geriatric";
export type KidneyBand = "ok" | "ckd";
export type PregBand = "off" | "pregnant" | "lactating";

export const KETAMINE_ROUTE_LABEL: Record<KetamineRoute, string> = {
  iv: "IV / IM",
  in: "Intranasal",
  oral: "Oral",
};

export const CANNABIS_ROUTE_LABEL: Record<CannabisRoute, string> = {
  smoked: "Smoked",
  oral: "Edible",
};

export const ALCOHOL_LABEL: Record<AlcoholPattern, string> = {
  off: "Off",
  acute: "Acute",
  chronic: "Chronic",
};

export const AGE_LABEL: Record<AgeBand, string> = {
  adult: "Adult",
  geriatric: "Geriatric",
};

export const KIDNEY_LABEL: Record<KidneyBand, string> = {
  ok: "Usual GFR",
  ckd: "CKD",
};

export const PREG_LABEL: Record<PregBand, string> = {
  off: "Off",
  pregnant: "Pregnant",
  lactating: "Lactating",
};

export const PHENO_FREQ: Record<PhenotypeEnzyme, Partial<Record<Metabolizer, string>>> = {
  CYP2D6: { PM: "~7% EUR", UM: "~2–3% EUR" },
  CYP2C19: { PM: "~3% EUR · ~13% E. Asian", UM: "~30% EUR *17" },
  CYP2C9: { PM: "~2–6% EUR *3/*3", IM: "~30% EUR *2/*3" },
  CYP2B6: { PM: "~5–10% *6/*6" },
};

export interface HostContext {
  phenotypes: PhenotypeMap;
  smoking: boolean;
  ketamineRoute: KetamineRoute;
  cannabisRoute: CannabisRoute;
  alcohol: AlcoholPattern;
  age?: AgeBand;
  kidney?: KidneyBand;
  preg?: PregBand;
  egfr?: number;
  ckdStage?: number;
}

export const DEFAULT_HOST: HostContext = {
  phenotypes: { ...DEFAULT_PHENOTYPES },
  smoking: false,
  ketamineRoute: "iv",
  cannabisRoute: "smoked",
  alcohol: "off",
  age: "adult",
  kidney: "ok",
  preg: "off",
};

export type EnzymeRole =
  | {
      enzyme: Enzyme;
      kind: "substrate";
      sensitivity: SubstrateSensitivity;
      pathway: "clearance" | "activation";
      nti?: boolean;
    }
  | {
      enzyme: Enzyme;
      kind: "inhibitor" | "inducer";
      strength: Strength;
    };

export type PdFlag =
  | "serotonergic"
  | "maoi"
  | "cns-depressant"
  | "opioid"
  | "partial-opioid"
  | "benzo-zdrug"
  | "qt-known"
  | "qt-possible"
  | "anticoagulant"
  | "antiplatelet"
  | "nsaid"
  | "ssri-snri"
  | "hypoglycemic"
  | "insulin-secretagogue"
  | "acei-arb"
  | "k-sparing"
  | "loop-thiazide"
  | "anticholinergic"
  | "bradycardic"
  | "ndhp-ccb"
  | "beta-blocker"
  | "nitrate"
  | "pde5"
  | "alpha-blocker"
  | "statin"
  | "fibrate"
  | "nephrotoxic"
  | "seizure-lowering"
  | "hepatotoxic"
  | "immunosuppressant"
  | "dissociative"
  | "psychedelic"
  | "stimulant"
  | "cannabinoid"
  | "opioid-antagonist"
  | "alcohol"
  | "ghb"
  | "tyramine"
  | "fat-meal"
  | "sodium-load"
  | "sodium-restriction"
  | "urinary-acid"
  | "urinary-alkaline"
  | "tryptophan"
  | "alpha2-agonist"
  | "hypokalemic"
  | "oatp-block"
  | "protein-load"
  | "polyphenol-drink"
  | "histamine"
  | "enteral"
  | "vitk-food"
  | "k-food"
  | "fed-boost"
  | "empty-stomach";

export type ItemKind = "drug" | "food" | "herb" | "research-peptide";

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  drug: "Medicine",
  food: "Food",
  herb: "Herb",
  "research-peptide": "Research peptide",
};

export interface Drug {
  id: string;
  name: string;
  brands: string[];
  cls: string;
  aliases: string[];
  enzymes: EnzymeRole[];
  pd: PdFlag[];
  toxicityHint: string;
  note?: string;
  kind: ItemKind;
}

export interface Finding {
  id: string;
  severity: Severity;
  kind: "pk" | "pd" | "geno" | "clinic";
  drugIds: string[];
  headline: string;
  enzymes: Enzyme[];
  effect: string;
  mechanism: string;
  clinical: string;
  tags: string[];
}

export interface EnzymeBurden {
  enzyme: Enzyme;
  substrates: string[];
  inhibitors: string[];
  inducers: string[];
  collisions: number;
}

export interface Report {
  findings: Finding[];
  burden: EnzymeBurden[];
  highest: Severity | "none";
  counts: Record<Severity, number>;
  stacks: StackBar[];
}

export const STACK_AXES = ["serotonin", "cns", "qt", "pressor", "nmda"] as const;
export type StackAxis = (typeof STACK_AXES)[number];

export const STACK_LABEL: Record<StackAxis, string> = {
  serotonin: "Serotonin mood",
  cns: "Sedation / breathing",
  qt: "Heart rhythm (QT)",
  pressor: "Blood pressure",
  nmda: "NMDA / ketamine",
};

export interface StackBar {
  axis: StackAxis;
  score: number;
  cap: number;
  items: string[];
}

/** Hours since each tray item was last taken, keyed by catalog id. A missing key means not stated. */
export type IngestionTimes = Record<string, number>;

/** One tray item on the timing sketch: first-order decay from a typical adult half-life. Not a level. */
export interface DecayRow {
  id: string;
  name: string;
  /** Typical adult elimination half-life in hours. Undefined when this shelf has none. */
  halfLifeH?: number;
  /** Where the half-life came from: the PK shelf, a label sentence, or a PMID. */
  source?: string;
  /** Why no half-life is sketched (ethanol clears at a fixed rate, no shelf row). */
  note?: string;
  hoursAgo?: number;
  /** 0–1 share left by 0.5^(hoursAgo / halfLifeH). Undefined unless both inputs are known. */
  remaining?: number;
}

/** One pair on the timing sketch. It annotates the engine's own severity and never changes it. */
export interface OverlapRow {
  pair: [string, string];
  severity: Severity | "none";
  /** 0–100: the smaller remaining share of the two. Undefined without a time and a half-life on both sides, or when `holds` is set. */
  activeOverlapPercent?: number;
  /** A clock on this pair that outlasts half-life math (label washout, enzyme resynthesis). When set, no percent is given. */
  holds?: string;
}

export interface Timeline {
  rows: DecayRow[];
  pairs: OverlapRow[];
}

const TIER: Record<Severity | "none", SeverityTier> = {
  contraindicated: "Contraindicated",
  major: "Severe",
  moderate: "Moderate",
  minor: "Low",
  none: "Unknown",
};

/** The engine's severity under its wire name (src/types/interaction.ts). The only place a tier is made. */
export function toSeverityTier(severity: Severity | "none"): SeverityTier {
  return TIER[severity];
}

export const SEVERITY_RANK: Record<Severity | "none", number> = {
  contraindicated: 4,
  major: 3,
  moderate: 2,
  minor: 1,
  none: 0,
};

export const SEVERITY_LABEL: Record<Severity | "none", string> = {
  contraindicated: "Avoid together",
  major: "Serious concern",
  moderate: "Use care",
  minor: "Mild note",
  none: "Not mapped",
};

/** Shorter chips for the desk — still educational categories, not a harm prediction. */
export const SEVERITY_PLAIN: Record<Severity | "none", string> = {
  contraindicated: "Avoid together",
  major: "Serious concern",
  moderate: "Use care",
  minor: "Mild note",
  none: "Unmapped",
};

export const SEVERITY_HINT: Record<Severity | "none", string> = {
  contraindicated: "Avoid together is a teaching bin. On this desk it is kept for a named label pin, not for pharmacokinetic math. It is not an order to stop a medicine.",
  major: "A serious teaching collision. Read the PI; this desk does not dose or decide care.",
  moderate: "Worth a careful look. Context and the official label still govern.",
  minor: "A milder flag. Useful for teaching; not a green light.",
  none: "No severity mapped for this row yet.",
};
