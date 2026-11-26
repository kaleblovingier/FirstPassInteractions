import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBriefPermalink,
  buildBriefUrl,
  buildRegimenBrief,
  isPairFinding,
  partitionFindings,
} from "./brief.ts";
import type { Finding } from "./types.ts";

function finding(partial: Partial<Finding> & Pick<Finding, "id" | "drugIds" | "headline">): Finding {
  return {
    severity: "major",
    kind: "pk",
    enzymes: [],
    effect: "↑ exposure",
    mechanism: "CYP3A4 inhibition",
    clinical: "Higher levels and more side effects.",
    tags: [],
    ...partial,
  };
}

test("isPairFinding requires exactly two non-virtual drug ids", () => {
  assert.equal(isPairFinding(finding({ id: "a", drugIds: ["ketamine", "alprazolam"], headline: "K × A" })), true);
  assert.equal(isPairFinding(finding({ id: "b", drugIds: ["ketamine", "alprazolam", "ethanol"], headline: "triple" })), false);
  assert.equal(
    isPairFinding(finding({ id: "c", drugIds: ["ketamine", "__smoke"], headline: "host" })),
    false,
  );
  assert.equal(
    isPairFinding(finding({ id: "d", drugIds: ["ketamine", "alprazolam", "__smoke"], headline: "pair+virtual" })),
    true,
  );
});

test("partitionFindings sends 2-drug to pairs and 3+ to deskNotes", () => {
  const pair = finding({ id: "p", drugIds: ["ketamine", "alprazolam"], headline: "Ketamine × Alprazolam", severity: "major" });
  const desk = finding({
    id: "d",
    drugIds: ["fluoxetine", "tramadol", "sertraline"],
    headline: "Serotonin stack",
    severity: "moderate",
    kind: "pd",
  });
  const geno = finding({
    id: "g",
    drugIds: ["dextromethorphan"],
    headline: "2D6 PM",
    severity: "moderate",
    kind: "geno",
  });
  const { pairs, deskNotes } = partitionFindings([desk, pair, geno]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]!.id, "p");
  assert.equal(deskNotes.length, 2);
  assert.ok(deskNotes.some((f) => f.id === "d"));
  assert.ok(deskNotes.some((f) => f.id === "g"));
});

test("buildRegimenBrief leads with plain sentence and lists pairs before desk notes", () => {
  const pair = finding({
    id: "p",
    drugIds: ["ketamine", "alprazolam"],
    headline: "Ketamine × Alprazolam",
    severity: "major",
    clinical: "Sleepiness and breathing problems.",
    mechanism: "NMDA + GABA sedation",
  });
  const desk = finding({
    id: "d",
    drugIds: ["a", "b", "c"],
    headline: "Triple CNS",
    severity: "moderate",
  });
  const text = buildRegimenBrief({
    names: "Ketamine + Alprazolam + Extra",
    findings: [desk, pair],
    highest: "major",
  });
  assert.match(text, /^FirstPass regimen brief · Ketamine \+ Alprazolam \+ Extra/m);
  assert.match(text, /Sharpest pair \(Serious concern\): Ketamine × Alprazolam/);
  assert.match(text, /In plain English:/);
  assert.match(text, /Pairs, worst first:/);
  assert.match(text, /Whole-desk notes:/);
  assert.match(text, /Educational desk only/);
  assert.match(text, /Does not pick a milligram/);
  const pairsIdx = text.indexOf("Pairs, worst first:");
  const deskIdx = text.indexOf("Whole-desk notes:");
  assert.ok(pairsIdx < deskIdx);
  assert.ok(text.indexOf("Ketamine × Alprazolam") < text.indexOf("Triple CNS") || text.includes("1. Serious concern — Ketamine"));
});

test("buildRegimenBrief says plainly when no pairs", () => {
  const text = buildRegimenBrief({ names: "Clozapine", findings: [], highest: "none" });
  assert.match(text, /No mapped collisions/);
  assert.match(text, /not a green light/);
  assert.match(text, /\(none\)/);
});

