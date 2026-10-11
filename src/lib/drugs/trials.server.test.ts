import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchLiveTrials, trialsCache } from "./trials.server";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(route: (url: string) => Response) {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    await new Promise((r) => setTimeout(r, 2));
    return route(url);
  }) as typeof fetch;
  return urls;
}

const STUDIES = {
  studies: [
    {
      protocolSection: {
        identificationModule: { nctId: "NCT00000001", briefTitle: "Warfarin  dosing\n study" },
        statusModule: { overallStatus: "ACTIVE_NOT_RECRUITING" },
        designModule: { phases: ["PHASE2", "NA", "PHASE3"] },
      },
    },
    { protocolSection: { identificationModule: { briefTitle: "No id, skipped" } } },
  ],
};

beforeEach(() => {
  trialsCache.clear();
  setLogSink(() => undefined);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

describe("trials.server - searchLiveTrials", () => {
  it("refuses an empty query without calling ClinicalTrials.gov", async () => {
    const urls = stubFetch(() => json(STUDIES));
    const result = await searchLiveTrials("  ");
    assert.deepEqual(result, { ok: false, hits: [], reason: "Query too short.", query: "" });
    assert.equal(urls.length, 0);
  });

  it("parses studies and caches the answer", async () => {
    const urls = stubFetch(() => json(STUDIES));
    const result = await searchLiveTrials("Warfarin Fluconazole");
    assert.equal(result.ok, true);
    assert.deepEqual(result.hits, [
      { nctId: "NCT00000001", title: "Warfarin dosing study", status: "ACTIVE NOT RECRUITING", phase: "PHASE2 / PHASE3" },
    ]);
    await searchLiveTrials("Warfarin Fluconazole");
    assert.equal(urls.length, 1);
  });

  it("names a rate limit after one retry and does not cache the failure", async () => {
    const urls = stubFetch(() => json({}, 429));
    const result = await searchLiveTrials("Warfarin Fluconazole");
    assert.equal(result.ok, false);
    assert.deepEqual(result.hits, []);
    assert.equal(
      result.reason,
      "ClinicalTrials.gov hit a rate limit — live search is unavailable right now. Open CT.gov to search directly.",
    );
    assert.equal(urls.length, 2, "one retry, no more");
    assert.equal(trialsCache.size(), 0);
  });
});
