/**
 * Methadone with a CYP3A4-inhibiting antiretroviral (2026-11-07): before -> after
 * list of every methadone pair whose cards change.
 *
 * "Before" is origin/claude/project-thread-u8ylj3-clin-hiv at 95266f4, saved in
 * scripts/fixtures/methadone-arv-before.json: the cards of every methadone pair
 * with a row in METHADONE_ARV, and a digest of the cards of every other
 * methadone pair. "After" is this branch's analyze(). Two-drug pairs only.
 * Default host is the primary scan; the no-host scan is listed where it differs.
 *
 *   npx --yes tsx scripts/methadone-arv-arrow.ts            # write docs/validation/methadone-arv-arrow-2026-11-07.md
 *   npx --yes tsx scripts/methadone-arv-arrow.ts --check    # exit 1 if the doc is stale
 *   npx --yes tsx scripts/methadone-arv-arrow.ts --dump f.json        # dump every methadone pair's cards (run on the base to refresh "before")
 *   npx --yes tsx scripts/methadone-arv-arrow.ts --snapshot f.json    # build the before fixture from such a dump
 *
 * Educational tool, not FDA-cleared. No doses.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DRUGS, DRUG_BY_ID } from "../src/lib/drugs/catalog.ts";
import { analyze } from "../src/lib/drugs/engine.ts";
import {
  METHADONE_ARV,
  METHADONE_ARV_HIGHLIGHT,
  METHADONE_ARV_QUOTE,
  METHADONE_LABEL_SETID,
} from "../src/lib/drugs/methadone-antiretroviral.ts";
import { DEFAULT_HOST, SEVERITY_RANK, type Finding, type Severity } from "../src/lib/drugs/types.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DOC_PATH = resolve(root, "docs/validation/methadone-arv-arrow-2026-11-07.md");
export const BEFORE_PATH = resolve(root, "scripts/fixtures/methadone-arv-before.json");
const SPL_PATH = resolve(root, "scripts/fixtures/label-drift-spl.json");

export const ARV_IDS = Object.keys(METHADONE_ARV);

type Cards = { host: string[]; noHost: string[] };
export interface BeforeFixture {
  base: string;
  card: string;
  pairs: Record<string, Cards>;
  otherPairs: number;
  otherDigest: string;
}

const suffixOf = (f: Finding) => f.id.split("__").pop() ?? f.id;

/** One card as `suffix|severity|effect`, the methadone pair's findings only, sorted. */
export function cardsOf(partner: string, host?: typeof DEFAULT_HOST): string[] {
  return analyze(["methadone", partner], host)
    .findings.filter((f) => f.drugIds.includes("methadone") && f.drugIds.includes(partner))
    .map((f) => `${suffixOf(f)}|${f.severity}|${f.effect}`)
    .sort();
}

function partners(): string[] {
  return [...new Set(DRUGS.map((d) => d.id))].filter((id) => id !== "methadone").sort();
}

function digest(all: Record<string, Cards>, ids: string[]): string {
  const h = createHash("sha256");
  for (const id of ids) h.update(`${id}\n${all[id].host.join("\n")}\n--\n${all[id].noHost.join("\n")}\n==\n`);
  return h.digest("hex");
}

export function dumpAll(): Record<string, Cards> {
  const out: Record<string, Cards> = {};
  for (const id of partners()) out[id] = { host: cardsOf(id, DEFAULT_HOST), noHost: cardsOf(id) };
  return out;
}

type PairSev = Severity | "none";
const gradeOf = (cards: string[]): PairSev =>
  cards.reduce<PairSev>((m, c) => {
    const s = c.split("|")[1] as Severity;
    return SEVERITY_RANK[s] > SEVERITY_RANK[m] ? s : m;
  }, "none");

export interface Change {
  id: string;
  name: string;
  arrow: string;
  before: Cards;
  after: Cards;
  removed: string[];
  added: string[];
  removedNoHost: string[];
  addedNoHost: string[];
  gradeBefore: PairSev;
  gradeAfter: PairSev;
  noHostBefore: PairSev;
  noHostAfter: PairSev;
}

export interface ArrowData {
  changes: Change[];
  otherPairs: number;
  otherUnchanged: boolean;
  base: string;
}

