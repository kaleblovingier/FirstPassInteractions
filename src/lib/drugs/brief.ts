/**
 * Shareable sharpest-pair regimen brief.
 * Pairs first (worst to mild), whole-desk notes after. Educational — not a milligram.
 */

import { DRUG_BY_ID } from "./catalog";
import {
  getCompetitiveInhibitorById,
  getNuclearInducerById,
  getTdiPerpetratorById,
} from "./cyp-kinetics";
import { NO_SINGLE_HALF_LIFE } from "./half-lives";
import { plainLanguageSummary } from "./interaction-summary";
import { isVirtual } from "./host";
import { basisFor } from "./basis";
import { halfLifeFor } from "./overlap";
import { getInteractionsForDrug } from "./pharmacogenomics";
import { getTransporterRolesForDrug } from "./transporter-network";
import { PI_FOOTER, SOFTWARE } from "@/lib/regulatory";
import {
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type Enzyme,
  type EnzymeRole,
  type Finding,
  type ItemKind,
  type PdFlag,
  type Report,
  type Severity,
  type StackBar,
} from "./types";

const MAX_BRIEF_IDS = 8;

/** Closing line for anything copied, printed or downloaded off the desk. */
export const EXPORT_NOT_A_DOSE =
  "Educational reference only. It does not pick a milligram or a next clinical step. The FDA-approved Prescribing Information governs.";

/** What an export says when nothing on the desk matched. */
export const EXPORT_EMPTY =
  "No mapped findings for these names. An empty list is not a green light: the map may simply not cover them.";

/** The lead source for an exported row, so the reader can open it (label pin first, as on the desk). */
export function findingSourceLine(f: Finding): string {
  const b = basisFor(f)[0];
  return b ? `${b.label}${b.href ? ` — ${b.href}` : ""}` : "No external source verified";
}

/** The founding Report: caller's header lines, then every finding with its source, then the footer. */
export function deskReportText(head: string[], findings: Finding[]): string {
  const rows = findings.flatMap((f) => [
    `• ${SEVERITY_LABEL[f.severity]} — ${f.headline}: ${plainLanguageSummary(f)} ${f.mechanism}. ${f.clinical}`,
    `  Source: ${findingSourceLine(f)}`,
  ]);
  return [...head, "", ...(rows.length ? rows : [EXPORT_EMPTY]), "", EXPORT_NOT_A_DOSE, PI_FOOTER].join("\n");
}

export function realDrugIds(drugIds: string[]): string[] {
  return drugIds.filter((id) => id && !isVirtual(id));
}

/** True when the finding is exactly a two-drug pair (no virtual host rows). */
export function isPairFinding(f: Finding): boolean {
  return realDrugIds(f.drugIds).length === 2;
}

/** Keep findings whose real drug ids are all on the tray (drops off-tray food/perp rows). */
export function findingsOnTray(findings: Finding[], trayIds: string[]): Finding[] {
  const tray = new Set(trayIds.filter((id) => id && !isVirtual(id)));
  if (tray.size === 0) return [];
  return findings.filter((f) => {
    const ids = realDrugIds(f.drugIds);
    return ids.length > 0 && ids.every((id) => tray.has(id));
  });
}

export function partitionFindings(findings: Finding[]): {
  pairs: Finding[];
  deskNotes: Finding[];
} {
  const pairs: Finding[] = [];
  const deskNotes: Finding[] = [];
  for (const f of findings) {
    if (isPairFinding(f)) pairs.push(f);
    else deskNotes.push(f);
  }
  const bySeverity = (a: Finding, b: Finding) => {
    const d = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (d) return d;
    return a.headline.localeCompare(b.headline);
  };
  pairs.sort(bySeverity);
  deskNotes.sort(bySeverity);
  return { pairs, deskNotes };
}

function lineFor(f: Finding, n: number): string {
  const sev = SEVERITY_LABEL[f.severity];
  return `${n}. ${sev} — ${f.headline} — ${plainLanguageSummary(f)}`;
}

export interface RegimenBriefInput {
  names: string;
  findings: Finding[];
  highest: Severity | "none";
  /** When set, drop findings that name drugs not on this tray. */
  trayIds?: string[];
  hostLine?: string;
  version?: string;
  /** Optional share URL appended as last content line before the footer. */
  url?: string;
}

/**
 * Plain-text brief: title, lead (sharpest pair + plain sentence),
 * Pairs (worst first), optional whole-desk notes, educational footer.
 */
