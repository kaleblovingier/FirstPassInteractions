import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Pill,
  Scale,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  ANESTHESIA_CDS_DISCLAIMER,
  NMBA_PROFILES,
  ALL_NMBA_IDS,
  REVERSAL_PROFILES,
  SEDATIVE_PROFILES,
  anesthesiaReportOnDesk,
  calculateSugammadexDose,
  calculateNeostigmineGlycopyrrolateDose,
  evaluateTofDepth,
  evaluatePrisRisk,
  evaluateSuccinylcholineHyperkalemiaRisk,
  evaluatePseudocholinesteraseDeficiency,
  type NMBAId,
  type SedativeAgentId,
} from "@/lib/drugs/anesthesia-reversal";

export interface AnesthesiaStationProps {
  ids: string[];
  host: HostContext;
}

export function AnesthesiaStation({ ids, host }: AnesthesiaStationProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "monitoring-reversal" | "sedation-delirium" | "succinylcholine-safety" | "agent-matrix"
  >("monitoring-reversal");

  // Core Calculator State
  const [patientWeightKg, setPatientWeightKg] = useState<number>(70);
  const [selectedNmba, setSelectedNmba] = useState<NMBAId>("rocuronium");
  const [tofTwitches, setTofTwitches] = useState<number>(2);
  const [postTetanicCount, setPostTetanicCount] = useState<number>(1);
  const [tofRatio, setTofRatio] = useState<number>(0.90);
  const [isEmergencyRsi, setIsEmergencyRsi] = useState<boolean>(false);

  // ICU Sedation / PRIS State
  const [propofolRateMcg, setPropofolRateMcg] = useState<number>(45);
  const [propofolHours, setPropofolHours] = useState<number>(36);
  const [selectedSedative, setSelectedSedative] = useState<SedativeAgentId>("propofol");

  // Succinylcholine / Hyperkalemia State
  const [hasBurn, setHasBurn] = useState<boolean>(false);
  const [burnDays, setBurnDays] = useState<number>(7);
  const [hasDenervation, setHasDenervation] = useState<boolean>(false);
  const [denervationDays, setDenervationDays] = useState<number>(14);
  const [hasNmd, setHasNmd] = useState<boolean>(false);
  const [bcheVariant, setBcheVariant] = useState<
    "normal" | "heterozygous-atypical" | "homozygous-atypical" | "silent"
  >("normal");

  // Host report derivation
  const report = useMemo(
    () =>
      anesthesiaReportOnDesk(ids, host, {
        weightKg: patientWeightKg,
        selectedNmbaId: selectedNmba,
        tofTwitches,
        tofRatio: tofTwitches === 4 ? tofRatio : undefined,
        postTetanicCount: tofTwitches === 0 ? postTetanicCount : undefined,
        isEmergencyRsiReversal: isEmergencyRsi,
        propofolRateMcgKgMin: propofolRateMcg,
        propofolDurationHours: propofolHours,
        hasBurnOrDenervation: hasBurn || hasDenervation,
        burnOrDenervationDays: hasBurn ? burnDays : denervationDays,
        hasNeuromuscularDisease: hasNmd,
        hasBcheDeficiency: bcheVariant !== "normal",
        bcheVariant: bcheVariant !== "normal" ? bcheVariant : undefined,
      }),
    [
      ids.join("|"),
      host,
      patientWeightKg,
      selectedNmba,
      tofTwitches,
      postTetanicCount,
      tofRatio,
      isEmergencyRsi,
      propofolRateMcg,
      propofolHours,
      hasBurn,
      burnDays,
      hasDenervation,
      denervationDays,
      hasNmd,
      bcheVariant,
    ],
  );

  // Dynamic calculations
  const tofEval = useMemo(
    () =>
      evaluateTofDepth({
        twitches: tofTwitches,
        tofRatio: tofTwitches === 4 ? tofRatio : undefined,
        postTetanicCount: tofTwitches === 0 ? postTetanicCount : undefined,
      }),
    [tofTwitches, tofRatio, postTetanicCount],
  );

  const sugammadexCalc = useMemo(() => {
    let depthCategory: "moderate" | "deep" | "immediate-rescue" = "moderate";
    if (isEmergencyRsi) {
      depthCategory = "immediate-rescue";
    } else if (tofEval.depth === "deep" || tofEval.depth === "intense") {
      depthCategory = "deep";
    }
    return calculateSugammadexDose({
      weightKg: patientWeightKg,
      depthCategory,
      nmbaId: selectedNmba,
    });
  }, [patientWeightKg, isEmergencyRsi, tofEval.depth, selectedNmba]);

  const neostigmineCalc = useMemo(
    () =>
      calculateNeostigmineGlycopyrrolateDose({
        weightKg: patientWeightKg,
        tofTwitches,
        tofRatio: tofTwitches === 4 ? tofRatio : undefined,
      }),
    [patientWeightKg, tofTwitches, tofRatio],
  );

  const prisCalc = useMemo(
    () =>
      evaluatePrisRisk({
        rateMcgKgMin: propofolRateMcg,
        durationHours: propofolHours,
      }),
    [propofolRateMcg, propofolHours],
  );

  const suxHyperkalemiaCalc = useMemo(
    () =>
      evaluateSuccinylcholineHyperkalemiaRisk({
        hasThermalBurn: hasBurn,
        burnDaysPostInjury: burnDays,
        hasSpinalCordInjuryOrStroke: hasDenervation,
        denervationDaysPostInjury: denervationDays,
        hasNeuromuscularDisease: hasNmd,
      }),
    [hasBurn, burnDays, hasDenervation, denervationDays, hasNmd],
  );

  const bcheCalc = useMemo(
    () =>
      evaluatePseudocholinesteraseDeficiency({
        variantType: bcheVariant !== "normal" ? bcheVariant : undefined,
      }),
    [bcheVariant],
  );

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* 1. Header Banner & CDS Posture */}
      <div className="rounded-xl border border-border bg-surface-sunken p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-accent/15 p-2 text-accent">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold tracking-tight text-fg">
                  Anesthesia Reversal, NMBA Kinetics &amp; ICU Sedation Station
                </span>
                <Badge tone="accent" className="font-mono text-[10px] uppercase">
                  FD&amp;C Act § 520(o)(1)(E) CDS
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                Quantitative Train-of-Four (TOF/PTC) monitoring, Sugammadex cyclodextrin encapsulation thermodynamics, Neostigmine ceiling dynamics, and SCCM PADIS ICU sedation &amp; PRIS risk monitoring.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeTab === "monitoring-reversal" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("monitoring-reversal")}
              className="text-xs"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              TOF &amp; Reversal
            </Button>
            <Button
              variant={activeTab === "sedation-delirium" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("sedation-delirium")}
              className="text-xs"
            >
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              ICU Sedation / PRIS
            </Button>
            <Button
              variant={activeTab === "succinylcholine-safety" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("succinylcholine-safety")}
              className="text-xs"
            >
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
              Sux &amp; Hyperkalemia
            </Button>
            <Button
              variant={activeTab === "agent-matrix" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("agent-matrix")}
              className="text-xs"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Agent Matrix
            </Button>
          </div>
        </div>

        {/* Desk Detection Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted">Desk Detection:</span>
            {report.onDesk.activeAgents.length > 0 ? (
              <span className="font-semibold text-accent">
                {report.onDesk.activeAgents.join(" · ")}
              </span>
            ) : (
              <span className="text-muted italic">No anesthesia agents on desk (Interactive Simulation Active)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {report.activeCollisions.length > 0 ? (
              <Badge tone="danger" className="text-[10px]">
                {report.activeCollisions.length} Active Collision{report.activeCollisions.length > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge tone="ok" className="text-[10px]">No Detected Clashes</Badge>
            )}
          </div>
        </div>
      </div>

      {/* 2. Active Collisions Banner Bar (if any) */}
      {report.activeCollisions.length > 0 && (
        <div className="space-y-3">
          {report.activeCollisions.map((col) => (
            <div
              key={col.id}
              className={cn(
                "rounded-xl border p-4 shadow-sm space-y-2",
                col.severity === "critical"
                  ? "border-danger/40 bg-danger/10 text-danger-fg"
                  : "border-warning/40 bg-warning/10 text-warning-fg",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
                  <span className="font-bold text-sm">{col.title}</span>
                </div>
                <Badge tone={col.severity === "critical" ? "danger" : "default"} className="uppercase text-[9px]">
                  {col.severity}
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>Mechanism:</strong> {col.mechanism}
              </p>
              <p className="text-[11px] leading-relaxed">
                <strong>Consequence:</strong> {col.clinicalConsequence}
              </p>
              <div className="rounded bg-surface/80 p-2.5 border border-border/50 text-[11px] text-fg">
                <strong>Management:</strong> {col.managementGuidance}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: TOF & REVERSAL CALCULATOR */}
      {activeTab === "monitoring-reversal" && (
        <div className="space-y-6">
          {/* Patient Parameters & Controls */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-fg text-sm">
                  Neuromuscular Blockade &amp; Train-of-Four (TOF) Evaluator
                </span>
                <p className="text-muted text-[11px]">
                  Configure patient weight, paralytic agent, and electrophysiologic twitch response to determine precise reversal kinetics.
                </p>
              </div>
              <Button
                size="sm"
                variant={isEmergencyRsi ? "danger" : "outline"}
                onClick={() => setIsEmergencyRsi(!isEmergencyRsi)}
                className="text-xs"
              >
                <Flame className="mr-1.5 h-3.5 w-3.5" />
                {isEmergencyRsi ? "Emergency RSI Rescue Active (16 mg/kg)" : "Toggle RSI Rescue Mode"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
              {/* Weight Input */}
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">
                  Actual Body Weight (TBW):
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="20"
                    max="250"
                    value={patientWeightKg}
                    onChange={(e) => setPatientWeightKg(Number(e.target.value) || 70)}
                    className="h-9 font-mono"
                  />
                  <span className="text-muted text-xs">kg</span>
                </div>
                <span className="text-[10px] text-muted block mt-1">
                  *Sugammadex sizing MUST use actual body weight, even in obesity.
                </span>
              </div>

              {/* NMBA Selector */}
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">
                  Paralytic Agent (NMBA):
                </label>
                <select
                  value={selectedNmba}
                  onChange={(e) => setSelectedNmba(e.target.value as NMBAId)}
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {ALL_NMBA_IDS.map((id) => (
                    <option key={id} value={id}>
                      {NMBA_PROFILES[id].name} ({NMBA_PROFILES[id].class === "non-depolarizing-aminosteroid" ? "Aminosteroid" : NMBA_PROFILES[id].class === "non-depolarizing-benzylisoquinolinium" ? "Benzylisoquinolinium" : "Depolarizing"})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted block mt-1">
                  Class: {NMBA_PROFILES[selectedNmba].class} · Sugammadex Kd: {NMBA_PROFILES[selectedNmba].sugammadexAffinityKdMicroMolar !== null ? `${NMBA_PROFILES[selectedNmba].sugammadexAffinityKdMicroMolar} µM` : "None"}
                </span>
              </div>

              {/* TOF Twitches */}
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">
                  Train-of-Four (TOF) Twitches (0 - 4):
                </label>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTofTwitches(t)}
                      className={cn(
                        "flex-1 h-9 rounded text-xs font-semibold border transition-all",
                        tofTwitches === t
                          ? "bg-accent text-bg border-accent shadow-sm"
                          : "bg-surface-sunken text-muted border-border hover:text-fg",
                      )}
                    >
                      {t} {t === 1 ? "Twitch" : "Twitches"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sub-selectors for 0 twitches (PTC) or 4 twitches (Ratio) */}
            {tofTwitches === 0 && (
              <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-fg">Post-Tetanic Count (PTC 0 - 16):</span>
                  <p className="text-[11px] text-muted">
                    Assess deep vs intense blockade with 50 Hz tetanic burst followed by 1 Hz single twitches.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="16"
                    value={postTetanicCount}
                    onChange={(e) => setPostTetanicCount(Number(e.target.value) || 0)}
                    className="w-20 h-8 font-mono text-center"
                  />
                  <Badge tone={postTetanicCount === 0 ? "danger" : postTetanicCount <= 2 ? "accent" : "default"}>
                    {postTetanicCount === 0 ? "Intense Block (PTC 0)" : postTetanicCount <= 2 ? "Deep Block (PTC 1-2)" : "Moderate Transition"}
                  </Badge>
                </div>
              </div>
            )}

            {tofTwitches === 4 && (
              <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-fg">Quantitative TOF Ratio (T4 / T1):</span>
                  <p className="text-[11px] text-muted">
                    Quantitative electromyography or acceleromyography ratio. 2023 ASA criteria mandate ≥ 0.90 for extubation.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.2"
                    value={tofRatio}
                    onChange={(e) => setTofRatio(Number(e.target.value) || 0.90)}
                    className="w-24 h-8 font-mono text-center"
                  />
                  <Badge tone={tofRatio >= 0.90 ? "ok" : "danger"}>
                    {tofRatio >= 0.90 ? "Recovered (≥ 0.90)" : "Shallow Block (< 0.90)"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Electrophysiologic Assessment Card */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                <span className="font-bold text-fg text-sm">
                  Electrophysiologic Neuromuscular Depth Evaluation
                </span>
              </div>
              <Badge
                tone={
                  tofEval.depth === "minimal-or-recovered"
                    ? "ok"
                    : tofEval.depth === "intense" || tofEval.depth === "deep"
                    ? "danger"
                    : "accent"
                }
                className="uppercase font-mono text-[10px]"
              >
                Depth: {tofEval.depth}
              </Badge>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              <strong>Clinical Assessment:</strong> {tofEval.clinicalDescription}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-2 border-t border-border/50">
              <div>
                <span className="text-muted block">Receptor Occupancy:</span>
                <span className="font-semibold text-fg">{tofEval.receptorOccupancyPct}</span>
              </div>
              <div>
                <span className="text-muted block">Extubation Readiness (2023 ASA):</span>
                <span className={cn("font-semibold", tofEval.depth === "minimal-or-recovered" ? "text-ok" : "text-danger")}>
                  {tofEval.depth === "minimal-or-recovered" ? "SAFE TO EXTUBATE (TOF Ratio ≥ 0.90 verified)" : "UNSAFE TO EXTUBATE (Residual Blockade Present)"}
                </span>
              </div>
            </div>
          </div>

          {/* Dosing Cards: Sugammadex vs Neostigmine Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 1: SUGAMMADEX CYCLODEXTRIN DOSING */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="font-serif font-bold text-sm text-fg">Sugammadex (Bridion) Encapsulation</span>
                </div>
                <Badge
                  tone={sugammadexCalc.isEffectiveForAgent ? "accent" : "danger"}
                  className="text-[10px]"
                >
                  {sugammadexCalc.isEffectiveForAgent ? "Target Compatible" : "Zero Affinity"}
                </Badge>
              </div>

              {sugammadexCalc.isEffectiveForAgent ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-surface-sunken p-3 border border-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Target Weight Tier:</span>
                      <span className="font-bold font-mono text-fg">{sugammadexCalc.recommendedDoseMgKg} mg/kg</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted">Calculated Dose:</span>
                      <span className="font-bold font-mono text-accent text-sm">{sugammadexCalc.totalDoseMg} mg IV</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-border/40 text-muted">
                      <span>Vial Packaging:</span>
                      <span>
                        {sugammadexCalc.vialsRequired200mg} × 200 mg vials OR {sugammadexCalc.vialsRequired500mg} × 500 mg vials
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed">
                    <strong>Biochemical Kinetics:</strong> {sugammadexCalc.encapsulationKinetics}
                  </p>

                  {/* MANDATORY CONTRACEPTIVE CALLOUT */}
                  <div className="rounded-lg bg-warning/15 border border-warning/40 p-3 text-[11px] text-warning-fg space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-warning">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>MANDATORY 7-DAY BACK-UP CONTRACEPTION COUNSELING</span>
                    </div>
                    <p className="leading-relaxed">
                      Sugammadex encapsulates progesterone and estrogen in its cyclodextrin cavity, lowering active circulating hormone levels by ~34% (equivalent to 1 missed pill). Patients on oral, transdermal, injectable, or implantable hormonal contraceptives <strong>MUST use additional non-hormonal back-up barrier contraception for 7 CONSECUTIVE DAYS</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-[11px] text-danger-fg space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>INCOMPATIBLE: ZERO SUGAMMADEX AFFINITY</span>
                  </div>
                  <p className="leading-relaxed">
                    Sugammadex has <strong>ZERO chemical binding affinity</strong> for {NMBA_PROFILES[selectedNmba].name}. The macrocycle cavity only fits the lipophilic steroid nucleus of aminosteroids. Administering sugammadex will NOT reverse this block.
                  </p>
                </div>
              )}
            </div>

            {/* CARD 2: NEOSTIGMINE + GLYCOPYRROLATE DOSING */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted" />
                  <span className="font-serif font-bold text-sm text-fg">Neostigmine + Glycopyrrolate Reversal</span>
                </div>
                <Badge
                  tone={neostigmineCalc.isEligible ? "ok" : "danger"}
                  className="text-[10px]"
                >
                  {neostigmineCalc.isEligible ? "Eligible" : "Contraindicated / Ineffective"}
                </Badge>
              </div>

              {neostigmineCalc.isEligible ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-surface-sunken p-3 border border-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Neostigmine Dose:</span>
                      <span className="font-bold font-mono text-fg">
                        {neostigmineCalc.neostigmineDoseMgKg} mg/kg ({neostigmineCalc.neostigmineTotalMg} mg IV)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted">Glycopyrrolate Dose (1:5):</span>
                      <span className="font-bold font-mono text-accent text-sm">
                        {neostigmineCalc.glycopyrrolateTotalMg} mg IV
                      </span>
                    </div>
                    {neostigmineCalc.neostigmineMaxCapApplied && (
                      <span className="text-[10px] text-warning block mt-1">
                        *Neostigmine capped at labeled maximum 5.0 mg single dose.
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed">
                    <strong>Anticholinergic Rationale:</strong> {neostigmineCalc.glycopyrrolateRatioExplanation}
                  </p>

                  <div className="rounded-lg bg-surface-sunken p-2.5 border border-border/50 text-[10px] text-muted">
                    <strong>Quaternary Amine Safety:</strong> Glycopyrrolate does not cross the blood-brain barrier, protecting against central anticholinergic syndrome and ICU delirium while blocking lethal muscarinic bradycardia.
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-[11px] text-danger-fg space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>NEOSTIGMINE WITHHELD: PHYSIOLOGICAL CEILING</span>
                  </div>
                  <p className="leading-relaxed">
                    {neostigmineCalc.contraindicatedReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ICU SEDATION & PRIS SAFETY MONITOR */}
      {activeTab === "sedation-delirium" && (
        <div className="space-y-6">
          {/* PRIS Evaluator Card */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-fg text-sm">
                  Propofol Infusion Syndrome (PRIS) ICU Safety Monitor
                </span>
                <p className="text-muted text-[11px]">
                  Continuous infusion rate &amp; duration thresholds, mitochondrial oxidative phosphorylation uncoupling, and fatty acid oxidation failure.
                </p>
              </div>
              <Badge
                tone={prisCalc.isHighPrisRisk ? "danger" : prisCalc.thresholdExceeded ? "warn" : "ok"}
                className="font-mono uppercase text-[10px]"
              >
                {prisCalc.isHighPrisRisk ? "CRITICAL PRIS HAZARD" : prisCalc.thresholdExceeded ? "Threshold Approaching" : "Infusion Within Safe Rails"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">
                  Propofol Infusion Rate:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={propofolRateMcg}
                    onChange={(e) => setPropofolRateMcg(Number(e.target.value) || 0)}
                    className="h-9 font-mono w-28"
                  />
                  <span className="text-xs text-muted">mcg/kg/min</span>
                  <span className="text-xs font-mono text-fg">
                    ({((propofolRateMcg * 60) / 1000).toFixed(2)} mg/kg/h)
                  </span>
                </div>
                <span className="text-[10px] text-muted block mt-1">
                  *Safety threshold: &lt; 67 mcg/kg/min (&lt; 4.0 - 5.0 mg/kg/h).
                </span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">
                  Infusion Duration (Hours):
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={propofolHours}
                    onChange={(e) => setPropofolHours(Number(e.target.value) || 0)}
                    className="h-9 font-mono w-28"
                  />
                  <span className="text-xs text-muted">hours continuous</span>
                </div>
                <span className="text-[10px] text-muted block mt-1">
                  *Safety threshold: &lt; 48 consecutive hours.
                </span>
              </div>
            </div>

            {/* PRIS Assessment Box */}
            <div className={cn(
              "rounded-lg p-3.5 border space-y-2 text-[11px]",
              prisCalc.isHighPrisRisk
                ? "bg-danger/10 border-danger/40 text-danger-fg"
                : "bg-surface-sunken border-border/80 text-fg",
            )}>
              <div className="flex items-center gap-2 font-bold text-xs">
                {prisCalc.isHighPrisRisk ? (
                  <AlertCircle className="h-4 w-4 text-danger" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-ok" />
                )}
                <span>Pathophysiological Evaluation:</span>
              </div>
              <p className="leading-relaxed">
                <strong>Mechanism:</strong> {prisCalc.mechanism}
              </p>
              <div>
                <strong className="block mb-1">Syndrome Manifestations:</strong>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-muted">
                  {prisCalc.hallmarkFeatures.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SCCM PADIS Guidelines Sedation Comparison Table */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <span className="font-serif font-bold text-sm text-fg">
              SCCM PADIS Guidelines ICU Sedation Comparison
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-muted">
                    <th className="p-2">Agent</th>
                    <th className="p-2">PADIS Role</th>
                    <th className="p-2">Delirium Risk</th>
                    <th className="p-2">Respiratory Drive</th>
                    <th className="p-2">Hemodynamics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="p-2 font-semibold text-fg">Dexmedetomidine (Precedex)</td>
                    <td className="p-2 text-ok">Preferred First-Line</td>
                    <td className="p-2 text-ok font-semibold">Delirium-Sparing</td>
                    <td className="p-2 text-ok">No Depression (Spares Drive)</td>
                    <td className="p-2 text-muted">Sympatholytic Bradycardia / Hypotension</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-fg">Propofol (Diprivan)</td>
                    <td className="p-2 text-accent">First-Line (Ventilated)</td>
                    <td className="p-2 text-muted">Moderate</td>
                    <td className="p-2 text-danger">Severe Depression (Apnea)</td>
                    <td className="p-2 text-muted">Vasodilation &amp; Hypotension (PRIS risk)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-fg">Midazolam (Versed)</td>
                    <td className="p-2 text-danger">Disfavored / Avoid Routine</td>
                    <td className="p-2 text-danger font-semibold">High Independent Risk Factor</td>
                    <td className="p-2 text-danger">Depression (Synergistic with Opioids)</td>
                    <td className="p-2 text-muted">Mild Hypotension (Active 1-OH metabolite in CKD)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-fg">Lorazepam (Ativan)</td>
                    <td className="p-2 text-danger">Disfavored / Avoid Routine</td>
                    <td className="p-2 text-danger font-semibold">High Independent Risk Factor</td>
                    <td className="p-2 text-danger">Depression</td>
                    <td className="p-2 text-muted">Propylene Glycol toxicity in high continuous infusions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUCCINYLCHOLINE HYPERKALEMIA & PSEUDOCHOLINESTERASE */}
      {activeTab === "succinylcholine-safety" && (
        <div className="space-y-6">
          {/* Extrajunctional Hyperkalemia Card */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-fg text-sm">
                  Succinylcholine Extrajunctional nAChR Hyperkalemia Risk
                </span>
                <p className="text-muted text-[11px]">
                  Sarcolemmal upregulation of embryonic fetal nAChRs triggering massive potassium efflux (+3.0 to &gt; 5.0 mEq/L surge).
                </p>
              </div>
              <Badge
                tone={suxHyperkalemiaCalc.isContraindicated ? "danger" : "ok"}
                className="font-mono uppercase text-[10px]"
              >
                {suxHyperkalemiaCalc.isContraindicated ? "SUX CONTRAINDICATED (LETHAL K+ RISK)" : "Standard Population Risk (+0.5 mEq/L)"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
              {/* Thermal Burn Toggle */}
              <div className="rounded-lg border border-border/80 bg-surface-sunken p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Thermal Burn:</span>
                  <input
                    type="checkbox"
                    checked={hasBurn}
                    onChange={(e) => setHasBurn(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </div>
                {hasBurn && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min="1"
                      max="730"
                      value={burnDays}
                      onChange={(e) => setBurnDays(Number(e.target.value) || 1)}
                      className="h-7 w-16 font-mono text-center text-xs"
                    />
                    <span className="text-[10px] text-muted">days post-burn</span>
                  </div>
                )}
                <span className="text-[10px] text-muted block">Risk window: &gt; 24-48h up to 1-2 years.</span>
              </div>

              {/* Denervation Toggle */}
              <div className="rounded-lg border border-border/80 bg-surface-sunken p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Spinal Cord / Stroke:</span>
                  <input
                    type="checkbox"
                    checked={hasDenervation}
                    onChange={(e) => setHasDenervation(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </div>
                {hasDenervation && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={denervationDays}
                      onChange={(e) => setDenervationDays(Number(e.target.value) || 1)}
                      className="h-7 w-16 font-mono text-center text-xs"
                    />
                    <span className="text-[10px] text-muted">days post-injury</span>
                  </div>
                )}
                <span className="text-[10px] text-muted block">Risk window: &gt; 72h up to 6 months.</span>
              </div>

              {/* Neuromuscular Disease Toggle */}
              <div className="rounded-lg border border-border/80 bg-surface-sunken p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Neuromuscular Disease:</span>
                  <input
                    type="checkbox"
                    checked={hasNmd}
                    onChange={(e) => setHasNmd(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </div>
                <span className="text-[10px] text-muted block">
                  ALS, Duchenne/Becker Muscular Dystrophy, Guillain-Barré, CIPNM. Permanent contraindication.
                </span>
              </div>
            </div>

            {/* Hyperkalemia Warning Text */}
            <div className={cn(
              "rounded-lg p-3 border text-[11px] space-y-1.5",
              suxHyperkalemiaCalc.isContraindicated
                ? "bg-danger/10 border-danger/40 text-danger-fg"
                : "bg-surface-sunken border-border/60 text-muted",
            )}>
              <div className="font-bold">
                Potassium Efflux Vector: {suxHyperkalemiaCalc.predictedPotassiumSurgeMeqL}
              </div>
              <p className="leading-relaxed">
                <strong>Mechanism:</strong> {suxHyperkalemiaCalc.mechanism}
              </p>
              {suxHyperkalemiaCalc.isContraindicated && (
                <div className="text-[11px] font-semibold text-accent pt-1">
                  Safe Alternative: Rocuronium 1.0 - 1.2 mg/kg IV (RSI) with Sugammadex available for rescue.
                </div>
              )}
            </div>
          </div>

          {/* Pseudocholinesterase (BChE) Deficiency Calculator */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-fg text-sm">
                  Pseudocholinesterase (BChE) Deficiency &amp; Dibucaine Number
                </span>
                <p className="text-muted text-[11px]">
                  Genetic variants and acquired deficiencies prolonging succinylcholine apnea from 5 minutes to hours.
                </p>
              </div>
              <select
                value={bcheVariant}
                onChange={(e) => setBcheVariant(e.target.value as any)}
                className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-fg"
              >
                <option value="normal">EuEu: Normal (Dibucaine 70-85)</option>
                <option value="heterozygous-atypical">EuEa: Heterozygous Atypical (Dibucaine 50-65)</option>
                <option value="homozygous-atypical">EaEa: Homozygous Atypical (Dibucaine 15-30)</option>
                <option value="silent">EsEs: Silent Gene (Dibucaine 0)</option>
              </select>
            </div>

            <div className="rounded-lg bg-surface-sunken p-3 border border-border/70 space-y-2 text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-muted block">Genotype / Phenotype:</span>
                  <span className="font-semibold text-fg">{bcheCalc.genotypeName}</span>
                </div>
                <div>
                  <span className="text-muted block">Dibucaine Number:</span>
                  <span className="font-semibold font-mono text-accent">{bcheCalc.dibucaineNumber}</span>
                </div>
                <div>
                  <span className="text-muted block">Expected Apnea Duration:</span>
                  <span className="font-semibold text-danger">{bcheCalc.expectedApneaDuration}</span>
                </div>
                <div>
                  <span className="text-muted block">Management Protocol:</span>
                  <span className="text-fg">{bcheCalc.managementProtocol}</span>
                </div>
              </div>

              {bcheCalc.contraindicatedInterventions.length > 0 && (
                <div className="border-t border-border/50 pt-2 text-[10px] text-danger space-y-0.5">
                  <strong>Contraindicated Interventions:</strong>
                  {bcheCalc.contraindicatedInterventions.map((c, i) => (
                    <div key={i}>• {c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AGENT COMPARATIVE MATRIX */}
      {activeTab === "agent-matrix" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <span className="font-serif font-bold text-sm text-fg">
              Comprehensive Neuromuscular Blocking Agent (NMBA) Reference Matrix
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-muted">
                    <th className="p-2">Agent</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Intubation Dose</th>
                    <th className="p-2">Onset</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2">Elimination</th>
                    <th className="p-2">Organ-Independent</th>
                    <th className="p-2">Sugammadex Reversal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ALL_NMBA_IDS.map((id) => {
                    const p = NMBA_PROFILES[id];
                    return (
                      <tr key={id}>
                        <td className="p-2 font-semibold text-fg">{p.name}</td>
                        <td className="p-2 text-muted">{p.class}</td>
                        <td className="p-2 font-mono text-fg">{p.intubationDose}</td>
                        <td className="p-2 text-muted">{p.onset}</td>
                        <td className="p-2 text-muted">{p.durationMinutes}</td>
                        <td className="p-2 text-[10px] text-muted max-w-xs">{p.eliminationPathway}</td>
                        <td className="p-2">
                          <Badge tone={p.organIndependence ? "ok" : "default"} className="text-[9px]">
                            {p.organIndependence ? "Yes (Hofmann / Ester)" : "No"}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge
                            tone={p.sugammadexReversibility === "high" ? "accent" : p.sugammadexReversibility === "moderate" ? "warn" : "danger"}
                            className="text-[9px]"
                          >
                            {p.sugammadexReversibility === "high" ? `High (Kd ${p.sugammadexAffinityKdMicroMolar} µM)` : p.sugammadexReversibility === "moderate" ? `Moderate (Kd ${p.sugammadexAffinityKdMicroMolar} µM)` : "Zero Affinity"}
                          </Badge>
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

      {/* 3. Clinical Pearls & Bedside Guidance */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-sm text-fg">Critical Care &amp; Anesthesia Clinical Pearls</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-muted leading-relaxed">
          {report.clinicalPearls.map((pearl, i) => (
            <div key={i} className="rounded-lg bg-surface-sunken p-2.5 border border-border/50">
              {pearl}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Statutory Regulatory Footer (FD&C Act § 520(o)(1)(E)) */}
      <div className="rounded-lg bg-surface-sunken p-3 border border-border/60 text-[10px] text-muted leading-relaxed">
        <strong>Regulatory Notice:</strong> {ANESTHESIA_CDS_DISCLAIMER}
      </div>
    </div>
  );
}

/**
 * Standard alias for ClinicalBoard desk tab mounting.
 */
export const AnesthesiaPanel = AnesthesiaStation;
