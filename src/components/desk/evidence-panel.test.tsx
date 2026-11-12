import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { CITES, type PairEvidencePack } from "@/lib/drugs/pubmed";
import { PairEvidenceView } from "./evidence-panel";

const curated = CITES.find((c) => c.pair)!;
const [a, b] = curated.pair!;
const pack: PairEvidencePack = {
  ok: true,
  pairs: [
    { pair: [a, b], query: "q", ok: true, hits: [{ pmid: "1", title: "Live hit", year: "2020", journal: "J", authors: "X" }] },
    { pair: ["ketamine", "alprazolam"], query: "q", ok: false, hits: [], reason: "PubMed did not answer." },
  ],
};

describe("PairEvidenceView", () => {
  const html = renderToStaticMarkup(<PairEvidenceView pack={pack} />);
  it("shows curated shelf papers before live hits, as links", () => {
    assert.ok(html.indexOf(curated.title.slice(0, 20)) !== -1);
    assert.ok(html.indexOf("Curated shelf") < html.indexOf("Live PubMed hit"));
    assert.ok(html.includes("https://pubmed.ncbi.nlm.nih.gov/1/"));
  });
  it("keeps the failed pair's reason and the quiet-search line", () => {
    assert.ok(html.includes("PubMed did not answer."));
    assert.ok(html.includes("A quiet search is not a green light."));
  });
});
