import type { PackId } from "@/lib/drugs/permalinks";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { FOR_PROGRAMS_PATH, FOR_PROGRAMS_URL } from "./for-programs";

/**
 * Copy for /for-programs/course-kit: a week-by-week plan faculty can adopt.
 * Every activity points at something that already exists in the repo (a teaching
 * pack, a lab-book assignment, a sample case, a workup case, a pair page, an
 * enzyme page, a glossary entry or a practice filter). course-kit.test.ts
 * resolves each one against the real data and fails when one is missing.
 *
 * Rules the tests enforce:
 * - Module text says what the learner will open and look at. It makes no
 *   clinical claim of its own and names no grade outcome, dose or protocol.
 * - No price, "free" or "Pro". No purchase flow: the only ask is the
 *   existing inquiry form on /for-programs.
 * - Lab-book assignments and sample cases are ones a desk without a key can
 *   open (labNeedsPro / sampleNeedsPro are false), so a whole class can use them.
 *
 * This module stays light (no engine, catalog or pair-page imports): the route
 * chunk only needs the plan itself.
 */

export const COURSE_KIT_SLUG = "course-kit";
export const COURSE_KIT_PATH = `${FOR_PROGRAMS_PATH}/${COURSE_KIT_SLUG}`;
export const COURSE_KIT_URL = `${FOR_PROGRAMS_URL}/${COURSE_KIT_SLUG}`;

export const COURSE_KIT_NAME = "Course kit";
export const COURSE_KIT_TITLE = "Course kit: an eight-week drug-interaction teaching plan | FirstPass";
export const COURSE_KIT_DESCRIPTION = `A ready-made eight-week plan for teaching drug interactions with FirstPass: study goals, linked teaching packs, lab-book assignments, workup cases and practice rounds for each week. ${PAIR_DISCLAIMER}`;
export const COURSE_KIT_H1 = "A course kit for teaching drug interactions";
export const COURSE_KIT_INTRO =
  "This kit lays out eight weekly modules that a pharmacology, therapeutics or in-service course can adopt as written or rearrange. Each module lists study goals, two to four activities that already exist on FirstPass, an estimate of the time they take and a practice round to close the week. Every link opens a public page or the desk.";
/** The kit's own framing line, shown next to the intended-users line. */
export const COURSE_KIT_FRAMING =
  "The kit is a study outline for supervised education. It is not a clinical protocol, an exam key or a grading scheme. Faculty decide how to use it and how to assess learners.";
export const COURSE_KIT_HOW: string[] = [
  "Weeks build on each other, but each module also stands on its own.",
  "Key terms link to the glossary. Read them before the activities.",
  "Lab-book assignments ask for a three-sentence explanation, then show a written key to compare with. The key is study text, not an answer to grade against.",
  "Workup cases ask learners to call which pairs in a list interact and how, then compare with the desk's findings and sources.",
  "Minutes are rough estimates for one learner working alone. Discussion time is extra.",
];
export const COURSE_KIT_LMS =
  "Programs that teach in an LMS can host the SCORM 1.2 package of label-quoted pair cards next to this plan. It reports a page as viewed and sends no score.";
export const COURSE_KIT_HOST_NOTE =
  "The desk's host panel (age, kidney function, pregnancy and lactation, metabolizer status) comes with a program key. Without one, the activities above still open.";

/** Practice deck filters, as /practice reads them from the URL (practice-meta.ts). */
export type KitGrade = "contraindicated" | "major" | "moderate" | "minor";
export interface KitPractice {
  enzyme?: string;
  grade?: KitGrade;
}

/** What one activity opens. Each kind maps to one existing URL shape. */
export type KitTarget =
  | { kind: "pack"; pack: PackId }
  | { kind: "lab"; lab: string }
  | { kind: "case"; caseId: string }
  | { kind: "workup"; caseId: string }
  | { kind: "pair"; slug: string }
  | { kind: "enzyme"; slug: string };

export interface KitActivity {
  /** Short label for the link. */
  label: string;
  /** One sentence on what the learner opens and looks at. */
  what: string;
  minutes: number;
  target: KitTarget;
}

