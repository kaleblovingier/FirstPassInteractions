import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCdsRequest } from "./cds-handler.server";
import { resetApiMeters } from "./api-access.server";
import { ClinicalDecisionService } from "./cds-service";
import type { ApiDrugMonographResult, ApiDrugSummary, ExportRegimenResult } from "./cds-service";
import type { ProblemDetails } from "./problem";
import { DOSE_PATTERN } from "../../guards/dose-rule";

function postJson(url: string, body: unknown, extraHeaders?: Record<string, string>): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

test("GET /api/cds/search supports indexed enzyme + role filtering without q", async () => {
  resetApiMeters();
  const res = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?enzyme=CYP2D6&role=inhibitor&limit=20"),
  );
  assert.equal(res.status, 200);
  const rows = (await res.json()) as ApiDrugSummary[];
  assert.ok(rows.length > 0 && rows.length <= 20);
  for (const row of rows) {
    assert.ok(
      row.cypRoles?.some((r) => r.enzyme === "CYP2D6" && r.role === "inhibitor"),
      `${row.id} should be a CYP2D6 inhibitor`,
    );
  }
  assert.ok(
    rows.some((r) => r.id === "bupropion" || r.id === "fluoxetine" || r.id === "paroxetine"),
    "Expected well-known CYP2D6 inhibitor in indexed results",
  );
});

test("GET /api/cds/search supports cls filtering without q and combined q + enzyme + role", async () => {
  resetApiMeters();
  const opioidRes = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?cls=opioid&limit=15"),
  );
  assert.equal(opioidRes.status, 200);
  const opioids = (await opioidRes.json()) as ApiDrugSummary[];
  assert.ok(opioids.length > 0 && opioids.length <= 15);
  for (const row of opioids) {
    assert.match(row.family ?? "", /opioid/i);
  }

  resetApiMeters();
  const comboRes = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?q=statin&enzyme=CYP3A4&role=substrate&limit=10"),
  );
  assert.equal(comboRes.status, 200);
  const statins = (await comboRes.json()) as ApiDrugSummary[];
  assert.ok(statins.length > 0);
  for (const row of statins) {
    assert.ok(row.cypRoles?.some((r) => r.enzyme === "CYP3A4" && r.role === "substrate"));
  }

  // Invalid enzyme returns 422
  resetApiMeters();
  const badEnzyme = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?enzyme=CYP999Z"),
  );
  assert.equal(badEnzyme.status, 422);
});

test("GET /api/cds/search supports indexed membrane transporter and CPIC pgx filtering", async () => {
  resetApiMeters();
  const oatpInhRes = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?transporter=OATP1B1&role=inhibitor&limit=20"),
  );
  assert.equal(oatpInhRes.status, 200);
  const oatpInh = (await oatpInhRes.json()) as ApiDrugSummary[];
  assert.ok(oatpInh.some((r) => r.id === "cyclosporine"));
  assert.ok(oatpInh.some((r) => r.id === "gemfibrozil"));
  assert.equal(
    oatpInh.some((r) => r.id === "rosuvastatin"),
    false,
    "Substrate rosuvastatin must not appear under role=inhibitor",
  );

  resetApiMeters();
  const pgxSlcoRes = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?pgx=SLCO1B1&limit=20"),
  );
  assert.equal(pgxSlcoRes.status, 200);
  const slcoDrugs = (await pgxSlcoRes.json()) as ApiDrugSummary[];
  assert.ok(slcoDrugs.some((r) => r.id === "simvastatin"));
  assert.ok(slcoDrugs.some((r) => r.id === "atorvastatin"));

  resetApiMeters();
  const pgxHlaRes = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?pgx=HLA-B*58:01&limit=10"),
  );
  assert.equal(pgxHlaRes.status, 200);
  const hlaDrugs = (await pgxHlaRes.json()) as ApiDrugSummary[];
  assert.ok(hlaDrugs.some((r) => r.id === "allopurinol"));

  // Unrecognized transporter or pgx filter returns 422
  resetApiMeters();
  const badTx = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?transporter=NOTATRANSPORTER"),
  );
  assert.equal(badTx.status, 422);

  resetApiMeters();
  const badPgx = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?pgx=GENE999"),
  );
  assert.equal(badPgx.status, 422);

  // TDM boolean filter (standalone and combined with enzyme)
  resetApiMeters();
  const tdmAllRes = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?tdm=true&limit=50"),
  );
  assert.equal(tdmAllRes.status, 200);
  const tdmAll = (await tdmAllRes.json()) as ApiDrugSummary[];
  assert.equal(tdmAll.length, 50);
  assert.ok(tdmAll.some((r) => r.id === "flecainide" || r.id === "cefepime" || r.id === "lithium"));

  resetApiMeters();
  const tdm2d6Res = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?tdm=true&enzyme=CYP2D6&limit=20"),
  );
  assert.equal(tdm2d6Res.status, 200);
  const tdm2d6 = (await tdm2d6Res.json()) as ApiDrugSummary[];
  assert.ok(tdm2d6.some((r) => r.id === "flecainide"));
  assert.ok(tdm2d6.some((r) => r.id === "aripiprazole"));
  assert.equal(
    tdm2d6.some((r) => r.id === "codeine"),
    false,
    "Non-TDM CYP2D6 drug must be excluded when tdm=true",
  );

  resetApiMeters();
  const badTdm = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?tdm=maybe"),
  );
  assert.equal(badTdm.status, 422);
});

