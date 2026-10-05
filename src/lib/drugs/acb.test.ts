import test from "node:test";
import assert from "node:assert/strict";
import { ACB_CATALOG, acbOnDesk, acbWanted } from "./acb";
import { DRUG_BY_ID } from "./catalog";

test("every drug in ACB_CATALOG exists in the main catalog", () => {
  for (const id of Object.keys(ACB_CATALOG)) {
    assert.ok(DRUG_BY_ID[id], `missing drug ${id} in main catalog`);
    const entry = ACB_CATALOG[id];
    assert.ok(entry.score >= 1 && entry.score <= 3);
    assert.ok(entry.mechanism.length > 5);
    assert.ok(entry.alternative.length > 5);
  }
});

test("acbWanted detects anticholinergic agents", () => {
  assert.equal(acbWanted(["amitriptyline", "paroxetine"]), true);
  assert.equal(acbWanted(["atorvastatin", "metformin"]), false);
  assert.equal(acbWanted([]), false);
});

test("acbOnDesk returns null when no mapped drugs are present", () => {
  assert.equal(acbOnDesk(["atorvastatin", "metformin"]), null);
  assert.equal(acbOnDesk([]), null);
});

test("acbOnDesk calculates single drug correctly", () => {
  const rep = acbOnDesk(["paroxetine"]);
  assert.ok(rep);
  assert.equal(rep.totalScore, 1);
  assert.equal(rep.riskLevel, "low");
  assert.equal(rep.contributors.length, 1);
  assert.equal(rep.contributors[0].drugId, "paroxetine");
  assert.equal(rep.contributors[0].score, 1);
});

test("acbOnDesk identifies high burden threshold (>= 3)", () => {
  const rep = acbOnDesk(["amitriptyline", "oxybutynin"]);
  assert.ok(rep);
  assert.equal(rep.totalScore, 6); // 3 + 3
  assert.equal(rep.riskLevel, "high");
  assert.match(rep.summary, /High burden/);
  assert.match(rep.pearl, /delirium/i);
});

test("acbOnDesk dedupes identical drug IDs", () => {
  const rep = acbOnDesk(["diphenhydramine", "diphenhydramine"]);
  assert.ok(rep);
  assert.equal(rep.totalScore, 3);
  assert.equal(rep.contributors.length, 1);
});

test("acbOnDesk copy does not make clinical diagnosis claims or state milligram doses", () => {
  const rep = acbOnDesk(["amitriptyline", "paroxetine", "cyclobenzaprine"]);
  assert.ok(rep);
  const text = `${rep.summary} ${rep.pearl} ${rep.contributors.map((c) => c.alternative).join(" ")}`;
  assert.doesNotMatch(text, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
  assert.doesNotMatch(text, /clinical decision support/i);
});

