import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./engine";
import { harmOnDesk, responseSteps } from "./harm";
import { treesFor } from "./metabolites";
import { qtReport } from "./qt";
import { synergyAlerts } from "./synergy";
import { HUNTER_FLAGS } from "./syndrome";
import { DEFAULT_HOST, SEVERITY_RANK, toSeverityTier } from "./types";
import { SEVERITY_TIERS, type SeverityTier } from "../../types/interaction";

const alertsFor = (ids: string[]) => synergyAlerts(ids, analyze(ids));
const find = (ids: string[], category: string) => alertsFor(ids).find((a) => a.category === category);
const tierRank = (tier: SeverityTier) => SEVERITY_TIERS.length - SEVERITY_TIERS.indexOf(tier);

describe("synergy - the engine's own rows, by mechanism", () => {
  it("MDMA with sertraline is a serotonin alert at the engine's grade", () => {
    const alert = find(["mdma", "sertraline"], "Serotonin Syndrome");
    assert.equal(alert?.riskLevel, "Severe");
    assert.deepEqual(alert?.implicatedIds, ["mdma", "sertraline"]);
    assert.match(alert?.clinicalExplanation ?? "", /serotonergic/);
  });

  it("cocaine with ethanol names cocaethylene", () => {
    const alert = find(["cocaine", "ethanol"], "Toxic Metabolite (e.g., Cocaethylene)");
    assert.equal(alert?.riskLevel, "Severe");
    assert.deepEqual(alert?.implicatedSubstances, ["Cocaine", "Ethanol"]);
    assert.match(alert?.clinicalExplanation ?? "", /cocaethylene/);
    assert.ok(alert?.actionableGuidance.some((line) => /Cocaethylene/.test(line)));
  });

  it("disulfiram with ethanol is a toxic-metabolite alert at the engine's grade", () => {
    const alert = find(["disulfiram", "ethanol"], "Toxic Metabolite (e.g., Cocaethylene)");
    assert.equal(alert?.riskLevel, toSeverityTier(analyze(["disulfiram", "ethanol"]).highest));
    assert.match(alert?.clinicalExplanation ?? "", /acetaldehyde/);
  });

  it("alprazolam, ethanol and oxycodone lead with the engine's stack row", () => {
    const ids = ["alprazolam", "ethanol", "oxycodone"];
    const alert = find(ids, "CNS & Respiratory Depression");
    assert.equal(alert?.riskLevel, "Severe");
    assert.deepEqual(alert?.implicatedIds, ids);
    assert.match(alert?.clinicalExplanation ?? "", /all depress the CNS/);
    assert.ok(alert?.actionableGuidance.some((line) => /^Naloxone/.test(line)));
    assert.ok(alert?.actionableGuidance.some((line) => /^Recovery position/.test(line)));
  });

  it("methadone, ondansetron and citalopram raise serotonin and QT alerts", () => {
    const ids = ["methadone", "ondansetron", "citalopram"];
    assert.equal(find(ids, "Serotonin Syndrome")?.riskLevel, "Severe");
    const qt = find(ids, "QTc Prolongation");
    assert.equal(qt?.riskLevel, "Severe");
    assert.ok(qt?.actionableGuidance.includes(qtReport(ids, DEFAULT_HOST)!.tell));
  });

  it("three stimulants stay at the engine's moderate grade", () => {
    const ids = ["cocaine", "mdma", "amphetamine"];
    const alert = find(ids, "Sympathomimetic Crisis");
    assert.equal(alert?.riskLevel, "Moderate");
    assert.deepEqual(alert?.implicatedIds, ids);
    assert.match(alert?.clinicalExplanation ?? "", /rows on this tray share this mechanism/);
  });

  it("paroxetine with codeine is a CYP bottleneck that teaches the inhibitor clock", () => {
    const alert = find(["paroxetine", "codeine"], "CYP450 Metabolic Bottleneck");
    assert.equal(alert?.riskLevel, "Severe");
    assert.ok(alert?.actionableGuidance.some((line) => /time-dependent/.test(line)));
  });

  it("an unmapped pair raises nothing", () => {
    assert.deepEqual(alertsFor(["acetaminophen", "loratadine"]), []);
  });
});

describe("synergy - invariants", () => {
  const trays = [
    ["mdma", "sertraline"],
    ["cocaine", "ethanol"],
    ["alprazolam", "ethanol", "oxycodone"],
    ["methadone", "ondansetron", "citalopram"],
    ["cocaine", "mdma", "amphetamine"],
    ["paroxetine", "codeine"],
    ["mdma", "sertraline", "tramadol", "dextromethorphan", "linezolid"],
    ["ketoconazole", "alprazolam"],
    ["phenelzine", "amphetamine"],
    ["heroin", "xylazine", "cocaine"],
    ["sodium-oxybate", "ethanol", "ketamine"],
    ["warfarin", "fluconazole", "ibuprofen"],
  ];

  it("never grades sharper than the engine, and lists sharpest first", () => {
    for (const ids of trays) {
      const report = analyze(ids);
      const alerts = synergyAlerts(ids, report);
      const ceiling = tierRank(toSeverityTier(report.highest));
      for (const alert of alerts) assert.ok(tierRank(alert.riskLevel) <= ceiling, ids.join("+"));
      const ranks = alerts.map((alert) => tierRank(alert.riskLevel));
      assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a), ids.join("+"));
    }
  });

  it("implicates only tray items, in tray order", () => {
    for (const ids of trays) {
      for (const alert of alertsFor(ids)) {
        assert.deepEqual(alert.implicatedIds, ids.filter((id) => alert.implicatedIds.includes(id)));
      }
    }
  });

  it("only repeats guidance lines that already exist on the desk", () => {
    for (const ids of trays) {
      const report = analyze(ids);
      const qt = qtReport(ids, DEFAULT_HOST);
      const known = new Set<string>([
        ...HUNTER_FLAGS.map((flag) => `${flag.label}: ${flag.hint}`),
        ...responseSteps(ids).map((step) => `${step.title}: ${step.body}`),
        ...harmOnDesk(ids).flatMap((card) => [card.body, card.watch]),
        ...(qt ? [qt.headline, qt.tell, ...qt.amplifiers] : []),
        ...report.findings.map((f) => f.clinical),
        ...treesFor(ids).map((tree) => tree.blurb),
      ]);
      for (const alert of synergyAlerts(ids, report)) {
        for (const line of alert.actionableGuidance) assert.ok(known.has(line), `${ids.join("+")}: ${line}`);
      }
    }
  });

  it("keeps SEVERITY_RANK and the tier list in the same order", () => {
    const bySeverity = (["contraindicated", "major", "moderate", "minor", "none"] as const)
      .slice()
      .sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])
      .map(toSeverityTier);
    assert.deepEqual(bySeverity, [...SEVERITY_TIERS]);
  });
});
