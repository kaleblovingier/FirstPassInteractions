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

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free desk",
    tagline: "Check up to five medicines — no card required.",
    monthly: 0,
    yearly: 0,
    features: [
      "Search 1,700+ medicines and supplements",
      "Up to five drugs on the desk",
      "Interaction cards: how levels change and how effects can stack",
      "DrugBank, genetics teaching cards, and receptor teaching cards",
      "PubMed citation shelf (curated papers + live search)",
      "Simple concentration sketch (relative exposure and repeat-dose build-up)",
      "Enzyme occupancy heatmap",
      "Share a one-line map",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Host factors, metabolites, and the enzyme atlas.",
    monthly: 12,
    yearly: 99,
    lifetime: 79,
    highlighted: true,
    features: [
      "Everything on the free desk",
      "Up to eight medicines on the list",
      "Metabolizer status for common CYP enzymes",
      "Smoking, alcohol pattern, and ketamine / cannabis route",
      "Age (Beers), kidney, pregnancy / lactation teaching cards",
      "Metabolite maps and stack-load meters",
      "Enzyme atlas",
      "Full copyable interaction report",
    ],
  },
  {
    id: "lab",
    name: "Founding",
    tagline: "$79 once — Pro tools plus export, for life.",
    monthly: 29,
    yearly: 249,
    lifetime: 79,
    features: [
      "Everything in Pro",
      "JSON + CSV export for the lab book",
      "Founding lifetime at $79 once (no subscription)",
      "License receipt you can keep",
      "Priority formulary additions",
    ],
  },
];

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
