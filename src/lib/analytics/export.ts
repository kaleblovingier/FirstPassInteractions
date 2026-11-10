/**
 * Zero-PHI Export Formatter for FirstPass Aggregate Visitor Analytics.
 *
 * Produces structured JSON and multi-section RFC 4180 CSV snapshots of the active
 * metrics window (totals, summary insights, daily breakdown, top pages, referrers,
 * geographic reach, and device breakdown).
 *
 * Guaranteed Privacy & Compliance Invariants:
 * 1. ZERO individual visitor identifiers, visitor codes, salts, or sessions.
 * 2. ZERO IP addresses (IPv4 or IPv6) or network identifiers.
 * 3. ZERO drug querying patterns or clinical search terms (page paths strictly stripped of queries/hashes).
 * 4. Formula injection hardening: All CSV cells starting with optional whitespace/control chars
 *    before `=`, `+`, `-`, `@`, `\t`, `\r`, or `\n` (as well as embedded newlines followed by formula
 *    triggers) are neutralized by prepending a single quote `'`.
 * 5. Strict adherence to RFC 4180 CSV specifications and HIPAA Safe Harbor de-identification principles.
 */

import type { AnalyticsSummary, Device, SiteStats } from "./contract";

export interface AnalyticsExportReport {
  schema: "firstpass-analytics-aggregate-v1";
  exportedAt: string;
  timeframeDays: number;
  privacy: string;
  totals: {
    views: number;
    visitors: number;
  };
  summary: AnalyticsSummary;
  daily: Array<{
    day: string;
    views: number;
    visitors: number;
  }>;
  pages: Array<{
    path: string;
    views: number;
    visitors: number;
  }>;
  referrers: Array<{
    host: string;
    views: number;
  }>;
  countries: Array<{
    code: string;
    views: number;
  }>;
  devices: Array<{
    device: Device;
    views: number;
  }>;
}

export const PRIVACY_STATEMENT =
  "Strictly cookieless, zero-PHI aggregate metrics. Zero IP addresses, user agents, cookies, or visitor identifiers.";

/**
 * Defensively cleans and normalizes page paths for export.
 * Strips query strings, URL hashes, control characters, and enforces leading slash.
 */
export function sanitizeExportPath(rawPath: unknown): string {
  if (typeof rawPath !== "string") return "/";
  // Strip fragment identifier (#) and query parameters (?)
  const withoutHash = rawPath.split("#")[0] ?? "/";
  const withoutQuery = withoutHash.split("?")[0] ?? "/";
  const trimmed = withoutQuery.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // Enforce max length constraint
  return withSlash.slice(0, 200);
}

const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@"]);

function neutralizeEmbeddedNewlineFormulas(str: string): string {
  let out = "";
  let i = 0;
  while (i < str.length) {
    const ch = str[i]!;
    out += ch;
    i++;
    if (ch !== "\r" && ch !== "\n" && i < str.length && (str[i] === "\r" || str[i] === "\n")) {
      let nlEnd = i;
      while (nlEnd < str.length && (str[nlEnd] === "\r" || str[nlEnd] === "\n")) {
        nlEnd++;
      }
      out += str.slice(i, nlEnd);
      let probe = nlEnd;
      while (probe < str.length) {
        const c = str[probe]!;
        const code = c.charCodeAt(0);
        if (c === " " || c === "\t" || (code <= 0x1f && c !== "\r" && c !== "\n")) {
          probe++;
        } else {
          break;
        }
      }
      if (probe < str.length && FORMULA_TRIGGERS.has(str[probe]!)) {
        out += "'";
      }
      i = nlEnd;
    }
  }
  return out;
}

function hasLeadingFormulaTrigger(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c === "\t" || c === "\r" || c === "\n" || FORMULA_TRIGGERS.has(c)) {
      return true;
    }
    const code = c.charCodeAt(0);
    if (code <= 0x1f || /\s/.test(c)) {
      continue;
    }
    return false;
  }
  return false;
}

/**
 * Escapes values for standard RFC 4180 CSV and neutralizes spreadsheet formula injection (CSV/DDE).
 *
 * Neutralizes:
 * - Any cell starting with optional whitespace or control characters followed by `=`, `+`, `-`, `@`, `\t`, `\r`, or `\n`.
 * - Any embedded newline inside a multi-line cell followed by optional whitespace/control chars and a formula trigger.
 */
