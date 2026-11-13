/**
 * FIFO gate for NCBI E-utilities: at most `perSecond` requests start in any one second (NCBI's
 * limit without an API key). Per server instance, like rate-limit.ts: several instances can
 * together exceed it, and NCBI answers 429, which callers already report as a failed lookup.
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
  const starts: number[] = [];
  let tail: Promise<unknown> = Promise.resolve();

  async function turn(source: string, deadline: number): Promise<void> {
    for (;;) {
      const t = now();
      while (starts.length && starts[0]! <= t - 1000) starts.shift();
      if (starts.length < perSecond) {
        starts.push(t);
        return;
      }
      const wait = starts[0]! + 1000 - t;
      if (t + wait > deadline) throw new UpstreamError(source, "timeout");
      await sleep(wait);
    }
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
