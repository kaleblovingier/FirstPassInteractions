import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Filter,
  Hourglass,
  Info,
  Layers,
  Pill,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import {
  PK_CONCEPTS,
  REGULATORY_NOTICE,
  calculateMichaelisMenten,
  evaluateDialyzability,
  calculateProteinDisplacement,
  calculateSteadyStateAccumulation,
  getPkConceptById,
  type PkConcept,
} from "@/lib/drugs/pk-tdm-mechanisms";

/** Preset drugs for the Dialysis Clearance Tester */
interface DialysisPreset {
  name: string;
  drugId: string;
  vdLKg: number;
  proteinBindingPct: number;
  mwDa: number;
  clinicalNote: string;
}

const DIALYSIS_PRESETS: DialysisPreset[] = [
  {
    name: "Gentamicin",
    drugId: "gentamicin",
    vdLKg: 0.25,
    proteinBindingPct: 10,
    mwDa: 477,
    clinicalNote: "Low Vd, hydrophilic, <10% bound. ~50% removed by 4h HD; requires post-HD replacement dose.",
  },
  {
    name: "Lithium",
    drugId: "lithium",
    vdLKg: 0.7,
    proteinBindingPct: 0,
    mwDa: 7,
    clinicalNote: "Small ion, 0% bound. Dialyzed rapidly; watch for 20-30% post-HD rebound from intracellular stores.",
  },
  {
    name: "Digoxin",
    drugId: "digoxin",
    vdLKg: 6.0,
    proteinBindingPct: 25,
    mwDa: 781,
    clinicalNote: "Massive Vd (>5 L/kg) bound to tissue Na+/K+-ATPase. HD removes <2% of total body burden (useless).",
  },
  {
    name: "Amiodarone",
    drugId: "amiodarone",
    vdLKg: 60.0,
    proteinBindingPct: 96,
    mwDa: 645,
    clinicalNote: "Extreme lipophilicity and huge Vd (~4000 L). HD completely ineffective for toxicity.",
  },
  {
    name: "Warfarin",
    drugId: "warfarin",
    vdLKg: 0.14,
    proteinBindingPct: 99,
    mwDa: 308,
    clinicalNote: "Tiny Vd (0.14 L/kg) but 99% albumin-bound. Albumin binding acts as an absolute dialytic barrier.",
  },
  {
    name: "Vancomycin",
    drugId: "vancomycin",
    vdLKg: 0.7,
    proteinBindingPct: 50,
    mwDa: 1449,
    clinicalNote: "Middle molecule (1449 Da). Partially dialyzed with high-flux synthetic dialyzers (~20-40%).",
  },
];

