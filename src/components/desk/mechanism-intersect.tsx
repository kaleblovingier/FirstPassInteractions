import React, { useMemo, useState } from "react";
import {
  evaluateMechanismIntersect,
  PRESET_SCENARIOS,
  INTERSECT_REGULATORY_NOTICE,
  type BurdenLevel,
  type IntersectCategory,
  type IntersectLoad,
  type PresetScenario,
} from "@/lib/drugs/mechanism-intersect";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Moon,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS: Record<IntersectCategory, React.ReactNode> = {
  anticholinergic: <Flame className="size-4 text-warn" />,
  sedation: <Moon className="size-4 text-info" />,
  serotonin: <Zap className="size-4 text-danger" />,
  qtc: <HeartPulse className="size-4 text-rose-500" />,
  pressor: <Activity className="size-4 text-amber-500" />,
};

const LEVEL_BADGES: Record<BurdenLevel, { label: string; badgeClass: string; barClass: string }> = {
  minimal: {
    label: "Minimal",
    badgeClass: "bg-surface-2 text-muted border-border",
    barClass: "bg-muted/40",
  },
  mild: {
    label: "Mild",
    badgeClass: "bg-ok-soft text-ok border-ok/30",
    barClass: "bg-ok",
  },
  moderate: {
    label: "Moderate",
    badgeClass: "bg-warn-soft text-warn border-warn/30",
    barClass: "bg-warn",
  },
  high: {
    label: "High",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    barClass: "bg-amber-500",
  },
  severe: {
    label: "Severe",
    badgeClass: "bg-danger-soft text-danger border-danger/30 animate-pulse",
    barClass: "bg-danger",
  },
};

