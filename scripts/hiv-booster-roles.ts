/**
 * HIV protease inhibitor / cobicistat booster role proposal (2026-11-07):
 * before -> after list of pair grades.
 *
 * The change adds CYP roles to five catalog rows (see ADDED_ROLES). This script
 * takes every unordered two-drug pair that includes one of those rows, runs the
 * app's own analyze() on it twice (once with the added roles taken off the row,
 * in memory, and once as shipped) and lists every pair whose grade differs.
 * The pair grade is the highest finding that involves both drugs, the same rule
 * the label-contraindication tests use (`pairSeverity`). Primary scan: default
 * host, no amounts. A second scan with no host is reported where it differs.
 *
 *   npx --yes tsx scripts/hiv-booster-roles.ts           # write docs/validation/hiv-booster-roles-2026-11-07.md
 *   npx --yes tsx scripts/hiv-booster-roles.ts --check   # exit 1 if the doc is stale
 *
 * "Before" is the catalog with ADDED_ROLES removed from these rows; the script
 * asserts that this equals the roles on origin/main 8e4c216 (MAIN_ROLES), so the
 * list is the diff against main. Output is deterministic (no timestamps).
 * Educational tool, not FDA-cleared. No doses.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DRUGS, DRUG_BY_ID } from "../src/lib/drugs/catalog.ts";
import { analyze } from "../src/lib/drugs/engine.ts";
import { LABEL_CONTRAINDICATIONS, labelContraindicationFor } from "../src/lib/drugs/label-contraindications.ts";
import { LABEL_GOLD_SET } from "../src/lib/drugs/reference/label-gold-set.ts";
import {
  DEFAULT_HOST,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type Drug,
  type Enzyme,
  type EnzymeRole,
  type Finding,
  type Severity,
} from "../src/lib/drugs/types.ts";

export type PairSev = Severity | "none";

interface AddedRole {
  enzyme: Enzyme;
  kind: "inhibitor" | "substrate";
  grade: string;
  source: string;
}

/** The roles this proposal adds, per catalog row, with the saved source for each. */
export const ADDED_ROLES: Readonly<Record<string, readonly AddedRole[]>> = {
  indinavir: [
    {
      enzyme: "CYP3A4",
      kind: "inhibitor",
      grade: "strong",
      source:
        "Victim labels in the drift fixture name indinavir among strong CYP3A inhibitors: Ranexa 7.1, Belsomra 7.2, Brilinta 7.1. FDA Table 1 lists indinavir only as a sensitive 3A substrate (fn 6) and grades indinavir and ritonavir strong.",
    },
  ],
  saquinavir: [
    {
      enzyme: "CYP3A4",
      kind: "inhibitor",
      grade: "strong",
      source:
        "Same victim labels name saquinavir among strong CYP3A inhibitors (Ranexa 7.1, Belsomra 7.2, Brilinta 7.1). FDA Table 1 grades saquinavir and ritonavir strong and lists saquinavir alone only as a sensitive 3A substrate (fn 6).",
    },
  ],
  tipranavir: [
    {
      enzyme: "CYP3A4",
      kind: "inhibitor",
      grade: "strong",
      source:
        "FDA Table 1: tipranavir and ritonavir, 3A strong inhibitor. The row is Aptivus, which is given with ritonavir, graded as the boosted regimen like the darunavir and atazanavir rows.",
    },
  ],
  "elvitegravir-cobicistat-ftc-taf": [
    { enzyme: "CYP3A4", kind: "inhibitor", grade: "strong", source: "FDA Table 1: cobicistat, 3A strong inhibitor. Same coding as Prezcobix, Symtuza and Evotaz." },
    { enzyme: "CYP2D6", kind: "inhibitor", grade: "weak", source: "FDA Table 1: cobicistat, 2D6 weak inhibitor. Same coding as Prezcobix, Symtuza and Evotaz." },
    {
      enzyme: "CYP3A4",
      kind: "substrate",
      grade: "major",
      source: "Sibling coding (Prezcobix, Symtuza, Evotaz) and the elvitegravir row (CYP3A4 major substrate). Not checked against a saved Genvoya label.",
    },
  ],
  "elvitegravir-cobicistat-ftc-tdf": [
    { enzyme: "CYP3A4", kind: "inhibitor", grade: "strong", source: "FDA Table 1: cobicistat, 3A strong inhibitor. Same coding as Prezcobix, Symtuza and Evotaz." },
    { enzyme: "CYP2D6", kind: "inhibitor", grade: "weak", source: "FDA Table 1: cobicistat, 2D6 weak inhibitor. Same coding as Prezcobix, Symtuza and Evotaz." },
    {
      enzyme: "CYP3A4",
      kind: "substrate",
      grade: "major",
      source: "Sibling coding (Prezcobix, Symtuza, Evotaz) and the elvitegravir row (CYP3A4 major substrate). Not checked against a saved Stribild label.",
    },
  ],
};

