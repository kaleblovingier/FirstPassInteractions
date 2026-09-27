import { cn } from "@/lib/utils";
import type { CannabisRoute, KetamineRoute } from "@/lib/drugs/types";

export function FirstPassMap({
  ketamineRoute,
  cannabisRoute,
  showKetamine,
  showCannabis,
  trayIds = [],
}: {
  ketamineRoute: KetamineRoute;
  cannabisRoute: CannabisRoute;
  showKetamine: boolean;
  showCannabis: boolean;
  /** Desk selection — only name perpetrators that are actually on the tray. */
  trayIds?: string[];
}) {
  if (!showKetamine && !showCannabis) return null;
  const oral =
    (showKetamine && ketamineRoute === "oral") || (showCannabis && cannabisRoute === "oral");
  const skip =
    (showKetamine && ketamineRoute === "iv") || (showCannabis && cannabisRoute === "smoked");
  const tray = new Set(trayIds);
  const namedPerps = [
    tray.has("clarithromycin") ? "Clarithromycin" : null,
    tray.has("grapefruit") ? "grapefruit" : null,
  ].filter(Boolean) as string[];
  const oralKetamineNote =
    namedPerps.length > 0
      ? `Swallowed ketamine is slowed by gut CYP3A4. ${namedPerps.join(" and ")} on this tray can make this path busier.`
      : "Swallowed ketamine is slowed by gut CYP3A4. No gut CYP3A4 blocker is on this tray yet, so nothing is mapped here. That is not a green light.";

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">Gut vs vein</h2>
          <p className="text-xs text-muted">
            What you swallow meets gut and liver enzymes before it reaches the rest of the body. IV,
            smoked, and nose routes mostly skip that first trap — not a dose, just the path.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PathCard
          title="Swallowed / edible"
          hot={oral}
          steps={["Mouth", "Gut enzymes", "Portal vein", "Liver", "Body"]}
          note={
            showKetamine && ketamineRoute === "oral"
              ? oralKetamineNote
              : showCannabis && cannabisRoute === "oral"
                ? "Edible THC is converted toward 11-OH-THC on this path. Smoked THC barely takes the same detour."
                : "Swallowing puts the gut-and-liver gauntlet between the dose and the rest of the body."
          }
        />
        <PathCard
          title="Vein / smoked / nose"
          hot={skip && !oral}
          steps={["Vein / lung / nose", "Body"]}
          note="The liver still clears medicine on the way out, but the gut first-pass trap is mostly gone."
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-subtle">
        Teaching map only — educational, not FDA-cleared, and not a milligram. Flip the route control
        above to see which path lights up.
      </p>
    </section>
  );
}

function PathCard({
  title,
  hot,
  steps,
  note,
}: {
  title: string;
  hot: boolean;
  steps: string[];
  note: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3",
        hot ? "bg-danger-soft text-danger" : "bg-bg-sunken text-fg",
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{title}</div>
      <ol className="mt-3 flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-8 items-center rounded-sm px-2 text-[11px] font-medium",
                hot ? "bg-surface text-danger" : "bg-surface text-fg",
              )}
            >
              {s}
            </span>
            {i < steps.length - 1 ? <span className="text-subtle">→</span> : null}
          </li>
        ))}
      </ol>
      <p className={cn("mt-3 text-xs leading-relaxed", hot ? "text-danger" : "text-muted")}>{note}</p>
    </div>
  );
}
