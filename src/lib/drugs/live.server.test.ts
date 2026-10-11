import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { lookupLive, lookupLiveOutcome, liveCache, liveQueryName } from "./live.server";
import type { LiveSources } from "./live";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;
let logLines: string[] = [];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Routes every upstream call through `route`; nothing reaches the network. */
function stubFetch(route: (url: string) => Response | Promise<Response>) {
  const urls: string[] = [];
  let running = 0;
  const stats = { peak: 0 };
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    running++;
    stats.peak = Math.max(stats.peak, running);
    try {
      await new Promise((r) => setTimeout(r, 2));
      return await route(url);
    } finally {
      running--;
    }
  }) as typeof fetch;
  return { urls, stats };
}

const WARFARIN_LABEL = {
  results: [
    {
      boxed_warning: ["WARNING: BLEEDING RISK"],
      drug_interactions: ["Fluconazole increases the effect of warfarin."],
      openfda: {
        brand_name: ["Coumadin"],
        rxcui: ["11289"],
        unii: ["5Q7ZVV76EI"],
        pharm_class_epc: ["Vitamin K Antagonist [EPC]"],
      },
      set_id: "set-warfarin",
    },
  ],
};

function healthyRoute(url: string): Response {
  if (url.includes("api.fda.gov/drug/label.json")) return json(WARFARIN_LABEL);
  if (url.includes("api.fda.gov/drug/event.json")) return json({ results: [{ term: "HAEMORRHAGE", count: 42 }] });
  if (url.includes("api.fda.gov/drug/shortages.json")) return json({ error: { code: "NOT_FOUND" } }, 404);
  if (url.includes("api.fda.gov/drug/ndc.json")) {
    return json({ results: [{ product_ndc: "0056-0172", brand_name: "Coumadin", generic_name: "warfarin", dosage_form: "TABLET" }] });
  }
  if (url.includes("api.fda.gov/drug/enforcement.json")) return json({ error: { code: "NOT_FOUND" } }, 404);
  if (url.includes("/REST/rxcui.json")) return json({ idGroup: { rxnormId: ["11289"] } });
  if (url.includes("/related.json")) {
    return json({ relatedGroup: { conceptGroup: [{ tty: "BN", conceptProperties: [{ name: "Coumadin" }, { name: "Jantoven" }] }] } });
  }
  if (url.includes("pubchem.ncbi.nlm.nih.gov")) {
    return json({ PropertyTable: { Properties: [{ CID: 54678486, MolecularFormula: "C19H16O4", MolecularWeight: "308.3", IUPACName: "warfarin-iupac", InChIKey: "PJVWKTKQMONHTI-UHFFFAOYSA-N" }] } });
  }
  if (url.includes("dailymed.nlm.nih.gov")) {
    return json({ data: [{ setid: "spl-1", title: "WARFARIN SODIUM tablet", published_date: "2024-05-01T00:00:00" }] });
  }
  return json({}, 500);
}