export const CHANGED_IDS = Object.keys(ADDED_ROLES);

/** Roles on origin/main 8e4c216 for the changed rows, as role codes. */
export const MAIN_ROLES: Readonly<Record<string, string>> = {
  indinavir: "s:CYP3A4:sensitive",
  saquinavir: "s:CYP3A4:sensitive",
  tipranavir: "i:P-gp:weak",
  "elvitegravir-cobicistat-ftc-taf": "",
  "elvitegravir-cobicistat-ftc-tdf": "",
};

export function roleCode(r: EnzymeRole): string {
  if (r.kind === "substrate") return `s:${r.enzyme}:${r.sensitivity}${r.nti ? ":nti" : ""}${r.pathway === "activation" ? ":activation" : ""}`;
  return `${r.kind === "inhibitor" ? "i" : "d"}:${r.enzyme}:${r.strength}`;
}

function isAdded(id: string, r: EnzymeRole): boolean {
  return (ADDED_ROLES[id] ?? []).some((a) =>
    a.enzyme === r.enzyme && a.kind === r.kind && (r.kind === "substrate" ? r.sensitivity === a.grade : r.strength === a.grade),
  );
}

export function beforeRoles(id: string): EnzymeRole[] {
  return DRUG_BY_ID[id].enzymes.filter((r) => !isAdded(id, r));
}

/** Run fn with the changed rows set back to their main roles, then restore. */
function withMainRoles<T>(fn: () => T): T {
  const saved = new Map<Drug, EnzymeRole[]>();
  for (const id of CHANGED_IDS) {
    const d = DRUG_BY_ID[id];
    saved.set(d, d.enzymes);
    d.enzymes = beforeRoles(id);
  }
  try {
    return fn();
  } finally {
    for (const [d, roles] of saved) d.enzymes = roles;
  }
}

function suffixOf(f: Finding) {
  const parts = f.id.split("__");
  return parts[parts.length - 1] ?? f.id;
}

function pairFindings(a: string, b: string, host?: typeof DEFAULT_HOST): Finding[] {
  return analyze([a, b], host).findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b));
}

function highest(findings: Finding[]): PairSev {
  let best: PairSev = "none";
  for (const f of findings) if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[best]) best = f.severity;
  return best;
}

const SENS_RANK = { minor: 1, major: 2, sensitive: 3 } as const;

function victimRole(victim: Drug, enzyme: Enzyme): string {
  const subs = victim.enzymes.filter((r): r is Extract<EnzymeRole, { kind: "substrate" }> => r.kind === "substrate" && r.enzyme === enzyme);
  if (!subs.length) return "substrate";
  const hot = subs.reduce((m, s) => (SENS_RANK[s.sensitivity] > SENS_RANK[m.sensitivity] ? s : m));
  const nti = subs.some((s) => s.nti);
  return `${hot.sensitivity}${nti ? " NTI" : ""} substrate${hot.pathway === "activation" ? " (activation)" : ""}`;
}

