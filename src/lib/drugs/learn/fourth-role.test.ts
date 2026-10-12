import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthRoleCard } from "./fourth-role";

test("fourthRoleCard reads the fourth stored row", () => {
  const rifampin = fourthRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "inducer");
  assert.equal(rifampin.prompt, "Rifampin.");
  const ritonavir = fourthRoleCard(DRUG_BY_ID.ritonavir);
  assert.ok(ritonavir);
  assert.equal(ritonavir.correct, "inhibitor");
  assert.equal(ritonavir.prompt, "Ritonavir.");
  assert.ok(ritonavir.choices?.some((choice) => choice.id === "inhibitor"));
});

test("fourthRoleCard is null without a fourth row", () => {
  assert.equal(fourthRoleCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fourthRoleCard(DRUG_BY_ID.simvastatin), null);
});