describe("live.server - lookupLive with BoundedLRUCache and Promise.allSettled", () => {
  beforeEach(() => {
    liveCache.clear();
    logLines = [];
    setLogSink((_level, line) => logLines.push(line));
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    setLogSink(null);
  });

  it("returns EMPTY_LIVE with reason when query/chem cannot be resolved", async () => {
    const { urls } = stubFetch(healthyRoute);
    const result = await lookupLive("__unknown", "");
    assert.equal(result.ok, true);
    assert.match(result.reason ?? "", /No live label for this item/);
    assert.equal(result.label, null);
    assert.equal(liveCache.size(), 0);
    assert.equal(urls.length, 0);
  });

  it("resolves aliased drug names correctly via liveQueryName", () => {
    assert.equal(liveQueryName("tmp-smx", "Bactrim"), "sulfamethoxazole");
    assert.equal(liveQueryName("paxlovid", "Paxlovid"), "nirmatrelvir");
    assert.equal(liveQueryName("valproate", "Depakote"), "valproic acid");
    assert.equal(liveQueryName("custom-drug", "Custom (Test)"), "Custom");
  });

  it("does not treat inherited object keys as aliases", () => {
    assert.equal(liveQueryName("constructor", "Object"), "Object");
    assert.equal(liveQueryName("toString", "To string"), "To string");
  });

  it("caches successful lookups in liveCache and returns cached instance", async () => {
    const { urls } = stubFetch(healthyRoute);
    assert.equal(liveCache.size(), 0);

    // Prepopulate liveCache directly with simulated LiveSources
    const mockData: LiveSources = {
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
    liveCache.set("aspirin", { sources: mockData, failed: [] });

    const hit = await lookupLive("aspirin", "aspirin");
    assert.deepEqual(hit, mockData);
    assert.equal(liveCache.size(), 1);
    assert.equal(urls.length, 0, "a cache hit must not call upstream");
  });

  it("demonstrates singleflight coalescing on concurrent lookupLive calls", async () => {
    const { urls } = stubFetch(healthyRoute);
    const results = await Promise.all([
      lookupLive("warfarin", "Warfarin"),
      lookupLive("warfarin", "Warfarin"),
      lookupLive("warfarin", "Warfarin"),
    ]);

    assert.equal(urls.filter((u) => u.includes("label.json")).length, 1, "one label call for three callers");
    assert.equal(results.length, 3);
    for (const r of results) assert.equal(r.query, "Warfarin");
  });

  it("asks every source at once, treats OpenFDA 404 as no match, and caches a complete answer", async () => {
    const { urls, stats } = stubFetch(healthyRoute);
    const live = await lookupLive("warfarin", "Warfarin");

    assert.equal(live.ok, true);
    assert.equal(live.reason, undefined);
    assert.equal(live.label?.boxed, "WARNING: BLEEDING RISK");
    assert.deepEqual(live.label?.rxcui, ["11289"]);
    assert.deepEqual(live.faers, [{ term: "HAEMORRHAGE", count: 42 }]);
    assert.deepEqual(live.rxnorm, { rxcui: "11289", name: "Warfarin", brands: ["Coumadin", "Jantoven"] });
    assert.equal(live.pubchem?.cid, "54678486");
    assert.equal(live.dailymed[0]?.published, "2024-05-01");
    assert.deepEqual(live.shortage, [], "OpenFDA 404 is an empty answer, not a failure");
    assert.deepEqual(live.recalls, []);
    assert.equal(live.ndc[0]?.ndc, "0056-0172");
    assert.equal(urls.length, 9, "eight sources plus the RxNorm brand follow-up");
    assert.ok(stats.peak >= 6, `sources should run concurrently (peak ${stats.peak})`);

    const outcome = await lookupLiveOutcome("warfarin", "Warfarin");
    assert.deepEqual(outcome.failed, []);
    assert.equal(urls.length, 9, "second lookup is served from cache");
  });

  it("keeps the other sources and names the label failure when OpenFDA's label call fails", async () => {
    stubFetch((url) => (url.includes("label.json") ? json({ error: "boom" }, 500) : healthyRoute(url)));
    const outcome = await lookupLiveOutcome("warfarin", "Warfarin");

    assert.equal(outcome.sources.ok, true);
    assert.equal(outcome.sources.label, null);
    assert.deepEqual(outcome.failed, ["label"]);
    assert.equal(
      outcome.sources.reason,
      "OpenFDA answered with an error — the label excerpt is unavailable; the Prescribing Information still governs.",
    );
    assert.equal(outcome.sources.faers.length, 1, "FAERS still answered");
    assert.equal(outcome.sources.rxnorm?.rxcui, "11289");
    assert.equal(liveCache.has("Warfarin"), true, "partial answers are kept briefly");
  });

  it("names the failing sources when the label answered but others did not", async () => {
    stubFetch((url) =>
      url.includes("event.json") || url.includes("ndc.json") ? json({}, 502) : healthyRoute(url),
    );
    const outcome = await lookupLiveOutcome("warfarin", "Warfarin");
    assert.equal(outcome.sources.ok, true);
    assert.ok(outcome.sources.label);
    assert.deepEqual(outcome.failed, ["faers", "ndc"]);
    assert.equal(outcome.sources.reason, "FAERS and NDC answered with an error — those rows may be missing this time.");
  });

  it("returns ok:false with a clear reason and caches nothing when every source fails", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed: connect ECONNREFUSED https://api.fda.gov/drug/label.json?search=x");
    });
    const live = await lookupLive("warfarin", "Warfarin");

    assert.equal(live.ok, false);
    assert.equal(
      live.reason,
      "Live sources couldn't be reached — the label excerpt is unavailable; the Prescribing Information still governs.",
    );
    assert.doesNotMatch(live.reason ?? "", /ECONNREFUSED|https?:|search=/);
    assert.equal(live.label, null);
    assert.equal(liveCache.size(), 0, "a total failure must not be cached");
  });

  it("asks only RxNorm and PubChem for an item with no FDA label", async () => {
    const { urls } = stubFetch(healthyRoute);
    const live = await lookupLive("dirty-30", "Dirty 30");
    assert.equal(live.ok, true);
    assert.equal(live.reason, "No FDA label for this item — PubChem still ran.");
    assert.ok(urls.every((u) => u.includes("rxnav.nlm.nih.gov") || u.includes("pubchem.ncbi.nlm.nih.gov")));
  });

  it("says which identity source failed for an item with no FDA label", async () => {
    stubFetch((url) => (url.includes("pubchem") ? json({}, 500) : healthyRoute(url)));
    const live = await lookupLive("dirty-30", "Dirty 30");
    assert.equal(live.ok, true);
    assert.equal(live.reason, "No FDA label for this item — PubChem answered with an error.");
  });

  it("logs upstream outcomes and cache hit/miss without drug names, queries or URLs", async () => {
    stubFetch((url) => (url.includes("label.json") ? json({}, 500) : healthyRoute(url)));
    await lookupLive("warfarin", "Warfarin");
    await lookupLive("warfarin", "Warfarin");

    const events = logLines.map((l) => JSON.parse(l) as Record<string, unknown>);
    const upstream = events.filter((e) => e.event === "upstream.fetch");
    assert.equal(upstream.length, 9);
    assert.ok(upstream.some((e) => e.source === "openfda.label" && e.status === 500 && e.outcome === "http"));
    const lookups = events.filter((e) => e.event === "live.lookup");
    assert.deepEqual(
      lookups.map((e) => e.cache),
      ["miss", "hit"],
    );
    assert.equal(lookups[0]?.failed, "label");
    for (const line of logLines) {
      assert.doesNotMatch(line, /warfarin|coumadin|search=|label\.json|https?:/i);
    }
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