export function buildRegimenBrief(input: RegimenBriefInput): string {
  const { names, highest, hostLine, version, url, trayIds } = input;
  const scoped = trayIds ? findingsOnTray(input.findings, trayIds) : input.findings;
  const { pairs, deskNotes } = partitionFindings(scoped);
  const ver = version ?? SOFTWARE.version;
  const lines: string[] = [];

  lines.push(`FirstPass regimen brief · ${names || "empty desk"}`);
  lines.push("");

  if (pairs.length === 0) {
    lines.push(
      scoped.length === 0
        ? "No mapped collisions on this tray. Empty is not a green light: the map may simply not cover these names."
        : "No two-drug pairs mapped; see whole-desk notes below.",
    );
  } else {
    const lead = pairs[0]!;
    lines.push(
      `Sharpest pair (${SEVERITY_LABEL[lead.severity]}): ${lead.headline}. ${plainLanguageSummary(lead)}`,
    );
  }

  if (hostLine) {
    lines.push(`Host: ${hostLine}`);
  }
  if (highest !== "none" && pairs.length === 0 && scoped.length > 0) {
    lines.push(`Highest severity on desk: ${SEVERITY_LABEL[highest]}`);
  }

  lines.push("");
  lines.push("Pairs, worst first:");
  if (pairs.length === 0) {
    lines.push("(none)");
  } else {
    pairs.forEach((f, i) => lines.push(lineFor(f, i + 1)));
  }

  if (deskNotes.length > 0) {
    lines.push("");
    lines.push("Whole-desk notes:");
    deskNotes.forEach((f, i) => lines.push(lineFor(f, i + 1)));
  }

  if (url) {
    lines.push("");
    lines.push(`Desk link: ${url}`);
  }

  lines.push("");
  lines.push(
    `Educational desk only · Not FDA-cleared · Does not pick a milligram or next clinical step · Prescribing Information / full SPL governs · ${SOFTWARE.name} ${ver}`,
  );

  return lines.join("\n");
}

/** Relative permalink `/?brief=id1,id2,...` — tray order as passed, max 8. */
export function buildBriefPermalink(ids: string[]): string {
  const clean = ids.filter((id) => id && !isVirtual(id)).slice(0, MAX_BRIEF_IDS);
  const encoded = clean.map((id) => encodeURIComponent(id)).join(",");
  return `/?brief=${encoded}`;
}

function deskBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://firstpass-desk.vercel.app";
}

/** Absolute brief share URL. */
export function buildBriefUrl(ids: string[], opts?: { base?: string }): string {
  const base = (opts?.base ?? deskBase()).replace(/\/$/, "");
  const clean = ids.filter((id) => id && !isVirtual(id)).slice(0, MAX_BRIEF_IDS);
  const url = new URL(base + "/");
  url.searchParams.set("brief", clean.join(","));
  return url.toString();
}

export interface RegimenCompoundExport {
  id: string;
  name: string;
  cls: string;
  kind: ItemKind;
  halfLifeHours: number | null;
  halfLifeLabel: string | null;
  nonLinearHalfLifeNote: string | null;
  enzymes: EnzymeRole[];
  pd: PdFlag[];
  cpicGenes: Array<{
    gene: string;
    cpicLevel: string;
    fdaBoxedWarning: boolean;
    guidelineTitle: string;
  }>;
  transporters: Array<{
    gene: string;
    shortName: string;
    roles: string[];
  }>;
  perpetratorKinetics: Array<{
    mode: "tdi" | "induction" | "competitive";
    summary: string;
  }>;
}

export interface RegimenPathwayRow {
  enzyme: Enzyme;
  substrates: string[];
  inhibitors: string[];
  inducers: string[];
  collisions: number;
  colliding: boolean;
}

export interface RegimenFindingExport {
  id: string;
  severity: Severity;
  severityLabel: string;
  kind: Finding["kind"];
  drugIds: string[];
  headline: string;
  enzymes: Enzyme[];
  effect: string;
  mechanism: string;
  clinical: string;
  plainSummary: string;
  tags: string[];
  source: string;
}

export interface StructuredRegimenExport {
  software: string;
  version: string;
  generatedAt: string;
  hostLine?: string;
  compounds: RegimenCompoundExport[];
  pathwayMatrix: RegimenPathwayRow[];
  highest: Severity | "none";
  highestLabel: string;
  counts: Record<Severity, number>;
  stacks: StackBar[];
  findings: RegimenFindingExport[];
  disclaimer: string;
  prescribingNote: string;
}

export interface StructuredRegimenInput {
  trayIds: string[];
  report: Report;
  hostLine?: string;
  version?: string;
  generatedAt?: string;
}

/**
 * Pure structured JSON monograph export for a regimen tray + analysis report.
 * Deduplicates tray IDs against the catalog and attaches typical adult half-lives where mapped.
 */
