import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { SynergyAlert } from "@/types/interaction";
import { SynergyBannerView } from "./synergy-banner";

const alerts: SynergyAlert[] = [
  {
    category: "CNS & Respiratory Depression",
    riskLevel: "Severe",
    implicatedSubstances: ["Oxycodone", "Alprazolam"],
    implicatedIds: ["oxycodone", "alprazolam"],
    clinicalExplanation: "Two sedatives stack on breathing.",
    actionableGuidance: ["Naloxone covers the opioid only."],
  },
  {
    category: "QTc Prolongation",
    riskLevel: "Low",
    implicatedSubstances: ["A", "B"],
    implicatedIds: ["a", "b"],
    clinicalExplanation: "Small QT stack.",
    actionableGuidance: [],
  },
];

describe("SynergyBannerView", () => {
  it("renders nothing without alerts", () => {
    assert.equal(renderToStaticMarkup(<SynergyBannerView alerts={[]} />), "");
  });
  it("shows category, tier chip, names, explanation and guidance behind a disclosure", () => {
    const html = renderToStaticMarkup(<SynergyBannerView alerts={alerts} onOpenHarm={() => {}} />);
    assert.ok(html.includes("CNS &amp; Respiratory Depression"));
    assert.ok(html.includes("Serious concern"));
    assert.ok(html.includes("Mild note"));
    assert.ok(html.includes("Oxycodone, Alprazolam"));
    assert.match(html, /<details[^>]*>.*Naloxone covers the opioid only\./s);
  });
  it("links the harm-reduction tab for depressants only, and loud tiers come first", () => {
    const html = renderToStaticMarkup(<SynergyBannerView alerts={[...alerts].reverse()} onOpenHarm={() => {}} />);
    assert.equal(html.split("Open harm-reduction teaching").length - 1, 1);
    assert.ok(html.indexOf("Respiratory") < html.indexOf("QTc"));
  });
});
