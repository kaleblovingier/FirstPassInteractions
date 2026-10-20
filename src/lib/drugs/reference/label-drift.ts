/**
 * Label drift check (pure helpers). For every label-quoted pair (gold set and
 * contraindication pins), is the stored quote still an exact substring of the
 * cited section of the current DailyMed SPL? Matching folds whitespace, case,
 * curly quotes and dashes; "…" splits a quote into elided segments that must
 * each be present. Network access lives in scripts/label-drift-check.ts; this
 * module only parses SPL XML and compares text, so tests run offline.
 * Educational reference only, not FDA-cleared. No dosing.
 */

export interface QuotedRow {
  /** Pair ids that cite this exact (setid, section, quote). */
  pairs: string[];
  labelDrug: string;
  labelSection: string;
  quote: string;
  url: string;
  setid: string | null;
}

export interface SplSection {
  title: string;
  text: string;
}

export interface SplMeta {
  title: string;
  version: number | null;
  /** YYYY-MM-DD from the document effectiveTime. */
  effective: string | null;
}

export type DriftStatus = "pass" | "moved" | "drifted" | "unfetched";

export interface DriftResult {
  row: QuotedRow;
  status: DriftStatus;
  /** Title of the section the quote was found in (or the cited section that was searched). */
  section?: string;
  missing?: string;
  /** Closest current sentence in the cited section, when a segment drifted. */
  current?: string;
  error?: string;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function normalize(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2013]/g, "-")
    .replace(/\s*([®•])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Comparison key for text that is already normalized (section text, segments):
 * case-folded with all whitespace removed. It does not re-strip tags, so label
 * text such as "<50 bpm" survives.
 */
export const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/** Split on "…"; strip punctuation only at elision edges. Same rule as verify-pair-quotes. */
export function segments(q: string): string[] {
  const parts = normalize(q)
    .split("…")
    .map((s) => s.trim());
  return parts
    .map((s, i) => {
      let t = s;
      if (i > 0) t = t.replace(/^[.,;:]\s*/, "");
      if (i < parts.length - 1) t = t.replace(/\s*[.,;:]$/, "");
      return t;
    })
    .filter(Boolean);
}

export function setidOf(url: string): string | null {
  try {
    return new URL(url).searchParams.get("setid");
  } catch {
    return null;
  }
}

export function splMeta(xml: string): SplMeta {
  const v = xml.match(/<versionNumber\s+value="(\d+)"/)?.[1];
  const e = xml.match(/<effectiveTime\s+value="(\d{8})/)?.[1];
  const title = normalize(xml.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "");
  return {
    title: title.length > 120 ? `${title.slice(0, 117)}...` : title,
    version: v ? Number(v) : null,
    effective: e ? `${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}` : null,
  };
}

/** Every <section> (nested ones too) with its title and full normalized text. */
export function splSections(xml: string): SplSection[] {
  const out: SplSection[] = [];
  const open = /<section\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const tag = /<(\/?)section\b[^>]*>/g;
    tag.lastIndex = open.lastIndex;
    let depth = 1;
    let t: RegExpExecArray | null;
    let end = xml.length;
    while ((t = tag.exec(xml))) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        end = t.index;
        break;
      }
    }
    const body = xml.slice(open.lastIndex, end);
    // The section's own title sits before its <text> or first child section.
    const head = body.slice(0, body.search(/<text\b|<section\b|<component\b/) >>> 0);
    const titleRaw = head.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1];
    const display = head.match(/<code\b[^>]*displayName="([^"]*)"/)?.[1];
    const title =
      titleRaw !== undefined && normalize(titleRaw)
        ? normalize(titleRaw)
        : display
          ? `[${normalize(display)}]`
          : undefined;
    if (title === undefined) continue;
    out.push({ title, text: normalize(body) });
  }
  return out;
}

const sectionNumber = (s: string) => s.match(/^\s*(\d+(?:\.\d+)*)\b/)?.[1] ?? null;
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

/**
 * Sections that match a cited labelSection. Numbered citations ("4.1 …",
 * "7 DRUG INTERACTIONS") match by number. Unnumbered ones ("CONTRAINDICATIONS",
 * "PRECAUTIONS - Drug Interactions", "Boxed Warning") match a section whose
 * title holds the cited heading's first word. A cited "a; b" or "a / b" matches any part.
 */
