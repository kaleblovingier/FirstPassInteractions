/**
 * Clinical board station ids, the groups the station picker shows them in,
 * and the pure helpers that sort and filter them.
 *
 * To add a station: add its id to CLINICAL_TAB_IDS, then add it to one group below.
 * A station left out of every group still shows, in a final "More" group.
 */

export const CLINICAL_TAB_IDS = [
  "otp",
  "hr",
  "wards",
  "dose",
  "cyp",
  "qt",
  "levels",
  "liver",
  "pheno",
  "reversal",
  "mme",
  "hunter",
  "uds",
  "bedside",
  "alerts",
  "anc",
  "inr",
  "acb",
  "dialysis",
  "steroids",
  "apap",
  "iron",
  "digoxin",
  "phenobarbital",
  "aminoglycosides",
  "lithium",
  "doac",
  "valproate",
  "potassium",
  "sglt2",
  "oncology",
  "antimicrobial",
  "phenytoin",
  "pregnancy",
  "obstetrickinetics",
  "vasoactive",
  "transplant",
  "neuropsych",
  "anticoagulation",
  "toxicology",
  "antiarrhythmic",
  "acidbase",
  "anesthesia",
  "epilepsy",
  "moud",
  "glycemic",
  "pediatric",
  "resources",
  "separation",
  "rotation",
  "hepatic",
  "allergy",
  "af",
  "dili",
  "hivart",
  "contraception",
  "statin",
  "thyroid",
  "falls",
] as const;

export type ClinicalTabId = (typeof CLINICAL_TAB_IDS)[number];

export interface StationGroupDef {
  id: string;
  label: string;
  tabs: readonly ClinicalTabId[];
}

/** Groups in display order. Tabs inside a group show in the order listed here. */
export const STATION_GROUPS: readonly StationGroupDef[] = [
  {
    id: "tools",
    label: "Desk tools",
    tabs: ["wards", "dose", "cyp", "levels", "pheno", "separation", "alerts", "resources", "bedside"],
  },
  {
    id: "heart",
    label: "Heart & rhythm",
    tabs: ["qt", "antiarrhythmic", "digoxin", "af", "vasoactive", "statin"],
  },
  {
    id: "blood",
    label: "Blood & clotting",
    tabs: ["anticoagulation", "doac", "inr", "anc", "iron"],
  },
  {
    id: "brain",
    label: "Brain & mood",
    tabs: ["neuropsych", "hunter", "lithium", "valproate", "phenytoin", "phenobarbital", "epilepsy"],
  },
  {
    id: "older",
    label: "Older adults & falls",
    tabs: ["acb", "falls"],
  },
  {
    id: "opioids",
    label: "Opioids, overdose & tox",
    tabs: ["otp", "moud", "hr", "mme", "rotation", "uds", "toxicology", "apap", "reversal"],
  },
  {
    id: "organs",
    label: "Kidney, liver & electrolytes",
    tabs: ["dialysis", "potassium", "acidbase", "hepatic", "liver", "dili"],
  },
  {
    id: "infection",
    label: "Infection, cancer & transplant",
    tabs: ["antimicrobial", "aminoglycosides", "hivart", "transplant", "oncology"],
  },
  {
    id: "endocrine",
    label: "Endocrine & metabolic",
    tabs: ["glycemic", "sglt2", "steroids", "thyroid"],
  },
  {
    id: "pregnancy",
    label: "Pregnancy & children",
    tabs: ["pregnancy", "obstetrickinetics", "contraception", "pediatric"],
  },
  {
    id: "periop",
    label: "Anesthesia & allergy",
    tabs: ["anesthesia", "allergy"],
  },
];

export const MORE_GROUP_ID = "more";
export const MORE_GROUP_LABEL = "More";

/** Open for every tray. The picker puts them at the end of the on-tray row. */
export const ALWAYS_ON_STATIONS: readonly ClinicalTabId[] = ["resources", "bedside"];