export function buildStructuredRegimenJson(input: StructuredRegimenInput): StructuredRegimenExport {
  const seen = new Set<string>();
  const compounds: RegimenCompoundExport[] = [];
  for (const rawId of input.trayIds) {
    if (!rawId || isVirtual(rawId) || !Object.hasOwn(DRUG_BY_ID, rawId)) continue;
    const drug = DRUG_BY_ID[rawId];
    if (!drug || seen.has(drug.id)) continue;
    seen.add(drug.id);
    const hasNonLinear = Object.hasOwn(NO_SINGLE_HALF_LIFE, drug.id);
    const nonLinearHalfLifeNote = hasNonLinear ? NO_SINGLE_HALF_LIFE[drug.id]! : null;
    const hl = hasNonLinear ? undefined : halfLifeFor(drug.id);
    const cpicGenes = getInteractionsForDrug(drug.id).map((ix) => ({
      gene: ix.geneSymbol,
      cpicLevel: ix.cpicLevel,
      fdaBoxedWarning: ix.fdaBoxedWarning,
      guidelineTitle: ix.guidelineTitle,
    }));
    const transporters = getTransporterRolesForDrug(drug.id).map((t) => ({
      gene: t.gene,
      shortName: t.shortName,
      roles: [...t.roles],
    }));
    const perpetratorKinetics: RegimenCompoundExport["perpetratorKinetics"] = [];
    const tdi = getTdiPerpetratorById(drug.id);
    if (tdi) {
      perpetratorKinetics.push({
        mode: "tdi",
        summary: `MBI/TDI (${tdi.targetIsoforms.join("/")}; ${tdi.recoveryTimeDays})`,
      });
    }
    const ind = getNuclearInducerById(drug.id);
    if (ind) {
      perpetratorKinetics.push({
        mode: "induction",
        summary: `${ind.receptor} inducer (${ind.inducedIsoforms.join("/")}; ~${ind.offsetWashoutWeeks} wk offset)`,
      });
    }
    const comp = getCompetitiveInhibitorById(drug.id);
    if (comp) {
      perpetratorKinetics.push({
        mode: "competitive",
        summary: `Competitive inhibitor (${comp.targetIsoforms.join("/")}; Ki ${comp.kiMicromolar} µM; ~${comp.offsetHours} h offset)`,
      });
    }
    compounds.push({
      id: drug.id,
      name: drug.name,
      cls: drug.cls,
      kind: drug.kind,
      halfLifeHours: hl ? hl.hours : null,
      halfLifeLabel: hl ? `${hl.hours} h` : nonLinearHalfLifeNote ? "Non-linear / covalent" : null,
      nonLinearHalfLifeNote,
      enzymes: drug.enzymes.map((role) => ({ ...role })),
      pd: [...drug.pd],
      cpicGenes,
      transporters,
      perpetratorKinetics,
    });
  }

  const pathwayMatrix: RegimenPathwayRow[] = input.report.burden.map((row) => ({
    enzyme: row.enzyme,
    substrates: [...row.substrates],
    inhibitors: [...row.inhibitors],
    inducers: [...row.inducers],
    collisions: row.collisions,
    colliding: row.collisions > 0,
  }));

  const sortedFindings = [...input.report.findings].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (rankDiff) return rankDiff;
    if (a.kind !== b.kind) return a.kind === "pk" ? -1 : 1;
    return a.headline.localeCompare(b.headline);
  });

  const findings: RegimenFindingExport[] = sortedFindings.map((f) => ({
    id: f.id,
    severity: f.severity,
    severityLabel: SEVERITY_LABEL[f.severity],
    kind: f.kind,
    drugIds: [...f.drugIds],
    headline: f.headline,
    enzymes: [...f.enzymes],
    effect: f.effect,
    mechanism: f.mechanism,
    clinical: f.clinical,
    plainSummary: plainLanguageSummary(f),
    tags: [...f.tags],
    source: findingSourceLine(f),
  }));

  return {
    software: SOFTWARE.name,
    version: input.version ?? SOFTWARE.version,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    ...(input.hostLine ? { hostLine: input.hostLine } : {}),
    compounds,
    pathwayMatrix,
    highest: input.report.highest,
    highestLabel: SEVERITY_LABEL[input.report.highest],
    counts: { ...input.report.counts },
    stacks: input.report.stacks.map((s) => ({ ...s, items: [...s.items] })),
    findings,
    disclaimer: EXPORT_NOT_A_DOSE,
    prescribingNote: PI_FOOTER,
  };
}

function escapeMdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatEnzymeRole(role: EnzymeRole): string {
  if (role.kind === "substrate") {
    const qualifiers: string[] = [role.sensitivity];
    if (role.pathway === "activation") qualifiers.push("prodrug activation");
    if (role.nti) qualifiers.push("NTI");
    return `${role.enzyme} substrate (${qualifiers.join(", ")})`;
  }
  return `${role.enzyme} ${role.strength} ${role.kind}`;
}

