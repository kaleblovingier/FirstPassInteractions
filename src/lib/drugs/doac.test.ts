import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAndexxaDose,
  calculatePerioperativeHold,
  doacOnDesk,
  doacReportOnDesk,
  evaluateApixabanAbc,
  evaluateDoacRenal,
  evaluateReversal,
  findAnticoagulantCollisions,
} from "./doac";
import { DEFAULT_HOST } from "./types";

test("evaluateApixabanAbc correctly evaluates the 2-of-3 ABC dose reduction rule", () => {
  // 0 criteria: Age 65, Weight 75 kg, SCr 1.0 mg/dL
  const zeroMet = evaluateApixabanAbc({ age: 65, weightKg: 75, scr: 1.0 });
  assert.equal(zeroMet.criteriaMetCount, 0);
  assert.equal(zeroMet.reductionIndicated, false);
  assert.equal(zeroMet.recommendedDose, "5 mg PO BID");

  // 1 criterion: Age 82, Weight 75 kg, SCr 1.0 mg/dL
  const oneMetAge = evaluateApixabanAbc({ age: 82, weightKg: 75, scr: 1.0 });
  assert.equal(oneMetAge.criteriaMetCount, 1);
  assert.equal(oneMetAge.ageMet, true);
  assert.equal(oneMetAge.weightMet, false);
  assert.equal(oneMetAge.scrMet, false);
  assert.equal(oneMetAge.reductionIndicated, false);
  assert.equal(oneMetAge.recommendedDose, "5 mg PO BID");

  // 1 criterion: Age 65, Weight 55 kg, SCr 1.0 mg/dL
  const oneMetWt = evaluateApixabanAbc({ age: 65, weightKg: 55, scr: 1.0 });
  assert.equal(oneMetWt.criteriaMetCount, 1);
  assert.equal(oneMetWt.reductionIndicated, false);

  // 1 criterion: Age 65, Weight 75 kg, SCr 1.8 mg/dL
  const oneMetScr = evaluateApixabanAbc({ age: 65, weightKg: 75, scr: 1.8 });
  assert.equal(oneMetScr.criteriaMetCount, 1);
  assert.equal(oneMetScr.reductionIndicated, false);

  // 2 criteria: Age 81, Weight 55 kg, SCr 1.1 mg/dL
  const twoMetAgeWt = evaluateApixabanAbc({ age: 81, weightKg: 55, scr: 1.1 });
  assert.equal(twoMetAgeWt.criteriaMetCount, 2);
  assert.equal(twoMetAgeWt.reductionIndicated, true);
  assert.equal(twoMetAgeWt.recommendedDose, "2.5 mg PO BID");
  assert.match(twoMetAgeWt.rationale, /Dose reduction indicated/);

  // 2 criteria: Age 82, Weight 80 kg, SCr 1.6 mg/dL
  const twoMetAgeScr = evaluateApixabanAbc({ age: 82, weightKg: 80, scr: 1.6 });
  assert.equal(twoMetAgeScr.criteriaMetCount, 2);
  assert.equal(twoMetAgeScr.reductionIndicated, true);
  assert.equal(twoMetAgeScr.recommendedDose, "2.5 mg PO BID");

  // 3 criteria: Age 85, Weight 52 kg, SCr 1.7 mg/dL
  const threeMet = evaluateApixabanAbc({ age: 85, weightKg: 52, scr: 1.7 });
  assert.equal(threeMet.criteriaMetCount, 3);
  assert.equal(threeMet.reductionIndicated, true);
  assert.equal(threeMet.recommendedDose, "2.5 mg PO BID");

  // Acute DVT/PE does not reduce dose based on ABC criteria
  const acuteVte = evaluateApixabanAbc({
    age: 85,
    weightKg: 52,
    scr: 1.7,
    indication: "vte-treatment",
  });
  assert.equal(acuteVte.reductionIndicated, true); // criteria met
  assert.equal(acuteVte.recommendedDose, "10 mg PO BID × 7 days, then 5 mg PO BID");
  assert.match(acuteVte.rationale, /do NOT apply to acute treatment phase/i);
});

test("evaluateDoacRenal enforces rivaroxaban evening food requirement and CrCl cutoffs", () => {
  // Normal CrCl
  const rivaNormal = evaluateDoacRenal("rivaroxaban", 75, 70, "nvaf");
  assert.equal(rivaNormal.status, "standard");
  assert.equal(rivaNormal.doseRecommendation, "20 mg PO once daily with evening meal");
  assert.match(rivaNormal.foodRequirement ?? "", /MUST be taken with food/);

  // Moderate CKD (CrCl 35) in NVAF -> dose cut to 15 mg
  const rivaRenal = evaluateDoacRenal("rivaroxaban", 35, 70, "nvaf");
  assert.equal(rivaRenal.status, "reduced");
  assert.equal(rivaRenal.doseRecommendation, "15 mg PO once daily with evening meal");

  // Severe CKD (CrCl 10) -> avoid
  const rivaSevere = evaluateDoacRenal("rivaroxaban", 10, 70, "nvaf");
  assert.equal(rivaSevere.status, "avoid");
  assert.match(rivaSevere.doseRecommendation, /Avoid use/);
});

