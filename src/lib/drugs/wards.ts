/**
 * Named ward / hospital collisions. Teaching — not a protocol, not a milligram.
 * The Prescribing Information governs.
 */

import { DRUG_BY_ID } from "./catalog";
import type { Severity } from "./types";

export const CARBAPENEMS = new Set([
  "meropenem",
  "ertapenem",
  "imipenem-cilastatin",
  "doripenem",
  "meropenem-vaborbactam",
  "imipenem-relebactam",
]);

export const VALPROATES = new Set(["valproate"]);

export const ACEI = new Set([
  "lisinopril",
  "enalapril",
  "enalaprilat",
  "ramipril",
  "benazepril",
  "quinapril",
  "captopril",
  "perindopril",
  "fosinopril",
  "trandolapril",
  "moexipril",
  "lisinopril-hctz",
]);

export const ARNI = new Set(["sacubitril-valsartan"]);

export const VANCO_IV = new Set(["vancomycin"]);

export const PIP_TAZO = new Set(["piperacillin-tazobactam"]);

export const FLUOROPYRIMIDINE = new Set(["capecitabine", "fluorouracil"]);

export const PEN_INDUCER = new Set(["dicloxacillin", "nafcillin"]);

export const GLP = new Set([
  "semaglutide",
  "tirzepatide",
  "liraglutide",
  "dulaglutide",
  "exenatide",
  "lixisenatide",
  "exenatide-er",
  "liraglutide-saxenda",
  "semaglutide-oral",
  "semaglutide-wegovy",
]);

export const CNI = new Set(["tacrolimus", "cyclosporine"]);

export const AZOLES = new Set([
  "voriconazole",
  "posaconazole",
  "itraconazole",
  "fluconazole",
  "isavuconazonium",
  "ketoconazole",
]);

export type WardKind =
  | "carbapenem-vpa"
  | "vanco-zosyn"
  | "arni-acei"
  | "capecitabine-warfarin"
  | "pen-inducer-warfarin"
  | "letermovir-tacro"
  | "cni-azole"
  | "linezolid-sero"
  | "glp-insulin";

export interface WardHit {
  id: WardKind;
  drugIds: [string, string];
  title: string;
  severity: Severity;
  tone: "danger" | "warn";
  mechanism: string;
  clinical: string;
  watch: string;
  source: string;
}

function hit(
  kind: WardKind,
  a: string,
  b: string,
  title: string,
  severity: Severity,
  tone: "danger" | "warn",
  mechanism: string,
  clinical: string,
  watch: string,
  source: string,
): WardHit {
  return { id: kind, drugIds: [a, b], title, severity, tone, mechanism, clinical, watch, source };
}

function names(a: string, b: string) {
  return `${DRUG_BY_ID[a]?.name ?? a} × ${DRUG_BY_ID[b]?.name ?? b}`;
}

function pair(ids: string[], left: Set<string>, right: Set<string>): [string, string] | null {
  const set = new Set(ids);
  for (const l of left) {
    if (!set.has(l)) continue;
    for (const r of right) {
      if (set.has(r) && r !== l) return [l, r];
    }
  }
  return null;
}

export function isCarbapenemValproate(a: string, b: string) {
  return (CARBAPENEMS.has(a) && VALPROATES.has(b)) || (CARBAPENEMS.has(b) && VALPROATES.has(a));
}

export function isVancoZosyn(a: string, b: string) {
  return (VANCO_IV.has(a) && PIP_TAZO.has(b)) || (VANCO_IV.has(b) && PIP_TAZO.has(a));
}

export function isArniAcei(a: string, b: string) {
  return (ARNI.has(a) && ACEI.has(b)) || (ARNI.has(b) && ACEI.has(a));
}

export function isCapecitabineWarfarin(a: string, b: string) {
  const w = a === "warfarin" || b === "warfarin";
  return w && (FLUOROPYRIMIDINE.has(a) || FLUOROPYRIMIDINE.has(b));
}

