import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { seventhRoleCard } from "./seventh-role";

test("seventhRoleCard reads the seventh stored row", () => {
  const rifampinEnzyme = DRUG_BY_ID.rifampin.enzymes[6]?.enzyme;
  assert.equal(rifampinEnzyme, "P-gp");
  assert.equal(DRUG_BY_ID.rifampin.enzymes[6]?.kind, "inducer");
  const rifampin = seventhRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "inducer");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.equal(rifampin.prompt.includes(rifampinEnzyme), false);
  assert.ok(rifampin.choices?.some((choice) => choice.id === rifampin.correct));

  const ritonavirEnzyme = DRUG_BY_ID.ritonavir.enzymes[6]?.enzyme;
  assert.equal(ritonavirEnzyme, "CYP2C9");
  assert.equal(DRUG_BY_ID.ritonavir.enzymes[6]?.kind, "inducer");
  const ritonavir = seventhRoleCard(DRUG_BY_ID.ritonavir);
  assert.ok(ritonavir);
  assert.equal(ritonavir.correct, "inducer");
  assert.equal(ritonavir.prompt, "Ritonavir.");
  assert.equal(ritonavir.prompt.includes(ritonavirEnzyme), false);
  assert.ok(ritonavir.choices?.some((choice) => choice.id === ritonavir.correct));
});

test("seventhRoleCard is null without a seventh row", () => {
  assert.equal(DRUG_BY_ID.warfarin.enzymes.length, 3);
  assert.equal(seventhRoleCard(DRUG_BY_ID.warfarin), null);
  assert.equal(DRUG_BY_ID.clarithromycin.enzymes.length, 3);
  assert.equal(seventhRoleCard(DRUG_BY_ID.clarithromycin), null);
});
