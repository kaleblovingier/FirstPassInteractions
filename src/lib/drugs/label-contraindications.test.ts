import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./engine";
import { basisFor } from "./basis";
import { DRUG_BY_ID } from "./catalog";
import { DEFAULT_HOST, type Finding, type Severity } from "./types";
import {
  LABEL_CONTRAINDICATED_TAG,
  LABEL_CONTRAINDICATIONS,
  labelContraindicationFor,
} from "./label-contraindications";

const RANK: Record<Severity, number> = { contraindicated: 4, major: 3, moderate: 2, minor: 1 };

function pairFindings(a: string, b: string, host?: typeof DEFAULT_HOST): Finding[] {
  return analyze([a, b], host).findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b));
}

function pairSeverity(a: string, b: string, host?: typeof DEFAULT_HOST): Severity | "none" {
  let best: Severity | "none" = "none";
  for (const f of pairFindings(a, b, host)) if (best === "none" || RANK[f.severity] > RANK[best]) best = f.severity;
  return best;
}

test("tizanidine + ciprofloxacin is contraindicated and cites the Zanaflex Contraindications section", () => {
  // Ciprofloxacin stays a moderate CYP1A2 inhibitor per FDA's table (#58).
  const cipro = DRUG_BY_ID.ciprofloxacin.enzymes.find((e) => e.enzyme === "CYP1A2" && e.kind === "inhibitor");
  assert.ok(cipro && cipro.kind === "inhibitor" && cipro.strength === "moderate");
  for (const host of [undefined, DEFAULT_HOST]) {
    assert.equal(pairSeverity("tizanidine", "ciprofloxacin", host), "contraindicated");
  }
  const f = pairFindings("tizanidine", "ciprofloxacin").find((x) => x.tags.includes(LABEL_CONTRAINDICATED_TAG));
  assert.ok(f, "pinned finding present");
  const b = basisFor(f)[0];
  assert.equal(b.kind, "fda-pi");
  assert.equal(b.href, "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=60c27d35-7349-4fc6-86ad-70fffdbe3e08");
  assert.match(b.detail, /Zanaflex is contraindicated in patients taking strong CYP1A2 inhibitors/);
  assert.match(b.detail, /\(e\.g\., fluvoxamine, ciprofloxacin\) is contraindicated\./);
});

test("tizanidine + fluvoxamine is contraindicated and cites the Zanaflex label", () => {
  for (const host of [undefined, DEFAULT_HOST]) {
    assert.equal(pairSeverity("tizanidine", "fluvoxamine", host), "contraindicated");
  }
  const f = pairFindings("tizanidine", "fluvoxamine").find((x) => x.tags.includes(LABEL_CONTRAINDICATED_TAG));
  assert.ok(f);
  assert.match(basisFor(f)[0].detail, /Zanaflex/);
});

