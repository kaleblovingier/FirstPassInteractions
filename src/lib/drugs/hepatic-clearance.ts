/**
 * Hepatic clearance & cirrhosis teaching engine.
 *
 * The well-stirred liver model, written out so a learner can see why liver
 * disease moves oral and IV exposure differently, and total and unbound
 * exposure differently, for high- versus low-extraction drugs.
 *
 *   CLh = Q · fu · CLint / (Q + fu · CLint)
 *   E   = fu · CLint / (Q + fu · CLint)
 *   Fh  = 1 − E
 *
 * Cirrhosis is modeled as four levers: less intrinsic clearance, less hepatic
 * blood flow, portosystemic shunting (blood that skips the liver entirely), and
 * lower albumin (which raises fu for albumin-bound drugs).
 *
 * Teaching model only. Not a dose. The label's hepatic impairment section governs.
 *
 * Sources:
 *   Wilkinson GR, Shand DG. Clin Pharmacol Ther 1975;18(4):377–390.
 *   Verbeeck RK. Eur J Clin Pharmacol 2008;64(12):1147–1161.
 *   Benet LZ, Hoener BA. Clin Pharmacol Ther 2002;71(3):115–121.
 *   Johnson TN, et al. Clin Pharmacokinet 2010;49(3):189–206.
 *   FDA Guidance for Industry: Pharmacokinetics in Patients with Impaired Hepatic Function (2003).
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";

export const HEPATIC_DISCLAIMER =
  "Teaching model, not a dose. The well-stirred model and the cirrhosis presets are simplifications; the label's hepatic impairment section and the prescriber's assessment govern.";

export const HEPATIC_CITATIONS: string[] = [
  "Wilkinson GR, Shand DG. A physiological approach to hepatic drug clearance. Clin Pharmacol Ther 1975;18(4):377–390.",
  "Verbeeck RK. Pharmacokinetics and dosage adjustment in patients with hepatic dysfunction. Eur J Clin Pharmacol 2008;64(12):1147–1161.",
  "Benet LZ, Hoener BA. Changes in plasma protein binding have little clinical relevance. Clin Pharmacol Ther 2002;71(3):115–121.",
  "Johnson TN, Boussery K, Rowland-Yeo K, Tucker GT, Rostami-Hodjegan A. A semi-mechanistic model to predict the effects of liver cirrhosis on drug clearance. Clin Pharmacokinet 2010;49(3):189–206.",
  "FDA Guidance for Industry: Pharmacokinetics in Patients with Impaired Hepatic Function — Study Design, Data Analysis, and Impact on Dosing and Labeling (2003).",
];

/** Hepatic blood flow, L/h (about 1.5 L/min). */
export const HEPATIC_BLOOD_FLOW_L_H = 90;
/** Reference serum albumin, g/dL. */
export const REFERENCE_ALBUMIN_G_DL = 4.2;

export interface HepaticDrugProfile {
  id: string;
  name: string;
  /** Hepatic extraction ratio in health (0–1). */
  extraction: number;
  /** Fraction unbound in plasma in health. */
  fu: number;
  /** Fraction escaping gut-wall metabolism. */
  fg: number;
  /** Fraction absorbed. */
  fa: number;
  note: string;
}

