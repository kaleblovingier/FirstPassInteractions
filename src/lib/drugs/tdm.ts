/** Teaching TDM windows — not a protocol and not a draw-time order. */

import type { HostContext } from "./types";

export interface TdmCard {
  analyte: string;
  unit: string;
  trough: string;
  toxic: string;
  draw: string;
  pearl: string;
}

const TDM: Record<string, TdmCard> = {
  lithium: {
    analyte: "Lithium",
    unit: "mEq/L",
    trough: "0.6–1.2 (maintenance often 0.6–0.8)",
    toxic: ">1.5; severe >2.0",
    draw: "Trough ~12 h after the last dose",
    pearl: "NSAID, ACEI/ARB, and thiazides raise the level. Salt restriction retains it; caffeine dumps it. CKD is a TDM problem, not a CYP one.",
  },
  valproate: {
    analyte: "Valproate",
    unit: "µg/mL",
    trough: "50–100 (mania sometimes higher)",
    toxic: ">150; hyperammonemia can happen inside the range",
    draw: "Trough before the morning dose",
    pearl: "UGT trap with lamotrigine — parent lamotrigine doubles. Boxed hepatotoxicity and pancreatitis. Not a first-line in people who can become pregnant.",
  },
  carbamazepine: {
    analyte: "Carbamazepine",
    unit: "µg/mL",
    trough: "4–12",
    toxic: ">15; hyponatremia can happen inside the range",
    draw: "Trough; autoinduction over the first weeks",
    pearl: "Strong 3A4 inducer. HLA-B*15:02 is the SJS gene. OCP failure and stolen methadone live on the same card.",
  },
  phenytoin: {
    analyte: "Phenytoin",
    unit: "µg/mL",
    trough: "10–20 total (free 1–2)",
    toxic: "Nystagmus ~20; ataxia ~30; lethargy ~40",
    draw: "Trough; correct for albumin",
    pearl: "Saturable 2C9/2C19 kinetics. Tube feeds bind it. A 2C9 PM looks like a dose that never settled.",
  },
  phenobarbital: {
    analyte: "Phenobarbital",
    unit: "µg/mL",
    trough: "15–40",
    toxic: ">40 sedation; >60 often toxic",
    draw: "Trough; t½ is days — do not chase yesterday",
    pearl: "Broad CYP inducer. Primidone is the prodrug. OCP failure is the quiet row.",
  },
  lamotrigine: {
    analyte: "Lamotrigine",
    unit: "µg/mL",
    trough: "3–15 (lab-dependent)",
    toxic: "Rash is not a level — SJS is the titration",
    draw: "Trough; pregnancy clearance rises",
    pearl: "Valproate doubles parent via UGT. Estrogen dumps it. The boxed warning is the rash, not the number.",
  },
  digoxin: {
    analyte: "Digoxin",
    unit: "ng/mL",
    trough: "0.5–0.9 in HFrEF (older 0.8–2.0 AF range is too hot)",
    toxic: ">2; toxicity at ‘normal’ if K is low",
    draw: "≥6 h after a dose; 8–24 h is cleaner",
    pearl: "P-gp victim. Clarithromycin, amiodarone, and verapamil raise it. Hypokalemia is the arrhythmia trap.",
  },
  clozapine: {
    analyte: "Clozapine",
    unit: "ng/mL",
    trough: "350–600 (response often ≥350)",
    toxic: ">1000 seizure / sedation watch",
    draw: "Trough; norclozapine is the metabolite column",
    pearl: "1A2 is the clearance. Daily smoke dumps the level; quitting makes it jump. Fluvoxamine is a strong 1A2 inhibitor — parent climbs.",
  },
  nortriptyline: {
    analyte: "Nortriptyline",
    unit: "ng/mL",
    trough: "50–150",
    toxic: ">500; anticholinergic / QT inside a hot range",
    draw: "Trough after ≥5 days",
    pearl: "2D6 victim. A PM or a strong 2D6 inhibitor (paroxetine, fluoxetine, bupropion) is how the TCA level surprises you.",
  },
  amitriptyline: {
    analyte: "Amitriptyline + nortriptyline",
    unit: "ng/mL",
    trough: "80–200 combined (lab-dependent)",
    toxic: ">500; QT and anticholinergic",
    draw: "Trough after ≥5 days",
    pearl: "2D6 and 2C19 both sit on this molecule. CPIC trims the PM. Not a free sleep drug in older adults.",
  },
  theophylline: {
    analyte: "Theophylline",
    unit: "µg/mL",
    trough: "10–20 (many labs now 5–15)",
    toxic: ">20 GI/CNS; >30 arrhythmia / seizure",
    draw: "Trough; peak 1–2 h after an IR dose",
    pearl: "Sensitive 1A2 substrate. Cipro and fluvoxamine raise it; smoke dumps it. The rebound on quit is the miss.",
  },
  tacrolimus: {
    analyte: "Tacrolimus",
    unit: "ng/mL",
    trough: "5–15 (indication and time from transplant)",
    toxic: "Nephrotoxicity, tremor, hyperglycemia as trough climbs",
    draw: "Trough (C0) just before the morning dose",
    pearl: "Sensitive 3A4 / P-gp gut victim. Grapefruit and azoles raise F; rifampin steals the graft. t½ barely moves — it is bioavailability.",
  },
  cyclosporine: {
    analyte: "Cyclosporine",
    unit: "ng/mL",
    trough: "100–400 (center protocol)",
    toxic: "Nephrotoxicity, HTN, gum, tremor",
    draw: "C0 or C2 per the transplant desk",
    pearl: "Same 3A4/P-gp gut story as tacrolimus. Diltiazem is sometimes used as a deliberate booster — that is a protocol, not a coincidence.",
  },
  sirolimus: {
    analyte: "Sirolimus",
    unit: "ng/mL",
    trough: "4–12 (center protocol)",
    toxic: "Marrow, lipids, delayed wound healing",
    draw: "Trough; t½ is long — do not redraw tomorrow",
    pearl: "3A4/P-gp. Cyclosporine raises sirolimus if you stack them the wrong hour.",
  },
  methotrexate: {
    analyte: "Methotrexate",
    unit: "µmol/L (high-dose) or nmol/L (weekly)",
    trough: "High-dose: follow the rescue nomogram, not a single number",
    toxic: "Mucositis, marrow, kidney — leucovorin is the rescue",
    draw: "Timed levels after high-dose; weekly RA doses are not this row",
    pearl: "NSAID, TMP-SMX, and PPI delay clearance. This is not a CYP story.",
  },
  warfarin: {
    analyte: "INR",
    unit: "",
    trough: "2–3 most indications (2.5–3.5 mechanical mitral)",
    toxic: "Bleed climbs as INR climbs; 4–5 is a hold conversation",
    draw: "Morning INR; vitamin K is the antidote",
    pearl: "S-warfarin is a sensitive 2C9 substrate. Fluconazole, TMP-SMX, and amiodarone are the classic perpetrators. Leafy greens are vitamin K, not 2C9.",
  },
};

