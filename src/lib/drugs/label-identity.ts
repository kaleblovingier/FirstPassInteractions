/**
 * Which OpenFDA SPL we show, and whether its effective date matches the
 * DailyMed setid already on file. Display only: this never edits a grade,
 * a gold quote, or label-versions.json.
 */
import labelVersionsFile from "./reference/label-versions.json" with { type: "json" };

/** On-screen interactions excerpt. Partner scan uses a much longer string. */
export const INTERACTIONS_EXCERPT_CHARS = 520;

/**
 * Interactions text the partner scan is allowed to read. Far past the old
 * 520-character clip so a name later in the section can still match.
 */
export const INTERACTIONS_SCAN_CHARS = 48_000;

/** How many OpenFDA label hits to consider before falling back to the first. */
export const LABEL_CANDIDATE_LIMIT = 8;

export const OPENFDA_NO_DATE = "OpenFDA did not send a date";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SETID_PARAM = /[?&]setid=([0-9a-f-]{8,})/gi;

interface StoredLabel {
  effective?: string | null;
}

const STORED_EFFECTIVE = new Map<string, string | null>();
for (const [id, row] of Object.entries(labelVersionsFile.labels as Record<string, StoredLabel>)) {
  const effective =
    typeof row.effective === "string" && ISO_DATE.test(row.effective) ? row.effective : null;
  STORED_EFFECTIVE.set(id.toLowerCase(), effective);
}

/** DailyMed setids cited in a catalog note. Order is the order they appear. */
export function setidsInText(text: string | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const match of text.matchAll(SETID_PARAM)) {
    const id = match[1]!.toLowerCase();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Stored `effective` for a setid in label-versions.json.
 * `undefined` means the setid is not on file.
 */
export function storedLabelEffective(setId: string): string | null | undefined {
  const key = setId.trim().toLowerCase();
  if (!STORED_EFFECTIVE.has(key)) return undefined;
  return STORED_EFFECTIVE.get(key) ?? null;
}

export function splSetId(row: { set_id?: unknown }): string {
  return typeof row.set_id === "string" ? row.set_id.trim() : "";
}

export function splOpenFdaId(row: { id?: unknown }): string {
  if (typeof row.id === "string") return row.id.trim();
  if (typeof row.id === "number" && Number.isFinite(row.id)) return String(row.id);
  return "";
}

/**
 * Prefer a catalog-note setid, then any setid already in label-versions.json.
 * Otherwise keep OpenFDA's first hit.
 */
export function pickSpl<T extends { set_id?: unknown }>(
  rows: readonly T[],
  noteSetids: readonly string[],
): T | undefined {
  if (rows.length === 0) return undefined;
  const note = new Set(noteSetids.map((id) => id.toLowerCase()));
  const byNote = rows.find((row) => {
    const id = splSetId(row).toLowerCase();
    return id !== "" && note.has(id);
  });
  if (byNote) return byNote;
  const byFile = rows.find((row) => {
    const id = splSetId(row).toLowerCase();
    return id !== "" && STORED_EFFECTIVE.has(id);
  });
  if (byFile) return byFile;
  return rows[0];
}

/** YYYY-MM-DD when OpenFDA sent a date; the raw text otherwise; "" when absent. */
export function formatEffectiveTime(raw: unknown): string {
  let value = raw;
  if (typeof value === "number" && Number.isFinite(value)) value = String(Math.trunc(value));
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const compact = trimmed.replace(/\D/g, "");
  const digits = /^(\d{4})(\d{2})(\d{2})/.exec(compact);
  if (digits && (compact.length === 8 || compact.length === 14)) {
    const month = Number(digits[2]);
    const day = Number(digits[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${digits[1]}-${digits[2]}-${digits[3]}`;
    }
  }
  return trimmed;
}

/** One line: which SPL was shown, its effective date, and a mismatch with the stored file. */
export function labelIdentityLine(parts: {
  setId: string;
  openFdaId: string;
  effectiveTime: string;
  storedEffective?: string | null;
}): string {
  const bits: string[] = [];
  if (parts.setId) bits.push(`SPL ${parts.setId}`);
  if (parts.openFdaId && parts.openFdaId.toLowerCase() !== parts.setId.toLowerCase()) {
    bits.push(`OpenFDA id ${parts.openFdaId}`);
  }
  const who = bits.length > 0 ? bits.join(" · ") : "OpenFDA label (no setid on this hit)";
  const date = parts.effectiveTime ? `Effective ${parts.effectiveTime}` : OPENFDA_NO_DATE;
  let line = `${who}. ${date}.`;
  if (typeof parts.storedEffective === "string" && parts.storedEffective !== parts.effectiveTime) {
    line += ` Stored label version for this setid is dated ${parts.storedEffective}, which differs. The stored grade quote was not changed.`;
  }
  return line;
}
