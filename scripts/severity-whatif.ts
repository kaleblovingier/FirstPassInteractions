/**
 * Severity what-if preview (read-only). Question pending Kaleb's decision:
 * should findings that are "contraindicated" ONLY because of the CYP / P-gp
 * escalation in pkSeverity() (no label citation, no named pair/class rule)
 * drop to "major" ("Serious concern")?
 *
 *   npx --yes tsx scripts/severity-whatif.ts           # write docs/validation/severity-whatif.md
 *   npx --yes tsx scripts/severity-whatif.ts --check   # exit 1 if the doc is stale
 *
 * Nothing in the engine changes. The script calls analyze() and post-processes
 * the returned findings: a finding is "PK-only contraindicated" when it is a
 * CYP/P-gp perpetrator finding (kind "pk", id suffix `pk-<enzyme>-<kind>-<perp>`,
 * not `pk-comp-*`) at "contraindicated" and basisFor() attaches no label
 * citation to it. The what-if caps exactly those findings at "major" and
 * recomputes the pair severity. Classification mirrors scripts/signoff-packet.ts
 * in PR #66 (same catalog scan: every unordered pair, analyze([a, b]) with no
 * host context and no entered amounts) so the counts can be reconciled.
 *
 * Output is deterministic (no timestamps). Educational tool, not FDA-cleared.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DRUGS, DRUG_BY_ID } from "../src/lib/drugs/catalog.ts";
import { analyze } from "../src/lib/drugs/engine.ts";
import { basisFor } from "../src/lib/drugs/basis.ts";
import { DEFAULT_HOST, SEVERITY_LABEL, SEVERITY_RANK, type Finding, type Severity } from "../src/lib/drugs/types.ts";
import {
  KNOWN_CONTRAINDICATION_GAPS,
  KNOWN_UNDERCALLS,
  LABEL_GOLD_SET,
  type GoldPair,
} from "../src/lib/drugs/reference/label-gold-set.ts";

type PairSev = Severity | "none";

/** Numbers PR #66 (scripts/signoff-packet.ts) reported on main 0a30c77, for reconciliation. */
export const PR66_REPORTED = { pkContraFindings: 1334, pkContraPairs: 1325, ghbOtherPartners: 597 } as const;

/**
 * Gold-set pairs whose label says contraindicated and whose pair severity would
 * fall below "contraindicated" under the what-if. Kept explicit (not asserted
 * silently): the test fails if this list and the computed list differ, so the
 * loss is visible to Kaleb in review. Filled from the generated doc.
 */
export const EXPECTED_GOLD_LABEL_CI_DROPS: readonly string[] = [
  // Empty after #58. Those 18 label-contraindicated gold pairs (Inspra, Corlanor,
  // lovastatin, Latuda, pimozide, Rozerem, Ranexa, Zocor, thioridazine, Zanaflex,
  // triazolam) used to reach contraindicated only through pkSeverity, so a blanket
  // cap would have shown them as major. label-contraindications.ts now cites the
  // label on the enzyme finding, basisFor leads with that pin, and the what-if
  // keeps them. Add an id back here if a pin is removed and the cap would drop it.
];

/** Audience (MAT / ketamine clinic) drug families; every catalog id with these prefixes. */
const AUDIENCE_PREFIXES = ["ketamine", "esketamine", "methadone", "buprenorphine", "naltrexone"] as const;
export const AUDIENCE_IDS: readonly string[] = DRUGS.map((d) => d.id)
  .filter((id) => AUDIENCE_PREFIXES.some((p) => id === p || id.startsWith(`${p}-`)))
  .sort();

function suffixOf(f: Finding) {
  const parts = f.id.split("__");
  return parts[parts.length - 1] ?? f.id;
}

/** CYP/P-gp perpetrator finding (the pkSeverity() branch), as #66 classifies it. */
export function isPkPerpFinding(f: Finding) {
  const s = suffixOf(f);
  return f.kind === "pk" && s.startsWith("pk-") && !s.startsWith("pk-comp");
}

function hasLabelCitation(f: Finding) {
  return basisFor(f).some((b) => b.kind === "fda-boxed" || b.kind === "fda-pi" || b.kind === "fda-warning");
}

