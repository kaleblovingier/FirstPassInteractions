/**
 * Digoxin Pharmacokinetics, Toxicity Risk & Digoxin Immune Fab (DigiFab) Sizing Station.
 *
 * Educational clinical pharmacology reference for cardiac glycoside therapy,
 * therapeutic drug monitoring (TDM) targets in heart failure vs atrial fibrillation,
 * P-glycoprotein perpetrator interactions, electrolyte sensitizers (K+, Mg2+, Ca2+),
 * and DigiFab stoichiometry formulas.
 *
 * Strictly non-prescriptive educational reference. Not an order, dosing protocol,
 * or treatment directive. Prescribing Information and medical toxicology govern.
 */

export interface DigoxinLevelEvaluation {
  levelNgMl: number;
  indication: "heart-failure" | "atrial-fib";
  band: "subtherapeutic" | "target" | "elevated" | "toxic" | "distribution-warning";
  label: string;
  clinicalMeaning: string;
  mortalityNote?: string;
  samplingTimingWarning?: string;
}

export interface DigifabCalcInput {
  scenario: "acute-dose" | "steady-state-level" | "empiric-arrest";
  ingestedDoseMg?: number;
  serumLevelNgMl?: number;
  weightKg?: number;
  indication?: "acute" | "chronic";
  isArrestOrUnstable?: boolean;
}

export interface DigifabCalcResult {
  vialsRecommended: number;
  vialsRounded: number;
  calculationMethod: string;
  formulaString: string;
  mgDigoxinBound: number;
  reboundHypokalemiaAlert: string;
  postFabImmunoassayAlert: string;
  clinicalCaveats: string[];
}

export const DIGOXIN_PGP_INTERACTORS = [
  { id: "amiodarone", name: "Amiodarone", reductionPct: 50, note: "P-gp inhibition reduces renal/biliary clearance by ~50%; empiric 50% digoxin dose cut required." },
  { id: "verapamil", name: "Verapamil", reductionPct: 40, note: "Non-DHP CCB and P-gp blocker; raises serum digoxin levels 40–70% and compounds AV nodal blockade." },
  { id: "diltiazem", name: "Diltiazem", reductionPct: 25, note: "Moderate P-gp inhibitor; increases digoxin exposure ~20–30% and adds additive bradycardia." },
  { id: "quinidine", name: "Quinidine", reductionPct: 50, note: "Displaces digoxin from tissue binding sites and blocks P-gp; doubles plasma concentration." },
  { id: "clarithromycin", name: "Clarithromycin", reductionPct: 40, note: "Strong P-gp inhibitor; marked increase in systemic digoxin and risk of acute toxicity." },
  { id: "dronedarone", name: "Dronedarone", reductionPct: 50, note: "Strong P-gp inhibitor; labeled requirement to halve digoxin dose." },
  { id: "propafenone", name: "Propafenone", reductionPct: 30, note: "Class 1C antiarrhythmic; inhibits P-gp and increases digoxin levels." },
];

/**
 * Evaluates serum digoxin concentration (SDC) against clinical indications.
 * HF Target: 0.5–0.9 ng/mL (DIG Trial: >=1.2 ng/mL associated with increased all-cause mortality).
 * AF Target: 0.8–1.2 ng/mL (up to 2.0 ng/mL for acute rate control, but higher toxicity risk).
 * Toxic: >2.0 ng/mL.
 */
