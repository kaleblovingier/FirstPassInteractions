// Route selection for scripts/a11y-gate.mjs. Pure: takes the sitemap paths (and the class keys the
// /practice page offers) and returns gate specs, so a11y-routes.test.mjs can check it without a server.
// A spec is "path" or "path@Button>Button" (click those buttons or tabs by accessible name first).

/** Groups the gate knows. "stations" is opt-in (see a11y-gate.mjs); everything else runs by default. */
export const GROUPS = ["drug", "pair", "enzyme", "class", "programs", "embed", "practice", "tools", "stations"];
export const DEFAULT_GROUPS = GROUPS.filter((g) => g !== "stations");

/** Learning tools inside the desk. */
export const TOOLS = ["/@Learn", "/@Cases", "/@Enzyme map", "/@Study drill", "/@Study drill>Classic pairs", "/@Study drill>Bedside & toxicology"];

// Desk stations. Library modules need no tray; clinical-board stations open from a ?brief= tray
// (methadone + ondansetron for QT, tacrolimus, norepinephrine, buprenorphine). Confirm is the
// dose-calculator attestation gate in front of MOUD.
const TRAY = "methadone,ondansetron,tacrolimus,norepinephrine,buprenorphine";
export const STATIONS = [
  ...["Receptor Profiler", "Transporter Network", "Cardiac Electrophysiology", "Pharmacogenomics & CPIC",
    "Toxidromes & Antidotes", "BBB & CNS Penetration", "CYP Induction & TDI", "Renal Tubular Pharmacology"].map((t) => `/@Library>${t}`),
  ...["QT", "Transplant", "Vasoactive", "MOUD & Harm Reduction>Confirm"].map((s) => `/?brief=${TRAY}@${s}`),
];

/** Enzyme for the practice enzyme-filter spec. Week 2 of the course kit links this deck. */
export const PRACTICE_ENZYME = "CYP3A4";
/** Pair slugs in the practice ?set= spec. */
export const SET_SIZE = 5;
/** /embed/pair/<slug> cards: a few on a sampled run, a spread of the pair list on the full crawl. */
export const EMBED_SAMPLE = 3;
export const EMBED_FULL = 12;
/** /for-programs/<audience> pages on a sampled run: one template, so a few stand in for all of them. */
export const AUDIENCE_SAMPLE = 3;

/** Pathnames of every <loc> in a sitemap, in order. */
export function sitemapPaths(xml) {
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
}

/** First `limit` items; all of them when limit is 0. */
export const take = (list, limit) => (limit ? list.slice(0, limit) : [...list]);

/** n items spread evenly over the list, first item included, in list order; the whole list when n >= its length. */
export function spread(list, n) {
  if (n <= 0) return [];
  if (n >= list.length) return [...list];
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}

const GRADE_VALUES = new Set(["contraindicated", "major", "moderate", "minor"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Drug-class keys the server-rendered /practice page offers in its class filter. Enzyme options
 * (CYP3A4, P-gp) are not slugs; grade options are named and left out.
 */
export function practiceClassKeys(html) {
  const keys = [];
  for (const m of String(html).matchAll(/<option[^>]*\svalue="([^"]*)"/g)) {
    const v = m[1];
    if (v && SLUG_RE.test(v) && !GRADE_VALUES.has(v) && !keys.includes(v)) keys.push(v);
  }
  return keys;
}

/** The class filter to gate: a key that also has a /class/<slug> hub, else the first key /practice offers. */
export function pickClassKey(classKeys, classSlugs) {
  const hubs = new Set(classSlugs);
  return classKeys.find((k) => hubs.has(k)) ?? classKeys[0];
}

/**
 * Gate specs for the groups in `only`, from the sitemap paths.
 * limit (0 = all) caps each sitemap-driven type (audience pages and embeds at 3); /classes, /for-programs and
 * the course kit always run.
 * classKeys: what practiceClassKeys() read from /practice; without one the class-filter spec is skipped.
 */
export function routeSpecs(paths, { only = DEFAULT_GROUPS, limit = 0, classKeys = [] } = {}) {
  const want = new Set(only);
  const has = new Set(paths);
  const match = (re) => paths.filter((p) => re.test(p));
  const pairSlugs = match(/^\/pair\/[^/]+$/).map((p) => p.slice("/pair/".length));
  const classSlugs = match(/^\/class\/[^/]+$/).map((p) => p.slice("/class/".length));
  const out = [];
  if (want.has("drug")) out.push(...take(match(/^\/drug\//), limit));
  if (want.has("pair")) out.push(...take(match(/^\/pair\//), limit));
  if (want.has("enzyme")) out.push(...take(match(/^\/enzymes?$/), limit), ...take(match(/^\/enzyme\//), limit));
  if (want.has("class")) out.push(...match(/^\/classes$/), ...take(match(/^\/class\//), limit));
  if (want.has("programs")) {
    const kit = "/for-programs/course-kit";
    out.push(...["/for-programs", kit].filter((p) => has.has(p)));
    out.push(...take(match(/^\/for-programs\/[^/]+$/).filter((p) => p !== kit), limit ? Math.min(AUDIENCE_SAMPLE, limit) : 0));
  }
  // Not in the sitemap (noindex, canonical to /pair/<slug>): derived from the pair pages.
  if (want.has("embed")) out.push(...spread(pairSlugs, limit ? Math.min(EMBED_SAMPLE, limit) : EMBED_FULL).map((s) => `/embed/pair/${s}`));
  if (want.has("practice")) {
    out.push(`/practice?enzyme=${PRACTICE_ENZYME}`);
    const cls = pickClassKey(classKeys, classSlugs);
    if (cls) out.push(`/practice?class=${encodeURIComponent(cls)}`);
    // practiceDeck() drops slugs that are not practice cards, so a spread of pair slugs is a safe set.
    const set = spread(pairSlugs, SET_SIZE);
    if (set.length) out.push(`/practice?set=${set.join(",")}`);
  }
  if (want.has("tools")) out.push(...TOOLS);
  if (want.has("stations")) out.push(...STATIONS);
  return [...new Set(out)];
}
