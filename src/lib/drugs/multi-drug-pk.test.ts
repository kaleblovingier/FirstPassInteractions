import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./engine";
import { DEFAULT_HOST } from "./types";
import { DOSE_PATTERN } from "../guards/dose-rule";

test("analyze deduplicates identical drug IDs so self-collisions and double-counted stacks never occur", () => {
  const dupWarfarin = analyze(["warfarin", "warfarin"]);
  const singleWarfarin = analyze(["warfarin"]);
  assert.equal(dupWarfarin.findings.length, 0);
  assert.deepEqual(dupWarfarin.counts, singleWarfarin.counts);
  assert.deepEqual(dupWarfarin.burden, singleWarfarin.burden);
  assert.deepEqual(dupWarfarin.stacks, singleWarfarin.stacks);

  const dupSertraline = analyze(["sertraline", "sertraline", "sertraline"]);
  const singleSertraline = analyze(["sertraline"]);
  assert.deepEqual(dupSertraline.findings, singleSertraline.findings);
  assert.equal(
    dupSertraline.findings.some((f) => f.drugIds.length >= 2),
    false,
    "Duplicate sertraline entries must not produce self-pair or multi-drug stack findings",
  );
  assert.deepEqual(dupSertraline.counts, singleSertraline.counts);
  assert.deepEqual(dupSertraline.burden, singleSertraline.burden);
  assert.deepEqual(dupSertraline.stacks, singleSertraline.stacks);

  // Unknown or prototype keys are safely ignored without crashing
  const protoSafe = analyze(["warfarin", "constructor", "__proto__", "warfarin"]);
  assert.equal(protoSafe.findings.length, 0);
  assert.deepEqual(protoSafe.burden, singleWarfarin.burden);
});

test("multiDrugFindings detects cumulative multi-inhibitor enzyme saturation on 3+ drug trays", () => {
  // Fluvoxamine (strong CYP1A2 inh) + Cimetidine (weak CYP1A2 inh) + Theophylline (sensitive NTI CYP1A2 sub)
  const report1A2 = analyze(["fluvoxamine", "cimetidine", "theophylline"], DEFAULT_HOST);
  const sat1A2 = report1A2.findings.find((f) => f.id.startsWith("grp-pk-multi-inh-CYP1A2-"));
  assert.ok(sat1A2, "Expected CYP1A2 multi-inhibitor saturation finding");
  assert.equal(sat1A2.severity, "major");
  assert.equal(sat1A2.kind, "pk");
  assert.deepEqual(sat1A2.enzymes, ["CYP1A2"]);
  assert.match(sat1A2.headline, /Compounded CYP1A2 inhibition · 2 inhibitors converging/);
  assert.equal(sat1A2.effect, "compounded substrate exposure above single-pair estimates");
  assert.ok(sat1A2.tags.includes("multi-inhibitor"));
  assert.ok(sat1A2.tags.includes("stack"));
  assert.ok(!sat1A2.tags.includes("prodrug"));
  assert.deepEqual([...sat1A2.drugIds].sort(), ["cimetidine", "fluvoxamine", "theophylline"]);

  // Amiodarone (weak CYP3A4 inh) + Verapamil (moderate CYP3A4 inh) + Simvastatin (sensitive CYP3A4 sub)
  const report3A4 = analyze(["amiodarone", "verapamil", "simvastatin"], DEFAULT_HOST);
  const sat3A4 = report3A4.findings.find((f) => f.id.startsWith("grp-pk-multi-inh-CYP3A4-"));
  assert.ok(sat3A4, "Expected CYP3A4 multi-inhibitor saturation finding");
  assert.equal(sat3A4.severity, "major");
  assert.deepEqual(sat3A4.enzymes, ["CYP3A4"]);
  assert.deepEqual([...sat3A4.drugIds].sort(), ["amiodarone", "simvastatin", "verapamil"]);
});

test("multiDrugFindings detects multi-inhibitor prodrug bioactivation blockade", () => {
  // Fluoxetine (strong CYP2D6 inh) + Bupropion (strong CYP2D6 inh) + Codeine (CYP2D6 activation prodrug)
  const report = analyze(["fluoxetine", "bupropion", "codeine"], DEFAULT_HOST);
  const prodrugBlock = report.findings.find((f) => f.id.startsWith("grp-pk-multi-inh-CYP2D6-"));
  assert.ok(prodrugBlock, "Expected CYP2D6 multi-inhibitor prodrug blockade finding");
  assert.equal(prodrugBlock.severity, "major");
  assert.equal(prodrugBlock.kind, "pk");
  assert.deepEqual(prodrugBlock.enzymes, ["CYP2D6"]);
  assert.equal(
    prodrugBlock.headline,
    "Compounded CYP2D6 inhibition · prodrug bioactivation blockade",
  );
  assert.equal(prodrugBlock.effect, "blunted prodrug activation / loss of therapeutic effect");
  assert.ok(prodrugBlock.tags.includes("prodrug"));
  assert.ok(prodrugBlock.tags.includes("multi-inhibitor"));
  assert.match(prodrugBlock.clinical, /Codeine/);
  assert.deepEqual(prodrugBlock.clinical.match(DOSE_PATTERN) ?? [], []);
});

