/** Independent-review basis for a collision — CDS criterion 4. */

import { citesFor, pubmedUrl } from "./pubmed";
import { dailymedSearchUrl } from "@/lib/regulatory";
import { DRUG_BY_ID, DRUGS } from "./catalog";
import { FDA_DDI_SOURCE, FDA_DDI_TABLE, type FdaDdiEntry } from "./reference/fda-ddi-table";
import { buildCatalogMatcher } from "./reference/validate-fda";
import { LABEL_GOLD_SET, type GoldPair } from "./reference/label-gold-set";
import {
  LABEL_CONTRAINDICATED_TAG,
  LABEL_CONTRAINDICATIONS_RETRIEVED,
  labelContraindicationFor,
} from "./label-contraindications";
import { PERPETRATOR_LABELS } from "./reference/label-perpetrators";
import type { Finding } from "./types";

export type BasisKind = "fda-boxed" | "fda-pi" | "fda-warning" | "fda-ddi" | "cpic" | "pubmed" | "scale" | "desk";

export interface FindingBasis {
  kind: BasisKind;
  label: string;
  detail: string;
  href?: string;
}

const BOXED: Record<string, { detail: string; href?: string }> = {
  "pd-opioid-benzo": {
    detail:
      "FDA boxed warning (2016): opioids plus benzodiazepines or other CNS depressants — profound sedation, respiratory depression, coma, and death.",
    href: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-about-serious-risks-and-death-when-combining-opioid-pain-or",
  },
  "pd-gaba-opioid": {
    detail:
      "FDA 2019 warning: gabapentinoids plus opioids or other CNS depressants — serious breathing difficulties.",
    href: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-warns-about-serious-breathing-problems-seizure-and-nerve-pain-medicines-gabapentin-neurontin",
  },
  "pd-nitrate-pde5": {
    detail: "Sildenafil / tadalafil / vardenafil labels contraindicate organic nitrates. Refractory hypotension.",
  },
  "pd-maoi-sero": {
    detail: "MAOI labels contraindicate serotonergic agents. Serotonin toxicity, hypertensive crisis.",
  },
  "pd-antag-opioid": {
    detail: "Naltrexone / naloxone labels: precipitated withdrawal in opioid-dependent patients; blockade of agonists.",
  },
  "pd-arni-acei": {
    detail:
      "Entresto boxed warning / contraindications: sacubitril–valsartan with an ACE inhibitor — angioedema. 36-hour washout when switching.",
  },
  "pd-sofosbuvir-amio": {
    detail:
      "Harvoni / Epclusa / Sovaldi labels and FDA 2015 safety communication: sofosbuvir plus amiodarone — serious symptomatic bradycardia, including pacemaker-level events.",
    href: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-serious-slowing-heart-rate-when-hepatitis-c-treatments",
  },
  "pd-clozapine-benzo": {
    detail:
      "Clozapine boxed warning / PI: respiratory arrest and collapse with concomitant benzodiazepines, including deaths. Not generic stacked sedation.",
  },
  "pd-isotret-tetra": {
    detail: "Isotretinoin (iPLEDGE) and tetracycline class labels: intracranial hypertension / pseudotumor cerebri.",
  },
  "pd-fq-steroid": {
    detail:
      "Fluoroquinolone boxed warning (FDA 2008 / 2016): tendinitis and tendon rupture. Risk higher with concomitant corticosteroids, age over 60, and transplant.",
    href: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-updates-warnings-oral-and-injectable-fluoroquinolone-antibiotics",
  },
  "pd-dual-raas": {
    detail:
      "ACEI and ARB labels, ONTARGET, VA NEPHRON-D, Tekturna boxed warning: dual RAAS blockade — hyperkalemia, hypotension, AKI without outcome gain in the labeled populations. Aliskiren plus ACEI/ARB contraindicated in diabetes.",
  },
  "pd-ghb-cns": {
    detail:
      "Sodium oxybate labels (Xyrem, Xywav, Lumryz) carry a boxed warning for CNS and respiratory depression, including with other CNS depressants, and contraindicate use with sedative hypnotics or alcohol. Street GHB and non-hypnotic depressants are the desk extending that label; open the PI.",
    href: dailymedSearchUrl("sodium oxybate"),
  },
  "pd-maoi-stim": {
    detail:
      "Amphetamine and methylphenidate labels contraindicate use during or within 14 days after an MAOI (hypertensive crisis). Cocaine, MDMA, and other unlabeled stimulants are the desk extending that label; open the PI.",
    href: dailymedSearchUrl("amphetamine"),
  },
  "pd-ppi-acid": {
    detail:
      "Reyataz / Edurant / Nizoral / Harvoni / Epclusa labels: PPIs raise gastric pH and dump acid-dependent absorption. Rilpivirine PPIs are contraindicated.",
  },
};

