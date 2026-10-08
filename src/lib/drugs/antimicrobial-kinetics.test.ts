import assert from "node:assert/strict";
import test from "node:test";
import {
  antimicrobialOnDesk,
  antimicrobialReportOnDesk,
  calculateAminoglycosideHartford,
  calculateArcticScore,
  calculateVancomycinAuc,
  evaluateCefepimeNeurotoxicity,
  evaluateDaptomycinSafety,
  evaluateLinezolidSafety,
  simulateBetaLactamInfusion,
  ANTIMICROBIAL_KINETICS_CITATIONS,
  ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE,
  BETA_LACTAM_PROFILES,
} from "./antimicrobial-kinetics";
import { DEFAULT_HOST } from "./types";

// ============================================================================
// 1. REGULATORY NOTICE & CITATIONS COMPLIANCE
// ============================================================================

test("Regulatory Posture: Conforms strictly to FD&C Act § 520(o)(1)(E) non-device CDS requirements", () => {
  assert.ok(
    ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE.includes("FD&C Act § 520(o)(1)(E)"),
    "Notice must cite FD&C Act § 520(o)(1)(E)"
  );
  assert.ok(
    ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE.includes("Clinical Decision Support"),
    "Notice must declare non-device CDS classification"
  );
  assert.ok(
    ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE.includes("non-prescriptive"),
    "Notice must declare non-prescriptive educational posture"
  );
  assert.ok(
    ANTIMICROBIAL_KINETICS_CITATIONS.length >= 6,
    "Must include comprehensive peer-reviewed literature citations"
  );
  assert.ok(
    ANTIMICROBIAL_KINETICS_CITATIONS.some((c) => c.includes("Rybak") || c.includes("ASHP")),
    "Must cite 2020 consensus vancomycin guideline"
  );
  assert.ok(
    ANTIMICROBIAL_KINETICS_CITATIONS.some((c) => c.includes("Nicolau")),
    "Must cite Hartford nomogram landmark trial"
  );
  assert.ok(
    ANTIMICROBIAL_KINETICS_CITATIONS.some((c) => c.includes("ARCTIC") || c.includes("Barletta")),
    "Must cite ARCTIC score literature"
  );
});

// ============================================================================
// 2. DESK TRAY DETECTION & TAXONOMY
// ============================================================================

test("antimicrobialOnDesk: accurately identifies beta-lactams, aminoglycosides, glycopeptides, and perpetrators", () => {
  // Empty tray
  const empty = antimicrobialOnDesk(["metoprolol", "lisinopril"]);
  assert.equal(empty.hasAntimicrobial, false);
  assert.equal(empty.hasBetaLactam, false);
  assert.equal(empty.hasAminoglycoside, false);

  // Beta-lactam tray
  const meroDesk = antimicrobialOnDesk(["meropenem"]);
  assert.equal(meroDesk.hasAntimicrobial, true);
  assert.equal(meroDesk.hasBetaLactam, true);
  assert.equal(meroDesk.hasCarbapenem, true);
  assert.equal(meroDesk.hasPenicillin, false);
  assert.equal(meroDesk.hasCephalosporin, false);

  // Penicillin & Cephalosporin tray
  const zosynCefepime = antimicrobialOnDesk(["piperacillin-tazobactam", "cefepime"]);
  assert.equal(zosynCefepime.hasBetaLactam, true);
  assert.equal(zosynCefepime.hasPenicillin, true);
  assert.equal(zosynCefepime.hasCephalosporin, true);
  assert.equal(zosynCefepime.hasCefepime, true);

  // Aminoglycoside tray
  const gentDesk = antimicrobialOnDesk(["gentamicin"]);
  assert.equal(gentDesk.hasAminoglycoside, true);
  assert.equal(gentDesk.matchedAntimicrobials.includes("gentamicin"), true);

  // Glycopeptide & Lipopeptide tray
  const vancoDapto = antimicrobialOnDesk(["vancomycin", "daptomycin"]);
  assert.equal(vancoDapto.hasGlycopeptide, true);
  assert.equal(vancoDapto.hasVancomycin, true);
  assert.equal(vancoDapto.hasLipopeptide, true);
  assert.equal(vancoDapto.hasDaptomycin, true);

  // Oxazolidinone tray
  const linezolidDesk = antimicrobialOnDesk(["linezolid"]);
  assert.equal(linezolidDesk.hasOxazolidinone, true);
  assert.equal(linezolidDesk.hasLinezolid, true);

  // Polymyxin & Fluoroquinolone tray
  const colistinCipro = antimicrobialOnDesk(["colistin", "ciprofloxacin"]);
  assert.equal(colistinCipro.hasPolymyxin, true);
  assert.equal(colistinCipro.hasFluoroquinolone, true);

  // Interacting perpetrators detection
  const multiDesk = antimicrobialOnDesk(["linezolid", "sertraline", "daptomycin", "atorvastatin"]);
  assert.equal(multiDesk.matchedInteractingAgents.includes("sertraline"), true);
  assert.equal(multiDesk.matchedInteractingAgents.includes("atorvastatin"), true);
});

