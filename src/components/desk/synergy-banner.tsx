import { useMemo } from "react";
import type { SeverityTier, SynergyAlert } from "@/types/interaction";
import { synergyAlerts } from "@/lib/drugs/synergy";
import { useDesk } from "@/lib/drugs/store";
import type { Report, Severity } from "@/lib/drugs/types";
import { SEVERITY_PLAIN } from "@/lib/drugs/types";
import { severitySurface } from "./severity";

const TIER_SEVERITY: Record<SeverityTier, Severity | "none"> = {
  Contraindicated: "contraindicated",
  Severe: "major",
  Moderate: "moderate",
  Low: "minor",
  Unknown: "none",
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function AlertCard({ alert, prominent, onOpenHarm }: { alert: SynergyAlert; prominent: boolean; onOpenHarm?: () => void }) {
  const sev = TIER_SEVERITY[alert.riskLevel];
  const depressant = alert.category === "CNS & Respiratory Depression";
  return (
    <li
      className={
        prominent
          ? "rounded-lg border border-border bg-surface-sunken p-3"
          : "rounded-md border border-border/70 px-3 py-2"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${severitySurface(sev)}`}>
          {SEVERITY_PLAIN[sev]}
        </span>
        <h3 className={prominent ? "text-sm font-medium text-fg" : "text-xs font-medium text-fg"}>
          {alert.category}
        </h3>
        <span className="text-xs text-muted">{alert.implicatedSubstances.join(", ")}</span>
      </div>
      <p className={prominent ? "mt-1.5 text-sm text-fg" : "mt-1 text-xs text-fg"}>{alert.clinicalExplanation}</p>
      {alert.actionableGuidance.length > 0 ? (
        <details className="mt-1.5">
          <summary className={`min-h-6 cursor-pointer text-xs text-muted ${FOCUS}`}>
            Teaching lines ({alert.actionableGuidance.length})
          </summary>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-fg">
            {alert.actionableGuidance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {depressant && onOpenHarm ? (
        <button
          type="button"
          onClick={onOpenHarm}
          className={`mt-1.5 inline-flex min-h-8 items-center rounded-md border border-border bg-surface px-2.5 text-xs text-fg hover:bg-surface-sunken ${FOCUS}`}
        >
          Open harm-reduction teaching
        </button>
      ) : null}
    </li>
  );
}

/** Presentational. Renders nothing for no alerts: a quiet banner is not a clearance, so it says nothing. */
export function SynergyBannerView({ alerts, onOpenHarm }: { alerts: SynergyAlert[]; onOpenHarm?: () => void }) {
  if (alerts.length === 0) return null;
  const loud = alerts.filter((a) => a.riskLevel === "Contraindicated" || a.riskLevel === "Severe");
  const quiet = alerts.filter((a) => !loud.includes(a));
  return (
    <section
      aria-labelledby="synergy-banner-h"
      className="space-y-2 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)] sm:px-5"
    >
      <h2 id="synergy-banner-h" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Shared mechanisms in this tray
      </h2>
      <ul className="space-y-2">
        {loud.map((a) => (
          <AlertCard key={a.category} alert={a} prominent onOpenHarm={onOpenHarm} />
        ))}
        {quiet.map((a) => (
          <AlertCard key={a.category} alert={a} prominent={false} onOpenHarm={onOpenHarm} />
        ))}
      </ul>
      <p className="text-[11px] text-muted">
        A summary of rows the check already found, gathered by mechanism. It adds no finding. Not a clearance.
      </p>
    </section>
  );
}

export function SynergyBanner({ ids, report }: { ids: string[]; report: Report }) {
  const openStation = useDesk((s) => s.openStation);
  const alerts = useMemo(() => synergyAlerts(ids, report), [ids, report]);
  return <SynergyBannerView alerts={alerts} onOpenHarm={() => openStation("hr")} />;
}
