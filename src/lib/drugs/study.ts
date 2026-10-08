/**
 * Study cards for trainees.
 * Every answer is a restatement of this desk's map, a round, or an FDA grade already on the CYP tab.
 * Not an exam key. Not a milligram. Not a prescription.
 */

import { DRUGS, DRUG_BY_ID } from "./catalog";
import { FDA_GRADES, TDI } from "./cyp-protocol";
import { ROUNDS } from "./rounds";
import type { Drug, Enzyme, Finding } from "./types";
import { ENZYMES, SEVERITY_LABEL } from "./types";
import { safetyOnDesk } from "./safety";
import { WASHOUT_OFFSET, washoutOffsetKind } from "./washout-plain";

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

  return [...out, ...directionCards(), ...shelfCards()];
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
    {
      id: "cyp-arrow-moderate",
      kicker: "Direction",
      title: "Moderate inhibitor",
      prompt: "The row says moderate inhibitor. The fold is already stored.",
      ask: "What does FDA call a moderate inhibitor?",
      answer: `FDA calls a moderate inhibitor ${FDA_GRADES.inhibitor.moderate.fold}. Not a milligram.`,
      choices: [
        { id: "moderate", label: FDA_GRADES.inhibitor.moderate.fold },
        { id: "strong", label: FDA_GRADES.inhibitor.strong.fold },
        { id: "weak", label: FDA_GRADES.inhibitor.weak.fold },
        { id: "mg", label: "A milligram change" },
      ],
      correct: "moderate",
    },
    {
      id: "cyp-arrow-weak",
      kicker: "Direction",
      title: "Weak inhibitor",
      prompt: "The row says weak inhibitor. The fold is already stored.",
      ask: "What does FDA call a weak inhibitor?",
      answer: `FDA calls a weak inhibitor ${FDA_GRADES.inhibitor.weak.fold}. Not a milligram.`,
      choices: [
        { id: "weak", label: FDA_GRADES.inhibitor.weak.fold },
        { id: "strong", label: FDA_GRADES.inhibitor.strong.fold },
        { id: "moderate", label: FDA_GRADES.inhibitor.moderate.fold },
        { id: "mg", label: "A milligram change" },
      ],
      correct: "weak",
    },
  ];
  return cards.map((card) => ({ ...card, lane: "cyp" as const, drugIds: [] }));
}

function shelfSlug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Most common enzyme role on a class shelf. Counted from the catalog. Not a collision. */
function shelfCards(): StudyCard[] {
  const byClass = new Map<string, Drug[]>();
  for (const d of DRUGS) {
    if (d.kind !== "drug") continue;
    const list = byClass.get(d.cls);
    if (list) list.push(d);
    else byClass.set(d.cls, [d]);
  }

  const shelves: { cls: string; n: number; ranked: { role: string; count: number }[] }[] = [];
  for (const [cls, drugs] of byClass) {
    if (drugs.length < 6) continue;
    if (/combo/i.test(cls) || cls.length > 36) continue;
    const tally = new Map<string, number>();
    for (const d of drugs) {
      for (const e of d.enzymes) {
        const role = e.kind === "substrate" ? `${e.enzyme} substrate` : `${e.strength} ${e.enzyme} ${e.kind}`;
        tally.set(role, (tally.get(role) ?? 0) + 1);
      }
    }
    const ranked = [...tally.entries()]
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));
    if (ranked.length < 4 || ranked[0].count < 2) continue;
    if (!/CYP|P-gp/.test(ranked[0].role)) continue;
    shelves.push({ cls, n: drugs.length, ranked });
  }

  shelves.sort((a, b) => b.n - a.n || a.cls.localeCompare(b.cls));

  return shelves.slice(0, 8).map(({ cls, n, ranked }) => {
    const winner = ranked[0];
    const choices = ranked.slice(0, 4).map((row) => ({ id: shelfSlug(row.role), label: row.role }));
    return {
      id: `cyp-shelf-${shelfSlug(cls)}`,
      lane: "cyp" as const,
      kicker: "Class shelf",
      title: cls,
      prompt: `${n} drugs are on the ${cls} shelf on this map.`,
      ask: "Which enzyme role is the most common on this shelf?",
      answer: `${winner.count} of ${n} carry ${winner.role}. Same shelf is not a collision and not a clearance. Not a milligram.`,
      choices,
      correct: shelfSlug(winner.role),
      drugIds: [],
    };
  });
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

function deskFoldSentence(f: Finding): string {
  const grade = f.mechanism.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (grade !== "strong" && grade !== "moderate" && grade !== "weak") return "";
  if (!f.tags.includes("inhibitor") && !f.tags.includes("inducer")) return "";
  const kind = f.tags.includes("inducer") ? "inducer" : "inhibitor";
  return ` FDA fold: ${FDA_GRADES[kind][grade].fold}. Not a milligram.`;
}

function scrubNamed(text: string, named: string) {
  return text.split(named).join(" ").replace(/\s+/g, " ").trim();
}

/** Shelf prompt for a per-drug card. The stem must not name the first enzyme. */
function monoPrompt(d: Drug): string {
  const brands = d.brands.slice(0, 3);
  const shelf = brands.length ? `Brands on this shelf: ${brands.join(", ")}.` : d.cls;
  const named = d.enzymes[0]?.enzyme;
  if (!named || !shelf.includes(named)) return shelf;
  const cls = scrubNamed(d.cls, named);
  const clean = brands.map((b) => scrubNamed(b, named)).filter((b) => b.length > 0);
  if (cls && clean.length) return `${cls}. ${clean.join(", ")}.`;
  if (clean.length) return clean.join(", ");
  if (cls) return cls;
  return "Shelf class";
}

const TEACHING_BINS: StudyChoice[] = [
  { id: "contraindicated", label: SEVERITY_LABEL.contraindicated },
  { id: "major", label: SEVERITY_LABEL.major },
  { id: "moderate", label: SEVERITY_LABEL.moderate },
  { id: "minor", label: SEVERITY_LABEL.minor },
];

const KIND_BINS: StudyChoice[] = [
  { id: "pk", label: "Levels" },
  { id: "pd", label: "Effects" },
  { id: "geno", label: "Genes" },
  { id: "clinic", label: "Clinic" },
];

const ROLE_CHOICES: StudyChoice[] = [
  { id: "substrate", label: "Substrate" },
  { id: "inhibitor", label: "Inhibitor" },
  { id: "inducer", label: "Inducer" },
];

const LINGER_CHOICES: StudyChoice[] = (
  Object.keys(WASHOUT_OFFSET) as (keyof typeof WASHOUT_OFFSET)[]
).map((key) => ({ id: key, label: WASHOUT_OFFSET[key].tag }));

const ARROW_CHOICES: StudyChoice[] = [
  { id: "up-parent", label: "Victim exposure rises" },
  { id: "down-parent", label: "Victim exposure falls" },
  { id: "down-active", label: "Active metabolite falls" },
  { id: "up-active", label: "Active metabolite rises" },
];

function storedArrow(effect: string): string | null {
  if (effect.includes("↓ active metabolite")) return "down-active";
  if (effect.includes("↑ active metabolite")) return "up-active";
  if (effect.includes("↑ exposure")) return "up-parent";
  if (effect.includes("↓ exposure")) return "down-parent";
  return null;
}

function roleAnswer(name: string, role: Drug["enzymes"][number]): string {
  if (role.kind === "substrate") {
    const path = role.pathway === "activation" ? "activation" : "clearance";
    const nti = role.nti ? " Narrow-index flag is stored on this row." : "";
    return `${name} is stored as a ${role.sensitivity} ${role.enzyme} substrate (${path}).${nti} Not a milligram.`;
  }
  const fold = FDA_GRADES[role.kind][role.strength].fold;
  return `${name} is stored as a ${role.strength} ${role.enzyme} ${role.kind}. FDA grade on this desk: ${fold}. Not a milligram.`;
}

function kindBinLabel(kind: string): string | null {
  if (kind === "pk") return "Levels";
  if (kind === "pd") return "Effects";
  if (kind === "geno") return "Genes";
  if (kind === "clinic") return "Clinic";
  return null;
}

