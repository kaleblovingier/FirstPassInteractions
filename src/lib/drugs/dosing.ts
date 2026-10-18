/**
 * Labeled dose rails — teaching, not a prescription.
 * Usual bands and caps paraphrase FDA-approved labeling.
 * The desk checks a milligram you type. It does not pick one.
 */

import { DRUG_BY_ID } from "./catalog";
import { DEFAULT_HOST, type Finding, type HostContext, type Severity } from "./types";

export type DoseBand =
  | "none"
  | "below"
  | "usual"
  | "above-usual"
  | "over-cap"
  | "over-max"
  | "host"
  | "weight"
  | "titrated"
  | "street";

export type DoseTone = "ok" | "warn" | "danger" | "info";

export interface LabeledDose {
  id: string;
  unit: string;
  usualAdult: string;
  usualLow?: number;
  usualHigh?: number;
  labeledMax?: number;
  maxNote?: string;
  renal?: "ok" | "cut" | "avoid";
  renalNote?: string;
  hepatic?: string;
  geriatric?: string;
  schedule?: string;
  nti?: boolean;
  weightBased?: boolean;
  titrated?: boolean;
  highAlert?: boolean;
  neverPrescribe?: boolean;
  source: string;
}

export interface DoseCap {
  victim: string;
  perpetrators: string[];
  mg: number;
  why: string;
  source: string;
}

export interface DoseCheck {
  id: string;
  name: string;
  amount: number | null;
  label: LabeledDose;
  cap: DoseCap | null;
  band: DoseBand;
  tone: DoseTone;
  headline: string;
  detail: string;
}

function L(partial: LabeledDose): LabeledDose {
  return partial;
}

const STRONG_3A4 = [
  "itraconazole",
  "ketoconazole",
  "posaconazole",
  "voriconazole",
  "clarithromycin",
  "erythromycin",
  "ritonavir",
  "cobicistat",
  "gemfibrozil",
  "cyclosporine",
];

