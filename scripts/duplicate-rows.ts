/**
 * Duplicate catalog rows that disagree (2026-11-07): before -> after list of
 * every pair whose grade or card set moves, plus what-if counts for the open
 * decisions (serotonergic flags, shadowed zuranolone row, CBD strength,
 * Tybost with methadone). Draft for Kaleb; nothing here is approved.
 *
 * "Before" is origin/main at da80f1e. The script does not need a saved
 * snapshot: every catalog edit on this branch is listed in EDITS with its old
 * and new values, and the script rebuilds "before" by putting the old values
 * back on the in-memory rows. The test (duplicate-rows.test.ts) checks that the
 * catalog matches the "after" values, so the list cannot drift from the code.
 *
 * Scan: every catalog partner of every edited row, `analyze([row, partner])`
 * with DEFAULT_HOST (primary) and with no host. Pair grade is the highest card
 * that names both drugs. Two-drug pairs only, no entered amounts.
 *
 *   npx --yes tsx scripts/duplicate-rows.ts           # write docs/validation/duplicate-rows-2026-11-07.md
 *   npx --yes tsx scripts/duplicate-rows.ts --check   # exit 1 if the doc is stale
 *
 * Educational tool, not FDA-cleared. No doses.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DRUGS, DRUG_BY_ID, searchDrugs } from "../src/lib/drugs/catalog.ts";
import { enz } from "../src/lib/drugs/catalog-clinic.ts";
import { analyze } from "../src/lib/drugs/engine.ts";
import { METHADONE_ARV } from "../src/lib/drugs/methadone-antiretroviral.ts";
import { DEFAULT_HOST, SEVERITY_LABEL, SEVERITY_RANK, type Drug, type Finding, type PdFlag, type Severity } from "../src/lib/drugs/types.ts";
import { DUPLICATE_ROW_EDITS, type RowFields } from "../src/lib/drugs/reference/duplicate-rows.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DOC_PATH = resolve(root, "docs/validation/duplicate-rows-2026-11-07.md");

type PairSev = Severity | "none";
type Patch = { id: string; fields: RowFields };

const suffixOf = (f: Finding) => f.id.split("__").pop() ?? f.id;

function apply(p: Patch): () => void {
  const d = DRUG_BY_ID[p.id] as Drug & Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p.fields)) {
    saved[k] = d[k];
    d[k] = k === "enzymes" ? enz(v as string) : Array.isArray(v) ? [...v] : v;
  }
  return () => {
    for (const [k, v] of Object.entries(saved)) d[k] = v;
  };
}

function withPatches<T>(patches: Patch[], fn: () => T): T {
  const undo = patches.map(apply);
  try {
    return fn();
  } finally {
    for (const u of undo.reverse()) u();
  }
}

/** Cards naming both drugs, as `suffix|severity|effect`, sorted. */
function cards(a: string, b: string, host?: typeof DEFAULT_HOST): string[] {
  return analyze([a, b], host)
    .findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b))
    .map((f) => `${suffixOf(f)}|${f.severity}|${f.effect}`)
    .sort();
}
const gradeOf = (cs: string[]): PairSev =>
  cs.reduce<PairSev>((m, c) => {
    const s = c.split("|")[1] as Severity;
    return SEVERITY_RANK[s] > SEVERITY_RANK[m] ? s : m;
  }, "none");

type Scan = Map<string, { host: string[]; noHost: string[] }>;
const partnerIds = [...new Set(DRUGS.map((d) => d.id))].sort();

function scan(ids: string[], only?: string[]): Scan {
  const out: Scan = new Map();
  for (const a of ids)
    for (const b of only ?? partnerIds) {
      if (a === b) continue;
      const key = [a, b].sort().join("+");
      if (out.has(key)) continue;
      out.set(key, { host: cards(a, b, DEFAULT_HOST), noHost: cards(a, b) });
    }
  return out;
}

export interface Move {
  key: string;
  before: PairSev;
  after: PairSev;
  noHostBefore: PairSev;
  noHostAfter: PairSev;
  added: string[];
  removed: string[];
}

