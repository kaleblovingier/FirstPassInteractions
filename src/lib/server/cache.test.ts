import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BoundedLRUCache, CACHE_REGULATORY_DISCLAIMER } from "./cache";

describe("BoundedLRUCache - Basic get/set and LRU eviction order", () => {
  it("stores and retrieves items correctly", () => {
    const cache = new BoundedLRUCache<string>(500);
    cache.set("key1", "val1");
    cache.set("key2", "val2");

    assert.equal(cache.get("key1"), "val1");
    assert.equal(cache.get("key2"), "val2");
    assert.equal(cache.get("nonexistent"), undefined);
    assert.equal(cache.size(), 2);
  });

  it("updates existing key without evicting other entries and refreshes LRU position", () => {
    const cache = new BoundedLRUCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    // Update 'a'
    cache.set("a", 10);
    assert.equal(cache.size(), 2);
    assert.equal(cache.get("a"), 10);

    // Now 'b' should be LRU because 'a' was updated and then retrieved
    cache.set("c", 3);
    assert.equal(cache.size(), 2);
    assert.equal(cache.get("b"), undefined, "'b' should have been evicted as LRU");
    assert.equal(cache.get("a"), 10);
    assert.equal(cache.get("c"), 3);
  });

  it("evicts oldest entry in strict LRU order when maxSize is reached", () => {
    const cache = new BoundedLRUCache<string>(3);
    cache.set("a", "alpha");
    cache.set("b", "beta");
    cache.set("c", "gamma");
    assert.deepEqual(cache.keys(), ["a", "b", "c"]);

    // Access 'a' to make 'b' the oldest:
    assert.equal(cache.get("a"), "alpha");
    assert.deepEqual(cache.keys(), ["b", "c", "a"]);

    // Adding 'd' should evict 'b' (oldest)
    cache.set("d", "delta");
    assert.equal(cache.size(), 3);
    assert.deepEqual(cache.keys(), ["c", "a", "d"]);
    assert.equal(cache.get("b"), undefined, "Expected 'b' to be evicted");

    // Access 'c' -> order becomes [a, d, c], making 'a' the oldest
    assert.equal(cache.get("c"), "gamma");
    assert.deepEqual(cache.keys(), ["a", "d", "c"]);

    // Adding 'e' should evict 'a' (oldest)
    cache.set("e", "epsilon");
    assert.equal(cache.size(), 3);
    assert.deepEqual(cache.keys(), ["d", "c", "e"]);
    assert.equal(cache.get("a"), undefined, "Expected 'a' to be evicted");
    assert.equal(cache.get("d"), "delta");
    assert.equal(cache.get("c"), "gamma");
    assert.equal(cache.get("e"), "epsilon");
  });

  it("supports clear(), delete(), and has()", () => {
    const cache = new BoundedLRUCache<number>(10);
    cache.set("k1", 100);
    cache.set("k2", 200);

    assert.equal(cache.has("k1"), true);
    assert.equal(cache.has("unknown"), false);

    assert.equal(cache.delete("k1"), true);
    assert.equal(cache.get("k1"), undefined);
    assert.equal(cache.size(), 1);

    cache.clear();
    assert.equal(cache.size(), 0);
    assert.equal(cache.get("k2"), undefined);
  });

  it("rejects invalid maxSize <= 0", () => {
    assert.throws(() => new BoundedLRUCache(0), RangeError);
    assert.throws(() => new BoundedLRUCache(-5), RangeError);
  });
});

describe("BoundedLRUCache - TTL expiration and active pruning", () => {
  it("purges expired items on get()", async () => {
    // 50ms TTL
    const cache = new BoundedLRUCache<string>(10, 50);
    cache.set("ephemeral", "data");

    assert.equal(cache.get("ephemeral"), "data");

    // Wait 70ms for TTL to lapse
    await new Promise((r) => setTimeout(r, 70));

    assert.equal(cache.get("ephemeral"), undefined);
    assert.equal(cache.has("ephemeral"), false);
    assert.equal(cache.size(), 0);
  });

  it("respects per-set custom TTL", async () => {
    const cache = new BoundedLRUCache<string>(10, 5000); // default 5s
    cache.set("shortLived", "quick", 40); // 40ms
    cache.set("longLived", "stay", 5000);

    await new Promise((r) => setTimeout(r, 60));

    assert.equal(cache.get("shortLived"), undefined);
    assert.equal(cache.get("longLived"), "stay");
  });

  it("prunes expired entries with pruneExpired() and reports exact pruned count", async () => {
    const cache = new BoundedLRUCache<string>(10, 40);
    cache.set("item1", "v1");
    cache.set("item2", "v2");
    cache.set("item3", "v3", 5000); // 5s long-lived

    assert.equal(cache.pruneExpired(), 0);

    await new Promise((r) => setTimeout(r, 60));

    // item1 and item2 expired, item3 alive
    const prunedCount = cache.pruneExpired();
    assert.equal(prunedCount, 2);
    assert.equal(cache.size(), 1);
    assert.equal(cache.get("item3"), "v3");
  });
});

