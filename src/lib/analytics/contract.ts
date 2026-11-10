/**
 * Owner-only visitor analytics: the shapes shared by the beacon, the collect endpoint, the store
 * and the Foundry dashboard.
 *
 * Collection is cookieless and aggregate. Each page view keeps only the page path (never the query
 * string or hash, which can carry a drug list), the referring site's host, the country our host
 * reports, a device class, and a visitor code made from the IP address and browser with a random
 * salt that is deleted after its UTC day, so codes can't be linked across days or traced back.
 * No IP address, user agent, cookie or drug name is stored. Views are kept RETENTION_DAYS days.
 */

/** Where the beacon posts. Under /api/ so the service worker never caches it. */
export const COLLECT_PATH = "/api/collect";

/** localStorage flag ("1") that stops this browser's visits from being counted (set from the Foundry). */
export const OPT_OUT_KEY = "firstpass.analytics.optout";

export const RETENTION_DAYS = 90;
export const MAX_PATH_LENGTH = 200;

export const STATS_RANGES = [7, 30, 90] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export type Device = "phone" | "tablet" | "desktop";

/** JSON body of a beacon. */
export interface CollectBody {
  /** location.pathname only. */
  path: string;
  /** document.referrer, sent only on the first page of a visit. The server keeps only its host. */
  referrer?: string;
}

export interface SiteStats {
  /** False when this deployment has no database (DATABASE_URL unset), so nothing is recorded. */
  enabled: boolean;
  days: StatsRange;
  /** visitors is the sum of each day's distinct visitors: codes rotate daily, so days can't be merged. */
  totals: { views: number; visitors: number };
  /** Every UTC day in the range, oldest first, zero-filled. */
  daily: { day: string; views: number; visitors: number }[];
  /** Top pages by views. */
  pages: { path: string; views: number; visitors: number }[];
  /** Top referring hosts by views; same-site and direct visits are left out. */
  referrers: { host: string; views: number }[];
  /** ISO 3166-1 alpha-2 codes by views; "" means unknown. */
  countries: { code: string; views: number }[];
  devices: { device: Device; views: number }[];
}

/** Deterministic zero-PHI summary insights computed solely from aggregate SiteStats. */
export interface AnalyticsSummary {
  averageDailyViews: number;
  peakDay: { day: string; views: number } | null;
  activeDays: number;
}

export type StatsResult = { ok: true; stats: SiteStats } | { ok: false; reason: string };
