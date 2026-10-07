import React, { useMemo, useState } from "react";
import {
  NEPHRON_SEGMENTS,
  NEPHRON_TRANSPORTERS,
  DIURETIC_CLASS_PROFILES,
  RENAL_COLLISIONS,
  RENAL_MECHANISMS_REGULATORY_DISCLAIMER,
  RENAL_MECHANISMS_CITATIONS,
  getAllNephronSegments,
  getNephronSegmentById,
  getAllNephronTransporters,
  getTransportersBySegment,
  getDiureticClassProfiles,
  detectRenalCollisions,
  type NephronSegmentId,
  type NephronSegment,
  type NephronTransporter,
  type DiureticClassProfile,
  type RenalCollision,
} from "@/lib/drugs/renal-mechanisms";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Droplets,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Network,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function RenalMechanisms() {
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const add = useDesk((s) => s.add);

  const [activeSegmentId, setActiveSegmentId] = useState<NephronSegmentId>("tal");
  const [activeMainTab, setActiveMainTab] = useState<"diagram" | "transporters" | "matrix" | "collisions">("diagram");
  const [filterMembrane, setFilterMembrane] = useState<"all" | "apical" | "basolateral" | "paracellular">("all");
  const [recentlyLoadedCollision, setRecentlyLoadedCollision] = useState<string | null>(null);

  // Active inspected segment
  const activeSegment: NephronSegment = useMemo(() => {
    return getNephronSegmentById(activeSegmentId) ?? NEPHRON_SEGMENTS[1];
  }, [activeSegmentId]);

  // Transporters for the active segment
  const segmentTransporters = useMemo(() => {
    const list = getTransportersBySegment(activeSegmentId);
    if (filterMembrane === "all") return list;
    return list.filter((t) => t.membrane === filterMembrane);
  }, [activeSegmentId, filterMembrane]);

  // Detect active collisions from desk tray
  const activeCollisions = useMemo(() => {
    return detectRenalCollisions(selected);
  }, [selected]);

  // Check which currently selected drugs overlap with nephron transporters
  const activeDeskRenalDrugs = useMemo(() => {
    if (!selected.length) return [];
    const overlaps: Array<{
      drugId: string;
      drugName: string;
      inhibitsTransporters: NephronTransporter[];
    }> = [];

    for (const drugId of selected) {
      const drugName = DRUG_BY_ID[drugId]?.name ?? drugId;
      const inhibits: NephronTransporter[] = [];

      for (const t of NEPHRON_TRANSPORTERS) {
        if (
          t.inhibitedByDrugIds.includes(drugId) ||
          (drugId === "hctz" && t.inhibitedByDrugIds.includes("hydrochlorothiazide")) ||
          (drugId === "hydrochlorothiazide" && t.inhibitedByDrugIds.includes("hctz"))
        ) {
          inhibits.push(t);
        }
      }

      if (inhibits.length > 0) {
        overlaps.push({ drugId, drugName, inhibitsTransporters: inhibits });
      }
    }

    return overlaps;
  }, [selected]);

  function handleLoadPreset(drugIds: string[], presetId: string) {
    load(drugIds);
    setRecentlyLoadedCollision(presetId);
    setTimeout(() => {
      setRecentlyLoadedCollision(null);
    }, 2800);
  }

  function handleAddSingleDrug(drugId: string) {
    if (!selected.includes(drugId)) {
      add(drugId);
    }
  }

  function formatDrug(id: string) {
    return DRUG_BY_ID[id]?.name ?? id;
  }

  return (
    <div className="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full font-sans text-fg">
      {/* 1. Header & Regulatory Posture */}
      <header className="flex flex-col gap-3 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <Droplets className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                Renal Tubular Acidification &amp; Diuretic Pharmacology
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Nephron segmental ion transport, electrochemical potentials, acidification, and clinical collisions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
              <Activity className="size-3.5" />
              FD&amp;C Act § 520(o)(1)(E)
            </span>
          </div>
        </div>

        {/* Regulatory Posture Notice */}
        <div className="rounded-xl bg-bg-sunken border border-border/80 p-3.5 text-xs leading-relaxed text-muted flex items-start gap-2.5">
          <Info className="size-4 shrink-0 text-accent mt-0.5" />
          <div>
            <span className="font-semibold text-fg">Non-Prescriptive Clinical Decision Support Notice: </span>
            {RENAL_MECHANISMS_REGULATORY_DISCLAIMER}
          </div>
        </div>
      </header>

      {/* 2. Active Desk Tray Renal Detection & Collisions Banner */}
      <section className="flex flex-col gap-3 rounded-2xl bg-surface border border-border p-4 sm:p-5 shadow-[var(--shadow-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            <h2 className="text-sm sm:text-base font-bold text-fg">Active Desk Tray Pharmacodynamic Monitoring</h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
              {selected.length} {selected.length === 1 ? "Drug" : "Drugs"} on Desk
            </span>
          </div>

          <div className="text-xs text-muted">
            {activeDeskRenalDrugs.length > 0 ? (
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                {activeDeskRenalDrugs.length} nephron-active agent{activeDeskRenalDrugs.length > 1 ? "s" : ""} detected
              </span>
            ) : (
              <span>No nephron-active drugs on desk</span>
            )}
          </div>
        </div>

        {/* Collisions Detected Banner if any */}
        {activeCollisions.length > 0 ? (
          <div className="space-y-3 pt-1">
            {activeCollisions.map(({ collision, matchedDrugIds, triggeredBy }) => {
              const isCritical = collision.severity === "critical";
              const isSynergistic = collision.severity === "synergistic-clinical";

              return (
                <div
                  key={collision.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-150 flex flex-col gap-2.5",
                    isCritical
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                      : isSynergistic
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100"
                        : "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          isCritical
                            ? "bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30"
                            : isSynergistic
                              ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30",
                        )}
                      >
                        {collision.severity.replace("-", " ")}
                      </span>
                      <h3 className="text-sm font-bold text-fg">{collision.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {matchedDrugIds.map((id) => (
                        <span
                          key={id}
                          className="rounded bg-surface/80 border border-border px-2 py-0.5 text-xs font-semibold text-fg"
                        >
                          {formatDrug(id)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-fg/90">{collision.summary}</p>

                  <div className="rounded-lg bg-surface/70 border border-border/70 p-3 text-xs space-y-1.5 text-fg">
                    <p className="font-semibold text-fg flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-500" />
                      Hemodynamic &amp; Tubular Mechanics:
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted">{collision.pathophysiologyDetail}</p>
                    <div className="pt-1 text-[11px] font-medium text-fg">
                      <span className="font-semibold text-accent">Parameters to Monitor: </span>
                      {collision.monitoredParameters.join(" • ")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-bg-sunken/40 p-3.5 text-xs text-muted flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>No critical renal collisions detected among currently selected tray drugs.</span>
            </div>
            <span className="text-[11px] text-muted hidden sm:inline">Use 1-tap test loaders below to simulate collisions</span>
          </div>
        )}

        {/* 1-Tap Clinical Collision Test Loaders */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              1-Tap High-Yield Clinical Collisions &amp; Segment Presets:
            </span>
            <span className="text-[11px] text-muted">Loads directly into active desk tray</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleLoadPreset(["lisinopril", "furosemide", "ibuprofen"], "triple-whammy")}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                recentlyLoadedCollision === "triple-whammy"
                  ? "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30"
                  : "border-border bg-surface hover:border-rose-500/50 hover:bg-surface-2 text-fg",
              )}
            >
              <div>
                <span className="font-bold block text-rose-600 dark:text-rose-400">Triple Whammy</span>
                <span className="text-[11px] text-muted">Lisinopril + Furosemide + Ibuprofen</span>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleLoadPreset(["furosemide", "metolazone"], "sequential")}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                recentlyLoadedCollision === "sequential"
                  ? "border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500/30"
                  : "border-border bg-surface hover:border-cyan-500/50 hover:bg-surface-2 text-fg",
              )}
            >
              <div>
                <span className="font-bold block text-cyan-600 dark:text-cyan-400">Sequential Blockade</span>
                <span className="text-[11px] text-muted">Furosemide (TAL) + Metolazone (DCT)</span>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleLoadPreset(["lithium", "amiloride"], "lithium-amiloride")}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                recentlyLoadedCollision === "lithium-amiloride"
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                  : "border-border bg-surface hover:border-emerald-500/50 hover:bg-surface-2 text-fg",
              )}
            >
              <div>
                <span className="font-bold block text-emerald-600 dark:text-emerald-400">Lithium NDI + Amiloride</span>
                <span className="text-[11px] text-muted">Selective ENaC Blockade Rescue</span>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleLoadPreset(["losartan", "spironolactone"], "dual-raas")}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                recentlyLoadedCollision === "dual-raas"
                  ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30"
                  : "border-border bg-surface hover:border-amber-500/50 hover:bg-surface-2 text-fg",
              )}
            >
              <div>
                <span className="font-bold block text-amber-600 dark:text-amber-400">Dual RAAS Hyperkalemia</span>
                <span className="text-[11px] text-muted">Losartan + Spironolactone</span>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleLoadPreset(["empagliflozin", "torsemide"], "sglt2-loop")}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                recentlyLoadedCollision === "sglt2-loop"
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30"
                  : "border-border bg-surface hover:border-indigo-500/50 hover:bg-surface-2 text-fg",
              )}
            >
              <div>
                <span className="font-bold block text-indigo-600 dark:text-indigo-400">SGLT2 + Loop Diuretic</span>
                <span className="text-[11px] text-muted">Empagliflozin + Torsemide</span>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleLoadPreset(["acetazolamide"], "acetazolamide")}
              className={cn(
                "flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all",
                recentlyLoadedCollision === "acetazolamide"
                  ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/30"
                  : "border-border bg-surface hover:border-purple-500/50 hover:bg-surface-2 text-fg",
              )}
            >
              <div>
                <span className="font-bold block text-purple-600 dark:text-purple-400">Proximal CA Inhibition</span>
                <span className="text-[11px] text-muted">Acetazolamide (Bicarbonaturia)</span>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Navigation View Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab("diagram")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-xs sm:text-sm font-semibold transition-all",
            activeMainTab === "diagram"
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Droplets className="size-4 text-cyan-500" />
          <span>Nephron Schematic &amp; Segment Focus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("matrix")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-xs sm:text-sm font-semibold transition-all",
            activeMainTab === "matrix"
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Layers className="size-4 text-indigo-500" />
          <span>Diuretic Comparison Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("transporters")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-xs sm:text-sm font-semibold transition-all",
            activeMainTab === "transporters"
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Network className="size-4 text-emerald-500" />
          <span>All Transporters ({NEPHRON_TRANSPORTERS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("collisions")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-xs sm:text-sm font-semibold transition-all",
            activeMainTab === "collisions"
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Flame className="size-4 text-rose-500" />
          <span>High-Yield Collisions ({RENAL_COLLISIONS.length})</span>
        </button>
      </div>

      {/* 4. Tab 1: Interactive SVG Nephron Schematic & Segment Deep Dive */}
      {activeMainTab === "diagram" && (
        <div className="flex flex-col gap-6">
          {/* Segment Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {NEPHRON_SEGMENTS.map((seg) => {
              const isSelected = activeSegmentId === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setActiveSegmentId(seg.id)}
                  className={cn(
                    "flex min-h-[44px] flex-col justify-center rounded-xl border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500/20 shadow-sm"
                      : "border-border bg-surface text-fg hover:border-cyan-500/40 hover:bg-surface-2",
                  )}
                >
                  <span className="font-bold text-xs truncate">{seg.shortName}</span>
                  <span className="text-[10px] text-muted truncate">{seg.anatomicalZone}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive SVG Graphic */}
          <section className="rounded-2xl bg-surface border border-border p-4 sm:p-6 shadow-[var(--shadow-border)] flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-fg flex items-center gap-2">
                  <Droplets className="size-5 text-cyan-500" />
                  Interactive Nephron Segmental Architecture
                </h2>
                <p className="text-xs text-muted">
                  Click any segment in the diagram or above to inspect membrane transporters, ion gradients, and drug actions.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/20">
                  Focus: {activeSegment.name}
                </span>
              </div>
            </div>

            {/* SVG Diagram Canvas */}
            <div className="relative w-full overflow-hidden rounded-xl border border-border bg-bg-sunken/60 p-2 sm:p-4">
              <svg
                viewBox="0 0 920 460"
                className="w-full h-auto select-none"
                role="img"
                aria-label="Interactive schematic diagram of a renal nephron with 5 transport segments"
              >
                {/* Background anatomical zones */}
                <rect x="10" y="10" width="900" height="150" rx="8" fill="currentColor" className="text-surface/70" />
                <rect x="10" y="165" width="900" height="140" rx="8" fill="currentColor" className="text-surface-2/60" />
                <rect x="10" y="310" width="900" height="140" rx="8" fill="currentColor" className="text-surface/90" />

                {/* Zone Labels */}
                <text x="25" y="35" className="fill-muted text-[11px] font-bold tracking-wider uppercase">
                  Renal Cortex (Isosmotic / Diluting)
                </text>
                <text x="25" y="190" className="fill-muted text-[11px] font-bold tracking-wider uppercase">
                  Outer Medulla (Countercurrent Multiplier / +10 mV TAL)
                </text>
                <text x="25" y="335" className="fill-muted text-[11px] font-bold tracking-wider uppercase">
                  Inner Medulla &amp; Papilla (Hyperosmolar Interstitium / AQP2)
                </text>

                {/* 1. Glomerulus / Bowman's Capsule */}
                <g className="cursor-pointer" onClick={() => setActiveSegmentId("pct")}>
                  <circle cx="85" cy="85" r="32" className="fill-rose-500/15 stroke-rose-500/50" strokeWidth="2.5" />
                  {/* Capillary Tuft inside */}
                  <path
                    d="M 68 85 Q 85 65 102 85 Q 85 105 68 85 Z"
                    className="fill-rose-500/40 stroke-rose-600"
                    strokeWidth="1.5"
                  />
                  {/* Afferent & Efferent arterioles */}
                  <line x1="45" y1="65" x2="65" y2="75" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                  <line x1="45" y1="105" x2="65" y2="95" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                  <text x="85" y="130" textAnchor="middle" className="fill-fg text-[11px] font-bold">
                    Glomerulus
                  </text>
                  <text x="85" y="143" textAnchor="middle" className="fill-muted text-[9px]">
                    Afferent (PGE2) / Efferent (Ang II)
                  </text>
                </g>

                {/* Flow connection: Glomerulus to PCT */}
                <path d="M 117 85 L 145 85" fill="none" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />

                {/* 2. Segment 1: PCT (Convoluted cortical loops) */}
                <g
                  className="cursor-pointer transition-all"
                  onClick={() => setActiveSegmentId("pct")}
                >
                  <path
                    d="M 145 85 C 160 50, 180 50, 195 85 C 210 120, 230 120, 245 85 C 260 50, 280 50, 295 85 L 295 150"
                    fill="none"
                    stroke={activeSegmentId === "pct" ? "#06b6d4" : "#64748b"}
                    strokeWidth={activeSegmentId === "pct" ? "14" : "10"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all hover:stroke-cyan-400"
                  />
                  {/* Highlight pill */}
                  <rect
                    x="165"
                    y="25"
                    width="120"
                    height="28"
                    rx="6"
                    className={cn(
                      "transition-all",
                      activeSegmentId === "pct"
                        ? "fill-cyan-500 text-white"
                        : "fill-surface border border-border text-fg",
                    )}
                  />
                  <text
                    x="225"
                    y="43"
                    textAnchor="middle"
                    className={cn("text-[11px] font-bold", activeSegmentId === "pct" ? "fill-white" : "fill-fg")}
                  >
                    1. PCT (SGLT2 / CA IV)
                  </text>
                  <text x="225" y="145" textAnchor="middle" className="fill-cyan-600 dark:text-cyan-400 text-[10px] font-mono">
                    65% Na+ • AQP1 Isosmotic
                  </text>
                </g>

                {/* Descending Limb of Henle */}
                <path
                  d="M 295 150 L 295 390 C 295 420, 345 420, 345 390"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <text x="320" y="425" textAnchor="middle" className="fill-muted text-[10px]">
                  Hairpin (1200 mOsm)
                </text>

                {/* 3. Segment 2: TAL (Thick Ascending Limb) */}
                <g
                  className="cursor-pointer transition-all"
                  onClick={() => setActiveSegmentId("tal")}
                >
                  <path
                    d="M 345 390 L 345 120"
                    fill="none"
                    stroke={activeSegmentId === "tal" ? "#06b6d4" : "#3b82f6"}
                    strokeWidth={activeSegmentId === "tal" ? "16" : "12"}
                    strokeLinecap="round"
                    className="transition-all hover:stroke-cyan-400"
                  />
                  {/* +10 mV Voltage Indicator Badge */}
                  <rect
                    x="370"
                    y="215"
                    width="110"
                    height="48"
                    rx="8"
                    className={cn(
                      "transition-all",
                      activeSegmentId === "tal"
                        ? "fill-cyan-500/20 stroke-cyan-500"
                        : "fill-surface stroke-border",
                    )}
                    strokeWidth="1.5"
                  />
                  <text x="425" y="235" textAnchor="middle" className="fill-cyan-600 dark:fill-cyan-400 text-[11px] font-bold">
                    +10 mV Potential
                  </text>
                  <text x="425" y="252" textAnchor="middle" className="fill-muted text-[9px]">
                    ROMK K+ Leak &rarr; Ca/Mg
                  </text>

                  {/* TAL Label Pill */}
                  <rect
                    x="305"
                    y="170"
                    width="120"
                    height="28"
                    rx="6"
                    className={cn(
                      "transition-all",
                      activeSegmentId === "tal" ? "fill-cyan-500" : "fill-surface border border-border",
                    )}
                  />
                  <text
                    x="365"
                    y="188"
                    textAnchor="middle"
                    className={cn("text-[11px] font-bold", activeSegmentId === "tal" ? "fill-white" : "fill-fg")}
                  >
                    2. TAL (NKCC2)
                  </text>
                </g>

                {/* Macula Densa junction to DCT */}
                <path d="M 345 120 L 450 100" fill="none" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
                <circle cx="400" cy="110" r="5" className="fill-amber-500" />
                <text x="400" y="95" textAnchor="middle" className="fill-amber-600 dark:fill-amber-400 text-[9px] font-bold">
                  Macula Densa (TGF)
                </text>

                {/* 4. Segment 3: DCT (Distal Convoluted Tubule) */}
                <g
                  className="cursor-pointer transition-all"
                  onClick={() => setActiveSegmentId("dct")}
                >
                  <path
                    d="M 450 100 C 475 70, 505 70, 530 100 C 555 130, 580 130, 605 95"
                    fill="none"
                    stroke={activeSegmentId === "dct" ? "#06b6d4" : "#10b981"}
                    strokeWidth={activeSegmentId === "dct" ? "14" : "10"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all hover:stroke-cyan-400"
                  />
                  {/* DCT Pill */}
                  <rect
                    x="485"
                    y="35"
                    width="120"
                    height="28"
                    rx="6"
                    className={cn(
                      "transition-all",
                      activeSegmentId === "dct" ? "fill-cyan-500" : "fill-surface border border-border",
                    )}
                  />
                  <text
                    x="545"
                    y="53"
                    textAnchor="middle"
                    className={cn("text-[11px] font-bold", activeSegmentId === "dct" ? "fill-white" : "fill-fg")}
                  >
                    3. DCT (NCC / TRPV5)
                  </text>
                  <text x="545" y="150" textAnchor="middle" className="fill-emerald-600 dark:fill-emerald-400 text-[10px] font-mono">
                    5-7% Na+ • Hypocalciuric
                  </text>
                </g>

                {/* Connecting Tubule into Collecting Duct */}
                <path d="M 605 95 L 670 95" fill="none" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />

                {/* 5. Segment 4 & 5: Cortical & Medullary Collecting Duct */}
                <g
                  className="cursor-pointer transition-all"
                  onClick={() => setActiveSegmentId("ccd-principal")}
                >
                  {/* Collecting Duct Main Stem */}
                  <path
                    d="M 670 65 L 670 420"
                    fill="none"
                    stroke={
                      activeSegmentId === "ccd-principal" || activeSegmentId === "ccd-intercalated"
                        ? "#06b6d4"
                        : "#8b5cf6"
                    }
                    strokeWidth={
                      activeSegmentId === "ccd-principal" || activeSegmentId === "ccd-intercalated" ? "18" : "14"
                    }
                    strokeLinecap="round"
                    className="transition-all hover:stroke-cyan-400"
                  />

                  {/* Segment 4 Badge: Principal Cells */}
                  <g onClick={(e) => { e.stopPropagation(); setActiveSegmentId("ccd-principal"); }}>
                    <rect
                      x="700"
                      y="110"
                      width="190"
                      height="50"
                      rx="8"
                      className={cn(
                        "transition-all cursor-pointer",
                        activeSegmentId === "ccd-principal"
                          ? "fill-cyan-500/20 stroke-cyan-500"
                          : "fill-surface stroke-border",
                      )}
                      strokeWidth="1.5"
                    />
                    <text x="795" y="132" textAnchor="middle" className="fill-cyan-600 dark:fill-cyan-400 text-[11px] font-bold">
                      4. CCD Principal (ENaC / MR)
                    </text>
                    <text x="795" y="148" textAnchor="middle" className="fill-muted text-[9px]">
                      -10 to -35 mV &bull; ROMK K+ &bull; AQP2
                    </text>
                  </g>

                  {/* Segment 5 Badge: Intercalated Cells */}
                  <g onClick={(e) => { e.stopPropagation(); setActiveSegmentId("ccd-intercalated"); }}>
                    <rect
                      x="700"
                      y="230"
                      width="190"
                      height="50"
                      rx="8"
                      className={cn(
                        "transition-all cursor-pointer",
                        activeSegmentId === "ccd-intercalated"
                          ? "fill-cyan-500/20 stroke-cyan-500"
                          : "fill-surface stroke-border",
                      )}
                      strokeWidth="1.5"
                    />
                    <text x="795" y="252" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 text-[11px] font-bold">
                      5. CCD Intercalated (&alpha; &amp; &beta;)
                    </text>
                    <text x="795" y="268" textAnchor="middle" className="fill-muted text-[9px]">
                      H+-ATPase &bull; Pendrin Cl-/HCO3-
                    </text>
                  </g>
                </g>

                {/* Final Urine Exit */}
                <path d="M 670 420 L 670 445" fill="none" stroke="#06b6d4" strokeWidth="12" strokeLinecap="round" />
                <polygon points="660,442 680,442 670,455" fill="#06b6d4" />
                <text x="735" y="445" className="fill-cyan-600 dark:fill-cyan-400 text-[11px] font-bold">
                  Final Urine Acidification (pH &ge; 4.5)
                </text>
              </svg>
            </div>
          </section>

          {/* Segment Deep Dive Card */}
          <section className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 text-xs font-bold border border-cyan-500/20">
                    {activeSegment.shortName}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-fg">{activeSegment.name}</h2>
                </div>
                <p className="text-xs text-muted mt-1">
                  Location: <span className="text-fg font-medium">{activeSegment.anatomicalZone}</span> &bull; Transepithelial Potential:{" "}
                  <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                    {activeSegment.transepithelialPotential}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-surface-2 border border-border px-3 py-1.5 font-medium text-fg">
                  Fractional Na+ Uptake: <strong className="text-cyan-600 dark:text-cyan-400">{activeSegment.fractionalSodiumReabsorption}</strong>
                </span>
                <span className="rounded-lg bg-surface-2 border border-border px-3 py-1.5 font-medium text-fg">
                  Water Permeability: <strong className="text-fg">{activeSegment.waterPermeability}</strong>
                </span>
              </div>
            </div>

            {/* Key Physiology Mechanisms Bullet List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Core Segment Transport Physiology:</h3>
              <ul className="space-y-1.5 text-xs text-muted">
                {activeSegment.keyPhysiologicalMechanisms.map((mech, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="size-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{mech}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Membrane Transporters Switchboard */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-2">
                  <Network className="size-4 text-cyan-500" />
                  Active Solute Transporters in {activeSegment.shortName} ({segmentTransporters.length})
                </h3>

                {/* Membrane Filter Buttons */}
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setFilterMembrane("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      filterMembrane === "all" ? "bg-surface-2 text-fg font-bold" : "text-muted hover:text-fg",
                    )}
                  >
                    All Membranes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMembrane("apical")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      filterMembrane === "apical" ? "bg-surface-2 text-fg font-bold" : "text-muted hover:text-fg",
                    )}
                  >
                    Apical (Luminal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMembrane("basolateral")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      filterMembrane === "basolateral" ? "bg-surface-2 text-fg font-bold" : "text-muted hover:text-fg",
                    )}
                  >
                    Basolateral (Blood)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMembrane("paracellular")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      filterMembrane === "paracellular" ? "bg-surface-2 text-fg font-bold" : "text-muted hover:text-fg",
                    )}
                  >
                    Paracellular
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {segmentTransporters.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface-2 p-3.5 gap-2.5 transition-all hover:border-cyan-500/40"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                              t.membrane === "apical"
                                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                                : t.membrane === "basolateral"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
                            )}
                          >
                            {t.membrane}
                          </span>
                          <span className="font-bold text-sm text-fg">{t.name}</span>
                        </div>
                        <span className="font-mono text-xs text-muted">{t.gene}</span>
                      </div>

                      <div className="mt-2 text-xs space-y-1">
                        <p className="text-muted">
                          <strong className="text-fg">Solutes: </strong>
                          <span className="font-mono text-cyan-600 dark:text-cyan-400">{t.solutes.join(", ")}</span> &bull;{" "}
                          <strong className="text-fg">Direction: </strong>
                          <span className="capitalize">{t.direction}</span>
                        </p>
                        <p className="text-muted">
                          <strong className="text-fg">Driving Force: </strong>
                          {t.drivingForce}
                        </p>
                        <p className="text-muted text-[11px] leading-relaxed pt-1">
                          {t.clinicalRelevance}
                        </p>
                      </div>
                    </div>

                    {t.inhibitedByDrugIds.length > 0 && (
                      <div className="border-t border-border/60 pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase text-muted">Inhibitors:</span>
                        {t.inhibitedByDrugIds.map((drugId) => {
                          const isSelected = selected.includes(drugId) || (drugId === "hydrochlorothiazide" && selected.includes("hctz"));
                          return (
                            <button
                              key={drugId}
                              type="button"
                              onClick={() => handleAddSingleDrug(drugId === "hydrochlorothiazide" ? "hctz" : drugId)}
                              title={isSelected ? "Already on Desk" : "Add to Desk"}
                              className={cn(
                                "inline-flex min-h-[38px] items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
                                isSelected
                                  ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                                  : "bg-surface border border-border text-fg hover:border-cyan-500/40 hover:bg-surface-2",
                              )}
                            >
                              <span>{formatDrug(drugId)}</span>
                              {isSelected ? (
                                <Check className="size-3 text-cyan-500" />
                              ) : (
                                <Plus className="size-3 text-muted" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pharmacological Targets in Segment */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-2">
                <Flame className="size-4 text-rose-500" />
                Pharmacological Drug Classes &amp; Electrolyte Responses in {activeSegment.shortName}
              </h3>

              <div className="space-y-3">
                {activeSegment.pharmacologicalTargets.map((target, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-fg">{target.drugClass}</h4>
                        <span className="text-xs text-muted">Molecular Target: {target.targetMolecule}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {target.representativeDrugIds.map((id) => (
                          <span
                            key={id}
                            className="rounded bg-surface border border-border px-2 py-0.5 text-xs font-semibold text-fg"
                          >
                            {formatDrug(id)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-muted">{target.mechanismSummary}</p>

                    {/* Electrolyte Impact Matrix Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Sodium (Na+)</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.sodium}</span>
                      </div>
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Potassium (K+)</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.potassium}</span>
                      </div>
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Calcium (Ca2+)</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.calcium}</span>
                      </div>
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Magnesium (Mg2+)</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.magnesium}</span>
                      </div>
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Chloride (Cl-)</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.chloride}</span>
                      </div>
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Acid-Base</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.bicarbonateAndAcidBase}</span>
                      </div>
                      <div className="rounded-lg bg-surface border border-border p-2 text-center">
                        <span className="block font-bold text-muted uppercase text-[9px]">Urine pH</span>
                        <span className="font-semibold text-fg">{target.electrolyteConsequences.urinePh}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted pt-1">
                      <span className="font-semibold text-fg">Monitored Parameters: </span>
                      {target.monitoredParameters.join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Pearls */}
            <div className="rounded-xl border border-border bg-bg-sunken/40 p-3.5 space-y-1.5 text-xs">
              <span className="font-bold text-fg flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-accent" />
                High-Yield Segmental Pearls:
              </span>
              <ul className="space-y-1 text-muted text-[11px]">
                {activeSegment.clinicalPearls.map((pearl, idx) => (
                  <li key={idx} className="leading-relaxed">
                    &bull; {pearl}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* 5. Tab 2: Diuretic Comparison Matrix */}
      {activeMainTab === "matrix" && (
        <section className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Layers className="size-5 text-indigo-500" />
              Diuretic &amp; Tubular Modulator Comparison Matrix
            </h2>
            <p className="text-xs text-muted">
              Side-by-side comparison of all 7 diuretic and tubular classes across calcium, magnesium, potassium, and acid-base handling.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-fg font-semibold">
                  <th className="p-3">Class &amp; Segment</th>
                  <th className="p-3">Target &amp; Excretion</th>
                  <th className="p-3">Calcium (Ca2+)</th>
                  <th className="p-3">Magnesium (Mg2+)</th>
                  <th className="p-3">Potassium (K+)</th>
                  <th className="p-3">Acid-Base / Urine pH</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {DIURETIC_CLASS_PROFILES.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="p-3 font-medium">
                        <span className="font-bold text-fg block">{p.className}</span>
                        <span className="text-[11px] text-muted">{p.tubularSite}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.representativeDrugIds.map((id) => (
                            <span key={id} className="rounded bg-surface border px-1.5 py-0.2 text-[10px] text-muted">
                              {formatDrug(id)}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="text-fg font-medium block">{p.molecularTarget}</span>
                        <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                          FE_Na: {p.fractionalSodiumExcretion}
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={cn(
                            "font-bold block",
                            p.calciumEffect.includes("Hypercalciuria")
                              ? "text-rose-600 dark:text-rose-400"
                              : p.calciumEffect.includes("Hypocalciuria")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-fg",
                          )}
                        >
                          {p.calciumEffect}
                        </span>
                        <span className="text-[10px] text-muted block leading-tight">{p.calciumMechanism}</span>
                      </td>

                      <td className="p-3">
                        <span
                          className={cn(
                            "font-bold block",
                            p.magnesiumEffect.includes("Marked")
                              ? "text-rose-600 dark:text-rose-400"
                              : p.magnesiumEffect.includes("Sparing")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-fg",
                          )}
                        >
                          {p.magnesiumEffect}
                        </span>
                        <span className="text-[10px] text-muted block leading-tight">{p.magnesiumMechanism}</span>
                      </td>

                      <td className="p-3">
                        <span
                          className={cn(
                            "font-bold block",
                            p.potassiumEffect.includes("Wasting")
                              ? "text-amber-600 dark:text-amber-400"
                              : p.potassiumEffect.includes("Sparing")
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-fg",
                          )}
                        >
                          {p.potassiumEffect}
                        </span>
                        <span className="text-[10px] text-muted block leading-tight">{p.potassiumMechanism}</span>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-fg block">{p.acidBaseEffect}</span>
                        <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">{p.urinePhEffect}</span>
                      </td>

                      <td className="p-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="min-h-[38px] text-xs whitespace-nowrap"
                          onClick={() => handleLoadPreset(p.representativeDrugIds, p.id)}
                        >
                          Load Class
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Tab 3: All Transporters Reference */}
      {activeMainTab === "transporters" && (
        <section className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] space-y-4">
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Network className="size-5 text-emerald-500" />
              Complete Nephron Solute Carrier &amp; Transporter Switchboard ({NEPHRON_TRANSPORTERS.length})
            </h2>
            <p className="text-xs text-muted">
              Reference catalog of apical, basolateral, and paracellular solute transporters across all 5 nephron segments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NEPHRON_TRANSPORTERS.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-surface-2 p-4 space-y-2.5 transition-all hover:border-emerald-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold uppercase">
                      {t.segmentId.toUpperCase()} &bull; {t.membrane}
                    </span>
                    <h3 className="font-bold text-sm text-fg">{t.name}</h3>
                  </div>
                  <span className="font-mono text-xs text-muted">{t.gene}</span>
                </div>

                <p className="text-xs text-muted leading-relaxed">{t.physiologicalRole}</p>

                <div className="text-xs space-y-1 bg-surface border border-border/80 rounded-lg p-2.5">
                  <p>
                    <strong className="text-fg">Stoichiometry: </strong>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">{t.stoichiometry}</span>
                  </p>
                  <p>
                    <strong className="text-fg">Electrochemical Driving Force: </strong>
                    <span className="text-muted">{t.drivingForce}</span>
                  </p>
                </div>

                {t.inhibitedByDrugIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase text-muted">Inhibitors:</span>
                    {t.inhibitedByDrugIds.map((id) => (
                      <span key={id} className="rounded bg-surface border px-2 py-0.5 text-xs font-semibold text-fg">
                        {formatDrug(id)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Tab 4: High-Yield Collisions Deep Dive */}
      {activeMainTab === "collisions" && (
        <section className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Flame className="size-5 text-rose-500" />
              High-Yield Nephrology &amp; Diuretic Pharmacodynamic Collisions ({RENAL_COLLISIONS.length})
            </h2>
            <p className="text-xs text-muted">
              Biophysical collision models, afferent/efferent hemodynamics, and physiological mitigation strategies.
            </p>
          </div>

          <div className="space-y-4">
            {RENAL_COLLISIONS.map((col) => {
              const isCritical = col.severity === "critical";
              const isSynergistic = col.severity === "synergistic-clinical";

              return (
                <div
                  key={col.id}
                  className="rounded-xl border border-border bg-surface-2 p-4 sm:p-5 space-y-3.5 transition-all hover:border-cyan-500/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                          isCritical
                            ? "bg-rose-500/20 text-rose-600 dark:text-rose-300"
                            : isSynergistic
                              ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-300",
                        )}
                      >
                        {col.severity}
                      </span>
                      <h3 className="font-bold text-base text-fg">{col.title}</h3>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[38px] text-xs self-start sm:self-auto"
                      onClick={() => handleLoadPreset(col.interactingDrugIds.slice(0, 3), col.id)}
                    >
                      Load Sample into Tray
                    </Button>
                  </div>

                  <p className="text-xs leading-relaxed text-fg/90">{col.summary}</p>

                  {/* Hemodynamic & Tubular breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {col.mechanismsInvolved.afferentArteriole && (
                      <div className="rounded-lg bg-surface border border-border p-3">
                        <strong className="text-rose-600 dark:text-rose-400 block mb-1">Afferent Arteriole:</strong>
                        <p className="text-muted leading-relaxed">{col.mechanismsInvolved.afferentArteriole}</p>
                      </div>
                    )}
                    {col.mechanismsInvolved.efferentArteriole && (
                      <div className="rounded-lg bg-surface border border-border p-3">
                        <strong className="text-blue-600 dark:text-blue-400 block mb-1">Efferent Arteriole:</strong>
                        <p className="text-muted leading-relaxed">{col.mechanismsInvolved.efferentArteriole}</p>
                      </div>
                    )}
                    <div className="rounded-lg bg-surface border border-border p-3">
                      <strong className="text-cyan-600 dark:text-cyan-400 block mb-1">Tubular Transport:</strong>
                      <p className="text-muted leading-relaxed">{col.mechanismsInvolved.tubularTransport}</p>
                    </div>
                    <div className="rounded-lg bg-surface border border-border p-3">
                      <strong className="text-purple-600 dark:text-purple-400 block mb-1">Hormonal &amp; Hemodynamic Result:</strong>
                      <p className="text-muted leading-relaxed">{col.mechanismsInvolved.hemodynamicConsequence}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface border border-border p-3 text-xs space-y-1.5">
                    <p className="font-semibold text-fg">Pathophysiology Deep Dive:</p>
                    <p className="text-muted leading-relaxed">{col.pathophysiologyDetail}</p>
                    <p className="pt-1 text-[11px] text-fg">
                      <strong className="text-accent">Mitigation Physiology: </strong>
                      {col.mitigationPhysiology}
                    </p>
                    <div className="pt-1 text-[11px] text-muted">
                      <strong>Literature Reference: </strong>
                      <span className="italic">{col.literatureCitation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Literature & Evidence Citations */}
      <footer className="rounded-2xl bg-surface border border-border p-5 text-xs text-muted space-y-2">
        <h3 className="font-bold text-fg uppercase tracking-wider text-[11px]">
          Peer-Reviewed Nephrology &amp; Pharmacology Literature Citations
        </h3>
        <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
          {RENAL_MECHANISMS_CITATIONS.map((cite, idx) => (
            <li key={idx}>{cite}</li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
