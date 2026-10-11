import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { cpicCache, lookupCpic } from "./cpic.server";
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

const CLOPIDOGREL = [
  {
    drugid: "RxNorm:32968",
    name: "clopidogrel",
    guideline: {
      name: "CPIC Guideline for CYP2C19 and Clopidogrel",
      url: "https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
      pharmgkbid: ["PA166104948"],
    },
  },
];

beforeEach(() => {
  cpicCache.clear();
  setLogSink(() => undefined);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

describe("cpic.server - lookupCpic", () => {
  it("refuses a too-short name without calling CPIC", async () => {
    const urls = stubFetch(() => json([]));
    const result = await lookupCpic(" (x) ");
    assert.deepEqual(result, { ok: false, query: "", hits: [], reason: "Name too short." });
    assert.equal(urls.length, 0);
  });

  it("returns guideline hits and serves repeats, in any case, from cache", async () => {
    const urls = stubFetch(() => json(CLOPIDOGREL));
    const result = await lookupCpic("Clopidogrel");
    assert.equal(result.ok, true);
    assert.equal(result.reason, undefined);
    assert.deepEqual(result.hits[0], {
      drug: "clopidogrel",
      drugid: "RxNorm:32968",
      guideline: "CPIC Guideline for CYP2C19 and Clopidogrel",
      url: "https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
      pharmgkb: "PA166104948",
    });
    await lookupCpic("CLOPIDOGREL");
    assert.equal(urls.length, 1);
  });

  it("falls back to a partial-name search when the exact name has no row", async () => {
    const urls = stubFetch((url) => (url.includes("name=eq.") ? json([]) : json(CLOPIDOGREL)));
    const result = await lookupCpic("Clopidogrel");
    assert.equal(result.hits.length, 1);
    assert.equal(urls.length, 2);
    assert.match(urls[1]!, /name=ilike\./);
  });

  it("says plainly when CPIC has no guideline row", async () => {
    stubFetch(() => json([{ drugid: "x", name: "acetaminophen", guideline: null }]));
    const result = await lookupCpic("Acetaminophen");
    assert.equal(result.ok, true);
    assert.deepEqual(result.hits, []);
    assert.equal(result.reason, "CPIC has no guideline row for this name.");
  });

  it("maps an HTTP failure to a clear reason and does not cache it", async () => {
    const urls = stubFetch(() => json({ message: "upstream exploded at /v1/drug" }, 500));
    const result = await lookupCpic("Clopidogrel");
    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "CPIC answered with an error — the guideline lookup is unavailable right now. That is not a green light; open cpicpgx.org/guidelines.",
    );
    await lookupCpic("Clopidogrel");
    assert.equal(urls.length, 2, "a failure is retried on the next ask");
  });

  it("treats a non-array payload as unreadable", async () => {
    stubFetch(() => json({ rows: CLOPIDOGREL }));
    const result = await lookupCpic("Clopidogrel");
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /^CPIC sent an answer we couldn't read — /);
  });

  it("coalesces concurrent asks for the same name into one call", async () => {
    const urls = stubFetch(() => json(CLOPIDOGREL));
    const results = await Promise.all([lookupCpic("Clopidogrel"), lookupCpic("clopidogrel"), lookupCpic("Clopidogrel")]);
    assert.equal(urls.length, 1);
    assert.ok(results.every((r) => r.hits.length === 1));
  });
});