test("multiDrugFindings detects opposing inhibitor × inducer tug-of-war on the same enzyme", () => {
  // Rifampin (strong CYP3A4 ind) + Ketoconazole (strong CYP3A4 inh) + Midazolam (sensitive CYP3A4 sub)
  const report = analyze(["rifampin", "ketoconazole", "midazolam"], DEFAULT_HOST);
  const opposing = report.findings.find((f) => f.id.startsWith("grp-pk-opposing-CYP3A4-"));
  assert.ok(opposing, "Expected CYP3A4 opposing inhibitor × inducer finding");
  assert.equal(opposing.severity, "major");
  assert.equal(opposing.kind, "pk");
  assert.deepEqual(opposing.enzymes, ["CYP3A4"]);
  assert.equal(opposing.headline, "Opposing CYP3A4 inhibition + induction on the same tray");
  assert.equal(opposing.effect, "unpredictable, time-varying substrate exposure");
  assert.equal(opposing.mechanism, "opposing CYP3A4 inhibition vs. transcriptional induction");
  assert.deepEqual(opposing.tags, ["pk", "opposing", "stack"]);
  assert.match(opposing.clinical, /PXR\/CAR\/AhR/);
  assert.match(opposing.clinical, /Midazolam/);
  assert.deepEqual([...opposing.drugIds].sort(), ["ketoconazole", "midazolam", "rifampin"]);
  assert.deepEqual(opposing.clinical.match(DOSE_PATTERN) ?? [], []);
});

test("multiDrugFindings detects 3-drug anticholinergic burden stack", () => {
  const report = analyze(["diphenhydramine", "amitriptyline", "oxybutynin"], DEFAULT_HOST);
  const ach = report.findings.find((f) => f.id.startsWith("grp-ach-"));
  assert.ok(ach, "Expected 3-drug anticholinergic stack finding");
  assert.equal(ach.severity, "major");
  assert.equal(ach.kind, "pd");
  assert.equal(ach.headline, "3-drug anticholinergic burden stack");
  assert.equal(ach.effect, "delirium, urinary retention, tachycardia, constipation");
  assert.equal(ach.mechanism, "cumulative muscarinic M1–M3 blockade");
  assert.deepEqual(ach.tags, ["anticholinergic", "stack"]);
  assert.deepEqual([...ach.drugIds].sort(), ["amitriptyline", "diphenhydramine", "oxybutynin"]);
  assert.deepEqual(ach.clinical.match(DOSE_PATTERN) ?? [], []);
});

test("multiDrugFindings detects 3-drug bleeding / hemorrhage stack and avoids false positives on SSRI-only trays", () => {
  const reportPrimary = analyze(["warfarin", "aspirin", "ibuprofen"], DEFAULT_HOST);
  const bleedPrimary = reportPrimary.findings.find((f) => f.id.startsWith("grp-bleed-"));
  assert.ok(bleedPrimary, "Expected 3-drug bleeding stack for anticoagulant + antiplatelet + NSAID");
  assert.equal(bleedPrimary.severity, "major");
  assert.equal(bleedPrimary.kind, "pd");
  assert.equal(bleedPrimary.headline, "3-drug bleeding-risk stack");
  assert.equal(bleedPrimary.effect, "compounded gastrointestinal and systemic hemorrhage risk");
  assert.equal(bleedPrimary.mechanism, "multi-pathway hemostatic impairment");
  assert.deepEqual(bleedPrimary.tags, ["bleeding", "stack"]);
  assert.deepEqual([...bleedPrimary.drugIds].sort(), ["aspirin", "ibuprofen", "warfarin"]);
  assert.deepEqual(bleedPrimary.clinical.match(DOSE_PATTERN) ?? [], []);

  // Anticoagulant + antiplatelet + SSRI also forms a 3-drug bleeding stack
  const reportMixed = analyze(["warfarin", "clopidogrel", "sertraline"], DEFAULT_HOST);
  const bleedMixed = reportMixed.findings.find((f) => f.id.startsWith("grp-bleed-"));
  assert.ok(bleedMixed, "Expected 3-drug bleeding stack for anticoagulant + antiplatelet + SSRI");
  assert.equal(bleedMixed.severity, "major");

  // Three SSRIs alone (no anticoagulant, antiplatelet, or NSAID) must not fire grp-bleed-*
  const reportSsriOnly = analyze(["sertraline", "fluoxetine", "escitalopram"], DEFAULT_HOST);
  assert.equal(
    reportSsriOnly.findings.some((f) => f.id.startsWith("grp-bleed-")),
    false,
  );
});

