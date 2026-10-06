/**
 * Parenteral Iron Sizing, Ganzoni Deficit Kinetics & Formulation Reference.
 *
 * Educational clinical pharmacology reference for iron deficiency anemia (IDA),
 * comparing IV iron complexes (sucrose, carboxymaltose, derisomaltose, dextran, gluconate),
 * Ganzoni formula deficit math, simplified weight-tiered matrices, test-dose requirements,
 * and FGF23-mediated hypophosphatemia alerts.
 *
 * Strictly non-prescriptive educational reference. Not an order, dosing directive,
 * or automated treatment protocol. Prescribing Information and institutional protocols govern.
 */

export interface IronFormulation {
  id: string;
  name: string;
  brand: string;
  elementalIronMgPerMl: number;
  maxSingleDoseMg: number;
  infusionTimeMin: number;
  testDoseRequired: boolean;
  boxedWarning: string | null;
  fgf23HypophosphatemiaRisk: "high" | "moderate" | "low" | "minimal";
  mriArtifactRisk: boolean;
  dialysisSetting: string;
  clinicalNote: string;
}

export const IRON_FORMULATIONS: Record<string, IronFormulation> = {
  "iron-sucrose": {
    id: "iron-sucrose",
    name: "Iron Sucrose",
    brand: "Venofer",
    elementalIronMgPerMl: 20,
    maxSingleDoseMg: 300,
    infusionTimeMin: 15,
    testDoseRequired: false,
    boxedWarning: null,
    fgf23HypophosphatemiaRisk: "minimal",
    mriArtifactRisk: false,
    dialysisSetting: "Standard of care in hemodialysis (e.g. 100 mg slow IV push per dialysis run for 10 consecutive sessions).",
    clinicalNote: "Low molecular weight complex with high safety record; single doses above 300 mg should be avoided due to transient labile iron saturation.",
  },
  "ferric-carboxymaltose": {
    id: "ferric-carboxymaltose",
    name: "Ferric Carboxymaltose",
    brand: "Injectafer",
    elementalIronMgPerMl: 50,
    maxSingleDoseMg: 750, // US FDA 750 mg; EU 1,000 mg
    infusionTimeMin: 15,
    testDoseRequired: false,
    boxedWarning: null,
    fgf23HypophosphatemiaRisk: "high",
    mriArtifactRisk: false,
    dialysisSetting: "Approved in non-dialysis CKD and heart failure (FAIR-HF / HEART-FID); not standard during active hemodialysis.",
    clinicalNote: "Carbohydrate matrix triggers intact FGF23 transcription in osteocytes, causing renal phosphate wasting and blunted calcitriol synthesis. Serum phosphate nadirs at 2–4 weeks; repeated courses risk persistent hypophosphatemic osteomalacia and fractures.",
  },
  "ferric-derisomaltose": {
    id: "ferric-derisomaltose",
    name: "Ferric Derisomaltose",
    brand: "Monoferric",
    elementalIronMgPerMl: 100,
    maxSingleDoseMg: 1000,
    infusionTimeMin: 20,
    testDoseRequired: false,
    boxedWarning: null,
    fgf23HypophosphatemiaRisk: "low",
    mriArtifactRisk: false,
    dialysisSetting: "Approved for rapid full-replacement single dosing in non-dialysis and dialysis patients.",
    clinicalNote: "Tightly bound linear isomaltoside matrix releases minimal free labile iron and causes significantly lower FGF23 elevation than ferric carboxymaltose (PHOSPHARE-IDA trials). Enables 1,000 mg single infusion over 20 minutes.",
  },
  "iron-dextran": {
    id: "iron-dextran",
    name: "Iron Dextran (Low Molecular Weight)",
    brand: "INFeD",
    elementalIronMgPerMl: 50,
    maxSingleDoseMg: 1000, // Total dose infusion (TDI) over 4-6h
    infusionTimeMin: 240,
    testDoseRequired: true,
    boxedWarning: "Black Box Warning: Anaphylactic-type reactions, several fatal. Mandatory 25 mg IV test dose over at least 5 minutes; observe patient for at least 1 hour before administering remaining dose.",
    fgf23HypophosphatemiaRisk: "minimal",
    mriArtifactRisk: false,
    dialysisSetting: "Historical staple; modern practice prefers non-dextran complexes due to hypersensitivity monitoring burden.",
    clinicalNote: "Modern INFeD is low-molecular-weight dextran (much lower risk than historical high-MW Dexferrum), but the FDA class boxed warning for anaphylaxis remains mandatory. Resuscitation equipment must be immediately accessible.",
  },
  "ferric-gluconate": {
    id: "ferric-gluconate",
    name: "Sodium Ferric Gluconate",
    brand: "Ferrlecit",
    elementalIronMgPerMl: 12.5,
    maxSingleDoseMg: 125,
    infusionTimeMin: 10,
    testDoseRequired: false,
    boxedWarning: null,
    fgf23HypophosphatemiaRisk: "minimal",
    mriArtifactRisk: false,
    dialysisSetting: "Common hemodialysis regimen: 125 mg IV per run for 8 consecutive runs (1,000 mg cumulative).",
    clinicalNote: "Rapidly cleared from circulation; larger single doses can overwhelm transferrin binding and cause transient flushing, hypotension, or back pain.",
  },
};

