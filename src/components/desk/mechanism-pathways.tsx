import React, { useMemo, useState } from "react";
import {
  MECHANISM_PATHWAYS,
  REGULATORY_NOTICE,
  type MechanismPathway,
  type PathwayNode,
  type PathwayNodeType,
  type PathwayDrugTarget,
} from "@/lib/drugs/mechanism-pathways";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import {
  Activity,
  Layers,
  ShieldAlert,
  Plus,
  Check,
  ChevronRight,
  BookOpen,
  Sparkles,
  Zap,
  Info,
  Search,
  ExternalLink,
  ArrowRight,
  Filter,
} from "lucide-react";

export interface MechanismPathwaysProps {
  initialPathwayId?: string;
  onSelectDrug?: (drugId: string) => void;
}

const TYPE_CONFIG: Record<
  PathwayNodeType,
  { label: string; badgeClass: string; borderClass: string }
> = {
  enzyme: {
    label: "Enzyme",
    badgeClass: "bg-warn-soft text-warn border-warn/30",
    borderClass: "border-warn/40",
  },
  receptor: {
    label: "Receptor",
    badgeClass: "bg-accent-soft text-accent border-accent/30",
    borderClass: "border-accent/40",
  },
  transporter: {
    label: "Transporter",
    badgeClass: "bg-info-soft text-info border-info/30",
    borderClass: "border-info/40",
  },
  "ion-channel": {
    label: "Ion Channel",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
    borderClass: "border-purple-300 dark:border-purple-800/60",
  },
  messenger: {
    label: "Messenger / Substrate",
    badgeClass: "bg-ok-soft text-ok border-ok/30",
    borderClass: "border-ok/40",
  },
  effector: {
    label: "Effector Axis",
    badgeClass: "bg-danger-soft text-danger border-danger/30",
    borderClass: "border-danger/40",
  },
};