export function tdmFor(id: string): TdmCard | undefined {
  return TDM[id];
}

export function tdmOnDesk(ids: string[]): Array<{ id: string; card: TdmCard }> {
  return ids.map((id) => ({ id, card: TDM[id] })).filter((row): row is { id: string; card: TdmCard } => Boolean(row.card));
}

export function tdmHostNote(id: string, host: HostContext): string | null {
  if (id === "lithium" && host.kidney === "ckd") return "CKD on this host — lithium is renally cleared. The trough will drift up.";
  if (id === "digoxin" && host.kidney === "ckd") return "CKD on this host — digoxin clearance falls. Recheck the trough, not just the milligrams.";
  if (id === "lithium" && host.age === "geriatric") return "Geriatric host — smaller Vd and GFR. Toxicity can sit inside a ‘therapeutic’ number.";
  if (id === "clozapine" && host.smoking) return "Daily smoke on this host — 1A2 induction. Expect a lower trough; quitting will raise it.";
  if (id === "theophylline" && host.smoking) return "Smoke induces 1A2. Theophylline falls; the quit rebound is the toxicity.";
  if (id === "phenytoin" && host.preg === "pregnant") return "Pregnancy — clearance and albumin both move. Free phenytoin is the honest number.";
  if (id === "lamotrigine" && host.preg === "pregnant") return "Pregnancy raises lamotrigine clearance. Levels fall unless you titrate.";
  if (id === "valproate" && host.preg === "pregnant") return "Valproate is avoid in pregnancy on this desk — neural-tube and cognitive risk, not a TDM tweak.";
  return null;
}

export function hasTdm(id: string) {
  return Boolean(TDM[id]);
}
