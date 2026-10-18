/**
 * A label line already stored for a pair. Not a new finding.
 * Paraphrased gold quotes are not shown. Severity stays on the pair check.
 */

import { DRUG_BY_ID } from "./catalog";
import { LABEL_CONTRAINDICATIONS, LABEL_CONTRAINDICATIONS_RETRIEVED } from "./label-contraindications";
import { LABEL_GOLD_SET, type LabelClass } from "./reference/label-gold-set";
import type { Enzyme } from "./types";

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
  mechanism: "PK" | "PD" | "PK+PD" | null;
  domain: string | null;
  basis: "named" | "class" | null;
  /** Enzyme the pin stores. Not a finding. Null when no pin stores one. */
  pinEnzyme: Enzyme | null;
  /** Direction the pin stores on that enzyme. Null when the pin omits it. */
  pinKind: "inhibitor" | "inducer" | null;
  /** Contraindications sentence stored on the pin. Null when the pin has none. */
  pinSentence: string | null;
  /** Named or class on the pin. Kept even when a gold quote owns the line. */
  pinBasis: "named" | "class" | null;
  /** Day this quote was stored from the label. Not a severity. */
  retrieved: string;
  /**
   * Stored scope sentence from the gold note. Null when the note is missing
   * or is an engineering comment (floor, catalog, pin). Not a severity.
   */
  scopeNote: string | null;
  /** Gold search words. Null on a pin-only line. Not a severity. */
  queries: [string, string] | null;
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
      mechanism: g.mechanism,
      domain: g.domain,
      basis: null,
      pinEnzyme: null,
      pinKind: null,
      pinSentence: null,
      pinBasis: null,
      retrieved: g.retrieved,
      scopeNote: scopeNoteOf(g.note),
      queries: g.queries,
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
      mechanism: null,
      domain: null,
      basis: p.basis,
      pinEnzyme: p.enzyme ?? null,
      pinKind: p.kind ?? null,
      pinSentence: sentenceOf(p.contraindicationsSentence),
      pinBasis: p.basis,
      retrieved: p.retrieved ?? LABEL_CONTRAINDICATIONS_RETRIEVED,
      scopeNote: null,
      queries: null,
      url: p.url,
      source: "pin",
    };
    const cur = seen.get(key);
    const held = {
      pinEnzyme: p.enzyme ?? cur?.pinEnzyme ?? null,
      pinKind: p.kind ?? cur?.pinKind ?? null,
      pinSentence: sentenceOf(p.contraindicationsSentence) ?? cur?.pinSentence ?? null,
      pinBasis: p.basis ?? cur?.pinBasis ?? null,
    };
    if (!cur) {
      seen.set(key, { ...pin, ...held });
      continue;
    }
    if (!cur.quote) {
      seen.set(key, {
        ...pin,
        slug: cur.slug,
        drugA: cur.drugA,
        drugB: cur.drugB,
        nameA: cur.nameA,
        nameB: cur.nameB,
        scopeNote: cur.scopeNote,
        queries: cur.queries,
        ...held,
      });
      continue;
    }
    seen.set(key, { ...cur, ...held });
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
    if (row.mechanism) lines.push(`Stored mechanism: ${row.mechanism}.`);
    if (row.domain) lines.push(`Stored domain: ${row.domain}.`);
    if (row.pinEnzyme && row.pinKind) {
      lines.push(`The pin stores ${row.pinEnzyme} as an ${row.pinKind}. That enzyme is not a new finding.`);
    }
    const sentence = pinSentenceOf(row);
    if (sentence) {
      lines.push(
        `The pin also stores this contraindications sentence: ${sentence}. That sentence is not a new finding.`,
      );
    }
    const basisLine = pinBasisLine(row);
    if (basisLine) lines.push(basisLine);
    if (row.retrieved) lines.push(`Retrieved ${row.retrieved}. That date is not a new finding.`);
    const noteLine = scopeNoteLine(row.scopeNote);
    if (noteLine) lines.push(noteLine);
    const searchLine = storedSearchLine(row);
    if (searchLine) lines.push(searchLine);
  }
  for (const extra of alsoOnLabel(ids)) {
    lines.push(
      `Also stored on ${extra.labelDrug}, not on this desk: ${extra.names.join(", ")}. Not a suggestion to add them.`,
    );
  }
  return lines.join("\n");
}

function sentenceOf(value: string | undefined | null): string | null {
  const sentence = (value ?? "").trim();
  return sentence || null;
}