export function MechanismPathways({
  initialPathwayId = "raas-nephron",
  onSelectDrug,
}: MechanismPathwaysProps = {}) {
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>(initialPathwayId);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadedNotice, setLoadedNotice] = useState<string | null>(null);

  // Desk store integration
  const deskSelected = useDesk((s) => s.selected);
  const deskLoad = useDesk((s) => s.load);
  const deskAdd = useDesk((s) => s.add);
  const deskRemove = useDesk((s) => s.remove);
  const deskSetView = useDesk((s) => s.setView);

  const selectedSet = useMemo(() => new Set(deskSelected), [deskSelected]);

  const currentPathway = useMemo(() => {
    return (
      MECHANISM_PATHWAYS.find((p) => p.id === selectedPathwayId) ??
      MECHANISM_PATHWAYS[0]
    );
  }, [selectedPathwayId]);

  // If active node is not set or not in current pathway, default to first node
  const activeNode = useMemo(() => {
    if (activeNodeId) {
      const match = currentPathway.nodes.find((n) => n.id === activeNodeId);
      if (match) return match;
    }
    return currentPathway.nodes[0] ?? null;
  }, [activeNodeId, currentPathway]);

  // Filter pathways / nodes if search query is provided
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;

    return MECHANISM_PATHWAYS.map((pathway) => {
      const matchesPathwayName =
        pathway.name.toLowerCase().includes(q) ||
        pathway.summary.toLowerCase().includes(q) ||
        pathway.category.toLowerCase().includes(q);

      const matchingNodes = pathway.nodes.filter(
        (node) =>
          node.name.toLowerCase().includes(q) ||
          node.description.toLowerCase().includes(q) ||
          node.drugTargets.some(
            (t) =>
              t.drugName.toLowerCase().includes(q) ||
              (t.drugClass && t.drugClass.toLowerCase().includes(q)) ||
              t.action.toLowerCase().includes(q) ||
              t.effect.toLowerCase().includes(q),
          ),
      );

      const matchingPearls = pathway.clinicalPearls.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.collisionOrMechanism.toLowerCase().includes(q) ||
          p.rationale.toLowerCase().includes(q),
      );

      return {
        pathway,
        matches: matchesPathwayName || matchingNodes.length > 0 || matchingPearls.length > 0,
        nodeCount: matchingNodes.length,
      };
    }).filter((r) => r.matches);
  }, [searchQuery]);

  // Handle loading all pathway drugs onto the desk tray
  function handleAddPathwayToDesk(pathway: MechanismPathway) {
    const validIds = pathway.keyDrugIds.filter((id) => Boolean(DRUG_BY_ID[id]));
    if (validIds.length === 0) return;

    deskLoad(validIds);
    setLoadedNotice(`Loaded ${validIds.length} pathway drugs onto desk tray`);
    setTimeout(() => setLoadedNotice(null), 4000);
  }

  // Handle toggling an individual drug target on the desk
  function handleToggleDrug(drugId: string) {
    if (onSelectDrug) {
      onSelectDrug(drugId);
    }
    if (selectedSet.has(drugId)) {
      deskRemove(drugId);
    } else {
      deskAdd(drugId);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Regulatory Compliance Banner */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-medium text-accent">
                <Activity className="h-3.5 w-3.5" />
                Signaling Cascades & Targets
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted">
                <ShieldAlert className="h-3 w-3 text-info" />
                FD&C Act § 520(o)(1)(E)
              </span>
            </div>
            <h1 className="mt-2 font-serif text-2xl tracking-tight text-fg sm:text-3xl">
              Pharmacological Mechanism Pathways
            </h1>
            <p className="mt-1 text-sm text-muted">
              Interactive biochemical signaling cascades, target enzymes, ion channels, and receptor pharmacology.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => deskSetView("desk")}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-xs font-medium text-fg transition-colors hover:bg-bg-sunken focus:outline-none focus:ring-2 focus:ring-accent"
              title="Switch to Desk Tray view"
            >
              <Layers className="h-4 w-4 text-accent" />
              <span>Desk Tray ({deskSelected.length})</span>
            </button>
          </div>
        </div>

        {/* Regulatory Posture Notice */}
        <div className="mt-4 rounded-lg border border-border/80 bg-surface-2/80 p-3 text-xs text-subtle">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>
              <strong>Educational Decision Support:</strong> {REGULATORY_NOTICE}
            </span>
          </p>
        </div>

        {/* Global Search & Filter Bar */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pathways, enzymes, receptors, or drugs (e.g. apixaban, ACE, potassium, reversal)..."
              className="min-h-[44px] w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-4 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] rounded p-1 text-xs text-muted hover:text-fg"
              >
                Clear
              </button>
            )}
          </div>
          {searchResults && (
            <div className="mt-2 text-xs text-muted">
              Found {searchResults.length} pathway(s) matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Pathway Selection Tabs / Chips across the 6 major systems */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">
            Major Pharmacological Pathways (6 Systems)
          </h2>
          <span className="font-mono text-[11px] text-subtle">Touch target compliant &ge; 44px</span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MECHANISM_PATHWAYS.map((pathway) => {
            const isSelected = pathway.id === selectedPathwayId;
            const matchesQuery =
              !searchQuery ||
              (searchResults && searchResults.some((r) => r.pathway.id === pathway.id));

            return (
              <button
                key={pathway.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                disabled={!matchesQuery}
                onClick={() => {
                  setSelectedPathwayId(pathway.id);
                  setActiveNodeId(null);
                }}
                className={cn(
                  "flex min-h-[56px] items-center justify-between rounded-xl border p-3.5 text-left transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-accent",
                  isSelected
                    ? "border-accent bg-accent/5 shadow-sm"
                    : "border-border bg-surface hover:bg-surface-2",
                  !matchesQuery && "opacity-40",
                )}
              >
                <div className="min-w-0 pr-2">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                    {pathway.category}
                  </span>
                  <span
                    className={cn(
                      "block truncate font-serif text-sm font-medium",
                      isSelected ? "text-accent" : "text-fg",
                    )}
                  >
                    {pathway.shortTitle}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {pathway.nodes.length} nodes &bull; {pathway.keyDrugIds.length} drugs
                  </span>
                </div>
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                    isSelected
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface-2 text-muted",
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Pathway Deep-Dive Workspace */}
      <div className="space-y-6 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        {/* Pathway Header & Key Drug Actions */}
        <div className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">
                  {currentPathway.category}
                </span>
                <span className="font-mono text-xs text-subtle">ID: {currentPathway.id}</span>
              </div>
              <h2 className="mt-1 font-serif text-xl tracking-tight text-fg sm:text-2xl">
                {currentPathway.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {currentPathway.summary}
              </p>
              <div className="mt-3 rounded-lg border border-border/70 bg-surface-2 p-3 text-xs text-fg">
                <span className="font-semibold text-accent">Clinical Relevance: </span>
                <span className="text-muted">{currentPathway.clinicalRelevance}</span>
              </div>
            </div>

            {/* "Add Pathway Drugs to Desk" Action */}
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => handleAddPathwayToDesk(currentPathway)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-medium text-accent-fg shadow-sm transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Pathway Drugs to Desk ({currentPathway.keyDrugIds.length})</span>
              </button>

              {loadedNotice && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 font-mono text-xs text-ok">
                  <Check className="h-3.5 w-3.5" />
                  <span>{loadedNotice}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1 text-[11px] text-muted">
                <span>Key catalog drugs:</span>
                {currentPathway.keyDrugIds.map((id) => (
                  <span
                    key={id}
                    className={cn(
                      "font-mono",
                      selectedSet.has(id) ? "font-semibold text-accent" : "text-subtle",
                    )}
                  >
                    {id}
                    {selectedSet.has(id) ? "✓" : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Pathway Diagram: Sequential Biochemical Flow */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">
              Sequential Biochemical Signaling Chain
            </h3>
            <p className="text-xs text-muted">
              Select any node below to inspect molecular targets, actions, and downstream cascades.
            </p>
          </div>

          {/* Horizontally scrollable diagram strip on mobile / full chain grid on desktop */}
          <div className="overflow-x-auto pb-3 pt-1">
            <div className="flex min-w-max items-center gap-2 sm:gap-3">
              {currentPathway.nodes.map((node, idx) => {
                const isSelected = activeNode?.id === node.id;
                const typeStyle = TYPE_CONFIG[node.type];
                const hasTargets = node.drugTargets.length > 0;

                return (
                  <React.Fragment key={node.id}>
                    <button
                      type="button"
                      onClick={() => setActiveNodeId(node.id)}
                      className={cn(
                        "group relative flex min-h-[64px] min-w-[180px] flex-col justify-between rounded-xl border p-3 text-left transition-all sm:min-w-[200px]",
                        "focus:outline-none focus:ring-2 focus:ring-accent",
                        isSelected
                          ? "border-accent bg-accent/10 shadow-md ring-1 ring-accent"
                          : "border-border bg-surface-2 hover:border-border-strong hover:bg-surface",
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] text-muted">
                          Step {idx + 1}
                        </span>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wide",
                            typeStyle.badgeClass,
                          )}
                        >
                          {typeStyle.label}
                        </span>
                      </div>

                      <div className="mt-1 font-serif text-xs font-semibold text-fg group-hover:text-accent">
                        {node.name}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                        <span>
                          {hasTargets
                            ? `${node.drugTargets.length} target${node.drugTargets.length > 1 ? "s" : ""}`
                            : "Substrate / Signal"}
                        </span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        )}
                      </div>
                    </button>

                    {/* Connecting arrow if not the last node */}
                    {idx < currentPathway.nodes.length - 1 && (
                      <div className="flex shrink-0 items-center text-muted">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Node Detail Inspector */}
        {activeNode && (
          <div className="rounded-xl border border-accent/40 bg-surface-2 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      TYPE_CONFIG[activeNode.type].badgeClass,
                    )}
                  >
                    {TYPE_CONFIG[activeNode.type].label}
                  </span>
                  <span className="font-mono text-xs text-subtle">
                    Node ID: {activeNode.id}
                  </span>
                </div>
                <h4 className="mt-1 font-serif text-lg font-medium text-fg">
                  {activeNode.name}
                </h4>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-fg sm:text-sm">
              {activeNode.description}
            </p>

            {activeNode.downstreamEffect && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <span className="font-semibold text-fg">Downstream Physiological Cascade: </span>
                  <span className="text-muted">{activeNode.downstreamEffect}</span>
                </div>
              </div>
            )}

            {/* Drug Targets at this Node */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-mono text-xs uppercase tracking-wider text-muted">
                  Pharmacological Drug Targets & Mechanisms ({activeNode.drugTargets.length})
                </h5>
                <span className="text-[11px] text-subtle">
                  Tap drug to toggle on FirstPass tray
                </span>
              </div>

              {activeNode.drugTargets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
                  Constitutive endogenous substrate or signaling intermediate without direct pharmaceutical blockers.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {activeNode.drugTargets.map((target) => {
                    const isCatalogDrug = Boolean(DRUG_BY_ID[target.drugId]);
                    const isOnDesk = selectedSet.has(target.drugId);

                    return (
                      <div
                        key={target.drugId}
                        className={cn(
                          "flex flex-col justify-between rounded-xl border p-4 transition-all",
                          isOnDesk
                            ? "border-accent bg-accent/5 shadow-sm"
                            : "border-border bg-surface",
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif text-base font-semibold text-fg">
                                  {target.drugName}
                                </span>
                                {isOnDesk && (
                                  <span className="rounded-full bg-accent px-1.5 py-0.2 font-mono text-[9px] text-accent-fg">
                                    ON TRAY
                                  </span>
                                )}
                              </div>
                              {target.drugClass && (
                                <span className="font-mono text-[11px] text-muted">
                                  {target.drugClass}
                                </span>
                              )}
                            </div>

                            {/* Individual Drug Tray Toggle Button */}
                            {isCatalogDrug && (
                              <button
                                type="button"
                                onClick={() => handleToggleDrug(target.drugId)}
                                className={cn(
                                  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors",
                                  "focus:outline-none focus:ring-2 focus:ring-accent",
                                  isOnDesk
                                    ? "border-accent bg-accent text-accent-fg hover:bg-accent/90"
                                    : "border-border bg-surface-2 text-fg hover:bg-bg-sunken",
                                )}
                                title={
                                  isOnDesk
                                    ? `Remove ${target.drugName} from tray`
                                    : `Add ${target.drugName} to tray`
                                }
                              >
                                {isOnDesk ? (
                                  <>
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                    <span>Added</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    <span>Tray</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs">
                            <div>
                              <span className="font-medium text-fg">Mechanism of Action: </span>
                              <span className="text-muted">{target.action}</span>
                            </div>
                            <div>
                              <span className="font-medium text-fg">Downstream Effect: </span>
                              <span className="text-muted">{target.effect}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clinical Pearls & Drug-Drug Collisions Card */}
        <div className="space-y-3 rounded-xl border border-warn/30 bg-warn-soft/30 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warn" />
            <h3 className="font-serif text-lg tracking-tight text-fg">
              Clinical Pearls & Mechanism Collisions
            </h3>
          </div>
          <p className="text-xs text-muted">
            High-yield pharmacological logic, counter-intuitive responses, and dangerous drug-drug collision mechanisms.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {currentPathway.clinicalPearls.map((pearl, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-warn">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Collision {idx + 1}
                    </span>
                  </div>
                  <h4 className="mt-1 font-serif text-base font-semibold text-fg">
                    {pearl.title}
                  </h4>
                  <div className="mt-1 font-mono text-xs text-accent">
                    {pearl.collisionOrMechanism}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {pearl.rationale}
                  </p>
                </div>

                {pearl.citation && (
                  <div className="mt-3 border-t border-border pt-2 text-[10px] italic text-subtle">
                    Ref: {pearl.citation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Peer-Reviewed Pharmacology Citations */}
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-muted">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg">
            <BookOpen className="h-4 w-4 text-accent" />
            <span>Peer-Reviewed Textbook & Guideline Citations</span>
          </div>
          <ul className="mt-2 space-y-1 list-inside list-disc text-subtle">
            {currentPathway.citations.map((cite, i) => (
              <li key={i}>{cite}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
