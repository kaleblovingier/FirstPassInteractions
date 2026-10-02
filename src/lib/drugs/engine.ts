import { DRUG_BY_ID } from "./catalog";
import { CLINIC } from "./clinic";
import { applyHost, isVirtual, WASHOUT } from "./host";
import { phenoconversionFindings } from "./pheno-convert";
import { udsFindings } from "./uds";
import { protocolFindings } from "./cyp-protocol";
import { doseFindings } from "./dosing";
import {
  LABEL_CONTRAINDICATED_TAG,
  labelContraindicationFor,
  labelPinSentence,
} from "./label-contraindications";
import {
  ACEI,
  ARNI,
  FLUOROPYRIMIDINE,
  GLP,
  PEN_INDUCER,
  isCarbapenemValproate,
  isInsulinId,
  isVancoZosyn,
} from "./wards";
import {
  isAsaNsaid,
  isClozapineBenzo,
  isClopidogrelPpi,
  isDualRaas,
  isFqSteroid,
  isIsotretinoinTetra,
  isLamotrigineEe,
  isLamotrigineValproate,
  isOcpInducer,
  isPpiAcid,
  isSglt2Loop,
  isSofosbuvirAmio,
  isTamoxifen2d6,
} from "./safety";
import {
  DEFAULT_HOST,
  DEFAULT_PHENOTYPES,
  ENZYMES,
  METABOLIZER_LABEL,
  PHENOTYPE_ENZYMES,
  SEVERITY_RANK,
  STACK_AXES,
  type Drug,
  type Enzyme,
  type EnzymeBurden,
  type EnzymeRole,
  type Finding,
  type HostContext,
  type Metabolizer,
  type PhenotypeMap,
  type Report,
  type Severity,
  type StackBar,
  type Strength,
  type SubstrateSensitivity,
} from "./types";

const STRENGTH_RANK: Record<Strength, number> = { strong: 3, moderate: 2, weak: 1 };

/** Fruit juices / EGCG that cut OATP uptake. Grapefruit also knocks out gut 3A4 — that is a different row. */
const OATP_PERP = new Set(["grapefruit", "pomegranate", "starfruit", "oatp-juice", "green-tea"]);
const OATP_VICTIM = new Set(["fexofenadine", "atenolol", "nadolol", "aliskiren"]);
const VITK_FOOD = new Set(["vitamin-k", "leafy-greens", "soy"]);
const T4_POLYPHENOL = new Set(["levothyroxine", "iron", "alendronate"]);
const ENTERAL_VICTIM = new Set(["phenytoin", "warfarin", "levothyroxine", "carbamazepine"]);
/** Ritonavir-boosted products: 3A4 inhibit raises fentanyl; methadone often falls. */
const RITONAVIR_BOOST = new Set(["ritonavir", "paxlovid"]);
/** Illicit / street full agonists that stack with a methadone take-home. */
const STREET_FULL_AGONIST = new Set([
  "fentanyl",
  "dirty-30",
  "heroin",
  "carfentanil",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
]);

function pkSeverity(
  strength: Strength,
  sensitivity: SubstrateSensitivity,
  nti: boolean,
  pathway: "clearance" | "activation",
  kind: "inhibitor" | "inducer",
): Severity {
  const ntiOrSensitive = nti || sensitivity === "sensitive";
  if (kind === "inhibitor") {
    if (strength === "strong" && ntiOrSensitive) return "contraindicated";
    if (strength === "strong" && sensitivity === "major") return "major";
    if (strength === "strong") return "moderate";
    if (strength === "moderate" && ntiOrSensitive) return "major";
    if (strength === "moderate" && sensitivity === "major") return "moderate";
    if (strength === "moderate") return "minor";
    if (ntiOrSensitive) return "moderate";
    return "minor";
  }
  // inducers: loss of efficacy (or boosted activation)
  if (pathway === "activation") {
    if (strength === "strong") return "major";
    if (strength === "moderate") return "moderate";
    return "minor";
  }
  if (strength === "strong" && ntiOrSensitive) return "contraindicated";
  if (strength === "strong") return "major";
  if (strength === "moderate" && (ntiOrSensitive || sensitivity === "major")) return "major";
  if (strength === "moderate") return "moderate";
  return "minor";
}

function substratesOf(drug: Drug, enzyme: Enzyme) {
  return drug.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> =>
      e.enzyme === enzyme && e.kind === "substrate",
  );
}

function perpetratorsOf(drug: Drug, enzyme: Enzyme, kind: "inhibitor" | "inducer") {
  return drug.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
      e.enzyme === enzyme && e.kind === kind,
  );
}

function pairId(a: string, b: string, suffix: string) {
  return [a, b].sort().join("__") + "__" + suffix;
}

function names(ids: string[]) {
  return ids.map((id) => DRUG_BY_ID[id]?.name ?? id);
}

function arrowFor(
  kind: "inhibitor" | "inducer",
  pathway: "clearance" | "activation",
): string {
  if (kind === "inhibitor" && pathway === "clearance") return "↑ exposure";
  if (kind === "inhibitor" && pathway === "activation") return "↓ active metabolite";
  if (kind === "inducer" && pathway === "clearance") return "↓ exposure / loss of efficacy";
  return "↑ active metabolite";
}

function pkClinical(victim: Drug, kind: "inhibitor" | "inducer", pathway: "clearance" | "activation") {
  if (kind === "inhibitor" && pathway === "activation") {
    return `Expect blunted conversion of ${victim.name} to its active metabolite and reduced clinical effect (${victim.toxicityHint}).`;
  }
  if (kind === "inducer" && pathway === "clearance") {
    return `Expect falling ${victim.name} levels and loss of efficacy. Monitor for treatment failure (${victim.toxicityHint}).`;
  }
  if (kind === "inducer" && pathway === "activation") {
    return `Faster activation of ${victim.name} may raise active-metabolite exposure. Watch for ${victim.toxicityHint}.`;
  }
  return `Expect higher ${victim.name} exposure. Watch for ${victim.toxicityHint}.`;
}

function pkFindings(a: Drug, b: Drug): Finding[] {
  const out: Finding[] = [];
  for (const enzyme of ENZYMES) {
    for (const [perp, victim] of [
      [a, b],
      [b, a],
    ] as const) {
      for (const kind of ["inhibitor", "inducer"] as const) {
        const perps = perpetratorsOf(perp, enzyme, kind);
        const subs = substratesOf(victim, enzyme);
        if (!perps.length || !subs.length) continue;
        // Fruit juice cuts fexofenadine via OATP. Scoring that pair as P-gp inhibition (↑ parent) is the wrong arrow.
        if (
          enzyme === "P-gp" &&
          kind === "inhibitor" &&
          OATP_PERP.has(perp.id) &&
          victim.id === "fexofenadine"
        ) {
          continue;
        }
        // Ritonavir/Paxlovid inhibit 3A4 but methadone still falls (2B6/UGT). Don't score ↑ parent.
        if (
          enzyme === "CYP3A4" &&
          kind === "inhibitor" &&
          victim.id === "methadone" &&
          RITONAVIR_BOOST.has(perp.id)
        ) {
          continue;
        }
        const strongest = perps.reduce((m, p) =>
          STRENGTH_RANK[p.strength] > STRENGTH_RANK[m.strength] ? p : m,
        );
        const hottest = subs.reduce((m, s) => {
          const rank = { sensitive: 3, major: 2, minor: 1 };
          return rank[s.sensitivity] > rank[m.sensitivity] ? s : m;
        });
        const severity = pkSeverity(
          strongest.strength,
          hottest.sensitivity,
          Boolean(hottest.nti),
          hottest.pathway,
          kind,
        );
        const verb = kind === "inhibitor" ? "inhibition" : "induction";
        const pathwayWord =
          hottest.pathway === "activation" ? "prodrug activation" : "clearance";
        out.push({
          id: pairId(a.id, b.id, `pk-${enzyme}-${kind}-${perp.id}`),
          severity,
          kind: "pk",
          drugIds: [perp.id, victim.id],
          headline: `${perp.name} × ${victim.name}`,
          enzymes: [enzyme],
          effect: arrowFor(kind, hottest.pathway),
          mechanism: `${strongest.strength} ${enzyme} ${verb} of ${pathwayWord}`,
          clinical: `${perp.name} is a ${strongest.strength} ${enzyme} ${kind}. ${victim.name} is a ${hottest.sensitivity} ${enzyme} substrate${hottest.nti ? " with a narrow therapeutic index" : ""}${hottest.pathway === "activation" ? " (prodrug)" : ""}. ${pkClinical(victim, kind, hottest.pathway)}`,
          tags: [enzyme, kind, hottest.pathway],
        });
      }
    }

    const aSubs = substratesOf(a, enzyme);
    const bSubs = substratesOf(b, enzyme);
    const perpOnEnzyme = out.some(
      (f) =>
        f.enzymes.includes(enzyme) &&
        (f.tags.includes("inhibitor") || f.tags.includes("inducer")),
    );
    if (!perpOnEnzyme && aSubs.length && bSubs.length) {
      const aHot = aSubs[0];
      const bHot = bSubs[0];
      const nti = Boolean(aHot.nti || bHot.nti);
      const bothHot =
        (aHot.sensitivity === "sensitive" || aHot.sensitivity === "major") &&
        (bHot.sensitivity === "sensitive" || bHot.sensitivity === "major");
      if (nti || bothHot) {
        out.push({
          id: pairId(a.id, b.id, `pk-comp-${enzyme}`),
          severity: nti ? "moderate" : "minor",
          kind: "pk",
          drugIds: [a.id, b.id],
          headline: `${a.name} × ${b.name}`,
          enzymes: [enzyme],
          effect: "competitive substrate overlap",
          mechanism: `shared ${enzyme} substrate`,
          clinical: `Both drugs are ${enzyme} substrates. Competition is usually modest unless a perpetrator is also present, but narrow-index or sensitive substrates can still shift.`,
          tags: [enzyme, "competition"],
        });
      }
    }
  }
  return out;
}

/**
 * Label-sourced contraindication pins (see label-contraindications.ts). For a
 * short list of named pairs whose FDA label lists the combination under
 * Contraindications, the matching enzyme finding is held at contraindicated.
 * Nothing else about pkSeverity or its thresholds changes.
 */
function holdsLabelPin(f: Finding, pin: NonNullable<ReturnType<typeof labelContraindicationFor>>, allowLabelAsPerp: boolean): boolean {
  if (f.kind !== "pk" || !f.enzymes.includes(pin.enzyme) || !f.tags.includes(pin.kind)) return false;
  // Historical pins: otherId is the perpetrator and labelDrugId is the victim.
  if (f.drugIds[0] === pin.otherId && f.drugIds[1] === pin.labelDrugId) return true;
  // Wave 3: the labeled product is often the perpetrator (Korlym, a boosted PI).
  return allowLabelAsPerp && f.drugIds[0] === pin.labelDrugId && f.drugIds[1] === pin.otherId;
}

function applyLabelPins(a: Drug, b: Drug, findings: Finding[]): Finding[] {
  const pin = labelContraindicationFor(a.id, b.id);
  if (!pin) return findings;
  const lift = (f: Finding): Finding => ({
    ...f,
    severity: "contraindicated" as Severity,
    clinical: `${f.clinical} ${labelPinSentence(pin)}`,
    tags: [...f.tags, LABEL_CONTRAINDICATED_TAG],
  });
  // Prefer the historical orientation so an existing pin is not also applied to
  // a reverse finding of the same kind. Wave-3 pins whose label drug is the
  // perpetrator match only on the second pass.
  if (findings.some((f) => holdsLabelPin(f, pin, false))) {
    return findings.map((f) => (holdsLabelPin(f, pin, false) ? lift(f) : f));
  }
  if (findings.some((f) => holdsLabelPin(f, pin, true))) {
    return findings.map((f) => (holdsLabelPin(f, pin, true) ? lift(f) : f));
  }
  const out = findings.slice();
  // The enzyme finding is missing (catalog roles changed). Keep the label verdict visible anyway.
  const perp = pin.otherId === a.id ? a : b;
  const victim = perp === a ? b : a;
  out.push({
    id: pairId(a.id, b.id, `label-ci-${pin.enzyme}-${pin.kind}-${perp.id}`),
    severity: "contraindicated",
    kind: "pk",
    drugIds: [perp.id, victim.id],
    headline: `${perp.name} × ${victim.name}`,
    enzymes: [pin.enzyme],
    effect: pin.kind === "inhibitor" ? "higher exposure" : "lower exposure",
    mechanism: `labeled contraindication (${pin.enzyme})`,
    clinical: labelPinSentence(pin),
    tags: [pin.enzyme, pin.kind, LABEL_CONTRAINDICATED_TAG],
  });
  return out;
}