function diff(before: Scan, after: Scan): Move[] {
  const moves: Move[] = [];
  for (const [key, b] of before) {
    const a = after.get(key)!;
    const added = a.host.filter((c) => !b.host.includes(c));
    const removed = b.host.filter((c) => !a.host.includes(c));
    const nb = gradeOf(b.noHost);
    const na = gradeOf(a.noHost);
    if (!added.length && !removed.length && nb === na) continue;
    moves.push({ key, before: gradeOf(b.host), after: gradeOf(a.host), noHostBefore: nb, noHostAfter: na, added, removed });
  }
  return moves.sort((x, y) => x.key.localeCompare(y.key));
}

export interface Counts {
  up: number;
  down: number;
  newCi: number;
  sameGrade: number;
}
export function counts(moves: Move[]): Counts {
  const r = (s: PairSev) => SEVERITY_RANK[s];
  return {
    up: moves.filter((m) => r(m.after) > r(m.before)).length,
    down: moves.filter((m) => r(m.after) < r(m.before)).length,
    newCi: moves.filter((m) => m.after === "contraindicated" && m.before !== "contraindicated").length,
    sameGrade: moves.filter((m) => m.after === m.before).length,
  };
}

const beforePatches = (): Patch[] => DUPLICATE_ROW_EDITS.map((e) => ({ id: e.id, fields: e.before }));

/** Applied edits: before (old values put back) vs the catalog as it is on this branch. */
export function appliedMoves(): Move[] {
  const ids = DUPLICATE_ROW_EDITS.filter((e) => !e.searchOnly).map((e) => e.id);
  const before = withPatches(beforePatches(), () => scan(ids));
  const after = scan(ids);
  return diff(before, after);
}

export interface WhatIf {
  id: string;
  title: string;
  patches: Patch[];
  /** Restrict the scan to these partners (default: whole catalog). */
  only?: string[];
  /** Runtime setup that is not a catalog field (Tybost: methadone arrow). */
  setup?: () => () => void;
}

export const WHAT_IFS: WhatIf[] = [
  {
    id: "W1",
    title: "Drop `serotonergic` from brexanolone and zuranolone (catalog-clinic rows)",
    patches: [
      { id: "brexanolone", fields: { pd: [] } },
      { id: "zuranolone", fields: { pd: [] } },
    ],
  },
  {
    id: "W2",
    title: "Zuranolone uses the shadowed catalog-modern row's roles (CYP3A4 major substrate; cns-depressant, benzo-zdrug; no serotonergic)",
    patches: [{ id: "zuranolone", fields: { enzymes: "s:CYP3A4:major", pd: ["cns-depressant", "benzo-zdrug"] } }],
  },
  {
    id: "W3",
    title: "Drop `serotonergic` from bupropion SR (`bupropion-sr`), matching the `bupropion` row",
    patches: [{ id: "bupropion-sr", fields: { pd: [] } }],
  },
  {
    id: "W4",
    title: "Give bupropion SR the `bupropion` row's roles (CYP2B6 major substrate, CYP2D6 strong inhibitor, seizure-lowering) and drop `serotonergic`",
    patches: [{ id: "bupropion-sr", fields: { enzymes: "s:CYP2B6:major;i:CYP2D6:strong", pd: ["seizure-lowering"] } }],
  },
  {
    id: "W5",
    title: "Unbranded CBD (`cannabidiol`) CYP2C19 inhibitor strong -> moderate (the Epidiolex quote)",
    patches: [
      {
        id: "cannabidiol",
        fields: { enzymes: "s:CYP2C19:major;s:CYP3A4:major;i:CYP2C19:moderate;i:CYP3A4:moderate;i:CYP2C9:moderate;i:CYP2D6:weak" },
      },
    ],
  },
  {
    id: "W6",
    title: "Xanomeline–trospium (`xanomeline-trospium`) takes the `cobenfy` row's flags (anticholinergic, hepatotoxic; no cns-depressant)",
    patches: [{ id: "xanomeline-trospium", fields: { pd: ["anticholinergic", "hepatotoxic"] } }],
  },
  {
    id: "W7",
    title: "`cobenfy` takes the `xanomeline-trospium` row's flag (cns-depressant only)",
    patches: [{ id: "cobenfy", fields: { pd: ["cns-depressant"] } }],
  },
  {
    id: "W8",
    title: "Sofosbuvir–velpatasvir (`sofosbuvir-velpatasvir`) gains the `epclusa` row's CYP3A4 minor substrate role",
    patches: [{ id: "sofosbuvir-velpatasvir", fields: { enzymes: "s:P-gp:major;i:P-gp:moderate;s:CYP3A4:minor" } }],
  },
  {
    id: "W9",
    title: "Olanzapine samidorphan (`olanzapine-samidorphan`) gains the `lybalvi` row's CYP1A2 major substrate role",
    patches: [{ id: "olanzapine-samidorphan", fields: { enzymes: "s:CYP1A2:major" } }],
  },
  {
    id: "W10",
    title: "Tybost (`cobicistat`) with methadone reads as the neutral PR 243 card (`unsettled`), like the other cobicistat rows",
    patches: [],
    only: ["methadone"],
    setup: () => {
      const rec = METHADONE_ARV as Record<string, unknown>;
      rec.cobicistat = {
        arrow: "unsettled",
        why: "Standalone cobicistat. The methadone label does not name cobicistat.",
      };
      return () => {
        delete rec.cobicistat;
      };
    },
  },
];

