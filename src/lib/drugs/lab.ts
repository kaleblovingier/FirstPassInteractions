/**
 * PharmD lab-book assignments.
 * Students explain the mapped collision in three sentences. Not an exam key. Not a milligram.
 */

import { SAMPLE_REGIMENS, sampleNeedsPro, type SampleRegimen } from "./samples";

export interface LabAssignment {
  id: string;
  title: string;
  sampleId: string;
  /** What the student should explain in ~3 sentences. */
  prompt: string;
  /** Comparison text. Hidden until the student asks. Not a grade and not a dose. */
  key: string;
  /** Free desks can open this assignment without founding host extras. */
  freeOk: boolean;
}

export interface LabAnswer {
  text: string;
  updatedAt: string;
}

export type LabBookState = Record<string, LabAnswer>;

export const LAB_STORAGE_KEY = "firstpass.lab.v1";

/** Seed set: mix free cases with founding-host cases so export / host teach founding value. */
export const LAB_ASSIGNMENTS: LabAssignment[] = [
  {
    id: "gf-oral-ketamine",
    title: "Grapefruit × oral ketamine",
    sampleId: "gf-oral-ketamine",
    prompt:
      "In three sentences: name the perpetrator and victim, say why oral ketamine moves and IV barely does, and state what happens to F vs half-life. No milligram.",
    key: "Perpetrator: Grapefruit; Victim: Ketamine. Oral ketamine undergoes significant first-pass metabolism via CYP3A4, whereas IV bypasses this. Grapefruit inhibits intestinal 3A4, increasing bioavailability (F) without changing the systemic half-life.",
    freeOk: true,
  },
  {
    id: "dxm-2d6pm",
    title: "DXM in a 2D6 poor metabolizer",
    sampleId: "dxm-2d6pm",
    prompt:
      "In three sentences: explain how a 2D6 PM stacks parent DXM without a perpetrator drug, what falls (dextrorphan), and why q8h matters for accumulation. Host phenotype comes with founding.",
    key: "No perpetrator is required. CYP2D6 converts dextromethorphan to dextrorphan; a poor metabolizer leaves parent DXM high and dextrorphan low. An 8-hour interval is short next to that clearance, so the accumulation ratio rises. Steady state still arrives. It is higher, and later.",
    freeOk: false,
  },
  {
    id: "ketamine-benzo",
    title: "Ketamine × alprazolam",
    sampleId: "ketamine-benzo",
    prompt:
      "In three sentences: name the PD stack (NMDA + GABA), the airway risk, and why this blunts an antidepressant ketamine session. Not a dose.",
    key: "Ketamine is an NMDA antagonist and alprazolam is a GABA-A positive modulator. Together they raise airway risk beyond a generic two-sedative note. A benzo can also blunt the dissociative session an antidepressant ketamine protocol is built around. Not a dose.",
    freeOk: true,
  },
  {
    id: "tacrolimus-gf",
    title: "Tacrolimus × grapefruit",
    sampleId: "tacrolimus-gf",
    prompt:
      "In three sentences: identify the NTI victim and intestinal 3A4 knockout, say what rises (F) and what does not (t½), and why transplant desks care. No milligram.",
    key: "Victim: Tacrolimus (Narrow Therapeutic Index); Perpetrator: Grapefruit. Grapefruit inhibits intestinal CYP3A4, which increases the fraction absorbed (F). The systemic half-life (t½) remains unchanged. This leads to toxicity risk (nephrotoxicity/neurotoxicity) in transplant patients.",
    freeOk: true,
  },
  {
    id: "xylazine-fentanyl",
    title: "Xylazine × fentanyl",
    sampleId: "xylazine-fentanyl",
    prompt:
      "In three sentences: name the α2 vs μ roles, say what naloxone will and will not reverse, and state the street-supply airway teaching point. Not a protocol.",
    key: "Fentanyl is a μ-opioid agonist; Xylazine is an α2-adrenergic agonist. Naloxone reverses the fentanyl-induced respiratory depression but has no effect on xylazine-induced sedation/hypotension. In street supplies, this creates a non-responsive overdose where the patient remains unconscious despite naloxone.",
    freeOk: true,
  },
  {
    id: "naltrexone-opioid",
    title: "Naltrexone × oxycodone",
    sampleId: "naltrexone-opioid",
    prompt:
      "In three sentences: explain precipitated withdrawal vs stacked milligrams, what analgesia does, and when a MAT desk would refuse the agonist. No milligram.",
    key: "Giving naltrexone to someone still on an agonist can precipitate withdrawal. Giving an agonist to someone stable on naltrexone does not stack milligrams: analgesia is blocked. A MAT desk refuses the agonist while naltrexone occupancy is still on board. Not a milligram.",
    freeOk: true,
  },
  {
    id: "smoke-clozapine",
    title: "Clozapine × daily smoke",
    sampleId: "smoke-clozapine",
    prompt:
      "In three sentences: name the PAH → 1A2 induction, what happens to clozapine levels on smoke, and the rebound risk on quit. The smoke host factor comes with founding.",
    key: "Polycyclic aromatic hydrocarbons (PAH) in tobacco smoke induce CYP1A2. This increases the clearance of clozapine, lowering its serum concentrations. Quitting smoking removes that induction, and clozapine levels can rise into toxicity.",
    freeOk: false,
  },
  {
    id: "beers-lorazepam",
    title: "Clozapine × lorazepam (Beers / wards)",
    sampleId: "safety-clozapine-lorazepam",
    prompt:
      "In three sentences: name the boxed respiratory collapse pair, why this is not generic CNS stacking, and how Beers / older-adult host context sharpens the same map. Flip Geriatric on a founding desk if you have it. Not a dose.",
    key: "Clozapine plus lorazepam is a boxed respiratory-collapse pair, separate from ordinary CNS stacking. The label names collapse. It does not measure a brainstem mechanism. On an older-adult Beers desk the same pair sits on less physiologic reserve. Not a dose.",
    freeOk: true,
  },
];