function has(drug: Drug, flag: Drug["pd"][number]) {
  return drug.pd.includes(flag);
}

function pdPair(
  a: Drug,
  b: Drug,
  opts: {
    suffix: string;
    severity: Severity;
    headline?: string;
    effect: string;
    mechanism: string;
    clinical: string;
    tags: string[];
  },
): Finding {
  return {
    id: pairId(a.id, b.id, opts.suffix),
    severity: opts.severity,
    kind: "pd",
    drugIds: [a.id, b.id],
    headline: opts.headline ?? `${a.name} × ${b.name}`,
    enzymes: [],
    effect: opts.effect,
    mechanism: opts.mechanism,
    clinical: opts.clinical,
    tags: opts.tags,
  };
}

function pdFindings(a: Drug, b: Drug): Finding[] {
  const out: Finding[] = [];

  const aMaoi = has(a, "maoi");
  const bMaoi = has(b, "maoi");
  const aSero = has(a, "serotonergic");
  const bSero = has(b, "serotonergic");
  if ((aMaoi && bSero) || (bMaoi && aSero) || (aMaoi && bMaoi)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-maoi-sero",
        severity: "contraindicated",
        effect: "serotonin syndrome / hypertensive crisis",
        mechanism: "MAOI × serotonergic",
        clinical:
          "Combining an MAOI (including linezolid) with another serotonergic drug is contraindicated. Risk of life-threatening serotonin syndrome and, with tyramine-like effects, hypertensive crisis.",
        tags: ["serotonin", "maoi"],
      }),
    );
  }

  if (isCarbapenemValproate(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-carbapenem-vpa",
        severity: "contraindicated",
        effect: "valproate crash / loss of seizure control",
        mechanism: "carbapenem × valproate (UGT / glucuronide recycling)",
        clinical:
          "Carbapenems drop valproate levels within a day — not a CYP isoform and not stacked seizure threshold. Labels treat this as loss of seizure control. Switch the antibiotic or the AED; do not 'give a bit more Depakote.' This desk does not pick a milligram.",
        tags: ["ward", "seizure", "clinic"],
      }),
    );
  }

  if (isVancoZosyn(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-vanco-zosyn",
        severity: "major",
        effect: "acute kidney injury",
        mechanism: "vancomycin × piperacillin–tazobactam",
        clinical:
          "IV vancomycin plus piperacillin–tazobactam is associated with more AKI than vancomycin plus cefepime or a carbapenem. Observational, still a ward row. Volume, trough, and a narrower beta-lactam are the conversation. Oral vancomycin is a different exposure.",
        tags: ["ward", "renal", "clinic"],
      }),
    );
  }

  if ((ARNI.has(a.id) && ACEI.has(b.id)) || (ARNI.has(b.id) && ACEI.has(a.id))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-arni-acei",
        severity: "contraindicated",
        effect: "angioedema",
        mechanism: "ARNI × ACE inhibitor",
        clinical:
          "Sacubitril–valsartan with an ACE inhibitor is labeled contraindicated. Thirty-six hour washout when switching. Duplicate neprilysin / ACE blockade — not a potassium footnote and not an ARB swap. This desk does not time the first Entresto tablet.",
        tags: ["ward", "clinic", "angioedema"],
      }),
    );
  }

  if (
    (FLUOROPYRIMIDINE.has(a.id) && b.id === "warfarin") ||
    (FLUOROPYRIMIDINE.has(b.id) && a.id === "warfarin")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-cape-warfarin",
        severity: "major",
        effect: "INR rise / bleed",
        mechanism: "fluoropyrimidine × warfarin",
        clinical:
          "Capecitabine and 5-FU raise INR on warfarin. Not a 2C9 bully on this desk's CYP map — still a labeled monitor. Recheck INR. This desk does not pick a warfarin milligram.",
        tags: ["ward", "clinic", "bleed"],
      }),
    );
  }

  if (
    (PEN_INDUCER.has(a.id) && b.id === "warfarin") ||
    (PEN_INDUCER.has(b.id) && a.id === "warfarin")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-pen-warfarin",
        severity: "major",
        effect: "INR fall / loss of anticoagulation",
        mechanism: "nafcillin / dicloxacillin induction × warfarin",
        clinical:
          "Nafcillin and dicloxacillin induce 3A4 and can steal warfarin effect — INR falls, clots not bleeds. Warfarin is still a 2C9 NTI. Recheck INR after the course starts and after it stops.",
        tags: ["ward", "clinic"],
      }),
    );
  }

  if (isSofosbuvirAmio(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-sofosbuvir-amio",
        severity: "contraindicated",
        effect: "symptomatic bradycardia / sinus arrest",
        mechanism: "sofosbuvir × amiodarone",
        clinical:
          "Sofosbuvir-containing HCV regimens plus amiodarone are labeled for serious symptomatic bradycardia, including pacemaker-level events. Not additive nodal PD — Epclusa is not a beta-blocker. Do not treat the DAA as a free add-on on an amiodarone MAR.",
        tags: ["clinic", "bradycardia", "boxed"],
      }),
    );
  }

  if (isClozapineBenzo(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-clozapine-benzo",
        severity: "contraindicated",
        effect: "respiratory collapse / arrest",
        mechanism: "clozapine × benzodiazepine",
        clinical:
          "Clozapine labels warn of respiratory arrest and collapse with benzodiazepines, including deaths. This is not generic stacked sedation. Z-hypnotics are a different GABA-A row. Do not treat Ativan as a free extra on a Clozaril MAR.",
        tags: ["clinic", "cns", "boxed"],
      }),
    );
  }

  if (isAsaNsaid(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-asa-nsaid",
        severity: "major",
        effect: "loss of aspirin antiplatelet effect",
        mechanism: "ibuprofen / naproxen COX-1 occupancy × aspirin",
        clinical:
          "Ibuprofen occupies COX-1 and blocks aspirin's irreversible acetylation if it is taken around the ASA dose. Lost cardioprotection, not 'two NSAIDs.' Naproxen is quieter and still mapped. GI bleed remains a separate row.",
        tags: ["clinic", "bleeding"],
      }),
    );
  }

  if (isLamotrigineValproate(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lamo-vpa",
        severity: "major",
        effect: "doubled lamotrigine / SJS-TEN risk",
        mechanism: "valproate UGT blockade × lamotrigine",
        clinical:
          "Valproate inhibits UGT and roughly doubles lamotrigine. The starter kit is slower for a reason — rash and SJS/TEN, not stacked GABA. Not a CYP isoform. This desk does not pick the milligram.",
        tags: ["clinic", "rash"],
      }),
    );
  }

  if (isLamotrigineEe(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lamo-ee",
        severity: "major",
        effect: "lamotrigine falls; stop of OCP can spike parent",
        mechanism: "ethinyl estradiol UGT induction × lamotrigine",
        clinical:
          "Combined OCPs induce UGT1A4 and cut lamotrigine roughly in half. Stopping the pill can spike parent and rash. Not CYP3A4 on this map — EE is a 3A4 substrate, lamotrigine is not.",
        tags: ["clinic"],
      }),
    );
  }

  if (isTamoxifen2d6(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-tamoxifen-2d6",
        severity: "major",
        effect: "loss of endoxifen / lost tamoxifen efficacy",
        mechanism: "strong CYP2D6 inhibitor × tamoxifen activation",
        clinical:
          "Tamoxifen is a 2D6 activation substrate. Paroxetine, fluoxetine, bupropion, quinidine, and terbinafine block the step to endoxifen. The CYP map already fires; this row names the oncology call — switch the SSRI, do not give more tamoxifen.",
        tags: ["clinic", "pgx"],
      }),
    );
  }

  if (isOcpInducer(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-ocp-inducer",
        severity: "major",
        effect: "contraceptive failure",
        mechanism: "strong inducer × ethinyl estradiol",
        clinical:
          "Rifampin, carbamazepine, phenytoin, phenobarbital, primidone, and St John's wort dump estrogen exposure. The CYP map already fires induction; this row names the counseling — backup or a non-CYP method, not a quieter pill.",
        tags: ["clinic"],
      }),
    );
  }

  if (isIsotretinoinTetra(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-isotret-tetra",
        severity: "contraindicated",
        effect: "pseudotumor cerebri / intracranial hypertension",
        mechanism: "isotretinoin × tetracycline",
        clinical:
          "Systemic retinoids plus tetracyclines are labeled for intracranial hypertension. Not a CYP row and not iPLEDGE itself. Pick a different antibiotic or hold the retinoid — this desk does not.",
        tags: ["clinic", "boxed"],
      }),
    );
  }

  if (isFqSteroid(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-fq-steroid",
        severity: "major",
        effect: "tendinitis / tendon rupture",
        mechanism: "fluoroquinolone × systemic corticosteroid",
        clinical:
          "Fluoroquinolone boxed warning: tendinitis and tendon rupture, risk higher with concomitant corticosteroids, age, and transplant. Prednisone is empty PD on this desk on purpose — the pair is this row, not stacked GABA.",
        tags: ["clinic", "boxed"],
      }),
    );
  }

  if (isDualRaas(a.id, b.id)) {
    const ali = a.id === "aliskiren" || b.id === "aliskiren";
    out.push(
      pdPair(a, b, {
        suffix: "pd-dual-raas",
        severity: "contraindicated",
        effect: ali ? "hyperkalemia / AKI / hypotension" : "hyperkalemia / AKI without outcome gain",
        mechanism: ali ? "aliskiren × ACEI / ARB" : "ACE inhibitor × ARB",
        clinical: ali
          ? "Aliskiren plus an ACE inhibitor or ARB is labeled contraindicated in diabetes and a no in CKD. Not the Entresto 36-hour ACEI washout — that is a different row."
          : "Dual ACEI + ARB is more hyperkalemia, hypotension, and AKI without outcome gain in the labeled populations. Entresto already carries valsartan — a second ARB is extra blockade. Entresto plus an ACE inhibitor is the 36-hour angioedema row, already named.",
        tags: ["clinic", "potassium", "renal"],
      }),
    );
  }

  if (isPpiAcid(a.id, b.id)) {
    const hiv =
      a.id === "atazanavir" ||
      b.id === "atazanavir" ||
      a.id === "rilpivirine" ||
      b.id === "rilpivirine";
    out.push(
      pdPair(a, b, {
        suffix: "pd-ppi-acid",
        severity: hiv ? "contraindicated" : "major",
        effect: "lost absorption / treatment failure",
        mechanism: "PPI raises gastric pH — acid-dependent F",
        clinical: hiv
          ? "Rilpivirine labels contraindicate PPIs. Unboosted atazanavir does too. This is gastric pH, not CYP3A4 — a weak 3A4-inhibitor arrow on omeprazole is the wrong direction."
          : "Ketoconazole, itraconazole capsules, ledipasvir, and velpatasvir need an acidic stomach. A PPI empties the exposure. Not a 2C19 row (that is clopidogrel) and not a 3A4 bully.",
        tags: ["clinic", "absorption"],
      }),
    );
  }

  if (isClopidogrelPpi(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-clopidogrel-ppi",
        severity: "major",
        effect: "loss of clopidogrel activation",
        mechanism: "omeprazole / esomeprazole 2C19 phenocopy",
        clinical:
          "Clopidogrel is a 2C19 activation substrate. Omeprazole and esomeprazole phenocopy a 2C19 PM. The CYP map already fires; this row names the switch. Pantoprazole is the quieter PPI on this desk. Do not give more Plavix.",
        tags: ["clinic", "pgx"],
      }),
    );
  }

  if (isSglt2Loop(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-sglt2-loop",
        severity: "moderate",
        effect: "volume contraction / euglycemic DKA risk",
        mechanism: "SGLT2 inhibitor × loop diuretic",
        clinical:
          "SGLT2 inhibitors dump glucose and water. Next to a loop they stack volume contraction. Sick-day ketones can be euglycemic — a normal fingerstick does not clear DKA. Not a CYP row and not stacked sulfonylurea hypo.",
        tags: ["clinic", "glucose", "renal"],
      }),
    );
  }

  if (aSero && bSero && !(aMaoi || bMaoi)) {
    const strong =
      has(a, "ssri-snri") ||
      has(b, "ssri-snri") ||
      a.id === "tramadol" ||
      b.id === "tramadol" ||
      a.id === "dextromethorphan" ||
      b.id === "dextromethorphan" ||
      a.id === "mdma" ||
      b.id === "mdma" ||
      (has(a, "serotonergic") && has(a, "stimulant")) ||
      (has(b, "serotonergic") && has(b, "stimulant"));
    out.push(
      pdPair(a, b, {
        suffix: "pd-sero",
        severity: strong ? "major" : "moderate",
        effect: "additive serotonergic tone",
        mechanism: "serotonin syndrome risk",
        clinical: `Both ${a.name} and ${b.name} raise serotonergic activity. Watch for agitation, clonus, hyperreflexia, fever, and diarrhea. Risk climbs with additional serotonergic agents.`,
        tags: ["serotonin"],
      }),
    );
  }

  const aOp = has(a, "opioid");
  const bOp = has(b, "opioid");
  const aBz = has(a, "benzo-zdrug");
  const bBz = has(b, "benzo-zdrug");
  const aCns = has(a, "cns-depressant");
  const bCns = has(b, "cns-depressant");
  const aPartial = has(a, "partial-opioid");
  const bPartial = has(b, "partial-opioid");
  const aAnt = has(a, "opioid-antagonist");
  const bAnt = has(b, "opioid-antagonist");
  const gabaA = a.id === "gabapentin" || a.id === "pregabalin";
  const gabaB = b.id === "gabapentin" || b.id === "pregabalin";
  const gabaOp = (gabaA && bOp) || (gabaB && aOp);
  if ((aOp && bBz) || (bOp && aBz)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-opioid-benzo",
        severity: "major",
        effect: "respiratory depression",
        mechanism: "opioid × benzodiazepine / Z-drug",
        clinical:
          "FDA boxed warning: opioids plus benzodiazepines (or Z-drugs) cause profound sedation, respiratory depression, coma, and death. Methadone and buprenorphine desks see this as a street-benzo or a sleep prescription — same airway. Avoid unless no alternative exists; if combined, use the lowest doses and monitor.",
        tags: ["cns", "respiratory", "mat"],
      }),
    );
  }
  if (
    (aPartial && bOp && !bPartial && !bAnt) ||
    (bPartial && aOp && !aPartial && !aAnt)
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-bup-precip",
        severity: "major",
        effect: "precipitated withdrawal",
        mechanism: "partial μ-agonist × full agonist",
        clinical:
          "Buprenorphine is a high-affinity partial μ-agonist. Combined with a full agonist (fentanyl, methadone, 7-OH) you get occupancy conflict: start bup on a full-agonist load and you precipitate withdrawal — the classic failed induction; take a full agonist on stable bup and the high is blocked. This desk is not a dosing protocol.",
        tags: ["opioid", "mat"],
      }),
    );
  } else if (aOp && bOp && !aPartial && !bPartial && !aAnt && !bAnt) {
    const takeHomeStreet =
      (a.id === "methadone" && STREET_FULL_AGONIST.has(b.id)) ||
      (b.id === "methadone" && STREET_FULL_AGONIST.has(a.id));
    out.push(
      pdPair(a, b, {
        suffix: "pd-opioid-stack",
        severity: "major",
        effect: takeHomeStreet ? "stacked μ load on a take-home" : "stacked μ-agonist load",
        mechanism: takeHomeStreet ? "methadone take-home × illicit full agonist" : "opioid × opioid",
        clinical: takeHomeStreet
          ? "A methadone take-home plus illicit fentanyl (or a nitazene / dirty 30) is one airway, not two prescriptions. Naloxone still reverses the μ-agonist; it does not reverse xylazine or medetomidine. This is not a dosing protocol."
          : "Two μ-agonists are one airway, not two prescriptions. A methadone take-home plus illicit fentanyl is stacked μ load. Street 'perc 30s' stamped as oxycodone are often fentanyl or a nitazene. Naloxone still reverses the opioid; it does not reverse xylazine.",
        tags: ["cns", "opioid", "street", "mat"],
      }),
    );
  }
  if (gabaOp) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-gaba-opioid",
        severity: "major",
        effect: "respiratory depression",
        mechanism: "gabapentinoid × opioid",
        clinical:
          "Gabapentin and pregabalin add respiratory depression next to methadone or buprenorphine that is easy to miss — they are not 'just nerve pain.' FDA has a warning. This is PD, not CYP. Extra caution with a benzo on the same board.",
        tags: ["cns", "respiratory", "mat"],
      }),
    );
  }
  if ((has(a, "alpha2-agonist") && bOp) || (has(b, "alpha2-agonist") && aOp)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-alpha2-opioid",
        severity: "major",
        effect: "sedation not reversed by naloxone",
        mechanism: "α2-agonist × opioid",
        clinical:
          "Xylazine, medetomidine, lofexidine (Lucemyra), and clonidine sedate independently of the mu receptor. Naloxone reverses the opioid but not the α2 airway loss — support ventilation, do not stack extra naloxone expecting a wake-up. On an OTP desk that is Lucemyra or clonidine next to methadone, not only street tranq.",
        tags: ["cns", "alpha2", "street"],
      }),
    );
  }
  if (
    (has(a, "ghb") && (bCns || has(b, "alcohol") || bBz || bOp)) ||
    (has(b, "ghb") && (aCns || has(a, "alcohol") || aBz || aOp))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-ghb-cns",
        severity: "contraindicated",
        effect: "coma / apnea",
        mechanism: "GHB × CNS depressant",
        clinical:
          "Sodium oxybate (GHB) plus alcohol, benzodiazepines, opioids, or other CNS depressants is labeled contraindicated. The combination produces abrupt respiratory arrest.",
        tags: ["cns", "ghb"],
      }),
    );
  } else if (
    !((has(a, "alpha2-agonist") && bOp) || (has(b, "alpha2-agonist") && aOp)) &&
    !(aOp && bOp) &&
    !gabaOp &&
    !((aOp && bBz) || (bOp && aBz)) &&
    !isClozapineBenzo(a.id, b.id) &&
    !isLamotrigineValproate(a.id, b.id) &&
    ((aOp && bCns) || (bOp && aCns) || (aCns && bCns && a.id !== b.id))
  ) {
    const gabapentinoid =
      a.id === "gabapentin" ||
      b.id === "gabapentin" ||
      a.id === "pregabalin" ||
      b.id === "pregabalin";
    const nmda =
      has(a, "dissociative") ||
      has(b, "dissociative") ||
      has(a, "alcohol") ||
      has(b, "alcohol");
    out.push(
      pdPair(a, b, {
        suffix: "pd-cns",
        severity: aOp || bOp || gabapentinoid || nmda ? "major" : "moderate",
        effect: "additive CNS depression",
        mechanism: nmda
          ? has(a, "dissociative") || has(b, "dissociative")
            ? "NMDA dissociative × CNS depressant"
            : "alcohol × CNS depressant"
          : "CNS depressant synergy",
        clinical: nmda
          ? `Combining ${a.name} and ${b.name} stacks airway and sedative risk. NMDA dissociatives plus benzodiazepines or alcohol also blunt ketamine/esketamine antidepressant response. This is not a recreational pairing map — it is a respiratory-depression warning.`
          : `Additive sedation and respiratory depression with ${a.name} and ${b.name}. Extra caution in older adults and sleep-disordered breathing.`,
        tags: ["cns"],
      }),
    );
  }

  const qtScore = (x: Drug) => (has(x, "qt-known") ? 2 : has(x, "qt-possible") ? 1 : 0);
  const qt = qtScore(a) + qtScore(b);
  if (qtScore(a) && qtScore(b)) {
    const methadoneQt = a.id === "methadone" || b.id === "methadone";
    out.push(
      pdPair(a, b, {
        suffix: "pd-qt",
        severity: qt >= 3 ? "major" : "moderate",
        effect: "additive QT prolongation / TdP",
        mechanism: methadoneQt ? "methadone QT stack" : "combined QT load",
        clinical: methadoneQt
          ? `Methadone is a known-QT opioid. ${a.id === "methadone" ? b.name : a.name} adds ventricular-repolarization load. Check K and Mg, pull an ECG if the pair cannot be separated, and do not treat Vistaril / Zofran / Celexa / Seroquel as free extras at the window.`
          : `Both drugs prolong ventricular repolarization. Stacking QT risk raises torsades de pointes. Check electrolytes, avoid other QT drugs, and review ECG if the pair cannot be separated.`,
        tags: methadoneQt ? ["qt", "mat"] : ["qt"],
      }),
    );
  }

  const bleedA = has(a, "anticoagulant") || has(a, "antiplatelet") || has(a, "nsaid");
  const bleedB = has(b, "anticoagulant") || has(b, "antiplatelet") || has(b, "nsaid");
  const ssriBleed =
    (has(a, "ssri-snri") && (has(b, "anticoagulant") || has(b, "nsaid") || has(b, "antiplatelet"))) ||
    (has(b, "ssri-snri") && (has(a, "anticoagulant") || has(a, "nsaid") || has(a, "antiplatelet")));
  if (
    (bleedA && bleedB && !(has(a, "nsaid") && has(b, "nsaid") && !has(a, "anticoagulant") && !has(b, "anticoagulant") && !has(a, "antiplatelet") && !has(b, "antiplatelet"))) ||
    ssriBleed
  ) {
    const twoAc = has(a, "anticoagulant") && has(b, "anticoagulant");
    const acPlus = (has(a, "anticoagulant") || has(b, "anticoagulant")) && (has(a, "nsaid") || has(b, "nsaid") || has(a, "antiplatelet") || has(b, "antiplatelet"));
    out.push(
      pdPair(a, b, {
        suffix: "pd-bleed",
        severity: twoAc || acPlus ? "major" : "moderate",
        effect: "additive bleeding",
        mechanism: "hemostasis synergy",
        clinical: `Combined effects on coagulation, platelets, or gastric mucosa raise bleed risk (GI, intracranial). SSRIs add platelet-serotonin depletion. Reconsider gastroprotection and the need for every agent.`,
        tags: ["bleeding"],
      }),
    );
  } else if (has(a, "nsaid") && has(b, "nsaid") && !isAsaNsaid(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-nsaid",
        severity: "moderate",
        effect: "stacked NSAID toxicity",
        mechanism: "duplicate NSAID",
        clinical: "Two NSAIDs (including aspirin at anti-inflammatory doses) raise GI bleed and renal risk without extra analgesia.",
        tags: ["bleeding", "renal"],
      }),
    );
  }

  if (
    (has(a, "anticoagulant") || has(b, "anticoagulant") || a.id === "lithium" || b.id === "lithium") &&
    (has(a, "nsaid") || has(b, "nsaid")) &&
    (a.id === "lithium" || b.id === "lithium")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lithium-nsaid",
        severity: "major",
        effect: "↑ lithium level",
        mechanism: "NSAID reduced lithium clearance",
        clinical:
          "NSAIDs reduce renal lithium clearance and can precipitate lithium toxicity. Prefer acetaminophen for pain, or monitor levels closely.",
        tags: ["lithium", "renal"],
      }),
    );
  }

  if (
    (has(a, "acei-arb") || has(b, "acei-arb")) &&
    (has(a, "nsaid") || has(b, "nsaid")) &&
    (a.id === "lithium" || b.id === "lithium") === false
  ) {
    // lithium handled above; ACEI + NSAID still nephrotoxic
  }

  if ((has(a, "acei-arb") && has(b, "nsaid")) || (has(b, "acei-arb") && has(a, "nsaid"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-acei-nsaid",
        severity: "moderate",
        effect: "afferent + efferent renal hit",
        mechanism: "ACEI/ARB × NSAID",
        clinical:
          "ACE inhibitors/ARBs dilate the efferent arteriole; NSAIDs constrict the afferent. Together they drop GFR — the start of the 'triple whammy' when a diuretic is added.",
        tags: ["renal"],
      }),
    );
  }

  if ((has(a, "acei-arb") && has(b, "k-sparing")) || (has(b, "acei-arb") && has(a, "k-sparing"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-hyperk",
        severity: "major",
        effect: "hyperkalemia",
        mechanism: "RAAS blockade × potassium retention",
        clinical:
          "ACEI/ARB plus a potassium-sparing agent (spironolactone, TMP-SMX) can produce life-threatening hyperkalemia. Check potassium and creatinine, especially in CKD.",
        tags: ["potassium"],
      }),
    );
  }

  if (
    (has(a, "acei-arb") && (b.id === "lithium")) ||
    (has(b, "acei-arb") && a.id === "lithium") ||
    (has(a, "loop-thiazide") && b.id === "lithium") ||
    (has(b, "loop-thiazide") && a.id === "lithium")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lithium-renal",
        severity: "major",
        effect: "↑ lithium level",
        mechanism: "reduced lithium clearance",
        clinical:
          "ACE inhibitors, ARBs, and thiazides reduce lithium clearance. This is a classic precipitant of lithium toxicity.",
        tags: ["lithium"],
      }),
    );
  }

  if (
    (has(a, "hypoglycemic") && has(b, "hypoglycemic")) ||
    (has(a, "insulin-secretagogue") && (b.id === "ciprofloxacin" || b.id === "levofloxacin" || b.id === "moxifloxacin")) ||
    (has(b, "insulin-secretagogue") && (a.id === "ciprofloxacin" || a.id === "levofloxacin" || a.id === "moxifloxacin"))
  ) {
    const glpInsulin =
      (GLP.has(a.id) && isInsulinId(b.id)) || (GLP.has(b.id) && isInsulinId(a.id));
    if (!glpInsulin) {
      out.push(
        pdPair(a, b, {
          suffix: "pd-hypoglycemia",
          severity: "moderate",
          effect: "stacked hypoglycemia",
          mechanism: "glucose-lowering synergy",
          clinical:
            "Combined glucose-lowering (or a fluoroquinolone with a sulfonylurea) can produce severe hypoglycemia. Recheck home glucose and consider dose reduction.",
          tags: ["glucose"],
        }),
      );
    }
  }

  if (
    (GLP.has(a.id) && (has(b, "insulin-secretagogue") || isInsulinId(b.id))) ||
    (GLP.has(b.id) && (has(a, "insulin-secretagogue") || isInsulinId(a.id)))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-glp-secretagogue",
        severity: "moderate",
        effect: "stacked hypoglycemia",
        mechanism: "GLP-1 / GIP agonist × insulin or secretagogue",
        clinical:
          "Semaglutide and tirzepatide rarely cause hypoglycemia alone. Next to a sulfonylurea or insulin they do. Metformin on this desk should stay quieter. Not a CYP row.",
        tags: ["glucose"],
      }),
    );
  }

  if (has(a, "anticholinergic") && has(b, "anticholinergic")) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-ach",
        severity: "moderate",
        effect: "anticholinergic burden",
        mechanism: "additive muscarinic blockade",
        clinical:
          "Stacked anticholinergic load: confusion, urinary retention, constipation, dry mouth, and falls — especially in older adults.",
        tags: ["anticholinergic"],
      }),
    );
  }

  if (
    (has(a, "beta-blocker") && has(b, "ndhp-ccb")) ||
    (has(b, "beta-blocker") && has(a, "ndhp-ccb")) ||
    (has(a, "bradycardic") && has(b, "bradycardic") && (has(a, "ndhp-ccb") || has(b, "ndhp-ccb") || a.id === "amiodarone" || b.id === "amiodarone" || a.id === "donepezil" || b.id === "donepezil"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-brady",
        severity: "major",
        effect: "bradycardia / AV block",
        mechanism: "additive nodal depression",
        clinical: `Both ${a.name} and ${b.name} slow sinus and AV nodal conduction. Combined use can cause symptomatic bradycardia or heart block.`,
        tags: ["bradycardia"],
      }),
    );
  }

  if ((has(a, "nitrate") && has(b, "pde5")) || (has(b, "nitrate") && has(a, "pde5"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-nitrate-pde5",
        severity: "contraindicated",
        effect: "catastrophic hypotension",
        mechanism: "nitrate × PDE5 inhibitor",
        clinical:
          "PDE5 inhibitors potentiate nitric-oxide-mediated vasodilation. Nitrates plus sildenafil/tadalafil can cause refractory hypotension and are contraindicated (wait 24 h after sildenafil, 48 h after tadalafil).",
        tags: ["hypotension"],
      }),
    );
  }

  if ((has(a, "pde5") && has(b, "alpha-blocker")) || (has(b, "pde5") && has(a, "alpha-blocker"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-pde5-alpha",
        severity: "moderate",
        effect: "orthostatic hypotension",
        mechanism: "PDE5 × alpha blocker",
        clinical: "Both dilate vascular smooth muscle. Separate dosing and watch for first-dose syncope.",
        tags: ["hypotension"],
      }),
    );
  }

  if ((has(a, "alpha-blocker") && has(b, "alcohol")) || (has(b, "alpha-blocker") && has(a, "alcohol"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-alpha-etoh",
        severity: "moderate",
        effect: "orthostatic hypotension",
        mechanism: "alpha blocker × alcohol",
        clinical:
          "Prazosin and other α1-blockers drop standing blood pressure. Alcohol stacks the orthostasis — first-dose syncope, not a CYP row.",
        tags: ["hypotension", "alcohol"],
      }),
    );
  }

  if ((has(a, "statin") && has(b, "fibrate")) || (has(b, "statin") && has(a, "fibrate"))) {
    const simLova =
      a.id === "simvastatin" ||
      b.id === "simvastatin" ||
      a.id === "lovastatin" ||
      b.id === "lovastatin" ||
      a.id === "red-yeast-rice" ||
      b.id === "red-yeast-rice";
    const gem = a.id === "gemfibrozil" || b.id === "gemfibrozil";
    out.push(
      pdPair(a, b, {
        suffix: "pd-statin-fibrate",
        severity: simLova && gem ? "contraindicated" : "major",
        effect: "myopathy / rhabdomyolysis",
        mechanism: "statin × fibrate",
        clinical:
          "Gemfibrozil with simvastatin, lovastatin, or red yeast rice is contraindicated. Other statin–fibrate pairs still raise rhabdomyolysis risk; prefer fenofibrate if a fibrate is required.",
        tags: ["myopathy"],
      }),
    );
  }

  if (has(a, "seizure-lowering") && has(b, "seizure-lowering") && !isCarbapenemValproate(a.id, b.id)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-seizure",
        severity: "moderate",
        effect: "lowered seizure threshold",
        mechanism: "stacked proconvulsant effect",
        clinical: `Both ${a.name} and ${b.name} can lower seizure threshold. Extra caution with tramadol, bupropion, or clozapine combinations.`,
        tags: ["seizure"],
      }),
    );
  }

  if (
    (a.id === "methotrexate" && (has(b, "nsaid") || b.id === "tmp-smx")) ||
    (b.id === "methotrexate" && (has(a, "nsaid") || a.id === "tmp-smx"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-mtx",
        severity: "major",
        effect: "methotrexate toxicity",
        mechanism: "reduced MTX clearance",
        clinical:
          "NSAIDs and trimethoprim–sulfamethoxazole reduce methotrexate clearance and add marrow/mucosal toxicity. This pairing is a classic cause of MTX disaster.",
        tags: ["marrow"],
      }),
    );
  }

  const xoSub = new Set(["azathioprine", "mercaptopurine"]);
  const xoInh = new Set(["allopurinol", "febuxostat"]);
  if ((xoSub.has(a.id) && xoInh.has(b.id)) || (xoSub.has(b.id) && xoInh.has(a.id))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-xo-thiopurine",
        severity: "contraindicated",
        effect: "life-threatening myelosuppression",
        mechanism: "xanthine oxidase × thiopurine",
        clinical:
          "Allopurinol and febuxostat block xanthine oxidase, the clearance path for 6-mercaptopurine. Azathioprine/6-MP then behaves like a multiple of the prescribed dose — pancytopenia, not a gout footnote. Labeled contraindicated or a drastic dose-cut; this desk scores it contraindicated. Not a CYP isoform.",
        tags: ["marrow", "xo"],
      }),
    );
  }

  if (
    (a.id === "warfarin" && VITK_FOOD.has(b.id)) ||
    (b.id === "warfarin" && VITK_FOOD.has(a.id))
  ) {
    const food = a.id === "warfarin" ? b : a;
    const kale = food.id === "leafy-greens";
    const soy = food.id === "soy";
    out.push(
      pdPair(a, b, {
        suffix: soy ? "pd-soy-warfarin" : kale ? "pd-greens-warfarin" : "pd-vitk-warfarin",
        severity: "major",
        effect: "loss of anticoagulation",
        mechanism: soy
          ? "soy vitamin K + T4-binder overlap"
          : kale
            ? "dietary phylloquinone"
            : "vitamin K bypass of VKORC1",
        clinical: soy
          ? "Soy protein and soy milk carry vitamin K and also bind levothyroxine. INR can fall. A splash of soy sauce is the tyramine row, not this one. Recheck INR after a soy-protein phase."
          : kale
            ? "Warfarin blocks vitamin K recycling. A kale-heavy smoothie supplies phylloquinone and INR falls. A consistent salad is easier to adjust around than a binge. The K gummy is a different row. Not 2C9."
            : "Warfarin blocks vitamin K recycling. A K gummy, MK-7, or a kale-heavy smoothie supplies the cofactor and INR falls — the antidote in a bottle. Not a 2C9 story. Recheck INR after diet or supplement changes.",
        tags: ["bleeding", "food"],
      }),
    );
  }

  if (
    (a.id === "warfarin" && (b.id === "glucosamine" || b.id === "coq10")) ||
    (b.id === "warfarin" && (a.id === "glucosamine" || a.id === "coq10"))
  ) {
    const coq = a.id === "coq10" || b.id === "coq10";
    out.push(
      pdPair(a, b, {
        suffix: coq ? "pd-coq-warfarin" : "pd-glucosamine-warfarin",
        severity: "moderate",
        effect: coq ? "possible INR drop" : "possible INR rise",
        mechanism: coq ? "CoQ10 vitamin-K–like structure" : "glucosamine × warfarin (hemostasis)",
        clinical: coq
          ? "Coenzyme Q10 resembles vitamin K. INR can fall — quieter and less consistent than a K gummy, still worth mapping."
          : "Glucosamine (often with chondroitin) can raise INR. Formulation-dependent. Recheck after a new joint bottle.",
        tags: ["bleeding", "food"],
      }),
    );
  }

  const cations = new Set(["calcium", "iron", "magnesium", "zinc", "dairy"]);
  const chelated = new Set([
    "ciprofloxacin",
    "levofloxacin",
    "moxifloxacin",
    "doxycycline",
    "tetracycline",
    "levothyroxine",
    "alendronate",
    "levodopa",
  ]);
  if ((cations.has(a.id) && chelated.has(b.id)) || (cations.has(b.id) && chelated.has(a.id))) {
    const thyroid = a.id === "levothyroxine" || b.id === "levothyroxine";
    const bone = a.id === "alendronate" || b.id === "alendronate";
    const dopa = a.id === "levodopa" || b.id === "levodopa";
    const milk = a.id === "dairy" || b.id === "dairy";
    out.push(
      pdPair(a, b, {
        suffix: "pd-chelation",
        severity: "major",
        effect: thyroid
          ? "lost levothyroxine absorption"
          : bone
            ? "lost bisphosphonate absorption"
            : dopa
              ? "lost levodopa absorption"
              : "lost antibiotic absorption",
        mechanism: milk ? "gut chelation by dietary calcium" : "gut chelation by divalent cations",
        clinical: thyroid
          ? milk
            ? "A glass of milk, a latte, or yogurt binds levothyroxine in the gut. Morning cereal with Synthroid is a classic empty TSH. Separate by several hours. Aged-cheese MAOI is a different row."
            : "Calcium, iron, magnesium, and zinc bind levothyroxine in the gut. A prenatal or a Tums with the morning dose is a classic empty TSH. Separate by several hours. Not CYP."
          : bone
            ? "Bisphosphonates already have miserable F. Dairy, calcium, and other cations empty the dose. Thirty minutes before food, full glass of water, stay upright. Not CYP."
            : dopa
              ? "Iron (and to a lesser extent calcium) chelates levodopa in the gut. A protein meal is a different, LAT1 story — this row is the mineral."
              : milk
                ? "Fluoroquinolones and tetracyclines chelate with the calcium in milk and yogurt. The course can fail. Tetracycline is worse than doxycycline. Separate by several hours. Not CYP."
                : "Fluoroquinolones and tetracyclines chelate with calcium, iron, magnesium, and zinc. The course can fail. Separate by several hours. Not CYP.",
        tags: ["absorption", "food"],
      }),
    );
  }

  const charcoalVictims = new Set([
    "levothyroxine",
    "warfarin",
    "digoxin",
    "carbamazepine",
    "valproate",
    "lamotrigine",
    "ethinyl-estradiol",
    "apixaban",
    "rivaroxaban",
  ]);
  const gutBinders = new Set(["charcoal", "psyllium"]);
  if (
    (gutBinders.has(a.id) && charcoalVictims.has(b.id)) ||
    (gutBinders.has(b.id) && charcoalVictims.has(a.id))
  ) {
    const fiber = a.id === "psyllium" || b.id === "psyllium";
    out.push(
      pdPair(a, b, {
        suffix: fiber ? "pd-psyllium-bind" : "pd-charcoal-bind",
        severity: "major",
        effect: "lost oral absorption",
        mechanism: fiber ? "viscous fiber binding" : "activated charcoal adsorption",
        clinical: fiber
          ? "Psyllium and other viscous fibers bind levothyroxine, digoxin, and some anticonvulsants in the gut. A Metamucil with the morning Synthroid is an empty TSH. Separate by several hours. Not CYP."
          : "Activated charcoal binds co-administered oral drugs in the gut. Levothyroxine, warfarin, anticonvulsants, and OCPs never arrive. Separate by several hours. Not the charred-meat 1A2 row.",
        tags: ["absorption", "food"],
      }),
    );
  }

  if ((a.id === "niacin" && has(b, "statin")) || (b.id === "niacin" && has(a, "statin"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-niacin-statin",
        severity: "major",
        effect: "myopathy / rhabdomyolysis",
        mechanism: "niacin × statin",
        clinical:
          "Gram-dose nicotinic acid plus a statin (including red yeast rice / monacolin K) raises muscle toxicity. Flush B3 is the row — a B-complex is not.",
        tags: ["myopathy", "food"],
      }),
    );
  }

  const noDonors = new Set(["arginine", "citrulline"]);
  if ((noDonors.has(a.id) && has(b, "pde5")) || (noDonors.has(b.id) && has(a, "pde5"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-arginine-pde5",
        severity: "moderate",
        effect: "additive hypotension",
        mechanism: "L-arginine / citrulline NO × PDE5",
        clinical:
          "Arginine and citrulline feed nitric oxide. PDE5 inhibitors stack the vasodilation. Quieter than a nitrate — not labeled contraindicated — still a first-dose syncope watch, especially in a pre-workout.",
        tags: ["hypotension", "food"],
      }),
    );
  }

  if ((a.id === "icariin" && has(b, "nitrate")) || (b.id === "icariin" && has(a, "nitrate"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-icariin-nitrate",
        severity: "major",
        effect: "stacked hypotension",
        mechanism: "herbal PDE5-like × nitrate",
        clinical:
          "Icariin is a weak herbal PDE5 hit. Next to a nitrate it is stacked NO vasodilation — not labeled like Viagra, still a first-dose syncope watch. The 'natural Viagra' bottle is the row.",
        tags: ["hypotension", "food"],
      }),
    );
  }

  if ((a.id === "icariin" && has(b, "pde5")) || (b.id === "icariin" && has(a, "pde5"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-icariin-pde5",
        severity: "moderate",
        effect: "stacked PDE5 vasodilation",
        mechanism: "icariin × PDE5 inhibitor",
        clinical:
          "Horny goat weed is sold as natural Viagra. Stacked with sildenafil or tadalafil it is duplicate PDE5 tone — first-dose syncope, not a free extra.",
        tags: ["hypotension", "food"],
      }),
    );
  }

  if (
    (a.id === "hawthorn" && b.id === "digoxin") ||
    (b.id === "hawthorn" && a.id === "digoxin")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-hawthorn-dig",
        severity: "moderate",
        effect: "additive inotrope / bradycardia",
        mechanism: "hawthorn × digoxin",
        clinical:
          "Hawthorn has inotrope and vasodilator effects. Next to digoxin it is stacked cardiac PD, not a 3A4 row. Watch pulse and pressure.",
        tags: ["cardiac", "food"],
      }),
    );
  }

  if (
    has(a, "nephrotoxic") &&
    has(b, "nephrotoxic") &&
    !isVancoZosyn(a.id, b.id) &&
    !isDualRaas(a.id, b.id) &&
    !isSglt2Loop(a.id, b.id)
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-nephro",
        severity: "moderate",
        effect: "stacked nephrotoxicity",
        mechanism: "additive kidney injury",
        clinical: `Both ${a.name} and ${b.name} can injure the kidney. Monitor creatinine and volume status.`,
        tags: ["renal"],
      }),
    );
  }

  if ((has(a, "maoi") && has(b, "stimulant")) || (has(b, "maoi") && has(a, "stimulant"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-maoi-stim",
        severity: "contraindicated",
        effect: "hypertensive crisis",
        mechanism: "MAOI × stimulant",
        clinical:
          "MAOIs plus amphetamines, methylphenidate, cocaine, MDMA, or other stimulants can produce a paroxysmal pressor crisis. This pairing is contraindicated.",
        tags: ["pressor", "maoi"],
      }),
    );
  }

  if (
    (a.id === "cocaine" && has(b, "alcohol")) ||
    (b.id === "cocaine" && has(a, "alcohol"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-cocaethylene",
        severity: "major",
        effect: "cocaethylene cardiotoxicity",
        mechanism: "cocaine × ethanol transesterification",
        clinical:
          "Ethanol plus cocaine forms cocaethylene, a longer-lived metabolite with more arrhythmia, seizure, and hepatic risk than cocaine alone. The mixer is not a come-down — it stretches the cardiotoxic species.",
        tags: ["cardiac", "alcohol", "street"],
      }),
    );
  }

  if ((has(a, "stimulant") && bOp) || (has(b, "stimulant") && aOp)) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-speedball",
        severity: "major",
        effect: "masked respiratory depression / arrhythmia",
        mechanism: "stimulant × opioid (speedball / goofball)",
        clinical:
          "Cocaine or methamphetamine plus an opioid is a speedball (cocaine) or goofball (meth). The stimulant keeps the person looking awake while the opioid still stops them breathing — apnea often lands when the stimulant wears off. A methadone take-home plus cocaine is the same map, with QT on top. This is not a recreational pairing map.",
        tags: ["cns", "stimulant", "street"],
      }),
    );
  }

  if (
    (a.id === "methadone" && RITONAVIR_BOOST.has(b.id)) ||
    (b.id === "methadone" && RITONAVIR_BOOST.has(a.id))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-methadone-ritonavir",
        severity: "major",
        effect: "methadone may fall / withdrawal",
        mechanism: "ritonavir-boosted 3A4 inhibit vs 2B6/UGT dump",
        clinical:
          "The 3A4 arrow is the wrong one for methadone. Acute ritonavir (Paxlovid) and steady-state ritonavir still drop methadone — watch withdrawal at the window, not nod. Fentanyl on the same booster is the opposite: parent rises, airway risk climbs. This is not a dosing protocol.",
        tags: ["mat", "cyp"],
      }),
    );
  }

  if (
    (a.id === "buprenorphine" && (RITONAVIR_BOOST.has(b.id) || b.id === "cobicistat")) ||
    (b.id === "buprenorphine" && (RITONAVIR_BOOST.has(a.id) || a.id === "cobicistat"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-bup-ritonavir",
        severity: "moderate",
        effect: "buprenorphine parent may climb",
        mechanism: "3A4 inhibit of a partial agonist — opposite of methadone",
        clinical:
          "Opposite of methadone. Ritonavir, Paxlovid, and cobicistat raise buprenorphine via 3A4 (McCance-Katz: ~50% with ritonavir) without the withdrawal map. Tolerant patients usually do not need a cut. Watch nod; do not treat it like a stolen methadone bottle. Fentanyl on the same booster is the airway climb. This is not a dosing protocol.",
        tags: ["mat", "cyp"],
      }),
    );
  }

  if (
    (has(a, "opioid-antagonist") && has(b, "opioid")) ||
    (has(b, "opioid-antagonist") && has(a, "opioid"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-antag-opioid",
        severity: "major",
        effect: "precipitated withdrawal / blocked analgesia",
        mechanism: "opioid antagonist × agonist",
        clinical:
          "Naltrexone or naloxone will displace full and partial agonists from the mu receptor. IM naltrexone (Vivitrol) still occupies μ for weeks — leftover fentanyl or a 'just this once' agonist is precipitated withdrawal, not a slip that didn't work. In anyone it means lost opioid analgesia.",
        tags: ["opioid", "mat"],
      }),
    );
  }

  if (
    (has(a, "psychedelic") && b.id === "lithium") ||
    (has(b, "psychedelic") && a.id === "lithium")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lithium-psychedelic",
        severity: "major",
        effect: "seizures / severe psychotoxicity",
        mechanism: "lithium × serotonergic psychedelic",
        clinical:
          "Lithium combined with psilocybin or LSD has a documented signal for seizures and prolonged adverse reactions. Do not stack them.",
        tags: ["seizure", "lithium"],
      }),
    );
  }

  if (has(a, "stimulant") && has(b, "stimulant")) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-stim-stack",
        severity: "moderate",
        effect: "stacked sympathomimetic load",
        mechanism: "stimulant × stimulant",
        clinical: `Combined ${a.name} and ${b.name} raise heart rate, blood pressure, and seizure risk. Watch for hyperthermia and arrhythmia.`,
        tags: ["stimulant"],
      }),
    );
  }

  if (has(a, "dissociative") && has(b, "dissociative")) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-nmda-stack",
        severity: "major",
        effect: "stacked NMDA blockade",
        mechanism: "dissociative × dissociative",
        clinical:
          "Two NMDA antagonists (ketamine, analogues, DXM, PCP, ibogaine) compound dissociation, blood-pressure swings, and airway risk.",
        tags: ["nmda"],
      }),
    );
  }

  if ((has(a, "tyramine") && has(b, "maoi")) || (has(b, "tyramine") && has(a, "maoi"))) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-tyramine-maoi",
        severity: "contraindicated",
        effect: "hypertensive crisis",
        mechanism: "tyramine × MAOI",
        clinical:
          "MAO-A in gut and liver normally destroys dietary tyramine. An irreversible MAOI lets it into the circulation — aged cheese, cured meat, tap beer, soy. Headache, neck stiffness, and stroke-range blood pressure can follow in minutes.",
        tags: ["food", "maoi", "tyramine"],
      }),
    );
  }

  if (
    (has(a, "tryptophan") && has(b, "serotonergic") && !has(b, "tryptophan")) ||
    (has(b, "tryptophan") && has(a, "serotonergic") && !has(a, "tryptophan"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-htp",
        severity: has(a, "maoi") || has(b, "maoi") ? "contraindicated" : "major",
        effect: "precursor plus reuptake/MAO block",
        mechanism: "5-HTP / tryptophan × serotonergic",
        clinical:
          "A serotonin precursor stacked on an SSRI, MAOI, MDMA, or DXM is extra 5-HT, not a gentle sleep stack.",
        tags: ["food", "serotonin"],
      }),
    );
  }

  if (
    (has(a, "fat-meal") && has(b, "cannabinoid")) ||
    (has(b, "fat-meal") && has(a, "cannabinoid"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-fat-cannabinoid",
        severity: "moderate",
        effect: "↑ oral cannabinoid AUC",
        mechanism: "fed-state lymphatic absorption",
        clinical:
          "A high-fat meal can several-fold increase oral THC and CBD exposure. Same milligrams, much more parent drug in plasma.",
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (has(a, "fat-meal") && has(b, "fed-boost")) ||
    (has(b, "fat-meal") && has(a, "fed-boost"))
  ) {
    const victim = has(a, "fed-boost") ? a : b;
    const posa = victim.id === "posaconazole";
    out.push(
      pdPair(a, b, {
        suffix: "pd-fed-boost",
        severity: "moderate",
        effect: posa ? "↑ posaconazole suspension AUC" : "↑ oral antipsychotic F",
        mechanism: posa ? "fed-state azole absorption" : "labeled caloric requirement",
        clinical: posa
          ? "Posaconazole oral suspension wants a meal. Fasted F collapses. Delayed-release tablets are quieter with food — still map the suspension. This is absorption, not the 3A4-inhibitor row."
          : victim.id === "lurasidone"
            ? "Lurasidone is labeled with food (~350 kcal). Fasted AUC falls by about half. Grapefruit is the 3A4 row; this is calories. Not a dose from this desk."
            : "Ziprasidone is labeled with a ~500 kcal meal. Fasted AUC can fall by half and QT risk is read against the fed curve. Not a CYP collision.",
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (has(a, "fat-meal") && has(b, "empty-stomach")) ||
    (has(b, "fat-meal") && has(a, "empty-stomach"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-food-alendronate",
        severity: "major",
        effect: "lost bisphosphonate absorption",
        mechanism: "any meal collapses Fosamax F",
        clinical:
          "Alendronate already has miserable bioavailability. A meal, coffee, or calcium empties it. Thirty minutes before food, full glass of water, stay upright. Opposite of Latuda, which wants calories.",
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (has(a, "sodium-restriction") && b.id === "lithium") ||
    (has(b, "sodium-restriction") && a.id === "lithium")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lithium-low-salt",
        severity: "major",
        effect: "↑ lithium level",
        mechanism: "sodium restriction / dehydration",
        clinical:
          "Lithium is handled like sodium in the proximal tubule. A low-salt stretch, fever, or heavy sweat can push a stable dose into toxicity (tremor, confusion, diarrhea).",
        tags: ["food", "lithium"],
      }),
    );
  }

  if (
    (has(a, "sodium-load") && b.id === "lithium") ||
    (has(b, "sodium-load") && a.id === "lithium")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-lithium-high-salt",
        severity: "moderate",
        effect: "↓ lithium level",
        mechanism: "sodium load increases lithium clearance",
        clinical: "A sudden salt load can drop lithium and lose mood coverage. Opposite of restriction.",
        tags: ["food", "lithium"],
      }),
    );
  }

  if (
    (has(a, "urinary-alkaline") && has(b, "stimulant")) ||
    (has(b, "urinary-alkaline") && has(a, "stimulant"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-alk-stim",
        severity: "major",
        effect: "↑ amphetamine exposure / duration",
        mechanism: "alkaline urine reabsorbs weak bases",
        clinical:
          "Bicarbonate and antacids trap amphetamine in the tubule. Duration and peak climb; MAOI or other stimulant stacks get worse.",
        tags: ["food", "stimulant"],
      }),
    );
  }

  if (
    (has(a, "urinary-acid") && has(b, "stimulant")) ||
    (has(b, "urinary-acid") && has(a, "stimulant"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-acid-stim",
        severity: "moderate",
        effect: "↓ amphetamine duration",
        mechanism: "acid urine speeds excretion",
        clinical:
          "Vitamin C and acidic juices ionize amphetamine and shorten its effect. Orange juice is a pH story; grapefruit is the 3A4 furanocoumarin; apple/orange juice cutting Allegra is OATP — they are not interchangeable.",
        tags: ["food", "stimulant"],
      }),
    );
  }

  if (
    (OATP_PERP.has(a.id) && OATP_VICTIM.has(b.id)) ||
    (OATP_PERP.has(b.id) && OATP_VICTIM.has(a.id))
  ) {
    const victim = OATP_VICTIM.has(a.id) ? a : b;
    const perp = OATP_PERP.has(a.id) ? a : b;
    const allegra = victim.id === "fexofenadine";
    out.push(
      pdPair(a, b, {
        suffix: "pd-oatp-juice",
        severity: allegra ? "major" : "moderate",
        effect: `↓ ${victim.name} absorption`,
        mechanism: "OATP2B1 / OATP1A2 inhibition",
        clinical: allegra
          ? `${perp.name} blocks intestinal OATP. Fexofenadine never arrives — loss of antihistamine effect, not a CYP rise. Grapefruit also knocks out gut 3A4 for other drugs; apple and orange juice do not. Separate the juice by several hours.`
          : `${perp.name} blocks intestinal OATP. ${victim.name} AUC falls — loss of effect, not stacked beta blockade or RAAS. Green-tea extract and apple/orange juice are the documented bullies (Misaka, Dresser). Not CYP3A4.`,
        tags: ["food", "oatp", "absorption"],
      }),
    );
  }

  if (
    (has(a, "protein-load") && b.id === "levodopa") ||
    (has(b, "protein-load") && a.id === "levodopa")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-protein-ldopa",
        severity: "major",
        effect: "lost levodopa 'on' time",
        mechanism: "LAT1 competition (large-neutral amino acids)",
        clinical:
          "Leucine, phenylalanine, and tyrosine compete with levodopa at LAT1 in the gut and at the blood-brain barrier. A protein breakfast next to Sinemet is a motor fluctuation. Iron chelation is a different row. Not CYP.",
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (has(a, "polyphenol-drink") && T4_POLYPHENOL.has(b.id)) ||
    (has(b, "polyphenol-drink") && T4_POLYPHENOL.has(a.id))
  ) {
    const victim = T4_POLYPHENOL.has(a.id) ? a : b;
    out.push(
      pdPair(a, b, {
        suffix: "pd-tannin-bind",
        severity: "major",
        effect:
          victim.id === "iron"
            ? "lost iron absorption"
            : victim.id === "alendronate"
              ? "lost bisphosphonate absorption"
              : "lost levothyroxine absorption",
        mechanism: "polyphenol / tannin binding",
        clinical:
          victim.id === "levothyroxine"
            ? "Coffee and black tea bind levothyroxine in the gut (Benvenga). An espresso with the morning dose is an empty TSH. Caffeine-as-1A2-substrate is a different bottle. Wait 30–60 minutes."
            : victim.id === "iron"
              ? "Tannins in coffee and tea chelate iron. A cup with the ferrous sulfate tablet empties the dose. Not the 1A2 caffeine row."
              : "Coffee with Fosamax is still a meal as far as the bisphosphonate is concerned. Empty stomach, water only, stay upright.",
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (a.id === "soy" && b.id === "levothyroxine") ||
    (b.id === "soy" && a.id === "levothyroxine")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-soy-t4",
        severity: "major",
        effect: "lost levothyroxine absorption",
        mechanism: "soy protein binding in the gut",
        clinical:
          "Soy formula and soy-protein shakes bind levothyroxine. A splash of soy sauce is the tyramine row, not this one. Separate by several hours. Warfarin vitamin-K overlap is a separate finding if both are on the desk.",
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (has(a, "k-food") && (has(b, "acei-arb") || has(b, "k-sparing"))) ||
    (has(b, "k-food") && (has(a, "acei-arb") || has(a, "k-sparing")))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-k-food",
        severity: "major",
        effect: "hyperkalemia",
        mechanism: "dietary potassium × RAAS / K-sparing",
        clinical:
          "Bananas, potatoes, coconut water, and salt-substitute KCl next to an ACEI/ARB or spironolactone are the hyperK triad without a Slow-K bottle. Recheck potassium after a diet change. The potassium-supplement row is separate.",
        tags: ["food", "electrolyte"],
      }),
    );
  }

  if (
    (has(a, "histamine") && (b.id === "isoniazid" || has(b, "maoi"))) ||
    (has(b, "histamine") && (a.id === "isoniazid" || has(a, "maoi")))
  ) {
    const inh = a.id === "isoniazid" || b.id === "isoniazid";
    out.push(
      pdPair(a, b, {
        suffix: "pd-histamine-fish",
        severity: inh ? "major" : "moderate",
        effect: inh ? "scombroid-like reaction" : "histamine / tyramine overlap",
        mechanism: inh ? "isoniazid × diamine oxidase" : "histamine load × MAOI",
        clinical: inh
          ? "Isoniazid blocks diamine oxidase. Tuna or mackerel that would be mild scombroid in anyone becomes flushing, headache, and palpitations on INH. Not the cheese-plate MAOI row — a different amine."
          : "Aged fish carries histamine and some tyramine. An irreversible MAOI lets both through. The cheddar plate is still the louder MAOI teaching pair.",
        tags: ["food", "histamine"],
      }),
    );
  }

  if (
    (has(a, "enteral") && ENTERAL_VICTIM.has(b.id)) ||
    (has(b, "enteral") && ENTERAL_VICTIM.has(a.id))
  ) {
    const victim = ENTERAL_VICTIM.has(a.id) ? a : b;
    const dilantin = victim.id === "phenytoin";
    out.push(
      pdPair(a, b, {
        suffix: "pd-enteral-bind",
        severity: dilantin ? "major" : "moderate",
        effect: `lost ${victim.name} absorption`,
        mechanism: "tube-feed binding",
        clinical: dilantin
          ? "Bauer 1982. Continuous NG feeds bind phenytoin — levels crash and seizures return. Hold the feed, flush, separate the dose. Not CYP2C9."
          : `Continuous enteral nutrition binds ${victim.name} in the tube and the gut. Hold the feed, flush, separate. Not a cytochrome row.`,
        tags: ["food", "absorption"],
      }),
    );
  }

  if (
    (a.id === "caffeine" && b.id === "lithium") ||
    (b.id === "caffeine" && a.id === "lithium")
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-caffeine-lithium",
        severity: "moderate",
        effect: "↑ lithium clearance while using caffeine",
        mechanism: "caffeine diuresis / renal lithium handling",
        clinical:
          "Caffeine increases lithium clearance. A sudden stop (or a new energy-drink habit) moves the level without a dose change. Opposite direction from low-salt retention. Not 1A2.",
        tags: ["food", "lithium"],
      }),
    );
  }

  if (
    (a.id === "disulfiram" && has(b, "alcohol")) ||
    (b.id === "disulfiram" && has(a, "alcohol"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-disulfiram",
        severity: "contraindicated",
        effect: "acetaldehyde reaction",
        mechanism: "ALDH blockade × ethanol",
        clinical:
          "Disulfiram blocks aldehyde dehydrogenase. Ethanol then dumps acetaldehyde — flushing, vomiting, hypotension, sometimes shock. This is the intended deterrent, and it is not a mild hangover.",
        tags: ["alcohol", "disulfiram"],
      }),
    );
  } else if (
    (a.id === "metronidazole" && has(b, "alcohol")) ||
    (b.id === "metronidazole" && has(a, "alcohol"))
  ) {
    out.push(
      pdPair(a, b, {
        suffix: "pd-metro-etoh",
        severity: "moderate",
        effect: "possible disulfiram-like reaction",
        mechanism: "metronidazole × ethanol",
        clinical:
          "A disulfiram-like reaction with metronidazole is debated but still flagged. Flushing, nausea, and tachycardia are the watch-outs — not a green light to drink on Flagyl.",
        tags: ["alcohol"],
      }),
    );
  }

  if (
    (has(a, "hypokalemic") && (has(b, "qt-known") || has(b, "qt-possible") || b.id === "digoxin")) ||
    (has(b, "hypokalemic") && (has(a, "qt-known") || has(a, "qt-possible") || a.id === "digoxin"))
  ) {
    const dig = a.id === "digoxin" || b.id === "digoxin";
    out.push(
      pdPair(a, b, {
        suffix: "pd-hypok",
        severity: dig ? "major" : "moderate",
        effect: dig ? "digoxin toxicity via hypokalemia" : "hypokalemia plus QT load",
        mechanism: "mineralocorticoid hypokalemia",
        clinical: dig
          ? "Licorice-type hypokalemia plus digoxin is a classic arrhythmia trap. Potassium and digoxin level both belong on the desk."
          : "Glycyrrhizin drops potassium. A QT drug on a low-K background is how torsades gets invited.",
        tags: ["food", "potassium", "qt"],
      }),
    );
  }

  return out;
}