export function isPenInducerWarfarin(a: string, b: string) {
  const w = a === "warfarin" || b === "warfarin";
  return w && (PEN_INDUCER.has(a) || PEN_INDUCER.has(b));
}

export function isLetermovirTacro(a: string, b: string) {
  const t = a === "tacrolimus" || b === "tacrolimus";
  return t && (a === "letermovir" || b === "letermovir");
}

export function isCniAzole(a: string, b: string) {
  return (CNI.has(a) && AZOLES.has(b)) || (CNI.has(b) && AZOLES.has(a));
}

export function isInsulinId(id: string) {
  return id === "insulin-glargine" || id.startsWith("insulin-");
}

export function wardsOnDesk(ids: string[]): WardHit[] {
  const out: WardHit[] = [];
  const cv = pair(ids, CARBAPENEMS, VALPROATES);
  if (cv) {
    out.push(
      hit(
        "carbapenem-vpa",
        cv[0],
        cv[1],
        names(cv[0], cv[1]),
        "contraindicated",
        "danger",
        "carbapenem × valproate (UGT / glucuronide recycling)",
        "Carbapenems crash valproate levels within a day — not a CYP isoform, not stacked seizure threshold. Labels treat the pair as a loss of seizure control. Switch the antibiotic or the AED; do not 'give a bit more Depakote.'",
        "Levels fall fast. This desk does not pick a milligram or a replacement AED.",
        "Meropenem / ertapenem / imipenem labels. Spriet 2007 (PMID 17381386).",
      ),
    );
  }
  const vz = pair(ids, VANCO_IV, PIP_TAZO);
  if (vz) {
    out.push(
      hit(
        "vanco-zosyn",
        vz[0],
        vz[1],
        names(vz[0], vz[1]),
        "major",
        "danger",
        "vancomycin × piperacillin–tazobactam AKI",
        "The combination is associated with more acute kidney injury than vancomycin plus cefepime or a carbapenem. Observational, still a ward row. Volume, trough, and a narrower beta-lactam are the conversation — not a free Zosyn piggyback.",
        "Creatinine, urine output. Oral vancomycin is a different exposure.",
        "Luther 2018 meta-analysis (PMID 29126268). Not a boxed contraindication.",
      ),
    );
  }
  const aa = pair(ids, ARNI, ACEI);
  if (aa) {
    out.push(
      hit(
        "arni-acei",
        aa[0],
        aa[1],
        names(aa[0], aa[1]),
        "contraindicated",
        "danger",
        "ARNI × ACE inhibitor — angioedema",
        "Sacubitril–valsartan with an ACE inhibitor is labeled contraindicated. Thirty-six hour washout when switching. Duplicate neprilysin / ACE blockade, not a potassium footnote and not an ARB swap.",
        "Angioedema, BP, K. This desk does not time the first Entresto tablet.",
        "Entresto boxed warning / contraindications. Open the PI.",
      ),
    );
  }
  const cw = pair(ids, FLUOROPYRIMIDINE, new Set(["warfarin"]));
  if (cw) {
    out.push(
      hit(
        "capecitabine-warfarin",
        cw[0],
        cw[1],
        names(cw[0], cw[1]),
        "major",
        "danger",
        "fluoropyrimidine × warfarin INR rise",
        "Capecitabine and 5-FU raise INR and bleed risk on warfarin. Not a 2C9 bully on this desk's CYP map — still a labeled monitor. Recheck INR; this desk does not pick a warfarin milligram.",
        "INR, bleed. Xeloda / 5-FU labels.",
        "Capecitabine and fluorouracil labels: altered coagulation with warfarin.",
      ),
    );
  }
  const pw = pair(ids, PEN_INDUCER, new Set(["warfarin"]));
  if (pw) {
    out.push(
      hit(
        "pen-inducer-warfarin",
        pw[0],
        pw[1],
        names(pw[0], pw[1]),
        "major",
        "warn",
        "nafcillin / dicloxacillin × warfarin INR fall",
        "Nafcillin and dicloxacillin induce 3A4 and can steal warfarin effect — INR falls, clots not bleeds. The enzyme row on this desk is 3A4; warfarin is still a 2C9 NTI. Recheck INR after the course starts and after it stops.",
        "INR. Not a free MSSA pill on a VKA.",
        "Dicloxacillin / nafcillin warfarin case series and labels. Teaching, not a dose.",
      ),
    );
  }
  const lt = pair(ids, new Set(["letermovir"]), new Set(["tacrolimus"]));
  if (lt) {
    out.push(
      hit(
        "letermovir-tacro",
        lt[0],
        lt[1],
        names(lt[0], lt[1]),
        "major",
        "warn",
        "letermovir × tacrolimus (3A4 / OATP)",
        "Letermovir is a moderate 3A4 inhibitor. Tacrolimus is a sensitive NTI 3A4 victim. Levels climb. CMV prophylaxis is not a free add-on on a transplant desk.",
        "Tacrolimus trough. Open the PI for the labeled adjustment — this desk does not pick it.",
        "Prevymis label. Tacrolimus is NTI 3A4 on this desk.",
      ),
    );
  }
  const ca = pair(ids, CNI, AZOLES);
  if (ca) {
    out.push(
      hit(
        "cni-azole",
        ca[0],
        ca[1],
        names(ca[0], ca[1]),
        "major",
        "danger",
        "calcineurin inhibitor × azole antifungal — 3A4/P-gp clearance blockade",
        "Azoles (voriconazole, posaconazole, itraconazole, fluconazole, ketoconazole) potently inhibit CYP3A4 and P-gp, multiplying tacrolimus and cyclosporine exposure by 2- to 5-fold or more. High CNI troughs cause acute nephrotoxicity, neurotoxicity, and tremors. Preemptive dose reductions and close therapeutic drug monitoring (troughs) are mandatory in transplant protocols.",
        "CNI trough levels, serum creatinine, urine output, tremors, QTc. This desk does not pick the empirical dose reduction.",
        "Prograf, Neoral, Vfend, Noxafil, and Diflucan Prescribing Information. KDIGO Transplant Guidelines.",
      ),
    );
  }
  const set = new Set(ids);
  const linezolidOn = set.has("linezolid");
  const sero = ids.filter((id) => {
    const d = DRUG_BY_ID[id];
    return d && (d.pd.includes("serotonergic") || d.pd.includes("ssri-snri") || d.pd.includes("maoi")) && id !== "linezolid";
  });
  if (linezolidOn && sero.length) {
    out.push(
      hit(
        "linezolid-sero",
        "linezolid",
        sero[0],
        names("linezolid", sero[0]),
        "contraindicated",
        "danger",
        "linezolid MAOI × serotonergic",
        "Linezolid is a reversible nonselective MAOI. Next to an SSRI, SNRI, or another serotonergic it is the labeled serotonin-toxicity row — not a free MRSA pill.",
        "Hunter screen. This desk is not a washout clock for the antidepressant.",
        "Zyvox label. MAOI contraindication.",
      ),
    );
  }
  const glpOn = ids.filter((id) => GLP.has(id));
  const insulinOn = ids.filter(isInsulinId);
  if (glpOn.length && insulinOn.length) {
    out.push(
      hit(
        "glp-insulin",
        glpOn[0],
        insulinOn[0],
        names(glpOn[0], insulinOn[0]),
        "moderate",
        "warn",
        "GLP-1 / GIP agonist × insulin",
        "GLP-1 agonists rarely cause hypoglycemia alone. Next to insulin they do. Recheck home glucose. Metformin on this desk should stay quieter. Not a CYP row.",
        "Glucose. This desk does not cut the insulin.",
        "Semaglutide / tirzepatide / insulin labels.",
      ),
    );
  }
  return out;
}

export function wardWanted(ids: string[]) {
  return wardsOnDesk(ids).length > 0;
}