// ============================================================================
// 3. BETA-LACTAM TIME-DEPENDENT PK/PD & EXTENDED INFUSION SIMULATION
// ============================================================================

test("Beta-Lactam PK/PD: Extended 3-4h infusion dramatically increases %fT > MIC vs 30-min bolus", () => {
  // Test Meropenem 1000 mg q8h against Pseudomonas (MIC = 4 mcg/mL) in normal renal function (CrCl = 100)
  const bolusMero = simulateBetaLactamInfusion({
    drugId: "meropenem",
    doseMg: 1000,
    intervalHours: 8,
    infusionHours: 0.5,
    crCl: 100,
    mic: 4.0,
    patientWeightKg: 70,
  });

  const extMero = simulateBetaLactamInfusion({
    drugId: "meropenem",
    doseMg: 1000,
    intervalHours: 8,
    infusionHours: 3.0,
    crCl: 100,
    mic: 4.0,
    patientWeightKg: 70,
  });

  // Verify pharmacokinetic parameters
  assert.ok(bolusMero.halfLifeHours > 0.8 && bolusMero.halfLifeHours < 1.3, "Half life should be ~1.0h");
  assert.ok(bolusMero.cMaxSsUgMl > extMero.cMaxSsUgMl, "Bolus should have higher initial peak");
  assert.ok(extMero.cMinSsUgMl >= bolusMero.cMinSsUgMl, "Extended infusion should have equal or higher trough");

  // Extended infusion %fT > MIC should exceed standard bolus
  assert.ok(
    extMero.fTAboveMicPct > bolusMero.fTAboveMicPct,
    `Extended infusion %fT>MIC (${extMero.fTAboveMicPct}%) must exceed bolus (${bolusMero.fTAboveMicPct}%)`
  );
  assert.ok(extMero.comparisonVsBolus !== undefined, "Should contain comparison metrics");
  assert.ok(
    (extMero.comparisonVsBolus?.gainPct ?? 0) > 0,
    "Comparative gain should be positive"
  );

  // Test critically ill 100% fT > 4x MIC target with 24-hour continuous infusion
  const continuousMero = simulateBetaLactamInfusion({
    drugId: "meropenem",
    doseMg: 3000,
    intervalHours: 24,
    infusionHours: 24,
    crCl: 100,
    mic: 1.0,
    patientWeightKg: 70,
  });

  assert.equal(continuousMero.infusionMode, "continuous_infusion");
  assert.equal(continuousMero.fTAboveMicPct, 100);
  assert.equal(continuousMero.criticalIllTargetAchieved, true);
});

test("Beta-Lactam PK/PD: Augmented Renal Clearance (CrCl > 130) accelerates clearance and induces subtherapeutic troughs", () => {
  const normalCl = simulateBetaLactamInfusion({
    drugId: "piperacillin-tazobactam",
    doseMg: 3375,
    intervalHours: 8,
    infusionHours: 0.5,
    crCl: 100,
    mic: 16.0,
  });

  const arcCl = simulateBetaLactamInfusion({
    drugId: "piperacillin-tazobactam",
    doseMg: 3375,
    intervalHours: 8,
    infusionHours: 0.5,
    crCl: 180,
    mic: 16.0,
  });

  assert.equal(arcCl.arcWarning, true);
  assert.ok(arcCl.clearanceLPerHr > normalCl.clearanceLPerHr, "Clearance must be elevated in ARC");
  assert.ok(arcCl.halfLifeHours < normalCl.halfLifeHours, "Half life must be shortened in ARC");
  assert.ok(arcCl.fTAboveMicPct < normalCl.fTAboveMicPct, "%fT>MIC must drop in ARC");
});