const EXPECTED_PINS = [
  // PR #65 severity-whatif.md: the 18 label-contraindicated gold pairs.
  "eplerenone+ketoconazole",
  "ivabradine+clarithromycin",
  "lovastatin+clarithromycin",
  "lurasidone+ketoconazole",
  "lurasidone+rifampin",
  "pimozide+clarithromycin",
  "pimozide+ketoconazole",
  "ramelteon+fluvoxamine",
  "ranolazine+ketoconazole",
  "ranolazine+rifampin",
  "simvastatin+clarithromycin",
  "simvastatin+itraconazole",
  "simvastatin+ritonavir",
  "thioridazine+fluoxetine",
  "thioridazine+paroxetine",
  "tizanidine+ciprofloxacin",
  "tizanidine+fluvoxamine",
  "triazolam+ketoconazole",
  // Gold-set pair that reaches contraindicated only through the enzyme rule after #58
  // (alosetron gained its FDA-listed 1A2 sensitive substrate role).
  "alosetron+fluvoxamine",
  // Restored: label-contraindicated pairs that #58's grade changes dropped to major.
  "ranolazine+phenobarbital",
  "ranolazine+primidone",
  "thioridazine+abiraterone",
  "thioridazine+cinacalcet",
  // PR #75 wave 3: label contraindicated, engine was major.
  "mifepristone+dihydroergotamine",
  "mifepristone+ergotamine",
  "mifepristone+quinidine",
  "darunavir+rifampin",
  "darunavir+dronedarone",
  "darunavir+dihydroergotamine",
  "darunavir+ergotamine",
  "darunavir+methylergonovine",
  "darunavir+st-johns-wort",
  "darunavir+sildenafil-pah",
  "darunavir-cobicistat+carbamazepine",
  "darunavir-cobicistat+phenobarbital",
  "darunavir-cobicistat+phenytoin",
  "darunavir-cobicistat+rifampin",
  "darunavir-cobicistat+dronedarone",
  "darunavir-cobicistat+dihydroergotamine",
  "darunavir-cobicistat+ergotamine",
  "darunavir-cobicistat+methylergonovine",
  "darunavir-cobicistat+st-johns-wort",
  "darunavir-cobicistat+sildenafil-pah",
  "atazanavir+carbamazepine",
  "atazanavir+phenobarbital",
  "atazanavir+phenytoin",
  "atazanavir+apalutamide",
  "atazanavir+encorafenib",
  "atazanavir+ivosidenib",
  "atazanavir+dihydroergotamine",
  "atazanavir+ergotamine",
  "atazanavir+methylergonovine",
  "atazanavir+glecaprevir-pibrentasvir",
  "atazanavir+st-johns-wort",
  "atazanavir+sildenafil-pah",
  "atazanavir+nevirapine",
  "atazanavir-cobicistat+dronedarone",
  "atazanavir-cobicistat+carbamazepine",
  "atazanavir-cobicistat+phenobarbital",
  "atazanavir-cobicistat+phenytoin",
  "atazanavir-cobicistat+rifampin",
  "atazanavir-cobicistat+apalutamide",
  "atazanavir-cobicistat+encorafenib",
  "atazanavir-cobicistat+ivosidenib",
  "atazanavir-cobicistat+dihydroergotamine",
  "atazanavir-cobicistat+ergotamine",
  "atazanavir-cobicistat+methylergonovine",
  "atazanavir-cobicistat+glecaprevir-pibrentasvir",
  "atazanavir-cobicistat+st-johns-wort",
  "atazanavir-cobicistat+ethinyl-estradiol",
  "atazanavir-cobicistat+nevirapine",
  "atazanavir-cobicistat+sildenafil-pah",
  // PR #86 wave 4: label contraindicated, engine was below contraindicated.
  "clarithromycin+ergotamine",
  "clarithromycin+dihydroergotamine",
  "itraconazole+methadone",
  "itraconazole+disopyramide",
  "itraconazole+dronedarone",
  "itraconazole+quinidine",
  "itraconazole+isavuconazole",
  "itraconazole+dihydroergotamine",
  "itraconazole+ergotamine",
  "itraconazole+methylergonovine",
  "itraconazole+avanafil",
  "itraconazole+ticagrelor",
  "posaconazole+quinidine",
  "posaconazole+atorvastatin",
  "posaconazole+ergotamine",
  "posaconazole+dihydroergotamine",
  "ritonavir+amiodarone",
  "ritonavir+dronedarone",
  "ritonavir+flecainide",
  "ritonavir+propafenone",
  "ritonavir+quinidine",
  "ritonavir+dihydroergotamine",
  "ritonavir+methylergonovine",
  "ritonavir+suzetrigine",
  "ritonavir+sildenafil-pah",
  "ritonavir+apalutamide",
  "ritonavir+st-johns-wort",
  "paxlovid+amiodarone",
  "paxlovid+dronedarone",
  "paxlovid+propafenone",
  "paxlovid+quinidine",
  "paxlovid+dihydroergotamine",
  "paxlovid+ergotamine",
  "paxlovid+methylergonovine",
  "paxlovid+suzetrigine",
  "paxlovid+sildenafil-pah",
  "paxlovid+apalutamide",
  "paxlovid+enzalutamide",
  "paxlovid+carbamazepine",
  "paxlovid+lumacaftor-ivacaftor",
  "lopinavir+dronedarone",
  "lopinavir+dihydroergotamine",
  "lopinavir+ergotamine",
  "lopinavir+methylergonovine",
  "lopinavir+suzetrigine",
  "lopinavir+sildenafil-pah",
  "lopinavir+apalutamide",
  "lopinavir+rifampin",
  "lopinavir+st-johns-wort",
  "itraconazole+dofetilide",
  "itraconazole+irinotecan",
  "paxlovid+flecainide",
  "paxlovid+phenobarbital",
  "paxlovid+primidone",
  "paxlovid+phenytoin",
  "paxlovid+rifampin",
  "paxlovid+rifapentine",
  "paxlovid+st-johns-wort",
  "lopinavir+grazoprevir-elbasvir",
  // No CYP finding to hold. Standalone pins. Not a CYP grade.
  "darunavir+grazoprevir-elbasvir",
  "darunavir-cobicistat+grazoprevir-elbasvir",
  "atazanavir+grazoprevir-elbasvir",
  "atazanavir-cobicistat+grazoprevir-elbasvir",
  "atazanavir+irinotecan",
  "atazanavir-cobicistat+irinotecan",
  "atazanavir-cobicistat+drospirenone",
];

