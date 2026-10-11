/**
 * AF stroke and bleed teaching engine.
 *
 * Puts the two scores a learner meets on every atrial fibrillation (AF) consult
 * side by side: CHA2DS2-VASc (and the sex-free CHA2DS2-VA from ESC 2024) for
 * stroke, HAS-BLED for bleeding. Reads the tray for the HAS-BLED "drugs" item
 * and for antiplatelet plus anticoagulant overlap, and borrows the DOAC label
 * rails from doac.ts so this desk never disagrees with the DOAC desk.
 *
 * The core teaching point: a high HAS-BLED score is a list of things to fix and
 * a reason to follow up more closely. It is not, by itself, a reason to leave a
 * patient without stroke prevention.
 *
 * Teaching scores only. Not a decision, not a dose, not an order.
 *
 * Sources:
 *   Lip GYH, et al. Chest 2010;137(2):263–272 (CHA2DS2-VASc).
 *   Pisters R, et al. Chest 2010;138(5):1093–1100 (HAS-BLED).
 *   Joglar JA, et al. 2023 ACC/AHA/ACCP/HRS AF Guideline. Circulation 2024;149:e1–e156.
 *   Van Gelder IC, et al. 2024 ESC AF Guidelines. Eur Heart J 2024;45:3314–3414.
 *   Lopes RD, et al. AUGUSTUS. N Engl J Med 2019;380:1509–1524.
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";
import { crclOf, type CrclResult, type Sex } from "./bedside";
import {
  ALL_ANTICOAGULANT_IDS,
  DOAC_IDS,
  evaluateApixabanAbc,
  evaluateDoacRenal,
  type ApixabanAbcEvaluation,
  type DoacRenalRail,
} from "./doac";

export const AF_DISCLAIMER =
  "Teaching scores, not a decision or an order. CHA2DS2-VASc and HAS-BLED estimate population risk; the current guideline, the Prescribing Information, and the treating clinician govern.";

export const AF_CITATIONS: string[] = [
  "Lip GYH, Nieuwlaat R, Pisters R, Lane DA, Crijns HJGM. Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation using a novel risk factor-based approach: the Euro Heart Survey on Atrial Fibrillation. Chest 2010;137(2):263–272.",
  "Pisters R, Lane DA, Nieuwlaat R, de Vos CB, Crijns HJGM, Lip GYH. A novel user-friendly score (HAS-BLED) to assess 1-year risk of major bleeding in patients with atrial fibrillation: the Euro Heart Survey. Chest 2010;138(5):1093–1100.",
  "Joglar JA, Chung MK, Armbruster AL, et al. 2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation. Circulation 2024;149:e1–e156.",
  "Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314–3414. (Introduces CHA2DS2-VA, which drops sex.)",
  "Lopes RD, Heizer G, Aronson R, et al. Antithrombotic therapy after acute coronary syndrome or PCI in atrial fibrillation (AUGUSTUS). N Engl J Med 2019;380:1509–1524.",
];

/* ── Shared shapes ────────────────────────────────────────────────────── */

export interface ScoreItem {
  key: string;
  /** Letter in the acronym, e.g. "C", "A2", "S2". */
  letter: string;
  label: string;
  points: number;
  maxPoints: number;
  met: boolean;
  note?: string;
}

const item = (key: string, letter: string, label: string, maxPoints: number, points: number, note?: string): ScoreItem => ({
  key,
  letter,
  label,
  maxPoints,
  points,
  met: points > 0,
  ...(note ? { note } : {}),
});

const sum = (items: ScoreItem[]) => items.reduce((n, i) => n + i.points, 0);
const validAge = (a: number) => Number.isFinite(a) && a >= 0;

/* ── Stroke risk: CHA2DS2-VASc and CHA2DS2-VA ─────────────────────────── */

export interface StrokeRiskInput {
  ageYears: number;
  sex: Sex;
  /** Heart failure or moderate-to-severe LV dysfunction. */
  chf: boolean;
  hypertension: boolean;
  diabetes: boolean;
  /** Prior stroke, TIA, or systemic thromboembolism. */
  strokeTia: boolean;
  /** Prior MI, peripheral artery disease, or aortic plaque. */
  vascular: boolean;
}