export function whatIfMoves(w: WhatIf): Move[] {
  const ids = w.id === "W10" ? ["cobicistat"] : [...new Set(w.patches.map((p) => p.id))];
  const before = scan(ids, w.only);
  const undo = w.setup?.();
  try {
    const after = withPatches(w.patches, () => scan(ids, w.only));
    return diff(before, after);
  } finally {
    undo?.();
  }
}

/* ---------------------------------------------------------------- render */

const SPL_PATH = resolve(root, "scripts/fixtures/label-drift-spl.json");
type Spl = { labels: Record<string, { meta: { version: number; effective: string }; sections: { title: string; text: string }[] }> };
export function splText(setid: string, sectionPrefix: string): string {
  const fx = JSON.parse(readFileSync(SPL_PATH, "utf8")) as Spl;
  return fx.labels[setid].sections
    .filter((s) => s.title.startsWith(sectionPrefix))
    .map((s) => s.text)
    .join(" ");
}

function displayName(id: string): string {
  const d = DRUG_BY_ID[id];
  const brand = d.brands[0];
  return brand && !d.name.includes(brand) ? `${d.name} (${brand})` : d.name;
}
const pairName = (key: string) =>
  key
    .split("+")
    .map((id) => `${displayName(id)} (\`${id}\`)`)
    .join(" + ");
const cardTxt = (c: string) => {
  const [s, sev, effect] = c.split("|");
  return `\`${s}\` ${sev} (${effect})`;
};
const cell = (s: string) => s.replace(/\|/g, "\\|");
const label = (s: PairSev) => SEVERITY_LABEL[s];

function transitions(moves: Move[]): string {
  const n = new Map<string, number>();
  for (const m of moves) {
    const k = m.before === m.after ? `${label(m.before)} (cards change, grade same)` : `${label(m.before)} → ${label(m.after)}`;
    n.set(k, (n.get(k) ?? 0) + 1);
  }
  return (
    [...n]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, v]) => `${v} × ${k}`)
      .join("; ") || "none"
  );
}

const fmtCounts = (c: Counts, total: number) =>
  `${total} pairs move: **${c.up} up, ${c.down} down, ${c.newCi} newly Avoid together**${c.sameGrade ? `, ${c.sameGrade} with a card change and no grade change` : ""}`;

function moveTable(moves: Move[], L: string[], editIdsFor?: (m: Move) => string): void {
  L.push("| # | Pair | Before | After | No host (if different) | Cards added | Cards removed |" + (editIdsFor ? " Edit |" : ""));
  L.push("|---:|---|---|---|---|---|---|" + (editIdsFor ? "---|" : ""));
  moves.forEach((m, i) => {
    const nh = m.noHostBefore !== m.before || m.noHostAfter !== m.after ? `${label(m.noHostBefore)} → ${label(m.noHostAfter)}` : "";
    L.push(
      `| ${i + 1} | ${pairName(m.key)} | ${label(m.before)} | ${label(m.after)} | ${nh} | ${cell(m.added.map(cardTxt).join("; ")) || "-"} | ${cell(m.removed.map(cardTxt).join("; ")) || "-"} |` +
        (editIdsFor ? ` ${editIdsFor(m)} |` : ""),
    );
  });
}