export function evaluateDigoxinLevel(
  levelNgMl: number,
  indication: "heart-failure" | "atrial-fib" = "heart-failure",
  hoursPostDose = 12,
): DigoxinLevelEvaluation {
  const level = Math.max(0, Math.min(20, levelNgMl));
  const isEarlyDistribution = hoursPostDose < 6;

  let band: DigoxinLevelEvaluation["band"] = "target";
  let label = "Target SDC";
  let clinicalMeaning = "";
  let mortalityNote: string | undefined;

  if (isEarlyDistribution) {
    band = "distribution-warning";
    label = "Pre-Distribution Phase (<6h)";
    clinicalMeaning = "Sample drawn before tissue distribution completed (Vd 5–7 L/kg). SDC is falsely elevated; wait until 6–8h post-dose (ideally 12–24h) to measure steady-state.";
  } else if (level < 0.5) {
    band = "subtherapeutic";
    label = "Subtherapeutic (<0.5 ng/mL)";
    clinicalMeaning = "Below therapeutic range for both heart failure inotropic support and rate control.";
  } else if (indication === "heart-failure") {
    if (level <= 0.9) {
      band = "target";
      label = "Optimal HF Target (0.5–0.9 ng/mL)";
      clinicalMeaning = "Maximizes neurohormonal modulation and inotropic benefit while minimizing arrhythmogenic toxicity.";
      mortalityNote = "DIG Trial retrospective analysis confirmed lowest all-cause mortality in the 0.5–0.9 ng/mL window.";
    } else if (level <= 1.2) {
      band = "elevated";
      label = "Borderline High for HF (1.0–1.2 ng/mL)";
      clinicalMeaning = "Elevated for heart failure patients; associated with neutral to negative outcomes in clinical trials.";
      mortalityNote = "Levels >=1.2 ng/mL confer higher mortality risk in HFrEF without additional clinical benefit.";
    } else if (level <= 2.0) {
      band = "elevated";
      label = "Elevated / Potential Toxicity (1.3–2.0 ng/mL)";
      clinicalMeaning = "Supra-target level. High risk of adverse effects in older adults or those with renal impairment or electrolyte imbalances.";
      mortalityNote = "Definite increased mortality risk in heart failure.";
    } else {
      band = "toxic";
      label = "Toxic (>2.0 ng/mL)";
      clinicalMeaning = "Severe toxicity threshold. High risk of AV block, bidirectional ventricular tachycardia, hyperkalemia, and visual disturbances (xanthopsia).";
    }
  } else {
    // Atrial fibrillation indication
    if (level <= 1.2) {
      band = "target";
      label = "Target AF Rate Control (0.8–1.2 ng/mL)";
      clinicalMeaning = "Sufficient vagotonic AV nodal slowing for resting ventricular rate control.";
    } else if (level <= 2.0) {
      band = "elevated";
      label = "High-Normal SDC (1.3–2.0 ng/mL)";
      clinicalMeaning = "Permitted in refractory tachyarrhythmias, but closely monitor for conduction blocks and PVCs.";
    } else {
      band = "toxic";
      label = "Toxic (>2.0 ng/mL)";
      clinicalMeaning = "Life-threatening toxicity threshold. May induce complete heart block or ventricular fibrillation.";
    }
  }

  const samplingTimingWarning = isEarlyDistribution
    ? "Levels drawn <6 hours post-dose reflect transient vascular peak, not myocardial tissue binding. Do not dose DigiFab solely on an early level unless patient is hemodynamically unstable."
    : undefined;

  return {
    levelNgMl: level,
    indication,
    band,
    label,
    clinicalMeaning,
    mortalityNote,
    samplingTimingWarning,
  };
}

/**
 * Calculates Digoxin Immune Fab (DigiFab) vials required using classic toxicology equations.
 * Each 40 mg vial binds approximately 0.5 mg of digoxin.
 *
 * Formula 1 (Acute ingestion with known mg):
 * Vials = [Ingested Dose (mg) * 0.8 (oral bioavailability)] / 0.5 mg/vial
 *
 * Formula 2 (Steady-state concentration with known level and weight):
 * Vials = [SDC (ng/mL) * Weight (kg)] / 100
 *
 * Formula 3 (Empiric cardiac arrest / unstable):
 * Acute: 10–20 vials; Chronic: 3–6 vials.
 */