function perpRole(perp: Drug, enzyme: Enzyme, kind: "inhibitor" | "inducer"): string {
  const r = perp.enzymes.filter((x) => x.enzyme === enzyme && x.kind === kind);
  const order = { weak: 1, moderate: 2, strong: 3 } as const;
  const best = r.reduce<string | null>((m, x) => {
    if (x.kind === "substrate") return m;
    return !m || order[x.strength] > order[m as keyof typeof order] ? x.strength : m;
  }, null);
  return `${best ?? "?"} ${kind}`;
}

/** Why the pair moved: the strongest new or raised pk card, described by role. */
function causeOf(changed: string, partner: string, before: Finding[], after: Finding[]): { cause: string; group: string } {
  const one = (c: string) => ({ cause: c, group: c });
  const prev = new Map(before.map((f) => [suffixOf(f), SEVERITY_RANK[f.severity]]));
  const fresh = after
    .filter((f) => (prev.get(suffixOf(f)) ?? -1) < SEVERITY_RANK[f.severity])
    .sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity] || suffixOf(x).localeCompare(suffixOf(y)));
  const pk = fresh.filter((f) => /^pk-(CYP|P-gp)/.test(suffixOf(f)));
  const top = pk[0] ?? fresh[0];
  if (!top) return one("card removed");
  const s = suffixOf(top);
  const m = s.match(/^pk-(CYP\w+|P-gp)-(inhibitor|inducer)-(.+)$/);
  if (!m) return one(`derived card (${s})`);
  const enzyme = m[1] as Enzyme;
  const kind = m[2] as "inhibitor" | "inducer";
  const perpId = m[3];
  const perp = DRUG_BY_ID[perpId];
  const victimId = perpId === changed ? partner : changed;
  const victim = DRUG_BY_ID[victimId];
  const label = (id: string) => DRUG_BY_ID[id].brands[0] ?? DRUG_BY_ID[id].name;
  if (CHANGED_IDS.includes(perpId) && isAddedKind(perpId, enzyme, kind)) {
    return one(`new ${label(perpId)} ${enzyme} ${perpRole(perp, enzyme, kind)} × ${victimRole(victim, enzyme)}`);
  }
  if (CHANGED_IDS.includes(victimId)) {
    const group = `new ${label(victimId)} ${enzyme} substrate role × ${perpRole(perp, enzyme, kind)}`;
    return { cause: `new ${label(victimId)} ${enzyme} substrate role × ${perp.name} (${perpRole(perp, enzyme, kind)})`, group };
  }
  return one(s);
}

function isAddedKind(id: string, enzyme: Enzyme, kind: "inhibitor" | "inducer") {
  return (ADDED_ROLES[id] ?? []).some((a) => a.enzyme === enzyme && a.kind === kind);
}

export interface Moved {
  changed: string;
  partner: string;
  partnerName: string;
  partnerClass: string;
  before: PairSev;
  after: PairSev;
  cause: string;
  causeGroup: string;
  pinned: boolean;
}

export interface NoHostDiff {
  pair: string;
  hostBefore: PairSev;
  hostAfter: PairSev;
  noHostBefore: PairSev;
  noHostAfter: PairSev;
}

export interface RoleDiffData {
  drugs: number;
  pairsScanned: number;
  moved: Moved[];
  cardOnly: { pair: string; grade: PairSev; added: string[] }[];
  noHostDiffs: NoHostDiff[];
  pinned: { id: string; origin: string; before: PairSev; after: PairSev; cardsBefore: number; cardsAfter: number }[];
  gold: { id: string; floor: Severity; expectCi: boolean; before: PairSev; after: PairSev }[];
  mainRolesOk: boolean;
}

