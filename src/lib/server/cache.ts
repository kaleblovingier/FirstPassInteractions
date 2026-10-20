/**
 * Production-grade Bounded LRU Cache with active TTL expiration and singleflight request coalescing.
 *
 * Designed for server-side clinical reference caching (OpenFDA, RxNorm, PubChem, DailyMed, etc.)
 * in strict alignment with FD&C Act § 520(o)(1)(E) non-prescriptive regulatory posture:
 * cached data delivery is strictly educational / clinical decision-support infrastructure
 * that surfaces medical information for independent clinician review without generating
 * autonomous treatment directives, dosing mandates, or diagnostic interpretations.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** A fixed ttl, or one chosen from the fetched value; a ttl <= 0 skips caching that value. */
export type CacheTtl<T> = number | ((value: T) => number);

interface Flight<T> {
  promise: Promise<T>;
}

/** Non-prescriptive regulatory disclaimer referencing FD&C Act § 520(o)(1)(E). */
export const CACHE_REGULATORY_DISCLAIMER =
  "FirstPass server cache operates strictly under FD&C Act § 520(o)(1)(E) non-device clinical decision support principles: caching preserves and retrieves unadulterated reference data for independent review by licensed healthcare professionals and does not inject prescriptive directives or autonomous clinical determinations.";

export class BoundedLRUCache<T> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Flight<T>>();

  constructor(maxSize: number = 500, ttlMs: number = 30 * 60 * 1000) {
    if (maxSize <= 0) {
      throw new RangeError("maxSize must be greater than 0");
    }
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieves an entry by key.
   * Refreshes LRU access order if found and valid.
   * Purges from cache and returns undefined if expired.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Refresh LRU ordering: delete and re-insert so it becomes the most recently used (MRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Stores an entry with a key and optional custom TTL.
   * If the key already exists, updates value/expiration and moves it to MRU.
   * Evicts the oldest (least recently used) entry when size reaches maxSize.
   */
  set(key: string, value: T, ttlMs?: number): void {
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.ttlMs;
    const expiresAt = Date.now() + effectiveTtl;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      this.pruneExpired();
      if (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
        }
      }
    }

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Singleflight pattern: deduplicates concurrent in-flight requests for the exact same key.
   * If a cached value exists and is fresh, returns it immediately.
   * If an in-flight request exists for the key, joins that promise.
   * Otherwise, executes fetchFn, caches the resolved value, and cleans up the inFlight map.
   * If fetchFn rejects, the inFlight map is cleaned up so subsequent calls can retry.
   * A flight only writes back while it is still the registered flight for its key: after
   * clear() or delete(key) its value is returned to its callers but not cached, and it never
   * removes a newer flight for the same key.
   */
  async getOrFetch(key: string, fetchFn: () => Promise<T>, ttlMs?: CacheTtl<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending.promise;
    }

    const flight = {} as Flight<T>;
    // Start fetchFn after registering the flight so a synchronous throw cannot strand it.
    flight.promise = Promise.resolve()
      .then(() => fetchFn())
      .then(
        (result) => {
          if (this.inFlight.get(key) === flight) {
            this.inFlight.delete(key);
            const ttl = typeof ttlMs === "function" ? ttlMs(result) : ttlMs;
            if (ttl === undefined || ttl > 0) this.set(key, result, ttl);
          }
          return result;
        },
        (error: unknown) => {
          if (this.inFlight.get(key) === flight) this.inFlight.delete(key);
          throw error;
        },
      );

    this.inFlight.set(key, flight);
    return flight.promise;
  }

  /**
   * Clears all cached items and active in-flight promises.
   * Flights already running still settle for their callers but no longer write back.
   */
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Returns current count of entries in the cache.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Active TTL expiration pass.
   * Removes all entries whose expiresAt is past Date.now().
   * Returns the count of expired items pruned.
   */
  pruneExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Checks whether key exists and is not expired (without modifying LRU order).
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Deletes a specific key from the cache and inFlight tracking.
   * A flight already running for the key still settles for its callers but no longer writes back.
   */
  delete(key: string): boolean {
    this.inFlight.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Returns keys ordered from least recently used (first) to most recently used (last).
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns the number of currently active in-flight requests.
   */
  get inFlightSize(): number {
    return this.inFlight.size;
  }
}
