import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { sixthRoleCard } from "./sixth-role";

test("sixthRoleCard reads the sixth stored row", () => {
  assert.equal(DRUG_BY_ID.rifampin.enzymes[5]?.enzyme, "CYP2C8");
  assert.equal(DRUG_BY_ID.rifampin.enzymes[5]?.kind, "inducer");
  const rifampin = sixthRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "inducer");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.equal(rifampin.prompt.includes("CYP2C8"), false);
  assert.ok(rifampin.choices?.some((choice) => choice.id === "inducer"));
  assert.equal(DRUG_BY_ID.ritonavir.enzymes[5]?.enzyme, "CYP1A2");
  assert.equal(DRUG_BY_ID.ritonavir.enzymes[5]?.kind, "inducer");
  const ritonavir = sixthRoleCard(DRUG_BY_ID.ritonavir);
  assert.ok(ritonavir);
  assert.equal(ritonavir.correct, "inducer");
  assert.equal(ritonavir.prompt, "Ritonavir.");
  assert.equal(ritonavir.prompt.includes("CYP1A2"), false);
  assert.ok(ritonavir.choices?.some((choice) => choice.id === "inducer"));
});

test("sixthRoleCard is null without a sixth row", () => {
  assert.equal(DRUG_BY_ID.warfarin.enzymes.length, 3);
  assert.equal(sixthRoleCard(DRUG_BY_ID.warfarin), null);
  assert.equal(sixthRoleCard(DRUG_BY_ID.simvastatin), null);
});