export const DOSING: Record<string, LabeledDose> = {
  simvastatin: L({
    id: "simvastatin",
    unit: "mg/day",
    usualAdult: "5–40 mg once daily",
    usualLow: 5,
    usualHigh: 40,
    labeledMax: 40,
    maxNote: "80 mg is a restricted relic — myopathy. New starts are not 80.",
    source: "Zocor PI",
  }),
  atorvastatin: L({
    id: "atorvastatin",
    unit: "mg/day",
    usualAdult: "10–80 mg once daily",
    usualLow: 10,
    usualHigh: 80,
    labeledMax: 80,
    source: "Lipitor PI",
  }),
  rosuvastatin: L({
    id: "rosuvastatin",
    unit: "mg/day",
    usualAdult: "5–40 mg once daily",
    usualLow: 5,
    usualHigh: 40,
    labeledMax: 40,
    source: "Crestor PI",
  }),
  lovastatin: L({
    id: "lovastatin",
    unit: "mg/day",
    usualAdult: "10–80 mg with the evening meal",
    usualLow: 10,
    usualHigh: 80,
    labeledMax: 80,
    source: "Mevacor PI",
  }),
  amlodipine: L({
    id: "amlodipine",
    unit: "mg/day",
    usualAdult: "5–10 mg once daily",
    usualLow: 2.5,
    usualHigh: 10,
    labeledMax: 10,
    geriatric: "Start 2.5 mg in frail older adults.",
    source: "Norvasc PI",
  }),
  lisinopril: L({
    id: "lisinopril",
    unit: "mg/day",
    usualAdult: "10–40 mg once daily",
    usualLow: 5,
    usualHigh: 40,
    labeledMax: 80,
    renal: "cut",
    renalNote: "Start lower as GFR falls. HyperK, Cr.",
    source: "Zestril / Prinivil PI",
  }),
  metoprolol: L({
    id: "metoprolol",
    unit: "mg/day",
    usualAdult: "25–200 mg/day (salt and release matter)",
    usualLow: 25,
    usualHigh: 200,
    labeledMax: 400,
    source: "Lopressor / Toprol-XL PI",
  }),
  "sacubitril-valsartan": L({
    id: "sacubitril-valsartan",
    unit: "mg BID (sacubitril/valsartan tablet)",
    usualAdult: "49/51 to 97/103 BID after the ACEI washout",
    usualLow: 24,
    usualHigh: 97,
    labeledMax: 97,
    renal: "cut",
    source: "Entresto PI",
  }),
  amiodarone: L({
    id: "amiodarone",
    unit: "mg/day",
    usualAdult: "Load, then 200–400 mg/day",
    usualLow: 100,
    usualHigh: 400,
    labeledMax: 400,
    maxNote: "Maintenance. Loads are a protocol, not this desk.",
    hepatic: "Hepatotoxic. LFTs.",
    source: "Pacerone PI",
  }),
  ranolazine: L({
    id: "ranolazine",
    unit: "mg BID",
    usualAdult: "500–1000 mg BID",
    usualLow: 500,
    usualHigh: 1000,
    labeledMax: 1000,
    source: "Ranexa PI",
  }),
  diltiazem: L({
    id: "diltiazem",
    unit: "mg/day",
    usualAdult: "120–360 mg/day (release matters)",
    usualLow: 120,
    usualHigh: 360,
    labeledMax: 360,
    source: "Cardizem PI",
  }),
  verapamil: L({
    id: "verapamil",
    unit: "mg/day",
    usualAdult: "180–480 mg/day",
    usualLow: 120,
    usualHigh: 480,
    labeledMax: 480,
    source: "Calan PI",
  }),
  warfarin: L({
    id: "warfarin",
    unit: "mg/day",
    usualAdult: "INR-titrated. Many adults land 2–10 mg/day — the INR is the dose.",
    usualLow: 1,
    usualHigh: 10,
    nti: true,
    titrated: true,
    highAlert: true,
    source: "Coumadin PI",
  }),
  apixaban: L({
    id: "apixaban",
    unit: "mg BID",
    usualAdult: "5 mg BID for AF; 2.5 BID if two of: age ≥80, weight ≤60 kg, Cr ≥1.5",
    usualLow: 2.5,
    usualHigh: 10,
    labeledMax: 10,
    renal: "cut",
    source: "Eliquis PI",
  }),
  rivaroxaban: L({
    id: "rivaroxaban",
    unit: "mg/day",
    usualAdult: "20 mg daily with food for AF",
    usualLow: 10,
    usualHigh: 20,
    labeledMax: 20,
    renal: "avoid",
    renalNote: "Avoid in severe CKD on the AF map. Take 15–20 mg with food.",
    source: "Xarelto PI",
  }),
  enoxaparin: L({
    id: "enoxaparin",
    unit: "mg/kg",
    usualAdult: "Weight-based. 1 mg/kg q12h is the usual treatment map — not this desk's milligram.",
    weightBased: true,
    renal: "cut",
    renalNote: "Once-daily treatment below CrCl 30. Anti-Xa at extremes of weight.",
    highAlert: true,
    source: "Lovenox PI",
  }),
  digoxin: L({
    id: "digoxin",
    unit: "mg/day",
    usualAdult: "0.125–0.25 mg/day",
    usualLow: 0.0625,
    usualHigh: 0.25,
    labeledMax: 0.5,
    nti: true,
    renal: "cut",
    geriatric: "0.125 mg is the usual older-adult start.",
    source: "Lanoxin PI",
  }),
  lithium: L({
    id: "lithium",
    unit: "mg/day",
    usualAdult: "600–1800 mg/day in divided doses. Trough 0.6–1.2 mmol/L is the dose.",
    usualLow: 300,
    usualHigh: 1800,
    nti: true,
    titrated: true,
    renal: "avoid",
    renalNote: "Clearance is renal. CKD is a specialist call, not a free milligram.",
    source: "Lithobid PI",
  }),
  valproate: L({
    id: "valproate",
    unit: "mg/day",
    usualAdult: "750–2000 mg/day. Level is the dose.",
    usualLow: 250,
    usualHigh: 2000,
    labeledMax: 4200,
    nti: true,
    titrated: true,
    source: "Depakote PI",
  }),
  lamotrigine: L({
    id: "lamotrigine",
    unit: "mg/day",
    usualAdult: "100–400 mg/day monotherapy after the starter kit",
    usualLow: 25,
    usualHigh: 400,
    labeledMax: 400,
    maxNote: "Starter kits exist because rash. Do not jump to 200.",
    source: "Lamictal PI",
  }),
  phenytoin: L({
    id: "phenytoin",
    unit: "mg/day",
    usualAdult: "300–400 mg/day. Saturable. Level is the dose.",
    usualLow: 200,
    usualHigh: 400,
    nti: true,
    titrated: true,
    source: "Dilantin PI",
  }),
  gabapentin: L({
    id: "gabapentin",
    unit: "mg/day",
    usualAdult: "900–3600 mg/day in divided doses",
    usualLow: 300,
    usualHigh: 3600,
    labeledMax: 3600,
    renal: "cut",
    renalNote: "Renally cleared. CKD is a dose-cut, not a 3A4 row.",
    source: "Neurontin PI",
  }),
  pregabalin: L({
    id: "pregabalin",
    unit: "mg/day",
    usualAdult: "150–600 mg/day",
    usualLow: 50,
    usualHigh: 600,
    labeledMax: 600,
    renal: "cut",
    source: "Lyrica PI",
  }),
  sertraline: L({
    id: "sertraline",
    unit: "mg/day",
    usualAdult: "50–200 mg once daily",
    usualLow: 25,
    usualHigh: 200,
    labeledMax: 200,
    source: "Zoloft PI",
  }),
  fluoxetine: L({
    id: "fluoxetine",
    unit: "mg/day",
    usualAdult: "20–80 mg/day",
    usualLow: 10,
    usualHigh: 80,
    labeledMax: 80,
    source: "Prozac PI",
  }),
  bupropion: L({
    id: "bupropion",
    unit: "mg/day",
    usualAdult: "150–450 mg/day XL",
    usualLow: 150,
    usualHigh: 450,
    labeledMax: 450,
    maxNote: "Seizure risk climbs above the labeled max. Salt and release matter.",
    source: "Wellbutrin PI",
  }),
  quetiapine: L({
    id: "quetiapine",
    unit: "mg/day",
    usualAdult: "150–800 mg/day",
    usualLow: 50,
    usualHigh: 800,
    labeledMax: 800,
    geriatric: "Beers — start low.",
    source: "Seroquel PI",
  }),
  clozapine: L({
    id: "clozapine",
    unit: "mg/day",
    usualAdult: "Start 12.5. Many land 300–450. Max 900.",
    usualLow: 12.5,
    usualHigh: 450,
    labeledMax: 900,
    nti: true,
    titrated: true,
    highAlert: true,
    source: "Clozaril PI / Clozapine REMS",
  }),
  metformin: L({
    id: "metformin",
    unit: "mg/day",
    usualAdult: "500–2000 mg/day with food",
    usualLow: 500,
    usualHigh: 2000,
    labeledMax: 2550,
    renal: "avoid",
    renalNote: "Lactic acidosis as GFR falls. Labels stop it in severe CKD.",
    source: "Glucophage PI",
  }),
  empagliflozin: L({
    id: "empagliflozin",
    unit: "mg/day",
    usualAdult: "10–25 mg once daily",
    usualLow: 10,
    usualHigh: 25,
    labeledMax: 25,
    renal: "cut",
    source: "Jardiance PI",
  }),
  semaglutide: L({
    id: "semaglutide",
    unit: "mg/week (Ozempic map)",
    usualAdult: "0.25 → 0.5 → 1, some to 2 mg weekly",
    usualLow: 0.25,
    usualHigh: 2,
    labeledMax: 2,
    maxNote: "Wegovy and Rybelsus are different maps. This row is Ozempic.",
    source: "Ozempic PI",
  }),
  "insulin-glargine": L({
    id: "insulin-glargine",
    unit: "units/day",
    usualAdult: "Basal insulin is individual. High-alert. This desk does not pick a unit.",
    highAlert: true,
    source: "Lantus PI",
  }),
  "insulin-aspart": L({
    id: "insulin-aspart",
    unit: "units",
    usualAdult: "Prandial insulin is individual. High-alert. This desk does not pick a unit.",
    highAlert: true,
    source: "NovoLog PI",
  }),
  methotrexate: L({
    id: "methotrexate",
    unit: "mg once weekly (RA / psoriasis)",
    usualAdult: "7.5–25 mg once weekly with folate",
    usualLow: 7.5,
    usualHigh: 25,
    labeledMax: 25,
    maxNote: "Oncology is a different map. Daily RA methotrexate is the ISMP trap.",
    schedule: "once weekly — not daily",
    renal: "cut",
    highAlert: true,
    source: "Trexall PI / ISMP weekly MTX",
  }),
  colchicine: L({
    id: "colchicine",
    unit: "mg/day",
    usualAdult: "Prophylaxis 0.6 mg once or twice daily. Flare is a labeled load, not this desk.",
    usualLow: 0.3,
    usualHigh: 1.2,
    labeledMax: 1.8,
    renal: "cut",
    source: "Colcrys PI",
  }),
  allopurinol: L({
    id: "allopurinol",
    unit: "mg/day",
    usualAdult: "100–300 mg/day. Titrate to urate.",
    usualLow: 50,
    usualHigh: 300,
    labeledMax: 800,
    renal: "cut",
    source: "Zyloprim PI",
  }),
  omeprazole: L({
    id: "omeprazole",
    unit: "mg/day",
    usualAdult: "20–40 mg/day",
    usualLow: 10,
    usualHigh: 40,
    labeledMax: 40,
    maxNote: "Zollinger–Ellison is a different ceiling.",
    source: "Prilosec PI",
  }),
  sildenafil: L({
    id: "sildenafil",
    unit: "mg (ED tablet)",
    usualAdult: "50 mg PRN; 25–100 mg window",
    usualLow: 25,
    usualHigh: 100,
    labeledMax: 100,
    source: "Viagra PI",
  }),
  levothyroxine: L({
    id: "levothyroxine",
    unit: "mcg/day",
    usualAdult: "25–200 mcg/day empty stomach. TSH is the dose.",
    usualLow: 25,
    usualHigh: 200,
    labeledMax: 300,
    nti: true,
    titrated: true,
    source: "Synthroid PI",
  }),
  tacrolimus: L({
    id: "tacrolimus",
    unit: "mg/day",
    usualAdult: "Trough-titrated. Sensitive 3A4 NTI. This desk does not pick a milligram.",
    nti: true,
    titrated: true,
    source: "Prograf PI",
  }),
  vancomycin: L({
    id: "vancomycin",
    unit: "mg (IV)",
    usualAdult: "Weight and AUC. This desk does not pick a milligram or a trough target.",
    weightBased: true,
    renal: "cut",
    highAlert: true,
    source: "Vancomycin PI / AUC guidance",
  }),
  "piperacillin-tazobactam": L({
    id: "piperacillin-tazobactam",
    unit: "g/day IV",
    usualAdult: "3.375 g q6h or 4.5 g q8h are common maps — indication and CrCl govern.",
    usualLow: 13.5,
    usualHigh: 18,
    renal: "cut",
    source: "Zosyn PI",
  }),
  meropenem: L({
    id: "meropenem",
    unit: "g/day IV",
    usualAdult: "0.5–2 g q8h. MIC and CrCl govern. Not a free milligram on a valproate desk.",
    usualLow: 1.5,
    usualHigh: 6,
    renal: "cut",
    source: "Merrem PI",
  }),
  linezolid: L({
    id: "linezolid",
    unit: "mg q12h",
    usualAdult: "600 mg q12h — a labeled fixed map, not a titration.",
    usualLow: 600,
    usualHigh: 600,
    labeledMax: 600,
    source: "Zyvox PI",
  }),
  methadone: L({
    id: "methadone",
    unit: "mg/day oral",
    usualAdult: "Analgesia and OTP are different maps. This desk does not pick a milligram.",
    highAlert: true,
    nti: true,
    source: "Dolophine PI / OTP rules",
  }),
  buprenorphine: L({
    id: "buprenorphine",
    unit: "mg/day SL",
    usualAdult: "Many land 8–24 mg/day SL. Occupancy, not morphine. Induction is not this milligram.",
    usualLow: 2,
    usualHigh: 24,
    labeledMax: 32,
    highAlert: true,
    source: "Suboxone / Subutex PI",
  }),
  naltrexone: L({
    id: "naltrexone",
    unit: "mg/day oral (XR is 380 mg IM q4 weeks)",
    usualAdult: "50 mg oral daily after a clean washout",
    usualLow: 25,
    usualHigh: 50,
    labeledMax: 50,
    source: "ReVia / Vivitrol PI",
  }),
  oxycodone: L({
    id: "oxycodone",
    unit: "mg/day oral",
    usualAdult: "IR 5–15 mg is a tablet, not a daily ceiling. MME is the other tab.",
    usualLow: 10,
    usualHigh: 60,
    highAlert: true,
    source: "OxyContin / Roxicodone PI",
  }),
  morphine: L({
    id: "morphine",
    unit: "mg/day oral",
    usualAdult: "IR and ER are different maps. MME is the other tab.",
    usualLow: 15,
    usualHigh: 90,
    highAlert: true,
    source: "MS Contin PI",
  }),
  codeine: L({
    id: "codeine",
    unit: "mg/day",
    usualAdult: "15–60 mg q4h as needed. 2D6 activation. A PM gets almost none.",
    usualLow: 15,
    usualHigh: 360,
    labeledMax: 360,
    source: "Codeine PI",
  }),
  tramadol: L({
    id: "tramadol",
    unit: "mg/day",
    usualAdult: "50–400 mg/day",
    usualLow: 50,
    usualHigh: 400,
    labeledMax: 400,
    geriatric: "Max 300 mg/day on many older-adult maps.",
    source: "Ultram PI",
  }),
  xylazine: L({
    id: "xylazine",
    unit: "unknown",
    usualAdult: "Not a labeled human dose.",
    neverPrescribe: true,
    source: "Not a human PI",
  }),
  "dirty-30": L({
    id: "dirty-30",
    unit: "unknown",
    usualAdult: "A stamp is not 30 mg oxycodone.",
    neverPrescribe: true,
    source: "Not a labeled product",
  }),
  citalopram: L({
    id: "citalopram",
    unit: "mg/day",
    usualAdult: "20–40 mg once daily",
    usualLow: 20,
    usualHigh: 40,
    labeledMax: 40,
    geriatric: "Max 20 mg/day in patients > 60 years of age due to QT prolongation.",
    hepatic: "Max 20 mg/day in hepatic impairment.",
    maxNote: "Doses > 40 mg/day prolong QTc without additional antidepressant efficacy (FDA boxed warning).",
    source: "Celexa PI / FDA 2011 Drug Safety Communication",
  }),
};

