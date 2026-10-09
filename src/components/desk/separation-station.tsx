import { separationHits } from "@/lib/drugs/separation";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";

export function SeparationPanel({ ids }: { ids: string[] }) {
  const hits = separationHits(ids);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Separate</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Labeled wait</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Some labels name a wait so the dose can arrive. The words below are that wait.
        </p>
      </div>

      {hits.length === 0 ? (
        <p className="rounded-xl bg-bg-sunken px-4 py-4 text-sm leading-relaxed text-muted">
          Put levothyroxine, ciprofloxacin, dolutegravir, bictegravir, or alendronate on the desk.
        </p>
      ) : (
        <ul className="space-y-3">
          {hits.map((hit) => {
            const others = ids
              .filter((id) => id !== hit.victimId)
              .map((id) => DRUG_BY_ID[id]?.name ?? id);
            return (
              <li key={hit.victimId} className="rounded-xl bg-bg-sunken px-4 py-4">
                <p className="font-serif text-base text-fg">{hit.victimName}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg">{hit.apart}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{hit.source}</p>
                {hit.bindersOnTray.length > 0 ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    On this tray: {hit.bindersOnTray.map((b) => b.name).join(", ")}.
                  </p>
                ) : !hit.alone ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    No binder from this list is on the tray. The label wait still applies to food, calcium,
                    iron, and antacids the tray does not show.
                  </p>
                ) : null}
                {hit.alone && others.length > 0 ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Other medication on this tray: {others.join(", ")}.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-subtle">
        Teaching from the prescribing information. Not a dose and not a schedule for a named patient.
      </p>
    </div>
  );
}