test("multiDrugFindings detects multi-inhibitor membrane transporter barrier saturation across OATP1B1, OCT2/MATE1, OAT1/3, BCRP, and P-gp", () => {
  // OATP1B1/1B3 hepatic sinusoidal influx convergence: Clarithromycin + Gemfibrozil + Atorvastatin
  const oatpReport = analyze(["clarithromycin", "gemfibrozil", "atorvastatin"], DEFAULT_HOST);
  const oatpHit = oatpReport.findings.find((f) => f.id.startsWith("grp-tx-multi-inh-oatp1b1-1b3-slco-"));
  assert.ok(oatpHit, "Expected OATP1B1/1B3 multi-inhibitor transporter finding");
  assert.equal(oatpHit.severity, "major");
  assert.equal(oatpHit.kind, "pk");
  assert.ok(oatpHit.tags.includes("transporter"));
  assert.ok(oatpHit.tags.includes("multi-inhibitor"));
  assert.ok(oatpHit.tags.includes("stack"));
  assert.match(oatpHit.headline, /OATP1B1.*2 inhibitors converging/);
  assert.deepEqual(oatpHit.clinical.match(DOSE_PATTERN) ?? [], []);

  // OCT2/MATE1 renal cation secretion convergence: Dolutegravir + Cimetidine + Metformin
  const oct2Report = analyze(["dolutegravir", "cimetidine", "metformin"], DEFAULT_HOST);
  const oct2Hit = oct2Report.findings.find((f) => f.id.startsWith("grp-tx-multi-inh-oct2-mate-slc22-"));
  assert.ok(oct2Hit, "Expected OCT2/MATE1 multi-inhibitor transporter finding");
  assert.equal(oct2Hit.severity, "major");
  assert.deepEqual([...oct2Hit.drugIds].sort(), ["cimetidine", "dolutegravir", "metformin"]);
  assert.deepEqual(oct2Hit.clinical.match(DOSE_PATTERN) ?? [], []);

  // OAT1/OAT3 renal anion secretion convergence: Probenecid + Ibuprofen + Methotrexate
  const oatReport = analyze(["probenecid", "ibuprofen", "methotrexate"], DEFAULT_HOST);
  const oatHit = oatReport.findings.find((f) => f.id.startsWith("grp-tx-multi-inh-oat1-oat3-slc22-"));
  assert.ok(oatHit, "Expected OAT1/OAT3 multi-inhibitor transporter finding");
  assert.equal(oatHit.severity, "major");
  assert.deepEqual([...oatHit.drugIds].sort(), ["ibuprofen", "methotrexate", "probenecid"]);

  // BCRP + OATP1B1 dual non-CYP transporter hit on the same 3 drugs must NOT collapse in dedupe()
  const dualTxReport = analyze(["cyclosporine", "ritonavir", "rosuvastatin"], DEFAULT_HOST);
  assert.ok(
    dualTxReport.findings.some((f) => f.id.startsWith("grp-tx-multi-inh-bcrp-abcg2-")),
    "Expected BCRP multi-inhibitor finding",
  );
  assert.ok(
    dualTxReport.findings.some((f) => f.id.startsWith("grp-tx-multi-inh-oatp1b1-1b3-slco-")),
    "Expected OATP1B1 multi-inhibitor finding preserved alongside BCRP",
  );

  // P-gp botanical + prescription convergence: Berberine + Verapamil + Digoxin
  const pgpReport = analyze(["berberine", "verapamil", "digoxin"], DEFAULT_HOST);
  const pgpHit = pgpReport.findings.find(
    (f) =>
      f.id.startsWith("grp-tx-multi-inh-pgp-abcb1-") ||
      f.id.startsWith("grp-pk-multi-inh-P-gp-"),
  );
  assert.ok(pgpHit, "Expected P-gp multi-inhibitor transporter finding");
  assert.ok(pgpHit.tags.includes("transporter"));
});

test("2-drug pair invariant: 2-drug trays emit zero grp-pk-*, grp-tx-*, grp-ach-*, or grp-bleed-* findings", () => {
  const twoDrugTrays: [string, string][] = [
    ["fluvoxamine", "theophylline"],
    ["fluvoxamine", "cimetidine"],
    ["fluoxetine", "codeine"],
    ["rifampin", "ketoconazole"],
    ["rifampin", "midazolam"],
    ["ketoconazole", "midazolam"],
    ["diphenhydramine", "amitriptyline"],
    ["warfarin", "aspirin"],
    ["clarithromycin", "simvastatin"],
    ["dolutegravir", "metformin"],
    ["probenecid", "methotrexate"],
    ["cyclosporine", "rosuvastatin"],
  ];

  for (const pair of twoDrugTrays) {
    const r = analyze(pair, { ...DEFAULT_HOST, smoking: true, alcohol: "chronic" });
    const unexpected = r.findings.filter(
      (f) =>
        f.id.startsWith("grp-pk-") ||
        f.id.startsWith("grp-tx-") ||
        f.id.startsWith("grp-ach-") ||
        f.id.startsWith("grp-bleed-"),
    );
    assert.deepEqual(
      unexpected.map((f) => f.id),
      [],
      `2-drug tray ${pair.join(" + ")} must not emit multi-drug stack findings`,
    );
  }
});
