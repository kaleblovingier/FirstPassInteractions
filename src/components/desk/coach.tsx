import { buildDeskCoach, type DeskCoachAction } from "@/lib/drugs/desk-coach";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";

export function DeskCoach({
  ids,
  findingsCount,
}: {
  ids: string[];
  findingsCount: number;
}) {
  const add = useDesk((s) => s.add);
  const setPhenotype = useDesk((s) => s.setPhenotype);
  const setSmoking = useDesk((s) => s.setSmoking);
  const setView = useDesk((s) => s.setView);

  if (findingsCount > 0 || ids.length === 0) return null;
  const tip = buildDeskCoach(ids);
  if (!tip) return null;

  function run(action: DeskCoachAction) {
    if (action.kind === "add") add(action.id);
    else if (action.kind === "phenotype") setPhenotype(action.enzyme, action.value);
    else if (action.kind === "smoking") setSmoking(action.on);
    else setView(action.view);
  }

  return (
    <section
      aria-label="Desk coach"
      className="rounded-xl border border-accent/20 bg-accent-soft/40 p-4 shadow-[var(--shadow-border)] sm:p-5"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Desk coach</p>
      <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">{tip.headline}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{tip.why}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tip.actions.map((action) => (
          <button
            key={`${action.kind}:${"id" in action ? action.id : "enzyme" in action ? action.enzyme + action.value : "view" in action ? action.view : action.label}`}
            type="button"
            onClick={() => run(action)}
            className={cn(
              "h-10 rounded-full px-3 text-xs font-medium",
              action.kind === "add" || action.kind === "phenotype" || action.kind === "smoking"
                ? "bg-ink text-bg hover:opacity-90"
                : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
