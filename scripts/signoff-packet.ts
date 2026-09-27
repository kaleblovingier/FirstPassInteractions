/**
 * Generate docs/clinical-review/signoff-packet.md: every engine rule that can
 * emit a "contraindicated" or "major" finding for a two-drug desk, with pair
 * counts across the catalog, examples, the source the engine cites, and a blank
 * reviewer column.
 *
 *   npx --no-install tsx scripts/signoff-packet.ts           # write the doc
 *   npx --no-install tsx scripts/signoff-packet.ts --check   # exit 1 if stale
 *
 * Read-only against the engine: it calls analyze() on every catalog pair (no
 * host context, no entered amounts) and groups what comes back. It does not
 * change severities. Output is deterministic (no timestamps).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DRUGS, DRUG_BY_ID } from "../src/lib/drugs/catalog.ts";
import { analyze } from "../src/lib/drugs/engine.ts";
import { basisFor } from "../src/lib/drugs/basis.ts";
import type { Drug, Finding, Severity } from "../src/lib/drugs/types.ts";

type Section = "pd" | "pk" | "clock" | "washout";

interface RuleAgg {
  key: string;
  section: Section;
  severity: Severity;
  title: string;
  trigger: string;
  pairs: Set<string>;
  findings: number;
  examples: string[];
  labelSource?: string;
  pubmedPairs: number;
  /** PK only: per-enzyme finding counts. */
  enzymes: Map<string, number>;
}

const HIGH: Severity[] = ["contraindicated", "major"];

function suffixOf(f: Finding) {
  const parts = f.id.split("__");
  return parts[parts.length - 1] ?? f.id;
}

function pkParse(f: Finding) {
  // clinical: "<perp> is a <strength> <enzyme> <kind>. <victim> is a <sens> <enzyme> substrate[ with a narrow therapeutic index][ (prodrug)]."
  const kind = f.tags.includes("inducer") ? "inducer" : "inhibitor";
  const strength = (f.mechanism.split(" ")[0] ?? "") as string;
  const m = f.clinical.match(/is an? (sensitive|major|minor) \S+ substrate( with a narrow therapeutic index)?/);
  const sens = m?.[1] ?? "?";
  const nti = Boolean(m?.[2]);
  const pathway = f.tags.includes("activation") ? "activation" : "clearance";
  return { kind, strength, sens, nti, pathway };
}

function pkTrigger(p: ReturnType<typeof pkParse>): { title: string; trigger: string; key: string } {
  const victim =
    p.pathway === "activation"
      ? "a prodrug that needs the enzyme for activation"
      : p.nti && p.sens !== "sensitive"
        ? `a narrow-therapeutic-index substrate (catalog grade "${p.sens}")`
        : p.sens === "sensitive"
          ? p.nti
            ? `a sensitive, narrow-therapeutic-index substrate`
            : `a sensitive substrate`
          : `a "${p.sens}" substrate`;
  // pkSeverity ignores pathway for inhibitors; only inducers branch on prodrug activation.
  const ntiGroup =
    p.kind === "inducer" && p.pathway === "activation" ? "activation" : p.sens === "sensitive" || p.nti ? "sensitive-or-NTI" : p.sens;
  const key = `pk|${p.kind}|${p.strength}|${ntiGroup}`;
  const victimGroup =
    ntiGroup === "activation"
      ? "a prodrug activated by that enzyme"
      : ntiGroup === "sensitive-or-NTI"
        ? "a sensitive or narrow-therapeutic-index (NTI) substrate of the same enzyme"
        : `a substrate graded "${ntiGroup}" on the same enzyme`;
  const prodrugNote = p.kind === "inhibitor" ? " Prodrug (activation) substrates are graded the same way for inhibitors." : "";
  void victim;
  return {
    key,
    title: `CYP/P-gp ${p.kind === "inhibitor" ? "inhibition" : "induction"}: ${p.strength} ${p.kind} × ${ntiGroup === "sensitive-or-NTI" ? "sensitive/NTI" : ntiGroup} substrate`,
    trigger: `One drug is a ${p.strength} ${p.kind} of an enzyme (CYP or P-gp) and the other is ${victimGroup}. Severity comes from pkSeverity() in engine.ts, not from a label lookup.${prodrugNote}`,
  };
}