export interface GanzoniInput {
  actualHb: number; // g/dL
  targetHb?: number; // g/dL, defaults to 15.0 for adults >= 35 kg
  weightKg: number;
  heightCm?: number;
  sex?: "male" | "female";
  customDepotMg?: number;
}

export interface GanzoniResult {
  actualHb: number;
  targetHb: number;
  weightKg: number;
  ibwKg: number | null;
  isObese: boolean;
  hbDeficit: number; // targetHb - actualHb
  depotIronMg: number;
  rawDeficitMg: number; // Ganzoni with actual weight
  ibwDeficitMg: number | null; // Ganzoni with Devine IBW if overweight
  suggestedDeficitMg: number; // recommended educational estimate
  factorConstant: number; // 2.4
  simplifiedMatrixMg: number; // European/US fixed table estimate
  divergenceNote: string;
  clinicalSafetyNotes: string[];
}

/**
 * Calculates Devine 1974 Ideal Body Weight.
 */
function devineIbw(heightCm: number, sex: "male" | "female"): number {
  const inches = heightCm / 2.54;
  const inchesOver60 = Math.max(0, inches - 60);
  const base = sex === "male" ? 50.0 : 45.5;
  return Math.round((base + 2.3 * inchesOver60) * 10) / 10;
}

/**
 * Evaluates total iron deficit using the classical 1970 Ganzoni formula:
 * Total Deficit (mg) = Weight (kg) × (Target Hb - Actual Hb) × 2.4 + Iron Depot (mg)
 *
 * Constant 2.4 derivation:
 * 0.0034 (iron fraction of Hb = 0.34%) × 0.07 (blood vol ~7% body weight) × 10,000 (unit conversion) = 2.38 ≈ 2.4
 */
export function calculateGanzoni(input: GanzoniInput): GanzoniResult {
  const actualHb = Math.max(2, Math.min(20, input.actualHb));
  const targetHb = input.targetHb ?? (input.weightKg >= 35 ? 15.0 : 13.0);
  const hbDeficit = Math.max(0, Math.round((targetHb - actualHb) * 10) / 10);
  const weightKg = Math.max(10, Math.min(250, input.weightKg));

  // Depot iron: standard adult store is 500 mg for >= 35 kg, or 15 mg/kg for < 35 kg
  const depotIronMg = input.customDepotMg ?? (weightKg >= 35 ? 500 : Math.round(weightKg * 15));

  // Factor constant is 2.4
  const factor = 2.4;

  // Raw Ganzoni deficit with actual weight
  const rawDeficitMg = Math.round(weightKg * hbDeficit * factor + depotIronMg);

  let ibwKg: number | null = null;
  let ibwDeficitMg: number | null = null;
  let isObese = false;

  if (input.heightCm && input.sex) {
    ibwKg = devineIbw(input.heightCm, input.sex);
    const bmi = weightKg / ((input.heightCm / 100) * (input.heightCm / 100));
    isObese = bmi >= 30 || weightKg > ibwKg * 1.2;

    if (isObese) {
      // In obesity, adipose tissue has minimal vascularity; Ganzoni with ABW overpredicts deficit.
      // Guidelines recommend using IBW or adjusted body weight (AdjBW = IBW + 0.4*(ABW - IBW))
      const adjBw = ibwKg + 0.4 * (weightKg - ibwKg);
      ibwDeficitMg = Math.round(adjBw * hbDeficit * factor + depotIronMg);
    }
  }

  // Simplified matrix (e.g. European/US formulation product labels):
  // Hb < 10 g/dL: <70 kg = 1000 mg; >= 70 kg = 1500 mg
  // Hb >= 10 g/dL: <70 kg = 500 mg; >= 70 kg = 1000 mg
  let simplifiedMatrixMg = 1000;
  if (actualHb < 10) {
    simplifiedMatrixMg = weightKg >= 70 ? 1500 : 1000;
  } else {
    simplifiedMatrixMg = weightKg >= 70 ? 1000 : 500;
  }

  const suggestedDeficitMg = isObese && ibwDeficitMg !== null ? ibwDeficitMg : rawDeficitMg;

  let divergenceNote = "";
  if (isObese && ibwDeficitMg !== null) {
    const diff = rawDeficitMg - ibwDeficitMg;
    divergenceNote = `Patient is obese (actual weight ${weightKg} kg vs IBW ${ibwKg} kg). Unadjusted Ganzoni overpredicts deficit by ${diff} mg due to low adipose perfusion; adjusted body weight sizing (${ibwDeficitMg} mg) avoids hemosiderosis.`;
  } else {
    divergenceNote = `Standard Ganzoni deficit: ${rawDeficitMg} mg (includes ${depotIronMg} mg depot store replenishment).`;
  }

  const notes: string[] = [];
  notes.push("Ganzoni assumes normal iron stores depot of 500 mg in adults.");
  if (actualHb < 7) {
    notes.push("Severe anemia (Hb < 7 g/dL): evaluate hemodynamic stability, active occult hemorrhage, and red cell transfusion indications prior to elective repletion.");
  }
  notes.push("Check serum ferritin and transferrin saturation (TSAT): avoid parenteral iron if ferritin > 500 ng/mL or TSAT > 50% (risk of iron overload).");
  notes.push("In inflammatory bowel disease and non-dialysis CKD, modern clinical trials (FERGIcor) demonstrate that simplified weight/Hb matrix dosing achieves equivalent hematologic cure with less complex calculation.");

  return {
    actualHb,
    targetHb,
    weightKg,
    ibwKg,
    isObese,
    hbDeficit,
    depotIronMg,
    rawDeficitMg,
    ibwDeficitMg,
    suggestedDeficitMg,
    factorConstant: factor,
    simplifiedMatrixMg,
    divergenceNote,
    clinicalSafetyNotes: notes,
  };
}

