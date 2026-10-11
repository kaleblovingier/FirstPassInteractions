import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { classCache, lookupInteractions, reportCache } from "./rxnav.server";
import { liveCache } from "./live.server";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** The generic name inside an OpenFDA search, e.g. openfda.generic_name:"Warfarin". */
function searched(url: string) {
  const m = /generic_name:"([^"]+)"/.exec(decodeURIComponent(url));
  return m ? m[1]!.toLowerCase() : "";
}

const INTERACTIONS: Record<string, string> = {
  warfarin: "Inhibitors of CYP2C9 such as fluconazole and amiodarone increase warfarin exposure.",
  fluconazole: "Fluconazole raises the INR when given with warfarin; monitor closely.",
  amiodarone: "Amiodarone inhibits CYP2C9 and CYP3A4.",
};

const RXCUI: Record<string, string> = { warfarin: "11289", fluconazole: "4450", amiodarone: "703" };

interface Stub {
  urls: string[];
  peakLabels: number;
}

function stubFetch(override?: (url: string) => Response | undefined, delayMs = 2): Stub {
  const stub: Stub = { urls: [], peakLabels: 0 };
  let labels = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    stub.urls.push(url);
    const isLabel = url.includes("label.json");
    if (isLabel) stub.peakLabels = Math.max(stub.peakLabels, ++labels);
    try {
      await new Promise((r) => setTimeout(r, delayMs));
      const forced = override?.(url);
      if (forced) return forced;
      if (isLabel) {
        const name = searched(url);
        const text = INTERACTIONS[name];
        return text
          ? json({ results: [{ drug_interactions: [text], openfda: { rxcui: [RXCUI[name]] } }] })
          : json({ error: { code: "NOT_FOUND" } }, 404);
      }
      if (url.includes("api.fda.gov")) return json({ error: { code: "NOT_FOUND" } }, 404);
      if (url.includes("/REST/rxcui.json")) {
        const name = new URL(url).searchParams.get("name")?.toLowerCase() ?? "";
        return json({ idGroup: RXCUI[name] ? { rxnormId: [RXCUI[name]] } : {} });
      }
      if (url.includes("/related.json")) return json({ relatedGroup: { conceptGroup: [] } });
      if (url.includes("rxclass/class/byRxcui.json")) {
        const source = new URL(url).searchParams.get("relaSource");
        const name = source === "ATC" ? "Antithrombotic agents" : "Vitamin K Antagonist";
        return json({
          rxclassDrugInfoList: {
            rxclassDrugInfo: [
              { rxclassMinConceptItem: { className: name, classType: source } },
              { rxclassMinConceptItem: { className: name, classType: source } },
            ],
          },
        });
      }
      if (url.includes("pubchem")) return json({ error: "not found" }, 404);
      if (url.includes("dailymed")) return json({ data: [] });
      return json({}, 500);
    } finally {
      if (isLabel) labels--;
    }
  }) as typeof fetch;
  return stub;
}

