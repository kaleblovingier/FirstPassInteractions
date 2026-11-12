import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./engine";
import { NO_MAPPED_PAIR, buildInteractionReport, cypProfileOf, toSeverityTier } from "./interaction-report";
import { DRUG_BY_ID } from "./catalog";

describe("interaction-report - toSeverityTier", () => {
  it("renames the engine's severity and nothing else", () => {
    assert.equal(toSeverityTier("contraindicated"), "Contraindicated");
    assert.equal(toSeverityTier("major"), "Severe");
    assert.equal(toSeverityTier("moderate"), "Moderate");
    assert.equal(toSeverityTier("minor"), "Low");
    assert.equal(toSeverityTier("none"), "Unknown");
  });
});

describe("interaction-report - buildInteractionReport", () => {
  it("keeps what was typed beside the catalog name it resolved to", () => {
    const report = buildInteractionReport([
      { rawInput: "Molly", id: "mdma" },
      { rawInput: "Zoloft", id: "sertraline" },
      { rawInput: "Alcohol", id: "ethanol" },
    ]);
    assert.deepEqual(
      report.substances.map((s) => [s.rawInput, s.id, s.canonicalName]),
      [
        ["Molly", "mdma", "MDMA"],
        ["Zoloft", "sertraline", "Sertraline"],
        ["Alcohol", "ethanol", "Ethanol"],
      ],
    );
    assert.ok(report.substances[1]!.aliases.includes("Zoloft"));
  });

  it("gives every pair at least one row: N names make N(N-1)/2 pairs", () => {
    for (const ids of [
      ["mdma", "sertraline", "ethanol"],
      ["mdma", "sertraline", "ethanol", "alprazolam"],
      ["mdma", "sertraline", "ethanol", "alprazolam", "oxycodone"],
    ]) {
      const report = buildInteractionReport(ids.map((id) => ({ rawInput: id, id })));
      const pairs = new Set(report.pairwiseInteractions.map((row) => row.pairIds.join("|")));
      assert.equal(pairs.size, (ids.length * (ids.length - 1)) / 2);
    }
  });

  it("carries the engine's severity through unchanged", () => {
    const ids = ["mdma", "sertraline"];
    const engine = analyze(ids);
    const report = buildInteractionReport(ids.map((id) => ({ rawInput: id, id })));
    assert.equal(report.highestSeverity, toSeverityTier(engine.highest));
    const serotonin = report.pairwiseInteractions.find((row) => row.mechanism?.includes("serotonin"));
    assert.equal(serotonin?.severity, "Severe");
    assert.equal(serotonin?.source, "firstpass");
    assert.ok(report.pairwiseInteractions.some((row) => row.source === "metabolic"));
  });

  it("marks a pair the engine did not map as Unknown, not as safe", () => {
    const report = buildInteractionReport([
      { rawInput: "acetaminophen", id: "acetaminophen" },
      { rawInput: "loratadine", id: "loratadine" },
    ]);
    assert.equal(analyze(["acetaminophen", "loratadine"]).findings.length, 0);
    assert.deepEqual(
      report.pairwiseInteractions.map((row) => [row.severity, row.description]),
      [["Unknown", NO_MAPPED_PAIR]],
    );
    assert.equal(report.highestSeverity, "Unknown");
  });

  it("adds the overlap percent only when both items have a time and a half-life", () => {
    const timed = buildInteractionReport([
      { rawInput: "mdma", id: "mdma", hoursAgo: 8 },
      { rawInput: "alprazolam", id: "alprazolam", hoursAgo: 12 },
    ]);
    assert.ok(timed.pairwiseInteractions.every((row) => row.activeOverlapPercent === 50));
    assert.equal(timed.substances[0]!.halfLifeHours, 8);
    assert.equal(timed.substances[0]!.ingestionTimeHoursAgo, 8);

    const untimed = buildInteractionReport([
      { rawInput: "mdma", id: "mdma" },
      { rawInput: "alprazolam", id: "alprazolam", hoursAgo: 12 },
    ]);
    assert.ok(untimed.pairwiseInteractions.every((row) => row.activeOverlapPercent === undefined));
  });

  it("drops entries that are not on the shelf and repeats of one id", () => {
    const report = buildInteractionReport([
      { rawInput: "Molly", id: "mdma" },
      { rawInput: "constructor", id: "constructor" },
      { rawInput: "MDMA", id: "mdma" },
    ]);
    assert.deepEqual(
      report.substances.map((s) => s.rawInput),
      ["Molly"],
    );
    assert.deepEqual(report.pairwiseInteractions, []);
  });

  it("stamps metadata from the options it was given", () => {
    const now = new Date("2026-11-11T20:00:00.000Z");
    const report = buildInteractionReport([{ rawInput: "mdma", id: "mdma" }], { now, cached: true });
    assert.equal(report.metadata.timestamp, "2026-11-11T20:00:00.000Z");
    assert.equal(report.metadata.cached, true);
    assert.ok(report.metadata.executionTimeMs >= 0);
  });
});

describe("interaction-report - cypProfileOf", () => {
  it("lists each stored enzyme once per role", () => {
    const profile = cypProfileOf(DRUG_BY_ID["mdma"]!);
    assert.ok(profile.substrates.includes("CYP2D6"));
    assert.ok(profile.inhibitors.includes("CYP2D6"));
    assert.equal(new Set(profile.substrates).size, profile.substrates.length);
  });
});