/** Approximate teaching parameters from textbook tables. Not measured values for any one patient. */
export const HEPATIC_PROFILES: HepaticDrugProfile[] = [
  { id: "propranolol", name: "Propranolol", extraction: 0.75, fu: 0.13, fg: 1, fa: 1, note: "Classic high-extraction drug. Oral bioavailability is low in health because the liver takes most of each pass." },
  { id: "lidocaine", name: "Lidocaine", extraction: 0.7, fu: 0.3, fg: 1, fa: 1, note: "High extraction. IV clearance tracks liver blood flow, so heart failure and cirrhosis both slow it." },
  { id: "verapamil", name: "Verapamil", extraction: 0.8, fu: 0.1, fg: 1, fa: 1, note: "High extraction. Oral exposure climbs steeply when shunting lets drug skip the liver." },
  { id: "morphine", name: "Morphine", extraction: 0.7, fu: 0.65, fg: 1, fa: 1, note: "High extraction by glucuronidation. Glucuronidation is relatively spared until advanced disease, so early change can be smaller than this model shows." },
  { id: "midazolam", name: "Midazolam", extraction: 0.44, fu: 0.03, fg: 0.57, fa: 1, note: "Intermediate extraction. Gut-wall CYP3A takes a large first cut before the liver sees it." },
  { id: "warfarin", name: "Warfarin", extraction: 0.003, fu: 0.01, fg: 1, fa: 1, note: "Low extraction, highly albumin-bound. Cirrhosis also lowers clotting factors, so INR moves for two reasons." },
  { id: "phenytoin", name: "Phenytoin", extraction: 0.03, fu: 0.1, fg: 1, fa: 1, note: "Low extraction and nonlinear. With low albumin the total level misleads; the free level tells the story." },
  { id: "diazepam", name: "Diazepam", extraction: 0.02, fu: 0.02, fg: 1, fa: 1, note: "Low extraction, highly bound. Active metabolites lengthen the effect further in cirrhosis." },
  { id: "theophylline", name: "Theophylline", extraction: 0.09, fu: 0.6, fg: 1, fa: 1, note: "Low extraction, modest binding. Clearance falls with CLint; the narrow window makes that matter." },
];

export const HEPATIC_PROFILE_BY_ID: Record<string, HepaticDrugProfile> = Object.fromEntries(
  HEPATIC_PROFILES.map((p) => [p.id, p]),
);

export type ExtractionClass = "high" | "intermediate" | "low";

export function extractionClass(E: number): ExtractionClass {
  if (E >= 0.7) return "high";
  if (E < 0.3) return "low";
  return "intermediate";
}

/** Unbound intrinsic clearance such that fu · CLint = E · Q / (1 − E). */
export function intrinsicClearanceFrom(E: number, fu: number, Q: number = HEPATIC_BLOOD_FLOW_L_H): number {
  const e = Math.min(Math.max(E, 0), 0.999999);
  const f = Math.max(fu, 1e-9);
  return (e * Q) / ((1 - e) * f);
}

/**
 * Fraction unbound after an albumin change, for an albumin-bound drug with
 * unsaturated binding: bound/unbound ratio scales with albumin.
 */
export function scaleFu(fu: number, albuminNew: number, albuminRef: number = REFERENCE_ALBUMIN_G_DL): number {
  if (!(fu > 0)) return 0;
  if (fu >= 1) return 1;
  const alb = Math.max(albuminNew, 0);
  const ratio = albuminRef > 0 ? alb / albuminRef : 1;
  return 1 / (1 + ((1 - fu) / fu) * ratio);
}

export interface CirrhosisState {
  /** Multiplier on unbound intrinsic clearance (1 = healthy). */
  clintMultiplier: number;
  /** Multiplier on total hepatic blood flow (1 = healthy). */
  flowMultiplier: number;
  /** Fraction of portal and hepatic blood that bypasses hepatocytes (0–1). */
  shuntFraction: number;
  /** Serum albumin, g/dL. */
  albuminGdl: number;
}

export type CirrhosisPresetKey = "normal" | "A" | "B" | "C";

/**
 * ILLUSTRATIVE teaching values loosely shaped on Johnson 2010, not measured
 * constants. Real patients within a Child-Pugh class vary widely.
 */
export const CIRRHOSIS_PRESETS: Record<CirrhosisPresetKey, CirrhosisState> = {
  normal: { clintMultiplier: 1, flowMultiplier: 1, shuntFraction: 0, albuminGdl: 4.2 },
  A: { clintMultiplier: 0.7, flowMultiplier: 1, shuntFraction: 0.1, albuminGdl: 3.8 },
  B: { clintMultiplier: 0.45, flowMultiplier: 0.9, shuntFraction: 0.3, albuminGdl: 3.0 },
  C: { clintMultiplier: 0.25, flowMultiplier: 0.8, shuntFraction: 0.5, albuminGdl: 2.5 },
};

