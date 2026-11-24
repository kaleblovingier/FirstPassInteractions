import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUG_BY_ID } from "./catalog";
import { hasTdm, TDM, TDM_IDS, tdmFor, tdmHostNote, tdmOnDesk } from "./tdm";
import { DEFAULT_HOST, type HostContext } from "./types";
import { findDoses } from "../guards/dose-rule";

function hostWith(patch: Partial<HostContext>): HostContext {
  return {
    ...DEFAULT_HOST,
    ...patch,
    phenotypes: { ...DEFAULT_HOST.phenotypes, ...(patch.phenotypes ?? {}) },
  };
}

test("TDM covers at least 42 high-alert drugs, every key exists in DRUG_BY_ID with complete fields and zero dose matches", () => {
  assert.ok(TDM_IDS.length >= 42, `expected at least 42 TDM protocols, got ${TDM_IDS.length}`);
  assert.equal(TDM_IDS.length, Object.keys(TDM).length);
  assert.equal(Object.keys(TDM).length, 42);

  for (const id of TDM_IDS) {
    assert.ok(DRUG_BY_ID[id], `${id} must exist in DRUG_BY_ID`);
    const card = TDM[id];
    assert.ok(card.analyte.trim().length > 0, `${id} needs analyte`);
    assert.ok(card.trough.trim().length > 0, `${id} needs trough`);
    assert.ok(card.toxic.trim().length > 0, `${id} needs toxic`);
    assert.ok(card.draw.trim().length > 0, `${id} needs draw`);
    assert.ok(card.pearl.trim().length > 0, `${id} needs pearl`);
    assert.equal(typeof card.unit, "string");
  }

  const hits = findDoses(readFileSync("src/lib/drugs/tdm.ts", "utf8"));
  assert.deepEqual(hits, []);
});

test("hasTdm, tdmFor, and tdmOnDesk resolve existing and newly added TDM drugs", () => {
  const expectedIds = [
    "vancomycin",
    "gentamicin",
    "tobramycin",
    "amikacin",
    "voriconazole",
    "posaconazole",
    "itraconazole",
    "everolimus",
    "mycophenolate-mofetil",
    "procainamide",
    "quinidine",
    "lidocaine",
    "olanzapine",
    "risperidone",
    "haloperidol",
    "imipramine",
    "desipramine",
    "doxepin",
    "primidone",
    "oxcarbazepine",
    "levetiracetam",
    "topiramate",
    "zonisamide",
    "imatinib",
    "linezolid",
    "lithium-orotate",
  ];

  for (const id of expectedIds) {
    assert.equal(hasTdm(id), true, `${id} should have TDM`);
    const card = tdmFor(id);
    assert.ok(card, `${id} should return a TdmCard`);
  }

  assert.equal(hasTdm("metformin"), false);
  assert.equal(tdmFor("metformin"), undefined);

  const onDesk = tdmOnDesk(["vancomycin", "metformin", "voriconazole", "procainamide", "lisinopril"]);
  assert.deepEqual(
    onDesk.map((row) => row.id),
    ["vancomycin", "voriconazole", "procainamide"],
  );
  assert.equal(onDesk[0].card.analyte, "Vancomycin");
  assert.match(onDesk[0].card.trough, /AUC24:MIC/i);
  assert.match(onDesk[2].card.analyte, /NAPA/);
});

