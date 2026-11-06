/**
 * Re-check every PMID the platform cites against NCBI E-utilities.
 *
 *   npx --no-install tsx scripts/verify-pmids.ts           # report; exit 1 on any problem
 *   npx --no-install tsx scripts/verify-pmids.ts --write   # also refresh the snapshot
 *
 * This is the only part of the citation check that uses the network, and nothing in CI runs it.
 * src/lib/drugs/pmid-snapshot.test.ts holds the citations to the committed snapshot offline.
 * It proves a PMID exists and its metadata matches; whether a `why` sentence matches the paper
 * still takes a reader (docs/validation/citation-audit.md).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CITES } from "../src/lib/drugs/pubmed.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SNAPSHOT_PATH = resolve(root, "src/lib/drugs/reference/pmid-snapshot.json");

export interface SnapshotRow {
  pmid: string;
  year: number;
  journal: string;
  title: string;
  checked: string;
}

/** Compare titles and journals as text, ignoring case, accents and punctuation. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Every PMID written into non-test source, with the first place it appears. */
export function collectInlinePmids(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|json|md|mdx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !path.endsWith("pmid-snapshot.json")) {
        const lines = readFileSync(path, "utf8").split(/\r?\n/);
        lines.forEach((line, i) => {
          for (const m of line.matchAll(/(?:PMIDs?\b[:\s"]*|pmid:\s*"|pubmed\.ncbi\.nlm\.nih\.gov\/(?:\?term=)?)(\d{4,9})/gi)) {
            if (!found.has(m[1])) found.set(m[1], `${relative(root, path).replace(/\\/g, "/")}:${i + 1}`);
          }
        });
      }
    }
  };
  walk(resolve(root, "src"));
  return found;
}

interface Summary {
  error?: string;
  title?: string;
  source?: string;
  pubdate?: string;
  pubtype?: string[];
}

async function fetchSummaries(ids: string[]): Promise<Record<string, Summary>> {
  const out: Record<string, Summary> = {};
  // NCBI allows 3 requests a second without a key; the optional email parameter is left out on purpose.
  for (let i = 0; i < ids.length; i += 200) {
    const res = await fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ db: "pubmed", retmode: "json", tool: "firstpass-desk", id: ids.slice(i, i + 200).join(",") }),
    });
    if (!res.ok) throw new Error(`esummary answered ${res.status}`);
    const json = (await res.json()) as { result: Record<string, Summary> };
    Object.assign(out, json.result);
    await new Promise((r) => setTimeout(r, 400));
  }
  return out;
}

async function main() {
  const inline = collectInlinePmids();
  const ids = [...new Set([...CITES.map((c) => c.pmid), ...inline.keys()])].sort((a, b) => Number(a) - Number(b));
  const summaries = await fetchSummaries(ids);
  const problems: string[] = [];
  const checked = new Date().toISOString().slice(0, 10);
  const rows: SnapshotRow[] = [];

  for (const id of ids) {
    const s = summaries[id];
    const year = Number(s?.pubdate?.match(/\d{4}/)?.[0]);
    if (!s || s.error || !year) {
      problems.push(`${id}: not found at NCBI (${inline.get(id) ?? "curated shelf"})`);
      continue;
    }
    const bad = (s.pubtype ?? []).filter((t) => /retract|expression of concern|published erratum/i.test(t));
    if (bad.length) problems.push(`${id}: ${bad.join(", ")}`);
    rows.push({ pmid: id, year, journal: s.source ?? "", title: s.title ?? "", checked });
  }

  const byId = new Map(rows.map((r) => [r.pmid, r]));
  for (const c of CITES) {
    const r = byId.get(c.pmid);
    if (!r) continue;
    if (c.year !== r.year) problems.push(`${c.pmid}: year ${c.year} here, ${r.year} at NCBI`);
    if (normalizeText(c.journal) !== normalizeText(r.journal)) problems.push(`${c.pmid}: journal "${c.journal}" here, "${r.journal}" at NCBI`);
    if (normalizeText(c.title) !== normalizeText(r.title)) problems.push(`${c.pmid}: title "${c.title}" here, "${r.title}" at NCBI`);
  }

  console.log(`Checked ${ids.length} PMIDs: ${CITES.length} curated rows, ${inline.size} written inline.`);
  for (const p of problems) console.log(`PROBLEM ${p}`);
  if (process.argv.includes("--write")) {
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 1)}\n`);
    console.log(`Wrote ${rows.length} rows to ${relative(root, SNAPSHOT_PATH)}.`);
  }
  if (problems.length) process.exit(1);
  console.log("No problems found.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