/**
 * Tray check: detect iron supplements or parenteral complexes currently on the desk.
 */
export function ironOnDesk(trayIds: string[]): {
  hasIron: boolean;
  activeParenteral: IronFormulation[];
  oralIronIds: string[];
} {
  const activeParenteral: IronFormulation[] = [];
  const oralIronIds: string[] = [];

  for (const id of trayIds) {
    if (IRON_FORMULATIONS[id]) {
      activeParenteral.push(IRON_FORMULATIONS[id]);
    } else if (
      id === "iron" ||
      id === "ferrous-sulfate" ||
      id === "ferrous-gluconate" ||
      id === "ferrous-fumarate"
    ) {
      oralIronIds.push(id);
    }
  }

  return {
    hasIron: activeParenteral.length > 0 || oralIronIds.length > 0,
    activeParenteral,
    oralIronIds,
  };
}

/**
 * Teaching report for active iron products on the tray.
 */
export function ironReportOnDesk(trayIds: string[]): {
  headline: string;
  items: { title: string; detail: string; warning?: boolean }[];
} {
  const { activeParenteral, oralIronIds } = ironOnDesk(trayIds);

  if (activeParenteral.length === 0 && oralIronIds.length === 0) {
    return {
      headline: "No iron products currently in tray.",
      items: [
        {
          title: "Parenteral Iron Sizing",
          detail: "Add iron-sucrose, ferric-carboxymaltose, ferric-derisomaltose, iron-dextran, or oral ferrous sulfate to inspect formulation comparisons and Ganzoni calculation.",
        },
      ],
    };
  }

  const items: { title: string; detail: string; warning?: boolean }[] = [];

  for (const p of activeParenteral) {
    if (p.boxedWarning) {
      items.push({
        title: `${p.name} (${p.brand}) · Black Box Warning`,
        detail: p.boxedWarning,
        warning: true,
      });
    }

    if (p.fgf23HypophosphatemiaRisk === "high") {
      items.push({
        title: `${p.name} · FGF23 Hypophosphatemia Warning`,
        detail: "Ferric carboxymaltose induces intact FGF23 production, triggering severe renal phosphate wasting. Monitor serum phosphate; repeat courses risk osteomalacia.",
        warning: true,
      });
    }

    items.push({
      title: `${p.name} (${p.brand}) · Sizing & Delivery`,
      detail: `Max single dose: ${p.maxSingleDoseMg} mg over ${p.infusionTimeMin} min. Elemental iron: ${p.elementalIronMgPerMl} mg/mL. ${p.dialysisSetting}`,
    });
  }

  if (oralIronIds.length > 0) {
    items.push({
      title: "Oral Iron Absorption & Hepcidin Kinetics",
      detail: "Oral ferrous salts trigger acute hepatic hepcidin elevation for 24–48 hours, blocking ferroportin and blunting subsequent absorption. Alternate-day dosing (every other day) maximizes fractional absorption and cuts GI intolerance.",
    });
  }

  return {
    headline: `Active Iron Products (${activeParenteral.length} IV, ${oralIronIds.length} oral)`,
    items,
  };
}