function multiDrugFindings(drugs: Drug[]): Finding[] {
  const out: Finding[] = [];
  if (drugs.length < 3) return out;

  const sero = drugs.filter((d) => has(d, "serotonergic"));
  if (sero.length >= 3) {
    out.push({
      id: "grp-sero-" + sero.map((d) => d.id).sort().join("-"),
      severity: "major",
      kind: "pd",
      drugIds: sero.map((d) => d.id),
      headline: `${sero.length}-drug serotonergic stack`,
      enzymes: [],
      effect: "escalating serotonin syndrome risk",
      mechanism: "multi-drug serotonergic load",
      clinical: `${names(sero.map((d) => d.id)).join(", ")} all increase serotonergic tone. Risk is not strictly pairwise — a third agent often turns a theoretical interaction into a clinical event.`,
      tags: ["serotonin", "stack"],
    });
  }

  const qt = drugs.filter((d) => has(d, "qt-known") || has(d, "qt-possible"));
  const known = qt.filter((d) => has(d, "qt-known"));
  if (qt.length >= 3 || known.length >= 2) {
    out.push({
      id: "grp-qt-" + qt.map((d) => d.id).sort().join("-"),
      severity: known.length >= 2 || qt.length >= 3 ? "major" : "moderate",
      kind: "pd",
      drugIds: qt.map((d) => d.id),
      headline: `QT stack · ${qt.length} agents`,
      enzymes: [],
      effect: "torsades risk",
      mechanism: "cumulative QT load",
      clinical: `${names(qt.map((d) => d.id)).join(", ")} all prolong QT. Cumulative load, hypokalemia, and hypomagnesemia compound torsades risk.`,
      tags: ["qt", "stack"],
    });
  }

  const acei = drugs.filter((d) => has(d, "acei-arb"));
  const nsaid = drugs.filter((d) => has(d, "nsaid"));
  const diu = drugs.filter((d) => has(d, "loop-thiazide"));
  if (acei.length && nsaid.length && diu.length) {
    const triple = [...acei, ...nsaid, ...diu];
    const uniq = [...new Map(triple.map((d) => [d.id, d])).values()];
    out.push({
      id: "grp-triple-" + uniq.map((d) => d.id).sort().join("-"),
      severity: "major",
      kind: "pd",
      drugIds: uniq.map((d) => d.id),
      headline: "Triple whammy · ACEI/ARB + diuretic + NSAID",
      enzymes: [],
      effect: "acute kidney injury",
      mechanism: "afferent constriction + efferent dilation + volume depletion",
      clinical:
        "The 'triple whammy' is a leading cause of community-acquired AKI. Drop the NSAID whenever possible; check creatinine after initiation.",
      tags: ["renal", "stack"],
    });
  }

  const cns = drugs.filter((d) => has(d, "cns-depressant") || has(d, "opioid"));
  if (cns.length >= 3) {
    out.push({
      id: "grp-cns-" + cns.map((d) => d.id).sort().join("-"),
      severity: "major",
      kind: "pd",
      drugIds: cns.map((d) => d.id),
      headline: `${cns.length}-drug CNS depressant stack`,
      enzymes: [],
      effect: "sedation / respiratory depression",
      mechanism: "multi-drug CNS depression",
      clinical: `${names(cns.map((d) => d.id)).join(", ")} all depress the CNS. Three or more is a high-risk combination, especially with an opioid.`,
      tags: ["cns", "stack"],
    });
  }

  const stim = drugs.filter((d) => has(d, "stimulant"));
  const op = drugs.filter((d) => has(d, "opioid"));
  const a2 = drugs.filter((d) => has(d, "alpha2-agonist"));
  if (stim.length && op.length && a2.length) {
    const mix = [...new Map([...stim, ...op, ...a2].map((d) => [d.id, d])).values()];
    out.push({
      id: "grp-speedball-tranq-" + mix.map((d) => d.id).sort().join("-"),
      severity: "major",
      kind: "pd",
      drugIds: mix.map((d) => d.id),
      headline: "Speedball on a tranq supply",
      enzymes: [],
      effect: "masked apnea plus α2 that naloxone will not reverse",
      mechanism: "stimulant × opioid × α2-agonist",
      clinical: `${names(mix.map((d) => d.id)).join(", ")} — cocaine or meth on a fentanyl/xylazine fold. The stimulant wears off first; the μ and α2 keep the airway down. Extra naloxone will not wake an α2.`,
      tags: ["cns", "stimulant", "alpha2", "street", "stack"],
    });
  }

  const bz = drugs.filter((d) => has(d, "benzo-zdrug"));
  const gabaid = drugs.filter((d) => d.id === "gabapentin" || d.id === "pregabalin");
  if (op.length && bz.length && gabaid.length) {
    const mix = [...new Map([...op, ...bz, ...gabaid].map((d) => [d.id, d])).values()];
    out.push({
      id: "grp-mat-airway-" + mix.map((d) => d.id).sort().join("-"),
      severity: "major",
      kind: "pd",
      drugIds: mix.map((d) => d.id),
      headline: "MAT airway triad · opioid + benzo + gabapentinoid",
      enzymes: [],
      effect: "sedation / respiratory depression",
      mechanism: "opioid × benzodiazepine × gabapentinoid",
      clinical: `${names(mix.map((d) => d.id)).join(", ")} — methadone or buprenorphine plus a benzo plus gabapentin/pregabalin is a three-drug airway. The gabapentinoid is often 'for nerves' and still counts.`,
      tags: ["cns", "mat", "stack"],
    });
  }

  return out;
}