describe("BoundedLRUCache - Singleflight request coalescing", () => {
  it("spawns 50 concurrent calls to getOrFetch('drug-x', mockFetch) and asserts mockFetch called EXACTLY ONCE with all 50 resolving with correct value", async () => {
    const cache = new BoundedLRUCache<{ id: string; name: string }>(500);

    let fetchCount = 0;
    const mockFetch = async () => {
      fetchCount++;
      // Simulate real async I/O latency
      await new Promise((r) => setTimeout(r, 30));
      return { id: "drug-x", name: "Drug X Labeled Entity" };
    };

    // Spawn 50 concurrent callers simultaneously
    const callers = Array.from({ length: 50 }, () =>
      cache.getOrFetch("drug-x", mockFetch)
    );

    const results = await Promise.all(callers);

    // Verify all 50 callers resolved to the identical result
    assert.equal(results.length, 50);
    for (const res of results) {
      assert.deepEqual(res, { id: "drug-x", name: "Drug X Labeled Entity" });
    }

    // Verify mockFetch was invoked EXACTLY ONCE
    assert.equal(fetchCount, 1, "mockFetch must be called EXACTLY ONCE across 50 concurrent requests");

    // In-flight map must be empty
    assert.equal(cache.inFlightSize, 0, "inFlight map must be cleared after resolution");

    // Subsequent call should immediately return from cache without calling mockFetch
    const cachedResult = await cache.getOrFetch("drug-x", mockFetch);
    assert.deepEqual(cachedResult, { id: "drug-x", name: "Drug X Labeled Entity" });
    assert.equal(fetchCount, 1, "Subsequent call must use cached value without re-fetching");
  });

  it("coalesces distinct keys independently without collision", async () => {
    const cache = new BoundedLRUCache<string>(500);

    let fetchA = 0;
    let fetchB = 0;

    const mockA = async () => {
      fetchA++;
      await new Promise((r) => setTimeout(r, 20));
      return "res-a";
    };

    const mockB = async () => {
      fetchB++;
      await new Promise((r) => setTimeout(r, 20));
      return "res-b";
    };

    const [aResults, bResults] = await Promise.all([
      Promise.all(Array.from({ length: 25 }, () => cache.getOrFetch("key-a", mockA))),
      Promise.all(Array.from({ length: 25 }, () => cache.getOrFetch("key-b", mockB))),
    ]);

    assert.equal(fetchA, 1);
    assert.equal(fetchB, 1);
    assert.ok(aResults.every((val) => val === "res-a"));
    assert.ok(bResults.every((val) => val === "res-b"));
  });
});

describe("BoundedLRUCache - Error handling and retry resilience", () => {
  it("cleans up inFlight map if fetchFn rejects so subsequent calls can retry", async () => {
    const cache = new BoundedLRUCache<string>(500);

    let attempts = 0;
    const failingFetch = async () => {
      attempts++;
      await new Promise((r) => setTimeout(r, 20));
      throw new Error(`Upstream API failed on attempt ${attempts}`);
    };

    // Spawn 10 concurrent failing calls
    const failingCallers = Array.from({ length: 10 }, () =>
      cache.getOrFetch("flaky-key", failingFetch)
    );

    const outcomes = await Promise.allSettled(failingCallers);

    // All 10 callers should fail with the exact error
    assert.equal(outcomes.length, 10);
    for (const outcome of outcomes) {
      assert.equal(outcome.status, "rejected");
      if (outcome.status === "rejected") {
        assert.match((outcome.reason as Error).message, /Upstream API failed on attempt 1/);
      }
    }

    // fetch was called exactly once for the batch
    assert.equal(attempts, 1);

    // inFlight map must be thoroughly cleaned up
    assert.equal(cache.inFlightSize, 0, "inFlight map must be empty after rejection");
    assert.equal(cache.get("flaky-key"), undefined, "Nothing should be cached on error");

    // Subsequent call should retry cleanly
    const successfulFetch = async () => {
      attempts++;
      return "recovery-data";
    };

    const recovered = await cache.getOrFetch("flaky-key", successfulFetch);
    assert.equal(recovered, "recovery-data");
    assert.equal(attempts, 2, "Retry must execute a fresh fetch call");
    assert.equal(cache.get("flaky-key"), "recovery-data");
  });
});

describe("BoundedLRUCache - Non-prescriptive Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
  it("exports official regulatory disclaimer referencing FD&C Act § 520(o)(1)(E)", () => {
    assert.ok(CACHE_REGULATORY_DISCLAIMER.length > 0);
    assert.match(CACHE_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/);
    assert.match(CACHE_REGULATORY_DISCLAIMER, /clinical decision support/i);
    assert.match(CACHE_REGULATORY_DISCLAIMER, /independent review/i);
    assert.doesNotMatch(CACHE_REGULATORY_DISCLAIMER, /\bprescribe\b/i);
  });

  it("stores and delivers medical payload references unmodified without prescriptive alterations", () => {
    const cache = new BoundedLRUCache<{ drug: string; warnings: string }>(100);
    const payload = {
      drug: "Warfarin",
      warnings: "Monitor INR closely. Independent clinician assessment required.",
    };

    cache.set("warfarin", payload);
    const retrieved = cache.get("warfarin");

    assert.deepEqual(retrieved, payload);
    assert.doesNotMatch(JSON.stringify(retrieved), /\bprescribe\s+\d+/i);
    assert.doesNotMatch(JSON.stringify(retrieved), /\btake\s+\d+\s*mg\b/i);
  });
});