function sourceFor(f: Finding): { label?: string; pubmed: boolean } {
  const basis = basisFor(f);
  const lab = basis.find((b) => b.kind === "fda-boxed" || b.kind === "fda-pi" || b.kind === "fda-warning");
  return {
    label: lab ? `${lab.kind === "fda-boxed" ? "Label (boxed / contraindication / safety communication, per basis.ts)" : "Label (PI paraphrase in basis.ts)"}: ${lab.detail}` : undefined,
    pubmed: basis.some((b) => b.kind === "pubmed"),
  };
}

function genericKey(suffix: string, a: Drug, b: Drug) {
  let s = suffix;
  for (const id of [a.id, b.id].sort((x, y) => y.length - x.length)) s = s.split(id).join("<drug>");
  return s;
}

export interface PacketData {
  rules: RuleAgg[];
  pairsScanned: number;
  drugs: number;
  pkContra: { findings: number; pgp: number; pairs: number; pairsOnlyPk: number };
  ghb: { pairs: number; hypnoticOrAlcohol: number; other: number };
  pgp: { strong: number; moderate: number; weak: number; contraFindings: number; majorFindings: number };
}

export function collect(): PacketData {
  const rules = new Map<string, RuleAgg>();
  const ids = DRUGS.map((d) => d.id);
  let pairsScanned = 0;
  let pkContraFindings = 0;
  let pkContraPgp = 0;
  const pkContraPairs = new Set<string>();
  const pairsOtherContra = new Set<string>();
  const ghbPartners = { pairs: 0, hypnoticOrAlcohol: 0, other: 0 };
  const pgpCounts = { contra: 0, major: 0 };

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairsScanned++;
      const a = DRUG_BY_ID[ids[i]];
      const b = DRUG_BY_ID[ids[j]];
      const pairKey = `${a.name} + ${b.name}`;
      for (const f of analyze([a.id, b.id]).findings) {
        if (!HIGH.includes(f.severity)) continue;
        const suffix = suffixOf(f);
        let key: string;
        let section: Section;
        let title: string;
        let trigger: string;
        if (f.kind === "pk" && suffix.startsWith("pk-") && !suffix.startsWith("pk-comp")) {
          const p = pkParse(f);
          const t = pkTrigger(p);
          key = `${t.key}|${f.severity}`;
          section = "pk";
          title = t.title;
          trigger = t.trigger;
          if (f.severity === "contraindicated") {
            pkContraFindings++;
            if (f.enzymes.includes("P-gp")) pkContraPgp++;
            pkContraPairs.add(pairKey);
          }
          if (f.enzymes.includes("P-gp")) {
            if (f.severity === "contraindicated") pgpCounts.contra++;
            else pgpCounts.major++;
          }
        } else if (suffix === "cyp-clock" || suffix === "cyp-dual") {
          key = `${suffix}|${f.severity}`;
          section = "clock";
          title = suffix === "cyp-clock" ? "CYP safety clock (strong / danger-tone perpetrator card)" : "CYP3A4 + P-gp dual-hit card";
          trigger =
            suffix === "cyp-clock"
              ? "protocolFindings() in cyp-protocol.ts: a perpetrator on the clock index list has a victim on the desk. Major when the card's grade is strong or its tone is danger."
              : "protocolFindings(): the perpetrator card is flagged as hitting both CYP3A4 and P-gp, and a victim is on the desk.";
        } else if (suffix.startsWith("washout-")) {
          key = `washout|${f.severity}`;
          section = "washout";
          title = "Washout clock with a serotonergic / stimulant / MAOI partner";
          trigger =
            "washoutFindings(): a drug with a WASHOUT entry (host.ts) is on the desk with another real drug, and some other drug is serotonergic, a stimulant, or an MAOI. Major in that case, moderate otherwise.";
        } else {
          const g = genericKey(suffix, a, b);
          key = `${g}|${f.severity}`;
          section = "pd";
          title = `${f.mechanism}`;
          trigger = `${f.mechanism}: ${f.effect}. Rule id \`${g}\` in engine.ts.`;
          if (f.severity === "contraindicated") pairsOtherContra.add(pairKey);
          if (g === "pd-ghb-cns") {
            ghbPartners.pairs++;
            const partner = a.pd.includes("ghb") ? b : a;
            if (partner.pd.includes("alcohol") || partner.pd.includes("benzo-zdrug") || /hypnotic|barbiturate/i.test(partner.cls)) ghbPartners.hypnoticOrAlcohol++;
            else ghbPartners.other++;
          }
        }
        let r = rules.get(key);
        if (!r) {
          r = { key, section, severity: f.severity, title, trigger, pairs: new Set(), findings: 0, examples: [], pubmedPairs: 0, enzymes: new Map() };
          rules.set(key, r);
        }
        r.findings++;
        if (section === "pk") for (const e of f.enzymes) r.enzymes.set(e, (r.enzymes.get(e) ?? 0) + 1);
        if (!r.pairs.has(pairKey)) {
          r.pairs.add(pairKey);
          const src = sourceFor(f);
          if (src.label && !r.labelSource) r.labelSource = src.label;
          if (src.pubmed) r.pubmedPairs++;
          if (r.examples.length < 3) r.examples.push(pairKey);
        }
      }
    }
  }

  let strong = 0, moderate = 0, weak = 0;
  for (const d of DRUGS)
    for (const e of d.enzymes)
      if (e.enzyme === "P-gp" && e.kind === "inhibitor") {
        if (e.strength === "strong") strong++;
        else if (e.strength === "moderate") moderate++;
        else weak++;
      }

  const pairsOnlyPk = [...pkContraPairs].filter((p) => !pairsOtherContra.has(p)).length;
  const order: Section[] = ["pd", "pk", "clock", "washout"];
  const sorted = [...rules.values()].sort(
    (x, y) =>
      order.indexOf(x.section) - order.indexOf(y.section) ||
      (x.severity === y.severity ? 0 : x.severity === "contraindicated" ? -1 : 1) ||
      y.pairs.size - x.pairs.size ||
      x.key.localeCompare(y.key),
  );
  return {
    rules: sorted,
    pairsScanned,
    drugs: ids.length,
    pkContra: { findings: pkContraFindings, pgp: pkContraPgp, pairs: pkContraPairs.size, pairsOnlyPk },
    ghb: ghbPartners,
    pgp: { strong, moderate, weak, contraFindings: pgpCounts.contra, majorFindings: pgpCounts.major },
  };
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const REVIEW = "☐ Approve ☐ Downgrade to ___ ☐ Flag · initials ___ · date ___";
const fmt = (n: number) => n.toLocaleString("en-US");