export function collect(): RoleDiffData {
  const mainRolesOk = CHANGED_IDS.every((id) => beforeRoles(id).map(roleCode).join(";") === MAIN_ROLES[id]);
  const ids = [...new Set(DRUGS.map((d) => d.id))].sort();
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const c of CHANGED_IDS) {
    for (const p of ids) {
      if (p === c) continue;
      const key = [c, p].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([c, p]);
    }
  }
  type Snap = { host: Finding[]; none: Finding[] };
  const snap = (): Map<string, Snap> => {
    const m = new Map<string, Snap>();
    for (const [a, b] of pairs) m.set(`${a}|${b}`, { host: pairFindings(a, b, DEFAULT_HOST), none: pairFindings(a, b) });
    return m;
  };
  const before = withMainRoles(snap);
  const after = snap();
  const moved: Moved[] = [];
  const cardOnly: RoleDiffData["cardOnly"] = [];
  const noHostDiffs: NoHostDiff[] = [];
  for (const [a, b] of pairs) {
    const k = `${a}|${b}`;
    const x = before.get(k)!;
    const y = after.get(k)!;
    const hb = highest(x.host);
    const ha = highest(y.host);
    const nb = highest(x.none);
    const na = highest(y.none);
    const partner = DRUG_BY_ID[b];
    if (hb !== ha) {
      moved.push({
        changed: a,
        partner: b,
        partnerName: partner.name,
        partnerClass: partner.cls,
        before: hb,
        after: ha,
        ...(() => {
          const c = causeOf(a, b, x.host, y.host);
          return { cause: c.cause, causeGroup: c.group };
        })(),
        pinned: Boolean(labelContraindicationFor(a, b)),
      });
    } else {
      const bs = new Set(x.host.map((f) => `${suffixOf(f)}:${f.severity}`));
      const added = y.host.map((f) => `${suffixOf(f)}:${f.severity}`).filter((s) => !bs.has(s));
      if (added.length) cardOnly.push({ pair: `${a} + ${b}`, grade: ha, added: added.sort() });
    }
    if ((nb !== na || hb !== ha) && (nb !== hb || na !== ha)) {
      noHostDiffs.push({ pair: `${a} + ${b}`, hostBefore: hb, hostAfter: ha, noHostBefore: nb, noHostAfter: na });
    }
  }
  const touch = (id: string) => CHANGED_IDS.includes(id);
  const pinned = LABEL_CONTRAINDICATIONS.filter((r) => touch(r.labelDrugId) || touch(r.otherId) || r.origin === "wave7")
    .map((r) => {
      const fb = withMainRoles(() => pairFindings(r.labelDrugId, r.otherId, DEFAULT_HOST));
      const fa = pairFindings(r.labelDrugId, r.otherId, DEFAULT_HOST);
      return { id: r.id, origin: r.origin, before: highest(fb), after: highest(fa), cardsBefore: fb.length, cardsAfter: fa.length };
    })
    .sort((p, q) => p.id.localeCompare(q.id));
  const gold = LABEL_GOLD_SET.filter((g) => touch(g.drugA) || touch(g.drugB))
    .map((g) => ({
      id: g.id,
      floor: g.expectedFloor,
      expectCi: g.expectContraindicated,
      before: highest(withMainRoles(() => pairFindings(g.drugA, g.drugB, DEFAULT_HOST))),
      after: highest(pairFindings(g.drugA, g.drugB, DEFAULT_HOST)),
    }))
    .sort((p, q) => p.id.localeCompare(q.id));
  moved.sort(
    (p, q) =>
      CHANGED_IDS.indexOf(p.changed) - CHANGED_IDS.indexOf(q.changed) ||
      p.partnerClass.localeCompare(q.partnerClass) ||
      p.partner.localeCompare(q.partner),
  );
  cardOnly.sort((p, q) => p.pair.localeCompare(q.pair));
  noHostDiffs.sort((p, q) => p.pair.localeCompare(q.pair));
  return { drugs: ids.length, pairsScanned: pairs.length, moved, cardOnly, noHostDiffs, pinned, gold, mainRolesOk };
}

const ROW_LABEL: Record<string, string> = {
  indinavir: "indinavir (shelf row)",
  saquinavir: "saquinavir (shelf row)",
  tipranavir: "tipranavir (Aptivus)",
  "elvitegravir-cobicistat-ftc-taf": "Genvoya (elvitegravir–cobicistat–FTC–TAF)",
  "elvitegravir-cobicistat-ftc-tdf": "Stribild (elvitegravir–cobicistat–FTC–TDF)",
};