test("permalink helpers encode ids in tray order", () => {
  const rel = buildBriefPermalink(["ketamine", "alprazolam", "ethanol"]);
  assert.equal(rel, "/?brief=ketamine,alprazolam,ethanol");
  const abs = buildBriefUrl(["ketamine", "alprazolam"], { base: "https://example.test/" });
  assert.equal(abs, "https://example.test/?brief=ketamine%2Calprazolam");
  const capped = buildBriefPermalink(Array.from({ length: 12 }, (_, i) => `d${i}`));
  assert.equal(capped.split(",").length, 8);
});

test("findingsOnTray drops off-tray grapefruit so brief lead stays on-tray", () => {
  const onTray = finding({
    id: "ka",
    drugIds: ["ketamine", "alprazolam"],
    headline: "Ketamine × Alprazolam",
    severity: "major",
  });
  const offTray = finding({
    id: "gf",
    drugIds: ["grapefruit", "ketamine"],
    headline: "Grapefruit × Ketamine",
    severity: "contraindicated",
  });
  const text = buildRegimenBrief({
    names: "Ketamine, Alprazolam",
    findings: [offTray, onTray],
    highest: "contraindicated",
    trayIds: ["ketamine", "alprazolam"],
  });
  assert.match(text, /Sharpest pair \(Serious concern\): Ketamine × Alprazolam/);
  assert.doesNotMatch(text, /[Gg]rapefruit/);
});

