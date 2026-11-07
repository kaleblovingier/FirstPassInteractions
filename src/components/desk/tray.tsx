import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { isMatDesk, WINDOW_EXTRAS } from "@/lib/drugs/window";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { maxDrugs } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export function WindowExtras() {
  const selected = useDesk((s) => s.selected);
  const add = useDesk((s) => s.add);
  const remove = useDesk((s) => s.remove);
  const plan = usePlan();
  const cap = maxDrugs(plan);
  if (!isMatDesk(selected) || selected.length === 0) return null;

  const on = new Set(selected);
  const full = selected.length >= cap;

  function tap(id: string) {
    if (on.has(id)) {
      remove(id);
      return;
    }
    if (full) return;
    add(id);
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Today's extra</p>
          <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Window tray</h2>
          <p className="mt-1 text-xs text-muted">
            Tap what they handed over the glass. Up to five-drug collision checks stay free.
            {full ? " Remove one to add another." : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {WINDOW_EXTRAS.map((row) => {
          const items = row.items.filter((item) => DRUG_BY_ID[item.id]);
          if (!items.length) return null;
          return (
            <div key={row.group}>
              <div className="mb-1.5 flex items-baseline gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{row.group}</p>
                <p className="text-[11px] text-subtle">{row.hint}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => {
                  const live = on.has(item.id);
                  const locked = full && !live;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={locked}
                      onClick={() => tap(item.id)}
                      aria-pressed={live}
                      className={cn(
                        "h-10 pointer-coarse:h-11 rounded-full px-3 text-xs font-medium",
                        live
                          ? "bg-ink text-bg"
                          : "bg-bg-sunken text-muted hover:text-fg",
                        locked && "cursor-not-allowed opacity-40",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