function burdenFor(drugs: Drug[]): EnzymeBurden[] {
  return ENZYMES.map((enzyme) => {
    const substrates: string[] = [];
    const inhibitors: string[] = [];
    const inducers: string[] = [];
    for (const drug of drugs) {
      for (const role of drug.enzymes) {
        if (role.enzyme !== enzyme) continue;
        if (role.kind === "substrate") substrates.push(drug.id);
        if (role.kind === "inhibitor") inhibitors.push(drug.id);
        if (role.kind === "inducer") inducers.push(drug.id);
      }
    }
    const collisions =
      inhibitors.filter((id) => substrates.some((s) => s !== id)).length +
      inducers.filter((id) => substrates.some((s) => s !== id)).length;
    return { enzyme, substrates, inhibitors, inducers, collisions };
  }).filter((b) => b.substrates.length || b.inhibitors.length || b.inducers.length);
}

function dedupe(findings: Finding[]): Finding[] {
  const byKey = new Map<string, Finding>();
  for (const f of findings) {
    const key = f.kind === "pd"
      ? f.id
      : `${[...f.drugIds].sort().join("-")}|${f.enzymes.join(",")}|${f.tags.join(",")}`;
    const prev = byKey.get(key);
    if (!prev || SEVERITY_RANK[f.severity] > SEVERITY_RANK[prev.severity]) {
      byKey.set(key, f);
    }
  }
  return [...byKey.values()];
}

