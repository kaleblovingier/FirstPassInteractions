/**
 * Study cards for trainees.
 * Every answer is a restatement of this desk's map, a round, or an FDA grade already on the CYP tab.
 * Not an exam key. Not a milligram. Not a prescription.
 */

import { DRUGS, DRUG_BY_ID } from "./catalog";
import { FDA_GRADES, TDI } from "./cyp-protocol";
import { ROUNDS } from "./rounds";
import type { Drug, Enzyme, Finding } from "./types";
import { ENZYMES } from "./types";
import { safetyOnDesk } from "./safety";

if (DRUG_BY_ID["hctz"] && !DRUG_BY_ID["hydrochlorothiazide"]) {
  DRUG_BY_ID["hydrochlorothiazide"] = DRUG_BY_ID["hctz"];
}

export type StudyLane = "drill" | "boards" | "desk" | "cyp" | "clinical";
export type StudyMark = "got" | "miss";
export type StudyPile = "all" | "open" | "miss";

export type ClinicalTopic =
  | "all"
  | "cardio"
  | "endocrine"
  | "electrolytes"
  | "neuro"
  | "anticoag"
  | "tox"
  | "addiction"
  | "bedside"
  | "cyp";

export interface ClinicalTopicDef {
  id: ClinicalTopic;
  label: string;
  shortLabel: string;
}

export const CLINICAL_TOPICS: ClinicalTopicDef[] = [
  { id: "all", label: "All topics", shortLabel: "All" },
  { id: "cardio", label: "Cardiology & QTc", shortLabel: "Cardio & QTc" },
  { id: "endocrine", label: "Endocrine & SGLT2", shortLabel: "Endocrine" },
  { id: "electrolytes", label: "Electrolytes & Renal", shortLabel: "Electrolytes" },
  { id: "neuro", label: "Neurology & Sedation", shortLabel: "Neurology" },
  { id: "anticoag", label: "Anticoagulation & DOACs", shortLabel: "Anticoag" },
  { id: "tox", label: "Toxicology & TDM", shortLabel: "Tox & TDM" },
  { id: "addiction", label: "Addiction Medicine & Harm Reduction", shortLabel: "Addiction & MOUD" },
  { id: "bedside", label: "Bedside & Reversal", shortLabel: "Bedside" },
  { id: "cyp", label: "CYP & Transporters", shortLabel: "CYP & PK" },
];

export interface StudyChoice {
  id: string;
  label: string;
}

export interface StudyCard {
  id: string;
  lane: StudyLane;
  kicker: string;
  title: string;
  prompt: string;
  ask: string;
  answer: string;
  choices?: StudyChoice[];
  correct?: string;
  drugIds: string[];
  topic?: ClinicalTopic;
}

export const STUDY_LANES: { id: StudyLane; label: string }[] = [
  { id: "drill", label: "Rounds" },
  { id: "boards", label: "Named pairs" },
  { id: "cyp", label: "Enzyme map" },
  { id: "clinical", label: "Bedside & Tox" },
  { id: "desk", label: "This desk" },
];

export const STUDY_PILES: { id: StudyPile; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Unseen" },
  { id: "miss", label: "Missed" },
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function bySeed<T extends { id: string }>(rows: T[], seed: string) {
  return [...rows].sort((a, b) => hash(seed + a.id) - hash(seed + b.id) || a.id.localeCompare(b.id));
}

function clip(s: string, n = 520) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}

const POOL = DRUGS.filter((d) => d.kind === "drug" || d.kind === "food" || d.kind === "herb");

function strongOf(d: Drug, enzyme: Enzyme, kind: "inhibitor" | "inducer") {
  return d.enzymes.some((e) => e.kind === kind && e.enzyme === enzyme && e.strength === "strong");
}

function sensitiveOf(d: Drug, enzyme: Enzyme) {
  return d.enzymes.some(
    (e) => e.kind === "substrate" && e.enzyme === enzyme && e.sensitivity === "sensitive",
  );
}

function activationOf(d: Drug, enzyme: Enzyme) {
  return d.enzymes.some(
    (e) => e.kind === "substrate" && e.enzyme === enzyme && e.pathway === "activation",
  );
}

function choicesFor(correct: Drug, reject: (d: Drug) => boolean, seed: string): StudyChoice[] | null {
  const distractors = bySeed(
    POOL.filter((d) => d.id !== correct.id && !reject(d)),
    seed,
  ).slice(0, 3);
  if (distractors.length < 3) return null;
  const rows = bySeed(
    [
      { id: correct.id, label: correct.name },
      ...distractors.map((d) => ({ id: d.id, label: d.name })),
    ],
    `${seed}-order`,
  );
  return rows;
}

function pushRole(
  out: StudyCard[],
  enzyme: Enzyme,
  kind: "inhibitor" | "inducer" | "substrate" | "activation",
  hits: Drug[],
  cap: number,
) {
  const verb =
    kind === "inhibitor"
      ? `strong ${enzyme} inhibitor`
      : kind === "inducer"
        ? `strong ${enzyme} inducer`
        : kind === "activation"
          ? `${enzyme} activation substrate (prodrug)`
          : `sensitive ${enzyme} substrate`;
  const fold =
    kind === "inhibitor"
      ? FDA_GRADES.inhibitor.strong.fold
      : kind === "inducer"
        ? FDA_GRADES.inducer.strong.fold
        : "Sensitive index substrates are how FDA grades the perpetrator. Not a milligram.";
  for (const hit of hits.slice(0, cap)) {
    const reject =
      kind === "inhibitor"
        ? (d: Drug) => strongOf(d, enzyme, "inhibitor")
        : kind === "inducer"
          ? (d: Drug) => strongOf(d, enzyme, "inducer")
          : kind === "activation"
            ? (d: Drug) => activationOf(d, enzyme)
            : (d: Drug) => sensitiveOf(d, enzyme);
    const choices = choicesFor(hit, reject, `${enzyme}-${kind}-${hit.id}`);
    if (!choices) continue;
    out.push({
      id: `cyp-${enzyme}-${kind}-${hit.id}`,
      lane: "cyp",
      kicker: enzyme,
      title: verb,
      prompt: "Formulary map. One of these four carries the role. The other three do not, on this desk.",
      ask: `Which is a ${verb}?`,
      answer: `${hit.name} is mapped as a ${verb}. ${kind === "inhibitor" || kind === "inducer" ? `FDA strong: ${fold}.` : fold} Open the atlas. This card does not pick a milligram.`,
      choices,
      correct: hit.id,
      drugIds: [hit.id],
    });
  }
}

export function cypCards(): StudyCard[] {
  const out: StudyCard[] = [];
  for (const enzyme of ENZYMES) {
    const strongInh = POOL.filter((d) => strongOf(d, enzyme, "inhibitor")).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const strongInd = POOL.filter((d) => strongOf(d, enzyme, "inducer")).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const sensitive = POOL.filter((d) => sensitiveOf(d, enzyme)).sort((a, b) => a.name.localeCompare(b.name));
    const activation = POOL.filter((d) => activationOf(d, enzyme)).sort((a, b) => a.name.localeCompare(b.name));
    pushRole(out, enzyme, "inhibitor", strongInh, 3);
    pushRole(out, enzyme, "inducer", strongInd, 3);
    pushRole(out, enzyme, "substrate", sensitive, 3);
    if (activation.length) pushRole(out, enzyme, "activation", activation, 1);
  }

  const grades: { id: string; ask: string; correct: string; rows: StudyChoice[]; answer: string }[] = [
    {
      id: "cyp-grade-inh-strong",
      ask: "FDA fold-change for a strong inhibitor?",
      correct: "strong",
      rows: [
        { id: "strong", label: FDA_GRADES.inhibitor.strong.fold },
        { id: "mod", label: FDA_GRADES.inhibitor.moderate.fold },
        { id: "weak", label: FDA_GRADES.inhibitor.weak.fold },
        { id: "ind", label: FDA_GRADES.inducer.strong.fold },
      ],
      answer: `Strong inhibitor: ${FDA_GRADES.inhibitor.strong.fold}. Moderate is ${FDA_GRADES.inhibitor.moderate.fold}. Weak is ${FDA_GRADES.inhibitor.weak.fold}. Huang / FDA 2020 table — not a vibe, and not a milligram.`,
    },
    {
      id: "cyp-grade-ind-strong",
      ask: "FDA fold-change for a strong inducer?",
      correct: "strong",
      rows: [
        { id: "strong", label: FDA_GRADES.inducer.strong.fold },
        { id: "mod", label: FDA_GRADES.inducer.moderate.fold },
        { id: "weak", label: FDA_GRADES.inducer.weak.fold },
        { id: "inh", label: FDA_GRADES.inhibitor.strong.fold },
      ],
      answer: `Strong inducer: ${FDA_GRADES.inducer.strong.fold}. The stop is rebound, not a completed course. Open the CYP tab.`,
    },
  ];
  for (const g of grades) {
    out.push({
      id: g.id,
      lane: "cyp",
      kicker: "FDA grade",
      title: "Fold-change, not a vibe",
      prompt: "These numbers are AUC fold-changes of a sensitive index substrate. They are not a dose.",
      ask: g.ask,
      answer: g.answer,
      choices: g.rows,
      correct: g.correct,
      drugIds: [],
    });
  }

  for (const [id, row] of Object.entries(TDI)) {
    const drug = DRUG_BY_ID[id];
    if (!drug) continue;
    out.push({
      id: `cyp-tdi-${id}`,
      lane: "cyp",
      kicker: "Time-dependent inactivation",
      title: drug.name,
      prompt: `Yesterday's last dose of ${drug.name} is gone from the bottle. The enzyme is not.`,
      ask: "Why is the victim still hot after the perpetrator stops?",
      answer: `${row.pearl} Resynthesis: ${row.resynth}. Enzymes: ${row.enzymes.join(", ")}. This is a clock, not a milligram.`,
      drugIds: [id],
    });
  }

  return [...out, ...directionCards()];
}

function directionCards(): StudyCard[] {
  const foldInh = FDA_GRADES.inhibitor.strong.fold;
  const foldInd = FDA_GRADES.inducer.strong.fold;
  const cards: Array<Omit<StudyCard, "lane" | "drugIds" | "topic">> = [
    {
      id: "cyp-arrow-inhibit",
      kicker: "Direction",
      title: "Inhibitor, parent cleared",
      prompt: "The enzyme was clearing the parent. A strong inhibitor is on the desk.",
      ask: "What does the strong inhibitor do to that parent?",
      answer: `Slows clearance. Parent can rise. FDA strong inhibitor: ${foldInh}. This card does not pick a milligram.`,
      choices: [
        { id: "slows", label: "Slows clearance" },
        { id: "speeds", label: "Speeds clearance" },
        { id: "activates", label: "Makes more active product" },
        { id: "none", label: "No mapped change" },
      ],
      correct: "slows",
    },
    {
      id: "cyp-arrow-induce",
      kicker: "Direction",
      title: "Inducer, parent cleared",
      prompt: "The enzyme was clearing the parent. A strong inducer is on the desk.",
      ask: "What does the strong inducer do to that parent?",
      answer: `Speeds clearance. Parent can fall. FDA strong inducer: ${foldInd}. When the inducer stops, the enzyme can come back. Not a milligram.`,
      choices: [
        { id: "speeds", label: "Speeds clearance" },
        { id: "slows", label: "Slows clearance" },
        { id: "activates", label: "Makes more active product" },
        { id: "none", label: "No mapped change" },
      ],
      correct: "speeds",
    },
    {
      id: "cyp-arrow-prodrug",
      kicker: "Direction",
      title: "Inhibitor meets a prodrug",
      prompt: "The enzyme activates the prodrug. A strong inhibitor is on the desk.",
      ask: "Which way does the active product move?",
      answer: "Less active product. Inhibition is not “the drug builds up” when the pathway is activation. Not a milligram.",
      choices: [
        { id: "less", label: "Less active product" },
        { id: "more", label: "More active product" },
        { id: "parent", label: "Parent only rises" },
        { id: "none", label: "No mapped change" },
      ],
      correct: "less",
    },
    {
      id: "cyp-arrow-blank",
      kicker: "Direction",
      title: "Blank cell",
      prompt: "Two drugs share an enzyme. Neither is mapped as a perpetrator.",
      ask: "What is the blank cell?",
      answer: "Not a clearance. It says no perpetrator or no victim was mapped. It does not say the pair is safe.",
      choices: [
        { id: "blank", label: "Not a clearance" },
        { id: "safe", label: "Safe to combine" },
        { id: "minor", label: "A minor interaction" },
        { id: "contra", label: "A contraindication" },
      ],
      correct: "blank",
    },
    {
      id: "cyp-arrow-shelf",
      kicker: "Direction",
      title: "Same shelf",
      prompt: "Two drugs share a class. No perpetrator is mapped between them.",
      ask: "What is the same-shelf cell?",
      answer: "Not a collision by itself, and not a clearance. Same class is not the same as an enzyme hit.",
      choices: [
        { id: "shelf", label: "Not a collision by itself" },
        { id: "cyp", label: "A CYP collision" },
        { id: "contra", label: "A contraindication" },
        { id: "dose", label: "A milligram change" },
      ],
      correct: "shelf",
    },
    {
      id: "cyp-arrow-victim",
      kicker: "Direction",
      title: "Victim marks",
      prompt: "The chip under a CYP row names the victim, not a dose.",
      ask: "Which mark means the enzyme is a small part of clearance?",
      answer: "Minor pathway. Sensitive substrate is the index victim. Narrow window is a tight range. Prodrug means the enzyme activates it. None of these is a milligram.",
      choices: [
        { id: "minor", label: "Minor pathway" },
        { id: "sensitive", label: "Sensitive substrate" },
        { id: "nti", label: "Narrow window" },
        { id: "prodrug", label: "Prodrug" },
      ],
      correct: "minor",
    },
  ];
  return cards.map((card) => ({ ...card, lane: "cyp" as const, drugIds: [] }));
}

export function drillCards(): StudyCard[] {
  return ROUNDS.map((r) => ({
    id: `round-${r.id}`,
    lane: "drill" as const,
    kicker: r.setting,
    title: r.title,
    prompt: r.stem,
    ask: r.ask,
    answer: r.teach,
    drugIds: r.drugIds,
  }));
}

function roleLine(d: Drug) {
  const bits = d.enzymes.map((e) => {
    if (e.kind === "substrate") {
      const act = e.pathway === "activation" ? ", activation" : "";
      return `${e.sensitivity} ${e.enzyme} substrate${act}`;
    }
    return `${e.strength} ${e.enzyme} ${e.kind}`;
  });
  return bits;
}

