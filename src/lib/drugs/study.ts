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
  | "addiction";

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

  // Neurology & Sedation
  "clin-acb-threshold": "neuro",
  "clin-phenytoin-sheiner-tozer": "neuro",
  "clin-clozapine-rems-anc": "neuro",
  "clin-pheno-infusion-rate-limit": "neuro",
  "clin-lithium-target-bands": "neuro",
  "clin-valproate-vhe-normal-lft-trap": "neuro",
  "clin-valproate-carbapenem-crash": "neuro",

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

  // Addiction Medicine & Harm Reduction
  "clin-bup-precip-pharmacology": "addiction",
  "clin-fentanyl-adipose-depot-kinetics": "addiction",
  "clin-naloxone-half-life-renarcotization": "addiction",
  "clin-methadone-cyp-qtc-safety": "addiction",
  "clin-naltrexone-washout-window": "addiction",
  "clin-xylazine-tranq-management": "addiction",
  "clin-alcohol-withdrawal-ciwa-gaba": "addiction",
  "clin-bup-micro-induction-bernese": "addiction",
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
      prompt: "A patient with suspected opioid overdose regains spontaneous breathing and alertness after 2 mg intranasal naloxone, but wishes to leave the emergency department immediately.",
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
        { id: "naltrexone-no-washout-needed", label: "No washout is necessary if starting with oral naltrexone 50 mg before the depot intramuscular injection" },
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
        { id: "xylazine-high-dose-naloxone", label: "Continuous high-dose naloxone infusion (10 mg/hr) competitively displaces xylazine from alpha-2 adrenergic receptors" },
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
      answer: "The Bernese method (Hälg 2016) utilizes overlapping low doses of buprenorphine (e.g. starting with 0.5 mg daily and titrating over 5–8 days) while continuing the patient's baseline full opioid agonist (fentanyl or methadone). Because buprenorphine binds with extremely high affinity and dissociates very slowly, sub-therapeutic micro-doses progressively saturate a fraction of receptors without displacing enough full agonist to provoke withdrawal symptoms. Once buprenorphine reaches therapeutic receptor occupancy (~8–16 mg daily), the full agonist is discontinued seamlessly without an acute withdrawal window.",
      drugIds: ["buprenorphine", "methadone", "fentanyl"],
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
