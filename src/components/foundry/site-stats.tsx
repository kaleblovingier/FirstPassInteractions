import { useEffect, useState } from "react";
import { Activity, BarChart2, Check, Download, Eye, Globe, Smartphone, Users } from "lucide-react";
import {
  type Device,
  type SiteStats,
  type StatsRange,
  OPT_OUT_KEY,
  STATS_RANGES,
} from "@/lib/analytics/contract";
import { getSiteStats } from "@/lib/analytics/stats";
import { downloadAnalyticsExport, formatIsoTimestamp } from "@/lib/analytics/export";
import { Button } from "@/components/ui/button";

interface SiteStatsDeskProps {
  pin: string;
}

interface ExportNotification {
  format: "JSON" | "CSV";
  isoTimestamp: string;
}

export function SiteStatsDesk({ pin }: SiteStatsDeskProps) {
  const [days, setDays] = useState<StatsRange>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [exportNotice, setExportNotice] = useState<ExportNotification | null>(null);

  useEffect(() => {
    try {
      setIsOptedOut(localStorage.getItem(OPT_OUT_KEY) === "1");
    } catch {
      // ignore storage access issues
    }
  }, []);

  function toggleOptOut() {
    try {
      if (isOptedOut) {
        localStorage.removeItem(OPT_OUT_KEY);
        setIsOptedOut(false);
      } else {
        localStorage.setItem(OPT_OUT_KEY, "1");
        setIsOptedOut(true);
      }
    } catch {
      // ignore
    }
  }

  async function loadStats(targetDays = days) {
    if (!pin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSiteStats({ data: { pin, days: targetDays } });
      if (res.ok) {
        setStats(res.stats);
      } else {
        setError(res.reason);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visitor statistics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pin) {
      void loadStats(days);
    }
  }, [pin, days]);

  function handleExportJson() {
    if (!stats || !stats.enabled) return;
    const now = new Date();
    const isoTimestamp = formatIsoTimestamp(now);
    downloadAnalyticsExport(stats, "json", now);
    setExportNotice({ format: "JSON", isoTimestamp });
    window.setTimeout(() => setExportNotice(null), 4500);
  }

  function handleExportCsv() {
    if (!stats || !stats.enabled) return;
    const now = new Date();
    const isoTimestamp = formatIsoTimestamp(now);
    downloadAnalyticsExport(stats, "csv", now);
    setExportNotice({ format: "CSV", isoTimestamp });
    window.setTimeout(() => setExportNotice(null), 4500);
  }

  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Cookieless Visitor Analytics
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            Aggregated, privacy-first page views. No IP addresses, user agents, cookies, or drug regimens are stored.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATS_RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "default" : "secondary"}
              onClick={() => {
                setDays(r);
              }}
              disabled={loading || !pin}
            >
              {r}d
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void loadStats(days)}
            disabled={loading || !pin}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJson}
            disabled={loading || !stats || !stats.enabled}
            title="Download active metrics snapshot as JSON"
          >
            <Download className="mr-1.5 size-3.5" />
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={loading || !stats || !stats.enabled}
            title="Download active metrics snapshot as CSV"
          >
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2 text-xs text-foreground animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <Check className="size-4 text-accent" />
            <span>
              Exported <strong>{exportNotice.format}</strong> metrics snapshot ({stats?.days}d)
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
            <span>Snapshot ISO:</span>
            <time dateTime={exportNotice.isoTimestamp} className="font-semibold text-foreground">
              {exportNotice.isoTimestamp}
            </time>
          </div>
        </div>
      )}

      {!pin ? (
        <div className="py-8 text-center text-xs text-muted">
          Enter the Operator PIN above to unlock visitor analytics.
        </div>
      ) : loading && !stats ? (
        <div className="py-8 text-center text-xs text-muted">Loading metrics...</div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-danger">{error}</div>
      ) : !stats?.enabled ? (
        <div className="py-6 text-center text-xs text-muted">
          Database is not configured (<code className="font-mono text-foreground">DATABASE_URL</code> unset). Analytics collection is disabled.
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-bg-sunken p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Eye className="size-3.5" />
                <span>Total Views</span>
              </div>
              <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
                {stats.totals.views.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-bg-sunken p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Users className="size-3.5" />
                <span>Unique Daily Visitors</span>
              </div>
              <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
                {stats.totals.visitors.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-bg-sunken p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <BarChart2 className="size-3.5" />
                <span>Avg Views / Day</span>
              </div>
              <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
                {Math.round(stats.totals.views / days).toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-bg-sunken p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Smartphone className="size-3.5" />
                <span>Top Device</span>
              </div>
              <div className="mt-1.5 font-mono text-sm font-semibold capitalize text-foreground">
                {stats.devices[0]?.device ?? "None"} ({stats.devices[0]?.views ?? 0})
              </div>
            </div>
          </div>

          {/* Top Pages Table */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Top Visited Pages ({days} Days)
            </h3>
            {stats.pages.length === 0 ? (
              <p className="text-xs text-muted">No page views recorded in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/60 bg-bg-sunken text-muted">
                    <tr>
                      <th className="p-2.5 font-medium">Path</th>
                      <th className="p-2.5 text-right font-medium">Views</th>
                      <th className="p-2.5 text-right font-medium">Unique Visitors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {stats.pages.slice(0, 15).map((page) => (
                      <tr key={page.path} className="hover:bg-surface-2/40">
                        <td className="p-2.5 font-sans font-medium text-foreground">{page.path}</td>
                        <td className="p-2.5 text-right text-muted">{page.views.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-muted">{page.visitors.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Referrers, Countries, Devices Split */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Referrers */}
            <div className="rounded-lg border border-border/60 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <Globe className="size-3.5" />
                <span>Top Referrers</span>
              </div>
              {stats.referrers.length === 0 ? (
                <p className="text-xs text-muted">Direct visits only.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {stats.referrers.slice(0, 6).map((ref) => (
                    <li key={ref.host} className="flex justify-between">
                      <span className="font-mono text-foreground">{ref.host}</span>
                      <span className="font-mono text-muted">{ref.views}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Countries */}
            <div className="rounded-lg border border-border/60 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <Globe className="size-3.5" />
                <span>Geographic Reach</span>
              </div>
              {stats.countries.length === 0 ? (
                <p className="text-xs text-muted">No regional data.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {stats.countries.slice(0, 6).map((c) => (
                    <li key={c.code || "unknown"} className="flex justify-between">
                      <span className="font-mono text-foreground">{c.code || "Unknown"}</span>
                      <span className="font-mono text-muted">{c.views}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Devices */}
            <div className="rounded-lg border border-border/60 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <Smartphone className="size-3.5" />
                <span>Device Split</span>
              </div>
              <ul className="space-y-2 text-xs">
                {stats.devices.map((d) => {
                  const pct = stats.totals.views > 0 ? Math.round((d.views / stats.totals.views) * 100) : 0;
                  return (
                    <li key={d.device} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-foreground">{d.device}</span>
                        <span className="font-mono text-muted">{d.views} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Browser Opt-Out Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg-sunken p-3.5">
            <div>
              <span className="text-xs font-medium text-foreground">Operator Browser Filter</span>
              <p className="mt-0.5 text-xs text-muted">
                {isOptedOut
                  ? "This browser is currently opted out from tracking. Your visits do not count toward stats."
                  : "Visits from this browser are currently counted in analytics."}
              </p>
            </div>
            <Button size="sm" variant={isOptedOut ? "default" : "secondary"} onClick={toggleOptOut}>
              {isOptedOut ? "Resume Counting This Browser" : "Exclude This Browser"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