/** A finding the what-if would cap: contraindicated only via the CYP/P-gp rule, no label citation. */
export function isPkOnlyContra(f: Finding) {
  return f.severity === "contraindicated" && isPkPerpFinding(f) && !hasLabelCitation(f);
}

/** The what-if itself: cap PK-only contraindicated findings at major. Pure; engine untouched. */
export function applyWhatIf(findings: Finding[]): Finding[] {
  return findings.map((f) => (isPkOnlyContra(f) ? { ...f, severity: "major" as Severity } : f));
}

function highest(findings: Finding[]): PairSev {
  let best: PairSev = "none";
  for (const f of findings) if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[best]) best = f.severity;
  return best;
}

function pkRule(f: Finding) {
  const kind = f.tags.includes("inducer") ? "inducer" : "inhibitor";
  const strength = f.mechanism.split(" ")[0] ?? "?";
  const m = f.clinical.match(/is an? (sensitive|major|minor) \S+ substrate( with a narrow therapeutic index)?/);
  const sens = m?.[1] ?? "?";
  const nti = Boolean(m?.[2]);
  const victim = sens === "sensitive" && nti ? "sensitive + NTI" : sens === "sensitive" ? "sensitive" : nti ? `NTI (graded ${sens})` : sens;
  return { kind, strength, victim, enzyme: f.enzymes[0] ?? "?" };
}

export interface MovedFinding {
  pair: string;
  perp: string;
  victim: string;
  enzyme: string;
  rule: string;
}

export interface WhatIfData {
  drugs: number;
  pairsScanned: number;
  pkPerpContraFindings: number;
  pkPerpContraPgp: number;
  /** Distinct pairs keyed by catalog id. */
  pkPerpContraPairs: number;
  /** Same, keyed by display name "A + B" as #66 does (entries sharing a name collapse). */
  pkPerpContraPairsByName: number;
  /** Id-distinct pairs that share a display-name key with another pair. */
  nameCollisions: string[];
  labelCitedPkContra: number;
  moved: MovedFinding[];
  movedPairs: number;
  pairsChanged: { pair: string; ids: [string, string]; before: PairSev; after: PairSev }[];
  pairsStayContra: { pair: string; via: string }[];
  byDrug: { id: string; name: string; total: number; asPerp: number; asVictim: number }[];
  byRule: { rule: string; findings: number; pairs: number }[];
  byEnzyme: { enzyme: string; findings: number }[];
  ghb: { pairs: number; hypnoticOrAlcohol: number; other: number };
  /** Audience-drug pairs whose pair severity is contraindicated today (informational). */
  audienceContraPairs: number;
}

