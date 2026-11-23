import { z } from "zod";
import type { Severity } from "@/lib/drugs/types";

// Kept apart from pair-pages.ts: the /pairs route's search parser and head script are in every page's entry bundle,
// and pair-pages.ts pulls in the engine and label tables (same reason as learn/practice-meta.ts).

export const PAIR_SEVERITIES = ["contraindicated", "major", "moderate", "minor", "none"] as const satisfies readonly (Severity | "none")[];
export type PairSeverity = (typeof PAIR_SEVERITIES)[number];

/** Same labels as SEVERITY_LABEL in drugs/types.ts (a test keeps them equal); copied so the entry bundle doesn't load that module. */
export const PAIR_SEVERITY_LABEL: Record<PairSeverity, string> = {
  contraindicated: "Avoid together",
  major: "Serious concern",
  moderate: "Use care",
  minor: "Mild note",
  none: "Not mapped",
};

/** Longest search text kept from the box or the URL. */
export const PAIRS_Q_MAX = 80;

export interface PairsSearch {
  /** Drug-name search text as typed, trimmed. */
  q?: string;
  severity?: PairSeverity;
}

/** What the filter reads from each index row. */
export interface PairsFilterEntry {
  nameA: string;
  nameB: string;
  severityLabel: string;
}

/** Lower case, accents and other marks removed. The prefilter script below repeats this. */
const fold = (s: string) => s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** One drug name as the filter compares it: folded, letters and digits only ("St. John's wort" → "stjohnswort"). */
export function nameKey(name: string): string {
  return fold(name).replace(/[^a-z0-9]+/g, "");
}

/** Both names of a pair, space-separated. Rendered on each row as data-k for the prefilter script. */
export function pairKey(nameA: string, nameB: string): string {
  return `${nameKey(nameA)} ${nameKey(nameB)}`;
}

/** Search words: folded, split on anything that is not a letter or digit. */
export function searchTokens(q: string | undefined): string[] {
  return q ? fold(q.slice(0, PAIRS_Q_MAX)).split(/[^a-z0-9]+/).filter(Boolean) : [];
}

const SEVERITY_BY_LABEL = new Map(PAIR_SEVERITIES.map((s) => [PAIR_SEVERITY_LABEL[s], s] as const));

/** The severity key for a row's label, e.g. "Avoid together" → "contraindicated". */
export function severityKey(label: string): PairSeverity | undefined {
  return SEVERITY_BY_LABEL.get(label);
}

/** True when every search word is inside one of the two names and the tier matches (when one is set). */
export function matchesPairKey(key: string, severity: PairSeverity | undefined, tokens: readonly string[], want: PairSeverity | undefined): boolean {
  if (want && severity !== want) return false;
  // Tokens hold no spaces, so a token inside the key is inside one name.
  return tokens.every((t) => key.includes(t));
}

export function hasPairsFilter(search: PairsSearch): boolean {
  return searchTokens(search.q).length > 0 || search.severity !== undefined;
}

export function filterPairs<T extends PairsFilterEntry>(entries: readonly T[], search: PairsSearch): T[] {
  const tokens = searchTokens(search.q);
  return entries.filter((e) => matchesPairKey(pairKey(e.nameA, e.nameB), severityKey(e.severityLabel), tokens, search.severity));
}

/** Search text for the URL: cut to PAIRS_Q_MAX and trimmed. Empty → undefined. */
export function normalizeQParam(raw: string | undefined): string | undefined {
  const q = raw?.slice(0, PAIRS_Q_MAX).trim();
  return q ? q : undefined;
}

/** The search with empty fields dropped, so the URL carries only what is set. */
export function pairsSearch(q: string | undefined, severity: PairSeverity | undefined): PairsSearch {
  const out: PairsSearch = {};
  const nq = normalizeQParam(q);
  if (nq) out.q = nq;
  if (severity) out.severity = severity;
  return out;
}

const PAIRS_SEARCH = z.object({
  // The router reads ?q=123 or ?q=true as a number or boolean; keep them as text.
  q: z
    .preprocess((v) => (typeof v === "number" || typeof v === "boolean" ? String(v) : v), z.string())
    .optional()
    .catch(undefined)
    .transform(normalizeQParam),
  severity: z.enum(PAIR_SEVERITIES).optional().catch(undefined),
});

/** `?q=warfarin&severity=major` → filters. Malformed values are dropped, never thrown. */
export function parsePairsSearch(raw: unknown): PairsSearch {
  const r = PAIRS_SEARCH.safeParse(raw);
  return r.success ? pairsSearch(r.data.q, r.data.severity) : {};
}

export function pairsCountText(shown: number, total: number): string {
  return `Showing ${shown} of ${total} ${total === 1 ? "pair" : "pairs"}`;
}

/** Set on <html> by the prefilter script until the page hydrates. */
export const PAIRS_PREFILTER_ATTR = "data-fp-pairs-prefilter";
const PREFILTER_SHEET = "__fpPairsPrefilter";

/**
 * /pairs is static HTML, served as-is for /pairs?q=…, and React's first render must match it, so the filters
 * apply only after hydration. Before first paint this script hides the rows the URL's filters leave out, and
 * keeps the controls and count (still unfiltered) invisible, through a constructed stylesheet: no element
 * React renders is touched. PairsIndexView removes it after hydration. Initial page load only.
 */
export const PAIRS_PREFILTER_SCRIPT = `(function(){try{var d=document;if(d.readyState!=="loading"||!d.adoptedStyleSheets||typeof CSSStyleSheet!=="function")return;var p=new URLSearchParams(location.search),q=(p.get("q")||"").slice(0,${PAIRS_Q_MAX}),s=p.get("severity")||"";var t=q.normalize("NFKD").replace(/\\p{Diacritic}/gu,"").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);if(${JSON.stringify(PAIR_SEVERITIES)}.indexOf(s)<0)s="";if(!t.length&&!s)return;var h="html[${PAIRS_PREFILTER_ATTR}] ",r=h+"[data-pairs-list]>li",x=[];for(var i=0;i<t.length;i++)x.push(r+':not([data-k*="'+t[i]+'"])');if(s)x.push(r+':not([data-s="'+s+'"])');var c=new CSSStyleSheet();c.replaceSync(x.join(",")+"{display:none!important}"+h+"[data-pairs-prehydrate]{visibility:hidden}");d.adoptedStyleSheets=d.adoptedStyleSheets.concat(c);window.${PREFILTER_SHEET}=c;d.documentElement.setAttribute("${PAIRS_PREFILTER_ATTR}","");}catch(e){}})();`;

/** Undo PAIRS_PREFILTER_SCRIPT once React draws the filtered list itself. Safe to call more than once. */
export function clearPairsPrefilter(): void {
  try {
    const w = window as unknown as Record<string, CSSStyleSheet | undefined>;
    const sheet = w[PREFILTER_SHEET];
    if (sheet && document.adoptedStyleSheets) document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    w[PREFILTER_SHEET] = undefined;
    document.documentElement.removeAttribute(PAIRS_PREFILTER_ATTR);
  } catch {
    /* no DOM */
  }
}