export function PkTdmMechanisms() {
  const [selectedId, setSelectedId] = useState<string>("michaelis-menten-phenytoin");

  // —— Tab 1: Michaelis-Menten Phenytoin State ——
  const [mmDose, setMmDose] = useState<number>(300);
  const [mmVmax, setMmVmax] = useState<number>(500);
  const [mmKm, setMmKm] = useState<number>(4.0);

  // —— Tab 2: Zero-Order Ethanol & Salicylate State ——
  const [zeroMode, setZeroMode] = useState<"ethanol" | "salicylate">("ethanol");
  const [ethanolBacMgDl, setEthanolBacMgDl] = useState<number>(80);
  const [salicylateLevelMgDl, setSalicylateLevelMgDl] = useState<number>(35);
  const [urinePh, setUrinePh] = useState<number>(6.5);

  // —— Tab 3: Dialysis Tester State ——
  const [dialysisVd, setDialysisVd] = useState<number>(0.25);
  const [dialysisPb, setDialysisPb] = useState<number>(10);
  const [dialysisMw, setDialysisMw] = useState<number>(477);
  const [activeDialysisPreset, setActiveDialysisPreset] = useState<string>("Gentamicin");

  // —— Tab 4: Protein Binding Displacement State ——
  const [totalLevel, setTotalLevel] = useState<number>(12);
  const [baselineFu, setBaselineFu] = useState<number>(10);
  const [displacedFu, setDisplacedFu] = useState<number>(22);
  const [albuminLevel, setAlbuminLevel] = useState<number>(4.4);

  // —— Tab 5: Steady-State Accumulation State ——
  const [halfLife, setHalfLife] = useState<number>(12);
  const [dosingTau, setDosingTau] = useState<number>(12);

  const activeConcept: PkConcept = useMemo(() => {
    return getPkConceptById(selectedId) ?? PK_CONCEPTS[0];
  }, [selectedId]);

  // Derived Calculations
  const mmResult = useMemo(() => {
    return calculateMichaelisMenten(mmDose, mmVmax, mmKm);
  }, [mmDose, mmVmax, mmKm]);

  const dialysisResult = useMemo(() => {
    return evaluateDialyzability(dialysisVd, dialysisPb, dialysisMw);
  }, [dialysisVd, dialysisPb, dialysisMw]);

  const displacementResult = useMemo(() => {
    return calculateProteinDisplacement(totalLevel, baselineFu, displacedFu, albuminLevel);
  }, [totalLevel, baselineFu, displacedFu, albuminLevel]);

  const accumulationResult = useMemo(() => {
    return calculateSteadyStateAccumulation(halfLife, dosingTau);
  }, [halfLife, dosingTau]);

  // Ethanol clearance derived values
  const ethanolClearanceHours = useMemo(() => {
    const rate = 17.5; // ~15-20 mg/dL per hr
    return Number((ethanolBacMgDl / rate).toFixed(1));
  }, [ethanolBacMgDl]);

  // Salicylate ion trapping derived values
  const salicylateTrapping = useMemo(() => {
    // pKa = 3.0. Henderson-Hasselbalch: log([A-]/[HA]) = pH - pKa
    const pKa = 3.0;
    const ratio = Math.pow(10, urinePh - pKa);
    const ionizedPct = Number(((ratio / (1 + ratio)) * 100).toFixed(2));
    let clearanceMultiplier = 1.0;
    if (urinePh <= 5.5) clearanceMultiplier = 1.0;
    else if (urinePh <= 6.5) clearanceMultiplier = 2.5;
    else if (urinePh <= 7.5) clearanceMultiplier = 6.0;
    else clearanceMultiplier = 12.0;

    let halfLifeEstimate = 3.0;
    if (salicylateLevelMgDl > 30) {
      halfLifeEstimate = 20.0;
      if (urinePh >= 7.5) halfLifeEstimate = 6.0; // reduced with alkalinization
    }

    return { ionizedPct, clearanceMultiplier, halfLifeEstimate };
  }, [urinePh, salicylateLevelMgDl]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-[var(--shadow-border)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                <Sparkles className="size-3.5" />
                FD&C Act § 520(o)(1)(E)
              </span>
              <span className="rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-muted">
                Clinical Pharmacokinetics Core
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Pharmacokinetics & Nonlinear Clearance Mechanisms
            </h2>
            <p className="mt-1 text-sm text-muted">
              Explore capacity-limited Michaelis-Menten kinetics, extracorporeal dialytic extraction,
              protein displacement traps, and steady-state accumulation.
            </p>
          </div>
        </div>

        {/* Concept Selector Tabs (Touch targets >= 44px) */}
        <div className="mt-6 border-t border-border pt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Select Pharmacokinetic Concept:
          </label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {PK_CONCEPTS.map((c) => {
              const isSelected = c.id === selectedId;
              let Icon = Activity;
              if (c.id === "michaelis-menten-phenytoin") Icon = TrendingUp;
              if (c.id === "zero-order-ethanol-salicylate") Icon = Hourglass;
              if (c.id === "volume-of-distribution-dialysis") Icon = Filter;
              if (c.id === "protein-binding-displacement") Icon = Layers;
              if (c.id === "steady-state-accumulation") Icon = Zap;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium transition-all",
                    isSelected
                      ? "border-accent bg-accent text-accent-fg shadow-sm"
                      : "border-border bg-surface-2 text-fg hover:bg-bg-sunken hover:border-fg/20",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isSelected ? "text-accent-fg" : "text-accent")} />
                  <span className="line-clamp-2 leading-snug">{c.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Active Concept Overview Card */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-[var(--shadow-border)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="accent">{activeConcept.category}</Badge>
              <span className="text-xs text-muted">Exemplars: {activeConcept.exemplarDrugs.join(", ")}</span>
            </div>
            <h3 className="mt-2 font-serif text-xl font-bold text-fg sm:text-2xl">
              {activeConcept.title}
            </h3>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {activeConcept.summary}
        </p>

        {/* Mathematical Model Equation Bar */}
        {activeConcept.mathematicalModel && (
          <div className="mt-4 rounded-lg bg-bg-sunken p-3.5 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <Activity className="size-3.5" />
              <span>Mathematical Model & Rate Law</span>
            </div>
            <code className="mt-1 block font-mono text-xs text-fg sm:text-sm">
              {activeConcept.mathematicalModel}
            </code>
          </div>
        )}
      </div>

      {/* Interactive Visual Explorer based on Active Tab */}
      {selectedId === "michaelis-menten-phenytoin" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Sliders and Controls */}
            <div className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] lg:col-span-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-accent" />
                  <h4 className="font-semibold text-fg">Phenytoin Dosage Simulator</h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMmDose(300);
                    setMmVmax(500);
                    setMmKm(4.0);
                  }}
                  className="flex min-h-[44px] items-center gap-1 text-xs text-muted hover:text-fg px-2"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>

              {/* Daily Dose Slider */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="mm-dose-slider" className="font-medium text-fg">Daily Dose (mg/day)</label>
                  <span className="font-mono font-bold text-accent">{mmDose} mg/day</span>
                </div>
                <input
                  id="mm-dose-slider"
                  type="range"
                  min="100"
                  max="520"
                  step="10"
                  value={mmDose}
                  onChange={(e) => setMmDose(Number(e.target.value))}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted">
                  <span>100 mg</span>
                  <span>300 mg</span>
                  <span>400 mg</span>
                  <span>500 mg (Vmax)</span>
                </div>

                {/* Dose Preset Quick Chips (Touch Targets >= 44px) */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[200, 300, 350, 400, 450].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMmDose(d)}
                      className={cn(
                        "min-h-[44px] min-w-[50px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        mmDose === d
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border bg-surface-2 text-muted hover:text-fg",
                      )}
                    >
                      {d} mg
                    </button>
                  ))}
                </div>
              </div>

              {/* Vmax and Km Parameter Tweaks */}
              <div className="space-y-4 rounded-lg bg-bg-sunken p-3.5 border border-border/50 text-xs">
                <span className="font-semibold text-fg">Intrinsic Metabolic Parameters (CYP2C9/2C19):</span>
                <div>
                  <div className="flex justify-between">
                    <label htmlFor="mm-vmax-slider" className="text-muted">Maximum Velocity (Vmax):</label>
                    <span className="font-mono font-semibold text-fg">{mmVmax} mg/day</span>
                  </div>
                  <input
                    id="mm-vmax-slider"
                    type="range"
                    min="350"
                    max="700"
                    step="25"
                    value={mmVmax}
                    onChange={(e) => setMmVmax(Number(e.target.value))}
                    className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded bg-surface accent-accent"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <label htmlFor="mm-km-slider" className="text-muted">Michaelis Constant (Km):</label>
                    <span className="font-mono font-semibold text-fg">{mmKm.toFixed(1)} mg/L</span>
                  </div>
                  <input
                    id="mm-km-slider"
                    type="range"
                    min="2.0"
                    max="8.0"
                    step="0.5"
                    value={mmKm}
                    onChange={(e) => setMmKm(Number(e.target.value))}
                    className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded bg-surface accent-accent"
                  />
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <span className="text-muted">Steady-State Css:</span>
                  <div className="mt-1 font-mono text-lg font-bold text-fg">
                    {mmResult.cssMgL !== null ? `${mmResult.cssMgL} mg/L` : "Unstable (∞)"}
                  </div>
                  <span className="text-[10px] text-muted">Goal: 10–20 mg/L total</span>
                </div>
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <span className="text-muted">Capacity Utilized:</span>
                  <div className="mt-1 font-mono text-lg font-bold text-accent">
                    {mmResult.percentVmaxUtilized}%
                  </div>
                  <span className="text-[10px] text-muted">Dose / Vmax</span>
                </div>
              </div>

              {/* Clinical Regime Callout */}
              <div
                className={cn(
                  "rounded-lg p-3 text-xs leading-relaxed border",
                  mmResult.isSaturated
                    ? "border-danger bg-danger-soft text-danger"
                    : mmResult.regime === "capacity-limited-zero-order"
                      ? "border-warn bg-warn-soft text-warn"
                      : "border-ok bg-ok-soft text-ok",
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {mmResult.isSaturated ? (
                    <AlertTriangle className="size-4 shrink-0" />
                  ) : (
                    <Info className="size-4 shrink-0" />
                  )}
                  <span>
                    Regime:{" "}
                    {mmResult.isSaturated
                      ? "Saturated Elimination (Continuous Buildup)"
                      : mmResult.regime === "capacity-limited-zero-order"
                        ? "Capacity-Limited Zero-Order Regime"
                        : mmResult.regime === "mixed-transitional"
                          ? "Transitional Kinetic Regime (Near Km)"
                          : "Linear First-Order Elimination"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] opacity-90">{mmResult.explanation}</p>
              </div>
            </div>

            {/* Right Column: Visual SVG Graph */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-semibold text-fg">Michaelis-Menten Steady-State Curve</h4>
                  <Badge tone={mmResult.isSaturated ? "danger" : mmResult.cssMgL && mmResult.cssMgL > 20 ? "warn" : "ok"}>
                    {mmResult.isSaturated ? "Toxic / Saturated" : mmResult.cssMgL ? `Css = ${mmResult.cssMgL} mg/L` : ""}
                  </Badge>
                </div>

                {/* SVG Curve Plot */}
                <div className="mt-4 relative h-64 w-full rounded-lg bg-bg-sunken border border-border/70 p-2 overflow-hidden">
                  <svg className="h-full w-full" viewBox="0 0 500 250" preserveAspectRatio="none">
                    {/* Background Grid Lines */}
                    <line x1="50" y1="20" x2="480" y2="20" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="75" x2="480" y2="75" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="130" x2="480" y2="130" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="185" x2="480" y2="185" stroke="currentColor" strokeOpacity="0.1" />
                    <line x1="50" y1="220" x2="480" y2="220" stroke="currentColor" strokeOpacity="0.4" />
                    <line x1="50" y1="20" x2="50" y2="220" stroke="currentColor" strokeOpacity="0.4" />

                    {/* Target Therapeutic Band: 10 - 20 mg/L */}
                    {/* Assuming Y range 0 to 45 mg/L -> 220px to 20px (scale = 200px / 45mg/L = 4.44 px per mg/L) */}
                    {/* 10 mg/L = 220 - (10 * 4.44) = 175.6; 20 mg/L = 220 - (20 * 4.44) = 131.2 */}
                    <rect
                      x="50"
                      y="131"
                      width="430"
                      height="44"
                      fill="var(--color-accent, #3b82f6)"
                      fillOpacity="0.12"
                    />
                    <text x="55" y="145" fontSize="10" fill="currentColor" fillOpacity="0.7">
                      Therapeutic Window (10–20 mg/L)
                    </text>
                    <text x="55" y="85" fontSize="10" fill="var(--color-danger, #ef4444)" fillOpacity="0.8">
                      Ataxia & Nystagmus Zone (&gt;30 mg/L)
                    </text>

                    {/* Plot the Curve */}
                    <path
                      d={mmResult.curve
                        .map((pt, idx) => {
                          // X: dose 0 to mmVmax -> 50 to 480
                          const x = 50 + (pt.doseMgDay / mmVmax) * 430;
                          // Y: css 0 to 45 mg/L -> 220 to 20
                          const y = Math.max(20, 220 - (pt.cssMgL / 45) * 200);
                          return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="var(--color-accent, #3b82f6)"
                      strokeWidth="3"
                    />

                    {/* Active Point Indicator Dot */}
                    {mmResult.cssMgL !== null && mmResult.cssMgL <= 45 && (
                      <g>
                        <circle
                          cx={50 + (mmDose / mmVmax) * 430}
                          cy={220 - (mmResult.cssMgL / 45) * 200}
                          r="6"
                          fill="var(--color-accent, #3b82f6)"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <line
                          x1={50 + (mmDose / mmVmax) * 430}
                          y1={220}
                          x2={50 + (mmDose / mmVmax) * 430}
                          y2={220 - (mmResult.cssMgL / 45) * 200}
                          stroke="var(--color-accent, #3b82f6)"
                          strokeDasharray="3 3"
                          strokeOpacity="0.8"
                        />
                      </g>
                    )}
                  </svg>
                </div>

                {/* Axis Labels */}
                <div className="mt-2 flex justify-between text-[11px] text-muted">
                  <span>Dose = 0 mg/day</span>
                  <span className="font-medium text-fg">Daily Dose (mg/day) →</span>
                  <span>Vmax = {mmVmax} mg/day</span>
                </div>
              </div>

              {/* Non-linear Surge Educational Callout */}
              <div className="mt-4 rounded-lg bg-surface-2 p-3.5 border border-border text-xs leading-relaxed">
                <span className="font-semibold text-fg">Why Small Dose Escalations Produce Spikes:</span>
                <p className="mt-1 text-muted">
                  In linear pharmacokinetics, clearance is constant. Here, because therapeutic levels (~10–20 mg/L)
                  exceed Km ({mmKm} mg/L), enzyme sites are nearly saturated. A modest 14% dose increase from 350 to
                  400 mg/day depletes residual clearance, causing steady-state concentrations to surge from ~9.3 mg/L to
                  16.0 mg/L (+72% spike!). At &gt;400 mg/day, levels escalate rapidly into severe ataxia territory.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Zero-Order Ethanol & Salicylate */}
      {selectedId === "zero-order-ethanol-salicylate" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Hourglass className="size-4 text-accent" />
                <h4 className="font-semibold text-fg">Capacity-Limited Elimination Model</h4>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setZeroMode("ethanol")}
                  className={cn(
                    "min-h-[44px] rounded-lg px-4 text-xs font-medium transition-colors border",
                    zeroMode === "ethanol"
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface-2 text-muted hover:text-fg",
                  )}
                >
                  Ethanol (Fixed Zero-Order)
                </button>
                <button
                  type="button"
                  onClick={() => setZeroMode("salicylate")}
                  className={cn(
                    "min-h-[44px] rounded-lg px-4 text-xs font-medium transition-colors border",
                    zeroMode === "salicylate"
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface-2 text-muted hover:text-fg",
                  )}
                >
                  Salicylate / Aspirin (First → Zero Order)
                </button>
              </div>
            </div>

            {zeroMode === "ethanol" ? (
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs">
                      <label htmlFor="eth-bac-slider" className="font-medium text-fg">Blood Alcohol Concentration (BAC):</label>
                      <span className="font-mono font-bold text-accent">
                        {ethanolBacMgDl} mg/dL ({(ethanolBacMgDl / 1000).toFixed(3)}%)
                      </span>
                    </div>
                    <input
                      id="eth-bac-slider"
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={ethanolBacMgDl}
                      onChange={(e) => setEthanolBacMgDl(Number(e.target.value))}
                      className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>10 mg/dL (Mild)</span>
                      <span>80 mg/dL (Legal limit)</span>
                      <span>200 mg/dL (Severe)</span>
                    </div>
                  </div>

                  {/* BAC Quick Chips */}
                  <div className="flex flex-wrap gap-2">
                    {[30, 80, 150, 250].map((bac) => (
                      <button
                        key={bac}
                        type="button"
                        onClick={() => setEthanolBacMgDl(bac)}
                        className="min-h-[44px] rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted hover:text-fg"
                      >
                        {bac} mg/dL
                      </button>
                    ))}
                  </div>

                  <div className="rounded-lg bg-bg-sunken p-3.5 border border-border text-xs leading-relaxed space-y-2">
                    <span className="font-semibold text-fg">Alcohol Dehydrogenase (ADH) Saturation:</span>
                    <p className="text-muted">
                      ADH has an affinity constant Km of only ~2–5 mg/dL. Even with a single social drink (~20–30 mg/dL),
                      ADH is &gt;90% saturated. As a result, ethanol elimination is immutable zero-order: a fixed ~15–20 mg/dL/hour
                      (~7–10 grams of absolute alcohol per hour) is cleared regardless of body hydration, coffee, or rest.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg bg-surface-2 p-4 border border-border text-xs">
                  <h5 className="font-semibold text-fg">Linear Zero-Order Clearance Timeline:</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-surface p-3 border border-border">
                      <span className="text-muted">Fixed Elimination Rate:</span>
                      <div className="mt-1 font-mono text-lg font-bold text-accent">~17.5 mg/dL/hr</div>
                      <span className="text-[10px] text-muted">Fixed amount (not fraction)</span>
                    </div>
                    <div className="rounded-lg bg-surface p-3 border border-border">
                      <span className="text-muted">Time to Complete Clearance:</span>
                      <div className="mt-1 font-mono text-lg font-bold text-fg">~{ethanolClearanceHours} hours</div>
                      <span className="text-[10px] text-muted">Linear decline slope = -k0</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface p-3 border border-border">
                    <span className="font-medium text-fg">Clinical Correlation:</span>
                    <p className="mt-1 text-muted leading-relaxed">
                      Because clearance is fixed, doubling the consumed dose doubles the sobriety timeline. Minor clearance via
                      CYP2E1 occurs only at high concentrations and produces reactive oxygen species that drive hepatic injury.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs">
                      <label htmlFor="sal-level-slider" className="font-medium text-fg">Serum Salicylate Level:</label>
                      <span className="font-mono font-bold text-accent">{salicylateLevelMgDl} mg/dL</span>
                    </div>
                    <input
                      id="sal-level-slider"
                      type="range"
                      min="5"
                      max="90"
                      step="5"
                      value={salicylateLevelMgDl}
                      onChange={(e) => setSalicylateLevelMgDl(Number(e.target.value))}
                      className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>Therapeutic (5-20)</span>
                      <span>Moderate (30-60)</span>
                      <span>Severe Overdose (&gt;70)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <label htmlFor="urine-ph-slider" className="font-medium text-fg">Urinary pH (Alkaline Diuresis Target):</label>
                      <span className="font-mono font-bold text-ok">pH {urinePh.toFixed(1)}</span>
                    </div>
                    <input
                      id="urine-ph-slider"
                      type="range"
                      min="5.0"
                      max="8.5"
                      step="0.1"
                      value={urinePh}
                      onChange={(e) => setUrinePh(Number(e.target.value))}
                      className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-ok"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>pH 5.0 (Acidic baseline)</span>
                      <span>pH 7.5–8.5 (Bicarbonate goal)</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-bg-sunken p-3 border border-border text-xs leading-relaxed">
                    <span className="font-semibold text-fg">Hepatic Conjugation Saturation:</span>
                    <p className="mt-1 text-muted">
                      At low therapeutic doses, glycine conjugation to salicyluric acid provides linear clearance (t1/2 ~2–4h).
                      In overdose, glycine and glucuronide pathways saturate; elimination shifts to zero-order and half-life expands
                      to 20–30 hours! Renal excretion becomes the vital rate-limiting clearance avenue.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg bg-surface-2 p-4 border border-border text-xs">
                  <h5 className="font-semibold text-fg">Henderson-Hasselbalch Ion Trapping Simulator:</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-surface p-3 border border-border">
                      <span className="text-muted">Ionized Salicylate ([A-]):</span>
                      <div className="mt-1 font-mono text-lg font-bold text-ok">
                        {salicylateTrapping.ionizedPct}%
                      </div>
                      <span className="text-[10px] text-muted">Impermeable charged form</span>
                    </div>
                    <div className="rounded-lg bg-surface p-3 border border-border">
                      <span className="text-muted">Renal Clearance Boost:</span>
                      <div className="mt-1 font-mono text-lg font-bold text-accent">
                        {salicylateTrapping.clearanceMultiplier}x
                      </div>
                      <span className="text-[10px] text-muted">Versus acidic baseline urine</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface p-3 border border-border space-y-1">
                    <span className="font-medium text-fg">Effective Elimination Half-Life:</span>
                    <div className="font-mono text-base font-bold text-fg">
                      ~{salicylateTrapping.halfLifeEstimate} hours
                    </div>
                    <p className="text-[11px] text-muted">
                      Alkalinizing urine with sodium bicarbonate to pH 7.5–8.5 traps charged salicylate in the lumen, preventing
                      passive tubular reabsorption and slashing elimination half-life from ~20h down to ~6h.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Vd & Dialysis Tester */}
      {selectedId === "volume-of-distribution-dialysis" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-accent" />
                <h4 className="font-semibold text-fg">Dialysis Clearance Tester (The 4 Determinants)</h4>
              </div>
              <p className="mt-1 text-xs text-muted">
                Test any molecule's physicochemical properties against the four cardinal determinants of extracorporeal clearance.
              </p>
            </div>

            {/* Quick Drug Preset Chips (Touch targets >= 44px) */}
            <div className="mt-4">
              <span className="text-xs font-semibold text-muted">Select Exemplar Drug Preset:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIALYSIS_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setActiveDialysisPreset(preset.name);
                      setDialysisVd(preset.vdLKg);
                      setDialysisPb(preset.proteinBindingPct);
                      setDialysisMw(preset.mwDa);
                    }}
                    className={cn(
                      "min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      activeDialysisPreset === preset.name
                        ? "border-accent bg-accent text-accent-fg shadow-sm"
                        : "border-border bg-surface-2 text-muted hover:text-fg",
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter Sliders */}
            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Vd Slider */}
              <div className="rounded-lg bg-surface-2 p-3.5 border border-border">
                <div className="flex justify-between text-xs">
                  <label htmlFor="vd-slider" className="font-semibold text-fg">Volume of Distribution (Vd):</label>
                  <span className="font-mono font-bold text-accent">{dialysisVd.toFixed(2)} L/kg</span>
                </div>
                <input
                  id="vd-slider"
                  type="range"
                  min="0.05"
                  max="10.0"
                  step="0.05"
                  value={dialysisVd}
                  onChange={(e) => {
                    setActiveDialysisPreset("Custom");
                    setDialysisVd(Number(e.target.value));
                  }}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <span className="mt-1 block text-[11px] text-muted">
                  Criterion: &lt;1.0 L/kg (ideally &lt;0.5 L/kg)
                </span>
              </div>

              {/* Protein Binding Slider */}
              <div className="rounded-lg bg-surface-2 p-3.5 border border-border">
                <div className="flex justify-between text-xs">
                  <label htmlFor="pb-slider" className="font-semibold text-fg">Protein Binding (PB):</label>
                  <span className="font-mono font-bold text-accent">{dialysisPb}%</span>
                </div>
                <input
                  id="pb-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={dialysisPb}
                  onChange={(e) => {
                    setActiveDialysisPreset("Custom");
                    setDialysisPb(Number(e.target.value));
                  }}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <span className="mt-1 block text-[11px] text-muted">
                  Criterion: &lt;80% bound (only free drug traverses membrane)
                </span>
              </div>

              {/* Molecular Weight Slider */}
              <div className="rounded-lg bg-surface-2 p-3.5 border border-border">
                <div className="flex justify-between text-xs">
                  <label htmlFor="mw-slider" className="font-semibold text-fg">Molecular Weight (MW):</label>
                  <span className="font-mono font-bold text-accent">{dialysisMw} Da</span>
                </div>
                <input
                  id="mw-slider"
                  type="range"
                  min="5"
                  max="2000"
                  step="15"
                  value={dialysisMw}
                  onChange={(e) => {
                    setActiveDialysisPreset("Custom");
                    setDialysisMw(Number(e.target.value));
                  }}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <span className="mt-1 block text-[11px] text-muted">
                  Criterion: &lt;500 Da (conventional), &lt;1500 Da (high-flux)
                </span>
              </div>
            </div>

            {/* Dialyzability Verdict Box */}
            <div className="mt-6 rounded-xl border border-border bg-bg-sunken p-5 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-muted">Overall Extraction Evaluation:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      tone={
                        dialysisResult.rating === "dialyzable"
                          ? "ok"
                          : dialysisResult.rating === "partially-dialyzable"
                            ? "warn"
                            : "danger"
                      }
                      className="text-sm px-3 py-1 uppercase"
                    >
                      {dialysisResult.rating.replace("-", " ")}
                    </Badge>
                    <span className="text-xs text-muted">Composite Feasibility Score: {dialysisResult.score}</span>
                  </div>
                </div>
              </div>

              {/* Determinants Checklist */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-lg bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">1. Volume (Vd)</span>
                    <Badge tone={dialysisResult.criteria.vd.meetsCriterion ? "ok" : "danger"}>
                      {dialysisResult.criteria.vd.meetsCriterion ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted leading-snug">
                    {dialysisResult.criteria.vd.detail}
                  </p>
                </div>

                <div className="rounded-lg bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">2. Protein Binding</span>
                    <Badge tone={dialysisResult.criteria.proteinBinding.meetsCriterion ? "ok" : "danger"}>
                      {dialysisResult.criteria.proteinBinding.meetsCriterion ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted leading-snug">
                    {dialysisResult.criteria.proteinBinding.detail}
                  </p>
                </div>

                <div className="rounded-lg bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">3. Molecular Size</span>
                    <Badge tone={dialysisResult.criteria.molecularWeight.meetsCriterion ? "ok" : "danger"}>
                      {dialysisResult.criteria.molecularWeight.meetsCriterion ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted leading-snug">
                    {dialysisResult.criteria.molecularWeight.detail}
                  </p>
                </div>

                <div className="rounded-lg bg-surface p-3 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">4. Solubility</span>
                    <Badge tone={dialysisResult.criteria.waterSolubility.meetsCriterion ? "ok" : "warn"}>
                      {dialysisResult.criteria.waterSolubility.meetsCriterion ? "Aqueous" : "Lipophilic"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted leading-snug">
                    {dialysisResult.criteria.waterSolubility.detail}
                  </p>
                </div>
              </div>

              {/* Explanatory Clinical Text */}
              <div className="rounded-lg bg-surface p-4 border border-border text-xs space-y-1.5">
                <span className="font-semibold text-fg">Mechanistic Summary & Clinical Implication:</span>
                <p className="text-muted leading-relaxed">{dialysisResult.mechanisticExplanation}</p>
                <p className="font-medium text-fg">{dialysisResult.clinicalImplication}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Protein Binding Displacement */}
      {selectedId === "protein-binding-displacement" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-accent" />
                <h4 className="font-semibold text-fg">Protein Binding & Free Fraction (fu) Visualizer</h4>
              </div>
              <p className="mt-1 text-xs text-muted">
                Analyze total vs active unbound free concentrations during albumin displacement or hypoalbuminemia.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Sliders */}
              <div className="space-y-4 lg:col-span-6">
                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="total-phen-slider" className="font-medium text-fg">Measured Total Phenytoin Level:</label>
                    <span className="font-mono font-bold text-accent">{totalLevel} mcg/mL</span>
                  </div>
                  <input
                    id="total-phen-slider"
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={totalLevel}
                    onChange={(e) => setTotalLevel(Number(e.target.value))}
                    className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <span className="mt-1 block text-[11px] text-muted">Standard lab range: 10–20 mcg/mL</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="displaced-fu-slider" className="font-medium text-fg">Displaced Free Fraction (fu):</label>
                    <span className="font-mono font-bold text-danger">{displacedFu}% (Baseline: {baselineFu}%)</span>
                  </div>
                  <input
                    id="displaced-fu-slider"
                    type="range"
                    min="10"
                    max="35"
                    step="1"
                    value={displacedFu}
                    onChange={(e) => setDisplacedFu(Number(e.target.value))}
                    className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-danger"
                  />
                  <span className="mt-1 block text-[11px] text-muted">
                    Valproate co-administration displaces phenytoin from albumin, doubling fu.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="alb-slider" className="font-medium text-fg">Serum Albumin Level:</label>
                    <span className="font-mono font-bold text-fg">{albuminLevel.toFixed(1)} g/dL</span>
                  </div>
                  <input
                    id="alb-slider"
                    type="range"
                    min="1.5"
                    max="4.5"
                    step="0.1"
                    value={albuminLevel}
                    onChange={(e) => setAlbuminLevel(Number(e.target.value))}
                    className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <span className="mt-1 block text-[11px] text-muted">Normal albumin: 3.5–5.0 g/dL</span>
                </div>
              </div>

              {/* Visual Breakdown Card */}
              <div className="space-y-4 rounded-xl border border-border bg-surface-2 p-5 lg:col-span-6 flex flex-col justify-between">
                <div>
                  <h5 className="font-semibold text-fg text-sm">Active Free vs Measured Total Comparison</h5>
                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between">
                        <span className="text-muted">Total Measured Level (Apparent):</span>
                        <span className="font-mono font-bold text-fg">{totalLevel} mcg/mL</span>
                      </div>
                      <div className="mt-1 h-3 w-full rounded-full bg-bg-sunken overflow-hidden">
                        <div
                          className="h-full bg-fg/40 rounded-full"
                          style={{ width: `${Math.min(100, (totalLevel / 30) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted">Appears within normal limits (10–20 mcg/mL)</span>
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <span className="text-muted">Active Unbound Free Level:</span>
                        <span
                          className={cn(
                            "font-mono font-bold",
                            displacementResult.displacedFreeMcgMl > 2.0 ? "text-danger" : "text-ok",
                          )}
                        >
                          {displacementResult.displacedFreeMcgMl} mcg/mL
                        </span>
                      </div>
                      <div className="mt-1 h-3 w-full rounded-full bg-bg-sunken overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            displacementResult.displacedFreeMcgMl > 2.0 ? "bg-danger" : "bg-ok",
                          )}
                          style={{
                            width: `${Math.min(100, (displacementResult.displacedFreeMcgMl / 4.0) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted">
                        Goal: 1.0–2.0 mcg/mL. &gt;2.0 mcg/mL = TOXIC
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface p-3 border border-border">
                      <div className="flex justify-between">
                        <span className="text-muted">Winter-Tozer Corrected Total:</span>
                        <span className="font-mono font-bold text-accent">
                          {displacementResult.winterTozerCorrectedMcgMl} mcg/mL
                        </span>
                      </div>
                      <span className="text-[10px] text-muted">
                        Estimates equivalent level if albumin were normal (4.4 g/dL).
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deceptive Normal Alert */}
                {displacementResult.isDeceptiveNormal && (
                  <div className="rounded-lg border border-danger bg-danger-soft p-3 text-xs text-danger">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>The Clinical Displacement Trap!</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">
                      Total level is {totalLevel} mcg/mL (comfortably &apos;normal&apos;), yet active free level is{" "}
                      {displacementResult.displacedFreeMcgMl} mcg/mL (toxic range). Increasing dose based on the total level
                      risks severe neurotoxicity. Always order a direct free level when valproate is co-administered!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Steady-State Accumulation */}
      {selectedId === "steady-state-accumulation" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-accent" />
                <h4 className="font-semibold text-fg">Steady-State (Css), Half-Life & Accumulation Index</h4>
              </div>
              <p className="mt-1 text-xs text-muted">
                Analyze drug accumulation factor R, the Rule of 5 Half-Lives, and Loading Dose (Vd) vs Maintenance Dose (CL).
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="hl-slider" className="font-medium text-fg">Elimination Half-Life (t1/2):</label>
                    <span className="font-mono font-bold text-accent">{halfLife} hours</span>
                  </div>
                  <input
                    id="hl-slider"
                    type="range"
                    min="2"
                    max="48"
                    step="1"
                    value={halfLife}
                    onChange={(e) => setHalfLife(Number(e.target.value))}
                    className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted">
                    <span>2h (Gentamicin)</span>
                    <span>12h (Digoxin/Lithium)</span>
                    <span>48h (Phenobarbital)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <label htmlFor="tau-slider" className="font-medium text-fg">Dosing Interval (τ):</label>
                    <span className="font-mono font-bold text-fg">Every {dosingTau} hours</span>
                  </div>
                  <input
                    id="tau-slider"
                    type="range"
                    min="4"
                    max="48"
                    step="2"
                    value={dosingTau}
                    onChange={(e) => setDosingTau(Number(e.target.value))}
                    className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted">
                    <span>q6h</span>
                    <span>q8h</span>
                    <span>q12h</span>
                    <span>q24h</span>
                  </div>
                </div>

                <div className="rounded-lg bg-bg-sunken p-3.5 border border-border text-xs leading-relaxed">
                  <span className="font-semibold text-fg">The Rule of 5 Half-Lives:</span>
                  <p className="mt-1 text-muted">
                    Time to reach steady state is independent of dose magnitude or frequency: it is dictated solely by t1/2.
                    1 t1/2 = 50%, 2 t1/2 = 75%, 3 t1/2 = 87.5%, 4 t1/2 = 93.8%, 5 t1/2 = 96.9% of steady state.
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-surface-2 p-5 border border-border text-xs">
                <h5 className="font-semibold text-fg text-sm">Accumulation & Kinetics Summary</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface p-3 border border-border">
                    <span className="text-muted">Accumulation Index (R):</span>
                    <div className="mt-1 font-mono text-lg font-bold text-accent">
                      {accumulationResult.accumulationFactorR}x
                    </div>
                    <span className="text-[10px] text-muted">Css_peak = C1_peak * R</span>
                  </div>

                  <div className="rounded-lg bg-surface p-3 border border-border">
                    <span className="text-muted">Time to 95% Steady-State:</span>
                    <div className="mt-1 font-mono text-lg font-bold text-fg">
                      ~{accumulationResult.hoursToNinetyFivePercentCss} h
                    </div>
                    <span className="text-[10px] text-muted">~4.3 half-lives elapsed</span>
                  </div>
                </div>

                {/* Loading Dose vs Maintenance Dose Formula Dissector */}
                <div className="rounded-lg bg-surface p-3.5 border border-border space-y-2">
                  <span className="font-semibold text-fg">Loading Dose vs Maintenance Dose Principles:</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                    <div className="rounded bg-bg-sunken p-2 border border-border/50">
                      <code className="font-mono font-bold text-accent">LD = (Vd * Ctarget) / F</code>
                      <p className="mt-1 text-[11px] text-muted">
                        Governed solely by Volume of Distribution (Vd). Remains unchanged in acute kidney injury.
                      </p>
                    </div>
                    <div className="rounded bg-bg-sunken p-2 border border-border/50">
                      <code className="font-mono font-bold text-accent">MD = (CL * Ctarget * τ) / F</code>
                      <p className="mt-1 text-[11px] text-muted">
                        Governed solely by Systemic Clearance (CL). Must be reduced proportionally in organ failure.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Pearls & Board Exam Notes Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bedside Clinical Pearls */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sparkles className="size-4 text-accent" />
            <h4 className="font-serif text-lg font-bold text-fg">Bedside & TDM Clinical Pearls</h4>
          </div>
          <ul className="space-y-2.5 text-xs text-muted">
            {activeConcept.clinicalPearls.map((pearl, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 border border-border/60">
                <Check className="size-4 shrink-0 text-accent mt-0.5" />
                <span className="leading-relaxed text-fg">{pearl}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Exam Board Traps */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BookOpen className="size-4 text-warn" />
            <h4 className="font-serif text-lg font-bold text-fg">Exam Board Traps (USMLE / NAPLEX)</h4>
          </div>
          <ul className="space-y-2.5 text-xs text-muted">
            {activeConcept.examBoardNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 border border-border/60">
                <AlertTriangle className="size-4 shrink-0 text-warn mt-0.5" />
                <span className="leading-relaxed text-fg">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Literature Citations */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookOpen className="size-4 text-muted" />
          <h4 className="font-semibold text-fg text-sm">Authoritative Literature Citations</h4>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-muted">
          {activeConcept.citations.map((cite, i) => (
            <li key={i} className="list-disc ml-4 leading-relaxed">
              {cite}
            </li>
          ))}
        </ul>
      </div>

      {/* Regulatory Notice Banner */}
      <div className="rounded-xl border border-border/70 bg-bg-sunken p-4 text-xs text-muted">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 text-muted mt-0.5" />
          <p className="leading-relaxed">{REGULATORY_NOTICE}</p>
        </div>
      </div>
    </div>
  );
}