export interface WellStirredResult {
  fu: number;
  clint: number;
  perfusedFlow: number;
  extractionPerfused: number;
  clh: number;
  fh: number;
  fOral: number;
  aucIvRel: number;
  aucOralRel: number;
  aucIvUnboundRel: number;
  aucOralUnboundRel: number;
}

const clamp01 = (n: number) => Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), 1);

export function wellStirred(profile: HepaticDrugProfile, state: CirrhosisState): WellStirredResult {
  const s = clamp01(state.shuntFraction);
  const flowMult = Math.max(state.flowMultiplier, 0);
  const clintMult = Math.max(state.clintMultiplier, 0);
  const fu = scaleFu(profile.fu, state.albuminGdl);
  const clint = intrinsicClearanceFrom(profile.extraction, profile.fu) * clintMult;
  const perfusedFlow = (1 - s) * flowMult * HEPATIC_BLOOD_FLOW_L_H;
  const fuClint = fu * clint;
  const denom = perfusedFlow + fuClint;
  const extractionPerfused = denom > 0 ? fuClint / denom : 0;
  const clh = perfusedFlow * extractionPerfused;
  const fh = s + (1 - s) * (1 - extractionPerfused);
  const fOral = profile.fa * profile.fg * fh;
  const aucIvRel = clh > 0 ? 1 / clh : Number.POSITIVE_INFINITY;
  const aucOralRel = clh > 0 ? fOral / clh : Number.POSITIVE_INFINITY;
  return {
    fu,
    clint,
    perfusedFlow,
    extractionPerfused,
    clh,
    fh,
    fOral,
    aucIvRel,
    aucOralRel,
    aucIvUnboundRel: fu * aucIvRel,
    aucOralUnboundRel: fu * aucOralRel,
  };
}

export interface HepaticRatios {
  aucIv: number;
  aucOral: number;
  aucIvUnbound: number;
  aucOralUnbound: number;
  fOral: number;
}

export interface HepaticComparison {
  profile: HepaticDrugProfile;
  state: CirrhosisState;
  normal: WellStirredResult;
  impaired: WellStirredResult;
  ratios: HepaticRatios;
  extractionClass: ExtractionClass;
  teaching: string[];
}

const ratio = (a: number, b: number) => (b > 0 && Number.isFinite(a) ? a / b : Number.POSITIVE_INFINITY);

function fold(n: number): string {
  if (!Number.isFinite(n)) return "without limit";
  if (n >= 10) return `${Math.round(n)}-fold`;
  return `${(Math.round(n * 10) / 10).toFixed(1)}-fold`;
}

function change(n: number): string {
  if (!Number.isFinite(n)) return "rises without limit";
  if (n >= 1.15) return `rises ${fold(n)}`;
  if (n <= 0.87) return `falls to ${Math.round(n * 100)}% of normal`;
  return "barely moves";
}