test("POST /api/cds/export returns structured JSON monograph export by default and explicitly", async () => {
  resetApiMeters();
  const res = await handleCdsRequest(
    postJson("http://localhost/api/cds/export", {
      drugs: ["clarithromycin", "simvastatin", "clarithromycin"],
      format: "json",
      host: { age: 70, egfr: 45, smoker: true },
    }),
  );
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type")?.includes("application/json"));

  const payload = (await res.json()) as Extract<ExportRegimenResult, { format: "json" }>;
  assert.equal(payload.format, "json");
  assert.deepEqual(
    payload.report.compounds.map((c) => c.id),
    ["clarithromycin", "simvastatin"],
  );
  assert.equal(payload.report.compounds[0]!.halfLifeHours, 7);
  assert.equal(payload.report.compounds[1]!.halfLifeHours, 3);
  assert.ok(payload.report.compounds[1]!.cpicGenes.some((g) => g.gene === "SLCO1B1"));
  assert.ok(payload.report.compounds[1]!.transporters.some((t) => t.gene.includes("SLCO1B1")));
  assert.ok(payload.report.compounds[0]!.perpetratorKinetics.some((k) => k.mode === "tdi"));
  assert.equal(payload.report.highest, "contraindicated");
  assert.match(payload.report.hostLine ?? "", /Geriatric/);
  assert.match(payload.report.hostLine ?? "", /CKD stage 3/);
  assert.match(payload.report.hostLine ?? "", /Smoker/);
  assert.ok(payload.report.pathwayMatrix.some((r) => r.enzyme === "CYP3A4" && r.colliding));
  assert.ok(payload.report.findings.length > 0);
  assert.match(payload.report.disclaimer, /Educational reference only/);
  assert.match(payload.report.prescribingNote, /Not FDA-cleared/);
  assert.deepEqual(JSON.stringify(payload).match(DOSE_PATTERN) ?? [], []);
});