test("evaluateDoacRenal triggers Edoxaban Black Box Warning when CrCl >95 mL/min", () => {
  // CrCl 105 in NVAF -> Black Box Warning
  const edoxabanHyper = evaluateDoacRenal("edoxaban", 105, 75, "nvaf");
  assert.equal(edoxabanHyper.status, "black-box");
  assert.match(edoxabanHyper.headline, /BLACK BOX WARNING: CrCl >95 mL\/min/);
  assert.match(edoxabanHyper.explanation, /ENGAGE AF-TIMI 48/);
  assert.match(edoxabanHyper.doseRecommendation, /DO NOT USE in NVAF/);

  // CrCl 70, normal weight -> 60 mg daily
  const edoxabanNormal = evaluateDoacRenal("edoxaban", 70, 75, "nvaf");
  assert.equal(edoxabanNormal.status, "standard");
  assert.equal(edoxabanNormal.doseRecommendation, "60 mg PO once daily");

  // CrCl 40 -> 30 mg daily
  const edoxabanRenal = evaluateDoacRenal("edoxaban", 40, 75, "nvaf");
  assert.equal(edoxabanRenal.status, "reduced");
  assert.equal(edoxabanRenal.doseRecommendation, "30 mg PO once daily");

  // CrCl 75 but weight 55 kg -> 30 mg daily
  const edoxabanLowWeight = evaluateDoacRenal("edoxaban", 75, 55, "nvaf");
  assert.equal(edoxabanLowWeight.status, "reduced");
  assert.equal(edoxabanLowWeight.doseRecommendation, "30 mg PO once daily");
});

test("evaluateDoacRenal enforces Dabigatran capsule integrity and hemodialysis clearance", () => {
  const dabigNormal = evaluateDoacRenal("dabigatran", 60, 70, "nvaf");
  assert.equal(dabigNormal.status, "standard");
  assert.equal(dabigNormal.doseRecommendation, "150 mg PO twice daily");
  assert.match(dabigNormal.capsuleIntegrityWarning ?? "", /MUST be swallowed whole/);
  assert.match(dabigNormal.capsuleIntegrityWarning ?? "", /DO NOT chew, break, or open/);
  assert.match(dabigNormal.dialysisRole ?? "", /~50–60% of circulating drug over 4 hours/);

  // CrCl 25 -> reduced to 75 mg BID
  const dabigRenal = evaluateDoacRenal("dabigatran", 25, 70, "nvaf");
  assert.equal(dabigRenal.status, "reduced");
  assert.equal(dabigRenal.doseRecommendation, "75 mg PO twice daily");

  // CrCl 10 -> avoid
  const dabigSevere = evaluateDoacRenal("dabigatran", 10, 70, "nvaf");
  assert.equal(dabigSevere.status, "avoid");
});

test("calculatePerioperativeHold stratifies hold times by bleed risk, CrCl, and neuraxial rules", () => {
  // Apixaban low risk normal CrCl -> 24 hours
  const apixLow = calculatePerioperativeHold("apixaban", 65, "low");
  assert.equal(apixLow.holdDurationHours, 24);

  // Apixaban high risk normal CrCl -> 48 hours
  const apixHigh = calculatePerioperativeHold("apixaban", 65, "high");
  assert.equal(apixHigh.holdDurationHours, 48);

  // Apixaban neuraxial (ASRA guideline) -> 72 hours
  const apixNeuraxial = calculatePerioperativeHold("apixaban", 65, "neuraxial");
  assert.equal(apixNeuraxial.holdDurationHours, 72);
  assert.match(apixNeuraxial.neuraxialSpecificGuidance ?? "", /ASRA Pain \/ Regional Anesthesia/);

  // Dabigatran high risk with CrCl 40 -> 72 hours
  const dabigHighCkd = calculatePerioperativeHold("dabigatran", 40, "high");
  assert.equal(dabigHighCkd.holdDurationHours, 72);

  // Warfarin -> 5 days (120 hours)
  const vkaHold = calculatePerioperativeHold("warfarin", 80, "high");
  assert.equal(vkaHold.holdDurationHours, 120);
  assert.match(vkaHold.preOpTimingSummary, /target INR <1\.5/);
});