export interface KitModule {
  week: number;
  id: string;
  title: string;
  /** Neutral study goals: what a learner should be able to describe or find. */
  objectives: string[];
  /** Glossary ids (/glossary#<id>) to read first. */
  terms: string[];
  /** 2 to 4 activities. */
  activities: KitActivity[];
  /** One line: the practice round that closes the week. */
  check: { text: string; practice: KitPractice };
  note?: string;
}

export const KIT_TYPE_LABEL: Record<KitTarget["kind"], string> = {
  pack: "Teaching pack",
  lab: "Lab book",
  case: "Desk case",
  workup: "Workup",
  pair: "Pair page",
  enzyme: "Enzyme page",
};

/* Shared activity wording, written once. */
const LAB_WHAT = "Open the assignment on the desk, write the three-sentence explanation it asks for, then compare it with the written key.";
const CASE_WHAT = "Load the case on the desk and read the finding card: the mechanism line, the effect line and the source it links.";
const WORKUP_WHAT = "Call each pair in the list as no interaction, pharmacokinetic or pharmacodynamic, then compare with the desk's findings and sources.";
const PAIR_WHAT = "Read the label quote, the section it comes from and the \"Why this grade\" box.";

export const COURSE_KIT_MODULES: readonly KitModule[] = [
  {
    week: 1,
    id: "cyp-basics",
    title: "CYP basics and first-pass metabolism",
    objectives: [
      "Define substrate, and say where the gut wall and the liver fit into first-pass metabolism.",
      "Find an enzyme page and read which catalog items it lists in each role.",
      "Explain why the route a drug is taken by can matter for an enzyme interaction.",
    ],
    terms: ["cytochrome-p450", "substrate", "first-pass-effect", "bioavailability"],
    activities: [
      {
        label: "CYP3A4",
        what: "Browse the CYP3A4 page: the items the catalog lists as substrates, inhibitors and inducers, and the pair pages grouped by grade.",
        minutes: 15,
        target: { kind: "enzyme", slug: "cyp3a4" },
      },
      { label: "Grapefruit and oral ketamine", what: LAB_WHAT, minutes: 20, target: { kind: "lab", lab: "gf-oral-ketamine" } },
      { label: "Oral ketamine and clarithromycin", what: CASE_WHAT, minutes: 15, target: { kind: "case", caseId: "ketamine-3a4" } },
    ],
    check: {
      text: "Run a practice round filtered to CYP3A4 and name each drug's enzyme role before you reveal the label quote.",
      practice: { enzyme: "CYP3A4" },
    },
  },
  {
    week: 2,
    id: "inhibition-induction",
    title: "Inhibition and induction",
    objectives: [
      "Tell an inhibitor from an inducer, and a perpetrator from a victim, on a pair page.",
      "Find the label section a pair page quotes and the box that explains what its grade rests on.",
      "Compare an inhibitor case with an inducer case that share a substrate.",
    ],
    terms: ["inhibitor", "inducer", "perpetrator", "time-dependent-inhibition"],
    activities: [
      { label: "Simvastatin and clarithromycin", what: PAIR_WHAT, minutes: 10, target: { kind: "pair", slug: "simvastatin-clarithromycin" } },
      { label: "Clarithromycin and midazolam", what: CASE_WHAT, minutes: 15, target: { kind: "case", caseId: "cyp-clarith-midazolam" } },
      {
        label: "Rifampin and midazolam",
        what: "Load the case and set its finding card next to the clarithromycin and midazolam card: the same substrate with a different perpetrator.",
        minutes: 15,
        target: { kind: "case", caseId: "cyp-rifampin-midazolam" },
      },
      { label: "Chest infection in a statin user", what: WORKUP_WHAT, minutes: 20, target: { kind: "workup", caseId: "wk-statin-macrolide" } },
    ],
    check: {
      text: "Run a practice round filtered to CYP3A4 and Serious concern, and say for each card whether the perpetrator is an inhibitor or an inducer.",
      practice: { enzyme: "CYP3A4", grade: "major" },
    },
  },
  {
    week: 3,
    id: "phenoconversion-pgx",
    title: "Phenoconversion and pharmacogenomics",
    objectives: [
      "Describe the metabolizer status terms the glossary uses, from poor to ultrarapid.",
      "Explain phenoconversion in the glossary's own words.",
      "Explain what a prodrug is, and find the activation note on the CYP2D6 page if it shows one.",
    ],
    terms: ["phenoconversion", "poor-metabolizer", "ultrarapid-metabolizer", "prodrug"],
    activities: [
      {
        label: "CYP2D6",
        what: "Browse the CYP2D6 page: the items it lists as substrates and inhibitors, and the pair pages grouped by grade.",
        minutes: 15,
        target: { kind: "enzyme", slug: "cyp2d6" },
      },
      { label: "Paroxetine and codeine", what: CASE_WHAT, minutes: 15, target: { kind: "case", caseId: "pheno-codeine" } },
      {
        label: "Fluoxetine and codeine",
        what: "Load a second case with the same victim drug and compare its finding card with the one before.",
        minutes: 15,
        target: { kind: "case", caseId: "cyp-fluoxetine-codeine" },
      },
    ],
    check: {
      text: "Run a practice round filtered to CYP2D6 and name each drug's enzyme role before you reveal the label quote.",
      practice: { enzyme: "CYP2D6" },
    },
  },
  {
    week: 4,
    id: "pd-stacks",
    title: "Pharmacodynamic stacks: serotonin, QT and sedation",
    objectives: [
      "Tell a pharmacodynamic interaction from a pharmacokinetic one on a finding card.",
      "Find the glossary entries for serotonin toxicity and the QTc interval, and the sources they cite.",
      "Work up a medicine list where more than one pair adds to the same effect.",
    ],
    terms: ["pharmacodynamic-interaction", "additive-effect", "serotonin-toxicity", "qtc"],
    activities: [
      { label: "Back pain and migraine on an antidepressant", what: WORKUP_WHAT, minutes: 20, target: { kind: "workup", caseId: "wk-serotonin" } },
      { label: "Pneumonia on the medical ward", what: WORKUP_WHAT, minutes: 20, target: { kind: "workup", caseId: "wk-qt-ward" } },
      { label: "Ketamine and alprazolam", what: LAB_WHAT, minutes: 20, target: { kind: "lab", lab: "ketamine-benzo" } },
      { label: "Sertraline and linezolid", what: PAIR_WHAT, minutes: 10, target: { kind: "pair", slug: "sertraline-linezolid" } },
    ],
    check: {
      text: "Run a practice round filtered to Avoid together and note which cards list no enzyme at all.",
      practice: { grade: "contraindicated" },
    },
  },
  {
    week: 5,
    id: "transporters-food-supplements",
    title: "Transporters, food and supplements",
    objectives: [
      "Name the transporters the glossary covers and find the P-glycoprotein page.",
      "Explain narrow therapeutic index in the glossary's own words, and find where the tacrolimus lab key uses it.",
      "Work up a list that includes an herbal product next to prescription medicines.",
    ],
    terms: ["p-glycoprotein", "oatp1b1-oatp1b3", "narrow-therapeutic-index"],
    activities: [
      {
        label: "P-glycoprotein",
        what: "Browse the P-glycoprotein page: the items it lists as substrates, inhibitors and inducers, and the pair pages grouped by grade.",
        minutes: 15,
        target: { kind: "enzyme", slug: "p-gp" },
      },
      { label: "Tacrolimus and grapefruit", what: LAB_WHAT, minutes: 20, target: { kind: "lab", lab: "tacrolimus-gf" } },
      { label: "Loperamide and quinidine", what: CASE_WHAT, minutes: 15, target: { kind: "case", caseId: "loperamide-quinidine" } },
      { label: "Heart transplant patient with low mood", what: WORKUP_WHAT, minutes: 20, target: { kind: "workup", caseId: "wk-transplant-herbal" } },
    ],
    check: {
      text: "Run a practice round filtered to Serious concern and, on each reveal, note any label quote that names a transporter, a food or a supplement.",
      practice: { grade: "major" },
    },
  },
  {
    week: 6,
    id: "moud-harm-reduction",
    title: "Medications for opioid use disorder and harm reduction",
    objectives: [
      "Find the label sections that methadone and buprenorphine pair pages quote.",
      "Explain, in the lab book's own terms, how an antagonist and an agonist differ on the desk.",
      "Describe what the desk shows for a street-supply pair that mixes two drug classes.",
    ],
    terms: ["boxed-warning", "warnings-and-precautions", "additive-effect"],
    activities: [
      {
        label: "MAT teaching pack",
        what: "Open the pack and work through its cases in order, reading each finding card and its source.",
        minutes: 25,
        target: { kind: "pack", pack: "mat-cup" },
      },
      { label: "Naltrexone and oxycodone", what: LAB_WHAT, minutes: 20, target: { kind: "lab", lab: "naltrexone-opioid" } },
      { label: "Xylazine and fentanyl", what: LAB_WHAT, minutes: 20, target: { kind: "lab", lab: "xylazine-fentanyl" } },
      { label: "Methadone and buprenorphine", what: PAIR_WHAT, minutes: 10, target: { kind: "pair", slug: "methadone-buprenorphine" } },
    ],
    check: {
      text: "Run a practice round filtered to Serious concern and say for each card which label section the quote comes from.",
      practice: { grade: "major" },
    },
  },
  {
    week: 7,
    id: "special-populations",
    title: "Special populations: older adults, kidney function, pregnancy and lactation",
    objectives: [
      "Find the Beers Criteria entry in the glossary and the source it cites.",
      "Read the glossary's clearance entry and say where kidney function fits into it.",
      "Describe what the desk shows for a case set in lactation, and which source it links.",
    ],
    terms: ["beers-criteria", "clearance", "anticholinergic-burden"],
    activities: [
      { label: "Clozapine and lorazepam (Beers / wards)", what: LAB_WHAT, minutes: 20, target: { kind: "lab", lab: "beers-lorazepam" } },
      { label: "Bipolar disorder with high blood pressure", what: WORKUP_WHAT, minutes: 20, target: { kind: "workup", caseId: "wk-lithium-thiazide" } },
      { label: "Methadone and breastfeeding", what: CASE_WHAT, minutes: 15, target: { kind: "case", caseId: "lact-methadone" } },
    ],
    check: {
      text: "Run a practice round filtered to Use care and, on each reveal, note any label quote that names an age group, kidney function, pregnancy or lactation.",
      practice: { grade: "moderate" },
    },
    note: COURSE_KIT_HOST_NOTE,
  },
  {
    week: 8,
    id: "capstone",
    title: "Capstone workup",
    objectives: [
      "Work up a full medicine list without help, then compare every call with the desk.",
      "Open the source behind each pair the desk maps, and find the label section it comes from.",
      "Name one pair the desk does not map and say what that does and does not mean.",
    ],
    terms: ["prescribing-information", "drug-interactions-section", "contraindication"],
    activities: [
      { label: "HIV clinic: hay fever and cholesterol", what: WORKUP_WHAT, minutes: 25, target: { kind: "workup", caseId: "wk-hiv-booster" } },
      { label: "Heart failure discharge list", what: WORKUP_WHAT, minutes: 25, target: { kind: "workup", caseId: "wk-heart-failure" } },
      { label: "Facial nerve pain and a new clot", what: WORKUP_WHAT, minutes: 25, target: { kind: "workup", caseId: "wk-doac-inducer" } },
      {
        label: "PharmD lab pack",
        what: "Open the pack and review its cases as a class, one finding card at a time.",
        minutes: 20,
        target: { kind: "pack", pack: "pharmd" },
      },
    ],
    check: {
      text: "Finish with an unfiltered practice session and review the summary of missed pairs by enzyme.",
      practice: {},
    },
  },
];