export function citedSections(all: SplSection[], labelSection: string): SplSection[] {
  const parts = labelSection
    .split(/;|\s\/\s|,\s(?=\d)/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hits = new Set<SplSection>();
  for (const part of parts) {
    const n = sectionNumber(part);
    if (n) {
      for (const s of all) if (sectionNumber(s.title) === n) hits.add(s);
      continue;
    }
    const head = words(part)[0];
    if (!head) continue;
    const key = head === "boxed" ? "warning" : head;
    for (const s of all) if (words(s.title).some((w) => w.startsWith(key))) hits.add(s);
  }
  return [...hits];
}

/** Sentence in `text` with the most word overlap with `seg` (for showing current wording). */
export function closestSentence(text: string, seg: string): string | undefined {
  const want = new Set(words(seg));
  if (!want.size) return undefined;
  let best: string | undefined;
  let score = 0;
  for (const s of text.split(/(?<=[.;])\s+/)) {
    const w = words(s);
    const hit = w.filter((x) => want.has(x)).length;
    const sc = hit / Math.max(want.size, 1);
    if (sc > score) {
      score = sc;
      best = s;
    }
  }
  if (!best || score < 0.4) return undefined;
  return best.length > 400 ? `${best.slice(0, 397)}...` : best;
}

/**
 * Compare one quote against the cited sections, then against the label body
 * (`fullText`, for "moved"). Pass `fullText` = "" when only section texts are
 * available (fixture mode); the fixture stores moved quotes' host sections.
 */
export function checkQuote(row: QuotedRow, sections: SplSection[], fullText: string): DriftResult {
  const segs = segments(row.quote);
  const cited = citedSections(sections, row.labelSection);
  const inText = (t: string) => {
    const h = squash(t);
    return segs.every((s) => h.includes(squash(s)));
  };
  const host = cited.find((s) => inText(s.text));
  if (host) return { row, status: "pass", section: host.title };
  const elsewhere = sections.find((s) => inText(s.text));
  if (elsewhere) return { row, status: "moved", section: elsewhere.title };
  if (fullText && inText(fullText))
    return { row, status: "moved", section: "(label text outside a titled section)" };
  const pool = cited.length ? cited.map((s) => s.text).join(" ") : "";
  const missing = segs.find((s) => !squash(pool || fullText).includes(squash(s))) ?? segs[0]!;
  return {
    row,
    status: "drifted",
    section: cited.length ? cited.map((s) => s.title).join("; ") : "(cited section not found)",
    missing,
    current: pool ? closestSentence(pool, missing) : undefined,
  };
}

export interface LabelVersion {
  setid: string;
  labelDrug: string;
  title: string;
  version: number | null;
  effective: string | null;
}

export interface DriftFixture {
  retrieved: string;
  source: string;
  labels: Record<string, { meta: SplMeta; sections: SplSection[] } | { error: string }>;
}

/** Results for every row from a fixture (offline). */
export function runFromFixture(rows: QuotedRow[], fx: DriftFixture): DriftResult[] {
  return rows.map((row) => {
    if (!row.setid)
      return { row, status: "unfetched", error: "no DailyMed setid in the stored link" };
    const l = fx.labels[row.setid];
    if (!l) return { row, status: "unfetched", error: "not in fixture" };
    if ("error" in l) return { row, status: "unfetched", error: l.error };
    return checkQuote(row, l.sections, "");
  });
}

/** Sections worth keeping in the fixture for these rows: cited ones plus any that host a moved quote. */
export function fixtureSections(rows: QuotedRow[], sections: SplSection[]): SplSection[] {
  const keep = new Set<SplSection>();
  for (const r of rows) {
    for (const s of citedSections(sections, r.labelSection)) keep.add(s);
    const segs = segments(r.quote);
    // Smallest section that holds every segment.
    const hosts = sections.filter((s) => segs.every((g) => squash(s.text).includes(squash(g))));
    hosts.sort((a, b) => a.text.length - b.text.length);
    if (hosts[0]) keep.add(hosts[0]);
  }
  // Drop sections fully contained in a kept parent to save space only when both kept; keep order.
  return sections.filter((s) => keep.has(s));
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function driftReport(
  results: DriftResult[],
  versions: LabelVersion[],
  retrieved: string,
): string {
  const by = (st: DriftStatus) => results.filter((r) => r.status === st);
  const pairsOf = (rs: DriftResult[]) => rs.reduce((n, r) => n + r.row.pairs.length, 0);
  const L: string[] = [];
  L.push("# Label drift check (generated)");
  L.push("");
  L.push(
    "> Generated by `npx --no-install tsx scripts/label-drift-check.ts`. Do not hand-edit. `--check` re-runs offline from `scripts/fixtures/label-drift-spl.json`.",
  );
  L.push("> Educational reference only, not FDA-cleared. No dosing. This report changes no grade.");
  L.push("");
  L.push(
    `Question: is every stored label quote (gold set and contraindication pins) still word for word in the cited section of the current DailyMed SPL? DailyMed SPL v2 XML retrieved ${retrieved}. Matching folds whitespace, case, curly quotes and dashes; "…" separates elided segments, and each must be present.`,
  );
  L.push("");
  L.push("| Result | Quotes | Pairs |");
  L.push("|---|---|---|");
  L.push(`| Pass (exact, in the cited section) | ${by("pass").length} | ${pairsOf(by("pass"))} |`);
  L.push(
    `| Moved (exact, but in a different section than cited) | ${by("moved").length} | ${pairsOf(by("moved"))} |`,
  );
  L.push(
    `| Drifted (not in the current label) | ${by("drifted").length} | ${pairsOf(by("drifted"))} |`,
  );
  L.push(`| Could not fetch | ${by("unfetched").length} | ${pairsOf(by("unfetched"))} |`);
  L.push(`| Labels | ${versions.length} | |`);
  L.push("");
  L.push("## Drifted");
  L.push("");
  if (!by("drifted").length) L.push("None.");
  else {
    L.push(
      "| Pairs | Label | Cited section | Stored text (missing segment) | Current text (closest sentence) |",
    );
    L.push("|---|---|---|---|---|");
    for (const r of by("drifted"))
      L.push(
        `| ${esc(r.row.pairs.join(", "))} | ${esc(r.row.labelDrug)} | ${esc(r.row.labelSection)} | ${esc(r.missing ?? "")} | ${esc(r.current ?? "not found")} |`,
      );
  }
  L.push("");
  L.push("## Moved (quote still exact, section citation needs a look)");
  L.push("");
  if (!by("moved").length) L.push("None.");
  else {
    L.push("| Pairs | Label | Cited section | Found in |");
    L.push("|---|---|---|---|");
    for (const r of by("moved"))
      L.push(
        `| ${esc(r.row.pairs.join(", "))} | ${esc(r.row.labelDrug)} | ${esc(r.row.labelSection)} | ${esc(r.section ?? "")} |`,
      );
  }
  L.push("");
  L.push("## Could not fetch");
  L.push("");
  if (!by("unfetched").length) L.push("None.");
  else
    for (const r of by("unfetched"))
      L.push(
        `- ${esc(r.row.pairs.join(", "))} (${esc(r.row.labelDrug)}, ${r.row.url}): ${esc(r.error ?? "")}`,
      );
  L.push("");
  L.push("## Labels checked (SPL version and date)");
  L.push("");
  L.push("| Label | setid | SPL version | Effective | Quotes | Result |");
  L.push("|---|---|---|---|---|---|");
  for (const v of versions) {
    const rs = results.filter((r) => r.row.setid === v.setid);
    const worst = rs.some((r) => r.status === "drifted")
      ? "drifted"
      : rs.some((r) => r.status === "unfetched")
        ? "not fetched"
        : rs.some((r) => r.status === "moved")
          ? "moved"
          : "pass";
    L.push(
      `| ${esc(v.labelDrug)} | ${v.setid} | ${v.version ?? "?"} | ${v.effective ?? "?"} | ${rs.length} | ${worst} |`,
    );
  }
  L.push("");
  L.push("## Passing pairs");
  L.push("");
  for (const r of by("pass"))
    L.push(`- ${esc(r.row.pairs.join(", "))}: ${esc(r.row.labelDrug)}, ${esc(r.section ?? "")}`);
  L.push("");
  return L.join("\n");
}
