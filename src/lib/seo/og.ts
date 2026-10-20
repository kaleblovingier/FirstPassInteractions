import { SEVERITY_LABEL, SEVERITY_RANK, type Severity } from "@/lib/drugs/types";
import { pairPages, type PairPage } from "./pair-pages";
import { drugHubs, type DrugHub } from "./drug-hubs";
import { SITE_URL } from "./pair-copy";

/** Line printed on every share image. */
export const OG_DISCLAIMER = "Educational reference only. Not FDA-cleared.";
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Words that must never appear in share-image text or og/twitter meta. */
export const OG_BANNED = [/\bfree\b/i, /\bpro\b/i, /\$\s?\d/, /\bprice|pricing\b/i, /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|ml|units?|iu)\b/i, /\bdos(e|es|ing|age)\b/i, /decision support/i, /\bCDS\b/];

export type OgKind = "pair" | "drug" | "page";

export interface OgImageJob {
  /** Public path, e.g. /og/pair/warfarin-aspirin.png */
  path: string;
  kicker: string;
  heading: string;
  sub: string;
  severity: Severity | "none" | null;
  gradeLabel: string | null;
}

export const ogImagePath = (kind: OgKind, slug: string) => `/og/${kind}/${slug}.png`;
export const ogImageUrl = (kind: OgKind, slug: string) => `${SITE_URL}${ogImagePath(kind, slug)}`;

export function pairOgJob(p: PairPage): OgImageJob {
  return {
    path: ogImagePath("pair", p.slug),
    kicker: "Drug pair",
    heading: `${p.nameA} + ${p.nameB}`,
    sub: "What the FDA labels say about these two drugs together",
    severity: p.severity,
    gradeLabel: p.severityLabel,
  };
}

export function hubOgJob(h: DrugHub): OgImageJob {
  const top = [...h.groups].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
  const n = h.pairCount;
  return {
    path: ogImagePath("drug", h.slug),
    kicker: "Drug page",
    heading: h.name,
    sub: `${n} label-sourced ${n === 1 ? "pair" : "pairs"}`,
    severity: top?.severity ?? null,
    gradeLabel: top ? `Highest grade: ${SEVERITY_LABEL[top.severity]}` : null,
  };
}

export const STATIC_OG_JOBS: OgImageJob[] = [
  { path: ogImagePath("page", "pairs"), kicker: "All pairs", heading: "Label-sourced drug interaction pairs", sub: "The FDA label's own wording, with a DailyMed link", severity: null, gradeLabel: null },
  { path: ogImagePath("page", "for-programs"), kicker: "For programs", heading: "Group and site licenses", sub: "For teaching and care programs", severity: null, gradeLabel: null },
];

/** Every share image the build must produce. Derived from data, so slug renames follow automatically. */
export function ogImageJobs(): OgImageJob[] {
  return [...pairPages().map(pairOgJob), ...drugHubs().map(hubOgJob), ...STATIC_OG_JOBS];
}

/** Alt text for a share image: what the image says, in words. */
export const ogAlt = (j: OgImageJob) => [`FirstPass: ${j.heading}`, j.sub, j.gradeLabel].filter(Boolean).join(". ") + ".";

/** og + twitter meta tags for a page. */
export function ogMeta(o: { title: string; description: string; url: string; image: string; alt: string }) {
  return [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "FirstPass" },
    { property: "og:title", content: o.title },
    { property: "og:description", content: o.description },
    { property: "og:url", content: o.url },
    { property: "og:image", content: o.image },
    { property: "og:image:width", content: String(OG_WIDTH) },
    { property: "og:image:height", content: String(OG_HEIGHT) },
    { property: "og:image:alt", content: o.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
    { name: "twitter:image", content: o.image },
    { name: "twitter:image:alt", content: o.alt },
  ];
}