const PI: Record<string, string> = {
  "pd-methadone-ritonavir":
    "Methadone and ritonavir / Paxlovid labels: mixed PK — methadone may fall (withdrawal); fentanyl and other 3A4 opioids may rise.",
  "pd-bup-ritonavir": "Buprenorphine labels: 3A4 inhibitors can raise exposure. Opposite arrow from methadone on the same booster.",
  "pd-bup-precip": "Buprenorphine labels: precipitated withdrawal if a full agonist is still occupying μ receptors.",
  "pd-opioid-stack": "Opioid labels: additive respiratory depression with another full agonist.",
  "pd-qt": "CredibleMeds-class QT plus methadone / citalopram / ondansetron labels. Not a QTc.",
  "pd-sero": "SSRI / SNRI / MAOI / opioid labels flag serotonergic combinations. Hunter is the published screen.",
  "clinic-preg-avoid": "Label: boxed or contraindicated in pregnancy. Open the PI. This desk is not obstetric advice.",
  "clinic-preg-caution": "Label: use in pregnancy is a specialist call. Open the PI.",
  "clinic-beers": "AGS Beers 2023. Not an FDA box. Confirm against the PI and the geriatric indication.",
  "clinic-renal": "Many labels dose-adjust on Cockcroft–Gault or eGFR. This desk flags CKD; it does not pick a dose.",
  "cyp-clock":
    "FDA 2020 Clinical Drug Interaction Studies / Huang CPT 2007. Strong ≥5× AUC; strong inducer lowers AUC by 80% or more. Start and stop are different clocks. Not a milligram.",
  "cyp-dual": "FDA example inhibitors often hit both CYP3A4 and P-gp. Gut first-pass victims move more than a CYP-only row.",
  "pd-carbapenem-vpa":
    "Carbapenem labels (meropenem, ertapenem, imipenem): concomitant valproate — loss of seizure control. UGT / glucuronide recycling, not a CYP isoform. Switch the antibiotic or the AED.",
  "pd-vanco-zosyn":
    "Observational AKI excess for IV vancomycin plus piperacillin–tazobactam versus vancomycin plus cefepime or a carbapenem. Not a boxed contraindication. Oral vancomycin is a different exposure.",
  "pd-cape-warfarin":
    "Capecitabine and fluorouracil labels: altered coagulation / INR rise with warfarin. Recheck INR. This desk does not pick a milligram.",
  "pd-pen-warfarin":
    "Nafcillin and dicloxacillin induce 3A4 and can steal warfarin effect — INR falls. Recheck after the course starts and after it stops.",
  "pd-glp-secretagogue":
    "GLP-1 / GIP agonist labels: hypoglycemia stacked with insulin or a secretagogue. Rarely alone. This desk does not cut the insulin.",
  "dose-over-cap":
    "Prescribing Information dose cap. The pair may be allowed; the milligram is not. This desk checked the amount you entered against the label. It does not pick the replacement milligram.",
  "dose-over-max":
    "Prescribing Information labeled maximum. Above this number is off-label unless a different indication says otherwise. Open the PI.",
  "pd-asa-nsaid":
    "Aspirin and ibuprofen labels. Ibuprofen occupies COX-1 and can block aspirin acetylation if taken around the ASA dose. Catella-Lawson 2001 (PMID 11248154). GI bleed is a separate row.",
  "pd-lamo-vpa":
    "Lamictal PI: valproate roughly doubles lamotrigine via UGT. Labeled starter kits. SJS/TEN boxed. Yuen 1992 (PMID 1524964). This desk does not pick the milligram.",
  "pd-lamo-ee":
    "Lamictal PI: estrogen-containing contraceptives induce UGT and cut lamotrigine. Stopping the pill can spike parent. Sidhu 2006 (PMID 16433873).",
  "pd-tamoxifen-2d6":
    "Soltamox PI and CPIC CYP2D6–tamoxifen: strong 2D6 inhibitors block activation to endoxifen. Switch the SSRI. Goetz 2005 (PMID 16361630). CPIC (PMID 29385237).",
  "pd-ocp-inducer":
    "Combined oral contraceptive and rifampin / enzyme-inducer labels: backup contraception. Niemi 2003 (PMID 12882588). Not a quieter pill.",
  "pd-clopidogrel-ppi":
    "Plavix boxed warning / FDA PPI communication: omeprazole and esomeprazole phenocopy CYP2C19 PM and blunt clopidogrel activation. Pantoprazole is the quieter PPI on this desk.",
  "pd-sglt2-loop":
    "Jardiance / Farxiga / Invokana labels: volume contraction with a diuretic; euglycemic DKA on sick days. A normal fingerstick does not clear ketones.",
};