/* ---------------- links ---------------- */

/** Site-relative href for an activity's target. */
export function kitTargetHref(t: KitTarget): string {
  switch (t.kind) {
    case "pack":
      return `/?pack=${encodeURIComponent(t.pack)}`;
    case "lab":
      return `/?lab=${encodeURIComponent(t.lab)}`;
    case "case":
      return `/?case=${encodeURIComponent(t.caseId)}`;
    case "workup":
      return `/workup?case=${encodeURIComponent(t.caseId)}`;
    case "pair":
      return `/pair/${encodeURIComponent(t.slug)}`;
    case "enzyme":
      return `/enzyme/${encodeURIComponent(t.slug)}`;
  }
}

export const glossaryHref = (id: string) => `/glossary#${encodeURIComponent(id)}`;

/** /practice with the deck filters, e.g. /practice?enzyme=CYP3A4&grade=major. */
export function practiceHref(p: KitPractice): string {
  const q = new URLSearchParams();
  if (p.enzyme) q.set("enzyme", p.enzyme);
  if (p.grade) q.set("grade", p.grade);
  const s = q.toString();
  return s ? `/practice?${s}` : "/practice";
}

export const moduleMinutes = (m: KitModule) => m.activities.reduce((n, a) => n + a.minutes, 0);
export const courseKitMinutes = () => COURSE_KIT_MODULES.reduce((n, m) => n + moduleMinutes(m), 0);