/** PharmD / ID review notes. Static text; the numbers above are generated. */
const REVIEWER_NOTES: readonly string[] = [
  "## Reviewer notes (PharmD / infectious disease)",
  "",
  "### How each row is modeled",
  "",
  "- **Indinavir, saquinavir.** These are FDA Table 1 shelf rows. Table 1 lists each only as a sensitive 3A substrate, with footnote 6 (\"Usually administered to patients in combination with ritonavir, a strong CYP3A inhibitor\"), and grades the ritonavir combinations strong. The catalog already has a separate `indinavir-and-ritonavir` row; there is no `saquinavir-and-ritonavir` row (the shelf test keeps that FDA name off on purpose). The strong grade on the plain rows is the grade victim labels give them: Ranexa 7.1 (\"Do not use RANEXA with strong CYP3A inhibitors, including … indinavir, and saquinavir\"), Belsomra 7.2 and Brilinta 7.1 name both among strong CYP3A inhibitors. The shelf file header and the row note say this role is not from Table 1.",
  "- **Tipranavir.** The row is Aptivus, which is labeled only with ritonavir. It is graded as the boosted regimen, the way the darunavir and atazanavir rows already are, using Table 1's grade for tipranavir and ritonavir (strong). Tipranavir alone is not claimed to inhibit 3A4. The existing weak P-gp inhibitor role is kept as is. Not verified from a saved source: that tipranavir alone induces CYP3A in vitro and that tipranavir/ritonavir is a net P-gp inducer at steady state (the Aptivus label is not in the fixture). If the label says net P-gp induction, the weak P-gp inhibitor role should be reviewed separately.",
  "- **Genvoya, Stribild.** Coded exactly like Prezcobix and Symtuza: strong 3A4 inhibitor and weak 2D6 inhibitor (Table 1 grades for cobicistat), major 3A4 substrate (the elvitegravir row and the sibling tablets). The lovastatin label in the fixture lists \"cobicistat-containing products\" among strong CYP3A4 inhibitors. Not coded, to match the siblings: cobicistat P-gp inhibition (the cobicistat row has it) and elvitegravir CYP2C9 induction (not verified from a saved source).",
  "",
  "### Things to know before approving",
  "",
  "1. **Methadone arrow.** The methadone label in the fixture (section 7) says saquinavir+ritonavir and tipranavir+ritonavir have \"resulted in increased clearance or decreased plasma levels of methadone\". A later commit on this branch (`src/lib/drugs/methadone-antiretroviral.ts`, list in `docs/validation/methadone-arv-arrow-2026-11-07.md`) stops every boosted HIV row from showing a CYP3A4 \"higher methadone\" card. With the new roles, methadone with saquinavir and tipranavir shows the label's fall card (major), and methadone with indinavir, Genvoya and Stribild shows a neutral \"direction not settled\" card (moderate), so those pairs are listed above with a derived-card cause.",
  "2. **Two cards on seven pinned pairs.** Lovastatin with indinavir, saquinavir, tipranavir, Genvoya and Stribild, and simvastatin with Genvoya and Stribild, are no-enzyme pins. They stay contraindicated, but the pair now shows the label card and a separate CYP3A4 card at major. Converting them to enzyme pins would show one card; this branch does not touch pins.",
  "3. **Strong-inhibitor derived cards.** The CYP clock and CYP3A4 phenoconversion cards are major for any strong 3A4 inhibitor and any partner with a CYP3A4 substrate role, even a minor one. That is why acetaminophen, losartan or lacosamide with these rows now reads major. Ritonavir and cobicistat pairs with the same partners already read major on main.",
  "4. **No pair becomes contraindicated.** Labels in the fixture name some of these drugs under Contraindications, and those pairs now read major, not contraindicated. Pin candidates (not added): pimozide with indinavir and saquinavir (pimozide CONTRAINDICATIONS); ergotamine with indinavir (ergotamine and caffeine CONTRAINDICATIONS); dihydroergotamine with indinavir (DHE injection CONTRAINDICATIONS); ranolazine with indinavir and saquinavir (Ranexa 7.1, pointing to section 4); rifampin with saquinavir and tipranavir (Rifadin contraindications; rifampin with tipranavir reads moderate, from a washout card only, because tipranavir has no 3A4 substrate role); atazanavir and Evotaz with indinavir (Reyataz and Evotaz section 4, not a CYP finding).",
  "",
  "### Sibling gaps found and not fixed",
  "",
  "Listed for a later wave. None is fixed here because each is a different kind of change or is not checked against a saved source.",
  "",
  "- `tipranavir`: no CYP3A4 substrate role; Table 1 lists tipranavir as a sensitive 3A substrate (already in the FDA disagreement audit as needs-review).",
  "- Unboosted HIV combo tablets carry no roles at all while their single-drug rows do: Biktarvy combo (`bictegravir-emtricitabine-taf`, bictegravir is a 3A4 substrate), Atripla (efavirenz inducer roles), Odefsey, Complera, Juluca, Cabenuva (rilpivirine 3A4 substrate), Delstrigo (doravirine 3A4 substrate). Bixlenvo has the lenacapavir inhibitor role but no 3A4 substrate role.",
  "- Kaletra and the ritonavir-boosted darunavir and atazanavir rows do not carry ritonavir's inducer roles (CYP2B6, CYP1A2, CYP2C9) that the ritonavir row has.",
  "- HCV: Harvoni appears twice; `ledipasvir-sofosbuvir` has P-gp roles and `sofosbuvir-ledipasvir` has none. Vosevi has a P-gp inhibitor role but no P-gp substrate role, unlike Epclusa and Harvoni. Zepatier, glecaprevir, pibrentasvir, sofosbuvir, velpatasvir and voxilaprevir rows have no roles.",
  "- No catalog row for fosamprenavir (Lexiva) or saquinavir and ritonavir.",
  "- Outside HIV, noticed while checking: the Vytorin row (`simvastatin-ezetimibe`) has no CYP3A4 role, so it reads \"Not mapped\" with ritonavir, cobicistat and every row in this change.",
];

