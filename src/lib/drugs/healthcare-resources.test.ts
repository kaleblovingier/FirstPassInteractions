import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HEALTHCARE_RESOURCES,
  RESOURCE_BY_ID,
  RESOURCE_DOMAINS,
  FILTER_PILLS,
  HEALTHCARE_RESOURCES_CDS_DISCLAIMER,
  RESOURCE_COMPLIANCE_CRITERIA,
  healthcareResourcesFor,
  filterResources,
  generateResourceHandout,
  MANUFACTURER_PAP_DIRECTORY,
  searchManufacturerPAPs,
  STATE_SPAP_DIRECTORY,
  getStateSPAP,
  type HealthcareResource,
} from "./healthcare-resources";
import { DEFAULT_HOST, type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Healthcare Resources Directory & Patient Navigation Engine", () => {
  // ==========================================================================
  // 1. STATUTORY REGULATORY POSTURE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Compliance & Non-Device CDS Posture", () => {
    it("exports statutory disclaimer explicitly citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(HEALTHCARE_RESOURCES_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(HEALTHCARE_RESOURCES_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(HEALTHCARE_RESOURCES_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(HEALTHCARE_RESOURCES_CDS_DISCLAIMER.includes("non-prescriptive"));
    });

    it("includes structured statutory criteria compliance documentation", () => {
      assert.strictEqual(RESOURCE_COMPLIANCE_CRITERIA.length, 4);
      assert.ok(RESOURCE_COMPLIANCE_CRITERIA.some((c) => c.criterion.includes("520(o)(1)(E)(i)")));
      assert.ok(RESOURCE_COMPLIANCE_CRITERIA.some((c) => c.criterion.includes("520(o)(1)(E)(ii)")));
      assert.ok(RESOURCE_COMPLIANCE_CRITERIA.some((c) => c.criterion.includes("520(o)(1)(E)(iii)")));
      assert.ok(RESOURCE_COMPLIANCE_CRITERIA.some((c) => c.criterion.includes("520(o)(1)(E)(iv)")));
    });

    it("verifies report generator embeds regulatory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = healthcareResourcesFor(["metformin"]);
      assert.ok(report.disclaimer.includes(HEALTHCARE_RESOURCES_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });

    it("confirms privacy preservation and client-side resolution", () => {
      const criterion4 = RESOURCE_COMPLIANCE_CRITERIA.find((c) => c.criterion.includes("520(o)(1)(E)(iv)"));
      assert.ok(criterion4?.details.includes("in-memory without remote data transmission"));
    });
  });

  // ==========================================================================
  // 2. DIRECTORY INTEGRITY, HTTPS URLS & ACTIVE HELPLINES
  // ==========================================================================
  describe("Directory Entries Integrity & Verification", () => {
    it("contains all core domains and at least 15 comprehensive entries", () => {
      assert.ok(HEALTHCARE_RESOURCES.length >= 15);
      const domains = new Set(HEALTHCARE_RESOURCES.map((r) => r.domain));
      assert.strictEqual(domains.size, 6);
      assert.ok(domains.has("primary-care"));
      assert.ok(domains.has("prescription-assistance"));
      assert.ok(domains.has("maternal-perinatal"));
      assert.ok(domains.has("chronic-specialty"));
      assert.ok(domains.has("toxicology-poison"));
      assert.ok(domains.has("crisis-mental-health"));
    });

    it("ensures every resource URL is an official, verified HTTPS web address", () => {
      for (const res of HEALTHCARE_RESOURCES) {
        assert.ok(
          res.url.startsWith("https://"),
          `Resource ${res.id} has invalid URL: ${res.url}. Must start with https://`,
        );
      }
    });

    it("ensures all phone numbers follow valid US phone or 3-digit crisis formats", () => {
      const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$|^988$/;
      for (const res of HEALTHCARE_RESOURCES) {
        if (res.phone) {
          assert.ok(
            phoneRegex.test(res.phone),
            `Resource ${res.id} has invalid phone format: ${res.phone}`,
          );
        }
      }
    });

    it("verifies key national cornerstone entries are present with accurate data", () => {
      // HRSA FQHC
      const fqhc = RESOURCE_BY_ID["hrsa-fqhc"];
      assert.ok(fqhc);
      assert.strictEqual(fqhc.url, "https://findahealthcenter.hrsa.gov/");
      assert.strictEqual(fqhc.cost, "sliding-scale");

      // MotherToBaby
      const m2b = RESOURCE_BY_ID["mothertobaby"];
      assert.ok(m2b);
      assert.strictEqual(m2b.url, "https://mothertobaby.org/");
      assert.strictEqual(m2b.phone, "1-866-626-6847");
      assert.strictEqual(m2b.sms, "855-999-3525");

      // Poison Help
      const poison = RESOURCE_BY_ID["poison-help"];
      assert.ok(poison);
      assert.strictEqual(poison.url, "https://www.poisonhelp.org/");
      assert.strictEqual(poison.phone, "1-800-222-1222");

      // 988 Lifeline
      const lifeline = RESOURCE_BY_ID["lifeline-988"];
      assert.ok(lifeline);
      assert.strictEqual(lifeline.url, "https://988lifeline.org/");
      assert.strictEqual(lifeline.phone, "988");

      // Never Use Alone
      const nua = RESOURCE_BY_ID["never-use-alone"];
      assert.ok(nua);
      assert.strictEqual(nua.url, "https://neverusealone.com/");
      assert.strictEqual(nua.phone, "1-800-484-3731");

      // NeedyMeds
      const needymeds = RESOURCE_BY_ID["needymeds"];
      assert.ok(needymeds);
      assert.strictEqual(needymeds.url, "https://www.needymeds.org/");
      assert.strictEqual(needymeds.phone, "1-800-503-6897");

      // PAF Co-Pay Relief
      const copay = RESOURCE_BY_ID["copay-relief"];
      assert.ok(copay);
      assert.strictEqual(copay.url, "https://copays.org/");
      assert.strictEqual(copay.phone, "1-866-512-3861");

      // UNOS
      const unos = RESOURCE_BY_ID["unos"];
      assert.ok(unos);
      assert.strictEqual(unos.url, "https://transplantliving.org/");
      assert.strictEqual(unos.phone, "1-888-894-6361");

      // NKF Cares
      const nkf = RESOURCE_BY_ID["nkf-cares"];
      assert.ok(nkf);
      assert.strictEqual(nkf.url, "https://www.kidney.org/");
      assert.strictEqual(nkf.phone, "1-855-653-2273");

      // TLC-MAMA
      const tlc = RESOURCE_BY_ID["tlc-mama"];
      assert.ok(tlc);
      assert.strictEqual(tlc.url, "https://mchb.hrsa.gov/national-maternal-mental-health-hotline");
      assert.strictEqual(tlc.phone, "1-833-852-6262");
    });

    it("verifies descriptions are non-prescriptive and non-diagnostic", () => {
      const prescriptiveWords = ["you must take", "administer immediately to cure", "guaranteed treatment"];
      for (const res of HEALTHCARE_RESOURCES) {
        for (const badWord of prescriptiveWords) {
          assert.ok(
            !res.description.toLowerCase().includes(badWord),
            `Resource ${res.id} contains prescriptive word: ${badWord}`,
          );
          assert.ok(
            !res.clinicalUtility.toLowerCase().includes(badWord),
            `Resource ${res.id} contains prescriptive word in clinicalUtility: ${badWord}`,
          );
        }
      }
    });
  });

  // ==========================================================================
  // 3. CONTEXT-AWARE RECOMMENDER MATCHING
  // ==========================================================================
  describe("healthcareResourcesFor Context Matching", () => {
    it("matches Maternal-Fetal / Teratogen resources for pregnant host and teratogenic drugs", () => {
      const host: HostContext = { ...DEFAULT_HOST, preg: "pregnant" };
      const report = healthcareResourcesFor(["valproate"], host);

      assert.ok(report.activeContextFlags.isPregnantOrLactating);
      assert.ok(report.hasUrgentMatch);
      const m2bRec = report.recommendations.find((r) => r.resource.id === "mothertobaby");
      assert.ok(m2bRec, "Should recommend MotherToBaby");
      assert.strictEqual(m2bRec?.priority, "urgent");
      assert.ok(m2bRec?.relevantDrugIds.includes("valproate"));

      const tlcRec = report.recommendations.find((r) => r.resource.id === "tlc-mama");
      assert.ok(tlcRec, "Should recommend TLC-MAMA");

      const psiRec = report.recommendations.find((r) => r.resource.id === "psi");
      assert.ok(psiRec, "Should recommend PSI");
    });

    it("matches MotherToBaby even with non-pregnant host when known teratogen is on tray", () => {
      const host: HostContext = { ...DEFAULT_HOST, preg: "off" };
      const report = healthcareResourcesFor(["isotretinoin"], host);

      const m2bRec = report.recommendations.find((r) => r.resource.id === "mothertobaby");
      assert.ok(m2bRec, "Should recommend MotherToBaby for teratogenic drug isotretinoin");
      assert.ok(m2bRec?.relevantDrugIds.includes("isotretinoin"));
    });

    it("matches Cardiovascular and Heart Failure resources for cardiac regimens", () => {
      const report = healthcareResourcesFor(["amiodarone", "sacubitril-valsartan", "carvedilol"]);

      assert.ok(report.activeContextFlags.hasCardiacDrugs);
      const ahaRec = report.recommendations.find((r) => r.resource.id === "aha-support");
      assert.ok(ahaRec, "Should recommend AHA Support Network");
      assert.strictEqual(ahaRec?.priority, "high");

      const copayRec = report.recommendations.find((r) => r.resource.id === "copay-relief");
      assert.ok(copayRec, "Should recommend Co-Pay Relief");
    });

    it("matches Nephrology, Dialysis, and NKF resources for CKD host", () => {
      const host: HostContext = { ...DEFAULT_HOST, kidney: "ckd" };
      const report = healthcareResourcesFor(["furosemide", "patiromer"], host);

      assert.ok(report.activeContextFlags.hasCkd);
      const nkfRec = report.recommendations.find((r) => r.resource.id === "nkf-cares");
      assert.ok(nkfRec, "Should recommend NKF Cares");
      assert.strictEqual(nkfRec?.priority, "high");

      const akfRec = report.recommendations.find((r) => r.resource.id === "akf");
      assert.ok(akfRec, "Should recommend American Kidney Fund");
    });

    it("matches Solid Organ Transplant resources for immunosuppression regimens", () => {
      const report = healthcareResourcesFor(["tacrolimus", "mycophenolate", "prednisone"]);

      assert.ok(report.activeContextFlags.hasTransplantDrugs);
      const unosRec = report.recommendations.find((r) => r.resource.id === "unos");
      assert.ok(unosRec, "Should recommend UNOS Transplant Living");
      assert.strictEqual(unosRec?.priority, "high");

      const nldacRec = report.recommendations.find((r) => r.resource.id === "nldac");
      assert.ok(nldacRec, "Should recommend Living Donor Assistance Center");

      const needymedsRec = report.recommendations.find((r) => r.resource.id === "needymeds");
      assert.ok(needymedsRec, "Should recommend NeedyMeds PAP");

      const akfRec = report.recommendations.find((r) => r.resource.id === "akf");
      assert.ok(akfRec, "Should recommend AKF co-pay assistance");
    });

    it("matches Specialty Oncology & High-Cost Biologics resources with urgent copay relief", () => {
      const report = healthcareResourcesFor(["pembrolizumab", "methotrexate"]);

      assert.ok(report.activeContextFlags.hasHighCostBiologics);
      const copayRec = report.recommendations.find((r) => r.resource.id === "copay-relief");
      assert.ok(copayRec, "Should recommend Co-Pay Relief Program");
      assert.strictEqual(copayRec?.priority, "urgent");

      const matRec = report.recommendations.find((r) => r.resource.id === "mat");
      assert.ok(matRec, "Should recommend PhRMA MAT");

      const hrsa340bRec = report.recommendations.find((r) => r.resource.id === "hrsa-340b");
      assert.ok(hrsa340bRec, "Should recommend 340B pricing covered entities");
    });

    it("matches Opioid, Sedative, Poison Help and Never Use Alone resources for opioid polypharmacy", () => {
      const report = healthcareResourcesFor(["fentanyl", "alprazolam"]);

      assert.ok(report.activeContextFlags.hasOpioidsOrSedatives);
      assert.ok(report.hasUrgentMatch);

      const poisonRec = report.recommendations.find((r) => r.resource.id === "poison-help");
      assert.ok(poisonRec, "Should recommend Poison Help 1-800-222-1222");
      assert.strictEqual(poisonRec?.priority, "urgent");

      const nuaRec = report.recommendations.find((r) => r.resource.id === "never-use-alone");
      assert.ok(nuaRec, "Should recommend Never Use Alone");
      assert.strictEqual(nuaRec?.priority, "urgent");

      const lifelineRec = report.recommendations.find((r) => r.resource.id === "lifeline-988");
      assert.ok(lifelineRec, "Should recommend 988 Lifeline");

      const samhsaRec = report.recommendations.find((r) => r.resource.id === "samhsa-helpline");
      assert.ok(samhsaRec, "Should recommend SAMHSA Helpline");
    });

    it("matches Poison Help for acute toxicology risk drugs", () => {
      const report = healthcareResourcesFor(["acetaminophen", "colchicine"]);

      assert.ok(report.activeContextFlags.hasToxicologyRisk);
      const poisonRec = report.recommendations.find((r) => r.resource.id === "poison-help");
      assert.ok(poisonRec, "Should recommend Poison Help");
      assert.strictEqual(poisonRec?.priority, "urgent");
    });

    it("matches Diabetes and Insulin resources for insulin therapies", () => {
      const report = healthcareResourcesFor(["insulin-glargine", "semaglutide"]);

      assert.ok(report.activeContextFlags.hasDiabetesDrugs);
      const adaRec = report.recommendations.find((r) => r.resource.id === "ada");
      assert.ok(adaRec, "Should recommend ADA Insulin Help");
      assert.strictEqual(adaRec?.priority, "high");
    });

    it("always includes primary care and safety-net baselines (HRSA FQHC and NAFC)", () => {
      const report = healthcareResourcesFor([]);
      const fqhcRec = report.recommendations.find((r) => r.resource.id === "hrsa-fqhc");
      const nafcRec = report.recommendations.find((r) => r.resource.id === "nafc");
      const rxassistRec = report.recommendations.find((r) => r.resource.id === "rxassist");

      assert.ok(fqhcRec, "Baseline should include HRSA FQHC");
      assert.ok(nafcRec, "Baseline should include NAFC");
      assert.ok(rxassistRec, "Baseline should include RxAssist");
    });
  });

  // ==========================================================================
  // 4. FILTERING UTILITY TESTS
  // ==========================================================================
  describe("filterResources Keyword & Domain Filtering", () => {
    it("returns all resources when query is empty and filter is 'all'", () => {
      const res = filterResources("", "all");
      assert.strictEqual(res.length, HEALTHCARE_RESOURCES.length);
    });

    it("filters correctly by domain pill 'pap'", () => {
      const res = filterResources("", "pap");
      assert.ok(res.length > 0);
      assert.ok(res.every((r) => r.domain === "prescription-assistance"));
    });

    it("filters correctly by domain pill 'fqhc'", () => {
      const res = filterResources("", "fqhc");
      assert.ok(res.length > 0);
      assert.ok(res.every((r) => r.domain === "primary-care"));
    });

    it("filters correctly by domain pill 'pregnancy'", () => {
      const res = filterResources("", "pregnancy");
      assert.ok(res.length > 0);
      assert.ok(res.every((r) => r.domain === "maternal-perinatal"));
    });

    it("filters correctly by keyword query across names, descriptions, and tags", () => {
      const dialResults = filterResources("dialysis");
      assert.ok(dialResults.length > 0);
      assert.ok(dialResults.some((r) => r.id === "akf"));

      const poisonResults = filterResources("1-800-222-1222");
      assert.strictEqual(poisonResults.length, 1);
      assert.strictEqual(poisonResults[0].id, "poison-help");
    });
  });

  // ==========================================================================
  // 5. PRINTABLE / COPYABLE CLINICAL VISIT HANDOUT GENERATOR
  // ==========================================================================
  describe("generateResourceHandout Clinical Summary Generation", () => {
    it("generates structured text with regulatory notices and 24/7 helplines", () => {
      const handout = generateResourceHandout();

      assert.ok(handout.includes("PATIENT & CLINICAL HEALTHCARE RESOURCE DIRECTORY"));
      assert.ok(handout.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(handout.includes("NON-DEVICE CLINICAL DECISION SUPPORT NOTICE"));
      assert.ok(handout.includes("988 Suicide & Crisis Lifeline"));
      assert.ok(handout.includes("America's Poison Centers (Poison Help): 1-800-222-1222"));
      assert.ok(handout.includes("Never Use Alone"));
      assert.ok(handout.includes("HRSA Health Center Finder"));
      assert.ok(handout.includes("https://"));
    });

    it("includes local area ZIP reference cleanly without data transmission", () => {
      const handout = generateResourceHandout({ zip: "98104" });
      assert.ok(handout.includes("Local Area Reference ZIP: 98104"));
      assert.ok(handout.includes("Location resolution is conducted entirely client-side"));
    });

    it("includes matched regimen context without prescriptive dosing commands", () => {
      const handout = generateResourceHandout({ drugIds: ["tacrolimus", "mycophenolate"] });
      assert.ok(handout.includes("Regimen Reference Context:"));
      assert.ok(handout.includes("Tacrolimus"));
      assert.ok(handout.includes("Mycophenolate"));
      assert.ok(handout.includes("UNOS"));

      // Verify non-prescriptive posture
      assert.ok(!handout.includes("take this medication"));
      assert.ok(!handout.includes("prescribe at once"));
    });

    it("filters included resources when selectedCategories option is provided", () => {
      const handout = generateResourceHandout({ selectedCategories: ["maternal-perinatal"] });
      assert.ok(handout.includes("MotherToBaby"));
      assert.ok(!handout.includes("United Network for Organ Sharing (UNOS Organ Center & Patient Services)"));
    });

    it("supports clinicHeader, patientName, excludedCategories, and personalized assistance sections", () => {
      const handout = generateResourceHandout({
        clinicHeader: "Metro Community Health Center",
        patientName: "PT-4921",
        customNotes: "Follow up with clinical social work for co-pay enrollment.",
        drugIds: ["adalimumab"],
        host: { ...DEFAULT_HOST, age: "geriatric" },
        excludedCategories: ["maternal-perinatal"],
      });

      assert.ok(handout.includes("CLINICAL FACILITY / HEALTH SYSTEM: Metro Community Health Center"));
      assert.ok(handout.includes("PATIENT IDENTIFIER / REFERENCE: PT-4921"));
      assert.ok(handout.includes("CLINICAL NAVIGATION NOTES:"));
      assert.ok(handout.includes("Follow up with clinical social work"));
      assert.ok(handout.includes("AbbVie Assist / Humira Complete"));
      assert.ok(handout.includes("MEDICARE EXTRA HELP (LIS) & STATE PHARMACEUTICAL ASSISTANCE (SPAP)"));
      assert.ok(!handout.includes("MotherToBaby"));
    });
  });

  // ==========================================================================
  // 6. EXPANDED SAFETY-NET DIRECTORIES & MANUFACTURER PAP TESTS
  // ==========================================================================
  describe("Expanded Safety-Net Resources & Manufacturer PAPs", () => {
    it("verifies all new safety-net directory listings have valid HTTPS URLs and phone formats", () => {
      const expectedIds = [
        "ryan-white-adap",
        "lls-copay",
        "cancer-support-community",
        "pan-foundation",
        "healthwell-foundation",
        "nord-pap",
        "fda-expanded-access",
        "medicare-extra-help",
        "spap-directory",
        "next-distro",
        "remedichain",
        "medicaid-nemt",
        "fimc-nutrition",
        "pap-humira-complete",
        "pap-dupixent-myway",
        "pap-bms-eliquis",
        "pap-jnj-xarelto",
        "pap-boehringer-jardiance",
        "pap-novocare-diabetes",
        "pap-novartis-entresto",
        "pap-merck-keytruda",
        "pap-janssen-stelara",
      ];

      const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$|^988$/;

      for (const id of expectedIds) {
        const res = RESOURCE_BY_ID[id];
        assert.ok(res, `Expected resource ${id} to exist in directory`);
        assert.ok(res.url.startsWith("https://"), `Resource ${id} must have HTTPS URL`);
        if (res.phone) {
          assert.ok(phoneRegex.test(res.phone), `Resource ${id} phone format invalid: ${res.phone}`);
        }
      }
    });

    it("verifies oncology matching returns LLS, PAN, HealthWell, CSC, and RemediChain", () => {
      const report = healthcareResourcesFor(["pembrolizumab"]);

      assert.ok(report.activeContextFlags.hasOncologyDrugs);
      const recIds = report.recommendations.map((r) => r.resource.id);

      assert.ok(recIds.includes("lls-copay"), "Should recommend LLS Co-Pay Program");
      assert.ok(recIds.includes("pan-foundation"), "Should recommend PAN Foundation");
      assert.ok(recIds.includes("healthwell-foundation"), "Should recommend HealthWell Foundation");
      assert.ok(recIds.includes("cancer-support-community"), "Should recommend Cancer Support Community");
      assert.ok(recIds.includes("remedichain"), "Should recommend RemediChain");

      const llsRec = report.recommendations.find((r) => r.resource.id === "lls-copay");
      assert.strictEqual(llsRec?.priority, "urgent");
    });

    it("verifies HIV matching returns Ryan White ADAP directory with urgent priority", () => {
      const report = healthcareResourcesFor(["dolutegravir", "ritonavir"]);

      assert.ok(report.activeContextFlags.hasHivOrAntiviralDrugs);
      const ryanWhiteRec = report.recommendations.find((r) => r.resource.id === "ryan-white-adap");
      assert.ok(ryanWhiteRec, "Should recommend Ryan White HIV/AIDS Program & ADAP");
      assert.strictEqual(ryanWhiteRec?.priority, "urgent");
      assert.ok(ryanWhiteRec?.relevantDrugIds.includes("dolutegravir"));
      assert.ok(ryanWhiteRec?.relevantDrugIds.includes("ritonavir"));
    });

    it("verifies manufacturer PAP search works accurately across brand and generic names", () => {
      assert.ok(MANUFACTURER_PAP_DIRECTORY.length >= 8);

      const humiraMatches = searchManufacturerPAPs("Humira");
      assert.ok(humiraMatches.some((p) => p.id === "pap-humira-complete"));

      const adalimumabMatches = searchManufacturerPAPs("adalimumab");
      assert.ok(adalimumabMatches.some((p) => p.id === "pap-humira-complete"));

      const jardianceMatches = searchManufacturerPAPs("Jardiance");
      assert.ok(jardianceMatches.some((p) => p.id === "pap-boehringer-jardiance"));

      const ozempicMatches = searchManufacturerPAPs("Ozempic");
      assert.ok(ozempicMatches.some((p) => p.id === "pap-novocare-diabetes"));

      const entrestoMatches = searchManufacturerPAPs("Entresto");
      assert.ok(entrestoMatches.some((p) => p.id === "pap-novartis-entresto"));

      const keytrudaMatches = searchManufacturerPAPs("Keytruda");
      assert.ok(keytrudaMatches.some((p) => p.id === "pap-merck-keytruda"));

      const stelaraMatches = searchManufacturerPAPs("Stelara");
      assert.ok(stelaraMatches.some((p) => p.id === "pap-janssen-stelara"));

      const eliquisMatches = searchManufacturerPAPs("Eliquis");
      assert.ok(eliquisMatches.some((p) => p.id === "pap-bms-eliquis"));

      const xareltoMatches = searchManufacturerPAPs("Xarelto");
      assert.ok(xareltoMatches.some((p) => p.id === "pap-jnj-xarelto"));

      const dupixentMatches = searchManufacturerPAPs("Dupixent");
      assert.ok(dupixentMatches.some((p) => p.id === "pap-dupixent-myway"));
    });

    it("matches specific high-cost drugs on tray to manufacturer PAP recommendations", () => {
      const report = healthcareResourcesFor(["adalimumab", "empagliflozin", "sacubitril-valsartan"]);

      const recIds = report.recommendations.map((r) => r.resource.id);
      assert.ok(recIds.includes("pap-humira-complete"), "Should recommend Humira Complete");
      assert.ok(recIds.includes("pap-boehringer-jardiance"), "Should recommend BI Cares Jardiance");
      assert.ok(recIds.includes("pap-novartis-entresto"), "Should recommend Novartis Entresto PAP");
    });

    it("verifies Medicare Extra Help and SPAP Directory appear for geriatric host context", () => {
      const host: HostContext = { ...DEFAULT_HOST, age: "geriatric" };
      const report = healthcareResourcesFor(["atorvastatin", "metformin"], host);

      assert.ok(report.activeContextFlags.hasGeriatricHost);
      const extraHelpRec = report.recommendations.find((r) => r.resource.id === "medicare-extra-help");
      assert.ok(extraHelpRec, "Should recommend Medicare Part D Extra Help / LIS");
      assert.strictEqual(extraHelpRec?.priority, "urgent");

      const spapRec = report.recommendations.find((r) => r.resource.id === "spap-directory");
      assert.ok(spapRec, "Should recommend State SPAP Directory");
      assert.strictEqual(spapRec?.priority, "high");
    });

    it("verifies State Pharmaceutical Assistance Programs (SPAPs) directory across key states", () => {
      assert.ok(STATE_SPAP_DIRECTORY.length >= 5);

      const ny = getStateSPAP("NY");
      assert.ok(ny);
      assert.strictEqual(ny.stateCode, "NY");
      assert.ok(ny.programName.includes("EPIC"));
      assert.strictEqual(ny.phone, "1-800-332-3742");

      const pa = getStateSPAP("PA");
      assert.ok(pa);
      assert.ok(pa.programName.includes("PACE"));

      const nj = getStateSPAP("NJ");
      assert.ok(nj);
      assert.ok(nj.programName.includes("PAAD"));

      const tx = getStateSPAP("TX");
      assert.ok(tx);
      assert.ok(tx.programName.includes("Texas"));

      const ca = getStateSPAP("CA");
      assert.ok(ca);
      assert.ok(ca.stateName === "California");
    });

    it("filters resources correctly by new filter pills", () => {
      // Oncology pill
      const oncolRes = filterResources("", "oncology");
      assert.ok(oncolRes.length > 0);
      assert.ok(oncolRes.some((r) => r.id === "lls-copay"));
      assert.ok(oncolRes.some((r) => r.id === "pan-foundation"));

      // HIV pill
      const hivRes = filterResources("", "hiv-adap");
      assert.ok(hivRes.length > 0);
      assert.ok(hivRes.some((r) => r.id === "ryan-white-adap"));

      // Rare disease pill
      const rareRes = filterResources("", "rare-access");
      assert.ok(rareRes.length > 0);
      assert.ok(rareRes.some((r) => r.id === "nord-pap"));
      assert.ok(rareRes.some((r) => r.id === "fda-expanded-access"));

      // Senior Extra Help pill
      const seniorRes = filterResources("", "senior-extra-help");
      assert.ok(seniorRes.length > 0);
      assert.ok(seniorRes.some((r) => r.id === "medicare-extra-help"));
      assert.ok(seniorRes.some((r) => r.id === "spap-directory"));

      // Harm reduction pill
      const harmRes = filterResources("", "harm-reduction");
      assert.ok(harmRes.length > 0);
      assert.ok(harmRes.some((r) => r.id === "next-distro"));
      assert.ok(harmRes.some((r) => r.id === "never-use-alone"));
    });
  });
});