const SCALE: Record<string, string> = {
  cows: "Wesson & Ling, J Psychoactive Drugs 2003. COWS is a published scale, not a diagnosis.",
  ciwa: "Sullivan et al., Br J Addict 1989. CIWA-Ar is a published scale, not a diagnosis.",
  hunter: "Dunkley 2003 Hunter criteria. Not Sternbach. Not a charted diagnosis.",
  mme: "CDC Clinical Practice Guideline for Prescribing Opioids, 2022. Factors, not a ceiling.",
};

/** catalog id|enzyme -> FDA Table 1 rows for that drug on that enzyme (built once). */
let FDA_INDEX: Map<string, FdaDdiEntry[]> | null = null;
function fdaRows(drugId: string, enzyme: string): FdaDdiEntry[] {
  if (!FDA_INDEX) {
    FDA_INDEX = new Map();
    const match = buildCatalogMatcher(DRUGS);
    for (const e of FDA_DDI_TABLE) {
      const hit = match(e.drug);
      if (!hit) continue;
      const k = `${hit.drug.id}|${e.target}`;
      const list = FDA_INDEX.get(k) ?? [];
      list.push(e);
      FDA_INDEX.set(k, list);
    }
  }
  return FDA_INDEX.get(`${drugId}|${enzyme}`) ?? [];
}

const SUBSTRATE_WORD = { sensitive: "sensitive", "moderate-sensitive": "moderately sensitive" } as const;

/** FDA Table 1 basis for a pk inhibitor/inducer row, only when FDA lists the perpetrator in that role. */
function fdaDdiBasis(finding: Finding): FindingBasis | null {
  if (finding.kind !== "pk") return null;
  const [perpId, victimId] = finding.drugIds;
  const enzyme = finding.enzymes[0];
  const role = finding.tags.find((t) => t === "inhibitor" || t === "inducer");
  if (!perpId || !victimId || !enzyme || !role) return null;
  const perp = fdaRows(perpId, enzyme).find((e) => e.kind === role);
  if (!perp) return null;
  const perpName = DRUG_BY_ID[perpId]?.name ?? perp.drug;
  const victimName = DRUG_BY_ID[victimId]?.name ?? victimId;
  const target = enzyme === "CYP3A4" ? "CYP3A" : enzyme;
  let detail = `FDA's example-interaction table lists ${perpName} as a ${perp.fdaClass ? `${perp.fdaClass} ` : ""}${target} ${role}`;
  const sub = fdaRows(victimId, enzyme).find((e) => e.kind === "substrate");
  if (sub && sub.kind === "substrate") {
    detail += `, and ${victimName} as a ${sub.fdaClass ? `${SUBSTRATE_WORD[sub.fdaClass]} ` : ""}${target} substrate`;
  }
  detail += `. FDA grades the roles; the severity tier on this row is the desk's rule. Table content current as of ${FDA_DDI_SOURCE.contentCurrentAsOf}.`;
  return { kind: "fda-ddi", label: "FDA interaction table", detail, href: FDA_DDI_SOURCE.url };
}

