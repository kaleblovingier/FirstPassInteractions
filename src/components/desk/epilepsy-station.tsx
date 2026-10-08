import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Droplets,
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
  STATUS_EPILEPTICUS_CDS_DISCLAIMER,
  statusEpilepticusOnDesk,
  statusEpilepticusReportOnDesk,
  calculatePhase1Dosing,
  calculatePhase2Dosing,
  calculatePhase3Dosing,
  calculateGabaInternalization,
  calculateOsmotherapy,
  evaluateStatusEpilepticusCollisions,
} from "@/lib/drugs/status-epilepticus";

export interface EpilepsyStationProps {
  ids: string[];
  host: HostContext;
}

export function EpilepsyStation({ ids, host }: EpilepsyStationProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "stepped-algorithm" | "esett-matrix" | "receptor-kinetics" | "osmotherapy"
  >("stepped-algorithm");

  // Core Calculator States
  const [patientWeightKg, setPatientWeightKg] = useState<number>(70);
  const [seizureDurationMinutes, setSeizureDurationMinutes] = useState<number>(25);
  const [serumSodium, setSerumSodium] = useState<number>(140);
  const [serumOsmolality, setSerumOsmolality] = useState<number>(295);

  // Active Desk Report
  const report = useMemo(
    () =>
      statusEpilepticusReportOnDesk(ids, host, {
        weightKg: patientWeightKg,
        seizureDurationMinutes,
        currentSerumNa: serumSodium,
        currentSerumOsm: serumOsmolality,
      }),
    [ids.join("|"), host, patientWeightKg, seizureDurationMinutes, serumSodium, serumOsmolality],
  );

  const { onDesk, phase1, phase2, phase3, receptorKinetics, osmotherapy, activeCollisions } =
    report;

  return (
    <div className="space-y-4">
      {/* 1. Header & Active Clinical Banner */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold tracking-tight text-fg">
                Status Epilepticus Resuscitation &amp; Neurocritical Care
              </h2>
              <p className="text-xs text-muted">
                AES Stepped Algorithm · ESETT Non-Inferiority Comparator · GABA-A Internalization Kinetics · Acute Osmotherapy
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={cn(
                "text-[11px] font-semibold border",
                onDesk.hasStatusEpilepticusAgent
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  : "bg-surface-sunken text-muted border-border",
              )}
            >
              Tray: {onDesk.activePhaseSummary}
            </Badge>
            {onDesk.matchedPhase1Ids.length > 0 && (
              <Badge tone="info" className="text-[10px]">
                P1: {onDesk.matchedPhase1Ids.join(", ")}
              </Badge>
            )}
            {onDesk.matchedPhase2Ids.length > 0 && (
              <Badge tone="accent" className="text-[10px]">
                P2: {onDesk.matchedPhase2Ids.join(", ")}
              </Badge>
            )}
            {onDesk.matchedPhase3Ids.length > 0 && (
              <Badge tone="danger" className="text-[10px]">
                P3: {onDesk.matchedPhase3Ids.join(", ")}
              </Badge>
            )}
            {onDesk.matchedOsmotherapyIds.length > 0 && (
              <Badge tone="warn" className="text-[10px]">
                Osm: {onDesk.matchedOsmotherapyIds.join(", ")}
              </Badge>
            )}
          </div>
        </div>

        {/* Global Parameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">
              Patient Weight (kg)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                max={200}
                value={patientWeightKg}
                onChange={(e) => setPatientWeightKg(Math.max(10, Math.min(200, Number(e.target.value) || 70)))}
                className="h-8 text-xs font-mono"
              />
              <div className="flex gap-1">
                {[50, 70, 85].map((w) => (
                  <Button
                    key={w}
                    type="button"
                    variant={patientWeightKg === w ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    onClick={() => setPatientWeightKg(w)}
                  >
                    {w}k
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-medium text-muted mb-1">
              <span>Seizure Duration (min)</span>
              <span className="font-mono text-fg font-bold">{seizureDurationMinutes} min</span>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              step={5}
              value={seizureDurationMinutes}
              onChange={(e) => setSeizureDurationMinutes(Number(e.target.value))}
              className="w-full h-2 bg-surface-sunken rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between text-[9px] text-muted font-mono mt-0.5">
              <span>0m (Phase 1)</span>
              <span>20m (Phase 2)</span>
              <span>40m+ (Phase 3)</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">
              Serum Sodium (mEq/L)
            </label>
            <Input
              type="number"
              min={115}
              max={180}
              value={serumSodium}
              onChange={(e) => setSerumSodium(Number(e.target.value) || 140)}
              className="h-8 text-xs font-mono"
            />
            <span className="text-[9px] text-muted">Target: 145-155 (Ceiling 160)</span>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">
              Serum Osmolality (mOsm/kg)
            </label>
            <Input
              type="number"
              min={260}
              max={380}
              value={serumOsmolality}
              onChange={(e) => setSerumOsmolality(Number(e.target.value) || 295)}
              className="h-8 text-xs font-mono"
            />
            <span className="text-[9px] text-muted">Safety Ceiling &lt; 320 mOsm/kg</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
          {[
            { id: "stepped-algorithm", label: "3-Phase Stepped Algorithm", icon: Layers },
            { id: "esett-matrix", label: "ESETT Trial ASM Comparator", icon: Activity },
            { id: "receptor-kinetics", label: "GABA-A vs NMDA Receptor Kinetics", icon: Zap },
            { id: "osmotherapy", label: "Acute Osmotherapy & ICP Sizing", icon: Droplets },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isCurrent
                    ? "bg-ink text-bg shadow-xs"
                    : "bg-surface-sunken text-muted hover:text-fg hover:bg-surface-hover",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Collision & Safety Rail Warnings */}
      {activeCollisions.length > 0 && (
        <div className="space-y-2">
          {activeCollisions.map((col) => (
            <div
              key={col.id}
              className={cn(
                "rounded-xl border p-3.5 sm:p-4 text-xs transition-colors",
                col.severity === "critical"
                  ? "border-red-300 bg-red-500/10 text-red-950 dark:border-red-900/60 dark:text-red-200"
                  : col.severity === "warning"
                    ? "border-amber-300 bg-amber-500/10 text-amber-950 dark:border-amber-900/60 dark:text-amber-200"
                    : "border-blue-300 bg-blue-500/10 text-blue-950 dark:border-blue-900/60 dark:text-blue-200",
              )}
            >
              <div className="flex items-start gap-2.5">
                {col.severity === "critical" ? (
                  <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                ) : col.severity === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span>{col.title}</span>
                    <Badge tone={col.severity === "critical" ? "danger" : col.severity === "warning" ? "warn" : "info"} className="text-[10px] uppercase font-mono">
                      {col.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{col.clinicalConsequence}</p>
                  <p className="text-[11px] font-medium leading-relaxed mt-1">
                    <span className="font-semibold">Management:</span> {col.managementGuidance}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: 3-PHASE STEPPED ALGORITHM */}
      {activeTab === "stepped-algorithm" && (
        <div className="space-y-4">
          {/* Phase 1 Card */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  1
                </span>
                <h3 className="font-serif font-bold text-base text-fg">
                  Phase 1: Emergent Initial Therapy (0 to 5–20 min)
                </h3>
              </div>
              <Badge tone="info" className="text-[11px]">
                Weight: {patientWeightKg} kg
              </Badge>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {phase1.timingInstructions}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {phase1.firstLineRegimens.map((reg) => (
                <div
                  key={reg.drugId}
                  className="rounded-lg border border-border bg-surface p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-fg">{reg.name}</span>
                    <Badge tone="default" className="text-[10px] uppercase font-mono">
                      {reg.route}
                    </Badge>
                  </div>

                  <div className="rounded-md bg-surface-sunken p-2 text-center">
                    <span className="text-[10px] text-muted block">Calculated Dose:</span>
                    <span className="font-mono text-base font-bold text-fg">
                      {reg.calculatedDoseMg} mg
                    </span>
                    <span className="text-[10px] text-muted block mt-0.5">
                      Max Single: {reg.maxSingleDoseMg} mg (Cap: {reg.maxCumulativeDoseMg} mg)
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-muted">
                    <div>
                      <span className="font-medium text-fg">Formula:</span> {reg.dosePerKgText}
                    </div>
                    <div>
                      <span className="font-medium text-fg">Rate:</span> {reg.infusionRateLimit}
                    </div>
                    <div>
                      <span className="font-medium text-fg">Repeat:</span> Once at {reg.repeatIntervalMinutes}
                    </div>
                  </div>

                  {reg.vehicleWarnings.length > 0 && (
                    <div className="rounded bg-amber-500/10 p-1.5 text-[10px] text-amber-800 dark:text-amber-300">
                      {reg.vehicleWarnings[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-surface-sunken p-3 text-[11px] border border-border/60 text-muted">
              <strong className="text-fg">Phase 1 Termination Rail:</strong> {phase1.transitionTrigger}
            </div>
          </div>

          {/* Phase 2 Card */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                  2
                </span>
                <h3 className="font-serif font-bold text-base text-fg">
                  Phase 2: Established Status Epilepticus (20 to 40 min)
                </h3>
              </div>
              <Badge tone="accent" className="text-[11px]">
                Landmark ESETT Non-Inferiority Triad
              </Badge>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {phase2.esettSummary.keyFinding}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {phase2.comparators.map((comp) => (
                <div
                  key={comp.drugId}
                  className="rounded-lg border border-border bg-surface p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-fg">{comp.name}</span>
                      <span className="text-[10px] text-muted block">({comp.brandName})</span>
                    </div>
                    <Badge tone="accent" className="text-[10px]">
                      ESETT {comp.esett60MinEfficacyPct}%
                    </Badge>
                  </div>

                  <div className="rounded-md bg-surface-sunken p-2 text-center">
                    <span className="text-[10px] text-muted block">Calculated Loading Dose:</span>
                    <span className="font-mono text-base font-bold text-fg">
                      {comp.calculatedDoseMg} {comp.drugId === "fosphenytoin" ? "mg PE" : "mg"}
                    </span>
                    <span className="text-[10px] text-muted block mt-0.5">
                      Infuse over {comp.infusionDurationMinutes} min (Cap: {comp.maxDoseMg} mg)
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-muted">
                    <div>
                      <span className="font-medium text-fg">Formula:</span> {comp.doseFormula}
                    </div>
                    <div>
                      <span className="font-medium text-fg">Infusion Rate:</span> {comp.maxInfusionRate}
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="font-medium text-fg">Cardiac Telemetry:</span>
                      {comp.cardiacTelemetryRequired ? (
                        <Badge tone="danger" className="text-[9px] px-1 py-0 h-4">
                          MANDATORY
                        </Badge>
                      ) : (
                        <Badge tone="default" className="text-[9px] px-1 py-0 h-4">
                          Routine Only
                        </Badge>
                      )}
                    </div>
                  </div>

                  {comp.criticalContraindications.length > 0 && (
                    <div className="rounded bg-red-500/10 p-1.5 text-[10px] text-red-800 dark:text-red-300">
                      <strong>Contraindication:</strong> {comp.criticalContraindications[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Alternatives */}
            <div className="rounded-lg bg-surface-sunken p-3 border border-border/60 space-y-1.5 text-[11px]">
              <strong className="text-fg">Second-Line Alternatives:</strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted">
                <div>
                  <span className="font-semibold text-fg">Lacosamide (Vimpat):</span> 400 mg IV over 5–15 min (PR prolongation warning).
                </div>
                <div>
                  <span className="font-semibold text-fg">Phenobarbital:</span> {phase2.alternativeSecondLine.phenobarbital.calculatedDoseMg} mg IV (20 mg/kg, max 1,000 mg) at &le; 50-100 mg/min.
                </div>
              </div>
            </div>
          </div>

          {/* Phase 3 Card */}
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
                  3
                </span>
                <h3 className="font-serif font-bold text-base text-fg">
                  Phase 3: Refractory &amp; Super-Refractory SE (&gt;40 min)
                </h3>
              </div>
              <Badge tone="danger" className="text-[11px]">
                Target: cEEG Burst Suppression
              </Badge>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {phase3.definition.electrographicTarget}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {phase3.anesthetics.map((anes) => (
                <div
                  key={anes.drugId}
                  className="rounded-lg border border-border bg-surface p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-fg">{anes.name}</span>
                      <span className="text-[10px] text-muted block">({anes.brandName})</span>
                    </div>
                    {anes.drugId === "ketamine" && (
                      <Badge tone="ok" className="text-[9px]">
                        NMDA Target
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-md bg-surface-sunken p-2 text-center">
                    <span className="text-[10px] text-muted block">Bolus &amp; Infusion:</span>
                    <span className="font-mono text-xs font-bold text-fg block">
                      {anes.calculatedBolusMg}
                    </span>
                    <span className="font-mono text-xs text-muted block mt-1">
                      {anes.calculatedMaintenanceRateMgH}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-muted">
                    <div>
                      <span className="font-medium text-fg">Mechanism:</span> {anes.receptorMechanism}
                    </div>
                    <div>
                      <span className="font-medium text-fg">Tachyphylaxis:</span>{" "}
                      <span className="uppercase font-mono text-[10px]">{anes.tachyphylaxisRisk}</span>
                    </div>
                  </div>

                  <div className="rounded bg-surface-sunken p-1.5 text-[10px] text-muted border border-border/40">
                    {anes.safetyCeilingAlert}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ESETT TRIAL MATRIX */}
      {activeTab === "esett-matrix" && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-fg">
                Landmark ESETT Trial Head-to-Head Comparison
              </h3>
              <p className="text-xs text-muted">
                Established Status Epilepticus Treatment Trial (ESETT) · NEJM 2019;381:2103-2113
              </p>
            </div>
            <Badge tone="accent">
              Class I Evidence
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-muted font-medium">
                  <th className="p-2.5">Agent / Brand</th>
                  <th className="p-2.5">Loading Dose</th>
                  <th className="p-2.5">For {patientWeightKg} kg</th>
                  <th className="p-2.5">Infusion Rail</th>
                  <th className="p-2.5 text-center">60-Min Cessation</th>
                  <th className="p-2.5 text-center">Cardiac Telemetry</th>
                  <th className="p-2.5">Critical Contraindication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {phase2.comparators.map((c) => (
                  <tr key={c.drugId} className="hover:bg-surface-hover/50">
                    <td className="p-2.5 font-semibold text-fg">
                      {c.name}
                      <span className="text-[10px] text-muted block font-normal">({c.brandName})</span>
                    </td>
                    <td className="p-2.5 font-mono text-muted">{c.doseFormula}</td>
                    <td className="p-2.5 font-mono font-bold text-fg">
                      {c.calculatedDoseMg} {c.drugId === "fosphenytoin" ? "mg PE" : "mg"}
                    </td>
                    <td className="p-2.5 text-muted">{c.maxInfusionRate}</td>
                    <td className="p-2.5 text-center font-bold text-purple-600 dark:text-purple-400">
                      {c.esett60MinEfficacyPct}%
                      <span className="text-[9px] text-muted block font-mono font-normal">
                        ({c.esettEfficacyCi95})
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      {c.cardiacTelemetryRequired ? (
                        <Badge tone="danger" className="text-[9px]">
                          MANDATORY
                        </Badge>
                      ) : (
                        <Badge tone="default" className="text-[9px]">
                          Not Required
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5 text-[10px] text-red-600 dark:text-red-400">
                      {c.criticalContraindications[0] || "None specified"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-surface-sunken p-3 space-y-2 border border-border/60 text-xs">
            <div className="font-semibold text-fg flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span>Trial Conclusion &amp; Clinical Translation:</span>
            </div>
            <p className="text-muted text-[11px] leading-relaxed">
              {phase2.esettSummary.clinicalImplication}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: RECEPTOR KINETICS & KETAMINE */}
      {activeTab === "receptor-kinetics" && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-fg">
                Synaptic GABA-A Receptor Endocytosis &amp; NMDA Upregulation Kinetics
              </h3>
              <p className="text-xs text-muted">
                Mathematical modeling of time-dependent benzodiazepine resistance during continuous seizure activity
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="danger" className="text-[11px] font-mono">
                Resistance: {receptorKinetics.currentKinetics.benzodiazepineFoldResistance}x baseline
              </Badge>
              <Badge tone="accent" className="text-[11px] font-mono">
                Index: {receptorKinetics.currentKinetics.pharmacoresistanceIndex}
              </Badge>
            </div>
          </div>

          {/* Visual Progress / Timeline Curve Representation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GABA-A Density Depletion Bar */}
            <div className="rounded-lg bg-surface-sunken p-3.5 border border-border space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-fg">Synaptic GABA-A Density Remaining</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {receptorKinetics.currentKinetics.synapticGabaADensityPct}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${receptorKinetics.currentKinetics.synapticGabaADensityPct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted">
                Drops from 100% to ~25% by 60 min due to clathrin-dependent endocytosis and dephosphorylation.
              </p>
            </div>

            {/* NMDA Density Upregulation Bar */}
            <div className="rounded-lg bg-surface-sunken p-3.5 border border-border space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-fg">Synaptic NMDA / AMPA Density (Excitatory)</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {receptorKinetics.currentKinetics.synapticNmdaDensityPct}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (receptorKinetics.currentKinetics.synapticNmdaDensityPct / 280) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-muted">
                Upregulates from 100% to ~280% via forward trafficking, driving glutamate excitotoxicity.
              </p>
            </div>
          </div>

          {/* Milestone Decay Curve Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-muted font-medium">
                  <th className="p-2">Duration</th>
                  <th className="p-2">GABA-A Remaining</th>
                  <th className="p-2">Benzo Fold-Resistance</th>
                  <th className="p-2">NMDA Density</th>
                  <th className="p-2">Pharmacoresistance Tier</th>
                  <th className="p-2">Actionable Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {receptorKinetics.timelineCurve.map((pt) => {
                  const isCurrent = Math.abs(pt.timeMinutes - seizureDurationMinutes) < 5;
                  return (
                    <tr
                      key={pt.timeMinutes}
                      className={cn(
                        "hover:bg-surface-hover/50 font-mono text-[11px]",
                        isCurrent && "bg-red-500/10 font-bold",
                      )}
                    >
                      <td className="p-2 text-fg">{pt.timeMinutes} min</td>
                      <td className="p-2 text-blue-600 dark:text-blue-400">
                        {pt.synapticGabaADensityPct}%
                      </td>
                      <td className="p-2 text-amber-600 dark:text-amber-400">
                        {pt.benzodiazepineFoldResistance}x
                      </td>
                      <td className="p-2 text-red-600 dark:text-red-400">
                        {pt.synapticNmdaDensityPct}%
                      </td>
                      <td className="p-2 font-sans text-fg">{pt.clinicalPhaseName}</td>
                      <td className="p-2 font-sans text-muted text-[10px]">
                        {pt.recommendedTargetMechanism}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Molecular Pathophysiology & Ketamine Rationale Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-surface-sunken p-3.5 border border-border/60 space-y-1.5">
              <span className="font-semibold text-fg flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-blue-600" />
                GABA-A Clathrin Endocytosis
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                {receptorKinetics.molecularPathophysiology.gabaInternalizationMechanism}
              </p>
            </div>

            <div className="rounded-lg bg-surface-sunken p-3.5 border border-border/60 space-y-1.5">
              <span className="font-semibold text-fg flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-red-600" />
                Mechanistic Rationale for Ketamine
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                {receptorKinetics.molecularPathophysiology.clinicalImplicationForKetamine}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACUTE OSMOTHERAPY & ICP SIZING */}
      {activeTab === "osmotherapy" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-fg">
                  Hyperosmolar Therapy for Acute Cerebral Edema &amp; Elevated ICP
                </h3>
                <p className="text-xs text-muted">
                  23.4% Hypertonic Saline vs Mannitol 20% · Sizing, Renal Safeguards, and Infusion Rails
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={serumSodium >= 155 ? "danger" : "default"}
                  className="text-[11px] font-mono"
                >
                  Na: {serumSodium} mEq/L
                </Badge>
                <Badge
                  tone={serumOsmolality >= 320 ? "danger" : "default"}
                  className="text-[11px] font-mono"
                >
                  Osm: {serumOsmolality} mOsm/kg
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 23.4% Saline Card */}
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-serif font-bold text-sm text-fg">
                      {osmotherapy.hypertonicSaline234.agentName}
                    </span>
                  </div>
                  <Badge tone="danger" className="text-[10px]">
                    CENTRAL LINE ONLY
                  </Badge>
                </div>

                <div className="rounded-md bg-surface p-3 text-center border border-border">
                  <span className="text-[10px] text-muted block">Standard Resuscitation Bolus:</span>
                  <span className="font-mono text-xl font-bold text-fg">30 mL IV Bolus</span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Infuse over {osmotherapy.hypertonicSaline234.infusionTimeMinutes}
                  </span>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-300 block font-mono mt-1">
                    Delivers 120 mEq Na+ &amp; 120 mEq Cl- (8,008 mOsm/L)
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-muted">
                  <div>
                    <span className="font-medium text-fg">Target Serum Sodium:</span>{" "}
                    {osmotherapy.hypertonicSaline234.targetSerumSodiumRange} (Max Ceiling:{" "}
                    {osmotherapy.hypertonicSaline234.serumSodiumMaxCeiling})
                  </div>
                  <div>
                    <span className="font-medium text-fg">Max Osmolality Ceiling:</span> &lt;{" "}
                    {osmotherapy.hypertonicSaline234.serumOsmolalityMaxCeiling} mOsm/kg
                  </div>
                  <div>
                    <span className="font-medium text-fg">24h Safe Na Rise:</span>{" "}
                    {osmotherapy.hypertonicSaline234.maxSafeCorrectionRate24h}
                  </div>
                </div>

                <div className="rounded bg-red-500/10 p-2 text-[10px] text-red-800 dark:text-red-300">
                  {osmotherapy.hypertonicSaline234.safetyWarnings[0]}
                </div>
              </div>

              {/* Mannitol 20% Card */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-serif font-bold text-sm text-fg">
                      {osmotherapy.mannitol20.agentName}
                    </span>
                  </div>
                  <Badge tone="warn" className="text-[10px]">
                    0.22µm FILTER MANDATE
                  </Badge>
                </div>

                <div className="rounded-md bg-surface p-3 text-center border border-border">
                  <span className="text-[10px] text-muted block">Dosing for {patientWeightKg} kg (0.5 to 1.0 g/kg):</span>
                  <span className="font-mono text-xl font-bold text-fg">
                    {osmotherapy.mannitol20.calculatedGramsLow} to {osmotherapy.mannitol20.calculatedGramsHigh} g
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Volume: {osmotherapy.mannitol20.calculatedVolumeMlLow} to {osmotherapy.mannitol20.calculatedVolumeMlHigh} mL (20% solution)
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-mono mt-1">
                    Infuse over {osmotherapy.mannitol20.infusionDurationMinutes}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-muted">
                  <div>
                    <span className="font-medium text-fg">Hold If Osmolality:</span> &ge;{" "}
                    {osmotherapy.mannitol20.contraindicationCeilingOsm} mOsm/kg
                  </div>
                  <div>
                    <span className="font-medium text-fg">Hold If Osmolar Gap:</span> &gt;{" "}
                    {osmotherapy.mannitol20.contraindicationCeilingOsmolarGap} mOsm/kg
                  </div>
                  <div>
                    <span className="font-medium text-fg">Filter Rail:</span> {osmotherapy.mannitol20.mandatoryFilter}
                  </div>
                </div>

                <div className="rounded bg-amber-500/10 p-2 text-[10px] text-amber-800 dark:text-amber-300">
                  {osmotherapy.mannitol20.renalSafetyWarnings[0]}
                </div>
              </div>
            </div>

            {/* Osmotherapy Comparison Matrix */}
            <div className="rounded-lg bg-surface-sunken p-3.5 border border-border space-y-2 text-xs">
              <span className="font-semibold text-fg">Comparative Clinical Rationale:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-muted leading-relaxed">
                <div>
                  <span className="font-medium text-fg block">Onset &amp; Duration:</span>
                  {osmotherapy.comparativeMatrix.onsetOfIcpReduction} · {osmotherapy.comparativeMatrix.durationOfIcpReduction}
                </div>
                <div>
                  <span className="font-medium text-fg block">Hemodynamics &amp; Volume:</span>
                  {osmotherapy.comparativeMatrix.hemodynamicImpact}
                </div>
                <div>
                  <span className="font-medium text-fg block">Rebound ICP Liability:</span>
                  {osmotherapy.comparativeMatrix.reboundEdemaRisk}
                </div>
                <div>
                  <span className="font-medium text-fg block">Renal Ceilings:</span>
                  {osmotherapy.comparativeMatrix.renalSafetyThreshold}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Clinical Pearls & Guideline Insights */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-serif font-bold text-sm text-fg">
            Neuro-Intensivist &amp; Clinical Pharmacotherapy Practice Pearls
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-muted leading-relaxed">
          {report.clinicalPearls.map((pearl, i) => (
            <div key={i} className="rounded-lg bg-surface-sunken p-2.5 border border-border/50">
              {pearl}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Statutory Regulatory Notice (FD&C Act § 520(o)(1)(E)) */}
      <div className="rounded-lg bg-surface-sunken p-3 border border-border/60 text-[10px] text-muted leading-relaxed">
        <strong>Regulatory Notice:</strong> {STATUS_EPILEPTICUS_CDS_DISCLAIMER}
      </div>
    </div>
  );
}

/**
 * Standard alias for ClinicalBoard desk tab mounting.
 */
export const EpilepsyPanel = EpilepsyStation;