// ============================================================================
// 4. AMINOGLYCOSIDES & HARTFORD NOMOGRAM EXTENDED-INTERVAL KINETICS
// ============================================================================

test("Aminoglycosides: calculates Devine IBW, AdjBW in obesity, and Hartford 7 mg/kg peak-to-MIC ratio", () => {
  // Normal weight male: 178 cm, 75 kg (IBW = 50 + 2.3 * (70-60) = 73.2 kg, ABW is 102% of IBW)
  const normalMale = calculateAminoglycosideHartford({
    agent: "gentamicin",
    doseMgPerKg: 7,
    actualWeightKg: 75,
    heightCm: 178,
    sex: "male",
    mic: 1.0,
  });

  assert.equal(normalMale.weightCategory, "normal");
  assert.equal(normalMale.dosingWeightType, "ibw");
  assert.ok(normalMale.peakToMicRatio >= 8.0, "Peak:MIC must meet bactericidal threshold >= 8-10:1");
  assert.equal(normalMale.peakTargetAchieved, true);

  // Obese female: 162 cm (~63.8 inches), actual weight 110 kg. IBW = 45.5 + 2.3 * 3.8 = 54.2 kg.
  // Weight to IBW ratio > 1.2 -> Obesity -> Use Adjusted Body Weight (AdjBW = IBW + 0.4 * (ABW - IBW))
  const obeseFemale = calculateAminoglycosideHartford({
    agent: "tobramycin",
    doseMgPerKg: 7,
    actualWeightKg: 110,
    heightCm: 162,
    sex: "female",
    mic: 1.0,
  });

  assert.equal(obeseFemale.weightCategory, "obese");
  assert.equal(obeseFemale.dosingWeightType, "adj");
  assert.ok(
    obeseFemale.dosingWeightKg < obeseFemale.actualWeightKg &&
      obeseFemale.dosingWeightKg > obeseFemale.ibwKg,
    "AdjBW must fall strictly between IBW and Actual weight"
  );
});

test("Aminoglycosides: accurately interprets Hartford Nomogram 6-14h level intervals and toxic trough thresholds", () => {
  // Level drawn at 8 hours: 2.2 mcg/mL for Gentamicin (cutoff: <= 2.8 is q24h)
  const gentNomogramQ24 = calculateAminoglycosideHartford({
    agent: "gentamicin",
    actualWeightKg: 70,
    heightCm: 175,
    sex: "male",
    serumLevelUgMl: 2.2,
    drawHoursPostDose: 8,
  });
  assert.equal(gentNomogramQ24.nomogramInterval, "q24h");

  // Level drawn at 8 hours: 3.8 mcg/mL (cutoff: 2.9-4.5 is q36h)
  const gentNomogramQ36 = calculateAminoglycosideHartford({
    agent: "gentamicin",
    actualWeightKg: 70,
    heightCm: 175,
    sex: "male",
    serumLevelUgMl: 3.8,
    drawHoursPostDose: 8,
  });
  assert.equal(gentNomogramQ36.nomogramInterval, "q36h");

  // Level drawn at 8 hours: 5.5 mcg/mL (cutoff: 4.6-6.5 is q48h)
  const gentNomogramQ48 = calculateAminoglycosideHartford({
    agent: "gentamicin",
    actualWeightKg: 70,
    heightCm: 175,
    sex: "male",
    serumLevelUgMl: 5.5,
    drawHoursPostDose: 8,
  });
  assert.equal(gentNomogramQ48.nomogramInterval, "q48h");

  // Level drawn at 8 hours: 8.5 mcg/mL (> 6.5 mcg/mL -> Off-nomogram)
  const gentOffNomogram = calculateAminoglycosideHartford({
    agent: "gentamicin",
    actualWeightKg: 70,
    heightCm: 175,
    sex: "male",
    serumLevelUgMl: 8.5,
    drawHoursPostDose: 8,
  });
  assert.equal(gentOffNomogram.nomogramInterval, "off_nomogram");
  assert.ok(gentOffNomogram.clinicalRecommendation.includes("ABOVE the 48-hour nomogram zone"));
  assert.equal(gentOffNomogram.troughWashoutTargetUgMl, 0.5);
});

