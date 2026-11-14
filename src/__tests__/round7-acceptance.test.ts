/**
 * Round-7 acceptance: the brief's QA list, run end to end through POST /api/cds/analyze's service.
 * Unit tests beside each module hold the details; this file holds the brief's own examples.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { remainingFraction } from "../lib/drugs/overlap";
import { ClinicalDecisionService, type AnalyzeResult } from "../lib/server/api/cds-service";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

async function analyze(body: unknown): Promise<AnalyzeResult> {
  const result = await ClinicalDecisionService.analyze(body);
  if (!result.success) assert.fail(JSON.stringify(result.problem));
  return result.data;
}

const engineRows = (result: AnalyzeResult) =>
  result.data.pairwiseInteractions.filter((row) => row.source === "firstpass" || row.source === "metabolic");

describe("round 7 - every pair is checked", () => {
  it("3, 4 and 5 substances give 3, 6 and 10 pairs, each with a row", async () => {
    const names = ["Molly", "Zoloft", "Alcohol", "Xanax", "oxycodone"];
    for (const n of [3, 4, 5]) {
      const result = await analyze({ substances: names.slice(0, n) });
      const pairs = new Set(result.data.pairwiseInteractions.map((row) => row.pairIds.join("|")));
      assert.equal(pairs.size, (n * (n - 1)) / 2, `${n} substances`);
    }
  });
});

describe("round 7 - names resolve to the canonical item", () => {
  it("Molly, Zoloft and Alcohol read as MDMA, Sertraline and Ethanol, and the street name is said", async () => {
    const result = await analyze({ substances: ["Molly", "Zoloft", "Alcohol"] });
    assert.deepEqual(
      result.data.substances.map((s) => [s.rawInput, s.canonicalName]),
      [
        ["Molly", "MDMA"],
        ["Zoloft", "Sertraline"],
        ["Alcohol", "Ethanol"],
      ],
    );
    assert.ok(result.warnings.some((w) => w.code === "street-name-resolved" && w.detail.includes("Molly")));
  });
});

describe("round 7 - synergy across the tray", () => {
  const alert = async (substances: string[], category: string) =>
    (await analyze({ substances })).data.synergyAlerts.find((a) => a.category === category);

  it("flags serotonin syndrome on MDMA with sertraline", async () => {
    assert.equal((await alert(["Molly", "sertraline"], "Serotonin Syndrome"))?.riskLevel, "Severe");
  });

  it("flags cocaethylene on cocaine with ethanol", async () => {
    const found = await alert(["cocaine", "Booze"], "Toxic Metabolite (e.g., Cocaethylene)");
    assert.deepEqual(found?.implicatedSubstances, ["Cocaine", "Ethanol"]);
  });

  it("flags CNS and respiratory depression on alprazolam, ethanol and oxycodone", async () => {
    const found = await alert(["Xanax", "Alcohol", "oxycodone"], "CNS & Respiratory Depression");
    assert.equal(found?.riskLevel, "Severe");
    assert.deepEqual(found?.implicatedSubstances, ["Alprazolam", "Ethanol", "Oxycodone"]);
  });
});

describe("round 7 - half-life decay", () => {
  it("leaves C0 · 0.5^(t / t½)", () => {
    assert.equal(remainingFraction(8, 8), 0.5);
    assert.equal(remainingFraction(8, 24), 0.125);
    assert.ok(Math.abs(remainingFraction(12, 6) - Math.SQRT1_2) < 1e-12);
    assert.equal(remainingFraction(4, 0), 1);
  });

  it("gives staggered doses their active overlap", async () => {
    const result = await analyze({
      substances: [
        { name: "MDMA", ingestionTimeHoursAgo: 8 },
        { name: "alprazolam", ingestionTimeHoursAgo: 12 },
      ],
    });
    assert.ok(result.data.pairwiseInteractions.every((row) => row.activeOverlapPercent === 50));
  });

  it("gives ethanol no half-life, so no overlap percent", async () => {
    const result = await analyze({
      substances: [
        { name: "Alcohol", ingestionTimeHoursAgo: 1 },
        { name: "sertraline", ingestionTimeHoursAgo: 26 },
      ],
    });
    assert.equal(result.data.substances[0]!.halfLifeHours, undefined);
    assert.ok(result.data.pairwiseInteractions.every((row) => row.activeOverlapPercent === undefined));
  });
});

describe("round 7 - outside sources that fail", () => {
  it("keep every engine row and say what failed", async () => {
    const substances = ["Molly", "Zoloft", "Alcohol"];
    const offline = await analyze({ substances });
    globalThis.fetch = async () => {
      throw new TypeError("network down");
    };
    const live = await analyze({ substances, live: true });
    assert.deepEqual(engineRows(live), engineRows(offline));
    assert.equal(live.data.highestSeverity, offline.data.highestSeverity);
    assert.deepEqual(live.data.synergyAlerts, offline.data.synergyAlerts);
    assert.ok(live.warnings.some((w) => w.code === "live-source-failed"));
    assert.ok(live.data.pairwiseInteractions.every((row) => row.source !== "psychonaut" || row.severity === "Unknown"));
  });
});
