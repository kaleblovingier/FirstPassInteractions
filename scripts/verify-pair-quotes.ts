/**
 * Live check: every quote shown on a /pair page is an exact substring (after
 * whitespace removal, case-folding and curly-quote folding; "…" splits elided spans) of the current DailyMed SPL
 * for its setid. Network script, not part of npm test.
 *   npx --no-install tsx scripts/verify-pair-quotes.ts [--cache dir] [--write]
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { pairPages } from "../src/lib/seo/pair-pages.ts";

const cacheDir = process.argv.includes("--cache") ? process.argv[process.argv.indexOf("--cache") + 1]! : "/tmp/spl-cache";
mkdirSync(cacheDir, { recursive: true });

export function normalize(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2010-\u2013]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function spl(setid: string): Promise<string> {
  const f = `${cacheDir}/${setid}.xml`;
  if (existsSync(f)) return readFileSync(f, "utf8");
  const r = await fetch(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}.xml`);
  if (!r.ok) throw new Error(`${setid}: HTTP ${r.status}`);
  const t = await r.text();
  writeFileSync(f, t);
  return t;
}

const pages = pairPages();
let ok = 0;
const bad: string[] = [];
const texts = new Map<string, string>();
const raw = new Map<string, string>();
const excerpts: Record<string, { setid: string; excerpt: string }> = {};
for (const p of pages) {
  if (!p.quote) continue;
  const setid = new URL(p.quote.url).searchParams.get("setid")!;
  if (!raw.has(setid)) raw.set(setid, normalize(await spl(setid)));
  if (!texts.has(setid)) texts.set(setid, normalize(await spl(setid)).toLowerCase().replace(/\s+/g, ""));
  const hay = texts.get(setid)!;
  const parts = normalize(p.quote.quote).split("…").map((s) => s.trim().replace(/^[.,;:]\s*|\s*[.,;:]$/g, "").toLowerCase()).filter(Boolean);
  const miss = parts.filter((s) => !hay.includes(s.replace(/\s+/g, "")));
  if (miss.length) bad.push(`${p.slug} (${p.quote.sourceId}): ${miss[0]!.slice(0, 120)}`);
  else {
    ok += 1;
    // Excerpt for the offline test: the label text spanning every quoted segment.
    const full = raw.get(setid)!;
    const squash = (x: string) => x.toLowerCase().replace(/\s+/g, "");
    const map: number[] = [];
    for (let i = 0; i < full.length; i++) if (!/\s/.test(full[i]!)) map.push(i);
    let lo = Infinity, hi = -1;
    for (const part of parts) {
      const at = hay.indexOf(squash(part));
      lo = Math.min(lo, map[at]!);
      hi = Math.max(hi, map[at + squash(part).length - 1]! + 1);
    }
    excerpts[p.quote.sourceId] = { setid, excerpt: full.slice(lo, hi) };
  }
}
console.log(`quotes ${ok + bad.length} · exact ${ok} · missing ${bad.length} · labels ${texts.size}`);
for (const b of bad) console.log("MISS", b);
if (process.argv.includes("--write") && !bad.length) {
  const sorted = Object.fromEntries(Object.entries(excerpts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync("src/lib/seo/pair-quote-sources.json", JSON.stringify({ retrieved: new Date().toISOString().slice(0, 10), source: "DailyMed SPL v2 XML", excerpts: sorted }, null, 1) + "\n");
  console.log("wrote src/lib/seo/pair-quote-sources.json");
}
process.exitCode = bad.length ? 1 : 0;