/** Unordered pair key -> label-verified gold pairs (verbatim DailyMed quotes). */
const GOLD_BY_PAIR = new Map<string, GoldPair[]>();
for (const g of LABEL_GOLD_SET) {
  const k = [g.drugA, g.drugB].sort().join("|");
  GOLD_BY_PAIR.set(k, [...(GOLD_BY_PAIR.get(k) ?? []), g]);
}

/** Verbatim label quote for a pair finding, only when the finding's mechanism matches the label's. */
function labelQuoteBasis(finding: Finding): FindingBasis | null {
  if (finding.drugIds.length !== 2) return null;
  const k = [...finding.drugIds].sort().join("|");
  const isPk = finding.kind === "pk";
  const g = (GOLD_BY_PAIR.get(k) ?? []).find((x) =>
    x.mechanism === "PK+PD" ? true : x.mechanism === "PK" ? isPk : !isPk,
  );
  if (!g) return null;
  const name = DRUG_BY_ID[g.labelDrug]?.name ?? g.labelDrug;
  const VERDICT: Record<GoldPair["labelClass"], string> = {
    contraindicated: "calls this combination contraindicated",
    avoid: "says to avoid this combination",
    "boxed-warning": "names this interaction in its Boxed Warning",
    warning: "warns about this interaction",
  };
  const verdict = VERDICT[g.labelClass];
  return {
    kind: "fda-pi",
    label: `${name} label, ${g.labelSection}`,
    detail: `The ${name} label ${verdict}: "${g.quote}"${g.paraphrased ? " (paraphrased)" : ""} Retrieved from DailyMed ${g.retrieved}.`,
    href: g.url,
  };
}

/** Verbatim label sentence for a finding held at contraindicated by a label pin. */
function labelPinBasis(finding: Finding): FindingBasis | null {
  if (!finding.tags.includes(LABEL_CONTRAINDICATED_TAG) || finding.drugIds.length !== 2) return null;
  const pin = labelContraindicationFor(finding.drugIds[0], finding.drugIds[1]);
  if (!pin) return null;
  const parts = [`The ${pin.labelDrug} label lists this combination under Contraindications.`];
  if (pin.contraindicationsSentence) parts.push(`Contraindications: "${pin.contraindicationsSentence}"`);
  parts.push(`${pin.labelSection}: "${pin.quote}"`);
  if (pin.labelExample) parts.push(`Named in the label: "${pin.labelExample}"`);
  parts.push(`Retrieved from DailyMed ${pin.retrieved ?? LABEL_CONTRAINDICATIONS_RETRIEVED}.`);
  return {
    kind: "fda-pi",
    label: `${pin.labelDrug} label, Contraindications`,
    detail: parts.join(" "),
    href: pin.url,
  };
}
/** Perpetrator's own label, for PK rows FDA Table 1 cannot cite. */
function perpetratorLabelBasis(finding: Finding): FindingBasis | null {
  if (finding.kind !== "pk") return null;
  const [perpId, victimId] = finding.drugIds;
  const role = finding.tags.find((t) => t === "inhibitor" || t === "inducer");
  const L = PERPETRATOR_LABELS.find(
    (x) => x.perpIds.includes(perpId ?? "") && x.enzyme === finding.enzymes[0] && x.role === role,
  );
  if (!L || !victimId) return null;
  const ci = L.contraindicatedWith?.victimIds.includes(victimId) ? L.contraindicatedWith : undefined;
  if (ci) {
    return {
      kind: "fda-pi",
      label: `${L.brand} label, ${ci.section}`,
      detail: `The ${L.brand} label calls this combination contraindicated: "${ci.quote}" Retrieved from DailyMed ${L.retrieved}.`,
      href: L.url,
    };
  }
  return {
    kind: "fda-pi",
    label: `${L.brand} label, ${L.section}`,
    detail: `The ${L.brand} label states the ${L.role === "inducer" ? "induction" : "inhibition"}: "${L.roleQuote}" It does not name this pair as contraindicated; the severity tier on this row is the desk's rule. Retrieved from DailyMed ${L.retrieved}.`,
    href: L.url,
  };
}

