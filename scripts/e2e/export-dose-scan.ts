/**
 * Exhaustive dose-string scan of the clinical-packet export (reported, not fixed),
 * using the dose guard rule and baseline (see dose-ratchet.ts; dedupe after fix/dose-sweep merges).
 * The browser e2e only reaches the branches its three sample pairs trigger, so
 * this builds the packet for every catalog drug alone and for every drug pair,
 * and scans every string the packet returns (EHR note, handout, dialog fields).
 * Each hit is mapped back to the source line in clinical-packet.ts.
 *   npx tsx scripts/e2e/export-dose-scan.ts [--json out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildClinicalPacket } from "@/lib/drugs/clinical-packet";
import { analyze } from "@/lib/drugs/engine";
import { DRUGS } from "@/lib/drugs/catalog";
import { DEFAULT_HOST } from "@/lib/drugs/types";
import { classifyExportText } from "./dose-ratchet";

const src = readFileSync("src/lib/drugs/clinical-packet.ts", "utf8").split("\n");
const lit = (line: string) => line.replace(/\$\{[^}]*\}/g, "\u0000").split("\u0000").map((s) => s.trim()).filter((s) => s.length >= 8);
const srcIndex = src.map((l, i) => ({ n: i + 1, parts: lit(l) })).filter((x) => x.parts.length);
function sourceLine(text: string) {
  for (const { n, parts } of srcIndex) if (parts.every((p) => text.includes(p.replace(/^[`"']|[`"',);]+$/g, "")))) return n;
  return 0;
}
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

const ids = DRUGS.map((d) => d.id);
const sets: string[][] = ids.map((i) => [i]);
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) sets.push([ids[i]!, ids[j]!]);
const hits = new Map<string, { line: number; text: string; example: string; count: number; status: string; files: string[] }>();
for (const s of sets) {
  const host = { ...DEFAULT_HOST };
  const packet = buildClinicalPacket(s, host, analyze(s, host).findings, {});
  for (const str of strings(packet))
    for (const ln of str.split("\n"))
      for (const d of classifyExportText(ln)) {
        const line = sourceLine(ln);
        const k = `${line ? `L${line}` : ln.trim().slice(0, 80)}|${d.match}`;
        const h = hits.get(k);
        if (h) h.count++; else hits.set(k, { line, text: ln.trim().slice(0, 160), example: s.join("+"), count: 1, status: d.status, files: d.files });
      }
}
const rows = [...hits.values()].sort((a, b) => a.line - b.line);
for (const r of rows) console.log(`${r.status.toUpperCase().padEnd(9)} ${r.line ? `clinical-packet.ts:${r.line}` : "(data)"}  x${r.count}  [${r.example}]  ${r.text}`);
const fresh = rows.filter((r) => r.status === "new");
console.log(`\n${sets.length} desk combinations scanned; ${rows.length} dose matches (${fresh.length} new beyond the guard baseline)`);
const j = process.argv.indexOf("--json");
if (j > 0) writeFileSync(process.argv[j + 1]!, JSON.stringify(rows, null, 1));
process.exit(fresh.length ? 1 : 0);