const SEVERITY_ORDER: readonly Severity[] = ["contraindicated", "major", "moderate", "minor"];

/**
 * Pure Clinical Monograph Markdown report for copy/download and API export.
 */
export function buildMarkdownRegimenReport(input: {
  trayIds: string[];
  report: Report;
  hostLine?: string;
  version?: string;
}): string {
  const structured = buildStructuredRegimenJson(input);
  const lines: string[] = [];

  lines.push("# FirstPass Clinical Monograph Regimen Report");
  lines.push("");
  lines.push(
    `- **Regimen:** ${structured.compounds.length ? structured.compounds.map((c) => c.name).join(" + ") : "Empty desk"}`,
  );
  lines.push(`- **Highest severity:** ${structured.highestLabel}`);
  lines.push(
    `- **Findings:** ${structured.findings.length} total (${structured.counts.contraindicated} ${SEVERITY_LABEL.contraindicated.toLowerCase()}, ${structured.counts.major} ${SEVERITY_LABEL.major.toLowerCase()}, ${structured.counts.moderate} ${SEVERITY_LABEL.moderate.toLowerCase()}, ${structured.counts.minor} ${SEVERITY_LABEL.minor.toLowerCase()})`,
  );
  if (structured.hostLine) {
    lines.push(`- **Host context:** ${structured.hostLine}`);
  }
  lines.push(`- **Reference engine:** ${structured.software} ${structured.version}`);
  lines.push("");

  lines.push("## Regimen Compounds & Metabolic Roles");
  lines.push("");
  if (structured.compounds.length === 0) {
    lines.push("_No catalog compounds on the desk._");
  } else {
    lines.push("| Compound | Class | t½ | CYP / P-gp Roles |");
    lines.push("| --- | --- | --- | --- |");
    for (const compound of structured.compounds) {
      const rolesText = compound.enzymes.length
        ? compound.enzymes.map(formatEnzymeRole).join("; ")
        : "—";
      lines.push(
        `| ${escapeMdCell(compound.name)} | ${escapeMdCell(compound.cls)} | ${escapeMdCell(compound.halfLifeLabel ?? "—")} | ${escapeMdCell(rolesText)} |`,
      );
    }
  }
  lines.push("");

  const extendedCompounds = structured.compounds.filter(
    (c) =>
      c.cpicGenes.length > 0 ||
      c.transporters.length > 0 ||
      c.perpetratorKinetics.length > 0 ||
      c.nonLinearHalfLifeNote !== null,
  );
  if (extendedCompounds.length > 0) {
    lines.push("## Pharmacogenomics, Transporters & Perpetrator Kinetics");
    lines.push("");
    for (const c of extendedCompounds) {
      const notes: string[] = [];
      if (c.cpicGenes.length > 0) {
        notes.push(
          `CPIC PGx: ${c.cpicGenes.map((g) => `${g.gene} (${g.cpicLevel}${g.fdaBoxedWarning ? ", FDA Boxed" : ""})`).join("; ")}`,
        );
      }
      if (c.transporters.length > 0) {
        notes.push(
          `Transporters: ${c.transporters.map((t) => `${t.shortName} (${t.gene}: ${t.roles.join("/")})`).join("; ")}`,
        );
      }
      if (c.perpetratorKinetics.length > 0) {
        notes.push(`Kinetics: ${c.perpetratorKinetics.map((k) => k.summary).join("; ")}`);
      }
      if (c.nonLinearHalfLifeNote) {
        notes.push(`Elimination caveat: ${c.nonLinearHalfLifeNote}`);
      }
      lines.push(`- **${c.name}:** ${notes.join(" · ")}`);
    }
    lines.push("");
  }

  lines.push("## Mechanistic Findings");
  lines.push("");
  if (structured.findings.length === 0) {
    lines.push(EXPORT_EMPTY);
  } else {
    for (const severity of SEVERITY_ORDER) {
      const group = structured.findings.filter((f) => f.severity === severity);
      if (!group.length) continue;
      lines.push(`### ${SEVERITY_LABEL[severity]} (${group.length})`);
      lines.push("");
      for (const f of group) {
        lines.push(`#### ${f.headline}`);
        lines.push(`- **Summary:** ${f.plainSummary}`);
        lines.push(
          `- **Mechanism:** ${f.mechanism}${f.enzymes.length ? ` (${f.enzymes.join(", ")})` : ""}`,
        );
        lines.push(`- **Effect:** ${f.effect}`);
        lines.push(`- **Clinical rationale:** ${f.clinical}`);
        lines.push(`- **Source:** ${f.source}`);
        lines.push("");
      }
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(`> ${structured.disclaimer}`);
  lines.push(">");
  lines.push(`> ${structured.prescribingNote}`);

  return lines.join("\n").trimEnd();
}
