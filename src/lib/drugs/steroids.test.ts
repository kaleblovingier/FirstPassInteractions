import test from "node:test";
import assert from "node:assert/strict";
import {
  STEROID_AGENTS,
  STEROID_BY_ID,
  convertSteroid,
  hpaSuppressionRisk,
  steroidsOnDesk,
  steroidReportOnDesk,
} from "./steroids";

test("STEROID_AGENTS defines valid reference standards for all 9 common clinical steroids", () => {
  assert.equal(STEROID_AGENTS.length, 9);

  for (const agent of STEROID_AGENTS) {
    assert.ok(agent.id);
    assert.ok(agent.name);
    assert.ok(agent.equivDoseMg > 0);
    assert.ok(agent.antiInflammatoryPotency > 0);
    assert.ok(agent.mineralocorticoidPotency >= 0);
    assert.ok(["short", "intermediate", "long"].includes(agent.durationCategory));
    assert.ok(agent.biologicHalfLifeHours);
    assert.ok(agent.clinicalPearls);
  }

  // Key classical ratios
  assert.equal(STEROID_BY_ID["hydrocortisone"].equivDoseMg, 20);
  assert.equal(STEROID_BY_ID["cortisone"].equivDoseMg, 25);
  assert.equal(STEROID_BY_ID["prednisone"].equivDoseMg, 5);
  assert.equal(STEROID_BY_ID["prednisolone"].equivDoseMg, 5);
  assert.equal(STEROID_BY_ID["methylprednisolone"].equivDoseMg, 4);
  assert.equal(STEROID_BY_ID["triamcinolone"].equivDoseMg, 4);
  assert.equal(STEROID_BY_ID["dexamethasone"].equivDoseMg, 0.75);
  assert.equal(STEROID_BY_ID["betamethasone"].equivDoseMg, 0.6);
  assert.equal(STEROID_BY_ID["fludrocortisone"].equivDoseMg, 0.1);

  // Mineralocorticoid potency contrast
  assert.equal(STEROID_BY_ID["dexamethasone"].mineralocorticoidPotency, 0);
  assert.equal(STEROID_BY_ID["methylprednisolone"].mineralocorticoidPotency, 0);
  assert.equal(STEROID_BY_ID["hydrocortisone"].mineralocorticoidPotency, 1);
  assert.ok(STEROID_BY_ID["fludrocortisone"].mineralocorticoidPotency >= 125);
});

test("convertSteroid performs precise round-trip equivalent conversions", () => {
  // 20 mg hydrocortisone = 5 mg prednisone = 4 mg methylprednisolone = 0.75 mg dexamethasone
  const hydro20 = convertSteroid({ fromDrugId: "hydrocortisone", amountMg: 20 });
  assert.ok(hydro20);
  assert.equal(hydro20.prednisoneEqMg, 5);
  assert.equal(hydro20.hydrocortisoneEqMg, 20);

  const pred = hydro20.conversions.find((c) => c.id === "prednisone");
  assert.ok(pred);
  assert.equal(pred.amountMg, 5);

  const medrol = hydro20.conversions.find((c) => c.id === "methylprednisolone");
  assert.ok(medrol);
  assert.equal(medrol.amountMg, 4);

  const dex = hydro20.conversions.find((c) => c.id === "dexamethasone");
  assert.ok(dex);
  assert.equal(dex.amountMg, 0.75);

  // High-dose pulse: 40 mg prednisone
  const pred40 = convertSteroid({ fromDrugId: "prednisone", amountMg: 40 });
  assert.ok(pred40);
  assert.equal(pred40.prednisoneEqMg, 40);
  assert.equal(pred40.hydrocortisoneEqMg, 160);

  const pred40Medrol = pred40.conversions.find((c) => c.id === "methylprednisolone");
  assert.ok(pred40Medrol);
  assert.equal(pred40Medrol.amountMg, 32);

  const pred40Dex = pred40.conversions.find((c) => c.id === "dexamethasone");
  assert.ok(pred40Dex);
  assert.equal(pred40Dex.amountMg, 6);

  // Specific target lookup
  const targeted = convertSteroid({
    fromDrugId: "dexamethasone",
    amountMg: 4,
    targetDrugId: "prednisone",
  });
  assert.ok(targeted);
  assert.ok(targeted.specificTarget);
  // (4 / 0.75) * 5 = 26.67 mg
  assert.equal(targeted.specificTarget.amountMg, 26.67);
});