function phenotypeFindings(drugs: Drug[], phenotypes: PhenotypeMap): Finding[] {
  const out: Finding[] = [];
  for (const enzyme of PHENOTYPE_ENZYMES) {
    const pheno = phenotypes[enzyme];
    if (!pheno || pheno === "NM") continue;
    const label = METABOLIZER_LABEL[pheno];
    for (const drug of drugs) {
      const subs = substratesOf(drug, enzyme);
      if (!subs.length) continue;
      const hottest = subs.reduce((m, s) => {
        const rank = { sensitive: 3, major: 2, minor: 1 };
        return rank[s.sensitivity] > rank[m.sensitivity] ? s : m;
      });
      const ntiOrSensitive = Boolean(hottest.nti) || hottest.sensitivity === "sensitive";
      let severity: Severity = "minor";
      let effect = "";
      let mechanism = "";
      let clinical = "";
      if (pheno === "PM" || pheno === "IM") {
        const asStrength: Strength = pheno === "PM" ? "strong" : "moderate";
        severity = pkSeverity(asStrength, hottest.sensitivity, Boolean(hottest.nti), hottest.pathway, "inhibitor");
        if (hottest.pathway === "activation") {
          effect = "↓ active metabolite";
          mechanism = `${enzyme} ${label.toLowerCase()} metabolizer · blocked activation`;
          clinical = `A ${label.toLowerCase()} ${enzyme} metabolizer activates ${drug.name} poorly. Expect loss of effect (${drug.toxicityHint}). Same pattern as a ${asStrength} ${enzyme} inhibitor.`;
        } else {
          effect = "↑ exposure";
          mechanism = `${enzyme} ${label.toLowerCase()} metabolizer · reduced clearance`;
          clinical = `A ${label.toLowerCase()} ${enzyme} metabolizer clears ${drug.name} slowly${ntiOrSensitive ? " — this is a sensitive or narrow-index substrate" : ""}. Watch for ${drug.toxicityHint}.`;
        }
        if (severity === "contraindicated") severity = "major";
      } else {
        const asStrength: Strength = "strong";
        severity = pkSeverity(asStrength, hottest.sensitivity, Boolean(hottest.nti), hottest.pathway, "inducer");
        if (hottest.pathway === "activation") {
          effect = "↑ active metabolite";
          mechanism = `${enzyme} ultrarapid metabolizer · extra activation`;
          clinical = `An ultrarapid ${enzyme} metabolizer converts ${drug.name} to its active metabolite faster. Toxicity risk rises (${drug.toxicityHint}) — the classic example is codeine → morphine in CYP2D6 UM.`;
          if (hottest.sensitivity === "sensitive" || hottest.nti) severity = "contraindicated";
        } else {
          effect = "↓ exposure / shorter duration";
          mechanism = `${enzyme} ultrarapid metabolizer · accelerated clearance`;
          clinical = `An ultrarapid ${enzyme} metabolizer shortens ${drug.name} exposure. For MDMA that means a briefer parent-drug effect and more downstream metabolite; for ketamine it can mean a weaker NMDA response.`;
          severity = ntiOrSensitive ? "major" : hottest.sensitivity === "major" ? "moderate" : "minor";
        }
      }
      out.push({
        id: `geno-${enzyme}-${pheno}-${drug.id}`,
        severity,
        kind: "geno",
        drugIds: [drug.id],
        headline: `${enzyme} ${pheno} × ${drug.name}`,
        enzymes: [enzyme],
        effect,
        mechanism,
        clinical,
        tags: [enzyme, "phenotype", pheno],
      });
    }
  }
  return out;
}

