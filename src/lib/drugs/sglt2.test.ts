import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateEuDka,
  calculatePreopHold,
  evaluateSglt2RenalRails,
  findSglt2Collisions,
  sglt2OnDesk,
  sglt2ReportOnDesk,
  SGLT2_PROFILES,
} from "./sglt2";
import { DEFAULT_HOST } from "./types";

test("evaluateEuDka: detects Euglycemic DKA with high anion gap and normal/near-normal blood glucose", () => {
  // Classic euDKA: Glucose 175 mg/dL, Bicarbonate 12 mEq/L, Anion Gap 18, Beta-hydroxybutyrate 4.2 mmol/L
  const evalResult = evaluateEuDka({
    glucoseMgDl: 175,
    bicarbonateMeqL: 12,
    arterialPh: 7.24,
    betaHydroxybutyrateMmolL: 4.2,
    anionGap: 18,
  });

  assert.equal(evalResult.isEuDkaSuspected, true);
  assert.ok(evalResult.headline.includes("HIGH SUSPICION FOR EUGLYCEMIC DKA"));
  assert.ok(evalResult.diagnosticTrapAlert.includes("CRITICAL DIAGNOSTIC TRAP"));
  assert.ok(evalResult.diagnosticTrapAlert.includes("renal glycosuria"));
  assert.ok(evalResult.resuscitationGuidance.dextroseInsulinCoadministration.includes("CRITICAL RESUSCITATION PROTOCOL"));
  assert.ok(evalResult.resuscitationGuidance.dextroseInsulinCoadministration.includes("D5W or D10W"));
  assert.ok(evalResult.resuscitationGuidance.sglt2Discontinuation.includes("Discontinue SGLT2 inhibitor immediately"));
});

test("evaluateEuDka: correctly identifies normal acid-base baseline without false positives", () => {
  const normal = evaluateEuDka({
    glucoseMgDl: 140,
    bicarbonateMeqL: 24,
    arterialPh: 7.40,
    betaHydroxybutyrateMmolL: 0.3,
    anionGap: 10,
  });

  assert.equal(normal.isEuDkaSuspected, false);
  assert.ok(normal.headline.includes("euDKA Currently Low Risk"));
});

test("calculatePreopHold: applies 3-day hold for Empagliflozin/Dapagliflozin and 4-day hold for Ertugliflozin", () => {
  const schedules = calculatePreopHold(["empagliflozin", "dapagliflozin", "ertugliflozin"]);
  assert.equal(schedules.length, 3);

  const empa = schedules.find((s) => s.agentName.includes("Empagliflozin"));
  assert.ok(empa);
  assert.equal(empa?.recommendedHoldDays, 3);
  assert.ok(empa?.resumptionCriteria.includes("oral nutrition"));

  const dapa = schedules.find((s) => s.agentName.includes("Dapagliflozin"));
  assert.ok(dapa);
  assert.equal(dapa?.recommendedHoldDays, 3);

  const ertu = schedules.find((s) => s.agentName.includes("Ertugliflozin"));
  assert.ok(ertu);
  assert.equal(ertu?.recommendedHoldDays, 4); // FDA requires 4 days for ertugliflozin
});

test("evaluateSglt2RenalRails: models blunted glycemic efficacy vs continued cardiorenal benefit", () => {
  // CKD with eGFR 28 mL/min on Empagliflozin
  const rails = evaluateSglt2RenalRails(["empagliflozin"], 28);
  assert.equal(rails.length, 1);

  const empaRail = rails[0];
  assert.equal(empaRail.glycemicStatus, "ineffective"); // eGFR < 30
  assert.equal(empaRail.cardiorenalStatus, "indicated"); // eGFR >= 20 (EMPA-KIDNEY)
  assert.ok(empaRail.initialEgfrDipReassurance.includes("EXPECTED INITIAL eGFR DIP"));
  assert.ok(empaRail.initialEgfrDipReassurance.includes("tubuloglomerular feedback"));
});

test("findSglt2Collisions: flags Quadruple Collision (SGLT2 + Loop + RAASi + NSAID) and secretagogue hypoglycemia", () => {
  const testIds = ["dapagliflozin", "furosemide", "lisinopril", "ibuprofen", "glipizide"];
  const collisions = findSglt2Collisions(testIds);

  assert.ok(collisions.length >= 2);

  const quad = collisions.find((c) => c.category === "triple-whammy-aki");
  assert.ok(quad);
  assert.equal(quad?.severity, "major");
  assert.ok(quad?.headline.includes("QUADRUPLE COLLISION"));
  assert.ok(quad?.clinicalAction.includes("Discontinue NSAID immediately"));

  const hypo = collisions.find((c) => c.category === "hypoglycemia-secretagogue");
  assert.ok(hypo);
  assert.equal(hypo?.severity, "major");
  assert.ok(hypo?.clinicalAction.includes("reduce baseline sulfonylurea"));
});

test("sglt2OnDesk & sglt2ReportOnDesk: detects multi-agent formulary combinations and builds report", () => {
  const comboDesk = ["empagliflozin-metformin", "furosemide"];
  const onDesk = sglt2OnDesk(comboDesk);

  assert.equal(onDesk.hasSglt2, true);
  assert.equal(onDesk.hasLoopDiuretic, true);
  assert.ok(onDesk.sglt2Ids.includes("empagliflozin-metformin"));

  const report = sglt2ReportOnDesk(comboDesk, {
    ...DEFAULT_HOST,
    kidney: "ckd",
  });

  assert.equal(report.hasSglt2, true);
  assert.ok(report.agentsOnDesk.length > 0);
  assert.ok(report.preopSchedule.length > 0);
  assert.ok(report.renalRails.length > 0);
  assert.ok(report.fourniersWarning.includes("Fournier's Gangrene"));
  assert.ok(report.clinicalPearls.length >= 5);
});

