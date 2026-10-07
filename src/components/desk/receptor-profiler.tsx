import { useState, useMemo } from "react";
import {
  Search,
  X,
  ArrowRightLeft,
  Plus,
  Check,
  Info,
  BookOpen,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  DRUG_RECEPTOR_PROFILES,
  RECEPTOR_TARGETS,
  RECEPTOR_PROFILES_REGULATORY_DISCLAIMER,
  getProfileForDrug,
  getAllDrugProfiles,
  filterProfilesByClass,
  searchProfiles,
  compareReceptorProfiles,
  type DrugReceptorProfile,
  type ReceptorBinding,
  type AffinityTier,
  type ReceptorFamily,
} from "@/lib/drugs/receptor-profiles";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";

type ViewMode = "catalog" | "compare" | "glossary";

interface PresetComparison {
  id: string;
  label: string;
  drug1: string;
  drug2: string;
  theme: string;
}

const COMPARISON_PRESETS: readonly PresetComparison[] = [
  {
    id: "halo-cloz",
    label: "Haloperidol vs Clozapine",
    drug1: "haloperidol",
    drug2: "clozapine",
    theme: "EPS vs Metabolic / Anticholinergic Trade-off",
  },
  {
    id: "sert-mirt",
    label: "Sertraline vs Mirtazapine",
    drug1: "sertraline",
    drug2: "mirtazapine",
    theme: "Selective SERT vs Multi-Target NaSSA Sedation",
  },
  {
    id: "morph-bup",
    label: "Morphine vs Buprenorphine",
    drug1: "morphine",
    drug2: "buprenorphine",
    theme: "Full MOR Agonist vs High-Affinity Partial MOR / Kappa Blocker",
  },
  {
    id: "prop-clon",
    label: "Propranolol vs Clonidine",
    drug1: "propranolol",
    drug2: "clonidine",
    theme: "Peripheral Beta-Blocker vs Central Alpha-2 Sympatholytic",
  },
  {
    id: "fluox-venla",
    label: "Fluoxetine vs Venlafaxine",
    drug1: "fluoxetine",
    drug2: "venlafaxine",
    theme: "SSRI with 5-HT2C Activation vs Dual Dose-Dependent SNRI",
  },
  {
    id: "arip-risp",
    label: "Aripiprazole vs Risperidone",
    drug1: "aripiprazole",
    drug2: "risperidone",
    theme: "D2 Partial Agonist vs Potent D2/5-HT2A Antagonist",
  },
];

const FILTER_PILLS = [
  { id: "all", label: "All Agents" },
  { id: "antipsychotics", label: "Antipsychotics" },
  { id: "antidepressants", label: "Antidepressants" },
  { id: "opioids", label: "Opioids" },
  { id: "sedatives", label: "Sedatives" },
  { id: "autonomic", label: "Autonomic" },
] as const;

function getTierBadgeClasses(tier: AffinityTier): {
  badge: string;
  dot: string;
} {
  switch (tier) {
    case "Sub-nanomolar":
      return {
        badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
        dot: "bg-purple-600",
      };
    case "High":
      return {
        badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        dot: "bg-rose-600",
      };
    case "Moderate":
      return {
        badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
        dot: "bg-amber-600",
      };
    case "Low":
      return {
        badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
        dot: "bg-blue-600",
      };
    case "Negligible":
    default:
      return {
        badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
        dot: "bg-zinc-400",
      };
  }
}