export function render(): string {
  const L: string[] = [];
  const moves = appliedMoves();
  const c = counts(moves);
  const editOf = (m: Move) =>
    DUPLICATE_ROW_EDITS.filter((e) => !e.searchOnly && m.key.split("+").includes(e.id))
      .map((e) => e.ref)
      .join(", ");

  L.push("# Duplicate catalog rows that disagree, and the serotonergic flag (2026-11-07, draft)");
  L.push("");
  L.push("> Generated by `npx --yes tsx scripts/duplicate-rows.ts`. Do not hand-edit; re-run the script (`--check` exits 1 if stale). The quotes and edits live in `src/lib/drugs/reference/duplicate-rows.ts`.");
  L.push("");
  L.push("Educational reference only. Not FDA-cleared. The Prescribing Information governs. No doses.");
  L.push("");
  L.push("Status: **draft for Kaleb.** Branch `claude/project-thread-qouam9-clin`. This branch changes catalog roles on two duplicate rows and moves one brand name. Every grade change below needs Kaleb's approval before merge. Nothing else in the engine changes.");
  L.push("");
  L.push("No label was fetched for this draft: api.fda.gov and DailyMed are blocked from the build machine. Every change quotes a source already saved in the repo. Where no saved source settles a question, nothing was changed and the question is listed under Open decisions with the label section that would settle it.");
  L.push("");
  L.push("## The duplicates");
  L.push("");
  L.push("Each pair is two catalog rows for the same product. Search returns both, and the first hit decides which roles a user gets. \"Mapped roles\" are the CYP/P-gp roles and PD flags the engine reads.");
  L.push("");
  L.push("| Product | Row (first search hit marked *) | CYP / P-gp roles | PD flags |");
  L.push("|---|---|---|---|");
  const roleTxt = (d: Drug) =>
    d.enzymes.map((e) => (e.kind === "substrate" ? `${e.enzyme} substrate ${e.sensitivity}` : `${e.enzyme} ${e.kind} ${e.strength}`)).join("; ") || "none";
  for (const [product, query, ids] of DUPLICATE_GROUPS) {
    const first = searchDrugs(query)[0]?.id;
    for (const id of ids) {
      const d = DRUG_BY_ID[id];
      L.push(`| ${product} | \`${id}\`${id === first ? " *" : ""} | ${roleTxt(d)} | ${d.pd.join(", ") || "none"} |`);
    }
  }
  L.push("");
  L.push(`Rows are shown as they are on this branch. For the old values see the Edits table. A third Harvoni pair (\`ledipasvir-sofosbuvir\` vs \`sofosbuvir-ledipasvir\`) and 80 other shared-brand groups exist; most are a form or indication row (for example \`budesonide-inhaled\`), not a second copy. They were not part of this track.`);
  L.push("");
  L.push("## Sources used");
  L.push("");
  L.push("| Source | Where it is saved | What it settles |");
  L.push("|---|---|---|");
  for (const s of SOURCES) L.push(`| ${s.name} | ${s.where} | ${s.settles} |`);
  L.push("");
  L.push("## Edits on this branch");
  L.push("");
  L.push("| Ref | Row | Field | Before | After | Source quote |");
  L.push("|---|---|---|---|---|---|");
  for (const e of DUPLICATE_ROW_EDITS) {
    for (const k of Object.keys(e.after) as (keyof RowFields)[]) {
      const fmt = (v: unknown) => (Array.isArray(v) ? (v.length ? v.join(", ") : "none") : String(v || "none"));
      L.push(`| ${e.ref} | \`${e.id}\` | ${k} | ${cell(fmt(e.before[k]))} | ${cell(fmt(e.after[k]))} | ${cell(e.quote)} |`);
    }
  }
  L.push("");
  for (const e of DUPLICATE_ROW_EDITS) L.push(`- **${e.ref}.** ${e.why}`);
  L.push("");
  L.push("## Pairs that move");
  L.push("");
  L.push(`${fmtCounts(c, moves.length)}. Transitions: ${transitions(moves)}.`);
  L.push("");
  L.push("Every move comes from E1 (Auvelity roles on `dextromethorphan-bupropion`) or E2 (opioid-antagonist flag on `olanzapine-samidorphan`). E3 (Epidiolex brand) changes which row search returns, not any pair grade. After E1, every catalog partner gives the same pair grade with either Auvelity row. After E2, every opioid partner shows the precipitated-withdrawal card (`pd-antag-opioid`) with either Lybalvi row; the Lybalvi rows still differ on the 41 partners that ride `lybalvi`'s CYP1A2 role (W9). The test checks both.");
  L.push("");
  moveTable(moves, L, editOf);
  L.push("");
  L.push("## Rows left as they are");
  L.push("");
  for (const s of LEFT_AS_IS) L.push(`- ${s}`);
  L.push("");
  L.push("## The serotonergic flag");
  L.push("");
  for (const s of SEROTONERGIC) L.push(s);
  L.push("");
  L.push("## What-if counts for the open decisions");
  L.push("");
  L.push("Computed on this branch by changing the row in memory and re-scanning its partners. **None of these is applied.**");
  L.push("");
  L.push("| What-if | Change | Pairs moved | Up | Down | Newly Avoid together | Transitions |");
  L.push("|---|---|---:|---:|---:|---:|---|");
  const wi = new Map<string, Move[]>();
  for (const w of WHAT_IFS) {
    const mv = whatIfMoves(w);
    wi.set(w.id, mv);
    const k = counts(mv);
    L.push(`| ${w.id} | ${w.title} | ${mv.length} | ${k.up} | ${k.down} | ${k.newCi} | ${transitions(mv)} |`);
  }
  L.push("");
  const tyb = wi.get("W10")!;
  if (tyb.length) {
    L.push("W10 detail (methadone + Tybost):");
    L.push("");
    moveTable(tyb, L);
    L.push("");
  }
  L.push("## Tybost (standalone cobicistat) with methadone");
  L.push("");
  for (const s of TYBOST) L.push(s);
  L.push("");
  L.push("## Open decisions for Kaleb");
  L.push("");
  for (const s of OPEN) L.push(s);
  L.push("");
  L.push("## Labels this work needed that are not in `scripts/fixtures/label-drift-spl.json`");
  L.push("");
  L.push("| Label | Rows | Section that would settle it | Question |");
  L.push("|---|---|---|---|");
  for (const m of MISSING_LABELS) L.push(`| ${m.label} | ${m.rows} | ${m.section} | ${m.question} |`);
  L.push("");
  L.push("## Files");
  L.push("");
  L.push("- `src/lib/drugs/catalog-clinic.ts`: E1 and E2 row edits.");
  L.push("- `src/lib/drugs/catalog.ts`: E3 (Epidiolex brand and alias off the unbranded CBD row).");
  L.push("- `src/lib/drugs/reference/duplicate-rows.ts` (new): the edits with old and new values and their quotes.");
  L.push("- `src/lib/drugs/duplicate-rows.test.ts` (new): fixture quotes are verbatim, the catalog matches the after values, each duplicate now agrees with its label-backed row on the edited fields, Epidiolex search returns the Epidiolex row, the doc is current.");
  L.push("- `scripts/duplicate-rows.ts` (new): this doc.");
  L.push("- Regenerated because E1 or E2 moves pairs they list: `docs/validation/hiv-booster-roles-2026-11-07.md` (Genvoya and Stribild with `dextromethorphan-bupropion`, none → minor; the pinned count in `hiv-booster-roles.test.ts` goes 2,051 → 2,053), `docs/clinical-review/signoff-packet.md` (rule pair counts).");
  L.push("- `scripts/fixtures/methadone-arv-before.json`: `otherDigest` refreshed. E2 adds the precipitated-withdrawal card to methadone + `olanzapine-samidorphan`; with E1 to E3 reverted in memory the digest equals the original, so no other methadone pair moved (`otherDigestNote` in the file).");
  L.push("");
  return L.join("\n");
}

