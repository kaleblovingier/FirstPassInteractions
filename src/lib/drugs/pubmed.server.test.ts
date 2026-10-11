import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { pubmedCache, searchLive } from "./pubmed.server";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;
let lines: string[] = [];

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

const SUMMARY = {
  result: {
    uids: ["111", "222"],
    "111": {
      uid: "111",
      title: "Fluconazole  and warfarin:\n an interaction study",
      pubdate: "2019 Mar",
      source: "Clin Pharmacol Ther",
      authors: [{ name: "Doe J" }, { name: "Roe K" }, { name: "Poe L" }, { name: "Moe M" }],
    },
    "222": { uid: "222", title: "", pubdate: "2021", source: "", authors: [] },
  },
};

const QUERY = "Warfarin AND Fluconazole AND (drug interaction OR CYP OR cytochrome)";

beforeEach(() => {
  pubmedCache.clear();
  lines = [];
  setLogSink((_level, line) => lines.push(line));
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

describe("pubmed.server - searchLive", () => {
  it("refuses an empty or junk query without calling NCBI", async () => {
    const urls = stubFetch(() => json({}));
    for (const q of ["", "  ", "!!", "@@@@"]) {
      const result = await searchLive(q);
      assert.equal(result.ok, false);
      assert.equal(result.reason, "Query too short.");
    }
    assert.equal(urls.length, 0);
  });

  it("searches, summarizes and caches the result", async () => {
    const urls = stubFetch((url) =>
      url.includes("esearch") ? json({ esearchresult: { idlist: ["111", "222"] } }) : json(SUMMARY),
    );
    const result = await searchLive(QUERY);
    assert.equal(result.ok, true);
    assert.deepEqual(result.hits[0], {
      pmid: "111",
      title: "Fluconazole and warfarin: an interaction study",
      year: "2019",
      journal: "Clin Pharmacol Ther",
      authors: "Doe J, Roe K, Poe L",
    });
    assert.equal(result.hits[1]?.title, "Untitled");
    assert.equal(urls.length, 2);
    assert.ok(urls.every((u) => u.includes("tool=firstpass")));

    await searchLive(QUERY);
    assert.equal(urls.length, 2, "repeat search is served from cache");
  });

  it("stops after the search when PubMed returns no ids", async () => {
    const urls = stubFetch(() => json({ esearchresult: { idlist: [] } }));
    const result = await searchLive(QUERY);
    assert.deepEqual(result, { ok: true, hits: [], query: QUERY });
    assert.equal(urls.length, 1);
  });

  it("maps a summary failure to a clear reason, does not cache it, and keeps the query out of logs", async () => {
    const urls = stubFetch((url) =>
      url.includes("esearch") ? json({ esearchresult: { idlist: ["111"] } }) : json({}, 500),
    );
    const result = await searchLive(QUERY);
    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "PubMed answered with an error — live search is unavailable right now. A quiet search is not a green light.",
    );
    await searchLive(QUERY);
    assert.equal(urls.length, 4, "the failed search is asked again");
    for (const line of lines) assert.doesNotMatch(line, /warfarin|fluconazole|term=|esearch\.fcgi/i);
  });
});