/** Extra search words for short or coded labels. The filter matches these too. */
export const STATION_ALIASES: Partial<Record<ClinicalTabId, string>> = {
  otp: "Opioid treatment program",
  hr: "Harm reduction",
  wards: "Ward collisions",
  dose: "Dose rails",
  cyp: "CYP450 start and stop clocks",
  qt: "QTc torsades",
  levels: "Therapeutic drug monitoring TDM",
  liver: "Hepatotoxicity",
  pheno: "Phenoconversion",
  reversal: "Antidotes",
  mme: "Morphine milligram equivalents",
  hunter: "Serotonin syndrome NMS",
  uds: "Urine drug screen",
  anc: "Absolute neutrophil count",
  inr: "Warfarin",
  doac: "Direct oral anticoagulants",
  sglt2: "Euglycemic DKA",
  acb: "Anticholinergic burden",
  dialysis: "Hemodialysis",
  steroids: "Corticosteroids HPA",
  apap: "Acetaminophen",
  antimicrobial: "Antibiotics",
  vasoactive: "Pressors inotropes",
  epilepsy: "Seizures",
  separation: "Binders",
  af: "Atrial fibrillation",
  dili: "Drug-induced liver injury",
  bedside: "Bedside math CrCl QTc Child-Pugh",
};

export function isAlwaysOnStation(id: string): boolean {
  return (ALWAYS_ON_STATIONS as readonly string[]).includes(id);
}

export function stationAlias(id: string): string | undefined {
  return STATION_ALIASES[id as ClinicalTabId];
}

export interface StationGroup<T> {
  id: string;
  label: string;
  tabs: T[];
}

/**
 * Sorts tabs into STATION_GROUPS order. Empty groups are dropped.
 * Any tab id no group lists lands in a final "More" group, in input order.
 */
export function groupStations<T extends { id: string }>(tabs: readonly T[]): StationGroup<T>[] {
  const byId = new Map<string, T[]>();
  for (const t of tabs) {
    const list = byId.get(t.id);
    if (list) list.push(t);
    else byId.set(t.id, [t]);
  }
  const placed = new Set<string>();
  const out: StationGroup<T>[] = [];
  for (const g of STATION_GROUPS) {
    const members: T[] = [];
    for (const id of g.tabs) {
      if (placed.has(id)) continue;
      const found = byId.get(id);
      if (!found) continue;
      placed.add(id);
      members.push(...found);
    }
    if (members.length) out.push({ id: g.id, label: g.label, tabs: members });
  }
  const rest = tabs.filter((t) => !placed.has(t.id));
  if (rest.length) out.push({ id: MORE_GROUP_ID, label: MORE_GROUP_LABEL, tabs: rest });
  return out;
}

/** Tabs that are open now, in group order, with the always-on ones last. */
export function trayStations<T extends { id: string; on: boolean }>(tabs: readonly T[]): T[] {
  const flat = groupStations(tabs).flatMap((g) => g.tabs);
  const open = flat.filter((t) => t.on && !isAlwaysOnStation(t.id));
  const tail = ALWAYS_ON_STATIONS.flatMap((id) => flat.filter((t) => t.id === id && t.on));
  return [...open, ...tail];
}

function words(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTerms(query: string): string[] {
  return words(query)
    .split(" ")
    .filter((w) => w && w !== "and");
}

/** True when every query word is in the tab label, its alias, or its group name. Case and punctuation do not matter. */
export function stationMatches(tab: { id: string; label: string }, groupLabel: string, query: string): boolean {
  const terms = queryTerms(query);
  if (!terms.length) return true;
  const alias = stationAlias(tab.id) ?? "";
  const hay = words(`${tab.label} ${alias} ${groupLabel}`);
  const tight = hay.replace(/ /g, "");
  return terms.every((w) => hay.includes(w) || tight.includes(w));
}

/** Keeps only matching tabs. Drops groups left empty. A blank query keeps everything. */
export function filterStationGroups<T extends { id: string; label: string }>(
  groups: readonly StationGroup<T>[],
  query: string,
): StationGroup<T>[] {
  if (!queryTerms(query).length) return groups.map((g) => ({ ...g, tabs: [...g.tabs] }));
  return groups
    .map((g) => ({ ...g, tabs: g.tabs.filter((t) => stationMatches(t, g.label, query)) }))
    .filter((g) => g.tabs.length > 0);
}
