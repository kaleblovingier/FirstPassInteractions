/**
 * Named labeled collisions the generic PD map misses or mis-names.
 * Teaching — not a protocol, not a milligram. The Prescribing Information governs.
 */

import { DRUG_BY_ID } from "./catalog";
import { ACEI, ARNI, CARBAPENEMS, VALPROATES, isArniAcei } from "./wards";
import type { Severity } from "./types";

export const SOFOSBUVIR = new Set([
  "epclusa",
  "sofosbuvir",
  "ledipasvir-sofosbuvir",
  "sofosbuvir-velpatasvir",
  "sofosbuvir-velpatasvir-voxilaprevir",
  "sofosbuvir-ledipasvir",
]);

export const ASA_ATTENUATOR = new Set(["ibuprofen", "naproxen"]);

export const STRONG_2D6 = new Set([
  "paroxetine",
  "fluoxetine",
  "bupropion",
  "quinidine",
  "terbinafine",
]);

export const OCP_INDUCER = new Set([
  "rifampin",
  "carbamazepine",
  "phenytoin",
  "phenobarbital",
  "primidone",
  "st-johns-wort",
  "oxcarbazepine",
  "topiramate",
]);

export const TETRACYCLINE = new Set(["doxycycline", "tetracycline", "minocycline"]);

export const FLUOROQUINOLONE = new Set([
  "ciprofloxacin",
  "levofloxacin",
  "moxifloxacin",
  "ofloxacin",
  "delafloxacin",
  "gemifloxacin",
  "norfloxacin",
  "gatifloxacin",
]);

export const SYSTEMIC_STEROID = new Set([
  "prednisone",
  "prednisolone",
  "dexamethasone",
  "methylprednisolone",
  "hydrocortisone",
  "betamethasone",
  "triamcinolone",
  "cortisone",
]);

export const ARB = new Set([
  "losartan",
  "valsartan",
  "candesartan",
  "irbesartan",
  "olmesartan",
  "telmisartan",
  "azilsartan",
  "eprosartan",
  "losartan-hctz",
  "valsartan-hctz",
  "olmesartan-amlodipine",
]);

export const PPI = new Set([
  "omeprazole",
  "esomeprazole",
  "lansoprazole",
  "pantoprazole",
  "rabeprazole",
  "dexlansoprazole",
  "omeprazole-sodium-bicarbonate",
]);

export const CLOPIDOGREL_PPI = new Set(["omeprazole", "esomeprazole", "omeprazole-sodium-bicarbonate"]);

export const ACID_DEPENDENT = new Set([
  "ketoconazole",
  "itraconazole",
  "atazanavir",
  "rilpivirine",
  "ledipasvir-sofosbuvir",
  "sofosbuvir-ledipasvir",
  "epclusa",
  "sofosbuvir-velpatasvir",
  "posaconazole",
]);

export const SGLT2 = new Set([
  "empagliflozin",
  "dapagliflozin",
  "canagliflozin",
  "ertugliflozin",
  "bexagliflozin",
  "dapagliflozin-metformin",
  "empagliflozin-linagliptin",
  "empagliflozin-metformin",
]);

export const LOOP = new Set(["furosemide", "bumetanide", "torsemide", "ethacrynic-acid"]);

export type SafetyKind =
  | "sofosbuvir-amio"
  | "clozapine-benzo"
  | "asa-nsaid"
  | "lamotrigine-vpa"
  | "lamotrigine-ee"
  | "tamoxifen-2d6"
  | "ocp-inducer"
  | "isotretinoin-tetra"
  | "fq-steroid"
  | "dual-raas"
  | "ppi-acid"
  | "clopidogrel-ppi"
  | "sglt2-loop"
  | "pde5-nitrate"
  | "xo-thiopurine"
  | "mtx-tmpsmx"
  | "colchicine-inhibitor"
  | "statin-strong-3a4"
  | "warfarin-cyp2c9"
  | "mtx-nsaid"
  | "maoi-serotonergic"
  | "lithium-renal-clearance"
  | "digoxin-pgp"
  | "doac-inducer"
  | "theophylline-cyp1a2"
  | "opioid-benzo"
  | "qt-hypokalemic-diuretic"
  | "tizanidine-cyp1a2"
  | "cni-strong-3a4"
  | "valproate-carbapenem"
  | "hyperkalemia-raas-k"
  | "ergot-strong-3a4"
  | "maoi-tyramine-sympathomimetic"
  | "amiodarone-warfarin"
  | "isoniazid-acetaminophen";

export interface SafetyHit {
  id: SafetyKind;
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
  kind: SafetyKind,
  a: string,
  b: string,
  title: string,
  severity: Severity,
  tone: "danger" | "warn",
  mechanism: string,
  clinical: string,
  watch: string,
  source: string,
): SafetyHit {
  return { id: kind, drugIds: [a, b], title, severity, tone, mechanism, clinical, watch, source };
}

function names(a: string, b: string) {
  return `${DRUG_BY_ID[a]?.name ?? a} × ${DRUG_BY_ID[b]?.name ?? b}`;
}

function clsOf(id: string) {
  return DRUG_BY_ID[id]?.cls ?? "";
}

function pair(ids: string[], left: (id: string) => boolean, right: (id: string) => boolean): [string, string] | null {
  for (const a of ids) {
    if (!left(a)) continue;
    for (const b of ids) {
      if (a === b) continue;
      if (right(b)) return [a, b];
    }
  }
  return null;
}

function firstDual(ids: string[]): [string, string] | null {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (isDualRaas(ids[i], ids[j])) return [ids[i], ids[j]];
    }
  }
  return null;
}

export function isSofosbuvir(id: string) {
  return SOFOSBUVIR.has(id) || id.includes("sofosbuvir");
}

export function isSofosbuvirAmio(a: string, b: string) {
  const amio = a === "amiodarone" || b === "amiodarone";
  return amio && (isSofosbuvir(a) || isSofosbuvir(b));
}

export function isBenzo(id: string) {
  return /Benzodiazepine/i.test(clsOf(id));
}

export function isClozapineBenzo(a: string, b: string) {
  return (a === "clozapine" && isBenzo(b)) || (b === "clozapine" && isBenzo(a));
}

export function isAsaNsaid(a: string, b: string) {
  const asa = a === "aspirin" || b === "aspirin";
  return asa && (ASA_ATTENUATOR.has(a) || ASA_ATTENUATOR.has(b));
}

export function isLamotrigineValproate(a: string, b: string) {
  return (a === "lamotrigine" && b === "valproate") || (b === "lamotrigine" && a === "valproate");
}

export function isLamotrigineEe(a: string, b: string) {
  return (
    (a === "lamotrigine" && b === "ethinyl-estradiol") ||
    (b === "lamotrigine" && a === "ethinyl-estradiol")
  );
}

export function isTamoxifen2d6(a: string, b: string) {
  return (
    (a === "tamoxifen" && STRONG_2D6.has(b)) || (b === "tamoxifen" && STRONG_2D6.has(a))
  );
}

export function isOcp(id: string) {
  return id === "ethinyl-estradiol" || /contraceptive|estrogen contraceptive/i.test(clsOf(id));
}

export function isOcpInducer(a: string, b: string) {
  return (isOcp(a) && OCP_INDUCER.has(b)) || (isOcp(b) && OCP_INDUCER.has(a));
}

export function isTetra(id: string) {
  return TETRACYCLINE.has(id) || /Tetracycline/i.test(clsOf(id));
}

export function isIsotretinoinTetra(a: string, b: string) {
  const iso = a === "isotretinoin" || b === "isotretinoin";
  return iso && (isTetra(a) || isTetra(b));
}

export function isFq(id: string) {
  return FLUOROQUINOLONE.has(id) || /Fluoroquinolone/i.test(clsOf(id));
}

export function isSystemicSteroid(id: string) {
  return SYSTEMIC_STEROID.has(id);
}

export function isFqSteroid(a: string, b: string) {
  return (isFq(a) && isSystemicSteroid(b)) || (isFq(b) && isSystemicSteroid(a));
}

export function isAcei(id: string) {
  return ACEI.has(id) || /ACE inhibitor/i.test(clsOf(id));
}

export function isArb(id: string) {
  if (ARNI.has(id) || /ARNI/i.test(clsOf(id))) return false;
  return ARB.has(id) || /(^|\/|\s)ARB(\s|$)/i.test(clsOf(id));
}

export function isDualRaas(a: string, b: string) {
  if (isArniAcei(a, b)) return false;
  const aceA = isAcei(a);
  const aceB = isAcei(b);
  const arbA = isArb(a);
  const arbB = isArb(b);
  const aliA = a === "aliskiren";
  const aliB = b === "aliskiren";
  const arniA = ARNI.has(a);
  const arniB = ARNI.has(b);
  if ((aceA && arbB) || (aceB && arbA)) return true;
  if ((aceA || arbA || arniA) && aliB) return true;
  if ((aceB || arbB || arniB) && aliA) return true;
  if ((arniA && arbB) || (arniB && arbA)) return true;
  return false;
}

export function isPpi(id: string) {
  return PPI.has(id) || /\bPPI\b/i.test(clsOf(id));
}

export function isAcidDependent(id: string) {
  return ACID_DEPENDENT.has(id);
}

export function isPpiAcid(a: string, b: string) {
  return (isPpi(a) && isAcidDependent(b)) || (isPpi(b) && isAcidDependent(a));
}

export function isClopidogrelPpi(a: string, b: string) {
  return (
    (a === "clopidogrel" && CLOPIDOGREL_PPI.has(b)) ||
    (b === "clopidogrel" && CLOPIDOGREL_PPI.has(a))
  );
}

export function isSglt2(id: string) {
  return SGLT2.has(id) || /SGLT2/i.test(clsOf(id));
}

export function isLoop(id: string) {
  return LOOP.has(id) || /Loop diuretic/i.test(clsOf(id));
}

export function isSglt2Loop(a: string, b: string) {
  return (isSglt2(a) && isLoop(b)) || (isSglt2(b) && isLoop(a));
}

export const PDE5_INHIBITORS = new Set([
  "sildenafil",
  "tadalafil",
  "vardenafil",
  "avanafil",
  "sildenafil-pah",
  "finasteride-tadalafil",
]);