/* ------------------------------------------------------------ prose data */

const DUPLICATE_GROUPS: [string, string, string[]][] = [
  ["Auvelity", "auvelity", ["auvelity", "dextromethorphan-bupropion"]],
  ["Lybalvi", "lybalvi", ["lybalvi", "olanzapine-samidorphan"]],
  ["Cobenfy", "cobenfy", ["cobenfy", "xanomeline-trospium"]],
  ["Elmiron", "elmiron", ["pentosan-polysulfate", "pentosan"]],
  ["Epclusa", "epclusa", ["epclusa", "sofosbuvir-velpatasvir"]],
  ["Epidiolex", "epidiolex", ["cannabidiol-epidiolex", "cannabidiol"]],
  ["Zyban / bupropion", "zyban", ["bupropion", "bupropion-sr"]],
];

const SOURCES = [
  {
    name: "FDA Table 1, \"FDA's Examples of Drugs that Interact with CYP Enzymes and Transporter Systems\" (content current as of 05/29/2026, retrieved 2026-09-26)",
    where: "`src/lib/drugs/reference/fda-ddi-table.ts`",
    settles: "Bupropion is a CYP2D6 strong inhibitor; dextromethorphan is a CYP2D6 sensitive substrate (E1).",
  },
  {
    name: "Bupropion HCl tablets SPL `334e5635-e4cc-cf2a-e063-6294a90ae1e1` v2, effective 2026-08-24, section 4 CONTRAINDICATIONS",
    where: "`scripts/fixtures/label-drift-spl.json`",
    settles: "Seizure disorder contraindication (E1); the label's reason for the MAOI line is hypertensive reactions (serotonergic question).",
  },
  {
    name: "Lybalvi section 4, wave 7 note (DailyMed, retrieved 2026-10-28)",
    where: "`src/lib/drugs/reference/label-gold-set.ts`, DROPPED_CANDIDATES \"wave 7: Lybalvi + opioids\"",
    settles: "Lybalvi is contraindicated in patients using opioids (E2). Only this fragment is saved, not the full section.",
  },
  {
    name: "Epidiolex label, catalog strength audit (openFDA, read 2026-10-19)",
    where: "`docs/validation/strength-audit-2026-10-19.md`, review list",
    settles: "Cannabidiol is a moderate CYP2C19 inhibitor; the `cannabidiol-epidiolex` row already says moderate (E3).",
  },
  {
    name: "Methadone HCl tablets SPL `540edd43-165d-4257-b989-3bccc8f54afb` v2, effective 2026-09-09, sections 5.9 and 7",
    where: "`scripts/fixtures/label-drift-spl.json`",
    settles: "The serotonergic drug list the methadone label uses; the CYP3A4 inhibitor line and the antiretroviral paradox line (Tybost).",
  },
];

