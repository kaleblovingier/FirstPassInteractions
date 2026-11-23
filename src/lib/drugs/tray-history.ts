/**
 * Local tray undo + recent trays. Educational desk only — no PHI, localStorage only.
 */

import { DRUG_BY_ID, isCatalogId } from "./catalog";

export const TRAY_HISTORY_KEY = "firstpass.trays.v1";
export const MAX_RECENT = 8;
export const MAX_PINNED = 8;

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
  pinned: TraySnapshot[];
};

function cleanIds(ids: readonly string[]): string[] {
  return ids.filter((id) => typeof id === "string" && isCatalogId(id) && !id.startsWith("__"));
}

export function labelForIds(ids: readonly string[]): string {
  const names = cleanIds(ids)
    .map((id) => DRUG_BY_ID[id]?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "Empty tray";
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} +${names.length - 2}`;
}

export function emptyHistory(): TrayHistoryState {
  return { undo: null, recent: [], pinned: [] };
}

/** Order-insensitive canonical set check for pinned tray matching. */
export function sameTraySet(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const id of setA) {
    if (!setB.has(id)) return false;
  }
  return true;
}

function parseSnapshots(raw: unknown, limit: number): TraySnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is Partial<TraySnapshot> =>
        Boolean(r) && typeof r === "object" && Array.isArray((r as TraySnapshot).ids),
    )
    .map((r) => ({
      ids: cleanIds(r.ids!),
      ketamineRoute:
        r.ketamineRoute === "iv" || r.ketamineRoute === "in" || r.ketamineRoute === "oral"
          ? r.ketamineRoute
          : undefined,
      ts: typeof r.ts === "number" ? r.ts : Date.now(),
    }))
    .filter((r) => r.ids.length > 0)
    .slice(0, limit);
}

/** In-memory fallback when localStorage is missing (node tests). */
let memory: TrayHistoryState | null = null;

export function readHistory(): TrayHistoryState {
  if (typeof localStorage === "undefined") {
    return memory
      ? { ...emptyHistory(), ...structuredClone(memory), pinned: structuredClone(memory.pinned ?? []) }
      : emptyHistory();
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
    const recent = parseSnapshots(parsed.recent, MAX_RECENT);
    const pinned = parseSnapshots(parsed.pinned, MAX_PINNED);
    return { undo: undo && undo.ids.length ? undo : null, recent, pinned };
  } catch {
    return emptyHistory();
  }
}

export function writeHistory(state: TrayHistoryState): void {
  const normalized: TrayHistoryState = {
    undo: state.undo ?? null,
    recent: state.recent ?? [],
    pinned: state.pinned ?? [],
  };
  if (typeof localStorage === "undefined") {
    memory = structuredClone(normalized);
    return;
  }
  try {
    localStorage.setItem(TRAY_HISTORY_KEY, JSON.stringify(normalized));
  } catch {
    /* quota — ignore */
  }
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

/** Push current tray into undo + recent before a destructive clear/replace. */
export function rememberTray(
  ids: readonly string[],
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
  const next: TrayHistoryState = { undo: snap, recent, pinned: cur.pinned };
  writeHistory(next);
  return next;
}

export function clearUndo(): TrayHistoryState {
  const cur = readHistory();
  const next: TrayHistoryState = { ...cur, undo: null };
  writeHistory(next);
  return next;
}

export function popUndo(): TraySnapshot | null {
  const cur = readHistory();
  if (!cur.undo) return null;
  writeHistory({ ...cur, undo: null });
  return cur.undo;
}

/** True when `ids` matches any pinned tray regardless of item order. */
export function isTrayPinned(ids: readonly string[], state: TrayHistoryState = readHistory()): boolean {
  const cleaned = cleanIds(ids);
  if (cleaned.length === 0) return false;
  return state.pinned.some((p) => sameTraySet(p.ids, cleaned));
}

/** Pin a tray in its saved display order, deduplicating by canonical set and bounding to MAX_PINNED. */
export function pinTray(
  ids: readonly string[],
  extras?: { ketamineRoute?: "iv" | "in" | "oral" },
): TrayHistoryState {
  const cleaned = Array.from(new Set(cleanIds(ids)));
  const cur = readHistory();
  if (cleaned.length === 0) return cur;
  const snap: TraySnapshot = {
    ids: cleaned,
    ketamineRoute: extras?.ketamineRoute,
    ts: Date.now(),
  };
  const pinned = [snap, ...cur.pinned.filter((p) => !sameTraySet(p.ids, cleaned))].slice(0, MAX_PINNED);
  const next: TrayHistoryState = { ...cur, pinned };
  writeHistory(next);
  return next;
}

/** Remove any pinned tray matching the canonical set of `ids`. */
export function unpinTray(ids: readonly string[]): TrayHistoryState {
  const cleaned = cleanIds(ids);
  const cur = readHistory();
  if (cleaned.length === 0) return cur;
  const pinned = cur.pinned.filter((p) => !sameTraySet(p.ids, cleaned));
  const next: TrayHistoryState = { ...cur, pinned };
  writeHistory(next);
  return next;
}

/** Toggle pin status for `ids`, returning the updated history state and new pinned flag. */
export function togglePinTray(
  ids: readonly string[],
  extras?: { ketamineRoute?: "iv" | "in" | "oral" },
): { state: TrayHistoryState; pinned: boolean } {
  const cleaned = cleanIds(ids);
  const cur = readHistory();
  if (cleaned.length === 0) return { state: cur, pinned: false };
  if (isTrayPinned(cleaned, cur)) {
    return { state: unpinTray(cleaned), pinned: false };
  }
  return { state: pinTray(cleaned, extras), pinned: true };
}

/**
 * The tray with `outId` replaced in place by `inId`, or null when that swap is
 * not possible (same item, item not on the tray, replacement already on it, or
 * not a catalog item). The tray keeps its length, so the plan's cap still holds.
 */
export function swapIds(ids: string[], outId: string, inId: string): string[] | null {
  if (outId === inId) return null;
  if (!ids.includes(outId) || ids.includes(inId)) return null;
  if (!isCatalogId(inId) || inId.startsWith("__") || !DRUG_BY_ID[inId]) return null;
  return ids.map((id) => (id === outId ? inId : id));
}