export function deskCards(ids: string[], findings: Finding[]): StudyCard[] {
  const out: StudyCard[] = [];
  for (const f of findings.slice(0, 6)) {
    const names = f.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? id).join(" × ");
    const label = kindBinLabel(f.kind);
    if (label) {
      out.push({
        id: `kind-${f.id}`,
        lane: "desk",
        kicker: "Kind",
        title: names,
        prompt: `${names}.`,
        ask: "Is this mapped row levels, effects, genes, or clinic?",
        choices: bySeed(KIND_BINS, `kind-${f.id}`),
        correct: f.kind,
        answer: `Kind: ${label}. A category from this model, not a clearance.`,
        drugIds: f.drugIds,
      });
    }
    out.push({
      id: `bin-${f.id}`,
      lane: "desk",
      kicker: "Teaching bin",
      title: names,
      prompt: `${names}.`,
      ask: "Which teaching bin is on this mapped row?",
      choices: bySeed(TEACHING_BINS, `bin-${f.id}`),
      correct: f.severity,
      answer: `Teaching bin: ${SEVERITY_LABEL[f.severity]}. A category from this model, not an individual risk.`,
      drugIds: f.drugIds,
    });
    const arrow = storedArrow(f.effect);
    if (arrow) {
      out.push({
        id: `arrow-${f.id}`,
        lane: "desk",
        kicker: "Direction",
        title: names,
        prompt: `${names}.`,
        ask: "Which direction is stored on this mapped row?",
        choices: bySeed(ARROW_CHOICES, `arrow-${f.id}`),
        correct: arrow,
        answer: `Direction stored: ${f.effect}. ${f.mechanism}. Not a clearance and not a milligram.`,
        drugIds: f.drugIds,
      });
    }
    const kind =
      f.kind === "pk" ? "Pharmacokinetic" : f.kind === "pd" ? "Pharmacodynamic" : f.kind === "geno" ? "Phenotype" : "Clinic";
    const sole = f.enzymes.length === 1 ? f.enzymes[0] : null;
    const card: StudyCard = {
      id: `desk-${f.id}`,
      lane: "desk",
      kicker: kind,
      title: names || "Collision",
      prompt: sole
        ? `${names}.`
        : `${names}. Effect: ${f.effect}.`,
      ask: sole
        ? "Which enzyme does this mapped row name?"
        : "Say the mechanism out loud before you reveal. A preceptor wants the enzyme or the receptor, not a milligram.",
      answer:
        clip([f.mechanism, f.clinical].filter(Boolean).join(" ")) +
        deskFoldSentence(f) +
        (sole ? ` Teaching bin: ${f.severity}. A category from this model, not an individual risk.` : ""),
      drugIds: f.drugIds,
    };
    if (sole) {
      const seed = `desk-enzyme-${f.id}`;
      const distractors = bySeed(
        ENZYMES.filter((enzyme) => enzyme !== sole).map((enzyme) => ({ id: enzyme, label: enzyme })),
        seed,
      ).slice(0, 3);
      card.choices = bySeed([{ id: sole, label: sole }, ...distractors], `${seed}-order`);
      card.correct = sole;
    }
    out.push(card);
  }
  for (const id of ids) {
    const d = DRUG_BY_ID[id];
    if (!d) continue;
    const roles = roleLine(d);
    const first = d.enzymes[0]?.enzyme;
    const card: StudyCard = {
      id: `mono-${id}`,
      lane: "desk",
      kicker: d.cls,
      title: d.name,
      prompt: monoPrompt(d),
      ask: first
        ? "Which enzyme is named first on this map?"
        : "Enzyme roles, then the PD flag. Skip any milligram.",
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
    };
    if (first) {
      const seed = `mono-enzyme-${id}`;
      const distractors = bySeed(
        ENZYMES.filter((enzyme) => enzyme !== first).map((enzyme) => ({ id: enzyme, label: enzyme })),
        seed,
      ).slice(0, 3);
      card.choices = bySeed([{ id: first, label: first }, ...distractors], `${seed}-order`);
      card.correct = first;
    }
    out.push(card);
    const role =
      d.enzymes.find((e) => e.kind === "inhibitor" || e.kind === "inducer") ?? d.enzymes[0];
    if (role) {
      out.push({
        id: `role-${id}`,
        lane: "desk",
        kicker: "Role",
        title: d.name,
        prompt: `${d.name}. ${role.enzyme}.`,
        ask: "What role is stored for that enzyme: substrate, inhibitor, or inducer?",
        choices: bySeed(ROLE_CHOICES, `role-${id}`),
        correct: role.kind,
        answer: roleAnswer(d.name, role),
        drugIds: [id],
      });
    }
    const note = id in TDI ? TDI[id] : undefined;
    const named = note?.enzymes[0];
    if (note && named) {
      const seed = `tdi-enzyme-${id}`;
      const distractors = bySeed(
        ENZYMES.filter((enzyme) => enzyme !== named).map((enzyme) => ({ id: enzyme, label: enzyme })),
        seed,
      ).slice(0, 3);
      out.push({
        id: `tdi-${id}`,
        lane: "desk",
        kicker: "Recovery",
        title: d.name,
        prompt: `${d.name}.`,
        ask: "Which enzyme does the stored time-dependent note name first?",
        choices: bySeed([{ id: named, label: named }, ...distractors], `${seed}-order`),
        correct: named,
        answer: `${d.name}. Recovery note already stored: ${note.resynth}. ${note.pearl} Not a restart date and not a milligram.`,
        drugIds: [id],
      });
    }
    const linger = washoutOffsetKind({ ids: [id], days: 1, label: "" });
    if (linger) {
      out.push({
        id: `linger-${id}`,
        lane: "desk",
        kicker: "Linger",
        title: d.name,
        prompt: `${d.name}.`,
        ask: "Which linger kind is stored after the last dose?",
        choices: bySeed(LINGER_CHOICES, `linger-${id}`),
        correct: linger,
        answer: `${WASHOUT_OFFSET[linger].plain} Not a restart date and not a milligram.`,
        drugIds: [id],
      });
    }
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
  "clin-cardiac-phase0-ina-nav15-vaughan-williams": "cardio",
  "clin-cardiac-phase3-herg-ead-torsades": "cardio",
  "clin-cardiac-phase4-if-dad-digoxin": "cardio",

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
  "clin-esett-trial-noninferiority": "neuro",
  "clin-status-epilepticus-gaba-internalization": "neuro",
  "clin-osmotherapy-234-saline-vs-mannitol": "neuro",

  // Anticoagulation & DOACs
  "clin-dabigatran-reversal": "anticoag",
  "clin-ganzoni-iron-depot": "anticoag",
  "clin-rivaroxaban-food-bioavailability": "anticoag",
  "clin-dabigatran-capsule-crush-hazard": "anticoag",
  "clin-hit-4ts-non-heparin-dti": "anticoag",
  "clin-argatroban-warfarin-crossover-trap": "anticoag",

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
  "clin-tox-anticholinergic-vs-sympathomimetic": "tox",
  "clin-tox-cyanide-hydroxocobalamin-complex-iv": "tox",
  "clin-tox-organophosphate-ache-pralidoxime-aging": "tox",
  "clin-beta-lactam-extended-infusion-arc": "tox",

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
  "clin-protamine-heparin-decay-stoichiometry": "bedside",

  // CYP & Pharmacokinetics
  "clin-warfarin-bactrim-cyp2c9": "cyp",
  "clin-phenytoin-michaelis-menten": "cyp",
  "clin-pgx-cyp2c19-clopidogrel-stent-thrombosis": "cyp",
  "clin-pgx-hla-b5701-abacavir-f-pocket": "cyp",
  "clin-cyp-tdi-suicidal-mbi-recovery-kinetics": "cyp",
  "clin-cyp-pxr-car-ahr-nuclear-induction-lag": "cyp",

  // Renal Tubular & Electrolytes
  "clin-renal-nkcc2-romk-calcium-wasting": "electrolytes",
  "clin-renal-ncc-trpv5-thiazide-calcium-retention": "electrolytes",
  "clin-renal-triple-whammy-hemodynamics": "electrolytes",
  "clin-renal-enac-lithium-ndi-amiloride": "electrolytes",

  // Blood-Brain Barrier & Neuro / Bedside
  "clin-cns-antihistamine-1st-vs-2nd-gen-psa": "neuro",
  "clin-cns-meningitis-tight-junction-permeability": "bedside",

  // High-Yield Oncology, Antimicrobial Stewardship, Obstetrics, Vasoactive & Transplant
  "clin-hdmtx-leucovorin-nomogram": "tox",
  "clin-cefepime-neurotoxicity-gaba": "neuro",
  "clin-daptomycin-statin-myopathy": "tox",
  "clin-phenytoin-michaelis-menten-saturation": "neuro",
  "clin-teratogenic-critical-windows": "bedside",
  "clin-epinephrine-hyperlactatemia-type-b": "bedside",
  "clin-mycophenolate-ehc-flora-csa": "tox",
  "clin-cni-steroid-taper-cyp3a-rebound": "tox",
  "clin-anticoagulation-reversal-andexanet-pcc-protamine": "anticoag",
  "clin-apap-nac-rumack-cyp2e1-glutathione": "tox",
  "clin-toxic-alcohols-osmolal-gap-fomepizole": "tox",
  "clin-salicylate-ion-trapping-potassium-rule": "tox",
  "clin-toxidrome-differential-hunter-nms-anticholinergic": "neuro",
  "clin-clozapine-tdm-smoking-cyp1a2-cigh": "neuro",
  "clin-digoxin-tdm-post-dose-lag-digifab": "tox",
  "clin-vaughan-williams-cast-class-ic": "bedside",
  "clin-winters-formula-secondary-respiratory-acid-base": "electrolytes",
  "clin-hyponatremia-ods-adrogue-madias-hypertonic-saline": "electrolytes",
  "clin-sugammadex-cyclodextrin-contraceptive-collision": "bedside",
  "clin-propofol-pris-fatty-acid-oxidation-failure": "tox",
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
    {
      id: "clin-cardiac-phase0-ina-nav15-vaughan-williams",
      lane: "clinical",
      kicker: "Cardiac Electrophysiology & Ion Channels",
      title: "Phase 0 Fast Sodium Influx: Nav1.5 Dissociation Kinetics Across Vaughan Williams Classes",
      prompt: "The cardiac ventricular action potential upstroke (Phase 0) is driven by rapid inward sodium current (INa) through voltage-gated Nav1.5 channels.",
      ask: "How do the unbinding kinetics of Class IA, IB, and IC antiarrhythmics diverge, and why does Class IC (flecainide) exhibit marked use-dependent QRS widening?",
      choices: [
        {
          id: "class-ic-slow-unbinding-accumulates-block",
          label: "Class IC agents (flecainide) have very slow dissociation kinetics (tau > 10 s); at faster heart rates, channels remain blocked across successive beats (use-dependence), progressively depressing Phase 0 upstroke velocity and widening the QRS complex without altering repolarization",
        },
        {
          id: "class-ib-slowest-dissociation-blocks-repolarization",
          label: "Class IB agents (lidocaine) have the slowest dissociation kinetics of all classes, selectively blocking Phase 3 potassium channels and dramatically prolonging the QT interval at fast heart rates",
        },
        {
          id: "class-ia-pure-calcium-channel-blockade",
          label: "Class IA agents (procainamide) bypass Nav1.5 completely to block L-type calcium channels, causing use-dependent PR interval prolongation without affecting ventricular conduction velocity",
        },
        {
          id: "all-classes-identical-dissociation-kinetics",
          label: "All three subclasses dissociate within milliseconds, with QRS widening determined strictly by plasma protein binding rather than channel unbinding kinetics",
        },
      ],
      correct: "class-ic-slow-unbinding-accumulates-block",
      answer: "In ventricular myocardium, Phase 0 depolarization is mediated by fast inward sodium current (INa) conducted by Nav1.5 channels (SCN5A gene), driving rapid membrane upstroke (dV/dt max 200-400 V/s) from -90 mV to +30 mV. The Vaughan Williams classification subdivides sodium channel blockers by their channel binding/unbinding dissociation time constant (tau) and their secondary impact on repolarization: 1) Class IB (lidocaine, mexiletine) exhibits rapid dissociation (tau < 0.5 s), binding predominantly in inactivated states in ischemic/depolarized myocardium with unbinding complete during diastole, leaving QRS width unaffected at normal rates; 2) Class IA (procainamide, quinidine, disopyramide) exhibits intermediate kinetics (tau 1-5 s) with concurrent hERG potassium channel blockade, moderately slowing Phase 0 (QRS widening) and prolonging action potential duration (QT prolongation); 3) Class IC (flecainide, propafenone) exhibits remarkably slow dissociation kinetics (tau > 10-20 s). Because drug unbinding is so slow during diastole, higher heart rates allow insufficient time for channel dissociation between beats; blocked channels progressively accumulate with each excitation. This hallmark 'use-dependence' profoundly depresses Phase 0 upstroke velocity (dV/dt max), slowing intraventricular conduction velocity and causing progressive QRS widening and bundle branch distortion. In structural or ischemic heart disease, this slow conduction creates a potent substrate for fatal re-entrant ventricular tachycardias (the historic CAST trial warning).",
      drugIds: ["flecainide", "lidocaine", "procainamide"],
    },
    {
      id: "clin-cardiac-phase3-herg-ead-torsades",
      lane: "clinical",
      kicker: "Cardiac Electrophysiology & Arrhythmias",
      title: "Phase 3 Rapid Repolarization: hERG / IKr Blockade, Early Afterdepolarizations & Torsades",
      prompt: "Ventricular Phase 3 repolarization restores resting membrane potential primarily through rapid delayed rectifier potassium current (IKr).",
      ask: "What biophysical sequence connects pharmacological hERG (IKr) inhibition to Early Afterdepolarizations (EADs) and pause-dependent Torsades de Pointes?",
      choices: [
        {
          id: "herg-block-prolongs-plateau-cav12-window-reopens",
          label: "hERG blockade diminishes outward IKr, prolonging Phase 2/3 plateau duration; this delayed repolarization allows voltage-gated L-type calcium channels (Cav1.2) to recover from inactivation and reopen in the 'window current' range (-30 to 0 mV), triggering depolarizing inward calcium spikes (EADs) that fire Torsades de Pointes",
        },
        {
          id: "herg-block-drives-massive-sodium-potassium-pump-inversion",
          label: "hERG inhibition directly reverses the Na+/K+ ATPase pump, causing massive intracellular sodium extrusion and extracellular potassium depletion that precipitates sudden ventricular fibrillation without QT prolongation",
        },
        {
          id: "direct-stimulation-of-sarcoplasmic-ryanodine-release",
          label: "hERG blockers cross into the sarcoplasmic reticulum and lock open RyR2 channels, causing delayed afterdepolarizations strictly during Phase 4 diastole without changing action potential duration",
        },
        {
          id: "herg-block-selectively-slows-sa-nodal-pacemaker-firing",
          label: "hERG channels exist exclusively in the sinoatrial node, so drug-induced block induces isolated sinus bradycardia without affecting ventricular repolarization or torsadogenic risk",
        },
      ],
      correct: "herg-block-prolongs-plateau-cav12-window-reopens",
      answer: "Phase 3 rapid repolarization of ventricular myocytes is primarily driven by outward potassium efflux through rapid delayed rectifier channels (IKr, encoded by KCNH2/hERG) and slow delayed rectifiers (IKs, KCNQ1). The hERG channel pore possesses unique aromatic amino acid residues (Tyr652 and Phe656) within its inner vestibule that permit promiscuous high-affinity binding of diverse therapeutic molecules (Class III antiarrhythmics like sotalol and dofetilide, psychotropics like haloperidol, antiemetics like ondansetron, and macrolides). When hERG is blocked, outward potassium repolarizing current collapses, markedly prolonging action potential duration (APD) and the surface ECG QT interval. As the plateau phase (Phase 2) and early Phase 3 are abnormally protracted, sarcolemmal voltage remains within the membrane potential window (-30 mV to 0 mV) where L-type calcium channels (Cav1.2) can recover from inactivation while remaining above their activation threshold. Inward calcium current reactivates ('window current'), generating spontaneous secondary depolarizing spikes termed Early Afterdepolarizations (EADs). If an EAD reaches threshold before full repolarization, it triggers a premature ventricular beat. In the setting of transmural dispersion of repolarization, this triggered activity initiates the twisting polymorphic ventricular tachycardia known as Torsades de Pointes (TdP). Because hERG blockers exhibit 'reverse use-dependence' (blockade and APD prolongation are exaggerated at slower heart rates), bradycardia and post-extrasystolic compensatory pauses ('short-long-short' sequence) strongly facilitate EAD genesis.",
      drugIds: ["sotalol", "amiodarone", "ondansetron"],
    },
    {
      id: "clin-cardiac-phase4-if-dad-digoxin",
      lane: "clinical",
      kicker: "Electrophysiology & Cellular Kinetics",
      title: "Phase 4 Diastolic Dynamics: HCN 'Funny' Current vs. Digoxin Delayed Afterdepolarizations",
      prompt: "Phase 4 membrane potential dynamics distinguish automatic pacemaker tissue (spontaneous diastolic depolarization) from resting ventricular myocardium.",
      ask: "How does the pacemaking 'funny' current (If) generate spontaneous Phase 4 depolarization, and by what cellular mechanism does digoxin toxicity generate Delayed Afterdepolarizations (DADs)?",
      choices: [
        {
          id: "if-hyperpolarization-activation-vs-digoxin-na-k-atpase-ca-overload",
          label: "HCN4 If channels open upon hyperpolarization to drive slow inward mixed Na+/K+ diastolic depolarization in nodal pacemakers; conversely, digoxin inhibits Na+/K+ ATPase, raising intracellular Na+, blunting NCX1 Ca2+ extrusion, and causing sarcoplasmic Ca2+ overload that fires transient inward current (Iti) and DADs in Phase 4",
        },
        {
          id: "if-is-a-fast-voltage-gated-chloride-channel",
          label: "If is a voltage-gated chloride channel that opens during Phase 1 to induce early repolarization, while digoxin directly opens Ryanodine receptors to prevent calcium uptake",
        },
        {
          id: "digoxin-selectively-opens-ik1-inward-rectifiers",
          label: "Digoxin toxicity locks open Kir2.1 inward rectifier channels, causing excessive potassium efflux that hyperpolarizes myocytes below -120 mV and stops diastolic automaticity",
        },
        {
          id: "nodal-phase-4-is-purely-passive-leakage-without-channels",
          label: "SA nodal diastolic depolarization occurs entirely without ion channels via passive water shift, whereas digoxin toxicity causes membrane rupture from osmotic swelling",
        },
      ],
      correct: "if-hyperpolarization-activation-vs-digoxin-na-k-atpase-ca-overload",
      answer: "In specialized cardiac pacemaker tissue (SA node and AV node), cells do not have a stable resting membrane potential; instead, they display spontaneous diastolic depolarization during Phase 4. Following repolarization to maximum diastolic potential (-60 mV), Hyperpolarization-activated Cyclic Nucleotide-gated channels (predominantly HCN4) activate. These conduct the 'funny' pacemaker current (If)—an inward mixed sodium-potassium current named for its unusual activation by hyperpolarization rather than depolarization. Inward If flux, coupled with decay of delayed rectifier potassium currents and diastolic local calcium releases from the sarcoplasmic reticulum (SR clock engaging NCX), drives slow membrane depolarization toward threshold (-40 mV), triggering Phase 0 action potentials driven by L-type calcium channels (Cav1.2). Ivabradine selectively blocks HCN channels, flattening Phase 4 slope and reducing heart rate without altering inotropy. Conversely, in working ventricular myocytes, resting Phase 4 potential is held stable at -90 mV by inward rectifier potassium current (IK1) and the electrogenic Na+/K+ ATPase pump. Digoxin binds the extracellular alpha subunit of Na+/K+ ATPase, inhibiting active extrusion of sodium (3 Na+ out, 2 K+ in). Intracellular [Na+] rises, reducing the trans-sarcolemmal sodium gradient and blunting forward-mode Sodium-Calcium Exchanger (NCX1, which normally extrudes 1 Ca2+ in exchange for 3 Na+ in). Consequently, calcium extrusion drops and intracellular [Ca2+] climbs, leading to supranormal calcium loading into the sarcoplasmic reticulum via SERCA2a (the basis of positive inotropy). However, in digitalis toxicity, severe SR calcium overload triggers spontaneous, uncoordinated diastolic calcium sparks through ryanodine receptors (RyR2). This surges free cytosolic calcium during Phase 4, driving electrogenic forward NCX1 activity (3 Na+ in for 1 Ca2+ out), creating a net inward depolarizing current termed the transient inward current (Iti). This produces a Delayed Afterdepolarization (DAD). When DAD amplitude reaches the Nav1.5 threshold, triggered repetitive action potentials fire, generating ventricular bigeminy, bidirectional ventricular tachycardia, and ventricular fibrillation.",
      drugIds: ["digoxin", "ivabradine"],
    },
    {
      id: "clin-tox-anticholinergic-vs-sympathomimetic",
      lane: "clinical",
      kicker: "Clinical Toxicology & Physical Exam",
      title: "Autonomic Hyperactivity Toxidromes: The Critical Skin Moisture Discriminator",
      prompt: "Patients presenting with acute tachycardia, hypertension, hyperthermia, mydriasis, and delirium present a classic diagnostic challenge between anticholinergic and sympathomimetic toxicity.",
      ask: "What pathognomonic physical examination finding decisively discriminates between anticholinergic and sympathomimetic toxidromes, and what is its physiological basis?",
      choices: [
        {
          id: "skin-moisture-anhidrosis-vs-diaphoresis",
          label: "Skin moisture: Anticholinergic toxicity causes complete anhidrosis (dry, hot, flushed skin) due to muscarinic M3 blockade on eccrine sweat glands; sympathomimetic toxicity causes profuse diaphoresis (drenching sweats) due to alpha-1 and beta-adrenergic overstimulation",
        },
        {
          id: "pupillary-light-reflex-size-divergence",
          label: "Pupil diameter: Anticholinergic toxicity causes pinpoint miosis from Edinger-Westphal stimulation, whereas sympathomimetic toxicity causes wide mydriasis",
        },
        {
          id: "respiratory-rate-bradypnea-in-sympathomimetics",
          label: "Respiratory rate: Sympathomimetics selectively depress brainstem pre-Bötzinger centers causing severe bradypnea, while anticholinergics cause extreme tachypnea",
        },
        {
          id: "deep-tendon-reflexes-are-absent-in-cocaine",
          label: "Deep tendon reflexes: Cocaine toxicity abolishes all peripheral reflexes through spinal reflex arc severance, while diphenhydramine induces hyperreflexia",
        },
      ],
      correct: "skin-moisture-anhidrosis-vs-diaphoresis",
      answer: "Both anticholinergic (e.g., diphenhydramine, atropine, scopolamine, tricyclic antidepressants) and sympathomimetic (e.g., cocaine, amphetamines, MDMA) toxicity present with autonomic hyperarousal: tachycardia, hypertension, hyperthermia, mydriasis (dilated pupils), and agitated delirium. However, evaluating sweat production (skin moisture and axillary folds) is the pathognomonic clinical differentiator: 1) Eccrine sweat glands are anatomically innervated by postganglionic sympathetic cholinergic fibers that release acetylcholine onto muscarinic M3 receptors. In anticholinergic toxicity, competitive blockade of M3 receptors completely paralyzes sweat gland secretion. The patient is 'dry as a bone'—demonstrating total anhidrosis with hot, dry, erythematous skin, bone-dry mucous membranes, and dry axillae. The loss of evaporative cooling significantly exacerbates their hyperthermia ('hot as a hare'); 2) In contrast, sympathomimetics stimulate peripheral alpha-1 and beta adrenoceptors and activate central sympathetic outflow, provoking profuse diaphoresis. The patient with sympathomimetic toxicity is drenched in sweat ('wet and wild'). Secondary discriminators reinforce this distinction: bowel sounds are typically hypoactive or absent in anticholinergic poisoning due to intestinal muscarinic blockade ('full as a flask' urinary retention and ileus), whereas bowel sounds are normoactive or hyperactive in sympathomimetic intoxication.",
      drugIds: ["diphenhydramine", "cocaine", "amphetamine"],
    },
    {
      id: "clin-tox-cyanide-hydroxocobalamin-complex-iv",
      lane: "clinical",
      kicker: "Toxicology & Cellular Respiration",
      title: "Cyanide Toxicity & Hydroxocobalamin: Complex IV Extraction vs. Methemoglobin Inducers",
      prompt: "Cyanide halts aerobic cellular respiration, presenting with severe lactic acidosis despite normal or elevated arterial PO2 ('histotoxic hypoxia').",
      ask: "What is the molecular mechanism by which hydroxocobalamin neutralizes cyanide, and why is it preferred over traditional nitrite-induced methemoglobinemia in smoke inhalation victims?",
      choices: [
        {
          id: "hydroxocobalamin-co3-chelates-cyanide-sparing-oxygen-carrying-capacity",
          label: "Hydroxocobalamin's central trivalent cobalt (Co3+) coordinates cyanide with higher affinity than ferric iron (Fe3+) in cytochrome c oxidase, forming nontoxic cyanocobalamin without inducing methemoglobinemia or compromising oxygen carriage in victims with concurrent carbon monoxide poisoning",
        },
        {
          id: "hydroxocobalamin-hydrolyzes-cyanide-into-nitrogen-gas",
          label: "Hydroxocobalamin enzymatically hydrolyzes cyanide into inert nitrogen and carbon dioxide gas within the pulmonary capillary bed via alkaline phosphatase",
        },
        {
          id: "hydroxocobalamin-induces-massive-methemoglobinemia-safely",
          label: "Hydroxocobalamin induces up to 40% methemoglobinemia, safely converting all hemoglobin into scavenger methemoglobin without affecting oxygen delivery",
        },
        {
          id: "direct-stimulation-of-anaerobic-glycolysis-by-vitamin-b12",
          label: "Hydroxocobalamin acts as a catalytic cofactor that bypasses the electron transport chain completely, generating 36 ATP molecules via anaerobic fermentation",
        },
      ],
      correct: "hydroxocobalamin-co3-chelates-cyanide-sparing-oxygen-carrying-capacity",
      answer: "Cyanide (CN-) is a potent cellular poison released during structural fires (combustion of synthetic polymers, polyurethane, wool) and industrial exposures, as well as prolonged high-dose sodium nitroprusside infusions. Cyanide binds with high affinity to the ferric (Fe3+) iron moiety of cytochrome a3 within cytochrome c oxidase (Complex IV) of the mitochondrial electron transport chain. This completely halts oxidative phosphorylation and electron transfer to oxygen. Cells are starved of ATP despite abundant arterial oxygen saturation (histotoxic hypoxia), leading to massive compensatory anaerobic glycolysis, profound lactic acidosis (lactate > 8-10 mmol/L), and rapid cardiovascular collapse. Hydroxocobalamin (Vitamin B12a) is a cobalt metallo-complex containing a central trivalent cobalt ion (Co3+) bound to a hydroxyl group. Cobalt(III) possesses a significantly higher binding affinity for cyanide than the ferric iron in cytochrome c oxidase. Hydroxocobalamin exchanges its hydroxyl ligand for cyanide, directly binding two cyanide ions per molecule to form stable, nontoxic cyanocobalamin (Vitamin B12), which is safely eliminated in the urine. This strips cyanide off mitochondrial Complex IV and restores aerobic ATP generation. In contrast, the historical Cyanide Antidote Kit employed sodium nitrite to oxidize hemoglobin (Fe2+) into methemoglobin (Fe3+), creating an intravascular methemoglobin sink for cyanide. However, in smoke inhalation victims, concurrent carbon monoxide (CO) exposure frequently causes severe carboxyhemoglobinemia; adding nitrite-induced methemoglobinemia dangerously destroys remaining functional oxygen-carrying capacity, precipitating lethal tissue hypoxia. Hydroxocobalamin produces zero methemoglobin and preserves oxygen carriage, making it the international standard of care.",
      drugIds: ["hydroxocobalamin", "nitroprusside"],
    },
    {
      id: "clin-tox-organophosphate-ache-pralidoxime-aging",
      lane: "clinical",
      kicker: "Toxicology & Chemical Receptors",
      title: "Organophosphate Toxicity: Dual Antidote Mechanics & Chemical Aging of AChE",
      prompt: "Organophosphate insecticides covalently phosphorylate acetylcholinesterase (AChE), producing catastrophic cholinergic hyperstimulation.",
      ask: "What distinct physiological targets are addressed by atropine versus pralidoxime (2-PAM), and what irreversible chemical event occurs if oxime administration is delayed?",
      choices: [
        {
          id: "atropine-muscarinic-drying-pralidoxime-nicotinic-oxime-cleaves-before-aging",
          label: "Atropine blocks muscarinic M1/M2/M3 receptors to clear life-threatening bronchorrhea and bronchospasm but has zero nicotinic activity; pralidoxime (2-PAM) nucleophilically attacks phosphorylated AChE to regenerate enzyme at motor endplates, which fails if covalent dealkylation ('aging') occurs",
        },
        {
          id: "atropine-regenerates-enzyme-pralidoxime-blocks-muscarinic-receptors",
          label: "Atropine is the enzymatic reactivator that restores catalytic serine function, while pralidoxime is a competitive antagonist that exclusively blocks smooth muscle muscarinic receptors",
        },
        {
          id: "pralidoxime-is-an-anticoagulant-preventing-thrombosis",
          label: "Pralidoxime acts as a heparin-like antithrombin activator to prevent microvascular thrombosis caused by organophosphate endothelial damage",
        },
        {
          id: "atropine-crosses-into-motor-endplates-to-stop-fasciculations",
          label: "Atropine competitively blocks nicotinic acetylcholine receptors at neuromuscular junctions to resolve skeletal muscle paralysis, requiring no secondary agents",
        },
      ],
      correct: "atropine-muscarinic-drying-pralidoxime-nicotinic-oxime-cleaves-before-aging",
      answer: "Organophosphates (e.g., malathion, parathion, sarin) are potent electrophilic inhibitors that covalently phosphorylate the active-site catalytic serine (Ser203) of acetylcholinesterase (AChE). Acetylcholine accumulates rapidly at both muscarinic parasympathetic neuroeffector junctions and nicotinic neuromuscular and ganglionic synapses, producing the classic cholinergic toxidrome (SLUDGEM/DUMBELS: Salivation, Lacrimation, Urination, Defecation, GI cramping, Emesis, Miosis, Bradycardia, Bronchorrhea, Bronchospasm, plus skeletal muscle fasciculations, weakness, and diaphragmatic paralysis). Treatment requires a dual-antidote mechanistic strategy: 1) Atropine is a tertiary amine competitive antagonist that selectively blocks muscarinic acetylcholine receptors (M1, M2, M3). It rapidly dries life-threatening airway secretions (bronchorrhea) and relieves bronchospasm and bradycardia (titrated until lung fields are clear); however, atropine has ZERO binding affinity for nicotinic receptors and does not treat skeletal muscle fasciculations or respiratory muscle paralysis; 2) Pralidoxime (2-PAM) is a nucleophilic pyridinium oxime. Its positively charged quaternary nitrogen electrostatically anchors to the peripheral anionic site of AChE, orienting its oxime group (-N-O-) to launch a directed nucleophilic attack on the organophosphate phosphorus atom. This cleaves the covalent bond to Ser203 and regenerates active AChE at the neuromuscular junction, restoring diaphragmatic effort; 3) The critical therapeutic window is governed by 'chemical aging': the organophosphate-enzyme conjugate undergoes non-enzymatic loss of an alkyl side chain (dealkylation), leaving an oxyanion that forms a stable salt bridge with the enzyme catalytic triad. Once aged, AChE is permanently inactivated and chemically resistant to oxime nucleophilic attack, leaving supportive mechanical ventilation as the only recourse until de novo enzyme is synthesized over weeks.",
      drugIds: ["malathion", "atropine", "pralidoxime"],
    },
    {
      id: "clin-pgx-cyp2c19-clopidogrel-stent-thrombosis",
      lane: "clinical",
      kicker: "Pharmacogenomics & Cardiovascular Medicine",
      title: "CYP2C19 Loss-of-Function & Clopidogrel: The Bioactivation Failure in Stent Thrombosis",
      prompt: "Clopidogrel is widely prescribed for dual antiplatelet therapy following percutaneous coronary intervention (PCI) with stent placement.",
      ask: "Why do CYP2C19 loss-of-function alleles (*2, *3) cause catastrophic antiplatelet failure with clopidogrel, and what bypass strategies are recommended by CPIC Level A guidelines?",
      choices: [
        {
          id: "prodrug-two-step-bioactivation-failure-vs-prasugrel-ticagrelor",
          label: "Clopidogrel is an inactive prodrug requiring a two-step hepatic bioactivation where CYP2C19 generates the active thiol metabolite that blocks P2Y12; poor metabolizers (*2/*3) fail to generate active drug, leading to uninhibited platelet aggregation and stent thrombosis, warranting alternative therapy with prasugrel or direct-acting ticagrelor",
        },
        {
          id: "cyp2c19-poor-metabolizers-rapidly-destroy-clopidogrel",
          label: "CYP2C19 poor metabolizers hyper-activate esterase cleavage of clopidogrel into toxic carboxylic acid metabolites that directly destroy endothelial prostacyclin synthesis",
        },
        {
          id: "clopidogrel-is-an-active-drug-cleared-by-cyp2c19",
          label: "Clopidogrel is an active drug that is cleared and eliminated by CYP2C19; poor metabolizers accumulate extreme supratherapeutic drug levels resulting in intracranial hemorrhage",
        },
        {
          id: "prasugrel-and-ticagrelor-are-identical-prodrugs-requiring-cyp2c19",
          label: "Prasugrel and ticagrelor both require exclusive CYP2C19 bioactivation and are equally ineffective in *2 and *3 allele carriers",
        },
      ],
      correct: "prodrug-two-step-bioactivation-failure-vs-prasugrel-ticagrelor",
      answer: "Clopidogrel (Plavix) is an inactive thienopyridine prodrug that requires a sequential two-step hepatic bioactivation cascade to generate its active, short-lived thiol metabolite. Approximately 85% of an oral clopidogrel dose is immediately hydrolyzed by ubiquitous serum/hepatic carboxylesterases into inactive carboxylic acid derivatives. Only the remaining 15% undergoes hepatic cytochrome P450 oxidation: first to 2-oxo-clopidogrel (mediated by CYP2C19, CYP1A2, CYP2B6), and subsequently to the active thiol metabolite (R-130964, mediated by CYP2C19, CYP2C9, CYP2B6, CYP3A4). The active thiol metabolite forms a covalent disulfide bond with critical cysteine residues on the platelet P2Y12 adenosine diphosphate (ADP) receptor, irreversibly blocking ADP-induced adenylyl cyclase inhibition and preventing platelet activation and fibrinogen cross-linking for the platelet's lifespan. CYP2C19 is the rate-limiting enzyme in both bioactivation steps. Patients carrying loss-of-function alleles (*2 [c.681G>A splice site defect] or *3 [c.636G>A premature stop codon]) are classified as intermediate (IM) or poor metabolizers (PM). In CYP2C19 PMs (*2/*2, *2/*3), active thiol metabolite exposure drops by >70%, resulting in minimal platelet inhibition (high on-treatment platelet reactivity) and an up to 3- to 4-fold increase in acute stent thrombosis and major adverse cardiovascular events (MACE). The Clinical Pharmacogenetics Implementation Consortium (CPIC Level A recommendation) and FDA boxed warnings recommend alternative antiplatelet strategies in IMs and PMs undergoing PCI: prasugrel (Effient, a prodrug requiring CYP bioactivation that relies predominantly on CYP3A4/CYP2B6 with minimal CYP2C19 dependency) or ticagrelor (Brilinta, a cyclopentyltriazolopyrimidine direct-acting, reversibly-binding P2Y12 antagonist requiring no metabolic activation).",
      drugIds: ["clopidogrel", "prasugrel", "ticagrelor"],
    },
    {
      id: "clin-pgx-hla-b5701-abacavir-f-pocket",
      lane: "clinical",
      kicker: "Pharmacogenomics & Immunopharmacology",
      title: "HLA-B*57:01 & Abacavir: The Altered Self-Peptide F-Pocket Mechanism of Hypersensitivity",
      prompt: "Abacavir is an antiretroviral nucleoside reverse transcriptase inhibitor (NRTI) that causes life-threatening multisystem hypersensitivity in susceptible patients.",
      ask: "What molecular immunopharmacological mechanism triggers abacavir hypersensitivity in HLA-B*57:01 carriers, and what is the CPIC recommendation regarding pre-treatment testing?",
      choices: [
        {
          id: "abacavir-lodges-in-f-pocket-altering-self-peptide-repertoire",
          label: "Abacavir binds non-covalently in the F-pocket of the HLA-B*57:01 antigen-binding groove, altering its shape and chemical specificity to present novel self-peptides that trigger massive polyclonal CD8+ T-cell autoimmune attack; CPIC Level A mandates pre-treatment screening and strict avoidance if positive",
        },
        {
          id: "abacavir-covalently-alkylates-b-cell-receptors",
          label: "Abacavir covalently alkylates membrane immunoglobulin on memory B-cells, stimulating immediate high-titer IgE production and classical anaphylaxis within seconds",
        },
        {
          id: "abacavir-inhibits-cyp-metabolism-of-endogenous-steroids",
          label: "Abacavir completely inhibits adrenal CYP11B1, causing acute glucocorticoid depletion that presents as pseudo-allergic Addisonian crisis",
        },
        {
          id: "hla-b5701-is-a-drug-metabolizing-enzyme-that-generates-napqi",
          label: "HLA-B*57:01 is a polymorphic Phase I hepatic monooxygenase that cleaves abacavir into toxic quinone-imine electrophiles",
        },
      ],
      correct: "abacavir-lodges-in-f-pocket-altering-self-peptide-repertoire",
      answer: "Abacavir hypersensitivity reaction (HSR) is a severe, potentially fatal multisystem syndrome characterized by fever, maculopapular rash, gastrointestinal distress (nausea, vomiting, diarrhea), constitutional malaise, and respiratory symptoms, typically emerging within the first six weeks of therapy. Re-challenge after discontinuation can trigger catastrophic distributive shock, hypotension, and death. The molecular mechanism represents a landmark paradigm in immunopharmacology: HLA-B*57:01 is a Major Histocompatibility Complex (MHC) Class I allele. The antigen-binding cleft of the HLA-B*57:01 molecule possesses a distinctive, narrow 114-116 residue 'F-pocket' that normally accommodates endogenous peptides terminating in bulky hydrophobic/tryptophan residues. Abacavir fits non-covalently into the base of this F-pocket with remarkable stereochemical specificity, modifying the internal volume and electrostatic topology of the cleft. By altering the architecture of the peptide-binding groove, abacavir changes the spectrum of self-peptides that can be loaded into the MHC molecule in the endoplasmic reticulum—specifically allowing endogenous self-peptides with smaller aliphatic C-terminal residues (isoleucine, leucine) to bind. When these newly accommodated 'altered self-peptide' complexes are displayed on the surface of antigen-presenting cells, naive CD8+ cytotoxic T cells perceive them as foreign antigens. This triggers a massive, systemic polyclonal CD8+ T-cell activation cascade, releasing cytotoxic cytokines (IFN-gamma, TNF-alpha) and granulysin that mediate widespread tissue injury. Due to 100% negative predictive value, CPIC guidelines (Level A) and FDA labeling mandate HLA-B*57:01 pharmacogenetic screening prior to initiating abacavir. In HLA-B*57:01-positive individuals, abacavir is strictly contraindicated, completely eliminating immunologically confirmed HSR in clinical practice.",
      drugIds: ["abacavir"],
    },
    {
      id: "clin-renal-nkcc2-romk-calcium-wasting",
      lane: "clinical",
      kicker: "Renal Tubular & Electrolyte Pharmacology",
      title: "NKCC2 Inhibition & ROMK Lumen-Positive Potential: Mechanism of Calcium Wasting",
      prompt: "Loop diuretics inhibit the apical Na+-K+-2Cl- cotransporter (NKCC2) in the thick ascending limb of the loop of Henle.",
      ask: "How does NKCC2 inhibition abolish the lumen-positive transepithelial potential (+10 mV) and cause secondary urinary wasting of calcium and magnesium?",
      choices: [
        {
          id: "romk-recycling-loss-erodes-transepithelial-gradient-driving-paracellular-calcium-flux",
          label: "Blocking NKCC2 halts apical K+ entry, diminishing ROMK-mediated K+ back-diffusion into the lumen; this collapses the +10 mV lumen-positive transepithelial voltage that normally electrostatically drives paracellular reabsorption of divalent cations (Ca2+ and Mg2+) through claudin-16/19",
        },
        {
          id: "direct-inhibition-of-apical-trpv5-calcium-channels",
          label: "Loop diuretics act as direct allosteric antagonists of apical TRPV5 epithelial calcium channels in the proximal tubule",
        },
        {
          id: "upregulation-of-paracellular-chloride-channels-in-collecting-duct",
          label: "Loop diuretics activate apical CFTR chloride channels in the collecting duct, generating a negative lumen that repels calcium into the urine",
        },
        {
          id: "basolateral-ncx1-exchanger-reversal-in-loop-of-henle",
          label: "NKCC2 inhibition causes intracellular sodium overload that reverses basolateral NCX1 exchangers to pump calcium into the tubule lumen",
        },
      ],
      correct: "romk-recycling-loss-erodes-transepithelial-gradient-driving-paracellular-calcium-flux",
      answer: "In the thick ascending limb (TAL) of Henle's loop, the apical Na+-K+-2Cl- cotransporter (NKCC2) reabsorbs one sodium, one potassium, and two chloride ions from tubular fluid. For NKCC2 to sustain high-capacity transport, luminal potassium must be continuously replenished; this occurs via apical renal outer medullary potassium (ROMK) channels that back-diffuse intracellular K+ back into the lumen. Because K+ carries a net positive charge back into the tubular lumen while basolateral ClC-Kb channels extrude Cl- with Na+/K+-ATPase extruding Na+ across the basolateral membrane, a transepithelial voltage gradient of approximately +8 to +10 mV (lumen-positive) is generated. This lumen-positive potential provides the essential electrostatic driving force for passive paracellular reabsorption of divalent cations—specifically calcium (Ca2+) and magnesium (Mg2+)—through the tight-junction pore complexes composed of claudin-16 (paracellin-1) and claudin-19. When loop diuretics (such as furosemide, bumetanide, torsemide) reversibly bind the chloride-binding pocket of NKCC2, apical ionic transport stops. Without intracellular K+ accumulation from NKCC2, ROMK recycling diminishes, and the lumen-positive potential collapses toward zero. Deprived of the electrostatic repelling force, passive paracellular reabsorption of Ca2+ and Mg2+ halts, resulting in profound urinary wasting of calcium ('calciuria') and magnesium ('magnesuria'). This mechanistic property is why loop diuretics reduce serum calcium in acute hypercalcemic crisis (supported by isotonic volume repletion) but aggravate osteopenia and nephrocalcinosis with chronic administration.",
      drugIds: ["furosemide"],
    },
    {
      id: "clin-renal-ncc-trpv5-thiazide-calcium-retention",
      lane: "clinical",
      kicker: "Renal Tubular & Electrolyte Pharmacology",
      title: "Distal Convoluted Tubule NCC Blockade & Active Calcium Sparing via TRPV5/NCX1",
      prompt: "Thiazide and thiazide-like diuretics inhibit the apical Na+-Cl- cotransporter (NCC) in the early distal convoluted tubule (DCT).",
      ask: "What cellular mechanism explains why thiazides increase renal calcium reabsorption and induce hypercalcemia, in stark contrast to loop diuretics?",
      choices: [
        {
          id: "intracellular-sodium-depletion-steepens-basolateral-ncx1-gradient-enhancing-apical-trpv5-entry",
          label: "NCC inhibition lowers intracellular Na+, steepening the chemical gradient that drives basolateral 3Na+/Ca2+ exchange (NCX1); the resulting reduction in intracellular Ca2+ accelerates apical Ca2+ entry through TRPV5 channels, alongside volume contraction-induced proximal Ca2+ reabsorption",
        },
        {
          id: "direct-stimulation-of-parathyroid-hormone-receptors-in-the-medulla",
          label: "Thiazides act as direct agonists at tubular parathyroid hormone 1 receptors (PTH1R), stimulating calcium synthesis",
        },
        {
          id: "activation-of-apical-enac-channels-which-electrostatically-attract-calcium",
          label: "NCC inhibition shifts sodium downstream to hyperactivate ENaC, generating a positive lumen that attracts calcium into principal cells",
        },
        {
          id: "inhibition-of-renal-1-alpha-hydroxylase-preventing-vitamin-d-degradation",
          label: "Thiazides inhibit renal CYP24A1, raising 1,25-dihydroxyvitamin D levels and stimulating calcitriol-dependent bone resorption",
        },
      ],
      correct: "intracellular-sodium-depletion-steepens-basolateral-ncx1-gradient-enhancing-apical-trpv5-entry",
      answer: "The early distal convoluted tubule (DCT) reabsorbs 5–7% of filtered sodium and chloride via the apical electroneutral Na+-Cl- cotransporter (NCC), which is sensitive to thiazides (such as hydrochlorothiazide and chlorthalidone). Unlike the thick ascending limb where calcium transport is passive and paracellular, calcium transport in the DCT is entirely active, transcellular, and regulated. When thiazides inhibit NCC, sodium entry across the apical membrane is curtailed. Concurrently, the basolateral Na+/K+-ATPase continues pumping sodium out of the DCT cell, leading to marked depletion of intracellular sodium concentration ([Na+]i). This steepens the electrochemical gradient across the basolateral membrane for sodium entry, which dramatically accelerates the activity of the basolateral 3Na+/Ca2+ exchanger (NCX1) and the plasma membrane Ca2+-ATPase (PMCA1b). As NCX1 pumps intracellular calcium out into the interstitial blood in exchange for sodium, intracellular calcium drops, which dramatically widens the chemical gradient driving apical calcium influx via transient receptor potential vanilloid 5 (TRPV5) channels. Intracellular calcium is then shuttled across the cytoplasm bound to calbindin-D28k to basolateral NCX1. Furthermore, thiazide-induced mild extracellular fluid volume contraction enhances non-specific isosmotic proximal tubular sodium and calcium reabsorption. The net clinical result is hypocalciuria (reduced urinary calcium) and potential hypercalcemia. This calcium-sparing mechanism makes thiazides uniquely advantageous in patients with recurrent calcium oxalate nephrolithiasis and osteoporosis, while posing a risk of unmasking subclinical primary hyperparathyroidism.",
      drugIds: ["hctz"],
    },
    {
      id: "clin-renal-triple-whammy-hemodynamics",
      lane: "clinical",
      kicker: "Renal Hemodynamics & Acute Kidney Injury",
      title: "The 'Triple Whammy' Hemodynamic Collapse: ACEi/ARB + NSAID + Diuretic",
      prompt: "The co-prescription of an ACE inhibitor (or ARB), an NSAID, and a diuretic is a notoriously high-risk triad colloquially known as the 'Triple Whammy'.",
      ask: "What distinct physiological mechanisms on afferent/efferent arteriolar tone and intravascular volume converge to catastrophically reduce intraglomerular filtration pressure (Pgc) and precipitate acute kidney injury?",
      choices: [
        {
          id: "convergent-afferent-constriction-efferent-dilation-and-volume-depletion",
          label: "Diuretics induce intravascular volume contraction; NSAIDs block prostaglandin synthesis (PGI2/PGE2) preventing compensatory afferent arteriolar vasodilation; ACE inhibitors/ARBs block angiotensin II-mediated efferent arteriolar vasoconstriction, collapsing the transcapillary hydraulic pressure gradient (Pgc) and GFR",
        },
        {
          id: "direct-tubulotoxic-crystallization-in-the-collecting-duct",
          label: "The three agents form insoluble microcrystals in distal tubules under acidic pH, causing physical obstructive nephropathy",
        },
        {
          id: "synergistic-activation-of-renal-thromboxane-a2-receptors",
          label: "The combination synergistically upregulates systemic thromboxane A2 synthases, triggering diffuse cortical necrosis and renal vein thrombosis",
        },
        {
          id: "antagonism-of-endothelin-receptors-causing-diffuse-renal-ischemia",
          label: "NSAIDs and ACE inhibitors competitively block ETA/ETB receptors, preventing autoregulatory renal blood flow maintenance",
        },
      ],
      correct: "convergent-afferent-constriction-efferent-dilation-and-volume-depletion",
      answer: "Glomerular filtration rate (GFR) is primarily determined by the glomerular capillary hydraulic pressure (Pgc), which is finely regulated by bidirectional myogenic and humoral autoregulation of afferent and efferent arteriolar tone. Under normal physiological conditions, renal perfusion is maintained across wide mean arterial pressure ranges. However, when intravascular volume is depleted—such as by loop or thiazide diuretics—renal perfusion drops, and the kidney depends critically on two counter-regulatory autoregulatory pathways to preserve Pgc: 1) Afferent arteriolar vasodilation, mediated by locally synthesized vasodilatory prostaglandins (prostacyclin PGI2 and PGE2 via COX-1 and COX-2) in response to sympathetic and renin stimulation, which minimizes pre-glomerular resistance; and 2) Efferent arteriolar vasoconstriction, mediated by angiotensin II acting on AT1 receptors, which increases post-glomerular resistance and acts like a 'dam' to sustain intraglomerular filtration pressure. In the 'Triple Whammy' triad: 1) The diuretic reduces circulating plasma volume and renal blood flow; 2) The NSAID inhibits cyclooxygenases, suppressing prostaglandin synthesis and causing paradoxical afferent vasoconstriction (choking off inflow); 3) The ACE inhibitor or ARB abolishes angiotensin II production or AT1 signaling, dilating the efferent arteriole (relieving downstream outflow resistance). With inflow restricted and downstream outflow wide open in a volume-depleted kidney, the glomerular capillary hydraulic pressure (Pgc) collapses below the threshold needed for net ultrafiltration, resulting in precipitous hemodynamic acute kidney injury (AKI), prerenal azotemia, and hyperkalemia. Clinical guidelines urge avoiding this combination, especially in elderly patients, chronic kidney disease (CKD), or heart failure.",
      drugIds: ["lisinopril", "ibuprofen", "furosemide"],
    },
    {
      id: "clin-renal-enac-lithium-ndi-amiloride",
      lane: "clinical",
      kicker: "Renal Tubular Secretion & Toxicology",
      title: "Lithium-Induced Nephrogenic Diabetes Insipidus & ENaC-Mediated Amiloride Rescue",
      prompt: "Chronic lithium therapy frequently causes nephrogenic diabetes insipidus (NDI) manifested by polyuria, polydipsia, and impaired urinary concentrating ability refractory to exogenous vasopressin.",
      ask: "How does lithium gain access to collecting duct principal cells, what intracellular signaling cascade does it disrupt, and why is amiloride the specific mechanistically targeted pharmacotherapy?",
      choices: [
        {
          id: "lithium-enters-via-enac-inhibits-gsk3beta-downregulating-aqp2-amiloride-blocks-enac-entry",
          label: "Lithium is transported into principal cells through apical epithelial sodium channels (ENaC), where it accumulates and inhibits glycogen synthase kinase-3beta (GSK-3beta) and adenylyl cyclase, degrading aquaporin-2 (AQP2) water channels; amiloride selectively blocks apical ENaC, preventing cellular lithium uptake and preserving water reabsorption",
        },
        {
          id: "lithium-cleaves-v2-vasopressin-receptors-on-basolateral-membrane",
          label: "Lithium acts as an extracellular metalloproteinase that enzymatically cleaves V2 vasopressin receptors off the basolateral membrane; amiloride inhibits this enzyme",
        },
        {
          id: "lithium-crystallizes-inside-aquaporin-1-tetramers-in-the-loop-of-henle",
          label: "Lithium forms macro-complexes inside AQP1 channels in the thin descending limb; amiloride chelates lithium to dissolve intratubular precipitates",
        },
        {
          id: "lithium-stimulates-pendrin-mediated-bicarbonate-secretion-in-intercalated-cells",
          label: "Lithium binds apical pendrin in Type B intercalated cells, generating massive osmotic diuresis that washes out medullary tonicity",
        },
      ],
      correct: "lithium-enters-via-enac-inhibits-gsk3beta-downregulating-aqp2-amiloride-blocks-enac-entry",
      answer: "Lithium is a monovalent cation with a hydrated radius and chemical properties similar to sodium. In the cortical collecting duct, apical epithelial sodium channels (ENaC) on principal cells cannot distinguish lithium from sodium, allowing lithium to pass freely from the tubular lumen into the cytoplasm down an electrochemical gradient. However, unlike sodium, lithium cannot be efficiently extruded across the basolateral membrane by the Na+/K+-ATPase (which has low affinity for lithium), leading to intracellular lithium trapping and accumulation in principal cells. Once concentrated inside the cell, lithium exerts toxic molecular actions: it directly inhibits adenylyl cyclase (diminishing cAMP generation in response to arginine vasopressin binding to basolateral V2 receptors) and potently inhibits glycogen synthase kinase-3beta (GSK-3beta). This disruption suppresses transcription and triggers lysosomal degradation and impaired apical trafficking of aquaporin-2 (AQP2) water channels. Deprived of apical AQP2 channels, the collecting duct becomes impermeable to water, leading to inability to concentrate urine, severe hypotonic polyuria, and nephrogenic diabetes insipidus (NDI). Amiloride is the definitive, mechanism-targeted pharmacotherapy for lithium-induced NDI: as a selective potassium-sparing ENaC blocker, amiloride blocks the apical pore of ENaC, directly shutting the cellular gateway through which lithium enters principal cells. By halting intracellular lithium influx, principal cells regenerate cAMP signaling and restore apical AQP2 density, reversing polyuria without requiring lithium discontinuation when psychiatric stability is critical. Thiazides are also used in NDI via volume contraction-induced proximal reabsorption, but thiazides reduce lithium clearance and can cause lithium toxicity, whereas amiloride maintains lithium excretion.",
      drugIds: ["lithium", "amiloride"],
    },
    {
      id: "clin-cyp-tdi-suicidal-mbi-recovery-kinetics",
      lane: "clinical",
      kicker: "Cytochrome P450 Kinetics & Inactivation",
      title: "Time-Dependent & Mechanism-Based Inactivation (TDI/MBI): Suicide Inhibition & Enzyme Resynthesis",
      prompt: "Certain drugs act as mechanism-based 'suicide' inhibitors of cytochrome P450 enzymes (e.g., clarithromycin, erythromycin, diltiazem, ritonavir, bergamottin in grapefruit juice).",
      ask: "What distinguishes mechanism-based time-dependent inhibition (TDI) from classical reversible competitive inhibition, and what kinetic parameter dictates the recovery of metabolic clearance after inhibitor withdrawal?",
      choices: [
        {
          id: "catalytic-bioactivation-to-quasi-irreversible-metabolite-intermediate-complex-recovery-depends-on-de-novo-cyp-resynthesis-kdeg",
          label: "The perpetrator is bioactivated by the CYP into a reactive intermediate that forms a stable, quasi-irreversible metabolite-intermediate complex (MIC) or covalently alkylates the apoprotein/heme; inhibition is time-dependent and clearance recovery requires de novo enzyme resynthesis governed by the CYP degradation rate constant (kdeg)",
        },
        {
          id: "rapid-reversible-active-site-competition-cleared-within-three-half-lives-of-the-inhibitor",
          label: "The inhibitor binds reversibly to the substrate pocket with high affinity (low Ki), and normal metabolic clearance recovers immediately as soon as systemic drug concentration drops below Ki (within 1-2 drug half-lives)",
        },
        {
          id: "epigenetic-methylation-of-the-cyp-promoter-requiring-histone-demethylase-turnover",
          label: "The inhibitor methylates CpG islands in the CYP3A4 promoter, requiring nuclear histone demethylase turnover over 6 months to reactivate gene transcription",
        },
        {
          id: "depletion-of-hepatic-nadph-cytochrome-p450-oxidoreductase-cofactor-pools",
          label: "The inhibitor selectively drains hepatic intracellular NADPH pools, paralyzing electron transfer to all Phase I monooxygenases simultaneously",
        },
      ],
      correct: "catalytic-bioactivation-to-quasi-irreversible-metabolite-intermediate-complex-recovery-depends-on-de-novo-cyp-resynthesis-kdeg",
      answer: "Cytochrome P450 inhibition is classically divided into reversible inhibition (competitive, non-competitive, or uncompetitive) and time-dependent inhibition (TDI). In reversible competitive inhibition, the inhibitor binds non-covalently to the active site; once the inhibitor is cleared from systemic circulation (governed by its own pharmacokinetic elimination half-life), normal catalytic activity instantly returns. In contrast, mechanism-based inactivation (MBI), a specialized form of TDI, represents 'suicide inhibition'. The CYP enzyme recognizes the perpetrator (such as clarithromycin, diltiazem, or grapefruit furanocoumarins) as a substrate and catalytically oxidizes it. During catalytic turnover, the parent drug is converted into an electrophilic reactive intermediate (e.g., a nitrosoalkane, carbene, or furan epoxide). This reactive species either: 1) Covalently alkylates the CYP apoprotein or prosthetic heme group; or 2) Forms an ultra-stable, quasi-irreversible coordinate covalent bond with the catalytic ferrous (Fe2+) heme iron atom, known as a Metabolite-Intermediate Complex (MIC). The modified CYP enzyme is permanently inactivated and catalytically dead. Crucially, the extent of inhibition accumulates progressively over time with repeated dosing (dictated by the inactivation rate constant kinact and apparent affinity KI), even as drug concentrations fluctuate. Furthermore, because the enzyme is permanently disabled, drug elimination does NOT recover when the inhibitor is cleared from the bloodstream. Instead, metabolic clearance can only be restored through the transcription, translation, and de novo folding of brand new CYP enzyme proteins. The rate of functional recovery is governed strictly by the physiological degradation/synthesis turnover rate constant (kdeg) of that specific CYP isoform. For hepatic CYP3A4, kdeg is approximately 0.019–0.03 h^-1 (half-life of 24–40 hours), requiring 3 to 7 days after the last dose for metabolic activity to return to baseline; for intestinal CYP3A4, recovery requires enterocyte turnover (3–5 days). Recognizing MBI is vital in clinical practice: a sensitive CYP3A4 substrate (such as midazolam or tacrolimus) co-administered days after discontinuing clarithromycin will still experience profound toxicity due to residual enzyme depletion.",
      drugIds: ["clarithromycin", "midazolam"],
    },
    {
      id: "clin-cyp-pxr-car-ahr-nuclear-induction-lag",
      lane: "clinical",
      kicker: "Cytochrome P450 Kinetics & Transcriptional Induction",
      title: "Nuclear Receptor-Mediated Induction (PXR, CAR, AhR): The Pharmacokinetic Lag & Decay Paradox",
      prompt: "Potent xenobiotics like rifampin, carbamazepine, St. John's wort, phenytoin, and polycyclic aromatic hydrocarbons in tobacco smoke induce cytochrome P450 and transporter expression.",
      ask: "What molecular mechanism drives transcriptional induction via PXR, CAR, and AhR, and why is there a characteristic 3–7 day onset lag and prolonged 2–3 week washout decay in clinical practice?",
      choices: [
        {
          id: "ligand-activation-of-nuclear-receptors-drives-denovo-mrna-and-protein-synthesis-lag-and-decay-reflect-cyp-half-life",
          label: "Xenobiotics bind nuclear receptors (PXR for CYP3A4/2C9, CAR for CYP2B6/2C19, AhR for CYP1A2) that heterodimerize with RXR and bind XRE/PBREM response elements; maximal induction requires days for transcription and translation, and offset is delayed because induced enzyme mass must naturally degrade over its 2-3 week half-life",
        },
        {
          id: "allosteric-activation-of-pre-existing-cyp-tetramers-in-the-smooth-endoplasmic-reticulum",
          label: "Inducers act as positive allosteric modulators directly on pre-existing CYP enzymes, speeding up catalytic turnover instantly within minutes of first ingestion",
        },
        {
          id: "stabilization-of-cyp-apoproteins-against-ubiquitin-proteasomal-degradation",
          label: "Inducers inhibit the 26S proteasome in hepatocytes, preventing basal protein degradation without altering mRNA transcription",
        },
        {
          id: "upregulation-of-mitochondrial-cytochrome-c-oxidase-complex-iv",
          label: "Inducers transfer electrons directly into mitochondrial Complex IV, causing secondary spillover of ATP into smooth endoplasmic reticulum ribosomes",
        },
      ],
      correct: "ligand-activation-of-nuclear-receptors-drives-denovo-mrna-and-protein-synthesis-lag-and-decay-reflect-cyp-half-life",
      answer: "Unlike enzymatic inhibition which occurs rapidly upon target binding, CYP induction is a nuclear, genomic process that requires de novo protein synthesis. Perpetrators act as high-affinity ligands for specific nuclear receptor superfamilies: 1) Pregnane X Receptor (PXR, NR1I2): Activated by rifampin, St. John's wort (hyperforin), carbamazepine, and phenytoin. Ligand-bound PXR translocates to the nucleus, heterodimerizes with the Retinoid X Receptor alpha (RXRalpha), and binds xenobiotic response elements (XRE / ER6 motifs) in promoter regions of CYP3A4, CYP2C9, and P-glycoprotein (ABCB1). 2) Constitutive Androstane Receptor (CAR, NR1I3): Activated by phenobarbital and phenytoin, translocates to upregulate CYP2B6, CYP2C19, and UGT1A1 via phenobarbital-responsive enhancer modules (PBREM). 3) Aryl Hydrocarbon Receptor (AhR): Activated by planar aromatic hydrocarbons (polycyclic aromatic hydrocarbons in tobacco smoke and charbroiled meat), inducing CYP1A1, CYP1A2, and CYP1B1. Because this pathway requires chromatin remodeling, mRNA transcription, splicing, cytoplasmic translation, heme cofactor incorporation, and endoplasmic reticulum membrane insertion, induction exhibits a pronounced pharmacokinetic lag: maximal inductive effect is rarely reached before 7 to 14 days of sustained perpetrator administration. Conversely, when the inducer is stopped, clearance does not immediately normalize. The expanded pool of newly synthesized enzyme proteins remains catalytic until cleared by endogenous degradation processes, governed by the first-order turnover rate constant (kdeg). As a result, the 'de-induction' phase typically takes 2 to 3 weeks (and up to 4 weeks for long-lived inducers like rifampin or carbamazepine) to return to baseline metabolic clearance. Clinically, if a victim drug dose (e.g., methadone, warfarin, oral contraceptives) was escalated to compensate for induction, failing to taper the victim dose as the inducer is withdrawn will precipitate severe toxicity as de-induction slowly clears.",
      drugIds: ["rifampin", "midazolam"],
    },
    {
      id: "clin-cns-antihistamine-1st-vs-2nd-gen-psa",
      lane: "clinical",
      kicker: "Blood-Brain Barrier & Neuro-Pharmacokinetics",
      title: "Antihistamine Generation Divergence: Polar Surface Area, Lipophilicity & P-gp Efflux",
      prompt: "First-generation H1-antihistamines (diphenhydramine, hydroxyzine, chlorpheniramine) cause marked sedation and cognitive impairment, whereas second-generation agents (loratadine, fexofenadine, cetirizine) are non-sedating.",
      ask: "What physicochemical properties and blood-brain barrier transport characteristics govern why second-generation antihistamines are excluded from the central nervous system?",
      choices: [
        {
          id: "higher-topological-polar-surface-area-zwitterionic-charge-and-p-glycoprotein-efflux-prevent-cns-penetration",
          label: "Second-generation agents possess higher topological polar surface area (TPSA >90-140 Å²), zwitterionic carboxylate charges at physiological pH, and high substrate affinity for active P-glycoprotein (ABCB1) efflux pumps at brain capillary endothelial cells, whereas 1st-gen agents are lipophilic, low-TPSA tertiary amines that rapidly cross by passive transcellular diffusion",
        },
        {
          id: "first-generation-agents-selectively-bind-h3-autoreceptors-in-the-cortex",
          label: "First-generation agents have 1,000-fold higher affinity for H3 autoreceptors, whereas second-generation agents only bind peripheral H4 receptors",
        },
        {
          id: "second-generation-agents-are-hydrolyzed-by-plasma-cholinesterases-before-reaching-the-carotid-artery",
          label: "Second-generation antihistamines are prodrugs that are exclusively cleaved in respiratory epithelium and never enter systemic circulation",
        },
        {
          id: "first-generation-agents-open-tight-junction-claudin-5-strands-to-enter-csf",
          label: "First-generation antihistamines directly disrupt claudin-5 and occludin tight-junction complexes, creating physical paracellular pores across brain capillaries",
        },
      ],
      correct: "higher-topological-polar-surface-area-zwitterionic-charge-and-p-glycoprotein-efflux-prevent-cns-penetration",
      answer: "The blood-brain barrier (BBB) is composed of brain capillary endothelial cells connected by continuous, high-resistance tight junctions (claudin-5, occludin, ZO-1), wrapped by pericytes and astrocytic end-feet, with no fenestrations. For a small molecule to penetrate the BBB via passive transcellular diffusion, it must satisfy strict physicochemical rules of neuro-pharmacokinetics: low molecular weight (MW <400–450 Da), moderate lipophilicity (logP 1.5–3.5), few hydrogen bond donors (<3) and acceptors (<7), and critically, a low Topological Polar Surface Area (TPSA <70–90 Å²). First-generation H1-antihistamines (such as diphenhydramine) are small, highly lipophilic (logP ~3.3) molecules with low TPSA (~12.5 Å²) and uncharged/lipophilic tertiary amine structures that rapidly diffuse passively across endothelial luminal membranes. In the brain, they occupy 50–70% of cortical H1 receptors at therapeutic doses, disrupting histamine-mediated arousal from the tuberomammillary nucleus, and cross-react with muscarinic M1 receptors to cause sedation, psychomotor slowing, and delirium. In contrast, second-generation H1-antihistamines were rationally engineered to avoid CNS penetration: 1) Elevated Polar Surface Area: Carboxylated derivatives like cetirizine (the carboxylic acid metabolite of hydroxyzine) and fexofenadine possess TPSA >50–90 Å²; 2) Ionization / Zwitterionic Charge: At physiological pH (7.4), carboxyl groups are ionized, forming zwitterionic species that face enormous desolvation energy barriers when attempting to partition into the lipid bilayer; 3) Active Efflux: Second-generation agents (notably fexofenadine and cetirizine) are high-affinity substrates for luminal P-glycoprotein (ABCB1) and BCRP (ABCG2) efflux pumps. Any small fraction of drug that passively diffuses into the endothelial cell membrane is instantly pumped back into the capillary lumen. Consequently, brain H1 receptor occupancy for second-generation agents remains under 10–15% at approved doses, preserving cognitive alertness.",
      drugIds: ["diphenhydramine", "loratadine"],
    },
    {
      id: "clin-cns-meningitis-tight-junction-permeability",
      lane: "clinical",
      kicker: "Blood-Brain Barrier & Neuro-Infectious Pharmacology",
      title: "Bacterial Meningitis BBB Disruption: Claudin-5 Breakdown & Adjuvant Dexamethasone Timing",
      prompt: "In acute bacterial meningitis, therapeutic concentrations of hydrophilic beta-lactams (e.g., ceftriaxone, ampicillin) and glycopeptides (vancomycin) achieve bactericidal CSF levels despite poor baseline CNS penetration.",
      ask: "How does acute neuro-inflammation alter blood-brain barrier permeability, and why must adjuvant dexamethasone be administered prior to or concurrently with the first antibiotic dose?",
      choices: [
        {
          id: "inflammatory-cytokines-disrupt-tight-junctions-to-allow-paracellular-entry-early-steroids-blunt-subsequent-bacteriolytic-swelling-without-prematurely-blocking-drug-penetration",
          label: "Bacterial peptidoglycans and cytokines (TNF-alpha, IL-1beta) downregulate claudin-5 and occludin, creating paracellular leaks that permit hydrophilic drug entry; adjuvant dexamethasone must precede or coincide with antibiotics because rapid antibiotic-induced bacterial lysis triggers a secondary inflammatory surge that causes permanent cochlear and neurological damage",
        },
        {
          id: "bacteria-upregulate-endothelial-oatp-transporters-which-dexamethasone-blocks",
          label: "Bacterial exotoxins induce brain capillary OATP1A2 influx transporters, and dexamethasone is given to shut down these transporters before toxic antibiotic accumulation occurs",
        },
        {
          id: "antibiotics-cannot-cross-unless-dexamethasone-physically-cleaves-pericyte-membranes",
          label: "Beta-lactams require corticosteroid cleavage of pericyte basement membranes to establish a mechanical fluid channel into the subarachnoid space",
        },
        {
          id: "dexamethasone-is-given-exclusively-to-prevent-acute-adrenal-crisis-from-waterhouse-friderichsen-syndrome",
          label: "Dexamethasone has no CNS or blood-brain barrier effects and is prescribed solely as systemic hormone replacement therapy for adrenal hemorrhage",
        },
      ],
      correct: "inflammatory-cytokines-disrupt-tight-junctions-to-allow-paracellular-entry-early-steroids-blunt-subsequent-bacteriolytic-swelling-without-prematurely-blocking-drug-penetration",
      answer: "Under basal healthy conditions, the blood-brain barrier severely excludes hydrophilic, highly polar, or large molecular weight antimicrobials: ceftriaxone CSF penetration is <1–2%, and vancomycin (MW ~1448 Da, high TPSA) achieves negligible CSF concentrations (<1%). However, during acute bacterial meningitis (e.g., Streptococcus pneumoniae, Neisseria meningitidis), bacterial pathogens invade the subarachnoid space and release pathogen-associated molecular patterns (PAMPs like lipopolysaccharide and peptidoglycan). Resident microglia and perivascular macrophages release massive bursts of pro-inflammatory cytokines, specifically tumor necrosis factor-alpha (TNF-alpha), interleukin-1beta (IL-1beta), and matrix metalloproteinases (MMP-9). These mediators disrupt endothelial tight-junction complexes by inducing phosphorylation, internalization, and degradation of claudin-5, occludin, and zonula occludens-1 (ZO-1). The resulting loss of tight-junction integrity creates fenestrated-like paracellular permeability leaks, markedly increasing CSF penetration of hydrophilic beta-lactams and vancomycin (CSF-to-serum ratios rise to 10–20%). However, administering bactericidal antibiotics causes rapid, massive bacterial lysis within hours, releasing huge waves of bacterial cell-wall fragments that trigger an even more destructive secondary inflammatory cascade. This secondary storm drives vasogenic cerebral edema, intracranial hypertension, neuronal apoptosis, and purulent exudate in the cochlear aqueduct causing sensorineural hearing loss. Adjuvant dexamethasone attenuates this disastrous secondary cytokine burst by suppressing NF-kappaB transcription. Pivotal trials and guidelines (such as IDSA and ESCMID guidelines) demonstrate that dexamethasone must be administered prior to or concurrently with the first dose of antibiotics; administering steroids after antibiotics produces zero clinical benefit because the initial bacteriolytic inflammatory cascade has already been triggered. Note: As dexamethasone seals tight junctions over subsequent days, vancomycin CSF penetration may decline, necessitating therapeutic monitoring and high-dose targets.",
      drugIds: ["ceftriaxone", "vancomycin", "dexamethasone"],
    },
    {
      id: "clin-hdmtx-leucovorin-nomogram",
      lane: "clinical",
      kicker: "Oncology Pharmacology & Rescue Nomograms",
      title: "High-Dose Methotrexate (HDMTX) Kinetics & Leucovorin Rescue Safeguards",
      prompt: "A patient with osteosarcoma receives high-dose methotrexate (HDMTX, 12 g/m²). At 48 hours post-infusion, the serum methotrexate level is 2.5 µmol/L (canonical target ≤ 1.0 µmol/L), indicating delayed elimination.",
      ask: "What pharmacokinetic and transporter mechanisms govern Leucovorin rescue dose escalation, and why is intravenous administration strictly required for high-dose rescue?",
      choices: [
        {
          id: "leucovorin-rfc1-saturation-iv-requirement",
          label: "Intestinal mucosal reduced folate carrier (RFC-1) saturates at oral doses > 25 mg; higher rescue doses (e.g., 50–150 mg/m²) must be given intravenously to bypass saturated absorption and restore intracellular 5,10-CH2-THF pools for purine and thymidylate synthesis",
        },
        {
          id: "leucovorin-cleaves-methotrexate-directly-in-blood",
          label: "Leucovorin acts as a direct chemical neutralizer that covalently hydrolyzes methotrexate in systemic circulation, independent of folate enzyme pathways",
        },
        {
          id: "oral-leucovorin-is-chelated-by-urinary-bicarbonate",
          label: "Urine alkalinization with sodium bicarbonate inactivates oral leucovorin in the gut lumen, preventing systemic bioavailability",
        },
        {
          id: "leucovorin-reverses-methotrexate-by-inducing-cyp3a4",
          label: "Leucovorin is a potent CYP3A4 inducer that accelerates methotrexate hepatic clearance into inactive metabolites",
        },
      ],
      correct: "leucovorin-rfc1-saturation-iv-requirement",
      answer: "Methotrexate is a competitive antagonist of dihydrofolate reductase (DHFR), depleting tetrahydrofolate (THF) pools necessary for purine and thymidylate synthesis, causing cell death. High-dose methotrexate (HDMTX, ≥ 1 g/m²) is followed by Leucovorin (folinic acid / 5-formyl-THF) rescue to salvage non-malignant tissues (gastrointestinal mucosa, bone marrow). Leucovorin bypasses DHFR blockade by converting directly into active folate cofactors without requiring DHFR activity. Intestinal absorption of folinic acid is mediated by the saturable reduced folate carrier 1 (RFC-1 / SLC19A1). At oral doses > 25 mg, RFC-1 becomes completely saturated, and oral bioavailability collapses precipitously. Consequently, whenever delayed elimination requires escalated Leucovorin doses (e.g. 50–150 mg/m² q3–6h), administration MUST be intravenous. Furthermore, rescue must be timed carefully (initiated 24–42h post-infusion); administering Leucovorin < 24h blunts antitumor efficacy, while delaying rescue > 48h results in irreversible systemic toxicity. If extreme delayed clearance (> 2 SD above mean) occurs alongside acute renal injury, Glucarpidase (Voraxaze) must be considered, with the critical rule that Leucovorin must NOT be given within 2 hours before or after Glucarpidase because Glucarpidase also hydrolyzes folinic acid.",
      drugIds: ["methotrexate"],
    },
    {
      id: "clin-cefepime-neurotoxicity-gaba",
      lane: "clinical",
      kicker: "Infectious Disease & Neurotoxicity",
      title: "Cefepime Neurotoxicity: GABA-A Competitive Antagonism & Dialysis Timing",
      prompt: "A patient with CKD (eGFR 22 mL/min) receiving IV cefepime 2g q8h for hospital-acquired pneumonia develops confusion, myoclonus, asterixis, and lethargy on day 4 of therapy. An urgent EEG reveals bilateral synchronous Generalized Periodic Discharges (GPDs) with triphasic morphology at 1–2 Hz.",
      ask: "What is the molecular mechanism of cefepime-induced neurotoxicity, and how does intermittent hemodialysis impact clearance?",
      choices: [
        {
          id: "cefepime-gaba-a-competitive-antagonism-hd-clearance",
          label: "Cefepime crosses the blood-brain barrier and competitively antagonizes GABA-A receptors, reducing inhibitory chloride influx; unadjusted renal dosing accumulates CSF levels, while intermittent hemodialysis clears ~70% per 3h session (mandating post-HD dosing)",
        },
        {
          id: "cefepime-irreversibly-inhibits-acetylcholinesterase",
          label: "Cefepime phosphorylates acetylcholinesterase in the neuromuscular junction, triggering acute cholinergic crisis and status epilepticus",
        },
        {
          id: "cefepime-selectively-stimulates-nmda-receptors-via-glutamate-mimicry",
          label: "Cefepime is a glutamate analogue that directly activates post-synaptic NMDA receptors, causing excitotoxic seizure discharges",
        },
        {
          id: "cefepime-has-no-dialytic-clearance-due-to-99-percent-protein-binding",
          label: "Cefepime is >99% bound to plasma albumin with a massive volume of distribution (>500 L), precluding clearance by hemodialysis",
        },
      ],
      correct: "cefepime-gaba-a-competitive-antagonism-hd-clearance",
      answer: "Cefepime has the highest propensity for neurotoxicity among fourth-generation cephalosporins because of its unique physicochemical ability to cross the blood-brain barrier combined with concentration-dependent competitive antagonism of gamma-aminobutyric acid type A (GABA-A) receptors. By blocking GABA-mediated chloride influx, cefepime decreases inhibitory post-synaptic potentials, driving neuronal hyperexcitability that manifests clinically as non-convulsive status epilepticus (NCSE), encephalopathy, myoclonus, asterixis, and coma. Over 80–90% of cefepime is eliminated unchanged via glomerular filtration; in renal impairment (CrCl < 50 mL/min or ESRD on dialysis) without aggressive dose adjustment, serum and CSF trough levels surge 3- to 10-fold. The diagnostic hallmark on continuous EEG is bilateral synchronous generalized periodic discharges (GPDs) or periodic lateralized epileptiform discharges (PLEDs) at 1–2 Hz with triphasic morphology. Cefepime has low molecular weight (480 Da), low plasma protein binding (~20%), and low volume of distribution (0.2–0.3 L/kg), rendering it highly dialyzable: a single 3-hour high-flux intermittent hemodialysis session clears ~68–70% of circulating cefepime. Discontinuing the drug or renal adjustment and emergent hemodialysis yields rapid clinical and electroencephalographic resolution within 48–72 hours.",
      drugIds: ["cefepime"],
    },
    {
      id: "clin-daptomycin-statin-myopathy",
      lane: "clinical",
      kicker: "Antimicrobial Stewardship & Muscle Safety",
      title: "Daptomycin × HMG-CoA Reductase Inhibitor Collision: Sarcolemmal Toxicity & CPK Rails",
      prompt: "A patient hospitalized with MRSA bacteremia is initiated on high-dose daptomycin (8–10 mg/kg IV daily) while continuing their outpatient regimen of atorvastatin 80 mg daily.",
      ask: "What is the clinical rationale for holding statins during daptomycin therapy, and what creatine kinase (CPK) monitoring thresholds govern discontinuation?",
      choices: [
        {
          id: "daptomycin-sarcolemma-statin-synergy-hold-rule",
          label: "Daptomycin disrupts human skeletal muscle sarcolemma in a calcium-dependent manner; stacking with statins causes synergistic myotoxicity and rhabdomyolysis, requiring routine holding of statin therapy and discontinuing daptomycin if CPK > 1,000 U/L with symptoms or > 2,000 U/L without symptoms",
        },
        {
          id: "statins-inhibit-daptomycin-antibacterial-potency",
          label: "Statins bind daptomycin in the systemic circulation, preventing its calcium-dependent oligomerization in bacterial cell walls and causing clinical treatment failure",
        },
        {
          id: "daptomycin-competitively-inhibits-hmg-coa-reductase",
          label: "Daptomycin has intrinsic HMG-CoA reductase inhibitor activity, leading to dangerous systemic cholesterol depletion",
        },
        {
          id: "statins-cause-pulmonary-surfactant-inactivation",
          label: "Statins inactivate alveolar pulmonary surfactant, preventing daptomycin from clearing hospital-acquired MRSA pneumonia",
        },
      ],
      correct: "daptomycin-sarcolemma-statin-synergy-hold-rule",
      answer: "Daptomycin is a cyclic lipopeptide that inserts into bacterial cell membranes in the presence of physiological calcium ions, oligomerizing to form ion-permeable channels that cause rapid membrane depolarization and bacterial cell death. However, daptomycin also interacts with mammalian skeletal muscle sarcolemma, causing subclinical or overt myocyte disruption. HMG-CoA reductase inhibitors (statins) independently produce myopathy by depleting intramuscular mevalonate and coenzyme Q10 (ubiquinone) pools, impairing mitochondrial respiration. Combining daptomycin with a statin produces synergistic, additive sarcolemmal injury that sharply increases the risk of severe creatine kinase (CK / CPK) elevation, myopathy, and life-threatening rhabdomyolysis with myoglobinuric acute kidney injury. Major infectious disease guidelines and FDA prescribing information recommend proactively holding all statin therapy for the entire duration of daptomycin treatment. Baseline and weekly CPK monitoring is mandatory (twice-weekly in patients with renal impairment CrCl < 30 mL/min or if statin continuation is clinically unavoidable). Daptomycin must be discontinued if CPK exceeds 1,000 U/L (5× ULN) with unexplained muscle pain, tenderness, or weakness, or if CPK exceeds 2,000 U/L (10× ULN) even in the absence of symptoms. Clinical Pearl: Daptomycin is irreversibly bound and inactivated by pulmonary surfactant, making it completely ineffective for MRSA pneumonia.",
      drugIds: ["daptomycin", "atorvastatin"],
    },
    {
      id: "clin-phenytoin-michaelis-menten-saturation",
      lane: "clinical",
      kicker: "Clinical Pharmacokinetics & Neurology",
      title: "Phenytoin Michaelis-Menten Saturation Kinetics & The Valproate Double-Hit Paradox",
      prompt: "A patient with focal epilepsy maintained on phenytoin 300 mg daily has a steady-state level of 12 µg/mL. Due to persistent seizures, the dose is increased by 20% to 360 mg daily. Two weeks later, the patient presents to the emergency department with severe ataxia, coarse horizontal nystagmus, and lethargy, with a total serum level of 28 µg/mL. Furthermore, valproic acid had recently been added.",
      ask: "What pharmacokinetic principle explains the disproportionate level surge with modest dose titration, and how does valproic acid create a clinical total-level paradox?",
      choices: [
        {
          id: "phenytoin-saturation-clearance-collapse-valproate-paradox",
          label: "Phenytoin follows nonlinear Michaelis-Menten kinetics where clearance collapses as concentration approaches Km (~4 µg/mL); small dose jumps cause exponential level surges, and valproate displaces phenytoin from albumin while inhibiting CYP2C9, causing toxic free levels despite falsely normal total levels",
        },
        {
          id: "phenytoin-undergoes-irreversible-first-order-autoinduction",
          label: "Phenytoin autoinduces CYP2C9 metabolism, which paradoxically accelerates absorption and triples bioavailability at higher doses",
        },
        {
          id: "valproate-cleaves-phenytoin-capsules-in-the-stomach",
          label: "Valproic acid lowers gastric pH, which hydrolyzes the phenytoin capsule and doubles systemic oral bioavailability",
        },
        {
          id: "phenytoin-levels-are-governed-entirely-by-glomerular-filtration",
          label: "Phenytoin is 100% cleared by renal filtration, and the dose increase caused acute tubular saturation and complete cessation of renal clearance",
        },
      ],
      correct: "phenytoin-saturation-clearance-collapse-valproate-paradox",
      answer: "Phenytoin exhibits capacity-limited, saturable Michaelis-Menten elimination governed by hepatic CYP2C9 and CYP2C19. The elimination rate follows: R = (Vmax · Css) / (Km + Css), and clearance is concentration-dependent: CL = Vmax / (Km + C). The population mean Michaelis constant Km is ~4 µg/mL (range 2–8 µg/mL), which is well below the target therapeutic range of 10–20 µg/mL! Consequently, at therapeutic concentrations, the metabolizing enzymes are already 70–80% saturated. As steady-state concentration increases, clearance collapses from >80 L/day at subtherapeutic levels to ~25 L/day at 15 µg/mL and <13 L/day at 35 µg/mL. In this zero-order transition zone, clearance cannot increase to match higher intake, so a modest 10–20% dose increase (e.g. 300 mg to 360 mg/day) produces an exponential 200–300% level jump, catapulting the patient into acute neurotoxicity (nystagmus >20 µg/mL, ataxia >30 µg/mL, stupor/coma >40 µg/mL). When valproic acid is co-administered, it delivers a 'Double-Hit': (1) valproate competitively displaces phenytoin from plasma albumin binding sites, expanding the free fraction fu from 10% to 25–35%, and (2) valproate inhibits CYP2C9 metabolism. This creates the classic Clinical Paradox: total serum phenytoin appears deceptively normal or even low (e.g. 9 µg/mL), but active unbound free phenytoin is dangerously elevated (e.g. 2.8 µg/mL, normal 1–2 µg/mL). Clinicians unaware of this paradox risk mistakenly increasing the dose, precipitating fatal toxicity.",
      drugIds: ["phenytoin", "valproate"],
    },
    {
      id: "clin-teratogenic-critical-windows",
      lane: "clinical",
      kicker: "Obstetrics & Teratology",
      title: "Gestational Critical Windows: Organogenesis vs Fetogenesis",
      prompt: "A patient in early pregnancy presents with questions regarding timing of medication safety and vulnerability to congenital malformations.",
      ask: "How does embryological vulnerability differ between the pre-implantation, major organogenesis (weeks 3–8 post-conception), and fetogenesis windows?",
      choices: [
        {
          id: "teratogenic-all-or-none-vs-organogenesis-vs-fetogenesis",
          label: "The pre-implantation period follows an 'all-or-none' rule (embryonic loss vs full regeneration); major organogenesis (weeks 3–8 post-conception / GA 5–10) is peak vulnerability for major structural malformations; fetogenesis (week 9+ post-conception) produces functional, cognitive, or hemodynamic disruptions (e.g. ACEi Potter sequence, NSAID premature ductus closure)",
        },
        {
          id: "identical-risk-across-all-trimesters-constant",
          label: "All trimesters carry identical risks of limb phocomelia and neural tube closure failure regardless of gestational timing",
        },
        {
          id: "all-or-none-occurs-in-late-third-trimester",
          label: "The all-or-none period occurs during the 3rd trimester when the placenta reaches maximal surface area",
        },
        {
          id: "organogenesis-begins-at-week-twenty",
          label: "Major organogenesis begins at week 20 gestational age when fetal kidneys begin contributing to amniotic fluid",
        },
      ],
      correct: "teratogenic-all-or-none-vs-organogenesis-vs-fetogenesis",
      answer: "Human teratogenesis follows strictly defined embryological critical windows. (1) Pre-implantation (Days 1–14 post-conception / GA Weeks 3–4): Characterized by the 'All-or-None' phenomenon where cytotoxic damage either destroys a critical mass of blastomeres leading to blastocyst loss/spontaneous miscarriage, or surviving totipotent blastomeres fully compensate and regenerate without major structural anatomical dysmorphology. (2) Major Organogenesis (Weeks 3–8 post-conception / GA Weeks 5–10): Peak vulnerability for catastrophic structural anatomical malformations as primary germ layers differentiate and organs close (neural tube days 21–28, cardiac septation days 20–50, limb buds days 24–36, craniofacial fusion days 45–60). Disruptions during this window produce irreversible physical anomalies (e.g. thalidomide phocomelia, isotretinoin retinoic acid embryopathy, valproate spina bifida). (3) Fetogenesis & Functional Maturation (Weeks 9+ post-conception / GA Weeks 11–42): Tissues have differentiated; toxic exposures produce functional, cognitive, microvascular, or growth impairment rather than gross organ agenesis. Classic late perils include RAAS blocker-induced fetal renal anuria and Potter sequence (GA >= 16–20 wk), NSAID-induced oligohydramnios (>= 20 wk) and premature in utero closure of the ductus arteriosus (>= 28–32 wk, contraindicated >= 30 wk), and warfarin-induced microvascular fetal hemorrhage.",
      drugIds: ["isotretinoin", "thalidomide", "valproate", "lisinopril", "ibuprofen"],
    },
    {
      id: "clin-epinephrine-hyperlactatemia-type-b",
      lane: "clinical",
      kicker: "Critical Care Hemodynamics & Metabolism",
      title: "Epinephrine-Induced Type B Hyperlactatemia vs Tissue Dysoxia",
      prompt: "A patient in septic shock resuscitated to a MAP > 65 mmHg on norepinephrine and epinephrine has a rising serum lactate (2.1 -> 5.8 mmol/L), but central venous oxygen saturation (ScvO2) is 78%, venous-to-arterial CO2 gap is 4.2 mmHg, urine output is 0.8 mL/kg/h, and extremities are warm.",
      ask: "What physiological mechanism explains the elevated lactate, and what is the appropriate resuscitation response?",
      choices: [
        {
          id: "epinephrine-beta2-aerobic-glycolysis-benign-type-b",
          label: "Beta-2 adrenergic stimulation accelerates skeletal muscle aerobic glycolysis beyond mitochondrial pyruvate dehydrogenase capacity (benign Type B2 hyperlactatemia); with preserved ScvO2 and normal CO2 gap, do NOT escalate fluid boluses or declare resuscitation failure",
        },
        {
          id: "epinephrine-causes-diffuse-mesenteric-ischemia-type-a",
          label: "Epinephrine causes diffuse mesenteric ischemia, producing Type A lactic acidosis that mandates emergent fluid resuscitation and doubling pressor rates",
        },
        {
          id: "epinephrine-blocks-proximal-tubular-lactate-transporters",
          label: "Epinephrine competitively blocks renal proximal tubular lactate transporters, preventing urinary clearance without cellular overproduction",
        },
        {
          id: "elevated-lactate-indicates-alpha1-myocardial-stunning",
          label: "Elevated lactate indicates catastrophic alpha-1 myocardial stunning and mandates immediate initiation of high-dose milrinone",
        },
      ],
      correct: "epinephrine-beta2-aerobic-glycolysis-benign-type-b",
      answer: "Epinephrine stimulates skeletal muscle sarcolemmal beta-2 adrenergic receptors coupled to Gs proteins, activating adenylyl cyclase and protein kinase A (PKA). PKA stimulates glycogenolysis and hyperactivates the membrane Na+/K+-ATPase pump. Elevated intracellular ADP/AMP stimulates phosphofructokinase-1 (PFK-1), massively accelerating aerobic glycolysis. Cytosolic pyruvate is produced at a rate exceeding the oxidative capacity of mitochondrial Pyruvate Dehydrogenase (PDH); the excess pyruvate is converted into lactate by Lactate Dehydrogenase (LDH) to regenerate NAD+. This produces benign Type B2 aerobic hyperlactatemia despite abundant oxygen delivery (DO2) and normal cellular respiration. Crucially, adequate systemic perfusion is verified by ScvO2 >= 70%, venoarterial P(v-a)CO2 gap < 6 mmHg, brisk capillary refill, and adequate urine output (> 0.5 mL/kg/h). Misinterpreting this pharmacodynamic beta-2 signature as worsening septic tissue hypoperfusion (Type A dysoxia) leads to dangerous clinical errors, including unnecessary fluid overloading, unwarranted broad-spectrum antibiotic escalations, and inappropriate pressor weaning.",
      drugIds: ["epinephrine", "norepinephrine"],
    },
    {
      id: "clin-mycophenolate-ehc-flora-csa",
      lane: "clinical",
      kicker: "Transplant Immunosuppression & Transporters",
      title: "Mycophenolate Enterohepatic Recirculation: The MRP2 & Microbiome Collisions",
      prompt: "A kidney transplant recipient on tacrolimus and mycophenolate mofetil (MMF) is admitted for a severe bacterial infection and treated with broad-spectrum antibiotics (ciprofloxacin + augmentin). Alternatively, another patient is switched from cyclosporine to tacrolimus without MMF dose adjustments.",
      ask: "How do biliary MRP2 transport and gut commensal bacterial beta-glucuronidase govern mycophenolic acid (MPA) exposure, and what clinical hazards arise?",
      choices: [
        {
          id: "mycophenolate-mrp2-bacterial-glucuronidase-ehc-cascade",
          label: "MPAG biliary export via MRP2 and intestinal bacterial beta-glucuronidase cleavage produce a secondary MPA peak (25–35% of AUC); broad-spectrum antibiotics eradicate flora, dropping MPA AUC by 30–50% (rejection risk), while cyclosporine blocks MRP2 (switching CsA to tacrolimus surges MPA AUC by 30–50%, risking leukopenia/CMV)",
        },
        {
          id: "mycophenolate-cleared-entirely-by-renal-oat1-filtration",
          label: "Mycophenolate is cleared entirely by renal OAT1; antibiotics and cyclosporine inhibit tubular secretion to cause toxic MPA surges",
        },
        {
          id: "intestinal-flora-synthesizes-purines-de-novo",
          label: "Intestinal flora synthesize mycophenolate de novo from dietary purines; antibiotics cause nutritional deficiency without altering drug pharmacokinetics",
        },
        {
          id: "tacrolimus-induces-ugt1a9-brush-border",
          label: "Tacrolimus directly induces UGT1A9 in the jejunal brush border, whereas cyclosporine downregulates hepatic esterases",
        },
      ],
      correct: "mycophenolate-mrp2-bacterial-glucuronidase-ehc-cascade",
      answer: "Mycophenolic acid (MPA) undergoes extensive enterohepatic recirculation (EHC): active MPA is glucuronidated by hepatic UGT1A9 to inactive mycophenolic acid glucuronide (MPAG), which is excreted across the canalicular membrane into bile by Multidrug Resistance-associated Protein 2 (MRP2 / ABCC2). Upon reaching the distal ileum and colon, commensal anaerobic bacteria (Bacteroides, Clostridium) expressing beta-glucuronidase cleave MPAG back into active, lipophilic MPA, which is reabsorbed into the portal circulation. This generates a characteristic Secondary MPA Peak at 6 to 12 hours post-dose that supplies 25% to 35% of the total 24-hour MPA AUC. Two critical collisions disrupt this physiology: (1) Broad-Spectrum Antibiotics (fluoroquinolones, augmentin, cephalosporins) eradicate beta-glucuronidase-producing gut anaerobes, completely eliminating the secondary peak and slashing total MPA AUC by 30% to 50%, sharply increasing the risk of acute cellular and antibody-mediated allograft rejection! (2) Cyclosporine vs Tacrolimus Divergence: Cyclosporine potently inhibits canalicular MRP2, blocking biliary MPAG export and abolishing EHC (reducing MPA AUC by 30–40% compared to tacrolimus). Tacrolimus spares MRP2, leaving EHC intact. The Switch Trap: Converting a patient from cyclosporine to tacrolimus without lowering MMF dose unleashes a 30–50% MPA AUC surge that precipitates severe leukopenia, CMV disease, and diarrhea; converting tacrolimus to cyclosporine drops MPA AUC by 30–40%, precipitating allograft rejection.",
      drugIds: ["mycophenolate", "cyclosporine", "tacrolimus", "ciprofloxacin"],
    },
    {
      id: "clin-cni-steroid-taper-cyp3a-rebound",
      lane: "clinical",
      kicker: "Transplant Pharmacokinetics & TDM",
      title: "Corticosteroid Taper & Dynamic Calcineurin Inhibitor (CNI) Clearance Rebound",
      prompt: "A solid organ transplant recipient stabilized on maintenance tacrolimus (trough 8.0 ng/mL) and high-dose prednisone (20 mg daily) undergoes a planned corticosteroid taper down to 5 mg daily over several weeks. Three weeks later, the patient develops acute kidney injury, severe fine hand tremor, and a tacrolimus trough of 14.5 ng/mL.",
      ask: "What molecular pharmacokinetic mechanism accounts for this delayed, toxic CNI trough surge during steroid dose reduction?",
      choices: [
        {
          id: "steroid-taper-pxr-cyp3a-deinduction-clearance-drop",
          label: "High-dose prednisone induces CYP3A4 and P-gp via PXR; as the steroid is tapered, enzyme induction wanes, dropping CNI clearance by 30–40% and driving a toxic rebound trough surge unless CNI doses are proactively reduced",
        },
        {
          id: "prednisone-directly-oxidizes-tacrolimus-in-plasma",
          label: "Prednisone directly oxidizes tacrolimus into an inactive metabolite in the bloodstream, and tapering allows the parent drug to accumulate",
        },
        {
          id: "tapering-steroids-acidifies-urine-causing-reabsorption",
          label: "Tapering steroids acidifies the urine, causing retrograde proximal tubular reabsorption of tacrolimus via passive non-ionic diffusion",
        },
        {
          id: "low-dose-prednisone-activates-erythropoietin-receptors",
          label: "Low-dose prednisone activates erythropoietin receptors, expanding red blood cell mass and falsely elevating whole-blood CNI assays without altering plasma levels",
        },
      ],
      correct: "steroid-taper-pxr-cyp3a-deinduction-clearance-drop",
      answer: "Moderate-to-high dose corticosteroids (prednisone >= 20 mg/day, methylprednisolone) act as ligands for the nuclear Pregnane X Receptor (PXR), driving transcriptional up-regulation and induction of hepatic and intestinal cytochrome P450 3A4 (CYP3A4), CYP3A5, and P-glycoprotein (ABCB1). Under baseline high-dose steroid therapy, CNI (tacrolimus, cyclosporine) clearance is artificially accelerated. As corticosteroids are tapered down post-transplantation (e.g. 20 mg -> 15 mg -> 10 mg -> 5 mg daily), PXR-mediated enzyme and transporter induction progressively resolves over 1 to 3 weeks. Consequently, CNI intrinsic clearance drops by 30% to 40%. If the maintenance CNI dose is kept constant during the steroid taper, steady-state trough concentrations rebound sharply (frequently surging from target 7–9 ng/mL up into toxic ranges > 12–16 ng/mL). The resulting surge triggers acute afferent arteriolar vasoconstriction, acute allograft nephrotoxicity, severe neurotoxicity (tremor, headache, insomnia, PRES), and hyperkalemia. Consensus transplant guidelines mandate proactive therapeutic drug monitoring (TDM) within 3 to 7 days of steroid taper steps with anticipated prospective CNI dose reductions of 20% to 35%.",
      drugIds: ["tacrolimus", "prednisone", "cyclosporine"],
    },
    {
      id: "clin-anticoagulation-reversal-andexanet-pcc-protamine",
      lane: "clinical",
      kicker: "Hemostasis & Anticoagulation Reversal",
      title: "Targeted Reversal: Andexanet Decoy FXa vs 4F-PCC Kinetics & The Protamine Overdose Paradox",
      prompt: "A neurointensive care team manages acute life-threatening intracranial hemorrhage across patients receiving apixaban, rivaroxaban, warfarin, or continuous unfractionated heparin (UFH).",
      ask: "Which pharmacokinetic and molecular hemostatic mechanisms distinguish Andexanet alfa, 4-Factor PCC, and Protamine sulfate reversal strategies?",
      choices: [
        {
          id: "andexanet-decoy-fxa-pcc-vitamin-k-protamine-polycation",
          label: "Andexanet alfa acts as a catalytically inactive recombinant decoy FXa protein that sequesters direct FXa inhibitors; 4F-PCC replaces depleted factors II, VII, IX, and X but requires concurrent IV Vitamin K (10 mg) to prevent rebound coagulopathy when short-lived FVII (t1/2 ~6h) clears; Protamine sulfate is a basic polycation that neutralizes acidic heparin via salt complexes but causes paradoxical anticoagulation and pulmonary hypertension if overdosed",
        },
        {
          id: "andexanet-alfa-enzymatically-cleaves-apixaban-in-plasma",
          label: "Andexanet alfa is a catalytic serine protease that hydrolyzes apixaban into inactive peptide fragments within 5 minutes of administration",
        },
        {
          id: "pcc-contains-activated-factor-seven-alone",
          label: "4F-PCC contains exclusively recombinant activated Factor VII (rFVIIa) and does not require Vitamin K co-administration",
        },
        {
          id: "protamine-fully-reverses-fondaparinux-and-bivalirudin",
          label: "Protamine sulfate completely neutralizes the anti-Xa activity of fondaparinux and direct thrombin inhibition of bivalirudin",
        },
      ],
      correct: "andexanet-decoy-fxa-pcc-vitamin-k-protamine-polycation",
      answer: "Acute anticoagulation reversal requires precise mechanistic selection: (1) Andexanet alfa (Andexxa) is a genetically engineered recombinant human Factor Xa decoy protein with an active-site Ser-to-Ala mutation (eliminating catalytic procoagulant activity) and deleted Gla domain (preventing membrane-bound prothrombinase assembly). It binds and sequesters oral direct FXa inhibitors (apixaban, rivaroxaban) with high nanomolar affinity. ANNEXA-4 trial protocols mandate either low-dose (400 mg bolus + 480 mg infusion over 2h) or high-dose (800 mg bolus + 960 mg infusion over 2h) based on agent, dose, and timing. Crucially, Andexanet binds Tissue Factor Pathway Inhibitor (TFPI), causing transient prothrombotic rebound and heparin resistance. (2) 4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) contains unactivated factors II, VII, IX, X, and Protein C/S. Dosing for warfarin reversal is weight- and INR-tiered (25–50 units/kg, max 2500–5000 units). Essential rule: Exogenous Factor VII has a rapid elimination half-life (~6 hours), whereas Factors II and X persist for 40–60 hours. Unless concurrent IV Vitamin K (10 mg slow infusion) is administered to stimulate endogenous hepatic factor synthesis, the patient suffers catastrophic rebound INR prolongation and re-bleeding at 12–24 hours! (3) Protamine Sulfate is a strongly basic, low-molecular-weight polycationic peptide derived from fish sperm. Positively charged protamine binds negatively charged acidic glycosaminoglycans on heparin via electrostatic attraction, forming stable, inactive salt complexes. Protamine dose must be calculated based on time elapsed since heparin discontinuation (1 mg per 100 units UFH if immediate, 0.5 mg if 30–60 min, down to 0.25 mg if >2h; max 50 mg). The Protamine Overdose Paradox: When administered in excess of circulating heparin, free unbound protamine exerts an intrinsic anticoagulant effect by inhibiting thrombin and platelets, worsening coagulopathy! Rapid infusion can trigger fatal pulmonary vasoconstriction, acute right heart failure, and anaphylactoid shock.",
      drugIds: ["apixaban", "rivaroxaban", "warfarin", "heparin"],
    },
    {
      id: "clin-apap-nac-rumack-cyp2e1-glutathione",
      lane: "clinical",
      kicker: "Medical Toxicology & Hepatotoxicity",
      title: "Acetaminophen Rumack-Matthew Nomogram, CYP2E1 NAPQI Induction & NAC Kinetics",
      prompt: "A patient presents 6 hours after ingesting 20 grams of acetaminophen. The emergency clinical team plots the serum APAP concentration on the Rumack-Matthew nomogram and initiates IV N-acetylcysteine (NAC).",
      ask: "What biochemical pathways govern toxic NAPQI generation, hepatocellular glutathione exhaustion, and the antidotal kinetics of N-acetylcysteine?",
      choices: [
        {
          id: "cyp2e1-napqi-glutathione-depletion-nac-sulfhydryl-donor",
          label: "CYP2E1 bioactivates APAP into toxic electrophilic N-acetyl-p-benzoquinone imine (NAPQI); when hepatic glutathione drops below 30% baseline, NAPQI covalently binds mitochondrial proteins causing Zone 3 centrilobular necrosis; IV NAC serves as a cysteine precursor and direct sulfhydryl donor to regenerate glutathione and detoxify NAPQI",
        },
        {
          id: "apap-direct-hepatocyte-lysis-without-metabolism",
          label: "Unmetabolized acetaminophen acts as a direct detergent that dissolves hepatocyte cell membranes within 2 hours of ingestion",
        },
        {
          id: "cyp3a4-generates-n-acetyl-cysteine-which-causes-damage",
          label: "CYP3A4 metabolizes APAP into toxic N-acetylcysteine, and antidotal therapy requires immediate administration of glutathione inhibitors",
        },
        {
          id: "rumack-nomogram-valid-for-chronic-repeated-ingestions",
          label: "The Rumack-Matthew nomogram is calibrated primarily for chronic repeated supratherapeutic ingestions over several days",
        },
      ],
      correct: "cyp2e1-napqi-glutathione-depletion-nac-sulfhydryl-donor",
      answer: "Acetaminophen (APAP) at therapeutic doses is predominantly (85–90%) metabolized by hepatic glucuronidation (UGT1A6/UGT1A9) and sulfation (SULT1A1) into non-toxic conjugates. A minor fraction (5–10%) is oxidized by CYP2E1 (and to a lesser degree CYP1A2/2D6/3A4) into the highly reactive, electrophilic intermediate N-acetyl-p-benzoquinone imine (NAPQI). Under normal conditions, NAPQI is instantaneously conjugated with intracellular glutathione (GSH) to non-toxic mercapturic acid and cysteine conjugates excreted in urine. In massive acute overdose, glucuronidation and sulfation pathways saturate, shunting massive amounts of APAP through CYP2E1. Once hepatocellular glutathione reserves are depleted by >= 70% (falling below 30% of normal baseline), free unbound NAPQI covalently binds cellular macromolecules—particularly mitochondrial proteins. This triggers opening of the mitochondrial permeability transition pore (mPTP), collapse of membrane potential, massive ATP depletion, oxidative stress, and extensive centrilobular (Zone 3) hepatocellular necrosis. High-Risk Modifiers: Chronic ethanol consumption strongly induces CYP2E1, accelerating NAPQI generation; malnutrition, fasting, and cachexia deplete baseline glutathione stores. The Rumack-Matthew Nomogram applies strictly to single acute ingestions between 4 and 24 hours (150 µg/mL treatment line at 4 hours). N-Acetylcysteine (NAC) provides exogenous cysteine (the rate-limiting substrate for glutathione synthesis) and acts as a direct sulfhydryl donor to bind NAPQI. Initiating NAC within 8 to 10 hours of acute ingestion virtually eliminates mortality from hepatotoxicity.",
      drugIds: ["acetaminophen"],
    },
    {
      id: "clin-toxic-alcohols-osmolal-gap-fomepizole",
      lane: "clinical",
      kicker: "Toxic Alcohols & Metabolic Acidosis",
      title: "Methanol vs Ethylene Glycol: Osmolal Gap Dissipation, Formic/Oxalic End-Organ Injury & Fomepizole",
      prompt: "A patient presents 12 hours after ingesting an unknown industrial fluid with marked high anion gap metabolic acidosis, elevated serum osmolal gap, visual disturbances ('snowfield vision'), and acute kidney injury.",
      ask: "How do Alcohol Dehydrogenase (ADH) kinetics, metabolite toxicity (formic acid vs calcium oxalate), and Fomepizole competitive inhibition differentiate toxic alcohol management?",
      choices: [
        {
          id: "adh-formic-vs-oxalic-fomepizole-competitive-blockade",
          label: "ADH bioactivates methanol to formic acid (cytochrome c oxidase inhibitor causing retinal snowfield blindness and putaminal necrosis) and ethylene glycol to glycolic/oxalic acid (calcium oxalate tubule crystals causing acute renal failure); early osmolal gap narrows as parent alcohols convert to toxic anion acids; Fomepizole competitively blocks ADH (Ki ~0.1 µM, 8000x affinity vs ethanol)",
        },
        {
          id: "toxic-alcohols-cause-pure-respiratory-alkalosis",
          label: "Methanol and ethylene glycol directly stimulate the medullary respiratory center, causing profound respiratory alkalosis without metabolic acidosis",
        },
        {
          id: "fomepizole-is-a-direct-chelator-of-formic-acid",
          label: "Fomepizole acts as an intravascular chelating agent that directly binds circulating formic and glycolic acids for fecal excretion",
        },
        {
          id: "calcium-oxalate-crystals-protect-renal-tubules",
          label: "Calcium oxalate crystals form a protective lining along the proximal tubule brush border that accelerates renal recovery",
        },
      ],
      correct: "adh-formic-vs-oxalic-fomepizole-competitive-blockade",
      answer: "Toxic alcohol poisonings exhibit a classic two-phase kinetic profile: (1) Early phase: Unmetabolized parent alcohols (methanol, ethylene glycol) are low-molecular-weight osmotically active solutes that create a marked elevated Serum Osmolal Gap (Measured Osmolality - Calculated Osmolality > 10–14 mOsm/kg) with minimal initial acidosis. (2) Late phase: As Alcohol Dehydrogenase (ADH) and Aldehyde Dehydrogenase (ALDH) metabolize parent alcohols, the osmolal gap dissipates while an extreme High Anion Gap Metabolic Acidosis (HAGMA) emerges. Divergent End-Organ Toxicities: Methanol -> formaldehyde -> Formic Acid. Formic acid potently inhibits mitochondrial cytochrome c oxidase (Complex IV), causing histotoxic hypoxia. Formate selectively damages the optic nerve and retinal pigmented epithelium (producing blurred vision, photophobia, optic disc hyperemia, and permanent 'snowstorm' blindness) and the basal ganglia (putaminal hemorrhagic necrosis). Co-factor: Leucovorin / Folinic acid (50 mg IV q4h) accelerates tetrahydrofolate-dependent conversion of formate to CO2 and H2O. Ethylene Glycol -> glycolaldehyde -> Glycolic Acid -> glyoxylic acid -> Oxalic Acid. Glycolic acid drives severe acidosis; oxalic acid precipitates with ionized calcium to form calcium oxalate monohydrate needle/envelope crystals in renal tubules, causing acute tubular necrosis, anuria, and severe hypocalcemia. Co-factors: Thiamine (100 mg IV) and Pyridoxine (50 mg IV q6h) shunt glyoxylate into non-toxic alpha-hydroxy-beta-ketoadipate and glycine. Antidote: Fomepizole (4-methylpyrazole) is a potent competitive inhibitor of ADH with a Ki ~ 0.1 µM (8,000-fold higher affinity for ADH than ethanol). Dosing is 15 mg/kg IV loading, followed by 10 mg/kg q12h x 4 doses, then 15 mg/kg q12h (due to CYP auto-induction). Indications for hemodialysis include severe acidemia (pH < 7.25), visual deficits, renal failure, or level >= 50 mg/dL.",
      drugIds: ["ethanol"],
    },
    {
      id: "clin-salicylate-ion-trapping-potassium-rule",
      lane: "clinical",
      kicker: "Salicylate Toxicology & Renal Clearance",
      title: "Salicylate Toxicity: Uncoupled Oxidative Phosphorylation, Ion-Trapping Alkalinization & The Potassium Mandate",
      prompt: "An adult patient presents with acute aspirin overdose displaying tachypnea, tinnitus, nausea, mixed respiratory alkalosis and high anion gap metabolic acidosis, and hypokalemia (serum K+ 3.2 mEq/L).",
      ask: "What physiological mechanism explains why urinary alkalinization (urine pH 7.5–8.0) escalates salicylate clearance up to 20-fold, and why is potassium repletion mandatory before urine can be alkalinized?",
      choices: [
        {
          id: "salicylate-weak-acid-ion-trapping-hk-atpase-potassium-mandate",
          label: "Salicylic acid is a weak acid (pKa 3.5); raising urine pH to 7.5–8.0 converts it to ionized conjugate base (A-), preventing passive tubular reabsorption ('ion trapping') and increasing clearance 10- to 20-fold; hypokalemia causes renal H+/K+-ATPase to excrete H+ to conserve K+, creating paradoxical aciduria that prevents alkalinization unless K+ is aggressively repleted (>= 4.0–4.5 mEq/L)",
        },
        {
          id: "aspirin-cleared-by-apical-enac-sodium-exchangers",
          label: "Aspirin is actively transported by apical ENaC sodium channels, and urinary alkalinization forces sodium into cells to sweep aspirin into urine",
        },
        {
          id: "potassium-directly-oxidizes-salicylate-in-tubule-lumen",
          label: "Potassium ions directly oxidize salicylic acid into gentisic acid inside the collecting duct, neutralizing its toxic properties",
        },
        {
          id: "salicylate-toxicity-causes-isolated-metabolic-alkalosis",
          label: "Salicylates cause pure metabolic alkalosis by stimulating gastric parietal proton pumps, eliminating the need for bicarbonate infusion",
        },
      ],
      correct: "salicylate-weak-acid-ion-trapping-hk-atpase-potassium-mandate",
      answer: "Salicylate poisoning causes a classic biphasic, mixed acid-base disturbance: (1) Direct stimulation of the medullary respiratory center induces hyperventilation, producing an early Respiratory Alkalosis. (2) Uncoupling of mitochondrial oxidative phosphorylation disrupts ATP synthesis, forcing anaerobic glycolysis, accelerating fatty acid beta-oxidation, and driving severe lactic acidosis and ketoacidosis that culminates in a High Anion Gap Metabolic Acidosis. Ion-Trapping Renal Clearance: Salicylic acid (HA) is a weak lipid-soluble carboxylic acid with a pKa of approximately 3.5. Under physiological acidic tubular conditions (urine pH 5.5), a substantial fraction of salicylate exists in the uncharged, non-ionized form (HA), which readily diffuses passively across the lipophilic apical tubular epithelium back into peritubular capillaries. Raising urine pH to 7.5–8.0 via IV Sodium Bicarbonate shifts the Henderson-Hasselbalch equilibrium dramatically: at pH 7.5, greater than 99.99% of salicylate is dissociated into the negatively charged, polar conjugate base (A-). Charged salicylate cannot cross the lipophilic membrane, trapping it within the tubular lumen and escalating renal clearance by 10- to 20-fold! The Mandatory Potassium Repletion Rule: In hypokalemia, cortical collecting duct principal cells and intercalated cells activate the apical H+/K+-ATPase to reabsorb potassium from tubular fluid in exchange for secreting protons (H+) into the urine. This generates Paradoxical Aciduria (acidic urine despite systemic alkalemia). The kidney will refuse to excrete bicarbonate or alkalinize the urine until serum potassium is aggressively restored (target serum K+ >= 4.0–4.5 mEq/L). Emergent hemodialysis criteria include salicylate level > 100 mg/dL (acute) or > 60 mg/dL (chronic), altered mental status, cerebral edema, non-cardiogenic pulmonary edema, or refractory acidosis.",
      drugIds: ["aspirin"],
    },
    {
      id: "clin-toxidrome-differential-hunter-nms-anticholinergic",
      lane: "clinical",
      kicker: "Neuropsychiatric Emergencies & Toxidromes",
      title: "Serotonin Syndrome (Hunter Criteria) vs Neuroleptic Malignant Syndrome vs Anticholinergic Storm",
      prompt: "A psychiatric emergency patient presents with altered mental status, autonomic instability (tachycardia, hypertension), and severe hyperthermia (temperature 39.2°C / 102.6°F).",
      ask: "Which clinical exam findings, neuromuscular signatures, and autonomic signs reliably distinguish Serotonin Syndrome, Neuroleptic Malignant Syndrome (NMS), and Anticholinergic Toxicity?",
      choices: [
        {
          id: "hunter-clonus-vs-nms-leadpipe-vs-anticholinergic-anhidrosis",
          label: "Serotonin Syndrome (rapid onset <24h) is defined by Hunter criteria: clonus (spontaneous/inducible/ocular), tremor, lower-extremity hyperreflexia, and profuse diaphoresis; NMS (insidious onset over days) features dopamine D2 blockade, generalized 'lead-pipe' rigidity, hyporeflexia, extreme CPK (>1000–50,000 IU/L), and diaphoresis; Anticholinergic toxicity is definitively differentiated by anhidrosis (completely dry skin, dry axillae, and dry mucous membranes) alongside mydriasis, urinary retention, and absent bowel sounds",
        },
        {
          id: "serotonin-syndrome-features-dry-skin-and-hyporeflexia",
          label: "Serotonin syndrome uniquely causes complete cessation of sweating (dry skin) and flaccid hyporeflexia of all muscle groups",
        },
        {
          id: "nms-develops-within-minutes-of-oral-dosing",
          label: "Neuroleptic Malignant Syndrome develops within 15 minutes of an antipsychotic dose and resolves immediately with acetaminophen",
        },
        {
          id: "anticholinergic-toxicity-presents-with-pinpoint-pupils",
          label: "Anticholinergic toxidrome is characterized by miosis (pinpoint pupils), copious hypersalivation, and hyperactive bowel sounds",
        },
      ],
      correct: "hunter-clonus-vs-nms-leadpipe-vs-anticholinergic-anhidrosis",
      answer: "Differentiating life-threatening hyperthermic psychiatric emergencies is essential because targeted antidotal interventions differ completely: (1) Serotonin Syndrome (SS): Driven by excessive 5-HT2A and 5-HT1A receptor stimulation. Onset is rapid (hours, typically <24h post-dose escalation or drug combination). Neuromuscular signature: Hyperkinesia, tremor, akathisia, marked hyperreflexia with lower-extremity predominance, and Clonus (spontaneous, inducible, or ocular). Autonomic signature: Profuse diaphoresis, shivering, dilated pupils, hyperactive bowel sounds, diarrhea. The Hunter Serotonin Toxicity Criteria require exposure to a serotonergic agent PLUS: spontaneous clonus; OR inducible clonus + agitation/diaphoresis; OR ocular clonus + agitation/diaphoresis; OR tremor + hyperreflexia; OR hypertonia + temperature >38°C + ocular/inducible clonus. Antidote: Cyproheptadine (5-HT2A antagonist) and benzodiazepines. (2) Neuroleptic Malignant Syndrome (NMS): Driven by central dopamine D2 receptor antagonism in the striatum and hypothalamus. Onset is insidious (typically evolving over 3 to 9 days). Neuromuscular signature: Hypokinesia, severe generalized 'lead-pipe' rigidity, hyporeflexia (or normal reflexes), bradykinesia. Autonomic signature: Marked hyperthermia, labile blood pressure, profuse diaphoresis. Lab hallmark: Massive creatine kinase (CPK) elevation (frequently >1,000 to >50,000 IU/L) due to persistent severe isometric muscular rigidity and rhabdomyolysis, along with leukocytosis. Antidotes: Bromocriptine (D2 agonist), Dantrolene (RyR1 calcium release blocker), Amantadine. (3) Anticholinergic Toxicity: Driven by competitive muscarinic (M1–M5) blockade. The Pathognomonic Differentiator: ANHIDROSIS (completely dry skin, dry axillae, parched mucous membranes). Both SS and NMS present with profuse sweating (diaphoresis); anticholinergic storm features zero sweat ('dry as a bone, red as a beet, hot as a hare, blind as a bat, mad as a hatter, full as a flask'). Pupils are widely dilated and poorly reactive; bowel sounds are absent/silent (hypomotility/ileus); urinary retention is severe. Antidote: Physostigmine (acetylcholinesterase inhibitor crossing BBB), provided TCA conduction delay is excluded.",
      drugIds: ["fluoxetine", "haloperidol", "diphenhydramine"],
    },
    {
      id: "clin-clozapine-tdm-smoking-cyp1a2-cigh",
      lane: "clinical",
      kicker: "Psychopharmacology & Clozapine Kinetics",
      title: "Clozapine TDM: The Smoking Cessation CYP1A2 Surge, Neutropenia REMS & Hypomotility Mortality",
      prompt: "A patient with refractory schizophrenia stabilized on clozapine (450 mg daily, baseline trough 480 ng/mL) is admitted to a smoke-free inpatient psychiatric hospital. Eight days later, the patient develops profound sedation, myoclonic twitches, confusion, and a repeat clozapine trough level of 1,020 ng/mL.",
      ask: "What molecular hepatic mechanism caused this toxic level surge, and what are the major monitoring mandates regarding absolute neutrophil count (ANC) and gastrointestinal hypomotility (CIGH)?",
      choices: [
        {
          id: "clozapine-smoking-pah-cyp1a2-cessation-surge-rems-cigh",
          label: "Polycyclic aromatic hydrocarbons (PAHs) in burning tobacco smoke (not nicotine) are potent inducers of CYP1A2; abrupt smoking cessation eliminates induction over 3–7 days, dropping clearance by 50% and doubling clozapine levels (risking seizures and myocarditis); ANC must be monitored under REMS (hold permanently if ANC <500/µL); and Clozapine-Induced Gastrointestinal Hypomotility (CIGH) causes fatal bowel infarction with mortality exceeding agranulocytosis",
        },
        {
          id: "nicotine-directly-inhibits-clozapine-renal-filtration",
          label: "Nicotine directly stimulates proximal tubular clozapine secretion; stopping smoking causes renal failure without affecting hepatic enzymes",
        },
        {
          id: "clozapine-induces-polycythemia-vera-at-low-doses",
          label: "Clozapine induces bone marrow hyperplasia that elevates neutrophil counts to dangerous levels requiring phlebotomy",
        },
        {
          id: "smoking-cessation-accelerates-clozapine-glucuronidation",
          label: "Quitting tobacco smoke massively accelerates UGT glucuronidation, which drives paradoxical accumulation of active toxic metabolites",
        },
      ],
      correct: "clozapine-smoking-pah-cyp1a2-cessation-surge-rems-cigh",
      answer: "Clozapine is a narrow therapeutic index atypical antipsychotic with extensive hepatic metabolism primarily mediated by Cytochrome P450 1A2 (CYP1A2, contributing ~70% of total clearance), with secondary contributions from CYP2D6, CYP3A4, and CYP2C19. (1) The Smoking Cessation Kinetic Paradox: Polycyclic aromatic hydrocarbons (PAHs) generated by burning tobacco smoke (such as benzo[a]pyrene) bind the Aryl Hydrocarbon Receptor (AhR), driving robust transcriptional induction of CYP1A2. Note: Nicotine itself (patches, gums, vapes) does NOT induce CYP1A2. In active smokers, clozapine clearance is accelerated, requiring 1.5- to 2-fold higher maintenance doses. When a stabilized smoker abruptly stops smoking (e.g. upon hospital admission, incarceration, or acute illness), CYP1A2 induction washes out over 3 to 7 days. Intrinsic clearance plummets by 40% to 60%, resulting in a dramatic 50% to 100% surge in clozapine plasma concentrations on an unchanged oral dose. At levels exceeding 600–1,000 ng/mL, the risk of toxic encephalopathy, seizures (lowers seizure threshold dose-dependently), toxic myocarditis, orthostatic collapse, and fatal aspiration pneumonia escalates exponentially. Proactive recommendation: Reduce clozapine dose by 30% to 50% upon smoking cessation and monitor troughs closely. (2) Clozapine REMS Absolute Neutrophil Count (ANC) Rails: Clozapine carries an FDA Boxed Warning for severe neutropenia / agranulocytosis (<0.8–1% incidence). Baseline ANC must be >= 1,500/µL (or >= 1,000/µL for Benign Ethnic Neutropenia, BEN). ANC is checked weekly for 6 months, every 2 weeks for months 6–12, then monthly indefinitely. If severe neutropenia develops (ANC < 500/µL), clozapine MUST be immediately and permanently discontinued; rechallenge is strictly contraindicated. (3) Clozapine-Induced Gastrointestinal Hypomotility (CIGH): Potent peripheral muscarinic (M1/M3) antagonism and 5-HT3 antagonism severely impair colonic motility, progressing from constipation to fecal impaction, paralytic ileus, toxic megacolon, bowel ischemia, perforation, and fatal septic shock. Recent epidemiological literature confirms that the case-fatality rate of CIGH (15–25%) exceeds the mortality rate of agranulocytosis! Proactive, daily bowel regimens (osmotic laxatives like polyethylene glycol, stimulant laxatives) are mandatory.",
      drugIds: ["clozapine", "ciprofloxacin", "fluvoxamine"],
    },
    {
      id: "clin-digoxin-tdm-post-dose-lag-digifab",
      lane: "clinical",
      kicker: "Cardiovascular Pharmacology & TDM",
      title: "Digoxin TDM: Post-Dose Distribution Lag, P-gp Collisions & The DigiFab Immunoassay Trap",
      prompt: "A patient with heart failure with reduced ejection fraction (HFrEF) taking digoxin has a blood sample drawn 2 hours after the morning dose reporting a level of 3.4 ng/mL, prompting a call to discontinue the drug. Meanwhile, amiodarone is co-prescribed.",
      ask: "Why is a 2-hour post-dose digoxin level uninterpretable, how does amiodarone alter clearance, and why are post-DigiFab total digoxin levels misleading?",
      choices: [
        {
          id: "digoxin-lag-6h-amio-pgp-digifab-trap",
          label: "Digoxin requires >= 6–8 hours for myocardial tissue equilibrium; amiodarone inhibits renal/intestinal P-gp halving clearance (requiring 50% empiric dose reduction); and DigiFab binds circulating drug causing standard total immunoassays to spike 10- to 20-fold for 1–2 weeks",
        },
        {
          id: "digoxin-immediate-equilibrium",
          label: "Digoxin distributes within 30 minutes; amiodarone has zero effect; and DigiFab clears within 1 hour",
        },
        {
          id: "digoxin-hemodialysis-cleared",
          label: "Digoxin is primarily cleared by hemodialysis so blood levels are irrelevant",
        },
        {
          id: "amiodarone-induces-cyp3a4",
          label: "Amiodarone potently induces CYP3A4 requiring a doubling of the digoxin dose",
        },
      ],
      correct: "digoxin-lag-6h-amio-pgp-digifab-trap",
      answer: "Digoxin has a very large volume of distribution (Vd ~ 7 L/kg) and binds slowly to tissue Na+/K+ ATPase in cardiac myocytes. Serum levels drawn < 6 to 8 hours post-dose reflect distributing plasma drug rather than tissue equilibrium, falsely appearing elevated. Valid TDM requires drawing troughs >= 6–8 hours post-dose. Target levels differ by indication: HFrEF targets 0.5 to 0.9 ng/mL (higher levels increase all-cause mortality without improving symptoms), whereas AFib rate control targets 0.8 to 2.0 ng/mL. Hypokalemia and hypomagnesemia sensitize myocytes to toxicity even at normal levels. Amiodarone potently inhibits P-glycoprotein (P-gp), halving digoxin renal tubular secretion and doubling AUC; an empiric 50% digoxin dose reduction is mandatory upon initiation. When Digoxin Immune Fab (DigiFab) is administered for life-threatening toxicity, it binds free digoxin. However, standard commercial immunoassays measure total digoxin (both free and Fab-bound), resulting in an artifactual 10- to 20-fold spike in reported serum levels that persists for 1 to 2 weeks until the Fab complex is excreted renally. Clinical response and telemetry govern.",
      drugIds: ["digoxin", "amiodarone", "verapamil"],
    },
    {
      id: "clin-vaughan-williams-cast-class-ic",
      lane: "clinical",
      kicker: "Cardiac Electrophysiology",
      title: "Vaughan-Williams Class Ic Antiarrhythmics: Slow On-Off Kinetics & The CAST Proarrhythmia Landmark",
      prompt: "A patient with a prior myocardial infarction and ischemic cardiomyopathy (LVEF 32%) develops frequent symptomatic premature ventricular complexes (PVCs) and non-sustained VT. Initiation of flecainide or propafenone is proposed.",
      ask: "Why did the Cardiac Arrhythmia Suppression Trial (CAST) establish an absolute contraindication for Class Ic antiarrhythmics in structural and ischemic heart disease?",
      choices: [
        {
          id: "cast-slow-on-off-conduction-slow-reentry",
          label: "Class Ic agents have slow on-off Nav1.5 binding kinetics causing pronounced use-dependent QRS widening; in ischemic/scarred myocardium, excessive conduction slowing creates unidirectional block and lethal re-entrant ventricular tachycardia",
        },
        {
          id: "cast-qt-torsades-only",
          label: "Class Ic agents selectively block hERG potassium channels causing isolated Torsades de Pointes",
        },
        {
          id: "cast-coronary-vasospasm",
          label: "Class Ic agents cause severe epicardial coronary vasospasm leading to acute transmural infarction",
        },
        {
          id: "cast-hypoglycemic-arrest",
          label: "Class Ic agents deplete hepatic glycogen stores causing profound neuroglycopenia",
        },
      ],
      correct: "cast-slow-on-off-conduction-slow-reentry",
      answer: "Vaughan-Williams Class Ic agents (flecainide, propafenone) potently block fast cardiac sodium channels (Nav1.5) with very slow dissociation kinetics (unbinding t1/2 > 10–15 seconds). This produces pronounced 'use-dependence', where sodium channel blockade intensifies at faster heart rates, causing marked QRS prolongation without altering action potential duration or QT. In normal hearts without structural disease, this slows conduction safely. However, the landmark CAST trial (1989) demonstrated that in patients with prior myocardial infarction or structural heart disease, Class Ic-induced conduction slowing across myocardial scar borders converts slow conduction into unidirectional block, generating lethal re-entrant ventricular tachycardia and ventricular fibrillation (>3-fold excess cardiac mortality). Class Ic agents are strictly contraindicated in ischemic or structural heart disease. In contrast, Class Ib agents (lidocaine, mexiletine) have rapid on-off kinetics (<0.5 s) with preferential affinity for depolarized/ischemic tissue, suppressing ventricular arrhythmias without inducing conduction delay in normal tissue.",
      drugIds: ["flecainide", "propafenone", "lidocaine"],
    },
    {
      id: "clin-winters-formula-secondary-respiratory-acid-base",
      lane: "clinical",
      kicker: "Acid-Base Physiology & Critical Care",
      title: "Secondary Respiratory Compensation in Metabolic Acidosis: Winter's Formula & Mixed Disorders",
      prompt: "An arterial blood gas (ABG) in a patient presenting with diabetic ketoacidosis (DKA) reveals pH 7.22, serum bicarbonate (HCO3-) 12 mEq/L, and arterial PaCO2 36 mmHg.",
      ask: "Using Winter's formula, what is the expected compensatory PaCO2, and what secondary acid-base disorder is present in this patient?",
      choices: [
        {
          id: "winters-expected-26-respiratory-acidosis",
          label: "Expected PaCO2 is 24–28 mmHg (1.5 * 12 + 8 ± 2); a measured PaCO2 of 36 mmHg indicates inadequate hyperventilation and a concurrent secondary Respiratory Acidosis",
        },
        {
          id: "winters-pure-compensation",
          label: "The measured PaCO2 of 36 mmHg falls within the normal range, confirming pure unmixed metabolic compensation",
        },
        {
          id: "winters-secondary-respiratory-alkalosis",
          label: "Expected PaCO2 is 40 mmHg; measured 36 mmHg proves concurrent respiratory alkalosis",
        },
        {
          id: "winters-delta-delta-ratio",
          label: "Winter's formula only evaluates urine chloride and cannot assess respiratory compensation",
        },
      ],
      correct: "winters-expected-26-respiratory-acidosis",
      answer: "In simple metabolic acidosis, medullary chemoreceptors stimulate respiratory alveolar hyperventilation (Kussmaul breathing) to blow off carbon dioxide and mitigate acidemia. Winter's formula defines the expected secondary respiratory compensation: Expected PaCO2 = (1.5 * [HCO3-]) + 8 ± 2. For a serum bicarbonate of 12 mEq/L: Expected PaCO2 = (1.5 * 12) + 8 = 18 + 8 = 26 mmHg (acceptable compensatory range: 24 to 28 mmHg). Because the patient's measured PaCO2 is 36 mmHg—significantly higher than the expected 26 mmHg—the patient is failing to hyperventilate adequately. This confirms a mixed acid-base disorder: High Anion Gap Metabolic Acidosis PLUS a concurrent Respiratory Acidosis. Potential etiologies include respiratory muscle exhaustion, severe hypophosphatemia or hypokalemia, central nervous system depression from severe ketoacidosis or sedatives, or concurrent pulmonary disease (e.g. severe COPD or pneumonia).",
      drugIds: ["lisinopril", "potassium", "spironolactone"],
    },
    {
      id: "clin-hyponatremia-ods-adrogue-madias-hypertonic-saline",
      lane: "clinical",
      kicker: "Nephrology & Electrolyte Safety",
      title: "Hyponatremia Correction Ceiling: The 8 mEq/24h Rule, Osmotic Demyelination & Adrogue-Madias Kinetics",
      prompt: "A chronically malnourished patient with alcohol use disorder presents with confusion and a confirmed serum sodium of 108 mEq/L. Hypertonic 3% saline is ordered.",
      ask: "What is the maximum safe rate of serum sodium correction per 24 hours, what catastrophic neurologic syndrome occurs if exceeded, and how is acute herniation managed?",
      choices: [
        {
          id: "ods-8meq-ceiling-brain-shrink-hypertonic-100ml",
          label: "Serum sodium correction must NOT exceed 8 mEq/L in 24 hours (and 4–6 mEq/L in high-risk patients) to prevent fatal Osmotic Demyelination Syndrome (ODS); acute seizing/herniation is treated with 100 mL boluses of 3% saline targeting 4–6 mEq/L acute rise",
        },
        {
          id: "ods-no-limit-rapid-normalization",
          label: "Serum sodium should be normalized to 140 mEq/L within the first 12 hours to prevent cerebral edema",
        },
        {
          id: "ods-20meq-per-day-safe",
          label: "Up to 20 mEq/L correction per 24 hours is universally safe in alcohol-dependent patients",
        },
        {
          id: "ods-pure-d5w-infusion",
          label: "Chronic hyponatremia is safely resuscitated with rapid D5W free-water infusions",
        },
      ],
      correct: "ods-8meq-ceiling-brain-shrink-hypertonic-100ml",
      answer: "In chronic hyponatremia (>48 hours), brain astrocytes adapt to hypotonicity by extruding organic osmolytes (myoinositol, glutamate, taurine) over 24–48 hours to minimize brain swelling. If serum sodium is corrected too rapidly, the brain cannot synthesize and re-import osmolytes quickly enough; the rapid extracellular hypertonicity draws water out of brain cells, causing acute brain shrinkage, blood-brain barrier disruption, and Osmotic Demyelination Syndrome (ODS / central pontine myelinolysis). ODS presents 2 to 6 days post-correction with dysarthria, dysphagia, spastic quadriparesis, pseudobulbar palsy, and locked-in syndrome. Current nephrology guidelines establish an absolute safety ceiling: delta Na+ must NOT exceed 8 mEq/L in any 24-hour period (and 4 to 6 mEq/L in high-risk patients: baseline Na+ <105, malnutrition, alcoholism, cirrhosis, hypokalemia). The Adrogue-Madias formula estimates delta Na+ per liter of infusate: (Infusate Na+ - Serum Na+) / (Total Body Water + 1). If rapid free-water diuresis threatens overcorrection, a Desmopressin (DDAVP) clamp (1–2 mcg IV) plus D5W re-lowering is indicated. For acute life-threatening cerebral edema (seizures, herniation), administer 100 mL IV boluses of 3% NaCl over 10 min (up to 3 times) to rapidly raise sodium by 4–6 mEq/L and abort herniation, while still staying within the 24-hour total limit of 8 mEq/L.",
      drugIds: ["furosemide", "potassium"],
    },
    {
      id: "clin-sugammadex-cyclodextrin-contraceptive-collision",
      lane: "clinical",
      kicker: "Anesthesia Pharmacology & Drug Collisions",
      title: "Sugammadex Cyclodextrin Encapsulation: Selective NMBA Chelation & The 7-Day Contraceptive Rule",
      prompt: "A female patient taking an oral ethinyl estradiol / drospirenone contraceptive undergoes laparoscopic cholecystectomy under general anesthesia with rocuronium, reversed with sugammadex (Bridion) 200 mg.",
      ask: "What is the molecular mechanism of sugammadex reversal, which NMBAs does it NOT reverse, and what critical collision counseling is legally mandated?",
      choices: [
        {
          id: "sugammadex-cyclodextrin-contraceptive-7day",
          label: "Sugammadex is a modified gamma-cyclodextrin that encapsulates aminosteroids (rocuronium/vecuronium) but has ZERO affinity for benzylisoquinolines (cisatracurium); it also chelates progesterone, necessitating 7 days of non-hormonal back-up contraception",
        },
        {
          id: "sugammadex-ache-inhibitor",
          label: "Sugammadex inhibits acetylcholinesterase at the neuromuscular junction and has zero interaction with oral contraceptives",
        },
        {
          id: "sugammadex-reverses-all-nmba",
          label: "Sugammadex reverses both cisatracurium and succinylcholine with identical affinity",
        },
        {
          id: "sugammadex-permanent-infertility",
          label: "Sugammadex permanently destroys estrogen receptors causing irreversible anovulation",
        },
      ],
      correct: "sugammadex-cyclodextrin-contraceptive-7day",
      answer: "Sugammadex is a biologically engineered, modified gamma-cyclodextrin macrocycle featuring a lipophilic cavity and 8 negatively charged carboxyl side chains. It selectively encapsulates the lipophilic steroid rings of aminosteroid neuromuscular blocking agents (rocuronium, vecuronium) in a tight 1:1 host-guest inclusion complex, removing them from neuromuscular junction receptors and excreting the intact complex renally. Affinity hierarchy: rocuronium (Kd ~ 0.1 µM) > vecuronium (Kd ~ 1.5 µM) >> pancuronium. Sugammadex has ZERO affinity for benzylisoquinolinium NMBAs (cisatracurium, atracurium) or depolarizing agents (succinylcholine). Dosing is actual body weight: 2 mg/kg for moderate block (reappearance of T2 on Train-of-Four), 4 mg/kg for deep block (1–2 post-tetanic twitches, 0 on TOF), and 16 mg/kg for immediate rescue reversal after high-dose rocuronium (1.2 mg/kg). Critical Drug Collision: Sugammadex's lipophilic cavity also binds steroidal hormones, particularly progesterone. Administration reduces free active progestin concentrations, equivalent to missing one daily contraceptive pill. FDA labeling and anesthesia guidelines mandate that women of childbearing potential taking any hormonal contraceptive (oral pills, injections, implants, patches, vaginal rings) MUST use an additional non-hormonal back-up method (e.g. barrier condoms) for 7 consecutive days following sugammadex administration. Additionally, toremifene and flucloxacillin can competitively displace rocuronium from cyclodextrin, provoking delayed postoperative recurarization.",
      drugIds: ["rocuronium", "vecuronium", "sugammadex"],
    },
    {
      id: "clin-propofol-pris-fatty-acid-oxidation-failure",
      lane: "clinical",
      kicker: "ICU Sedation & Critical Care Toxicology",
      title: "Propofol Infusion Syndrome (PRIS): Mitochondrial Fatty Acid Oxidation Failure & Critical Care Limits",
      prompt: "A critically ill mechanically ventilated trauma patient receives continuous propofol sedation at 75 mcg/kg/min (4.5 mg/kg/h) for 72 hours, subsequently developing refractory high anion gap metabolic acidosis, hyperkalemia, acute kidney injury, and sudden progressive bradycardia.",
      ask: "What mitochondrial biochemical failure triggers Propofol Infusion Syndrome (PRIS), what are the dosage/duration safety thresholds, and what is the characteristic cardiac presentation?",
      choices: [
        {
          id: "pris-mitochondrial-fa-oxidation-bradycardia",
          label: "Propofol impairs mitochondrial electron transport chain (Complexes I/II/IV) and uncouples fatty acid oxidation; safety ceilings are > 4–5 mg/kg/h (> 67–83 mcg/kg/min) or duration > 48h; presenting with refractory bradycardia, asystole, rhabdomyolysis, and hypertriglyceridemia",
        },
        {
          id: "pris-gaba-receptor-depletion",
          label: "PRIS is caused by complete down-regulation of GABA-A receptors resulting in refractory status epilepticus",
        },
        {
          id: "pris-hyperglycemic-ketoacidosis",
          label: "Propofol destroys pancreatic beta cells triggering acute type 1 diabetes within 24 hours",
        },
        {
          id: "pris-unlimited-infusion-safe",
          label: "Propofol can be safely infused at > 150 mcg/kg/min indefinitely provided blood pressure is supported",
        },
      ],
      correct: "pris-mitochondrial-fa-oxidation-bradycardia",
      answer: "Propofol is a highly lipophilic intravenous sedative primarily acting via GABA-A receptor positive allosteric modulation. In critically ill patients—especially under systemic catecholamine stress, corticosteroid surges, or carbohydrate starvation—high doses or prolonged infusions trigger Propofol Infusion Syndrome (PRIS). Cellular Mechanism: Propofol impairs the mitochondrial respiratory chain by inhibiting electron transport complexes I, II, and IV, and uncouples oxidative phosphorylation. Simultaneously, it inhibits carnitine palmitoyltransferase-1 (CPT-1), preventing entry of long-chain free fatty acids into mitochondria for beta-oxidation. Deprived of aerobic ATP generation, myocardial and skeletal muscle cells experience cellular necrosis, releasing intracellular potassium, myoglobin, and creatine kinase (CPK > 10,000 U/L). Excess circulating free fatty acids accumulate as severe hypertriglyceridemia and fatty liver infiltration. Cardinal Clinical Features: Severe refractory High Anion Gap Metabolic Acidosis (lactic and ketoacidosis), rhabdomyolysis, acute tubular necrosis, hyperkalemia, and cardiovascular collapse. The hallmark cardiac signature is progressive, catecholamine-refractory bradycardia, right bundle branch block with ST-elevation in V1–V3 (Brugada-like pattern), and fatal asystole. SCCM PADIS Guidelines & Safety Ceilings: Limit continuous propofol infusions to < 4 to 5 mg/kg/h (< 67 to 83 mcg/kg/min) and duration < 48 hours. Serial monitoring of blood lactate, arterial pH, serum triglycerides, and CPK is recommended for infusions exceeding 24–48 hours. At the first sign of unexplained lactic acidosis, rising triglycerides, or bradycardia, immediately discontinue propofol and transition to alternative sedatives (dexmedetomidine, ketamine).",
      drugIds: ["propofol", "dexmedetomidine"],
    },
    {
      id: "clin-esett-trial-noninferiority",
      lane: "clinical",
      kicker: "Status Epilepticus & Neurocritical Care",
      title: "Landmark ESETT Trial: Second-Line Antiseizure Medication Equivalence",
      prompt: "A 45-year-old patient in convulsive status epilepticus fails two doses of IV lorazepam. The team considers Phase 2 established status epilepticus therapy.",
      ask: "Based on the landmark Established Status Epilepticus Treatment Trial (ESETT, NEJM 2019), what are the comparative efficacy outcomes of levetiracetam, fosphenytoin, and valproate sodium at 60 minutes?",
      choices: [
        {
          id: "esett-three-drugs-noninferior",
          label: "All three agents demonstrated statistical non-inferiority with ~45–47% seizure cessation and improved responsiveness at 60 minutes (Levetiracetam 47%, Fosphenytoin 45%, Valproate 46%)",
        },
        {
          id: "esett-fosphenytoin-superior",
          label: "Fosphenytoin was statistically superior to levetiracetam and valproate with 82% seizure termination",
        },
        {
          id: "esett-valproate-abandoned",
          label: "Valproate sodium failed to achieve efficacy exceeding 15% and was abandoned",
        },
        {
          id: "esett-levetiracetam-inferior",
          label: "Levetiracetam was declared inferior due to unacceptable respiratory depression rates",
        },
      ],
      correct: "esett-three-drugs-noninferior",
      answer: "The landmark Established Status Epilepticus Treatment Trial (ESETT; Kapur et al., N Engl J Med 2019;381:2103-2113) evaluated levetiracetam (60 mg/kg IV, max 4,500 mg), fosphenytoin (20 mg PE/kg IV, max 1,500 mg PE), and valproate sodium (40 mg/kg IV, max 3,000 mg) in children and adults with convulsive status epilepticus persisting after adequate benzodiazepine dosing. Primary outcome: Seizure cessation and neurological recovery at 60 minutes without additional anticonvulsants or life-threatening complications. Results: Levetiracetam 47% (95% CI 39–55%), Fosphenytoin 45% (95% CI 36–54%), and Valproate sodium 46% (95% CI 38–55%). All three agents were declared statistically non-inferior to each other, with comparable safety profiles. Clinical decision-making should be guided by patient-specific contraindications (e.g. cardiac conduction disease or hemodynamic fragility favors levetiracetam; liver disease or POLG mutations contraindicate valproate; severe CKD requires levetiracetam maintenance adjustment).",
      drugIds: ["levetiracetam", "fosphenytoin", "valproate"],
    },
    {
      id: "clin-status-epilepticus-gaba-internalization",
      lane: "clinical",
      kicker: "Synaptic Plasticity & Pharmacoresistance Kinetics",
      title: "GABA-A Receptor Internalization & The Mechanistic Rationale for Ketamine in RSE",
      prompt: "A patient continues seizing despite 35 minutes of continuous convulsive status epilepticus. Multiple doses of benzodiazepines fail to terminate clinical activity.",
      ask: "What cellular synaptic trafficking mechanism explains the progressive loss of benzodiazepine efficacy in prolonged status epilepticus, and why is Ketamine indicated in Phase 3?",
      choices: [
        {
          id: "gaba-internalization-nmda-upregulation",
          label: "Synaptic GABA-A receptors undergo dephosphorylation and clathrin-dependent endocytosis (up to 20-fold loss of potency), while NMDA/AMPA receptors upregulate; Ketamine acts as an uncompetitive NMDA open-channel blocker to halt excitotoxicity",
        },
        {
          id: "cyp2c19-hypermetabolism",
          label: "Benzodiazepines are rapidly metabolized by upregulated hepatic CYP2C19 enzymes within 15 minutes of seizure onset",
        },
        {
          id: "gaba-multiplication-hyperpolarization",
          label: "GABA-A receptors multiply on the postsynaptic membrane causing complete receptor saturation and refractory hyperpolarization",
        },
        {
          id: "ketamine-gaba-transaminase",
          label: "Ketamine directly activates GABA transaminase to synthesize endogenous inhibitory neurosteroids",
        },
      ],
      correct: "gaba-internalization-nmda-upregulation",
      answer: "In status epilepticus, time is brain. During continuous unremitting seizures lasting > 15–30 minutes, massive calcium influx activates calcineurin phosphatases, dephosphorylating synaptic GABA-A receptor subunits (beta-2/3 and gamma-2). Dephosphorylated receptors are rapidly sequestered into clathrin-coated pits and internalized via endocytosis into intracellular endosomes, reducing surface synaptic GABA-A receptor density by 75–85% within 60 minutes. This causes up to a 20-fold loss of benzodiazepine potency (Goodkin et al., Naylor et al.). Concomitantly, CaMKII activation drives forward trafficking and exocytosis of excitatory NMDA (GluN1/GluN2B) and AMPA (GluA1/GluA2) receptors to the postsynaptic membrane, surging excitatory receptor density by 250–280%. This explains why repeated benzodiazepines after 20 minutes fail and cause respiratory arrest, and provides the mechanistic rationale for Ketamine: as an uncompetitive open-channel NMDA receptor antagonist, ketamine directly suppresses the newly mobilized, pathologic glutamatergic drive, terminating seizures when GABAergic drugs fail.",
      drugIds: ["lorazepam", "midazolam", "ketamine"],
    },
    {
      id: "clin-osmotherapy-234-saline-vs-mannitol",
      lane: "clinical",
      kicker: "Neurocritical Care & Cerebral Edema",
      title: "Acute Cerebral Edema Osmotherapy: 23.4% Hypertonic Saline vs Mannitol 20%",
      prompt: "A patient with severe refractory status epilepticus develops signs of acute transtentorial herniation with elevated ICP. The team evaluates acute hyperosmolar therapy.",
      ask: "What are the key administration routes, osmolar parameters, and safety rails distinguishing 23.4% hypertonic saline from Mannitol 20%?",
      choices: [
        {
          id: "hts-central-line-mannitol-filter-320",
          label: "23.4% NaCl (8,008 mOsm/L, 120 mEq Na+) is given as a 30 mL bolus EXCLUSIVELY via central venous line; Mannitol (0.5–1.0 g/kg) requires an in-line 0.22-micron filter and must be held if serum osmolality >= 320 mOsm/kg",
        },
        {
          id: "hts-peripheral-22g",
          label: "23.4% NaCl is administered via peripheral 22-gauge catheter over 2 hours without central line monitoring",
        },
        {
          id: "mannitol-unlimited-osm",
          label: "Mannitol is safe to administer at any serum osmolality above 360 mOsm/kg because it does not accumulate in renal tubules",
        },
        {
          id: "both-identical-diuresis",
          label: "Both agents produce identical renal diuresis and reduce intravascular volume immediately upon infusion",
        },
      ],
      correct: "hts-central-line-mannitol-filter-320",
      answer: "Acute hyperosmolar therapy for cerebral edema and elevated ICP in neurocritical care: (1) 23.4% Hypertonic Saline: Concentration is 4 mEq/mL (8,008 mOsm/L). Standard emergency bolus is 30 mL (120 mEq Na+ and Cl-) over 10–15 minutes. It creates an immediate transluminal osmotic gradient (sodium reflection coefficient sigma = 1.0) extracting cerebral parenchymal free water. MUST BE ADMINISTERED VIA CENTRAL VENOUS LINE (CVL/PICC); peripheral extravasation causes devastating skin necrosis and compartment syndrome. Target serum sodium 145–155 mEq/L (max ceiling 160 mEq/L); serum osmolality ceiling < 320 mOsm/kg. Safe rate of rise in chronic hyponatremia is <= 8 mEq/L/24h to prevent Osmotic Demyelination Syndrome (ODS). (2) Mannitol 20%: Dose is 0.5 to 1.0 g/kg IV over 20–30 minutes (2.5 to 5.0 mL/kg of 20% solution). Acts triphasically: immediate rheologic blood viscosity reduction, delayed osmotic brain dehydration (sigma = 0.9), and renal osmotic diuresis. In-line 0.22-micron filter is MANDATORY because mannitol precipitates into microscopic crystals at room temperature. Contraindicated if serum osmolality >= 320 mOsm/kg or osmolar gap > 15–20 mOsm/kg (prevents acute osmotic nephrosis and ATN), or in anuria/pulmonary edema.",
      drugIds: ["hypertonic-saline", "mannitol"],
    },
    {
      id: "clin-hit-4ts-non-heparin-dti",
      lane: "clinical",
      kicker: "Hematology & Hemostasis Safety",
      title: "Heparin-Induced Thrombocytopenia (HIT): 4Ts Scoring & Non-Heparin Direct Thrombin Inhibitor Selection",
      prompt: "A postoperative cardiac surgery patient develops a 55% drop in platelet count on day 6 of subcutaneous unfractionated heparin, with an ultrasound-confirmed new deep vein thrombosis and no alternative cause.",
      ask: "What 4Ts score tier is established, what is the mandatory immediate management, and why are platelet transfusions contraindicated?",
      choices: [
        {
          id: "hit-high-probability-stop-heparin-dti-avoid-platelets",
          label: "Score is 8 points (High Probability tier, ~64% pretest probability); immediate cessation of all heparin products, initiation of a non-heparin direct thrombin inhibitor (argatroban or bivalirudin), and avoidance of prophylactic platelet transfusions",
        },
        {
          id: "hit-low-probability-continue-heparin",
          label: "Score is 2 points (Low Probability tier); heparin should be continued while awaiting ELISA antibody titers",
        },
        {
          id: "hit-platelet-transfusion-mandatory",
          label: "Score indicates consumptive marrow failure requiring immediate prophylactic platelet transfusion before any anticoagulation change",
        },
        {
          id: "hit-warfarin-immediate-monotherapy",
          label: "Heparin should be immediately transitioned to high-dose oral warfarin monotherapy while awaiting hematology consultation",
        },
      ],
      correct: "hit-high-probability-stop-heparin-dti-avoid-platelets",
      answer: "The Warkentin 4Ts score evaluates: (1) Thrombocytopenia (2 pts: >50% drop and nadir >= 20k), (2) Timing (2 pts: onset days 5–10), (3) Thrombosis (2 pts: proven new thrombosis), (4) oTher causes (2 pts: none apparent), totaling 8 points (High Probability tier, 6–8 pts, pretest probability ~64%). Pathophysiology: Antibodies against platelet factor 4 (PF4)-heparin complexes cross-link platelet Fc-gamma-RIIa receptors, causing massive platelet activation and consumptive hypercoagulability. Mandatory Immediate Protocol: (1) Immediately discontinue ALL heparin exposures, including flushes, LMWH, and heparin-bonded lines; (2) Order PF4/heparin ELISA followed by confirmatory functional assay (Serotonin Release Assay, SRA); (3) Initiate therapeutic non-heparin anticoagulation (Argatroban, Bivalirudin, or Fondaparinux); (4) Avoid prophylactic platelet transfusions, which add fuel to the fire by providing PF4-rich substrates that trigger catastrophic venous gangrene or arterial thrombosis. Transition to Warfarin is contraindicated until platelet count recovers to baseline (>= 150,000/mcL), as early warfarin precipitates microvascular thrombosis and skin necrosis via rapid protein C depletion.",
      drugIds: ["heparin", "argatroban", "bivalirudin"],
    },
    {
      id: "clin-argatroban-warfarin-crossover-trap",
      lane: "clinical",
      kicker: "Anticoagulation Transition & Laboratory Pitfalls",
      title: "Argatroban-to-Warfarin Transition: Artifactual INR Elevation & The Combined INR > 4.0 Target",
      prompt: "A patient with confirmed HIT is therapeutically anticoagulated on IV argatroban (target aPTT 1.5–3× baseline). The platelet count has recovered to 175,000/mcL, and the team begins transitioning to oral warfarin.",
      ask: "Why does argatroban interfere with INR monitoring during warfarin crossover, and what protocol verifies therapeutic INR before stopping argatroban?",
      choices: [
        {
          id: "argatroban-warfarin-combined-inr-target-4-hold-verify",
          label: "Argatroban directly prolongs PT/INR causing artifactual elevation; maintain co-administration until combined INR > 4.0, then hold argatroban and repeat solitary INR in 4–6 hours to confirm >= 2.0",
        },
        {
          id: "argatroban-warfarin-stop-at-inr-2",
          label: "Stop argatroban immediately once the combined INR reaches 2.0 to avoid bleeding complications",
        },
        {
          id: "argatroban-warfarin-anti-xa-monitoring",
          label: "Argatroban has zero effect on INR; monitoring during warfarin transition must use chromogenic anti-factor Xa assays",
        },
        {
          id: "argatroban-warfarin-never-combine",
          label: "Argatroban and warfarin must never be co-administered; argatroban must be washed out for 48 hours before warfarin initiation",
        },
      ],
      correct: "argatroban-warfarin-combined-inr-target-4-hold-verify",
      answer: "Argatroban is a small-molecule direct thrombin inhibitor (DTI) that inhibits both free and clot-bound thrombin (factor IIa). Because the prothrombin time (PT) / International Normalized Ratio (INR) assay relies on thrombin generation, argatroban produces a predictable, concentration-dependent artifactual prolongation of the INR (often doubling or tripling the baseline value). Consequently, when warfarin is co-administered, the measured INR reflects combined anticoagulant effects. Clinical Crossover Trap: If argatroban is stopped when the combined INR reaches the traditional 2.0–3.0 range, the solitary warfarin INR drops to subtherapeutic levels (< 1.5), leaving the patient unprotected against recurrent thrombosis. Guidelines (CHEST and package insert) mandate: (1) Maintain argatroban and warfarin co-therapy until the combined INR exceeds > 4.0 for at least 2 consecutive days; (2) Stop the argatroban infusion; (3) Repeat the INR 4 to 6 hours after stopping argatroban (allowing argatroban clearance; half-life ~45 min in normal liver); (4) If solitary INR is in the therapeutic range (2.0–3.0), argatroban remains off; if solitary INR is < 2.0, resume argatroban and adjust warfarin.",
      drugIds: ["argatroban", "warfarin"],
    },
    {
      id: "clin-protamine-heparin-decay-stoichiometry",
      lane: "clinical",
      kicker: "Critical Care Resuscitation & Anticoagulation Reversal",
      title: "Protamine Sulfate Heparin Reversal: Elimination Decay Stoichiometry & The 50 mg Single-Dose Ceiling",
      prompt: "A patient undergoing emergency coronary artery bypass surgery receives 30,000 units of IV unfractionated heparin. Two hours after the heparin infusion ended, urgent reversal is requested due to active surgical hemorrhage.",
      ask: "How is protamine sulfate dosed based on heparin elimination half-life, what is the single-dose ceiling, and what paradoxical risk arises from protamine excess?",
      choices: [
        {
          id: "protamine-decay-titration-50mg-cap-intrinsic-anticoagulation",
          label: "Dosing decays over time (0.25–0.375 mg per 100u heparin after 2 hours); single doses must not exceed 50 mg because unbound protamine possesses intrinsic anticoagulant properties that worsen bleeding",
        },
        {
          id: "protamine-fixed-100mg-bolus",
          label: "Protamine is always given as a fixed 100 mg rapid IV bolus regardless of timing or heparin dose",
        },
        {
          id: "protamine-zero-decay-constant-ratio",
          label: "Heparin has no clearance in blood, requiring a permanent 1:1 ratio (1 mg per 100u) up to 24 hours post-infusion",
        },
        {
          id: "protamine-causes-platelet-hyperaggregation",
          label: "Excess protamine causes massive platelet aggregation and acute arterial thrombosis",
        },
      ],
      correct: "protamine-decay-titration-50mg-cap-intrinsic-anticoagulation",
      answer: "Protamine sulfate is a strongly basic polycationic peptide derived from salmon sperm that forms an inactive, stable salt complex with strongly acidic unfractionated heparin (UFH). Stoichiometric neutralization ratio: 1 mg of protamine neutralizes approximately 100 USP units of heparin. Because UFH has a rapid elimination half-life (60–90 minutes), protamine dosing must be stepped down based on elapsed time: (1) < 30 minutes post-heparin: 1.0 to 1.5 mg protamine per 100 units heparin; (2) 30–60 minutes: 0.5 to 0.75 mg per 100 units; (3) 60–120 minutes: 0.375 to 0.5 mg per 100 units; (4) > 120 minutes: 0.25 to 0.375 mg per 100 units. Absolute Single-Dose Ceiling: No single dose should exceed 50 mg. Protamine Paradox: Unbound, free protamine has intrinsic anticoagulant properties—it inhibits platelets, impairs thrombin activity, and prolongs the ACT/aPTT. Administering excess protamine paradoxically worsens coagulopathic bleeding. Furthermore, protamine must be infused slowly (over 10–15 minutes); rapid IV push triggers catastrophic acute pulmonary vasoconstriction, fatal right ventricular failure, and systemic anaphylactoid collapse (elevated risk with prior vasectomy, NPH insulin use, or fish allergy). For low-molecular-weight heparin (enoxaparin), protamine neutralizes ~60% of anti-Xa activity (1 mg protamine per 1 mg enoxaparin within 8 hours).",
      drugIds: ["protamine", "heparin", "enoxaparin"],
    },
    {
      id: "clin-beta-lactam-extended-infusion-arc",
      lane: "clinical",
      kicker: "Infectious Diseases PK/PD & Augmented Renal Clearance",
      title: "Beta-Lactam Extended Infusions: Pharmacokinetic Optimization in Augmented Renal Clearance (ARC)",
      prompt: "A 28-year-old polytrauma patient in the surgical ICU with severe Pseudomonas aeruginosa pneumonia has a measured creatinine clearance of 185 mL/min/1.73m² (Augmented Renal Clearance, ARC). Standard intermittent cefepime 2g IV q8h over 30 minutes fails to achieve bactericidal targets.",
      ask: "What PK/PD index governs beta-lactam efficacy, why does ARC cause therapeutic failure with standard intermittent infusions, and how does extended/continuous infusion resolve it?",
      choices: [
        {
          id: "beta-lactam-ft-mic-extended-infusion-arc-clearance",
          label: "Beta-lactam efficacy is time-dependent (fT > MIC); hyperdynamic clearance in ARC causes plasma levels to rapidly plummet below MIC, and 3–4 hour extended or continuous infusions maintain concentrations above MIC without increasing daily dose",
        },
        {
          id: "beta-lactam-cmax-mic-concentration-dependent",
          label: "Beta-lactams are concentration-dependent (Cmax/MIC) killers; ARC requires high-dose rapid 5-minute boluses once daily",
        },
        {
          id: "beta-lactam-auc-mic-trough-only",
          label: "Beta-lactam activity depends purely on AUC24/MIC; ARC has zero impact on hydrophilic beta-lactam exposure",
        },
        {
          id: "beta-lactam-protein-binding-collapse",
          label: "ARC causes rapid degradation of plasma albumin, preventing beta-lactams from reaching lung tissue",
        },
      ],
      correct: "beta-lactam-ft-mic-extended-infusion-arc-clearance",
      answer: "Beta-lactam antibiotics (penicillins, cephalosporins, carbapenems, monobactams) exhibit time-dependent bactericidal activity governed by the PK/PD index fT > MIC (the percentage of the dosing interval that free unbound drug concentration remains above the bacterial minimum inhibitory concentration). Standard bactericidal targets are fT > MIC >= 50% for penicillins, >= 60–70% for cephalosporins, and >= 40% for carbapenems, but in critically ill patients or deep-seated pulmonary infections, consensus guidelines advocate fT > 4–5× MIC for 100% of the interval. Augmented Renal Clearance (ARC; CrCl > 130–160 mL/min/1.73m² common in young trauma, burn, and septic patients) dramatically accelerates renal elimination of hydrophilic beta-lactams, causing serum concentrations to drop below the MIC within 1 to 2 hours of a 30-minute intermittent bolus, resulting in therapeutic failure and emergence of resistance. Prolonging the infusion time to 3 to 4 hours (extended infusion) or administering a 24-hour continuous infusion (after a loading dose) flattens the concentration-time curve, keeping plasma levels continuously above the target threshold without increasing the total daily dose.",
      drugIds: ["cefepime", "piperacillin-tazobactam", "meropenem"],
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
