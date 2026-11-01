/**
 * In-memory sliding-window limits for server code. Counts live in one serverless instance and
 * reset on a cold start, so they slow one client down; a cap shared across instances needs a
 * store (Vercel KV, Upstash).
 */

import { getRequest } from "@tanstack/react-start/server";
import { BoundedLRUCache } from "./cache";

/**
 * Caller IP from `x-real-ip`, the header Vercel's own `ipAddress()` helper reads. Vercel sets it and
 * overwrites client-sent forwarded-for values, so a client cannot spoof it there.
 */
export function clientIp(request?: Request): string {
  let req = request;
  if (!req) {
    try {
      req = getRequest();
    } catch {
      return "unknown"; // outside a request: tests, scripts
    }
  }
  const h = req?.headers;
  const raw = h?.get("x-real-ip") || h?.get("x-forwarded-for") || "unknown";
  return raw.split(",")[0]!.trim() || "unknown";
}

/** At most `max` hits per key in any `windowMs`. Memory is bounded: the least recent keys are dropped first. */
export class SlidingWindow {
  private readonly hits: BoundedLRUCache<number[]>;

  constructor(
    readonly max: number,
    readonly windowMs: number,
    maxKeys = 10_000,
  ) {
    this.hits = new BoundedLRUCache<number[]>(maxKeys, windowMs);
  }

  private live(key: string, now: number): number[] {
    return (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
  }

  /** True once `key` has used all `max` hits in the window. */
  full(key: string, now = Date.now()): boolean {
    return this.live(key, now).length >= this.max;
  }

  hit(key: string, now = Date.now()): void {
    this.hits.set(key, [...this.live(key, now), now]);
  }

  /** Records a hit and returns true while `key` is under its limit; once full, records nothing and returns false. */
  take(key: string, now = Date.now()): boolean {
    if (this.full(key, now)) return false;
    this.hit(key, now);
    return true;
  }

  reset(): void {
    this.hits.clear();
  }
}
