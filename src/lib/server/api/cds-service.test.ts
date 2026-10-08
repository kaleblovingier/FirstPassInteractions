import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ClinicalDecisionService,
  STATUTORY_CDS_DISCLAIMER,
  buildHostContext,
  resolveDrug,
} from "./cds-service";
import { problemBadRequest, problemNotFound, problemUnprocessable } from "./problem";

test("ClinicalDecisionService: resolves drugs accurately by id and search alias", () => {
  const mtx = resolveDrug("methotrexate");
  assert.ok(mtx, "Should resolve methotrexate");
  assert.equal(mtx.id, "methotrexate");

  const plavix = resolveDrug("Plavix");
  assert.ok(plavix, "Should resolve brand name Plavix to clopidogrel");
  assert.equal(plavix.id, "clopidogrel");

  const unknown = resolveDrug("nonexistent-fictional-drug-xyz");
  assert.equal(unknown, undefined);
});

test("ClinicalDecisionService: search endpoint returns valid drug summaries with pagination", () => {
  const res = ClinicalDecisionService.search({ q: "warfarin", limit: 5 });
  assert.equal(res.success, true);
  if (res.success) {
    assert.ok(res.data.length > 0);
    assert.equal(res.data[0].id, "warfarin");
  }

  // Validation failure on empty query
  const emptyRes = ClinicalDecisionService.search({ q: "", limit: 5 });
  assert.equal(emptyRes.success, false);
  if (!emptyRes.success) {
    assert.equal(emptyRes.problem.status, 422);
    assert.ok(emptyRes.problem.invalidParams?.some((p) => p.name === "q"));
  }
});

test("ClinicalDecisionService: checkInteractions detects severe and contraindicated collisions", async () => {
  ClinicalDecisionService.clearCaches();
  // Simvastatin + Clarithromycin (Contraindicated CYP3A4 collision)
  const res = await ClinicalDecisionService.checkInteractions({
    drugs: ["simvastatin", "clarithromycin"],
    host: { age: 65, scr: 1.2 },
  });

  assert.equal(res.success, true);
  if (res.success) {
    assert.ok(res.data.summary.totalFindings > 0);
    assert.ok(res.data.summary.contraindicatedCount > 0 || res.data.summary.majorCount > 0);
    assert.ok(res.data.meta.disclaimer.includes("21 U.S.C. § 360j(o)(1)(E)"));
    assert.ok(res.data.meta.durationMs >= 0);
  }

  // Cached retrieval is instant
  const cachedRes = await ClinicalDecisionService.checkInteractions({
    drugs: ["simvastatin", "clarithromycin"],
    host: { age: 65, scr: 1.2 },
  });
  assert.equal(cachedRes.success, true);
});

test("ClinicalDecisionService: rejects unprocessable interaction requests with RFC 7807 problem details", async () => {
  // Empty drug array
  const res = await ClinicalDecisionService.checkInteractions({
    drugs: [],
  });
  assert.equal(res.success, false);
  if (!res.success) {
    assert.equal(res.problem.status, 422);
    assert.equal(res.problem.title, "Unprocessable Entity");
    assert.ok(res.problem.invalidParams?.some((p) => p.name === "drugs"));
  }

  // Nonexistent drugs
  const notFoundRes = await ClinicalDecisionService.checkInteractions({
    drugs: ["completely-fake-molecule-1", "completely-fake-molecule-2"],
  });
  assert.equal(notFoundRes.success, false);
  if (!notFoundRes.success) {
    assert.equal(notFoundRes.problem.status, 404);
    assert.equal(notFoundRes.problem.title, "Not Found");
  }
});

test("ClinicalDecisionService: evaluateKinetics executes multi-station kinetics", async () => {
  ClinicalDecisionService.clearCaches();
  const res = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["methotrexate", "tacrolimus", "phenytoin", "norepinephrine", "digoxin", "furosemide", "propofol"],
    host: { age: 55, scr: 1.8, kidney: "moderate" },
    modules: ["oncology", "transplant", "phenytoin", "vasoactive", "antiarrhythmic", "acidbase", "anesthesia"],
  });

  assert.equal(res.success, true);
  if (res.success) {
    assert.ok(res.data.modules.oncology);
    assert.ok(res.data.modules.transplant);
    assert.ok(res.data.modules.phenytoin);
    assert.ok(res.data.modules.vasoactive);
    assert.ok(res.data.modules.antiarrhythmic);
    assert.ok(res.data.modules.acidbase);
    assert.ok(res.data.modules.anesthesia);
    assert.ok(res.data.meta.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
  }
});

