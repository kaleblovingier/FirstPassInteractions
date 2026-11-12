import { useEffect, useMemo, useState } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { ingestionTimes, useDesk } from "@/lib/drugs/store";
import { timeline } from "@/lib/drugs/overlap";
import type { Report, Timeline } from "@/lib/drugs/types";
import { SEVERITY_PLAIN } from "@/lib/drugs/types";
import { severitySurface } from "./severity";

export const TIMING_CAVEAT =
  "A teaching sketch from typical adult half-lives. It is not a level, and a low number is not a clearance to combine.";

const QUICK_HOURS = [1, 4, 12, 24] as const;
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const BTN = `inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border bg-surface px-2.5 text-xs text-fg hover:bg-surface-sunken ${FOCUS}`;

function Bar({ percent }: { percent: number }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
      <span className="block h-full rounded-full bg-fg/70" style={{ width: `${width}%` }} />
    </span>
  );
}

const pct = (n: number) => (n < 1 && n > 0 ? "under 1%" : `${Math.round(n)}%`);

function clockLabel(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Presentational: the decay rows and pair overlaps for a timeline. `takenAt` is the moment each time refers to. */
export function TimingSketch({
  data,
  takenAt,
  onSet,
}: {
  data: Timeline;
  takenAt: Record<string, number>;
  onSet: (id: string, hours: number | undefined) => void;
}) {
  const name = (id: string) => DRUG_BY_ID[id]?.name ?? id;
  return (
    <section
      aria-labelledby="timing-sketch-h"
      className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5 sm:py-5"
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Timing sketch</p>
        <h2 id="timing-sketch-h" className="mt-1 font-serif text-xl tracking-tight text-fg">
          How much of each item may be left
        </h2>
        <p className="mt-1 text-xs text-muted">{TIMING_CAVEAT} Times stay on this screen only.</p>
      </div>
      <ul className="space-y-3">
        {data.rows.map((row) => {
          const inputId = `taken-${row.id}`;
          const sliderId = `taken-slider-${row.id}`;
          const stated = row.hoursAgo;
          return (
            <li key={row.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-fg">{row.name}</p>
                {row.halfLifeH !== undefined ? (
                  <p className="text-xs text-muted">
                    Typical half-life about {row.halfLifeH} h. Source: {row.source}.
                  </p>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label htmlFor={inputId} className="text-xs text-muted">
                  Last taken, hours ago
                </label>
                <input
                  id={inputId}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={720}
                  step={0.5}
                  value={stated === undefined ? "" : Math.round(stated * 10) / 10}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    onSet(row.id, v === "" ? undefined : Number(v));
                  }}
                  className={`h-8 w-20 rounded-md border border-border bg-surface px-2 text-xs text-fg ${FOCUS}`}
                />
                <label htmlFor={sliderId} className="sr-only">
                  {`${row.name} last taken, hours ago, slider from 0 to 48`}
                </label>
                <input
                  id={sliderId}
                  type="range"
                  min={0}
                  max={48}
                  step={1}
                  value={stated === undefined ? 0 : Math.min(48, Math.round(stated))}
                  onChange={(e) => onSet(row.id, Number(e.target.value))}
                  className={`h-6 w-32 ${FOCUS}`}
                />
                {QUICK_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={BTN}
                    aria-label={`${row.name}: ${h} hours ago`}
                    onClick={() => onSet(row.id, h)}
                  >
                    {h} h
                  </button>
                ))}
                <button
                  type="button"
                  className={BTN}
                  aria-label={`Clear last taken time for ${row.name}`}
                  onClick={() => onSet(row.id, undefined)}
                >
                  Clear
                </button>
              </div>
              {stated !== undefined && takenAt[row.id] !== undefined ? (
                <p className="mt-1 text-[11px] text-muted">
                  Taken at about {clockLabel(takenAt[row.id]!)}. The hours move with the clock.
                </p>
              ) : null}
              <div className="mt-2">
                {row.note ? (
                  <p className="text-xs text-fg">{row.note} Nothing is sketched. Not a clearance.</p>
                ) : row.halfLifeH === undefined ? (
                  <p className="text-xs text-muted">
                    This shelf has no half-life for this item, so nothing is sketched. Not a clearance.
                  </p>
                ) : row.remaining === undefined ? (
                  <p className="text-xs text-muted">Enter when it was last taken to sketch the share left.</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <Bar percent={row.remaining * 100} />
                    <span className="shrink-0 text-xs text-fg">{pct(row.remaining * 100)} left</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {data.pairs.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-fg">Overlap by pair</h3>
          <ul className="mt-2 space-y-2">
            {data.pairs.map((p) => (
              <li
                key={p.pair.join("|")}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/70 px-3 py-2"
              >
                <span className="text-xs text-fg">
                  {name(p.pair[0])} + {name(p.pair[1])}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${severitySurface(p.severity)}`}>
                  {SEVERITY_PLAIN[p.severity]}
                </span>
                {p.holds ? (
                  <span className="basis-full text-xs text-fg">{p.holds}</span>
                ) : p.activeOverlapPercent !== undefined ? (
                  <span className="flex min-w-40 flex-1 items-center gap-3">
                    <Bar percent={p.activeOverlapPercent} />
                    <span className="shrink-0 text-xs text-fg">{pct(p.activeOverlapPercent)} overlap</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">Set both times to sketch the overlap.</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Connected: reads the session-only times from the desk and re-derives hours-ago once a minute. */
export function TimingPanel({ ids, report }: { ids: string[]; report: Report }) {
  const takenAt = useDesk((s) => s.takenAt);
  const setTaken = useDesk((s) => s.setTakenHoursAgo);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const data = useMemo(
    () => timeline(ids, ingestionTimes(takenAt, ids, now), report),
    [ids, takenAt, now, report],
  );
  return <TimingSketch data={data} takenAt={takenAt} onSet={(id, h) => setTaken(id, h)} />;
}