export function ReceptorProfiler() {
  const [viewMode, setViewMode] = useState<ViewMode>("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [compareDrug1Id, setCompareDrug1Id] = useState("haloperidol");
  const [compareDrug2Id, setCompareDrug2Id] = useState("clozapine");
  const [activeReceptorKey, setActiveReceptorKey] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Subscribe to current selected drugs on desk
  const selectedOnDesk = useDesk((s) => s.selected);

  // Filtered and searched drug profiles
  const displayedProfiles = useMemo(() => {
    let list = DRUG_RECEPTOR_PROFILES;
    if (selectedClass !== "all") {
      list = filterProfilesByClass(selectedClass);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        if (p.drugName.toLowerCase().includes(q)) return true;
        if (p.drugId.toLowerCase().includes(q)) return true;
        if (p.primaryClass.toLowerCase().includes(q)) return true;
        if (p.primaryTarget.toLowerCase().includes(q)) return true;
        if (p.mechanismSummary.toLowerCase().includes(q)) return true;
        if (p.downstreamEffects.some((eff) => eff.toLowerCase().includes(q))) return true;
        if (
          p.bindings.some(
            (b) =>
              b.receptor.toLowerCase().includes(q) ||
              b.clinicalSignificance.toLowerCase().includes(q),
          )
        ) {
          return true;
        }
        return false;
      });
    }
    return list;
  }, [selectedClass, searchQuery]);

  // Comparison data for selected pair
  const comparisonResult = useMemo(() => {
    return compareReceptorProfiles(compareDrug1Id, compareDrug2Id);
  }, [compareDrug1Id, compareDrug2Id]);

  const allProfiles = useMemo(() => getAllDrugProfiles(), []);

  const handleToggleExpand = (drugId: string) => {
    setExpandedCards((prev) => ({ ...prev, [drugId]: !prev[drugId] }));
  };

  const handleAddToDesk = (drugId: string) => {
    useDesk.getState().add(drugId);
  };

  const handleSelectForCompare = (drugId: string, slot: "drug1" | "drug2") => {
    if (slot === "drug1") {
      setCompareDrug1Id(drugId);
    } else {
      setCompareDrug2Id(drugId);
    }
    setViewMode("compare");
  };

  const handleSwapCompare = () => {
    const temp = compareDrug1Id;
    setCompareDrug1Id(compareDrug2Id);
    setCompareDrug2Id(temp);
  };

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="size-3.5" />
              Pharmacological Receptor Profiler
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Receptor Binding & Functional Activity Desk
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Explore in vitro equilibrium binding affinities (Ki in nM), intrinsic functional
              pharmacology (full/partial agonists, antagonists, reuptake inhibitors, PAMs), and
              downstream cascades across 34 representative clinical agents.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 sm:max-w-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>FD&C Act § 520(o)(1)(E)</span>
            </div>
            <p className="mt-1 leading-normal text-subtle text-[11px]">
              Non-prescriptive educational decision support. Cites peer-reviewed literature (NIMH
              PDSP, Roth et al., IUPHAR). No treatment or dosing directives.
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setViewMode("catalog")}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              viewMode === "catalog"
                ? "bg-accent text-accent-fg shadow-sm"
                : "bg-surface-2 text-muted hover:text-fg",
            )}
          >
            <Layers className="size-4" />
            <span>Drug Profiles Catalog</span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
              {allProfiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("compare")}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              viewMode === "compare"
                ? "bg-accent text-accent-fg shadow-sm"
                : "bg-surface-2 text-muted hover:text-fg",
            )}
          >
            <ArrowRightLeft className="size-4" />
            <span>Side-by-Side Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("glossary")}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              viewMode === "glossary"
                ? "bg-accent text-accent-fg shadow-sm"
                : "bg-surface-2 text-muted hover:text-fg",
            )}
          >
            <BookOpen className="size-4" />
            <span>Receptor Target Glossary</span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
              {Object.keys(RECEPTOR_TARGETS).length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CATALOG VIEW */}
      {viewMode === "catalog" && (
        <div className="space-y-6">
          {/* Search Bar & Filter Pills Container */}
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by drug name, class, primary target (e.g. 5-HT2A, NMDA), or clinical keyword..."
                className="w-full min-h-[44px] rounded-lg border border-border bg-surface-2 pl-11 pr-10 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-muted hover:text-fg"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Filter by Class:
              </span>
              {FILTER_PILLS.map((pill) => {
                const isSelected = selectedClass === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setSelectedClass(pill.id)}
                    className={cn(
                      "inline-flex min-h-[44px] items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-fg text-bg font-semibold shadow-sm"
                        : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
                    )}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Status bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-muted pt-1">
              <span>
                Showing <strong>{displayedProfiles.length}</strong> of {allProfiles.length} clinical
                agents
              </span>
              {selectedClass !== "all" || searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass("all");
                    setSearchQuery("");
                  }}
                  className="min-h-[44px] text-accent hover:underline inline-flex items-center"
                >
                  Reset all filters
                </button>
              ) : null}
            </div>
          </div>

          {/* Drug Profile Cards Grid */}
          {displayedProfiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
              <p className="text-base font-medium text-fg">No matching drug profiles found</p>
              <p className="mt-1 text-sm text-muted">
                Try searching for receptors like "5-HT2A", "D2", "NMDA", or clear your class filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {displayedProfiles.map((drug) => {
                const isOnDesk = selectedOnDesk.includes(drug.drugId);
                const isExpanded = !!expandedCards[drug.drugId];

                return (
                  <div
                    key={drug.drugId}
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="space-y-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-lg font-bold text-fg">{drug.drugName}</h3>
                            <span className="font-mono text-xs text-muted">({drug.drugId})</span>
                          </div>
                          <p className="text-xs font-medium text-muted">{drug.primaryClass}</p>
                        </div>

                        <span className="inline-flex items-center rounded-md bg-accent-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-accent">
                          {drug.primaryTarget}
                        </span>
                      </div>

                      {/* Mechanism Summary */}
                      <p className="text-xs leading-relaxed text-fg/80">{drug.mechanismSummary}</p>

                      {/* Receptor Binding Affinity Chips */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
                          <span>Receptor Bindings (In Vitro Ki):</span>
                          <span>{drug.bindings.length} targets</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {drug.bindings.map((b) => {
                            const tierStyles = getTierBadgeClasses(b.affinityTier);
                            const kiLabel =
                              b.affinityKiNm !== undefined
                                ? `${b.affinityKiNm} nM`
                                : b.affinityTier;

                            return (
                              <button
                                key={b.receptor}
                                type="button"
                                onClick={() =>
                                  setActiveReceptorKey(
                                    activeReceptorKey === b.receptor ? null : b.receptor,
                                  )
                                }
                                title={`${b.receptor} (${b.targetFamily}): ${b.affinityTier} ${b.functionalActivity}. ${b.clinicalSignificance}`}
                                className={cn(
                                  "inline-flex min-h-[32px] items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-transform hover:scale-105",
                                  tierStyles.badge,
                                )}
                              >
                                <span className={cn("size-1.5 rounded-full", tierStyles.dot)} />
                                <span className="font-bold">{b.receptor}</span>
                                <span className="opacity-75">· {kiLabel}</span>
                                <span className="text-[10px] opacity-90">({b.functionalActivity})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Downstream Clinical Effects */}
                      <div className="space-y-1.5 border-t border-border/60 pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Downstream Clinical Effects:
                        </p>
                        <ul className="space-y-1 text-xs text-muted">
                          {(isExpanded
                            ? drug.downstreamEffects
                            : drug.downstreamEffects.slice(0, 3)
                          ).map((effect, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-snug">
                              <span className="mt-1 size-1 shrink-0 rounded-full bg-accent" />
                              <span>{effect}</span>
                            </li>
                          ))}
                        </ul>

                        {drug.downstreamEffects.length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(drug.drugId)}
                            className="inline-flex min-h-[44px] items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="size-3" /> Show fewer effects
                              </>
                            ) : (
                              <>
                                <ChevronDown className="size-3" /> +
                                {drug.downstreamEffects.length - 3} more effects
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => handleAddToDesk(drug.drugId)}
                        disabled={isOnDesk}
                        className={cn(
                          "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                          isOnDesk
                            ? "bg-ok-soft text-ok cursor-default"
                            : "bg-surface-2 text-fg hover:bg-surface-3 hover:text-accent shadow-sm",
                        )}
                      >
                        {isOnDesk ? (
                          <>
                            <Check className="size-4 text-ok" />
                            <span>On Desk</span>
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            <span>Add to Desk</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectForCompare(drug.drugId, "drug1")}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:border-accent hover:text-fg"
                        title="Compare this drug against another in side-by-side view"
                      >
                        <ArrowRightLeft className="size-3.5" />
                        <span>Compare</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SIDE-BY-SIDE COMPARISON VIEW */}
      {viewMode === "compare" && (
        <div className="space-y-6">
          {/* Quick Comparison Presets */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                High-Yield Clinical Presets:
              </h2>
              <span className="text-xs text-subtle">Click to load comparison pair</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMPARISON_PRESETS.map((preset) => {
                const isActive =
                  (compareDrug1Id === preset.drug1 && compareDrug2Id === preset.drug2) ||
                  (compareDrug1Id === preset.drug2 && compareDrug2Id === preset.drug1);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCompareDrug1Id(preset.drug1);
                      setCompareDrug2Id(preset.drug2);
                    }}
                    className={cn(
                      "flex min-h-[44px] flex-col justify-center rounded-lg border px-3 py-1.5 text-left transition-colors",
                      isActive
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface-2 text-muted hover:border-fg/30 hover:text-fg",
                    )}
                  >
                    <span className="text-xs font-bold leading-tight">{preset.label}</span>
                    <span className="text-[10px] leading-tight text-subtle">{preset.theme}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Drug Selectors */}
          <div className="grid grid-cols-1 items-center gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6 md:grid-cols-[1fr,auto,1fr]">
            {/* Drug 1 Picker */}
            <div className="space-y-1.5">
              <label htmlFor="compare-drug1-select" className="text-xs font-semibold uppercase tracking-wider text-muted">
                Drug 1 (Reference Agent):
              </label>
              <select
                id="compare-drug1-select"
                value={compareDrug1Id}
                onChange={(e) => setCompareDrug1Id(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
              >
                {allProfiles.map((p) => (
                  <option key={p.drugId} value={p.drugId}>
                    {p.drugName} ({p.primaryClass})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center pt-2 md:pt-4">
              <button
                type="button"
                onClick={handleSwapCompare}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-surface-2 text-muted hover:border-accent hover:text-accent"
                aria-label="Swap comparison drugs"
              >
                <ArrowRightLeft className="size-4" />
              </button>
            </div>

            {/* Drug 2 Picker */}
            <div className="space-y-1.5">
              <label htmlFor="compare-drug2-select" className="text-xs font-semibold uppercase tracking-wider text-muted">
                Drug 2 (Comparator Agent):
              </label>
              <select
                id="compare-drug2-select"
                value={compareDrug2Id}
                onChange={(e) => setCompareDrug2Id(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
              >
                {allProfiles.map((p) => (
                  <option key={p.drugId} value={p.drugId}>
                    {p.drugName} ({p.primaryClass})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side-by-Side Drug Header Cards */}
          {comparisonResult.drug1 && comparisonResult.drug2 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[comparisonResult.drug1, comparisonResult.drug2].map((drug, index) => {
                const isOnDesk = selectedOnDesk.includes(drug.drugId);
                return (
                  <div
                    key={drug.drugId}
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                          Drug {index + 1}
                        </span>
                        <span className="font-mono text-xs font-semibold text-muted">
                          {drug.primaryTarget}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-bold text-fg">{drug.drugName}</h3>
                        <p className="text-xs text-muted">{drug.primaryClass}</p>
                      </div>
                      <p className="text-xs leading-relaxed text-fg/80">{drug.mechanismSummary}</p>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => handleAddToDesk(drug.drugId)}
                        disabled={isOnDesk}
                        className={cn(
                          "inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
                          isOnDesk
                            ? "bg-ok-soft text-ok cursor-default"
                            : "bg-surface-2 text-fg hover:bg-surface-3 hover:text-accent shadow-sm",
                        )}
                      >
                        {isOnDesk ? (
                          <>
                            <Check className="size-4" />
                            <span>{drug.drugName} on Desk</span>
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" />
                            <span>Add {drug.drugName} to Desk</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clinical Side Effect Divergence Callout */}
          <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-fg">
                  Pharmacological & Clinical Side Effect Divergence: Why Profiles Differ
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Receptor selectivity profiles dictate differences in clinical tolerability,
                  extrapyramidal liability, sedation, autonomic stability, and metabolic burden:
                </p>

                <div className="mt-3 space-y-2">
                  {comparisonResult.clinicalDivergenceNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/50 bg-surface/80 p-3 text-xs leading-relaxed text-fg"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Receptor Matrix Table */}
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="border-b border-border bg-surface-2 px-5 py-3">
              <h3 className="font-serif text-sm font-bold text-fg">
                Receptor Binding Affinity Comparison (Ki in nM & Functional Activity)
              </h3>
              <p className="text-xs text-muted">
                Side-by-side comparison across all occupied receptor targets
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-2/50 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-3 px-4">Receptor / Target</th>
                    <th className="py-3 px-4">Family</th>
                    <th className="py-3 px-4 font-bold text-fg">
                      {comparisonResult.drug1?.drugName ?? "Drug 1"}
                    </th>
                    <th className="py-3 px-4 font-bold text-fg">
                      {comparisonResult.drug2?.drugName ?? "Drug 2"}
                    </th>
                    <th className="py-3 px-4">Clinical Divergence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparisonResult.comparisonTable.map((row) => {
                    const b1 = row.drug1Binding;
                    const b2 = row.drug2Binding;
                    const tier1Styles = b1 ? getTierBadgeClasses(b1.affinityTier) : null;
                    const tier2Styles = b2 ? getTierBadgeClasses(b2.affinityTier) : null;

                    return (
                      <tr key={row.receptor} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-fg">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReceptorKey(
                                activeReceptorKey === row.receptor ? null : row.receptor,
                              )
                            }
                            className="inline-flex min-h-[44px] items-center text-accent hover:underline"
                          >
                            {row.receptor}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-muted">{row.targetFamily}</td>

                        {/* Drug 1 Binding */}
                        <td className="py-3.5 px-4">
                          {b1 && tier1Styles ? (
                            <div className="space-y-1">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border",
                                  tier1Styles.badge,
                                )}
                              >
                                <span>
                                  {b1.affinityKiNm !== undefined
                                    ? `${b1.affinityKiNm} nM`
                                    : b1.affinityTier}
                                </span>
                                <span>({b1.functionalActivity})</span>
                              </span>
                              <p className="text-[11px] text-muted max-w-xs line-clamp-2">
                                {b1.clinicalSignificance}
                              </p>
                            </div>
                          ) : (
                            <span className="text-subtle italic">Negligible / Unbound</span>
                          )}
                        </td>

                        {/* Drug 2 Binding */}
                        <td className="py-3.5 px-4">
                          {b2 && tier2Styles ? (
                            <div className="space-y-1">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border",
                                  tier2Styles.badge,
                                )}
                              >
                                <span>
                                  {b2.affinityKiNm !== undefined
                                    ? `${b2.affinityKiNm} nM`
                                    : b2.affinityTier}
                                </span>
                                <span>({b2.functionalActivity})</span>
                              </span>
                              <p className="text-[11px] text-muted max-w-xs line-clamp-2">
                                {b2.clinicalSignificance}
                              </p>
                            </div>
                          ) : (
                            <span className="text-subtle italic">Negligible / Unbound</span>
                          )}
                        </td>

                        {/* Divergence Summary */}
                        <td className="py-3.5 px-4 text-xs font-medium text-fg/90">
                          {row.divergenceSummary}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: RECEPTOR TARGET GLOSSARY */}
      {viewMode === "glossary" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <h2 className="font-serif text-lg font-bold text-fg">
              Comprehensive Pharmacological Receptor Registry
            </h2>
            <p className="mt-1 text-xs text-muted">
              Clinical consequence reference mapping agonism vs. antagonism across dopamine,
              serotonin, adrenergic, histamine, muscarinic, opioid, transporter, and ionotropic
              targets.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.values(RECEPTOR_TARGETS).map((target) => (
              <div
                key={target.receptor}
                className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-lg font-bold text-accent">
                        {target.receptor}
                      </span>
                      <span className="rounded bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                        {target.family}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-fg mt-0.5">{target.name}</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted">{target.description}</p>

                <div className="space-y-2 rounded-lg bg-surface-2/60 p-3 text-xs">
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Agonism Consequences:{" "}
                    </span>
                    <span className="text-fg/80">{target.agonismConsequences}</span>
                  </div>
                  <div>
                    <span className="font-bold text-rose-700 dark:text-rose-400">
                      Antagonism Consequences:{" "}
                    </span>
                    <span className="text-fg/80">{target.antagonismConsequences}</span>
                  </div>
                  <div>
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">
                      Primary Clinical Implications:{" "}
                    </span>
                    <span className="text-fg/80">{target.primaryClinicalImplications}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-subtle italic">
                  <span>Literature Source: {target.citation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popover / Detail modal for clicked receptor */}
      {activeReceptorKey && RECEPTOR_TARGETS[activeReceptorKey] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold text-accent">
                    {RECEPTOR_TARGETS[activeReceptorKey].receptor}
                  </h3>
                  <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
                    {RECEPTOR_TARGETS[activeReceptorKey].family}
                  </span>
                </div>
                <p className="text-xs font-medium text-fg">
                  {RECEPTOR_TARGETS[activeReceptorKey].name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveReceptorKey(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:text-fg"
                aria-label="Close dialog"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {RECEPTOR_TARGETS[activeReceptorKey].description}
            </p>

            <div className="space-y-2 rounded-lg bg-surface-2 p-3.5 text-xs leading-relaxed">
              <div>
                <strong className="text-emerald-700 dark:text-emerald-400">Agonism: </strong>
                <span>{RECEPTOR_TARGETS[activeReceptorKey].agonismConsequences}</span>
              </div>
              <div>
                <strong className="text-rose-700 dark:text-rose-400">Antagonism: </strong>
                <span>{RECEPTOR_TARGETS[activeReceptorKey].antagonismConsequences}</span>
              </div>
              <div>
                <strong className="text-accent">Clinical Context: </strong>
                <span>{RECEPTOR_TARGETS[activeReceptorKey].primaryClinicalImplications}</span>
              </div>
            </div>

            <p className="text-[11px] text-subtle italic">
              Citation: {RECEPTOR_TARGETS[activeReceptorKey].citation}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveReceptorKey(null)}
                className="w-full min-h-[44px] rounded-lg bg-accent text-accent-fg font-medium text-xs shadow-sm hover:opacity-90"
              >
                Close Target Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regulatory Disclosure Footer */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-xs leading-relaxed text-muted">
        <div className="flex items-center gap-1.5 font-semibold text-fg">
          <Info className="size-4 shrink-0 text-muted" />
          <span>Regulatory Notice & Literature Methodology</span>
        </div>
        <p className="mt-1 text-[11px] text-subtle leading-normal">
          {RECEPTOR_PROFILES_REGULATORY_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
