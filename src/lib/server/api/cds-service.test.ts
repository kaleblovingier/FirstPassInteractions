import { mock, test } from "node:test";
import assert from "node:assert/strict";
import {
  ClinicalDecisionService,
  STATUTORY_CDS_DISCLAIMER,
  buildHostContext,
  overrideEngineForTesting,
  resolveDrug,
  resolveDrugQuery,
  resolveHostContext,
  type KineticsModuleError,
} from "./cds-service";
import { ApiProblemError } from "./problem";
import { analyze } from "../../drugs/engine";
import { DEFAULT_HOST } from "../../drugs/types";
import { SOFTWARE } from "../../regulatory";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
    assert.equal(res.data.meta.fanout.stages[0], "resolve");
    assert.equal(res.data.meta.fanout.stages.at(-1), "reduce");
    assert.equal(res.data.meta.fanout.pairs.length, 1);
    assert.ok(res.data.meta.fanout.rule.includes("Do not split"));
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
    drugs: [
      "methotrexate",
      "tacrolimus",
      "phenytoin",
      "norepinephrine",
      "digoxin",
      "furosemide",
      "propofol",
      "lorazepam",
    ],
    host: { age: 55, scr: 1.8, kidney: "moderate" },
    modules: [
      "oncology",
      "transplant",
      "phenytoin",
      "vasoactive",
      "antiarrhythmic",
      "acidbase",
      "anesthesia",
      "epilepsy",
      "obstetric",
      "moud",
      "glycemic",
      "pediatric",
      "resources",
      "rotation",
      "hepatic",
      "allergy",
      "af",
      "dili",
      "thyroid",
      "dialysis",
      "lithium",
      "digoxin",
      "valproate",
      "vancomycin",
      "aminoglycosides",
      "toxidromes",
      "arrhythmia",
    ],
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
    assert.ok(res.data.modules.epilepsy);
    assert.ok(res.data.modules.obstetric);
    assert.ok(res.data.modules.moud);
    assert.ok(res.data.modules.glycemic);
    assert.ok(res.data.modules.pediatric);
    assert.ok(res.data.modules.rotation);
    assert.ok(res.data.modules.hepatic);
    assert.ok(res.data.modules.allergy);
    assert.ok(res.data.modules.af);
    assert.ok(res.data.modules.dili);
    assert.ok(res.data.modules.resources);
    assert.ok(res.data.modules.thyroid);
    assert.ok(res.data.modules.lithium !== undefined);
    assert.ok(res.data.modules.digoxin !== undefined);
    assert.ok(res.data.modules.valproate !== undefined);
    assert.ok(res.data.modules.vancomycin !== undefined);
    assert.ok(res.data.modules.aminoglycosides !== undefined);
    assert.ok(res.data.modules.toxidromes !== undefined);
    assert.ok(res.data.modules.arrhythmia !== undefined);
    assert.ok(res.data.meta.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
  }
});

test("ClinicalDecisionService: only exact id, name, brand, or alias matches resolve", () => {
  // Partial, misspelled, and keyword strings used to resolve to the first fuzzy search hit.
  for (const query of ["warf", "simvastatn", "qt", "pregnancy", "geriatric", "food", "ace"]) {
    assert.equal(resolveDrug(query), undefined, `${query} must not resolve`);
  }
  const partial = resolveDrugQuery("warf");
  assert.ok(partial.status === "not-found");
  assert.ok(partial.candidates.some((c) => c.id === "warfarin"));

  // Case, punctuation, and trailing salt/release tokens are ignored.
  assert.equal(resolveDrug("WARFARIN")?.id, "warfarin");
  assert.equal(resolveDrug("metformin hcl")?.id, "metformin");
  assert.equal(resolveDrug("Toprol XL")?.id, "metoprolol");
  assert.equal(resolveDrug("Coumadin")?.id, "warfarin");

  // A catalog id wins over another entry's alias with the same text.
  assert.equal(resolveDrug("Sodium Bicarbonate")?.id, "sodium-bicarbonate");
  assert.equal(resolveDrug("nirmatrelvir")?.id, "nirmatrelvir");
  assert.deepEqual(resolveDrugQuery("Plavix"), {
    query: "Plavix",
    status: "resolved",
    drugId: "clopidogrel",
    matchedBy: "brand-or-alias",
  });
});

