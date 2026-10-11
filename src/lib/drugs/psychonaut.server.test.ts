import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { comboCache, lookupPsychonaut, wikiCache } from "./psychonaut.server";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

interface Call {
  url: string;
  start: number;
  end: number;
}

function stubFetch(route: (url: string) => Response, delayMs = 20) {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const call: Call = { url: String(input), start: Date.now(), end: 0 };
    calls.push(call);
    await new Promise((r) => setTimeout(r, delayMs));
    call.end = Date.now();
    return route(call.url);
  }) as typeof fetch;
  return calls;
}

function wiki(title: string, extract: string) {
  return json({ query: { pages: { "1": { title, extract, fullurl: `https://psychonautwiki.org/wiki/${title}` } } } });
}

function healthy(url: string) {
  if (url.includes("psychonautwiki.org")) {
    return url.includes("MDMA")
      ? wiki("MDMA", "MDMA is an entactogen of the amphetamine class.")
      : wiki("Ketamine", "Ketamine is a dissociative anesthetic.");
  }
  if (url.includes("tripsit")) {
    return json({ err: null, data: [{ status: "Caution", note: "Both raise heart rate." }] });
  }
  return json({}, 500);
}

beforeEach(() => {
  wikiCache.clear();
  comboCache.clear();
  setLogSink(() => undefined);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

describe("psychonaut.server - lookupPsychonaut", () => {
  it("returns an empty pack without calling upstream for unknown or inherited ids", async () => {
    const calls = stubFetch(healthy);
    assert.deepEqual(await lookupPsychonaut([]), { ok: false, pages: [], combo: null });
    assert.deepEqual(await lookupPsychonaut(["constructor", "toString", "not-a-drug"]), {
      ok: false,
      pages: [],
      combo: null,
    });
    assert.equal(calls.length, 0);
  });

  it("asks both wiki pages and the TripSit combo at the same time", async () => {
    const calls = stubFetch(healthy);
    const pack = await lookupPsychonaut(["mdma", "ketamine"]);

    assert.equal(pack.ok, true);
    assert.deepEqual(
      pack.pages.map((p) => p.extract),
      ["MDMA is an entactogen of the amphetamine class.", "Ketamine is a dissociative anesthetic."],
    );
    assert.deepEqual(pack.combo, {
      a: "MDMA",
      b: "Ketamine",
      status: "Caution",
      note: "Both raise heart rate.",
      source: "TripSit combo API",
      ok: true,
    });
    assert.equal(calls.length, 3);
    const tripsit = calls.find((c) => c.url.includes("tripsit"))!;
    const firstWikiDone = Math.min(...calls.filter((c) => c.url.includes("psychonautwiki")).map((c) => c.end));
    assert.ok(tripsit.start <= firstWikiDone, "TripSit is asked before the wiki pages come back");
  });

  it("keeps the local chart line when TripSit fails, and retries it next time", async () => {
    const calls = stubFetch((url) => (url.includes("tripsit") ? json({}, 500) : healthy(url)), 2);
    const pack = await lookupPsychonaut(["mdma", "ketamine"]);
    assert.equal(pack.ok, true, "the wiki pages still answered");
    assert.equal(pack.combo?.ok, false);
    assert.equal(pack.combo?.reason, "TripSit did not answer. Local chart still stands.");

    await lookupPsychonaut(["mdma", "ketamine"]);
    assert.equal(calls.filter((c) => c.url.includes("tripsit")).length, 2);
    assert.equal(calls.filter((c) => c.url.includes("psychonautwiki")).length, 2, "wiki answers were cached");
  });

  it("caches a TripSit 'no row' answer as an answer", async () => {
    const calls = stubFetch(
      (url) => (url.includes("tripsit") ? json({ err: true, error: { msg: "No interaction data." } }) : healthy(url)),
      2,
    );
    const pack = await lookupPsychonaut(["mdma", "ketamine"]);
    assert.equal(pack.combo?.ok, false);
    assert.equal(pack.combo?.reason, "No interaction data.");
    await lookupPsychonaut(["mdma", "ketamine"]);
    assert.equal(calls.filter((c) => c.url.includes("tripsit")).length, 1);
  });

  it("reports a wiki failure per page without failing the other page", async () => {
    stubFetch((url) => (url.includes("psychonautwiki") && url.includes("MDMA") ? json({}, 502) : healthy(url)), 2);
    const pack = await lookupPsychonaut(["mdma", "ketamine"]);
    assert.equal(pack.pages[0]?.reason, "PsychonautWiki did not answer.");
    assert.equal(pack.pages[0]?.url, "https://psychonautwiki.org/wiki/MDMA");
    assert.equal(pack.pages[1]?.extract, "Ketamine is a dissociative anesthetic.");
  });
});
