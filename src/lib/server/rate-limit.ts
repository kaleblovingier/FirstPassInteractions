/**
 * In-memory sliding-window limits for server code. Counts live in one serverless instance and
 * reset on a cold start, so they slow one client down. For a cap shared across instances, use
 * SharedWindow in ./throttle-store, which also counts in the app database when DATABASE_URL is set.
 */

import { getRequest } from "@tanstack/react-start/server";
import { BoundedLRUCache } from "./cache";

/** The one key for callers we cannot tell apart. A limit on this key must slow down, never refuse. */
export const SHARED_CLIENT = "shared";

/**
 * Rate-limit key for the caller: the IPv4 address, or the IPv6 /64 (one subscriber's block, so hopping
 * addresses inside it changes nothing). Headers are trusted only on Vercel, whose proxy sets x-real-ip and
 * overwrites client-sent forwarded-for values; anywhere else every caller shares SHARED_CLIENT.
 */
export function clientKey(request?: Request): string {
  if (!process.env.VERCEL) return SHARED_CLIENT;
  let req = request;
  if (!req) {
    try {
      req = getRequest();
    } catch {
      return SHARED_CLIENT; // outside a request
    }
  }
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "";
  return addressKey(ip.trim()) || SHARED_CLIENT;
}

/** IPv4 (also IPv4-mapped IPv6) as is; IPv6 cut to its /64. */
export function addressKey(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (v4) return v4[1]!;
  if (!ip.includes(":")) return ip;
  const [head = "", tail] = ip.toLowerCase().split("%")[0]!.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups =
    tail === undefined ? left : [...left, ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
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

  /** Hits `key` has in the window now (at most `max`). */
  used(key: string, now = Date.now()): number {
    return this.live(key, now).length;
  }

  /** Milliseconds until `key`'s oldest live hit leaves the window and frees a slot; 0 with no hits. */
  resetMs(key: string, now = Date.now()): number {
    const oldest = this.live(key, now)[0];
    return oldest === undefined ? 0 : Math.max(1, this.windowMs - (now - oldest));
  }

  /** True once `key` has used all `max` hits in the window. */
  full(key: string, now = Date.now()): boolean {
    return this.live(key, now).length >= this.max;
  }

  /** Records a hit. Only the latest `max` are kept: enough to answer full(), however many arrive. */
  hit(key: string, now = Date.now()): void {
    this.hits.set(key, [...this.live(key, now), now].slice(-this.max));
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
