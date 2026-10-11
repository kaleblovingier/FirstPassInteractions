import React, { useState, useMemo } from "react";
import {
  PHARMACOGENES,
  PGX_INTERACTIONS,
  PHARMACOGENOMICS_REGULATORY_DISCLAIMER,
  getGeneById,
  getAllPgxInteractions,
  getInteractionsForGene,
  getTherapeuticAreas,
  detectPgxRisksOnTray,
  type Pharmacogene,
  type PgxInteraction,
  type TherapeuticArea,
  type CpicLevel,
} from "@/lib/drugs/pharmacogenomics";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Dna,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Pill,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SubView = "explorer" | "matrix" | "hla" | "audit";

export function Pharmacogenomics() {
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const add = useDesk((s) => s.add);

  const [subView, setSubView] = useState<SubView>("explorer");
  const [selectedGeneId, setSelectedGeneId] = useState<string>("CYP2D6");
  const [selectedPhenoCode, setSelectedPhenoCode] = useState<string>("PM");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeAreaFilter, setActiveAreaFilter] = useState<string>("All");
  const [activeLevelFilter, setActiveLevelFilter] = useState<string>("All");
  const [recentlyLoadedPreset, setRecentlyLoadedPreset] = useState<string | null>(null);

  // Selected Gene
  const activeGene: Pharmacogene = useMemo(() => {
    return getGeneById(selectedGeneId) ?? PHARMACOGENES[0];
  }, [selectedGeneId]);

  // Selected gene's interactions
  const geneInteractions = useMemo(() => {
    return getInteractionsForGene(activeGene.id);
  }, [activeGene]);

  // Current active phenotype details for active gene
  const activePheno = useMemo(() => {
    return (
      activeGene.phenotypes.find((p) => p.code === selectedPhenoCode) ??
      activeGene.phenotypes[0]
    );
  }, [activeGene, selectedPhenoCode]);

  // Real-time detection of PGx risks for drugs currently on desk
  const trayRisks = useMemo(() => {
    return detectPgxRisksOnTray(selected);
  }, [selected]);

  // Filtered interactions for CPIC Matrix view
  const filteredInteractions = useMemo(() => {
    let list = getAllPgxInteractions();

    if (activeAreaFilter !== "All") {
      list = list.filter((ix) => ix.therapeuticArea === activeAreaFilter);
    }

    if (activeLevelFilter !== "All") {
      list = list.filter((ix) => ix.cpicLevel === activeLevelFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((ix) => {
        return (
          ix.drugName.toLowerCase().includes(q) ||
          ix.drugId.toLowerCase().includes(q) ||
          ix.geneSymbol.toLowerCase().includes(q) ||
          ix.geneId.toLowerCase().includes(q) ||
          ix.molecularMechanism.toLowerCase().includes(q) ||
          ix.phenotypeRisks.some((r) =>
            r.clinicalConsequence.toLowerCase().includes(q) ||
            r.phenotype.toLowerCase().includes(q),
          )
        );
      });
    }

    return list;
  }, [activeAreaFilter, activeLevelFilter, searchQuery]);

  // Handler: 1-tap scenario loader
  function handleLoadPreset(presetId: string, drugs: string[], targetGene: string, pheno: string) {
    load(drugs);
    setSelectedGeneId(targetGene);
    setSelectedPhenoCode(pheno);
    setRecentlyLoadedPreset(presetId);
    setTimeout(() => setRecentlyLoadedPreset(null), 3000);
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* Top Banner / Regulatory Header */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
                <Dna className="size-3.5" />
                CPIC LEVEL A / B CONSENSUS
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3" />
                FD&amp;C Act § 520(o)(1)(E)
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
              Pharmacogenomics &amp; CPIC Mechanism Matrix
            </h2>
            <p className="text-sm text-muted max-w-3xl leading-relaxed">
              Mechanistic translations of human pharmacogenetic polymorphisms: allele functionality,
              phenotypic metabolic flux alterations, HLA groove altered-peptide presentation, and CPIC guideline consensus recommendations.
            </p>
          </div>

          {/* Quick Desk Tray Badge */}
          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/60 bg-bg-sunken/60 p-3">
            <div className="size-10 rounded-lg bg-surface flex items-center justify-center border border-border/50 text-accent">
              <Pill className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted font-medium">Active Desk Tray</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-fg">
                  {selected.length} {selected.length === 1 ? "Drug" : "Drugs"} Loaded
                </span>
                {trayRisks.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
                    <AlertTriangle className="size-3" />
                    {trayRisks.length} PGx Alert{trayRisks.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Disclosure */}
        <div className="mt-4 rounded-xl border border-border/60 bg-bg-sunken/50 p-3.5 text-xs text-muted leading-relaxed">
          <div className="flex items-start gap-2.5">
            <Info className="size-4 shrink-0 text-accent mt-0.5" />
            <p>
              <strong className="text-fg font-semibold">Non-Prescriptive CDS Posture: </strong>
              {PHARMACOGENOMICS_REGULATORY_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation Subtabs */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl bg-bg-sunken p-1.5"
        role="tablist"
        aria-label="Pharmacogenomics view mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subView === "explorer"}
          onClick={() => setSubView("explorer")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            subView === "explorer"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <Dna className="size-4 shrink-0 text-accent" />
          <span>Gene-Drug Mechanism Explorer</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === "matrix"}
          onClick={() => setSubView("matrix")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            subView === "matrix"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <Layers className="size-4 shrink-0 text-teal-500" />
          <span>CPIC Actionability Matrix</span>
          <span className="rounded-full bg-teal-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-600 dark:text-teal-400">
            {PGX_INTERACTIONS.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === "hla"}
          onClick={() => setSubView("hla")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            subView === "hla"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <Sparkles className="size-4 shrink-0 text-amber-500" />
          <span>Molecular HLA Groove Visualizer</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === "audit"}
          onClick={() => setSubView("audit")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            subView === "audit"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <ShieldAlert className="size-4 shrink-0 text-danger" />
          <span>Desk Tray PGx Audit &amp; Presets</span>
          {trayRisks.length > 0 && (
            <span className="rounded-full bg-danger px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {trayRisks.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUBVIEW 1: GENE-DRUG MECHANISM EXPLORER */}
      {/* ============================================================== */}
      {subView === "explorer" && (
        <div className="space-y-6">
          {/* Gene Selector Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-1">
              Pharmacogene:
            </span>
            {PHARMACOGENES.map((gene) => {
              const isSelected = gene.id === selectedGeneId;
              return (
                <button
                  key={gene.id}
                  type="button"
                  onClick={() => {
                    setSelectedGeneId(gene.id);
                    setSelectedPhenoCode(gene.phenotypes[0]?.code ?? "PM");
                  }}
                  className={cn(
                    "min-h-[44px] rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all flex items-center gap-1.5",
                    isSelected
                      ? "bg-accent text-accent-fg shadow-sm scale-[1.02]"
                      : "bg-surface text-fg hover:bg-surface/80 border border-border/60",
                  )}
                >
                  <span>{gene.symbol}</span>
                </button>
              );
            })}
          </div>

          {/* Active Gene Overview Card */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-fg">{activeGene.name}</h3>
                  <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-xs font-bold text-accent">
                    {activeGene.symbol}
                  </span>
                  <span className="rounded-md bg-bg-sunken px-2 py-0.5 font-mono text-xs text-muted border border-border/60">
                    Locus: {activeGene.chromosomeLocation}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-muted">
                  NCBI Entrez ID: {activeGene.ncbiGeneId} • {activeGene.systemRole}
                </div>
              </div>

              {/* 1-Tap Load Primary Substrates */}
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] shrink-0 gap-2 border-border/80 hover:bg-bg-sunken"
                onClick={() => {
                  load(activeGene.primaryDrugs);
                  setRecentlyLoadedPreset(activeGene.id);
                  setTimeout(() => setRecentlyLoadedPreset(null), 2500);
                }}
              >
                {recentlyLoadedPreset === activeGene.id ? (
                  <>
                    <Check className="size-4 text-emerald-500" />
                    <span>Loaded on Desk!</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4 text-accent" />
                    <span>Load {activeGene.primaryDrugs.length} Gene Substrates</span>
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-fg/90 leading-relaxed bg-bg-sunken/40 p-3.5 rounded-xl border border-border/50">
              {activeGene.molecularMechanism}
            </p>

            {/* Phenotype Switcher Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Interactive Metabolizer Phenotype Simulation:
                </span>
                <span className="text-xs text-muted font-mono">
                  {activePheno.activityScoreRange ? `Activity Range: ${activePheno.activityScoreRange}` : ""}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {activeGene.phenotypes.map((pheno) => {
                  const isCur = pheno.code === selectedPhenoCode;
                  const isPm = pheno.code === "PM" || pheno.code === "Deficient" || pheno.code === "Carrier" || pheno.code.includes("High");
                  const isUm = pheno.code === "UM";
                  return (
                    <button
                      key={pheno.code}
                      type="button"
                      onClick={() => setSelectedPhenoCode(pheno.code)}
                      className={cn(
                        "flex min-h-[44px] flex-col justify-center rounded-xl p-3 text-left transition-all border",
                        isCur
                          ? isPm
                            ? "border-danger bg-danger/10 text-danger ring-1 ring-danger"
                            : isUm
                            ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500"
                            : "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                          : "border-border/60 bg-bg-sunken/50 text-fg hover:bg-surface",
                      )}
                    >
                      <div className="font-mono text-sm font-bold flex items-center justify-between">
                        <span>{pheno.code}</span>
                        {isCur && <span className="size-2 rounded-full bg-current" />}
                      </div>
                      <div className="text-[11px] font-medium opacity-90 truncate">
                        {pheno.name}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Phenotype Clinical Profile Box */}
              <div className="mt-3 rounded-xl border border-border/80 bg-bg-sunken p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-fg">
                      {activePheno.name} ({activePheno.code})
                    </span>
                    {activePheno.genotypeExamples.length > 0 && (
                      <span className="font-mono text-xs text-muted bg-surface px-2 py-0.5 rounded border border-border/50">
                        Genotypes: {activePheno.genotypeExamples.join(", ")}
                      </span>
                    )}
                  </div>
                  {activePheno.populationFrequencyNotes && (
                    <span className="text-xs text-muted">
                      {activePheno.populationFrequencyNotes}
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg/80 leading-relaxed">
                  {activePheno.clinicalSummary}
                </p>
              </div>
            </div>

            {/* Metabolic Flux Simulation Model */}
            <MetabolicFluxSimulation
              gene={activeGene}
              phenotype={activePheno}
            />

            {/* Clinical Allele Functionality Catalog Table */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Key Clinical Alleles &amp; Functional Activity Scores ({activeGene.alleles.length} Defined)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-sunken font-mono text-muted uppercase border-b border-border/60">
                    <tr>
                      <th className="p-3">Allele</th>
                      <th className="p-3">Variant / Protein</th>
                      <th className="p-3">Functionality</th>
                      <th className="p-3">Activity Score</th>
                      <th className="p-3">Molecular Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-surface">
                    {activeGene.alleles.map((allele) => {
                      const isNoFunc = allele.functionality === "No Function";
                      const isDec = allele.functionality === "Decreased Function";
                      const isInc = allele.functionality === "Increased Function";
                      return (
                        <tr key={allele.allele} className="hover:bg-bg-sunken/40">
                          <td className="p-3 font-mono font-bold text-fg">{allele.allele}</td>
                          <td className="p-3 font-mono text-muted">
                            {allele.nucleotideChange || allele.proteinChange ? (
                              <span>
                                {allele.nucleotideChange || ""} {allele.proteinChange || ""}
                              </span>
                            ) : (
                              <span className="text-muted/60">{allele.name}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                                isNoFunc
                                  ? "bg-danger/15 text-danger"
                                  : isDec
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : isInc
                                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {allele.functionality}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold">{allele.activityScore}</td>
                          <td className="p-3 text-fg/80">{allele.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gene Citations */}
            <div className="pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Consensus Literature &amp; Guidelines:
              </span>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-muted">
                {activeGene.citations.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW 2: CPIC ACTIONABILITY MATRIX */}
      {/* ============================================================== */}
      {subView === "matrix" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <input
                  type="text"
                  placeholder="Filter by drug, gene (e.g. Clopidogrel, CYP2C19, DPYD), phenotype or hazard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-border/80 bg-bg-sunken pl-10 pr-4 text-xs font-medium text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* CPIC Level Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-medium text-muted mr-1">CPIC Evidence:</span>
                {["All", "Level A", "Level B"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActiveLevelFilter(lvl)}
                    className={cn(
                      "min-h-[44px] rounded-lg px-3 text-xs font-bold transition-all",
                      activeLevelFilter === lvl
                        ? "bg-accent text-accent-fg shadow-sm"
                        : "bg-bg-sunken text-muted hover:text-fg",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Therapeutic Area Filters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
              <span className="text-xs font-medium text-muted mr-1">Therapeutic Area:</span>
              {["All", ...getTherapeuticAreas()].map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setActiveAreaFilter(area)}
                  className={cn(
                    "min-h-[44px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                    activeAreaFilter === area
                      ? "bg-surface text-accent border border-accent/40 shadow-sm"
                      : "bg-bg-sunken text-muted hover:bg-surface/50 hover:text-fg",
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-muted px-1">
            <span>
              Showing <strong className="text-fg">{filteredInteractions.length}</strong> CPIC Guideline Interactions
            </span>
            <span>Guideline consensus updated through CPIC &amp; FDA monographs</span>
          </div>

          {/* Interaction Cards Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredInteractions.map((ix) => {
              const isLevelA = ix.cpicLevel === "Level A";
              const onDesk = selected.includes(ix.drugId);

              return (
                <div
                  key={ix.id}
                  className="rounded-2xl border border-border/80 bg-surface p-5 space-y-4 shadow-sm hover:border-accent/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-fg">{ix.drugName}</h4>
                          <span className="text-muted font-mono text-xs">×</span>
                          <span className="font-mono text-sm font-bold text-accent">
                            {ix.geneSymbol}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-muted">
                          {ix.therapeuticArea}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold",
                            isLevelA
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
                          )}
                        >
                          {ix.cpicLevel}
                        </span>
                        {ix.fdaBoxedWarning && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/30">
                            <AlertOctagon className="size-3" />
                            FDA Boxed Warning
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Molecular Mechanism */}
                    <p className="text-xs text-fg/80 leading-relaxed bg-bg-sunken/40 p-3 rounded-xl border border-border/50">
                      {ix.molecularMechanism}
                    </p>

                    {/* Phenotype Risks List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        Phenotype Translation &amp; Guideline Consensus:
                      </span>
                      {ix.phenotypeRisks.map((risk, idx) => {
                        const isCrit = risk.severity === "critical";
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-xl p-3 text-xs space-y-1.5 border",
                              isCrit
                                ? "bg-danger/10 border-danger/30 text-danger-fg"
                                : "bg-bg-sunken border-border/60",
                            )}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-fg flex items-center gap-1.5">
                                {isCrit && <AlertTriangle className="size-3.5 text-danger shrink-0" />}
                                {risk.phenotype}
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-[10px] uppercase font-bold px-1.5 py-0.2 rounded",
                                  isCrit ? "bg-danger text-white" : "bg-muted/20 text-muted",
                                )}
                              >
                                {risk.severity}
                              </span>
                            </div>
                            <p className="text-fg/90">
                              <strong>Clinical Impact: </strong>
                              {risk.clinicalConsequence}
                            </p>
                            <p className="text-muted leading-relaxed">
                              <strong>Guideline Consensus: </strong>
                              {risk.cpicRecommendation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={ix.guidelineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline min-h-[44px]"
                    >
                      <span>{ix.guidelineTitle}</span>
                      <ExternalLink className="size-3" />
                    </a>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-[44px] text-xs gap-1.5"
                        onClick={() => {
                          setSelectedGeneId(ix.geneId.includes("HLA-B") ? "HLA-B5701" : ix.geneId);
                          setSubView("explorer");
                        }}
                      >
                        <Dna className="size-3.5" />
                        <span>Inspect Gene</span>
                      </Button>

                      <Button
                        variant={onDesk ? "outline" : "default"}
                        size="sm"
                        className="min-h-[44px] text-xs gap-1.5"
                        onClick={() => {
                          if (onDesk) {
                            useDesk.getState().remove(ix.drugId);
                          } else {
                            add(ix.drugId);
                          }
                        }}
                      >
                        {onDesk ? (
                          <>
                            <Check className="size-3.5 text-emerald-500" />
                            <span>On Desk</span>
                          </>
                        ) : (
                          <>
                            <Plus className="size-3.5" />
                            <span>Add to Desk</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW 3: MOLECULAR HLA GROOVE VISUALIZER */}
      {/* ============================================================== */}
      {subView === "hla" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                Structural Immunopharmacology
              </span>
              <h3 className="text-xl font-bold text-fg">
                Molecular Hypersensitivity &amp; MHC Antigen-Binding Cleft Architecture
              </h3>
              <p className="text-sm text-muted max-w-3xl leading-relaxed">
                Classic drug hypersensitivities are governed by non-covalent lodging of small molecules within the peptide-binding grooves of specific Class I Human Leukocyte Antigens (HLA), altering the presented self-peptide repertoire or inducing massive cytotoxic granulysin secretion.
              </p>
            </div>

            {/* Model 1: Abacavir & HLA-B*57:01 F-Pocket Repertoire Shift */}
            <div className="mt-6 rounded-2xl border border-border/80 bg-bg-sunken p-5 space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-accent/20 px-2 py-0.5 font-mono text-xs font-bold text-accent">
                      HLA-B*57:01
                    </span>
                    <h4 className="text-base font-bold text-fg">
                      Abacavir Non-Covalent F-Pocket Insertion &amp; Altered Self-Peptide Repertoire
                    </h4>
                  </div>
                  <span className="text-xs text-muted">
                    Crystal structure model: Illing et al., Nature 2012; 486:554–558
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] shrink-0 gap-2 border-border/80"
                  onClick={() => {
                    load(["abacavir"]);
                    setRecentlyLoadedPreset("abacavir");
                    setTimeout(() => setRecentlyLoadedPreset(null), 2500);
                  }}
                >
                  {recentlyLoadedPreset === "abacavir" ? (
                    <>
                      <Check className="size-4 text-emerald-500" />
                      <span>Loaded Abacavir!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 text-accent" />
                      <span>Load Abacavir on Desk</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Graphic Structural Diagram */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="font-mono text-xs font-bold text-fg">Normal HLA-B*57:01 Cleft</span>
                    <span className="font-mono text-[10px] text-muted">No Drug Present</span>
                  </div>
                  <div className="h-44 rounded-lg bg-bg-sunken flex flex-col items-center justify-center p-4 text-center border border-dashed border-border/80 relative overflow-hidden">
                    <div className="w-48 h-20 border-2 border-muted/40 rounded-t-full flex items-center justify-center bg-muted/10 relative">
                      <span className="text-[11px] font-mono text-muted">Antigen Binding Cleft</span>
                      <div className="absolute -bottom-3 right-8 w-10 h-8 rounded-b-lg border-2 border-accent/40 bg-accent/10 flex items-center justify-center text-[9px] font-mono text-accent">
                        F-Pocket
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-fg font-medium">
                      Hydrophobic Self-Peptide (C-terminal Trp/Phe)
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Normal immune surveillance; thymic negative selection tolerates self-peptides. Zero CD8+ T-cell activation.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-danger/40 bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="font-mono text-xs font-bold text-danger">Abacavir-Bound HLA-B*57:01</span>
                    <span className="font-mono text-[10px] font-bold text-danger uppercase">HSR Trigger</span>
                  </div>
                  <div className="h-44 rounded-lg bg-danger/5 flex flex-col items-center justify-center p-4 text-center border border-dashed border-danger/40 relative overflow-hidden">
                    <div className="w-48 h-20 border-2 border-danger/60 rounded-t-full flex items-center justify-center bg-danger/10 relative">
                      <span className="text-[11px] font-mono text-danger font-bold">Altered Peptide Cleft</span>
                      {/* Abacavir Molecule inside F-pocket */}
                      <div className="absolute -bottom-3 right-8 w-10 h-8 rounded-b-lg border-2 border-danger bg-danger text-white flex items-center justify-center text-[9px] font-mono font-bold animate-pulse">
                        Abacavir
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-danger font-bold">
                      Neo-Self-Peptides (C-terminal Ile/Leu)
                    </div>
                    <p className="mt-1 text-[11px] text-fg/90">
                      Abacavir changes pocket volume/charge. Thousands of unselected neo-self-peptides bind, triggering polyclonal CD8+ T-cell attack &amp; IFN-γ/TNF-α surge.
                    </p>
                  </div>
                </div>
              </div>

              {/* Clinical Takeaway */}
              <div className="rounded-xl border border-border/60 bg-surface p-4 text-xs text-fg/90 space-y-2">
                <div className="flex items-center gap-2 font-bold text-fg">
                  <ShieldAlert className="size-4 text-danger" />
                  <span>Clinical Implementation Consensus (CPIC Level A):</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Pre-treatment genetic screening for HLA-B*57:01 is standard-of-care prior to initiating abacavir. In allele carriers, abacavir is strictly contraindicated. Rechallenge in sensitized individuals causes catastrophic anaphylactic shock and fatal cardiovascular collapse.
                </p>
              </div>
            </div>

            {/* Model 2: Carbamazepine & HLA-B*15:02 / HLA-A*31:01 SJS/TEN */}
            <div className="mt-6 rounded-2xl border border-border/80 bg-bg-sunken p-5 space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-purple-500/20 px-2 py-0.5 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      HLA-B*15:02 &amp; HLA-A*31:01
                    </span>
                    <h4 className="text-base font-bold text-fg">
                      Carbamazepine / Oxcarbazepine Stevens-Johnson Syndrome (SJS/TEN) &amp; Granulysin Pathway
                    </h4>
                  </div>
                  <span className="text-xs text-muted">
                    Pathophysiology: Chung et al., Nature 2004; 428:486
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] shrink-0 gap-2 border-border/80"
                  onClick={() => {
                    load(["carbamazepine", "oxcarbazepine"]);
                    setRecentlyLoadedPreset("cbz");
                    setTimeout(() => setRecentlyLoadedPreset(null), 2500);
                  }}
                >
                  {recentlyLoadedPreset === "cbz" ? (
                    <>
                      <Check className="size-4 text-emerald-500" />
                      <span>Loaded Aromatic AEDs!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 text-accent" />
                      <span>Load Carbamazepine &amp; Oxcarbazepine</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Step Sequence */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-surface p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-accent">
                    <span>01</span>
                    <span>Direct Drug Docking</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Carbamazepine fits into the HLA-B*15:02 / A*31:01 peptide binding groove via pharmacological interaction (p-i concept) without metabolic processing.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-surface p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                    <span>02</span>
                    <span>TCR Engagement</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Specific T-cell receptor clonotypes (Vβ-11) dock against the drug-HLA complex, causing massive stimulation of cytotoxic T lymphocytes (CTLs) and natural killer (NK) cells.
                  </p>
                </div>

                <div className="rounded-xl border border-danger/40 bg-danger/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-danger">
                    <span>03</span>
                    <span>Granulysin Degranulation</span>
                  </div>
                  <p className="text-xs text-danger-fg leading-relaxed">
                    Activated CTLs release massive quantities of 15-kDa granulysin into the skin, far exceeding perforin/granzyme B levels.
                  </p>
                </div>

                <div className="rounded-xl border border-danger/40 bg-danger/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-danger">
                    <span>04</span>
                    <span>Epidermal Necrolysis</span>
                  </div>
                  <p className="text-xs text-danger-fg leading-relaxed">
                    Granulysin permeabilizes keratinocyte mitochondrial membranes, driving apoptotic sheet detachment of the epidermis (SJS/TEN).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBVIEW 4: DESK TRAY PGX AUDIT & HIGH-YIELD LOADERS */}
      {/* ============================================================== */}
      {subView === "audit" && (
        <div className="space-y-6">
          {/* Active Desk Scan Panel */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                  Live Regimen Safety Analysis
                </span>
                <h3 className="text-xl font-bold text-fg">Active Desk Tray Pharmacogenomic Audit</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] text-xs gap-1.5"
                  onClick={() => useDesk.getState().clear()}
                >
                  <RotateCcw className="size-3.5" />
                  <span>Clear Desk</span>
                </Button>
              </div>
            </div>

            {trayRisks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg-sunken/40 p-8 text-center space-y-3">
                <div className="size-12 rounded-full bg-surface border border-border/60 mx-auto flex items-center justify-center text-muted">
                  <ShieldCheck className="size-6 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-fg">
                    {selected.length === 0
                      ? "Desk Tray is Empty"
                      : "No High-Risk CPIC Interactions on Desk"}
                  </h4>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    {selected.length === 0
                      ? "Select drugs from the formulary or load one of the high-yield clinical scenarios below to audit drug-gene collisions."
                      : `The ${selected.length} drugs currently on your desk do not map to major CPIC Level A or B gene warnings. Try testing a candidate from the preset buttons.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-danger uppercase tracking-wider">
                  <AlertTriangle className="size-4" />
                  <span>{trayRisks.length} Actionable Pharmacogenomic Collisions Detected:</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {trayRisks.map((risk) => {
                    const isCrit = risk.severity === "critical";
                    return (
                      <div
                        key={risk.id}
                        className={cn(
                          "rounded-xl border p-4 space-y-2.5 transition-all",
                          isCrit
                            ? "bg-danger/10 border-danger/40 text-danger-fg"
                            : "bg-surface border-border/80",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-sm text-fg">{risk.drugName}</h5>
                              <span className="font-mono text-xs text-muted">×</span>
                              <span className="font-mono text-xs font-bold text-accent">
                                {risk.geneSymbol}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-muted">
                              {risk.therapeuticArea}
                            </span>
                          </div>

                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                              isCrit ? "bg-danger text-white" : "bg-accent/15 text-accent",
                            )}
                          >
                            {risk.cpicLevel} • {risk.severity}
                          </span>
                        </div>

                        <p className="text-xs text-fg/90 leading-relaxed font-medium">
                          {risk.headline}
                        </p>
                        <p className="text-xs text-muted leading-relaxed">
                          {risk.consensusGuideline}
                        </p>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGeneId(risk.geneId.includes("HLA-B") ? "HLA-B5701" : risk.geneId);
                              setSubView("explorer");
                            }}
                            className="font-mono text-xs font-bold text-accent hover:underline flex items-center gap-1 min-h-[44px]"
                          >
                            <span>Inspect {risk.geneSymbol} Explorer</span>
                            <ChevronRight className="size-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => useDesk.getState().remove(risk.drugId)}
                            className="font-mono text-xs text-muted hover:text-danger min-h-[44px] px-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 1-Tap Clinical Scenario Loaders */}
          <div className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
            <div>
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                Clinical Simulation Presets
              </span>
              <h3 className="text-lg font-bold text-fg">
                1-Tap High-Yield Pharmacogenomic Challenge Scenarios
              </h3>
              <p className="text-xs text-muted">
                Quickly populate your desk tray with classic USMLE / clinical pharmacology drug-gene collision regimens.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Preset 1: Clopidogrel PCI */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("pci-clop", ["clopidogrel"], "CYP2C19", "PM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Cardiology / PCI</span>
                    <span>CYP2C19</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Clopidogrel Stent Thrombosis Hazard
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Prodrug bioactivation failure in CYP2C19 *2/*3 PMs leading to platelet reactivity and acute stent occlusion.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Clopidogrel</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 2: Abacavir HSR */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("abacavir-hsr", ["abacavir"], "HLA-B5701", "Carrier")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Infectious Disease</span>
                    <span>HLA-B*57:01</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Abacavir Fatal Hypersensitivity
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Non-covalent F-pocket binding altering presented self-peptide repertoire; strict mandatory screening.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Abacavir</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 3: Warfarin Sensitivity */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("warf-sens", ["warfarin"], "CYP2C9", "PM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Cardiology / Hematology</span>
                    <span>CYP2C9 / VKORC1</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Warfarin Bleeding &amp; Sensitivity Collision
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    S-warfarin clearance failure (*2, *3) combined with VKORC1 -1639A target enzyme depletion.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Warfarin</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 4: 5-FU DPYD Deficiency */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("fu-dpyd", ["fluorouracil", "capecitabine"], "DPYD", "PM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Oncology GI</span>
                    <span>DPYD</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Fluorouracil / Capecitabine Lethal Toxicity
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    DPD deficiency eliminates &gt;80% catabolic clearance, causing catastrophic mucositis &amp; neutropenic sepsis.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load 5-FU &amp; Capecitabine</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 5: Azathioprine TPMT/NUDT15 */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("aza-tpmt", ["azathioprine", "mercaptopurine"], "TPMT", "PM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Rheumatology / Oncology</span>
                    <span>TPMT &amp; NUDT15</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Thiopurine Pancytopenia &amp; Myelosuppression
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Shunting into 6-TGN and failure to sanitize thio-dGTP leading to bone marrow arrest.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Azathioprine &amp; 6-MP</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 6: Codeine & Tramadol CYP2D6 */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("opioid-2d6", ["codeine", "tramadol"], "CYP2D6", "UM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Analgesia / Anesthesia</span>
                    <span>CYP2D6</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Opioid Prodrug Ultrarapid Overdose Hazard
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Gene duplication (*1xN) generating rapid surges of morphine and M1, causing fatal respiratory depression.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Codeine &amp; Tramadol</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 7: Rasburicase G6PD Hemolysis */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("rasb-g6pd", ["rasburicase"], "G6PD", "Deficient")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Oncology Hematology</span>
                    <span>G6PD</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Rasburicase Oxidative Hemolysis Crisis
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Hydrogen peroxide flux overwhelms G6PD-deficient erythrocytes; Heinz bodies and severe hemolysis.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Rasburicase</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 8: Voriconazole Neurotoxicity */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("vori-2c19", ["voriconazole"], "CYP2C19", "PM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Infectious Disease</span>
                    <span>CYP2C19</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Voriconazole Supratherapeutic Neurotoxicity
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Poor metabolizers experience 4-fold elevated trough levels, visual hallucinations, and hepatic injury.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Voriconazole</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>

              {/* Preset 9: Tricyclic Antidepressant CYP2D6 */}
              <button
                type="button"
                onClick={() =>
                  handleLoadPreset("tca-2d6", ["amitriptyline", "nortriptyline"], "CYP2D6", "PM")
                }
                className="flex min-h-[44px] flex-col justify-between rounded-xl border border-border/80 bg-bg-sunken p-4 text-left hover:border-accent hover:bg-surface transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-accent">
                    <span>Psychiatry</span>
                    <span>CYP2D6</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-fg group-hover:text-accent">
                    Tricyclic Antidepressant Cardiotoxicity
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Defective 10-hydroxylation causing plasma accumulation, QTc prolongation, and ventricular arrhythmia risks.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-accent">
                  <span>Load Amitriptyline &amp; Nortriptyline</span>
                  <ArrowRight className="size-3" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * METABOLIC FLUX SIMULATION DIAGRAM COMPONENT
 */
function MetabolicFluxSimulation({
  gene,
  phenotype,
}: {
  gene: Pharmacogene;
  phenotype: { code: string; name: string };
}) {
  // Dynamically calculate pathway fluxes based on gene and phenotype
  const fluxData = useMemo(() => {
    const isPm = phenotype.code === "PM" || phenotype.code === "Deficient" || phenotype.code.includes("High");
    const isIm = phenotype.code === "IM" || phenotype.code.includes("Moderate");
    const isUm = phenotype.code === "UM";

    switch (gene.id) {
      case "CYP2D6": {
        // Codeine flux model
        const primaryBioactivation = isPm ? 0 : isIm ? 5 : isUm ? 50 : 10;
        const alternativeInactivation = isPm ? 90 : isIm ? 85 : isUm ? 40 : 80;
        const unchangedElimination = 100 - primaryBioactivation - alternativeInactivation;

        return {
          title: "CYP2D6 Codeine Biotransformation Flux Simulation",
          probeDrug: "Codeine",
          paths: [
            {
              name: "Bioactivation to Morphine (CYP2D6)",
              percentage: primaryBioactivation,
              color: isPm ? "bg-muted" : isUm ? "bg-danger animate-pulse" : "bg-emerald-500",
              note: isPm
                ? "0% conversion -> Bioactivation failure (No analgesia)"
                : isUm
                ? "50% conversion -> Massive morphine surge (Respiratory depression hazard!)"
                : "10% conversion -> Standard expected therapeutic analgesia",
            },
            {
              name: "Inactivation to Norcodeine (CYP3A4)",
              percentage: alternativeInactivation,
              color: "bg-accent",
              note: "Alternative hepatic clearance path to inactive metabolite",
            },
            {
              name: "Unchanged Renal Excretion",
              percentage: unchangedElimination,
              color: "bg-teal-500",
              note: "Glucuronidation (UGT2B7) and renal elimination",
            },
          ],
        };
      }

      case "CYP2C19": {
        // Clopidogrel flux model
        const activeThiolFlux = isPm ? 1 : isIm ? 6 : isUm ? 25 : 15;
        const esteraseInactivation = 100 - activeThiolFlux;

        return {
          title: "CYP2C19 Clopidogrel Platelet Inhibition Flux Simulation",
          probeDrug: "Clopidogrel",
          paths: [
            {
              name: "2-Step CYP Bioactivation to Active Thiol (CYP2C19)",
              percentage: activeThiolFlux,
              color: isPm ? "bg-danger animate-pulse" : isUm ? "bg-purple-500" : "bg-emerald-500",
              note: isPm
                ? "1% flux -> Severe bioactivation block (High Stent Thrombosis Hazard)"
                : isUm
                ? "25% flux -> Hyper-bioactivation (Increased bleeding tendency)"
                : "15% flux -> Normal irreversible P2Y12 platelet inhibition",
            },
            {
              name: "Serum Carboxylesterase Hydrolysis (Inactive)",
              percentage: esteraseInactivation,
              color: "bg-accent",
              note: "Hydrolysis to inactive carboxylic acid metabolite SR26334",
            },
          ],
        };
      }

      case "DPYD": {
        // 5-FU Catabolism model
        const dpdCatabolism = isPm ? 2 : isIm ? 45 : 85;
        const cytotoxicAnabolism = isPm ? 75 : isIm ? 35 : 5;
        const renalExcretion = 100 - dpdCatabolism - cytotoxicAnabolism;

        return {
          title: "DPYD 5-Fluorouracil Catabolic vs Cytotoxic Anabolic Flux",
          probeDrug: "Fluorouracil (5-FU)",
          paths: [
            {
              name: "Hepatic DPD Catabolism to DHFU (Safe Inactivation)",
              percentage: dpdCatabolism,
              color: isPm ? "bg-muted" : "bg-emerald-500",
              note: isPm
                ? "2% catabolism -> Inactivation failure (Drug accumulation)"
                : "85% catabolism -> Normal rapid physiologic elimination",
            },
            {
              name: "Cytotoxic Tissue Anabolism (FdUMP / FUTP / FdUTP)",
              percentage: cytotoxicAnabolism,
              color: isPm ? "bg-danger animate-pulse" : isIm ? "bg-amber-500" : "bg-muted",
              note: isPm
                ? "75% flux -> Massive cellular accumulation (Lethal mucositis & neutropenic sepsis!)"
                : "5% flux -> Standard narrow-window antineoplastic cytotoxicity",
            },
            {
              name: "Unchanged Excretion",
              percentage: renalExcretion,
              color: "bg-teal-500",
              note: "Minor urinary excretion of intact parent drug",
            },
          ],
        };
      }

      case "TPMT":
      case "NUDT15": {
        // Azathioprine / 6-MP
        const safeMethylation = isPm ? 2 : isIm ? 40 : 80;
        const cytotoxic6TGN = isPm ? 85 : isIm ? 45 : 10;
        const otherExcretion = 100 - safeMethylation - cytotoxic6TGN;

        return {
          title: "TPMT / NUDT15 Thiopurine Methylation vs 6-TGN Shunt Flux",
          probeDrug: "Azathioprine / 6-MP",
          paths: [
            {
              name: "S-Methylation to 6-MMP (TPMT Inactivation)",
              percentage: safeMethylation,
              color: isPm ? "bg-muted" : "bg-emerald-500",
              note: isPm ? "2% -> Complete loss of inactivation" : "80% -> Safe enzymatic clearance",
            },
            {
              name: "HGPRT Shunt to Cytotoxic 6-TGN & DNA Misincorporation",
              percentage: cytotoxic6TGN,
              color: isPm ? "bg-danger animate-pulse" : isIm ? "bg-amber-500" : "bg-muted",
              note: isPm
                ? "85% shunt -> Lethal myelosuppression & severe pancytopenia!"
                : "10% -> Controlled therapeutic incorporation",
            },
            {
              name: "Xanthine Oxidase Conversion to Thiouric Acid",
              percentage: otherExcretion,
              color: "bg-accent",
              note: "Oxidative catabolism (blocked by allopurinol)",
            },
          ],
        };
      }

      default: {
        // Generic enzymatic clearance
        const clearanceFlux = isPm ? 15 : isIm ? 50 : isUm ? 95 : 75;
        const retentionFlux = 100 - clearanceFlux;

        return {
          title: `${gene.symbol} Clearance Flux Simulation`,
          probeDrug: gene.primaryDrugs[0] ? DRUG_BY_ID[gene.primaryDrugs[0]]?.name ?? gene.primaryDrugs[0] : "Target Drug",
          paths: [
            {
              name: "Metabolic Clearance Flux",
              percentage: clearanceFlux,
              color: isPm ? "bg-amber-500" : "bg-emerald-500",
              note: isPm ? "Markedly delayed systemic clearance" : "Normal clearance rate",
            },
            {
              name: "Circulating Parent Retention / Accumulation",
              percentage: retentionFlux,
              color: isPm ? "bg-danger animate-pulse" : "bg-accent",
              note: isPm ? "Severe drug retention / toxicity risk" : "Standard steady-state clearance",
            },
          ],
        };
      }
    }
  }, [gene, phenotype]);

  return (
    <div className="rounded-xl border border-border/80 bg-bg-sunken p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold">
            Simulated Metabolic Flux
          </span>
          <h4 className="text-sm font-bold text-fg flex items-center gap-2">
            <Activity className="size-4 text-accent" />
            <span>{fluxData.title}</span>
          </h4>
        </div>
        <span className="font-mono text-xs font-semibold text-accent bg-surface px-2.5 py-1 rounded-md border border-border/50">
          Probe: {fluxData.probeDrug} ({phenotype.code})
        </span>
      </div>

      <div className="space-y-3">
        {fluxData.paths.map((p, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-fg">{p.name}</span>
              <span className="font-mono font-bold text-fg">{p.percentage}%</span>
            </div>
            {/* Progress bar */}
            <div className="h-3 w-full rounded-full bg-surface border border-border/60 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", p.color)}
                style={{ width: `${p.percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-muted italic">{p.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
