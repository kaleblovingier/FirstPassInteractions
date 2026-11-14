/**
 * FIFO gate for NCBI E-utilities: requests start evenly spaced, so at most `perSecond` start in any
 * one second (NCBI's limit without an API key). On 2026-11-13 NCBI answered 429 ("count 4, limit
 * 3") to a fourth request started 1,042 ms after the first, so its window is longer than a second;
 * starts are spaced 1.5 s / perSecond apart to keep clear of it. Per server instance, like rate-limit.ts:
 * several instances can together exceed it, and NCBI answers 429, which callers report as a
 * failed lookup.
 */

import { UpstreamError } from "./http";

export interface NcbiGateOptions {
  perSecond?: number;
  /** Longest a call may wait for its turn before it fails as an upstream timeout. */
  maxWaitMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface NcbiGate {
  /** Resolves when the caller may start its request; rejects as a timeout if the queue is too long. */
  acquire(source: string): Promise<void>;
  now(): number;
}

export function createNcbiGate(options: NcbiGateOptions = {}): NcbiGate {
  const perSecond = options.perSecond ?? 3;
  const maxWaitMs = options.maxWaitMs ?? 8_000;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const spacingMs = Math.ceil(1500 / perSecond);
  let lastStart = -Infinity;
  let tail: Promise<unknown> = Promise.resolve();

  async function turn(source: string, deadline: number): Promise<void> {
    const t = now();
    const at = Math.max(t, lastStart + spacingMs);
    if (at > deadline) throw new UpstreamError(source, "timeout");
    if (at > t) await sleep(at - t);
    lastStart = at;
  }

  return {
    now,
    acquire(source) {
      const deadline = now() + maxWaitMs;
      // A failed turn must not break the chain for the callers behind it.
      const mine = tail.then(() => turn(source, deadline));
      tail = mine.catch(() => undefined);
      return mine;
    },
  };
}

export const ncbiGate = createNcbiGate();
