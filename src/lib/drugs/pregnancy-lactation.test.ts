import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRelativeInfantDose,
  evaluatePlacentalPermeation,
  getTrimesterVulnerability,
  pregnancyOnDesk,
  pregnancyReportOnDesk,
  CRITICAL_DEVELOPMENTAL_WINDOWS,
  EMBRYOGENESIS_PHASES,
  HIGH_YIELD_TERATOGENS,
  LACTATION_DATABASE,
  PLACENTAL_DRUG_DATABASE,
  PREGNANCY_LACTATION_REGULATORY_DISCLAIMER,
  CDS_CRITERIA_COMPLIANCE,
} from "./pregnancy-lactation";
import { DEFAULT_HOST, type HostContext } from "./types";

// ============================================================================
// 1. REGULATORY POSTURE & FD&C ACT § 520(o)(1)(E) VERIFICATION
// ============================================================================

test("regulatory: enforces non-device CDS criteria and standard disclaimers", () => {
  assert.ok(PREGNANCY_LACTATION_REGULATORY_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
  assert.ok(PREGNANCY_LACTATION_REGULATORY_DISCLAIMER.includes("Clinical Decision Support"));
  assert.ok(PREGNANCY_LACTATION_REGULATORY_DISCLAIMER.includes("Prescribing Information"));

  assert.equal(CDS_CRITERIA_COMPLIANCE.length, 4);
  assert.equal(CDS_CRITERIA_COMPLIANCE[0].criterionNumber, 1);
  assert.ok(CDS_CRITERIA_COMPLIANCE[0].title.includes("No Image"));
  assert.equal(CDS_CRITERIA_COMPLIANCE[1].criterionNumber, 2);
  assert.ok(CDS_CRITERIA_COMPLIANCE[1].title.includes("Pharmacological"));
  assert.equal(CDS_CRITERIA_COMPLIANCE[2].criterionNumber, 3);
  assert.ok(CDS_CRITERIA_COMPLIANCE[2].title.includes("Licensed Healthcare Professionals"));
  assert.equal(CDS_CRITERIA_COMPLIANCE[3].criterionNumber, 4);
  assert.ok(CDS_CRITERIA_COMPLIANCE[3].title.includes("Transparent Rationale"));
});

// ============================================================================
// 2. EMBRYOGENESIS PHASES & TRIMESTER CRITICAL WINDOWS
// ============================================================================

test("embryogenesis: models All-or-None period and Organogenesis critical windows", () => {
  const preImplantation = EMBRYOGENESIS_PHASES.find((p) => p.id === "pre-implantation");
  assert.ok(preImplantation);
  assert.equal(preImplantation.allOrNoneApplies, true);
  assert.equal(preImplantation.peakStructuralDefects, false);
  assert.ok(preImplantation.toxicologicalVulnerability.includes("All-or-None"));

  const organogenesis = EMBRYOGENESIS_PHASES.find((p) => p.id === "major-organogenesis");
  assert.ok(organogenesis);
  assert.equal(organogenesis.allOrNoneApplies, false);
  assert.equal(organogenesis.peakStructuralDefects, true);
  assert.equal(organogenesis.gestationalAgeWeeks.min, 5);
  assert.equal(organogenesis.gestationalAgeWeeks.max, 10.9);

  const fetogenesis = EMBRYOGENESIS_PHASES.find((p) => p.id === "fetogenesis");
  assert.ok(fetogenesis);
  assert.equal(fetogenesis.allOrNoneApplies, false);
  assert.equal(fetogenesis.peakStructuralDefects, false);
  assert.equal(fetogenesis.gestationalAgeWeeks.min, 11);
});

test("embryogenesis: correctly identifies sub-windows during organogenesis and fetogenesis", () => {
  // Day 21-28 post-conception (GA 5.0-6.0 wk) -> Neural Tube Closure
  const neuralTube = CRITICAL_DEVELOPMENTAL_WINDOWS.find((w) => w.id === "neural-tube-closure");
  assert.ok(neuralTube);
  assert.equal(neuralTube.postConceptionDays.min, 21);
  assert.equal(neuralTube.postConceptionDays.max, 28);
  assert.ok(neuralTube.malformationRisks.some((r) => r.includes("Spina bifida")));
  assert.ok(neuralTube.primaryCulpritClasses.includes("Valproate"));

  // Day 20-50 post-conception (GA 4.9-9.1 wk) -> Cardiac Septation
  const cardiac = CRITICAL_DEVELOPMENTAL_WINDOWS.find((w) => w.id === "cardiac-septation");
  assert.ok(cardiac);
  assert.ok(cardiac.malformationRisks.some((r) => r.includes("Tetralogy of Fallot")));

  // Day 24-36 post-conception (GA 5.4-7.1 wk) -> Limb Bud Outgrowth
  const limb = CRITICAL_DEVELOPMENTAL_WINDOWS.find((w) => w.id === "limb-bud-development");
  assert.ok(limb);
  assert.ok(limb.malformationRisks.some((r) => r.includes("Phocomelia")));
  assert.ok(limb.primaryCulpritClasses.includes("Thalidomide"));

  // Day 45-60 post-conception (GA 8.4-10.6 wk) -> Craniofacial Fusion
  const craniofacial = CRITICAL_DEVELOPMENTAL_WINDOWS.find((w) => w.id === "craniofacial-fusion");
  assert.ok(craniofacial);
  assert.ok(craniofacial.malformationRisks.some((r) => r.includes("Microtia")));

  // Dynamic gestational age querying
  const earlyOrganogenesis = getTrimesterVulnerability(5.5);
  const earlyWindowIds = earlyOrganogenesis.map((w) => w.id);
  assert.ok(earlyWindowIds.includes("neural-tube-closure"));
  assert.ok(earlyWindowIds.includes("cardiac-septation"));
  assert.ok(earlyWindowIds.includes("limb-bud-development"));

  const latePregnancy = getTrimesterVulnerability(32);
  const lateWindowIds = latePregnancy.map((w) => w.id);
  assert.ok(lateWindowIds.includes("fetal-renal-perfusion"));
  assert.ok(lateWindowIds.includes("ductus-arteriosus-closure"));
  assert.ok(!lateWindowIds.includes("neural-tube-closure"));
});

// ============================================================================
// 3. HIGH-YIELD TERATOGENIC PATHWAYS & MOLECULAR MECHANISMS
// ============================================================================

test("teratogens: thalidomide & lenalidomide bind Cereblon (CRBN) causing SALL4 degradation", () => {
  const thalidomide = HIGH_YIELD_TERATOGENS["thalidomide"];
  assert.ok(thalidomide);
  assert.equal(thalidomide.mechanismClass, "crbn-sall4-ubiquitination");
  assert.ok(thalidomide.molecularTarget.includes("Cereblon (CRBN)"));
  assert.ok(thalidomide.pathophysiologicalCascade.includes("SALL4"));
  assert.ok(thalidomide.structuralManifestations.some((m) => m.includes("Phocomelia")));
  assert.ok(thalidomide.remsProgram?.name.includes("THALIDOMID REMS"));
  assert.ok(thalidomide.remsProgram?.mandatoryRequirements.includes("two forms of reliable contraception"));

  const lenalidomide = HIGH_YIELD_TERATOGENS["lenalidomide"];
  assert.ok(lenalidomide);
  assert.equal(lenalidomide.mechanismClass, "crbn-sall4-ubiquitination");
  assert.ok(lenalidomide.remsProgram?.name.includes("REVLIMID REMS"));
});

test("teratogens: retinoids arrest cranial neural crest migration; acitretin has 3-year etretinate wait", () => {
  const isotretinoin = HIGH_YIELD_TERATOGENS["isotretinoin"];
  assert.ok(isotretinoin);
  assert.equal(isotretinoin.mechanismClass, "rar-rxr-neural-crest-arrest");
  assert.ok(isotretinoin.pathophysiologicalCascade.includes("cranial neural crest cells"));
  assert.ok(isotretinoin.structuralManifestations.some((m) => m.includes("Microtia")));
  assert.ok(isotretinoin.structuralManifestations.some((m) => m.includes("Tetralogy of Fallot")));
  assert.ok(isotretinoin.remsProgram?.name.includes("iPLEDGE"));

  const acitretin = HIGH_YIELD_TERATOGENS["acitretin"];
  assert.ok(acitretin);
  assert.ok(acitretin.pathophysiologicalCascade.includes("ETRETINATE"));
  assert.ok(acitretin.pharmacokineticTraps?.some((t) => t.includes("Alcohol Transesterification Trap")));
  assert.ok(acitretin.remsProgram?.postTherapyWaitPeriod.includes("3 FULL YEARS"));
});

test("teratogens: folate antagonists cause Aminopterin syndrome and valproate HDAC spina bifida", () => {
  const mtx = HIGH_YIELD_TERATOGENS["methotrexate"];
  assert.ok(mtx);
  assert.equal(mtx.mechanismClass, "dhfr-folate-synthesis-arrest");
  assert.ok(mtx.molecularTarget.includes("Dihydrofolate Reductase (DHFR)"));
  assert.ok(mtx.structuralManifestations.some((m) => m.includes("Aminopterin / Methotrexate Syndrome")));
  assert.ok(mtx.structuralManifestations.some((m) => m.includes("cloverleaf skull")));

  const vpa = HIGH_YIELD_TERATOGENS["valproate"];
  assert.ok(vpa);
  assert.equal(vpa.mechanismClass, "hdac-inhibition-folate-blockade");
  assert.ok(vpa.molecularTarget.includes("Histone Deacetylases"));
  assert.ok(vpa.structuralManifestations.some((m) => m.includes("Spina bifida")));
  assert.ok(vpa.structuralManifestations.some((m) => m.includes("Autism Spectrum Disorder")));

  const cbz = HIGH_YIELD_TERATOGENS["carbamazepine"];
  assert.ok(cbz);
  assert.ok(cbz.structuralManifestations.some((m) => m.includes("Spina bifida")));
});

test("teratogens: RAAS blockers induce 2nd/3rd trimester AT1 blockade, anuria, and Potter sequence", () => {
  const lisinopril = HIGH_YIELD_TERATOGENS["lisinopril"];
  assert.ok(lisinopril);
  assert.equal(lisinopril.mechanismClass, "renal-at1-potter-cascade");
  assert.ok(lisinopril.pathophysiologicalCascade.includes("efferent arteriolar tone"));
  assert.ok(lisinopril.pathophysiologicalCascade.includes("POTTER SEQUENCE"));
  assert.ok(lisinopril.structuralManifestations.some((m) => m.includes("pulmonary hypoplasia")));
  assert.ok(lisinopril.structuralManifestations.some((m) => m.includes("Hypocalvaria")));
  assert.ok(lisinopril.contraindicatedTrimesters.includes("second"));
  assert.ok(lisinopril.contraindicatedTrimesters.includes("third"));
  assert.ok(lisinopril.preferredSaferAlternatives.some((a) => a.includes("Labetalol")));
  assert.ok(lisinopril.preferredSaferAlternatives.some((a) => a.includes("Nifedipine")));

  const losartan = HIGH_YIELD_TERATOGENS["losartan"];
  assert.ok(losartan);
  assert.equal(losartan.mechanismClass, "renal-at1-potter-cascade");

  const arni = HIGH_YIELD_TERATOGENS["sacubitril-valsartan"];
  assert.ok(arni);
  assert.equal(arni.mechanismClass, "renal-at1-potter-cascade");
});

test("teratogens: NSAIDs trigger dual critical windows (oligohydramnios >= 20 wk; ductus closure >= 30 wk)", () => {
  const ibuprofen = HIGH_YIELD_TERATOGENS["ibuprofen"];
  assert.ok(ibuprofen);
  assert.equal(ibuprofen.mechanismClass, "cox-prostaglandin-ductus-renal");
  assert.ok(ibuprofen.pathophysiologicalCascade.includes(">= 20 weeks GA"));
  assert.ok(ibuprofen.pathophysiologicalCascade.includes("oligohydramnios"));
  assert.ok(ibuprofen.pathophysiologicalCascade.includes("ductus arteriosus"));
  assert.ok(ibuprofen.structuralManifestations.some((m) => m.includes("Persistent Pulmonary Hypertension of the Newborn")));
  assert.ok(ibuprofen.preferredSaferAlternatives.some((a) => a.includes("Acetaminophen")));

  const ketorolac = HIGH_YIELD_TERATOGENS["ketorolac"];
  assert.ok(ketorolac);
  assert.ok(ketorolac.boxedWarningSummary.includes("CONTRAINDICATED"));
});

test("teratogens: warfarin VKORC1 inhibition depletes osteocalcin Gla causing coumarin embryopathy", () => {
  const warfarin = HIGH_YIELD_TERATOGENS["warfarin"];
  assert.ok(warfarin);
  assert.equal(warfarin.mechanismClass, "vkorc1-osteocalcin-gla-depletion");
  assert.ok(warfarin.molecularTarget.includes("VKORC1"));
  assert.ok(warfarin.pathophysiologicalCascade.includes("gamma-carboxyglutamate (Gla) residues on osteocalcin"));
  assert.ok(warfarin.structuralManifestations.some((m) => m.includes("nasal hypoplasia")));
  assert.ok(warfarin.structuralManifestations.some((m) => m.includes("Chondrodysplasia punctata")));
  assert.ok(warfarin.preferredSaferAlternatives.some((a) => a.includes("Enoxaparin")));
  assert.ok(warfarin.preferredSaferAlternatives.some((a) => a.includes("DOES NOT cross the placenta")));
});

// ============================================================================
// 4. PLACENTAL BARRIER TRANSPORTER & KINETICS
// ============================================================================

test("placental kinetics: large macromolecules (>1000 Da) do not cross placenta", () => {
  // Heparin ~15,000 Da
  const heparin = evaluatePlacentalPermeation({ id: "heparin" });
  assert.equal(heparin.fickDiffusionCategory, "negligible");
  assert.equal(heparin.placentalCrossingRisk, "negligible");
  assert.ok(heparin.fetalCordToMaternalRatioEstimate.includes("0.0"));

  // Enoxaparin ~4,500 Da
  const enoxaparin = evaluatePlacentalPermeation({ id: "enoxaparin" });
  assert.equal(enoxaparin.fickDiffusionCategory, "negligible");
  assert.equal(enoxaparin.placentalCrossingRisk, "negligible");

  // Insulin Regular ~5,808 Da
  const insulin = evaluatePlacentalPermeation({ id: "insulin-regular" });
  assert.equal(insulin.fickDiffusionCategory, "negligible");
  assert.equal(insulin.placentalCrossingRisk, "negligible");

  // Monoclonal antibody (Infliximab ~149 kDa) active FcRn transport late in gestation
  const infliximab = evaluatePlacentalPermeation({ id: "infliximab" });
  assert.equal(infliximab.placentalCrossingRisk, "late-gestation-active");
  assert.ok(infliximab.activeTransportMechanism?.includes("FcRn"));
});

test("placental kinetics: active apical efflux pumps (P-gp and BCRP) extrude glyburide vs metformin", () => {
  const glyburide = evaluatePlacentalPermeation({ id: "glyburide" });
  assert.equal(glyburide.effluxShieldingActive, true);
  assert.ok(glyburide.effluxTransporters.includes("P-gp (ABCB1)"));
  assert.ok(glyburide.effluxTransporters.includes("BCRP (ABCG2)"));
  assert.ok(glyburide.fetalCordToMaternalRatioEstimate.includes("0.3 - 0.7"));

  const metformin = evaluatePlacentalPermeation({ id: "metformin" });
  assert.equal(metformin.effluxShieldingActive, false);
  assert.equal(metformin.placentalCrossingRisk, "high");
  assert.ok(metformin.fetalCordToMaternalRatioEstimate.includes("1.0 - 1.5"));
});

// ============================================================================
// 5. LACTATION & INFANT RISK MODELING (M/P, RID, BIOAVAILABILITY, CYP2D6 UM)
// ============================================================================

test("lactation: RID formula calculates infant exposure and clinical benchmark tiers", () => {
  // Case A: Infant dose 0.038 mg/kg/day, maternal dose 10 mg/kg/day -> RID 0.38% (Low risk < 10%)
  const lowRid = calculateRelativeInfantDose({
    infantDoseMgKgDay: 0.038,
    maternalDoseMgKgDay: 10,
  });
  assert.equal(lowRid.relativeInfantDosePercent, 0.38);
  assert.equal(lowRid.benchmarkTier, "compatible-low-risk");
  assert.ok(lowRid.clinicalInterpretation.includes("compatible"));

  // Case B: Milk concentration 2.0 mg/L with standard 150 mL/kg/day intake -> Infant dose = 0.3 mg/kg/day
  // Maternal dose = 2.0 mg/kg/day -> RID = 15.0% (Moderate monitor 10-25%)
  const modRid = calculateRelativeInfantDose({
    milkConcentrationMgL: 2.0,
    dailyMilkVolumeMlKgDay: 150,
    maternalDoseMgKgDay: 2.0,
  });
  assert.equal(modRid.infantDoseMgKgDay, 0.3);
  assert.equal(modRid.relativeInfantDosePercent, 15.0);
  assert.equal(modRid.benchmarkTier, "moderate-monitor");

  // Case C: Maternal total dose 200 mg in 70 kg mother (2.857 mg/kg/day).
  // Infant dose 0.85 mg/kg/day -> RID = 29.75% (> 25% elevated risk)
  const highRid = calculateRelativeInfantDose({
    infantDoseMgKgDay: 0.85,
    totalDailyMaternalDoseMg: 200,
    maternalWeightKg: 70,
  });
  assert.ok(highRid.relativeInfantDosePercent > 25);
  assert.equal(highRid.benchmarkTier, "avoid-high-risk");
});

test("lactation: infant oral bioavailability barrier shields infant from aminoglycosides & vancomycin", () => {
  const gent = LACTATION_DATABASE["gentamicin"];
  assert.ok(gent);
  assert.equal(gent.safetyRating, "compatible-low-risk");
  assert.ok(gent.infantBioavailabilityPercent < 1);
  assert.ok(gent.clinicalExplanation.includes("INFANT ORAL BIOAVAILABILITY BARRIER"));

  const vanco = LACTATION_DATABASE["vancomycin"];
  assert.ok(vanco);
  assert.equal(vanco.safetyRating, "compatible-low-risk");
  assert.ok(vanco.infantBioavailabilityPercent < 5);
});

test("lactation: codeine and tramadol carry Black Box Warning against nursing; CYP2D6 UM fatal surge", () => {
  const codeine = LACTATION_DATABASE["codeine"];
  assert.ok(codeine);
  assert.equal(codeine.safetyRating, "contraindicated");
  assert.equal(codeine.cyp2d6Vulnerability, true);
  assert.ok(codeine.cyp2d6UmWarning?.includes("FATAL NEONATAL RESPIRATORY DEPRESSION"));
  assert.ok(codeine.cyp2d6UmWarning?.includes("Ultra-Rapid Metabolizers (UM"));

  const tramadol = LACTATION_DATABASE["tramadol"];
  assert.ok(tramadol);
  assert.equal(tramadol.safetyRating, "contraindicated");
  assert.equal(tramadol.cyp2d6Vulnerability, true);
});

test("lactation: warfarin is compatible in lactation despite contraindication in pregnancy", () => {
  const warfarin = LACTATION_DATABASE["warfarin"];
  assert.ok(warfarin);
  assert.equal(warfarin.safetyRating, "compatible-low-risk");
  assert.ok(warfarin.relativeInfantDosePercent < 1.0);
  assert.ok(warfarin.clinicalExplanation.includes("99% bound to maternal albumin"));
});

// ============================================================================
// 6. DESK DETECTION FUNCTION (pregnancyOnDesk)
// ============================================================================

test("pregnancyOnDesk: flags teratogens, REMS programs, and lactation hazards", () => {
  // Empty tray
  const empty = pregnancyOnDesk([]);
  assert.equal(empty.hasTeratogen, false);
  assert.equal(empty.hasHighYieldTeratogen, false);
  assert.equal(empty.hasLactationRisk, false);
  assert.equal(empty.identifiedAgents.length, 0);

  // Multi-agent complex obstetric regimen
  const complexDesk = [
    "isotretinoin",
    "lisinopril",
    "ibuprofen",
    "warfarin",
    "codeine",
    "gentamicin",
    "acetaminophen",
  ];
  const detected = pregnancyOnDesk(complexDesk);

  assert.equal(detected.hasTeratogen, true);
  assert.equal(detected.hasHighYieldTeratogen, true);
  assert.equal(detected.hasRetinoid, true);
  assert.equal(detected.hasRaasBlocker, true);
  assert.equal(detected.hasNsaid, true);
  assert.equal(detected.hasWarfarin, true);
  assert.equal(detected.hasRemProgram, true);
  assert.equal(detected.hasCyp2d6LactationOpioid, true);
  assert.equal(detected.hasLactationRisk, true);

  assert.ok(detected.teratogenIds.includes("isotretinoin"));
  assert.ok(detected.teratogenIds.includes("lisinopril"));
  assert.ok(detected.teratogenIds.includes("ibuprofen"));
  assert.ok(detected.teratogenIds.includes("warfarin"));
  assert.ok(detected.lactationConcernIds.includes("codeine"));
});

// ============================================================================
// 7. COMPREHENSIVE CLINICAL REPORT GENERATOR (pregnancyReportOnDesk)
// ============================================================================

test("pregnancyReportOnDesk: generates critical alert for RAAS blocker and Potter sequence in pregnancy", () => {
  const hostPreg: HostContext = {
    ...DEFAULT_HOST,
    preg: "pregnant",
  };

  const report = pregnancyReportOnDesk(["lisinopril"], hostPreg, { gestationalAgeWeeks: 22 });

  assert.equal(report.summaryStatus, "critical");
  assert.ok(report.headline.includes("CRITICAL TERATOGENIC"));
  assert.equal(report.hostContext.pregState, "pregnant");
  assert.equal(report.hostContext.gestationalAgeWeeks, 22);

  const raasCollision = report.detectedCollisions.find((c) => c.hazardType === "potter-sequence");
  assert.ok(raasCollision);
  assert.equal(raasCollision.severity, "critical");
  assert.ok(raasCollision.headline.includes("Potter Sequence"));
  assert.ok(raasCollision.saferAlternatives.some((a) => a.includes("Labetalol")));
});

test("pregnancyReportOnDesk: differentiates NSAID risk by gestational age (GA 12 vs 24 vs 32 weeks)", () => {
  const hostPreg: HostContext = { ...DEFAULT_HOST, preg: "pregnant" };

  // GA 12 weeks: Early pregnancy (low ductus risk)
  const report12 = pregnancyReportOnDesk(["ibuprofen"], hostPreg, { gestationalAgeWeeks: 12 });
  const col12 = report12.detectedCollisions.find((c) => c.drugId === "ibuprofen");
  assert.ok(col12);
  assert.equal(col12.severity, "moderate");

  // GA 24 weeks: Oligohydramnios window
  const report24 = pregnancyReportOnDesk(["ibuprofen"], hostPreg, { gestationalAgeWeeks: 24 });
  const col24 = report24.detectedCollisions.find((c) => c.drugId === "ibuprofen");
  assert.ok(col24);
  assert.equal(col24.severity, "high");
  assert.ok(col24.headline.includes("Oligohydramnios"));

  // GA 32 weeks: Ductus closure contraindication
  const report32 = pregnancyReportOnDesk(["ibuprofen"], hostPreg, { gestationalAgeWeeks: 32 });
  const col32 = report32.detectedCollisions.find((c) => c.drugId === "ibuprofen");
  assert.ok(col32);
  assert.equal(col32.severity, "critical");
  assert.equal(col32.hazardType, "ductus-closure");
  assert.ok(col32.headline.includes("CONTRAINDICATED AT >= 30 WEEKS"));
});

test("pregnancyReportOnDesk: triggers critical lethal neonatal alert for maternal CYP2D6 UM + codeine in lactation", () => {
  const hostLacUm: HostContext = {
    ...DEFAULT_HOST,
    preg: "lactating",
    phenotypes: {
      ...DEFAULT_HOST.phenotypes,
      CYP2D6: "UM",
    },
  };

  const report = pregnancyReportOnDesk(["codeine"], hostLacUm);

  assert.equal(report.summaryStatus, "critical");
  assert.ok(report.cyp2d6LactationAlert);
  assert.equal(report.cyp2d6LactationAlert.triggered, true);
  assert.equal(report.cyp2d6LactationAlert.phenotype, "UM");
  assert.ok(report.cyp2d6LactationAlert.warningText.includes("CRITICAL LETHAL INFANT HAZARD"));
  assert.ok(report.cyp2d6LactationAlert.warningText.includes("morphine surges"));

  const apneaCollision = report.detectedCollisions.find((c) => c.hazardType === "opioid-cyp2d6-um-apnea");
  assert.ok(apneaCollision);
  assert.equal(apneaCollision.severity, "critical");
  assert.ok(apneaCollision.saferAlternatives.includes("Acetaminophen"));
  assert.ok(apneaCollision.saferAlternatives.includes("Ibuprofen"));
});

test("pregnancyReportOnDesk: highlights Acitretin 3-year etretinate wait period and REMS program", () => {
  const host: HostContext = { ...DEFAULT_HOST, preg: "off" };
  const report = pregnancyReportOnDesk(["acitretin"], host);

  assert.equal(report.summaryStatus, "critical");
  const acitretinCollision = report.detectedCollisions.find((c) => c.hazardType === "etretinate-persistence");
  assert.ok(acitretinCollision);
  assert.ok(acitretinCollision.headline.includes("3-Year Pregnancy Wait"));
  assert.ok(acitretinCollision.remsNotice?.includes("3 FULL YEARS"));
});

test("pregnancyReportOnDesk: reports compatible status when only benign agents on desk", () => {
  const hostPreg: HostContext = { ...DEFAULT_HOST, preg: "pregnant" };
  const report = pregnancyReportOnDesk(["acetaminophen"], hostPreg);

  assert.equal(report.summaryStatus, "compatible");
  assert.equal(report.detectedCollisions.length, 0);
  assert.ok(report.placentalPermeationAnalyses.length > 0);
  assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
});