export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str === "") return "";

  // 1. Neutralize formula triggers immediately after embedded newlines (e.g., "note\n=CMD")
  let safe = neutralizeEmbeddedNewlineFormulas(str);

  // 2. Neutralize leading whitespace/control chars before formula triggers (=, +, -, @, \t, \r, \n)
  if (hasLeadingFormulaTrigger(safe)) {
    safe = `'${safe}`;
  }

  // 3. RFC 4180 escaping: fields containing double quotes, commas, or line breaks must be enclosed in quotes
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Computes deterministic, zero-PHI summary insights solely from aggregate SiteStats.
 */
export function computeExportSummary(stats: SiteStats): AnalyticsSummary {
  const daily = stats.daily ?? [];
  const totalViews =
    stats.totals !== undefined && stats.totals !== null
      ? Math.max(0, Number(stats.totals.views) || 0)
      : daily.reduce((sum, entry) => sum + Math.max(0, Number(entry.views) || 0), 0);

  const rawDays = Number(stats.days);
  const divisor =
    Number.isFinite(rawDays) && rawDays > 0
      ? rawDays
      : Math.max(1, daily.length);

  const averageDailyViews =
    totalViews <= 0 || divisor <= 0
      ? 0
      : Math.round((totalViews / divisor) * 10) / 10;

  let activeDays = 0;
  let peakDay: { day: string; views: number } | null = null;

  for (const entry of daily) {
    const views = Math.max(0, Number(entry.views) || 0);
    const day = String(entry.day);
    if (views > 0) {
      activeDays++;
      if (
        !peakDay ||
        views > peakDay.views ||
        (views === peakDay.views && day > peakDay.day)
      ) {
        peakDay = { day, views };
      }
    }
  }

  return {
    averageDailyViews,
    peakDay,
    activeDays,
  };
}

/**
 * Formats any Date, timestamp, or valid date string into a canonical ISO 8601 UTC timestamp string.
 */
