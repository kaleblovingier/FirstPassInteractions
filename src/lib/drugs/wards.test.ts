import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wardsOnDesk, isCniAzole, isCarbapenemValproate, isVancoZosyn, isArniAcei } from "./wards";

describe("wards - Inpatient Clinical Collisions", () => {
  it("detects Calcineurin Inhibitor × Azole Antifungal collision as major/danger", () => {
    assert.equal(isCniAzole("tacrolimus", "voriconazole"), true);
    assert.equal(isCniAzole("posaconazole", "tacrolimus"), true);
    assert.equal(isCniAzole("cyclosporine", "fluconazole"), true);
    assert.equal(isCniAzole("tacrolimus", "amoxicillin"), false);

    const hits = wardsOnDesk(["tacrolimus", "voriconazole"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "cni-azole");
    assert.equal(hit.severity, "major");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /3A4 and P-gp.*tacrolimus.*troughs.*nephrotoxicity/i);
    assert.match(hit.source, /Prograf.*Vfend.*KDIGO/i);
  });

  it("detects carbapenem × valproate as contraindicated", () => {
    assert.equal(isCarbapenemValproate("meropenem", "valproate"), true);
    const hits = wardsOnDesk(["meropenem", "valproate"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "carbapenem-vpa");
    assert.equal(hits[0].severity, "contraindicated");
  });

  it("detects vancomycin × piperacillin-tazobactam as major AKI risk", () => {
    assert.equal(isVancoZosyn("vancomycin", "piperacillin-tazobactam"), true);
    const hits = wardsOnDesk(["vancomycin", "piperacillin-tazobactam"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "vanco-zosyn");
    assert.equal(hits[0].severity, "major");
  });

  it("detects ARNI × ACEI as contraindicated angioedema hazard", () => {
    assert.equal(isArniAcei("sacubitril-valsartan", "lisinopril"), true);
    const hits = wardsOnDesk(["sacubitril-valsartan", "lisinopril"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "arni-acei");
    assert.equal(hits[0].severity, "contraindicated");
  });
});

