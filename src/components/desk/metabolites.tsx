import { treesFor } from "@/lib/drugs/metabolites";
import {
  METABOLITE_CARD_INTRO,
  metaboliteRoleLabel,
  parentRoleLabel,
  plainTreeLead,
  plainVia,
} from "@/lib/drugs/metabolite-plain";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { plateForDrug } from "@/lib/drugs/visuals";
import { cn } from "@/lib/utils";
import { Plate } from "./plate";

export function MetaboliteCard({ ids }: { ids: string[] }) {
  const trees = treesFor(ids);
  if (!trees.length) return null;
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-3">
        <h2 className="font-serif text-lg tracking-tight text-fg">Metabolite map</h2>
        <p className="text-xs text-muted">{METABOLITE_CARD_INTRO}</p>
      </div>
      <ul className="space-y-5">
        {trees.map((t) => {
          const drug = DRUG_BY_ID[t.id];
          const parentName = drug?.name ?? t.id.replace(/-/g, " ");
          return (
            <li key={t.id} className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
              {drug ? (
                <Plate
                  src={plateForDrug(drug)}
                  alt=""
                  className="h-28 w-full rounded-md sm:h-full min-h-28"
                />
              ) : (
                <div />
              )}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  {parentRoleLabel()}
                </p>
                <p className="text-sm font-medium capitalize text-fg">{parentName}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{plainTreeLead(t.id)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t.blurb}</p>
                <ol className="mt-3 space-y-2">
                  {t.nodes.map((n, i) => (
                    <li key={n.name} className="flex gap-2">
                      <span className="flex w-4 shrink-0 flex-col items-center">
                        <span className="mt-2 size-2 rounded-full bg-accent" />
                        {i < t.nodes.length - 1 ? (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1 rounded-sm bg-bg-sunken px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                          {metaboliteRoleLabel(i)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-medium text-fg">{n.name}</span>
                          <span className="font-mono text-[10px] uppercase tracking-wide text-accent">
                            {n.via}
                          </span>
                          {n.active ? (
                            <span className="font-mono text-[10px] uppercase text-ok">active</span>
                          ) : null}
                          {n.toxic ? (
                            <span className="font-mono text-[10px] uppercase text-danger">toxic</span>
                          ) : null}
                        </div>
                        <span className={cn("mt-0.5 block text-[11px] text-muted")}>
                          {plainVia(n.via)}
                        </span>
                        <span className={cn("block text-xs text-muted")}>{n.note}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
