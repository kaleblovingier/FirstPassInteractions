/**
 * Operator-desk helpers for Hunt's local book and Foundry's issued-key list.
 * Pure: no commerce, no DOM, no catalog edits. Safe to import from node tests.
 */

export const PIPE_LIMIT = 80;

export interface PipeSaveOpts {
  /** Allow replacing a readable book with an empty list (last drop, confirmed replace). */
  allowEmpty?: boolean;
  /** Allow replacing storage that does not parse as an array. */
  replaceUnreadable?: boolean;
}

export interface PipeExportRow {
  id: string;
  name: string;
  prey: string;
  range: string;
  city: string;
  who: string;
  site: string;
  hook: string;
  status: string;
  note: string;
  added: string;
}

const PIPE_COLUMNS = [
  "name",
  "status",
  "prey",
  "range",
  "city",
  "who",
  "site",
  "note",
  "added",
  "id",
  "hook",
] as const satisfies readonly (keyof PipeExportRow)[];

/** True when stored JSON is missing, blank, or a JSON array. Objects and broken JSON are not. */
export function storedPipeIsReadable(stored: string | null): boolean {
  if (stored == null) return true;
  const trimmed = stored.trim();
  if (!trimmed) return true;
  try {
    return Array.isArray(JSON.parse(trimmed) as unknown);
  } catch {
    return false;
  }
}

/** True when storage holds a non-empty array, or something we cannot safely treat as empty. */
export function storedPipeHasRows(stored: string | null): boolean {
  if (stored == null) return false;
  const trimmed = stored.trim();
  if (!trimmed) return false;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return true;
  }
}

/**
 * JSON to write for the book, or null when the write must be skipped.
 * Skips an empty write over a real book unless `allowEmpty`.
 * Skips any write over unreadable storage unless `replaceUnreadable`.
 */
export function nextPipeStorage(
  stored: string | null,
  rows: readonly unknown[],
  opts?: PipeSaveOpts,
): string | null {
  const capped = rows.slice(0, PIPE_LIMIT);
  if (!storedPipeIsReadable(stored) && !opts?.replaceUnreadable) return null;
  if (capped.length === 0 && !opts?.allowEmpty && storedPipeHasRows(stored)) return null;
  return JSON.stringify(capped);
}

/** Issued-key list. Same cap and refuse-unreadable rules as the hunt book. */
export const ISSUED_STORAGE_KEY = "firstpass.issued.v1";

/** Operator pay line. A plain string, not the hunt book. */
export const PAY_NOTE_STORAGE_KEY = "firstpass.payNote";

export interface DeskListStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * JSON to write for issued keys, or null when the write must be skipped.
 * Same rules as `nextPipeStorage`: unreadable storage is kept unless
 * `replaceUnreadable`, and an empty list does not replace a real list unless
 * `allowEmpty`.
 */
export function nextIssuedStorage(
  stored: string | null,
  rows: readonly unknown[],
  opts?: PipeSaveOpts,
): string | null {
  return nextPipeStorage(stored, rows, opts);
}

/**
 * Persist issued keys. Returns false when the write is refused or `setItem`
 * throws, and does not replace unreadable storage unless `replaceUnreadable`.
 */
