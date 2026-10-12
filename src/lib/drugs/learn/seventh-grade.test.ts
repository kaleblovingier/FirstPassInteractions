import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { seventhGradeCard } from "./seventh-grade";

test("rifampin seventh perpetrator is P-gp inducer strength strong", () => {
  const rifampin = seventhGradeCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "strong");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.ok(rifampin.answer.includes("P-gp"));
  assert.ok(rifampin.answer.includes("inducer"));
  assert.ok(rifampin.answer.includes("seventh"));
});

test("ritonavir has only 6 perpetrators", () => {
  assert.equal(seventhGradeCard(DRUG_BY_ID.ritonavir), null);
});

test("simvastatin seventh grade card is null", () => {
  assert.equal(seventhGradeCard(DRUG_BY_ID.simvastatin), null);
});
