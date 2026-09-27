/**
 * Desk-level OpenFDA shortage / label watchlist.
 * localStorage only — no PHI. Educational truncated surface; PI / FDA shortage page wins.
 */

import { DRUG_BY_ID } from "./catalog";
import { isVirtual } from "./host";
import type { PlanId } from "@/lib/billing/plans";

export const WATCH_STORAGE_KEY = "firstpass.watch.v1";

export const WATCH_CAP_FREE = 5;
export const WATCH_CAP_FOUNDING = 12;

export interface WatchlistState {
  ids: string[];
  updatedAt?: string;
}

export function watchCap(plan: PlanId | "free" | "pro" | "lab"): number {
  return plan === "free" ? WATCH_CAP_FREE : WATCH_CAP_FOUNDING;
}

function cleanId(id: string): string | null {
  if (!id || isVirtual(id) || !DRUG_BY_ID[id]) return null;
  return id;
}

export function emptyWatchlist(): WatchlistState {
  return { ids: [] };
}

export function readWatchlist(): WatchlistState {
  if (typeof window === "undefined") return emptyWatchlist();
  try {
    const raw = window.localStorage.getItem(WATCH_STORAGE_KEY);
    if (!raw) return emptyWatchlist();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyWatchlist();
    const idsRaw = (parsed as WatchlistState).ids;
    if (!Array.isArray(idsRaw)) return emptyWatchlist();
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const x of idsRaw) {
      if (typeof x !== "string") continue;
      const id = cleanId(x);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    const updatedAt = (parsed as WatchlistState).updatedAt;
    return {
      ids,
      updatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
    };
  } catch {
    return emptyWatchlist();
  }
}

export function writeWatchlist(state: WatchlistState): WatchlistState {
  const next: WatchlistState = {
    ids: [...state.ids],
    updatedAt: new Date().toISOString(),
  };
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Pure: add ids with dedupe and optional cap. Returns { state, added, rejected }. */
export function addToWatchlist(
  state: WatchlistState,
  ids: string[],
  cap: number = WATCH_CAP_FOUNDING,
): { state: WatchlistState; added: string[]; rejected: string[] } {
  const next = [...state.ids];
  const seen = new Set(next);
  const added: string[] = [];
  const rejected: string[] = [];
  for (const raw of ids) {
    const id = cleanId(raw);
    if (!id) continue;
    if (seen.has(id)) continue;
    if (next.length >= cap) {
      rejected.push(id);
      continue;
    }
    seen.add(id);
    next.push(id);
    added.push(id);
  }
  return { state: { ids: next, updatedAt: state.updatedAt }, added, rejected };
}

export function removeFromWatchlist(state: WatchlistState, id: string): WatchlistState {
  return { ids: state.ids.filter((x) => x !== id), updatedAt: state.updatedAt };
}

export function toggleWatchlist(
  state: WatchlistState,
  id: string,
  cap: number = WATCH_CAP_FOUNDING,
): { state: WatchlistState; on: boolean; rejected: boolean } {
  const clean = cleanId(id);
  if (!clean) return { state, on: false, rejected: true };
  if (state.ids.includes(clean)) {
    return { state: removeFromWatchlist(state, clean), on: false, rejected: false };
  }
  const { state: next, rejected } = addToWatchlist(state, [clean], cap);
  return { state: next, on: rejected.length === 0, rejected: rejected.length > 0 };
}

/** Persist helpers used by the Watch page. */
export function saveAdd(ids: string[], cap: number): { state: WatchlistState; added: string[]; rejected: string[] } {
  const cur = readWatchlist();
  const result = addToWatchlist(cur, ids, cap);
  if (result.added.length) writeWatchlist(result.state);
  return result;
}

export function saveRemove(id: string): WatchlistState {
  const next = removeFromWatchlist(readWatchlist(), id);
  return writeWatchlist(next);
}
