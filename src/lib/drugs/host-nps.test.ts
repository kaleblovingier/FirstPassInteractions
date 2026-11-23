import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog.ts";
import {
  applyHost,
  FIRST_PASS_CANNABINOID_SET,
  FIRST_PASS_CANNABINOIDS,
  retargetThc,
} from "./host.ts";
import { DEFAULT_HOST, type Drug } from "./types.ts";
import { DOSE_PATTERN, findDoses } from "../guards/dose-rule.ts";

const HHC_IDS = ["hhc", "hhc-p", "hhc-o", "ten-oh-hhc"] as const;

function substrateSensitivity(drug: Drug, enzyme: "CYP2C9" | "CYP3A4") {
  const role = drug.enzymes.find((e) => e.kind === "substrate" && e.enzyme === enzyme);
  return role && role.kind === "substrate" ? role.sensitivity : undefined;
}

test("FIRST_PASS_CANNABINOIDS and FIRST_PASS_CANNABINOID_SET contain all 5 cannabinoids", () => {
  assert.deepEqual(FIRST_PASS_CANNABINOIDS, [
    "dronabinol",
    "hhc",
    "hhc-p",
    "hhc-o",
    "ten-oh-hhc",
  ]);
  assert.equal(FIRST_PASS_CANNABINOID_SET.size, 5);
  for (const id of FIRST_PASS_CANNABINOIDS) {
    assert.equal(FIRST_PASS_CANNABINOID_SET.has(id), true, `Expected ${id} in FIRST_PASS_CANNABINOID_SET`);
    assert.ok(DRUG_BY_ID[id], `Expected ${id} in DRUG_BY_ID`);
  }
});

test("applyHost with oral vs inhaled/smoked route preserves dronabinol behavior and switches HHC cannabinoids CYP2C9/CYP3A4 sensitivity from major to minor", () => {
  const baseDrugs = FIRST_PASS_CANNABINOIDS.map((id) => DRUG_BY_ID[id]!);

  const oralMapped = applyHost(baseDrugs, {
    ...DEFAULT_HOST,
    cannabisRoute: "oral",
    thcRoute: "oral",
  });
  const inhaledMapped = applyHost(baseDrugs, {
    ...DEFAULT_HOST,
    cannabisRoute: "smoked",
    thcRoute: "inhaled",
  });

  // Dronabinol behavior and note text preserved 100%
  const dronaOral = oralMapped.find((d) => d.id === "dronabinol")!;
  const dronaInhaled = inhaledMapped.find((d) => d.id === "dronabinol")!;
  assert.equal(substrateSensitivity(dronaOral, "CYP2C9"), "sensitive");
  assert.equal(substrateSensitivity(dronaOral, "CYP3A4"), "major");
  assert.equal(
    dronaOral.note,
    "Edible first-pass makes 11-OH-THC, which is more psychoactive than parent. CYP2C9/3A4 inhibitors stretch it.",
  );
  assert.equal(substrateSensitivity(dronaInhaled, "CYP2C9"), "minor");
  assert.equal(substrateSensitivity(dronaInhaled, "CYP3A4"), "minor");
  assert.equal(
    dronaInhaled.note,
    "Smoked THC mostly skips 11-OH-THC first-pass. Hepatic 2C9/3A4 still clear parent, but the edible trap is quieter.",
  );

  // HHC series: oral returns unchanged drug with major CYP2C9 & CYP3A4; inhaled downgrades both to minor
  for (const id of HHC_IDS) {
    const base = DRUG_BY_ID[id]!;
    const oral = oralMapped.find((d) => d.id === id)!;
    const inhaled = inhaledMapped.find((d) => d.id === id)!;

    assert.equal(oral, base, `Expected oral ${id} to be returned unchanged`);
    assert.equal(substrateSensitivity(oral, "CYP2C9"), "major");
    assert.equal(substrateSensitivity(oral, "CYP3A4"), "major");

    assert.equal(substrateSensitivity(inhaled, "CYP2C9"), "minor");
    assert.equal(substrateSensitivity(inhaled, "CYP3A4"), "minor");
    assert.ok(inhaled.note && inhaled.note.startsWith(base.note ?? ""));
    assert.ok((inhaled.note ?? "").length > (base.note ?? "").length);
  }
});

test("inhaled hhc-o appends the ketene thermal pyrolysis pulmonary hazard note while hhc, hhc-p, and ten-oh-hhc append the presystemic portal bypass note", () => {
  const hhcoInhaled = retargetThc(DRUG_BY_ID["hhc-o"]!, "inhaled");
  assert.match(
    hhcoInhaled.note ?? "",
    /Inhaled \/ vaped route selected: bypasses presystemic hepatic first-pass extraction AND carries critical thermal pyrolysis hazard — heating O-acetylated cannabinoids \(HHC acetate \/ HHC-O\) generates toxic ketene gas linked to acute inhalational lung injury\./,
  );

  for (const id of ["hhc", "hhc-p", "ten-oh-hhc"] as const) {
    const inhaled = retargetThc(DRUG_BY_ID[id]!, "inhaled");
    assert.match(
      inhaled.note ?? "",
      /Inhaled \/ vaped route selected: bypasses presystemic portal hepatic first-pass extraction, producing rapid peak brain CB1 delivery and reducing first-pass CYP2C9\/CYP3A4 interaction amplitude compared with oral edibles\./,
    );
  }
});

test("zero DOSE_PATTERN matches in any modified or appended cannabinoid notes", () => {
  for (const id of FIRST_PASS_CANNABINOIDS) {
    for (const route of ["oral", "smoked", "inhaled"] as const) {
      const retargeted = retargetThc(DRUG_BY_ID[id]!, route);
      const note = retargeted.note ?? "";
      assert.equal(
        (note.match(DOSE_PATTERN) ?? []).length,
        0,
        `Unexpected DOSE_PATTERN match in ${id} (${route}): ${note}`,
      );
      assert.deepEqual(findDoses(note), []);
    }
  }
});
