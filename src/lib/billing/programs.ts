/**
 * Program licenses: the shared contract for selling FirstPass to groups
 * (schools, residencies, clinics, OTP teams) instead of one learner at a time.
 *
 * The /for-programs sales page, the quote estimator, the inquiry route, the
 * program-key mint/verify code and Foundry all read from this file. Change a
 * tier here and every surface follows.
 *
 * PRICES ARE A DRAFT. The operator sets the real numbers before this ships.
 *
 * Individual canon does not change: the free desk stays five drugs, and
 * Founding stays $79 once for one person. Program licenses are annual because
 * schools and clinics budget by year and renew by purchase order.
 */

export type ProgramTierId = "team" | "program" | "site";

export interface ProgramTier {
  id: ProgramTierId;
  name: string;
  /** One line under the name on the sales page. */
  tagline: string;
  /** USD per year, before any discount. */
  annual: number;
  /** Seat cap for the honor-system seat count; null = unlimited at one organization. */
  seats: number | null;
  /** Who this tier is sized for. */
  fits: string;
  features: string[];
  highlighted?: boolean;
}

export const PROGRAM_TIERS: readonly ProgramTier[] = [
  {
    id: "team",
    name: "Team",
    tagline: "A clinic, OTP team or small teaching group.",
    annual: 690,
    seats: 15,
    fits: "Ketamine clinics, MAT and OTP teams, preceptor groups",
    features: [
      "Up to 15 people on one program key",
      "Every Founding tool for every seat",
      "Teaching packs and lab-book assignments",
      "Invoice and purchase order accepted",
    ],
  },
  {
    id: "program",
    name: "Program",
    tagline: "A class cohort or a residency program.",
    annual: 2400,
    seats: 100,
    fits: "A PharmD class year, a pharmacy-tech cohort, a residency program",
    highlighted: true,
    features: [
      "Up to 100 people on one program key",
      "Every Founding tool for every seat",
      "Lab-book receipts students can export and submit",
      "Onboarding call for faculty",
      "Invoice and purchase order accepted",
    ],
  },
  {
    id: "site",
    name: "Site",
    tagline: "A whole school, campus or organization.",
    annual: 5900,
    seats: null,
    fits: "Schools of pharmacy, health systems' teaching sites, multi-site programs",
    features: [
      "Unlimited people at one organization",
      "Every Founding tool for every seat",
      "Accessibility conformance report (VPAT) and procurement answers on request",
      "Onboarding call for faculty",
      "Invoice and purchase order accepted",
    ],
  },
];

export const PROGRAM_TIER_BY_ID = Object.fromEntries(PROGRAM_TIERS.map((t) => [t.id, t])) as Record<
  ProgramTierId,
  ProgramTier
>;

export function isProgramTierId(raw: unknown): raw is ProgramTierId {
  return raw === "team" || raw === "program" || raw === "site";
}

/** Multi-year prepay discount, as a fraction off the yearly total. */
export const MULTI_YEAR_DISCOUNT: Record<1 | 2 | 3, number> = { 1: 0, 2: 0.1, 3: 0.15 };

/** Smallest tier whose seat cap covers `seats` people. */
export function tierForSeats(seats: number): ProgramTier {
  const n = Math.max(1, Math.floor(seats) || 1);
  return PROGRAM_TIERS.find((t) => t.seats === null || n <= t.seats) ?? PROGRAM_TIERS[PROGRAM_TIERS.length - 1];
}

/** Estimate shown on the sales page. Not an invoice; the operator confirms every quote. */
export function programQuote(seats: number, years: 1 | 2 | 3 = 1) {
  const tier = tierForSeats(seats);
  const discount = MULTI_YEAR_DISCOUNT[years] ?? 0;
  const total = Math.round(tier.annual * years * (1 - discount));
  const n = Math.max(1, Math.floor(seats) || 1);
  return {
    tier,
    seats: n,
    years,
    discount,
    total,
    perYear: Math.round(total / years),
    perSeatPerYear: Math.round((total / years / n) * 100) / 100,
  };
}

/**
 * Program key shape (minted in Foundry, verified on Redeem):
 *
 *   FP-ORG-<T><YYYYMM>-<BODY>-<SIG>
 *
 * T       tier letter: T team, P program, S site
 * YYYYMM  last month the key works (valid through the end of that month, UTC)
 * BODY    8 hex, derived from the organization name, so re-minting the same
 *         org + tier + end month gives the same key
 * SIG     8 hex HMAC over "ORG:<T><YYYYMM>:<BODY>" with LICENSE_PEPPER
 *
 * A verified program key unlocks the same tools as Founding ("lab") until it ends.
 * Seats are honor-system: there are no accounts and nothing is stored server-side.
 */
export const PROGRAM_KEY_RE = /^FP-ORG-([TPS])(\d{4})(\d{2})-([0-9A-F]{8})-([0-9A-F]{8})$/;

export const PROGRAM_TIER_LETTER: Record<ProgramTierId, "T" | "P" | "S"> = { team: "T", program: "P", site: "S" };

export const PROGRAM_TIER_FROM_LETTER: Record<"T" | "P" | "S", ProgramTierId> = { T: "team", P: "program", S: "site" };

/** Last moment a key ending in `yyyymm` works: the final millisecond of that month, UTC. */
export function programKeyEndsAt(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1) - 1);
}
