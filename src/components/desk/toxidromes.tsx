import React, { useMemo, useState } from "react";
import {
  CLASSICAL_TOXIDROMES,
  ANTIDOTE_PATHWAYS,
  TOXIDROME_DISCRIMINATOR_MATRIX,
  TOXIDROME_REGULATORY_DISCLAIMER,
  getAllToxidromes,
  getToxidromeById,
  getAllAntidotes,
  getAntidoteById,
  matchToxidromeSigns,
  detectToxidromesOnTray,
  type ClassicalToxidromeId,
  type ClassicalToxidrome,
  type AntidotePathway,
  type ToxidromeObservedSigns,
  type DiscriminatorRow,
} from "@/lib/drugs/toxidromes";
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
  ChevronDown,
  ChevronRight,
  Clock,
  Droplets,
  ExternalLink,
  Eye,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Microscope,
  Pill,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SimulatorViewMode = "matrix" | "toxidromes" | "antidotes" | "assistant";
type MatrixFilterCategory = "all" | "vitals" | "pupils" | "skin" | "peristalsis" | "reflexes" | "mentalStatus";

export function ToxidromeSimulator() {
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const add = useDesk((s) => s.add);

  const [viewMode, setViewMode] = useState<SimulatorViewMode>("matrix");
  const [selectedToxidromeId, setSelectedToxidromeId] = useState<ClassicalToxidromeId>("anticholinergic");
  const [selectedAntidoteId, setSelectedAntidoteId] = useState<string>("nac-acetaminophen");
  const [matrixFilter, setMatrixFilter] = useState<MatrixFilterCategory>("all");
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
  const [recentlyLoadedTray, setRecentlyLoadedTray] = useState<string | null>(null);

  // Diagnostic Assistant State
  const [observedSigns, setObservedSigns] = useState<ToxidromeObservedSigns>({
    pupils: undefined,
    skin: undefined,
    heartRate: undefined,
    bloodPressure: undefined,
    respiratoryRate: undefined,
    temperature: undefined,
    bowelSounds: undefined,
    neuromuscular: undefined,
    mentalStatus: undefined,
  });

  // Active inspected toxidrome & antidote
  const activeToxidrome = useMemo(() => {
    return getToxidromeById(selectedToxidromeId) ?? CLASSICAL_TOXIDROMES[0];
  }, [selectedToxidromeId]);

  const activeAntidote = useMemo(() => {
    return getAntidoteById(selectedAntidoteId) ?? ANTIDOTE_PATHWAYS[0];
  }, [selectedAntidoteId]);

  // Detected toxidromes and antidotes on the current desk tray
  const trayResults = useMemo(() => {
    return detectToxidromesOnTray(selected);
  }, [selected]);

  // Diagnostic matcher results
  const diagnosticMatches = useMemo(() => {
    return matchToxidromeSigns(observedSigns);
  }, [observedSigns]);

  const activeObservedCount = useMemo(() => {
    return Object.values(observedSigns).filter((v) => v !== undefined && v !== "normal").length;
  }, [observedSigns]);

  // Filtered matrix rows
  const filteredMatrixRows = useMemo(() => {
    if (matrixFilter === "all") return TOXIDROME_DISCRIMINATOR_MATRIX;
    return TOXIDROME_DISCRIMINATOR_MATRIX.filter((r) => r.category === matrixFilter);
  }, [matrixFilter]);

  function handleLoadSampleTray(name: string, ids: string[]) {
    load(ids);
    setRecentlyLoadedTray(name);
    setTimeout(() => setRecentlyLoadedTray(null), 3000);
  }

  function handleAddDrug(drugId: string) {
    add(drugId);
  }

  function resetAssistant() {
    setObservedSigns({
      pupils: undefined,
      skin: undefined,
      heartRate: undefined,
      bloodPressure: undefined,
      respiratoryRate: undefined,
      temperature: undefined,
      bowelSounds: undefined,
      neuromuscular: undefined,
      mentalStatus: undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
                <HeartPulse className="size-5" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                Medical Toxicology & Cellular Pharmacology
              </p>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Toxidrome &amp; Antidotal Mechanism Simulator
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted sm:text-base">
              Classical vegetative toxidrome profiling, side-by-side discriminator matrices, molecular
              antidote pathways, and clinical sign matching under non-prescriptive CDS posture.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-fg hover:bg-surface transition-colors"
            >
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>FD&amp;C Act § 520(o)(1)(E)</span>
            </button>
          </div>
        </div>

        {/* Regulatory Disclaimer Drawer */}
        {showDisclaimer && (
          <div className="mt-4 rounded-lg border border-border/80 bg-bg-sunken p-4 text-xs leading-relaxed text-muted animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="space-y-1">
                <p className="font-semibold text-fg">Non-Device Clinical Decision Support Reference</p>
                <p>{TOXIDROME_REGULATORY_DISCLAIMER}</p>
              </div>
            </div>
          </div>
        )}

        {/* Active Desk Tray Toxidrome Alerts */}
        {trayResults.length > 0 && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 sm:p-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-500" />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
                    Active Desk Toxidrome Detection ({trayResults.length} {trayResults.length === 1 ? "pattern" : "patterns"})
                  </p>
                  <span className="text-[11px] font-mono text-muted">
                    Evaluated from {selected.length} tray agents
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {trayResults.map((res, idx) => (
                    <div
                      key={`${res.toxidrome?.id ?? "pathway"}-${idx}`}
                      className="rounded-lg border border-border bg-surface p-3 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-fg">
                          {res.toxidrome ? res.toxidrome.name : res.antidotePathway?.targetToxicity}
                        </span>
                        {res.matchedAntidoteDrugIds.length > 0 ? (
                          <Badge tone="ok" className="border-emerald-500 text-emerald-500 text-[10px] bg-emerald-500/10">
                            Antidote On Desk
                          </Badge>
                        ) : (
                          <Badge tone="warn" className="border-amber-500 text-amber-500 text-[10px] bg-amber-500/10">
                            Antidote Missing
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted">
                        <span className="font-medium text-fg">Causative agents: </span>
                        {res.matchedCausativeDrugNames.join(", ")}
                      </div>

                      {res.recommendedAntidoteName && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
                          <span className="text-xs text-muted">
                            Antidote: <strong className="text-fg">{res.recommendedAntidoteName}</strong>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {res.antidotePathway && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAntidoteId(res.antidotePathway!.id);
                                  setViewMode("antidotes");
                                }}
                                className="min-h-[36px] px-2 text-[11px] font-medium text-accent hover:underline inline-flex items-center gap-1"
                              >
                                View Pathway
                                <ArrowRight className="size-3" />
                              </button>
                            )}

                            {res.recommendedAntidoteDrugId && !res.matchedAntidoteDrugIds.includes(res.recommendedAntidoteDrugId) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddDrug(res.recommendedAntidoteDrugId!)}
                                className="min-h-[36px] text-xs gap-1 border-accent/40 text-accent hover:bg-accent/10"
                              >
                                <Plus className="size-3" />
                                Add to Desk
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Sample Tray Presets */}
        <div className="mt-4 pt-4 border-t border-border/70 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Educational Presets:</span>
          <button
            type="button"
            onClick={() => handleLoadSampleTray("Opioid Triad", ["fentanyl", "morphine"])}
            className="min-h-[36px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            Opioid Overdose
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTray("Anticholinergic", ["diphenhydramine", "amitriptyline", "atropine"])}
            className="min-h-[36px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            Anticholinergic Delirium
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTray("Cholinergic", ["malathion", "physostigmine"])}
            className="min-h-[36px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            Organophosphate Crisis
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTray("Sympathomimetic", ["cocaine", "methamphetamine"])}
            className="min-h-[36px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            Sympathomimetic Storm
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTray("Acetaminophen Toxicity", ["acetaminophen"])}
            className="min-h-[36px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            Acetaminophen Ingestion
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTray("CCB Shock", ["verapamil", "diltiazem"])}
            className="min-h-[36px] rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2 transition-colors"
          >
            CCB Cardiotoxic Shock
          </button>

          {recentlyLoadedTray && (
            <span className="text-xs font-medium text-emerald-500 flex items-center gap-1 animate-in fade-in">
              <Check className="size-3.5" />
              Loaded {recentlyLoadedTray} onto desk
            </span>
          )}
        </div>
      </section>

      {/* Main View Mode Navigation Tabs */}
      <section aria-label="Simulator View Tabs" className="space-y-4">
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl bg-bg-sunken p-1.5"
          role="tablist"
          aria-label="Simulator Module View Mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "matrix"}
            onClick={() => setViewMode("matrix")}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
              viewMode === "matrix"
                ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                : "text-muted hover:bg-surface/50 hover:text-fg",
            )}
          >
            <Layers className="size-4 shrink-0 text-cyan-500" />
            <span>Discriminator Matrix</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "toxidromes"}
            onClick={() => setViewMode("toxidromes")}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
              viewMode === "toxidromes"
                ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                : "text-muted hover:bg-surface/50 hover:text-fg",
            )}
          >
            <Flame className="size-4 shrink-0 text-amber-500" />
            <span>6 Classical Toxidromes</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "antidotes"}
            onClick={() => setViewMode("antidotes")}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
              viewMode === "antidotes"
                ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                : "text-muted hover:bg-surface/50 hover:text-fg",
            )}
          >
            <Microscope className="size-4 shrink-0 text-emerald-500" />
            <span>10 Antidote Pathways</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "assistant"}
            onClick={() => setViewMode("assistant")}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
              viewMode === "assistant"
                ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                : "text-muted hover:bg-surface/50 hover:text-fg",
            )}
          >
            <Stethoscope className="size-4 shrink-0 text-rose-500" />
            <span>Diagnostic Assistant</span>
            {activeObservedCount > 0 && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-500">
                {activeObservedCount}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* VIEW 1: Discriminator Matrix */}
      {viewMode === "matrix" && (
        <section aria-label="Toxidrome Discriminator Matrix" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-fg sm:text-xl">
                Toxidrome Discriminator Matrix
              </h2>
              <p className="text-xs text-muted sm:text-sm">
                Side-by-side comparative analysis highlighting pathognomonic physical signs and key discriminators.
              </p>
            </div>

            {/* Matrix Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted mr-1">Focus Filter:</span>
              {(
                [
                  ["all", "All"],
                  ["skin", "Sweating vs Dry Skin"],
                  ["pupils", "Pupils"],
                  ["reflexes", "Reflexes & Clonus"],
                  ["peristalsis", "Bowel & Bladder"],
                  ["vitals", "Vitals"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMatrixFilter(key as MatrixFilterCategory)}
                  className={cn(
                    "min-h-[36px] rounded-md px-2.5 text-xs font-medium transition-colors",
                    matrixFilter === key
                      ? "bg-accent text-accent-fg font-semibold shadow-xs"
                      : "bg-surface-2 text-muted hover:bg-surface hover:text-fg border border-border",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-border)]">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-muted font-medium">
                  <th className="p-3 sm:p-4 w-48 font-semibold text-fg">Clinical Parameter</th>
                  <th className="p-3 sm:p-4 text-amber-500">Anticholinergic</th>
                  <th className="p-3 sm:p-4 text-emerald-500">Cholinergic</th>
                  <th className="p-3 sm:p-4 text-indigo-500">Opioid</th>
                  <th className="p-3 sm:p-4 text-rose-500">Sympathomimetic</th>
                  <th className="p-3 sm:p-4 text-cyan-500">Sedative-Hypnotic</th>
                  <th className="p-3 sm:p-4 text-purple-500">Serotonergic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMatrixRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-surface-2/60 transition-colors"
                  >
                    <td className="p-3 sm:p-4 font-semibold text-fg bg-surface-2/30 align-top">
                      <div className="space-y-1">
                        <div>{row.parameter}</div>
                        {row.discriminatorHighlight && (
                          <div className="text-[11px] font-normal leading-tight text-accent">
                            {row.discriminatorHighlight}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-fg/90 align-top leading-relaxed">
                      {row.anticholinergic}
                    </td>
                    <td className="p-3 sm:p-4 text-fg/90 align-top leading-relaxed">
                      {row.cholinergic}
                    </td>
                    <td className="p-3 sm:p-4 text-fg/90 align-top leading-relaxed">
                      {row.opioid}
                    </td>
                    <td className="p-3 sm:p-4 text-fg/90 align-top leading-relaxed">
                      {row.sympathomimetic}
                    </td>
                    <td className="p-3 sm:p-4 text-fg/90 align-top leading-relaxed">
                      {row.sedativeHypnotic}
                    </td>
                    <td className="p-3 sm:p-4 text-fg/90 align-top leading-relaxed">
                      {row.serotonergic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-accent" />
              Tip: Click on <strong>6 Classical Toxidromes</strong> or <strong>10 Antidote Pathways</strong> to explore full molecular cards.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode("assistant")}
              className="text-xs min-h-[36px]"
            >
              Test with Diagnostic Assistant
            </Button>
          </div>
        </section>
      )}

      {/* VIEW 2: 6 Classical Toxidromes */}
      {viewMode === "toxidromes" && (
        <section aria-label="Classical Toxidromes Explorer" className="space-y-5">
          {/* Toxidrome Selector Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CLASSICAL_TOXIDROMES.map((t) => {
              const isSelected = selectedToxidromeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedToxidromeId(t.id)}
                  className={cn(
                    "flex min-h-[48px] flex-col items-start justify-center rounded-lg border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                      : "border-border bg-surface text-fg hover:bg-surface-2",
                  )}
                >
                  <span className="text-xs truncate font-bold">{t.name.replace(" Toxidrome", "")}</span>
                  <span className="text-[10px] text-muted truncate">
                    {t.id === "anticholinergic" && "Anhidrosis & Delirium"}
                    {t.id === "cholinergic" && "SLUDGEM & Killer Bs"}
                    {t.id === "opioid" && "Miosis & Bradypnea"}
                    {t.id === "sympathomimetic" && "Diaphoresis & Surge"}
                    {t.id === "sedative-hypnotic" && "Midposition & Coma"}
                    {t.id === "serotonergic" && "Hunter Clonus & Fever"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Toxidrome Detailed Profile Card */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="accent" className="border-accent text-accent uppercase font-mono text-[10px]">
                    Classical Toxidrome
                  </Badge>
                  <span className="text-xs font-mono text-muted">ID: {activeToxidrome.id}</span>
                </div>
                <h2 className="mt-1 font-serif text-2xl font-bold text-fg sm:text-3xl">
                  {activeToxidrome.name}
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed max-w-3xl">
                  {activeToxidrome.headlineSummary}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadSampleTray(activeToxidrome.name, activeToxidrome.associatedDrugIds)}
                  className="min-h-[44px] text-xs gap-1.5"
                >
                  <Pill className="size-4 text-accent" />
                  Load Agents to Tray
                </Button>
              </div>
            </div>

            {/* Classical Mnemonic Banner */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Classical Teaching Mnemonic
                </h3>
              </div>
              <p className="font-serif text-base sm:text-lg font-bold text-fg italic">
                "{activeToxidrome.classicalMnemonic}"
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                {activeToxidrome.mnemonicItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-surface p-3 space-y-1">
                    <p className="font-bold text-xs text-amber-600 dark:text-amber-400">{item.phrase}</p>
                    <p className="font-semibold text-xs text-fg">{item.manifestation}</p>
                    <p className="text-[11px] text-muted leading-relaxed">{item.physiologicalBasis}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Physical Exam Signs Grid */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
                Systemic Physical Examination Sign Profile
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                    <HeartPulse className="size-3.5 text-rose-500" />
                    <span>Vital Signs</span>
                  </div>
                  <ul className="text-xs text-muted space-y-0.5 pt-1">
                    <li><strong className="text-fg">HR:</strong> {activeToxidrome.signs.vitals.heartRate}</li>
                    <li><strong className="text-fg">BP:</strong> {activeToxidrome.signs.vitals.bloodPressure}</li>
                    <li><strong className="text-fg">RR:</strong> {activeToxidrome.signs.vitals.respiratoryRate}</li>
                    <li><strong className="text-fg">Temp:</strong> {activeToxidrome.signs.vitals.temperature}</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                    <Eye className="size-3.5 text-indigo-500" />
                    <span>Pupils &amp; Eyes</span>
                  </div>
                  <p className="text-xs text-muted pt-1 leading-relaxed">
                    {activeToxidrome.signs.pupils}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                    <Droplets className="size-3.5 text-cyan-500" />
                    <span>Skin &amp; Moisture</span>
                  </div>
                  <p className="text-xs text-muted pt-1 leading-relaxed">
                    {activeToxidrome.signs.skin}
                  </p>
                  <p className="text-[11px] text-muted">
                    <strong>Mucosa:</strong> {activeToxidrome.signs.mucousMembranes}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                    <Activity className="size-3.5 text-purple-500" />
                    <span>Neuromuscular &amp; Mental</span>
                  </div>
                  <p className="text-xs text-muted pt-1 leading-relaxed">
                    {activeToxidrome.signs.neuromuscular}
                  </p>
                  <p className="text-[11px] text-muted">
                    <strong>CNS:</strong> {activeToxidrome.signs.mentalStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Discriminators */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
                Key Discriminating Physical Findings
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeToxidrome.keyDiscriminators.map((disc, idx) => (
                  <div key={idx} className="rounded-lg border border-accent/30 bg-accent-soft/20 p-3.5 space-y-1.5">
                    <p className="font-bold text-xs text-accent uppercase tracking-wide">{disc.feature}</p>
                    <p className="text-xs text-fg leading-relaxed">{disc.description}</p>
                    <p className="text-[11px] text-muted italic">Comparison: {disc.discriminatingComparison}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pathophysiology & Antidote Summary */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
                  Cellular Pathophysiology
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  {activeToxidrome.pathophysiology}
                </p>

                <div className="pt-2">
                  <p className="text-xs font-semibold text-fg mb-1.5">Causative Agent Classes:</p>
                  <div className="space-y-2">
                    {activeToxidrome.causativeAgentGroups.map((grp, idx) => (
                      <div key={idx} className="rounded-md border border-border p-2.5 text-xs space-y-1">
                        <div className="font-semibold text-fg">{grp.name}</div>
                        <div className="text-muted text-[11px]">{grp.mechanism}</div>
                        <div className="text-[11px] text-muted">
                          Examples: {grp.representativeExamples.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted">
                  Primary Antidotal Mechanism
                </h3>
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                      {activeToxidrome.primaryAntidote.name}
                    </span>
                    {activeToxidrome.primaryAntidote.antidoteDrugId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddDrug(activeToxidrome.primaryAntidote.antidoteDrugId!)}
                        className="min-h-[36px] text-xs gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Plus className="size-3" />
                        Add Antidote
                      </Button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-fg leading-relaxed">
                    {activeToxidrome.primaryAntidote.mechanismSummary}
                  </p>
                  <p className="text-xs text-muted">
                    <strong>Compartmental Action:</strong> {activeToxidrome.primaryAntidote.centralVsPeripheral}
                  </p>

                  <div className="space-y-1 pt-1 border-t border-emerald-500/30">
                    <p className="text-[11px] font-semibold text-fg">Clinical Pearls &amp; Warnings:</p>
                    <ul className="list-disc list-inside text-[11px] text-muted space-y-1">
                      {activeToxidrome.primaryAntidote.clinicalPearls.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                      {activeToxidrome.primaryAntidote.boxedWarningsOrContraindications.map((w, idx) => (
                        <li key={idx} className="text-rose-500 font-medium">{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-fg">Adjunctive Management Protocols:</p>
                  <ul className="list-disc list-inside text-xs text-muted space-y-0.5">
                    {activeToxidrome.adjunctiveManagement.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIEW 3: 10 Molecular Antidote Pathways */}
      {viewMode === "antidotes" && (
        <section aria-label="Molecular Antidote Pathways" className="space-y-5">
          {/* Antidote Pathway Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {ANTIDOTE_PATHWAYS.map((a) => {
              const isSelected = selectedAntidoteId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAntidoteId(a.id)}
                  className={cn(
                    "flex min-h-[48px] flex-col items-start justify-center rounded-lg border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                      : "border-border bg-surface text-fg hover:bg-surface-2",
                  )}
                >
                  <span className="text-xs truncate font-bold">{a.name}</span>
                  <span className="text-[10px] text-muted truncate">{a.targetToxicity}</span>
                </button>
              );
            })}
          </div>

          {/* Active Antidote Pathway Molecular Card */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="ok" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 uppercase font-mono text-[10px]">
                    Molecular Antidote Pathway
                  </Badge>
                  <span className="text-xs font-mono text-muted">{activeAntidote.biochemicalClassification}</span>
                </div>
                <h2 className="mt-1 font-serif text-2xl font-bold text-fg sm:text-3xl">
                  {activeAntidote.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-accent">
                  Target Indication: {activeAntidote.targetToxicity}
                </p>
                <p className="mt-1 text-sm text-muted leading-relaxed max-w-3xl">
                  {activeAntidote.molecularMechanismSummary}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddDrug(activeAntidote.antidoteDrugId)}
                  className="min-h-[44px] text-xs gap-1.5"
                >
                  <Plus className="size-4 text-emerald-500" />
                  Add {activeAntidote.name.split(" ")[0]} to Desk
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadSampleTray(activeAntidote.name, [activeAntidote.antidoteDrugId, ...activeAntidote.toxinDrugIds])}
                  className="min-h-[44px] text-xs gap-1.5"
                >
                  <Layers className="size-4 text-accent" />
                  Load Pair
                </Button>
              </div>
            </div>

            {/* Step-by-Step Biochemical Molecular Cascade */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted flex items-center gap-2">
                <Microscope className="size-4 text-emerald-500" />
                Step-by-Step Molecular Reaction Cascade
              </h3>

              <div className="space-y-3">
                {activeAntidote.stepByStepCascade.map((step) => (
                  <div
                    key={step.step}
                    className="flex flex-col sm:flex-row items-start gap-3 rounded-lg border border-border bg-surface-2/60 p-3.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      {step.step}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-fg">{step.title}</span>
                        <span className="rounded-md bg-bg-sunken px-2 py-0.5 font-mono text-[10px] text-muted border border-border/60">
                          {step.cellularCompartment}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-accent">{step.biochemicalEvent}</p>
                      <p className="text-xs text-muted leading-relaxed">{step.molecularDescription}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kinetics & Restoration Targets */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Clock className="size-4 text-cyan-500" />
                  Pharmacokinetic &amp; Therapeutic Profile
                </h3>
                <div className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-fg">Onset of Action: </span>
                    <span className="text-muted">{activeAntidote.kineticProfile.onset}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-fg">Critical Therapeutic Window: </span>
                    <span className="text-muted">{activeAntidote.kineticProfile.criticalWindow}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-fg">Metabolism &amp; Clearance: </span>
                    <span className="text-muted">{activeAntidote.kineticProfile.eliminationAndMetabolism}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-fg">Physiological Restoration Targets:</p>
                  <ul className="list-disc list-inside text-xs text-muted space-y-1">
                    {activeAntidote.physiologicRestorationTargets.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Stethoscope className="size-4 text-amber-500" />
                  Clinical Monitoring &amp; Precautions
                </h3>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs">
                  <div className="font-semibold text-amber-600 dark:text-amber-400">Essential Monitoring Parameters:</div>
                  <ul className="list-disc list-inside text-xs text-muted space-y-1">
                    {activeAntidote.monitoringParameters.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-rose-500">Boxed Warnings &amp; Key Contraindications:</p>
                  <ul className="list-disc list-inside text-xs text-muted space-y-1">
                    {activeAntidote.boxedWarningsOrContraindications.map((w, idx) => (
                      <li key={idx} className="text-rose-500 font-medium">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIEW 4: Toxidrome Clinical Sign Diagnostic Assistant */}
      {viewMode === "assistant" && (
        <section aria-label="Clinical Sign Diagnostic Assistant" className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-6 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-fg sm:text-xl">
                  Clinical Sign Diagnostic Assistant
                </h2>
                <p className="text-xs text-muted sm:text-sm">
                  Interactive educational tool: select observed physical exam signs to simulate matching toxidromes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetAssistant}
                  className="min-h-[44px] text-xs gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Reset Signs
                </Button>
              </div>
            </div>

            {/* Interactive Sign Selectors */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {/* Pupils */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <label className="text-xs font-bold text-fg flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Eye className="size-3.5 text-indigo-500" />
                    Pupil Examination
                  </span>
                  {observedSigns.pupils && (
                    <span className="text-[10px] text-accent font-mono uppercase">{observedSigns.pupils}</span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["mydriasis", "Dilated (Mydriasis)"],
                      ["miosis", "Pinpoint (Miosis)"],
                      ["normal", "Normal / Mid"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObservedSigns((s) => ({ ...s, pupils: s.pupils === val ? undefined : val }))}
                      className={cn(
                        "min-h-[44px] rounded-md p-1.5 text-center text-xs font-medium transition-colors border",
                        observedSigns.pupils === val
                          ? "bg-accent text-accent-fg border-accent font-semibold shadow-xs"
                          : "bg-surface text-fg border-border hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Moisture (KEY DISCRIMINATOR) */}
              <div className="rounded-lg border border-accent/40 bg-accent-soft/20 p-3 space-y-2">
                <label className="text-xs font-bold text-fg flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="size-3.5 text-cyan-500" />
                    Skin Moisture (Discriminator!)
                  </span>
                  {observedSigns.skin && (
                    <span className="text-[10px] text-accent font-mono uppercase">{observedSigns.skin}</span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["dry", "Bone Dry (Anhidrosis)"],
                      ["diaphoretic", "Profuse Sweating"],
                      ["normal", "Normal Moisture"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObservedSigns((s) => ({ ...s, skin: s.skin === val ? undefined : val }))}
                      className={cn(
                        "min-h-[44px] rounded-md p-1.5 text-center text-xs font-medium transition-colors border",
                        observedSigns.skin === val
                          ? "bg-accent text-accent-fg border-accent font-semibold shadow-xs"
                          : "bg-surface text-fg border-border hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heart Rate */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <label className="text-xs font-bold text-fg flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="size-3.5 text-rose-500" />
                    Heart Rate
                  </span>
                  {observedSigns.heartRate && (
                    <span className="text-[10px] text-accent font-mono uppercase">{observedSigns.heartRate}</span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["tachycardia", "Tachycardia (>100)"],
                      ["bradycardia", "Bradycardia (<60)"],
                      ["normal", "Normal HR"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObservedSigns((s) => ({ ...s, heartRate: s.heartRate === val ? undefined : val }))}
                      className={cn(
                        "min-h-[44px] rounded-md p-1.5 text-center text-xs font-medium transition-colors border",
                        observedSigns.heartRate === val
                          ? "bg-accent text-accent-fg border-accent font-semibold shadow-xs"
                          : "bg-surface text-fg border-border hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Respiratory Rate */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <label className="text-xs font-bold text-fg flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wind className="size-3.5 text-sky-500" />
                    Respiratory Rate
                  </span>
                  {observedSigns.respiratoryRate && (
                    <span className="text-[10px] text-accent font-mono uppercase">{observedSigns.respiratoryRate}</span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["bradypnea", "Bradypnea (<10)"],
                      ["tachypnea", "Tachypnea (>20)"],
                      ["normal", "Normal RR"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObservedSigns((s) => ({ ...s, respiratoryRate: s.respiratoryRate === val ? undefined : val }))}
                      className={cn(
                        "min-h-[44px] rounded-md p-1.5 text-center text-xs font-medium transition-colors border",
                        observedSigns.respiratoryRate === val
                          ? "bg-accent text-accent-fg border-accent font-semibold shadow-xs"
                          : "bg-surface text-fg border-border hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <label className="text-xs font-bold text-fg flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="size-3.5 text-amber-500" />
                    Core Temperature
                  </span>
                  {observedSigns.temperature && (
                    <span className="text-[10px] text-accent font-mono uppercase">{observedSigns.temperature}</span>
                  )}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["hyperthermia", "Hyperthermia (>38°)"],
                      ["hypothermia", "Hypothermia (<35°)"],
                      ["normal", "Normothermia"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObservedSigns((s) => ({ ...s, temperature: s.temperature === val ? undefined : val }))}
                      className={cn(
                        "min-h-[44px] rounded-md p-1.5 text-center text-xs font-medium transition-colors border",
                        observedSigns.temperature === val
                          ? "bg-accent text-accent-fg border-accent font-semibold shadow-xs"
                          : "bg-surface text-fg border-border hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neuromuscular */}
              <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2">
                <label className="text-xs font-bold text-fg flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3.5 text-purple-500" />
                    Neuromuscular Examination
                  </span>
                  {observedSigns.neuromuscular && (
                    <span className="text-[10px] text-accent font-mono uppercase">{observedSigns.neuromuscular}</span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      ["clonus", "Clonus"],
                      ["fasciculations", "Twitches"],
                      ["tremor", "Tremor"],
                      ["hyporeflexia", "Hyporeflex"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setObservedSigns((s) => ({ ...s, neuromuscular: s.neuromuscular === val ? undefined : val }))}
                      className={cn(
                        "min-h-[44px] rounded-md p-1 text-center text-[11px] font-medium transition-colors border",
                        observedSigns.neuromuscular === val
                          ? "bg-accent text-accent-fg border-accent font-semibold shadow-xs"
                          : "bg-surface text-fg border-border hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Diagnostic Assistant Results Section */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Sparkles className="size-4 text-accent" />
                  Differential Toxidrome Match Results ({activeObservedCount} signs entered)
                </h3>
                <span className="text-xs text-muted">Ranked by diagnostic compatibility</span>
              </div>

              {activeObservedCount === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted">
                  Select observed physical exam signs above to view simulated toxidrome differential rankings.
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnosticMatches.map((match) => (
                    <div
                      key={match.toxidrome.id}
                      className={cn(
                        "rounded-xl border p-4 space-y-2.5 transition-all shadow-xs",
                        match.confidenceTier === "High"
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : match.confidenceTier === "Moderate"
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-border bg-surface-2/40 opacity-80",
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-fg">{match.toxidrome.name}</span>
                          <Badge
                            tone={
                              match.confidenceTier === "High"
                                ? "ok"
                                : match.confidenceTier === "Moderate"
                                ? "warn"
                                : "default"
                            }
                            className={cn(
                              "text-[10px] font-semibold",
                              match.confidenceTier === "High"
                                ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                                : match.confidenceTier === "Moderate"
                                ? "border-amber-500 text-amber-500 bg-amber-500/10"
                                : "border-border text-muted",
                            )}
                          >
                            {match.confidenceTier} Confidence (Score: {match.matchScore})
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedToxidromeId(match.toxidrome.id);
                              setViewMode("toxidromes");
                            }}
                            className="min-h-[36px] text-xs"
                          >
                            Explore Toxidrome
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        {match.clinicalRationale}
                      </p>

                      {/* Matching Features Chips */}
                      {match.matchingFeatures.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Matching:
                          </span>
                          {match.matchingFeatures.map((feat, idx) => (
                            <span
                              key={idx}
                              className="rounded-md border border-emerald-500/30 bg-surface px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                            >
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Divergent Features Chips */}
                      {match.divergentFeatures.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] font-semibold text-rose-500">
                            Divergent:
                          </span>
                          {match.divergentFeatures.map((div, idx) => (
                            <span
                              key={idx}
                              className="rounded-md border border-rose-500/30 bg-surface px-2 py-0.5 text-[11px] font-medium text-rose-500"
                            >
                              ✗ {div}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
