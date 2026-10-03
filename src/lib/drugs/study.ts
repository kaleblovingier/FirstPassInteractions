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

export type StudyLane = "drill" | "boards" | "desk" | "cyp";
export type StudyMark = "got" | "miss";
export type StudyPile = "all" | "open" | "miss";

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
}

export const STUDY_LANES: { id: StudyLane; label: string }[] = [
  { id: "drill", label: "Rounds" },
  { id: "boards", label: "Named pairs" },
  { id: "cyp", label: "Enzyme map" },
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
    pushRole(out, enzyme, "inhibitor", strongInh, 1);
    pushRole(out, enzyme, "inducer", strongInd, 1);
    pushRole(out, enzyme, "substrate", sensitive, 1);
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

  return out;
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

export function pileOf(
  cards: StudyCard[],
  pile: StudyPile,
  marks: Record<string, StudyMark | undefined>,
): StudyCard[] {
  if (pile === "open") return cards.filter((c) => !marks[c.id]);
  if (pile === "miss") return cards.filter((c) => marks[c.id] === "miss");
  return cards;
}
