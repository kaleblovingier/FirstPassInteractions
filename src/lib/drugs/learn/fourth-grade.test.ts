import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthGradeCard } from "./fourth-grade";

test("fourthGradeCard reads the fourth perpetrator strength", () => {
  const rifampin = fourthGradeCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "moderate");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.ok(rifampin.choices?.some((choice) => choice.id === "moderate"));
  const ritonavir = fourthGradeCard(DRUG_BY_ID.ritonavir);
  assert.ok(ritonavir);
  assert.equal(ritonavir.correct, "moderate");
  assert.equal(ritonavir.prompt, "Ritonavir.");
});

test("fourthGradeCard is null without a fourth perpetrator", () => {
  assert.equal(fourthGradeCard(DRUG_BY_ID.clarithromycin), null);
  assert.equal(fourthGradeCard(DRUG_BY_ID.simvastatin), null);
});
