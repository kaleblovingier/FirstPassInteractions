import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { pairCache, pairQuery, searchPairEvidence, setNcbiGate } from "./pubmed.server";
import { createNcbiGate } from "../server/ncbi-gate";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;
const IDS = ["mdma", "ketamine", "lsd", "dmt", "mescaline"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

let t = 0;
let calls: Array<{ url: string; at: number }> = [];

function stub(route: (url: string) => Response) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push({ url, at: t });
    return route(url);
  }) as typeof fetch;
}

/** Every esearch answers with a PMID derived from its term; esummary names each uid. */
function healthy(url: string) {
  if (url.includes("esearch")) {
    const n = calls.filter((c) => c.url.includes("esearch")).length;
    return json({ esearchresult: { idlist: [String(1000 + n)] } });
  }
  const id = new URL(url).searchParams.get("id") ?? "";
  const uids = id.split(",");
  return json({
    result: {
      uids,
      ...Object.fromEntries(uids.map((u) => [u, { uid: u, title: `Paper ${u}`, pubdate: "2020", source: "J", authors: [] }])),
    },
  });
}

beforeEach(() => {
  t = 100_000;
  calls = [];
  pairCache.clear();
  setLogSink(() => undefined);
  setNcbiGate(
    createNcbiGate({
      now: () => t,
      sleep: async (ms) => {
        t += ms;
      },
    }),
  );
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setNcbiGate(null);
  setLogSink(null);
});

describe("pubmed.server - searchPairEvidence", () => {
  it("gives 3, 6 and 10 entries for 3, 4 and 5 ids, with one esummary", async () => {
    for (const [n, want] of [[3, 3], [4, 6], [5, 10]] as const) {
      calls = [];
      pairCache.clear();
      stub(healthy);
      const pack = await searchPairEvidence(IDS.slice(0, n));
      assert.equal(pack.pairs.length, want);
      assert.equal(calls.filter((c) => c.url.includes("esearch")).length, want);
      assert.equal(calls.filter((c) => c.url.includes("esummary")).length, 1);
      assert.equal(pack.ok, true);
      assert.ok(pack.pairs.every((p) => p.hits.length === 1));
    }
  });

  it("starts no more than 3 requests in any one second", async () => {
    stub(healthy);
    await searchPairEvidence(IDS);
    assert.equal(calls.length, 11);
    for (const c of calls) {
      assert.ok(calls.filter((x) => x.at >= c.at && x.at < c.at + 1000).length <= 3);
    }
  });

  it("keeps one pair's failure with that pair", async () => {
    stub((url) => (url.includes("esearch") && url.includes(encodeURIComponent('"Ketamine"')) && url.includes("LSD") ? json({}, 500) : healthy(url)));
    const pack = await searchPairEvidence(["mdma", "ketamine", "lsd"]);
    const bad = pack.pairs.find((p) => p.pair[0] === "ketamine" && p.pair[1] === "lsd")!;
    assert.equal(bad.ok, false);
    assert.ok(bad.reason?.endsWith("A quiet search is not a green light."));
    assert.equal(pack.pairs.filter((p) => p.ok).length, 2);
    assert.equal(pack.ok, true);
  });

  it("marks pairs not reached in time as not ok, and never caches a failure", async () => {
    stub(healthy);
    setNcbiGate(
      createNcbiGate({
        now: () => t,
        sleep: async (ms) => {
          t += ms;
        },
        maxWaitMs: 500,
      }),
    );
    const pack = await searchPairEvidence(IDS);
    const missed = pack.pairs.filter((p) => !p.ok);
    assert.ok(missed.length > 0);
    assert.ok(missed.every((p) => p.reason?.endsWith("A quiet search is not a green light.")));
    const before = calls.length;
    setNcbiGate(createNcbiGate({ now: () => t, sleep: async (ms) => void (t += ms) }));
    const again = await searchPairEvidence(IDS);
    assert.ok(calls.length > before, "failed pairs were asked again");
    assert.equal(again.pairs.filter((p) => !p.ok).length, 0);
  });

  it("answers a repeated call from the cache with no new request", async () => {
    stub(healthy);
    await searchPairEvidence(["mdma", "ketamine", "lsd"]);
    const n = calls.length;
    const pack = await searchPairEvidence(["mdma", "ketamine", "lsd"]);
    assert.equal(calls.length, n);
    assert.equal(pack.pairs.length, 3);
    assert.ok(pack.pairs.every((p) => p.ok && p.hits.length === 1));
  });

  it("builds queries from catalog names with intact field tags", () => {
    const q = pairQuery("mdma", "ketamine");
    assert.match(q, /\[Title\/Abstract\]/);
    assert.match(q, /humans\[MeSH Terms\]/);
    assert.match(q, /interaction/);
  });
});