test("ClinicalDecisionService: a brand or alias shared by several entries is ambiguous", () => {
  const depakote = resolveDrugQuery("Depakote");
  assert.ok(depakote.status === "ambiguous");
  assert.deepEqual(depakote.candidates.map((c) => c.id).sort(), ["divalproex", "valproate"]);
  assert.equal(resolveDrug("china white"), undefined);
});

test("ClinicalDecisionService: object prototype keys never resolve to a fake drug", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    for (const query of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      assert.equal(resolveDrug(query), undefined, `${query} must not resolve`);
    }
    const res = await ClinicalDecisionService.checkInteractions({
      drugs: ["constructor", "warfarin"],
    });
    assert.ok(res.success);
    assert.deepEqual(
      res.data.query.resolvedDrugs.map((d) => d.id),
      ["warfarin"],
    );
    assert.deepEqual(res.data.query.unresolvedDrugs, ["constructor"]);

    const kinetics = await ClinicalDecisionService.evaluateKinetics({
      drugs: ["constructor"],
      modules: ["oncology"],
    });
    assert.equal(kinetics.success, false);
    assert.ok(!kinetics.success && kinetics.problem.status === 404);
  } finally {
    warn.mock.restore();
  }
});

test("ClinicalDecisionService: unresolved items are listed with candidates and a warning, never silently dropped", async () => {
  ClinicalDecisionService.clearCaches();
  const res = await ClinicalDecisionService.checkInteractions({
    drugs: ["warf", "simvastatin", "Depakote"],
  });
  assert.ok(res.success);
  assert.deepEqual(res.data.query.unresolvedDrugs, ["warf", "Depakote"]);
  assert.deepEqual(
    res.data.query.resolvedDrugs.map((d) => d.id),
    ["simvastatin"],
  );
  assert.deepEqual(
    res.data.query.resolution.map((r) => r.status),
    ["not-found", "resolved", "ambiguous"],
  );
  const warning = res.data.warnings.find((w) => w.code === "drugs-unresolved");
  assert.ok(warning);
  assert.match(warning.detail, /2 of 3/);
  assert.match(warning.detail, /not a clearance/);

  const none = await ClinicalDecisionService.checkInteractions({ drugs: ["warf", "Depakote"] });
  assert.ok(!none.success);
  assert.equal(none.problem.status, 404);
  assert.deepEqual(
    none.problem.invalidParams?.map((p) => p.name),
    ["drugs.0", "drugs.1"],
  );
  assert.match(none.problem.invalidParams?.[0].reason ?? "", /Warfarin \(warfarin\)/);
  assert.match(none.problem.invalidParams?.[1].reason ?? "", /more than one catalog entry/);
  // The problem never echoes the submitted strings.
  assert.ok(!JSON.stringify(none.problem).includes('warf"'));
  assert.ok(!JSON.stringify(none.problem).includes("Depakote"));
});

test("ClinicalDecisionService: two names for one drug are analyzed once, without a self-pair", async () => {
  ClinicalDecisionService.clearCaches();
  const res = await ClinicalDecisionService.checkInteractions({ drugs: ["warfarin", "Coumadin"] });
  assert.ok(res.success);
  assert.deepEqual(
    res.data.query.resolvedDrugs.map((d) => d.id),
    ["warfarin"],
  );
  assert.equal(res.data.findings.length, 0);

  const kinetics = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["phenytoin", "Dilantin", "phenytoin"],
    modules: ["phenytoin"],
  });
  assert.ok(kinetics.success);
  assert.deepEqual(kinetics.data.query.drugIds, ["phenytoin"]);
});

test("ClinicalDecisionService: eGFR maps to the kidney band and CKD stage", () => {
  assert.deepEqual(
    [15, 10, 29, 45, 59, 60, 90].map((egfr) => {
      const host = buildHostContext({ egfr });
      return [egfr, host.kidney, host.ckdStage ?? null, host.egfr];
    }),
    [
      [15, "ckd", 4, 15],
      [10, "ckd", 5, 10],
      [29, "ckd", 4, 29],
      [45, "ckd", 3, 45],
      [59, "ckd", 3, 59],
      [60, "ok", null, 60],
      [90, "ok", null, 90],
    ],
  );
  assert.equal(buildHostContext({ kidney: "severe" }).ckdStage, 4);
  assert.equal(buildHostContext({ kidney: "mild" }).kidney, "ok");
  assert.equal(buildHostContext({ kidney: "severe", egfr: 20 }).ckdStage, 4);
  assert.equal(buildHostContext().kidney, "ok");
});

