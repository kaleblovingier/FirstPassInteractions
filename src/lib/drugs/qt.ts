/** QT stack map. Teaching — not Bazett, not a QTc, not CredibleMeds. */

import { DRUG_BY_ID } from "./catalog";
import type { Drug, HostContext } from "./types";

export type QtRisk = "known" | "possible";

export interface QtRow {
  id: string;
  name: string;
  risk: QtRisk;
  note: string;
}

export interface QtReport {
  rows: QtRow[];
  score: number;
  known: number;
  possible: number;
  amplifiers: string[];
  headline: string;
  tell: string;
}

const NOTE: Record<string, string> = {
  methadone: "Dose-related; citalopram / erythromycin / hypokalemia stack it.",
  citalopram: "Labeled daily ceiling (halved in older adults and CYP2C19 poor metabolizers). Escitalopram is quieter, not silent.",
  escitalopram: "Quieter than racemic citalopram. Still a known-risk SSRI.",
  sotalol: "The indication is the QT. Bradycardia plus low K is torsades weather.",
  amiodarone: "Prolongs QT, relatively low TdP for the milliseconds — still not a free stack.",
  ziprasidone: "Known-risk antipsychotic. Feed it (~500 kcal) or F falls — QT does not vanish.",
  haloperidol: "IV is the loud labeled row. Oral still counts on a methadone desk.",
  ondansetron: "IV more than oral. Next to methadone it is not a free antiemetic.",
  moxifloxacin: "The FQ with the loudest QT file.",
  levofloxacin: "Possible. Stack, do not shrug.",
  azithromycin: "Possible / conditional — the Z-pak is not a free macrolide on a QT desk.",
  clarithromycin: "3A4 perpetrator plus QT. The victim (methadone, quetiapine) is how TdP arrives.",
  erythromycin: "3A4 plus QT. IV erythromycin is the classic teaching case.",
  quetiapine: "Possible as monotherapy; known-risk partners (methadone, citalopram) make it count.",
  hydroxychloroquine: "Known-risk at higher/chronic doses. Retinopathy is the other monitor.",
  ranolazine: "Labeled QT. Strong 3A4 inhibitors are contraindicated.",
  loperamide: "P-gp knockout turns Imodium into a central opioid with QT.",
  "dirty-30": "Pressed 30s — fentanyl + who-knows. Treat as a full agonist with unknown QT load.",
};

function riskOf(d: Drug): QtRisk | null {
  if (d.pd.includes("qt-known")) return "known";
  if (d.pd.includes("qt-possible")) return "possible";
  return null;
}

export function qtReport(ids: string[], host: HostContext): QtReport | null {
  const rows: QtRow[] = [];
  for (const id of ids) {
    const d = DRUG_BY_ID[id];
    if (!d) continue;
    const risk = riskOf(d);
    if (!risk) continue;
    rows.push({ id, name: d.name, risk, note: NOTE[id] ?? d.toxicityHint });
  }
  if (!rows.length) return null;

  const known = rows.filter((r) => r.risk === "known").length;
  const possible = rows.filter((r) => r.risk === "possible").length;
  const score = known * 2 + possible;

  const amplifiers: string[] = [];
  const drugs = ids.map((id) => DRUG_BY_ID[id]).filter(Boolean) as Drug[];
  if (drugs.some((d) => d.pd.includes("hypokalemic") || d.pd.includes("loop-thiazide"))) {
    amplifiers.push("Hypokalemia on this desk (loop/thiazide or glycyrrhizin). Low K is how milliseconds become torsades.");
  }
  if (host.kidney === "ckd") {
    amplifiers.push("CKD — several QT drugs and their electrolytes accumulate.");
  }
  if (host.age === "geriatric") {
    amplifiers.push("Geriatric host — bradycardia, polypharmacy, and lower reserve.");
  }
  if (drugs.some((d) => d.id === "ondansetron" || d.id === "promethazine") && drugs.some((d) => d.id === "methadone")) {
    amplifiers.push("OTP antiemetic on methadone — pick the quieter nausea plan.");
  }

  const headline =
    known >= 2 || score >= 4
      ? `${known} known-risk + ${possible} possible — this is a QT stack, not a footnote.`
      : known === 1 && possible >= 1
        ? `${rows[0]?.name} is known-risk; ${possible} more possible agents sit beside it.`
        : known === 1
          ? `${rows.find((r) => r.risk === "known")?.name} is a known-risk QT drug. One agent can still be enough with low K.`
          : `${possible} possible-risk agents. Conditional until you stack, starve potassium, or add a 3A4 inhibitor.`;

  const tell =
    score >= 4
      ? "ECG, potassium, magnesium. Drop a possible-risk agent if you can. This is not a QTc calculator."
      : "Watch the milliseconds and the potassium. CredibleMeds is the public list; this desk is a stack map.";

  return { rows, score, known, possible, amplifiers, headline, tell };
}
