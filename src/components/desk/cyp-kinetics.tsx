import React, { useMemo, useState } from "react";
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
  ExternalLink,
  Flame,
  Info,
  Layers,
  Pill,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import {
  CYP_KINETICS_REGULATORY_DISCLAIMER,
  MOLECULAR_MODES,
  TDI_PERPETRATORS,
  NUCLEAR_INDUCERS,
  COMPETITIVE_INHIBITORS,
  NUCLEAR_RECEPTOR_PATHWAYS,
  SENSITIVE_VICTIM_SUBSTRATES,
  getAllTdiPerpetrators,
  getAllNuclearInducers,
  getAllCompetitiveInhibitors,
  getNuclearReceptorPathways,
  getMolecularModes,
  getTdiPerpetratorById,
  getNuclearInducerById,
  getCompetitiveInhibitorById,
  calculateEnzymeTrajectory,
  detectTdiInductionOnTray,
  type MolecularModeId,
  type NuclearReceptorType,
  type EnzymeTrajectoryResult,
  type TrajectoryPoint,
} from "@/lib/drugs/cyp-kinetics";

/** Preset classic clinical case studies for 1-tap loading and teaching */
interface ClinicalScenarioPreset {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  drugIds: string[];
  stopDay: number;
  highlightMechanism: string;
  teachingSummary: string;
}

const PRESET_SCENARIOS: readonly ClinicalScenarioPreset[] = [
  {
    id: "ritonavir-midazolam",
    title: "Ritonavir + Midazolam (TDI Knockout)",
    badge: "MBI / TDI Knockout",
    badgeColor: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    drugIds: ["ritonavir", "midazolam"],
    stopDay: 10,
    highlightMechanism: "Suicidal Apoprotein Alkylation & MIC Coordination",
    teachingSummary:
      "Ritonavir rapidly inactivates CYP3A4 down to <15% within 48h. Stopping ritonavir does NOT clear the block: oral midazolam exposure remains high until de novo CYP3A4 is resynthesized (kdeg turnover ~48h).",
  },
  {
    id: "rifampin-tacrolimus",
    title: "Rifampin + Tacrolimus (PXR Induction)",
    badge: "PXR Induction",
    badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    drugIds: ["rifampin", "tacrolimus"],
    stopDay: 10,
    highlightMechanism: "Transcriptional PXR-RXR ER6/DR3 Activation",
    teachingSummary:
      "Rifampin drives CYP3A4 and P-gp to >350% with a 3–5 day lag. Tacrolimus levels collapse, precipitating organ transplant rejection. Discontinuation leaves a 2–3 week offset lag before clearance normalizes.",
  },
  {
    id: "grapefruit-simvastatin",
    title: "Grapefruit + Simvastatin (Enterocyte Suicide)",
    badge: "Intestinal MBI",
    badgeColor: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    drugIds: ["grapefruit", "simvastatin"],
    stopDay: 7,
    highlightMechanism: "Furanocoumarin Epoxide Apoprotein Alkylation",
    teachingSummary:
      "Bergamottin destroys enterocyte intestinal CYP3A4 first-pass metabolism. Simvastatin oral bioavailability multiplies >10-fold, triggering rhabdomyolysis. Recovery requires enterocyte regeneration over 24–72h.",
  },
  {
    id: "tobacco-clozapine",
    title: "Tobacco Smoke + Clozapine (AhR Cessation)",
    badge: "AhR Induction & Cessation",
    badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    drugIds: ["tobacco", "clozapine"],
    stopDay: 10,
    highlightMechanism: "PAH-AhR-ARNT XRE Promoter Activation",
    teachingSummary:
      "Combustion PAHs induce CYP1A2 via AhR, lowering clozapine levels by ~50%. Inpatient smoking cessation removes the inducer; over 1–2 weeks CYP1A2 activity declines to baseline, causing toxic clozapine spikes and seizures.",
  },
  {
    id: "clarithromycin-rifampin",
    title: "Clarithromycin + Rifampin (Opposing Collision)",
    badge: "Opposing Collision",
    badgeColor: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    drugIds: ["clarithromycin", "rifampin"],
    stopDay: 10,
    highlightMechanism: "Suicidal Inactivation vs Transcriptional Induction",
    teachingSummary:
      "Opposing kinetic collision: Rifampin transcriptionally ramps CYP3A4 synthesis while Clarithromycin continuously inactivates newly formed enzyme via nitroso-heme complex. Highly volatile kinetics.",
  },
  {
    id: "fluconazole-midazolam",
    title: "Fluconazole + Midazolam (Competitive Contrast)",
    badge: "Competitive Reversible",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    drugIds: ["fluconazole", "midazolam"],
    stopDay: 10,
    highlightMechanism: "Reversible Heme Iron Coordination (Ki governed)",
    teachingSummary:
      "Contrasting model: Fluconazole binds reversibly without damaging the enzyme apoprotein. Upon drug clearance, active enzyme capacity rebounds to 100% within 48–72 hours.",
  },
];