function washoutFindings(drugs: Drug[]): Finding[] {
  const out: Finding[] = [];
  const ids = new Set(drugs.map((d) => d.id));
  for (const w of WASHOUT) {
    const hit = w.ids.filter((id) => ids.has(id));
    if (!hit.length) continue;
    const others = drugs.filter((d) => !w.ids.includes(d.id) && !isVirtual(d.id));
    const sero = others.some((d) => d.pd.includes("serotonergic") || d.pd.includes("stimulant") || d.pd.includes("maoi"));
    if (!others.length) continue;
    if (others.every((d) => d.kind !== "drug")) continue;
    out.push({
      id: `washout-${hit.join("-")}`,
      severity: sero ? "major" : "moderate",
      kind: "pd",
      drugIds: [...hit, ...others.map((d) => d.id)],
      headline: `${w.days}-day washout`,
      enzymes: hit.includes("fluoxetine") ? ["CYP2D6"] : [],
      effect: "lingering perpetrator effect",
      mechanism: "washout clock",
      clinical: w.label,
      tags: ["washout"],
    });
  }
  return out;
}

function clinicHit(
  drug: Drug,
  suffix: string,
  severity: Severity,
  headline: string,
  mechanism: string,
  effect: string,
  clinical: string,
  tags: string[],
): Finding {
  return {
    id: `${drug.id}__clinic-${suffix}`,
    severity,
    kind: "clinic",
    drugIds: [drug.id],
    headline,
    enzymes: [],
    effect,
    mechanism,
    clinical,
    tags: ["clinic", ...tags],
  };
}

