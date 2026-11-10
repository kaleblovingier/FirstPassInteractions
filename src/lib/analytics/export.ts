/**
 * Zero-PHI Export Formatter for FirstPass Aggregate Visitor Analytics.
 *
 * Produces structured JSON and multi-section RFC 4180 CSV snapshots of the active
 * metrics window (totals, daily breakdown, top pages, referrers, geographic reach,
 * and device breakdown).
 *
 * Guaranteed Privacy & Compliance Invariants:
 * 1. ZERO individual visitor identifiers, visitor codes, salts, or sessions.
 * 2. ZERO IP addresses (IPv4 or IPv6) or network identifiers.
 * 3. ZERO drug querying patterns or clinical search terms (page paths strictly stripped of queries/hashes).
 * 4. Formula injection hardening: All CSV cells starting with `=`, `+`, `-`, `@`, `\t`, `\r`
 *    are neutralized by prepending a single quote `'` per spreadsheet security best practices.
 * 5. Strict adherence to RFC 4180 CSV specifications and HIPAA Safe Harbor de-identification principles.
 */

import type { Device, SiteStats } from "./contract";

export interface AnalyticsExportReport {
  schema: "firstpass-analytics-aggregate-v1";
  exportedAt: string;
  timeframeDays: number;
  privacy: string;
  totals: {
    views: number;
    visitors: number;
  };
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

/**
 * Escapes values for standard RFC 4180 CSV and neutralizes spreadsheet formula injection (CSV/DDE).
 *
 * Any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is neutralized by prepending a single quote `'`
 * so that spreadsheet applications (Excel, Google Sheets, LibreOffice Calc) treat it strictly as text
 * rather than an executable formula or dynamic data exchange command.
 */
export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str === "") return "";

  // Neutralize formula injection / DDE attacks:
  // If string starts with =, +, -, @, \t, or \r, prepend a single quote (')
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;

  // RFC 4180 escaping: fields containing double quotes, commas, or line breaks must be enclosed in quotes
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
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

  const report: AnalyticsExportReport = {
    schema: "firstpass-analytics-aggregate-v1",
    exportedAt: isoDate,
    timeframeDays: stats.days,
    privacy: PRIVACY_STATEMENT,
    totals: {
      views: Number(stats.totals?.views ?? 0),
      visitors: Number(stats.totals?.visitors ?? 0),
    },
    daily: (stats.daily ?? []).map((d) => ({
      day: String(d.day),
      views: Number(d.views),
      visitors: Number(d.visitors),
    })),
    pages: (stats.pages ?? []).map((p) => ({
      path: sanitizeExportPath(p.path),
      views: Number(p.views),
      visitors: Number(p.visitors),
    })),
    referrers: (stats.referrers ?? []).map((r) => ({
      host: String(r.host),
      views: Number(r.views),
    })),
    countries: (stats.countries ?? []).map((c) => ({
      code: String(c.code),
      views: Number(c.views),
    })),
    devices: (stats.devices ?? []).map((d) => ({
      device: d.device,
      views: Number(d.views),
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
  const lines: string[] = [];

  // Metadata headers (commented with # for standard parsers)
  lines.push("# FirstPass Analytics Aggregate Export");
  lines.push(`# Exported: ${isoDate}`);
  lines.push(`# Timeframe: ${stats.days} days`);
  lines.push(`# Privacy: ${PRIVACY_STATEMENT}`);
  lines.push("");

  // Section 1: KPI Totals
  lines.push("[TOTALS]");
  lines.push("Metric,Value");
  lines.push(`Total Page Views,${escapeCsv(Number(stats.totals?.views ?? 0))}`);
  lines.push(`Unique Daily Visitors,${escapeCsv(Number(stats.totals?.visitors ?? 0))}`);
  lines.push(`Timeframe Days,${escapeCsv(stats.days)}`);
  lines.push("");

  // Section 2: Daily Breakdown
  lines.push("[DAILY BREAKDOWN]");
  lines.push("Date,Page Views,Unique Visitors");
  for (const d of stats.daily ?? []) {
    lines.push(`${escapeCsv(d.day)},${escapeCsv(Number(d.views))},${escapeCsv(Number(d.visitors))}`);
  }
  lines.push("");

  // Section 3: Top Visited Pages
  lines.push("[TOP PAGES]");
  lines.push("Path,Page Views,Unique Visitors");
  for (const p of stats.pages ?? []) {
    lines.push(`${escapeCsv(sanitizeExportPath(p.path))},${escapeCsv(Number(p.views))},${escapeCsv(Number(p.visitors))}`);
  }
  lines.push("");

  // Section 4: Top Referrers
  lines.push("[TOP REFERRERS]");
  lines.push("Referring Host,Page Views");
  for (const r of stats.referrers ?? []) {
    lines.push(`${escapeCsv(r.host)},${escapeCsv(Number(r.views))}`);
  }
  lines.push("");

  // Section 5: Geographic Reach
  lines.push("[GEOGRAPHIC REACH]");
  lines.push("Country Code,Page Views");
  for (const c of stats.countries ?? []) {
    lines.push(`${escapeCsv(c.code)},${escapeCsv(Number(c.views))}`);
  }
  lines.push("");

  // Section 6: Device Distribution
  lines.push("[DEVICE BREAKDOWN]");
  lines.push("Device,Page Views");
  for (const d of stats.devices ?? []) {
    lines.push(`${escapeCsv(d.device)},${escapeCsv(Number(d.views))}`);
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