const CAPS: DoseCap[] = [
  {
    victim: "simvastatin",
    perpetrators: STRONG_3A4,
    mg: 0,
    why: "Strong 3A4 / gemfibrozil / cyclosporine — labeled contraindicated with simvastatin.",
    source: "Zocor PI contraindications",
  },
  {
    victim: "simvastatin",
    perpetrators: ["amiodarone", "amlodipine", "ranolazine"],
    mg: 20,
    why: "Do not exceed simvastatin 20 mg daily with amiodarone, amlodipine, or ranolazine.",
    source: "Zocor PI dose cap",
  },
  {
    victim: "simvastatin",
    perpetrators: ["diltiazem", "verapamil", "dronedarone"],
    mg: 10,
    why: "Do not exceed simvastatin 10 mg daily with diltiazem, verapamil, or dronedarone.",
    source: "Zocor PI dose cap",
  },
  {
    victim: "lovastatin",
    perpetrators: STRONG_3A4,
    mg: 0,
    why: "Strong 3A4 / gemfibrozil / cyclosporine — labeled contraindicated with lovastatin.",
    source: "Mevacor PI contraindications",
  },
  {
    victim: "lovastatin",
    perpetrators: ["amiodarone", "diltiazem", "verapamil"],
    mg: 20,
    why: "Do not exceed lovastatin 20 mg daily with amiodarone, diltiazem, or verapamil.",
    source: "Mevacor PI dose cap",
  },
  {
    victim: "atorvastatin",
    perpetrators: ["itraconazole", "clarithromycin", "ritonavir", "cobicistat"],
    mg: 20,
    why: "Do not exceed atorvastatin 20 mg daily with certain strong 3A4 inhibitors.",
    source: "Lipitor PI dose cap",
  },
  {
    victim: "colchicine",
    perpetrators: STRONG_3A4.filter((id) => id !== "gemfibrozil"),
    mg: 0.3,
    why: "Strong 3A4 / P-gp: Colcrys PI cuts the gout dose. Some pairs are avoid.",
    source: "Colcrys PI",
  },
  {
    victim: "sildenafil",
    perpetrators: STRONG_3A4.filter((id) => id !== "gemfibrozil"),
    mg: 25,
    why: "Strong 3A4: start sildenafil 25 mg. Nitrates stay contraindicated on the PD tab.",
    source: "Viagra PI",
  },
  {
    victim: "ranolazine",
    perpetrators: ["itraconazole", "ketoconazole", "clarithromycin", "ritonavir", "cobicistat"],
    mg: 0,
    why: "Strong 3A4 inhibitors are labeled contraindicated with ranolazine.",
    source: "Ranexa PI",
  },
  {
    victim: "lamotrigine",
    perpetrators: ["valproate"],
    mg: 200,
    why: "Valproate doubles lamotrigine. Starter kits and the 200 mg ceiling are labeled.",
    source: "Lamictal PI",
  },
  {
    victim: "citalopram",
    perpetrators: ["omeprazole", "esomeprazole", "cimetidine", "fluconazole"],
    mg: 20,
    why: "CYP2C19 inhibitor / Celexa boxed warning: do not exceed 20 mg daily due to QT prolongation.",
    source: "Celexa PI / FDA Drug Safety Communication",
  },
];

