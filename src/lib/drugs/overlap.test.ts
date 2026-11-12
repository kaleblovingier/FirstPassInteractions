import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./engine";
import { remainingFraction, timeline } from "./overlap";

describe("overlap - remainingFraction", () => {
  it("halves once per half-life and is whole at or before time zero", () => {
    assert.equal(remainingFraction(8, 0), 1);
    assert.equal(remainingFraction(8, -3), 1);
    assert.equal(remainingFraction(8, 8), 0.5);
    assert.equal(remainingFraction(8, 24), 0.125);
  });

  it("refuses a half-life that is not positive", () => {
    assert.throws(() => remainingFraction(0, 4), RangeError);
    assert.throws(() => remainingFraction(8, Number.NaN), RangeError);
  });
});

describe("overlap - timeline", () => {
  it("gives every pair a row and keeps the engine's severity", () => {
    const ids = ["alprazolam", "ethanol", "oxycodone"];
    const sketch = timeline(ids, {}, analyze(ids));
    assert.equal(sketch.pairs.length, 3);
    assert.ok(sketch.pairs.every((p) => p.severity === "major" && p.activeOverlapPercent === undefined));
  });

  it("holds a pair whose washout or enzyme clock outlasts half-life math", () => {
    const maoi = ["phenelzine", "fluoxetine"];
    const a = timeline(maoi, { phenelzine: 400, fluoxetine: 400 }, analyze(maoi)).pairs[0]!;
    assert.match(a.holds ?? "", /washout/);
    assert.equal(a.activeOverlapPercent, undefined);
    const cyp = ["paroxetine", "codeine"];
    const b = timeline(cyp, { paroxetine: 48, codeine: 4 }, analyze(cyp)).pairs[0]!;
    assert.match(b.holds ?? "", /clock/);
    assert.equal(b.activeOverlapPercent, undefined);
  });

  it("still gives a percent when no outlasting clock exists", () => {
    const ids = ["mdma", "alprazolam"];
    const p = timeline(ids, { mdma: 8, alprazolam: 12 }, analyze(ids)).pairs[0]!;
    assert.equal(p.holds, undefined);
    assert.equal(p.activeOverlapPercent, 50);
  });
});