/**
 * Engineering comments stay off the check. A scope note is shown verbatim.
 * Mixed notes that mention the catalog, a floor, or a pin are not split.
 */
const ENGINEERING_NOTE =
  /\b(floor|catalog|pin|engine|wave|grade|SPL|paused)\b|\bCYP rules\b|pair finding|not its own pair|not split|combo row|evaluate-and-monitor/i;

export function scopeNoteOf(note: string | undefined | null): string | null {
  const text = (note ?? "").trim();
  if (!text || ENGINEERING_NOTE.test(text)) return null;
  return text;
}

/** The check line for a stored scope note. Not an instruction. */
export function scopeNoteLine(note: string | null): string | null {
  if (!note) return null;
  const body = note.endsWith(".") ? note : `${note}.`;
  return `Stored note: ${body} That note is not a new finding and not an instruction.`;
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Gold search words, or null when they are only the stored id and name. */
export function storedSearch(row: Pick<DeskLabel, "queries" | "drugA" | "drugB" | "nameA" | "nameB">): string | null {
  const queries = row.queries;
  if (!queries) return null;
  const same = (query: string, id: string, name: string) => {
    const text = compact(query);
    return text === compact(id) || text === compact(name);
  };
  if (same(queries[0], row.drugA, row.nameA) && same(queries[1], row.drugB, row.nameB)) return null;
  return `${queries[0]} · ${queries[1]}`;
}

export function storedSearchLine(row: DeskLabel): string | null {
  const search = storedSearch(row);
  if (!search) return null;
  return `Stored search: ${search}. That search is not a new finding.`;
}

/** Pin sentence only when it is stored and is not the quote already shown. */
export function pinSentenceOf(row: DeskLabel): string | null {
  const sentence = sentenceOf(row.pinSentence);
  if (!sentence || sentence === row.quote.trim()) return null;
  return sentence;
}

/** Named or class already stored on the pin. Not a severity. */
export function pinBasisLine(row: DeskLabel): string | null {
  if (row.pinBasis === "named") {
    return "The pin stores this pair as named. The label names the drug. Not a new finding.";
  }
  if (row.pinBasis === "class") {
    return "The pin stores this pair as class. The label names a class. Not a new finding.";
  }
  return null;
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

export function labelDomainPool(): string[] {
  return unique([...index().values()].map((row) => row.domain ?? ""));
}

export function labelPinEnzymePool(): string[] {
  return unique([...index().values()].map((row) => row.pinEnzyme ?? ""));
}

export function labelPinSentencePool(): string[] {
  return unique([...index().values()].map((row) => pinSentenceOf(row) ?? ""));
}

export function labelRetrievedPool(): string[] {
  return unique([...index().values()].filter((row) => row.quote).map((row) => row.retrieved));
}

/** Scope notes already stored on a shown label line. Engineering notes are absent. */
export function labelScopeNotePool(): string[] {
  return unique(
    [...index().values()].filter((row) => row.quote && row.scopeNote).map((row) => row.scopeNote as string),
  );
}

/** Search words already stored on a shown label line, when they are not just the name. */
export function labelSearchPool(): string[] {
  return unique([...index().values()].filter((row) => row.quote).map((row) => storedSearch(row) ?? ""));
}

/** Other quoted lines on the same label. Not filtered by the desk. */
export function otherLineCount(a: string, b: string): number | null {
  const row = labelFor(a, b);
  if (!row) return null;
  let count = 0;
  for (const other of index().values()) {
    if (!other.quote || other.labelDrug !== row.labelDrug) continue;
    if (other.drugA === row.drugA && other.drugB === row.drugB) continue;
    count += 1;
  }
  return count;
}

/** Names on that label that are not already on the desk. Not a suggestion to add them. */
export function alsoOnLabel(ids: readonly string[]): { labelDrug: string; names: string[] }[] {
  const on = new Set(ids.filter((id) => DRUG_BY_ID[id]));
  const out: { labelDrug: string; names: string[] }[] = [];
  const seen = new Set<string>();
  for (const row of deskLabels(ids)) {
    if (seen.has(row.labelDrug)) continue;
    seen.add(row.labelDrug);
    const names = new Set<string>();
    for (const other of index().values()) {
      if (!other.quote || other.labelDrug !== row.labelDrug) continue;
      if (!on.has(other.drugA)) names.add(other.nameA);
      if (!on.has(other.drugB)) names.add(other.nameB);
    }
    const list = [...names].sort((a, b) => a.localeCompare(b));
    if (list.length) out.push({ labelDrug: row.labelDrug, names: list });
  }
  return out;
}