export const LAB_BY_ID = Object.fromEntries(LAB_ASSIGNMENTS.map((a) => [a.id, a])) as Record<
  string,
  LabAssignment
>;

export function labAssignment(id: string | null | undefined): LabAssignment | null {
  if (!id) return null;
  return LAB_BY_ID[id] ?? null;
}

export function sampleForLab(assignment: LabAssignment): SampleRegimen | null {
  return SAMPLE_REGIMENS.find((s) => s.id === assignment.sampleId) ?? null;
}

/** True when the assignment (or its sample) needs founding host factors. */
export function labNeedsPro(assignment: LabAssignment): boolean {
  if (!assignment.freeOk) return true;
  const sample = sampleForLab(assignment);
  return sample ? sampleNeedsPro(sample) : false;
}

export function readLabBook(): LabBookState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAB_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: LabBookState = {};
    for (const [id, row] of Object.entries(parsed as Record<string, unknown>)) {
      if (!row || typeof row !== "object") continue;
      const text = (row as LabAnswer).text;
      const updatedAt = (row as LabAnswer).updatedAt;
      if (typeof text === "string" && typeof updatedAt === "string") {
        out[id] = { text, updatedAt };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeLabAnswer(assignmentId: string, text: string): LabAnswer {
  const next: LabAnswer = { text, updatedAt: new Date().toISOString() };
  if (typeof window === "undefined") return next;
  const book = readLabBook();
  book[assignmentId] = next;
  window.localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(book));
  return next;
}

export function buildLabUrl(assignmentId: string, opts?: { base?: string }): string {
  const url = new URL(opts?.base ?? "https://firstpass-desk.vercel.app");
  url.searchParams.set("lab", assignmentId);
  return url.toString();
}

export interface LabReceipt {
  assignmentId: string;
  title: string;
  sampleId: string;
  drugs: string[];
  leadHeadline: string | null;
  studentText: string;
  ts: string;
  softwareVersion: string;
  disclaimer: string;
}

export function labReceiptCsv(receipt: LabReceipt): string {
  const cells = [
    receipt.assignmentId,
    receipt.title,
    receipt.sampleId,
    receipt.drugs.join("|"),
    receipt.leadHeadline ?? "",
    receipt.studentText,
    receipt.ts,
    receipt.softwareVersion,
  ].map((s) => `"${String(s).replace(/"/g, '""')}"`);
  return [
    "# FirstPass lab receipt — educational only. Not FDA-cleared. Not a dose. PI governs.",
    "assignmentId,title,sampleId,drugs,leadHeadline,studentText,ts,softwareVersion",
    cells.join(","),
  ].join("\n");
}
