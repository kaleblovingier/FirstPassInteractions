/**
 * Synergy alerts: the engine's own rows, gathered by shared mechanism into the six categories of
 * src/types/interaction.ts. A summary of what analyze() already found, for the triage banner and
 * POST /api/cds/analyze.
 *
 * Rules for this module:
 * - An alert exists only when the report holds at least one row in that category. No rule here
 *   finds something the engine did not.
 * - riskLevel is the sharpest gathered row, through toSeverityTier. Never sharper.
 * - clinicalExplanation comes from the gathered rows. actionableGuidance repeats teaching lines
 *   already on the desk (harm.ts, syndrome.ts, qt.ts, metabolites.ts, the engine's clock rows).
 *   No new directive, dose or route.
 */

import { SYNERGY_CATEGORIES, type SynergyAlert, type SynergyCategory } from "../../types/interaction";
import { DRUG_BY_ID } from "./catalog";
import { harmOnDesk, responseSteps } from "./harm";
import { treesFor } from "./metabolites";
import { qtReport } from "./qt";
import { HUNTER_FLAGS, type HunterKey } from "./syndrome";
import { DEFAULT_HOST, SEVERITY_RANK, toSeverityTier, type Finding, type Report } from "./types";

/**
 * Engine rows that form a toxic metabolite, by finding-id suffix, with the metabolite tree that
 * teaches it. Each engine row names its metabolite: cocaethylene; acetaldehyde for disulfiram.
 * Metronidazole with ethanol is left out: its row says "disulfiram-like" and names no metabolite.
 */
const TOXIC_METABOLITE_ROWS: Record<string, string | null> = {
  "pd-cocaethylene": "cocaine",
  "pd-disulfiram": null,
};

const has = (f: Finding, tag: string) => f.tags.includes(tag);

const MATCH: Record<SynergyCategory, (f: Finding) => boolean> = {
  "Serotonin Syndrome": (f) => has(f, "serotonin"),
  "CNS & Respiratory Depression": (f) => has(f, "cns") || has(f, "respiratory"),
  // Food rows that only move amphetamine's urinary clearance are not a crisis; tyramine is.
  "Sympathomimetic Crisis": (f) =>
    has(f, "pressor") || has(f, "tyramine") || (has(f, "stimulant") && !has(f, "food")),
  "QTc Prolongation": (f) => has(f, "qt"),
  // A perpetrator blocking a victim's CYP clearance or activation. P-gp alone is not CYP450.
  "CYP450 Metabolic Bottleneck": (f) =>
    f.kind === "pk" && has(f, "inhibitor") && f.enzymes.some((e) => e.startsWith("CYP")),
  "Toxic Metabolite (e.g., Cocaethylene)": (f) =>
    Object.keys(TOXIC_METABOLITE_ROWS).some((suffix) => f.id.endsWith(`__${suffix}`)),
};

/** The Hunter findings that can make the criteria positive, as syndrome.ts states them. */
const HUNTER_DECISIVE: readonly HunterKey[] = ["spontaneous", "inducible", "ocular", "tremor", "hypertonia"];

const DEPRESSANT_CARDS = ["stack-downers", "naloxone-first", "ghb-steep", "tranq-residual", "alpha2-alone"];
const STIMULANT_CARDS = ["overamp", "mdma-heat"];

function cardLines(ids: string[], cardIds: readonly string[], withBody: boolean): string[] {
  return harmOnDesk(ids)
    .filter((card) => cardIds.includes(card.id))
    .flatMap((card) => (withBody ? [card.body, card.watch] : [card.watch]));
}

function guidanceFor(category: SynergyCategory, ids: string[], rows: Finding[], report: Report): string[] {
  switch (category) {
    case "Serotonin Syndrome":
      return HUNTER_FLAGS.filter((flag) => HUNTER_DECISIVE.includes(flag.key)).map(
        (flag) => `${flag.label}: ${flag.hint}`,
      );
    case "CNS & Respiratory Depression":
      return [
        ...cardLines(ids, DEPRESSANT_CARDS, false),
        ...responseSteps(ids).map((step) => `${step.title}: ${step.body}`),
      ];
    case "Sympathomimetic Crisis":
      return cardLines(ids, STIMULANT_CARDS, true);
    case "QTc Prolongation": {
      const qt = qtReport(ids, DEFAULT_HOST);
      return qt ? [qt.headline, qt.tell, ...qt.amplifiers] : [];
    }
    case "CYP450 Metabolic Bottleneck": {
      // A pk row lists its perpetrator first; the engine's clock row for that perpetrator teaches the timing.
      const perpetrators = new Set(rows.map((f) => f.drugIds[0]));
      return report.findings
        .filter((f) => has(f, "cyp-protocol") && perpetrators.has(f.drugIds[0]))
        .map((f) => f.clinical);
    }
    case "Toxic Metabolite (e.g., Cocaethylene)": {
      const trees = new Set(
        rows
          .map((f) => Object.entries(TOXIC_METABOLITE_ROWS).find(([suffix]) => f.id.endsWith(`__${suffix}`))?.[1])
          .filter((tree): tree is string => typeof tree === "string"),
      );
      return treesFor(ids)
        .filter((tree) => trees.has(tree.id))
        .map((tree) => tree.blurb);
    }
  }
}

function explanationFor(rows: Finding[], implicated: number): string {
  const stack = rows.find((f) => has(f, "stack"));
  if (stack) return stack.clinical;
  const sharpest = rows[0]!;
  if (implicated < 3) return sharpest.clinical;
  const heads = [...new Set(rows.map((f) => f.headline))];
  return `${rows.length} rows on this tray share this mechanism: ${heads.join(", ")}. ${sharpest.clinical}`;
}

/** Alerts for the tray `ids`, sharpest first, then in SYNERGY_CATEGORIES order. */
export function synergyAlerts(ids: readonly string[], report: Report): SynergyAlert[] {
  const tray = ids.filter((id) => Object.hasOwn(DRUG_BY_ID, id));
  const ranked: { rank: number; alert: SynergyAlert }[] = [];
  for (const category of SYNERGY_CATEGORIES) {
    // report.findings is sorted sharpest first, so rows[0] is the sharpest gathered row.
    const rows = report.findings.filter(MATCH[category]);
    if (!rows.length) continue;
    const touched = new Set(rows.flatMap((f) => f.drugIds));
    const implicatedIds = tray.filter((id) => touched.has(id));
    if (!implicatedIds.length) continue;
    ranked.push({
      rank: SEVERITY_RANK[rows[0]!.severity],
      alert: {
        category,
        riskLevel: toSeverityTier(rows[0]!.severity),
        implicatedSubstances: implicatedIds.map((id) => DRUG_BY_ID[id]!.name),
        implicatedIds,
        clinicalExplanation: explanationFor(rows, implicatedIds.length),
        actionableGuidance: [...new Set(guidanceFor(category, tray, rows, report))],
      },
    });
  }
  // A stable sort keeps SYNERGY_CATEGORIES order among equal tiers.
  return ranked.sort((a, b) => b.rank - a.rank).map((entry) => entry.alert);
}