test("Round 13 expanded TDM protocols return expected clinical monitoring metadata", () => {
  const olanzapine = tdmFor("olanzapine")!;
  assert.equal(olanzapine.unit, "ng/mL");
  assert.match(olanzapine.pearl, /CYP1A2/i);
  assert.match(olanzapine.pearl, /fluvoxamine/i);
  assert.match(olanzapine.pearl, /smoking cessation/i);

  const risperidone = tdmFor("risperidone")!;
  assert.match(risperidone.analyte, /9-hydroxyrisperidone/i);
  assert.equal(risperidone.unit, "ng/mL");
  assert.match(risperidone.pearl, /CYP2D6/i);

  const haloperidol = tdmFor("haloperidol")!;
  assert.equal(haloperidol.unit, "ng/mL");
  assert.match(haloperidol.draw, /ECG QTc/i);
  assert.match(haloperidol.pearl, /CYP2D6/i);

  const imipramine = tdmFor("imipramine")!;
  assert.match(imipramine.analyte, /desipramine/i);
  assert.match(imipramine.draw, /ECG/i);

  const desipramine = tdmFor("desipramine")!;
  assert.match(desipramine.pearl, /CYP2D6/i);
  assert.match(desipramine.draw, /ECG/i);

  const doxepin = tdmFor("doxepin")!;
  assert.match(doxepin.analyte, /nordoxepin/i);
  assert.match(doxepin.pearl, /CYP2C19/i);

  const primidone = tdmFor("primidone")!;
  assert.match(primidone.analyte, /phenobarbital/i);
  assert.equal(primidone.unit, "µg/mL");
  assert.match(primidone.trough, /5–12/);
  assert.match(primidone.trough, /15–40/);

  const oxcarbazepine = tdmFor("oxcarbazepine")!;
  assert.match(oxcarbazepine.analyte, /MHD|10-Monohydroxy/i);
  assert.match(oxcarbazepine.draw, /serum sodium/i);
  assert.match(oxcarbazepine.toxic, /hyponatremia/i);

  const levetiracetam = tdmFor("levetiracetam")!;
  assert.equal(levetiracetam.unit, "µg/mL");
  assert.match(levetiracetam.draw, /pregnancy|CKD/i);

  const topiramate = tdmFor("topiramate")!;
  assert.match(topiramate.draw, /bicarbonate/i);
  assert.match(topiramate.draw, /ammonia/i);
  assert.match(topiramate.pearl, /valproate/i);

  const zonisamide = tdmFor("zonisamide")!;
  assert.match(zonisamide.pearl, /CYP3A4/i);
  assert.match(zonisamide.draw, /63 h/i);

  const imatinib = tdmFor("imatinib")!;
  assert.equal(imatinib.unit, "ng/mL");
  assert.match(imatinib.trough, /1000/);
  assert.match(imatinib.pearl, /CYP3A4/i);

  const linezolid = tdmFor("linezolid")!;
  assert.equal(linezolid.unit, "µg/mL");
  assert.match(linezolid.toxic, /thrombocytopenia/i);
  assert.match(linezolid.toxic, /lactic acidosis/i);

  const lithiumOrotate = tdmFor("lithium-orotate")!;
  assert.equal(lithiumOrotate.unit, "mEq/L");
  assert.match(lithiumOrotate.draw, /NSAIDs|ACEi\/ARBs|thiazides/i);
  assert.match(lithiumOrotate.pearl, /OTC/i);
});