test("POST /api/cds/export returns Markdown in JSON envelope by default and raw text/markdown when requested", async () => {
  resetApiMeters();
  const jsonWrapRes = await handleCdsRequest(
    postJson("http://localhost/api/cds/export", {
      drugs: ["rifampin", "ketoconazole", "midazolam"],
      format: "markdown",
    }),
  );
  assert.equal(jsonWrapRes.status, 200);
  assert.ok(jsonWrapRes.headers.get("content-type")?.includes("application/json"));

  const wrapped = (await jsonWrapRes.json()) as Extract<
    ExportRegimenResult,
    { format: "markdown" }
  >;
  assert.equal(wrapped.format, "markdown");
  assert.equal(wrapped.contentType, "text/markdown; charset=utf-8");
  assert.equal(wrapped.compounds, 3);
  assert.ok(wrapped.findings > 0);
  assert.match(wrapped.markdown, /^# FirstPass Clinical Monograph Regimen Report/m);
  assert.match(wrapped.markdown, /Opposing CYP3A4 inhibition \+ induction on the same tray/);
  assert.deepEqual(wrapped.markdown.match(DOSE_PATTERN) ?? [], []);

  resetApiMeters();
  const rawMdRes = await handleCdsRequest(
    postJson(
      "http://localhost/api/cds/export",
      { drugs: ["fluoxetine", "bupropion", "codeine"], format: "markdown" },
      { Accept: "text/markdown" },
    ),
  );
  assert.equal(rawMdRes.status, 200);
  assert.equal(rawMdRes.headers.get("content-type"), "text/markdown; charset=utf-8");
  const rawMd = await rawMdRes.text();
  assert.match(rawMd, /# FirstPass Clinical Monograph Regimen Report/);
  assert.match(rawMd, /prodrug bioactivation blockade/);
  assert.deepEqual(rawMd.match(DOSE_PATTERN) ?? [], []);
});

test("POST /api/cds/export enforces 405 Method Not Allowed and 400 Bad Request on invalid payloads or unknown drugs", async () => {
  resetApiMeters();
  const getRes = await handleCdsRequest(new Request("http://localhost/api/cds/export"));
  assert.equal(getRes.status, 405);
  assert.equal(getRes.headers.get("allow"), "POST");
  const getProblem = (await getRes.json()) as ProblemDetails;
  assert.equal(getProblem.status, 405);

  resetApiMeters();
  const emptyDrugs = await handleCdsRequest(
    postJson("http://localhost/api/cds/export", { drugs: [] }),
  );
  assert.equal(emptyDrugs.status, 400);
  assert.ok(emptyDrugs.headers.get("content-type")?.includes("application/problem+json"));
  const emptyProblem = (await emptyDrugs.json()) as ProblemDetails;
  assert.equal(emptyProblem.status, 400);
  assert.ok(emptyProblem.invalidParams?.some((p) => p.name === "drugs"));

  resetApiMeters();
  const badFormat = await handleCdsRequest(
    postJson("http://localhost/api/cds/export", { drugs: ["warfarin"], format: "pdf" }),
  );
  assert.equal(badFormat.status, 400);

  resetApiMeters();
  const unknownDrug = await handleCdsRequest(
    postJson("http://localhost/api/cds/export", {
      drugs: ["warfarin", "totally-unknown-compound-xyz"],
      format: "json",
    }),
  );
  assert.equal(unknownDrug.status, 400);
  const unknownProblem = (await unknownDrug.json()) as ProblemDetails;
  assert.equal(unknownProblem.status, 400);
  assert.ok(unknownProblem.invalidParams?.some((p) => p.name === "drugs.1"));

  // Direct service check for deduplicated single-drug regimen
  const dup = await ClinicalDecisionService.exportRegimen({ drugs: ["warfarin", "warfarin"] });
  assert.equal(dup.success, true);
  if (dup.success && dup.data.format === "json") {
    assert.equal(dup.data.report.compounds.length, 1);
    assert.equal(dup.data.report.findings.length, 0);
  }
});

test("GET /api/cds/monograph/:id returns complete PK, CPIC PGx, transporter, kinetics, washout, and TDM monograph", async () => {
  resetApiMeters();
  const simvaRes = await handleCdsRequest(new Request("http://localhost/api/cds/monograph/simvastatin"));
  assert.equal(simvaRes.status, 200);
  const simva = (await simvaRes.json()) as ApiDrugMonographResult;
  assert.equal(simva.monograph.id, "simvastatin");
  assert.equal(simva.monograph.halfLife?.kind, "linear");
  assert.ok(simva.monograph.cpicGenes.some((g) => g.geneSymbol === "SLCO1B1"));
  assert.ok(simva.monograph.transporters.some((t) => t.gene.includes("SLCO1B1")));
  assert.match(simva.monograph.disclaimer, /Educational reference only/);
  assert.deepEqual(JSON.stringify(simva).match(DOSE_PATTERN) ?? [], []);

  // Brand name resolution (Prozac -> fluoxetine) + TDI + washout clock
  resetApiMeters();
  const prozacRes = await handleCdsRequest(new Request("http://localhost/api/cds/monograph/Prozac"));
  assert.equal(prozacRes.status, 200);
  const prozac = (await prozacRes.json()) as ApiDrugMonographResult;
  assert.equal(prozac.monograph.id, "fluoxetine");
  assert.ok(prozac.monograph.perpetratorKinetics.tdi !== null);
  assert.ok(prozac.monograph.washoutClocks.some((w) => w.days === 35));

  // Non-linear / active-metabolite caveat + HLA-B*58:01
  resetApiMeters();
  const alloRes = await handleCdsRequest(new Request("http://localhost/api/cds/monograph/allopurinol"));
  assert.equal(alloRes.status, 200);
  const allo = (await alloRes.json()) as ApiDrugMonographResult;
  assert.equal(allo.monograph.halfLife?.kind, "non-linear");
  assert.ok(allo.monograph.cpicGenes.some((g) => g.geneSymbol === "HLA-B*58:01"));

  // Competitive Ki + 5x washout
  resetApiMeters();
  const ketoRes = await handleCdsRequest(new Request("http://localhost/api/cds/monograph/ketoconazole"));
  assert.equal(ketoRes.status, 200);
  const keto = (await ketoRes.json()) as ApiDrugMonographResult;
  assert.equal(keto.monograph.halfLife?.kind, "linear");
  if (keto.monograph.halfLife?.kind === "linear") {
    assert.equal(keto.monograph.halfLife.hours, 8);
    assert.equal(keto.monograph.halfLife.washout5xHours, 40);
  }
  assert.equal(keto.monograph.perpetratorKinetics.competitive?.kiMicromolar, 0.015);

  // TDM window (lithium)
  resetApiMeters();
  const liRes = await handleCdsRequest(new Request("http://localhost/api/cds/monograph/lithium"));
  assert.equal(liRes.status, 200);
  const li = (await liRes.json()) as ApiDrugMonographResult;
  assert.equal(li.monograph.tdm?.analyte, "Lithium");

  // 404 on unknown compound, 405 on POST
  resetApiMeters();
  const missingRes = await handleCdsRequest(new Request("http://localhost/api/cds/monograph/nonexistent-drug-xyz"));
  assert.equal(missingRes.status, 404);

  resetApiMeters();
  const badMethod = await handleCdsRequest(
    postJson("http://localhost/api/cds/monograph/simvastatin", {}),
  );
  assert.equal(badMethod.status, 405);
  assert.equal(badMethod.headers.get("allow"), "GET");
});