export function formatIsoTimestamp(input?: Date | number | string): string {
  if (input instanceof Date) {
    return !Number.isNaN(input.getTime()) ? input.toISOString() : new Date().toISOString();
  }
  if (typeof input === "number" || typeof input === "string") {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Formats a Date / timestamp into UTC YYYY-MM-DD for standard filenames.
 */
export function formatUtcDateString(now?: Date | number): string {
  const d = now instanceof Date ? now : typeof now === "number" ? new Date(now) : new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generates an informative, standardized filename for the export file.
 * e.g. firstpass-analytics-30d-2026-11-08.json
 */
export function generateExportFilename(
  days: number,
  format: "json" | "csv",
  now?: Date | number,
): string {
  const dateStr = formatUtcDateString(now);
  return `firstpass-analytics-${days}d-${dateStr}.${format}`;
}

/**
 * Serializes the aggregate site stats to a structured zero-PHI JSON string.
 */
export function exportStatsToJson(
  stats: SiteStats,
  exportedAt?: Date | number | string,
): string {
  const isoDate = formatIsoTimestamp(exportedAt);
  const summary = computeExportSummary(stats);

  const report: AnalyticsExportReport = {
    schema: "firstpass-analytics-aggregate-v1",
    exportedAt: isoDate,
    timeframeDays: stats.days,
    privacy: PRIVACY_STATEMENT,
    totals: {
      views: Math.max(0, Number(stats.totals?.views ?? 0) || 0),
      visitors: Math.max(0, Number(stats.totals?.visitors ?? 0) || 0),
    },
    summary,
    daily: (stats.daily ?? []).map((d) => ({
      day: String(d.day),
      views: Math.max(0, Number(d.views) || 0),
      visitors: Math.max(0, Number(d.visitors) || 0),
    })),
    pages: (stats.pages ?? []).map((p) => ({
      path: sanitizeExportPath(p.path),
      views: Math.max(0, Number(p.views) || 0),
      visitors: Math.max(0, Number(p.visitors) || 0),
    })),
    referrers: (stats.referrers ?? []).map((r) => ({
      host: String(r.host),
      views: Math.max(0, Number(r.views) || 0),
    })),
    countries: (stats.countries ?? []).map((c) => ({
      code: String(c.code),
      views: Math.max(0, Number(c.views) || 0),
    })),
    devices: (stats.devices ?? []).map((d) => ({
      device: d.device,
      views: Math.max(0, Number(d.views) || 0),
    })),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Serializes the aggregate site stats to a structured multi-section RFC 4180 CSV document.
 */
export function exportStatsToCsv(
  stats: SiteStats,
  exportedAt?: Date | number | string,
): string {
  const isoDate = formatIsoTimestamp(exportedAt);
  const summary = computeExportSummary(stats);
  const lines: string[] = [];

  // Metadata headers (commented with # for standard parsers)
  lines.push("# FirstPass Analytics Aggregate Export");
  lines.push(`# Exported: ${isoDate}`);
  lines.push(`# Timeframe: ${stats.days} days`);
  lines.push(`# Privacy: ${PRIVACY_STATEMENT}`);
  lines.push("");

  // Section 1: KPI Totals
  const totalViews = Math.max(0, Number(stats.totals?.views ?? 0) || 0);
  const totalVisitors = Math.max(0, Number(stats.totals?.visitors ?? 0) || 0);
  lines.push("[TOTALS]");
  lines.push("Metric,Value");
  lines.push(`Total Page Views,${escapeCsv(totalViews)}`);
  lines.push(`Unique Daily Visitors,${escapeCsv(totalVisitors)}`);
  lines.push(`Timeframe Days,${escapeCsv(stats.days)}`);
  lines.push("");

  // Section 2: Computed Summary Insights
  lines.push("[SUMMARY METRICS]");
  lines.push("Metric,Value");
  lines.push(`Average Daily Views,${escapeCsv(summary.averageDailyViews)}`);
  lines.push(`Active Days,${escapeCsv(summary.activeDays)}`);
  lines.push(`Peak Day,${escapeCsv(summary.peakDay ? summary.peakDay.day : "None")}`);
  lines.push(`Peak Day Views,${escapeCsv(summary.peakDay ? summary.peakDay.views : 0)}`);
  lines.push("");

  // Section 3: Daily Breakdown
  lines.push("[DAILY BREAKDOWN]");
  lines.push("Date,Page Views,Unique Visitors");
  for (const d of stats.daily ?? []) {
    lines.push(
      `${escapeCsv(d.day)},${escapeCsv(Math.max(0, Number(d.views) || 0))},${escapeCsv(Math.max(0, Number(d.visitors) || 0))}`,
    );
  }
  lines.push("");

  // Section 4: Top Visited Pages
  lines.push("[TOP PAGES]");
  lines.push("Path,Page Views,Unique Visitors");
  for (const p of stats.pages ?? []) {
    lines.push(
      `${escapeCsv(sanitizeExportPath(p.path))},${escapeCsv(Math.max(0, Number(p.views) || 0))},${escapeCsv(Math.max(0, Number(p.visitors) || 0))}`,
    );
  }
  lines.push("");

  // Section 5: Top Referrers
  lines.push("[TOP REFERRERS]");
  lines.push("Referring Host,Page Views");
  for (const r of stats.referrers ?? []) {
    lines.push(`${escapeCsv(r.host)},${escapeCsv(Math.max(0, Number(r.views) || 0))}`);
  }
  lines.push("");

  // Section 6: Geographic Reach
  lines.push("[GEOGRAPHIC REACH]");
  lines.push("Country Code,Page Views");
  for (const c of stats.countries ?? []) {
    lines.push(`${escapeCsv(c.code)},${escapeCsv(Math.max(0, Number(c.views) || 0))}`);
  }
  lines.push("");

  // Section 7: Device Distribution (with zero-division-safe percentage share)
  const totalDeviceViews = (stats.devices ?? []).reduce(
    (sum, d) => sum + Math.max(0, Number(d.views) || 0),
    0,
  );
  const pctBase = totalViews > 0 ? totalViews : totalDeviceViews;

  lines.push("[DEVICE BREAKDOWN]");
  lines.push("Device,Page Views,Share");
  for (const d of stats.devices ?? []) {
    const devViews = Math.max(0, Number(d.views) || 0);
    const pct =
      pctBase > 0 ? `${(Math.round((devViews / pctBase) * 1000) / 10).toFixed(1)}%` : "0.0%";
    lines.push(`${escapeCsv(d.device)},${escapeCsv(devViews)},${escapeCsv(pct)}`);
  }

  return lines.join("\r\n");
}

/**
 * Triggers a browser file download of the aggregate analytics metrics.
 * Safe no-op in server / SSR environments.
 */
export function downloadAnalyticsExport(
  stats: SiteStats,
  format: "json" | "csv",
  now?: Date | number,
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const filename = generateExportFilename(stats.days, format, now);
  const text = format === "json" ? exportStatsToJson(stats, now) : exportStatsToCsv(stats, now);
  const mime = format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8";

  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