export function compareHepatic(profile: HepaticDrugProfile, state: CirrhosisState): HepaticComparison {
  const normal = wellStirred(profile, CIRRHOSIS_PRESETS.normal);
  const impaired = wellStirred(profile, state);
  const ratios: HepaticRatios = {
    aucIv: ratio(impaired.aucIvRel, normal.aucIvRel),
    aucOral: ratio(impaired.aucOralRel, normal.aucOralRel),
    aucIvUnbound: ratio(impaired.aucIvUnboundRel, normal.aucIvUnboundRel),
    aucOralUnbound: ratio(impaired.aucOralUnboundRel, normal.aucOralUnboundRel),
    fOral: ratio(impaired.fOral, normal.fOral),
  };
  const cls = extractionClass(profile.extraction);
  const teaching: string[] = [];
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  if (cls === "high") {
    teaching.push(
      `${profile.name} is a high-extraction drug (E ${profile.extraction}). The liver clears nearly all the drug that reaches it, so IV clearance follows blood flow. IV exposure ${change(ratios.aucIv)}.`,
    );
    teaching.push(
      `Oral exposure ${change(ratios.aucOral)}. The liver stops taking its first-pass cut, and shunted blood skips it entirely. Oral F goes from ${pct(normal.fOral)} to ${pct(impaired.fOral)}.`,
    );
    teaching.push("Oral and IV doses do not shift together here. The oral route carries most of the change.");
  } else if (cls === "low") {
    teaching.push(
      `${profile.name} is a low-extraction drug (E ${profile.extraction}). Clearance is about fu · CLint, so blood flow and shunting barely matter. Oral F stays near ${pct(impaired.fOral)}.`,
    );
    teaching.push(
      `Total exposure ${change(ratios.aucOral)}, while unbound exposure ${change(ratios.aucOralUnbound)}. Lower albumin raises fu from ${normal.fu.toPrecision(2)} to ${impaired.fu.toPrecision(2)}, so the total level can look stable or fall while free drug rises.`,
    );
    teaching.push(
      "Benet and Hoener: for a low-extraction drug given orally, unbound AUC depends only on CLint. Binding changes move the total, not the free exposure. Monitor free levels where they exist (phenytoin).",
    );
  } else {
    teaching.push(
      `${profile.name} sits in the intermediate band (E ${profile.extraction}). Flow, binding and CLint all pull on clearance, so both routes move.`,
    );
    teaching.push(
      `IV exposure ${change(ratios.aucIv)}; oral exposure ${change(ratios.aucOral)}. Oral F goes from ${pct(normal.fOral)} to ${pct(impaired.fOral)}.`,
    );
    teaching.push(`Unbound oral exposure ${change(ratios.aucOralUnbound)}.`);
  }

  if (profile.fg < 1) {
    teaching.push(
      `Gut-wall CYP3A (Fg ${profile.fg}) is held constant here. Cirrhosis may change it too; this model does not.`,
    );
  }
  if (state.shuntFraction > 0 && cls !== "low") {
    teaching.push(
      `Shunt fraction ${pct(state.shuntFraction)}: that share of each oral dose reaches the systemic circulation with no hepatic pass at all.`,
    );
  }

  return { profile, state, normal, impaired, ratios, extractionClass: cls, teaching };
}

export interface HepaticDeskDetection {
  hasHepaticPreset: boolean;
  matchedIds: string[];
}

export function hepaticOnDesk(ids: string[]): HepaticDeskDetection {
  const seen = new Set<string>();
  const matchedIds: string[] = [];
  for (const id of ids) {
    if (HEPATIC_PROFILE_BY_ID[id] && !seen.has(id)) {
      seen.add(id);
      matchedIds.push(id);
    }
  }
  return { hasHepaticPreset: matchedIds.length > 0, matchedIds };
}

export interface HepaticReport {
  detection: HepaticDeskDetection;
  comparisons: HepaticComparison[];
  citations: string[];
  disclaimer: string;
}

/** Desk report: each matched drug compared under the Child-Pugh B illustrative preset. */
export function hepaticReportOnDesk(ids: string[], _host?: HostContext): HepaticReport {
  const detection = hepaticOnDesk(ids);
  const comparisons = detection.matchedIds.map((id) => compareHepatic(HEPATIC_PROFILE_BY_ID[id], CIRRHOSIS_PRESETS.B));
  return { detection, comparisons, citations: HEPATIC_CITATIONS, disclaimer: HEPATIC_DISCLAIMER };
}

/** Display name from the catalog when present. */
export function hepaticDrugName(id: string): string {
  return DRUG_BY_ID[id]?.name ?? HEPATIC_PROFILE_BY_ID[id]?.name ?? id;
}
