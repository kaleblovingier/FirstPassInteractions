import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Droplets,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Pill,
  Scale,
  ShieldAlert,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  GLYCEMIC_CDS_DISCLAIMER,
  GLYCEMIC_CITATIONS,
  evaluatePotassiumSafetyGate,
  calculateCorrectedSodium,
  calculateEffectiveSerumOsmolality,
  calculateAnionGap,
  evaluateTwoBagFluidTitration,
  evaluateIvInsulinProtocol,
  evaluateSulfonylureaToxicity,
  calculateInpatientInsulinRegimen,
  glycemicOnDesk,
  glycemicReportOnDesk,
} from "@/lib/drugs/glycemic-kinetics";

export interface GlycemicStationProps {
  ids: string[];
  host: HostContext;
}

export function GlycemicStation({ ids, host }: GlycemicStationProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "resuscitation" | "fluids" | "octreotide" | "inpatient" | "literature"
  >("resuscitation");

  // Core Calculator States
  const [condition, setCondition] = useState<"DKA" | "HHS">("DKA");
  const [patientWeightKg, setPatientWeightKg] = useState<number>(70);
  const [currentGlucose, setCurrentGlucose] = useState<number>(420);
  const [priorGlucose, setPriorGlucose] = useState<string>("480");
  const [serumPotassium, setSerumPotassium] = useState<number>(4.2);
  const [measuredSodium, setMeasuredSodium] = useState<number>(132);
  const [chloride, setChloride] = useState<number>(98);
  const [bicarbonate, setBicarbonate] = useState<number>(12);
  const [venousPh, setVenousPh] = useState<number>(7.20);
  const [sodiumFormula, setSodiumFormula] = useState<"katz" | "hillier">("katz");
  const [patientPhenotype, setPatientPhenotype] = useState<"frail_renal" | "standard" | "obese_resistant">("standard");
  const [isNpo, setIsNpo] = useState<boolean>(false);
  const [isSulfonylureaOverdose, setIsSulfonylureaOverdose] = useState<boolean>(false);

  // Active Desk Report
  const report = useMemo(
    () =>
      glycemicReportOnDesk(ids, host, {
        patientWeightKg,
        serumPotassium,
        bloodGlucose: currentGlucose,
        priorBloodGlucose: priorGlucose ? Number(priorGlucose) : undefined,
        measuredSodium,
        chloride,
        serumBicarbonate: bicarbonate,
        venousPh,
        condition,
        isNpo,
        patientPhenotype,
        isSulfonylureaOverdose,
      }),
    [
      ids.join("|"),
      host,
      patientWeightKg,
      serumPotassium,
      currentGlucose,
      priorGlucose,
      measuredSodium,
      chloride,
      bicarbonate,
      venousPh,
      condition,
      isNpo,
      patientPhenotype,
      isSulfonylureaOverdose,
    ],
  );

  const { onDesk, potassiumGate, fluidTitration, insulinProtocol, octreotideProtocol, inpatientRegimen } = report;

  // Presets
  const applyPreset = (preset: "classic-dka" | "hypo-k-gate" | "severe-hhs" | "su-overdose" | "resolved-dka") => {
    switch (preset) {
      case "classic-dka":
        setCondition("DKA");
        setPatientWeightKg(70);
        setCurrentGlucose(420);
        setPriorGlucose("480");
        setSerumPotassium(5.1);
        setMeasuredSodium(132);
        setChloride(98);
        setBicarbonate(12);
        setVenousPh(7.20);
        setIsSulfonylureaOverdose(false);
        break;
      case "hypo-k-gate":
        setCondition("DKA");
        setPatientWeightKg(70);
        setCurrentGlucose(520);
        setPriorGlucose("560");
        setSerumPotassium(2.9);
        setMeasuredSodium(130);
        setChloride(99);
        setBicarbonate(10);
        setVenousPh(7.18);
        setIsSulfonylureaOverdose(false);
        break;
      case "severe-hhs":
        setCondition("HHS");
        setPatientWeightKg(85);
        setCurrentGlucose(880);
        setPriorGlucose("950");
        setSerumPotassium(4.9);
        setMeasuredSodium(142);
        setChloride(104);
        setBicarbonate(22);
        setVenousPh(7.36);
        setIsSulfonylureaOverdose(false);
        break;
      case "su-overdose":
        setCurrentGlucose(44);
        setPriorGlucose("62");
        setSerumPotassium(4.1);
        setMeasuredSodium(138);
        setChloride(102);
        setBicarbonate(24);
        setVenousPh(7.41);
        setIsSulfonylureaOverdose(true);
        setActiveTab("octreotide");
        break;
      case "resolved-dka":
        setCondition("DKA");
        setPatientWeightKg(70);
        setCurrentGlucose(165);
        setPriorGlucose("210");
        setSerumPotassium(4.4);
        setMeasuredSodium(138);
        setChloride(105);
        setBicarbonate(19);
        setVenousPh(7.34);
        setIsSulfonylureaOverdose(false);
        break;
    }
  };

  const anionGapValue = calculateAnionGap(measuredSodium, chloride, bicarbonate);

  return (
    <div className="space-y-4">
      {/* 1. Header & Active Clinical Banner */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold tracking-tight text-fg">
                Glycemic Kinetics &amp; DKA / HHS Resuscitation Station
              </h2>
              <p className="text-xs text-muted">
                ADA Standards of Care · Critical Potassium Safety Gate · Two-Bag Titration · Octreotide SU Antidote · Inpatient Basal-Bolus Sizing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              tone={
                onDesk.hasGlycemicAgent
                  ? "accent"
                  : "default"
              }
              className="text-[11px] font-semibold"
            >
              Tray: {onDesk.summary}
            </Badge>
            <Badge
              tone={
                potassiumGate.status === "critical-hold-insulin"
                  ? "danger"
                  : potassiumGate.status === "replete-k-run-insulin"
                  ? "warn"
                  : "ok"
              }
              className="text-[11px] font-semibold"
            >
              K+ Gate: {potassiumGate.insulinAction === "HOLD_ALL_INSULIN" ? "HOLD INSULIN" : "INSULIN PERMITTED"}
            </Badge>
            <Badge
              tone={fluidTitration.dextroseAdditionMilestone.reached ? "info" : "default"}
              className="text-[11px] font-semibold"
            >
              {condition}: {fluidTitration.dextroseAdditionMilestone.reached ? "Dextrose Active" : "No Dextrose"}
            </Badge>
          </div>
        </div>

        {/* Critical Red Warning Banner when K+ < 3.3 */}
        {potassiumGate.status === "critical-hold-insulin" && (
          <div className="rounded-lg border-2 border-red-500 bg-red-500/15 p-3.5 text-xs text-red-900 dark:text-red-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                  Critical Potassium Safety Alert — Serum K+ &lt; 3.3 mEq/L
                </span>
                <p className="font-medium leading-relaxed">
                  {potassiumGate.warningBanner}
                </p>
                <p className="text-[11px] opacity-90">
                  <strong>Action:</strong> {potassiumGate.potassiumReplacementRate}. Target K+ &gt;= 3.3 mEq/L prior to starting insulin.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Regulatory Posture Note */}
        <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-surface-sunken p-2.5 text-[11px] text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          <span>
            <strong>FD&amp;C Act § 520(o)(1)(E) Non-Device CDS:</strong> Educational physiological reference modeling published ADA guidelines and clinical pharmacotherapy literature. Licensed clinician independent verification required. Not an automated closed-loop infusion directive.
          </span>
        </div>

        {/* Quick Scenario Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted">Presets:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => applyPreset("classic-dka")}
          >
            Classic DKA (K+ 5.1)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2 border-red-400 text-red-600 dark:text-red-400"
            onClick={() => applyPreset("hypo-k-gate")}
          >
            Hypokalemia Gate (K+ 2.9)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => applyPreset("severe-hhs")}
          >
            Severe HHS (Glucose 880)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2 text-amber-600 dark:text-amber-400"
            onClick={() => applyPreset("su-overdose")}
          >
            Sulfonylurea Overdose
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2 text-emerald-600 dark:text-emerald-400"
            onClick={() => applyPreset("resolved-dka")}
          >
            Resolved DKA (Bridge SubQ)
          </Button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        <Button
          variant={activeTab === "resuscitation" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveTab("resuscitation")}
        >
          <Activity className="mr-1.5 h-3.5 w-3.5" />
          DKA/HHS Resuscitation &amp; K+ Gate
        </Button>
        <Button
          variant={activeTab === "fluids" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveTab("fluids")}
        >
          <Droplets className="mr-1.5 h-3.5 w-3.5" />
          Two-Bag Fluid &amp; Dextrose Point
        </Button>
        <Button
          variant={activeTab === "octreotide" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveTab("octreotide")}
        >
          <Pill className="mr-1.5 h-3.5 w-3.5" />
          Sulfonylurea Overdose &amp; Octreotide
        </Button>
        <Button
          variant={activeTab === "inpatient" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveTab("inpatient")}
        >
          <Scale className="mr-1.5 h-3.5 w-3.5" />
          Inpatient Basal-Bolus Sizing
        </Button>
        <Button
          variant={activeTab === "literature" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold"
          onClick={() => setActiveTab("literature")}
        >
          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          Guideline Evidence &amp; Citations
        </Button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: DKA/HHS RESUSCITATION & POTASSIUM GATE */}
      {activeTab === "resuscitation" && (
        <div className="space-y-4">
          {/* Patient Parameter Inputs */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Bedside Resuscitation Parameters &amp; Serum Chemistry
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">Crisis Type</label>
                <div className="flex h-9 rounded-md border border-border bg-surface-sunken p-0.5">
                  <button
                    type="button"
                    onClick={() => setCondition("DKA")}
                    className={cn(
                      "flex-1 rounded text-xs font-medium transition-colors",
                      condition === "DKA" ? "bg-surface shadow-xs text-fg font-bold" : "text-muted",
                    )}
                  >
                    DKA
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition("HHS")}
                    className={cn(
                      "flex-1 rounded text-xs font-medium transition-colors",
                      condition === "HHS" ? "bg-surface shadow-xs text-fg font-bold" : "text-muted",
                    )}
                  >
                    HHS
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">Glucose (mg/dL)</label>
                <Input
                  type="number"
                  value={currentGlucose}
                  onChange={(e) => setCurrentGlucose(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">Prior Glucose</label>
                <Input
                  type="number"
                  placeholder="1 hr ago"
                  value={priorGlucose}
                  onChange={(e) => setPriorGlucose(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">K+ (mEq/L)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={serumPotassium}
                  onChange={(e) => setSerumPotassium(Number(e.target.value) || 0)}
                  className={cn(
                    "h-9 text-xs font-mono font-bold",
                    serumPotassium < 3.3 ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400" : "",
                  )}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">Na (mEq/L)</label>
                <Input
                  type="number"
                  value={measuredSodium}
                  onChange={(e) => setMeasuredSodium(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">Cl (mEq/L)</label>
                <Input
                  type="number"
                  value={chloride}
                  onChange={(e) => setChloride(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">HCO3 (mEq/L)</label>
                <Input
                  type="number"
                  value={bicarbonate}
                  onChange={(e) => setBicarbonate(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">Venous pH</label>
                <Input
                  type="number"
                  step="0.01"
                  value={venousPh}
                  onChange={(e) => setVenousPh(Number(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span>Weight:</span>
                <input
                  type="number"
                  value={patientWeightKg}
                  onChange={(e) => setPatientWeightKg(Math.max(20, Math.min(250, Number(e.target.value) || 70)))}
                  className="w-16 rounded border border-border bg-surface-sunken px-2 py-0.5 text-xs font-mono font-bold text-fg"
                />
                <span>kg</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span>
                  Anion Gap: <strong className={anionGapValue > 12 ? "text-red-500" : "text-emerald-500"}>{anionGapValue}</strong> mEq/L
                </span>
                <span>
                  Corrected Na: <strong>{fluidTitration.correctedSodium.correctedNa}</strong> mEq/L
                </span>
                <span>
                  Effective Osm: <strong>{fluidTitration.effectiveSerumOsmolality}</strong> mOsm/kg
                </span>
              </div>
            </div>
          </div>

          {/* Visual Potassium Gate Card */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-fg">Critical Potassium Threshold Gate</h3>
              </div>
              <span className="text-xs font-mono text-muted">ADA Resuscitation Algorithm</span>
            </div>

            {/* Stepped Scale Graphic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Gate 1: < 3.3 */}
              <div
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  potassiumGate.status === "critical-hold-insulin"
                    ? "border-red-500 bg-red-500/10 shadow-sm"
                    : "border-border/60 bg-surface-sunken opacity-60",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-red-600 dark:text-red-400">&lt; 3.3 mEq/L</span>
                  <Badge tone="danger" className="text-[10px]">
                    HOLD INSULIN
                  </Badge>
                </div>
                <p className="text-[11px] text-muted mb-2">
                  Severe hypokalemia. Insulin drives K+ into cells via Na+/K+ ATPase, risking lethal arrhythmia and respiratory arrest.
                </p>
                <div className="text-[11px] font-semibold text-fg">
                  Replete: 20-40 mEq/h IV until K+ &gt;= 3.3
                </div>
              </div>

              {/* Gate 2: 3.3 - 5.3 */}
              <div
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  potassiumGate.status === "replete-k-run-insulin"
                    ? "border-amber-500 bg-amber-500/10 shadow-sm"
                    : "border-border/60 bg-surface-sunken opacity-60",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-amber-600 dark:text-amber-400">3.3 to 5.3 mEq/L</span>
                  <Badge tone="warn" className="text-[10px]">
                    REPLETE &amp; RUN INSULIN
                  </Badge>
                </div>
                <p className="text-[11px] text-muted mb-2">
                  Total body stores depleted. Add maintenance K+ to IV fluids to keep serum K+ 4.0-5.0 while infusing insulin.
                </p>
                <div className="text-[11px] font-semibold text-fg">
                  Add: 20-30 mEq K+ per liter IV fluid
                </div>
              </div>

              {/* Gate 3: > 5.3 */}
              <div
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  potassiumGate.status === "hold-k-run-insulin"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                    : "border-border/60 bg-surface-sunken opacity-60",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">&gt; 5.3 mEq/L</span>
                  <Badge tone="ok" className="text-[10px]">
                    HOLD K+ &amp; RUN INSULIN
                  </Badge>
                </div>
                <p className="text-[11px] text-muted mb-2">
                  Transcellular acidemia shift and volume contraction elevate serum K+. Do not add K+; check q2h.
                </p>
                <div className="text-[11px] font-semibold text-fg">
                  Hold K+; re-check serum K+ q2h
                </div>
              </div>
            </div>
          </div>

          {/* Regular Insulin Sizing & Rate of Decline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insulin Dosing Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-bold text-fg">IV Regular Insulin Dosing</h3>
                </div>
                <Badge
                  tone={insulinProtocol.isInsulinPermittedByKGate ? "ok" : "danger"}
                  className="text-[10px]"
                >
                  {insulinProtocol.isInsulinPermittedByKGate ? "Permitted" : "HELD by K+ Gate"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border/70 bg-surface-sunken p-2.5">
                  <div className="text-[11px] text-muted font-medium">Standard Fixed Rate (0.1 u/kg/h)</div>
                  <div className="text-lg font-bold font-mono text-fg mt-0.5">
                    {insulinProtocol.fixedRateUnitsPerHour}{" "}
                    <span className="text-xs font-normal text-muted">units/h</span>
                  </div>
                  <div className="text-[10px] text-muted mt-1">Optional initial 0.1 u/kg bolus: {insulinProtocol.optionalInitialBolusUnits} units</div>
                </div>

                <div className="rounded-lg border border-border/70 bg-surface-sunken p-2.5">
                  <div className="text-[11px] text-muted font-medium">No-Bolus Rate (0.14 u/kg/h)</div>
                  <div className="text-lg font-bold font-mono text-fg mt-0.5">
                    {insulinProtocol.noBolusRateUnitsPerHour}{" "}
                    <span className="text-xs font-normal text-muted">units/h</span>
                  </div>
                  <div className="text-[10px] text-muted mt-1">Continuous infusion without loading dose</div>
                </div>
              </div>

              {/* Target Rate of Decline Analysis */}
              {insulinProtocol.declineRateEvaluation && (
                <div className="rounded-lg border border-border/60 bg-surface-sunken p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Hourly Glucose Decline:</span>
                    <span
                      className={cn(
                        "font-mono",
                        insulinProtocol.declineRateEvaluation.assessment === "optimal"
                          ? "text-emerald-500"
                          : insulinProtocol.declineRateEvaluation.assessment === "subtarget"
                          ? "text-amber-500"
                          : "text-red-500",
                      )}
                    >
                      {insulinProtocol.declineRateEvaluation.hourlyDecline} mg/dL/h (Target: 50-75)
                    </span>
                  </div>
                  <p className="text-muted leading-relaxed text-[11px]">
                    {insulinProtocol.declineRateEvaluation.clinicalGuidance}
                  </p>
                </div>
              )}
            </div>

            {/* DKA Resolution Criteria & SubQ Transition Bridge */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-fg">DKA Resolution &amp; SubQ Transition</h3>
                </div>
                <Badge
                  tone={insulinProtocol.dkaResolutionStatus.isResolved ? "ok" : "default"}
                  className="text-[10px]"
                >
                  {insulinProtocol.dkaResolutionStatus.isResolved ? "RESOLVED" : "IN PROGRESS"}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-fg">Resolution Criteria (Blood Glucose &lt; 200 AND &gt;= 2 of labs):</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={cn("flex items-center gap-1.5", currentGlucose < 200 ? "text-emerald-500" : "text-muted")}>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Glucose &lt; 200 mg/dL ({currentGlucose})</span>
                  </div>
                  <div className={cn("flex items-center gap-1.5", bicarbonate >= 18 ? "text-emerald-500" : "text-muted")}>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>HCO3 &gt;= 18 mEq/L ({bicarbonate})</span>
                  </div>
                  <div className={cn("flex items-center gap-1.5", venousPh > 7.30 ? "text-emerald-500" : "text-muted")}>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Venous pH &gt; 7.30 ({venousPh})</span>
                  </div>
                  <div className={cn("flex items-center gap-1.5", anionGapValue <= 12 ? "text-emerald-500" : "text-muted")}>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Anion Gap &lt;= 12 ({anionGapValue})</span>
                  </div>
                </div>
              </div>

              {/* SubQ Transition Bridge */}
              <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-500/10 p-2.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Mandatory 2-Hour Subcutaneous Transition Bridge</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {insulinProtocol.subcutaneousTransitionBridge.halfLifeWarning}
                </p>
                <div className="text-[11px] font-medium text-fg pt-1">
                  <strong>Protocol:</strong> Administer subcutaneous basal insulin 2 hours prior to stopping the IV infusion.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TWO-BAG FLUID TITRATION & DEXTROSE POINT */}
      {activeTab === "fluids" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-fg">Two-Bag IV Fluid Titration &amp; Osmolality Management</h3>
                <p className="text-xs text-muted">
                  Corrected Sodium calculation and stepped fluid transition to prevent acute cerebral edema
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Formula:</span>
                <div className="flex rounded-md border border-border bg-surface-sunken p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSodiumFormula("katz")}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      sodiumFormula === "katz" ? "bg-surface shadow-xs font-bold text-fg" : "text-muted",
                    )}
                  >
                    Katz (1.6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSodiumFormula("hillier")}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      sodiumFormula === "hillier" ? "bg-surface shadow-xs font-bold text-fg" : "text-muted",
                    )}
                  >
                    Hillier (2.0)
                  </button>
                </div>
              </div>
            </div>

            {/* Sodium Analysis Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3">
                <div className="text-xs text-muted">Measured Sodium</div>
                <div className="text-xl font-bold font-mono text-fg mt-0.5">
                  {measuredSodium} <span className="text-xs font-normal text-muted">mEq/L</span>
                </div>
                <div className="text-[11px] text-muted mt-1">Serum lab uncorrected</div>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3">
                <div className="text-xs text-muted">Corrected Sodium ({sodiumFormula})</div>
                <div className="text-xl font-bold font-mono text-fg mt-0.5">
                  {fluidTitration.correctedSodium.correctedNa} <span className="text-xs font-normal text-muted">mEq/L</span>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  Delta: +{fluidTitration.correctedSodium.deltaNa} mEq/L ({fluidTitration.correctedSodium.clinicalInterpretation} osmolality tier)
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3">
                <div className="text-xs text-muted">Effective Serum Osmolality</div>
                <div className="text-xl font-bold font-mono text-fg mt-0.5">
                  {fluidTitration.effectiveSerumOsmolality} <span className="text-xs font-normal text-muted">mOsm/kg</span>
                </div>
                <div className="text-[11px] text-muted mt-1">2 * Na + (Glucose / 18) (Target &lt; 320 in HHS)</div>
              </div>
            </div>

            {/* Stepped Fluid Phase Guide */}
            <div className="rounded-lg border border-border/70 bg-surface p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Stepped Resuscitation Sequence
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-border/60 bg-surface-sunken p-3 space-y-1">
                  <div className="font-bold text-fg flex items-center justify-between">
                    <span>Phase 1: Initial Volume Expansion (Hours 1–2)</span>
                    <Badge tone="default">1,000–1,500 mL/h</Badge>
                  </div>
                  <p className="text-[11px] text-muted">
                    {fluidTitration.initialResuscitation.clinicalObjective}
                  </p>
                  <div className="text-[11px] font-semibold text-fg">
                    Fluid: {fluidTitration.initialResuscitation.fluidType}
                  </div>
                </div>

                <div className="rounded-md border border-border/60 bg-surface-sunken p-3 space-y-1">
                  <div className="font-bold text-fg flex items-center justify-between">
                    <span>Phase 2: Deficit Replacement (Hours 2+)</span>
                    <Badge tone="accent">250–500 mL/h</Badge>
                  </div>
                  <p className="text-[11px] text-muted">
                    {fluidTitration.maintenanceFluidPhase.rationale}
                  </p>
                  <div className="text-[11px] font-semibold text-fg">
                    Fluid: {fluidTitration.maintenanceFluidPhase.fluidType} + 20–30 mEq K+/L
                  </div>
                </div>
              </div>
            </div>

            {/* Dextrose Switch Point Indicator & Cerebral Edema Alert */}
            <div
              className={cn(
                "rounded-lg border p-4 space-y-2 transition-colors",
                fluidTitration.dextroseAdditionMilestone.reached
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border/60 bg-surface-sunken",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="font-bold text-xs text-fg">
                    Dextrose Addition Milestone (Switch Point: &lt; {fluidTitration.dextroseSwitchThreshold} mg/dL)
                  </span>
                </div>
                <Badge
                  tone={fluidTitration.dextroseAdditionMilestone.reached ? "info" : "default"}
                  className="text-[10px]"
                >
                  {fluidTitration.dextroseAdditionMilestone.reached ? "ACTIVE: ADD DEXTROSE" : "PENDING"}
                </Badge>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                {fluidTitration.dextroseAdditionMilestone.cerebralEdemaWarning}
              </p>

              {/* Two-Bag Setup Visual */}
              <div className="rounded-md border border-blue-400/40 bg-surface p-3 mt-2 text-xs space-y-2">
                <div className="font-bold text-blue-700 dark:text-blue-300">Two-Bag System Simulator:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded border border-border/60 p-2 bg-surface-sunken">
                    <strong className="text-fg">Bag 1 (Zero Dextrose):</strong>
                    <div className="text-muted">{fluidTitration.dextroseAdditionMilestone.twoBagComposition.bag1}</div>
                  </div>
                  <div className="rounded border border-border/60 p-2 bg-surface-sunken">
                    <strong className="text-fg">Bag 2 (10% Dextrose):</strong>
                    <div className="text-muted">{fluidTitration.dextroseAdditionMilestone.twoBagComposition.bag2}</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted italic">
                  {fluidTitration.dextroseAdditionMilestone.twoBagComposition.titrationStrategy}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SULFONYLUREA OVERDOSE & OCTREOTIDE ANTIDOTE */}
      {activeTab === "octreotide" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-fg">Sulfonylurea Overdose &amp; Octreotide Antidote Protocol</h3>
                  <p className="text-xs text-muted">
                    SSTR2 Receptor Activation &amp; Reversal of the Paradoxical Dextrose Trap
                  </p>
                </div>
              </div>
              <Badge
                tone={octreotideProtocol.hasSulfonylureaOrSecretagogue || isSulfonylureaOverdose ? "danger" : "default"}
                className="text-[10px]"
              >
                {octreotideProtocol.hasSulfonylureaOrSecretagogue || isSulfonylureaOverdose ? "Secretagogue Hazard" : "Reference"}
              </Badge>
            </div>

            {/* Paradoxical Dextrose Trap Callout */}
            <div className="rounded-lg border-2 border-amber-500 bg-amber-500/10 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>The Paradoxical Dextrose Trap</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {octreotideProtocol.paradoxicalDextroseTrapWarning}
              </p>
            </div>

            {/* Mechanism & Protocol Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3.5 text-xs space-y-2">
                <h4 className="font-bold text-fg flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Pharmacodynamic Antidote Mechanism
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  {octreotideProtocol.pharmacodynamicMechanism}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3.5 text-xs space-y-2">
                <h4 className="font-bold text-fg flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-emerald-500" />
                  Dosing &amp; Observation Protocol
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <strong className="text-fg">Adult Regimen:</strong> {octreotideProtocol.adultDosing.doseRange} {octreotideProtocol.adultDosing.route} {octreotideProtocol.adultDosing.frequency} ({octreotideProtocol.adultDosing.durationHours})
                  </div>
                  <div>
                    <strong className="text-fg">Pediatric Regimen:</strong> {octreotideProtocol.pediatricDosing.doseMgKg} {octreotideProtocol.pediatricDosing.frequency}
                  </div>
                  <div>
                    <strong className="text-fg">Mandatory Observation:</strong> Monitor blood glucose for &gt;= {octreotideProtocol.observationWindowHours} hours after final octreotide dose prior to discharge.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INPATIENT BASAL-BOLUS SIZING ENGINE */}
      {activeTab === "inpatient" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-fg">Inpatient Basal-Bolus-Correction Insulin Regimen</h3>
                <p className="text-xs text-muted">
                  Landmark RABBIT 2 Trial &amp; ADA Hospital Standards · Weight-based physiological estimation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Phenotype:</span>
                <select
                  value={patientPhenotype}
                  onChange={(e) => setPatientPhenotype(e.target.value as any)}
                  className="rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-xs font-medium text-fg"
                >
                  <option value="frail_renal">Frail / Geriatric / CKD / Dialysis (0.2–0.3 u/kg)</option>
                  <option value="standard">Standard Adult T2D (0.4–0.5 u/kg)</option>
                  <option value="obese_resistant">Obese / Steroids / Severe Resistance (0.6–0.8 u/kg)</option>
                </select>
              </div>
            </div>

            {/* Metric Summaries */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3 text-center">
                <div className="text-xs text-muted">Total Daily Dose (TDD)</div>
                <div className="text-xl font-bold font-mono text-fg mt-0.5">
                  {inpatientRegimen.totalDailyDoseUnits} <span className="text-xs font-normal text-muted">units/day</span>
                </div>
                <div className="text-[10px] text-muted mt-1">{inpatientRegimen.phenotypeMultiplier} units/kg/day</div>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3 text-center">
                <div className="text-xs text-muted">Basal Component (50%)</div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {inpatientRegimen.basalComponent.dailyUnits} <span className="text-xs font-normal text-muted">units</span>
                </div>
                <div className="text-[10px] text-muted mt-1">Glargine / Degludec once daily</div>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3 text-center">
                <div className="text-xs text-muted">Prandial Bolus (50%)</div>
                <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                  {inpatientRegimen.prandialComponent.perMealUnits} <span className="text-xs font-normal text-muted">u / meal</span>
                </div>
                <div className="text-[10px] text-muted mt-1">Lispro / Aspart with 3 meals</div>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-sunken p-3 text-center">
                <div className="text-xs text-muted">Rule of 1800 ISF</div>
                <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                  1 u : {inpatientRegimen.correctionScale.ruleOf1800Isf} <span className="text-xs font-normal text-muted">mg/dL</span>
                </div>
                <div className="text-[10px] text-muted mt-1">1800 / TDD sensitivity factor</div>
              </div>
            </div>

            {/* NPO Checkbox & Guidance */}
            <div className="rounded-lg border border-border/70 bg-surface-sunken p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="npo-check"
                  checked={isNpo}
                  onChange={(e) => setIsNpo(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="npo-check" className="font-semibold text-fg cursor-pointer">
                  Patient is NPO (Nothing by mouth)
                </label>
              </div>
              <span className="text-[11px] text-muted">
                {isNpo ? "HOLD nutritional prandial doses; continue basal + correctional" : "Regular meal oral intake"}
              </span>
            </div>

            {/* Stepped Correction Scale Table */}
            <div className="rounded-lg border border-border/70 bg-surface p-3.5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Rapid-Acting Correctional Scale (Rule of 1800, Target 140 mg/dL)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/60 text-muted text-[11px]">
                    <tr>
                      <th className="pb-2 font-medium">Blood Glucose Range</th>
                      <th className="pb-2 font-medium">Correction Dose</th>
                      <th className="pb-2 font-medium">Clinical Action Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {inpatientRegimen.correctionScale.steppedDosingTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-sunken/50">
                        <td className="py-1.5 font-medium text-fg">{row.glucoseRange}</td>
                        <td className="py-1.5 font-bold text-accent">+{row.additionalUnits} units</td>
                        <td className="py-1.5 text-muted font-sans text-[11px]">{row.actionGuidance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GUIDELINES & CITATIONS */}
      {activeTab === "literature" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-fg">Peer-Reviewed Literature &amp; Guideline Consensus</h3>

            <div className="space-y-3">
              {GLYCEMIC_CITATIONS.map((cite) => (
                <div key={cite.id} className="rounded-lg border border-border/60 bg-surface-sunken p-3 text-xs space-y-1">
                  <div className="font-semibold text-fg">{cite.citation}</div>
                  <p className="text-[11px] text-muted leading-relaxed">{cite.relevance}</p>
                  {cite.pmid && (
                    <span className="text-[10px] text-accent font-mono">PMID: {cite.pmid}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Statutory Regulatory Card */}
            <div className="rounded-lg border border-border/80 bg-surface p-3 text-xs space-y-1 text-muted">
              <span className="font-bold text-fg">FD&amp;C Act § 520(o)(1)(E) Non-Device CDS Statutory Notice:</span>
              <p className="text-[11px] leading-relaxed">{GLYCEMIC_CDS_DISCLAIMER}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GlycemicPanel({ ids, host }: GlycemicStationProps) {
  return <GlycemicStation ids={ids} host={host} />;
}
