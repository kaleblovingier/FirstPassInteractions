import { STACK_LABEL, type StackAxis, type StackBar } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

function tone(score: number) {
  if (score >= 4) return "bg-danger";
  if (score >= 3) return "bg-warn";
  if (score >= 2) return "bg-accent";
  if (score >= 1) return "bg-ink/40";
  return "bg-border";
}

function loadWord(score: number, cap: number) {
  if (score <= 0) return "Quiet";
  if (score >= cap - 1 || score >= 4) return "Heavy";
  if (score >= 2) return "Building";
  return "Light";
}

const AXIS_HINT: Record<StackAxis, string> = {
  serotonin: "Mood / serotonin overlap — teaching count, not a diagnosis.",
  cns: "How sleepy or airway-sensitive this mix may feel.",
  qt: "Rhythm-prolonging company on the tray.",
  pressor: "Pressure-pushing company on the tray.",
  nmda: "Ketamine-lane / NMDA company on the tray.",
};

export function StackMeters({ stacks }: { stacks: StackBar[] }) {
  const active = stacks.filter((s) => s.score > 0);
  const empty = active.length === 0;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-3">
        <h2 className="font-serif text-lg tracking-tight text-fg">Effect stacks</h2>
        <p className="text-xs leading-relaxed text-muted">
          How effects may pile up on this tray — a teaching meter, not a dose calculator and not a vital-sign prediction.
        </p>
      </div>
      {empty ? (
        <div className="rounded-lg border border-accent/15 bg-accent-soft/30 px-4 py-4">
          <p className="text-sm font-medium text-fg">No effect stack lit yet</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Add serotoninergic, sedating, QT, pressor, or NMDA-lane medicines to see bars fill. Quiet bars are not a
            green light for the whole desk — only this PD count.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {stacks.map((s) => (
            <li key={s.axis}>
              <div className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs font-medium text-muted sm:w-40">
                  {STACK_LABEL[s.axis]}
                </span>
                <span className="grid min-w-0 flex-1 grid-cols-5 gap-1" aria-hidden>
                  {Array.from({ length: s.cap }, (_, i) => (
                    <span
                      key={i}
                      className={cn("h-3 rounded-xs", i < s.score ? tone(s.score) : "bg-bg-sunken")}
                    />
                  ))}
                </span>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-fg">
                  <span className="font-medium">{loadWord(s.score, s.cap)}</span>
                  <span className="ml-1 font-mono text-[10px] text-muted">
                    {s.score}/{s.cap}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-subtle sm:pl-40">
                {s.items.length ? s.items.join(" · ") : AXIS_HINT[s.axis]}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!empty ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Quiet / Light / Building / Heavy are everyday words for this meter’s count — not a personal risk score.
        </p>
      ) : null}
    </section>
  );
}