export type VascTier = "recommended" | "reasonable" | "not-recommended";
export type VaTier = "recommended" | "consider" | "not-recommended";

export interface StrokeScoreResult<T extends string> {
  score: number;
  max: number;
  items: ScoreItem[];
  tier: T;
  recommendation: string;
  source: string;
  notes: string[];
}

function ageItems(ageYears: number): ScoreItem[] {
  const a = validAge(ageYears) ? ageYears : 0;
  return [
    item("age75", "A2", "Age 75 or older", 2, a >= 75 ? 2 : 0),
    item("age65", "A", "Age 65 to 74", 1, a >= 65 && a < 75 ? 1 : 0, "Age counts once: 65–74 is 1 point, 75 or older is 2."),
  ];
}

function sharedStrokeItems(input: StrokeRiskInput): ScoreItem[] {
  const [a2, a] = ageItems(input.ageYears);
  return [
    item("chf", "C", "Heart failure or LV dysfunction", 1, input.chf ? 1 : 0),
    item("htn", "H", "Hypertension", 1, input.hypertension ? 1 : 0),
    a2,
    item("dm", "D", "Diabetes", 1, input.diabetes ? 1 : 0),
    item("stroke", "S2", "Prior stroke, TIA, or thromboembolism", 2, input.strokeTia ? 2 : 0),
    item("vasc", "V", "Vascular disease (prior MI, PAD, aortic plaque)", 1, input.vascular ? 1 : 0),
    a,
  ];
}

export const FEMALE_SEX_NOTE =
  "Female sex is a risk modifier, not a standalone risk factor. A woman whose only point is sex has low stroke risk. Sex raises risk only when other factors are present.";

/** CHA2DS2-VASc (Lip 2010), read against the ACC/AHA 2023 annual-risk thresholds. Max 9. */
export function chads2Vasc(input: StrokeRiskInput): StrokeScoreResult<VascTier> {
  const female = input.sex === "female";
  const items = [...sharedStrokeItems(input), item("sex", "Sc", "Female sex (risk modifier)", 1, female ? 1 : 0, FEMALE_SEX_NOTE)];
  const score = sum(items);
  const nonSex = score - (female ? 1 : 0);
  let tier: VascTier;
  let recommendation: string;
  if (nonSex >= 2) {
    tier = "recommended";
    recommendation = `Score ${score} (${female ? "women ≥3" : "men ≥2"}). Annual stroke risk is about 2% or more. ACC/AHA 2023 recommends oral anticoagulation; a DOAC is preferred over warfarin when eligible.`;
  } else if (nonSex === 1) {
    tier = "reasonable";
    recommendation = `Score ${score} (${female ? "women 2" : "men 1"}). Annual risk is roughly 1% to 2%. ACC/AHA 2023 says anticoagulation is reasonable to consider. This is a shared decision.`;
  } else {
    tier = "not-recommended";
    recommendation = `Score ${score} (${female ? "women 1" : "men 0"}). Low risk. ACC/AHA 2023 does not recommend anticoagulation for stroke prevention. Re-score as the patient ages or gains risk factors.`;
  }
  const notes = [FEMALE_SEX_NOTE];
  if (input.strokeTia) notes.push("Prior stroke or TIA alone puts the score at 2 or more. Secondary prevention is the strongest case for anticoagulation.");
  return { score, max: 9, items, tier, recommendation, source: "ACC/AHA/ACCP/HRS 2023", notes };
}

/** CHA2DS2-VA (ESC 2024): the same score with sex removed. Max 8. */
export function cha2ds2Va(input: StrokeRiskInput): StrokeScoreResult<VaTier> {
  const items = sharedStrokeItems(input);
  const score = sum(items);
  let tier: VaTier;
  let recommendation: string;
  if (score >= 2) {
    tier = "recommended";
    recommendation = `Score ${score}. ESC 2024 recommends oral anticoagulation (class I).`;
  } else if (score === 1) {
    tier = "consider";
    recommendation = `Score ${score}. ESC 2024 says anticoagulation should be considered (class IIa).`;
  } else {
    tier = "not-recommended";
    recommendation = `Score ${score}. No CHA2DS2-VA risk factor. ESC 2024 does not suggest anticoagulation on this score alone.`;
  }
  const notes = [
    "ESC 2024 dropped sex so one threshold serves everyone. It also reminds the reader that risk factors outside the score still count.",
  ];
  return { score, max: 8, items, tier, recommendation, source: "ESC 2024", notes };
}

