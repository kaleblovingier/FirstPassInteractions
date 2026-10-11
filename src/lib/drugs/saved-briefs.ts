/**
 * Lightweight localStorage shelf for saved desk briefs.
 * Keeps the most useful teaching snapshots close at hand without any PHI.
 */

import type { Severity } from "./types";

export const SAVED_BRIEFS_KEY = "firstpass.saved-briefs.v1";
export const MAX_SAVED_BRIEFS = 8;

export interface SavedBriefEntry {
  key: string;
  names: string;
  ids: string[];
  highest: Severity | "none";
  summary: string;
  hostLine?: string;
  url?: string;
  createdAt: string;
}

let memory: SavedBriefEntry[] = [];

function cleanIds(ids: string[]): string[] {
  return ids.filter((id) => typeof id === "string" && id.trim().length > 0);
}

export function buildSavedBriefSnapshot(input: {
  ids: string[];
  names?: string;
  highest?: Severity | "none";
  summary?: string;
  hostLine?: string;
  url?: string;
  createdAt?: string;
}): SavedBriefEntry {
  const ids = cleanIds(input.ids);
  const names = (input.names ?? ids.join(" + ")).trim() || "Saved desk brief";
  const summary = input.summary?.trim() || "Saved desk brief";
  const createdAt = input.createdAt ?? new Date().toISOString();
  const key = `${SAVED_BRIEFS_KEY}:${ids.join(",") || names}`;
  return {
    key,
    names,
    ids,
    highest: input.highest ?? "none",
    summary,
    hostLine: input.hostLine?.trim() || undefined,
    url: input.url?.trim() || undefined,
    createdAt,
  };
}

export function readSavedBriefs(): SavedBriefEntry[] {
  if (typeof localStorage === "undefined") {
    return memory.map((entry) => ({ ...entry, ids: [...entry.ids] }));
  }

  try {
    const raw = localStorage.getItem(SAVED_BRIEFS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed
      .filter((value): value is Partial<SavedBriefEntry> => value !== null && typeof value === "object")
      .map((entry) => {
        const ids = cleanIds(Array.isArray((entry as { ids?: unknown }).ids) ? ((entry as { ids?: unknown }).ids as unknown[]).filter((v) => typeof v === "string") : []);
        const names = typeof entry.names === "string" ? entry.names.trim() : ids.join(" + ") || "Saved desk brief";
        const summary = typeof entry.summary === "string" ? entry.summary.trim() : "Saved desk brief";
        const highest = entry.highest === "contraindicated" || entry.highest === "major" || entry.highest === "moderate" || entry.highest === "minor" || entry.highest === "none" ? entry.highest : "none";
        const key = typeof entry.key === "string" ? entry.key : `${SAVED_BRIEFS_KEY}:${ids.join(",") || names}`;
        const createdAt = typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString();
        return {
          key,
          names,
          ids,
          highest,
          summary,
          hostLine: typeof entry.hostLine === "string" ? entry.hostLine.trim() : undefined,
          url: typeof entry.url === "string" ? entry.url.trim() : undefined,
          createdAt,
        } satisfies SavedBriefEntry;
      })
      .filter((entry) => entry.ids.length > 0)
      .slice(0, MAX_SAVED_BRIEFS);

    return cleaned;
  } catch {
    return [];
  }
}

export function writeSavedBriefs(entries: SavedBriefEntry[]): SavedBriefEntry[] {
  const next = entries
    .filter((entry) => entry?.ids?.length)
    .slice(0, MAX_SAVED_BRIEFS)
    .map((entry) => ({ ...entry, ids: cleanIds(entry.ids) }));

  if (typeof localStorage === "undefined") {
    memory = next;
    return next;
  }

  try {
    localStorage.setItem(SAVED_BRIEFS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota- or privacy-related write failures
  }
  return next;
}

export function saveBriefSnapshot(
  snapshot: SavedBriefEntry,
  existing: SavedBriefEntry[] = readSavedBriefs(),
): SavedBriefEntry[] {
  const cleaned = buildSavedBriefSnapshot({
    ids: snapshot.ids,
    names: snapshot.names,
    highest: snapshot.highest,
    summary: snapshot.summary,
    hostLine: snapshot.hostLine,
    url: snapshot.url,
    createdAt: snapshot.createdAt,
  });

  const deduped = existing.filter((entry) => entry.key !== cleaned.key && entry.names !== cleaned.names);
  const next = [cleaned, ...deduped].slice(0, MAX_SAVED_BRIEFS);
  return writeSavedBriefs(next);
}

export function removeSavedBrief(key: string): SavedBriefEntry[] {
  return writeSavedBriefs(readSavedBriefs().filter((entry) => entry.key !== key));
}