test("calculateAndexxaDose implements ANNEXA-4 low vs high dose protocols", () => {
  // Apixaban <= 5 mg: Low dose regardless of timing
  const apixLowDose = calculateAndexxaDose("apixaban", 5, 3);
  assert.equal(apixLowDose.isHighDose, false);
  assert.match(apixLowDose.ivBolus, /400 mg IV/);
  assert.match(apixLowDose.continuousInfusion, /4 mg\/min/);

  // Apixaban > 5 mg taken within 8h (<8h): High dose
  const apixHighDose = calculateAndexxaDose("apixaban", 10, 4);
  assert.equal(apixHighDose.isHighDose, true);
  assert.match(apixHighDose.ivBolus, /800 mg IV/);
  assert.match(apixHighDose.continuousInfusion, /8 mg\/min/);

  // Apixaban > 5 mg taken >= 8h ago: Low dose
  const apixOldDose = calculateAndexxaDose("apixaban", 10, 10);
  assert.equal(apixOldDose.isHighDose, false);

  // Rivaroxaban > 10 mg taken within 8h: High dose
  const rivaHighDose = calculateAndexxaDose("rivaroxaban", 20, 2);
  assert.equal(rivaHighDose.isHighDose, true);

  // Rivaroxaban > 10 mg taken >= 8h: Low dose
  const rivaOldDose = calculateAndexxaDose("rivaroxaban", 20, 9);
  assert.equal(rivaOldDose.isHighDose, false);
});

test("evaluateReversal identifies specific antidotes and alternatives", () => {
  // Minor bleed -> supportive care
  const minor = evaluateReversal("apixaban", "minor");
  assert.equal(minor.specificAntidote, null);
  assert.match(minor.headline, /Minor Bleeding: Local Measures/);

  // Dabigatran major bleed -> Idarucizumab 5 g IV
  const dabigRev = evaluateReversal("dabigatran", "major");
  assert.equal(dabigRev.specificAntidote?.name, "Idarucizumab");
  assert.equal(dabigRev.specificAntidote?.brand, "Praxbind");
  assert.match(dabigRev.specificAntidote?.regimen ?? "", /5 g IV/);
  assert.equal(dabigRev.hemodialysisRole.isDialyzable, true);

  // Apixaban major bleed -> Andexanet alfa or 4F-PCC
  const apixRev = evaluateReversal("apixaban", "major");
  assert.equal(apixRev.specificAntidote?.name, "Andexanet alfa");
  assert.match(apixRev.nonSpecificAlternative.agent, /4-Factor Prothrombin Complex Concentrate/);
  assert.equal(apixRev.hemodialysisRole.isDialyzable, false);

  // Warfarin major bleed -> 4F-PCC + Vitamin K
  const vkaRev = evaluateReversal("warfarin", "major");
  assert.match(vkaRev.specificAntidote?.name ?? "", /4-Factor PCC \+ Vitamin K1/);
});

test("findAnticoagulantCollisions identifies dual 3A4/P-gp inhibitors, inducers, and bleed stacks", () => {
  const collisions = findAnticoagulantCollisions([
    "apixaban",
    "clarithromycin",
    "aspirin",
    "ibuprofen",
    "sertraline",
  ]);

  const categories = collisions.map((c) => c.category);
  assert.ok(categories.includes("dual-strong-inhibitor"));
  assert.ok(categories.includes("antiplatelet"));
  assert.ok(categories.includes("nsaid"));
  assert.ok(categories.includes("ssri-snri"));

  // Rivaroxaban with ketoconazole is marked contraindicated
  const rivaClash = findAnticoagulantCollisions(["rivaroxaban", "ketoconazole"]);
  assert.equal(rivaClash[0].severity, "contraindicated");

  // DOAC with rifampin is marked contraindicated
  const inducerClash = findAnticoagulantCollisions(["dabigatran", "rifampin"]);
  assert.equal(inducerClash[0].severity, "contraindicated");
  assert.match(inducerClash[0].headline, /DOAC × Rifampin/i);
});

test("doacOnDesk and doacReportOnDesk integrate cleanly with host profile", () => {
  const desk = doacOnDesk(["apixaban", "aspirin", "warfarin", "idarucizumab"]);
  assert.equal(desk.hasAnticoagulant, true);
  assert.equal(desk.hasDoac, true);
  assert.equal(desk.hasReversal, true);
  assert.deepEqual(desk.anticoagulants, ["apixaban", "warfarin"]);
  assert.deepEqual(desk.reversals, ["idarucizumab"]);

  const report = doacReportOnDesk(["apixaban", "clarithromycin"], DEFAULT_HOST, {
    age: 84,
    weightKg: 58,
    scr: 1.6,
  });

  assert.equal(report.hasDoac, true);
  assert.ok(report.apixabanAbc);
  assert.equal(report.apixabanAbc.reductionIndicated, true);
  assert.equal(report.apixabanAbc.recommendedDose, "2.5 mg PO BID");
  assert.ok(report.renalRails.length > 0);
  assert.ok(report.perioperativeHolds.length > 0);
  assert.ok(report.reversals.length > 0);
  assert.ok(report.collisions.length > 0);
  assert.ok(report.clinicalTakeaways.length > 0);
  assert.match(report.disclaimer, /Not FDA-cleared/);
});

