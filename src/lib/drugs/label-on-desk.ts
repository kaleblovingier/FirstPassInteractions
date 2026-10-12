/**
 * A label line already stored for a pair. Not a new finding.
 * Paraphrased gold quotes are not shown. Severity stays on the pair check.
 */

import { DRUG_BY_ID } from "./catalog";
import { LABEL_CONTRAINDICATIONS } from "./label-contraindications";
import { LABEL_GOLD_SET, type LabelClass } from "./reference/label-gold-set";

export type DeskLabel = {
  drugA: string;
  drugB: string;
  nameA: string;
  nameB: string;
  slug: string;
  labelDrug: string;
  labelSection: string;
  quote: string;
  example: string;
  labelClass: LabelClass | null;
  url: string;
  source: "gold" | "pin";
};

type Row = DeskLabel;

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

let rows: Map<string, Row> | null = null;

function index(): Map<string, Row> {
  if (rows) return rows;
  const seen = new Map<string, Row>();
  for (const g of LABEL_GOLD_SET) {
    const da = DRUG_BY_ID[g.drugA];
    const db = DRUG_BY_ID[g.drugB];
    if (!da || !db) continue;
    const key = pairKey(g.drugA, g.drugB);
    if (seen.has(key)) continue;
    seen.set(key, {
      drugA: g.drugA,
      drugB: g.drugB,
      nameA: da.name,
      nameB: db.name,
      slug: `${g.drugA}-${g.drugB}`,
      labelDrug: g.labelDrug,
      labelSection: g.labelSection,
      quote: g.paraphrased ? "" : g.quote.trim(),
      example: (g.labelExample ?? "").trim(),
      labelClass: g.labelClass,
      url: g.url,
      source: "gold",
    });
  }
  for (const p of LABEL_CONTRAINDICATIONS) {
    const da = DRUG_BY_ID[p.labelDrugId];
    const db = DRUG_BY_ID[p.otherId];
    if (!da || !db) continue;
    const key = pairKey(p.labelDrugId, p.otherId);
    const pin: Row = {
      drugA: p.labelDrugId,
      drugB: p.otherId,
      nameA: da.name,
      nameB: db.name,
      slug: `${p.labelDrugId}-${p.otherId}`,
      labelDrug: p.labelDrug,
      labelSection: p.labelSection,
      quote: p.quote.trim(),
      example: (p.labelExample ?? "").trim(),
      labelClass: null,
      url: p.url,
      source: "pin",
    };
    const cur = seen.get(key);
    if (!cur) {
      seen.set(key, pin);
      continue;
    }
    if (!cur.quote) {
      seen.set(key, { ...pin, slug: cur.slug, drugA: cur.drugA, drugB: cur.drugB, nameA: cur.nameA, nameB: cur.nameB });
    }
  }
  rows = seen;
  return seen;
}

export function labelFor(a: string, b: string): DeskLabel | null {
  const row = index().get(pairKey(a, b));
  if (!row?.quote) return null;
  return row;
}

export function deskLabels(ids: readonly string[]): DeskLabel[] {
  const real: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || !DRUG_BY_ID[id]) continue;
    seen.add(id);
    real.push(id);
  }
  const out: DeskLabel[] = [];
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      const row = labelFor(real[i], real[j]);
      if (row) out.push(row);
    }
  }
  return out;
}

export function deskLabelPlain(ids: readonly string[]): string {
  const labels = deskLabels(ids);
  if (labels.length === 0) return "";
  const lines = ["Stored label line. Not a new finding. The pair check is still the severity."];
  for (const row of labels) {
    lines.push(`${row.nameA} · ${row.nameB}.`);
    lines.push(`${row.labelDrug}. ${row.labelSection}.`);
    lines.push(row.quote);
    if (row.example) lines.push(`Names: ${row.example}`);
  }
  return lines.join("\n");
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.length > 0))].sort((a, b) => a.localeCompare(b));
}

export function labelSectionPool(): string[] {
  return unique([...index().values()].map((row) => row.labelSection));
}

export function labelOwnerPool(): string[] {
  return unique([...index().values()].filter((row) => row.quote).map((row) => row.labelDrug));
}

export function labelExamplePool(): string[] {
  return unique([...index().values()].map((row) => row.example));
}