export function CypKineticsSimulator() {
  const selectedOnDesk = useDesk((s) => s.selected);
  const loadDesk = useDesk((s) => s.load);
  const addDesk = useDesk((s) => s.add);

  // Component state
  const [useDeskDrugs, setUseDeskDrugs] = useState<boolean>(true);
  const [sandboxDrugIds, setSandboxDrugIds] = useState<string[]>(["ritonavir", "midazolam"]);
  const [stopDay, setStopDay] = useState<number>(10);
  const [totalDays, setTotalDays] = useState<number>(30);
  const [selectedDay, setSelectedDay] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<"trajectory" | "modes" | "nuclear" | "tray">("trajectory");
  const [selectedModeId, setSelectedModeId] = useState<MolecularModeId>("mechanism-based-tdi");
  const [selectedReceptor, setSelectedReceptor] = useState<NuclearReceptorType>("PXR");
  const [showRegulatory, setShowRegulatory] = useState<boolean>(false);
  const [feedbackPreset, setFeedbackPreset] = useState<string | null>(null);

  // Active drugs being simulated
  const effectiveSimulatedDrugIds = useMemo(() => {
    if (useDeskDrugs && selectedOnDesk.length > 0) {
      return selectedOnDesk;
    }
    return sandboxDrugIds;
  }, [useDeskDrugs, selectedOnDesk, sandboxDrugIds]);

  // Run dynamic mathematical trajectory simulation
  const trajectory: EnzymeTrajectoryResult = useMemo(() => {
    return calculateEnzymeTrajectory(effectiveSimulatedDrugIds, totalDays, stopDay);
  }, [effectiveSimulatedDrugIds, totalDays, stopDay]);

  // Desk tray detection results
  const trayDetection = useMemo(() => {
    return detectTdiInductionOnTray(selectedOnDesk);
  }, [selectedOnDesk]);

  // Current selected day point details
  const activeDayPoint: TrajectoryPoint = useMemo(() => {
    return trajectory.points.find((p) => p.day === selectedDay) ?? trajectory.points[0];
  }, [trajectory, selectedDay]);

  // Active nuclear pathway
  const activePathway = useMemo(() => {
    return NUCLEAR_RECEPTOR_PATHWAYS.find((p) => p.receptorId === selectedReceptor) ?? NUCLEAR_RECEPTOR_PATHWAYS[0];
  }, [selectedReceptor]);

  // Active mode details
  const activeMode = useMemo(() => {
    return MOLECULAR_MODES.find((m) => m.id === selectedModeId) ?? MOLECULAR_MODES[1];
  }, [selectedModeId]);

  function handleLoadPreset(preset: ClinicalScenarioPreset) {
    loadDesk(preset.drugIds);
    setSandboxDrugIds(preset.drugIds);
    setStopDay(preset.stopDay);
    setSelectedDay(preset.stopDay);
    setUseDeskDrugs(true);
    setFeedbackPreset(preset.id);
    setTimeout(() => setFeedbackPreset(null), 2500);
  }

  function toggleSandboxDrug(id: string) {
    setUseDeskDrugs(false);
    setSandboxDrugIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function handleAddDrugToDesk(id: string) {
    addDesk(id);
    setUseDeskDrugs(true);
  }

  // SVG dimensions & coordinate scales
  const svgWidth = 800;
  const svgHeight = 320;
  const padding = { top: 28, right: 36, bottom: 44, left: 56 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Max Y scale dynamically based on peak
  const maxY = useMemo(() => {
    if (trajectory.peakPct > 360) return 450;
    if (trajectory.peakPct > 260) return 380;
    if (trajectory.peakPct > 150) return 260;
    return 160;
  }, [trajectory.peakPct]);

  const scaleX = (d: number) => padding.left + (d / totalDays) * graphWidth;
  const scaleY = (pct: number) => padding.top + graphHeight - (Math.min(pct, maxY) / maxY) * graphHeight;

  // Build SVG path strings
  const trajectoryPathD = useMemo(() => {
    if (trajectory.points.length === 0) return "";
    return trajectory.points.reduce((acc, pt, idx) => {
      const x = scaleX(pt.day);
      const y = scaleY(pt.activePoolPct);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [trajectory.points, totalDays, maxY]);

  const areaPathD = useMemo(() => {
    if (trajectory.points.length === 0) return "";
    const firstX = scaleX(0);
    const lastX = scaleX(totalDays);
    const baselineY = scaleY(0);
    const mainPath = trajectory.points.reduce((acc, pt, idx) => {
      const x = scaleX(pt.day);
      const y = scaleY(pt.activePoolPct);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
    return `${mainPath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [trajectory.points, totalDays, maxY]);

  return (
    <div className="w-full space-y-6 overflow-x-hidden text-fg">
      {/* 1. Header Banner & Non-Prescriptive CDS Posture */}
      <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent shadow-sm">
                <Zap className="size-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
                Cytochrome P450 TDI & Nuclear Induction Simulator
              </h1>
              <Badge className="border border-sky-500/30 bg-sky-500/10 text-xs font-medium text-sky-300">
                FD&C Act § 520(o)(1)(E) CDS
              </Badge>
            </div>
            <p className="text-xs text-muted sm:text-sm">
              Time-Dependent Inactivation (MBI/TDI) vs Delayed Transcriptional Induction & Turnover Kinetics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegulatory((prev) => !prev)}
              className="min-h-[44px] text-xs text-muted hover:text-fg"
            >
              <Shield className="mr-1.5 size-3.5 text-accent" />
              {showRegulatory ? "Hide Regulatory Notice" : "Regulatory Notice"}
              <ChevronDown className={cn("ml-1 size-3.5 transition-transform", showRegulatory && "rotate-180")} />
            </Button>
            {useDeskDrugs && selectedOnDesk.length > 0 ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                <Check className="mr-1 size-3" />
                Syncing Desk Tray ({selectedOnDesk.length} drugs)
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseDeskDrugs(true)}
                className="min-h-[44px] text-xs"
              >
                Sync with Active Desk Tray
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Regulatory Notice */}
        {showRegulatory && (
          <div className="mt-4 rounded-lg border border-border/60 bg-bg/70 p-3.5 text-xs text-muted leading-relaxed">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-fg">
              <Info className="size-4 text-accent" />
              Regulatory Posture (FD&C Act § 520(o)(1)(E))
            </div>
            <p>{CYP_KINETICS_REGULATORY_DISCLAIMER}</p>
          </div>
        )}
      </section>

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("trajectory")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm",
            activeTab === "trajectory"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:bg-surface/80 hover:text-fg",
          )}
        >
          <Activity className="size-4" />
          30-Day Trajectory Engine
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("modes")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm",
            activeTab === "modes"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:bg-surface/80 hover:text-fg",
          )}
        >
          <Layers className="size-4" />
          3 Molecular Modes Compared
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("nuclear")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm",
            activeTab === "nuclear"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:bg-surface/80 hover:text-fg",
          )}
        >
          <Sparkles className="size-4" />
          Nuclear Pathways (PXR / CAR / AhR)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tray")}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm",
            activeTab === "tray"
              ? "bg-accent text-accent-fg shadow-sm"
              : "bg-surface text-muted hover:bg-surface/80 hover:text-fg",
          )}
        >
          <ShieldAlert className="size-4" />
          Active Tray Collisions ({trayDetection.kineticAlerts.length})
        </button>
      </div>

      {/* 3. Trajectory View */}
      {activeTab === "trajectory" && (
        <div className="space-y-6">
          {/* Quick Presets Bar */}
          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                1-Tap Benchmark Clinical Cases
              </span>
              <span className="text-xs text-muted">Click to load pair and run simulation</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {PRESET_SCENARIOS.map((scenario) => {
                const isLoaded = feedbackPreset === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleLoadPreset(scenario)}
                    className="flex min-h-[44px] flex-col justify-between rounded-lg border border-border/60 bg-bg/50 p-3 text-left transition-all hover:border-accent/40 hover:bg-bg"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-xs text-fg sm:text-sm">{scenario.title}</span>
                      {isLoaded ? (
                        <Check className="size-4 text-emerald-400" />
                      ) : (
                        <ChevronRight className="size-3.5 text-muted" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <Badge className={cn("border text-[10px]", scenario.badgeColor)}>
                        {scenario.badge}
                      </Badge>
                      <span className="text-[11px] text-muted">Stop Day {scenario.stopDay}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Interactive Simulation Controls Bar */}
          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-sm text-fg">Active Simulated Modulators</h3>
                <p className="text-xs text-muted">
                  {useDeskDrugs
                    ? "Currently visualizing drugs from your active Desk Tray. Toggle chips below to customize in Sandbox mode."
                    : "Running in Sandbox Simulator mode. Toggle drug chips to simulate custom polypharmacy."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted">Stop Day:</span>
                  <div className="flex gap-1">
                    {[5, 7, 10, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setStopDay(d);
                          setSelectedDay(d);
                        }}
                        className={cn(
                          "min-h-[44px] min-w-[44px] rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                          stopDay === d
                            ? "bg-accent text-accent-fg shadow-sm"
                            : "border border-border/70 bg-bg text-muted hover:text-fg",
                        )}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted">Total:</span>
                  <div className="flex gap-1">
                    {[20, 30, 45].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setTotalDays(d)}
                        className={cn(
                          "min-h-[44px] min-w-[44px] rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                          totalDays === d
                            ? "bg-accent text-accent-fg shadow-sm"
                            : "border border-border/70 bg-bg text-muted hover:text-fg",
                        )}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick drug chip toggles */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Toggle Modulators:
              </span>
              {[
                { id: "ritonavir", label: "Ritonavir (TDI)", type: "tdi" },
                { id: "clarithromycin", label: "Clarithromycin (TDI)", type: "tdi" },
                { id: "grapefruit", label: "Grapefruit (TDI)", type: "tdi" },
                { id: "rifampin", label: "Rifampin (PXR)", type: "ind" },
                { id: "carbamazepine", label: "Carbamazepine (PXR)", type: "ind" },
                { id: "phenobarbital", label: "Phenobarbital (CAR)", type: "ind" },
                { id: "tobacco", label: "Tobacco (AhR)", type: "ind" },
                { id: "fluconazole", label: "Fluconazole (Comp)", type: "comp" },
                { id: "ciprofloxacin", label: "Ciprofloxacin (Comp)", type: "comp" },
                { id: "midazolam", label: "Midazolam (Victim)", type: "vic" },
                { id: "simvastatin", label: "Simvastatin (Victim)", type: "vic" },
                { id: "tacrolimus", label: "Tacrolimus (Victim)", type: "vic" },
                { id: "clozapine", label: "Clozapine (Victim)", type: "vic" },
              ].map((drug) => {
                const isActive = effectiveSimulatedDrugIds.includes(drug.id);
                return (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => toggleSandboxDrug(drug.id)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-all",
                      isActive
                        ? drug.type === "tdi"
                          ? "border border-rose-500/40 bg-rose-500/20 text-rose-200"
                          : drug.type === "ind"
                            ? "border border-amber-500/40 bg-amber-500/20 text-amber-200"
                            : drug.type === "comp"
                              ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                              : "border border-sky-500/40 bg-sky-500/20 text-sky-200"
                        : "border border-border/60 bg-bg/60 text-muted hover:border-border hover:text-fg",
                    )}
                  >
                    {isActive ? <Check className="size-3" /> : <Plus className="size-3" />}
                    {drug.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Key KPI Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm sm:p-4">
              <span className="text-[11px] font-medium text-muted">Dominant Mechanism</span>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-sm text-fg sm:text-base">
                <Activity className="size-4 text-accent" />
                <span className="truncate">{trajectory.dominantMechanism}</span>
              </div>
              <span className="text-[10px] text-muted">
                {trajectory.activeModulators.length} active agent(s)
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm sm:p-4">
              <span className="text-[11px] font-medium text-muted">Nadir Activity</span>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-sm sm:text-base">
                <TrendingDown className="size-4 text-rose-400" />
                <span className={cn(trajectory.nadirPct < 30 ? "text-rose-400" : "text-fg")}>
                  {trajectory.nadirPct}%
                </span>
              </div>
              <span className="text-[10px] text-muted">Reached on Day {trajectory.dayAtNadir}</span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm sm:p-4">
              <span className="text-[11px] font-medium text-muted">Peak Activity</span>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-sm sm:text-base">
                <TrendingUp className="size-4 text-amber-400" />
                <span className={cn(trajectory.peakPct > 150 ? "text-amber-400" : "text-fg")}>
                  {trajectory.peakPct}%
                </span>
              </div>
              <span className="text-[10px] text-muted">Reached on Day {trajectory.dayAtPeak}</span>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm sm:p-4">
              <span className="text-[11px] font-medium text-muted">90% Baseline Recovery</span>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-sm sm:text-base">
                <Clock className="size-4 text-sky-400" />
                <span className="text-fg">
                  {trajectory.recoveryDay90Pct !== null ? `Day ${trajectory.recoveryDay90Pct}` : "In Equilibrium"}
                </span>
              </div>
              <span className="text-[10px] text-muted">
                {trajectory.recoveryDay90Pct !== null
                  ? `${trajectory.recoveryDay90Pct - stopDay}d post-stop`
                  : "Within normal limits"}
              </span>
            </div>
          </div>

          {/* Interactive Trajectory SVG Graph */}
          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-base text-fg">Active CYP Enzyme Pool Trajectory</h3>
                <p className="text-xs text-muted">
                  Interactive simulation showing rapid TDI apoprotein knockout vs delayed nuclear induction and recovery curves.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-muted">
                  <span className="inline-block size-2 rounded-full bg-rose-400" /> &lt;30% Toxicity Risk
                </span>
                <span className="flex items-center gap-1 text-muted">
                  <span className="inline-block size-2 rounded-full bg-emerald-400" /> 80–120% Baseline
                </span>
                <span className="flex items-center gap-1 text-muted">
                  <span className="inline-block size-2 rounded-full bg-amber-400" /> &gt;200% Loss of Efficacy
                </span>
              </div>
            </div>

            {/* The SVG Visualization */}
            <div className="relative mt-4 w-full overflow-hidden rounded-lg bg-bg/80 p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-auto w-full overflow-visible select-none"
              >
                <defs>
                  {/* Linear gradient for area */}
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={
                        trajectory.dominantMechanism === "TDI / Mechanism-Based"
                          ? "#f43f5e"
                          : trajectory.dominantMechanism === "Nuclear Induction"
                            ? "#f59e0b"
                            : "#06b6d4"
                      }
                      stopOpacity="0.35"
                    />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Shaded Danger Zones */}
                {/* 1. Induction danger zone (>200%) */}
                {maxY >= 200 && (
                  <rect
                    x={padding.left}
                    y={scaleY(maxY)}
                    width={graphWidth}
                    height={scaleY(200) - scaleY(maxY)}
                    fill="#f59e0b"
                    fillOpacity="0.07"
                  />
                )}
                {/* 2. Physiological zone (80% - 120%) */}
                <rect
                  x={padding.left}
                  y={scaleY(120)}
                  width={graphWidth}
                  height={scaleY(80) - scaleY(120)}
                  fill="#10b981"
                  fillOpacity="0.06"
                />
                {/* 3. TDI severe toxicity zone (<30%) */}
                <rect
                  x={padding.left}
                  y={scaleY(30)}
                  width={graphWidth}
                  height={scaleY(0) - scaleY(30)}
                  fill="#f43f5e"
                  fillOpacity="0.1"
                />

                {/* Y-axis Grid Lines & Labels */}
                {[0, 50, 100, 200, 300, 400].filter((val) => val <= maxY).map((val) => {
                  const y = scaleY(val);
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke={val === 100 ? "#10b981" : "currentColor"}
                        strokeDasharray={val === 100 ? "4 4" : "2 4"}
                        strokeOpacity={val === 100 ? 0.6 : 0.15}
                        strokeWidth={val === 100 ? 1.5 : 1}
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        className={cn(
                          "text-[10px] fill-current",
                          val === 100 ? "font-bold text-emerald-400" : "text-muted",
                        )}
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* X-axis Grid Lines & Day Labels */}
                {Array.from({ length: Math.floor(totalDays / 5) + 1 }).map((_, i) => {
                  const day = i * 5;
                  const x = scaleX(day);
                  return (
                    <g key={day}>
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={svgHeight - padding.bottom}
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeDasharray="2 3"
                      />
                      <text
                        x={x}
                        y={svgHeight - padding.bottom + 16}
                        textAnchor="middle"
                        className="text-[10px] fill-current text-muted"
                      >
                        D{day}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Stop Day Marker */}
                <g>
                  <line
                    x1={scaleX(stopDay)}
                    y1={padding.top}
                    x2={scaleX(stopDay)}
                    y2={svgHeight - padding.bottom}
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={scaleX(stopDay) - 44}
                    y={padding.top - 20}
                    width={88}
                    height={18}
                    rx={4}
                    fill="#1f2937"
                    stroke="#f43f5e"
                    strokeWidth={1}
                  />
                  <text
                    x={scaleX(stopDay)}
                    y={padding.top - 8}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-current text-rose-300"
                  >
                    Stopped (D{stopDay})
                  </text>
                </g>

                {/* Area fill */}
                <path d={areaPathD} fill="url(#areaGradient)" />

                {/* Main trajectory path */}
                <path
                  d={trajectoryPathD}
                  fill="none"
                  stroke={
                    trajectory.dominantMechanism === "TDI / Mechanism-Based"
                      ? "#f43f5e"
                      : trajectory.dominantMechanism === "Nuclear Induction"
                        ? "#f59e0b"
                        : "#06b6d4"
                  }
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Data Points */}
                {trajectory.points.map((pt) => {
                  const x = scaleX(pt.day);
                  const y = scaleY(pt.activePoolPct);
                  const isSelected = pt.day === selectedDay;

                  return (
                    <g
                      key={pt.day}
                      className="cursor-pointer"
                      onClick={() => setSelectedDay(pt.day)}
                    >
                      {/* Invisible larger hit area for touch targets */}
                      <circle cx={x} cy={y} r={12} fill="transparent" />
                      {/* Visual point */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 6 : pt.day === stopDay ? 5 : 3}
                        fill={isSelected ? "#38bdf8" : "#0f172a"}
                        stroke={
                          isSelected
                            ? "#ffffff"
                            : pt.activePoolPct < 30
                              ? "#f43f5e"
                              : pt.activePoolPct > 150
                                ? "#f59e0b"
                                : "#06b6d4"
                        }
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected Day Clinical Inspection Card */}
            <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="border border-accent text-accent font-semibold">
                    Day {activeDayPoint.day} Analysis
                  </Badge>
                  <span className="font-bold text-sm text-fg">
                    Active CYP Capacity: {activeDayPoint.activePoolPct}%
                  </span>
                  <Badge
                    className={cn(
                      "border text-[10px]",
                      activeDayPoint.phase === "onset"
                        ? "border-sky-500/40 text-sky-300"
                        : activeDayPoint.phase === "steady-state"
                          ? "border-amber-500/40 text-amber-300"
                          : activeDayPoint.phase === "offset-recovery"
                            ? "border-purple-500/40 text-purple-300"
                            : "border-emerald-500/40 text-emerald-300",
                    )}
                  >
                    {activeDayPoint.phaseLabel}
                  </Badge>
                </div>
                <span className="text-xs text-muted">
                  {activeDayPoint.day <= stopDay
                    ? `Perpetrator exposure active (Stop on Day ${stopDay})`
                    : `Discontinued ${activeDayPoint.day - stopDay} days ago`}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-fg/90">
                {activeDayPoint.narrative}
              </p>
            </div>
          </section>

          {/* Clinical Insights & Monitoring Guidance */}
          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
            <h3 className="mb-2 font-bold text-sm text-fg sm:text-base">
              Mechanistic Simulation Summary & Clinical Monitoring
            </h3>
            <p className="text-xs leading-relaxed text-muted sm:text-sm">
              {trajectory.clinicalSummary}
            </p>

            <div className="mt-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Pharmacokinetic Pearls:
              </span>
              <ul className="space-y-1.5 text-xs text-fg/90 sm:text-sm">
                {trajectory.monitoringPearls.map((pearl, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{pearl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* 4. Three Molecular Modes Compared View */}
      {activeTab === "modes" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {MOLECULAR_MODES.map((mode) => {
              const isSelected = mode.id === selectedModeId;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedModeId(mode.id)}
                  className={cn(
                    "flex min-h-[44px] flex-col justify-between rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-border/70 bg-surface hover:border-border",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-fg">{mode.title}</span>
                      {isSelected && <Check className="size-4 text-accent" />}
                    </div>
                    <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                      {mode.subtitle}
                    </p>
                  </div>
                  <div className="mt-4 rounded-md border border-border/60 bg-bg/60 p-2 text-[11px] font-medium text-accent">
                    "{mode.clinicalAphorism}"
                  </div>
                </button>
              );
            })}
          </div>

          {/* Deep Mode Inspection Card */}
          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="border border-accent text-accent font-semibold">
                  Mode In-Depth
                </Badge>
                <h3 className="font-bold text-lg text-fg">{activeMode.title}</h3>
              </div>
              <p className="text-xs text-muted">{activeMode.subtitle}</p>
            </div>

            <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 p-3.5 text-xs font-semibold text-accent leading-relaxed sm:text-sm">
              "{activeMode.clinicalAphorism}"
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Molecular Mechanism & Structural Binding:
                </span>
                <p className="mt-1 text-xs leading-relaxed text-fg/90 sm:text-sm">
                  {activeMode.mechanismDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-bg/50 p-3">
                  <span className="text-[11px] font-semibold text-muted uppercase">Target Binding Site</span>
                  <p className="mt-1 text-xs text-fg">{activeMode.bindingTarget}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-bg/50 p-3">
                  <span className="text-[11px] font-semibold text-muted uppercase">Reversibility</span>
                  <p className="mt-1 text-xs text-fg">{activeMode.reversibility}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-bg/50 p-3">
                  <span className="text-[11px] font-semibold text-muted uppercase">Onset Kinetics</span>
                  <p className="mt-1 text-xs text-fg">{activeMode.onsetKinetics}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-bg/50 p-3">
                  <span className="text-[11px] font-semibold text-muted uppercase">Offset Kinetics</span>
                  <p className="mt-1 text-xs text-fg">{activeMode.offsetKinetics}</p>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Biochemical Hallmarks:
                </span>
                <ul className="mt-1.5 space-y-1 text-xs text-fg/90 sm:text-sm">
                  {activeMode.biochemicalHallmarks.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Exemplar Drugs (1-Tap Add to Desk):
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeMode.exemplarDrugIds.map((drugId) => {
                    const drugName = DRUG_BY_ID[drugId]?.name ?? drugId;
                    return (
                      <Button
                        key={drugId}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddDrugToDesk(drugId)}
                        className="min-h-[44px] text-xs"
                      >
                        <Plus className="mr-1 size-3 text-accent" />
                        Add {drugName} to Desk
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 5. Nuclear Receptor Pathways Deep Dive */}
      {activeTab === "nuclear" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {NUCLEAR_RECEPTOR_PATHWAYS.map((pathway) => (
              <button
                key={pathway.receptorId}
                type="button"
                onClick={() => setSelectedReceptor(pathway.receptorId)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                  selectedReceptor === pathway.receptorId
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "bg-surface text-muted hover:bg-surface/80 hover:text-fg",
                )}
              >
                <span>{pathway.receptorId}</span>
                <span className="text-[11px] opacity-80">({pathway.name})</span>
              </button>
            ))}
          </div>

          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="border border-accent text-accent font-semibold">
                  Nuclear Hormone Receptor
                </Badge>
                <h3 className="font-bold text-lg text-fg">
                  {activePathway.receptorId} — {activePathway.name} ({activePathway.geneSymbol})
                </h3>
              </div>
              <p className="text-xs text-muted">
                Heterodimerization: {activePathway.dimerization} | Response Element: {activePathway.responseElements}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-border/60 bg-bg/50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Biochemical & Transcriptional Mechanism:
              </span>
              <p className="mt-1 text-xs leading-relaxed text-fg/90 sm:text-sm">
                {activePathway.biochemicalMechanism}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-bg/50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Regulated Genes & Transporters:
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activePathway.regulatedEnzymes.map((enzyme) => (
                    <Badge key={enzyme} className="border border-sky-500/30 bg-sky-500/10 text-xs text-sky-300">
                      {enzyme}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-bg/50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Canonical Pharmacological Inducers:
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activePathway.canonicalInducerIds.map((indId) => {
                    const name = DRUG_BY_ID[indId]?.name ?? indId;
                    return (
                      <Button
                        key={indId}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddDrugToDesk(indId)}
                        className="min-h-[44px] text-xs"
                      >
                        <Plus className="mr-1 size-3 text-accent" />
                        Add {name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                High-Stakes Clinical Pearls:
              </span>
              <ul className="space-y-1.5 text-xs text-fg/90 sm:text-sm">
                {activePathway.clinicalPearls.map((pearl, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{pearl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* 6. Active Tray Collisions View */}
      {activeTab === "tray" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-base text-fg">Active Desk Tray Pharmacokinetic Monitor</h3>
                <p className="text-xs text-muted">
                  Real-time detection of mechanism-based suicidal inhibitors, nuclear inducers, and narrow therapeutic index victims on your desk.
                </p>
              </div>
              <Badge
                className={cn(
                  "border font-semibold text-xs",
                  trayDetection.hasCollision
                    ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
                )}
              >
                {trayDetection.hasCollision ? "Collisions Flagged" : "No Kinetic Collisions"}
              </Badge>
            </div>

            {/* Drugs currently on desk */}
            <div className="mt-4 rounded-lg border border-border/60 bg-bg/50 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Drugs on Desk Tray:
              </span>
              {selectedOnDesk.length === 0 ? (
                <p className="mt-1 text-xs text-muted italic">
                  Tray is currently empty. Use the benchmark case loaders above or search to add medications.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedOnDesk.map((id) => {
                    const name = DRUG_BY_ID[id]?.name ?? id;
                    const isTdi = TDI_PERPETRATORS.some((t) => t.drugId === id);
                    const isInd = NUCLEAR_INDUCERS.some((i) => i.drugId === id);
                    const isVic = SENSITIVE_VICTIM_SUBSTRATES.some((v) => v.drugId === id);

                    return (
                      <span
                        key={id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border",
                          isTdi
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                            : isInd
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : isVic
                                ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                                : "border-border/60 bg-surface text-fg",
                        )}
                      >
                        {name}
                        {isTdi && <span className="text-[10px] font-bold">(TDI)</span>}
                        {isInd && <span className="text-[10px] font-bold">(Inducer)</span>}
                        {isVic && <span className="text-[10px] font-bold">(Victim)</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kinetic Collision Alerts */}
            {trayDetection.kineticAlerts.length > 0 && (
              <div className="mt-4 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Pharmacokinetic Collision Alerts:
                </span>
                {trayDetection.kineticAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-lg border p-4 text-xs leading-relaxed sm:text-sm",
                      alert.severity === "critical"
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-100",
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <AlertOctagon className="size-4 shrink-0 text-rose-400" />
                      <span>{alert.title}</span>
                    </div>
                    <p className="mt-1 text-fg/90">{alert.mechanism}</p>
                    <div className="mt-2 rounded bg-bg/50 p-2 font-medium text-xs text-fg">
                      <span className="font-semibold text-accent">Clinical CDS Action: </span>
                      {alert.action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export { CypKineticsSimulator as CypKinetics };
export default CypKineticsSimulator;