export const NITRATES = new Set([
  "nitroglycerin",
  "isosorbide-mononitrate",
  "isosorbide-dinitrate",
  "riociguat",
]);

export const XO_INHIBITORS = new Set(["allopurinol", "febuxostat", "allopurinol-tls"]);
export const THIOPURINES = new Set(["azathioprine", "mercaptopurine"]);

export function isPde5(id: string) {
  return PDE5_INHIBITORS.has(id) || /PDE5/i.test(clsOf(id));
}

export function isNitrate(id: string) {
  return NITRATES.has(id) || /Nitrate|sGC stimulator/i.test(clsOf(id));
}

export function isPde5Nitrate(a: string, b: string) {
  return (isPde5(a) && isNitrate(b)) || (isPde5(b) && isNitrate(a));
}

export function isXoInhibitor(id: string) {
  return XO_INHIBITORS.has(id) || /Xanthine oxidase/i.test(clsOf(id));
}

export function isThiopurine(id: string) {
  return THIOPURINES.has(id) || /Thiopurine/i.test(clsOf(id));
}

export function isXoThiopurine(a: string, b: string) {
  return (isXoInhibitor(a) && isThiopurine(b)) || (isXoInhibitor(b) && isThiopurine(a));
}

export function isMtxTmpsmx(a: string, b: string) {
  return (a === "methotrexate" && b === "tmp-smx") || (b === "methotrexate" && a === "tmp-smx");
}

export const COLCHICINE_INHIBITORS = new Set([
  "clarithromycin",
  "ketoconazole",
  "itraconazole",
  "posaconazole",
  "voriconazole",
  "ritonavir",
  "cobicistat",
  "paxlovid",
  "cyclosporine",
]);

export const STATIN_3A4_VICTIMS = new Set([
  "simvastatin",
  "lovastatin",
  "red-yeast-rice",
]);

export const STATIN_STRONG_3A4_PERPETRATORS = new Set([
  "clarithromycin",
  "erythromycin",
  "telithromycin",
  "ketoconazole",
  "itraconazole",
  "posaconazole",
  "voriconazole",
  "ritonavir",
  "cobicistat",
  "paxlovid",
  "gemfibrozil",
  "cyclosporine",
  "nefazodone",
]);

export function isColchicineInhibitor(a: string, b: string) {
  return (
    (a === "colchicine" && COLCHICINE_INHIBITORS.has(b)) ||
    (b === "colchicine" && COLCHICINE_INHIBITORS.has(a))
  );
}

export function isStatinStrong3a4(a: string, b: string) {
  return (
    (STATIN_3A4_VICTIMS.has(a) && STATIN_STRONG_3A4_PERPETRATORS.has(b)) ||
    (STATIN_3A4_VICTIMS.has(b) && STATIN_STRONG_3A4_PERPETRATORS.has(a))
  );
}

export const WARFARIN_CYP2C9_INHIBITORS = new Set([
  "tmp-smx",
  "metronidazole",
]);

export const SYSTEMIC_NSAIDS = new Set([
  "ibuprofen",
  "naproxen",
  "indomethacin",
  "meloxicam",
  "celecoxib",
  "ketorolac",
  "diclofenac",
  "piroxicam",
  "sulindac",
  "etodolac",
  "nabumetone",
  "flurbiprofen",
  "ketoprofen",
  "oxaprozin",
]);

export const MAOI_DRUGS = new Set([
  "phenelzine",
  "tranylcypromine",
  "isocarboxazid",
  "linezolid",
  "methylene-blue",
  "selegiline",
  "rasagiline",
  "safinamide",
  "moclobemide",
]);

export const SEROTONIN_REUPTAKE_DRUGS = new Set([
  "fluoxetine",
  "sertraline",
  "paroxetine",
  "citalopram",
  "escitalopram",
  "fluvoxamine",
  "venlafaxine",
  "duloxetine",
  "desvenlafaxine",
  "milnacipran",
  "levomilnacipran",
  "vilazodone",
  "vortioxetine",
  "amitriptyline",
  "nortriptyline",
  "imipramine",
  "clomipramine",
  "doxepin",
  "desipramine",
  "dextromethorphan",
  "tramadol",
  "tapentadol",
  "meperidine",
  "methadone",
  "mdma",
]);

export function isWarfarinCyp2c9(a: string, b: string) {
  return (
    (a === "warfarin" && WARFARIN_CYP2C9_INHIBITORS.has(b)) ||
    (b === "warfarin" && WARFARIN_CYP2C9_INHIBITORS.has(a))
  );
}

export function isSystemicNsaid(id: string) {
  return SYSTEMIC_NSAIDS.has(id) || (/(^|\s|\/)NSAID(\s|\/|$)/i.test(clsOf(id)) && id !== "aspirin");
}

export function isMtxNsaid(a: string, b: string) {
  return (
    (a === "methotrexate" && isSystemicNsaid(b)) ||
    (b === "methotrexate" && isSystemicNsaid(a))
  );
}

export function isMaoiDrug(id: string) {
  return MAOI_DRUGS.has(id) || Boolean(DRUG_BY_ID[id]?.pd.includes("maoi"));
}

export function isSerotonergicDrug(id: string) {
  if (isMaoiDrug(id)) return false;
  const d = DRUG_BY_ID[id];
  if (!d) return false;
  return (
    SEROTONIN_REUPTAKE_DRUGS.has(id) ||
    d.pd.includes("ssri-snri") ||
    d.pd.includes("serotonergic")
  );
}

export function isMaoiSerotonergic(a: string, b: string) {
  return (
    (isMaoiDrug(a) && isSerotonergicDrug(b)) ||
    (isMaoiDrug(b) && isSerotonergicDrug(a))
  );
}

export const THIAZIDE_DIURETICS = new Set([
  "hctz",
  "hydrochlorothiazide",
  "chlorthalidone",
  "indapamide",
  "metolazone",
  "chlorothiazide",
  "bendroflumethiazide",
  "hydrochlorothiazide-triamterene",
  "losartan-hctz",
  "valsartan-hctz",
]);

export function isThiazide(id: string) {
  return (
    THIAZIDE_DIURETICS.has(id) ||
    /thiazide|chlorthalidone|indapamide|metolazone/i.test(id) ||
    /thiazide/i.test(clsOf(id))
  );
}

export function isLithiumClearanceInteracting(id: string) {
  return isThiazide(id) || isSystemicNsaid(id) || isAcei(id) || isArb(id);
}

export function isLithiumRenalClearance(a: string, b: string) {
  return (
    (a === "lithium" && isLithiumClearanceInteracting(b)) ||
    (b === "lithium" && isLithiumClearanceInteracting(a))
  );
}

export const DIGOXIN_PGP_PERPETRATORS = new Set([
  "amiodarone",
  "verapamil",
  "clarithromycin",
  "erythromycin",
  "quinidine",
  "quinidine-gluconate",
  "itraconazole",
  "dronedarone",
]);

export function isDigoxinPgp(a: string, b: string) {
  return (
    (a === "digoxin" && DIGOXIN_PGP_PERPETRATORS.has(b)) ||
    (b === "digoxin" && DIGOXIN_PGP_PERPETRATORS.has(a))
  );
}

export const DOAC_DRUGS = new Set([
  "apixaban",
  "rivaroxaban",
  "dabigatran",
  "edoxaban",
]);

export const DOAC_INDUCERS = new Set([
  "rifampin",
  "carbamazepine",
  "carbamazepine-xr",
  "carbamazepine-equetro",
  "phenytoin",
  "fosphenytoin",
  "phenytoin-fosphenytoin",
  "phenobarbital",
  "primidone",
  "st-johns-wort",
]);

export function isDoac(id: string) {
  return DOAC_DRUGS.has(id) || /Direct oral anticoagulant|Direct thrombin inhibitor/i.test(clsOf(id));
}

export function isDoacInducer(a: string, b: string) {
  const inducer = (id: string) => DOAC_INDUCERS.has(id) || OCP_INDUCER.has(id);
  return (
    (isDoac(a) && inducer(b)) ||
    (isDoac(b) && inducer(a))
  );
}

export const THEOPHYLLINE_CYP1A2_INHIBITORS = new Set([
  "ciprofloxacin",
  "fluvoxamine",
]);

export function isTheophyllineCyp1a2(a: string, b: string) {
  return (
    (a === "theophylline" && THEOPHYLLINE_CYP1A2_INHIBITORS.has(b)) ||
    (b === "theophylline" && THEOPHYLLINE_CYP1A2_INHIBITORS.has(a))
  );
}

export function isOpioid(id: string) {
  if (id === "loperamide") return false;
  const d = DRUG_BY_ID[id];
  if (!d) return false;
  if (d.pd.includes("opioid-antagonist") || /antagonist/i.test(d.cls)) return false;
  return d.pd.includes("opioid") || /(^|\s|\/)Opioid(\s|\/|$)/i.test(d.cls);
}

export function isOpioidBenzo(a: string, b: string) {
  return (
    (isOpioid(a) && isBenzo(b)) ||
    (isOpioid(b) && isBenzo(a))
  );
}

export const HIGH_RISK_QT_DRUGS = new Set([
  "sotalol",
  "dofetilide",
  "amiodarone",
  "ibutilide",
  "haloperidol",
  "quinidine",
  "quinidine-gluconate",
  "procainamide",
  "disopyramide",
  "dronedarone",
  "methadone",
  "thioridazine",
  "pimozide",
]);

export function isHighRiskQt(id: string) {
  if (HIGH_RISK_QT_DRUGS.has(id)) return true;
  const d = DRUG_BY_ID[id];
  if (!d) return false;
  return /antiarrhythmic class (i[ac]|iii)/i.test(d.cls);
}

export function isKwastingDiuretic(id: string) {
  return isLoop(id) || isThiazide(id);
}

export function isQtHypokalemicDiuretic(a: string, b: string) {
  return (
    (isHighRiskQt(a) && isKwastingDiuretic(b)) ||
    (isHighRiskQt(b) && isKwastingDiuretic(a))
  );
}

export const STRONG_CYP1A2_INHIBITORS = THEOPHYLLINE_CYP1A2_INHIBITORS;

export function isTizanidineCyp1a2(a: string, b: string) {
  return (
    (a === "tizanidine" && STRONG_CYP1A2_INHIBITORS.has(b)) ||
    (b === "tizanidine" && STRONG_CYP1A2_INHIBITORS.has(a))
  );
}

