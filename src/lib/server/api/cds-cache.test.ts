import { test } from "node:test";
import assert from "node:assert/strict";
import { ClinicalDecisionService } from "./cds-service";

// Requests that differ only in host context must never share a cached result, and a cached
// result must never carry another caller's envelope or be mutable by the caller who received it.

test("ClinicalDecisionService cache: kinetics requests that differ only in pregnancy do not share an entry", async () => {
  ClinicalDecisionService.clearCaches();
  const drugs = ["valproate", "lamotrigine"];
  const off = await ClinicalDecisionService.evaluateKinetics({
    drugs,
    host: { pregnant: false },
    modules: ["pregnancy"],
  });
  const on = await ClinicalDecisionService.evaluateKinetics({
    drugs,
    host: { pregnant: true },
    modules: ["pregnancy"],
  });
  assert.ok(off.success && on.success);
  assert.equal(off.data.query.host.preg, "off");
  assert.equal(on.data.query.host.preg, "pregnant");
  assert.notDeepEqual(on.data.modules.pregnancy, off.data.modules.pregnancy);

  // Same pair in the other order: a pregnant result must not be served to a non-pregnant request.
  ClinicalDecisionService.clearCaches();
  const onFirst = await ClinicalDecisionService.evaluateKinetics({
    drugs,
    host: { pregnant: true },
    modules: ["pregnancy"],
  });
  const offSecond = await ClinicalDecisionService.evaluateKinetics({
    drugs,
    host: { pregnant: false },
    modules: ["pregnancy"],
  });
  assert.ok(onFirst.success && offSecond.success);
  assert.equal(offSecond.data.query.host.preg, "off");
  assert.deepEqual(offSecond.data.modules.pregnancy, off.data.modules.pregnancy);
});

test("ClinicalDecisionService cache: kinetics requests that differ only in smoking do not share an entry", async () => {
  ClinicalDecisionService.clearCaches();
  const drugs = ["clozapine"];
  const off = await ClinicalDecisionService.evaluateKinetics({
    drugs,
    host: { smoker: false },
    modules: ["neuropsych"],
  });
  const on = await ClinicalDecisionService.evaluateKinetics({
    drugs,
    host: { smoker: true },
    modules: ["neuropsych"],
  });
  assert.ok(off.success && on.success);
  assert.equal(off.data.query.host.smoking, false);
  assert.equal(on.data.query.host.smoking, true);
  assert.notDeepEqual(on.data.modules.neuropsych, off.data.modules.neuropsych);
});

test("ClinicalDecisionService cache: interaction requests that differ only in pregnancy or smoking do not share an entry", async () => {
  ClinicalDecisionService.clearCaches();
  const pregnancyRow = (f: { evidence: string }) => f.evidence.endsWith("in pregnancy");
  const notPregnant = await ClinicalDecisionService.checkInteractions({
    drugs: ["valproate", "lamotrigine"],
  });
  const pregnant = await ClinicalDecisionService.checkInteractions({
    drugs: ["valproate", "lamotrigine"],
    host: { pregnant: true },
  });
  assert.ok(notPregnant.success && pregnant.success);
  assert.equal(notPregnant.data.findings.some(pregnancyRow), false);
  assert.equal(pregnant.data.findings.some(pregnancyRow), true);
  assert.equal(pregnant.data.query.host.preg, "pregnant");

  ClinicalDecisionService.clearCaches();
  const smokeRow = (f: { perpetratorId?: string }) => f.perpetratorId === "__smoke";
  const smoker = await ClinicalDecisionService.checkInteractions({
    drugs: ["clozapine", "olanzapine"],
    host: { smoker: true },
  });
  const nonSmoker = await ClinicalDecisionService.checkInteractions({
    drugs: ["clozapine", "olanzapine"],
  });
  assert.ok(smoker.success && nonSmoker.success);
  assert.equal(smoker.data.findings.some(smokeRow), true);
  assert.equal(nonSmoker.data.findings.some(smokeRow), false);
  assert.equal(nonSmoker.data.query.host.smoking, false);
});

test("ClinicalDecisionService cache: a cached result carries the current caller's request, not the first caller's", async () => {
  ClinicalDecisionService.clearCaches();
  const first = await ClinicalDecisionService.checkInteractions({
    drugs: ["simvastatin", "clarithromycin"],
  });
  const second = await ClinicalDecisionService.checkInteractions({
    drugs: ["clarithromycin", "simvastatin"],
  });
  assert.ok(first.success && second.success);
  assert.deepEqual(first.data.query.requestedDrugs, ["simvastatin", "clarithromycin"]);
  assert.deepEqual(second.data.query.requestedDrugs, ["clarithromycin", "simvastatin"]);
  assert.notEqual(second.data, first.data);
  assert.notEqual(second.data.query, first.data.query);
  assert.deepEqual(second.data.findings, first.data.findings);
});

test("ClinicalDecisionService cache: callers cannot mutate cached clinical payloads", async () => {
  ClinicalDecisionService.clearCaches();
  const first = await ClinicalDecisionService.checkInteractions({
    drugs: ["simvastatin", "clarithromycin"],
  });
  assert.ok(first.success);
  const count = first.data.findings.length;
  assert.ok(count > 0);
  const findings = first.data.findings as unknown as { severity: string }[];
  assert.throws(() => {
    findings.length = 0;
  }, TypeError);
  assert.throws(() => {
    findings[0].severity = "minor";
  }, TypeError);

  const again = await ClinicalDecisionService.checkInteractions({
    drugs: ["simvastatin", "clarithromycin"],
  });
  assert.ok(again.success);
  assert.equal(again.data.findings.length, count);
  assert.deepEqual(again.data.findings, first.data.findings);

  const kinetics = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["phenytoin"],
    modules: ["phenytoin"],
  });
  assert.ok(kinetics.success);
  assert.throws(() => {
    (kinetics.data.modules as Record<string, unknown>).phenytoin = null;
  }, TypeError);
});
