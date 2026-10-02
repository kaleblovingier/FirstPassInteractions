/**
 * Local tray undo + recent trays. Educational desk only — no PHI, localStorage only.
 */

import { DRUG_BY_ID } from "./catalog";

export const TRAY_HISTORY_KEY = "firstpass.trays.v1";
export const MAX_RECENT = 8;

export type TraySnapshot = {
  ids: string[];
  /** Optional host extras worth restoring on undo (route only — free teaching). */
  ketamineRoute?: "iv" | "in" | "oral";
  ts: number;
};

export type TrayHistoryState = {
  /** Last cleared / replaced tray for one-step undo. */
  undo: TraySnapshot | null;
  recent: TraySnapshot[];
};

function cleanIds(ids: string[]): string[] {
  return ids.filter((id) => DRUG_BY_ID[id] && !id.startsWith("__"));
}

export function labelForIds(ids: string[]): string {
  const names = cleanIds(ids)
    .map((id) => DRUG_BY_ID[id]?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "Empty tray";
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
}

export function emptyHistory(): TrayHistoryState {
  return { undo: null, recent: [] };
}

/** In-memory fallback when localStorage is missing (node tests). */
let memory: TrayHistoryState | null = null;

export function readHistory(): TrayHistoryState {
  if (typeof localStorage === "undefined") {
    return memory ? structuredClone(memory) : emptyHistory();
  }
  try {
    const raw = localStorage.getItem(TRAY_HISTORY_KEY);
    if (!raw) return emptyHistory();
    const parsed = JSON.parse(raw) as Partial<TrayHistoryState>;
    const undo =
      parsed.undo && Array.isArray(parsed.undo.ids)
        ? {
            ids: cleanIds(parsed.undo.ids),
            ketamineRoute: parsed.undo.ketamineRoute,
            ts: typeof parsed.undo.ts === "number" ? parsed.undo.ts : Date.now(),
          }
        : null;
    const recent = Array.isArray(parsed.recent)
      ? parsed.recent
          .filter((r) => r && Array.isArray(r.ids))
          .map((r) => ({
            ids: cleanIds(r.ids),
            ketamineRoute: r.ketamineRoute,
            ts: typeof r.ts === "number" ? r.ts : Date.now(),
          }))
          .filter((r) => r.ids.length > 0)
          .slice(0, MAX_RECENT)
      : [];
    return { undo: undo && undo.ids.length ? undo : null, recent };
  } catch {
    return emptyHistory();
  }
}

export function writeHistory(state: TrayHistoryState): void {
  if (typeof localStorage === "undefined") {
    memory = structuredClone(state);
    return;
  }
  try {
    localStorage.setItem(TRAY_HISTORY_KEY, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

/** Push current tray into undo + recent before a destructive clear/replace. */
export function rememberTray(
  ids: string[],
  extras?: { ketamineRoute?: "iv" | "in" | "oral" },
): TrayHistoryState {
  const cleaned = cleanIds(ids);
  const cur = readHistory();
  if (cleaned.length === 0) return cur;
  const snap: TraySnapshot = {
    ids: cleaned,
    ketamineRoute: extras?.ketamineRoute,
    ts: Date.now(),
  };
  const recent = [snap, ...cur.recent.filter((r) => !sameIds(r.ids, cleaned))].slice(0, MAX_RECENT);
  const next = { undo: snap, recent };
  writeHistory(next);
  return next;
}

export function clearUndo(): TrayHistoryState {
  const cur = readHistory();
  const next = { ...cur, undo: null };
  writeHistory(next);
  return next;
}

export function popUndo(): TraySnapshot | null {
  const cur = readHistory();
  if (!cur.undo) return null;
  writeHistory({ ...cur, undo: null });
  return cur.undo;
}
