/** Basis coverage report (CDS criterion 4).
 *  Runs every two-drug pair in the catalog through analyze() and counts findings whose only
 *  basis is the desk's own map (no FDA box, PI excerpt, PMID, or CPIC link).
 *  Run: npx -y tsx scripts/basis-coverage.ts */
import { DRUGS } from "../src/lib/drugs/catalog.ts";
import { analyze } from "../src/lib/drugs/engine.ts";
import { basisFor } from "../src/lib/drugs/basis.ts";

const real = DRUGS.filter((d) => !d.id.startsWith("__"));
const bySeverity: Record<string, { findings: number; deskOnly: number }> = {};
const deskOnlyByRule: Record<string, number> = {};
let total = 0;
let deskOnly = 0;

for (let i = 0; i < real.length; i++) {
  for (let j = i + 1; j < real.length; j++) {
    for (const f of analyze([real[i].id, real[j].id]).findings) {
      total++;
      const row = (bySeverity[f.severity] ??= { findings: 0, deskOnly: 0 });
      row.findings++;
      if (basisFor(f).every((b) => b.kind === "desk")) {
        deskOnly++;
        row.deskOnly++;
        const rule = (f.id.split("__").pop() ?? f.id).replace(/-[a-z0-9]+$/, "");
        deskOnlyByRule[rule] = (deskOnlyByRule[rule] ?? 0) + 1;
      }
    }
  }
}

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : "0.0");
console.log(`Drugs: ${real.length}. Pair findings: ${total}. Desk-map-only basis: ${deskOnly} (${pct(deskOnly, total)}%).`);
for (const sev of ["contraindicated", "major", "moderate", "minor"]) {
  const r = bySeverity[sev];
  if (r) console.log(`  ${sev}: ${r.deskOnly} of ${r.findings} (${pct(r.deskOnly, r.findings)}%)`);
}
console.log("Top desk-only rules:");
for (const [rule, n] of Object.entries(deskOnlyByRule).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${rule}: ${n}`);
}