beforeEach(() => {
  liveCache.clear();
  reportCache.clear();
  classCache.clear();
  setLogSink(() => undefined);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

describe("rxnav.server - lookupInteractions input guard", () => {
  it("asks for two labeled drugs without calling upstream", async () => {
    const stub = stubFetch();
    for (const ids of [[], ["warfarin"], ["warfarin", "warfarin"], ["warfarin", "grapefruit"], ["constructor", "toString"], ["warfarin", "__proto__"]]) {
      const report = await lookupInteractions(ids);
      assert.equal(report.ok, true);
      assert.equal(report.reason, "Put two labeled drugs on the desk.");
      assert.deepEqual(report.pairs, []);
    }
    assert.equal(stub.urls.length, 0);
  });
});

describe("rxnav.server - lookupInteractions scan", () => {
  it("finds partner names in both labels and returns de-duplicated RxClass rows", async () => {
    const stub = stubFetch();
    const report = await lookupInteractions(["warfarin", "fluconazole"]);

    assert.equal(report.ok, true);
    assert.equal(report.reason, undefined);
    assert.deepEqual(
      report.pairs.map((p) => `${p.a}>${p.b}`),
      ["Warfarin>Fluconazole", "Fluconazole>Warfarin"],
    );
    assert.ok(report.pairs.every((p) => p.source === "OpenFDA label" && p.severity === "named"));
    assert.deepEqual(report.rxcuis, ["11289", "4450"]);
    assert.deepEqual(
      report.classes.map((c) => `${c.drug}|${c.source}|${c.className}`),
      [
        "Warfarin|ATC|Antithrombotic agents",
        "Warfarin|FDASPL|Vitamin K Antagonist",
        "Fluconazole|ATC|Antithrombotic agents",
        "Fluconazole|FDASPL|Vitamin K Antagonist",
      ],
    );
    assert.equal(stub.urls.filter((u) => u.includes("rxclass")).length, 4);

    const again = await lookupInteractions(["fluconazole", "warfarin"]);
    assert.deepEqual(again, report, "a complete scan is cached under the sorted id set");
    assert.equal(stub.urls.filter((u) => u.includes("rxclass")).length, 4);
  });

  it("keeps the no-partner reason the desk softens when labels answer but name no partner", async () => {
    stubFetch();
    const report = await lookupInteractions(["amiodarone", "fluconazole"]);
    assert.equal(report.ok, true);
    assert.deepEqual(report.pairs, []);
    assert.match(report.reason ?? "", /retired the RxNav Interaction API/);
    assert.match(report.reason ?? "", /No partner name/);
  });

  it("names a label that failed instead of implying no partner was found", async () => {
    stubFetch((url) => (url.includes("label.json") && searched(url) === "fluconazole" ? json({}, 503) : undefined));
    const report = await lookupInteractions(["warfarin", "fluconazole"]);

    assert.equal(report.ok, true);
    assert.deepEqual(
      report.pairs.map((p) => `${p.a}>${p.b}`),
      ["Warfarin>Fluconazole"],
      "the label that answered is still scanned",
    );
    assert.equal(
      report.reason,
      "OpenFDA didn't answer for Fluconazole — that label wasn't scanned, so this partner list is incomplete; the Prescribing Information still governs.",
    );
    assert.equal(reportCache.size(), 0, "an incomplete scan is not cached");
  });

  it("returns ok:false with a clear reason when no label could be scanned", async () => {
    stubFetch((url) => (url.includes("label.json") ? json({}, 500) : undefined));
    const report = await lookupInteractions(["warfarin", "fluconazole"]);
    assert.equal(report.ok, false);
    assert.equal(
      report.reason,
      "OpenFDA didn't answer — no label excerpts were scanned for partners; the Prescribing Information still governs.",
    );
    assert.equal(report.rxcuis.length, 2, "RxNorm identities and classes still come back");
  });

  it("notes missing drug classes when RxClass fails but partners were found", async () => {
    stubFetch((url) => (url.includes("rxclass") ? json({}, 500) : undefined));
    const report = await lookupInteractions(["warfarin", "fluconazole"]);
    assert.equal(report.ok, true);
    assert.equal(report.pairs.length, 2);
    assert.deepEqual(report.classes, []);
    assert.equal(report.reason, "RxClass answered with an error — drug classes may be missing this time.");
  });

  it("scans at most four drugs at a time on an eight-drug desk", async () => {
    const stub = stubFetch(undefined, 15);
    const ids = ["warfarin", "fluconazole", "amiodarone", "simvastatin", "clarithromycin", "diltiazem", "digoxin", "metoprolol"];
    const report = await lookupInteractions(ids);
    assert.equal(report.ok, true);
    assert.equal(stub.urls.filter((u) => u.includes("label.json")).length, 8);
    assert.ok(stub.peakLabels <= 4, `peak concurrent label pulls ${stub.peakLabels}`);
    assert.ok(stub.peakLabels >= 2, "drugs are still scanned concurrently");
  });
});