test("convertSteroid flags mineralocorticoid activity and prodrug bioactivation notes", () => {
  // Hydrocortisone has mineralocorticoid warning
  const hydro = convertSteroid({ fromDrugId: "hydrocortisone", amountMg: 100 });
  assert.ok(hydro);
  assert.match(hydro.mineralocorticoidWarning ?? "", /mineralocorticoid activity/i);
  assert.equal(hydro.hepaticProdrugNote, null);

  // Dexamethasone has zero mineralocorticoid warning
  const dex = convertSteroid({ fromDrugId: "dexamethasone", amountMg: 4 });
  assert.ok(dex);
  assert.equal(dex.mineralocorticoidWarning, null);
  assert.equal(dex.hepaticProdrugNote, null);

  // Prednisone has hepatic prodrug note
  const pred = convertSteroid({ fromDrugId: "prednisone", amountMg: 20 });
  assert.ok(pred);
  assert.match(pred.hepaticProdrugNote ?? "", /inactive prodrug/i);
  assert.match(pred.hepaticProdrugNote ?? "", /11β-HSD1/);

  // Invalid inputs
  assert.equal(convertSteroid({ fromDrugId: "unknown", amountMg: 10 }), null);
  assert.equal(convertSteroid({ fromDrugId: "prednisone", amountMg: -5 }), null);
  assert.equal(convertSteroid({ fromDrugId: "prednisone", amountMg: 10000 }), null);
});

test("hpaSuppressionRisk categorizes suppression risk and flags PJP and stress dose guidance", () => {
  // High risk: Prednisone 40 mg/day for 6 weeks
  const highRisk = hpaSuppressionRisk({
    prednisoneEqMgPerDay: 40,
    durationWeeks: 6,
    timing: "morning",
  });
  assert.ok(highRisk);
  assert.equal(highRisk.risk, "high");
  assert.equal(highRisk.stressDoseNeeded, true);
  assert.match(highRisk.summary, /adrenocortical atrophy/i);
  assert.match(highRisk.taperRecommendation, /mandatory/i);
  assert.match(highRisk.pjpProphylaxisNote ?? "", /Pneumocystis jirovecii pneumonia/i);

  // High risk due to cushingoid features even at shorter duration
  const cushingoid = hpaSuppressionRisk({
    prednisoneEqMgPerDay: 15,
    durationWeeks: 4,
    cushingoidFeatures: true,
  });
  assert.ok(cushingoid);
  assert.equal(cushingoid.risk, "high");

  // Low risk: High dose but short course (< 3 weeks, e.g. 5-day Medrol dose pack or COPD burst)
  const shortBurst = hpaSuppressionRisk({
    prednisoneEqMgPerDay: 40,
    durationWeeks: 1.5,
  });
  assert.ok(shortBurst);
  assert.equal(shortBurst.risk, "low");
  assert.equal(shortBurst.stressDoseNeeded, false);
  assert.match(shortBurst.summary, /rarely cause clinically significant/i);
  assert.equal(shortBurst.pjpProphylaxisNote, null);

  // Low risk: Long course but physiologic replacement (< 5 mg/day morning)
  const physiologic = hpaSuppressionRisk({
    prednisoneEqMgPerDay: 4,
    durationWeeks: 24,
    timing: "morning",
  });
  assert.ok(physiologic);
  assert.equal(physiologic.risk, "low");

  // Intermediate risk: 10 mg/day for 8 weeks
  const intermediate = hpaSuppressionRisk({
    prednisoneEqMgPerDay: 10,
    durationWeeks: 8,
    timing: "morning",
  });
  assert.ok(intermediate);
  assert.equal(intermediate.risk, "intermediate");
  assert.match(intermediate.summary, /individual HPA axis sensitivity/i);

  // Out of bounds
  assert.equal(hpaSuppressionRisk({ prednisoneEqMgPerDay: -1, durationWeeks: 4 }), null);
  assert.equal(hpaSuppressionRisk({ prednisoneEqMgPerDay: 20, durationWeeks: -1 }), null);
});

test("steroidsOnDesk and steroidReportOnDesk identify tray drugs", () => {
  const empty = steroidsOnDesk(["aspirin", "lisinopril"]);
  assert.equal(empty.length, 0);

  const emptyReport = steroidReportOnDesk(["aspirin"]);
  assert.equal(emptyReport.hasSteroid, false);

  const matched = steroidsOnDesk(["prednisone", "metoprolol", "dexamethasone"]);
  assert.equal(matched.length, 2);
  assert.deepEqual(
    matched.map((m) => m.id),
    ["prednisone", "dexamethasone"],
  );

  const report = steroidReportOnDesk(["prednisone", "dexamethasone"]);
  assert.equal(report.hasSteroid, true);
  assert.match(report.summary, /prednisone/i);
  assert.match(report.summary, /dexamethasone/i);
  assert.equal(report.pearls.length, 2);
});

test("steroid calculations adhere to non-prescriptive regulatory principles", () => {
  const conv = convertSteroid({ fromDrugId: "prednisone", amountMg: 20 });
  assert.ok(conv);
  assert.doesNotMatch(conv.mineralocorticoidWarning ?? "", /prescribe\s+\d+\s*mg/i);

  const hpa = hpaSuppressionRisk({ prednisoneEqMgPerDay: 30, durationWeeks: 8 });
  assert.ok(hpa);
  assert.doesNotMatch(hpa.taperRecommendation, /give\s+\d+\s*mg/i);
  assert.doesNotMatch(hpa.stressDoseGuidance, /prescribe\s+\d+\s*mg/i);
});

