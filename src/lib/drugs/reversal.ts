/** Teaching reversal / antidote map. Not a tox protocol and not a dose. */

import { DRUG_BY_ID } from "./catalog";

export interface ReversalCard {
  agent: string;
  for: string;
  pearl: string;
  caution?: string;
  kind: "antidote" | "support" | "will-not";
}

interface Rule {
  ids?: string[];
  pd?: Array<"opioid" | "benzo-zdrug" | "anticoagulant" | "ssri-snri" | "serotonergic" | "maoi" | "hypoglycemic">;
  card: ReversalCard;
}

const RULES: Rule[] = [
  {
    ids: ["fentanyl", "dirty-30", "heroin", "oxycodone", "hydrocodone", "morphine", "hydromorphone", "oxymorphone", "methadone", "codeine", "tramadol", "tapentadol", "meperidine", "loperamide", "carfentanil", "isotonitazene", "protonitazene", "metonitazene", "etonitazene", "seven-oh", "pressed-30"],
    card: {
      agent: "Naloxone",
      for: "μ-agonist apnea",
      kind: "antidote",
      pearl: "Reverses the opioid. Does not reverse xylazine, medetomidine, or a benzo. Pressed 30s still get naloxone first — then the α2 residual.",
    },
  },
  {
    ids: ["nalmefene"],
    card: {
      agent: "Nalmefene (Opvee)",
      for: "μ-agonist apnea, longer occupancy",
      kind: "antidote",
      pearl: "Longer μ occupancy than naloxone. After a fentanyl or nitazene fold they can re-narcotize — or look over-reversed for hours. Not a CYP substrate. Not a field protocol.",
      caution: "Do not stack with naloxone as two protocols. Pick one antagonist and support the airway.",
    },
  },
  {
    ids: ["xylazine", "medetomidine", "clonidine", "lofexidine", "dexmedetomidine", "guanfacine"],
    card: {
      agent: "Naloxone will not reverse this",
      for: "α2 agonist",
      kind: "will-not",
      pearl: "Airway, fluids, and time. Naloxone still belongs on the tray for the opioid it is usually cut with.",
    },
  },
  {
    pd: ["benzo-zdrug"],
    card: {
      agent: "Flumazenil (rarely)",
      for: "iatrogenic benzo",
      kind: "support",
      pearl: "Not a street-benzo antidote. Seizures in dependent patients. Support the airway first.",
      caution: "Contraindicated after a mixed TCA / unknown overdose.",
    },
  },
  {
    ids: ["acetaminophen", "nac"],
    card: {
      agent: "N-acetylcysteine",
      for: "APAP / NAPQI",
      kind: "antidote",
      pearl: "Rumack-Matthew is the nomogram, not a vibe. Chronic alcohol empties glutathione — NAC is still the antidote, not a CYP play.",
    },
  },
  {
    ids: ["warfarin", "vitamin-k"],
    card: {
      agent: "Vitamin K / PCC",
      for: "warfarin INR",
      kind: "antidote",
      pearl: "Phytonadione is the antidote. A kale smoothie is the same cofactor in a blender. DOACs do not reverse with K.",
    },
  },
  {
    ids: ["dabigatran"],
    card: {
      agent: "Idarucizumab",
      for: "dabigatran",
      kind: "antidote",
      pearl: "Praxbind. Not vitamin K, not andexanet. Severe CKD is why this drug was already a no.",
    },
  },
  {
    ids: ["apixaban", "rivaroxaban"],
    card: {
      agent: "Andexanet alfa (no longer sold in the US) / PCC",
      for: "oral Xa inhibitor",
      kind: "antidote",
      pearl: "Andexxa is no longer sold in the US (FDA safety communication, December 18, 2025); reversal follows the institution's protocol and the Prescribing Information. 4-factor PCC is what most desks actually have. Stopping the DOAC is not vitamin K.",
    },
  },
  {
    ids: ["enoxaparin"],
    card: {
      agent: "Protamine (partial)",
      for: "LMWH",
      kind: "support",
      pearl: "Protamine fully reverses unfractionated heparin; LMWH is only partial. Time and pressure still matter.",
    },
  },
  {
    ids: ["digoxin"],
    card: {
      agent: "Digoxin immune Fab",
      for: "digoxin",
      kind: "antidote",
      pearl: "DigiFab when K is high, heart is slow, or the milligrams were a bottle. Hypokalemia makes a ‘normal’ level toxic — replace K, do not just order the Fab.",
    },
  },
  {
    pd: ["serotonergic", "ssri-snri", "maoi"],
    card: {
      agent: "Cyproheptadine (adjunct)",
      for: "serotonin toxicity",
      kind: "support",
      pearl: "Stop the serotonergic, benzodiazepines, cooling. Cyproheptadine is an antihistamine with 5-HT2A block — adjunct, not a protocol. Hunter criteria sit on the next tab.",
    },
  },
  {
    ids: ["haloperidol", "chlorpromazine", "metoclopramide", "risperidone", "paliperidone"],
    card: {
      agent: "Dantrolene / bromocriptine (NMS)",
      for: "neuroleptic malignant syndrome",
      kind: "support",
      pearl: "Lead-pipe rigidity, bradyreflexia, slower onset. Not Hunter. Stop the dopamine blocker. Dantrolene and bromocriptine are specialist calls.",
    },
  },
  {
    ids: ["diphenhydramine", "hydroxyzine", "oxybutynin", "benztropine", "scopolamine", "amitriptyline"],
    card: {
      agent: "Physostigmine (selected)",
      for: "anticholinergic delirium",
      kind: "support",
      pearl: "Hot, dry, mad, blind. Physostigmine is not automatic — TCA / wide-QRS is a no. Benzos for agitation first.",
      caution: "Avoid when the QRS is wide or a TCA is on the desk.",
    },
  },
  {
    ids: ["metoprolol", "propranolol", "carvedilol", "sotalol"],
    card: {
      agent: "Glucagon / high-insulin euglycemia",
      for: "beta-blocker",
      kind: "support",
      pearl: "Glucagon bypasses the blocked receptor. Propranolol is the lipid-soluble CNS one. Not a CYP story.",
    },
  },
  {
    ids: ["verapamil", "diltiazem", "amlodipine", "nifedipine", "felodipine"],
    card: {
      agent: "Calcium / high-insulin euglycemia",
      for: "calcium-channel blocker",
      kind: "support",
      pearl: "Amlodipine is the long one. Insulin-euglycemia is the modern pressor-adjacent move. Not naloxone.",
    },
  },
  {
    ids: ["methotrexate"],
    card: {
      agent: "Leucovorin / glucarpidase",
      for: "methotrexate",
      kind: "antidote",
      pearl: "High-dose rescue is a nomogram. Weekly RA doses are not this row. NSAID and TMP-SMX delay clearance.",
    },
  },
  {
    ids: ["isoniazid"],
    card: {
      agent: "Pyridoxine",
      for: "INH seizures",
      kind: "antidote",
      pearl: "Gram-for-gram B6 for a known INH ingestion. The hepatitis is a different stop.",
    },
  },
  {
    ids: ["glimepiride", "glipizide", "glyburide"],
    card: {
      agent: "Octreotide + glucose",
      for: "sulfonylurea",
      kind: "antidote",
      pearl: "Glucose alone retriggers insulin. Octreotide shuts the release. GLP-1s are not this row.",
    },
  },
  {
    ids: ["methadone"],
    card: {
      agent: "Naloxone (long watch)",
      for: "methadone apnea / QT",
      kind: "antidote",
      pearl: "t½ is long — naloxone infusions and a long observation. TdP is electrolytes and an ECG, not more Narcan.",
    },
  },
  {
    ids: ["buprenorphine"],
    card: {
      agent: "Naloxone (high dose, maybe)",
      for: "buprenorphine",
      kind: "support",
      pearl: "High-affinity partial agonist. Standard naloxone may look weak. Precipitated withdrawal is the induction problem, not this row.",
    },
  },
  {
    ids: ["naltrexone"],
    card: {
      agent: "Not an acute reversal",
      for: "precipitated withdrawal / Vivitrol",
      kind: "will-not",
      pearl: "Naltrexone is the antagonist already on board. Overdose after a missed Vivitrol week is lost tolerance — naloxone still, then a long watch.",
    },
  },
];

export function reversalOnDesk(ids: string[]): Array<{ id: string; name: string; card: ReversalCard }> {
  const present = new Set(ids);
  const out: Array<{ id: string; name: string; card: ReversalCard }> = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const drug = DRUG_BY_ID[id];
    if (!drug) continue;
    for (const rule of RULES) {
      const hitId = rule.ids?.includes(id);
      const hitPd = rule.pd?.some((p) => drug.pd.includes(p));
      if (!hitId && !hitPd) continue;
      const key = `${id}|${rule.card.agent}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id, name: drug.name, card: rule.card });
    }
  }
  if (present.has("naloxone") && out.some((r) => r.card.agent.startsWith("Naloxone") && r.id !== "naloxone")) {
    // already covered
  }
  return out;
}

export function hasReversal(ids: string[]) {
  return reversalOnDesk(ids).length > 0;
}