export function collect(): WhatIfData {
  const ids = DRUGS.map((d) => d.id);
  let pairsScanned = 0;
  let pkPerpContraFindings = 0;
  let pkPerpContraPgp = 0;
  let labelCitedPkContra = 0;
  const pkPerpContraPairs = new Set<string>();
  const pkPerpContraNames = new Map<string, Set<string>>();
  const moved: MovedFinding[] = [];
  const movedPairKeys = new Set<string>();
  const pairsChanged: WhatIfData["pairsChanged"] = [];
  const pairsStayContra: WhatIfData["pairsStayContra"] = [];
  const drugAgg = new Map<string, { total: number; asPerp: number; asVictim: number }>();
  const ruleAgg = new Map<string, { findings: number; pairs: Set<string> }>();
  const enzAgg = new Map<string, number>();
  const ghb = { pairs: 0, hypnoticOrAlcohol: 0, other: 0 };
  const audience = new Set(AUDIENCE_IDS);
  let audienceContraPairs = 0;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairsScanned++;
      const a = DRUG_BY_ID[ids[i]];
      const b = DRUG_BY_ID[ids[j]];
      const pairKey = `${a.name} + ${b.name}`;
      const idKey = `${a.id}+${b.id}`;
      const findings = analyze([a.id, b.id]).findings;
      let anyMoved = false;
      if ((audience.has(a.id) || audience.has(b.id)) && findings.some((f) => f.severity === "contraindicated")) audienceContraPairs++;
      for (const f of findings) {
        if (f.severity === "contraindicated" && isPkPerpFinding(f)) {
          pkPerpContraFindings++;
          if (f.enzymes.includes("P-gp")) pkPerpContraPgp++;
          pkPerpContraPairs.add(idKey);
          const ns = pkPerpContraNames.get(pairKey) ?? new Set<string>();
          ns.add(idKey);
          pkPerpContraNames.set(pairKey, ns);
          if (hasLabelCitation(f)) labelCitedPkContra++;
        }
        // #66's heuristic split of pd-ghb-cns partners, reproduced for the informational line.
        if (f.kind !== "pk" && f.severity === "contraindicated" && suffixOf(f) === "pd-ghb-cns") {
          ghb.pairs++;
          const partner = a.pd.includes("ghb") ? b : a;
          if (partner.pd.includes("alcohol") || partner.pd.includes("benzo-zdrug") || /hypnotic|barbiturate/i.test(partner.cls)) ghb.hypnoticOrAlcohol++;
          else ghb.other++;
        }
        if (!isPkOnlyContra(f)) continue;
        anyMoved = true;
        const r = pkRule(f);
        const [perp, victim] = f.drugIds;
        const rule = `${r.strength} ${r.kind} × ${r.victim} substrate`;
        moved.push({ pair: pairKey, perp, victim, enzyme: r.enzyme, rule });
        for (const [id, role] of [[perp, "asPerp"], [victim, "asVictim"]] as const) {
          const d = drugAgg.get(id) ?? { total: 0, asPerp: 0, asVictim: 0 };
          d.total++;
          d[role]++;
          drugAgg.set(id, d);
        }
        const ra = ruleAgg.get(rule) ?? { findings: 0, pairs: new Set<string>() };
        ra.findings++;
        ra.pairs.add(idKey);
        ruleAgg.set(rule, ra);
        enzAgg.set(r.enzyme, (enzAgg.get(r.enzyme) ?? 0) + 1);
      }
      if (!anyMoved) continue;
      movedPairKeys.add(idKey);
      const before = highest(findings);
      const afterFindings = applyWhatIf(findings);
      const after = highest(afterFindings);
      if (before !== after) pairsChanged.push({ pair: pairKey, ids: [a.id, b.id], before, after });
      else {
        const keep = afterFindings.find((f) => f.severity === "contraindicated");
        pairsStayContra.push({ pair: pairKey, via: keep ? `${suffixOf(keep)} (${keep.kind})` : "?" });
      }
    }
  }

  const byDrug = [...drugAgg]
    .map(([id, d]) => ({ id, name: DRUG_BY_ID[id]?.name ?? id, ...d }))
    .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name));
  const byRule = [...ruleAgg]
    .map(([rule, r]) => ({ rule, findings: r.findings, pairs: r.pairs.size }))
    .sort((x, y) => y.findings - x.findings || x.rule.localeCompare(y.rule));
  const byEnzyme = [...enzAgg]
    .map(([enzyme, findings]) => ({ enzyme, findings }))
    .sort((x, y) => y.findings - x.findings || x.enzyme.localeCompare(y.enzyme));
  return {
    drugs: ids.length,
    pairsScanned,
    pkPerpContraFindings,
    pkPerpContraPgp,
    pkPerpContraPairs: pkPerpContraPairs.size,
    pkPerpContraPairsByName: pkPerpContraNames.size,
    nameCollisions: [...pkPerpContraNames]
      .filter(([, s]) => s.size > 1)
      .flatMap(([name, s]) => [...s].sort().map((k) => `${name} (\`${k}\`)`))
      .sort(),
    labelCitedPkContra,
    moved,
    movedPairs: movedPairKeys.size,
    pairsChanged,
    pairsStayContra,
    byDrug,
    byRule,
    byEnzyme,
    ghb,
    audienceContraPairs,
  };
}

// ── Gold-set cross-check (same call as label-gold-set-eval.ts: DEFAULT_HOST, pair-level findings) ──
export interface GoldWhatIf {
  pair: GoldPair;
  before: PairSev;
  after: PairSev;
  cappedFindings: number;
}