function hostClinicFindings(drugs: Drug[], host: HostContext): Finding[] {
  const age = host.age ?? "adult";
  const kidney = host.kidney ?? "ok";
  const preg = host.preg ?? "off";
  if (age === "adult" && kidney === "ok" && preg === "off") return [];
  const out: Finding[] = [];
  for (const d of drugs) {
    const card = CLINIC[d.id];
    if (preg === "pregnant") {
      if (card?.pregnancy === "avoid") {
        out.push(
          clinicHit(
            d,
            "preg-avoid",
            "contraindicated",
            `${d.name} in pregnancy`,
            "teratogen / boxed fetal risk",
            "avoid in pregnancy",
            card.pregNote ??
              `${d.name} is mapped as avoid in pregnancy on this desk. Open the primary label. Not a prescribing protocol.`,
            ["pregnancy"],
          ),
        );
      } else if (card?.pregnancy === "caution") {
        out.push(
          clinicHit(
            d,
            "preg-caution",
            "major",
            `${d.name} in pregnancy`,
            "pregnancy caution",
            "specialist call",
            card.pregNote ?? `${d.name} is not a free pass in pregnancy. Weigh indication against fetal risk.`,
            ["pregnancy"],
          ),
        );
      } else if (has(d, "acei-arb") && !card) {
        out.push(
          clinicHit(
            d,
            "preg-acei",
            "contraindicated",
            `${d.name} in pregnancy`,
            "ACEI/ARB fetal toxicity",
            "avoid in pregnancy",
            "ACE inhibitors and ARBs are boxed for fetal renal dysgenesis in the second and third trimester.",
            ["pregnancy"],
          ),
        );
      }
    }
    if (preg === "lactating" && card?.lactation === "avoid") {
      out.push(
        clinicHit(
          d,
          "lact-avoid",
          "major",
          `${d.name} in lactation`,
          "lactation avoid",
          "not compatible",
          card.lactNote ?? `${d.name} is mapped as avoid while breastfeeding on this desk.`,
          ["lactation"],
        ),
      );
    }
    if (kidney === "ckd") {
      if (card?.renal === "avoid") {
        out.push(
          clinicHit(
            d,
            "ckd-avoid",
            "major",
            `${d.name} in CKD`,
            "renally cleared / toxic in low GFR",
            "avoid or specialist only",
            card.renalNote ?? `${d.name} accumulates or injures the kidney as GFR falls.`,
            ["renal"],
          ),
        );
      } else if (card?.renal === "caution") {
        out.push(
          clinicHit(
            d,
            "ckd-caution",
            "moderate",
            `${d.name} in CKD`,
            "renal dose / accumulation",
            "adjust or monitor",
            card.renalNote ?? `Dose-cut or monitor as GFR falls. Not a CYP collision.`,
            ["renal"],
          ),
        );
      } else if (has(d, "nsaid")) {
        out.push(
          clinicHit(
            d,
            "ckd-nsaid",
            "major",
            `${d.name} in CKD`,
            "hemodynamic kidney hit",
            "lost GFR / hyperK / volume",
            "NSAIDs drop afferent flow. In CKD they take the remaining GFR. The ACEI + diuretic + NSAID triple is the classic.",
            ["renal"],
          ),
        );
      } else if (has(d, "nephrotoxic")) {
        out.push(
          clinicHit(
            d,
            "ckd-nephro",
            "major",
            `${d.name} in CKD`,
            "stacked nephrotoxin",
            "further GFR loss",
            `${d.name} is already a kidney toxin. CKD is not the host for a second hit.`,
            ["renal"],
          ),
        );
      }
    }
    if (age === "geriatric" && card?.beers) {
      out.push(
        clinicHit(
          d,
          "beers",
          "moderate",
          `${d.name} · Beers`,
          "potentially inappropriate in older adults",
          "Beers 2023 teaching flag",
          card.beers + " Flip off geriatric to hide this row. Not a stop list.",
          ["beers"],
        ),
      );
    }
  }
  return out;
}

