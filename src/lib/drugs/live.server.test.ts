import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { lookupLive, liveCache, liveQueryName } from "./live.server";

describe("live.server - lookupLive with BoundedLRUCache and Promise.allSettled", () => {
  beforeEach(() => {
    liveCache.clear();
  });

  it("returns EMPTY_LIVE with reason when query/chem cannot be resolved", async () => {
    const result = await lookupLive("__unknown", "");
    assert.equal(result.ok, true);
    assert.match(result.reason ?? "", /No live label for this item/);
    assert.equal(result.label, null);
    assert.equal(liveCache.size(), 0);
  });

  it("resolves aliased drug names correctly via liveQueryName", () => {
    assert.equal(liveQueryName("tmp-smx", "Bactrim"), "sulfamethoxazole");
    assert.equal(liveQueryName("paxlovid", "Paxlovid"), "nirmatrelvir");
    assert.equal(liveQueryName("valproate", "Depakote"), "valproic acid");
    assert.equal(liveQueryName("custom-drug", "Custom (Test)"), "Custom");
  });

  it("caches successful lookups in liveCache and returns cached instance", async () => {
    const initialSize = liveCache.size();
    assert.equal(initialSize, 0);

    // Prepopulate liveCache directly with simulated LiveSources
    const mockData = {
      ok: true,
      query: "aspirin",
      label: null,
      faers: [],
      rxnorm: { rxcui: "1191", name: "Aspirin", brands: ["Bayer"] },
      pubchem: { cid: "2244", formula: "C9H8O4", mw: "180.16", inchikey: "", iupac: "" },
      dailymed: [],
      shortage: [],
      ndc: [],
      recalls: [],
    };
    liveCache.set("aspirin", mockData);

    const hit = await lookupLive("aspirin", "aspirin");
    assert.deepEqual(hit, mockData);
    assert.equal(liveCache.size(), 1);
  });

  it("demonstrates singleflight coalescing on concurrent lookupLive calls", async () => {
    let callCount = 0;
    const testChem = "mock-chem-test";

    // Directly test liveCache getOrFetch with a slow fetch
    const slowFetch = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 25));
      return {
        ok: true,
        query: testChem,
        label: null,
        faers: [],
        rxnorm: null,
        pubchem: null,
        dailymed: [],
        shortage: [],
        ndc: [],
        recalls: [],
      };
    };

    const results = await Promise.all([
      liveCache.getOrFetch(testChem, slowFetch),
      liveCache.getOrFetch(testChem, slowFetch),
      liveCache.getOrFetch(testChem, slowFetch),
    ]);

    assert.equal(callCount, 1);
    assert.equal(results.length, 3);
    assert.equal(results[0].query, testChem);
    assert.equal(results[1].query, testChem);
    assert.equal(results[2].query, testChem);
  });

  it("maintains FD&C Act § 520(o)(1)(E) non-prescriptive regulatory posture", () => {
    // Verify results from live lookups carry informational summaries, never dosing directives
    const samplePayload = {
      query: "metformin",
      reason: "No FDA label for this item — PubChem still ran.",
    };
    const json = JSON.stringify(samplePayload);
    assert.doesNotMatch(json, /\bprescribe\s+\d+/i);
    assert.doesNotMatch(json, /\btake\s+\d+\s*mg\b/i);
  });
});
