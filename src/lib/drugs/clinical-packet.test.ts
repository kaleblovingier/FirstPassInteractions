import assert from "node:assert/strict";
import test from "node:test";
import { buildClinicalPacket } from "./clinical-packet";
import { analyze } from "./engine";
import { DEFAULT_HOST } from "./types";

test("buildClinicalPacket: formats empty tray gracefully with disclaimers", () => {
  const host = { ...DEFAULT_HOST };
  const findings = analyze([], host).findings;
  const packet = buildClinicalPacket([], host, findings, {});

  assert.equal(packet.regimen.length, 0);
  assert.ok(packet.ehrNoteText.includes("FIRSTPASS CLINICAL PHARMACOLOGY"));
  assert.ok(packet.ehrNoteText.includes("Regulatory Notice"));
  assert.ok(packet.patientHandoutText.includes("Patient Medication Information Guide"));
  assert.equal(packet.riskIndexes.mme.hasOpioid, false);
  assert.equal(packet.riskIndexes.cnsDepression.hasSynergy, false);
});

test("buildClinicalPacket: correctly evaluates opioids, MME warnings, and harm reduction", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["oxycodone", "fentanyl"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { oxycodone: "10 mg q4h" });

  assert.equal(packet.regimen.length, 2);
  const oxy = packet.regimen.find((r) => r.id === "oxycodone");
  assert.equal(oxy?.dose, "10 mg q4h");
  assert.equal(packet.riskIndexes.mme.hasOpioid, true);
  assert.ok(packet.riskIndexes.mme.warning !== null);
  assert.ok(packet.riskIndexes.harmReduction.hasStreetOrOpioid);
  assert.ok(packet.counselingPoints.some((p) => p.includes("naloxone")));
});

test("buildClinicalPacket: detects multi-sedative CNS depression and FDA boxed warning", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["alprazolam", "oxycodone"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.equal(packet.riskIndexes.cnsDepression.hasSynergy, true);
  assert.ok(packet.riskIndexes.cnsDepression.boxedWarning?.includes("FDA Boxed Warning"));
  assert.ok(packet.ehrNoteText.includes("Synergistic CNS / Respiratory Depression: HIGH CONCERN"));
});

test("buildClinicalPacket: calculates anticholinergic cognitive burden (ACB) score and warnings", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["amitriptyline", "diphenhydramine"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.ok(packet.riskIndexes.acb !== null);
  assert.ok(packet.riskIndexes.acb.totalScore >= 3);
  assert.equal(packet.riskIndexes.acb.riskLevel, "high");
  assert.ok(packet.ehrNoteText.includes("Anticholinergic Cognitive Burden (ACB): Total Score"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("dry mouth") || cp.includes("memory fog")));
});

test("buildClinicalPacket: evaluates QTc prolongation and host phenotypes", () => {
  const host = {
    ...DEFAULT_HOST,
    smoking: true,
    phenotypes: {
      ...DEFAULT_HOST.phenotypes,
      CYP2D6: "PM" as const,
    },
  };
  const ids = ["methadone", "citalopram"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.ok(packet.riskIndexes.qt !== null);
  assert.ok(packet.riskIndexes.qt.score > 0);
  assert.ok(packet.hostSummary.smoking.includes("Daily Combusted Tobacco"));
  const cyp2d6 = packet.hostSummary.phenotypes.find((p) => p.enzyme === "CYP2D6");
  assert.equal(cyp2d6?.phenotype, "PM");
});

test("buildClinicalPacket: evaluates anticoagulants, DOAC renal rails, and bleed counseling", () => {
  const host = {
    ...DEFAULT_HOST,
    age: "geriatric" as const,
    kidney: "ckd" as const,
  };
  const ids = ["apixaban", "aspirin"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { apixaban: "5 mg BID" });

  assert.equal(packet.riskIndexes.anticoagulation.hasAnticoagulant, true);
  assert.equal(packet.riskIndexes.anticoagulation.hasDoac, true);
  assert.ok(packet.riskIndexes.anticoagulation.report !== null);
  assert.ok(packet.ehrNoteText.includes("Anticoagulation & Bleed Risk Evaluation"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("blood thinner") || cp.includes("unusual bleeding")));
  assert.ok(packet.ehrNoteText.includes("Emergency Reversal"));
});

test("buildClinicalPacket: evaluates valproate saturable binding, VHE, and L-carnitine antidote guidance", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["valproate", "topiramate"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { valproate: "500 mg BID" });

  assert.ok(packet.ehrNoteText.includes("Valproate Pharmacokinetics & Hyperammonemia Evaluation"));
  assert.ok(packet.ehrNoteText.includes("L-Carnitine"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("hyperammonemia") || cp.includes("sluggishness")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("spina bifida") || cp.includes("birth defects")));
});

test("buildClinicalPacket: evaluates potassium homeostasis, perpetrators, binders, and shifting guidance", () => {
  const host = {
    ...DEFAULT_HOST,
    kidney: "ckd" as const,
  };
  const ids = ["lisinopril", "spironolactone", "tmp-smx", "patiromer"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { lisinopril: "20 mg daily", spironolactone: "25 mg daily" });

  assert.equal(packet.riskIndexes.potassium.hasPotassiumIssue, true);
  assert.equal(packet.riskIndexes.potassium.hasBinder, true);
  assert.ok(packet.riskIndexes.potassium.report !== null);
  assert.ok(packet.riskIndexes.potassium.perpetrators.length >= 3);
  assert.ok(packet.ehrNoteText.includes("Potassium Homeostasis & Cardioprotective Shifting"));
  assert.ok(packet.ehrNoteText.includes("Regular Insulin"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("salt substitutes") || cp.includes("potassium chloride")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("Patiromer") && cp.includes("3 hours")));
});

test("buildClinicalPacket: evaluates SGLT2 inhibitor perioperative hold and euDKA counseling", () => {
  const host = {
    ...DEFAULT_HOST,
    kidney: "ckd" as const,
  };
  const ids = ["empagliflozin", "furosemide", "lisinopril"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { empagliflozin: "25 mg daily" });

  assert.equal(packet.riskIndexes.sglt2.hasSglt2, true);
  assert.ok(packet.riskIndexes.sglt2.report !== null);
  assert.ok(packet.riskIndexes.sglt2.agents.some((a) => a.includes("Empagliflozin")));
  assert.ok(packet.ehrNoteText.includes("SGLT2 Inhibitor & Euglycemic DKA Evaluation"));
  assert.ok(packet.ehrNoteText.includes("Perioperative Rail"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("SGLT2") && cp.includes("surgery")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("Euglycemic DKA") || cp.includes("blood sugar reading is completely normal")));
});


