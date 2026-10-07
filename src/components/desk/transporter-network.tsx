import React, { useMemo, useState } from "react";
import {
  TRANSPORTERS,
  BARRIER_ARCHITECTURES,
  TRANSPORTER_REGULATORY_DISCLAIMER,
  getTransporterById,
  getBarrierById,
  type BarrierId,
  type TransporterInfo,
  type TransporterCollision,
} from "@/lib/drugs/transporter-network";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
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

type ActiveTab = BarrierId | "all";

export function TransporterNetwork() {
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const add = useDesk((s) => s.add);

  const [activeTab, setActiveTab] = useState<ActiveTab>("bbb");
  const [selectedTransporterId, setSelectedTransporterId] = useState<string>("pgp-abcb1");
  const [recentlyLoadedCollision, setRecentlyLoadedCollision] = useState<string | null>(null);

  // Active inspected transporter
  const activeTransporter: TransporterInfo = useMemo(() => {
    return getTransporterById(selectedTransporterId) ?? TRANSPORTERS[0];
  }, [selectedTransporterId]);

  // Active barrier if not 'all'
  const activeBarrier = useMemo(() => {
    if (activeTab === "all") return null;
    return getBarrierById(activeTab);
  }, [activeTab]);

  // Check which currently selected drugs overlap with any transporter
  const deskOverlap = useMemo(() => {
    if (!selected.length) return [];
    const overlaps: Array<{
      drugId: string;
      drugName: string;
      roles: Array<{ transporter: TransporterInfo; kind: "Substrate" | "Inhibitor" | "Inducer" }>;
    }> = [];

    for (const drugId of selected) {
      const drugName = DRUG_BY_ID[drugId]?.name ?? drugId;
      const roles: Array<{ transporter: TransporterInfo; kind: "Substrate" | "Inhibitor" | "Inducer" }> = [];

      for (const t of TRANSPORTERS) {
        if (t.substrates.includes(drugId)) {
          roles.push({ transporter: t, kind: "Substrate" });
        }
        if (t.inhibitors.includes(drugId)) {
          roles.push({ transporter: t, kind: "Inhibitor" });
        }
        if (t.inducers.includes(drugId)) {
          roles.push({ transporter: t, kind: "Inducer" });
        }
      }

      if (roles.length > 0) {
        overlaps.push({ drugId, drugName, roles });
      }
    }

    return overlaps;
  }, [selected]);

  function handleLoadCollision(collision: TransporterCollision) {
    useDesk.getState().load(collision.drugPair);
    setRecentlyLoadedCollision(collision.id);
    setTimeout(() => {
      setRecentlyLoadedCollision(null);
    }, 2800);
  }

  function handleAddSingleDrug(drugId: string) {
    add(drugId);
  }

  function formatDrug(id: string) {
    return DRUG_BY_ID[id]?.name ?? id;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Network className="size-5" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                Pharmacokinetics & Transmembrane Clearance
              </p>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Transmembrane Transporter & Barrier Network
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Explore ABC efflux pumps and SLC solute carrier influx gateways across physiological
              barriers, directional transport topologies, and high-yield clinical collisions.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-fg">
              <ShieldCheck className="size-3.5 text-accent" />
              FD&C Act § 520(o)(1)(E) Decision Support
            </span>
          </div>
        </div>

        {/* Desk Overlap Alert */}
        {deskOverlap.length > 0 && (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent-soft/30 p-3 sm:p-4">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Active Desk Transporter Overlap ({deskOverlap.length} {deskOverlap.length === 1 ? "drug" : "drugs"})
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {deskOverlap.map((item) => (
                    <div
                      key={item.drugId}
                      className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-surface px-2.5 py-1 text-xs font-medium text-fg shadow-xs"
                    >
                      <span className="font-semibold">{item.drugName}</span>
                      <span className="text-[11px] text-muted">
                        ({item.roles.map((r) => `${r.transporter.gene} ${r.kind}`).join(", ")})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Barrier Selector Tabs */}
      <section aria-label="Barrier Selection Tabs" className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Physiological Barrier Architecture
          </p>
          <span className="text-xs text-muted">Select an organ barrier or view all transporters</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bbb"}
            onClick={() => {
              setActiveTab("bbb");
              setSelectedTransporterId("pgp-abcb1");
            }}
            className={cn(
              "flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              activeTab === "bbb"
                ? "border-accent bg-accent/10 text-accent shadow-xs"
                : "border-border bg-surface text-fg hover:bg-surface-2",
            )}
          >
            <Shield className="size-4 shrink-0 text-rose-500" />
            <div className="min-w-0">
              <p className="truncate font-semibold">Blood-Brain Barrier</p>
              <p className="truncate text-[11px] text-muted">BBB Capillary Endothelia</p>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "intestinal"}
            onClick={() => {
              setActiveTab("intestinal");
              setSelectedTransporterId("pgp-abcb1");
            }}
            className={cn(
              "flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              activeTab === "intestinal"
                ? "border-accent bg-accent/10 text-accent shadow-xs"
                : "border-border bg-surface text-fg hover:bg-surface-2",
            )}
          >
            <Layers className="size-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="truncate font-semibold">Intestinal Epithelium</p>
              <p className="truncate text-[11px] text-muted">Mucosal Absorption Gate</p>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "hepatic"}
            onClick={() => {
              setActiveTab("hepatic");
              setSelectedTransporterId("oatp1b1-1b3-slco");
            }}
            className={cn(
              "flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              activeTab === "hepatic"
                ? "border-accent bg-accent/10 text-accent shadow-xs"
                : "border-border bg-surface text-fg hover:bg-surface-2",
            )}
          >
            <Activity className="size-4 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="truncate font-semibold">Hepatic Sinusoid & Canaliculus</p>
              <p className="truncate text-[11px] text-muted">Hepatobiliary Clearance</p>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "renal"}
            onClick={() => {
              setActiveTab("renal");
              setSelectedTransporterId("oat1-oat3-slc22");
            }}
            className={cn(
              "flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              activeTab === "renal"
                ? "border-accent bg-accent/10 text-accent shadow-xs"
                : "border-border bg-surface text-fg hover:bg-surface-2",
            )}
          >
            <Flame className="size-4 shrink-0 text-sky-500" />
            <div className="min-w-0">
              <p className="truncate font-semibold">Renal Proximal Tubule</p>
              <p className="truncate text-[11px] text-muted">Active Tubular Secretion</p>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              activeTab === "all"
                ? "border-accent bg-accent/10 text-accent shadow-xs"
                : "border-border bg-surface text-fg hover:bg-surface-2",
            )}
          >
            <Network className="size-4 shrink-0 text-violet-500" />
            <div className="min-w-0">
              <p className="truncate font-semibold">All Transporters</p>
              <p className="truncate text-[11px] text-muted">Matrix & Families</p>
            </div>
          </button>
        </div>
      </section>

      {/* Barrier Architecture Visual Diagram (Shown when a specific barrier is active) */}
      {activeBarrier && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                  {activeBarrier.badge}
                </span>
                <span className="text-xs text-muted">• {activeBarrier.organ}</span>
              </div>
              <h2 className="mt-1 font-serif text-xl font-bold text-fg sm:text-2xl">
                {activeBarrier.name} Directional Vector Topology
              </h2>
            </div>
            <p className="max-w-md text-xs text-muted sm:text-right">
              {activeBarrier.cellularCompartment}
            </p>
          </div>

          {/* Visual Schematic Diagram */}
          <div className="mt-6 space-y-4">
            {/* Top Compartment: Apical / Luminal Environment */}
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                    APICAL / LUMINAL
                  </span>
                  <span className="text-sm font-semibold text-fg">
                    {activeBarrier.apicalSideLabel}
                  </span>
                </div>
                <span className="text-xs text-muted hidden sm:inline">
                  {activeBarrier.apicalSideDescription}
                </span>
              </div>
            </div>

            {/* The Tight Junction & Membrane Core */}
            <div className="relative rounded-xl border-2 border-dashed border-border bg-surface-2/60 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between text-xs text-muted">
                <span className="font-mono uppercase tracking-wider text-[11px]">
                  Intracellular Epithelial/Endothelial Space
                </span>
                <span className="font-mono text-[11px]">Tight Junction Barrier</span>
              </div>

              {/* Transporter Nodes Grid inside Membrane */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeBarrier.transporterNodes.map((node) => {
                  const isSelected = selectedTransporterId === node.transporterId;
                  const isEfflux = node.direction === "efflux";

                  return (
                    <button
                      key={node.transporterId + node.membrane}
                      type="button"
                      onClick={() => setSelectedTransporterId(node.transporterId)}
                      className={cn(
                        "group relative flex min-h-[44px] flex-col justify-between rounded-lg border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        isSelected
                          ? "border-accent bg-surface ring-2 ring-accent/30 shadow-md"
                          : "border-border bg-surface hover:border-accent/50 hover:bg-surface",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                              isEfflux
                                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {isEfflux ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                          </span>
                          <div>
                            <p className="font-semibold text-sm text-fg group-hover:text-accent">
                              {node.name}
                            </p>
                            <span className="font-mono text-[10px] uppercase text-muted">
                              {node.gene} • {node.membrane}
                            </span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            isEfflux
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {node.direction}
                        </span>
                      </div>

                      <div className="mt-3 border-t border-border/60 pt-2 text-xs">
                        <p className="font-medium text-fg/90">{node.vectorLabel}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          {node.mechanismNote}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-accent">
                          <span>Active in Inspector below</span>
                          <ChevronRight className="size-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Compartment: Basolateral / Blood Space */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    BASOLATERAL / SANGUINEOUS
                  </span>
                  <span className="text-sm font-semibold text-fg">
                    {activeBarrier.basolateralSideLabel}
                  </span>
                </div>
                <span className="text-xs text-muted hidden sm:inline">
                  {activeBarrier.basolateralSideDescription}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Takeaway Callout */}
          <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3.5 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <p className="font-semibold text-fg">Clinical Barrier Architecture Takeaway</p>
                <p className="mt-0.5 leading-relaxed text-muted">
                  {activeBarrier.clinicalTakeaway}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Transporter Quick Selector Tabs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Transporter Family Inspector
          </p>
          <span className="text-xs text-muted">Click a transporter to inspect kinetics & collisions</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {TRANSPORTERS.map((t) => {
            const isSelected = selectedTransporterId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTransporterId(t.id)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isSelected
                    ? "border-accent bg-accent text-accent-fg shadow-sm"
                    : "border-border bg-surface text-fg hover:bg-surface-2",
                )}
              >
                <span className="font-bold">{t.gene}</span>
                <span className="opacity-90">({t.name.split("/")[0].trim()})</span>
                <span
                  className={cn(
                    "ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    isSelected
                      ? "bg-black/20 text-accent-fg"
                      : t.family === "ABC Efflux"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {t.family}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Transporter Inspector Card */}
      <section className="space-y-6 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        {/* Card Header */}
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                {activeTransporter.gene}
              </span>
              <span
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-bold uppercase",
                  activeTransporter.family === "ABC Efflux"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                )}
              >
                {activeTransporter.family} • {activeTransporter.atpDependent ? "ATP-Driven Efflux" : "Facilitated/Secondary Influx"}
              </span>
              <span className="text-xs text-muted">
                {activeTransporter.iupharClassification}
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-fg">
              {activeTransporter.name}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Aliases: {activeTransporter.aliases.join(", ")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-xs">
            <p className="font-semibold text-fg">Regulatory Classification</p>
            <p className="text-muted">{activeTransporter.fdaClassification}</p>
          </div>
        </div>

        {/* Physiological Role & Mechanism */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-accent" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg">
                Physiological & Barrier Function
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {activeTransporter.physiologicalRole}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-accent" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg">
                Primary Anatomical Expressions
              </h3>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              {activeTransporter.primaryLocations.map((loc, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{loc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Substrates, Inhibitors, and Inducers Triad */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Substrates */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Substrates ({activeTransporter.substrates.length})
              </span>
              <span className="text-[11px] text-muted">Transported Cargo</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Molecules actively translocated across membrane barriers by this protein:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeTransporter.substrates.map((drugId) => {
                const isSelected = selected.includes(drugId);
                return (
                  <button
                    key={drugId}
                    type="button"
                    onClick={() => handleAddSingleDrug(drugId)}
                    title={isSelected ? "Already on Desk" : "Click to add to Desk"}
                    className={cn(
                      "group inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      isSelected
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface text-fg hover:border-accent/40 hover:bg-surface-2",
                    )}
                  >
                    <span>{formatDrug(drugId)}</span>
                    {isSelected ? (
                      <Check className="size-3 text-accent" />
                    ) : (
                      <Plus className="size-3 text-muted group-hover:text-fg" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inhibitors */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Inhibitors ({activeTransporter.inhibitors.length})
              </span>
              <span className="text-[11px] text-muted">Transport Blockers</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Perpetrator agents that competitive or allosteric bind to arrest transport:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeTransporter.inhibitors.map((drugId) => {
                const isSelected = selected.includes(drugId);
                return (
                  <button
                    key={drugId}
                    type="button"
                    onClick={() => handleAddSingleDrug(drugId)}
                    title={isSelected ? "Already on Desk" : "Click to add to Desk"}
                    className={cn(
                      "group inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      isSelected
                        ? "border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "border-border bg-surface text-fg hover:border-rose-500/40 hover:bg-surface-2",
                    )}
                  >
                    <span>{formatDrug(drugId)}</span>
                    {isSelected ? (
                      <Check className="size-3 text-rose-500" />
                    ) : (
                      <Plus className="size-3 text-muted group-hover:text-fg" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Probe/Investigational Compounds if any */}
            {activeTransporter.probeOrInvestigationalInhibitors &&
              activeTransporter.probeOrInvestigationalInhibitors.length > 0 && (
                <div className="mt-4 border-t border-border/70 pt-2.5">
                  <span className="text-[10px] font-semibold uppercase text-muted">
                    Investigational & Probe Inhibitors
                  </span>
                  <div className="mt-1 space-y-1">
                    {activeTransporter.probeOrInvestigationalInhibitors.map((probe, idx) => (
                      <p key={idx} className="text-[11px] text-muted">
                        • {probe}
                      </p>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Inducers */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Inducers ({activeTransporter.inducers.length})
              </span>
              <span className="text-[11px] text-muted">Expression Accelerators</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              PXR/CAR nuclear receptor ligands that upregulate pump gene transcription:
            </p>
            {activeTransporter.inducers.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeTransporter.inducers.map((drugId) => {
                  const isSelected = selected.includes(drugId);
                  return (
                    <button
                      key={drugId}
                      type="button"
                      onClick={() => handleAddSingleDrug(drugId)}
                      title={isSelected ? "Already on Desk" : "Click to add to Desk"}
                      className={cn(
                        "group inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        isSelected
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "border-border bg-surface text-fg hover:border-amber-500/40 hover:bg-surface-2",
                      )}
                    >
                      <span>{formatDrug(drugId)}</span>
                      {isSelected ? (
                        <Check className="size-3 text-amber-500" />
                      ) : (
                        <Plus className="size-3 text-muted group-hover:text-fg" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-border p-3 text-center text-xs text-muted">
                No clinically established transcriptional inducers for this transporter family.
              </div>
            )}
          </div>
        </div>

        {/* High-Yield Clinical Collisions */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h3 className="font-serif text-lg font-bold text-fg">
                High-Yield Clinical Collisions ({activeTransporter.clinicalCollisions.length})
              </h3>
              <p className="text-xs text-muted">
                Critical pharmacological drug interactions governed by {activeTransporter.gene} transport arrest.
              </p>
            </div>
            <span className="text-xs text-muted">1-Tap Load on Desk</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeTransporter.clinicalCollisions.map((collision) => {
              const isLoaded =
                recentlyLoadedCollision === collision.id ||
                collision.drugPair.every((id) => selected.includes(id));

              return (
                <div
                  key={collision.id}
                  className="flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-4 transition-all duration-150 hover:border-accent/40"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                            collision.severity === "critical"
                              ? "bg-danger-soft text-danger"
                              : collision.severity === "high"
                                ? "bg-warn-soft text-warn"
                                : "bg-info-soft text-info",
                          )}
                        >
                          {collision.severity} Severity
                        </span>
                        <div className="flex items-center gap-1 text-xs font-semibold text-fg">
                          <span>{formatDrug(collision.drugPair[0])}</span>
                          <span className="text-muted">+</span>
                          <span>{formatDrug(collision.drugPair[1])}</span>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-sm text-fg">
                      {collision.title}
                    </h4>

                    <p className="text-xs leading-relaxed text-muted">
                      {collision.description}
                    </p>

                    <div className="rounded-md border border-danger/20 bg-danger-soft/20 p-2.5 text-xs">
                      <p className="font-semibold text-danger">Hazard Alert:</p>
                      <p className="text-fg/90">{collision.hazard}</p>
                    </div>

                    <p className="text-[11px] text-muted italic">
                      {collision.literatureCitation}
                    </p>
                  </div>

                  {/* 1-Tap Load Collision Button */}
                  <div className="mt-4 pt-2">
                    <Button
                      type="button"
                      variant={isLoaded ? "secondary" : "default"}
                      size="default"
                      onClick={() => handleLoadCollision(collision)}
                      className="w-full min-h-[44px] justify-center text-xs font-semibold"
                    >
                      {isLoaded ? (
                        <>
                          <Check className="size-4 text-ok" />
                          <span>Active on Desk ({formatDrug(collision.drugPair[0])} + {formatDrug(collision.drugPair[1])})</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-4" />
                          <span>Load Collision on Desk</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Citations Box */}
        <div className="rounded-lg border border-border bg-surface p-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-fg">
            <BookOpen className="size-4 text-accent" />
            <span>Peer-Reviewed Citations & Transporter Pharmacokinetics Literature</span>
          </div>
          <ul className="mt-2 space-y-1 text-muted">
            {activeTransporter.citations.map((cite, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span>{cite}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparative Matrix (Shown when 'All Transporters' tab is selected) */}
      {activeTab === "all" && (
        <section className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
          <div className="border-b border-border pb-3">
            <h3 className="font-serif text-xl font-bold text-fg">
              Comprehensive Transporter Comparative Matrix
            </h3>
            <p className="text-xs text-muted">
              Side-by-side comparison of the 5 major clinical transporter families.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-fg">
                  <th className="p-3 font-semibold">Gene / Name</th>
                  <th className="p-3 font-semibold">Family</th>
                  <th className="p-3 font-semibold">Membrane Polarity</th>
                  <th className="p-3 font-semibold">Key Substrates</th>
                  <th className="p-3 font-semibold">Key Inhibitors</th>
                  <th className="p-3 font-semibold">High-Yield Hazard</th>
                  <th className="p-3 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TRANSPORTERS.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="p-3 font-semibold">
                      <p className="text-fg">{t.gene}</p>
                      <p className="text-[11px] text-muted">{t.name.split("/")[0].trim()}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                          t.family === "ABC Efflux"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {t.family}
                      </span>
                    </td>
                    <td className="p-3 text-muted">
                      {t.membraneVectors.map((v) => `${v.membrane} ${v.direction}`).slice(0, 2).join(", ")}
                    </td>
                    <td className="p-3 text-muted">
                      {t.substrates.slice(0, 3).map(formatDrug).join(", ")}
                    </td>
                    <td className="p-3 text-muted">
                      {t.inhibitors.slice(0, 3).map(formatDrug).join(", ")}
                    </td>
                    <td className="p-3 text-muted max-w-[200px]">
                      {t.clinicalCollisions[0]?.hazard.slice(0, 75)}...
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedTransporterId(t.id)}
                        className="min-h-[44px] min-w-[44px] text-xs"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Regulatory Notice Banner */}
      <footer className="rounded-xl border border-border bg-surface-2/70 p-4 text-xs text-muted shadow-xs sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent" />
          <div className="space-y-1">
            <p className="font-semibold text-fg">
              FD&C Act § 520(o)(1)(E) Clinical Decision Support & Pharmacokinetics Disclaimer
            </p>
            <p className="leading-relaxed">
              {TRANSPORTER_REGULATORY_DISCLAIMER}
            </p>
            <p className="pt-1 text-[11px] text-muted">
              Source taxonomy: IUPHAR/BPS Guide to PHARMACOLOGY Transporter Database; U.S. Food & Drug Administration (FDA) Clinical Drug Interaction Studies Guidance for Industry (2020); International Transporter Consortium (ITC) White Papers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