/** "1 h 5 min", "45 min". */
export function formatMinutes(n: number): string {
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const abs = (href: string) => `${SITE_URL}${href}`;

/* ---------------- exports ---------------- */

/** The whole plan as Markdown, with absolute links. Built in the browser for "Export plan". */
export function courseKitMarkdown(): string {
  const out: string[] = [`# FirstPass ${COURSE_KIT_NAME.toLowerCase()}: eight weeks of drug-interaction teaching`, "", COURSE_KIT_INTRO, "", COURSE_KIT_FRAMING, "", `Source: ${COURSE_KIT_URL}`, ""];
  for (const m of COURSE_KIT_MODULES) {
    out.push(`## Week ${m.week}: ${m.title}`, "", `Estimated time: ${formatMinutes(moduleMinutes(m))}`, "", "Study goals:", "");
    for (const o of m.objectives) out.push(`- ${o}`);
    out.push("", `Key terms: ${m.terms.map((t) => `[${t}](${abs(glossaryHref(t))})`).join(", ")}`, "", "Activities:", "");
    for (const a of m.activities) out.push(`- ${KIT_TYPE_LABEL[a.target.kind]}: [${a.label}](${abs(kitTargetHref(a.target))}) (${a.minutes} min). ${a.what}`);
    out.push("", `Check for understanding: ${m.check.text} ${abs(practiceHref(m.check.practice))}`, "");
    if (m.note) out.push(m.note, "");
  }
  out.push(COURSE_KIT_LMS, "", PAIR_DISCLAIMER, "");
  return out.join("\n");
}

/** One CSV cell: quoted, with a leading apostrophe on anything a spreadsheet would read as a formula. */
function cell(v: string | number): string {
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const COURSE_KIT_CSV_HEADER = ["week", "module", "type", "activity", "minutes", "url", "what_to_do"] as const;

/** One row per activity, plus a check-for-understanding row per week. */
export function courseKitCsv(): string {
  const rows: (string | number)[][] = [];
  for (const m of COURSE_KIT_MODULES) {
    for (const a of m.activities) rows.push([m.week, m.title, KIT_TYPE_LABEL[a.target.kind], a.label, a.minutes, abs(kitTargetHref(a.target)), a.what]);
    rows.push([m.week, m.title, "Check for understanding", "Practice round", "", abs(practiceHref(m.check.practice)), m.check.text]);
  }
  return [
    `# FirstPass course kit. ${PAIR_DISCLAIMER}`,
    COURSE_KIT_CSV_HEADER.join(","),
    ...rows.map((r) => r.map(cell).join(",")),
  ].join("\n") + "\n";
}

/* ---------------- structured data ---------------- */

/** JSON-LD: a LearningResource with one part per week. No prices or offers. */
export function courseKitJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: "FirstPass course kit",
    description: COURSE_KIT_DESCRIPTION,
    url: COURSE_KIT_URL,
    learningResourceType: "Lesson plan",
    educationalUse: "Supervised education",
    audience: { "@type": "EducationalAudience", educationalRole: "faculty" },
    isPartOf: { "@type": "WebPage", name: "FirstPass for programs", url: FOR_PROGRAMS_URL },
    provider: { "@type": "Organization", name: "FirstPass", url: `${SITE_URL}/` },
    hasPart: COURSE_KIT_MODULES.map((m) => ({
      "@type": "LearningResource",
      name: `Week ${m.week}: ${m.title}`,
      timeRequired: `PT${moduleMinutes(m)}M`,
      teaches: m.objectives,
    })),
  };
}