// ============================================================================
// 5. VANCOMYCIN AUC24/MIC TARGETING & NEPHROTOXICITY RAILS
// ============================================================================

test("Vancomycin: models AUC24/MIC 400-600 consensus target and alerts on trough-only > 15-20 mcg/mL toxicity", () => {
  // Therapeutic target: 2000 mg/day with CrCl 80 mL/min -> CL ~ 3.5 L/h -> AUC ~ 570 mg*h/L
  const targetCase = calculateVancomycinAuc({
    totalDailyDoseMg: 2000,
    crCl: 80,
    mic: 1.0,
  });
  assert.equal(targetCase.band, "target");
  assert.equal(targetCase.targetAttained, true);
  assert.equal(targetCase.nephrotoxicityRisk, "standard");

  // Subtherapeutic case: 1000 mg/day in normal clearance
  const subCase = calculateVancomycinAuc({
    totalDailyDoseMg: 1000,
    crCl: 90,
    mic: 1.0,
  });
  assert.equal(subCase.band, "subtherapeutic");
  assert.equal(subCase.targetAttained, false);

  // Toxic supratherapeutic case: 3500 mg/day with CrCl 50 mL/min
  const toxicCase = calculateVancomycinAuc({
    totalDailyDoseMg: 3500,
    crCl: 50,
    mic: 1.0,
    measuredTroughUgMl: 18,
  });
  assert.equal(toxicCase.band, "supratherapeutic_toxic");
  assert.ok(toxicCase.estimatedAuc24 > 600, "AUC must exceed 600 mg*h/L");
  assert.ok(toxicCase.akiOddsRatio >= 2.0, "AKI odds ratio must be >= 2.0");
  assert.ok(
    toxicCase.troughWarning !== null && toxicCase.troughWarning.includes("abandoned"),
    "Must warn that trough-only 15-20 mcg/mL monitoring is abandoned"
  );
});

// ============================================================================
// 6. ARCTIC AUGMENTED RENAL CLEARANCE RISK SCORING
// ============================================================================

test("ARCTIC Score: models age, trauma, and SOFA score thresholds for ARC hyperfiltration detection", () => {
  // Young polytrauma patient with low SOFA: Age 28 (<50: 6 pts), Trauma (3 pts), SOFA 2 (<=4: 1 pt) -> 10 pts
  const highRiskArc = calculateArcticScore({
    age: 28,
    hasTrauma: true,
    sofaScore: 2,
  });
  assert.equal(highRiskArc.agePoints, 6);
  assert.equal(highRiskArc.traumaPoints, 3);
  assert.equal(highRiskArc.sofaPoints, 1);
  assert.equal(highRiskArc.totalScore, 10);
  assert.equal(highRiskArc.isHighRiskArc, true);
  assert.ok(
    highRiskArc.hydrophilicAntibioticTrap.includes("underdosing"),
    "Must highlight hydrophilic underdosing trap"
  );

  // Elderly non-trauma ICU patient: Age 82 (>=75: 0 pts), No trauma (0 pts), SOFA 7 (>4: 0 pts) -> 0 pts
  const lowRiskArc = calculateArcticScore({
    age: 82,
    hasTrauma: false,
    sofaScore: 7,
  });
  assert.equal(lowRiskArc.totalScore, 0);
  assert.equal(lowRiskArc.isHighRiskArc, false);
});

// ============================================================================
// 7. HIGH-ALERT ORGAN-TOXICITY SAFETY RAILS (CEFEPIME, LINEZOLID, DAPTOMYCIN)
// ============================================================================

test("Cefepime: models GABA-A competitive antagonism, renal threshold, NCSE, and hemodialysis clearance", () => {
  // Severe renal impairment CrCl = 20 mL/min
  const ckdEval = evaluateCefepimeNeurotoxicity(20, false, 4.0);
  assert.equal(ckdEval.riskLevel, "critical");
  assert.ok(
    ckdEval.gabaAAntagonismMechanism.includes("GABA-A"),
    "Must describe GABA-A competitive antagonism"
  );
  assert.equal(ckdEval.eegFindings.triphasicWaves, true);
  assert.ok(
    ckdEval.clinicalSpectrum.some((s) => s.includes("Non-convulsive status epilepticus")),
    "Must list NCSE in clinical spectrum"
  );
  assert.equal(ckdEval.hemodialysisClearancePct, 70);

  // Normal renal function CrCl = 95 mL/min
  const normalEval = evaluateCefepimeNeurotoxicity(95, false, 2.0);
  assert.equal(normalEval.riskLevel, "standard");
});