export const CNI_MTOR_SUBSTRATES = new Set([
  "tacrolimus",
  "tacrolimus-xr",
  "cyclosporine",
  "cyclosporine-modified",
  "cyclosporine-non-modified",
  "sirolimus",
  "everolimus",
  "temsirolimus",
  "voclosporin",
]);

export const CNI_STRONG_3A4_INHIBITORS = new Set([
  "paxlovid",
  "ritonavir",
  "cobicistat",
  "darunavir-cobicistat",
  "darunavir-cobicistat-ftc-taf",
  "elvitegravir-cobicistat-ftc-taf",
  "elvitegravir-cobicistat-ftc-tdf",
  "atazanavir-cobicistat",
  "voriconazole",
  "itraconazole",
  "posaconazole",
  "ketoconazole",
  "clarithromycin",
  "nefazodone",
  "telithromycin",
  "idelalisib",
  "ceritinib",
  "mifepristone",
]);

export function isCniMtorSubstrate(id: string) {
  return CNI_MTOR_SUBSTRATES.has(id);
}

export function isCniStrong3a4(a: string, b: string) {
  return (
    (isCniMtorSubstrate(a) && CNI_STRONG_3A4_INHIBITORS.has(b)) ||
    (isCniMtorSubstrate(b) && CNI_STRONG_3A4_INHIBITORS.has(a))
  );
}

export const VALPROATE_AGENTS = new Set([
  "valproate",
  "valproate-sprinkle",
  "divalproex",
  "valproate-iv",
]);

export function isValproateAgent(id: string) {
  return VALPROATE_AGENTS.has(id) || VALPROATES.has(id);
}

export function isValproateCarbapenem(a: string, b: string) {
  return (
    (isValproateAgent(a) && CARBAPENEMS.has(b)) ||
    (isValproateAgent(b) && CARBAPENEMS.has(a))
  );
}

export const K_RETAINING_AGENTS = new Set([
  "spironolactone",
  "spironolactone-hctz",
  "eplerenone",
  "finerenone",
  "amiloride",
  "triamterene",
  "hydrochlorothiazide-triamterene",
  "potassium-chloride",
  "potassium-chloride-iv",
  "potassium",
  "potassium-citrate",
  "potassium-phosphate",
]);

export const ENAC_SULFONAMIDES = new Set(["trimethoprim", "tmp-smx"]);

export function isKRetainingOrEnac(id: string) {
  return K_RETAINING_AGENTS.has(id) || ENAC_SULFONAMIDES.has(id);
}

export function isRaasForHyperkalemia(id: string) {
  return isAcei(id) || isArb(id) || ARNI.has(id);
}

function isSameHyperkalemiaIngredient(a: string, b: string) {
  if (a === b) return true;
  const pairSet = new Set([a, b]);
  if (pairSet.has("spironolactone") && pairSet.has("spironolactone-hctz")) return true;
  if (pairSet.has("triamterene") && pairSet.has("hydrochlorothiazide-triamterene")) return true;
  if (pairSet.has("trimethoprim") && pairSet.has("tmp-smx")) return true;
  return false;
}

export function isHyperkalemiaRaasK(a: string, b: string) {
  if (isSameHyperkalemiaIngredient(a, b)) return false;
  const kA = isKRetainingOrEnac(a);
  const kB = isKRetainingOrEnac(b);
  const raasA = isRaasForHyperkalemia(a);
  const raasB = isRaasForHyperkalemia(b);
  if ((kA && raasB) || (kB && raasA)) return true;
  if (kA && kB) return true;
  return false;
}

function firstHyperkalemiaRaasK(ids: string[]): [string, string] | null {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (isHyperkalemiaRaasK(ids[i], ids[j])) return [ids[i], ids[j]];
    }
  }
  return null;
}

export const ERGOT_ALKALOIDS = new Set([
  "ergotamine",
  "dihydroergotamine",
  "methylergonovine",
]);

export const ERGOT_EXTRA_3A4_INHIBITORS = new Set([
  "erythromycin",
  "darunavir",
  "atazanavir",
  "lopinavir",
  "indinavir",
  "nelfinavir",
  "saquinavir",
  "tipranavir",
  "elvitegravir-and-ritonavir",
  "indinavir-and-ritonavir",
  "tipranavir-and-ritonavir",
  "paritaprevir-and-ritonavir-and-ombitasvir-and-or-dasabuvir",
  "troleandomycin",
  "levoketoconazole",
  "ensitrelvir",
  "tucatinib",
  "adagrasib",
  "relacorilant",
  "lonafarnib",
]);

export function isErgotAlkaloid(id: string) {
  return ERGOT_ALKALOIDS.has(id);
}

export function isErgotStrong3a4Inhibitor(id: string) {
  if (/-topical$|-eye$|-ophthalmic$/.test(id)) return false;
  if (CNI_STRONG_3A4_INHIBITORS.has(id) || ERGOT_EXTRA_3A4_INHIBITORS.has(id)) return true;
  const d = DRUG_BY_ID[id];
  if (!d) return false;
  return d.enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "inhibitor" && r.strength === "strong");
}

export function isErgotStrong3a4(a: string, b: string) {
  return (
    (isErgotAlkaloid(a) && isErgotStrong3a4Inhibitor(b)) ||
    (isErgotAlkaloid(b) && isErgotStrong3a4Inhibitor(a))
  );
}

export const MAOI_PRESSOR_TRIGGERS = new Set([
  "tyramine-foods",
  "pseudoephedrine",
  "phenylephrine",
  "phenylephrine-oral",
  "methylphenidate",
  "methylphenidate-oros",
  "methylphenidate-patch",
  "methylphenidate-chew",
  "dexmethylphenidate",
  "serdexmethylphenidate-dexmethylphenidate",
  "lisdexamfetamine",
  "amphetamine",
  "dextroamphetamine",
  "methamphetamine",
  "amphetamine-mixed-salts-xr",
  "amphetamine-mixed-salts-ir",
  "amphetamine-odt",
  "ephedrine",
  "ephedra",
  "dopamine",
  "droxidopa",
]);

export function isMaoiPressorTrigger(id: string) {
  // Keep serotonergic collisions isolated to maoi-serotonergic.
  if (isMaoiDrug(id) || isSerotonergicDrug(id)) return false;
  return MAOI_PRESSOR_TRIGGERS.has(id);
}

export function isMaoiTyramineSympathomimetic(a: string, b: string) {
  return (
    (isMaoiDrug(a) && isMaoiPressorTrigger(b)) ||
    (isMaoiDrug(b) && isMaoiPressorTrigger(a))
  );
}

export function isAmiodaroneWarfarin(a: string, b: string) {
  return (a === "amiodarone" && b === "warfarin") || (b === "amiodarone" && a === "warfarin");
}

export function isIsoniazidAcetaminophen(a: string, b: string) {
  return (a === "isoniazid" && b === "acetaminophen") || (b === "isoniazid" && a === "acetaminophen");
}

