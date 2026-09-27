import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { washoutsFor } from "@/lib/drugs/host";
import { PLAIN_WASHOUT_SUBTITLE, plainWashoutLead } from "@/lib/drugs/plain-huddle";
import {
  WASHOUT_COACH,
  WASHOUT_EMPTY,
  WASHOUT_FOOTER,
  WASHOUT_OFFSET,
  WASHOUT_TITLE,
  washoutDaysWords,
  washoutOffsetKind,
} from "@/lib/drugs/washout-plain";

export function WashoutCard({ selected }: { selected: string[] }) {
  const hits = washoutsFor(selected);
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="font-serif text-lg tracking-tight text-fg">{WASHOUT_TITLE.plainTitle}</h2>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
        {WASHOUT_TITLE.scientific}
      </p>
      <div className="mt-3 rounded-xl border border-accent/15 bg-accent-soft/30 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{WASHOUT_COACH.kicker}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">{WASHOUT_COACH.body}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{WASHOUT_COACH.estimate}</p>
      </div>
      {hits.length ? (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted">{PLAIN_WASHOUT_SUBTITLE}</p>
          <ul className="mt-3 space-y-3">
            {hits.map((w) => {
              const names = w.ids
                .filter((id) => selected.includes(id))
                .map((id) => DRUG_BY_ID[id]?.name ?? id);
              const pct = Math.min(100, Math.round((w.days / 42) * 100));
              const lead = plainWashoutLead(w);
              const kind = washoutOffsetKind(w);
              const offset = kind ? WASHOUT_OFFSET[kind] : null;
              return (
                <li key={w.ids.join("-")} className="rounded-md bg-bg-sunken px-3 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-fg">{names.join(", ")}</span>
                    <span
                      className="font-mono text-[11px] tabular-nums text-accent"
                      title={`${w.days} days (teaching estimate)`}
                    >
                      {washoutDaysWords(w.days)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg" title={w.label}>
                    {lead}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  {offset ? (
                    <p className="mt-2 text-xs leading-relaxed text-fg">
                      <span className="font-medium">{offset.tag}:</span> {offset.plain}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs leading-relaxed text-muted">{w.label}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-subtle">{WASHOUT_FOOTER}</p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted">{WASHOUT_EMPTY}</p>
      )}
    </section>
  );
}