const LEFT_AS_IS = [
  "**Elmiron (`pentosan-polysulfate`, `pentosan`).** Both rows map no CYP role and no PD flag, so every pair reads the same with either row. Only the class text and the alias list differ. No change. The Elmiron label (section 5, bleeding with anticoagulants) is not saved, so neither row gets a bleeding flag.",
  "**Epclusa (`epclusa`, `sofosbuvir-velpatasvir`).** Both carry P-gp substrate major and P-gp inhibitor moderate. `epclusa` also carries a CYP3A4 minor substrate role. No saved source gives velpatasvir's CYP3A share (Epclusa 12.3 would). No change; see W8.",
  "**Cobenfy (`cobenfy`, `xanomeline-trospium`).** `cobenfy` carries anticholinergic and hepatotoxic; `xanomeline-trospium` carries cns-depressant only. The only repo text is the ACB table entry in `acb.ts`, which is a scoring note, not a label quote. The Cobenfy label is not saved. No change; see W6 and W7.",
  "**Lybalvi CYP1A2.** `lybalvi` carries CYP1A2 major substrate; `olanzapine-samidorphan` still does not. FDA Table 1 does not list olanzapine and no olanzapine or Lybalvi label is saved. Not changed; see W9.",
  "**Auvelity dextromethorphan grade.** Both rows now read CYP2D6 substrate *major*. FDA Table 1 calls dextromethorphan a CYP2D6 *sensitive* substrate (the `dextromethorphan` row uses sensitive). Inside Auvelity the bupropion part already inhibits CYP2D6, so whether the combination row should read sensitive is a judgment, not a table lookup. Left at major to match the existing `auvelity` row.",
];

