import { useMemo } from "react";
import { analyze } from "@/lib/drugs/engine";
import {
  AGE_LABEL,
  ALCOHOL_LABEL,
  CANNABIS_ROUTE_LABEL,
  DEFAULT_HOST,
  KETAMINE_ROUTE_LABEL,
  KIDNEY_LABEL,
  METABOLIZER_LABEL,
  PREG_LABEL,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type HostContext,
  type Report,
} from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

/**
 * "Same drugs, different person" — what the Host changes did to the list,
 * in everyday words. Educational only; an empty or quieter list never means safe.
 */
export function HostDelta({
  selected,
  host,
  report,
}: {
  selected: string[];
  host: HostContext;
  report: Report;
}) {
  const baseline = useMemo(() => analyze(selected, DEFAULT_HOST), [selected]);
  const flips = hostFlips(host);
  if (flips.length === 0 || selected.length === 0) return null;

  const dCount = report.findings.length - baseline.findings.length;
  const dRank = SEVERITY_RANK[report.highest] - SEVERITY_RANK[baseline.highest];
  const newHits = report.findings.filter((f) => !baseline.findings.some((b) => b.id === f.id)).slice(0, 4);
  const goneCount = baseline.findings.filter((b) => !report.findings.some((f) => f.id === b.id)).length;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Same drugs, different person</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        We re-ran this list for a typical adult (normal metabolizer, no smoking, no alcohol, IV ketamine, smoked
        THC) and compared it with the person you set up.
      </p>

      <p className="mt-3 text-[11px] font-medium text-muted">What you changed</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {flips.map((f) => (
          <li key={f} className="rounded-md bg-bg px-2 py-0.5 text-[11px] text-fg shadow-[var(--shadow-border)]">
            {f}
          </li>
        ))}
      </ul>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[11px] text-muted">Things to review</dt>
          <dd className="text-sm text-fg">
            <span className="font-mono tabular-nums">{baseline.findings.length}</span>
            <span className="text-muted"> before, </span>
            <span className="font-mono tabular-nums">{report.findings.length}</span>
            <span className="text-muted"> now</span>
            <span className={cn("block text-xs", dCount > 0 ? "text-danger" : dCount < 0 ? "text-ok" : "text-muted")}>
              {countWords(dCount)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Most serious flag</dt>
          <dd className="text-sm text-fg">
            {SEVERITY_LABEL[report.highest]}
            <span className={cn("block text-xs", dRank > 0 ? "text-danger" : dRank < 0 ? "text-ok" : "text-muted")}>
              {dRank === 0
                ? "Same level as the typical adult"
                : dRank > 0
                  ? `More serious than the typical adult (${SEVERITY_LABEL[baseline.highest]})`
                  : `Less serious than the typical adult (${SEVERITY_LABEL[baseline.highest]})`}
            </span>
          </dd>
        </div>
      </dl>

      {newHits.length > 0 ? (
        <>
          <p className="mt-3 text-[11px] font-medium text-muted">New for this person</p>
          <ul className="mt-1 space-y-1.5">
            {newHits.map((f) => (
              <li key={f.id} className="text-xs leading-relaxed text-muted">
                <span className="font-medium text-fg">{SEVERITY_LABEL[f.severity]}.</span> {f.headline}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          No new items appeared. The changes may still shift how strong or how long an effect is, so read the details
          in Findings.
        </p>
      )}

      {goneCount > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {goneCount === 1 ? "One item" : `${goneCount} items`} from the typical-adult list dropped off here. A shorter
          list is not a green light.
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Educational comparison only. It is not a dose and not a safety clearance.
      </p>
    </section>
  );
}

function countWords(d: number) {
  if (d === 0) return "Same number as the typical adult";
  const n = Math.abs(d);
  const noun = n === 1 ? "item" : "items";
  return d > 0 ? `${n} more ${noun} than the typical adult` : `${n} fewer ${noun} than the typical adult`;
}

/** Plain list of everything that differs from the typical adult. Empty means nothing moved. */
export function hostFlips(host: HostContext): string[] {
  const out: string[] = [];
  for (const e of Object.keys(DEFAULT_HOST.phenotypes) as (keyof typeof host.phenotypes)[]) {
    const m = host.phenotypes[e];
    if (m !== DEFAULT_HOST.phenotypes[e]) out.push(`${e} ${METABOLIZER_LABEL[m].toLowerCase()} metabolizer`);
  }
  if (host.smoking) out.push("Smokes tobacco");
  if (host.alcohol !== "off") out.push(`Alcohol: ${ALCOHOL_LABEL[host.alcohol].toLowerCase()}`);
  if (host.ketamineRoute !== "iv") out.push(`Ketamine ${KETAMINE_ROUTE_LABEL[host.ketamineRoute].toLowerCase()}`);
  if (host.cannabisRoute !== "smoked") out.push(`THC as ${CANNABIS_ROUTE_LABEL[host.cannabisRoute].toLowerCase()}`);
  if (host.age && host.age !== "adult") out.push(AGE_LABEL[host.age]);
  if (host.kidney && host.kidney !== "ok") out.push(KIDNEY_LABEL[host.kidney]);
  if (host.preg && host.preg !== "off") out.push(PREG_LABEL[host.preg]);
  return out;
}