test("pin list is exactly the reviewed set", () => {
  assert.deepEqual(LABEL_CONTRAINDICATIONS.map((r) => r.id).sort(), [...EXPECTED_PINS].sort());
  assert.equal(LABEL_CONTRAINDICATIONS.filter((r) => r.origin === "gold-set").length, 19);
  assert.equal(LABEL_CONTRAINDICATIONS.filter((r) => r.origin === "wave3").length, 49);
  assert.equal(LABEL_CONTRAINDICATIONS.filter((r) => r.origin === "wave4").length, 49);
  assert.equal(LABEL_CONTRAINDICATIONS.filter((r) => r.origin === "no-enzyme").length, 17);
  for (const r of LABEL_CONTRAINDICATIONS) {
    if (r.origin === "no-enzyme") {
      assert.equal(r.enzyme, undefined, r.id);
      assert.equal(r.kind, undefined, r.id);
    } else {
      assert.ok(r.enzyme, r.id);
      assert.ok(r.kind, r.id);
    }
  }
});

for (const r of LABEL_CONTRAINDICATIONS) {
  test(`${r.id}: contraindicated with a label citation`, () => {
    assert.ok(DRUG_BY_ID[r.labelDrugId], `${r.labelDrugId} in catalog`);
    assert.ok(DRUG_BY_ID[r.otherId], `${r.otherId} in catalog`);
    for (const host of [undefined, DEFAULT_HOST]) {
      assert.equal(pairSeverity(r.labelDrugId, r.otherId, host), "contraindicated", host ? "default host" : "no host");
    }
    const pinned = pairFindings(r.labelDrugId, r.otherId).filter((f) => f.tags.includes(LABEL_CONTRAINDICATED_TAG));
    assert.equal(pinned.length, 1, "exactly one pinned finding");
    const f = pinned[0];
    assert.equal(f.kind, "pk");
    if (r.enzyme && r.kind) {
      assert.ok(f.enzymes.includes(r.enzyme));
      // The pin rides on the enzyme finding; it is not a standalone fallback.
      assert.doesNotMatch(f.id, /label-ci-/);
    } else {
      // No CYP role to hold. The finding stands alone and names no enzyme grade.
      assert.deepEqual(f.enzymes, []);
      assert.match(f.id, /label-ci-standalone/);
      assert.equal(f.tags.includes("inhibitor"), false);
      assert.equal(f.tags.includes("inducer"), false);
      // #81 partners have no CYP role. Wave-4 standalone pins also cover pairs
      // that produce no enzyme finding even when the partner has catalog roles
      // (flecainide is CYP2D6; Paxlovid is not a 2D6 inhibitor). Do not require
      // an empty role list for those, and do not invent a CYP grade.
      const noCypPartner = new Set([
        "darunavir+grazoprevir-elbasvir",
        "darunavir-cobicistat+grazoprevir-elbasvir",
        "atazanavir+grazoprevir-elbasvir",
        "atazanavir-cobicistat+grazoprevir-elbasvir",
        "atazanavir+irinotecan",
        "atazanavir-cobicistat+irinotecan",
        "atazanavir-cobicistat+drospirenone",
      ]);
      if (noCypPartner.has(r.id)) {
        assert.equal(DRUG_BY_ID[r.otherId].enzymes.length, 0, "partner has no CYP role");
      }
      assert.match(f.clinical, /no CYP finding/);
    }
    const basis = basisFor(f)[0];
    assert.equal(basis.kind, "fda-pi");
    assert.equal(basis.href, r.url);
    assert.ok(basis.detail.includes(r.quote), "basis carries the verbatim quote");
    assert.match(r.url, /^https:\/\/dailymed\.nlm\.nih\.gov\/dailymed\/drugInfo\.cfm\?setid=/);
  });
}

