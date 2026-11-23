import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { Timeline } from "@/lib/drugs/types";
import { TIMING_CAVEAT, TimingSketch, formatFiveHalfLives } from "./timing-panel";

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
  it("shows 0 h and 48 h quick pills, ~5 half-lives text, and aria-pressed active state", () => {
    assert.ok(html.includes('aria-label="Ketamine: 0 hours ago"'));
    assert.ok(html.includes('aria-label="Ketamine: 48 hours ago"'));
    assert.ok(html.includes("~5 half-lives (~12.5 h) to ~97% elimination"));

    const activeData: Timeline = {
      rows: [
        { id: "ketamine", name: "Ketamine", halfLifeH: 2.5, source: "FirstPass PK shelf", hoursAgo: 4, remaining: 0.33 },
        { id: "alprazolam", name: "Alprazolam", halfLifeH: 11, source: "FirstPass PK shelf" },
      ],
      pairs: [],
    };
    const activeHtml = renderToStaticMarkup(<TimingSketch data={activeData} takenAt={{ ketamine: 0 }} onSet={() => {}} />);
    assert.match(
      activeHtml,
      /<button[^>]*border-ink bg-ink text-bg[^>]*aria-pressed="true"[^>]*aria-label="Ketamine: 4 hours ago"[^>]*>4 h<\/button>/,
    );
    assert.match(
      activeHtml,
      /<button[^>]*aria-pressed="false"[^>]*aria-label="Ketamine: 0 hours ago"[^>]*>0 h<\/button>/,
    );
    assert.ok(activeHtml.includes("~5 half-lives (~55 h / 2.3 d)"));
  });
  it("renders batch controls only for multi-row shelves with half-lives and disables clear when empty", () => {
    assert.ok(html.includes("Set all to 0 h"));
    assert.match(html, /<button[^>]*>Clear all times<\/button>/);
    assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>Clear all times<\/button>/);

    const noTimes: Timeline = {
      rows: [
        { id: "ketamine", name: "Ketamine", halfLifeH: 2.5, source: "FirstPass PK shelf" },
        { id: "alprazolam", name: "Alprazolam", halfLifeH: 11, source: "FirstPass PK shelf" },
      ],
      pairs: [],
    };
    const noTimesHtml = renderToStaticMarkup(<TimingSketch data={noTimes} takenAt={{}} onSet={() => {}} />);
    assert.ok(noTimesHtml.includes("Set all to 0 h"));
    assert.match(noTimesHtml, /<button[^>]*disabled=""[^>]*>Clear all times<\/button>/);

    const singleRow: Timeline = {
      rows: [{ id: "ketamine", name: "Ketamine", halfLifeH: 2.5, source: "FirstPass PK shelf" }],
      pairs: [],
    };
    const singleHtml = renderToStaticMarkup(<TimingSketch data={singleRow} takenAt={{}} onSet={() => {}} />);
    assert.equal(singleHtml.includes("Set all to 0 h"), false);
    assert.equal(singleHtml.includes("Clear all times"), false);

    const noHalfLives: Timeline = {
      rows: [
        { id: "ethanol", name: "Alcohol", note: "Cleared at a near-fixed rate, not by half-life." },
        { id: "alprazolam", name: "Alprazolam" },
      ],
      pairs: [],
    };
    const noHalfLivesHtml = renderToStaticMarkup(<TimingSketch data={noHalfLives} takenAt={{}} onSet={() => {}} />);
    assert.equal(noHalfLivesHtml.includes("Set all to 0 h"), false);
  });
});

describe("formatFiveHalfLives", () => {
  it("formats hours below 48 h and adds days at or above 48 h", () => {
    assert.equal(formatFiveHalfLives(2.5), "~5 half-lives (~12.5 h)");
    assert.equal(formatFiveHalfLives(3), "~5 half-lives (~15 h)");
    assert.equal(formatFiveHalfLives(9.6), "~5 half-lives (~48 h / 2 d)");
    assert.equal(formatFiveHalfLives(10), "~5 half-lives (~50 h / 2.1 d)");
    assert.equal(formatFiveHalfLives(24), "~5 half-lives (~120 h / 5 d)");
  });
});
