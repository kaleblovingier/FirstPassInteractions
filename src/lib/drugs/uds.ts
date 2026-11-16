/** Urine immunoassay teaching map. Presumptive cups, not LC-MS/MS. */

import { DRUG_BY_ID } from "./catalog";
import type { Finding, Severity } from "./types";

export type AssayId =
  | "opiates"
  | "oxycodone"
  | "methadone"
  | "buprenorphine"
  | "fentanyl"
  | "amphetamines"
  | "cocaine"
  | "thc"
  | "benzos"
  | "pcp"
  | "tca";

export type UdsKind = "expected" | "miss" | "false-pos";

export interface Assay {
  id: AssayId;
  label: string;
  target: string;
  note: string;
}

export interface UdsHit {
  assay: AssayId;
  kind: UdsKind;
  note: string;
}

export interface UdsCard {
  id: string;
  pearl: string;
  hits: UdsHit[];
}

export const ASSAYS: Assay[] = [
  {
    id: "opiates",
    label: "Opiates",
    target: "Morphine / codeine class",
    note: "Morphine-class EIA. Heroin lights via 6-MAM only on a specific assay. Not methadone, not bup, not fentanyl, often not oxycodone.",
  },
  {
    id: "oxycodone",
    label: "Oxycodone",
    target: "Oxycodone / oxymorphone",
    note: "Separate from the opiate cup. Pharmaceutical perc 30s light this; pressed 30s often do not.",
  },
  {
    id: "methadone",
    label: "Methadone / EDDP",
    target: "Methadone or EDDP",
    note: "Parent assay vs metabolite (EDDP). EDDP is how an OTP proves they swallowed it, not dunked the bottle.",
  },
  {
    id: "buprenorphine",
    label: "Buprenorphine",
    target: "Bup / norbuprenorphine",
    note: "Own immunoassay. A daily film that never lights norbup is a different conversation than an opiate cup.",
  },
  {
    id: "fentanyl",
    label: "Fentanyl",
    target: "Fentanyl / norfentanyl",
    note: "Kit-dependent. Nitazenes and carfentanil often miss even a fentanyl strip.",
  },
  {
    id: "amphetamines",
    label: "Amphetamines",
    target: "Amphetamine / methamphetamine",
    note: "Broad antibody. Wellbutrin, labetalol, and some decongestants still fool kits.",
  },
  {
    id: "cocaine",
    label: "Cocaine",
    target: "Benzoylecgonine",
    note: "The specific cup. Coca-leaf tea is the rare dietary true-positive. Most other false-positives are lore.",
  },
  {
    id: "thc",
    label: "THC",
    target: "THC-COOH",
    note: "Hemp / CBD with leftover THC lights it. Synthetic cannabinoids (K2) usually do not.",
  },
  {
    id: "benzos",
    label: "Benzodiazepines",
    target: "Nordiazepam-like",
    note: "Diazepam family lights. Clonazepam, lorazepam, and many designer benzos often miss.",
  },
  {
    id: "pcp",
    label: "PCP",
    target: "Phencyclidine",
    note: "Rare true-positive. DXM, tramadol, diphenhydramine, lamotrigine, and venlafaxine are the classic fools.",
  },
  {
    id: "tca",
    label: "TCA",
    target: "Tricyclic antidepressant",
    note: "Seroquel, Flexeril, Benadryl, and carbamazepine light many TCA cups. Confirm before you accuse.",
  },
];

export const ASSAY_BY_ID = Object.fromEntries(ASSAYS.map((a) => [a.id, a])) as Record<AssayId, Assay>;

const KIND_RANK: Record<UdsKind, number> = { "false-pos": 0, miss: 1, expected: 2 };

function hit(assay: AssayId, kind: UdsKind, note: string): UdsHit {
  return { assay, kind, note };
}

