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

export function clinicalCards(): StudyCard[] {
  return [
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
  ];
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
