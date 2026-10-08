/**
 * Named labeled collisions the generic PD map misses or mis-names.
 * Teaching — not a protocol, not a milligram. The Prescribing Information governs.
 */

import { DRUG_BY_ID } from "./catalog";
import { ACEI, ARNI, isArniAcei } from "./wards";
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
  | "sglt2-loop";

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
        "Aspirin and ibuprofen labels. Catella-Lawson 2001 (PMID 11248154).",
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
        "omeprazole / esomeprazole blunt clopidogrel activation",
        "Clopidogrel is a 2C19 activation substrate. Omeprazole and esomeprazole phenocopy a 2C19 PM — less active thiol, more stent-era worry. The CYP map already fires; this row names the switch. Pantoprazole is the quieter PPI on this desk. Do not 'give more Plavix.'",
        "Pantoprazole if a PPI is required. Open the PI. This desk does not pick the milligram.",
        "Plavix boxed warning / FDA PPI communication. CPIC CYP2C19–clopidogrel.",
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

  return out;
}

export function safetyWanted(ids: string[]) {
  return safetyOnDesk(ids).length > 0;
}