function suffixOf(id: string) {
  const parts = id.split("__");
  return parts[parts.length - 1] ?? id;
}

export function basisFor(finding: Finding): FindingBasis[] {
  const suffix = suffixOf(finding.id);
  const out: FindingBasis[] = [];
  // #58 label pins lead. Gold-set quotes (#68) still attach for pairs the pin does not already cite.
  const pinned = labelPinBasis(finding);
  if (pinned) out.push(pinned);
  const quoted = labelQuoteBasis(finding);
  if (quoted && quoted.href !== pinned?.href) out.push(quoted);
  const boxed = BOXED[suffix];
  if (boxed) {
    out.push({
      kind: "fda-boxed",
      label: "FDA boxed / safety communication",
      detail: boxed.detail,
      href: boxed.href ?? dailymedSearchUrl(DRUG_BY_ID[finding.drugIds[0]]?.name ?? ""),
    });
  }
  const pi = PI[suffix];
  if (pi) {
    const name = DRUG_BY_ID[finding.drugIds[0]]?.name;
    out.push({
      kind: suffix.startsWith("clinic-") ? "fda-warning" : "fda-pi",
      label: "Prescribing Information",
      detail: pi,
      href: name ? dailymedSearchUrl(name) : undefined,
    });
  }
  const fda = fdaDdiBasis(finding);
  if (fda) out.push(fda);
  const perpLabel = fda ? null : perpetratorLabelBasis(finding);
  if (perpLabel) out.push(perpLabel);
  const cites = citesFor(finding.drugIds).slice(0, 1);
  if (cites[0]) {
    out.push({
      kind: "pubmed",
      label: `PMID ${cites[0].pmid}`,
      detail: `${cites[0].year} ${cites[0].journal}. ${cites[0].why}`,
      href: pubmedUrl(cites[0].pmid),
    });
  }
  if (finding.kind === "geno" || suffix.includes("pheno")) {
    out.push({
      kind: "cpic",
      label: "CPIC / ClinPGx",
      detail: "Phenotype rows paraphrase published CPIC tables. Open the guideline. This desk is not a PGx report.",
      href: "https://cpicpgx.org/guidelines/",
    });
  }
  if (out.length === 0) {
    out.push({
      kind: "desk",
      label: "FirstPass map",
      detail:
        "Curated CYP / PD map. Independently review the Prescribing Information and primary literature before acting. Absence of an FDA box here is not absence of risk.",
      href: finding.drugIds[0] ? dailymedSearchUrl(DRUG_BY_ID[finding.drugIds[0]]?.name ?? "") : undefined,
    });
  }
  // Two rules can cite the same label page (e.g. a pinned label rule and the gold-set quote).
  // Keep the first, so the two visible slots show two different sources.
  const seen = new Set<string>();
  return out.filter((b) => {
    if (!b.href) return true;
    const k = `${b.kind}|${b.href}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function scaleBasis(id: keyof typeof SCALE): FindingBasis {
  return { kind: "scale", label: "Published scale", detail: SCALE[id] };
}
