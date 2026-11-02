/**
 * Shareable sharpest-pair regimen brief.
 * Pairs first (worst to mild), whole-desk notes after. Educational — not a milligram.
 */

import { plainLanguageSummary } from "./interaction-summary";
import { isVirtual } from "./host";
import { basisFor } from "./basis";
import { PI_FOOTER, SOFTWARE } from "@/lib/regulatory";
import {
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type Finding,
  type Severity,
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
