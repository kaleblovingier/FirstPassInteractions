import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fifthRoleCard } from "./fifth-role";

test("fifthRoleCard reads the fifth stored row", () => {
  assert.equal(DRUG_BY_ID.rifampin.enzymes[4]?.enzyme, "CYP1A2");
  assert.equal(DRUG_BY_ID.rifampin.enzymes[4]?.kind, "inducer");
  const rifampin = fifthRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "inducer");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.equal(DRUG_BY_ID.ritonavir.enzymes[4]?.enzyme, "CYP2B6");
  assert.equal(DRUG_BY_ID.ritonavir.enzymes[4]?.kind, "inducer");
  const ritonavir = fifthRoleCard(DRUG_BY_ID.ritonavir);
  assert.ok(ritonavir);
  assert.equal(ritonavir.correct, "inducer");
  assert.equal(ritonavir.prompt, "Ritonavir.");
  assert.ok(ritonavir.choices?.some((choice) => choice.id === "inducer"));
});

test("fifthRoleCard is null without a fifth row", () => {
  assert.equal(DRUG_BY_ID.warfarin.enzymes.length, 3);
  assert.equal(fifthRoleCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fifthRoleCard(DRUG_BY_ID.simvastatin), null);
});
