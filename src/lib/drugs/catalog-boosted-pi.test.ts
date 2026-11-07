import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, searchDrugs } from "./catalog";
import { analyze } from "./engine";
import { LABEL_CONTRAINDICATED_TAG } from "./label-contraindications";
import { DEFAULT_HOST, SEVERITY_RANK, type Enzyme, type Severity } from "./types";

function grade(id: string, enzyme: Enzyme, kind: "inhibitor" | "substrate") {
  const r = DRUG_BY_ID[id].enzymes.find((e) => e.enzyme === enzyme && e.kind === kind);
  if (!r) return undefined;
  return r.kind === "substrate" ? r.sensitivity : r.strength;
}

test("cobicistat-boosted combo tablets carry strong CYP3A4 inhibition and the 3A4 victim role", () => {
  for (const id of [
    "darunavir-cobicistat",
    "darunavir-cobicistat-ftc-taf",
    "atazanavir-cobicistat",
    "elvitegravir-cobicistat-ftc-taf",
    "elvitegravir-cobicistat-ftc-tdf",
  ]) {
    assert.equal(grade(id, "CYP3A4", "inhibitor"), "strong", id);
    assert.equal(grade(id, "CYP2D6", "inhibitor"), "weak", id);
    assert.equal(grade(id, "CYP3A4", "substrate"), "major", id);
    assert.doesNotMatch(DRUG_BY_ID[id].toxicityHint ?? "", /\bmg\b|→|->/);
  }
  assert.equal(grade("atazanavir-cobicistat", "CYP2C8", "inhibitor"), "weak");
});

test("plain darunavir and atazanavir keep the boosted (strong) grade; notes say so", () => {
  assert.equal(grade("darunavir", "CYP3A4", "inhibitor"), "strong");
  assert.match(DRUG_BY_ID.darunavir.toxicityHint ?? "", /ritonavir or cobicistat/);
  assert.equal(grade("atazanavir", "CYP3A4", "inhibitor"), "strong");
  assert.match(DRUG_BY_ID.atazanavir.toxicityHint ?? "", /Unboosted Reyataz is a moderate 3A4 inhibitor/);
});

test("Genvoya and Stribild read like the other cobicistat tablets, not like an unboosted combo", () => {
  for (const id of ["elvitegravir-cobicistat-ftc-taf", "elvitegravir-cobicistat-ftc-tdf"]) {
    assert.deepEqual(
      DRUG_BY_ID[id].enzymes.map((r) => `${r.kind}:${r.enzyme}`).sort(),
      DRUG_BY_ID["darunavir-cobicistat-ftc-taf"].enzymes.map((r) => `${r.kind}:${r.enzyme}`).sort(),
      id,
    );
    assert.equal(DRUG_BY_ID[id].toxicityHint, DRUG_BY_ID["darunavir-cobicistat"].toxicityHint, id);
    assert.doesNotMatch(DRUG_BY_ID[id].toxicityHint ?? "", /Read the booster/);
  }
});

test("indinavir and saquinavir keep the Table 1 victim role and add a strong 3A4 inhibitor role", () => {
  for (const id of ["indinavir", "saquinavir"]) {
    assert.equal(grade(id, "CYP3A4", "substrate"), "sensitive", id);
    assert.equal(grade(id, "CYP3A4", "inhibitor"), "strong", id);
    assert.equal(DRUG_BY_ID[id].enzymes.length, 2, id);
    const copy = `${DRUG_BY_ID[id].toxicityHint ?? ""} ${DRUG_BY_ID[id].note ?? ""}`;
    // The copy says where the inhibitor grade comes from and that Table 1 does not give it.
    assert.match(copy, /victim labels/, id);
    assert.match(copy, /Table 1 does not grade this drug as an inhibitor on its own/, id);
    assert.doesNotMatch(copy, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i, id);
  }
  // The boosted shelf rows are unchanged.
  for (const id of ["indinavir-and-ritonavir", "tipranavir-and-ritonavir"]) {
    assert.deepEqual(DRUG_BY_ID[id].enzymes, [{ enzyme: "CYP3A4", kind: "inhibitor", strength: "strong" }], id);
  }
});

