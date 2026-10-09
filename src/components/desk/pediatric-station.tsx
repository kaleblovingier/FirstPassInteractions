import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Baby,
  Calculator,
  CheckCircle2,
  Clock,
  Dna,
  Droplets,
  HeartPulse,
  Info,
  Layers,
  Pill,
  Scale,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Syringe,
  Timer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  NOT_CLEARED,
  PI_FOOTER,
  PEDIATRIC_CDS_DISCLAIMER,
  RENAL_GFR_MATURATION_CURVE,
  COMMON_PEDIATRIC_DOSING_TEMPLATES,
  type PediatricContext,
  computePediatricAgeSummary,
  evaluateRenalOntogeny,
  evaluateHepaticOntogeny,
  evaluateKernicterusAndDisplacement,
  evaluateHighAlertPediatricToxicities,
  calculatePediatricBsa,
  calculateBedsideSchwartzEgfr,
  calculatePediatricDoseClamp,
  pediatricOnDesk,
  pediatricReportOnDesk,
} from "@/lib/drugs/pediatric-kinetics";

export interface PediatricStationProps {
  ids: string[];
  host: HostContext;
}

export function PediatricStation({ ids, host }: PediatricStationProps) {
  // Preset Archetypes
  const [selectedPreset, setSelectedPreset] = useState<string>("term-neonate");

  // Patient Parameters
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState<number>(40);
  const [ageUnit, setAgeUnit] = useState<"days" | "months" | "years">("days");
  const [ageValue, setAgeValue] = useState<number>(14);
  const [weightKg, setWeightKg] = useState<number>(3.5);
  const [heightCm, setHeightCm] = useState<number>(50);
  const [serumCreatinineMgDl, setSerumCreatinineMgDl] = useState<number>(0.4);

  // Clinical Flags
  const [isHyperbilirubinemic, setIsHyperbilirubinemic] = useState<boolean>(false);
  const [hasIvCalciumActive, setHasIvCalciumActive] = useState<boolean>(false);
  const [isPostTonsillectomy, setIsPostTonsillectomy] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"renal" | "hepatic" | "kernicterus" | "matrix" | "clamp">("renal");

  // Dose Clamp Interactive Calculator State
  const [customDoseMgPerKg, setCustomDoseMgPerKg] = useState<number>(90);
  const [customAdultMaxMg, setCustomAdultMaxMg] = useState<number>(4000);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);

  // Compute context
  const childContext: PediatricContext = useMemo(() => {
    let pnaDays: number | undefined;
    let pnaMonths: number | undefined;
    let pnaYears: number | undefined;

    if (ageUnit === "days") pnaDays = ageValue;
    else if (ageUnit === "months") pnaMonths = ageValue;
    else pnaYears = ageValue;

    return {
      gestationalAgeWeeks,
      postnatalAgeDays: pnaDays,
      postnatalAgeMonths: pnaMonths,
      postnatalAgeYears: pnaYears,
      weightKg,
      heightCm,
      serumCreatinineMgDl,
      isHyperbilirubinemic,
      hasIvCalciumActive,
      isPostTonsillectomy,
    };
  }, [
    gestationalAgeWeeks,
    ageUnit,
    ageValue,
    weightKg,
    heightCm,
    serumCreatinineMgDl,
    isHyperbilirubinemic,
    hasIvCalciumActive,
    isPostTonsillectomy,
  ]);

  const detection = useMemo(() => pediatricOnDesk(ids), [ids.join("|")]);

  // If no target drug in tray, evaluate full suite against prototypical neonatal/pediatric drugs
  const activeIds = useMemo(() => {
    if (detection.hasPediatricTargetDrug) return ids;
    return ["ceftriaxone", "bactrim", "codeine", "ciprofloxacin", "doxycycline", "lorazepam"];
  }, [detection.hasPediatricTargetDrug, ids.join("|")]);

  const report = useMemo(
    () => pediatricReportOnDesk(activeIds, host, childContext),
    [activeIds.join("|"), host, childContext],
  );

  // Preset Handlers
  const handleApplyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    switch (presetKey) {
      case "extreme-preterm":
        setGestationalAgeWeeks(26);
        setAgeUnit("days");
        setAgeValue(5);
        setWeightKg(0.85);
        setHeightCm(34);
        setSerumCreatinineMgDl(0.7);
        setIsHyperbilirubinemic(true);
        setHasIvCalciumActive(true);
        setIsPostTonsillectomy(false);
        break;
      case "moderate-preterm":
        setGestationalAgeWeeks(32);
        setAgeUnit("days");
        setAgeValue(10);
        setWeightKg(1.6);
        setHeightCm(41);
        setSerumCreatinineMgDl(0.5);
        setIsHyperbilirubinemic(false);
        setHasIvCalciumActive(false);
        setIsPostTonsillectomy(false);
        break;
      case "term-neonate":
        setGestationalAgeWeeks(40);
        setAgeUnit("days");
        setAgeValue(14);
        setWeightKg(3.5);
        setHeightCm(50);
        setSerumCreatinineMgDl(0.4);
        setIsHyperbilirubinemic(false);
        setHasIvCalciumActive(false);
        setIsPostTonsillectomy(false);
        break;
      case "jaundice-neonate":
        setGestationalAgeWeeks(39);
        setAgeUnit("days");
        setAgeValue(4);
        setWeightKg(3.2);
        setHeightCm(49);
        setSerumCreatinineMgDl(0.4);
        setIsHyperbilirubinemic(true);
        setHasIvCalciumActive(true);
        setIsPostTonsillectomy(false);
        break;
      case "infant-6mo":
        setGestationalAgeWeeks(40);
        setAgeUnit("months");
        setAgeValue(6);
        setWeightKg(7.8);
        setHeightCm(67);
        setSerumCreatinineMgDl(0.3);
        setIsHyperbilirubinemic(false);
        setHasIvCalciumActive(false);
        setIsPostTonsillectomy(false);
        break;
      case "toddler-2yo":
        setGestationalAgeWeeks(40);
        setAgeUnit("years");
        setAgeValue(2);
        setWeightKg(12.5);
        setHeightCm(87);
        setSerumCreatinineMgDl(0.35);
        setIsHyperbilirubinemic(false);
        setHasIvCalciumActive(false);
        setIsPostTonsillectomy(false);
        break;
      case "child-7yo":
        setGestationalAgeWeeks(40);
        setAgeUnit("years");
        setAgeValue(7);
        setWeightKg(24);
        setHeightCm(122);
        setSerumCreatinineMgDl(0.5);
        setIsHyperbilirubinemic(false);
        setHasIvCalciumActive(false);
        setIsPostTonsillectomy(false);
        break;
      case "teen-14yo-post-ta":
        setGestationalAgeWeeks(40);
        setAgeUnit("years");
        setAgeValue(14);
        setWeightKg(62);
        setHeightCm(165);
        setSerumCreatinineMgDl(0.7);
        setIsHyperbilirubinemic(false);
        setHasIvCalciumActive(false);
        setIsPostTonsillectomy(true);
        break;
    }
  };

  // Live interactive dose clamp calculation
  const liveClampResult = useMemo(
    () =>
      calculatePediatricDoseClamp({
        weightKg,
        prescribedMgPerKg: customDoseMgPerKg,
        maxAdultDoseMg: customAdultMaxMg,
      }),
    [weightKg, customDoseMgPerKg, customAdultMaxMg],
  );

  return (
    <div className="space-y-6 text-foreground">
      {/* Statutory Header */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Baby className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">
                  Pediatric & Neonatal Developmental Pharmacokinetics
                </h2>
                <Badge tone="default" className="text-[10px] font-mono">
                  AAP / Kearns 2003
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Developmental organ ontogeny, kernicterus bilirubin displacement, excipient toxicities, allometric scaling & Bedside Schwartz eGFR
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {detection.hasPediatricTargetDrug ? (
              <Badge tone="accent" className="gap-1 font-mono text-xs">
                <Activity className="size-3" />
                {detection.detectedAgents.join(", ")} Active
              </Badge>
            ) : (
              <Badge tone="default" className="text-xs">
                Tray: Reference Simulation
              </Badge>
            )}
            <Badge
              tone={
                report.kernicterusRisk.severity === "CRITICAL_CONTRAINDICATION"
                  ? "danger"
                  : report.highAlertToxicities.some((a) => a.isContraindicated)
                    ? "danger"
                    : "ok"
              }
              className="text-xs font-semibold"
            >
              {report.patientAgeSummary.stageLabel}
            </Badge>
          </div>
        </div>

        {/* FD&C Act Banner */}
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-medium text-foreground">FD&C Act § 520(o)(1)(E) Non-Device CDS:</span> {NOT_CLEARED}
          </div>
        </div>
      </div>

      {/* Preset Archetypes Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Sparkles className="size-3.5 text-indigo-400" />
            Quick Clinical Archetypes
          </div>
          <span className="text-[11px] text-muted-foreground">Click to simulate developmental physiology</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "extreme-preterm", label: "Preterm 26w (Extreme)" },
            { id: "moderate-preterm", label: "Preterm 32w (Moderate)" },
            { id: "jaundice-neonate", label: "Term Day 4 (Jaundiced + Ca²⁺)" },
            { id: "term-neonate", label: "Term Day 14 (Neonate)" },
            { id: "infant-6mo", label: "Infant 6 Months" },
            { id: "toddler-2yo", label: "Toddler 2 Years" },
            { id: "child-7yo", label: "Child 7 Years" },
            { id: "teen-14yo-post-ta", label: "Adolescent 14y (Post-T&A / 62kg)" },
          ].map((preset) => (
            <Button
              key={preset.id}
              variant={selectedPreset === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleApplyPreset(preset.id)}
              className="h-7 text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Interactive Anthropometrics & Sizing Console */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/80 bg-card p-5 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Gestational Age (weeks)</label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              min={24}
              max={43}
              value={gestationalAgeWeeks}
              onChange={(e) => setGestationalAgeWeeks(Number(e.target.value))}
              className="h-9 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">wk</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {gestationalAgeWeeks < 37 ? "Preterm infant" : "Term gestation"}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Postnatal Chronological Age</label>
          <div className="mt-1 flex gap-1.5">
            <Input
              type="number"
              min={0}
              value={ageValue}
              onChange={(e) => setAgeValue(Number(e.target.value))}
              className="h-9 font-mono text-xs"
            />
            <select
              value={ageUnit}
              onChange={(e) => setAgeUnit(e.target.value as any)}
              className="h-9 rounded-md border border-border bg-surface-2 px-2 text-xs text-fg"
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <p className="mt-1 font-mono text-[10px] text-indigo-400">
            PMA: {report.patientAgeSummary.postmenstrualAgeWeeks} wks
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Body Weight (kg)</label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              min={0.3}
              max={150}
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="h-9 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">kg</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            BSA: {report.allometricScaling.bsa.mostellerBsaM2 ?? "—"} m²
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Height / Length (cm)</label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min={20}
              max={220}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="h-9 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">cm</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">For Schwartz eGFR</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Serum Creatinine (mg/dL)</label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              step="0.05"
              min={0.1}
              max={10}
              value={serumCreatinineMgDl}
              onChange={(e) => setSerumCreatinineMgDl(Number(e.target.value))}
              className="h-9 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">mg/dL</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Enzymatic / IDMS assay</p>
        </div>

        <div className="space-y-1.5 pt-1 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isHyperbilirubinemic}
              onChange={(e) => setIsHyperbilirubinemic(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <span className={isHyperbilirubinemic ? "font-semibold text-amber-400" : "text-muted-foreground"}>
              Hyperbilirubinemia
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasIvCalciumActive}
              onChange={(e) => setHasIvCalciumActive(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <span className={hasIvCalciumActive ? "font-semibold text-rose-400" : "text-muted-foreground"}>
              IV Calcium Solution
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPostTonsillectomy}
              onChange={(e) => setIsPostTonsillectomy(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <span className={isPostTonsillectomy ? "font-semibold text-purple-400" : "text-muted-foreground"}>
              Post-Tonsillectomy
            </span>
          </label>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === "renal" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("renal")}
          className="gap-1.5 text-xs"
        >
          <Activity className="size-3.5" />
          Renal Ontogeny & Schwartz eGFR
        </Button>
        <Button
          variant={activeTab === "hepatic" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("hepatic")}
          className="gap-1.5 text-xs"
        >
          <Layers className="size-3.5" />
          Hepatic CYP & UGT Ontogeny
        </Button>
        <Button
          variant={activeTab === "kernicterus" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("kernicterus")}
          className="gap-1.5 text-xs"
        >
          <ShieldAlert className="size-3.5" />
          Kernicterus & Excipient Safety
        </Button>
        <Button
          variant={activeTab === "matrix" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("matrix")}
          className="gap-1.5 text-xs"
        >
          <AlertTriangle className="size-3.5" />
          Black Box Contraindication Matrix
        </Button>
        <Button
          variant={activeTab === "clamp" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("clamp")}
          className="gap-1.5 text-xs"
        >
          <Scale className="size-3.5" />
          Dose Ceiling Clamp Calculator
        </Button>
      </div>

      {/* TAB 1: Renal Ontogeny & Schwartz eGFR */}
      {activeTab === "renal" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Schwartz and BSA Summary Cards */}
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-xl border border-border/80 bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Bedside Schwartz eGFR</span>
                  <Badge tone={report.renalOntogeny.isEgfrDepressedForAge ? "danger" : "ok"} className="font-mono text-xs">
                    {report.renalOntogeny.schwartzEgfr ?? "—"} mL/min/1.73m²
                  </Badge>
                </div>
                <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-foreground">
                  {report.renalOntogeny.schwartzEgfr ?? "—"}{" "}
                  <span className="text-xs font-normal text-muted-foreground">mL/min/1.73m²</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Formula: (0.413 × {heightCm} cm) / {serumCreatinineMgDl} mg/dL (2009 Bedside constant)
                </p>

                <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs">
                  <div className="font-semibold text-foreground">Expected Normal for Age:</div>
                  <div className="mt-1 font-mono text-indigo-400">
                    {report.renalOntogeny.expectedNormalGfrBracket.minGfr} to{" "}
                    {report.renalOntogeny.expectedNormalGfrBracket.maxGfr} mL/min/1.73m² (mean ~
                    {report.renalOntogeny.expectedNormalGfrBracket.meanGfr})
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    Relative adult renal capacity: ~
                    {Math.round(report.renalOntogeny.renalClearanceMaturationFraction * 100)}%
                  </div>
                </div>
              </div>

              {/* Body Surface Area */}
              <div className="rounded-xl border border-border/80 bg-card p-5">
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-indigo-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Body Surface Area (BSA)
                  </h4>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <span className="text-[11px] text-muted-foreground">Mosteller BSA</span>
                    <div className="font-mono text-lg font-bold text-foreground">
                      {report.allometricScaling.bsa.mostellerBsaM2 ?? "—"} m²
                    </div>
                    <span className="text-[10px] text-muted-foreground">√((H × W)/3600)</span>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <span className="text-[11px] text-muted-foreground">Haycock BSA</span>
                    <div className="font-mono text-lg font-bold text-foreground">
                      {report.allometricScaling.bsa.haycockBsaM2 ?? "—"} m²
                    </div>
                    <span className="text-[10px] text-muted-foreground">Validated for pediatrics</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Renal GFR Maturation Curve Matrix */}
            <div className="rounded-xl border border-border/80 bg-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Developmental Renal GFR Maturation Curve</h3>
                  <p className="text-xs text-muted-foreground">
                    Physiological maturation from antenatal glomerulogenesis to adult normal ~120 mL/min/1.73m²
                  </p>
                </div>
                <Badge tone="default" className="text-xs font-mono">
                  Schwartz et al. 2009
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                {RENAL_GFR_MATURATION_CURVE.map((bracket, idx) => {
                  const isCurrent =
                    report.renalOntogeny.expectedNormalGfrBracket.ageLabel === bracket.ageLabel;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-lg border p-3.5 transition-all text-xs",
                        isCurrent
                          ? "border-accent bg-accent-soft/20 text-foreground ring-1 ring-accent"
                          : "border-border/60 bg-surface-2/40 text-muted-foreground",
                      )}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          {isCurrent ? (
                            <CheckCircle2 className="size-4 shrink-0 text-accent" />
                          ) : (
                            <div className="size-4 rounded-full border border-border/60" />
                          )}
                          <span className={cn("font-medium", isCurrent && "text-accent font-semibold")}>
                            {bracket.ageLabel}
                          </span>
                        </div>
                        <div className="font-mono font-semibold text-foreground">
                          {bracket.minGfr} – {bracket.maxGfr} mL/min/1.73m²{" "}
                          <span className="text-muted-foreground font-normal">(mean ~{bracket.meanGfr})</span>
                        </div>
                      </div>
                      <p className="mt-1.5 pl-6 text-[11px] leading-relaxed text-muted-foreground">
                        {bracket.developmentalMilestone}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Nephrogenesis Assessment:</span>{" "}
                {report.renalOntogeny.nephrogenesisStatus}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Hepatic CYP & UGT Ontogeny */}
      {activeTab === "hepatic" && (
        <div className="space-y-6">
          {/* Caffeine & CYP1A2 Clock Highlight */}
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    CYP1A2 Ontogeny & The Caffeine Elimination Clock
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Canonical marker for postnatal hepatic monooxygenase maturation (apnea of prematurity)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold text-amber-400">
                  {report.hepaticOntogeny.caffeineHalfLifePredictionHours}h
                </div>
                <div className="text-[11px] text-muted-foreground">Predicted Caffeine t½</div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Predicted Elimination Window:</span>{" "}
              {report.hepaticOntogeny.caffeineHalfLifeRangeText}. In preterm neonates, CYP1A2 is nearly undetectable
              at delivery (&lt;1% adult), prolonging caffeine half-life up to 100 hours! This facilitates once-daily
              caffeine citrate dosing for neonatal apnea without acute trough decay.
            </div>
          </div>

          {/* CYP Enzymes Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              report.hepaticOntogeny.cyp3a7,
              report.hepaticOntogeny.cyp3a4,
              report.hepaticOntogeny.cyp1a2,
              report.hepaticOntogeny.cyp2d6,
              report.hepaticOntogeny.cyp2c19,
              report.hepaticOntogeny.ugt2b7,
            ].map((enz) => (
              <div key={enz.enzyme} className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-foreground">{enz.enzyme}</span>
                  <Badge
                    tone={
                      enz.maturationPercentOfAdult > 120
                        ? "accent"
                        : enz.maturationPercentOfAdult < 25
                          ? "warn"
                          : "ok"
                    }
                    className="font-mono text-xs"
                  >
                    ~{enz.maturationPercentOfAdult}% Adult
                  </Badge>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      enz.maturationPercentOfAdult > 120
                        ? "bg-accent"
                        : enz.maturationPercentOfAdult < 25
                          ? "bg-amber-400"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(100, (enz.maturationPercentOfAdult / 150) * 100)}%` }}
                  />
                </div>

                <p className="text-[11px] font-medium text-foreground">{enz.developmentalTrajectory}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{enz.clinicalSignificance}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Kernicterus & Excipient Safety Monitor */}
      {activeTab === "kernicterus" && (
        <div className="space-y-6">
          {/* Ceftriaxone & Bactrim Alert Banner */}
          <div
            className={cn(
              "rounded-xl border p-5 shadow-sm",
              report.kernicterusRisk.severity === "CRITICAL_CONTRAINDICATION"
                ? "border-danger/80 bg-danger-soft/20 text-foreground"
                : "border-border/80 bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className={cn(
                  "size-6 shrink-0",
                  report.kernicterusRisk.severity === "CRITICAL_CONTRAINDICATION"
                    ? "text-danger"
                    : "text-amber-400",
                )}
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight">
                    Neonatal Hyperbilirubinemia & Kernicterus Albumin Displacement Monitor
                  </h3>
                  <Badge
                    tone={
                      report.kernicterusRisk.severity === "CRITICAL_CONTRAINDICATION"
                        ? "danger"
                        : "warn"
                    }
                    className="uppercase"
                  >
                    {report.kernicterusRisk.severity}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {report.kernicterusRisk.pathophysiology}
                </p>

                {report.kernicterusRisk.clinicalActionMandate && (
                  <div className="rounded-lg bg-surface-2 p-3 text-xs font-medium text-foreground">
                    <span className="font-semibold text-danger">Statutory Finding:</span>{" "}
                    {report.kernicterusRisk.clinicalActionMandate}
                  </div>
                )}

                {report.kernicterusRisk.recommendedAlternatives.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-foreground">
                      Evidence-Based Non-Displacing Alternatives:
                    </span>
                    <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                      {report.kernicterusRisk.recommendedAlternatives.map((alt, i) => (
                        <li key={i}>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* High Alert Excipient & Drug Toxicities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">
              High-Alert Pediatric Drug & Excipient Toxicities
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {report.highAlertToxicities.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border p-4 text-xs space-y-2.5",
                    item.isContraindicated
                      ? "border-danger/60 bg-danger-soft/10 text-foreground"
                      : "border-border/80 bg-card text-foreground",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-foreground">{item.drugOrExcipientName}</div>
                    <Badge tone={item.isContraindicated ? "danger" : "warn"}>
                      {item.isContraindicated ? "CONTRAINDICATED" : "HIGH-ALERT"}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-medium text-indigo-400">{item.syndromeTitle}</div>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.molecularBiochemicalMechanism}
                  </p>
                  <div className="rounded-md bg-surface-2 p-2">
                    <span className="font-semibold text-foreground">Hallmarks:</span>
                    <ul className="mt-1 list-inside list-disc text-[11px] text-muted-foreground">
                      {item.clinicalHallmarks.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11px] text-foreground">
                    <span className="font-semibold">Action / Alternative:</span> {item.safeAlternativeOrException}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Black Box Pediatric Contraindication Matrix */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              FDA Boxed Warning & Pediatric Contraindication Decision Matrix
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Evaluated against patient age ({report.patientAgeSummary.chronologicalAgeText}), post-T&A surgical status, and developmental windows
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground">
                    <th className="py-2.5 pr-4 font-semibold">Agent / Class</th>
                    <th className="py-2.5 pr-4 font-semibold">Regulatory Threshold</th>
                    <th className="py-2.5 pr-4 font-semibold">Current Patient Status</th>
                    <th className="py-2.5 font-semibold">Mechanism & Approved Exceptions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Codeine */}
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-foreground">Codeine</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      Boxed Warning: All &lt;12y, and &lt;18y post-T&A
                    </td>
                    <td className="py-3 pr-4">
                      {report.patientAgeSummary.isChildUnder12 || (isPostTonsillectomy && report.patientAgeSummary.isPediatricPatient) ? (
                        <Badge tone="danger">CONTRAINDICATED</Badge>
                      ) : (
                        <Badge tone="ok">Age-Permitted</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      CYP2D6 ultra-rapid metabolizers convert codeine to lethal morphine surges. Use scheduled acetaminophen + ibuprofen multimodal analgesia.
                    </td>
                  </tr>

                  {/* Tramadol */}
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-foreground">Tramadol</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      Boxed Warning: All &lt;12y, and &lt;18y post-T&A
                    </td>
                    <td className="py-3 pr-4">
                      {report.patientAgeSummary.isChildUnder12 || (isPostTonsillectomy && report.patientAgeSummary.isPediatricPatient) ? (
                        <Badge tone="danger">CONTRAINDICATED</Badge>
                      ) : (
                        <Badge tone="ok">Age-Permitted</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      CYP2D6 converts to active M1 (200x affinity). Unpredictable lethal respiratory depression in children.
                    </td>
                  </tr>

                  {/* Fluoroquinolones */}
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-foreground">Fluoroquinolones (Cipro/Levo)</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      Restrict in &lt;18 years (arthropathy)
                    </td>
                    <td className="py-3 pr-4">
                      {report.patientAgeSummary.isPediatricPatient ? (
                        <Badge tone="warn">RESTRICTED</Badge>
                      ) : (
                        <Badge tone="ok">Adult</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      Chondrotoxicity in juvenile weight-bearing joints. Approved exceptions: Inhalational anthrax PEP, cystic fibrosis Pseudomonas exacerbation, complicated UTI.
                    </td>
                  </tr>

                  {/* Tetracyclines / Doxycycline */}
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-foreground">Tetracyclines vs Doxycycline</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      Avoid tetracyclines in &lt;8 years (tooth staining)
                    </td>
                    <td className="py-3 pr-4">
                      {report.patientAgeSummary.isChildUnder8 ? (
                        <Badge tone="danger">Enamel Risk</Badge>
                      ) : (
                        <Badge tone="ok">Permitted</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      Chelates calcium in growing hydroxyapatite. <strong className="text-foreground">Critical AAP Exception:</strong> Short-course Doxycycline is FIRST-LINE for life-threatening RMSF / Lyme in children of ALL ages.
                    </td>
                  </tr>

                  {/* Ceftriaxone */}
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-foreground">Ceftriaxone</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      Contraindicated in neonates ≤ 28 days
                    </td>
                    <td className="py-3 pr-4">
                      {report.patientAgeSummary.isNeonate ? (
                        <Badge tone="danger">CONTRAINDICATED</Badge>
                      ) : (
                        <Badge tone="ok">Permitted</Badge>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      Albumin displacement causes kernicterus; IV calcium precipitation in lungs/kidneys is fatal. Use Cefotaxime or Ampicillin + Gentamicin.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Dose Ceiling Clamp Calculator */}
      {activeTab === "clamp" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Interactive Calculator Inputs */}
            <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 lg:col-span-1">
              <h3 className="text-sm font-semibold tracking-tight">Interactive Weight-Based Dose Clamp</h3>
              <p className="text-xs text-muted-foreground">
                Prevents catastrophic overdose in older or obese pediatric patients by capping weight-based orders at adult maximum limits
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground">Patient Weight</label>
                  <div className="mt-1 font-mono text-sm font-bold text-foreground">
                    {weightKg} kg
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground">Prescribed Dose (mg/kg)</label>
                  <Input
                    type="number"
                    value={customDoseMgPerKg}
                    onChange={(e) => setCustomDoseMgPerKg(Number(e.target.value))}
                    className="mt-1 h-9 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground">Maximum Adult Ceiling (mg)</label>
                  <Input
                    type="number"
                    value={customAdultMaxMg}
                    onChange={(e) => setCustomAdultMaxMg(Number(e.target.value))}
                    className="mt-1 h-9 font-mono text-xs"
                  />
                </div>

                {/* Dosing Templates Selector */}
                <div>
                  <label className="text-muted-foreground">Load Standard Pediatric Template</label>
                  <select
                    value={selectedTemplateIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedTemplateIndex(idx);
                      const t = COMMON_PEDIATRIC_DOSING_TEMPLATES[idx];
                      if (t) {
                        setCustomDoseMgPerKg(t.standardMgPerKg);
                        setCustomAdultMaxMg(t.adultMaxDoseMg);
                      }
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-surface-2 p-2 text-xs text-fg"
                  >
                    {COMMON_PEDIATRIC_DOSING_TEMPLATES.map((t, i) => (
                      <option key={i} value={i}>
                        {t.drugName} ({t.standardMgPerKg} mg/kg, max {t.adultMaxDoseMg} mg)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Clamped Calculation Output */}
            <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-sm font-semibold tracking-tight">Calculation & Ceiling Rail Verdict</h3>
                <Badge tone={liveClampResult.isCeilingApplied ? "danger" : "ok"} className="font-mono text-xs">
                  {liveClampResult.isCeilingApplied ? "ADULT CEILING APPLIED" : "RAW DOSE SAFE"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-2 p-3 text-xs">
                  <span className="text-muted-foreground">Raw Weight-Based Dose</span>
                  <div className="mt-1 font-mono text-xl font-bold text-foreground">
                    {liveClampResult.rawCalculatedDoseMg} mg
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {weightKg} kg × {customDoseMgPerKg} mg/kg
                  </span>
                </div>

                <div className="rounded-lg bg-surface-2 p-3 text-xs">
                  <span className="text-muted-foreground">Adult Maximum Limit</span>
                  <div className="mt-1 font-mono text-xl font-bold text-muted-foreground">
                    {liveClampResult.maxAdultDoseMg} mg
                  </div>
                  <span className="text-[10px] text-muted-foreground">Safety ceiling rail</span>
                </div>

                <div
                  className={cn(
                    "rounded-lg p-3 text-xs",
                    liveClampResult.isCeilingApplied
                      ? "bg-danger-soft/20 text-danger border border-danger/40"
                      : "bg-ok-soft/20 text-ok border border-ok/40",
                  )}
                >
                  <span className="font-semibold">Clamped Dispensing Dose</span>
                  <div className="mt-1 font-mono text-xl font-bold">
                    {liveClampResult.clampedDoseMg} mg
                  </div>
                  <span className="text-[10px]">
                    {liveClampResult.isCeilingApplied
                      ? `-${liveClampResult.percentReductionFromRaw}% ceiling clamp`
                      : "100% of weight dose"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-foreground">
                <span className="font-semibold text-accent">Clinical CDS Finding:</span>{" "}
                {liveClampResult.clinicalSafetyAlert}
              </div>

              {/* Catalog Reference Table */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Standard Pediatric Reference Regimens
                </h4>
                <div className="mt-2 space-y-2">
                  {COMMON_PEDIATRIC_DOSING_TEMPLATES.slice(0, 4).map((t, idx) => {
                    const c = calculatePediatricDoseClamp({
                      weightKg,
                      prescribedMgPerKg: t.standardMgPerKg,
                      maxAdultDoseMg: t.adultMaxDoseMg,
                    });
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-1 rounded-md border border-border/60 bg-surface-2/30 p-2.5 sm:flex-row sm:items-center sm:justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{t.drugName}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground">{t.indication}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-muted-foreground">
                            Raw: {c.rawCalculatedDoseMg} mg
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className={c.isCeilingApplied ? "text-danger font-bold" : "text-emerald-400 font-bold"}>
                            Final: {c.clampedDoseMg} mg
                          </span>
                          {c.isCeilingApplied && <Badge tone="danger" className="text-[10px]">Capped</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Footer & Literature Citations */}
      <div className="rounded-xl border border-border/80 bg-card p-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
          <span className="font-semibold text-foreground">Peer-Reviewed Literature Citations</span>
          <span className="text-[10px] font-mono">FD&C Act § 520(o)(1)(E)</span>
        </div>
        <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]">
          {report.citations.map((cite, i) => (
            <li key={i} className="truncate" title={cite}>
              • {cite}
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
          {PI_FOOTER}
        </div>
      </div>
    </div>
  );
}

export function PediatricPanel({ ids, host }: PediatricStationProps) {
  return <PediatricStation ids={ids} host={host} />;
}