/* ── Bleed risk: HAS-BLED ─────────────────────────────────────────────── */

export type Modifiability = "modifiable" | "partly" | "fixed";

export interface BleedScoreItem extends ScoreItem {
  modifiability: Modifiability;
  /** What a learner would look at to lower this item. */
  fix?: string;
}

export interface BleedRiskInput {
  /** Systolic BP above 160 mmHg. */
  uncontrolledHtn: boolean;
  /** Dialysis, transplant, or creatinine ≥2.26 mg/dL (200 µmol/L). */
  abnormalRenal: boolean;
  /** Cirrhosis, or bilirubin >2× ULN with AST/ALT/ALP >3× ULN. */
  abnormalLiver: boolean;
  stroke: boolean;
  /** Prior major bleed, anemia, or bleeding predisposition. */
  bleeding: boolean;
  /** Time in therapeutic range under 60%. Only counted on a VKA. */
  labileInr: boolean;
  onVka: boolean;
  ageYears: number;
  /** Concomitant antiplatelet or NSAID. */
  antiplateletOrNsaid: boolean;
  /** Eight or more drinks a week. */
  alcohol: boolean;
}

export interface HasBledResult {
  score: number;
  max: number;
  items: BleedScoreItem[];
  highRisk: boolean;
  /** Met items that a team can act on (modifiable or partly modifiable). */
  modifiableMet: BleedScoreItem[];
  message: string;
  notes: string[];
}

const bleedItem = (
  base: ScoreItem,
  modifiability: Modifiability,
  fix?: string,
): BleedScoreItem => ({ ...base, modifiability, ...(fix ? { fix } : {}) });

/** HAS-BLED (Pisters 2010). Max 9. */
export function hasBled(input: BleedRiskInput): HasBledResult {
  const elderly = validAge(input.ageYears) && input.ageYears > 65;
  const labileCounts = input.labileInr && input.onVka;
  const items: BleedScoreItem[] = [
    bleedItem(item("htn", "H", "Uncontrolled hypertension (SBP >160)", 1, input.uncontrolledHtn ? 1 : 0), "modifiable", "Bring blood pressure under control."),
    bleedItem(item("renal", "A", "Abnormal renal function", 1, input.abnormalRenal ? 1 : 0, "Dialysis, transplant, or creatinine ≥2.26 mg/dL (200 µmol/L)."), "partly", "Recheck renal function and renally cleared doses."),
    bleedItem(item("liver", "A", "Abnormal liver function", 1, input.abnormalLiver ? 1 : 0, "Cirrhosis, or bilirubin >2× ULN with AST/ALT/ALP >3× ULN."), "partly", "Address the liver disease and alcohol."),
    bleedItem(item("stroke", "S", "Prior stroke", 1, input.stroke ? 1 : 0), "fixed"),
    bleedItem(item("bleed", "B", "Bleeding history or predisposition", 1, input.bleeding ? 1 : 0, "Prior major bleed, anemia, or low platelets."), "partly", "Look for and treat anemia or a bleeding source."),
    bleedItem(
      item(
        "inr",
        "L",
        "Labile INR (on a VKA)",
        1,
        labileCounts ? 1 : 0,
        input.labileInr && !input.onVka ? "Not counted: labile INR applies only to a vitamin K antagonist." : "Time in therapeutic range under 60%.",
      ),
      "modifiable",
      "Improve INR control, or move to a DOAC when eligible.",
    ),
    bleedItem(item("elderly", "E", "Elderly (over 65)", 1, elderly ? 1 : 0), "fixed"),
    bleedItem(item("drugs", "D", "Antiplatelet or NSAID", 1, input.antiplateletOrNsaid ? 1 : 0), "modifiable", "Ask whether each antiplatelet or NSAID still has a reason to be there."),
    bleedItem(item("alcohol", "D", "Alcohol ≥8 drinks a week", 1, input.alcohol ? 1 : 0), "modifiable", "Counsel on alcohol."),
  ];
  const score = sum(items);
  const highRisk = score >= 3;
  const modifiableMet = items.filter((i) => i.met && i.modifiability !== "fixed");
  const message = highRisk
    ? `HAS-BLED ${score}: high bleeding risk. Fix the modifiable items and follow up more closely. A high score is not, by itself, a reason to withhold anticoagulation.`
    : `HAS-BLED ${score}: not in the high band. Still address any modifiable item that is present.`;
  const notes: string[] = [];
  if (input.labileInr && !input.onVka) notes.push("Labile INR is checked but no vitamin K antagonist is set, so it scores 0.");
  if (modifiableMet.length > 0) notes.push(`Modifiable now: ${modifiableMet.map((i) => i.label.toLowerCase()).join("; ")}.`);
  return { score, max: 9, items, highRisk, modifiableMet, message, notes };
}

