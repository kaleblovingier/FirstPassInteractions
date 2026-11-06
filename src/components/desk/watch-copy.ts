/**
 * Watch copy for a shortage or enforcement pull.
 * An empty list is a real answer. A name in `failed` means that call did not answer.
 * Both sentences keep the same caution: a quiet pull is not a green light.
 */

const QUIET = "A quiet pull is not a green light: check the FDA shortage page and the label.";

export const WATCH_SHORTAGE_EMPTY = `No OpenFDA shortage rows came back this time. ${QUIET}`;

export const WATCH_SHORTAGE_FAILED = `FDA shortages did not answer. ${QUIET}`;

export const WATCH_RECALL_FAILED = `FDA enforcement did not answer. ${QUIET}`;

function namedFailure(fallback: string, reason: string | undefined, needle: RegExp): string {
  const named = reason?.trim();
  if (!named || !needle.test(named)) return fallback;
  return `${named.replace(/[. ]+$/, "")}. ${QUIET}`;
}

export function watchShortageCopy(pack: {
  ok: boolean;
  shortage: readonly unknown[];
  failed?: readonly string[];
  reason?: string;
}): string | null {
  if (pack.shortage.length > 0) return null;
  if (pack.failed?.includes("shortage")) return namedFailure(WATCH_SHORTAGE_FAILED, pack.reason, /FDA shortages/i);
  if (!pack.ok) return null;
  return WATCH_SHORTAGE_EMPTY;
}

export function watchRecallCopy(pack: {
  recalls?: readonly unknown[];
  failed?: readonly string[];
  reason?: string;
}): string | null {
  if ((pack.recalls?.length ?? 0) > 0) return null;
  if (pack.failed?.includes("recalls")) return namedFailure(WATCH_RECALL_FAILED, pack.reason, /FDA enforcement/i);
  return null;
}

/** Clock time from the live pack, in UTC. This is the FDA pull, not the watchlist write. */
export function formatFetchedAt(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso.trim());
  if (!match) return iso;
  return `${match[1]} ${match[2]} UTC`;
}