test("tdmHostNote surfaces CKD, geriatric, smoking, pregnancy, and CYP2C19/CYP2D6 phenotype guidance", () => {
  // Baseline adult normal metabolizer has no host override note
  for (const id of [
    "lithium",
    "lithium-orotate",
    "vancomycin",
    "gentamicin",
    "voriconazole",
    "procainamide",
    "olanzapine",
    "risperidone",
    "haloperidol",
    "imipramine",
    "desipramine",
    "doxepin",
    "oxcarbazepine",
    "levetiracetam",
    "topiramate",
    "linezolid",
  ]) {
    assert.equal(tdmHostNote(id, DEFAULT_HOST), null, `${id} should have no note on DEFAULT_HOST`);
  }

  // CKD notes
  assert.match(tdmHostNote("lithium", hostWith({ kidney: "ckd" })) ?? "", /renally cleared/i);
  assert.match(tdmHostNote("lithium-orotate", hostWith({ kidney: "ckd" })) ?? "", /OTC lithium orotate/i);
  assert.match(tdmHostNote("digoxin", hostWith({ kidney: "ckd" })) ?? "", /clearance falls/i);
  assert.match(tdmHostNote("vancomycin", hostWith({ kidney: "ckd" })) ?? "", /AUC24/i);
  for (const ag of ["gentamicin", "tobramycin", "amikacin"]) {
    assert.match(tdmHostNote(ag, hostWith({ kidney: "ckd" })) ?? "", /extended-interval/i);
  }
  assert.match(tdmHostNote("procainamide", hostWith({ kidney: "ckd" })) ?? "", /NAPA/i);
  assert.match(tdmHostNote("linezolid", hostWith({ kidney: "ckd" })) ?? "", /thrombocytopenia/i);
  assert.match(tdmHostNote("levetiracetam", hostWith({ kidney: "ckd" })) ?? "", /renally/i);
  assert.match(tdmHostNote("oxcarbazepine", hostWith({ kidney: "ckd" })) ?? "", /MHD/i);
  assert.match(tdmHostNote("risperidone", hostWith({ kidney: "ckd" })) ?? "", /9-hydroxyrisperidone/i);

  // Geriatric notes
  assert.match(tdmHostNote("lithium", hostWith({ age: "geriatric" })) ?? "", /Vd and GFR/i);
  assert.match(tdmHostNote("lithium-orotate", hostWith({ age: "geriatric" })) ?? "", /GFR/i);
  assert.match(tdmHostNote("vancomycin", hostWith({ age: "geriatric" })) ?? "", /GFR/i);
  assert.match(tdmHostNote("oxcarbazepine", hostWith({ age: "geriatric" })) ?? "", /hyponatremia/i);
  for (const ag of ["gentamicin", "tobramycin", "amikacin"]) {
    assert.match(tdmHostNote(ag, hostWith({ age: "geriatric" })) ?? "", /vestibular|cochlear|ototoxicity|trough/i);
  }

  // Combined CKD + geriatric on vancomycin / aminoglycosides
  assert.match(tdmHostNote("vancomycin", hostWith({ kidney: "ckd", age: "geriatric" })) ?? "", /CKD/i);
  assert.match(tdmHostNote("gentamicin", hostWith({ kidney: "ckd", age: "geriatric" })) ?? "", /CKD/i);

  // Smoking notes
  assert.match(tdmHostNote("clozapine", hostWith({ smoking: true })) ?? "", /1A2/i);
  assert.match(tdmHostNote("olanzapine", hostWith({ smoking: true })) ?? "", /CYP1A2/i);
  assert.match(tdmHostNote("theophylline", hostWith({ smoking: true })) ?? "", /1A2/i);

  // Pregnancy notes
  assert.match(tdmHostNote("phenytoin", hostWith({ preg: "pregnant" })) ?? "", /Free phenytoin/i);
  assert.match(tdmHostNote("lamotrigine", hostWith({ preg: "pregnant" })) ?? "", /clearance/i);
  assert.match(tdmHostNote("valproate", hostWith({ preg: "pregnant" })) ?? "", /avoid in pregnancy/i);
  assert.match(tdmHostNote("levetiracetam", hostWith({ preg: "pregnant" })) ?? "", /clearance/i);
  assert.match(tdmHostNote("oxcarbazepine", hostWith({ preg: "pregnant" })) ?? "", /MHD/i);
  assert.match(tdmHostNote("topiramate", hostWith({ preg: "pregnant" })) ?? "", /clearance/i);

  // CYP2C19 phenotype notes on voriconazole and TCAs
  assert.match(
    tdmHostNote("voriconazole", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2C19: "PM" } })) ?? "",
    /poor metabolizer/i,
  );
  assert.match(
    tdmHostNote("voriconazole", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2C19: "UM" } })) ?? "",
    /ultrarapid/i,
  );
  assert.equal(
    tdmHostNote("voriconazole", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2C19: "IM" } })),
    null,
  );

  // CYP2D6 phenotype notes on antipsychotics & TCAs
  assert.match(
    tdmHostNote("risperidone", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2D6: "PM" } })) ?? "",
    /CYP2D6 poor metabolizer/i,
  );
  assert.match(
    tdmHostNote("haloperidol", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2D6: "PM" } })) ?? "",
    /QTc/i,
  );
  assert.match(
    tdmHostNote("desipramine", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2D6: "PM" } })) ?? "",
    /NTI/i,
  );
  assert.match(
    tdmHostNote("imipramine", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2C19: "PM" } })) ?? "",
    /active moiety/i,
  );
  assert.match(
    tdmHostNote("doxepin", hostWith({ phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2D6: "PM" } })) ?? "",
    /nordoxepin/i,
  );
});