export function MechanismIntersect() {
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const add = useDesk((s) => s.add);

  const [activeCategory, setActiveCategory] = useState<IntersectCategory | "all">("all");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const result = useMemo(() => {
    return evaluateMechanismIntersect(selected);
  }, [selected]);

  function handleLoadPreset(preset: PresetScenario) {
    setActivePreset(preset.id);
    load(preset.drugIds);
  }

  const displayedLoads = useMemo(() => {
    if (activeCategory === "all") return result.loads;
    return result.loads.filter((l) => l.category === activeCategory);
  }, [result.loads, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Layers className="size-4" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                Pharmacodynamics & Target Saturation
              </p>
            </div>
            <h1 className="mt-1 font-serif text-2xl tracking-tight text-fg sm:text-3xl">
              Mechanism Intersect Engine
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-xs font-semibold",
                LEVEL_BADGES[result.highestLevel].badgeClass
              )}
            >
              Overall: {LEVEL_BADGES[result.highestLevel].label}
            </span>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Analyzes cumulative receptor blockade, transporter saturation, and converging
          downstream molecular cascades across your active desk regimen. Quantifies multi-drug
          anticholinergic burden, CNS sedative depression, serotonergic Hunter toxicity, cardiac
          hERG/IKr repolarization delay, and sympathomimetic pressor push.
        </p>

        {/* Selected Drugs Summary */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="font-mono text-xs text-muted">Active Tray ({selected.length}):</span>
          {selected.length === 0 ? (
            <span className="text-xs italic text-subtle">
              No drugs on desk. Pick a preset below or add drugs from the Shelf.
            </span>
          ) : (
            selected.map((id) => (
              <span
                key={id}
                className="rounded-md border border-border bg-bg-sunken px-2.5 py-1 font-mono text-xs font-medium text-fg"
              >
                {id}
              </span>
            ))
          )}
        </div>
      </section>

      {/* Preset Scenarios Carousel */}
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Clinical Board Presets
            </p>
            <h2 className="mt-0.5 font-serif text-lg tracking-tight text-fg">
              High-Yield Multi-Target Collisions
            </h2>
          </div>
          <span className="text-xs text-muted">Tap to load preset onto desk</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_SCENARIOS.map((p) => {
            const isLoaded = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleLoadPreset(p)}
                className={cn(
                  "flex min-h-[44px] flex-col justify-between rounded-lg border p-3 text-left transition hover:border-accent/40",
                  isLoaded
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border bg-bg-sunken/40"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-xs text-fg">{p.name}</span>
                    <span className="font-mono text-[10px] uppercase text-muted">
                      {p.expectedHighCategory}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {p.description}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.drugIds.map((d) => (
                    <span
                      key={d}
                      className="rounded bg-bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-muted"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={cn(
            "flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-medium transition cursor-pointer",
            activeCategory === "all"
              ? "bg-fg text-bg shadow-[var(--shadow-border)]"
              : "bg-surface text-muted border border-border hover:text-fg"
          )}
        >
          <span>All 5 Cascades</span>
          <span className="rounded-full bg-bg-sunken px-1.5 py-0.2 font-mono text-[10px] text-fg">
            5
          </span>
        </button>

        {result.loads.map((l) => (
          <button
            key={l.category}
            type="button"
            onClick={() => setActiveCategory(l.category)}
            className={cn(
              "flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition cursor-pointer",
              activeCategory === l.category
                ? "bg-accent text-accent-fg shadow-[var(--shadow-border)]"
                : "bg-surface text-muted border border-border hover:text-fg"
            )}
          >
            {CATEGORY_ICONS[l.category]}
            <span>{l.shortName}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                LEVEL_BADGES[l.level].badgeClass
              )}
            >
              {l.score}
            </span>
          </button>
        ))}
      </div>

      {/* Mechanism Cards Grid */}
      <div className="grid gap-5">
        {displayedLoads.map((loadItem) => {
          const config = LEVEL_BADGES[loadItem.level];
          const pct = Math.min(100, Math.round((loadItem.score / loadItem.maxExpectedScore) * 100));

          return (
            <div
              key={loadItem.category}
              className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6"
            >
              {/* Card Header */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-bg-sunken">
                    {CATEGORY_ICONS[loadItem.category]}
                  </span>
                  <div>
                    <h3 className="font-serif text-lg tracking-tight text-fg sm:text-xl">
                      {loadItem.title}
                    </h3>
                    <p className="font-mono text-xs text-muted">
                      Score: {loadItem.score} / {loadItem.maxExpectedScore} points
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium",
                      config.badgeClass
                    )}
                  >
                    {config.label}
                  </span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="mt-3">
                <div className="flex justify-between font-mono text-[11px] text-muted">
                  <span>Saturation Level</span>
                  <span>{pct}% of severe threshold</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-bg-sunken">
                  <div
                    className={cn("h-full transition-all duration-500", config.barClass)}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>

              {/* Summary Blurb */}
              <p className="mt-3 text-sm leading-relaxed text-fg">{loadItem.summary}</p>

              {/* Molecular Mechanism Box */}
              <div className="mt-4 rounded-lg bg-bg-sunken p-3.5">
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-accent">
                  <Sparkles className="size-3.5" />
                  <span>Molecular Signaling Cascade</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {loadItem.molecularMechanism}
                </p>
              </div>

              {/* Contributing Drugs */}
              <div className="mt-4 border-t border-border pt-3">
                <h4 className="font-mono text-xs font-semibold uppercase text-muted">
                  Contributing Regimen Drugs ({loadItem.contributingDrugs.length})
                </h4>

                {loadItem.contributingDrugs.length === 0 ? (
                  <p className="mt-2 text-xs italic text-subtle">
                    No active drugs contribute to this mechanism cascade.
                  </p>
                ) : (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {loadItem.contributingDrugs.map((contrib) => (
                      <div
                        key={contrib.drugId}
                        className="rounded-lg border border-border/80 bg-surface p-3"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-fg">
                            {contrib.drugName}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-[10px] font-medium",
                              contrib.contribution === "primary"
                                ? "bg-danger-soft text-danger"
                                : contrib.contribution === "secondary"
                                  ? "bg-warn-soft text-warn"
                                  : "bg-surface-2 text-muted"
                            )}
                          >
                            +{contrib.points} pts
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-accent">{contrib.target}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          {contrib.mechanismDetail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Pearls */}
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-warn">
                  <AlertTriangle className="size-3.5" />
                  <span>Clinical Pearls & Mitigation</span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {loadItem.clinicalPearls.map((pearl, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-muted">
                      <span className="select-none text-warn">•</span>
                      <span>{pearl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulatory Footer */}
      <footer className="rounded-xl border border-border bg-bg-sunken/60 p-4 text-xs leading-relaxed text-muted">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" />
          <p>{INTERSECT_REGULATORY_NOTICE}</p>
        </div>
      </footer>
    </div>
  );
}
