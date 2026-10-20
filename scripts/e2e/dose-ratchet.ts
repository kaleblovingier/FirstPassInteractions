/**
 * Export dose check, ratcheted to the dose guard's baseline.
 *
 * DOSE_PATTERN, findDoses and the per-file baseline are copied verbatim from
 * Grok Bot's fix/dose-sweep branch (9926316, src/lib/guards/). They are not on
 * main yet. DEDUPE ONCE fix/dose-sweep MERGES: delete the copies in
 * src/lib/guards/ here and keep that branch's files; this module imports them
 * by the same path, so nothing else changes.
 *
 * Each dose match found in export output is traced to the scoped source files
 * that contain that same match. A match is "baselined" when some file carrying
 * it still has baseline budget (the guard allows it there for now). Any other
 * match, including anything that only clinical-packet*.ts can produce
 * (baseline 0), is "new" and fails the e2e.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import baseline from "../../src/lib/guards/dose-baseline.json";
import { DOSE_PATTERN, SCOPED_PATHS, findDoses, isExempt } from "../../src/lib/guards/dose-rule";

export { DOSE_PATTERN };
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

let index: Map<string, Set<string>> | null = null;
function sourceIndex(root: string) {
  if (index) return index;
  index = new Map();
  for (const dir of SCOPED_PATHS)
    for (const e of readdirSync(join(root, dir), { recursive: true, withFileTypes: true })) {
      if (!e.isFile() || !/\.(ts|tsx)$/.test(e.name)) continue;
      const p = join(e.parentPath ?? (e as unknown as { path: string }).path, e.name).slice(root.length + 1);
      if (isExempt(p)) continue;
      for (const h of findDoses(readFileSync(join(root, p), "utf8"))) {
        const k = norm(h.match);
        if (!index.has(k)) index.set(k, new Set());
        index.get(k)!.add(p);
      }
    }
  return index;
}

export interface DoseHit { match: string; context: string; files: string[]; status: "baselined" | "new" }

export function classifyExportText(text: string, root = process.cwd()): DoseHit[] {
  const idx = sourceIndex(root);
  const b = baseline as Record<string, number>;
  const out: DoseHit[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(new RegExp(DOSE_PATTERN.source, DOSE_PATTERN.flags))) {
    const match = norm(m[0]);
    const context = norm(text.slice(Math.max(0, m.index! - 30), m.index! + m[0].length + 30));
    if (seen.has(context)) continue;
    seen.add(context);
    const files = [...(idx.get(match) ?? [])];
    out.push({ match, context, files, status: files.some((f) => (b[f] ?? 0) > 0) ? "baselined" : "new" });
  }
  return out;
}