export function deskCards(ids: string[], findings: Finding[]): StudyCard[] {
  const out: StudyCard[] = [];
  for (const f of findings.slice(0, 6)) {
    const names = f.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? id).join(" × ");
    const kind =
      f.kind === "pk" ? "Pharmacokinetic" : f.kind === "pd" ? "Pharmacodynamic" : f.kind === "geno" ? "Phenotype" : "Clinic";
    out.push({
      id: `desk-${f.id}`,
      lane: "desk",
      kicker: kind,
      title: names || "Collision",
      prompt: `${names}. Mapped severity: ${f.severity}. Effect: ${f.effect}.`,
      ask: "Say the mechanism out loud before you reveal. A preceptor wants the enzyme or the receptor, not a milligram.",
      answer: clip([f.mechanism, f.clinical].filter(Boolean).join(" ")),
      drugIds: f.drugIds,
    });
  }
  for (const id of ids) {
    const d = DRUG_BY_ID[id];
    if (!d) continue;
    const roles = roleLine(d);
    out.push({
      id: `mono-${id}`,
      lane: "desk",
      kicker: d.cls,
      title: d.name,
      prompt: d.brands.length ? `Brands on this shelf: ${d.brands.slice(0, 3).join(", ")}.` : d.cls,
      ask: "Enzyme roles, then the PD flag. Skip any milligram.",
      answer: clip(
        [
          roles.length ? `Enzymes: ${roles.join("; ")}.` : "No CYP role on this map — absence is not proof it is clean.",
          d.pd.length ? `PD flags: ${d.pd.join(", ")}.` : "",
          d.toxicityHint ? `Watch: ${d.toxicityHint}.` : "",
          d.note ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
      drugIds: [id],
    });
  }
  return out;
}

export function cardsFor(lane: StudyLane, ids: string[], findings: Finding[]): StudyCard[] {
  if (lane === "drill") return drillCards();
  if (lane === "cyp") return cypCards();
  if (lane === "boards") return boardsCards();
  if (lane === "clinical") return clinicalCards();
  return deskCards(ids, findings);
}

/** Canonical labeled collisions. Stems come from safetyOnDesk — no new milligrams. */
const NAMED_PAIRS: [string, string][] = [
  ["epclusa", "amiodarone"],
  ["clozapine", "lorazepam"],
  ["aspirin", "ibuprofen"],
  ["lamotrigine", "valproate"],
  ["lamotrigine", "ethinyl-estradiol"],
  ["tamoxifen", "paroxetine"],
  ["ethinyl-estradiol", "rifampin"],
  ["isotretinoin", "doxycycline"],
  ["ciprofloxacin", "prednisone"],
  ["lisinopril", "losartan"],
  ["omeprazole", "ketoconazole"],
  ["clopidogrel", "omeprazole"],
  ["empagliflozin", "furosemide"],
];

export function boardsCards(): StudyCard[] {
  const hits = NAMED_PAIRS.flatMap(([a, b]) => {
    if (!DRUG_BY_ID[a] || !DRUG_BY_ID[b]) return [];
    return safetyOnDesk([a, b]);
  });
  const unique = hits.filter(
    (h, i) => hits.findIndex((x) => x.id === h.id && x.drugIds.join("|") === h.drugIds.join("|")) === i,
  );
  const out: StudyCard[] = [];
  for (const h of unique) {
    const others = bySeed(
      unique.filter((x) => x.mechanism !== h.mechanism),
      `board-${h.id}`,
    ).slice(0, 3);
    if (others.length < 3) continue;
    const choices = bySeed(
      [{ id: h.id, label: h.mechanism }, ...others.map((o) => ({ id: `${o.id}-d`, label: o.mechanism }))],
      `board-order-${h.id}`,
    );
    out.push({
      id: `board-${h.id}-${h.drugIds.join("+")}`,
      lane: "boards",
      kicker: "Named pair",
      title: h.title,
      prompt: `Mapped severity: ${h.severity}. Three of these mechanisms belong to other labeled pairs.`,
      ask: "Which mechanism is this pair?",
      answer: clip(`${h.clinical} ${h.watch} Source: ${h.source}`),
      choices,
      correct: h.id,
      drugIds: [...h.drugIds],
    });
  }
  return out;
}

export const CLINICAL_TOPIC_MAP: Record<string, ClinicalTopic> = {
  // Cardiology & QTc
  "clin-digoxin-hf-targets": "cardio",
  "clin-digifab-post-lab-trap": "cardio",
  "clin-ag-endocarditis-synergy": "cardio",
  "clin-tisdale-score-cutoffs": "cardio",
  "clin-bazett-tachycardia-inflation": "cardio",
  "clin-tdp-magnesium-mechanism": "cardio",
  "clin-tdp-overdrive-pacing-isoproterenol": "cardio",
  "clin-qtc-hypokalemia-herg-blockade": "cardio",
  "clin-digoxin-amiodarone-pgp": "cardio",
  "clin-methadone-fluconazole-qtc-3a4": "cardio",
  "clin-ivabradine-if-hcn-channel": "cardio",
  "clin-sildenafil-nitrate-cgmp-shock": "cardio",
  "clin-sacubitril-neprilysin-angioedema": "cardio",
  "clin-amiodarone-thyroid-mechanisms": "cardio",
  "clin-statin-oatp1b1-rhabdomyolysis": "cardio",
  "clin-gs-adenylyl-cyclase-pka-beta": "cardio",
  "clin-pde5-cgmp-smooth-muscle-relaxation": "cardio",

  // Endocrine & SGLT2
  "clin-steroid-equiv-potency": "endocrine",
  "clin-hpa-suppression-threshold": "endocrine",
  "clin-dka-pseudohyponatremia-fluids": "endocrine",
  "clin-iron-fgf23-hypophosphatemia": "endocrine",
  "clin-sglt2-eudka-triad": "endocrine",
  "clin-sglt2-preop-hold-guidance": "endocrine",

  // Electrolytes & Renal
  "clin-dialysis-ceftriaxone-vs-cefepime": "electrolytes",
  "clin-lithium-post-hd-rebound": "electrolytes",
  "clin-anion-gap-albumin-correction": "electrolytes",
  "clin-calvert-gfr-cap": "electrolytes",
  "clin-lithium-extrip-criteria": "electrolytes",
  "clin-lithium-intracellular-rebound": "electrolytes",
  "clin-lithium-proximal-reabsorption-nhe3": "electrolytes",
  "clin-hyperk-normal-ekg-trap": "electrolytes",
  "clin-hyperk-calcium-salt-selection": "electrolytes",
  "clin-hyperk-ckd-insulin-dose-reduction": "electrolytes",
  "clin-renal-gabapentinoid-myoclonus": "electrolytes",
  "clin-hd-dialyzability-factors": "electrolytes",
  "clin-lithium-hctz-nsaid-clearance": "electrolytes",
  "clin-sglt2-tubuloglomerular-feedback": "electrolytes",
  "clin-vd-dialysis-clearance": "electrolytes",
  "clin-sglt2-ketogenesis-glucagon": "electrolytes",
  "clin-metformin-oct2-mate1-cimetidine": "electrolytes",

  // Neurology & Sedation
  "clin-acb-threshold": "neuro",
  "clin-phenytoin-sheiner-tozer": "neuro",
  "clin-clozapine-rems-anc": "neuro",
  "clin-pheno-infusion-rate-limit": "neuro",
  "clin-lithium-target-bands": "neuro",
  "clin-valproate-vhe-normal-lft-trap": "neuro",
  "clin-valproate-carbapenem-crash": "neuro",
  "clin-beers-anticholinergic-fall-fracture": "neuro",
  "clin-vmat2-vesicular-depletion": "neuro",
  "clin-gaba-a-subtypes-sedation-anxiolysis": "neuro",
  "clin-gq-phospholipase-c-ip3-dag": "neuro",
  "clin-gi-girk-potassium-channel-opioid": "neuro",

  // Anticoagulation & DOACs
  "clin-dabigatran-reversal": "anticoag",
  "clin-ganzoni-iron-depot": "anticoag",
  "clin-rivaroxaban-food-bioavailability": "anticoag",
  "clin-dabigatran-capsule-crush-hazard": "anticoag",

  // Toxicology & TDM
  "clin-vanco-target": "tox",
  "clin-osmolar-gap-alcohol": "tox",
  "clin-child-pugh-classes": "tox",
  "clin-serotonin-hunter-hallmark": "tox",
  "clin-apap-rumack-treatment-line": "tox",
  "clin-vanco-sawchuk-zaske-timing": "tox",
  "clin-vanco-auc-vs-trough-nephro": "tox",
  "clin-pheno-urine-alkalinization-trap": "tox",
  "clin-hartford-draw-timing": "tox",
  "clin-ag-obesity-adjbw": "tox",
  "clin-ag-mt1555-ototoxicity": "tox",
  "clin-dasatinib-ppi-gastric-ph": "tox",
  "clin-ss-vs-nms-differentials": "tox",
  "clin-linezolid-ssri-maoi": "tox",
  "clin-aspirin-zero-order-salicylate": "tox",
  "clin-anticholinergic-hyperthermia": "tox",
  "clin-loperamide-pgp-bbb-penetration": "tox",

  // Addiction Medicine & Harm Reduction
  "clin-bup-precip-pharmacology": "addiction",
  "clin-fentanyl-adipose-depot-kinetics": "addiction",
  "clin-naloxone-half-life-renarcotization": "addiction",
  "clin-methadone-cyp-qtc-safety": "addiction",
  "clin-naltrexone-washout-window": "addiction",
  "clin-xylazine-tranq-management": "addiction",
  "clin-alcohol-withdrawal-ciwa-gaba": "addiction",
  "clin-bup-micro-induction-bernese": "addiction",

  // Bedside & Reversal
  "clin-doac-reversal-mechanisms": "bedside",
  "clin-sugammadex-cyclodextrin-chelation": "bedside",
  "clin-aspirin-platelet-covalent-acetylation": "bedside",
  "clin-steroid-nuclear-receptor-transactivation": "bedside",
  "clin-probenecid-oat1-oat3-penicillin": "bedside",

  // CYP & Pharmacokinetics
  "clin-warfarin-bactrim-cyp2c9": "cyp",
  "clin-phenytoin-michaelis-menten": "cyp",
};

export function clinicalCards(): StudyCard[] {
  const cards: StudyCard[] = [
    {
      id: "clin-vanco-target",
      lane: "clinical",
      kicker: "Pharmacokinetics",
      title: "Vancomycin Consensus Target",
      prompt: "2020 ASHP/IDSA/PIDS/SIDP consensus guidelines revised therapeutic monitoring for serious MRSA infections.",
      ask: "What is the recommended primary PK/PD target?",
      choices: [
        { id: "auc-target", label: "AUC24:MIC of 400–600 mg·h/L (assuming MIC 1 mg/L)" },
        { id: "trough-target", label: "Trough concentration of 15–20 µg/mL alone" },
        { id: "high-auc", label: "AUC24:MIC > 700 mg·h/L" },
        { id: "peak-target", label: "Peak concentration of 30–40 µg/mL" },
      ],
      correct: "auc-target",
      answer: "2020 ASHP/IDSA guidelines retired trough-only targeting (15–20 µg/mL) because high troughs cause 3- to 4-fold higher nephrotoxicity without improving clinical efficacy. The gold standard is AUC24:MIC 400–600 mg·h/L.",
      drugIds: ["vancomycin"],
    },
    {
      id: "clin-dabigatran-reversal",
      lane: "clinical",
      kicker: "Anticoagulation",
      title: "Dabigatran Reversal",
      prompt: "A patient on dabigatran presents with life-threatening intracranial hemorrhage.",
      ask: "Which specific monoclonal antibody fragment reverses dabigatran?",
      choices: [
        { id: "praxbind", label: "Idarucizumab (Praxbind)" },
        { id: "andexxa", label: "Andexanet alfa (Andexxa)" },
        { id: "vitk", label: "Phytonadione (Vitamin K1)" },
        { id: "protamine", label: "Protamine sulfate" },
      ],
      correct: "praxbind",
      answer: "Idarucizumab (Praxbind) is a humanized Fab fragment with 350x higher affinity for dabigatran than thrombin. Andexanet alfa reverses Factor Xa inhibitors (apixaban, rivaroxaban). In extreme emergencies where Praxbind is unavailable, dabigatran is ~50–60% cleared by hemodialysis.",
      drugIds: ["dabigatran"],
    },
    {
      id: "clin-acb-threshold",
      lane: "clinical",
      kicker: "Geriatrics",
      title: "Anticholinergic Cognitive Burden Cutoff",
      prompt: "A geriatric patient is reviewed for anticholinergic cognitive burden using Boustani / Campbell criteria.",
      ask: "At what cumulative ACB score does published literature show a marked inflection in delirium, falls, and cognitive impairment?",
      choices: [
        { id: "score-3", label: "Score ≥ 3" },
        { id: "score-1", label: "Score ≥ 1" },
        { id: "score-6", label: "Score ≥ 6" },
        { id: "score-10", label: "Score ≥ 10" },
      ],
      correct: "score-3",
      answer: "Boustani 2008 and Campbell 2013 establish a score ≥3 as the critical threshold for significantly increased risks of acute delirium, cognitive decline, and falls in older adults. Drugs scoring +3 include TCAs, first-generation antihistamines, and oxybutynin.",
      drugIds: ["diphenhydramine", "oxybutynin"],
    },
    {
      id: "clin-dialysis-ceftriaxone-vs-cefepime",
      lane: "clinical",
      kicker: "Nephrology",
      title: "Cephalosporin Dialytic Clearance",
      prompt: "Two patients on hemodialysis receive IV cephalosporins: Patient A gets cefepime; Patient B gets ceftriaxone.",
      ask: "Why does cefepime require post-HD replacement dosing while ceftriaxone requires NO post-HD supplement?",
      choices: [
        { id: "protein-binding", label: "Ceftriaxone is 90% protein bound (not dialyzed); Cefepime is only 20% bound and ~68% dialyzed" },
        { id: "mw-diff", label: "Ceftriaxone has a molecular weight over 5,000 Da" },
        { id: "renal-only", label: "Cefepime is eliminated solely by hepatic glucuronidation" },
        { id: "membrane-pore", label: "Ceftriaxone is an intracellular-only antibiotic" },
      ],
      correct: "protein-binding",
      answer: "Protein binding is a primary physical barrier to dialyzer filtration: only free unbound drug crosses the membrane. Ceftriaxone is 85–95% bound to albumin and has dual biliary/renal elimination (<5% cleared by HD). Cefepime has only 20% binding, is ~68% cleared by HD, and must be administered post-HD to avoid subtherapeutic %T > MIC.",
      drugIds: ["cefepime", "ceftriaxone"],
    },
    {
      id: "clin-osmolar-gap-alcohol",
      lane: "clinical",
      kicker: "Toxicology",
      title: "Toxic Alcohol Osmolar Gap",
      prompt: "A patient with suspected ethylene glycol ingestion has calculated serum osmolality of 290 mOsm/kg and measured osmolality of 345 mOsm/kg.",
      ask: "What is the serum osmolar gap, and what is the primary competitive enzyme inhibitor used for treatment?",
      choices: [
        { id: "gap-55-fomepizole", label: "Gap 55 mOsm/kg; Fomepizole (alcohol dehydrogenase blocker)" },
        { id: "gap-15-naloxone", label: "Gap 15 mOsm/kg; Naloxone" },
        { id: "gap-0-bicarb", label: "Gap 0 mOsm/kg; Sodium bicarbonate alone" },
        { id: "gap-55-flumazenil", label: "Gap 55 mOsm/kg; Flumazenil" },
      ],
      correct: "gap-55-fomepizole",
      answer: "Osmolar gap = Measured (345) - Calculated (290) = 55 mOsm/kg (>15 threshold). This severe gap reflects unmeasured low-MW toxic alcohol solutes. Fomepizole competitively inhibits alcohol dehydrogenase (ADH) with 8,000x greater affinity than ethanol, halting production of toxic oxalic and glycolic acids.",
      drugIds: ["fomepizole", "ethanol"],
    },
    {
      id: "clin-child-pugh-classes",
      lane: "clinical",
      kicker: "Hepatology",
      title: "Child-Pugh Classification",
      prompt: "A patient with cirrhosis has Total Bilirubin 2.5 mg/dL, Albumin 3.1 g/dL, INR 1.9, slight ascites, and no encephalopathy.",
      ask: "What is the Child-Pugh score and class?",
      choices: [
        { id: "score-8-class-b", label: "Score 8 points · Class B (Moderate hepatic impairment)" },
        { id: "score-5-class-a", label: "Score 5 points · Class A (Mild hepatic impairment)" },
        { id: "score-11-class-c", label: "Score 11 points · Class C (Severe hepatic impairment)" },
        { id: "score-14-class-c", label: "Score 14 points · Class C (Severe hepatic impairment)" },
      ],
      correct: "score-8-class-b",
      answer: "Bilirubin 2–3 (2 pts) + Albumin 2.8–3.5 (2 pts) + INR 1.7–2.3 (2 pts) + Slight ascites (2 pts) + No encephalopathy (1 pt) = 8 points -> Class B (7–9 pts). Class B represents significant functional compromise and is a frequent FDA label threshold for empirical 50% dose reductions.",
      drugIds: ["propranolol"],
    },
    {
      id: "clin-serotonin-hunter-hallmark",
      lane: "clinical",
      kicker: "Clinical Toxicology",
      title: "Hunter Serotonin Toxicity Criteria",
      prompt: "A patient on linezolid and sertraline develops hyperthermia, tremor, diaphoresis, and altered mental status.",
      ask: "Under the published Hunter Serotonin Toxicity Criteria, what physical exam finding is the defining clinical hallmark?",
      choices: [
        { id: "clonus", label: "Spontaneous or inducible clonus (ocular or lower extremity)" },
        { id: "lead-pipe", label: "Lead-pipe plastic rigidity and hyporeflexia" },
        { id: "miosis", label: "Pinpoint pupils (miosis) and respiratory depression" },
        { id: "hypothermia", label: "Core hypothermia with anhidrosis" },
      ],
      correct: "clonus",
      answer: "Under Dunkley 2003 Hunter Criteria, clonus (spontaneous, inducible, or ocular) combined with agitation/diaphoresis or tremor/hyperreflexia is the diagnostic hallmark of serotonin toxicity. In contrast, lead-pipe rigidity and hyporeflexia characterize Neuroleptic Malignant Syndrome (NMS).",
      drugIds: ["linezolid", "sertraline"],
    },
    {
      id: "clin-phenytoin-sheiner-tozer",
      lane: "clinical",
      kicker: "Therapeutic Drug Monitoring",
      title: "Sheiner-Tozer Phenytoin Correction",
      prompt: "A patient with hypoalbuminemia (albumin 2.0 g/dL) has a reported total phenytoin level of 10 µg/mL.",
      ask: "Why is the total level misleading, and how does the Sheiner-Tozer adjusted level compare?",
      choices: [
        { id: "corrected-higher", label: "Corrected level is ~20 µg/mL (active free fraction is elevated due to fewer albumin binding sites)" },
        { id: "corrected-lower", label: "Corrected level is ~5 µg/mL (drug has cleared rapidly)" },
        { id: "same-level", label: "Total and free levels are always identical regardless of albumin" },
        { id: "inactive", label: "Phenytoin is inactive when bound to albumin" },
      ],
      correct: "corrected-higher",
      answer: "Phenytoin is ~90% bound to albumin. In hypoalbuminemia, fewer binding sites exist, so a larger percentage of drug circulates as active unbound (free) phenytoin. Sheiner-Tozer equation: Corrected = Total / (0.2 · Albumin + 0.1) = 10 / (0.4 + 0.1) = 20 µg/mL. A total level of 10 appears normal, but the active exposure is near the toxic threshold.",
      drugIds: ["phenytoin"],
    },
    {
      id: "clin-clozapine-rems-anc",
      lane: "clinical",
      kicker: "Psychiatry / Hematology",
      title: "Clozapine REMS ANC Thresholds",
      prompt: "A patient on clozapine has routine CBC monitoring without documented Benign Ethnic Neutropenia (BEN).",
      ask: "What is the absolute neutrophil count (ANC) cutoff below which clozapine therapy must be interrupted?",
      choices: [
        { id: "anc-1000", label: "ANC < 1,000 /µL (severe neutropenia in general population)" },
        { id: "anc-2000", label: "ANC < 2,000 /µL" },
        { id: "anc-500", label: "ANC < 500 /µL" },
        { id: "anc-1500", label: "ANC < 1,500 /µL for BEN patients" },
      ],
      correct: "anc-1000",
      answer: "Under FDA Clozapine REMS, in the general population, ANC 1,000–1,499 /µL requires three-times-weekly monitoring (continue therapy). When ANC drops < 1,000 /µL (severe neutropenia), clozapine must be immediately interrupted. In documented BEN, the interruption threshold is ANC < 500 /µL.",
      drugIds: ["clozapine"],
    },
    {
      id: "clin-lithium-post-hd-rebound",
      lane: "clinical",
      kicker: "Extracorporeal Elimination",
      title: "Lithium Hemodialysis Rebound",
      prompt: "A patient with acute lithium toxicity (serum level 4.2 mEq/L) completes a 4-hour hemodialysis run. The immediate post-dialysis level is 1.1 mEq/L. Six hours later, the patient becomes confused and repeat level is 2.3 mEq/L.",
      ask: "What pharmacokinetic phenomenon explains the rise in lithium concentration hours after dialysis stops?",
      choices: [
        { id: "rebound-redistribution", label: "Intracellular lithium slowly redistributes back into the vascular space" },
        { id: "hepatic-metabolism", label: "The liver synthesizes new lithium ions" },
        { id: "dehydration", label: "Loss of body water concentrates fixed vascular lithium by 400%" },
        { id: "protein-unbinding", label: "Lithium unbinds from albumin where it was stored" },
      ],
      correct: "rebound-redistribution",
      answer: "Lithium is a tiny monovalent cation that distributes across total body water and enters intracellular compartments. During hemodialysis, intravascular lithium is rapidly cleared, but intracellular lithium efflux is rate-limited. Once dialysis ends, intracellular lithium slowly redistributes back into plasma over 6–8 hours, causing post-dialysis rebound that frequently necessitates repeat dialysis sessions.",
      drugIds: ["lithium"],
    },
    {
      id: "clin-steroid-equiv-potency",
      lane: "clinical",
      kicker: "Endocrinology / Pharmacology",
      title: "Corticosteroid Equivalence & Potency",
      prompt: "A patient hospitalized with acute inflammatory disease is transitioning from IV methylprednisolone to oral outpatient prednisone.",
      ask: "What is the equivalent glucocorticoid dose ratio between methylprednisolone and prednisone, and what is their relative mineralocorticoid activity?",
      choices: [
        { id: "ratio-4-to-5", label: "4 mg methylprednisolone = 5 mg prednisone; methylprednisolone has zero mineralocorticoid effect while prednisone has modest retention" },
        { id: "ratio-20-to-5", label: "20 mg methylprednisolone = 5 mg prednisone; both cause identical severe sodium retention" },
        { id: "ratio-1-to-1", label: "Doses are 1:1 milligram equivalent; both are identical to hydrocortisone" },
        { id: "ratio-inverted", label: "10 mg methylprednisolone = 1 mg prednisone; methylprednisolone is a pure mineralocorticoid" },
      ],
      correct: "ratio-4-to-5",
      answer: "Standard glucocorticoid equivalence establishes 4 mg methylprednisolone = 5 mg prednisone = 20 mg hydrocortisone = 0.75 mg dexamethasone. Methylprednisolone and dexamethasone have zero mineralocorticoid activity (zero sodium retention/potassium wasting), whereas prednisone retains modest mineralocorticoid effect (potency 0.8 relative to hydrocortisone = 1).",
      drugIds: ["prednisone"],
    },
    {
      id: "clin-hpa-suppression-threshold",
      lane: "clinical",
      kicker: "Endocrine Safety",
      title: "HPA Axis Suppression Risk & Tapering",
      prompt: "Under Endocrine Society and CDC guidelines, which patient meets high-risk criteria where hypothalamic-pituitary-adrenal (HPA) axis suppression is expected and gradual tapering is mandatory?",
      ask: "Which clinical scenario confers high risk for secondary adrenal crisis if steroids are held abruptly?",
      choices: [
        { id: "pred-over-20-3wks", label: "Receiving >20 mg/day prednisone equivalent for >3 weeks (or exhibiting Cushingoid appearance)" },
        { id: "bronchitis-burst", label: "Completing a 5-day burst of prednisone 40 mg for acute bronchitis" },
        { id: "physiologic-morning", label: "Taking physiologic morning replacement of prednisone 3 mg/day for 6 months" },
        { id: "alt-day-2wks", label: "Receiving an alternate-day morning regimen for 2 weeks" },
      ],
      correct: "pred-over-20-3wks",
      answer: "Prolonged supraphysiologic doses (>20 mg/day prednisone equivalent for >3 weeks) or evening/divided dosing suppress hypothalamic CRH and pituitary ACTH, inducing bilateral adrenocortical atrophy. Abrupt cessation risks life-threatening acute adrenal crisis (hypotension, shock, hypoglycemia). Short courses (<3 weeks) do not cause clinically significant atrophy and generally do not require tapering for HPA recovery reasons alone.",
      drugIds: ["prednisone"],
    },
    {
      id: "clin-anion-gap-albumin-correction",
      lane: "clinical",
      kicker: "Acid-Base Physiology",
      title: "Albumin-Corrected Anion Gap",
      prompt: "A critically ill patient has Na 140 mEq/L, Cl 106 mEq/L, HCO3 24 mEq/L, and serum albumin 1.5 g/dL. The reported uncorrected anion gap is 10 mEq/L (which appears normal).",
      ask: "What is the albumin-corrected anion gap, and what is the clinical significance under the Figge-Jabor-Kazda equation?",
      choices: [
        { id: "ag-corr-16", label: "Corrected AG is ~16.3 mEq/L; severe hypoalbuminemia masked an underlying high anion gap metabolic acidosis (HAGMA)" },
        { id: "ag-corr-6", label: "Corrected AG is 6 mEq/L; hypoalbuminemia artificially inflates the reported gap" },
        { id: "ag-corr-10", label: "Corrected AG remains 10 mEq/L; albumin has no charge and does not affect the gap" },
        { id: "ag-negative", label: "Corrected AG is negative; albumin is an unmeasured cation" },
      ],
      correct: "ag-corr-16",
      answer: "Serum albumin is the predominant unmeasured polyanion in serum: each 1 g/dL drop in albumin lowers the baseline normal anion gap by ~2.5 mEq/L. Using Figge-Jabor-Kazda: Corrected AG = 10 + 2.5·(4.0 - 1.5) = 16.3 mEq/L. An apparently normal uncorrected gap of 10 mEq/L in a hypoalbuminemic patient frequently obscures significant lactic acidosis, ketoacidosis, or toxic accumulation.",
      drugIds: ["metformin"],
    },
    {
      id: "clin-dka-pseudohyponatremia-fluids",
      lane: "clinical",
      kicker: "Critical Care Resuscitation",
      title: "Hyperglycemia-Corrected Sodium & Fluid Choice",
      prompt: "A patient in Diabetic Ketoacidosis (DKA) has measured serum Na 128 mEq/L and Glucose 700 mg/dL. Following initial 0.9% NaCl fluid resuscitation, the team calculates the corrected sodium using the 1999 Hillier factor (2.4 mEq/L per 100 mg/dL excess glucose).",
      ask: "What is the corrected sodium, and which IV maintenance fluid is indicated according to consensus guidelines?",
      choices: [
        { id: "na-corr-142-half-ns", label: "Corrected Na is 142.4 mEq/L (eunatremic); switch to 0.45% NaCl to replace free water deficit" },
        { id: "na-corr-128-hypertonic", label: "Corrected Na is 128 mEq/L (persistent hyponatremia); administer 3% hypertonic saline" },
        { id: "na-corr-110-stop", label: "Corrected Na is 110 mEq/L; stop all IV fluid infusions immediately" },
        { id: "na-corr-165-water", label: "Corrected Na is 165 mEq/L; give sterile water IV push" },
      ],
      correct: "na-corr-142-half-ns",
      answer: "Hyperglycemia pulls water from intracellular space into the vascular compartment, diluting serum sodium (translocational pseudohyponatremia). Excess glucose = 600 mg/dL. Hillier corrected Na = 128 + 2.4·6 = 142.4 mEq/L. Because the corrected sodium is normal/high (≥135 mEq/L), DKA consensus protocols direct maintenance IV fluids to 0.45% NaCl (half-normal saline) to treat cellular dehydration and avoid worsening hypertonicity.",
      drugIds: ["insulin-glargine"],
    },
    {
      id: "clin-apap-rumack-treatment-line",
      lane: "clinical",
      kicker: "Medical Toxicology",
      title: "Rumack-Matthew Nomogram & 4-Hour Level",
      prompt: "A patient presents 5 hours after an acute single ingestion of 20 grams of acetaminophen. The serum APAP concentration at 5 hours post-ingestion is 180 µg/mL. Baseline AST and ALT are currently normal at 28 U/L and 32 U/L.",
      ask: "How is hepatotoxicity risk evaluated under the Rumack-Matthew nomogram, and what is the antidote mechanism?",
      choices: [
        { id: "nomo-150-nac", label: "Level exceeds the 150 µg/mL treatment line; IV N-acetylcysteine (NAC) must be initiated to replenish glutathione before NAPQI depletes GSH stores" },
        { id: "nomo-wait-transam", label: "Wait 24 hours until transaminases elevate above 1,000 U/L before giving NAC" },
        { id: "nomo-safe-below-300", label: "The patient is completely safe because the level is below 300 µg/mL; no antidote is indicated" },
        { id: "nomo-dialysis-only", label: "Emergency hemodialysis is first-line; NAC has no effect after 4 hours" },
      ],
      correct: "nomo-150-nac",
      answer: "The Rumack-Matthew nomogram plots acute single ingestions between 4 and 24 hours. The conventional US treatment line begins at 150 µg/mL at 4 hours (t1/2 = 4 h, down to ~75 µg/mL at 8 h). At 5 hours, 180 µg/mL is well above the treatment line (risk threshold ~126 µg/mL). Hepatotoxicity is driven by CYP2E1 oxidation to reactive NAPQI. Once endogenous hepatic glutathione (GSH) is depleted >70%, NAPQI covalently binds hepatocytes. NAC provides cysteine to regenerate GSH and directly detoxifies NAPQI. Prompt treatment within 8 hours prevents severe hepatic necrosis.",
      drugIds: ["acetaminophen", "nac"],
    },
    {
      id: "clin-calvert-gfr-cap",
      lane: "clinical",
      kicker: "Oncology Pharmacokinetics",
      title: "Calvert Carboplatin GFR Cap (FDA Safety Alert)",
      prompt: "A 42-year-old patient with ovarian cancer has low serum creatinine (0.5 mg/dL), yielding an estimated Cockcroft-Gault CrCl of 165 mL/min. The oncologist orders carboplatin targeting AUC 6 mg·min/mL.",
      ask: "Why does the 2010 FDA Drug Safety Communication mandate capping GFR at 125 mL/min in the Calvert formula: Dose = Target AUC × (GFR + 25)?",
      choices: [
        { id: "calvert-cap-125", label: "Uncapped GFR in patients with low SCr / hyperfiltration causes severe drug overdosing, leading to lethal neutropenic sepsis and thrombocytopenia" },
        { id: "calvert-no-cap-tumor", label: "The GFR should never be capped because higher doses guarantee better tumor cure without any toxicity" },
        { id: "calvert-cap-60", label: "GFR must be capped at 60 mL/min for all oncology patients regardless of actual clearance" },
        { id: "calvert-cap-egfr-only", label: "The cap only applies when using eGFR from cystatin C, not serum creatinine" },
      ],
      correct: "calvert-cap-125",
      answer: "The Calvert equation (Dose = AUC × [GFR + 25]) was validated assuming normal physiologic clearance. In young or cachectic patients with low serum creatinine, estimated CrCl can artificially exceed 150–200 mL/min. Dosing carboplatin with uncapped GFR values causes massive systemic drug exposure, precipitating grade 4 myelosuppression, fatal thrombocytopenia, and neutropenic sepsis. The FDA capped GFR at 125 mL/min, establishing maximum doses of 900 mg for AUC 6, 750 mg for AUC 5, and 600 mg for AUC 4.",
      drugIds: ["carboplatin"],
    },
    {
      id: "clin-ganzoni-iron-depot",
      lane: "clinical",
      kicker: "Hematology / Pharmacokinetics",
      title: "Ganzoni Formula & Iron Depot Sizing",
      prompt: "A 70 kg woman with severe iron deficiency anemia secondary to menometrorrhagia presents with Hb 8.0 g/dL. The team calculates her total parenteral iron deficit targeting Hb 15.0 g/dL using the Ganzoni equation: Deficit (mg) = Weight (kg) × (Target Hb - Actual Hb) × 2.4 + Depot (mg).",
      ask: "What is the calculated deficit, and why is the 500 mg depot added?",
      choices: [
        { id: "ganzoni-1676", label: "Deficit is ~1,676 mg; the 500 mg depot restores depleted reticuloendothelial storage iron (ferritin/hemosiderin)" },
        { id: "ganzoni-no-depot", label: "Deficit is 1,176 mg; depot stores should never be repleted due to toxicity" },
        { id: "ganzoni-flat-100", label: "Deficit is 100 mg; the Ganzoni formula only calculates plasma free iron" },
        { id: "ganzoni-5000", label: "Deficit is 5,000 mg; the constant factor is 24 instead of 2.4" },
      ],
      correct: "ganzoni-1676",
      answer: "Ganzoni equation: 70 kg × (15.0 - 8.0) × 2.4 = 1,176 mg for circulating hemoglobin deficit. To achieve sustained hematologic recovery without immediate relapse, a standard 500 mg depot is added to replenish bone marrow and macrophage storage iron, yielding ~1,676 mg total deficit. For obese patients, using actual body weight substantially overpredicts deficit because adipose tissue has minimal vascularity, so adjusted body weight is preferred.",
      drugIds: ["iron-sucrose", "ferric-carboxymaltose"],
    },
    {
      id: "clin-iron-fgf23-hypophosphatemia",
      lane: "clinical",
      kicker: "Endocrinology / Safety",
      title: "Ferric Carboxymaltose & FGF23 Hypophosphatemia",
      prompt: "A 52-year-old patient with iron deficiency anemia receives two doses of 750 mg IV ferric carboxymaltose (Injectafer). Three weeks later, the patient develops profound fatigue, diffuse proximal muscle weakness, and severe bone pain. Lab testing reveals serum phosphate 1.1 mg/dL (normal 2.5–4.5 mg/dL).",
      ask: "What hormonal mechanism drives severe hypophosphatemia after ferric carboxymaltose, and how does it compare to other IV irons?",
      choices: [
        { id: "fcm-fgf23-wasting", label: "Carbohydrate shell inhibits intact FGF23 degradation, inducing massive renal phosphate wasting and blunting 1,25-dihydroxyvitamin D synthesis" },
        { id: "fcm-parathyroid", label: "Direct toxic destruction of the parathyroid glands causes hungry bone syndrome" },
        { id: "fcm-gut-binding", label: "IV iron binds dietary phosphate in the gut lumen, preventing oral absorption" },
        { id: "fcm-all-same", label: "All IV iron formulations cause identical severe osteomalacia at equal rates" },
      ],
      correct: "fcm-fgf23-wasting",
      answer: "Certain carbohydrate matrices (particularly ferric carboxymaltose, and historically iron polymaltose) inhibit the cleavage of intact Fibroblast Growth Factor 23 (FGF23) in osteocytes. Circulating active FGF23 surges, downregulating sodium-phosphate cotransporters (NaPi-IIa/c) in the renal proximal tubule (causing hyperphosphaturia) and suppressing 1α-hydroxylase (lowering calcitriol). This results in prolonged, symptomatic hypophosphatemia. In contrast, ferric derisomaltose (Monoferric) and iron sucrose (Venofer) exhibit significantly lower rates of intact FGF23 elevation.",
      drugIds: ["ferric-carboxymaltose", "iron-sucrose"],
    },
    {
      id: "clin-digoxin-hf-targets",
      lane: "clinical",
      kicker: "Cardiology / TDM",
      title: "Digoxin Therapeutic Window & Mortality Risk",
      prompt: "A 68-year-old patient with Heart Failure with reduced Ejection Fraction (HFrEF NYHA III) has been taking digoxin 0.25 mg daily. At routine follow-up, serum digoxin concentration (SDC) is 1.4 ng/mL. The patient feels slightly fatigued but denies visual halos or nausea.",
      ask: "Under the landmark DIG trial findings, what is the optimal serum digoxin target in heart failure, and what is the risk of levels ≥1.2 ng/mL?",
      choices: [
        { id: "hf-target-05-09", label: "Target is 0.5–0.9 ng/mL; levels ≥1.2 ng/mL significantly increase all-cause mortality without improving clinical outcomes" },
        { id: "hf-target-20-30", label: "Target is 2.0–3.0 ng/mL to maximize left ventricular ejection fraction" },
        { id: "hf-target-any", label: "Any detectable level is completely safe as long as serum potassium is normal" },
        { id: "hf-target-zero", label: "Digoxin cannot be measured in serum; clinical pulse rate is the only indicator" },
      ],
      correct: "hf-target-05-09",
      answer: "Post-hoc analyses of the DIG trial conclusively demonstrated that serum digoxin concentrations of 0.5–0.9 ng/mL provide optimal neurohormonal suppression and reduced heart failure hospitalizations without increasing mortality. Conversely, levels ≥1.2 ng/mL (even within the historical laboratory 'normal' range of 0.8–2.0 ng/mL) were associated with a significant increase in all-cause mortality, primarily due to arrhythmogenic sudden death.",
      drugIds: ["digoxin"],
    },
    {
      id: "clin-digifab-post-lab-trap",
      lane: "clinical",
      kicker: "Clinical Toxicology",
      title: "Digoxin Immune Fab (DigiFab) Lab Immunoassay Trap",
      prompt: "A patient with severe acute digoxin poisoning (SDC 5.8 ng/mL, complete heart block) receives 10 vials of Digoxin Immune Fab (DigiFab). The arrhythmia resolves rapidly. Six hours later, the ICU resident checks a repeat serum digoxin level, which returns markedly elevated at 22 ng/mL. The resident wonders if more Fab is needed.",
      ask: "What causes total serum digoxin to skyrocket after DigiFab administration, and how should clinical efficacy be monitored?",
      choices: [
        { id: "fab-cross-react-trap", label: "Fab mobilizes tissue-bound digoxin into plasma and standard immunoassays measure total (bound + free) drug; the assay is uninterpretable for 5–7 days" },
        { id: "fab-failure", label: "The Fab failed completely and accelerated endogenous digoxin synthesis in the kidneys" },
        { id: "fab-redose-urgently", label: "Administer 40 more vials immediately to clear the 22 ng/mL level" },
        { id: "fab-dialysis", label: "Emergency hemodialysis is required to remove Fab-digoxin complexes" },
      ],
      correct: "fab-cross-react-trap",
      answer: "DigiFab binds free vascular digoxin with affinity 1000x greater than Na+/K+-ATPase. This shifts equilibrium, pulling tissue-bound digoxin into the vascular compartment as Fab-digoxin complexes. Standard clinical laboratory immunoassays measure total (free plus bound) digoxin, causing reported levels to spike 10- to 20-fold. However, free (pharmacologically active) digoxin is virtually zero. Total digoxin levels remain uninterpretable for 5–7 days (or weeks in renal failure). Monitoring must rely strictly on clinical ECG, hemodynamics, and serum potassium (watching closely for rebound hypokalemia).",
      drugIds: ["digoxin"],
    },
    {
      id: "clin-vanco-sawchuk-zaske-timing",
      lane: "clinical",
      kicker: "Therapeutic Drug Monitoring",
      title: "Vancomycin Sawchuk-Zaske Sampling Timing Window",
      prompt: "A clinical pharmacist reviews orders for peak and trough vancomycin levels to calculate patient-specific AUC24 using Sawchuk-Zaske pharmacokinetic equations.",
      ask: "Why must the post-infusion peak level (C1) be drawn at least 1 to 2 hours after the IV infusion finishes rather than immediately at the end of infusion?",
      choices: [
        { id: "sz-alpha-dist", label: "Vancomycin requires 1–2 hours to complete its distribution (alpha-phase); drawing prematurely reflects vascular concentrations, falsely inflating ke and underestimating Vd" },
        { id: "sz-metabolism", label: "Vancomycin is rapidly metabolized in the liver during the first hour and cannot be measured" },
        { id: "sz-platelet", label: "Drawing before 2 hours causes artifactual platelet lysis inside the collection tube" },
        { id: "sz-trough-same", label: "Peak and trough levels are mathematically identical in a one-compartment model" },
      ],
      correct: "sz-alpha-dist",
      answer: "Vancomycin pharmacokinetics fit a multi-compartment model with an initial rapid distribution (alpha) phase lasting 1–2 hours post-infusion. Blood drawn before distribution equilibrium reflects vascular drug that has not yet equilibrated with tissue compartments. Calculating kinetics from an early peak yields an artifactually steep slope (ke), a falsely short elimination half-life, and underpredicts volume of distribution (Vd). Drawing at least 1–2 hours post-infusion ensures sampling occurs during true elimination (beta) phase.",
      drugIds: ["vancomycin"],
    },
    {
      id: "clin-vanco-auc-vs-trough-nephro",
      lane: "clinical",
      kicker: "Infectious Diseases / Nephrology",
      title: "Vancomycin AUC Consensus Target vs Trough Toxicity",
      prompt: "A healthcare system transitions its vancomycin dosing protocol from historical trough targets (15–20 µg/mL) to consensus AUC24:MIC targeting (400–600 mg·h/L) under 2020 ASHP/IDSA guidelines.",
      ask: "Why did consensus guidelines deprecate historical 15–20 µg/mL trough targets, and what steady-state trough range typically achieves target AUC?",
      choices: [
        { id: "auc-lower-aki", label: "Troughs of 15–20 µg/mL cause a 3- to 4-fold increase in acute kidney injury (AKI) without improving bacterial cure; AUC 400–600 is frequently achieved with troughs of 10–15 µg/mL" },
        { id: "trough-ineffective", label: "Trough concentrations have zero relationship with AUC or clinical efficacy in MRSA infections" },
        { id: "auc-higher-doses", label: "AUC-guided dosing requires routine doubling of daily milligrams to achieve bactericidal activity" },
        { id: "trough-ototoxicity-only", label: "Troughs only predict irreversible ototoxicity and have no connection to renal tubular necrosis" },
      ],
      correct: "auc-lower-aki",
      answer: "The 2020 consensus guidelines retired empirical trough targets of 15–20 µg/mL because clinical data demonstrated that maintaining troughs in that range frequently generates supratherapeutic AUC exposures (>650–700 mg·h/L), producing a 3- to 4-fold increase in acute kidney injury without augmenting clinical cure rates. AUC24:MIC targeting of 400–600 mg·h/L preserves maximal bactericidal activity while reducing nephrotoxicity, typically corresponding to steady-state troughs of 10–15 µg/mL.",
      drugIds: ["vancomycin"],
    },
    {
      id: "clin-pheno-infusion-rate-limit",
      lane: "clinical",
      kicker: "Neurocritical Care / Pharmacology",
      title: "Phenobarbital Infusion Velocity & Propylene Glycol Toxicity",
      prompt: "A patient with refractory status epilepticus requires an IV phenobarbital loading dose of 1,200 mg. The nursing team reviews the infusion pump rate settings.",
      ask: "What is the maximum recommended IV infusion velocity for phenobarbital in adults, and what dangerous complication does rapid administration precipitate?",
      choices: [
        { id: "rate-60-propylene", label: "Maximum rate is 60 mg/min (infusion over ≥20 min); rapid administration causes acute hypotension, bradycardia, and cardiovascular collapse due to the propylene glycol co-solvent" },
        { id: "rate-500-safe", label: "Infusion at 500 mg/min is safe because barbiturates have zero myocardial effects" },
        { id: "rate-unlimited", label: "There is no rate limit; IV push over 30 seconds is standard in status epilepticus" },
        { id: "rate-hypoglycemia", label: "Rapid infusion triggers acute hypoglycemia by stimulating pancreatic insulin release" },
      ],
      correct: "rate-60-propylene",
      answer: "Parenteral phenobarbital contains propylene glycol and ethanol as co-solvents to maintain solubility. The FDA Prescribing Information and neurocritical care guidelines mandate a maximum IV infusion velocity of 60 mg/min (or 1 mg/kg/min). Exceeding this rate provokes acute myocardial depression, peripheral vasodilation, refractory hypotension, bradycardia, and cardiac arrest, largely mediated by propylene glycol toxicity. Continuous cardiac and respiratory telemetry is required.",
      drugIds: ["phenobarbital"],
    },
    {
      id: "clin-pheno-urine-alkalinization-trap",
      lane: "clinical",
      kicker: "Medical Toxicology / Renal Physiology",
      title: "Phenobarbital Urinary Alkalinization & Paradoxical Aciduria",
      prompt: "A patient presents in deep barbiturate coma after acute phenobarbital overdose (serum level 85 µg/mL). The team initiates urinary alkalinization with an IV sodium bicarbonate infusion to enhance ion trapping. Despite bicarbonate administration, serial urinalysis reveals persistent acid urine (pH 6.1).",
      ask: "What physiologic mechanism causes persistent acid urine during bicarbonate therapy, and how must it be managed?",
      choices: [
        { id: "trap-hypok-aciduria", label: "Systemic alkalemia shifts K+ intracellularly; acute hypokalemia forces distal tubular H+/K+ antiporters to excrete H+ to conserve K+, creating paradoxical aciduria corrected by KCl repletion" },
        { id: "trap-pheno-strong-acid", label: "Phenobarbital is a strong acid (pKa 1.2) that completely neutralizes renal bicarbonate buffer capacity" },
        { id: "trap-calcium-oxalate", label: "Calcium oxalate crystals physically obstruct the collecting ducts and prevent bicarbonate filtration" },
        { id: "trap-acidemia-normal", label: "Urine pH cannot physiologically rise above 6.5 under any clinical circumstances in humans" },
      ],
      correct: "trap-hypok-aciduria",
      answer: "Phenobarbital is a weak organic acid with pKa 7.24. In acid urine (pH 6.0), >90% is non-ionized, lipophilic, and reabsorbed. Raising urine pH to 7.8 increases the ionized conjugate base fraction to >78%, trapping impermeable ions in the renal tubule and increasing clearance 5- to 10-fold. However, systemic alkalinization shifts potassium intracellularly, inducing hypokalemia. In hypokalemia, distal tubular H+/K+ antiporters secrete H+ into the lumen to preserve potassium, causing paradoxical aciduria (urine pH <7.0) that halts ion trapping. Potassium chloride must be aggressively co-infused to maintain serum K+ 4.0–4.5 mEq/L.",
      drugIds: ["phenobarbital", "sodium-bicarbonate"],
    },
    {
      id: "clin-hartford-draw-timing",
      lane: "clinical",
      kicker: "Therapeutic Drug Monitoring",
      title: "Hartford Aminoglycoside Sampling Window",
      prompt: "A clinical pharmacist monitors extended-interval aminoglycoside therapy (7 mg/kg gentamicin or tobramycin) using the Nicolau et al. Hartford Nomogram.",
      ask: "What is the validated post-infusion start window for drawing a random serum concentration to determine the dosing interval?",
      choices: [
        { id: "window-6-to-14", label: "Between 6 and 14 hours after the start of the infusion" },
        { id: "window-0-to-2", label: "Within 30 minutes of infusion completion (peak only)" },
        { id: "window-24-trough", label: "At 23.5 hours post-dose (trough only)" },
        { id: "window-48", label: "Between 36 and 48 hours post-dose" },
      ],
      correct: "window-6-to-14",
      answer: "The Hartford Nomogram (Nicolau et al. 1995) was established and validated using a single random serum concentration drawn between 6 and 14 hours after the start of the 60-minute IV infusion. Concentrations drawn <6 hours capture initial tissue distribution and cannot be accurately plotted; levels >14 hours often fall below assay detection limits.",
      drugIds: ["gentamicin", "tobramycin"],
    },
    {
      id: "clin-ag-obesity-adjbw",
      lane: "clinical",
      kicker: "Pharmacokinetics / Obesity",
      title: "Aminoglycoside Sizing in Obesity & AdjBW",
      prompt: "A patient with severe Pseudomonas pneumonia weighs 130 kg (actual body weight), with an Ideal Body Weight (IBW) of 70 kg (actual weight > 185% of IBW).",
      ask: "Why is Adjusted Body Weight (AdjBW = IBW + 0.4 × [ABW - IBW]) used for aminoglycoside dosing instead of actual body weight?",
      choices: [
        { id: "adjbw-extracellular-water", label: "Aminoglycosides are hydrophilic polycations that distribute into extracellular water with only ~40% penetration into adipose tissue; dosing on total weight severely overdoses the patient" },
        { id: "adjbw-lipophilic-storage", label: "Aminoglycosides accumulate extensively in white adipose tissue, requiring dose reduction to prevent fat necrosis" },
        { id: "adjbw-hepatic-clearance", label: "Obesity induces hepatic CYP3A4 metabolism of aminoglycosides, requiring weight adjustment" },
        { id: "adjbw-albumin-binding", label: "Aminoglycosides are 99% bound to serum albumin, which is elevated in obesity" },
      ],
      correct: "adjbw-extracellular-water",
      answer: "Aminoglycosides are highly polar, water-soluble molecules with a volume of distribution roughly equivalent to extracellular fluid volume (Vd ~ 0.25–0.3 L/kg). Adipose tissue contains only ~30–40% extracellular water compared to lean tissue. Dosing based on actual body weight leads to massive overdosing, supratherapeutic peaks, and acute tubular necrosis. The 0.4 correction factor accounts for limited adipose extracellular water distribution.",
      drugIds: ["gentamicin", "tobramycin", "amikacin"],
    },
    {
      id: "clin-ag-endocarditis-synergy",
      lane: "clinical",
      kicker: "Infectious Diseases / Cardiology",
      title: "Enterococcal Endocarditis Synergy vs Extended Interval",
      prompt: "A patient with Enterococcus faecalis prosthetic valve endocarditis is receiving ampicillin. The team discusses adding gentamicin for bactericidal synergy.",
      ask: "Why is extended-interval high-dose therapy (Hartford nomogram) contraindicated for enterococcal endocarditis synergy, and what is the target pharmacokinetic profile?",
      choices: [
        { id: "synergy-conventional-low-dose", label: "Synergy relies on low-dose conventional dosing (1 mg/kg q8h; peak 3–4 µg/mL, trough <1 µg/mL); high intermittent peaks do not enhance cell-wall synergy and extended drug-free intervals allow enterococcal regrowth" },
        { id: "synergy-once-weekly", label: "Endocarditis requires single weekly doses of 20 mg/kg to sterilize vegetative biofilms" },
        { id: "synergy-no-trough-needed", label: "Continuous trough levels >5 µg/mL are required for 6 consecutive weeks" },
        { id: "synergy-oral-only", label: "Gentamicin must be administered orally to prevent endocarditis relapse" },
      ],
      correct: "synergy-conventional-low-dose",
      answer: "AHA and IDSA endocarditis guidelines explicitly exclude enterococcal endocarditis from extended-interval (once-daily) aminoglycoside nomograms. Synergy requires cell-wall active agents (ampicillin/penicillin) to permeabilize the cell wall so modest intracellular gentamicin concentrations can access ribosomes. Conventional low-dose regimens (1 mg/kg q8h) achieve peak concentrations of 3–4 µg/mL and trough <1 µg/mL, maintaining continuous synergy while avoiding prolonged zero-concentration windows.",
      drugIds: ["gentamicin", "ampicillin"],
    },
    {
      id: "clin-ag-mt1555-ototoxicity",
      lane: "clinical",
      kicker: "Pharmacogenomics / Ototoxicity",
      title: "Mitochondrial m.1555A>G Aminoglycoside Ototoxicity",
      prompt: "A patient with no personal history of hearing loss receives a standard 3-day course of tobramycin. Two weeks later, the patient develops profound, irreversible bilateral sensorineural deafness. A maternal aunt also suffered deafness following childhood antibiotic therapy.",
      ask: "What genetic mutation confers extreme hypersusceptibility to aminoglycoside-induced ototoxicity?",
      choices: [
        { id: "mt1555-ribosomal-homology", label: "Mitochondrial 12S rRNA m.1555A>G mutation, which alters mitochondrial ribosomes to resemble bacterial 16S/30S ribosomal RNA, causing mistranslation and cochlear hair cell apoptosis" },
        { id: "cyp2d6-ultra-fast", label: "CYP2D6 ultrarapid metabolizer phenotype, which converts tobramycin into an acoustic neurotoxin" },
        { id: "hla-b5701-delayed", label: "HLA-B*57:01 hypersensitivity reaction in the endolymphatic sac" },
        { id: "g6pd-acoustic", label: "G6PD deficiency, causing acoustic nerve oxidative hemolysis" },
      ],
      correct: "mt1555-ribosomal-homology",
      answer: "The mitochondrial 12S rRNA m.1555A>G (and m.1494C>T) mutation alters the tertiary structure of the human mitochondrial ribosome, making it structurally homologous to the bacterial 16S/30S ribosomal A-site. Aminoglycosides bind the mutated human mitochondrial ribosome with high affinity, halting mitochondrial protein translation, generating reactive oxygen species, and triggering permanent apoptotic destruction of sensory outer hair cells in the organ of Corti. Inheritance is strictly maternal.",
      drugIds: ["tobramycin", "gentamicin", "amikacin"],
    },
    {
      id: "clin-lithium-extrip-criteria",
      lane: "clinical",
      kicker: "Nephrology / Medical Toxicology",
      title: "EXTRIP Consensus Lithium Hemodialysis Indications",
      prompt: "A patient with severe lithium toxicity is evaluated by the critical care and nephrology service.",
      ask: "Under the international EXTRIP (Extracorporeal Treatments in Poisoning) consensus guidelines, when is intermittent hemodialysis definitively RECOMMENDED (Grade 1)?",
      choices: [
        { id: "extrip-strong-criteria", label: "Serum lithium >4.0 mEq/L with impaired renal function (CrCl <45 mL/min), >5.0 mEq/L regardless of renal function, or presence of severe neurologic manifestations (coma, seizures)" },
        { id: "extrip-only-10", label: "Only when serum lithium exceeds 10.0 mEq/L" },
        { id: "extrip-all-mild", label: "At any level >1.5 mEq/L regardless of symptoms or renal clearance" },
        { id: "extrip-pd-only", label: "Peritoneal dialysis is preferred over hemodialysis for all lithium overdoses" },
      ],
      correct: "extrip-strong-criteria",
      answer: "Decker et al. (EXTRIP Workgroup 2015 consensus) recommend intermittent hemodialysis (IHD) as primary extracorporeal therapy when: (1) serum lithium > 4.0 mEq/L with kidney impairment (CrCl < 45 mL/min), (2) serum lithium > 5.0 mEq/L regardless of renal status, or (3) severe neurologic signs (coma, seizures, status epilepticus, life-threatening dysrhythmias) regardless of concentration. IHD provides superior clearance (~150–200 mL/min) compared to CRRT.",
      drugIds: ["lithium"],
    },
    {
      id: "clin-lithium-intracellular-rebound",
      lane: "clinical",
      kicker: "Pharmacokinetics / Critical Care",
      title: "Lithium Post-Hemodialysis Intracellular Rebound Trap",
      prompt: "A patient with acute-on-chronic lithium toxicity undergoes a 4-hour hemodialysis run, reducing serum lithium from 4.8 mEq/L down to 1.1 mEq/L.",
      ask: "What pharmacokinetic phenomenon occurs within 6 to 12 hours post-dialysis, and what monitoring protocol is mandated?",
      choices: [
        { id: "rebound-efflux-protocol", label: "Rate-limited intracellular-to-extracellular efflux causes a 0.5–1.5 mEq/L rebound spike; a repeat serum level is mandatory at 6–8 hours post-dialysis" },
        { id: "rebound-zero-risk", label: "Lithium is permanently cleared from all compartments with zero risk of secondary level elevation" },
        { id: "rebound-hepatic-dump", label: "Biliary excretion causes an enterohepatic recirculation spike at 24 hours" },
        { id: "rebound-albumin-release", label: "Serum albumin undergoes conformational change, releasing bound lithium back into the plasma" },
      ],
      correct: "rebound-efflux-protocol",
      answer: "Lithium distributes across total body water (Vd ~0.7–0.9 L/kg) and enters intracellular compartments slowly. During intermittent hemodialysis, vascular lithium is cleared rapidly; however, intracellular efflux is rate-limited. Following dialysis cessation, intracellular lithium diffuses back into the intravascular compartment, generating a 0.5–1.5 mEq/L rebound spike within 6–12 hours. The EXTRIP consensus mandates a repeat serum concentration check at 6 to 8 hours post-dialysis to determine whether repeat IHD or continuous CVVHDF bridge therapy is required.",
      drugIds: ["lithium"],
    },
    {
      id: "clin-lithium-proximal-reabsorption-nhe3",
      lane: "clinical",
      kicker: "Renal Physiology / Drug Interactions",
      title: "Proximal Tubule NHE3 Lithium Reabsorption & Thiazide Collision",
      prompt: "A patient stable on lithium carbonate 900 mg daily for bipolar disorder is prescribed hydrochlorothiazide 25 mg daily for mild hypertension. Three weeks later, the patient presents with ataxia, coarse tremors, dysarthria, and a serum lithium level of 2.3 mEq/L.",
      ask: "What renal physiologic mechanism explains why thiazide diuretics dramatically diminish lithium clearance?",
      choices: [
        { id: "nhe3-compensatory-reabsorption", label: "Thiazide distal NCCT blockade causes natriuresis and mild volume depletion, triggering compensatory proximal tubule NHE3 hyper-reabsorption of both Na+ and Li+, cutting lithium clearance by 30–50%" },
        { id: "cyp-inhibition-lithium", label: "Thiazides are potent inhibitors of hepatic cytochrome P450 enzymes that clear lithium" },
        { id: "tubular-secretion-block", label: "Thiazides competitively block organic cation transporters (OCT2) in the proximal tubule" },
        { id: "protein-displacement-li", label: "Thiazides displace lithium from plasma albumin binding sites, doubling the free fraction" },
      ],
      correct: "nhe3-compensatory-reabsorption",
      answer: "The kidneys handle lithium identically to sodium: ~80% is reabsorbed in the proximal tubule via the apical NHE3 (Na+/H+ exchanger) antiporter, and none is reabsorbed distally. Thiazides block the distal convoluted tubule Na-Cl cotransporter (NCCT). The resulting distal natriuresis causes mild volume contraction, which activates compensatory proximal tubular sodium reabsorption. The proximal tubule cannot distinguish lithium from sodium, hyper-reabsorbing both and slashing lithium clearance by 30–50%, precipitating severe toxicity.",
      drugIds: ["lithium", "hctz"],
    },
    {
      id: "clin-lithium-target-bands",
      lane: "clinical",
      kicker: "Therapeutic Drug Monitoring / Psychiatry",
      title: "Lithium 12-Hour Trough Targets & SILENT Syndrome",
      prompt: "A psychiatric clinical pharmacist reviews therapeutic drug monitoring protocols for lithium carbonate.",
      ask: "What are the consensus 12-hour steady-state trough ranges for acute mania vs maintenance therapy, and what irreversible syndrome can severe toxicity provoke?",
      choices: [
        { id: "bands-silent-syndrome", label: "Acute mania 0.8–1.2 mEq/L; Maintenance 0.6–0.8 mEq/L (0.4–0.6 in geriatric); Severe toxicity (>2.5 mEq/L) can cause SILENT (Syndrome of Irreversible Lithium-Effectuated Neurotoxicity)" },
        { id: "bands-liver-failure", label: "Acute mania 2.0–3.0 mEq/L; Maintenance 1.5–2.0 mEq/L; Severe toxicity causes acute fulminant hepatic failure" },
        { id: "bands-aplastic-anemia", label: "Acute mania 0.2–0.4 mEq/L; Maintenance 0.1–0.2 mEq/L; Severe toxicity causes irreversible aplastic anemia" },
        { id: "bands-respiratory-arrest", label: "Acute mania 1.5–2.5 mEq/L; Maintenance 1.2–1.5 mEq/L; Severe toxicity causes central sleep apnea" },
      ],
      correct: "bands-silent-syndrome",
      answer: "Validated 12-hour serum trough bands are: Acute Mania: 0.8–1.2 mEq/L (for rapid mood stabilization); Maintenance: 0.6–0.8 mEq/L (to prevent relapse while preserving renal tubular health); Geriatric/Vulnerable: 0.4–0.6 mEq/L. Critical toxicity (>2.5 mEq/L) can precipitate SILENT syndrome (Syndrome of Irreversible Lithium-Effectuated Neurotoxicity), marked by persistent cerebellar ataxia, dysarthria, cognitive deficits, and peripheral neuropathy persisting months to years after serum lithium has cleared.",
      drugIds: ["lithium"],
    },
    {
      id: "clin-tisdale-score-cutoffs",
      lane: "clinical",
      kicker: "Cardiology / Telemetry",
      title: "Tisdale Inpatient QTc Risk Score Tiers",
      prompt: "A hospitalized patient is scored using the validated Tisdale QTc risk prediction model (Circulation 2013; 0–21 points).",
      ask: "What are the score thresholds for Low, Moderate, and High risk of critical QTc prolongation (≥500 ms)?",
      choices: [
        { id: "score-tisdale", label: "Low risk ≤6 points (<15% risk); Moderate 7–10 points (~37% risk); High risk ≥11 points (~73% risk)" },
        { id: "score-equal-thirds", label: "Low 0–7; Moderate 8–14; High 15–21" },
        { id: "score-dichotomous", label: "Low <10; High ≥10 only" },
        { id: "score-percentile", label: "Low <2; Moderate 3–5; High ≥6" },
      ],
      correct: "score-tisdale",
      answer: "The prospective Tisdale risk model stratifies hospitalized patients into: Low risk (≤6 points, <15% probability of QTc ≥500 ms), Moderate risk (7–10 points, ~37% probability; triggers continuous telemetry and daily ECG), and High risk (≥11 points, ~73% probability; triggers mandatory continuous telemetry, strict avoidance of additional QT agents, and potassium targets 4.5–5.0 mEq/L).",
      drugIds: ["methadone", "citalopram"],
    },
    {
      id: "clin-bazett-tachycardia-inflation",
      lane: "clinical",
      kicker: "Electrophysiology / Rate Traps",
      title: "Bazett Tachycardia Inflation Trap",
      prompt: "An automated ECG read for a patient with heart rate 110 bpm reports Bazett QTc as 510 ms, while manual Fridericia calculation yields 465 ms.",
      ask: "Why does Bazett's formula diverge from Fridericia during tachycardia, and which formula governs clinical trial safety?",
      choices: [
        { id: "bazett-sqrt-overcorrect", label: "Bazett (QT/√RR) non-linearly overcorrects at heart rates >60 bpm, creating false-positive prolongation; Fridericia (QT/∛RR) is the FDA and ACC/AHA regulatory standard" },
        { id: "fridericia-underpredict", label: "Fridericia is inaccurate above 80 bpm and misses true prolongation" },
        { id: "linear-identical", label: "Both formulas yield identical mathematical values at all heart rates" },
        { id: "bazett-bradycardia-only", label: "Bazett was only validated for ventricular pacing rhythms" },
      ],
      correct: "bazett-sqrt-overcorrect",
      answer: "Bazett's 1920 square-root formula assumes QT scales with √RR. At elevated heart rates (>80–85 bpm), the square root over-adjusts, inflating calculated QTc by 20–50+ ms and causing panic and inappropriate medication holds. Fridericia's cube-root formula provides superior physiological stability and is the consensus standard endorsed by the FDA, ACC, AHA, and ESC.",
      drugIds: ["ondansetron", "azithromycin"],
    },
    {
      id: "clin-tdp-magnesium-mechanism",
      lane: "clinical",
      kicker: "Emergency Resuscitation",
      title: "IV Magnesium Mechanism in Torsades de Pointes",
      prompt: "A patient with drug-induced polymorphic ventricular tachycardia (TdP) has a normal baseline serum magnesium of 2.1 mg/dL.",
      ask: "Why is IV Magnesium Sulfate 2 g push administered even when serum magnesium is completely normal?",
      choices: [
        { id: "mg-suppresses-eads", label: "Magnesium antagonizes inward L-type calcium currents (ICa-L), extinguishing Phase 2/3 Early Afterdepolarizations (EADs) independent of serum levels" },
        { id: "mg-shortens-qt", label: "Magnesium directly shortens the baseline QT interval by 150 ms within 60 seconds" },
        { id: "mg-increases-sodium", label: "Magnesium activates cardiac sodium channels (Nav1.5) to speed Phase 0 depolarization" },
        { id: "mg-only-if-low", label: "Magnesium is contraindicated if baseline serum magnesium is within normal reference range" },
      ],
      correct: "mg-suppresses-eads",
      answer: "Pharmacological magnesium acts as a functional calcium channel blocker at the myocyte membrane, suppressing triggered Early Afterdepolarizations (EADs) without significantly shortening the baseline QT interval. Its antiarrhythmic efficacy in TdP does not depend on correcting hypomagnesemia; it is therapeutic regardless of baseline serum magnesium concentration. Administer 2 g IV push over 1–2 minutes.",
      drugIds: ["sotalol", "methadone"],
    },
    {
      id: "clin-tdp-overdrive-pacing-isoproterenol",
      lane: "clinical",
      kicker: "Cardiac Electrophysiology",
      title: "Torsades Overdrive Therapy & Isoproterenol Contraindication",
      prompt: "A team manages recurrent pause-dependent bursts of Torsades de Pointes following IV magnesium boluses.",
      ask: "What heart rate is targeted by overdrive therapy, and when is pharmacological overdrive with isoproterenol contraindicated?",
      choices: [
        { id: "overdrive-90-110-contra", label: "Target rate 90–110 bpm to shorten action potential duration and abolish pauses; Isoproterenol is strictly contraindicated in congenital LQTS (LQT1/2) and acute MI" },
        { id: "overdrive-150-contra", label: "Target rate 140–160 bpm; Isoproterenol is contraindicated in all elderly patients" },
        { id: "overdrive-bradycardia-goal", label: "Target rate 45–55 bpm to reduce myocardial oxygen demand" },
        { id: "overdrive-safe-all", label: "Isoproterenol is completely safe in all long QT subtypes and ischemic syndromes" },
      ],
      correct: "overdrive-90-110-contra",
      answer: "TdP is characteristically pause-dependent ('short-long-short' sequence). Accelerating heart rate to 90–110 bpm shortens the ventricular repolarization period and extinguishes the triggering pause. Temporary transvenous pacing is preferred. Isoproterenol is a pharmacological bridge, but is strictly contraindicated in congenital LQTS (where beta-adrenergic stimulation directly triggers polymorphic VT) and in acute coronary ischemia/MI.",
      drugIds: ["methadone", "citalopram"],
    },
    {
      id: "clin-sglt2-eudka-triad",
      lane: "clinical",
      kicker: "Endocrinology / Critical Care",
      title: "Euglycemic DKA Diagnostic Triad & Resuscitation",
      prompt: "A patient on dapagliflozin presents with severe high anion gap metabolic acidosis and elevated beta-hydroxybutyrate, but blood glucose is only 172 mg/dL.",
      ask: "Why does SGLT2 inhibitor ketoacidosis present with normal/near-normal blood glucose, and what IV fluid is mandatory alongside insulin?",
      choices: [
        { id: "eudka-glycosuria-dextrose", label: "Renal glycosuria blunts blood glucose while insulinopenia drives ketogenesis; IV Dextrose (D5W/D10W) must be infused concurrently with IV insulin" },
        { id: "eudka-insulin-alone", label: "Blood glucose is normal because no insulin is needed; IV bicarbonate alone cures the condition" },
        { id: "eudka-fluid-restrict", label: "Patients are hypervolemic from glycosuria; fluid restriction is primary therapy" },
        { id: "eudka-stop-insulin", label: "Insulin is contraindicated because blood glucose is below 200 mg/dL" },
      ],
      correct: "eudka-glycosuria-dextrose",
      answer: "SGLT2 inhibitors cause persistent proximal tubular glycosuria (50–100 g/day), preventing marked hyperglycemia even in profound ketoacidosis. Relative insulinopenia combined with glucagon surge triggers unchecked lipolysis and hepatic ketonemia. Resuscitation requires concurrent IV Dextrose (D5W/D10W) alongside IV regular insulin infusion: dextrose prevents hypoglycemia while allowing sufficient insulin administration to suppress ketogenesis.",
      drugIds: ["dapagliflozin", "empagliflozin"],
    },
    {
      id: "clin-sglt2-preop-hold-guidance",
      lane: "clinical",
      kicker: "Perioperative Medicine",
      title: "FDA SGLT2 Inhibitor Preoperative Hold Schedules",
      prompt: "An anesthesiologist reviews the preoperative medication list for a patient scheduled for major elective abdominal surgery.",
      ask: "What is the FDA-mandated preoperative hold duration for empagliflozin, dapagliflozin, canagliflozin vs ertugliflozin?",
      choices: [
        { id: "hold-3-vs-4-days", label: "Hold at least 3 full days prior to surgery for empagliflozin, dapagliflozin, and canagliflozin; hold at least 4 full days for ertugliflozin" },
        { id: "hold-morning-of", label: "Hold only the morning dose of surgery for all SGLT2 inhibitors" },
        { id: "hold-24-hours", label: "Hold 24 hours prior to surgery regardless of the agent" },
        { id: "hold-7-days", label: "Hold 7 full days prior to surgery for all oral antidiabetic agents" },
      ],
      correct: "hold-3-vs-4-days",
      answer: "The FDA revised prescribing information across the SGLT2 class to prevent perioperative euglycemic DKA: discontinue empagliflozin, dapagliflozin, canagliflozin, and sotagliflozin at least 3 days before surgery; discontinue ertugliflozin at least 4 days before surgery. Resume only when oral nutrition is established and surgical stress resolves.",
      drugIds: ["empagliflozin", "dapagliflozin"],
    },
    {
      id: "clin-hyperk-normal-ekg-trap",
      lane: "clinical",
      kicker: "Electrophysiology / Critical Care",
      title: "Hyperkalemia Normal EKG Dissociation Trap",
      prompt: "A dialysis patient presents with a confirmed serum potassium of 7.1 mEq/L. The 12-lead EKG shows normal sinus rhythm without peaked T waves, PR prolongation, or QRS widening.",
      ask: "What percentage of patients with severe hyperkalemia (K+ ≥6.5 mEq/L) lack classic EKG findings, and what is the immediate management?",
      choices: [
        { id: "ekg-50-percent-calcium", label: "46–52% of patients lack classic EKG changes prior to cardiac arrest; IV calcium must be administered immediately without waiting for EKG changes" },
        { id: "ekg-zero-percent-safe", label: "0% of patients lack EKG changes; a normal EKG proves cardiac stability and calcium should be withheld" },
        { id: "ekg-only-peaked-t", label: "Peaked T waves are 100% sensitive for severe hyperkalemia" },
        { id: "ekg-calcium-lowers-k", label: "Calcium is given because it directly binds and clears serum potassium" },
      ],
      correct: "ekg-50-percent-calcium",
      answer: "Published prospective studies (Montague 2008) show that approximately half (46–52%) of patients with K+ ≥6.5 mEq/L have completely normal or non-diagnostic EKGs immediately prior to sudden ventricular arrest. Resting membrane potential (Nernst equation) is severely depolarized. Normal EKG must NEVER delay IV calcium membrane stabilization (Calcium Gluconate 1–2 g IV or Calcium Chloride 1 g central).",
      drugIds: ["spironolactone", "lisinopril", "potassium"],
    },
    {
      id: "clin-hyperk-calcium-salt-selection",
      lane: "clinical",
      kicker: "Resuscitation Pharmacology",
      title: "Calcium Gluconate vs Calcium Chloride Selection",
      prompt: "A clinician selects an IV calcium formulation for myocardial membrane stabilization in severe hyperkalemia.",
      ask: "How does elemental calcium content and tissue extravasation risk differ between Calcium Chloride and Calcium Gluconate?",
      choices: [
        { id: "ca-chloride-3x-central", label: "Calcium chloride provides 3x the elemental calcium (27.2 vs 9.3 mg/mL) but causes severe tissue necrosis if extravasated (central line preferred); Calcium gluconate is preferred for peripheral IV" },
        { id: "ca-gluconate-3x-central", label: "Calcium gluconate provides 3x elemental calcium and is central-line only" },
        { id: "ca-salts-identical", label: "Both formulations provide identical elemental calcium and carry identical peripheral extravasation risk" },
        { id: "ca-chloride-slow", label: "Calcium chloride requires hepatic conversion before becoming active" },
      ],
      correct: "ca-chloride-3x-central",
      answer: "1 ampule (10 mL 10%) of Calcium Chloride contains 27.2 mg/mL elemental calcium (total 272 mg, ~13.6 mEq), providing 3-fold more calcium than Calcium Gluconate (9.3 mg/mL elemental Ca, total 93 mg, ~4.65 mEq). However, chloride causes severe ischemic chemical necrosis if extravasated into peripheral tissues. Calcium Gluconate is preferred for peripheral IV access; Calcium Chloride is reserved for central venous access or active cardiac arrest.",
      drugIds: ["spironolactone", "potassium"],
    },
    {
      id: "clin-hyperk-ckd-insulin-dose-reduction",
      lane: "clinical",
      kicker: "Nephrology / Medication Safety",
      title: "Hyperkalemia Insulin Shifting in Renal Impairment",
      prompt: "A patient with Stage 4 CKD (eGFR 20 mL/min) and severe hyperkalemia receives regular insulin + dextrose to shift potassium intracellularly.",
      ask: "Why is the regular insulin dose reduced from 10 units down to 5 units IV in advanced renal impairment?",
      choices: [
        { id: "ckd-insulin-clearance-5u", label: "Renal insulin clearance is severely impaired, prolonging insulin half-life and causing profound late hypoglycemia (peak 90–180 min); 5 units IV provides equivalent potassium shifting with significantly lower hypoglycemia risk" },
        { id: "ckd-insulin-resistance-20u", label: "CKD patients are resistant to insulin and require 20 units IV" },
        { id: "ckd-dextrose-contraindicated", label: "Dextrose cannot be given in CKD due to volume overload" },
        { id: "ckd-potassium-unresponsive", label: "Insulin does not shift potassium into cells in patients with renal failure" },
      ],
      correct: "ckd-insulin-clearance-5u",
      answer: "The kidneys clear 30–40% of systemic insulin. In eGFR <30 mL/min, insulin clearance is blunted, prolonging half-life and causing peak hypoglycemic risk to occur late (90–180 minutes post-infusion), long after the single 25 g D50W ampule has been consumed. Consensus guidelines recommend reducing the IV regular insulin dose to 5 units in patients with eGFR <30 or baseline glucose <140 mg/dL, with serial glucose checks for 3 hours.",
      drugIds: ["lisinopril", "furosemide"],
    },
    {
      id: "clin-valproate-vhe-normal-lft-trap",
      lane: "clinical",
      kicker: "Neurology / Toxicology",
      title: "Valproate Hyperammonemia & The Normal LFT Trap",
      prompt: "A patient on valproate and topiramate presents with confusion, lethargy, and asterixis. Serum ALT and AST are completely normal.",
      ask: "What enzymatic inhibition causes hyperammonemic encephalopathy without hepatocellular necrosis, and what is the antidote?",
      choices: [
        { id: "vhe-nags-carnitine", label: "Valproate metabolite 2-ene-VPA inhibits N-acetylglutamate synthase (NAGS) in the urea cycle, causing hyperammonemia with normal transaminases; IV L-Carnitine (Levocarnitine) is the antidote" },
        { id: "vhe-alt-ast-false", label: "Transaminases are falsely normal because valproate destroys all ALT enzymes" },
        { id: "vhe-hemodialysis-only", label: "Hyperammonemia is caused by renal failure; emergency hemodialysis is the only treatment" },
        { id: "vhe-lactulose-only", label: "VHE is identical to cirrhosis; lactulose enemas cure mitochondrial dysfunction" },
      ],
      correct: "vhe-nags-carnitine",
      answer: "Valproate metabolite 2-ene-VPA inhibits N-acetylglutamate synthase (NAGS), depleting N-acetylglutamate which is the obligate allosteric activator of carbamoyl phosphate synthetase 1 (CPS-1) in the mitochondrial urea cycle. This halts ammonia clearance, producing severe encephalopathy with completely normal AST/ALT in >80% of patients! IV L-Carnitine (100 mg/kg load, max 6 g, then 50 mg/kg q8h) restores mitochondrial beta-oxidation and clears ammonia.",
      drugIds: ["valproate", "topiramate"],
    },
    {
      id: "clin-valproate-carbapenem-crash",
      lane: "clinical",
      kicker: "Drug-Drug Interactions / Neurology",
      title: "Carbapenem-Valproate Crash Mechanism",
      prompt: "An epileptic patient on valproic acid receives IV meropenem for an intra-abdominal infection. Within 24 hours, serum valproate collapses from 80 µg/mL to 12 µg/mL.",
      ask: "What irreversible enzymatic mechanism drives this collapse, and how does valproate dose escalation respond?",
      choices: [
        { id: "carbapenem-apeh-irreversible", label: "Carbapenems irreversibly inhibit acylpeptide hydrolase (APEH) and accelerate UGT clearance, collapsing levels by >80%; dose escalation fails completely and co-administration is contraindicated" },
        { id: "carbapenem-absorption-block", label: "Carbapenems bind oral valproate in the gut lumen; switching to IV valproate overcomes the interaction" },
        { id: "carbapenem-cyp-induction", label: "Carbapenems induce CYP3A4; doubling the valproate dose restores therapeutic levels" },
        { id: "carbapenem-protein-displacement", label: "Carbapenems displace valproate from albumin, causing rapid renal excretion without dropping active drug" },
      ],
      correct: "carbapenem-apeh-irreversible",
      answer: "Carbapenems irreversibly inhibit erythrocyte acylpeptide hydrolase (APEH), blocking the cleavage of valproate-glucuronide back into parent valproic acid. They also accelerate hepatic glucuronidation (UGT) and renal elimination. Serum valproate plunges by 60–90% within 24 hours. Because the clearance pathway is accelerated and irreversible, increasing valproate doses fails completely. The combination is CONTRAINDICATED.",
      drugIds: ["valproate", "meropenem"],
    },
    {
      id: "clin-rivaroxaban-food-bioavailability",
      lane: "clinical",
      kicker: "Pharmacokinetics / Hematology",
      title: "Rivaroxaban 15/20 mg Meal Requirement",
      prompt: "A patient prescribed rivaroxaban 20 mg daily for DVT takes the medication every morning with black coffee without eating breakfast.",
      ask: "How does taking rivaroxaban 15 mg or 20 mg without food alter its pharmacokinetics and clinical efficacy?",
      choices: [
        { id: "riva-fasting-drops-auc", label: "Fasting administration reduces bioavailability by 39% (AUC drops from ~100% to ~66%), resulting in subtherapeutic anticoagulation and recurrent thrombosis" },
        { id: "riva-fasting-doubles-auc", label: "Fasting administration doubles absorption, predisposing to fatal gastrointestinal hemorrhage" },
        { id: "riva-food-no-effect", label: "Food intake has zero effect on rivaroxaban absorption at any dose" },
        { id: "riva-morning-mandatory", label: "Rivaroxaban must only be taken at bedtime on an empty stomach" },
      ],
      correct: "riva-fasting-drops-auc",
      answer: "While rivaroxaban 10 mg has ~100% bioavailability regardless of food, the 15 mg and 20 mg tablets have poor aqueous solubility. Taking rivaroxaban 15 mg or 20 mg without food drops absorption by 39% (bioavailability ~66%), leading to subtherapeutic Factor Xa inhibition and recurrent thromboembolism. The FDA Prescribing Information mandates taking rivaroxaban 15 mg and 20 mg tablets with food (with the evening meal).",
      drugIds: ["rivaroxaban", "aspirin"],
    },
    {
      id: "clin-dabigatran-capsule-crush-hazard",
      lane: "clinical",
      kicker: "Medication Safety / Pharmacokinetics",
      title: "Dabigatran Capsule Integrity & Bioavailability Surge",
      prompt: "A dysphagic patient has dabigatran (Pradaxa) capsules opened and pellets mixed into food for administration.",
      ask: "Why does opening or crushing dabigatran capsules cause a dangerous surge in drug exposure?",
      choices: [
        { id: "dabigatran-75-percent-surge", label: "The capsule shell regulates exposure to the internal tartaric acid core; opening the capsule surges bioavailability by 75% (and up to 2- to 3-fold), precipitating severe hemorrhage" },
        { id: "dabigatran-inactivated", label: "Gastric acid immediately destroys unbound dabigatran, rendering the drug completely inactive" },
        { id: "dabigatran-capsule-safe", label: "Dabigatran pellets can be safely crushed and delivered via enteral feeding tubes" },
        { id: "dabigatran-delayed-release", label: "Opening the capsule converts dabigatran into an extended-release formulation" },
      ],
      correct: "dabigatran-75-percent-surge",
      answer: "Dabigatran etexilate pellets contain an internal tartaric acid core to provide an acidic microenvironment for dissolution. The intact capsule regulates release. Opening, chewing, or crushing capsules surges systemic bioavailability by 75% (up to 200–300%), causing massive over-anticoagulation and life-threatening bleeding. Capsules must always be swallowed whole and stored in the original bottle with desiccant.",
      drugIds: ["dabigatran"],
    },
    {
      id: "clin-bup-precip-pharmacology",
      lane: "clinical",
      kicker: "Addiction Pharmacology",
      title: "Buprenorphine Precipitated Withdrawal Mechanism",
      prompt: "Buprenorphine possesses unique pharmacodynamic properties at the mu-opioid receptor (MOR) compared to traditional full agonists (e.g. methadone, oxycodone, morphine).",
      ask: "Why does initiating standard-dose buprenorphine in an opioid-dependent patient with high full-agonist receptor occupancy precipitate acute withdrawal?",
      choices: [
        { id: "bup-affinity-low-intrinsic", label: "High MOR binding affinity with low intrinsic efficacy (partial agonist) displaces full agonists and abruptly drops downstream intracellular signaling" },
        { id: "bup-cyp-induction", label: "Rapid induction of CYP3A4 accelerates the metabolic clearance of circulating full agonists" },
        { id: "bup-kappa-antagonism", label: "Competitive antagonism at kappa-opioid receptors causes sudden dysphoria and autonomic hyperarousal" },
        { id: "bup-peripheral-vaso", label: "Peripheral vasodilation and histamine release mimic hyperadrenergic opioid withdrawal symptoms" },
      ],
      correct: "bup-affinity-low-intrinsic",
      answer: "Buprenorphine has very high binding affinity (Ki ~0.2 nM) but low intrinsic activity (~30–40% maximal G-protein activation) at mu-opioid receptors. When administered while receptors are occupied by full agonists, buprenorphine competitively displaces the full agonist. The net decrease in receptor signaling precipitates acute, severe withdrawal. Initiation requires waiting for receptor clearance (objective withdrawal) or employing low-dose micro-induction.",
      drugIds: ["buprenorphine"],
    },
    {
      id: "clin-fentanyl-adipose-depot-kinetics",
      lane: "clinical",
      kicker: "Addiction Pharmacokinetics",
      title: "Fentanyl Adipose Sequestration & Delayed Clearance",
      prompt: "Patients using illicit fentanyl frequently experience precipitated withdrawal when initiated on buprenorphine despite waiting >24–48 hours and exhibiting objective withdrawal signs.",
      ask: "What pharmacokinetic feature explains prolonged receptor occupancy and unpredictable clearance after chronic high-dose fentanyl use?",
      choices: [
        { id: "fentanyl-lipophilicity-adipose", label: "High lipophilicity results in massive tissue accumulation with slow, prolonged redistribution back into circulation from deep adipose stores" },
        { id: "fentanyl-irreversible-binding", label: "Irreversible covalent bonding to mu-opioid receptors prevents enzymatic clearance" },
        { id: "fentanyl-enterohepatic", label: "Extensive enterohepatic recirculation bypasses renal and fecal elimination pathways" },
        { id: "fentanyl-auto-inhibition", label: "Potent auto-inhibition of CYP3A4 halts its own hepatic N-dealkylation to norfentanyl" },
      ],
      correct: "fentanyl-lipophilicity-adipose",
      answer: "Unlike therapeutic single doses (where terminal half-life is ~2–4 hours due to rapid redistribution), chronic high-dose fentanyl use saturates peripheral lipid depots (octanol-water partition coefficient logP ~4.05). Fentanyl slowly leaches back into systemic circulation for days to weeks (context-sensitive half-life exceeding 24–72 hours), maintaining high receptor occupancy and provoking precipitated withdrawal even when clinical withdrawal scores appear moderate.",
      drugIds: ["fentanyl", "buprenorphine"],
    },
    {
      id: "clin-naloxone-half-life-renarcotization",
      lane: "clinical",
      kicker: "Harm Reduction & Resuscitation",
      title: "Naloxone Half-Life vs Synthetic Opioids (Renarcotization)",
      prompt: "A patient with suspected opioid overdose regains spontaneous breathing and alertness after intranasal naloxone reversal, but wishes to leave the emergency department immediately.",
      ask: "Why is a minimum observation period warranted after successful naloxone reversal?",
      choices: [
        { id: "naloxone-short-half-life", label: "Naloxone has a short terminal half-life (~30–90 min), whereas long-acting or depot synthetic opioids remain active far longer, risking recurrent respiratory arrest (renarcotization)" },
        { id: "naloxone-toxic-metabolites", label: "Naloxone converts into active nephrotoxic metabolites that precipitate acute kidney injury without alkaline diuresis" },
        { id: "naloxone-rebound-hypertension", label: "Post-reversal rebound hypertension consistently triggers hemorrhagic stroke within 2 hours" },
        { id: "naloxone-receptor-downregulation", label: "Intranasal naloxone induces prolonged down-regulation of respiratory chemoreceptors in the brainstem" },
      ],
      correct: "naloxone-short-half-life",
      answer: "Naloxone is a pure competitive opioid antagonist with a rapid distribution phase and a terminal elimination half-life of only 30–90 minutes. In contrast, lipophilic synthetic opioids (fentanyl, carfentanil) and long-acting agonists (methadone) remain present at toxic tissue concentrations for 6–24+ hours. As naloxone clears the receptor, uneliminated agonist reoccupies receptors, causing recurrent respiratory depression ('renarcotization'). Observation for at least 2–4 hours (and longer for sustained-release opioids or methadone) is standard practice.",
      drugIds: ["naloxone", "fentanyl", "methadone"],
    },
    {
      id: "clin-methadone-cyp-qtc-safety",
      lane: "clinical",
      kicker: "MOUD & Electrophysiology",
      title: "Methadone Metabolism and Cardiac Electrophysiology",
      prompt: "A patient enrolled in an Opioid Treatment Program (OTP) on stable methadone maintenance presents with pneumonia and is prescribed clarithromycin or fluconazole.",
      ask: "What dual pharmacological risk arises from co-administering potent CYP3A4 inhibitors with methadone?",
      choices: [
        { id: "methadone-cyp-herg-qtc", label: "Impaired clearance elevates methadone plasma concentrations, compounding dose-dependent hERG potassium channel blockade and precipitating QTc prolongation and TdP" },
        { id: "methadone-alpha-glycoprotein", label: "Rapid displacement of methadone from plasma alpha-1-acid glycoprotein provokes acute opioid toxicity with normal total levels" },
        { id: "methadone-cyp2b6-induction", label: "Induction of CYP2B6 abruptly lowers active R-methadone enantiomer, triggering acute withdrawal" },
        { id: "methadone-pgp-nephrotoxicity", label: "Competitive inhibition of renal P-glycoprotein causes proximal tubular necrosis and interstitial nephritis" },
      ],
      correct: "methadone-cyp-herg-qtc",
      answer: "Methadone is primarily metabolized by CYP3A4 and CYP2B6 to inactive EDDP. Potent CYP3A4 inhibitors (clarithromycin, fluconazole, ketoconazole) increase methadone AUC and half-life. Because methadone (specifically the S-enantiomer) causes concentration-dependent blockade of the human ether-a-go-go-related gene (hERG) cardiac potassium current (IKr), elevated levels markedly prolong the QTc interval and increase the incidence of Torsades de Pointes. Baseline and serial ECG monitoring with alternative anti-infective selection is advised.",
      drugIds: ["methadone", "clarithromycin", "fluconazole"],
    },
    {
      id: "clin-naltrexone-washout-window",
      lane: "clinical",
      kicker: "MOUD Pharmacotherapy",
      title: "Naltrexone Induction Washout Requirements",
      prompt: "A patient with Opioid Use Disorder requests initiation of extended-release injectable naltrexone (Vivitrol) to maintain abstinence.",
      ask: "What opioid-free washout interval is necessary prior to naltrexone administration to prevent catastrophic precipitated withdrawal?",
      choices: [
        { id: "naltrexone-7-14-day-washout", label: "At least 7–10 days opioid-free for short-acting opioids (and 10–14 days for long-acting agents like methadone or buprenorphine), verified by negative UDS and/or naloxone challenge" },
        { id: "naltrexone-24-hour-cows", label: "A 24-hour abstinence period verified by a COWS score of at least 8" },
        { id: "naltrexone-no-washout-needed", label: "No washout is necessary if starting with oral naltrexone before the depot intramuscular injection" },
        { id: "naltrexone-loperamide-bridge", label: "Concurrent administration of high-dose loperamide eliminates the need for an opioid washout window" },
      ],
      correct: "naltrexone-7-14-day-washout",
      answer: "Naltrexone is a potent, competitive mu-opioid receptor antagonist with no intrinsic opioid agonist activity. Administering naltrexone to an individual with active opioid receptor occupancy provokes immediate, severe, and prolonged precipitated withdrawal lasting days (with intramuscular depot lasting weeks). FDA labeling mandates an absolute opioid-free interval of 7–10 days for short-acting opioids and 10–14 days for long-acting opioids (methadone, buprenorphine), verified by urine drug screening and/or a naloxone challenge test prior to injection.",
      drugIds: ["naltrexone", "methadone", "buprenorphine"],
    },
    {
      id: "clin-xylazine-tranq-management",
      lane: "clinical",
      kicker: "Street Supply & Adulterants",
      title: "Xylazine Adulteration ('Tranq') and Resuscitation",
      prompt: "An unresponsive individual with suspected opioid overdose receives multiple doses of naloxone. Respiratory rate improves with bag-valve-mask ventilation, but profound sedation, severe bradycardia, and hypotension persist.",
      ask: "What clinical principle governs the management of xylazine-induced toxicity?",
      choices: [
        { id: "xylazine-alpha2-airway-priority", label: "Xylazine is a non-opioid alpha-2 adrenergic agonist unresponsive to naloxone; prioritize airway support, oxygenation, and perfusion rather than escalating naloxone" },
        { id: "xylazine-high-dose-naloxone", label: "Continuous high-dose naloxone infusion competitively displaces xylazine from alpha-2 adrenergic receptors" },
        { id: "xylazine-flumazenil-reversal", label: "Administration of flumazenil specifically reverses central xylazine-induced respiratory depression" },
        { id: "xylazine-emergent-dialysis", label: "Emergent hemodialysis is required within 2 hours to clear the water-soluble xylazine metabolite" },
      ],
      correct: "xylazine-alpha2-airway-priority",
      answer: "Xylazine ('tranq') is a veterinary alpha-2 adrenergic agonist commonly co-adulterated into illicit fentanyl supplies. Naloxone has no affinity for alpha-2 adrenergic receptors and will NOT reverse xylazine sedation, bradycardia, or hypotension. Responders must administer sufficient naloxone only to restore spontaneous ventilation (target RR ≥10–12/min) and avoid excessive dosing that triggers acute opioid withdrawal without reversing coma. Management centers on basic life support: bag-valve mask ventilation, supplemental oxygen, warming, and IV crystalloids for hypotension.",
      drugIds: ["xylazine", "naloxone", "fentanyl"],
    },
    {
      id: "clin-alcohol-withdrawal-ciwa-gaba",
      lane: "clinical",
      kicker: "Alcohol Withdrawal Syndromes",
      title: "GABA-A Allosteric Modulation & Delirium Tremens Prevention",
      prompt: "A patient presenting with acute tremors, diaphoresis, and tactile hallucinations 36 hours after cessation of heavy alcohol intake is assessed for symptom-triggered pharmacotherapy.",
      ask: "What neuropharmacological mechanism justifies benzodiazepines or phenobarbital as gold-standard agents for alcohol withdrawal?",
      choices: [
        { id: "alcohol-gaba-pam-blunts-excitotoxicity", label: "Positive allosteric modulation of GABA-A receptors compensates for depleted inhibitory tone and blunts NMDA/glutamatergic excitotoxicity" },
        { id: "alcohol-beta-blocker-sympathetic", label: "Competitive antagonism at post-synaptic beta-1 adrenergic receptors blunts central sympathetic outflow" },
        { id: "alcohol-adh-inhibition", label: "Direct inhibition of alcohol dehydrogenase halts production of neurotoxic acetaldehyde" },
        { id: "alcohol-d2-blockade", label: "Blockade of central dopamine D2 receptors directly terminates alcohol withdrawal seizures and hallucinosis" },
      ],
      correct: "alcohol-gaba-pam-blunts-excitotoxicity",
      answer: "Chronic ethanol consumption causes homeostatic down-regulation and desensitization of inhibitory GABA-A receptors and up-regulation of excitatory NMDA glutamate receptors. Abrupt cessation unmasks an acute imbalance: loss of GABAergic inhibition combined with profound glutamate-driven neuro-excitotoxicity, precipitating tremors, sympathetic hyperarousal, seizures, and delirium tremens. Benzodiazepines and phenobarbital act as positive allosteric modulators at GABA-A receptors, restoring chloride conductance and suppressing excitotoxicity. Thiamine must be co-administered prior to IV dextrose to prevent Wernicke-Korsakoff syndrome.",
      drugIds: ["diazepam", "lorazepam", "phenobarbital", "ethanol"],
    },
    {
      id: "clin-bup-micro-induction-bernese",
      lane: "clinical",
      kicker: "Low-Dose Buprenorphine Initiation",
      title: "Low-Dose Buprenorphine Induction (Bernese Model)",
      prompt: "In patients with high fentanyl exposure or those on chronic methadone maintenance where traditional withdrawal is intolerable or unsafe, low-dose initiation protocols (Bernese method) are increasingly utilized.",
      ask: "What is the core pharmacodynamic strategy of low-dose buprenorphine initiation?",
      choices: [
        { id: "bup-bernese-overlapping-micro", label: "Titrating micro-doses of buprenorphine while maintaining full agonist slowly builds receptor occupancy without triggering acute precipitated withdrawal" },
        { id: "bup-naloxone-peripheral-block", label: "Pre-treating with naloxone blocks peripheral receptors so buprenorphine acts exclusively on spinal nociceptive pathways" },
        { id: "bup-rapid-receptor-desensitization", label: "Using intravenous boluses rapidly desensitizes mu-opioid G-protein coupled receptors to full agonists" },
        { id: "bup-alternating-q4h-methadone", label: "Alternating buprenorphine every 4 hours with methadone prevents competitive binding at the same receptor pool" },
      ],
      correct: "bup-bernese-overlapping-micro",
      answer: "The Bernese method (Hämmig et al., 2016; Subst Abuse Rehabil 2016) utilizes overlapping micro-dosing of buprenorphine titrating over several days while continuing the patient's baseline full opioid agonist (fentanyl or methadone). Because buprenorphine binds with extremely high affinity and dissociates very slowly, sub-therapeutic micro-doses progressively saturate a fraction of receptors without displacing enough full agonist to provoke withdrawal symptoms. Once buprenorphine achieves therapeutic receptor occupancy, the full agonist is discontinued seamlessly without an acute withdrawal window.",
      drugIds: ["buprenorphine", "methadone", "fentanyl"],
    },
    {
      id: "clin-renal-gabapentinoid-myoclonus",
      lane: "clinical",
      kicker: "Renal Clearance & Neurotoxicity",
      title: "Gabapentinoid Clearance in Renal Impairment",
      prompt: "A patient with declining glomerular filtration rate (CKD / reduced eGFR) receives gabapentin or pregabalin without dosage adjustment and develops acute encephalopathy, asterixis, and diffuse myoclonus.",
      ask: "What pharmacokinetic and elimination mechanism explains gabapentinoid neurotoxicity in renal dysfunction?",
      choices: [
        { id: "renal-filtration-accumulation", label: "Gabapentin and pregabalin are eliminated virtually 100% unchanged via renal glomerular filtration; impaired GFR causes massive drug accumulation and CNS neurotoxicity" },
        { id: "hepatic-cyp-metabolites", label: "Renal failure down-regulates hepatic CYP3A4, causing accumulation of a toxic oxidative epoxide metabolite" },
        { id: "protein-binding-displacement", label: "Circulating uremic toxins competitively displace gabapentinoids from albumin, elevating free fractions tenfold" },
        { id: "tubular-secretion-saturation", label: "Active proximal tubular secretion saturates, completely preventing removal even with hemodialysis" },
      ],
      correct: "renal-filtration-accumulation",
      answer: "Gabapentin and pregabalin undergo negligible hepatic metabolism (<1–2%) and are eliminated virtually 100% unchanged in the urine via glomerular filtration. Their systemic clearance is directly proportional to creatinine clearance. When renal filtration declines without proportional dose reduction and interval extension, elimination half-life stretches from ~6 hours to over 30–40 hours, leading to severe parent-drug accumulation. The resulting neurotoxicity—characterized by multifocal myoclonus, asterixis, ataxia, and depressed consciousness—is frequently misdiagnosed as stroke or uremic encephalopathy. KDIGO guidelines and FDA labeling mandate proactive dosage reduction and interval extension based on renal function, and intermittent hemodialysis readily clears both agents.",
      drugIds: ["gabapentin", "pregabalin"],
    },
    {
      id: "clin-beers-anticholinergic-fall-fracture",
      lane: "clinical",
      kicker: "Geriatrics & Beers Criteria",
      title: "Tertiary vs Secondary Amine TCAs and Anticholinergic Toxicity",
      prompt: "An older adult is evaluated for pharmacotherapy under the 2023 American Geriatrics Society (AGS) Beers Criteria for potentially inappropriate medication use.",
      ask: "Why do consensus geriatric guidelines strongly advise against tertiary amine TCAs (e.g., amitriptyline) compared to secondary amines (e.g., nortriptyline)?",
      choices: [
        { id: "tertiary-anticholinergic-falls", label: "Tertiary amines exhibit significantly greater muscarinic, histaminergic, and alpha-1 blockade, markedly escalating risks of acute delirium, sedation, orthostasis, and fall-related fractures" },
        { id: "secondary-bone-demineralization", label: "Secondary amines directly inhibit osteoblast differentiation, tripling femoral fracture risk independent of fall events" },
        { id: "tertiary-zero-bbb-penetration", label: "Tertiary amines fail to cross the blood-brain barrier and cause peripheral bowel obstruction without central efficacy" },
        { id: "secondary-irreversible-cyp-inhibition", label: "Secondary amines irreversibly inactivate CYP2D6 via mechanism-based suicide inhibition, triggering drug-induced parkinsonism" },
      ],
      correct: "tertiary-anticholinergic-falls",
      answer: "Under the 2023 AGS Beers Criteria, tertiary amine tricyclic antidepressants (amitriptyline, imipramine, doxepin, clomipramine) are classified as strongly to be avoided in older adults due to their high anticholinergic burden, profound sedation, and alpha-1 adrenergic blockade. These properties produce acute confusion/delirium, urinary retention, severe constipation, orthostatic hypotension, and a substantially elevated rate of falls and fractures. In contrast, secondary amine metabolites (nortriptyline, desipramine) demonstrate substantially lower muscarinic and histaminergic affinity, presenting a lower anticholinergic and orthostatic hazard when a TCA is clinically indispensable.",
      drugIds: ["amitriptyline", "nortriptyline"],
    },
    {
      id: "clin-dasatinib-ppi-gastric-ph",
      lane: "clinical",
      kicker: "Oncology Pharmacology & pH Interactions",
      title: "Gastric Acid Suppression & Kinase Inhibitor Solubility Collapse",
      prompt: "A patient with chronic myeloid leukemia on dasatinib (or non-small cell lung cancer on erlotinib) develops heartburn and starts daily omeprazole.",
      ask: "Why does co-administration with a proton pump inhibitor (PPI) precipitate oncologic treatment failure, and why does dose separation fail to resolve it?",
      choices: [
        { id: "ppi-ph-solubility-collapse", label: "Dasatinib tablet dissolution requires an acidic gastric environment; sustained PPI hypochlorhydria collapses solubility, reducing AUC by >60%, and 24-hour pump inactivation renders dose spacing futile" },
        { id: "ppi-cyp-induction", label: "Omeprazole strongly induces CYP3A4 transcription in hepatocytes, accelerating dasatinib oxidative degradation" },
        { id: "ppi-kinase-chelation", label: "Proton pump inhibitors directly bind the ATP-binding pocket of BCR-ABL1 and EGFR, competitively antagonizing kinase inhibition" },
        { id: "ppi-renal-tubular-clearance", label: "Omeprazole up-regulates organic cation transporters (OCT2), accelerating renal excretion of dasatinib parent compound" },
      ],
      correct: "ppi-ph-solubility-collapse",
      answer: "Dasatinib and erlotinib exhibit steep pH-dependent aqueous solubility: they dissolve readily in acidic gastric secretions (pH < 2) but are virtually insoluble at neutral pH. PPIs like omeprazole produce irreversible covalent inhibition of parietal cell H+/K+-ATPase pumps, suppressing acid secretion for >24 hours. Concomitant PPI therapy collapses dasatinib peak concentration (Cmax) and area under the curve (AUC) by more than 60%, precipitating loss of cytogenetic response and disease relapse. Because PPI-induced acid suppression lasts around the clock, separating dosing times by hours does NOT restore absorption. FDA labeling contraindicates or strongly recommends avoiding PPIs and H2RAs with dasatinib; if antacids are needed, short-acting, non-PPI formulations separated by at least 2 hours may be used.",
      drugIds: ["dasatinib", "omeprazole", "erlotinib"],
    },
    {
      id: "clin-ss-vs-nms-differentials",
      lane: "clinical",
      kicker: "Critical Care Toxicology",
      title: "Differential Diagnosis: Serotonin Syndrome vs NMS",
      prompt: "A patient in the intensive care unit presents with hyperthermia, tachycardia, diaphoresis, and altered mental status with recent psychotropic polypharmacy.",
      ask: "Under validated diagnostic criteria (Hunter Criteria vs NMS criteria), which clinical features most accurately distinguish Serotonin Syndrome from Neuroleptic Malignant Syndrome?",
      choices: [
        { id: "hunter-clonus-vs-nms-rigidity", label: "Serotonin syndrome features rapid onset (<24h), hyperreflexia, clonus, and hyperactive bowel sounds; NMS features insidious onset (days), 'lead-pipe' rigidity, hyporeflexia, and normal/hypoactive bowels" },
        { id: "nms-clonus-vs-ss-rigidity", label: "NMS features acute spontaneous ocular clonus and diarrhea; serotonin syndrome is characterized by generalized plastic lead-pipe rigidity" },
        { id: "identical-presentation-cpk-only", label: "Both conditions exhibit indistinguishable physical exams and are differentiated exclusively by elevated serum creatine kinase" },
        { id: "ss-bradypnea-vs-nms-hyperreflexia", label: "Serotonin syndrome causes profound respiratory depression and hyporeflexia; NMS triggers brisk hyperreflexia and agitation" },
      ],
      correct: "hunter-clonus-vs-nms-rigidity",
      answer: "Dunkley 2003 Hunter Criteria establish neuromuscular excitation—specifically spontaneous, inducible, or ocular clonus, agitation, tremor, and lower-extremity hyperreflexia—combined with hyperactive bowel sounds, diarrhea, and rapid onset (typically within hours of starting or escalating serotonergic drugs) as the hallmark of Serotonin Syndrome. In stark contrast, Neuroleptic Malignant Syndrome (triggered by central dopamine D2 antagonism or dopamine agonist withdrawal) develops insidiously over days to weeks and is characterized by generalized 'lead-pipe' muscular rigidity, hyporeflexia or sluggish reflexes, and normal or hypodynamic bowels. While both cause fever and dysautonomia, clonus rules in serotonin toxicity, whereas profound lead-pipe rigidity rules in NMS.",
      drugIds: ["sertraline", "haloperidol"],
    },
    {
      id: "clin-hd-dialyzability-factors",
      lane: "clinical",
      kicker: "Dialysis & Extracorporeal Toxicology",
      title: "Determinants of Drug Clearance by Hemodialysis",
      prompt: "A toxicology and nephrology consult evaluates whether an acutely poisoned patient will benefit from emergent intermittent hemodialysis for drug clearance.",
      ask: "What four physicochemical and pharmacokinetic determinants govern whether a drug is effectively removed by conventional hemodialysis?",
      choices: [
        { id: "mw-pb-vd-solubility-quadad", label: "Molecular weight (<500 Da), protein binding (<80%), volume of distribution (Vd < 1 L/kg), and high water solubility" },
        { id: "high-vd-lipophilic-large-mw", label: "Large volume of distribution (Vd > 5 L/kg), lipophilicity, low water solubility, and high molecular weight (>5,000 Da)" },
        { id: "high-protein-binding-biliary", label: "Extensive plasma protein binding (>95%), biliary excretion, neutral charge, and high lipid partitioning" },
        { id: "cyp-turnover-receptor-affinity", label: "Hepatic CYP2D6 turnover rate, erythrocyte membrane permeability, high tissue binding, and Vd > 10 L/kg" },
      ],
      correct: "mw-pb-vd-solubility-quadad",
      answer: "Conventional hemodialysis clearance depends on four cardinal physical and pharmacokinetic principles: 1) Molecular Weight: small molecules (<500 Da) readily diffuse through dialyzer pores (high-flux filters allow larger middle molecules up to several thousand Da); 2) Protein Binding: only free, unbound drug (<80% protein-bound) is filtered, as large albumin-drug complexes cannot cross; 3) Volume of Distribution (Vd): a low Vd (<1 L/kg, ideally <0.7 L/kg) ensures the bulk of total body drug resides in the intravascular and accessible extracellular space; and 4) Water Solubility: high aqueous solubility permits rapid passive diffusion down concentration gradients into aqueous dialysate. Toxic alcohols, lithium, and salicylates fulfill these criteria, while digoxin and tricyclic antidepressants fail due to high tissue distribution or protein binding.",
      drugIds: ["lithium", "aspirin"],
    },
    {
      id: "clin-qtc-hypokalemia-herg-blockade",
      lane: "clinical",
      kicker: "Electrophysiology & Channelopathy",
      title: "Hypokalemia Amplification of hERG (IKr) Potassium Channel Blockade",
      prompt: "A patient receiving a medication known to prolong the QTc interval develops diuretic-induced hypokalemia with a serum potassium < 3.5 mEq/L.",
      ask: "By what electrophysiological mechanism does extracellular hypokalemia synergistically exacerbate drug-induced QTc prolongation and Torsades de Pointes risk?",
      choices: [
        { id: "hypok-decreases-ikr-enhances-binding", label: "Extracellular hypokalemia paradoxically accelerates inactivation of the rapid delayed rectifier potassium channel (IKr / hERG) and enhances drug binding affinity to the channel pore" },
        { id: "hypok-activates-inward-sodium", label: "Low extracellular potassium causes constitutive opening of Nav1.5 cardiac sodium channels, extending Phase 0 depolarization" },
        { id: "hypok-accelerates-repolarization", label: "Hypokalemia hyperpolarizes resting cardiac myocytes, accelerating repolarization and inducing early afterdepolarizations" },
        { id: "hypok-stimulates-cyp-breakdown", label: "Hypokalemia induces sudden CYP3A4 upregulation, clearing protective metabolites that stabilize cardiac repolarization" },
      ],
      correct: "hypok-decreases-ikr-enhances-binding",
      answer: "Cardiac Phase 3 repolarization is driven by outward potassium movement through rapid delayed rectifier channels (IKr), encoded by the human ether-a-go-go-related gene (hERG / KCNH2). Lower extracellular potassium concentrations paradoxically decrease outward IKr current by accelerating voltage-dependent channel inactivation and reducing single-channel conductance. Concurrently, lower extracellular potassium enhances the conformational binding affinity of many drugs (e.g., sotalol, haloperidol, azoles) for the inner cavity of the hERG pore. This dual impairment delays repolarization, stretches the QTc interval, and facilitates L-type calcium channel reactivation (early afterdepolarizations, EADs), precipitating Torsades de Pointes (TdP). AHA/ACC guidelines advise maintaining serum potassium ≥4.0 mEq/L and magnesium ≥2.0 mg/dL in patients on QTc-prolonging pharmacotherapy.",
      drugIds: ["potassium", "sotalol", "haloperidol"],
    },
    {
      id: "clin-lithium-hctz-nsaid-clearance",
      lane: "clinical",
      kicker: "Renal Physiology & Electrolytes",
      title: "Lithium Proximal Tubule Reabsorption with Thiazides & NSAIDs",
      prompt: "A patient on stable lithium therapy for bipolar disorder is prescribed hydrochlorothiazide for hypertension and takes over-the-counter ibuprofen for musculoskeletal pain. Several weeks later, the patient develops coarse tremor, ataxia, confusion, and acute kidney injury.",
      ask: "What renal transport mechanism explains why thiazide diuretics and NSAIDs synergistically collapse lithium clearance?",
      choices: [
        {
          id: "nhe3-compensatory-reabsorption-nsaid-gfr",
          label: "Thiazide-induced natriuresis provokes compensatory proximal tubular reabsorption of lithium via NHE3 (cutting clearance by 30–50%), while NSAIDs inhibit renal prostaglandins to reduce GFR",
        },
        {
          id: "cyp-inhibition-lithium-degradation",
          label: "Thiazides potently inhibit hepatic CYP2C9 enzymes responsible for lithium oxidative metabolism",
        },
        {
          id: "enac-channel-trapping",
          label: "Thiazides and NSAIDs block cortical collecting duct ENaC channels, trapping lithium in tubular cells",
        },
        {
          id: "albumin-displacement-free-fraction",
          label: "NSAIDs competitively displace lithium from plasma albumin binding sites, precipitating acute free-fraction surges",
        },
      ],
      correct: "nhe3-compensatory-reabsorption-nsaid-gfr",
      answer: "The kidneys handle lithium identically to sodium: approximately 80% is reabsorbed in the proximal convoluted tubule via the apical Na+/H+ exchanger 3 (NHE3), with zero distal reabsorption. Thiazide diuretics (such as HCTZ) block the Na-Cl cotransporter (NCCT) in the distal convoluted tubule, causing distal natriuresis and mild intravascular volume contraction. The nephron compensates by increasing sodium reabsorption in the proximal tubule; because the proximal tubule cannot distinguish lithium from sodium, it hyper-reabsorbs both via NHE3, reducing renal lithium clearance by 30% to 50%. Concurrently, NSAIDs inhibit renal cyclooxygenase and vasodilatory prostaglandins (PGE2/PGI2), constricting afferent arterioles and decreasing GFR, further blunting lithium elimination. The resulting collision precipitates acute lithium neurotoxicity (coarse tremor, ataxia, hyperreflexia, confusion) and acute kidney injury. Consensus guidelines recommend avoiding thiazides and NSAIDs with lithium or intensely monitoring serum levels with empiric dose reductions.",
      drugIds: ["lithium", "hctz", "ibuprofen"],
    },
    {
      id: "clin-digoxin-amiodarone-pgp",
      lane: "clinical",
      kicker: "Cardiology & Transporters",
      title: "Digoxin and Amiodarone P-gp Interaction & AV Blockade",
      prompt: "A patient with heart failure on maintenance digoxin therapy is started on amiodarone for persistent atrial fibrillation. Weeks later, the patient develops severe lethargy, nausea, yellow-green visual halos (xanthopsia), and an ECG showing junctional escape rhythm at 34 bpm.",
      ask: "What dual pharmacokinetic and pharmacodynamic mechanisms explain this life-threatening drug collision?",
      choices: [
        {
          id: "pgp-inhibition-plus-av-block",
          label: "Amiodarone inhibits renal tubular and intestinal P-glycoprotein (ABCB1) to double serum digoxin levels, while exerting additive AV-nodal blockade",
        },
        {
          id: "cyp2d6-induction-digoxin-metabolite",
          label: "Amiodarone strongly induces hepatic CYP2D6, generating cardiotoxic digoxin active metabolites",
        },
        {
          id: "thyroid-displacement-arrhythmia",
          label: "Digoxin displaces amiodarone from thyroid receptors, precipitating acute thyrotoxic junctional tachycardia",
        },
        {
          id: "oat-transporter-acceleration",
          label: "Amiodarone accelerates renal organic anion transporters (OAT1/3), inducing profound hypokalemia",
        },
      ],
      correct: "pgp-inhibition-plus-av-block",
      answer: "Amiodarone is a potent inhibitor of the efflux transporter P-glycoprotein (P-gp / ABCB1) located on renal proximal tubular apical membranes and intestinal enterocytes. Concomitant administration suppresses active renal tubular secretion and intestinal clearance of digoxin, routinely doubling (by 70% to 100%) serum digoxin concentrations within 1 to 2 weeks. Pharmacodynamically, both amiodarone and digoxin exert potent negative dromotropic effects on the atrioventricular (AV) node, leading to synergistic AV block, junctional escape rhythm, and profound bradycardia. Digitalis toxicity classically manifests with gastrointestinal distress (nausea, anorexia), neurologic symptoms, and xanthopsia (yellow-green visual halos). Consensus guidelines and FDA labeling recommend an empiric 30% to 50% digoxin dose reduction with frequent serum concentration monitoring when initiating amiodarone.",
      drugIds: ["digoxin", "amiodarone"],
    },
    {
      id: "clin-doac-reversal-mechanisms",
      lane: "clinical",
      kicker: "Critical Care & Anticoagulation Reversal",
      title: "Targeted DOAC Reversal Agents: Idarucizumab vs Andexanet Alfa",
      prompt: "An emergency resuscitation team prepares targeted reversal therapy for a patient with direct oral anticoagulant-associated life-threatening intracranial hemorrhage.",
      ask: "Which statement correctly distinguishes the specific molecular mechanisms of idarucizumab and andexanet alfa?",
      choices: [
        {
          id: "idarucizumab-fab-andexanet-decoy",
          label: "Idarucizumab is a monoclonal Fab fragment with ~350-fold higher affinity for dabigatran than thrombin; andexanet alfa is a catalytically inactive factor Xa decoy that sequesters factor Xa inhibitors (apixaban, rivaroxaban)",
        },
        {
          id: "idarucizumab-antithrombin-activator",
          label: "Idarucizumab directly activates antithrombin III to neutralize all factor Xa inhibitors; andexanet alfa is a proteolytic enzyme that degrades dabigatran",
        },
        {
          id: "andexanet-thrombin-antibody",
          label: "Andexanet alfa is a monoclonal antibody specific for direct thrombin inhibitors, whereas idarucizumab is a modified factor IX decoy",
        },
        {
          id: "vkorc1-competitive-antagonists",
          label: "Both reversal agents function as competitive antagonists at the hepatic VKORC1 enzyme complex to restore endogenous clotting factors",
        },
      ],
      correct: "idarucizumab-fab-andexanet-decoy",
      answer: "Targeted reversal of direct oral anticoagulants relies on distinct molecular constructs: Idarucizumab (Praxbind) is a humanized monoclonal antibody Fab fragment that binds free and thrombin-bound dabigatran with an affinity approximately 350 times greater than that of dabigatran for thrombin, neutralizing dabigatran within minutes without procoagulant rebound. Andexanet alfa (Andexxa) is a genetically engineered, catalytically inactive recombinant modified human factor Xa protein (with active site Ser419Ala mutation and Gla domain deletion); it functions as a decoy receptor that binds and sequesters oral direct factor Xa inhibitors (apixaban, rivaroxaban, edoxaban) and indirect inhibitors (enoxaparin). Consensus guidelines (ACC 2020 / ASH 2024) recommend these specific targeted reversal agents for life-threatening hemorrhage or emergent invasive procedures.",
      drugIds: ["dabigatran", "apixaban", "rivaroxaban"],
    },
    {
      id: "clin-warfarin-bactrim-cyp2c9",
      lane: "clinical",
      kicker: "CYP Pharmacokinetics & Anticoagulation",
      title: "Warfarin and TMP-SMX CYP2C9 Stereoselective Collision",
      prompt: "A patient on stable maintenance warfarin therapy is prescribed trimethoprim-sulfamethoxazole (TMP-SMX) for a skin and soft tissue infection. Four days later, the patient presents with gross hematuria, extensive ecchymoses, and an INR of 8.5.",
      ask: "What enantiomer-specific pharmacokinetic mechanism accounts for this abrupt, severe supratherapeutic INR escalation?",
      choices: [
        {
          id: "smx-cyp2c9-s-warfarin-inhibition",
          label: "Sulfamethoxazole potently inhibits CYP2C9, selectively blocking clearance of the 5-fold more potent (S)-warfarin enantiomer",
        },
        {
          id: "trimethoprim-r-warfarin-absorption",
          label: "Trimethoprim accelerates intestinal absorption of the inactive (R)-warfarin enantiomer via P-glycoprotein induction",
        },
        {
          id: "gut-flora-immediate-depletion",
          label: "TMP-SMX completely depletes all hepatic and systemic vitamin K stores within 12 hours through gut decontamination",
        },
        {
          id: "oct-renal-secretion-blockade",
          label: "Sulfamethoxazole competitively blocks renal organic cation transporters, suppressing tubular excretion of (R)-warfarin",
        },
      ],
      correct: "smx-cyp2c9-s-warfarin-inhibition",
      answer: "Warfarin is administered as a racemic mixture of (R)- and (S)-enantiomers. The (S)-enantiomer is 3 to 5 times more biologically potent than the (R)-enantiomer in inhibiting vitamin K epoxide reductase (VKORC1). (S)-warfarin is cleared almost exclusively via hepatic CYP2C9 oxidative metabolism, whereas (R)-warfarin is cleared through CYP1A2, CYP3A4, and CYP2C19. Sulfamethoxazole (in TMP-SMX) is a potent stereoselective inhibitor of CYP2C9. Concomitant administration inhibits (S)-warfarin clearance, driving a dramatic 2- to 4-fold surge in active (S)-warfarin plasma concentrations within 3 to 5 days, precipitating extreme supratherapeutic INR spikes and fatal hemorrhage. Consensus guidelines recommend avoiding TMP-SMX with warfarin or proactively reducing warfarin dosing by 30% to 50% with serial INR monitoring every 2 to 3 days.",
      drugIds: ["warfarin", "tmp-smx"],
    },
    {
      id: "clin-linezolid-ssri-maoi",
      lane: "clinical",
      kicker: "Toxicology & Neuropharmacology",
      title: "Linezolid MAO Inhibition and SSRI Serotonin Syndrome",
      prompt: "A patient receiving maintenance sertraline therapy for major depression is prescribed linezolid for a vancomycin-resistant enterococcal (VRE) infection. Within 24 hours of initiation, the patient develops ocular clonus, hyperreflexia, agitation, diaphoresis, and hyperthermia.",
      ask: "What intrinsic pharmacological property of linezolid precipitates severe serotonin syndrome when coadministered with an SSRI?",
      choices: [
        {
          id: "linezolid-reversible-mao-inhibition",
          label: "Linezolid possesses non-selective, reversible monoamine oxidase (MAO-A and MAO-B) inhibitory activity, preventing serotonin catabolism",
        },
        {
          id: "direct-5ht1a-postsynaptic-agonism",
          label: "Linezolid acts as a direct high-affinity agonist at brainstem postsynaptic 5-HT1A receptors",
        },
        {
          id: "cyp2d6-hyper-induction",
          label: "Linezolid potently induces hepatic CYP2D6, generating toxic pro-serotonergic sertraline metabolites",
        },
        {
          id: "vmat2-inhibition-dopamine-depletion",
          label: "Linezolid blocks vesicular monoamine transporter 2 (VMAT2), causing acute central catecholamine collapse",
        },
      ],
      correct: "linezolid-reversible-mao-inhibition",
      answer: "Although developed as an oxazolidinone antibacterial that binds the 50S ribosomal subunit, linezolid is structurally related to the antidepressant toloxatone and possesses potent, non-selective, reversible monoamine oxidase (MAO-A and MAO-B) inhibitory activity. MAO-A is the primary enzyme responsible for the metabolic deamination of serotonin (5-HT). When linezolid is combined with selective serotonin reuptake inhibitors (SSRIs), SNRIs, or other serotonergic agents, reuptake inhibition combined with impaired metabolic clearance causes massive intrasynaptic serotonin accumulation. This precipitates severe, potentially fatal Serotonin Syndrome (Hunter Criteria: spontaneous clonus, tremor, lower extremity hyperreflexia, autonomic instability, hyperthermia) without requiring high dosages. FDA safety alerts and guidelines recommend avoiding linezolid in patients receiving serotonergic psychotropics unless alternative antibacterials are unavailable, with mandatory clinical monitoring.",
      drugIds: ["linezolid", "sertraline"],
    },
    {
      id: "clin-methadone-fluconazole-qtc-3a4",
      lane: "clinical",
      kicker: "Cardiology & Pharmacokinetics",
      title: "Methadone and Fluconazole Dual PK/PD Collision & TdP Risk",
      prompt: "A patient on stable methadone maintenance therapy for opioid use disorder is prescribed oral fluconazole for esophageal candidiasis. Several days later, the patient experiences syncope and is found to have marked QTc prolongation (>540 ms) and runs of polymorphic ventricular tachycardia.",
      ask: "What dual pharmacokinetic (PK) and pharmacodynamic (PD) collision produces this severe arrhythmogenic risk?",
      choices: [
        {
          id: "cyp3a4-inhibition-plus-herg-blockade",
          label: "Fluconazole inhibits CYP3A4 and CYP2C19 to raise methadone levels (PK), while both drugs independently block hERG/IKr potassium channels (PD)",
        },
        {
          id: "cyp2b6-induction-plus-sodium-influx",
          label: "Fluconazole accelerates CYP2B6 clearance of methadone (PK), while stimulating inward Nav1.5 cardiac sodium channels (PD)",
        },
        {
          id: "oat-displacement-hyperkalemia",
          label: "Methadone displaces fluconazole from renal organic anion transporters (PK), inducing acute arrhythmogenic hyperkalemia (PD)",
        },
        {
          id: "mu-receptor-cooperativity-tachycardia",
          label: "Both drugs bind postsynaptic mu-opioid receptors with negative cooperativity, triggering acute adrenergic withdrawal tachycardia (PD)",
        },
      ],
      correct: "cyp3a4-inhibition-plus-herg-blockade",
      answer: "Methadone and fluconazole represent a classic dual PK and PD collision. Pharmacokinetically (PK), methadone clearance is mediated primarily by CYP3A4, CYP2B6, and CYP2C19; fluconazole is a potent inhibitor of CYP2C19 and a moderate-to-strong dose-dependent inhibitor of CYP3A4 and CYP2C9. Fluconazole coadministration significantly impairs methadone metabolic clearance, raising systemic methadone serum concentrations (AUC increased by 30% to 50% or more). Pharmacodynamically (PD), both (S)-methadone and fluconazole independently produce concentration-dependent blockade of the rapid delayed rectifier potassium channel (IKr / hERG). Elevated methadone levels combined with additive hERG channel inhibition synergistically delay cardiac ventricular repolarization, triggering marked QTc interval prolongation, early afterdepolarizations, and Torsades de Pointes (TdP). Consensus guidelines (CSAT / AHA) advise baseline and serial ECG monitoring, electrolyte repletion (potassium ≥ 4.0 mEq/L, magnesium ≥ 2.0 mg/dL), or alternative antifungal selection.",
      drugIds: ["methadone", "fluconazole"],
    },
    {
      id: "clin-sugammadex-cyclodextrin-chelation",
      lane: "clinical",
      kicker: "Anesthesiology & Neuromuscular Reversal",
      title: "Sugammadex Selective Cyclodextrin Chelation vs AChE Inhibition",
      prompt: "An anesthesia resuscitation team prepares to reverse deep rocuronium-induced neuromuscular blockade in an emergent surgical patient with severe reactive airway disease.",
      ask: "How does the molecular mechanism of sugammadex differ from traditional reversal with neostigmine, and why does it avoid muscarinic side effects?",
      choices: [
        {
          id: "cyclodextrin-chelation-guest-host",
          label: "Sugammadex forms a tight 1:1 guest-host inclusion complex encapsulating rocuronium in plasma, avoiding acetylcholinesterase inhibition and muscarinic cholinergic side effects",
        },
        {
          id: "competitive-nicotinic-displacement",
          label: "Sugammadex competitively displaces rocuronium from postjunctional nicotinic receptors, requiring co-administration of glycopyrrolate to prevent bradycardia",
        },
        {
          id: "pseudocholinesterase-enzymatic-cleavage",
          label: "Sugammadex accelerates hepatic and plasma pseudocholinesterase hydrolysis of aminosteroid neuromuscular blocking agents",
        },
        {
          id: "ryanodine-calcium-sequestration",
          label: "Sugammadex closes sarcoplasmic reticulum ryanodine receptor channels, restoring excitation-contraction coupling independent of junctional acetylcholine",
        },
      ],
      correct: "cyclodextrin-chelation-guest-host",
      answer: "Sugammadex is a modified gamma-cyclodextrin with eight lipophilic inner-cavity glucopyranose units and negatively charged carboxyl thioether extensions. It acts as a chelating host that forms a biologically inert, high-affinity 1:1 guest-host inclusion complex encapsulating the lipophilic steroid rings of rocuronium or vecuronium in plasma. Encapsulation rapidly reduces free intravascular drug concentration, driving a concentration gradient that draws the neuromuscular blocker away from junctional nicotinic receptors back into circulation, restoring train-of-four recovery within minutes without affecting acetylcholinesterase. In stark contrast, neostigmine acts by inhibiting acetylcholinesterase, non-selectively raising acetylcholine at both nicotinic and muscarinic receptors; without co-administered muscarinic antagonists (glycopyrrolate or atropine), neostigmine provokes severe bronchospasm, profound bradycardia, and salivation. Consensus ASA guidelines recognize sugammadex for rapid, predictable reversal of aminosteroid neuromuscular blockade.",
      drugIds: ["sugammadex", "rocuronium"],
    },
    {
      id: "clin-ivabradine-if-hcn-channel",
      lane: "clinical",
      kicker: "Cardiovascular Electrophysiology",
      title: "Ivabradine Selective SA Node HCN (If) Channel Blockade",
      prompt: "A patient with heart failure with reduced ejection fraction (HFrEF) in normal sinus rhythm has a persistent resting heart rate of 78 bpm despite guideline-directed beta-blocker therapy.",
      ask: "What unique electrophysiological mechanism enables ivabradine to lower heart rate without reducing myocardial inotropy or altering ventricular repolarization?",
      choices: [
        {
          id: "selective-hcn-if-blockade",
          label: "Ivabradine selectively blocks hyperpolarization-activated cyclic nucleotide-gated (HCN) If 'funny' channels in the SA node, slowing Phase 4 diastolic depolarization without altering contractility or QTc duration",
        },
        {
          id: "av-nodal-calcium-slow-channel",
          label: "Ivabradine inhibits L-type calcium channels selectively at the atrioventricular node, prolonging the PR interval while preserving left ventricular ejection fraction",
        },
        {
          id: "beta1-allosteric-inverse-agonism",
          label: "Ivabradine acts as an allosteric inverse agonist at myocardial beta-1 adrenergic receptors, diminishing intracellular cAMP generation in ventricular myocytes",
        },
        {
          id: "herg-ikr-ventricular-repolarization",
          label: "Ivabradine inhibits rapid delayed rectifier potassium channels (IKr), slowing heart rate by selectively prolonging the ventricular effective refractory period",
        },
      ],
      correct: "selective-hcn-if-blockade",
      answer: "Ivabradine enters the hyperpolarization-activated cyclic nucleotide-gated (HCN) channel pore from the intracellular side, selectively blocking the inward hyperpolarization-activated 'funny' current (If) expressed predominantly in sinoatrial (SA) node pacemaker cells. By reducing inward mixed sodium-potassium entry during diastole, ivabradine slows the slope of Phase 4 spontaneous diastolic depolarization, lengthening the time to reach threshold and decreasing sinus node firing rate in a use-dependent manner. Crucially, because HCN4 channels are largely restricted to pacemaker tissue, ivabradine exerts zero negative inotropic (contractility) or lusitropic (relaxation) effects, does not alter intracardiac conduction times or vascular tone, and does not block hERG/IKr potassium channels (preserving ventricular repolarization and QTc). ACC/AHA and ESC heart failure consensus guidelines recommend ivabradine for symptomatic HFrEF with sinus rhythm ≥70 bpm on maximally tolerated beta-blockers to reduce cardiovascular death and hospitalizations.",
      drugIds: ["ivabradine"],
    },
    {
      id: "clin-sildenafil-nitrate-cgmp-shock",
      lane: "clinical",
      kicker: "Cardiovascular Pharmacology & Hemodynamics",
      title: "PDE-5 Inhibition & Organic Nitrates Synergistic cGMP Shock",
      prompt: "A patient presenting to the emergency department with acute retrosternal chest pain receives sublingual nitroglycerin, precipitating profound diaphoresis, unmeasurable blood pressure, and refractory vasodilatory shock; the patient took sildenafil 4 hours prior.",
      ask: "What molecular signaling pathway accounts for this catastrophic, life-threatening hypotensive interaction?",
      choices: [
        {
          id: "synergistic-cgmp-accumulation-vasodilation",
          label: "Organic nitrates stimulate guanylyl cyclase to surge cGMP synthesis while sildenafil blocks PDE-5 degradation, producing synergistic cGMP accumulation, profound MLC dephosphorylation, and refractory vasodilation",
        },
        {
          id: "camp-pka-hyperstimulation-collapse",
          label: "Nitrates and sildenafil synergistically stimulate adenylyl cyclase, depleting vascular smooth muscle ATP stores via cyclic AMP-dependent protein kinase cascades",
        },
        {
          id: "alpha1-adrenergic-receptor-internalization",
          label: "Concomitant administration triggers rapid endocytosis and degradation of vascular alpha-1 adrenergic receptors, eliminating sympathetic vascular tone",
        },
        {
          id: "cyp3a4-suicide-inhibition-accumulation",
          label: "Nitroglycerin acts as a mechanism-based inhibitor of CYP3A4, provoking a 10-fold surge in sildenafil systemic bioavailability",
        },
      ],
      correct: "synergistic-cgmp-accumulation-vasodilation",
      answer: "Vascular smooth muscle tone is modulated by cyclic guanosine monophosphate (cGMP). Organic nitrates (nitroglycerin, isosorbide dinitrate/mononitrate) donate nitric oxide (NO), stimulating soluble guanylyl cyclase (sGC) to synthesize cGMP from GTP. cGMP activates protein kinase G (PKG), promoting intracellular calcium reuptake and activating myosin light-chain (MLC) phosphatase, relaxing vascular smooth muscle. Phosphodiesterase type 5 (PDE-5) is the primary physiological enzyme responsible for hydrolyzing cGMP to inactive 5'-GMP. Sildenafil, tadalafil, and vardenafil potently inhibit PDE-5. When an organic nitrate is administered to a patient with PDE-5 inhibition, unregulated cGMP production combines with blocked degradation, sparking massive, synergistic intracellular cGMP accumulation. This leads to profound, unrelenting arteriolar and venous vasodilation, collapse of preload and systemic vascular resistance, severe coronary hypoperfusion, and refractory shock unresponsive to conventional fluid resuscitation. ACC/AHA consensus guidelines and FDA labeling strictly contraindicate organic nitrates within 24 hours of sildenafil (and 48 hours of tadalafil).",
      drugIds: ["sildenafil", "nitroglycerin"],
    },
    {
      id: "clin-sacubitril-neprilysin-angioedema",
      lane: "clinical",
      kicker: "Cardiorenal Pharmacology & Peptidase Safety",
      title: "Sacubitril Neprilysin Inhibition & ACE Inhibitor Angioedema Contraindication",
      prompt: "When switching a heart failure patient from an angiotensin-converting enzyme (ACE) inhibitor like lisinopril to sacubitril/valsartan (ARNI), clinical guidelines mandate a strict 36-hour washout period.",
      ask: "What dual enzymatic clearance mechanism explains why combining an ACE inhibitor with a neprilysin inhibitor triggers a severe risk of life-threatening angioedema?",
      choices: [
        {
          id: "dual-bradykinin-degradation-blockade",
          label: "Neprilysin and ACE are both primary enzymes responsible for metabolizing bradykinin; concurrent inhibition shuts down both clearance routes, driving extreme bradykinin accumulation and angioedema",
        },
        {
          id: "substance-p-depletion-mast-cell-degranulation",
          label: "Dual inhibition causes complete depletion of substance P and neurokinin A, triggering compensatory mast cell histamine degranulation",
        },
        {
          id: "aldosterone-hypersecretion-laryngeal-edema",
          label: "Dual inhibition stimulates adrenal glomerulosa mineralocorticoid synthesis, inducing acute severe volume overload and laryngeal edema",
        },
        {
          id: "cyp2c9-metabolic-knockout-acei",
          label: "Sacubitrilat potently inhibits CYP2C9 and CYP3A4, preventing hepatic oxidative breakdown of circulating ACE inhibitors",
        },
      ],
      correct: "dual-bradykinin-degradation-blockade",
      answer: "Neprilysin (neutral endopeptidase / NEP 24.11) is an endothelial and renal cell-surface metallopeptidase that degrades various biologically active vasoactive peptides, including natriuretic peptides (ANP, BNP, CNP), adrenomedullin, and bradykinin. Angiotensin-converting enzyme (ACE, also known as kininase II) is the predominant enzyme that inactivates circulating bradykinin into inactive peptide fragments. Because ACE and neprilysin serve as parallel, complementary degradation pathways for bradykinin, co-administering an ACE inhibitor and a neprilysin inhibitor (sacubitril) shuts off both major catabolic routes simultaneously. The resulting massive accumulation of bradykinin stimulates endothelial B2 receptors, provoking intense nitric oxide and prostacyclin release, microvascular hyperpermeability, and life-threatening angioedema (particularly fatal laryngeal edema). In contrast, angiotensin receptor blockers (ARBs) do not inhibit kininase II, which is why sacubitril is safely combined with valsartan rather than an ACE inhibitor. ACC/AHA and ESC guidelines mandate a mandatory 36-hour washout period when transitioning from an ACE inhibitor to ARNI (or vice versa).",
      drugIds: ["sacubitril", "lisinopril"],
    },
    {
      id: "clin-sglt2-tubuloglomerular-feedback",
      lane: "clinical",
      kicker: "Renal Physiology & Hemodynamics",
      title: "SGLT2 Inhibition and Tubuloglomerular Feedback (TGF) Restoration",
      prompt: "In diabetic kidney disease, proximal solute hyper-reabsorption impairs distal signaling and causes progressive renal decline. Initiation of an SGLT2 inhibitor induces an initial reversible eGFR dip followed by long-term renal preservation.",
      ask: "What microvascular hemodynamic mechanism mediated by tubuloglomerular feedback (TGF) accounts for this nephroprotective profile?",
      choices: [
        {
          id: "macula-densa-solute-afferent-constriction",
          label: "SGLT2 inhibition increases sodium and chloride delivery to the macula densa, restoring tubuloglomerular feedback and inducing adenosine-mediated afferent arteriolar constriction to reduce intraglomerular hypertension",
        },
        {
          id: "efferent-arteriolar-vasoconstriction",
          label: "SGLT2 inhibitors selectively constrict postglomerular efferent arterioles via local endothelin release, boosting glomerular filtration pressure",
        },
        {
          id: "podocyte-nhe1-stabilization",
          label: "SGLT2 inhibitors block podocyte NHE1 antiporters, directly reducing filtration barrier permeability to albumin without altering arteriolar resistance",
        },
        {
          id: "medullary-collecting-duct-compression",
          label: "Increased osmotic drag in the medullary collecting duct mechanically compresses peritubular capillaries, lowering filtration fractions",
        },
      ],
      correct: "macula-densa-solute-afferent-constriction",
      answer: "In early diabetes mellitus, proximal tubular glucose and sodium hyper-reabsorption via upregulated sodium-glucose cotransporter 2 (SGLT2) diminishes distal solute delivery. The macula densa senses low luminal sodium chloride delivery and shuts off tubuloglomerular feedback (TGF), triggering inappropriate afferent arteriolar vasodilation. Coupled with angiotensin II-mediated efferent arteriolar constriction, this creates marked intraglomerular hypertension and progressive diabetic nephropathy. SGLT2 inhibitors (empagliflozin, dapagliflozin, canagliflozin) block proximal glucose and sodium uptake, restoring solute delivery to the macula densa. Solute entry via the NKCC2 cotransporter stimulates basolateral ATP release and breakdown into adenosine, which activates vascular adenosine A1 receptors to constrict the dilated afferent arteriole. This restores normal TGF, reduces intraglomerular capillary hydrostatic pressure, and mitigates glomerular barotrauma. While this manifests as a benign 30% initial 'eGFR dip', KDIGO and ADA consensus guidelines emphasize that this hemodynamic unloading halts progressive nephron loss and preserves long-term renal function.",
      drugIds: ["empagliflozin", "dapagliflozin"],
    },
    {
      id: "clin-vmat2-vesicular-depletion",
      lane: "clinical",
      kicker: "Neuropharmacology & Movement Disorders",
      title: "VMAT2 Inhibition in Tardive Dyskinesia: Presynaptic Depletion vs D2 Blockade",
      prompt: "A patient maintained on chronic second-generation antipsychotic therapy develops involuntary choreoathetoid movements of the tongue and face consistent with tardive dyskinesia.",
      ask: "Why does vesicular monoamine transporter 2 (VMAT2) inhibition treat tardive dyskinesia without worsening postsynaptic D2 receptor hypersensitivity or provoking prominent parkinsonism?",
      choices: [
        {
          id: "vmat2-presynaptic-depletion-no-d2-block",
          label: "VMAT2 inhibitors selectively block presynaptic monoamine vesicular loading, depleting dopamine storage and synaptic release without blocking postsynaptic D2 receptors",
        },
        {
          id: "striatal-d2-partial-agonism",
          label: "VMAT2 inhibitors act as high-affinity partial agonists at striatal postsynaptic D2 receptors, displacing antipsychotic molecules",
        },
        {
          id: "tyrosine-hydroxylase-inactivation",
          label: "Valbenazine irreversibly inactivates tyrosine hydroxylase, halting total presynaptic catecholamine biosynthesis",
        },
        {
          id: "dat-carrier-reversal-efflux",
          label: "VMAT2 inhibitors invert dopamine active transporter (DAT) directionality, pumping cytosolic monoamines back into extracellular astrocytes",
        },
      ],
      correct: "vmat2-presynaptic-depletion-no-d2-block",
      answer: "Tardive dyskinesia (TD) is pathophysiologically linked to chronic antipsychotic-induced dopamine D2 receptor blockade, resulting in postsynaptic receptor upregulation and striatal supersensitivity. Vesicular monoamine transporter 2 (VMAT2) is an integral presynaptic membrane transporter responsible for packaging monoamines (dopamine, norepinephrine, serotonin) from the neuronal cytoplasm into synaptic vesicles for exocytotic release. Selective VMAT2 inhibitors (valbenazine, deutetrabenazine) reversibly inhibit VMAT2, preventing vesicular dopamine loading; unsequestered cytosolic dopamine is degraded by monoamine oxidase, depleting presynaptic dopamine stores and reducing synaptic exocytosis. Critically, unlike neuroleptics, VMAT2 inhibitors have negligible affinity for postsynaptic dopamine D2 receptors; they diminish involuntary hyperkinetic movements without exacerbating D2 receptor supersensitivity or producing the severe extrapyramidal parkinsonian rigidity characteristic of postjunctional D2 receptor antagonists. APA and AAN consensus guidelines recognize VMAT2 inhibitors as first-line evidence-based pharmacotherapy for tardive dyskinesia.",
      drugIds: ["valbenazine", "deutetrabenazine"],
    },
    {
      id: "clin-aspirin-platelet-covalent-acetylation",
      lane: "clinical",
      kicker: "Hematology & Bedside Antiplatelet Pharmacology",
      title: "Aspirin Covalent Serine 529 Acetylation & Anucleate Platelet Lifespan",
      prompt: "Prior to elective major surgery, low-dose aspirin is discontinued 7 to 10 days in advance, whereas reversible NSAIDs (such as ibuprofen) require a much shorter withholding period of 1 to 2 days.",
      ask: "What distinct molecular mechanism explains why aspirin's antiplatelet action persists for the entire circulating lifespan of the platelet, unlike reversible NSAIDs?",
      choices: [
        {
          id: "irreversible-ser529-acetylation-anucleate",
          label: "Aspirin irreversibly acetylates Serine 529 in COX-1, permanently disabling thromboxane A2 synthesis in anucleate platelets that lack de novo protein synthesis machinery",
        },
        {
          id: "reversible-cox2-allosteric-inhibition",
          label: "Aspirin reversibly binds allosteric regulatory sites on endothelial COX-2, which clears slowly from systemic circulation over 10 days",
        },
        {
          id: "p2y12-receptor-covalent-crosslinking",
          label: "Aspirin permanently cross-links surface P2Y12 purinergic receptors, triggering irreversible platelet apoptosis in the spleen",
        },
        {
          id: "glycoprotein-iib-iiia-acylation",
          label: "Aspirin covalently acylates the RGD recognition sequence of glycoprotein IIb/IIIa integrins, preventing fibrinogen adherence",
        },
      ],
      correct: "irreversible-ser529-acetylation-anucleate",
      answer: "Aspirin (acetylsalicylic acid) acts through a unique chemical mechanism distinct from reversible NSAIDs: it covalently transfers its acetyl group to the hydroxyl group of Serine 529 situated within the catalytic channel of platelet cyclooxygenase-1 (COX-1). This irreversible covalent modification creates steric hindrance that permanently blocks arachidonic acid from accessing the catalytic pocket, abolishing conversion into prostaglandin H2 and its downstream product, thromboxane A2 (TXA2)—a potent inducer of platelet aggregation and vasoconstriction. Because mature circulating platelets are anucleate cytoplasmic fragments of megakaryocytes lacking cell nuclei and ribosomes, they cannot transcribe or translate new COX-1 enzymes. Consequently, platelet COX-1 remains irreversibly inactivated for the entire 7- to 10-day circulating lifespan of the platelet. Recovery of platelet hemostatic function requires generation of new platelets from bone marrow megakaryocytes (turnover rate ~10% per day). In contrast, traditional NSAIDs (ibuprofen, naproxen) bind competitively and reversibly, allowing platelet function to normalize as soon as systemic drug concentrations drop. ACC/AHA and ASA guidelines base perioperative antiplatelet timelines on this irreversible biology.",
      drugIds: ["aspirin"],
    },
    {
      id: "clin-phenytoin-michaelis-menten",
      lane: "clinical",
      kicker: "Pharmacokinetics & Nonlinear Elimination",
      title: "Phenytoin Michaelis-Menten Kinetics & CYP2C9/2C19 Saturation",
      prompt: "A patient with focal epilepsy maintained on phenytoin has a steady-state total serum concentration of 11 mcg/mL (therapeutic target 10–20 mcg/mL). Following a modest 10% dosage increase, repeat serum drug levels spike unexpectedly to 26 mcg/mL and the patient develops prominent horizontal nystagmus and cerebellar ataxia.",
      ask: "What pharmacokinetic property explains why a small dosage increase produces a disproportionate, exponential surge in phenytoin plasma concentrations?",
      choices: [
        {
          id: "michaelis-menten-enzyme-saturation",
          label: "Phenytoin clearance follows Michaelis-Menten nonlinear kinetics; hepatic CYP2C9 and CYP2C19 metabolizing enzymes become saturated near therapeutic concentrations (Km), causing elimination to shift from first-order to zero-order and plasma levels to rise exponentially",
        },
        {
          id: "first-order-linear-dose-proportionality",
          label: "Phenytoin exhibits linear first-order elimination where clearance remains constant regardless of plasma concentration, indicating rapid renal autoinduction",
        },
        {
          id: "p-glycoprotein-saturation-intestinal-efflux",
          label: "Intestinal P-glycoprotein efflux pumps saturate at higher doses, abruptly increasing gastrointestinal bioavailability by 300%",
        },
        {
          id: "albumin-displacement-metabolic-shutdown",
          label: "Phenytoin displaces endogenous bilirubin, which feedback-inhibits renal tubular secretion of the parent anticonvulsant",
        },
      ],
      correct: "michaelis-menten-enzyme-saturation",
      answer: "Phenytoin is cleared primarily by hepatic CYP2C9 (~90%) and CYP2C19 (~10%) via parahydroxylation. Unlike drugs governed by linear first-order kinetics (where clearance is constant and serum concentration increases in direct proportion to dose), phenytoin exhibits Michaelis-Menten capacity-limited (nonlinear) elimination. The Michaelis constant (Km, ~4–6 mcg/mL) represents the substrate concentration at half-maximal velocity (Vmax). Because typical therapeutic target concentrations (10–20 mcg/mL) far exceed Km, the hepatic metabolizing enzymes operate near or at saturation (approaching Vmax). Under these zero-order conditions, clearance rate is constant and independent of concentration; any small escalation in daily dosage saturates remaining enzymatic capacity, causing disproportionate, exponential surges in steady-state plasma concentrations and rapid onset of dose-dependent neurotoxicity (nystagmus, cerebellar ataxia, lethargy). Clinical consensus guidelines and therapeutic drug monitoring literature emphasize using Michaelis-Menten dosing equations and conservative, stepwise dosage titrations rather than linear scaling.",
      drugIds: ["phenytoin"],
    },
    {
      id: "clin-vd-dialysis-clearance",
      lane: "clinical",
      kicker: "Extracorporeal Elimination & Toxicology",
      title: "Volume of Distribution (Vd) and Dialytic Ineffectiveness in Poisoning",
      prompt: "A patient presents with severe toxicity following an intentional ingestion of digoxin and a tricyclic antidepressant (amitriptyline). Despite both drugs possessing relatively modest molecular weights (<800 Da), emergent intermittent hemodialysis removes less than 2% to 3% of total body drug burden.",
      ask: "Why does intermittent hemodialysis fail to effectively remove drugs like digoxin, tricyclic antidepressants, and amiodarone despite filter permeability to small molecules?",
      choices: [
        {
          id: "high-vd-tissue-sequestration",
          label: "These drugs have an enormous apparent volume of distribution (Vd > 3–5 L/kg) due to extensive peripheral tissue binding, leaving less than 1% to 5% of total body drug accessible in the circulating vascular compartment for dialytic removal",
        },
        {
          id: "glomerular-filtration-dependent-dialysis",
          label: "Extracorporeal dialysis filters only clear substances that are active substrates for proximal tubular organic cation transporters",
        },
        {
          id: "plasma-esterase-rapid-degradation",
          label: "Circulating dialysate fluid activates plasma carboxylesterases that instantaneously convert both agents into inert dialyzer membrane-fouling polymers",
        },
        {
          id: "charge-exclusion-cellulose-membrane",
          label: "High lipophilicity induces electrostatic repulsion across standard synthetic polyflux hemodialysis membranes regardless of concentration gradients",
        },
      ],
      correct: "high-vd-tissue-sequestration",
      answer: "Extracorporeal drug clearance via intermittent hemodialysis (HD) or hemoperfusion requires that the offending toxicant be present in the vascular compartment in sufficient quantity to be cleared across the semipermeable dialyzer membrane. Key determinants of dialyzability include molecular weight (<500 Da favored), plasma protein binding (<80% favored), water solubility, and apparent volume of distribution (Vd). Digoxin (Vd ~5–7 L/kg), tricyclic antidepressants such as amitriptyline (Vd >10–40 L/kg), and amiodarone (Vd >60 L/kg) sequester heavily into myocardial, adipose, and peripheral tissue depots, leaving less than 1% to 3% of the total body drug burden in circulating plasma. Even if a dialyzer achieves 100% extraction efficiency of the arterial blood entering the cartridge, total clearance as a fraction of body burden is negligible (<2% to 5%). Extracorporeal Treatments in Poisoning (EXTRIP) workgroup consensus guidelines emphasize that high Vd (>1–2 L/kg) is a primary contraindication to relying on hemodialysis for enhanced elimination.",
      drugIds: ["digoxin", "amitriptyline", "amiodarone"],
    },
    {
      id: "clin-steroid-nuclear-receptor-transactivation",
      lane: "clinical",
      kicker: "Molecular Pharmacology & Gene Regulation",
      title: "Glucocorticoid Receptor Transactivation vs Transrepression",
      prompt: "Synthetic glucocorticoids like dexamethasone and prednisone exert profound, multi-organ anti-inflammatory effects that require hours to develop rather than minutes.",
      ask: "What intracellular molecular sequence describes how glucocorticoid receptors modulate gene expression and suppress pro-inflammatory cytokine production?",
      choices: [
        {
          id: "hsp90-dissociation-nuclear-transrepression",
          label: "Ligand binding causes cytosolic glucocorticoid receptor dissociation from chaperone heat shock proteins (Hsp90), homodimerization, nuclear translocation, binding to glucocorticoid response elements (GREs), and transrepression of NF-κB and AP-1 to suppress pro-inflammatory transcription",
        },
        {
          id: "membrane-g-protein-adenylyl-cyclase-activation",
          label: "Glucocorticoids bind surface GPCRs to stimulate adenylyl cyclase and protein kinase A, which directly phosphorylates and inactivates extracellular cytokines",
        },
        {
          id: "ribosomal-mrna-cleavage-rnase-l",
          label: "Activated steroid receptors act as cytosolic endoribonucleases that selectively cleave mature interleukin mRNAs before ribosomal translation",
        },
        {
          id: "jak-stat-cross-phosphorylation-suppression",
          label: "Corticosteroids enter the cell membrane to covalently cross-link JAK1 and STAT3 kinases, preventing cytokine receptor signaling at the plasma membrane",
        },
      ],
      correct: "hsp90-dissociation-nuclear-transrepression",
      answer: "Glucocorticoids act via intracellular nuclear receptors. In the basal, unbound state, the monomeric glucocorticoid receptor (GR) resides in the cytoplasm stabilized within a multiprotein chaperone complex including heat shock protein 90 (Hsp90), Hsp70, and immunophilins. Lipophilic glucocorticoids (e.g., dexamethasone, prednisone) diffuse freely across the plasma membrane and bind the C-terminal ligand-binding domain of GR, inducing a conformational change that causes dissociation of Hsp90 and other chaperones. The ligand-GR complex undergoes hyperphosphorylation, homodimerizes, and translocates through nuclear pores into the nucleus via nuclear localization signals (NLS). Inside the nucleus, GR regulates gene transcription via two distinct mechanisms: 1) Transactivation: GR homodimers bind specific palindromic DNA sequences known as Glucocorticoid Response Elements (GREs) to upregulate anti-inflammatory proteins (e.g., IκBα, annexin A1/lipocortin-1, MKP-1). 2) Transrepression: GR monomers physically interact with and antagonize pro-inflammatory transcription factors, primarily Nuclear Factor kappa B (NF-κB) and Activator Protein-1 (AP-1), preventing them from driving transcription of cytokines (IL-1, IL-2, IL-6, TNF-alpha), chemokines, and inducible enzymes (COX-2, iNOS). Consensus pharmacology literature emphasizes this genomic mechanism explains the classic lag time (hours to days) between steroid administration and full clinical anti-inflammatory efficacy.",
      drugIds: ["dexamethasone", "prednisone"],
    },
    {
      id: "clin-aspirin-zero-order-salicylate",
      lane: "clinical",
      kicker: "Clinical Toxicology & Elimination Kinetics",
      title: "Salicylate Clearance Kinetics: Glycine Conjugation Saturation in Overdose",
      prompt: "At therapeutic antiplatelet and analgesic levels, aspirin has an elimination half-life of 2 to 4 hours. Following an acute salicylate overdose, the patient's serum salicylate elimination half-life dramatically extends to 20 to 30 hours, prolonging toxicity.",
      ask: "What metabolic bottleneck causes salicylate clearance to transition from first-order to zero-order elimination in overdose?",
      choices: [
        {
          id: "saturation-glycine-glucuronide-conjugation",
          label: "Hepatic glycine conjugation (forming salicyluric acid) and phenolic glucuronide conjugation pathways become saturated at therapeutic-to-toxic thresholds, shifting elimination from first-order to capacity-limited zero-order kinetics",
        },
        {
          id: "cyp3a4-irreversible-suicide-inactivation",
          label: "Salicylates act as mechanism-based suicide inhibitors of CYP3A4, halting all cytochrome P450 oxidation in the endoplasmic reticulum",
        },
        {
          id: "renal-sglt2-retrograde-trapping",
          label: "Salicylates saturate proximal tubular SGLT2 transporters, forcing active retrograde reabsorption into peritubular capillaries",
        },
        {
          id: "enterohepatic-esterase-depletion",
          label: "Pancreatic and biliary carboxylesterases are completely depleted within 2 hours, preventing systemic gastrointestinal transit",
        },
      ],
      correct: "saturation-glycine-glucuronide-conjugation",
      answer: "Aspirin (acetylsalicylic acid) is rapidly hydrolyzed in the gut, plasma, and liver by tissue esterases to salicylic acid (salicylate). In low therapeutic dosing, salicylate is eliminated predominantly via hepatic metabolism into two saturable pathways: conjugation with glycine to form salicyluric acid (accounting for ~75% of clearance) and conjugation with glucuronic acid to form salicyl phenolic and acyl glucuronides (~15%). Minor routes include oxidation to gentisic acid (<1%) and renal excretion of unchanged salicylic acid (~10%). The hepatic glycine conjugation pathway has a low capacity and saturates at serum salicylate levels of approximately 15–20 mg/dL. In overdose, both glycine conjugation and glucuronidation pathways rapidly saturate, shifting elimination kinetics from linear first-order (where a constant fraction of drug is cleared per unit time and half-life is 2–4 hours) to capacity-limited zero-order kinetics (where a constant absolute amount is cleared per unit time and apparent half-life extends to 15–30+ hours). As metabolic pathways saturate, the fraction of salicylate dependent on renal excretion expands from 10% to >50% to 80%. Because salicylic acid is a weak acid (pKa 3.0), consensus toxicology guidelines highlight that alkalinizing the urine (raising urine pH to 7.5–8.0 with sodium bicarbonate) ionizes salicylate into lipid-insoluble salicylate anions, blocking renal tubular reabsorption and vastly accelerating renal clearance.",
      drugIds: ["aspirin"],
    },
    {
      id: "clin-anticholinergic-hyperthermia",
      lane: "clinical",
      kicker: "Autonomic Toxicology & Thermoregulation",
      title: "Anticholinergic Toxindrome: Muscarinic M3 Blockade & Impaired Heat Dissipation",
      prompt: "A patient with acute diphenhydramine and atropine ingestion presents on a warm day with extreme hyperthermia (temperature 40.8°C / 105.4°F), flushed dry skin, delirium, dilated unreactive pupils, and sinus tachycardia. The resuscitation team notes an absolute absence of axillary and groin perspiration.",
      ask: "What receptor-level mechanism drives severe life-threatening hyperthermia in acute anticholinergic toxicity?",
      choices: [
        {
          id: "m3-anhidrosis-central-thermoregulatory-block",
          label: "Antagonism of peripheral postganglionic muscarinic M3 receptors on eccrine sweat glands halts diaphoresis (anhidrosis), abolishing evaporative cooling while central muscarinic blockade disrupts hypothalamic thermoregulatory setpoints",
        },
        {
          id: "ryanodine-receptor-sarcoplasmic-calcium-dump",
          label: "Direct allosteric activation of skeletal muscle ryanodine (RyR1) receptors triggers continuous calcium efflux and intense uncoupled hypermetabolism",
        },
        {
          id: "brown-adipose-ucp1-uncoupling",
          label: "Massive sympathetic beta-3 adrenergic stimulation uncouples brown adipose mitochondrial respiration via UCP-1 activation",
        },
        {
          id: "alpha-1-cutaneous-vasodilation-heat-conservation",
          label: "Alpha-1 adrenergic blockade provokes paradoxical cutaneous vasoconstriction, trapping core arterial blood in skeletal muscle",
        },
      ],
      correct: "m3-anhidrosis-central-thermoregulatory-block",
      answer: "Eccrine sweat glands are innervated by sympathetic cholinergic postganglionic fibers releasing acetylcholine onto muscarinic M3 receptors. In humans, evaporative heat loss via sweat vaporization is the primary autonomic mechanism for dissipating substantial heat loads. Anticholinergic agents (e.g., diphenhydramine, atropine, scopolamine, belladonna alkaloids) competitively antagonize muscarinic M3 receptors on eccrine glands, completely shutting down sweat production (anhidrosis, 'dry as a bone'). Simultaneously, central antimuscarinic activity impairs preoptic anterior hypothalamic thermoregulation. When coupled with agitation, delirium, motor restlessness, and warm ambient temperatures, metabolic heat generation rapidly outstrips impaired heat dissipation. Core body temperature can surge to dangerous levels (>40°C / 104°F, 'hot as a hare'), precipitating heat stroke, rhabdomyolysis, disseminated intravascular coagulation (DIC), and multiorgan failure. Consensus toxicology management underscores immediate active external cooling (evaporative and convective mist and fan methods) as the cornerstone of therapy, alongside cautious sedation to reduce muscular work.",
      drugIds: ["atropine", "diphenhydramine"],
    },
    {
      id: "clin-gaba-a-subtypes-sedation-anxiolysis",
      lane: "clinical",
      kicker: "Neuropharmacology & Subunit Selectivity",
      title: "GABA-A Receptor Alpha Subunits: Sedation vs Anxiolysis Profiles",
      prompt: "A clinical team compares the therapeutic profiles of non-benzodiazepine Z-drugs (such as zolpidem) with classical benzodiazepines (such as diazepam and lorazepam) across sleep architecture and anxiety indications.",
      ask: "Which GABA-A receptor alpha subunit configuration distinguishes the sedative-hypnotic selectivity of zolpidem from the broad anxiolytic and myorelaxant actions of classical benzodiazepines?",
      choices: [
        {
          id: "alpha-1-sedation-vs-alpha-2-3-anxiolysis",
          label: "Alpha-1 subunit-containing GABA-A receptors mediate sedation, anterograde amnesia, and ataxia (preferentially targeted by zolpidem), whereas alpha-2 and alpha-3 subunits mediate anxiolysis and muscle relaxation, and alpha-5 mediates cognition",
        },
        {
          id: "alpha-5-anxiolysis-alpha-1-analgesia",
          label: "Alpha-5 subunits selectively mediate anxiolytic relief and visceral analgesia, whereas alpha-1 subunits control spinal motor reflexes and cardiac rhythm",
        },
        {
          id: "alpha-3-sedation-alpha-4-respiratory-drive",
          label: "Alpha-3 subunits are localized exclusively to the reticular activating system for hypnotic induction, while alpha-4 subunits protect against central respiratory depression",
        },
        {
          id: "beta-2-sedation-gamma-2-seizure-control",
          label: "Differences in binding depend entirely on beta-2 vs gamma-2 subunit interfaces, with alpha subunits playing no role in drug selectivity",
        },
      ],
      correct: "alpha-1-sedation-vs-alpha-2-3-anxiolysis",
      answer: "The GABA-A receptor is a pentameric ligand-gated chloride channel typically assembled from two alpha, two beta, and one gamma subunit (most commonly α1β2γ2). The benzodiazepine allosteric binding pocket is located at the interface between the alpha and gamma-2 subunits. Classical benzodiazepines (e.g., diazepam, lorazepam) bind non-selectively to GABA-A receptors containing α1, α2, α3, or α5 subunits with comparable nanomolar affinity, eliciting a wide pharmacological spectrum: sedation and hypnosis (α1), anxiolysis (α2, α3), muscle relaxation (α2, α3), anticonvulsant activity (α1), and cognitive/memory impairment (α1, α5). In contrast, the imidazopyridine Z-drug zolpidem displays preferential high-affinity selectivity for α1-containing GABA-A receptors over α2, α3, and α5 subtypes. This explains why zolpidem acts predominantly as a sedative-hypnotic agent with rapid onset and minimal native anxiolytic or muscle relaxant activity at therapeutic doses. Neuropharmacology consensus literature confirms that α1 knockout models lose benzodiazepine sedative response while preserving anxiolytic actions mediated by α2/α3.",
      drugIds: ["zolpidem", "diazepam", "lorazepam"],
    },
    {
      id: "clin-amiodarone-thyroid-mechanisms",
      lane: "clinical",
      kicker: "Cardiology & Endocrine Safety",
      title: "Amiodarone Structural Iodine, Deiodinase Blockade & AIT-1 vs AIT-2",
      prompt: "Amiodarone is an efficacious class III antiarrhythmic agent whose chronic administration requires rigorous baseline and longitudinal thyroid function monitoring.",
      ask: "What chemical feature and enzymatic effects explain amiodarone-induced thyroid dysfunction, and what distinguishes Type 1 from Type 2 amiodarone-induced thyrotoxicosis (AIT)?",
      choices: [
        {
          id: "iodine-deiodinase-inhibition-ait1-vs-ait2",
          label: "Amiodarone is 37% iodine by weight (releasing ~3 mg free iodide per 100 mg dose) and inhibits peripheral 5'-deiodinase (blocking T4 to T3 conversion); AIT-1 is iodine-induced hyperthyroidism in underlying disease (Jod-Basedow) treated with thionamides, while AIT-2 is drug-induced destructive thyroiditis treated with glucocorticoids",
        },
        {
          id: "sulfur-moiety-tsh-receptor-agonism",
          label: "Amiodarone's central sulfonamide group directly binds and stimulates thyroid-stimulating hormone (TSH) receptors, mimicking Grave's disease in all patients",
        },
        {
          id: "peroxidase-irreversible-covalent-inactivation",
          label: "Amiodarone permanently poisons thyroid peroxidase, universally precipitating permanent myxedema coma within 90 days",
        },
        {
          id: "direct-thyroglobulin-cleavage-hypercalcemia",
          label: "Amiodarone acts as a zinc metalloprotease that cleaves colloid thyroglobulin, generating severe hypercalcemia and medullary thyroid carcinoma",
        },
      ],
      correct: "iodine-deiodinase-inhibition-ait1-vs-ait2",
      answer: "Amiodarone is a benzofuran derivative structurally related to thyroxine (T4) containing two iodine atoms per molecule, comprising ~37.3% iodine by molecular weight. Metabolism of a standard 200 mg maintenance dose releases approximately 6 to 9 mg of inorganic free iodide daily (about 3 mg free iodine per 100 mg dose)—roughly 40 to 60 times the recommended daily dietary iodine intake (~150 mcg). Amiodarone and its active metabolite desethylamiodarone competitively inhibit type 1 and type 2 5'-deiodinases, blocking conversion of T4 to active T3 in peripheral tissues and the pituitary. This commonly causes an acute, benign shift in thyroid panels: elevated free T4, decreased free T3, and elevated reverse T3 (rT3). Beyond this, amiodarone induces overt thyroid disease: hypothyroidism (via failure to escape the Wolff-Chaikoff effect) in ~5% to 15% of patients, and thyrotoxicosis in ~3% to 5%. Amiodarone-induced thyrotoxicosis (AIT) manifests as two distinct pathophysiological entities: Type 1 AIT (AIT-1) is true iodine-induced hyperthyroidism (Jod-Basedow phenomenon) occurring in patients with pre-existing latent Graves' disease or nodular goiter; vascularity is normal or increased on Doppler, and therapy centers on thionamides (methimazole) and potassium perchlorate. Type 2 AIT (AIT-2) is a drug-induced destructive thyroiditis occurring in normal thyroid glands due to direct cytotoxic effects of amiodarone on follicular cells, releasing preformed hormones; Doppler demonstrates absent vascularity, and first-line treatment is oral glucocorticoids (prednisone). Consensus endocrine guidelines (ATA/ETA) emphasize that distinguishing AIT-1 from AIT-2 via thyroid Doppler ultrasound is essential because therapeutic approaches are fundamentally divergent.",
      drugIds: ["amiodarone"],
    },
    {
      id: "clin-sglt2-ketogenesis-glucagon",
      lane: "clinical",
      kicker: "Endocrinology & Metabolic Cascades",
      title: "SGLT2 Inhibitor Euglycemic DKA: Glucagon-to-Insulin Shift & CPT-1 Ketogenesis",
      prompt: "A patient with type 2 diabetes managed on empagliflozin develops tachypnea, nausea, abdominal pain, and an anion gap metabolic acidosis (anion gap 22 mEq/L, serum beta-hydroxybutyrate 5.8 mmol/L). Unexpectedly, point-of-care blood glucose is only 158 mg/dL.",
      ask: "What hormonal and metabolic cascade triggered by SGLT2 inhibition explains the pathogenesis of euglycemic diabetic ketoacidosis (euDKA)?",
      choices: [
        {
          id: "glucosuria-insulin-drop-glucagon-cpt1",
          label: "Renal glucosuria lowers plasma glucose, prompting reduced endogenous insulin secretion and increased pancreatic alpha-cell glucagon release; this elevated glucagon-to-insulin ratio stimulates lipolysis and activates hepatic carnitine palmitoyltransferase-1 (CPT-1), accelerating ketone synthesis despite near-normal glucose",
        },
        {
          id: "direct-beta-hydroxybutyrate-transporter-blockade",
          label: "SGLT2 inhibitors directly block proximal tubular ketone clearance transporters (MCT1), causing passive trapping of circulating ketones without altering hepatic lipolysis",
        },
        {
          id: "mitochondrial-complex-iv-poisoning",
          label: "Empagliflozin irreversibly inhibits mitochondrial complex IV in hepatocytes, forcing total reliance on anaerobic ketone fermentative pathways",
        },
        {
          id: "adrenal-epinephrine-hypersecretion",
          label: "SGLT2 inhibition induces severe renal cortical ischemia that triggers continuous massive adrenal epinephrine surges, overwhelming peripheral insulin receptors",
        },
      ],
      correct: "glucosuria-insulin-drop-glucagon-cpt1",
      answer: "Sodium-glucose cotransporter 2 (SGLT2) inhibitors (empagliflozin, dapagliflozin, canagliflozin) promote sustained urinary excretion of glucose by blocking reabsorption in the early proximal renal tubule. This continual glucosuria lowers plasma glucose and decreases daily caloric availability, triggering a physiological reduction in pancreatic beta-cell insulin secretion. Concurrently, removal of paracrine insulin inhibition alongside direct effects on pancreatic alpha-cells stimulates glucagon secretion, markedly elevating the circulating glucagon-to-insulin ratio. This altered hormonal balance exerts powerful metabolic downstream effects: 1) Enhanced peripheral lipolysis in adipose tissue releases free fatty acids (FFAs) into circulation; 2) In the liver, the high glucagon-to-insulin ratio suppresses malonyl-CoA synthesis, which relieves allosteric inhibition of carnitine palmitoyltransferase-1 (CPT-1); 3) CPT-1 rapidly transports fatty acyl-CoA into mitochondrial matrices for beta-oxidation, fueling extensive hepatic synthesis of acetoacetate and beta-hydroxybutyrate. Crucially, because the kidney continues to dump glucose into the urine, systemic blood glucose remains normal or only mildly elevated (<200–250 mg/dL), masking the underlying ketoacidotic crisis ('euglycemic' DKA). ADA, AACE, and FDA safety communications emphasize that diagnosis requires measuring serum beta-hydroxybutyrate and blood gas/anion gap, as normal point-of-care fingerstick glucose frequently leads to delays in recognition and intervention.",
      drugIds: ["empagliflozin", "dapagliflozin"],
    },
    {
      id: "clin-loperamide-pgp-bbb-penetration",
      lane: "clinical",
      kicker: "Transporter Kinetics & Toxicology",
      title: "Loperamide BBB Exclusion & P-Glycoprotein Efflux Bypass",
      prompt: "Loperamide is an over-the-counter antidiarrheal that acts as a potent mu-opioid receptor agonist yet produces negligible central opioid euphoria or respiratory depression at standard therapeutic doses.",
      ask: "What physiological transporter mechanism restricts loperamide to the intestinal periphery, and how do inhibitors like quinidine or verapamil provoke life-threatening central opioid toxicity?",
      choices: [
        {
          id: "pgp-efflux-bbb-exclusion",
          label: "Loperamide is a high-affinity substrate for P-glycoprotein (ABCB1) efflux pumps at the blood-brain barrier that actively extrude it into capillary lumens; potent P-gp inhibition by quinidine or verapamil allows central penetration, causing respiratory depression and euphoria",
        },
        {
          id: "rapid-first-pass-sulfation",
          label: "Loperamide undergoes 99% immediate first-pass hepatic sulfoconjugation that inactivates all mu-opioid binding before reaching the brain",
        },
        {
          id: "quaternary-amine-polar-exclusion",
          label: "Loperamide carries a permanent quaternary ammonium charge that physically prevents any lipid bilayer crossing regardless of transporter activity",
        },
        {
          id: "direct-cns-mu-downregulation",
          label: "Central mu-opioid receptors are allosterically insensitive to loperamide due to constitutive phosphorylation by beta-arrestin-2",
        },
      ],
      correct: "pgp-efflux-bbb-exclusion",
      answer: "Loperamide is a lipophilic, potent mu-opioid receptor agonist with peripheral antidiarrheal efficacy mediated through myenteric plexus opiate receptors. Despite high intrinsic potency, it displays minimal central opioid effects at normal doses because it is an avid substrate for the ATP-binding cassette transporter P-glycoprotein (P-gp, encoded by ABCB1 / MDR1) located on the apical luminal membrane of brain capillary endothelial cells. P-gp actively pumps loperamide out of endothelial cells back into the bloodstream, creating a steep blood-brain barrier efflux gradient that maintains central concentrations near zero. When co-administered with potent P-gp inhibitors (e.g., quinidine, verapamil, ketoconazole) or ingested in massive supratherapeutic doses that saturate P-gp capacity, loperamide crosses the blood-brain barrier freely. This precipitates severe central mu-opioid toxicity: profound respiratory depression, central nervous system depression, and euphoria. Additionally, supratherapeutic concentrations block hERG cardiac potassium channels and cardiac voltage-gated sodium channels, causing QTc prolongation, torsades de pointes, and fatal ventricular dysrhythmias. Consensus toxicology and FDA drug safety communications emphasize that loperamide abuse or P-gp co-inhibition constitutes a dual neurorespiratory and arrhythmogenic emergency requiring prompt airway support, naloxone titration, and continuous cardiac monitoring.",
      drugIds: ["loperamide", "verapamil", "quinidine"],
    },
    {
      id: "clin-statin-oatp1b1-rhabdomyolysis",
      lane: "clinical",
      kicker: "Hepatic Transporters & Myotoxicity",
      title: "Statin Sinusoidal Influx via OATP1B1 & Transporter-Mediated Rhabdomyolysis",
      prompt: "HMG-CoA reductase inhibitors (statins) rely on active transport into hepatocytes to exert their cholesterol-lowering actions and undergo hepatic clearance.",
      ask: "Which hepatic sinusoidal uptake transporter is responsible for the hepatic extraction of atorvastatin and rosuvastatin, and why does its inhibition by cyclosporine or gemfibrozil precipitate severe rhabdomyolysis?",
      choices: [
        {
          id: "oatp1b1-sinusoidal-uptake-inhibition",
          label: "OATP1B1 (SLCO1B1) mediates sinusoidal influx into hepatocytes for hepatic clearance; potent inhibition by cyclosporine or gemfibrozil prevents hepatic extraction, causing massive systemic plasma exposure spikes that trigger skeletal muscle myopathy and rhabdomyolysis",
        },
        {
          id: "oct1-renal-tubular-blockade",
          label: "OCT1 mediates renal tubular secretion of statins; its inhibition prevents urinary clearance, driving systemic accumulation and myoglobinuria",
        },
        {
          id: "bcrp-canalicular-efflux-blockade",
          label: "BCRP canalicular efflux pumps statins into bile; its blockade traps active drug in bile ducts, causing secondary hepatic necrosis without muscle toxicity",
        },
        {
          id: "cyp2d6-prodrug-hyperactivation",
          label: "Cyclosporine hyperactivates CYP2D6 conversion of statins to active toxic lactone metabolites in plasma",
        },
      ],
      correct: "oatp1b1-sinusoidal-uptake-inhibition",
      answer: "Statins (including atorvastatin, rosuvastatin, and pravastatin) are organic anions that require active transport across the basolateral (sinusoidal) membrane of hepatocytes to reach their intracellular therapeutic target (HMG-CoA reductase) and clearance pathways. The primary sinusoidal influx transporter responsible for this uptake is Organic Anion Transporting Polypeptide 1B1 (OATP1B1, encoded by SLCO1B1), alongside OATP1B3. Potent OATP1B1 inhibitors such as cyclosporine and gemfibrozil (specifically gemfibrozil 1-O-beta-glucuronide) strongly block this sinusoidal uptake. Because hepatic first-pass extraction is severely curtailed, statins cannot enter hepatocytes and instead remain in the systemic circulation, causing plasma area under the curve (AUC) exposure spikes of 5- to 10-fold or higher. These dramatically elevated systemic circulating statin concentrations penetrate skeletal muscle myocytes, disrupting intracellular prenylation pathways, depleting coenzyme Q10, and destabilizing sarcolemmal integrity. The clinical result is severe statin-associated myopathy, marked creatine kinase elevation, and life-threatening myoglobinuric rhabdomyolysis with acute kidney injury. Consensus guidelines (AHA/ACC and CPIC) emphasize recognizing OATP1B1 interactions and utilizing dose restrictions or non-interacting lipid-lowering alternatives.",
      drugIds: ["atorvastatin", "rosuvastatin", "cyclosporine", "gemfibrozil"],
    },
    {
      id: "clin-metformin-oct2-mate1-cimetidine",
      lane: "clinical",
      kicker: "Renal Cation Transporters & Acid-Base",
      title: "Metformin Renal Tubular Secretion via OCT2/MATE & Transporter Retention",
      prompt: "Metformin is eliminated almost exclusively by the kidneys unchanged via both glomerular filtration and active renal tubular secretion.",
      ask: "Which sequential basolateral and apical renal transport systems drive active metformin secretion, and what interaction mechanism with cimetidine or dolutegravir increases the risk of metformin-associated lactic acidosis (MALA)?",
      choices: [
        {
          id: "oct2-mate-competitive-blockade",
          label: "Metformin enters proximal tubular cells via basolateral OCT2 and exits into urine via apical MATE1/MATE2-K; cimetidine and dolutegravir competitively inhibit OCT2 and MATE transporters, impairing active secretion and causing systemic metformin retention",
        },
        {
          id: "oat1-oat3-anion-exchange-saturation",
          label: "Metformin relies on basolateral OAT1 and apical OAT3 anion exchangers; cimetidine stimulates OAT1 to deplete intracellular bicarbonate",
        },
        {
          id: "sglt2-cotransport-inhibition",
          label: "Metformin is co-transported with glucose via SGLT2; dolutegravir blocks SGLT2, provoking severe osmotic diuresis and lactic acidosis",
        },
        {
          id: "cyp2c9-metabolic-shunting",
          label: "Cimetidine inhibits hepatic CYP2C9 conversion of metformin to inactive metabolites, shunting parent drug to renal elimination",
        },
      ],
      correct: "oct2-mate-competitive-blockade",
      answer: "Metformin is a hydrophilic, positively charged organic cation at physiological pH with negligible plasma protein binding and zero hepatic metabolism; it is cleared >90% unchanged by the kidneys. Renal clearance exceeds glomerular filtration rate (GFR) by 3- to 4-fold, demonstrating robust active proximal tubular secretion. This transepithelial secretion occurs through a coordinated two-step transporter system: 1) Basolateral influx from peritubular capillaries into proximal tubular cells is mediated by Organic Cation Transporter 2 (OCT2, SLC22A2); 2) Apical efflux from tubular cells into the luminal urine is mediated by Multidrug and Toxin Extrusion proteins MATE1 (SLC47A1) and MATE2-K (SLC47A2). Cimetidine (an H2 antagonist) and dolutegravir (an HIV integrase inhibitor) are potent competitive inhibitors of renal OCT2 and MATE transporters. Co-administration competitively blocks tubular metformin secretion, reducing renal metformin clearance by 30% to 50% and precipitating significant plasma concentration increases. In patients with underlying renal impairment, dehydration, or acute illness, this transporter-mediated accumulation dramatically increases the risk of metformin-associated lactic acidosis (MALA) due to excessive inhibition of mitochondrial complex I and impaired hepatic gluconeogenesis. FDA labeling and consensus clinical pharmacology literature recommend vigilant renal surveillance, dose adjustment, or alternative therapy when initiating potent OCT2/MATE inhibitors.",
      drugIds: ["metformin", "cimetidine", "dolutegravir"],
    },
    {
      id: "clin-probenecid-oat1-oat3-penicillin",
      lane: "clinical",
      kicker: "Renal Anion Transporters & Drug Excretion",
      title: "Probenecid OAT1/OAT3 Inhibition: Beta-Lactam Sparing vs Methotrexate Toxicity",
      prompt: "Probenecid is a classic uricosuric agent historically developed during World War II to conserve scarce penicillin supplies.",
      ask: "What molecular transport mechanism explains probenecid's ability to extend penicillin concentrations, and why is this same interaction hazardous when combined with methotrexate?",
      choices: [
        {
          id: "oat1-oat3-competitive-tubular-blockade",
          label: "Probenecid competitively inhibits basolateral renal Organic Anion Transporters (OAT1 and OAT3), blocking active tubular secretion of anionic drugs to prolong beta-lactam half-life, but dangerously reducing methotrexate clearance and triggering severe bone marrow suppression and mucositis",
        },
        {
          id: "loop-of-henle-nkcc2-inhibition",
          label: "Probenecid blocks the luminal NKCC2 cotransporter in the thick ascending limb, inducing diuresis that washes penicillin into the systemic circulation",
        },
        {
          id: "albumin-binding-displacement-only",
          label: "Probenecid binds competitively to plasma alpha-1 acid glycoprotein, displacing penicillin and methotrexate without affecting renal transporter physiology",
        },
        {
          id: "cyp2c19-phase1-metabolism-inhibition",
          label: "Probenecid is a potent mechanism-based inactivator of hepatic CYP2C19, slowing hepatic cleavage of beta-lactams and antifolates",
        },
      ],
      correct: "oat1-oat3-competitive-tubular-blockade",
      answer: "Penicillins, cephalosporins, and methotrexate are hydrophilic organic anions eliminated predominantly by the kidney through glomerular filtration coupled with vigorous active proximal tubular secretion. Basolateral uptake from peritubular capillaries into renal proximal tubular epithelial cells is mediated by Organic Anion Transporters 1 and 3 (OAT1/SLC22A6 and OAT3/SLC22A8). Probenecid is a potent competitive inhibitor of renal OAT1 and OAT3. By occupying these basolateral transporters, probenecid blocks the entry of anionic drugs into proximal tubular cells, effectively shutting down active tubular secretion. For beta-lactams (e.g., penicillin G, ampicillin, cefazolin), this extends the elimination half-life, increases area under the curve (AUC), and maintains plasma concentrations above the minimum inhibitory concentration (MIC)—a deliberate therapeutic synergy used in neurosyphilis and pelvic inflammatory disease regimens. Conversely, when probenecid is co-administered with methotrexate (an OAT1/OAT3 substrate), the blockade of renal tubular elimination severely reduces total clearance of methotrexate, causing prolonged toxic systemic exposure. This leads to profound methotrexate accumulation, life-threatening myelosuppression, severe gastrointestinal mucositis, and acute kidney injury. Consensus pharmacology and oncology guidelines emphasize that probenecid is strictly contraindicated with intermediate- or high-dose methotrexate.",
      drugIds: ["probenecid", "penicillin-g", "methotrexate"],
    },
    {
      id: "clin-gq-phospholipase-c-ip3-dag",
      lane: "clinical",
      kicker: "GPCR Signaling & Autonomic Pharmacology",
      title: "The Gq Second Messenger Cascade: PLC-beta, IP3, DAG & Intracellular Calcium",
      prompt: "Multiple autonomic and neurotransmitter receptor families (histamine H1, alpha-1 adrenergic, muscarinic M1 and M3, and serotonin 5-HT2) share a common heterotrimeric G-protein coupling mechanism.",
      ask: "What intracellular biochemical cascade is activated upon stimulation of Gq-coupled receptors, and how does it drive smooth muscle contraction and glandular secretion?",
      choices: [
        {
          id: "plc-ip3-calcium-dag-pkc",
          label: "Gq alpha activates phospholipase C-beta (PLC-beta), hydrolyzing PIP2 into IP3 (which releases calcium from the endoplasmic/sarcoplasmic reticulum) and DAG (which activates protein kinase C), driving smooth muscle contraction and exocrine glandular secretion",
        },
        {
          id: "adenylyl-cyclase-camp-pka-inhibition",
          label: "Gq alpha directly stimulates adenylyl cyclase to increase cyclic AMP and activate protein kinase A, dephosphorylating myosin light chain kinase",
        },
        {
          id: "girk-potassium-channel-hyperpolarization",
          label: "Gq beta-gamma subunits directly open inwardly rectifying potassium (GIRK) channels, hyperpolarizing the cell membrane and terminating calcium influx",
        },
        {
          id: "guanylyl-cyclase-cgmp-pkg-activation",
          label: "Gq alpha activates soluble guanylyl cyclase, generating cGMP which stimulates protein kinase G to promote vascular smooth muscle relaxation",
        },
      ],
      correct: "plc-ip3-calcium-dag-pkc",
      answer: "Heterotrimeric Gq protein-coupled receptors (including histamine H1, alpha-1 adrenergic, muscarinic M1, M3, and M5, and serotonin 5-HT2A/2C) transduce extracellular signals via the Gq alpha subunit. Ligand binding prompts GTP-for-GDP exchange on Gq alpha, which dissociates from beta-gamma subunits and activates membrane-bound Phospholipase C-beta (PLC-beta). PLC-beta catalyzes the hydrolysis of membrane phospholipid phosphatidylinositol 4,5-bisphosphate (PIP2) into two crucial second messengers: 1) Inositol 1,4,5-trisphosphate (IP3), a water-soluble molecule that diffuses to the endoplasmic/sarcoplasmic reticulum to bind ligand-gated IP3 receptor channels, triggering rapid calcium release into the cytoplasm. In vascular smooth muscle, this surge in cytosolic calcium binds calmodulin to activate Myosin Light Chain Kinase (MLCK), phosphorylating myosin and driving contraction (vasoconstriction via alpha-1). In exocrine glands (sweat, lacrimal, salivary), elevated calcium stimulates exocytosis (secretion via M3); 2) Diacylglycerol (DAG), a lipophilic messenger that remains in the plasma membrane and, in synergy with calcium, recruits and activates Protein Kinase C (PKC), which phosphorylates targeted downstream structural and regulatory enzymes. Understanding this cascade clarifies why alpha-1 agonists (norepinephrine, phenylephrine) cause vasoconstriction, whereas alpha-1 antagonists (prazosin) promote vasodilation; and why antimuscarinics (atropine) shut down M3-mediated glandular secretions and bronchoconstriction.",
      drugIds: ["prazosin", "diphenhydramine", "atropine"],
    },
    {
      id: "clin-gs-adenylyl-cyclase-pka-beta",
      lane: "clinical",
      kicker: "Cardiovascular Pharmacology & Second Messengers",
      title: "The Gs Cascade: Adenylyl Cyclase, cAMP, PKA & Tissue-Specific Divergence",
      prompt: "Stimulation of Gs-coupled receptors (such as beta-1, beta-2, dopamine D1, and vasopressin V2) activates the adenylyl cyclase–cyclic AMP–protein kinase A pathway.",
      ask: "How does the same Gs-cAMP-PKA cascade produce positive inotropy and chronotropy in cardiac myocytes (beta-1) while simultaneously causing smooth muscle relaxation and vasodilation in bronchioles and vasculature (beta-2)?",
      choices: [
        {
          id: "cardiac-l-type-ca-vs-smooth-muscle-mlck-inhibition",
          label: "In cardiac myocytes, PKA phosphorylates L-type calcium channels and phospholamban to increase calcium influx and inotropy; in smooth muscle, PKA phosphorylates and inhibits Myosin Light Chain Kinase (MLCK), preventing contraction and causing vasodilation and bronchodilation",
        },
        {
          id: "ip3-receptor-translocation-in-heart-only",
          label: "Beta-1 receptors in myocytes couple directly to IP3 generation, whereas beta-2 receptors activate calcium-activated potassium channels without altering cAMP",
        },
        {
          id: "pka-selectively-stimulates-troponin-c-in-bronchi",
          label: "PKA directly degrades troponin C in vascular smooth muscle to block contraction, while activating troponin C in ventricular myocytes",
        },
        {
          id: "differential-girk-potassium-channel-gating",
          label: "The cardiac response is driven entirely by G-protein beta-gamma subunit gating of potassium channels, while smooth muscle ignores PKA",
        },
      ],
      correct: "cardiac-l-type-ca-vs-smooth-muscle-mlck-inhibition",
      answer: "Receptors coupled to the stimulatory G-protein Gs (beta-1, beta-2, beta-3, dopamine D1, histamine H2, vasopressin V2) activate adenylyl cyclase upon agonist binding. Adenylyl cyclase catalyzes the conversion of cytosolic ATP into cyclic adenosine monophosphate (cAMP). cAMP binds the regulatory subunits of Protein Kinase A (PKA), releasing active catalytic PKA subunits that phosphorylate cell-specific downstream targets, producing divergent physiological endpoints: 1) In cardiac myocytes (predominantly beta-1): PKA phosphorylates sarcolemmal L-type voltage-gated calcium channels (Cav1.2), increasing inward calcium current (trigger calcium); phosphorylates ryanodine receptors (RyR2), enhancing calcium-induced calcium release; and phosphorylates phospholamban, relieving its inhibition of SERCA2a to accelerate calcium re-uptake into the sarcoplasmic reticulum. These actions generate positive inotropy (contractility), positive chronotropy (heart rate via SA node If channels), and positive lusitropy (relaxation rate); 2) In vascular and bronchial smooth muscle (predominantly beta-2): PKA phosphorylates Myosin Light Chain Kinase (MLCK), markedly decreasing MLCK's affinity for the calcium-calmodulin complex. Consequently, myosin regulatory light chains cannot be phosphorylated, preventing actin-myosin cross-bridge cycling. Concurrently, PKA stimulates calcium extrusion and calcium-activated potassium channels (KCa), leading to membrane hyperpolarization. The macroscopic result is smooth muscle relaxation: bronchodilation (e.g., albuterol) and arteriolar vasodilation. Understanding this tissue-specific target phosphorylation explains why non-selective beta-blockers (propranolol) can induce bronchospasm while slowing heart rate, whereas cardioselective beta-1 blockers (metoprolol) spare airway MLCK.",
      drugIds: ["albuterol", "metoprolol", "epinephrine"],
    },
    {
      id: "clin-gi-girk-potassium-channel-opioid",
      lane: "clinical",
      kicker: "Neuropharmacology & Inhibitory Signaling",
      title: "The Gi Signaling Cascade: Adenylyl Cyclase Inhibition, GIRK Channels & Calcium Blockade",
      prompt: "Inhibitory G-protein-coupled receptors (including muscarinic M2, alpha-2 adrenergic, dopamine D2, and mu-opioid receptors) mediate potent central and autonomic inhibition.",
      ask: "What molecular dual mechanism triggered by Gi/o protein activation mediates cellular hyperpolarization and profound inhibition of neurotransmitter release?",
      choices: [
        {
          id: "gi-ac-inhibition-girk-open-voltage-ca-block",
          label: "The Gi alpha subunit inhibits adenylyl cyclase (lowering cAMP/PKA activity), while dissociated G-beta-gamma subunits directly open inwardly rectifying potassium (GIRK) channels to hyperpolarize membranes and close presynaptic voltage-gated N-type calcium channels to block neurotransmitter exocytosis",
        },
        {
          id: "direct-gaba-a-receptor-pore-opening",
          label: "Gi alpha directly binds the GABA-A receptor chloride pore, causing immediate massive chloride influx without involving G-beta-gamma subunits",
        },
        {
          id: "phospholipase-c-inhibition-and-pkc-degradation",
          label: "Gi directly degrades phospholipase C-beta, preventing basal IP3 formation and causing passive potassium leakage",
        },
        {
          id: "guanylyl-cyclase-activation-and-pkg-hyperpolarization",
          label: "Gi proteins activate soluble guanylyl cyclase, generating cyclic GMP that opens calcium-activated chloride channels to inhibit action potentials",
        },
      ],
      correct: "gi-ac-inhibition-girk-open-voltage-ca-block",
      answer: "Receptors coupled to the inhibitory G-protein family Gi/o (muscarinic M2/M4, alpha-2 adrenergic, dopamine D2/D3/D4, GABA-B, and mu/delta/kappa opioid receptors) elicit profound cellular inhibition through a dual signaling pathway mediated by both alpha and beta-gamma subunits: 1) The Gi alpha subunit directly binds and inhibits adenylyl cyclase, suppressing the synthesis of cyclic AMP (cAMP) and reducing Protein Kinase A (PKA) activity. This halts PKA-mediated phosphorylation of downstream ion channels and pro-exocytotic machinery; 2) Upon receptor activation and GDP-GTP exchange, dissociated G-protein beta-gamma (G-beta-gamma) dimers directly interact with two critical membrane ion channels: (a) They bind and open G-protein-coupled Inwardly Rectifying Potassium (GIRK / Kir3) channels, driving outward potassium flux that hyperpolarizes the neuronal resting membrane potential away from threshold, rendering the neuron resistant to action potential firing (e.g., central sedation and spinal analgesia from opioids and clonidine; SA nodal hyperpolarization and negative chronotropy from acetylcholine acting on M2); (b) They directly bind and inhibit presynaptic voltage-gated N-type and P/Q-type calcium channels (Cav2.2 and Cav2.1), blocking depolarization-induced calcium influx into presynaptic nerve terminals. Because vesicle exocytosis is strictly calcium-dependent, neurotransmitter release (substance P, glutamate, norepinephrine) is profoundly suppressed. This explains the potent clinical analgesic, sympatholytic, and sedative actions of mu-opioid agonists (morphine, fentanyl) and central alpha-2 agonists (clonidine, dexmedetomidine).",
      drugIds: ["morphine", "clonidine"],
    },
    {
      id: "clin-pde5-cgmp-smooth-muscle-relaxation",
      lane: "clinical",
      kicker: "Cardiovascular Pharmacology & Second Messengers",
      title: "PDE-5 Degradation of cGMP: Nitric Oxide Synergy & Vasodilatory Collapse",
      prompt: "Vascular smooth muscle tone is finely regulated by the nitric oxide (NO)–cyclic guanosine monophosphate (cGMP) signaling pathway.",
      ask: "How does phosphodiesterase-5 (PDE-5) normally regulate vascular cGMP levels, and why does combining a PDE-5 inhibitor (sildenafil) with an organic nitrate (nitroglycerin) trigger profound, refractory hypotension?",
      choices: [
        {
          id: "pde5-cgmp-breakdown-blockade-plus-sgc-stimulation",
          label: "PDE-5 specifically hydrolyzes cGMP to 5'-GMP; sildenafil blocks cGMP degradation while nitrates donate nitric oxide to stimulate soluble guanylyl cyclase (sGC) synthesis of cGMP, causing massive synergistic cGMP accumulation, PKG activation, myosin light chain dephosphorylation, and refractory vasodilatory shock",
        },
        {
          id: "competitive-inhibition-of-endothelin-eta-receptors",
          label: "Sildenafil and nitrates competitively block endothelin ETA receptors on vascular endothelium, preventing basal release of endothelin-1",
        },
        {
          id: "irreversible-covalent-alkylation-of-at1-receptors",
          label: "The drug combination forms a covalent adduct that irreversibly inactivates vascular angiotensin AT1 receptors, preventing sympathetic vasoconstriction",
        },
        {
          id: "direct-opening-of-l-type-calcium-channels",
          label: "Nitrates and sildenafil open L-type calcium channels in vascular smooth muscle, causing paradoxical intracellular calcium depletion and cell arrest",
        },
      ],
      correct: "pde5-cgmp-breakdown-blockade-plus-sgc-stimulation",
      answer: "In vascular smooth muscle, endogenous nitric oxide (NO) released by endothelial cells diffuses into adjacent vascular smooth muscle cells and binds the heme moiety of soluble Guanylyl Cyclase (sGC), stimulating the synthesis of cyclic Guanosine Monophosphate (cGMP) from GTP. Elevated cGMP activates Protein Kinase G (PKG), which initiates several concerted vasodilatory actions: PKG activates Myosin Light Chain Phosphatase (MLCP) to dephosphorylate myosin regulatory light chains, halts intracellular calcium release by inhibiting IP3 receptors, stimulates SERCA to sequester calcium, and activates large-conductance calcium-activated potassium (BKCa) channels to hyperpolarize the sarcolemma. Under normal physiological conditions, cGMP signaling is rapidly terminated by Phosphodiesterase type 5 (PDE-5), which selectively hydrolyzes active cGMP into inactive 5'-GMP. Sildenafil is a potent, selective competitive inhibitor of PDE-5 that prevents cGMP degradation. When sildenafil is combined with exogenous organic nitrates (e.g., nitroglycerin, isosorbide mononitrate/dinitrate), a catastrophic pharmacological synergy occurs: nitrates massively accelerate cGMP production via continuous sGC activation, while sildenafil completely blocks its metabolic destruction. Intracellular cGMP accumulates to supranormal levels, provoking unrestricted PKG activation, total dephosphorylation of myosin light chains, and profound, uncompensated systemic arterial and venous vasodilation. Systemic vascular resistance drops precipitously and venous return plummets, resulting in life-threatening hypotension and coronary hypoperfusion that is often refractory to standard crystalloid resuscitation. Consequently, consensus ACC/AHA guidelines and FDA labeling strictly contraindicate organic nitrates within 24 hours of sildenafil administration.",
      drugIds: ["sildenafil", "nitroglycerin"],
    },
  ];
  return cards.map((c) => ({
    ...c,
    topic: CLINICAL_TOPIC_MAP[c.id] ?? "tox",
  }));
}

export function pileOf(
  cards: StudyCard[],
  pile: StudyPile,
  marks: Record<string, StudyMark | undefined>,
): StudyCard[] {
  if (pile === "open") return cards.filter((c) => !marks[c.id]);
  if (pile === "miss") return cards.filter((c) => marks[c.id] === "miss");
  return cards;
}
