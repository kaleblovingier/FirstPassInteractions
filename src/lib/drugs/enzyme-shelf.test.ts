import test from "node:test";
import assert from "node:assert/strict";
import { drugsWithRole, enzymeShelfCounts } from "./enzyme-shelf";

test("CYP3A4 shelf separates stored substrates from inhibitors", () => {
  const inhibitors = drugsWithRole("CYP3A4", "inhibitor").map((drug) => drug.id);
  const substrates = drugsWithRole("CYP3A4", "substrate").map((drug) => drug.id);
  assert.ok(inhibitors.includes("clarithromycin"));
  assert.ok(inhibitors.includes("grapefruit"));
  assert.equal(inhibitors.includes("simvastatin"), false);
  assert.ok(substrates.includes("simvastatin"));
  assert.ok(substrates.includes("warfarin"));
  assert.equal(substrates.includes("grapefruit"), false);
});

test("enzyme shelf counts are the stored rows, not a collision", () => {
  const cyp3a4 = enzymeShelfCounts().find((row) => row.enzyme === "CYP3A4");
  assert.ok(cyp3a4);
  assert.ok(cyp3a4.any >= cyp3a4.inhibitor);
  assert.ok(cyp3a4.any >= cyp3a4.substrate);
  assert.ok(cyp3a4.inhibitor >= 2);
  assert.ok(cyp3a4.inducer >= 1);
  const inducers = drugsWithRole("CYP3A4", "inducer").map((drug) => drug.id);
  assert.ok(inducers.includes("rifampin"));
});
