import test from "node:test";
import assert from "node:assert/strict";
import {
  apapHighRiskLine,
  apapOnDesk,
  apapTreatmentLine,
  evaluateKingsCollege,
  evaluateRumackMatthew,
  NAC_REGIMENS,
} from "./apap";

test("apapTreatmentLine and apapHighRiskLine calculate standard 4h-to-24h half-life curves", () => {
  // 4h treatment line: 150 ug/mL
  assert.equal(apapTreatmentLine(4), 150);
  // 8h treatment line (1 half-life = 4 hours): 75 ug/mL
  assert.equal(apapTreatmentLine(8), 75);
  // 12h treatment line: 37.5 ug/mL
  assert.equal(apapTreatmentLine(12), 37.5);
  // 16h treatment line: 18.8 ug/mL
  assert.equal(apapTreatmentLine(16), 18.8);
  // 24h treatment line: 4.7 ug/mL
  assert.equal(apapTreatmentLine(24), 4.7);

  // High risk line (300 at 4h)
  assert.equal(apapHighRiskLine(4), 300);
  assert.equal(apapHighRiskLine(8), 150);
  assert.equal(apapHighRiskLine(12), 75);

  // Out of bounds (<4h or >24h)
  assert.equal(apapTreatmentLine(3.9), null);
  assert.equal(apapTreatmentLine(25), null);
});

test("evaluateRumackMatthew classifies acute APAP exposure into appropriate risk bands", () => {
  // Early presentation (<4 hours)
  const early = evaluateRumackMatthew({ hoursPostIngestion: 2, serumApapUgMl: 80 });
  assert.ok(early);
  assert.equal(early.band, "too-early");
  assert.equal(early.nacIndicated, false);
  assert.match(early.label, /Pre-Nomogram Phase/i);

  // Massive early presentation (>300 ug/mL at 2 hours) -> prompts early NAC consideration
  const earlyMassive = evaluateRumackMatthew({ hoursPostIngestion: 2, serumApapUgMl: 450 });
  assert.ok(earlyMassive);
  assert.equal(earlyMassive.band, "too-early");
  assert.equal(earlyMassive.nacIndicated, true);
  assert.match(earlyMassive.nacUrgency, /Immediate NAC initiation/i);

  // Safe level: 6 hours post ingestion, level 50 ug/mL (treatment line at 6h is ~106)
  const safe = evaluateRumackMatthew({ hoursPostIngestion: 6, serumApapUgMl: 50 });
  assert.ok(safe);
  assert.equal(safe.band, "below-treatment");
  assert.equal(safe.nacIndicated, false);

  // Toxic level above 150 line: 8 hours post ingestion, level 100 ug/mL (treatment line is 75)
  const toxic = evaluateRumackMatthew({ hoursPostIngestion: 8, serumApapUgMl: 100 });
  assert.ok(toxic);
  assert.equal(toxic.band, "above-treatment");
  assert.equal(toxic.nacIndicated, true);
  assert.equal(toxic.treatmentLineUgMl, 75);
  assert.match(toxic.nacUrgency, /Administer N-acetylcysteine/i);

  // High risk level above 300 line: 8 hours, level 180 ug/mL (high risk line is 150)
  const highRisk = evaluateRumackMatthew({ hoursPostIngestion: 8, serumApapUgMl: 180 });
  assert.ok(highRisk);
  assert.equal(highRisk.band, "high-risk");
  assert.equal(highRisk.nacIndicated, true);
  assert.match(highRisk.label, /High-Risk Line/i);

  // Late presentation (>24 hours) with detectable APAP
  const late = evaluateRumackMatthew({ hoursPostIngestion: 36, serumApapUgMl: 25 });
  assert.ok(late);
  assert.equal(late.band, "late-presentation");
  assert.equal(late.nacIndicated, true);
  assert.match(late.clinicalGuidance, /not validated beyond 24 hours/i);

  // Risk modifiers
  const withModifiers = evaluateRumackMatthew({
    hoursPostIngestion: 6,
    serumApapUgMl: 90,
    chronicAlcoholOrInducer: true,
    malnutritionOrFasting: true,
  });
  assert.ok(withModifiers);
  assert.equal(withModifiers.riskModifiers.length, 2);
  assert.match(withModifiers.riskModifiers[0], /CYP2E1/);
});

test("evaluateKingsCollege accurately tests transplant criteria in APAP-induced ALF", () => {
  // Arterial pH < 7.30 alone meets criteria
  const phMet = evaluateKingsCollege({
    arterialPhUnder730: true,
    encephalopathyGrade3Or4: false,
    serumCreatinineOver34: false,
    inrOver65: false,
  });
  assert.equal(phMet.meetsCriteria, true);
  assert.match(phMet.reason, /Arterial pH < 7\.30/);

  // Triad criteria (Encephalopathy 3/4 + Cr > 3.4 + INR > 6.5)
  const triadMet = evaluateKingsCollege({
    arterialPhUnder730: false,
    encephalopathyGrade3Or4: true,
    serumCreatinineOver34: true,
    inrOver65: true,
  });
  assert.equal(triadMet.meetsCriteria, true);
  assert.match(triadMet.reason, /All 3 concurrent criteria present/);

  // Partial triad does NOT meet criteria
  const partial = evaluateKingsCollege({
    arterialPhUnder730: false,
    encephalopathyGrade3Or4: true,
    serumCreatinineOver34: false,
    inrOver65: true,
  });
  assert.equal(partial.meetsCriteria, false);
  assert.match(partial.reason, /Only 2 of 3/);
});

test("apapOnDesk detects tray drugs and regimens are well-formed", () => {
  assert.equal(apapOnDesk(["lisinopril", "metoprolol"]), false);
  assert.equal(apapOnDesk(["acetaminophen"]), true);
  assert.equal(apapOnDesk(["nac"]), true);

  assert.equal(NAC_REGIMENS.length, 3);
  for (const reg of NAC_REGIMENS) {
    assert.ok(reg.name);
    assert.ok(reg.totalDoseMgKg > 0);
    assert.ok(reg.steps.length > 0);
    assert.ok(reg.pearl);
  }
});

test("APAP calculations adhere to non-prescriptive regulatory principles", () => {
  const nomo = evaluateRumackMatthew({ hoursPostIngestion: 6, serumApapUgMl: 140 });
  assert.ok(nomo);
  assert.doesNotMatch(nomo.nacUrgency, /prescribe\s+\d+\s*mg/i);
  assert.doesNotMatch(nomo.clinicalGuidance, /dispense\s+\d+\s*mg/i);

  const kc = evaluateKingsCollege({
    arterialPhUnder730: true,
    encephalopathyGrade3Or4: false,
    serumCreatinineOver34: false,
    inrOver65: false,
  });
  assert.doesNotMatch(kc.urgency, /prescribe\s+\d+\s*mg/i);
});