const g = (s: PairSev) => `${s} (${SEVERITY_LABEL[s]})`;
const cell = (s: string) => s.replace(/\|/g, "\\|");

function countBy<T>(xs: T[], key: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function render(d: RoleDiffData): string {
  const L: string[] = [];
  L.push("# HIV protease inhibitor and cobicistat booster roles: pair grades before and after (2026-11-07)");
  L.push("");
  L.push("> Generated by `npx --yes tsx scripts/hiv-booster-roles.ts`. Do not hand-edit; re-run the script (`--check` exits 1 if stale).");
  L.push("");
  L.push("Educational reference only. Not FDA-cleared. The Prescribing Information governs. No doses.");
  L.push("");
  L.push("**This is a proposal. Every grade change below needs Kaleb's approval before merge.** No label pin, engine rule or pkSeverity threshold changes; only catalog roles on five rows.");
  L.push("");
  L.push("## Why");
  L.push("");
  L.push("PR #237 (wave 17) noted that the indinavir, saquinavir, tipranavir, Genvoya and Stribild rows had no CYP3A4 inhibitor role, so their pairs with 3A4 victims read lower than ritonavir, cobicistat, Prezcobix, Symtuza, Evotaz and Kaletra. The wave 17 pins for lovastatin and simvastatin with these rows had to use the no-enzyme path for that reason.");
  L.push("");
  L.push("## Roles added");
  L.push("");
  L.push("| Row | On main (8e4c216) | Added | Source |");
  L.push("|---|---|---|---|");
  for (const id of CHANGED_IDS) {
    for (const a of ADDED_ROLES[id]) {
      L.push(`| ${ROW_LABEL[id]} | ${MAIN_ROLES[id] ? `\`${MAIN_ROLES[id]}\`` : "no roles"} | ${a.enzyme} ${a.kind} (${a.grade}) | ${cell(a.source)} |`);
    }
  }
  L.push("");
  L.push("Saved sources only (no live site was reachable from the build machine): FDA Table 1 transcription in `src/lib/drugs/reference/fda-ddi-table.ts` (content current as of 2026-05-29) and the DailyMed SPL drift fixture `scripts/fixtures/label-drift-spl.json` (retrieved 2026-10-28). The Crixivan, Invirase, Aptivus, Genvoya, Stribild and Tybost labels are not in the fixture, so no sentence from those labels is quoted or claimed here.");
  L.push("");
  L.push("## Method");
  L.push("");
  L.push(
    `Every unordered pair of catalog entries that includes one of the five rows (${d.pairsScanned.toLocaleString("en-US")} pairs over ${d.drugs.toLocaleString("en-US")} entries) is run through \`analyze()\` twice: with the added roles removed from the five rows in memory (this equals main: ${d.mainRolesOk ? "checked" : "**MISMATCH**"}), and as shipped on this branch. The pair grade is the highest finding that involves both drugs (\`pairSeverity\` in the label tests). Default host, no amounts. A second scan with no host context is listed below where it differs. A full scan of all 1.8 million catalog pairs on main and on this branch found no moved pair outside these rows.`,
  );
  L.push("");
  const up = d.moved.filter((m) => SEVERITY_RANK[m.after] > SEVERITY_RANK[m.before]).length;
  const down = d.moved.length - up;
  const toCi = d.moved.filter((m) => m.after === "contraindicated").length;
  L.push("## Summary");
  L.push("");
  L.push(`**${d.moved.length.toLocaleString("en-US")} pairs move.** Up ${up.toLocaleString("en-US")}, down ${down}. Pairs that become contraindicated: ${toCi}. Pinned pairs that move: ${d.moved.filter((m) => m.pinned).length}.`);
  L.push("");
  L.push("| Before → after | Pairs |");
  L.push("|---|---:|");
  for (const [k, n] of countBy(d.moved, (m) => `${g(m.before)} → ${g(m.after)}`)) L.push(`| ${k} | ${n} |`);
  L.push("");
  L.push("| Row | Pairs moved | none → major | minor → major | moderate → major | none → moderate | none → minor | other |");
  L.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const id of CHANGED_IDS) {
    const rows = d.moved.filter((m) => m.changed === id);
    const c = (b: PairSev, a: PairSev) => rows.filter((m) => m.before === b && m.after === a).length;
    const known = c("none", "major") + c("minor", "major") + c("moderate", "major") + c("none", "moderate") + c("none", "minor");
    L.push(`| ${ROW_LABEL[id]} | ${rows.length} | ${c("none", "major")} | ${c("minor", "major")} | ${c("moderate", "major")} | ${c("none", "moderate")} | ${c("none", "minor")} | ${rows.length - known} |`);
  }
  L.push("");
  L.push("### By cause");
  L.push("");
  L.push(
    "Cause is the strongest new or raised CYP card on the pair, described by the roles that produce it. A strong CYP3A4 inhibitor also brings the CYP clock card and the CYP3A4 phenoconversion card, both graded major, to every pair whose partner has any CYP3A4 substrate role. That is why a pair whose CYP3A4 card is moderate (strong inhibitor × minor substrate) can read major. Ritonavir, cobicistat and Prezcobix pairs read the same way on main (for example acetaminophen and losartan with ritonavir are major).",
  );
  L.push("");
  L.push("| Cause | Pairs |");
  L.push("|---|---:|");
  for (const [k, n] of countBy(d.moved, (m) => m.causeGroup)) L.push(`| ${cell(k)} | ${n} |`);
  L.push("");
  L.push("### By partner class (top 25)");
  L.push("");
  L.push("| Partner class | Pairs |");
  L.push("|---|---:|");
  for (const [k, n] of countBy(d.moved, (m) => m.partnerClass).slice(0, 25)) L.push(`| ${cell(k)} | ${n} |`);
  L.push("");
  L.push("## Label pins");
  L.push("");
  L.push(
    "Every label pin that involves one of the five rows, plus every pin with origin `wave7` (this includes the wave 17 Zocor, lovastatin and Vfend pins). Default host. No pinned grade moves. The seven no-enzyme pins with these rows (lovastatin with indinavir, saquinavir, tipranavir, Genvoya, Stribild; simvastatin with Genvoya, Stribild) still emit their standalone label card, and the pair now also shows the new CYP3A4 card at major, so the card count goes up. Converting those seven pins to enzyme pins (origin wave7, CYP3A4 inhibitor) would fold the two cards into one; that is a pin change and is not part of this branch.",
  );
  L.push("");
  L.push("| Pin | Origin | Before | After | Cards before → after |");
  L.push("|---|---|---|---|---|");
  for (const p of d.pinned) L.push(`| ${p.id} | ${p.origin} | ${p.before} | ${p.after} | ${p.cardsBefore} → ${p.cardsAfter} |`);
  L.push("");
  L.push("## Gold-set pairs with these rows");
  L.push("");
  if (!d.gold.length) L.push("None.");
  else {
    L.push("| Gold pair | Floor | Expect contraindicated | Before | After |");
    L.push("|---|---|---|---|---|");
    for (const r of d.gold) L.push(`| ${r.id} | ${r.floor} | ${r.expectCi ? "yes" : "no"} | ${r.before} | ${r.after} |`);
  }
  L.push("");
  L.push("## Default host vs no host");
  L.push("");
  if (!d.noHostDiffs.length) L.push("The no-host scan moves exactly the same pairs to the same grades.");
  else {
    L.push("Pairs where the scan with no host context gives a different before or after grade than the default host. Every other moved pair is the same in both scans.");
    L.push("");
    L.push("| Pair | Default host before → after | No host before → after |");
    L.push("|---|---|---|");
    for (const r of d.noHostDiffs) L.push(`| ${r.pair} | ${r.hostBefore} → ${r.hostAfter} | ${r.noHostBefore} → ${r.noHostAfter} |`);
  }
  L.push("");
  L.push("## Pairs that gain a card without changing grade");
  L.push("");
  L.push(`${d.cardOnly.length} pairs keep their grade but show at least one new or higher card.`);
  L.push("");
  L.push("<details><summary>List</summary>");
  L.push("");
  L.push("| Pair | Grade | New cards |");
  L.push("|---|---|---|");
  for (const r of d.cardOnly) L.push(`| ${r.pair} | ${r.grade} | ${cell(r.added.join(", "))} |`);
  L.push("");
  L.push("</details>");
  L.push("");
  L.push(...REVIEWER_NOTES);
  L.push("");
  L.push("## Every moved pair");
  L.push("");
  L.push("Grouped by changed row, then by the partner's catalog class. A pair of two changed rows is listed once, under the row named first in the table above.");
  for (const id of CHANGED_IDS) {
    const rows = d.moved.filter((m) => m.changed === id);
    L.push("");
    L.push(`### ${ROW_LABEL[id]} (${rows.length})`);
    L.push("");
    L.push("| # | Partner | Partner class | Before → after | Cause |");
    L.push("|---:|---|---|---|---|");
    rows.forEach((m, i) => {
      L.push(`| ${i + 1} | ${cell(m.partnerName)} (\`${m.partner}\`) | ${cell(m.partnerClass)} | ${m.before} → ${m.after} | ${cell(m.cause)} |`);
    });
  }
  L.push("");
  return L.join("\n");
}

export const DOC_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "docs/validation/hiv-booster-roles-2026-11-07.md");

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const data = collect();
  const md = render(data);
  if (process.argv.includes("--check")) {
    const cur = existsSync(DOC_PATH) ? readFileSync(DOC_PATH, "utf8") : "";
    if (cur.replace(/\r\n/g, "\n") !== md) {
      console.error(`${DOC_PATH} is stale; re-run scripts/hiv-booster-roles.ts`);
      process.exit(1);
    }
    console.log("hiv-booster-roles doc is up to date");
  } else {
    mkdirSync(dirname(DOC_PATH), { recursive: true });
    writeFileSync(DOC_PATH, md);
    console.log(`wrote ${DOC_PATH}: ${data.moved.length} pairs moved of ${data.pairsScanned} scanned`);
  }
}
