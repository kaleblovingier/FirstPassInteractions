export type PlanId = "free" | "pro" | "lab";
export type Interval = "month" | "year" | "life";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  lifetime?: number;
  features: string[];
  highlighted?: boolean;
}

/**
 * Buyer-facing plans. Plans page shows two: Free and Founding ($79 once).
 * "pro" stays in the list for the 7-day preview and older keys (app labels,
 * Stripe pricing) — it is not sold as a separate tier on the Plans page.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Up to five drugs. No card needed.",
    monthly: 0,
    yearly: 0,
    features: [
      "Up to five drugs on the desk",
      "Search 1,700+ medicines and supplements",
      "Interaction cards: how levels change and how effects can stack",
      "Drug identity cards (DrugBank), genetics teaching cards, and receptor teaching cards",
      "PubMed citation shelf (curated papers + live search)",
      "Simple concentration sketch (relative exposure and repeat-dose build-up)",
      "Which liver enzymes each medicine uses (heatmap)",
      "Share a one-line map",
    ],
  },
  {
    id: "pro",
    name: "Unlocked",
    tagline: "7-day preview and older keys — founding tools without export.",
    monthly: 12,
    yearly: 99,
    lifetime: 79,
    features: [
      "Everything on the free desk",
      "Up to eight drugs on the desk",
      "Host factors: metabolizer status, smoking, alcohol pattern, route, age, kidney, pregnancy",
      "Metabolite maps and stack-load meters",
      "Enzyme atlas",
      "Full copyable interaction report",
    ],
  },
  {
    id: "lab",
    name: "Founding",
    tagline: "$79 once. Every tool, for life on this desk.",
    monthly: 29,
    yearly: 249,
    lifetime: 79,
    highlighted: true,
    features: [
      "Everything on the free desk",
      "Up to eight drugs on the desk",
      "Host factors: metabolizer status, smoking, alcohol pattern, route, age, kidney, pregnancy",
      "Enzyme atlas",
      "Metabolite maps and stack-load meters",
      "Full copyable interaction report",
      "JSON + CSV export for the lab book",
      "One payment — no subscription, no renewal",
      "Signed license key you can keep",
    ],
  },
];

/** The two tiers the Plans page sells, in display order. */
export const PLAN_TIERS = ["free", "lab"] as const satisfies readonly PlanId[];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

export function priceFor(plan: PlanId, interval: Interval) {
  const p = PLAN_BY_ID[plan];
  if (!p || plan === "free") return 0;
  if (interval === "life") return p.lifetime ?? 79;
  return interval === "year" ? p.yearly : p.monthly;
}

export function maxDrugs(plan: PlanId) {
  return plan === "free" ? 5 : 8;
}