const CARDS: Record<string, Omit<UdsCard, "id">> = {
  methadone: {
    pearl:
      "A morphine-class opiate cup that stays negative on a methadone take-home is the assay working, not a dunked bottle. Ask for EDDP if you need to prove they swallowed it.",
    hits: [
      hit("opiates", "miss", "Methadone is not morphine. The opiate EIA should stay negative."),
      hit("methadone", "expected", "Parent or EDDP. EDDP is the metabolite — dunked bottles do not make it."),
      hit("oxycodone", "miss", "Separate cup. A pharmaceutical perc 30 is a different assay."),
      hit("fentanyl", "miss", "Illicit fentanyl needs its own strip. This is why OTP panels added it."),
      hit("buprenorphine", "miss", "Not a partial agonist. A positive bup cup on methadone is another drug."),
    ],
  },
  buprenorphine: {
    pearl:
      "Suboxone does not light the opiate cup. If the buprenorphine assay is negative on a daily film, look at norbuprenorphine and the clock — not the morphine EIA.",
    hits: [
      hit("opiates", "miss", "Partial agonist, not morphine. Opiate EIA stays negative on a clean film."),
      hit("buprenorphine", "expected", "Bup and norbup. Norbup lasts longer — useful when they last dosed yesterday."),
      hit("methadone", "miss", "Different μ story. A methadone cup on Suboxone is another bottle."),
      hit("fentanyl", "miss", "A fold on a film is occupancy, not a fentanyl strip."),
    ],
  },
  naltrexone: {
    pearl:
      "Vivitrol occupies μ. It does not light any agonist immunoassay. A leftover fold is precipitated withdrawal, not a cup that should have been positive.",
    hits: [
      hit("opiates", "miss", "Antagonist. No morphine epitope."),
      hit("buprenorphine", "miss", "Not a film. A positive bup cup on Vivitrol is another drug."),
      hit("fentanyl", "miss", "The shot does not make fentanyl appear or disappear on a strip."),
    ],
  },
  naloxone: {
    pearl: "Naloxone is not a cup. It is the tray. IM / IN naloxone does not explain a urine immunoassay.",
    hits: [hit("opiates", "miss", "Antagonist. No agonist epitope on the strip.")],
  },
  nalmefene: {
    pearl:
      "Opvee occupies μ longer than naloxone. It still does not light an agonist cup. Re-narcotize vs over-reverse is clinical, not an immunoassay.",
    hits: [hit("opiates", "miss", "Antagonist. Longer occupancy is not a urine finding.")],
  },
  fentanyl: {
    pearl:
      "Fentanyl is not morphine. A negative opiate cup next to a fentanyl strip is expected. Nitazenes and carfentanil often miss even the fentanyl kit.",
    hits: [
      hit("opiates", "miss", "Synthetic. Morphine-class EIA does not see it."),
      hit("fentanyl", "expected", "If the panel includes a fentanyl EIA / strip. Kit-dependent."),
      hit("oxycodone", "miss", "Pressed 30s stamped oxycodone often fail the oxycodone cup and light fentanyl instead."),
    ],
  },
  "dirty-30": {
    pearl: "A pressed 30 is a fentanyl (or nitazene) story. The oxycodone cup staying negative is the tell, not proof they are clean.",
    hits: [
      hit("oxycodone", "miss", "Stamped oxycodone is not pharmaceutical oxycodone."),
      hit("opiates", "miss", "Not morphine."),
      hit("fentanyl", "expected", "Often the only cup that lights — when the kit includes it."),
    ],
  },
  "pressed-30": {
    pearl: "Same as a dirty 30. The stamp is marketing. The cup is chemistry.",
    hits: [
      hit("oxycodone", "miss", "Stamp is not an assay."),
      hit("fentanyl", "expected", "If the panel has a fentanyl strip."),
    ],
  },
  heroin: {
    pearl: "Heroin is a morphine-class true-positive. 6-MAM is the short-window metabolite that proves diacetylmorphine — it is not on a cheap cup.",
    hits: [
      hit("opiates", "expected", "Morphine after deacetylation. Codeine may tag along from street mix."),
      hit("fentanyl", "miss", "Unless the bag was already fentanyl. Most 'heroin' in 2026 is."),
    ],
  },
  morphine: {
    pearl: "The index ligand for the opiate EIA. Poppy seeds can do this too — confirm, do not prosecute a muffin.",
    hits: [hit("opiates", "expected", "The antibody is built around morphine.")],
  },
  codeine: {
    pearl: "Codeine lights the opiate cup. 2D6 to morphine is a phenotype story; the immunoassay does not care.",
    hits: [hit("opiates", "expected", "Codeine and morphine both bind the morphine-class antibody.")],
  },
  oxycodone: {
    pearl: "Pharmaceutical oxycodone often misses the morphine-class opiate EIA. That is why there is a separate oxycodone cup.",
    hits: [
      hit("opiates", "miss", "Many kits under-detect oxycodone. A negative opiate cup is not 'they skipped the perc.'"),
      hit("oxycodone", "expected", "The dedicated assay. Oxymorphone tags along."),
    ],
  },
  hydrocodone: {
    pearl: "Hydrocodone is variable on morphine-class kits — weakly positive or a miss. Not a methadone, not a fentanyl.",
    hits: [
      hit("opiates", "expected", "Often weakly positive. Do not treat a faint line as a dunked bottle."),
      hit("oxycodone", "miss", "Different epitope. A perc cup staying negative is expected."),
    ],
  },
  hydromorphone: {
    pearl: "Dilaudid is closer to morphine than oxycodone is. Still confirm; still not methadone.",
    hits: [hit("opiates", "expected", "Usually lights the morphine-class EIA.")],
  },
  oxymorphone: {
    pearl: "Opana lights the oxycodone family more than morphine.",
    hits: [
      hit("oxycodone", "expected", "Oxymorphone is on the oxycodone antibody."),
      hit("opiates", "miss", "Often a miss on morphine-class kits."),
    ],
  },
  tapentadol: {
    pearl: "Nucynta is not morphine. Dedicated assays exist; the cheap cup usually misses it.",
    hits: [hit("opiates", "miss", "Not on the morphine antibody.")],
  },
  isotonitazene: {
    pearl: "Nitazenes miss morphine and often miss fentanyl strips. A negative cup is not a negative patient.",
    hits: [
      hit("opiates", "miss", "Benzimidazole opioid, not morphine."),
      hit("fentanyl", "miss", "Most fentanyl EIAs do not see isotonitazene."),
    ],
  },
  protonitazene: {
    pearl: "Same nitazene miss. Do not treat a negative fentanyl strip as a clean bag.",
    hits: [
      hit("opiates", "miss", "Not morphine."),
      hit("fentanyl", "miss", "Fentanyl strip is not a nitazene strip."),
    ],
  },
  metonitazene: {
    pearl: "Nitazene. Immunoassay is not the surveillance system you think it is.",
    hits: [hit("opiates", "miss", "Not morphine."), hit("fentanyl", "miss", "Often a miss on fentanyl EIA.")],
  },
  etonitazene: {
    pearl: "Nitazene. Cups were built for a different decade.",
    hits: [hit("opiates", "miss", "Not morphine."), hit("fentanyl", "miss", "Often a miss.")],
  },
  carfentanil: {
    pearl: "Carfentanil often misses even a fentanyl strip. Naloxone still belongs on the tray.",
    hits: [hit("opiates", "miss", "Not morphine."), hit("fentanyl", "miss", "Potency is not epitope.")],
  },
  "seven-oh": {
    pearl: "7-OH-mitragynine is not morphine and not buprenorphine on most cups. Kratom panels exist; the cheap board does not.",
    hits: [
      hit("opiates", "miss", "Atypical opioid. Morphine EIA usually stays negative."),
      hit("buprenorphine", "miss", "Not a film. Do not read a negative bup cup as 'they skipped kratom.'"),
    ],
  },
  kratom: {
    pearl: "Mitragynine needs its own assay. A negative opiate cup on daily kratom is expected.",
    hits: [hit("opiates", "miss", "Not morphine.")],
  },
  quetiapine: {
    pearl: "Seroquel for sleep at the window is a classic TCA-cup false-positive. Confirm before you chart an overdose or a lie.",
    hits: [hit("tca", "false-pos", "Quetiapine cross-reacts on many TCA immunoassays. LC-MS/MS is quiet.")],
  },
  cyclobenzaprine: {
    pearl: "Flexeril is a TCA-shaped molecule. The TCA cup lights; the patient is not on amitriptyline.",
    hits: [hit("tca", "false-pos", "Tricyclic-adjacent structure. Confirm.")],
  },
  diphenhydramine: {
    pearl: "Benadryl fools TCA and sometimes PCP cups. An OTP night-time antihistamine is not a TCA OD.",
    hits: [
      hit("tca", "false-pos", "Common OTC TCA immunoassay cross-reactant."),
      hit("pcp", "false-pos", "Some PCP kits. Confirm."),
    ],
  },
  hydroxyzine: {
    pearl: "Vistaril is a window antihistamine. Some TCA kits still twitch. Confirm; do not take the film.",
    hits: [hit("tca", "false-pos", "Less famous than Seroquel, still reported.")],
  },
  carbamazepine: {
    pearl: "Tegretol can light a TCA cup and dump methadone. Two different rows — immunoassay vs 3A4/2B6.",
    hits: [hit("tca", "false-pos", "Carbamazepine is a documented TCA EIA interferent.")],
  },
  sertraline: {
    pearl: "Zoloft can light a benzodiazepine immunoassay. A benzo cup on a patient who swears they only take Zoloft may be the antibody, not a Klonopin.",
    hits: [hit("benzos", "false-pos", "Sertraline is a documented benzo EIA false-positive (Saitman).")],
  },
  clonazepam: {
    pearl: "Klonopin often misses the cheap benzo cup. A negative immunoassay is not proof they skipped the tablet.",
    hits: [hit("benzos", "miss", "Poor cross-reactivity on many nordiazepam-targeted kits. LC-MS/MS sees it.")],
  },
  lorazepam: {
    pearl: "Ativan is glucuronidated and often misses the benzo EIA. Same trap as clonazepam.",
    hits: [hit("benzos", "miss", "Many kits under-detect lorazepam.")],
  },
  alprazolam: {
    pearl: "Xanax is variable. Some kits see it; some do not. Do not treat a negative cup as adherence.",
    hits: [hit("benzos", "expected", "Often lights, not reliably. Confirm if the answer changes the window.")],
  },
  diazepam: {
    pearl: "Valium is the index ligand for most benzo EIAs. Nordiazepam is what the antibody was raised against.",
    hits: [hit("benzos", "expected", "The cup was built for this family.")],
  },
  bromazolam: {
    pearl: "Designer benzo. Immunoassay is a coin flip. A negative cup next to a seized bromazolam tablet is not a clean patient.",
    hits: [hit("benzos", "miss", "Many nordiazepam kits miss bromazolam. LC-MS/MS or a designer-benzo panel.")],
  },
  bupropion: {
    pearl: "Wellbutrin is the most famous amphetamine-cup false-positive in clinic. Confirm before you chart meth.",
    hits: [hit("amphetamines", "false-pos", "Bupropion and metabolites cross-react on amphetamine EIAs.")],
  },
  dextromethorphan: {
    pearl: "DXM is a classic PCP-cup false-positive and a 2D6 victim. Two different boards — immunoassay vs phenotype.",
    hits: [hit("pcp", "false-pos", "Dextromethorphan fools many PCP EIAs. Confirm.")],
  },
  lamotrigine: {
    pearl: "Lamictal can light a PCP cup. A mood-stabilizer start is not phencyclidine.",
    hits: [hit("pcp", "false-pos", "Documented PCP EIA interferent.")],
  },
  venlafaxine: {
    pearl: "Effexor can light PCP. Confirm.",
    hits: [hit("pcp", "false-pos", "Venlafaxine / O-desmethylvenlafaxine vs PCP antibody.")],
  },
  tramadol: {
    pearl:
      "Tramadol is not morphine. PCP and some buprenorphine kits still twitch. Confirm before you change the film.",
    hits: [
      hit("opiates", "miss", "Not morphine."),
      hit("pcp", "false-pos", "Classic PCP EIA fool."),
      hit("buprenorphine", "false-pos", "Some bup kits."),
    ],
  },
  rifampin: {
    pearl: "Rifampin dumps methadone and can false-positive an opiate cup. Stolen-dose PK plus a dirty immunoassay — two rows.",
    hits: [hit("opiates", "false-pos", "Historical opiate EIA interferent. Confirm; still watch the 3A4/2B6 dump.")],
  },
  ciprofloxacin: {
    pearl: "Some fluoroquinolones have been reported as opiate EIA false-positives. Cipro next to methadone is still the QT / 1A2 row first.",
    hits: [hit("opiates", "false-pos", "Reported; kit-dependent. Confirm. Do not skip the QT board.")],
  },
  efavirenz: {
    pearl: "Sustiva has been reported to light THC cups and dumps methadone. Two rows: immunoassay and 3A4/2B6 induction.",
    hits: [hit("thc", "false-pos", "Efavirenz vs some cannabinoid EIAs. Confirm.")],
  },
  cocaine: {
    pearl: "Benzoylecgonine is the specific cup. A true-positive is usually cocaine. Coca tea is the dietary footnote.",
    hits: [hit("cocaine", "expected", "BZE. Rare dietary true-positive from coca leaf.")],
  },
  dronabinol: {
    pearl: "Marinol is THC. The cup should light. That is the prescription, not a slip.",
    hits: [hit("thc", "expected", "Exogenous THC-COOH. Chart the prescription so the cup is not a fight.")],
  },
  cannabidiol: {
    pearl: "Clean CBD should not light THC. Many bottles are not clean. Hemp-derived products still carry THC-COOH.",
    hits: [hit("thc", "expected", "If the product is dirty with THC. Pure CBD is a miss.")],
  },
  ethanol: {
    pearl: "EtG / EtS are not on a cheap drugs-of-abuse cup. A standard UDS does not prove they drank — or that they did not.",
    hits: [],
  },
};

