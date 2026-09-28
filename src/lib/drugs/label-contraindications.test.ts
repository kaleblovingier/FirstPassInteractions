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
  // Restored: label-contraindicated pairs that #58's grade changes dropped to major.
  "ranolazine+phenobarbital",
  "ranolazine+primidone",
  "thioridazine+abiraterone",
  "thioridazine+cinacalcet",
];

test("pin list is exactly the reviewed set", () => {
  assert.deepEqual(LABEL_CONTRAINDICATIONS.map((r) => r.id).sort(), [...EXPECTED_PINS].sort());
  assert.equal(LABEL_CONTRAINDICATIONS.filter((r) => r.origin === "gold-set").length, 18);
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
    assert.ok(f.enzymes.includes(r.enzyme));
    // The pin rides on the enzyme finding; it is not a standalone fallback.
    assert.doesNotMatch(f.id, /label-ci-/);
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
});