export function saveIssuedList(
  storage: DeskListStorage,
  rows: readonly unknown[],
  opts?: PipeSaveOpts,
): boolean {
  let raw: string | null = null;
  try {
    raw = storage.getItem(ISSUED_STORAGE_KEY);
  } catch {
    return false;
  }
  const payload = nextIssuedStorage(raw, rows, opts);
  if (payload == null) return false;
  try {
    storage.setItem(ISSUED_STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

/** Persist the pay note. Returns false when `setItem` throws; the caller keeps the typed text. */
export function savePayNoteText(storage: Pick<DeskListStorage, "setItem">, note: string): boolean {
  try {
    storage.setItem(PAY_NOTE_STORAGE_KEY, note);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark waiting hunt rows as keyed. The license key is stored beside the note
 * and the outreach note is left as it was.
 */
export function attachHuntLicenseKeys<
  T extends { name: string; status: string; note: string; licenseKey?: string },
>(rows: readonly T[], keysByName: ReadonlyMap<string, string>): Array<T & { licenseKey?: string }> {
  return rows.map((row) => {
    if (row.status !== "waiting") return row;
    const key = keysByName.get(row.name.toLowerCase());
    if (!key) return row;
    return { ...row, status: "keyed" as T["status"], licenseKey: key };
  });
}

/** True only after `writeText` resolves. A rejection is a failed copy. */
export async function copyDeskText(
  writeText: (text: string) => Promise<void>,
  text: string,
): Promise<boolean> {
  try {
    await writeText(text);
    return true;
  } catch {
    return false;
  }
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

/** Header plus one row per name. Safe to open in a spreadsheet. */
export function pipeToCsv(rows: readonly PipeExportRow[]): string {
  const header = PIPE_COLUMNS.join(",");
  const lines = rows.map((row) => PIPE_COLUMNS.map((col) => csvCell(row[col] ?? "")).join(","));
  return [header, ...lines].join("\n") + "\n";
}

export function pipeToJson(rows: readonly PipeExportRow[]): string {
  const body = rows.map((row) => {
    const out: PipeExportRow = {
      id: row.id,
      name: row.name,
      prey: row.prey,
      range: row.range,
      city: row.city,
      who: row.who,
      site: row.site,
      hook: row.hook,
      status: row.status,
      note: row.note,
      added: row.added,
    };
    return out;
  });
  return JSON.stringify(body, null, 2) + "\n";
}

export function pipeExportName(kind: "csv" | "json", now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `firstpass-hunt-book-${day}.${kind}`;
}

export interface PipeLicenseExportRow {
  name: string;
  who: string;
  status: string;
  licenseKey: string;
}

const LICENSE_COLUMNS = [
  "name",
  "who",
  "status",
  "licenseKey",
] as const satisfies readonly (keyof PipeLicenseExportRow)[];

/** License keys only. Not a column on the book CSV. */
export function pipeLicensesToCsv(rows: readonly PipeLicenseExportRow[]): string {
  const header = LICENSE_COLUMNS.join(",");
  const lines = rows.map((row) => LICENSE_COLUMNS.map((col) => csvCell(row[col] ?? "")).join(","));
  return [header, ...lines].join("\n") + "\n";
}

export function pipeLicensesToJson(rows: readonly PipeLicenseExportRow[]): string {
  const body = rows.map((row) => ({
    name: row.name,
    who: row.who,
    status: row.status,
    licenseKey: row.licenseKey,
  }));
  return JSON.stringify(body, null, 2) + "\n";
}

export function pipeLicenseExportName(kind: "csv" | "json", now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `firstpass-hunt-keys-${day}.${kind}`;
}

export function pipeStatusCounts(
  rows: readonly { status: string }[],
  order: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const status of order) counts[status] = 0;
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

/** Move along a status list, wrapping at both ends. Unknown current starts at the first status. */
export function stepStatus<T extends string>(order: readonly T[], current: T, delta: number): T {
  if (order.length === 0) return current;
  const i = order.indexOf(current);
  const at = i < 0 ? 0 : i;
  const len = order.length;
  const next = (at + delta) % len;
  return order[(next + len) % len] as T;
}

export function directorySliceLabel(shown: number, total: number, parked: number): string {
  const parkedBit = parked === 1 ? "1 parked, off this list" : `${parked} parked, off this list`;
  return `Showing ${shown} of ${total} · ${parkedBit}`;
}

export function filterIssued<T extends { key: string; soldTo: string; plan: string }>(
  rows: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter(
    (row) =>
      row.key.toLowerCase().includes(q) ||
      row.soldTo.toLowerCase().includes(q) ||
      row.plan.toLowerCase().includes(q),
  );
}

/** `program:team` displays as "Program · team", `api:education` as "API · education". Other plan ids pass through. */
export function issuedPlanLabel(plan: string): string {
  for (const [prefix, name] of [["program:", "Program"], ["api:", "API"]] as const) {
    if (plan.startsWith(prefix)) {
      const tier = plan.slice(prefix.length).trim();
      return tier ? `${name} · ${tier}` : name;
    }
  }
  return plan;
}