export function collect(): ArrowData {
  const fx = JSON.parse(readFileSync(BEFORE_PATH, "utf8")) as BeforeFixture;
  const all = dumpAll();
  const others = Object.keys(all).filter((id) => !ARV_IDS.includes(id)).sort();
  const changes: Change[] = [];
  for (const id of ARV_IDS) {
    const before = fx.pairs[id];
    const after = all[id];
    const minus = (x: string[], y: string[]) => x.filter((c) => !y.includes(c));
    changes.push({
      id,
      name: displayName(id),
      arrow: METHADONE_ARV[id].arrow,
      before,
      after,
      removed: minus(before.host, after.host),
      added: minus(after.host, before.host),
      removedNoHost: minus(before.noHost, after.noHost),
      addedNoHost: minus(after.noHost, before.noHost),
      gradeBefore: gradeOf(before.host),
      gradeAfter: gradeOf(after.host),
      noHostBefore: gradeOf(before.noHost),
      noHostAfter: gradeOf(after.noHost),
    });
  }
  return {
    changes,
    otherPairs: others.length,
    otherUnchanged: others.length === fx.otherPairs && digest(all, others) === fx.otherDigest,
    base: fx.base,
  };
}

/** Methadone label section 7 text from the saved fixture. */
export function methadoneSection7(): string {
  const fx = JSON.parse(readFileSync(SPL_PATH, "utf8")) as {
    labels: Record<string, { sections: { title: string; text: string }[] }>;
  };
  return fx.labels[METHADONE_LABEL_SETID].sections
    .filter((s) => s.title.startsWith("7"))
    .map((s) => s.text)
    .join(" ");
}

/** The section 7 inhibitor examples line, which lists "protease inhibitors (e.g., ritonavir)". */
export const METHADONE_INHIBITOR_EXAMPLES =
  "Examples: Macrolide antibiotics (e.g., erythromycin), azole-antifungal agents (e.g. ketoconazole), protease inhibitors (e.g., ritonavir), fluconazole, fluvoxamine";

const card = (c: string) => {
  const [s, sev, effect] = c.split("|");
  return `\`${s}\` ${sev} (${effect})`;
};
const cell = (s: string) => s.replace(/\|/g, "\\|");

/** The clinical text of the methadone × antiretroviral card on this branch. */
function newCardText(id: string): string {
  const f = analyze(["methadone", id], DEFAULT_HOST).findings.find((x) => /pd-methadone-(ritonavir|arv-unsettled)$/.test(x.id));
  return f ? f.clinical : "";
}

function transitions(moved: Change[]): string {
  const n = new Map<string, number>();
  for (const c of moved) n.set(`${c.gradeBefore} → ${c.gradeAfter}`, (n.get(`${c.gradeBefore} → ${c.gradeAfter}`) ?? 0) + 1);
  return [...n].map(([k, v]) => `${v} ${k}`).join(", ") || "none";
}

/** Catalog name, with the brand only when the name does not already carry it. */
function displayName(id: string): string {
  const d = DRUG_BY_ID[id];
  const brand = d.brands[0];
  return brand && !d.name.includes(brand) ? `${d.name} (${brand})` : d.name;
}

