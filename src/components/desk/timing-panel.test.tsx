import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { Timeline } from "@/lib/drugs/types";
import { TIMING_CAVEAT, TimingSketch } from "./timing-panel";

const data: Timeline = {
  rows: [
    { id: "ketamine", name: "Ketamine", halfLifeH: 2.5, source: "FirstPass PK shelf", hoursAgo: 5, remaining: 0.25 },
    { id: "ethanol", name: "Alcohol", note: "Cleared at a near-fixed rate, not by half-life." },
    { id: "alprazolam", name: "Alprazolam" },
  ],
  pairs: [
    { pair: ["ketamine", "alprazolam"], severity: "major", activeOverlapPercent: 25 },
    { pair: ["ketamine", "ethanol"], severity: "moderate", holds: "The label clock outlasts the half-life." },
    { pair: ["ethanol", "alprazolam"], severity: "none" },
  ],
};

describe("TimingSketch", () => {
  const html = renderToStaticMarkup(<TimingSketch data={data} takenAt={{ ketamine: 0 }} onSet={() => {}} />);
  it("states the caveat, labels inputs and shows the share left as text", () => {
    assert.ok(html.includes(TIMING_CAVEAT));
    assert.match(html, /<label[^>]*for="taken-ketamine"/);
    assert.ok(html.includes("25% left"));
    assert.ok(html.includes("Source: FirstPass PK shelf"));
    assert.ok(html.includes("Clear last taken time for Ketamine"));
  });
  it("shows a note instead of a bar, and says plainly when there is no half-life", () => {
    assert.ok(html.includes("Cleared at a near-fixed rate"));
    assert.ok(html.includes("no half-life for this item"));
  });
  it("shows the overlap percent, or the holds sentence instead, beside the severity chip", () => {
    assert.ok(html.includes("25% overlap"));
    assert.ok(html.includes("The label clock outlasts the half-life."));
    assert.ok(html.includes("Serious concern"));
    assert.ok(html.includes("Set both times to sketch the overlap."));
  });
});