export function parseDoses(raw: Record<string, string> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw) return out;
  for (const [id, s] of Object.entries(raw)) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) out[id] = n;
  }
  return out;
}

export function capOnDesk(id: string, ids: string[]): DoseCap | null {
  const set = new Set(ids);
  let best: DoseCap | null = null;
  for (const cap of CAPS) {
    if (cap.victim !== id) continue;
    const hit = cap.perpetrators.find((p) => set.has(p) && p !== id);
    if (!hit) continue;
    if (!best || cap.mg < best.mg) best = { ...cap, perpetrators: [hit] };
  }
  return best;
}

export function hasDoseLabel(id: string) {
  return Boolean(DOSING[id]);
}

export function dosingWanted(ids: string[]) {
  return ids.some((id) => hasDoseLabel(id));
}

function toneFor(band: DoseBand): DoseTone {
  if (band === "over-cap" || band === "over-max" || band === "street") return "danger";
  if (band === "above-usual" || band === "host" || band === "weight") return "warn";
  if (band === "usual") return "ok";
  return "info";
}

export function checkDose(
  id: string,
  amount: number | null,
  ids: string[],
  host: HostContext = DEFAULT_HOST,
): DoseCheck | null {
  const label = DOSING[id];
  if (!label) return null;
  const name = DRUG_BY_ID[id]?.name ?? id;
  const cap = capOnDesk(id, ids);
  const kidney = host.kidney ?? "ok";
  const age = host.age ?? "adult";

  let band: DoseBand = "none";
  let headline = `${name} — labeled range`;
  let detail = `${label.usualAdult} ${label.unit}. ${label.source}. This desk does not pick the milligram.`;

  if (label.neverPrescribe) {
    band = "street";
    headline = `${name} is not a labeled human dose`;
    detail = label.usualAdult;
  } else if (label.weightBased) {
    band = "weight";
    headline = `${name} is weight / AUC — not a desk milligram`;
    detail = `${label.usualAdult} ${label.renalNote ?? ""} Open the PI.`;
  } else if (label.titrated && amount == null) {
    band = "titrated";
    headline = `${name} is titrated to a level, not a milligram`;
    detail = `${label.usualAdult} ${label.source}.`;
  } else if (cap && cap.mg === 0) {
    band = "over-cap";
    headline = `${name} is labeled hold next to ${DRUG_BY_ID[cap.perpetrators[0]]?.name ?? cap.perpetrators[0]}`;
    detail = `${cap.why} ${cap.source}.`;
  } else if (cap && amount != null && amount > cap.mg) {
    band = "over-cap";
    headline = `${name} ${amount} ${label.unit} exceeds the labeled ${cap.mg} ${label.unit} cap`;
    detail = `${cap.why} You typed the milligram; the PI caps it. This desk does not pick the replacement. ${cap.source}.`;
  } else if (label.labeledMax != null && amount != null && amount > label.labeledMax) {
    band = "over-max";
    headline = `${name} ${amount} ${label.unit} is over the labeled max ${label.labeledMax}`;
    detail = `${label.maxNote ?? "Labeled maximum."} ${label.source}.`;
  } else if (kidney === "ckd" && label.renal === "avoid") {
    band = "host";
    headline = `${name} on a CKD host — labeled avoid or specialist`;
    detail = label.renalNote ?? "Renal clearance. Open the PI. This desk does not pick the cut.";
  } else if (kidney === "ckd" && label.renal === "cut") {
    band = "host";
    headline = `${name} on a CKD host — labeled dose-cut`;
    detail = label.renalNote ?? "Many labels cut on Cockcroft–Gault. This desk flags CKD; it does not pick the milligram.";
  } else if (amount != null && label.usualHigh != null && amount > label.usualHigh) {
    band = "above-usual";
    headline = `${name} ${amount} ${label.unit} is above the usual adult band`;
    detail = `Usual ${label.usualAdult}. ${label.maxNote ?? "Still may be labeled for a different indication."} ${label.source}.`;
  } else if (amount != null && label.usualLow != null && amount < label.usualLow) {
    band = "below";
    headline = `${name} ${amount} ${label.unit} is below the usual adult band`;
    detail = `Usual ${label.usualAdult}. Starts and tapers live here. ${label.source}.`;
  } else if (amount != null && label.usualLow != null && label.usualHigh != null) {
    band = "usual";
    headline = `${name} ${amount} ${label.unit} sits in the usual adult band`;
    detail = `${label.usualAdult}. In-range is not a prescription. ${label.source}.`;
  } else if (cap) {
    headline = `${name} — labeled cap ${cap.mg === 0 ? "hold" : `${cap.mg} ${label.unit}`} next to ${DRUG_BY_ID[cap.perpetrators[0]]?.name ?? cap.perpetrators[0]}`;
    detail = `${cap.why} Type the milligram to check it. ${cap.source}.`;
  }

  if (age === "geriatric" && label.geriatric && band === "none") {
    detail = `${detail} Geriatric: ${label.geriatric}`;
  }
  if (label.schedule) {
    detail = `${detail} Schedule: ${label.schedule}.`;
  }
  if (label.highAlert && band !== "street") {
    detail = `${detail} ISMP high-alert.`;
  }

  return {
    id,
    name,
    amount,
    label,
    cap,
    band,
    tone: toneFor(band),
    headline,
    detail,
  };
}

