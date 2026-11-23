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

test("TDM covers 28 high-alert drugs, every key exists in DRUG_BY_ID with complete fields and zero dose matches", () => {
  assert.equal(TDM_IDS.length, 28);
  assert.equal(Object.keys(TDM).length, 28);

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
  const expectedNewIds = [
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
  ];

  for (const id of expectedNewIds) {
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

test("tdmHostNote surfaces CKD, geriatric, smoking, pregnancy, and CYP2C19 phenotype guidance", () => {
  // Baseline adult normal metabolizer has no host override note
  for (const id of ["lithium", "vancomycin", "gentamicin", "voriconazole", "procainamide"]) {
    assert.equal(tdmHostNote(id, DEFAULT_HOST), null, `${id} should have no note on DEFAULT_HOST`);
  }

  // CKD notes
  assert.match(tdmHostNote("lithium", hostWith({ kidney: "ckd" })) ?? "", /renally cleared/i);
  assert.match(tdmHostNote("digoxin", hostWith({ kidney: "ckd" })) ?? "", /clearance falls/i);
  assert.match(tdmHostNote("vancomycin", hostWith({ kidney: "ckd" })) ?? "", /AUC24/i);
  for (const ag of ["gentamicin", "tobramycin", "amikacin"]) {
    assert.match(tdmHostNote(ag, hostWith({ kidney: "ckd" })) ?? "", /extended-interval/i);
  }
  assert.match(tdmHostNote("procainamide", hostWith({ kidney: "ckd" })) ?? "", /NAPA/i);

  // Geriatric notes
  assert.match(tdmHostNote("lithium", hostWith({ age: "geriatric" })) ?? "", /Vd and GFR/i);
  assert.match(tdmHostNote("vancomycin", hostWith({ age: "geriatric" })) ?? "", /GFR/i);
  for (const ag of ["gentamicin", "tobramycin", "amikacin"]) {
    assert.match(tdmHostNote(ag, hostWith({ age: "geriatric" })) ?? "", /vestibular|cochlear|ototoxicity|trough/i);
  }

  // Combined CKD + geriatric on vancomycin / aminoglycosides
  assert.match(tdmHostNote("vancomycin", hostWith({ kidney: "ckd", age: "geriatric" })) ?? "", /CKD/i);
  assert.match(tdmHostNote("gentamicin", hostWith({ kidney: "ckd", age: "geriatric" })) ?? "", /CKD/i);

  // Smoking notes
  assert.match(tdmHostNote("clozapine", hostWith({ smoking: true })) ?? "", /1A2/i);
  assert.match(tdmHostNote("theophylline", hostWith({ smoking: true })) ?? "", /1A2/i);

  // Pregnancy notes
  assert.match(tdmHostNote("phenytoin", hostWith({ preg: "pregnant" })) ?? "", /Free phenytoin/i);
  assert.match(tdmHostNote("lamotrigine", hostWith({ preg: "pregnant" })) ?? "", /clearance/i);
  assert.match(tdmHostNote("valproate", hostWith({ preg: "pregnant" })) ?? "", /avoid in pregnancy/i);

  // CYP2C19 phenotype notes on voriconazole
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
});