/* ── Tray reading ─────────────────────────────────────────────────────── */

/** Antiplatelet drugs proper. The catalog "antiplatelet" PD flag also marks herbals, NSAIDs and BTK inhibitors. */
const ANTIPLATELET_DRUG_IDS = ["aspirin", "clopidogrel", "prasugrel", "ticagrelor", "cangrelor", "cilostazol", "dipyridamole"].filter(
  (id) => id in DRUG_BY_ID,
);
const ANTIPLATELET_SET = new Set(ANTIPLATELET_DRUG_IDS);
export const P2Y12_IDS = new Set(["clopidogrel", "prasugrel", "ticagrelor", "cangrelor"]);
/** Ophthalmic NSAIDs: catalog flags them but systemic exposure is trivial. */
const OPHTHALMIC_NSAIDS = new Set(["bromfenac", "nepafenac"]);
export const VKA_IDS = new Set(["warfarin"]);

const isAnticoagulant = (id: string) => ALL_ANTICOAGULANT_IDS.has(id) || Boolean(DRUG_BY_ID[id]?.pd.includes("anticoagulant"));
const isNsaid = (id: string) => !ANTIPLATELET_SET.has(id) && !OPHTHALMIC_NSAIDS.has(id) && Boolean(DRUG_BY_ID[id]?.pd.includes("nsaid"));
const isSsriSnri = (id: string) => Boolean(DRUG_BY_ID[id]?.pd.includes("ssri-snri"));
const isOtherPlatelet = (id: string) =>
  !ANTIPLATELET_SET.has(id) && !isNsaid(id) && !OPHTHALMIC_NSAIDS.has(id) && Boolean(DRUG_BY_ID[id]?.pd.includes("antiplatelet"));

export const AUGUSTUS_NOTE =
  "AUGUSTUS (2019): in AF after ACS or PCI on a P2Y12 inhibitor, apixaban caused less bleeding than a VKA. Adding aspirin caused more bleeding without reducing ischemic events. Apixaban plus a P2Y12 inhibitor without aspirin bled least. ACC/AHA 2023 favors stopping aspirin after 1 to 4 weeks and continuing the anticoagulant with a P2Y12 inhibitor, usually clopidogrel.";

export interface TrayBleedModifiers {
  anticoagulantIds: string[];
  vkaIds: string[];
  antiplateletIds: string[];
  p2y12Ids: string[];
  nsaidIds: string[];
  ssriSnriIds: string[];
  /** Herbals, BTK inhibitors and others that touch platelets but are not HAS-BLED "D" drugs. */
  otherPlateletIds: string[];
  /** HAS-BLED items the tray fills in. */
  autoFill: { antiplateletOrNsaid: boolean; onVka: boolean };
  tripleTherapy: boolean;
  combinedTherapy: boolean;
  tripleTherapyNote: string | null;
  notes: string[];
}

const names = (ids: string[]) => ids.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ");