test("Linezolid: models reversible MAOI serotonin syndrome collision and time-dependent myelosuppression", () => {
  // Linezolid + Sertraline at day 16 of therapy
  const collisionEval = evaluateLinezolidSafety({
    durationDays: 16,
    coAdministeredAgents: ["sertraline", "linezolid"],
  });

  assert.equal(collisionEval.serotoninCollisionPresent, true);
  assert.equal(collisionEval.serotoninSyndromeRisk, "critical");
  assert.equal(collisionEval.myelosuppressionWarning, true);
  assert.equal(collisionEval.neuropathyWarning, false); // < 28 days
  assert.ok(collisionEval.mitochondrialMechanism.includes("mitochondrial"));

  // Prolonged course at 35 days
  const prolongedEval = evaluateLinezolidSafety({
    durationDays: 35,
    coAdministeredAgents: [],
  });
  assert.equal(prolongedEval.serotoninCollisionPresent, false);
  assert.equal(prolongedEval.myelosuppressionWarning, true);
  assert.equal(prolongedEval.neuropathyWarning, true);
});

test("Daptomycin: models pulmonary surfactant inactivation and sarcolemmal statin collision", () => {
  const daptoEval = evaluateDaptomycinSafety(true, ["atorvastatin"]);
  assert.equal(daptoEval.isPneumoniaIndication, true);
  assert.ok(daptoEval.surfactantContraindicationAlert.includes("CONTRAINDICATION IN PNEUMONIA"));
  assert.equal(daptoEval.statinCollisionPresent, true);
  assert.equal(daptoEval.collidingStatins.includes("atorvastatin"), true);
  assert.equal(daptoEval.discontinuationThresholds.symptomaticCpkU_L, 1000);
  assert.equal(daptoEval.discontinuationThresholds.asymptomaticCpkU_L, 2000);
});

// ============================================================================
// 8. MASTER COMPREHENSIVE REPORT ON DESK GENERATION
// ============================================================================

test("antimicrobialReportOnDesk: compiles full PK/PD, ARC, and organ safety master packet", () => {
  const drugTray = [
    "meropenem",
    "cefepime",
    "gentamicin",
    "vancomycin",
    "linezolid",
    "sertraline",
    "atorvastatin",
  ];

  const report = antimicrobialReportOnDesk(drugTray, {
    ...DEFAULT_HOST,
    age: "adult",
    kidney: "ckd",
  });

  // Verify desk detection
  assert.equal(report.detection.hasAntimicrobial, true);
  assert.equal(report.detection.hasBetaLactam, true);
  assert.equal(report.detection.hasAminoglycoside, true);
  assert.equal(report.detection.hasVancomycin, true);
  assert.equal(report.detection.hasLinezolid, true);

  // Verify simulations
  assert.ok(report.betaLactamAssessments.length >= 2, "Should simulate meropenem and cefepime");
  assert.ok(report.aminoglycosideAssessments.length >= 1, "Should simulate gentamicin");
  assert.ok(report.vancomycinAssessment !== undefined, "Should assess vancomycin AUC");
  assert.ok(report.cefepimeAssessment !== undefined, "Should assess cefepime neurotoxicity");
  assert.ok(report.linezolidAssessment !== undefined, "Should assess linezolid MAOI");

  // Verify alerts
  assert.ok(
    report.organSafetyAlerts.some((a) => a.title.includes("GABA-A")),
    "Should flag cefepime neurotoxicity in CKD"
  );
  assert.ok(
    report.organSafetyAlerts.some((a) => a.title.includes("Serotonergic")),
    "Should flag linezolid + sertraline serotonin collision"
  );

  // Verify pearls and regulatory disclaimer
  assert.ok(report.stewardshipPearls.length >= 5);
  assert.ok(report.regulatoryNotice.includes("FD&C Act § 520(o)(1)(E)"));
  assert.ok(report.citations.length >= 5);
});
