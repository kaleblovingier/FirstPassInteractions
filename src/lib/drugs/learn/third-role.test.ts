import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdRoleCard } from "./third-role";

test("thirdRoleCard reads the third stored row", () => {
  const warfarin = thirdRoleCard(DRUG_BY_ID.warfarin);
  assert.ok(warfarin);
  assert.equal(warfarin.correct, "substrate");
  assert.equal(warfarin.prompt, "Warfarin.");
  const macro = thirdRoleCard(DRUG_BY_ID.clarithromycin);
  assert.ok(macro);
  assert.equal(macro.correct, "inhibitor");
  const rifampin = thirdRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "inducer");
  assert.ok(rifampin.choices?.some((choice) => choice.id === "inducer"));
});

test("thirdRoleCard(simvastatin) is null", () => {
  assert.equal(thirdRoleCard(DRUG_BY_ID.simvastatin), null);
});