function alcoholHostFindings(drugs: Drug[], alcohol: HostContext["alcohol"]): Finding[] {
  if (alcohol === "off") return [];
  const apap = drugs.find((d) => d.id === "acetaminophen");
  if (!apap) return [];
  if (alcohol === "chronic") {
    return [
      {
        id: "host-etoh-chronic-apap",
        severity: "major",
        kind: "pk",
        drugIds: [apap.id],
        headline: "Chronic alcohol × acetaminophen",
        enzymes: ["CYP2E1"],
        effect: "↑ NAPQI",
        mechanism: "CYP2E1 induction + glutathione depletion",
        clinical:
          "Daily drinking induces CYP2E1, which activates acetaminophen to NAPQI, and depletes glutathione that would mop it up. Therapeutic doses can still injure. This is delayed hepatotoxicity, not drunkenness.",
        tags: ["alcohol", "2E1", "host"],
      },
    ];
  }
  return [
    {
      id: "host-etoh-acute-apap",
      severity: "moderate",
      kind: "pk",
      drugIds: [apap.id],
      headline: "Acute alcohol × acetaminophen",
      enzymes: ["CYP2E1"],
      effect: "2E1 occupancy now, rebound NAPQI later",
      mechanism: "acute 2E1 competition then induction",
      clinical:
        "During intoxication CYP2E1 is occupied, so NAPQI formation can fall. After the binge, induction plus empty glutathione stores raise risk. The dangerous window is the morning after, not the drink itself.",
      tags: ["alcohol", "2E1", "host"],
    },
  ];
}

function lingerFindings(drugs: Drug[]): Finding[] {
  const gf = drugs.find((d) => d.id === "grapefruit");
  if (!gf) return [];
  const victims = drugs.filter((d) => d.id !== "grapefruit" && !isVirtual(d.id) && substratesOf(d, "CYP3A4").length);
  if (!victims.length) return [];
  return [
    {
      id: "linger-grapefruit",
      severity: "moderate",
      kind: "pk",
      drugIds: [gf.id, ...victims.map((d) => d.id)],
      headline: "Grapefruit block lasts 24–72 h",
      enzymes: ["CYP3A4"],
      effect: "intestinal CYP3A4 still down",
      mechanism: "mechanism-based furanocoumarin inactivation",
      clinical:
        "Bergamottin destroys intestinal CYP3A4; the enzyme has to be resynthesized. Yesterday’s glass still raises oral 3A4 victims. Hepatic 3A4 (IV ketamine) is largely spared.",
      tags: ["food", "grapefruit", "linger"],
    },
  ];
}

function stackLoad(drugs: Drug[]): StackBar[] {
  const real = drugs.filter((d) => d.id !== "__smoke" && d.id !== "__etoh-chronic");
  const add = (map: Map<string, string[]>, key: string, name: string, n = 1) => {
    const cur = map.get(key) ?? [];
    for (let i = 0; i < n; i++) cur.push(name);
    map.set(key, cur);
  };
  const hits = new Map<string, string[]>();
  for (const d of real) {
    if (has(d, "serotonergic")) add(hits, "serotonin", d.name);
    if (has(d, "ssri-snri") || d.id === "mdma") add(hits, "serotonin", d.name);
    if (has(d, "maoi") || has(d, "tryptophan")) add(hits, "serotonin", d.name);
    if (has(d, "cns-depressant")) add(hits, "cns", d.name);
    if (has(d, "opioid") || has(d, "benzo-zdrug") || has(d, "alcohol")) add(hits, "cns", d.name);
    if (has(d, "ghb")) add(hits, "cns", d.name);
    if (has(d, "alpha2-agonist")) add(hits, "cns", d.name, 2);
    if (has(d, "qt-known")) add(hits, "qt", d.name, 2);
    else if (has(d, "qt-possible")) add(hits, "qt", d.name);
    if (has(d, "maoi") || has(d, "tyramine")) add(hits, "pressor", d.name, 2);
    if (has(d, "stimulant")) add(hits, "pressor", d.name);
    if (has(d, "dissociative")) add(hits, "nmda", d.name, 2);
  }
  return STACK_AXES.map((axis) => {
    const items = hits.get(axis) ?? [];
    return { axis, score: Math.min(items.length, 5), cap: 5, items: [...new Set(items)] };
  });
}

export function analyze(
  drugIds: string[],
  host?: HostContext | PhenotypeMap,
  amounts?: Record<string, number>,
): Report {
  const ctx: HostContext | undefined =
    host && "smoking" in (host as HostContext)
      ? { ...DEFAULT_HOST, ...(host as HostContext), phenotypes: { ...DEFAULT_PHENOTYPES, ...(host as HostContext).phenotypes } }
      : host && "CYP2D6" in host
        ? {
            ...DEFAULT_HOST,
            phenotypes: host as PhenotypeMap,
          }
        : undefined;
  const base = drugIds.map((id) => DRUG_BY_ID[id]).filter(Boolean);
  const drugs = ctx ? applyHost(base, ctx) : base;
  const real = drugs.filter((d) => !isVirtual(d.id));
  const findings: Finding[] = [];
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const a = drugs[i];
      const b = drugs[j];
      const skipApapChronic =
        (a.id === "__etoh-chronic" && b.id === "acetaminophen") ||
        (b.id === "__etoh-chronic" && a.id === "acetaminophen");
      if (!skipApapChronic) findings.push(...applyLabelPins(a, b, pkFindings(a, b)));
      findings.push(...pdFindings(a, b));
    }
  }
  findings.push(...multiDrugFindings(real));
  if (ctx) findings.push(...phenotypeFindings(real, ctx.phenotypes));
  if (ctx) findings.push(...phenoconversionFindings(drugs, ctx));
  findings.push(...washoutFindings(drugs));
  findings.push(...lingerFindings(drugs));
  if (ctx) findings.push(...alcoholHostFindings(real, ctx.alcohol));
  if (ctx) findings.push(...hostClinicFindings(real, ctx));
  findings.push(...udsFindings(real.map((d) => d.id)));
  findings.push(...protocolFindings(real.map((d) => d.id)));
  if (amounts && Object.keys(amounts).length) {
    findings.push(...doseFindings(real.map((d) => d.id), amounts, ctx ?? DEFAULT_HOST));
  }
  const uniq = dedupe(findings);
  uniq.sort((a, b) => {
    const d = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (d) return d;
    if (a.kind !== b.kind) return a.kind === "pk" ? -1 : 1;
    return a.headline.localeCompare(b.headline);
  });
  const counts: Record<Severity, number> = {
    contraindicated: 0,
    major: 0,
    moderate: 0,
    minor: 0,
  };
  for (const f of uniq) counts[f.severity] += 1;
  const highest =
    uniq.length === 0
      ? "none"
      : (["contraindicated", "major", "moderate", "minor"] as Severity[]).find(
          (s) => counts[s] > 0,
        ) ?? "none";
  return { findings: uniq, burden: burdenFor(drugs), highest, counts, stacks: stackLoad(drugs) };
}

export function enzymeIndex(): Record<
  Enzyme,
  { substrates: Drug[]; inhibitors: Drug[]; inducers: Drug[] }
> {
  const empty = () => ({ substrates: [] as Drug[], inhibitors: [] as Drug[], inducers: [] as Drug[] });
  const idx = Object.fromEntries(ENZYMES.map((e) => [e, empty()])) as Record<
    Enzyme,
    { substrates: Drug[]; inhibitors: Drug[]; inducers: Drug[] }
  >;
  for (const drug of Object.values(DRUG_BY_ID)) {
    const seen = { substrate: new Set<Enzyme>(), inhibitor: new Set<Enzyme>(), inducer: new Set<Enzyme>() };
    for (const role of drug.enzymes) {
      if (seen[role.kind].has(role.enzyme)) continue;
      seen[role.kind].add(role.enzyme);
      if (role.kind === "substrate") idx[role.enzyme].substrates.push(drug);
      if (role.kind === "inhibitor") idx[role.enzyme].inhibitors.push(drug);
      if (role.kind === "inducer") idx[role.enzyme].inducers.push(drug);
    }
  }
  for (const e of ENZYMES) {
    idx[e].substrates.sort((a, b) => a.name.localeCompare(b.name));
    idx[e].inhibitors.sort((a, b) => a.name.localeCompare(b.name));
    idx[e].inducers.sort((a, b) => a.name.localeCompare(b.name));
  }
  return idx;
}