test("tipranavir (Aptivus) is graded as taken with ritonavir; the P-gp role stays", () => {
  assert.equal(grade("tipranavir", "CYP3A4", "inhibitor"), "strong");
  assert.equal(grade("tipranavir", "P-gp", "inhibitor"), "weak");
  assert.equal(grade("tipranavir", "CYP3A4", "substrate"), undefined);
  assert.match(DRUG_BY_ID.tipranavir.toxicityHint ?? "", /always taken with ritonavir/);
  assert.match(DRUG_BY_ID.tipranavir.toxicityHint ?? "", /tipranavir and ritonavir/);
});

test("boosted PI pairs with 3A4 victims now read like the indinavir and ritonavir row", () => {
  const pairSeverity = (a: string, b: string) => {
    let best: Severity | "none" = "none";
    for (const f of analyze([a, b], DEFAULT_HOST).findings.filter((x) => x.drugIds.includes(a) && x.drugIds.includes(b))) {
      if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[best]) best = f.severity;
    }
    return best;
  };
  const rows = ["indinavir", "saquinavir", "tipranavir", "elvitegravir-cobicistat-ftc-taf", "elvitegravir-cobicistat-ftc-tdf"];
  for (const id of rows) {
    for (const victim of ["midazolam", "triazolam", "fentanyl", "quetiapine", "colchicine"]) {
      assert.equal(pairSeverity(id, victim), pairSeverity("indinavir-and-ritonavir", victim), `${id}+${victim} matches indinavir and ritonavir`);
      assert.equal(pairSeverity(id, victim), "major", `${id}+${victim}`);
    }
    // Wave 17 lovastatin pins still hold, and the pair now also carries the CYP3A4 card.
    assert.equal(pairSeverity(id, "lovastatin"), "contraindicated", id);
    const cards = analyze([id, "lovastatin"], DEFAULT_HOST).findings.filter((f) => f.drugIds.includes(id) && f.drugIds.includes("lovastatin"));
    assert.ok(cards.some((f) => f.tags.includes(LABEL_CONTRAINDICATED_TAG)), `${id}: label pin card`);
    assert.ok(cards.some((f) => f.id.endsWith(`pk-CYP3A4-inhibitor-${id}`)), `${id}: CYP3A4 inhibitor card`);
  }
  // Zocor names only "select" protease inhibitors, so these stay at the enzyme rule (major), like indinavir and ritonavir.
  for (const id of ["indinavir", "saquinavir", "tipranavir"]) {
    assert.equal(pairSeverity(id, "simvastatin"), "major", id);
  }
  // Genvoya and Stribild are now 3A4 victims of strong inducers at the enzyme rule (major).
  // Prezcobix with rifampin reads contraindicated only through its own label pin; no
  // Genvoya or Stribild pin is added here.
  for (const id of ["elvitegravir-cobicistat-ftc-taf", "elvitegravir-cobicistat-ftc-tdf"]) {
    for (const inducer of ["rifampin", "carbamazepine", "st-johns-wort"]) {
      assert.equal(pairSeverity(id, inducer), "major", `${id}+${inducer}`);
    }
  }
});

test("tucatinib is one catalog row, still found by brand and name", () => {
  assert.equal(DRUG_BY_ID["tucatinib-her2"], undefined);
  const rows = DRUGS.filter((d) => d.brands.includes("Tukysa") || d.name === "Tucatinib");
  assert.deepEqual(rows.map((d) => d.id), ["tucatinib"]);
  for (const q of ["tukysa", "Tukysa", "tucatinib"]) {
    assert.equal(searchDrugs(q)[0]?.id, "tucatinib", q);
  }
});
