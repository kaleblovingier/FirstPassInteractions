import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInteractionReport } from "./interaction-report";
import { buildLiveInteractionReport, type LiveSources } from "./interaction-report.server";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

const entries = [
  { rawInput: "Sertraline", id: "sertraline" },
  { rawInput: "Molly", id: "mdma" },
];

const good: LiveSources = {
  psychonaut: async () => ({
    ok: true,
    pages: [],
    combos: [
      {
        ids: ["sertraline", "mdma"],
        a: "Sertraline",
        b: "MDMA",
        status: "Caution",
        note: "Blunts the effect.",
        source: "TripSit combo API",
        ok: true,
      },
    ],
  }),
  labels: async () => ({
    ok: true,
    rxcuis: ["36437", "1234"],
    pairs: [
      { a: "Sertraline", b: "MDMA", source: "OpenFDA label", severity: "named", description: "excerpt text", identity: "x" },
    ],
    classes: [],
  }),
  pubmed: async () => ({
    ok: true,
    pairs: [
      {
        pair: ["sertraline", "mdma"],
        query: "q",
        ok: true,
        hits: [{ pmid: "111", title: "A live hit", year: "2020", journal: "J", authors: "A" }],
      },
    ],
  }),
};

const boom = (): Promise<never> => Promise.reject(new Error("upstream down"));
const engineRows = buildInteractionReport(entries).pairwiseInteractions;

describe("buildLiveInteractionReport", () => {
  it("adds quoted outside rows with Unknown severity and live literature without a takeaway", async () => {
    const { report, warnings } = await buildLiveInteractionReport(entries, { sources: good });
    assert.deepEqual(warnings, []);
    assert.deepEqual(report.pairwiseInteractions.slice(0, engineRows.length), engineRows);
    const extra = report.pairwiseInteractions.slice(engineRows.length);
    assert.deepEqual(extra.map((r) => r.source), ["psychonaut", "rxnav"]);
    assert.ok(extra.every((r) => r.severity === "Unknown"));
    assert.match(extra[0]!.description, /Caution/);
    assert.match(extra[1]!.description, /excerpt text/);
    const live = report.literature.find((l) => l.pmid === "111");
    assert.ok(live && live.takeaway === undefined);
    assert.equal(report.substances.find((s) => s.id === "mdma")?.rxcui, "1234");
  });

  for (const name of ["psychonaut", "labels", "pubmed"] as const) {
    it(`names ${name} in a warning when it alone rejects, and keeps the other sources`, async () => {
      const { report, warnings } = await buildLiveInteractionReport(entries, {
        sources: { ...good, [name]: boom },
      });
      assert.equal(warnings.length, 1);
      assert.match(warnings[0]!, /not a clearance/);
      assert.deepEqual(report.pairwiseInteractions.slice(0, engineRows.length), engineRows);
      const live = report.pairwiseInteractions.slice(engineRows.length);
      assert.equal(live.length, name === "pubmed" ? 2 : 1);
    });
  }

  it("times out a slow source and still returns the engine rows", async () => {
    const slow = () => new Promise<never>(() => {});
    const { report, warnings } = await buildLiveInteractionReport(entries, {
      budgetMs: 30,
      sources: { ...good, labels: slow },
    });
    assert.equal(warnings.length, 1);
    assert.deepEqual(report.pairwiseInteractions.slice(0, engineRows.length), engineRows);
  });

  it("warns for every source when all of them fail", async () => {
    const { report, warnings } = await buildLiveInteractionReport(entries, {
      sources: { psychonaut: boom, labels: boom, pubmed: boom },
    });
    assert.equal(warnings.length, 3);
    assert.deepEqual(report.pairwiseInteractions, engineRows);
  });

  it("with fetch down, real lookups never turn into a clean result", async () => {
    setLogSink(() => {});
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const { report, warnings } = await buildLiveInteractionReport(entries, { budgetMs: 5_000 });
    assert.ok(warnings.length >= 1);
    assert.deepEqual(report.pairwiseInteractions.slice(0, engineRows.length), engineRows);
  });
});