export function trayBleedModifiers(ids: string[]): TrayBleedModifiers {
  const uniq = [...new Set(ids)];
  const anticoagulantIds = uniq.filter(isAnticoagulant);
  const vkaIds = uniq.filter((id) => VKA_IDS.has(id));
  const antiplateletIds = uniq.filter((id) => ANTIPLATELET_SET.has(id));
  const p2y12Ids = antiplateletIds.filter((id) => P2Y12_IDS.has(id));
  const nsaidIds = uniq.filter(isNsaid);
  const ssriSnriIds = uniq.filter(isSsriSnri);
  const otherPlateletIds = uniq.filter(isOtherPlatelet);

  const hasAspirin = antiplateletIds.includes("aspirin");
  const combinedTherapy = anticoagulantIds.length > 0 && antiplateletIds.length > 0;
  const tripleTherapy = anticoagulantIds.length > 0 && hasAspirin && p2y12Ids.length > 0;

  const notes: string[] = [];
  if (antiplateletIds.length > 0 || nsaidIds.length > 0) {
    notes.push(`HAS-BLED "D" (drugs) is filled from the tray: ${names([...antiplateletIds, ...nsaidIds])}.`);
  }
  if (vkaIds.length > 0) notes.push(`${names(vkaIds)} is a vitamin K antagonist, so labile INR can count.`);
  if (anticoagulantIds.length > 0 && nsaidIds.length > 0) {
    notes.push(`${names(nsaidIds)} with an anticoagulant raises GI bleeding. HAS-BLED counts it as a modifiable item.`);
  }
  if (anticoagulantIds.length > 0 && ssriSnriIds.length > 0) {
    notes.push(
      `${names(ssriSnriIds)} lowers platelet serotonin and adds modest bleeding risk with an anticoagulant. It is not a HAS-BLED item, but it belongs in the bleed conversation.`,
    );
  }
  if (otherPlateletIds.length > 0) {
    notes.push(`${names(otherPlateletIds)} can affect platelets. Not a HAS-BLED item, but worth asking about.`);
  }

  let tripleTherapyNote: string | null = null;
  if (tripleTherapy) {
    tripleTherapyNote = `Triple therapy on the tray (anticoagulant + aspirin + P2Y12 inhibitor). ${AUGUSTUS_NOTE}`;
  } else if (combinedTherapy) {
    tripleTherapyNote = `Anticoagulant plus antiplatelet on the tray. Ask what the antiplatelet is for and how long it is meant to run. ${AUGUSTUS_NOTE}`;
  }

  return {
    anticoagulantIds,
    vkaIds,
    antiplateletIds,
    p2y12Ids,
    nsaidIds,
    ssriSnriIds,
    otherPlateletIds,
    autoFill: { antiplateletOrNsaid: antiplateletIds.length > 0 || nsaidIds.length > 0, onVka: vkaIds.length > 0 },
    tripleTherapy,
    combinedTherapy,
    tripleTherapyNote,
    notes,
  };
}

/* ── DOAC rails (borrowed from doac.ts) ───────────────────────────────── */

export const AF_DOAC_IDS = ["apixaban", "rivaroxaban", "edoxaban", "dabigatran"].filter((id) => DOAC_IDS.has(id) && id in DRUG_BY_ID);

export interface AfDoacRow {
  agentId: string;
  agentName: string;
  rail: DoacRenalRail;
  /** Apixaban only: the ABC criteria, which govern its AF dose. */
  abc?: ApixabanAbcEvaluation;
}

export interface AfDoacDosing {
  crcl: CrclResult | null;
  rows: AfDoacRow[];
  notes: string[];
}

/** Edoxaban high-CrCl text, taken from the DOAC desk so both desks say the same thing. */
export const EDOXABAN_HIGH_CRCL_NOTE = evaluateDoacRenal("edoxaban", 100, 80, "nvaf").explanation;

