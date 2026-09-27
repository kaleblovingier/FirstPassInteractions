import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBriefPermalink,
  buildBriefUrl,
  buildRegimenBrief,
  isPairFinding,
  partitionFindings,
} from "./brief.ts";
import type { Finding } from "./types.ts";

function finding(partial: Partial<Finding> & Pick<Finding, "id" | "drugIds" | "headline">): Finding {
  return {
    severity: "major",
    kind: "pk",
    enzymes: [],
    effect: "↑ exposure",
    mechanism: "CYP3A4 inhibition",
    clinical: "Higher levels and more side effects.",
    tags: [],
    ...partial,
  };
}

test("isPairFinding requires exactly two non-virtual drug ids", () => {
  assert.equal(isPairFinding(finding({ id: "a", drugIds: ["ketamine", "alprazolam"], headline: "K × A" })), true);
  assert.equal(isPairFinding(finding({ id: "b", drugIds: ["ketamine", "alprazolam", "ethanol"], headline: "triple" })), false);
  assert.equal(
    isPairFinding(finding({ id: "c", drugIds: ["ketamine", "__smoke"], headline: "host" })),
    false,
  );
  assert.equal(
    isPairFinding(finding({ id: "d", drugIds: ["ketamine", "alprazolam", "__smoke"], headline: "pair+virtual" })),
    true,
  );
});

test("partitionFindings sends 2-drug to pairs and 3+ to deskNotes", () => {
  const pair = finding({ id: "p", drugIds: ["ketamine", "alprazolam"], headline: "Ketamine × Alprazolam", severity: "major" });
  const desk = finding({
    id: "d",
    drugIds: ["fluoxetine", "tramadol", "sertraline"],
    headline: "Serotonin stack",
    severity: "moderate",
    kind: "pd",
  });
  const geno = finding({
    id: "g",
    drugIds: ["dextromethorphan"],
    headline: "2D6 PM",
    severity: "moderate",
    kind: "geno",
  });
  const { pairs, deskNotes } = partitionFindings([desk, pair, geno]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]!.id, "p");
  assert.equal(deskNotes.length, 2);
  assert.ok(deskNotes.some((f) => f.id === "d"));
  assert.ok(deskNotes.some((f) => f.id === "g"));
});

test("buildRegimenBrief leads with plain sentence and lists pairs before desk notes", () => {
  const pair = finding({
    id: "p",
    drugIds: ["ketamine", "alprazolam"],
    headline: "Ketamine × Alprazolam",
    severity: "major",
    clinical: "Sleepiness and breathing problems.",
    mechanism: "NMDA + GABA sedation",
  });
  const desk = finding({
    id: "d",
    drugIds: ["a", "b", "c"],
    headline: "Triple CNS",
    severity: "moderate",
  });
  const text = buildRegimenBrief({
    names: "Ketamine + Alprazolam + Extra",
    findings: [desk, pair],
    highest: "major",
  });
  assert.match(text, /^FirstPass regimen brief · Ketamine \+ Alprazolam \+ Extra/m);
  assert.match(text, /Sharpest pair \(Serious concern\): Ketamine × Alprazolam/);
  assert.match(text, /In plain English:/);
  assert.match(text, /Pairs, worst first:/);
  assert.match(text, /Whole-desk notes:/);
  assert.match(text, /Educational desk only/);
  assert.match(text, /Does not pick a milligram/);
  const pairsIdx = text.indexOf("Pairs, worst first:");
  const deskIdx = text.indexOf("Whole-desk notes:");
  assert.ok(pairsIdx < deskIdx);
  assert.ok(text.indexOf("Ketamine × Alprazolam") < text.indexOf("Triple CNS") || text.includes("1. Serious concern — Ketamine"));
});

test("buildRegimenBrief says plainly when no pairs", () => {
  const text = buildRegimenBrief({ names: "Clozapine", findings: [], highest: "none" });
  assert.match(text, /No mapped collisions/);
  assert.match(text, /not a green light/);
  assert.match(text, /\(none\)/);
});

test("permalink helpers encode ids in tray order", () => {
  const rel = buildBriefPermalink(["ketamine", "alprazolam", "ethanol"]);
  assert.equal(rel, "/?brief=ketamine,alprazolam,ethanol");
  const abs = buildBriefUrl(["ketamine", "alprazolam"], { base: "https://example.test/" });
  assert.equal(abs, "https://example.test/?brief=ketamine%2Calprazolam");
  const capped = buildBriefPermalink(Array.from({ length: 12 }, (_, i) => `d${i}`));
  assert.equal(capped.split(",").length, 8);
});

test("findingsOnTray drops off-tray grapefruit so brief lead stays on-tray", () => {
  const onTray = finding({
    id: "ka",
    drugIds: ["ketamine", "alprazolam"],
    headline: "Ketamine × Alprazolam",
    severity: "major",
  });
  const offTray = finding({
    id: "gf",
    drugIds: ["grapefruit", "ketamine"],
    headline: "Grapefruit × Ketamine",
    severity: "contraindicated",
  });
  const text = buildRegimenBrief({
    names: "Ketamine, Alprazolam",
    findings: [offTray, onTray],
    highest: "contraindicated",
    trayIds: ["ketamine", "alprazolam"],
  });
  assert.match(text, /Sharpest pair \(Serious concern\): Ketamine × Alprazolam/);
  assert.doesNotMatch(text, /[Gg]rapefruit/);
});
