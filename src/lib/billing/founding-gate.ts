/**
 * Founding-feature soft gate coach — shared copy when free users hit locked
 * Host / Atlas / Metabolites / Export / full report.
 *
 * Wording mirrors commerce MANUAL_UNLOCK_STEPS / FOUNDING_UNLOCKS (PR #32 on main)
 * without importing Vite-bound commerce.ts (keeps unit tests node-runnable).
 */

/** Keep in sync with COMMERCE.founding. */
const FOUNDING_PRICE = 79;

/** Free desk framing for soft founding-feature coaches. */
export const FREE_DESK_LINE = "Free desk: up to five drugs for mapped collisions.";

/** Founding price line — $79 once. */
export const FOUNDING_PRICE_LINE = `Founding is $${FOUNDING_PRICE} once.`;

/** Short three-step buyer path — same wording as Plans / commerce. */
export const FOUNDING_PATH_SHORT = "Pay → get key → Redeem";

/** Compact step titles aligned with MANUAL_UNLOCK_STEPS. */
export const FOUNDING_PATH_STEPS = [
  { n: "1", title: "Pay $79 once" },
  { n: "2", title: "Get your key" },
  { n: "3", title: "Redeem on this desk" },
] as const;

/**
 * Soft unlock note aligned with FOUNDING_UNLOCKS — educational; not FDA-cleared.
 * Paywall prefers the live commerce export; this copy stays for footer/helpers.
 */
export const FOUNDING_UNLOCKS_SOFT =
  "Founding unlocks host factors, enzyme atlas, metabolite maps, full report, and JSON/CSV export — $79 once. Educational model; not FDA-cleared.";

export type FoundingGateKind =
  | "host"
  | "atlas"
  | "metabolites"
  | "stacks"
  | "export"
  | "report";

export interface FoundingGateCopy {
  title: string;
  blurb: string;
  /** Checkout drawer reason when Unlock / Founding is tapped. */
  reason: string;
}

const FREE_FOUNDING = `${FREE_DESK_LINE} ${FOUNDING_PRICE_LINE} ${FOUNDING_PATH_SHORT} on Plans.`;

export function foundingGateCopy(kind: FoundingGateKind): FoundingGateCopy {
  switch (kind) {
    case "host":
      return {
        title: "Host factors need founding",
        blurb:
          "Phenotype, smoke, alcohol pattern, cannabis route, age, kidney, and pregnancy teaching cards sit behind founding. Ketamine route stays free for the oral teaching demo.",
        reason: `Host factors are a founding surface. ${FREE_FOUNDING}`,
      };
    case "atlas":
      return {
        title: "Enzyme atlas needs founding",
        blurb:
          "Nine pathways with substrates, inhibitors, and inducers for teaching — founding unlocks the full CYP map.",
        reason: `The enzyme atlas is a founding surface. ${FREE_FOUNDING}`,
      };
    case "metabolites":
      return {
        title: "Metabolite maps need founding",
        blurb:
          "Parent → product teaching maps (norketamine, 11-OH-THC, morphine, and kin) open with founding.",
        reason: `Metabolite maps are a founding surface. ${FREE_FOUNDING}`,
      };
    case "stacks":
      return {
        title: "Stack load needs founding",
        blurb: "Serotonin, CNS, QT, pressor, and NMDA meters come with the founding host license.",
        reason: `Stack-load meters are a founding surface. ${FREE_FOUNDING}`,
      };
    case "export":
      return {
        title: "Export needs founding",
        blurb:
          "JSON and CSV export for the lab book ships with founding / lab — paste a redeemed key to unlock.",
        reason: `JSON/CSV export is a founding surface. ${FREE_FOUNDING}`,
      };
    case "report":
      return {
        title: "Full report needs founding",
        blurb:
          "The copyable collision report with host context is a licensed surface. Free desk still shows cards on the tray.",
        reason: `The full collision report is a founding surface. ${FREE_FOUNDING}`,
      };
  }
}

/** Compact coach footer shared by soft overlays. */
export function foundingGateFooter(): string {
  return `${FREE_DESK_LINE} ${FOUNDING_PRICE_LINE} ${FOUNDING_PATH_SHORT}. ${FOUNDING_UNLOCKS_SOFT}`;
}
