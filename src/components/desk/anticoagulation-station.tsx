import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  Layers,
  Scale,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  ANTICOAGULATION_CDS_DISCLAIMER,
  ANTICOAGULATION_LITERATURE_CITATIONS,
  ANTICOAGULANT_PROFILES,
  COAGULATION_LAB_TRAPS,
  anticoagulationReportOnDesk,
  calculate4FPccWarfarinDosing,
  calculateAndexanetAlfaDosing,
  calculateArgatrobanKinetics,
  calculateBivalirudinKinetics,
  calculateHit4TsScore,
  calculateProtamineDosing,
  evaluateArgatrobanWarfarinCrossover,
  evaluateThrombocytopeniaScore,
  get4FPccOffLabelDoacGuidance,
  getIdarucizumabProtocol,
  type AnticoagulantProfile,
  type HitOtherCausesCategory,
  type HitThrombosisCategory,
  type HitTimingCategory,
  type LabTrapItem,
} from "@/lib/drugs/anticoagulation-reversal";

export interface AnticoagulationStationProps {
  ids: string[];
  host: HostContext;
}

export function AnticoagulationStation({ ids, host }: AnticoagulationStationProps) {
  // Navigation / active section
  const [activeTab, setActiveTab] = useState<"hit-dti" | "reversals" | "comparison" | "lab-traps">("hit-dti");

  // --- 1. HIT 4Ts Calculator State ---
  const [baselinePlatelets, setBaselinePlatelets] = useState<number>(240);
  const [nadirPlatelets, setNadirPlatelets] = useState<number>(60);
  const [timingCategory, setTimingCategory] = useState<HitTimingCategory>("days_5_10_or_rapid_within_30d");
  const [thrombosisCategory, setThrombosisCategory] = useState<HitThrombosisCategory>("proven_new_necrosis_acute_systemic");
  const [otherCausesCategory, setOtherCausesCategory] = useState<HitOtherCausesCategory>("none_apparent");

  // --- 2. DTI Kinetics & Crossover State ---
  const [dtiWeightKg, setDtiWeightKg] = useState<number>(75);
  const [hepaticStatus, setHepaticStatus] = useState<"none" | "moderate" | "severe_shock">("none");
  const [bivalirudinRenal, setBivalirudinRenal] = useState<"normal" | "moderate_ckd" | "severe_ckd" | "esrd_dialysis">("normal");
  const [combinedInr, setCombinedInr] = useState<number>(3.2);
  const [daysOnCombinedTherapy, setDaysOnCombinedTherapy] = useState<number>(1);

  // --- 3. Reversals: Andexanet Alfa State ---
  const [andexTarget, setAndexTarget] = useState<"apixaban" | "rivaroxaban">("apixaban");
  const [andexDoseMg, setAndexDoseMg] = useState<number>(5);
  const [andexHoursElapsed, setAndexHoursElapsed] = useState<number>(4);

  // --- 4. Reversals: 4F-PCC (Kcentra) State ---
  const [pccWeightKg, setPccWeightKg] = useState<number>(80);
  const [pccInr, setPccInr] = useState<number>(4.2);

  // --- 5. Reversals: Protamine Sulfate State ---
  const [protamineAgent, setProtamineAgent] = useState<"heparin" | "enoxaparin" | "fondaparinux" | "dalteparin">("heparin");
  const [protamineDoseInput, setProtamineDoseInput] = useState<number>(5000);
  const [protamineHours, setProtamineHours] = useState<number>(0.8);
  const [hasFishAllergy, setHasFishAllergy] = useState<boolean>(false);
  const [hasPriorNph, setHasPriorNph] = useState<boolean>(false);
  const [hasVasectomy, setHasVasectomy] = useState<boolean>(false);

  // Dynamic calculations: HIT 4Ts
  const hitCalc = useMemo(
    () =>
      calculateHit4TsScore({
        baselinePlateletCount: baselinePlatelets,
        nadirPlateletCount: nadirPlatelets,
        timingCategory,
        thrombosisCategory,
        otherCausesCategory,
      }),
    [baselinePlatelets, nadirPlatelets, timingCategory, thrombosisCategory, otherCausesCategory],
  );

  // Dynamic calculations: Argatroban & Bivalirudin
  const argatrobanCalc = useMemo(
    () =>
      calculateArgatrobanKinetics({
        weightKg: dtiWeightKg,
        hepaticImpairment: hepaticStatus,
      }),
    [dtiWeightKg, hepaticStatus],
  );

  const bivalirudinCalc = useMemo(
    () =>
      calculateBivalirudinKinetics({
        weightKg: dtiWeightKg,
        renalStatus: bivalirudinRenal,
        indication: "hit_treatment",
      }),
    [dtiWeightKg, bivalirudinRenal],
  );

  // Dynamic calculations: Argatroban-Warfarin Crossover Trap
  const crossoverCalc = useMemo(
    () =>
      evaluateArgatrobanWarfarinCrossover({
        combinedInr,
        daysOnCombinedTherapy,
      }),
    [combinedInr, daysOnCombinedTherapy],
  );

  // Dynamic calculations: 4F-PCC
  const pccCalc = useMemo(
    () =>
      calculate4FPccWarfarinDosing({
        baselineInr: pccInr,
        weightKg: pccWeightKg,
      }),
    [pccInr, pccWeightKg],
  );

  // Dynamic calculations: Protamine
  const protamineCalc = useMemo(
    () =>
      calculateProtamineDosing({
        agent: protamineAgent,
        doseUnitsOrMg: protamineDoseInput,
        hoursElapsed: protamineHours,
        fishAllergy: hasFishAllergy,
        priorNphInsulin: hasPriorNph,
        priorVasectomy: hasVasectomy,
      }),
    [protamineAgent, protamineDoseInput, protamineHours, hasFishAllergy, hasPriorNph, hasVasectomy],
  );

  // Dynamic calculations: Andexanet
  const andexCalc = useMemo(
    () =>
      calculateAndexanetAlfaDosing({
        agent: andexTarget,
        lastDoseMg: andexDoseMg,
        hoursSinceLastDose: andexHoursElapsed,
      }),
    [andexTarget, andexDoseMg, andexHoursElapsed],
  );

  // Dynamic calculations: Idarucizumab & 4F-PCC DOAC Guidance
  const idarucizumabProto = useMemo(() => getIdarucizumabProtocol(), []);
  const pccDoacGuidance = useMemo(() => get4FPccOffLabelDoacGuidance(), []);

  // Desk Report
  const deskReport = useMemo(
    () =>
      anticoagulationReportOnDesk(ids, host, {
        weightKg: pccWeightKg,
        baselineInr: pccInr,
        lastDoseMg: andexDoseMg,
        hoursSinceLastDose: andexHoursElapsed,
        fishAllergy: hasFishAllergy,
        priorNphInsulin: hasPriorNph,
        priorVasectomy: hasVasectomy,
        plateletBaseline: baselinePlatelets,
        plateletNadir: nadirPlatelets,
        hepaticImpairment: hepaticStatus,
        combinedInr,
        daysOnCombinedTherapy,
      }),
    [
      ids.join("|"),
      host,
      pccWeightKg,
      pccInr,
      andexDoseMg,
      andexHoursElapsed,
      hasFishAllergy,
      hasPriorNph,
      hasVasectomy,
      baselinePlatelets,
      nadirPlatelets,
      hepaticStatus,
      combinedInr,
      daysOnCombinedTherapy,
    ],
  );

  const plateletDropPct =
    baselinePlatelets > 0 ? Math.round(((baselinePlatelets - nadirPlatelets) / baselinePlatelets) * 100) : 0;

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* 1. Header Banner & CDS Notice */}
      <div className="rounded-xl border border-border bg-surface-sunken p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-accent/15 p-2 text-accent">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold tracking-tight text-fg">
                  Anticoagulation Reversal, HIT 4Ts &amp; Hemostatic Station
                </span>
                <Badge tone="accent" className="font-mono text-[10px] uppercase">
                  FD&amp;C Act § 520(o)(1)(E) CDS
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                HIT 4Ts probability triage, Direct Thrombin Inhibitor kinetics (Argatroban vs Bivalirudin), Argatroban INR crossover trap, urgent 4F-PCC + Vitamin K warfarin reversal, and Protamine stoichiometry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeTab === "hit-dti" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("hit-dti")}
              className="text-xs"
            >
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
              HIT 4Ts &amp; DTIs
            </Button>
            <Button
              variant={activeTab === "reversals" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("reversals")}
              className="text-xs"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Urgent Reversals
            </Button>
            <Button
              variant={activeTab === "comparison" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("comparison")}
              className="text-xs"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Agent Matrix
            </Button>
            <Button
              variant={activeTab === "lab-traps" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("lab-traps")}
              className="text-xs"
            >
              <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
              Lab Traps ({COAGULATION_LAB_TRAPS.length})
            </Button>
          </div>
        </div>

        {/* Desk Detection Status Pill */}
        {deskReport.onDesk.hasAnticoagulant && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-medium text-muted">Detected On Desk:</span>
            {deskReport.onDesk.anticoagulants.map((id) => {
              const prof = ANTICOAGULANT_PROFILES[id];
              return (
                <Badge key={id} tone="danger" className="text-[11px]">
                  {prof?.name ?? id} ({prof?.class.replace(/-/g, " ")})
                </Badge>
              );
            })}
            {deskReport.onDesk.hasDti && (
              <Badge tone="accent" className="text-[11px]">
                DTI Active
              </Badge>
            )}
            {deskReport.onDesk.reversals.map((id) => (
              <Badge key={id} tone="ok" className="text-[11px]">
                Antidote: {id}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 2. TAB 1: HIT 4TS & DTI KINETICS */}
      {activeTab === "hit-dti" && (
        <div className="space-y-6">
          {/* PILLAR 1: HIT 4Ts CALCULATOR */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  Heparin-Induced Thrombocytopenia (HIT) 4Ts Scoring &amp; Triage Engine
                </span>
                <span className="text-muted text-[11px]">(Warkentin &amp; ASH 2018 Nomogram)</span>
              </div>
              <Badge
                tone={
                  hitCalc.probabilityTier === "High"
                    ? "danger"
                    : hitCalc.probabilityTier === "Intermediate"
                    ? "warn"
                    : "ok"
                }
                className="font-mono uppercase text-[11px]"
              >
                Score: {hitCalc.totalScore} / 8 ({hitCalc.probabilityTier} Probability &bull; {hitCalc.preTestProbabilityPct})
              </Badge>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* T1: Thrombocytopenia */}
              <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg text-xs">1. Thrombocytopenia</span>
                  <Badge tone="accent" className="font-mono text-[10px]">
                    {hitCalc.thrombocytopeniaScore} pts
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted">
                    <label>Baseline Platelets (k/mcL)</label>
                    <span className="font-mono text-fg font-bold">{baselinePlatelets}k</span>
                  </div>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    value={baselinePlatelets}
                    onChange={(e) => setBaselinePlatelets(Math.max(1, Number(e.target.value) || 100))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted">
                    <label>Nadir Platelets (k/mcL)</label>
                    <span className="font-mono text-fg font-bold">{nadirPlatelets}k</span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={nadirPlatelets}
                    onChange={(e) => setNadirPlatelets(Math.max(0, Number(e.target.value) || 20))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="rounded bg-bg-sunken p-1.5 text-[10px] text-muted">
                  Drop: <strong className="text-fg">{plateletDropPct}%</strong> &bull; Nadir:{" "}
                  <strong className="text-fg">{nadirPlatelets}k</strong> ({hitCalc.scoringBreakdown.thrombocytopenia})
                </div>
              </div>

              {/* T2: Timing of Drop */}
              <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg text-xs">2. Timing of Fall</span>
                  <Badge tone="accent" className="font-mono text-[10px]">
                    {hitCalc.timingScore} pts
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px]">
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitTiming"
                      checked={timingCategory === "days_5_10_or_rapid_within_30d"}
                      onChange={() => setTimingCategory("days_5_10_or_rapid_within_30d")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>2 pts:</strong> Days 5–10, or &le;1 day with heparin in last 30d
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitTiming"
                      checked={timingCategory === "day_gt_10_or_rapid_30_100d"}
                      onChange={() => setTimingCategory("day_gt_10_or_rapid_30_100d")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>1 pt:</strong> &gt; Day 10, or &le;1 day with heparin 30–100d ago
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitTiming"
                      checked={timingCategory === "day_le_4_without_recent_heparin"}
                      onChange={() => setTimingCategory("day_le_4_without_recent_heparin")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>0 pts:</strong> &le; Day 4 without recent heparin
                    </span>
                  </label>
                </div>
              </div>

              {/* T3: Thrombosis */}
              <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg text-xs">3. Thrombosis / Sequelae</span>
                  <Badge tone="accent" className="font-mono text-[10px]">
                    {hitCalc.thrombosisScore} pts
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px]">
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitThrombosis"
                      checked={thrombosisCategory === "proven_new_necrosis_acute_systemic"}
                      onChange={() => setThrombosisCategory("proven_new_necrosis_acute_systemic")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>2 pts:</strong> Proven new thrombosis, skin necrosis, acute post-IV reaction
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitThrombosis"
                      checked={thrombosisCategory === "progressive_suspected_erythema"}
                      onChange={() => setThrombosisCategory("progressive_suspected_erythema")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>1 pt:</strong> Progressive/recurrent, suspected, or erythematous lesions
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitThrombosis"
                      checked={thrombosisCategory === "none"}
                      onChange={() => setThrombosisCategory("none")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>0 pts:</strong> None
                    </span>
                  </label>
                </div>
              </div>

              {/* T4: Other Causes */}
              <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg text-xs">4. Other Causes</span>
                  <Badge tone="accent" className="font-mono text-[10px]">
                    {hitCalc.otherCausesScore} pts
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px]">
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitOther"
                      checked={otherCausesCategory === "none_apparent"}
                      onChange={() => setOtherCausesCategory("none_apparent")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>2 pts:</strong> None apparent (no alternative etiology)
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitOther"
                      checked={otherCausesCategory === "possible"}
                      onChange={() => setOtherCausesCategory("possible")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>1 pt:</strong> Possible alternative cause present (sepsis, dilution, drugs)
                    </span>
                  </label>
                  <label className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="radio"
                      name="hitOther"
                      checked={otherCausesCategory === "definite"}
                      onChange={() => setOtherCausesCategory("definite")}
                      className="mt-0.5 text-accent"
                    />
                    <span>
                      <strong>0 pts:</strong> Definite alternative cause present (DIC, post-CPB, chemo)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Triage Decision Banner */}
            <div
              className={cn(
                "rounded-lg p-4 border space-y-3",
                hitCalc.probabilityTier === "High"
                  ? "bg-danger/15 border-danger/40"
                  : hitCalc.probabilityTier === "Intermediate"
                  ? "bg-warn/15 border-warn/40"
                  : "bg-ok/10 border-ok/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {hitCalc.probabilityTier === "High" ? (
                    <AlertOctagon className="h-5 w-5 text-danger" />
                  ) : hitCalc.probabilityTier === "Intermediate" ? (
                    <AlertTriangle className="h-5 w-5 text-warn" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-ok" />
                  )}
                  <span className="font-bold text-sm text-fg">
                    Clinical Action Protocol: {hitCalc.probabilityTier} Pre-Test Probability ({hitCalc.preTestProbabilityPct})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted">Total Points: {hitCalc.totalScore} / 8</span>
              </div>

              <p className="text-[11px] text-fg leading-relaxed">
                {hitCalc.clinicalInterpretation}
              </p>

              {hitCalc.recommendedActions.cessationOfAllHeparin ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-[11px]">
                  <div className="p-2 rounded bg-surface border border-danger/40 text-danger font-medium flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 shrink-0" />
                    Cease ALL Heparin (Flushes, Locks, LMWH)
                  </div>
                  <div className="p-2 rounded bg-surface border border-accent/40 text-accent font-medium flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4 shrink-0" />
                    Order PF4 ELISA + Functional SRA
                  </div>
                  <div className="p-2 rounded bg-surface border border-ok/40 text-ok font-medium flex items-center gap-1.5">
                    <Activity className="h-4 w-4 shrink-0" />
                    Start DTI: Argatroban / Bivalirudin
                  </div>
                  <div className="p-2 rounded bg-surface border border-danger/40 text-danger font-medium flex items-center gap-1.5">
                    <AlertOctagon className="h-4 w-4 shrink-0" />
                    AVOID Platelet Transfusions (Clot Surge)
                  </div>
                </div>
              ) : (
                <div className="rounded bg-ok/15 p-2 text-[11px] text-ok font-medium">
                  Pre-test probability &lt; 2%. Negative predictive value &gt; 99%. Continue heparin if indicated; do NOT reflexively test PF4-heparin ELISA.
                </div>
              )}
            </div>
          </div>

          {/* PILLAR 2: DIRECT THROMBIN INHIBITOR (DTI) KINETICS & ARGATROBAN-WARFARIN CROSSOVER TRAP */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  Non-Heparin Direct Thrombin Inhibitor (DTI) Kinetics Engine
                </span>
                <span className="text-muted text-[11px]">(Argatroban vs Bivalirudin Sizing)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted font-medium">Patient Weight:</label>
                <Input
                  type="number"
                  min="40"
                  max="160"
                  value={dtiWeightKg}
                  onChange={(e) => setDtiWeightKg(Math.max(30, Number(e.target.value) || 70))}
                  className="w-20 h-8 font-mono text-center text-xs"
                />
                <span className="text-muted text-[11px]">kg</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Argatroban */}
              <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-fg text-sm">Argatroban</span>
                    <Badge tone="accent" className="font-mono text-[10px]">
                      Small Molecule DTI (508 Da)
                    </Badge>
                  </div>
                  <Badge tone="ok" className="text-[10px]">
                    Preferred in Renal Impairment
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted">Hepatic Status &amp; Clinical Setting</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      variant={hepaticStatus === "none" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setHepaticStatus("none")}
                      className="text-[11px] h-8"
                    >
                      Normal Liver (2 &mu;g/kg/min)
                    </Button>
                    <Button
                      type="button"
                      variant={hepaticStatus === "moderate" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setHepaticStatus("moderate")}
                      className="text-[11px] h-8"
                    >
                      Child-Pugh B/C (0.5 &mu;g)
                    </Button>
                    <Button
                      type="button"
                      variant={hepaticStatus === "severe_shock" ? "danger" : "secondary"}
                      size="sm"
                      onClick={() => setHepaticStatus("severe_shock")}
                      className="text-[11px] h-8"
                    >
                      Shock / HF (0.25 &mu;g)
                    </Button>
                  </div>
                </div>

                <div className="rounded-md bg-surface p-3 border border-border/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted">Recommended Initial Infusion:</span>
                    <span className="font-mono font-bold text-accent text-sm">
                      {argatrobanCalc.recommendedInitialInfusionRateMcgKgMin} &mu;g/kg/min
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Total Delivery Rate:</span>
                    <span className="font-bold text-fg">
                      {argatrobanCalc.calculatedInfusionRateMcgMin} &mu;g/min ({argatrobanCalc.calculatedInfusionRateMgHr} mg/hr)
                    </span>
                  </div>
                  <div className="text-[10px] text-muted pt-1 border-t border-border/50">
                    Half-Life: <strong className="text-fg">{argatrobanCalc.eliminationHalfLifeMinutes}</strong> &bull; Clear:{" "}
                    <em>98% hepatic metabolism (hydroxylation/aromatization)</em>
                  </div>
                </div>
              </div>

              {/* Card 2: Bivalirudin */}
              <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-fg text-sm">Bivalirudin</span>
                    <Badge tone="accent" className="font-mono text-[10px]">
                      Synthetic Peptide (2180 Da)
                    </Badge>
                  </div>
                  <Badge tone="ok" className="text-[10px]">
                    Preferred in Liver Failure / PCI
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted">Renal Elimination Rails</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <Button
                      type="button"
                      variant={bivalirudinRenal === "normal" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setBivalirudinRenal("normal")}
                      className="text-[10px] h-8"
                    >
                      Normal (0.15 mg)
                    </Button>
                    <Button
                      type="button"
                      variant={bivalirudinRenal === "moderate_ckd" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setBivalirudinRenal("moderate_ckd")}
                      className="text-[10px] h-8"
                    >
                      Mod CKD (0.15 mg)
                    </Button>
                    <Button
                      type="button"
                      variant={bivalirudinRenal === "severe_ckd" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setBivalirudinRenal("severe_ckd")}
                      className="text-[10px] h-8"
                    >
                      CrCl &lt;30 (0.10 mg)
                    </Button>
                    <Button
                      type="button"
                      variant={bivalirudinRenal === "esrd_dialysis" ? "danger" : "secondary"}
                      size="sm"
                      onClick={() => setBivalirudinRenal("esrd_dialysis")}
                      className="text-[10px] h-8"
                    >
                      Dialysis (0.05 mg)
                    </Button>
                  </div>
                </div>

                <div className="rounded-md bg-surface p-3 border border-border/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted">Continuous Infusion (no bolus in HIT):</span>
                    <span className="font-mono font-bold text-accent text-sm">
                      {bivalirudinCalc.recommendedInfusionRateMgKgHr} mg/kg/hr
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Total Delivery Rate:</span>
                    <span className="font-bold text-fg">{bivalirudinCalc.calculatedInfusionRateMgHr} mg/hr</span>
                  </div>
                  <div className="text-[10px] text-muted pt-1 border-t border-border/50">
                    Half-Life: <strong className="text-fg">{bivalirudinCalc.eliminationHalfLifeMinutes}</strong> &bull; Clear:{" "}
                    <em>80% proteolytic cleavage / 20% renal</em>
                  </div>
                </div>
              </div>
            </div>

            {/* VISUAL ARGATROBAN-WARFARIN INR CROSSOVER TRAP BANNER */}
            <div className="rounded-xl border border-warn/50 bg-warn/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warn/30 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warn" />
                  <span className="font-bold text-sm text-fg">
                    Argatroban-Warfarin INR Crossover Trap Visualizer
                  </span>
                </div>
                <Badge
                  tone={crossoverCalc.canStopArgatrobanNow ? "ok" : "danger"}
                  className="font-mono uppercase text-[10px]"
                >
                  {crossoverCalc.canStopArgatrobanNow ? "Ready for Argatroban Hold" : "DO NOT STOP ARGATROBAN"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-muted">Combined Therapy INR Reading:</span>
                      <span className="font-mono font-bold text-fg text-sm">INR {combinedInr.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="7.0"
                      step="0.1"
                      value={combinedInr}
                      onChange={(e) => setCombinedInr(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface accent-accent"
                    />
                    <div className="flex justify-between text-[10px] text-muted">
                      <span>1.5</span>
                      <span>2.0–3.0 (Subtherapeutic True)</span>
                      <span className="font-bold text-warn">&gt; 4.0 Cutoff</span>
                      <span>7.0</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-muted">Days on Combined Argatroban + Warfarin:</span>
                      <span className="font-mono font-bold text-fg">{daysOnCombinedTherapy} Day(s)</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDaysOnCombinedTherapy(d)}
                          className={cn(
                            "px-3 py-1 rounded text-xs font-mono font-bold border transition-colors",
                            daysOnCombinedTherapy === d
                              ? "bg-accent text-accent-fg border-accent"
                              : "bg-surface text-muted border-border hover:text-fg",
                          )}
                        >
                          {d} Day{d > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side: High contrast alert box */}
                <div
                  className={cn(
                    "rounded-lg p-3.5 border flex flex-col justify-between space-y-2",
                    crossoverCalc.canStopArgatrobanNow
                      ? "bg-ok/15 border-ok/40 text-ok"
                      : "bg-danger/15 border-danger/40 text-danger",
                  )}
                >
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                      {crossoverCalc.canStopArgatrobanNow ? (
                        <CheckCircle2 className="h-4 w-4 text-ok" />
                      ) : (
                        <AlertOctagon className="h-4 w-4 text-danger" />
                      )}
                      {crossoverCalc.safetyAlert}
                    </div>
                    <p className="text-[11px] text-fg leading-relaxed mt-1.5">
                      {crossoverCalc.recommendedNextStep}
                    </p>
                  </div>

                  <div className="text-[10px] text-muted pt-2 border-t border-border/40">
                    <strong>Mechanism:</strong> Argatroban directly inhibits thrombin in commercial PT reagents, falsely elevating INR 2- to 3-fold. Solitary INR must be re-measured {crossoverCalc.recheckInrWindowHours} after holding argatroban (true goal {crossoverCalc.trueWarfarinInrGoal}).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: URGENT REVERSAL CALCULATORS */}
      {activeTab === "reversals" && (
        <div className="space-y-6">
          {/* CALCULATOR 1: 4-FACTOR PCC + VITAMIN K WARFARIN REVERSAL */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  4-Factor PCC (Kcentra) &amp; Vitamin K Warfarin Reversal Nomogram
                </span>
                <span className="text-muted text-[11px]">(FDA Labeled INR Rails &amp; 100 kg Cap)</span>
              </div>
              <Badge tone={pccInr >= 2.0 ? "accent" : "default"} className="font-mono uppercase text-[11px]">
                {pccCalc.dosingTierUnitsPerKg > 0 ? `${pccCalc.dosingTierUnitsPerKg} Units/kg Tier` : "INR < 2.0 (Below Rail)"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sliders */}
              <div className="space-y-4">
                {/* Weight Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <label className="font-medium text-fg">Patient Body Weight (kg)</label>
                    <span className="font-mono font-bold text-accent">{pccWeightKg} kg</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="140"
                    step="1"
                    value={pccWeightKg}
                    onChange={(e) => setPccWeightKg(Number(e.target.value))}
                    className="mt-1 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>40 kg</span>
                    <span>70 kg</span>
                    <span className="font-bold text-accent">100 kg (Maximum Cap Limit)</span>
                    <span>140 kg</span>
                  </div>
                </div>

                {/* Baseline INR Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <label className="font-medium text-fg">Pre-Treatment Baseline INR</label>
                    <span className="font-mono font-bold text-accent">INR {pccInr.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="10.0"
                    step="0.1"
                    value={pccInr}
                    onChange={(e) => setPccInr(Number(e.target.value))}
                    className="mt-1 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>&lt; 2.0 (Off-rail)</span>
                    <span>2.0–3.9 (25 U/kg)</span>
                    <span>4.0–6.0 (35 U/kg)</span>
                    <span className="font-bold text-accent">&gt; 6.0 (50 U/kg)</span>
                  </div>
                </div>
              </div>

              {/* Output Card */}
              <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[11px] font-medium text-muted">Administered 4F-PCC (Factor IX) Dose</span>
                  <div className="text-2xl font-mono font-bold text-accent mt-1">
                    {pccCalc.cappedDoseUnits.toLocaleString()} Units Factor IX
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">
                    Calculated: {pccCalc.calculatedUnitsRaw.toLocaleString()} units ({pccWeightKg} kg &times; {pccCalc.dosingTierUnitsPerKg} U/kg).{" "}
                    {pccCalc.calculatedUnitsRaw > pccCalc.cappedDoseUnits ? (
                      <span className="text-warn font-semibold">
                        Maximum dose cap of {pccCalc.maximumCapApplied.toLocaleString()} units applied (100 kg weight cap).
                      </span>
                    ) : (
                      "Within labeled maximum dose cap."
                    )}
                  </p>
                </div>

                {/* Concurrent Vitamin K Callout with Black Box Warning */}
                <div className="rounded-md bg-danger/10 p-3 border border-danger/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-danger font-semibold text-[11px]">
                    <AlertOctagon className="h-4 w-4" />
                    Mandatory Concurrent IV Vitamin K (Phytonadione) &bull; BLACK BOX WARNING
                  </div>
                  <p className="text-[11px] text-fg leading-relaxed">
                    <strong>{pccCalc.mandatoryVitaminK.dose}</strong> via {pccCalc.mandatoryVitaminK.routeAndRate}
                  </p>
                  <p className="text-[10px] text-muted leading-relaxed">
                    {pccCalc.mandatoryVitaminK.physiologicalRationale}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CALCULATOR 2: PROTAMINE SULFATE HEPARIN NEUTRALIZATION */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  Protamine Sulfate Heparinoid Neutralization Kinetics
                </span>
                <span className="text-muted text-[11px]">(Stoichiometric Sizing &amp; Time-Decay Rails)</span>
              </div>
              <Badge
                tone={protamineCalc.isFondaparinuxZeroReversal ? "danger" : "accent"}
                className="font-mono uppercase text-[11px]"
              >
                {protamineCalc.isFondaparinuxZeroReversal ? "0% Reversal (Refractory)" : `${protamineCalc.calculatedProtamineDoseMg} mg IV`}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Heparinoid selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted">Heparinoid Target</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={protamineAgent === "heparin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("heparin");
                      setProtamineDoseInput(5000);
                    }}
                    className="text-xs"
                  >
                    UFH (Heparin)
                  </Button>
                  <Button
                    type="button"
                    variant={protamineAgent === "enoxaparin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("enoxaparin");
                      setProtamineDoseInput(80);
                    }}
                    className="text-xs"
                  >
                    Enoxaparin (LMWH)
                  </Button>
                  <Button
                    type="button"
                    variant={protamineAgent === "dalteparin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("dalteparin");
                      setProtamineDoseInput(5000);
                    }}
                    className="text-xs"
                  >
                    Dalteparin
                  </Button>
                  <Button
                    type="button"
                    variant={protamineAgent === "fondaparinux" ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("fondaparinux");
                      setProtamineDoseInput(7.5);
                    }}
                    className="text-xs"
                  >
                    Fondaparinux
                  </Button>
                </div>
              </div>

              {/* Dose input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-muted">
                    {protamineAgent === "heparin" || protamineAgent === "dalteparin" ? "Dose Administered (Units)" : "Dose Administered (mg)"}
                  </label>
                  <span className="font-mono font-bold text-fg">
                    {protamineDoseInput} {protamineAgent === "heparin" || protamineAgent === "dalteparin" ? "Units" : "mg"}
                  </span>
                </div>
                <Input
                  type="number"
                  value={protamineDoseInput}
                  onChange={(e) => setProtamineDoseInput(Math.max(1, Number(e.target.value) || 100))}
                  className="h-9 text-xs font-mono"
                />
                <span className="text-[10px] text-muted">
                  {protamineAgent === "heparin" ? "Stoichiometry: 1 mg neutralizes ~100 U UFH." : "Partial ~60% anti-FXa reversal."}
                </span>
              </div>

              {/* Hours elapsed slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-muted">Time Since Infusion Stop / Dose</label>
                  <span className="font-mono font-bold text-fg">{protamineHours} hours</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="12"
                  step="0.1"
                  value={protamineHours}
                  onChange={(e) => setProtamineHours(Number(e.target.value))}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>&lt;30m (1.0 mg)</span>
                  <span>30–60m (0.75 mg)</span>
                  <span>&gt;120m (0.25 mg)</span>
                </div>
              </div>
            </div>

            {/* Anaphylaxis Screening Toggles */}
            <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 space-y-2 text-[11px]">
              <span className="font-semibold text-fg flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                Protamine Hypersensitivity &amp; Disaster Risk Factor Toggles
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFishAllergy}
                    onChange={(e) => setHasFishAllergy(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Fish / Salmon Hypersensitivity</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPriorNph}
                    onChange={(e) => setHasPriorNph(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Prior NPH Insulin (Anti-Protamine IgG)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVasectomy}
                    onChange={(e) => setHasVasectomy(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Prior Vasectomy (Anti-Sperm Antibodies)</span>
                </label>
              </div>
            </div>

            {/* VISUAL PROTAMINE PULMONARY VASOCONSTRICTION DISASTER WARNING BANNER */}
            <div className="rounded-lg bg-danger/15 p-3.5 border border-danger/40 space-y-2">
              <div className="flex items-center gap-2 text-danger font-bold text-xs uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4" />
                Protamine Hypersensitivity &amp; Acute Pulmonary Vasoconstriction Warning Banner
              </div>
              <p className="text-[11px] text-fg leading-relaxed">
                {protamineCalc.anaphylactoidRiskFlags.pulmonaryVasoconstrictionWarning}
              </p>
              <div className="pt-2 border-t border-danger/30 flex flex-wrap justify-between text-[11px] font-mono">
                <span className="text-danger font-bold">Mandatory Rate: Slow IV infusion over &ge; 10–15 minutes (&le; 5 mg/min)</span>
                <span className="text-warn font-bold">Maximum Single Dose Ceiling: 50 mg (Avoid Paradoxical Free Protamine Anticoagulation)</span>
              </div>
            </div>

            {/* Dose Result Card */}
            <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-medium text-muted">Calculated Protamine Dose</span>
                <div className="text-2xl font-mono font-bold text-fg mt-0.5">
                  {protamineCalc.calculatedProtamineDoseMg} mg IV
                </div>
                <p className="text-[11px] text-muted mt-1">{protamineCalc.clinicalRationale}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-muted">Anticoagulant Neutralization</span>
                <div className="font-mono font-bold text-fg text-sm mt-0.5">{protamineCalc.percentNeutralization}</div>
                <span className="text-[10px] text-muted">{protamineCalc.administrationRate}</span>
              </div>
            </div>
          </div>

          {/* CALCULATOR 3: ANDEXANET ALFA (ANNEXA-4) */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  Andexanet Alfa (Andexxa) Direct FXa Decoy Nomogram
                </span>
                <span className="text-muted text-[11px]">(ANNEXA-4 Benchmarks)</span>
              </div>
              <Badge tone={andexCalc.isHighDose ? "danger" : "info"} className="font-mono uppercase text-[11px]">
                {andexCalc.regimenTier} ({andexCalc.totalDoseMg} mg Total)
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted">Target Agent</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={andexTarget === "apixaban" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setAndexTarget("apixaban");
                      setAndexDoseMg(5);
                    }}
                    className="text-xs"
                  >
                    Apixaban
                  </Button>
                  <Button
                    type="button"
                    variant={andexTarget === "rivaroxaban" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setAndexTarget("rivaroxaban");
                      setAndexDoseMg(20);
                    }}
                    className="text-xs"
                  >
                    Rivaroxaban
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <label className="font-medium text-muted">Last Dose (mg)</label>
                  <span className="font-mono font-bold text-fg">{andexDoseMg} mg</span>
                </div>
                <Input
                  type="number"
                  value={andexDoseMg}
                  onChange={(e) => setAndexDoseMg(Math.max(1, Number(e.target.value) || 5))}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <label className="font-medium text-muted">Time Elapsed (hours)</label>
                  <span className="font-mono font-bold text-fg">{andexHoursElapsed}h</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={andexHoursElapsed}
                  onChange={(e) => setAndexHoursElapsed(Number(e.target.value))}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
              </div>
            </div>

            <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-fg text-xs flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-accent" /> Phase 1: IV Bolus
                </span>
                <div className="text-xl font-mono font-bold text-accent mt-1">{andexCalc.ivBolusMg} mg IV</div>
                <p className="text-[11px] text-muted">
                  Infuse at {andexCalc.ivBolusRateMgMin} mg/min over ~{andexCalc.ivBolusDurationMinutes} minutes.
                </p>
              </div>
              <div>
                <span className="font-semibold text-fg text-xs flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-accent" /> Phase 2: Continuous IV Infusion
                </span>
                <div className="text-xl font-mono font-bold text-accent mt-1">{andexCalc.continuousInfusionMg} mg IV</div>
                <p className="text-[11px] text-muted">
                  Infuse at {andexCalc.continuousInfusionRateMgMin} mg/min over {andexCalc.continuousInfusionDurationHours} hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: AGENT MATRIX */}
      {activeTab === "comparison" && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-serif text-base font-bold text-fg">Anticoagulant &amp; Reversal Agent Pharmacological Matrix</h3>
            <p className="text-muted text-[11px]">
              Comparative kinetic parameters, renal clearance dependencies, targeted antidotes, and clinical trial evidence.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-muted">
                  <th className="p-3 font-semibold">Agent</th>
                  <th className="p-3 font-semibold">Class &amp; Target</th>
                  <th className="p-3 font-semibold">Renal Fraction</th>
                  <th className="p-3 font-semibold">Half-Life</th>
                  <th className="p-3 font-semibold">Primary Antidote / Reversal</th>
                  <th className="p-3 font-semibold">Clinical Traps &amp; Key Pearls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.values(ANTICOAGULANT_PROFILES).map((prof: AnticoagulantProfile) => (
                  <tr key={prof.id} className="hover:bg-bg-sunken/50">
                    <td className="p-3 font-semibold text-fg">
                      {prof.name}
                      <div className="text-[10px] text-muted font-normal">{prof.brandNames.join(", ")}</div>
                    </td>
                    <td className="p-3 text-muted">
                      <Badge tone="accent" className="text-[10px]">
                        {prof.class.replace(/-/g, " ")}
                      </Badge>
                      <div className="text-[10px] mt-1">{prof.primaryTarget}</div>
                    </td>
                    <td className="p-3 font-mono">
                      {Math.round(prof.renalClearanceFraction * 100)}%
                    </td>
                    <td className="p-3 text-muted font-mono">{prof.eliminationHalfLife.normalHours}</td>
                    <td className="p-3 text-fg font-medium">
                      {prof.reversalOptions.firstLine}
                    </td>
                    <td className="p-3 text-muted text-[11px]">
                      {prof.boxedWarningsAndTraps[0] ?? "See full profile."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 4: COAGULATION LAB TRAPS */}
      {activeTab === "lab-traps" && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-serif text-base font-bold text-fg">Coagulation Laboratory Traps &amp; Monitoring Diagnostic Matrix</h3>
            <p className="text-muted text-[11px]">
              High-yield assay insensitivities, artifactual test elevations, and critical exclusion rules essential for emergency bedside assessment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COAGULATION_LAB_TRAPS.map((trap, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-surface-sunken p-4 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      tone={
                        trap.trapType === "misleading-normal"
                          ? "danger"
                          : trap.trapType === "exclusion-rule"
                          ? "ok"
                          : trap.trapType === "artifactual-elevation"
                          ? "warn"
                          : "accent"
                      }
                      className="font-mono uppercase text-[10px]"
                    >
                      {trap.trapType.replace(/-/g, " ")}
                    </Badge>
                    <span className="text-[11px] font-semibold text-fg">{trap.targetDrug}</span>
                  </div>

                  <div className="text-xs font-bold text-fg pt-1">{trap.assayName}</div>
                  <p className="text-[11px] font-medium text-danger leading-relaxed">{trap.clinicalRule}</p>
                </div>

                <p className="text-[10px] text-muted leading-relaxed border-t border-border/50 pt-2">
                  <strong>Biochemical Mechanism:</strong> {trap.underlyingMechanics}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Regulatory Footer */}
      <div className="rounded-lg bg-surface-sunken p-3.5 border border-border/60 text-[10px] text-muted leading-relaxed space-y-1.5">
        <div>
          <strong>FD&amp;C Act § 520(o)(1)(E) Regulatory Notice:</strong> {ANTICOAGULATION_CDS_DISCLAIMER}
        </div>
        <div className="text-[9px] text-muted/80">
          <strong>Key Peer-Reviewed Literature Citations:</strong>{" "}
          {ANTICOAGULATION_LITERATURE_CITATIONS.slice(0, 4).join(" &bull; ")}
        </div>
      </div>
    </div>
  );
}

/**
 * Standard alias for ClinicalBoard desk tab mounting.
 */
export const AnticoagulationPanel = AnticoagulationStation;