export function safetyOnDesk(ids: string[]): SafetyHit[] {
  const out: SafetyHit[] = [];

  const sa = pair(ids, isSofosbuvir, (id) => id === "amiodarone");
  if (sa) {
    out.push(
      hit(
        "sofosbuvir-amio",
        sa[0],
        sa[1],
        names(sa[0], sa[1]),
        "contraindicated",
        "danger",
        "sofosbuvir × amiodarone — symptomatic bradycardia",
        "Sofosbuvir-containing HCV regimens plus amiodarone are labeled for serious symptomatic bradycardia, including pacemaker-level events. Not additive nodal PD on this desk — Epclusa is not a beta-blocker. The row is boxed. Do not treat the DAA as a free add-on on an amiodarone MAR.",
        "Heart rate, syncope, pacemaker if the pair cannot be separated. This desk does not time the first sofosbuvir tablet.",
        "Harvoni / Epclusa / Sovaldi labels. FDA 2015 safety communication.",
      ),
    );
  }

  const cb = pair(ids, (id) => id === "clozapine", isBenzo);
  if (cb) {
    out.push(
      hit(
        "clozapine-benzo",
        cb[0],
        cb[1],
        names(cb[0], cb[1]),
        "contraindicated",
        "danger",
        "clozapine × benzodiazepine — respiratory collapse",
        "Clozapine labels warn of respiratory arrest and collapse with benzodiazepines, including deaths. This is not generic stacked sedation. Z-hypnotics are a different GABA-A row. Do not treat Ativan as a free extra on a Clozaril MAR.",
        "Airway, orthostasis, constipation/ileus still apply. This desk is not a hold clock.",
        "Clozapine boxed warning / PI: concomitant benzodiazepines.",
      ),
    );
  }

  const ai = pair(ids, (id) => id === "aspirin", (id) => ASA_ATTENUATOR.has(id));
  if (ai) {
    out.push(
      hit(
        "asa-nsaid",
        ai[0],
        ai[1],
        names(ai[0], ai[1]),
        "major",
        "warn",
        "ibuprofen / naproxen attenuates aspirin antiplatelet effect",
        "Ibuprofen occupies COX-1 and blocks aspirin's irreversible acetylation if it is taken around the ASA dose. This is lost cardioprotection, not 'two NSAIDs.' Naproxen is quieter and still mapped. Acetaminophen does not do this. GI bleed remains a separate row.",
        "If both are required, aspirin first, ibuprofen later — open the PI. This desk does not time the tablets.",
        "Aspirin and ibuprofen labels. Catella-Lawson 2001 (PMID 11752357).",
      ),
    );
  }

  const lv = pair(ids, (id) => id === "lamotrigine", (id) => id === "valproate");
  if (lv) {
    out.push(
      hit(
        "lamotrigine-vpa",
        lv[0],
        lv[1],
        names(lv[0], lv[1]),
        "major",
        "danger",
        "valproate × lamotrigine — UGT blockade / SJS",
        "Valproate inhibits UGT and roughly doubles lamotrigine. The starter kit is slower for a reason — rash and SJS/TEN, not stacked GABA. This is not a CYP isoform on this desk. Do not 'just start Lamictal 25.'",
        "Rash, any mucosal involvement. Labeled starter kits exist. This desk does not pick the milligram.",
        "Lamictal PI. Yuen 1992 (PMID 1524964).",
      ),
    );
  }

  const le = pair(ids, (id) => id === "lamotrigine", (id) => id === "ethinyl-estradiol");
  if (le) {
    out.push(
      hit(
        "lamotrigine-ee",
        le[0],
        le[1],
        names(le[0], le[1]),
        "major",
        "warn",
        "ethinyl estradiol induces UGT — lamotrigine falls",
        "Combined OCPs induce UGT1A4 and cut lamotrigine roughly in half. Stopping the pill can spike parent and rash. Not CYP3A4 on this map — EE is a 3A4 substrate, lamotrigine is not. A rifampin row on the OCP is a different collision.",
        "Levels, seizure, rash if the OCP stops. This desk does not pick a lamotrigine milligram.",
        "Lamictal PI. Sidhu 2006 (PMID 16433873).",
      ),
    );
  }

  const t2 = pair(ids, (id) => id === "tamoxifen", (id) => STRONG_2D6.has(id));
  if (t2) {
    out.push(
      hit(
        "tamoxifen-2d6",
        t2[0],
        t2[1],
        names(t2[0], t2[1]),
        "major",
        "danger",
        "strong CYP2D6 inhibitor × tamoxifen — lost endoxifen",
        "Tamoxifen is a 2D6 activation substrate. Paroxetine, fluoxetine, bupropion, quinidine, and terbinafine block the step to endoxifen. The CYP map already fires; this row names the oncology call — switch the SSRI (sertraline, citalopram, or venlafaxine are the usual teaching swaps), do not 'give more tamoxifen.'",
        "Hot flashes are not the efficacy readout. CPIC / the PI, not this desk, pick the antidepressant.",
        "Soltamox PI. CPIC CYP2D6–tamoxifen (PMID 29385237). Goetz 2005 (PMID 16361630).",
      ),
    );
  }

  const oi = pair(ids, isOcp, (id) => OCP_INDUCER.has(id));
  if (oi) {
    out.push(
      hit(
        "ocp-inducer",
        oi[0],
        oi[1],
        names(oi[0], oi[1]),
        "major",
        "danger",
        "strong inducer × ethinyl estradiol — contraceptive failure",
        "Rifampin, carbamazepine, phenytoin, phenobarbital, primidone, and St John's wort dump 3A4/UGT estrogen exposure. The CYP map already fires induction; this row names the counseling — backup or a non-CYP method, not a quieter pill. Oxcarbazepine and topiramate are labeled at higher doses. A lamotrigine row on the same OCP is UGT, the other direction.",
        "Backup contraception. This desk does not pick a method.",
        "Combined oral contraceptive and rifampin / enzyme-inducer labels. Niemi 2003 (PMID 12882588).",
      ),
    );
  }

  const it = pair(ids, (id) => id === "isotretinoin", isTetra);
  if (it) {
    out.push(
      hit(
        "isotretinoin-tetra",
        it[0],
        it[1],
        names(it[0], it[1]),
        "contraindicated",
        "danger",
        "isotretinoin × tetracycline — pseudotumor cerebri",
        "Systemic retinoids plus tetracyclines (doxycycline, minocycline, tetracycline) are labeled for intracranial hypertension. Not a CYP row and not iPLEDGE itself. Pick a different antibiotic or hold the retinoid — this desk does not.",
        "Headache, visual change, papilledema. iPLEDGE still applies. Open the PI.",
        "Isotretinoin (iPLEDGE) and tetracycline class labels.",
      ),
    );
  }

  const fs = pair(ids, isFq, isSystemicSteroid);
  if (fs) {
    out.push(
      hit(
        "fq-steroid",
        fs[0],
        fs[1],
        names(fs[0], fs[1]),
        "major",
        "danger",
        "fluoroquinolone × systemic corticosteroid — tendon",
        "Fluoroquinolone boxed warning: tendinitis and tendon rupture, risk higher with concomitant corticosteroids, age, and transplant. Prednisone is empty PD on this desk on purpose — the pair is this row, not stacked GABA and not a CYP fold. Inhaled / topical steroids are a quieter map.",
        "Achilles, shoulder, hand. Stop the FQ at the first tendon pain. This desk does not pick the replacement antibiotic.",
        "Cipro / Levaquin / Avelox boxed warning. FDA 2008 / 2016 safety communications.",
      ),
    );
  }

  const dr = firstDual(ids);
  if (dr) {
    const ali = dr[0] === "aliskiren" || dr[1] === "aliskiren";
    out.push(
      hit(
        "dual-raas",
        dr[0],
        dr[1],
        names(dr[0], dr[1]),
        ali ? "contraindicated" : "major",
        "danger",
        ali ? "aliskiren × ACEI / ARB — dual RAAS" : "ACE inhibitor × ARB — dual RAAS blockade",
        ali
          ? "Aliskiren plus an ACE inhibitor or ARB is labeled contraindicated in diabetes and a no in CKD — hyperkalemia, hypotension, AKI. Not the Entresto 36-hour ACEI washout (that is a different row) and not a potassium footnote by itself."
          : "Dual ACEI + ARB (ONTARGET / VA NEPHRON-D) is more hyperkalemia, hypotension, and AKI without outcome gain in the labeled populations. Entresto already carries valsartan — a second ARB is extra blockade. Entresto plus an ACE inhibitor is the 36-hour angioedema row, already named.",
        "K, Cr, BP. This desk does not pick which agent stays.",
        ali
          ? "Tekturna boxed warning / contraindications."
          : "ONTARGET (PMID 18378520). ACEI and ARB labels. Entresto PI for the ARNI+ACEI cousin.",
      ),
    );
  }

  const pa = pair(ids, isPpi, isAcidDependent);
  if (pa) {
    const hiv = pa[0] === "atazanavir" || pa[1] === "atazanavir" || pa[0] === "rilpivirine" || pa[1] === "rilpivirine";
    out.push(
      hit(
        "ppi-acid",
        pa[0],
        pa[1],
        names(pa[0], pa[1]),
        hiv ? "contraindicated" : "major",
        "danger",
        "PPI raises gastric pH — acid-dependent absorption lost",
        hiv
          ? "Rilpivirine labels contraindicate PPIs. Unboosted atazanavir does too. This is gastric pH, not CYP3A4 — a weak 3A4-inhibitor arrow on omeprazole is the wrong direction. H2 blockers are a spaced-dose conversation, not a free swap without the PI."
          : "Ketoconazole, itraconazole capsules, ledipasvir, and velpatasvir need an acidic stomach. A PPI empties the exposure. Not a 2C19 row (that is clopidogrel) and not a 3A4 bully. Separate or switch — this desk does not pick which.",
        "Viral load, or the infection you thought the azole would treat. Open the PI.",
        "Reyataz / Edurant / Nizoral / Harvoni / Epclusa labels.",
      ),
    );
  }

  const cp = pair(ids, (id) => id === "clopidogrel", (id) => CLOPIDOGREL_PPI.has(id));
  if (cp) {
    out.push(
      hit(
        "clopidogrel-ppi",
        cp[0],
        cp[1],
        names(cp[0], cp[1]),
        "major",
        "warn",
        "omeprazole / esomeprazole blunts clopidogrel bioactivation",
        "Clopidogrel is an inactive prodrug requiring two-step hepatic CYP2C19 bioactivation into its active antiplatelet thiol metabolite. Omeprazole and esomeprazole competitively and mechanism-inhibit CYP2C19, cutting active thiol exposure by ~40–45% and significantly blunting platelet inhibition, which increases ischemic and stent thrombosis risks. The FDA Boxed Warning advises avoiding omeprazole/esomeprazole with clopidogrel. Acid-suppressive alternatives with low CYP2C19 liability (pantoprazole or H2-receptor antagonists except cimetidine) can be reviewed if gastroprotection is clinically indicated.",
        "Platelet responsiveness, recurrent ischemic symptoms, stent thrombosis surveillance. This desk does not pick the gastroprotective agent or dose.",
        "Plavix boxed warning / FDA Drug Safety Communication (2009/2010). CPIC CYP2C19–clopidogrel guideline (PMID 23698643, 35434823).",
      ),
    );
  }

  const sl = pair(ids, isSglt2, isLoop);
  if (sl) {
    out.push(
      hit(
        "sglt2-loop",
        sl[0],
        sl[1],
        names(sl[0], sl[1]),
        "moderate",
        "warn",
        "SGLT2 inhibitor × loop diuretic — volume / euglycemic DKA",
        "SGLT2 inhibitors dump glucose and water. Next to a loop they stack volume contraction. Sick-day ketones can be euglycemic — a normal fingerstick does not clear DKA. Not a CYP row and not stacked sulfonylurea hypo (that is a different flag). Hold teaching on sick days lives in the PI, not here.",
        "Orthostasis, Cr, ketones if unwell. This desk does not hold the SGLT2.",
        "Jardiance / Farxiga / Invokana labels. Loop diuretic PI.",
      ),
    );
  }

  const pn = pair(ids, isPde5, isNitrate);
  if (pn) {
    out.push(
      hit(
        "pde5-nitrate",
        pn[0],
        pn[1],
        names(pn[0], pn[1]),
        "contraindicated",
        "danger",
        "PDE5 inhibitor × nitrate / sGC stimulator — refractory hypotension",
        "PDE5 inhibitors prevent cGMP degradation, while organic nitrates (nitroglycerin, isosorbide) donate nitric oxide to stimulate cGMP synthesis and soluble guanylate cyclase (sGC) stimulators (riociguat) directly stimulate cGMP generation. Concomitant use causes profound, unregulated intracellular cGMP accumulation, provoking severe systemic vasodilation, refractory hypotension, coronary hypoperfusion, and cardiovascular collapse. Concomitant administration is an absolute labeled contraindication. Official prescribing information establishes labeled separation windows: at least 24 hours after sildenafil/vardenafil and at least 48 hours after tadalafil before nitrate therapy may be considered under close hemodynamic monitoring.",
        "Blood pressure, orthostasis, syncope, ischemic chest pain. This desk does not time the washout.",
        "Viagra, Cialis, Levitra, Nitrostat, Imdur, and Adempas Prescribing Information. ACC/AHA NSTE-ACS Guidelines (PMID 25249585).",
      ),
    );
  }

  const xt = pair(ids, isXoInhibitor, isThiopurine);
  if (xt) {
    out.push(
      hit(
        "xo-thiopurine",
        xt[0],
        xt[1],
        names(xt[0], xt[1]),
        "contraindicated",
        "danger",
        "xanthine oxidase inhibitor × thiopurine — fatal marrow aplasia",
        "Xanthine oxidase catabolizes 6-mercaptopurine into inactive 6-thiouric acid. Concomitant XO inhibition diverts metabolic flux into hypoxanthine-guanine phosphoribosyltransferase (HGPRT), creating a 4- to 5-fold surge in cytotoxic thioguanine nucleotides (6-TGN) that precipitate severe, potentially fatal bone marrow aplasia and pancytopenia. Febuxostat labeling lists thiopurines as contraindicated; allopurinol labeling mandates an immediate 66–75% reduction of the thiopurine dose with intensive hematologic monitoring.",
        "CBC with differential (absolute neutrophil count, platelets), signs of febrile infection, mucosal hemorrhage. This desk does not pick the thiopurine dose.",
        "Imuran (azathioprine), Purixan (mercaptopurine), Zyloprim (allopurinol), and Uloric (febuxostat) Prescribing Information. CPIC Guidelines for Thiopurines (PMID 30447069).",
      ),
    );
  }

  const mt = pair(ids, (id) => id === "methotrexate", (id) => id === "tmp-smx");
  if (mt) {
    out.push(
      hit(
        "mtx-tmpsmx",
        mt[0],
        mt[1],
        names(mt[0], mt[1]),
        "contraindicated",
        "danger",
        "methotrexate × TMP-SMX — tubular blockade / additive antifolate",
        "Trimethoprim competitively inhibits renal tubular secretion of methotrexate via OAT1/OAT3 and OCT2 transporters, while sulfamethoxazole displaces methotrexate from plasma albumin binding sites. Concurrently, both agents inhibit dihydrofolate reductase (DHFR), synergistically halting intracellular folate-dependent nucleotide synthesis. Even low-dose weekly methotrexate coadministered with standard-dose TMP-SMX has triggered fatal bone marrow aplasia, severe leukopenic sepsis, and toxic epidermal necrolysis. Prescribing information advises avoiding the combination.",
        "CBC with differential (neutrophil and platelet nadir), renal function panels, severe oral mucositis, or epidermal detachment. Leucovorin rescue protocols are directed by oncology/poison control.",
        "Methotrexate and Bactrim Prescribing Information. Groenendal 1990 (PMID 2225539). Thomas 2007 (PMID 17618956).",
      ),
    );
  }

  const ci = pair(ids, (id) => id === "colchicine", (id) => COLCHICINE_INHIBITORS.has(id));
  if (ci) {
    out.push(
      hit(
        "colchicine-inhibitor",
        ci[0],
        ci[1],
        names(ci[0], ci[1]),
        "contraindicated",
        "danger",
        "colchicine × strong CYP3A4 / P-gp inhibitor — fatal colchicine toxicity",
        "Colchicine relies on hepatic CYP3A4 metabolism and intestinal/renal/biliary P-glycoprotein efflux. Strong dual inhibitors (clarithromycin, ketoconazole, itraconazole, posaconazole, voriconazole, ritonavir, cobicistat, cyclosporine) multiply systemic colchicine exposure. In patients with renal or hepatic impairment, concomitant use is an absolute labeled contraindication due to life-threatening and fatal multi-organ toxicity reported at standard doses. In patients with normal organ function, labeling mandates substantial dose reductions or treatment interruption. Toxicity manifests as severe gastrointestinal distress, progressive ascending paralysis, profound rhabdomyolysis, acute kidney injury, arrhythmias, and fatal bone marrow aplasia.",
        "Early diarrhea/vomiting (herald sign of systemic toxicity), diffuse muscle pain/weakness, dark urine (myoglobinuria), CK, serum creatinine, electrolytes, CBC with differential (pancytopenia nadir days 3–7). This desk does not pick the dose reduction or substitute.",
        "Colcrys (colchicine) Prescribing Information. FDA Drug Safety Communications (2009, 2012). Hung 2005 (PMID 16007523). Terkeltaub 2010 (PMID 20131255).",
      ),
    );
  }

  const ss = pair(ids, (id) => STATIN_3A4_VICTIMS.has(id), (id) => STATIN_STRONG_3A4_PERPETRATORS.has(id));
  if (ss) {
    out.push(
      hit(
        "statin-strong-3a4",
        ss[0],
        ss[1],
        names(ss[0], ss[1]),
        "contraindicated",
        "danger",
        "simvastatin / lovastatin × strong CYP3A4 inhibitor — rhabdomyolysis / AKI",
        "Simvastatin, lovastatin, and monacolin K (red yeast rice) are lipophilic lactone prodrugs dependent on CYP3A4 for extensive first-pass hepatic extraction. Strong CYP3A4 inhibitors (clarithromycin, erythromycin, ketoconazole, itraconazole, posaconazole, voriconazole, ritonavir, cobicistat, Paxlovid) increase active statin acid AUC up to 5- to 20-fold. Gemfibrozil (OATP1B1/UGT inhibitor) and cyclosporine also multiply exposure. Concomitant use is an absolute labeled contraindication due to high risk of severe skeletal muscle myonecrosis (rhabdomyolysis), myoglobinuria, hyperkalemia, acute tubular necrosis, and fatal renal failure. Labeling recommends suspending the statin during short antimicrobial courses or switching to non-CYP3A4 statins (pravastatin, rosuvastatin) with dose caps.",
        "Unexplained proximal muscle pain, tenderness, or weakness; dark/brown tea-colored urine; creatine kinase (CK >10× ULN defines myopathy; >40× ULN with myoglobinuria indicates rhabdomyolysis); serum creatinine, BUN, potassium. This desk does not pick the statin alternative.",
        "Zocor (simvastatin) and Mevacor (lovastatin) Prescribing Information contraindications. FDA Drug Safety Communication (2011). Neuvonen 2008 (PMID 18596677). Wiggins 2016 AHA Statement (PMID 27754879).",
      ),
    );
  }

  const wm = pair(ids, (id) => id === "warfarin", (id) => WARFARIN_CYP2C9_INHIBITORS.has(id));
  if (wm) {
    out.push(
      hit(
        "warfarin-cyp2c9",
        wm[0],
        wm[1],
        names(wm[0], wm[1]),
        "major",
        "danger",
        "warfarin × TMP-SMX / metronidazole — CYP2C9 blockade / extreme INR surge",
        "Warfarin is administered as a racemic mixture where (S)-warfarin is roughly 3- to 5-fold more potent than (R)-warfarin at inhibiting VKORC1. Metabolism of (S)-warfarin depends almost entirely on hepatic CYP2C9. Sulfamethoxazole (in TMP-SMX) and metronidazole potently inhibit CYP2C9, severely impeding (S)-warfarin clearance and precipitating dramatic, unpredictable INR surges (>5.0 to >10.0) within 2 to 5 days. This interaction carries catastrophic risk of fatal gastrointestinal and intracranial hemorrhage. Prescribing information warns of marked PT/INR prolongation. Alternative non-interacting antimicrobials should be prioritized; if coadministration is unavoidable, empiric preemptive warfarin dose reduction (often 30–50%) and frequent INR monitoring (every 24–48 hours) are standard teaching.",
        "Serial INR (baseline, day 2–3, and post-antimicrobial completion), signs of overt or occult hemorrhage (hematuria, melena, hematemesis, epistaxis, severe headache or acute neurological changes), hemoglobin/hematocrit. This desk does not pick the warfarin dose reduction.",
        "Coumadin (warfarin), Bactrim (TMP-SMX), and Flagyl (metronidazole) Prescribing Information. O'Reilly 1979 (PMID 428735). Juurlink 2005 (PMID 15897539).",
      ),
    );
  }

  const mn = pair(ids, (id) => id === "methotrexate", isSystemicNsaid);
  if (mn) {
    out.push(
      hit(
        "mtx-nsaid",
        mn[0],
        mn[1],
        names(mn[0], mn[1]),
        "major",
        "danger",
        "methotrexate × systemic NSAID — OAT1/3 blockade / renal clearance failure",
        "Methotrexate is eliminated >80% renally via glomerular filtration and active tubular secretion mediated by basolateral organic anion transporters OAT1 and OAT3. Systemic NSAIDs (ibuprofen, naproxen, indomethacin, meloxicam, ketorolac, diclofenac, celecoxib) suppress renal prostaglandins (reducing GFR) and competitively inhibit OAT1/OAT3 tubular excretion, while displacing methotrexate from plasma albumin. Concomitant administration elevates and prolongs serum methotrexate concentrations. FDA labeling carries a Boxed Warning for severe, sometimes fatal bone marrow suppression, aplastic anemia, and gastrointestinal toxicity/enteritis with NSAIDs. While low-dose weekly methotrexate for rheumatoid arthritis is sometimes co-managed under rheumatology with stable chronic NSAIDs, introduction of high-dose NSAIDs or ketorolac can precipitate life-threatening myelosuppression and acute kidney injury.",
        "CBC with differential (absolute neutrophil count, thrombocytopenia nadir), serum creatinine, BUN, severe stomatitis/oral ulceration, diarrhea, fever. Leucovorin rescue protocols are governed by oncology/poison guidance. This desk does not pick the analgesic alternative.",
        "Methotrexate FDA Boxed Warning / Prescribing Information. Toradol, Indocin, and Celebrex labels. Tracey 1986 (PMID 3959871). Frenia 1992 (PMID 1625902).",
      ),
    );
  }

  const ms = pair(ids, isMaoiDrug, isSerotonergicDrug);
  if (ms) {
    out.push(
      hit(
        "maoi-serotonergic",
        ms[0],
        ms[1],
        names(ms[0], ms[1]),
        "contraindicated",
        "danger",
        "MAOI × serotonergic agent — life-threatening serotonin toxicity",
        "Monoamine oxidase inhibitors (phenelzine, tranylcypromine, isocarboxazid, linezolid, methylene blue) irreversibly or reversibly block the catabolism of serotonin (5-HT). Concomitant administration with serotonin reuptake inhibitors (SSRIs, SNRIs, TCAs), serotonergic analgesics (tramadol, tapentadol, meperidine, methadone), or dextromethorphan leads to massive, unregulated intrasynaptic serotonin accumulation and hyperstimulation of 5-HT1A and 5-HT2A receptors. This combination is an absolute labeled contraindication due to fulminant Serotonin Toxicity (Hunter criteria: spontaneous clonus, tremor, hyperreflexia, rigidity, autonomic instability, and malignant hyperthermia >40°C leading to rhabdomyolysis, DIC, multi-organ failure, and death). Labeling mandates a strict 14-day washout interval when switching between MAOIs and most serotonergic agents, and a mandatory 5-week (35-day) washout after fluoxetine before initiating an MAOI.",
        "Hunter Toxicity Criteria (spontaneous or ocular clonus, diaphoresis, agitation, tremor, hyperreflexia), core body temperature, muscular rigidity, blood pressure instability. Discontinue all serotonergic agents immediately; active cooling and cyproheptadine protocol under emergency/ICU care. This desk does not time the washout clock.",
        "Nardil, Parnate, Marplan, Zyvox, and ProvayBlue Prescribing Information contraindications. Boyer EW, Shannon M. The Serotonin Syndrome. N Engl J Med 2005 (PMID 15784664). Dunkley EJ et al. Hunter Serotonin Toxicity Criteria. QJM 2003 (PMID 12925720).",
      ),
    );
  }

  const lr = pair(ids, (id) => id === "lithium", isLithiumClearanceInteracting);
  if (lr) {
    out.push(
      hit(
        "lithium-renal-clearance",
        lr[0],
        lr[1],
        names(lr[0], lr[1]),
        "major",
        "danger",
        "lithium × thiazide / NSAID / ACEI / ARB — impaired renal clearance / neurotoxicity",
        "Lithium is a monovalent cation with a narrow therapeutic index (target trough 0.6–1.2 mEq/L; toxic >1.5 mEq/L, severe/life-threatening >2.0 mEq/L) cleared >95% renally with ~80% reabsorbed in the proximal tubule. (1) Thiazide diuretics (HCTZ, chlorthalidone, indapamide, metolazone) induce natriuresis, triggering compensatory proximal tubular hyper-reabsorption of sodium and lithium; this decreases lithium clearance by 25–40% and causes rapid toxic accumulation. (2) Systemic NSAIDs (ibuprofen, naproxen, indomethacin, meloxicam, celecoxib) inhibit renal vasodilatory prostaglandins, reducing GFR and blunting tubular lithium excretion (elevating serum lithium levels by 10–60%). (3) ACE inhibitors and ARBs decrease efferent arteriolar resistance, reducing intraglomerular pressure and GFR, leading to progressive, often delayed lithium retention. Concomitant therapy precipitates severe neurotoxicity: coarse tremor, ataxia, dysarthria, hyperreflexia, confusion, seizures, encephalopathy, and permanent cerebellar deficits (SILENT syndrome). Labeling advises preemptive lithium dose reductions (often 25–50% with thiazides) and frequent level monitoring.",
        "Serum lithium trough (12 hours post-dose; goal 0.6–1.0 mEq/L maintenance), serum creatinine, BUN, electrolytes (sodium, potassium), neurological signs (coarse tremor, ataxia, confusion). Discontinue lithium if toxic symptoms emerge; hemodialysis is indicated for levels >4.0 mEq/L (or >2.5 mEq/L with severe neurologic symptoms or renal failure). This desk does not adjust the dose.",
        "Lithobid (lithium carbonate) Prescribing Information. Finley PR. Clin Pharmacokinet 2016 (PMID 27129971). Juurlink DN et al. J Clin Psychopharmacol 2004 (PMID 15538128).",
      ),
    );
  }

  const dp = pair(ids, (id) => id === "digoxin", (id) => DIGOXIN_PGP_PERPETRATORS.has(id));
  if (dp) {
    out.push(
      hit(
        "digoxin-pgp",
        dp[0],
        dp[1],
        names(dp[0], dp[1]),
        "major",
        "danger",
        "digoxin × strong P-gp inhibitor / macrolide — P-gp efflux blockade / digitalis toxicity",
        "Digoxin is a cardiac glycoside with a narrow therapeutic index (0.5–0.9 ng/mL for heart failure; toxicity >2.0 ng/mL) eliminated 50–70% unchanged in urine via apical P-glycoprotein (P-gp/ABCB1) efflux in renal proximal tubules and enterocytes. (1) Potent P-gp inhibitors (amiodarone, verapamil, quinidine, dronedarone, itraconazole) block intestinal and renal P-gp efflux, doubling to tripling systemic digoxin exposure (amiodarone increases digoxin AUC by 70–100%; verapamil by 60–90%; quinidine by >100%). (2) Macrolides (clarithromycin, erythromycin) eradicate gut Eggerthella lenta (which metabolizes digoxin to inactive dihydrodigoxin in ~10% of patients) while inhibiting intestinal P-gp, triggering sudden surges in bioavailability. Digitalis toxicity produces lethal cardiac arrhythmias (bidirectional ventricular tachycardia, accelerated junctional rhythm, high-grade AV block, sinus arrest), exacerbated by hypokalemia and hypomagnesemia, along with GI distress and xanthopsia (yellow-green halos). Prescribing information mandates an empiric 30–50% digoxin dose reduction when initiating amiodarone, verapamil, or quinidine, with frequent level checks.",
        "Serum digoxin trough (draw ≥6–8 hours post-dose, ideally 12–24 hours; goal 0.5–0.9 ng/mL for HF), ECG (PR prolongation, ST scooping, bidirectional VT, heart block), potassium, magnesium, BUN/creatinine. Administer Digoxin Immune Fab (DigiFab) for life-threatening arrhythmias or severe hyperkalemia. This desk does not pick the dose reduction.",
        "Lanoxin (digoxin) Prescribing Information. Hager WD et al. N Engl J Med 1979 (PMID 449969). Lindenbaum J et al. N Engl J Med 1981 (PMID 7278972). Hinderling PH. J Clin Pharmacol 2009 (PMID 19661474).",
      ),
    );
  }

  const di = pair(ids, isDoac, (id) => DOAC_INDUCERS.has(id) || OCP_INDUCER.has(id));
  if (di) {
    out.push(
      hit(
        "doac-inducer",
        di[0],
        di[1],
        names(di[0], di[1]),
        "major",
        "danger",
        "DOAC × strong CYP3A4 / P-gp inducer — clearance surge / thromboembolic failure",
        "Direct oral anticoagulants (apixaban, rivaroxaban, dabigatran etexilate, edoxaban) are substrates of the intestinal/renal/hepatic efflux transporter P-glycoprotein (P-gp), and apixaban and rivaroxaban undergo significant hepatic CYP3A4 metabolism (~25% and ~36% clearance, respectively). Potent combined inducers of CYP3A4 and P-gp (rifampin, carbamazepine, phenytoin, phenobarbital, primidone, St. John's wort) profoundly accelerate DOAC metabolism and active efflux, slashing systemic DOAC exposure (AUC) by 50% to 70% (e.g., rifampin reduces dabigatran AUC by ~67%, rivaroxaban by ~50%, apixaban by ~54%). This causes severe subtherapeutic anticoagulation and catastrophic failure of thromboprophylaxis, with high risk of acute ischemic stroke, massive pulmonary embolism, and recurrent venous thromboembolism. FDA labeling for Eliquis, Xarelto, Pradaxa, and Savaysa carries an explicit recommendation to avoid concomitant use with strong dual inducers (or strong P-gp inducers for dabigatran/edoxaban). Alternative anticoagulation (e.g., enoxaparin or warfarin with INR titration) or non-inducing anticonvulsant/antimicrobial regimens should be evaluated.",
        "Surveillance for acute thrombosis (focal neurologic signs, acute dyspnea, pleuritic chest pain, asymmetric lower extremity swelling). DOAC drug levels or chromogenic anti-Xa assays (for apixaban/rivaroxaban/edoxaban) or dilute thrombin time (for dabigatran) where available. Concomitant use is labeled for avoidance. This desk does not pick the replacement anticoagulant.",
        "Eliquis, Xarelto, Pradaxa, and Savaysa Prescribing Information. Wiggins BS et al. AHA Scientific Statement: Drug-Drug Interactions with DOACs. Circulation 2020 (PMID 33170732). Huisman MV et al. Thromb Haemost 2017 (PMID 28722097).",
      ),
    );
  }

  const tc = pair(ids, (id) => id === "theophylline", (id) => THEOPHYLLINE_CYP1A2_INHIBITORS.has(id));
  if (tc) {
    out.push(
      hit(
        "theophylline-cyp1a2",
        tc[0],
        tc[1],
        names(tc[0], tc[1]),
        "contraindicated",
        "danger",
        "theophylline × strong CYP1A2 inhibitor — CYP1A2 blockade / fatal theophylline toxicity",
        "Theophylline has a narrow therapeutic index (target serum concentration 5–15 µg/mL; severe toxicity >20–25 µg/mL) with >85% of clearance mediated by hepatic CYP1A2. Strong CYP1A2 inhibitors (ciprofloxacin, fluvoxamine) profoundly impede theophylline metabolism, reducing systemic clearance by 50% to 70% and triggering 2- to 3-fold surges in theophylline levels. Theophylline toxicity produces severe intractable nausea/vomiting, tachydysrhythmias (multifocal atrial tachycardia, ventricular tachycardia, flutter/fibrillation), profound metabolic derangements (hypokalemia, hyperglycemia, metabolic acidosis), and refractory status epilepticus that is often unresponsive to standard anticonvulsants (benzodiazepines, phenytoin) and carries high mortality. Official prescribing information advises avoiding the combination; if co-administration is clinically unavoidable, immediate empiric theophylline dose reduction (typically 50% to 75%) and intensive therapeutic drug monitoring are required.",
        "Serum theophylline concentration (peak/trough; draw 12–24 hours post-initiation of inhibitor; toxic >20 µg/mL, life-threatening >30–40 µg/mL), continuous cardiac telemetry (tachyarrhythmias), serial electrolytes (potassium, magnesium, acid-base status), and neurological assessment for tremor or seizure activity. In severe acute/chronic toxicity or refractory seizures, hemodialysis or charcoal hemoperfusion is indicated. The Prescribing Information governs. This desk does not adjust doses, order naloxone, or select alternative agents.",
        "Theo-Dur / Elixophyllin (theophylline), Cipro (ciprofloxacin), and Luvox (fluvoxamine) Prescribing Information. Nix DE et al. Clin Pharmacol Ther 1992 (PMID 1526435). Brosen K et al. Br J Clin Pharmacol 1993 (PMID 8472545).",
      ),
    );
  }

  const ob = pair(ids, isOpioid, isBenzo);
  if (ob) {
    out.push(
      hit(
        "opioid-benzo",
        ob[0],
        ob[1],
        names(ob[0], ob[1]),
        "major",
        "danger",
        "opioid × benzodiazepine — synergistic respiratory depression / fatal overdose",
        "FDA Boxed Warning: Concomitant use of opioids with benzodiazepines or other central nervous system (CNS) depressants results in profound sedation, respiratory depression, coma, and death. Opioids act on mu-opioid receptors in the brainstem pre-Bötzinger complex to blunt hypercapnic and hypoxic ventilatory drive, while benzodiazepines enhance GABA-A-mediated inhibitory chloride currents across the central nervous system. Combined use produces synergistic respiratory failure, loss of airway patency, and fatal overdose. The CDC Clinical Practice Guideline (2022) advises avoiding concurrent prescribing whenever possible. When coadministration is clinically unavoidable (e.g., palliative care, severe treatment-resistant anxiety with intractable pain), clinicians must prescribe the lowest effective doses, minimize duration, and co-prescribe take-home naloxone.",
        "Respiratory rate (<10–12 breaths/min indicates severe depression), sedation score (e.g., Pasero Opioid-Induced Sedation Scale [POSS]), oxygen saturation (SpO2), pupillary size, and upper airway patency. Co-prescribe and instruct patient/caregiver on the use of naloxone nasal spray (Narcan). Titrate naloxone carefully in opioid-dependent patients to reverse respiratory depression without provoking acute severe withdrawal crisis. The Prescribing Information governs. This desk does not adjust doses, order naloxone, or select alternative agents.",
        "FDA Drug Safety Communication (2016) / Class-wide Opioid and Benzodiazepine Boxed Warnings. Dowell D et al. CDC Clinical Practice Guideline for Prescribing Opioids — United States, 2022. MMWR Recomm Rep 2022 (PMID 36327391). Sun EC et al. BMJ 2017 (PMID 28292769).",
      ),
    );
  }

  const qd = pair(ids, isHighRiskQt, isKwastingDiuretic);
  if (qd) {
    out.push(
      hit(
        "qt-hypokalemic-diuretic",
        qd[0],
        qd[1],
        names(qd[0], qd[1]),
        "major",
        "danger",
        "high-risk QT agent × K-wasting diuretic — hypokalemia multi-hit / Torsades de Pointes",
        "High-risk QT-prolonging agents (sotalol, dofetilide, amiodarone, ibutilide, quinidine, procainamide, haloperidol, methadone) block the cardiac rapid delayed rectifier potassium current (IKr), prolonging the ventricular action potential and QTc interval. Concomitant loop (furosemide, bumetanide, torsemide) or thiazide (HCTZ, chlorthalidone, metolazone) diuretics cause urinary potassium and magnesium wasting. Extracellular hypokalemia (K+ < 4.0 mEq/L) paradoxically intensifies IKr channel blockade and impairs repolarization reserve, triggering early afterdepolarizations (EADs) that provoke polymorphic ventricular tachycardia (Torsades de Pointes [TdP]) and sudden cardiac death. Official labeling for sotalol (Betapace) and dofetilide (Tikosyn) mandates maintaining serum potassium >= 4.0 mEq/L and magnesium >= 2.0 mg/dL throughout therapy.",
        "Serial 12-lead ECG (baseline and post-diuretic QTc; QTc >500 ms or delta QTc >60 ms warrants urgent evaluation), serum potassium (target >= 4.0 mEq/L), serum magnesium (target >= 2.0 mg/dL), BUN, serum creatinine. In acute Torsades de Pointes: discontinue offending agents, administer IV magnesium sulfate per protocol, correct hypokalemia, and initiate overdrive transvenous pacing or isoproterenol for pause-dependent TdP. The Prescribing Information governs. This desk does not adjust doses, order naloxone, or select alternative agents.",
        "Betapace (sotalol) Boxed Warning, Tikosyn (dofetilide) Boxed Warning, and Cordarone (amiodarone) Prescribing Information. Drew BJ et al. Prevention of Torsade de Pointes in Hospital Settings: A Scientific Statement From the AHA and ACC. Circulation 2010 (PMID 20142454). CredibleMeds Category 1: Known Risk of TdP.",
      ),
    );
  }

  const tz = pair(ids, (id) => id === "tizanidine", (id) => STRONG_CYP1A2_INHIBITORS.has(id));
  if (tz) {
    out.push(
      hit(
        "tizanidine-cyp1a2",
        tz[0],
        tz[1],
        names(tz[0], tz[1]),
        "contraindicated",
        "danger",
        "tizanidine × strong CYP1A2 inhibitor — first-pass blockade / profound hypotension & coma",
        "Tizanidine undergoes massive presystemic hepatic CYP1A2 extraction, leaving baseline oral bioavailability at only ~2–4%. Potent CYP1A2 inhibitors abolish this first-pass clearance, elevating tizanidine AUC ~10-fold with ciprofloxacin and ~33-fold (up to >100-fold) with fluvoxamine. Concomitant administration precipitates severe central alpha-2 adrenergic toxicity: profound hypotension, bradycardia, psychomotor impairment, extreme somnolence, respiratory depression, and coma. Co-administration of tizanidine with fluvoxamine or ciprofloxacin is an absolute labeled contraindication.",
        "Supine and standing blood pressure, heart rate, sedation depth, and respiratory/airway status. Do not co-administer; select an alternative muscle relaxant or non-CYP1A2-inhibiting antimicrobial/antidepressant. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Zanaflex (tizanidine), Cipro (ciprofloxacin), and Luvox (fluvoxamine) Prescribing Information contraindications. Granfors MT et al. Clin Pharmacol Ther 2004 (PMID 15060511; PMID 15592331).",
      ),
    );
  }

  const cn = pair(ids, isCniMtorSubstrate, (id) => CNI_STRONG_3A4_INHIBITORS.has(id));
  if (cn) {
    out.push(
      hit(
        "cni-strong-3a4",
        cn[0],
        cn[1],
        names(cn[0], cn[1]),
        "contraindicated",
        "danger",
        "CNI / mTOR immunosuppressant × strong CYP3A4 / P-gp inhibitor — catastrophic trough surge",
        "Calcineurin inhibitors (tacrolimus, cyclosporine, voclosporin) and mTOR inhibitors (sirolimus, everolimus, temsirolimus) are narrow therapeutic index substrates of intestinal/hepatic CYP3A4 and P-glycoprotein (P-gp). Strong dual CYP3A4/P-gp inhibitors (Paxlovid [nirmatrelvir/ritonavir], ritonavir, cobicistat, voriconazole, itraconazole, posaconazole, ketoconazole, clarithromycin, nefazodone) block presystemic and hepatic clearance, triggering 5- to 50-fold trough surges. Acute supratherapeutic toxicity precipitates severe afferent arteriolar nephrotoxicity (AKI), posterior reversible encephalopathy syndrome (PRES), hyperkalemia, thrombotic microangiopathy (TMA), life-threatening neurotoxicity, opportunistic infection, and sirolimus pneumonitis. Paxlovid labeling warns to avoid/contraindicate co-administration when immunosuppressant concentrations cannot be closely monitored or adjusted under transplant specialist supervision.",
        "Serial whole-blood immunosuppressant trough concentrations, serum creatinine, urine output, serum potassium and magnesium, blood pressure, and neurologic status (tremor, headache, visual change, encephalopathy/PRES). Immediate transplant/ID coordination is required before starting strong inhibitors. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Paxlovid Prescribing Information Boxed Warning; Prograf, Neoral, Rapamune, Zortress/Afinitor, Vfend, Sporanox, and Norvir Prescribing Information. Prikis M, Cameron A. Transplant Proc 2022 (PMID 35599203). Badri P et al. Am J Transplant 2015 (PMID 25708713).",
      ),
    );
  }

  const vc = pair(ids, isValproateAgent, (id) => CARBAPENEMS.has(id));
  if (vc) {
    out.push(
      hit(
        "valproate-carbapenem",
        vc[0],
        vc[1],
        names(vc[0], vc[1]),
        "major",
        "danger",
        "valproate × carbapenem — irreversible APEH blockade / rapid valproate crash",
        "Carbapenem antibiotics (meropenem, ertapenem, imipenem-cilastatin, doripenem) irreversibly inhibit hepatic cytosolic acylpeptide hydrolase (APEH), preventing deconjugation of valproate-glucuronide (VPA-G) back to active valproic acid while accelerating glucuronidation and MRP-mediated renal VPA-G elimination. Serum valproate concentrations plummet by 60–90% within 24–48 hours and often remain unresponsive even to escalating valproate therapy, placing patients at high risk for breakthrough seizures and generalized status epilepticus. Depakote and carbapenem Prescribing Information advise avoiding concomitant use whenever possible.",
        "Total and free serum valproate concentrations (note: levels crash within 24 hours despite escalation), seizure recurrence, mental status, and continuous EEG if indicated. Evaluate non-carbapenem antimicrobial coverage or alternative antiepileptic bridging under neurology/ID supervision. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Depakote (divalproex / valproate), Merrem (meropenem), Invanz (ertapenem), and Primaxin (imipenem-cilastatin) Prescribing Information. Spriet I et al. Ann Pharmacother 2007 (PMID 17609232). Suzuki E et al. Drug Metab Dispos 2010 (PMID 20551238); Xenobiotica 2011 (PMID 21770850).",
      ),
    );
  }

  const hk = firstHyperkalemiaRaasK(ids);
  if (hk) {
    out.push(
      hit(
        "hyperkalemia-raas-k",
        hk[0],
        hk[1],
        names(hk[0], hk[1]),
        "major",
        "danger",
        "RAAS blockade × K-retaining agent / ENaC blocker — additive hyperkalemia & fatal arrhythmia",
        "ACE inhibitors, ARBs, and ARNIs suppress aldosterone-mediated distal potassium excretion; combining them with mineralocorticoid receptor antagonists (spironolactone, eplerenone, finerenone), epithelial sodium channel (ENaC) blockers (amiloride, triamterene), ENaC-blocking sulfonamides (trimethoprim, TMP-SMX), or exogenous potassium supplements — or stacking two potassium-retaining/raising agents — additively impairs renal potassium clearance in the cortical collecting duct. This multi-hit collision precipitates life-threatening hyperkalemia (serum potassium >= 6.0 mEq/L), producing progressive cardiac conduction toxicity (peaked T waves, PR prolongation, QRS widening, sine-wave pattern), ventricular fibrillation, asystole, and sudden arrhythmic death, particularly in older adults and chronic kidney disease.",
        "Baseline and serial serum potassium (monitor closely for serum potassium >= 5.5–6.0 mEq/L), serum creatinine/eGFR, bicarbonate, and 12-lead ECG for hyperkalemic conduction changes (note: normal ECG does not exclude severe hyperkalemia). Evaluate non-hyperkalemic antimicrobial alternatives (when TMP-SMX is the trigger) or discontinue unnecessary potassium loads. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Aldactone (spironolactone), Inspra (eplerenone), Midamor (amiloride), Bactrim (TMP-SMX), Prinivil (lisinopril), Cozaar (losartan), and Entresto (sacubitril-valsartan) Prescribing Information. Antoniou T et al. Arch Intern Med 2010 (PMID 20585070); BMJ 2011 (PMID 21911446). Fralick M, Antoniou T, Juurlink DN et al. BMJ 2014 (PMID 25359996).",
      ),
    );
  }

  const es = pair(ids, isErgotAlkaloid, isErgotStrong3a4Inhibitor);
  if (es) {
    out.push(
      hit(
        "ergot-strong-3a4",
        es[0],
        es[1],
        names(es[0], es[1]),
        "contraindicated",
        "danger",
        "ergot alkaloid × strong CYP3A4 inhibitor — vasospastic ergotism & ischemia",
        "FDA Boxed Warning: Ergotamine, dihydroergotamine, and methylergonovine undergo extensive presystemic and hepatic CYP3A4 clearance. Strong CYP3A4 inhibitors (Paxlovid, ritonavir, cobicistat, darunavir-cobicistat, voriconazole, itraconazole, posaconazole, ketoconazole, clarithromycin, erythromycin, nefazodone, telithromycin, mifepristone) block CYP3A4 metabolism and spike systemic ergot exposure multi-fold. Extreme alpha-adrenergic and 5-HT1B/1D/2A receptor stimulation drives intense, persistent arterial vasospasm (vasospastic ergotism), causing cerebral ischemia and stroke, coronary vasospasm and myocardial ischemia, mesenteric ischemia, renal infarction, and severe peripheral arterial insufficiency progressing to absent distal pulses, factitiously low noninvasive blood pressure, and digital or limb gangrene. Co-administration is an absolute labeled contraindication.",
        "Distal pulses, capillary refill, cool or cyanotic extremities, claudication, angina, focal neurologic deficits, and abdominal pain (severe brachial vasospasm can produce factitiously low cuff blood pressure). Discontinue both offending agents immediately and seek urgent emergency/vascular vasodilator evaluation. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Cafergot (ergotamine), Migranal (dihydroergotamine), Methergine (methylergonovine), Norvir (ritonavir), Paxlovid, and Biaxin (clarithromycin) Prescribing Information FDA Boxed Warnings. Srisuma S et al. Clin Toxicol (Phila) 2014 (PMID 24978905). Horowitz RS et al. Arch Intern Med 1996 (PMID 8607732). Spiegel M et al. Neurology 2001 (PMID 11524501). Leroy F et al. Ann Intern Med 1988 (PMID 3389610).",
      ),
    );
  }

  const mtp = pair(ids, isMaoiDrug, isMaoiPressorTrigger);
  if (mtp) {
    out.push(
      hit(
        "maoi-tyramine-sympathomimetic",
        mtp[0],
        mtp[1],
        names(mtp[0], mtp[1]),
        "contraindicated",
        "danger",
        "MAOI × tyramine / indirect sympathomimetic — catecholamine storm / hypertensive crisis",
        "Loss of intestinal and neuronal MAO-A deamination (phenelzine, tranylcypromine, isocarboxazid, linezolid, methylene blue, nonselective/high-exposure selegiline, rasagiline, safinamide, moclobemide) prevents first-pass breakdown of dietary tyramine and enlarges vesicular norepinephrine stores inside sympathetic nerve terminals. Dietary tyramine (aged cheeses, cured meats, fermented soy, tap beer) and indirect or mixed-acting sympathomimetics (pseudoephedrine, phenylephrine, methylphenidate, lisdexamfetamine, amphetamine, ephedrine) enter adrenergic terminals via NET and displace massive vesicular norepinephrine stores into synaptic clefts. Unopposed vascular alpha-1 vasoconstriction triggers an acute catecholamine storm and hypertensive crisis, risking severe occipital headache, hypertensive encephalopathy, hemorrhagic stroke, aortic dissection, myocardial ischemia, and flash pulmonary edema.",
        "Sudden severe occipital headache, rapid blood pressure surge, chest pain, dyspnea, palpitations, diaphoresis, neck stiffness, or focal neurologic signs. Seek emergency evaluation immediately; parenteral short-acting alpha-adrenergic blockade or vasodilator titration is managed in acute care (avoid unopposed beta-blockade). Maintain labeled dietary tyramine and sympathomimetic avoidance through the post-MAOI washout window. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Nardil (phenelzine), Parnate (tranylcypromine), Marplan (isocarboxazid), Zyvox (linezolid), Emsam (selegiline), Azilect (rasagiline), Xadago (safinamide), Adderall XR, and Vyvanse Prescribing Information contraindications. Lippman SB, Nash K. Drug Saf 1990 (PMID 2190595). Finberg JPM, Gillman K. Int Rev Neurobiol 2011 (PMID 21971008). Cantarini MV et al. Br J Clin Pharmacol 2004 (PMID 15521893). Van den Eynde V et al. Psychopharmacol Bull 2022 (PMID 35721816).",
      ),
    );
  }

  const aw = pair(ids, (id) => id === "amiodarone", (id) => id === "warfarin");
  if (aw) {
    out.push(
      hit(
        "amiodarone-warfarin",
        aw[0],
        aw[1],
        names(aw[0], aw[1]),
        "major",
        "danger",
        "amiodarone × warfarin — dual-enantiomer CYP2C9/1A2/3A4 blockade & delayed INR surge",
        "Amiodarone and its accumulating metabolites (N-desethylamiodarone and N,N-didesethylamiodarone) inhibit hepatic CYP2C9 clearance of the potent (S)-warfarin enantiomer as well as CYP1A2 and CYP3A4 clearance of (R)-warfarin, elevating INR by 50–100%+ and creating high risk for gastrointestinal, retroperitoneal, and intracranial hemorrhage. Because amiodarone has extensive tissue distribution with a terminal half-life of 40–55 days, anticoagulation potentiation typically takes 1–4 weeks to reach peak impact and hyper-anticoagulation persists for weeks to months even after amiodarone is discontinued. Prescribing information recommends empiric preemptive warfarin reduction upon initiating amiodarone with frequent INR monitoring.",
        "Baseline and serial INR (at least weekly during the first 4–8 weeks after amiodarone initiation, loading, dose change, or cessation—prolonged surveillance is required for months after stopping amiodarone), plus signs of occult or overt bleeding (epistaxis, hematuria, melena, hematemesis, severe headache, or focal neurologic change). The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Coumadin (warfarin) and Cordarone / Pacerone (amiodarone) Prescribing Information. O'Reilly RA et al. Clin Pharmacol Ther 1987 (PMID 3621782). Kerin NZ et al. Arch Intern Med 1988 (PMID 3401099). Heimark LD et al. Clin Pharmacol Ther 1992 (PMID 1563209). McDonald MG et al. Clin Pharmacol Ther 2012 (PMID 22398967).",
      ),
    );
  }

  const ia = pair(ids, (id) => id === "isoniazid", (id) => id === "acetaminophen");
  if (ia) {
    out.push(
      hit(
        "isoniazid-acetaminophen",
        ia[0],
        ia[1],
        names(ia[0], ia[1]),
        "major",
        "danger",
        "isoniazid × acetaminophen — CYP2E1 induction & NAPQI hepatotoxicity",
        "Isoniazid produces biphasic CYP2E1 modulation: acute competitive inhibition while parent isoniazid occupies the active site, coupled with protein stabilization that induces hepatic CYP2E1 abundance as isoniazid clears between doses (especially in fast NAT2 acetylators) or after interruption. Induced CYP2E1 accelerates conversion of acetaminophen to reactive N-acetyl-p-benzoquinone imine (NAPQI). When hepatic glutathione detoxification reserves are depleted—worsened by malnutrition, fasting, or alcohol exposure—excess NAPQI binds hepatocellular proteins and drives centrilobular hepatocellular necrosis with steep AST/ALT surges, coagulopathy (elevated INR), hyperbilirubinemia, hepatic encephalopathy, and acute liver failure even at labeled therapeutic acetaminophen exposure.",
        "Serial hepatic transaminases (AST/ALT), total bilirubin, PT/INR, serum creatinine/lactate, mental status (asterixis or encephalopathy), and right upper quadrant pain or jaundice. Evaluate prompt N-acetylcysteine (NAC) antidote initiation if acetaminophen hepatotoxicity is suspected. The Prescribing Information governs. This desk does not pick the dose or replacement agent.",
        "Isoniazid and Acetaminophen Prescribing Information. Zand R et al. Clin Pharmacol Ther 1993 (PMID 8354023). Chien JY et al. Clin Pharmacol Ther 1997 (PMID 9024171). Murphy R et al. Ann Intern Med 1990 (PMID 2240884). Crippin JS. Am J Gastroenterol 1993 (PMID 8470644). Nolan CM et al. Chest 1994 (PMID 7508362).",
      ),
    );
  }

  return out;
}

export function safetyWanted(ids: string[]) {
  return safetyOnDesk(ids).length > 0;
}
