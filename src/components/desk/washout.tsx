import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { washoutsFor } from "@/lib/drugs/host";
import { PLAIN_WASHOUT_SUBTITLE, plainWashoutLead } from "@/lib/drugs/plain-huddle";

export function WashoutCard({ selected }: { selected: string[] }) {
  const hits = washoutsFor(selected);
  if (!hits.length) return null;
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="font-serif text-lg tracking-tight text-fg">Washout clock</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{PLAIN_WASHOUT_SUBTITLE}</p>
      <ul className="mt-3 space-y-3">
        {hits.map((w) => {
          const names = w.ids
            .filter((id) => selected.includes(id))
            .map((id) => DRUG_BY_ID[id]?.name ?? id);
          const pct = Math.min(100, Math.round((w.days / 42) * 100));
          const lead = plainWashoutLead(w);
          return (
            <li key={w.ids.join("-")} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-fg">{names.join(", ")}</span>
                <span className="font-mono text-[11px] tabular-nums text-accent">{w.days}d</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg" title={w.label}>
                {lead}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{w.label}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
