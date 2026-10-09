import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NOT_CLEARED,
  PI_FOOTER,
  PEDIATRIC_CDS_DISCLAIMER,
  RENAL_GFR_MATURATION_CURVE,
  getExpectedNormalGfrRange,
  evaluateRenalOntogeny,
  evaluateHepaticOntogeny,
  evaluateKernicterusAndDisplacement,
  evaluateHighAlertPediatricToxicities,
  calculatePediatricBsa,
  calculateBedsideSchwartzEgfr,
  calculatePediatricDoseClamp,
  pediatricOnDesk,
  pediatricReportOnDesk,
  computePediatricAgeSummary,
} from "./pediatric-kinetics";

describe("Pediatric & Neonatal Developmental Pharmacokinetics Engine", () => {
  describe("Regulatory Compliance & FD&C Act § 520(o)(1)(E) Non-Device CDS Posture", () => {
    it("exports statutory disclaimer explicitly citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(NOT_CLEARED.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(NOT_CLEARED.includes("Not an FDA-cleared medical device"));
      assert.ok(PEDIATRIC_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("verifies non-prescriptive clinical decision support posture", () => {
      assert.ok(PI_FOOTER.includes("Developmental ontogeny models reflect AAP"));
      assert.ok(PEDIATRIC_CDS_DISCLAIMER.includes("STRICTLY NON-PRESCRIPTIVE"));
      assert.ok(PEDIATRIC_CDS_DISCLAIMER.includes("Does not generate patient-specific medical orders"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = pediatricReportOnDesk(["ceftriaxone"]);
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("surfaces canonical peer-reviewed pediatric pharmacology citations", () => {
      const report = pediatricReportOnDesk(["ceftriaxone", "codeine"]);
      assert.ok(report.citations.length >= 6);
      assert.ok(report.citations.some((c) => c.includes("Kearns GL")));
      assert.ok(report.citations.some((c) => c.includes("Schwartz GJ")));
      assert.ok(report.citations.some((c) => c.includes("Robertson A")));
      assert.ok(report.citations.some((c) => c.includes("Weiss CF")));
    });
  });

  describe("Pillar 1: Developmental Renal GFR Ontogeny", () => {
    it("matches the maturation curve brackets across gestational and postnatal ages", () => {
      // 1. Preterm (24-28 weeks)
      const preterm = getExpectedNormalGfrRange(26, 3);
      assert.equal(preterm.minGfr, 15);
      assert.equal(preterm.maxGfr, 20);

      // 2. Full-term neonate (day 1-3)
      const termDay2 = getExpectedNormalGfrRange(40, 2);
      assert.equal(termDay2.minGfr, 30);
      assert.equal(termDay2.maxGfr, 40);

      // 3. Term neonate 1-2 weeks
      const termWeek2 = getExpectedNormalGfrRange(40, 10);
      assert.equal(termWeek2.minGfr, 50);
      assert.equal(termWeek2.maxGfr, 60);

      // 4. Infant 6-12 months
      const infant9mo = getExpectedNormalGfrRange(40, 270);
      assert.equal(infant9mo.minGfr, 80);
      assert.equal(infant9mo.maxGfr, 100);

      // 5. Child 1-2 years and older
      const child2yr = getExpectedNormalGfrRange(40, 730);
      assert.equal(child2yr.minGfr, 100);
      assert.equal(child2yr.maxGfr, 140);
      assert.equal(child2yr.meanGfr, 120);
    });

    it("evaluates renal ontogeny and identifies GFR depression vs age-matched normal", () => {
      const ageSummary = computePediatricAgeSummary({
        gestationalAgeWeeks: 40,
        postnatalAgeDays: 10, // expected 50-60 mL/min/1.73m²
      });

      // Normal for age: height 52 cm, SCr 0.4 mg/dL -> Schwartz = (0.413 * 52) / 0.4 = 53.69 -> 53.7
      const normalResult = evaluateRenalOntogeny(ageSummary, 52, 0.4);
      assert.equal(normalResult.schwartzEgfr, 53.7);
      assert.equal(normalResult.isEgfrDepressedForAge, false);
      assert.ok(normalResult.renalClearanceMaturationFraction > 0.4);

      // Depressed for age: SCr 1.2 mg/dL -> Schwartz = (0.413 * 52) / 1.2 = 17.9
      const depressedResult = evaluateRenalOntogeny(ageSummary, 52, 1.2);
      assert.equal(depressedResult.schwartzEgfr, 17.9);
      assert.equal(depressedResult.isEgfrDepressedForAge, true);
      assert.ok(depressedResult.clinicalInterpretation.includes("DEPRESSED below the expected"));
    });
  });

  describe("Pillar 1: Hepatic CYP & UGT Ontogeny", () => {
    it("models fetal CYP3A7 dominance at birth and postnatal CYP3A4 upregulation", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 2 });
      const neonateHepatic = evaluateHepaticOntogeny(neonateAge);

      assert.equal(neonateHepatic.cyp3a7.maturationPercentOfAdult, 100);
      assert.equal(neonateHepatic.cyp3a4.maturationPercentOfAdult, 10);

      const toddlerAge = computePediatricAgeSummary({ postnatalAgeYears: 3 });
      const toddlerHepatic = evaluateHepaticOntogeny(toddlerAge);

      assert.equal(toddlerHepatic.cyp3a7.maturationPercentOfAdult, 0);
      // Toddler/early childhood exceeds adult clearance/kg (150%)
      assert.equal(toddlerHepatic.cyp3a4.maturationPercentOfAdult, 150);
    });

    it("models slow CYP1A2 ontogeny and extreme caffeine half-life prolongation in preterm neonates", () => {
      const pretermAge = computePediatricAgeSummary({
        gestationalAgeWeeks: 27,
        postnatalAgeDays: 5,
      });
      const pretermHepatic = evaluateHepaticOntogeny(pretermAge);

      assert.ok(pretermHepatic.cyp1a2.maturationPercentOfAdult <= 2);
      assert.ok(pretermHepatic.caffeineHalfLifePredictionHours >= 65);
      assert.ok(pretermHepatic.caffeineHalfLifeRangeText.includes("65 to 100 hours"));

      const adultAge = computePediatricAgeSummary({ postnatalAgeYears: 20 });
      const adultHepatic = evaluateHepaticOntogeny(adultAge);
      assert.equal(adultHepatic.cyp1a2.maturationPercentOfAdult, 100);
      assert.equal(adultHepatic.caffeineHalfLifePredictionHours, 4.0);
    });

    it("identifies immature neonatal UGT2B7 glucuronidation capacity", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 3 });
      const neonateHepatic = evaluateHepaticOntogeny(neonateAge);
      assert.equal(neonateHepatic.ugt2b7.maturationPercentOfAdult, 10);
      assert.ok(neonateHepatic.ugt2b7.clinicalSignificance.includes("Gray Baby Syndrome"));
    });
  });

  describe("Pillar 2: Neonatal Hyperbilirubinemia & Kernicterus Albumin Displacement", () => {
    it("enforces mandatory contraindication for Ceftriaxone in neonates <= 28 days", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 14 });
      const result = evaluateKernicterusAndDisplacement({
        drugIds: ["ceftriaxone"],
        ageSummary: neonateAge,
      });

      assert.equal(result.ceftriaxoneDisplacementDetected, true);
      assert.equal(result.isNeonateContraindicated, true);
      assert.equal(result.severity, "CRITICAL_CONTRAINDICATION");
      assert.ok(result.recommendedAlternatives.some((a) => a.includes("Cefotaxime")));
      assert.ok(result.recommendedAlternatives.some((a) => a.includes("Ampicillin IV + Gentamicin IV")));
    });

    it("triggers fatal calcium precipitation alert when IV calcium is co-administered with Ceftriaxone", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 5 });
      const result = evaluateKernicterusAndDisplacement({
        drugIds: ["ceftriaxone"],
        ageSummary: neonateAge,
        hasIvCalciumActive: true,
      });

      assert.equal(result.calciumPrecipitationHazard, true);
      assert.ok(result.clinicalActionMandate.includes("FATAL CALCIUM-CEFTRIAXONE PRECIPITATION"));
      assert.ok(result.clinicalActionMandate.includes("crystalline ceftriaxone-calcium salts"));
    });

    it("triggers severe kernicterus neurotoxicity alert in hyperbilirubinemic neonates", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 4 });
      const result = evaluateKernicterusAndDisplacement({
        drugIds: ["ceftriaxone"],
        ageSummary: neonateAge,
        isHyperbilirubinemic: true,
      });

      assert.equal(result.hyperbilirubinemiaCompoundingHazard, true);
      assert.ok(result.clinicalActionMandate.includes("SEVERE KERNICTERUS ENCEPHALOPATHY"));
      assert.ok(result.clinicalActionMandate.includes("basal ganglia"));
    });

    it("contraindicates Sulfamethoxazole (Bactrim) in infants under 2 months (< 60 days)", () => {
      const infant40d = computePediatricAgeSummary({ postnatalAgeDays: 40 });
      const result = evaluateKernicterusAndDisplacement({
        drugIds: ["bactrim"],
        ageSummary: infant40d,
      });

      assert.equal(result.sulfamethoxazoleDisplacementDetected, true);
      assert.equal(result.isInfantSulfamethoxazoleContraindicated, true);
      assert.ok(result.clinicalActionMandate.includes("infants < 2 months of age"));
      assert.ok(result.recommendedAlternatives.some((a) => a.includes("Amoxicillin")));
    });

    it("does not contraindicate Ceftriaxone in older children (> 28 days)", () => {
      const child2yr = computePediatricAgeSummary({ postnatalAgeYears: 2 });
      const result = evaluateKernicterusAndDisplacement({
        drugIds: ["ceftriaxone"],
        ageSummary: child2yr,
      });

      assert.equal(result.ceftriaxoneDisplacementDetected, true);
      assert.equal(result.isNeonateContraindicated, false);
      assert.equal(result.calciumPrecipitationHazard, false);
    });
  });

  describe("Pillar 3: High-Alert Pediatric Drug & Excipient Toxicities", () => {
    it("flags Chloramphenicol Gray Baby Syndrome in neonates and infants", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 10 });
      const alerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["chloramphenicol"],
        ageSummary: neonateAge,
      });

      const grayBabyAlert = alerts.find((a) => a.syndromeTitle.includes("Gray Baby"));
      assert.ok(grayBabyAlert);
      assert.equal(grayBabyAlert.isContraindicated, true);
      assert.ok(grayBabyAlert.molecularBiochemicalMechanism.includes("immature UGT2B7"));
      assert.ok(grayBabyAlert.clinicalHallmarks.some((h) => h.includes("Ashen-gray cyanosis")));
    });

    it("flags Propylene Glycol excipient hyperosmolality & lactic acidosis in neonates receiving IV lorazepam/diazepam", () => {
      const neonateAge = computePediatricAgeSummary({ postnatalAgeDays: 7 });
      const alerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["lorazepam"],
        ageSummary: neonateAge,
      });

      const pgAlert = alerts.find((a) => a.drugOrExcipientName.includes("Propylene Glycol"));
      assert.ok(pgAlert);
      assert.ok(pgAlert.molecularBiochemicalMechanism.includes("immature alcohol dehydrogenase"));
      assert.ok(pgAlert.clinicalHallmarks.some((h) => h.includes("serum osmolar gap")));
      assert.ok(pgAlert.safeAlternativeOrException.includes("midazolam"));
    });

    it("flags Benzyl Alcohol Gasping Syndrome in neonates and preterms", () => {
      const pretermAge = computePediatricAgeSummary({
        gestationalAgeWeeks: 30,
        postnatalAgeDays: 12,
      });
      const alerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["benzyl alcohol"],
        ageSummary: pretermAge,
      });

      const baAlert = alerts.find((a) => a.syndromeTitle.includes("Gasping Syndrome"));
      assert.ok(baAlert);
      assert.equal(baAlert.isContraindicated, true);
      assert.ok(baAlert.molecularBiochemicalMechanism.includes("benzoic acid"));
      assert.ok(baAlert.clinicalHallmarks.some((h) => h.includes("Gasping respirations")));
    });

    it("enforces FDA Boxed Warning contraindicating Codeine & Tramadol in children < 12 years", () => {
      const child8yr = computePediatricAgeSummary({ postnatalAgeYears: 8 });
      const alerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["codeine", "tramadol"],
        ageSummary: child8yr,
      });

      const boxedAlert = alerts.find((a) => a.syndromeTitle.includes("FDA Black Box Contraindication"));
      assert.ok(boxedAlert);
      assert.equal(boxedAlert.isContraindicated, true);
      assert.ok(boxedAlert.molecularBiochemicalMechanism.includes("CYP2D6 ultra-rapid"));
      assert.ok(boxedAlert.safeAlternativeOrException.includes("multimodal"));
    });

    it("enforces FDA Boxed Warning contraindicating Codeine & Tramadol post-tonsillectomy in patients < 18 years", () => {
      const teen15yr = computePediatricAgeSummary({ postnatalAgeYears: 15 });
      const alerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["codeine"],
        ageSummary: teen15yr,
        isPostTonsillectomy: true,
      });

      const boxedAlert = alerts.find((a) => a.syndromeTitle.includes("FDA Black Box Contraindication"));
      assert.ok(boxedAlert);
      assert.equal(boxedAlert.isContraindicated, true);
    });

    it("warns of Fluoroquinolone articular cartilage toxicity while noting anthrax/CF exceptions", () => {
      const child10yr = computePediatricAgeSummary({ postnatalAgeYears: 10 });
      const alerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["ciprofloxacin"],
        ageSummary: child10yr,
      });

      const fqAlert = alerts.find((a) => a.syndromeTitle.includes("Articular Cartilage"));
      assert.ok(fqAlert);
      assert.ok(fqAlert.safeAlternativeOrException.includes("anthrax"));
      assert.ok(fqAlert.safeAlternativeOrException.includes("cystic fibrosis"));
    });

    it("flags Tetracyclines for tooth discoloration < 8yo but protects Doxycycline for RMSF/Lyme", () => {
      const child5yr = computePediatricAgeSummary({ postnatalAgeYears: 5 });

      // Generic tetracycline
      const tetAlerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["tetracycline"],
        ageSummary: child5yr,
      });
      const tetAlert = tetAlerts.find((a) => a.syndromeTitle.includes("Tooth Enamel"));
      assert.ok(tetAlert);
      assert.equal(tetAlert.isContraindicated, true);

      // Doxycycline has life-saving RMSF exception
      const doxyAlerts = evaluateHighAlertPediatricToxicities({
        drugIds: ["doxycycline"],
        ageSummary: child5yr,
      });
      const doxyAlert = doxyAlerts.find((a) => a.syndromeTitle.includes("Tooth Enamel"));
      assert.ok(doxyAlert);
      assert.equal(doxyAlert.isContraindicated, false);
      assert.ok(doxyAlert.safeAlternativeOrException.includes("Rocky Mountain Spotted Fever"));
    });
  });

  describe("Pillar 4: Pediatric Allometric Scaling & Bedside Equations", () => {
    it("calculates Mosteller and Haycock Body Surface Area (BSA) accurately", () => {
      // Child: Height 100 cm, Weight 16 kg
      const bsa = calculatePediatricBsa(100, 16);

      // Mosteller: sqrt((100 * 16) / 3600) = sqrt(1600 / 3600) = sqrt(4/9) = 2/3 = 0.667 m²
      assert.equal(bsa.mostellerBsaM2, 0.667);

      // Haycock: 0.024265 * (16 ^ 0.5378) * (100 ^ 0.3964) ~ 0.671 m²
      assert.ok(bsa.haycockBsaM2 !== undefined);
      assert.ok(Math.abs((bsa.haycockBsaM2 ?? 0) - 0.671) < 0.02);
    });

    it("calculates Bedside Schwartz eGFR with IDMS-traceable constant (0.413)", () => {
      // Height 100 cm, SCr 0.5 mg/dL -> eGFR = (0.413 * 100) / 0.5 = 82.6 mL/min/1.73m²
      const result = calculateBedsideSchwartzEgfr(100, 0.5);
      assert.equal(result.schwartzEgfr, 82.6);
      assert.equal(result.isIdmsTraceable, true);
    });

    it("applies adult dose ceiling clamp when weight-based dose breaches adult maximum", () => {
      // Obese adolescent: 60 kg receiving high-dose amoxicillin 90 mg/kg/day
      // Raw: 60 * 90 = 5,400 mg/day. Max adult ceiling: 4,000 mg/day.
      const clampResult = calculatePediatricDoseClamp({
        weightKg: 60,
        prescribedMgPerKg: 90,
        maxAdultDoseMg: 4000,
      });

      assert.equal(clampResult.rawCalculatedDoseMg, 5400);
      assert.equal(clampResult.clampedDoseMg, 4000);
      assert.equal(clampResult.isCeilingApplied, true);
      assert.equal(clampResult.percentReductionFromRaw, 25.9);
      assert.ok(clampResult.clinicalSafetyAlert.includes("CRITICAL ADULT DOSE CEILING CLAMP APPLIED"));
    });

    it("does not clamp when calculated weight-based dose is below adult maximum", () => {
      // Infant: 10 kg receiving amoxicillin 90 mg/kg/day = 900 mg/day (well below 4,000 mg ceiling)
      const normalDose = calculatePediatricDoseClamp({
        weightKg: 10,
        prescribedMgPerKg: 90,
        maxAdultDoseMg: 4000,
      });

      assert.equal(normalDose.rawCalculatedDoseMg, 900);
      assert.equal(normalDose.clampedDoseMg, 900);
      assert.equal(normalDose.isCeilingApplied, false);
      assert.equal(normalDose.percentReductionFromRaw, 0);
    });
  });

  describe("Desk Tray Detection & End-to-End Report Generation", () => {
    it("accurately detects pediatric target drugs and categorizes risk mechanisms", () => {
      const detection = pediatricOnDesk([
        "ceftriaxone",
        "lorazepam",
        "codeine",
        "doxycycline",
      ]);

      assert.equal(detection.hasPediatricTargetDrug, true);
      assert.equal(detection.hasCeftriaxone, true);
      assert.equal(detection.hasPropyleneGlycolRisk, true);
      assert.equal(detection.hasCodeine, true);
      assert.equal(detection.hasDoxycycline, true);
      assert.ok(detection.matchedDrugCategories.includes("Kernicterus & Calcium Precipitation Risk"));
      assert.ok(detection.matchedDrugCategories.includes("CYP2D6 Boxed Warning Prodrug"));
    });

    it("generates a comprehensive end-to-end report for a neonate receiving ceftriaxone and calcium", () => {
      const report = pediatricReportOnDesk(
        ["ceftriaxone", "lorazepam"],
        undefined,
        {
          gestationalAgeWeeks: 38,
          postnatalAgeDays: 6,
          weightKg: 3.2,
          heightCm: 49,
          serumCreatinineMgDl: 0.5,
          hasIvCalciumActive: true,
          isHyperbilirubinemic: true,
        },
      );

      assert.equal(report.detection.hasCeftriaxone, true);
      assert.equal(report.patientAgeSummary.isNeonate, true);
      assert.equal(report.kernicterusRisk.isNeonateContraindicated, true);
      assert.equal(report.kernicterusRisk.calciumPrecipitationHazard, true);
      assert.equal(report.kernicterusRisk.hyperbilirubinemiaCompoundingHazard, true);
      assert.ok(report.safetyAlerts.some((a) => a.includes("CEFTRIAXONE CONTRAINDICATION")));
      assert.ok(report.safetyAlerts.some((a) => a.includes("FATAL CALCIUM-CEFTRIAXONE")));
      assert.ok(report.allometricScaling.bsa.mostellerBsaM2 !== undefined);
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });
  });
});