test("ClinicalDecisionService: an eGFR without a kidney category changes the renal rows", async () => {
  ClinicalDecisionService.clearCaches();
  const renal = (f: { sourceReferences: string[] }) => f.sourceReferences.includes("renal");
  const low = await ClinicalDecisionService.checkInteractions({
    drugs: ["metformin"],
    host: { egfr: 15 },
  });
  const usual = await ClinicalDecisionService.checkInteractions({
    drugs: ["metformin"],
    host: { egfr: 90 },
  });
  assert.ok(low.success && usual.success);
  assert.equal(low.data.meta.cached, false);
  assert.equal(usual.data.meta.cached, false);
  assert.equal(low.data.findings.some(renal), true);
  assert.equal(usual.data.findings.some(renal), false);
});

test("ClinicalDecisionService: a kidney category that contradicts eGFR is a 422", async () => {
  const res = await ClinicalDecisionService.checkInteractions({
    drugs: ["metformin"],
    host: { kidney: "normal", egfr: 20 },
  });
  assert.ok(!res.success);
  assert.equal(res.problem.status, 422);
  const param = res.problem.invalidParams?.find((p) => p.name === "host.egfr");
  assert.ok(param);
  assert.match(param.reason, /kidney category/);
  assert.ok(!param.reason.includes("20"), "the submitted eGFR is not echoed");

  const esrd = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["metformin"],
    host: { kidney: "esrd", egfr: 40 },
  });
  assert.ok(!esrd.success);
  assert.match(esrd.problem.invalidParams?.[0].reason ?? "", /dialysis/);

  // Direct callers that skip the schema get the same problem as a typed error.
  assert.throws(
    () => resolveHostContext({ kidney: "moderate", egfr: 75 }),
    (error: unknown) => error instanceof ApiProblemError && error.problem.status === 422,
  );
});

test("ClinicalDecisionService: host fields the engine cannot use come back as warnings", async () => {
  const child = resolveHostContext({ age: 8 });
  assert.equal(child.host.age, "adult");
  assert.deepEqual(
    child.warnings.map((w) => [w.code, w.field]),
    [["pediatric-age-not-modeled", "host.age"]],
  );

  const both = resolveHostContext({ pregnant: true, lactating: true });
  assert.equal(both.host.preg, "pregnant");
  assert.deepEqual(
    both.warnings.map((w) => w.code),
    ["lactation-not-applied"],
  );
  assert.equal(resolveHostContext({ lactating: true }).host.preg, "lactating");

  const res = await ClinicalDecisionService.checkInteractions({
    drugs: ["phenytoin"],
    host: {
      age: 70,
      sex: "female",
      weightKg: 60,
      scr: 2.1,
      ph: 7.3,
      serumAlbumin: 2.4,
      urinePh: 6,
    },
  });
  assert.ok(res.success);
  assert.equal(res.data.query.host.age, "geriatric");
  assert.deepEqual(
    res.data.warnings.filter((w) => w.code === "host-field-not-modeled").map((w) => w.field),
    ["host.sex", "host.weightKg", "host.scr", "host.ph", "host.serumAlbumin", "host.urinePh"],
  );
  assert.match(res.data.warnings.find((w) => w.field === "host.scr")?.detail ?? "", /egfr/);
});

test("ClinicalDecisionService: unknown request keys are a 422 that names the field", async () => {
  const res = await ClinicalDecisionService.checkInteractions({
    drugs: ["valproate"],
    host: { pregant: true },
  });
  assert.ok(!res.success);
  assert.equal(res.problem.status, 422);
  assert.deepEqual(
    res.problem.invalidParams?.map((p) => p.name),
    ["host.pregant"],
  );
  assert.match(res.problem.invalidParams?.[0].reason ?? "", /Did you mean "pregnant"\?/);

  const kinetics = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["valproate"],
    module: ["pregnancy"],
  });
  assert.ok(!kinetics.success);
  assert.match(kinetics.problem.invalidParams?.[0].reason ?? "", /Did you mean "modules"\?/);
});