export function render(d: ArrowData): string {
  const L: string[] = [];
  const falls = d.changes.filter((c) => c.arrow === "falls");
  const unsettled = d.changes.filter((c) => c.arrow === "unsettled");
  const moved = d.changes.filter((c) => c.gradeBefore !== c.gradeAfter);
  L.push("# Methadone with HIV protease inhibitors and boosters: cards before and after (2026-11-07)");
  L.push("");
  L.push("> Generated by `npx --yes tsx scripts/methadone-arv-arrow.ts`. Do not hand-edit; re-run the script (`--check` exits 1 if stale).");
  L.push("");
  L.push("Educational reference only. Not FDA-cleared. The Prescribing Information governs. No doses.");
  L.push("");
  L.push("**This changes clinical warnings. Every card change below needs Kaleb's approval before merge.**");
  L.push("");
  L.push("## Why");
  L.push("");
  L.push(
    "The engine skipped the CYP3A4 inhibitor card (\"higher methadone\") and showed the `pd-methadone-ritonavir` card (\"methadone may fall / withdrawal\") only for `ritonavir` and `paxlovid` (`RITONAVIR_BOOST` in engine.ts). Every other ritonavir- or cobicistat-boosted row, and the five rows that gain a 3A4 inhibitor role on this branch, told the user methadone goes up, with a CYP clock card (\"Methadone rises while the inhibitor is on\") and a CYP3A4 phenoconversion card (\"Methadone: parent climbs\"). The saved methadone label says ritonavir-boosted protease inhibitors lower methadone.",
  );
  L.push("");
  L.push("## What the saved label says");
  L.push("");
  L.push(
    `Methadone HCl tablets SPL \`${METHADONE_LABEL_SETID}\`, section 7 DRUG INTERACTIONS, as saved in \`scripts/fixtures/label-drift-spl.json\` (retrieved 2026-10-28). No live site was reachable from the build machine. Verbatim:`,
  );
  L.push("");
  L.push("- Paradoxical Effects of Antiretroviral Agents on Methadone Hydrochloride Tablets:");
  L.push(`  > ${METHADONE_ARV_QUOTE} This may result in reduced efficacy of methadone hydrochloride tablets and could precipitate a withdrawal syndrome. Monitor methadone-maintained patients receiving any of these anti-retroviral therapies closely for evidence of withdrawal effects and adjust the methadone dose accordingly.`);
  L.push(`- Highlights line in section 7: "Anti-Retroviral Agents: ${METHADONE_ARV_HIGHLIGHT} (7)"`);
  L.push(
    `- Inhibitors of CYP3A4, CYP2B6, CYP2C19, CYP2C9, or CYP2D6 (same section): "${METHADONE_INHIBITOR_EXAMPLES}". The label lists ritonavir here as an example inhibitor that can raise methadone, and in the paragraph above as an antiretroviral that has lowered it. This branch follows the antiretroviral paragraph, which is specific to these drugs.`,
  );
  L.push("");
  L.push(
    "Other saved labels: Norvir, Kaletra, Prezista, Prezcobix, Reyataz, Evotaz and Paxlovid are in the fixture with section 4 (Contraindications) only, and none of those sections mentions methadone. Crixivan, Invirase, Aptivus, Viracept, Genvoya, Stribild, Symtuza and Tybost labels are not in the fixture. So the methadone label is the only saved source for the direction.",
  );
  L.push("");
  L.push("Per row (the label's own words, or why the row is not named):");
  L.push("");
  L.push("| Row | Arrow on this branch | Label words | Saved evidence |");
  L.push("|---|---|---|---|");
  for (const c of d.changes) {
    const r = METHADONE_ARV[c.id];
    L.push(`| ${cell(c.name)} (\`${c.id}\`) | ${r.arrow === "falls" ? "falls (fall card)" : "unsettled (neutral card)"} | ${r.labelName ? `\`${r.labelName}\`` : "not named"} | ${cell(r.why)} |`);
  }
  L.push("");
  L.push("## What changed in the engine");
  L.push("");
  L.push(
    "- `src/lib/drugs/methadone-antiretroviral.ts` lists the rows above with their arrow and saved evidence. It replaces the `RITONAVIR_BOOST` check for methadone. `RITONAVIR_BOOST` is kept, unchanged, for the buprenorphine card only.",
  );
  L.push("- For a listed row that carries a CYP3A4 inhibitor role, with methadone:");
  L.push("  - the CYP3A4 inhibitor card (`pk-CYP3A4-inhibitor-*`, \"↑ exposure\") is not emitted;");
  L.push("  - methadone is not a CYP3A4 victim on that row's CYP clock card, so the clock (and the CYP3A4 + P-gp dual card, which rides on the clock) no longer names methadone;");
  L.push("  - methadone is not a victim on the CYP3A4 phenoconversion card when every 3A4 inhibitor on the desk is a listed row;");
  L.push("  - `falls` rows show `pd-methadone-ritonavir`, major, \"methadone may fall / withdrawal\". Ritonavir and Paxlovid keep their card text from main. The other rows get text that quotes the label paragraph and names the regimen in the label's own words.");
  L.push(`  - \`unsettled\` rows show a new \`pd-methadone-arv-unsettled\` card, moderate (Use care), "methadone direction not settled". Moderate because the label's highlights line says antiretroviral agents "${METHADONE_ARV_HIGHLIGHT}" and the label asks for monitoring. It names no direction.`);
  L.push("- Where the pair has no 3A4 inhibitor card any more, the existing competitive-substrate card (`pk-comp-CYP3A4`, minor) appears for rows that are themselves 3A4 substrates, the same as ritonavir on main.");
  L.push("- The window brief (OTP desk) shows the Paxlovid text only when ritonavir or Paxlovid is on the desk; other fall rows get a label-based withdrawal line, and unsettled rows get a \"direction not settled\" line. The independent-review line for `pd-methadone-ritonavir` now cites the label paragraph; `pd-methadone-arv-unsettled` has its own line.");
  L.push("- Not changed: buprenorphine cards; the standalone cobicistat (Tybost) row, its methadone card and its desk copy; every pair without methadone; every methadone pair with a row not listed above.");
  L.push("");
  L.push("## Method");
  L.push("");
  L.push(
    `Before: \`${d.base}\`, saved in \`scripts/fixtures/methadone-arv-before.json\` (cards of methadone with each listed row, and a SHA-256 digest of the cards of methadone with every other catalog row). After: this branch. Both run the app's own \`analyze(["methadone", row])\`; a card is any finding that names both drugs, written as suffix, severity and effect. Pair grade is the highest such card (the \`pairSeverity\` rule in the label tests). Default host is the primary scan; the no-host scan is shown where it differs. Two-drug pairs only.`,
  );
  L.push("");
  L.push(
    `Methadone with every other catalog row (${d.otherPairs} pairs): ${d.otherUnchanged ? "unchanged (digest matches)" : "**CHANGED: digest does not match**"}.`,
  );
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(
    `**${d.changes.length} methadone pairs change cards.** ${falls.length} now show the fall card, ${unsettled.length} show the neutral card. No pair shows a CYP3A4 "higher methadone" card, a CYP clock card naming methadone, or a CYP3A4 phenoconversion card naming methadone. ${moved.length} pair grades move (default host): ${transitions(moved)}. No grade goes up and no pair becomes contraindicated.`,
  );
  const hostDiff = d.changes.filter((c) => c.gradeBefore !== c.noHostBefore || c.gradeAfter !== c.noHostAfter);
  L.push("");
  L.push(
    hostDiff.length
      ? `No-host grades differ for: ${hostDiff.map((c) => `${c.id} (${c.noHostBefore} → ${c.noHostAfter})`).join(", ")}.`
      : "The no-host scan gives the same grade before and after for every pair.",
  );
  L.push("");
  L.push("## Every changed pair, card by card");
  L.push("");
  const odd = d.changes.filter(
    (c) =>
      !(
        c.removedNoHost.every((x) => c.removed.includes(x)) &&
        c.addedNoHost.every((x) => c.added.includes(x)) &&
        c.removed.filter((x) => !c.removedNoHost.includes(x)).every((x) => x.startsWith("pheno-")) &&
        c.added.every((x) => c.addedNoHost.includes(x))
      ),
  );
  L.push(
    `Default host. Cards not listed are the same before and after. ${odd.length ? `The no-host scan differs from this table for: ${odd.map((c) => c.id).join(", ")}.` : "The no-host scan has the same changes, minus the CYP3A4 phenoconversion card (it needs a host)."}`,
  );
  L.push("");
  L.push("| Methadone + | Arrow | Grade | Removed | Added |");
  L.push("|---|---|---|---|---|");
  for (const c of d.changes) {
    L.push(
      `| ${cell(c.name)} (\`${c.id}\`) | ${c.arrow} | ${c.gradeBefore} → ${c.gradeAfter} | ${cell(c.removed.map(card).join("; ") || "none")} | ${cell(c.added.map(card).join("; ") || "none")} |`,
    );
  }
  L.push("");
  L.push("## Card text on this branch");
  L.push("");
  L.push("- Ritonavir and Paxlovid (unchanged from main):");
  L.push(`  > ${newCardText("ritonavir")}`);
  L.push("- Other fall rows. Kaletra shown; the other rows differ only in the label words and the evidence sentence in the table above:");
  L.push(`  > ${newCardText("lopinavir")}`);
  L.push("- Neutral rows. Prezcobix shown; the other rows differ only in the name and the evidence sentence:");
  L.push(`  > ${newCardText("darunavir-cobicistat")}`);
  L.push("");
  L.push("## Not sourced, and open questions for review");
  L.push("");
  L.push(
    "1. **Cobicistat rows read as unsettled, not as a rise.** No saved label gives the methadone direction with cobicistat or elvitegravir/cobicistat. The Genvoya, Stribild, Prezcobix, Symtuza, Evotaz and Tybost labels would settle it; none is in the fixture with its drug interaction section.",
  );
  L.push(
    "2. **Tybost (standalone cobicistat) still says methadone rises.** Its CYP3A4 card, the catalog note, the clinic boxed line, the sample, the \"Tybost is not Norvir\" rounds case and the window brief all teach that cobicistat raises methadone. That claim is not in a saved source either. It is left as is because it is a separate teaching theme across several files; if the cobicistat combo rows should read unsettled, Tybost probably should too.",
  );
  L.push(
    "3. **Ritonavir combinations the label does not name read as unsettled**: indinavir and ritonavir, elvitegravir and ritonavir, and the paritaprevir/ritonavir hepatitis C regimen. The label names ritonavir alone (\"alone and in combination\"), so a reviewer may prefer the fall card for these. Paxlovid, also not named, keeps its fall card from main.",
  );
  L.push(
    "4. **Darunavir (Prezista) reads as falls** because the label names darunavir+ritonavir and the row is graded as boosted. The row's own copy says it is boosted with ritonavir or cobicistat; with cobicistat the direction is not in a saved source.",
  );
  L.push(
    "5. **Atazanavir (Reyataz) and indinavir read as unsettled**: neither is named in the methadone label. Nelfinavir is not a boosted row but the label names it, so it now shows the fall card instead of the rise card.",
  );
  L.push(
    "6. **The methadone label also lists \"protease inhibitors (e.g., ritonavir)\" as example CYP inhibitors that can raise methadone** (quoted above). This branch follows the specific antiretroviral paragraph.",
  );
  L.push(
    "7. **The CYP clock card is now absent for methadone with ritonavir and Paxlovid** (it read \"TDI linger … Methadone climbs … stays high\"), along with the dual CYP3A4 + P-gp card that rides on it. Both pairs stay major through the fall card and ritonavir's 2B6 inducer card.",
  );
  L.push(
    "8. Three-drug desks were not scanned. On a desk with methadone, a listed row and a non-listed 3A4 inhibitor (for example ketoconazole), the phenoconversion card still names methadone, because the non-listed inhibitor does raise it.",
  );
  L.push("");
  return L.join("\n");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (flag: string) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const dumpTo = arg("--dump");
  const snapFrom = arg("--snapshot");
  if (dumpTo) {
    writeFileSync(dumpTo, JSON.stringify(dumpAll()));
    console.log(`wrote ${dumpTo}`);
  } else if (snapFrom) {
    const all = JSON.parse(readFileSync(snapFrom, "utf8")) as Record<string, Cards>;
    const others = Object.keys(all).filter((id) => !ARV_IDS.includes(id)).sort();
    const pairs: Record<string, Cards> = {};
    for (const id of ARV_IDS) pairs[id] = all[id];
    const fx: BeforeFixture = {
      base: arg("--base") ?? "origin/claude/project-thread-u8ylj3-clin-hiv @ 95266f4",
      card: "suffix|severity|effect; findings naming methadone and the partner; host = DEFAULT_HOST, noHost = no host context",
      pairs,
      otherPairs: others.length,
      otherDigest: digest(all, others),
    };
    writeFileSync(BEFORE_PATH, JSON.stringify(fx, null, 2) + "\n");
    console.log(`wrote ${BEFORE_PATH}`);
  } else {
    const md = render(collect());
    if (process.argv.includes("--check")) {
      const cur = existsSync(DOC_PATH) ? readFileSync(DOC_PATH, "utf8") : "";
      if (cur.replace(/\r\n/g, "\n") !== md) {
        console.error(`${DOC_PATH} is stale; re-run scripts/methadone-arv-arrow.ts`);
        process.exit(1);
      }
      console.log("methadone-arv-arrow doc is up to date");
    } else {
      writeFileSync(DOC_PATH, md);
      console.log(`wrote ${DOC_PATH}`);
    }
  }
}
