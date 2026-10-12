import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fifthGradeCard } from "./fifth-grade";

test("fifthGradeCard reads the fifth perpetrator strength", () => {
  const rifampin = fifthGradeCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "moderate");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.equal(
    rifampin.answer,
    "Rifampin stores CYP1A2 as a fifth inducer, strength moderate. Not a milligram.",
  );
  assert.ok(rifampin.choices?.some((choice) => choice.id === "moderate"));
});

test("fifthGradeCard is null without a fifth perpetrator", () => {
  assert.equal(fifthGradeCard(DRUG_BY_ID.clarithromycin), null);
  assert.equal(fifthGradeCard(DRUG_BY_ID.simvastatin), null);
});