export function afDoacDosing(input: { ageYears: number; weightKg: number; scrMgDl: number; sex: Sex }): AfDoacDosing {
  const crcl = crclOf({ age: input.ageYears, weightKg: input.weightKg, scr: input.scrMgDl, sex: input.sex });
  if (!crcl) {
    return { crcl: null, rows: [], notes: ["Enter age 18–110, weight 30–250 kg, and creatinine above 0 to compute Cockcroft–Gault CrCl."] };
  }
  const rows: AfDoacRow[] = AF_DOAC_IDS.map((agentId) => {
    const rail = evaluateDoacRenal(agentId, crcl.crcl, input.weightKg, "nvaf");
    const row: AfDoacRow = { agentId, agentName: rail.agentName, rail };
    if (agentId === "apixaban") {
      row.abc = evaluateApixabanAbc({ age: input.ageYears, weightKg: input.weightKg, scr: input.scrMgDl, indication: "nvaf" });
    }
    return row;
  });
  const notes = [
    "CrCl is Cockcroft–Gault with total body weight, the number the DOAC trials and labels used.",
    "Apixaban is the one DOAC whose AF dose follows age, weight and creatinine (ABC) rather than CrCl.",
  ];
  const edox = rows.find((r) => r.agentId === "edoxaban");
  if (edox && edox.rail.status !== "black-box") {
    notes.push(`Edoxaban at high CrCl: ${EDOXABAN_HIGH_CRCL_NOTE}`);
  }
  return { crcl, rows, notes };
}

/* ── Desk detection and report ────────────────────────────────────────── */

export const AF_RATE_RHYTHM_IDS = [
  "amiodarone",
  "dronedarone",
  "diltiazem",
  "verapamil",
  "metoprolol",
  "digoxin",
  "flecainide",
  "sotalol",
  "dofetilide",
].filter((id) => id in DRUG_BY_ID);
const RATE_RHYTHM_SET = new Set(AF_RATE_RHYTHM_IDS);

export interface AfDeskDetection {
  hasAfRelevant: boolean;
  anticoagulantIds: string[];
  antiplateletIds: string[];
  matchedIds: string[];
}

export function afOnDesk(ids: string[]): AfDeskDetection {
  const uniq = [...new Set(ids)];
  const anticoagulantIds = uniq.filter(isAnticoagulant);
  const antiplateletIds = uniq.filter((id) => ANTIPLATELET_SET.has(id));
  const matchedIds = uniq.filter((id) => isAnticoagulant(id) || ANTIPLATELET_SET.has(id) || RATE_RHYTHM_SET.has(id));
  return { hasAfRelevant: matchedIds.length > 0, anticoagulantIds, antiplateletIds, matchedIds };
}

export interface AfReport {
  detection: AfDeskDetection;
  notes: string[];
  citations: string[];
  disclaimer: string;
}

export function afReportOnDesk(ids: string[], host?: HostContext): AfReport {
  const detection = afOnDesk(ids);
  const tray = trayBleedModifiers(ids);
  const notes: string[] = [];
  const rateRhythm = detection.matchedIds.filter((id) => RATE_RHYTHM_SET.has(id));

  if (rateRhythm.length > 0 && detection.anticoagulantIds.length === 0) {
    notes.push(`${names(rateRhythm)} on the tray without an anticoagulant. Rate or rhythm control does not replace stroke prevention. Score CHA2DS2-VASc.`);
  }
  const pgp = rateRhythm.filter((id) => id === "dronedarone" || id === "verapamil" || id === "amiodarone");
  const doacs = detection.anticoagulantIds.filter((id) => DOAC_IDS.has(id));
  if (pgp.length > 0 && doacs.length > 0) {
    notes.push(`${names(pgp)} inhibits P-gp and can raise ${names(doacs)} exposure. See the DOAC desk for the label rule.`);
  }
  if (tray.tripleTherapyNote) notes.push(tray.tripleTherapyNote);
  notes.push(...tray.notes);
  if (host?.age === "geriatric") notes.push("Older adult on the host: age adds to both scores. It raises stroke risk at least as much as bleed risk.");
  if (host?.kidney === "ckd" || (typeof host?.egfr === "number" && host.egfr < 30)) {
    notes.push("Kidney flag set. HAS-BLED's renal item needs dialysis, transplant, or creatinine ≥2.26 mg/dL. Check the DOAC rails below.");
  }
  if (host?.alcohol === "chronic") notes.push("Chronic alcohol on the host fills HAS-BLED's alcohol item. It is modifiable.");

  return { detection, notes, citations: AF_CITATIONS, disclaimer: AF_DISCLAIMER };
}
