import test from "node:test";
import assert from "node:assert/strict";
import { SEPARATION_RULES, separationHits } from "./separation.ts";

const MG = /\d+\s*mg/i;

test("levothyroxine names the 4-hour wait when calcium or iron is on the tray", () => {
  const withBoth = separationHits(["levothyroxine", "calcium", "iron"]);
  assert.equal(withBoth.length, 1);
  assert.match(withBoth[0].apart, /4 hours/);
  assert.deepEqual(
    withBoth[0].bindersOnTray.map((b) => b.id).sort(),
    ["calcium", "iron"],
  );

  const alone = separationHits(["levothyroxine"]);
  assert.equal(alone.length, 1);
  assert.deepEqual(alone[0].bindersOnTray, []);
});

test("ciprofloxacin names the 2-hour and 6-hour cation wait", () => {
  const hits = separationHits(["ciprofloxacin", "calcium"]);
  assert.equal(hits.length, 1);
  assert.match(hits[0].apart, /2 hours before or 6 hours after/);
  assert.deepEqual(hits[0].bindersOnTray.map((b) => b.id), ["calcium"]);
});

test("an unrelated pair is not a separation hit", () => {
  assert.deepEqual(separationHits(["lisinopril", "metformin"]), []);
});

test("alendronate alone still carries the 30-minute wait", () => {
  const hits = separationHits(["alendronate"]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].alone, true);
  assert.match(hits[0].apart, /30 minutes/);
  assert.deepEqual(hits[0].bindersOnTray, []);
});

test("apart sentences do not invent a milligram", () => {
  for (const rule of SEPARATION_RULES) {
    assert.doesNotMatch(rule.apart, MG, rule.victimId);
  }
});
