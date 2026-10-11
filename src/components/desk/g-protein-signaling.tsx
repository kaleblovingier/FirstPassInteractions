import { useState, useMemo } from "react";
import {
  Activity,
  Zap,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Check,
  Plus,
  BookOpen,
  Info,
  Search,
  Layers,
  Sparkles,
  Heart,
  Droplets,
  Eye,
  Pill,
} from "lucide-react";
import {
  G_PROTEIN_PATHWAYS,
  G_PROTEIN_REGULATORY_DISCLAIMER,
  G_PROTEIN_CITATIONS,
  getGProteinPathwayById,
  findGProteinForReceptor,
  type GProteinPathway,
  type CascadeStep,
  type TissueResponse,
  type ClinicalDrugTarget,
  type PharmacologyPearl,
} from "@/lib/drugs/g-protein-signaling";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";

export function GProteinSignaling() {
  const [activePathwayId, setActivePathwayId] = useState<string>("gq-phospholipase-c");
  const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(null);
  const [receptorSearch, setReceptorSearch] = useState<string>("");
  const [copiedDeskFeedback, setCopiedDeskFeedback] = useState<boolean>(false);

  // Subscribe to desk state
  const selectedOnDesk = useDesk((s) => s.selected);

  // Active pathway
  const activePathway = useMemo<GProteinPathway>(() => {
    return getGProteinPathwayById(activePathwayId) ?? G_PROTEIN_PATHWAYS[0];
  }, [activePathwayId]);

  // Receptor search live match
  const searchedPathway = useMemo(() => {
    if (!receptorSearch.trim()) return null;
    return findGProteinForReceptor(receptorSearch.trim());
  }, [receptorSearch]);

  // Active step detail
  const activeStep = useMemo<CascadeStep | null>(() => {
    if (selectedStepNumber === null) return activePathway.molecularSteps[0] ?? null;
    return (
      activePathway.molecularSteps.find((s) => s.stepNumber === selectedStepNumber) ??
      activePathway.molecularSteps[0] ??
      null
    );
  }, [selectedStepNumber, activePathway]);

  // Handler: 1-tap load all pathway drugs onto desk
  const handleLoadAllPathwayDrugs = () => {
    const drugIds = activePathway.clinicalDrugTargets.map((d) => d.drugId);
    useDesk.getState().load(drugIds);
    setCopiedDeskFeedback(true);
    setTimeout(() => setCopiedDeskFeedback(false), 2200);
  };

  // Handler: load single drug
  const handleAddDrug = (drugId: string) => {
    useDesk.getState().add(drugId);
  };

  // Switch to searched pathway
  const handleJumpToSearched = () => {
    if (searchedPathway) {
      setActivePathwayId(searchedPathway.id);
      setSelectedStepNumber(null);
      setReceptorSearch("");
    }
  };

  // Theme styling based on G-protein
  const themeStyles = useMemo(() => {
    switch (activePathway.gProtein) {
      case "Gq":
        return {
          pill: "bg-amber-500/15 text-amber-900 border-amber-500/30",
          cardAccent: "border-l-4 border-l-amber-500",
          stepActive: "bg-amber-500/20 border-amber-500 text-amber-950 font-semibold shadow-sm",
          badge: "bg-amber-100 text-amber-900 border-amber-300",
          btn: "bg-amber-700 hover:bg-amber-800 text-amber-50",
        };
      case "Gs":
        return {
          pill: "bg-emerald-500/15 text-emerald-900 border-emerald-500/30",
          cardAccent: "border-l-4 border-l-emerald-500",
          stepActive: "bg-emerald-500/20 border-emerald-500 text-emerald-950 font-semibold shadow-sm",
          badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
          btn: "bg-emerald-700 hover:bg-emerald-800 text-emerald-50",
        };
      case "Gi":
        return {
          pill: "bg-sky-500/15 text-sky-900 border-sky-500/30",
          cardAccent: "border-l-4 border-l-sky-500",
          stepActive: "bg-sky-500/20 border-sky-500 text-sky-950 font-semibold shadow-sm",
          badge: "bg-sky-100 text-sky-900 border-sky-300",
          btn: "bg-sky-700 hover:bg-sky-800 text-sky-50",
        };
      case "PDE":
        return {
          pill: "bg-purple-500/15 text-purple-900 border-purple-500/30",
          cardAccent: "border-l-4 border-l-purple-500",
          stepActive: "bg-purple-500/20 border-purple-500 text-purple-950 font-semibold shadow-sm",
          badge: "bg-purple-100 text-purple-900 border-purple-300",
          btn: "bg-purple-700 hover:bg-purple-800 text-purple-50",
        };
    }
  }, [activePathway.gProtein]);

  return (
    <div className="space-y-6">
      {/* Top Header & Switchboard Meta */}
      <div className="rounded-2xl bg-surface p-5 sm:p-6 shadow-[var(--shadow-border)] border border-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-semibold text-accent">
                <Activity className="size-3.5" />
                GPCR Second Messenger Switchboard
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted border border-border">
                FD&C Act § 520(o)(1)(E) Decision Support
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
              GPCR & Second Messenger Signaling Switchboard
            </h1>
            <p className="max-w-3xl text-sm sm:text-base text-muted leading-relaxed">
              Explore classical autonomic pharmacology cascades (Gq, Gs, Gi) and the NO-sGC-cGMP-PDE axis.
              Compare receptor sub-types, tissue-specific physiological divergence, high-yield clinical collisions,
              and load key autonomic agents directly into the FirstPass interaction desk.
            </p>
          </div>

          {/* Quick Receptor Lookup Search */}
          <div className="w-full lg:w-80 shrink-0">
            <label
              htmlFor="receptor-search-input"
              className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5"
            >
              Quick Receptor Switchboard
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
              <input
                id="receptor-search-input"
                type="text"
                value={receptorSearch}
                onChange={(e) => setReceptorSearch(e.target.value)}
                placeholder="e.g. Alpha-1, Beta-2, M2, H1, MOR..."
                className="w-full min-h-[44px] rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {receptorSearch.trim() && (
              <div className="mt-2 rounded-xl border border-border bg-surface-2 p-3 text-xs shadow-sm">
                {searchedPathway ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-fg">Coupling: {searchedPathway.gProtein}</span>
                      <span className="font-mono text-[11px] text-muted">Matches {searchedPathway.name}</span>
                    </div>
                    <p className="text-muted line-clamp-2">{searchedPathway.cellularResponse}</p>
                    <button
                      type="button"
                      onClick={handleJumpToSearched}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 font-medium text-accent-fg hover:opacity-90 transition-opacity"
                    >
                      <span>Switch to {searchedPathway.gProtein} Cascade</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-muted italic">No matching classical G-protein pathway found for "{receptorSearch}".</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pathway Selector Tabs (Mobile touch target >= 44px) */}
        <div className="mt-6 pt-5 border-t border-border">
          <div
            role="tablist"
            aria-label="G-Protein Signaling Pathways"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
          >
            {G_PROTEIN_PATHWAYS.map((pathway) => {
              const isActive = pathway.id === activePathwayId;
              return (
                <button
                  key={pathway.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${pathway.id}`}
                  id={`tab-${pathway.id}`}
                  onClick={() => {
                    setActivePathwayId(pathway.id);
                    setSelectedStepNumber(null);
                  }}
                  className={cn(
                    "min-h-[44px] px-4 py-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1",
                    isActive
                      ? "bg-surface-2 border-accent shadow-sm ring-1 ring-accent/30"
                      : "bg-surface hover:bg-surface-2 border-border text-muted hover:text-fg",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                      {pathway.gProtein} Cascade
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {pathway.primaryReceptors.length} Receptors
                    </span>
                  </div>
                  <div className="font-medium text-sm text-fg truncate">{pathway.mnemonic}</div>
                  <div className="font-mono text-[11px] text-muted truncate">
                    {pathway.secondMessengers[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Pathway Overview Card & 1-Tap Desk Loader */}
      <div
        id={`panel-${activePathway.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activePathway.id}`}
        className="rounded-2xl bg-surface p-5 sm:p-6 border border-border shadow-[var(--shadow-border)] space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={cn("px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border", themeStyles.pill)}>
                {activePathway.gProtein} Heterotrimer
              </span>
              <span className="font-mono text-xs text-muted">Mnemonic: {activePathway.mnemonic}</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-fg">
              {activePathway.name}
            </h2>
          </div>

          {/* 1-Tap "Load Pathway Drugs on Desk" Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadAllPathwayDrugs}
              className={cn(
                "min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm",
                copiedDeskFeedback
                  ? "bg-ok text-white"
                  : "bg-accent text-accent-fg hover:opacity-90",
              )}
              aria-label={`Load all ${activePathway.clinicalDrugTargets.length} drugs in ${activePathway.name} on FirstPass Desk`}
            >
              {copiedDeskFeedback ? (
                <>
                  <Check className="size-4" />
                  <span>Loaded {activePathway.clinicalDrugTargets.length} Drugs on Desk!</span>
                </>
              ) : (
                <>
                  <Pill className="size-4" />
                  <span>Load Pathway Drugs on Desk ({activePathway.clinicalDrugTargets.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Primary Signaling Substrates Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-1">
            <div className="font-mono uppercase text-[10px] text-muted tracking-wider">Coupled Receptors</div>
            <div className="font-medium text-fg">{activePathway.primaryReceptors.join(", ")}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-1">
            <div className="font-mono uppercase text-[10px] text-muted tracking-wider">Effector Enzyme</div>
            <div className="font-medium text-fg">{activePathway.effectorEnzyme}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-1">
            <div className="font-mono uppercase text-[10px] text-muted tracking-wider">Second Messengers</div>
            <div className="font-medium text-fg">{activePathway.secondMessengers.join(", ")}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-1">
            <div className="font-mono uppercase text-[10px] text-muted tracking-wider">Downstream Kinase / Channel</div>
            <div className="font-medium text-fg">{activePathway.downstreamKinase}</div>
          </div>
        </div>

        {/* Interactive Molecular Cascade Diagram */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-accent" />
              <h3 className="font-serif text-lg font-semibold text-fg">Interactive Molecular Cascade Flow</h3>
            </div>
            <span className="font-mono text-xs text-muted">Tap any step to inspect mechanism</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            {activePathway.molecularSteps.map((step, idx) => {
              const isSelected = activeStep?.stepNumber === step.stepNumber;
              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => setSelectedStepNumber(step.stepNumber)}
                  className={cn(
                    "min-h-[44px] p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 relative",
                    isSelected
                      ? cn("border-accent ring-2 ring-accent/30 bg-surface-2", themeStyles.stepActive)
                      : "bg-surface-2 hover:bg-surface border-border text-muted hover:text-fg",
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                      Step {step.stepNumber}
                    </span>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface border border-border">
                      {step.stage}
                    </span>
                  </div>
                  <div className="font-medium text-xs text-fg leading-tight">{step.title}</div>
                  <div className="font-mono text-[10px] text-muted truncate">{step.component}</div>
                  {idx < 5 && (
                    <ArrowRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 size-3 text-muted/60 pointer-events-none z-10" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Step Detailed Mechanism Banner */}
          {activeStep && (
            <div className={cn("rounded-xl border bg-surface-2 p-4 text-xs space-y-1.5 shadow-sm", themeStyles.cardAccent)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-accent">Step {activeStep.stepNumber}: {activeStep.title}</span>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-muted border border-border">
                    {activeStep.component}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted uppercase tracking-wider">
                  Stage: {activeStep.stage}
                </span>
              </div>
              <p className="text-fg text-sm leading-relaxed">{activeStep.mechanism}</p>
            </div>
          )}

          {/* Cascade Summary */}
          <div className="rounded-xl bg-surface-2/60 border border-border p-3 text-xs text-muted flex items-start gap-2.5">
            <Info className="size-4 shrink-0 text-accent mt-0.5" />
            <div>
              <span className="font-semibold text-fg">Complete Pathway Equation: </span>
              <span>{activePathway.molecularCascadeSummary}</span>
            </div>
          </div>
        </div>

        {/* Tissue & Organ Specificity Comparison Cards */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-accent" />
              <h3 className="font-serif text-lg font-semibold text-fg">Tissue & Organ Specificity Divergence</h3>
            </div>
            <span className="font-mono text-xs text-muted">Divergent downstream pharmacology</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activePathway.tissueResponses.map((tr, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-surface-2 p-3.5 flex flex-col justify-between gap-2.5 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-serif font-bold text-sm text-fg">{tr.tissue}</span>
                    <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent">
                      {tr.receptorOrTarget}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-snug">{tr.mechanism}</p>
                </div>
                <div className="pt-2 border-t border-border/70">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-0.5">Net Physiological Effect</div>
                  <div className="font-medium text-xs text-fg leading-snug">{tr.physiologicalEffect}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Pharmacology Pearls & Collisions Card */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <h3 className="font-serif text-lg font-semibold text-fg">Clinical Pharmacology Pearls & High-Yield Collisions</h3>
            </div>
            <span className="font-mono text-xs text-muted">Autonomic mnemonics & alerts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {activePathway.pharmacologyPearls.map((pearl, idx) => {
              const isCollision = pearl.category === "collision";
              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border p-4 flex flex-col justify-between gap-2 shadow-xs",
                    isCollision
                      ? "bg-danger-soft/40 border-danger/40 text-danger-900"
                      : "bg-surface-2 border-border",
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {isCollision ? (
                        <AlertTriangle className="size-4 text-danger shrink-0" />
                      ) : (
                        <BookOpen className="size-4 text-accent shrink-0" />
                      )}
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                        {pearl.category}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-sm text-fg leading-snug">{pearl.title}</h4>
                    <p className="text-xs text-muted leading-relaxed">{pearl.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clinical Drug Targets Shelf */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-serif text-lg font-semibold text-fg">Key Clinical Drug Targets</h3>
              <p className="text-xs text-muted">
                Pharmacological agonists, antagonists, and inhibitors acting along this pathway.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadAllPathwayDrugs}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border bg-surface-2 hover:bg-surface text-xs font-medium text-fg inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              <span>Load All {activePathway.clinicalDrugTargets.length} to Desk</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePathway.clinicalDrugTargets.map((target) => {
              const isOnDesk = selectedOnDesk.includes(target.drugId);
              return (
                <div
                  key={target.drugId}
                  className="rounded-xl border border-border bg-surface-2 p-3.5 flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-bold text-sm text-fg">{target.drugName}</span>
                      {target.targetReceptorOrEnzyme && (
                        <span className="rounded bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-medium text-accent">
                          {target.targetReceptorOrEnzyme}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-medium text-muted">{target.action}</div>
                    <p className="text-xs text-muted leading-snug">{target.clinicalUse}</p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted">ID: {target.drugId}</span>
                    <button
                      type="button"
                      onClick={() => handleAddDrug(target.drugId)}
                      className={cn(
                        "min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                        isOnDesk
                          ? "bg-ok-soft text-ok border border-ok/30"
                          : "bg-surface hover:bg-surface-2 border border-border text-fg",
                      )}
                      aria-label={`Add ${target.drugName} to FirstPass interaction desk`}
                    >
                      {isOnDesk ? (
                        <>
                          <Check className="size-3.5" />
                          <span>On Desk</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5" />
                          <span>+ Desk</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Non-prescriptive Regulatory Disclaimer & Citations Footer */}
        <div className="rounded-xl bg-surface-2 border border-border p-4 space-y-3 text-xs text-muted">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="size-4 shrink-0 text-accent mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-fg">Regulatory Posture (FD&C Act § 520(o)(1)(E)): </span>
              <p className="leading-relaxed">{G_PROTEIN_REGULATORY_DISCLAIMER}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-border space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Peer-Reviewed Pharmacology Citations:
            </span>
            <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px] text-muted">
              {G_PROTEIN_CITATIONS.map((cite, idx) => (
                <li key={idx}>{cite}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
