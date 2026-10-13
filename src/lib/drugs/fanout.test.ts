import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FANOUT_RULE,
  FANOUT_STAGES,
  fanoutPairs,
  pairBundle,
  pairSlots,
  reduceFindings,
  summarizePairs,
} from "./fanout";
import type { Finding } from "./types";

function finding(
  partial: Pick<Finding, "id" | "severity" | "kind" | "headline"> & Partial<Finding>,
): Finding {
  return {
    drugIds: ["a", "b"],
    enzymes: [] as Finding["enzymes"],
    effect: "",
    mechanism: "",
    clinical: "",
    tags: [],
    ...partial,
  };
}

describe("fanout", () => {
  it("pairSlots is the upper triangle", () => {
    assert.deepEqual(pairSlots(3), [
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
    assert.deepEqual(pairSlots(1), []);
  });

  it("pairBundle returns pk findings before pd findings", () => {
    const pk = finding({ id: "a", severity: "major", kind: "pk", headline: "Alpha" });
    const pd = finding({ id: "b", severity: "moderate", kind: "pd", headline: "Beta" });
    assert.deepEqual(pairBundle([pk], [pd]), [pk, pd]);
  });

  it("reduceFindings keeps the higher severity for the same non-pd key", () => {
    const minor = finding({
      id: "a",
      severity: "minor",
      kind: "pk",
      headline: "Alpha",
      drugIds: ["b", "a"],
      tags: ["x"],
    });
    const major = finding({
      id: "b",
      severity: "major",
      kind: "pk",
      headline: "Beta",
      drugIds: ["a", "b"],
      tags: ["x"],
    });
    const kept = reduceFindings([[minor], [major]]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.id, "b");
    assert.equal(kept[0]?.severity, "major");
  });

  it("reduceFindings order is independent of shard completion order", () => {
    const alpha = finding({
      id: "a",
      severity: "minor",
      kind: "pk",
      headline: "Alpha",
      drugIds: ["a"],
    });
    const beta = finding({
      id: "b",
      severity: "major",
      kind: "pd",
      headline: "Beta",
    });
    const gamma = finding({
      id: "c",
      severity: "moderate",
      kind: "clinic",
      headline: "Gamma",
      drugIds: ["c"],
      tags: ["c"],
    });
    const single = reduceFindings([[alpha, beta, gamma]]);
    const reversed = reduceFindings([[gamma], [beta], [alpha]]);
    assert.deepEqual(reversed, single);
    assert.deepEqual(
      single.map((f) => f.severity),
      ["major", "moderate", "minor"],
    );
  });

  it("FANOUT_STAGES starts at resolve and ends at reduce", () => {
    assert.equal(FANOUT_STAGES[0], "resolve");
    assert.equal(FANOUT_STAGES.at(-1), "reduce");
  });

  it("FANOUT_RULE forbids splitting a pair", () => {
    assert.equal(FANOUT_RULE.includes("Do not split"), true);
  });

  it("fanoutPairs returns mapped pairs in upper-triangle order", () => {
    const drugs = ["warfarin", "aspirin", "clopidogrel"];
    assert.deepEqual(fanoutPairs(drugs), [
      ["warfarin", "aspirin"],
      ["warfarin", "clopidogrel"],
      ["aspirin", "clopidogrel"],
    ]);
    assert.deepEqual(fanoutPairs(["warfarin"]), []);
  });

  it("summarizePairs attributes findings to pairwise slots", () => {
    const drugs = ["warfarin", "aspirin", "clopidogrel"];
    const f1 = finding({
      id: "w-a",
      severity: "major",
      kind: "pd",
      headline: "Bleeding risk",
      drugIds: ["warfarin", "aspirin"],
    });
    const f2 = finding({
      id: "a-c",
      severity: "moderate",
      kind: "pd",
      headline: "Antiplatelet overlap",
      drugIds: ["aspirin", "clopidogrel"],
    });
    const summary = summarizePairs(drugs, [f1, f2]);
    assert.equal(summary.length, 3);
    assert.deepEqual(summary[0], {
      pair: ["warfarin", "aspirin"],
      totalFindings: 1,
      highestSeverity: "major",
    });
    assert.deepEqual(summary[1], {
      pair: ["warfarin", "clopidogrel"],
      totalFindings: 0,
      highestSeverity: "none",
    });
    assert.deepEqual(summary[2], {
      pair: ["aspirin", "clopidogrel"],
      totalFindings: 1,
      highestSeverity: "moderate",
    });
  });
});