function source(r: RuleAgg) {
  if (r.labelSource) return esc(r.labelSource);
  if (r.section === "clock") return "Label/guidance paraphrase in basis.ts (FDA 2020 DDI studies / Huang 2007 grading); card grades are curated.";
  if (r.pubmedPairs) return `Curated map only for the rule; a drug-level PubMed cite is attached on ${fmt(r.pubmedPairs)}/${fmt(r.pairs.size)} pairs (not rule-specific).`;
  return "Curated map only";
}

function table(rules: RuleAgg[], start: number, pk = false) {
  const L: string[] = [];
  L.push(`| # | Rule | Severity | What triggers it | Pairs | Example pairs | Current cited source | Reviewer |`);
  L.push(`| ---: | --- | --- | --- | ---: | --- | --- | --- |`);
  rules.forEach((r, i) => {
    const enz = pk && r.enzymes.size ? ` Findings by enzyme: ${[...r.enzymes].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${fmt(n)}`).join(", ")}.` : "";
    L.push(`| ${start + i} | ${esc(r.title)} | ${r.severity} | ${esc(r.trigger)}${enz} | ${fmt(r.pairs.size)} | ${esc(r.examples.join("; "))} | ${source(r)} | ${REVIEW} |`);
  });
  return L;
}

export function renderPacket(data: PacketData = collect()): string {
  const L: string[] = [];
  const bySec = (s: Section) => data.rules.filter((r) => r.section === s);
  L.push("# PharmD sign-off packet: contraindicated and major rules (generated)");
  L.push("");
  L.push("> Generated by `npx --no-install tsx scripts/signoff-packet.ts`. Do not hand-edit; re-run the script.");
  L.push("");
  L.push("## Purpose");
  L.push("");
  L.push("This packet lists every rule in the interaction engine that can produce a **contraindicated** or **major** finding, so that a pharmacist can approve, downgrade, or flag each one. Each row gives a plain description of what triggers the rule, how many catalog drug pairs it fires on, three example pairs, the source the app currently cites, and a blank reviewer column.");
  L.push("");
  L.push("- **Status: no clinician has reviewed this content yet.** Every severity below is the current engine output, not a reviewed judgment.");
  L.push("- FirstPass is an educational interaction reference, not a substitute for clinical judgment, and not FDA-cleared.");
  L.push("- This packet contains no doses and makes no regulatory claims. Label references are paraphrases; open the Prescribing Information.");
  L.push("");
  L.push("## How the counts were made");
  L.push("");
  L.push(`- Every unordered pair of the ${fmt(data.drugs)} catalog entries (${fmt(data.pairsScanned)} pairs) was run through \`analyze([a, b])\` with no host context (no phenotypes, smoking, alcohol, renal, pregnancy) and no entered amounts. Host-, phenotype-, and dose-driven rules are therefore **not** counted here.`);
  L.push("- \"Pairs\" = distinct drug pairs on which the rule produced a contraindicated/major finding. One pair can appear under several rules.");
  L.push("- PK rules are grouped by the escalation branch in `pkSeverity()` (perpetrator strength × victim grade), across all enzymes; the per-enzyme finding split is in the trigger column.");
  L.push("- \"Current cited source\" is what `basisFor()` in `src/lib/drugs/basis.ts` attaches today: a label/PI paraphrase keyed to the rule, or a drug-level PubMed cite, or nothing (\"curated map only\").");
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push("| Section | Rules | Contraindicated rules | Major rules |");
  L.push("| --- | ---: | ---: | ---: |");
  const secName: Record<Section, string> = { pd: "Class / pharmacodynamic rules", pk: "CYP / P-gp escalation", clock: "CYP safety-clock cards", washout: "Washout clock" };
  for (const s of ["pd", "pk", "clock", "washout"] as Section[]) {
    const rs = bySec(s);
    L.push(`| ${secName[s]} | ${rs.length} | ${rs.filter((r) => r.severity === "contraindicated").length} | ${rs.filter((r) => r.severity === "major").length} |`);
  }
  L.push("");
  let n = 1;
  L.push("## 1. Class / pharmacodynamic rules");
  L.push("");
  L.push("Rules keyed on PD flags, drug classes, or named drug sets (e.g. sodium oxybate × CNS depressant, MAOI × stimulant, serotonergic stacks, QT). `<drug>` in a rule id stands for one of the pair's own ids.");
  L.push("");
  L.push(...table(bySec("pd"), n));
  n += bySec("pd").length;
  L.push("");
  L.push("## 2. CYP / P-gp escalation (pkSeverity)");
  L.push("");
  L.push("Inhibitors: strong × sensitive/NTI → contraindicated; strong × major → major; moderate × sensitive/NTI → major. Inducers (clearance): strong × sensitive/NTI → contraindicated; strong × any → major; moderate × sensitive/NTI/major → major. Inducers on a prodrug (activation): strong → major.");
  L.push("");
  L.push(...table(bySec("pk"), n, true));
  n += bySec("pk").length;
  L.push("");
  L.push("## 3. CYP safety-clock cards");
  L.push("");
  L.push(...table(bySec("clock"), n));
  n += bySec("clock").length;
  L.push("");
  L.push("## 4. Washout clock");
  L.push("");
  L.push(...table(bySec("washout"), n));
  L.push("");
  L.push("## Known open questions");
  L.push("");
  L.push(`1. **CYP escalation to "contraindicated" without a label contraindication.** \`pkSeverity()\` returns contraindicated whenever a strong inhibitor or strong inducer meets a sensitive or narrow-therapeutic-index substrate. On current main that produces **${fmt(data.pkContra.findings)} contraindicated PK findings** (${fmt(data.pkContra.findings - data.pkContra.pgp)} CYP, ${fmt(data.pkContra.pgp)} P-gp) across **${fmt(data.pkContra.pairs)} drug pairs**; on **${fmt(data.pkContra.pairsOnlyPk)}** of those pairs the PK rule is the only source of the contraindicated verdict (no class/PD contraindicated rule also fires). None of these findings carries a rule-keyed label citation in \`basis.ts\`. Some are labeled contraindications (for example certain statin or sedative combinations); many are not. **Proposal, pending Kaleb's decision:** keep "contraindicated" only where a label says so, and move the rest to "major". No severity is changed by this packet.`);
  L.push(`2. **Sodium oxybate (GHB) × non-hypnotic CNS depressants.** Rule \`pd-ghb-cns\` marks sodium oxybate with any CNS depressant, benzodiazepine, opioid, or alcohol as contraindicated (${fmt(data.ghb.pairs)} pairs). The oxybate labels contraindicate use with sedative hypnotics and alcohol; other CNS depressants are a warning. Of the ${fmt(data.ghb.pairs)} pairs, about ${fmt(data.ghb.hypnoticOrAlcohol)} have an alcohol / benzodiazepine / Z-drug / hypnotic / barbiturate partner and about ${fmt(data.ghb.other)} have some other CNS depressant partner (heuristic split by PD flag and class name). Those others may belong at major.`);
  L.push(`3. **P-gp strength gaps.** FDA's reference table lists P-gp inhibitors without a potency grade, but the catalog stores a grade on every P-gp inhibitor role (currently ${fmt(data.pgp.strong)} strong, ${fmt(data.pgp.moderate)} moderate, ${fmt(data.pgp.weak)} weak), and \`pkSeverity()\` uses it exactly like a CYP grade. That drives ${fmt(data.pgp.contraFindings)} contraindicated and ${fmt(data.pgp.majorFindings)} major P-gp findings on this scan. Several drugs FDA lists as P-gp inhibitors (capmatinib, lapatinib, lopinavir/ritonavir, pirtobrutinib, propafenone, sofosbuvir/velpatasvir/voxilaprevir, tucatinib) have no P-gp inhibitor role here because a grade would have to be invented. A reviewer should decide how P-gp should be graded, or whether P-gp findings should be capped.`);
  L.push("");
  L.push("## Sign-off");
  L.push("");
  L.push("| Reviewer name | Credentials | Sections reviewed | Signature | Date |");
  L.push("| --- | --- | --- | --- | --- |");
  L.push("| | | | | |");
  L.push("");
  return L.join("\n");
}

export const PACKET_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "docs/clinical-review/signoff-packet.md");

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const data = collect();
  const md = renderPacket(data);
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(PACKET_PATH, "utf8");
    } catch {
      /* missing */
    }
    if (current !== md) {
      console.error("docs/clinical-review/signoff-packet.md is stale; re-run scripts/signoff-packet.ts");
      process.exit(1);
    }
  } else {
    mkdirSync(dirname(PACKET_PATH), { recursive: true });
    writeFileSync(PACKET_PATH, md);
  }
  console.log(`Rules: ${data.rules.length}; pairs scanned: ${data.pairsScanned}`);
  console.log(`PK contraindicated: ${data.pkContra.findings} findings, ${data.pkContra.pairs} pairs, ${data.pkContra.pairsOnlyPk} pairs PK-only`);
  console.log(`GHB pairs: ${JSON.stringify(data.ghb)}; P-gp: ${JSON.stringify(data.pgp)}`);
}