export function goldWhatIf(): GoldWhatIf[] {
  return LABEL_GOLD_SET.map((pair) => {
    const own = analyze([pair.drugA, pair.drugB], DEFAULT_HOST).findings.filter(
      (f) => f.drugIds.includes(pair.drugA) && f.drugIds.includes(pair.drugB),
    );
    return {
      pair,
      before: highest(own),
      after: highest(applyWhatIf(own)),
      cappedFindings: own.filter(isPkOnlyContra).length,
    };
  });
}

/** Gold pairs whose label says contraindicated, engine says contraindicated today, and the what-if drops it. */
export function goldLabelCiDrops(rows: GoldWhatIf[] = goldWhatIf()): string[] {
  return rows
    .filter((r) => r.pair.expectContraindicated && r.before === "contraindicated" && r.after !== "contraindicated")
    .map((r) => r.pair.id)
    .sort();
}

// ── Render ─────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-US");
const esc = (s: string) => s.replace(/\|/g, "\\|");
const sev = (s: PairSev) => `${s} (${SEVERITY_LABEL[s]})`;
const nm = (id: string) => DRUG_BY_ID[id]?.name ?? id;

export function render(data: WhatIfData = collect(), gold: GoldWhatIf[] = goldWhatIf()): string {
  const L: string[] = [];
  const drops = goldLabelCiDrops(gold);
  const goldCi = gold.filter((r) => r.pair.expectContraindicated);
  const exactToday = goldCi.filter((r) => r.before === "contraindicated").length;
  const exactAfter = goldCi.filter((r) => r.after === "contraindicated").length;
  const audienceSet = new Set(AUDIENCE_IDS);
  const audMoved = data.moved.filter((m) => audienceSet.has(m.perp) || audienceSet.has(m.victim));
  const audPairs = new Set(audMoved.map((m) => [m.perp, m.victim].sort().join("+")));
  const audChanged = data.pairsChanged.filter((p) => p.ids.some((id) => audienceSet.has(id)));
  const matches66 =
    data.pkPerpContraFindings === PR66_REPORTED.pkContraFindings && data.pkPerpContraPairsByName === PR66_REPORTED.pkContraPairs;

  L.push("# Severity what-if: cap CYP / P-gp-only \"contraindicated\" at \"major\" (generated preview)");
  L.push("");
  L.push("> Generated by `npx --yes tsx scripts/severity-whatif.ts`. Do not hand-edit; re-run the script (`--check` exits 1 if stale).");
  L.push("");
  L.push("- **This is a preview. No severity has been changed.** The engine, catalog, and copy are untouched; the script post-processes `analyze()` output.");
  L.push("- **No clinician has reviewed this content.** It exists to inform Kaleb's pending decision, not to replace pharmacist review.");
  L.push("- **Counts come from main's catalog** (the base of this branch) and will shift after #58 and #60 merge.");
  L.push("- FirstPass is an educational interaction reference, not a substitute for clinical judgment, and not FDA-cleared. No doses.");
  L.push("");
  L.push("## The question");
  L.push("");
  L.push("`pkSeverity()` returns contraindicated (\"Avoid together\") whenever a strong CYP or P-gp inhibitor or inducer meets a sensitive or narrow-therapeutic-index substrate. The proposal is to keep \"contraindicated\" only where a label says so, and show the rest as major (\"Serious concern\"). This preview caps every such finding that carries no label citation in `basis.ts` and reports what moves. Where a named pair or class rule also says contraindicated, the pair keeps that verdict.");
  L.push("");
  L.push("## Headline");
  L.push("");
  L.push("| Measure | Count |");
  L.push("|---|---|");
  L.push(`| Catalog entries / unordered pairs scanned | ${fmt(data.drugs)} / ${fmt(data.pairsScanned)} |`);
  L.push(`| Contraindicated CYP/P-gp findings (pkSeverity branch) | ${fmt(data.pkPerpContraFindings)} (${fmt(data.pkPerpContraFindings - data.pkPerpContraPgp)} CYP, ${fmt(data.pkPerpContraPgp)} P-gp) on ${fmt(data.pkPerpContraPairs)} pairs (${fmt(data.pkPerpContraPairsByName)} by display name, as #66 counts) |`);
  L.push(`| … of which carry a label citation (kept at contraindicated) | ${fmt(data.labelCitedPkContra)} |`);
  L.push(`| **Findings that move contraindicated → major** | **${fmt(data.moved.length)}** on **${fmt(data.movedPairs)}** pairs |`);
  L.push(`| **Pairs whose overall severity changes** | **${fmt(data.pairsChanged.length)}** |`);
  L.push(`| Pairs with a moved finding that stay contraindicated via another rule | ${fmt(data.pairsStayContra.length)} |`);
  L.push(`| Gold-set pairs (label contraindicated) that would drop below contraindicated | **${drops.length}** |`);
  L.push(`| Gold-set exact matches (label contraindicated → engine contraindicated), today → what-if | ${exactToday} / ${goldCi.length} → **${exactAfter} / ${goldCi.length}** |`);
  L.push(`| MAT / ketamine-clinic pairs that move | ${fmt(audPairs.size)} (${fmt(audChanged.length)} change overall severity) |`);
  L.push("");
  L.push("## Reconciliation with PR #66");
  L.push("");
  L.push(`PR #66 (\`scripts/signoff-packet.ts\`) reported ${fmt(PR66_REPORTED.pkContraFindings)} contraindicated PK findings on ${fmt(PR66_REPORTED.pkContraPairs)} pairs. This script uses the same scan (every unordered pair, \`analyze([a, b])\`, no host, no amounts) and the same classification (kind \`pk\`, id suffix \`pk-*\` but not \`pk-comp-*\`, severity contraindicated) and finds **${fmt(data.pkPerpContraFindings)} findings on ${fmt(data.pkPerpContraPairsByName)} pairs keyed by display name**: ${matches66 ? "**match**." : "**differs**."}`);
  L.push("");
  if (data.pkPerpContraPairs !== data.pkPerpContraPairsByName) {
    L.push(`One nuance: #66 keys pairs by display name (\`"A + B"\`). Some catalog entries share a display name, so keyed by catalog id the same findings sit on **${fmt(data.pkPerpContraPairs)}** distinct pairs. The findings count is identical; only the pair count differs by ${fmt(data.pkPerpContraPairs - data.pkPerpContraPairsByName)}. This doc counts pairs by id from here on. The colliding pairs:`);
    L.push("");
    for (const c of data.nameCollisions) L.push(`- ${esc(c)}`);
    L.push("");
  }
  if (data.labelCitedPkContra === 0)
    L.push(`None of them carries a label citation, so all ${fmt(data.moved.length)} are in scope for the cap, consistent with #66.`);
  else L.push(`${fmt(data.labelCitedPkContra)} carry a label citation and are kept at contraindicated, so ${fmt(data.moved.length)} are capped.`);
  L.push("");
  L.push("## Moved findings by rule / enzyme");
  L.push("");
  L.push("| Rule (pkSeverity branch) | Findings | Pairs |");
  L.push("|---|---:|---:|");
  for (const r of data.byRule) L.push(`| ${esc(r.rule)} | ${fmt(r.findings)} | ${fmt(r.pairs)} |`);
  L.push("");
  L.push("| Enzyme | Findings |");
  L.push("|---|---:|");
  for (const e of data.byEnzyme) L.push(`| ${e.enzyme} | ${fmt(e.findings)} |`);
  L.push("");
  L.push("## Moved findings by drug (top 30)");
  L.push("");
  L.push("A finding counts once for each of its two drugs.");
  L.push("");
  L.push("| # | Drug | Findings | As perpetrator | As substrate |");
  L.push("|---:|---|---:|---:|---:|");
  data.byDrug.slice(0, 30).forEach((d, i) => L.push(`| ${i + 1} | ${esc(d.name)} | ${fmt(d.total)} | ${fmt(d.asPerp)} | ${fmt(d.asVictim)} |`));
  L.push("");
  L.push("## Pairs that stay contraindicated via another finding");
  L.push("");
  if (!data.pairsStayContra.length) L.push("None: on every pair with a moved finding, the CYP/P-gp rule was the only source of \"contraindicated\", so every such pair changes to major.");
  else for (const p of data.pairsStayContra.slice(0, 50)) L.push(`- ${esc(p.pair)}: kept by \`${p.via}\``);
  L.push("");
  L.push("## Safety cross-check: label gold set (all waves)");
  L.push("");
  L.push(`Each of the ${LABEL_GOLD_SET.length} gold-set pairs is re-run the way the gold-set test runs it (\`analyze\` with \`DEFAULT_HOST\`, findings involving both drugs) with and without the cap.`);
  L.push("");
  L.push("### Label says contraindicated, what-if would drop it below contraindicated");
  L.push("");
  if (!drops.length) L.push("None. No gold-set pair whose label says contraindicated loses its contraindicated verdict under the what-if.");
  else {
    L.push(`**These are losses the decision would cause.** Each label says contraindicated, and today the engine gets there only through the CYP/P-gp rule, because \`basis.ts\` has no label key for PK findings. A blanket cap would take gold-set exact matches from ${exactToday}/${goldCi.length} to ${exactAfter}/${goldCi.length}. Keeping "contraindicated where a label says so" would need a label allowlist for PK pairs; these ${drops.length} pairs would be a starting point. They are pinned in \`EXPECTED_GOLD_LABEL_CI_DROPS\` so the test documents them rather than hiding them.`);
    L.push("");
    L.push("| Pair | Label | Section | Today | What-if |");
    L.push("|---|---|---|---|---|");
    for (const id of drops) {
      const r = gold.find((g) => g.pair.id === id)!;
      L.push(`| ${r.pair.drugA} + ${r.pair.drugB} | [${esc(r.pair.labelDrug)}](${r.pair.url}) | ${esc(r.pair.labelSection)} | ${sev(r.before)} | ${sev(r.after)} |`);
    }
  }
  L.push("");
  L.push("### Other gold-set pairs whose severity would change");
  L.push("");
  const otherChanged = gold.filter((r) => r.before !== r.after && !drops.includes(r.pair.id));
  if (!otherChanged.length) L.push("None.");
  else {
    L.push("| Pair | Label class | Floor | Today | What-if | Still at floor? |");
    L.push("|---|---|---|---|---|---|");
    for (const r of otherChanged)
      L.push(`| ${r.pair.drugA} + ${r.pair.drugB} | ${r.pair.labelClass} | ${r.pair.expectedFloor} | ${sev(r.before)} | ${sev(r.after)} | ${SEVERITY_RANK[r.after] >= SEVERITY_RANK[r.pair.expectedFloor] ? "yes" : "**no**"} |`);
  }
  L.push("");
  L.push("### Already below the label: `KNOWN_CONTRAINDICATION_GAPS` (these need to go UP)");
  L.push("");
  L.push("The label says contraindicated and the engine already says major. The what-if does not touch them (they are not CYP/P-gp contraindicated findings), but they point the other way: a label-driven rule would raise them to contraindicated.");
  L.push("");
  L.push("| Pair | Label | Today | What-if |");
  L.push("|---|---|---|---|");
  for (const id of KNOWN_CONTRAINDICATION_GAPS) {
    const r = gold.find((g) => g.pair.id === id)!;
    L.push(`| ${r.pair.drugA} + ${r.pair.drugB} | ${esc(r.pair.labelDrug)}, ${esc(r.pair.labelSection)} | ${sev(r.before)} | ${sev(r.after)} |`);
  }
  L.push("");
  const underCi = KNOWN_UNDERCALLS.filter((id) => gold.find((g) => g.pair.id === id)?.pair.expectContraindicated);
  L.push(`Also below the label and also unaffected: the label-contraindicated entries in \`KNOWN_UNDERCALLS\` (${underCi.join(", ")}), which sit below major today.`);
  L.push("");
  L.push("## MAT / ketamine clinic: pairs that move");
  L.push("");
  L.push(`Audience catalog ids: ${AUDIENCE_IDS.map((id) => `\`${id}\``).join(", ")}.`);
  L.push("");
  if (!audMoved.length)
    L.push(`None. No finding involving these drugs is a CYP/P-gp contraindicated finding on main, so the what-if does not move any of them. (${fmt(data.audienceContraPairs)} pairs with an audience drug are contraindicated today; all of them come from class/PD rules such as MAOI or oxybate stacks, which this what-if leaves alone.)`);
  else {
    L.push("| Pair | Perpetrator → substrate | Enzyme | Rule | Pair today → what-if |");
    L.push("|---|---|---|---|---|");
    const changedBy = new Map(data.pairsChanged.map((p) => [[...p.ids].sort().join("+"), p]));
    const sorted = [...audMoved].sort((x, y) => x.pair.localeCompare(y.pair) || x.enzyme.localeCompare(y.enzyme));
    for (const m of sorted) {
      const c = changedBy.get([m.perp, m.victim].sort().join("+"));
      L.push(`| ${esc(m.pair)} | ${esc(nm(m.perp))} → ${esc(nm(m.victim))} | ${m.enzyme} | ${esc(m.rule)} | ${c ? `${c.before} → ${c.after}` : "stays contraindicated"} |`);
    }
  }
  L.push("");
  L.push("## Informational: sodium oxybate × non-hypnotic CNS depressants (not part of this what-if)");
  L.push("");
  L.push(`Rule \`pd-ghb-cns\` marks sodium oxybate with any CNS depressant as contraindicated: ${fmt(data.ghb.pairs)} pairs on main. Using #66's heuristic split, ${fmt(data.ghb.hypnoticOrAlcohol)} have an alcohol / benzodiazepine / Z-drug / hypnotic / barbiturate partner (the label's contraindication) and **${fmt(data.ghb.other)}** have some other CNS depressant partner (#66 reported about ${fmt(PR66_REPORTED.ghbOtherPartners)}). That is a separate question; this preview does not simulate it.`);
  L.push("");
  L.push("## Method and limits");
  L.push("");
  L.push("- Catalog scan: every unordered pair, `analyze([a, b])` with no host and no entered amounts, the same as #66. Host-, phenotype-, and dose-driven findings are not counted.");
  L.push("- A finding is capped only if it is a CYP/P-gp perpetrator finding from `pkSeverity()` at contraindicated **and** `basisFor()` attaches no label citation (`fda-boxed`, `fda-pi`, `fda-warning`). Pair severity is recomputed as the highest remaining finding for the two-drug regimen.");
  L.push("- Gold-set cross-check uses `DEFAULT_HOST` and pair-level findings, matching `label-gold-set-eval.ts`.");
  L.push("- Counts reflect main's catalog and will shift after #58 and #60 merge. This is a preview for a decision, not a reviewed severity table.");
  L.push("");
  return L.join("\n");
}

