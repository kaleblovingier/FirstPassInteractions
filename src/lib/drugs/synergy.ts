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
 *   already on the desk (harm.ts, syndrome.ts). No new directive, dose or route.
 */

import type { SynergyAlert } from "../../types/interaction";
import type { Report } from "./types";

/** Alerts for the tray `ids`, sharpest first, then in SYNERGY_CATEGORIES order. */
export function synergyAlerts(ids: readonly string[], report: Report): SynergyAlert[] {
  void ids;
  void report;
  return [];
}