test("ClinicalDecisionService: perpetrator and victim are set only where one drug acts on the other", async () => {
  ClinicalDecisionService.clearCaches();
  const pk = await ClinicalDecisionService.checkInteractions({
    drugs: ["simvastatin", "clarithromycin"],
  });
  assert.ok(pk.success);
  const inhibition = pk.data.findings.find(
    (f) => f.kind === "pk" && f.sourceReferences.includes("inhibitor"),
  );
  assert.ok(inhibition);
  assert.equal(inhibition.perpetratorId, "clarithromycin");
  assert.equal(inhibition.victimId, "simvastatin");
  assert.equal(inhibition.perpetratorName, "Clarithromycin");
  for (const f of pk.data.findings.filter((x) => x.kind !== "pk")) {
    assert.equal(f.perpetratorId, undefined, `${f.id} has no perpetrator`);
    assert.equal(
      new Set(f.drugs.map((d) => d.id)).size,
      f.drugs.length,
      `${f.id} lists each drug once`,
    );
  }

  const mix = await ClinicalDecisionService.checkInteractions({
    drugs: ["sertraline", "tramadol", "linezolid", "fluoxetine"],
  });
  assert.ok(mix.success);
  const maoi = mix.data.findings.find(
    (f) => f.kind === "pd" && f.mechanism === "MAOI × serotonergic",
  );
  assert.ok(maoi);
  assert.equal(maoi.perpetratorId, undefined);
  assert.equal(maoi.victimId, undefined);
  assert.equal(maoi.drugs.length, 2);
  const stack = mix.data.findings.find((f) => f.mechanism === "multi-drug serotonergic load");
  assert.ok(stack);
  assert.deepEqual(stack.drugs.map((d) => d.id).sort(), [
    "fluoxetine",
    "linezolid",
    "sertraline",
    "tramadol",
  ]);
});

test("ClinicalDecisionService: host factors the engine adds are named and flagged", async () => {
  ClinicalDecisionService.clearCaches();
  const res = await ClinicalDecisionService.checkInteractions({
    drugs: ["clozapine"],
    host: { smoker: true },
  });
  assert.ok(res.success);
  const smoke = res.data.findings.find((f) => f.perpetratorId === "__smoke");
  assert.ok(smoke);
  assert.equal(smoke.perpetratorName, "Tobacco smoke (PAH)");
  assert.equal(smoke.victimId, "clozapine");
  assert.deepEqual(smoke.drugs[0], {
    id: "__smoke",
    name: "Tobacco smoke (PAH)",
    hostFactor: true,
  });
});

test("ClinicalDecisionService: the summary uses the engine's own severity counts", async () => {
  ClinicalDecisionService.clearCaches();
  const drugs = [
    "sertraline",
    "tramadol",
    "linezolid",
    "fluoxetine",
    "simvastatin",
    "clarithromycin",
  ];
  const res = await ClinicalDecisionService.checkInteractions({ drugs });
  assert.ok(res.success);
  const report = analyze([...drugs].sort(), DEFAULT_HOST);
  assert.deepEqual(res.data.summary, {
    totalFindings: report.findings.length,
    contraindicatedCount: report.counts.contraindicated,
    majorCount: report.counts.major,
    moderateCount: report.counts.moderate,
    minorCount: report.counts.minor,
    highest: report.highest,
    highestSeverity: "Contraindicated",
  });
  assert.deepEqual(
    res.data.findings.map((f) => f.severity),
    report.findings.map((f) => f.severity),
  );
});

test("ClinicalDecisionService: cache keys use resolved ids and the full host context", async () => {
  ClinicalDecisionService.clearCaches();
  const generic = await ClinicalDecisionService.checkInteractions({
    drugs: ["clopidogrel", "omeprazole"],
  });
  const brand = await ClinicalDecisionService.checkInteractions({ drugs: ["Prilosec", "Plavix"] });
  assert.ok(generic.success && brand.success);
  assert.equal(generic.data.meta.cached, false);
  assert.equal(brand.data.meta.cached, true);
  assert.deepEqual(brand.data.query.requestedDrugs, ["Prilosec", "Plavix"]);
  assert.deepEqual(brand.data.findings, generic.data.findings);

  const allExplicit = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["warfarin"],
    modules: ["all"],
  });
  const allImplicit = await ClinicalDecisionService.evaluateKinetics({ drugs: ["warfarin"] });
  assert.ok(allExplicit.success && allImplicit.success);
  assert.equal(allExplicit.data.meta.cached, false);
  assert.equal(allImplicit.data.meta.cached, true);
  assert.equal(allImplicit.data.query.modules.length, 32);
});