export function udsFor(id: string): UdsCard | undefined {
  const row = CARDS[id];
  if (!row) return undefined;
  return { id, ...row };
}

export function hasUds(id: string) {
  return Boolean(CARDS[id]);
}

export function udsOnDesk(ids: string[]): UdsCard[] {
  const out: UdsCard[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const card = udsFor(id);
    if (!card || seen.has(id)) continue;
    seen.add(id);
    out.push(card);
  }
  return out;
}

export function udsHeadline(ids: string[]): string | null {
  if (ids.includes("methadone")) {
    return "Opiate EIA stays negative on methadone — that is the assay.";
  }
  if (ids.includes("buprenorphine")) {
    return "A Suboxone film does not light the opiate cup. Ask for bup / norbup.";
  }
  if (ids.includes("fentanyl") || ids.includes("dirty-30") || ids.includes("pressed-30")) {
    return "Fentanyl is not morphine. Nitazenes often miss the fentanyl strip too.";
  }
  if (udsOnDesk(ids).some((c) => c.hits.some((h) => h.kind === "false-pos"))) {
    return "At least one immunoassay false-positive sits on this desk. Confirm before you chart it.";
  }
  if (udsOnDesk(ids).length) return "Immunoassay is presumptive. LC-MS/MS is the tie-breaker.";
  return null;
}

