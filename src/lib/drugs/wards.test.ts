import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  IV_CALCIUM,
  STATINS,
  WARD_ANTICOAGULANTS,
  AMINOGLYCOSIDES,
  LOOP_DIURETICS,
  wardsOnDesk,
  wardWanted,
  isCniAzole,
  isCarbapenemValproate,
  isVancoZosyn,
  isArniAcei,
  isCapecitabineWarfarin,
  isPenInducerWarfarin,
  isLetermovirTacro,
  isInsulinId,
  isMethyleneBlueSero,
  isCeftriaxoneCalcium,
  isKetorolacAnticoagulant,
  isDaptomycinStatin,
  isAminoglycosideLoop,
} from "./wards";

describe("wards - Inpatient Clinical Collisions", () => {
  it("verifies all new drug-class sets map to real catalog IDs", () => {
    for (const set of [IV_CALCIUM, STATINS, WARD_ANTICOAGULANTS, AMINOGLYCOSIDES, LOOP_DIURETICS]) {
      assert.ok(set.size > 0);
      for (const id of set) {
        assert.ok(DRUG_BY_ID[id], `Expected catalog entry for ${id}`);
      }
    }
    assert.equal(IV_CALCIUM.has("calcium"), false);
    assert.equal(STATINS.has("ezetimibe"), false);
  });

  it("detects Calcineurin Inhibitor × Azole Antifungal collision as major/danger", () => {
    assert.equal(isCniAzole("tacrolimus", "voriconazole"), true);
    assert.equal(isCniAzole("posaconazole", "tacrolimus"), true);
    assert.equal(isCniAzole("cyclosporine", "fluconazole"), true);
    assert.equal(isCniAzole("tacrolimus", "amoxicillin"), false);

    const hits = wardsOnDesk(["tacrolimus", "voriconazole"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "cni-azole");
    assert.equal(hit.severity, "major");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /3A4 and P-gp.*tacrolimus.*troughs.*nephrotoxicity/i);
    assert.match(hit.source, /Prograf.*Vfend.*KDIGO/i);
  });

  it("detects carbapenem × valproate as contraindicated", () => {
    assert.equal(isCarbapenemValproate("meropenem", "valproate"), true);
    const hits = wardsOnDesk(["meropenem", "valproate"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "carbapenem-vpa");
    assert.equal(hits[0].severity, "contraindicated");
  });

  it("detects vancomycin × piperacillin-tazobactam as major AKI risk", () => {
    assert.equal(isVancoZosyn("vancomycin", "piperacillin-tazobactam"), true);
    const hits = wardsOnDesk(["vancomycin", "piperacillin-tazobactam"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "vanco-zosyn");
    assert.equal(hits[0].severity, "major");
  });

  it("detects ARNI × ACEI as contraindicated angioedema hazard", () => {
    assert.equal(isArniAcei("sacubitril-valsartan", "lisinopril"), true);
    const hits = wardsOnDesk(["sacubitril-valsartan", "lisinopril"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "arni-acei");
    assert.equal(hits[0].severity, "contraindicated");
  });

  it("detects fluoropyrimidine × warfarin as major/danger INR rise", () => {
    assert.equal(isCapecitabineWarfarin("capecitabine", "warfarin"), true);
    assert.equal(isCapecitabineWarfarin("warfarin", "fluorouracil"), true);
    assert.equal(isCapecitabineWarfarin("capecitabine", "apixaban"), false);

    const hits = wardsOnDesk(["capecitabine", "warfarin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "capecitabine-warfarin");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
  });

  it("detects nafcillin / dicloxacillin × warfarin as major/warn INR fall", () => {
    assert.equal(isPenInducerWarfarin("nafcillin", "warfarin"), true);
    assert.equal(isPenInducerWarfarin("warfarin", "dicloxacillin"), true);
    assert.equal(isPenInducerWarfarin("cefazolin", "warfarin"), false);

    const hits = wardsOnDesk(["nafcillin", "warfarin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "pen-inducer-warfarin");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "warn");
  });

  it("detects letermovir × tacrolimus as major/warn", () => {
    assert.equal(isLetermovirTacro("letermovir", "tacrolimus"), true);
    assert.equal(isLetermovirTacro("tacrolimus", "letermovir"), true);
    assert.equal(isLetermovirTacro("letermovir", "cyclosporine"), false);

    const hits = wardsOnDesk(["letermovir", "tacrolimus"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "letermovir-tacro");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "warn");
  });

  it("detects linezolid × serotonergic agent as contraindicated/danger", () => {
    const hits = wardsOnDesk(["linezolid", "sertraline"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "linezolid-sero");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.deepEqual(wardsOnDesk(["linezolid", "amlodipine"]), []);
  });

  it("detects GLP-1/GIP agonist × insulin as moderate/warn", () => {
    assert.equal(isInsulinId("insulin-glargine"), true);
    assert.equal(isInsulinId("insulin-lispro"), true);
    assert.equal(isInsulinId("metformin"), false);

    const hits = wardsOnDesk(["semaglutide", "insulin-glargine"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "glp-insulin");
    assert.equal(hits[0].severity, "moderate");
    assert.equal(hits[0].tone, "warn");
    assert.deepEqual(wardsOnDesk(["semaglutide", "metformin"]), []);
  });

  it("detects methylene blue × serotonergic/MAOI agent as contraindicated/danger", () => {
    assert.equal(isMethyleneBlueSero("methylene-blue", "fluoxetine"), true);
    assert.equal(isMethyleneBlueSero("sertraline", "methylene-blue"), true);
    assert.equal(isMethyleneBlueSero("methylene-blue", "venlafaxine"), true);
    assert.equal(isMethyleneBlueSero("methylene-blue", "tramadol"), true);
    assert.equal(isMethyleneBlueSero("methylene-blue", "phenelzine"), true);
    assert.equal(isMethyleneBlueSero("methylene-blue", "methylene-blue"), false);
    assert.equal(isMethyleneBlueSero("methylene-blue", "amlodipine"), false);
    assert.equal(isMethyleneBlueSero("fluoxetine", "sertraline"), false);

    const hits = wardsOnDesk(["methylene-blue", "fluoxetine"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "methylene-blue-sero");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].clinical, /MAO-A/i);
    assert.match(hits[0].source, /Provayblue/i);

    assert.equal(wardsOnDesk(["methylene-blue", "amlodipine"]).length, 0);
    assert.equal(wardsOnDesk(["methylene-blue", "methylene-blue"]).length, 0);
  });

  it("detects ceftriaxone × IV calcium precipitation while excluding oral calcium", () => {
    assert.equal(isCeftriaxoneCalcium("ceftriaxone", "calcium-gluconate"), true);
    assert.equal(isCeftriaxoneCalcium("calcium-chloride", "ceftriaxone"), true);
    assert.equal(isCeftriaxoneCalcium("ceftriaxone", "calcium-gluconate-iv"), true);
    assert.equal(isCeftriaxoneCalcium("calcium", "ceftriaxone"), false);
    assert.equal(isCeftriaxoneCalcium("ceftriaxone", "calcium-acetate"), false);

    const hits = wardsOnDesk(["ceftriaxone", "calcium-gluconate"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "ceftriaxone-calcium");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].clinical, /precipitates/i);
    assert.match(hits[0].source, /Rocephin/i);

    assert.equal(wardsOnDesk(["ceftriaxone", "calcium"]).length, 0);
  });

  it("detects ketorolac × anticoagulant as contraindicated/danger", () => {
    for (const ac of ["heparin", "enoxaparin", "dalteparin", "fondaparinux", "warfarin", "apixaban", "rivaroxaban", "dabigatran", "edoxaban", "argatroban", "bivalirudin"]) {
      assert.equal(isKetorolacAnticoagulant("ketorolac", ac), true, `ketorolac + ${ac}`);
      assert.equal(isKetorolacAnticoagulant(ac, "ketorolac"), true, `${ac} + ketorolac`);
    }
    assert.equal(isKetorolacAnticoagulant("ibuprofen", "heparin"), false);
    assert.equal(isKetorolacAnticoagulant("ketorolac", "acetaminophen"), false);

    const hits = wardsOnDesk(["ketorolac", "enoxaparin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "ketorolac-anticoagulant");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].clinical, /COX-1/i);
    assert.match(hits[0].source, /Toradol/i);

    assert.equal(wardsOnDesk(["ketorolac", "acetaminophen"]).length, 0);
  });

  it("detects daptomycin × statin myopathy while excluding ezetimibe", () => {
    for (const statin of ["simvastatin", "atorvastatin", "rosuvastatin", "lovastatin", "pravastatin", "fluvastatin", "pitavastatin", "atorvastatin-amlodipine"]) {
      assert.equal(isDaptomycinStatin("daptomycin", statin), true, `daptomycin + ${statin}`);
      assert.equal(isDaptomycinStatin(statin, "daptomycin"), true, `${statin} + daptomycin`);
    }
    assert.equal(isDaptomycinStatin("daptomycin", "ezetimibe"), false);
    assert.equal(isDaptomycinStatin("ezetimibe", "daptomycin"), false);

    const hits = wardsOnDesk(["daptomycin", "atorvastatin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "daptomycin-statin");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].clinical, /CPK/i);
    assert.match(hits[0].source, /Cubicin/i);

    assert.equal(wardsOnDesk(["daptomycin", "ezetimibe"]).length, 0);
  });

  it("detects aminoglycoside × loop diuretic ototoxicity and nephrotoxicity", () => {
    for (const ag of ["gentamicin", "tobramycin", "amikacin"]) {
      for (const loop of ["furosemide", "bumetanide", "torsemide", "ethacrynic-acid"]) {
        assert.equal(isAminoglycosideLoop(ag, loop), true, `${ag} + ${loop}`);
        assert.equal(isAminoglycosideLoop(loop, ag), true, `${loop} + ${ag}`);
      }
    }
    assert.equal(isAminoglycosideLoop("gentamicin", "hctz"), false);
    assert.equal(isAminoglycosideLoop("gentamicin-ophthalmic", "furosemide"), false);

    const hits = wardsOnDesk(["gentamicin", "furosemide"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "aminoglycoside-loop");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].clinical, /NKCC1\/NKCC2/i);
    assert.match(hits[0].clinical, /cochlear|vestibular/i);

    assert.equal(wardsOnDesk(["gentamicin", "hctz"]).length, 0);
  });

  it("wardWanted reflects whether any ward collision exists on the desk", () => {
    assert.equal(wardWanted(["ceftriaxone", "calcium-chloride"]), true);
    assert.equal(wardWanted(["ceftriaxone", "calcium"]), false);
  });
});