const SEROTONERGIC: string[] = [
  "Rows today: `bupropion` (FDA Table 1 row) has **no** serotonergic flag; `bupropion-sr` has serotonergic and no CYP role; `naltrexone-bupropion` (Contrave) has neither. Both Auvelity rows keep serotonergic, which comes from dextromethorphan (the `dextromethorphan` row has it too). `brexanolone` and `zuranolone` (catalog-clinic rows, class \"Antidepressant\", copy \"Same serotonin stack\") carry serotonergic and no other flag.",
  "",
  "What the saved sources say:",
  "",
  `- Bupropion tablets section 4 gives the reason for the MAOI line as blood pressure, not serotonin: "${"There is an increased risk of hypertensive reactions when bupropion hydrochloride tablets are used concomitantly with MAOIs."}" The saved section 4 does not mention serotonin syndrome. Section 5 and 7 of a bupropion label are not saved, so the fixture cannot show that the label has no serotonin syndrome warning.`,
  `- The methadone label section 5.9 list of serotonergic drugs (SSRIs, SNRIs, TCAs, triptans, 5-HT3 antagonists, mirtazapine, trazodone, tramadol, cyclobenzaprine, metaxalone, drugs that impair serotonin metabolism such as MAOIs) names neither bupropion nor a neuroactive steroid. It is a list of examples, so it does not settle the question either way.`,
  "- No Zulresso (brexanolone) or Zurzuvae (zuranolone) label is saved.",
  "",
  "Result: **no flag changed.** No saved sentence says any of these drugs is, or is not, serotonergic. The flags disagree inside the catalog (two bupropion rows; the zuranolone catalog-modern row has no serotonergic flag but is shadowed by the catalog-clinic row with the same id, because `catalog.ts` keeps the first row it sees). W1 to W4 below show what each choice would move.",
];

const TYBOST: string[] = [
  "Today `cobicistat` + `methadone` shows the CYP3A4 inhibitor card (\"Expect higher Methadone exposure\"), a CYP clock card (\"Methadone rises while the inhibitor is on\") and a dual-pathway card, all Serious concern. PR 243 moved every other cobicistat row to a neutral card and left Tybost alone.",
  "",
  "Saved sources checked: the methadone label section 7 (fixture) does not name cobicistat or Tybost. Its general line says CYP3A4 inhibitors \"can increase the plasma concentration of methadone\"; its antiretroviral line says that certain antiretroviral agents with CYP3A4 inhibitory activity \"has resulted in increased clearance or decreased plasma levels of methadone\", naming ritonavir and ritonavir-boosted regimens, not cobicistat. FDA Table 1 grades cobicistat a CYP3A strong inhibitor, with no methadone line. No Tybost label is saved (Tybost section 7 would settle it). The two methadone lines point opposite ways and neither names cobicistat, so **no saved source gives the direction.** Not changed. W10 shows the neutral-card option.",
];

const OPEN: string[] = [
  "1. **E1 and E2 as drafted** (Auvelity roles and the Lybalvi opioid-antagonist flag on the duplicate rows).",
  "   - (a) Ship both. *Recommended:* each quote is saved, and every moved pair now matches what the label-backed row already showed.",
  "   - (b) Ship E1 only. E2 rests on a saved fragment of Lybalvi section 4, not the full sentence.",
  "   - (c) Instead of copying roles, retire the duplicate ids and redirect them to the label-backed rows. Cleaner, but saved desks and links use the old ids; needs an id-redirect mechanism the catalog does not have.",
  "2. **E3 (Epidiolex brand off the unbranded CBD row).** (a) Ship. *Recommended:* the strength audit already calls `cannabidiol` the non-Epidiolex row, and Epidiolex search now returns the row that matches the label quote. (b) Revert and instead lower `cannabidiol` CYP2C19 to moderate (W5). (c) Both. The rounds case \"Epidiolex and the sleepy benzo\" and sample `methadone-cbd` still use `cannabidiol` and teach \"strong\"; under (a) they should either move to `cannabidiol-epidiolex` or drop the Epidiolex wording. Not changed here because either edit changes what the case shows.",
  "3. **Bupropion serotonergic flag.** (a) Drop it from `bupropion-sr` (W3) once a bupropion section 5 or 7 is saved. *Recommended*, with W4's roles in the same change, so the two bupropion rows agree. (b) Add it to `bupropion` instead. (c) Leave the rows disagreeing.",
  "4. **Brexanolone and zuranolone serotonergic flag.** (a) Drop it (W1) once Zulresso and Zurzuvae section 7 are saved. (b) For zuranolone, let the catalog-modern row win (W2), which also restores its CYP3A4 and sedation roles. *Recommended: (b) for zuranolone and (a) for brexanolone*, after the labels are saved. (c) Leave as is.",
  "5. **Cobenfy rows (W6/W7).** (a) Copy `cobenfy` flags onto `xanomeline-trospium` once Cobenfy sections 5 and 7 are saved. *Recommended*: the `cobenfy` row is the one with an ACB entry and matching copy. (b) The reverse. (c) Leave.",
  "6. **Epclusa CYP3A4 (W8) and Lybalvi CYP1A2 (W9).** (a) Copy the extra role onto the duplicate after Epclusa 12.3 / Lybalvi 7 are saved. *Recommended.* (b) Remove it from the label-named row instead. (c) Leave.",
  "7. **Tybost with methadone (W10).** (a) Keep the rise card (supported only by the general CYP3A4 line). (b) Use the neutral \"direction not settled\" card PR 243 added for the other cobicistat rows. *Recommended:* the label's ritonavir paradox shows the general line does not hold for the closest booster, and every cobicistat-boosted regimen already reads neutral. (c) Keep the rise card and add a sentence that the methadone label does not name cobicistat. Changing it means editing `methadone-antiretroviral.ts` and the Tybost desk copy (catalog note, clinic boxed line, rounds case, window brief), which this draft did not do.",
];

