import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdGradeCard } from "./third-grade";

test("thirdGradeCard reads the third perpetrator strength", () => {
  const rifampin = thirdGradeCard(DRUG_BY_ID.rifampin);
  assert.ok(rifampin);
  assert.equal(rifampin.correct, "strong");
  assert.equal(rifampin.prompt, "Rifampin.");
  assert.ok(rifampin.choices?.some((choice) => choice.id === "strong"));
  const fluvoxamine = thirdGradeCard(DRUG_BY_ID.fluvoxamine);
  assert.ok(fluvoxamine);
  assert.equal(fluvoxamine.correct, "moderate");
  assert.equal(fluvoxamine.prompt, "Fluvoxamine.");
});

test("thirdGradeCard is null without a third perpetrator", () => {
  assert.equal(thirdGradeCard(DRUG_BY_ID.clarithromycin), null);
  assert.equal(thirdGradeCard(DRUG_BY_ID.simvastatin), null);
});