function finding(
  id: string,
  suffix: string,
  severity: Severity,
  headline: string,
  effect: string,
  mechanism: string,
  clinical: string,
): Finding {
  return {
    id: `${id}__clinic-${suffix}`,
    severity,
    kind: "clinic",
    drugIds: [id],
    headline,
    enzymes: [],
    effect,
    mechanism,
    clinical,
    tags: ["clinic", "uds", "mat"],
  };
}

/** Short clinic findings that point at the UDS board. One per desk, not one per assay. */
export function udsFindings(ids: string[]): Finding[] {
  const out: Finding[] = [];
  const on = (id: string) => ids.includes(id);
  if (on("methadone")) {
    out.push(
      finding(
        "methadone",
        "uds-miss",
        "moderate",
        "Methadone vs the opiate cup",
        "opiate EIA stays negative",
        "morphine-class immunoassay does not see methadone",
        "A negative morphine-class cup on a methadone take-home is the assay working. EDDP proves they swallowed it. Open the UDS tab. Not LC-MS/MS and not a dunked-bottle verdict.",
      ),
    );
  }
  if (on("buprenorphine")) {
    out.push(
      finding(
        "buprenorphine",
        "uds-miss",
        "moderate",
        "Suboxone vs the opiate cup",
        "needs a buprenorphine assay",
        "partial agonist is not morphine",
        "Buprenorphine does not light the opiate EIA. Ask for bup / norbuprenorphine. A negative morphine cup is expected on a daily film. Open the UDS tab.",
      ),
    );
  }
  if (on("fentanyl") || on("dirty-30") || on("pressed-30")) {
    const id = on("fentanyl") ? "fentanyl" : on("dirty-30") ? "dirty-30" : "pressed-30";
    out.push(
      finding(
        id,
        "uds-miss",
        "moderate",
        "Fentanyl is not an opiate cup",
        "morphine EIA misses fentanyl; nitazenes miss fentanyl strips",
        "synthetic epitope",
        "Fentanyl needs its own strip. Pressed 30s often fail the oxycodone cup. Nitazenes and carfentanil often miss even the fentanyl kit. Open the UDS tab.",
      ),
    );
  }
  if (on("quetiapine")) {
    out.push(
      finding(
        "quetiapine",
        "uds-tca",
        "moderate",
        "Seroquel vs the TCA cup",
        "false-positive TCA immunoassay",
        "cross-reactivity, not a TCA",
        "Quetiapine lights many TCA cups. Confirm with LC-MS/MS before you chart an overdose or a lie. Open the UDS tab. Saitman 2014 is on the Cites shelf.",
      ),
    );
  }
  if (on("sertraline")) {
    out.push(
      finding(
        "sertraline",
        "uds-benzo",
        "minor",
        "Zoloft vs the benzo cup",
        "false-positive benzodiazepine immunoassay",
        "sertraline cross-reactivity",
        "Sertraline can light a benzo EIA. A patient who swears they only take Zoloft may be telling the truth. Confirm. Open the UDS tab.",
      ),
    );
  }
  if (on("bupropion")) {
    out.push(
      finding(
        "bupropion",
        "uds-amph",
        "moderate",
        "Wellbutrin vs the amphetamine cup",
        "false-positive amphetamine immunoassay",
        "bupropion metabolite cross-reactivity",
        "Bupropion is the most famous amphetamine-cup fool in clinic. Confirm before you chart meth. Open the UDS tab.",
      ),
    );
  }
  if (on("dextromethorphan")) {
    out.push(
      finding(
        "dextromethorphan",
        "uds-pcp",
        "moderate",
        "DXM vs the PCP cup",
        "false-positive PCP immunoassay",
        "dextromethorphan cross-reactivity",
        "Dextromethorphan lights many PCP EIAs. Confirm. The 2D6 board is a different row. Open the UDS tab.",
      ),
    );
  }
  if (on("rifampin") && on("methadone")) {
    out.push(
      finding(
        "rifampin",
        "uds-opiate",
        "moderate",
        "Rifampin vs the opiate cup",
        "possible false-positive plus a stolen methadone dose",
        "immunoassay interferent + 3A4/2B6 induction",
        "Rifampin can false-positive an opiate EIA and still dump methadone. Two rows: the cup and the window. Confirm the immunoassay; do not skip the stolen-dose watch.",
      ),
    );
  }
  if (on("bromazolam") || on("clonazepam") || on("lorazepam")) {
    const id = on("bromazolam") ? "bromazolam" : on("clonazepam") ? "clonazepam" : "lorazepam";
    out.push(
      finding(
        id,
        "uds-benzo-miss",
        "minor",
        `${DRUG_BY_ID[id]?.name ?? id} vs the benzo cup`,
        "benzodiazepine EIA often misses",
        "poor nordiazepam cross-reactivity",
        "Many cheap benzo cups were raised against nordiazepam. Clonazepam, lorazepam, and designer benzos often miss. A negative cup is not a skipped tablet. Open the UDS tab.",
      ),
    );
  }
  return out;
}

export function sortHits(hits: UdsHit[]): UdsHit[] {
  return [...hits].sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.assay.localeCompare(b.assay));
}
