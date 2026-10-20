/**
 * Label drift check: is every stored label quote (gold set and contraindication
 * pins) still an exact substring of the cited section of the current DailyMed SPL?
 *
 *   npx --no-install tsx scripts/label-drift-check.ts            # fetch DailyMed, write fixture + docs
 *   npx --no-install tsx scripts/label-drift-check.ts --check    # offline: rebuild from the fixture, exit 1 if docs are stale
 *   npx --no-install tsx scripts/label-drift-check.ts --strict   # also exit 1 when any quote drifted
 *   [--cache dir]  reuse SPL XML already downloaded (default: no cache)
 *
 * Writes docs/validation/label-drift.md, src/lib/drugs/reference/label-versions.json
 * (setid → SPL version and effective date, for "last checked" lines) and
 * scripts/fixtures/label-drift-spl.json (the cited sections only, so CI stays offline).
 * Never changes a grade, pin or quote; drift goes on the review list.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LABEL_GOLD_SET } from "../src/lib/drugs/reference/label-gold-set.ts";
import { LABEL_CONTRAINDICATIONS } from "../src/lib/drugs/label-contraindications.ts";
import {
  driftReport,
  fixtureSections,
  runFromFixture,
  setidOf,
  splMeta,
  splSections,
  type DriftFixture,
  type LabelVersion,
  type QuotedRow,
} from "../src/lib/drugs/reference/label-drift.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PATHS = {
  md: resolve(root, "docs/validation/label-drift.md"),
  versions: resolve(root, "src/lib/drugs/reference/label-versions.json"),
  fixture: resolve(root, "scripts/fixtures/label-drift-spl.json"),
};

/** Every label-quoted row, one per (setid, section, quote), listing the pairs that cite it. */
export function quotedRows(): QuotedRow[] {
  const by = new Map<string, QuotedRow>();
  const add = (
    pair: string,
    labelDrug: string,
    labelSection: string,
    quote: string,
    url: string,
  ) => {
    const k = `${url}|${labelSection}|${quote}`;
    const row = by.get(k);
    if (row) {
      if (!row.pairs.includes(pair)) row.pairs.push(pair);
      return;
    }
    by.set(k, { pairs: [pair], labelDrug, labelSection, quote, url, setid: setidOf(url) });
  };
  for (const p of LABEL_GOLD_SET)
    if (!p.paraphrased) add(p.id, p.labelDrug, p.labelSection, p.quote, p.url);
  for (const p of LABEL_CONTRAINDICATIONS) {
    add(p.id, p.labelDrug, p.labelSection, p.quote, p.url);
    if (p.contraindicationsSentence)
      add(p.id, p.labelDrug, "4 CONTRAINDICATIONS", p.contraindicationsSentence, p.url);
  }
  return [...by.values()].sort(
    (a, b) => a.labelDrug.localeCompare(b.labelDrug) || a.pairs[0]!.localeCompare(b.pairs[0]!),
  );
}

export function versionsFrom(rows: QuotedRow[], fx: DriftFixture): LabelVersion[] {
  const seen = new Map<string, LabelVersion>();
  for (const r of rows) {
    if (!r.setid || seen.has(r.setid)) continue;
    const l = fx.labels[r.setid];
    const meta = l && "meta" in l ? l.meta : { title: "", version: null, effective: null };
    seen.set(r.setid, { setid: r.setid, labelDrug: r.labelDrug, ...meta });
  }
  return [...seen.values()].sort(
    (a, b) => a.labelDrug.localeCompare(b.labelDrug) || a.setid.localeCompare(b.setid),
  );
}

export function build(fx: DriftFixture) {
  const rows = quotedRows();
  const results = runFromFixture(rows, fx);
  const versions = versionsFrom(rows, fx);
  const md = driftReport(results, versions, fx.retrieved);
  const json =
    JSON.stringify(
      {
        retrieved: fx.retrieved,
        source: fx.source,
        labels: Object.fromEntries(
          versions.map((v) => [
            v.setid,
            { labelDrug: v.labelDrug, version: v.version, effective: v.effective },
          ]),
        ),
      },
      null,
      1,
    ) + "\n";
  return { rows, results, versions, md, json };
}

async function fetchSpl(setid: string, cache: string | null): Promise<string> {
  const f = cache ? `${cache}/${setid}.xml` : null;
  if (f && existsSync(f)) return readFileSync(f, "utf8");
  const r = await fetch(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}.xml`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const t = await r.text();
  if (f) writeFileSync(f, t);
  return t;
}

async function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const strict = argv.includes("--strict");
  let fx: DriftFixture;
  if (check) {
    fx = JSON.parse(readFileSync(PATHS.fixture, "utf8"));
  } else {
    const cache = argv.includes("--cache") ? argv[argv.indexOf("--cache") + 1]! : null;
    if (cache) mkdirSync(cache, { recursive: true });
    const rows = quotedRows();
    const ids = [...new Set(rows.map((r) => r.setid).filter((s): s is string => !!s))].sort();
    fx = {
      retrieved: new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }),
      source: "DailyMed SPL v2 XML (dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setid}.xml)",
      labels: {},
    };
    for (const id of ids) {
      try {
        const xml = await fetchSpl(id, cache);
        const all = splSections(xml);
        fx.labels[id] = {
          meta: splMeta(xml),
          sections: fixtureSections(
            rows.filter((r) => r.setid === id),
            all,
          ),
        };
      } catch (e) {
        fx.labels[id] = { error: e instanceof Error ? e.message : String(e) };
      }
    }
    writeFileSync(PATHS.fixture, JSON.stringify(fx) + "\n");
  }
  const out = build(fx);
  const count = (s: string) => out.results.filter((r) => r.status === s).length;
  console.log(
    `quotes ${out.results.length} · pass ${count("pass")} · moved ${count("moved")} · drifted ${count("drifted")} · unfetched ${count("unfetched")} · labels ${out.versions.length}`,
  );
  for (const r of out.results)
    if (r.status === "drifted")
      console.log("DRIFT", r.row.pairs.join(","), "|", r.missing?.slice(0, 120));
  if (check) {
    const stale = [
      [PATHS.md, out.md],
      [PATHS.versions, out.json],
    ].filter(([p, want]) => !existsSync(p!) || readFileSync(p!, "utf8") !== want);
    if (stale.length) {
      console.error(
        `stale: ${stale.map(([p]) => p).join(", ")}. Re-run scripts/label-drift-check.ts.`,
      );
      process.exitCode = 1;
    }
  } else {
    writeFileSync(PATHS.md, out.md);
    writeFileSync(PATHS.versions, out.json);
    console.log(`wrote ${PATHS.md}, ${PATHS.versions}, ${PATHS.fixture}`);
  }
  if (strict && count("drifted")) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