export function dosingOnDesk(ids: string[], amounts: Record<string, number>, host: HostContext): DoseCheck[] {
  return ids
    .map((id) => checkDose(id, amounts[id] ?? null, ids, host))
    .filter((row): row is DoseCheck => Boolean(row));
}

function findingOf(check: DoseCheck, severity: Severity, suffix: string, effect: string): Finding {
  return {
    id: `${check.id}__${suffix}`,
    severity,
    kind: "clinic",
    drugIds: check.cap ? [check.id, check.cap.perpetrators[0]] : [check.id],
    headline: check.headline,
    enzymes: [],
    effect,
    mechanism: check.cap ? check.cap.why : check.label.source,
    clinical: check.detail,
    tags: ["dose", "clinic"],
  };
}

/** Engine findings — only when an entered milligram (or a hold) crosses a labeled rail. */
export function doseFindings(
  ids: string[],
  amounts: Record<string, number>,
  host: HostContext,
): Finding[] {
  const out: Finding[] = [];
  for (const check of dosingOnDesk(ids, amounts, host)) {
    if (check.amount == null) continue;
    if (check.band === "over-cap" && check.cap && check.cap.mg > 0) {
      out.push(findingOf(check, "major", "dose-over-cap", "exceeds labeled dose cap"));
    } else if (check.band === "over-max") {
      out.push(findingOf(check, "major", "dose-over-max", "exceeds labeled maximum"));
    }
  }
  return out;
}
