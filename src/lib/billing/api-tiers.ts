/**
 * API keys for the public JSON API at /api/cds/*: the shared contract.
 *
 * The /developers page, the API gate (src/lib/server/api/api-access.server.ts), the mint and
 * verify code (./api-keys.server.ts) and Foundry all read from this file. Change a tier or a
 * limit here and every surface follows. No secrets and no Node APIs, so the page can import it.
 *
 * ---------------------------------------------------------------------------------------------
 * DRAFT FOR KALEB. Every number in API_LIMITS and API_TIERS is a placeholder, picked to keep
 * the free API usable for a student project while stopping a script from scraping the catalog.
 * Set the real numbers before selling a key. Nothing here charges anyone: a key is minted by
 * hand in Foundry, and there are no prices on any API surface.
 * ---------------------------------------------------------------------------------------------
 *
 * Key shape (minted in Foundry, checked on every /api/cds call except /health):
 *
 *   FP-API-<T><YYYYMM>-<BODY>-<SIG>
 *
 * T       tier letter: D developer, E education
 * YYYYMM  last month the key works (valid through the end of that month, UTC)
 * BODY    8 hex, derived from the organization name, so re-minting the same org + tier +
 *         end month gives the same key. No database.
 * SIG     8 hex HMAC over "API:<T><YYYYMM>:<BODY>" with LICENSE_PEPPER
 *
 * The key is the only credential. Nothing about the caller is stored server-side beyond the
 * rate-limit counters, which hold an HMAC of the key id, never the key.
 */

export type ApiTierId = "developer" | "education";
export type ApiTierLetter = "D" | "E";
/** Who a request counts as for rate limiting. */
export type ApiCallerTier = "anonymous" | ApiTierId;

export interface ApiLimit {
  /** Requests allowed in any window. */
  max: number;
  /** Sliding window length. */
  windowMs: number;
}

/** DRAFT FOR KALEB: requests per sliding minute. Anonymous counts per IP address, keys per key. */
export const API_LIMITS: Record<ApiCallerTier, ApiLimit> = {
  anonymous: { max: 10, windowMs: 60_000 },
  developer: { max: 60, windowMs: 60_000 },
  education: { max: 600, windowMs: 60_000 },
};

export interface ApiTier {
  id: ApiTierId;
  letter: ApiTierLetter;
  name: string;
  /** One line on the /developers page. */
  fits: string;
  /** DRAFT FOR KALEB: a key of this tier may end at most this many months after the mint month. */
  maxMonthsAhead: number;
}

export const API_TIERS: readonly ApiTier[] = [
  {
    id: "developer",
    letter: "D",
    name: "Developer",
    fits: "Trying the API: a student project, a prototype study app, or checking the response shapes.",
    maxMonthsAhead: 12,
  },
  {
    id: "education",
    letter: "E",
    name: "Education",
    fits: "Teaching content: LMS courses, courseware, question banks and study apps for health-professions learners.",
    maxMonthsAhead: 36,
  },
];

export const API_TIER_BY_ID = Object.fromEntries(API_TIERS.map((t) => [t.id, t])) as Record<ApiTierId, ApiTier>;

export const API_TIER_LETTER: Record<ApiTierId, ApiTierLetter> = { developer: "D", education: "E" };

export const API_TIER_FROM_LETTER: Record<ApiTierLetter, ApiTierId> = { D: "developer", E: "education" };

export function isApiTierId(raw: unknown): raw is ApiTierId {
  return raw === "developer" || raw === "education";
}

export const API_KEY_RE = /^FP-API-([DE])(\d{4})(\d{2})-([0-9A-F]{8})-([0-9A-F]{8})$/;

/** Header names a caller may send the key in. `Authorization: Bearer <key>` is preferred. */
export const API_KEY_HEADER = "x-api-key";

/** Paths under /api/cds that never need a key and are never metered. */
export const API_OPEN_PATHS: readonly string[] = ["/api/cds/health"];

/** "10 requests per minute". */
export function describeLimit(limit: ApiLimit): string {
  const per = limit.windowMs === 60_000 ? "minute" : `${Math.round(limit.windowMs / 1000)} seconds`;
  return `${limit.max.toLocaleString("en-US")} requests per ${per}`;
}
