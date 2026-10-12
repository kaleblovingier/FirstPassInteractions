import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { sixthGradeCard } from "./sixth-grade";

test("sixthGradeCard reads the sixth perpetrator strength", () => {
  const rifampin = sixthGradeCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "moderate");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.ok(rifampin.choices?.some((choice) => choice.id === "moderate"));
  const ritonavir = sixthGradeCard(DRUG_BY_ID.ritonavir);
  assert.ok(ritonavir);
  assert.equal(ritonavir.correct, "weak");
  assert.equal(ritonavir.prompt, "Ritonavir.");
});

test("sixthGradeCard is null without a sixth perpetrator", () => {
  assert.equal(sixthGradeCard(DRUG_BY_ID.clarithromycin), null);
  assert.equal(sixthGradeCard(DRUG_BY_ID.simvastatin), null);
});