test("pin text carries no doses, arrows or clearance claims", () => {
  for (const r of LABEL_CONTRAINDICATIONS) {
    const text = [r.quote, r.labelExample ?? "", r.contraindicationsSentence ?? ""].join(" ");
    assert.doesNotMatch(text, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i, r.id);
    assert.doesNotMatch(text, /[→←↑↓]|->/, r.id);
  }
  const f = pairFindings("tizanidine", "ciprofloxacin").find((x) => x.tags.includes(LABEL_CONTRAINDICATED_TAG))!;
  const extra = basisFor(f)[0].detail + " " + f.clinical.split(". ").slice(-1)[0];
  assert.doesNotMatch(extra, /FDA[- ]cleared|clinical decision support|clinician[- ]reviewed/i);
});

test("pins are narrow: no class expansion, enzyme rule unchanged", () => {
  // Other moderate CYP1A2 inhibitors with tizanidine stay at the enzyme rule's grade.
  assert.equal(labelContraindicationFor("tizanidine", "mexiletine"), undefined);
  assert.equal(pairSeverity("tizanidine", "mexiletine"), "major");
  // Ciprofloxacin with other sensitive 1A2 victims is not pinned (Rozerem names only fluvoxamine).
  assert.equal(pairSeverity("ramelteon", "ciprofloxacin"), "major");
  // Primidone/phenobarbital with lurasidone: Latuda names strong CYP3A4 inducers only.
  assert.equal(labelContraindicationFor("lurasidone", "phenobarbital"), undefined);
  // PAH sildenafil (Revatio row) is pinned. Ordinary sildenafil (Viagra) is not.
  assert.equal(labelContraindicationFor("darunavir", "sildenafil-pah")?.id, "darunavir+sildenafil-pah");
  assert.equal(labelContraindicationFor("darunavir", "sildenafil"), undefined);
  assert.equal(labelContraindicationFor("atazanavir", "sildenafil"), undefined);
  assert.equal(labelContraindicationFor("atazanavir-cobicistat", "sildenafil"), undefined);
  // Wave 4 pins the PAH sildenafil row only, same as wave 3.
  assert.equal(labelContraindicationFor("ritonavir", "sildenafil-pah")?.id, "ritonavir+sildenafil-pah");
  assert.equal(labelContraindicationFor("paxlovid", "sildenafil-pah")?.id, "paxlovid+sildenafil-pah");
  assert.equal(labelContraindicationFor("lopinavir", "sildenafil-pah")?.id, "lopinavir+sildenafil-pah");
  assert.equal(labelContraindicationFor("ritonavir", "sildenafil"), undefined);
  assert.equal(labelContraindicationFor("paxlovid", "sildenafil"), undefined);
  assert.equal(labelContraindicationFor("lopinavir", "sildenafil"), undefined);
  // Partners with no CYP role are pinned as standalone contraindications, not given a CYP grade.
  for (const [a, b] of [
    ["atazanavir", "irinotecan"],
    ["atazanavir-cobicistat", "irinotecan"],
    ["darunavir", "grazoprevir-elbasvir"],
    ["darunavir-cobicistat", "grazoprevir-elbasvir"],
    ["atazanavir", "grazoprevir-elbasvir"],
    ["atazanavir-cobicistat", "grazoprevir-elbasvir"],
    ["atazanavir-cobicistat", "drospirenone"],
  ] as const) {
    const pin = labelContraindicationFor(a, b);
    assert.equal(pin?.origin, "no-enzyme");
    assert.equal(pin?.enzyme, undefined);
    assert.equal(DRUG_BY_ID[b].enzymes.length, 0);
    assert.equal(pairSeverity(a, b), "contraindicated");
    const f = pairFindings(a, b).find((x) => x.tags.includes(LABEL_CONTRAINDICATED_TAG));
    assert.ok(f);
    assert.deepEqual(f.enzymes, []);
    const basis = basisFor(f)[0];
    assert.equal(basis.kind, "fda-pi");
    assert.equal(basis.href, pin?.url);
    assert.ok(basis.detail.includes(pin!.quote));
    assert.ok(basis.detail.includes(pin!.labelSection));
  }
});