test("deskReportText: every finding carries a source, and the footer says not a dose and PI governs", async () => {
  const { deskReportText, findingSourceLine, EXPORT_NOT_A_DOSE } = await import("./brief.ts");
  const { analyze } = await import("./engine.ts");
  const { DEFAULT_HOST } = await import("./types.ts");
  const { PI_FOOTER } = await import("../regulatory.ts");
  const findings = analyze(["clarithromycin", "simvastatin"], DEFAULT_HOST).findings;
  assert.ok(findings.length > 0);
  const text = deskReportText(["FirstPass regimen: Clarithromycin + Simvastatin"], findings);
  assert.equal(text.match(/^ {2}Source: /gm)?.length, findings.length);
  for (const f of findings) assert.ok(text.includes(`  Source: ${findingSourceLine(f)}`), f.id);
  assert.match(findingSourceLine(findings[0]!), / — https:\/\//);
  assert.ok(text.endsWith(`${EXPORT_NOT_A_DOSE}\n${PI_FOOTER}`));
});

test("deskReportText: an empty desk says nothing matched, never that the pair is safe", async () => {
  const { deskReportText, EXPORT_EMPTY, EXPORT_NOT_A_DOSE } = await import("./brief.ts");
  const text = deskReportText(["FirstPass regimen: Ondansetron"], []);
  assert.ok(text.includes(EXPORT_EMPTY));
  assert.ok(text.includes(EXPORT_NOT_A_DOSE));
  assert.match(text, /not a green light/);
  assert.doesNotMatch(text, /\bsafe\b|no interaction/i);
});

test("buildStructuredRegimenJson & buildMarkdownRegimenReport: empty tray produces clean empty export with disclaimers", async () => {
  const {
    buildMarkdownRegimenReport,
    buildStructuredRegimenJson,
    EXPORT_EMPTY,
    EXPORT_NOT_A_DOSE,
  } = await import("./brief.ts");
  const { analyze } = await import("./engine.ts");
  const { PI_FOOTER } = await import("../regulatory.ts");
  const { DOSE_PATTERN } = await import("../guards/dose-rule.ts");

  const report = analyze([]);
  const json = buildStructuredRegimenJson({
    trayIds: [],
    report,
    generatedAt: "2026-11-24T00:00:00.000Z",
  });
  assert.equal(json.compounds.length, 0);
  assert.equal(json.pathwayMatrix.length, 0);
  assert.equal(json.findings.length, 0);
  assert.equal(json.highest, "none");
  assert.equal(json.disclaimer, EXPORT_NOT_A_DOSE);
  assert.equal(json.prescribingNote, PI_FOOTER);
  assert.equal(json.generatedAt, "2026-11-24T00:00:00.000Z");

  const md = buildMarkdownRegimenReport({ trayIds: [], report });
  assert.match(md, /^# FirstPass Clinical Monograph Regimen Report/m);
  assert.match(md, /## Regimen Compounds & Metabolic Roles/);
  assert.match(md, /## Mechanistic Findings/);
  assert.ok(md.includes(EXPORT_EMPTY));
  assert.ok(md.includes(EXPORT_NOT_A_DOSE));
  assert.ok(md.includes(PI_FOOTER));
  assert.deepEqual(md.match(DOSE_PATTERN) ?? [], []);
});

test("buildStructuredRegimenJson & buildMarkdownRegimenReport: 2-drug tray includes half-lives, pathway matrix, and sources", async () => {
  const {
    buildMarkdownRegimenReport,
    buildStructuredRegimenJson,
    EXPORT_NOT_A_DOSE,
    findingSourceLine,
  } = await import("./brief.ts");
  const { analyze } = await import("./engine.ts");
  const { DEFAULT_HOST } = await import("./types.ts");
  const { DOSE_PATTERN } = await import("../guards/dose-rule.ts");

  const trayIds = ["clarithromycin", "simvastatin", "clarithromycin"];
  const report = analyze(trayIds, DEFAULT_HOST);
  const json = buildStructuredRegimenJson({
    trayIds,
    report,
    hostLine: "Geriatric · CKD stage 3",
  });

  // Deduplicates trayIds against DRUG_BY_ID
  assert.deepEqual(
    json.compounds.map((c) => c.id),
    ["clarithromycin", "simvastatin"],
  );
  const clarith = json.compounds.find((c) => c.id === "clarithromycin")!;
  const simva = json.compounds.find((c) => c.id === "simvastatin")!;
  assert.equal(clarith.halfLifeHours, 7);
  assert.equal(clarith.halfLifeLabel, "7 h");
  assert.equal(simva.halfLifeHours, 3);
  assert.equal(simva.halfLifeLabel, "3 h");

  const cyp3a4 = json.pathwayMatrix.find((row) => row.enzyme === "CYP3A4");
  assert.ok(cyp3a4);
  assert.equal(cyp3a4.colliding, true);
  assert.ok(cyp3a4.collisions > 0);
  assert.ok(cyp3a4.inhibitors.includes("clarithromycin"));
  assert.ok(cyp3a4.substrates.includes("simvastatin"));

  assert.equal(json.highest, "contraindicated");
  assert.equal(json.hostLine, "Geriatric · CKD stage 3");
  assert.ok(json.findings.length > 0);
  assert.equal(json.findings[0]!.source, findingSourceLine(report.findings[0]!));
  assert.match(json.findings[0]!.plainSummary, /In plain English:/);

  const md = buildMarkdownRegimenReport({
    trayIds,
    report,
    hostLine: "Geriatric · CKD stage 3",
  });
  assert.match(md, /\| Compound \| Class \| t½ \| CYP \/ P-gp Roles \|/);
  assert.match(md, /\| Clarithromycin \|.*\| 7 h \|/);
  assert.match(md, /\| Simvastatin \|.*\| 3 h \|/);
  assert.match(md, /Host context:\*\* Geriatric · CKD stage 3/);
  assert.match(md, /### Avoid together/);
  assert.ok(md.includes(EXPORT_NOT_A_DOSE));
  assert.deepEqual(md.match(DOSE_PATTERN) ?? [], []);
});

test("buildStructuredRegimenJson & buildMarkdownRegimenReport: 3+ drug cascade tray groups findings and stays dose-free", async () => {
  const { buildMarkdownRegimenReport, buildStructuredRegimenJson } = await import("./brief.ts");
  const { analyze } = await import("./engine.ts");
  const { DEFAULT_HOST } = await import("./types.ts");
  const { DOSE_PATTERN } = await import("../guards/dose-rule.ts");

  const trayIds = ["rifampin", "ketoconazole", "midazolam", "sertraline"];
  const report = analyze(trayIds, DEFAULT_HOST);
  const json = buildStructuredRegimenJson({ trayIds, report });

  assert.equal(json.compounds.length, 4);
  const sert = json.compounds.find((c) => c.id === "sertraline")!;
  assert.equal(sert.halfLifeHours, 26);
  assert.equal(sert.halfLifeLabel, "26 h");
  assert.ok(json.findings.some((f) => f.id.startsWith("grp-pk-opposing-CYP3A4-")));
  assert.ok(json.stacks.length > 0);

  const md = buildMarkdownRegimenReport({ trayIds, report });
  assert.match(md, /Opposing CYP3A4 inhibition \+ induction on the same tray/);
  assert.match(md, /## Pharmacogenomics, Transporters & Perpetrator Kinetics/);
  assert.match(md, /Ki 0\.015 µM/);
  assert.match(md, /PXR inducer/);
  assert.deepEqual(md.match(DOSE_PATTERN) ?? [], []);
  assert.deepEqual(JSON.stringify(json).match(DOSE_PATTERN) ?? [], []);
});

test("buildStructuredRegimenJson & buildMarkdownRegimenReport: includes CPIC PGx, membrane transporters, and non-linear half-life caveats", async () => {
  const { buildMarkdownRegimenReport, buildStructuredRegimenJson } = await import("./brief.ts");
  const { analyze } = await import("./engine.ts");
  const { DEFAULT_HOST } = await import("./types.ts");
  const { DOSE_PATTERN } = await import("../guards/dose-rule.ts");

  const trayIds = ["simvastatin", "allopurinol", "clopidogrel"];
  const report = analyze(trayIds, DEFAULT_HOST);
  const json = buildStructuredRegimenJson({ trayIds, report });

  const simva = json.compounds.find((c) => c.id === "simvastatin")!;
  assert.ok(simva.cpicGenes.some((g) => g.gene === "SLCO1B1" && g.cpicLevel === "Level A"));
  assert.ok(simva.transporters.some((t) => t.gene.includes("SLCO1B1") && t.roles.includes("Substrate")));

  const allo = json.compounds.find((c) => c.id === "allopurinol")!;
  assert.equal(allo.halfLifeHours, null);
  assert.equal(allo.halfLifeLabel, "Non-linear / covalent");
  assert.match(allo.nonLinearHalfLifeNote ?? "", /oxypurinol/i);
  assert.ok(allo.cpicGenes.some((g) => g.gene === "HLA-B*58:01"));

  const clop = json.compounds.find((c) => c.id === "clopidogrel")!;
  assert.equal(clop.halfLifeLabel, "Non-linear / covalent");
  assert.ok(clop.cpicGenes.some((g) => g.gene === "CYP2C19" && g.fdaBoxedWarning));
  assert.ok(clop.perpetratorKinetics.some((k) => k.mode === "tdi"));

  const md = buildMarkdownRegimenReport({ trayIds, report });
  assert.match(md, /## Pharmacogenomics, Transporters & Perpetrator Kinetics/);
  assert.match(md, /SLCO1B1 \(Level A\)/);
  assert.match(md, /HLA-B\*58:01/);
  assert.match(md, /Non-linear \/ covalent/);
  assert.deepEqual(md.match(DOSE_PATTERN) ?? [], []);
  assert.deepEqual(JSON.stringify(json).match(DOSE_PATTERN) ?? [], []);
});