export function calculateDigifab(input: DigifabCalcInput): DigifabCalcResult {
  let vialsRecommended = 0;
  let calculationMethod = "";
  let formulaString = "";

  const caveats: string[] = [
    "Each 40 mg vial of DigiFab binds approximately 0.5 mg of digoxin.",
    "Monitor continuous ECG, blood pressure, and serum potassium closely.",
  ];

  if (input.scenario === "empiric-arrest") {
    if (input.indication === "acute") {
      vialsRecommended = 10;
      calculationMethod = "Empiric Acute Resuscitation Protocol";
      formulaString = "10–20 vials IV push for acute cardiac arrest or life-threatening ventricular arrhythmia";
      caveats.push("In severe acute ingestion cardiac arrest, administer 10 vials initial IV push, with second 10 vials ready if no ROSC.");
    } else {
      vialsRecommended = 4;
      calculationMethod = "Empiric Chronic Toxicity Protocol";
      formulaString = "3–6 vials IV infusion over 30 minutes for unstable chronic toxicity when SDC is unknown";
      caveats.push("In chronic toxicity, total body burden is lower; 3–6 vials is typically sufficient and avoids complete loss of rate control.");
    }
  } else if (input.scenario === "acute-dose") {
    const mg = Math.max(0, input.ingestedDoseMg ?? 10);
    // Bioavailability ~80% for tablets
    const absorbedMg = mg * 0.8;
    vialsRecommended = absorbedMg / 0.5;
    calculationMethod = "Known Acute Ingested Dose Formula";
    formulaString = `[${mg} mg ingested × 0.8 bioavailability] / 0.5 mg/vial = ${vialsRecommended.toFixed(1)} vials`;
  } else {
    // Steady state level formula
    const sdc = Math.max(0, input.serumLevelNgMl ?? 4.0);
    const wt = Math.max(20, Math.min(250, input.weightKg ?? 70));
    vialsRecommended = (sdc * wt) / 100;
    calculationMethod = "Steady-State Serum Digoxin Nomogram Equation";
    formulaString = `[${sdc} ng/mL × ${wt} kg] / 100 = ${vialsRecommended.toFixed(1)} vials`;
  }

  const vialsRounded = Math.max(1, Math.ceil(vialsRecommended));
  const mgDigoxinBound = Math.round(vialsRounded * 0.5 * 10) / 10;

  const reboundHypokalemiaAlert =
    "Digoxin toxicity impairs Na+/K+-ATPase, causing hyperkalemia (extracellular K+ accumulation). DigiFab rapidly reactivates the pump, transporting potassium intracellularly and triggering severe rebound hypokalemia. Recheck serum K+ hourly and avoid aggressive potassium lowering prior to Fab administration.";

  const postFabImmunoassayAlert =
    "CRITICAL LAB MONITORING ALERT: Following DigiFab administration, total serum digoxin measured by routine commercial immunoassays increases 10- to 20-fold because Fab complexes mobilize tissue digoxin into plasma and assays cross-react with Fab-bound drug. Free (unbound) digoxin is near-zero. Total SDC is uninterpretable for 5–7 days (or up to weeks in ESRD). Do NOT redose Fab based on repeat total digoxin levels!";

  return {
    vialsRecommended: Math.round(vialsRecommended * 10) / 10,
    vialsRounded,
    calculationMethod,
    formulaString,
    mgDigoxinBound,
    reboundHypokalemiaAlert,
    postFabImmunoassayAlert,
    clinicalCaveats: caveats,
  };
}

/**
 * Checks active desk tray for digoxin and interacting P-gp inhibitors.
 */
export function digoxinOnDesk(trayIds: string[]): {
  hasDigoxin: boolean;
  pgpInteractors: typeof DIGOXIN_PGP_INTERACTORS;
} {
  const hasDigoxin = trayIds.includes("digoxin");
  const pgpInteractors = DIGOXIN_PGP_INTERACTORS.filter((p) => trayIds.includes(p.id));

  return {
    hasDigoxin,
    pgpInteractors,
  };
}

/**
 * Generates an educational report for digoxin and interacting drugs on the tray.
 */
export function digoxinReportOnDesk(trayIds: string[]): {
  headline: string;
  hasDigoxin: boolean;
  items: { title: string; detail: string; warning?: boolean }[];
} {
  const { hasDigoxin, pgpInteractors } = digoxinOnDesk(trayIds);

  if (!hasDigoxin && pgpInteractors.length === 0) {
    return {
      headline: "No digoxin or P-gp interactors on tray.",
      hasDigoxin: false,
      items: [
        {
          title: "Digoxin Therapeutic Window",
          detail: "Add digoxin to tray to evaluate HF targets (0.5–0.9 ng/mL), P-gp perpetrator interactions, and DigiFab sizing math.",
        },
      ],
    };
  }

  const items: { title: string; detail: string; warning?: boolean }[] = [];

  if (hasDigoxin) {
    items.push({
      title: "Digoxin Therapeutic Monitoring Standard",
      detail: "Heart failure target: 0.5–0.9 ng/mL (DIG Trial: >=1.2 ng/mL associated with higher mortality). Atrial fibrillation rate control target: 0.8–1.2 ng/mL. Toxic threshold: >2.0 ng/mL (lower if hypokalemic or hypomagnesemic).",
    });

    if (pgpInteractors.length > 0) {
      for (const inter of pgpInteractors) {
        items.push({
          title: `P-gp Perpetrator Collision: ${inter.name}`,
          detail: `${inter.note} Empiric ${inter.reductionPct}% dose reduction is recommended upon initiating ${inter.name}.`,
          warning: true,
        });
      }
    }
  } else if (pgpInteractors.length > 0) {
    items.push({
      title: "P-gp Inhibitor Present on Tray",
      detail: `Contains ${pgpInteractors.map((p) => p.name).join(", ")}. If digoxin is co-prescribed, expect clearance reduction of 30–50%.`,
    });
  }

  return {
    headline: hasDigoxin
      ? `Digoxin Active (${pgpInteractors.length ? `${pgpInteractors.length} P-gp interactor(s)` : "Monotherapy"})`
      : "P-gp Interactor Active (No Digoxin)",
    hasDigoxin,
    items,
  };
}