export const DOC_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "docs/validation/severity-whatif.md");

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const data = collect();
  const gold = goldWhatIf();
  const md = render(data, gold);
  if (process.argv.includes("--check")) {
    const cur = existsSync(DOC_PATH) ? readFileSync(DOC_PATH, "utf8") : "";
    if (cur !== md) {
      console.error("docs/validation/severity-whatif.md is stale; run npx --yes tsx scripts/severity-whatif.ts");
      process.exit(1);
    }
    console.log("severity-whatif.md is up to date");
  } else {
    mkdirSync(dirname(DOC_PATH), { recursive: true });
    writeFileSync(DOC_PATH, md);
    console.log(`wrote ${DOC_PATH}`);
  }
  console.log(`pairs ${data.pairsScanned} · PK contra ${data.pkPerpContraFindings} findings / ${data.pkPerpContraPairs} pairs (label-cited ${data.labelCitedPkContra})`);
  console.log(`moved ${data.moved.length} findings / ${data.movedPairs} pairs · pair severity changes ${data.pairsChanged.length} · stay CI ${data.pairsStayContra.length}`);
  console.log(`gold label-CI drops: ${JSON.stringify(goldLabelCiDrops(gold))}`);
  console.log(`ghb ${JSON.stringify(data.ghb)}`);
}