test("ClinicalDecisionService: evaluateKinetics lists unresolved drugs and 404s when none resolve", async () => {
  ClinicalDecisionService.clearCaches();
  const none = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["zzzz-not-a-drug"],
    modules: ["oncology"],
  });
  assert.ok(!none.success);
  assert.equal(none.problem.status, 404);
  assert.equal(none.problem.invalidParams?.[0].name, "drugs.0");

  const some = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["phenytoin", "zzzz-not-a-drug"],
    modules: ["phenytoin"],
  });
  assert.ok(some.success);
  assert.deepEqual(some.data.query.drugIds, ["phenytoin"]);
  assert.deepEqual(some.data.query.unresolvedDrugs, ["zzzz-not-a-drug"]);
  assert.ok(some.data.warnings.some((w) => w.code === "drugs-unresolved"));
  assert.deepEqual(Object.keys(some.data.modules), ["phenytoin"]);
});

test("ClinicalDecisionService: one failing station returns an error marker, not a failed request", async () => {
  const warn = mock.method(console, "warn", () => {});
  let calls = 0;
  const restore = overrideEngineForTesting({
    modules: {
      hepatic: () => {
        calls += 1;
        throw new RangeError("hepatic table missing warfarin");
      },
    },
  });
  try {
    const request = { drugs: ["warfarin"], host: { pregnant: true }, modules: ["hepatic", "af"] };
    const res = await ClinicalDecisionService.evaluateKinetics(request);
    assert.ok(res.success);
    const marker = res.data.modules.hepatic as KineticsModuleError;
    assert.equal(marker.error.type, "module-error");
    assert.match(marker.error.correlationId, UUID);
    assert.ok(!marker.error.detail.includes("warfarin"));
    assert.ok(res.data.modules.af);
    assert.ok(!("error" in (res.data.modules.af as object)));
    assert.deepEqual(
      res.data.warnings.filter((w) => w.code === "module-failed").map((w) => w.field),
      ["modules.hepatic"],
    );

    // A payload with a failed station is not cached.
    const again = await ClinicalDecisionService.evaluateKinetics(request);
    assert.ok(again.success);
    assert.equal(again.data.meta.cached, false);
    assert.equal(calls, 2);

    const entry = JSON.parse(String(warn.mock.calls[0].arguments[0]));
    assert.equal(entry.event, "cds.kinetics.module_failed");
    assert.equal(entry.module, "hepatic");
    assert.equal(entry.errorKind, "RangeError");
    assert.equal(entry.correlationId, marker.error.correlationId);
    const logged = warn.mock.calls.map((c) => String(c.arguments[0])).join("\n");
    assert.ok(!logged.includes("warfarin"), "no drug names or error messages in logs");
    assert.ok(!logged.includes("pregnan"), "no host context in logs");
  } finally {
    restore();
    warn.mock.restore();
  }
});

test("ClinicalDecisionService: an engine exception becomes a 500 problem with a correlation id", async () => {
  const error = mock.method(console, "error", () => {});
  const restore = overrideEngineForTesting({
    analyze: () => {
      throw new TypeError("cannot read warfarin of undefined");
    },
  });
  try {
    const res = await ClinicalDecisionService.checkInteractions({ drugs: ["warfarin", "aspirin"] });
    assert.ok(!res.success);
    assert.equal(res.problem.status, 500);
    assert.match(res.problem.correlationId ?? "", UUID);
    assert.equal(res.problem.instance, `urn:uuid:${res.problem.correlationId}`);
    assert.ok(!res.problem.detail.includes("warfarin"), "internal error text is not exposed");

    const entry = JSON.parse(String(error.mock.calls[0].arguments[0]));
    assert.equal(entry.level, "error");
    assert.equal(entry.event, "cds.request_failed");
    assert.equal(entry.operation, "interactions");
    assert.equal(entry.errorKind, "TypeError");
    assert.equal(entry.correlationId, res.problem.correlationId);
    assert.ok(!String(error.mock.calls[0].arguments[0]).includes("warfarin"));
  } finally {
    restore();
    error.mock.restore();
  }

  const recovered = await ClinicalDecisionService.checkInteractions({
    drugs: ["warfarin", "aspirin"],
  });
  assert.ok(recovered.success);
});

test("ClinicalDecisionService: responses carry the shipped software version", async () => {
  ClinicalDecisionService.clearCaches();
  const ix = await ClinicalDecisionService.checkInteractions({ drugs: ["warfarin"] });
  const kin = await ClinicalDecisionService.evaluateKinetics({
    drugs: ["warfarin"],
    modules: ["af"],
  });
  assert.ok(ix.success && kin.success);
  assert.equal(ix.data.meta.version, SOFTWARE.version);
  assert.equal(kin.data.meta.version, SOFTWARE.version);
  assert.equal(kin.data.meta.disclaimer, STATUTORY_CDS_DISCLAIMER);
});