const MISSING_LABELS = [
  { label: "Auvelity (dextromethorphan/bupropion)", rows: "`auvelity`, `dextromethorphan-bupropion`", section: "7 Drug Interactions; 12.3", question: "CYP2D6 substrate grade of the combination; label-own seizure and serotonin lines" },
  { label: "Lybalvi (olanzapine/samidorphan)", rows: "`lybalvi`, `olanzapine-samidorphan`", section: "4 Contraindications (full text); 7", question: "Full opioid sentence for the drift check; CYP1A2 role" },
  { label: "Cobenfy (xanomeline/trospium)", rows: "`cobenfy`, `xanomeline-trospium`", section: "5 Warnings (anticholinergic, hepatic); 7", question: "Which PD flags the row should carry" },
  { label: "Epclusa (sofosbuvir/velpatasvir)", rows: "`epclusa`, `sofosbuvir-velpatasvir`", section: "7; 12.3", question: "Velpatasvir CYP3A substrate share" },
  { label: "Epidiolex (cannabidiol)", rows: "`cannabidiol-epidiolex`, `cannabidiol`", section: "7; 12.3", question: "Save the CYP2C19 moderate sentence in the fixture so the drift check covers it; CYP3A4/2C9 potency" },
  { label: "Elmiron (pentosan polysulfate)", rows: "`pentosan-polysulfate`, `pentosan`", section: "5 Warnings (bleeding); 7", question: "Whether either row needs a bleeding flag" },
  { label: "Wellbutrin / Wellbutrin SR / Zyban (bupropion)", rows: "`bupropion`, `bupropion-sr`", section: "5 Warnings; 7 Drug Interactions", question: "Whether the label carries a serotonin syndrome line" },
  { label: "Zulresso (brexanolone)", rows: "`brexanolone`", section: "7 Drug Interactions", question: "Serotonergic flag; CNS depressant line" },
  { label: "Zurzuvae (zuranolone)", rows: "`zuranolone`", section: "7 Drug Interactions; 12.3", question: "Serotonergic flag; CYP3A4 role; CNS depressant line" },
  { label: "Tybost (cobicistat)", rows: "`cobicistat`", section: "7 Drug Interactions (opioid or methadone row)", question: "Methadone direction with standalone cobicistat" },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const doc = render();
  if (process.argv.includes("--check")) {
    const cur = existsSync(DOC_PATH) ? readFileSync(DOC_PATH, "utf8") : "";
    if (cur !== doc) {
      console.error(`${DOC_PATH} is stale. Run: npx --yes tsx scripts/duplicate-rows.ts`);
      process.exit(1);
    }
    console.log("duplicate-rows doc is current");
  } else {
    writeFileSync(DOC_PATH, doc);
    const c = counts(appliedMoves());
    console.log(`wrote ${DOC_PATH}: up ${c.up}, down ${c.down}, new contraindicated ${c.newCi}`);
  }
}

export type { PdFlag };
